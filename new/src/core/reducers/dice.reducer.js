import { DICE_ROLL_STARTED, DICE_ROLLED, DICE_TOGGLE_KEEP, DICE_REROLL_USED, PHASE_CHANGED, DICE_SET_ALL_KEPT } from '../actions.js';

const initial = { faces: [], rerollsRemaining: 0, baseRerolls: 2, phase: 'idle' };

export function diceReducer(state = initial, action) {
  switch (action.type) {
    case DICE_ROLL_STARTED: {
      // If starting new sequence, compute rerollsRemaining from active player's modifiers (base + bonus)
      const starting = state.phase === 'idle' || state.phase === 'sequence-complete';
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
      return { ...state, phase: 'rolling', rerollsRemaining };
    }
    case DICE_ROLLED:
      return { ...state, faces: action.payload.faces, phase: 'resolved' };
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
      const remaining = Math.max(0, state.rerollsRemaining - 1);
      const sequenceComplete = remaining === 0 ? 'sequence-complete' : state.phase;
      return { ...state, rerollsRemaining: remaining, phase: sequenceComplete };
    }
    case PHASE_CHANGED: {
      // Reset dice state when returning to ROLL phase for a new turn
      if (action.payload.phase === 'ROLL') {
        // Preserve configuration like baseRerolls; only reset transient fields
        const baseRerolls = (state && typeof state.baseRerolls === 'number') ? state.baseRerolls : 2;
        return { faces: [], rerollsRemaining: 0, baseRerolls, phase: 'idle' };
      }
      return state;
    }
    default:
      return state;
  }
}
