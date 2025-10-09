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
      } else {
        // When enabling, ensure dice tray remains visible (guard against style side-effects)
        try { const dice = document.querySelector('.cmp-dice-tray'); if (dice) dice.style.visibility = ''; } catch(_) {}
      }
    } else if (e.target.matches('[data-setting="showPhaseMetrics"]')) {
      const checked = e.target.checked;
      store.dispatch(settingsUpdated({ showPhaseMetrics: checked }));
    } else if (e.target.matches('[data-log-flag]')) {
      // Handle debug logging flags
      const flagName = e.target.getAttribute('data-log-flag');
      const checked = e.target.checked;
      if (window.__KOT_DEBUG__) {
        window.__KOT_DEBUG__[flagName] = checked;
        console.log(`[Settings] Debug flag ${flagName} ${checked ? 'enabled' : 'disabled'}`);
      }
    } else if (e.target.matches('[name="playerCardLayoutMode"]')) {
      const val = e.target.value;
      store.dispatch(settingsUpdated({ playerCardLayoutMode: val, stackedPlayerCards: (val === 'stacked') }));
    } else if (e.target.matches('[name="actionMenuMode"]')) {
      const val = e.target.value;
      store.dispatch(settingsUpdated({ actionMenuMode: val }));
    } else if (e.target.matches('[name="mobileMenuCorner"]')) {
      const val = e.target.value;
      store.dispatch(settingsUpdated({ mobileMenuCorner: val }));
      // Apply the change immediately
      applyMobileCornerPreference(val);
    }
  });
  sync(root);
  // Re-sync on viewport breakpoint changes to enforce/relax mobile list mode
  try {
    const mq = window.matchMedia('(max-width: 760px), (pointer: coarse)');
    const handler = () => sync(root);
    mq.addEventListener('change', handler);
    // Store for potential future destroy cleanup
    root._mqList = { mq, handler };
  } catch(_) {}
  return { root, update: () => sync(root) };
}

function template() {
  return `<div class="k-panel__header"><h2 class="k-panel__title">Settings</h2></div>
  <div class="k-panel__body">
    <label style="display:flex;align-items:center;gap:8px;font-family:system-ui,sans-serif;font-size:14px;" title="When enabled, panel positions and collapsed/expanded states will be restored on reload.">
      <input type="checkbox" data-setting="persistPositions" />
      Remember layout & panel positions
    </label>
  <p style="margin:8px 0 12px;font-size:12px;opacity:.75;font-family:system-ui,sans-serif;">When off (default), panels reset to their default layout and state every reload.</p>
    <fieldset style="border:1px solid #333;padding:0.8vh 1vw 1vh;margin:0 0 1vh;font-family:system-ui,sans-serif;">
      <legend style="padding:0 0.6vw;font-size:13px;letter-spacing:.5px;">Developer Tools</legend>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <input type="checkbox" data-setting="showPhaseMetrics" />
        Show Phase Metrics Panel
      </label>
      <p style="margin:6px 0 0;font-size:11px;opacity:.65;line-height:1.4;">Displays real-time performance timing for each game phase. Green = fast (&lt;50ms), Yellow = acceptable (50-150ms), Red = slow (&gt;150ms). Data is not persisted.</p>
    </fieldset>
    <fieldset style="border:1px solid #333;padding:0.8vh 1vw 1vh;margin:0 0 1vh;font-family:system-ui,sans-serif;">
      <legend style="padding:0 0.6vw;font-size:13px;letter-spacing:.5px;">Debug Logging</legend>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <input type="checkbox" data-log-flag="logComponentUpdates" />
        Component Updates
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <input type="checkbox" data-log-flag="logCPUDecisions" />
        CPU/AI Decisions
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <input type="checkbox" data-log-flag="logStoreUpdates" />
        Store Updates
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <input type="checkbox" data-log-flag="logSubscriptions" />
        Subscriptions
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <input type="checkbox" data-log-flag="logModals" />
        Modal Lifecycle
      </label>
      <p style="margin:6px 0 0;font-size:11px;opacity:.65;line-height:1.4;">Enable verbose logging for debugging. Changes take effect immediately. You can also use ?debug=all in URL.</p>
    </fieldset>
    <fieldset style="border:1px solid #333;padding:0.8vh 1vw 1vh;margin:0 0 1vh;font-family:system-ui,sans-serif;">
      <legend style="padding:0 0.6vw;font-size:13px;letter-spacing:.5px;">Player Card Layout</legend>
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
    <fieldset style="border:1px solid #333;padding:0.8vh 1vw 1vh;margin:0 0 1.4vh;font-family:system-ui,sans-serif;">
      <legend style="padding:0 0.6vw;font-size:13px;letter-spacing:.5px;">Action Menu Placement</legend>
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
    <fieldset style="border:1px solid #333;padding:0.8vh 1vw 1vh;margin:0 0 1.4vh;font-family:system-ui,sans-serif;">
      <legend style="padding:0 0.6vw;font-size:13px;letter-spacing:.5px;">Mobile Interface</legend>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <input type="radio" name="mobileMenuCorner" value="right" /> Action Menu: Right Corner
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
        <input type="radio" name="mobileMenuCorner" value="left" /> Action Menu: Left Corner
      </label>
      <p style="margin:6px 0 0;font-size:11px;opacity:.65;line-height:1.4;">Choose which corner for the action menu. The dice tray will appear on the opposite side. Perfect for left-handed or right-handed users.</p>
    </fieldset>
  </div>`;
}

function sync(root) {
  const st = store.getState();
  const isMobile = typeof window !== 'undefined' && (window.matchMedia('(max-width: 760px), (pointer: coarse)').matches);
  const persist = !!st.settings?.persistPositions;
  const cb = root.querySelector('[data-setting="persistPositions"]');
  if (cb) cb.checked = persist;
  
  const showPhaseMetrics = !!st.settings?.showPhaseMetrics;
  const metricsCb = root.querySelector('[data-setting="showPhaseMetrics"]');
  if (metricsCb) metricsCb.checked = showPhaseMetrics;
  
  // Sync debug logging flags
  if (window.__KOT_DEBUG__) {
    const logFlags = ['logComponentUpdates', 'logCPUDecisions', 'logStoreUpdates', 'logSubscriptions', 'logModals'];
    logFlags.forEach(flagName => {
      const checkbox = root.querySelector(`[data-log-flag="${flagName}"]`);
      if (checkbox) {
        checkbox.checked = !!window.__KOT_DEBUG__[flagName];
      }
    });
  }
  
  let mode = st.settings?.playerCardLayoutMode || (st.settings?.stackedPlayerCards === false ? 'list' : 'stacked');
  if (isMobile) mode = 'list'; // Force list on mobile
  const radios = root.querySelectorAll('[name="playerCardLayoutMode"]');
  radios.forEach(r => {
    r.checked = (r.value === mode);
    if (isMobile) {
      // Disable non-list options for clarity on mobile enforced layout
      r.disabled = r.value !== 'list';
      if (r.value !== 'list') {
        r.parentElement.style.opacity = '.4';
        r.parentElement.title = 'Only list layout available on mobile';
      } else {
        r.parentElement.style.opacity = '1';
        r.parentElement.title = '';
      }
    } else {
      r.disabled = false;
      r.parentElement.style.opacity = '1';
      r.parentElement.title = '';
    }
  });
  const amMode = st.settings?.actionMenuMode || 'hybrid';
  root.querySelectorAll('[name="actionMenuMode"]').forEach(r => { r.checked = (r.value === amMode); });
  
  const mobileCorner = st.settings?.mobileMenuCorner || 'right';
  root.querySelectorAll('[name="mobileMenuCorner"]').forEach(r => { r.checked = (r.value === mobileCorner); });
}

// Helper function to apply mobile corner preference
function applyMobileCornerPreference(corner) {
  const actionMenuBtn = document.getElementById('action-menu-mobile-btn');
  const radialMenu = document.querySelector('.radial-action-menu');
  const diceToggleBtn = document.getElementById('dice-toggle-btn');
  
  if (corner === 'left') {
    // Action menu on left, dice tray on right
    if (actionMenuBtn) {
      actionMenuBtn.style.left = '2vw';
      actionMenuBtn.style.right = 'auto';
    }
    if (radialMenu) {
      radialMenu.style.left = '2vw';
      radialMenu.style.right = 'auto';
      radialMenu.setAttribute('data-corner', 'left');
      
      // Re-apply positions if menu is expanded
      if (radialMenu.getAttribute('data-expanded') === 'true' && radialMenu._applyRadialPositions) {
        radialMenu._applyRadialPositions(true);
      }
    }
    if (diceToggleBtn) {
      diceToggleBtn.style.right = '10vw';
      diceToggleBtn.style.left = 'auto';
    }
  } else {
    // Action menu on right (default), dice tray on left
    if (actionMenuBtn) {
      actionMenuBtn.style.right = '2vw';
      actionMenuBtn.style.left = 'auto';
    }
    if (radialMenu) {
      radialMenu.style.right = '2vw';
      radialMenu.style.left = 'auto';
      radialMenu.setAttribute('data-corner', 'right');
      
      // Re-apply positions if menu is expanded
      if (radialMenu.getAttribute('data-expanded') === 'true' && radialMenu._applyRadialPositions) {
        radialMenu._applyRadialPositions(true);
      }
    }
    if (diceToggleBtn) {
      diceToggleBtn.style.right = '10vw';
      diceToggleBtn.style.left = 'auto';
    }
  }
  
  // Store preference
  try {
    localStorage.setItem('kot_mobile_corner', corner);
  } catch(_) {}
}

export { applyMobileCornerPreference };
