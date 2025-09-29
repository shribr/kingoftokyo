/**
 * new-modals.js
 * Content creators for the new modal system
 */

import { newModalSystem } from './new-modal-system.js';

export function createSettingsModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <!-- Tab Navigation -->
    <div class="settings-tabs" style="display: flex; border-bottom: 2px solid #333; margin-bottom: 20px; background: #1a1a1a; border-radius: 6px 6px 0 0;">
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
    </form>
    <div class="modal-actions">
      <button type="button" class="btn btn-primary save-btn">
        <span>💾</span> Save Settings
      </button>
      <button type="button" class="btn btn-secondary close-btn">
        <span>✕</span> Close
      </button>
    </div>
  `;

  // Handle tab switching
  const tabButtons = content.querySelectorAll('.tab-button');
  const tabContents = content.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Update button states
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = '#999';
        btn.style.borderBottomColor = 'transparent';
      });
      button.classList.add('active');
      button.style.color = '#e4e4e4';
      button.style.borderBottomColor = '#6c5ce7';
      
      // Update content visibility
      tabContents.forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
      });
      const targetContent = content.querySelector(`[data-tab-content="${targetTab}"]`);
      if (targetContent) {
        targetContent.style.display = 'block';
        targetContent.classList.add('active');
      }
    });
  });

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
  
  form.addEventListener('change', async (e) => {
    // Handle power card theme preview
    if (e.target.name === 'powerCardTheme') {
      const themeValue = e.target.value;
      updateThemePreview(themeValue);
      
      // Apply to actual panel too
      const powerCardsPanel = document.querySelector('.cmp-power-cards-panel');
      if (powerCardsPanel) {
        if (themeValue !== 'original') {
          powerCardsPanel.setAttribute('data-theme', themeValue);
        } else {
          powerCardsPanel.removeAttribute('data-theme');
        }
      }
    }
    const formData = new FormData(form);
    const settings = {
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
      showPerformanceMetrics: form.querySelector('input[name="showPerformanceMetrics"]')?.checked || false
    };
    
    // Update settings in store if available
    if (window.__KOT_NEW__?.store) {
      try {
        const actions = await import('../core/actions.js');
        window.__KOT_NEW__.store.dispatch(actions.settingsUpdated(settings));
        console.log('[NEW-SETTINGS] Settings updated:', settings);
      } catch (e) {
        console.error('[NEW-SETTINGS] Failed to update settings:', e);
      }
    }
  });

  // Save button (same as auto-save on change)
  content.querySelector('.save-btn').addEventListener('click', () => {
    // Trigger a change event to save current state
    form.dispatchEvent(new Event('change'));
  });

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
              // Reload the modal to reflect imported settings
              newModalSystem.closeModal('settings');
              setTimeout(() => createSettingsModal(), 100);
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
            // Reload the modal to reflect reset settings
            newModalSystem.closeModal('settings');
            setTimeout(() => createSettingsModal(), 100);
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

  // Close button
  content.querySelector('.close-btn').addEventListener('click', () => {
    newModalSystem.closeModal('settings');
  });

  // Load current settings
  if (window.__KOT_NEW__?.store) {
    const state = window.__KOT_NEW__.store.getState();
    const settings = state.settings || {};
    
    // Load gameplay settings
    const cpuSelect = content.querySelector('select[name="cpuSpeed"]');
    if (cpuSelect && settings.cpuSpeed) cpuSelect.value = settings.cpuSpeed;
    
    const thoughtBubbles = content.querySelector('input[name="showThoughtBubbles"]');
    if (thoughtBubbles) thoughtBubbles.checked = !!settings.showThoughtBubbles;
    
    const soundMuted = content.querySelector('input[name="soundMuted"]');
    if (soundMuted) soundMuted.checked = !!settings.soundMuted;
    
    const autoActivate = content.querySelector('input[name="autoActivateMonsters"]');
    if (autoActivate) autoActivate.checked = !!settings.autoActivateMonsters;

    // Load interface settings
    const persistPositions = content.querySelector('input[name="persistPositions"]');
    if (persistPositions) persistPositions.checked = !!settings.persistPositions;
    
    // Load advanced settings
    const autoStart = content.querySelector('input[name="autoStartInTest"]');
    if (autoStart) autoStart.checked = !!settings.autoStartInTest;
    
    const debugMode = content.querySelector('input[name="debugMode"]');
    if (debugMode) debugMode.checked = !!settings.debugMode;
    
    const performanceMetrics = content.querySelector('input[name="showPerformanceMetrics"]');
    if (performanceMetrics) performanceMetrics.checked = !!settings.showPerformanceMetrics;

    // Load player card layout mode
    const cardLayoutMode = settings.playerCardLayoutMode || (settings.stackedPlayerCards === false ? 'list' : 'stacked');
    const cardLayoutRadios = content.querySelectorAll('input[name="playerCardLayoutMode"]');
    cardLayoutRadios.forEach(radio => {
      radio.checked = radio.value === cardLayoutMode;
    });

    // Load action menu mode
    const actionMode = settings.actionMenuMode || 'hybrid';
    const actionRadios = content.querySelectorAll('input[name="actionMenuMode"]');
    actionRadios.forEach(radio => {
      radio.checked = radio.value === actionMode;
    });

    // Load power card theme
    const powerCardTheme = settings.powerCardTheme || 'original';
    const themeRadios = content.querySelectorAll('input[name="powerCardTheme"]');
    themeRadios.forEach(radio => {
      radio.checked = radio.value === powerCardTheme;
    });
    
    // Load dialog system
    const dialogSystem = settings.dialogSystem || 'legacy';
    const dialogRadios = content.querySelectorAll('input[name="dialogSystem"]');
    dialogRadios.forEach(radio => {
      radio.checked = radio.value === dialogSystem;
    });
    
    // Initialize theme preview
    updateThemePreview(powerCardTheme);
  }

  return newModalSystem.createModal('settings', '⚙️ Game Settings', content, { width: '500px' });
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
      <button type="button" class="btn btn-secondary clear-btn">
        <span>🗑️</span> Clear Log
      </button>
      <button type="button" class="btn btn-primary export-btn">
        <span>💾</span> Export
      </button>
      <button type="button" class="btn btn-secondary close-btn">
        <span>✕</span> Close
      </button>
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
    const players = state.players || [];
    const playerSelect = content.querySelector('select[name="playerFilter"]');
    players.forEach(player => {
      const option = document.createElement('option');
      option.value = player.id;
      option.textContent = player.name || `Player ${player.id}`;
      playerSelect.appendChild(option);
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

  // Close button
  content.querySelector('.close-btn').addEventListener('click', () => {
    newModalSystem.closeModal('gameLog');
  });

  // Initial load
  updateLogContent();

  return newModalSystem.createModal('gameLog', '📜 Game Log', content, { width: '700px' });
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
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary close-btn">
        <span>✕</span> Close
      </button>
    </div>
  `;

  // Close button
  content.querySelector('.close-btn').addEventListener('click', () => {
    newModalSystem.closeModal('help');
  });

  return newModalSystem.createModal('help', '❓ Help & Instructions', content, { width: '600px' });
}

export function createAIDecisionModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="unified-modal-form">
      <!-- AI Decision Tree Content -->
      <div class="modal-content-scrollable" id="ai-tree-content">
        <div style="text-align: center; color: #999; font-style: italic; padding: 40px;">
          🤖 Waiting for AI decisions...<br>
          <small>Play some turns with CPU players to see their decision-making process</small>
        </div>
      </div>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-primary refresh-btn">
        <span>🔄</span> Refresh
      </button>
      <button type="button" class="btn btn-secondary close-btn">
        <span>✕</span> Close
      </button>
    </div>
  `;

  // Load AI decision tree data and render it
  const updateAITree = async () => {
    try {
      const { getAIDecisionTree } = await import('../services/aiDecisionService.js');
      const tree = getAIDecisionTree();
      const treeContainer = content.querySelector('#ai-tree-content');
      if (treeContainer) {
        treeContainer.innerHTML = renderAITree(tree);
      }
    } catch (error) {
      console.warn('Error loading AI decision tree:', error);
    }
  };

  // Refresh button
  content.querySelector('.refresh-btn').addEventListener('click', () => {
    updateAITree();
  });

  // Close button
  content.querySelector('.close-btn').addEventListener('click', () => {
    newModalSystem.closeModal('aiDecision');
  });

  // Initial load
  updateAITree();

  return newModalSystem.createModal('aiDecision', '✨ AI Decision Tree', content, { width: '600px' });
}

function renderAITree(tree) {
  if (!tree.rounds.length) {
    return '<div style="padding: 20px; text-align: center; color: #999; font-style: italic;">No AI decisions recorded yet.<br>Play some turns with CPU players to see their decision-making process.</div>';
  }

  return `
    <div class="ai-rounds" style="max-height: 400px; overflow-y: auto; padding: 10px;">
      ${tree.rounds.map(round => renderAIRound(round)).join('')}
    </div>
  `;
}

function renderAIRound(round) {
  return `
    <div class="ai-round" style="border: 1px solid #444; border-radius: 8px; margin-bottom: 16px; background: #1a1a1a;">
      <div class="ai-round-header" style="background: #2a2a2a; padding: 10px 12px; border-radius: 8px 8px 0 0; font-weight: 600; color: #ffd700; border-bottom: 1px solid #444;">
        🎯 Round ${round.round}
      </div>
      <div class="ai-round-content" style="padding: 12px;">
        ${round.turns.map(turn => renderAITurn(turn)).join('')}
      </div>
    </div>
  `;
}

function renderAITurn(turn) {
  return `
    <div class="ai-turn" style="border-left: 2px solid #4a90e2; padding-left: 12px; margin-bottom: 12px;">
      <div class="ai-turn-header" style="font-weight: 600; color: #4a90e2; margin-bottom: 8px;">
        ⚡ Turn ${turn.turn}
      </div>
      <div class="ai-turn-rolls">
        ${turn.rolls.map(roll => renderAIRoll(roll)).join('')}
      </div>
    </div>
  `;
}

function renderAIRoll(roll) {
  return `
    <div class="ai-roll" style="background: #2a2a2a; border-radius: 6px; padding: 10px; margin-bottom: 8px; border-left: 3px solid #ffd700;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span class="faces" style="font-family: monospace; font-weight: 600; color: #e4e4e4;">🎲 ${roll.faces}</span>
        <span class="score" style="background: #4a90e2; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
          Score: ${roll.score}
        </span>
      </div>
      <div class="rationale" style="color: #ccc; font-size: 0.875rem; line-height: 1.4; font-style: italic;">
        ${roll.rationale}
      </div>
    </div>
  `;
}

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
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary close-btn">
        <span>✕</span> Close
      </button>
    </div>
  `;

  // Close button
  content.querySelector('.close-btn').addEventListener('click', () => {
    newModalSystem.closeModal('about');
  });

  return newModalSystem.createModal('about', 'ℹ️ About King of Tokyo', content, { width: '500px' });
}