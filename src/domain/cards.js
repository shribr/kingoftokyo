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
  
  // Official King of Tokyo base game power cards (from official card list)
  // Source: https://github.com/maltize/KingOfTokyo-CardList
  return [
    // Base Game Cards - Verified against official CSV
    { id: 'acid-attack', name: 'Acid Attack', cost: 6, type: 'keep', effect: { kind: 'attack_bonus', value: 1, passive: true }, description: 'Deal 1 extra damage each turn (even when you don\'t otherwise attack).', emoji: '💥' },
    { id: 'alien-metabolism', name: 'Alien Metabolism', cost: 3, type: 'keep', effect: { kind: 'cheaper_cards', value: 1 }, description: 'Buying cards costs you 1 less Energy.', emoji: '🍊' },
    { id: 'alpha-monster', name: 'Alpha Monster', cost: 5, type: 'keep', effect: { kind: 'vp_on_attack', value: 1 }, description: 'Gain 1★ when you attack.', emoji: '👑' },
    { id: 'apartment-building', name: 'Apartment Building', cost: 5, type: 'discard', effect: { kind: 'vp_gain', value: 3 }, description: '+3★', emoji: '�' },
    { id: 'armor-plating', name: 'Armor Plating', cost: 4, type: 'keep', effect: { kind: 'armor', value: 1 }, description: 'Ignore damage of 1.', emoji: '🛡️' },
    { id: 'background-dweller', name: 'Background Dweller', cost: 4, type: 'keep', effect: { kind: 'reroll_3s', value: 1 }, description: 'You can always reroll any 3 you have.', emoji: '🏯' },
    { id: 'burrowing', name: 'Burrowing', cost: 5, type: 'keep', effect: { kind: 'tokyo_attack_bonus', value: 1 }, description: 'Deal 1 extra damage on Tokyo. Deal 1 damage when yielding Tokyo to the monster taking it.', emoji: '🕳️' },
    { id: 'camouflage', name: 'Camouflage', cost: 3, type: 'keep', effect: { kind: 'heart_armor', value: 1 }, description: 'If you take damage roll a die for each damage point. On a ❤ you do not take that damage point.', emoji: '👻', lightEmoji: true },
    { id: 'commuter-train', name: 'Commuter Train', cost: 4, type: 'discard', effect: { kind: 'vp_gain', value: 2 }, description: '+2★', emoji: '🚃' },
    { id: 'complete-destruction', name: 'Complete Destruction', cost: 3, type: 'keep', effect: { kind: 'perfect_roll_bonus', value: 9 }, description: 'If you roll ①②③❤⚡☠ gain 9★ in addition to the regular results.', emoji: '💥' },
    { id: 'corner-store', name: 'Corner Store', cost: 3, type: 'discard', effect: { kind: 'vp_gain', value: 1 }, description: '+1★', emoji: '💰' },
    { id: 'dedicated-news-team', name: 'Dedicated News Team', cost: 3, type: 'keep', effect: { kind: 'vp_on_card_buy', value: 1 }, description: 'Gain 1★ whenever you buy a card.', emoji: '🏆' },
    { id: 'drop-from-high-altitude', name: 'Drop from High Altitude', cost: 5, type: 'discard', effect: { kind: 'vp_and_take_tokyo', value: 2 }, description: '+2★ and take control of Tokyo if you don\'t already control it.', emoji: '🪂' },
    { id: 'eater-of-the-dead', name: 'Eater of the Dead', cost: 4, type: 'keep', effect: { kind: 'vp_on_elimination', value: 3 }, description: 'Gain 3★ every time a monster\'s ❤ goes to 0.', emoji: '💀' },
    { id: 'energize', name: 'Energize', cost: 8, type: 'discard', effect: { kind: 'energy_gain', value: 9 }, description: '+9 Energy', emoji: '⚡' },
    { id: 'energy-hoarder', name: 'Energy Hoarder', cost: 3, type: 'keep', effect: { kind: 'energy_to_vp', value: 6 }, description: 'You gain 1★ for every 6 Energy you have at the end of your turn.', emoji: '🔋' },
    { id: 'evacuation-orders', name: 'Evacuation Orders', cost: 7, type: 'discard', effect: { kind: 'vp_steal_all', value: 5 }, description: 'All other monsters lose 5★.', emoji: '🚨' },
    { id: 'even-bigger', name: 'Even Bigger', cost: 4, type: 'keep', effect: { kind: 'health_bonus', value: 2 }, description: 'Your maximum ❤ is increased by 2. Gain 2❤ when you get this card.', emoji: growthSVG, lightEmoji: true },
    { id: 'extra-head', name: 'Extra Head', cost: 7, type: 'keep', effect: { kind: 'dice_slot', value: 1 }, description: 'You get 1 extra die.', emoji: '🎲' },
    { id: 'fire-blast', name: 'Fire Blast', cost: 3, type: 'discard', effect: { kind: 'damage_all', value: 2 }, description: 'Deal 2 damage to all other monsters.', emoji: '🔥' },
    { id: 'fire-breathing', name: 'Fire Breathing', cost: 4, type: 'keep', effect: { kind: 'neighbor_damage', value: 1 }, description: 'Your neighbors take 1 extra damage when you deal damage.', emoji: '🔥' },
    { id: 'freeze-time', name: 'Freeze Time', cost: 5, type: 'keep', effect: { kind: 'extra_turn_on_111', value: 1 }, description: 'On a turn where you score ①①①, you can take another turn with one less die.', emoji: '⏰' },
    { id: 'frenzy', name: 'Frenzy', cost: 7, type: 'discard', effect: { kind: 'extra_turn', value: 1 }, description: 'When you purchase this card take another turn immediately after this one.', emoji: '😤' },
    { id: 'friend-of-children', name: 'Friend of Children', cost: 3, type: 'keep', effect: { kind: 'energy_on_energy', value: 1 }, description: 'When you gain any Energy gain 1 extra Energy.', emoji: familySVG, lightEmoji: true },
    { id: 'gas-refinery', name: 'Gas Refinery', cost: 6, type: 'discard', effect: { kind: 'vp_and_damage', value: 2, damage: 3 }, description: '+2★ and deal 3 damage to all other monsters.', emoji: '🏭' },
    { id: 'giant-brain', name: 'Giant Brain', cost: 5, type: 'keep', effect: { kind: 'reroll_bonus', value: 1 }, description: 'You have one extra reroll each turn.', emoji: '�' },
    { id: 'gourmet', name: 'Gourmet', cost: 4, type: 'keep', effect: { kind: 'bonus_vp_on_111', value: 2 }, description: 'When scoring ①①① gain 2 extra ★.', emoji: '🍽️' },
    { id: 'heal', name: 'Heal', cost: 3, type: 'discard', effect: { kind: 'heal', value: 2 }, description: 'Heal 2 damage.', emoji: '💚' },
    { id: 'healing-ray', name: 'Healing Ray', cost: 4, type: 'keep', effect: { kind: 'heal_others', value: 1 }, description: 'You can heal other monsters with your ❤ results. They must pay you 2 Energy for each damage you heal (or their remaining Energy if they haven\'t got enough).', emoji: '💚' },
    { id: 'herbivore', name: 'Herbivore', cost: 5, type: 'keep', effect: { kind: 'vp_no_damage', value: 1 }, description: 'Gain 1★ on your turn if you don\'t damage anyone.', emoji: '🥦' },
    { id: 'herd-culler', name: 'Herd Culler', cost: 3, type: 'keep', effect: { kind: 'change_to_1', value: 1 }, description: 'You can change one of your dice to a ① each turn.', emoji: '🎯' },
    { id: 'high-altitude-bombing', name: 'High Altitude Bombing', cost: 4, type: 'discard', effect: { kind: 'damage_all_including_self', value: 3 }, description: 'All monsters (including you) take 3 damage.', emoji: '✈️', lightEmoji: true },
    { id: 'it-has-a-child', name: 'It Has a Child', cost: 7, type: 'keep', effect: { kind: 'resurrect', value: 10 }, description: 'If you are eliminated discard all your cards and lose all your ★, Heal to 10❤ and start again.', emoji: '🍼', lightEmoji: true },
    { id: 'jet-fighters', name: 'Jet Fighters', cost: 5, type: 'discard', effect: { kind: 'vp_and_take_damage', value: 5, damage: 4 }, description: '+5★ and take 4 damage', emoji: '�️', lightEmoji: true },
    { id: 'jets', name: 'Jets', cost: 5, type: 'keep', effect: { kind: 'no_yield_damage', value: 1 }, description: 'You suffer no damage when yielding Tokyo.', emoji: rocketSVG, lightEmoji: true },
    { id: 'made-in-a-lab', name: 'Made in a Lab', cost: 2, type: 'keep', effect: { kind: 'peek_and_buy_top', value: 1 }, description: 'When purchasing cards you can peek at and purchase the top card of the deck.', emoji: '🔬' },
    { id: 'metamorph', name: 'Metamorph', cost: 3, type: 'keep', effect: { kind: 'discard_for_energy', value: 1 }, description: 'At the end of your turn you can discard any keep cards you have to receive the Energy they were purchased for.', emoji: '🦎' },
    { id: 'mimic', name: 'Mimic', cost: 8, type: 'keep', effect: { kind: 'copy_card', value: 1 }, description: 'Choose a card any monster has in play and put a mimic counter on it. This card counts as a duplicate of that card as if it just had been bought. Spend 1 Energy at the start of your turn to change the power you are mimicking.', emoji: '🎭' },
    { id: 'national-guard', name: 'National Guard', cost: 3, type: 'discard', effect: { kind: 'vp_and_take_damage', value: 2, damage: 2 }, description: '+2★ and take 2 damage.', emoji: '�️', lightEmoji: true },
    { id: 'plot-twist', name: 'Plot Twist', cost: 3, type: 'keep', effect: { kind: 'change_die_discard', value: 1 }, description: 'Change one die to any result. Discard when used.', emoji: refreshSVG, lightEmoji: true },
    { id: 'poison-quills', name: 'Poison Quills', cost: 3, type: 'keep', effect: { kind: 'damage_on_222', value: 2 }, description: 'When you score ②②② also deal 2 damage.', emoji: '🦔' },
    { id: 'poison-spit', name: 'Poison Spit', cost: 4, type: 'keep', effect: { kind: 'poison_counters', value: 1 }, description: 'When you deal damage to monsters give them a poison counter. Monsters take 1 damage for each poison counter they have at the end of their turn. You can get rid of a poison counter with a ❤ (that ❤ doesn\'t heal a damage also).', emoji: '☠️', lightEmoji: true },
    { id: 'psychic-probe', name: 'Psychic Probe', cost: 3, type: 'keep', effect: { kind: 'force_reroll_discard', value: 1 }, description: 'You can reroll a die of each other monster once each turn. If the reroll is ❤ discard this card.', emoji: '🔮' },
    { id: 'rapid-healing', name: 'Rapid Healing', cost: 3, type: 'keep', effect: { kind: 'spend_energy_heal', value: 2 }, description: 'Spend 2 Energy at any time to heal 1 damage.', emoji: '💚' },
    { id: 'regeneration', name: 'Regeneration', cost: 4, type: 'keep', effect: { kind: 'heal_bonus', value: 1 }, description: 'When you heal, heal 1 extra damage.', emoji: '❤️' },
    { id: 'shrink-ray', name: 'Shrink Ray', cost: 6, type: 'keep', effect: { kind: 'shrink_counters', value: 1 }, description: 'When you deal damage to monsters give them a shrink counter. A monster rolls one less die for each shrink counter. You can get rid of a shrink counter with a ❤ (that ❤ doesn\'t heal a damage also).', emoji: '🔫' },
    { id: 'skyscraper', name: 'Skyscraper', cost: 6, type: 'discard', effect: { kind: 'vp_gain', value: 4 }, description: '+4★', emoji: '🗼' },
    { id: 'solar-powered', name: 'Solar Powered', cost: 2, type: 'keep', effect: { kind: 'energy_when_zero', value: 1 }, description: 'At the end of your turn gain 1 Energy if you have no Energy.', emoji: '🌙', lightEmoji: true },
    { id: 'stretchy', name: 'Stretchy', cost: 3, type: 'keep', effect: { kind: 'spend_energy_change_die', value: 2 }, description: 'You can spend 2 Energy to change one of your dice to any result.', emoji: '🦾' },
    { id: 'urbavore', name: 'Urbavore', cost: 4, type: 'keep', effect: { kind: 'tokyo_bonuses', value: 1 }, description: 'Gain 1 extra ★ when beginning the turn in Tokyo. Deal 1 extra damage when dealing any damage from Tokyo.', emoji: '🏢' },
    { id: 'we-re-only-making-it-stronger', name: "We're Only Making It Stronger", cost: 3, type: 'keep', effect: { kind: 'energy_on_damage', threshold: 2, value: 1 }, description: 'When you lose 2❤ or more gain 1 Energy.', emoji: '⚡' }
    
    // NOTE: Dark Edition cards will be added after verifying official card list
    // Dark Edition is a standalone version with different monsters and some different power cards
    // DO NOT add made-up Dark Edition cards - they need to be verified against official rules
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
