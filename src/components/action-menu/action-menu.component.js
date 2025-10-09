/**
 * Action Menu Component
 * MIGRATED: Legacy classes (.action-menu, .draggable, .btn) replaced.
 * Styles now sourced from css/components.action-menu.css + button tokens.
 * Pending: prune unused legacy .action-menu and draggable selectors.
 */
import { eventBus } from '../../core/eventBus.js';
import { store } from '../../bootstrap/index.js';
import { nextTurn, diceSetAllKept, uiPlayerPowerCardsOpen } from '../../core/actions.js';
import { createPositioningService } from '../../services/positioningService.js';

// When the mobile action menu is opened (toggled visible), shift it 100px further left
// to satisfy requirement: "x coordinates of the menu should decrease by 100px".
// We measure post-layout and then convert from right-anchored positioning to an explicit left value
// so width remains unchanged (pure translation) and we clamp to viewport (>= 0px).
const MOBILE_MENU_OPEN_SHIFT_X = 160; // px (updated per requirement to shift further left)

export function build({ selector }) {
  const checkMobile = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobileWidth = width <= 760;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isLandscapeMobile = (width <= 1024 && height <= 768 && isTouchDevice);
    return isMobileWidth || isTouchDevice || (isLandscapeMobile && width < 900);
  };
  const root = document.createElement('div');
  root.id = 'action-menu';
  root.className = 'cmp-action-menu cmp-panel-root';
  root.setAttribute('data-am-root','true');
  root.setAttribute('data-panel','action-menu');
  root.setAttribute('data-draggable','true');
  root.setAttribute('data-layout','vertical');
  root.dataset.amDockState = 'docked';
  root.innerHTML = `
    <div class="am-header-row">
      <div class="am-label" aria-hidden="true">
      <span>ACTIONS</span>
      <button class="am-collapse-toggle" aria-label="Expand/Collapse Actions" type="button">
        <span class="arrow-up">▲</span>
        <span class="arrow-down">▼</span>
      </button>
      </div>
    </div>
    <div class="am-content" data-collapsed="false">
    <button id="roll-btn" data-action="roll" class="k-btn k-btn--primary">ROLL</button>
    <button id="keep-btn" data-action="keep" class="k-btn k-btn--secondary" disabled>KEEP ALL</button>
    <button id="accept-dice-btn" data-action="accept-dice" class="k-btn k-btn--secondary" disabled>ACCEPT DICE RESULTS</button>
    <div class="power-cards-menu-container">
  <button id="power-cards-btn" data-action="power-cards" class="k-btn k-btn--secondary power-cards-btn" disabled>
        <span class="arrow-left">◀</span>
        <span class="btn-text">POWER CARDS</span>
        <span class="arrow-right">▶</span>
      </button>
      <div class="power-cards-submenu" data-submenu hidden>
        <button id="show-my-cards-btn" data-action="show-my-cards" class="k-btn k-btn--xs">MY CARDS<span class="my-cards-count" data-my-cards-count></span></button>
        <button id="flush-btn" data-action="flush" class="k-btn k-btn--xs" disabled>FLUSH CARDS (2⚡)</button>
      </div>
    </div>
  <button id="end-turn-btn" data-action="end" class="k-btn k-btn--secondary" style="border:none;box-shadow:none;" disabled>END TURN</button>
    </div>`;
  // Cache frequently accessed elements to reduce querySelector churn
  const __refs = new Map();
  function $(sel) { if (__refs.has(sel)) return __refs.get(sel); const el = root.querySelector(sel); __refs.set(sel, el); return el; }
  
  // Ensure active player bubble (avatar + name) exists - ALWAYS create it, not just in mobile
  let bubble = document.getElementById('active-player-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'active-player-bubble';
    bubble.className = 'active-player-bubble';
    bubble.innerHTML = `<div class="apb-avatar" aria-label="Active Player"></div><div class="apb-name" data-apb-name></div>`;
    Object.assign(bubble.style, {
      position:'fixed', top:'1vh', left:'1vw', transform:'none',
      display:'flex', flexDirection:'row', alignItems:'center', gap:'1vw',
      padding:'0.6vh 1vw 0.6vh 0.6vw', background:'linear-gradient(135deg,#2d3436,#1b1f20)',
      border:'3px solid #000', borderRadius:'40px', boxShadow:'0 0.4vh 1.2vh rgba(0,0,0,0.35)', zIndex:'6700',
      fontFamily:'Bangers,cursive', letterSpacing:'1px', cursor:'pointer'
    });
    const avatarEl = bubble.querySelector('.apb-avatar');
    Object.assign(avatarEl.style, {
      width:'4.8vh', height:'4.8vh', borderRadius:'50%',
      /* White background behind monster/player image */
      background:'#fff center/cover no-repeat',
      border:'3px solid #000', boxShadow:'0.2vh 0.2vh 0 #000',
      overflow:'hidden', position:'relative'
    });
    const nameEl = bubble.querySelector('[data-apb-name]');
    Object.assign(nameEl.style, { color:'#fff', fontSize:'1.8vh', maxWidth:'12vw', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' });
    document.body.appendChild(bubble);

    // Toggle modal for full player card (open if closed, close if open)
    const toggleFullCardModal = () => {
      try {
        const existing = document.getElementById('apb-player-card-modal');
        if (existing) { existing.remove(); return; }
        const activeCard = document.querySelector('.cmp-player-profile-card.is-active, .cmp-player-profile-card[data-in-active-dock="true"]');
        if (!activeCard) return;
        const overlay = document.createElement('div');
        overlay.id = 'apb-player-card-modal';
        overlay.setAttribute('data-apb-modal','');
        overlay.setAttribute('role','dialog');
        overlay.setAttribute('aria-modal','true');
        overlay.setAttribute('aria-label','Active Player Card');
        Object.assign(overlay.style, { position:'fixed', inset:'0', background:'rgba(0,0,0,0.65)', zIndex:'9000', display:'flex', alignItems:'center', justifyContent:'center', padding:'3vh' });
        const cardClone = activeCard.cloneNode(true);
        cardClone.style.transform = 'scale(.95)';
        cardClone.style.position = 'static';
        cardClone.style.left = cardClone.style.top = '';
        cardClone.removeAttribute('data-in-active-dock');
        overlay.appendChild(cardClone);
        const close = (ev) => { if (ev.target === overlay) { overlay.removeEventListener('click', close); overlay.remove(); } };
        overlay.addEventListener('click', close);
        document.body.appendChild(overlay);
      } catch(_) {}
    };
    bubble.addEventListener('click', toggleFullCardModal);
  }
  
  const setupMobile = () => {
    const isMobile = checkMobile();
    if (isMobile) {
      // Hide the original vertical menu (desktop layout)
      root.style.display = 'none';
      
      // Create or reuse radial action buttons container
      let radialContainer = document.getElementById('radial-action-menu');
      if (!radialContainer) {
        radialContainer = document.createElement('div');
        radialContainer.id = 'radial-action-menu';
        radialContainer.className = 'radial-action-menu';
        radialContainer.setAttribute('data-mobile-menu', 'true');
        radialContainer.setAttribute('data-expanded', 'false');
        
        // Apply saved corner preference or default to right
        const savedCorner = store.getState().settings?.mobileMenuCorner || 
                           (typeof localStorage !== 'undefined' && localStorage.getItem('kot_mobile_corner')) || 
                           'right';
        radialContainer.setAttribute('data-corner', savedCorner);
        
        // Create individual circular action buttons
        const buttons = [
          { id: 'r-roll-btn', action: 'roll', label: 'ROLL', class: 'r-btn-primary', icon: '🎲' },
          { id: 'r-keep-btn', action: 'keep', label: 'KEEP', class: 'r-btn-secondary', icon: '✓', disabled: true },
          { id: 'r-accept-dice-btn', action: 'accept-dice', label: 'ACCEPT', class: 'r-btn-secondary', icon: '✓✓', disabled: true },
          { id: 'r-power-cards-btn', action: 'power-cards', label: 'CARDS', class: 'r-btn-secondary', icon: '<svg viewBox="0 0 24 24" width="3.5vh" height="3.5vh"><rect x="5" y="6" width="8" height="11" rx="1" fill="white" stroke="currentColor" stroke-width="1.5" transform="rotate(-12 9 11.5)"/><rect x="11" y="6" width="8" height="11" rx="1" fill="white" stroke="currentColor" stroke-width="1.5" transform="rotate(12 15 11.5)"/></svg>', disabled: true },
          { id: 'r-end-turn-btn', action: 'end', label: 'END', class: 'r-btn-secondary', icon: '⏭', disabled: true }
        ];
        
        buttons.forEach((btn, index) => {
          const button = document.createElement('button');
          button.id = btn.id;
          button.className = `radial-action-btn ${btn.class}`;
          button.setAttribute('data-action', btn.action);
          button.setAttribute('data-index', index);
          if (btn.disabled) button.disabled = true;
          button.innerHTML = `
            <div class="r-btn-icon">${btn.icon}</div>
            <div class="r-btn-label">${btn.label}</div>
          `;
          radialContainer.appendChild(button);
        });
        
        document.body.appendChild(radialContainer);
        
        // Store reference for later cleanup
        root._radialContainer = radialContainer;
        
        // Initialize carousel state
        let currentActiveIndex = 0;
        const totalButtons = buttons.length;
        
        // Function to update active button
        const setActiveButton = (index) => {
          const buttons = radialContainer.querySelectorAll('.radial-action-btn');
          buttons.forEach((btn, i) => {
            if (i === index) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          });
          currentActiveIndex = index;
        };
        
        // Set initial active button (first one - ROLL)
        setActiveButton(0);
        
        // Touch/scroll navigation
        let touchStartY = 0;
        let touchStartX = 0;
        
        radialContainer.addEventListener('touchstart', (e) => {
          touchStartY = e.touches[0].clientY;
          touchStartX = e.touches[0].clientX;
        }, { passive: true });
        
        radialContainer.addEventListener('touchmove', (e) => {
          if (!touchStartY || !touchStartX) return;
          
          const touchEndY = e.touches[0].clientY;
          const touchEndX = e.touches[0].clientX;
          const diffY = touchStartY - touchEndY;
          const diffX = touchStartX - touchEndX;
          
          // Determine if swipe is more vertical or horizontal
          if (Math.abs(diffY) > Math.abs(diffX)) {
            // Vertical swipe
            if (Math.abs(diffY) > 30) { // Threshold for swipe
              if (diffY > 0) {
                // Swipe up - go to next button
                currentActiveIndex = (currentActiveIndex + 1) % totalButtons;
              } else {
                // Swipe down - go to previous button
                currentActiveIndex = (currentActiveIndex - 1 + totalButtons) % totalButtons;
              }
              setActiveButton(currentActiveIndex);
              touchStartY = touchEndY; // Reset for continuous swiping
            }
          }
        }, { passive: true });
        
        radialContainer.addEventListener('touchend', () => {
          touchStartY = 0;
          touchStartX = 0;
        }, { passive: true });
        
        // Mouse wheel navigation
        radialContainer.addEventListener('wheel', (e) => {
          e.preventDefault();
          
          if (e.deltaY > 0) {
            // Scroll down - go to next button
            currentActiveIndex = (currentActiveIndex + 1) % totalButtons;
          } else {
            // Scroll up - go to previous button
            currentActiveIndex = (currentActiveIndex - 1 + totalButtons) % totalButtons;
          }
          setActiveButton(currentActiveIndex);
        }, { passive: false });
        
        // Keyboard navigation on radial container
        radialContainer.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
              // Up or Right - go to next button (moves up/right on the arc)
              currentActiveIndex = (currentActiveIndex + 1) % totalButtons;
            } else {
              // Down or Left - go to previous button (moves down/left on the arc)
              currentActiveIndex = (currentActiveIndex - 1 + totalButtons) % totalButtons;
            }
            setActiveButton(currentActiveIndex);
          } else if (e.key === 'Enter' || e.key === ' ') {
            // Enter or Space - click the active button
            e.preventDefault();
            const activeBtn = radialContainer.querySelector('.radial-action-btn.active');
            if (activeBtn && !activeBtn.disabled) {
              activeBtn.click();
            }
          }
        });
        
        // Make radial container focusable
        radialContainer.setAttribute('tabindex', '0');
        radialContainer.style.outline = 'none'; // Hide focus outline since buttons show active state
        
        // Store carousel functions for external access
        radialContainer._setActiveButton = setActiveButton;
        radialContainer._getCurrentActiveIndex = () => currentActiveIndex;
      }
      
      // Set initial collapsed state (all buttons hidden behind the toggle button)
      const buttons = radialContainer.querySelectorAll('.radial-action-btn');
      buttons.forEach((btn, index) => {
        btn.style.transform = 'translate(0, 0) scale(0)'; // Hidden - scale 0
        btn.style.opacity = '0'; // Completely hidden
        btn.style.zIndex = 6699; // All on same level
      });
      
      // Function to calculate and apply radial positions with "clock hand sweep" animation
      const applyRadialPositions = (expanded = false) => {
        const buttons = radialContainer.querySelectorAll('.radial-action-btn');
        const radius = 16; // vh units - reduced for easier thumb access
        
        // Check which corner we're in
        const corner = radialContainer.getAttribute('data-corner') || 'right';
        
        // Clock positions: Start at 9 o'clock (180°) and go clockwise
        // For right corner: 180° (9 o'clock) → 270° (12 o'clock)
        // For left corner: 90° (6 o'clock) → 180° (9 o'clock)
        let startAngle, endAngle;
        
        if (corner === 'left') {
          // Left corner: 6 o'clock to 9 o'clock (90° to 180°)
          startAngle = 90;
          endAngle = 180;
        } else {
          // Right corner: 9 o'clock to 12 o'clock (180° to 270°)
          startAngle = 180;
          endAngle = 270;
        }
        
        const angleStep = (endAngle - startAngle) / (buttons.length - 1);
        
        buttons.forEach((btn, index) => {
          if (expanded) {
            // Calculate final position on arc (clock hand positions)
            const angle = (startAngle + (angleStep * index)) * (Math.PI / 180);
            const x = Math.cos(angle) * radius; // vh units
            const y = Math.sin(angle) * radius; // vh units
            
            // Store position as CSS custom properties
            btn.style.setProperty('--tx', `${x}vh`);
            btn.style.setProperty('--ty', `${y}vh`);
            
            // Staggered "drop off" animation - each button appears and moves to its clock position
            const delay = index * 50; // ms - 50ms between each button drop
            setTimeout(() => {
              btn.style.opacity = '1'; // Fade in as it's "dropped off"
              btn.style.transform = `translate(${x}vh, ${y}vh) scale(1)`;
            }, delay);
          } else {
            // Collapse: reverse order - last button picked up first
            const reverseDelay = (buttons.length - 1 - index) * 40; // ms
            setTimeout(() => {
              btn.style.opacity = '0'; // Fade out
              btn.style.transform = 'translate(0, 0) scale(0)'; // Return to center and hide
            }, reverseDelay);
          }
        });
      };
      
      // Store positioning function for later use
      radialContainer._applyRadialPositions = applyRadialPositions;
      
      // Wire up event handlers for radial menu buttons
      radialContainer.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action]');
        if (!button) return;
        
        // Only allow clicks on the active button
        if (!button.classList.contains('active')) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        
        const action = button.getAttribute('data-action');
        const st = store.getState();
        
        switch (action) {
          case 'roll': {
            // Check if dice tray is collapsed, expand it first if so
            try {
              const tray = document.querySelector('.cmp-dice-tray');
              if (tray) {
                const collapsed = tray.getAttribute('data-collapsed') === 'left';
                if (collapsed) {
                  tray.setAttribute('data-collapsed','none');
                  if (tray._applyMobileOffset) {
                    try { tray._applyMobileOffset(); } catch(_) {}
                  }
                  if (!root._pendingMobileRoll) {
                    root._pendingMobileRoll = true;
                    setTimeout(() => {
                      eventBus.emit('ui/dice/rollRequested');
                      root._pendingMobileRoll = false;
                    }, 340);
                  }
                  break;
                }
              }
            } catch(_) {}
            eventBus.emit('ui/dice/rollRequested');
            break;
          }
          case 'keep': {
            if (st.phase === 'ROLL' && st.dice?.phase === 'resolved' && (st.dice.faces?.length||0) > 0) {
              store.dispatch(diceSetAllKept(true));
            }
            break;
          }
          case 'power-cards': {
            // Open player power cards modal
            eventBus.emit('ui/modal/showPlayerPowerCards');
            break;
          }
          case 'accept-dice': {
            if (typeof window !== 'undefined' && window.__KOT_NEW__?.turnService) {
              window.__KOT_NEW__.turnService.acceptDiceResults();
            }
            break;
          }
          case 'end': {
            const phase = st.phase;
            if (typeof window !== 'undefined' && window.__KOT_NEW__?.turnService) {
              const ts = window.__KOT_NEW__.turnService;
              if (!root._endTurnInFlight) {
                root._endTurnInFlight = true;
                
                // Immediately disable both end turn buttons to prevent double-clicks
                const endBtn = document.getElementById('end-turn-btn');
                const hEndBtn = document.getElementById('h-end-turn-btn');
                if (endBtn) endBtn.disabled = true;
                if (hEndBtn) hEndBtn.disabled = true;
                
                let p;
                if (phase === 'ROLL') p = ts.resolve();
                else if (phase === 'BUY') p = ts.cleanup();
                else if (phase === 'CLEANUP' || phase === 'RESOLVE') p = ts.endTurn();
                else p = ts.endTurn();
                Promise.resolve(p).finally(()=> { root._endTurnInFlight = false; });
              }
            } else {
              if (phase === 'ROLL') {
                eventBus.emit('ui/intent/finishRoll');
              } else {
                store.dispatch(nextTurn());
                eventBus.emit('ui/intent/gameStart');
              }
            }
            break;
          }
        }
        
        // REMOVED: Auto-collapse radial menu after button click
        // User requested radial menu to stay open when clicking buttons or clicking outside
        // const radialMenu = document.getElementById('radial-action-menu');
        // if (radialMenu && checkMobile()) {
        //   radialMenu.setAttribute('data-expanded', 'false');
        //   if (radialMenu._applyRadialPositions) {
        //     radialMenu._applyRadialPositions(false);
        //   }
        //   
        //   // Update toggle button - animate pie slices to empty
        //   const toggleBtn = document.getElementById('action-menu-mobile-btn');
        //   if (toggleBtn) {
        //     const slices = toggleBtn.querySelectorAll('.pie-slice');
        //     const delayPerSlice = 50; // ms per slice
        //     slices.forEach((slice, index) => {
        //       setTimeout(() => {
        //         slice.setAttribute('fill', 'none');
        //       }, (slices.length - 1 - index) * delayPerSlice);
        //     });
        //     toggleBtn.style.transform = 'scale(1)';
        //     toggleBtn.setAttribute('aria-label', 'Expand Action Menu');
        //     document.body.removeAttribute('data-action-menu-open');
        //   }
        // }
      });
      
      // Store reference for state updates
      root._radialContainer = radialContainer;
      

      
      // Mark that mobile setup is complete
      root.setAttribute('data-mobile-ready', 'true');
      
      // Remove content setup - CSS handles layout
      // Just ensure content is visible (CSS sets flex layout)
      const content = root.querySelector('.am-content');
      if (content) {
        content.style.opacity = '1';
        content.classList.add('mobile-bottom-horizontal');
      }
      
      // Set all buttons to auto width
      const allBtns = root.querySelectorAll('button');
      allBtns.forEach(b => { 
        b.style.width = 'auto'; 
        b.style.flex = '0 0 auto';
        b.style.minWidth = 'auto';
      });
      
      // Menu is always rendered (CSS has display: flex !important)
      // Just ensure it starts collapsed (hidden to the right via transform)
      root.setAttribute('data-draggable','false');
      
      // Remove any existing toggle button
      const existingBtn = document.getElementById('action-menu-mobile-btn');
      if (existingBtn) existingBtn.remove();
      const btn = document.createElement('div');
      btn.id = 'action-menu-mobile-btn';
      btn.className = 'action-menu-mobile-btn';
      
      // Create SVG pie chart with 6 slices
      btn.innerHTML = `
        <svg viewBox="0 0 100 100" width="100%" height="100%" style="transform: rotate(-90deg);">
          <!-- Background circle -->
          <circle cx="50" cy="50" r="47" fill="#ffcf33" stroke="none"/>
          <g class="pie-slices">
            <!-- Slice 1: Bottom (starting at -90deg, which is bottom after rotation) -->
            <path class="pie-slice" data-slice="1" d="M 50 50 L 50 0 A 50 50 0 0 1 93.3 25 Z" fill="none" stroke="#333" stroke-width="3"/>
            <!-- Slice 2: Bottom-right -->
            <path class="pie-slice" data-slice="2" d="M 50 50 L 93.3 25 A 50 50 0 0 1 93.3 75 Z" fill="none" stroke="#333" stroke-width="3"/>
            <!-- Slice 3: Top-right -->
            <path class="pie-slice" data-slice="3" d="M 50 50 L 93.3 75 A 50 50 0 0 1 50 100 Z" fill="none" stroke="#333" stroke-width="3"/>
            <!-- Slice 4: Top -->
            <path class="pie-slice" data-slice="4" d="M 50 50 L 50 100 A 50 50 0 0 1 6.7 75 Z" fill="none" stroke="#333" stroke-width="3"/>
            <!-- Slice 5: Top-left -->
            <path class="pie-slice" data-slice="5" d="M 50 50 L 6.7 75 A 50 50 0 0 1 6.7 25 Z" fill="none" stroke="#333" stroke-width="3"/>
            <!-- Slice 6: Bottom-left -->
            <path class="pie-slice" data-slice="6" d="M 50 50 L 6.7 25 A 50 50 0 0 1 50 0 Z" fill="none" stroke="#333" stroke-width="3"/>
          </g>
        </svg>
      `;
      btn.setAttribute('aria-label','Expand Action Menu');
      
      // Get saved corner preference
      const savedCorner = store.getState().settings?.mobileMenuCorner || 
                         (typeof localStorage !== 'undefined' && localStorage.getItem('kot_mobile_corner')) || 
                         'right';
      
      // Apply initial positioning based on preference
      const initialStyles = {
        position:'fixed', 
        bottom:'2vh', 
        width:'12vh', 
        height:'12vh', 
        background:'transparent', // Transparent so SVG pie slices are visible
        border:'3px solid #333', 
        borderRadius:'50%', 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'center', 
        fontSize:'4.8vh', 
        cursor:'pointer', 
        boxShadow:'0 0.4vh 1.2vh rgba(0,0,0,0.3)', 
        zIndex:'6700', 
        transition:'transform 0.2s ease', 
        color:'#000'
      };
      
      if (savedCorner === 'left') {
        initialStyles.left = '2vw';
        initialStyles.right = 'auto';
      } else {
        initialStyles.right = '2vw';
        initialStyles.left = 'auto';
      }
      
      Object.assign(btn.style, initialStyles);
      
      // Helper function to animate pie slices
      const animatePieSlices = (expand) => {
        const slices = btn.querySelectorAll('.pie-slice');
        const animationDuration = 300; // Total duration in ms (matches radial button animation)
        const delayPerSlice = animationDuration / slices.length; // ~50ms per slice
        
        if (expand) {
          // Fill slices clockwise one at a time starting from slice 1 (bottom)
          slices.forEach((slice, index) => {
            setTimeout(() => {
              slice.setAttribute('fill', '#ffb300'); // Orange fill
            }, index * delayPerSlice);
          });
        } else {
          // Empty slices counter-clockwise (reverse order)
          slices.forEach((slice, index) => {
            setTimeout(() => {
              slice.setAttribute('fill', 'none');
            }, (slices.length - 1 - index) * delayPerSlice);
          });
        }
      };
      
      btn.addEventListener('click', () => {
        const radialMenu = document.getElementById('radial-action-menu');
        if (!radialMenu) return;
        
        // Check if menu is currently expanded
        const isExpanded = radialMenu.getAttribute('data-expanded') === 'true';
        
        if (isExpanded) {
          // Collapse - animate buttons back to center and empty pie slices
          radialMenu.setAttribute('data-expanded', 'false');
          if (radialMenu._applyRadialPositions) {
            radialMenu._applyRadialPositions(false);
          }
          animatePieSlices(false); // Reverse animation
          btn.style.transform = 'scale(1)';
          document.body.removeAttribute('data-action-menu-open');
          btn.setAttribute('aria-label', 'Expand Action Menu');
        } else {
          // Expand - fan out buttons in arc and fill pie slices
          radialMenu.setAttribute('data-expanded', 'true');
          if (radialMenu._applyRadialPositions) {
            radialMenu._applyRadialPositions(true);
          }
          animatePieSlices(true); // Forward animation
          btn.style.transform = 'scale(0.9)';
          btn.setAttribute('aria-label', 'Collapse Action Menu');
          document.body.setAttribute('data-action-menu-open', 'true');
        }
      });
      document.body.appendChild(btn);
      root._mobileBtn = btn;
      
      // Keyboard navigation support (arrow keys when toggle button has focus)
      btn.addEventListener('keydown', (e) => {
        const radialMenu = document.getElementById('radial-action-menu');
        if (!radialMenu) return;
        
        // Only handle arrow keys when menu is expanded
        const isExpanded = radialMenu.getAttribute('data-expanded') === 'true';
        if (!isExpanded) return;
        
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          
          // Get the current active index from the radial container
          const getCurrentIndex = radialMenu._getCurrentActiveIndex;
          const setActiveBtn = radialMenu._setActiveButton;
          
          if (!getCurrentIndex || !setActiveBtn) return;
          
          const totalButtons = radialContainer.querySelectorAll('.radial-action-btn').length;
          let currentIndex = getCurrentIndex();
          
          if (e.key === 'ArrowUp') {
            // Arrow up - go to next button (moves up the arc)
            currentIndex = (currentIndex + 1) % totalButtons;
          } else {
            // Arrow down - go to previous button (moves down the arc)
            currentIndex = (currentIndex - 1 + totalButtons) % totalButtons;
          }
          
          setActiveBtn(currentIndex);
        } else if (e.key === 'Enter' || e.key === ' ') {
          // Enter or Space - click the active button
          e.preventDefault();
          const activeBtn = radialContainer.querySelector('.radial-action-btn.active');
          if (activeBtn && !activeBtn.disabled) {
            activeBtn.click();
          }
        }
      });
      
      // Make toggle button focusable for keyboard navigation
      btn.setAttribute('tabindex', '0');
    } else {
      // Desktop: restore visibility & dragging
      // Hide horizontal menu if it exists
      const horizontalMenu = document.getElementById('horizontal-action-menu');
      if (horizontalMenu) {
        horizontalMenu.style.display = 'none';
      }
      
      // Restore label if it was removed while in mobile
      if (!root.querySelector('.am-label') && root._storedAmLabelHTML) {
        try {
          const temp = document.createElement('div');
          temp.innerHTML = root._storedAmLabelHTML;
          const restored = temp.firstElementChild;
          if (restored) root.insertBefore(restored, root.firstChild);
        } catch(_){ }
      }
      root.style.display = 'flex';
      root.style.position = '';
      root.style.bottom = '';
      root.style.right = '';
      root.style.left = '';
      root.style.top = '';
      root.style.transform = '';
      root.style.zIndex = '';
      root.setAttribute('data-draggable','true');
      if (!root._positioning) root._positioning = createPositioningService(store);
      if (root._positioning) root._positioning.makeDraggable(root,'actionMenu',{ snapEdges:true, snapThreshold:12 });
      const existingBtn = document.getElementById('action-menu-mobile-btn');
      if (existingBtn) existingBtn.remove();
    }

    // Attach (or re-attach) global outside click handler once (idempotent)
    if (!window.__globalOutsidePanelCloser) {
      window.__globalOutsidePanelCloser = (ev) => {
        try {
          // Only apply in mobile view
          const isMobile = window.matchMedia('(max-width: 760px)').matches;
          if (!isMobile) return;
          
          // Find all panels and check if they have expanded cards
          const monstersPanel = document.getElementById('monsters-panel');
          const powerCardsPanel = document.getElementById('power-cards-panel');
          const panels = [monstersPanel, powerCardsPanel].filter(p => p);
          
          if (!panels.length) return;
          
          // Find all expanded cards across all panels
          const expandedCards = document.querySelectorAll('.cmp-player-profile-card[data-expanded="true"]');
          
          // Check if any panels are expanded (not collapsed)
          const expandedPanels = panels.filter(p => p.getAttribute('data-collapsed') !== 'true');
          
          // Nothing to close if no expanded cards and no expanded panels
          if (expandedCards.length === 0 && expandedPanels.length === 0) return;
          
          const target = ev.target;
          
          // Check if any modal is currently active (peek modal, card detail modal, etc.)
          const activeModals = document.querySelectorAll('[data-apb-modal], .modal:not(.hidden), .peek-modal:not(.hidden), .card-detail-modal:not(.hidden), .monster-profile-single-modal:not(.hidden), .player-power-cards-modal:not(.hidden), .cmp-player-power-cards-modal-mobile:not(.hidden)');
          if (activeModals.length > 0) {
            return; // Don't close panels if a modal is open
          }
          
          // Check if clicked inside any panel OR on a card/profile element
          let clickedInsidePanel = false;
          panels.forEach(p => { if (p.contains(target)) clickedInsidePanel = true; });
          
          // Check if clicked on a player/monster card or power card detail
          const clickedOnMonsterCard = target.closest('.cmp-player-profile-card, .monster-profile-card');
          const clickedOnPowerCard = target.closest('.pc-card, .power-card, .catalog-card, .ppcm-card-detail');
          
          // Don't close if clicked inside panel or on relevant cards
          if (clickedInsidePanel || clickedOnMonsterCard || clickedOnPowerCard) {
            return; // Keep panels open
          }
          
          // If clicked outside all panels and not on cards, collapse everything
          // 1. Collapse all expanded cards
          expandedCards.forEach(card => { 
            card.removeAttribute('data-expanded');
          });
          
          // 2. Collapse all expanded panels
          expandedPanels.forEach(panel => {
            panel.setAttribute('data-collapsed', 'true');
            // Update arrow direction
            const arrow = panel.querySelector('.mp-arrow');
            if (arrow) {
              const side = panel.getAttribute('data-side');
              if (side === 'left') {
                arrow.textContent = '›'; // Right arrow when collapsed (expand right)
              } else if (side === 'right') {
                arrow.textContent = '‹'; // Left arrow when collapsed (expand left)
              }
            }
          });
          
          // Remove any blackout/dim overlays accidentally left behind
          const overlays = document.querySelectorAll('.blackout-overlay, .dim-overlay, [data-blackout]');
          overlays.forEach(o => { o.remove(); });
        } catch(_) {}
      };
      document.addEventListener('pointerdown', window.__globalOutsidePanelCloser, true);
    }
    // Blackout freeze mitigation: periodically strip stray blackout overlays
    if (!window.__blackoutMitigator) {
      window.__blackoutMitigator = setInterval(() => {
        const stray = document.querySelectorAll('.blackout-overlay, .dim-overlay, [data-blackout]');
        stray.forEach(el => {
          const activeModals = document.querySelectorAll('[data-apb-modal], .modal, .peek-modal, .card-detail-modal');
          if (!activeModals.length) el.remove();
        });
      }, 4000);
    }
  };
  
  // Setup mobile immediately and on resize
  setupMobile();
  window.addEventListener('resize', setupMobile);
  
  // Listen for mobile corner preference changes
  window.addEventListener('settings:mobileCornerChanged', (e) => {
    if (!checkMobile()) return; // Only applies to mobile
    const newCorner = e.detail?.corner || 'right';
    const radialContainer = root.querySelector('.am-radial-container');
    if (radialContainer) {
      radialContainer.setAttribute('data-corner', newCorner);
      
      // Use the stored positioning function if available
      if (radialContainer._applyRadialPositions) {
        // Reapply radial positions with new corner
        radialContainer._applyRadialPositions(true);
      }
      
      // If carousel is active, reapply active button positioning
      if (radialContainer._setActiveButton && radialContainer._getCurrentActiveIndex) {
        const currentIndex = radialContainer._getCurrentActiveIndex();
        radialContainer._setActiveButton(currentIndex);
      }
    }
  });
  
  // Setup collapse/expand functionality
  const setupCollapseToggle = () => {
    // Disable collapse/expand mechanics entirely on mobile view
    try { if (checkMobile()) return; } catch(_) {}
    const toggleBtn = root.querySelector('.am-collapse-toggle');
    const content = root.querySelector('.am-content');
    const arrowUp = root.querySelector('.arrow-up');
    const arrowDown = root.querySelector('.arrow-down');
    
    if (!toggleBtn || !content) return;
    
  // Load collapsed state from localStorage if persist positions is enabled
    const settings = store.getState().settings;
    const shouldPersist = settings?.persistPositions;
    let isCollapsed = false;
    
    if (shouldPersist) {
      try {
        const saved = localStorage.getItem('kot_action_menu_collapsed');
        isCollapsed = saved === 'true';
      } catch(_) {}
    }
    
    // Behavior v3:
    // Collapse: move menu so its TOP aligns with toolbar TOP; shrink content (menu height == header height).
    // Expand: (arrow up) slide entire menu upward so its BOTTOM aligns with toolbar TOP and simultaneously grow content upward.
    // If floating (hybrid) when initiating collapse or expand, fade -> dock -> animate.
    let collapsedTop = null;     // toolbar top (document space) used for collapse alignment
    let headerHeight = null;     // cached header height

    function computePositions() {
      const rect = root.getBoundingClientRect();
      const scrollY = window.scrollY || 0;
      const headerEl = root.querySelector('.am-label');
      headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 40;
      // Compute collapsedTop based on toolbar
      const toolbar = document.getElementById('toolbar-menu');
      if (toolbar) {
        const tRect = toolbar.getBoundingClientRect();
        collapsedTop = tRect.top + scrollY; // align menu top with toolbar top
      } else {
        collapsedTop = rect.top + scrollY; // fallback: no movement
      }
    }
    function ensurePositions() { if (collapsedTop == null || headerHeight == null) computePositions(); }

    function measureHeights() {
      // Temporarily ensure expanded to measure
      const wasCollapsed = content.getAttribute('data-collapsed') === 'true';
      if (wasCollapsed) {
        content.style.maxHeight = '500px';
        content.style.opacity = '1';
      }
      const totalH = root.getBoundingClientRect().height;
      const headerEl = root.querySelector('.am-label');
      const headerH = headerEl ? headerEl.getBoundingClientRect().height : 40;
      if (wasCollapsed) {
        content.style.maxHeight = '0px';
        content.style.opacity = '0';
      }
      return { totalH, headerH };
    }

    function updateCollapseState(collapsed) {
      ensurePositions();
      content.style.transition = 'max-height 0.28s ease, opacity 0.18s ease';
      content.setAttribute('data-collapsed', collapsed.toString());
      toggleBtn.setAttribute('aria-expanded', (!collapsed).toString());

      if (collapsed) {
        const isDocked = root.dataset.amDockState === 'docked';
        if (isDocked) {
          // Save current top position before collapsing so we can restore it on expand
          const currentTop = root.style.top || '514px'; // default to 514px if no explicit top set
          root._originalExpandedTop = currentTop;
          
          // Capture fresh positions before animating (in case of prior drag/resize)
          computePositions();
          const docScroll = window.scrollY || 0;
          const newTop = collapsedTop - docScroll;
          // Lock current horizontal placement
          const computed = window.getComputedStyle(root);
          if (!root.style.left && computed.left && computed.left !== 'auto') root.style.left = computed.left;
          if (!root.style.right && computed.right && computed.right !== 'auto') root.style.right = computed.right;
          root.style.transition = 'top 0.28s ease';
          root.style.top = newTop + 'px';
        }
        content.style.maxHeight = '0px';
        content.style.opacity = '0';
        content.style.overflow = 'hidden';
        arrowUp.style.opacity = '1';
        arrowDown.style.opacity = '0';
      } else {
        // EXPANSION: return to original expanded position (514px or user's custom position)
        const isDocked = root.dataset.amDockState === 'docked';
        if (isDocked) {
          computePositions();
          // Measure natural expanded menu height by temporarily expanding content off-screen influence
          const docScroll = window.scrollY || 0;
          const prevMax = content.style.maxHeight;
          const prevOpacity = content.style.opacity;
          content.style.maxHeight = '800px'; // generous cap to measure
          content.style.opacity = '0';
          content.style.overflow = 'visible';
          // Force reflow
          const expandedTotalH = root.getBoundingClientRect().height;
          // Restore collapsed visuals before animating
          content.style.maxHeight = '0px';
          content.style.opacity = '0';
          content.style.overflow = 'hidden';
          
          // Use saved original expanded position or default to 514px
          const originalTop = root._originalExpandedTop || '514px';
          let targetTop = parseInt(originalTop);
          
          // Ensure current top is collapsedTop - docScroll (anchor); if not, set it instantly
          const collapsedTopPx = (collapsedTop - docScroll) + 'px';
          if (root.style.top !== collapsedTopPx) {
            root.style.transition = 'none';
            root.style.top = collapsedTopPx;
          }
          // Animate
          requestAnimationFrame(() => {
            root.style.transition = 'top 0.32s ease';
            root.style.top = targetTop + 'px';
            // Animate content growth upward (since bottom anchored visually)
            requestAnimationFrame(() => {
              content.style.transition = 'max-height 0.32s ease, opacity 0.18s ease';
              const contentGrow = Math.max(0, expandedTotalH - headerHeight);
              content.style.maxHeight = contentGrow + 'px';
              content.style.opacity = '1';
              content.style.overflow = 'visible';
              arrowUp.style.opacity = '0';
              arrowDown.style.opacity = '1';
            });
          });
        } else {
          // Floating: just expand content in place
          content.style.maxHeight = '600px';
          content.style.opacity = '1';
          content.style.overflow = 'visible';
          arrowUp.style.opacity = '0';
          arrowDown.style.opacity = '1';
        }
      }
      
      // Save state if persist positions is currently enabled
      const currentSettings = store.getState().settings;
      const shouldPersistNow = currentSettings?.persistPositions;
      if (shouldPersistNow) {
        try {
          localStorage.setItem('kot_action_menu_collapsed', collapsed.toString());
        } catch(_) {}
      }
    }
    
    toggleBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const mode = store.getState().settings?.actionMenuMode || 'hybrid';
      const isDocked = root.dataset.amDockState === 'docked';
      // Auto-docking on collapse caused lateral jump (right shift) in hybrid mode.
      // Restrict repositioning to explicit 'docked' mode only.
      const needsRepositioning = (!isDocked && !isCollapsed && mode === 'docked');

      // Floating fade-reposition for expand (hybrid): if floating and expanding, fade out, dock, then expand
      if (!isDocked && isCollapsed && mode === 'hybrid') {
        root.style.transition = 'opacity 0.25s ease';
        root.style.opacity = '0';
        await new Promise(r => setTimeout(r, 250));
        anchorActionMenu(root);
        root.dataset.amDockState = 'docked';
        computePositions();
        const docScroll = window.scrollY || 0;
        const collapsedPosTop = collapsedTop - docScroll;
        root.style.top = collapsedPosTop + 'px';
        root.style.transition = 'opacity 0.25s ease';
        root.style.opacity = '1';
        await new Promise(r => setTimeout(r, 250));
        root.style.transition = '';
      }

      // Floating fade-reposition (hybrid): if floating and collapsing, fade out, dock near toolbar aligned to toolbar top, then collapse
      if (!isDocked && !isCollapsed && mode === 'hybrid') {
        // Record original floating transform / position so we can restore on expand
        if (!root._floatingReturn) {
          const rect = root.getBoundingClientRect();
          root._floatingReturn = { left: rect.left, top: rect.top + (window.scrollY||0) };
        }
        // Fade out in place (no movement during fade)
        root.style.transition = 'opacity 0.25s ease';
        root.style.opacity = '0';
        await new Promise(r => setTimeout(r, 250));
        // While invisible, relocate to toolbar position
        anchorActionMenu(root); // this will place it docked above toolbar (expanded position)
        root.dataset.amDockState = 'docked';
        // Force recompute positions with new docked location before collapse
        computePositions();
        // Move directly to collapsedTop before showing (so fade-in reveals it already aligned with toolbar top)
        const docScroll = window.scrollY || 0;
        const collapsedPosTop = collapsedTop - docScroll;
        root.style.top = collapsedPosTop + 'px';
        root.style.transition = 'opacity 0.25s ease';
        root.style.opacity = '1';
        await new Promise(r => setTimeout(r, 250));
        root.style.transition = '';
      }

      // If about to collapse and not docked -> reposition first so collapse animation is consistent (still allowed)
      if (needsRepositioning) {
        root.style.transition = 'opacity 0.18s ease';
        root.style.opacity = '0';
        await new Promise(r => setTimeout(r, 180));
        anchorActionMenu(root);
        root.dataset.amDockState = 'docked';
        root.style.opacity = '1';
        await new Promise(r => setTimeout(r, 160));
        root.style.transition = '';
        // After docking, recompute positions
        computePositions();
      }

      isCollapsed = !isCollapsed;
      updateCollapseState(isCollapsed);

      // If expanding from docked but we have a stored floating return position (hybrid flow), fade back to float position after expansion
      // Removed return-to-floating on expand; menu remains docked unless user drags again.
    });

    // If user starts dragging while collapsed and translated, reset translation so drag origin is correct
    root.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('.am-collapse-toggle')) return;
      // Invalidate stored positions so next toggle recomputes accurate expanded/collapsed targets
      collapsedTop = null; headerHeight = null;
    }, { capture: true });
    window.addEventListener('resize', () => { collapsedTop = null; headerHeight = null; });

    // Finally apply initial collapsed/expanded state now that variables exist
    updateCollapseState(isCollapsed);
  };
  
  setupCollapseToggle();
  // Re-evaluate collapse toggle availability when transitioning from mobile to desktop
  window.addEventListener('resize', () => {
    try {
      if (!checkMobile()) {
        // If collapse toggle not wired (arrow listeners absent) try again
        const toggleBtn = root.querySelector('.am-collapse-toggle');
        if (toggleBtn && !toggleBtn._desktopWired) {
          setupCollapseToggle();
          toggleBtn._desktopWired = true;
        }
      }
    } catch(_) {}
  });
  
  // Ensure proper positioning for desktop after initial render
  setTimeout(() => {
    const width = window.innerWidth;
    if (width > 760) {
      // For desktop, ensure proper positioning
      const mode = store.getState().settings?.actionMenuMode || 'hybrid';
      if (mode === 'docked' || (mode === 'hybrid' && root.dataset.amDockState === 'docked')) {
        anchorActionMenu(root, true); // true = initial positioning
      }
      ensureVisibleWithinViewport(root);
      avoidMonsterPanelOverlap(root);
    }
  }, 100);
  


  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    
    const st = store.getState();
    // Check if game is paused - if so, prevent all actions except power-cards (which are informational)
    if (st.game?.isPaused) {
      const action = btn.getAttribute('data-action');
      if (action !== 'power-cards' && action !== 'show-my-cards') {
        console.log('🚫 Action blocked - game is paused');
        return;
      }
    }
    
    const action = btn.getAttribute('data-action');
    // Clean click handling without verbose diagnostics
    switch(action){
      case 'roll': {
        // Mobile enhancement: ensure dice tray is visible before rolling
        if (checkMobile()) {
          try {
            const tray = document.querySelector('.cmp-dice-tray');
            if (tray) {
              const collapsed = tray.getAttribute('data-collapsed') === 'left';
              if (collapsed) {
                // Expand tray first
                tray.setAttribute('data-collapsed','none');
                // Attempt to apply its mobile offset recalculation if available
                if (tray._applyMobileOffset) {
                  try { tray._applyMobileOffset(); } catch(_) {}
                }
                // Delay roll emit just past tray transition (~320ms configured) for smoother UX
                if (!root._pendingMobileRoll) {
                  root._pendingMobileRoll = true;
                  setTimeout(() => {
                    eventBus.emit('ui/dice/rollRequested');
                    root._pendingMobileRoll = false;
                  }, 340);
                }
                break; // exit switch early, don't emit immediately
              }
            }
          } catch(_) {}
        }
        eventBus.emit('ui/dice/rollRequested');
        break; }
      case 'keep': {
        // Behavior: when in ROLL phase with resolved dice, mark all dice as kept (visual shift up)
        if (st.phase === 'ROLL' && st.dice?.phase === 'resolved' && (st.dice.faces?.length||0) > 0) {
          store.dispatch(diceSetAllKept(true));
        }
        break; }
      case 'power-cards': {
        // Toggle submenu visibility
        const submenu = root.querySelector('.power-cards-submenu');
        if (submenu) {
          const isHidden = submenu.hasAttribute('hidden');
          console.log('Power cards clicked, submenu hidden:', isHidden);
          if (isHidden) {
            submenu.removeAttribute('hidden');
            updateSubmenuPosition(root);
          } else {
            submenu.setAttribute('hidden', '');
          }
        } else {
          console.error('Submenu not found');
        }
        break; }
      case 'show-my-cards': {
        // Open modal showing player's power cards
        const st = store.getState();
        const activePlayerIndex = st.meta?.activePlayerIndex ?? 0;
        const activePlayerId = st.players?.order?.[activePlayerIndex];
        console.log('[ActionMenu] Show My Cards clicked');
        console.log('[ActionMenu] Active player index:', activePlayerIndex);
        console.log('[ActionMenu] Active player ID:', activePlayerId);
        console.log('[ActionMenu] Players order:', st.players?.order);
        if (activePlayerId) {
          console.log('[ActionMenu] Dispatching uiPlayerPowerCardsOpen for:', activePlayerId);
          store.dispatch(uiPlayerPowerCardsOpen(activePlayerId));
        } else {
          console.warn('[ActionMenu] No active player ID found!');
        }
        // Hide submenu after action
        const submenu = root.querySelector('.power-cards-submenu');
        if (submenu) {
          submenu.setAttribute('hidden', '');
        }
        break; }
      case 'flush': {
        // Flush power cards shop for 2 energy
        const active = st.players?.byId?.[st.players?.order?.[st.meta?.activePlayerIndex]] || null;
        if (active && active.energy >= 2) {
          import('../../services/cardsService.js').then(({ flushShop }) => {
            import('../../bootstrap/index.js').then(({ logger }) => {
              flushShop(store, logger, active.id, 2);
            });
          });
        }
        // Hide submenu after action
        const submenu = root.querySelector('.power-cards-submenu');
        submenu.setAttribute('hidden', '');
        break; }
      case 'accept-dice': {
        if (typeof window !== 'undefined' && window.__KOT_NEW__?.turnService) {
          window.__KOT_NEW__.turnService.acceptDiceResults();
        }
        break; }
      case 'end': {
        const phase = st.phase;
        if (typeof window !== 'undefined' && window.__KOT_NEW__?.turnService) {
          const ts = window.__KOT_NEW__.turnService;
          if (!root._endTurnInFlight) {
            root._endTurnInFlight = true;
            let p;
            if (phase === 'ROLL') p = ts.resolve();
            else if (phase === 'BUY') p = ts.cleanup();
            else if (phase === 'CLEANUP' || phase === 'RESOLVE') p = ts.endTurn();
            else p = ts.endTurn();
            Promise.resolve(p).finally(()=> { root._endTurnInFlight = false; });
          }
        } else {
          // Fallback: advance minimally
          if (phase === 'ROLL') {
            eventBus.emit('ui/intent/finishRoll');
          } else {
            // For post-roll phases we still rely on turnService to drive transitions; nextTurn fallback only
            store.dispatch(nextTurn());
            eventBus.emit('ui/intent/gameStart');
          }
        }
        break; }
      // legacy panels toggle removed
    }
  });
  // Restore draggability & persisted position
  try {
    const positioning = createPositioningService(store);
    root._positioning = positioning; // Store reference for mobile/desktop transitions
    positioning.hydrate();
    // Disable dragging on touch/mobile (coarse pointer) or narrow viewports
  // Disable desktop dragging only for true touch / very small viewports
  const isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 600;
    if (isTouch) {
      root.setAttribute('data-draggable','false');
      // Force mobile positioning for action menu
      root.style.position = 'fixed';
      root.style.bottom = '20px';
      root.style.left = '80%';
      root.style.top = 'auto';
      root.style.right = 'auto';
      root.style.transform = 'none';

    }
    if (root.getAttribute('data-draggable') !== 'false') {
      // Enable dragging from anywhere on the menu
      positioning.makeDraggable(root, 'actionMenu', { snapEdges: true, snapThreshold: 12 });
    }
    // Track drag to switch hybrid -> floating
    let dragTransformStart = null;
    root.addEventListener('pointerdown', () => { dragTransformStart = root.style.transform; }, { capture:true });
    window.addEventListener('pointerup', () => {
      if (dragTransformStart !== null) {
        if (root.style.transform !== dragTransformStart) {
          root._userMoved = true;
          if ((store.getState().settings?.actionMenuMode || 'hybrid') === 'hybrid') {
            root.dataset.amDockState = 'floating';
          }
          // Update arrow visibility after drag
          updateArrowVisibility(root);
          // Hide submenu if it was open during drag
          const submenu = root.querySelector('.power-cards-submenu');
          if (submenu && !submenu.hasAttribute('hidden')) {
            submenu.setAttribute('hidden', '');
          }
        }
        dragTransformStart = null;
      }
    });
    // Re-clamp on resize so it never drifts off-screen after viewport changes
    const clampIntoView = () => {
      // Check if mobile mode should be applied
      const isMobileNow = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
      if (isMobileNow) {
        // Force mobile positioning
        root.style.position = 'fixed';
        root.style.bottom = '5%';
        root.style.left = '80%';
        root.style.top = 'auto';
        root.style.right = 'auto';
        root.style.transform = 'none';
        return;
      }
      
      const rect = root.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width - 4;
      const maxTop = window.innerHeight - rect.height - 4;
      // Extract current translate
      const m = /translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/.exec(root.style.transform||'');
      let tx = m ? parseFloat(m[1]) : 0;
      let ty = m ? parseFloat(m[2]) : 0;
      // If using top/left positioning fallback (initial placement), compute from offsets
      if (!m) {
        tx = root.offsetLeft; ty = root.offsetTop;
      }
      tx = Math.min(Math.max(tx, 0), maxLeft);
      ty = Math.min(Math.max(ty, 0), maxTop);
      root.style.transform = `translate(${tx}px, ${ty}px)`;
    };
    window.addEventListener('resize', () => {
      const mode = store.getState().settings?.actionMenuMode || 'hybrid';
      if (mode === 'docked' || (mode === 'hybrid' && root.dataset.amDockState === 'docked')) {
        anchorActionMenu(root);
      }
      clampIntoView();
      ensureVisibleWithinViewport(root);
      avoidMonsterPanelOverlap(root);
    });
    // If no persisted position yet, place next to dice tray by default
    const persist = !!store.getState().settings?.persistPositions;
    const hasSaved = persist && !!store.getState().ui.positions.actionMenu;
    if (!hasSaved) {
      anchorActionMenu(root, true);
      // Additional pass after layout settle
      requestAnimationFrame(() => { if (!root._userMoved && root.dataset.amDockState === 'docked') anchorActionMenu(root); });
    }
  } catch(e) { /* non-fatal */ }
  
  // Add click outside handler for submenu
  document.addEventListener('click', (e) => {
    const submenu = root.querySelector('.power-cards-submenu');
    if (submenu && !submenu.hasAttribute('hidden')) {
      if (!root.contains(e.target)) {
        submenu.setAttribute('hidden', '');
      }
    }
  });
  
  // Add deck illumination and label reveal on power cards button hover
  const powerCardsBtn = root.querySelector('.power-cards-btn');
  if (powerCardsBtn) {
    powerCardsBtn.addEventListener('mouseenter', () => {
      const deck = document.querySelector('.power-card-deck');
      if (deck) {
        deck.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.3), 0 0 20px #4a7c59';
        deck.classList.add('hover-reveal');
      }
    });
    
    powerCardsBtn.addEventListener('mouseleave', () => {
      const deck = document.querySelector('.power-card-deck');
      if (deck) {
        deck.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.3)';
        deck.classList.remove('hover-reveal');
      }
    });
  }
  
    return { root, update: (props) => update(root, props), destroy: () => {
    root._destroyExtras && root._destroyExtras();
    if (root._mobileBtn) {
      root._mobileBtn.remove();
    }
      const bubble = document.getElementById('active-player-bubble');
      if (bubble) bubble.remove();
    window.removeEventListener('resize', setupMobile);
    root.remove();
  } };
}

// (legacy panels toggle removed)

// (Removed deferred DOMContentLoaded init; handled synchronously above)

// (Removed global fallback & debug instrumentation – drag service now respects data-nodrag)

function updateArrowVisibility(root) {
  const rect = root.getBoundingClientRect();
  const submenuWidth = 200;
  const margin = 8;
  const leftSpace = rect.left - margin;
  const rightSpace = window.innerWidth - rect.right - margin;
  
  const leftArrow = root.querySelector('.arrow-left');
  const rightArrow = root.querySelector('.arrow-right');
  
  if (leftArrow && rightArrow) {
    // Show arrow pointing to the side where submenu will appear
    const shouldShowLeft = leftSpace > rightSpace && leftSpace >= submenuWidth;
    leftArrow.style.opacity = shouldShowLeft ? '1' : '0';
    rightArrow.style.opacity = shouldShowLeft ? '0' : '1';
  }
}

function updateSubmenuPosition(root) {
  const submenu = root.querySelector('.power-cards-submenu');
  const rect = root.getBoundingClientRect();
  
  if (submenu) {
    // Calculate available space on both sides
    const submenuWidth = 200; // min-width from CSS
    const margin = 8; // margin from CSS
    const leftSpace = rect.left - margin;
    const rightSpace = window.innerWidth - rect.right - margin;
    
    // Choose side with more space, but prefer right if equal
    const shouldShowLeft = leftSpace > rightSpace && leftSpace >= submenuWidth;
    
    submenu.classList.toggle('submenu-left', shouldShowLeft);
    submenu.classList.toggle('submenu-right', !shouldShowLeft);
  }
}

export function update(root) {
  if (window.__KOT_DEBUG__?.logComponentUpdates) {
    console.log('🔄 ACTION MENU UPDATE CALLED');
  }
  const st = store.getState();
  const isPaused = !!st.game?.isPaused;
  
  const rollBtn = root.querySelector('[data-action="roll"]');
  const keepBtn = root.querySelector('[data-action="keep"]');
  const acceptBtn = root.querySelector('[data-action="accept-dice"]');
  const powerCardsBtn = root.querySelector('[data-action="power-cards"]');
  const flushBtn = root.querySelector('[data-action="flush"]');
  const endBtn = root.querySelector('[data-action="end"]');
  
  // Add pause state visual indicator
  root.classList.toggle('is-paused', isPaused);
  
  // Update arrow visibility based on menu position
  updateArrowVisibility(root);
  // no collapse button in mobile; hamburger opens/closes via window event
  const dice = st.dice || {};
  const faces = dice.faces || [];
  const hasAnyFaces = faces.length > 0;
  const keptCount = faces.reduce((n,f)=> n + (f && f.kept ? 1 : 0), 0);
  // Global initialization gating (revised): gate ONLY until the very first roll has produced faces.
  // Previously a logic bug prevented readiness flag from ever flipping, causing reroll to remain disabled.
  let initializing = !window.__KOT_ACTION_MENU_READY;
  if (initializing) {
    const preFirstRoll = dice.phase === 'idle' && faces.length === 0; // true before any faces shown
    if (preFirstRoll) {
      const btns = root.querySelectorAll('button[data-action]');
      btns.forEach(b => { if (b.getAttribute('data-action') !== 'roll') b.disabled = true; });
    } else {
      // First roll has occurred; release gating so rerolls & other actions can enable normally
      window.__KOT_ACTION_MENU_READY = true;
      initializing = false;
    }
  }
  // New dice state model: phase: 'idle' | 'rolling' | 'resolved' | 'sequence-complete'
  // rerollsRemaining tracks how many rerolls still available (after first roll).
  const isIdle = dice.phase === 'idle';
  const hasFirstRoll = !isIdle && (dice.faces?.length > 0);
  const anyUnkept = faces.some(f => f && !f.kept);
  // Allow reroll as long as there are rerolls remaining after a resolved roll, even if all dice are currently kept
  const canReroll = dice.phase === 'resolved' && dice.rerollsRemaining > 0; // removed anyUnkept requirement
  const canInitialRoll = isIdle;
  // Phase value may be plain string or object (phase machine). Support both.
  const phaseName = (st.phase && typeof st.phase === 'object' && st.phase.name) ? st.phase.name : st.phase;
  // Allow initial roll even if rerollsRemaining is 0 (defensive) whenever dice are idle and empty in ROLL phase.
  const defensiveInitial = phaseName === 'ROLL' && isIdle && (!dice.faces || dice.faces.length === 0);
  const canRoll = phaseName === 'ROLL' && (canInitialRoll || canReroll || defensiveInitial) && dice.phase !== 'rolling';
  const order = st.players.order;
  // Final roll condition: no rerolls remaining OR dice phase sequence-complete
  const isFinalRoll = dice.rerollsRemaining === 0 || dice.phase === 'sequence-complete';
  let active = null;
  if (order.length) {
    const activeId = order[st.meta.activePlayerIndex % order.length];
    active = st.players.byId[activeId];
  }
  // Update mobile avatar bubble if present
  try {
    const bubble = document.getElementById('active-player-bubble');
    if (bubble && active) {
      // If bubble was hidden due to Tokyo entry, show it again for the new active player
      if (bubble.hasAttribute('data-hidden-until-next-turn')) {
        bubble.removeAttribute('data-hidden-until-next-turn');
        bubble.style.display = 'flex';
        bubble.style.position = 'fixed';
        bubble.style.top = '10px';
        bubble.style.left = '10px';
        bubble.style.transform = 'none';
        bubble.style.transition = '';
        bubble.style.opacity = '1';
        bubble.style.width = '';
        bubble.style.height = '';
        bubble.style.margin = '';
        bubble.style.zIndex = '6700';
      }
      
      const avatar = bubble.querySelector('.apb-avatar');
      const nameEl = bubble.querySelector('[data-apb-name]');
      if (nameEl) nameEl.textContent = active.monster?.name || active.name || 'ACTIVE';
      // Attempt to source image from player profile card avatar background
      if (avatar) {
        // Look for existing active card avatar element to copy background-image
        const cardAvatar = document.querySelector(`.cmp-player-profile-card[data-player-id="${active.id}"] .ppc-avatar`);
        const bg = cardAvatar ? getComputedStyle(cardAvatar).backgroundImage : '';
        if (bg && bg !== 'none') avatar.style.backgroundImage = bg;
      }
    }
  } catch(_) {}
  // Update My Cards button count and disabled state
  try {
    const countEl = root.querySelector('[data-my-cards-count]');
    const myCardsBtn = root.querySelector('[data-action="show-my-cards"]');
    if (countEl) {
      const c = active?.powerCards?.length || 0;
      countEl.textContent = c ? ` (${c})` : '';
    }
    // MY CARDS button should always be enabled so players can view their wallet anytime
    if (myCardsBtn) {
      myCardsBtn.disabled = false;
    }
    
    // Main power cards button should always be enabled
    const powerCardsBtn = document.getElementById('power-cards-btn');
    if (powerCardsBtn) {
      powerCardsBtn.disabled = false;
    }
    
    // Horizontal menu power cards button should always be enabled
    const hPowerCardsBtn = document.getElementById('h-power-cards-btn');
    if (hPowerCardsBtn) {
      hPowerCardsBtn.disabled = false;
    }
    
    // Radial menu power cards button should always be enabled
    const rPowerCardsBtn = document.getElementById('r-power-cards-btn');
    if (rPowerCardsBtn) {
      rPowerCardsBtn.disabled = false;
    }
  } catch(_) {}
  const isCPU = !!(active && (active.isCPU || active.isAi || active.type === 'ai'));

  const accepted = !!dice.accepted;
  if (rollBtn) {
    // FIXED: accepted flag should only block RE-rolls during the CURRENT sequence, not initial roll
    // Initial roll conditions:
    // 1. dice.phase === 'idle' (clean start)
    // 2. OR dice.accepted === true (leftover from previous player's turn - should be ignored)
    // 3. OR (phaseName === 'ROLL' && no faces yet) - defensive for human player at turn start
    const isInitialRoll = dice.phase === 'idle' || (phaseName === 'ROLL' && dice.accepted) || (phaseName === 'ROLL' && faces.length === 0);
    const acceptedBlocksRoll = accepted && !isInitialRoll;
    
    // CRITICAL: For human players in ROLL phase with no faces, ALWAYS allow roll (override all other blocks)
    const humanNeedFirstRoll = !isCPU && phaseName === 'ROLL' && faces.length === 0 && dice.phase !== 'rolling';
    const canRollBtn = humanNeedFirstRoll || (!isCPU && !acceptedBlocksRoll && canRoll);
    const wasDisabled = rollBtn.disabled;
    
    if (window.__KOT_DEBUG__?.logComponentUpdates) {
      console.log('🎲 ROLL BUTTON UPDATE:', {
        isCPU,
        accepted,
        phaseName,
        dicePhase: dice.phase,
        facesLength: faces.length,
        isInitialRoll,
        acceptedBlocksRoll,
        humanNeedFirstRoll,
        canRoll,
        canRollBtn,
        'will set disabled to': !canRollBtn,
        'current disabled': rollBtn.disabled
      });
    }
    
    if (!canRollBtn && !isCPU && window.__KOT_DEBUG__?.logComponentUpdates) {
      console.log('🚫 Roll Button Disabled - Debug Info:', {
        phase: phaseName,
        dicePhase: dice.phase,
        accepted,
        acceptedBlocksRoll,
        isInitialRoll,
        canRoll,
        canInitialRoll,
        canReroll,
        defensiveInitial,
        rerollsRemaining: dice.rerollsRemaining,
        hasFirstRoll,
        isIdle
      });
    }
    rollBtn.disabled = !canRollBtn;
    if (wasDisabled !== rollBtn.disabled && window.__KOT_DEBUG__?.logComponentUpdates) {
      console.log(`🎲 ROLL BUTTON STATE CHANGED: ${wasDisabled ? 'disabled' : 'enabled'} -> ${rollBtn.disabled ? 'disabled' : 'enabled'}`);
    }
    rollBtn.textContent = hasFirstRoll ? 'RE-ROLL UNSELECTED' : 'ROLL';
    
    // Update horizontal menu roll button
    const hRollBtn = document.getElementById('h-roll-btn');
    if (hRollBtn) {
      hRollBtn.disabled = !canRollBtn;
      hRollBtn.textContent = hasFirstRoll ? 'RE-ROLL' : 'ROLL';
    }
    
    // Update radial menu roll button
    const rRollBtn = document.getElementById('r-roll-btn');
    if (rRollBtn) {
      rRollBtn.disabled = !canRollBtn;
      const label = rRollBtn.querySelector('.r-btn-label');
      if (label) label.textContent = hasFirstRoll ? 'RE-ROLL' : 'ROLL';
    }
  }
  if (keepBtn && !initializing) {
    const allKept = hasAnyFaces && faces.every(f => !!f.kept);
    // Disable KEEP ALL if final roll reached (no point; results are effectively locked) or already accepted
    const canKeepAll = st.phase === 'ROLL' && hasAnyFaces && dice.phase === 'resolved' && !isCPU && !allKept && !accepted && !isFinalRoll;
    keepBtn.disabled = !canKeepAll;
    keepBtn.textContent = 'KEEP ALL';
    
    // Update horizontal menu keep button
    const hKeepBtn = document.getElementById('h-keep-btn');
    if (hKeepBtn) {
      hKeepBtn.disabled = !canKeepAll;
    }
    
    // Update radial menu keep button
    const rKeepBtn = document.getElementById('r-keep-btn');
    if (rKeepBtn) {
      rKeepBtn.disabled = !canKeepAll;
    }
  }
  if (acceptBtn && !initializing) {
    const anyKept = faces.some(f => f && f.kept);
    // Accept only meaningful before final automatic resolution; disable on final roll
    const canAccept = st.phase === 'ROLL' && (dice.phase === 'resolved' || dice.phase === 'sequence-complete') && hasAnyFaces && anyKept && !isCPU && !accepted && !isFinalRoll;
    acceptBtn.disabled = !canAccept;
    acceptBtn.textContent = accepted ? 'DICE ACCEPTED' : 'ACCEPT DICE RESULTS';
    
    // Update horizontal menu accept button
    const hAcceptBtn = document.getElementById('h-accept-dice-btn');
    if (hAcceptBtn) {
      hAcceptBtn.disabled = !canAccept;
      hAcceptBtn.textContent = accepted ? 'ACCEPTED' : 'ACCEPT';
    }
    
    // Update radial menu accept button
    const rAcceptBtn = document.getElementById('r-accept-dice-btn');
    if (rAcceptBtn) {
      rAcceptBtn.disabled = !canAccept;
      const label = rAcceptBtn.querySelector('.r-btn-label');
      if (label) label.textContent = accepted ? 'ACCEPTED' : 'ACCEPT';
    }
  }
  if (flushBtn && !initializing) {
    // Enable flush button during RESOLVE/BUY phases when player has the energy cost available
    const flushPhaseAllowed = st.phase === 'RESOLVE' || st.phase === 'BUY';
    const hasEnergy = active && active.energy >= 2;
    const canFlush = !isCPU && hasEnergy && flushPhaseAllowed;
    flushBtn.disabled = !canFlush;
  }
  if (endBtn && !initializing) {
    // New gating: During ROLL, End Turn allowed only if dice results already accepted OR rerolls exhausted (sequence complete)
    const isRollPhase = st.phase === 'ROLL';
    const diceReady = dice.phase === 'resolved' || dice.phase === 'sequence-complete';
    const finalRollExhausted = dice.rerollsRemaining === 0 && diceReady; // auto-accept path may already have fired
    const acceptedOrExhausted = accepted || finalRollExhausted;
    const canEndDuringRoll = isRollPhase && diceReady && acceptedOrExhausted;
    const canEnd = !isCPU && (canEndDuringRoll || !isRollPhase);
    if (!canEnd && !isCPU) {
      console.log('🚫 End Turn Disabled - Debug Info (enhanced gating):', {
        phase: st.phase,
        dicePhase: dice.phase,
        accepted,
        finalRollExhausted,
        rerollsRemaining: dice.rerollsRemaining,
        diceReady,
        isRollPhase
      });
    }
    endBtn.disabled = !canEnd;
    
    // Update horizontal menu end button
    const hEndBtn = document.getElementById('h-end-turn-btn');
    if (hEndBtn) {
      hEndBtn.disabled = !canEnd;
    }
    
    // Update radial menu end button
    const rEndBtn = document.getElementById('r-end-turn-btn');
    if (rEndBtn) {
      rEndBtn.disabled = !canEnd;
    }
  }

  // CPU turn styling state
  if (isCPU) root.classList.add('cpu-turn'); else root.classList.remove('cpu-turn');

  // Auto-roll for CPU active player (first roll only) after roll-for-first resolution
  try {
    if (isCPU && st.phase === 'ROLL' && isIdle && !hasAnyFaces) {
      if (root._lastCpuAutoRollIndex !== st.meta.activePlayerIndex) {
        root._lastCpuAutoRollIndex = st.meta.activePlayerIndex;
        
        // Wait for active player card to finish moving into position before rolling
        const waitForCardTransition = () => {
          const activeCard = document.querySelector('.cmp-player-profile-card[data-in-active-dock="true"]');
          if (activeCard) {
            // Additional 1 second delay after card is in position
            setTimeout(() => {
              // Flash cue on roll button (visual indicator CPU took action)
              if (rollBtn) {
                rollBtn.classList.add('cpu-flash');
                setTimeout(()=> rollBtn && rollBtn.classList.remove('cpu-flash'), 1200);
              }
              eventBus.emit('ui/dice/rollRequested');
            }, 1000); // 1 second delay after card is positioned
          } else {
            // Fallback: no card found, use original timing
            setTimeout(() => {
              if (rollBtn) {
                rollBtn.classList.add('cpu-flash');
                setTimeout(()=> rollBtn && rollBtn.classList.remove('cpu-flash'), 1200);
              }
              eventBus.emit('ui/dice/rollRequested');
            }, 350);
          }
        };
        
        // Small delay to let card positioning settle, then apply the additional wait
        setTimeout(waitForCardTransition, 100);
      }
    } else if (!isCPU) {
      root._lastCpuAutoRollIndex = undefined;
    }
  } catch(_) {}

  enforceVerticalLayout(root);

  // Mobile/touch: horizontal layout and hamburger toggle behavior
  const isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
  if (isTouch) {
  root.setAttribute('data-layout','horizontal');
  // Hide collapse toggle & label explicitly in mobile view (defensive)
  const collapseToggle = root.querySelector('.am-collapse-toggle');
  if (collapseToggle) collapseToggle.style.display = 'none';
  const labelEl = root.querySelector('.am-label');
  if (labelEl) { labelEl.style.display = 'none'; labelEl.setAttribute('data-force-hidden','true'); }
  // Defensive: hide any ms-label (if present from other components) in mobile view
  const msLabel = root.querySelector('.ms-label');
  if (msLabel) { msLabel.style.display = 'none'; msLabel.setAttribute('data-force-hidden','true'); }
    // Position as a top-left drawer; hidden by default until hamburger toggles
    if (!root._hbWired) {
  root._hbWired = true;
      // Ensure backdrop element exists for outside-click close
      let backdrop = document.querySelector('.action-menu-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'action-menu-backdrop';
        document.body.appendChild(backdrop);
      }
      const applyHidden = () => {
        const open = !!root._hamburgerOpen;
        root.toggleAttribute('data-hamburger-open', open);
        if (backdrop) backdrop.toggleAttribute('data-show', open);
      };
    // Hamburger toggle: open/close and anchor relative to the Actions button
  window.addEventListener('ui.actionMenu.hamburgerToggle', (e) => {
        // Close settings/tools menu if open to ensure only one menu is visible
        try { window.dispatchEvent(new CustomEvent('ui.settingsMenu.forceClose')); } catch(_){}
        root._hamburgerOpen = !root._hamburgerOpen;
        try {
          const r = e?.detail?.anchorRect;
          const bottom = 56 + 8; // sit above bottom-left Actions Menu button
          root.style.bottom = bottom + 'px';
          root.style.top = 'auto';
          root.setAttribute('data-hamburger-corner','left');
          root.style.left = '8px';
          root.style.right = 'auto';
          // Clear any transform-based drift from previous drags
          root.style.transform = 'translate(0, 0)';
          // Let CSS compute width; reset explicit width if any
          root.style.width = '';
        } catch(_){ }
        applyHidden();
      });
      // Outside click via backdrop
      backdrop.addEventListener('click', () => { if (root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
  // Listen for forced close from counterpart menu
  window.addEventListener('ui.actionMenu.forceClose', () => { if (root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
      // ESC to close
      window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
      window.addEventListener('resize', () => { if (window.innerWidth > 760) { root._hamburgerOpen = false; applyHidden(); } });
      applyHidden();
    }
  } else {
    root.setAttribute('data-layout','vertical');
    root.removeAttribute('data-collapsed');
    root._hamburgerOpen = false;
    root.removeAttribute('data-hamburger-open');
  }
  // (Readiness flag now set immediately upon first roll completion in gating block above.)
}

// ------------------------------
// Enforce vertical layout (single column) regardless of viewport size
let amResizeRO;
function enforceVerticalLayout(root){
  if (!root) return;
  const apply = () => {
    root.setAttribute('data-layout','vertical');
    // If menu extends beyond viewport bottom, cap its height and enable internal scroll
    const rect = root.getBoundingClientRect();
    const maxVisible = window.innerHeight - 40; // leave some margin
    if (rect.height > maxVisible) {
      root.style.maxHeight = maxVisible + 'px';
      root.style.overflowY = 'auto';
    } else {
      root.style.maxHeight = '';
      root.style.overflowY = '';
    }
  };
  apply();
  if (!amResizeRO) {
    // DISABLED: ResizeObserver temporarily disabled for troubleshooting
    // TODO: Re-enable when animation issues are resolved
    // amResizeRO = new ResizeObserver(apply);
    // amResizeRO.observe(document.documentElement);
    
    // Use fallback event listeners instead of ResizeObserver
    window.addEventListener('orientationchange', apply);
    window.addEventListener('resize', apply);
  }
}

// Ensure the menu never ends up fully below the fold after drastic vertical resize.
function ensureVisibleWithinViewport(root) {
  try {
    const rect = root.getBoundingClientRect();
    const vh = window.innerHeight;
    // If bottom is above 0 (fine) or top within viewport we do nothing.
    // If top is beyond viewport height (menu moved off-screen), reset to a safe anchor.
    if (rect.top > vh - 40) {
      // Anchor near bottom with small padding
      const desiredTop = Math.max(10, vh - rect.height - 90); // leave room above footer (64px + margin)
      root.style.top = desiredTop + 'px';
      root.style.bottom = '';
      // Clear transform-based translation if present
      root.style.transform = 'translate(0,0)';
    }
    // If header overlap pushes it out of view (negative top beyond threshold), nudge down
    if (rect.top < 0) {
      const offset = Math.min(0, rect.top) * -1 + 10;
      const currentTop = parseInt(root.style.top||'0',10) || 0;
      root.style.top = (currentTop + offset) + 'px';
    }
  } catch(_) {}
}

// If overlapping (visually) with monsters panel on right side, nudge action menu left.
function avoidMonsterPanelOverlap(root) {
  try {
    const monsters = document.getElementById('monsters-panel');
    if (!monsters) return;
    const rRect = root.getBoundingClientRect();
    const mRect = monsters.getBoundingClientRect();
    const overlapX = rRect.left < mRect.right && rRect.right > mRect.left;
    const overlapY = rRect.top < mRect.bottom && rRect.bottom > mRect.top;
    if (overlapX && overlapY) {
      // Compute new left position so its right edge sits 12px left of monsters panel
      const shiftLeft = (mRect.left - 12) - rRect.width;
      if (shiftLeft > 0) {
        root.style.left = shiftLeft + 'px';
        root.style.right = 'auto';
        root.style.transform = 'translate(0,0)';
      } else {
        // fallback: place it below monsters panel
        root.style.top = (mRect.bottom + 16 + window.scrollY) + 'px';
        root.style.right = '50%';
      }
    }
  } catch(_) {}
}

// Re-anchor near dice tray (used for docked mode and hybrid before user drag)
function anchorActionMenu(root, initial=false) {
  const toolbar = document.getElementById('toolbar-menu');
  const mode = store.getState().settings?.actionMenuMode || 'hybrid';
  if (root._userMoved && (mode === 'floating' || mode === 'hybrid')) return;
  if (!toolbar) {
    // Fallback: top-right viewport anchor
    if (initial && (anchorActionMenu._tries = (anchorActionMenu._tries||0)+1) < 12) {
      requestAnimationFrame(() => anchorActionMenu(root, true));
    }
    root.style.left = (window.innerWidth - root.offsetWidth - 40) + 'px';
    root.style.top = '100px';
    root.style.transform = 'translate(0,0)';
    if (mode === 'hybrid') root.dataset.amDockState = 'docked';
    return;
  }
  const r = toolbar.getBoundingClientRect();
  const scrollY = window.scrollY || 0;
  const GAP = 32;
  const desiredLeft = r.right + GAP;
  const maxLeft = window.innerWidth - (root.offsetWidth || 240) - 12;
  root.style.left = Math.min(desiredLeft, maxLeft) + 'px';
  // Ensure we have a measured height; if zero (not yet laid out) schedule another frame.
  const menuHeight = root.offsetHeight;
  if (!menuHeight && (anchorActionMenu._heightTries = (anchorActionMenu._heightTries||0)+1) < 5) {
    requestAnimationFrame(() => anchorActionMenu(root, initial));
    return;
  }
  // Align menu bottom to toolbar top => top = toolbarTop - menuHeight
  let top = r.top + scrollY - menuHeight;
  const minTop = 10;
  const maxTop = window.innerHeight - menuHeight - 10 + scrollY;
  if (top < minTop) top = minTop; else if (top > maxTop) top = maxTop;
  root.style.top = top + 'px';
  root.style.right = '';
  root.style.bottom = '';
  root.style.transform = 'translate(0,0)';
  if (mode === 'hybrid') root.dataset.amDockState = 'docked';
}
