# Yield Advisory Notification Implementation

## Summary
Created a subtle, glass-morphic notification bubble that displays yield advisory information in the bottom-left corner of the screen.

## Changes Made

### 1. New Component: YieldAdvisoryNotification.js
**Location:** `/src/ui/components/YieldAdvisoryNotification.js`

**Features:**
- Displays AI-generated advisory for yield decisions
- Shows actual player/monster names (not p1, p2, etc.)
- Auto-dismisses after 10 seconds
- Manual dismiss via × button
- Automatically hides when player makes yield decision
- Subscribes to store and only shows for human players with pending decisions

### 2. New Styles: components.yield-advisory-notification.css
**Location:** `/css/components.yield-advisory-notification.css`

**Visual Design:**
- **Position:** Fixed at bottom-left with 20px spacing from edges
- **Background:** White at 70% opacity (`rgba(255, 255, 255, 0.7)`)
- **Glass Effect:** Subtle backdrop blur (12px) for glass-morphic appearance
- **Font:** Dark gray (#444) for readability
- **Animations:** Smooth fade-in/fade-out with slide transitions
- **Max Width:** 320px to prevent overly wide notifications

**Responsive Features:**
- Mobile-safe spacing with safe-area-inset support
- Dark mode support with adjusted colors
- Smooth animations (300ms ease)

### 3. Integration
**Files Modified:**
- `/src/bootstrap/index.js` - Added import and initialization
- `/index.html` - Added CSS link

**Initialization:**
```javascript
window.__KOT_YIELD_ADVISORY__ = createYieldAdvisoryNotification(store);
```

## User Experience

### Display Behavior
1. **When Shown:** Appears when a human player has a pending yield decision with advisory
2. **Content Format:**
   ```
   💡 Advisory for [Player Name]
   Suggestion: [Stay in/Leave] [Tokyo City/Tokyo Bay]
   [Reason for suggestion]
   ```
3. **Duration:** 10 seconds auto-dismiss or manual dismiss
4. **Dismissal:** Clicking × button or making yield decision immediately hides it

### Visual Appearance
- Subtle glass-like bubble with blur effect
- Clean, modern design that doesn't obstruct gameplay
- Positioned in bottom-left corner (out of way of main UI)
- Smooth fade animations for non-intrusive appearance/disappearance

## Technical Details

### State Management
- Subscribes to Redux store
- Filters for human players only (excludes CPU/AI)
- Checks for pending decisions and advisory data
- Auto-cleanup when decision is made

### Accessibility
- ARIA labels on dismiss button
- High contrast text for readability
- Dark mode support
- Mobile-safe positioning with safe areas

### Performance
- Single timer for auto-dismiss
- Efficient state subscription with filtered rendering
- Minimal DOM manipulation (innerHTML only when content changes)
