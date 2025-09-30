/** aiDecisionService.js
 * Captures AI decision nodes during dice / card phases.
 * For now: mock generator to be replaced with real logic.
 */
import { eventBus } from '../core/eventBus.js';
import { tallyFaces, extractTriples, DIE_FACES } from '../domain/dice.js';
import { selectActivePlayerId, selectTokyoOccupants } from '../core/selectors.js';
import { diceToggleKeep, DICE_ROLL_STARTED, DICE_ROLLED, DICE_REROLL_USED, PHASE_CHANGED, DICE_ROLL_RESOLVED } from '../core/actions.js';
import { purchaseCard, flushShop } from './cardsService.js';
import { DICE_ANIM_MS, AI_POST_ANIM_DELAY_MS } from '../constants/uiTimings.js';
import { logAppended } from '../core/actions.js';
import { getAIConfig } from '../config/aiConfigLoader.js';
import { AIDecisionEngine } from '../ai/engine/AIDecisionEngine.js';

const enhancedEngine = new AIDecisionEngine();

let latestTree = { rounds: [] };
let lastRollNodeId = null;
let nextNodeId = 1;
// Dice/AI timing constants imported from centralized module
let aiKeepTimer = null;
let aiKeepGeneration = 0;
// Future (dark edition): include wickness / corruption context nodes.
// Example extended shape per roll:
// { faces: '1,2,3', rationale: '...', score: '0.82', wicknessDelta: 1, poisonApplied: 0 }

export function getAIDecisionTree() { 
  return latestTree; 
}
export function getLastAIRollId() { return lastRollNodeId; }

// Mock: on each dice roll started, push a synthetic node
export function bindAIDecisionCapture(store) {
  store.subscribe((state, action) => {
    if (action.type === DICE_ROLL_STARTED) {
      cancelPendingAIKeep();
      captureRoll(state, '(pre-roll)', { stage: 'pre' });
    }
    if (action.type === DICE_REROLL_USED) {
      // Reroll initiated (human path order); cancel any pending keep from previous roll
      cancelPendingAIKeep();
    }
    if (action.type === DICE_ROLLED) {
      const facesStr = state.dice.faces.map(f => f.value).join(',');
      captureRoll(state, facesStr, { stage: 'post' });
      
      // CRITICAL: Only schedule AI dice selection if there are rerolls remaining
      // Don't select dice AFTER the final roll - selection must happen BEFORE the final roll
      if (state.dice.rerollsRemaining > 0) {
        // Schedule AI keep after dice animation completes + 2s buffer (only for CPU turns)
        scheduleAIAutoKeep(store);
      } else {
        cancelPendingAIKeep();
        console.log('🤖 AI: Skipping dice selection schedule - no rerolls remaining (final roll complete)');
      }
    }
    if (action.type === DICE_ROLL_RESOLVED) {
      // Early forced resolution terminates any scheduled keep
      cancelPendingAIKeep();
    }
    if (action.type === PHASE_CHANGED) {
      // Any phase change cancels pending keeps; we only keep during ROLL
      if (action.payload?.phase !== 'ROLL') cancelPendingAIKeep();
      if (action.payload?.phase === 'CLEANUP') {
        // Hook point for future evaluation of purchases before next turn
        attemptAIPurchases(store);
      }
    }
  });
}

function captureRoll(state, facesStr, extraMeta) {
  const round = state.meta.round || 1;
  const turn = state.meta.turn || 0;
  const activeId = selectActivePlayerId(state);
  const faces = state.dice.faces;
  const analysis = analyzeFaces(faces, state, activeId);
  const turnNode = ensureRound(round).ensureTurn(turn);
  // Player metadata (needed for AI-only filtering in UI)
  const player = activeId ? state.players.byId[activeId] : null;
  const isCpu = !!(player && (player.isCPU || player.isAi || player.isAI || player.type === 'ai'));
  const playerName = player?.name || player?.displayName || player?.id || activeId || 'Unknown';
  const keptMask = Array.isArray(faces) ? faces.map(f => !!f.kept) : [];
  let keptWhy = null;
  if (extraMeta?.stage === 'post' && keptMask.some(Boolean)) {
    try {
      keptWhy = deriveKeptWhy(faces, keptMask, state, player, analysis._tallyCache);
    } catch(_) {}
  }
  const node = {
    id: nextNodeId++,
    faces: facesStr,
    rationale: analysis.rationale,
    score: analysis.score.toFixed(2),
    tags: analysis.tags,
    stage: extraMeta?.stage,
    hypotheticals: generateHypotheticals(state, faces, activeId),
    playerId: activeId,
    playerName,
    isCpu,
    keptMask,
    english: analysis.english,
    keptWhy
  };
  // --- Enhanced engine enrichment (post-roll actual dice states) ---
  if (extraMeta?.stage === 'post') {
    try {
      const existingPost = turnNode.rolls.filter(r=> r.stage === 'post');
      node.rollNumber = existingPost.length + 1;
      node.keptIndices = faces.map((f,i)=> f.kept? i : null).filter(v=> v!==null);

      // Prepare game state summary for engine
      const gameState = {
        players: state.players.order.map(id => {
          const p = state.players.byId[id];
          return {
            id: p.id,
            victoryPoints: p.victoryPoints,
            health: p.health,
            maxHealth: p.maxHealth || 10,
            isInTokyo: !!p.inTokyo,
            isEliminated: !p.status?.alive,
            energy: p.energy || 0,
            powerCards: p.powerCards || []
          };
        }),
        availablePowerCards: (state.cards?.shop || []).map(c => ({ id:c.id, name:c.name, cost:c.cost, effects:c.effect? [c.effect]: (c.effects||[]) }))
      };
      const diceFacesCanon = faces.map(f => {
        if (f.value === '1') return 'one';
        if (f.value === '2') return 'two';
        if (f.value === '3') return 'three';
        return f.value; // attack, energy, heart
      });
      const decision = enhancedEngine.makeRollDecision(diceFacesCanon, state.dice.rerollsRemaining, { ...player, monster: player.monster || {}, gameState }, gameState);
      if (decision) {
        node.action = decision.action === 'endRoll' ? 'keep' : decision.action; // normalize
        node.confidence = decision.confidence;
        if (decision.goal) {
          const faceMap = { one:'1', two:'2', three:'3' };
            node.goal = { ...decision.goal, face: faceMap[decision.goal.face] || decision.goal.face };
        }
        node.improvementChance = decision.improvementChance;
        node.evBreakdown = decision.evBreakdown;
        node.branch = decision.branchAnalysis?.best || null;
        node.projection = decision.projection || null;
        node.mindset = deriveMindset(decision);
        node.justification = decision.reason;
        node.thoughtProcess = enhancedEngine.explain(decision);
      }
    } catch(e) {
      console.warn('[aiDecisionService] enhanced engine enrichment failed', e);
    }
  }
  turnNode.rolls.push(node);
  if (extraMeta?.stage === 'post') {
    lastRollNodeId = node.id;
  }
  // Emit unified log entry (both AI and human) for parity & analysis
  try {
    const entry = {
      id: node.id + 100000, // offset to avoid id collision with other log systems
      ts: Date.now(),
      round,
      turn,
      kind: 'dice',
      playerId: activeId,
      player: playerName,
      isCpu,
      stage: node.stage,
      faces: faces.map(f => f.value),
      keptPattern: faces.map(f => (f.kept? '1':'0')).join(''),
      message: `${isCpu? 'CPU':'Player'} ${playerName} ${node.stage==='pre'?'prepped':'rolled'} [${faces.map(f=>f.value+(f.kept?'*':'')).join(',')}]`,
    };
    // Only append post stage to reduce noise unless verbose AI debugging wanted
    if (node.stage !== 'pre') {
      state._store?.dispatch ? state._store.dispatch(logAppended(entry)) : (window.__KOT_NEW__?.store?.dispatch && window.__KOT_NEW__.store.dispatch(logAppended(entry)));
    }
  } catch(_) {}
  eventBus.emit('ai/tree/updated', {});
}

function analyzeFaces(faces, state, activeId) {
  if (!faces || !faces.length) return { score: 0, rationale: 'No dice yet', tags: [], english: 'No dice rolled yet.' };
  const t = tallyFaces(faces);
  const triples = extractTriples(t);
  let score = 0;
  const parts = [];
  const tags = [];
  
  // Use simple fallback values for now - config loading can be added later properly
  const attackValue = 3;
  const energyValue = 2;
  const healValue = 2;
  
  // Offensive weight: claws * opponentsAlive
  const opponents = state.players.order.filter(id => id !== activeId && state.players.byId[id].status.alive).length;
  const clawValue = t.claw * (attackValue / 3) * (1 + opponents * 0.2);
  if (clawValue > 0) { score += clawValue; parts.push(`Claw pressure ${clawValue.toFixed(2)}`); tags.push('claw'); }
  
  // Energy economy
  if (t.energy) { 
    const ev = t.energy * (energyValue / 2.5);
    score += ev; parts.push(`Energy ${ev.toFixed(2)}`); tags.push('energy'); 
  }
  
  // Healing (only if below 6 health and not in Tokyo)
  const player = activeId ? state.players.byId[activeId] : null;
  if (player && !player.inTokyo && player.health < 6 && t.heart) {
    const hv = t.heart * (healValue / 2) * (player.health < 4 ? 1.2 : 0.6);
    score += hv; parts.push(`Heal ${hv.toFixed(2)}`); tags.push('heal');
  }
  
  // Triples potential - use simple values
  if (triples.length) {
    for (const trip of triples) {
      const baseValue = trip.number * 5; // Simple fallback calculation
      const tv = (baseValue / 10) + (trip.count - 3) * 1.1;
      score += tv; parts.push(`Triple ${trip.number}=${tv.toFixed(2)}`); tags.push('triple');
    }
  } else {
    // Potential future triple: any number showing 2 copies counts small value
    ['1','2','3'].forEach(num => {
      if (t[num] === 2) { 
        const keepValue = Number(num) * 4; // Simple fallback
        const pv = keepValue / 10;
        score += pv; parts.push(`Potential ${num}${pv.toFixed(2)}`); tags.push('potential'); 
      }
    });
  }
  
  // Build simplified English explanation
  const englishBits = [];
  if (t.claw) englishBits.push(`${t.claw} claw${t.claw>1?'s':''} for attack pressure`);
  if (t.energy) englishBits.push(`${t.energy} energy for future cards`);
  if (t.heart && (state.players.byId[activeId]?.health ?? 10) < 6 && !state.players.byId[activeId]?.inTokyo) englishBits.push(`${t.heart} heart${t.heart>1?'s':''} to heal`);
  if (triples.length) {
    triples.forEach(tr => englishBits.push(`triple ${tr.number}${tr.count>3?` (plus ${tr.count-3} extra)`:''}`));
  } else {
    ['1','2','3'].forEach(num => { if (t[num] === 2) englishBits.push(`pair of ${num}s (chasing triple)`); });
  }
  const english = englishBits.length ? englishBits.join(', ') : 'Neutral mix of faces';
  return { score, rationale: parts.join(' | ') || 'Neutral roll', tags, english, _tallyCache: t };
}

function deriveKeptWhy(faces, keptMask, state, player, tally) {
  try {
    const keptFaces = faces.filter((f,i)=> keptMask[i]).map(f=>f.value);
    if (!keptFaces.length) return null;
    const counts = keptFaces.reduce((a,v)=>{ a[v]=(a[v]||0)+1; return a; },{});
    // Priority reasoning
    if (['1','2','3'].some(n => counts[n] && counts[n] >= 2)) {
      const best = ['3','2','1'].find(n => counts[n] && counts[n] >= 2);
      if (best) return `Chasing triple ${best}s (${counts[best]} kept)`;
    }
    if (counts.claw) {
      const opponents = state.players.order.filter(id => id !== player.id && state.players.byId[id].status.alive).length;
      return `Pressuring opponents with ${counts.claw} claw${counts.claw>1?'s':''}${player.inTokyo? ' while holding Tokyo':''}${opponents?` (${opponents} targets)`:''}`;
    }
    if (counts.heart && player.health < 6 && !player.inTokyo) {
      return `Securing ${counts.heart} heart${counts.heart>1?'s':''} to heal (HP ${player.health})`;
    }
    if (counts.energy) {
      return `Building economy: ${counts.energy} energy (total ${player.energy})`;
    }
    // Fallback: first kept face list
    return `Retaining mix: ${keptFaces.join(', ')}`;
  } catch(_) { return null; }
}

// Decide which dice to keep after a roll using the full AI decision engine
function autoKeepHeuristic(store) {
  const state = store.getState();
  const activeId = selectActivePlayerId(state);
  if (!activeId) return;
  const player = state.players.byId[activeId];
  if (!player || state.phase !== 'ROLL') return;
  
  // Only auto-keep for AI/CPU players; never auto-toggle keeps for human turns
  const isCpu = !!(player.isCPU || player.isAi || player.isAI || player.type === 'ai');
  if (!isCpu) return;
  
  // Safety check: Don't select dice if no rerolls remaining (final roll already happened)
  // This should never be reached due to schedule guard, but defensive check
  if (state.dice.rerollsRemaining <= 0) {
    console.log('🤖 AI: autoKeepHeuristic called with no rerolls remaining - skipping (defensive guard)');
    return;
  }
  
  try {
    // Use the full AI decision engine (same as legacy)
    const faces = state.dice.faces.map(f => f.value);
    const canonicalFaces = faces.map(face => {
      if (face === 'claw') return 'attack';
      if (face === 'heal') return 'heart';
      return face;
    });
    const rollsRemaining = state.dice.rerollsRemaining;
    
    console.log('🤖 AI: Calling decision engine with:', {
      faces,
      canonicalFaces,
      rollsRemaining,
      playerHealth: player.health,
      playerVP: player.victoryPoints || player.vp || 0,
      playerEnergy: player.energy || 0
    });
    
    // Build gameState object for AI engine
    const gameState = {
      players: Object.values(state.players.byId).map(p => ({
        id: p.id,
        name: p.name || p.displayName || p.id,
        health: p.health,
        maxHealth: p.maxHealth || 10,
        victoryPoints: p.victoryPoints || p.vp || 0,
        energy: p.energy || 0,
        isInTokyo: p.inTokyo || false,
        isEliminated: !p.status?.alive,
        powerCards: p.cards || [],
        isCPU: p.isCPU || p.isAI || p.isAi || false
      })),
      availablePowerCards: state.cards?.shop || []
    };
    
    // Create proper player object for AI engine (needs monster and powerCards properties)
    const aiPlayer = {
      id: player.id,
      name: player.name || player.displayName || player.id,
      health: player.health,
      maxHealth: player.maxHealth || 10,
      victoryPoints: player.victoryPoints || player.vp || 0,
      energy: player.energy || 0,
      isInTokyo: player.inTokyo || false,
      powerCards: player.cards || [],
      monster: player.monster || { personality: { aggression: 3, risk: 3, strategy: 3 } }
    };
    
    // Get AI decision
    const decision = enhancedEngine.makeRollDecision(canonicalFaces, rollsRemaining, aiPlayer, gameState);

    if (!decision || typeof decision !== 'object') {
      console.warn('🤖 AI: Decision engine returned no decision; invoking fallback keep logic.');
      simpleFallbackKeep(store, store.getState());
      return;
    }
    
    console.log('🤖 AI Decision:', {
      action: decision.action,
      keepIndices: decision.keepDice,
      reason: decision.reason,
      confidence: decision.confidence
    });
    
    // Apply the keep decision from AI engine
    if (decision.keepDice && Array.isArray(decision.keepDice)) {
      const desired = new Set(decision.keepDice.filter(idx => idx >= 0 && idx < state.dice.faces.length));

      // First release any dice currently kept but not desired anymore
      const beforeState = store.getState();
      const currentFaces = beforeState.dice.faces || [];
      currentFaces.forEach((die, idx) => {
        if (die?.kept && !desired.has(idx)) {
          store.dispatch(diceToggleKeep(idx));
        }
      });

      // Then ensure all desired dice are kept
      desired.forEach(idx => {
        const latest = store.getState().dice.faces || [];
        const die = latest[idx];
        if (die && !die.kept) {
          store.dispatch(diceToggleKeep(idx));
        }
      });
    }
  } catch (err) {
    console.error('🤖 AI: Error in autoKeepHeuristic, using fallback:', err);
    // Fallback to simple logic if AI engine fails
    simpleFallbackKeep(store, store.getState());
  }
}

// Simple fallback dice selection if AI engine fails
function simpleFallbackKeep(store, state) {
  const faces = state.dice.faces;
  const tally = tallyFaces(faces);
  
  // Keep any triples already formed (3 or more of same number)
  const candidateNumbers = ['3','2','1'].filter(n => tally[n] >= 3);
  if (candidateNumbers.length > 0) {
    const lockedNumber = candidateNumbers[0];
    faces.forEach((die, idx) => {
      if (die.value === lockedNumber && !die.kept) {
        store.dispatch(diceToggleKeep(idx));
      }
    });
    return;
  }
  
  // Keep pairs of highest number
  const pairNumbers = ['3','2','1'].filter(n => tally[n] >= 2);
  if (pairNumbers.length > 0) {
    const lockedNumber = pairNumbers[0];
    faces.forEach((die, idx) => {
      if (die.value === lockedNumber && !die.kept) {
        store.dispatch(diceToggleKeep(idx));
      }
    });
  }
}

function scheduleAIAutoKeep(store) {
  // Skip scheduling in controller mode (immediate selection handled inside turn controller)
  try {
    if (typeof window !== 'undefined' && window.__KOT_NEW__?.cpuControllerModeActive) return;
  } catch(_) {}
  cancelPendingAIKeep();
  const gen = ++aiKeepGeneration;
  aiKeepTimer = setTimeout(() => {
    if (gen !== aiKeepGeneration) return; // stale generation
    try {
      const st = store.getState();
      const activeId = selectActivePlayerId(st);
      if (!activeId || st.phase !== 'ROLL' || st.dice.phase !== 'resolved') return;
      const player = st.players.byId[activeId];
      const isCpu = !!(player && (player.isCPU || player.isAi || player.isAI || player.type === 'ai'));
      if (!isCpu) return;
      autoKeepHeuristic(store);
    } catch(_) { /* noop */ }
  }, DICE_ANIM_MS + AI_POST_ANIM_DELAY_MS);
}

// Public helper: immediate AI dice selection (used by controller mode)
export function immediateAIDiceSelection(store) {
  try {
    autoKeepHeuristic(store);
  } catch(err) {
    console.warn('[aiDecisionService] immediateAIDiceSelection failed', err);
  }
}

// Immediate safeguard: if AI timer race causes no keeps before reroll evaluation, invoke heuristic now.
export function forceAIDiceKeepIfPending(store) {
  try {
    const st = store.getState();
    if (st.phase !== 'ROLL') return false;
    const activeId = selectActivePlayerId(st);
    if (!activeId) return false;
    const player = st.players.byId[activeId];
    const isCpu = !!(player && (player.isCPU || player.isAi || player.isAI || player.type === 'ai'));
    if (!isCpu) return false;
    if (st.dice.phase !== 'resolved') return false;
    const anyKept = (st.dice.faces||[]).some(f=> f.kept);
    if (anyKept) return false; // heuristic already acted or nothing to keep intentionally
    if (st.dice.rerollsRemaining > 0) {
      autoKeepHeuristic(store);
      return true;
    }
  } catch(_) {}
  return false;
}

function cancelPendingAIKeep() {
  if (aiKeepTimer) {
    try { clearTimeout(aiKeepTimer); } catch(_) {}
    aiKeepTimer = null;
  }
}

// Yield heuristic suggestion (not auto-dispatched here yet): returns 'yield' | 'stay'
export function evaluateYieldDecision(state, defenderId, incomingDamage, slot) {
  const defender = state.players.byId[defenderId];
  if (!defender) return 'stay';
  // If damage would put us at <=2 HP and we are early VP ( < 12 ), prefer yield to survive.
  const projected = defender.health - incomingDamage;
  if (projected <= 2 && defender.victoryPoints < 12) return 'yield';
  // If holding strong VP lead and health moderate, stay.
  if (defender.victoryPoints >= 15 && projected > 0) return 'stay';
  // If slot is Bay (lower VP yield) and damage moderate (>=3), more incentive to yield.
  if (slot === 'bay' && incomingDamage >= 3 && projected < defender.health) return 'yield';
  return 'stay';
}

// AI purchase heuristic: prefer cheap immediate VP / energy cards under budget; fallback to utility.
function attemptAIPurchases(store) {
  const state = store.getState();
  const activeId = selectActivePlayerId(state);
  if (!activeId) return;
  const player = state.players.byId[activeId];
  if (!player?.isAI) return; // only AI players
  const shop = state.cards.shop;
  if (!shop.length) return;
  // Simple scoring
  const scored = shop.map(c => ({
    card: c,
    score: scoreCardForAI(c, player)
  })).sort((a,b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score <= 0) return;
  if (player.energy >= best.card.cost) {
    purchaseCard(store, store._logger || console, activeId, best.card.id); // logger fallback if needed
  } else if (player.energy >= 2 && shouldFlushForOpportunity(scored)) {
    flushShop(store, store._logger || console, activeId, 2);
  }
}

function scoreCardForAI(card, player) {
  const kind = card.effect?.kind;
  let base = 0;
  switch (kind) {
    case 'vp_gain': base = card.effect.value * 3; break; // immediate VP weighted
    case 'energy_gain': base = card.effect.value * 2; break;
    case 'heal_self': base = (player.health < 6 ? 2 : 0.5) * card.effect.value; break;
    case 'damage_all': base = card.effect.value * 2.2; break;
    case 'damage_select': base = (card.effect.maxTargets||1) * card.effect.value * 2.5; break;
    case 'energy_steal': base = card.effect.value * 2.4; break;
    case 'vp_steal': base = card.effect.value * 3.2; break;
    case 'dice_slot': base = 6; break;
    case 'reroll_bonus': base = 4; break;
    default: base = 1;
  }
  // Cost efficiency
  const efficiency = base / Math.max(1, card.cost);
  return Number((efficiency + base * 0.05).toFixed(2));
}

function shouldFlushForOpportunity(scoredList) {
  // If top three scores all low (<=2), flush might improve options
  const top = scoredList.slice(0,3).map(s => s.score);
  return top.every(v => v <= 2);
}

// Generate simple hypothetical reroll evaluations: for each non-kept die, consider swapping to each other face and re-score (lightweight heuristic)
function generateHypotheticals(state, faces, activeId) {
  if (!faces || !faces.length) return [];
  const results = [];
  faces.forEach((die, idx) => {
    if (die.kept) return; // only consider dice that could be rerolled
    const currentFace = die.value;
    const tried = new Set();
    for (const candidate of DIE_FACES) {
      if (candidate === currentFace || tried.has(candidate)) continue;
      tried.add(candidate);
      const clone = faces.map((f,i) => i===idx ? { ...f, value: candidate } : f);
      const t = tallyFaces(clone);
      const triples = extractTriples(t);
      let score = 0;
      // reuse partial scoring logic simplified
      const opponents = state.players.order.filter(id => id !== activeId && state.players.byId[id].status.alive).length;
      score += t.claw * (1 + opponents * 0.2);
      score += t.energy * 0.8;
      const player = activeId ? state.players.byId[activeId] : null;
      if (player && !player.inTokyo && player.health < 6) score += t.heart * (player.health < 4 ? 1.2 : 0.6);
      if (triples.length) {
        triples.forEach(trip => { score += (trip.number + (trip.count - 3)) * 1.1; });
      } else {
        ['1','2','3'].forEach(num => { if (t[num] === 2) score += Number(num)*0.4; });
      }
      results.push({ dieIndex: idx, to: candidate, estScore: Number(score.toFixed(2)) });
    }
  });
  // Limit size for performance
  return results.slice(0, 30);
}

function ensureRound(r) {
  let roundNode = latestTree.rounds.find(x => x.round === r);
  if (!roundNode) {
    roundNode = { round: r, turns: [] };
    latestTree.rounds.push(roundNode);
  }
  roundNode.ensureTurn = (t) => ensureTurn(roundNode, t);
  return roundNode;
}

function ensureTurn(roundNode, t) {
  let turnNode = roundNode.turns.find(x => x.turn === t);
  if (!turnNode) {
    turnNode = { turn: t, rolls: [] };
    roundNode.turns.push(turnNode);
  }
  return turnNode;
}

function deriveMindset(decision){
  try {
    const parts=[];
    if (decision.goal) parts.push('goal-focus');
    if (decision.improvementChance > 0.5) parts.push('optimistic');
    if (decision.action === 'reroll') parts.push('exploratory');
    if (decision.action === 'keep' || decision.action === 'endRoll') parts.push('value-lock');
    if (decision.branchAnalysis?.best && decision.branchAnalysis.best.tag !== 'baseline') parts.push('branch-evaluated');
    return parts.join(' | ');
  } catch{ return 'standard'; }
}