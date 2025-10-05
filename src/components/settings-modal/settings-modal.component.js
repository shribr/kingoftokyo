import { uiSettingsClose, settingsUpdated } from '../../core/actions.js';
import { store } from '../../bootstrap/index.js';

// In-memory change tracking
const pendingChanges = {};
let originalValues = {};

export function build(ctx) {
  const root = document.createElement('div');
  root.className = 'cmp-settings-modal modal-shell';
  root.innerHTML = `
    <div class="modal settings" data-settings-modal style="overflow:visible !important;">
      <div class="modal-header"><h2>Game Settings</h2><button data-close>×</button></div>
      <div class="settings-tabs" style="display:flex;gap:6px;padding:10px 16px;background:#1c1c1c;border-bottom:2px solid #333;flex-shrink:0;">
        <button type="button" data-tab-btn="general" class="is-active" style="padding:6px 12px;font-size:13px;border:2px solid #333;background:#ffd400;cursor:pointer;">General</button>
        <button type="button" data-tab-btn="scenarios" style="padding:6px 12px;font-size:13px;border:2px solid #333;background:#fff;color:#000;cursor:pointer;">Scenarios</button>
        <button type="button" data-tab-btn="advanced" style="padding:6px 12px;font-size:13px;border:2px solid #333;background:#fff;color:#000;cursor:pointer;">Advanced</button>
      </div>
      <save-bar data-settings-save-bar style="position:sticky;top:0;flex-shrink:0;height:40px;display:flex;align-items:center;justify-content:center;gap:10px;padding:0 16px;background:#2a2a2a;border-bottom:2px solid #444;z-index:9999;display:none;">
        <button type="button" data-save-settings style="padding:8px 20px;background:#ffd400;color:#000;border:2px solid #333;border-radius:4px;font-size:14px;font-weight:bold;cursor:pointer;opacity:0.5;" disabled>Save Settings</button>
        <span data-changes-count style="color:#aaa;font-size:12px;">No unsaved changes</span>
      </save-bar>
      <div class="modal-body" data-tabs-root style="flex:1;overflow-y:auto;padding:16px;padding-bottom:10px;background:blue;">
        <p style="color:yellow;font-size:20px;font-weight:bold;">MODAL BODY STARTS HERE</p>
        <div data-tab-panel="general" class="tab-panel" style="display:block;">
         <form data-settings-form>
           <div class="field" style="margin:10px 0;">
             <label for="cpuSpeed" style="display:block;font-weight:bold;margin-bottom:4px;">CPU Speed</label>
             <select id="cpuSpeed" name="cpuSpeed" style="padding:6px;font-size:13px;width:100%;max-width:200px;">
               <option value="slow">Slow</option>
               <option value="normal">Normal</option>
               <option value="fast">Fast</option>
             </select>
           </div>
           <div class="field" style="margin:10px 0;">
             <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="showThoughtBubbles"> Show Thought Bubbles</label>
           </div>
           <div class="field" style="margin:10px 0;">
             <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="autoActivateMonsters"> Auto Activate Monsters</label>
           </div>
           <div class="field" style="margin:10px 0;">
             <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="autoStartInTest"> Auto Start In Test (skipintro)</label>
           </div>
           <div class="field" style="margin:10px 0;">
             <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="disableAnimations"> Disable Non-Essential Animations</label>
           </div>
         </form>
        </div>
        <div data-tab-panel="scenarios" class="tab-panel" style="display:none;">
          <div data-scenarios-config></div>
        </div>
        <div data-tab-panel="advanced" class="tab-panel" style="display:none;">
          <h3 style="margin:10px 0;">Settings Change Log</h3>
          <div style="display:flex;gap:10px;">
            <div style="flex:0 0 200px;">
              <label style="display:block;font-weight:bold;margin-bottom:4px;">Recent Changes</label>
              <select id="changeset-list" size="5" style="width:100%;font-size:12px;font-family:monospace;">
                <option value="">No changes yet</option>
              </select>
            </div>
            <div style="flex:1;">
              <label style="display:block;font-weight:bold;margin-bottom:4px;">Details</label>
              <textarea id="changeset-details" readonly style="width:100%;height:150px;font-size:12px;font-family:monospace;padding:8px;"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  
  // Close button handlers
  root.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Warn if there are unsaved changes
      if (Object.keys(pendingChanges).length > 0) {
        if (!confirm('You have unsaved changes. Close anyway?')) return;
      }
      clearPendingChanges();
      window.__KOT_NEW__.store.dispatch(uiSettingsClose());
    });
  });
  
  bindTabs(root);
  
  // Populate changeset list
  populateChangesetList(root);
  
  // Track changes in the form
  const form = root.querySelector('[data-settings-form]');
  form.addEventListener('change', (e) => {
    trackChange(e.target, form, root);
  });
  
  // Track scenario changes via custom event
  root.addEventListener('scenario-config-changed', () => {
    trackScenarioChange(root);
  });
  
  // Save button handler
  const saveBtn = root.querySelector('[data-save-settings]');
  saveBtn.addEventListener('click', () => {
    showConfirmationModal(root);
  });
  
  // Advanced tab - changeset list selection
  root.querySelector('#changeset-list')?.addEventListener('change', (e) => {
    displayChangesetDetails(e.target.value, root);
  });
  
  return { root, update: (p) => update(p) };
}

export function update(ctx) {
  const state = ctx.fullState || ctx.state || {};
  const root = ctx.inst?.root || ctx.root || (ctx instanceof HTMLElement ? ctx : null);
  if (!root || !root.querySelector) return; // defensive guard during early mount race
  const open = state.ui?.settings?.open;
  const wasOpen = root.hasAttribute('data-was-open');
  
  if (root.style) root.style.display = open ? 'flex' : 'none';
  root.classList.toggle('is-open', !!open);
  
  if (open && !wasOpen) {
    // Modal just opened - capture original values
    root.setAttribute('data-was-open', 'true');
    const settings = state.settings || {};
    originalValues = {
      cpuSpeed: settings.cpuSpeed,
      showThoughtBubbles: settings.showThoughtBubbles,
      autoActivateMonsters: settings.autoActivateMonsters,
      autoStartInTest: settings.autoStartInTest,
      disableAnimations: settings.disableAnimations,
      _scenarios: settings.scenarioConfig?.assignments || []
    };
    // Clear pending changes from previous session
    clearPendingChanges();
    updateSaveButton(root);
    console.log('[Settings] Modal opened, captured original values:', originalValues);
  }
  
  if (!open && wasOpen) {
    // Modal just closed
    root.removeAttribute('data-was-open');
  }
  
  if (open) {
    try { window.__KOT_BLACKOUT__?.hide(); } catch(_) {}
    // Ensure modal-shell is above general overlays
    try { root.style.zIndex = '12000'; } catch(_) {}
  }
  if (!open) return;
  ensureScenarioConfigMounted(root);
  const settings = state.settings;
  if (settings) {
    const cpu = root.querySelector('select[name="cpuSpeed"]');
    if (cpu && cpu.value !== settings.cpuSpeed) cpu.value = settings.cpuSpeed;
    const bubble = root.querySelector('input[name="showThoughtBubbles"]');
    if (bubble) bubble.checked = !!settings.showThoughtBubbles;
  const auto = root.querySelector('input[name="autoActivateMonsters"]');
  if (auto) auto.checked = !!settings.autoActivateMonsters;
  const autoStart = root.querySelector('input[name="autoStartInTest"]');
  if (autoStart) autoStart.checked = !!settings.autoStartInTest;
  const disAnim = root.querySelector('input[name="disableAnimations"]');
  if (disAnim) disAnim.checked = !!settings.disableAnimations;
  }
}

function bindTabs(root){
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-tab-btn]');
    if (!btn) return;
    const target = btn.getAttribute('data-tab-btn');
    root.querySelectorAll('[data-tab-btn]').forEach(b=>b.classList.toggle('is-active', b===btn));
    root.querySelectorAll('[data-tab-panel]').forEach(p=>{
      p.style.display = (p.getAttribute('data-tab-panel') === target) ? 'block' : 'none';
    });
  });
}

function ensureScenarioConfigMounted(root){
  const host = root.querySelector('[data-scenarios-config]');
  if (!host || host._scenarioMounted) return;
  host._scenarioMounted = true;
  // Lazy import existing scenarios tab component and embed its content/summarization
  import('../scenarios-tab/scenarios-tab.component.js').then(mod => {
    const inst = mod.build({});
    host.appendChild(inst.root);
    window.__KOT_NEW__.store.subscribe(()=>inst.update());
  }).catch(err => {
    host.innerHTML = `<em style='color:#a55;'>Failed to load scenarios UI (${err?.message||'error'}).</em>`;
  });
}

function trackChange(input, form, root) {
  const name = input.name || input.id;
  if (!name) return;
  
  const currentState = store.getState().settings;
  let newValue, oldValue, tabName = 'General';
  
  if (input.type === 'checkbox') {
    newValue = input.checked;
    oldValue = currentState[name];
  } else if (input.tagName === 'SELECT') {
    newValue = input.value;
    oldValue = currentState[name];
  } else {
    newValue = input.value;
    oldValue = currentState[name];
  }
  
  // Only track if value actually changed
  if (newValue === oldValue) {
    delete pendingChanges[name];
  } else {
    pendingChanges[name] = {
      setting: name,
      tab: tabName,
      oldValue: oldValue,
      newValue: newValue,
      label: getLabelForSetting(name)
    };
  }
  
  // Update save button state
  updateSaveButton(root);
  
  console.log('[Settings] Change tracked:', name, 'from', oldValue, 'to', newValue);
  console.log('[Settings] Pending changes:', pendingChanges);
}

function trackScenarioChange(root) {
  // Check if there are scenario assignments in state
  const currentState = store.getState();
  const assignments = currentState.settings?.scenarioConfig?.assignments || [];
  
  // Compare with original values to determine if there's a real change
  const originalAssignments = originalValues['_scenarios'] || [];
  const hasChanged = JSON.stringify(assignments) !== JSON.stringify(originalAssignments);
  
  if (hasChanged) {
    // Mark scenarios as changed
    pendingChanges['_scenarios'] = {
      setting: '_scenarios',
      tab: 'Scenarios',
      oldValue: `${originalAssignments.length} assignment(s)`,
      newValue: `${assignments.length} assignment(s)`,
      label: 'Scenario Configuration'
    };
  } else {
    // No change from original, remove from pending changes
    delete pendingChanges['_scenarios'];
  }
  
  updateSaveButton(root);
  console.log('[Settings] Scenario change tracked, assignments:', assignments.length);
}

function getLabelForSetting(name) {
  const labels = {
    cpuSpeed: 'CPU Speed',
    showThoughtBubbles: 'Show Thought Bubbles',
    autoActivateMonsters: 'Auto Activate Monsters',
    autoStartInTest: 'Auto Start In Test',
    disableAnimations: 'Disable Animations',
    showPhaseMetrics: 'Show Phase Metrics',
    showDebugPanels: 'Show Debug Panels',
    persistPositions: 'Persist Positions',
    playerCardLayoutMode: 'Player Card Layout Mode',
    soundMuted: 'Sound Muted',
    actionMenuMode: 'Action Menu Mode'
  };
  return labels[name] || name;
}

function updateSaveButton(root) {
  const saveBtn = root.querySelector('[data-save-settings]');
  const saveBar = root.querySelector('[data-settings-save-bar]');
  const changesCount = root.querySelector('[data-changes-count]');
  const hasChanges = Object.keys(pendingChanges).length > 0;
  
  saveBtn.disabled = !hasChanges;
  saveBtn.style.cursor = hasChanges ? 'pointer' : 'not-allowed';
  saveBtn.style.opacity = hasChanges ? '1' : '0.5';
  
  // Show/hide save bar
  saveBar.style.display = hasChanges ? 'flex' : 'none';
  
  // Update changes count text
  if (hasChanges) {
    const count = Object.keys(pendingChanges).length;
    changesCount.textContent = `${count} unsaved change${count === 1 ? '' : 's'}`;
  } else {
    changesCount.textContent = 'No unsaved changes';
  }
}

function clearPendingChanges() {
  Object.keys(pendingChanges).forEach(key => delete pendingChanges[key]);
}

function showConfirmationModal(root) {
  if (Object.keys(pendingChanges).length === 0) return;
  
  // Create confirmation modal
  const modal = document.createElement('div');
  modal.className = 'settings-confirmation-modal';
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 3px solid #333;
    border-radius: 8px;
    padding: 20px;
    z-index: 15000;
    max-width: 800px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  `;
  
  const changes = Object.values(pendingChanges);
  
  modal.innerHTML = `
    <h2 style="margin:0 0 16px;font-family:'Bangers',cursive;font-size:24px;">Confirm Settings Changes</h2>
    <p style="margin:0 0 16px;font-size:14px;">Review the changes below. Uncheck any you don't want to apply.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background:#333;color:#fff;">
          <th style="padding:8px;text-align:left;cursor:pointer;" data-sort="apply">Apply</th>
          <th style="padding:8px;text-align:left;cursor:pointer;" data-sort="setting">Setting</th>
          <th style="padding:8px;text-align:left;cursor:pointer;" data-sort="tab">Tab</th>
          <th style="padding:8px;text-align:left;cursor:pointer;" data-sort="current">Current Value</th>
          <th style="padding:8px;text-align:left;cursor:pointer;" data-sort="new">New Value</th>
        </tr>
      </thead>
      <tbody>
        ${changes.map((change, idx) => `
          <tr data-change-row="${change.setting}" style="border-bottom:1px solid #ddd;">
            <td style="padding:8px;text-align:center;">
              <input type="checkbox" data-change-checkbox="${change.setting}" checked>
            </td>
            <td style="padding:8px;">${change.label}</td>
            <td style="padding:8px;">${change.tab}</td>
            <td style="padding:8px;font-family:monospace;">${formatValue(change.oldValue)}</td>
            <td style="padding:8px;font-family:monospace;font-weight:bold;">${formatValue(change.newValue)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;gap:10px;">
      <button data-cancel style="padding:8px 16px;border:2px solid #333;background:#ddd;cursor:pointer;">Cancel</button>
      <button data-apply style="padding:8px 16px;border:2px solid #333;background:#ffd400;cursor:pointer;font-weight:bold;">Apply Changes</button>
    </div>
  `;
  
  // Checkbox handlers
  modal.querySelectorAll('[data-change-checkbox]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const setting = e.target.getAttribute('data-change-checkbox');
      const row = modal.querySelector(`[data-change-row="${setting}"]`);
      if (e.target.checked) {
        row.style.opacity = '1';
        row.style.background = '';
      } else {
        row.style.opacity = '0.4';
        row.style.background = '#f5f5f5';
      }
    });
  });
  
  // Cancel button
  modal.querySelector('[data-cancel]').addEventListener('click', () => {
    document.body.removeChild(modal);
    document.body.removeChild(overlay);
  });
  
  // Apply button
  modal.querySelector('[data-apply]').addEventListener('click', () => {
    applyChanges(modal, root);
    document.body.removeChild(modal);
    document.body.removeChild(overlay);
  });
  
  // Column sorting
  modal.querySelectorAll('[data-sort]').forEach(th => {
    th.addEventListener('click', () => sortTable(modal, th.getAttribute('data-sort')));
  });
  
  // Add overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 14999;
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(modal);
}

function formatValue(val) {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (val === null || val === undefined) return '(none)';
  return String(val);
}

function sortTable(modal, column) {
  // Simple table sorting - implementation can be enhanced
  console.log('[Settings] Sorting by:', column);
}

function applyChanges(modal, root) {
  const changesToApply = {};
  
  // Collect checked changes
  modal.querySelectorAll('[data-change-checkbox]:checked').forEach(cb => {
    const setting = cb.getAttribute('data-change-checkbox');
    if (pendingChanges[setting]) {
      changesToApply[setting] = pendingChanges[setting].newValue;
    }
  });
  
  if (Object.keys(changesToApply).length === 0) {
    alert('No changes selected to apply.');
    return;
  }
  
  console.log('[Settings] Applying changes:', changesToApply);
  
  // Save to localStorage for change log
  saveToChangeLog(changesToApply);
  
  // Dispatch to Redux store
  store.dispatch(settingsUpdated(changesToApply));
  
  // Save to localStorage for persistence
  try {
    const currentSettings = store.getState().settings;
    localStorage.setItem('kot_settings', JSON.stringify(currentSettings));
  } catch(e) {
    console.error('[Settings] Failed to save to localStorage:', e);
  }
  
  // Clear pending changes
  clearPendingChanges();
  
  // Update save button
  updateSaveButton(root);
  
  // Refresh changeset list in Advanced tab
  populateChangesetList(root);
  
  alert('Settings saved successfully!');
}

function saveToChangeLog(changes) {
  try {
    const log = JSON.parse(localStorage.getItem('kot_settings_changelog') || '[]');
    const timestamp = new Date().toISOString();
    
    const changeset = {
      timestamp,
      changes: Object.entries(changes).map(([key, value]) => ({
        setting: key,
        label: getLabelForSetting(key),
        oldValue: pendingChanges[key]?.oldValue,
        newValue: value
      }))
    };
    
    log.unshift(changeset);
    
    // Keep only last 5
    if (log.length > 5) log.length = 5;
    
    localStorage.setItem('kot_settings_changelog', JSON.stringify(log));
  } catch(e) {
    console.error('[Settings] Failed to save change log:', e);
  }
}

function displayChangesetDetails(timestamp, root) {
  const textarea = root.querySelector('#changeset-details');
  if (!textarea) return;
  
  if (!timestamp) {
    textarea.value = '';
    return;
  }
  
  try {
    const log = JSON.parse(localStorage.getItem('kot_settings_changelog') || '[]');
    const changeset = log.find(cs => cs.timestamp === timestamp);
    
    if (!changeset) {
      textarea.value = 'Changeset not found.';
      return;
    }
    
    const details = [
      `Timestamp: ${new Date(changeset.timestamp).toLocaleString()}`,
      '',
      'Changes:',
      ...changeset.changes.map(ch => 
        `  ${ch.label}: ${formatValue(ch.oldValue)} → ${formatValue(ch.newValue)}`
      )
    ].join('\n');
    
    textarea.value = details;
  } catch(e) {
    textarea.value = 'Error loading changeset details.';
  }
}

function populateChangesetList(root) {
  const listbox = root.querySelector('#changeset-list');
  if (!listbox) return;
  
  try {
    const log = JSON.parse(localStorage.getItem('kot_settings_changelog') || '[]');
    
    // Clear existing options
    listbox.innerHTML = '';
    
    if (log.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'No changesets saved yet';
      opt.disabled = true;
      listbox.appendChild(opt);
      return;
    }
    
    // Add option for each changeset
    log.forEach(cs => {
      const opt = document.createElement('option');
      opt.value = cs.timestamp;
      opt.textContent = new Date(cs.timestamp).toLocaleString() + ` (${cs.changes.length} change${cs.changes.length === 1 ? '' : 's'})`;
      listbox.appendChild(opt);
    });
  } catch(e) {
    console.error('[Settings] Failed to load changeset list:', e);
  }
}
