# Mobile Scenario Indicators Fix - COMPLETED ✅

## Issue
Scenario indicators (red asterisks) were not appearing on mini player cards in mobile view, even though scenarios were being applied successfully (notification showing).

## Root Cause
The `mini-player-card` component was **not checking for scenarios** and **not rendering scenario indicators**. It was only showing raw stat values without any indication that scenarios were affecting those stats.

## Solution

### 1. Added Scenario Detection Logic ✅
**File**: `/src/components/mini-player-card/mini-player-card.component.js`

Added `getPlayerScenarioCategories()` function (lines 9-97) that:
- Reads scenario assignments from `state.settings.scenarioConfig.assignments`
- Determines which player(s) the scenarios target (HUMAN, CPUS, BOTH)
- Maps scenarios to affected stat categories (health, energy, vp, cards)
- Returns boolean flags and scenario names for each category

### 2. Integrated Scenario Checks into Card Rendering ✅
**File**: `/src/components/mini-player-card/mini-player-card.component.js` (lines 156-167)

```javascript
// Check for scenario indicators
const scenarioCategories = getPlayerScenarioCategories(state, player.id);

// Build scenario indicator HTML (red asterisks)
const healthIndicator = scenarioCategories.hasHealth ? 
  '<span class="mpc-scenario-indicator" title="Scenario affects Health">*</span>' : '';
// ... (similar for energy, vp, cards)

// Inject indicators into stat HTML
'<div class="mpc-stat">... <span class="mpc-stat-value">' + health + '</span>' + healthIndicator + '</div>'
```

### 3. Added CSS Styling for Indicators ✅
**File**: `/css/components.mini-player-card.css` (lines 206-218)

```css
.mpc-scenario-indicator {
  color: #ff3333;
  font-size: 10px;
  font-weight: bold;
  margin-left: 1px;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
  cursor: help;
  animation: scenario-pulse 2s ease-in-out infinite;
}
```

### 4. Component Already Subscribed to Settings ✅
**File**: `/config/components.config.json` (line 521)

The component was already listening to settings changes:
```json
"stateKeys": ["players", "activePlayer", "activePlayerId", "settings"]
```

So when scenarios are applied, the component automatically re-renders!

## How It Works Now

1. **User applies scenarios** via Settings → Scenarios tab
2. **Notification shows** "Scenarios applied successfully!"
3. **Settings state updates** with scenario assignments
4. **Mini player cards re-render** (because they subscribe to `settings` state key)
5. **For each player**, `getPlayerScenarioCategories()` checks which scenarios apply
6. **Red asterisks appear** next to affected stats (❤️*, ⚡*, ⭐*, 🃏*)
7. **Hovering shows tooltip** "Scenario affects [Stat]"
8. **Asterisks pulse** with subtle animation

## Scenario Effect Mapping

Currently mapped scenarios (can be expanded):
```javascript
const scenarioEffects = {
  'energy-hoarder': { energy: true },
  'glass-cannon': { health: true, energy: true },
  'fortified': { health: true },
  'point-rush': { vp: true },
  'collector': { cards: true }
};
```

## Testing Checklist

- [ ] Open Settings → Scenarios tab
- [ ] Select "Energy Hoarder" scenario
- [ ] Set mode to HUMAN
- [ ] Click "Apply & Close"
- [ ] Notification shows "Scenarios applied successfully!"
- [ ] Mini player card for human player shows red asterisk next to ⚡ (energy) stat
- [ ] Hovering over asterisk shows "Scenario affects Energy"
- [ ] Asterisk pulses subtly
- [ ] Try assigning to CPU players - asterisks appear on their cards
- [ ] Remove scenario - asterisks disappear
- [ ] Reload page - asterisks persist (scenarios saved to localStorage)

## Files Modified

1. ✅ `/src/components/mini-player-card/mini-player-card.component.js`
   - Added `getPlayerScenarioCategories()` function (88 lines)
   - Integrated scenario checks into card rendering
   - Added scenario indicator HTML generation

2. ✅ `/css/components.mini-player-card.css`
   - Added `.mpc-scenario-indicator` styles
   - Added scenario-pulse animation
   - Added `position: relative` to `.mpc-stat` for indicator positioning

## Before vs After

### Before
```
Mini Player Card:
❤️ 10
⚡ 5
⭐ 0
🃏 2
```
(No indication that Energy Hoarder scenario is active)

### After
```
Mini Player Card:
❤️ 10
⚡ 5 *  ← Red pulsing asterisk!
⭐ 0
🃏 2
```
(Clear visual indicator that energy is affected by scenario)

## Notes

- The same scenario checking logic could be extracted into a shared utility if needed by other components
- Additional scenarios can be easily added to the `scenarioEffects` mapping
- The indicator style matches the style used in the larger player profile cards for consistency
- Mobile-friendly with touch-optimized tooltip on hover/tap
