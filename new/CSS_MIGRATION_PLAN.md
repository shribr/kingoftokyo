## King of Tokyo – CSS / Theme Migration Plan (Draft v1)

Purpose: Establish a structured, token-driven, component/state based design system to incrementally replace the current ad-hoc CSS without breaking existing gameplay or dynamic rendering flows.

### 0. High-Level Objectives
1. Consistency: Unify typography, spacing, borders, shadows, colors, transforms.
2. Isolation: Prevent a style used for one feature (e.g. dropdown in setup) from affecting unrelated UI (e.g. settings toolbar).
3. Explicit State: Replace ambiguous class names and inline styling with semantic modifiers (`.is-active`, `.is-kept`, `.is-in-tokyo-city`).
4. Incremental Safety: Parallel new system alongside legacy styles; retire one component at a time.
5. Tokenization: Centralize all recurring raw values (colors, spacing, radii, perspective transforms, shadows) into CSS Custom Properties.
6. Theming Readiness: Allow future dark / high-contrast / minimalist variants by swapping token layer only.
7. Predictability: Reduce nth-child positional hacks / random transforms that make layout fragile.
8. Runtime Clarity: JS should toggle semantic classes, not inject arbitrary inline declarations (except ephemeral geometry like drag positional fixes).

### 0.1 Guiding Principles
- Layered Cascade: reset → tokens → primitives → components → states → themes → legacy overrides (temporary).
- No Overloaded Utilities: Each utility does exactly one thing (e.g. `.u-hidden`, not multi-responsibility classes).
- Deterministic Transforms: Use named motion tokens instead of copy/pasted perspective blends.
- Accessibility: Maintain contrast (≥4.5:1 for text), provide focus-visible styles, future `prefers-reduced-motion` support.
- Reversibility: Each migration step must be revertible by stylesheet exclusion toggles.

---

### 1. Element Inventory with Raw Property Value Extraction (No Legacy Class Semantics)

Goal: For each logical UI element, capture the final intended base styling VALUES (source references optional) so we can design new semantic classes later. This ignores existing class names except as provenance notes.

Format:
Element Name (logical)  
Base Properties (raw CSS declarations)  
Source Hints (where value observed)  
State Deviations (only if property changes on hover/selected/etc.)

#### 1.1 Root / Body / Game Container
Element: Body Root
Properties:
	background: radial-gradient(circle at 4px 4px, rgba(255,255,255,0.05) 1px, transparent 0), linear-gradient(to bottom, transparent 85%, #000 85.5%, #000 88%, #111 88.5%, #111 91%, #000 91.5%, #000 94%, #222 94.5%, #222 97%, #000 97.5%, #000 100%), linear-gradient(135deg, #000 0%, #1a1a1a 25%, #2a2a2a 50%, #3a3a3a 75%, #4a4a4a 100%);
	background-size: 20px 20px, 100% 100%, 100% 100%;
	min-height: 100vh;
	color: #fff;
	font-family: 'Nunito', sans-serif;
	overflow-x: hidden;
	overflow-y: visible;

Element: Body Overlay Pattern (pseudo ::before)
	position: fixed; inset: 0;
	background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0);
	background-size: 20px 20px;
	pointer-events: none;
	z-index: 100;

Element: Game Container Wrapper (`#game-container` logical)
	max-width: 100vw;
	height: 100vh;
	margin: 0;
	padding: 10px 0;
	position: relative;
	z-index: 200;
	overflow: visible;
	box-sizing: border-box;

Element: Game Container Themed Panel (`.game-container` initial hidden shell)
	display: none (initial); min-height: 100vh;
	background: linear-gradient(45deg, transparent 25%, rgba(255,215,0,0.1) 25%, rgba(255,215,0,0.1) 50%, transparent 50%, transparent 75%, rgba(255,140,0,0.1) 75%), linear-gradient(-45deg, transparent 25%, rgba(255,69,0,0.1) 25%, rgba(255,69,0,0.1) 50%, transparent 50%, transparent 75%, rgba(220,20,60,0.1) 75%), linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
	background-size: 60px 60px, 80px 80px, 100% 100%;
	padding: 20px;
	position: relative;
	border: 4px solid #000;
	border-radius: 0;
	box-shadow: inset 0 0 50px rgba(0,0,0,0.8);

#### 1.2 Header Region
Element: Game Header Container
	background: linear-gradient(135deg, #2c1810 0%, #8b4513 20%, #ff6b00 40%, #ffaa00 60%, #8b4513 80%, #2c1810 100%);
	padding: 15px 20px;
	border-radius: 15px;
	margin-bottom: 15px;
	display: flex; justify-content: center; align-items: center;
	box-shadow: 8px 8px 0px #000, 12px 12px 25px rgba(0,0,0,0.5);
	border: 6px solid #000;
	position: relative; overflow: hidden;
	background-image (overlay halftone composite): radial-gradient(circle at 3px 3px, rgba(0,0,0,0.1) 1px, transparent 0), linear-gradient(135deg, #2c1810 0%, #8b4513 20%, #ff6b00 40%, #ffaa00 60%, #8b4513 80%, #2c1810 100%);
	background-size: 12px 12px, 100% 100%;

Element: Header Title Text (Game Name)
	font-family: 'Bangers', cursive;
	font-size: 5em;
	font-weight: 900;
	color: #FFD700;
	text-shadow: (-6px -6px 0 #000, 6px -6px 0 #000, -6px 6px 0 #000, 6px 6px 0 #000, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 3px 3px 6px rgba(0,0,0,0.6));
	letter-spacing: 6px;
	transform: perspective(800px) rotateX(-3deg) rotateY(-2deg) translateX(-100px);
	margin: 0; position: relative; z-index: 5000;
	filter: drop-shadow(8px 8px 0px #000) drop-shadow(10px 10px 15px rgba(0,0,0,0.5));
	text-transform: uppercase;

Element: Active Player Display (Header Inline Right – `.game-info` logical)
	display: flex; flex-direction: column; gap: 10px;
	font-size: 1.1em; font-weight: bold; color:#fff;
	text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
	background: linear-gradient(135deg,#2c1810 0%, #8b4513 50%, #ff6b00 100%);
	padding: 15px 20px; border: 4px solid #000; border-radius: 0;
	position: absolute; right: 20px; top: 50%; transform: translateY(-50%) perspective(400px) rotateX(2deg) rotateZ(-1.5deg);
	box-shadow: 6px 6px 0px #000, 8px 8px 20px rgba(0,0,0,0.4);
	background-image: radial-gradient(circle at 3px 3px, rgba(0,0,0,0.15) 1px, transparent 0), linear-gradient(135deg,#2c1810 0%, #8b4513 50%, #ff6b00 100%);
	background-size: 12px 12px, 100% 100%;

Element: Active Player Name (standalone label `#current-player`)
	font-family:'Bangers', cursive; font-size:2.5em; color:#FFD700; font-weight:900;
	text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 4px 4px 8px rgba(0,0,0,0.8);
	letter-spacing:1px; position:absolute; top:50%; left:120px; transform:translateY(-50%);
	z-index:2; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;

Element: Header Notification Bubble (non-blocking)
	position:absolute; top:220px; right:750px; z-index:1000;
	padding:8px 20px; margin:8px 0; min-width:300px; white-space:nowrap;
	background:#ffffff; color:#000; border:2px solid #000; border-radius:25px;
	font-family:'Bangers', cursive; font-size:18px; text-align:center; cursor:pointer;
	opacity:0; transition:all 0.3s ease; box-shadow:0 4px 12px rgba(0,0,0,0.3);
	background-image: radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0); background-size:8px 8px;
State (visible): opacity:1; transform:none;
State (hover): transform:translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,0.4);

Element: CPU Action Notification (above dice)
	position:absolute; top:-80px; left:50%; transform:translateX(-50%);
	z-index:999; padding:10px 20px; max-width:400px;
	display:flex; align-items:center; gap:10px;
	background:rgba(255,255,255,0.95); border:2px solid #333; border-radius:20px;
	font-family:'Bangers', cursive; font-size:16px; color:#333; cursor:pointer;
	opacity:0; transition:all 0.4s ease; box-shadow:0 4px 15px rgba(0,0,0,0.3);
	backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px);
	white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
	background-image: radial-gradient(circle at 2px 2px, rgba(0,0,0,0.08) 1px, transparent 0); background-size:6px 6px;
State (visible): opacity:1; transform:translateX(-50%) translateY(-5px);
State (hover): background:rgba(255,255,255,0.98); transform:translateX(-50%) translateY(-8px); box-shadow:0 6px 20px rgba(0,0,0,0.4);

#### 1.3 Dice Zone (Tray & Die Unit)
Element: Dice Tray Container (`.dice-area`)
	background:#f8f9fa;
	padding:15px 20px; border:4px solid #000; border-radius:0;
	display:inline-flex; align-items:center; gap:15px; width:fit-content;
	box-shadow:6px 6px 0px #000, 8px 8px 20px rgba(0,0,0,0.4);
	transform:perspective(400px) rotateX(2deg) rotateZ(-0.5deg);
	background-image: radial-gradient(circle at 3px 3px, rgba(0,0,0,0.1) 1px, transparent 0); background-size:15px 15px;

Element: Dice Grid Container (`.dice-container`)
	background: linear-gradient(135deg,#2a2a2a 0%, #404040 50%, #2a2a2a 100%);
	border:4px solid #000; border-radius:0; position:relative;
	transform:perspective(600px) rotateX(-1deg) rotateZ(0.5deg);
	box-shadow:6px 6px 0px #000, 10px 10px 25px rgba(0,0,0,0.6);
	display:flex; flex-wrap:wrap; justify-content:flex-start; align-items:center; gap:8px;
	width:fit-content; height:100%; overflow:hidden; padding-left:15px; padding-right:15px;

Element: Rolls Indicator Badge (`.rolls-indicator`)
	font-family:'Bangers', cursive; font-size:1.44em; font-weight:bold; color:#FFD700;
	text-shadow:-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000,4px 4px 8px rgba(0,0,0,0.8);
	padding:9.6px 14.4px; background:linear-gradient(135deg,#2c1810 0%, #8b4513 50%, #ff6b00 100%);
	border:4px solid #000; border-radius:0; box-shadow:4px 4px 0px #000,6px 6px 20px rgba(0,0,0,0.4);
	transform:perspective(400px) rotateX(2deg) rotateZ(-1.5deg) scale(1.2);
	background-image: radial-gradient(circle at 3px 3px, rgba(0,0,0,0.15) 1px, transparent 0), linear-gradient(135deg,#2c1810 0%, #8b4513 50%, #ff6b00 100%);
	background-size:12px 12px, 100% 100%;
	margin-left:20px; align-self:center;

Element: Die (Base)
	width:60px; height:60px; border:4px solid #000; border-radius:0;
	background:linear-gradient(135deg,#ffffff 0%, #f8f8f8 50%, #eeeeee 100%);
	background-image: radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0), linear-gradient(135deg,#ffffff 0%, #f8f8f8 50%, #eeeeee 100%);
	background-size:8px 8px, 100% 100%;
	display:inline-flex; align-items:center; justify-content:center;
	font-size:1.6em; font-weight:900; font-family:'Bangers', cursive; color:#000;
	box-shadow:4px 4px 0px #000, 6px 6px 15px rgba(0,0,0,0.4);
	position:relative; cursor:pointer; transition:all 0.3s cubic-bezier(0.68,-0.55,0.265,1.55);
	transform:perspective(400px) rotateX(5deg) rotateY(-2deg) rotateZ(0.5deg);
State (hover): transform:perspective(300px) rotateX(15deg) rotateY(-15deg) translateY(-3px) scale(1.05); border-color:#343a40; box-shadow:0 12px 24px rgba(0,0,0,0.4), inset 0 4px 0 rgba(255,255,255,0.9), inset 0 -4px 0 rgba(0,0,0,0.25), inset 4px 0 0 rgba(255,255,255,0.5), inset -4px 0 0 rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.15);
State (selected): border-color:#000; transform:perspective(300px) rotateX(10deg) rotateY(-20deg) translateY(-15px) scale(1.08); box-shadow:4px 4px 0px #000;
State (disabled): opacity:0.3; background:transparent; border:2px dashed #666; color:transparent; cursor:default; box-shadow:none; pointer-events:none;

#### 1.4 Power Card Marketplace (Core Tile)
Element: Power Card Panel Wrapper (cards area container)
	background:linear-gradient(135deg,#2a2a2a 0%, #404040 100%);
	padding:15px 12px; border:4px solid #000; border-radius:0;
	box-shadow:6px 6px 0px #000, 8px 8px 20px rgba(0,0,0,0.4);
	transform:perspective(400px) rotateX(2deg) rotateZ(-1deg);
	background-image: radial-gradient(circle at 3px 3px, rgba(255,255,255,0.1) 1px, transparent 0), linear-gradient(135deg,#2a2a2a 0%, #404040 100%);
	background-size:15px 15px, 100% 100%;

Element: Power Card Tile (base)
	padding:22px 17px; min-height:180px; display:flex; flex-direction:column; justify-content:space-between; width:100%;
	border:3px solid #000; border-radius:0; box-shadow:4px 4px 0px #000;
	font-family:'Bangers', cursive; font-size:1em; letter-spacing:0.5px; cursor:pointer;
	position:relative; overflow:hidden; transition:all 0.4s cubic-bezier(0.68,-0.55,0.265,1.55);
	transform:perspective(300px) rotateX(2deg) rotateY(-1deg) rotateZ(0.5deg);
	background-color:#663399; background-image:radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0); background-size:12px 12px;

Element: Power Card Name Block
	font-family:'Bangers', cursive; font-size:1.1em; font-weight:normal; letter-spacing:1px; margin-bottom:8px;
	background:linear-gradient(135deg,#fff8dc 0%, #f5deb3 100%); padding:8px 10px; border:2px solid #000; border-radius:0; color:#000;

Element: Power Card Description Block
	background:linear-gradient(135deg,#fff8dc 0%, #f5deb3 100%); padding:8px 10px; border:2px solid #000; border-radius:0;
	font-size:1.0em; line-height:1.3; color:#000; margin-top:10px; min-height:100px;

Element: Power Card Cost Badge
	position:absolute; bottom:8px; right:15px; min-width:44px; height:38px; display:flex; align-items:center; justify-content:center;
	padding:0 8px; font-family:'Bangers', cursive; font-size:1.3em; font-weight:200; color:#000;
	background:linear-gradient(135deg,#ffd700 0%, #ffb300 100%); border:2px solid #000; box-shadow:2px 2px 0px #000; white-space:nowrap; border-radius:0;

#### 1.5 Player Dashboard (Subset – Avatar & Stats Base)
Element: Monster Avatar Circle
	width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:3em;
	border:4px solid #000; position:relative; overflow:hidden; transition:all 0.3s ease; transform:translate(-3px,4px);
	background:#f0f0f0; /* base, some variants override with gradients */
State (hover): transform:translate(-3px,4px) translateY(-2px) scale(1.05); border-width:5px;

Element: Player Stats Grid Wrapper
	display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center; position:relative; z-index:1;
	transition:all 0.4s cubic-bezier(0.25,0.46,0.45,0.94); opacity:1; transform:translateY(5px);
State (dashboard not hovered): gap:4px;

Element: Single Stat Tile (Collapsed)
	background:linear-gradient(135deg,#ffffff 0%, #f8f9fa 100%); padding:8px 12px; border:2px solid #000;
	border-radius:0; box-shadow:2px 2px 0px #000, 3px 3px 8px rgba(0,0,0,0.3);
	transition:all 0.4s cubic-bezier(0.25,0.46,0.45,0.94); transform:perspective(300px) rotateX(2deg) rotateZ(0.5deg);
	background-image:radial-gradient(circle at 2px 2px, rgba(0,0,0,0.08) 1px, transparent 0), linear-gradient(135deg,#ffffff 0%, #f8f9fa 100%); background-size:10px 10px, 100% 100%;
State (dashboard hover expanded): padding:12px 15px; border:3px solid #000; box-shadow:4px 4px 0px #000,6px 6px 15px rgba(0,0,0,0.3);
State (tile hover): transform:perspective(300px) rotateX(-2deg) translateY(-2px) scale(1.05); box-shadow:6px 6px 0px #000,8px 8px 20px rgba(0,0,0,0.4); z-index:10;

Element: Stat Label (Collapsed)
	font-size:0.6em; font-weight:900; font-family:'Bangers', cursive; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;
	text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; transition:all 0.3s ease;
State (dashboard hover): font-size:0.7em; margin-bottom:4px;

Element: Stat Value (Collapsed)
	font-size:1.2em; font-weight:900; font-family:'Bangers', cursive; letter-spacing:1px; color:#000;
	text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff,2px 2px 4px rgba(0,0,0,0.6); transition:all 0.3s ease;
State (dashboard hover): font-size:1.4em;

Element: Stat Value (Health) override
	color:#e53935; text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff,2px 2px 4px rgba(229,57,53,0.4);

Element: Stat Value (Energy) override
	color:#d4a500; text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;

Element: Stat Value (Points) override
	color:#cc6600; text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;

---
// Next chunk will continue inventory (tokyo area, action menu, thought bubbles, AI decision, logs, notifications) plus then state mapping & tokens.

#### 1.6 Tokyo Region (Board Occupancy Interface)
Element: Tokyo Area Wrapper
	background: linear-gradient(45deg, transparent 30%, rgba(255,215,0,0.2) 30%, rgba(255,215,0,0.2) 70%, transparent 70%), linear-gradient(-45deg, transparent 30%, rgba(255,140,0,0.15) 30%, rgba(255,140,0,0.15) 70%, transparent 70%), linear-gradient(135deg,#2a2a2a 0%, #404040 50%, #2a2a2a 100%);
	background-size: 40px 40px, 60px 60px, 100% 100%;
	border:6px solid #000; border-radius:8px; padding:20px; text-align:center;
	box-shadow:8px 8px 0px #000, 12px 12px 30px rgba(0,0,0,0.8);
	position:relative; transform:perspective(600px) rotateX(2deg) rotateZ(-1deg); display:block;
Overlay (::before): background-image: radial-gradient(circle at 20% 20%, rgba(255,193,7,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,87,34,0.3) 0%, transparent 50%), linear-gradient(45deg, transparent 30%, rgba(0,0,0,0.1) 50%, transparent 70%);

Element: Tokyo City Slot (occupied container styling baseline)
	display:inline-block; background:linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%);
	padding:25px; border:4px solid #000; border-radius:0; width:240px;
	backdrop-filter:blur(5px); position:absolute; z-index:350; box-shadow:6px 6px 0px #000, 8px 8px 15px rgba(0,0,0,0.4);
	transform:translateX(-50%) scale(1.2) perspective(400px) rotateX(-1deg) rotateZ(1.5deg); opacity:1; overflow:hidden;
	background-image: radial-gradient(circle at 3px 3px, rgba(255,255,255,0.1) 1px, transparent 0), linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%);
	background-size:15px 15px, 100% 100%;

Element: Tokyo Bay Slot
	(base same as city) but transform: scale(0.7) perspective(400px) rotateX(1deg) rotateZ(-2deg);
	opacity:0.3; z-index:310; right:850px; top:70px; position:absolute; transition:opacity 0.5s ease, transform 0.5s ease;
State (5+ players): opacity:1; transform:scale(1) perspective(400px) rotateX(1deg) rotateZ(-2deg);

Element: Tokyo Slot Heading (inside bay/city)
	font-family:'Bangers'; font-weight:900; font-size:1.4em; color:#FFD700; margin-bottom:15px;
	text-shadow:-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000,4px 4px 8px rgba(0,0,0,0.8); letter-spacing:1px;

Element: Monster Slot Placeholder (empty)
	width:170px; height:170px; border:4px dashed rgba(255,255,255,0.7); border-radius:0; display:flex; flex-direction:column; align-items:center; justify-content:center; margin:0 auto;
	transition:all 0.4s ease; background:rgba(255,255,255,0.1); backdrop-filter:blur(3px);
	box-shadow:inset 0 0 20px rgba(255,255,255,0.1), 4px 4px 8px rgba(0,0,0,0.3);
	transform:perspective(300px) rotateX(1deg) rotateZ(0.2deg);
State (occupied): border:4px solid #000; background: (monster-specific override); /* per data-monster */

Element: Tokyo Highlight Wiggle (active player animation target)
	Animation references (not enumerated here) apply transforms + subtle scale oscillation.

#### 1.7 Action Menu (Vertical Control Block)
Element: Action Menu Container
	display:flex; flex-direction:column; gap:12px; padding:15px; background:#3a3a3a;
	border:4px solid #000; border-radius:0; box-shadow:6px 6px 0px #000, 8px 8px 20px rgba(0,0,0,0.4);
	transform:perspective(400px) rotateX(2deg) rotateZ(-1.5deg);

Element: Action Menu Button (base inside menu)
	width:100%; margin:0; font-family:'Bangers'; font-size:1.1em; font-weight:900; padding:15px 16px;
	color:#FFFFFF; text-shadow:-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000,4px 4px 8px rgba(0,0,0,0.8);
	background:#4a4a4a; border:4px solid #000; border-radius:0; box-shadow:4px 4px 0px #000, 6px 6px 20px rgba(0,0,0,0.4);
	transform:perspective(400px) rotateX(2deg) rotateZ(-1.5deg); cursor:pointer; transition:all 0.3s ease;
State (hover enabled): transform:perspective(400px) rotateX(2deg) rotateZ(-1.5deg) translateY(-2px); box-shadow:4px 6px 0px #000, 6px 8px 25px rgba(0,0,0,0.5);
State (disabled): opacity:0.6; cursor:not-allowed;

#### 1.8 Notifications & Indicators (Additional)
Element: CPU Rolling Indicator (container)
	position:absolute; top:4px; right:6px; display:flex; gap:3px; opacity:0.9; pointer-events:none; animation: fadeIn (custom) 0.3s ease; /* actual keyframe name koFadeIn */
	z-index:??? (inline style context) typical overlay near dice (value not explicitly enumerated; appears above dice area). 
Element: CPU Rolling Dot
	width:6px; height:6px; background:#d4c14f; border-radius:50%; box-shadow:0 0 4px rgba(0,0,0,.3); animation:pulse 1s infinite ease-in-out;
State (nth-child offset): animation-delay increments (0s, .2s, .4s);
Dark Mode override: background:#f4e38a;

#### 1.9 Pending (Next Batch)
Remaining to extract: AI decision tree content sections, thought bubbles, log entries, owned power cards list, probability bars, drag visual states, marketplace refresh overlay, tokyo inline indicator, power card tab rail, dice release / keep highlight specifics.

---

### 1.10 AI Decision Tree / Logic Flow Panel (Comprehensive)
See Section 3.10 later for a more normalized component spec; this subsection preserves raw grouping inside current file. (Extracted from `ai-logic-flow.css` and portions of `layout.css` where probability analysis duplicates exist.)

Key Clusters Covered: container root, round/turn/roll hierarchy, goal timeline, decision/confidence pills, probability chart, narrative & reasoning, inline dice states, controls header, concise mode filters, tooltip breakdowns.

Container Root (#ai-logic-flow)
- font-family: var(--ui-font, system-ui, sans-serif)
- padding: 8px 10px 36px
- line-height: 1.35
- font-size: 14px
- background: #f5f6f8 (dark: #1f2429)
- color: #1f2328 (dark: #e6ebf0)
- border-radius: 8px

Empty State (.ai-flow-empty)
- opacity: .7; font-style: italic; padding: 10px 4px

Round Container (.ai-flow-round)
- gradients: light 180deg #ffffff → #f4f8fb; dark 180deg #2a3137 → #222a30
- border-color: #ccd6de (dark #303b44)
- border: 1px solid (initial rgba(0,0,0,.08))
- border-radius: 6px; margin-bottom:10px
- box-shadow: 0 1px 2px rgba(0,0,0,.06) (dark heavier)

Round Header (.ai-flow-round-header)
- padding:10px 16px; font-weight:700; font-size:16px
- display:flex; justify-content:space-between; align-items:center; gap:8px
- background: 90deg #e9f1f7 → #dde7ef (dark #323b42 → #2a333a)
- border-bottom:1px solid rgba(0,0,0,.05) (dark #30363d)
- hover filter brightness(.97)
- focus-visible outline 3px solid #ffcc33 (dark #ffd658)
- disclosure chevron pseudo element rotations as previously listed

Turn Header (.ai-flow-turn-header)
- padding:8px 18px; font-weight:600; font-size:16px; gap:10px
- left border:4px solid #b7ccdc (dark #425462)
- background: 90deg #fbfdff → #f0f6fa (dark #2d353b → #262e34)

Turn Body (.ai-flow-turn-body)
- padding:8px 18px 14px; background:#fff (dark #262c31)
- border-left:4px solid #d2e1ec (dark #36444f)
- font-size:14px; line-height:1.45; font-family Arial italic override

Initial Goal Row (.ai-flow-turn-initial-goal-row)
- padding:4px 18px 2px; font-size:12px
- gradient light 90deg #f5f9fd → #edf2f7; dark 90deg #273036 → #20272c
- border-top-color rgba(0,0,0,.04) (dark #30363d)
- display:flex; gap:4px; flex-wrap:wrap; align-items:center

Opening Intent (.ai-flow-opening-intent)
- gradient linear 90deg (various rgba white → transparent)
- font-size:12px; line-height:1.35; padding:6px 10px
- border-left:3px solid #d4c14f; border-radius:4px; font-style:italic
- color:#333 (dark: tinted gradient; color:#ddd)

Goal Timeline (.ai-flow-goal-timeline)
- padding:6px 18px 4px; gap:4px column; margin:8px 0 14px
- border-bottom:1px solid rgba(0,0,0,.08)

Goal Node (.goal-node base)
- padding:4px 8px; border:1px solid #c2a400; border-radius:6px
- background:#fffbe6; font-size:11px; font-weight:600; box-shadow:2px 2px 0 #000
- variants: initial #fff3c2; changed #ffe17a; empty #f1f3f5 (dashed, font-size:10px, color:#8a8f94)
- dark variants: base #3a3518; initial #4a431e; changed #5a5126; empty #2b3238 (#6f7a82 text)

Decision/Confidence Pills
- decision pill: background:#1f262c; color:#ffde72; border:1px solid #2e3a44 (dark background:#2e3942 border #3a4752)
- confidence high/med/low: #1d6f2d / #b38600 / #8b1e1e all color:#fff

Inline Confidence (.ai-flow-confidence-inline)
- margin-left:10px; padding:2px 8px; radius:14px; font-size:10px; background:#d0d7de; font-weight:600; letter-spacing:.4px
- variants high #1d7a33 (#e6f5e9), med #fdd247 (#3a2d00), low #c62828 (#ffe4e4)

Mini Dice (.mini-die.logic-flow-die)
- 24px; radius 5px; font-size:14px; font-weight:600; background:#fff (dark #1f2429)
- border 1px solid #d0d7de (dark #30363d); color:#111 (dark #e6ebf0)
- attack: background:#ffe4d5 border:#ffb491 (dark bg #43230e)
- kept: outline 2px solid #25a244; shadow 0 0 0 2px rgba(37,162,68,.35)
- face-unknown: background:#eee color:#666 font-size:12px border-style:dashed (dark #333 #999)

Released Die (.released-die)
- outline 2px dashed #ffcc33; outline-offset:2px; after badge 'R' small circle (#ffcc33/#222)

Probability Chart Group
- rows gap 8px; label width 90px uppercase .5px tracking opacity .85
- bar wrap height 14px radius 5px background #e4e9f1 (dark #2f3840) overflow hidden max-width 360px
- bar gradient 90deg #4f8df7 → #1b62d1 (dark #3d7fe0 → #619dff) inset outline; delta positive adds green glow; delta negative applies brightness(.85) saturate(.6)
- value cell width 36px text-align right font-size 10px font-weight 600 opacity .85

Tooltip (.ev-breakdown-tip)
- absolute below; background #111; color #eee; padding .4rem .6rem; border 1px solid #333; radius 6px; shadow 0 4px 12px rgba(0,0,0,.4); width 180px; opacity 0; translateY(4px); transition .18s

Narrative Blocks (.ai-flow-narrative, .ai-flow-turn-chain)
- narrative: margin-top:4px; font-size:12px; line-height:1.4; background:#fcfcfd; border:1px solid #dfe3e7; radius 6px; padding:6px 10px; shadow subtle
- turn-chain: margin-top:12px; font-size:11px; background:#eef2f6; border:1px solid #d0d7de; padding:8px 10px; radius 6px

Header Controls (.ai-tree-ctl)
- background:#2d3136; color:#e2e6ea; border:1px solid #444c55; padding:4px 10px; font-size:.65rem; uppercase; letter-spacing:.06em; radius 4px; cursor:pointer; font-weight:600
- hover background:#3a4148; active background:#1452a5 (ring box-shadow 0 0 0 2px rgba(20,82,165,.35)); focus-visible outline 3px solid #ffcc33
- dark variants lighten backgrounds and adjust ring colors (#1d6fd1 etc.)

Concise Mode (.ai-logic-flow-container.concise)
- hide `.ai-flow-section:not(.keep-visible)` and `.ai-flow-sec-h`; reduce `.ai-flow-roll` margin-bottom to .4rem

Typography Normalization
- base weight 400; explicit 700 for headers and labels; narrative/analysis forced 400

Lazy Stub (.ai-flow-round.lazy-stub)
- border-style:dashed; opacity:.75; hover:.95; body collapsed until expansion

### 1.11 Probability Analysis (Alternate Panel Layout Styles)
See raw extraction lines (layout.css 940–1225) – distinct styling used outside main logic flow container.
- refer to Section 3.11 later for normalized spec (already summarized above to avoid duplication)

### 1.12 Thought / Speech Bubbles
Speech bubble (`.speech-bubble` from animations.css)
- background:#fff; border:3px solid #000; radius:20px; padding:10px 15px; font-size:.9em; font-weight:900; text-align:center; margin:10px 0; position:relative
- tail: ::before black triangle (8px) bottom:-15px left:30px; ::after white triangle (6px) bottom:-12px left:32px

### 1.13 Game Log (Dark Mode Additions Only So Far)
- dark mode `.log-entry`: background:rgba(255,255,255,0.05)!important; color:#e0e0e0
- (Light mode base still pending extraction)

### 1.14 Power Card Tabs
Tabs container (.power-card-tabs): absolute left:-20px top:50% translateY(-50%); flex column gap:3px; z-index:10; opacity:1; transition .4s cubic-bezier(.25,.46,.45,.94)
- hover via dashboard: gap:5px; transform translateY(-50%) translateX(-3px)
Tab (.power-card-tab): 35x50px; gradient 135deg #fff→#f8f9fa 50%→#e9ecef; halftone radial pattern 8px grid; border 3px solid #000 (right none); radius 0; flex column center; box-shadow base (0 3px 8px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.9)); transition .4s custom curve; pointer
- expand on dashboard hover: size 40x55px; deeper shadow (0 4px 12px …)
- direct hover: translateX(-5px); shadow 0 6px 16px rgba(0,0,0,.6) inset highlight; background golden gradient (#fff8dc→#ffe082); z-index 15
Preview (.tab-preview): font-size:16px (hover 18px); weight:900; font-family:'Bangers'; margin-bottom:2px; black color; white outline multi; uppercase; transition .3s; hover color #333
Label (.tab-label): font-size:1.2em (hover 11px); same family/weight/shadows; transition .3s; hover color #333

### 1.15 Inline Tokyo Indicator
Name container (.player-name-container): flex column center gap:8px padding-top:5px
Indicator (.tokyo-indicator-inline): font-family 'Bangers'; font-size 1.3em (hover 1.5em); font-weight 900; background var(--monster-color,#ff6b00); color #fff; padding 3px 10px (hover 4px 12px); border 2px solid #000; letter-spacing 1px; uppercase; box-shadows 2px 2px 0 #000, 3px 3px 8px rgba(0,0,0,.5); text-shadow 4-way black; transition font-size .3s, padding .3s

### 1.16 CPU Indicators (Avatar + Inline)
Avatar (.cpu-indicator-avatar): absolute bottom:-8px right:-8px; gradient 135deg #007acc→#0099ff 50%→#33b5ff; color #fff; font-family 'Bangers'; font-size .6em; font-weight 700; padding 2px 4px; radius 8px; border 2px solid #000; text-shadow heavy; box-shadows 2px 2px 0 #000, 3px 3px 8px rgba(0,0,0,.6); letter-spacing .5px; uppercase; min-width 20px; center text; line-height 1; z-index 15
Inline (.cpu-indicator): inline-block; gradient same; padding 2px 6px; radius 8px; border 2px solid #000; margin-left 8px; pattern radial 4px grid; transform perspective(200px) rotateX(-2deg); letter-spacing .5px; box-shadows 2px 2px 0 #000, 3px 3px 8px rgba(0,0,0,.6)

### 1.17 Remaining Targets (Still Pending Extraction / Confirmation)
- Owned cards list container specifics (beyond player stat tile scope)
- Marketplace refresh overlay (distinct from power-card modal overlays)
- Light mode base for `.log-entry`
- Generic `.tab-btn` & other toolbar-like tabs (base.css lines >=269 not yet captured)
- Drag visual states beyond dice/mini-die kept/released markers
- Panel toggle overlays (`responsive.css` panel-toggle-overlay) if part of stable UI set

---
Next: Begin dynamic state mapping & token system definition (Section 2+ forthcoming rewrite: numbering may shift when reorganized). This completes raw value extraction for all currently prioritized elements except the explicitly pending items listed.

## 2. Dynamic State Mapping (Semantic Modifiers)

Purpose: Define a normalized, technology-agnostic set of semantic state classes (BEM-ish or utility-modifier hybrid) that encode behavior/visual deltas without leaking component implementation details. Each state lists only the delta from the neutral (base) component spec. States are composable; conflicts resolved by specificity order (base < variant < state < transient).

### 2.1 State Taxonomy
- Structural / Layout: `.is-collapsed`, `.is-expanded`, `.is-hidden`, `.is-lazy`, `.is-sticky`
- Interactivity / Focus: `.is-hovered` (applied via data attr for forced preview), `.is-focus-visible`, `.is-pressing`
- Selection & Progress: `.is-selected`, `.is-active`, `.is-current`, `.is-kept`, `.is-released`, `.is-disabled`
- Gameplay Context: `.is-in-tokyo-city`, `.is-in-tokyo-bay`, `.is-eliminated`, `.is-turn-owner`, `.is-ai-controlled`
- Intent & Evaluation: `.is-positive`, `.is-negative`, `.is-warning`, `.is-neutral`, `.is-improving`, `.is-degrading`
- Visibility / Filtering: `.is-concise-mode`, `.is-muted`, `.is-faded`
- Async / Loading: `.is-loading`, `.is-updating`, `.is-busy`
- Theming / Mode: `.is-dark`, `.is-alt-theme` (discouraged—prefer root theme switch)
- Motion / Transition: `.will-enter`, `.will-exit`, `.anim-pulse`, `.anim-glow`, `.anim-wiggle`

### 2.2 Component → State Delta Matrix (Representative)
(Format: Component – State → Property Overrides)

Dice (Large Board Dice)
- `.is-hovered`: transform perspective(300px) rotateX(15deg) rotateY(-15deg) translateY(-3px) scale(1.05); border-color:#343a40; box-shadow:0 12px 24px rgba(0,0,0,0.4), inset 0 4px 0 rgba(255,255,255,0.9), inset 0 -4px 0 rgba(0,0,0,0.25), inset 4px 0 0 rgba(255,255,255,0.5), inset -4px 0 0 rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.15)
- `.is-selected`: transform perspective(300px) rotateX(10deg) rotateY(-20deg) translateY(-15px) scale(1.08); box-shadow:4px 4px 0 #000; border-color:#000
- `.is-disabled`: opacity:.3; background:transparent; border:2px dashed #666; color:transparent; cursor:default; box-shadow:none; pointer-events:none

Mini Logic Dice (AI Panel)
- `.is-attack`: background:#ffe4d5; border-color:#ffb491; (dark: background:#43230e)
- `.is-kept`: outline:2px solid #25a244; box-shadow:0 0 0 2px rgba(37,162,68,.35)
- `.is-released`: outline:2px dashed #ffcc33; outline-offset:2px; after badge
- `.is-unknown-face`: background:#eee; color:#666; font-size:12px; border-style:dashed

Power Card Tile
- `.is-hovered`: (future) elevate shadow token `--shadow-lift-2`; subtle translateY(-2px)
- `.is-selected`: outline:3px solid var(--color-focus-ring); transform:translateY(-2px) scale(1.02)
- `.is-disabled`: opacity:.4; filter:saturate(.4) contrast(.8); cursor:not-allowed

Power Card Tab
- `.is-expanded` (dashboard hover context replaces structural hover): width:40px; height:55px; stronger shadow token; (avoid direct selector coupling to parent hover)
- `.is-hovered`: translateX(-5px); background:gradient(var(--grad-tab-hover)); shadow token `--shadow-lift-3`

Player Stat Tile
- `.is-dashboard-expanded`: padding:12px 15px; border-width:3px; box-shadow token escalate
- `.is-hovered`: transform:perspective(300px) rotateX(-2deg) translateY(-2px) scale(1.05); box-shadow stronger; z-index:10
- `.is-disabled`: opacity:.4

Tokyo Slot
- `.is-occupied`: border:4px solid #000; background: var(--monster-slot-bg, currentColor overlay) (exact color from monster palette)
- `.is-highlighted` (active player): add animation `anim-wiggle` + halo shadow token
- `.is-available`: border-style:dashed; opacity:1

Goal Node
- `.is-initial`: background:#fff3c2 (dark:#4a431e)
- `.is-changed`: background:#ffe17a (dark:#5a5126)
- `.is-empty`: background:#f1f3f5; color:#8a8f94; font-size:10px; border-style:dashed
- `.is-pulsing`: animation:pulseGoal .9s ease

Probability Bar Segment
- `.is-delta-positive`: extra glow box-shadow:0 0 4px 1px rgba(37,162,68,.5)
- `.is-delta-negative`: filter:brightness(.85) saturate(.6)

Decision Pill / Confidence
- `.is-high`: background var(--color-confidence-high); color: var(--color-on-confidence-high)
- `.is-med`: background var(--color-confidence-med); color: var(--color-on-confidence-med)
- `.is-low`: background var(--color-confidence-low); color: var(--color-on-confidence-low)

Concise Mode Container
- `.is-concise-mode` on logic flow root: hides sections not flagged `.keep-visible`; reduces roll margin-bottom

CPU Indicators
- `.is-ai-controlled`: append badge element OR ensure CPU badge visible; maybe toggles `visibility:hidden` when absent
- `.is-fading`: transition opacity to 0 with duration token

Action Menu Button
- `.is-hovered`: translateY(-2px); escalate shadow; (retain perspective transforms)
- `.is-disabled`: opacity:.6; cursor:not-allowed; filter:saturate(.6)
- `.is-active`: border-color var(--color-accent-strong); outline:2px solid var(--color-accent-strong-alpha)

Dice Roll Narrative Blocks
- `.is-muted`: opacity:.6; filter:saturate(.7)

Modal / Overlay (generic future)
- `.will-enter`: starting transform/opacity (e.g., translateY(10px); opacity:0)
- `.will-exit`: reverse transform; pointer-events:none

### 2.3 State Naming Conventions
- Use `is-*` for boolean or enumerated states applied to component root.
- Use `has-*` for structural presence (e.g., `.has-goal-changes`, `.has-kept-dice`).
- Use `anim-*` for explicit motion triggers (purely presentational, removable for reduced-motion preference).
- Avoid encoding values in state name (bad: `.probability-75`); compute width via inline style or CSS var set (`--prob-pct`).

### 2.4 Application Strategies
1. JS toggles states only on logical component root nodes; no toggling deep element descendants directly (except ephemeral inline width vars, e.g., probability fill).
2. Derived states (e.g., `.is-muted` due to parent `.is-concise-mode`) resolved via descendant selectors in new system, not manual multi-node toggling.
3. Provide a state contract per component in code comments (ensures additions remain documented).

### 2.5 Conflict Resolution Order
Base Component < Variant (size/theme) < Semantic State (`.is-*`) < Transient/Motion (`.anim-*`, `.will-*`) < Inline style (only geometry/percentage) < Debug/Force Classes (temporary instrumentation layer).

---

## 3. Token System Draft (Foundational Design Layer)

Objective: Centralize all repeating raw values into stable, human-readable CSS Custom Properties. Tokens are layered: Core (color/spacing/typography/motion) → Semantic (intent, status) → Component Aliases.

### 3.1 Token Naming Philosophy
- Format: `--tok-<category>-<name>` for core.
- Semantic/role tokens: `--role-<intent>` (e.g., `--role-danger-bg`).
- Component alias tokens: `--cmp-<component>-<slot>` only where abstraction prevents bloat.
- No raw hex in component rules after migration (except temporary notes). All values flow from tokens.

### 3.2 Core Color Palette (Initial Extraction From Current UI Motifs)
Brand / Accent Core
- `--tok-color-accent-primary: #ffcc33` (yellow highlight / ring)
- `--tok-color-accent-secondary: #ff9800`
- `--tok-color-accent-tertiary: #ffd700`

Neutrals / Surfaces
- `--tok-color-bg-base: #ffffff`
- `--tok-color-bg-alt: #f5f6f8`
- `--tok-color-bg-panel: #f7f9fb`
- `--tok-color-bg-panel-dark: #2b3238`
- `--tok-color-bg-elevated: #fcfcfd`
- `--tok-color-bg-inset: #eef2f6`
- `--tok-color-bg-dark-base: #1f2429`
- `--tok-color-bg-dark-elevated: #262c31`

Borders / Lines
- `--tok-color-border-light: #d0d7de`
- `--tok-color-border-subtle: #e3e7eb`
- `--tok-color-border-strong: #000000`
- `--tok-color-border-accent: #c2a400`

Text / Foreground
- `--tok-color-fg-default: #1f2328`
- `--tok-color-fg-inverse: #ffffff`
- `--tok-color-fg-muted: #666666`
- `--tok-color-fg-subtle: #8a8f94`
- `--tok-color-fg-darkmode: #e6ebf0`

Status / Semantic Intent
- `--tok-color-success: #25a244`
- `--tok-color-warning: #fdd247`
- `--tok-color-danger: #c62828`
- `--tok-color-info: #1452a5`
- `--tok-color-energy: #d4a500`
- `--tok-color-health: #e53935`
- `--tok-color-points: #cc6600`

Probability / Confidence Spectrum
- `--tok-color-confidence-high: #1d7a33`
- `--tok-color-confidence-medium: #b38600`
- `--tok-color-confidence-low: #8b1e1e`

Dice Faces (AI Logic Alt Set)
- `--tok-color-die-attack-bg: #ffe4d5`
- `--tok-color-die-attack-border: #ffb491`
- `--tok-color-die-energy-bg: #DAA520`
- `--tok-color-die-heal-bg: #81C784`
- `--tok-color-die-vp-bg: #BA68C8`

Gradients (Base) – Use semantic wrappers later
- `--tok-grad-panel-round-light: linear-gradient(180deg,#ffffff 0%, #f4f8fb 100%)`
- `--tok-grad-panel-round-dark: linear-gradient(180deg,#2a3137 0%, #222a30 100%)`
- `--tok-grad-prob-bar: linear-gradient(90deg,#4f8df7,#1b62d1)`
- `--tok-grad-prob-bar-dark: linear-gradient(90deg,#3d7fe0,#619dff)`
- `--tok-grad-accent-gold: linear-gradient(90deg,#ffde72,#ffc933)`

Overlays / Halftones (Patterns)
- `--tok-pattern-halftone-fine: radial-gradient(circle at 2px 2px, rgba(0,0,0,0.08) 1px, transparent 0)`
- `--tok-pattern-halftone-medium: radial-gradient(circle at 3px 3px, rgba(0,0,0,0.1) 1px, transparent 0)`
- `--tok-pattern-halftone-bright: radial-gradient(circle at 3px 3px, rgba(255,255,255,0.15) 1px, transparent 0)`

### 3.3 Spacing Scale
Use 4px baseline unit: `--tok-space-1:4px; --tok-space-2:8px; --tok-space-3:12px; --tok-space-4:16px; --tok-space-5:20px; --tok-space-6:24px; --tok-space-8:32px; --tok-space-10:40px`.
Component mapping examples:
- Dice tray padding 15px ≈ `var(--tok-space-4)` minus 1px (round to 16px in migration for even scale).
- Stat tile gaps 8px → `var(--tok-space-2)`.

### 3.4 Typography Tokens
Families
- `--tok-font-display: 'Bangers', cursive`
- `--tok-font-body: system-ui, 'Nunito', sans-serif`
- `--tok-font-mono: ui-monospace, SFMono-Regular, monospace`

Font Sizes (Clamp later)
- `--tok-font-size-xs: 10px`
- `--tok-font-size-sm: 12px`
- `--tok-font-size-base: 14px`
- `--tok-font-size-md: 16px`
- `--tok-font-size-lg: 18px`
- `--tok-font-size-xl: 24px`
- `--tok-font-size-xxl: 32px`
- `--tok-font-size-display: 80px` (header title; will convert to clamp)

Weights
- `--tok-font-weight-regular:400`
- `--tok-font-weight-semibold:600`
- `--tok-font-weight-bold:700`
- `--tok-font-weight-black:900`

Line Heights
- `--tok-line-tight:1.1`
- `--tok-line-normal:1.35`
- `--tok-line-comfort:1.45`

Letter Spacing
- `--tok-letter-tight:-0.5px`
- `--tok-letter-normal:0`
- `--tok-letter-wide:0.5px`
- `--tok-letter-ultra:1px`

### 3.5 Radius Tokens
- `--tok-radius-none:0`
- `--tok-radius-sm:4px`
- `--tok-radius-md:6px`
- `--tok-radius-lg:8px`
- `--tok-radius-round:50%`

### 3.6 Shadow Tokens (Comic Layered Style)
Layered with crisp offset + soft ambient.
- `--tok-shadow-flat: 0 1px 2px rgba(0,0,0,0.06)`
- `--tok-shadow-hard-1: 2px 2px 0 #000`
- `--tok-shadow-hard-2: 4px 4px 0 #000`
- `--tok-shadow-hard-3: 6px 6px 0 #000`
- `--tok-shadow-ambient-1: 6px 6px 15px rgba(0,0,0,0.4)`
- `--tok-shadow-ambient-2: 8px 8px 20px rgba(0,0,0,0.5)`
- `--tok-shadow-focus-ring: 0 0 0 2px rgba(20,82,165,0.35)`
- Composite examples become composition utilities (avoid redefining).

### 3.7 Motion & Timing Tokens
- Durations: `--tok-dur-fast:120ms; --tok-dur-med:250ms; --tok-dur-slow:400ms`
- Easing: `--tok-ease-standard:cubic-bezier(.25,.46,.45,.94); --tok-ease-bounce:cubic-bezier(.68,-0.55,.265,1.55)`
- Transforms (common): `--tok-transform-tilt-small:perspective(400px) rotateX(2deg) rotateZ(-1deg);`

### 3.8 Z-Index Scale (Documented Set → Tokens)
Map existing commentary (layout.css header) into tokens.
- `--tok-z-base: 0`
- `--tok-z-floating: 100`
- `--tok-z-dashboard: 300`
- `--tok-z-tokyo-slots: 350`
- `--tok-z-bottom-table: 4000`
- `--tok-z-pause-overlay: 7000`
- `--tok-z-modal: 8100` (generic) / variants 8200+ for stacked types

### 3.9 Semantic Role Layer
Derive from core palette.
- Success: `--role-success-bg: var(--tok-color-success); --role-success-fg:#e6f5e9`
- Warning: `--role-warning-bg: var(--tok-color-warning); --role-warning-fg:#3a2d00`
- Danger: `--role-danger-bg: var(--tok-color-danger); --role-danger-fg:#ffe4e4`
- Info: `--role-info-bg: var(--tok-color-info); --role-info-fg:#ffffff`
- Confidence High/Med/Low map to role tokens alias for consistency

### 3.10 Component Alias Examples
Dice (Large)
- `--cmp-die-size:60px`
- `--cmp-die-font-size:1.6em`
- `--cmp-die-shadow-static: var(--tok-shadow-hard-2), var(--tok-shadow-ambient-1)`

Power Card Tile
- `--cmp-card-padding: var(--tok-space-5) var(--tok-space-4)`
- `--cmp-card-border:3px solid var(--tok-color-border-strong)`

Probability Bar
- `--cmp-prob-height:14px`
- `--cmp-prob-radius:5px`

### 3.11 Migration Phasing for Tokens
1. Introduce `tokens.css` with root layer variables only (no component rewrites). Verify no regressions (unused yet).
2. Replace hard-coded values in one pilot component (dice) using alias tokens while dual-defining fallback: `color: var(--tok-color-fg-default,#1f2328)`.
3. Add dark mode overrides under `body.dark-mode` token adjustments only (no component dark selectors).
4. Expand to high-change components (AI logic flow) after pilot validation.
5. Remove duplicate raw values; run linter script to detect stray hex.

### 3.12 Lint / Enforcement Ideas
- Build a simple Node script scanning CSS for forbidden patterns (regex on hex codes) excluding tokens file.
- CI warning (not fail) until 90% migration threshold reached.

---

## 4. Baseline Component Specs (Batch 1)

Format: Component → Structure, Base Style (tokenized), Slots, States (deltas), Accessibility notes.

### 4.1 Dice (Primary Board Dice)
Structure
- Root: `.cmp-die` (new) replacing ad-hoc die selectors.
- Face value content inside root (text only).

Base Style (Tokenized)
```
.cmp-die {
  --die-size: var(--cmp-die-size,60px);
  width: var(--die-size);
  height: var(--die-size);
  display: inline-flex;
  justify-content: center;
  align-items: center;
  font-family: var(--tok-font-display);
  font-size: var(--cmp-die-font-size,1.6em);
  font-weight: var(--tok-font-weight-black);
  background: var(--die-bg, linear-gradient(135deg,#ffffff 0%,#f8f8f8 50%,#eeeeee 100%));
  background-image: var(--tok-pattern-halftone-fine), var(--die-bg);
  background-size: 8px 8px, 100% 100%;
  color: var(--tok-color-fg-default);
  border: 4px solid var(--tok-color-border-strong);
  border-radius: var(--tok-radius-none);
  box-shadow: var(--tok-shadow-hard-2), var(--tok-shadow-ambient-1);
  cursor: pointer;
  transition: transform var(--tok-dur-slow) var(--tok-ease-bounce), box-shadow var(--tok-dur-med) var(--tok-ease-standard), border-color var(--tok-dur-med) var(--tok-ease-standard);
  transform: var(--tok-transform-tilt-small) rotateY(-2deg) rotateX(5deg);
}
```

States (Deltas)
- `.is-hovered`: elevate + 3D tilt, border-color dark neutral, enlarge scale per existing spec.
- `.is-selected`: stronger lift, translateY(-15px), scale 1.08, simplified shadow stack.
- `.is-disabled`: opacity .3; remove shadow; dashed border; pointer-events none.

Accessibility
- Ensure `role="img"` or `aria-label="Die shows X"` for screen readers.
- Focus-visible ring using global focus token: outline:2px solid var(--tok-color-accent-primary).

### 4.2 Power Card Tile
Structure
- `.cmp-card` root.
- Slots: header (`.cmp-card__name`), body (`.cmp-card__desc`), cost badge (`.cmp-card__cost`).

Base Style
```
.cmp-card {
  padding: var(--cmp-card-padding, var(--tok-space-5) var(--tok-space-4));
  display:flex; flex-direction:column; justify-content:space-between;
  border: var(--cmp-card-border,3px solid var(--tok-color-border-strong));
  background: var(--cmp-card-bg, #663399);
  background-image: var(--tok-pattern-halftone-fine);
  box-shadow: var(--tok-shadow-hard-2);
  font-family: var(--tok-font-display);
  letter-spacing: .5px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform var(--tok-dur-slow) var(--tok-ease-bounce), box-shadow var(--tok-dur-med) var(--tok-ease-standard);
  transform: perspective(300px) rotateX(2deg) rotateY(-1deg) rotateZ(.5deg);
}
```

Slots
```
.cmp-card__name, .cmp-card__desc {
  background: linear-gradient(135deg,#fff8dc 0%, #f5deb3 100%);
  padding: var(--tok-space-2) var(--tok-space-3);
  border: 2px solid var(--tok-color-border-strong);
  font-size: var(--tok-font-size-base);
  color: var(--tok-color-fg-default);
}
.cmp-card__name { font-weight: var(--tok-font-weight-semibold); }
.cmp-card__cost {
  position:absolute; bottom: var(--tok-space-2); right: var(--tok-space-3);
  min-width:44px; height:38px; display:flex; align-items:center; justify-content:center;
  font-size:1.3em; background: linear-gradient(135deg,#ffd700 0%, #ffb300 100%);
  border:2px solid var(--tok-color-border-strong); box-shadow: var(--tok-shadow-hard-1);
  font-family: var(--tok-font-display);
}
```

States
- `.is-hovered`: translateY(-2px); box-shadow escalate to `var(--tok-shadow-hard-3)` plus ambient.
- `.is-selected`: outline 3px solid var(--tok-color-accent-primary); scale 1.02.
- `.is-disabled`: opacity:.4; filter saturate(.4) contrast(.85); cursor not-allowed.

### 4.3 Player Stat Tile
Structure
- `.cmp-stat` root.
- Slots: label `.cmp-stat__label`, value `.cmp-stat__value`.

Base Style
```
.cmp-stat {
  background: linear-gradient(135deg,#ffffff 0%, #f8f9fa 100%);
  background-image: var(--tok-pattern-halftone-fine), linear-gradient(135deg,#ffffff 0%, #f8f9fa 100%);
  padding: var(--tok-space-2) var(--tok-space-3);
  border:2px solid var(--tok-color-border-strong);
  box-shadow: var(--tok-shadow-hard-1), var(--tok-shadow-ambient-1);
  font-family: var(--tok-font-display);
  transition: all var(--tok-dur-slow) var(--tok-ease-standard);
  transform: perspective(300px) rotateX(2deg) rotateZ(.5deg);
}
.cmp-stat__label {
  font-size: .6em; font-weight: var(--tok-font-weight-black);
  text-transform: uppercase; letter-spacing: 1px; margin-bottom:2px;
  text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;
}
.cmp-stat__value {
  font-size:1.2em; font-weight: var(--tok-font-weight-black);
  letter-spacing:1px; color: var(--tok-color-fg-default);
  text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff,2px 2px 4px rgba(0,0,0,0.6);
  transition: font-size var(--tok-dur-med) var(--tok-ease-standard);
}
```

States
- `.is-dashboard-expanded`: padding increases to var(--tok-space-3) var(--tok-space-4); border-width:3px; elevate shadow to `var(--tok-shadow-hard-2)`.
- `.is-hovered`: transform rotateX(-2deg) translateY(-2px) scale(1.05); shadow escalate to hard-2 + ambient-2.
- `.is-disabled`: opacity .4.

Value Type Modifiers
- `.cmp-stat--health .cmp-stat__value`: color var(--tok-color-health)
- `.cmp-stat--energy .cmp-stat__value`: color var(--tok-color-energy)
- `.cmp-stat--points .cmp-stat__value`: color var(--tok-color-points)

Accessibility
- Provide `aria-label` summarizing stat (e.g., `Health: 7 of 10`).

---

## 5. File Decomposition & Folder Architecture

Goal: Introduce new stylesheet hierarchy without breaking legacy selectors. We stage files side-by-side; gradually move components into new layer while leaving a shrinking legacy bundle.

Proposed Structure
```
css/
  legacy/                (existing untouched files moved here in Phase 1 freeze)
    base.css
    layout.css
    dice.css
    cards.css
    monsters.css
    game-areas.css
    animations.css
    responsive.css
    ai-logic-flow.css
  design-system/
    tokens.css           (core + semantic tokens; dark mode overrides appended)
    primitives.css       (reset / base element defaults / typography normalizer)
    utilities.css        (low-level: display, spacing, flex, text truncation)
    motions.css          (keyframes + motion utility classes `.anim-*`)
    accessibility.css    (focus rings, visually-hidden helpers)
  components/
    cmp-die.css
    cmp-card.css
    cmp-stat.css
    cmp-tabs.css
    cmp-tokyo-slot.css
    cmp-indicators.css
    cmp-action-menu.css
    cmp-logic-flow.css   (refactored AI panel; may be multiple partials)
  states/
    state-maps.css       (global `.is-*` selectors composed with component roots)
  bundles/
    app-modern.css       (ordered @imports of new system + legacy fallback)
```

Load Order (ideal)
1. `tokens.css`
2. `primitives.css`
3. `utilities.css`
4. `motions.css`
5. component files (alphabetical or dependency-sorted)
6. `state-maps.css`
7. `legacy/*.css` (LAST so legacy can still win where needed during migration; later reversed)

Rationale
- Keeps legacy intact (no early edits) — we redirect `<link>` to new `bundles/app-modern.css` which composes both layers.
- Minimizes cascade surprises: tokens + primitives define foundations, components layered, then states.
- Clear diff boundaries for PR reviews (e.g., `cmp-die.css` independent).

Incremental Relocation Strategy
Phase A: Create `design-system` + `bundles/app-modern.css` referencing legacy unchanged.
Phase B: Add tokens; pilot `cmp-die.css` with new `.cmp-die` class applied in JS alongside old class (dual-class technique). Legacy selectors still match — zero regression risk.
Phase C: Convert 2–3 more components (stat tile, power card). Begin removing overlapping declarations from legacy via targeted comment markers (e.g., `/* MIGRATED: die */`).
Phase D: Migrate AI logic flow (largest cluster) after token maturity.
Phase E: Flip order so legacy loads BEFORE new system; remove dead rules after visual diff pass.

Tooling Enhancements
- Script to scan for unused legacy selectors once component fully migrated (compare DOM + new markup + legacy CSS).
- Visual regression harness (optionally Puppeteer) capturing key states for dice, power cards, tokyo occupancy.

Naming Conventions Within Components
- Root: `.cmp-<name>` (no variant).
- Variants: `.cmp-<name>--<variant>` (size, theme).
- Slots: `.cmp-<name>__<slot>`.
- States: appended via separate class `.is-*` (never BEM state appended to root class to keep toggling simple).

Avoid
- Deep descendant chains crossing component boundaries.
- Overwriting token values inside components (set local CSS vars at root if needed).

---
## 6. Class Architecture & Naming Conventions

### 6.1 Categories
1. Component Roots: `.cmp-*` (scoped, no styling leakage outside)  
2. Component Slots: `.cmp-<name>__<slot>`  
3. Variants: `.cmp-<name>--<variant>` (purely structural/visual alternative)  
4. States: `.is-*` (orthogonal; applied to root or container)  
5. Utilities (if needed): `.u-*` (single responsibility)  
6. Layout wrappers: `.l-*` (grid/flex scaffolding only)  
7. Motion: `.anim-*` (keyframe triggers)  
8. Theme / Mode data attr: `[data-theme="dark"]` (prefer attribute at root over class)  

### 6.2 Do / Don't
Do:
- Keep selectors shallow: `.cmp-card__cost` not `.player-dashboard .cmp-card .cost-badge`.
- Use tokens for values, not raw hex.
- Use semantic deltas: `.is-selected` instead of `.selected-card`.
Don't:
- Chain component roots (`.cmp-card.cmp-die`).
- Encode color names in variant (`--gold-version`) — use semantic variant `.cmp-card--premium` + tokens.
- Use location-based names (`left-panel-button`).

### 6.3 Specificity Strategy
- All component root declarations single-class specificity.
- States never rely on element selectors to override; they appear after component files or use separate `state-maps.css`.
- Avoid `!important`; final resort only for temporal legacy conflict bridging (mark with `/* TEMP IMPORTANT */`).

### 6.4 Example Mapping
Legacy `.rolls-indicator` → New `.cmp-die-rolls-indicator cmp-indicator` (decide final taxonomy). For initial pass keep alias: `<div class="rolls-indicator cmp-indicator">` then remove legacy after migration.

### 6.5 Responsive Strategy
- Use container queries later (Phase 3) instead of scattering media queries across many files.
- Interim: co-locate media queries WITH component file (not global responsive file) using min features (e.g., `@media (max-width: 640px)` distilled).

### 6.6 Dark Mode
- Apply as token overrides in `body.dark-mode` or `[data-theme="dark"] :root` layer.
- No component-level dark selectors once migrated (they consume token colors only).

### 6.7 Data Attributes Option (Later)
For dynamic state requiring parameters (e.g., probability percent), store as CSS var via inline style `style="--prob-pct:72%"` and use `.cmp-prob-bar { width: var(--prob-pct); }` instead of generating classes.

---

## 7. Migration Phases (Incremental Execution Plan)

Phase 0 – Inventory & Strategy (DONE)
- Capture raw values, states, tokens draft.

Phase 1 – Scaffolding
- Add `design-system/tokens.css` (no usage yet).
- Add `bundles/app-modern.css` that imports only tokens + legacy bundle (visual parity).
- Wire HTML to load `app-modern.css` instead of individual legacy links (if multiple, preserve order inside bundle).

Phase 2 – Pilot Component (Dice)
- Create `cmp-die.css` implementing `.cmp-die` using tokens.
- JS: Add `.cmp-die` class alongside existing dice class name(s) (dual-class mode).
- Visual compare: Ensure no shift. Add focus-visible style.
- Add CSS var fallbacks for tokens to avoid FOUC.

Phase 3 – Stats & Power Cards
- Implement `cmp-stat.css`, `cmp-card.css` plus `.cmp-card__*` slots.
- Update DOM generation functions to add new classes – do NOT remove old yet.
- Insert deprecation comments in legacy files around moved blocks (`/* MIGRATED: stat tile */`).

Phase 4 – Tabs & Indicators
- Migrate power card tabs, Tokyo inline indicator, CPU badges into `cmp-tabs.css`, `cmp-indicators.css`.
- Introduce semantic states for hover/expanded independent of parent hover chain.

Phase 5 – AI Logic Flow Refactor
- Split monolith: `cmp-logic-flow.css` + partials (goal timeline, probability, dice micro, narrative) if desired.
- Replace heading/round/turn/roll styling with tokenized versions.
- Remove dark-mode component selectors in favor of token overrides.

Phase 6 – State Layer Consolidation
- Create `states/state-maps.css` mapping `.is-*` to component overrides.
- Strip state-specific selectors from component files to reduce duplication.

Phase 7 – Dark Mode Tokenization
- Move all `body.dark-mode` component color overrides into `tokens.css` dark section.
- Keep only structural differences (if any) in components.

Phase 8 – Legacy Order Flip
- Load legacy BEFORE new system in bundle.
- Identify specificity collisions; patch with minimal `.cmp-*` rule consolidation.
- Run unused selector scan; mark candidates for deletion.

Phase 9 – Deletion Wave 1
- Remove migrated dice/stat/card legacy rules.
- Re-test across screen sizes.

Phase 10 – AI Flow & Tabs Legacy Removal
- Remove AI logic flow old file (or collapse to stub referencing new) after parity check.

Phase 11 – Responsive Re-homing
- Move responsive rules from `responsive.css` into respective component files.
- Phase out central responsive file (leave polyfill for leftover legacy parts until removed).

Phase 12 – Audit & Cleanup
- Hex color linter passes (<10% stray) → convert remaining.
- Remove temporary dual classes from DOM (strip old class names via JS pass).

Phase 13 – Documentation & Lock-in
- Generate final design system README summarizing tokens, components, states.
- Tag repository release `vDesignSystem-1.0`.

Rollback Strategy
- At each phase, a single `<link rel="stylesheet" href="legacy-bundle.css">` fallback path is retained. If regressions emerge, disable new imports.

Success Metrics
- Decrease duplicated gradient/shadow declarations by ≥70%.
- All color overrides rely on tokens (no raw hex in component CSS except comments).
- Removal of at least 60% legacy file size without visual regressions.

---
## 8. Risk Mitigation & Verification Strategy

Risk Categories
1. Visual Regression (layout shifts, color mismatches, spacing drift)
2. Interaction Breakage (hover/focus/drag/state toggles)
3. Performance Regressions (extra repaint/reflow, selector cost)
4. Dark Mode Parity Gaps
5. Specificity & Cascade Conflicts
6. Partial Migration Inconsistency (dual-class divergence)
7. Accessibility Regressions (contrast, focus visibility, semantics)

Controls & Tactics
- Dual-Class Bridging: Maintain legacy + new `.cmp-*` until visual QA passes.
- Token Fallbacks: Provide hard-coded fallback values after each var: `color: var(--color-accent-1, #4f8df7);` to prevent blank rendering while introducing tokens.
- Scoped Introduction: One component family per phase to contain blast radius.
- Deterministic Load Order: Always load legacy before new system after Phase 8 flip.
- Specificity Budget: All component selectors: single class only (no IDs, no descendant chains) except explicit compound state: `.cmp-card.is-selected`.
- Lint Gates: CI fails if > N raw hex codes (threshold decremented per milestone) or if forbidden patterns (e.g., gradient inline duplicates) appear.
- Visual Snapshot Baseline: Capture PNGs of key screens (landing, mid-turn rolling, card purchase, AI logic panel expanded, dark mode) BEFORE first migration commit.
- Diff Threshold: Accept pixel diff < 0.5% per screen; otherwise rollback phase commit.
- Regression Tags: Each phase merged under a Git tag enabling quick checkout rollback.
- Canary Toggle: Optional data-attr on `<body data-design-system="off">` disables injecting new component classes (JS guard) for emergency fallback.
- Accessibility Audit: After each phase, run contrast check script against tokens vs backgrounds; verify focus outline presence.

Verification Checklist Per Phase
1. Visual: Compare component(s) across light/dark, hover, selected, disabled.
2. Interaction: Test keyboard focus cycle, click, drag (if applicable), state transitions.
3. Performance: Measure style recalculation count in DevTools (should not increase >5% for interaction scenarios).
4. DOM Diff: Ensure no additional wrapper elements added unless documented.
5. Spec Compliance: Component matches defined baseline spec tokens (no stray values).
6. Lint: Hex threshold, no `!important`, no ID selectors.
7. Accessibility: Min contrast 4.5:1 for text < 18px; 3:1 for large icons & non-text.

Tooling Roadmap
- `scripts/style-audit.mjs`: Parses CSS for raw color & gradient duplicates.
- `scripts/contrast-scan.mjs`: Iterates computed styles, logs violations.
- `scripts/screenshot.js`: Puppeteer page matrix capture (light/dark, width breakpoints).
- `scripts/pixel-diff.mjs`: Compares new vs baseline images (pixelmatch or resemblejs API) with JSON report.

Rollback Procedure
1. Identify failing verification dimension (visual/perf/accessibility).
2. Revert component CSS file to prior tag (git checkout tag). Re-run snapshot for confirmation.
3. Open issue labelled `migration-regression` with diff artifacts & root cause hypothesis.
4. Patch & reattempt within same phase; do not advance phases with open regressions.

Issue Taxonomy Labels
- `phase-blocker` – prevents progression.
- `spec-drift` – implemented styles deviate from baseline spec tokens.
- `token-gap` – missing semantic token forced raw value usage.
- `dark-mode-drift` – light/dark parity difference not intentional.
- `accessibility-fail` – contrast/focus or semantics regression.

KPIs & Targets
- Duplicate gradient definitions reduced to ≤2 (one light, one dark or variable-driven) by Phase 9.
- ≤5 raw hex occurrences (excluding token declarations) by Phase 12.
- 0 contrast violations in audited key screens by Phase 12.
- CSS bundle size reduction ≥30% by Phase 13 (gzipped) relative to pre-migration.

Open Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Over-abstraction of tokens early | Freeze token additions after Phase 5 except with `token-gap` issue reference |
| Developer drift (adding legacy styles) | Pre-commit hook blocking edits to legacy zones without `@legacy-allow` comment |
| Unnoticed mobile breakage | Include 320px / 414px snapshots in baseline matrix |
| State style collision | Centralize state overrides in Phase 6 to single file |
| Dark mode edge-case | Dark tokens tested against both background gradients & solid fallback |

Escalation Path
- Phase owner raises blocker via issue + Slack alert (if integrated) within 1 hour of detection.
- Decision triage: proceed, patch, or rollback within 24 hours.

Exit Criteria
- All KPIs met or formally waived with documented rationale.
- Legacy selectors for migrated components fully removed.
- Design system README published & referenced in CONTRIBUTING.

---
## 9. Baseline Component Specs (Batch 2)

### 9.1 Tabs (`.cmp-tabs` / `.cmp-tab`)
Role: Switch contextual panel (e.g., power card categories).
Structure:
```
<div class="cmp-tabs" role="tablist">
  <button class="cmp-tab is-active" role="tab" aria-selected="true">All</button>
  <button class="cmp-tab" role="tab" aria-selected="false">Keep</button>
</div>
```
Token Mapping:
- Height: var(--size-tab-height, 42px)
- Font: var(--font-label)
- Active Gradient: var(--gradient-accent-active)
- Inactive Background: var(--color-surface-raised)
- Border Radius: var(--radius-pill)
- Focus Outline: var(--outline-focus)
- Transition: var(--motion-fast) ease var(--easing-standard)
States:
- `.is-active`: elevated shadow, accent gradient, text color var(--color-text-on-accent)
- `:hover`: subtle background tint var(--color-surface-hover)
- `:disabled`: opacity .4, pointer-events none
Spec (illustrative):
```
.cmp-tab { inline-size: auto; min-inline-size: 4.5rem; block-size: var(--size-tab-height); padding: 0 var(--space-3); background: var(--color-surface-raised); border: 0; border-radius: var(--radius-pill); font: var(--font-label); color: var(--color-text-secondary); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); position: relative; transition: background var(--motion-fast), color var(--motion-fast), box-shadow var(--motion-fast); }
.cmp-tab:hover { background: var(--color-surface-hover); }
.cmp-tab.is-active { background: var(--gradient-accent-active); color: var(--color-text-on-accent); box-shadow: var(--shadow-focus-ring), var(--shadow-raised); }
.cmp-tab:focus-visible { outline: var(--outline-focus); outline-offset: 2px; }
.cmp-tab:disabled { opacity: .4; cursor: default; }
```
Delta Summary:
- active: gradient + raised shadow + color swap
- hover (inactive only): surface tint
- disabled: opacity reduction

### 9.2 Indicators (`.cmp-indicator` & variants)
Includes inline Tokyo presence badge, CPU avatar badge.
Structure:
```
<span class="cmp-indicator cmp-indicator--tokyo is-pulsing">Tokyo</span>
```
Tokens:
- Font Size: var(--font-size-2)
- Padding: var(--space-1) var(--space-3)
- Radius: var(--radius-pill)
- Default Background: var(--color-surface-raised-alt)
- Tokyo Active Gradient: var(--gradient-danger-active) or dedicated var(--gradient-tokyo)
- CPU Badge Gradient: var(--gradient-info-active)
- Pulse Animation: var(--anim-pulse)
Spec Snippet:
```
.cmp-indicator { display: inline-flex; align-items: center; gap: var(--space-1); padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill); font: var(--font-micro); line-height: 1; background: var(--color-surface-raised-alt); color: var(--color-text-secondary); position: relative; }
.cmp-indicator--tokyo.is-active { background: var(--gradient-tokyo); color: var(--color-text-on-accent); box-shadow: var(--shadow-glow-accent); }
.cmp-indicator--cpu { background: var(--gradient-info-active); color: var(--color-text-on-accent); }
.cmp-indicator.is-pulsing { animation: var(--anim-pulse); }
```
States:
- `.is-active`: gradient + glow
- `.is-pulsing`: animation
- variant modifiers via BEM-style suffix `--tokyo`, `--cpu`

### 9.3 Logic Flow Composite (`.cmp-logic`)
Collective container for AI decision/turn/roll panels.
Sub-Components:
- `.cmp-logic__timeline`
- `.cmp-logic__goal-node`
- `.cmp-logic__probability`
- `.cmp-logic__narrative`
- `.cmp-logic__controls`
Tokens:
- Panel Background: var(--color-surface-panel)
- Goal Node Default: var(--color-surface-goal) / Alt: var(--color-surface-goal-alt)
- Node Border: var(--border-subtle)
- Probability Positive: var(--color-positive)
- Probability Negative: var(--color-negative)
- Confidence High: var(--color-accent-2)
Layout:
```
<div class="cmp-logic">
  <div class="cmp-logic__timeline">...</div>
  <section class="cmp-logic__probability">...</section>
  <aside class="cmp-logic__narrative">...</aside>
</div>
```
Spec Excerpt:
```
.cmp-logic { display: grid; gap: var(--space-6); grid-template-columns: minmax(0,1fr) 320px; align-items: start; }
.cmp-logic__timeline { display: flex; gap: var(--space-4); flex-wrap: wrap; }
.cmp-logic__goal-node { background: var(--color-surface-goal); border: var(--border-subtle); border-radius: var(--radius-m); padding: var(--space-3) var(--space-4); box-shadow: var(--shadow-subtle); position: relative; min-inline-size: 160px; }
.cmp-logic__goal-node.is-focus { outline: var(--outline-focus); outline-offset: 2px; }
.cmp-logic__goal-node.is-achieved { background: var(--color-surface-goal-alt); box-shadow: var(--shadow-raised); }
.cmp-logic__goal-node.is-priority { border-color: var(--color-accent-1); box-shadow: var(--shadow-focus-ring); }
.cmp-logic__probability { background: var(--color-surface-raised); padding: var(--space-4); border-radius: var(--radius-l); box-shadow: var(--shadow-raised); }
.cmp-logic__narrative { font: var(--font-body-s); line-height: 1.4; color: var(--color-text-secondary); }
```
States:
- Node `.is-achieved`: alt background + elevation
- Node `.is-priority`: accent border + focus ring
- Container `.is-concise`: reduces padding/gap (handled by adding concise variant class at root)

### 9.4 Probability Bars (`.cmp-probbar`)
Represents chance distribution & evaluation.
Structure:
```
<div class="cmp-probbar" aria-label="Energy gain probability 35%">
  <div class="cmp-probbar__fill" style="--_value:35%"></div>
  <span class="cmp-probbar__value">35%</span>
</div>
```
Design:
- Height: var(--size-probbar-height, 12px)
- Width: fluid 100%
- Background Track: var(--color-surface-subtle)
- Fill Gradient (default): var(--gradient-info-active)
- Fill (positive/high confidence): var(--gradient-success-active)
- Fill (negative/low confidence): var(--gradient-danger-active)
Tokens:
- Transition: var(--motion-medium) ease var(--easing-emphasis)
Spec:
```
.cmp-probbar { position: relative; inline-size: 100%; block-size: var(--size-probbar-height); background: var(--color-surface-subtle); border-radius: var(--radius-pill); overflow: hidden; }
.cmp-probbar__fill { position: absolute; inset-block: 0; inset-inline-start: 0; inline-size: var(--_value); background: var(--gradient-info-active); transition: inline-size var(--motion-medium) var(--easing-emphasis), background var(--motion-fast); }
.cmp-probbar.is-positive .cmp-probbar__fill { background: var(--gradient-success-active); }
.cmp-probbar.is-negative .cmp-probbar__fill { background: var(--gradient-danger-active); }
.cmp-probbar__value { position: absolute; inset-inline-end: var(--space-2); inset-block-start: 50%; transform: translateY(-50%); font: var(--font-micro); color: var(--color-text-on-accent); text-shadow: var(--shadow-contrast-text); }
```
States:
- `.is-positive` / `.is-negative` swap gradient token
- Potential future `.is-pending` with patterned stripe animation

Delta Focus (Batch 2 Components)
| Component | Core Delta States | Primary Tokens Leveraged |
|-----------|------------------|---------------------------|
| Tabs | active, hover, disabled | gradient-accent-active, surface-hover, shadow-raised |
| Indicators | active, pulsing, variant | gradient-tokyo, gradient-info-active, anim-pulse |
| Logic Flow | achieved, priority, concise | surface-goal, surface-goal-alt, outline-focus |
| Probability Bars | positive, negative | gradient-success-active, gradient-danger-active |

Accessibility Considerations
- Tabs: `role=tablist` + `aria-selected`, keyboard arrow navigation (implementation note).
- Indicators: Provide `aria-live=polite` for pulsing Tokyo status if dynamic.
- Logic Nodes: Use `aria-pressed` or `aria-current` where representing current target.
- Probability Bars: Always include textual percentage; consider `aria-valuenow` if implementing as `role=progressbar`.

Migration Notes
- Legacy selectors for tabs & indicators often rely on nested descendants; flatten under single-class definitions to enforce new specificity budget.
- Probability fill currently gradient-coded; replace raw gradient with single token reference enabling dark mode swap.
- Logic flow compact/concise mode previously cascaded via container class; preserve pattern but rename to `.is-concise` for consistency.

---
## 10. Remaining Inventory Extraction (Pending Targets)

### 10.1 Owned Cards List (Player Dashboard)
Observed (legacy selectors approximation):
- Container likely flex column; gap ~8–12px.
- Each owned card miniature inherits full card styling scaled down (transform scale ~0.75 or explicit width ~140px vs full 180px).
- Cost badge often removed or reduced opacity (e.g., opacity: 0.5) once purchased.
- Potential highlight ring when newly acquired (short-lived glow or border pulse).
Raw Value Assumptions to Validate:
- Mini card width: 140px; padding scales proportionally (8px vs 12px base)
- Gap: 8px (var(--space-2))
- Transition: box-shadow .25s ease
Pending Verification Action: Confirm exact widths & scaling factors in legacy CSS / inline styles (not yet isolated in earlier searches).

### 10.2 Marketplace Refresh Overlay
Behavior:
- Appears during card marketplace refresh (shuffle / new draw) blocking interaction.
- Semi-transparent dark scrim above card area only (not full screen).
Hypothesized Raw Values:
- Background: rgba(0,0,0,0.55)
- Backdrop Filter (if any): none or blur(2px) – not previously seen; assume none.
- Z-Index: Slightly above cards but below global modals (~ maybe 60 if modal ~100+).
- Spinner or text centered with flexbox: `display:flex; align-items:center; justify-content:center;`
Tokens Mapping Proposal:
- Overlay Color: var(--overlay-market, rgba(0,0,0,0.55))
- Z: var(--z-overlay-secondary)
Action: Extract actual overlay implementation (search for 'refresh' 'market' 'overlay').

### 10.3 Light Mode Log Entry Baseline
Earlier dark mode recorded: background rgba(255,255,255,0.05)
Light mode likely defaults:
- Background: transparent or subtle tinted surface (e.g., rgba(0,0,0,0.04))
- Border-left (if emphasis): accent color when important events (e.g., damage, purchase) – to unify later with `.is-event-*` states.
Spec Placeholder:
```
.log-entry { padding: 6px 10px; font: var(--font-body-xs); line-height: 1.4; color: var(--color-text-secondary); border-radius: var(--radius-s); }
.log-entry--emphasis { background: var(--color-surface-subtle); border-left: 3px solid var(--color-accent-1); padding-left: calc(10px - 3px + var(--space-2)); }
```
Migration Intention:
- Promote `.log-entry` to `.cmp-log` component family.
- Introduce `.is-emphasis`, `.is-warning`, `.is-critical` semantic variants mapping to tokens.

### 10.4 Data Gaps & Validation Tasks
| Area | Gap | Validation Step |
|------|-----|-----------------|
| Owned card mini width | Exact pixel value | Inspect element & record width + padding |
| Marketplace overlay color | Confirm rgba & presence of blur | Search CSS & runtime style injection |
| Marketplace overlay z-index | Numeric value | Cross-reference with modal & card panel indices |
| Light mode log bg | Actual color or none | Inspect computed style for first non-dark-mode log entry |
| New card acquisition highlight | Actual effect (glow vs border) | Observe DOM mutation sequence during purchase |

### 10.5 Interim Strategy
Proceed with migration of already fully specified components first. Defer creation of `.cmp-owned-card-list` & `.cmp-market-overlay` until verified raw values are captured to avoid speculative token creation that might require churn.

Placeholder Tokens (Tentative – not final until validation)
```
:root {
  --overlay-market: rgba(0,0,0,0.55);
  --color-log-emphasis-bg: var(--color-surface-subtle);
  --color-log-critical-bg: var(--color-danger-weak);
}
```
These remain commented or segregated in a `/* @provisional */` block until confirmed.

Exit Condition for This Section
- All gaps resolved with concrete raw values OR tracked as issues labeled `inventory-gap` before Phase 2 begins.

## 12. Final Summary & Immediate Next Steps

Plan Completeness Status
- Inventory: Complete for all primary + pending documented placeholders.
- Tokens: Draft comprehensive; pending validation during Phase 2+ for unused/overlapping.
- Component Specs: Core + batch 2 complete; owned card list & market overlay queued post-validation.
- States: Normalized `.is-*` taxonomy with delta guidance.
- Migration Phases: Sequenced with rollback, metrics, KPIs.
- Risk & Verification: Tooling roadmap + gating criteria defined.
- Appendices: Glossary, lint patterns, dark mode skeleton, future enhancements captured.

Readiness Gate: PASS – Implementation can begin with Phase 1 scaffolding.

Immediate Action Checklist (Pre-Phase 1)
1. Create `design-system/` directory with placeholder `tokens.css` (scaffold root variables + dark media query skeleton).
2. Add `bundles/app-modern.css` that imports `tokens.css` then existing legacy CSS bundle order.
3. Swap `<link>` in `index.html` to single modern bundle (maintain legacy internal order).
4. Add pre-commit lint script stub (even if returning success initially) to establish hook path.
5. Tag repo `pre-migration-baseline`.
6. Capture baseline screenshots (manual or scripted placeholder) & store under `visual-baseline/`.

Phase 2 (Dice Pilot) Preview Tasks
- Implement `.cmp-die` base + state classes without removing legacy dice class.
- Introduce root token subset actually used by dice to reduce noise (avoid premature token sprawl).
- Add quick comparison overlay dev tool (JS toggle adding outline to both legacy and new dice boxes for alignment checking).

Cross-Cutting Guidelines
- Avoid adding unused tokens—introduce when first consumer implemented.
- When conflicting legacy specificity encountered, prefer relocating rule into component file rather than raising specificity.
- Any new gradient must become a token; no inline gradient strings post Phase 3.

Open Questions (Tracked as Issues if Needed)
- Final naming for goal node alt backgrounds (`--color-surface-goal-alt` vs semantic outcome label?).
- Whether to unify glow shadows into a parametric token pattern (e.g., `--shadow-glow(color,spread)` future custom property syntax not yet standard).
- Confirm performance impact of multiple layered gradients in dark mode (may require simplification).

Deferments
- Container query adoption postponed until after full legacy removal (Phase 13+ backlog).
- Advanced theming variants (retro, density) deferred until baseline stability proven.

Success Confirmation Criteria
- By end of Phase 3: Dice + stats + power cards fully tokenized, zero pixel diff >0.5% across their segments.
- By end of Phase 6: All state styles consolidated (no residual state logic in component files except structural exceptions).
- By end of Phase 9: Hex usage outside tokens <=25.
- Final: All KPIs (Section 8) met; legacy CSS size reduction target achieved.

Next Step Owner Actions (Assuming Single Maintainer)
1. Execute Immediate Action Checklist.
2. Open issue: `Phase 2 – Dice Pilot` referencing spec sections 4.1 & 8 gating.
3. Begin implementation branch `feature/ds-phase-1` -> PR with scaffolding only.

Closure
This document is now the authoritative guide for the incremental design system & theme migration. Future deviations require annotation in a `CHANGE_LOG` section or dedicated issue cross-referencing impacted spec paragraphs.

---
## 13. Component Mapping & JS Integration

Purpose: Provide a bidirectional lookup so implementers can (a) add dual-class bridging safely and (b) refactor JS selectors & event handlers from legacy class names to new `.cmp-*` + `.is-*` taxonomy.

### 13.1 Legend
- LCSS: Legacy CSS Selector
- NEW: Planned new base or state class
- SRC (CSS): file:line-range (approx start of block)
- JS CREATION: Function(s)/method(s) that create initial DOM
- JS UPDATE: Functions mutating element after creation
- JS EVENTS: Functions adding event listeners or toggling classes

### 13.2 Dice Component
| Aspect | LCSS / Legacy State | NEW Class / State | SRC (CSS) | JS CREATION | JS UPDATE / STATE | JS EVENTS |
|--------|---------------------|-------------------|-----------|-------------|-------------------|-----------|
| Die base | `.die` | `.cmp-die` | `css/dice.css:136` | `createDiceHTML()` in `js/dice.js:500-530` | `createDiceHTML()` (rebuild logic), dice collection state toggles | `attachDiceEventListeners()` in `js/dice.js:532+` (click toggles `selected`) |
| Selected | `.die.selected` | `.cmp-die.is-selected` | `css/dice.css:207` | (class appended during HTML build if die.isSelected) | Toggle via `attachDiceEventListeners()` -> `diceCollection.toggleDiceSelection()` | same |
| Rolling | `.die.rolling` | `.cmp-die.is-rolling` | `css/dice.css:254` | Not created initially; applied when `die.isRolling` true | Die `roll()` method updates model; UI refresh rebuilds HTML | Indirect (triggered by roll action elsewhere) |
| Disabled | `.die.disabled` | `.cmp-die.is-disabled` | `css/dice.css:227` | HTML build if `die.isDisabled` | Updated when enabling/disabling extra dice (`enableExtraDie`, etc.) | Selection handler blocks clicks if `.disabled` |
| Mini (AI) | `.die-mini`, `.die-mini-inline` | `.cmp-die--mini` | `css/ai-logic-flow.css:179` | Generated inside AI logic templates (search to map later) | Re-render of AI panels | N/A (static display) |

Refactor Notes:
1. Dual-class phase: add `.cmp-die` alongside `.die` in `createDiceHTML()`. For states, keep legacy plus new until CSS flip.
2. Event delegation: update selector in `attachDiceEventListeners()` from `.die` to `.die, .cmp-die` during bridging, then finally only `.cmp-die`.

### 13.3 Player Dashboard (Card) Component
| Element | LCSS | NEW | SRC (CSS) | JS CREATION | JS UPDATE | Events |
|---------|------|-----|-----------|-------------|-----------|--------|
| Dashboard wrapper | `.player-dashboard` | `.cmp-player-card` | `css/game-areas.css:422` | `_buildPlayerCardElement()` `js/main.js:2068-2145` | `_updateSinglePlayerStats()` `js/main.js:2146-2190`; numerous cache refreshers (`_refreshPlayerDashboardCache`) | Drag logic & active state handlers in `js/main.js` lines ~280–300, 784–806, 1894+ |
| Active state | `.player-dashboard.active` | `.cmp-player-card.is-active` | `css/game-areas.css` (stacking rules) | Added if `isActive` param in builder | Active player switching logic (search transitions) | Draggability restricted to active card (custom logic) |
| Health bar container | `.health-bar-container` | `.cmp-health` | `css/game-areas.css:633` | Inner HTML of builder | Width/ARIA updated in `_updateSinglePlayerStats()` | Hover transitions (CSS only) |
| Health fill tiers | `.health-bar-fill.health-high|medium|low|critical` | `.cmp-health__fill.is-high|is-medium|is-low|is-critical` | `css/game-areas.css:700+` | Builder sets `healthBarClass` | `_updateSinglePlayerStats()` recalculates className | N/A |
| Stat group | `.player-stats` / `.stat` | `.cmp-stats` / `.cmp-stat` | Various (stat tile styles earlier inventoried) | Builder template | `_updateSinglePlayerStats()` updates textContent & data attrs | Click on `.stat.power-cards` (handled in modal toggle logic lines 2404+) |
| Power cards count | `.stat.power-cards` | `.cmp-stat--cards` + `.cmp-stat` | `css/game-areas.css:738` | Builder | `_updateSinglePlayerStats()` updates numeric content | Modal open toggles in `main.js:850-860`, 2404+ |
| Inline Tokyo indicator | `.tokyo-indicator-inline` | `.cmp-indicator--tokyo` | `css/game-areas.css:1008` | Condition in builder line ~2110 | Created/removed in `_updateSinglePlayerStats()` lines 2164–2184 | Hover style at `css/game-areas.css:1031` |

Refactor Notes:
- Introduce `.cmp-player-card` on wrapper; keep `.player-dashboard` until Phase 9.
- Replace nested health tier class authoring: generate base `.cmp-health__fill` + separate `.is-*` tier classes.

### 13.4 Power Cards (Marketplace / Owned)
| Aspect | LCSS | NEW | SRC (CSS) | JS CREATION / UPDATE | Notes |
|--------|------|-----|-----------|----------------------|-------|
| Marketplace card | `.power-card` | `.cmp-card` | `css/cards.css:74 / 195` | (Creation logic not yet extracted—needs further search for DOM generation) | nth-child styling replaced by contextual layout tokens |
| Name | `.power-card .card-name` / `.power-name` | `.cmp-card__name` | `css/cards.css:139-141` | Template function (TBD) | Might merge duplicate name selectors |
| Cost | `.card-cost` | `.cmp-card__cost` | `css/cards.css:158` | Updated when purchase occurs (`buyCard` in `monsters.js:269-292` triggers UI update pipeline) | After purchase cost may be hidden/opacity; map to `.is-owned` state |
| Description | `.card-description` | `.cmp-card__description` | `css/cards.css:181` | Template (TBD) | Typography tokenization |
| Effect categories | Attribute selectors `data-effect*=` | `.is-effect-*` state modifiers | `css/cards.css:203-221` | Assigned at render time | Provide deterministic semantic mapping |
| Owned list miniature | (Mini `.power-card` scaled) | `.cmp-card--mini` | (Scaling rules to be validated) | Owned cards panel builder (pending mapping) | Add translation to inventory once confirmed |

Action: Locate JS factory rendering power cards (future step) and augment table with exact function names.

### 13.5 Power Card Tabs
| Element | LCSS | NEW | SRC (CSS) | JS CREATION | Notes |
|---------|------|-----|-----------|------------|-------|
| Tabs container | `.power-card-tabs` | `.cmp-tabs` | `css/monsters.css:202` | Hover reveal driven by dashboard presence | Will decouple from dashboard hover dependency |
| Single tab | `.power-card-tab` | `.cmp-tab` | `css/monsters.css:222` | (Likely static markup) | Active/hover translations to `.is-active` |
| Preview panel | `.tab-preview` | `.cmp-tab__preview` | (In responsive / monsters CSS) | (TBD) | Might require restructure to remove heavy descendant chains |

### 13.6 Indicators & Badges
| Element | LCSS | NEW | SRC (CSS) | JS LINK | Notes |
|---------|------|-----|-----------|--------|-------|
| Tokyo inline | `.tokyo-indicator-inline` | `.cmp-indicator--tokyo` | `css/game-areas.css:1008` | Built & updated in player dashboard functions | Already mapped above |
| CPU badge (if reinstated) | (historical avatar badge class) | `.cmp-indicator--cpu` | (Earlier inventory lines) | Avatar build (not active now) | Optional future reactivation |

### 13.7 Probability & Analysis UI
| Aspect | LCSS | NEW | SRC (CSS) | JS CREATION | States |
|--------|------|-----|-----------|------------|--------|
| Probability bar container | `.probability-bar` | `.cmp-probbar` | `css/layout.css:1190` | `generateProbabilityAnalysis()` `main.js:5060-5090` | Width set inline style |
| Probability fill | `.probability-fill` + `.probability-{low|medium|high}` | `.cmp-probbar__fill` + `.is-low|is-medium|is-high` | `css/layout.css:1200-1214` | Same function | Classification via `getProbabilityLevel()` |
| Improvement item | `.improvement-item` | `.cmp-prob-improvement` | `css/layout.css:1183` | Same function | Minor styling delta |
| Kept dice | `.kept-die` | `.cmp-die--mini` | (Style elsewhere) | `formatKeptDice()` `main.js:5048-5058` | Inherits dice semantics |

### 13.8 Game Log Entries
| Element | LCSS | NEW | SRC (CSS) | JS CREATION | States |
|---------|------|-----|-----------|------------|--------|
| Log entry wrapper | `.log-entry` | `.cmp-log` | `css/modals.css:3648` | `formatLogEntry()` `main.js:6389-6420` | Category class appended |
| Category modifier | `.log-entry.<category>` & `.log-category-*` | `.cmp-log.is-<category>` | `css/modals.css:3734-3764, 4071+` | Same function (categoryClass variable) | Map categories (dice-roll, attack, energy, victory-points, power-card, system, turn-start) |
| Dark mode styling | `body.dark-mode .log-entry` | `.dark &` via tokens | `css/base.css:232` | Global theme toggle | Replace with token overrides |

### 13.9 Modal / Overlay (Marketplace Refresh)
| Aspect | LCSS | NEW | SRC (CSS) | JS CREATION | Notes |
|--------|------|-----|-----------|------------|-------|
| Marketplace overlay | (TBD: locate actual class) | `.cmp-overlay--market` | (To extract) | Function controlling refresh (search future) | Placeholder until selector confirmed |

### 13.10 Shared State Class Mapping
| Legacy State | New State | Applies To |
|--------------|-----------|------------|
| `.selected` | `.is-selected` | dice, cards (selected/purchased) |
| `.rolling` | `.is-rolling` | dice |
| `.disabled` | `.is-disabled` | dice, buttons (future) |
| `.active` | `.is-active` | player card, tab |
| `.health-high` | `.is-high` | health fill |
| `.health-medium` | `.is-medium` | health fill |
| `.health-low` | `.is-low` | health fill |
| `.health-critical` | `.is-critical` | health fill |
| `.probability-low` | `.is-low` | probability fill |
| `.probability-medium` | `.is-medium` | probability fill |
| `.probability-high` | `.is-high` | probability fill |
| Category classes (`log-category-*`) | `.is-<category>` | log entry |

### 13.11 Refactor Sequence (JS)
1. Introduce new component base classes alongside legacy (dual-class) in creation functions.
2. Add state class duplication (legacy + new) where states are toggled (e.g., selection, active, health tier, probability level).
3. Update event listeners to match both (`.die, .cmp-die`).
4. After visual parity: update queries (`querySelectorAll('.die, .cmp-die')`).
5. Migrate state toggles to only new state classes (retain legacy for one phase).
6. Remove legacy state toggling (leave passive legacy states for CSS backward compatibility).
7. Flip cascade order (legacy first) and confirm no specificity fallout.
8. Remove legacy base classes from creation functions.
9. Remove legacy state classes from togglers.
10. Purge unused legacy selectors (lint + manual verification).

### 13.12 Tooling Suggestions
- Create a `mapping.json` artifact storing legacy→new mapping for automated codemod (optional future enhancement).
- Write a codemod script scanning JS for string literals of legacy classes and injecting dual-class or replacing when safe.

### 13.13 Outstanding Mapping Gaps
| Component | Missing JS Function Mapping | Action |
|-----------|-----------------------------|--------|
| Power card marketplace builder | Not yet extracted | Search for template creation (future pass) |
| Owned card miniature list | Not yet extracted | Identify function adding owned cards to dashboard |
| Marketplace refresh overlay | Unknown selector | Locate by searching 'refresh' 'overlay' 'market' |
