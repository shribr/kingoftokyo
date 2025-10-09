# Mini Player Card Scenario Indicators - Debug Guide

## Issue
Scenario indicators (red asterisks) were not appearing on mini player cards when scenarios were applied.

## Root Cause
The `update()` function in `mini-player-card.component.js` was **empty**. While the component used `store.subscribe(sync)` which triggers on every Redux state change, the component registration system calls the exported `update()` function specifically when the registered `stateKeys` change.

With `stateKeys: ["players", "activePlayer", "activePlayerId", "settings"]`, the update function should have been called when settings changed, but it did nothing.

## Fix Applied

### Before:
```javascript
export function update() {}
```

### After:
```javascript
export function update(state) {
  // Re-render all cards when state changes
  const container = document.querySelector('.cmp-mini-player-cards');
  if (!container) return;
  
  const playerOrder = state.players?.order || [];
  const playersById = state.players?.byId || {};
  const playerArray = playerOrder.map(id => playersById[id]).filter(Boolean);
  const activePlayer = selectActivePlayer(state);
  const activePlayerId = activePlayer?.id;
  
  container.innerHTML = '';
  const positions = ['top-left', 'top-left-title', 'top-right-title', 'top-right', 'bottom-left', 'bottom-right'];
  
  for (let i = 0; i < 6; i++) {
    const player = playerArray[i];
    const position = positions[i];
    const card = createMiniCard(player, position, activePlayerId, i, state);
    container.appendChild(card);
  }
}
```

## Debug Logging Added

Added conditional logging to help diagnose scenario detection:

1. **In `getPlayerScenarioCategories()`** (line ~20):
   ```javascript
   if (window.__KOT_DEBUG__?.logComponentUpdates && assignments.length) {
     console.log('[MiniPlayerCard] Scenario assignments found:', assignments);
   }
   ```

2. **In `createMiniCard()`** (line ~158):
   ```javascript
   if (window.__KOT_DEBUG__?.logComponentUpdates) {
     console.log('[MiniPlayerCard] Scenario check for', playerName, scenarioCategories);
   }
   ```

## Testing Steps

### 1. Enable Debug Logging
- Open Settings (⚙️ icon)
- Go to "Dev Tools" tab
- Check "Log component updates"
- Save and close

### 2. Apply a Scenario
- Open Settings again
- Go to "Scenarios" tab
- Select a scenario (e.g., "Energy Hoarder")
- Choose target: "Human Player" or "CPU Players"
- Click "Apply Scenarios"
- Click "Save Settings"

### 3. Verify in Console
You should see logs like:
```
[MiniPlayerCard] Scenario assignments found: [{mode: 'HUMAN', scenarioIds: ['energy-hoarder'], cpuCount: 0}]
[MiniPlayerCard] Scenario check for Player1 {hasHealth: false, hasEnergy: true, hasVP: false, hasCards: false, energyScenarios: ['ENERGY HOARDER'], ...}
```

### 4. Verify in UI
Check the mini player cards (small cards in corners of screen):
- The affected player should have a red asterisk (*) next to the affected stat
- For "Energy Hoarder": asterisk next to ⚡ (energy)
- For "Glass Cannon": asterisks next to ❤️ (health) and ⚡ (energy)
- For "Fortified": asterisk next to ❤️ (health)
- For "Point Rush": asterisk next to ⭐ (VP)
- For "Collector": asterisk next to 🃏 (cards)

### 5. Test Different Scenarios

| Scenario | Affects | Expected Indicators |
|----------|---------|-------------------|
| Energy Hoarder | Energy | ⚡* |
| Glass Cannon | Health, Energy | ❤️* ⚡* |
| Fortified | Health | ❤️* |
| Point Rush | Victory Points | ⭐* |
| Collector | Power Cards | 🃏* |

## Component Architecture

### State Subscription
The component is registered with these `stateKeys`:
```json
"stateKeys": ["players", "activePlayer", "activePlayerId", "settings"]
```

This means the `update()` function should be called whenever:
- Player data changes (health, energy, VP, cards)
- Active player changes
- **Settings change (including scenario assignments)**

### Scenario Detection Logic
The `getPlayerScenarioCategories()` function:
1. Reads `state.settings.scenarioConfig.assignments`
2. Determines if each scenario applies to the player (based on mode and cpuCount)
3. Maps scenario IDs to affected stats using `scenarioEffects` lookup
4. Returns boolean flags and scenario names

### Rendering
The `createMiniCard()` function:
1. Calls `getPlayerScenarioCategories()` for the player
2. Builds indicator HTML for each affected stat
3. Injects indicators inline after stat values

## Files Changed

1. `/src/components/mini-player-card/mini-player-card.component.js`
   - Implemented `update()` function (was empty)
   - Added debug logging (conditional on `window.__KOT_DEBUG__.logComponentUpdates`)

## Related Files

- `/css/components.mini-player-card.css` - Contains `.mpc-scenario-indicator` styles
- `/config/components.config.json` - Component registration with stateKeys
- `/src/components/player-profile-card/player-profile-card.component.js` - Larger profile cards (also show scenarios)

## CSS Styling

The indicators use:
```css
.mpc-scenario-indicator {
  color: #ff0000;
  font-weight: bold;
  text-shadow: 0 0 3px rgba(255,0,0,0.8);
  margin-left: 2px;
  cursor: help;
  animation: scenario-pulse 2s ease-in-out infinite;
}
```

With a pulsing animation to draw attention.
