# Power Card Analysis - Auto-Select Fix

## What Changed

### Before:
- Win odds modal showed "leader insights" by default (why they're winning, top factors)
- Had to manually click a player row to see power card analysis
- No visual indication that rows were clickable

### After:
- **Leader is automatically selected** when modal opens
- **Power card analysis shows immediately** for the leading player
- Selected player's row is highlighted with:
  - Bright purple background
  - 👉 emoji indicator
  - Thick border
- Click any other row to switch to that player's analysis
- Click the selected row again to... (currently toggles selection off)

## Current Behavior

1. **Modal Opens**:
   - Leader automatically selected
   - Their power card analysis displayed immediately
   - Shows owned cards (left column) and available shop cards (right column)

2. **In Table Mode**:
   - Leader's row highlighted with purple background and 👉
   - Other rows show hover effect
   - Click any row to switch analysis to that player

3. **Power Card Analysis Shows**:
   - Player name, win odds %, energy
   - **Left**: Owned cards with individual contribution to odds
   - **Right**: Available shop cards with projected odds improvement
   - Best buy recommendation at bottom
   - Affordability indicators (💎 can afford, 🔒 too expensive)

## How to Test

1. **Start web server**: `python3 -m http.server 8000`
2. **Open**: `http://localhost:8000/index.html`
3. **Hard refresh**: `Cmd + Shift + R`
4. **Start a game**
5. **Open Win Odds modal** (Settings → Analytics → Show Mini Win Odds)
6. **Switch to table mode**

### What You Should See Immediately:
- Leader's row has purple background with 👉
- Bottom panel shows power card analysis (NOT factor insights)
- Two columns: "Your Cards" and "Available to Buy"

### If No Power Cards Yet:
- Left column shows: "No power cards owned"
- Right column should still show shop cards (if any)
- This is normal early in game

### Console Logs to Look For:
```
[WIN ODDS] ===== openWinOddsQuickModal called - NEW VERSION WITH POWER CARD ANALYSIS =====
[WIN ODDS] Mini object created: {hasChart: true, ...}
[WIN ODDS] Setting up click handler on chart element
[WIN ODDS] Rendering insights, selectedPlayer: null
[WIN ODDS] Auto-selected leader: p1
[WIN ODDS] Rendering power card analysis for: [player name]
[POWER CARD ANALYSIS] Starting analysis for player: {...}
[POWER CARD ANALYSIS] Player cards: [...]
[POWER CARD ANALYSIS] Shop cards: [...]
```

## Debugging

If still showing old "leader insights" instead of power card analysis:

1. **Check console** - should see "Auto-selected leader: [id]"
2. **Check selectedPlayer** - run in console:
   ```javascript
   // Find the mini modal
   const mini = Array.from(document.querySelectorAll('#mini-win-odds-floating'))
   console.log('Modal found:', mini.length > 0)
   ```

3. **Force re-render** - run in console:
   ```javascript
   window.dispatchEvent(new CustomEvent('open-win-odds-modal'))
   ```

4. **Check if renderPowerCardAnalysis is defined**:
   ```javascript
   // Should not show error
   console.log(window.__KOT_WIN_ODDS__)
   ```

## Expected UI

### Power Card Analysis Panel:
```
🃏 [Player Name]'s Power Card Analysis
Win Odds: 45.2% • Energy: ⚡8

┌─────────────────────────┬─────────────────────────┐
│ ✅ Your Cards (3)       │ 💰 Available to Buy     │
├─────────────────────────┼─────────────────────────┤
│ Giant Brain             │ 💎 Energy Drink         │
│ +2.4%                   │ +3.1%                   │
│ Dice manipulation       │ Energy boost • ⚡3       │
├─────────────────────────┼─────────────────────────┤
│ Armor Plating           │ 💎 Extra Head           │
│ +1.8%                   │ +2.8%                   │
│ Health/survival boost   │ Dice control • ⚡5       │
├─────────────────────────┼─────────────────────────┤
│ Fire Breathing          │ 🔒 Shrink Ray           │
│ +1.5%                   │ +1.2%                   │
│ Combat advantage        │ Combat • ⚡7             │
└─────────────────────────┴─────────────────────────┘

💡 Best Buy: Energy Drink (+3.1% odds)
```

This should now be visible **immediately** when you open the modal!
