/** domain/cards.js
 * Minimal card catalog & deck utilities (Phase 5 skeleton).
 */

export function buildBaseCatalog() {
  // Complete King of Tokyo power cards catalog with dark edition markings
  return [
    // Base Game Cards
    { id: 'acid-attack', name: 'Acid Attack', cost: 6, type: 'discard', effect: { kind: 'damage_all', value: 1 }, description: 'Deal 1 extra damage to all other monsters.' },
    { id: 'alien-metabolism', name: 'Alien Metabolism', cost: 3, type: 'keep', effect: { kind: 'cheaper_cards', value: 1 }, description: 'Buying cards costs 1 less energy (minimum 1).' },
    { id: 'armor-plating', name: 'Armor Plating', cost: 4, type: 'keep', effect: { kind: 'armor', value: 2 }, description: 'Ignore damage on a roll of 1-2.' },
    { id: 'background-dweller', name: 'Background Dweller', cost: 4, type: 'keep', effect: { kind: 'stay_tokyo', value: 1 }, description: 'You can always stay in Tokyo when taking damage.' },
    { id: 'camouflage', name: 'Camouflage', cost: 3, type: 'keep', effect: { kind: 'untargetable', value: 1 }, description: 'You cannot be targeted by other monsters.' },
    { id: 'complete-destruction', name: 'Complete Destruction', cost: 5, type: 'discard', effect: { kind: 'vp_gain', value: 3 }, description: 'Gain 3 Victory Points.' },
    { id: 'corner-store', name: 'Corner Store', cost: 3, type: 'keep', effect: { kind: 'buy_phase_energy', value: 1 }, description: 'Gain 1 Energy at the start of your Buy phase.' },
    { id: 'dedicated-news-team', name: 'Dedicated News Team', cost: 3, type: 'keep', effect: { kind: 'tokyo_bonus_vp', value: 1 }, description: 'Gain 1 extra Victory Point when gaining points from Tokyo.' },
    { id: 'energize', name: 'Energize', cost: 2, type: 'discard', effect: { kind: 'energy_gain', value: 9 }, description: 'Gain 9 Energy.' },
    { id: 'energy-hoarder', name: 'Energy Hoarder', cost: 3, type: 'discard', effect: { kind: 'energy_gain', value: 3 }, description: 'Gain 3 Energy.' },
    { id: 'even-bigger', name: 'Even Bigger', cost: 4, type: 'keep', effect: { kind: 'health_bonus', value: 2 }, description: 'Gain 2 extra Health (maximum 12).' },
    { id: 'evacuation-orders', name: 'Evacuation Orders', cost: 7, type: 'discard', effect: { kind: 'vp_gain', value: 5 }, description: 'Gain 5 Victory Points.' },
    { id: 'extra-head', name: 'Extra Head', cost: 7, type: 'keep', effect: { kind: 'dice_slot', value: 1 }, description: 'Roll an extra die each turn.' },
    { id: 'fire-breathing', name: 'Fire Breathing', cost: 3, type: 'keep', effect: { kind: 'attack_bonus', value: 1 }, description: 'Deal 1 extra damage when you attack.' },
    { id: 'friend-of-children', name: 'Friend of Children', cost: 4, type: 'keep', effect: { kind: 'heart_energy', value: 1 }, description: 'Gain 1 Energy for each Heart you roll.' },
    { id: 'gas-refinery', name: 'Gas Refinery', cost: 6, type: 'keep', effect: { kind: 'turn_start_energy', value: 2 }, description: 'Gain 2 Energy at the start of your turn.' },
    { id: 'giant-brain', name: 'Giant Brain', cost: 5, type: 'keep', effect: { kind: 'card_limit', value: 2 }, description: 'You may have 2 extra cards in hand.' },
    { id: 'healing-ray', name: 'Healing Ray', cost: 4, type: 'discard', effect: { kind: 'heal_all', value: 1 }, description: 'All monsters heal 1 Health.' },
    { id: 'herbivore', name: 'Herbivore', cost: 3, type: 'keep', effect: { kind: 'three_hearts_bonus', value: 2 }, description: 'Gain 2 extra Energy when you roll 3 or more Hearts.' },
    { id: 'it-has-a-child', name: 'It Has A Child', cost: 2, type: 'discard', effect: { kind: 'draw_cards', value: 1 }, description: 'Draw 1 extra Power card this turn.' },
    { id: 'jets', name: 'Jets', cost: 5, type: 'keep', effect: { kind: 'leave_tokyo_attack', value: 1 }, description: 'You may leave Tokyo after attacking.' },
    { id: 'made-in-a-lab', name: 'Made in a Lab', cost: 2, type: 'keep', effect: { kind: 'science_bonus', value: 1 }, description: 'Gain 2 Victory Points for each set of 1-2-3 you roll.' },
    { id: 'metamorphosis', name: 'Metamorphosis', cost: 6, type: 'discard', effect: { kind: 'full_heal', value: 1 }, description: 'Heal to full Health.' },
    { id: 'national-guard', name: 'National Guard', cost: 2, type: 'discard', effect: { kind: 'damage_tokyo_only', value: 2 }, description: 'Deal 2 damage to monsters in Tokyo.' },
    { id: 'nuclear-power-plant', name: 'Nuclear Power Plant', cost: 6, type: 'keep', effect: { kind: 'skull_energy', value: 1 }, description: 'Gain 1 Energy for each Skull you roll.' },
    { id: 'parasitic-tentacles', name: 'Parasitic Tentacles', cost: 2, type: 'keep', effect: { kind: 'steal_energy_attack', value: 1 }, description: 'Steal 1 Energy from each monster you damage.' },
    { id: 'plot-twist', name: 'Plot Twist', cost: 3, type: 'discard', effect: { kind: 'change_dice', value: 1 }, description: 'Change one die to any face.' },
    { id: 'psychic-probe', name: 'Psychic Probe', cost: 2, type: 'keep', effect: { kind: 'force_reroll', value: 1 }, description: 'Force other monsters to reroll specific dice.' },
    { id: 'rapid-healing', name: 'Rapid Healing', cost: 3, type: 'keep', effect: { kind: 'heal_energy', value: 1 }, description: 'Gain 1 Health when you gain Energy.' },
    { id: 'regeneration', name: 'Regeneration', cost: 4, type: 'keep', effect: { kind: 'heal_turn_start', value: 1 }, description: 'Heal 1 Health at the start of your turn.' },
    { id: 'rooting-for-the-underdog', name: 'Rooting for the Underdog', cost: 3, type: 'keep', effect: { kind: 'low_health_bonus', value: 1 }, description: 'Gain 1 Energy for each Health you are missing.' },
    { id: 'shrink-ray', name: 'Shrink Ray', cost: 2, type: 'discard', effect: { kind: 'reduce_dice', value: 1 }, description: 'Target monster rolls 1 fewer die this turn.' },
    { id: 'skyscraper', name: 'Skyscraper', cost: 6, type: 'keep', effect: { kind: 'tokyo_immunity', value: 1 }, description: 'You cannot be forced to leave Tokyo.' },
    { id: 'solar-powered', name: 'Solar Powered', cost: 4, type: 'keep', effect: { kind: 'outside_tokyo_energy', value: 1 }, description: 'Gain 1 Energy when not in Tokyo at turn start.' },
    { id: 'stretch-goals', name: 'Stretch Goals', cost: 3, type: 'keep', effect: { kind: 'vp_energy_bonus', value: 1 }, description: 'Gain 1 Energy when you gain Victory Points.' },
    { id: 'telling-everyone', name: 'Telling Everyone', cost: 2, type: 'discard', effect: { kind: 'all_gain_energy', value: 1 }, description: 'All monsters gain 1 Energy.' },
    { id: 'urbavore', name: 'Urbavore', cost: 4, type: 'keep', effect: { kind: 'building_bonus', value: 1 }, description: 'Gain 1 Victory Point for each Building you destroy.' },
    { id: 'we-re-only-making-it-stronger', name: "We're Only Making It Stronger", cost: 5, type: 'keep', effect: { kind: 'damage_energy', value: 1 }, description: 'Gain 1 Energy each time you take damage.' },
    
    // Dark Edition Cards
    { id: 'dark-smoke-stack', name: 'Smoke Stack', cost: 4, type: 'keep', darkEdition: true, effect: { kind: 'wickedness_energy', value: 1 }, description: 'Gain 1 Energy for each Wickedness you have.' },
    { id: 'dark-twisted-mind', name: 'Twisted Mind', cost: 3, type: 'keep', darkEdition: true, effect: { kind: 'curse_immunity', value: 1 }, description: 'You are immune to Curses.' },
    { id: 'dark-corruption', name: 'Corruption', cost: 5, type: 'discard', darkEdition: true, effect: { kind: 'spread_curse', value: 1 }, description: 'Give a Curse to each other monster.' },
    { id: 'dark-sinister-plot', name: 'Sinister Plot', cost: 4, type: 'keep', darkEdition: true, effect: { kind: 'wickedness_vp', value: 1 }, description: 'Gain 1 Victory Point for each 3 Wickedness you have.' },
    { id: 'dark-feeding-frenzy', name: 'Feeding Frenzy', cost: 6, type: 'keep', darkEdition: true, effect: { kind: 'eliminate_heal', value: 3 }, description: 'Heal 3 Health when you eliminate another monster.' },
    { id: 'dark-ancient-curse', name: 'Ancient Curse', cost: 3, type: 'discard', darkEdition: true, effect: { kind: 'curse_all', value: 1 }, description: 'All other monsters gain 1 Curse.' },
    
    // Additional utility cards
    { id: 'clairvoyance', name: 'Clairvoyance', cost: 2, type: 'keep', effect: { kind: 'peek', value: 1 }, description: 'Pay 1 Energy to peek at the top card of the deck.' },
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
