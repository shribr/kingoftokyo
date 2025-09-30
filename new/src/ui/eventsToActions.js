/** ui/eventsToActions.js */
import { eventBus } from '../core/eventBus.js';
import { diceRollStarted, diceRolled, diceToggleKeep, diceRerollUsed, diceRollCompleted, phaseChanged, uiPositionsReset } from '../core/actions.js';
import { rollDice } from '../domain/dice.js';
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
    // Enforce total of 3 rolls (first + 2 rerolls)
    if (!isFirstRoll) {
      // Only allow reroll when we are in resolved state and have rerolls remaining
      if (!(diceState.phase === 'resolved' && diceState.rerollsRemaining > 0)) return;
    }
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
  // Subscribe to store to detect dice sequence completion for phase advancement
  store.subscribe(maybeAdvancePhase);
  // Handle UI reset positions event (emitted by dev or future control)
  eventBus.on('ui/positions/reset', () => {
    const ps = createPositioningService(store);
    ps.resetPositions();
  });
}
