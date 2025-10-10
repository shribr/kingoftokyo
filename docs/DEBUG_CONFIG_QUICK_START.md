# Debug Configuration System - Quick Start Guide

## For Developers

### Quick Setup
1. Open the game in your browser
2. Click the ⚙️ (Settings) button
3. Navigate to **Dev Tools** tab
4. Scroll to **🔍 Component Debug Configuration** section
5. Check the components you want to debug
6. Click **Save Settings**

### Common Use Cases

#### Debugging Turn Flow
Enable these components:
- ☑ Turn Service
  - ☑ Phases
  - ☑ Actions
- ☑ Action Menu
  - ☑ Buttons
- ☑ Dice Tray
  - ☑ Rolls

Result: See detailed turn progression, button clicks, and dice results

#### Debugging AI Behavior
Enable these components:
- ☑ AI Decisions
  - ☑ Tree
  - ☑ Evaluation
- ☑ Analysis
  - ☑ Decision Tree
  - ☑ Win Odds

Result: See AI thinking process, win probability calculations, decision analysis

#### Debugging Power Cards
Enable these components:
- ☑ Power Cards Panel
  - ☑ Cards
  - ☑ Shop
  - ☑ Purchases
- ☑ Player Power Cards Modal
  - ☑ Cards
  - ☑ Carousel
- ☑ Effect Engine
  - ☑ Resolution

Result: See card display, shop operations, purchases, and effect execution

#### Debugging Component Loading
Enable these components:
- ☑ Bootstrap
  - ☑ Services
  - ☑ Config
  - ☑ Persistence

Result: See initialization sequence of all major services

#### Debugging Arena/Tokyo
Enable these components:
- ☑ Arena
  - ☑ Slots
  - ☑ Animations
- ☑ Tokyo Yield Modal
  - ☑ Decision

Result: See monster placement, Tokyo entry/exit, and yield decisions

### Adding Debug Logging to New Components

#### Example 1: Simple Component (No Sub-components)
```javascript
// Import at top of file
import { debugLog } from '../utils/debugConfig.js';

// In your component code
export function initializeMyComponent() {
  debugLog('myComponent', 'Component initialized');
  
  // ... component logic
  
  debugLog('myComponent', 'Setup complete');
}
```

#### Example 2: Component with Sub-components
```javascript
// Import at top
import { debugLog, isDebugEnabled } from '../utils/debugConfig.js';

// In your component
export function initializeMyComponent() {
  debugLog('myComponent', 'Component initialized');
  
  // Sub-component A
  debugLog('myComponent', 'subA', 'Initializing sub-component A');
  setupSubComponentA();
  debugLog('myComponent', 'subA', 'Sub-component A ready');
  
  // Sub-component B (with expensive operation)
  if (isDebugEnabled('myComponent', 'subB')) {
    const debugData = generateExpensiveDebugInfo();
    debugLog('myComponent', 'subB', 'Debug info:', debugData);
  }
}
```

#### Example 3: Conditional Logging for Performance
```javascript
// Only compute expensive debug info if logging is enabled
if (isDebugEnabled('aiDecisions', 'evaluation')) {
  const analysisTree = buildCompleteDecisionTree(state);
  const winOdds = calculateWinProbabilities(state);
  debugLog('aiDecisions', 'evaluation', 'Full analysis:', {
    tree: analysisTree,
    odds: winOdds
  });
}
```

### Adding New Components to Config

Edit `src/utils/debugConfig.js`:

```javascript
const DEBUG_CONFIG = {
  // ... existing components
  
  // Add your new component
  myNewComponent: {
    enabled: false,
    children: {
      subFeatureA: false,
      subFeatureB: false,
      subFeatureC: false
    }
  }
};
```

The UI will automatically pick it up and display checkboxes for it!

### Debugging Tips

1. **Start Broad, Then Narrow:**
   - Enable parent components first
   - If you see issues, expand and enable specific sub-components
   
2. **Use Browser DevTools:**
   - Open Console (Cmd+Opt+J on Mac, F12 on Windows)
   - Filter messages using component names: `[arena]`, `[diceTray]`, etc.
   
3. **Save Your Configurations:**
   - Different debug setups for different tasks
   - Export settings to share with team
   
4. **Clear Console Between Tests:**
   - Use browser's clear button or Cmd+K (Mac) / Ctrl+L (Windows)
   - Focus on new messages

### Console Output Format

All debug messages follow this pattern:
```
[component] message
[component] [subComponent] message
```

Examples:
```javascript
[bootstrap] ✓ Settings service initialized
[arena] [slots] Slot 0: Gigazaur enters Tokyo
[diceTray] [rolls] Roll started: 6 dice
[aiDecisions] [evaluation] Best action: KEEP (score: 8.5)
```

### Performance Considerations

- Debug logging is lightweight when disabled
- Use `isDebugEnabled()` before expensive operations
- Avoid logging in tight loops without checking first
- Consider impact of logging large objects

### Best Practices

✅ **DO:**
- Use descriptive messages
- Log important state changes
- Use sub-components for granular control
- Check `isDebugEnabled()` for expensive logs

❌ **DON'T:**
- Log in every function call (too noisy)
- Log sensitive data
- Leave debug code in production builds
- Forget to save settings after changes

## For Users/Testers

### Quick Debug for Bug Reports

When reporting bugs, enable relevant debug logging:

1. **Game crashes/freezes:**
   - Enable: Bootstrap, Turn Service, Effect Engine
   
2. **AI behaving oddly:**
   - Enable: AI Decisions (all sub-components)
   
3. **Cards not working:**
   - Enable: Power Cards Panel, Effect Engine
   
4. **UI issues:**
   - Enable: Arena, Dice Tray, Action Menu

Then:
1. Reproduce the bug
2. Copy console output (Cmd+A, Cmd+C in console)
3. Paste into bug report

### Reducing Console Noise

If console is too busy:
1. Disable all components
2. Enable only the component related to your issue
3. Save settings

## Troubleshooting

### "Debug messages not appearing"
- Check that component is checked in Settings → Dev Tools
- Click "Save Settings" after making changes
- Reload page if settings don't apply

### "Too many messages"
- Disable parent components
- Enable only specific sub-components you need
- Use browser console filters

### "UI not showing debug config"
- Make sure you're on the Dev Tools tab
- Scroll down to "Component Debug Configuration" section
- Check browser console for errors

### "Settings not persisting"
- Check localStorage is enabled in browser
- Try Export/Import settings from Advanced tab
- Clear browser cache and reload

## Examples in Action

### Scenario: Debug Monster Selection
```javascript
// Enable in UI:
☑ Monster Selection
  ☑ Cards
  ☑ Selection
☑ Arena
  ☑ Slots

// Console will show:
[monsterSelection] [cards] Loaded 6 monsters
[monsterSelection] [selection] Player selected: Gigazaur
[arena] [slots] Slot 0 assigned: Gigazaur
```

### Scenario: Debug Power Card Purchase
```javascript
// Enable in UI:
☑ Power Cards Panel
  ☑ Shop
  ☑ Purchases
☑ Effect Engine
  ☑ Resolution

// Console will show:
[powerCardsPanel] [shop] Available cards: 3
[powerCardsPanel] [purchases] Purchase attempt: "Energize" (cost: 8⚡)
[powerCardsPanel] [purchases] ✓ Purchase successful
[effectEngine] [resolution] Resolving effect: energy_gain +9
```

### Scenario: Debug Turn Flow
```javascript
// Enable in UI:
☑ Turn Service
  ☑ Phases
  ☑ Actions

// Console will show:
[turnService] [phases] Phase started: ROLL
[turnService] [actions] Action: roll-dice
[turnService] [phases] Phase ended: ROLL
[turnService] [phases] Phase started: RESOLVE
```

## Quick Reference

| Task | Components to Enable |
|------|---------------------|
| Game initialization | Bootstrap → Services |
| Monster selection | Monster Selection (all) |
| Rolling dice | Dice Tray → Rolls |
| AI decisions | AI Decisions (all) |
| Power cards | Power Cards Panel, Effect Engine |
| Tokyo mechanics | Arena, Tokyo Yield Modal |
| Turn flow | Turn Service → Phases, Actions |
| UI updates | Specific component panels |
| Win probabilities | Analysis → Win Odds |
| Effect execution | Effect Engine → Resolution |

## Support

For issues with the debug system itself:
1. Check this guide
2. Look at `DEBUG_CONFIG_SYSTEM.md` for technical details
3. Check `DEBUG_CONFIG_UI_EXAMPLE.md` for UI reference
4. Review code in `src/utils/debugConfig.js`
