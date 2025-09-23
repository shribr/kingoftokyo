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
    dice: { faces: [], rerollsRemaining: 0, phase: 'idle' },
    tokyo: { occupantId: null },
    cards: { deck: [], discard: [], shop: [] },
    phase: 'SETUP',
    log: { entries: [] },
    ui: { modal: { open: false }, flags: { showProbabilities: false } },
    ai: {},
    meta: { seed: Date.now(), turn: 0, gameMode: 'classic' }
  };
}
