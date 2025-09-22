import { TOKYO_OCCUPANT_SET, TOKYO_OCCUPANT_CLEARED } from '../actions.js';

const initial = { occupantId: null };

export function tokyoReducer(state = initial, action) {
  switch (action.type) {
    case TOKYO_OCCUPANT_SET:
      return { ...state, occupantId: action.payload.playerId };
    case TOKYO_OCCUPANT_CLEARED:
      return { ...state, occupantId: null };
    default:
      return state;
  }
}
