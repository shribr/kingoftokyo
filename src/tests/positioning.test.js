/** positioning.test.js
 * Simple runtime test for positioning service.
 */
import { createPositioningService } from '../services/positioningService.js';
import { store } from '../bootstrap/index.js';
import { playerJoined } from '../core/actions.js';
import { createPlayer } from '../domain/player.js';

export function runPositioningTest() {
  // Seed player so card manager mounts card(s)
  store.dispatch(playerJoined(createPlayer({ id: 'tp1', name: 'Test Player 1', monsterId: 'king' }))); 
  const ps = createPositioningService(store);
  ps.hydrate();
  // Wait a tick for components to mount (would normally hook an event)
  setTimeout(() => {
    const el = document.querySelector('.cmp-player-profile-card');
    if (!el) { console.warn('Player profile card not found for positioning test'); return; }
    ps.makeDraggable(el, 'playerProfileCard:tp1');
    // Simulate a manual position write
    store.dispatch({ type: 'UI_POSITION_SET', payload: { componentName: 'playerProfileCard:tp1', x: 42, y: 55 } });
    requestAnimationFrame(() => {
      const st = store.getState().ui.positions['playerProfileCard:tp1'];
      console.log('Positioning test state snapshot', st);
    });
  }, 50);
}
