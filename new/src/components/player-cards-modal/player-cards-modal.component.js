/** player-cards-modal.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUIPlayerCards, selectPlayerById } from '../../core/selectors.js';
import { uiPlayerCardsClose, uiCardDetailOpen } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' player-cards-modal hidden';
  root.innerHTML = `<div class="pcm-frame" data-frame>
    <div class="pcm-header">
      <h2 data-player-name></h2>
      <button data-action="close" class="btn danger circle">×</button>
    </div>
    <div class="pcm-body" data-body></div>
  </div>`;

  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) {
      store.dispatch(uiPlayerCardsClose());
    }
    const cardEl = e.target.closest('[data-card-id]');
    if (cardEl) {
      store.dispatch(uiCardDetailOpen(cardEl.getAttribute('data-card-id'), 'owned'));
    }
  });

  return { root, update: () => update(root), destroy: () => root.remove() };
}

export function update(root) {
  const state = store.getState();
  const ui = selectUIPlayerCards(state);
  if (!ui.playerId) {
    root.classList.add('hidden');
    return;
  }
  const player = selectPlayerById(state, ui.playerId);
  if (!player) {
    root.classList.add('hidden');
    return;
  }
  root.classList.remove('hidden');
  root.querySelector('[data-player-name]').textContent = `${player.name}'s Power Cards`.toUpperCase();
  const body = root.querySelector('[data-body]');
  if (!player.cards.length) {
    body.innerHTML = `<div class="pcm-empty">NO ACTIVE POWER CARDS</div>`;
  } else {
    body.innerHTML = `<ul class="pcm-card-list">${player.cards.map(c => `<li class="pcm-card" data-card-id="${c.id}"><span class="pcm-card-name">${c.name}</span></li>`).join('')}</ul>`;
  }
}
