# Enhanced UI System - King of Tokyo

## Overview
A comprehensive enhancement to the King of Tokyo game UI featuring unified modals, dialogs, power card theming, and an advanced market system. All enhancements maintain backward compatibility with legacy systems.

## Features Added

### 1. AI Decision Tree Button ✨
- **Location**: Main toolbar (sparkle icon)
- **Function**: Opens AI Decision Tree modal showing decision-making process
- **Icon**: Custom 4-pointed star with smaller accent stars
- **Integration**: Unified modal system with theme support

### 2. Unified Modal System 🎨
- **File**: `new-modal-system.js`
- **Features**: Consistent theming, keyboard navigation, ESC to close
- **Modals Enhanced**:
  - Settings modal (with all game options)
  - Game log modal (with filtering)
  - Help modal (with game rules)
  - AI Decision Tree modal
  - About modal

### 3. Power Card Theme System 🃏
- **File**: `components.power-cards-themes.css`
- **Themes Available**:
  - **Original**: Classic game styling
  - **Mystical**: Golden/brown fantasy theme with glowing effects
  - **Tech**: Cyan/holographic sci-fi theme with neon accents
- **Settings Integration**: Live theme preview in settings
- **Persistence**: Theme choice saved to localStorage

### 4. Power Card Market System 🏪
- **File**: `power-card-market.js`
- **Features**:
  - Enhanced card browser with rarity indicators
  - Player resource display (energy, VP, cards)
  - Market controls (refresh, deck info)
  - Card detail modals with purchase options
  - Insufficient energy overlays
- **Access**: Market button (🏪) in power cards panel header
- **Keyboard**: Ctrl/Cmd+M to open market

### 5. Unified Dialog System 💬
- **File**: `unified-dialogs.js`
- **Dialog Types**:
  - **Tokyo Choice Dialog**: Stay/Leave with hero sections and choice cards
  - **Player Death Dialog**: Elimination notification with final stats
  - **Victory Dialog**: Celebration screen with winner details
  - **Card Detail Dialog**: Detailed card view with purchase options
  - **Notification System**: Type-based notifications (info, success, warning, error)
- **Settings Toggle**: Legacy vs Unified dialog system

### 6. Enhanced Integration Layer 🔧
- **File**: `enhanced-integration.js`
- **Features**:
  - Global event handling for game events
  - Keyboard shortcuts (M for market, ESC to close)
  - Theme watching and application
  - Unified notification system
  - Legacy compatibility layer

## UI Components Enhanced

### Power Cards Panel
- **Market Button**: Opens advanced market interface
- **Theme Support**: Dynamic theme application based on settings
- **Enhanced Styling**: Improved visual hierarchy and interactions

### Settings Modal
- **Power Card Theme Selector**: 3 theme options with live preview
- **Dialog System Toggle**: Choose between legacy and unified dialogs
- **UI Enhancements**: Better organization and visual design

### Toolbar
- **AI Decision Button**: Sparkle icon with proper hover effects
- **Consistent Styling**: Unified with other toolbar buttons
- **Accessibility**: Proper focus and keyboard navigation

## Technical Architecture

### CSS Custom Properties
```css
--pc-card-accent: Dynamic theme-based accent colors
--pc-card-bg: Theme-aware background gradients  
--pc-card-border: Consistent border styling
```

### Event System
- Custom events for game interactions
- Unified dialog triggering
- Theme change notifications
- Market actions and feedback

### Settings Integration
```javascript
{
  powerCardTheme: 'original' | 'mystical' | 'tech',
  dialogSystem: 'legacy' | 'unified'
}
```

### Keyboard Shortcuts
- `Ctrl/Cmd + M`: Open Power Card Market
- `ESC`: Close active modal/dialog
- `Tab Navigation`: Full keyboard accessibility

## Files Modified/Created

### New Files
- `src/utils/enhanced-integration.js` - Integration layer
- `src/utils/unified-dialogs.js` - Dialog system
- `src/utils/power-card-market.js` - Market interface
- `css/components.unified-modals.css` - Modal styling
- `css/components.power-cards-themes.css` - Theme system

### Enhanced Files
- `src/components/toolbar/toolbar.component.js` - AI button
- `src/components/power-cards-panel/power-cards-panel.component.js` - Market integration
- `src/utils/new-modals.js` - Enhanced modal content
- `src/bootstrap/index.js` - Integration initialization
- `css/components.power-cards.css` - Market button styling

## Settings Options

### Power Card Theme
- **Original**: Classic game appearance
- **Mystical**: Fantasy-themed with golden accents
- **Tech**: Sci-fi themed with holographic effects

### Dialog System
- **Legacy**: Original game dialogs
- **Unified**: Enhanced themed dialogs with animations

## User Experience Enhancements

### Visual Consistency
- Unified color schemes across all UI elements
- Consistent button styling and hover effects
- Themed animations and transitions

### Accessibility
- Full keyboard navigation support
- Screen reader friendly ARIA labels
- High contrast theme options
- Focus management in modals

### Performance
- Lazy-loaded market system
- Efficient theme switching
- Minimal DOM manipulation
- Cached dialog templates

## Future Extensibility

### Theme System
- Easy addition of new themes via CSS custom properties
- Dynamic theme creation from user preferences
- Theme-aware component styling

### Dialog System
- Template-based dialog creation
- Pluggable dialog types
- Animation system for custom effects

### Market System
- Expandable to other game items
- Wishlist and favorites features
- Advanced filtering and sorting

## Compatibility

### Legacy Support
- All original functionality preserved
- Settings to disable enhanced features
- Graceful fallbacks for unsupported browsers

### Modern Features
- CSS Grid and Flexbox layouts
- ES6+ module system
- Modern event handling
- CSS Custom Properties

## Installation

The enhanced UI system is automatically initialized when the game loads. All features are accessible through:

1. **Settings Modal**: Configure themes and dialog systems
2. **Toolbar**: AI Decision Tree button with sparkle icon
3. **Power Cards Panel**: Market button for advanced shopping
4. **Keyboard Shortcuts**: Quick access to common functions

## Development Notes

- All enhancements maintain the existing game architecture
- CSS-in-JS avoided in favor of modular CSS files
- Event-driven architecture for loose coupling
- Settings persistence via localStorage with store backup
- Comprehensive error handling and fallbacks