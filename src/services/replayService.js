/** replayService.js
 * Drives state-accurate replay using archived game log snapshots with state hydration.
 * Enhanced to restore exact game state from snapshots before starting log playback.
 */
import { gamePaused, gameResumed } from '../core/actions.js';
import { restoreGameState, validateStateSnapshot } from './gameStateSnapshot.js';

let activeReplay = null;

export function isReplaying(){ return !!activeReplay; }

export function startReplay(store, snapshot, options = {}) {
  if (!snapshot || !Array.isArray(snapshot.data)) throw new Error('Invalid snapshot for replay');
  if (activeReplay) stopReplay();
  
  const speed = options.speed || 600; // ms between entries
  const entries = snapshot.data.slice();
  const uiDisableClass = 'replay-mode-active';
  
  // Hydrate game state from snapshot if available
  if (snapshot.stateSnapshot) {
    console.log('[replayService] Hydrating game state from snapshot');
    const validation = validateStateSnapshot(snapshot.stateSnapshot);
    
    if (!validation.valid) {
      console.warn('[replayService] Invalid state snapshot:', validation.errors);
      // Continue with log-only replay as fallback
    } else {
      if (validation.warnings.length > 0) {
        console.warn('[replayService] State snapshot warnings:', validation.warnings);
      }
      
      // Restore the captured game state
      const restored = restoreGameState(store, snapshot.stateSnapshot);
      if (!restored) {
        console.warn('[replayService] Failed to restore state, continuing with log-only replay');
      } else {
        console.log('[replayService] Successfully restored game state from snapshot');
        // Trigger UI updates after state restoration
        try {
          window.dispatchEvent(new CustomEvent('replay.stateRestored', { 
            detail: { snapshot: snapshot.stateSnapshot } 
          }));
        } catch(_) {}
      }
    }
  } else {
    console.log('[replayService] No state snapshot available, using log-only replay');
  }
  
  document.body.classList.add(uiDisableClass);
  // Pause existing game loop (prevent AI actions) by pausing game state if not already
  try { store.dispatch(gamePaused()); } catch(_){ }
  
  let idx = 0;
  let paused = false;
  let timer = null;

  function step(){
    if (paused) return;
    if (idx >= entries.length) { finish(); return; }
    
    const entry = entries[idx];
    
    // Emit log entry event for UI updates
    try { 
      window.dispatchEvent(new CustomEvent('replay.entry', { 
        detail: { entry, index: idx, total: entries.length } 
      })); 
    } catch(_){ }
    
    // Process state-changing entries if we have state restoration capability
    if (snapshot.stateSnapshot) {
      processReplayEntry(store, entry, idx);
    }
    
    idx++;
    timer = setTimeout(step, speed);
  }
  
  function pause(){ paused = true; if (timer) { clearTimeout(timer); timer=null; } }
  function resume(){ if (!paused) return; paused = false; step(); }
  function finish(){ cleanup(); }
  function cleanup(){
    if (timer) clearTimeout(timer);
    document.body.classList.remove(uiDisableClass);
    try { store.dispatch(gameResumed()); } catch(_){ }
    activeReplay = null;
    
    // Notify that replay has ended
    try {
      window.dispatchEvent(new CustomEvent('replay.ended'));
    } catch(_) {}
  }

  activeReplay = { 
    pause, 
    resume, 
    stop: cleanup, 
    isPaused: () => paused,
    getCurrentIndex: () => idx,
    getTotalEntries: () => entries.length,
    hasStateSnapshot: () => !!snapshot.stateSnapshot
  };
  
  // Notify that replay has started
  try {
    window.dispatchEvent(new CustomEvent('replay.started', {
      detail: { hasStateSnapshot: !!snapshot.stateSnapshot, entryCount: entries.length }
    }));
  } catch(_) {}
  
  step();
  return activeReplay;
}

/**
 * Processes individual replay entries for state-aware updates
 * @param {Object} store - Redux store
 * @param {Object} entry - Log entry
 * @param {number} index - Entry index
 */
function processReplayEntry(store, entry, index) {
  // For now, just emit detailed events for potential UI listeners
  // Future: could trigger specific state updates based on entry type
  try {
    if (entry.type === 'phase' && entry.message?.includes('Phase:')) {
      window.dispatchEvent(new CustomEvent('replay.phaseChange', { detail: entry }));
    }
    if (entry.type === 'combat' || entry.kind === 'damage') {
      window.dispatchEvent(new CustomEvent('replay.combat', { detail: entry }));
    }
    if (entry.kind === 'vp' || entry.message?.includes('VP')) {
      window.dispatchEvent(new CustomEvent('replay.vpChange', { detail: entry }));
    }
    if (entry.kind === 'tokyo' || entry.message?.includes('Tokyo')) {
      window.dispatchEvent(new CustomEvent('replay.tokyoChange', { detail: entry }));
    }
    if (entry.type === 'dice' || entry.message?.includes('rolled')) {
      window.dispatchEvent(new CustomEvent('replay.diceRoll', { detail: entry }));
    }
    if (entry.kind === 'energy' || entry.message?.includes('energy')) {
      window.dispatchEvent(new CustomEvent('replay.energyChange', { detail: entry }));
    }
    if (entry.message?.includes('health') || entry.message?.includes('damage')) {
      window.dispatchEvent(new CustomEvent('replay.healthChange', { detail: entry }));
    }
  } catch(e) {
    console.warn('[replayService] Error processing replay entry:', e);
  }
}

export function stopReplay(){ if (activeReplay) { activeReplay.stop(); } }
export function pauseReplay(){ if (activeReplay) activeReplay.pause(); }
export function resumeReplay(){ if (activeReplay) activeReplay.resume(); }
