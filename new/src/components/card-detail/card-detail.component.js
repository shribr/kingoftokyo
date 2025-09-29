/** card-detail.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUICardDetail, selectShopCards, selectActivePlayer, selectCardsState } from '../../core/selectors.js';
import { uiCardDetailClose } from '../../core/actions.js';
import { purchaseCard } from '../../services/cardsService.js';
import { logger } from '../../bootstrap/index.js';

export function build({ selector, emit }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' card-detail-modal hidden';
  root.innerHTML = `<div class="card-detail-frame" data-frame>
    <div class="cd-cost" data-cost></div>
    <div class="cd-name" data-name></div>
    <div class="cd-text" data-text></div>
    <div class="cd-combos" data-combos></div>
    <div class="cd-actions" data-actions></div>
  </div>`;

  root.addEventListener('click', (e) => {
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

  return { root, update: (props) => update(root, props), destroy: () => root.remove() };
}

export function update(root) {
  const state = store.getState();
  const detail = selectUICardDetail(state);
  if (!detail.cardId) {
    root.classList.add('hidden');
    return;
  }
  root.classList.remove('hidden');
  const shopCards = selectShopCards(state);
  const active = selectActivePlayer(state);
  const allDeckCards = [...shopCards, ...state.cards.discard, ...state.cards.deck];
  const candidate = shopCards.find(c => c.id === detail.cardId) || active?.cards.find(c => c.id === detail.cardId) || allDeckCards.find(c => c.id === detail.cardId);
  if (!candidate) {
    // Card disappeared (edge case) close.
    store.dispatch(uiCardDetailClose());
    return;
  }
  root.querySelector('[data-cost]').innerHTML = costBadge(candidate.cost);
  root.querySelector('[data-name]').textContent = candidate.name.toUpperCase();
  root.querySelector('[data-text]').innerHTML = formatCardText(candidate.text || candidate.description || '');
  root.querySelector('[data-combos]').innerHTML = renderCombos(candidate, state);
  const actionsEl = root.querySelector('[data-actions]');
  actionsEl.innerHTML = renderActions(candidate, detail, active, shopCards);
}

function renderActions(card, detail, active, shopCards) {
  const phase = store.getState().phase;
  const inShop = !!shopCards.find(c => c.id === card.id) && detail.source === 'shop';
  const canPurchase = inShop && phase === 'RESOLVE' && active && active.energy >= card.cost;
  const needResolve = inShop && phase !== 'RESOLVE';
  const insufficient = inShop && phase === 'RESOLVE' && active && active.energy < card.cost;
  let leftBtn = '';
  if (inShop) {
    if (canPurchase) {
  leftBtn = `<button data-action="purchase" class="k-btn k-btn--primary">BUY ⚡${card.cost}</button>`;
    } else if (needResolve) {
  leftBtn = `<button class="k-btn" disabled>RESOLVE DICE FIRST</button>`;
    } else if (insufficient) {
      const diff = card.cost - active.energy;
  leftBtn = `<button class="k-btn" disabled>NEED ${diff}⚡</button>`;
    }
  }
  const closeBtn = `<button data-action="close" class="k-btn k-btn--secondary">CLOSE</button>`;
  return `${leftBtn}${closeBtn}`;
}

function costBadge(cost) {
  return `<div class="cost-badge">⚡ ${cost}</div>`;
}

function formatCardText(txt) {
  return txt
    .replace(/VP/gi, '★')
    .replace(/victory points?/gi, '★')
    .replace(/energy/gi, '⚡');
}

function renderCombos(card, state) {
  const combos = findCardCombos(card, state);
  if (combos.length === 0) {
    return '<div class="cd-combos-section"><h3>💡 COMBO TIPS</h3><p>No obvious combos found with available cards.</p></div>';
  }
  
  const comboHtml = combos.map(combo => `
    <div class="combo-suggestion">
      <div class="combo-cards">
        <span class="combo-primary">${card.name}</span>
        <span class="combo-connector">+</span>
        <span class="combo-secondary">${combo.card.name}</span>
      </div>
      <div class="combo-description">${combo.reason}</div>
    </div>
  `).join('');
  
  return `
    <div class="cd-combos-section">
      <h3>💡 COMBO SUGGESTIONS</h3>
      ${comboHtml}
    </div>
  `;
}

function findCardCombos(targetCard, state) {
  const combos = [];
  const allCards = [...state.cards.deck, ...state.cards.discard];
  const shopCards = state.cards?.shop || [];
  const availableCards = [...allCards, ...shopCards];
  
  // Define combo patterns based on card effects and synergies
  const comboPatterns = [
    // Dice manipulation + Number combos
    {
      primary: ['plot-twist', 'shrink-ray'],
      secondary: ['made-in-a-lab'],
      reason: 'Use dice manipulation to complete 1-2-3 sequences for bonus VP!'
    },
    {
      primary: ['made-in-a-lab'],
      secondary: ['plot-twist', 'extra-head'],
      reason: 'More dice and control = easier 1-2-3 sequences for double VP!'
    },
    
    // Energy generation combos
    {
      primary: ['friend-of-children', 'herbivore'],
      secondary: ['rapid-healing', 'regeneration'],
      reason: 'Heart synergy: heal while gaining energy for powerful sustain!'
    },
    {
      primary: ['nuclear-power-plant'],
      secondary: ['fire-breathing', 'parasitic-tentacles'],
      reason: 'Attack-focused build: energy from skulls fuels aggressive cards!'
    },
    
    // Tokyo control combos
    {
      primary: ['background-dweller', 'skyscraper'],
      secondary: ['dedicated-news-team', 'jets'],
      reason: 'Tokyo domination: stay safe while maximizing VP gains!'
    },
    {
      primary: ['jets'],
      secondary: ['fire-breathing', 'acid-attack'],
      reason: 'Hit-and-run tactics: attack hard then escape to safety!'
    },
    
    // Health and survival
    {
      primary: ['even-bigger'],
      secondary: ['regeneration', 'armor-plating'],
      reason: 'Tank build: maximum health with consistent healing and protection!'
    },
    {
      primary: ['we-re-only-making-it-stronger'],
      secondary: ['rooting-for-the-underdog', 'rapid-healing'],
      reason: 'Turn weakness into strength: gain energy from taking damage!'
    },
    
    // Energy economy
    {
      primary: ['gas-refinery', 'corner-store'],
      secondary: ['alien-metabolism', 'giant-brain'],
      reason: 'Energy engine: consistent income for expensive card purchases!'
    },
    {
      primary: ['solar-powered'],
      secondary: ['camouflage', 'urbavore'],
      reason: 'Outside Tokyo strategy: safe energy generation and VP farming!'
    },
    
    // Dice quantity synergies
    {
      primary: ['extra-head'],
      secondary: ['nuclear-power-plant', 'friend-of-children', 'herbivore'],
      reason: 'More dice = more chances to trigger face-based effects!'
    }
  ];
  
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
