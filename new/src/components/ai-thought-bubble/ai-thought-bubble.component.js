import { getAIDecisionTree, getLastAIRollId } from '../../services/aiDecisionService.js';
import { eventBus } from '../../core/eventBus.js';
import { store } from '../../bootstrap/index.js';

// Simple component showing latest AI rationale + top hypotheticals.
export function build() {
  const root = document.createElement('div');
  root.className = 'cmp-ai-thought-bubble';
  root.innerHTML = `<div class="bubble" data-bubble><em>AI thinking...</em></div>`;
  // Listen for AI updates
  eventBus.on('ai/tree/updated', () => {
    update({ state: { settings: store.getState().settings } , root });
  });
  return { root, update: (p) => update(p) };
}

export function update({ state, root }) {
  if (!root) return;
  const settings = state.settings || store.getState().settings;
  if (!settings.showThoughtBubbles) {
    root.style.display = 'none';
    return;
  }
  root.style.display = 'block';
  const bubble = root.querySelector('[data-bubble]');
  const tree = getAIDecisionTree();
  if (!tree.rounds.length) {
    bubble.innerHTML = '<em>No AI data yet.</em>';
    return;
  }
  const lastId = getLastAIRollId();
  let lastNode = null;
  outer: for (const r of tree.rounds) {
    for (const t of r.turns) {
      for (const roll of t.rolls) {
        if (roll.id === lastId) { lastNode = roll; break outer; }
      }
    }
  }
  if (!lastNode) {
    bubble.innerHTML = '<em>Awaiting roll...</em>';
    return;
  }
  const topHypo = (lastNode.hypotheticals||[]).sort((a,b)=>b.estScore-a.estScore).slice(0,3);
  bubble.innerHTML = `
    <div class="faces">${lastNode.faces}</div>
    <div class="score">Score: ${lastNode.score}</div>
    <div class="rationale">${escapeHTML(lastNode.rationale)}</div>
    <div class="hypos">
      ${topHypo.map(h => `<div class="hypo">Die ${h.dieIndex+1} → ${h.to} (${h.estScore})</div>`).join('') || '<em>No reroll hypotheticals</em>'}
    </div>`;
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
}