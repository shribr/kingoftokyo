import { listArchivedGameLogs, loadArchivedGameLog, exportSnapshot, importSnapshotFile, currentGameLogSnapshot } from '../../services/logArchiveService.js';
import { listAutoArchives, loadAutoArchive } from '../../services/autoArchiveTempService.js';
import { startReplay, isReplaying, pauseReplay, resumeReplay, stopReplay } from '../../services/replayService.js';
import { createReplayStateOverlay } from './replayStateOverlay.js';

export function createGameLogViewer(store){
  const div = document.createElement('div');
  div.className = 'log-viewer-modal';
  div.innerHTML = `
    <style>
      .log-viewer-modal { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9000; display:flex; align-items:center; justify-content:center; font:13px/1.4 system-ui; }
      .log-viewer { width:820px; max-height:80vh; background:#121a1e; color:#eee; border:1px solid #333; border-radius:8px; display:flex; flex-direction:column; }
      .log-viewer header { padding:8px 12px; background:#1e2b30; display:flex; gap:8px; align-items:center; }
      .log-viewer header h3 { margin:0; font-size:14px; flex:1; }
  .log-list { width:220px; border-right:1px solid #222; overflow:auto; } 
      .log-body { flex:1; overflow:auto; font-family:monospace; background:#0b1012; }
      .viewer-main { display:flex; flex:1; }
      .log-list button { width:100%; text-align:left; padding:4px 6px; background:#182226; color:#ddd; border:none; border-bottom:1px solid #222; cursor:pointer; font-size:12px; }
      .log-list button:hover { background:#223037; }
  .section-label { font-size:10px; opacity:.7; padding:4px 6px; background:#111; text-transform:uppercase; letter-spacing:.5px; }
  .replay-controls { display:flex; gap:6px; padding:4px 6px; background:#162026; align-items:center; }
  .replay-controls button { flex:0 0 auto; }
      .log-entry { padding:2px 6px; border-bottom:1px solid #111; }
      .log-entry:nth-child(odd){ background:#111b20; }
      .log-entry .ts { color:#5fa3c7; }
      .log-entry .type { color:#f7b955; margin-right:4px; }
      .toolbar-btn { background:#264653; color:#fff; border:1px solid #3d6f82; padding:3px 6px; cursor:pointer; font-size:11px; }
      .toolbar-btn:hover { background:#2a5d6d; }
      .close-btn { background:#512f2f; }
      .close-btn:hover { background:#6d3b3b; }
      input[type=file] { display:none; }
    </style>
    <div class="log-viewer">
      <header>
        <h3>📜 Game Log Viewer</h3>
        <button data-export-live class="toolbar-btn">Export Live</button>
        <button data-archive-live class="toolbar-btn">Archive Live</button>
        <button data-import class="toolbar-btn">Import</button>
        <button data-close class="toolbar-btn close-btn">Close</button>
        <input type="file" data-file accept="application/json" />
      </header>
      <div class="viewer-main">
        <div class="log-list" data-list></div>
        <div class="log-body" data-body>
          <div style="padding:6px;font-size:12px;">Select a snapshot on the left.</div>
        </div>
      </div>
    </div>`;

  function refreshList(){
    const listEl = div.querySelector('[data-list]');
    listEl.innerHTML='';
    // Auto archives first
    const auto = listAutoArchives().filter(x=>x.type==='game').sort((a,b)=> b.ts-a.ts);
    if (auto.length){
      const lbl = document.createElement('div'); lbl.className='section-label'; lbl.textContent='Auto Archives'; listEl.appendChild(lbl);
      auto.forEach(m => {
        const b = document.createElement('button');
        b.textContent = `${new Date(m.ts).toLocaleTimeString()} – auto`;
        b.addEventListener('click', ()=> loadAuto(m.key));
        listEl.appendChild(b);
      });
    }
    const list = listArchivedGameLogs().slice().sort((a,b)=> b.ts-a.ts);
    if (list.length){
      const lbl2 = document.createElement('div'); lbl2.className='section-label'; lbl2.textContent='Manual Snapshots'; listEl.appendChild(lbl2);
      list.forEach(m => {
        const b = document.createElement('button');
        b.textContent = `${new Date(m.ts).toLocaleTimeString()} – ${m.name}`;
        b.addEventListener('click', ()=> loadSnapshot(m.id));
        listEl.appendChild(b);
      });
    }
  }
  function loadAuto(key){
    const payload = loadAutoArchive(key);
    renderPayload(payload);
  }
  function loadSnapshot(id){
    const payload = loadArchivedGameLog(id);
    renderPayload(payload);
  }
  function renderPayload(payload){
    const body = div.querySelector('[data-body]');
    if (!payload) { body.textContent='Snapshot missing.'; return; }
    const { data, meta } = payload;
    const header = `<div style="padding:6px;font-size:12px;">Loaded <strong>${meta.name||'Auto Archive'}</strong> (${data.length} entries)</div>`;
    const replayBar = `<div class='replay-controls'>
      <button data-replay-start class='toolbar-btn'>Start Game Replay</button>
      <button data-replay-pause class='toolbar-btn' disabled>Pause</button>
      <button data-replay-resume class='toolbar-btn' disabled>Resume</button>
      <button data-replay-stop class='toolbar-btn' disabled>Stop</button>
      <span data-replay-status style='font-size:11px;opacity:.7;'>Idle</span>
    </div>`;
    const entriesHtml = data.map(e => {
      const time = new Date(e.ts).toLocaleTimeString();
      return `<div class='log-entry'><span class='ts'>${time}</span> <span class='type'>[${e.type}]</span> ${escapeHtml(e.message||'')}</div>`;
    }).join('');
    body.innerHTML = header + replayBar + `<div>${entriesHtml}</div>`;
    wireReplayControls(payload);
  }
  function wireReplayControls(payload){
    const body = div.querySelector('[data-body]');
    const startBtn = body.querySelector('[data-replay-start]');
    const pauseBtn = body.querySelector('[data-replay-pause]');
    const resumeBtn = body.querySelector('[data-replay-resume]');
    const stopBtn = body.querySelector('[data-replay-stop]');
    const status = body.querySelector('[data-replay-status]');
    
    let replayOverlay = null;
    
    function setState(s){ if (status) status.textContent = s; }
    
    startBtn.addEventListener('click', ()=> {
      if (isReplaying()) return;
      try {
        // Create and show replay state overlay
        replayOverlay = createReplayStateOverlay();
        replayOverlay.show();
        
        // Initialize overlay with snapshot data if available
        if (payload.stateSnapshot) {
          const snapshot = payload.stateSnapshot;
          replayOverlay.updatePlayers(snapshot.players || []);
          replayOverlay.updateTokyo(snapshot.tokyo || {});
          replayOverlay.updatePhase(snapshot.phase?.current, snapshot.players?.find(p => p.status?.active)?.name);
          replayOverlay.updateDice(snapshot.dice?.results || []);
          replayOverlay.updateStatus('State Restored ✓');
        } else {
          replayOverlay.updateStatus('Log-Only Replay');
        }
        
        // Set up event listeners for replay progress
        const updateProgress = (e) => {
          if (replayOverlay) {
            const { index, total } = e.detail;
            replayOverlay.updateProgress(index + 1, total);
            
            // Update status with progress info
            const percent = Math.round(((index + 1) / total) * 100);
            replayOverlay.updateStatus(`Playing... ${percent}%`);
          }
        };
        
        const updateState = (e) => {
          if (replayOverlay && e.detail) {
            // Update overlay based on entry type
            const entry = e.detail.entry || e.detail;
            if (entry.kind === 'vp' || entry.message?.includes('VP')) {
              // Refresh players to show VP changes
              const state = store.getState();
              if (state.players) {
                replayOverlay.updatePlayers(Object.values(state.players));
              }
            }
            if (entry.kind === 'tokyo' || entry.message?.includes('Tokyo')) {
              const state = store.getState();
              replayOverlay.updateTokyo(state.tokyo || {});
            }
          }
        };
        
        const onReplayEnd = () => {
          window.removeEventListener('replay.entry', updateProgress);
          window.removeEventListener('replay.entry', updateState);
          window.removeEventListener('replay.ended', onReplayEnd);
          if (replayOverlay) {
            replayOverlay.updateStatus('Replay Complete ✓');
            // Auto-hide overlay after 3 seconds
            setTimeout(() => {
              if (replayOverlay) {
                replayOverlay.destroy();
                replayOverlay = null;
              }
            }, 3000);
          }
        };
        
        window.addEventListener('replay.entry', updateProgress);
        window.addEventListener('replay.entry', updateState);
        window.addEventListener('replay.ended', onReplayEnd);
        
        // Wire overlay controls to replay service
        const activeReplay = startReplay(window.__KOT_NEW__.store, payload, { speed: 500 });
        if (replayOverlay && activeReplay) {
          replayOverlay.wireReplayControls(activeReplay);
          replayOverlay.updateProgress(0, payload.data?.length || 0);
        }
        
        setState('Replaying');
        startBtn.disabled = true; pauseBtn.disabled = false; stopBtn.disabled = false;
      } catch(e){ 
        alert('Replay failed: '+e.message); 
        if (replayOverlay) {
          replayOverlay.destroy();
          replayOverlay = null;
        }
      }
    });
    
    pauseBtn.addEventListener('click', ()=> { 
      pauseReplay(); 
      pauseBtn.disabled=true; 
      resumeBtn.disabled=false; 
      setState('Paused'); 
      if (replayOverlay) replayOverlay.updateStatus('Paused');
    });
    
    resumeBtn.addEventListener('click', ()=> { 
      resumeReplay(); 
      resumeBtn.disabled=true; 
      pauseBtn.disabled=false; 
      setState('Replaying'); 
      if (replayOverlay) replayOverlay.updateStatus('Playing');
    });
    
    stopBtn.addEventListener('click', ()=> { 
      stopReplay(); 
      startBtn.disabled=false; 
      pauseBtn.disabled=true; 
      resumeBtn.disabled=true; 
      stopBtn.disabled=true; 
      setState('Stopped'); 
      if (replayOverlay) {
        replayOverlay.destroy();
        replayOverlay = null;
      }
    });
  }
  function escapeHtml(str){ return str.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]||c)); }

  div.querySelector('[data-close]').addEventListener('click', ()=> div.remove());
  div.querySelector('[data-export-live]').addEventListener('click', ()=> exportSnapshot(currentGameLogSnapshot(store), 'game_log_live.json'));
  div.querySelector('[data-archive-live]').addEventListener('click', ()=> { archiveAndRefresh(); });
  div.querySelector('[data-import]').addEventListener('click', ()=> div.querySelector('[data-file]').click());
  div.querySelector('[data-file]').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    importSnapshotFile(file, {}, (err, snap)=> {
      if (err) { alert('Import failed: '+err.message); return; }
      refreshList();
      if (snap?.meta?.id) loadSnapshot(snap.meta.id);
    });
  });

  function archiveAndRefresh(){
    import('../../services/logArchiveService.js').then(mod => {
      mod.archiveGameLog(store, 'Snapshot');
      refreshList();
    });
  }
  refreshList();
  return { root: div };
}
