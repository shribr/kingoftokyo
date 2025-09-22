import { LOG_APPENDED } from '../actions.js';

const initial = { entries: [] };

export function logReducer(state = initial, action) {
  switch (action.type) {
    case LOG_APPENDED: {
      const { entry } = action.payload;
      if (!entry) return state;
      return { ...state, entries: [...state.entries, entry] };
    }
    default:
      return state;
  }
}
