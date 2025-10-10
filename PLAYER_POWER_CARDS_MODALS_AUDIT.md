# Player Power Cards Modals - Consolidation Audit

## Current State: 3 Different Modals! 🤯

### Modal 1: `player-cards-modal` (player-cards-modal.component.js)
- **Selector**: `.cmp-player-power-cards-modal` (desktop) / `.cmp-player-power-cards-modal-mobile` (mobile)
- **Component File**: `src/components/player-cards-modal/player-cards-modal.component.js`
- **CSS Files**: `css/components.mobile-overrides.css` (extensive mobile styles)
- **Structure**: 
  ```html
  <div class="cmp-player-power-cards-modal-mobile">
    <div class="ppcm-frame">
      <div class="ppcm-header">...</div>
      <div class="ppcm-body cmp-power-cards-panel">...</div>
    </div>
  </div>
  ```
- **Features**:
  - Draggable on desktop
  - Mobile detection (switches class based on device)
  - Carousel view on mobile with prev/next buttons
  - Grid view on desktop
  - Info button to view card details
  - Responsive design with dedicated mobile CSS
- **Redux Integration**: Listens to `state.ui.playerPowerCards`
- **Registered in**: `config/components.config.json` (lines 123, 419)

### Modal 2: `mini-power-cards-collection` (mini-power-cards-collection.component.js)
- **Selector**: `.cmp-mini-power-cards-collection`
- **Component File**: `src/components/mini-power-cards-collection/mini-power-cards-collection.component.js`
- **CSS Files**: `css/components.mini-power-cards-collection.css`
- **Structure**:
  ```html
  <div class="cmp-mini-power-cards-collection">
    <div class="mpcc-modal">
      <div class="mpcc-header">...</div>
      <div class="mpcc-content">
        <div class="mpcc-card-display">...</div>
        <div class="mpcc-info-panel">
          <div class="mpcc-strategy">...</div>
          <div class="mpcc-combo-tips">...</div>
        </div>
        <div class="mpcc-navigation">...</div>
      </div>
    </div>
  </div>
  ```
- **Features**:
  - Mobile-focused carousel design
  - Strategy tips section
  - Combo suggestions section
  - Prev/Next navigation
  - Mobile-only (isMobile detection)
- **Redux Integration**: Listens to `state.ui.playerPowerCards` (only shows on mobile)
- **Registered in**: `config/components.config.json` (line 139)
- **Issue**: Was causing infinite loop (now fixed)

### Modal 3: Legacy Modal (legacy/main.js)
- **Selector**: `.power-cards-collection-modal`
- **Component File**: `src/legacy/main.js` (lines 2415-2570)
- **Method**: `showPlayerPowerCardsModal(playerId)`
- **Structure**: Old template-based modal
- **Status**: Legacy code, probably not used in new architecture

## Redux Action Flow

All modals listen to the same Redux action:
- **Action**: `uiPlayerPowerCardsOpen(playerId)` 
- **State**: `state.ui.playerPowerCards.playerId`
- **Close Action**: `uiPlayerPowerCardsClose()`

## Trigger Points

1. **Mini Player Card click** (mobile) → `store.dispatch(uiPlayerPowerCardsOpen(player.id))`
2. **Player Profile Card** (cards stat tile) → `store.dispatch(uiPlayerPowerCardsOpen(playerId))`
3. **Action Menu** (cards button) → `eventBus.emit('ui/modal/showPlayerPowerCards')` → converts to Redux action
4. **Mini Power Cards component** → `store.dispatch(uiPlayerPowerCardsOpen(playerId))`

## Problem

When clicking mini player cards on mobile, **BOTH Modal 1 AND Modal 2 open simultaneously** because:
- Both components are registered and built
- Both subscribe to `state.ui.playerPowerCards`
- Both detect mobile and show themselves
- We temporarily modified the code to show both side-by-side for comparison

## Recommendation: Keep Modal 1 (`player-cards-modal`)

**Reasons:**
1. ✅ **More mature** - Has both desktop and mobile implementations
2. ✅ **Better tested** - Extensive CSS in mobile-overrides.css
3. ✅ **More flexible** - Grid view (desktop) + Carousel (mobile)
4. ✅ **Properly integrated** - Listed twice in components.config.json
5. ✅ **Feature complete** - Draggable, info buttons, proper close handlers
6. ✅ **Simpler class names** - `.cmp-player-power-cards-modal-mobile` vs `.cmp-mini-power-cards-collection`

**Modal 2 Advantages (if we wanted to keep it instead):**
- Strategy tips section
- Combo suggestions section
- Cleaner dedicated mobile design

## Proposed Action Plan

### Option A: Remove Modal 2 (mini-power-cards-collection) ⭐ RECOMMENDED
1. Remove `mini-power-cards-collection` component from `components.config.json`
2. Delete `src/components/mini-power-cards-collection/` directory
3. Delete `css/components.mini-power-cards-collection.css`
4. Update mini-player-card click handler to only use Modal 1
5. Keep all existing Redux actions and state structure

### Option B: Remove Modal 1, Keep Modal 2
1. Remove `player-cards-modal` entries from `components.config.json`
2. Delete `src/components/player-cards-modal/` directory
3. Remove `.cmp-player-power-cards-modal*` CSS from `components.mobile-overrides.css`
4. Update all references to use mini-power-cards-collection
5. May need to add desktop support to Modal 2

### Option C: Merge Best Features
1. Keep Modal 1 as base
2. Add Strategy/Combo tips sections to Modal 1's mobile view
3. Delete Modal 2

## Implementation: Option A (Remove mini-power-cards-collection)

```javascript
// In mini-player-card.component.js - simplified click handler
const clickHandler = (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // Always use the same modal (player-cards-modal handles mobile/desktop automatically)
  store.dispatch(uiPlayerPowerCardsOpen(player.id));
};
```

No need for mobile detection or multiple modal checks - Modal 1 already handles everything!
