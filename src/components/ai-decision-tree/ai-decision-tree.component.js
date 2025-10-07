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
import { getAIConfig, getMonsterConfig } from '../../config/aiConfigLoader.js';
import { attachReasoningHandlers } from './ai-decision-tree-reasoning.js';

// Local ephemeral state (not in global store to avoid noise)
const localState = {
  mode: 'verbose', // 'verbose' | 'concise'
  view: 'standard', // 'modern' | 'standard' (default to standard for legacy UI parity)
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
  
  // Set initial view attribute on container only (not root) for CSS theming
  const container = root.querySelector('[data-tree]');
  if (container) container.setAttribute('data-view', localState.view);
  
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
  <button type="button" data-action="toggle-view" class="adt-btn">View: <span data-view-label>Standard</span></button>
  <button type="button" data-action="toggle-mode" class="adt-btn">Mode: <span data-mode-label>Verbose</span></button>
  <button type="button" data-action="collapse-all" class="adt-btn">Collapse All</button>
  <button type="button" data-action="expand-all" class="adt-btn">Expand All</button>
  <button type="button" data-action="export-json" class="adt-btn">Export JSON</button>
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
      if (a==='toggle-view'){ toggleView(root); return; }
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

function toggleView(root){
  localState.view = localState.view==='modern' ? 'standard':'modern';
  const lbl = root.querySelector('[data-view-label]');
  if (lbl) lbl.textContent = localState.view==='modern'? 'Modern':'Standard';
  // Set data-view attribute on container only (not root) for CSS theming
  const container = root.querySelector('[data-tree]');
  if (container) container.setAttribute('data-view', localState.view);
  render(root);
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

async function render(root){
  try {
    const tree = getAIDecisionTree();
    const container = root.querySelector('[data-tree]');
    if (!container) return;
    
    if (localState.view === 'modern') {
      renderModernView(root, tree, container);
    } else {
      await renderStandardView(root, tree, container);
    }
  } catch(e) {
    console.warn('[AI][render] error', e);
    const container = root.querySelector('[data-tree]');
    if (container) container.innerHTML = `<div class="adt-error">Error rendering AI decisions: ${e.message}</div>`;
  }
}

async function renderStandardLayout(rounds) {
  if (!rounds || rounds.length === 0) {
    return '<div class="adt-std-empty">No AI roll data yet.</div>';
  }
  
  const content = [];
  // Get game state from window if available (for context-aware narratives)
  const gameState = window.game || null;
  
  for (const round of rounds) {
    // Round wrapper (legacy structure with collapse)
    content.push(`<div class="adt-std-round collapsed" data-round="${round.round}">`);
    content.push(`<div class="adt-std-round-header">Round ${round.round} <span class="adt-std-round-meta">${round.turns.length} turn(s)</span></div>`);
    content.push(`<div class="adt-std-round-body">`);
    
    for (const turn of round.turns) {
      const player = turn.rolls[0]?.playerName || 'Player';
      const rollsCount = turn.rolls.length;
      
      // Build opening intent narrative (personality + context aware) - ASYNC
      const openingIntent = await buildOpeningIntentNarrative(turn, gameState);
      
      // Build turn chain narrative (roll sequence summary)
      const turnChain = buildTurnChainNarrative(turn);
      
      // Turn wrapper (legacy structure)
      content.push(`<div class="adt-std-turn collapsed" data-player-id="${player}">`);
      content.push(`<div class="adt-std-turn-header">🐲 ${player} <span class="adt-std-turn-meta">${rollsCount} roll(s)</span></div>`);
      
      // Opening intent section (personality-based introduction)
      if (openingIntent) {
        content.push(`<div class="adt-std-opening-intent">${openingIntent}</div>`);
      }
      
      content.push(`<div class="adt-std-turn-body">`);
      
      turn.rolls.forEach((roll, rollIndex) => {
        content.push(renderStandardRoll(roll, rollIndex + 1, turn.rolls.length, turn));
      });
      
      // Turn chain narrative at end (roll sequence summary)
      if (turnChain) {
        content.push(`<div class="adt-std-turn-chain">${turnChain}</div>`);
      }
      
      content.push(`</div>`); // close adt-std-turn-body
      content.push(`</div>`); // close adt-std-turn
    }
    
    content.push(`</div>`); // close adt-std-round-body
    content.push(`</div>`); // close adt-std-round
  }
  
  return content.join('');
}

function renderStandardRoll(roll, rollNumber, totalRolls, turn) {
  const faces = roll.faces ? roll.faces.split(',') : [];
  const keptMask = roll.keptMask || [];
  let keptIndices = Array.isArray(roll.keptIndices) ? roll.keptIndices.slice() : [];
  if (!keptIndices.length && keptMask.length) keptMask.forEach((k,i)=> { if (k) keptIndices.push(i); });
  
  let content = `<div class="adt-std-roll">`;
  
  // Roll header
  content += `<div class="adt-std-roll-header">`;
  content += `<span class="adt-std-roll-number"><strong>Roll ${rollNumber}</strong></span>`;
  content += `</div>`;
  
  // Dice row - use legacy structure with data attributes for client-side rendering
  content += `<div class="adt-std-dice-row">`;
  content += `<div class="adt-std-dice" data-dice='${JSON.stringify(faces)}' data-kept='${JSON.stringify(keptIndices)}'></div>`;
  content += `<span class="adt-reasoning-link" style="font-size: 11px; color: #aaa; margin-left: 8px; cursor: pointer; text-decoration: underline;">(AI Reasoning)</span>`;
  content += `</div>`;
  
  // Decision detail section (structured lines)
  content += `<div class="adt-std-section">`;
  content += `<div class="adt-std-sec-h">Decision Detail</div>`;
  content += `<div class="adt-std-sec-body">`;
  
  // Goal line
  const goal = determineGoal(roll, faces, keptMask);
  content += `<div class="adt-std-line">`;
  content += `<span class="adt-std-line-label">Goal:</span>`;
  content += `<span class="adt-std-line-value">${goal}</span>`;
  content += `</div>`;
  
  // Dice Kept line
  content += `<div class="adt-std-line">`;
  content += `<span class="adt-std-line-label">Dice Kept:</span>`;
  const keptFaces = keptIndices.map(i=> faces[i]).filter(f=> f!==undefined);
  if (keptFaces.length > 0) {
    content += `<span class="adt-std-line-value kept">`;
    keptFaces.forEach(face => {
      const symbol = renderLegacyMiniDie(face, true);
      content += symbol;
    });
    content += `</span>`;
  } else {
    content += `<span class="adt-std-line-value"><span style="opacity:.5;">None</span></span>`;
  }
  content += `</div>`;
  
  // Decision line
  const decision = (roll.action ? roll.action.toUpperCase() : (rollNumber < totalRolls ? 'REROLL' : 'KEEP'));
  content += `<div class="adt-std-line">`;
  content += `<span class="adt-std-line-label">Decision:</span>`;
  content += `<span class="adt-std-decision-pill">${decision}</span>`;
  content += `</div>`;
  
  // Confidence line
  const confidence = calculateConfidence(roll);
  const confClass = confidence >= 80 ? 'high' : confidence >= 50 ? 'med' : 'low';
  content += `<div class="adt-std-line">`;
  content += `<span class="adt-std-line-label">Confidence in Decision:</span>`;
  content += `<span class="adt-std-confidence-pill ${confClass}">${confidence}%</span>`;
  content += `</div>`;
  
  // Justification
  if (roll.english || roll.rationale) {
    content += `<div class="adt-std-line just-label">`;
    content += `<span class="adt-std-line-label">Justification:</span>`;
    content += `</div>`;
    content += `<div class="adt-std-just-text">${roll.english || roll.rationale || 'Standard play strategy.'}</div>`;
  }
  
  content += `</div>`; // close adt-std-sec-body
  content += `</div>`; // close adt-std-section
  
  // Roll Odds section
  if (rollNumber < totalRolls) {
    content += renderStandardRollOdds(roll, goal, faces, keptMask);
  }
  
  content += `</div>`; // close adt-std-roll
  
  return content;
}

function renderStandardRollOdds(roll, goal, faces, keptMask) {
  const unkeptCount = keptMask.filter(k => !k).length;
  
  let content = `<div class="adt-std-prob-chart">`;
  content += `<div class="adt-std-sec-h">Roll Odds <span style="font-weight:400;font-size:10px;opacity:.7;">(chances of desired outcome)</span></div>`;
  
  // Calculate odds for the goal
  const odds = calculateGoalOdds(goal, faces, keptMask);
  content += `<div class="adt-std-prob-row">`;
  content += `<div class="adt-std-prob-label"><span>${goal}</span></div>`;
  content += `<div class="adt-std-prob-bar-wrap"><div class="adt-std-prob-bar" style="width: ${odds}%"></div></div>`;
  content += `<div class="adt-std-prob-val">${odds}%</div>`;
  content += `</div>`;
  
  content += `</div>`;
  
  return content;
}

// Legacy mini-die renderer (inline span elements for kept dice display in lines)
function renderLegacyMiniDie(face, kept) {
  if (!face && face !== 0) return '';
  const mapWord = f => {
    const l = (''+f).toLowerCase();
    if (l==='one') return '1'; if (l==='two') return '2'; if (l==='three') return '3';
    if (l==='heal') return 'heart';
    if (l==='claw') return 'attack';
    return f;
  };
  const norm = mapWord(face);
  const display = ({'attack':'🗡️','energy':'⚡','heart':'❤'}[norm]) || (''+norm).toUpperCase();
  const cls = `adt-std-die face-${norm}${kept?' kept':''}`;
  return `<span class="${cls}" data-face="${norm}">${display}</span>`;
}

// After standard view is rendered, bind collapse handlers and render dice
function bindStandardHandlers(container, root) {
  if (!container) return;
  
  // Collapse/expand handlers for rounds
  container.querySelectorAll('.adt-std-round-header').forEach(header => {
    header.addEventListener('click', () => {
      const round = header.closest('.adt-std-round');
      if (round) round.classList.toggle('collapsed');
    });
  });
  
  // Collapse/expand handlers for turns
  container.querySelectorAll('.adt-std-turn-header').forEach(header => {
    header.addEventListener('click', () => {
      const turn = header.closest('.adt-std-turn');
      if (turn) turn.classList.toggle('collapsed');
    });
  });
  
  // Attach interactive reasoning handlers (makes rolls clickable)
  const gameConfig = getAIConfig();
  attachReasoningHandlers(container, gameConfig);
  
  // Render dice client-side (legacy pattern)
  container.querySelectorAll('.adt-std-dice[data-dice]')?.forEach(dc => {
    try {
      const faces = JSON.parse(dc.getAttribute('data-dice')) || [];
      const kept = JSON.parse(dc.getAttribute('data-kept') || '[]');
      
      if (Array.isArray(faces) && faces.length) {
        renderDiceInContainer(dc, faces, kept);
      }
    } catch(e) {
      console.warn('[ai-decision-tree] dice render error', e);
    }
  });
}

// Render dice as .adt-std-die elements in container
function renderDiceInContainer(container, faces, keptIndices) {
  container.innerHTML = '';
  faces.forEach((face, index) => {
    const kept = keptIndices.includes(index);
    const mapWord = f => {
      const l = (''+f).toLowerCase();
      if (l==='one') return '1'; if (l==='two') return '2'; if (l==='three') return '3';
      if (l==='heal') return 'heart';
      if (l==='claw') return 'attack';
      return f;
    };
    const norm = mapWord(face);
    const display = ({'attack':'🗡️','energy':'⚡','heart':'❤'}[norm]) || (''+norm).toUpperCase();
    const cls = `adt-std-die face-${norm}${kept?' kept':''}`;
    
    const span = document.createElement('span');
    span.className = cls;
    span.setAttribute('data-face', norm);
    span.setAttribute('data-index', index);
    span.textContent = display;
    container.appendChild(span);
  });
}

// Helper functions
async function getMonsterIcon(playerName) {
  // Default icon mapping based on monster names
  const defaultIcons = {
    'KRAKEN': '🐙',
    'THE KING': '👑', 
    'CYBER BUNNY': '🐰',
    'GIGAZAUR': '🦕',
    'MEKA DRAGON': '🐲',
    'ALIENOID': '👽',
    'CYBERBUNNY': '🐰', // Alternative spelling
    'THE KING': '👑'
  };
  
  // Use AI config if available, otherwise fall back to defaults
  try {
    const monsterConfig = await getMonsterConfig(playerName);
    if (monsterConfig) {
      // Could add icon mapping to AI config in future
      return defaultIcons[playerName.toUpperCase()] || '👹';
    }
  } catch (e) {
    console.warn('[ai-decision-tree] Failed to get monster config', e);
  }
  
  return defaultIcons[playerName.toUpperCase()] || '👹';
}

// Synchronous version for immediate use (uses default icons)
function getMonsterIconSync(playerName) {
  const defaultIcons = {
    'KRAKEN': '🐙',
    'THE KING': '👑', 
    'CYBER BUNNY': '🐰',
    'GIGAZAUR': '🦕',
    'MEKA DRAGON': '🐲',
    'ALIENOID': '👽',
    'CYBERBUNNY': '🐰',
    'THE KING': '👑'
  };
  return defaultIcons[playerName.toUpperCase()] || '👹';
}

function getLegacyDiceSymbol(face) {
  const symbols = { '1': '1', '2': '2', '3': '3', 'claw': '⚔', 'heart': '♥', 'energy': '⚡' };
  return symbols[face] || face;
}

// Helper to render a dice icon in goal text
function renderDiceInGoal(face) {
  const faceClass = ['1','2','3'].includes(face) ? `face-${face}` : `face-${face}`;
  const display = ({'attack':'🗡️','claw':'🗡️','energy':'⚡','heart':'❤'}[face]) || face;
  return `<span class="adt-std-die ${faceClass}" data-face="${face}">${display}</span>`;
}

function determineGoal(roll, faces, keptMask) {
  // Prefer goal injected by service
  if (roll.goal && roll.goal.face) {
    const face = String(roll.goal.face);
    const count = (roll.goal.countAtSel || 0);
    if (['1','2','3'].includes(face)) {
      const diceIcon = renderDiceInGoal(face);
      if (count >=3) return diceIcon + ' Set';
      const needed = 3 - count;
      return `${diceIcon} x${needed} More`;
    }
    // Return face names with proper casing
    const faceMap = {
      'claw': 'Attack',
      'energy': 'Energy',
      'heart': 'Heal'
    };
    return faceMap[face.toLowerCase()] || face;
  }
  const keptFaces = faces.filter((face, index) => keptMask[index]);
  const counts = keptFaces.reduce((acc, face) => { acc[face] = (acc[face] || 0) + 1; return acc; }, {});
  
  // Check for triple pursuit
  for (const num of ['3', '2', '1']) {
    if (counts[num] >= 2) {
      const needed = 3 - counts[num];
      const diceIcon = renderDiceInGoal(num);
      return needed === 1 ? `${diceIcon} x3 More` : `${diceIcon} x${needed} More`;
    }
  }
  
  if (counts.claw >= 2) return 'Attack';
  if (counts.energy >= 2) return 'Energy';
  if (counts.heart >= 2) return 'Heal';
  
  return 'TBD';
}

function calculateConfidence(roll) {
  // Prefer provided confidence from service (0-1) -> percent
  if (typeof roll.confidence === 'number') {
    const pct = roll.confidence <= 1 ? roll.confidence * 100 : roll.confidence;
    return Math.min(100, Math.max(5, Math.round(pct)));
  }
  // Fallback legacy heuristic from score
  const score = parseFloat(roll.score) || 0;
  return Math.min(Math.max(Math.round(score * 20 + 40), 20), 90);
}

function calculateGoalOdds(goal, faces, keptMask) {
  // If service provided improvementChance use that
  if (typeof faces === 'object' && faces && faces.improvementChance) {
    return Math.round(faces.improvementChance * 100);
  }
  // Simplified static fallback
  if (typeof goal === 'string') {
    if (goal.includes('X3 MORE')) return 85;
    if (goal.includes('X2 MORE')) return 55;
    if (goal === 'ATTACK') return 70;
    if (goal === 'ENERGY') return 60;
    if (goal === 'HEAL') return 50;
  }
  return 30;
}

function generateActionSummary(rolls, playerName) {
  if (!rolls.length) return '';
  
  const lastRoll = rolls[rolls.length - 1];
  const actionPhrases = [
    `${playerName.toUpperCase()} WANTS - NOW TO UNLEASH A POWER CARD`,
    `${playerName.toUpperCase()} PRIORITIZES ENERGY ECONOMY THIS TURN`,
    `${playerName.toUpperCase()} KEEPS OPTIONS OPEN THIS OPENING ROLL`
  ];
  
  return actionPhrases[Math.floor(Math.random() * actionPhrases.length)];
}

function renderModernView(root, tree, container) {
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
    const turnsHTML = openR ? r.turns.map((t, tIndex)=>{
      const tKey = `${r.round}:${t.turn}`;
      const openT = localState.openTurns.has(tKey);
      const rollsFilteredStage = t.rolls.filter(roll => {
        if (!localState.includeHuman && !roll.isCpu) return false; // AI-only default
        // Always hide pre-rolls in both views
        if (roll.stage === 'pre') return false;
        return true;
      });
      const rollsHTML = openT ? rollsFilteredStage.filter(roll => passFilters(roll, search, activeTagFilter)).map(roll => renderRollNode(roll)).join('') : '';
      const consideredRolls = t.rolls.filter(rr => localState.includeHuman || rr.isCpu);
      const actualCount = consideredRolls.filter(rr=> rr.stage !== 'pre').length;
      const preCount = consideredRolls.filter(rr=> rr.stage === 'pre').length;
      // Calculate turn number within the round (1-based)
      const turnInRound = tIndex + 1;
      return `<div class="adt-turn">
        <div class="adt-turn-header" data-turn-header data-turn-key="${tKey}">
          <span class="caret ${openT?'open':''}"></span> Turn ${turnInRound} <span class="meta">(${actualCount} roll${actualCount!==1?'s':''}${localState.mode==='verbose' && preCount?`, +${preCount} pre`:''})</span>
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

async function renderStandardView(root, tree, container) {
  if (!tree.rounds.length){ 
    container.innerHTML = `<div class="adt-empty">No AI decisions yet.</div>`; 
    // Clear other elements for regular view
    const summaryEl = root.querySelector('[data-summary]');
    if (summaryEl) summaryEl.innerHTML = '';
    const tagFilterBar = root.querySelector('[data-tag-filters]');
    if (tagFilterBar) tagFilterBar.innerHTML = '';
    const legendEl = root.querySelector('[data-legend]');
    if (legendEl) legendEl.innerHTML = '';
    return; 
  }

  // Clear modern view elements
  const summaryEl = root.querySelector('[data-summary]');
  if (summaryEl) summaryEl.innerHTML = '';
  const tagFilterBar = root.querySelector('[data-tag-filters]');
  if (tagFilterBar) tagFilterBar.innerHTML = '';
  const legendEl = root.querySelector('[data-legend]');
  if (legendEl) legendEl.innerHTML = '';

  // Get filtered data
  const filteredRounds = tree.rounds.map(r => ({
    ...r,
    turns: r.turns
      .filter(t => t.turnNumber !== 0) // Hide turn 0
      .map(t => ({
        ...t,
        rolls: t.rolls.filter(roll => {
          if (!localState.includeHuman && !roll.isCpu) return false;
          // Always hide pre-rolls in standard view
          if (roll.stage === 'pre') return false;
          return localState.mode === 'verbose' ? true : roll.stage !== 'pre';
        }).filter(roll => passFilters(roll, localState.search, localState.tagFilter.size > 0))
      }))
      .filter(t => t.rolls.length > 0)
  })).filter(r => r.turns.length > 0);

  if (!filteredRounds.length) {
    container.innerHTML = `<div class="adt-empty">No matching decisions found.</div>`; 
    return;
  }

  // Render standard (legacy parity) layout - AWAIT async function
  container.innerHTML = await renderStandardLayout(filteredRounds);
  
  // Bind legacy-style handlers
  bindStandardHandlers(container, root);
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
  <span class="faces">${renderMiniDiceFaces(roll.faces)}${isPre?'<span class="pre-label">(pre)</span>':''}</span>
      <span class="origin-badge ${isHuman?'human':'ai'}" title="${isHuman?'Human':'AI'} turn">${isHuman?'H':'AI'}</span>
      <span class="score-badge">${roll.score}</span>
      ${roll.keptWhy && !isPre ? `<span class="why-badge" title="Why these dice were kept">${escapeHTML(roll.keptWhy)}</span>`:''}
      ${renderTagsInline(roll.tags)}
    </div>
    <div class="adt-roll-body" ${open?'':'style="display:none"'}>
      ${concise? '' : `<div class="rationale">${escapeHTML(roll.rationale || '—')}</div>`}
      ${renderKeptMask(roll)}
      ${!concise && roll.english ? `<div class="english-expl">${escapeHTML(roll.english)}</div>`:''}
      ${!concise && roll.hypotheticals && roll.hypotheticals.length ? renderHypotheticals(roll.hypotheticals) : ''}
    </div>
  </div>`;
}

function renderTagsInline(tags){
  if (!tags || !tags.length) return '<span class="tags empty">—</span>';
  return `<span class=\"tags\">${tags.map(t=>`<span class=\"tag\" data-tag=\"${t}\">${t}</span>`).join('')}</span>`;
}

function renderKeptMask(roll){
  if (!roll.keptMask || !roll.keptMask.length) return '';
  const faces = roll.faces ? roll.faces.split(',') : [];
  const items = faces.map((f,i)=>{
    const kept = !!roll.keptMask[i];
    const isNum = f==='1'||f==='2'||f==='3';
    const symbol = FACE_SYMBOLS[f] || f;
    return `<span class="keep-die ${kept?'is-kept':''} face-${f} ${isNum?'is-num':'is-icon'}" title="${kept?'Kept':'Reroll candidate'}">${symbol}</span>`;
  }).join('');
  return `<div class="kept-line"><span class="keep-label">Kept:</span> ${items}</div>`;
}

// Mini dice visuals: numbers -> black text in white circle; icons (claw/heart/energy) no background
const FACE_SYMBOLS = { '1': '1','2':'2','3':'3','claw':'🗡️','heart':'♥','energy':'⚡' };
function renderMiniDiceFaces(facesStr) {
  if (!facesStr) return '';
  const faces = facesStr.split(',');
  return `<span class="mini-dice-seq">${faces.map(f => {
    const isNum = f === '1' || f === '2' || f === '3';
    const cls = `mini-die face-${f} ${isNum? 'is-num':'is-icon'}`;
    return `<span class="${cls}">${FACE_SYMBOLS[f]||f}</span>`;
  }).join('')}</span>`;
}

function renderHypotheticals(list){
  const trimmed = list.slice(0,12);
  return `<details class="hypo"><summary>What-if (${list.length})</summary><div class="hypo-grid">${trimmed.map(h=>`<div class="hypo-item"><code>${h.to}</code><span>${h.estScore}</span></div>`).join('')}</div></details>`;
}

function escapeHTML(str){
  return str.replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]||c));
}

// ============== STANDARD VIEW NARRATIVE HELPERS ==============

// Cache for loaded phrases
let phrasesCache = null;

// Load phrases from JSON file
async function loadPhrases() {
  if (phrasesCache) return phrasesCache;
  try {
    const response = await fetch('./config/ai-phrases.json');
    phrasesCache = await response.json();
    return phrasesCache;
  } catch (e) {
    console.warn('[loadPhrases] Failed to load ai-phrases.json:', e);
    return { openingIntent: {} };
  }
}

// Build opening intent narrative based on player personality and game state
async function buildOpeningIntentNarrative(turn, gameState) {
  try {
    const phrases = await loadPhrases();
    const templates = phrases.openingIntent || {};
    
    // Get player name from the first roll
    const playerName = turn.rolls?.[0]?.playerName || 'Player';
    
    // Find player from gameState using playerId from first roll
    const playerId = turn.rolls?.[0]?.playerId;
    const player = playerId ? gameState?.players?.find(p => p.id === playerId) : null;
    const profile = player?.monster?.profile || {};
    
    // Personality traits (fallback to moderate values)
    const aggression = profile.aggression ?? 2;
    const strategy = profile.strategy ?? 2;
    const risk = profile.risk ?? 2;
    
    // Current state
    const health = player?.health ?? 10;
    const energy = player?.energy ?? 0;
    const vp = player?.victoryPoints ?? 0;
    
    // Analyze opponents
    const opponents = gameState?.players?.filter(p => p.id !== player?.id) || [];
    const lowHealthOpponentInTokyo = opponents.find(o => o.isInTokyo && o.health <= 3);
    
    // Determine focus priorities
    const wantsHeal = health <= 4;
    const wantsEnergy = energy <= 2 || strategy >= 4;
    const wantsAttack = aggression >= 4 || !!lowHealthOpponentInTokyo;
    const wantsPoints = vp < 10 && strategy >= 3 && !wantsHeal && !wantsAttack && !wantsEnergy;
    
    // Pick primary focus
    let focus = 'explore';
    let templateKey = 'explore';
    if (wantsHeal) {
      focus = 'heal';
      templateKey = 'heal';
    } else if (wantsAttack) {
      focus = 'attack';
      // Use special template if there's a weak opponent
      templateKey = lowHealthOpponentInTokyo ? 'attackWeakOpponent' : 'attack';
    } else if (wantsEnergy) {
      focus = 'energy';
      templateKey = 'energy';
    } else if (wantsPoints) {
      focus = 'points';
      templateKey = 'points';
    }
    
    // Icon helper
    const icon = (f) => {
      switch(f) {
        case 'attack': return '🗡️';
        case 'energy': return '⚡';
        case 'heal': return '❤';
        case 'points': return '3';
        default: return '';
      }
    };
    const repeatIcons = (f, n) => new Array(n).fill(icon(f)).join('');
    
    // Get template pool
    const pool = templates[templateKey] || templates.explore || [];
    if (pool.length === 0) {
      return `${playerName} is ready to roll.`;
    }
    
    // Pick random template
    let template = pool[Math.floor(Math.random() * pool.length)];
    
    // Replace placeholders
    template = template.replace(/\{playerName\}/g, playerName);
    if (lowHealthOpponentInTokyo) {
      template = template.replace(/\{opponent\}/g, lowHealthOpponentInTokyo.monster?.name || 'opponent');
    }
    
    // Replace icon patterns {icons:type:count}
    template = template.replace(/\{icons:(\w+):(\d+)\}/g, (match, type, count) => {
      return repeatIcons(type, parseInt(count, 10));
    });
    
    return template;
  } catch (e) {
    console.warn('[buildOpeningIntentNarrative] error:', e);
    return '';
  }
}

// Build turn chain narrative summarizing the roll sequence
function buildTurnChainNarrative(turn) {
  try {
    if (!turn.rolls || turn.rolls.length < 2) return '';
    
    const segments = [];
    const simplify = (txt) => (txt || '')
      .replace(/(Continuing|Chasing|Maintaining)[:]?/gi, '')
      .replace(/First-roll exploration/ig, 'exploring early upside')
      .trim();
    
    turn.rolls.forEach((r, i) => {
      // Parse faces from comma-separated string
      const faces = r.faces ? r.faces.split(',').filter(f => f != null && f !== '') : [];
      
      // Get kept indices (may come from keptIndices or keptMask)
      let keptIndices = Array.isArray(r.keptIndices) ? r.keptIndices.slice() : [];
      if (!keptIndices.length && r.keptMask && r.keptMask.length) {
        r.keptMask.forEach((k, idx) => { if (k) keptIndices.push(idx); });
      }
      
      const keptFaces = keptIndices.map(idx => faces[idx]).filter(f => f !== undefined && f !== '');
      const keptHTML = keptFaces.length
        ? keptFaces.map(f => renderLegacyMiniDie(f, true)).join('')
        : 'nothing';
      const action = (r.action || 'reroll').toLowerCase();
      const reason = simplify(r.reason || r.rationale || r.english || '');
      
      if (i === 0) {
        segments.push(`Opened keeping ${keptHTML}${reason ? ` (${reason})` : ''}`);
      } else {
        const connector = ['then', 'next', 'afterwards', 'finally'][(i - 1) % 4];
        segments.push(`${connector} kept ${keptHTML} to ${action}${reason ? ` (${reason})` : ''}`);
      }
    });
    
    return `<strong>Roll Sequence:</strong> ${segments.join(', ')}.`;
  } catch (e) {
    console.warn('[buildTurnChainNarrative] error:', e);
    return '';
  }
}
