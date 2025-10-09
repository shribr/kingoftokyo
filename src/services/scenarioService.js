// services/scenarioService.js
// Applies scenario presets to the game state.
import { getScenario } from '../scenarios/catalog.js';
import { playerVPGained, playerGainEnergy, playerCardGained, applyPlayerDamage, healPlayerAction, cardEffectEnqueued } from '../core/actions.js';
import { buildBaseCatalog } from '../domain/cards.js';

export function applyScenarios(store, config) {
  // config: { assignments: [{ playerId, scenarioIds: [], paramsByScenario?: { [id]: {..} }, replace?:boolean }], mode?:'stack'|'replace' }
  console.log('🎬 applyScenarios called with config:', config);
  if (!config || !Array.isArray(config.assignments)) return;
  const catalog = buildBaseCatalog();
  const state = store.getState();
  const byId = state.players.byId;
  const globalScenarios = new Set();
  config.assignments.forEach(assign => {
    // Get fresh state for each assignment to ensure we have latest player data
    const freshState = store.getState();
    const freshById = freshState.players.byId;
    const player = freshById[assign.playerId];
    if (!player) {
      console.warn('⚠️ Player not found for assignment:', assign.playerId);
      return;
    }
    console.log(`🎯 Applying scenarios to player ${player.name} (${player.id}):`, assign.scenarioIds);
    console.log(`  📊 Current player state:`, { 
      health: player.health, 
      energy: player.energy, 
      vp: player.victoryPoints, 
      powerCards: player.powerCards?.length || 0 
    });
    (assign.scenarioIds || []).forEach(scId => {
      const sc = getScenario(scId);
      if (!sc) {
        console.warn('⚠️ Scenario not found:', scId);
        return;
      }
      console.log(`  📋 Applying scenario "${sc.label}" (${scId})`);
      if (sc.global) globalScenarios.add(scId);
      const params = (assign.paramsByScenario && assign.paramsByScenario[scId]) || undefined;
      const patch = sc.apply(player, { catalog, store }, params);
      console.log(`  🔧 Patch returned:`, patch);
      if (!patch) return;
      // Translate patch into actions; direct state mutation avoided.
      if (patch.victoryPoints != null) {
        const delta = patch.victoryPoints - player.victoryPoints;
        console.log(`  ⭐ VP delta: ${delta} (current: ${player.victoryPoints}, target: ${patch.victoryPoints})`);
        if (delta > 0) store.dispatch(playerVPGained(player.id, delta, 'scenario:'+scId));
      }
      if (patch.energy != null) {
        const delta = patch.energy - player.energy;
        console.log(`  ⚡ Energy delta: ${delta} (current: ${player.energy}, target: ${patch.energy})`);
        if (delta > 0) store.dispatch(playerGainEnergy(player.id, delta));
      }
      if (patch.health != null) {
        const delta = patch.health - player.health;
        console.log(`  ❤️ Health delta: ${delta} (current: ${player.health}, target: ${patch.health})`);
        if (delta < 0) store.dispatch(applyPlayerDamage(player.id, -delta));
        else if (delta > 0) store.dispatch(healPlayerAction(player.id, delta));
      }
      if (Array.isArray(patch.powerCards)) {
        // Add each card (skip duplicates)
        const existing = new Set((player.powerCards||[]).map(c=>c.id));
        const newCards = patch.powerCards.filter(c => !existing.has(c.id));
        console.log(`  🃏 Cards: ${newCards.length} new cards to add (total in patch: ${patch.powerCards.length}, existing: ${existing.size})`);
        newCards.forEach((c, idx) => {
          console.log(`    📇 Adding card ${idx + 1}/${newCards.length}: "${c.name}" (${c.id})`);
          store.dispatch(playerCardGained(player.id, c));
        });
      }
      if (Array.isArray(patch._queueEffects)) {
        // Enqueue effects without a card context (synthetic scenarios), using pseudo card ids for logging
        console.log(`  🔮 Queueing ${patch._queueEffects.length} effects`);
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
        const params = collectParamsForPlayer(globalScenariosAssignments(config.assignments), scId, player.id);
        const patch = sc.apply(player, { catalog, store }, params);
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

// Helper to gather params for a global scenario (if provided in assignments) – merges first found.
function collectParamsForPlayer(assignments, scId, _playerId){
  for (const a of assignments) {
    if (a.scenarioIds && a.scenarioIds.includes(scId)) {
      if (a.paramsByScenario && a.paramsByScenario[scId]) return a.paramsByScenario[scId];
    }
  }
  return undefined;
}

function globalScenariosAssignments(assignments){
  return assignments || [];
}
