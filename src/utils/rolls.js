// rolls.js - utility helpers for dice roll limits
// Base rules: 1 initial roll + baseRerolls (default 2) + modifier bonuses (rerollBonus)
// Exposed helper computes total allowed rolls this turn for active player.

export function computeMaxRolls(state, playerId){
  if (!state) return 3; // fallback
  let baseRerolls = state.dice?.baseRerolls;
  if (typeof baseRerolls !== 'number') baseRerolls = 2;
  let bonus = 0;
  try {
    if (playerId && state.players?.byId?.[playerId]) {
      bonus = state.players.byId[playerId]?.modifiers?.rerollBonus || 0;
    } else if (state.players?.order?.length) {
      const active = state.players.order[state.meta.activePlayerIndex % state.players.order.length];
      bonus = state.players.byId[active]?.modifiers?.rerollBonus || 0;
    }
  } catch(_) {}
  return 1 + baseRerolls + bonus; // total (initial + rerolls)
}

export function remainingRollsBudget(state, playerId){
  // Based on faces/rerollsRemaining we can derive how many total rolls have happened.
  const max = computeMaxRolls(state, playerId);
  const rerollsRemaining = state.dice?.rerollsRemaining ?? 0;
  // Rolls used so far = (maxRerolls - rerollsRemaining)
  let baseRerolls = state.dice?.baseRerolls;
  if (typeof baseRerolls !== 'number') baseRerolls = 2;
  const bonus = max - (1 + baseRerolls); // derived
  const totalRerollCapacity = baseRerolls + bonus;
  const usedRerolls = Math.max(0, totalRerollCapacity - rerollsRemaining);
  const rollsUsed = 1 + usedRerolls; // include initial
  return { max, rollsUsed, rollsRemaining: Math.max(0, max - rollsUsed) };
}
