// phaseFSM.js
// Finite State Machine for game phase transitions.
// Provides validateTransition(current, next) and nextForEvent(current, event) helpers.

export const Phases = Object.freeze({
  SETUP: 'SETUP',
  ROLL: 'ROLL',
  RESOLVE: 'RESOLVE',
  YIELD_DECISION: 'YIELD_DECISION',
  BUY: 'BUY',
  BUY_WAIT: 'BUY_WAIT',
  CLEANUP: 'CLEANUP',
  GAME_OVER: 'GAME_OVER'
});

// Allowed direct transitions (edges) from each phase.
const TRANSITIONS = {
  [Phases.SETUP]: [Phases.ROLL],
  [Phases.ROLL]: [Phases.RESOLVE],
  [Phases.RESOLVE]: [Phases.YIELD_DECISION, Phases.BUY, Phases.GAME_OVER],
  [Phases.YIELD_DECISION]: [Phases.BUY, Phases.RESOLVE], // player might cancel yield logic path
  [Phases.BUY]: [Phases.BUY_WAIT, Phases.CLEANUP],
  [Phases.BUY_WAIT]: [Phases.CLEANUP],
  [Phases.CLEANUP]: [Phases.ROLL],
  [Phases.GAME_OVER]: []
};

export function validateTransition(current, next) {
  if (current === next) return true; // ignore self-transition
  const allowed = TRANSITIONS[current] || [];
  return allowed.includes(next);
}

export function assertTransition(current, next) {
  const ok = validateTransition(current, next);
  if (!ok) {
    const msg = `Invalid phase transition: ${current} -> ${next}`;
    if (process?.env?.NODE_ENV !== 'production') {
      console.warn(msg);
    }
    return false;
  }
  return true;
}

// Optional event-driven mapping (not fully used yet)
export function nextForEvent(current, event) {
  switch (current) {
    case Phases.SETUP:
      if (event === 'GAME_START') return Phases.ROLL;
      break;
    case Phases.ROLL:
      if (event === 'DICE_ROLL_RESOLVED') return Phases.RESOLVE;
      if (event === 'ROLL_COMPLETE') return Phases.RESOLVE; // alias event from turnService
      break;
    case Phases.RESOLVE:
      if (event === 'NEEDS_YIELD_DECISION') return Phases.YIELD_DECISION;
      if (event === 'NO_YIELD_NEEDED') return Phases.BUY;
      if (event === 'RESOLUTION_COMPLETE') return Phases.BUY; // alias when resolution finishes directly
      if (event === 'GAME_OVER') return Phases.GAME_OVER;
      break;
    case Phases.YIELD_DECISION:
      if (event === 'YIELD_DECISION_MADE') return Phases.BUY;
      if (event === 'REENTER_RESOLUTION') return Phases.RESOLVE;
      break;
    case Phases.BUY:
      if (event === 'PURCHASE_WITH_FOLLOWUP') return Phases.BUY_WAIT;
      if (event === 'BUY_WINDOW_CLOSED') return Phases.CLEANUP;
      if (event === 'BUY_COMPLETE') return Phases.CLEANUP; // alias
      break;
    case Phases.BUY_WAIT:
      if (event === 'POST_PURCHASE_RESOLVED') return Phases.CLEANUP;
      break;
    case Phases.CLEANUP:
      if (event === 'TURN_READY') return Phases.ROLL;
      if (event === 'TURN_START') return Phases.ROLL; // alias intent
      break;
    case Phases.GAME_OVER:
      // No outgoing transitions; allow alias event check for clarity
      break;
  }
  return null;
}

export function listAllowed(next) {
  return TRANSITIONS[next] ? Object.freeze([...TRANSITIONS[next]]) : [];
}
