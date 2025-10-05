/** side-panel.js
 * Generic collapsible side panel helper to unify Monsters & Power Cards panels.
 * Adds arrow handling, keyboard accessibility, and collapse attribute toggling.
 */
export function initSidePanel(root, {
  side, // 'left' | 'right'
  expandedArrow, // glyph when expanded
  collapsedArrow, // glyph when collapsed
  bodyClassExpanded, // body class to toggle when expanded
  onToggle // optional callback(collapsed:boolean)
}) {
  root.classList.add('cmp-side-panel','k-panel');
  root.setAttribute('data-side', side);
  const header = root.querySelector('[data-toggle]');
  const arrowEl = root.querySelector('[data-arrow-dir]');

  function setArrow() {
    if (!arrowEl) return;
    const collapsed = root.getAttribute('data-collapsed') === 'true';
    arrowEl.textContent = collapsed ? collapsedArrow : expandedArrow;
  }

  function updateBodyState() {
    if (bodyClassExpanded) {
      const expanded = root.getAttribute('data-collapsed') !== 'true';
      const wasAlreadySet = document.body.classList.contains(bodyClassExpanded) === expanded;
      if (wasAlreadySet) return; // Don't toggle if already in correct state
      document.body.classList.toggle(bodyClassExpanded, expanded);
    }
  }

  function toggleCollapse() {
    const collapsing = root.getAttribute('data-collapsed') !== 'true';
    if (collapsing) {
      // Lock current height so rotated header has vertical space after body is hidden
      root.style.height = root.offsetHeight + 'px';
      root.setAttribute('data-collapsed','true');
    } else {
      root.removeAttribute('data-collapsed');
      // Force a reflow before clearing height to prevent rendering corruption
      void root.offsetHeight;
      root.style.height = '';
      // Trigger repaint
      requestAnimationFrame(() => {
        root.style.height = '';
      });
    }
    setArrow();
    if (header) header.setAttribute('aria-expanded', collapsing ? 'false':'true');
    updateBodyState();
    if (onToggle) onToggle(root.getAttribute('data-collapsed') === 'true');
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-toggle]')) toggleCollapse();
  });
  root.addEventListener('keydown', (e) => {
    if (!e.target.closest('[data-toggle]')) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapse(); }
  });

  // Initialize
  const isMobile = typeof window !== 'undefined' && (window.matchMedia('(max-width: 760px), (pointer: coarse)').matches);
  if (isMobile && !root.hasAttribute('data-initialized')) {
    // Collapse by default on mobile
    root.setAttribute('data-collapsed','true');
    if (header) header.setAttribute('aria-expanded','false');
  } else {
    if (header && !header.hasAttribute('aria-expanded')) header.setAttribute('aria-expanded','true');
  }
  setArrow();
  updateBodyState();
  root.setAttribute('data-initialized','true');

  // Handle window resize: auto-expand panels when transitioning from mobile to desktop
  let wasMobile = isMobile;
  const handleResize = () => {
    const isNowMobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    
    // Transitioning from mobile to desktop - auto-expand if collapsed
    if (wasMobile && !isNowMobile) {
      const isCollapsed = root.getAttribute('data-collapsed') === 'true';
      if (isCollapsed) {
        root.removeAttribute('data-collapsed');
        // Force height clear and repaint
        void root.offsetHeight;
        root.style.height = '';
        requestAnimationFrame(() => {
          root.style.height = '';
        });
        setArrow();
        if (header) header.setAttribute('aria-expanded', 'true');
        updateBodyState();
        if (onToggle) onToggle(false);
      }
    }
    // Transitioning from desktop to mobile - auto-collapse
    else if (!wasMobile && isNowMobile) {
      const isCollapsed = root.getAttribute('data-collapsed') === 'true';
      if (!isCollapsed) {
        root.style.height = root.offsetHeight + 'px';
        root.setAttribute('data-collapsed','true');
        setArrow();
        if (header) header.setAttribute('aria-expanded', 'false');
        updateBodyState();
        if (onToggle) onToggle(true);
      }
    }
    
    wasMobile = isNowMobile;
  };
  
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }

  // dev parity logging removed

  return { setArrow, updateBodyState };
}
