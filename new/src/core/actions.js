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
export const PLAYER_CARD_GAINED = 'PLAYER_CARD_GAINED';
export const PLAYER_VP_GAINED = 'PLAYER_VP_GAINED';

export const DICE_ROLL_STARTED = 'DICE_ROLL_STARTED';
export const DICE_ROLLED = 'DICE_ROLLED';
export const DICE_TOGGLE_KEEP = 'DICE_TOGGLE_KEEP';
export const DICE_REROLL_USED = 'DICE_REROLL_USED';

export const PHASE_CHANGED = 'PHASE_CHANGED';
export const LOG_APPENDED = 'LOG_APPENDED';
export const TOKYO_OCCUPANT_SET = 'TOKYO_OCCUPANT_SET';
export const TOKYO_OCCUPANT_CLEARED = 'TOKYO_OCCUPANT_CLEARED';

// Cards / Shop
export const CARDS_DECK_BUILT = 'CARDS_DECK_BUILT';
export const CARDS_SHOP_FILLED = 'CARDS_SHOP_FILLED';
export const CARD_PURCHASED = 'CARD_PURCHASED';
export const CARD_DISCARDED = 'CARD_DISCARDED';
export const CARD_EFFECT_QUEUED = 'CARD_EFFECT_QUEUED';
export const CARD_EFFECT_RESOLVED = 'CARD_EFFECT_RESOLVED';
// Card Effects (Phase 8 scaffold)
export const CARD_EFFECT_ENQUEUED = 'CARD_EFFECT_ENQUEUED';
export const CARD_EFFECT_PROCESSING = 'CARD_EFFECT_PROCESSING';
export const CARD_EFFECT_FAILED = 'CARD_EFFECT_FAILED';
// Meta / Turn
export const NEXT_TURN = 'NEXT_TURN';
// UI
export const UI_CARD_DETAIL_OPEN = 'UI_CARD_DETAIL_OPEN';
export const UI_CARD_DETAIL_CLOSE = 'UI_CARD_DETAIL_CLOSE';
export const UI_PLAYER_CARDS_OPEN = 'UI_PLAYER_CARDS_OPEN';
export const UI_PLAYER_CARDS_CLOSE = 'UI_PLAYER_CARDS_CLOSE';
// Monster profiles
export const MONSTERS_LOADED = 'MONSTERS_LOADED';
export const UI_MONSTER_PROFILES_OPEN = 'UI_MONSTER_PROFILES_OPEN';
export const UI_MONSTER_PROFILES_CLOSE = 'UI_MONSTER_PROFILES_CLOSE';
export const UI_MONSTER_PROFILE_OPEN = 'UI_MONSTER_PROFILE_OPEN';
export const UI_MONSTER_PROFILE_CLOSE = 'UI_MONSTER_PROFILE_CLOSE';
// Splash
export const UI_SPLASH_HIDE = 'UI_SPLASH_HIDE';
// Layout / Positioning
export const UI_POSITION_SET = 'UI_POSITION_SET';
export const UI_POSITIONS_RESET = 'UI_POSITIONS_RESET';

// Player action creators
export const playerJoined = (player) => ({ type: PLAYER_JOINED, payload: { player } });
export const applyPlayerDamage = (playerId, amount) => ({ type: PLAYER_DAMAGE_APPLIED, payload: { playerId, amount } });
export const healPlayerAction = (playerId, amount) => ({ type: PLAYER_HEALED, payload: { playerId, amount } });
export const playerGainEnergy = (playerId, amount) => ({ type: PLAYER_GAINED_ENERGY, payload: { playerId, amount } });
export const playerSpendEnergy = (playerId, amount) => ({ type: PLAYER_SPENT_ENERGY, payload: { playerId, amount } });
export const playerEnteredTokyo = (playerId) => ({ type: PLAYER_ENTERED_TOKYO, payload: { playerId } });
export const playerLeftTokyo = (playerId) => ({ type: PLAYER_LEFT_TOKYO, payload: { playerId } });
export const playerCardGained = (playerId, card) => ({ type: PLAYER_CARD_GAINED, payload: { playerId, card } });
export const playerVPGained = (playerId, amount, reason) => ({ type: PLAYER_VP_GAINED, payload: { playerId, amount, reason } });

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

// Card actions
export const cardsDeckBuilt = (deck) => ({ type: CARDS_DECK_BUILT, payload: { deck } });
export const cardsShopFilled = (cards) => ({ type: CARDS_SHOP_FILLED, payload: { cards } });
export const cardPurchased = (playerId, card) => ({ type: CARD_PURCHASED, payload: { playerId, card } });
export const cardDiscarded = (card) => ({ type: CARD_DISCARDED, payload: { card } });
export const cardEffectQueued = (card, effect) => ({ type: CARD_EFFECT_QUEUED, payload: { card, effect } });
export const cardEffectResolved = (card, effect) => ({ type: CARD_EFFECT_RESOLVED, payload: { card, effect } });
export const cardEffectEnqueued = (entry) => ({ type: CARD_EFFECT_ENQUEUED, payload: { entry } });
export const cardEffectProcessing = (entryId) => ({ type: CARD_EFFECT_PROCESSING, payload: { entryId } });
export const cardEffectFailed = (entryId, reason) => ({ type: CARD_EFFECT_FAILED, payload: { entryId, reason } });
// Turn / meta
export const nextTurn = () => ({ type: NEXT_TURN });
// UI action creators
export const uiCardDetailOpen = (cardId, source) => ({ type: UI_CARD_DETAIL_OPEN, payload: { cardId, source } });
export const uiCardDetailClose = () => ({ type: UI_CARD_DETAIL_CLOSE });
export const uiPlayerCardsOpen = (playerId) => ({ type: UI_PLAYER_CARDS_OPEN, payload: { playerId } });
export const uiPlayerCardsClose = () => ({ type: UI_PLAYER_CARDS_CLOSE });
// Monster profile action creators
export const monstersLoaded = (monsters) => ({ type: MONSTERS_LOADED, payload: { monsters } });
export const uiMonsterProfilesOpen = () => ({ type: UI_MONSTER_PROFILES_OPEN });
export const uiMonsterProfilesClose = () => ({ type: UI_MONSTER_PROFILES_CLOSE });
export const uiMonsterProfileOpen = (monsterId) => ({ type: UI_MONSTER_PROFILE_OPEN, payload: { monsterId } });
export const uiMonsterProfileClose = () => ({ type: UI_MONSTER_PROFILE_CLOSE });
// Splash
export const uiSplashHide = () => ({ type: UI_SPLASH_HIDE });
// Positioning action creators
export const uiPositionSet = (componentName, x, y) => ({ type: UI_POSITION_SET, payload: { componentName, x, y } });
export const uiPositionsReset = () => ({ type: UI_POSITIONS_RESET });
