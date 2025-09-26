/** power-cards-panel.component.js
 * Clone of monsters panel for baseline collapse/expand behavior.
 * Will later be specialized for Power Cards (shop display etc.).
 */
import { initSidePanel } from '../side-panel/side-panel.js';
import { store } from '../../bootstrap/index.js';
import { purchaseCard, flushShop, refillShop } from '../../services/cardsService.js';
import { selectActivePlayer } from '../../core/selectors.js';
import { logger } from '../../bootstrap/index.js';

export function build({ selector, initialState }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-power-cards-panel cmp-side-panel k-panel';
  root.setAttribute('data-side','left');
  root.setAttribute('data-panel','power-cards');
  root.innerHTML = panelTemplate();
  initSidePanel(root, {
    side:'left',
    // Updated mapping per request:
    // Expanded: ◄ (arrow points toward off-screen collapse direction)
    // Collapsed: ► (arrow points into viewport inviting expand)
    expandedArrow:'◄',
    collapsedArrow:'►',
    bodyClassExpanded:'panels-expanded-left'
  });
  return { root, update: () => update(root) };
}

function panelTemplate() {
  return `
  <div class="mp-header k-panel__header" data-toggle role="button" aria-expanded="true" tabindex="0">
    <h2 class="mp-title" data-toggle><span class="mp-arrow" data-arrow-dir data-toggle>◄</span><span class="mp-label" data-title-text>Power Cards</span></h2>
  </div>
  <div class="mp-body k-panel__body" data-panel-body>
    <div class="pc-shop" data-shop-root>
      <div class="pc-shop-cards" data-shop-cards></div>
      <div class="pc-shop-actions">
        <button class="k-btn k-btn--sm k-btn--secondary" data-flush disabled>FLUSH (2⚡)</button>
      </div>
      <div class="pc-hint" data-hint></div>
    </div>
  </div>`;
}
function renderEffectSummary(card) {
  if (card.description) return card.description;
  switch(card.effect?.kind) {
    case 'vp_gain': return `Gain ${card.effect.value} VP`;
    case 'energy_gain': return `Gain ${card.effect.value}⚡`;
    case 'dice_slot': return `+${card.effect.value} die slot`;
    case 'reroll_bonus': return `+${card.effect.value} reroll`;
    case 'heal_all': return `All monsters heal ${card.effect.value}`;
    case 'heal_self': return `Heal ${card.effect.value}`;
    case 'energy_steal': return `Steal ${card.effect.value}⚡`;
    case 'vp_steal': return `Steal ${card.effect.value} VP`;
    case 'damage_all': return `Deal ${card.effect.value} damage to all`;
    case 'damage_tokyo_only': return `Deal ${card.effect.value} to monsters in Tokyo`;
    case 'damage_select': return `Deal ${card.effect.value} to up to ${card.effect.maxTargets}`;
    case 'peek': return `You may pay 1⚡ to peek at the top card.`;
    default: return 'Special effect';
  }
}

function cardRarity(card) {
  if (card.cost >= 7) return 'epic';
  if (card.cost >= 5) return 'rare';
  return 'common';
}

function renderShop(root) {
  const state = store.getState();
  const cards = state.cards.shop;
  const active = selectActivePlayer(state);
  const energy = active?.energy ?? 0;
  const container = root.querySelector('[data-shop-cards]');
  // Ensure deck placeholder exists (represents remaining draw pile) as card-sized element
  let deckEl = root.querySelector('[data-deck-stack]');
  if (!deckEl) {
    deckEl = document.createElement('div');
    deckEl.className = 'pc-deck-stack';
    deckEl.setAttribute('data-deck-stack','');
    deckEl.innerHTML = `
      <div class="pc-card pc-card--deck" data-deck-card>
        <div class="pc-card__header pc-card__header--deck"><span class="pc-card__name">DECK</span></div>
        <div class="pc-card__body pc-card__body--deck" aria-hidden="true"></div>
      </div>`;
    container?.parentElement?.insertBefore(deckEl, container.nextSibling);
  }
  const flushBtn = root.querySelector('[data-flush]');
  const hint = root.querySelector('[data-hint]');
  if (!container) return;
  container.innerHTML = cards.map(c => `
    <div class="pc-card" data-card-id="${c.id}" data-rarity="${cardRarity(c)}" data-enter>
      <div class="pc-card__header"><span class="pc-card__name">${c.name}</span><span class="pc-card__cost">${c.cost}⚡</span></div>
      <div class="pc-card__body">${renderEffectSummary(c)}</div>
      <div class="pc-card__footer"><button class="k-btn k-btn--xs k-btn--secondary" data-buy data-card-id="${c.id}" ${energy < c.cost ? 'disabled' : ''}>BUY</button></div>
    </div>
  `).join('');
  if (flushBtn) flushBtn.disabled = energy < 2;
  if (hint) hint.textContent = active ? `Active: ${active.name} (${energy}⚡)` : 'NO ACTIVE PLAYER';
  // Refill button removed
  if (deckEl) {
    const remaining = state.cards.deck.length; // unused display; kept for potential future tooltip only
    const canPeek = !!active && active.cards?.some(c => c.effect?.kind === 'peek');
    deckEl.classList.toggle('is-empty', remaining === 0);
    deckEl.classList.toggle('can-peek', canPeek && remaining > 0);
    deckEl.title = canPeek ? (remaining ? 'Click to Peek (cost 1⚡)' : 'Deck empty') : (remaining ? `${remaining} card(s) remaining` : 'Deck empty');
  }
}

export function update(root){
  renderShop(root);
}

// Event delegation for buy / flush / refill
document.addEventListener('click', (e) => {
  const panel = e.target.closest('.cmp-power-cards-panel');
  if (!panel) return;
  // Deck peek click
  if (e.target.closest('[data-deck-card]')) {
    const st = store.getState();
    const active = selectActivePlayer(st);
    if (active && active.cards?.some(c => c.effect?.kind === 'peek')) {
      // Attempt peek (effect engine will validate cost)
      try {
        import('../../services/cardsService.js').then(m => {
          const ok = m.peekTopCard(store, logger, active.id, 1);
          if (!ok) {
            // Flash denial animation
            const dc = panel.querySelector('[data-deck-card]');
            if (dc) { dc.classList.add('peek-denied'); setTimeout(()=>dc.classList.remove('peek-denied'), 600); }
          } else {
            const dc = panel.querySelector('[data-deck-card]');
            if (dc) { dc.classList.add('peek-flip'); setTimeout(()=>dc.classList.remove('peek-flip'), 900); }
          }
        });
      } catch(_) {}
    }
  }
  const buyBtn = e.target.closest('[data-buy]');
  if (buyBtn) {
    const id = buyBtn.getAttribute('data-card-id');
    const st = store.getState();
    const active = selectActivePlayer(st);
    if (active) {
      purchaseCard(store, logger, active.id, id);
      renderShop(panel);
    }
  }
  if (e.target.matches('[data-flush]')) {
    const st = store.getState();
    const active = selectActivePlayer(st);
    if (active) {
      flushShop(store, logger, active.id, 2);
      renderShop(panel);
    }
  }
  // Refill removed
});
