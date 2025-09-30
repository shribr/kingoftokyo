/** player-cards-modal.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUIPlayerCards, selectPlayerById } from '../../core/selectors.js';
import { uiPlayerCardsClose } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' player-cards-modal hidden';
  root.innerHTML = `<div class="pcm-frame" data-frame>
    <div class="pcm-header" style="background:#f4f4f4;color:#000;border-bottom:1px solid #ccc;">
      <h2 data-player-name style="color:#000;margin:0;font-size:18px;letter-spacing:.5px;"></h2>
      <button data-action="close" class="k-btn k-btn--warning k-btn--small" aria-label="Close">×</button>
    </div>
    <div class="pcm-body" data-body style="background:#fff;color:#000;max-height:55vh;overflow:auto;padding:14px;"></div>
  </div>`;

  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) {
      store.dispatch(uiPlayerCardsClose());
    }
    // Clicking cards intentionally does nothing now (details already shown inline)
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
    body.innerHTML = `<div class="pcm-empty" style="text-align:center;padding:30px 10px;color:#333;font-size:13px;">You currently have no power cards.<br/><span style="opacity:.7;">Buy cards from the shop to gain special abilities.</span></div>`;
  } else {
    body.innerHTML = `<div class="pcm-cards-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">${player.cards.map(c => renderOwnedCard(c)).join('')}</div>`;
  }
}

function renderOwnedCard(card) {
  const rarity = getRarity(card);
  const isDarkEdition = card.darkEdition ? true : false;
  return `<article class="pcm-card-detail" data-card-id="${card.id}" data-rarity="${rarity}" ${isDarkEdition?'data-dark="1"':''} style="border:1px solid #ccc;border-radius:8px;background:#fafafa;color:#000;display:flex;flex-direction:column;gap:6px;padding:10px;box-shadow:0 2px 4px rgba(0,0,0,.07);">
    <header style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
      <h3 style="font-size:14px;margin:0;line-height:1.2;color:#000;">${card.name}${isDarkEdition?' ⚫':''}</h3>
      <span style="font-size:12px;font-weight:600;color:#111;background:#ffe27a;border:1px solid #d6b74f;padding:2px 6px;border-radius:4px;">${card.cost}⚡</span>
    </header>
    <div style="font-size:12px;line-height:1.3;white-space:pre-wrap;">${getCardDescription(card)}</div>
    <footer style="display:flex;justify-content:space-between;align-items:center;font-size:10px;opacity:.7;">
      <span>${card.type || 'keep'}</span>
      <span style="text-transform:uppercase;">${rarity}</span>
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
