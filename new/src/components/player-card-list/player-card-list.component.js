/** player-card-list.component.js */
import { selectPlayerOrder, selectPlayerById } from '../../core/selectors.js';
import { store } from '../../bootstrap/index.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1);
  root.innerHTML = `<h3>Players</h3><div data-player-list></div>`;
  return { root, update: (props) => update(root, props), destroy: () => root.remove() };
}

export function update(root) {
  const listEl = root.querySelector('[data-player-list]');
  if (!listEl) return;
  const state = store.getState();
  const order = selectPlayerOrder(state);
  const html = order.map(id => {
    const p = selectPlayerById(state, id);
    return `<div class="player-card">
      <span class="name">${p.name}</span>
      <span class="hp">HP: ${p.health}</span>
      <span class="energy">⚡ ${p.energy}</span>
      <span class="vp">★ ${p.victoryPoints}</span>
      ${p.inTokyo ? '<span class="tokyo">TOKYO</span>' : ''}
    </div>`;
  }).join('');
  listEl.innerHTML = html;
}
