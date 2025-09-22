/** core/selectors.js */
export const selectPlayersState = (state) => state.players;
export const selectPlayerById = (state, id) => state.players.byId[id];
export const selectPlayerOrder = (state) => state.players.order;

export const selectDiceState = (state) => state.dice;
export const selectDiceFaces = (state) => state.dice.faces;
export const selectKeptDice = (state) => state.dice.faces.filter(f => f.kept);
