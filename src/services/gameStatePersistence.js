/**
 * Game State Persistence Service
 * Automatically saves and restores game state between page reloads
 */

const STORAGE_KEY = 'KOT_ACTIVE_GAME_STATE';
const AUTOSAVE_INTERVAL = 300000; // 5 minutes (300 seconds)
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const SETTINGS_KEY = 'KOT_PERSISTENCE_SETTINGS';

// Actions that trigger an immediate save
const TRIGGER_ACTIONS = new Set([
  'DICE_ROLLED',
  'PLAYER_DAMAGE_APPLIED',
  'PLAYER_VP_GAINED',
  'PLAYER_CARD_GAINED',
  'PLAYER_ENTERED_TOKYO',
  'PLAYER_LEFT_TOKYO',
  'PHASE_CHANGED',
  'TURN_ENDED'
]);

// Global state
let autoSaveInterval = null;
let lastSaveTimestamp = null;
let unsubscribe = null;
let isAutoSaveEnabled = true;
let pendingNavigation = null;

/**
 * Get persistence settings
 */
function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[persistence] Failed to load settings', e);
  }
  return {
    autoSaveEnabled: true,
    confirmBeforeUnload: false
  };
}

/**
 * Save persistence settings
 */
function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[persistence] Failed to save settings', e);
  }
}

/**
 * Toggle auto-save on/off
 */
export function toggleAutoSave(enabled) {
  isAutoSaveEnabled = enabled;
  const settings = getSettings();
  settings.autoSaveEnabled = enabled;
  saveSettings(settings);
  console.log(`[persistence] Auto-save ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Get current auto-save status
 */
export function isAutoSaveActive() {
  return isAutoSaveEnabled;
}

/**
 * Save game state to localStorage
 */
export function saveGameState(store) {
  if (!isAutoSaveEnabled) {
    return;
  }

  try {
    const state = store.getState();
    
    // Create save data
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      state: state
    };

    // Serialize
    let serialized = JSON.stringify(saveData);
    
    // Check size
    const sizeBytes = new Blob([serialized]).size;
    
    if (sizeBytes > MAX_SIZE_BYTES) {
      console.warn('[persistence] Save too large, truncating log');
      // Truncate log to last 50 entries
      const truncatedState = {
        ...state,
        log: {
          ...state.log,
          entries: (state.log?.entries || []).slice(-50)
        }
      };
      
      saveData.state = truncatedState;
      serialized = JSON.stringify(saveData);
      
      const newSize = new Blob([serialized]).size;
      if (newSize > MAX_SIZE_BYTES) {
        console.error('[persistence] Save still too large after truncation, skipping');
        return;
      }
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, serialized);
    lastSaveTimestamp = Date.now();
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('game-saved', { 
      detail: { timestamp: lastSaveTimestamp } 
    }));
    
    if (window.__KOT_DEBUG__?.persistence) {
      console.log('[persistence] Game saved', {
        size: `${(sizeBytes / 1024).toFixed(2)} KB`,
        round: state.game?.round,
        phase: state.phase
      });
    }
  } catch (e) {
    console.error('[persistence] Save failed', e);
  }
}

/**
 * Load game state from localStorage
 */
export function loadGameState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const saveData = JSON.parse(stored);
    
    // Validate version
    if (saveData.version !== 1) {
      console.warn('[persistence] Incompatible save version');
      return null;
    }

    // Check age
    const age = Date.now() - saveData.timestamp;
    if (age > MAX_AGE_MS) {
      console.warn('[persistence] Save too old, clearing');
      clearSavedGame();
      return null;
    }

    // Validate structure
    if (!saveData.state || typeof saveData.state !== 'object') {
      console.warn('[persistence] Invalid save structure');
      return null;
    }

    return saveData.state;
  } catch (e) {
    console.error('[persistence] Load failed', e);
    return null;
  }
}

/**
 * Restore game state to store
 */
export function restoreGameState(store, savedState) {
  try {
    store.dispatch({
      type: 'GAME_STATE_RESTORED',
      payload: { state: savedState }
    });
    console.log('[persistence] Game state restored');
  } catch (e) {
    console.error('[persistence] Restore failed', e);
  }
}

/**
 * Check if saved game exists
 */
export function hasSavedGame() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    
    const saveData = JSON.parse(stored);
    const age = Date.now() - saveData.timestamp;
    
    return age <= MAX_AGE_MS;
  } catch (e) {
    return false;
  }
}

/**
 * Get save metadata
 */
export function getSaveInfo() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const saveData = JSON.parse(stored);
    const state = saveData.state;

    return {
      timestamp: saveData.timestamp,
      round: state.game?.round || 1,
      playerCount: state.players?.order?.length || 0,
      currentPlayer: state.players?.order?.[state.game?.currentPlayerIndex]?.name || null,
      phase: state.phase || 'SETUP'
    };
  } catch (e) {
    return null;
  }
}

/**
 * Clear saved game
 */
export function clearSavedGame() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[persistence] Saved game cleared');
  } catch (e) {
    console.error('[persistence] Clear failed', e);
  }
}

/**
 * Export save as downloadable JSON file
 */
export function exportSaveFile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      throw new Error('No saved game to export');
    }

    const saveData = JSON.parse(stored);
    const info = getSaveInfo();
    
    // Create filename with timestamp
    const date = new Date(saveData.timestamp);
    const filename = `king-of-tokyo-save-${date.toISOString().slice(0, 10)}-round${info.round}.json`;
    
    // Create blob and download
    const blob = new Blob([stored], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('[persistence] Save exported', filename);
    return filename;
  } catch (e) {
    console.error('[persistence] Export failed', e);
    throw e;
  }
}

/**
 * Import save from JSON file
 */
export function importSaveFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const saveData = JSON.parse(content);
        
        // Validate
        if (saveData.version !== 1 || !saveData.state) {
          throw new Error('Invalid save file format');
        }
        
        // Store
        localStorage.setItem(STORAGE_KEY, content);
        console.log('[persistence] Save imported successfully');
        resolve(saveData.state);
      } catch (err) {
        console.error('[persistence] Import failed', err);
        reject(err);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Get last save timestamp
 */
export function getLastSaveTimestamp() {
  return lastSaveTimestamp;
}

/**
 * Create custom unload confirmation modal
 */
function createUnloadModal() {
  const modal = document.createElement('div');
  modal.className = 'unload-confirmation-modal';
  modal.innerHTML = `
    <div class="unload-backdrop"></div>
    <div class="unload-content">
      <div class="unload-icon">⚠️</div>
      <h2>Leave Game?</h2>
      <p>Your game progress has been saved automatically.</p>
      <p class="unload-hint">You can continue from where you left off when you return.</p>
      <div class="unload-actions">
        <button class="unload-btn unload-stay" data-action="stay">
          <span>🎮</span> Stay in Game
        </button>
        <button class="unload-btn unload-leave" data-action="leave">
          <span>🚪</span> Leave
        </button>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.id = 'unload-modal-styles';
  style.textContent = `
    .unload-confirmation-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Orbitron', sans-serif;
      animation: unloadFadeIn 0.2s ease-out;
    }
    .unload-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(8px);
    }
    .unload-content {
      position: relative;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 3px solid #e76f51;
      border-radius: 16px;
      padding: 2.5rem;
      max-width: 450px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7);
      animation: unloadSlideUp 0.3s ease-out;
      text-align: center;
    }
    .unload-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      animation: unloadPulse 2s ease-in-out infinite;
    }
    .unload-content h2 {
      margin: 0 0 1rem;
      color: #e76f51;
      font-size: 2rem;
      text-shadow: 0 0 20px rgba(231, 111, 81, 0.6);
    }
    .unload-content p {
      margin: 0.75rem 0;
      color: #e0e0e0;
      font-size: 1rem;
      line-height: 1.5;
    }
    .unload-hint {
      color: #3fc1c9;
      font-size: 0.9rem;
      font-style: italic;
    }
    .unload-actions {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }
    .unload-btn {
      flex: 1;
      padding: 1rem 1.5rem;
      border: 2px solid;
      border-radius: 10px;
      font-family: 'Orbitron', sans-serif;
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .unload-btn span {
      font-size: 1.8rem;
    }
    .unload-stay {
      background: linear-gradient(135deg, #2a9d8f 0%, #1a5f56 100%);
      border-color: #2a9d8f;
      color: #fff;
    }
    .unload-stay:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 24px rgba(42, 157, 143, 0.5);
      border-color: #3fc1c9;
    }
    .unload-leave {
      background: linear-gradient(135deg, #e76f51 0%, #a84832 100%);
      border-color: #e76f51;
      color: #fff;
    }
    .unload-leave:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 24px rgba(231, 111, 81, 0.5);
    }
    @keyframes unloadFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes unloadSlideUp {
      from { 
        opacity: 0;
        transform: translateY(30px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes unloadPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  `;
  
  if (!document.getElementById('unload-modal-styles')) {
    document.head.appendChild(style);
  }
  
  return modal;
}

/**
 * Show unload confirmation and handle navigation
 */
function showUnloadConfirmation() {
  return new Promise((resolve) => {
    const modal = createUnloadModal();
    document.body.appendChild(modal);

    const handleAction = (shouldLeave) => {
      modal.remove();
      resolve(shouldLeave);
    };

    modal.querySelector('[data-action="stay"]').addEventListener('click', () => handleAction(false));
    modal.querySelector('[data-action="leave"]').addEventListener('click', () => handleAction(true));
    
    // ESC key to stay
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleAction(false);
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

/**
 * Initialize auto-save system
 */
export function initializeAutoSave(store) {
  // Load settings
  const settings = getSettings();
  isAutoSaveEnabled = settings.autoSaveEnabled;

  // Set up periodic auto-save
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }
  
  autoSaveInterval = setInterval(() => {
    if (isAutoSaveEnabled) {
      saveGameState(store);
    }
  }, AUTOSAVE_INTERVAL);

  // Subscribe to action-based saves
  if (unsubscribe) {
    unsubscribe();
  }
  
  unsubscribe = store.subscribe((action) => {
    if (isAutoSaveEnabled && TRIGGER_ACTIONS.has(action.type)) {
      saveGameState(store);
    }
  });

  // Handle page unload with custom modal
  const handleBeforeUnload = async (e) => {
    const settings = getSettings();
    
    // Always save before potential unload
    if (isAutoSaveEnabled) {
      saveGameState(store);
    }

    // Show custom confirmation if enabled
    if (settings.confirmBeforeUnload) {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
      
      // Try to show custom modal (only works for some navigation types)
      setTimeout(async () => {
        const shouldLeave = await showUnloadConfirmation();
        if (!shouldLeave && pendingNavigation) {
          // Cancel navigation if possible
          window.history.pushState(null, '', window.location.href);
        }
      }, 0);
    }
  };

  // DISABLED: beforeunload confirmation
  // window.addEventListener('beforeunload', handleBeforeUnload);

  // Handle internal navigation (for SPA-like behavior)
  const handleNavigation = async (e) => {
    const settings = getSettings();
    if (settings.confirmBeforeUnload) {
      pendingNavigation = e;
      const shouldLeave = await showUnloadConfirmation();
      if (!shouldLeave) {
        e.preventDefault();
        pendingNavigation = null;
      }
    }
  };

  // Track hash changes
  window.addEventListener('hashchange', handleNavigation);

  console.log('[persistence] Auto-save initialized');

  // Return cleanup function
  return () => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
    }
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('hashchange', handleNavigation);
    console.log('[persistence] Auto-save cleaned up');
  };
}

/**
 * Toggle unload confirmation
 */
export function toggleUnloadConfirmation(enabled) {
  const settings = getSettings();
  settings.confirmBeforeUnload = enabled;
  saveSettings(settings);
  console.log(`[persistence] Unload confirmation ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Get unload confirmation setting
 */
export function isUnloadConfirmationEnabled() {
  const settings = getSettings();
  return settings.confirmBeforeUnload;
}
