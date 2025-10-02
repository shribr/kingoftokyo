import { listArchivedAIDT, loadArchivedAIDT, exportSnapshot, importSnapshotFile, currentAIDTSnapshot } from '../../services/logArchiveService.js';

export function createAIDecisionLogViewer(store){
  const div = document.createElement('div');
  div.className = 'aidt-viewer-modal';
  div.innerHTML = `
    <style>
      .aidt-viewer-modal { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9000; display:flex; align-items:center; justify-content:center; font:12px/1.4 system-ui; }
      .aidt-viewer { width:860px; max-height:82vh; background:#141b1f; color:#eee; border:1px solid #333; border-radius:8px; display:flex; flex-direction:column; }
      .aidt-viewer header { padding:8px 12px; background:#1e2b30; display:flex; gap:8px; align-items:center; }
      .aidt-viewer header h3 { margin:0; font-size:14px; flex:1; }
      .log-list { width:240px; border-right:1px solid #222; overflow:auto; }
      .log-body { flex:1; overflow:auto; font-family:monospace; background:#0b1012; }
      .viewer-main { display:flex; flex:1; }
      .log-list button { width:100%; text-align:left; padding:4px 6px; background:#182226; color:#ddd; border:none; border-bottom:1px solid #222; cursor:pointer; font-size:12px; }
      .log-list button:hover { background:#223037; }
      .roll-node { padding:3px 6px; border-bottom:1px solid #111; }
      .roll-node:nth-child(odd){ background:#10161a; }
      .roll-node .faces { color:#5fa3c7; }
      .toolbar-btn { background:#264653; color:#fff; border:1px solid #3d6f82; padding:3px 6px; cursor:pointer; font-size:11px; }
      .toolbar-btn:hover { background:#2a5d6d; }
      .close-btn { background:#512f2f; }
      .close-btn:hover { background:#6d3b3b; }
      input[type=file] { display:none; }
    </style>
    <div class="aidt-viewer">
      <header>
        <h3>🧠 AI Decision Tree Viewer</h3>
        <button data-export-live class="toolbar-btn">Export Live</button>
        <button data-archive-live class="toolbar-btn">Archive Live</button>
        <button data-import class="toolbar-btn">Import</button>
        <button data-close class="toolbar-btn close-btn">Close</button>
        <input type="file" data-file accept="application/json" />
      </header>
      <div class="viewer-main">
        <div class="log-list" data-list></div>
        <div class="log-body" data-body>Select an AI snapshot.</div>
      </div>
    </div>`;

  function refreshList(){
    const listEl = div.querySelector('[data-list]');
    listEl.innerHTML='';
    const list = listArchivedAIDT().slice().sort((a,b)=> b.ts-a.ts);
    list.forEach(m => {
      const b = document.createElement('button');
      b.textContent = `${new Date(m.ts).toLocaleTimeString()} – ${m.name}`;
      b.addEventListener('click', ()=> loadSnapshot(m.id));
      listEl.appendChild(b);
    });
  }
  function loadSnapshot(id){
    const payload = loadArchivedAIDT(id);
    const body = div.querySelector('[data-body]');
    if (!payload) { body.textContent='Snapshot missing.'; return; }
    const { data, meta } = payload;
    const rounds = data.rounds || [];
    let html = `<div style='padding:6px;font-size:12px;'>Loaded <strong>${meta.name}</strong> (${rounds.length} rounds)</div>`;
    rounds.forEach(r => {
      html += `<div style='padding:4px 6px;background:#1d262b;margin-top:4px;font-weight:bold;'>Round ${r.round}</div>`;
      (r.turns||[]).forEach(t => {
        html += `<div style='padding:2px 8px;background:#162026;'>Turn ${t.turn} – rolls:${t.rolls.length}</div>`;
        t.rolls.forEach(node => {
          html += `<div class='roll-node'><span class='faces'>${node.faces}</span> ${node.action||node.stage||''} score:${node.score} ${node.playerName||''}</div>`;
        });
      });
    });
    body.innerHTML = html;
  }
  div.querySelector('[data-close]').addEventListener('click', ()=> div.remove());
  div.querySelector('[data-export-live]').addEventListener('click', ()=> exportSnapshot(currentAIDTSnapshot(store), 'aidt_live.json'));
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
      mod.archiveAIDT(store, 'Snapshot');
      refreshList();
    });
  }
  refreshList();
  return { root: div };
}
