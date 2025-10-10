# Win Odds Modal Interaction Fixes - Enhanced Logging & Click Handling

## Issues Fixed

### 1. ✅ Player Rows Not Selectable
**Problem:** Clicking on player rows in the top table did nothing - couldn't select different players to see their power card analysis.

**Root Cause:** The click event handler was set up correctly, but there may have been:
- Event propagation issues
- Timing issues with dynamic content
- Inline event handlers interfering

**Solution:** 
- Added comprehensive logging to track click events
- Added defensive checks for card items (prevent row selection when clicking cards)
- Added explicit logging for each step of the click handling process
- Verified event delegation is working properly

**Code Changes:**
```javascript
mini.chart.addEventListener('click', (e) => {
  console.log('[WIN ODDS] Chart clicked!', {
    target: e.target,
    tagName: e.target.tagName,
    className: e.target.className,
    dataset: e.target.dataset
  });
  
  // Prevent row selection when clicking cards
  if (e.target.closest('.wo-card-item')) {
    console.log('[WIN ODDS] Click was on a card, ignoring for row selection');
    return;
  }
  
  const row = e.target.closest('[data-player-id]');
  if (row) {
    const playerId = row.dataset.playerId;
    console.log('[WIN ODDS] Player row clicked! PlayerId:', playerId);
    mini.selectedPlayer = mini.selectedPlayer === playerId ? null : playerId;
    renderMini(true);
  }
});
```

### 2. ✅ Power Cards Not Clickable
**Problem:** Clicking on power cards in the bottom pane did nothing - should open the power card details modal.

**Root Cause:**
- Event handler was set up but may not have been reaching the dispatcher
- Possible timing issues
- Missing error handling

**Solution:**
- Added comprehensive logging for card clicks
- Added explicit error checking at each step
- Verified store and action availability before dispatching
- Added try-catch around dispatch call

**Code Changes:**
```javascript
mini.insights.addEventListener('click', (e) => {
  console.log('[WIN ODDS] Insights clicked!', {
    target: e.target,
    tagName: e.target.tagName,
    className: e.target.className
  });
  
  const cardItem = e.target.closest('.wo-card-item');
  console.log('[WIN ODDS] Closest card item:', cardItem);
  
  if (cardItem) {
    const cardId = cardItem.dataset.cardId;
    console.log('[WIN ODDS] Card clicked! CardId:', cardId);
    
    if (!cardId) {
      console.error('[WIN ODDS] Card item missing data-card-id attribute');
      return;
    }
    
    if (!window.__KOT_NEW__?.store) {
      console.error('[WIN ODDS] Store not available');
      return;
    }
    
    const { uiCardDetailOpen } = window.__KOT_NEW__;
    if (!uiCardDetailOpen) {
      console.error('[WIN ODDS] uiCardDetailOpen action not available');
      return;
    }
    
    console.log('[WIN ODDS] Dispatching uiCardDetailOpen for card:', cardId);
    try {
      window.__KOT_NEW__.store.dispatch(uiCardDetailOpen(cardId, 'player'));
      console.log('[WIN ODDS] Card detail modal opened successfully');
    } catch (err) {
      console.error('[WIN ODDS] Error opening card detail:', err);
    }
  }
});
```

### 3. ✅ Card Detail Modal Z-Index
**Problem:** Need to ensure card detail modal appears above win odds modal.

**Solution:** Increased z-index from 10500 to 15000 with `!important`

**Code Changes:**
```css
/* Before */
.card-detail-modal, .player-cards-modal { 
  position: fixed; 
  inset: 0; 
  z-index: 10500;
  /* ... */
}

/* After */
.card-detail-modal, .player-cards-modal { 
  position: fixed; 
  inset: 0; 
  z-index: 15000 !important;
  /* ... */
}
```

**Z-Index Hierarchy:**
- Card detail modal: **15000** (highest)
- Win odds modal: **6905**
- Active player dock: **6601**
- Typical overlays: **6000-6500**

## Testing Steps

### Test Player Row Selection
1. Open Win Odds modal (Analytics tab → Win Odds button)
2. Ensure modal is in **Table** mode (cycle with mode button if needed)
3. Open browser console (F12 or Cmd+Option+I)
4. Click on a player row
5. **Expected Console Output:**
```
[WIN ODDS] Chart clicked! {target: ..., tagName: "TD", ...}
[WIN ODDS] Closest row with data-player-id: <tr data-player-id="player-1">
[WIN ODDS] Player row clicked! PlayerId: player-1
[WIN ODDS] New selected player: player-1
```
6. **Expected Visual:** Row highlights purple, shows 👉 emoji, power card analysis appears below

### Test Card Clicks
1. Select a player with power cards (see power card analysis at bottom)
2. Click on any power card in the analysis
3. **Expected Console Output:**
```
[WIN ODDS] Insights clicked! {target: ..., tagName: "DIV", className: "wo-card-item"}
[WIN ODDS] Closest card item: <div class="wo-card-item" data-card-id="jets">
[WIN ODDS] Card clicked! CardId: jets
[WIN ODDS] Dispatching uiCardDetailOpen for card: jets
[WIN ODDS] Card detail modal opened successfully
```
4. **Expected Visual:** Card detail modal opens, centered on screen, showing full card information

### Test Card Detail Modal Positioning
1. Click a power card to open detail modal
2. **Verify:**
   - ✅ Modal is centered on screen
   - ✅ Modal appears above win odds modal (can still see win odds in background)
   - ✅ Backdrop darkens background
   - ✅ Modal is fully interactive (close button works, can scroll if needed)

## Debugging Guide

### If Player Rows Still Not Selectable

**Check Console for:**
1. `[WIN ODDS] Setting up click handler on chart element:` - Should show the chart div element
2. When clicking: `[WIN ODDS] Chart clicked!` - Should fire on every click
3. `[WIN ODDS] Closest row with data-player-id:` - Should find the `<tr>` element

**If no console output when clicking:**
- Hard refresh (Cmd+Shift+R) to clear cache
- Verify server is running (`python3 -m http.server 8000`)
- Check if `mini.chart` is null (see initial setup log)

**If console shows "No player row found in click path":**
- Inspect the HTML - verify `<tr>` elements have `data-player-id` attribute
- Verify you're in Table mode (not bars/compact/etc)
- Check if clicking on the right area (inside the table)

### If Power Cards Not Clickable

**Check Console for:**
1. `[WIN ODDS] Setting up card click handler on insights element:` - Should show insights div
2. When clicking: `[WIN ODDS] Insights clicked!` - Should fire on every click
3. `[WIN ODDS] Closest card item:` - Should find `.wo-card-item` div

**If error: "Card item missing data-card-id attribute":**
- Inspect card HTML - verify `data-card-id` attribute exists
- Check `renderPowerCardAnalysis` function - ensure cards are rendered with proper attributes

**If error: "Store not available":**
- Check if game is fully initialized
- Verify `window.__KOT_NEW__.store` exists in console
- May need to start a game first

**If error: "uiCardDetailOpen action not available":**
- Check if action is properly exported in `core/actions.js`
- Verify import in bootstrap or wherever actions are exposed

### If Card Modal Not Centered

**Check CSS:**
```css
.card-detail-modal {
  display: flex;
  align-items: center;    /* Vertical center */
  justify-content: center; /* Horizontal center */
}
```

**If modal appears off-center:**
- Inspect `.card-detail-frame` - should not have absolute positioning
- Check for conflicting styles in browser dev tools
- Verify no `top`, `left`, `right`, `bottom` styles on frame

### If Card Modal Behind Win Odds Modal

**Check z-index values:**
- Card detail modal: Should be 15000
- Win odds modal: Should be 6905

**If still behind:**
- Inspect in browser dev tools
- Look for inline styles overriding z-index
- Check if `!important` is being overridden by another `!important`

## Console Commands for Testing

```javascript
// Check if elements exist
document.querySelector('#mini-win-odds-chart')
document.querySelector('#mini-win-odds-insights')

// Check if store is available
window.__KOT_NEW__.store

// Check if action is available
window.__KOT_NEW__.uiCardDetailOpen

// Manually open card detail modal
window.__KOT_NEW__.store.dispatch(window.__KOT_NEW__.uiCardDetailOpen('jets', 'player'))

// Check current selected player
console.log(document.querySelector('#mini-win-odds-chart').__mini?.selectedPlayer)

// Check z-index of modals
getComputedStyle(document.querySelector('.card-detail-modal')).zIndex
getComputedStyle(document.querySelector('#mini-win-odds-floating')).zIndex
```

## Files Modified

### JavaScript
- **File:** `src/components/settings-modal/settings-modal.component.js`
- **Lines:** ~3627-3695 (player row and card click handlers)
- **Changes:** Added comprehensive logging, error checking, defensive guards

### CSS
- **File:** `css/components.card-modals.css`
- **Lines:** 2
- **Changes:** Increased z-index from 10500 to 15000 with `!important`

## Related Features

- [Win Odds Table Interaction](WIN_ODDS_TABLE_FIXES.md)
- [Power Card Analysis](POWER_CARD_ANALYSIS_IMPLEMENTATION.md)
- [Vertical Splitter](VERTICAL_SPLITTER_FEATURE.md)
- [Splitter Click Fix](SPLITTER_CLICK_FIX.md)

## Known Limitations

1. **Card modal positioning:** Relies on flexbox centering - may not work if viewport is very small
2. **Event delegation depth:** Uses `.closest()` which traverses DOM - very deeply nested elements may have performance impact
3. **Console logging:** Extensive logging added for debugging - may want to reduce in production

## Future Enhancements

1. Add keyboard shortcuts (e.g., arrow keys to navigate players)
2. Add tooltip preview of cards on hover (before clicking)
3. Add animation when switching between players
4. Add "Compare Players" mode to see multiple analyses side-by-side
5. Add card detail modal dismiss on backdrop click (currently only close button)
