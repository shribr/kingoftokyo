import { MONSTERS_LOADED } from '../actions.js';

const initial = { byId: {}, order: [] };

export function monstersReducer(state = initial, action) {
  switch (action.type) {
    case MONSTERS_LOADED: {
      const map = {}; const order = [];
      for (const m of action.payload.monsters) { map[m.id] = m; order.push(m.id); }
      return { byId: map, order };
    }
    default:
      return state;
  }
}
