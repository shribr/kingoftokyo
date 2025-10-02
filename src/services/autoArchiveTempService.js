/** autoArchiveTempService.js
 * Handles automatic archival of game logs and AI decision trees into temp storage with
 * filename-like keys and retention (by days + max count per type).
 * Filenames: kot_game_YYYYMMDDHHMMSS.log | kot_aidt_YYYYMMDDHHMMSS.log
 * Storage: localStorage JSON payload { meta, data, stateSnapshot? }
 */
import { currentGameLogSnapshot, currentAIDTSnapshot } from './logArchiveService.js';
import { getAIDecisionTree } from './aiDecisionService.js';
import { captureGameState } from './gameStateSnapshot.js';

const PREFIX_GAME = 'kot_game_';
const PREFIX_AIDT = 'kot_aidt_';

function pad(n){ return n<10 ? '0'+n : ''+n; }
function tsParts(d){ return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds()); }

function buildKey(type, date){ return (type==='game'?PREFIX_GAME:PREFIX_AIDT)+tsParts(date)+'.log'; }

function listKeys(type){
  const keys = Object.keys(localStorage).filter(k => k.startsWith(type==='game'?PREFIX_GAME:PREFIX_AIDT));
  return keys.sort(); // chronological because timestamp embedded
}

function parseStored(key){
  try { const raw = localStorage.getItem(key); return raw? JSON.parse(raw): null; } catch(_){ return null; }
}

function prune(type, maxCount, retentionDays){
  const now = Date.now();
  const msRetention = retentionDays * 86400000;
  const keys = listKeys(type);
  // Remove expired by retention
  keys.forEach(k => {
    const obj = parseStored(k);
    if (!obj || !obj.meta || !obj.meta.ts) return;
    if (now - obj.meta.ts > msRetention) {
      try { localStorage.removeItem(k); } catch(_){}
    }
  });
  // After retention pass, enforce max count (keep newest)
  const remaining = listKeys(type);
  if (remaining.length > maxCount) {
    const toDelete = remaining.slice(0, remaining.length - maxCount); // earliest first
    toDelete.forEach(k => { try { localStorage.removeItem(k); } catch(_){} });
  }
}

export function autoArchiveOnGameOver(store){
  try {
    const st = store.getState();
    const settings = st.settings || {};
    const retentionDays = Math.max(1, parseInt(settings.archiveRetentionDays||3,10));
    const maxPer = Math.max(1, parseInt(settings.archiveMaxPerType||10,10));
    const now = new Date();
    
    // Capture final game state for accurate replay
    const finalStateSnapshot = captureGameState(store);
    
    if (settings.autoArchiveGameLogs){
      const snap = currentGameLogSnapshot(store);
      // Enhance with state snapshot for accurate replay
      if (finalStateSnapshot) {
        snap.stateSnapshot = finalStateSnapshot;
      }
      const key = buildKey('game', now);
      localStorage.setItem(key, JSON.stringify(snap));
      prune('game', maxPer, retentionDays);
    }
    if (settings.autoArchiveAIDTLogs){
      const tree = getAIDecisionTree();
      const snap = { 
        meta:{ type:'aidt', name:'Auto AIDT '+now.toLocaleString(), ts: Date.now(), id:'auto_aidt_'+Date.now(), size:(tree.rounds||[]).length }, 
        data: JSON.parse(JSON.stringify(tree))
      };
      // Add state snapshot to AIDT as well for context
      if (finalStateSnapshot) {
        snap.stateSnapshot = finalStateSnapshot;
      }
      const key = buildKey('aidt', now);
      localStorage.setItem(key, JSON.stringify(snap));
      prune('aidt', maxPer, retentionDays);
    }
  } catch(e){ console.warn('[autoArchiveTempService] failed', e); }
}

export function listAutoArchives(){
  const game = listKeys('game').map(k=> ({ key:k, type:'game', ts: extractTs(k) }));
  const aidt = listKeys('aidt').map(k=> ({ key:k, type:'aidt', ts: extractTs(k) }));
  return [...game, ...aidt].sort((a,b)=> a.ts - b.ts);
}

function extractTs(key){
  // key format kot_game_YYYYMMDDHHMMSS.log
  const m = key.match(/(\d{14})/); if (!m) return 0;
  const s = m[1];
  const year = parseInt(s.slice(0,4),10);
  const mon = parseInt(s.slice(4,6),10)-1;
  const day = parseInt(s.slice(6,8),10);
  const hr = parseInt(s.slice(8,10),10);
  const min = parseInt(s.slice(10,12),10);
  const sec = parseInt(s.slice(12,14),10);
  return new Date(year,mon,day,hr,min,sec).getTime();
}

export function loadAutoArchive(key){ return parseStored(key); }

export function deleteAutoArchive(key){ try { localStorage.removeItem(key); } catch(_){} }
