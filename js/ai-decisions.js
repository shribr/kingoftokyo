/**
 * AI Decision Engine (Clean Rewrite)
 * Pipeline: state -> goal -> scoring -> set EV -> decision -> invariants.
 * Exposed UI hooks: AIDecisionEngine, instance._lastPerFaceProbabilities, player._aiTurnGoal.
 * No legacy intermix. Focus: stable set pursuit, power card awareness, minimal heuristics.
 */

(function(){
	// Phase 11 Profiling Scaffold
	const AIDecisionProfiler = {
		enabled: typeof window !== 'undefined' && !!window.AI_PROFILING,
		samples: [],
		record(label, ms) {
			if (!this.enabled) return;
			this.samples.push({ label, ms, t: Date.now() });
			if (this.samples.length > 300) this.samples.shift();
		},
		stats() {
			if (!this.samples.length) return null;
			const arr = this.samples.map(s=>s.ms);
			const sum = arr.reduce((a,b)=>a+b,0);
			return { count: arr.length, avg:+(sum/arr.length).toFixed(2), min:+Math.min(...arr).toFixed(2), max:+Math.max(...arr).toFixed(2) };
		},
		maybeLog(){
			if (!this.enabled) return;
			if (this.samples.length && this.samples.length % 25 === 0){
				const s = this.stats();
				s && console.log('🧪 AI Decision Profiling', s);
			}
		}
	};

	// Expose profiler globally for debug overlay & snapshot (Lean Path Item 2)
	if (typeof window !== 'undefined') {
		window.AIDecisionProfiler = AIDecisionProfiler;
	}
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
			// Personality snapshot (default mid values if absent)
			state.personality = {
				aggression: player.monster?.personality?.aggression ?? 3,
				risk: player.monster?.personality?.risk ?? 3,
				strategy: player.monster?.personality?.strategy ?? 3
			};
			const goal = this._selectOrMaintainGoal(state, player);
			const scored = this._scoreDice(state, goal, player);
			const ev = this._computeSetEV(state, goal);
			let decision = this._assembleDecision(state, goal, scored, ev, rollsRemaining, player);
			decision = this._enforceInvariants(decision, state, rollsRemaining);
			// Sanity Assertions (Lean Path Item 3)
			if (typeof window !== 'undefined' && window.DEBUG_MODE) {
				try {
					// Branch ordering sanity if analysis present
					if (decision.branchAnalysis && Array.isArray(decision.branchAnalysis.evaluated)) {
						for (let i=1;i<decision.branchAnalysis.evaluated.length;i++) {
							if (decision.branchAnalysis.evaluated[i].score > decision.branchAnalysis.evaluated[i-1].score) {
								console.warn('⚠️ Branch ordering anomaly at index', i);
								break;
							}
						}
						if (decision.branchAnalysis.evaluated.length > 25) {
							console.warn('⚠️ Branch cap exceeded (>25)');
						}
					}
					// Projection trial bounds if present
					if (decision.projection && decision.projection.trials) {
						const t = decision.projection.trials;
						if (t < 25 || t > 110) console.warn('⚠️ Projection trial count out of adaptive bounds', t);
					}
				} catch(e){ console.warn('Sanity assertion error', e); }
			}
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
			// Represent extra die as virtual available slot for EV modeling (not altering current dice array contents directly)
			// Capture available market snapshot if exposed on gameState (non-destructive). This will allow energy dice to value impending purchases.
			let shopCards = [];
			try {
				if (gameState && Array.isArray(gameState.availablePowerCards)) {
					shopCards = gameState.availablePowerCards.slice(0,3).map(c=>({ name:c.name, cost:c.cost, id:c.id, effects:c.effects }));
				}
			} catch(_){}
			return { dice, counts, numbers, phase, tokyoOccupant, criticalThreat, cardSummary, player, rollsRemaining:effectiveRollsRemaining, origRolls:rollsRemaining, shopCards };
		}

		_summarizeCards(cards){
			const flags = { extraDie:0, extraReroll:0, attackBoost:0, vpBoost:0, energyEngine:0, healEngine:0, bonusVP:0, bonusEnergyFlat:0, healPoints:0 };
			cards.forEach(c=>{
				const name = (c.name||c.id||'').toLowerCase();
				// Name-based tags fallback
				for (const k of Object.keys(CARD_TAGS)) {
					if (CARD_TAGS[k].some(tag=> tag.toLowerCase()===name)) flags[k]++;
				}
				// Structured effects parsing if exists
				if (Array.isArray(c.effects)){
					c.effects.forEach(e=>{
						const type = (e.type||'').toLowerCase();
						const val = Number(e.value||e.amount||1) || 1;
						switch(type){
							case 'extradie': flags.extraDie += val; break;
							case 'extrareroll': flags.extraReroll += val; break;
							case 'attackbonus': flags.attackBoost += val; break;
							case 'bonusenergy': flags.energyEngine += val; flags.bonusEnergyFlat += val; break;
							case 'healpoints': flags.healEngine += Math.ceil(val/2); flags.healPoints += val; break;
							case 'victorypoints': flags.vpBoost += Math.ceil(val/2); flags.bonusVP += val; break;
							default: break; // ignore unknown
						}
					});
				}
			});
			return flags;
		}

		// ---------- Goal Selection ----------
		_selectOrMaintainGoal(state, player){
			if (player._aiTurnGoal){
				const face = player._aiTurnGoal.face;
				// Goal fostering: if current goal is a low-value formed or near-formed set of ones while a higher face has emerging potential
				if (state.counts[face]>0){
					if (face==='one'){
						const twoCount = state.counts.two;
						const threeCount = state.counts.three;
						// Switch if we only have exactly a triple of ones but there is at least a pair of threes or twos with more rolls remaining
						if (state.counts.one===3 && state.rollsRemaining>=2 && (threeCount>=2 || twoCount>=2)){
							const targetFace = threeCount>=2? 'three': 'two';
							player._aiTurnGoal = { type:'numberSet', face:targetFace, at:Date.now(), fosteredFrom:'one' };
							return player._aiTurnGoal;
						}
					}
					return player._aiTurnGoal; // keep existing goal
				}
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
			const { counts, phase, cardSummary, personality } = state;
			const needHealing = player.health <= CFG.healingCriticalHP;
			const attackPressure = state.tokyoOccupant && state.tokyoOccupant.id !== player.id ? 1:0;
			const tokyoEmpty = !state.tokyoOccupant;
			const tokyoOccupiedBySelf = !!player.isInTokyo;
			const enemyTokyoOccupant = state.tokyoOccupant && state.tokyoOccupant.id !== player.id ? state.tokyoOccupant : null;
			const arr = [];
			// Pre-compute shop pressure & portfolio urgency for energy: highest priority affordable delta for impactful card
			let energyUrgencyBonus = 0;
			let portfolioDesiredFeature = null;
			if (state.shopCards && state.shopCards.length){
				// Use optimized portfolio plan (simulate selection with current budget) to bias feature pursuit
				try {
					if (typeof this.optimizePowerCardPortfolio === 'function'){
						const plan = this.optimizePowerCardPortfolio(state.shopCards.map(c=>({ ...c })), player);
						if (plan && plan.cards && plan.cards.length){
							// Choose the first planned card's most salient feature as desire (pref: extraDie > extraReroll > attack > energy > heal > vp)
							const featurePriority = ['extraDie','extraReroll','attack','energy','heal','vp'];
							const first = plan.cards[0];
							const feats = this._extractCardFeatures(first).values ? Array.from(this._extractCardFeatures(first)) : Array.from(this._extractCardFeatures(first));
							portfolioDesiredFeature = featurePriority.find(f=> feats.includes(f)) || null;
						}
					}
				} catch(e){ /* ignore */ }
				// Identify impact cards directly for shortfall weighting
				const impactful = state.shopCards.map(c=>{
					const feats = this._extractCardFeatures(c);
					let impactScore = 0;
					if (feats.has('extraDie')) impactScore += 30;
					if (feats.has('extraReroll')) impactScore += 24;
					if (feats.has('attack')) impactScore += 14;
					if (feats.has('heal') && player.health <= CFG.healingCriticalHP) impactScore += 12;
					if (feats.has('vp') && phase!=='early') impactScore += 10;
					const shortfall = Math.max(0, (c.cost||0) - player.energy);
					return { impactScore, shortfall };
				}).filter(m=> m.impactScore>0).sort((a,b)=> (a.shortfall - b.shortfall) || (b.impactScore - a.impactScore));
				if (impactful.length){
					const top = impactful[0];
					if (top.shortfall > 0){
						energyUrgencyBonus = Math.max(4, (top.impactScore/10)) * (top.shortfall <=2 ? 1.4 : 1.0);
					}
				}
			}
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
					// Base attack weighting with pressure & aggression scaling
					const aggressionAdj = 1 + ((personality.aggression - 3) * 0.15);
					const threatBonus = state.criticalThreat ? 12 : 0;
					let baseAtk = 18 + attackPressure*8 + threatBonus;
					// Tokyo strategic modifiers
					if (tokyoEmpty && !tokyoOccupiedBySelf && player.health >= 6){
						// Encourage entering when healthy
						baseAtk += 6 + (personality.aggression-3)*2;
					}
					if (enemyTokyoOccupant){
						if (enemyTokyoOccupant.health <=5) baseAtk += 5; // pressure weakened occupant
						if (enemyTokyoOccupant.victoryPoints >=10) baseAtk += 5; // deny high VP occupant
					}
					if (tokyoOccupiedBySelf && player.health <=5){
						baseAtk -= 6; // survival over aggression inside Tokyo when low HP
					}
					score = baseAtk * aggressionAdj;
					if (cardSummary.attackBoost) score += 6*cardSummary.attackBoost;
					if (player.isInTokyo) score -= 4; // self-preservation tilt
					if (goal && counts[goal.face]===2) score *= 0.75; // leave space for forming triple
				} else if (face==='energy'){
					// Strategy emphasizes resource prep; risk slightly de-emphasizes energy (prefers explosive outcomes)
					const baseEnergy = phase==='early'?16: phase==='mid'?12:8;
					const stratAdj = 1 + ((personality.strategy - 3) * 0.12);
					const riskAdj = 1 - ((personality.risk - 3) * 0.07);
					score = (baseEnergy * stratAdj * riskAdj) + energyUrgencyBonus;
					// Portfolio desire: if current desired feature is energy enabler (extraDie/extraReroll) and we're short on energy, amplify
					if (portfolioDesiredFeature && ['extraDie','extraReroll'].includes(portfolioDesiredFeature)){
						score *= 1.15;
					}
					if (cardSummary.energyEngine) score += 5*cardSummary.energyEngine;
					if (player.energy <=2) score += 6;
					if (goal && counts[goal.face]===2) score *= 0.85;
				} else if (face==='heart'){
					const riskHealscale = 1 - ((personality.risk - 3) * 0.12); // high risk reduces heal priority
					let baseHeal = needHealing? (25 + (CFG.healingCriticalHP - player.health)*4): (player.health===player.maxHealth?0:10);
					// Pre-enter top-off: if Tokyo empty & planning to enter (healthy threshold) but still below max, modest boost
					if (tokyoEmpty && !tokyoOccupiedBySelf && player.health < player.maxHealth && player.health <= 6){
						baseHeal += 6;
					}
					score = baseHeal * riskHealscale;
					if (cardSummary.healEngine) score += 4*cardSummary.healEngine;
					if (player.isInTokyo) score = 0; // cannot heal
				}
				arr.push({ index, face, score, locked });
			});
			const max = Math.max(1,...arr.map(s=>s.score));
			arr.forEach(s=> s.normScore = s.score / max);
			return arr;
		}

		// ---------- Depth-2 Monte Carlo Projection (Lightweight) ----------
		// Estimate marginal benefit of current keep plan by simulating one future reroll sequence
		_projectTwoRollEV(state, keepIndices){
			try {
				if (state.rollsRemaining <=1) return null; // need at least two rolls to project
				// Adaptive trials: if profiler enabled and avg latency low, increase; if high, decrease
				let baseTrials = 60;
				if (AIDecisionProfiler.enabled){
					const s = AIDecisionProfiler.stats();
					if (s){
						if (s.avg < 12) baseTrials = 110; // plenty of headroom
						else if (s.avg < 18) baseTrials = 80;
						else if (s.avg > 35) baseTrials = 40; // throttle
						else if (s.avg > 50) baseTrials = 25; // emergency shrink
					}
				}
				const TRIALS = baseTrials;
				const faces = ['one','two','three','attack','energy','heart'];
				let aggregate = { tripleGain:0, attack:0, energy:0, heal:0 };
				for (let t=0;t<TRIALS;t++){
					// Clone dice, fill unkept with random, then second roll improvement
					let dice = state.dice.slice();
					for (let i=0;i<dice.length;i++) if (!keepIndices.has(i)) dice[i] = faces[Math.floor(Math.random()*faces.length)];
					// Simulate second reroll for any not forming part of a triple pursuit
					const counts = { one:0,two:0,three:0,attack:0,energy:0,heart:0 };
					dice.forEach(f=> counts[f]++);
					// Identify best number target
					const numSorted = ['one','two','three'].map(f=>({f,c:counts[f]})).sort((a,b)=> b.c - a.c || (b.f==='three'?1:-1));
					const target = numSorted[0];
					// Reroll non-target numbers and non-special priority if not locked
					for (let i=0;i<dice.length;i++){
						if (dice[i]!==target.f && !['attack','energy','heart'].includes(dice[i])){
							if (Math.random()<0.8){ dice[i] = faces[Math.floor(Math.random()*faces.length)]; }
						}
					}
					// Final counts
					const finalCounts = { one:0,two:0,three:0,attack:0,energy:0,heart:0 };
					dice.forEach(f=> finalCounts[f]++);
					if (finalCounts[target.f] >=3) aggregate.tripleGain += 1;
					aggregate.attack += finalCounts.attack;
					aggregate.energy += finalCounts.energy;
					aggregate.heal += finalCounts.heart;
				}
				return {
					tripleChance: Number((aggregate.tripleGain/TRIALS).toFixed(3)),
					avgAttack: Number((aggregate.attack/TRIALS).toFixed(2)),
					avgEnergy: Number((aggregate.energy/TRIALS).toFixed(2)),
					avgHeal: Number((aggregate.heal/TRIALS).toFixed(2))
				};
			} catch(e){ return null; }
		}

		// ---------- Set EV ----------
		_computeSetEV(state, goal){
			// Effective free dice consider extra die cards (each adds another potential matching source)
			const extraDie = state.cardSummary?.extraDie || 0;
			const effectiveDiceCount = state.dice.length + extraDie;
			const committedToFormed = state.numbers.filter(n=>n.formed).reduce((a,n)=>a+n.count,0);
			const free = Math.max(0, effectiveDiceCount - committedToFormed);
			const R = state.rollsRemaining;
			const items=[];
			state.numbers.forEach(n=>{
				if (R<=0) return;
				// Probability helpers
				if (n.count===2){
					// Chance to hit at least one matching face across remaining rolls (binomial complement approximation)
					const pTriple = 1 - Math.pow(5/6, free * R);
					items.push({ face:n.face, type:'completeTriple', ev: pTriple * n.faceValue });
				} else if (n.count===3){
					// Four-of-a-kind chase
					const p4 = 1 - Math.pow(5/6, free * R * CFG.fourKindEVFocus);
					items.push({ face:n.face, type:'fourKind', ev: p4 * 0.9 });
					// Five-of-a-kind extended chase (only if free dice + potential future still leave capacity)
					if (free>=2 || (free>=1 && (state.cardSummary.extraReroll>0 || extraDie>0))){
						// Expected additional matches approximation: E = free * R * (1/6) (cap at 2 remaining steps to five-of-a-kind)
						const expectedMatches = Math.min(2, (free * R)/6);
						// Diminishing weight beyond four-kind (slightly less than perfect info)
						const ev5 = expectedMatches>1? (expectedMatches-1)*0.75 : 0; // only second expected match contributes to push to 5 kind
						if (ev5>0) items.push({ face:n.face, type:'fiveKindChase', ev: ev5 });
					}
				} else if (n.count===4){
					// Already four-of-a-kind, compute marginal for five
					if (free>0){
						const p5 = 1 - Math.pow(5/6, free * R * 0.65); // slight discount
						items.push({ face:n.face, type:'fiveKind', ev: p5 * 0.8 });
					}
				}
			});
			let total = items.reduce((s,i)=>s+i.ev,0);
			// Add additive EV for generic faces from free dice (approximate marginal future benefit)
			if (R>0 && free>0){
				// Simple expected counts over R rolls: free * R / 6 for any specific face.
				const expPerFace = (free * R)/6;
				// Weight attack higher if threat, healing if low HP, energy early/mid
				const player = state.player;
				const phase = state.phase;
				const threatFactor = state.criticalThreat?1.4:1;
				const lowHP = player.health <= CFG.healingCriticalHP;
				const attackEV = expPerFace * 0.9 * threatFactor; // abstract attack value
				const healEV = lowHP? expPerFace * 1.2: expPerFace*0.2;
				const energyEV = phase==='early'? expPerFace*0.9: phase==='mid'?expPerFace*0.6:expPerFace*0.3;
				const additive = attackEV + healEV + energyEV;
				if (additive>0){ items.push({ face:'*', type:'additiveFuture', ev:additive }); total += additive; }
			}
			return { items, total };
		}

		// ---------- Decision Assembly ----------
		_assembleDecision(state, goal, scored, ev, rollsRemaining, player){
			const __t0 = (typeof performance!=='undefined')? performance.now(): Date.now();
			const keep = new Set();
			const releasedIndices = [];
			// NEW: Invoke branch simulator early to capture alternative plans (before we commit keep set)
			const branchSim = this._simulateBranches(state);
			// Determine primary target face (goal face if present, else highest count number face)
			let primaryFace = goal?.face || null;
			if (!primaryFace){
				const sortedNums = state.numbers.slice().sort((a,b)=> b.count - a.count || (b.face>b.face?1:-1));
				primaryFace = sortedNums.length? sortedNums[0].face : null;
			}
			const formedFaces = new Set(state.numbers.filter(n=> n.formed).map(n=>n.face));
			const hasFormed = formedFaces.size>0;
			// Keep logic: always keep dice of formed faces; keep dice of primary target (if pair) even if not formed; for other pairs only keep if no formed set yet or rollsRemaining===0
			state.numbers.forEach(n=>{
				if (n.formed){
					state.dice.forEach((f,i)=>{ if(f===n.face) keep.add(i); });
				} else if (n.pair){
					if (n.face===primaryFace){
						state.dice.forEach((f,i)=>{ if(f===n.face) keep.add(i); });
					} else if (!hasFormed && rollsRemaining>0){
						// early game multiple pairs acceptable; keep
						state.dice.forEach((f,i)=>{ if(f===n.face) keep.add(i); });
					} else if (hasFormed && rollsRemaining===0){
						// last roll, locking secondary pair is fine
						state.dice.forEach((f,i)=>{ if(f===n.face) keep.add(i); });
					}
				}
			});
			// First-roll variance guard: if everything kept on first roll AND we have at least one unformed pair and at least one special, release lowest priority special to create improvement space
			if (rollsRemaining>=2) {
				const unformedPairs = state.numbers.filter(n=> n.pair && !n.formed);
				if (unformedPairs.length>0 && keep.size===state.dice.length){
					const specials = [];
					state.dice.forEach((f,i)=>{ if(!['one','two','three'].includes(f)) specials.push({face:f,index:i}); });
					if (specials.length){
						const priority = { heart:1, energy:2, attack:3 };
						specials.sort((a,b)=> (priority[a.face]||5) - (priority[b.face]||5));
						keep.delete(specials[0].index);
						releasedIndices.push(specials[0].index);
					}
				}
			}
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
			// Number goal specialization heuristic: if goal is numberSet and we have <3 copies of goal face, aggressively free specials to chase triple
			if (goal && goal.type==='numberSet' && ['one','two','three'].includes(goal.face)){
				const counts = state.counts;
				const goalCount = counts[goal.face] || 0;
				if (goalCount < 3 && rollsRemaining>0){
					// Determine how many free dice we have; release non-number specials first until at least 2 free dice (if possible)
					let freeDice = state.dice.length - Array.from(keep).length;
					if (freeDice < 2){
						// Collect kept specials
						const keptSpecials=[]; state.dice.forEach((f,i)=>{ if(keep.has(i) && !['one','two','three'].includes(f)) keptSpecials.push({face:f,index:i}); });
						// Priority release order: heart, energy, attack (attack last for general utility)
						const pr = { heart:1, energy:2, attack:3 };
						keptSpecials.sort((a,b)=> (pr[a.face]||5) - (pr[b.face]||5));
						for (const sp of keptSpecials){
							if (freeDice>=2) break;
							keep.delete(sp.index); releasedIndices.push(sp.index); freeDice++;
						}
						// If still insufficient free dice and multiple secondary number pairs exist, release one die from lowest face non-goal pair
						if (freeDice < 2){
							const secondaryPairs = ['one','two','three'].filter(f=> f!==goal.face && counts[f]===2).sort((a,b)=>{ const val={one:1,two:2,three:3}; return (val[a]||0)-(val[b]||0); });
							for (const sf of secondaryPairs){
								if (freeDice>=2) break;
								const idxs=[]; state.dice.forEach((f,i)=>{ if(f===sf) idxs.push(i); });
								if (idxs.length===2){ const rel = idxs[1]; if (keep.delete(rel)){ releasedIndices.push(rel); freeDice++; } }
							}
						}
						// NEW: If after releases we still have zero free dice AND goalCount < 3, forcibly release lowest priority kept non-goal number die to avoid impossible chase
						if (goalCount < 3){
							let freeNow = state.dice.length - Array.from(keep).length;
							if (freeNow === 0){
								// Identify candidate kept dice that do not match goal face
								const candidates=[]; state.dice.forEach((f,i)=>{ if (keep.has(i) && f!==goal.face){
									let priority=10; // lower = release first
									if (['one','two','three'].includes(f)){
										// release lower face values first (1 then 2 then 3) when they are not goal
										priority = { one:1, two:2, three:3 }[f] || 9;
									} else {
										priority = { heart:0, energy:1, attack:2 }[f] ?? 8; // hearts easiest to sacrifice
									}
									candidates.push({index:i, face:f, priority});
								} });
								candidates.sort((a,b)=> a.priority - b.priority);
								if (candidates.length){
									const rel = candidates[0];
									if (keep.delete(rel.index)) { releasedIndices.push(rel.index); freeNow++; }
									// annotate reasoning
									if (!player._aiForcedFreeForGoal) player._aiForcedFreeForGoal = 0;
									player._aiForcedFreeForGoal++;
								}
							}
						}
					}
				}
			}
			const kept = Array.from(keep).sort((a,b)=>a-b);
			const improvement = ev.total;

			// --- Free Dice Guarantee & Pair Refinement Heuristic ---
			// Rationale: If we have unresolved pairs and no free dice, we cannot improve; force release strategy dice/supplementary pairs.
			let freeDice = state.dice.length - kept.length;
			const unresolvedPairFaces = state.numbers.filter(n=> n.pair && !n.formed).map(n=>n.face);
			if (rollsRemaining > 0 && unresolvedPairFaces.length > 0 && freeDice === 0){
				// Determine primary target (already computed: primaryFace). Release secondary resources.
				const secondaryPairFaces = unresolvedPairFaces.filter(f=> f!==primaryFace);
				// Build candidate release pool: secondary pair dice first, then specials (hearts, energy, attack) by priority.
				const releaseOrder = [];
				state.dice.forEach((f,i)=>{
					if (secondaryPairFaces.includes(f)) releaseOrder.push({index:i, type:'secondaryPair'});
				});
				// Specials prioritized: heart (least long-term EV if healthy) < energy < attack (attack often has tempo impact)
				const specialPriority = { heart:1, energy:2, attack:3 };
				state.dice.forEach((f,i)=>{
					if(!['one','two','three'].includes(f) && keep.has(i)){
						releaseOrder.push({index:i, type:'special', pr: specialPriority[f]||5});
					}
				});
				// Sort: secondary pairs first (stable), then specials by ascending priority value
				releaseOrder.sort((a,b)=>{
					if (a.type!==b.type) return a.type==='secondaryPair' ? -1 : 1;
					return (a.pr||0) - (b.pr||0);
				});
				// Release until at least 1 free die (aim for 2 dice if last roll) or pool exhausted
				const targetFree = rollsRemaining===1 ? 2 : 1;
				for (const cand of releaseOrder){
					if (freeDice >= targetFree) break;
					if (keep.delete(cand.index)) {
						releasedIndices.push(cand.index);
						freeDice++;
					}
				}
			}
			// Last-roll refinement: if this is the final reroll opportunity (rollsRemaining===1 BEFORE rolling again) and we still have multiple unresolved pairs kept fully, prune down.
			if (rollsRemaining === 1){
				const pairMeta = state.numbers.filter(n=> n.pair && !n.formed).map(n=>({face:n.face, count:n.count}));
				if (pairMeta.length > 1){
					// Ensure only primary pair is fully locked; release one die from each secondary pair if both dice currently kept.
					pairMeta.forEach(pm=>{
						if (pm.face === primaryFace) return;
						// find indices for this face
						const idxs=[]; state.dice.forEach((f,i)=>{ if(f===pm.face) idxs.push(i); });
						// if both kept, release one (choose arbitrarily last)
						const keptIdxs = idxs.filter(i=> keep.has(i));
						if (keptIdxs.length === 2){
							const releaseIndex = keptIdxs[keptIdxs.length-1];
							keep.delete(releaseIndex);
							releasedIndices.push(releaseIndex);
						}
					});
				}
			}
			// Recompute kept and freeDice if modified
			let keptFinal = Array.from(keep).sort((a,b)=>a-b);
			// Branch comparison refinement: If branch simulator identifies a branch with strictly higher score than our current tentative keep set interpretation, compare.
			if (branchSim && branchSim.best){
				// Derive current branch descriptor for comparison
				const currentTag = 'heuristic';
				// Score current via same metric: treat improvement portion as ev.total scaled + specials present
				const currentSpecialUtility = keptFinal.reduce((acc,idx)=>{
					const face = state.dice[idx];
					if (face==='attack') return acc + 8 + (state.criticalThreat?4:0);
					if (face==='energy') return acc + (state.phase==='early'?7: state.phase==='mid'?5:3);
					if (face==='heart' && !state.player.isInTokyo && state.player.health < state.player.maxHealth) return acc + (state.player.health<=CFG.healingCriticalHP?9:4);
					return acc;
				},0);
				const currentScore = (ev.total* (CFG.formedSetBase*0.05)) + currentSpecialUtility; // approximate scaling parity with simulator
				if (branchSim.best.score > currentScore * 1.08) { // require 8% margin to avoid churn
					keptFinal = branchSim.best.kept;
					releasedIndices.push('branch-adjust');
				}
			}
			freeDice = state.dice.length - keptFinal.length;
			// If heuristic made releases, append rationale token (UI can surface)
			let heuristicNote='';
			if (releasedIndices.length){
				heuristicNote = ` | heuristic: freed ${releasedIndices.length} die${releasedIndices.length>1?'s':''} for triple chase`;
			}

			// Refined improvement probability estimation
			// Consider each numeric face that isn't fully formed. For count==2 need 1 copy; for count==1 a single copy (pair) already improves EV.
			// Compute probability of at least required copies across all future individual dice results (free dice * remaining rolls)
			const improvingFaces = [];
			const trialCount = freeDice * state.rollsRemaining; // number of independent future dice outcomes (upper bound)
			if (freeDice>0 && state.rollsRemaining>0){
				state.numbers.forEach(n=>{
					if (n.count<3){
						const needed = (n.count===2)?1:1; // treat forming pair or completing triple both as improvement steps
						// Binomial tail: P(X >= needed) where X~Bin(trialCount,1/6)
						let p=0;
						for(let x=needed;x<=trialCount;x++){
							// nCx *(1/6)^x *(5/6)^{n-x}
							// Compute nCx iteratively to avoid large factorials
							let comb=1;
							for(let i=1;i<=x;i++) comb = comb * (trialCount - (x - i)) / i;
							p += comb * Math.pow(1/6,x) * Math.pow(5/6, trialCount - x);
						}
						improvingFaces.push({face:n.face, p});
					}
				});
				// If a specific goal face exists and not already included, add a light incremental chance (any appearance).
				if (goal && !improvingFaces.find(f=>f.face===goal.face)){
					let pGoal = 0;
					for(let x=1;x<=trialCount;x++){
						let comb=1;
						for(let i=1;i<=x;i++) comb = comb * (trialCount - (x - i)) / i;
						pGoal += comb * Math.pow(1/6,x) * Math.pow(5/6, trialCount - x);
					}
					improvingFaces.push({face:goal.face, p:pGoal});
				}
			}
			// Approximate union probability assuming limited overlap (faces mutually exclusive per outcome so independence heuristic acceptable)
			let improvementChance = 0;
			if (improvingFaces.length){
				let logNo = 0; // use log for numerical stability when many faces
				improvingFaces.forEach(f=>{ const pn = Math.max(0, Math.min(1, 1 - f.p)); logNo += Math.log(pn); });
				improvementChance = 1 - Math.exp(logNo);
			}
			let action='reroll';
			const unresolvedPairs = state.numbers.filter(n=> n.pair && !n.formed).length;
			// Adaptive thresholds
			const personality = state.personality || { risk:3, aggression:3, strategy:3 };
			const riskFactor = (personality.risk - 3); // -2..+2
			const adaptiveMinKept = Math.max(3, CFG.earlyStopMinKept + (riskFactor<=0 ? -riskFactor : 0)); // cautious (low risk) needs fewer kept to stop
			const adaptiveEVThreshold = CFG.earlyStopImprovementThreshold + (riskFactor * -0.07); // high risk raises threshold (harder to stop)
			if (rollsRemaining>0){
				if (kept.length>=adaptiveMinKept && improvement < adaptiveEVThreshold && unresolvedPairs===0){ action='endRoll'; }
			} else action='endRoll';
			// Guard: never end immediately after first roll (when 2+ rolls remain) to allow pursuit of emerging pairs
			if (rollsRemaining>=2 && action==='endRoll') {
				action='reroll';
				// annotate rationale so UI can reflect safeguard
			}
			// Natural language explanation
			const explanationFragments = [];
			if (goal) explanationFragments.push(`pursuing a potential set of ${goal.face}s`);
			if (unresolvedPairs>0) explanationFragments.push(`keeping ${unresolvedPairs} live pair${unresolvedPairs>1?'s':''}`);
			if (state.cardSummary.attackBoost) explanationFragments.push('leveraging attack boost');
			if (state.cardSummary.energyEngine) explanationFragments.push('building energy engine');
			if (state.cardSummary.healEngine) explanationFragments.push('maintaining healing synergy');
			if (state.cardSummary.extraDie) explanationFragments.push('future extra-die odds');
			const evClause = action==='endRoll'
				? `stopping as marginal gain ${improvement.toFixed(2)} < threshold ${adaptiveEVThreshold.toFixed(2)}`
				: `rolling again; projected gain ${improvement.toFixed(2)} ≥ threshold ${adaptiveEVThreshold.toFixed(2)}`;
			let reasonSentence = '';
			if (explanationFragments.length) {
				reasonSentence = `${evClause} while ${explanationFragments.join(', ')}`;
			} else {
				reasonSentence = evClause;
			}
			if (rollsRemaining>=2 && action==='reroll') reasonSentence += ' (first-roll exploration)';
			const reasonParts=[reasonSentence];
			const techMeta = { keptCount: kept.length, evGain: improvement, unresolvedPairs, adaptiveEVThreshold, adaptiveMinKept, extraDie: state.cardSummary.extraDie||0 };
			const confidence = action==='endRoll'? (rollsRemaining>0?0.8:0.92):0.6;
			// Yield / retreat suggestion (does not alter dice action, only advisory flag) when inside Tokyo low HP and multiple opponents can strike
			let yieldSuggestion = false;
			if (player.isInTokyo){
				const threateningEnemies = state.player.gameState?.players?.filter(p=> !p.isEliminated && p.id!==player.id && p.health>0).length || 0;
				const lowHP = player.health <= CFG.healingCriticalHP;
				if (lowHP && threateningEnemies>=2){
					yieldSuggestion = true;
					reasonParts.push('consider vacating Tokyo for survival');
				}
			}
			const evBreakdown = ev.items.map(it=>({ face:it.face, type:it.type, ev:Number(it.ev.toFixed(3)) }));
			// Attach branch analysis (trim for payload size)
			const branchAnalysis = branchSim ? {
				best: branchSim.best ? { tag: branchSim.best.tag, score: branchSim.best.score, kept: branchSim.best.kept, improvementEV: branchSim.best.improvementEV, specialUtility: branchSim.best.specialUtility } : null,
				considered: branchSim.evaluated.slice(0,8) // top 8 for richer UI
			} : null;
			if (branchAnalysis?.best && !reasonParts.join(' ').includes('branch')){
				reasonParts.push(`branch opt: ${branchAnalysis.best.tag} score ${branchAnalysis.best.score}`);
			}
			// Projection (depth-2) for current keep set
			const projection = this._projectTwoRollEV(state, new Set(keptFinal));
			return { action, keepDice: keptFinal, reason: reasonParts.join(' ') + heuristicNote, confidence, yieldSuggestion, techMeta, goal, releasedIndices, improvementChance:Number(improvementChance.toFixed(3)), improvingFaces:Array.from(improvingFaces), evBreakdown, improvementEV: improvement, branchAnalysis, projection };
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
			// Reroll with zero free dice invariant: if action is reroll but no free dice & unresolved pairs exist, release one secondary or special.
			if (decision.action==='reroll' && rollsRemaining>0){
				const pairFaces = ['one','two','three'].filter(f=>counts[f]===2);
				const keptSet = new Set(decision.keepDice);
				const freeDiceNow = state.dice.length - keptSet.size;
				if (freeDiceNow===0 && pairFaces.length>0){
					// release one die from lowest-value non-primary pair OR lowest-priority special
					// Determine primary: highest count then face value (3>2>1)
					let primaryFace=null;
					['three','two','one'].forEach(f=>{ if (counts[f]===2 && primaryFace===null) primaryFace=f; });
					const releaseCandidates=[];
					// secondary pair dice
					['one','two','three'].forEach(f=>{
						if (f!==primaryFace && counts[f]===2){ state.dice.forEach((face,i)=>{ if(face===f) releaseCandidates.push({i, pr:1}); }); }
					});
					// specials
					const spriority={ heart:2, energy:3, attack:4 };
					state.dice.forEach((face,i)=>{ if(!['one','two','three'].includes(face)) releaseCandidates.push({i, pr:spriority[face]||5}); });
					releaseCandidates.sort((a,b)=>a.pr-b.pr);
					if (releaseCandidates.length){
						const rel = releaseCandidates[0];
						keptSet.delete(rel.i);
						decision.keepDice = Array.from(keptSet).sort((a,b)=>a-b);
						decision.reason+=' | inv:forced free die';
					}
				}
			}
			// attack cluster rule
			if (decision.action==='endRoll' && rollsRemaining>0 && counts.attack>=4){
				const singleNumber = ['one','two','three'].some(f=>counts[f]===1);
				if (singleNumber){ decision.action='reroll'; decision.reason+=' | inv:attack cluster'; }
			}
			decision.keepDice = Array.from(new Set(decision.keepDice)).sort((a,b)=>a-b);
			const __t1 = (typeof performance!=='undefined')? performance.now(): Date.now();
			AIDecisionProfiler.record('assembleDecision', __t1-__t0);
			AIDecisionProfiler.maybeLog();
			return decision;
		}

		// ---------- Utility ----------
		_canon(f){ switch(f){ case '1': return 'one'; case '2': return 'two'; case '3': return 'three'; default: return f; } }

		// ---------- Power Card Feature Extraction & Synergy ----------
		_getOrInitPlayerMemory(player){
			if (!player._aiMemory) player._aiMemory = { purchases:[], counts:{} };
			return player._aiMemory;
		}

		_extractCardFeatures(card){
			const features = new Set();
			if (!card) return features;
			const name = (card.name||'').toLowerCase();
			// Name hints (fallback)
			if (name.includes('extra') && name.includes('head')) features.add('extraDie');
			if (name.includes('brain')) features.add('extraReroll');
			if (name.includes('attack') || name.includes('spiked') || name.includes('fire')) features.add('attack');
			if (name.includes('heal') || name.includes('regeneration') || name.includes('rapid')) features.add('heal');
			if (name.includes('energy') || name.includes('metabolism') || name.includes('store')) features.add('energy');
			if (name.includes('victory') || name.includes('point') || name.includes('news')) features.add('vp');
			// Structured effects
			if (Array.isArray(card.effects)){
				card.effects.forEach(e=>{
					const type=(e.type||'').toLowerCase();
					if (type==='extradie') features.add('extraDie');
					else if (type==='extrareroll') features.add('extraReroll');
					else if (type==='attackbonus') features.add('attack');
					else if (type==='bonusenergy') features.add('energy');
					else if (type==='healpoints') features.add('heal');
					else if (type==='victorypoints') features.add('vp');
				});
			}
			return features;
		}

		// Basic synergy weight matrix (symmetric assumed); key: feature -> otherFeature -> multiplier bonus
		_getSynergyMatrix(){
			return {
				extraDie: { extraReroll: 1.15, attack:1.08, vp:1.05 },
				extraReroll: { extraDie:1.15, attack:1.07, vp:1.04 },
				attack: { extraDie:1.08, extraReroll:1.07, energy:1.03 },
				energy: { extraDie:1.05, vp:1.05 },
				heal: { energy:1.04, vp:1.03 },
				vp: { extraDie:1.05, extraReroll:1.04 }
			};
		}

		_computeSynergyMultiplier(existingFeatures, newFeatures){
			const matrix = this._getSynergyMatrix();
			let mult = 1.0;
			newFeatures.forEach(nf=>{
				existingFeatures.forEach(ef=>{
					const row = matrix[ef];
					if (row && row[nf]) mult *= row[nf];
					const row2 = matrix[nf];
					if (row2 && row2[ef]) mult *= row2[ef];
				});
			});
			return mult;
		}

		recordPowerCardPurchase(player, card){
			const mem = this._getOrInitPlayerMemory(player);
			mem.purchases.push({ id:card.id||card.name, ts:Date.now(), name:card.name });
			const feats = this._extractCardFeatures(card);
			feats.forEach(f=> mem.counts[f] = (mem.counts[f]||0)+1);
		}

		// ---------- Power Card Portfolio (Heuristic Stub) ----------
		// expected usage: optimizePowerCardPortfolio(availableCards, player) -> { cards:[], totalCost, strategy, efficiency, rationale: { perCard:[], aggregate:{} } }
		// New version: synergy-aware greedy optimizer with diminishing returns & rationale output
		_getDiminishingFactor(feature, count){
			// count = already owned BEFORE purchase; returns multiplier applied to base value of new feature instance
			// Curve chosen for gentle early stacking then tapering
			if (count <= 0) return 1.0;
			if (count === 1) return 0.82;
			if (count === 2) return 0.6;
			if (count === 3) return 0.45;
			return 0.35; // 4 or more
		}

		optimizePowerCardPortfolio(availableCards, player){
			if (!Array.isArray(availableCards) || !availableCards.length) return { cards:[], totalCost:0, strategy:'none', efficiency:0, rationale:{ perCard:[], aggregate:{} } };
			const energyBudget = player.energy || 0;
			if (energyBudget <= 0) return { cards:[], totalCost:0, strategy:'none', efficiency:0, rationale:{ perCard:[], aggregate:{} } };

			// Base feature weights (tunable)
			const baseWeights = { extraDie:22, extraReroll:18, attack:14, energy:12, heal:10, vp:8 };
			// Personality adjustments
			const { aggression=0.5, strategy: stratBias=0.5, risk=0.5 } = player.personality || {};
			// Copy existing purchase memory counts
			const mem = this._getOrInitPlayerMemory(player);
			const ownedCounts = { ...mem.counts };
			const ownedFeaturesSet = new Set(Object.keys(ownedCounts).filter(k=>ownedCounts[k]>0));

			// Helper to compute base value for a card
			const computeBase = (features)=>{
				let v=0; features.forEach(f=>{ v += (baseWeights[f]||5); });
				return v;
			};

			// Pre-extract features per card
			const cardMeta = availableCards.map(c=>{
				const feats = this._extractCardFeatures(c);
				return { card:c, features:feats, cost:c.cost||0 };
			});

			const rationalePerCard = [];
			const chosenCards=[]; let spent=0; let cumulativeScore=0;
			const simulatedCounts = { ...ownedCounts };
			const simulatedFeatures = new Set(ownedFeaturesSet);

			// Greedy selection loop
			while (true){
				let best=null;
				for (const meta of cardMeta){
					if (chosenCards.includes(meta.card)) continue;
					if (meta.cost + spent > energyBudget) continue;
					const base = computeBase(meta.features);
					// Diminishing returns factor (average across features for stability)
					let drFactors=[]; meta.features.forEach(f=>{ const cnt = simulatedCounts[f]||0; drFactors.push(this._getDiminishingFactor(f,cnt)); });
					const diminishing = drFactors.length? (drFactors.reduce((a,b)=>a+b,0)/drFactors.length):1;
					// Synergy multiplier relative to already simulated features
					const synergyMult = this._computeSynergyMultiplier(simulatedFeatures, meta.features) || 1;
					// Personality adjustments
					let personalityMult = 1;
					if (meta.features.has('attack')) personalityMult *= (1 + (aggression-0.5)*0.6);
					if (meta.features.has('extraDie') || meta.features.has('extraReroll')) personalityMult *= (1 + (stratBias-0.5)*0.5);
					if (meta.features.has('vp')) personalityMult *= (1 + (stratBias-0.5)*0.3);
					if (meta.features.has('heal') && player.health <= 4) personalityMult *= 1.25; // situational urgency
					// Risk leaning favors scaling pieces earlier
					if (meta.features.has('extraDie') && risk>0.6) personalityMult *= 1.1;
					// Raw adjusted value
					const rawAdjusted = base * diminishing * synergyMult * personalityMult;
					// Cost pressure (slightly superlinear) to discourage overpay
					const net = meta.cost>0? rawAdjusted / Math.pow(meta.cost,0.92): rawAdjusted;
					// Track candidate rationale (temporary)
					if (!best || net > best.net){
						best = { meta, base, diminishing, synergyMult, personalityMult, rawAdjusted, net };
					}
				}
				if (!best || best.net <= 5) break; // threshold guard; tunable
				// Accept best pick
				chosenCards.push(best.meta.card);
				spent += best.meta.cost;
				cumulativeScore += best.rawAdjusted;
				// Update simulated ownership
				best.meta.features.forEach(f=>{
					simulatedCounts[f] = (simulatedCounts[f]||0)+1;
					simulatedFeatures.add(f);
				});
				// Store rationale entry
				rationalePerCard.push({
					cardId: best.meta.card.id || best.meta.card.name,
					name: best.meta.card.name,
					features:[...best.meta.features],
					base: best.base,
					diminishing: best.diminishing,
					synergyMultiplier: best.synergyMult,
					personalityMultiplier: best.personalityMult,
					cost: best.meta.cost,
					netValue: best.net,
					rawAdjusted: best.rawAdjusted
				});
				if (spent >= energyBudget) break;
			}

			// Strategy label: pick most common feature category among chosen
			const featureTally={};
			for (const r of rationalePerCard){ r.features.forEach(f=> featureTally[f]=(featureTally[f]||0)+1); }
			let strategyLabel='balanced';
			if (Object.keys(featureTally).length){ strategyLabel = Object.entries(featureTally).sort((a,b)=> b[1]-a[1])[0][0]; }
			const efficiency = spent>0? cumulativeScore / spent : 0;
			const rationaleAggregate = {
				energyBudget,
				energySpent: spent,
				unspent: energyBudget-spent,
				selectedCount: chosenCards.length,
				featureTally,
				strategicIntent: strategyLabel,
				stoppedReason: (spent>=energyBudget? 'budget_exhausted': 'marginal_value_below_threshold'),
				thresholdUsed: 5
			};
			return { cards: chosenCards, totalCost: spent, strategy: strategyLabel, efficiency, rationale:{ perCard: rationalePerCard, aggregate: rationaleAggregate } };
		}

		// expected usage: evaluateDefensiveCardPurchase(card, player, availableCards) -> { shouldBuyDefensively, defensiveValue, denialReason }
		evaluateDefensiveCardPurchase(card, player, available){
			if (!card) return { shouldBuyDefensively:false, defensiveValue:0, denialReason:'' };
			// Heuristic: if card grants rerolls/extra heads/healing and opponents low HP or racing VP, deny
			const name = (card.name||'').toLowerCase();
			let defensiveValue=0; let reasonParts=[];
			if (name.includes('head')) { defensiveValue+=8; reasonParts.push('deny extra die potential'); }
			if (name.includes('brain')) { defensiveValue+=7; reasonParts.push('deny reroll boost'); }
			if (name.includes('heal') || name.includes('regeneration')) { defensiveValue+=6; reasonParts.push('deny sustain'); }
			if (name.includes('attack') || name.includes('spiked') || name.includes('fire')) { defensiveValue+=5; reasonParts.push('deny offense'); }
			// Scale by threat level among opponents
			const threats = (player.gameState?.players||[]).filter(p=> p.id!==player.id && !p.isEliminated);
			const highVP = threats.some(t=> t.victoryPoints>=15);
			if (highVP) defensiveValue *= 1.2;
			const lowHPEnemy = threats.some(t=> t.health<=3);
			if (lowHPEnemy && (name.includes('heal')||name.includes('regeneration'))) defensiveValue *= 0.6; // less need to deny heal if they may die soon
			// Budget gate: must still be affordable after portfolio plan (caller handles leftover energy)
			const should = defensiveValue >= 9 && (card.cost || 0) <= player.energy;
			return { shouldBuyDefensively: should, defensiveValue, denialReason: reasonParts.join(', ') };
		}
	}

	if (typeof window !== 'undefined') window.AIDecisionEngine = AIDecisionEngine;
	if (typeof module !== 'undefined' && module.exports) module.exports = { AIDecisionEngine };
})();

