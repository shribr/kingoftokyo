/** services/turnService.js
 * Orchestrates turn lifecycle: start turn -> roll phase -> resolve -> buy (skipped) -> cleanup -> next turn.
 */
import { phaseChanged, nextTurn, diceRollStarted, diceRolled, diceRerollUsed } from '../core/actions.js';
import { rollDice } from '../domain/dice.js';
import { resolveDice, awardStartOfTurnTokyoVP, checkGameOver } from './resolutionService.js';

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
    awardStartOfTurnTokyoVP(store, logger);
    logger.system('Phase: ROLL', { kind: 'phase' });
    store.dispatch(phaseChanged('ROLL'));
  }

  async function performRoll() {
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

  return { startGameIfNeeded, startTurn, performRoll, reroll, resolve, cleanup, endTurn };
}