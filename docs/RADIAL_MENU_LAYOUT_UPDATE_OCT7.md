# Mobile Radial Menu Layout Updates - October 7, 2025

## Changes Implemented

### 1. Mini Player Cards Repositioning
**File:** `css/components.mini-player-card.css`

- **Moved middle cards to sides:** Changed `top-left-title` and `top-right-title` positions
  - `top-left-title`: Now positioned at middle left side (50% vertical, 2vw from left)
  - `top-right-title`: Now positioned at middle right side (50% vertical, 2vw from right) - where radial launcher was
- **Reduced card size for compactness:**
  - Width: 140px → 120px
  - Height: 70px → 60px
  - Profile image: 48px → 40px
  - Reduced padding: 4px 8px → 3px 6px
  - Reduced gap: 6px → 4px
- **Smaller fonts for tighter layout:**
  - Stat font: 9px → 8px
  - Icon font: 10px → 9px
  - Name font: 9px → 8px

### 2. Radial Menu Launcher Repositioning
**File:** `css/components.radial-menu.css`

- **Moved from right edge to bottom layout:** 
  - Old: `top: 50%; right: 2vw; transform: translateY(-50%)`
  - New: `bottom: 2vh; right: calc(70px + 20px + 2vw)` (positioned to the right of mini deck)

### 3. Bottom Layout Order Update
**Files:** `css/components.mini-deck.css`, `css/components.mobile-overrides.css`

**New bottom layout order (left to right):**
1. Mini player card (bottom-left)
2. Dice tray (positioned after left card with spacing)
3. Mini power cards (center)
4. Mini deck (right of power cards)
5. Radial menu launcher (rightmost)
6. Mini player card (bottom-right)

**Updated positions:**
- Dice tray: Updated left calculation to account for new 120px card width
- Mini deck: Repositioned to sit between power cards and radial launcher

### 4. Tokyo Tiles Centering
**File:** `css/components.mobile-overrides.css`

- **Moved Tokyo tiles closer to center** to prevent overlap with repositioned side cards
- City tile: Added `translate(10vw, -5vh)` to move toward center
- Bay tile: Added `translate(-10vw, -5vh)` to move toward center
- Reduced vertical offset: `-15vh` → `-5vh` for better positioning

## Layout Summary

**Top:** 2 mini player cards in corners (top-left, top-right)
**Middle sides:** 2 mini player cards (middle-left, middle-right) - *NEW POSITIONS*
**Center:** Tokyo city/bay tiles (repositioned toward center)
**Bottom:** mini player card → dice → power cards → deck → radial launcher → mini player card

## Testing Recommendations

1. Verify no overlap between side mini player cards and Tokyo tiles
2. Check that all bottom components align properly at 2vh from bottom
3. Ensure radial launcher is accessible and doesn't interfere with other UI
4. Test on various mobile screen sizes for responsive behavior
5. Confirm all mini player card interactions still work correctly