/** ui/eventsToActions.js */
import { eventBus } from '../core/eventBus.js';
import { diceRollStarted, diceRolled, diceToggleKeep, diceRerollUsed, diceRollCompleted, phaseChanged, uiPositionsReset } from '../core/actions.js';
import { uiPlayerCardsOpen } from '../core/actions.js';
import { selectActivePlayerId } from '../core/selectors.js';
import { rollDice } from '../domain/dice.js';
import { computeMaxRolls } from '../utils/rolls.js';
import { createPositioningService } from '../services/positioningService.js';

// Bind UI events to store actions after store is created to avoid circular imports
export function bindUIEventBridges(store) {
  function handleRollRequested() {
    // Minimal guard: ensure blackout not blocking UI
    try { window.__KOT_BLACKOUT__?.hide(); document.querySelector('.post-splash-blackout')?.remove(); } catch(_) {}
    const stAll = store.getState();
    // Only allow rolling during the ROLL phase
    if (stAll.phase !== 'ROLL') return;
    const diceState = stAll.dice;
    const isFirstRoll = diceState.faces.length === 0 || diceState.phase === 'idle';
    // Dynamic enforcement: rely on reducer-maintained rerollsRemaining + base/bonus computation
    if (!isFirstRoll) {
      if (!(diceState.phase === 'resolved' && diceState.rerollsRemaining > 0)) return;
    }
    // Optional diagnostic (dev only): verify we have not exceeded theoretical max
    try {
      if (process.env.NODE_ENV !== 'production') {
        const stCheck = store.getState();
        const activeId = stCheck.players.order[stCheck.meta.activePlayerIndex % stCheck.players.order.length];
        const max = computeMaxRolls(stCheck, activeId);
        const facesEmpty = diceState.faces.length === 0;
        // rollsUsed = initial (if faces exist) plus (baseRerolls - rerollsRemaining)
        if (!facesEmpty) {
          const baseRerolls = diceState.baseRerolls ?? 2;
          const used = baseRerolls + (stCheck.players.byId[activeId]?.modifiers?.rerollBonus || 0) - diceState.rerollsRemaining + 1;
          if (used > max) {
            console.warn('[rolls] exceeded computed max rolls', { used, max });
          }
        }
      }
    } catch(_) {}
  store.dispatch(diceRollStarted());
    // Determine dice count from active player's modifiers if available
    let count = 6;
    try {
      const st = store.getState();
      const order = st.players.order;
      if (order.length) {
        const activeId = order[st.meta.activePlayerIndex % order.length];
        count = st.players.byId[activeId]?.modifiers?.diceSlots || 6;
      }
    } catch(_){}
    const faces = rollDice({ count, currentFaces: diceState.faces });
    store.dispatch(diceRolled(faces));
    if (!isFirstRoll) {
      // Mark reroll usage (legacy no-op for state) then complete to decrement once faces are resolved
      store.dispatch(diceRerollUsed());
      store.dispatch(diceRollCompleted());
    }
  }

  function handleKeptToggled({ index }) {
    store.dispatch(diceToggleKeep(index));
  }

  function maybeAdvancePhase() {
    const st = store.getState();
    // Do not auto-resolve; End Turn triggers full resolution. We still expose sequence-complete via dice slice for UI gating.
  }

  // Wire events
  eventBus.on('ui/dice/rollRequested', handleRollRequested);
  eventBus.on('ui/dice/keptToggled', handleKeptToggled);
  // Open player cards modal (mini owned-cards view)
  eventBus.on('ui/modal/showPlayerCards', () => {
    try {
      const st = store.getState();
      const activeId = selectActivePlayerId(st);
      if (activeId) {
        store.dispatch(uiPlayerCardsOpen(activeId));
      }
    } catch(_) {}
  });
  // Subscribe to store to detect dice sequence completion for phase advancement
  store.subscribe(maybeAdvancePhase);
  // Position reset is now handled directly by positioningService
}
