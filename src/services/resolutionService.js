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
import { beginYieldFlow } from './yieldDecisionService.js';

export function resolveDice(store, logger) {
  const phaseCtrl = createPhaseController(store, logger);
  const state = store.getState();
  const activeId = selectActivePlayerId(state);
  if (!activeId) return;
  const faces = state.dice.faces;
  if (!faces.length) return;
  const tally = tallyFaces(faces);
  // Pre-damage health snapshot map (populated only if claws present)
  let preDamageHP = null;
  
  // Process dice result effects (Complete Destruction, Gourmet, Poison Quills, Freeze Time)
  try {
    const passiveEffects = typeof window !== 'undefined' ? window.__KOT_NEW__?.passiveEffects : null;
    if (passiveEffects) {
      const diceResults = faces.map(face => ({ face }));
      passiveEffects.processDiceResultEffects(activeId, diceResults);
    }
  } catch(err) {
    logger.warn && logger.warn('[resolveDice] Error in processDiceResultEffects', err);
  }
  
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
    
    // Trigger energy gain passive effects (Friend of Children)
    try {
      const passiveEffects = typeof window !== 'undefined' ? window.__KOT_NEW__?.passiveEffects : null;
      if (passiveEffects) {
        passiveEffects.processEnergyGainEffects(activeId, tally.energy);
      }
    } catch(err) {
      logger.warn && logger.warn('[resolveDice] Error in processEnergyGainEffects', err);
    }
  }
  // 3. Healing (only if not in Tokyo)
  if (tally.heart > 0) {
    const player = store.getState().players.byId[activeId];
    if (!player.inTokyo) {
      // Apply heal bonus from passive effects (Regeneration)
      let healBonus = 0;
      try {
        const passiveEffects = typeof window !== 'undefined' ? window.__KOT_NEW__?.passiveEffects : null;
        if (passiveEffects) {
          healBonus = passiveEffects.getHealBonus(activeId);
        }
      } catch(err) {
        // Silent fail
      }
      const totalHeal = tally.heart + healBonus;
      
      // Only log and dispatch if player can actually heal (not at max health)
      const currentState = store.getState();
      const player = currentState.players.byId[activeId];
      const maxHealth = player.maxHealth || 10;
      
      if (player.health < maxHealth) {
        store.dispatch(healPlayerAction(activeId, totalHeal));
        store.dispatch(uiHealthFlash(activeId, totalHeal));
        logger.info(`${activeId} heals ${totalHeal}${healBonus > 0 ? ` (${tally.heart}+${healBonus} bonus)` : ''}`);
      }
      // If already at max health, don't log or show healing
    }
  }
  // 4. Attacks (claws)
  if (tally.claw > 0) {
    const current = store.getState();
    const attacker = current.players.byId[activeId];
    const cityOcc = selectTokyoCityOccupant(current);
    const bayOcc = selectTokyoBayOccupant(current);
    
    // Calculate attack bonus from passive effects (Acid Attack)
    let attackBonus = 0;
    let tokyoBonus = 0;
    try {
      const passiveEffects = typeof window !== 'undefined' ? window.__KOT_NEW__?.passiveEffects : null;
      if (passiveEffects) {
        attackBonus = passiveEffects.getAttackBonus(activeId);
        tokyoBonus = passiveEffects.getTokyoAttackBonus(activeId);
      }
    } catch(err) {
      // Silent fail - bonus just won't apply
    }
    const totalDamage = tally.claw + attackBonus + tokyoBonus;
    
    // Capture original health BEFORE applying claw damage so yield UI shows correct transition
    preDamageHP = {};
    if (attacker.inTokyo) {
      current.players.order.forEach(pid => {
        if (pid !== activeId) {
          const target = current.players.byId[pid];
          if (!target.inTokyo && target.status.alive) {
            preDamageHP[pid] = target.health;
          }
        }
      });
    } else {
      if (cityOcc) { const t = current.players.byId[cityOcc]; if (t) preDamageHP[cityOcc] = t.health; }
      if (bayOcc) { const t = current.players.byId[bayOcc]; if (t) preDamageHP[bayOcc] = t.health; }
    }
    const damaged = [];
    if (attacker.inTokyo) {
      current.players.order.forEach(pid => {
        if (pid !== activeId) {
          const target = current.players.byId[pid];
          if (!target.inTokyo && target.status.alive) {
            store.dispatch(applyPlayerDamage(pid, totalDamage));
            logger.info(`${activeId} claws ${pid} for ${totalDamage}${attackBonus > 0 ? ` (${tally.claw}+${attackBonus} bonus)` : ''}`);
            damaged.push(pid);
          }
        }
      });
    } else {
      if (cityOcc) {
        store.dispatch(applyPlayerDamage(cityOcc, totalDamage));
        logger.info(`${activeId} claws ${cityOcc} in Tokyo City for ${totalDamage}${attackBonus > 0 ? ` (${tally.claw}+${attackBonus} bonus)` : ''}`);
        damaged.push(cityOcc);
      }
      if (bayOcc) {
        store.dispatch(applyPlayerDamage(bayOcc, totalDamage));
        logger.info(`${activeId} claws ${bayOcc} in Tokyo Bay for ${totalDamage}${attackBonus > 0 ? ` (${tally.claw}+${attackBonus} bonus)` : ''}`);
        damaged.push(bayOcc);
      }
    }
    if (damaged.length) {
      store.dispatch(uiAttackPulse(damaged));
    }
    
    // Trigger attack effects (Alpha Monster, Herbivore)
    try {
      const passiveEffects = typeof window !== 'undefined' ? window.__KOT_NEW__?.passiveEffects : null;
      if (passiveEffects) {
        passiveEffects.processAttackEffects(activeId, damaged.length > 0);
      }
    } catch(err) {
      logger.warn && logger.warn('[resolveDice] Error in processAttackEffects', err);
    }
  } else {
    // No claws rolled - trigger attack effects with didDamage = false (Herbivore)
    try {
      const passiveEffects = typeof window !== 'undefined' ? window.__KOT_NEW__?.passiveEffects : null;
      if (passiveEffects) {
        passiveEffects.processAttackEffects(activeId, false);
      }
    } catch(err) {
      logger.warn && logger.warn('[resolveDice] Error in processAttackEffects', err);
    }
  }
  // 5. Yield / takeover flow (extracted)
  const postAttackState = store.getState();
  const playerCount = postAttackState.players.order.length;
  const bayAllowed = playerCount >= 5;
  let yieldPromptsCreated = false;
  const useUnifiedYield = true; // TODO: feature flag if needed
  if (useUnifiedYield) {
    // Attempt immediate takeover if empty first (retain legacy quick-enter logic)
    const stateNow = store.getState();
    const attacker = stateNow.players.byId[activeId];
    const cityOcc = selectTokyoCityOccupant(stateNow);
    const bayOcc = selectTokyoBayOccupant(stateNow);
    const anyOccupied = !!cityOcc || !!bayOcc;
    if (tally.claw > 0) {
      if (!anyOccupied && !attacker.inTokyo) {
        // Both City and Bay empty - enter City
        console.log(`🏙️ TOKYO ENTRY: ${activeId} entering Tokyo City (both empty)`);
        store.dispatch(playerEnteredTokyo(activeId));
        store.dispatch(tokyoOccupantSet(activeId, playerCount));
        logger.system(`${activeId} enters Tokyo City!`, { kind:'tokyo', slot:'city' });
        console.log(`🏆 DISPATCHING VP for Tokyo entry: ${activeId} +1 VP`);
        store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
        store.dispatch(uiVPFlash(activeId, 1));
        logger.info(`${activeId} gains 1 VP for entering Tokyo`);
      } else if (bayAllowed && cityOcc && !bayOcc && !attacker.inTokyo) {
        // 5+ players: City occupied, Bay empty - auto-enter Bay (no attack on City)
        console.log(`🏖️ TOKYO BAY ENTRY: ${activeId} entering Tokyo Bay (City occupied, Bay empty)`);
        store.dispatch(playerEnteredTokyo(activeId));
        store.dispatch(tokyoOccupantSet(activeId, playerCount));
        logger.system(`${activeId} enters Tokyo Bay!`, { kind:'tokyo', slot:'bay' });
        console.log(`🏆 DISPATCHING VP for Tokyo Bay entry: ${activeId} +1 VP`);
        store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
        store.dispatch(uiVPFlash(activeId, 1));
        logger.info(`${activeId} gains 1 VP for entering Tokyo Bay`);
      } else if (anyOccupied && !attacker.inTokyo) {
        // Both City and Bay occupied (or 4 players with City occupied) - trigger yield flow
        // Only trigger yield flow if attacker is OUTSIDE Tokyo attacking IN
        // If attacker is IN Tokyo, they attack outside players (no yield needed)
        const created = beginYieldFlow(store, logger, activeId, tally.claw, playerCount, bayAllowed, preDamageHP);
        yieldPromptsCreated = created > 0;
      }
    }
  } else {
    const res = handleYieldAndPotentialTakeover(store, logger, activeId, tally.claw, playerCount, bayAllowed);
    yieldPromptsCreated = res.yieldPromptsCreated;
  }

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

  // Ordering assertions (non-fatal diagnostics)
  try {
    const diag = store.getState();
    const city = selectTokyoCityOccupant(diag);
    const bay = selectTokyoBayOccupant(diag);
    if (city && bay && city === bay) {
      logger.warn?.('OrderingAssert: City and Bay share same occupant (invalid)');
    }
    if (bay && playerCount < 5) {
      logger.warn?.('OrderingAssert: Bay occupied with <5 players');
    }
    // If attacker entered city but city already had occupant previously & no yield recorded
    // (Light heuristic: if attacker now cityOcc and no prompt for that occupant with decision yield)
    const priorPrompts = diag.yield?.prompts || [];
    if (city === activeId) {
      const hadPrompt = priorPrompts.some(p => p.defenderId === activeId && p.decision === 'yield');
      const wasInside = !!diag.players.byId[activeId].inTokyo; // current state; historical requires more tracking
      // Skip if attacker started inside (cannot detect here without earlier snapshot)
      if (!wasInside && !hadPrompt && priorPrompts.length === 0) {
        // benign: empty city case; just annotate
        logger.debug?.('OrderingAssert: Attacker entered empty city (expected path)');
      }
    }
  } catch(_) {}

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
        // Legacy AI prompt creation removed (unified yield pipeline supersedes this path)
        // Legacy path: approximate original health by adding damage back (since we didn't snapshot pre-damage here)
        const originalHealth = (p && typeof p.health === 'number' && typeof damage === 'number') ? p.health + damage : null;
        store.dispatch(yieldPromptShown(pid, activeId, slot, null, damage, advisory, originalHealth));
        logger.info(`${pid} prompted to yield Tokyo ${slot} (legacy path - will be deprecated)`, { kind:'tokyo', slot, attacker: activeId });
        prompts.push({ defenderId: pid, slot });
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
    console.log(`🏙️ TOKYO TAKEOVER: ${attackerId} entering Tokyo City`);
    store.dispatch(playerEnteredTokyo(attackerId));
    store.dispatch(tokyoOccupantSet(attackerId, playerCount));
    logger.system(`${attackerId} enters Tokyo City (takeover)`, { kind:'tokyo', slot:'city' });
    console.log(`🏆 DISPATCHING VP for Tokyo takeover: ${attackerId} +1 VP`);
    store.dispatch(playerVPGained(attackerId, 1, 'enterTokyo'));
    store.dispatch(uiVPFlash(attackerId, 1));
  } else if (bayAllowed && !bayOcc) {
    console.log(`🏙️ TOKYO TAKEOVER: ${attackerId} entering Tokyo Bay`);
    store.dispatch(playerEnteredTokyo(attackerId));
    store.dispatch(tokyoOccupantSet(attackerId, playerCount));
    logger.system(`${attackerId} enters Tokyo Bay (takeover)`, { kind:'tokyo', slot:'bay' });
    console.log(`🏆 DISPATCHING VP for Tokyo takeover: ${attackerId} +1 VP`);
    store.dispatch(playerVPGained(attackerId, 1, 'enterTokyo'));
    store.dispatch(uiVPFlash(attackerId, 1));
  }
}

export function awardStartOfTurnTokyoVP(store, logger) {
  const state = store.getState();
  const activeId = selectActivePlayerId(state);
  if (!activeId) {
    console.log('🏙️ Tokyo VP Check: No active player ID found');
    return;
  }
  const cityOcc = selectTokyoCityOccupant(state);
  const bayOcc = selectTokyoBayOccupant(state);
  const playerCount = state.players.order.length;
  console.log(`🏙️ Tokyo VP Check: Active=${activeId} - City=${cityOcc}, Bay=${bayOcc}, Phase=${state.phase}`);
  const bayAllowed = playerCount >= 5;
  // Official: City occupant gains 2 VP; Bay occupant (only in 5-6 player games) also gains 2 VP at start of their turn if they remain.
  if (cityOcc === activeId) {
    console.log(`🏆 Awarding 2 VP to ${activeId} for starting turn in Tokyo City`);
    store.dispatch(playerVPGained(activeId, 2, 'startTurnTokyoCity'));
    store.dispatch(uiVPFlash(activeId, 2));
    logger.info(`${activeId} gains 2 VP for starting turn in Tokyo City`);
  } else if (bayAllowed && bayOcc === activeId) {
    console.log(`🏆 Awarding 2 VP to ${activeId} for starting turn in Tokyo Bay`);
    store.dispatch(playerVPGained(activeId, 2, 'startTurnTokyoBay'));
    store.dispatch(uiVPFlash(activeId, 2));
    logger.info(`${activeId} gains 2 VP for starting turn in Tokyo Bay`);
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