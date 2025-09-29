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
    <div class="peek-content" data-content>
      <div class="peek-header" data-header>NEXT CARD</div>
      <div class="peek-text" data-text></div>
    </div>
    <div class="peek-monster-content" data-monster-content style="display: none;"></div>
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
  
  // Check if this is a monster card
  const isMonsterCard = card.isMonster || card.monster || card.personality || card.description || card.image;
  const monster = card.monster || card;
  
  // Get the frame element and update its content
  const frame = root.querySelector('[data-frame]');
  
  if (isMonsterCard) {
    frame.innerHTML = `
      ${renderEditableCard(monster)}
      <div class="peek-actions"><button data-action="close" class="k-btn k-btn--secondary k-btn--small">CLOSE</button></div>
    `;
  } else {
    frame.innerHTML = `
      <div class="peek-content">
        <div class="peek-header">POWER CARD</div>
        <div class="peek-text">${card.name}: ${formatCardText(card.effect) || card.text || ''}</div>
      </div>
      <div class="peek-actions"><button data-action="close" class="k-btn k-btn--secondary k-btn--small">CLOSE</button></div>
    `;
  }
}

// Monster profile card renderer (read-only version from monster profiles)
function renderEditableCard(monster, pending) {
  const { id, name, image, description, personality = {} } = monster;
  const traits = [
    { key: 'aggression', label: 'AGGRESSION', icon: '🔥', min: 'Passive', max: 'Aggressive' },
    { key: 'strategy', label: 'STRATEGY', icon: '🧠', min: 'Simple', max: 'Strategic' },
    { key: 'risk', label: 'RISK TAKING', icon: '🎲', min: 'Cautious', max: 'Risky' },
    { key: 'economic', label: 'ECONOMIC FOCUS', icon: '💰', min: 'Ignores', max: 'Focused' }
  ];
  const staged = pending?.[id] || {};
  return `<article class="profile-card mp-gradient-card">
    <header class="pc-head horiz">
      <div class="pc-avatar">${image ? `<img src="${image}" alt="${name}">` : ''}</div>
      <div class="pc-meta"><p class="pc-desc">${description || ''}</p></div>
    </header>
    <div class="pc-traits">
      ${traits.map(t => traitBlock(id, t, staged[t.key] ?? personality[t.key])).join('')}
    </div>
  </article>`;
}

function traitBlock(monsterId, t, value) {
  const v = typeof value === 'number' ? value : 3;
  return `<div class="trait-block" data-trait-block="${t.key}">
    <div class="trait-header"><span class="trait-icon">${t.icon}</span><span class="trait-label">${t.label}</span><span class="trait-value">${v}</span></div>
    <div class="trait-slider-row">
      <input type="range" class="trait-slider-shadow" min="1" max="5" step="1" value="${v}" disabled readonly aria-label="${t.label} value" />
    </div>
    <div class="trait-endpoints"><span class="trait-min">${t.min}</span><span class="trait-max">${t.max}</span></div>
  </div>`;
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
