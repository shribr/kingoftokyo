import { TOKYO_OCCUPANT_SET, TOKYO_OCCUPANT_CLEARED, PLAYER_LEFT_TOKYO } from '../actions.js';

// Extended to support Tokyo City (primary) and Tokyo Bay (secondary, 5-6 player games)
// For now we always expose both slots; game logic will only award Bay VP if occupied and player count >=5.
const initial = { city: null, bay: null };

export function tokyoReducer(state = initial, action) {
  switch (action.type) {
    case TOKYO_OCCUPANT_SET: {
      const { playerId, playerCount } = action.payload;
      // Always fill city first if empty
      if (!state.city) return { ...state, city: playerId };
      // Bay only available in 5-6 player games
      if (!state.bay && (playerCount || 0) >= 5) return { ...state, bay: playerId };
      return state; // no slot available
    }
    case TOKYO_OCCUPANT_CLEARED: {
      const { playerId } = action.payload || {};
      // If specific playerId provided, clear that slot; else clear all.
      if (!playerId) return { ...state, city: null, bay: null };
      if (state.city === playerId) return { ...state, city: null };
      if (state.bay === playerId) return { ...state, bay: null };
      return state;
    }
    case PLAYER_LEFT_TOKYO: {
      const { playerId } = action.payload;
      if (state.city === playerId) return { ...state, city: null };
      if (state.bay === playerId) return { ...state, bay: null };
      return state;
    }
    default:
      return state;
  }
}
