/** services/effectEngine.js
 * Phase 8 scaffold: interprets card effect descriptors and applies outcomes.
 */
import { cardEffectProcessing, cardEffectFailed, cardEffectResolved, playerGainEnergy, playerVPGained, healPlayerAction, playerCardGained } from '../core/actions.js';

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
