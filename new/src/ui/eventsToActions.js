/** ui/eventsToActions.js */
import { eventBus } from '../core/eventBus.js';
import { diceRollStarted, diceRolled, diceToggleKeep, diceRerollUsed, phaseChanged, uiPositionsReset } from '../core/actions.js';
import { rollDice } from '../domain/dice.js';
import { createPositioningService } from '../services/positioningService.js';

// Bind UI events to store actions after store is created to avoid circular imports
export function bindUIEventBridges(store) {
  function handleRollRequested() {
    const diceState = store.getState().dice;
    const isFirstRoll = diceState.faces.length === 0 || diceState.phase === 'idle';
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
      store.dispatch(diceRerollUsed());
    }
  }

  function handleKeptToggled({ index }) {
    store.dispatch(diceToggleKeep(index));
  }

  function maybeAdvancePhase() {
    const st = store.getState();
    if (st.phase === 'ROLL' && st.dice.phase === 'sequence-complete') {
      store.dispatch(phaseChanged('RESOLVE'));
    }
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
