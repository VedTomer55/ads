// Fallback image configuration
const FALLBACK_IMAGES = {
  Mobiqwick: {
    "1067x600": "./images/Mobiqwick/1067-600.png",
    "1200x800": "./images/Mobiqwick/1200-800.png",
    "300x250": "./images/Mobiqwick/300-250.png",
    "300x50": "./images/Mobiqwick/300-50.png",
    "300x600": "./images/Mobiqwick/300-600.png",
    "320x480": "./images/Mobiqwick/320-480.png",
    "480x320": "./images/Mobiqwick/480-320.png",
    "600x500": "./images/Mobiqwick/600-500.png",
  },
  music_creatives: {
    "1067x600": "./images/music_creatives/1067-600.png",
    "1200x800": "./images/music_creatives/1200-800.png",
    "300x250": "./images/music_creatives/300-250.png",
    "300x50": "./images/music_creatives/300-50.png",
    "300x600": "./images/music_creatives/300-600.png",
    "320x480": "./images/music_creatives/320-480.png",
    "480x320": "./images/music_creatives/480-320.png",
    "600x500": "./images/music_creatives/600-500.png",
  },
  "trainman-creatives": {
    "1067x600": "./images/trainman-creatives/1067-600.png",
    "1200x800": "./images/trainman-creatives/1200-800.png",
    "300x250": "./images/trainman-creatives/300-250.png",
    "300x50": "./images/trainman-creatives/300-50.png",
    "300x600": "./images/trainman-creatives/300-600.png",
    "320x480": "./images/trainman-creatives/320-480.png",
    "480x320": "./images/trainman-creatives/480-320.png",
    "600x500": "./images/trainman-creatives/600-500.png",
  },
};

// Ad slot configuration
const AD_SLOTS = {
  headerAd: {
    id: 'div-gpt-ad-header',
    sizes: [[300, 50]],
    position: 'header'
  },
  sidebarLargeAd: {
    id: 'div-gpt-ad-sidebar-large',
    sizes: [[300, 600]],
    position: 'sidebar'
  },
  sidebarSmallAd: {
    id: 'div-gpt-ad-sidebar-small',
    sizes: [[300, 250]],
    position: 'sidebar'
  },
  inlineAd: {
    id: 'div-gpt-ad-inline',
    sizes: [[300, 50]],
    position: 'content'
  },
  bottomAd: {
    id: 'div-gpt-ad-bottom',
    sizes: [[480, 320]],
    position: 'bottom'
  },
  footerAd: {
    id: 'div-gpt-ad-footer',
    sizes: [[320, 480]],
    position: 'footer'
  }
};

// User information collector class
class UserInfoCollector {
  static async collect() {
    try {
      return {
        device: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          vendor: navigator.vendor,
          screenResolution: {
            width: window.screen.width,
            height: window.screen.height,
          },
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          devicePixelRatio: window.devicePixelRatio,
          colorDepth: window.screen.colorDepth,
          orientation: screen.orientation?.type || "unknown",
          connection: this.getConnectionInfo(),
          memory: navigator?.deviceMemory || "unknown",
        },
        browser: {
          language: navigator.language,
          languages: navigator.languages,
          doNotTrack: navigator.doNotTrack,
          cookiesEnabled: navigator.cookieEnabled,
          timestamp: new Date().toISOString(),
        },
        location: await this.getLocationInfo(),
        performance: this.getPerformanceMetrics(),
        session: {
          referrer: document.referrer,
          pageUrl: window.location.href,
          sessionId: this.generateSessionId(),
        },
      };
    } catch (error) {
      console.error('Error collecting user info:', error);
      return null;
    }
  }

  static getConnectionInfo() {
    try {
      const connection = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection;
      if (connection) {
        return {
          type: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        };
      }
    } catch (error) {
      console.error('Error getting connection info:', error);
    }
    return "unknown";
  }

  static async getLocationInfo() {
    try {
      const response = await fetch("https://ipapi.co/json/");
      if (!response.ok) throw new Error('Location API response not ok');
      return await response.json();
    } catch (error) {
      console.error("Error fetching location info:", error);
      return null;
    }
  }

  static getPerformanceMetrics() {
    try {
      if (!window.performance) return null;
      const timing = performance.timing;
      return {
        pageLoadTime: timing.loadEventEnd - timing.navigationStart,
        dnsLookupTime: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnectTime: timing.connectEnd - timing.connectStart,
        serverResponseTime: timing.responseEnd - timing.requestStart,
        domLoadTime: timing.domComplete - timing.domLoading,
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return null;
    }
  }

  static generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9);
  }
}

// Base Ad Bidding Manager class
class AdBiddingManager {
  constructor() {
    this.bidders = new Map();
    this.timeout = 1000; // Bidding timeout in ms
  }

  async collectBids(adSlots, userInfo) {
    const biddingPromises = [];

    for (const [slotKey, slot] of Object.entries(adSlots)) {
      try {
        this.createAdContainer(slot);
        const bidPromise = this.getBidsForSlot(slot, userInfo)
          .then(bids => this.processBids(slot, bids))
          .catch(error => {
            console.error(`Error collecting bids for ${slotKey}:`, error);
            return this.loadFallbackAd(slot);
          });
        biddingPromises.push(bidPromise);
      } catch (error) {
        console.error(`Error setting up bidding for ${slotKey}:`, error);
        biddingPromises.push(Promise.resolve(this.loadFallbackAd(slot)));
      }
    }

    return Promise.all(biddingPromises);
  }

  createAdContainer(slot) {
    const container = document.getElementById(slot.id);
    if (!container) {
      console.warn(`Ad container for ${slot.id} not found`);
      return;
    }
    container.innerHTML = '';
  }

  async getBidsForSlot(slot, userInfo) {
    try {
      const bidRequests = Array.from(this.bidders.values()).map(bidder =>
        this.requestBids(bidder, slot, userInfo)
          .catch(error => {
            console.error(`Error requesting bids from ${bidder.name}:`, error);
            return null;
          })
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Bidding timeout")), this.timeout)
      );

      const bids = await Promise.race([
        Promise.all(bidRequests),
        timeoutPromise
      ]);

      return bids.filter(bid => bid !== null);
    } catch (error) {
      console.error(`Error in getBidsForSlot for ${slot.id}:`, error);
      return [];
    }
  }

  async requestBids(bidder, slot, userInfo) {
    try {
      const response = await fetch(bidder.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slotId: slot.id,
          sizes: slot.sizes,
          position: slot.position,
          userInfo: userInfo,
          bidder: bidder.name,
        }),
      });

      if (!response.ok) {
        throw new Error(`Bidder response not ok: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error requesting bids from ${bidder.name}:`, error);
      return null;
    }
  }
}

// Enhanced Ad Bidding Manager class with improved error handling
class EnhancedAdBiddingManager extends AdBiddingManager {
  constructor() {
    super();
    this.fallbackImageIndex = 0;
    this.creativeTypes = ["Mobiqwick", "music_creatives", "trainman-creatives"];
  }

  getFallbackImage(slotSize) {
    try {
      const creativeType = this.creativeTypes[this.fallbackImageIndex];
      this.fallbackImageIndex = (this.fallbackImageIndex + 1) % this.creativeTypes.length;

      const sizeKey = `${slotSize[0]}x${slotSize[1]}`;
      const availableSizes = Object.keys(FALLBACK_IMAGES[creativeType]);
      
      // Try exact match first
      const exactMatch = availableSizes.find(size => size === sizeKey);
      if (exactMatch) {
        return FALLBACK_IMAGES[creativeType][exactMatch];
      }

      // Find closest match if no exact match
      const [targetWidth, targetHeight] = sizeKey.split('x').map(Number);
      let bestMatch = availableSizes[0];
      let minDiff = Infinity;

      availableSizes.forEach(size => {
        const [width, height] = size.split('x').map(Number);
        const diff = Math.abs(width - targetWidth) + Math.abs(height - targetHeight);
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = size;
        }
      });

      return FALLBACK_IMAGES[creativeType][bestMatch];
    } catch (error) {
      console.error('Error getting fallback image:', error);
      return '/images/default-placeholder.png';
    }
  }

  async processBids(slot, bids) {
    try {
      const validBids = bids.filter(bid => bid && bid.value > 0);
      
      if (validBids.length === 0) {
        return this.loadFallbackAd(slot);
      }

      const winningBid = validBids.reduce((highest, current) =>
        current.value > highest.value ? current : highest
      );

      return this.renderAd(slot, winningBid);
    } catch (error) {
      console.error(`Error processing bids for ${slot.id}:`, error);
      return this.loadFallbackAd(slot);
    }
  }

  loadFallbackAd(slot) {
    const container = document.getElementById(slot.id);
    if (!container) {
      console.error(`Container not found for slot ${slot.id}`);
      return;
    }

    try {
      const fallbackImage = this.getFallbackImage(slot.sizes[0]);
      
      container.innerHTML = `
        <div class="fallback-ad" style="width: ${slot.sizes[0][0]}px; height: ${slot.sizes[0][1]}px;">
          <img src="${fallbackImage}" 
               alt="Advertisement" 
               style="width: 100%; height: 100%; object-fit: cover;"
               onerror="this.onerror=null; this.src='/images/default-placeholder.png';"
          />
        </div>
      `;

      const adElement = container.querySelector('.fallback-ad');
      if (adElement) {
        adElement.addEventListener('click', () => {
          console.log(`Fallback ad clicked: ${slot.id}`);
          // Implement fallback ad click tracking here
        });
      }
    } catch (error) {
      console.error(`Error loading fallback ad for ${slot.id}:`, error);
      container.innerHTML = `
        <div class="error-ad" style="width: ${slot.sizes[0][0]}px; height: ${slot.sizes[0][1]}px; 
             border: 1px solid #ccc; display: flex; align-items: center; justify-content: center;">
          <span>Advertisement</span>
        </div>
      `;
    }
  }

  async renderAd(slot, bid) {
    const container = document.getElementById(slot.id);
    if (!container) {
      console.error(`Container not found for slot ${slot.id}`);
      return;
    }

    try {
      if (!bid || !bid.adHtml) {
        throw new Error('Invalid bid data');
      }

      container.innerHTML = bid.adHtml;

      // Track impression
      await this.trackImpression(slot, bid).catch(error => {
        console.error('Impression tracking error:', error);
      });

      // Initialize click tracking
      this.initClickTracking(container, slot, bid);

    } catch (error) {
      console.error(`Error rendering ad for ${slot.id}:`, error);
      this.loadFallbackAd(slot);
    }
  }

  async trackImpression(slot, bid) {
    if (!bid.impressionUrl) {
      console.warn(`No impression URL for bid in slot ${slot.id}`);
      return;
    }

    try {
      const pixel = new Image();
      pixel.src = `${bid.impressionUrl}?slot=${slot.id}&bid=${bid.id}&timestamp=${Date.now()}`;
      await new Promise((resolve, reject) => {
        pixel.onload = resolve;
        pixel.onerror = reject;
        setTimeout(reject, 5000); // 5 second timeout
      });
    } catch (error) {
      console.error(`Error tracking impression for slot ${slot.id}:`, error);
    }
  }

  initClickTracking(container, slot, bid) {
    if (!container || !bid.clickUrl) return;

    container.addEventListener('click', () => {
      try {
        const pixel = new Image();
        pixel.src = `${bid.clickUrl}?slot=${slot.id}&bid=${bid.id}&timestamp=${Date.now()}`;
      } catch (error) {
        console.error(`Error tracking click for slot ${slot.id}:`, error);
      }
    });
  }
}

// Initialize and run the ad system
async function initializeEnhancedAds() {
  try {
    const userInfo = await UserInfoCollector.collect();
    const adManager = new EnhancedAdBiddingManager();

    // Add bidders with error handling
    try {
      adManager.bidders.set("bidder1", {
        name: "PremiumBidder",
        endpoint: "https://premium-bidder.example.com/bid",
      });
      adManager.bidders.set("bidder2", {
        name: "StandardBidder",
        endpoint: "https://standard-bidder.example.com/bid",
      });
    } catch (error) {
      console.error("Error setting up bidders:", error);
    }

    // Start bidding process with error handling
    await adManager.collectBids(AD_SLOTS, userInfo).catch(error => {
      console.error("Error in bid collection:", error);
    });

  } catch (error) {
    console.error("Error initializing enhanced ad system:", error);
    
    // Attempt to load fallback ads for all slots if initialization fails
    try {
      const adManager = new EnhancedAdBiddingManager();
      Object.values(AD_SLOTS).forEach(slot => {
        adManager.loadFallbackAd(slot);
      });
    } catch (fallbackError) {
      console.error("Error loading fallback ads:", fallbackError);
    }
  }
}

// Function to refresh ads
async function refreshAds() {
  try {
    console.log("Refreshing ads...");
    await initializeEnhancedAds();
  } catch (error) {
    console.error("Error refreshing ads:", error);
  }
}

// Initialize ads when DOM is ready
document.addEventListener("DOMContentLoaded", initializeEnhancedAds);

// Handle ad refresh on visibility change
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    refreshAds();
  }
});

// Add refresh on resize with debounce
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    refreshAds();
  }, 250); // Debounce resize events
});

// Optional: Add periodic refresh
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
let autoRefreshTimer;

function startAutoRefresh() {
  stopAutoRefresh(); // Clear any existing timer
  autoRefreshTimer = setInterval(refreshAds, AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// Start auto-refresh when page loads
document.addEventListener("DOMContentLoaded", startAutoRefresh);

// Pause auto-refresh when page is not visible
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

// Export necessary functions and classes if needed
window.AdSystem = {
  initializeAds: initializeEnhancedAds,
  refreshAds: refreshAds,
  startAutoRefresh: startAutoRefresh,
  stopAutoRefresh: stopAutoRefresh
};