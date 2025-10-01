/** services/effectEngine.js
 * Phase 8 scaffold: interprets card effect descriptors and applies outcomes.
 */
import { cardEffectProcessing, cardEffectFailed, cardEffectResolved, playerGainEnergy, playerVPGained, healPlayerAction, playerCardGained, applyPlayerDamage, targetSelectionStarted, targetSelectionConfirmed } from '../core/actions.js';
import { guardedTimeout } from '../core/turnGuards.js';

let _id = 0; const nextId = () => 'eff_' + (++_id);

export function createEffectEngine(store, logger) {
  // Capture current turnCycleId for guard; if changes mid-processing we abort further synchronous steps.
  function currentCycle() { return store.getState().meta?.turnCycleId; }
  let activeCycle = currentCycle();
  store.subscribe((st, action) => {
    if (action.type === 'NEXT_TURN') {
      activeCycle = currentCycle();
    }
  });
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
    },
    damage_select: ({ playerId, effect, entry }) => {
      const state = store.getState();
      // Determine eligible opponents (exclude self, dead players)
      const eligible = state.players.order.filter(pid => pid !== playerId && state.players.byId[pid].status.alive);
      if (!eligible.length) return true; // nothing to do
      // If selection already captured on entry, apply it.
      if (entry.selectedIds && entry.selectedIds.length) {
        entry.selectedIds.forEach(tid => {
          store.dispatch(applyPlayerDamage(tid, effect.value));
          logger.combat(`Damage Select: ${playerId} deals ${effect.value} to ${tid}`, { kind: 'damage', source: playerId, target: tid, effect: effect.kind });
        });
        return true;
      }
      // Otherwise start selection UI (min=1 up to maxTargets or eligible count)
      const max = effect.maxTargets && effect.maxTargets > 0 ? Math.min(effect.maxTargets, eligible.length) : eligible.length;
      store.dispatch(targetSelectionStarted(entry.id, effect, 1, max, eligible));
      // Poll until selection is confirmed by UI.
      const poll = () => {
        const st2 = store.getState();
        const active = st2.targetSelection.active;
        if (!active || active.requestId !== entry.id) {
          // Either confirmed (active cleared) or cancelled. If cancelled treat as failure.
          if (!st2.targetSelection.active) {
            // Need to check if we stored selection somewhere - simplistic: look for attached meta on entry (not persisted here)
          }
          return; // processing will continue after queue rotates (we requeue if needed?)
        }
        // Wait for valid selection & confirmation
        guardedTimeout(store, poll, 150, 'effectSelectionPoll');
      };
      poll();
      // Return false to keep processing paused until selection; we won't resolve yet.
      return false;
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
    // Prioritize any waiting_selection entry that now has selectedIds
    const readyIdx = q.findIndex(e => e.status === 'waiting_selection' && e.selectedIds && e.selectedIds.length);
    const entry = readyIdx !== -1 ? q[readyIdx] : q[0];
    store.dispatch(cardEffectProcessing(entry.id));
    const { effect } = entry;
    const handler = handlers[effect.kind];
    if (!handler) {
      store.dispatch(cardEffectFailed(entry.id, 'NO_HANDLER'));
      logger.warn(`[effectEngine] No handler for effect kind ${effect.kind}`);
      setTimeout(processNext, 0);
      return;
    }
    try {
      if (activeCycle !== currentCycle()) {
        logger.warn('[effectEngine] Aborting effect processing due to turnCycleId change (stale entry).');
        return; // do not process stale effect chain
      }
      const ok = handler({ playerId: entry.playerId, card: { id: entry.cardId, effect }, effect, entry });
      if (ok) {
        store.dispatch(cardEffectResolved({ id: entry.cardId }, effect));
        logger.info(`[effectEngine] Resolved effect ${effect.kind} from ${entry.cardId}`);
      } else {
        // Async path: mark waiting
        store.dispatch(cardEffectFailed(entry.id, 'PENDING_SELECTION'));
      }
    } catch (e) {
      store.dispatch(cardEffectFailed(entry.id, 'EXCEPTION'));
      logger.error('[effectEngine] Exception processing effect', e);
    } finally {
      // Only schedule continuation if still same turn (avoid leakage into next cycle)
      if (activeCycle === currentCycle()) setTimeout(processNext, 50);
    }
  }

  return {
    enqueueImmediate,
    processNext
  };
}
