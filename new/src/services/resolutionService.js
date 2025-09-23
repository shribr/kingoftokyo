/** services/resolutionService.js
 * Handles resolving dice results at end of roll phase.
 */
import { tallyFaces, extractTriples } from '../domain/dice.js';
import { applyPlayerDamage, healPlayerAction, playerGainEnergy, playerVPGained, playerEnteredTokyo, playerLeftTokyo } from '../core/actions.js';
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
    const occupantId = current.tokyo.occupantId;
    if (attacker.inTokyo) {
      // Hit all outside
      current.players.order.forEach(pid => {
        if (pid !== activeId) {
          const target = current.players.byId[pid];
          if (!target.inTokyo && target.status.alive) {
            store.dispatch(applyPlayerDamage(pid, tally.claw));
            logger.info(`${activeId} claws ${pid} for ${tally.claw}`);
          }
        }
      });
    } else {
      // Attacking Tokyo
      if (occupantId) {
        store.dispatch(applyPlayerDamage(occupantId, tally.claw));
        logger.info(`${activeId} claws ${occupantId} in Tokyo for ${tally.claw}`);
      }
    }
  }
  // 5. Tokyo entry/exit decisions (simplified – auto enter if empty and claws rolled; auto leave if damaged & <3 health)
  const afterCombat = store.getState();
  const attacker = afterCombat.players.byId[activeId];
  const occupantId = afterCombat.tokyo.occupantId;
  if (!occupantId && tally.claw > 0 && !attacker.inTokyo) {
    store.dispatch(playerEnteredTokyo(activeId));
    logger.system(`${activeId} enters Tokyo!`);
    // Immediate VP for entering (official rule: enter -> 1 VP)
    store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
  } else if (occupantId) {
    const occupant = afterCombat.players.byId[occupantId];
    if (occupant && !occupant.status.alive) {
      // Occupant defeated, attacker enters
      store.dispatch(playerEnteredTokyo(activeId));
      logger.system(`${activeId} takes Tokyo from defeated ${occupantId}`);
      store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
    } else if (occupantId !== activeId && tally.claw > 0) {
      // Optionally occupant could yield; simplistic rule: yield if health < 3
      if (occupant.health < 3) {
        store.dispatch(playerLeftTokyo(occupantId));
        store.dispatch(playerEnteredTokyo(activeId));
        logger.system(`${occupantId} yields Tokyo to ${activeId}`);
        store.dispatch(playerVPGained(activeId, 1, 'enterTokyo'));
      }
    }
  }
}

export function awardStartOfTurnTokyoVP(store, logger) {
  const state = store.getState();
  const activeId = selectActivePlayerId(state);
  if (!activeId) return;
  const player = state.players.byId[activeId];
  if (player.inTokyo) {
    // 1 VP at start of turn in Tokyo (2 if using Tokyo Bay variant, which we don't yet track) – use 2 if occupant alone? simplified 2 if inTokyo and someone else alive.
    store.dispatch(playerVPGained(activeId, 2, 'startTurnTokyo'));
    logger.info(`${activeId} gains 2 VP for starting turn in Tokyo`);
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