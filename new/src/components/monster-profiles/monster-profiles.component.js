/** monster-profiles.component.js */
import { store } from '../../bootstrap/index.js';
import { selectMonsters, selectUIMonsterProfiles } from '../../core/selectors.js';
import { uiMonsterProfilesClose, uiMonsterProfileOpen } from '../../core/actions.js';
import { renderMonsterCard } from './shared.js'; // still used by single view; grid now uses inline editable cards

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' monster-profiles-modal hidden';
  root.innerHTML = `<div class="mp-frame">
    <div class="mp-header">
  <h2><span class="mp-glyph" aria-hidden="true">👹</span> MONSTER PROFILES <span class="mp-glyph" aria-hidden="true">👹</span></h2>
  <button data-action="close" class="mp-close-btn mp-close-btn--gradient" aria-label="Close monster profiles">✕</button>
    </div>
    <div class="monster-profiles-content">
      <p class="mp-subhead">Each monster's personality affects CPU behavior. Adjust traits then Save Changes or Reset.</p>
      <div class="mp-scroll" data-scroll>
        <div class="mp-grid" data-grid></div>
      </div>
      <div class="mp-actions" data-actions>
        <button class="mp-btn mp-btn-primary" data-action="save-profiles">Save Changes</button>
        <button class="mp-btn mp-btn-secondary" data-action="reset-profiles">Reset to Defaults</button>
      </div>
    </div>
  </div>`;
  // staging map (monsterId -> trait changes) & baseline
  root._pending = {}; // eslint-disable-line no-underscore-dangle
  root._baseline = null; // captured on first open
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="close"]')) {
      store.dispatch(uiMonsterProfilesClose());
    }
  });
  // Stage slider changes (no immediate dispatch)
  root.addEventListener('input', (e) => {
    const slider = e.target.closest('[data-trait-slider]');
    if (!slider) return;
    const monsterId = slider.getAttribute('data-monster');
    const trait = slider.getAttribute('data-trait');
    const val = parseInt(slider.value, 10);
    root._pending[monsterId] = root._pending[monsterId] || {};
    root._pending[monsterId][trait] = val;
    const valueOut = slider.closest('.trait-block')?.querySelector('[data-trait-value]');
    if (valueOut) valueOut.textContent = val;
    markDirty(root, true);
  });
  // Save / Reset handlers
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="save-profiles"]')) {
      applyPending(root);
    }
    if (e.target.matches('[data-action="reset-profiles"]')) {
      resetToBaseline(root);
    }
  });
  return { root, update: () => update(root), destroy: () => root.remove() };
}

export function update(root) {
  const state = store.getState();
  const ui = selectUIMonsterProfiles(state);
  if (!ui.open) { root.classList.add('hidden'); return; }
  root.classList.remove('hidden');
  try { window.__KOT_BLACKOUT__?.hide(); } catch(_){}
  const monsters = selectMonsters(state);
  // capture baseline once per open session
  if (!root._baseline) {
    root._baseline = monsters.map(m => ({ id: m.id, personality: { ...m.personality }, ref: m }));
    root._pending = {};
    markDirty(root, false);
  }
  const grid = root.querySelector('[data-grid]');
  grid.innerHTML = monsters.map(m => `<div class="mp-card" data-monster-id="${m.id}">${renderEditableCard(m, root._pending)}</div>`).join('');
}

// Editable card (grid view) using classic visual style with inline sliders
function renderEditableCard(monster, pending) {
  const { id, name, image, description, personality = {} } = monster;
  const traits = [
    { key: 'aggression', label: 'AGGRESSION', icon: '🔥', min: 'Passive', max: 'Aggressive' },
    { key: 'strategy', label: 'STRATEGY', icon: '🧠', min: 'Simple', max: 'Strategic' },
    { key: 'risk', label: 'RISK TAKING', icon: '🎲', min: 'Cautious', max: 'Risky' },
    { key: 'economic', label: 'ECONOMIC FOCUS', icon: '💰', min: 'Ignores', max: 'Focused' }
  ];
  // horizontal header layout (avatar left, name right) inside same line
  const staged = pending?.[id] || {};
  return `<article class="profile-card mp-gradient-card">
    <header class="pc-head horiz">
      <div class="pc-avatar">${image ? `<img src="${image}" alt="${name}">` : ''}</div>
      <div class="pc-meta"><h3 class="pc-name">${name.toUpperCase()}</h3><p class="pc-desc">${description || ''}</p></div>
    </header>
    <div class="pc-traits">
      ${traits.map(t => traitBlock(id, t, staged[t.key] ?? personality[t.key])).join('')}
    </div>
  </article>`;
}

function traitBlock(monsterId, t, value) {
  const v = typeof value === 'number' ? value : 3;
  return `<div class="trait-block" data-trait-block="${t.key}">
    <div class="trait-header"><span class="trait-icon">${t.icon}</span><span class="trait-label">${t.label}</span><span class="trait-value" data-trait-value>${v}</span></div>
    <div class="trait-slider-row">
      <input type="range" class="trait-slider-shadow" min="1" max="5" step="1" value="${v}" data-trait-slider data-monster="${monsterId}" data-trait="${t.key}" aria-label="${t.label} slider" />
    </div>
    <div class="trait-endpoints"><span class="trait-min">${t.min}</span><span class="trait-max">${t.max}</span></div>
  </div>`;
}

function applyPending(root) {
  const pending = root._pending || {};
  if (!Object.keys(pending).length) return; // nothing to do
  const st = store.getState();
  const updated = st.monsters.list.map(m => pending[m.id] ? { ...m, personality: { ...m.personality, ...pending[m.id] } } : m);
  import('../../core/actions.js').then(mod => {
    store.dispatch(mod.monstersLoaded(updated));
    // After save, capture new baseline & clear pending
    root._baseline = updated.map(m => ({ id: m.id, personality: { ...m.personality }, ref: m }));
    root._pending = {};
    markDirty(root, false);
  });
}

function resetToBaseline(root) {
  if (!root._baseline) return;
  // Rebuild pending as diff back to baseline (i.e., clear staged changes)
  root._pending = {};
  markDirty(root, false);
  // Re-render using baseline values only
  const st = store.getState();
  const monsters = st.monsters.list;
  const grid = root.querySelector('[data-grid]');
  grid.innerHTML = monsters.map(m => `<div class="mp-card" data-monster-id="${m.id}">${renderEditableCard(m, root._pending)}</div>`).join('');
}

function markDirty(root, dirty) {
  const bar = root.querySelector('[data-actions]');
  if (!bar) return;
  bar.classList.toggle('dirty', !!dirty);
}
