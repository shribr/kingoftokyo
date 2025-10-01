/**
 * Debug utility to track modal-shell visibility changes
 */

function isElementVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function logModalChange(element, change) {
  const computedStyle = window.getComputedStyle(element);
  console.log(`[MODAL-DEBUG] ${element.className}:`, {
    change,
    display: element.style.display,
    computedDisplay: computedStyle.display,
    visibility: computedStyle.visibility,
    opacity: computedStyle.opacity,
    classes: element.className,
    isVisible: isElementVisible(element)
  });
}

// Observer for attribute changes (class changes)
const attributeObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const element = mutation.target;
      if (element.classList.contains('modal-shell')) {
        logModalChange(element, 'class changed');
      }
    }
  });
});

// Observer for style changes
const styleObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
      const element = mutation.target;
      if (element.classList.contains('modal-shell')) {
        logModalChange(element, 'style changed');
      }
    }
  });
});

// Observer for DOM additions
const domObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList?.contains('modal-shell')) {
          logModalChange(node, 'element added');
        }
        // Check child elements too
        const modalShells = node.querySelectorAll?.('.modal-shell');
        modalShells?.forEach(shell => logModalChange(shell, 'child element added'));
      }
    });
  });
});

// Start observing
function startModalDebug() {
  console.log('[MODAL-DEBUG] Starting modal visibility tracking...');
  
  // Observe all existing modal-shell elements
  document.querySelectorAll('.modal-shell').forEach(element => {
    logModalChange(element, 'initial state');
    attributeObserver.observe(element, { attributes: true, attributeFilter: ['class'] });
    styleObserver.observe(element, { attributes: true, attributeFilter: ['style'] });
  });
  
  // Observe the document for new modal-shell elements
  domObserver.observe(document.body, { childList: true, subtree: true });
  
  // Periodically check for new modal-shell elements that might have been added
  setInterval(() => {
    document.querySelectorAll('.modal-shell').forEach(element => {
      if (!element.hasAttribute('data-debug-observed')) {
        element.setAttribute('data-debug-observed', 'true');
        logModalChange(element, 'newly discovered');
        attributeObserver.observe(element, { attributes: true, attributeFilter: ['class'] });
        styleObserver.observe(element, { attributes: true, attributeFilter: ['style'] });
      }
    });
  }, 1000);
}

// Start debugging when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startModalDebug);
} else {
  startModalDebug();
}

export { startModalDebug };