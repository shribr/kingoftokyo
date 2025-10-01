/** cpuTurnController.js
 * MVP CPU turn refactor: deterministic async state machine for dice rolling.
 * Responsibilities:
 *  - Perform up to maxRolls dice rolls (initial + rerolls)
 *  - After each roll, immediately obtain AI decision and apply keeps
 *  - Respect decision to stop early (keep/endRoll)
 *  - Decrement reroll count using diceRollCompleted action (alignment with reducer)
 *  - Fallback & timeout safety for AI decision
 *  - Expose start() returning a promise that resolves after dice resolution triggers
 */
import { diceRollStarted, diceRolled, diceRollResolved, diceRollCompleted } from '../core/actions.js';
import { selectActivePlayerId } from '../core/selectors.js';
import { enhancedEngineGuard } from './internal/engineGuard.js'; // (future-proof placeholder if needed)
import { immediateAIDiceSelection } from './aiDecisionService.js';
import { extractEngineInputs } from '../ai/perception/stateView.js';
import { rollDice } from '../domain/dice.js';
import { DICE_ANIM_MS, AI_POST_ANIM_DELAY_MS } from '../constants/uiTimings.js';

function wait(ms){ return new Promise(res=> setTimeout(res, ms)); }

function withTimeout(promise, ms, fallbackFactory){
  let to; return Promise.race([
    promise.then(v=>{ clearTimeout(to); return v; }),
    new Promise(res=> { to = setTimeout(()=> res(fallbackFactory()), ms); })
  ]);
}

export function createCpuTurnController(store, engine, logger = console, options = {}) {
  const settings = {
    maxRolls: 3,
    decisionTimeoutMs: 1200,
    nextRollDelayMs: 400,
    decisionThinkingMs: 300,
    ...options
  };
  let active = false;
  let cancelled = false;

  async function start() {
    if (active) return; active = true; cancelled = false;
    if (typeof window !== 'undefined') {
      window.__KOT_NEW__ = window.__KOT_NEW__ || {}; 
      window.__KOT_NEW__.cpuControllerModeActive = true;
    }
    try {
      const state = store.getState();
      const activeId = selectActivePlayerId(state);
      if (!activeId) { logger.warn('[cpuController] No active player'); return; }
      await runRollCycle(activeId);
    } finally {
      if (typeof window !== 'undefined' && window.__KOT_NEW__) {
        window.__KOT_NEW__.cpuControllerModeActive = false;
      }
      active = false;
    }
  }

  function cancel(){ cancelled = true; }

  async function runRollCycle(playerId){
    let rollNumber = 0;
    while (!cancelled && rollNumber < settings.maxRolls) {
      rollNumber++;
      const initial = rollNumber === 1;
      // Perform roll
      const preState = store.getState();
      const diceFacesBefore = preState.dice.faces;
      store.dispatch(diceRollStarted());
      // Determine dice slots (# of dice) from active player's modifiers
      let count = 6;
      try {
        const st = store.getState();
        const order = st.players.order;
        if (order.length) {
          const aId = order[st.meta.activePlayerIndex % order.length];
          count = st.players.byId[aId]?.modifiers?.diceSlots || 6;
        }
      } catch(_) {}
      const newFaces = rollDice({ count, currentFaces: diceFacesBefore });
      store.dispatch(diceRolled(newFaces));
      // Simulate animation
      await wait(DICE_ANIM_MS + AI_POST_ANIM_DELAY_MS);

      // Get AI decision immediately after roll
  const st = store.getState();
  const engineInputs = extractEngineInputs(st);
  const canonical = engineInputs?.diceFacesCanonical || [];
  const rerollsRemaining = engineInputs?.rerollsRemaining ?? 0;
  const player = engineInputs?.playerForEngine || st.players.byId[playerId];
  const gameState = engineInputs?.gameState || { players: [], availablePowerCards: [] };
      let decisionPromise;
      let rawDecision;
      try {
        rawDecision = engine.makeRollDecision(canonical, st.dice.rerollsRemaining, { ...player, monster: player.monster||{}, powerCards: player.cards||[] }, gameState);
      } catch(e) {
        logger.warn('[cpuController] engine decision error sync, fallback', e);
      }
      if (rawDecision && typeof rawDecision.then === 'function') decisionPromise = rawDecision; else decisionPromise = Promise.resolve(rawDecision);
      const decision = await withTimeout(decisionPromise, settings.decisionTimeoutMs, () => ({ action: rerollsRemaining>0?'reroll':'endRoll', keepDice: [], confidence:0.2, reason:'timeout fallback'}));

      // Normalize decision
      const normalizedAction = (d=> {
        if (!d || !d.action) return 'endRoll';
        const a = d.action.toLowerCase();
        if (a === 'endroll') return 'endRoll';
        if (['reroll','keep','endroll','end','stop'].includes(a)) return a==='stop'?'endRoll':a;
        return 'endRoll';
      })(decision);

      // Apply keeps immediately
      try {
        if (Array.isArray(decision.keepDice)) {
          // mimic autoKeepHeuristic logic directly: toggle only indices specified
          // We'll delegate to existing heuristic to avoid drift
          immediateAIDiceSelection(store); // ensures at least heuristic set
          // Then enforce decision.keepDice as authoritative selection
          const currentFaces = store.getState().dice.faces || [];
          const desired = new Set(decision.keepDice.filter(i=> i>=0 && i<currentFaces.length));
          currentFaces.forEach((die, idx) => { if (die?.kept && !desired.has(idx)) { store.dispatch({ type:'DICE_TOGGLE_KEEP', payload:{ index: idx }}); }});
          desired.forEach(idx => { const cf = store.getState().dice.faces || []; const d = cf[idx]; if (d && !d.kept) store.dispatch({ type:'DICE_TOGGLE_KEEP', payload:{ index: idx }}); });
        } else {
          immediateAIDiceSelection(store);
        }
      } catch(e) { logger.warn('[cpuController] keep application error', e); }

      // Decrement reroll counter after non-initial rolls
      if (!initial) {
        store.dispatch({ type: 'DICE_REROLL_USED' }); // noop for legacy compatibility
        store.dispatch(diceRollCompleted());
      }

      // Early stop conditions
      const stop = normalizedAction !== 'reroll' || rerollsRemaining <= 0 || !(store.getState().dice.faces||[]).some(f=> f && !f.kept);
      if (stop || rollNumber >= settings.maxRolls) {
        logger.debug && logger.debug('[cpuController] stopping after roll', { rollNumber, action: normalizedAction });
        break;
      }
      // Next roll pacing
      await wait(settings.nextRollDelayMs + settings.decisionThinkingMs);
    }

    // Final resolution transition - mimic legacy behavior with metadata payload
    try {
      const stFinal = store.getState();
      const faces = (stFinal.dice.faces||[]).map(f=> f.value);
      const keptMask = (stFinal.dice.faces||[]).map(f=> !!f.kept);
      const totalRolls = rollNumber;
      const activePlayerId = playerId;
      const turnCycleId = stFinal.meta?.turnCycleId;
      const deterministic = (typeof window !== 'undefined' && window.__KOT_TEST_MODE__) ? { mode:true } : { mode:false };
      store.dispatch(diceRollResolved({ faces, keptMask, totalRolls, activePlayerId, turnCycleId, deterministic }));
    } catch(_) {
      store.dispatch(diceRollResolved());
    }
  }

  return { start, cancel, isActive: ()=> active && !cancelled };
}
