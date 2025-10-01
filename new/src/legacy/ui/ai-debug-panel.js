// Simple AI Decision Debug Panel
(function(){
  if (window.AIDebugPanelInitialized) return; // prevent double init
  window.AIDebugPanelInitialized = true;

  function ensurePanel(){
    let panel = document.getElementById('ai-debug-panel');
    if (!panel){
      panel = document.createElement('div');
      panel.id = 'ai-debug-panel';
      panel.style.position = 'fixed';
      panel.style.bottom = '8px';
      panel.style.right = '8px';
      panel.style.width = '300px';
      panel.style.maxHeight = '340px';
      panel.style.overflow = 'auto';
      panel.style.background = 'rgba(0,0,0,0.75)';
      panel.style.color = '#ffd855';
      panel.style.fontSize = '11px';
      panel.style.fontFamily = 'monospace';
      panel.style.padding = '6px 8px';
      panel.style.border = '1px solid #444';
      panel.style.borderRadius = '6px';
      panel.style.zIndex = 9999;
      const hidden = localStorage.getItem('aiDebugPanelHidden') === 'true';
      panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;font-weight:bold;">'
        +'<span>AI Decision Debug</span>'
        +'<button id="ai-debug-toggle" style="background:#222;color:#ffd855;border:1px solid #555;padding:2px 6px;font-size:10px;cursor:pointer;border-radius:4px;">'+(hidden?'Show':'Hide')+'</button>'
        +'</div>'
        +'<div id="ai-debug-content" style="'+(hidden?'display:none;':'')+'"></div>';
      document.body.appendChild(panel);
      const btn = panel.querySelector('#ai-debug-toggle');
      btn.addEventListener('click', ()=>{
        const content = panel.querySelector('#ai-debug-content');
        const isHidden = content.style.display === 'none';
        if (isHidden){
          content.style.display = '';
          btn.textContent = 'Hide';
          localStorage.setItem('aiDebugPanelHidden','false');
        } else {
          content.style.display = 'none';
          btn.textContent = 'Show';
          localStorage.setItem('aiDebugPanelHidden','true');
        }
      });
    }
    return panel;
  }

  function formatPairEV(pairEV){
    if(!pairEV || !pairEV.length) return '—';
    return pairEV.map(ev=>`${ev.face}: p=${ev.probComplete} EV+${ev.evGain} contrib=${ev.contribution}`).join('<br>');
  }

  window.renderAIDecisionDebug = function(decision){
    const panel = ensurePanel();
    const content = panel.querySelector('#ai-debug-content');
    if(!content) return;
    const contentHidden = content.style.display === 'none';
    if (contentHidden) return; // do not render when hidden
    const d = decision || {};
    const imp = d.improvementDetail || {};
    const timestamp = new Date().toLocaleTimeString();
    content.innerHTML = `
      <div style="margin-bottom:6px;">
        <div><strong>${timestamp}</strong></div>
        <div>Action: <b>${d.action}</b></div>
        <div>Reason: ${d.reason || ''}</div>
        <div>Confidence: ${(d.confidence||0).toFixed(2)}</div>
        <div>TwoOfKinds: ${(imp.twoOfKinds||[]).join(', ')||'—'}</div>
        <div>DiceRemaining: ${imp.diceRemaining ?? '—'} RollsLeft: ${imp.rollsLeft ?? '—'}</div>
        <div>Pair EV:<br>${formatPairEV(imp.pairEVDetails)}</div>
        <div>Note: ${imp.note || ''}</div>
      </div>` + content.innerHTML.split('</div><!--history-->')[0];
  };

  // Optional: expose a hook point; game code can call window.renderAIDecisionDebug(decision)
})();
