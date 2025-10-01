// Legacy phase reducer (deprecated). Maintained temporarily for code still reading state.phase.
// Populated exclusively via PHASE_TRANSITION mirroring from phaseMachine.

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
  if (action.type === 'PHASE_TRANSITION') {
    const to = action.payload?.to;
    if (to) return to;
  }
  return state;
}
