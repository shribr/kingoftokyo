import { store } from '../../bootstrap/index.js';
import { scenarioConfigUpdated, scenarioApplyRequest } from '../../core/actions.js';
import { listScenarios, getScenario } from '../../scenarios/catalog.js';
import { captureScenarioState, restoreScenarioState } from '../../services/scenarioService.js';

export function build(ctx) {
  const root = document.createElement('div');
  root.className = 'cmp-scenarios-tab';
  root.innerHTML = template();
  bind(root);
  sync(root);
  return { root, update: () => sync(root) };
}

function template(){
  const scenarios = listScenarios();
  return `<h3 class="scenario-heading">Scenario Configuration</h3>
  <p class="scenario-description">
    <strong>Step 1:</strong> Select scenarios below and choose who they apply to (Human, CPUs, or Both).<br/>
    <strong>Step 2:</strong> Click "Add to List" to add them to your assignment table.<br/>
    <strong>Step 3:</strong> Click "Apply Scenarios to Game" to activate all assignments (or they auto-apply when game is running).
  </p>
  <div class="scenario-list">
    ${scenarios.map(s=>`<label>
      <input type='checkbox' data-scenario-id='${s.id}' />
      <span><strong>${s.label}</strong><br/><span style='opacity:.65;font-size:11px;'>${s.description}</span></span>
    </label>`).join('')}
  </div>
  <div class="param-editor" data-param-editor></div>
  <div class='target-mode-wrapper'>
    <label class='target-mode-label'>Target
      <select class='scenario-select' data-target-mode>
        <option value='HUMAN'>👤 Human</option>
        <option value='CPUS'>🤖 CPUs</option>
        <option value='BOTH'>👤 + 🤖 Both</option>
      </select>
    </label>
    <label class='cpu-count-label' data-cpu-count-wrapper>CPU Count
      <select class='scenario-select' data-cpu-count>
        ${[1,2,3,4,5].map(n=>`<option value='${n}'>${n}</option>`).join('')}
      </select>
    </label>
    <div class='button-group'>
      <button type='button' class='scenario-btn scenario-btn-primary' data-apply-selected>Add to List</button>
      <button type='button' class='scenario-btn scenario-btn-danger' data-clear>Clear All</button>
    </div>
  </div>
  <h4 class="scenario-heading" style="margin: 16px 0 8px; font-size: 12px;">Scenario Assignments</h4>
  <div class='applied-list' data-applied></div>
  <div class='action-buttons'>
    <button type='button' class='scenario-btn scenario-btn-primary' data-run-game>Apply Scenarios to Game</button>
    <button type='button' class='scenario-btn scenario-btn-danger' data-generate-scenario-game>Start New Game with Scenarios</button>
    <button type='button' class='scenario-btn scenario-btn-secondary' data-snapshot>Save Snapshot</button>
    <button type='button' class='scenario-btn scenario-btn-secondary' data-restore disabled>Restore Snapshot</button>
  </div>
  <div class='summary-panel' data-summary></div>`;
}

function bind(root){
  const modeSelect = () => root.querySelector('[data-target-mode]');
  const cpuCountWrapper = () => root.querySelector('[data-cpu-count-wrapper]');
  const cpuCountSelect = () => root.querySelector('[data-cpu-count]');

  root.addEventListener('change', e => {
    if (e.target.matches('[data-target-mode]')) {
      const v = e.target.value;
      const wrapper = cpuCountWrapper();
      if (v === 'HUMAN') {
        wrapper.classList.remove('is-visible');
      } else {
        wrapper.classList.add('is-visible');
      }
      // Recompute disabled scenarios for new mode selection
      applyScenarioUniquenessDisables(root);
    }
    if (e.target.matches('[data-scenario-id]')) {
      updateParamEditor(root);
    }
    if (e.target.closest('[data-param-editor]')) {
      // Live update of displayed values only; stored on Add Assignment
    }
  });

  root.addEventListener('click', e => {
    if (e.target.matches('[data-clear]')) {
      // Uncheck all scenario selection boxes
      root.querySelectorAll('[data-scenario-id]').forEach(cb => cb.checked = false);
      // Clear configured assignments in settings
      try { store.dispatch(scenarioConfigUpdated({ assignments: [] })); } catch(_) {}
      // Refresh applied list UI
      sync(root);
      // Notify settings modal of change
      notifySettingsChange(root);
    }
    if (e.target.matches('[data-apply-selected]')) {
      let selected = [...root.querySelectorAll('[data-scenario-id]:checked')].map(cb=>cb.getAttribute('data-scenario-id'));
      if (!selected.length) return;
      const mode = modeSelect().value; // HUMAN | CPUS | BOTH
      let cpuCount = 0;
      if (mode !== 'HUMAN') {
        cpuCount = parseInt(cpuCountSelect().value, 10) || 1;
      }
      // Enforce uniqueness per target mode: filter out already-assigned scenarios for same mode
      const stPre = store.getState();
      const existing = (stPre.settings?.scenarioConfig?.assignments||[]).filter(a=>a.mode===mode);
      const already = new Set();
      existing.forEach(a => (a.scenarioIds||[]).forEach(id => already.add(id)));
      selected = selected.filter(id => !already.has(id));
      if (!selected.length) {
        // Nothing new to add; exit gracefully
        return;
      }
      // Gather parameter values per scenario
      const paramsByScenario = {};
      selected.forEach(id => {
        const sc = getScenario(id);
        if (sc && sc.params) {
          paramsByScenario[id] = {};
          Object.keys(sc.params).forEach(pKey => {
            const input = root.querySelector(`[data-param-input="${id}:${pKey}"]`);
            if (input) {
              const schema = sc.params[pKey];
              if (schema.type === 'number') {
                paramsByScenario[id][pKey] = parseInt(input.value, 10);
              } else if (schema.type === 'cardlist') {
                // Gather selected card IDs from checkboxes
                const checkboxes = input.querySelectorAll('.card-checkbox:checked');
                paramsByScenario[id][pKey] = Array.from(checkboxes).map(cb => cb.value);
              } else {
                paramsByScenario[id][pKey] = input.value;
              }
            }
          });
        }
      });
      const st = store.getState();
      const assignments = st.settings?.scenarioConfig?.assignments ? [...st.settings.scenarioConfig.assignments] : [];
      assignments.push({ mode, cpuCount, scenarioIds: selected, paramsByScenario });
      store.dispatch(scenarioConfigUpdated({ assignments }));
      sync(root);
      // Notify settings modal of change
      notifySettingsChange(root);
      // Real-time application: if game already started (phase != SETUP), apply immediately
      try {
        const stNow = store.getState();
        if (stNow.phase && stNow.phase !== 'SETUP') {
          // Expand dynamic targets same as launchScenarioApplication logic but inline to avoid duplicate apply UI step
          const order = stNow.players.order; const byId = stNow.players.byId;
          const humanId = order.find(pid => !byId[pid].isCPU);
          const cpuIds = order.filter(pid => byId[pid].isCPU);
          const expanded = [];
          const rawAssignments = stNow.settings?.scenarioConfig?.assignments || [];
          rawAssignments.map(a => normalizeAssignment(a, { humanId, cpuIds })).forEach(a => {
            const chosenCpuIds = cpuIds.slice(0, Math.min(a.cpuCount || 0, cpuIds.length));
            if (a.mode === 'HUMAN' && humanId) expanded.push({ playerId: humanId, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario });
            else if (a.mode === 'CPUS') chosenCpuIds.forEach(id => expanded.push({ playerId: id, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario }));
            else if (a.mode === 'BOTH') {
              if (humanId) expanded.push({ playerId: humanId, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario });
              chosenCpuIds.forEach(id => expanded.push({ playerId: id, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario }));
            }
          });
          // Merge duplicates per player including params
          const mergedMap = new Map();
          expanded.forEach(entry => {
            if (!mergedMap.has(entry.playerId)) mergedMap.set(entry.playerId, { playerId: entry.playerId, scenarioIds: [], paramsByScenario: {} });
            const slot = mergedMap.get(entry.playerId);
            entry.scenarioIds.forEach(id => { if (!slot.scenarioIds.includes(id)) slot.scenarioIds.push(id); });
            if (entry.paramsByScenario) Object.assign(slot.paramsByScenario, entry.paramsByScenario);
          });
          const finalList = [...mergedMap.values()];
          store.dispatch(scenarioApplyRequest(finalList));
        }
      } catch(e) { console.warn('Real-time scenario apply failed', e); }
      // Update disables after adding
      applyScenarioUniquenessDisables(root);
    }
    if (e.target.matches('[data-run-game]')) {
      launchScenarioApplication();
    }
    if (e.target.matches('[data-generate-scenario-game]')) {
      generateNewScenarioGame();
    }
    if (e.target.matches('[data-snapshot]')) {
      window.__KOT_SCENARIO_SNAPSHOT__ = captureScenarioState(store);
      e.target.textContent = 'Snapshot Captured';
      const restoreBtn = root.querySelector('[data-restore]');
      if (restoreBtn) restoreBtn.disabled = false;
      setTimeout(()=>{ e.target.textContent = 'Capture Snapshot'; }, 1400);
    }
    if (e.target.matches('[data-restore]')) {
      if (window.__KOT_SCENARIO_SNAPSHOT__) {
        restoreScenarioState(store, window.__KOT_SCENARIO_SNAPSHOT__);
      }
    }
  });
}

function sync(root){
  const st = store.getState();
  const appliedEl = root.querySelector('[data-applied]');
  const rawAssignments = st.settings?.scenarioConfig?.assignments || [];
  // Normalize any legacy assignments into new shape for rendering only (does not persist)
  const order = st.players?.order || [];
  const byId = st.players?.byId || {};
  const humanId = order.find(pid => !byId[pid]?.isCPU);
  const cpuIds = order.filter(pid => byId[pid]?.isCPU);
  const norm = rawAssignments.map(a => normalizeAssignment(a, { humanId, cpuIds }));
  
  if (!norm.length) {
    appliedEl.className = 'applied-list empty';
    appliedEl.innerHTML = 'No scenario assignments yet.';
  } else {
    appliedEl.className = 'applied-list';
    appliedEl.innerHTML = `
      <table class='assignment-table'>
        <thead>
          <tr>
            <th>Target</th>
            <th>Scenario</th>
            <th>Categories</th>
            <th>Remove</th>
          </tr>
        </thead>
        <tbody>
          ${norm.map((a,assignmentIdx)=>{
            const label = describeAssignmentLabel(a);
            
            // Create a row for each scenario in this assignment
            return a.scenarioIds.map((scId, scIdx) => {
              const sc = getScenario(scId);
              const scenarioLabel = sc ? sc.label : scId;
              
              // Get categories for this specific scenario
              const categoryBadges = (sc && sc.category) ? sc.category.map(cat => {
                const emoji = cat === 'health' ? '❤️' : cat === 'energy' ? '⚡' : cat === 'vp' ? '⭐' : cat === 'cards' ? '🃏' : '?';
                return `<span class="category-badge" title="${cat}">${emoji}</span>`;
              }).join(' ') : '—';
              
              return `<tr data-assignment-idx='${assignmentIdx}' data-scenario-idx='${scIdx}' data-scenario-id='${scId}'>
                <td class='target-cell'>${label}</td>
                <td class='scenario-cell'>${scenarioLabel}</td>
                <td class='category-cell'>${categoryBadges}</td>
                <td class='remove-cell'>
                  <button class='scenario-btn scenario-btn-remove' data-remove-scenario='${assignmentIdx}:${scIdx}' title='Remove this scenario'>✕</button>
                </td>
              </tr>`;
            }).join('');
          }).join('')}
        </tbody>
      </table>
    `;
  }
  
  // Update remove button handlers to remove individual scenarios
  appliedEl.querySelectorAll('[data-remove-scenario]').forEach(btn=>{
    btn.addEventListener('click', () => {
      const indices = btn.getAttribute('data-remove-scenario').split(':');
      const assignmentIdx = parseInt(indices[0], 10);
      const scenarioIdx = parseInt(indices[1], 10);
      const st2 = store.getState();
      const list = JSON.parse(JSON.stringify(st2.settings?.scenarioConfig?.assignments || []));
      
      // Remove the specific scenario from the assignment
      if (list[assignmentIdx] && list[assignmentIdx].scenarioIds) {
        list[assignmentIdx].scenarioIds.splice(scenarioIdx, 1);
        
        // If this was the last scenario in the assignment, remove the entire assignment
        if (list[assignmentIdx].scenarioIds.length === 0) {
          list.splice(assignmentIdx, 1);
        }
      }
      
      store.dispatch(scenarioConfigUpdated({ assignments: list }));
      sync(root);
      // Notify settings modal of change
      notifySettingsChange(root);
    });
  });
  
  // Keep old remove-assignment handler for backward compatibility
  appliedEl.querySelectorAll('[data-remove-assignment]').forEach(btn=>{
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-remove-assignment'),10);
      const st2 = store.getState();
      const list = [...(st2.settings?.scenarioConfig?.assignments||[])];
      list.splice(idx,1);
      store.dispatch(scenarioConfigUpdated({ assignments: list }));
      sync(root);
      // Notify settings modal of change
      notifySettingsChange(root);
    });
  });
  const summaryEl = root.querySelector('[data-summary]');
  if (summaryEl) {
    summaryEl.innerHTML = renderSummary(norm) + renderUniquenessHint();
  }
  // Apply disables after sync (mode might not have changed)
  applyScenarioUniquenessDisables(root);
}

function launchScenarioApplication(){
  const st = store.getState();
  const rawAssignments = st.settings?.scenarioConfig?.assignments || [];
  if (!rawAssignments.length) return;
  const order = st.players.order;
  const byId = st.players.byId;
  const humanId = order.find(pid => !byId[pid].isCPU);
  const cpuIds = order.filter(pid => byId[pid].isCPU);
  const expanded = [];
  rawAssignments.map(a => normalizeAssignment(a, { humanId, cpuIds })).forEach(a => {
    const chosenCpuIds = cpuIds.slice(0, Math.min(a.cpuCount || 0, cpuIds.length));
    if (a.mode === 'HUMAN' && humanId) {
      expanded.push({ playerId: humanId, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario });
    } else if (a.mode === 'CPUS') {
      chosenCpuIds.forEach(id => expanded.push({ playerId: id, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario }));
    } else if (a.mode === 'BOTH') {
      if (humanId) expanded.push({ playerId: humanId, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario });
      chosenCpuIds.forEach(id => expanded.push({ playerId: id, scenarioIds: a.scenarioIds, paramsByScenario: a.paramsByScenario }));
    }
  });
  // Merge duplicates (same playerId) scenario lists including params
  const mergedMap = new Map();
  expanded.forEach(entry => {
    if (!mergedMap.has(entry.playerId)) mergedMap.set(entry.playerId, { playerId: entry.playerId, scenarioIds: [], paramsByScenario: {} });
    const slot = mergedMap.get(entry.playerId);
    entry.scenarioIds.forEach(id => { if (!slot.scenarioIds.includes(id)) slot.scenarioIds.push(id); });
    if (entry.paramsByScenario) Object.assign(slot.paramsByScenario, entry.paramsByScenario);
  });
  const finalList = [...mergedMap.values()];
  store.dispatch(scenarioApplyRequest(finalList));
}

function generateNewScenarioGame(){
  try {
    const st = store.getState();
    const assignments = st.settings?.scenarioConfig?.assignments || [];
    if (!assignments.length) {
      alert('Add at least one scenario assignment first.');
      return;
    }
    // Ensure current settings (including scenarioConfig) are persisted
    try {
      const settings = st.settings;
      localStorage.setItem('kot_new_settings_v1', JSON.stringify(settings));
    } catch(_) {}
    // Set temporary flags to trigger skipIntro path and allow bootstrap to clean up
    localStorage.setItem('KOT_SKIP_INTRO','1');
    localStorage.setItem('KOT_SCENARIO_GENERATOR','1');
    // Reload page to re-run full bootstrap (ensuring monster auto-seed, first player assignment, game start)
    window.location.reload();
  } catch(e) {
    console.warn('Scenario generator failed', e);
  }
}

function renderSummary(assignments){
  if (!assignments.length) return '<strong>Scenario Summary</strong><br/><em style="opacity:.6;">No assignments configured.</em>';
  const parts = ['<strong>Scenario Summary</strong>'];
  assignments.forEach(a => {
    const label = describeAssignmentLabel(a);
    const scs = a.scenarioIds.map(id => getScenario(id)).filter(Boolean);
    parts.push(`<div style='margin-top:6px;'><div style='font-size:11px;color:#9ac;'>Targets: <code>${label}</code></div>`);
    scs.forEach(sc => {
      const bullets = (sc.bullets || []).map(b=>`<li>${b}</li>`).join('');
      // Show param overrides if present
      let paramLine = '';
      if (a.paramsByScenario && a.paramsByScenario[sc.id]) {
        const entries = Object.entries(a.paramsByScenario[sc.id]).map(([k,v])=>`${k}=${v}`).join(', ');
        if (entries) paramLine = `<div style='opacity:.65;font-size:10px;'>Params: ${entries}</div>`;
      }
      parts.push(`<div style='margin:4px 0 4px 6px;'><div style='font-weight:600;'>${sc.label}</div><div style='opacity:.7;font-size:10px;'>${sc.description}</div>${paramLine}${bullets?`<ul style='margin:4px 0 0 14px;padding:0 0 0 4px;'>${bullets}</ul>`:''}</div>`);
    });
    parts.push('</div>');
  });
  return parts.join('');
}

// Helpers
function normalizeAssignment(a, { humanId, cpuIds }) {
  if (a.mode) return a; // already new shape
  // Legacy shapes:
  // 1. { targets: [...] }
  // 2. { target: '__HUMAN__' | '__CPUS__' }
  if (a.targets) {
    const t = a.targets;
    const hasHuman = t.includes('__HUMAN__');
    const cpuLike = t.filter(x => x === '__CPUS__' || x === '__EACH_CPU__' || x === '__RANDOM_CPU__');
    if (hasHuman && cpuLike.length) return { mode: 'BOTH', cpuCount: cpuIds.length || 0, scenarioIds: a.scenarioIds };
    if (hasHuman) return { mode: 'HUMAN', cpuCount: 0, scenarioIds: a.scenarioIds };
    if (cpuLike.length) {
      let count = cpuIds.length;
      if (t.includes('__RANDOM_CPU__')) count = 1;
      return { mode: 'CPUS', cpuCount: count, scenarioIds: a.scenarioIds };
    }
  }
  if (a.target) {
    if (a.target === '__HUMAN__') return { mode: 'HUMAN', cpuCount: 0, scenarioIds: a.scenarioIds };
    if (a.target === '__CPUS__') return { mode: 'CPUS', cpuCount: cpuIds.length || 0, scenarioIds: a.scenarioIds };
  }
  // Fallback treat as human only
  return { mode: 'HUMAN', cpuCount: 0, scenarioIds: a.scenarioIds };
}

function describeAssignmentLabel(a){
  if (a.mode === 'HUMAN') return '👤';
  if (a.mode === 'CPUS') return `🤖 x${a.cpuCount || 0}`;
  if (a.mode === 'BOTH') return `👤 + 🤖 x${a.cpuCount || 0}`;
  return '?';
}

function initializeCardSelectors(root, selectedScenarios) {
  // Import card catalog
  import('../../domain/cards.js').then(mod => {
    const catalog = mod.buildBaseCatalog();
    const keepCards = catalog.filter(c => c.type === 'keep');
    
    selectedScenarios.forEach(scId => {
      const sc = getScenario(scId);
      if (!sc || !sc.params) return;
      
      Object.entries(sc.params).forEach(([paramKey, schema]) => {
        if (schema.type !== 'cardlist') return;
        
        const wrapper = root.querySelector(`[data-param-input="${scId}:${paramKey}"]`);
        if (!wrapper) return;
        
        // Create card selection grid
        const selectedCards = new Set();
        
        wrapper.innerHTML = keepCards.map(card => {
          const emoji = typeof card.emoji === 'string' ? card.emoji : '🃏';
          return `
            <label class="card-select-item" style="display:inline-flex;align-items:center;gap:4px;padding:4px 6px;margin:2px;background:#252525;border-radius:4px;cursor:pointer;user-select:none;transition:background 0.2s;" data-card-id="${card.id}">
              <input type="checkbox" class="card-checkbox" value="${card.id}" style="margin:0;">
              <span style="font-size:14px;">${emoji}</span>
              <span style="font-size:10px;">${card.name}</span>
            </label>
          `;
        }).join('');
        
        // Add event listeners for highlighting
        wrapper.querySelectorAll('.card-select-item').forEach(label => {
          const checkbox = label.querySelector('input');
          checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
              label.style.background = '#3a4a3a';
              label.style.borderLeft = '3px solid #4caf50';
            } else {
              label.style.background = '#252525';
              label.style.borderLeft = 'none';
            }
          });
        });
      });
    });
  }).catch(err => {
    console.error('Failed to load card catalog:', err);
  });
}

function updateParamEditor(root){
  const editor = root.querySelector('[data-param-editor]');
  const selected = [...root.querySelectorAll('[data-scenario-id]:checked')].map(cb=>cb.getAttribute('data-scenario-id'));
  if (!selected.length) { 
    editor.classList.remove('is-visible');
    editor.innerHTML=''; 
    return; 
  }
  const blocks = [];
  selected.forEach(id => {
    const sc = getScenario(id);
    if (!sc || !sc.params) return;
    const paramInputs = Object.entries(sc.params).map(([key,schema])=>{
      const baseAttrs = `data-param-input="${id}:${key}" name="${id}:${key}"`; 
      if (schema.type === 'number') {
        return `<label style='display:flex;flex-direction:column;gap:2px;'>${schema.label}<input type='number' ${baseAttrs} value='${schema.default}' min='${schema.min}' max='${schema.max}' step='${schema.step||1}' style='background:#1a1a1a;color:#ddd;border:1px solid #333;padding:2px 4px;font-size:11px;border-radius:4px;'/></label>`;
      } else if (schema.type === 'cardlist') {
        return `<div style='display:flex;flex-direction:column;gap:4px;width:100%;'><label style='font-weight:600;font-size:11px;'>${schema.label}</label><div ${baseAttrs} class='card-selector-wrapper' style='background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:8px;max-height:200px;overflow-y:auto;'></div><div style='font-size:10px;opacity:0.7;margin-top:2px;'>💡 Leave empty to get random cards, or select specific cards below</div></div>`;
      }
      return '';
    }).join('<div style="width:8px;"></div>');
    if (paramInputs) blocks.push(`<div style='display:flex;flex-wrap:wrap;gap:10px;margin:4px 0 6px;padding:6px 8px;border:1px solid #252525;background:#181818;border-radius:4px;'><div style='font-weight:600;font-size:11px;width:100%;'>${sc.label}</div>${paramInputs}</div>`);
  });
  if (!blocks.length) { 
    editor.classList.remove('is-visible');
    editor.innerHTML=''; 
    return; 
  }
  editor.classList.add('is-visible');
  editor.innerHTML = `<div style='font-weight:600;margin-bottom:4px;'>Parameters</div>${blocks.join('')}`;
  
  // Initialize card selectors
  initializeCardSelectors(root, selected);
}

// Uniqueness enforcement helpers
function applyScenarioUniquenessDisables(root){
  try {
    const modeSel = root.querySelector('[data-target-mode]');
    if (!modeSel) return;
    const mode = modeSel.value; // current chosen mode
    const st = store.getState();
    const existing = (st.settings?.scenarioConfig?.assignments||[]).filter(a=>a.mode===mode);
    const used = new Set();
    existing.forEach(a => (a.scenarioIds||[]).forEach(id => used.add(id)));
    root.querySelectorAll('[data-scenario-id]').forEach(cb => {
      const id = cb.getAttribute('data-scenario-id');
      if (used.has(id)) {
        cb.disabled = true;
        cb.parentElement.style.opacity = '.45';
        cb.parentElement.title = 'Already assigned for this target';
        cb.checked = false; // ensure not lingering in selection
      } else {
        cb.disabled = false;
        cb.parentElement.style.opacity = '';
        cb.parentElement.removeAttribute('title');
      }
    });
  } catch(_) {}
}

function renderUniquenessHint(){
  return `<div style='margin-top:8px;opacity:.55;font-size:10px;'>Scenarios already assigned for the selected target are disabled.</div>`;
}

// Notify settings modal of scenario configuration changes
function notifySettingsChange(root) {
  try {
    console.log('[Scenarios] Dispatching scenario-config-changed event from:', root);
    // Bubble up event to parent settings modal
    const event = new CustomEvent('scenario-config-changed', { bubbles: true });
    root.dispatchEvent(event);
    console.log('[Scenarios] Event dispatched successfully');
  } catch(e) {
    console.warn('[Scenarios] Failed to notify settings change:', e);
  }
}
