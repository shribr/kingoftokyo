/** devPanel.js
 * Phase 7: lightweight developer utilities (injected only if hash contains '#dev').
 */
import { createPositioningService } from '../services/positioningService.js';
import { eventBus } from '../core/eventBus.js';

export function mountDevPanel() {
  if (!location.hash.includes('dev')) return;
  const ps = createPositioningService(window.__KOT_NEW__.store);
  const panel = document.createElement('div');
  panel.className = 'dev-panel';
  panel.innerHTML = `
    <style>
      .dev-panel { position:fixed; bottom:8px; right:8px; background:#111a; color:#fff; font:12px/1.3 system-ui; padding:8px 10px; border:1px solid #333; border-radius:4px; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); z-index:5000; }
      .dev-panel button { background:#222; color:#fff; border:1px solid #555; padding:4px 6px; margin:0 4px 4px 0; cursor:pointer; font-size:11px; }
      .dev-panel button:hover { background:#333; }
      .dev-panel pre { max-height:120px; overflow:auto; background:#0006; padding:4px; }
    </style>
    <div><strong>Dev Panel</strong></div>
    <div>
      <button data-reset-positions>Reset Positions</button>
      <button data-log-positions>Log Positions</button>
      <button data-log-dice>Log Dice</button>
      <button data-log-effects>Log Effects</button>
    </div>`;
  panel.querySelector('[data-reset-positions]').addEventListener('click', () => eventBus.emit('ui/positions/resetRequested'));
  panel.querySelector('[data-log-positions]').addEventListener('click', () => {
    console.log('UI Positions', window.__KOT_NEW__.store.getState().ui.positions);
  });
  panel.querySelector('[data-log-dice]').addEventListener('click', () => {
    const st = window.__KOT_NEW__.store.getState();
    const order = st.players.order;
    let activeMods = {};
    if (order.length) {
      const activeId = order[st.meta.activePlayerIndex % order.length];
      activeMods = st.players.byId[activeId]?.modifiers || {};
    }
    console.log('Dice State', st.dice, 'Active Player Mods', activeMods);
  });
  panel.querySelector('[data-log-effects]').addEventListener('click', () => {
    const st = window.__KOT_NEW__.store.getState();
    console.log('Effect Queue', st.effectQueue);
  });
  document.body.appendChild(panel);
}

// Auto-mount when imported (safe guard if used once at bootstrap end)
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => mountDevPanel());
}