/** setup.component.js */
import { selectMonsters } from '../../core/selectors.js';
import { uiSetupClose } from '../../core/actions.js';

export function build({ selector, dispatch, getState }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' setup-modal hidden';
  root.innerHTML = frame();
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) {
      dispatch(uiSetupClose());
      return;
    }
  });
  return { root };
}

export function update(ctx) {
  const root = ctx.inst?.root || ctx;
  const st = ctx.fullState || ctx.state;
  const open = st?.ui?.setup?.open;
  if (!open) { root.classList.add('hidden'); return; }
  root.classList.remove('hidden');
  const monsters = selectMonsters(st);
  const grid = root.querySelector('[data-setup-grid]');
  if (grid) {
    grid.innerHTML = monsters.map(m => card(m)).join('');
  }
}

function frame() {
  return `
    <div class="setup-frame">
      <div class="setup-header">
        <h2>Monster Selection</h2>
        <button class="btn danger circle" data-action="close">×</button>
      </div>
      <div class="setup-grid" data-setup-grid></div>
      <div class="setup-actions">
        <button class="btn primary" data-action="close">Start</button>
      </div>
    </div>`;
}

function card(m) {
  return `<div class="setup-card">
    <img src="${m.image}" alt="${m.name}" />
    <div class="name">${m.name}</div>
  </div>`;
}
