/** ui/eventsToActions.js */
import { eventBus } from '../core/eventBus.js';
import { store } from '../bootstrap/index.js';
import { diceRollStarted, diceRolled, diceToggleKeep, diceRerollUsed, phaseChanged } from '../core/actions.js';
import { rollDice } from '../domain/dice.js';
import { uiPositionsReset } from '../core/actions.js';
import { createPositioningService } from '../services/positioningService.js';

// Move bridge logic here from dice-tray soon; keep idempotent handlers.

function handleRollRequested() {
  const diceState = store.getState().dice;
  const isFirstRoll = diceState.faces.length === 0 || diceState.phase === 'idle';
  store.dispatch(diceRollStarted());
  const faces = rollDice({ count: 6, currentFaces: diceState.faces });
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

eventBus.on('ui/dice/rollRequested', handleRollRequested);
eventBus.on('ui/dice/keptToggled', handleKeptToggled);

// Subscribe to store to detect dice sequence completion for phase advancement
store.subscribe(maybeAdvancePhase);

// Handle UI reset positions event (emitted by dev or future control)
eventBus.on('ui/positions/reset', () => {
  const ps = createPositioningService(store);
  ps.resetPositions();
});
