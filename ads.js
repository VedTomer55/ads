class AdSystem {
  constructor() {
    this.bidderUrl = "";
    this.adSlots = [];
    this.config = null;
  }

  async initialize() {
    // Load configuration from global variable
    if (typeof window.adSystemConfig === 'undefined') {
      console.error('Ad System Configuration not found. Please define window.adSystemConfig.');
      return;
    }

    this.config = window.adSystemConfig;
    this.bidderUrl = this.config.bidderUrl;

    // Find ad placeholders
    this.adSlots = document.querySelectorAll(".ad-placeholder");
    
    for (const slotElement of this.adSlots) {
      const width = parseInt(slotElement.dataset.width, 10) || 0;
      const height = parseInt(slotElement.dataset.height, 10) || 0;

      if (width && height) {
        slotElement.style.width = `${width}px`;
        slotElement.style.height = `${height}px`;
        slotElement.innerHTML = `Loading ad for ${width}x${height}...`;

        await this.loadAdForSlot(slotElement, { width, height });
      } else {
        this.showError(slotElement, "Ad size not defined.");
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
    // Construct bid request using configuration from global variable
    const bidRequest = {
      id: this.generateUUID(),
      imp: [
        {
          id: "1",
          banner: {
            w: slot.width,
            h: slot.height,
            pos: 0,
          },
          tagid: this.config.tagId,
          bidfloor: this.config.bidFloor,
          bidfloorcur: this.config.bidFloorCur,
          secure: 1,
        },
      ],
      site: {
        id: this.config.siteId,
        name: this.config.siteName,
        bundle: this.config.siteBundle,
        domain: location.hostname,
        publisher: {
          id: this.config.publisherId,
        },
      },
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
      user: {
        buyeruid: this.generateUUID(),
      },
      at: 1,
      tmax: 480,
      cur: [this.config.currency],
    };

    const response = await fetch(this.bidderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    // Handle viewability tracking
    img.onload = () => {
      if (urls.impressionUrl) this.sendImpression(urls.impressionUrl);
    };

    img.onerror = () => this.showError(slotElement, "Image failed to load.");
    anchor.appendChild(img);
    slotElement.appendChild(anchor);

    // Win notice handling
    if (bid.nurl) this.sendImpression(this.replaceAuctionMacros(bid.nurl, bid));
  }

  extractUrls(adm) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(adm, "text/html");
    const anchor = doc.querySelector("a");
    const img = doc.querySelector("img");
    return {
      clickUrl: anchor?.href || null,
      imageUrl: img?.src || null,
      impressionUrl: img?.getAttribute("onload")
        ?.match(/sendUrl\('([^']+)'\)/)?.[1] || null,
    };
  }

  sendImpression(url) {
    if (!url) return;
    fetch(url, { method: "GET", mode: "no-cors", credentials: "omit" }).catch(
      (err) => console.warn("Impression failed:", err)
    );
  }

  replaceAuctionMacros(url, bid) {
    return url
      .replace("${AUCTION_ID}", bid.id || "")
      .replace("${AUCTION_PRICE}", bid.price || "")
      .replace("${AUCTION_CURRENCY}", this.config.currency);
  }

  showError(slotElement, message) {
    slotElement.innerHTML = `<div class="text-danger">${message}</div>`;
  }

  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) =>
      ((Math.random() * 16) | 0).toString(16)
    );
  }
}

// Initialize the ad system
document.addEventListener("DOMContentLoaded", () => {
  const adSystem = new AdSystem();
  adSystem.initialize();
});