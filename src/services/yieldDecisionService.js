/** services/yieldDecisionService.js
 * Unified yield (Tokyo leave) decision pipeline.
 * Responsibilities:
 *  - Batch creation of yield prompts for all damaged occupants after an attack (city + bay)
 *  - Immediate deterministic AI advisory + (optional) auto-decision when policy dictates
 *  - Dispatch YIELD_PROMPTS_CREATED followed by either incremental legacy decisions or final YIELD_ALL_RESOLVED
 *  - (Migration phase) coexists with legacy resolutionService yield logic until fully cut over.
 */
import { yieldPromptsCreated, yieldAllResolved, playerLeftTokyo } from '../core/actions.js';
import { evaluateYieldDecision, evaluateYieldAdvisory } from './aiDecisionService.js';
import { selectTokyoCityOccupant, selectTokyoBayOccupant } from '../core/selectors.js';
import { isDeterministicMode, combineSeed, createSeededRNG } from '../core/rng.js';
import { eventBus } from '../core/eventBus.js';

/** Derive advisory (with deterministic seed if applicable) */
function buildAdvisory(state, defenderId, damage, slot, decisionIndex) {
  try {
    const adv = evaluateYieldAdvisory(state, defenderId, damage, slot);
    if (!adv) return null;
    if (isDeterministicMode()) {
      const seed = combineSeed('KOT_YIELD_ADV', state.meta.turnCycleId, defenderId, slot, decisionIndex|0);
      return { ...adv, seed };
    }
    return adv;
  } catch(_) { return null; }
}

let __yieldDecisionCounter = 0; // reset per turnCycleId externally by consumer if needed (lightweight)

/** Begin unified yield flow. Returns number of prompts created. */
export function beginYieldFlow(store, logger, attackerId, clawDamage, playerCount, bayAllowed) {
  if (clawDamage <= 0) return 0;
  const state = store.getState();
  const cityOcc = selectTokyoCityOccupant(state);
  const bayOcc = selectTokyoBayOccupant(state);
  const prompts = [];
  const add = (pid, slot) => {
    if (!pid) return; const p = store.getState().players.byId[pid]; if (!p || !p.status.alive) return;
    const advisory = buildAdvisory(store.getState(), pid, clawDamage, slot, __yieldDecisionCounter);
    prompts.push({ defenderId: pid, slot, damage: clawDamage, advisory });
  };
  if (cityOcc) add(cityOcc, 'city');
  if (bayAllowed && bayOcc) add(bayOcc, 'bay');
  if (!prompts.length) return 0;
  const turnCycleId = store.getState().meta?.turnCycleId;
  store.dispatch(yieldPromptsCreated(attackerId, prompts, turnCycleId));
  const promptListStr = prompts.map(p=>p.defenderId+':'+p.slot).join(', ');
  logger.info(`Unified yield prompts created for attacker ${attackerId} -> ${promptListStr}`);
  eventBus.emit('yield.prompts.created', { attackerId, prompts: prompts.map(p=>({ defenderId:p.defenderId, slot:p.slot, damage:p.damage, advisory:p.advisory })), turnCycleId, ts: Date.now() });
  // AI immediate decision pass (could be staged; here we decide synchronously for deterministic simplicity)
  const decisions = [];
  for (const pr of prompts) {
    const player = store.getState().players.byId[pr.defenderId];
    if (player && (player.isCPU || player.isAI)) {
      // Deterministic yield decision seeding
      let decisionSeed = null, rng = null;
      if (isDeterministicMode()) {
        decisionSeed = combineSeed('KOT_YIELD_DEC', turnCycleId, attackerId, pr.defenderId, pr.slot, __yieldDecisionCounter|0);
        rng = createSeededRNG(decisionSeed);
      }
      let decision = evaluateYieldDecision(store.getState(), pr.defenderId, pr.damage, pr.slot, rng);
      // Policy: if lethal risk threshold logic (legacy heuristic) suggests immediate yield, keep it.
      // If deterministic mode we still treat evaluateYieldDecision as authoritative.
      if (decision === 'yield') {
        store.dispatch(playerLeftTokyo(pr.defenderId));
      }
      const decidedAt = Date.now();
      const meta = isDeterministicMode() ? { seed: decisionSeed, turnCycleId, decisionIndex: __yieldDecisionCounter } : undefined;
      decisions.push({ defenderId: pr.defenderId, slot: pr.slot, decision, advisory: pr.advisory, decidedAt, meta });
      eventBus.emit('ai.yield.decision', { attackerId, defenderId: pr.defenderId, slot: pr.slot, decision, seed: decisionSeed, turnCycleId, decisionIndex: __yieldDecisionCounter, ts: decidedAt });
      __yieldDecisionCounter++;
    }
  }
  // If all prompts are AI-controlled we can close flow immediately
  if (decisions.length === prompts.length) {
    store.dispatch(yieldAllResolved(attackerId, decisions, turnCycleId));
    logger.info(`Unified yield flow fully resolved (all AI) for attacker ${attackerId}`);
    eventBus.emit('yield.flow.complete', { attackerId, turnCycleId, decisions: decisions.map(d=>({ defenderId:d.defenderId, slot:d.slot, decision:d.decision, seed:d.meta?.seed })), ts: Date.now(), mode:'all-ai' });
  } else {
    // Leave human prompts pending; decisions will come via legacy YIELD_PROMPT_DECIDED or future unified handler.
    if (decisions.length) {
      // Partial resolution path: update reducer prompts decisions individually via final action or TODO incremental action.
      // For migration simplicity we emit terminal when humans also decide (handled elsewhere) so skip here.
      eventBus.emit('yield.partial', { attackerId, turnCycleId, decided: decisions.map(d=>({ defenderId:d.defenderId, slot:d.slot, decision:d.decision, seed:d.meta?.seed })), pending: prompts.filter(p=> !decisions.some(d=>d.defenderId===p.defenderId && d.slot===p.slot)).map(p=>({ defenderId:p.defenderId, slot:p.slot })), ts: Date.now() });
    }
  }
  return prompts.length;
}
