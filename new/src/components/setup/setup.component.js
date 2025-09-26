/**
 * DEPRECATED: setup.component.js (legacy pre-monsterSelection component)
 * This file is kept only as a safety stub. It should be deleted once you
 * confirm no imports reference it. All functionality moved to:
 *   src/components/monster-selection/monster-selection.component.js
 */
export function build() {
  if (typeof window !== 'undefined' && !window.__KOT_SETUP_DEPRECATED__) {
    window.__KOT_SETUP_DEPRECATED__ = true;
    console.warn('[setup.component] Deprecated component invoked – migrate to monster-selection.');
  }
  const root = document.createElement('div');
  root.className = 'cmp-setup deprecated hidden';
  root.innerHTML = '<div class="deprecated-note">Deprecated setup component. Use monster-selection.</div>';
  return { root, update(){} };
}

export function update() { /* no-op deprecated */ }
