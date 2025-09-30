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
  return `<h3 style="margin:0 0 8px;font-family:system-ui;letter-spacing:.5px;">Scenario Options</h3>
  <p style="margin:0 0 10px;font-size:12px;opacity:.75;line-height:1.4;">Select one or more scenarios, choose a target group (👤 Human, 🤖 CPUs, or 👤+🤖 Both) then optionally choose how many CPU players (1-5) to include.</p>
  <div class="scenario-list" style="display:grid;gap:6px;margin-bottom:10px;">
    ${scenarios.map(s=>`<label style='display:flex;gap:6px;align-items:flex-start;font-size:13px;'>
      <input type='checkbox' data-scenario-id='${s.id}' />
      <span><strong>${s.label}</strong><br/><span style='opacity:.65;font-size:11px;'>${s.description}</span></span>
    </label>`).join('')}
  </div>
  <div data-param-editor style='display:none;margin:-4px 0 10px;padding:8px 10px;background:#121212;border:1px solid #2c2c2c;border-radius:6px;font-size:11px;'></div>
  <div class='target-mode-wrapper' style='display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;margin:0 0 10px;padding:8px 10px;background:#141414;border:1px solid #2a2a2a;border-radius:6px;'>
    <label style='font-size:11px;display:flex;flex-direction:column;gap:4px;'>Target
      <select data-target-mode style='font-size:12px;padding:4px 6px;background:#1f1f1f;color:#ddd;border:1px solid #333;border-radius:4px;'>
        <option value='HUMAN'>👤 Human</option>
        <option value='CPUS'>🤖 CPUs</option>
        <option value='BOTH'>👤 + 🤖 Both</option>
      </select>
    </label>
    <label data-cpu-count-wrapper style='font-size:11px;display:none;flex-direction:column;gap:4px;'>CPU Count
      <select data-cpu-count style='font-size:12px;padding:4px 6px;background:#1f1f1f;color:#ddd;border:1px solid #333;border-radius:4px;'>
        ${[1,2,3,4,5].map(n=>`<option value='${n}'>${n}</option>`).join('')}
      </select>
    </label>
    <div style='margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;'>
      <button type='button' data-apply-selected style='font-size:12px;padding:4px 10px;background:#224568;color:#e4f4ff;border:1px solid #2f5d89;border-radius:4px;box-shadow:2px 2px 0 #0d1a24;'>Add Assignment</button>
      <button type='button' data-clear style='font-size:12px;padding:4px 10px;background:#3a2d2d;color:#ffe9e9;border:1px solid #604141;border-radius:4px;box-shadow:2px 2px 0 #1b1111;'>Clear Scenarios</button>
    </div>
  </div>
  <div class='applied-list' data-applied style='font-size:11px;line-height:1.4;background:#111;padding:6px 8px;border:1px solid #333;border-radius:4px;max-height:130px;overflow:auto;margin-bottom:8px;'></div>
  <div style='margin-top:4px;display:flex;gap:6px;flex-wrap:wrap;'>
    <button type='button' data-run-game style='font-size:13px;padding:6px 14px;background:#184d18;color:#eee;border:1px solid #297929;border-radius:4px;'>Apply / Reapply</button>
    <button type='button' data-generate-scenario-game style='font-size:13px;padding:6px 14px;background:#4d1818;color:#fee;border:1px solid #792929;border-radius:4px;'>Generate New Scenario Game</button>
    <button type='button' data-snapshot style='font-size:12px;padding:6px 10px;background:#223a52;color:#e0f4ff;border:1px solid #2e5779;border-radius:4px;'>Capture Snapshot</button>
    <button type='button' data-restore style='font-size:12px;padding:6px 10px;background:#523a22;color:#ffe0c2;border:1px solid #79572e;border-radius:4px;' disabled>Restore Snapshot</button>
  </div>
  <div data-summary style='margin-top:12px;font-size:11px;line-height:1.5;background:#0d0d0d;border:1px solid #222;padding:8px 10px;border-radius:4px;max-height:180px;overflow:auto;'></div>`;
}

function bind(root){
  const modeSelect = () => root.querySelector('[data-target-mode]');
  const cpuCountWrapper = () => root.querySelector('[data-cpu-count-wrapper]');
  const cpuCountSelect = () => root.querySelector('[data-cpu-count]');

  root.addEventListener('change', e => {
    if (e.target.matches('[data-target-mode]')) {
      const v = e.target.value;
      if (v === 'HUMAN') {
        cpuCountWrapper().style.display = 'none';
      } else {
        cpuCountWrapper().style.display = 'flex';
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
              let val = input.value;
              if (schema.type === 'number') val = parseInt(val,10);
              paramsByScenario[id][pKey] = val;
            }
          });
        }
      });
      const st = store.getState();
      const assignments = st.settings?.scenarioConfig?.assignments ? [...st.settings.scenarioConfig.assignments] : [];
      assignments.push({ mode, cpuCount, scenarioIds: selected, paramsByScenario });
      store.dispatch(scenarioConfigUpdated({ assignments }));
      sync(root);
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
  appliedEl.innerHTML = norm.length ? norm.map((a,i)=>{
    const label = describeAssignmentLabel(a);
    return `<div data-assignment-idx='${i}' style='display:flex;justify-content:space-between;gap:8px;'>
    <span>${label}: ${a.scenarioIds.join(', ')}</span>
    <button data-remove-assignment='${i}' style='font-size:10px;'>✕</button>
  </div>`; }).join('') : '<em style="opacity:.6;">No scenario assignments yet.</em>';
  appliedEl.querySelectorAll('[data-remove-assignment]').forEach(btn=>{
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-remove-assignment'),10);
      const st2 = store.getState();
      const list = [...(st2.settings?.scenarioConfig?.assignments||[])];
      list.splice(idx,1);
      store.dispatch(scenarioConfigUpdated({ assignments: list }));
      sync(root);
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
      expanded.push({ playerId: humanId, scenarioIds: a.scenarioIds });
    } else if (a.mode === 'CPUS') {
      chosenCpuIds.forEach(id => expanded.push({ playerId: id, scenarioIds: a.scenarioIds }));
    } else if (a.mode === 'BOTH') {
      if (humanId) expanded.push({ playerId: humanId, scenarioIds: a.scenarioIds });
      chosenCpuIds.forEach(id => expanded.push({ playerId: id, scenarioIds: a.scenarioIds }));
    }
  });
  // Merge duplicates (same playerId) scenario lists
  const mergedMap = new Map();
  expanded.forEach(entry => {
    if (!mergedMap.has(entry.playerId)) mergedMap.set(entry.playerId, new Set());
    entry.scenarioIds.forEach(id => mergedMap.get(entry.playerId).add(id));
  });
  const finalList = [...mergedMap.entries()].map(([playerId,set])=>({ playerId, scenarioIds: [...set] }));
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

function updateParamEditor(root){
  const editor = root.querySelector('[data-param-editor]');
  const selected = [...root.querySelectorAll('[data-scenario-id]:checked')].map(cb=>cb.getAttribute('data-scenario-id'));
  if (!selected.length) { editor.style.display='none'; editor.innerHTML=''; return; }
  const blocks = [];
  selected.forEach(id => {
    const sc = getScenario(id);
    if (!sc || !sc.params) return;
    const paramInputs = Object.entries(sc.params).map(([key,schema])=>{
      const baseAttrs = `data-param-input="${id}:${key}" name="${id}:${key}"`; 
      if (schema.type === 'number') {
        return `<label style='display:flex;flex-direction:column;gap:2px;'>${schema.label}<input type='number' ${baseAttrs} value='${schema.default}' min='${schema.min}' max='${schema.max}' step='${schema.step||1}' style='background:#1a1a1a;color:#ddd;border:1px solid #333;padding:2px 4px;font-size:11px;border-radius:4px;'/></label>`;
      }
      return '';
    }).join('<div style="width:8px;"></div>');
    if (paramInputs) blocks.push(`<div style='display:flex;flex-wrap:wrap;gap:10px;margin:4px 0 6px;padding:6px 8px;border:1px solid #252525;background:#181818;border-radius:4px;'><div style='font-weight:600;font-size:11px;width:100%;'>${sc.label}</div>${paramInputs}</div>`);
  });
  if (!blocks.length) { editor.style.display='none'; editor.innerHTML=''; return; }
  editor.style.display='block';
  editor.innerHTML = `<div style='font-weight:600;margin-bottom:4px;'>Parameters</div>${blocks.join('')}`;
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
