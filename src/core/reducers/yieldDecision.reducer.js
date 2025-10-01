import { YIELD_PROMPT_SHOWN, YIELD_PROMPT_DECIDED, PLAYER_LEFT_TOKYO, YIELD_PROMPTS_CREATED, YIELD_ALL_RESOLVED } from '../actions.js';
import { eventBus } from '../../core/eventBus.js';

// Extended state shape (migration): {
//   prompts: [ { defenderId, attackerId, slot, expiresAt?, damage?, advisory?, decision: null|'yield'|'stay' } ],
//   flow?: { attackerId, turnCycleId?, createdAt, resolvedAt?, total, decided }
// }
const initial = { prompts: [], flow: null };

export function yieldDecisionReducer(state = initial, action) {
  switch (action.type) {
    case YIELD_PROMPT_SHOWN: {
      const { defenderId, attackerId, slot, expiresAt, damage, advisory } = action.payload;
      // Avoid duplicate prompt for same defender in same resolution window.
      if (state.prompts.some(p => p.defenderId === defenderId && p.attackerId === attackerId && p.slot === slot && p.decision == null)) {
        return state;
      }
      return { ...state, prompts: [...state.prompts, { defenderId, attackerId, slot, expiresAt, damage, advisory, decision: null }] };
    }
    case YIELD_PROMPT_DECIDED: {
      const { defenderId, attackerId, slot, decision } = action.payload;
      let emitted = false;
      const prompts = state.prompts.map(p => {
        if (p.defenderId === defenderId && p.attackerId === attackerId && p.slot === slot && p.decision == null) {
          emitted = true;
          return { ...p, decision, decidedAt: Date.now() };
        }
        return p;
      });
      if (emitted) {
        try { eventBus.emit('yield.decision', { attackerId, defenderId, slot, decision, ts: Date.now(), mode:'human' }); } catch(_) {}
      }
      return { ...state, prompts };
    }
    case YIELD_PROMPTS_CREATED: { // batched unified creation
      const { attackerId, prompts, turnCycleId } = action.payload;
      // Filter out any duplicate active prompts (defensive)
      const incoming = prompts.filter(pr => !state.prompts.some(p => p.defenderId === pr.defenderId && p.attackerId === attackerId && p.slot === pr.slot && p.decision == null));
      if (incoming.length === 0) return state;
      const enriched = incoming.map(pr => ({ ...pr, attackerId, decision: null }));
      return {
        ...state,
        prompts: [...state.prompts, ...enriched],
        flow: { attackerId, turnCycleId, createdAt: Date.now(), total: (state.flow?.total || 0) + enriched.length, decided: state.flow?.decided || 0 }
      };
    }
    case YIELD_ALL_RESOLVED: { // terminal resolution (all decisions known)
      const { attackerId, decisions, turnCycleId } = action.payload;
      // Apply decisions to relevant prompts.
      const decisionMap = new Map(decisions.map(d => [`${d.defenderId}:${d.slot}`, d]));
      const prompts = state.prompts.map(p => {
        const key = `${p.defenderId}:${p.slot}`;
        const entry = decisionMap.get(key);
        if (entry && p.attackerId === attackerId) {
          return { ...p, decision: entry.decision, advisory: entry.advisory || p.advisory, decidedAt: entry.decidedAt || Date.now() };
        }
        return p;
      });
      const decidedCount = prompts.filter(p => p.attackerId === attackerId && p.decision != null).length;
      return {
        ...state,
        prompts,
        flow: state.flow && state.flow.attackerId === attackerId ? { ...state.flow, turnCycleId, decided: decidedCount, resolvedAt: Date.now() } : state.flow
      };
    }
    case PLAYER_LEFT_TOKYO: { // auto-resolve prompt if occupant leaves by other means
      const { playerId } = action.payload;
      return { ...state, prompts: state.prompts.map(p => p.defenderId === playerId && p.decision == null ? { ...p, decision: 'yield' } : p) };
    }
    default:
      return state;
  }
}
