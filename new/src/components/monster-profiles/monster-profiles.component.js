/** monster-profiles.component.js */
import { store } from '../../bootstrap/index.js';
import { selectMonsters, selectUIMonsterProfiles } from '../../core/selectors.js';
import { uiMonsterProfilesClose, uiMonsterProfileOpen } from '../../core/actions.js';
import { renderMonsterCard } from './shared.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' monster-profiles-modal hidden';
  root.innerHTML = `<div class="mp-frame">
    <div class="mp-header"><h2>MONSTER PROFILES</h2><button data-action="close" class="btn danger circle">×</button></div>
    <div class="mp-grid" data-grid></div>
  </div>`;
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) {
      store.dispatch(uiMonsterProfilesClose());
    }
    const card = e.target.closest('[data-monster-id]');
    if (card) {
      store.dispatch(uiMonsterProfileOpen(card.getAttribute('data-monster-id')));
    }
  });
  return { root, update: () => update(root), destroy: () => root.remove() };
}

export function update(root) {
  const state = store.getState();
  const ui = selectUIMonsterProfiles(state);
  if (!ui.open) { root.classList.add('hidden'); return; }
  root.classList.remove('hidden');
  const monsters = selectMonsters(state);
  const grid = root.querySelector('[data-grid]');
  grid.innerHTML = monsters.map(m => `<div class="mp-card" data-monster-id="${m.id}">${renderMonsterCard(m)}</div>`).join('');
}
