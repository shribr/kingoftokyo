/** monster-profile-single.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUISingleMonster, selectMonsterById } from '../../core/selectors.js';
import { uiMonsterProfileClose } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' monster-profile-single-modal hidden';
  root.innerHTML = `<button data-action="close" class="k-btn k-btn--warning k-btn--small mps-close">×</button><div data-card></div>`;
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) store.dispatch(uiMonsterProfileClose());
    // Close if clicking outside the card
    if (e.target === root) store.dispatch(uiMonsterProfileClose());
  });
  return { root, update: () => update(root), destroy: () => root.remove() };
}

export function update(root) {
  const st = store.getState();
  const ui = selectUISingleMonster(st);
  if (!ui.monsterId) { root.classList.add('hidden'); return; }
  const monster = selectMonsterById(st, ui.monsterId);
  if (!monster) { root.classList.add('hidden'); return; }
  root.classList.remove('hidden');
  const cardHolder = root.querySelector('[data-card]');
  cardHolder.innerHTML = renderReadOnlyCard(monster);
}

// Read-only version of the card (same visual style as grid view)
function renderReadOnlyCard(monster) {
  const { id, name, image, description, personality = {} } = monster;
  const traits = [
    { key: 'aggression', label: 'AGGRESSION', icon: '🔥', min: 'Passive', max: 'Aggressive' },
    { key: 'strategy', label: 'STRATEGY', icon: '🧠', min: 'Simple', max: 'Strategic' },
    { key: 'risk', label: 'RISK TAKING', icon: '🎲', min: 'Cautious', max: 'Risky' },
    { key: 'economic', label: 'ECONOMIC FOCUS', icon: '💰', min: 'Ignores', max: 'Focused' }
  ];
  
  return `<article class="profile-card mp-gradient-card">
    <header class="pc-head horiz">
      <div class="pc-avatar">${image ? `<img src="${image}" alt="${name}">` : ''}</div>
      <div class="pc-meta"><h3 class="pc-name">${name.toUpperCase()}</h3><p class="pc-desc">${description || ''}</p></div>
    </header>
    <div class="pc-traits">
      ${traits.map(t => traitBlockReadOnly(id, t, personality[t.key])).join('')}
    </div>
  </article>`;
}

function traitBlockReadOnly(monsterId, t, value) {
  const v = typeof value === 'number' ? value : 3;
  return `<div class="trait-block" data-trait-block="${t.key}">
    <div class="trait-header"><span class="trait-icon">${t.icon}</span><span class="trait-label">${t.label}</span><span class="trait-value" data-trait-value>${v}</span></div>
    <div class="trait-slider-row">
      <input type="range" class="trait-slider-shadow" min="1" max="5" step="1" value="${v}" disabled style="pointer-events:none;opacity:0.7;" aria-label="${t.label} slider" />
    </div>
    <div class="trait-endpoints"><span class="trait-min">${t.min}</span><span class="trait-max">${t.max}</span></div>
  </div>`;
}
