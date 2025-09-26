/**
 * DEPRECATED STUB: setup.component.js
 * All functionality migrated to: src/components/monster-selection/monster-selection.component.js
 * This file remains only because deletion attempts did not persist in the current tooling context.
 * Safe to remove entirely once verified no dynamic import references 'setup'.
 */
export function build() {
  if (typeof window !== 'undefined' && !window.__KOT_SETUP_DEPRECATED__) {
    window.__KOT_SETUP_DEPRECATED__ = true;
    console.warn('[setup.component] Deprecated stub invoked – use monster-selection component instead.');
  }
  const root = document.createElement('div');
  root.className = 'deprecated hidden';
  root.style.display = 'none';
  return { root, update: () => {} };
}

export function update() { /* no-op: deprecated stub */ }
