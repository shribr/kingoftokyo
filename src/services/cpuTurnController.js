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
import { rollDice, tallyFaces } from '../domain/dice.js';
import { DICE_ANIM_MS, AI_POST_ANIM_DELAY_MS } from '../constants/uiTimings.js';
import { eventBus } from '../core/eventBus.js';

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
    nextRollDelayMs: 1200,       // Increased from 400ms - delay between rolls
    decisionThinkingMs: 800,     // Increased from 300ms - AI thinking time
    initialRollDelayMs: 1500,    // NEW: delay before first roll starts
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
    // Initial delay before CPU starts rolling (gives player time to see turn change)
    if (window.__KOT_DEBUG__?.logCPUDecisions) {
      console.log(`[cpuController] Waiting ${settings.initialRollDelayMs}ms before starting rolls...`);
    }
    await wait(settings.initialRollDelayMs);
    
    let rollNumber = 0;
    while (!cancelled && rollNumber < settings.maxRolls) {
      rollNumber++;
      const initial = rollNumber === 1;
      
      // AGGRESSIVE DEBUG LOGGING
      console.log(`🎲 [CPU ROLL ${rollNumber}/${settings.maxRolls}] initial=${initial}`);
      
      if (window.__KOT_DEBUG__?.logCPUDecisions) {
        console.log(`[cpuController] Starting roll ${rollNumber}/${settings.maxRolls}, initial=${initial}`);
      }
      
      // Perform roll
      const preState = store.getState();
      const diceFacesBefore = preState.dice.faces;
      if (window.__KOT_DEBUG__?.logCPUDecisions) {
        console.log(`[cpuController] Pre-roll state: rerolls=${preState.dice.rerollsRemaining}, faces=${diceFacesBefore.length}`);
      }
      
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
        if (window.__KOT_DEBUG__?.logCPUDecisions) {
          console.log(`[cpuController] Dice phase is ${postAnimState.dice.phase}, setting to resolved`);
        }
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
        rawDecision = engine.makeRollDecision(canonical, st.dice.rerollsRemaining, { ...player, monster: player.monster||{}, powerCards: player.powerCards||[] }, gameState);
        if (window.__KOT_DEBUG__?.logCPUDecisions) {
          console.log(`[cpuController] Engine returned decision for roll ${rollNumber}:`, rawDecision);
        }
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

      if (window.__KOT_DEBUG__?.logCPUDecisions) {
        console.log(`[cpuController] AI decision for roll ${rollNumber}:`, { 
          action: decision.action, 
          keepDice: decision.keepDice, 
          rerollsRemaining: st.dice.rerollsRemaining,
          reason: decision.reason 
        });
      }

      // Emit event for thought bubble display
      try {
        const activePlayer = st.players.byId[playerId];
        eventBus.emit('ai/decision/made', {
          playerId,
          playerName: activePlayer?.name || 'CPU',
          rollNumber,
          faces: canonical,
          decision: {
            action: decision.action,
            keepDice: decision.keepDice,
            confidence: decision.confidence,
            reason: decision.reason
          },
          rerollsRemaining: st.dice.rerollsRemaining,
          turnCycleId: st.meta?.turnCycleId
        });
      } catch(e) {
        console.warn('[cpuController] Failed to emit thought bubble event', e);
      }

      // Normalize decision action:
      // - Treat 'keep' as intent to continue rolling (after locking desired dice)
      // - Only 'endRoll' (and synonyms) should terminate the roll cycle
      const normalizedAction = (d=> {
        if (!d || !d.action) return 'endRoll';
        const a = String(d.action).toLowerCase();
        if (a === 'endroll' || a === 'end' || a === 'stop') return 'endRoll';
        if (a === 'keep' || a === 'reroll') return 'reroll';
        return 'endRoll';
      })(decision);

      // Apply dice keeps based on AI decision
      try {
        if (Array.isArray(decision.keepDice)) {
          if (window.__KOT_DEBUG__?.logCPUDecisions) {
            console.log(`[cpuController] Applying AI keep decision: ${decision.keepDice}`);
          }
          const currentFaces = store.getState().dice.faces || [];
          const desired = new Set(decision.keepDice.filter(i=> i>=0 && i<currentFaces.length));
          
          // First release any dice currently kept that shouldn't be
          currentFaces.forEach((die, idx) => { 
            if (die?.kept && !desired.has(idx)) { 
              store.dispatch({ type:'DICE_TOGGLE_KEEP', payload:{ index: idx }});
              if (window.__KOT_DEBUG__?.logCPUDecisions) {
                console.log(`[cpuController] Released die ${idx} (${die.value})`);
              }
            }
          });
          
          // Then keep the desired dice
          desired.forEach(idx => { 
            const cf = store.getState().dice.faces || []; 
            const d = cf[idx]; 
            if (d && !d.kept) {
              store.dispatch({ type:'DICE_TOGGLE_KEEP', payload:{ index: idx }});
              if (window.__KOT_DEBUG__?.logCPUDecisions) {
                console.log(`[cpuController] Kept die ${idx} (${d.value})`);
              }
            }
          });
          // If AI intends to reroll but accidentally kept all dice, release one low-value die so reroll is possible
          try {
            const afterKeeps = store.getState();
            const allKept = (afterKeeps.dice.faces||[]).every(f=> f && f.kept);
            const willReroll = normalizedAction === 'reroll' && (afterKeeps.dice.rerollsRemaining ?? 0) > 0;
            if (willReroll && allKept) {
              const releaseIdx = pickReleaseIndex(afterKeeps, playerId);
              if (releaseIdx != null) {
                store.dispatch({ type:'DICE_TOGGLE_KEEP', payload:{ index: releaseIdx }});
                if (window.__KOT_DEBUG__?.logCPUDecisions) {
                  console.log(`[cpuController] Released die ${releaseIdx} to allow reroll`);
                }
              }
            }
          } catch(_) {}
        } else {
          // Fallback to simple heuristic if no specific dice provided
          if (window.__KOT_DEBUG__?.logCPUDecisions) {
            console.log(`[cpuController] No specific keeps, using fallback heuristic`);
          }
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
      
      if (window.__KOT_DEBUG__?.logCPUDecisions) {
        console.log(`[cpuController] Stop check: action=${normalizedAction}, rerollsRemaining=${currentRerolls}, hasUnkeptDice=${hasUnkeptDice}, rollNumber=${rollNumber}`);
      }
      
      // Stop conditions:
      // 1. AI explicitly wants to end (normalizedAction === 'endRoll')
      // 2. No more rerolls available AND not the initial roll
      // 3. All dice are kept (nothing to reroll)
      // 4. Reached max rolls
      const noRerollsLeft = currentRerolls <= 0 && !initial;
      const stop = normalizedAction === 'endRoll' || noRerollsLeft || !hasUnkeptDice;
      
      // AGGRESSIVE DEBUG LOGGING
      console.log(`🛑 [CPU STOP CHECK ${rollNumber}] stop=${stop}, noRerollsLeft=${noRerollsLeft}, currentRerolls=${currentRerolls}, initial=${initial}, normalizedAction=${normalizedAction}, hasUnkeptDice=${hasUnkeptDice}`);
      
      if (stop || rollNumber >= settings.maxRolls) {
        if (window.__KOT_DEBUG__?.logCPUDecisions) {
          console.log(`[cpuController] Stopping after roll ${rollNumber}:`, { 
            stop, 
            rollNumber, 
            maxRolls: settings.maxRolls, 
            reason: normalizedAction === 'endRoll' ? 'AI chose to end' : 
                    noRerollsLeft ? 'no rerolls left' : 
                    !hasUnkeptDice ? 'all dice kept' : 
                    'max rolls reached' 
          });
        }
        break;
      }
      if (window.__KOT_DEBUG__?.logCPUDecisions) {
        console.log(`[cpuController] Continuing to next roll...`);
      }
      
      // Decrement reroll counter now for next iteration
      // CRITICAL FIX: Only decrement after rerolls, NOT after the initial roll
      // The initial roll is FREE - it doesn't consume one of the 2 rerolls
      if (!initial) {
        console.log(`⬇️ [CPU DECREMENT ${rollNumber}] Decrementing rerollsRemaining (was a reroll)`);
        if (window.__KOT_DEBUG__?.logCPUDecisions) {
          console.log(`[cpuController] Decrementing reroll counter after roll ${rollNumber} (was a reroll)`);
        }
        store.dispatch(diceRollCompleted());
        const afterDecrement = store.getState().dice.rerollsRemaining;
        console.log(`✅ [CPU AFTER DECREMENT ${rollNumber}] rerollsRemaining is now: ${afterDecrement}`);
      } else {
        console.log(`⏭️ [CPU SKIP DECREMENT ${rollNumber}] NOT decrementing (was initial roll)`);
        const stillSame = store.getState().dice.rerollsRemaining;
        console.log(`✅ [CPU KEPT SAME ${rollNumber}] rerollsRemaining still: ${stillSame}`);
        if (window.__KOT_DEBUG__?.logCPUDecisions) {
          console.log(`[cpuController] NOT decrementing - roll ${rollNumber} was the initial roll`);
        }
      }
      
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

    // Resolution will be handled centrally by turnService in response to DICE_ROLL_RESOLVED.
  }

  return { start, cancel, isActive: ()=> active && !cancelled };
}

// Choose a die index to release (un-keep) when AI wants to reroll but all dice are kept.
// Simple heuristic:
//  - If in Tokyo: prefer releasing a 'heal' (hearts can't heal in Tokyo)
//  - Else: prefer releasing a numeric that isn't part of a pair/triple (singles, lower number first)
//  - Else: release an energy
//  - Else: release the last die
function pickReleaseIndex(state, playerId) {
  try {
    const faces = state.dice.faces || [];
    if (!faces.length) return null;
    const player = state.players.byId[playerId];
    const t = tallyFaces(faces);
    // 1) In Tokyo -> hearts are least valuable (can't heal)
    if (player?.inTokyo) {
      const idx = faces.findIndex(f => f.value === 'heal' || f.value === 'heart');
      if (idx !== -1) return idx;
    }
    // 2) Numeric singles (not contributing to pair/triple), prefer lower numbers
    const numOrder = ['1','2','3'];
    for (const n of numOrder) {
      if ((t[n]||0) === 1) {
        const idx = faces.findIndex(f => String(f.value) === n);
        if (idx !== -1) return idx;
      }
    }
    // 3) Energy
    {
      const idx = faces.findIndex(f => f.value === 'energy' || f.value === '⚡');
      if (idx !== -1) return idx;
    }
    // 4) Fallback: last die
    return faces.length - 1;
  } catch(_) { return null; }
}
