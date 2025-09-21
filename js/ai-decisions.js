/**
 * AI Decision Engine (Clean Rewrite)
 * Pipeline: state -> goal -> scoring -> set EV -> decision -> invariants.
 * Exposed UI hooks: AIDecisionEngine, instance._lastPerFaceProbabilities, player._aiTurnGoal.
 * No legacy intermix. Focus: stable set pursuit, power card awareness, minimal heuristics.
 */

(function(){
	const CFG = {
		goalAlignmentMultiplier: 1.55,
		pairScoreBase: 60,
		singleThree: 15,
		singleTwo: 10,
		singleOne: 6,
		formedSetBase: 200,
		fourKindEVFocus: 0.55,
		earlyStopMinKept: 4,
		earlyStopImprovementThreshold: 0.55,
		healingCriticalHP: 4,
		keepThresholdBase: 6
	};

	// Tag groups (names compared case-insensitively)
	const CARD_TAGS = {
		extraDie: ['Extra Head','extra_head'],
		extraReroll: ['Giant Brain','giant_brain'],
		attackBoost: ['Acid Attack','acid_attack','Fire Breathing','fire_breathing','Spiked Tail','spiked_tail'],
		vpBoost: ['Friend of Children','friend_of_children','Dedicated News Team','dedicated_news_team','Even Bigger','even_bigger'],
		energyEngine: ['Alien Metabolism','alien_metabolism','Corner Store','corner_store','Energy Hoarder','energy_hoarder'],
		healEngine: ['Regeneration','regeneration','Rapid Healing','rapid_healing','Healing Ray','healing_ray']
	};

	class AIDecisionEngine {
		constructor(){
			if (typeof window !== 'undefined') {
				window.AIOverrideStats = window.AIOverrideStats || { decisions:0, invariants:0, pairProtect:0 };
			}
		}

		makeRollDecision(currentDice, rollsRemaining, player, gameState){
			try { return this._core(currentDice, rollsRemaining, player, gameState); }
			catch(err){ console.error('AI error, fallback reroll', err); return { action:'reroll', keepDice:[], reason:'AI error fallback', confidence:0.3 }; }
		}

		_core(diceRaw, rollsRemaining, player, gameState){
			const dice = diceRaw.map(f=>this._canon(f));
			const state = this._extractState(dice, rollsRemaining, player, gameState);
			const goal = this._selectOrMaintainGoal(state, player);
			const scored = this._scoreDice(state, goal, player);
			const ev = this._computeSetEV(state, goal);
			let decision = this._assembleDecision(state, goal, scored, ev, rollsRemaining, player);
			decision = this._enforceInvariants(decision, state, rollsRemaining);
			// UI probabilities mirror previous expectation
			this._lastPerFaceProbabilities = scored.map(s=>({ index:s.index, face:s.face, keepProbability:Number((s.normScore||0).toFixed(3)) }));
			if (typeof window !== 'undefined') window.AIOverrideStats.decisions++;
			return decision;
		}

		// ---------- State Extraction ----------
		_extractState(dice, rollsRemaining, player, gameState){
			const counts = { one:0,two:0,three:0,attack:0,energy:0,heart:0 };
			dice.forEach(f=>{ if(counts.hasOwnProperty(f)) counts[f]++; });
			const numbers = ['one','two','three'].map(face=>({ face, count:counts[face], faceValue: face==='one'?1: face==='two'?2:3, pair:counts[face]===2, formed:counts[face]>=3 }));
			const maxVP = Math.max(...gameState.players.map(p=>p.victoryPoints));
			const alive = gameState.players.filter(p=>!p.isEliminated).length;
			const phase = maxVP>=15 || alive<=2 ? 'end' : (maxVP>=10 ? 'mid':'early');
			const tokyoOccupant = gameState.players.find(p=>p.isInTokyo && !p.isEliminated) || null;
			const criticalThreat = gameState.players.some(p=>p.id!==player.id && !p.isEliminated && p.victoryPoints>=18);
			const cardSummary = this._summarizeCards(player.powerCards||[]);
			const effectiveRollsRemaining = rollsRemaining + (cardSummary.extraReroll>0 ? 1:0); // treat extra reroll as future improvement window
			return { dice, counts, numbers, phase, tokyoOccupant, criticalThreat, cardSummary, player, rollsRemaining:effectiveRollsRemaining, origRolls:rollsRemaining };
		}

		_summarizeCards(cards){
			const flags = { extraDie:0, extraReroll:0, attackBoost:0, vpBoost:0, energyEngine:0, healEngine:0 };
			cards.forEach(c=>{
				const name = (c.name||c.id||'').toLowerCase();
				for (const k of Object.keys(CARD_TAGS)) {
					if (CARD_TAGS[k].some(tag=> tag.toLowerCase()===name)) flags[k]++;
				}
			});
			return flags;
		}

		// ---------- Goal Selection ----------
		_selectOrMaintainGoal(state, player){
			if (player._aiTurnGoal){
				const face = player._aiTurnGoal.face;
				if (state.counts[face]>0) return player._aiTurnGoal; // still viable
			}
			// pick pair with highest count then value
			const candidates = state.numbers.filter(n=>n.count>=2);
			if (candidates.length){
				candidates.sort((a,b)=> b.count - a.count || b.faceValue - a.faceValue);
				const chosen = candidates[0];
				player._aiTurnGoal = { type:'numberSet', face:chosen.face, at:Date.now(), countAtSel:chosen.count };
				return player._aiTurnGoal;
			}
			// opportunistic single three early
			if (!player._aiTurnGoal && state.rollsRemaining>=2 && state.counts.three===1){
				player._aiTurnGoal = { type:'numberSet', face:'three', at:Date.now(), countAtSel:1, provisional:true };
				return player._aiTurnGoal;
			}
			return null;
		}

		// ---------- Scoring ----------
		_scoreDice(state, goal, player){
			const { counts, phase, cardSummary } = state;
			const needHealing = player.health <= CFG.healingCriticalHP;
			const attackPressure = state.tokyoOccupant && state.tokyoOccupant.id !== player.id ? 1:0;
			const arr = [];
			state.dice.forEach((face,index)=>{
				let score=0, locked=false;
				if (face==='one'||face==='two'||face==='three'){
					const count = counts[face];
						if (count>=3){ score = CFG.formedSetBase + count; locked=true; }
						else if (count===2){ score = CFG.pairScoreBase + (face==='three'?18: face==='two'?10:5); }
						else { // single
							score = face==='three'? CFG.singleThree: face==='two'? CFG.singleTwo: CFG.singleOne;
							if (face==='one' && (counts.three>=2 || counts.two>=2)) score *= 0.3; // devalue stray 1 if better paths
						}
						if (goal && goal.face===face && !locked) score *= CFG.goalAlignmentMultiplier;
						if (cardSummary.vpBoost) score *= (1 + 0.15*cardSummary.vpBoost);
				} else if (face==='attack'){
					score = 18 + attackPressure*8;
					if (cardSummary.attackBoost) score += 6*cardSummary.attackBoost;
					if (state.criticalThreat) score += 12;
					if (player.isInTokyo) score -= 4; // self-preservation tilt
					if (goal && counts[goal.face]===2) score *= 0.75; // leave space for forming triple
				} else if (face==='energy'){
					score = phase==='early'?16: phase==='mid'?12:8;
					if (cardSummary.energyEngine) score += 5*cardSummary.energyEngine;
					if (player.energy <=2) score += 6;
					if (goal && counts[goal.face]===2) score *= 0.85;
				} else if (face==='heart'){
					score = needHealing? (25 + (CFG.healingCriticalHP - player.health)*4): (player.health===player.maxHealth?0:10);
					if (cardSummary.healEngine) score += 4*cardSummary.healEngine;
					if (player.isInTokyo) score = 0; // cannot heal
				}
				arr.push({ index, face, score, locked });
			});
			const max = Math.max(1,...arr.map(s=>s.score));
			arr.forEach(s=> s.normScore = s.score / max);
			return arr;
		}

		// ---------- Set EV ----------
		_computeSetEV(state, goal){
			const free = state.dice.length - state.numbers.filter(n=>n.formed).reduce((a,n)=>a+n.count,0);
			const items=[]; state.numbers.forEach(n=>{
				if (n.count===2 && state.rollsRemaining>0){
					const p = 1 - Math.pow(5/6, free * state.rollsRemaining);
					items.push({ face:n.face, type:'completeTriple', ev: p * n.faceValue });
				} else if (n.count===3 && state.rollsRemaining>0){
					const p4 = 1 - Math.pow(5/6, free * state.rollsRemaining * CFG.fourKindEVFocus);
					items.push({ face:n.face, type:'fourKind', ev: p4 });
				}
			});
			return { items, total: items.reduce((s,i)=>s+i.ev,0) };
		}

		// ---------- Decision Assembly ----------
		_assembleDecision(state, goal, scored, ev, rollsRemaining, player){
			const keep = new Set();
			// keep all formed sets and pairs fully
			state.numbers.forEach(n=>{ if (n.formed || n.pair) state.dice.forEach((f,i)=>{ if(f===n.face) keep.add(i); }); });
			// high-value non-number dice
			const pairCount = state.numbers.filter(n=>n.pair).length;
			scored.filter(s=> !keep.has(s.index) && !['one','two','three'].includes(s.face)).forEach(s=>{
				const threshold = CFG.keepThresholdBase * (pairCount>=2?1.1:1);
				if (s.score >= threshold) keep.add(s.index);
			});
			// guarantee both dice of goal pair if goal
			if (goal){
				const goalIdxs=[]; state.dice.forEach((f,i)=>{ if(f===goal.face) goalIdxs.push(i); });
				if (goalIdxs.length>=2) goalIdxs.forEach(i=>keep.add(i));
			}
			const kept = Array.from(keep).sort((a,b)=>a-b);
			const improvement = ev.total;
			let action='reroll';
			const unresolvedPairs = state.numbers.filter(n=> n.pair && !n.formed).length;
			if (rollsRemaining>0){
				if (kept.length>=CFG.earlyStopMinKept && improvement < CFG.earlyStopImprovementThreshold && unresolvedPairs===0){ action='endRoll'; }
			} else action='endRoll';
			const reasonParts=[];
			if (goal) reasonParts.push('Goal:'+goal.face);
			reasonParts.push((action==='endRoll'?'Stop':'Cont')+` kept=${kept.length} EV=${improvement.toFixed(2)} pairs=${unresolvedPairs}`);
			if (state.cardSummary.attackBoost) reasonParts.push(`AtkBoost x${state.cardSummary.attackBoost}`);
			if (state.cardSummary.energyEngine) reasonParts.push(`EnergyEng x${state.cardSummary.energyEngine}`);
			if (state.cardSummary.healEngine) reasonParts.push(`HealEng x${state.cardSummary.healEngine}`);
			const confidence = action==='endRoll'? (rollsRemaining>0?0.8:0.92):0.6;
			return { action, keepDice: kept, reason: reasonParts.join(' | '), confidence };
		}

		// ---------- Invariants ----------
		_enforceInvariants(decision, state, rollsRemaining){
			const counts = state.counts;
			// full pair retention
			['one','two','three'].forEach(face=>{
				if (counts[face]===2){
					const idxs=[]; state.dice.forEach((f,i)=>{ if(f===face) idxs.push(i); });
					const kept = idxs.filter(i=> decision.keepDice.includes(i));
					if (kept.length===1){ idxs.forEach(i=> decision.keepDice.push(i)); decision.reason+=' | inv:pair restore'; if (typeof window!=='undefined') window.AIOverrideStats.pairProtect++; }
				}
			});
			// multi-pair continuation
			if (decision.action==='endRoll' && rollsRemaining>0){
				const pairFaces = ['one','two','three'].filter(f=>counts[f]===2);
				if (pairFaces.length>=2){ decision.action='reroll'; decision.reason+=' | inv:multi-pair continue'; }
			}
			// attack cluster rule
			if (decision.action==='endRoll' && rollsRemaining>0 && counts.attack>=4){
				const singleNumber = ['one','two','three'].some(f=>counts[f]===1);
				if (singleNumber){ decision.action='reroll'; decision.reason+=' | inv:attack cluster'; }
			}
			decision.keepDice = Array.from(new Set(decision.keepDice)).sort((a,b)=>a-b);
			return decision;
		}

		// ---------- Utility ----------
		_canon(f){ switch(f){ case '1': return 'one'; case '2': return 'two'; case '3': return 'three'; default: return f; } }
	}

	if (typeof window !== 'undefined') window.AIDecisionEngine = AIDecisionEngine;
	if (typeof module !== 'undefined' && module.exports) module.exports = { AIDecisionEngine };
})();

