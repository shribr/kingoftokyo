import { DICE_ROLL_STARTED, DICE_ROLLED, DICE_TOGGLE_KEEP, DICE_REROLL_USED, DICE_SET_ALL_KEPT, DICE_ROLL_RESOLVED, DICE_ROLL_COMPLETED, DICE_RESULTS_ACCEPTED, NEXT_TURN } from '../actions.js';

const initial = { faces: [], rerollsRemaining: 0, baseRerolls: 2, phase: 'idle', accepted: false, rollHistory: [] };

export function diceReducer(state = initial, action) {
  switch (action.type) {
    case NEXT_TURN: {
      // Critical: Reset dice state on turn advancement to ensure clean slate for new player
      // This guards against stale accepted/phase state persisting from previous player
      console.log('🎲 DICE REDUCER: NEXT_TURN - Resetting dice state for new turn');
      const baseRerolls = (state && typeof state.baseRerolls === 'number') ? state.baseRerolls : 2;
      return { faces: [], rerollsRemaining: 0, baseRerolls, phase: 'idle', accepted: false, rollHistory: [] };
    }
    case DICE_ROLL_STARTED: {
      // If starting new sequence, compute rerollsRemaining from active player's modifiers (base + bonus)
      const starting = state.phase === 'idle';
      if (!starting) return { ...state, phase: 'rolling' };
      // Active player modifiers are injected externally (middleware pattern absent). We'll read off a global for now.
      let bonus = 0;
      try {
        const st = window.__KOT_NEW__?.store?.getState();
        if (st) {
          const order = st.players.order;
            if (order.length) {
              const activeId = order[st.meta.activePlayerIndex % order.length];
              bonus = st.players.byId[activeId]?.modifiers?.rerollBonus || 0;
            }
        }
      } catch (_) {}
  const rerollsRemaining = state.baseRerolls + bonus;
  console.log(`[dice.reducer] DICE_ROLL_STARTED (new sequence): rerollsRemaining set to ${rerollsRemaining} (base: ${state.baseRerolls}, bonus: ${bonus})`);
  return { ...state, phase: 'rolling', rerollsRemaining, accepted: false };
    }
    case DICE_ROLLED: {
      const { faces, meta } = action.payload;
      let rollHistory = state.rollHistory;
      if (meta) {
        // Append immutable snapshot of faces + meta
        const snapshot = { ts: Date.now(), meta: { ...meta }, faces: faces.map(f=>({ ...f })) };
        rollHistory = [...rollHistory, snapshot].slice(-20); // cap history
      }
      return { ...state, faces, phase: 'resolved', rollHistory };
    }
    case DICE_TOGGLE_KEEP: {
      const { index } = action.payload;
      if (index < 0 || index >= state.faces.length) return state;
      const faces = state.faces.map((f,i) => i === index ? { ...f, kept: !f.kept } : f);
      return { ...state, faces };
    }
    case DICE_SET_ALL_KEPT: {
      if (!Array.isArray(state.faces) || state.faces.length === 0) return state;
      // Only allow set-all when dice are resolved (not rolling) to avoid race with animation
      if (state.phase !== 'resolved') return state;
      const kept = !!action.payload?.kept;
      const faces = state.faces.map(f => ({ ...f, kept }));
      return { ...state, faces };
    }
    case DICE_REROLL_USED: {
      // Deprecated direct decrement path kept for safety; no state change (handled by DICE_ROLL_COMPLETED)
      return state;
    }
    case DICE_ROLL_COMPLETED: {
      // When a non-initial roll finishes (faces resolved), decrement rerollsRemaining
      if (state.phase !== 'resolved') return state; // only process once dice resolved
      const remaining = Math.max(0, state.rerollsRemaining - 1);
      console.log(`[dice.reducer] DICE_ROLL_COMPLETED: ${state.rerollsRemaining} -> ${remaining}`);
      return { ...state, rerollsRemaining: remaining };
    }
    case DICE_ROLL_RESOLVED: {
      // Force mark sequence complete if currently in resolved state but rerolls remain (e.g., player ended early)
      if (state.phase === 'resolved' || state.phase === 'rolling') {
        const meta = action.payload || null;
        return { ...state, phase: 'sequence-complete', rerollsRemaining: 0, lastResolution: meta ? { ...meta, ts: Date.now() } : state.lastResolution };
      }
      return state;
    }
    case DICE_RESULTS_ACCEPTED: {
      // Only valid while in resolved or sequence-complete
      if (state.phase !== 'resolved' && state.phase !== 'sequence-complete') return state;
      if (state.accepted) return state; // idempotent
      return { ...state, accepted: true };
    }
    case 'PHASE_TRANSITION': {
      const to = action.payload?.to;
      if (to === 'ROLL') {
        const baseRerolls = (state && typeof state.baseRerolls === 'number') ? state.baseRerolls : 3;
        return { faces: [], rerollsRemaining: 0, baseRerolls, phase: 'idle', accepted: false, rollHistory: [] };
      }
      return state;
    }
    case 'PHASE_CHANGED': {
      // Ensure dice state is reset whenever global phase enters ROLL (covers legacy phase controller path)
      try {
        const nextPhase = action.payload?.phase;
        console.log('🎲 DICE REDUCER: PHASE_CHANGED action received', { nextPhase, currentPhase: state.phase, currentFaces: state.faces.length });
        if (nextPhase === 'ROLL') {
          const baseRerolls = (state && typeof state.baseRerolls === 'number') ? state.baseRerolls : 3;
          console.log('🎲 DICE REDUCER: Resetting dice for new ROLL phase', { baseRerolls });
          return { faces: [], rerollsRemaining: 0, baseRerolls, phase: 'idle', accepted: false, rollHistory: [] };
        }
      } catch(_) {}
      return state;
    }
    default:
      return state;
  }
}
