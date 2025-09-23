import { DICE_ROLL_STARTED, DICE_ROLLED, DICE_TOGGLE_KEEP, DICE_REROLL_USED, PHASE_CHANGED } from '../actions.js';

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
    case DICE_REROLL_USED: {
      const remaining = Math.max(0, state.rerollsRemaining - 1);
      const sequenceComplete = remaining === 0 ? 'sequence-complete' : state.phase;
      return { ...state, rerollsRemaining: remaining, phase: sequenceComplete };
    }
    case PHASE_CHANGED: {
      // Reset dice state when returning to ROLL phase for a new turn
      if (action.payload.phase === 'ROLL') {
        return { faces: [], rerollsRemaining: 0, phase: 'idle' };
      }
      return state;
    }
    default:
      return state;
  }
}
