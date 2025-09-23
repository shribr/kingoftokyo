/** services/turnService.js
 * Orchestrates turn lifecycle: start turn -> roll phase -> resolve -> buy (skipped) -> cleanup -> next turn.
 */
import { phaseChanged, nextTurn, diceRollStarted, diceRolled, diceRerollUsed } from '../core/actions.js';
import { rollDice } from '../domain/dice.js';
import { resolveDice, awardStartOfTurnTokyoVP, checkGameOver } from './resolutionService.js';

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
    store.dispatch(phaseChanged('ROLL'));
  }

  function performRoll() {
    store.dispatch(diceRollStarted());
    const st = store.getState();
    const order = st.players.order;
    let diceSlots = 6;
    if (order.length) {
      const activeId = order[st.meta.activePlayerIndex % order.length];
      diceSlots = st.players.byId[activeId]?.modifiers?.diceSlots || 6;
    }
    const faces = rollDice({ currentFaces: st.dice.faces, count: diceSlots, rng });
    store.dispatch(diceRolled(faces));
  }

  function reroll() {
    const st = store.getState();
    if (st.dice.rerollsRemaining <= 0) return;
    store.dispatch(diceRerollUsed());
    performRoll();
    const after = store.getState();
    if (after.dice.rerollsRemaining === 0) {
      // sequence complete will trigger resolve externally or via explicit call
    }
  }

  function resolve() {
    store.dispatch(phaseChanged('RESOLVE'));
    resolveDice(store, logger);
    const winner = checkGameOver(store, logger);
    if (winner) {
      store.dispatch(phaseChanged('GAME_OVER'));
      return;
    }
    // Skip BUY for now – proceed to CLEANUP
    store.dispatch(phaseChanged('CLEANUP'));
    cleanup();
  }

  function cleanup() {
    // Reset dice slice will happen automatically when new ROLL phase starts
    endTurn();
  }

  function endTurn() {
    store.dispatch(nextTurn());
    startTurn();
  }

  return { startGameIfNeeded, startTurn, performRoll, reroll, resolve, cleanup, endTurn };
}