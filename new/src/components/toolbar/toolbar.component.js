/** toolbar.component.js
 * MODULAR REWRITE BRIDGE (Not a raw legacy copy)
 * LEGACY GLOBAL STYLE DEPENDENCY (FOR FUTURE LEGACY REMOVAL)
 * Uses legacy selector: .game-toolbar (layout, positioning, show/hide transitions) + shared .toolbar-btn styles if present in legacy CSS.
 * Original Implementation: Static markup + imperative wiring inside root `index.html` / `js/main.js` (queried via #game-toolbar).
 * This file reconstructs toolbar behavior as a self-contained component; it is not a verbatim legacy JS file.
 * Decommission / Migration Path:
 *   1. Extract toolbar visuals into css/components.toolbar.css (scoped to .cmp-toolbar root, define button spacing, z-index, transitions).
 *   2. Replace legacy .game-toolbar class with scoped root + data attributes.
 *   3. Remove reliance on legacy base button styles (introduce design tokens or shared button module) -> drop need for legacy CSS.
 *   4. After extraction, delete associated selectors from css/legacy/*.css.
 */
import { store } from '../../bootstrap/index.js';
import { uiSettingsOpen, uiGameLogOpen } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  // Removed legacy alias 'game-toolbar' (migration complete)
  root.className = selector.slice(1) + ' cmp-toolbar';
  root.setAttribute('data-draggable','true');
  root.innerHTML = `
    <button data-action="settings" class="toolbar-btn" title="Settings">⚙️</button>
    <button data-action="log" class="toolbar-btn" title="Game Log">📜</button>
    <button data-action="reset-positions" class="toolbar-btn" title="Reset Layout">♻️</button>
  `;
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const a = btn.getAttribute('data-action');
    if (a === 'settings') {
      store.dispatch(uiSettingsOpen());
    }
    else if (a === 'log') {
      store.dispatch(uiGameLogOpen());
    }
    else if (a === 'reset-positions') window.dispatchEvent(new CustomEvent('ui.positions.reset.request')); // bridging event
  });
  window.addEventListener('ui.positions.reset.request', () => {
    // eventBus path already exists via eventsToActions using 'ui/positions/reset'
    import('../../core/eventBus.js').then(m => m.eventBus.emit('ui/positions/reset'));
  });
  return { root, update: () => {} };
}
