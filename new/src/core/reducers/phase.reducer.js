import { PHASE_CHANGED } from '../actions.js';

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
      // Simple acceptance; could validate with KNOWN_PHASES.includes(phase)
      return phase || state;
    }
    default:
      return state;
  }
}
