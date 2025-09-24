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
    { id: 'healing-ray', name: 'Healing Ray', cost: 4, type: 'discard', effect: { kind: 'heal_all', value: 1 } },
    // Peek card: allows player to pay 1 energy (configurable) to view the next top card of the deck.
    { id: 'clairvoyance', name: 'Clairvoyance', cost: 2, type: 'keep', effect: { kind: 'peek', value: 1 } },
    { id: 'adrenaline', name: 'Adrenaline Surge', cost: 4, type: 'discard', effect: { kind: 'heal_self', value: 2 } },
    { id: 'power-siphon', name: 'Power Siphon', cost: 5, type: 'discard', effect: { kind: 'energy_steal', value: 2 } },
    { id: 'fame-heist', name: 'Fame Heist', cost: 6, type: 'discard', effect: { kind: 'vp_steal', value: 1 } },
    { id: 'seismic-blast', name: 'Seismic Blast', cost: 5, type: 'discard', effect: { kind: 'damage_all', value: 2 } },
    { id: 'focused-beam', name: 'Focused Beam', cost: 3, type: 'discard', effect: { kind: 'damage_tokyo_only', value: 2 } }
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
