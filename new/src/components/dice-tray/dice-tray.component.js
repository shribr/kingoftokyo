/** dice-tray.component.js */
import { eventBus } from '../../core/eventBus.js';
import { diceRollStarted, diceRolled, diceToggleKeep } from '../../core/actions.js';
import { rollDice } from '../../domain/dice.js';
import { selectActivePlayer } from '../../core/selectors.js';
import { store } from '../../bootstrap/index.js';
import { createPositioningService } from '../../services/positioningService.js';

export function build({ selector, emit }) {
  const root = document.createElement('div');
  root.className = selector.slice(1); // remove leading .
  root.innerHTML = `<div class="tray-header"><button data-action="roll">Roll</button><span class="tray-dice-count" data-dice-count></span></div><div class="dice" data-dice></div>`;
  // Track previous diceSlots to animate expansions
  root._prevDiceSlots = 6;

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
  const countEl = root.querySelector('[data-dice-count]');
  if (!diceContainer) return;
  const globalState = store.getState();
  const active = selectActivePlayer(globalState);
  const diceSlots = active?.modifiers?.diceSlots || 6;
  const faces = state.faces || [];
  // Build full list including placeholders for unrolled extra dice
  const rendered = [];
  for (let i = 0; i < diceSlots; i++) {
    const face = faces[i];
    if (face) {
      rendered.push(`<span class="die ${face.kept ? 'is-kept' : ''} ${i >= 6 ? 'extra-die' : ''}" data-die-index="${i}">${face.value}</span>`);
    } else {
      rendered.push(`<span class="die pending ${i >= 6 ? 'extra-die' : ''}" data-die-index="${i}">?</span>`);
    }
  }
  diceContainer.innerHTML = rendered.join('');
  // Detect expansion
  const prev = root._prevDiceSlots || 6;
  if (diceSlots > prev) {
    // Mark new dice indices with animation class
    for (let i = prev; i < diceSlots; i++) {
      const el = diceContainer.querySelector(`[data-die-index="${i}"]`);
      if (el) {
        el.classList.add('new-die');
        // Remove after animation completes
        setTimeout(() => el.classList.remove('new-die'), 1200);
      }
    }
    if (countEl) {
      countEl.classList.add('bump');
      setTimeout(() => countEl.classList.remove('bump'), 600);
    }
  }
  root._prevDiceSlots = diceSlots;
  if (countEl) {
    if (diceSlots > 6) {
      countEl.textContent = `${diceSlots} dice (+${diceSlots - 6})`;
    } else {
      countEl.textContent = `${diceSlots} dice`;
    }
  }
}

// Bridge events to actions (will later sit in eventsToActions.js; temporary here until that file exists)
eventBus.on('ui/dice/rollRequested', () => {
  store.dispatch(diceRollStarted());
  const st = store.getState();
  const active = selectActivePlayer(st);
  const diceSlots = active?.modifiers?.diceSlots || 6;
  const faces = rollDice({ count: diceSlots, currentFaces: st.dice.faces });
  store.dispatch(diceRolled(faces));
});

eventBus.on('ui/dice/keptToggled', ({ index }) => {
  store.dispatch(diceToggleKeep(index));
});
