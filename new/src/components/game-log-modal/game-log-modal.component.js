import { uiGameLogClose } from '../../core/actions.js';
import { buildLogTree } from '../../services/logTree.js';

export function build() {
  const root = document.createElement('div');
  root.className = 'cmp-game-log-modal modal-shell';
  root.innerHTML = `
    <div class="modal game-log" data-game-log-modal>
      <div class="modal-header"><h2>Game Log (New)</h2><button data-close>×</button></div>
      <div class="modal-body">
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
    const tree = buildLogTree(entries);
    container.innerHTML = tree.map(renderRound).join('');
    // Attach toggle handlers
    container.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.closest('.round, .turn');
        if (target) target.classList.toggle('collapsed');
      });
    });
  }
}

function renderRound(r) {
  return `<div class="round" data-round="${r.round}">
    <div class="round-header" data-toggle>Round ${r.round} (${r.turns.length} turns)</div>
    <div class="round-body">
      ${r.turns.map(renderTurn).join('')}
    </div>
  </div>`;
}

function renderTurn(t) {
  return `<div class="turn" data-turn="${t.turn}">
    <div class="turn-header" data-toggle>Turn ${t.turn} (${t.entries.length} events)</div>
    <div class="turn-body">
      ${t.entries.map(e => `<div class="log-line">${escapeHTML(e.message || JSON.stringify(e))}</div>`).join('')}
    </div>
  </div>`;
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
