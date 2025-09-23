/** domain/cards.js
 * Minimal card catalog & deck utilities (Phase 5 skeleton).
 */

export function buildBaseCatalog() {
  // Placeholder minimal subset; real game has many more.
  return [
    { id: 'extra-head', name: 'Extra Head', cost: 7, type: 'keep', effect: { kind: 'dice_slot', value: 1 } },
    { id: 'evacuation-orders', name: 'Evacuation Orders', cost: 7, type: 'discard', effect: { kind: 'vp_gain', value: 5 } },
    { id: 'nitrous-oxide', name: 'Nitrous Oxide', cost: 3, type: 'keep', effect: { kind: 'reroll_bonus', value: 1 } },
    { id: 'energy-hoard', name: 'Energy Hoard', cost: 3, type: 'discard', effect: { kind: 'energy_gain', value: 3 } },
    { id: 'healing-ray', name: 'Healing Ray', cost: 4, type: 'discard', effect: { kind: 'heal_all', value: 1 } }
  ];
}

export function shuffle(array, rng = Math.random) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDeck(catalog, rng) {
  return shuffle(catalog, rng);
}

export function draw(deck, count = 1) {
  const drawn = deck.slice(0, count);
  return { drawn, rest: deck.slice(count) };
}
