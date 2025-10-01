// components.smoke.js
// Simple runtime assertions for mounted components (manual import in browser)
import '../bootstrap/index.js';

setTimeout(() => {
  const app = document.querySelector('#app');
  if (!app) throw new Error('App root not found');
  const dice = app.querySelector('.cmp-dice-tray');
  const players = app.querySelector('.cmp-player-card-list');
  if (!players) throw new Error('Player card list not mounted');
  console.log('[smoke] components mounted OK');
}, 500);
