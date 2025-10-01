/** services/resolutionService.js
 * Dice resolution rules at end of a player's roll phase.
 * Applies official King of Tokyo turn-end effects in order:
 *   1) Score numeric triples: base VP equal to the number (1/2/3), +1 VP per extra matching die
 *   2) Gain energy per energy die
 *   3) Heal per heart die if not in Tokyo
 *   4) Resolve claws (attacks):
 *      - Attacker outside Tokyo: damage current Tokyo City/Bay occupants
 *      - Attacker inside Tokyo: damage all monsters outside any Tokyo slot
 *   5) Yield/takeover: occupants decide whether to yield; if slot becomes empty, attacker takes Tokyo (City first, then Bay if allowed)
 *   6) Start-of-turn VP is handled elsewhere (awardStartOfTurnTokyoVP)
 * Also checks GAME OVER conditions after application of results (in the turn service).
 */
import { tallyFaces, extractTriples } from '../domain/dice.js';
import { applyPlayerDamage, healPlayerAction, playerGainEnergy, playerVPGained, playerEnteredTokyo, playerLeftTokyo, uiAttackPulse, uiVPFlash, uiEnergyFlash, uiHealthFlash, tokyoOccupantSet, yieldPromptShown, yieldPromptDecided } from '../core/actions.js';
import { evaluateYieldDecision, evaluateYieldAdvisory } from './aiDecisionService.js';
import { isDeterministicMode, combineSeed } from '../core/rng.js';
import { selectTokyoCityOccupant, selectTokyoBayOccupant } from '../core/selectors.js';
import { selectActivePlayerId } from '../core/selectors.js';
import { Phases } from '../core/phaseFSM.js';
import { createPhaseController } from '../core/phaseController.js';

export function resolveDice(store, logger) {
  const phaseCtrl = createPhaseController(store, logger);
  const state = store.getState();
  const activeId = selectActivePlayerId(state);
  if (!activeId) return;
  const faces = state.dice.faces;
  if (!faces.length) return;
  const tally = tallyFaces(faces);
  // 1. Numeric triples scoring
  const triples = extractTriples(tally);
  for (const t of triples) {
    const base = t.number;
    const extras = t.count - 3;
    const vp = base + Math.max(0, extras);
    if (vp > 0) {
      store.dispatch(playerVPGained(activeId, vp, 'triple'));
      store.dispatch(uiVPFlash(activeId, vp));
      logger.info(`${activeId} gains ${vp} VP (triple ${t.number}${extras>0?` +${extras}`:''})`);
    }
  }
  // 2. Energy gain
  if (tally.energy > 0) {
    store.dispatch(playerGainEnergy(activeId, tally.energy));
    store.dispatch(uiEnergyFlash(activeId, tally.energy));
    logger.info(`${activeId} gains ${tally.energy} energy`);
  }
  // 3. Healing (only if not in Tokyo)
  if (tally.heart > 0) {
    const player = store.getState().players.byId[activeId];
    if (!player.inTokyo) {
      store.dispatch(healPlayerAction(activeId, tally.heart));
      store.dispatch(uiHealthFlash(activeId, tally.heart));
      logger.info(`${activeId} heals ${tally.heart}`);
    }
  }
  // 4. Attacks (claws)
  if (tally.claw > 0) {
    const current = store.getState();
    const attacker = current.players.byId[activeId];
    const cityOcc = selectTokyoCityOccupant(current);
    const bayOcc = selectTokyoBayOccupant(current);
    const damaged = [];
    if (attacker.inTokyo) {
      current.players.order.forEach(pid => {
        if (pid !== activeId) {
          const target = current.players.byId[pid];
          if (!target.inTokyo && target.status.alive) {
            store.dispatch(applyPlayerDamage(pid, tally.claw));
            logger.info(`${activeId} claws ${pid} for ${tally.claw}`);
            damaged.push(pid);
          }
        }
      });
    } else {
      if (cityOcc) {
        store.dispatch(applyPlayerDamage(cityOcc, tally.claw));
        logger.info(`${activeId} claws ${cityOcc} in Tokyo City for ${tally.claw}`);
        damaged.push(cityOcc);
      }
      if (bayOcc) {
        store.dispatch(applyPlayerDamage(bayOcc, tally.claw));
        logger.info(`${activeId} claws ${bayOcc} in Tokyo Bay for ${tally.claw}`);
        damaged.push(bayOcc);
      }
    }
    if (damaged.length) {
      store.dispatch(uiAttackPulse(damaged));
    }
  }
  // 5. Yield / takeover flow (extracted)
  const postAttackState = store.getState();
  const playerCount = postAttackState.players.order.length;
  const bayAllowed = playerCount >= 5;
  const { yieldPromptsCreated } = handleYieldAndPotentialTakeover(store, logger, activeId, tally.claw, playerCount, bayAllowed);

  // 6. Elimination cleanup
  const post = store.getState();
  const cityAfter = selectTokyoCityOccupant(post);
  const bayAfter = selectTokyoBayOccupant(post);
  if (cityAfter) {
    const p = post.players.byId[cityAfter];
    if (!p.status.alive) {
      store.dispatch(playerLeftTokyo(cityAfter));
    }
  }
  if (bayAfter) {
    const p = post.players.byId[bayAfter];
    if (!p.status.alive) {
      store.dispatch(playerLeftTokyo(bayAfter));
    }
  }
  // Final takeover attempt
  attemptTokyoTakeover(store, logger, activeId, playerCount, bayAllowed);

  if (yieldPromptsCreated) {
    const st2 = store.getState();
    const pendingAny = st2.yield.prompts.some(p => p.decision == null);
    if (pendingAny) {
      phaseCtrl.event('NEEDS_YIELD_DECISION');
      logger.system('Phase: YIELD_DECISION', { kind:'phase' });
      try { if (window?.__KOT_METRICS__) { /* metrics hook */ } } catch(_) {}
    }
  }
}

// Extracted helper: manages immediate entry when empty OR creates yield prompts for damaged occupants.
function handleYieldAndPotentialTakeover(store, logger, activeId, clawDamage, playerCount, bayAllowed) {
  const state = store.getState();
  const attacker = state.players.byId[activeId];
  const cityOcc = selectTokyoCityOccupant(state);
  const bayOcc = selectTokyoBayOccupant(state);
  const anyOccupied = !!cityOcc || !!bayOcc;
  let yieldPromptsCreated = false;
  if (clawDamage > 0) {
    if (!anyOccupied && !attacker.inTokyo) {
      // Empty -> enter immediately
      store.dispatch(playerEnteredTokyo(activeId));
      store.dispatch(tokyoOccupantSet(activeId, playerCount));
      logger.system(`${activeId} enters Tokyo City!`, { kind:'tokyo', slot:'city' });
      store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
      store.dispatch(uiVPFlash(activeId, 1));
      logger.info(`${activeId} gains 1 VP for entering Tokyo`);
    } else if (anyOccupied) {
      const post = store.getState();
      const prompts = [];
      const addPrompt = (pid, slot) => {
        if (!pid) return;
        const p = post.players.byId[pid];
        if (!p || !p.status.alive) return;
        console.log(`🏯 Creating yield prompt for ${p.name} (${p.isCPU ? 'CPU' : 'Human'}) in ${slot}`);
        const damage = clawDamage;
        let advisory = null;
        try {
          const adv = evaluateYieldAdvisory(store.getState(), pid, damage, slot);
          if (adv) {
            advisory = { ...adv };
            if (isDeterministicMode()) {
              advisory.seed = combineSeed('KOT_YIELD', store.getState().meta.turnCycleId, pid, slot);
            }
          }
        } catch(_) {}
        if (p.isCPU || p.isAI) {
          const expiresAt = Date.now() + 10000;
          store.dispatch(yieldPromptShown(pid, activeId, slot, expiresAt, damage, advisory));
          logger.info(`${pid} prompted to yield Tokyo ${slot}`, { kind:'tokyo', slot, attacker: activeId });
          prompts.push({ defenderId: pid, slot });
          setTimeout(() => {
            const s = store.getState();
            const stillPending = s.yield.prompts.find(pr => pr.defenderId === pid && pr.attackerId === activeId && pr.slot === slot && pr.decision == null);
            if (stillPending) {
              const autoDecision = evaluateYieldDecision(s, pid, damage, slot);
              store.dispatch(yieldPromptDecided(pid, activeId, slot, autoDecision));
              if (autoDecision === 'yield') {
                store.dispatch(playerLeftTokyo(pid));
                logger.system(`${pid} auto-yields Tokyo ${slot}`, { kind:'tokyo', slot });
              }
              attemptTokyoTakeover(store, logger, activeId, playerCount, bayAllowed);
            }
          }, 5100);
        } else {
          store.dispatch(yieldPromptShown(pid, activeId, slot, null, damage, advisory));
          logger.info(`${pid} prompted to yield Tokyo ${slot} (human - no timeout)`, { kind:'tokyo', slot, attacker: activeId });
          prompts.push({ defenderId: pid, slot });
        }
        // Early AI auto yield if lethal risk
        const sNow = store.getState();
        const defender = sNow.players.byId[pid];
        if (defender && (defender.isCPU || defender.isAI)) {
          const immediate = evaluateYieldDecision(sNow, pid, damage, slot);
            if (immediate === 'yield' && defender.health - damage <= 2) {
            store.dispatch(yieldPromptDecided(pid, activeId, slot, 'yield'));
            store.dispatch(playerLeftTokyo(pid));
            logger.system(`${pid} AI-yields Tokyo ${slot} (immediate)`, { kind:'tokyo', slot });
            attemptTokyoTakeover(store, logger, activeId, playerCount, bayAllowed);
          }
        }
      };
      if (cityOcc) addPrompt(cityOcc, 'city');
      if (bayAllowed && bayOcc) addPrompt(bayOcc, 'bay');
      yieldPromptsCreated = true;
    }
  }
  return { yieldPromptsCreated };
}

// Helper: if there are no pending undecided prompts and attacker not in Tokyo, fill open slots (city then bay)
function attemptTokyoTakeover(store, logger, attackerId, playerCount, bayAllowed) {
  const state = store.getState();
  if (state.players.byId[attackerId].inTokyo) return; // already inside
  const pending = state.yield?.prompts?.some(p => p.attackerId === attackerId && p.decision == null);
  if (pending) return; // wait for decisions
  const cityOcc = selectTokyoCityOccupant(state);
  const bayOcc = selectTokyoBayOccupant(state);
  if (!cityOcc) {
    store.dispatch(playerEnteredTokyo(attackerId));
    store.dispatch(tokyoOccupantSet(attackerId, playerCount));
    logger.system(`${attackerId} enters Tokyo City (takeover)`, { kind:'tokyo', slot:'city' });
    store.dispatch(playerVPGained(attackerId, 1, 'enterTokyo'));
    store.dispatch(uiVPFlash(attackerId, 1));
  } else if (bayAllowed && !bayOcc) {
    store.dispatch(playerEnteredTokyo(attackerId));
    store.dispatch(tokyoOccupantSet(attackerId, playerCount));
    logger.system(`${attackerId} enters Tokyo Bay (takeover)`, { kind:'tokyo', slot:'bay' });
    store.dispatch(playerVPGained(attackerId, 1, 'enterTokyo'));
    store.dispatch(uiVPFlash(attackerId, 1));
  }
}

export function awardStartOfTurnTokyoVP(store, logger) {
  const state = store.getState();
  const activeId = selectActivePlayerId(state);
  if (!activeId) return;
  const cityOcc = selectTokyoCityOccupant(state);
  const bayOcc = selectTokyoBayOccupant(state);
  const playerCount = state.players.order.length;
  console.log(`🏙️ Tokyo VP Check: ${activeId} - City: ${cityOcc}, Bay: ${bayOcc}`);
  const bayAllowed = playerCount >= 5;
  // Official: City occupant gains 2 VP; Bay occupant (only in 5-6 player games) gains 1 VP at start of their turn if they remain.
  if (cityOcc === activeId) {
    console.log(`🏆 Awarding 2 VP to ${activeId} for starting turn in Tokyo City`);
    store.dispatch(playerVPGained(activeId, 2, 'startTurnTokyoCity'));
    store.dispatch(uiVPFlash(activeId, 2));
    logger.info(`${activeId} gains 2 VP for starting turn in Tokyo City`);
  } else if (bayAllowed && bayOcc === activeId) {
    console.log(`🏆 Awarding 1 VP to ${activeId} for starting turn in Tokyo Bay`);
    store.dispatch(playerVPGained(activeId, 1, 'startTurnTokyoBay'));
    store.dispatch(uiVPFlash(activeId, 1));
    logger.info(`${activeId} gains 1 VP for starting turn in Tokyo Bay`);
  }
}

export function checkGameOver(store, logger) {
  const state = store.getState();
  const alive = state.players.order.map(id => state.players.byId[id]).filter(p => p.status.alive);
  const vpWinner = alive.find(p => p.victoryPoints >= 20);
  if (vpWinner) {
    logger.system(`${vpWinner.id} wins by reaching 20 VP`);
    return vpWinner.id;
  }
  if (alive.length === 1) {
    logger.system(`${alive[0].id} wins (last monster standing)`);
    return alive[0].id;
  }
  return null;
}