import { YIELD_PROMPT_SHOWN, YIELD_PROMPT_DECIDED, PLAYER_LEFT_TOKYO } from '../actions.js';

// State shape: { prompts: [ { defenderId, attackerId, slot, expiresAt, decision:null|'yield'|'stay' } ] }
const initial = { prompts: [] };

export function yieldDecisionReducer(state = initial, action) {
  switch (action.type) {
    case YIELD_PROMPT_SHOWN: {
      const { defenderId, attackerId, slot, expiresAt, damage, advisory } = action.payload;
      // Avoid duplicate prompt for same defender in same resolution window.
      if (state.prompts.some(p => p.defenderId === defenderId && p.attackerId === attackerId && p.slot === slot && p.decision == null)) {
        return state;
      }
      return { ...state, prompts: [...state.prompts, { defenderId, attackerId, slot, expiresAt, damage, advisory, decision: null }] };
    }
    case YIELD_PROMPT_DECIDED: {
      const { defenderId, attackerId, slot, decision } = action.payload;
      return {
        ...state,
        prompts: state.prompts.map(p => (p.defenderId === defenderId && p.attackerId === attackerId && p.slot === slot && p.decision == null)
          ? { ...p, decision }
          : p)
      };
    }
    case PLAYER_LEFT_TOKYO: { // auto-resolve prompt if occupant leaves by other means
      const { playerId } = action.payload;
      return { ...state, prompts: state.prompts.map(p => p.defenderId === playerId && p.decision == null ? { ...p, decision: 'yield' } : p) };
    }
    default:
      return state;
  }
}
