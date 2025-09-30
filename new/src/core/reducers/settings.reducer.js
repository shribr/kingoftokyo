import { SETTINGS_LOADED, SETTINGS_UPDATED, SCENARIO_CONFIG_UPDATED } from '../actions.js';

const DEFAULT_SETTINGS = {
  cpuSpeed: 'normal', // slow | normal | fast
  showThoughtBubbles: true,
  autoActivateMonsters: true,
  showDebugPanels: false,
  persistPositions: false // new: whether draggable UI element positions persist between sessions
  , stackedPlayerCards: true // legacy boolean (backwards compat) for overlap/rotation stack style
  , playerCardLayoutMode: 'stacked' // stacked | condensed | list (new enumerated replacement for stackedPlayerCards)
  , soundMuted: false // global mute toggle
  , actionMenuMode: 'hybrid' // hybrid | docked | floating (controls action menu auto-position behavior)
  , autoStartInTest: true // when skipintro=1 load + auto-start full random game; if false just load UI without starting
  , scenarioConfig: { assignments: [] } // scenario test harness configuration
  , disableAnimations: false // global UI animation suppression (non-critical FX)
};

export function settingsReducer(state = DEFAULT_SETTINGS, action) {
  switch (action.type) {
    case SETTINGS_LOADED: {
      return { ...state, ...action.payload.settings };
    }
    case SETTINGS_UPDATED: {
      return { ...state, ...action.payload.partial };
    }
    case SCENARIO_CONFIG_UPDATED: {
      const cur = state.scenarioConfig || { assignments: [] };
      return { ...state, scenarioConfig: { ...cur, ...action.payload.partial } };
    }
    default:
      return state;
  }
}

export function getDefaultSettings() { return { ...DEFAULT_SETTINGS }; }