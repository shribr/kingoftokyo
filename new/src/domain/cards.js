/** domain/cards.js
 * Minimal card catalog & deck utilities (Phase 5 skeleton).
 */

export function buildBaseCatalog() {
  // Placeholder minimal subset; real game has many more.
  return [
    { id: 'extra-head', name: 'Extra Head', cost: 7, type: 'keep', effect: { kind: 'dice_slot', value: 1 }, description: '+1 die slot (roll an extra die each turn).' },
    { id: 'evacuation-orders', name: 'Evacuation Orders', cost: 7, type: 'discard', effect: { kind: 'vp_gain', value: 5 }, description: 'Gain 5 Victory Points.' },
    { id: 'nitrous-oxide', name: 'Nitrous Oxide', cost: 3, type: 'keep', effect: { kind: 'reroll_bonus', value: 1 }, description: 'You gain +1 reroll each turn.' },
    { id: 'energy-hoarder', name: 'Energy Hoarder', cost: 3, type: 'discard', effect: { kind: 'energy_gain', value: 3 }, description: 'Gain 3 Energy.' },
    { id: 'healing-ray', name: 'Healing Ray', cost: 4, type: 'discard', effect: { kind: 'heal_all', value: 1 }, description: 'All monsters (including you) heal 1.' },
    { id: 'clairvoyance', name: 'Clairvoyance', cost: 2, type: 'keep', effect: { kind: 'peek', value: 1 }, description: 'You may pay 1 Energy to peek at the top card of the deck.' },
    { id: 'adrenaline', name: 'Adrenaline Surge', cost: 4, type: 'discard', effect: { kind: 'heal_self', value: 2 }, description: 'Heal 2 Health.' },
    { id: 'power-siphon', name: 'Power Siphon', cost: 5, type: 'discard', effect: { kind: 'energy_steal', value: 2 }, description: 'Steal 2 Energy from another monster.' },
    { id: 'fame-heist', name: 'Fame Heist', cost: 6, type: 'discard', effect: { kind: 'vp_steal', value: 1 }, description: 'Steal 1 Victory Point (targeted).' },
    { id: 'seismic-blast', name: 'Seismic Blast', cost: 5, type: 'discard', effect: { kind: 'damage_all', value: 2 }, description: 'Deal 2 damage to all other monsters.' },
    { id: 'focused-beam', name: 'Focused Beam', cost: 3, type: 'discard', effect: { kind: 'damage_tokyo_only', value: 2 }, description: 'Deal 2 damage to each monster in Tokyo.' },
    { id: 'surgical-strike', name: 'Surgical Strike', cost: 4, type: 'discard', effect: { kind: 'damage_select', value: 1, maxTargets: 2 }, description: 'Deal 1 damage to up to 2 different monsters.' }
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
