/** card-insights.js
 * Extended metadata & strategic guidance for power cards.
 * Structure: keyed by card id.
 * Each entry may include:
 *  - longDescription: Rich rules-level explanation / clarifications
 *  - strategy: Core strategic principles / when to buy
 *  - synergies: Array of { with: cardId, reason }
 *  - examples: Array of illustrative plays
 *  - tags: thematic tags (economy, defense, aggression, dice, sustain, tempo, tokyo)
 */
export const cardInsights = {
  'extra-head': {
    longDescription: 'Gives you +1 die permanently (while you own it). More dice exponentially increase the probability of forming triples and targeted symbol sets. The benefit compounds with any other dice control or reroll effects.',
    strategy: 'Buy early to maximize the number of added rolls across the game. Prioritize if pursuing combo VP (1-2-3 sets) or symbol-dependent builds. Less valuable very late unless denying an opponent.',
    synergies: [
      { with: 'giant-brain', reason: 'More dice + extra reroll = high precision symbol sculpting.' },
      { with: 'made-in-a-lab', reason: 'Improves odds of 1-2-3 sequences for additional VP gains.' },
      { with: 'plot-twist', reason: 'Dice manipulation gets stronger as dice count rises.' }
    ],
    examples: [
      'Roll: 1,1,2,3,⚡,❤ then extra die shows 1 → secure triple 1 chain earlier.',
      'Late turn pivot: need hearts while outside Tokyo; extra die widens heart probabilities.'
    ],
    tags: ['dice','economy','scaling']
  },
  'nuclear-power-plant': {
    longDescription: 'Immediate energy surge (⚡ +2) plus conditional +1 VP if you roll at least 3 damage (claw) symbols in a single roll. Encourages aggressive symbol focus.',
    strategy: 'Useful mid-game to accelerate into expensive purchases while rewarding an aggression pivot. Less valuable if you rarely chase claw-heavy rolls.',
    synergies: [
      { with: 'fire-breathing', reason: 'Area damage strategy benefits from frequent claw rolls.' },
      { with: 'parasitic-tentacles', reason: 'Extra claws facilitate stealing cards while fueling VP bonus attempts.' }
    ],
    examples: [
      'Keep two early claws then reroll remaining dice fishing for third to trigger VP bonus.',
      'Use energy burst to immediately buy follow-up aggression card (e.g., Fire Breathing).'
    ],
    tags: ['aggression','economy','tempo']
  },
  'friend-of-children': {
    longDescription: 'Each heart (❤) you roll gives you +1 energy instead of healing if you are at full health (or in addition if healing allowed variant). Primarily converts survival rolls into economy.',
    strategy: 'Best while healthy and outside Tokyo early-mid game to bankroll future scaling cards. Drops in value if you often need actual healing.',
    synergies: [
      { with: 'rapid-healing', reason: 'Use energy engine to afford frequent heals later.' },
      { with: 'extra-head', reason: 'More dice → more chances for hearts → more energy.' }
    ],
    examples: [
      'At 10 HP: roll 2 hearts → convert to 2⚡ instead of wasted overheal.',
      'Pair with Extra Head to pivot into expensive control cards next turns.'
    ],
    tags: ['economy','sustain']
  },
  'jets': {
    longDescription: 'When attacked you may spend energy (or trigger effect per rule variant) to avoid damage and optionally leave Tokyo. Enables selective occupation and survival flexibility.',
    strategy: 'Ideal for controlling Tokyo tenure: stay for VP when safe; bail instantly when pressure spikes. High value if table damage density is high.',
    synergies: [
      { with: 'urbavore', reason: 'Stay longer in Tokyo to farm extra VP from territory control.' },
      { with: 'background-dweller', reason: 'Safer Tokyo entries knowing you can exit reactively.' }
    ],
    examples: [
      'Hold Tokyo at 6 HP; opponent sets up big damage roll → activate Jets to exit and avoid lethal.',
      'Re-enter next turn for +2 VP cycle while mitigating attrition.'
    ],
    tags: ['defense','tokyo','tempo']
  }
};

/** Generate fallback heuristic insight if not explicitly defined. */
export function generateHeuristicInsight(card) {
  const tags = [];
  const txt = (card.text || card.description || '').toLowerCase();
  if (/energy|gain \d+ energy|⚡/.test(txt)) tags.push('economy');
  if (/victory|vp|★/.test(txt)) tags.push('vp');
  if (/heal|heart|❤/.test(txt)) tags.push('sustain');
  if (/damage|claw|attack/.test(txt)) tags.push('aggression');
  if (/die|dice|reroll/.test(txt)) tags.push('dice');
  if (/tokyo/.test(txt)) tags.push('tokyo');
  return {
    longDescription: card.text || card.description || 'No additional info.',
    strategy: 'Evaluate timing: buy when its effect aligns with your immediate plan (heuristic generated).',
    synergies: [],
    examples: [],
    tags
  };
}

export function getCardInsight(card) {
  return cardInsights[card.id] || generateHeuristicInsight(card);
}
