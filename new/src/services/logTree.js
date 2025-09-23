/** logTree.js
 * Derives a hierarchical tree from flat log entries.
 * Heuristic: entries may include metadata { round, turn, phase }.
 */

export function buildLogTree(entries) {
  const tree = [];
  const rounds = new Map();
  for (const e of entries) {
    const round = e.round ?? 1;
    const turn = e.turn ?? 0;
    if (!rounds.has(round)) {
      const roundNode = { type: 'round', round, turns: new Map(), entries: [] };
      rounds.set(round, roundNode);
      tree.push(roundNode);
    }
    const roundNode = rounds.get(round);
    if (!roundNode.turns.has(turn)) {
      roundNode.turns.set(turn, { type: 'turn', turn, entries: [] });
    }
    const turnNode = roundNode.turns.get(turn);
    turnNode.entries.push(e);
  }
  // Normalize Maps to arrays
  return tree.map(r => ({
    type: 'round',
    round: r.round,
    turns: Array.from(r.turns.values()).map(t => ({ type: 'turn', turn: t.turn, entries: t.entries }))
  }));
}