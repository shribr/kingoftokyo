// YieldAdvisoryNotification.js - subtle advisory notification for yield decisions
// Displays AI-generated advice in a glass-morphic bubble at bottom-left corner

export function createYieldAdvisoryNotification(store, mountEl = document.body) {
  const notificationId = 'kot-yield-advisory-notification';
  let root = document.getElementById(notificationId);
  let dismissTimer = null;
  
  if (!root) {
    root = document.createElement('div');
    root.id = notificationId;
    root.className = 'yield-advisory-notification hidden';
    mountEl.appendChild(root);
  }

  function formatPlayerName(defenderId, state) {
    const player = state.players.byId[defenderId];
    if (!player) return defenderId;
    return player.name || player.monster?.name || defenderId;
  }

  function show(prompt, state) {
    if (!prompt || !prompt.advisory) return;
    
    const defenderName = formatPlayerName(prompt.defenderId, state);
    const slotName = prompt.slot === 'city' ? 'Tokyo City' : 'Tokyo Bay';
    const suggestion = prompt.advisory.suggestion === 'yield' ? 'Leave' : 'Stay in';
    const reason = prompt.advisory.reason || '';
    
    // Clear any existing dismiss timer
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    
    root.innerHTML = `
      <div class="advisory-content">
        <div class="advisory-header">
          <span class="advisory-icon">💡</span>
          <span class="advisory-title">Advisory for ${defenderName}</span>
          <button class="advisory-dismiss" aria-label="Dismiss" title="Dismiss">&times;</button>
        </div>
        <div class="advisory-body">
          <strong>Suggestion:</strong> ${suggestion} ${slotName}
          ${reason ? `<br><span class="advisory-reason">${reason}</span>` : ''}
        </div>
      </div>
    `;
    
    // Show with fade-in animation
    root.classList.remove('hidden', 'fade-out');
    root.classList.add('fade-in');
    
    // Auto-dismiss after 10 seconds
    dismissTimer = setTimeout(() => {
      hide();
    }, 10000);
    
    // Manual dismiss handler
    const dismissBtn = root.querySelector('.advisory-dismiss');
    if (dismissBtn) {
      dismissBtn.onclick = () => hide();
    }
  }

  function hide() {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    
    if (!root.classList.contains('hidden')) {
      root.classList.remove('fade-in');
      root.classList.add('fade-out');
      
      setTimeout(() => {
        root.classList.add('hidden');
        root.classList.remove('fade-out');
        root.innerHTML = '';
      }, 300); // Match CSS animation duration
    }
  }

  function render() {
    const state = store.getState();
    const prompts = state.yield?.prompts || [];
    
    // Find first human prompt with advisory
    const humanPrompt = prompts.find(p => {
      const player = state.players.byId[p.defenderId];
      return p.decision == null && 
             player && 
             !player.isCPU && 
             !player.isAI && 
             p.advisory;
    });
    
    if (humanPrompt) {
      show(humanPrompt, state);
    } else {
      // Hide if no valid prompts (e.g., decision was made)
      if (!root.classList.contains('hidden')) {
        hide();
      }
    }
  }

  // Subscribe to state changes
  const unsubscribe = store.subscribe(render);
  
  // Initial render
  render();
  
  return { unsubscribe };
}
