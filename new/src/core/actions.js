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
export const CARD_SHOP_FLUSHED = 'CARD_SHOP_FLUSHED';
// Card Effects (Phase 8 scaffold)
export const CARD_EFFECT_ENQUEUED = 'CARD_EFFECT_ENQUEUED';
export const CARD_EFFECT_PROCESSING = 'CARD_EFFECT_PROCESSING';
export const CARD_EFFECT_FAILED = 'CARD_EFFECT_FAILED';
// Meta / Turn
export const NEXT_TURN = 'NEXT_TURN';
export const GAME_STATE_IMPORTED = 'GAME_STATE_IMPORTED';
// Meta direct set (e.g., first player determination)
export const META_ACTIVE_PLAYER_SET = 'META_ACTIVE_PLAYER_SET';
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
// Setup (Monster Selection)
export const UI_MONSTER_SELECTION_OPEN = 'UI_MONSTER_SELECTION_OPEN';
export const UI_MONSTER_SELECTION_CLOSE = 'UI_MONSTER_SELECTION_CLOSE';
// Layout / Positioning
export const UI_POSITION_SET = 'UI_POSITION_SET';
export const UI_POSITIONS_RESET = 'UI_POSITIONS_RESET';
export const UI_SETTINGS_OPEN = 'UI_SETTINGS_OPEN';
export const UI_SETTINGS_CLOSE = 'UI_SETTINGS_CLOSE';
export const UI_AI_DECISION_OPEN = 'UI_AI_DECISION_OPEN';
export const UI_AI_DECISION_CLOSE = 'UI_AI_DECISION_CLOSE';
export const UI_GAME_LOG_OPEN = 'UI_GAME_LOG_OPEN';
export const UI_GAME_LOG_CLOSE = 'UI_GAME_LOG_CLOSE';
export const UI_GAME_LOG_COLLAPSE_STATE = 'UI_GAME_LOG_COLLAPSE_STATE';
export const UI_INSTRUCTIONS_OPEN = 'UI_INSTRUCTIONS_OPEN';
export const UI_INSTRUCTIONS_CLOSE = 'UI_INSTRUCTIONS_CLOSE';
export const UI_CONFIRM_OPEN = 'UI_CONFIRM_OPEN';
export const UI_CONFIRM_CLOSE = 'UI_CONFIRM_CLOSE';
export const UI_ABOUT_OPEN = 'UI_ABOUT_OPEN';
export const UI_ABOUT_CLOSE = 'UI_ABOUT_CLOSE';
export const UI_ROLL_FOR_FIRST_OPEN = 'UI_ROLL_FOR_FIRST_OPEN';
export const UI_ROLL_FOR_FIRST_CLOSE = 'UI_ROLL_FOR_FIRST_CLOSE';
export const UI_ROLL_FOR_FIRST_RESOLVED = 'UI_ROLL_FOR_FIRST_RESOLVED';
// Peek & attack visual indicators
export const UI_PEEK_SHOW = 'UI_PEEK_SHOW';
export const UI_PEEK_HIDE = 'UI_PEEK_HIDE';
export const UI_ATTACK_PULSE = 'UI_ATTACK_PULSE';
// Yield decision (Tokyo leave prompt)
export const YIELD_PROMPT_SHOWN = 'YIELD_PROMPT_SHOWN';
export const YIELD_PROMPT_DECIDED = 'YIELD_PROMPT_DECIDED';
// Settings (new slice)
export const SETTINGS_LOADED = 'SETTINGS_LOADED';
export const SETTINGS_UPDATED = 'SETTINGS_UPDATED';
// Target selection (multi-target effects)
export const TARGET_SELECTION_STARTED = 'TARGET_SELECTION_STARTED';
export const TARGET_SELECTION_UPDATED = 'TARGET_SELECTION_UPDATED';
export const TARGET_SELECTION_CONFIRMED = 'TARGET_SELECTION_CONFIRMED';
export const TARGET_SELECTION_CANCELLED = 'TARGET_SELECTION_CANCELLED';

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
export const tokyoOccupantSet = (playerId, playerCount) => ({ type: TOKYO_OCCUPANT_SET, payload: { playerId, playerCount } });
export const tokyoOccupantCleared = () => ({ type: TOKYO_OCCUPANT_CLEARED });

// Card actions
export const cardsDeckBuilt = (deck) => ({ type: CARDS_DECK_BUILT, payload: { deck } });
export const cardsShopFilled = (cards) => ({ type: CARDS_SHOP_FILLED, payload: { cards } });
export const cardPurchased = (playerId, card) => ({ type: CARD_PURCHASED, payload: { playerId, card } });
export const cardDiscarded = (card) => ({ type: CARD_DISCARDED, payload: { card } });
export const cardShopFlushed = (playerId, oldCards, newCards, cost) => ({ type: CARD_SHOP_FLUSHED, payload: { playerId, oldCards, newCards, cost } });
export const cardEffectQueued = (card, effect) => ({ type: CARD_EFFECT_QUEUED, payload: { card, effect } });
export const cardEffectResolved = (card, effect) => ({ type: CARD_EFFECT_RESOLVED, payload: { card, effect } });
export const cardEffectEnqueued = (entry) => ({ type: CARD_EFFECT_ENQUEUED, payload: { entry } });
export const cardEffectProcessing = (entryId) => ({ type: CARD_EFFECT_PROCESSING, payload: { entryId } });
export const cardEffectFailed = (entryId, reason) => ({ type: CARD_EFFECT_FAILED, payload: { entryId, reason } });
// Turn / meta
export const nextTurn = () => ({ type: NEXT_TURN });
export const gameStateImported = (snapshot) => ({ type: GAME_STATE_IMPORTED, payload: { snapshot } });
export const metaActivePlayerSet = (index) => ({ type: META_ACTIVE_PLAYER_SET, payload: { index } });
// UI action creators
export const uiCardDetailOpen = (cardId, source) => ({ type: UI_CARD_DETAIL_OPEN, payload: { cardId, source } });
export const uiCardDetailClose = () => ({ type: UI_CARD_DETAIL_CLOSE });
export const uiPlayerCardsOpen = (playerId) => ({ type: UI_PLAYER_CARDS_OPEN, payload: { playerId } });
export const uiPlayerCardsClose = () => ({ type: UI_PLAYER_CARDS_CLOSE });
// Monster profile action creators
export const monstersLoaded = (monsters) => ({ type: MONSTERS_LOADED, payload: { monsters } });
// Optional source allows us to know where profiles were opened from (e.g., 'selection')
export const uiMonsterProfilesOpen = (source = null) => ({ type: UI_MONSTER_PROFILES_OPEN, payload: { source } });
export const uiMonsterProfilesClose = () => ({ type: UI_MONSTER_PROFILES_CLOSE });
export const uiMonsterProfileOpen = (monsterId) => ({ type: UI_MONSTER_PROFILE_OPEN, payload: { monsterId } });
export const uiMonsterProfileClose = () => ({ type: UI_MONSTER_PROFILE_CLOSE });
// Splash
export const uiSplashHide = () => ({ type: UI_SPLASH_HIDE });
// Setup action creators
export const uiMonsterSelectionOpen = () => ({ type: UI_MONSTER_SELECTION_OPEN });
export const uiMonsterSelectionClose = () => ({ type: UI_MONSTER_SELECTION_CLOSE });
// Positioning action creators
export const uiPositionSet = (componentName, x, y) => ({ type: UI_POSITION_SET, payload: { componentName, x, y } });
export const uiPositionsReset = () => ({ type: UI_POSITIONS_RESET });
// New modals
export const uiSettingsOpen = () => ({ type: UI_SETTINGS_OPEN });
export const uiSettingsClose = () => ({ type: UI_SETTINGS_CLOSE });
export const uiAIDecisionOpen = () => ({ type: UI_AI_DECISION_OPEN });
export const uiAIDecisionClose = () => ({ type: UI_AI_DECISION_CLOSE });
export const uiGameLogOpen = () => ({ type: UI_GAME_LOG_OPEN });
export const uiGameLogClose = () => ({ type: UI_GAME_LOG_CLOSE });
export const uiGameLogCollapseState = (partial) => ({ type: UI_GAME_LOG_COLLAPSE_STATE, payload: { partial } });
export const uiInstructionsOpen = () => ({ type: UI_INSTRUCTIONS_OPEN });
export const uiInstructionsClose = () => ({ type: UI_INSTRUCTIONS_CLOSE });
export const uiConfirmOpen = (confirmId, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel') => ({ type: UI_CONFIRM_OPEN, payload: { confirmId, message, confirmLabel, cancelLabel } });
export const uiConfirmClose = () => ({ type: UI_CONFIRM_CLOSE });
export const uiAboutOpen = () => ({ type: UI_ABOUT_OPEN });
export const uiAboutClose = () => ({ type: UI_ABOUT_CLOSE });
export const uiRollForFirstOpen = () => ({ type: UI_ROLL_FOR_FIRST_OPEN });
export const uiRollForFirstClose = () => ({ type: UI_ROLL_FOR_FIRST_CLOSE });
export const uiRollForFirstResolved = () => ({ type: UI_ROLL_FOR_FIRST_RESOLVED });
// Peek + attack visual creators
export const uiPeekShow = (card) => ({ type: UI_PEEK_SHOW, payload: { card } });
export const uiPeekHide = () => ({ type: UI_PEEK_HIDE });
export const uiAttackPulse = (playerIds, ts = Date.now()) => ({ type: UI_ATTACK_PULSE, payload: { playerIds, ts } });
// Yield prompt actions
export const yieldPromptShown = (defenderId, attackerId, slot, expiresAt) => ({ type: YIELD_PROMPT_SHOWN, payload: { defenderId, attackerId, slot, expiresAt } });
export const yieldPromptDecided = (defenderId, attackerId, slot, decision) => ({ type: YIELD_PROMPT_DECIDED, payload: { defenderId, attackerId, slot, decision } });
// Settings actions
export const settingsLoaded = (settings) => ({ type: SETTINGS_LOADED, payload: { settings } });
export const settingsUpdated = (partial) => ({ type: SETTINGS_UPDATED, payload: { partial } });
// Target selection actions
export const targetSelectionStarted = (requestId, effect, min, max, eligibleIds) => ({ type: TARGET_SELECTION_STARTED, payload: { requestId, effect, min, max, eligibleIds } });
export const targetSelectionUpdated = (requestId, selectedIds) => ({ type: TARGET_SELECTION_UPDATED, payload: { requestId, selectedIds } });
export const targetSelectionConfirmed = (requestId, selectedIds) => ({ type: TARGET_SELECTION_CONFIRMED, payload: { requestId, selectedIds } });
export const targetSelectionCancelled = (requestId) => ({ type: TARGET_SELECTION_CANCELLED, payload: { requestId } });
