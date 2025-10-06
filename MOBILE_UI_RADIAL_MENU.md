# Mobile UI Mode Feature - Radial Menu Implementation

## Overview
Added a new mobile UI mode setting that allows users to toggle between the classic horizontal action menu and a modern "Radial Menu" radial menu, inspired by Settlers of Catan's mobile interface.

## Features Implemented

### 1. Settings Panel Update
- **Location**: `src/components/settings-panel/settings-panel.component.js`
- Added "Mobile UI Style" radio button group with two options:
  - **Classic**: Traditional horizontal action bar (default)
  - **Radial Menu**: Modern radial menu with corner player cards
- Setting persists via `mobileUIMode` in settings reducer
- Only visible/applicable on mobile devices

### 2. Radial Menu Component
- **Location**: `src/components/radial-menu/radial-menu.component.js`
- **CSS**: `css/components.radial-menu.css`
- Circular radial menu positioned in bottom-right corner
- Touch-friendly circular buttons (64px diameter, matching toggle button)
- Clean, modern SVG icons for each action:
  - Roll (dice icon) - Red gradient
  - Keep (checkmark) - Blue gradient  
  - Accept (double checkmark) - Blue gradient
  - Power Cards (star) - Purple gradient
  - End Turn (document icon) - Green gradient
- Smooth animations with staggered cascading effect
- Buttons positioned in a ring pattern around central toggle
- Auto-collapses after action selection

### 3. Mini Player Cards (Catan-Style)
- **Location**: `src/components/mini-player-card/mini-player-card.component.js`
- **CSS**: `css/components.mini-player-card.css`
- Compact player display cards with Catan-inspired design
- **Always shows all 6 slots** (empty slots appear dimmed)
- Features:
  - Circular profile picture in center (monster headshot)
  - Stats positioned around the profile (ring layout):
    - 🃏 Cards - Top
    - ⚡ Energy - Right  
    - ⭐ Victory Points - Bottom
    - ❤️ Health - Left
  - Player name below card
  - **"ACTIVE" label** above current player's card
  - **Tap profile to collapse/expand** stats (profile stays visible)
- Positioning (all 6 slots):
  - Slot 1: top-left
  - Slot 2: top-center-left
  - Slot 3: top-center-right
  - Slot 4: top-right
  - Slot 5: bottom-left
  - Slot 6: bottom-right
- Click/tap to view full player card in modal
- Active player highlighted with orange border and glow

### 4. Mini Power Cards
- **Location**: `src/components/mini-power-cards/mini-power-cards.component.js`
- **CSS**: `css/components.mini-power-cards.css`
- Compact power card display along bottom of screen (Catan-style resource cards)
- Shows active player's power cards horizontally
- Features:
  - Card name (truncated to 2 lines)
  - Cost badge in top-right corner
  - Effect icons (⭐ VP, ⚡ Energy, ⚔️ Attack, ❤️ Healing)
  - Color-coded by card type:
    - Keep: Blue gradient
    - Discard: Red gradient
    - Evolution: Purple gradient
  - Horizontal scroll for many cards
- Tap card to view full details in modal
- Bottom player cards adjust position to avoid overlap
- Empty state shows "No Power Cards" message

### 5. Mobile UI Mode Synchronization
- **Location**: `src/bootstrap/index.js`
- Added body data attribute `data-mobile-ui-mode` that syncs with settings
- Subscribed to state changes to update attribute dynamically
- Allows CSS to target elements based on current mode

### 6. CSS Overrides
- **Location**: `css/components.mobile-overrides.css`
- Hides monsters panel AND power cards panel when in radial-menu mode
- Replaced by mini player cards and mini power cards components
- Scales down Tokyo slots for better space usage
- Hides horizontal menu and mobile menu button in radial-menu mode
- Shows radial menu, mini player cards, and mini power cards only in radial-menu mode on mobile

### 7. Component Registration
- Added `radialMenu` component to `components.config.json`
- Added `miniPlayerCards` component to `components.config.json`
- Added `miniPowerCards` component to `components.config.json`
- Linked CSS files in `index.html`:
  - `css/components.radial-menu.css`
  - `css/components.mini-player-card.css`
  - `css/components.mini-power-cards.css`

## User Experience

### Classic Mode (Default)
- Horizontal action bar at bottom of screen
- Full monsters panel visible
- Traditional mobile layout
- Familiar interface for existing users

### Radial Menu Mode
- Circular menu button in bottom-right (orange gradient)
- Tap to expand radial action menu
- **6 mini player cards** in corners show at-a-glance stats
  - Tap profile pic to collapse/expand stats
  - Active player marked with "ACTIVE" label
- **Mini power cards** along bottom edge (Catan-style)
  - Horizontal scrollable row
  - Shows active player's cards
- More screen space for gameplay
- Modern, touch-optimized Catan-inspired interface

## Technical Details

### State Management
- Setting stored in `settings.mobileUIMode` (default: 'classic')
- Values: `'classic'` | `'radial-menu'`
- Persists across sessions via localStorage

### Responsive Behavior
- Only applies on mobile breakpoints: `(max-width: 760px), (pointer: coarse)`
- Desktop view unaffected by this setting
- Smooth transitions when changing modes

### CSS Architecture
- Uses `body[data-mobile-ui-mode="radial-menu"]` selector for conditional styling
- Z-index hierarchy maintained (action ring: 9000, mini cards: 6500)
- Mobile-first approach with progressive enhancement

## Files Modified/Created

### New Files
- `src/components/radial-menu/radial-menu.component.js`
- `src/components/mini-player-card/mini-player-card.component.js`
- `css/components.radial-menu.css`
- `css/components.mini-player-card.css`

### Modified Files
- `src/components/settings-panel/settings-panel.component.js`
- `src/bootstrap/index.js`
- `css/components.mobile-overrides.css`
- `components.config.json`
- `index.html`

## Future Enhancements
- Animation for Tokyo slot profile pics
- Haptic feedback on button taps (if supported)
- Customizable action ring positions
- Theme variations for action ring colors
- Accessibility improvements (keyboard navigation, screen reader support)

## Testing Recommendations
1. Test mode switching in settings panel
2. Verify action ring appears correctly on mobile
3. Ensure all actions (Roll, Keep, Accept, Cards, End Turn) work
4. Test mini player cards in corners for 2-6 players
5. Verify player card modal opens on tap
6. Test responsive behavior on various screen sizes
7. Ensure classic mode still works as expected
8. Verify smooth transitions between modes
