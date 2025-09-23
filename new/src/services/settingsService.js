/** settingsService.js
 * Handles persistence of user-adjustable settings to localStorage.
 */
import { settingsLoaded } from '../core/actions.js';

const LS_KEY = 'kot_new_settings_v1';

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
    if (action && action.type === 'SETTINGS_UPDATED') {
      persistSettings(store);
    }
  });
}