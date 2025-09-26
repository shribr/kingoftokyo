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
      root.style.height = '';
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
  if (header && !header.hasAttribute('aria-expanded')) header.setAttribute('aria-expanded','true');
  setArrow();
  updateBodyState();

  // Dev parity logging (guarded for browsers without process)
  if (typeof window !== 'undefined' && (window.__DEV__ === true)) {
    // Dev aid: compare classlists of all side panels to surface mismatches
    try {
      const panels = Array.from(document.querySelectorAll('.cmp-side-panel'));
      if (panels.length > 1) {
        const ref = panels[0].classList;
        panels.slice(1).forEach(p => {
          const missing = [...ref].filter(c => !p.classList.contains(c) && !['mp-body'].includes(c));
          const extra = [...p.classList].filter(c => !ref.contains?.(c));
          if (missing.length || extra.length) {
            console.debug('[side-panel parity]', { panel: p.getAttribute('data-panel')||p.className, missing, extra });
          }
        });
      }
    } catch(_) { /* ignore */ }
  }

  return { setArrow, updateBodyState };
}
