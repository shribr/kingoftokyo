/** toolbar.component.js
 * MIGRATED TOOLBAR COMPONENT (legacy .game-toolbar removed)
 * Styling fully scoped in css/components.toolbar.css. Button visuals use local rules.
 * Next: remove legacy .game-toolbar selectors from legacy CSS (if still present) after QA.
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
