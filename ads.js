class AdSystem {
    constructor() {
      this.bidderUrl = "https://bidder.verismart.ai/advilion";
      this.adSlots = [];
    }
  
    async initialize() {
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
            tagid: "477097",
            bidfloor: 5,
            bidfloorcur: "INR",
            secure: 1,
          },
        ],
        site: {
          id: "87",
          name: "NBT Android Apps",
          bundle: "com.nbt.reader",
          domain: location.hostname,
          publisher: {
            id: "87",
          },
        },
        device: {
          ua: navigator.userAgent,
          geo: {
            lat: 28.6139,
            lon: 77.2090,
            type: 2,
            country: "IND",
            region: "DL",
            city: "Delhi",
          },
          ipv6: "2409:40d2:2017:111c:b96e:bdc6:679c:53d0",
          devicetype: 1,
          make: "iPhone",
          model: "Apple",
          os: "iOS",
          osv: "14",
          js: 1,
          carrier: "airtel",
        },
        user: {
          buyeruid: this.generateUUID(),
        },
        at: 1,
        tmax: 480,
        cur: ["INR"],
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
        .replace("${AUCTION_CURRENCY}", "INR");
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
  