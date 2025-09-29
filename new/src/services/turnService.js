/** services/turnService.js
 * Turn orchestration for both human and CPU players.
 * Lifecycle:
 *   startTurn() -> phase ROLL
 *     - Human: UI drives roll/reroll/keep and clicks End Turn to resolve
 *     - CPU: this service auto-plays the entire turn (roll -> rerolls -> resolve)
 *   resolve() -> applies dice effects, checks win, then enters BUY -> CLEANUP -> next turn
 */
import { phaseChanged, nextTurn, diceRollStarted, diceRolled, diceRerollUsed, playerEnteredTokyo, tokyoOccupantSet, playerVPGained, uiVPFlash } from '../core/actions.js';
import { rollDice } from '../domain/dice.js';
import { resolveDice, awardStartOfTurnTokyoVP, checkGameOver } from './resolutionService.js';
import { selectTokyoCityOccupant, selectTokyoBayOccupant } from '../core/selectors.js';
import { DICE_ANIM_MS, AI_POST_ANIM_DELAY_MS, CPU_TURN_START_MS, CPU_DECISION_DELAY_MS } from '../constants/uiTimings.js';

function computeDelay(settings) {
  const speed = settings?.cpuSpeed || 'normal';
  switch (speed) {
    case 'slow': return 800;
    case 'fast': return 150;
    default: return 400;
  }
}

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

function waitUnlessPaused(store, ms) {
  return new Promise(resolve => {
    const checkPause = () => {
      const state = store.getState();
      if (state.game?.isPaused) {
        // If paused, wait 100ms and check again
        setTimeout(checkPause, 100);
      } else {
        // Not paused, proceed with normal wait
        setTimeout(resolve, ms);
      }
    };
    checkPause();
  });
}

export function createTurnService(store, logger, rng = Math.random) {
  function startGameIfNeeded() {
    const st = store.getState();
    if (st.phase === 'SETUP') {
      store.dispatch(phaseChanged('ROLL'));
      startTurn();
    }
  }

  function startTurn() {
    // Start-of-turn bonuses (Tokyo VP if occupying City at turn start)
    awardStartOfTurnTokyoVP(store, logger);
    logger.system('Phase: ROLL', { kind: 'phase' });
    store.dispatch(phaseChanged('ROLL'));
    // If active player is CPU, run automated turn logic
    try {
      const st = store.getState();
      const order = st.players.order;
      if (order.length) {
        const activeId = order[st.meta.activePlayerIndex % order.length];
        const active = st.players.byId[activeId];
        const isCPU = !!(active && (active.isCPU || active.isAi || active.type === 'ai' || active.isAI));
        console.log(`🎯 Starting turn for ${active?.name} (${isCPU ? 'CPU' : 'Human'}) - Index: ${st.meta.activePlayerIndex}`);
        if (isCPU) {
          // Add delay at start of CPU turn for clarity AND to allow card movement
          console.log(`🤖 CPU turn will start in ${CPU_TURN_START_MS}ms...`);
          waitUnlessPaused(store, CPU_TURN_START_MS).then(() => {
            const currentState = store.getState();
            // Double-check we're still in the right state and not paused
            if (currentState.phase?.current === 'ROLL' && !currentState.game?.isPaused) {
              playCpuTurn(activeId);
            }
          });
        }
      }
    } catch(_) {}
  }

  async function performRoll() {
    // Dispatches DICE_ROLL_STARTED and then DICE_ROLLED with new faces
    const st = store.getState();
    const order = st.players.order;
    let activeId = null;
    let diceSlots = 6;
    if (order.length) {
      activeId = order[st.meta.activePlayerIndex % order.length];
      diceSlots = st.players.byId[activeId]?.modifiers?.diceSlots || 6;
    }
    console.log(`🎲 Starting dice roll for ${st.players.byId[activeId]?.name || 'unknown'}`);
    store.dispatch(diceRollStarted());
    const faces = rollDice({ currentFaces: st.dice.faces, count: diceSlots, rng });
    // Simulate AI pacing delay (human players later could bypass)
    const delay = computeDelay(store.getState().settings);
    if (delay) await wait(delay);
    store.dispatch(diceRolled(faces));
  }

  async function reroll() {
    const st = store.getState();
    if (st.dice.rerollsRemaining <= 0) return;
    store.dispatch(diceRerollUsed());
    await performRoll();
    const after = store.getState();
    if (after.dice.rerollsRemaining === 0) {
      // sequence complete will trigger resolve externally or via explicit call
    }
  }

  async function resolve() {
    logger.system('Phase: RESOLVE', { kind: 'phase' });
    store.dispatch(phaseChanged('RESOLVE'));
    resolveDice(store, logger);
    
    // End-of-turn Tokyo entry: if Tokyo is empty after dice resolution, active player must enter
    const postResolution = store.getState();
    const order = postResolution.players.order;
    const activeId = order[postResolution.meta.activePlayerIndex % order.length];
    const cityOcc = selectTokyoCityOccupant(postResolution);
    const bayOcc = selectTokyoBayOccupant(postResolution);
    const playerCount = order.length;
    const bayAllowed = playerCount >= 5;
    const active = postResolution.players.byId[activeId];
    
    // Rule: If no one is in Tokyo after dice resolution, current player must enter
    if (!cityOcc && !active?.inTokyo) {
      store.dispatch(playerEnteredTokyo(activeId));
      store.dispatch(tokyoOccupantSet(activeId, playerCount));
      logger.system(`${activeId} enters Tokyo City (end-of-turn mandatory)`, { kind:'tokyo', slot:'city' });
      store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
      store.dispatch(uiVPFlash(activeId, 1));
      logger.info(`${activeId} gains 1 VP for entering Tokyo`);
    } 
    // Rule: If Tokyo City is occupied but Bay is empty (5+ players), current player must enter Bay
    else if (bayAllowed && cityOcc && !bayOcc && !active?.inTokyo) {
      store.dispatch(playerEnteredTokyo(activeId));
      store.dispatch(tokyoOccupantSet(activeId, playerCount));
      logger.system(`${activeId} enters Tokyo Bay (end-of-turn mandatory)`, { kind:'tokyo', slot:'bay' });
      store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
      store.dispatch(uiVPFlash(activeId, 1));
      logger.info(`${activeId} gains 1 VP for entering Tokyo`);
    }
    
    const winner = checkGameOver(store, logger);
    if (winner) {
      logger.system('Phase: GAME_OVER', { kind: 'phase' });
      // Build some drama: wait 2s before transitioning to GAME_OVER
      await waitUnlessPaused(store, 2000);
      store.dispatch(phaseChanged('GAME_OVER'));
      return;
    }
    // New: BUY phase window for shop interactions
    logger.system('Phase: BUY', { kind: 'phase' });
    store.dispatch(phaseChanged('BUY'));
    // Provide a short pause for UI interactions; can be adjusted via settings later
    const delay = Math.min(1500, Math.max(400, computeDelay(store.getState().settings) * 3));
    await waitUnlessPaused(store, delay);
    // Proceed to CLEANUP
    logger.system('Phase: CLEANUP', { kind: 'phase' });
    store.dispatch(phaseChanged('CLEANUP'));
    await cleanup();
  }

  async function cleanup() {
    // Reset dice slice will happen automatically when new ROLL phase starts
    await endTurn();
  }

  async function endTurn() {
    // Pause briefly at the end of each player's turn to build drama
    // Longer pause for CPU turns to show completion clearly
    const state = store.getState();
    const order = state.players.order;
    const activeId = order[state.meta.activePlayerIndex % order.length];
    const active = state.players.byId[activeId];
    const isCPU = !!(active && (active.isCPU || active.isAi || active.type === 'ai' || active.isAI));
    const delay = isCPU ? 2000 : 1000; // 2s for CPU, 1s for human
    await waitUnlessPaused(store, delay);
    store.dispatch(nextTurn());
    // CRITICAL: Wait for card to move to active dock before starting next turn
    await waitUnlessPaused(store, 600); // Allow time for card animation to complete
    startTurn();
  }

  /**
   * CPU auto-turn: performs initial roll, applies AI keep heuristic (bound via aiDecisionService),
   * performs rerolls while there are unkept dice and rerolls remain, then resolves the dice.
   * Uses pacing based on settings.cpuSpeed.
   */
  async function playCpuTurn() {
    // Initial roll
    console.log('🤖 CPU Turn: Starting with initial roll');
    await performRoll();
    
    // Safety counter to prevent infinite rerolls (max 3 total rolls: initial + 2 rerolls)
    let rollsCompleted = 1;
    const MAX_TOTAL_ROLLS = 3;
    
    // Rerolls loop with proper limiting
    while (rollsCompleted < MAX_TOTAL_ROLLS) {
      const st = store.getState();
      const dice = st.dice;
      
      console.log(`🤖 CPU Turn: Roll ${rollsCompleted} - Rerolls remaining: ${dice.rerollsRemaining}, Phase: ${dice.phase}`);
      
      // Wait until dice animation + AI keep delay have passed before evaluating reroll
      if (dice.phase !== 'resolved') { 
        await waitUnlessPaused(store, 120); 
        // Add safety counter to prevent infinite loops
        let waitCount = 0;
        while (dice.phase !== 'resolved' && waitCount < 50) {
          await waitUnlessPaused(store, 100);
          waitCount++;
          const newState = store.getState();
          if (newState.dice.phase === 'resolved') break;
        }
        if (waitCount >= 50) {
          console.warn('🚨 CPU Turn: Dice phase stuck, forcing resolution');
          break;
        }
        continue; 
      }
      
      // Check if we should reroll
      const currentState = store.getState();
      const currentDice = currentState.dice;
      
      if (currentDice.rerollsRemaining <= 0) {
        console.log('🤖 CPU Turn: No rerolls remaining, ending roll phase');
        break;
      }
      
      // Small extra pacing to allow AI keep scheduling to fire (dice-tray anim + post-anim delay)
      await waitUnlessPaused(store, DICE_ANIM_MS + AI_POST_ANIM_DELAY_MS);
      
      const anyUnkept = (currentDice.faces || []).some(f => f && !f.kept);
      console.log(`🤖 CPU Turn: Unkept dice found: ${anyUnkept}`);
      
      // Only reroll if we have rerolls remaining AND there are unkept dice
      if (currentDice.rerollsRemaining > 0 && anyUnkept) {
        console.log(`🤖 CPU Turn: Performing reroll ${rollsCompleted + 1}`);
        await reroll();
        rollsCompleted++;
        continue;
      }
      
      console.log('🤖 CPU Turn: All dice kept or no rerolls left, ending roll phase');
      break;
    }
    
    if (rollsCompleted >= MAX_TOTAL_ROLLS) {
      console.warn('🚨 CPU Turn: Hit max roll limit, forcing resolution');
    }
    // Resolve outcomes and advance the game
    console.log('🤖 CPU Turn: Starting resolution phase');
    await resolve();
    console.log('🤖 CPU Turn: Resolution complete');
  }

  return { startGameIfNeeded, startTurn, performRoll, reroll, resolve, cleanup, endTurn, playCpuTurn };
}