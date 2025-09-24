/** services/resolutionService.js
 * Handles resolving dice results at end of roll phase.
 */
import { tallyFaces, extractTriples } from '../domain/dice.js';
import { applyPlayerDamage, healPlayerAction, playerGainEnergy, playerVPGained, playerEnteredTokyo, playerLeftTokyo, uiAttackPulse, tokyoOccupantSet, yieldPromptShown, yieldPromptDecided } from '../core/actions.js';
import { selectTokyoCityOccupant, selectTokyoBayOccupant } from '../core/selectors.js';
import { selectActivePlayerId } from '../core/selectors.js';

export function resolveDice(store, logger) {
  const state = store.getState();
  const activeId = selectActivePlayerId(state);
  if (!activeId) return;
  const faces = state.dice.faces;
  if (!faces.length) return;
  const tally = tallyFaces(faces);
  // 1. Numeric triples scoring (3 of a number gives that number VP, +1 VP per extra of that number)
  const triples = extractTriples(tally);
  for (const t of triples) {
    const base = t.number; // 1,2,3
    const extras = t.count - 3;
    const vp = base + Math.max(0, extras);
    if (vp > 0) {
      store.dispatch(playerVPGained(activeId, vp, 'triple'));
      logger.info(`${activeId} gains ${vp} VP (triple ${t.number}${extras>0?` +${extras}`:''})`);
    }
  }
  // 2. Energy gain
  if (tally.energy > 0) {
    store.dispatch(playerGainEnergy(activeId, tally.energy));
    logger.info(`${activeId} gains ${tally.energy} energy`);
  }
  // 3. Healing (only if not in Tokyo)
  if (tally.heart > 0) {
    const player = store.getState().players.byId[activeId];
    if (!player.inTokyo) {
      store.dispatch(healPlayerAction(activeId, tally.heart));
      logger.info(`${activeId} heals ${tally.heart}`);
    }
  }
  // 4. Attacks (claws) – if attacker outside Tokyo hit occupant; if inside hit everyone outside
  if (tally.claw > 0) {
    const current = store.getState();
    const attacker = current.players.byId[activeId];
    const cityOcc = selectTokyoCityOccupant(current);
    const bayOcc = selectTokyoBayOccupant(current);
    const damaged = [];
    if (attacker.inTokyo) {
      // Attacker is in (either city or bay) -> hit everyone not in any Tokyo slot
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
      // Attacking Tokyo occupants (both city & bay if present)
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
  // 5. Tokyo entry/exit decisions (simplified – auto enter if empty and claws rolled; auto leave if damaged & <3 health)
  const afterCombat = store.getState();
  const attacker = afterCombat.players.byId[activeId];
  const cityOcc = selectTokyoCityOccupant(afterCombat);
  const bayOcc = selectTokyoBayOccupant(afterCombat);
  const anyOccupied = !!cityOcc || !!bayOcc;
  const playerCount = afterCombat.players.order.length;
  const bayAllowed = playerCount >= 5;
  if (!anyOccupied && tally.claw > 0 && !attacker.inTokyo) {
    // Enter city first (only city when empty)
    store.dispatch(playerEnteredTokyo(activeId));
    store.dispatch(tokyoOccupantSet(activeId, playerCount));
    logger.system(`${activeId} enters Tokyo City!`, { kind:'tokyo', slot:'city' });
    store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
  } else if (anyOccupied && tally.claw > 0) {
    // Interactive yield: create prompt(s) for each occupant damaged & still alive
    const post = store.getState();
    const prompts = [];
    const addPrompt = (pid, slot) => {
      if (!pid) return;
      const p = post.players.byId[pid];
      if (!p || !p.status.alive) return;
      const expiresAt = Date.now() + 5000; // 5s decision window (could be configurable)
      store.dispatch(yieldPromptShown(pid, activeId, slot, expiresAt));
      logger.info(`${pid} prompted to yield Tokyo ${slot}`, { kind:'tokyo', slot, attacker: activeId });
      prompts.push({ defenderId: pid, slot });
      // Auto decision fallback after expiry (simple: stay if above 3 health else yield)
      setTimeout(() => {
        const s = store.getState();
        const stillPending = s.yield.prompts.find(pr => pr.defenderId === pid && pr.attackerId === activeId && pr.slot === slot && pr.decision == null);
        if (stillPending) {
          const curP = s.players.byId[pid];
            const autoDecision = curP.health < 3 ? 'yield' : 'stay';
            store.dispatch(yieldPromptDecided(pid, activeId, slot, autoDecision));
            if (autoDecision === 'yield') {
              store.dispatch(playerLeftTokyo(pid));
              logger.system(`${pid} auto-yields Tokyo ${slot}`, { kind:'tokyo', slot });
            }
            attemptTokyoTakeover(store, logger, activeId, playerCount, bayAllowed);
        }
      }, 5100);
    };
    if (cityOcc) addPrompt(cityOcc, 'city');
    if (bayAllowed && bayOcc) addPrompt(bayOcc, 'bay');
    // Immediate takeover not performed yet; takeover attempted when decisions resolved.
  }
  // Attempt takeover if no prompts created or already resolved
  attemptTokyoTakeover(store, logger, activeId, playerCount, bayAllowed);
  // Elimination cleanup: if a Tokyo occupant died during this resolution, clear their slot(s)
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
  } else if (bayAllowed && !bayOcc) {
    store.dispatch(playerEnteredTokyo(attackerId));
    store.dispatch(tokyoOccupantSet(attackerId, playerCount));
    logger.system(`${attackerId} enters Tokyo Bay (takeover)`, { kind:'tokyo', slot:'bay' });
    store.dispatch(playerVPGained(attackerId, 1, 'enterTokyo'));
  }
}

export function awardStartOfTurnTokyoVP(store, logger) {
  const state = store.getState();
  const activeId = selectActivePlayerId(state);
  if (!activeId) return;
  const cityOcc = selectTokyoCityOccupant(state);
  const bayOcc = selectTokyoBayOccupant(state);
  const playerCount = state.players.order.length;
  const bayAllowed = playerCount >= 5;
  // Official: City occupant gains 2 VP; Bay occupant (only in 5-6 player games) gains 1 VP at start of their turn if they remain.
  if (cityOcc === activeId) {
    store.dispatch(playerVPGained(activeId, 2, 'startTurnTokyoCity'));
    logger.info(`${activeId} gains 2 VP for starting turn in Tokyo City`);
  } else if (bayAllowed && bayOcc === activeId) {
    store.dispatch(playerVPGained(activeId, 1, 'startTurnTokyoBay'));
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