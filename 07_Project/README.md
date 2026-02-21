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

---

## 📡 Live Agent Coordination

> [!IMPORTANT]
> **Check this section FIRST.** If another agent is actively touching a file, do NOT touch that file.

### Who Is Doing What Right Now

| Agent | Current Task | Files Being Touched | Status |
|---|---|---|---|
| — | — | — | — |

### Rules
1. **Register** your task in the table above before starting
2. **Don't touch files** another agent is touching
3. **Run `cd game && npx vite build --mode development`** before marking code tasks complete
4. **Be proactive** — if you see something that would make the game better, do it

---

## 🔥 Highest-Impact Tasks

1. **Phase 40.5 — Overworld Refactor** — Extract `Player.js`, `NPC.js`, `MapManager.js` from monolithic scenes
2. **Wire rooms into game loop** — `rooms.js` and `dialogue_trees.js` exist but aren't connected via B4/C1
3. **Convert 5+ events to deep branching** — use `collector_dinner` as template
4. **NPC reputation consequences** — wire `npcEffects` into `resolveEventChoice()`
5. **Sound design** — terminal click sounds, ambient gallery noise (Web Audio API)
6. **Tutorial / first-time experience** — guided first week for new players

---

## 🏗️ Phase 7: React UI Integration (Current Focus)

**Goal:** Merge ArtLife's core gameplay loop (NPC dialogues, Haggle Battles) into the robust React/Zustand UI architecture demonstrated by `pokemon-react-phaser`. 

### The Migration Strategy
We will perform a **vertical slice integration** to prove the pipeline before a full rewrite. We will port ONE specific interaction (e.g. the NPC Dialogue "Backroom Deal" test) into a new React overlay.

1. **Environment Setup:** Refactor `index.html` and `main.js` into an `index.html` + `src/main.jsx` structure. Install `react`, `react-dom`, and `zustand`. Wrap the Phaser Game boot inside a top-level React Component (`<App />`).
2. **State Bridge (`Zustand`):** Create `src/stores/uiStore.js`. This acts as the global state manager bridging React and Phaser, replacing the need for our old `TerminalUI` rendering loop for this slice.
3. **Phaser Refactor:** Update `MacDialogueScene.js` so that instead of using Phaser's WebGL text renderer, it calls `uiStore.getState().openDialogue(payload)`.
4. **React Overlays:** Create `src/ui/DialogueBox.jsx`. The component listens to `uiStore`, renders elegantly on top of the `<canvas>` via CSS, and uses callbacks to resume the Phaser gameplay sequence upon completion.

## 📋 Code Health Audit

> [!WARNING]
> **Large files that should be split:** `screens.js` (140KB, ~3800 lines) and `events.js` (150KB). Consider breaking `screens.js` into domain-specific modules (e.g. `screens/market.js`, `screens/phone.js`).

| Layer | Files | Total Size | Notes |
|---|---|---|---|
| `scenes/` | 12 | ~175KB | Largest: `GameScene.js` (44KB), `DialogueScene.js` (36KB) |
| `managers/` | 13 | ~132KB | Largest: `GameState.js` (31KB). New: `GameEventBus.js` |
| `data/` | 15 + 1 dir | ~320KB | Largest: `events.js` (150KB), `rooms.js` (76KB) |
| `terminal/` | 2 | ~165KB | `screens.js` = 140KB — candidate for splitting |
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
│   │   ├── events.js               # 49+ events (150KB)
│   │   ├── haggle_config.js        # Haggle types, tactics, dealer types, dialogue
│   │   ├── rooms.js                # Room/venue data (76KB)
│   │   ├── scenes.js               # Dialogue scene content data
│   │   ├── ticker_phrases.js       # News ticker phrase bank
│   │   ├── world_locations.js      # World location definitions
│   │   └── maps/                   # Tiled JSON map data
│   │
│   ├── managers/                   # ── ENGINE LAYER ──
│   │   ├── GameState.js            # Central state singleton (31KB)
│   │   ├── MarketManager.js        # Art market simulation
│   │   ├── PhoneManager.js         # NPC communication hub (22KB)
│   │   ├── EventManager.js         # Event selection + pacing
│   │   ├── HaggleManager.js        # Haggle battle state machine (17KB)
│   │   ├── ConsequenceScheduler.js # Delayed effect queue
│   │   ├── DecisionLog.js          # Player decision journal
│   │   ├── DialogueEngine.js       # Branching narrative parser
│   │   ├── DialogueTreeManager.js  # V2 dialogue tree manager
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
| Rooms + dialogue trees (data files) | ✅ |
| LocationScene (room navigation) | ✅ |
| OverworldScene (top-down movement) | ✅ |
| CityScene + FastTravel | ✅ |
| Settings system | ✅ |
| News ticker phrase bank | ✅ |
| Rooms wired into game loop (full B4/C1) | ❌ TODO |
| Inventory system | ❌ TODO |
| Sound design | ❌ TODO |
| Endgame reckoning (Week 26) | ❌ TODO |

---

## Active Roadmap

```
  NOW    Phase 40.5: Overworld Refactor (Player.js, NPC.js, MapManager.js)
  ↓     B4 (wire dialogue trees) → C1-C2 (room integration)
  ↓     Phase 14 (convert 10+ events to deep branching)
  ↓     Phase 15 (NPC depth — personalityTraits, rivalries, quest lines)
  ↓     Phase 29 (Visual Gallery — Canvas-rendered artworks)
  ↓     Phase 41 (City Hub & World Expansion)
  ↓     Phase 42 (UX Polish & Robustness Test Hub)
  ↓     Endgame reckoning + sound design
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
