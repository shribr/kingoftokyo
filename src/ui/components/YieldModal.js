// YieldModal.js - unified yield decision modal (human defenders)
// Renders single pending prompt at a time; cycles through queue if multiple.
// Accessibility: role="dialog", aria-modal, focus trapping basic (return focus on close).

import { yieldPromptDecided, yieldAllResolved } from '../../core/actions.js';

export function createYieldModal(store, mountEl=document.body){
  const modalId = 'kot-yield-modal';
  let root = document.getElementById(modalId);
  if (!root){
    root = document.createElement('div');
    root.id = modalId;
    root.className = 'modal hidden';
    mountEl.appendChild(root);
  }

  function getPendingHumanPrompts(state){
    const prompts = state.yield?.prompts || [];
    const humans = prompts.filter(p => p.decision == null && !state.players.byId[p.defenderId].isAI && !state.players.byId[p.defenderId].isCPU);
    return humans;
  }

  function findAttacker(state){
    return state.meta?.activePlayerId || state.players?.order[state.meta?.activePlayerIndex||0];
  }

  function close(){
    if (root.classList.contains('hidden')) return;
    root.classList.add('closing');
    const DURATION = 220; // sync with CSS yieldModalOut
    setTimeout(()=>{
      root.classList.remove('closing');
      root.classList.add('hidden');
      root.innerHTML='';
    }, DURATION);
  }

  function maybeFinalize(state){
    const prompts = state.yield?.prompts || [];
    if (!prompts.length) return;
    const attackerId = prompts[0].attackerId;
    const unresolved = prompts.some(p => p.attackerId===attackerId && p.decision == null);
    if (!unresolved){
      // Collect decisions for unified final resolution if not already emitted.
      // If reducer flow.resolvedAt already exists, skip (already finalized by AI-only path).
      if (!(state.yield?.flow?.resolvedAt)) {
        const decisions = prompts.filter(p=>p.attackerId===attackerId).map(p=>({ defenderId:p.defenderId, slot:p.slot, decision:p.decision, advisory:p.advisory, decidedAt:p.decidedAt||Date.now() }));
        store.dispatch(yieldAllResolved(attackerId, decisions, state.meta?.turnCycleId));
      }
    }
  }

  function render(){
    const state = store.getState();
    const pending = getPendingHumanPrompts(state);
    if (!pending.length){ close(); maybeFinalize(state); return; }
    const prompt = pending[0];
    const defender = state.players.byId[prompt.defenderId];
    const attackerId = prompt.attackerId;
    const damage = prompt.damage;
    const advisory = prompt.advisory;

    root.className = 'modal';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.setAttribute('aria-labelledby','yield-modal-title');
    const slotName = prompt.slot === 'city' ? 'Tokyo City' : 'Tokyo Bay';
    const projectedHP = typeof defender.health === 'number' && typeof damage === 'number'
      ? Math.max(0, defender.health - damage)
      : null;
    root.innerHTML = `
      <div class="modal-content" style="max-width:640px" data-yield-modal>
        <header class="yield-header">
          <h2 id="yield-modal-title">${slotName.toUpperCase()} UNDER ATTACK!</h2>
          <div class="yield-context">${defender.name}, you were hit for <strong>${damage}</strong> damage.</div>
        </header>
        <div class="yield-body">
          <p class="yield-question">Do you want to <strong>stay</strong> in ${slotName} or <strong>yield</strong> your slot?</p>
          <div class="damage-preview" aria-live="polite">
            ${projectedHP!=null ? `
              <div class="damage-line"><span class="label">Damage:</span> <span class="value damage">${damage}</span></div>
              <div class="health-line"><span class="label">Health:</span> <span class="value health">${defender.health} → ${projectedHP}</span></div>
            ` : ''}
          </div>
          ${advisory ? `<div class="advisory" data-advisory><em>Suggestion:</em> ${advisory.suggestion === 'yield' ? 'Yield' : 'Stay'} – ${advisory.reason || ''}${advisory.seed ? `<br/><small>seed:${advisory.seed}</small>`:''}</div>`:''}
          <div class="yield-actions">
            <button id="yield-stay-btn" class="btn-stay" data-action="stay" autofocus>Stay in Tokyo</button>
            <button id="yield-leave-btn" class="btn-yield" data-action="yield">Leave Tokyo</button>
          </div>
        </div>
      </div>`;

    root.querySelector('#yield-stay-btn').onclick = () => {
      store.dispatch(yieldPromptDecided(defender.id, attackerId, prompt.slot, 'stay'));
      maybeFinalize(store.getState());
      render();
    };
    root.querySelector('#yield-leave-btn').onclick = () => {
      store.dispatch(yieldPromptDecided(defender.id, attackerId, prompt.slot, 'yield'));
      // Tokyo leave handled by existing listener path when decision processed (playerLeftTokyo dispatch occurs).
      maybeFinalize(store.getState());
      render();
    };
  }

  const unsubscribe = store.subscribe(render);
  render();
  return { destroy(){ unsubscribe(); close(); } };
}
