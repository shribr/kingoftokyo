// engineGuard.js
// Purpose: Provide a safe accessor / wrapper for enhanced AI engine capabilities.
// Currently a lightweight placeholder so imports do not fail if advanced engine not yet integrated.

export function enhancedEngineGuard(engineCandidate) {
  // If a richer engine object is provided with validation API, return it; else wrap fallback.
  if (engineCandidate && typeof engineCandidate.makeRollDecision === 'function') {
    return engineCandidate;
  }
  // Provide a minimal fallback engine interface
  return {
    makeRollDecision(diceFaces, rerollsRemaining, player, gameState) {
      // Very naive fallback: if rerolls remaining and no 3-of-a-kind yet, request reroll; else stop.
      const counts = diceFaces.reduce((m,f)=>{ m[f]=(m[f]||0)+1; return m; },{});
      const hasTriplet = Object.values(counts).some(c=> c>=3);
      const action = (!hasTriplet && rerollsRemaining>0) ? 'reroll' : 'endRoll';
      return { action, keepDice: [], confidence: 0.1, reason: 'engineGuard fallback' };
    }
  };
}
