/** mobileToolbarToggle.js
 * Adds an accessible toggle control for showing/hiding the toolbar on small screens.
 * The visual styling is handled by existing responsive + mobile overrides via body.mobile-toolbar-hidden.
 */
export function installMobileToolbarToggle() {
  if (document.querySelector('[data-mobile-toolbar-toggle]')) return; // idempotent
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toolbar-btn mobile-toolbar-toggle-btn';
  btn.setAttribute('data-mobile-toolbar-toggle','');
  btn.setAttribute('aria-pressed','false');
  btn.setAttribute('aria-label','Toggle toolbar visibility');
  btn.innerHTML = `<span class="vh">Toolbar</span>☰`;
  btn.addEventListener('click', () => {
    const hidden = document.body.classList.toggle('mobile-toolbar-hidden');
    btn.setAttribute('aria-pressed', String(hidden));
  });
  // Insert near footer so it layers logically with other floating controls
  const footer = document.querySelector('[data-gl-footer]');
  if (footer) footer.appendChild(btn); else document.body.appendChild(btn);
}

// Auto-install on import (defer to next frame so layout shell exists)
setTimeout(()=>{
  try { installMobileToolbarToggle(); } catch(_) {}
}, 0);
