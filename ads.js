// Function to detect device type
function detectDeviceType() {
  const ua = navigator.userAgent;

  if (
    /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  ) {
    if (/Tablet|iPad/i.test(ua)) return { name: "Tablet", val: 5 };
    return { name: "Phone", val: 4 };
  }
  if (/SmartTV|TV/i.test(ua)) return { name: "Connected TV", val: 3 };
  if (/Mac|Windows|Linux/i.test(ua))
    return { name: "Personal Computer", val: 2 };
  return { name: "Connected Device", val: 6 };
}

// Function to fetch geolocation and reverse geocode details
async function getGeoDetails() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Reverse geocoding using OpenCage API
          const apiKey = "4a66cf6230d04397925f9a20288934a2"; // Replace with your OpenCage API key
          const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`;

          try {
            const response = await fetch(geocodeUrl);
            const data = await response.json();

            if (data.results && data.results[0]) {
              const location = data.results[0].components;
              resolve({
                lat: latitude,
                lon: longitude,
                type: 1,
                country: location?.["ISO_3166-1_alpha-3"] || "unknown",
                region: location.state_code || "unknown",
                city:
                  location.city ||
                  location.town ||
                  location.village ||
                  "unknown",
              });
            } else {
              resolve({
                lat: latitude,
                lon: longitude,
                type: 1,
                country: "unknown",
                region: "unknown",
                city: "unknown",
              });
            }
          } catch (error) {
            console.error("Error fetching reverse geocoding data:", error);
            resolve({
              lat: latitude,
              lon: longitude,
              type: 1,
              country: "unknown",
              region: "unknown",
              city: "unknown",
            });
          }
        },
        (error) => {
          console.error("Error fetching geolocation:", error);
          reject({
            lat: 0,
            lon: 0,
            type: 2,
            country: "unknown",
            region: "unknown",
            city: "unknown",
          });
        }
      );
    } else {
      console.warn("Geolocation is not supported by this browser.");
      reject({
        lat: 0,
        lon: 0,
        type: 2,
        country: "unknown",
        region: "unknown",
        city: "unknown",
      });
    }
  });
}

// Function to fetch IPv6 address
async function getIpv6Address() {
  try {
    const response = await fetch("https://api64.ipify.org?format=json");
    const data = await response.json();
    return data.ip || "unknown";
  } catch (error) {
    console.error("Failed to fetch IPv6 address:", error);
    return "unknown";
  }
}

// Initialize ad system configuration
async function initializeAdSystemConfig() {
  const deviceDetails = detectDeviceType();
  const ipv6 = await getIpv6Address();
  try {
    const geoDetails = await getGeoDetails();
    window.adSystemConfig = {
      geo: geoDetails,
      ipv6: ipv6,
      deviceType: deviceDetails.val,
      deviceMake: navigator.vendor || "Unknown",
      deviceModel: navigator.platform || "Unknown",
      deviceOs:
        navigator.userAgentData?.platform || navigator.platform || "Unknown",
      deviceOsVersion:
        navigator.userAgent.match(/OS ([\\d_]+)/)?.[1] || "Unknown",
      deviceCarrier: "unknown", // Replace if carrier data can be retrieved
    };

    console.log("Ad System Config:", window.adSystemConfig);
  } catch (error) {
    console.error("Failed to fetch geo details:", error);
  }
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", initializeAdSystemConfig);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class AdSystem {
  constructor() {
    this.bidderUrl = "https://dev.ssp.verismart.ai/api/ssp-load-ads";
    this.updateJourneyUrl = "https://dev.ssp.verismart.ai/api/update-adjourney";
    this.adSlots = [];
    this.config = null;
    this.EVENTS = {
      IMPRESSION: "impression_at",
      BILLED_IMPRESSION: "billable_impression_at",
      CLICK: "clicked_at",
    };
  }

  async initialize() {
    // Retry configuration
    const maxRetries = 5;
    const delayMs = 1000;
    let attempt = 0;

    // Retry logic
    while (
      typeof window.adSystemConfig === "undefined" &&
      attempt < maxRetries
    ) {
      console.warn(
        `Ad System Configuration not found. Retrying (${
          attempt + 1
        }/${maxRetries})...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs)); // Wait before retrying
      attempt++;
    }

    if (typeof window.adSystemConfig === "undefined") {
      console.error(
        "Ad System Configuration not found after retries. Please define window.adSystemConfig."
      );
      return;
    }

    this.config = window.adSystemConfig;

    // Find ad placeholders
    this.adSlots = document.querySelectorAll(".ad-placeholder");

    for (const slotElement of this.adSlots) {
      const width = parseInt(slotElement.dataset.width, 10) || 0;
      const height = parseInt(slotElement.dataset.height, 10) || 0;
      const slot_id = parseInt(slotElement.dataset.slot_id, 10) || 0;

      if (width && height && slot_id) {
        slotElement.style.width = `${width}px`;
        slotElement.style.height = `${height}px`;
        slotElement.innerHTML = `Loading ad for ${width}x${height}...`;

        await this.loadAdForSlot(slotElement, { slot_id });
      } else {
        this.showError(slotElement, "Ad size & slot not defined.");
      }
    }
  }

  async loadAdForSlot(slotElement, slot) {
    try {
      const bidResponse = await this.makeBidRequest(slot);
      this.renderAd(slotElement, bidResponse, slot);
    } catch (error) {
      this.showError(slotElement, "Failed to load advertisement.");
      console.error(`Ad Error [${slot.width}x${slot.height}]:`, error);
    }
  }

  async makeBidRequest(slot) {
    const bidRequest = {
      slot_id: slot.slot_id,
      device: {
        ua: navigator.userAgent,
        geo: this.config.geo,
        ipv6: this.config.ipv6,
        devicetype: this.config.deviceType,
        make: this.config.deviceMake,
        model: this.config.deviceModel,
        os: this.config.deviceOs,
        osv: this.config.deviceOsVersion,
        js: 1,
        carrier: this.config.deviceCarrier,
      },
    };

    const response = await fetch(this.bidderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        // Adding CORS headers
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      mode: "cors", // Explicitly set CORS mode
      credentials: "include", // Include credentials if needed
      body: JSON.stringify(bidRequest),
    });

    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    return response.json();
}

 
  renderAd(slotElement, bidResponse) {
    const bid = bidResponse?.seatbid?.[0]?.bid?.[0];
    if (!bid) {
      this.showError(slotElement, "No valid bid received.");
      return;
    }

    const urls = this.extractUrls(bid.adm);
    if (!urls.imageUrl) {
      this.showError(slotElement, "Invalid ad creative.");
      return;
    }

    // Create ad elements
    slotElement.innerHTML = "";
    const anchor = document.createElement("a");
    const img = document.createElement("img");

    anchor.href = urls.clickUrl || "#";
    img.src = urls.imageUrl;
    img.alt = "Advertisement";
    img.style.width = "100%";
    img.style.height = "auto";

    // Handle click tracking before redirect
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Send click event to update-adjourney
      this.sendImpression(this.updateJourneyUrl + '?' + new URLSearchParams({
        bid_id: bidResponse.id,
        event: this.EVENTS.CLICK
      }).toString());

      // setTimeout(() => {
        window.location.href = urls.clickUrl;
      // }, 10);
    });

    // Handle impression and tracking
    img.onload = () => {
      if (urls.impressionUrl) {
        this.sendImpression(urls.impressionUrl);
        
        // Send impression event
        this.sendImpression(this.updateJourneyUrl + '?' + new URLSearchParams({
          bid_id: bidResponse.id,
          event: this.EVENTS.IMPRESSION
        }).toString());
      }

      // Handle win notice (nurl)
      if (bid.nurl) {
        const nurlWithMacros = this.replaceAuctionMacros(bid.nurl, bidResponse);
        this.sendImpression(nurlWithMacros);
      }

      // Handle billing URL (burl)
      if (bid.burl) {
        const burlWithMacros = this.replaceAuctionMacros(bid.burl, bidResponse);
        this.sendImpression(burlWithMacros);
        
        // Send billed impression event
        this.sendImpression(this.updateJourneyUrl + '?' + new URLSearchParams({
          bid_id: bidResponse.id,
          event: this.EVENTS.BILLED_IMPRESSION
        }).toString());
      }
    };

    img.onerror = () => this.showError(slotElement, "Image failed to load.");
    anchor.appendChild(img);
    slotElement.appendChild(anchor);
  }

  sendImpression(url) {
    if (!url) return;
    console.log('Sending impression:', url);
    fetch(url, { 
      method: "GET", 
      mode: "no-cors", 
      credentials: "omit" 
    }).catch(err => console.warn("Impression failed:", err));
  }

  extractUrls(adm) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(adm, "text/html");
    const anchor = doc.querySelector("a");
    const img = doc.querySelector("img");
    return {
      clickUrl: anchor?.href || null,
      imageUrl: img?.src || null,
      impressionUrl:
        img?.getAttribute("onload")?.match(/sendUrl\('([^']+)'\)/)?.[1] || null,
    };
  }

  sendImpression(url) {
    if (!url) return;
    console.log("Sending impression:", url);
    fetch(url, {
      method: "GET",
      mode: "no-cors",
      credentials: "omit",
    }).catch((err) => console.warn("Impression failed:", err));
  }

  replaceAuctionMacros(url, bidResponse) {
    const bid = bidResponse.seatbid[0].bid[0];

    return url
      .replace(/\${AUCTION_ID}/g, bidResponse.id || "")
      .replace(/\${AUCTION_BID_ID}/g, bid.id || "")
      .replace(/\${AUCTION_IMP_ID}/g, bid.impid || "")
      .replace(/\${AUCTION_SEAT_ID}/g, bidResponse.seatbid[0].seat || "")
      .replace(/\${AUCTION_PRICE}/g, bidResponse.cpm?.toString() || "")
      .replace(/\${AUCTION_CURRENCY}/g, bidResponse.cur || "")
      .replace(/\${AUCTION_MBR}/g, "")
      .replace(/\${AUCTION_AD_ID}/g, bid.adid || "")
      .replace(/\${AUCTION_LOSS}/g, "");
  }

  showError(slotElement, message) {
    slotElement.innerHTML = `<div class="text-danger">${message}</div>`;
  }
}

// Initialize the ad system
document.addEventListener("DOMContentLoaded", () => {
  const adSystem = new AdSystem();
  adSystem.initialize();
});
