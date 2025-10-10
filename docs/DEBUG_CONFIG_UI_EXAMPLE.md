# Debug Configuration UI Example

## Visual Layout in Dev Tools Tab

```
🛠 Developer Tools
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Component Debug Configuration
┌─────────────────────────────────────────────────┐
│ [Scrollable Container - Max 400px height]      │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ ▶ ☐ Bootstrap                             │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ ▼ ☑ Arena                                 │  │
│ │   ├─ ☑ Slots                              │  │
│ │   └─ ☐ Animations                         │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ ▶ ☐ Dice Tray                             │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ ▼ ☑ AI Decisions                          │  │
│ │   ├─ ☑ Tree                               │  │
│ │   ├─ ☑ Evaluation                         │  │
│ │   └─ ☐ Thought Bubble                     │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ [... 20+ more components ...]                  │
│                                                 │
└─────────────────────────────────────────────────┘

Control console logging for specific components and sub-systems.
Check parent items to see high-level events, expand to enable 
detailed sub-component logging.
```

## Interaction Flow

### Expanding a Component
```
BEFORE (collapsed):
┌───────────────────────────────────────────┐
│ ▶ ☑ Power Cards Panel                    │
└───────────────────────────────────────────┘

Click ▶ button

AFTER (expanded):
┌───────────────────────────────────────────┐
│ ▼ ☑ Power Cards Panel                    │
│   ├─ ☑ Cards                              │
│   ├─ ☐ Shop                               │
│   └─ ☑ Purchases                          │
└───────────────────────────────────────────┘
```

### Enabling a Child Component
```
1. Check "Shop" checkbox
   → Automatically enables parent "Power Cards Panel" if disabled
   → Updates config: powerCardsPanel: { cards: true, shop: true, purchases: true }

2. Uncheck parent "Power Cards Panel"
   → Automatically unchecks all children
   → Updates config: powerCardsPanel: false
```

## Console Output Examples

### With Bootstrap Enabled
```javascript
// Console shows:
[bootstrap] ✓ Settings service initialized
[bootstrap] ✓ Turn service initialized  
[bootstrap] ✓ Effect engine initialized
[bootstrap] ✓ AI thought bubble initialized
[bootstrap] ✓ Save status indicator initialized
```

### With Bootstrap Disabled
```javascript
// Console shows:
// (no bootstrap messages)
```

### With Arena → Slots Enabled
```javascript
// Console shows:
[arena] [slots] Slot 0 assigned to: Gigazaur
[arena] [slots] Slot 1 assigned to: Alienoid
[arena] [slots] Tokyo Bay: empty
```

### With AI Decisions → Evaluation Enabled
```javascript
// Console shows:
[aiDecisions] [evaluation] Evaluating roll decision for Cyber Bunny
[aiDecisions] [evaluation] Best action: KEEP (score: 8.5)
[aiDecisions] [evaluation] Alternative: REROLL (score: 6.2)
```

## Full Component List

The UI displays all these components (alphabetically):
- Active Player Tile
- Action Menu
  - Buttons
  - Radial
- AI Decisions
  - Tree
  - Evaluation
  - Thought Bubble
- Analysis
  - Win Odds
  - Decision Tree
  - Statistics
- Arena
  - Slots
  - Animations
- Bootstrap
  - Services
  - Config
  - Persistence
- Card Detail Modal
- Deck
- Dice Tray
  - Rolls
  - Animations
- Effect Engine
  - Resolution
  - Passive
- Effect Queue
  - Effects
  - Processing
- Monster Selection
  - Cards
  - Selection
- Monsters Panel
  - Cards
  - Updates
- Pause Overlay
- Player Power Cards Modal
  - Cards
  - Carousel
- Power Cards Panel
  - Cards
  - Shop
  - Purchases
- Roll For First
  - Players
  - Dice
  - Results
- Round Counter
- Save Indicator
- Settings Modal
  - Tabs
  - Sections
  - Scenarios
- Tokyo Yield Modal
  - Decision
- Toolbar
- Turn Service
  - Phases
  - Actions

## Save Behavior

When you click "Save Settings":
1. All debug checkboxes states are collected
2. Combined into hierarchical config object
3. Saved to `settings.debug.componentLogging`
4. Persisted to localStorage
5. Reloaded on page refresh
6. Applied immediately (no restart needed)

## Example Config JSON
```json
{
  "debug": {
    "componentLogging": {
      "bootstrap": true,
      "arena": {
        "slots": true,
        "animations": false
      },
      "diceTray": false,
      "aiDecisions": {
        "tree": true,
        "evaluation": true,
        "thoughtBubble": false
      },
      "powerCardsPanel": {
        "cards": true,
        "shop": false,
        "purchases": true
      }
    }
  }
}
```
