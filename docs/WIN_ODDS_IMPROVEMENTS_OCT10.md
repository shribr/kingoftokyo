# Win Odds Modal Improvements - October 10, 2025

## Changes Made

### 1. Clickable Power Cards
- **Feature**: Power cards in the analysis section now show card detail modal when clicked
- **Implementation**:
  - Added `wo-card-item` class and `data-card-id` attribute to all card divs
  - Added cursor pointer and hover effects (inline for owned cards, dynamic for available cards)
  - Created click event listener on `mini.insights` container using event delegation
  - Dispatches `uiCardDetailOpen(cardId, 'player')` action to show card modal
- **User Experience**: Click any power card to see its full details, effects, and stats

### 2. Larger Header and Close Button
- **Feature**: Modal title and close button significantly increased in size for better visibility
- **Implementation**:
  - `.mini-wo-title`: Increased from 1.1em to 1.4em, letter-spacing from 1px to 1.5px
  - `.mini-wo-btn`: Increased from 1.2em to 1.6em, added padding (4px 8px)
  - `.mini-wo-header`: Increased padding from 6px 8px to 8px 10px
  - Added border-radius and transition to buttons for smoother interaction
- **User Experience**: Title and close button are much more prominent and easier to interact with

### 3. Visual Feedback
- **Owned Cards**: Green-tinted hover effect (rgba(34,197,94,0.2))
- **Available Cards**: Blue/gray-tinted hover effect based on affordability
- **Cursor**: Changes to pointer on hover over any card
- **Transition**: Smooth 0.2s transitions for all hover effects

## Technical Details

### Files Modified
1. **settings-modal.component.js** (lines ~3063-3107):
   - Added `class='wo-card-item'` to owned card divs
   - Added `data-card-id` attribute with card.id
   - Added inline hover effects with onmouseover/onmouseout
   - Added cursor:pointer style

2. **settings-modal.component.js** (lines ~3085-3107):
   - Added `class='wo-card-item'` to available card divs
   - Added `data-card-id` attribute with card.id
   - Added dynamic hover background colors based on affordability
   - Added cursor:pointer style

3. **settings-modal.component.js** (lines ~3590-3605):
   - Added event listener on `mini.insights` container
   - Uses event delegation to catch clicks on `.wo-card-item` elements
   - Extracts `cardId` from `dataset.cardId`
   - Dispatches `uiCardDetailOpen` action through Redux store

4. **components.win-odds-mini.css** (lines 5-10):
   - Increased title font-size and letter-spacing
   - Increased button font-size and padding
   - Added transition effects
   - Increased header padding

## How It Works

### Card Click Flow:
1. User clicks on any power card in the owned or available sections
2. Event bubbles up to `mini.insights` container
3. Event handler checks for closest `.wo-card-item` element
4. Extracts `cardId` from `data-card-id` attribute
5. Dispatches Redux action `uiCardDetailOpen(cardId, 'player')`
6. Card detail modal opens showing full card information

### Visual Feedback:
- Cards change background color on hover
- Cursor changes to pointer indicating clickability
- Smooth transitions for professional feel
- Consistent with other card interactions in the game

## Testing Instructions

1. **Hard refresh the browser**: Cmd+Shift+R (macOS) or Ctrl+Shift+F5 (Windows)
2. **Open Win Odds modal**: Click the graph icon in the toolbar
3. **Test player selection**: Click any player row in the table
4. **Test card clicks**:
   - Click any owned power card (green background) → Card detail modal should open
   - Click any available card (blue/gray background) → Card detail modal should open
   - Verify hover effects work on all cards
   - Verify cursor changes to pointer
5. **Test header**:
   - Verify "WIN ODDS" title is larger and more prominent
   - Verify close button (×) is larger and easier to click
   - Verify header buttons have hover effects

## Browser Compatibility

- Hover effects: All modern browsers
- Event delegation: All modern browsers
- Cursor pointer: All modern browsers
- Transitions: All modern browsers

## Notes

- Card clicks use the same Redux action as other card interactions in the game
- Event delegation pattern ensures performance even with many cards
- Inline hover effects provide immediate visual feedback without CSS complexity
- Header improvements make the modal more user-friendly on all screen sizes
