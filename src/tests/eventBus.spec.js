import { createEventBus } from '../core/eventBus.js';

(function testEventBus() {
  const bus = createEventBus();
  let got = 0;
  bus.on('ping', (payload) => { got = payload.value; });
  bus.emit('ping', { value: 42 });
  if (got !== 42) throw new Error('Event bus failed to deliver payload');
})();

console.log('[test] eventBus.spec OK');
