/** stateView.js
 * Perception layer that normalizes raw root state into AI-ready view objects.
 * Pure (no side effects) so engine calls become consistent across services.
 *
 * Contract:
 *  buildAIState(rootState) => {
 *    activePlayer: { id, name, health, maxHealth, victoryPoints, energy, isInTokyo, isEliminated, powerCards, monster }
 *    gameState: { players:[{ id, victoryPoints, health, maxHealth, energy, isInTokyo, isEliminated, powerCards }], availablePowerCards: [] }
 *    dice: { facesRaw: ['claw','1',...], facesCanonical: ['attack','one',...], rerollsRemaining, keptMask: [bool] }
 * }
 */

function canonicalizeFace(face) {
  if (face === 'claw') return 'attack';
  if (face === 'heal') return 'heart';
  if (face === '1') return 'one';
  if (face === '2') return 'two';
  if (face === '3') return 'three';
  return face; // energy, attack, heart already fine
}

export function buildAIState(state) {
  if (!state) return null;
  const order = state.players?.order || [];
  const activeIndex = state.meta?.activePlayerIndex ?? 0;
  const activeId = order.length ? order[activeIndex % order.length] : null;
  const active = activeId ? state.players.byId[activeId] : null;

  const players = order.map(id => {
    const p = state.players.byId[id];
    return {
      id: p.id,
      name: p.name || p.displayName || p.id,
      health: p.health,
      maxHealth: p.maxHealth || 10,
      victoryPoints: p.victoryPoints || p.vp || 0,
      energy: p.energy || 0,
      isInTokyo: !!p.inTokyo,
      isEliminated: !p.status?.alive,
      powerCards: p.cards || p.powerCards || [],
    };
  });

  const gameState = {
    players,
    availablePowerCards: (state.cards?.shop || []).map(c => ({
      id: c.id,
      name: c.name,
      cost: c.cost,
      effects: c.effect ? [c.effect] : (c.effects || [])
    }))
  };

  const diceFaces = (state.dice?.faces || []).map(f => f.value);
  const facesCanonical = diceFaces.map(canonicalizeFace);
  const keptMask = (state.dice?.faces || []).map(f => !!f.kept);

  const activePlayer = active ? {
    id: active.id,
    name: active.name || active.displayName || active.id,
    health: active.health,
    maxHealth: active.maxHealth || 10,
    victoryPoints: active.victoryPoints || active.vp || 0,
    energy: active.energy || 0,
    isInTokyo: !!active.inTokyo,
    isEliminated: !active.status?.alive,
    powerCards: active.cards || active.powerCards || [],
    monster: active.monster || { personality: { aggression: 3, risk: 3, strategy: 3 } }
  } : null;

  return {
    activePlayer,
    gameState,
    dice: {
      facesRaw: diceFaces,
      facesCanonical,
      keptMask,
      rerollsRemaining: state.dice?.rerollsRemaining ?? 0
    }
  };
}

export function extractEngineInputs(state) {
  const view = buildAIState(state);
  if (!view) return null;
  return {
    diceFacesCanonical: view.dice.facesCanonical,
    rerollsRemaining: view.dice.rerollsRemaining,
    playerForEngine: view.activePlayer,
    gameState: view.gameState
  };
}
