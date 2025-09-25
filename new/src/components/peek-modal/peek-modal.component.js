/** peek-modal.component.js
 * Displays the top deck card temporarily when a player uses a peek ability.
 */
import { store } from '../../bootstrap/index.js';
import { selectUIPeek, selectActivePlayer } from '../../core/selectors.js';
import { uiPeekHide } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' peek-modal hidden';
  root.innerHTML = `<div class="peek-frame" data-frame>
    <div class="peek-header">NEXT CARD</div>
    <div class="peek-name" data-name></div>
    <div class="peek-text" data-text></div>
  <div class="peek-actions"><button data-action="close" class="k-btn k-btn--secondary k-btn--small">CLOSE</button></div>
  </div>`;
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) {
      store.dispatch(uiPeekHide());
    }
  });
  return { root, update: () => update(root) };
}

export function update(root) {
  const state = store.getState();
  const peek = selectUIPeek(state);
  if (!peek.card) {
    root.classList.add('hidden');
    return;
  }
  root.classList.remove('hidden');
  const card = peek.card;
  root.querySelector('[data-name]').textContent = card.name;
  root.querySelector('[data-text]').textContent = formatCardText(card.effect || card.text || card.description || '');
}

function formatCardText(effect) {
  if (!effect) return '';
  if (effect.kind && typeof effect === 'object') {
    switch(effect.kind) {
      case 'vp_gain': return `Gain ${effect.value}★`;
      case 'energy_gain': return `Gain ${effect.value}⚡`;
      case 'heal_all': return `All monsters heal ${effect.value}`;
      case 'dice_slot': return `+${effect.value} Die Slot`;
      case 'reroll_bonus': return `+${effect.value} Reroll`;
      case 'peek': return `Peek ability (no immediate effect)`;
      default: return effect.kind;
    }
  }
  return String(effect);
}
