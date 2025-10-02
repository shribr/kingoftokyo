/** logArchiveService.js
 * Archive, export and import game log entries and AI Decision Tree snapshots.
 * Storage Strategy:
 *  - localStorage keys (JSON):
 *      KOT_ARCHIVE_GAME_LOGS, KOT_ARCHIVE_AIDT_LOGS
 *    Each holds an array of lightweight metadata objects WITHOUT inlining the full data to keep listing fast.
 *  - Full payload stored under per-id keys:
 *      KOT_ARCHIVE_GAME_LOG_<id>
 *      KOT_ARCHIVE_AIDT_LOG_<id>
 *  This avoids repeatedly rewriting large arrays when adding a snapshot.
 */
import { getAIDecisionTree } from './aiDecisionService.js';

function lsGet(key, fallback){
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(_) { return fallback; }
}
function lsSet(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); } catch(_) {} }

function makeMeta(type, name, data){
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type,
    name: name || `${type} ${new Date().toLocaleString()}`,
    ts: Date.now(),
    size: Array.isArray(data) ? data.length : (data && data.rounds ? data.rounds.length : 0)
  };
}

export function archiveGameLog(store, name){
  try {
    const entries = store.getState().log?.entries || [];
    const data = entries.slice();
    const meta = makeMeta('gameLog', name, data);
    const list = lsGet('KOT_ARCHIVE_GAME_LOGS', []);
    list.push({ id: meta.id, name: meta.name, ts: meta.ts, size: meta.size });
    lsSet('KOT_ARCHIVE_GAME_LOGS', list);
    lsSet('KOT_ARCHIVE_GAME_LOG_'+meta.id, { meta, data });
    return meta;
  } catch(e) { console.warn('[logArchiveService] archiveGameLog failed', e); return null; }
}

export function archiveAIDT(store, name){
  try {
    const tree = getAIDecisionTree();
    const data = JSON.parse(JSON.stringify(tree)); // deep copy
    const meta = makeMeta('aidt', name, data.rounds||[]);
    const list = lsGet('KOT_ARCHIVE_AIDT_LOGS', []);
    list.push({ id: meta.id, name: meta.name, ts: meta.ts, size: meta.size });
    lsSet('KOT_ARCHIVE_AIDT_LOGS', list);
    lsSet('KOT_ARCHIVE_AIDT_LOG_'+meta.id, { meta, data });
    return meta;
  } catch(e) { console.warn('[logArchiveService] archiveAIDT failed', e); return null; }
}

export function listArchivedGameLogs(){ return lsGet('KOT_ARCHIVE_GAME_LOGS', []); }
export function listArchivedAIDT(){ return lsGet('KOT_ARCHIVE_AIDT_LOGS', []); }

export function loadArchivedGameLog(id){ return lsGet('KOT_ARCHIVE_GAME_LOG_'+id, null); }
export function loadArchivedAIDT(id){ return lsGet('KOT_ARCHIVE_AIDT_LOG_'+id, null); }

export function exportSnapshot(snapshot, filename){
  try {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || (snapshot?.meta?.name?.replace(/\s+/g,'_') + '.json') || 'log.json';
    document.body.appendChild(a); a.click(); setTimeout(()=>{ try { a.remove(); } catch(_){} }, 0);
  } catch(e) { console.warn('[logArchiveService] exportSnapshot failed', e); }
}

export function importSnapshotFile(file, opts={}, cb){
  try {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        if (!json || !json.meta || !json.data) throw new Error('Invalid snapshot schema');
        const type = json.meta.type || guessType(json);
        if (type === 'gameLog') {
          // register into archive lists
          const list = lsGet('KOT_ARCHIVE_GAME_LOGS', []);
          list.push({ id: json.meta.id, name: json.meta.name, ts: json.meta.ts, size: json.meta.size });
          lsSet('KOT_ARCHIVE_GAME_LOGS', list);
          lsSet('KOT_ARCHIVE_GAME_LOG_'+json.meta.id, json);
        } else if (type === 'aidt') {
          const list = lsGet('KOT_ARCHIVE_AIDT_LOGS', []);
            list.push({ id: json.meta.id, name: json.meta.name, ts: json.meta.ts, size: json.meta.size });
            lsSet('KOT_ARCHIVE_AIDT_LOGS', list);
            lsSet('KOT_ARCHIVE_AIDT_LOG_'+json.meta.id, json);
        }
        cb && cb(null, json);
      } catch(err) { cb && cb(err); }
    };
    reader.onerror = () => cb && cb(reader.error || new Error('read failed'));
    reader.readAsText(file);
  } catch(e) { cb && cb(e); }
}

function guessType(json){
  if (Array.isArray(json.data) && json.data.length && json.data[0].message) return 'gameLog';
  if (json.data && json.data.rounds) return 'aidt';
  return 'unknown';
}

// Convenience to get current live snapshots for export without archiving
export function currentGameLogSnapshot(store){
  const entries = store.getState().log?.entries || [];
  return { meta:{ type:'gameLog', name:'Live Game Log', ts: Date.now(), id:'live_game_'+Date.now(), size: entries.length }, data: entries };
}
export function currentAIDTSnapshot(store){
  const tree = getAIDecisionTree();
  return { meta:{ type:'aidt', name:'Live AIDT', ts: Date.now(), id:'live_aidt_'+Date.now(), size: (tree.rounds||[]).length }, data: JSON.parse(JSON.stringify(tree)) };
}
