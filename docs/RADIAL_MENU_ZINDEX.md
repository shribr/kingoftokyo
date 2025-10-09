# Z-Index Hierarchy for Mobile Radial Menu Mode

## Component Stack (highest to lowest)

### Radial Menu Components (9000+ range)
- **Radial Menu Toggle** - `z-index: 9500`
  - Central toggle button on right edge
  - Highest priority for interaction
  
- **Mini Player Cards** - `z-index: 9400` (container), `9401` (cards)
  - 4 corner positions
  - Second highest for quick player access
  
- **Mini Deck** - `z-index: 9350`
  - Bottom-left vertical text indicator
  
- **Mini Power Cards** - `z-index: 9300`
  - Bottom bar with horizontal scroll
  
### Hidden Components
- **Action Menu Mobile Button** - `z-index: 6700` (inline style)
  - **Hidden via CSS**: `display: none !important; visibility: hidden !important; pointer-events: none !important`
  - Selector: `body[data-mobile-ui-mode="radial-menu"] .action-menu-mobile-btn`
  - Also targeted by ID: `body[data-mobile-ui-mode="radial-menu"] #action-menu-mobile-btn`

## CSS Visibility Rules

All radial menu components are controlled by the `data-mobile-ui-mode` attribute on `<body>`:

### Show Components (radial-menu mode)
```css
body[data-mobile-ui-mode="radial-menu"] .radial-menu-container { display: block; }
body[data-mobile-ui-mode="radial-menu"] .cmp-mini-player-cards { display: block; }
body[data-mobile-ui-mode="radial-menu"] .cmp-mini-power-cards { display: flex; }
body[data-mobile-ui-mode="radial-menu"] .cmp-mini-deck { display: block; }
```

### Hide Components (not radial-menu mode)
```css
body:not([data-mobile-ui-mode="radial-menu"]) .radial-menu-container { display: none; }
body:not([data-mobile-ui-mode="radial-menu"]) .cmp-mini-player-cards { display: none; }
body:not([data-mobile-ui-mode="radial-menu"]) .cmp-mini-power-cards { display: none; }
body:not([data-mobile-ui-mode="radial-menu"]) .cmp-mini-deck { display: none; }
```

## Component Registration (components.config.json)

All components are registered with matching z-index values:
- `radialMenu`: order 91, zIndex 9500
- `miniPlayerCards`: order 95, zIndex 9400
- `miniPowerCards`: order 96, zIndex 9300
- `miniDeck`: order 97, zIndex 9350

## Debug Checklist

If components are not visible:
1. ✅ Check `document.body.getAttribute('data-mobile-ui-mode')` === `'radial-menu'`
2. ✅ Verify components exist in DOM (check DevTools Elements tab)
3. ✅ Check computed `display` style (should not be `none`)
4. ✅ Check z-index in computed styles
5. ✅ Verify no parent has `display: none` or `visibility: hidden`
6. ✅ Check if `action-menu-mobile-btn` is actually hidden
