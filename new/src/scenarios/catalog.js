// scenarios/catalog.js
// Defines reusable scenario modifiers for quick game state setup.

export const ScenarioIds = Object.freeze({
  ALMOST_WIN: 'almostWin',
  NEAR_DEATH: 'nearDeath',
  POWER_LOADED: 'powerLoaded',
  ENERGY_BANK: 'energyBank',
  TOKYO_CONTROL: 'tokyoControl',
  HIGH_DAMAGE_INCOMING: 'highDamageIncoming',
  MULTI_NEAR_WIN: 'multiNearWin',
  MASS_EFFECT_QUEUE: 'massEffectQueue',
  BURST_RESOURCES: 'burstResources'
});

export function listScenarios() {
  return [
    {
      id: ScenarioIds.ALMOST_WIN,
      label: 'On Cusp of Victory',
      description: 'Sets target monster victory points to 18 (2 away from winning).',
      bullets: ['Test VP win finish timing','Validate RESOLVE→GAME_OVER transition','Check no overshoot beyond 20 VP'],
      apply(player) { return { victoryPoints: Math.max(player.victoryPoints, 18) }; }
    },
    {
      id: ScenarioIds.NEAR_DEATH,
      label: 'On Verge of Death',
      description: 'Sets health to 1 (still alive).',
      bullets: ['Test lethal damage elimination path','Check yield prompts when low HP in Tokyo','Validate death ordering vs VP gain'],
      apply(_player) { return { health: 1 }; }
    },
    {
      id: ScenarioIds.POWER_LOADED,
      label: 'Loaded With Power Cards',
      description: 'Gives 4 random keep cards to the monster (no duplicates).',
      bullets: ['Modifier stacking correctness','Card-based reroll/dice slot effects','Hand size UI rendering'],
      apply(player, ctx) {
        const keepCards = (ctx.catalog || []).filter(c => c.type === 'keep');
        const grant = shuffle(keepCards).slice(0,4).map(c => ({ id: c.id, name: c.name, type: c.type, effect: c.effect }));
        const existingIds = new Set((player.cards||[]).map(c=>c.id));
        const merged = (player.cards||[]).concat(grant.filter(c=>!existingIds.has(c.id)));
        return { cards: merged };
      }
    },
    {
      id: ScenarioIds.ENERGY_BANK,
      label: 'Huge Energy Reserve',
      description: 'Sets energy to at least 15.',
      bullets: ['Shop purchase sequencing','Cost reduction stacking','Energy flash animation overflow'],
      apply(player) { return { energy: Math.max(player.energy, 15) }; }
    },
    {
      id: ScenarioIds.TOKYO_CONTROL,
      label: 'Tokyo King',
      description: 'Places this monster into Tokyo City with 12 VP (near win while exposed).',
      bullets: ['Stay/leave yield decisions under pressure','Start-of-turn Tokyo VP awarding','Attack damage distribution to outside players'],
      apply(player, ctx) { return { victoryPoints: Math.max(player.victoryPoints, 12), inTokyo: true }; }
    },
    {
      id: ScenarioIds.HIGH_DAMAGE_INCOMING,
      label: 'High Incoming Damage Context',
      description: 'Marks player low HP (2) and flags others with attack buffs to simulate lethal roll risk.',
      bullets: ['Armor / mitigation cards','Turn order lethal resolution','Effect queue after death'],
      apply(_player, ctx) { return { health: 2 }; }
    },
    {
      id: ScenarioIds.MULTI_NEAR_WIN,
      label: 'Multiple Players Near Victory',
      description: 'Sets all players to 17 VP to test tie & race conditions.',
      bullets: ['Simultaneous VP comparisons','Turn boundary winner evaluation','Effect-based VP increments ordering'],
      global: true,
      apply(player) { return { victoryPoints: Math.max(player.victoryPoints, 17) }; }
    },
    {
      id: ScenarioIds.MASS_EFFECT_QUEUE,
      label: 'Mass Effect Queue',
      description: 'Queues multiple immediate effects (energy gain + VP gain chain).',
      bullets: ['BUY_WAIT exit logic','Effect processing order','UI effect resolution logging'],
      apply(player, ctx) { return { _queueEffects: [ { kind:'energy_gain', value:3 }, { kind:'vp_gain', value:2 } ] }; }
    },
    {
      id: ScenarioIds.BURST_RESOURCES,
      label: 'Burst Resources (VP+Energy)',
      description: 'Sets VP=15 and Energy=12 to explore mixed spend/finish turns.',
      bullets: ['Endgame shop purchase decisions','VP vs energy gain logging','AI buy priority near win'],
      apply(player) { return { victoryPoints: Math.max(15, player.victoryPoints), energy: Math.max(12, player.energy) }; }
    }
  ];
}

export function getScenario(id) {
  return listScenarios().find(s => s.id === id) || null;
}

function shuffle(a) { const arr = a.slice(); for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }
