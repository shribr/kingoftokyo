/** overlayService.js
 * Unified blackout overlay with reference counting.
 * Components call overlayService.acquire('monsterSelection') / release(name).
 * The overlay stays visible while refCount > 0. Adds inert to main game container
 * (excluding the active modal subtree passed via keepInteractive option).
 */

const OVERLAY_CLASS = 'global-blackout-overlay';
let refCounts = new Map();
let overlayEl = null;
let inertApplied = false;

function ensureOverlay() {
  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.className = OVERLAY_CLASS;
    overlayEl.setAttribute('aria-hidden','true');
    document.body.appendChild(overlayEl);
  }
  return overlayEl;
}

function updateVisibility() {
  const total = [...refCounts.values()].reduce((a,b)=>a+b,0);
  if (total > 0) {
    const el = ensureOverlay();
    el.classList.add('is-active');
    // Apply inert to the game container to block interaction
    if (!inertApplied) {
      const game = document.getElementById('game-container');
      if (game) { game.setAttribute('inert',''); inertApplied = true; }
    }
  } else {
    if (overlayEl) overlayEl.classList.remove('is-active');
    const game = document.getElementById('game-container');
    if (game && inertApplied) { game.removeAttribute('inert'); inertApplied = false; }
  }
}

export function acquire(name) {
  const cur = refCounts.get(name) || 0;
  refCounts.set(name, cur + 1);
  updateVisibility();
}

export function release(name) {
  if (!refCounts.has(name)) return;
  const next = (refCounts.get(name) || 0) - 1;
  if (next <= 0) refCounts.delete(name); else refCounts.set(name,next);
  updateVisibility();
}

export function forceHide() {
  refCounts.clear();
  updateVisibility();
}

// Global debug helpers (optional)
if (typeof window !== 'undefined') {
  window.__KOT_OVERLAY__ = { acquire, release, forceHide, _debugCounts: ()=> ({...Object.fromEntries(refCounts)}) };
}
