/** pause-overlay.component.js
 * Full-screen overlay that appears when game is paused
 */
import { store } from '../../bootstrap/index.js';
import { gameResumed } from '../../core/actions.js';

export function build({ selector, emit }) {
  const root = document.createElement('div');
  root.id = 'pause-overlay';
  root.className = 'cmp-pause-overlay hidden';
  root.innerHTML = `
    <div class="pause-backdrop"></div>
    <div class="pause-panel">
      <div class="pause-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      </div>
      <h2>Game Paused</h2>
      <p>Click Resume to continue playing</p>
      <div class="pause-actions">
        <button class="pause-resume-btn" data-action="resume">
          <svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
          Resume Game
        </button>
      </div>
      <div class="pause-details">
        <span class="pause-timestamp"></span>
      </div>
    </div>
  `;

  function show() {
    root.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    updateTimestamp();
  }

  function hide() {
    root.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function updateTimestamp() {
    const timestampEl = root.querySelector('.pause-timestamp');
    if (timestampEl) {
      const now = new Date();
      timestampEl.textContent = `Paused at ${now.toLocaleTimeString()}`;
    }
  }

  // Add click handler for resume button
  root.addEventListener('click', (e) => {
    if (e.target.matches('.pause-resume-btn, .pause-resume-btn *')) {
      // Resume game using the same logic as toolbar
      const state = store.getState();
      const pausedAt = state.game?.pausedAt;
      const now = Date.now();
      const pausedTime = now - pausedAt;
      
      store.dispatch(gameResumed(now, pausedTime));
      console.log(`🎮 Game resumed from modal after ${Math.round(pausedTime / 1000)}s pause`);
    }
  });

  return { root, update: () => update(root) };
}

export function update(root) {
  if (!root) return;
  
  const state = store.getState();
  const isPaused = !!state.game?.isPaused;
  
  if (isPaused && root.classList.contains('hidden')) {
    root.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const timestampEl = root.querySelector('.pause-timestamp');
    if (timestampEl && state.game?.pausedAt) {
      const pauseTime = new Date(state.game.pausedAt);
      timestampEl.textContent = `Paused at ${pauseTime.toLocaleTimeString()}`;
    }
  } else if (!isPaused && !root.classList.contains('hidden')) {
    root.classList.add('hidden');
    document.body.style.overflow = '';
  }
}