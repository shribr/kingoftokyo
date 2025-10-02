import { uiSettingsClose, settingsUpdated } from '../../core/actions.js';

export function build(/* ctx unused by mount system */) {
  const root = document.createElement('div');
  root.className = 'cmp-settings-modal modal-shell';
  // Start hidden explicitly (mount system will toggle)
  root.style.display = 'none';
  root.setAttribute('data-component','settings-modal');
  root.innerHTML = createModalTemplate();

  // Close button event – rely on globally exposed store used elsewhere
  const closeBtns = root.querySelectorAll('[data-close]');
  closeBtns.forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    try { window.__KOT_NEW__.store.dispatch(uiSettingsClose()); } catch(err) { console.warn('[SettingsModal] close dispatch failed', err); }
  }));

  // Bind tab functionality
  bindTabs(root);

  // Setup form handling
  setupFormHandling(root);

  // Developer tab always available
  setupDeveloperTab(root);
  updateDeveloperTabVisibility(root);

  // Return instance whose update receives the framework ctx so we can adapt
  return {
    root,
    update: (ctxLike) => {
      // Normalize to expected shape used by update() below
      if (!ctxLike) return;
      // mountRoot passes { state: slice } OR our earlier manual calls; we need full state for ui flag.
      // If fullState missing try to pull from global store (safe in browser runtime).
      if (!ctxLike.fullState) {
        try { ctxLike.fullState = window.__KOT_NEW__?.store?.getState?.(); } catch(_) {}
      }
      // Provide root reference expected by original update implementation
      ctxLike.root = root;
      update(ctxLike);
    }
  };
}

function createModalTemplate() {
  return `
    <div class="modal settings" data-settings-modal>
      <div class="modal-header"><h2>Game Settings</h2><button data-close>×</button></div>
      <div class="modal-body" data-tabs-root>
        <div class="settings-tabs" style="display:flex;gap:6px;margin-bottom:10px;">
          <button type="button" data-tab-btn="general" class="is-active" style="padding:4px 10px;font-size:12px;">General</button>
          <button type="button" data-tab-btn="scenarios" style="padding:4px 10px;font-size:12px;">Scenarios</button>
          <button type="button" data-tab-btn="developer" class="dev-tab" style="padding:4px 10px;font-size:12px;display:none;">🔧 Developer</button>
        </div>
        <div data-tab-panel="general" class="tab-panel" style="display:block;">
         <form data-settings-form>
           <div class="field">
             <label for="cpuSpeed">CPU Speed</label>
             <select id="cpuSpeed" name="cpuSpeed">
               <option value="slow">Slow</option>
               <option value="normal">Normal</option>
               <option value="fast">Fast</option>
             </select>
           </div>
           <div class="field">
             <label><input type="checkbox" name="showThoughtBubbles"> Show Thought Bubbles</label>
           </div>
           <div class="field">
             <label><input type="checkbox" name="autoActivateMonsters"> Auto Activate Monsters</label>
           </div>
           <div class="field">
             <label><input type="checkbox" name="autoStartInTest"> Auto Start In Test (skipintro)</label>
           </div>
           <div class="field">
             <label><input type="checkbox" name="disableAnimations"> Disable Non-Essential Animations</label>
           </div>
           <div class="actions">
             <button type="button" data-close>Close</button>
           </div>
         </form>
        </div>
        <div data-tab-panel="scenarios" class="tab-panel" style="display:none;">
          <div data-scenarios-config></div>
        </div>
        <div data-tab-panel="developer" class="tab-panel dev-panel" style="display:none;">
          <div class="developer-panel-container">
            <div class="dev-panel-header">
              <h3>🔧 Developer Tools</h3>
              <p>Advanced tools for development and debugging</p>
            </div>
            <div class="dev-vertical-tabs">
              <div class="dev-tab-buttons">
                <button type="button" data-dev-tab="archives" class="dev-tab-btn active">📁 Archives</button>
                <button type="button" data-dev-tab="analytics" class="dev-tab-btn">📊 Analytics</button>
                <button type="button" data-dev-tab="replay" class="dev-tab-btn">🎬 Replay</button>
                <button type="button" data-dev-tab="aidt" class="dev-tab-btn">🤖 AI Debug</button>
              </div>
              <div class="dev-tab-content">
                <div data-dev-panel="archives" class="dev-tab-panel active">
                  <div id="dev-archive-manager"></div>
                </div>
                <div data-dev-panel="analytics" class="dev-tab-panel">
                  <div id="dev-analytics-dashboard"></div>
                </div>
                <div data-dev-panel="replay" class="dev-tab-panel">
                  <div id="dev-replay-controls"></div>
                </div>
                <div data-dev-panel="aidt" class="dev-tab-panel">
                  <div id="dev-aidt-debug"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function setupFormHandling(root) {
  const form = root.querySelector('[data-settings-form]');
  form.addEventListener('change', (e) => {
    const partial = {
      cpuSpeed: form.querySelector('select[name="cpuSpeed"]')?.value || 'normal',
      showThoughtBubbles: form.querySelector('input[name="showThoughtBubbles"]')?.checked || false,
      autoActivateMonsters: form.querySelector('input[name="autoActivateMonsters"]')?.checked || false,
      autoStartInTest: form.querySelector('input[name="autoStartInTest"]')?.checked || false,
      disableAnimations: form.querySelector('input[name="disableAnimations"]')?.checked || false
    };
    window.__KOT_NEW__.store.dispatch(settingsUpdated(partial));
  });
}

function setupDeveloperTab(root) {
  // Setup vertical tab functionality for developer panel
  root.addEventListener('click', e => {
    const devTabBtn = e.target.closest('[data-dev-tab]');
    if (!devTabBtn) return;
    
    const target = devTabBtn.getAttribute('data-dev-tab');
    
    // Update active states for dev tab buttons
    root.querySelectorAll('[data-dev-tab]').forEach(btn => 
      btn.classList.toggle('active', btn === devTabBtn)
    );
    
    // Show/hide dev tab panels
    root.querySelectorAll('[data-dev-panel]').forEach(panel => 
      panel.classList.toggle('active', panel.getAttribute('data-dev-panel') === target)
    );
    
    // Load content for the selected tab
    loadDeveloperTabContent(root, target);
  });
}

function updateDeveloperTabVisibility(root) {
  const devTab = root.querySelector('[data-tab-btn="developer"]');
  
  if (devTab) {
    devTab.style.display = 'block'; // Always show developer tab
  }
  
  console.log('[Settings] Developer tab visibility: always visible');
}

async function loadDeveloperTabContent(root, tabName) {
  try {
    switch (tabName) {
      case 'archives':
        await loadArchiveManager(root);
        break;
      case 'analytics':
        await loadAnalyticsDashboard(root);
        break;
      case 'replay':
        await loadReplayControls(root);
        break;
      case 'aidt':
        await loadAIDTDebug(root);
        break;
    }
  } catch (error) {
    console.error(`[Settings] Failed to load ${tabName} content:`, error);
  }
}

async function loadArchiveManager(root) {
  const container = root.querySelector('#dev-archive-manager');
  if (!container || container._loaded) return;
  
  try {
    const { ArchiveManagerComponent } = await import('../../ui/components/archiveManagerComponent.js');
    const archiveManager = new ArchiveManagerComponent();
    
    // Create content adapted for tab layout
    container.innerHTML = `
      <div class="tab-archive-manager">
        <h4>📁 Archive Manager</h4>
        <div id="archive-manager-embed"></div>
      </div>
    `;
    
    const embedContainer = container.querySelector('#archive-manager-embed');
    archiveManager.renderInContainer(embedContainer);
    container._loaded = true;
    
    console.log('[Settings] Archive manager loaded in developer tab');
  } catch (error) {
    container.innerHTML = '<div class="error-message">Failed to load Archive Manager</div>';
    console.error('[Settings] Archive manager load error:', error);
  }
}

async function loadAnalyticsDashboard(root) {
  const container = root.querySelector('#dev-analytics-dashboard');
  if (!container || container._loaded) return;
  
  try {
    container.innerHTML = '<div class="loading">📊 Loading analytics...</div>';
    
    const { ArchiveAnalyticsService } = await import('../../services/archiveAnalyticsService.js');
    const analytics = new ArchiveAnalyticsService();
    const data = await analytics.calculateCompleteAnalytics();
    
    container.innerHTML = createAnalyticsDashboard(data);
    container._loaded = true;
    
    console.log('[Settings] Analytics dashboard loaded in developer tab');
  } catch (error) {
    container.innerHTML = '<div class="error-message">Failed to load Analytics Dashboard</div>';
    console.error('[Settings] Analytics dashboard load error:', error);
  }
}

async function loadReplayControls(root) {
  const container = root.querySelector('#dev-replay-controls');
  if (!container || container._loaded) return;
  
  container.innerHTML = `
    <div class="replay-controls-panel">
      <h4>🎬 Replay Controls</h4>
      <div class="replay-info">
        <p>Enhanced replay controls with speed adjustment, keyboard shortcuts, and AIDT integration.</p>
        <div class="feature-list">
          <div class="feature-item">⚡ Speed controls: 0.5x - 4x</div>
          <div class="feature-item">⌨️ Keyboard shortcuts: Space, 1-5, M, Escape</div>
          <div class="feature-item">🤖 AI thought bubble integration</div>
          <div class="feature-item">📊 Progress indicators</div>
        </div>
      </div>
      <div class="replay-actions">
        <button class="dev-btn" onclick="window.replayService?.show()">Open Replay Overlay</button>
        <button class="dev-btn" onclick="console.log('Replay debug info:', window.replayService?.getDebugInfo())">Debug Info</button>
      </div>
    </div>
  `;
  container._loaded = true;
}

async function loadAIDTDebug(root) {
  const container = root.querySelector('#dev-aidt-debug');
  if (!container || container._loaded) return;
  
  container.innerHTML = `
    <div class="aidt-debug-panel">
      <h4>🤖 AI Decision Tree Debug</h4>
      <div class="aidt-info">
        <p>Debug and inspect AI decision-making processes in real-time.</p>
        <div class="debug-actions">
          <button class="dev-btn" onclick="window.aidtService?.showThoughtBubble()">Show AI Thoughts</button>
          <button class="dev-btn" onclick="window.aidtService?.exportDecisions()">Export Decisions</button>
          <button class="dev-btn" onclick="console.log('AIDT State:', window.aidtService?.getState())">Debug State</button>
        </div>
      </div>
      <div class="aidt-visualization">
        <div id="aidt-thought-bubble-container"></div>
      </div>
    </div>
  `;
  container._loaded = true;
}

function createAnalyticsDashboard(data) {
  if (!data) {
    return '<div class="error-message">No analytics data available</div>';
  }
  
  return `
    <div class="analytics-dashboard-tab">
      <h4>📊 Analytics Dashboard</h4>
      <div class="analytics-summary">
        <div class="summary-card">
          <div class="card-value">${data.overview?.totalArchives || 0}</div>
          <div class="card-label">Archives</div>
        </div>
        <div class="summary-card">
          <div class="card-value">${data.overview?.totalGames || 0}</div>
          <div class="card-label">Games</div>
        </div>
        <div class="summary-card">
          <div class="card-value">${data.overview?.totalAIDecisions || 0}</div>
          <div class="card-label">AI Decisions</div>
        </div>
      </div>
      <div class="analytics-actions">
        <button class="dev-btn" onclick="this.exportAnalytics()">📤 Export Report</button>
        <button class="dev-btn" onclick="this.refreshAnalytics()">🔄 Refresh</button>
      </div>
    </div>
  `;
}

export function update(ctx) {
  try {
    const state = ctx.fullState || ctx.state || {};
    const root = ctx.root || ctx.inst?.root || (ctx instanceof HTMLElement ? ctx : null);
    if (!root || !root.querySelector) return; // guard
    const open = !!state.ui?.settings?.open;
    if (open) {
      root.style.display = 'flex';
      root.classList.add('is-open');
      // elevate above most overlays but below ultra-priority (e.g., yield modal / roll-for-first now 100000)
      root.style.zIndex = '12000';
      try { window.__KOT_BLACKOUT__?.hide(); } catch(_) {}
    } else {
      root.classList.remove('is-open');
      root.style.display = 'none';
      return; // nothing else when closed
    }
    ensureScenarioConfigMounted(root);
    updateDeveloperTabVisibility(root);

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
  } catch(err) {
    console.error('[SettingsModal] update failed', err);
  }
}

function bindTabs(root) {
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-tab-btn]');
    if (!btn) return;
    const target = btn.getAttribute('data-tab-btn');
    root.querySelectorAll('[data-tab-btn]').forEach(b => b.classList.toggle('is-active', b === btn));
    root.querySelectorAll('[data-tab-panel]').forEach(p => {
      p.style.display = (p.getAttribute('data-tab-panel') === target) ? 'block' : 'none';
    });
    
    // Handle scenarios tab mounting
    if (target === 'scenarios') {
      ensureScenarioConfigMounted(root);
    }
    
    // Handle developer tab activation
    if (target === 'developer') {
      // Load default archives tab content
      loadDeveloperTabContent(root, 'archives');
    }
  });
}

function ensureScenarioConfigMounted(root) {
  const host = root.querySelector('[data-scenarios-config]');
  if (!host || host._scenarioMounted) return;
  host._scenarioMounted = true;
  // Lazy import existing scenarios tab component and embed its content/summarization
  import('../scenarios-tab/scenarios-tab.component.js').then(mod => {
    const inst = mod.build({});
    host.appendChild(inst.root);
    window.__KOT_NEW__.store.subscribe(() => inst.update());
  }).catch(err => {
    host.innerHTML = `<em style='color:#a55;'>Failed to load scenarios UI (${err?.message || 'error'}).</em>`;
  });
}