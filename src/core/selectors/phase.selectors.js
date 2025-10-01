// phase.selectors.js
// Unified phase selectors after FSM migration.
// Prefer state.phaseMachine.current if available; fall back to legacy state.phase during transition.

export function selectCurrentPhase(state) {
  if (!state) return undefined;
  if (state.phaseMachine && state.phaseMachine.current) return state.phaseMachine.current;
  return state.phase; // legacy
}

export function isPhase(state, phaseName) {
  return selectCurrentPhase(state) === phaseName;
}

// Optional: expose previous & history safely
export function selectPhaseHistory(state) {
  return state?.phaseMachine?.history || [];
}

export function selectPreviousPhase(state) {
  if (state?.phaseMachine?.previous) return state.phaseMachine.previous;
  // Legacy cannot track previous reliably without instrumentation
  return null;
}
