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
      // Extra Head: +1 die
      // Dice capacity is tracked by counting dice_slot cards in player's powerCards
      logger.info(`[effectEngine] ${playerId} now has an extra die slot from ${card.id}`);
      return true;
    },
    reroll_bonus: ({ playerId, card }) => {
      // Giant Brain: +1 reroll per turn
      // Reroll capacity is tracked by counting reroll_bonus cards in player's powerCards
      logger.info(`[effectEngine] ${playerId} now has an extra reroll from ${card.id}`);
      return true;
    },
    health_bonus: ({ playerId, effect }) => {
      // Even Bigger: +2 max health and gain 2 health immediately
      const state = store.getState();
      const player = state.players.byId[playerId];
      
      // Update max health (this needs to be stored in player state)
      store.dispatch({ type: 'PLAYER_MAX_HEALTH_INCREASED', payload: { playerId, amount: effect.value } });
      
      // Heal the player for the same amount
      store.dispatch(healPlayerAction(playerId, effect.value));
      
      logger.info(`[effectEngine] ${playerId} max health increased by ${effect.value} and healed ${effect.value}`);
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
    },
    
    // ===== PHASE 1: INSTANT DISCARD EFFECTS =====
    
    heal: ({ playerId, effect }) => {
      // Heal card: heal X damage
      store.dispatch(healPlayerAction(playerId, effect.value));
      logger.info(`[effectEngine] ${playerId} healed ${effect.value} damage`);
      return true;
    },
    
    damage_all_including_self: ({ playerId, effect }) => {
      // High Altitude Bombing: damage ALL including self
      const state = store.getState();
      for (const pid of state.players.order) {
        store.dispatch(applyPlayerDamage(pid, effect.value));
      }
      logger.info(`[effectEngine] ALL monsters take ${effect.value} damage (including ${playerId})`);
      return true;
    },
    
    vp_and_damage: ({ playerId, effect }) => {
      // Gas Refinery: +X★ and deal Y damage to all others
      store.dispatch(playerVPGained(playerId, effect.value, 'card'));
      const state = store.getState();
      for (const pid of state.players.order) {
        if (pid === playerId) continue;
        store.dispatch(applyPlayerDamage(pid, effect.damage));
      }
      logger.info(`[effectEngine] ${playerId} gains ${effect.value}★ and deals ${effect.damage} to all others`);
      return true;
    },
    
    vp_and_take_damage: ({ playerId, effect }) => {
      // Jet Fighters, National Guard: +X★ and take Y damage
      store.dispatch(playerVPGained(playerId, effect.value, 'card'));
      store.dispatch(applyPlayerDamage(playerId, effect.damage));
      logger.info(`[effectEngine] ${playerId} gains ${effect.value}★ and takes ${effect.damage} damage`);
      return true;
    },
    
    vp_and_take_tokyo: ({ playerId, effect }) => {
      // Drop from High Altitude: +X★ and take control of Tokyo if not already
      store.dispatch(playerVPGained(playerId, effect.value, 'card'));
      const state = store.getState();
      const inTokyoCity = state.tokyo.city === playerId;
      const inTokyoBay = state.tokyo.bay === playerId;
      
      if (!inTokyoCity && !inTokyoBay) {
        // Not in Tokyo - take Tokyo City
        const currentCity = state.tokyo.city;
        if (currentCity) {
          // Someone else in Tokyo City - they leave
          store.dispatch({ type: 'TOKYO_CITY_LEFT', payload: { playerId: currentCity } });
        }
        store.dispatch({ type: 'TOKYO_CITY_ENTERED', payload: { playerId } });
        logger.info(`[effectEngine] ${playerId} gains ${effect.value}★ and takes control of Tokyo City`);
      } else {
        logger.info(`[effectEngine] ${playerId} gains ${effect.value}★ (already in Tokyo)`);
      }
      return true;
    },
    
    vp_steal_all: ({ playerId, effect }) => {
      // Evacuation Orders: all other monsters lose X★
      const state = store.getState();
      for (const pid of state.players.order) {
        if (pid === playerId) continue;
        const opp = state.players.byId[pid];
        const actualSteal = Math.min(effect.value, opp.victoryPoints);
        if (actualSteal > 0) {
          store.dispatch(playerVPGained(pid, -actualSteal, 'evacuation_orders'));
        }
      }
      logger.info(`[effectEngine] All other monsters lose ${effect.value}★ due to Evacuation Orders`);
      return true;
    },
    
    // ===== PHASE 5: DICE MANIPULATION EFFECTS =====
    
    spend_energy_change_die: ({ playerId, effect }) => {
      // Stretchy: You can spend 2 Energy to change one of your dice to any result
      // This is a passive ability that needs UI support during dice rolling
      // Flag it as available for the dice UI to enable the option
      logger.info(`[effectEngine] ${playerId} has Stretchy ability (spend ${effect.value} energy to change die)`);
      store.dispatch({ type: 'DICE_MANIPULATION_AVAILABLE', payload: { 
        playerId, 
        type: 'spend_energy_change_die', 
        cost: effect.value 
      }});
      return true;
    },
    
    spend_energy_heal: ({ playerId, effect }) => {
      // Rapid Healing: Spend 2 Energy at any time to heal 1 damage
      // This is a passive ability that needs UI support
      // Flag it as available for the UI to show the option
      logger.info(`[effectEngine] ${playerId} has Rapid Healing ability (spend ${effect.value} energy to heal 1)`);
      store.dispatch({ type: 'HEAL_ABILITY_AVAILABLE', payload: { 
        playerId, 
        cost: effect.value,
        healAmount: 1
      }});
      return true;
    },
    
    change_to_1: ({ playerId, effect }) => {
      // Herd Culler: You can change one of your dice to a ① each turn
      // This is a passive ability that needs UI support during dice rolling
      logger.info(`[effectEngine] ${playerId} has Herd Culler ability (change one die to 1)`);
      store.dispatch({ type: 'DICE_MANIPULATION_AVAILABLE', payload: { 
        playerId, 
        type: 'change_to_1',
        freeUse: true // Once per turn, no cost
      }});
      return true;
    },
    
    change_die_discard: ({ playerId, card, effect }) => {
      // Plot Twist: Change one die to any result. Discard when used.
      // This is a one-time use ability that needs UI support
      logger.info(`[effectEngine] ${playerId} has Plot Twist ability (change one die, then discard)`);
      store.dispatch({ type: 'DICE_MANIPULATION_AVAILABLE', payload: { 
        playerId, 
        type: 'change_die_discard',
        cardId: card.id,
        discardAfterUse: true
      }});
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
