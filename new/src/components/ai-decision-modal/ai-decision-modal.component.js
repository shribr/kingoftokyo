import { uiAIDecisionClose } from '../../core/actions.js';
import { getAIDecisionTree } from '../../services/aiDecisionService.js';

export function build() {
  const root = document.createElement('div');
  root.className = 'cmp-ai-decision-modal modal-shell';
  root.innerHTML = `
    <div class="modal ai-decision" data-ai-decision-modal>
      <div class="modal-header"><h2>AI Decision Tree (New)</h2><button data-close>×</button></div>
      <div class="modal-body">
        <div data-ai-tree class="ai-tree">
          <em>Waiting for AI decisions...</em>
        </div>
      </div>
    </div>`;
  root.querySelector('[data-close]').addEventListener('click', () => window.__KOT_NEW__.store.dispatch(uiAIDecisionClose()));
  return { root, update: (p) => update(p) };
}

export function update({ state, root }) {
  if (!root) return;
  const open = state.ui.aiDecision?.open;
  root.style.display = open ? 'block' : 'none';
  if (!open) return;
  const treeEl = root.querySelector('[data-ai-tree]');
  if (!treeEl) return;
  const tree = getAIDecisionTree();
  treeEl.innerHTML = renderTree(tree);
}

function renderTree(tree) {
  if (!tree.rounds.length) return '<em>No AI data yet. Roll dice to populate.</em>';
  return tree.rounds.map(r => `<div class="ai-round"><div class="ai-round-header">Round ${r.round}</div>${r.turns.map(t => renderTurn(t)).join('')}</div>`).join('');
}

function renderTurn(t) {
  return `<div class="ai-turn"><div class="ai-turn-header">Turn ${t.turn}</div><div class="ai-turn-rolls">${t.rolls.map(r => renderRoll(r)).join('')}</div></div>`;
}

function renderRoll(r) {
  return `<div class="ai-roll"><span class="faces">${r.faces}</span> <span class="score">score: ${r.score}</span><div class="rationale">${r.rationale}</div></div>`;
}
