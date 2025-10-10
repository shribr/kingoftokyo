# Testing Power Card Analysis Feature

## How to Test

1. **Hard Refresh Browser**
   - Press `Cmd + Shift + R` in Chrome to clear cache
   - Or close and reopen the browser completely

2. **Open Win Odds Modal**
   - Start a game
   - Click the Settings button (⚙️) in the toolbar
   - Go to the "Analytics" tab
   - Click "Show Mini Win Odds" or look for the floating win odds modal

3. **Switch to Table Mode**
   - Click the mode button (top-left of mini modal) until you see the table view
   - You should see player rows with names, odds %, delta, and trend

4. **Select a Player**
   - Click anywhere on a player's row in the table
   - The row should highlight in purple
   - The insights section below should change to show power card analysis

5. **What You Should See**
   - **Player Analysis Header**: Shows player name, win odds %, and energy
   - **Left Column "Your Cards"**: Lists owned power cards with contribution %
   - **Right Column "Available to Buy"**: Lists shop cards with projected odds improvement
   - **Best Buy Tip**: Shows recommendation at the bottom

6. **Check Console**
   - Open Developer Tools (Cmd + Option + I)
   - Look for console logs with prefix `[WIN ODDS]` and `[POWER CARD ANALYSIS]`
   - Should see: "openWinOddsQuickModal called - NEW VERSION WITH POWER CARD ANALYSIS"

## Troubleshooting

### If nothing happens when clicking rows:
1. Check console for errors
2. Verify you're in TABLE mode (not bars, compact, stacked, or monitor)
3. Look for the hint "💡 Tip: Click any player row for power card analysis" at bottom

### If you don't see power cards:
- This is normal if players haven't purchased any cards yet
- Should show "No power cards owned" in left column
- Right column should still show available shop cards

### If shop is empty:
- This is normal if the card shop hasn't been initialized
- Should show "No cards in shop"

## Expected Behavior

### Before Selection:
- Shows leader insights (who's winning and why)
- Lists top 3 contributing factors
- Shows lead margin

### After Selection:
- Switches to two-column power card analysis
- Shows owned cards on left
- Shows available cards on right (sorted by value)
- Cards you can afford have 💎 icon
- Cards you can't afford have 🔒 icon

### Click Again to Deselect:
- Returns to leader insights view
- Purple highlight disappears
