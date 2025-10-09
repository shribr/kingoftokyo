/** settings-menu.component.js
 * Lightweight Tools menu for mobile. Anchors to bottom-right and expands upward.
 */
import { store } from '../../bootstrap/index.js';
import { uiSettingsOpen, uiGameLogOpen, uiInstructionsOpen, uiAboutOpen, uiConfirmOpen } from '../../core/actions.js';
import { 
  saveGameState, 
  exportSaveFile, 
  clearSavedGame, 
  hasSavedGame, 
  getSaveInfo,
  toggleAutoSave,
  isAutoSaveActive,
  toggleUnloadConfirmation,
  isUnloadConfirmationEnabled
} from '../../services/gameStatePersistence.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-settings-menu cmp-panel-root';
  root.setAttribute('data-layout','vertical');
  root.innerHTML = template();
  
  // Update checkboxes to reflect current state
  const updatePersistenceUI = () => {
    const autoSaveCheck = root.querySelector('[data-check="auto-save"]');
    const confirmCheck = root.querySelector('[data-check="confirm-unload"]');
    if (autoSaveCheck) autoSaveCheck.checked = isAutoSaveActive();
    if (confirmCheck) confirmCheck.checked = isUnloadConfirmationEnabled();
    
    // Update save info
    const saveInfo = getSaveInfo();
    const saveInfoEl = root.querySelector('.save-info');
    if (saveInfoEl) {
      if (saveInfo) {
        const age = Math.floor((Date.now() - saveInfo.timestamp) / 1000);
        const ageStr = age < 60 ? `${age}s ago` : 
                       age < 3600 ? `${Math.floor(age / 60)}m ago` : 
                       `${Math.floor(age / 3600)}h ago`;
        saveInfoEl.textContent = `Last save: ${ageStr} (Round ${saveInfo.round})`;
        saveInfoEl.style.display = 'block';
      } else {
        saveInfoEl.style.display = 'none';
      }
    }
  };
  
  updatePersistenceUI();
  
  // Update save info every 5 seconds when menu is open
  let updateInterval = null;
  const startUpdateInterval = () => {
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updatePersistenceUI, 5000);
  };
  const stopUpdateInterval = () => {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  };
  
  // Wire actions (names-only, no icons)
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const a = btn.getAttribute('data-action');
    if (a === 'settings') store.dispatch(uiSettingsOpen());
    else if (a === 'help') store.dispatch(uiInstructionsOpen());
    else if (a === 'log') store.dispatch(uiGameLogOpen());
    else if (a === 'about') store.dispatch(uiAboutOpen());
    else if (a === 'reset-positions') window.dispatchEvent(new CustomEvent('ui.positions.reset.request'));
    else if (a === 'restart') store.dispatch(uiConfirmOpen('restart-game', 'Restart the game and reload the page?\nUnsaved progress will be lost.', 'Restart', 'Cancel'));
    else if (a === 'mute') {
      try {
        const btn = document.querySelector('.cmp-toolbar [data-action="sound"]');
        if (btn) btn.click();
      } catch(_) {}
    }
    // Persistence actions
    else if (a === 'save-now') {
      saveGameState(store);
      // Show confirmation
      const msg = document.createElement('div');
      msg.className = 'save-confirm-toast';
      msg.textContent = '💾 Game Saved!';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 2000);
      updatePersistenceUI();
    }
    else if (a === 'export-save') {
      try {
        const filename = exportSaveFile();
        const msg = document.createElement('div');
        msg.className = 'save-confirm-toast';
        msg.textContent = `📥 Exported: ${filename}`;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
      } catch (err) {
        alert('Export failed: ' + err.message);
      }
    }
    else if (a === 'import-save') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const { importSaveFile } = await import('../../services/gameStatePersistence.js');
          await importSaveFile(file);
          const msg = document.createElement('div');
          msg.className = 'save-confirm-toast';
          msg.textContent = '📤 Save Imported! Reload to use.';
          document.body.appendChild(msg);
          setTimeout(() => msg.remove(), 3000);
          updatePersistenceUI();
        } catch (err) {
          alert('Import failed: ' + err.message);
        }
      };
      input.click();
      return; // Don't close menu
    }
    else if (a === 'clear-save') {
      if (confirm('Clear saved game? This cannot be undone.')) {
        clearSavedGame();
        const msg = document.createElement('div');
        msg.className = 'save-confirm-toast';
        msg.textContent = '🗑️ Save Cleared';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2000);
        updatePersistenceUI();
      }
      return; // Don't close menu
    }
    // Close after any action via global event (avoids scope issues)
    try { window.dispatchEvent(new CustomEvent('ui.settingsMenu.forceClose')); } catch(_){}
  });
  
  // Handle checkbox changes
  root.addEventListener('change', (e) => {
    if (e.target.dataset.check === 'auto-save') {
      toggleAutoSave(e.target.checked);
      updatePersistenceUI();
    } else if (e.target.dataset.check === 'confirm-unload') {
      toggleUnloadConfirmation(e.target.checked);
      updatePersistenceUI();
    }
  });

  // Mobile hamburger toggle support
  const isTouch = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  if (isTouch && !root._hbWired) {
    root._hbWired = true;
    let backdrop = document.querySelector('.settings-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'settings-menu-backdrop';
      document.body.appendChild(backdrop);
    }
    function applyHidden() {
      const open = !!root._hamburgerOpen;
      root.toggleAttribute('data-hamburger-open', open);
      if (backdrop) backdrop.toggleAttribute('data-show', open);
    }
    window.addEventListener('ui.settingsMenu.hamburgerToggle', (e) => {
      // Close action menu if open to ensure only one menu is visible
      try { window.dispatchEvent(new CustomEvent('ui.actionMenu.forceClose')); } catch(_){}
      root._hamburgerOpen = !root._hamburgerOpen;
      if (root._hamburgerOpen) {
        startUpdateInterval();
        updatePersistenceUI();
      } else {
        stopUpdateInterval();
      }
      try {
        const r = e?.detail?.anchorRect;
        const preferRight = true; // settings button is on right
        if (preferRight) {
          root.removeAttribute('data-hamburger-corner');
          root.style.right = '0.8vw'; root.style.left = 'auto';
        } else {
          root.setAttribute('data-hamburger-corner','left');
          root.style.left = '0.8vw'; root.style.right = 'auto';
        }
        root.style.top = 'auto'; root.style.bottom = '5.6vh';
  // Auto-size: let CSS handle width via max-content/min-width
  root.style.width = '';
      } catch(_){}
      applyHidden();
    });
    backdrop.addEventListener('click', () => { if (root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
  // Listen for forced close from counterpart menu
  window.addEventListener('ui.settingsMenu.forceClose', () => { if (root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
    window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
    window.addEventListener('resize', () => { if (window.innerWidth > 760) { root._hamburgerOpen = false; applyHidden(); } });
    applyHidden();
  }

  return { root, update: () => {}, destroy: () => { stopUpdateInterval(); root.remove(); } };
}

function template() {
  return `
    <button type="button" data-action="settings">Settings</button>
    <button type="button" data-action="help">Help / Instructions</button>
    <button type="button" data-action="log">Game Log</button>
    <button type="button" data-action="about">About</button>
    <hr />
    <div class="persistence-section">
      <div class="section-header">💾 Game Saves</div>
      <div class="save-info" style="display: none; font-size: 0.85em; color: #3fc1c9; margin: 0.5rem 0;"></div>
      <button type="button" data-action="save-now">💾 Save Now</button>
      <button type="button" data-action="export-save">📥 Export Save</button>
      <button type="button" data-action="import-save">📤 Import Save</button>
      <button type="button" data-action="clear-save">🗑️ Clear Save</button>
      <label class="checkbox-label">
        <input type="checkbox" data-check="auto-save" checked>
        <span>Auto-save (5 min)</span>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" data-check="confirm-unload" checked>
        <span>Confirm before leaving</span>
      </label>
    </div>
    <hr />
    <button type="button" data-action="reset-positions">Reset Layout</button>
    <button type="button" data-action="restart">Restart Game</button>
    <button type="button" data-action="mute">Mute / Unmute</button>
  `;
}
