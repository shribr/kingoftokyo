/** dice-tray.component.js */
import { eventBus } from '../../core/eventBus.js';
import { diceRollStarted, diceRolled, diceToggleKeep } from '../../core/actions.js';
import { rollDice } from '../../domain/dice.js';
import { store } from '../../bootstrap/index.js';
import { createPositioningService } from '../../services/positioningService.js';

export function build({ selector, emit }) {
  const root = document.createElement('div');
  root.className = selector.slice(1); // remove leading .
  root.innerHTML = `<div class="tray-header"><button data-action="roll">Roll</button></div><div class="dice" data-dice></div>`;

  // Make draggable & persistent
  const positioning = createPositioningService(store);
  positioning.hydrate(); // ensure positions loaded (idempotent)
  positioning.makeDraggable(root, 'diceTray');

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="roll"]');
    if (btn) {
      emit('ui/dice/rollRequested', {});
      return;
    }
    const dieEl = e.target.closest('[data-die-index]');
    if (dieEl) {
      const idx = Number(dieEl.getAttribute('data-die-index'));
      emit('ui/dice/keptToggled', { index: idx });
    }
  });

  return { root, update: (props) => update(root, props), destroy: () => root.remove() };
}

export function update(root, { state }) {
  const diceContainer = root.querySelector('[data-dice]');
  if (!diceContainer) return;
  const faces = state.faces || [];
  diceContainer.innerHTML = faces.map((f,i) => `<span class="die ${f.kept ? 'is-kept' : ''}" data-die-index="${i}">${f.value}</span>`).join('');
}

// Bridge events to actions (will later sit in eventsToActions.js; temporary here until that file exists)
eventBus.on('ui/dice/rollRequested', () => {
  store.dispatch(diceRollStarted());
  const faces = rollDice({ count: 6, currentFaces: store.getState().dice.faces });
  store.dispatch(diceRolled(faces));
});

eventBus.on('ui/dice/keptToggled', ({ index }) => {
  store.dispatch(diceToggleKeep(index));
});
