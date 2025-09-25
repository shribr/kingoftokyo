/** monster-profile-single.component.js */
import { store } from '../../bootstrap/index.js';
import { selectUISingleMonster, selectMonsterById } from '../../core/selectors.js';
import { uiMonsterProfileClose, monstersLoaded } from '../../core/actions.js';
import { renderMonsterCard } from '../monster-profiles/shared.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' monster-profile-single-modal hidden';
  root.innerHTML = `<div class="mps-frame"><button data-action="close" class="k-btn k-btn--warning k-btn--small mps-close">×</button><div data-card></div><div class="mps-edit" data-edit></div></div>`;
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) store.dispatch(uiMonsterProfileClose());
  });
  root.addEventListener('input', (e) => {
    const slider = e.target.closest('[data-trait-slider]');
    if (slider) {
      const label = slider.getAttribute('data-trait');
      const out = root.querySelector(`[data-trait-output="${label}"]`);
      if (out) out.textContent = slider.value;
    }
  });
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="save-traits"]')) {
      const st = store.getState();
      const ui = selectUISingleMonster(st);
      if (!ui.monsterId) return;
      const monster = selectMonsterById(st, ui.monsterId);
      if (!monster) return;
      const edits = collectEdits(root, monster);
      // Apply edits immutably to monsters slice
      const updated = st.monsters.list.map(m => m.id === monster.id ? { ...m, personality: { ...m.personality, ...edits } } : m);
      store.dispatch(monstersLoaded(updated));
      store.dispatch(uiMonsterProfileClose());
    }
    if (e.target.matches('[data-action="cancel-traits"]')) {
      store.dispatch(uiMonsterProfileClose());
    }
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
  const edit = root.querySelector('[data-edit]');
  edit.innerHTML = traitEditor(monster);
}

function traitEditor(monster) {
  const traits = [
    { key: 'aggression', label: 'Aggression' },
    { key: 'strategy', label: 'Strategy' },
    { key: 'risk', label: 'Risk Taking' },
    { key: 'economic', label: 'Economic Focus' }
  ];
  return `<div class="mps-traits">
    <h3 class="mps-section-title">ADJUST TRAITS</h3>
    <div class="mps-trait-list">
      ${traits.map(t => sliderRow(t.label, t.key, monster.personality?.[t.key])).join('')}
    </div>
    <div class="mps-actions">
      <button class="pill-btn save" data-action="save-traits">Save</button>
      <button class="pill-btn cancel" data-action="cancel-traits">Cancel</button>
    </div>
  </div>`;
}

function sliderRow(label, key, value) {
  const v = typeof value === 'number' ? value : 3;
  return `<label class="mps-trait-row">${label.toUpperCase()}<div class="mps-slider-wrap"><input type="range" min="1" max="5" step="1" value="${v}" data-trait-slider data-trait="${key}"><span class="mps-value" data-trait-output="${key}">${v}</span></div></label>`;
}

function collectEdits(root, original) {
  const edits = {};
  ['aggression','strategy','risk','economic'].forEach(k => {
    const el = root.querySelector(`[data-trait-slider][data-trait="${k}"]`);
    if (el) edits[k] = parseInt(el.value, 10);
  });
  return edits;
}
