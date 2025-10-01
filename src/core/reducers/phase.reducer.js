import { PHASE_CHANGED } from '../actions.js';
import { assertTransition } from '../phaseFSM.js';

// Enumerate known phases for potential future validation; not strictly enforced yet.
export const KNOWN_PHASES = [
  'SETUP',
  'ROLL',
  'RESOLVE',
  'BUY',
  'CLEANUP',
  'GAME_OVER'
];

const initial = 'SETUP';

export function phaseReducer(state = initial, action) {
  switch (action.type) {
    case PHASE_CHANGED: {
      const { phase } = action.payload;
      if (!phase) return state;
      if (!assertTransition(state, phase)) return state; // reject invalid
      return phase;
    }
    default:
      return state;
  }
}
