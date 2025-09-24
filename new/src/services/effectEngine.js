/** services/effectEngine.js
 * Phase 8 scaffold: interprets card effect descriptors and applies outcomes.
 */
import { cardEffectProcessing, cardEffectFailed, cardEffectResolved, playerGainEnergy, playerVPGained, healPlayerAction, playerCardGained, applyPlayerDamage } from '../core/actions.js';

let _id = 0; const nextId = () => 'eff_' + (++_id);

export function createEffectEngine(store, logger) {
  const handlers = {
    vp_gain: ({ playerId, effect }) => {
      store.dispatch(playerVPGained(playerId, effect.value, 'card')); return true;
    },
    energy_gain: ({ playerId, effect }) => {
      store.dispatch(playerGainEnergy(playerId, effect.value)); return true;
    },
    heal_all: ({ effect }) => {
      const state = store.getState();
      for (const pid of state.players.order) {
        store.dispatch(healPlayerAction(pid, effect.value));
      }
      return true;
    },
    dice_slot: ({ playerId, card }) => {
      // For now just attach card (already added on purchase). Future: modify dice capacity.
      logger.info(`[effectEngine] dice_slot effect acknowledged for ${playerId} via ${card.id}`);
      return true;
    },
    reroll_bonus: ({ playerId, card }) => {
      logger.info(`[effectEngine] reroll_bonus effect acknowledged for ${playerId} via ${card.id}`);
      return true;
    },
    damage_all: ({ playerId, effect }) => {
      const state = store.getState();
      for (const pid of state.players.order) {
        if (pid === playerId) continue; // skip source
        store.dispatch(applyPlayerDamage(pid, effect.value));
      }
      return true;
    },
    heal_self: ({ playerId, effect }) => {
      store.dispatch(healPlayerAction(playerId, effect.value));
      return true;
    },
    energy_steal: ({ playerId, effect }) => {
      // Steal up to value energy from each opponent (simplified)
      const state = store.getState();
      let gained = 0;
      for (const pid of state.players.order) {
        if (pid === playerId) continue;
        const opp = state.players.byId[pid];
        const steal = Math.min(effect.value, opp.energy);
        if (steal > 0) {
          store.dispatch({ type: 'PLAYER_SPENT_ENERGY', payload: { playerId: pid, amount: steal } });
          gained += steal;
        }
      }
      if (gained) store.dispatch(playerGainEnergy(playerId, gained));
      return true;
    },
    vp_steal: ({ playerId, effect }) => {
      const state = store.getState();
      let gained = 0;
      for (const pid of state.players.order) {
        if (pid === playerId) continue;
        const opp = state.players.byId[pid];
        const steal = Math.min(effect.value, opp.victoryPoints);
        if (steal > 0) {
          store.dispatch(playerVPGained(pid, -steal, 'vp_steal_lost'));
          gained += steal;
        }
      }
      if (gained) store.dispatch(playerVPGained(playerId, gained, 'vp_steal_gain'));
      return true;
    },
    damage_tokyo_only: ({ playerId, effect }) => {
      const state = store.getState();
      const { tokyo } = state;
      const slots = [tokyo.city, tokyo.bay].filter(Boolean);
      for (const occ of slots) {
        if (occ !== playerId) store.dispatch(applyPlayerDamage(occ, effect.value));
      }
      return true;
    }
  };

  function enqueueImmediate(card, playerId) {
    const entry = { id: nextId(), cardId: card.id, playerId, effect: card.effect, createdAt: Date.now() };
    store.dispatch({ type: 'CARD_EFFECT_ENQUEUED', payload: { entry } });
    processNext();
  }

  function processNext() {
    const state = store.getState();
    const q = state.effectQueue.queue;
    if (!q.length || state.effectQueue.processing) return; // busy or nothing
    const entry = q[0];
    store.dispatch(cardEffectProcessing(entry.id));
    const { effect } = entry;
    const handler = handlers[effect.kind];
    if (!handler) {
      store.dispatch(cardEffectFailed(entry.id, 'NO_HANDLER'));
      logger.warn(`[effectEngine] No handler for effect kind ${effect.kind}`);
      return;
    }
    try {
      const ok = handler({ playerId: entry.playerId, card: { id: entry.cardId, effect }, effect });
      if (ok) {
        store.dispatch(cardEffectResolved({ id: entry.cardId }, effect));
        logger.info(`[effectEngine] Resolved effect ${effect.kind} from ${entry.cardId}`);
      } else {
        store.dispatch(cardEffectFailed(entry.id, 'HANDLER_FALSE'));
      }
    } catch (e) {
      store.dispatch(cardEffectFailed(entry.id, 'EXCEPTION'));
      logger.error('[effectEngine] Exception processing effect', e);
    } finally {
      // Attempt to process subsequent effects (after state update microtask)
      setTimeout(processNext, 0);
    }
  }

  return {
    enqueueImmediate,
    processNext
  };
}
