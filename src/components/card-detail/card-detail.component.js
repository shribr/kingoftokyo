/** card-detail.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUICardDetail, selectShopCards, selectActivePlayer, selectCardsState } from '../../core/selectors.js';
import { uiCardDetailClose } from '../../core/actions.js';
import { getCardInsight } from '../../utils/card-insights.js';
import { purchaseCard } from '../../services/cardsService.js';
import { logger } from '../../bootstrap/index.js';
import { generatePowerCard } from '../power-cards/power-card-generator.js';

export function build({ selector, emit }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' card-detail-modal hidden';
  root.setAttribute('role','dialog');
  root.setAttribute('aria-modal','true');
  root.setAttribute('aria-hidden','true');
  root.setAttribute('aria-labelledby','card-detail-title');
  root.innerHTML = `<div class="card-detail-frame" data-frame>
      <div class="cd-header">
        <h2 class="cd-title" id="card-detail-title" data-name></h2>
        <div class="cd-cost-badge" data-cost></div>
        <button class="cd-close" data-action="close" aria-label="Close card details">✕</button>
      </div>
  <div class="cd-card-wrapper cmp-power-cards-panel" data-card-wrapper></div>
      <div class="cd-body">
        <div class="cd-section cd-strategy" data-strategy-wrapper>
          <h3 class="cd-section-title">STRATEGY</h3>
          <div class="cd-strategy-text" data-strategy></div>
        </div>
        <div class="cd-section cd-synergies" data-synergies-wrapper>
          <h3 class="cd-section-title">SYNERGIES</h3>
          <div class="cd-synergies" data-synergies></div>
        </div>
        <div class="cd-combos" data-combos>
          <!-- Combos header now outside dynamic text suggestions -->
          <div class="cd-combos-header" data-combos-header><h3 class="cd-section-title">💡 COMBO TIPS</h3></div>
          <div class="cd-combos-body" data-combos-body></div>
        </div>
        <div class="cd-section cd-examples" data-examples-wrapper>
          <h3 class="cd-section-title">EXAMPLES</h3>
          <div class="cd-examples" data-examples></div>
        </div>
      </div>
      <div class="cd-actions" data-actions></div>
    </div>`;

  root.addEventListener('click', (e) => {
    // Close modal if clicking outside the frame (backdrop)
    if (e.target === root) {
      store.dispatch(uiCardDetailClose());
      return;
    }
    
    if (e.target.matches('[data-action="close"]')) {
      store.dispatch(uiCardDetailClose());
    } else if (e.target.matches('[data-action="purchase"]')) {
      const detail = selectUICardDetail(store.getState());
      const active = selectActivePlayer(store.getState());
      if (!detail.cardId || !active) return;
      purchaseCard(store, logger, active.id, detail.cardId);
      // If purchase succeeded, the shop no longer has it; we can leave open showing owned state.
      // Re-render will adjust buttons.
    }
  });

  // ESC key support when modal is open
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      const detail = selectUICardDetail(store.getState());
      if (detail.cardId) store.dispatch(uiCardDetailClose());
    }
  });

  return { root, update: (props) => update(root, props), destroy: () => root.remove() };
}

export function update(root) {
  const state = store.getState();
  const detail = selectUICardDetail(state);
  if (!detail.cardId) {
    root.classList.add('hidden');
    root.setAttribute('aria-hidden','true');
    return;
  }
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden','false');
  const shopCards = selectShopCards(state);
  const active = selectActivePlayer(state);
  const allDeckCards = [...shopCards, ...state.cards.discard, ...state.cards.deck];
  const candidate = shopCards.find(c => c.id === detail.cardId) || active?.cards.find(c => c.id === detail.cardId) || allDeckCards.find(c => c.id === detail.cardId);
  if (!candidate) {
    // Card disappeared (edge case) close.
    store.dispatch(uiCardDetailClose());
    return;
  }
  root.querySelector('[data-name]').textContent = candidate.name;
  
  // Update cost badge
  const costBadge = root.querySelector('[data-cost]');
  if (costBadge) {
    costBadge.textContent = `${candidate.cost || 0}⚡`;
  }

  // Regenerate power card using shared generator (defensive: only if card changed)
  const cardWrapper = root.querySelector('[data-card-wrapper]');
  if (cardWrapper && cardWrapper.getAttribute('data-card-id') !== candidate.id) {
    try {
      cardWrapper.innerHTML = generatePowerCard(candidate, { playerEnergy: active ? active.energy : 0, showBuy: false, showFooter: true, infoButton: false });
      cardWrapper.setAttribute('data-card-id', candidate.id);
    } catch (e) {
      logger?.warn?.('card-detail: failed to generate power card', e);
      cardWrapper.innerHTML = '<div class="cd-card-blank" aria-label="Card could not render"></div>';
      cardWrapper.removeAttribute('data-card-id');
    }
  }

  const insight = getCardInsight(candidate);

  // Strategy
  const stratWrapper = root.querySelector('[data-strategy-wrapper]');
  const stratEl = root.querySelector('[data-strategy]');
  if (insight.strategy) {
    stratWrapper.classList.remove('hidden');
    stratEl.textContent = insight.strategy;
  } else {
    stratWrapper.classList.add('hidden');
    stratEl.textContent = '';
  }

  // Synergies
  const synWrapper = root.querySelector('[data-synergies-wrapper]');
  const synEl = root.querySelector('[data-synergies]');
  if (insight.synergies && insight.synergies.length) {
    synWrapper.classList.remove('hidden');
    synEl.innerHTML = insight.synergies.map(s => `<div class="cd-synergy"><strong>${candidate.name}</strong> + <em>${cardNameFromId(s.with, state)}</em>: ${s.reason}</div>`).join('');
  } else {
    synWrapper.classList.add('hidden');
    synEl.innerHTML = '';
  }

  // Examples
  const exWrapper = root.querySelector('[data-examples-wrapper]');
  const exEl = root.querySelector('[data-examples]');
  if (insight.examples && insight.examples.length) {
    exWrapper.classList.remove('hidden');
    exEl.innerHTML = '<ul>' + insight.examples.map(ex => `<li>${ex}</li>`).join('') + '</ul>';
  } else {
    exWrapper.classList.add('hidden');
    exEl.innerHTML = '';
  }

  // Combos
  // Render combo suggestions (header is static; body is dynamic)
  renderCombos(root, candidate, state);
  const actionsEl = root.querySelector('[data-actions]');
  actionsEl.innerHTML = renderActions(candidate, detail, active, shopCards);
}

function cardNameFromId(id, state) {
  if (!id) return 'Unknown';
  const set = [...state.cards.deck, ...state.cards.discard, ...(state.cards.shop||[])];
  const found = set.find(c => c.id === id);
  return found ? found.name : id;
}

function renderActions(card, detail, active, shopCards) {
  const phase = store.getState().phase;
  const inShop = !!shopCards.find(c => c.id === card.id) && detail.source === 'shop';
  const canPurchase = inShop && phase === 'RESOLVE' && active && active.energy >= card.cost;
  const insufficient = inShop && phase === 'RESOLVE' && active && active.energy < card.cost;
  if (!inShop) return '';
  if (canPurchase) {
    return `<button data-action="purchase" class="k-btn k-btn--primary">BUY ⚡${card.cost}</button>`;
  }
  if (insufficient) {
    const diff = card.cost - active.energy;
    return `<button class="k-btn" disabled>NEED ${diff}⚡</button>`;
  }
  // If not RESOLVE phase, suppress button entirely (no RESOLVE DICE FIRST message per new spec)
  return '';
}

function formatCardText(txt) {
  return txt
    .replace(/VP/gi, '★')
    .replace(/victory points?/gi, '★')
    .replace(/energy/gi, '⚡');
}

function renderCombos(root, card, state) {
  try {
    const body = root.querySelector('[data-combos-body]');
    if (!body) return;
    const combos = findCardCombos(card, state);
    if (combos.length === 0) {
      body.innerHTML = '<p class="cd-combos-empty">No obvious combos found with available cards.</p>';
      return;
    }
    const comboHtml = combos.map(combo => `
      <div class="combo-suggestion">
        <div class="combo-cards">
          <span class="combo-primary">${card.name}</span>
          <span class="combo-connector">+</span>
          <span class="combo-secondary">${combo.card.name}</span>
        </div>
        <div class="combo-description">${combo.reason}</div>
      </div>`).join('');
    body.innerHTML = comboHtml;
  } catch(_) {}
}

function findCardCombos(targetCard, state) {
  const combos = [];
  const allCards = [...state.cards.deck, ...state.cards.discard];
  const shopCards = state.cards?.shop || [];
  const availableCards = [...allCards, ...shopCards];
  
  // Load combo patterns from components.config.json (entry with name cardCombosConfig)
  let comboPatterns = [];
  try {
    const cfg = (window && window.componentsConfig) ? window.componentsConfig : [];
    const dataEntry = Array.isArray(cfg) ? cfg.find(c => c.name === 'cardCombosConfig') : null;
    if (dataEntry && Array.isArray(dataEntry.comboPatterns)) {
      comboPatterns = dataEntry.comboPatterns;
    }
  } catch (e) {
    // silent fallback
  }
  if (!comboPatterns.length) return [];
  
  // Check if targetCard matches any combo pattern
  for (const pattern of comboPatterns) {
    const isPrimary = pattern.primary.includes(targetCard.id);
    const isSecondary = pattern.secondary.includes(targetCard.id);
    
    if (isPrimary) {
      // Look for secondary cards in available cards
      for (const secondaryId of pattern.secondary) {
        const secondaryCard = availableCards.find(c => c.id === secondaryId);
        if (secondaryCard) {
          combos.push({
            card: secondaryCard,
            reason: pattern.reason
          });
        }
      }
    } else if (isSecondary) {
      // Look for primary cards in available cards
      for (const primaryId of pattern.primary) {
        const primaryCard = availableCards.find(c => c.id === primaryId);
        if (primaryCard) {
          combos.push({
            card: primaryCard,
            reason: pattern.reason
          });
        }
      }
    }
  }
  
  // Remove duplicates
  const uniqueCombos = combos.filter((combo, index, self) => 
    index === self.findIndex(c => c.card.id === combo.card.id)
  );
  
  return uniqueCombos.slice(0, 3); // Limit to top 3 suggestions
}
