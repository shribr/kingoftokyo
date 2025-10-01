/** ui/blackoutController.js
 * Centralized controller for the post-splash blackout overlay.
 * Provides imperative controls so callers can explicitly show/hide/elevate the blackout layer.
 */

function ensureElement() {
  let el = document.querySelector('.post-splash-blackout');
  if (!el) {
    el = document.createElement('div');
    el.className = 'post-splash-blackout';
    document.body.appendChild(el);
  }
  return el;
}

function show(opts = {}) {
  const el = ensureElement();
  el.classList.remove('is-hidden');
  if (opts.zIndex != null) el.style.zIndex = String(opts.zIndex);
}

function hide() {
  const el = document.querySelector('.post-splash-blackout');
  if (el) el.classList.add('is-hidden');
}

function elevate() {
  const el = ensureElement();
  el.style.zIndex = '15000';
  el.classList.remove('is-hidden');
}

function lower() {
  const el = ensureElement();
  el.style.zIndex = '7000';
}

export const BlackoutController = { show, hide, elevate, lower };

// Convenience global access for event handlers that cannot import easily
if (typeof window !== 'undefined') {
  window.__KOT_BLACKOUT__ = BlackoutController;
}
