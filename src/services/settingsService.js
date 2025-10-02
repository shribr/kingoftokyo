/** settingsService.js
 * Handles persistence of user-adjustable settings to localStorage.
 */
import { settingsLoaded, uiGameLogCollapseState, SCENARIO_CONFIG_UPDATED } from '../core/actions.js';

const LS_KEY = 'kot_new_settings_v1';
const LS_LOG_COLLAPSE = 'kot_new_logCollapse_v1';

export function loadSettings(store) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      store.dispatch(settingsLoaded(parsed));
      return parsed;
    }
  } catch (_) { /* noop */ }
  return null;
}

export function persistSettings(store) {
  const state = store.getState();
  const settings = state.settings;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  } catch (_) { /* ignore */ }
}

export function bindSettingsPersistence(store) {
  // Persist on every SETTINGS_UPDATED (cheap - small object)
  store.subscribe((_state, action) => {
    if (action && (action.type === 'SETTINGS_UPDATED' || action.type === SCENARIO_CONFIG_UPDATED)) {
      persistSettings(store);
      // Update global animation suppression attribute
      try {
        const disable = !!store.getState().settings?.disableAnimations;
        if (disable) {
          if (!document.body.hasAttribute('data-disable-animations')) document.body.setAttribute('data-disable-animations','');
        } else {
          if (document.body.hasAttribute('data-disable-animations')) document.body.removeAttribute('data-disable-animations');
        }
      } catch(_) {}
      // Opportunistic retention cleanup for auto archives if retention setting changed
      try {
        import('./autoArchiveTempService.js').then(mod => {
          const st = store.getState();
            const retentionDays = Math.max(1, parseInt(st.settings.archiveRetentionDays||3,10));
            const maxPer = Math.max(1, parseInt(st.settings.archiveMaxPerType||10,10));
            // Using internal prune: list keys to force prune by triggering a dummy archive pass with no writes
            // We'll just call private-like behavior by archiving nothing: reusing exported listing to decide.
            // Instead directly import and call internal prune is not exposed; mimic by writing nothing and relying on prune
            // We'll simply re-save oldest entries forcing prune: cheap approach is to call a hidden helper; for now replicate minimal logic
            const now=Date.now();
            // Local inline prune duplication (kept minimal to avoid circular import exporting prune)
            const prefixes = ['kot_game_','kot_aidt_'];
            prefixes.forEach(pref=>{
              const keys = Object.keys(localStorage).filter(k=>k.startsWith(pref)).sort();
              // Retention
              keys.forEach(k=>{ try { const obj = JSON.parse(localStorage.getItem(k)); if (obj?.meta?.ts && now - obj.meta.ts > retentionDays*86400000) localStorage.removeItem(k); } catch(_){} });
              // Max count
              const remain = Object.keys(localStorage).filter(k=>k.startsWith(pref)).sort();
              if (remain.length > maxPer){
                remain.slice(0, remain.length-maxPer).forEach(k=>{ try { localStorage.removeItem(k); } catch(_){} });
              }
            });
        }).catch(()=>{});
      } catch(_) {}
    }
    if (action && action.type === 'UI_GAME_LOG_COLLAPSE_STATE') {
      try {
        const st = store.getState();
        const collapse = st.ui?.gameLog?.collapse;
        const kinds = st.ui?.gameLog?.kinds;
        localStorage.setItem(LS_LOG_COLLAPSE, JSON.stringify({ collapse, kinds }));
      } catch (_) { /* ignore */ }
    }
  });
}

export function loadLogCollapse(store) {
  try {
    const raw = localStorage.getItem(LS_LOG_COLLAPSE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.collapse) {
        store.dispatch(uiGameLogCollapseState({ ...parsed.collapse, kinds: parsed.kinds }));
      } else {
        store.dispatch(uiGameLogCollapseState(parsed));
      }
      return parsed;
    }
  } catch (_) { /* noop */ }
  return null;
}