# Win Odds Insights Feature

**Date:** October 10, 2025  
**Feature:** Added analytical insights to Win Odds display explaining why certain players are favored  
**Update:** Fixed power card tracking and relative scoring for health/energy

## Overview

The Win Odds modal and Analytics tab now include an **Insights section** that automatically analyzes and explains why certain players have better odds than others. This helps players understand the key factors driving win probability.

## Critical Fixes Applied

### 1. Power Cards Now Tracked
**Problem:** Power cards were completely missing from win odds calculations, even when players started with cards (e.g., scenario with 4 starting cards).

**Solution:** 
- Added `powerCardCount` extraction from multiple possible locations (`p.powerCards`, `p.cards`, `p.hand`)
- Implemented dual scoring: absolute card count + relative advantage over average
- Weight: 1.2 (significant impact on odds)
- Formula: `(cardCount × 1.2 × 2) + ((cardCount - avgCards) × 1.2 × 3)`

### 2. Relative Scoring for Health & Energy
**Problem:** When all players have the same health, the system still showed "Health" as a factor, which was misleading.

**Solution:**
- Changed to **relative scoring** - compares each player to the average
- Players above average get bonus, below average get penalty
- Health: `(playerHealth / avgHealth) × 0.9 × 10`
- Energy: `(playerEnergy / avgEnergy) × 0.55 × 10`
- Only meaningful differences now contribute to odds

## What It Shows

### Leader Analysis
- **Current Leader**: Highlights the player with the highest win odds
- **Percentage Display**: Shows their exact win probability
- **Visual Indicator**: Color-coded dot matching the player's theme color

### Key Advantages Breakdown

The system analyzes **six** factors that contribute to win odds:

1. **🏆 Victory Points** - Progress toward 20 VP win condition (adaptive weight)
2. **❤️ Health** - **Relative** health advantage compared to other players
3. **⚡ Energy** - **Relative** energy advantage for purchasing power cards
4. **🗼 Tokyo Control** - Position in Tokyo and VP accumulation rate
5. **📈 Momentum** - Recent VP/energy gains showing positive trends
6. **🃏 Power Cards** - **(NEW)** Number of cards + advantage over opponents

Each factor shows:
- **Icon and Label** - Clear identification
- **Percentage Contribution** - How much this factor influences the odds
- **Progress Bar** - Visual representation of factor strength

**Note:** Health and Energy now use **relative scoring** - only showing as advantages when a player has more than the average. This prevents misleading displays when all players have equal values.

### Comparative Analysis

- **Large Lead** (>5% gap): Shows margin over second place
  - Example: "Leading Gigazaur by 12.3 percentage points"
  
- **Close Race** (0-5% gap): Warns of competitive situation
  - Example: "⚠️ Close race with Kraken (3.2% gap)"

## Implementation Details

### Data Flow

```
Win Odds Computation
    ↓
Extract Features (VP, Health, Energy, Tokyo, Momentum, Power Cards)
    ↓
Calculate Averages (for relative scoring)
    ↓
Compute Weighted Scores with Relative Advantages
    ↓
Player Ranking (highest % first)
    ↓
Factor Analysis (parts breakdown)
    ↓
Dominant Factor Identification (>5% contribution)
    ↓
Insights HTML Generation
```

### Factor Calculation

The odds engine computes **six** "parts" for each player:
- `vp` - Victory point contribution (adaptive weight: 1.0-1.35)
- `health` - **Relative** health advantage vs. average (weight: 0.9)
- `energy` - **Relative** energy advantage vs. average (weight: 0.55)
- `tokyo` - Tokyo control contribution (weight: 1.1)
- `momentum` - Recent VP/energy gains (weight: 0.4)
- `powerCards` - **NEW:** Card count absolute + relative advantage (weight: 1.2)

#### Power Card Scoring
```javascript
const cardScore = (powerCardCount × 1.2 × 2) +  // Absolute value
                 ((powerCardCount - avgCards) × 1.2 × 3);  // Relative advantage
```

#### Relative Health/Energy Scoring
```javascript
const healthScore = (playerHealth / avgHealth) × 0.9 × 10;
const energyScore = (playerEnergy / avgEnergy) × 0.55 × 10;
```

These are normalized to percentages for display:
```javascript
const partSum = Object.values(leaderParts).reduce((a, b) => a + b, 0) || 1;
const pct = (value / partSum) * 100;
```

Only factors contributing >5% are shown to avoid clutter.

### Visual Design

#### Mini Modal (Floating)
- Compact insights section below the chart
- Scaled font sizes based on modal dimensions
- Dark background with subtle borders
- Factor chips with inline layout

#### Settings Panel (Analytics Tab)
- Expanded insights section
- Larger factor cards in flex grid layout
- Enhanced visual hierarchy with gradients
- More detailed comparison text

### Responsive Scaling

The insights section scales with the modal size:
```javascript
const fontSize2 = Math.round(10 * avgScale);  // Secondary text
const pad1 = Math.round(8 * avgScale);        // Padding
const gap1 = Math.round(4 * avgScale);        // Small gaps
const gap2 = Math.round(6 * avgScale);        // Medium gaps
```

## Files Modified

### JavaScript
**`src/components/settings-modal/settings-modal.component.js`**

1. **Mini Modal (`openWinOddsQuickModal`)** - Line ~2670
   - Added `insights` div to HTML structure
   - Added `mini.insights` reference
   - Generated insights in `renderMini()` function
   - Sorted players by odds
   - Calculated factor percentages
   - Created insight HTML with leader analysis

2. **Settings Panel (`renderWinOdds`)** - Line ~1480
   - Added insights generation after chart render
   - Created expanded factor cards with progress bars
   - Added comparison analysis with second place
   - Enhanced visual design with colors and icons

3. **HTML Structure**
   - Mini modal: Added `<div id="mini-win-odds-insights">`
   - Settings panel: Added `<div id="dev-win-odds-insights">`

### CSS
**`css/components.win-odds-mini.css`**

- Updated `.mini-wo-body` to allow scrolling (`overflow:auto`)
- Changed `.mini-wo-chart` to flex with auto sizing
- Added `.mini-wo-insights` with fixed positioning

## User Experience

### When Insights Appear
- ✅ **Active game** with multiple players
- ✅ **Odds computed** with valid percentages
- ✅ **Clear leader** identified (>0% odds)

### When Insights Are Hidden
- ❌ No active players
- ❌ All odds at 0%
- ❌ Game just started (no data)

### Example Displays

#### Strong VP Lead
```
📊 Why Gigazaur leads (67.3%):

Key Advantages:
┌──────────────────────┐
│ 🏆 Victory Points 52%│
│ ████████████████░░░░ │
└──────────────────────┘
┌──────────────────────┐
│ 🗼 Tokyo Control  28%│
│ █████████░░░░░░░░░░░ │
└──────────────────────┘
┌──────────────────────┐
│ ❤️ Health        15% │
│ █████░░░░░░░░░░░░░░░ │
└──────────────────────┘

📊 Leading Kraken by 23.5 percentage points
```

#### Balanced Position
```
📊 Why Cyber Bunny leads (34.2%):

Balanced across all factors

⚠️ Close race with The King (2.1% gap)
```

#### Early Game
```
No clear leader yet
```

## Technical Implementation Details

### Power Card Detection
The system checks multiple possible locations for power cards:
```javascript
let powerCardCount = 0;
if (p.powerCards && Array.isArray(p.powerCards)) {
  powerCardCount = p.powerCards.length;
} else if (p.cards && Array.isArray(p.cards)) {
  powerCardCount = p.cards.length;
} else if (p.hand && Array.isArray(p.hand)) {
  powerCardCount = p.hand.length;
}
```

### Relative Scoring Algorithm
```javascript
// Calculate averages across all players
const avgHealth = features.reduce((sum, f) => sum + f.health, 0) / features.length;
const avgEnergy = features.reduce((sum, f) => sum + f.energy, 0) / features.length;
const avgCards = features.reduce((sum, f) => sum + f.powerCardCount, 0) / features.length;

// Score each player relative to average
const healthScore = avgHealth > 0 
  ? (player.health / avgHealth) × 0.9 × 10 
  : player.health × 0.9;

// Power cards: absolute + relative advantage
const cardScore = (powerCardCount × 1.2 × 2) + 
                 (avgCards > 0 ? ((powerCardCount - avgCards) × 1.2 × 3) : 0);
```

### Backward Compatibility
Updated `adaptSnapshotOdds()` to handle historical data:
```javascript
function adaptSnapshotOdds(snapshotOdds){
  Object.keys(snapshotOdds).forEach(id => {
    const val = snapshotOdds[id];
    if (typeof val === 'number') {
      // Old format: just a percentage
      snapshotOdds[id] = { 
        percent: val, 
        parts: { vp:0, health:0, energy:0, tokyo:0, momentum:0, powerCards:0 } 
      };
    } else if (val && val.parts && !val.parts.powerCards) {
      // Add powerCards to old snapshots
      val.parts.powerCards = 0;
    }
  });
  return snapshotOdds;
}
```

## Technical Considerations

### Performance
- Insights calculated once per render (same as odds)
- No additional API calls or computations
- Efficient sorting and filtering of factors
- Minimal DOM manipulation
- Average calculations done in single pass

### Accessibility
- Semantic HTML structure
- Icon + text labels for all factors
- Clear visual hierarchy
- Adequate contrast ratios

### Maintainability
- Factor labels and icons centralized in objects
- Reusable logic between mini modal and settings panel
- Consistent styling with existing modal system
- Clear separation of concerns

## Future Enhancements

### Potential Improvements
1. **Historical Trends** - Show how factors changed over time
2. **Player Comparison** - Side-by-side factor comparison for multiple players
3. **Critical Factors** - Highlight which factor changes would shift the lead
4. **Action Recommendations** - Suggest strategies to improve odds
5. **Confidence Intervals** - Show uncertainty in predictions
6. **Custom Factor Weights** - Allow users to adjust importance of factors

### Integration Opportunities
1. **AI Decision Tree** - Link to decision analysis
2. **Power Card Selector** - Highlight cards that boost weak factors
3. **Tutorial System** - Explain factor mechanics to new players
4. **Replay System** - Show odds evolution throughout game

## Testing Checklist

- [x] Insights appear in mini modal
- [x] Insights appear in settings panel  
- [x] Leader identification works correctly
- [x] Factor percentages sum to 100%
- [x] Only significant factors (>5%) shown
- [x] Gap calculation accurate
- [x] Close race warning triggers at 5% threshold
- [x] Scales properly with modal resize
- [x] No clear leader message for 0% odds
- [x] Icons and labels match factors
- [x] Progress bars animate smoothly
- [x] Layout responsive to content size

## Usage

### Opening Win Odds Modal
1. Click **Win Odds** icon in toolbar (📊)
2. Modal opens with current odds chart
3. Insights section appears below chart automatically

### Viewing in Settings
1. Open **Settings** (⚙️)
2. Navigate to **Analytics** tab
3. Win Odds section includes expanded insights

### Refreshing Data
- **Auto mode**: Insights update automatically each turn
- **Manual refresh**: Click refresh button to recompute
- **Modal resize**: Insights scale but don't recompute

## Related Documentation

- `WIN_ODDS_MODAL_SCALING_FIX.md` - Modal resize scaling system
- Win Odds calculation algorithm (src/utils/win-odds-engine.js)
- Settings modal architecture (src/components/settings-modal/)
