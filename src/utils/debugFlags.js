/**
 * Debug flags system for King of Tokyo
 * 
 * Usage:
 * - Set flags via URL: ?debug=components,cpu,store
 * - Set flags via console: window.__KOT_DEBUG__.logComponentUpdates = true
 * - Check flags in code: if (window.__KOT_DEBUG__?.logComponentUpdates) { ... }
 */

// Initialize debug flags object
if (!window.__KOT_DEBUG__) {
  window.__KOT_DEBUG__ = {};
}

// Parse URL parameters for debug flags
const urlParams = new URLSearchParams(window.location.search);
const debugParam = urlParams.get('debug');

if (debugParam) {
  const flags = debugParam.split(',').map(f => f.trim().toLowerCase());
  
  flags.forEach(flag => {
    switch(flag) {
      case 'components':
      case 'component':
        window.__KOT_DEBUG__.logComponentUpdates = true;
        console.log('[Debug] Component updates logging enabled');
        break;
      
      case 'cpu':
      case 'ai':
        window.__KOT_DEBUG__.logCPUDecisions = true;
        console.log('[Debug] CPU decision logging enabled');
        break;
      
      case 'store':
      case 'redux':
        window.__KOT_DEBUG__.logStoreUpdates = true;
        console.log('[Debug] Store updates logging enabled');
        break;
      
      case 'subscriptions':
      case 'subs':
        window.__KOT_DEBUG__.logSubscriptions = true;
        console.log('[Debug] Subscription logging enabled');
        break;
      
      case 'modals':
      case 'modal':
        window.__KOT_DEBUG__.logModals = true;
        console.log('[Debug] Modal logging enabled');
        break;
      
      case 'all':
        window.__KOT_DEBUG__.logComponentUpdates = true;
        window.__KOT_DEBUG__.logCPUDecisions = true;
        window.__KOT_DEBUG__.logStoreUpdates = true;
        window.__KOT_DEBUG__.logSubscriptions = true;
        window.__KOT_DEBUG__.logModals = true;
        console.log('[Debug] All logging enabled');
        break;
      
      default:
        console.warn(`[Debug] Unknown debug flag: ${flag}`);
    }
  });
} else {
  // Default: all flags off
  window.__KOT_DEBUG__.logComponentUpdates = false;
  window.__KOT_DEBUG__.logCPUDecisions = false;
  window.__KOT_DEBUG__.logStoreUpdates = false;
  window.__KOT_DEBUG__.logSubscriptions = false;
  window.__KOT_DEBUG__.logModals = false;
}

// Special flag for batch operations (always available)
if (typeof window.__KOT_SKIP_UPDATES__ === 'undefined') {
  window.__KOT_SKIP_UPDATES__ = false;
}

// Export for module usage
export default window.__KOT_DEBUG__;
