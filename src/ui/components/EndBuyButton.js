// EndBuyButton.js - appears during BUY_WAIT allowing human to proceed to CLEANUP
import { Phases } from '../../core/phaseFSM.js';

export function mountEndBuyButton(store){
  const id = 'kot-end-buy-btn';
  let btn = document.getElementById(id);
  if (!btn){
    btn = document.createElement('button');
    btn.id = id;
    btn.textContent = 'End Buy Phase';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:8500;padding:10px 18px;font-size:14px;background:#222;color:#ffd400;border:2px solid #000;cursor:pointer;box-shadow:4px 4px 0 #000';
    document.body.appendChild(btn);
  }
  btn.onclick = () => {
    const st = store.getState();
    if (st.phase === Phases.BUY_WAIT) {
      // Transition event to CLEANUP
      const phaseEvents = typeof window !== 'undefined' ? window.__KOT_NEW__?.phaseEventsService : null;
      if (phaseEvents) phaseEvents.publish('POST_PURCHASE_RESOLVED'); else {
        // fallback handled by turnService subscription already (will detect idle effect queue)
        // Force effect queue idle by no-op; rely on auto-advance check
        setTimeout(()=>{},0);
      }
    }
  };

  function sync(){
    const st = store.getState();
    const activeId = st.players.order[st.meta.activePlayerIndex % st.players.order.length];
    const active = st.players.byId[activeId];
    const human = !(active.isCPU || active.isAI);
    const visible = st.phase === Phases.BUY_WAIT && human;
    btn.style.display = visible ? 'block':'none';
  }
  const unsub = store.subscribe(sync);
  sync();
  return { destroy(){ unsub(); btn.remove(); } };
}
