# Scenario Indicator Architecture - How Components Update

## Question
**How do the regular (non-mobile) player cards update their UI stats to correctly apply scenarios?**

## Answer Summary
The regular player profile cards **DON'T subscribe to the `settings` state key**, yet they correctly show scenario indicators. Here's how:

## Architecture Comparison

### Mini Player Cards (Small Corner Cards)
**Component**: `mini-player-card.component.js`
**Registration**: 
```json
{
  "name": "miniPlayerCards",
  "stateKeys": ["players", "activePlayer", "activePlayerId", "settings"]
}
```

**Update Mechanism**:
1. Subscribed to `"settings"` state key ✅
2. When scenarios are applied → `settings` changes → `update()` is called
3. Component re-renders all cards with scenario indicators

**Issue Found**: The `update()` function was empty, so it didn't re-render when settings changed. **Fixed** by implementing the update function.

---

### Regular Player Profile Cards (Large Cards)
**Component**: `player-profile-card.component.js` (individual card)
**Manager**: `player-profile-cards.component.js` (multi-instance manager)
**Registration**:
```json
{
  "name": "playerProfileCards",
  "stateKeys": ["players", "ui"]
}
```

**Key Insight**: Does NOT subscribe to `"settings"` ❌

**Update Mechanism**:
1. The manager component (`player-profile-cards`) subscribes to `["players", "ui"]`
2. **However**, the manager calls `inst.update({ playerId })` for EVERY player on EVERY update
3. The individual card's `update()` function reads `state.settings` directly via `store.getState()`

**From `player-profile-cards.component.js` (lines 45-50)**:
```javascript
order.forEach((playerId, idx) => {
  let inst = instances.get(playerId);
  // ... card creation if needed ...
  
  inst.update({ playerId });  // ← Calls update on EVERY state change
  
  // ... animations ...
});
```

**From `player-profile-card.component.js` (lines 257-259)**:
```javascript
export function update(root, { playerId }) {
  if (!playerId) return;
  const state = store.getState();  // ← Reads current state (including settings!)
  const player = selectPlayerById(state, playerId);
```

**From `player-profile-card.component.js` (lines 278-290)**:
```javascript
// Scenario indicators - show asterisks on affected stat tiles
try {
  const scenarioCategories = getPlayerScenarioCategories(state, playerId);
  
  const healthIndicator = root.querySelector('[data-scenario-health]');
  const energyIndicator = root.querySelector('[data-scenario-energy]');
  const vpIndicator = root.querySelector('[data-scenario-vp]');
  const cardsIndicator = root.querySelector('[data-scenario-cards]');
  
  if (healthIndicator) {
    healthIndicator.style.display = scenarioCategories.hasHealth ? 'inline' : 'none';
    // ... set tooltip ...
  }
  // ... same for energy, vp, cards ...
}
```

## Why This Works

### The Key Difference
1. **Mini Player Cards**: Need explicit `settings` subscription because they control their own update cycle
2. **Regular Player Cards**: Get updated on EVERY state change via the manager, so they always have fresh data

### The Manager Pattern
The `player-profile-cards` manager is very aggressive - it calls `update()` on every single player card whenever `players` or `ui` changes. This means:

- When a player takes damage → `players` changes → all cards update
- When energy is gained → `players` changes → all cards update  
- When scenarios are applied → `players` doesn't change, but...
  - The next time ANY player state changes (damage, energy, etc.)
  - All cards re-render and read the current `settings` from state
  - Scenario indicators appear!

**OR**, more commonly:
- Scenarios are applied during setup BEFORE the game starts
- When the game starts, players are created → `players` changes
- All cards render with scenario indicators from the beginning

## Scenario Detection Logic

Both components use similar logic:

### `getPlayerScenarioCategories(state, playerId)`
1. Reads `state.settings.scenarioConfig.assignments`
2. Determines which scenarios apply to this player:
   - Checks assignment `mode`: `HUMAN`, `CPUS`, or `BOTH`
   - Matches player against target (human vs CPU)
   - Respects `cpuCount` for CPU targeting
3. Maps scenario IDs to affected stats using `getScenario()` catalog lookup
4. Returns object with boolean flags and scenario names:
   ```javascript
   {
     hasHealth: true,
     hasEnergy: false,
     hasVP: false,
     hasCards: false,
     healthScenarios: ["GLASS CANNON", "FORTIFIED"],
     energyScenarios: [],
     vpScenarios: [],
     cardsScenarios: []
   }
   ```

### Rendering Indicators

**Regular Cards** (player-profile-card.component.js):
- HTML template includes `<span class="scenario-indicator" data-scenario-health>*</span>` in each stat
- Update function shows/hides via `element.style.display = hasFlag ? 'inline' : 'none'`
- Sets tooltip with scenario names

**Mini Cards** (mini-player-card.component.js):
- Builds indicator HTML inline: `'<span class="mpc-scenario-indicator">*</span>'` 
- Conditionally appends to stat HTML during card creation
- If no scenario, indicator HTML is empty string

## Why Mini Cards Needed the Fix

The mini cards component:
1. Uses `store.subscribe(sync)` which fires on EVERY state change
2. Also has an `update()` export for the component system
3. The component system would call `update()` when `stateKeys` change
4. But `update()` was empty! So when settings changed:
   - The subscription didn't trigger (settings alone doesn't cause a store broadcast to all subscribers)
   - The component system called `update()` 
   - Nothing happened!

**Solution**: Implement the `update()` function to actually re-render the cards.

## Summary Table

| Aspect | Regular Player Cards | Mini Player Cards |
|--------|---------------------|-------------------|
| **Component** | `player-profile-card.component.js` | `mini-player-card.component.js` |
| **Manager** | `player-profile-cards.component.js` | (self-managed) |
| **State Keys** | `["players", "ui"]` | `["players", "activePlayer", "activePlayerId", "settings"]` |
| **Subscribes to Settings** | ❌ No | ✅ Yes |
| **Update Frequency** | Every `players` or `ui` change | Every state change + explicit `settings` changes |
| **Settings Access** | Reads `store.getState()` in update | Reads `store.getState()` in update |
| **Indicator Method** | Show/hide pre-rendered spans | Build HTML inline |
| **Issue** | None (works correctly) | `update()` was empty |
| **Fix Needed** | None | Implement `update()` to re-render |

## Lesson Learned

**Two patterns for scenario indicators:**

1. **Eager Manager Pattern** (Regular cards):
   - Manager updates all instances on every relevant state change
   - Individual components read full state on each update
   - Works without `settings` subscription because updates are frequent

2. **Selective Update Pattern** (Mini cards):
   - Component controls its own update cycle
   - Subscribes to specific state keys
   - Needs working `update()` function to respond to state changes
   - More efficient (only updates when needed)

Both patterns work, but they require different implementations!
