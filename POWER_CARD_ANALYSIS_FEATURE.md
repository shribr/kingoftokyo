# Power Card Analysis Feature

## Overview
Enhanced the Win Odds mini modal with interactive power card analysis capabilities. Players can now select any player row to see detailed information about their owned power cards and available cards for purchase, including projected odds improvements.

## Features Implemented

### 1. Player Row Selection
- **Location**: Win Odds mini modal (table mode)
- **Behavior**: 
  - Click any player row to select them
  - Selected row is highlighted with purple background
  - Click again to deselect
  - Hover effects for better UX

### 2. Owned Cards Analysis
When a player is selected, the insights panel shows:
- **Card List**: All power cards owned by the selected player
- **Individual Contribution**: Each card's contribution to win odds (percentage)
- **Reason**: Why each card provides advantage:
  - Victory Points: "Grants victory points" (1.3× weight)
  - Dice Manipulation: "Dice manipulation advantage" (1.2× weight)
  - Energy: "Energy generation" (1.1× weight)
  - Health/Healing: "Health/survival boost" (1.15× weight)
  - Attack/Damage: "Combat advantage" (1.2× weight)
  - Other: "Strategic advantage" (1.0× weight)

### 3. Available Cards Analysis
Shows all cards currently in the shop with:
- **Odds Improvement**: Projected win odds increase if card is purchased
- **Affordability Indicators**:
  - 💎 (affordable) - player has enough energy
  - 🔒 (locked) - insufficient energy
- **Cost**: Energy required to purchase (⚡ symbol)
- **Effect Type**: Brief description (Victory points, Dice control, Energy boost, etc.)
- **Smart Sorting**: Affordable cards with highest odds improvement shown first

### 4. Purchase Recommendations
- **Best Buy Tip**: Highlights the most valuable affordable card
- **Energy Warning**: Shows how much more energy is needed if best card is unaffordable
- **Two-Column Layout**: Easy comparison of owned vs. available cards

## Technical Implementation

### Files Modified
- `/Users/amischreiber/source/repos/kingoftokyo/src/components/settings-modal/settings-modal.component.js`

### Key Functions Added

#### `renderPowerCardAnalysis(player, odds, state, fontSize2, gap1, gap2, pad1, avgScale)`
Main rendering function for the power card analysis panel.
- Displays player name, current odds, and energy
- Creates two-column grid layout
- Calls analysis functions for owned and available cards
- Shows purchase recommendations

#### `analyzeOwnedCards(player, cards, parts)`
Analyzes player's owned power cards.
- Calculates individual card contributions to win odds
- Determines card benefit type from effect description
- Returns array of card analysis objects with name, contribution %, and reason

#### `analyzeAvailableCards(player, shopCards, playerEnergy, odds, state)`
Analyzes cards available in the shop.
- Creates hypothetical player state with each card added
- Recalculates win odds for each hypothetical scenario
- Determines odds improvement projection
- Checks affordability based on player energy
- Returns sorted array prioritizing affordable high-impact cards

### Data Sources
- **Owned Cards**: `player.powerCards || player.cards || player.hand`
- **Shop Cards**: `state.cards.shop`
- **Player Energy**: `player.energy`
- **Win Odds Engine**: `window.__KOT_WIN_ODDS__.obj.compute()`

## User Experience

### Default View (No Selection)
Shows leadership insights:
- Current leader and their win odds
- Top contributing factors (VP, Health, Energy, Tokyo, Momentum, Power Cards)
- Lead margin over second place

### Selected Player View
- Player-specific power card analysis
- Owned cards with contribution breakdown
- Available cards with projected improvements
- Smart recommendations based on current game state

### Interaction Flow
1. Open Win Odds mini modal
2. Switch to "table" mode if not already
3. Click any player row
4. View detailed power card analysis
5. Compare owned cards vs. shop offerings
6. See which cards would improve odds most
7. Click again to return to leader insights

## Styling
- **Selected Row**: Purple highlight (`rgba(99,102,241,0.15)` background)
- **Owned Cards**: Green theme (`rgba(34,197,94,0.1)`)
- **Affordable Cards**: Blue theme (`rgba(99,102,241,0.15)`)
- **Locked Cards**: Gray theme with reduced opacity
- **Scrollable**: Max height scales with modal size
- **Responsive**: Font sizes and spacing scale with modal dimensions

## Future Enhancements
- Add card combo detection (synergies between owned cards)
- Show historical odds impact when cards were purchased
- Add "simulate purchase" button to preview odds change
- Include AI recommendations for purchase timing
- Show card rarity and special effects
- Add filtering/sorting options for available cards

## Testing Checklist
- [ ] Player row selection works in table mode
- [ ] Owned cards display with correct contributions
- [ ] Available cards show accurate odds projections
- [ ] Affordability indicators work correctly
- [ ] Purchase recommendations appear when applicable
- [ ] Layout scales properly when modal is resized
- [ ] Click to deselect returns to leader insights
- [ ] Works with 0 cards, 1 card, and multiple cards scenarios
- [ ] Energy calculations are correct
- [ ] Card effect detection works for all card types
