/** core/selectors.js */
export const selectPlayersState = (state) => state.players;
export const selectPlayerById = (state, id) => state.players.byId[id];
export const selectPlayerOrder = (state) => state.players.order;
export const selectMeta = (state) => state.meta;
export const selectActivePlayerId = (state) => {
	const order = state.players.order;
	if (!order.length) return null;
	const idx = state.meta.activePlayerIndex % order.length;
	return order[idx];
};
export const selectActivePlayer = (state) => {
	const id = selectActivePlayerId(state);
	return id ? state.players.byId[id] : null;
};

export const selectWinner = (state) => {
	// Win by reaching 20 VP or last alive monster
	const alive = state.players.order.map(id => state.players.byId[id]).filter(p => p.status.alive);
	if (alive.length === 1) return alive[0];
	const vp20 = alive.find(p => p.victoryPoints >= 20);
	return vp20 || null;
};

export const selectDiceState = (state) => state.dice;
export const selectDiceFaces = (state) => state.dice.faces;
export const selectKeptDice = (state) => state.dice.faces.filter(f => f.kept);

// Cards
export const selectCardsState = (state) => state.cards;
export const selectShopCards = (state) => state.cards.shop;
export const selectDeckCount = (state) => state.cards.deck.length;
export const selectDiscardCount = (state) => state.cards.discard.length;
export const selectPlayerCards = (state, playerId) => state.players.byId[playerId]?.cards || [];
// UI
export const selectUICardDetail = (state) => state.ui.cardDetail;
export const selectUIPlayerCards = (state) => state.ui.playerCards;
export const selectUIMonsterProfiles = (state) => state.ui.monsterProfiles;
export const selectUISingleMonster = (state) => state.ui.singleMonster;
export const selectUIPeek = (state) => state.ui.peek;
export const selectUIAttackPulse = (state) => state.ui.attackPulse;
// Monsters
export const selectMonsters = (state) => state.monsters.order.map(id => state.monsters.byId[id]);
export const selectMonsterById = (state, id) => state.monsters.byId[id];
export const selectSplashVisible = (state) => state.ui.splash.visible;

// Effect queue
export const selectEffectQueueState = (state) => state.effectQueue;
export const selectEnqueuedEffects = (state) => state.effectQueue.queue;
export const selectProcessingEffect = (state) => state.effectQueue.processing;
export const selectResolvedEffectHistory = (state) => state.effectQueue.history;
export const selectSettings = (state) => state.settings;
export const selectSetting = (key) => (state) => state.settings?.[key];
// Tokyo selectors (rewrite dual-slot)
export const selectTokyoCityOccupant = (state) => state.tokyo.city;
export const selectTokyoBayOccupant = (state) => state.tokyo.bay;
export const selectTokyoOccupants = (state) => [state.tokyo.city, state.tokyo.bay].filter(Boolean);
