/**
 * Action Menu Component
 * MIGRATED: Legacy classes (.action-menu, .draggable, .btn) replaced.
 * Styles now sourced from css/components.action-menu.css + button tokens.
 * Pending: prune unused legacy .action-menu and draggable selectors.
 */
import { eventBus } from '../../core/eventBus.js';
import { store } from '../../bootstrap/index.js';
import { nextTurn, diceSetAllKept } from '../../core/actions.js';
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
      <!-- Gripper temporarily disabled
      <div class="am-drag-grip drag-grip am-grip-left" data-am-drag-handle tabindex="0" role="button" aria-label="Drag Action Menu" title="Drag Action Menu" aria-hidden="false">
        <span class="grip-dot"></span><span class="grip-dot"></span><span class="grip-dot"></span>
        <span class="grip-dot"></span><span class="grip-dot"></span><span class="grip-dot"></span>
      </div>
      -->
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
  const setupMobile = () => {
    const isMobile = checkMobile();
    if (isMobile) {
      // Remove the actions label entirely so it cannot display in mobile
      const labelEl = root.querySelector('.am-label');
      if (labelEl) {
        if (!root._storedAmLabelHTML) root._storedAmLabelHTML = labelEl.outerHTML;
        labelEl.remove();
      }
  // Hide the main action menu initially and disable dragging (mobile collapsed by default)
  root.style.display = 'none';
      root.setAttribute('data-draggable','false');
      // Remove any existing toggle
      const existingBtn = document.getElementById('action-menu-mobile-btn');
      if (existingBtn) existingBtn.remove();
      const btn = document.createElement('div');
      btn.id = 'action-menu-mobile-btn';
      btn.className = 'action-menu-mobile-btn';
      btn.innerHTML = '◀'; // left arrow indicates menu will expand to left
      btn.setAttribute('aria-label','Expand Action Menu');
      Object.assign(btn.style, {
        position:'fixed', bottom:'20px', right:'20px', width:'50px', height:'50px', background:'linear-gradient(135deg,#ffcf33 0%, #ffb300 100%)', border:'3px solid #333', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.3)', zIndex:'7500', transition:'transform 0.2s ease'
      });
      btn.addEventListener('click', () => {
        const open = root.style.display !== 'none';
        if (open) {
          // Collapse (hide) and restore fonts
          root.style.display = 'none';
          btn.style.transform = 'scale(1)';
          document.body.removeAttribute('data-action-menu-open');
          root.classList.remove('mobile-bottom-horizontal');
          const scaled = root.querySelectorAll('[data-mobile-font-scaled]');
          scaled.forEach(el => {
            const orig = el.getAttribute('data-orig-font-size');
            if (orig) el.style.fontSize = orig;
            el.removeAttribute('data-mobile-font-scaled');
            el.removeAttribute('data-orig-font-size');
          });
          if (root._mobileFitHandler) window.removeEventListener('resize', root._mobileFitHandler);
          btn.innerHTML = '◀';
          btn.setAttribute('aria-label','Expand Action Menu');
        } else {
          const gap = 8; // px gap between menu and button
          const buttonWidth = 50; // consistent with style
          // Base layout
          root.style.display = 'flex';
          root.style.flexDirection = 'row';
          root.style.position = 'fixed';
          // Align top of menu with top of circular button
          const FIXED_EXPAND_TOP = 120; // restored hard-coded vertical anchor for expanded menu
          root.style.top = FIXED_EXPAND_TOP + 'px';
          root.style.bottom = 'auto';
          root.style.left = 'auto';
          root.style.transform = 'none';
          root.style.zIndex = '7400';
          root.style.flexWrap = 'nowrap';
          // Use full available width from a small left margin up to the left of the circular button
          const vw = window.innerWidth;
          const rightOffset = 20 + buttonWidth + gap; // distance from right edge (button + spacing)
          let maxWidth = vw - rightOffset - 8; // leave small safety padding from extreme left edge visually if design permits
          if (maxWidth < 100) maxWidth = vw * 0.65; // safety fallback for ultra-narrow
          root.style.maxWidth = Math.floor(maxWidth) + 'px';
          root.style.left = 'auto'; // do not force anchor to absolute left
          // Position from right
          root.style.right = rightOffset + 'px';
          // After initial layout, shift menu 100px left (decrease x coordinate) while preserving width
          requestAnimationFrame(() => {
            try {
              const rect = root.getBoundingClientRect();
              let newLeft = rect.left - MOBILE_MENU_OPEN_SHIFT_X;
              if (newLeft < 0) newLeft = 0; // clamp so it never goes off-screen left
              root.style.left = newLeft + 'px';
              root.style.right = 'auto'; // switch to left-anchored positioning after shift
            } catch(_) {}
          });
          // Compact padding for mobile horizontal mode
          root.style.padding = '4px 6px 6px';
          // Horizontal content setup
          const content = root.querySelector('.am-content');
          if (content) {
            content.style.display = 'flex';
            content.style.flexDirection = 'row';
            content.style.flexWrap = 'nowrap';
            content.style.alignItems = 'center';
            content.style.gap = '8px';
            content.style.maxHeight = 'none';
            content.style.opacity = '1';
            content.style.overflowX = 'hidden'; // we attempt fit first
            content.style.overflowY = 'hidden';
            content.style.maxWidth = '100%';
            content.style.paddingRight = '2px';
            content.classList.add('mobile-bottom-horizontal');
            content.style.scrollbarWidth = 'none';
            content.style.msOverflowStyle = 'none';
          }
          root.classList.add('mobile-bottom-horizontal');
          // Enforce button widths auto (not 100%)
          const allBtns = root.querySelectorAll('button');
          allBtns.forEach(b => { b.style.width=''; b.style.flex='0 0 auto'; });
          // Auto-fit: shrink fonts so all buttons fit within maxWidth; fallback to overflow-x:auto if min font hit
          const buttons = [...root.querySelectorAll('button')];
          // Defensive: remove any lingering min-width constraints in mobile horizontal state
          buttons.forEach(b => { b.style.minWidth = 'auto'; });
          buttons.forEach(b => {
            if (!b.getAttribute('data-orig-font-size')) b.setAttribute('data-orig-font-size', window.getComputedStyle(b).fontSize);
          });
          const attemptFit = () => {
            if (!root.isConnected) return;
            // restore fonts
            buttons.forEach(b => {
              const orig = b.getAttribute('data-orig-font-size');
              if (orig) b.style.fontSize = orig;
            });
            const total = buttons.reduce((acc, b) => acc + b.getBoundingClientRect().width, 0);
            const containerWidth = root.getBoundingClientRect().width - 4; // small buffer
            if (total <= containerWidth) return; // fits already
            // scale attempt
            const scale = containerWidth / total;
            buttons.forEach(b => {
              const origPx = parseFloat(b.getAttribute('data-orig-font-size')) || 18;
              let newSize = Math.max(12, Math.floor(origPx * scale));
              b.style.fontSize = newSize + 'px';
              b.setAttribute('data-mobile-font-scaled','true');
            });
            // Re-measure: if still overflow and we hit min, allow horizontal scroll
            const newTotal = buttons.reduce((acc, b) => acc + b.getBoundingClientRect().width, 0);
            if (newTotal > containerWidth && content) {
              content.style.overflowX = 'auto';
            }
          };
          setTimeout(attemptFit, 0);
          root._mobileFitHandler = () => {
            // Maintain fixed vertical anchor on resize
            const FIXED_EXPAND_TOP = 120;
            root.style.top = FIXED_EXPAND_TOP + 'px';
            // Recompute width fully available again
            const vw2 = window.innerWidth;
            let newMax = vw2 - rightOffset - 8;
            if (newMax < 100) newMax = vw2 * 0.65;
            root.style.maxWidth = Math.floor(newMax) + 'px';
            setTimeout(attemptFit, 60);
          };
          window.addEventListener('resize', root._mobileFitHandler);
          // Inject upward submenu style (once)
          const styleId = 'am-mobile-submenu-upward';
            if (!document.getElementById(styleId)) {
              const st = document.createElement('style');
              st.id = styleId;
              st.textContent = `@media (max-width:760px){ .mobile-bottom-horizontal .power-cards-submenu { top:auto !important; bottom:100% !important; margin-bottom:6px !important; max-height:40vh; overflow:auto; } }`;
              document.head.appendChild(st);
            }
          btn.style.transform = 'scale(0.9)';
          btn.innerHTML = '▶'; // right arrow indicates collapse direction
          btn.setAttribute('aria-label','Collapse Action Menu');
          document.body.setAttribute('data-action-menu-open','true');
        }
      });
      document.body.appendChild(btn);
      root._mobileBtn = btn;

      // Ensure active player bubble (avatar + name) exists to the left of the action menu button
      let bubble = document.getElementById('active-player-bubble');
      if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = 'active-player-bubble';
        bubble.className = 'active-player-bubble';
        bubble.innerHTML = `<div class="apb-avatar" aria-label="Active Player"></div><div class="apb-name" data-apb-name></div>`;
        Object.assign(bubble.style, {
          position:'fixed', top:'10px', left:'10px', transform:'none',
          display:'flex', flexDirection:'row', alignItems:'center', gap:'10px',
          padding:'6px 10px 6px 6px', background:'linear-gradient(135deg,#2d3436,#1b1f20)',
          border:'3px solid #000', borderRadius:'40px', boxShadow:'0 4px 12px rgba(0,0,0,0.35)', zIndex:'7500',
          fontFamily:'Bangers,cursive', letterSpacing:'1px', cursor:'pointer'
        });
        const avatarEl = bubble.querySelector('.apb-avatar');
        Object.assign(avatarEl.style, {
          width:'48px', height:'48px', borderRadius:'50%',
          /* White background behind monster/player image */
          background:'#fff center/cover no-repeat',
          border:'3px solid #000', boxShadow:'2px 2px 0 #000',
          overflow:'hidden', position:'relative'
        });
        const nameEl = bubble.querySelector('[data-apb-name]');
        Object.assign(nameEl.style, { color:'#fff', fontSize:'18px', maxWidth:'120px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' });
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
            Object.assign(overlay.style, { position:'fixed', inset:'0', background:'rgba(0,0,0,0.65)', zIndex:'9000', display:'flex', alignItems:'center', justifyContent:'center', padding:'30px' });
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
    } else {
      // Desktop: restore visibility & dragging
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
      if (root._positioning) root._positioning.makeDraggable(root,'actionMenu',{ snapEdges:true, snapThreshold:12, handleSelector:'[data-am-drag-handle]' });
      const existingBtn = document.getElementById('action-menu-mobile-btn');
      if (existingBtn) existingBtn.remove();
    }

    // Attach (or re-attach) global outside click handler once (idempotent)
    if (!window.__globalOutsidePanelCloser) {
      window.__globalOutsidePanelCloser = (ev) => {
        try {
          const panels = document.querySelectorAll('#monsters-panel[data-expanded], #power-cards-panel[data-expanded]');
          if (!panels.length) return;
          const target = ev.target;
            let clickedInside = false;
            panels.forEach(p => { if (p.contains(target)) clickedInside = true; });
          if (clickedInside) return;
          panels.forEach(p => { p.removeAttribute('data-expanded'); p.classList.remove('is-expanded'); p.removeAttribute('inert'); });
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
        // EXPANSION: slide upward so bottom aligns with toolbar bottom.
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
          // Get toolbar bottom for alignment target
          const toolbar = document.getElementById('toolbar-menu');
          let toolbarBottom = collapsedTop; // fallback
          if (toolbar) {
            const tRect = toolbar.getBoundingClientRect();
            toolbarBottom = (tRect.bottom + (window.scrollY || 0));
          }
          // Calculate Y coordinate shift: move UP by content height to reveal entire menu above current position
          const currentCollapsedTop = collapsedTop - docScroll;
          const contentHeight = Math.max(0, expandedTotalH - headerHeight);
          let targetTop = currentCollapsedTop - contentHeight;
          // Provide additional lift so menu clears overlapping elements (toolbar shadows etc.)
          targetTop -= 12; // extra upward offset
          const minTop = 4; // allow closer to very top now
          // If viewport is short and menu would extend below bottom, lift further
          const vpH = window.innerHeight || document.documentElement.clientHeight || 800;
          const projectedBottom = targetTop + expandedTotalH;
          if (projectedBottom > vpH - 12) {
            const overflow = projectedBottom - (vpH - 12);
            targetTop -= overflow;
          }
          const clampedTargetTop = Math.max(targetTop, minTop);
          
          // Ensure current top is collapsedTop - docScroll (anchor); if not, set it instantly
          const collapsedTopPx = (collapsedTop - docScroll) + 'px';
          if (root.style.top !== collapsedTopPx) {
            root.style.transition = 'none';
            root.style.top = collapsedTopPx;
          }
          // Animate
          requestAnimationFrame(() => {
            root.style.transition = 'top 0.32s ease';
            root.style.top = clampedTargetTop + 'px';
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
        eventBus.emit('ui/modal/showPlayerCards');
        // Hide submenu after action
        const submenu = root.querySelector('.power-cards-submenu');
        submenu.setAttribute('hidden', '');
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
      // Restrict drag initiation to grip on desktop
      positioning.makeDraggable(root, 'actionMenu', { snapEdges: true, snapThreshold: 12, handleSelector: '[data-am-drag-handle]' });
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
  
  // Add deck illumination on power cards button hover
  const powerCardsBtn = root.querySelector('.power-cards-btn');
  if (powerCardsBtn) {
    powerCardsBtn.addEventListener('mouseenter', () => {
      const deck = document.querySelector('.power-card-deck');
      if (deck) {
        deck.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.3), 0 0 20px #4a7c59';
      }
    });
    
    powerCardsBtn.addEventListener('mouseleave', () => {
      const deck = document.querySelector('.power-card-deck');
      if (deck) {
        deck.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.3)';
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
  // Update My Cards button count
  try {
    const countEl = root.querySelector('[data-my-cards-count]');
    if (countEl) {
      const c = active?.cards?.length || 0;
      countEl.textContent = c ? ` (${c})` : '';
    }
  } catch(_) {}
  const isCPU = !!(active && (active.isCPU || active.isAi || active.type === 'ai'));

  const accepted = !!dice.accepted;
  if (rollBtn) {
    rollBtn.disabled = isCPU || accepted || !canRoll;
    rollBtn.textContent = hasFirstRoll ? 'RE-ROLL UNSELECTED' : 'ROLL';
  }
  if (keepBtn && !initializing) {
    const allKept = hasAnyFaces && faces.every(f => !!f.kept);
    // Disable KEEP ALL if final roll reached (no point; results are effectively locked) or already accepted
    const canKeepAll = st.phase === 'ROLL' && hasAnyFaces && dice.phase === 'resolved' && !isCPU && !allKept && !accepted && !isFinalRoll;
    keepBtn.disabled = !canKeepAll;
    keepBtn.textContent = 'KEEP ALL';
  }
  if (acceptBtn && !initializing) {
    const anyKept = faces.some(f => f && f.kept);
    // Accept only meaningful before final automatic resolution; disable on final roll
    const canAccept = st.phase === 'ROLL' && (dice.phase === 'resolved' || dice.phase === 'sequence-complete') && hasAnyFaces && anyKept && !isCPU && !accepted && !isFinalRoll;
    acceptBtn.disabled = !canAccept;
    acceptBtn.textContent = accepted ? 'DICE ACCEPTED' : 'ACCEPT DICE RESULTS';
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
