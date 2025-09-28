/** aiDecisionService.js
 * Captures AI decision nodes during dice / card phases.
 * For now: mock generator to be replaced with real logic.
 */
import { eventBus } from '../core/eventBus.js';
import { tallyFaces, extractTriples, DIE_FACES } from '../domain/dice.js';
import { selectActivePlayerId, selectTokyoOccupants } from '../core/selectors.js';
import { diceToggleKeep, DICE_ROLL_STARTED, DICE_ROLLED, DICE_REROLL_USED, PHASE_CHANGED } from '../core/actions.js';
import { purchaseCard, flushShop } from './cardsService.js';
import { DICE_ANIM_MS, AI_POST_ANIM_DELAY_MS } from '../constants/uiTimings.js';

let latestTree = { rounds: [] };
let lastRollNodeId = null;
let nextNodeId = 1;
// Dice/AI timing constants imported from centralized module
let aiKeepTimer = null;
let aiKeepGeneration = 0;
// Future (dark edition): include wickness / corruption context nodes.
// Example extended shape per roll:
// { faces: '1,2,3', rationale: '...', score: '0.82', wicknessDelta: 1, poisonApplied: 0 }

export function getAIDecisionTree() { return latestTree; }
export function getLastAIRollId() { return lastRollNodeId; }

// Mock: on each dice roll started, push a synthetic node
export function bindAIDecisionCapture(store) {
  store.subscribe((state, action) => {
    if (action.type === DICE_ROLL_STARTED) {
      cancelPendingAIKeep();
      captureRoll(state, '(pre-roll)', { stage: 'pre' });
    }
    if (action.type === DICE_REROLL_USED) {
      // Reroll initiated (human path order); cancel any pending keep from previous roll
      cancelPendingAIKeep();
    }
    if (action.type === DICE_ROLLED) {
      const facesStr = state.dice.faces.map(f => f.value).join(',');
      captureRoll(state, facesStr, { stage: 'post' });
      // Schedule AI keep after dice animation completes + 2s buffer (only for CPU turns)
      scheduleAIAutoKeep(store);
    }
    if (action.type === PHASE_CHANGED) {
      // Any phase change cancels pending keeps; we only keep during ROLL
      if (action.payload?.phase !== 'ROLL') cancelPendingAIKeep();
      if (action.payload?.phase === 'CLEANUP') {
        // Hook point for future evaluation of purchases before next turn
        attemptAIPurchases(store);
      }
    }
  });
}

function captureRoll(state, facesStr, extraMeta) {
  const round = state.meta.round || 1;
  const turn = state.meta.turn || 0;
  const activeId = selectActivePlayerId(state);
  const faces = state.dice.faces;
  const analysis = analyzeFaces(faces, state, activeId);
  const turnNode = ensureRound(round).ensureTurn(turn);
  const node = {
    id: nextNodeId++,
    faces: facesStr,
    rationale: analysis.rationale,
    score: analysis.score.toFixed(2),
    tags: analysis.tags,
    stage: extraMeta?.stage,
    hypotheticals: generateHypotheticals(state, faces, activeId)
  };
  turnNode.rolls.push(node);
  if (extraMeta?.stage === 'post') {
    lastRollNodeId = node.id;
  }
  eventBus.emit('ai/tree/updated', {});
}

function analyzeFaces(faces, state, activeId) {
  if (!faces || !faces.length) return { score: 0, rationale: 'No dice yet', tags: [] };
  const t = tallyFaces(faces);
  const triples = extractTriples(t);
  let score = 0;
  const parts = [];
  const tags = [];
  // Offensive weight: claws * opponentsAlive
  const opponents = state.players.order.filter(id => id !== activeId && state.players.byId[id].status.alive).length;
  const clawValue = t.claw * (1 + opponents * 0.2);
  if (clawValue > 0) { score += clawValue; parts.push(`Claw pressure ${clawValue.toFixed(2)}`); tags.push('claw'); }
  // Energy economy
  if (t.energy) { const ev = t.energy * 0.8; score += ev; parts.push(`Energy ${ev.toFixed(2)}`); tags.push('energy'); }
  // Healing (only if below 6 health and not in Tokyo)
  const player = activeId ? state.players.byId[activeId] : null;
  if (player && !player.inTokyo && player.health < 6 && t.heart) {
    const hv = t.heart * (player.health < 4 ? 1.2 : 0.6);
    score += hv; parts.push(`Heal ${hv.toFixed(2)}`); tags.push('heal');
  }
  // Triples potential
  if (triples.length) {
    for (const trip of triples) {
      const tv = (trip.number + (trip.count - 3)) * 1.1;
      score += tv; parts.push(`Triple ${trip.number}=${tv.toFixed(2)}`); tags.push('triple');
    }
  } else {
    // Potential future triple: any number showing 2 copies counts small value
    ['1','2','3'].forEach(num => {
      if (t[num] === 2) { const pv = (Number(num) * 0.4); score += pv; parts.push(`Potential ${num}${pv.toFixed(2)}`); tags.push('potential'); }
    });
  }
  return { score, rationale: parts.join(' | ') || 'Neutral roll', tags };
}

// Decide which dice to keep after a roll (basic heuristic):
// 1. Keep triples in progress (any number with 2+ copies if no better set already locked)
// 2. Keep claws if not in Tokyo OR if in Tokyo and aiming for VP defense (still keep some)
// 3. Keep hearts only if healing is valuable (below 6 HP and not in Tokyo)
// 4. Keep energy if player has < 6 energy and no immediate lethal setup
function autoKeepHeuristic(store) {
  const state = store.getState();
  const activeId = selectActivePlayerId(state);
  if (!activeId) return;
  const player = state.players.byId[activeId];
  if (!player || state.phase !== 'ROLL') return;
  // Only auto-keep for AI/CPU players; never auto-toggle keeps for human turns
  const isCpu = !!(player.isCPU || player.isAi || player.isAI || player.type === 'ai');
  if (!isCpu) return;
  // Only act if there are rerolls remaining (skip final roll)
  if (state.dice.rerollsRemaining <= 0) return;
  const faces = state.dice.faces;
  const tally = tallyFaces(faces);
  const occupants = selectTokyoOccupants(state);
  const inTokyo = player.inTokyo;
  // Determine candidate numbers for potential triple (prefer highest numeric value producing VP)
  const candidateNumbers = ['3','2','1'].filter(n => tally[n] >= 2);
  let lockedNumber = candidateNumbers.length ? candidateNumbers[0] : null;
  // Iterate dice and decide keep flags
  faces.forEach((die, idx) => {
    let keep = false;
    if (lockedNumber && die.value === Number(lockedNumber)) keep = true;
    else if (die.value === 'claw' || die.value === 0) { // 'claw' might be represented differently; adapt if needed
      if (!inTokyo) keep = true; // attacking from outside
    }
    else if (die.value === 'heart' && !inTokyo && player.health < 6) keep = true;
    else if (die.value === 'energy' && player.energy < 6 && !lockedNumber) keep = true;
    if (keep && !die.kept) store.dispatch(diceToggleKeep(idx));
  });
}

function scheduleAIAutoKeep(store) {
  cancelPendingAIKeep();
  const gen = ++aiKeepGeneration;
  aiKeepTimer = setTimeout(() => {
    // If another roll started since scheduling, skip
    if (gen !== aiKeepGeneration) return;
    try {
      const st = store.getState();
      // Ensure we're still in CPU ROLL phase and dice are resolved
      const activeId = selectActivePlayerId(st);
      if (!activeId || st.phase !== 'ROLL' || st.dice.phase !== 'resolved') return;
      const player = st.players.byId[activeId];
      const isCpu = !!(player && (player.isCPU || player.isAi || player.isAI || player.type === 'ai'));
      if (!isCpu) return;
      autoKeepHeuristic(store);
    } catch(_) { /* noop */ }
  }, DICE_ANIM_MS + AI_POST_ANIM_DELAY_MS);
}

function cancelPendingAIKeep() {
  if (aiKeepTimer) {
    try { clearTimeout(aiKeepTimer); } catch(_) {}
    aiKeepTimer = null;
  }
}

// Yield heuristic suggestion (not auto-dispatched here yet): returns 'yield' | 'stay'
export function evaluateYieldDecision(state, defenderId, incomingDamage, slot) {
  const defender = state.players.byId[defenderId];
  if (!defender) return 'stay';
  // If damage would put us at <=2 HP and we are early VP ( < 12 ), prefer yield to survive.
  const projected = defender.health - incomingDamage;
  if (projected <= 2 && defender.victoryPoints < 12) return 'yield';
  // If holding strong VP lead and health moderate, stay.
  if (defender.victoryPoints >= 15 && projected > 0) return 'stay';
  // If slot is Bay (lower VP yield) and damage moderate (>=3), more incentive to yield.
  if (slot === 'bay' && incomingDamage >= 3 && projected < defender.health) return 'yield';
  return 'stay';
}

// AI purchase heuristic: prefer cheap immediate VP / energy cards under budget; fallback to utility.
function attemptAIPurchases(store) {
  const state = store.getState();
  const activeId = selectActivePlayerId(state);
  if (!activeId) return;
  const player = state.players.byId[activeId];
  if (!player?.isAI) return; // only AI players
  const shop = state.cards.shop;
  if (!shop.length) return;
  // Simple scoring
  const scored = shop.map(c => ({
    card: c,
    score: scoreCardForAI(c, player)
  })).sort((a,b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score <= 0) return;
  if (player.energy >= best.card.cost) {
    purchaseCard(store, store._logger || console, activeId, best.card.id); // logger fallback if needed
  } else if (player.energy >= 2 && shouldFlushForOpportunity(scored)) {
    flushShop(store, store._logger || console, activeId, 2);
  }
}

function scoreCardForAI(card, player) {
  const kind = card.effect?.kind;
  let base = 0;
  switch (kind) {
    case 'vp_gain': base = card.effect.value * 3; break; // immediate VP weighted
    case 'energy_gain': base = card.effect.value * 2; break;
    case 'heal_self': base = (player.health < 6 ? 2 : 0.5) * card.effect.value; break;
    case 'damage_all': base = card.effect.value * 2.2; break;
    case 'damage_select': base = (card.effect.maxTargets||1) * card.effect.value * 2.5; break;
    case 'energy_steal': base = card.effect.value * 2.4; break;
    case 'vp_steal': base = card.effect.value * 3.2; break;
    case 'dice_slot': base = 6; break;
    case 'reroll_bonus': base = 4; break;
    default: base = 1;
  }
  // Cost efficiency
  const efficiency = base / Math.max(1, card.cost);
  return Number((efficiency + base * 0.05).toFixed(2));
}

function shouldFlushForOpportunity(scoredList) {
  // If top three scores all low (<=2), flush might improve options
  const top = scoredList.slice(0,3).map(s => s.score);
  return top.every(v => v <= 2);
}

// Generate simple hypothetical reroll evaluations: for each non-kept die, consider swapping to each other face and re-score (lightweight heuristic)
function generateHypotheticals(state, faces, activeId) {
  if (!faces || !faces.length) return [];
  const results = [];
  faces.forEach((die, idx) => {
    if (die.kept) return; // only consider dice that could be rerolled
    const currentFace = die.value;
    const tried = new Set();
    for (const candidate of DIE_FACES) {
      if (candidate === currentFace || tried.has(candidate)) continue;
      tried.add(candidate);
      const clone = faces.map((f,i) => i===idx ? { ...f, value: candidate } : f);
      const t = tallyFaces(clone);
      const triples = extractTriples(t);
      let score = 0;
      // reuse partial scoring logic simplified
      const opponents = state.players.order.filter(id => id !== activeId && state.players.byId[id].status.alive).length;
      score += t.claw * (1 + opponents * 0.2);
      score += t.energy * 0.8;
      const player = activeId ? state.players.byId[activeId] : null;
      if (player && !player.inTokyo && player.health < 6) score += t.heart * (player.health < 4 ? 1.2 : 0.6);
      if (triples.length) {
        triples.forEach(trip => { score += (trip.number + (trip.count - 3)) * 1.1; });
      } else {
        ['1','2','3'].forEach(num => { if (t[num] === 2) score += Number(num)*0.4; });
      }
      results.push({ dieIndex: idx, to: candidate, estScore: Number(score.toFixed(2)) });
    }
  });
  // Limit size for performance
  return results.slice(0, 30);
}

function ensureRound(r) {
  let roundNode = latestTree.rounds.find(x => x.round === r);
  if (!roundNode) {
    roundNode = { round: r, turns: [] };
    latestTree.rounds.push(roundNode);
  }
  roundNode.ensureTurn = (t) => ensureTurn(roundNode, t);
  return roundNode;
}

function ensureTurn(roundNode, t) {
  let turnNode = roundNode.turns.find(x => x.turn === t);
  if (!turnNode) {
    turnNode = { turn: t, rolls: [] };
    roundNode.turns.push(turnNode);
  }
  return turnNode;
}