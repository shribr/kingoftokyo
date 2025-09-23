/** monster-profile-single.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUISingleMonster, selectMonsterById } from '../../core/selectors.js';
import { uiMonsterProfileClose } from '../../core/actions.js';
import { renderMonsterCard } from '../monster-profiles/shared.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' monster-profile-single-modal hidden';
  root.innerHTML = `<div class="mps-frame"><button data-action="close" class="btn danger circle mps-close">×</button><div data-card></div></div>`;
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) store.dispatch(uiMonsterProfileClose());
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
  cardHolder.innerHTML = renderMonsterCard(monster);
}
