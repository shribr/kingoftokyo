/** aiDecisionService.js
 * Captures AI decision nodes during dice / card phases.
 * For now: mock generator to be replaced with real logic.
 */
import { eventBus } from '../core/eventBus.js';
import { tallyFaces, extractTriples, DIE_FACES } from '../domain/dice.js';
import { selectActivePlayerId } from '../core/selectors.js';

let latestTree = { rounds: [] };
let lastRollNodeId = null;
let nextNodeId = 1;
// Future (dark edition): include wickness / corruption context nodes.
// Example extended shape per roll:
// { faces: '1,2,3', rationale: '...', score: '0.82', wicknessDelta: 1, poisonApplied: 0 }

export function getAIDecisionTree() { return latestTree; }
export function getLastAIRollId() { return lastRollNodeId; }

// Mock: on each dice roll started, push a synthetic node
export function bindAIDecisionCapture(store) {
  store.subscribe((state, action) => {
    if (action.type === 'DICE_ROLL_STARTED') {
      captureRoll(state, '(pre-roll)', { stage: 'pre' });
    }
    if (action.type === 'DICE_ROLLED') {
      const facesStr = state.dice.faces.map(f => f.value).join(',');
      captureRoll(state, facesStr, { stage: 'post' });
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