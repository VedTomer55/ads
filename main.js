/* main.js */
// Ad slot configuration
const AD_SLOTS = {
    headerAd: {
        id: 'div-gpt-ad-header',
        sizes: [[1920, 1080]],
        position: 'header'
    }
};

// Function to track impressions
function trackImpression(url) {
    const img = new Image();
    img.src = url;
}

// Initialize the ad system
async function initializeAds() {
    try {
        const userInfo = await UserInfoCollector.collect();
        const adManager = new AdManager();

        // Request bids for each ad slot
        for (const [slotKey, slot] of Object.entries(AD_SLOTS)) {
            try {
                const bid = await adManager.requestBid(slot, userInfo);
                
                if (bid && bid.seatbid && bid.seatbid[0].bid[0]) {
                    adManager.renderAd(slot, bid.seatbid[0].bid[0]);
                } else {
                    adManager.loadFallbackAd(slot);
                }
            } catch (error) {
                console.error(`Error processing ad for ${slotKey}:`, error);
                adManager.loadFallbackAd(slot);
            }
        }
    } catch (error) {
        console.error('Error initializing ads:', error);
    }
}

// Start the ad system when page loads
document.addEventListener('DOMContentLoaded', initializeAds);

// Refresh ads when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        initializeAds();
    }
});

// Refresh ads on resize (with debounce)
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initializeAds, 250);
});