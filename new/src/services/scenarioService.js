// services/scenarioService.js
// Applies scenario presets to the game state.
import { getScenario } from '../scenarios/catalog.js';
import { playerVPGained, playerGainEnergy, playerCardGained, applyPlayerDamage, healPlayerAction, cardEffectEnqueued } from '../core/actions.js';
import { buildBaseCatalog } from '../domain/cards.js';

export function applyScenarios(store, config) {
  // config: { assignments: [{ playerId, scenarioIds: [], replace?:boolean }], mode?:'stack'|'replace' }
  if (!config || !Array.isArray(config.assignments)) return;
  const catalog = buildBaseCatalog();
  const state = store.getState();
  const byId = state.players.byId;
  const globalScenarios = new Set();
  config.assignments.forEach(assign => {
    const player = byId[assign.playerId];
    if (!player) return;
    (assign.scenarioIds || []).forEach(scId => {
      const sc = getScenario(scId);
      if (!sc) return;
      if (sc.global) globalScenarios.add(scId);
      const patch = sc.apply(player, { catalog, store });
      if (!patch) return;
      // Translate patch into actions; direct state mutation avoided.
      if (patch.victoryPoints != null) {
        const delta = patch.victoryPoints - player.victoryPoints;
        if (delta > 0) store.dispatch(playerVPGained(player.id, delta, 'scenario:'+scId));
      }
      if (patch.energy != null) {
        const delta = patch.energy - player.energy;
        if (delta > 0) store.dispatch(playerGainEnergy(player.id, delta));
      }
      if (patch.health != null) {
        const delta = patch.health - player.health;
        if (delta < 0) store.dispatch(applyPlayerDamage(player.id, -delta));
        else if (delta > 0) store.dispatch(healPlayerAction(player.id, delta));
      }
      if (Array.isArray(patch.cards)) {
        // Add each card (skip duplicates)
        const existing = new Set((player.cards||[]).map(c=>c.id));
        patch.cards.forEach(c => { if (!existing.has(c.id)) store.dispatch(playerCardGained(player.id, c)); });
      }
      if (Array.isArray(patch._queueEffects)) {
        // Enqueue effects without a card context (synthetic scenarios), using pseudo card ids for logging
        patch._queueEffects.forEach((eff, idx) => {
          const entry = { id: 'scfx_'+player.id+'_'+idx+'_'+Date.now(), playerId: player.id, cardId: 'scenario-'+scId, effect: eff, status: 'queued', queuedAt: Date.now() };
          store.dispatch(cardEffectEnqueued(entry));
        });
      }
    });
  });
  // Apply global scenarios to all players
  if (globalScenarios.size) {
    Object.values(byId).forEach(player => {
      globalScenarios.forEach(scId => {
        const sc = getScenario(scId);
        if (!sc) return;
        const patch = sc.apply(player, { catalog, store });
        if (!patch) return;
        if (patch.victoryPoints != null) {
          const delta = patch.victoryPoints - player.victoryPoints;
          if (delta > 0) store.dispatch(playerVPGained(player.id, delta, 'scenario:'+scId));
        }
        if (patch.energy != null) {
          const delta = patch.energy - player.energy;
          if (delta > 0) store.dispatch(playerGainEnergy(player.id, delta));
        }
        if (patch.health != null) {
          const delta = patch.health - player.health;
          if (delta < 0) store.dispatch(applyPlayerDamage(player.id, -delta));
          else if (delta > 0) store.dispatch(healPlayerAction(player.id, delta));
        }
        if (Array.isArray(patch.cards)) {
          const existing = new Set((player.cards||[]).map(c=>c.id));
            patch.cards.forEach(c => { if (!existing.has(c.id)) store.dispatch(playerCardGained(player.id, c)); });
        }
      });
    });
  }
}

export function buildScenarioSnapshot(store) {
  const st = store.getState();
  return {
    players: JSON.parse(JSON.stringify(st.players))
  };
}

export function captureScenarioState(store) {
  const st = store.getState();
  return {
    ts: Date.now(),
    players: JSON.parse(JSON.stringify(st.players)),
    meta: JSON.parse(JSON.stringify(st.meta)),
    phase: st.phase
  };
}

export function restoreScenarioState(store, snap) {
  if (!snap) return;
  // Minimal restore: replace players slice (avoiding full GAME_STATE_IMPORTED complexity for now)
  try {
    store.dispatch({ type: 'GAME_STATE_IMPORTED', payload: { snapshot: { slices: { players: snap.players, meta: snap.meta, phase: snap.phase } } } });
  } catch(e) { console.warn('Scenario restore failed', e); }
}
