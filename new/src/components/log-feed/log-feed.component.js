/** log-feed.component.js
 * Renders a simple scrolling list of log entries.
 */
import { store } from '../../../bootstrap/index.js';

export function buildLogFeed(cfg) {
  const root = document.createElement('div');
  root.className = 'cmp-log-feed';
  root.innerHTML = `<h3 class="cmp-log-feed__title">Game Log</h3><ul class="cmp-log-feed__list"></ul>`;
  return root;
}

export function updateLogFeed(el, cfg, sliceState, fullState) {
  const list = el.querySelector('.cmp-log-feed__list');
  if (!list) return;
  const entries = fullState.log.entries.slice(-50); // cap to last 50 for now
  list.innerHTML = '';
  for (const e of entries) {
    const li = document.createElement('li');
    li.className = `log-entry log-entry--${e.type}`;
    const time = new Date(e.ts).toLocaleTimeString();
    li.textContent = `[${time}] (${e.type}) ${e.message}`;
    list.appendChild(li);
  }
}
