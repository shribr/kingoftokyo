import { DICE_ROLL_STARTED, DICE_ROLLED, DICE_TOGGLE_KEEP, DICE_REROLL_USED, PHASE_CHANGED } from '../actions.js';

const initial = { faces: [], rerollsRemaining: 0, phase: 'idle' };

export function diceReducer(state = initial, action) {
  switch (action.type) {
    case DICE_ROLL_STARTED: {
      // If we're starting a fresh roll sequence (not a reroll yet), ensure rerollsRemaining is set.
      const starting = state.phase === 'idle' || state.phase === 'sequence-complete';
      const rerollsRemaining = starting ? 2 : state.rerollsRemaining; // 2 rerolls after first roll
      return { ...state, phase: 'rolling', rerollsRemaining };
    }
    case DICE_ROLLED:
      return { ...state, faces: action.payload.faces, phase: 'resolved' };
    case DICE_TOGGLE_KEEP: {
      const { index } = action.payload;
      if (index < 0 || index >= state.faces.length) return state;
      const faces = state.faces.map((f,i) => i === index ? { ...f, kept: !f.kept } : f);
      return { ...state, faces };
    }
    case DICE_REROLL_USED: {
      const remaining = Math.max(0, state.rerollsRemaining - 1);
      const sequenceComplete = remaining === 0 ? 'sequence-complete' : state.phase;
      return { ...state, rerollsRemaining: remaining, phase: sequenceComplete };
    }
    case PHASE_CHANGED: {
      // Reset dice state when returning to ROLL phase for a new turn
      if (action.payload.phase === 'ROLL') {
        return { faces: [], rerollsRemaining: 0, phase: 'idle' };
      }
      return state;
    }
    default:
      return state;
  }
}
