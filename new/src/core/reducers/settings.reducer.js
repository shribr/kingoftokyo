import { SETTINGS_LOADED, SETTINGS_UPDATED } from '../actions.js';

const DEFAULT_SETTINGS = {
  cpuSpeed: 'normal', // slow | normal | fast
  showThoughtBubbles: true,
  autoActivateMonsters: true,
  showDebugPanels: false
};

export function settingsReducer(state = DEFAULT_SETTINGS, action) {
  switch (action.type) {
    case SETTINGS_LOADED: {
      return { ...state, ...action.payload.settings };
    }
    case SETTINGS_UPDATED: {
      return { ...state, ...action.payload.partial };
    }
    default:
      return state;
  }
}

export function getDefaultSettings() { return { ...DEFAULT_SETTINGS }; }