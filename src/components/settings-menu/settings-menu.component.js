/** settings-menu.component.js
 * Lightweight Tools menu for mobile. Anchors to bottom-right and expands upward.
 */
import { store } from '../../bootstrap/index.js';
import { uiSettingsOpen, uiGameLogOpen, uiInstructionsOpen, uiAboutOpen, uiConfirmOpen } from '../../core/actions.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' cmp-settings-menu cmp-panel-root';
  root.setAttribute('data-layout','vertical');
  root.innerHTML = template();
  // Wire actions (names-only, no icons)
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const a = btn.getAttribute('data-action');
    if (a === 'settings') store.dispatch(uiSettingsOpen());
    else if (a === 'help') store.dispatch(uiInstructionsOpen());
    else if (a === 'log') store.dispatch(uiGameLogOpen());
    else if (a === 'about') store.dispatch(uiAboutOpen());
    else if (a === 'reset-positions') window.dispatchEvent(new CustomEvent('ui.positions.reset.request'));
    else if (a === 'restart') store.dispatch(uiConfirmOpen('restart-game', 'Restart the game and reload the page?\nUnsaved progress will be lost.', 'Restart', 'Cancel'));
    else if (a === 'mute') {
      try {
        const btn = document.querySelector('.cmp-toolbar [data-action="sound"]');
        if (btn) btn.click();
      } catch(_) {}
    }
    // Close after any action via global event (avoids scope issues)
    try { window.dispatchEvent(new CustomEvent('ui.settingsMenu.forceClose')); } catch(_){}
  });

  // Mobile hamburger toggle support
  const isTouch = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  if (isTouch && !root._hbWired) {
    root._hbWired = true;
    let backdrop = document.querySelector('.settings-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'settings-menu-backdrop';
      document.body.appendChild(backdrop);
    }
    function applyHidden() {
      const open = !!root._hamburgerOpen;
      root.toggleAttribute('data-hamburger-open', open);
      if (backdrop) backdrop.toggleAttribute('data-show', open);
    }
    window.addEventListener('ui.settingsMenu.hamburgerToggle', (e) => {
      // Close action menu if open to ensure only one menu is visible
      try { window.dispatchEvent(new CustomEvent('ui.actionMenu.forceClose')); } catch(_){}
      root._hamburgerOpen = !root._hamburgerOpen;
      try {
        const r = e?.detail?.anchorRect;
        const preferRight = true; // settings button is on right
        if (preferRight) {
          root.removeAttribute('data-hamburger-corner');
          root.style.right = '0.8vw'; root.style.left = 'auto';
        } else {
          root.setAttribute('data-hamburger-corner','left');
          root.style.left = '0.8vw'; root.style.right = 'auto';
        }
        root.style.top = 'auto'; root.style.bottom = '5.6vh';
  // Auto-size: let CSS handle width via max-content/min-width
  root.style.width = '';
      } catch(_){}
      applyHidden();
    });
    backdrop.addEventListener('click', () => { if (root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
  // Listen for forced close from counterpart menu
  window.addEventListener('ui.settingsMenu.forceClose', () => { if (root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
    window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && root._hamburgerOpen) { root._hamburgerOpen = false; applyHidden(); } });
    window.addEventListener('resize', () => { if (window.innerWidth > 760) { root._hamburgerOpen = false; applyHidden(); } });
    applyHidden();
  }

  return { root, update: () => {}, destroy: () => root.remove() };
}

function template() {
  return `
    <button type="button" data-action="settings">Settings</button>
    <button type="button" data-action="help">Help / Instructions</button>
    <button type="button" data-action="log">Game Log</button>
    <button type="button" data-action="about">About</button>
    <hr />
    <button type="button" data-action="reset-positions">Reset Layout</button>
    <button type="button" data-action="restart">Restart Game</button>
    <button type="button" data-action="mute">Mute / Unmute</button>
  `;
}
