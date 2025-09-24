/** services/gamePersistence.js
 * Simple persistence layer for core game state slices.
 * Exports a serializable snapshot & allows importing it.
 */
import { gameStateImported } from '../core/actions.js';

// Slices considered persistent
const PERSIST_SLICES = [
  'players','tokyo','cards','phase','meta','settings','effectQueue','log'
  // dice intentionally NOT persisted mid-roll for simplicity; could add later
];

export function exportGameState(store) {
  const state = store.getState();
  const snapshot = { version: 1, ts: Date.now(), slices: {} };
  for (const key of PERSIST_SLICES) {
    if (state[key] !== undefined) snapshot.slices[key] = state[key];
  }
  return snapshot;
}

export function importGameState(store, snapshot, logger) {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.slices) return false;
  // Basic version gate (future migrations)
  const v = snapshot.version || 1;
  if (v > 1) {
    logger?.warn && logger.warn('Snapshot version unsupported', { version: v });
    return false;
  }
  store.dispatch(gameStateImported(snapshot));
  logger?.system && logger.system('Game snapshot imported.', { kind:'persistence' });
  return true;
}
