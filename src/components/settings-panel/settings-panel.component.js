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
    } else if (e.target.matches('[name="playerCardLayoutMode"]')) {
      const val = e.target.value;
      store.dispatch(settingsUpdated({ playerCardLayoutMode: val, stackedPlayerCards: (val === 'stacked') }));
    } else if (e.target.matches('[name="actionMenuMode"]')) {
      const val = e.target.value;
      store.dispatch(settingsUpdated({ actionMenuMode: val }));
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
    <p style="margin:8px 0 12px;font-size:12px;opacity:.75;font-family:system-ui,sans-serif;">When off (default), panels and menus reset to their default layout every reload.</p>
    <fieldset style="border:1px solid #333;padding:8px 10px 10px;margin:0 0 10px;font-family:system-ui,sans-serif;">
      <legend style="padding:0 6px;font-size:13px;letter-spacing:.5px;">Player Card Layout</legend>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <input type="radio" name="playerCardLayoutMode" value="stacked" /> Stacked (full overlap)
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <input type="radio" name="playerCardLayoutMode" value="condensed" /> Condensed (lighter overlap)
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
        <input type="radio" name="playerCardLayoutMode" value="list" /> List (no overlap)
      </label>
      <p style="margin:6px 0 0;font-size:11px;opacity:.65;line-height:1.4;">Try different density modes. Stacked = dramatic tilt & tight pile. Condensed = readable mini stack. List = linear.</p>
    </fieldset>
    <fieldset style="border:1px solid #333;padding:8px 10px 10px;margin:0 0 14px;font-family:system-ui,sans-serif;">
      <legend style="padding:0 6px;font-size:13px;letter-spacing:.5px;">Action Menu Placement</legend>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <input type="radio" name="actionMenuMode" value="hybrid" /> Hybrid (dock until dragged)
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <input type="radio" name="actionMenuMode" value="docked" /> Docked (always beside dice)
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
        <input type="radio" name="actionMenuMode" value="floating" /> Floating (stay where placed)
      </label>
      <p style="margin:6px 0 0;font-size:11px;opacity:.65;line-height:1.4;">Hybrid (default): auto-docks near the dice tray on resize until you drag it, then it stops moving.</p>
    </fieldset>
  </div>`;
}

function sync(root) {
  const st = store.getState();
  const persist = !!st.settings?.persistPositions;
  const cb = root.querySelector('[data-setting="persistPositions"]');
  if (cb) cb.checked = persist;
  const mode = st.settings?.playerCardLayoutMode || (st.settings?.stackedPlayerCards === false ? 'list' : 'stacked');
  const radios = root.querySelectorAll('[name="playerCardLayoutMode"]');
  radios.forEach(r => { r.checked = (r.value === mode); });
  const amMode = st.settings?.actionMenuMode || 'hybrid';
  root.querySelectorAll('[name="actionMenuMode"]').forEach(r => { r.checked = (r.value === amMode); });
}
