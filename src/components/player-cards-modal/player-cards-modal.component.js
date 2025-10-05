/** player-power-cards-modal.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUIPlayerPowerCards, selectPlayerById } from '../../core/selectors.js';
import { uiPlayerPowerCardsClose } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' player-power-cards-modal hidden';
  root.innerHTML = `<div class="ppcm-frame" data-frame>
    <div class="ppcm-header">
      <h2 data-player-name></h2>
      <button data-action="close" aria-label="Close">×</button>
    </div>
    <div class="ppcm-body" data-body></div>
  </div>`;

  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) {
      store.dispatch(uiPlayerPowerCardsClose());
    }
    // Clicking cards intentionally does nothing now (details already shown inline)
  });

  return { root, update: () => update(root), destroy: () => root.remove() };
}

export function update(root) {
  const state = store.getState();
  const ui = selectUIPlayerPowerCards(state);
  if (!ui || !ui.playerId) {
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
    body.innerHTML = `<div class="ppcm-empty">You currently have no power cards.<br/><span>Buy cards from the shop to gain special abilities.</span></div>`;
  } else {
    body.innerHTML = `<div class="ppcm-cards-grid">${player.cards.map(c => renderOwnedCard(c)).join('')}</div>`;
  }
}

function renderOwnedCard(card) {
  const rarity = getRarity(card);
  const isDarkEdition = card.darkEdition ? true : false;
  return `<article class="ppcm-card-detail" data-card-id="${card.id}" data-rarity="${rarity}" ${isDarkEdition?'data-dark="1"':''}>
    <header class="ppcm-card-header">
      <h3>${card.name}${isDarkEdition?' ⚫':''}</h3>
      <span class="ppcm-card-cost">${card.cost}⚡</span>
    </header>
    <div class="ppcm-card-description">${getCardDescription(card)}</div>
    <footer class="ppcm-card-footer">
      <span>${card.type || 'keep'}</span>
      <span class="ppcm-card-rarity">${rarity}</span>
    </footer>
  </article>`;
}

function getRarity(card) {
  const cost = card.cost || 0;
  if (cost >= 7) return 'epic';
  if (cost >= 5) return 'rare';
  return 'common';
}

function getCardDescription(card) {
  if (card.description) return card.description;
  const effect = card.effect;
  if (!effect) return 'Special power card';
  switch(effect.kind) {
    case 'vp_gain': return `Gain ${effect.value} Victory Points`;
    case 'energy_gain': return `Gain ${effect.value} Energy`;
    case 'dice_slot': return `Add ${effect.value} extra die`;
    case 'reroll_bonus': return `+${effect.value} reroll per turn`;
    case 'heal_all': return `All monsters heal ${effect.value} damage`;
    case 'heal_self': return `Heal ${effect.value} damage`;
    case 'energy_steal': return `Steal ${effect.value} energy from all players`;
    case 'vp_steal': return `Steal ${effect.value} VP from all players`;
    case 'damage_all': return `Deal ${effect.value} damage to all monsters`;
    case 'damage_tokyo_only': return `Deal ${effect.value} damage to monsters in Tokyo`;
    default: return 'Special effect';
  }
}
