import { uiGameLogClose, uiGameLogCollapseState } from '../../core/actions.js';
import { buildLogTree } from '../../services/logTree.js';

export function build() {
  const root = document.createElement('div');
  root.className = 'cmp-game-log-modal modal-shell';
  
  // IMPORTANT: Append modal directly to body, not to the mountPoint
  // Modals should always be at the top level to avoid z-index and overflow issues
  document.body.appendChild(root);
  
  root.innerHTML = `
    <div class="modal game-log" data-game-log-modal>
      <div class="modal-header"><h2>Game Log (New)</h2><button data-close>×</button></div>
      <div class="modal-body">
        <div class="filters" data-kind-filters></div>
        <div class="log-scroll" data-log-container><em data-empty>Parity scaffold – future: hierarchical rounds & turns.</em></div>
      </div>
    </div>`;
  root.querySelector('[data-close]').addEventListener('click', () => window.__KOT_NEW__.store.dispatch(uiGameLogClose()));
  return { root, update: (p) => update(p) };
}

export function update({ state, root }) {
  if (!root) return;
  const open = state.ui.gameLog?.open;
  root.style.display = open ? 'block' : 'none';
  if (open) {
    const container = root.querySelector('[data-log-container]');
    const entries = state.log.entries.slice(-500); // larger slice for tree context
    if (!entries.length) {
      const empty = container.querySelector('[data-empty]');
      if (empty) empty.style.display = 'block';
      return;
    }
    const activeKinds = ensureFilterState(state, entries);
    renderFilters(root, entries, activeKinds, state);
    const filtered = entries.filter(e => activeKinds.has(e.kind || 'info'));
    const tree = buildLogTree(filtered);
    const collapse = state.ui.gameLog?.collapse || { rounds: {}, turns: {} };
    container.innerHTML = tree.map(r => renderRound(r, collapse)).join('');
    // Attach toggle handlers
    container.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.closest('.round, .turn');
        if (target) {
          target.classList.toggle('collapsed');
          persistCollapse(container, state);
        }
      });
    });
  }
}

function persistCollapse(container, state) {
  const rounds = {};
  container.querySelectorAll('.round').forEach(r => {
    const id = r.getAttribute('data-round');
    rounds[id] = r.classList.contains('collapsed');
  });
  const turns = {};
  container.querySelectorAll('.turn').forEach(t => {
    const id = t.getAttribute('data-turn-full');
    if (id) turns[id] = t.classList.contains('collapsed');
  });
  window.__KOT_NEW__.store.dispatch(uiGameLogCollapseState({ rounds, turns }));
}

function ensureFilterState(state, entries) {
  const stored = state.ui.gameLog?.kinds;
  if (stored && Array.isArray(stored) && stored.length) return new Set(stored);
  const allKinds = Array.from(new Set(entries.map(e => e.kind || 'info')));
  // Persist initial selection
  window.__KOT_NEW__.store.dispatch(uiGameLogCollapseState({ kinds: allKinds }));
  return new Set(allKinds);
}

function renderFilters(root, entries, activeKinds, state) {
  const host = root.querySelector('[data-kind-filters]');
  if (!host) return;
  const kinds = Array.from(new Set(entries.map(e => e.kind || 'info'))).sort();
  host.innerHTML = kinds.map(k => `<label class="kind-filter"><input type="checkbox" data-kind-filter value="${k}" ${activeKinds.has(k)?'checked':''}/> ${k}</label>`).join('');
  host.querySelectorAll('input[data-kind-filter]').forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = Array.from(host.querySelectorAll('input[data-kind-filter]:checked')).map(i => i.value);
      window.__KOT_NEW__.store.dispatch(uiGameLogCollapseState({ kinds: selected }));
      // force re-render using updated state
      update({ state: window.__KOT_NEW__.store.getState(), root });
    });
  });
}

function renderRound(r, collapse) {
  const collapsed = collapse.rounds?.[r.round];
  return `<div class="round${collapsed?' collapsed':''}" data-round="${r.round}">
    <div class="round-header" data-toggle>Round ${r.round} (${r.turns.length} turns)</div>
    <div class="round-body">
      ${r.turns.map(t => renderTurn(r.round, t, collapse)).join('')}
    </div>
  </div>`;
}

function renderTurn(round, t, collapse) {
  const fullId = `${round}:${t.turn}`;
  const collapsed = collapse.turns?.[fullId];
  return `<div class="turn${collapsed?' collapsed':''}" data-turn="${t.turn}" data-turn-full="${fullId}">
    <div class="turn-header" data-toggle>Turn ${t.turn} (${t.entries.length} events)</div>
    <div class="turn-body">
      ${t.entries.map(e => renderEntry(e)).join('')}
    </div>
  </div>`;
}

function renderEntry(e) {
  const kind = e.kind || e.meta?.kind || 'info';
  const parts = [];
  parts.push(`<span class=msg>${escapeHTML(e.message || '')}</span>`);
  parts.push(`<span class=kind>[${escapeHTML(kind)}]</span>`);
  return `<div class="log-line kind-${escapeHTML(kind)}">${parts.join(' ')}</div>`;
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
