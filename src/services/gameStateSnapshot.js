/** gameStateSnapshot.js
 * Service for capturing and restoring complete game state snapshots for state-accurate replay.
 * Captures essential slices: players, dice, tokyo, cards, phase, meta, effectQueue, monsters.
 * Excludes transient UI state and settings to avoid interference.
 */

// Core slices needed for accurate game state reproduction
const CORE_SLICES = ['players', 'dice', 'tokyo', 'cards', 'phase', 'meta', 'effectQueue', 'monsters'];

/**
 * Creates a deep copy of the current game state, excluding UI and settings.
 * @param {Object} store - Redux store
 * @returns {Object} Serializable state snapshot
 */
export function captureGameState(store) {
  try {
    const state = store.getState();
    const snapshot = {
      timestamp: Date.now(),
      version: '1.0', // for future migration support
      slices: {}
    };

    // Capture core game slices
    CORE_SLICES.forEach(slice => {
      if (state[slice] !== undefined) {
        snapshot.slices[slice] = JSON.parse(JSON.stringify(state[slice]));
      }
    });

    // Add minimal metadata for validation
    snapshot.meta = {
      ...snapshot.meta,
      captureTimestamp: snapshot.timestamp,
      snapshotVersion: snapshot.version
    };

    return snapshot;
  } catch (error) {
    console.warn('[gameStateSnapshot] Failed to capture state:', error);
    return null;
  }
}

/**
 * Restores game state from a snapshot by dispatching a special action.
 * @param {Object} store - Redux store
 * @param {Object} snapshot - State snapshot to restore
 * @returns {boolean} Success flag
 */
export function restoreGameState(store, snapshot) {
  try {
    if (!snapshot || !snapshot.slices) {
      throw new Error('Invalid snapshot format');
    }

    // Validate snapshot has required slices
    const missingSlices = CORE_SLICES.filter(slice => !(slice in snapshot.slices));
    if (missingSlices.length > 0) {
      console.warn('[gameStateSnapshot] Missing slices:', missingSlices);
    }

    // Dispatch special action that rootReducer handles
    store.dispatch({
      type: 'GAME_STATE_IMPORTED',
      payload: { snapshot }
    });

    return true;
  } catch (error) {
    console.error('[gameStateSnapshot] Failed to restore state:', error);
    return false;
  }
}

/**
 * Creates a minimal state diff between two snapshots (for future optimization).
 * @param {Object} oldSnapshot - Previous state snapshot
 * @param {Object} newSnapshot - Current state snapshot
 * @returns {Object} State diff object
 */
export function createStateDiff(oldSnapshot, newSnapshot) {
  if (!oldSnapshot || !newSnapshot) return newSnapshot;
  
  const diff = {
    timestamp: newSnapshot.timestamp,
    version: newSnapshot.version,
    changes: {}
  };

  CORE_SLICES.forEach(slice => {
    const oldSlice = oldSnapshot.slices?.[slice];
    const newSlice = newSnapshot.slices?.[slice];
    
    if (JSON.stringify(oldSlice) !== JSON.stringify(newSlice)) {
      diff.changes[slice] = newSlice;
    }
  });

  return diff;
}

/**
 * Applies a state diff to a base snapshot.
 * @param {Object} baseSnapshot - Base state snapshot
 * @param {Object} diff - State diff to apply
 * @returns {Object} Updated snapshot
 */
export function applyStateDiff(baseSnapshot, diff) {
  if (!baseSnapshot || !diff) return baseSnapshot;

  const updated = JSON.parse(JSON.stringify(baseSnapshot));
  
  Object.entries(diff.changes || {}).forEach(([slice, value]) => {
    updated.slices[slice] = value;
  });

  updated.timestamp = diff.timestamp;
  return updated;
}

/**
 * Validates a state snapshot for completeness and integrity.
 * @param {Object} snapshot - Snapshot to validate
 * @returns {Object} Validation result { valid, errors, warnings }
 */
export function validateStateSnapshot(snapshot) {
  const result = { valid: true, errors: [], warnings: [] };

  if (!snapshot) {
    result.valid = false;
    result.errors.push('Snapshot is null or undefined');
    return result;
  }

  if (!snapshot.slices) {
    result.valid = false;
    result.errors.push('Snapshot missing slices property');
    return result;
  }

  // Check for required slices
  const criticalSlices = ['players', 'phase', 'meta'];
  criticalSlices.forEach(slice => {
    if (!(slice in snapshot.slices)) {
      result.valid = false;
      result.errors.push(`Missing critical slice: ${slice}`);
    }
  });

  // Check for optional but recommended slices
  const recommendedSlices = ['dice', 'tokyo', 'cards'];
  recommendedSlices.forEach(slice => {
    if (!(slice in snapshot.slices)) {
      result.warnings.push(`Missing recommended slice: ${slice}`);
    }
  });

  // Validate players structure
  if (snapshot.slices.players) {
    const players = snapshot.slices.players;
    if (!players.order || !Array.isArray(players.order)) {
      result.warnings.push('Players order is missing or invalid');
    }
    if (!players.byId || typeof players.byId !== 'object') {
      result.warnings.push('Players byId is missing or invalid');
    }
  }

  return result;
}

/**
 * Creates a lightweight state snapshot containing only essential data for replay.
 * Useful for frequent snapshots during gameplay.
 * @param {Object} store - Redux store
 * @returns {Object} Lightweight snapshot
 */
export function captureLightweightState(store) {
  try {
    const state = store.getState();
    
    return {
      timestamp: Date.now(),
      version: '1.0-light',
      essential: {
        phase: state.phase,
        activePlayerIndex: state.meta?.activePlayerIndex,
        turn: state.meta?.turn,
        round: state.meta?.round,
        // Player essentials only
        playerVitals: state.players?.order?.map(id => {
          const p = state.players.byId[id];
          return p ? {
            id,
            health: p.health,
            victoryPoints: p.victoryPoints,
            energy: p.energy,
            isInTokyo: p.isInTokyo,
            isEliminated: p.isEliminated
          } : null;
        }).filter(Boolean) || [],
        // Current dice state
        diceState: {
          faces: state.dice?.faces || [],
          phase: state.dice?.phase,
          rerollsRemaining: state.dice?.rerollsRemaining
        },
        // Tokyo occupancy
        tokyo: state.tokyo
      }
    };
  } catch (error) {
    console.warn('[gameStateSnapshot] Failed to capture lightweight state:', error);
    return null;
  }
}