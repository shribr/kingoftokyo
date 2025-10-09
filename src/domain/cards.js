/** domain/cards.js
 * Minimal card catalog & deck utilities (Phase 5 skeleton).
 */

export function buildBaseCatalog() {
  // SVG icons for arrows and special effects
  const arrowUpSVG = `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 1L9 7H1z"/></svg>`;
  const arrowDownSVG = `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 9L1 3H9z"/></svg>`;
  const refreshSVG = `<svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><path d="M10 6a4 4 0 11-1.17-2.83L8 4h3V1l-1.17 1.17A5 5 0 1011 6h-1z"/></svg>`;
  const rocketSVG = `<svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l2 4 4 2-3 3-2-1-1-2-3 3 1 2-2 1L0 9l1-2 2 1 3-3-2-1-1-2z"/></svg>`;
  const growthSVG = `<svg width="12" height="10" viewBox="0 0 14 10" fill="currentColor"><circle cx="2" cy="8" r="1.5"/><circle cx="7" cy="6" r="2"/><circle cx="12" cy="4" r="2.5"/></svg>`;
  const familySVG = `<svg width="14" height="10" viewBox="0 0 16 12" fill="currentColor"><circle cx="8" cy="1.5" r="1.3"/><path d="M8 3.2c-.6 0-1 .3-1.2.8L6 6.5v5h1V8h2v3.5h1V6.5L9.2 4c-.2-.5-.6-.8-1.2-.8z"/><circle cx="3" cy="2.5" r="1"/><path d="M3 3.8c-.4 0-.8.2-1 .6l-.5 1.8v3.3h.8V7.3h1.4v2.2h.8V6.2L3.9 4.4c-.1-.4-.5-.6-.9-.6z"/><circle cx="13" cy="2.5" r="1"/><path d="M13 3.8c-.4 0-.8.2-1 .6l-.6 1.8v3.3h.8V7.3h1.6v2.2h.8V6.2l-.6-1.8c-.2-.4-.6-.6-1-.6z"/></svg>`;
  
  // Complete King of Tokyo power cards catalog with emoji icons
  return [
    // Base Game Cards
    { id: 'acid-attack', name: 'Acid Attack', cost: 6, type: 'discard', effect: { kind: 'damage_all', value: 1 }, description: 'Deal 1 extra damage to all other monsters.', emoji: '💥' },
    { id: 'alien-metabolism', name: 'Alien Metabolism', cost: 3, type: 'keep', effect: { kind: 'cheaper_cards', value: 1 }, description: 'Buying cards costs 1 less energy (minimum 1).', emoji: '🍊' },
    { id: 'armor-plating', name: 'Armor Plating', cost: 4, type: 'keep', effect: { kind: 'armor', value: 2 }, description: 'Ignore damage on a roll of 1-2.', emoji: '🛡️' },
    { id: 'background-dweller', name: 'Background Dweller', cost: 4, type: 'keep', effect: { kind: 'stay_tokyo', value: 1 }, description: 'You can always stay in Tokyo when taking damage.', emoji: '🏯' },
    { id: 'camouflage', name: 'Camouflage', cost: 3, type: 'keep', effect: { kind: 'untargetable', value: 1 }, description: 'You cannot be targeted by other monsters.', emoji: '👻', lightEmoji: true },
    { id: 'complete-destruction', name: 'Complete Destruction', cost: 5, type: 'discard', effect: { kind: 'vp_gain', value: 3 }, description: 'Gain 3 Victory Points.', emoji: '💥' },
    { id: 'corner-store', name: 'Corner Store', cost: 3, type: 'keep', effect: { kind: 'buy_phase_energy', value: 1 }, description: 'Gain 1 Energy at the start of your Buy phase.', emoji: '💰' },
    { id: 'dedicated-news-team', name: 'Dedicated News Team', cost: 3, type: 'keep', effect: { kind: 'tokyo_bonus_vp', value: 1 }, description: 'Gain 1 extra Victory Point when gaining points from Tokyo.', emoji: '🏆' },
    { id: 'energize', name: 'Energize', cost: 2, type: 'discard', effect: { kind: 'energy_gain', value: 9 }, description: 'Gain 9 Energy.', emoji: '⚡' },
    { id: 'energy-hoarder', name: 'Energy Hoarder', cost: 3, type: 'discard', effect: { kind: 'energy_gain', value: 3 }, description: 'Gain 3 Energy.', emoji: '⚡' },
    { id: 'even-bigger', name: 'Even Bigger', cost: 4, type: 'keep', effect: { kind: 'health_bonus', value: 2 }, description: 'Gain 2 extra Health (maximum 12).', emoji: growthSVG, lightEmoji: true },
    { id: 'evacuation-orders', name: 'Evacuation Orders', cost: 7, type: 'discard', effect: { kind: 'vp_gain', value: 5 }, description: 'Gain 5 Victory Points.', emoji: '💥' },
    { id: 'extra-head', name: 'Extra Head', cost: 7, type: 'keep', effect: { kind: 'dice_slot', value: 1 }, description: 'Roll an extra die each turn.', emoji: '🎲' },
    { id: 'fire-breathing', name: 'Fire Breathing', cost: 3, type: 'keep', effect: { kind: 'attack_bonus', value: 1 }, description: 'Deal 1 extra damage when you attack.', emoji: '🔥' },
    { id: 'friend-of-children', name: 'Friend of Children', cost: 4, type: 'keep', effect: { kind: 'heart_energy', value: 1 }, description: 'Gain 1 Energy for each Heart you roll.', emoji: familySVG, lightEmoji: true },
    { id: 'gas-refinery', name: 'Gas Refinery', cost: 6, type: 'keep', effect: { kind: 'turn_start_energy', value: 2 }, description: 'Gain 2 Energy at the start of your turn.', emoji: '⚡' },
    { id: 'giant-brain', name: 'Giant Brain', cost: 5, type: 'keep', effect: { kind: 'card_limit', value: 2 }, description: 'You may have 2 extra cards in hand.', emoji: '🧠' },
    { id: 'healing-ray', name: 'Healing Ray', cost: 4, type: 'discard', effect: { kind: 'heal_all', value: 1 }, description: 'All monsters heal 1 Health.', emoji: '💚' },
    { id: 'herbivore', name: 'Herbivore', cost: 3, type: 'keep', effect: { kind: 'three_hearts_bonus', value: 2 }, description: 'Gain 2 extra Energy when you roll 3 or more Hearts.', emoji: '🥦' },
    { id: 'it-has-a-child', name: 'It Has A Child', cost: 2, type: 'discard', effect: { kind: 'draw_cards', value: 1 }, description: 'Draw 1 extra Power card this turn.', emoji: '🍼', lightEmoji: true },
    { id: 'jets', name: 'Jets', cost: 5, type: 'keep', effect: { kind: 'leave_tokyo_attack', value: 1 }, description: 'You may leave Tokyo after attacking.', emoji: rocketSVG, lightEmoji: true },
    { id: 'made-in-a-lab', name: 'Made in a Lab', cost: 2, type: 'keep', effect: { kind: 'science_bonus', value: 1 }, description: 'Gain 2 Victory Points for each set of 1-2-3 you roll.', emoji: '🔬' },
    { id: 'metamorphosis', name: 'Metamorphosis', cost: 6, type: 'discard', effect: { kind: 'full_heal', value: 1 }, description: 'Heal to full Health.', emoji: '💖' },
    { id: 'national-guard', name: 'National Guard', cost: 2, type: 'discard', effect: { kind: 'damage_tokyo_only', value: 2 }, description: 'Deal 2 damage to monsters in Tokyo.', emoji: '🎯' },
    { id: 'nuclear-power-plant', name: 'Nuclear Power Plant', cost: 6, type: 'keep', effect: { kind: 'skull_energy', value: 1 }, description: 'Gain 1 Energy for each Skull you roll.', emoji: '☠️', lightEmoji: true },
    { id: 'parasitic-tentacles', name: 'Parasitic Tentacles', cost: 2, type: 'keep', effect: { kind: 'steal_energy_attack', value: 1 }, description: 'Steal 1 Energy from each monster you damage.', emoji: '⚡' },
    { id: 'plot-twist', name: 'Plot Twist', cost: 3, type: 'discard', effect: { kind: 'change_dice', value: 1 }, description: 'Change one die to any face.', emoji: refreshSVG, lightEmoji: true },
    { id: 'psychic-probe', name: 'Psychic Probe', cost: 2, type: 'keep', effect: { kind: 'force_reroll', value: 1 }, description: 'Force other monsters to reroll specific dice.', emoji: refreshSVG, lightEmoji: true },
    { id: 'rapid-healing', name: 'Rapid Healing', cost: 3, type: 'keep', effect: { kind: 'heal_energy', value: 1 }, description: 'Gain 1 Health when you gain Energy.', emoji: '💚' },
    { id: 'regeneration', name: 'Regeneration', cost: 4, type: 'keep', effect: { kind: 'heal_turn_start', value: 1 }, description: 'Heal 1 Health at the start of your turn.', emoji: '❤️' },
    { id: 'rooting-for-the-underdog', name: 'Rooting for the Underdog', cost: 3, type: 'keep', effect: { kind: 'low_health_bonus', value: 1 }, description: 'Gain 1 Energy for each Health you are missing.', emoji: '🙏', lightEmoji: true },
    { id: 'shrink-ray', name: 'Shrink Ray', cost: 2, type: 'discard', effect: { kind: 'reduce_dice', value: 1 }, description: 'Target monster rolls 1 fewer die this turn.', emoji: '🔫' },
    { id: 'skyscraper', name: 'Skyscraper', cost: 6, type: 'keep', effect: { kind: 'tokyo_immunity', value: 1 }, description: 'You cannot be forced to leave Tokyo.', emoji: '🗼' },
    { id: 'solar-powered', name: 'Solar Powered', cost: 4, type: 'keep', effect: { kind: 'outside_tokyo_energy', value: 1 }, description: 'Gain 1 Energy when not in Tokyo at turn start.', emoji: '🌙', lightEmoji: true },
    { id: 'stretch-goals', name: 'Stretch Goals', cost: 3, type: 'keep', effect: { kind: 'vp_energy_bonus', value: 1 }, description: 'Gain 1 Energy when you gain Victory Points.', emoji: '✨', lightEmoji: true },
    { id: 'telling-everyone', name: 'Telling Everyone', cost: 2, type: 'discard', effect: { kind: 'all_gain_energy', value: 1 }, description: 'All monsters gain 1 Energy.', emoji: '📢' },
    { id: 'urbavore', name: 'Urbavore', cost: 4, type: 'keep', effect: { kind: 'building_bonus', value: 1 }, description: 'Gain 1 Victory Point for each Building you destroy.', emoji: '🏢' },
    { id: 'we-re-only-making-it-stronger', name: "We're Only Making It Stronger", cost: 5, type: 'keep', effect: { kind: 'damage_energy', value: 1 }, description: 'Gain 1 Energy each time you take damage.', emoji: '⚡' },
    
    // Dark Edition Cards
    { id: 'dark-smoke-stack', name: 'Smoke Stack', cost: 4, type: 'keep', darkEdition: true, effect: { kind: 'wickedness_energy', value: 1 }, description: 'Gain 1 Energy for each Wickedness you have.', emoji: '😈' },
    { id: 'dark-twisted-mind', name: 'Twisted Mind', cost: 3, type: 'keep', darkEdition: true, effect: { kind: 'curse_immunity', value: 1 }, description: 'You are immune to Curses.', emoji: '🧿' },
    { id: 'dark-corruption', name: 'Corruption', cost: 5, type: 'discard', darkEdition: true, effect: { kind: 'spread_curse', value: 1 }, description: 'Give a Curse to each other monster.', emoji: '☠️', lightEmoji: true },
    { id: 'dark-sinister-plot', name: 'Sinister Plot', cost: 4, type: 'keep', darkEdition: true, effect: { kind: 'wickedness_vp', value: 1 }, description: 'Gain 1 Victory Point for each 3 Wickedness you have.', emoji: '😈' },
    { id: 'dark-feeding-frenzy', name: 'Feeding Frenzy', cost: 6, type: 'keep', darkEdition: true, effect: { kind: 'eliminate_heal', value: 3 }, description: 'Heal 3 Health when you eliminate another monster.', emoji: '🧛' },
    { id: 'dark-ancient-curse', name: 'Ancient Curse', cost: 3, type: 'discard', darkEdition: true, effect: { kind: 'curse_all', value: 1 }, description: 'All other monsters gain 1 Curse.', emoji: '🌑' },
    
    // Additional utility cards
    { id: 'clairvoyance', name: 'Clairvoyance', cost: 2, type: 'keep', effect: { kind: 'peek', value: 1 }, description: 'Pay 1 Energy to peek at the top card of the deck.', emoji: '👁️', lightEmoji: true },
    { id: 'adrenaline', name: 'Adrenaline Surge', cost: 4, type: 'discard', effect: { kind: 'heal_self', value: 2 }, description: 'Heal 2 Health.', emoji: '❤️' },
    { id: 'power-siphon', name: 'Power Siphon', cost: 5, type: 'discard', effect: { kind: 'energy_steal', value: 2 }, description: 'Steal 2 Energy from another monster.', emoji: '🔋' },
    { id: 'fame-heist', name: 'Fame Heist', cost: 6, type: 'discard', effect: { kind: 'vp_steal', value: 1 }, description: 'Steal 1 Victory Point (targeted).', emoji: '💎' },
    { id: 'seismic-blast', name: 'Seismic Blast', cost: 5, type: 'discard', effect: { kind: 'damage_all', value: 2 }, description: 'Deal 2 damage to all other monsters.', emoji: '💥' },
    { id: 'focused-beam', name: 'Focused Beam', cost: 3, type: 'discard', effect: { kind: 'damage_tokyo_only', value: 2 }, description: 'Deal 2 damage to each monster in Tokyo.', emoji: '🎯' },
    { id: 'surgical-strike', name: 'Surgical Strike', cost: 4, type: 'discard', effect: { kind: 'damage_select', value: 1, maxTargets: 2 }, description: 'Deal 1 damage to up to 2 different monsters.', emoji: '⚔️' }
  ];
}

export function shuffle(array, rng = Math.random) {
  const a = array.slice();
  // Use Fisher-Yates shuffle with better randomization
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDeck(catalog, rng = Math.random) {
  // Create deck with proper duplicates based on official specification
  const deck = [];
  
  catalog.forEach(card => {
    // According to official FAQ: only 2 cards are in double (Extra Head and Evacuation Orders)
    if (card.id === 'extra-head' || card.id === 'evacuation-orders') {
      deck.push(card, { ...card }); // Add two copies
    } else {
      deck.push(card); // Single copy for all other cards
    }
  });
  
  // Use enhanced shuffling with multiple passes for better randomization
  let shuffled = shuffle(deck, rng);
  // Additional shuffle passes to ensure better distribution
  for (let pass = 0; pass < 3; pass++) {
    shuffled = shuffle(shuffled, rng);
  }
  
  return shuffled;
}

export function draw(deck, count = 1) {
  const drawn = deck.slice(0, count);
  return { drawn, rest: deck.slice(count) };
}
