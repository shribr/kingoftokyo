/**
 * Click debug utility to track what's causing flickering
 */

let clickCount = 0;

// Store original dispatch to intercept actions
const originalDispatch = window.__KOT_NEW__?.store?.dispatch;
if (originalDispatch && window.__KOT_NEW__?.store) {
  window.__KOT_NEW__.store.dispatch = function(action) {
    console.log(`[CLICK-DEBUG] Action dispatched:`, action);
    return originalDispatch.call(this, action);
  };
}

// Intercept all clicks
document.addEventListener('click', (e) => {
  clickCount++;
  const target = e.target;
  const clickInfo = {
    clickCount,
    tagName: target.tagName,
    className: target.className,
    id: target.id,
    textContent: target.textContent?.slice(0, 50),
    closest: {
      button: target.closest('button')?.className,
      component: target.closest('[class*="cmp-"]')?.className,
      modal: target.closest('.modal, .new-modal, .modal-shell')?.className
    }
  };
  
  console.log(`[CLICK-DEBUG] Click #${clickCount}:`, clickInfo);
  
  // Check if this click causes any visible changes
  setTimeout(() => {
    const panels = document.querySelectorAll('.cmp-monsters-panel, .cmp-power-cards-panel');
    panels.forEach(panel => {
      const computedStyle = window.getComputedStyle(panel);
      console.log(`[CLICK-DEBUG] Panel ${panel.className} after click #${clickCount}:`, {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        transform: computedStyle.transform,
        opacity: computedStyle.opacity
      });
    });
  }, 10);
}, true); // Use capture phase to catch everything

console.log('[CLICK-DEBUG] Click interceptor installed');