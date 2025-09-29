/** ai-decision-tree.component.js (NEW ARCH)
 * Rich AI Decision Tree explorer (replaces minimal placeholder)
 * - Live updates via eventBus 'ai/tree/updated'
 * - Collapsible rounds / turns / rolls
 * - Verbose vs concise mode
 * - Tag filtering & text search
 * - JSON export
 * - Hypotheticals (what-if) toggle per roll
 *
 * NO legacy naming used; scoped under cmp-ai-decision-tree
 */
import { eventBus } from '../../core/eventBus.js';
import { getAIDecisionTree } from '../../services/aiDecisionService.js';

// Local ephemeral state (not in global store to avoid noise)
const localState = {
  mode: 'verbose', // 'verbose' | 'concise'
  openRounds: new Set(),
  openTurns: new Set(), // key: `${round}:${turn}`
  openRolls: new Set(), // key: roll id
  expandedAll: true,
  tagFilter: new Set(), // when non-empty only rolls containing at least one tag included
  search: '',
  autoScrollLast: true,
  includeHuman: false // default: show only AI (CPU) rolls
};

export function buildAIDecisionTree() {
  const root = document.createElement('div');
  root.className = 'cmp-ai-decision-tree';
  root.innerHTML = layout();
  bindUI(root);
  render(root);
  // Live subscription
  const handler = () => render(root);
  eventBus.on('ai/tree/updated', handler);
  root._dispose = () => eventBus.off('ai/tree/updated', handler);
  return { root, dispose: () => root._dispose && root._dispose() };
}

function layout() {
  return `
    <div class="adt-toolbar">
      <div class="adt-left-tools">
        <button data-action="toggle-mode" class="adt-btn">Mode: <span data-mode-label>Verbose</span></button>
        <button data-action="collapse-all" class="adt-btn">Collapse All</button>
        <button data-action="expand-all" class="adt-btn">Expand All</button>
        <button data-action="export-json" class="adt-btn">Export JSON</button>
        <label class="adt-toggle-humans"><input type="checkbox" data-include-humans /> Include Human Rolls</label>
      </div>
      <div class="adt-right-tools">
        <label class="adt-search"><input type="text" data-search placeholder="Search rationale / faces" /></label>
        <label class="adt-autoscroll"><input type="checkbox" data-autoscroll checked /> Scroll latest</label>
      </div>
    </div>
    <div class="adt-legend" data-legend></div>
    <div class="adt-tag-filters" data-tag-filters></div>
    <div class="adt-summary" data-summary></div>
    <div class="adt-tree-scroll" data-tree></div>
  `;
}

function bindUI(root){
  root.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action]');
    if (btn){
      const a = btn.getAttribute('data-action');
      if (a==='toggle-mode'){ toggleMode(root); return; }
      if (a==='collapse-all'){ collapseAll(); render(root); return; }
      if (a==='expand-all'){ expandAll(); render(root); return; }
      if (a==='export-json'){ exportJSON(); return; }
    }
    const roundHeader = e.target.closest('[data-round-header]');
    if (roundHeader){ const r= roundHeader.getAttribute('data-round'); toggleRound(r); render(root); return; }
    const turnHeader = e.target.closest('[data-turn-header]');
    if (turnHeader){ const key=turnHeader.getAttribute('data-turn-key'); toggleTurn(key); render(root); return; }
    const rollNode = e.target.closest('[data-roll-toggle]');
    if (rollNode){ const id= rollNode.getAttribute('data-roll-id'); toggleRoll(id); render(root); return; }
    const tagBtn = e.target.closest('[data-tag-filter]');
    if (tagBtn){ const tag = tagBtn.getAttribute('data-tag-filter'); toggleTag(tag); render(root); return; }
  });
  root.querySelector('[data-search]')?.addEventListener('input', (e)=>{ localState.search = e.target.value.trim().toLowerCase(); render(root); });
  root.querySelector('[data-autoscroll]')?.addEventListener('change', e=>{ localState.autoScrollLast = !!e.target.checked; });
  root.querySelector('[data-include-humans]')?.addEventListener('change', e=>{ localState.includeHuman = !!e.target.checked; render(root); });
}

function toggleMode(root){
  localState.mode = localState.mode==='verbose' ? 'concise':'verbose';
  const lbl = root.querySelector('[data-mode-label]');
  if (lbl) lbl.textContent = localState.mode==='verbose'? 'Verbose':'Concise';
  render(root);
}
function collapseAll(){ localState.openRounds.clear(); localState.openTurns.clear(); localState.openRolls.clear(); localState.expandedAll=false; }
function expandAll(){
  const tree = getAIDecisionTree();
  tree.rounds.forEach(r=>{ localState.openRounds.add(String(r.round)); r.turns.forEach(t=>{ localState.openTurns.add(`${r.round}:${t.turn}`); t.rolls.forEach(rr=> localState.openRolls.add(String(rr.id))); }); });
  localState.expandedAll=true;
}
function toggleRound(r){ if (localState.openRounds.has(r)) localState.openRounds.delete(r); else localState.openRounds.add(r); }
function toggleTurn(key){ if (localState.openTurns.has(key)) localState.openTurns.delete(key); else localState.openTurns.add(key); }
function toggleRoll(id){ if (localState.openRolls.has(id)) localState.openRolls.delete(id); else localState.openRolls.add(id); }
function toggleTag(tag){ if (localState.tagFilter.has(tag)) localState.tagFilter.delete(tag); else localState.tagFilter.add(tag); }
function exportJSON(){
  try {
    const data = getAIDecisionTree();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ai-decision-tree.json'; a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 2000);
  } catch(e){ console.warn('[AI][export] failed', e); }
}

function render(root){
  const tree = getAIDecisionTree();
  const container = root.querySelector('[data-tree]');
  if (!container) return;
  if (!tree.rounds.length){ container.innerHTML = `<div class="adt-empty">No AI decisions yet.</div>`; return; }

  const tags = collectTags(tree);
  const summaryEl = root.querySelector('[data-summary]');
  if (summaryEl){
    const allTurns = tree.rounds.reduce((a,r)=>a+r.turns.length,0);
    const actualRolls = tree.rounds.reduce((a,r)=> a + r.turns.reduce((b,t)=> b + t.rolls.filter(rr=> rr.stage !== 'pre').length,0),0);
    const preCount = tree.rounds.reduce((a,r)=> a + r.turns.reduce((b,t)=> b + t.rolls.filter(rr=> rr.stage === 'pre').length,0),0);
    summaryEl.innerHTML = [
      `<span><strong>Rounds:</strong> ${tree.rounds.length}</span>`,
      `<span><strong>Turns:</strong> ${allTurns}</span>`,
      `<span><strong>Rolls:</strong> ${actualRolls}</span>` + (localState.mode==='verbose' && preCount? ` <span class="adt-pre-meta">(+${preCount} pre)</span>`:'')
    ].join('');
  }
  const tagFilterBar = root.querySelector('[data-tag-filters]');
  if (tagFilterBar){
    tagFilterBar.innerHTML = tags.map(tag=>`<button class="adt-tag ${localState.tagFilter.has(tag)?'is-active':''}" data-tag-filter="${tag}">${tag}</button>`).join('');
  }

  // Legend / viewing mode indicator
  const legendEl = root.querySelector('[data-legend]');
  if (legendEl){
    if (!localState.includeHuman) {
      legendEl.innerHTML = `<span class="view-mode">Viewing: <strong>AI Only</strong></span>`;
    } else {
      legendEl.innerHTML = `
        <span class="view-mode">Viewing: <strong>AI + Human</strong></span>
        <span class="legend-item"><span class="badge badge-ai">AI</span> AI Roll</span>
        <span class="legend-item"><span class="badge badge-human">H</span> Human Roll</span>
        <span class="legend-note">(Toggle off to focus on AI decisions)</span>
      `;
    }
  }

  const search = localState.search;
  const activeTagFilter = localState.tagFilter.size>0;

  const roundHTML = tree.rounds.map(r=>{
    const rKey = String(r.round);
    const openR = localState.openRounds.has(rKey);
    const turnsHTML = openR ? r.turns.map(t=>{
      const tKey = `${r.round}:${t.turn}`;
      const openT = localState.openTurns.has(tKey);
      const rollsFilteredStage = t.rolls.filter(roll => {
        if (!localState.includeHuman && !roll.isCpu) return false; // AI-only default
        return localState.mode==='verbose' ? true : roll.stage !== 'pre';
      });
      const rollsHTML = openT ? rollsFilteredStage.filter(roll => passFilters(roll, search, activeTagFilter)).map(roll => renderRollNode(roll)).join('') : '';
      const consideredRolls = t.rolls.filter(rr => localState.includeHuman || rr.isCpu);
      const actualCount = consideredRolls.filter(rr=> rr.stage !== 'pre').length;
      const preCount = consideredRolls.filter(rr=> rr.stage === 'pre').length;
      return `<div class="adt-turn">
        <div class="adt-turn-header" data-turn-header data-turn-key="${tKey}">
          <span class="caret ${openT?'open':''}"></span> Turn ${t.turn} <span class="meta">(${actualCount} roll${actualCount!==1?'s':''}${localState.mode==='verbose' && preCount?`, +${preCount} pre`:''})</span>
        </div>
        <div class="adt-rolls">${rollsHTML}</div>
      </div>`;
    }).join('') : '';
    return `<div class="adt-round">
      <div class="adt-round-header" data-round-header data-round="${rKey}"><span class="caret ${openR?'open':''}"></span> Round ${r.round} <span class="meta">(${r.turns.length} turns)</span></div>
      <div class="adt-turns">${turnsHTML}</div>
    </div>`;
  }).join('');

  container.innerHTML = roundHTML;

  if (localState.autoScrollLast){
    try {
      const lastRollEl = container.querySelector('.adt-roll:last-of-type');
      if (lastRollEl) lastRollEl.scrollIntoView({ block:'nearest' });
    } catch(_){}
  }
}

function passFilters(roll, search, activeTagFilter){
  if (search){
    const hay = (roll.rationale + ' ' + roll.faces).toLowerCase();
    if (!hay.includes(search)) return false;
  }
  if (activeTagFilter){
    if (!roll.tags || !roll.tags.some(t=> localState.tagFilter.has(t))) return false;
  }
  return true;
}

function collectTags(tree){
  const set = new Set();
  tree.rounds.forEach(r=> r.turns.forEach(t=> t.rolls.forEach(roll=> (roll.tags||[]).forEach(tag=> set.add(tag)))));
  return Array.from(set).sort();
}

function renderRollNode(roll){
  // Stage awareness: pre nodes (stage==='pre') are only shown in verbose mode
  const isPre = roll.stage === 'pre';
  if (isPre && localState.mode !== 'verbose') return '';
  const open = localState.openRolls.has(String(roll.id));
  const concise = localState.mode==='concise';
  const isHuman = !roll.isCpu;
  return `<div class="adt-roll ${open?'is-open':''} ${isPre?'is-pre':''} ${isHuman?'is-human':'is-ai'}" data-roll-id="${roll.id}">
    <div class="adt-roll-header" data-roll-toggle data-roll-id="${roll.id}">
      <span class="caret ${open?'open':''}"></span>
      <span class="faces">${roll.faces}${isPre?'<span class="pre-label">(pre)</span>':''}</span>
      <span class="origin-badge ${isHuman?'human':'ai'}" title="${isHuman?'Human':'AI'} turn">${isHuman?'H':'AI'}</span>
      <span class="score-badge">${roll.score}</span>
      ${renderTagsInline(roll.tags)}
    </div>
    <div class="adt-roll-body" ${open?'':'style="display:none"'}>
      ${concise? '' : `<div class="rationale">${escapeHTML(roll.rationale || '—')}</div>`}
      ${!concise && roll.hypotheticals && roll.hypotheticals.length ? renderHypotheticals(roll.hypotheticals) : ''}
    </div>
  </div>`;
}

function renderTagsInline(tags){
  if (!tags || !tags.length) return '<span class="tags empty">—</span>';
  return `<span class=\"tags\">${tags.map(t=>`<span class=\"tag\" data-tag=\"${t}\">${t}</span>`).join('')}</span>`;
}

function renderHypotheticals(list){
  const trimmed = list.slice(0,12);
  return `<details class="hypo"><summary>What-if (${list.length})</summary><div class="hypo-grid">${trimmed.map(h=>`<div class="hypo-item"><code>${h.to}</code><span>${h.estScore}</span></div>`).join('')}</div></details>`;
}

function escapeHTML(str){
  return str.replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]||c));
}
