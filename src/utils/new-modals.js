/**
 * new-modals.js
 * Content creators for the new modal system
 */

import { newModalSystem } from './new-modal-system.js';

export function createSettingsModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <!-- Tab Navigation -->
    <div class="settings-tabs" style="display: flex; border-bottom: 2px solid #333; margin-bottom: 20px; background: #1a1a1a; border-radius: 6px 6px 0 0;" role="tablist">
      <button type="button" class="tab-button active" data-tab="gameplay" style="flex: 1; background: none; border: none; color: #e4e4e4; padding: 12px 16px; cursor: pointer; font-family: 'Bangers', cursive; font-size: 16px; border-bottom: 3px solid transparent; transition: all 0.3s;">
        🎮 Gameplay
      </button>
      <button type="button" class="tab-button" data-tab="interface" style="flex: 1; background: none; border: none; color: #999; padding: 12px 16px; cursor: pointer; font-family: 'Bangers', cursive; font-size: 16px; border-bottom: 3px solid transparent; transition: all 0.3s;">
        🎨 Interface
      </button>
      <button type="button" class="tab-button" data-tab="themes" style="flex: 1; background: none; border: none; color: #999; padding: 12px 16px; cursor: pointer; font-family: 'Bangers', cursive; font-size: 16px; border-bottom: 3px solid transparent; transition: all 0.3s;">
        🌈 Themes
      </button>
      <button type="button" class="tab-button" data-tab="advanced" style="flex: 1; background: none; border: none; color: #999; padding: 12px 16px; cursor: pointer; font-family: 'Bangers', cursive; font-size: 16px; border-bottom: 3px solid transparent; transition: all 0.3s;">
        ⚙️ Advanced
      </button>
      <button type="button" class="tab-button" data-tab="scenarios" style="flex: 1; background: none; border: none; color: #999; padding: 12px 16px; cursor: pointer; font-family: 'Bangers', cursive; font-size: 16px; border-bottom: 3px solid transparent; transition: all 0.3s;">
        🧪 Scenarios
      </button>
      <button type="button" class="tab-button" data-tab="archives" style="flex: 1; background: none; border: none; color: #999; padding: 12px 16px; cursor: pointer; font-family: 'Bangers', cursive; font-size: 16px; border-bottom: 3px solid transparent; transition: all 0.3s;">
        🗂 Archives
      </button>
      <button type="button" class="tab-button" data-tab="replay" style="flex: 1; background: none; border: none; color: #999; padding: 12px 16px; cursor: pointer; font-family: 'Bangers', cursive; font-size: 16px; border-bottom: 3px solid transparent; transition: all 0.3s;">
        ▶️ Replay
      </button>
      <button type="button" class="tab-button" data-tab="ai" style="flex: 1; background: none; border: none; color: #999; padding: 12px 16px; cursor: pointer; font-family: 'Bangers', cursive; font-size: 16px; border-bottom: 3px solid transparent; transition: all 0.3s;">
        🧠 AI Insight
      </button>
      <button type="button" class="tab-button" data-tab="devtools" style="flex: 1; background: none; border: none; color: #999; padding: 12px 16px; cursor: pointer; font-family: 'Bangers', cursive; font-size: 16px; border-bottom: 3px solid transparent; transition: all 0.3s;">
        🛠 Dev Tools
      </button>
    </div>

    <form class="unified-modal-form">
      <!-- Gameplay Tab -->
      <div class="tab-content active" data-tab-content="gameplay">
        <div class="section">
          <h3 class="section-title">🎮 Game Mechanics</h3>
          
          <div class="field">
            <label class="field-label">AI Decision Speed</label>
            <select name="cpuSpeed" class="field-input">
              <option value="slow">Slow - Watch AI think through decisions</option>
              <option value="normal">Normal - Balanced timing for readability</option>
              <option value="fast">Fast - Quick AI actions</option>
            </select>
            <div class="field-help">Controls how quickly AI players make decisions and perform actions</div>
          </div>

          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="showThoughtBubbles">
              <span class="checkbox-label">Show AI Thought Bubbles</span>
            </label>
            <div class="field-help">Display AI reasoning and decision-making process during gameplay</div>
          </div>

          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="autoActivateMonsters">
              <span class="checkbox-label">Auto-Activate Monster Abilities</span>
            </label>
            <div class="field-help">Automatically trigger monster special abilities when applicable</div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">🔊 Audio & Effects</h3>
          
          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="soundMuted">
              <span class="checkbox-label">Mute Sound Effects</span>
            </label>
            <div class="field-help">Turn off dice rolling, button clicks, and other game sounds</div>
          </div>
        </div>
      </div>

      <!-- Interface Tab -->
      <div class="tab-content" data-tab-content="interface" style="display: none;">
        <div class="section">
          <h3 class="section-title">📱 Layout Options</h3>
          
          <div class="field">
            <label class="field-label">Player Card Layout</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="playerCardLayoutMode" value="stacked">
                <span>Stacked - Full overlap with dramatic tilt</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="playerCardLayoutMode" value="condensed">
                <span>Condensed - Light overlap, readable mini stack</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="playerCardLayoutMode" value="list">
                <span>List - No overlap, linear arrangement</span>
              </label>
            </div>
            <div class="field-help">How player profile cards are arranged on screen</div>
          </div>

          <div class="field">
            <label class="field-label">Action Menu Placement</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="actionMenuMode" value="hybrid">
                <span>Smart - Auto-dock until dragged, then stays floating</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="actionMenuMode" value="docked">
                <span>Docked - Always positioned beside dice tray</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="actionMenuMode" value="floating">
                <span>Floating - Stays where you place it</span>
              </label>
            </div>
            <div class="field-help">Where action buttons appear during your turn</div>
          </div>

          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="persistPositions">
              <span class="checkbox-label">Remember Panel Positions</span>
            </label>
            <div class="field-help">Save draggable panel positions between game sessions</div>
          </div>
        </div>
      </div>

      <!-- Themes Tab -->
      <div class="tab-content" data-tab-content="themes" style="display: none;">
        <div class="section">
          <h3 class="section-title">🃏 Power Card Themes</h3>
          
          <div class="field">
            <label class="field-label">Visual Style</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="powerCardTheme" value="original">
                <span>Original - Classic dark sci-fi design</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="powerCardTheme" value="mystical">
                <span>Mystical - Ancient scrolls with magical aura</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="powerCardTheme" value="tech">
                <span>Tech - Futuristic holographic interface</span>
              </label>
            </div>
            <div class="field-help">Choose the visual style for power card displays</div>
          </div>

          <!-- Theme Preview -->
          <div class="field">
            <label class="field-label">Live Preview</label>
            <div class="theme-preview-container" style="padding: 20px; background: #1a1a1a; border-radius: 8px; border: 1px solid #444; text-align: center;">
              <div class="mini-power-card" id="theme-preview-card" style="width: 200px; height: 100px; border-radius: 6px; padding: 12px; font-family: 'Comic Neue', cursive; font-size: 12px; background: linear-gradient(135deg, #2d3436 0%, #1b1f20 78%); border: 2px solid #222; color: #ececec; position: relative; display: inline-block;">
                <div style="font-family: 'Bangers', cursive; font-size: 14px; color: #ffcf33; margin-bottom: 6px; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;">Sample Power Card</div>
                <div style="font-size: 10px; line-height: 1.3;">This card demonstrates the selected theme with special abilities and visual effects.</div>
                <div style="position: absolute; top: 8px; right: 8px; background: #111; color: #ffcf33; padding: 3px 8px; border-radius: 12px; font-family: 'Bangers', cursive; font-size: 12px;">5⚡</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">💬 Dialog System</h3>
          
          <div class="field">
            <label class="field-label">Dialog Style</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="dialogSystem" value="legacy">
                <span>Legacy - Original game dialogs and notifications</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="dialogSystem" value="unified">
                <span>Unified - Modern themed dialogs with enhanced visuals</span>
              </label>
            </div>
            <div class="field-help">Choose between original dialogs or the new unified theme system</div>
          </div>
        </div>
      </div>

      <!-- Advanced Tab -->
      <div class="tab-content" data-tab-content="advanced" style="display: none;">
        <div class="section">
          <h3 class="section-title">🔧 Developer Options</h3>
          
          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="autoStartInTest">
              <span class="checkbox-label">Auto-Start in Test Mode</span>
            </label>
            <div class="field-help">Skip intro screens and start directly in development/test mode</div>
          </div>

          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="debugMode">
              <span class="checkbox-label">Enable Debug Console</span>
            </label>
            <div class="field-help">Show additional debug information in browser console</div>
          </div>

          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="showPerformanceMetrics">
              <span class="checkbox-label">Show Performance Metrics</span>
            </label>
            <div class="field-help">Display frame rate and performance statistics</div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">📊 Data Management</h3>
          
          <div class="field">
            <label class="field-label">Settings Export/Import</label>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button type="button" class="btn btn-secondary export-settings-btn" style="font-size: 12px; padding: 6px 12px;">
                📤 Export Settings
              </button>
              <button type="button" class="btn btn-secondary import-settings-btn" style="font-size: 12px; padding: 6px 12px;">
                📥 Import Settings
              </button>
              <input type="file" id="settings-import-file" accept=".json" style="display: none;">
            </div>
            <div class="field-help">Backup or restore all your game settings</div>
          </div>

          <div class="field">
            <label class="field-label">Reset Options</label>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button type="button" class="btn btn-warning reset-settings-btn" style="font-size: 12px; padding: 6px 12px; background: #f39c12; border-color: #e67e22;">
                🔄 Reset to Defaults
              </button>
              <button type="button" class="btn btn-danger clear-all-data-btn" style="font-size: 12px; padding: 6px 12px; background: #e74c3c; border-color: #c0392b;">
                🗑️ Clear All Data
              </button>
            </div>
            <div class="field-help">Reset settings or clear all stored game data</div>
          </div>
        </div>
      </div>

      <!-- Scenarios Tab -->
      <div class="tab-content" data-tab-content="scenarios" style="display:none;">
        <div class="section" style="max-height:60vh;overflow:auto;">
          <h3 class="section-title">🧪 Scenario Configuration</h3>
          <p style="font-size:12px;opacity:.75;line-height:1.4;">Configure scenario assignments and either apply them to the live game or generate a fresh auto-seeded run.</p>
          <div data-scenarios-host style="border:1px solid #222;background:#141414;padding:10px 12px;border-radius:6px;min-height:140px;position:relative;">
            <div class="loading" style="font-size:11px;opacity:.6;">Loading scenario tools…</div>
          </div>
        </div>
      </div>

      <!-- Archives Tab -->
      <div class="tab-content" data-tab-content="archives" style="display:none;">
        <div class="section" style="max-height:60vh;overflow:auto;">
          <h3 class="section-title">🗂 Archives</h3>
          <p style="font-size:12px;opacity:.75;">Browse archived game logs and AI decision snapshots.</p>
          <div data-archives-host class="archives-list" style="border:1px solid #222;background:#141414;padding:8px 10px;border-radius:6px;min-height:120px;">
            <div class="loading" style="font-size:11px;opacity:.6;">Listing archives…</div>
          </div>
        </div>
      </div>

      <!-- Replay Tab -->
      <div class="tab-content" data-tab-content="replay" style="display:none;">
        <div class="section" style="max-height:60vh;overflow:auto;">
          <h3 class="section-title">▶️ Replay</h3>
          <p style="font-size:12px;opacity:.75;">Select an archive to load & replay; control playback speed.</p>
          <div data-replay-host class="replay-list" style="border:1px solid #222;background:#141414;padding:8px 10px;border-radius:6px;min-height:120px;">
            <div class="loading" style="font-size:11px;opacity:.6;">Loading replay options…</div>
          </div>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary" data-replay-pause>Pause</button>
            <button type="button" class="btn btn-secondary" data-replay-resume>Resume</button>
            <button type="button" class="btn btn-secondary" data-replay-stop>Stop</button>
          </div>
        </div>
      </div>

      <!-- AI Insight Tab -->
      <div class="tab-content" data-tab-content="ai" style="display:none;">
        <div class="section" style="max-height:60vh;overflow:auto;">
          <h3 class="section-title">🧠 AI Insight</h3>
          <p style="font-size:12px;opacity:.75;">Live AI decision tree explorer. Updates as AI evaluates rolls.</p>
          <div data-ai-tree-host style="border:1px solid #222;background:#141414;padding:6px 8px;border-radius:6px;min-height:180px;position:relative;">
            <div class="loading" style="font-size:11px;opacity:.6;">Mounting AI decision tree…</div>
          </div>
        </div>
      </div>

      <!-- Dev Tools Tab -->
      <div class="tab-content" data-tab-content="devtools" style="display:none;">
        <div class="section" style="max-height:60vh;overflow:auto;">
          <h3 class="section-title">🛠 Developer Tools</h3>
          <p style="font-size:12px;opacity:.75;">Utilities for debugging & rapid iteration. Toggle floating panel or use in-modal actions.</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;align-items:center;">
            <label class="field-checkbox" style="margin:0;">
              <input type="checkbox" name="enableFloatingDevPanel" />
              <span class="checkbox-label">Enable Floating Dev Panel</span>
            </label>
            <label class="field-checkbox" style="margin:0;">
              <input type="checkbox" name="enableDecisionTreeCapture" />
              <span class="checkbox-label">Capture AI Decision Data</span>
            </label>
          </div>
          <div data-devtools-actions style="border:1px solid #222;background:#141414;padding:6px 8px;border-radius:6px;display:flex;flex-wrap:wrap;gap:6px;">
            <button type="button" class="btn btn-secondary" data-dev-reset-positions>Reset Positions</button>
            <button type="button" class="btn btn-secondary" data-dev-log-positions>Log Positions</button>
            <button type="button" class="btn btn-secondary" data-dev-log-dice>Log Dice</button>
            <button type="button" class="btn btn-secondary" data-dev-log-effects>Log Effects</button>
            <button type="button" class="btn btn-secondary" data-dev-archive-game>Archive Game</button>
            <button type="button" class="btn btn-secondary" data-dev-archive-aidt>Archive AIDT</button>
          </div>
          <div style="font-size:10px;opacity:.6;margin-top:6px;">Certain actions require #dev hash for full detail.</div>
        </div>
      </div>
    </form>
    <div class="modal-actions">
      <button type="button" class="btn btn-primary save-btn" disabled>Save Settings</button>
    </div>
  `;

  // Handle tab switching
  const tabButtons = content.querySelectorAll('.tab-button');
  const tabContents = content.querySelectorAll('.tab-content');
  const LS_LAST_TAB = 'KOT_SETTINGS_LAST_TAB';
  let scenariosMounted = false;
  function ensureScenariosMounted(){
    if (scenariosMounted) return;
    const host = content.querySelector('[data-scenarios-host]');
    if (!host) return;
    scenariosMounted = true;
    import('../components/scenarios-tab/scenarios-tab.component.js').then(mod => {
      const inst = mod.build({});
      host.innerHTML = '';
      host.appendChild(inst.root);
      try { window.__KOT_NEW__?.store?.subscribe(()=>inst.update()); } catch(_) {}
      // Widen modal for roomy layout
      try { content.closest('.nm-modal').style.maxWidth = '1000px'; } catch(_) {}
    }).catch(err => {
      host.innerHTML = `<em style='color:#a55;'>Failed to load scenarios UI (${err?.message||'error'}).</em>`;
    });
  }
  // Lazy mount AI decision tree inside settings tab
  let aiTreeMounted = false;
  async function ensureAIMounted(){
    if (aiTreeMounted) return;
    const host = content.querySelector('[data-ai-tree-host]');
    if (!host) return;
    aiTreeMounted = true;
    try {
      const mod = await import('../components/ai-decision-tree/ai-decision-tree.component.js');
      const inst = mod.buildAIDecisionTree();
      host.innerHTML='';
      host.appendChild(inst.root);
    } catch(e){
      host.innerHTML = `<div style="color:#c55;font-size:12px;">Failed to load AI Decision Tree: ${e.message}</div>`;
    }
  }

  // Archive / Replay data loaders (lightweight stubs using archiveManagementService & replayService)
  let archivesLoaded = false;
  async function loadArchives(){
    const host = content.querySelector('[data-archives-host]');
    if (!host) return;
    host.innerHTML = '<div style="font-size:11px;opacity:.6;">Loading archives…</div>';
    try {
      const { archiveManager } = await import('../services/archiveManagementService.js');
      const list = archiveManager.getAllArchives();
      if (!list.length){ host.innerHTML = '<div style="font-size:11px;opacity:.5;">No archives found.</div>'; return; }
      host.innerHTML = `<ul style='list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;'>${list.slice(0,100).map(a=>{
        const ts = a.ts||a.timestamp; const d = ts? new Date(ts).toLocaleString():'';
        return `<li style='background:#1c1c1c;padding:6px 8px;border:1px solid #2a2a2a;border-radius:4px;display:flex;flex-direction:column;gap:4px;'>
          <div style='display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;'>
            <span style='font-size:11px;opacity:.85;'>${a.name||a.id||'Archive'} <span style='opacity:.5;'>${a.category||a.type||''}</span></span>
            <span style='font-size:10px;opacity:.5;'>${d}</span>
          </div>
          <div style='display:flex;gap:6px;flex-wrap:wrap;'>
            <button type='button' class='btn btn-secondary' data-archive-replay='${a.id}'>Load & Replay</button>
            <button type='button' class='btn btn-secondary' data-archive-export='${a.id}'>Export</button>
            <button type='button' class='btn btn-secondary' data-archive-delete='${a.id}'>Delete</button>
          </div>
        </li>`;}).join('')}</ul>`;
    } catch(e){
      host.innerHTML = `<div style='color:#c55;font-size:11px;'>Failed to load archives: ${e.message}</div>`;
    }
  }

  function attachArchiveHandlers(){
    content.addEventListener('click', async (e)=>{
      const btn = e.target.closest('[data-archive-replay],[data-archive-export],[data-archive-delete]');
      if (!btn) return;
      const id = btn.getAttribute('data-archive-replay')||btn.getAttribute('data-archive-export')||btn.getAttribute('data-archive-delete');
      if (!id) return;
      if (btn.hasAttribute('data-archive-replay')){
        try {
          const { archiveManager } = await import('../services/archiveManagementService.js');
            const { startReplay } = await import('../services/replayService.js');
            const list = archiveManager.getAllArchives();
            const meta = list.find(a=> (a.id===id));
            if (!meta) { console.warn('[archives] not found', id); return; }
            const snapshot = await archiveManager.loadArchive(meta);
            startReplay(window.__KOT_NEW__.store, snapshot, {});
        } catch(err){ console.warn('[archive replay] failed', err); }
      } else if (btn.hasAttribute('data-archive-export')){
        try {
          const { archiveManager } = await import('../services/archiveManagementService.js');
          const list = archiveManager.getAllArchives();
          const meta = list.find(a=> a.id===id);
          if (!meta) return;
          const snapshot = await archiveManager.loadArchive(meta);
          const blob = new Blob([JSON.stringify(snapshot,null,2)], {type:'application/json'});
          const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`archive-${id}.json`; a.click(); setTimeout(()=> URL.revokeObjectURL(url), 2000);
        } catch(err){ console.warn('[archive export] failed', err); }
      } else if (btn.hasAttribute('data-archive-delete')){
        if (!confirm('Delete this archive?')) return;
        try {
          const { archiveManager } = await import('../services/archiveManagementService.js');
          archiveManager.deleteArchive?.(id); // if method exists
          loadArchives();
        } catch(err){ console.warn('[archive delete] failed', err); }
      }
    });
  }
  attachArchiveHandlers();

  // Replay controls referencing active replay
  function attachReplayControls(){
    content.addEventListener('click', async (e)=>{
      const btn = e.target.closest('[data-replay-pause],[data-replay-resume],[data-replay-stop]');
      if (!btn) return;
      const mod = await import('../services/replayService.js');
      if (btn.hasAttribute('data-replay-pause')) mod.pauseReplay();
      else if (btn.hasAttribute('data-replay-resume')) mod.resumeReplay();
      else if (btn.hasAttribute('data-replay-stop')) mod.stopReplay();
    });
  }
  attachReplayControls();

  // Dev tools actions inside tab
  function attachDevToolsActions(){
    content.addEventListener('click', async (e)=>{
      const btn = e.target.closest('[data-dev-reset-positions],[data-dev-log-positions],[data-dev-log-dice],[data-dev-log-effects],[data-dev-archive-game],[data-dev-archive-aidt]');
      if (!btn) return;
      const store = window.__KOT_NEW__?.store;
      if (!store) return;
      const { eventBus } = await import('../core/eventBus.js');
      if (btn.hasAttribute('data-dev-reset-positions')) eventBus.emit('ui/positions/reset');
      else if (btn.hasAttribute('data-dev-log-positions')) console.log('UI Positions', store.getState().ui.positions);
      else if (btn.hasAttribute('data-dev-log-dice')) {
        const st = store.getState();
        const order = st.players.order; let activeMods={};
        if (order.length){ const activeId = order[st.meta.activePlayerIndex % order.length]; activeMods = st.players.byId[activeId]?.modifiers||{}; }
        console.log('Dice State', st.dice, 'Active Player Mods', activeMods);
      }
      else if (btn.hasAttribute('data-dev-log-effects')) console.log('Effect Queue', store.getState().effectQueue);
      else if (btn.hasAttribute('data-dev-archive-game')) { const { archiveGameLog } = await import('../services/logArchiveService.js'); archiveGameLog(store,'Manual Snapshot'); }
      else if (btn.hasAttribute('data-dev-archive-aidt')) { const { archiveAIDT } = await import('../services/logArchiveService.js'); archiveAIDT(store,'Manual Snapshot'); }
    });
  }
  attachDevToolsActions();
  
  // Accessibility: roving tabindex and arrow key navigation
  tabButtons.forEach((btn,i)=>{ btn.setAttribute('role','tab'); btn.setAttribute('tabindex', i===0? '0':'-1'); });
  tabContents.forEach(tc=> tc.setAttribute('role','tabpanel'));

  function activateTab(button){
    const targetTab = button.getAttribute('data-tab');
    try { localStorage.setItem(LS_LAST_TAB, targetTab); } catch(_) {}
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.style.color = '#999';
      btn.style.borderBottomColor = 'transparent';
      btn.setAttribute('tabindex','-1');
      btn.setAttribute('aria-selected','false');
    });
    button.classList.add('active');
    button.style.color = '#e4e4e4';
    button.style.borderBottomColor = '#6c5ce7';
    button.setAttribute('tabindex','0');
    button.setAttribute('aria-selected','true');
    tabContents.forEach(c => { c.style.display='none'; c.classList.remove('active'); });
    const targetContent = content.querySelector(`[data-tab-content="${targetTab}"]`);
    if (targetContent){ targetContent.style.display = 'block'; targetContent.classList.add('active'); }
    if (targetTab === 'scenarios') ensureScenariosMounted();
    if (targetTab === 'ai') ensureAIMounted();
    if (targetTab === 'archives' && !archivesLoaded){ loadArchives(); archivesLoaded=true; }
  }

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      activateTab(button);
    });
    button.addEventListener('keydown', (e)=>{
      const idx = Array.from(tabButtons).indexOf(button);
      let targetIdx = null;
      if (e.key==='ArrowRight') targetIdx = (idx+1) % tabButtons.length;
      else if (e.key==='ArrowLeft') targetIdx = (idx-1+tabButtons.length) % tabButtons.length;
      else if (e.key==='Home') targetIdx = 0;
      else if (e.key==='End') targetIdx = tabButtons.length-1;
      if (targetIdx!=null){
        e.preventDefault();
        const nextBtn = tabButtons[targetIdx];
        activateTab(nextBtn);
        nextBtn.focus();
      }
    });
  });

  // Restore previously selected tab (if different from default 'gameplay')
  try {
    const last = localStorage.getItem(LS_LAST_TAB);
    if (last && last !== 'gameplay') {
      const btn = content.querySelector(`.tab-button[data-tab="${last}"]`);
      if (btn) btn.click();
    }
  } catch(_) {}

  // Handle form changes
  const form = content.querySelector('.unified-modal-form');
  
  // Update theme preview function
  const updateThemePreview = (theme) => {
    const previewCard = content.querySelector('#theme-preview-card');
    if (!previewCard) return;
    
    // Reset to original styles
    previewCard.style.background = 'linear-gradient(135deg, #2d3436 0%, #1b1f20 78%)';
    previewCard.style.border = '2px solid #222';
    previewCard.style.color = '#ececec';
    previewCard.style.boxShadow = 'none';
    
    const titleEl = previewCard.querySelector('div');
    const costEl = previewCard.querySelector('div:last-child');
    
    if (theme === 'mystical') {
      previewCard.style.background = 'linear-gradient(135deg, #2d1810 0%, #1a0f08 78%)';
      previewCard.style.border = '2px solid #8b4513';
      previewCard.style.color = '#f4e4bc';
      previewCard.style.boxShadow = '2px 2px 0 #654321, 0 0 0 1px #8b4513 inset, 0 0 15px rgba(255, 215, 0, 0.2)';
      if (titleEl) {
        titleEl.style.color = '#ffd700';
        titleEl.style.fontFamily = "'Creepster', cursive";
        titleEl.style.textShadow = '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 10px rgba(255, 215, 0, 0.5)';
      }
      if (costEl) {
        costEl.style.background = '#4a2c17';
        costEl.style.border = '1px solid #8b4513';
        costEl.style.color = '#ffd700';
      }
    } else if (theme === 'tech') {
      previewCard.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 78%)';
      previewCard.style.border = '2px solid #00ffff';
      previewCard.style.color = '#e0e0e0';
      previewCard.style.boxShadow = '2px 2px 0 #008b8b, 0 0 0 1px #00ffff inset, 0 0 20px rgba(0, 255, 255, 0.2)';
      if (titleEl) {
        titleEl.style.color = '#00ffff';
        titleEl.style.fontFamily = "'Courier New', monospace";
        titleEl.style.textTransform = 'uppercase';
        titleEl.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 10px rgba(0, 255, 255, 0.8)';
      }
      if (costEl) {
        costEl.style.background = '#001a1a';
        costEl.style.border = '1px solid #00ffff';
        costEl.style.color = '#00ffff';
        costEl.style.fontFamily = "'Courier New', monospace";
      }
    } else {
      // Original theme - reset to defaults (already done above)
      if (titleEl) {
        titleEl.style.fontFamily = "'Bangers', cursive";
        titleEl.style.textTransform = 'none';
      }
      if (costEl) {
        costEl.style.fontFamily = "'Bangers', cursive";
      }
    }
  };
  
  // --- Dirty Tracking & Manual Save Implementation ---
  const saveBtn = content.querySelector('.save-btn');

  function collectSettingsFromForm() {
    const formData = new FormData(form);
    return {
      // Gameplay settings
      cpuSpeed: formData.get('cpuSpeed'),
      showThoughtBubbles: form.querySelector('input[name="showThoughtBubbles"]')?.checked || false,
      soundMuted: form.querySelector('input[name="soundMuted"]')?.checked || false,
      autoActivateMonsters: form.querySelector('input[name="autoActivateMonsters"]')?.checked || false,

      // Interface settings
      playerCardLayoutMode: formData.get('playerCardLayoutMode'),
      actionMenuMode: formData.get('actionMenuMode'),
      persistPositions: form.querySelector('input[name="persistPositions"]')?.checked || false,

      // Theme settings
      powerCardTheme: formData.get('powerCardTheme'),
      dialogSystem: formData.get('dialogSystem'),

      // Advanced settings
      autoStartInTest: form.querySelector('input[name="autoStartInTest"]')?.checked || false,
      debugMode: form.querySelector('input[name="debugMode"]')?.checked || false,
      showPerformanceMetrics: form.querySelector('input[name="showPerformanceMetrics"]')?.checked || false,
      enableDecisionTreeCapture: form.querySelector('input[name="enableDecisionTreeCapture"]')?.checked || false,
      enableFloatingDevPanel: form.querySelector('input[name="enableFloatingDevPanel"]')?.checked || false
    };
  }

  function shallowEqual(a, b) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (a[k] !== b[k]) return false;
    }
    return true;
  }

  let baselineSettings = null;

  function establishBaseline() {
    baselineSettings = collectSettingsFromForm();
    if (saveBtn) saveBtn.disabled = true;
  }

  function handlePotentialDirty(e) {
    // Theme preview side-effect (does not persist until save)
    if (e && e.target && e.target.name === 'powerCardTheme') {
      const themeValue = e.target.value;
      updateThemePreview(themeValue);
      // Apply preview to actual panel (visual only before save)
      const powerCardsPanel = document.getElementById('power-cards-panel');
      if (powerCardsPanel) {
        if (themeValue !== 'original') powerCardsPanel.setAttribute('data-theme', themeValue);
        else powerCardsPanel.removeAttribute('data-theme');
      }
    }
    const current = collectSettingsFromForm();
    const dirty = !shallowEqual(current, baselineSettings);
    if (saveBtn) saveBtn.disabled = !dirty;
  }

  form.addEventListener('change', handlePotentialDirty);
  form.addEventListener('input', handlePotentialDirty);

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!baselineSettings) return; // safety
      const newSettings = collectSettingsFromForm();
      const dirty = !shallowEqual(newSettings, baselineSettings);
      if (!dirty) return; // nothing to do
      if (window.__KOT_NEW__?.store) {
        try {
          const actions = await import('../core/actions.js');
          window.__KOT_NEW__.store.dispatch(actions.settingsUpdated(newSettings));
          console.log('[NEW-SETTINGS] Settings saved:', newSettings);
          baselineSettings = newSettings; // reset baseline
          saveBtn.disabled = true;
        } catch (err) {
          console.error('[NEW-SETTINGS] Failed to save settings:', err);
        }
      }
    });
  }

  // Advanced button handlers
  const exportBtn = content.querySelector('.export-settings-btn');
  const importBtn = content.querySelector('.import-settings-btn');
  const resetBtn = content.querySelector('.reset-settings-btn');
  const clearBtn = content.querySelector('.clear-all-data-btn');
  const importFile = content.querySelector('#settings-import-file');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const state = window.__KOT_NEW__?.store?.getState();
      const settings = state?.settings || {};
      const dataStr = JSON.stringify(settings, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `kot-settings-${new Date().toISOString().slice(0,10)}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    });
  }

  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => {
      importFile.click();
    });
    
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const importedSettings = JSON.parse(e.target.result);
            if (window.__KOT_NEW__?.store) {
              const actions = await import('../core/actions.js');
              window.__KOT_NEW__.store.dispatch(actions.settingsUpdated(importedSettings));
              // Apply imported settings to form fields directly then reset baseline
              applySettingsToForm(importedSettings);
              baselineSettings = collectSettingsFromForm();
              if (saveBtn) saveBtn.disabled = true;
            }
          } catch (err) {
            alert('Invalid settings file. Please select a valid JSON file.');
          }
        };
        reader.readAsText(file);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm('Reset all settings to default values? This cannot be undone.')) {
        const defaultSettings = {
          cpuSpeed: 'normal',
          showThoughtBubbles: true,
          soundMuted: false,
          autoActivateMonsters: false,
          playerCardLayoutMode: 'stacked',
          actionMenuMode: 'hybrid',
          persistPositions: true,
          powerCardTheme: 'original',
          dialogSystem: 'unified',
          autoStartInTest: false,
          debugMode: false,
          showPerformanceMetrics: false
        };
        
        if (window.__KOT_NEW__?.store) {
          try {
            const actions = await import('../core/actions.js');
            window.__KOT_NEW__.store.dispatch(actions.settingsUpdated(defaultSettings));
            applySettingsToForm(defaultSettings);
            baselineSettings = collectSettingsFromForm();
            if (saveBtn) saveBtn.disabled = true;
          } catch (e) {
            console.error('Failed to reset settings:', e);
          }
        }
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear ALL game data including settings, save games, and statistics? This cannot be undone!')) {
        if (confirm('Are you absolutely sure? This will remove everything!')) {
          // Clear localStorage
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('KOT_') || key.startsWith('kot-')) {
              localStorage.removeItem(key);
            }
          });
          alert('All game data cleared. The page will reload.');
          window.location.reload();
        }
      }
    });
  }

  // No bottom close button; overlay / ESC handles close

  function applySettingsToForm(settings) {
    // Gameplay
    const cpuSelect = content.querySelector('select[name="cpuSpeed"]');
    if (cpuSelect) cpuSelect.value = settings.cpuSpeed || 'normal';
    const thoughtBubbles = content.querySelector('input[name="showThoughtBubbles"]');
    if (thoughtBubbles) thoughtBubbles.checked = !!settings.showThoughtBubbles;
    const soundMuted = content.querySelector('input[name="soundMuted"]');
    if (soundMuted) soundMuted.checked = !!settings.soundMuted;
    const autoActivate = content.querySelector('input[name="autoActivateMonsters"]');
    if (autoActivate) autoActivate.checked = !!settings.autoActivateMonsters;
    // Interface
    const persistPositions = content.querySelector('input[name="persistPositions"]');
    if (persistPositions) persistPositions.checked = !!settings.persistPositions;
    // Advanced
    const autoStart = content.querySelector('input[name="autoStartInTest"]');
    if (autoStart) autoStart.checked = !!settings.autoStartInTest;
    const debugMode = content.querySelector('input[name="debugMode"]');
    if (debugMode) debugMode.checked = !!settings.debugMode;
    const performanceMetrics = content.querySelector('input[name="showPerformanceMetrics"]');
    if (performanceMetrics) performanceMetrics.checked = !!settings.showPerformanceMetrics;
    // Radio groups
    const cardLayoutMode = settings.playerCardLayoutMode || (settings.stackedPlayerCards === false ? 'list' : 'stacked');
    content.querySelectorAll('input[name="playerCardLayoutMode"]').forEach(r => r.checked = r.value === cardLayoutMode);
    const actionMode = settings.actionMenuMode || 'hybrid';
    content.querySelectorAll('input[name="actionMenuMode"]').forEach(r => r.checked = r.value === actionMode);
    const powerCardTheme = settings.powerCardTheme || 'original';
    content.querySelectorAll('input[name="powerCardTheme"]').forEach(r => r.checked = r.value === powerCardTheme);
    const dialogSystem = settings.dialogSystem || 'legacy';
    content.querySelectorAll('input[name="dialogSystem"]').forEach(r => r.checked = r.value === dialogSystem);
    updateThemePreview(powerCardTheme);
    // Dev tool flags
    const dtCap = content.querySelector('input[name="enableDecisionTreeCapture"]');
    if (dtCap) dtCap.checked = !!settings.enableDecisionTreeCapture;
    const floatDev = content.querySelector('input[name="enableFloatingDevPanel"]');
    if (floatDev) floatDev.checked = !!settings.enableFloatingDevPanel;
  }

  // Load current settings initially
  if (window.__KOT_NEW__?.store) {
    const state = window.__KOT_NEW__.store.getState();
    applySettingsToForm(state.settings || {});
  }

  const __settingsModal = newModalSystem.createModal('settings', '⚙️ Game Settings', content, { width: '900px' });
  try { __settingsModal.setAttribute('data-modal-id','settings'); } catch(_) {}

  // Establish baseline AFTER loading initial settings values
  establishBaseline();
  return __settingsModal;
}

export function createGameLogModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="unified-modal-form">
      <!-- Filter Controls -->
      <div class="filter-controls">
        <div class="filter-group">
          <label>Show:</label>
          <select name="logFilter" class="field-input" style="min-width: 120px;">
            <option value="all">All Events</option>
            <option value="dice">Dice Rolls</option>
            <option value="combat">Combat</option>
            <option value="cards">Power Cards</option>
            <option value="phase">Phase Changes</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Player:</label>
          <select name="playerFilter" class="field-input" style="min-width: 100px;">
            <option value="all">All Players</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="field-checkbox" style="margin: 0;">
            <input type="checkbox" name="autoScroll" checked>
            <span class="checkbox-label">Auto-scroll</span>
          </label>
        </div>
      </div>

      <!-- Game Log Content -->
      <div class="modal-content-scrollable" id="game-log-content">
        <div class="log-loading" style="text-align: center; color: #999; font-style: italic;">
          📜 Loading game log...
        </div>
      </div>
    </div>
    
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary clear-btn">🗑️ Clear Log</button>
      <button type="button" class="btn btn-primary export-btn">💾 Export</button>
    </div>
  `;

  // Load and display log entries
  const updateLogContent = () => {
    const logContainer = content.querySelector('#game-log-content');
    const logFilter = content.querySelector('select[name="logFilter"]').value;
    const playerFilter = content.querySelector('select[name="playerFilter"]').value;
    
    if (window.__KOT_NEW__?.store) {
      const state = window.__KOT_NEW__.store.getState();
      const logEntries = state.log?.entries || [];
      
      if (logEntries.length === 0) {
        logContainer.innerHTML = '<div style="text-align: center; color: #999; font-style: italic; padding: 40px;">📋 No game events recorded yet.<br>Start playing to see the action log!</div>';
        return;
      }

      // Filter entries
      let filteredEntries = logEntries;
      if (logFilter !== 'all') {
        filteredEntries = logEntries.filter(entry => {
          const msg = (entry.message || entry.text || '').toLowerCase();
          switch (logFilter) {
            case 'dice': return msg.includes('roll') || msg.includes('dice') || msg.includes('keep');
            case 'combat': return msg.includes('attack') || msg.includes('damage') || msg.includes('heal');
            case 'cards': return msg.includes('card') || msg.includes('buy') || msg.includes('energy');
            case 'phase': return msg.includes('phase') || msg.includes('turn') || msg.includes('round');
            default: return true;
          }
        });
      }

      if (playerFilter !== 'all') {
        filteredEntries = filteredEntries.filter(entry => 
          (entry.playerId === playerFilter) || (entry.message || '').includes(playerFilter)
        );
      }

      // Render filtered entries
      logContainer.innerHTML = filteredEntries.length === 0 
        ? '<div style="text-align: center; color: #999; font-style: italic; padding: 20px;">No entries match current filters</div>'
        : renderLogEntries(filteredEntries);

      // Auto-scroll to bottom if enabled
      if (content.querySelector('input[name="autoScroll"]').checked) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  };

  // Filter change handlers
  content.querySelector('select[name="logFilter"]').addEventListener('change', updateLogContent);
  content.querySelector('select[name="playerFilter"]').addEventListener('change', updateLogContent);

  // Populate player filter options
  if (window.__KOT_NEW__?.store) {
    const state = window.__KOT_NEW__.store.getState();
    const playersState = state.players || { order: [], byId: {} };
    const playerSelect = content.querySelector('select[name="playerFilter"]');
    
    // Convert from new store structure: { order: [...], byId: {...} } to array of players
    playersState.order.forEach(playerId => {
      const player = playersState.byId[playerId];
      if (player) {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.name || `Player ${player.id}`;
        playerSelect.appendChild(option);
      }
    });
  }

  // Clear log button
  content.querySelector('.clear-btn').addEventListener('click', async () => {
    if (confirm('Clear the entire game log? This cannot be undone.')) {
      try {
        // Clear log in store if available
        if (window.__KOT_NEW__?.store) {
          const { logCleared } = await import('../core/actions.js');
          window.__KOT_NEW__.store.dispatch(logCleared());
          updateLogContent();
        }
      } catch (e) {
        console.error('Failed to clear log:', e);
      }
    }
  });

  // Export log button
  content.querySelector('.export-btn').addEventListener('click', () => {
    if (window.__KOT_NEW__?.store) {
      const state = window.__KOT_NEW__.store.getState();
      const logEntries = state.log?.entries || [];
      const logText = logEntries.map(entry => 
        `[${entry.timestamp || 'Unknown'}] ${entry.message || entry.text || JSON.stringify(entry)}`
      ).join('\n');
      
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kingoftokyo-log-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });

  // No explicit Close button; overlay / ESC handles close

  // Initial load
  updateLogContent();

  const __gameLogModal = newModalSystem.createModal('gameLog', '📜 Game Log', content, { width: '700px' });
  try { __gameLogModal.setAttribute('data-modal-id','gameLog'); } catch(_) {}
  return __gameLogModal;
}

function renderLogEntries(entries) {
  return entries.map(entry => {
    const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
    const message = entry.message || entry.text || JSON.stringify(entry);
    const type = getLogEntryType(message);
    
    return `
      <div class="log-entry" style="padding: 8px 0; border-bottom: 1px solid #333; font-family: monospace; font-size: 0.875rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div style="flex: 1; color: #e4e4e4; line-height: 1.4;">
            <span class="status-indicator ${type}" style="margin-right: 8px; font-size: 0.65rem;">${getLogIcon(type)}</span>
            ${message}
          </div>
          ${timestamp ? `<div style="color: #666; font-size: 0.75rem; white-space: nowrap;">${timestamp}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function getLogEntryType(message) {
  const msg = message.toLowerCase();
  if (msg.includes('error') || msg.includes('failed')) return 'error';
  if (msg.includes('attack') || msg.includes('damage')) return 'warning';
  if (msg.includes('heal') || msg.includes('win')) return 'success';
  if (msg.includes('roll') || msg.includes('dice')) return 'info';
  return 'info';
}

function getLogIcon(type) {
  switch (type) {
    case 'error': return '❌';
    case 'warning': return '⚔️';
    case 'success': return '✅';
    case 'info': return '🎲';
    default: return '📝';
  }
}

export function createHelpModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="modal-content-scrollable">
      <div class="content-section">
        <h4>🎮 Game Controls</h4>
        <ul>
          <li><strong>Roll Dice:</strong> Click the "Roll" button or press Space</li>
          <li><strong>Keep Dice:</strong> Click on dice to keep them before rerolling</li>
          <li><strong>Buy Cards:</strong> Click on power cards in the shop</li>
          <li><strong>Enter Tokyo:</strong> Click "Enter Tokyo" when prompted</li>
          <li><strong>Attack:</strong> Roll claws to attack other monsters</li>
        </ul>
      </div>
      
      <div class="content-section">
        <h4>🏆 Winning Conditions</h4>
        <ul>
          <li>Reach <strong>20 Victory Points</strong></li>
          <li>Be the <strong>last monster standing</strong></li>
          <li>Control Tokyo and survive attacks</li>
        </ul>
      </div>
      
      <h3 style="color: #ffd700;">Dice Symbols</h3>
      <ul style="padding-left: 20px; margin-bottom: 20px;">
        <li><strong>1, 2, 3:</strong> Victory Points (need 3+ of same number)</li>
        <li><strong>Energy:</strong> Buy power cards</li>
        <li><strong>Health:</strong> Heal damage (not in Tokyo)</li>
        <li><strong>Attack:</strong> Deal damage to other monsters</li>
      </div>

      <div class="content-section">
        <h4>🎲 Dice Symbols</h4>
        <ul>
          <li><strong>⚡ Energy:</strong> Currency to buy power cards</li>
          <li><strong>❤️ Hearts:</strong> Heal damage (not available in Tokyo)</li>
          <li><strong>🏆 Victory Points:</strong> Numbers 1, 2, 3 give points</li>
          <li><strong>👹 Attack:</strong> Deal damage to other monsters</li>
        </ul>
      </div>

      <div class="content-section">
        <h4>🗾 Tokyo Mechanics</h4>
        <p>Entering Tokyo gives you victory points each turn, but you can't heal and take damage from all attacks!</p>
        <ul>
          <li>Get <strong>1 VP</strong> for entering Tokyo</li>
          <li>Get <strong>2 VP</strong> at start of each turn in Tokyo</li>
          <li>Can't use hearts to heal while in Tokyo</li>
          <li>All other monsters' attacks hit you</li>
        </ul>
      </div>
      
      <div class="content-section">
        <h4>⌨️ Keyboard Shortcuts</h4>
        <ul>
          <li><strong>Space:</strong> Roll dice</li>
          <li><strong>M:</strong> Toggle sound</li>
          <li><strong>Escape:</strong> Close modals</li>
        </ul>
      </div>
    </div>
    <!-- No bottom close button: modal can be closed via overlay / ESC -->
  `;

  // No bottom close button; overlay / ESC handles close

  const __helpModal = newModalSystem.createModal('help', '❓ Help & Instructions', content, { width: '600px' });
  try { __helpModal.setAttribute('data-modal-id','help'); } catch(_) {}
  return __helpModal;
}

export function createAIDecisionModal() {
  const content = document.createElement('div');
  content.className = 'ai-decision-tree-wrapper';
  content.innerHTML = '<div style="padding: 20px; text-align: center; color: #ccc;">Loading AI Decision Tree...</div>';
  
  // Lazy import new component to avoid upfront cost
  import('../components/ai-decision-tree/ai-decision-tree.component.js').then(mod => {
    try {
      const { root, dispose } = mod.buildAIDecisionTree();
      content.innerHTML = ''; // Clear loading message
      content.appendChild(root);
      
      // Store dispose method for cleanup
      content._treeDispose = dispose;
    } catch(e){ 
      console.error('[aiDecisionModal] failed to init tree', e); 
      content.innerHTML = `<div style="padding: 20px; color: #ff6b6b;">Error loading AI Decision Tree: ${e.message}</div>`;
    }
  }).catch(err=> {
    console.error('[aiDecisionModal] load error', err);
    content.innerHTML = `<div style="padding: 20px; color: #ff6b6b;">Failed to load AI Decision Tree module: ${err.message}</div>`;
  });
  
  return newModalSystem.createModal('aiDecision', '✨ AI Decision Tree', content, { width: '820px' });
}

// Legacy simple render helpers removed: replaced by dedicated component.

export function createAboutModal() {
  const content = document.createElement('div');
  const buildTime = new Date().toLocaleString();
  
  content.innerHTML = `
    <div class="modal-content-scrollable">
      <div class="content-section">
        <h4>👑 King of Tokyo Enhanced</h4>
        <p>A digital implementation of the popular board game by Richard Garfield, featuring AI opponents and enhanced gameplay mechanics.</p>
      </div>

      <div class="content-section">
        <h4>✨ New Features</h4>
        <ul>
          <li><strong>AI Decision Tree:</strong> Watch how CPU players make strategic decisions</li>
          <li><strong>Enhanced UI:</strong> Draggable panels, collapsible interface, responsive design</li>
          <li><strong>Game Log:</strong> Comprehensive action history with filtering</li>
          <li><strong>Thought Bubbles:</strong> See AI reasoning in real-time</li>
          <li><strong>Power Cards:</strong> Full implementation with special abilities</li>
        </ul>
      </div>

      <div class="content-section">
        <h4>🔧 Technical Info</h4>
        <p><strong>Build Version:</strong> Enhanced v2.0</p>
        <p><strong>Built:</strong> ${buildTime}</p>
        <p><strong>Framework:</strong> Vanilla JS with Component Architecture</p>
        <p><strong>State Management:</strong> Redux-style Store</p>
      </div>

      <div class="content-section">
        <h4>🎯 Development Status</h4>
        <div class="status-indicator success">✅ Core Game</div>
        <div class="status-indicator success">✅ AI System</div>
        <div class="status-indicator success">✅ UI Enhancement</div>
        <div class="status-indicator warning">🔄 Power Cards</div>
        <div class="status-indicator info">📋 Dark Edition</div>
      </div>
    </div>
    <!-- No bottom close button: modal can be closed via overlay / ESC -->
  `;

  // No bottom close button; overlay / ESC handles close

  const __aboutModal = newModalSystem.createModal('about', 'ℹ️ About King of Tokyo', content, { width: '500px' });
  try { __aboutModal.setAttribute('data-modal-id','about'); } catch(_) {}
  return __aboutModal;
}