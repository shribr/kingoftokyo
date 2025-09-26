/** settings-panel.component.js
 * Minimal settings panel to toggle UI persistence of draggable positions.
 * Future: integrate other existing settings (cpuSpeed, showThoughtBubbles, etc.).
 */
import { store } from '../../bootstrap/index.js';
import { settingsUpdated } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-settings-panel k-panel';
  root.innerHTML = template();
  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-setting="persistPositions"]')) {
      const checked = e.target.checked;
      store.dispatch(settingsUpdated({ persistPositions: checked }));
      if (!checked) {
        // If turning off, also clear stored localStorage key used by positioningService
        try { localStorage.removeItem('kot_new_ui_positions_v1'); } catch(_) {}
      }
    }
  });
  sync(root);
  return { root, update: () => sync(root) };
}

function template() {
  return `<div class="k-panel__header"><h2 class="k-panel__title">Settings</h2></div>
  <div class="k-panel__body">
    <label style="display:flex;align-items:center;gap:8px;font-family:system-ui,sans-serif;font-size:14px;">
      <input type="checkbox" data-setting="persistPositions" />
      Remember window positions between sessions
    </label>
    <p style="margin:8px 0 0;font-size:12px;opacity:.75;font-family:system-ui,sans-serif;">When off (default), panels and menus reset to their default layout every reload.</p>
  </div>`;
}

function sync(root) {
  const st = store.getState();
  const persist = !!st.settings?.persistPositions;
  const cb = root.querySelector('[data-setting="persistPositions"]');
  if (cb) cb.checked = persist;
}
