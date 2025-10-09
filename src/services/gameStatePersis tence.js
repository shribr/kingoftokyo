/** gameStatePersistence.js
 * Auto-save and restore game state between page reloads using localStorage.
 * Saves complete Redux state periodically and on critical game events.
 */

const STORAGE_KEY = 'KOT_ACTIVE_GAME_STATE';
const AUTOSAVE_INTERVAL = 10000; // 10 seconds
const MAX_SAVE_SIZE = 5 * 1024 * 1024; // 5MB limit

/**
 * Save current game state to localStorage
 * @param {Object} store - Redux store
 * @returns {boolean} Success flag
 */
export function saveGameState(store) {
  try {
    const state = store.getState();
    
    // Only save if game is actually in progress
    if (state.phase === 'SETUP' || !state.players?.order?.length) {
      return false;
    }

    const snapshot = {
      timestamp: Date.now(),
      version: '2.1',
      state: {
        players: state.players,
        dice: state.dice,
        tokyo: state.tokyo,
        cards: state.cards,
        phase: state.phase,
        meta: state.meta,
        monsters: state.monsters,
        effectQueue: state.effectQueue,
        yieldDecision: state.yieldDecision,
        game: state.game,
        log: {
          ...state.log,
          entries: (state.log?.entries || []).slice(-100) // Keep last 100 log entries
        }
      }
    };

    const serialized = JSON.stringify(snapshot);
    
    // Check size limit
    if (serialized.length > MAX_SAVE_SIZE) {
      console.warn('[GameState] Save too large, truncating log entries');
      snapshot.state.log.entries = snapshot.state.log.entries.slice(-50);
      const truncated = JSON.stringify(snapshot);
      if (truncated.length > MAX_SAVE_SIZE) {
        console.error('[GameState] Save still too large after truncation');
        return false;
      }
      localStorage.setItem(STORAGE_KEY, truncated);
    } else {
      localStorage.setItem(STORAGE_KEY, serialized);
    }

    console.log('[GameState] Saved at', new Date(snapshot.timestamp).toLocaleTimeString());
    return true;
  } catch (error) {
    console.error('[GameState] Save failed:', error);
    return false;
  }
}

/**
 * Load game state from localStorage
 * @returns {Object|null} Saved state or null if not found/invalid
 */
export function loadGameState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const snapshot = JSON.parse(raw);
    
    // Validate snapshot
    if (!snapshot.state || !snapshot.version || !snapshot.timestamp) {
      console.warn('[GameState] Invalid snapshot format');
      return null;
    }

    // Check if save is not too old (7 days)
    const age = Date.now() - snapshot.timestamp;
    if (age > 7 * 24 * 60 * 60 * 1000) {
      console.warn('[GameState] Save too old, ignoring');
      clearSavedGame();
      return null;
    }

    console.log('[GameState] Loaded save from', new Date(snapshot.timestamp).toLocaleString());
    return snapshot.state;
  } catch (error) {
    console.error('[GameState] Load failed:', error);
    return null;
  }
}

/**
 * Clear saved game state
 */
export function clearSavedGame() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[GameState] Cleared saved game');
  } catch (error) {
    console.error('[GameState] Clear failed:', error);
  }
}

/**
 * Check if there's a saved game available
 * @returns {boolean}
 */
export function hasSavedGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    
    const snapshot = JSON.parse(raw);
    const age = Date.now() - snapshot.timestamp;
    return age < 7 * 24 * 60 * 60 * 1000; // Within 7 days
  } catch {
    return false;
  }
}

/**
 * Initialize auto-save system
 * @param {Object} store - Redux store
 * @returns {Function} Cleanup function to stop auto-save
 */
export function initializeAutoSave(store) {
  let intervalId = null;
  let unsubscribe = null;

  // Save on important state changes
  const actionsThatTriggerSave = [
    'DICE_ROLLED',
    'DICE_RESOLUTION_COMPLETE',
    'PLAYER_DAMAGE_APPLIED',
    'PLAYER_VP_GAINED',
    'PLAYER_CARD_GAINED',
    'PLAYER_ENTERED_TOKYO',
    'PLAYER_LEFT_TOKYO',
    'PHASE_CHANGED',
    'TURN_ENDED'
  ];

  // Subscribe to store changes
  unsubscribe = store.subscribe(() => {
    const state = store.getState();
    
    // Check last action
    if (state._lastAction && actionsThatTriggerSave.includes(state._lastAction.type)) {
      saveGameState(store);
    }
  });

  // Periodic auto-save
  intervalId = setInterval(() => {
    const state = store.getState();
    if (state.phase !== 'SETUP' && state.players?.order?.length) {
      saveGameState(store);
    }
  }, AUTOSAVE_INTERVAL);

  // Save on page unload
  const handleBeforeUnload = () => {
    saveGameState(store);
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  console.log('[GameState] Auto-save initialized');

  // Return cleanup function
  return () => {
    if (intervalId) clearInterval(intervalId);
    if (unsubscribe) unsubscribe();
    window.removeEventListener('beforeunload', handleBeforeUnload);
    console.log('[GameState] Auto-save stopped');
  };
}

/**
 * Restore game state into the store
 * @param {Object} store - Redux store
 * @param {Object} savedState - State to restore
 * @returns {boolean} Success flag
 */
export function restoreGameState(store, savedState) {
  try {
    if (!savedState) return false;

    // Dispatch a special action to restore the entire state
    store.dispatch({
      type: 'GAME_STATE_RESTORED',
      payload: { state: savedState }
    });

    console.log('[GameState] State restored successfully');
    return true;
  } catch (error) {
    console.error('[GameState] Restore failed:', error);
    return false;
  }
}

/**
 * Get save information
 * @returns {Object|null} Save metadata
 */
export function getSaveInfo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const snapshot = JSON.parse(raw);
    const state = snapshot.state;
    
    return {
      timestamp: snapshot.timestamp,
      version: snapshot.version,
      playerCount: state.players?.order?.length || 0,
      phase: state.phase,
      round: state.meta?.round || 1,
      turn: state.meta?.turn || 1
    };
  } catch {
    return null;
  }
}
