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
    try { logger.debug && logger.debug('[cpuController] start() invoked'); } catch(_) {}
    try {
      const state = store.getState();
      const activeId = selectActivePlayerId(state);
      if (!activeId) { logger.warn('[cpuController] No active player'); return; }
      await runRollCycle(activeId);
    } finally {
      if (typeof window !== 'undefined' && window.__KOT_NEW__) {
        window.__KOT_NEW__.cpuControllerModeActive = false;
      }
      try { logger.debug && logger.debug('[cpuController] start() complete'); } catch(_) {}
      active = false;
    }
  }

  function cancel(){ cancelled = true; }

  async function runRollCycle(playerId){
    let rollNumber = 0;
    while (!cancelled && rollNumber < settings.maxRolls) {
      rollNumber++;
      const initial = rollNumber === 1;
      console.log(`[cpuController] Starting roll ${rollNumber}/${settings.maxRolls}, initial=${initial}`);
      
      // Perform roll
      const preState = store.getState();
      const diceFacesBefore = preState.dice.faces;
      console.log(`[cpuController] Pre-roll state: rerolls=${preState.dice.rerollsRemaining}, faces=${diceFacesBefore.length}`);
      
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
      
      // Wait for dice animation to complete BEFORE making AI decision
      await wait(DICE_ANIM_MS + AI_POST_ANIM_DELAY_MS);
      
      // Mark dice as resolved after animation
      const postAnimState = store.getState();
      if (postAnimState.dice.phase !== 'resolved') {
        console.log(`[cpuController] Dice phase is ${postAnimState.dice.phase}, setting to resolved`);
        // The dice should be resolved after animation, but if not, we can't proceed properly
      }

      // Now get the AI decision after roll animation completes
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
        console.log(`[cpuController] Engine returned decision for roll ${rollNumber}:`, rawDecision);
      } catch(e) {
        console.warn('[cpuController] engine decision error sync, fallback', e);
        logger.warn('[cpuController] engine decision error sync, fallback', e);
      }
      
      if (rawDecision && typeof rawDecision.then === 'function') decisionPromise = rawDecision; 
      else decisionPromise = Promise.resolve(rawDecision);
      
      const decision = await withTimeout(decisionPromise, settings.decisionTimeoutMs, () => {
        const currentRerollsForFallback = st.dice.rerollsRemaining ?? 0;
        console.warn(`[cpuController] Decision timeout, using fallback with rerolls=${currentRerollsForFallback}`);
        return { action: currentRerollsForFallback>0?'reroll':'endRoll', keepDice: [], confidence:0.2, reason:'timeout fallback'};
      });

      console.log(`[cpuController] AI decision for roll ${rollNumber}:`, { 
        action: decision.action, 
        keepDice: decision.keepDice, 
        rerollsRemaining: st.dice.rerollsRemaining,
        reason: decision.reason 
      });

      // Normalize decision action
      const normalizedAction = (d=> {
        if (!d || !d.action) return 'endRoll';
        const a = d.action.toLowerCase();
        if (a === 'endroll') return 'endRoll';
        if (['reroll','keep','endroll','end','stop'].includes(a)) return a==='stop'?'endRoll':a;
        return 'endRoll';
      })(decision);

      // Apply dice keeps based on AI decision
      try {
        if (Array.isArray(decision.keepDice)) {
          console.log(`[cpuController] Applying AI keep decision: ${decision.keepDice}`);
          const currentFaces = store.getState().dice.faces || [];
          const desired = new Set(decision.keepDice.filter(i=> i>=0 && i<currentFaces.length));
          
          // First release any dice currently kept that shouldn't be
          currentFaces.forEach((die, idx) => { 
            if (die?.kept && !desired.has(idx)) { 
              store.dispatch({ type:'DICE_TOGGLE_KEEP', payload:{ index: idx }});
              console.log(`[cpuController] Released die ${idx} (${die.value})`);
            }
          });
          
          // Then keep the desired dice
          desired.forEach(idx => { 
            const cf = store.getState().dice.faces || []; 
            const d = cf[idx]; 
            if (d && !d.kept) {
              store.dispatch({ type:'DICE_TOGGLE_KEEP', payload:{ index: idx }});
              console.log(`[cpuController] Kept die ${idx} (${d.value})`);
            }
          });
        } else {
          // Fallback to simple heuristic if no specific dice provided
          console.log(`[cpuController] No specific keeps, using fallback heuristic`);
          immediateAIDiceSelection(store);
        }
      } catch(e) { 
        logger.warn('[cpuController] keep application error', e); 
      }

      // Reroll counter management handled in the stop conditions logic

      // Early stop conditions - check current state for rerolls remaining
      const currentState = store.getState();
      const currentRerolls = currentState.dice.rerollsRemaining ?? 0;
      const hasUnkeptDice = !!(currentState.dice.faces||[]).some(f=> f && !f.kept);
      
      // For initial roll, we still have rerolls available (haven't decremented yet)
      const effectiveRerolls = initial ? currentRerolls : Math.max(0, currentRerolls);
      
      console.log(`[cpuController] Stop check: action=${normalizedAction}, currentRerolls=${currentRerolls}, effectiveRerolls=${effectiveRerolls}, hasUnkeptDice=${hasUnkeptDice}, initial=${initial}`);
      
      const stop = normalizedAction !== 'reroll' || effectiveRerolls <= 0 || !hasUnkeptDice;
      if (stop || rollNumber >= settings.maxRolls) {
        console.log(`[cpuController] Stopping after roll ${rollNumber}:`, { stop, rollNumber, maxRolls: settings.maxRolls, reason: stop ? 'stop condition met' : 'max rolls reached' });
        break;
      }
      console.log(`[cpuController] Continuing to next roll...`);
      
      // Decrement reroll counter now for next iteration 
      console.log(`[cpuController] Decrementing reroll counter after roll ${rollNumber}`);
      store.dispatch(diceRollCompleted());
      
      // Next roll pacing
      await wait(settings.nextRollDelayMs + settings.decisionThinkingMs);
    }

    // Final resolution transition - mimic legacy behavior with metadata payload
    try { logger.debug && logger.debug('[cpuController] dispatching diceRollResolved after rolls', { totalRolls: rollNumber }); } catch(_) {}
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

    // CPU should immediately apply dice effects including Tokyo entry VP
    try {
      logger.debug && logger.debug('[cpuController] applying dice effects (including Tokyo entry)');
      // Import and call acceptDiceResults to trigger resolution logic
      if (typeof window !== 'undefined' && window.__KOT_NEW__?.turnService?.acceptDiceResults) {
        await window.__KOT_NEW__.turnService.acceptDiceResults();
      }
    } catch(e) {
      logger.warn('[cpuController] failed to apply dice effects:', e);
    }
  }

  return { start, cancel, isActive: ()=> active && !cancelled };
}
