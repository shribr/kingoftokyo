import { TARGET_SELECTION_STARTED, TARGET_SELECTION_UPDATED, TARGET_SELECTION_CONFIRMED, TARGET_SELECTION_CANCELLED, CARD_EFFECT_FAILED } from '../actions.js';

// State: { active: { requestId, effect, min, max, eligibleIds:[], selectedIds:[] } | null }
const initial = { active: null };

export function targetSelectionReducer(state = initial, action) {
  switch(action.type) {
    case TARGET_SELECTION_STARTED: {
      const { requestId, effect, min, max, eligibleIds } = action.payload;
      return { ...state, active: { requestId, effect, min, max, eligibleIds, selectedIds: [] } };
    }
    case TARGET_SELECTION_UPDATED: {
      if (!state.active || state.active.requestId !== action.payload.requestId) return state;
      const { selectedIds } = action.payload;
      return { ...state, active: { ...state.active, selectedIds } };
    }
    case TARGET_SELECTION_CONFIRMED: {
      if (!state.active || state.active.requestId !== action.payload.requestId) return state;
      // Store selection onto a handoff area (could be expanded later)
      return { ...state, active: null, last: { requestId: action.payload.requestId, selectedIds: action.payload.selectedIds } };
    }
    case TARGET_SELECTION_CANCELLED: {
      if (!state.active || state.active.requestId !== action.payload.requestId) return state;
      return { ...state, active: null };
    }
    case CARD_EFFECT_FAILED: {
      // Clear selection if related effect failed
      if (!state.active) return state;
      if (action.payload?.entryId === state.active.requestId) {
        return { ...state, active: null };
      }
      return state;
    }
    default:
      return state;
  }
}
