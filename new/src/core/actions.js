/**
 * core/actions.js
 * Action type constants & creators.
 */
export const PLAYER_JOINED = 'PLAYER_JOINED';
export const PLAYER_DAMAGE_APPLIED = 'PLAYER_DAMAGE_APPLIED';
export const PLAYER_HEALED = 'PLAYER_HEALED';
export const PLAYER_GAINED_ENERGY = 'PLAYER_GAINED_ENERGY';
export const PLAYER_SPENT_ENERGY = 'PLAYER_SPENT_ENERGY';
export const PLAYER_ENTERED_TOKYO = 'PLAYER_ENTERED_TOKYO';
export const PLAYER_LEFT_TOKYO = 'PLAYER_LEFT_TOKYO';

export const DICE_ROLL_STARTED = 'DICE_ROLL_STARTED';
export const DICE_ROLLED = 'DICE_ROLLED';
export const DICE_TOGGLE_KEEP = 'DICE_TOGGLE_KEEP';
export const DICE_REROLL_USED = 'DICE_REROLL_USED';

export const PHASE_CHANGED = 'PHASE_CHANGED';
export const LOG_APPENDED = 'LOG_APPENDED';
export const TOKYO_OCCUPANT_SET = 'TOKYO_OCCUPANT_SET';
export const TOKYO_OCCUPANT_CLEARED = 'TOKYO_OCCUPANT_CLEARED';

// Player action creators
export const playerJoined = (player) => ({ type: PLAYER_JOINED, payload: { player } });
export const applyPlayerDamage = (playerId, amount) => ({ type: PLAYER_DAMAGE_APPLIED, payload: { playerId, amount } });
export const healPlayerAction = (playerId, amount) => ({ type: PLAYER_HEALED, payload: { playerId, amount } });
export const playerGainEnergy = (playerId, amount) => ({ type: PLAYER_GAINED_ENERGY, payload: { playerId, amount } });
export const playerSpendEnergy = (playerId, amount) => ({ type: PLAYER_SPENT_ENERGY, payload: { playerId, amount } });
export const playerEnteredTokyo = (playerId) => ({ type: PLAYER_ENTERED_TOKYO, payload: { playerId } });
export const playerLeftTokyo = (playerId) => ({ type: PLAYER_LEFT_TOKYO, payload: { playerId } });

// Dice action creators
export const diceRollStarted = () => ({ type: DICE_ROLL_STARTED });
export const diceRolled = (faces) => ({ type: DICE_ROLLED, payload: { faces } });
export const diceToggleKeep = (index) => ({ type: DICE_TOGGLE_KEEP, payload: { index } });
export const diceRerollUsed = () => ({ type: DICE_REROLL_USED });

// Phase and log actions
export const phaseChanged = (phase) => ({ type: PHASE_CHANGED, payload: { phase } });
export const logAppended = (entry) => ({ type: LOG_APPENDED, payload: { entry } });
export const tokyoOccupantSet = (playerId) => ({ type: TOKYO_OCCUPANT_SET, payload: { playerId } });
export const tokyoOccupantCleared = () => ({ type: TOKYO_OCCUPANT_CLEARED });
