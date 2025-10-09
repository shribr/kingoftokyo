# Passive Effects Integration

## Overview
This document describes the integration of the passive card effects system into the game flow. Passive effects are card abilities that trigger automatically at specific game phases, unlike discard cards which require manual activation.

## Architecture

### Core Service: `passiveEffectsProcessor.js`
Located in `src/services/passiveEffectsProcessor.js`, this service provides 8 trigger functions:

1. **`processTurnStartEffects(playerId)`** - Turn start triggers
   - Gas Refinery: +2 energy if in Tokyo
   - Regeneration: Heal 2 HP
   - Rooting for the Underdog: +1 energy if health ≤5
   - Solar Powered: +1 energy if outside Tokyo
   - Friend of Children: +1★ if rolled ≥1 Heart last turn

2. **`processBuyPhaseEffects(playerId)`** - Buy phase triggers
   - Corner Store: +1 energy

3. **`processDiceResultEffects(playerId, diceResults)`** - Dice result triggers
   - Herbivore: +2 energy if rolled 3+ Hearts
   - Nuclear Power Plant: +2 energy if rolled 2+ Skulls
   - Made in a Lab: +2★ if rolled 1-2-3 sequence

4. **`processVPGainEffects(playerId, amount)`** - VP gain triggers
   - Dedicated News Team: +1 energy per VP gained
   - Stretch Goals: +1 energy if gained 3+ VP

5. **`processDamageTakenEffects(playerId, amount)`** - Damage triggers
   - We're Only Making It Stronger: +1 energy per damage taken

6. **`getAttackBonus(playerId)`** - Combat calculation
   - Fire Breathing: +1 damage to all attacks
   - Returns: bonus damage value

7. **`processCardPurchaseEffects(playerId)`** - Card purchase triggers
   - Rapid Healing: Heal 1 HP when buying any card

8. **`getCardCostReduction(playerId)`** - Purchase cost calculation
   - Alien Metabolism: -1 energy cost for all cards (min 0)
   - Returns: reduction amount

## Integration Points

### 1. Global Initialization (`bootstrap/index.js`)
```javascript
import { createPassiveEffectsProcessor } from '../services/passiveEffectsProcessor.js';

const passiveEffects = createPassiveEffectsProcessor(store, logger);
window.__KOT_NEW__ = { ..., passiveEffects };

// Subscribe to VP gain and damage actions
store.subscribe((state, action) => {
  if (action.type === 'PLAYER_VP_GAINED') {
    passiveEffects.processVPGainEffects(playerId, amount);
  }
  if (action.type === 'APPLY_PLAYER_DAMAGE') {
    passiveEffects.processDamageTakenEffects(playerId, amount);
  }
});
```

### 2. Turn Flow (`services/turnService.js`)
```javascript
import { createPassiveEffectsProcessor } from './passiveEffectsProcessor.js';

// Create instance
const passiveEffects = createPassiveEffectsProcessor(store, logger);

// Turn start (after Tokyo VP award)
function startTurn() {
  awardStartOfTurnTokyoVP(store, logger);
  passiveEffects.processTurnStartEffects(activeId);
  // ... rest of turn logic
}

// Dice results (after resolveDice)
async function acceptDiceResults() {
  resolveDice(store, logger);
  passiveEffects.processDiceResultEffects(activeId, diceResults);
}

// BUY phase start
async function resolve() {
  // ... phase transition to BUY
  passiveEffects.processBuyPhaseEffects(activeId);
}
```

### 3. Card Purchases (`services/cardsService.js`)
```javascript
export function purchaseCard(store, logger, playerId, cardId) {
  // Calculate cost reduction
  const passiveEffects = window.__KOT_NEW__?.passiveEffects;
  const costReduction = passiveEffects?.getCardCostReduction(playerId) || 0;
  const actualCost = Math.max(0, card.cost - costReduction);
  
  // Purchase card
  store.dispatch(playerSpendEnergy(playerId, actualCost));
  store.dispatch(cardPurchased(playerId, card));
  
  // Trigger purchase effects
  passiveEffects?.processCardPurchaseEffects(playerId);
}
```

### 4. Combat Resolution (`services/resolutionService.js`)
```javascript
if (tally.claw > 0) {
  // Calculate attack bonus
  const passiveEffects = window.__KOT_NEW__?.passiveEffects;
  const attackBonus = passiveEffects?.getAttackBonus(activeId) || 0;
  const totalDamage = tally.claw + attackBonus;
  
  // Apply damage
  store.dispatch(applyPlayerDamage(targetId, totalDamage));
}
```

## Effect Coverage

### ✅ Fully Implemented (20+ effects)
- **turn_start_energy**: Gas Refinery (+2⚡ in Tokyo)
- **heal_turn_start**: Regeneration (heal 2 HP)
- **low_health_bonus**: Rooting for the Underdog (+1⚡ if HP≤5)
- **outside_tokyo_energy**: Solar Powered (+1⚡ outside Tokyo)
- **heart_vp**: Friend of Children (+1★ if rolled hearts)
- **buy_phase_energy**: Corner Store (+1⚡ at buy phase)
- **three_hearts_bonus**: Herbivore (+2⚡ for 3+ hearts)
- **skull_energy**: Nuclear Power Plant (+2⚡ for 2+ skulls)
- **science_bonus**: Made in a Lab (+2★ for 1-2-3)
- **tokyo_bonus_vp**: Dedicated News Team (+1⚡ per VP)
- **vp_energy_bonus**: Stretch Goals (+1⚡ for 3+ VP)
- **damage_energy**: We're Only Making It Stronger (+1⚡ per damage)
- **attack_bonus**: Fire Breathing (+1 damage)
- **heal_energy**: Rapid Healing (heal 1 on purchase)
- **cheaper_cards**: Alien Metabolism (-1⚡ card costs)

### ⚠️ Not Yet Implemented
These require new effect.kind implementations or special game rule handling:
- **Parasitic Tentacles** (steal 1★ on claw damage)
- **Psychic Probe** (swap cards with opponents)
- **Plot Twist** (discard & draw 2 cards)
- **Metamorphosis** (discard all cards for VP)

## Testing Strategy

### Card Selection Scenario
1. Open Settings → Scenarios → "Loaded With Power Cards"
2. Verify checkbox grid with card names and emojis
3. Select specific cards (e.g., Gas Refinery, Giant Brain, Extra Head)
4. Set card count to match selections
5. Add to list and apply
6. Verify player receives exact selected cards

### Passive Effects Triggers
1. **Turn Start**: Load Gas Refinery, start turn → check +2⚡ in console
2. **Dice Results**: Load Herbivore, roll 3+ hearts → check +2⚡ immediately
3. **Buy Phase**: Load Corner Store, enter BUY → check +1⚡
4. **VP Gain**: Load Dedicated News Team, gain 3★ → check +3⚡
5. **Damage Taken**: Load We're Only Making It Stronger, take 5 damage → check +5⚡
6. **Attack Bonus**: Load Fire Breathing, roll 3 claws → check 4 damage dealt
7. **Card Purchase**: Load Rapid Healing, buy any card → check heal 1 HP
8. **Cost Reduction**: Load Alien Metabolism, check card costs reduced by 1

### Console Logs
All passive effects produce `[PassiveEffects]` console logs:
```
[PassiveEffects] Gas Refinery: +2 energy for player1 (in Tokyo)
[PassiveEffects] Herbivore: +2 energy for player2 (rolled 4 hearts)
[PassiveEffects] Fire Breathing: +1 attack bonus for player1
```

## Files Modified
- ✅ `src/services/passiveEffectsProcessor.js` (NEW - 277 lines)
- ✅ `src/services/turnService.js` (import, create instance, 3 hook calls)
- ✅ `src/bootstrap/index.js` (import, global init, action subscriptions)
- ✅ `src/services/cardsService.js` (cost reduction, purchase effects)
- ✅ `src/services/resolutionService.js` (attack bonus calculation)
- ✅ `src/scenarios/catalog.js` (cardCount + selectedCards params)
- ✅ `src/components/scenarios-tab/scenarios-tab.component.js` (card picker UI)

## Related Documentation
- `POWER_CARDS_CORRECTIONS.md` - Fixed 17 incorrect card descriptions
- `EFFECT_KINDS_IMPLEMENTATION_STATUS.md` - Comprehensive effect audit
- `IMPLEMENTATION_TODO.md` - Original feature requests
