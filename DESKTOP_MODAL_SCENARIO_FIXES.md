# Bug Fixes Summary - Desktop Modal & Scenario Indicators

## Issue 1: Desktop Power Cards Modal Not Showing ✅ FIXED

### Problem
When clicking "Power Cards" → "My Power Cards" from the action menu on desktop, the modal was not appearing.

### Root Cause
The `player-cards-modal` component was creating a desktop class `.cmp-player-power-cards-modal`, but there was **no CSS file** defining the styles for this desktop class. Only mobile styles existed in `components.mobile-overrides.css`.

### Solution
Created `/css/components.player-cards-modal.css` with complete desktop styling:
- Fixed position fullscreen backdrop
- Centered modal frame with gold border
- Draggable header (cursor: move)
- Grid layout for cards
- Scrollable body with custom scrollbar
- Proper z-index layering
- Hidden carousel on desktop (carousel is mobile-only)

### Files Modified
- ✅ **Created**: `/css/components.player-cards-modal.css` (new file, 136 lines)
  - Desktop modal container styles
  - Modal frame with gradient background
  - Header with draggable indicator
  - Close button styling
  - Grid layout for cards
  - Empty state message
  - Custom scrollbar

### Testing
- [ ] Click Action Menu → Power Cards → My Power Cards on desktop
- [ ] Modal should appear centered with grid of cards
- [ ] Modal should be draggable by header
- [ ] Close button should work
- [ ] Grid should be responsive

---

## Issue 2: Mobile View Not Reading Scenario Settings

### Problem
Scenario indicators (red asterisks) not appearing on stat tiles in mobile view even when scenarios are assigned in settings.

### Investigation
The code logic appears correct:
1. ✅ Scenarios are stored in `state.settings.scenarioConfig.assignments`
2. ✅ `getPlayerScenarioCategories()` reads assignments correctly
3. ✅ Scenario indicators are rendered in HTML (`data-scenario-health`, etc.)
4. ✅ Update function sets `display: inline` or `display: none` based on categories
5. ✅ No mobile CSS overrides hiding the indicators

### Debugging Added
Added conditional debug logging in `player-profile-card.component.js` line 285:
```javascript
if (window.__KOT_DEBUG__?.logComponentUpdates) {
  console.log('[PlayerProfileCard] Scenario categories for', playerId, ':', scenarioCategories);
}
```

### Files Modified
- ✅ **Modified**: `/src/components/player-profile-card/player-profile-card.component.js`
  - Added debug logging for scenario categories (line 285-287)

### Next Steps for Debugging
1. Enable debug logging: Settings → Dev Tools → Check "Component Updates"
2. Open Settings → Scenarios tab
3. Assign a scenario (e.g., "Energy Hoarder" to Human player)
4. Save settings and close modal
5. Check console for: `[PlayerProfileCard] Scenario categories for <playerId>`
6. Verify that the scenario categories object shows `hasEnergy: true` (or similar)
7. If categories are empty, the issue is in data flow; if populated but indicators don't show, it's a rendering issue

### Possible Root Causes
If indicators still don't appear after debugging:

**A. Redux state not updating:**
- Settings modal not dispatching `SETTINGS_UPDATED` action properly
- `scenarioConfig` not being persisted to state
- Check: `store.getState().settings.scenarioConfig.assignments`

**B. Component not re-rendering:**
- Player profile card not subscribed to settings changes
- Needs to include `'settings'` in `stateKeys` in components.config.json

**C. Selector elements not found:**
- `querySelector('[data-scenario-health]')` returning null
- Elements not rendered in mobile view HTML

**D. CSS specificity issue:**
- Some other rule setting `display: none !important`
- Check computed styles on `.scenario-indicator`

---

## Testing Checklist

### Desktop Modal
- [ ] Action Menu → Power Cards button enabled when player has cards
- [ ] Clicking opens modal in center of screen
- [ ] Modal shows grid of owned power cards
- [ ] Modal is draggable by header
- [ ] Close button works
- [ ] Clicking outside backdrop closes modal
- [ ] Cards show correct info button

### Scenario Indicators
- [ ] Open Settings → Scenarios tab
- [ ] Assign scenario to a player (e.g., "Energy Hoarder" to HUMAN)
- [ ] Click Apply & Close
- [ ] Red asterisk (*) appears on affected stat tile(s)
- [ ] Hovering over asterisk shows tooltip with scenario name
- [ ] Indicators appear in both desktop and mobile views
- [ ] Indicators persist after page refresh
- [ ] Removing scenario makes asterisk disappear

---

## Files Summary

### Created
1. `/css/components.player-cards-modal.css` - Desktop modal styles

### Modified  
1. `/src/components/player-profile-card/player-profile-card.component.js` - Added debug logging for scenarios

### Related Files (No Changes Needed)
- `/src/components/player-cards-modal/player-cards-modal.component.js` - Modal component logic
- `/css/components.mobile-overrides.css` - Mobile modal styles
- `/css/components.player-profile-card.css` - Scenario indicator base styles
- `/src/components/scenarios-tab/scenarios-tab.component.js` - Scenario assignment logic
