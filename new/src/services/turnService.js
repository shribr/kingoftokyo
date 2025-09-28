/** services/turnService.js
 * Turn orchestration for both human and CPU players.
 * Lifecycle:
 *   startTurn() -> phase ROLL
 *     - Human: UI drives roll/reroll/keep and clicks End Turn to resolve
 *     - CPU: this service auto-plays the entire turn (roll -> rerolls -> resolve)
 *   resolve() -> applies dice effects, checks win, then enters BUY -> CLEANUP -> next turn
 */
import { phaseChanged, nextTurn, diceRollStarted, diceRolled, diceRerollUsed } from '../core/actions.js';
import { rollDice } from '../domain/dice.js';
import { resolveDice, awardStartOfTurnTokyoVP, checkGameOver } from './resolutionService.js';
import { DICE_ANIM_MS, AI_POST_ANIM_DELAY_MS } from '../constants/uiTimings.js';

function computeDelay(settings) {
  const speed = settings?.cpuSpeed || 'normal';
  switch (speed) {
    case 'slow': return 800;
    case 'fast': return 150;
    default: return 400;
  }
}

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

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
        if (isCPU) {
          // Fire and forget; it will resolve the turn then advance
          playCpuTurn().catch(e => logger.warn('CPU turn error', e));
        }
      }
    } catch(_) {}
  }

  async function performRoll() {
    // Dispatches DICE_ROLL_STARTED and then DICE_ROLLED with new faces
    store.dispatch(diceRollStarted());
    const st = store.getState();
    const order = st.players.order;
    let diceSlots = 6;
    if (order.length) {
      const activeId = order[st.meta.activePlayerIndex % order.length];
      diceSlots = st.players.byId[activeId]?.modifiers?.diceSlots || 6;
    }
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
    const winner = checkGameOver(store, logger);
    if (winner) {
      logger.system('Phase: GAME_OVER', { kind: 'phase' });
      // Build some drama: wait 2s before transitioning to GAME_OVER
      await wait(2000);
      store.dispatch(phaseChanged('GAME_OVER'));
      return;
    }
    // New: BUY phase window for shop interactions
    logger.system('Phase: BUY', { kind: 'phase' });
    store.dispatch(phaseChanged('BUY'));
    // Provide a short pause for UI interactions; can be adjusted via settings later
    const delay = Math.min(1500, Math.max(400, computeDelay(store.getState().settings) * 3));
    await wait(delay);
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
    await wait(1000);
    store.dispatch(nextTurn());
    startTurn();
  }

  /**
   * CPU auto-turn: performs initial roll, applies AI keep heuristic (bound via aiDecisionService),
   * performs rerolls while there are unkept dice and rerolls remain, then resolves the dice.
   * Uses pacing based on settings.cpuSpeed.
   */
  async function playCpuTurn() {
    // Initial roll
    await performRoll();
    // Rerolls loop
    let guard = 0;
    while (guard++ < 3) { // hard cap safety
      const st = store.getState();
      const dice = st.dice;
      // Wait until dice animation + AI keep delay have passed before evaluating reroll
      if (dice.phase !== 'resolved') { await wait(120); continue; }
  // Small extra pacing to allow AI keep scheduling to fire (dice-tray anim + post-anim delay)
  await wait(DICE_ANIM_MS + AI_POST_ANIM_DELAY_MS);
      const anyUnkept = (dice.faces || []).some(f => f && !f.kept);
      if (dice.rerollsRemaining > 0 && anyUnkept) {
        await reroll();
        continue;
      }
      break;
    }
    // Resolve outcomes and advance the game
    await resolve();
  }

  return { startGameIfNeeded, startTurn, performRoll, reroll, resolve, cleanup, endTurn, playCpuTurn };
}