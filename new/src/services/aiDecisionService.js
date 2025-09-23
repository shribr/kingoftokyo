/** aiDecisionService.js
 * Captures AI decision nodes during dice / card phases.
 * For now: mock generator to be replaced with real logic.
 */
import { eventBus } from '../core/eventBus.js';

let latestTree = { rounds: [] };
// Future (dark edition): include wickness / corruption context nodes.
// Example extended shape per roll:
// { faces: '1,2,3', rationale: '...', score: '0.82', wicknessDelta: 1, poisonApplied: 0 }

export function getAIDecisionTree() { return latestTree; }

// Mock: on each dice roll started, push a synthetic node
export function bindAIDecisionCapture(store) {
  store.subscribe((state, action) => {
    if (action.type === 'DICE_ROLL_STARTED') {
      const round = state.meta.round || 1;
      const turn = state.meta.turn || 0;
      const faces = state.dice.faces.map(f => f.value).join(',');
      ensureRound(round).ensureTurn(turn).rolls.push({
        faces: faces || '(pending)',
        rationale: 'Mock rationale: maximize claws while preserving hearts.',
        score: Math.random().toFixed(2)
      });
      eventBus.emit('ai/tree/updated', {});
    }
  });
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