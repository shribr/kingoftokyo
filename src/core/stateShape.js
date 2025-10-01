/**
 * stateShape.js
 * Documentation & initial state factory.
 */

/**
 * @typedef {Object} GameState
 * @property {Object} players
 * @property {Object} dice
 * @property {Object} tokyo
 * @property {Object} cards
 * @property {string} phase
 * @property {Object} log
 * @property {Object} ui
 * @property {Object} ai
 * @property {Object} meta
 */

export function createInitialState() {
  return {
    players: { order: [], byId: {} },
    dice: { faces: [], rerollsRemaining: 0, baseRerolls: 2, phase: 'idle' },
    tokyo: { city: null, bay: null },
    cards: { deck: [], discard: [], shop: [] },
    phase: 'SETUP',
    log: { entries: [] },
    ui: {
      cardDetail: { cardId: null, source: null },
      playerCards: { playerId: null },
      positions: {},
      // settings slice lives separately; positions persistence now gated by settings.persistPositions (default false)
      monsterProfiles: { open: false },
      monsterSelection: { open: false },
      settings: { open: false },
      singleMonster: { monsterId: null },
      splash: { visible: true },
      flags: { showProbabilities: false },
      peek: { card: null },
      attackPulse: { ts: 0, playerIds: [] }
    },
    settings: { cpuSpeed: 'normal' },
    ai: {},
    effectQueue: { queue: [], processing: null, history: [] },
    monsters: { byId: {}, order: [] },
    meta: { seed: Date.now(), turn: 0, activePlayerIndex: 0, round: 1, gameMode: 'classic' }
  };
}
