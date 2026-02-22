# 🎮 ArtLife — Source of Truth & Agent Coordination

> **THIS IS THE SHARED WORKSPACE.** All agents read and write here.
> Every agent must read this file before starting work.
> Update your section when you start AND complete work.

> [!NOTE]
> Full historical details, completed phase logs, and research notes have been moved to [README_ARCHIVE.md](README_ARCHIVE.md).

---

## 🚀 Ultimate Vision

**Build ArtLife into a real, polished, shippable text-adventure game.** Not a prototype — a game people want to play. Think *Fallen London* meets *Art Basel* with the polish of *A Dark Room*.

**What "real game" means concretely:**
- **Events should feel like short stories** — 3+ layers of branching choices with NPC callbacks and consequences that ripple for weeks.
- **NPCs should feel alive** — they remember, they scheme, they reach out unprompted.
- **The market should be a character** — bull runs that tempt you, crashes that punish greed, artists who blow up or flame out.
- **Every playthrough should feel different** — the 3 character classes should unlock genuinely different storylines.
- **The endgame should mean something** — Week 26 reckoning: museum retrospective, SEC investigation, legacy judgement.

### 🎨 Design Philosophy: Analog Feel

The game should feel **analog and tactile** — like a typewriter, not a web app.

- **No CSS fade-in or slide-in animations.** Text appears instantly on menus/dashboards, or types out via JS typewriter on narrative screens.
- **Pokémon battle UI** is the reference for the Haggle Battle — clear zones, character cards, health bars, turn-based tactics.
- **Only functional animations remain:** stat pop on value change, cursor blink on typewriter.
- **Pixel art backgrounds** are used on event screens behind text (dark overlay for readability).
- **Pantone Dark Blue Theme** is the default UI color scheme, giving a "blue-chip gallery" feeling. It can be toggled to Classic Dark via the Admin Dashboard (`~` hotkey).

---

## 📡 Live Agent Coordination

> [!IMPORTANT]
> **Check this section FIRST.** If another agent is actively touching a file, do NOT touch that file.

### Who Is Doing What Right Now

| Agent | Current Task | Files Being Touched | Status |
|---|---|---|---|
| **Antigravity** | Phase 4 Active. Building Agent 2 (Scene Visuals/Rewards) & Agent 3 (Inventory UI/Dialogue). | `SceneEngine.js`, `ScenePlayer.jsx`, `inventoryStore.js`, `InventoryDashboard.jsx`, `App.jsx` | 🟢 Active |
| **ClaudeCode** | Weekly report, dialogue trees, artwork expansion, content pipeline. | `dashboard.js`, `dialogue_trees.js`, `artworks.js`, `GameDebugAPI.js` | 🟢 Active |

---

### 🔧 ClaudeCode: Code Audit Execution Orders

> [!CAUTION]
> **ClaudeCode:** Read `Code_Audit.md` in this folder FIRST. It contains 15 specific issues with exact code fixes. Execute them in the priority order below. After each refactoring step, run `cd game && npx vite build --mode development` to verify zero errors.

**Phase 2.7 — Code Audit Refactoring (execute in this order):**

| # | Task | Files | What To Do |
|---|---|---|---|
| 1 | **Split GameState.js** | `managers/GameState.js` → `managers/GameState.js` + `managers/DealResolver.js` + `managers/WeekEngine.js` | Extract `advanceWeek()` into `WeekEngine.js`. Extract deal resolution (lines 168-220) into `DealResolver.js`. Keep core state, `init()`, `save()`, `load()`, `buyWork()`, `sellWork()` in GameState. |
| 2 | **Split PhoneManager.js** | `managers/PhoneManager.js` → `managers/PhoneManager.js` + `managers/NPCMemory.js` | Extract `addWitnessed()`, `addGrudge()`, `addFavor()`, `npcAutonomousTick()` into `NPCMemory.js`. Keep messaging functions in PhoneManager. |
| 3 | **Add try/catch to WeekEngine** | `managers/WeekEngine.js` | Each system call in the tick sequence gets its own try/catch (see `Code_Audit.md` issue #1 for exact pattern). |
| 4 | **Fix cross-manager mutation** | `managers/MarketManager.js` | Move `suspicion` and `marketHeat` decay out of `MarketManager.tick()`. Return effects from `tick()`, let `WeekEngine` apply them. |
| 5 | **Replace window globals** | `phaserInit.js`, `App.jsx` | Replace `window.toggleEgoDashboard` with `GameEventBus.emit(GameEvents.TOGGLE_DASHBOARD)`. Add listener in App.jsx useEffect. |
| 6 | **Fix shuffle bias** | `managers/MarketManager.js` | Replace `sort(() => Math.random() - 0.5)` with Fisher-Yates shuffle. Create `utils/shuffle.js`. |
| 7 | **Shared ID generator** | Create `utils/id.js` | Extract the `Date.now() + Math.random()` pattern into a shared `generateId(prefix)` function. Update ConsequenceScheduler, MarketManager, GameState. |
| 8 | **Split events.js** | `data/events.js` → `data/events/index.js` + category files | Split by event category. Barrel re-export from `index.js`. |

---

### 🔁 Crossover Verification Protocol

> [!WARNING]
> **Both agents MUST follow this protocol.** After every refactoring task, the OTHER agent verifies.

**After ClaudeCode completes each task:**
1. ClaudeCode runs `cd game && npx vite build --mode development` — must be **0 errors**
2. ClaudeCode runs existing tests: `cd game && npm test` (if test runner exists)
3. ClaudeCode updates the task table above with ✅ status
4. **Antigravity verifies:** Reads the changed files, confirms the refactoring matches the `Code_Audit.md` specification, and checks that no other manager's imports broke

**Verification Checklist (run after EVERY file split):**
- [ ] All imports updated across the codebase (`grep -r "from.*GameState" game/src/`)
- [ ] `npx vite build --mode development` produces 0 errors
- [ ] Existing functionality preserved (game still boots to TitleScene)
- [ ] No circular imports introduced
- [ ] New file follows the established pattern (static class with JSDoc)

### Rules
1. **Register** your task in the table above before starting
2. **Don't touch files** another agent is touching
3. **Run `cd game && npx vite build --mode development`** before marking code tasks complete
4. **Be proactive** — if you see something that would make the game better, do it
5. **Cross-check** — after completing a refactoring task, the other agent reviews the changes

---

## 📚 Master Documentation Index

> [!IMPORTANT]
> **To all Agents:** If you are building a specific feature, you MUST read the associated spec document in the `07_Project` folder BEFORE writing code.

| System / Feature | Architectural Specification | Description |
|---|---|---|
| **World Building & Narrative** | `Art_World_Database.md` | The core lore, NPC profiles, and market mechanics. |
| **V2 UI & Era Engine** | `UI_and_Dynamic_Systems_Spec.md` | React ThemeProvider (`Desk` vs `Terminal`) & the 40-Year Era progression framework. |
| **Narrative Tracking & Debugging** | `Admin_Narrative_Tracker_Spec.md` | The "God Mode" dashboard for tracking hidden flags and the consequence queue. |
| **Content Management Studio** | `Content_Management_Studio_Spec.md` | Visual authoring workspace: drag-and-drop event scheduling, NPC wiring, consequence chain previewer. |
| **Core Loop (7 Systems)** | `Core_Loop_Systems_Spec.md` | Phone, Calendar, Scene Engine, NPC Registry, Event Registry, Inventory, Art Pricing & Economics. |
| **Open-Source Research** | `Reference_Tools_Research.md` | Audit of narrative engines, CMS tools, and market sims with INTEGRATE vs REFERENCE recommendations. |
| **Implementation Blueprints** | `Implementation_Plan.md` | Production-grade code patterns, error handling tables, and critical-path build order for all V2 systems. |
| **Dialogue Tree Template** | `Dialogue_Tree_Template.md` | AI content pipeline: JSON schema, field docs, stat/NPC/venue reference, design guidelines, minimal + complex examples. Give to AI to generate new scenes. |
| **V1 Code Audit** | `Code_Audit.md` | 15 issues found (4 critical), refactoring priorities, and educational explanations for each fix. |
| **Phase 4 Code Audit** | `Code_Audit_and_Refactoring_Plan.md` | Assessment of Technical Debt (Zustand transition, Data Hardcoding, React UI Routing) to fix before Week 26 Endgame. |
| **Game Design Philosophy** | `Fundamentals_of_Play.md` | Core psychological tenets and mechanics ensuring the game remains fun and unpredictable. |
| **Project Scheduling** | `Roadmap.md` | The current phase timeline. |
| **Historical Logs** | `README_ARCHIVE.md` | Completed work from V1 Prototype. |

---

## 🔥 Highest-Impact Tasks (MVP Readiness Audit)

> **See [Roadmap.md](Roadmap.md) for the full task tracker with status columns.**
> *Updated by Antigravity Codebase Manager after full flow audit.*

To get this to a "Gaming Standards" MVP that the team can playtest end-to-end, we should focus on the easiest lifts that provide the most narrative depth and usability:

1. **Finish the Room & Venue Integration (B4/C1)**: The venue flow exists, but we need to ensure every room drains the time budget properly and triggers the correct scheduled `events.js` so players actually play the calendar.
2. **The Tone System**: Passing a "Tone" (Aggressive, Professional, Casual, Mysterious) down to the Dialogue engine requires very little infrastructural code but multiplies the narrative depth by 4x.
3. **Admin Narrative Dashboard**: A "God Mode" (tied to the backtick `~` key) is critical for you to playtest the MVP without guessing if the Consequence Queue stored your grudges.
4. **Week 26 Endgame Sequence**: We need to cap the MVP with a single satisfying "Reckoning" sequence (Museum Retrospective vs SEC Investigation) so playtesters experience a complete arc.

*(Legacy High-Impact Tasks below)*
5. **Session Persistence** — page reload should restore last screen, not restart from title. (✅ DONE)
6. **Weekly Report Enhancement** — richer content: decisions, inventory, dialogue outcomes, events. (✅ DONE)
7. **Comprehensive UI & Data Audit (Anti-Cheat)** — Deep research and implementation of state protection so players cannot manipulate the DOM or local storage to cheat.
8. **Sound design** — terminal click sounds, ambient gallery noise (Web Audio API) (✅ PARTIAL - WebAudioService added)

---

## 🏗️ Current Phase: Foundation & Infrastructure

> **See [Roadmap.md](Roadmap.md) for detailed task tracking.**

**Phase 3** focuses on hardening the foundation so content can be dropped in without rewiring:
- Scene flow & navigation (B4/C1/C2 from Implementation_Plan)
- Developer tools (Admin Dashboard, State Importer)
- Core system gaps (tone system, progressive disclosure, sound)

## 📋 Code Health Audit

> [!WARNING]
> **Large files that should be split:** `screens.js` (140KB, ~3800 lines) and `events.js` (150KB). Consider breaking `screens.js` into domain-specific modules (e.g. `screens/market.js`, `screens/phone.js`).

| Layer | Files | Total Size | Notes |
|---|---|---|---|
| `scenes/` | 12 | ~175KB | Largest: `GameScene.js` (44KB), `DialogueScene.js` (36KB) |
| `managers/` | 15 | ~140KB | Split: `GameState`+`DealResolver`+`WeekEngine`+`NPCMemory`+`GameEventBus` |
| `data/` | 8 + `events/` (9) + `maps/` | ~380KB | `events.js` split into 8 categories. `dialogue_trees.js` expanded to ~60KB (9 trees). 28 artworks. Largest: `rooms.js` (76KB) |
| `terminal/` | 2 | ~165KB | `screens.js` = 140KB — candidate for splitting |
| `utils/` | 4 | ~5KB | `shuffle.js`, `id.js`, `ErrorRegistry.js`, `GameDebugAPI.js` |
| `sprites/` | 2 | ~5KB | `Player.js`, `NPC.js` (decoupled entity classes) |
| `anims/` | 1 | ~1.5KB | `CharacterAnims.js` (centralized animation registry) |
| `ui/` | 1 | TBD | New UI component directory |

### Missing Modules (referenced but not yet created)
- `RoomManager.js` — room traversal state machine (currently handled inline by `LocationScene`)
- `src/managers/MapManager.js` — tilemap parsing helper (Phase 40.5)

### Patterns Adopted from [pokemon-react-phaser](https://github.com/jvnm-dev/pokemon-react-phaser)
- **GameEventBus** — singleton `Phaser.Events.EventEmitter` bridging scenes↔terminal UI
- **Camera Vignette** — `postFX.addVignette()` on all exploration scenes
- **Daylight Overlay** — in-game week-based tinting on overworld
- **Position Auto-Save** — `gridEngine.positionChangeFinished()` subscriber
- **Cinematic Transitions** — `fadeIn()`/`fadeOut()` on scene enter/exit

---

## Dev Workflow & Testing

### Getting Started
```bash
cd game
npm install
npm run dev          # Vite dev server on http://localhost:5173
```

### Running Tests
```bash
# Unit tests (needs dev server running on port 5175)
npm test             # 36/36 tests

# Full Playwright scene flow tests
npm run test:flow    # 53/53 tests

# Start server + open browser + run tests
npm run launch
```

### Mobile Testing
```bash
# Option A: Cloudflare Quick Tunnel (requires cloudflared installed)
npm run tunnel       # Gives a *.trycloudflare.com URL

# Option B: localtunnel
npm run expose       # Gives artlife.loca.lt URL
```

### Key Shortcuts (In-Game)
| Key | Action |
|---|---|
| `~` (backtick) | Toggle Admin Dashboard (God Mode) |
| Arrow Up/Down | Navigate terminal options |
| Enter | Select option |
| Escape | Go back |
| 1-9 | Quick-select numbered option |

### Save/Load System
- **Auto-save:** Triggers after every action and week advance
- **Manual save:** System Menu → Save Game (5 slots)
- **Quick Start:** Title screen option 3 — loads demo profile, skips character creator
- **Session persistence:** Page reload auto-resumes from last save

### Build & Deploy
```bash
npm run build        # Vite production build → dist/
# GitHub Pages auto-deploys from main branch
# Preview: https://sabi-c.github.io/ArtLife-Game/
```

### Known Limitations
- Overworld/City scenes are early-stage — room exploration is the primary gameplay loop
- No multiplayer — single player only
- Sound is procedural (Web Audio API oscillators) — no music yet
- Save data is in localStorage — clearing browser data loses progress

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Engine** | Phaser 3 (scene management, Canvas rendering, physics) |
| **Rendering** | Dual: DOM `TerminalUI.js` (menus/dashboard) + Phaser Canvas (haggle, overworld, dialogue) |
| **Language** | JavaScript (vanilla ES modules) |
| **Data** | JS modules exporting `const` arrays/objects |
| **State** | Static class singletons (`GameState.state`, `PhoneManager.contacts`) |
| **Styling** | CSS in `style.css` |
| **Build** | Vite |

---

## Project Structure

```
game/
├── src/
│   ├── main.js                     # Entry point + Phaser config
│   ├── style.css                   # All styling (34KB)
│   │
│   ├── data/                       # ── DATA LAYER ──
│   │   ├── artists.js              # 8 artists + work generator
│   │   ├── artworks.js             # Artwork definitions
│   │   ├── backgrounds.js          # Background traits (Alma Mater, Language)
│   │   ├── calendar_events.js      # 22 recurring calendar events
│   │   ├── characters.js           # 3 character classes
│   │   ├── cities.js               # 5 cities with travel costs
│   │   ├── contacts.js             # 16 NPC contacts across 10 roles
│   │   ├── dialogue_trees.js       # V2 dialogue trees (39KB)
│   │   ├── events.js               # Re-export barrel → events/*.js
│   │   ├── events/                 # 49+ events split by category (8 files)
│   │   ├── haggle_config.js        # Haggle types, tactics, dealer types, dialogue
│   │   ├── rooms.js                # Room/venue data (76KB)
│   │   ├── scenes.js               # Dialogue scene content data
│   │   ├── ticker_phrases.js       # News ticker phrase bank
│   │   ├── world_locations.js      # World location definitions
│   │   └── maps/                   # Tiled JSON map data
│   │
│   ├── managers/                   # ── ENGINE LAYER ──
│   │   ├── GameState.js            # Central state singleton (31KB)
│   │   ├── WeekEngine.js           # Weekly advance orchestrator (try/catch isolated)
│   │   ├── DealResolver.js         # Deal/offer resolution logic
│   │   ├── NPCMemory.js            # NPC memory system (witnessed, grudges, favors, gossip)
│   │   ├── MarketManager.js        # Art market simulation
│   │   ├── PhoneManager.js         # NPC messaging hub (slimmed)
│   │   ├── EventManager.js         # Event selection + pacing
│   │   ├── HaggleManager.js        # Haggle battle state machine (17KB)
│   │   ├── ConsequenceScheduler.js # Delayed effect queue
│   │   ├── DecisionLog.js          # Player decision journal
│   │   ├── DialogueEngine.js       # Branching narrative parser
│   │   ├── DialogueTreeManager.js  # V2 dialogue tree manager
│   │   ├── GameEventBus.js         # Singleton Phaser↔UI event bridge
│   │   ├── OverworldHelper.js      # Map/physics helper (12KB)
│   │   ├── QualityGate.js          # Stat-gating system
│   │   └── SettingsManager.js      # Game settings persistence
│   │
│   ├── terminal/                   # ── TERMINAL UI LAYER ──
│   │   ├── TerminalUI.js           # Screen stack renderer (25KB)
│   │   └── screens.js              # 30+ screen functions (140KB)
│   │
│   ├── ui/                         # ── UI COMPONENTS ──
│   │   └── (emerging)              # New UI component directory
│   │
│   └── scenes/                     # ── PHASER SCENE LAYER ──
│       ├── BootScene.js            # Asset preloading
│       ├── MenuScene.js            # Title screen
│       ├── CharacterSelectScene.js # Character class picker
│       ├── GameScene.js            # Main game scene (hosts TerminalUI, 44KB)
│       ├── DialogueScene.js        # Event rendering + multi-step engine (36KB)
│       ├── HaggleScene.js          # Pokémon-style haggle battle (23KB)
│       ├── MacDialogueScene.js     # 1-bit Macintosh dialogue scene (15KB)
│       ├── LocationScene.js        # Room navigation scene (15KB)
│       ├── OverworldScene.js        # Top-down overworld (12KB)
│       ├── CityScene.js            # City hub tilemap (9KB)
│       ├── FastTravelScene.js      # Taxi/fast travel system (11KB)
│       └── EndScene.js             # Game over summary
│
├── public/
│   ├── backgrounds/                # 15+ pixel art backgrounds
│   ├── sprites/                    # 8 dealer sprites + 18 NPC portraits
│   ├── portraits/                  # 3 character class portraits
│   ├── art/                        # In-game artwork assets
│   ├── assets/tilesets/            # Tileset data for overworld
│   ├── icons/                      # PWA icons
│   ├── player.png, tileset.png
│   ├── manifest.json, sw.js
│   └── (index.html is at game root)
└── vite.config.js
```

---

## What's Built (Summary)

| Feature | Status |
|---|---|
| 3 character classes + deep creation | ✅ |
| 49+ events (7 categories) | ✅ |
| Multi-step branching engine (`nextSteps`) | ✅ |
| 16 NPC contacts with phone/favor system | ✅ |
| Market simulation (8 artists, bull/bear cycles) | ✅ |
| Terminal UI (30+ screens, keyboard+touch) | ✅ |
| Save/Load (5 slots, auto-save) | ✅ |
| PWA (manifest, service worker, offline) | ✅ |
| Mobile layout (safe-area, touch targets, swipe) | ✅ |
| Typewriter screen transitions | ✅ |
| Pixel art backgrounds (15+ scenes) | ✅ |
| Haggle Battle v3 (type attributes, Phaser visual) | ✅ |
| 1-bit Macintosh dialogue scene | ✅ |
| Scene system (12 Phaser scenes) | ✅ |
| Rooms + dialogue trees (9 trees, 4 NPCs deep) | ✅ |
| Weekly report screen (post-advance notification) | ✅ |
| 28 artworks across 3 tiers | ✅ |
| Dialogue tree content pipeline template | ✅ |
| LocationScene (room navigation) | ✅ |
| OverworldScene (top-down movement) | ✅ |
| CityScene + FastTravel | ✅ |
| Settings system | ✅ |
| News ticker phrase bank | ✅ |
| Ego Terminal v2 (sparklines, stat bars, market intel) | ✅ |
| Calendar & Time UI (event strip, action budget pips) | ✅ |
| Variable action costs (1-2 AP per action type) | ✅ |
| Progressive disclosure (early/mid/late game phases) | ✅ |
| Calendar event attendance (fairs, auctions, biennales) | ✅ |
| Venue Dialogue Cutscenes (Gallery, Fair, Freeport etc.) | ✅ |
| Rooms wired into game loop (full B4/C1) | ❌ TODO |
| Tone system for dialogues | ❌ TODO |
| Admin Narrative Dashboard | ❌ TODO |
| Inventory system | ❌ TODO |
| Sound design (terminal SFX) | ✅ Partial |
| Endgame reckoning (Week 26) | ❌ TODO |

---

## Active Roadmap

> **Full tracker: [Roadmap.md](Roadmap.md)**

```
  NOW    Phase 3: Foundation & Infrastructure
  ├──── 3A: Wire dialogue trees + rooms into game loop (B4/C1/C2)
  ├──── 3B: Admin Narrative Dashboard (God Mode)
  └──── 3C: Tone system, progressive disclosure, sound
  ↓
  NEXT   Phase 4: Content & Narrative Depth
  ├──── 4A: Expand artists, perks, character arcs
  ├──── 4B: Deep branching events, venue encounters, NPC trees
  └──── 4C: Freeport, auctions, city content
  ↓
  LATER  Phase 5: 40-Year Career (Historical Eras)
  ↓      Phase 6: Polish & Release
```

---

## 🎮 Reference Repos: Pokémon-Style Battle Engines

> Researched 2026-02-20 to inform the haggle battle visual evolution. Our current stack (Phaser 3 + DOM Terminal UI) is the right foundation — we don't need to switch engines.

| Repo | Tech | Stars | Usefulness for ArtLife |
|---|---|---|---|
| [`pkmn/engine`](https://github.com/pkmn/engine) | Zig + TypeScript | 200+ | **Architecture reference only.** Pure simulation engine: `update(choices) → result`. No rendering. Its state machine pattern (`update` + `choices` per turn) validates our `HaggleManager.executeTactic()` → result pattern. But it's bug-for-bug Pokémon-accurate — massive overkill for art dealer haggling. |
| [`chriscourses/pokemon-style-game`](https://github.com/chriscourses/pokemon-style-game) | Vanilla JS + Canvas | 501 | **Most relevant.** Battle system, Tiled map integration, dialogue queue. Same vanilla JS + Canvas tech as us. Gold standard tutorial for the Stage 4→5 evolution. |
| [`varkor/pokengine`](https://github.com/varkor/pokengine) | JS + WebSockets | ~100 | **WebSocket multiplayer battles.** Feature-complete: abilities, items, weather, status. Useful if we ever add PvP art dealing. Skip for now. |
| [`yashoss/pokebattlejs`](https://github.com/yashoss/pokebattlejs) | Vanilla JS + Canvas | ~50 | **Battle UI reference.** `monster.js`/`attack.js`/`game.js` separation maps to our `HaggleManager`/`haggle_config`/`screens` pattern. Good for animations. |
| [`chase-manning/pokemon-js`](https://github.com/chase-manning/pokemon-js) | React + TypeScript | ~200 | **Full Red/Blue recreation.** Shows the ceiling of what's possible in browser. Save/load, multiple maps, turn-based battles at scale. |
| [`DeusMalsith/pokemon-battle-system`](https://github.com/DeusMalsith/pokemon-battle-system) | HTML/CSS/JS | ~20 | **Simplest battle implementation.** Good for understanding the core loop: choose attack → calculate → animate → next turn. |
| [Pixelbox.js](https://github.com/nicoptere/Pixelbox) | JS | ~200 | **Educational pixel art game engine.** Minimal, designed for pixel art. Could be useful for Stage 5 room exploration if we want something lighter than Phaser. |

**Key takeaway:** `pkmn/engine`'s design confirms our approach is right — a state machine that takes player choices and returns results, with rendering handled separately. We already have this pattern in `HaggleManager`. The visual upgrade is a *rendering* problem, not an *engine* problem.

---

## ✅ Phase 30: Phaser 3 Pokémon Battle Integration — COMPLETED

> **Status:** ✅ COMPLETED. Haggle Battle is now a full visual scene in Phaser 3 with type attributes. Pure-text version backed up to `Art-Market-Game-V1-Backup`. See Phase 16.5c below.

---

## ✅ Phase 16.5c: Haggle Type & Attribute System — COMPLETED

> **Status:** ✅ COMPLETED. 4 tactic types (`Emotional`, `Logical`, `Aggressive`, `Financial`) with rock-paper-scissors effectiveness. Types assigned to all TACTICS, BLUE_OPTIONS, and DEALER_TYPES in `haggle_config.js`. Effectiveness calculated in `HaggleManager.executeTactic()` and feedback rendered in `HaggleScene.js`.

---

## 🏗️ Phase 31: Full Systems Integration

> **Status:** PARTIALLY DONE. `LocationScene.js`, `MacDialogueScene.js`, and basic scene transitions between DOM and Phaser exist. Remaining: B4 dialogue tree wiring and full venue flow.

**Remaining Tasks:**
- [ ] B4: Modify `DialogueScene.js` to add `room_talk` + `dialogue_tree` step types, wire tone system
- [ ] C1: Wire rooms + dialogue trees into EventManager, GameState, PhoneManager
- [ ] C2: Testing + verification of full venue flow (Dashboard → Event → Dialogue → Haggle → Dashboard)

---

## 🗺️ Phase 40: Overworld Exploration Engine

> **Status:** PARTIALLY DONE. `OverworldScene.js` (12KB), `CityScene.js` (9KB), `FastTravelScene.js` (11KB), and `OverworldHelper.js` (12KB) already exist with basic movement, tilemap loading, and taxi system. See Phase 40.5 for the refactoring plan.

---

## 🗺️ Phase 40.5: Top-Down RPG Usability & Code Integration Plan

> **Status:** PLANNING. Based on audits of industry-standard Phaser 3 top-down RPG templates (`phaser3-top-down-template`, `phaser_dungeon_crawler`, `theodoric`), we are refactoring our `LocationScene` and `OverworldScene` approach to ensure long-term scalability, clean code, and excellent usability.

### 1. Code Architecture Audit & Refactor
*Reference: `phaser3-top-down-template` & `phaser_dungeon_crawler`*
Our current scenes handle too much generic logic. We need to decouple entities to match best practices:
- **Extract Player Class (`src/sprites/Player.js`):** Move player creation, GridEngine linkage, WASD/arrow input handling, and animation processing into a standalone class extending `Phaser.Physics.Arcade.Sprite`.
- **Extract Map Manager (`src/managers/MapManager.js`):** Create a robust helper to load Tiled maps, generate collision layers (`setCollisionByProperty`), and handle map cleanup.
- **Tilemap Object Spawning:** Do not hardcode NPC coordinates. Read them directly from an `NPCs` object layer in Tiled (`map.getObjectLayer('NPCs')`) to spawn custom `NPC.js` sprites.
- **Parallel UI Scene (`src/scenes/GameUI.js`):** The HUD/TerminalUI needs to be cleanly decoupled from the physics scene. Run a persistent `GameUI` scene in parallel (`this.scene.run('GameUI')`) to handle UI overlays without being affected by camera zooming or scrolling.
- **State Syncing (`GameState.state`):** Ensure player coordinates, direction, and current map `roomId` are saved to the persistent game state on scene exit, so returning to the overworld feels seamless.

### 2. Usability & Controls (The "Action RPG" Feel)
*Reference: `theodoric`*
The movement needs to feel hyper-responsive and modern.
- **Control Scheme:** Standardize WASD + Arrow Keys for movement.
- **Interaction Raycasting:** Add a dedicated interaction key (Spacebar or 'E'). Use GridEngine's `getFacingDirection()` and `getCharactersAt(targetTile)` to trigger dialogues safely.
- **Pointer/Touch Support:** Implement click-to-move pathfinding (`gridEngine.moveTo`) or a virtual D-Pad in the `GameUI` scene to ensure the game remains fully playable on mobile devices.
- **Camera Bounds:** Lock the `cameras.main.setBounds(...)` strictly to the tilemap dimensions so the camera never reveals the void outside the map edges.

### 3. Visual Depth & Layering
*Reference: `phaser_dungeon_crawler`*
Top-down games break immersion if layering is wrong.
- **Y-Sorting (Depth by Y-coordinate):** Implement dynamic depth sorting. In the scene or sprite's `update()` loop, set `sprite.setDepth(sprite.y)` so entities overlap correctly.
- **Overhead Masks:** Use custom "wall_above" or "roof" layers in Tiled. These must be rendered *above* the player sprite (e.g., `setDepth(9999)`) to act as masks when the player walks closely behind tall objects.

### Implementation Checklist
- [ ] Create `src/sprites/Player.js` hooked to GridEngine and keyboard inputs.
- [ ] Create `src/sprites/NPC.js` to standardize GridEngine setup and ambient wandering behaviors.
- [ ] Create `src/anims/CharacterAnims.js` to centralize all `.anims.create` calls.
- [ ] Create `src/managers/MapManager.js` to abstract Tiled map parsing and collision setup.
- [ ] Refactor `LocationScene.js`/`OverworldScene.js` to utilize the new decoupled classes.
- [ ] Establish a parallel `GameUI.js` scene for overlays.
- [ ] Add directional interaction raycasting (tied to Spacebar/E) for talking to NPCs.
- [ ] Create dynamic Y-sorting logic (`setDepth(y)`) for all moving objects.
- [ ] Add "wall_above" roof mask layers in Tiled rendering above the player.
- [ ] Add collision debug toggles (using `phaser_dungeon_crawler`'s `debugDraw` pattern).
- [ ] Implement mobile control fallbacks (click-to-move or virtual joystick).
- [ ] Connect `GameState.state.location` persistence so the player resumes exactly where they left off after an encounter.

---

## 🏙️ Phase 41: City Hub & World Expansion

> **Status:** PARTIALLY DONE. `CityScene.js` and `FastTravelScene.js` already exist with basic city tilemap rendering and taxi fast-travel. Remaining: doorway warps, persistent spawn tracking, ambient polish.

**Remaining Tasks:**
- [ ] Implement doorway warps — walking into a gallery door loads `LocationScene` interiors
- [ ] Configure persistent `GameState.state.playerLocation` tracking
- [ ] Build the Apartment as the player's primary hub/save point
- [ ] Add ambient city elements (animated pedestrians, day/night tinting)
- [ ] Build master `CityMap.json` in Tiled (streets, Chelsea gallery district, airport)

---

## 🛠️ Phase 42: UX Polish & Robustness Test Hub

> **Status:** PLANNED. Hardening the interactive systems against soft-locks, adding sensory polish (sound/animation), and building an explicit testing hub into the Main Menu.

**The Polish & Test Goal:**
Ensure the custom dialogue and haggle logic has unbreakable fallbacks (like force-quit buttons) so players never get stuck. Add the sensory layer (ambient audio, weather effects), and expose all these modules directly on the Title Screen so we can rapidly test art and logic integration.

### Execution Plan & Agent Tasks

#### 🛡️ Agent-1: Robustness & Error Handling (Lead)
- **Task 1:** Update `MacDialogueScene.js` and `DialogueScene.js` to include failsafe "Force Exit" or "Back" buttons (e.g., `ESC` key or a persistent UI button).
- **Task 2:** Ensure broken dialogue sequences or missing assets do not crash the game; implement graceful fallbacks (e.g., pure white background if image fails to load).
- **Task 3:** Expand the Main Menu to include a dedicated "Test Hub" section with shortcuts to:
  - 💬 `Test RPG Dialogue Scene` (Already started)
  - 🤝 `Test Haggle Scene` (Direct jump into a generic haggle config)
  - 🚶 `Test Overworld/City` (Direct to exploration)

#### ✨ Agent-2: Sensory Polish — Animations & Audio (Support)
- **Task 1:** Build out scene-specific CSS or Phaser particle animations (e.g., animated rain out the window, cigarette smoke, blinking cursors).
- **Task 2:** Introduce simple Web Audio API integration for:
  - Terminal blips and UI typing sounds.
  - Ambient noise (gallery murmur, street traffic).
- **Task 3:** Smooth out timing for the MacDialogueScene typewriter effect, allowing the player to rapidly skip ahead linearly without sequence breaking.

#### 🎨 Agent-3: 1-Bit Asset Refinement (Support)
- **Task 1:** Continue generating and iterating on 1-bit backgrounds and portraits for the MacDialogue aesthetics.
- **Task 2:** Create standard UI asset sets (speech bubbles, dialog boxes, cursor icons) to replace primitive drawn rectangles in Phaser.

---

## 🎨 Sprite Generation Pipeline

> **Status:** RESEARCH COMPLETE. Pipeline documented. 8 dealer sprites + 18 NPC portraits + 15 backgrounds generated. See [README_ARCHIVE.md](README_ARCHIVE.md) for full master prompt templates and post-processing pipeline details.

### Asset Manifest

| Asset | Current | Needed | Priority |
|---|---|---|---|
| NPC Portraits | 18 portraits | All 16 contacts covered | ✅ Done |
| Dealer Sprites | 8 dealer sprites | 6 dealer types covered | ✅ Done |
| Player Walking Sheet | `player.png` + `player_walk.png` | 3 class variants | MEDIUM |
| Scene Backgrounds | 15+ | Sufficient for current content | ✅ Done |
| Item Icons | none | artworks, phone, menu | LOW |
| UI Elements | none | buttons, frames, cursors | LOW |

### Implementation Tasks
- [x] Generate NPC portraits for all contact archetypes
- [x] Generate dealer sprites for all dealer types
- [x] Generate scene backgrounds (gallery, backroom, 1-bit variants)
- [ ] Create `scripts/bg_remove.py` with color-key and rembg modes
- [ ] Create `scripts/sprite_slice.py` for spritesheet cutting
- [ ] Generate 3 player class walking spritesheets
- [ ] Store master prompts in `07_Project/sprite_prompts.md` for reproducibility

---

## 🎮 Phase 42: Phaser-Based Title & Character Selection

> **Status:** PLANNING. We are transitioning the game's Title and Character Selection screens from the DOM-based `TerminalUI` to fully graphical, animated Phaser scenes, drawing inspiration from classic RPGs like Pokemon.

### 1. Code Architecture Review
Currently, ArtLife's entry flow (`characterSelectScreen`, `characterDetailScreen`) relies exclusively on drawing HTML strings to a static `div`. We will introduce a distinct pre-game Scene flow that completely bypasses `TerminalUI` until the player enters the main game loop (`Dashboard`).

### 2. Scene Blueprint
- **`src/scenes/TitleScene.js`:** A full-screen pixel-art background with a pulsing "Press SPACE to Start" prompt. Booted immediately by `main.js`.
- **`src/scenes/CharacterSelectScene.js`:** Arrow keys or WASD cycle through graphical portrait cards representing each archetype (`rich_kid`, `hedge_fund`, `gallery_insider`). The bottom screen dynamically types out the character stats via a typewriter effect. Pressing SPACE commits the choice, triggering `GameState.init(char)` and advancing to the overworld.

### Implementation Tasks
- [ ] Create `src/scenes/TitleScene.js` with pulsing "Press SPACE" animation.
- [ ] Create `src/scenes/CharacterSelectScene.js` with graphical portrait navigation.
- [ ] Implement keyboard cursors (Up/Down or Left/Right) to cycle through imported `CHARACTERS`.
- [ ] Implement typewriter effect for the character description text panel.
- [ ] Update `main.js` to boot `TitleScene` first, keeping the HTML Terminal hidden until needed.
- [ ] Wire the final selection to fire `GameState.init(char)` and transition cleanly to the `Dashboard` or `OverworldScene`.
