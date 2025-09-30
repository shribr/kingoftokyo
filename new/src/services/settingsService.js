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