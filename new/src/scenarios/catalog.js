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
      description: 'Sets target monster victory points to a near-win threshold.',
      params: {
        vpTarget: { label: 'VP Target', type: 'number', min: 0, max: 20, step: 1, default: 18 }
      },
      bullets: ['Test VP win finish timing','Validate RESOLVE→GAME_OVER transition','Check no overshoot beyond 20 VP'],
      apply(player, _ctx, params) { const tgt = clampInt(params?.vpTarget, 0, 20, 18); return { victoryPoints: Math.max(player.victoryPoints, tgt) }; }
    },
    {
      id: ScenarioIds.NEAR_DEATH,
      label: 'On Verge of Death',
      description: 'Sets health to a critically low value (still alive).',
      params: {
        healthTarget: { label: 'Health', type: 'number', min: 1, max: 10, step: 1, default: 1 }
      },
      bullets: ['Test lethal damage elimination path','Check yield prompts when low HP in Tokyo','Validate death ordering vs VP gain'],
      apply(_player, _ctx, params) { const h = clampInt(params?.healthTarget, 1, 10, 1); return { health: h }; }
    },
    {
      id: ScenarioIds.POWER_LOADED,
      label: 'Loaded With Power Cards',
      description: 'Gives 4 random keep cards to the monster (no duplicates).',
      bullets: ['Modifier stacking correctness','Card-based reroll/dice slot effects','Hand size UI rendering'],
      params: {
        seed: { label: 'Seed (0=random)', type: 'number', min: 0, max: 999999, step: 1, default: 0 }
      },
      apply(player, ctx, params) {
        const keepCards = (ctx.catalog || []).filter(c => c.type === 'keep');
        let pool = keepCards;
        const seed = parseInt(params?.seed, 10) || 0;
        if (seed > 0) {
          pool = seededShuffle(keepCards, seed);
        } else {
          pool = shuffle(keepCards);
        }
        const grant = pool.slice(0,4).map(c => ({ id: c.id, name: c.name, type: c.type, effect: c.effect }));
        const existingIds = new Set((player.cards||[]).map(c=>c.id));
        const merged = (player.cards||[]).concat(grant.filter(c=>!existingIds.has(c.id)));
        return { cards: merged };
      }
    },
    {
      id: ScenarioIds.ENERGY_BANK,
      label: 'Huge Energy Reserve',
      description: 'Sets energy to at least a configured value.',
      params: {
        energyMin: { label: 'Min Energy', type: 'number', min: 0, max: 50, step: 1, default: 15 }
      },
      bullets: ['Shop purchase sequencing','Cost reduction stacking','Energy flash animation overflow'],
      apply(player, _ctx, params) { const minE = clampInt(params?.energyMin, 0, 50, 15); return { energy: Math.max(player.energy, minE) }; }
    },
    {
      id: ScenarioIds.TOKYO_CONTROL,
      label: 'Tokyo King',
      description: 'Places this monster into Tokyo City with configured VP (near win while exposed).',
      params: { vpTarget: { label: 'VP', type: 'number', min: 0, max: 20, step:1, default: 12 } },
      bullets: ['Stay/leave yield decisions under pressure','Start-of-turn Tokyo VP awarding','Attack damage distribution to outside players'],
      apply(player, ctx, params) { const vp = clampInt(params?.vpTarget, 0, 20, 12); return { victoryPoints: Math.max(player.victoryPoints, vp), inTokyo: true }; }
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
      description: 'Sets all players to configured VP to test tie & race conditions.',
      bullets: ['Simultaneous VP comparisons','Turn boundary winner evaluation','Effect-based VP increments ordering'],
      global: true,
      params: { vpTarget: { label: 'VP Target', type: 'number', min: 0, max: 20, step:1, default: 17 } },
      apply(player, _ctx, params) { const vp = clampInt(params?.vpTarget, 0, 20, 17); return { victoryPoints: Math.max(player.victoryPoints, vp) }; }
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
      description: 'Sets VP and Energy to configured burst values.',
      params: { vpTarget: { label:'VP', type:'number', min:0, max:20, default:15, step:1 }, energyTarget: { label:'Energy', type:'number', min:0, max:50, default:12, step:1 } },
      bullets: ['Endgame shop purchase decisions','VP vs energy gain logging','AI buy priority near win'],
      apply(player, _ctx, params) { const vp = clampInt(params?.vpTarget,0,20,15); const en = clampInt(params?.energyTarget,0,50,12); return { victoryPoints: Math.max(vp, player.victoryPoints), energy: Math.max(en, player.energy) }; }
    }
  ];
}

export function getScenario(id) {
  return listScenarios().find(s => s.id === id) || null;
}

function shuffle(a) { const arr = a.slice(); for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }
function seededShuffle(a, seed){
  const rand = mulberry32(seed);
  const arr = a.slice();
  for (let i=arr.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr;
}
function mulberry32(a){
  return function(){ let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function clampInt(v, min, max, dflt){
  const n = parseInt(v,10);
  if (isNaN(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
