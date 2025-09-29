/** tokyo-yield-modal.component.js
 * Modal for human players to decide whether to yield Tokyo when attacked.
 * Recreates the legacy decision modal UI with Tokyo-specific styling.
 */
import { store } from '../../bootstrap/index.js';
import { yieldPromptDecided } from '../../core/actions.js';
import { selectPlayerById, selectMonsterById } from '../../core/selectors.js';

export function build({ selector, emit }) {
  const root = document.createElement('div');
  root.id = 'tokyo-yield-modal';
  root.className = 'cmp-tokyo-yield-modal modal-shell hidden';
  root.innerHTML = `
    <div class="modal-overlay" data-overlay></div>
    <div class="decision-modal" data-modal>
      <div class="decision-header">
        <h2 data-title>TOKYO UNDER ATTACK!</h2>
        <div class="decision-context" data-context>
          You were attacked by an opponent!
        </div>
      </div>
      <div class="decision-body">
        <p data-message>Do you want to leave Tokyo?</p>
        <div class="decision-damage-info" data-damage-info>
          <!-- Damage and health info will be populated here -->
        </div>
      </div>
      <div class="decision-actions">
        <button class="decision-btn btn primary" data-stay>
          Stay in Tokyo
        </button>
        <button class="decision-btn btn secondary" data-leave>
          Leave Tokyo
        </button>
      </div>
    </div>
  `;

  // Event handlers
  const stayBtn = root.querySelector('[data-stay]');
  const leaveBtn = root.querySelector('[data-leave]');
  const overlay = root.querySelector('[data-overlay]');

  function handleDecision(decision) {
    const currentPrompt = root._currentPrompt;
    if (!currentPrompt) return;
    
    console.log(`🏯 Tokyo Yield Decision: ${decision} by ${currentPrompt.defenderId}`);
    store.dispatch(yieldPromptDecided(
      currentPrompt.defenderId, 
      currentPrompt.attackerId, 
      currentPrompt.slot, 
      decision
    ));
    
    hide();
  }

  stayBtn.addEventListener('click', () => handleDecision('stay'));
  leaveBtn.addEventListener('click', () => handleDecision('yield'));
  
  // Optional: Allow clicking overlay to default to 'stay' (staying is generally safer)
  overlay.addEventListener('click', () => handleDecision('stay'));

  function show(prompt) {
    root._currentPrompt = prompt;
    updateContent(prompt);
    root.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  function hide() {
    root.classList.add('hidden');
    root._currentPrompt = null;
    document.body.style.overflow = ''; // Restore scrolling
  }

  function updateContent(prompt) {
    if (!prompt) return;
    
    const state = store.getState();
    const defender = selectPlayerById(state, prompt.defenderId);
    const attacker = selectPlayerById(state, prompt.attackerId);
    const defenderMonster = defender ? selectMonsterById(state, defender.monsterId) : null;
    const attackerMonster = attacker ? selectMonsterById(state, attacker.monsterId) : null;

    const titleEl = root.querySelector('[data-title]');
    const contextEl = root.querySelector('[data-context]');
    const messageEl = root.querySelector('[data-message]');
    const damageInfoEl = root.querySelector('[data-damage-info]');

    // Update title based on slot
    const slotName = prompt.slot === 'city' ? 'Tokyo City' : 'Tokyo Bay';
    titleEl.textContent = `${slotName.toUpperCase()} UNDER ATTACK!`;

    // Update context with attacker info
    const attackerName = attackerMonster?.name || attacker?.name || 'Unknown';
    contextEl.textContent = `${attackerName} has attacked you!`;

    // Update main message
    const defenderName = defenderMonster?.name || defender?.name || 'You';
    messageEl.textContent = `${defenderName}, do you want to leave ${slotName}?`;

    // Update damage info
    if (prompt.damage && defender) {
      const currentHP = defender.health;
      const projectedHP = Math.max(0, currentHP - prompt.damage);
      damageInfoEl.innerHTML = `
        <div class="damage-preview">
          <div class="damage-stat">
            <span class="label">Damage Taken:</span>
            <span class="value damage">${prompt.damage}</span>
          </div>
          <div class="health-stat">
            <span class="label">Health:</span>
            <span class="value health">${currentHP} → ${projectedHP}</span>
          </div>
        </div>
      `;
      damageInfoEl.style.display = 'block';
    } else {
      damageInfoEl.style.display = 'none';
    }
  }

  // Store reference for external access
  root._show = show;
  root._hide = hide;

  return { root, update: () => update(root) };
}

export function update(root) {
  if (!root) return;
  
  const state = store.getState();
  const yieldPrompts = state.yield?.prompts || [];
  
  // Find any pending yield prompts for human players
  const humanPrompt = yieldPrompts.find(p => {
    const player = selectPlayerById(state, p.defenderId);
    return player && !player.isCPU && !player.isAi && p.decision === null;
  });
  
  console.log(`🏯 Tokyo Yield Modal: Found ${yieldPrompts.length} prompts, ${humanPrompt ? 1 : 0} for humans`);

  if (humanPrompt && root.classList.contains('hidden')) {
    // Show modal for human decision
    console.log(`🏯 Showing Tokyo yield modal for ${humanPrompt.defenderId}`);
    root._show(humanPrompt);
  } else if (!humanPrompt && !root.classList.contains('hidden')) {
    // Hide modal if no pending human decisions
    console.log(`🏯 Hiding Tokyo yield modal`);
    root._hide();
  }
}