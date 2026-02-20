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
| Agent-1 | Phase 31: Data & Routing Wire-up | `screens.js`, `LocationScene.js`, `DialogueScene.js` | 🚀 Starting |
| Agent-2 | Phase 31: Visual Transitions & Polish | `TerminalUI.js`, `LocationScene.js` | � Starting |
| Agent-3 | Phase 31: Gameplay Loop Validation | `screens.js`, `GameState.js` | 🔧 Building |

### Rules
1. **Register** your task in the table above before starting
2. **Don't touch files** another agent is touching
3. **Run `cd game && npx vite build --mode development`** before marking code tasks complete
4. **Be proactive** — if you see something that would make the game better, do it

---

## 🔥 Highest-Impact Tasks

1. **Haggle Battle Polish** — Pokémon-style VS layout, animated gap bar, tactic feedback, round counter
2. **Mobile Spacing** — compact section headers, 44px option touch targets, stat grid layout
3. **Work Card Line Type** — visual artwork cards in market screen (tier-colored borders)
4. **Convert 5+ events to deep branching** — use `collector_dinner` as template
5. **NPC reputation consequences** — wire `npcEffects` into `resolveEventChoice()`
6. **Wire rooms into game loop** — `rooms.js` and `dialogue_trees.js` exist but aren't connected
7. **Sound design** — terminal click sounds, ambient gallery noise (Web Audio API)
8. **Tutorial / first-time experience** — guided first week for new players

---

## 📋 Agent-2 Plan: UX Polish, Haggle Aesthetics & Visual Bridge

### Stream 1: Pokémon-Style Haggle Battle Polish

Target layout:
```
┌─────────────────────┐
│  ┌─────┐   ┌─────┐  │
│  │ YOU  │   │ 🎭  │  │
│  │ 👤   │   │ELENA│  │
│  └──┬──┘   └──┬──┘  │
│     │  ⚔️ VS ⚔️  │     │
│ ────┴─────────┴──── │
│ YOUR OFFER: $50,000  │
│ THEIR ASK:  $80,000  │
│ ░░░░░████████░░░░░░  │
│ GAP: 37%  PAT: ❤️❤️🖤│
│ ─────────────────── │
│ ELENA: "Interesting" │
│                      │
│ ⚔️ CHOOSE TACTIC:   │
│ 🤝 Charm  (+chance)  │
│ 🗡️ Hardball (-pat)   │
│ 💰 Sweeten (+$5K)    │
│ 🏃 Walk Away         │
└─────────────────────┘
```

- [ ] **VS layout** — two character cards side by side, `⚔️ VS ⚔️` divider
- [ ] **Animated gap bar** — CSS transition on width when price moves
- [ ] **Tactic feedback** — text flash + dealer shake on pick (`@keyframes shake`)
- [ ] **Round counter** — `ROUND 2/5` prominently displayed
- [ ] **Success/fail reveal** — typewriter "✓ Success!" / "✗ Failed!" with color flash
- [ ] **Mobile spacing** — `padding: 12px 16px`, `min-height: 48px` per option

### Stream 2: Mobile Spacing & Touch Targets

- [ ] **Compact section headers** — reduce margin from `10px 0 2px` to `6px 0 0`
- [ ] **Option padding** — `padding: 10px 14px` on mobile (`min-height: 44px`)
- [ ] **Stat grid** — 2-column on wider screens (`grid-template-columns: 1fr 1fr`)
- [ ] **Collapsible stats** — show CASH + ACTIONS + NET WORTH by default, expandable
- [ ] **Scroll position memory** — restore scroll on popScreen

### Stream 3: Market & Collection Visual Prep

- [ ] **Work card line type** — `work-card` in TerminalUI: title, artist, price, heat as styled card
  - Gold border = blue-chip, Silver = mid-career, Teal = hot, White = emerging
- [ ] **Market screen redesign** — work-card layout instead of raw text
- [ ] **Gallery-view hook** — commented-out placeholder for Phase 29 visual grid

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Engine** | Phaser 3 (scene management only) |
| **Rendering** | DOM-based `TerminalUI.js` (all gameplay is styled text) |
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
│   ├── main.js                     # Entry point
│   ├── style.css                   # All styling
│   ├── data/                       # Game data modules
│   │   ├── artists.js, characters.js, contacts.js
│   │   ├── events.js, scenes.js, rooms.js
│   │   ├── dialogue_trees.js, calendar_events.js
│   │   ├── cities.js, backgrounds.js
│   │   └── haggle_config.js
│   ├── managers/                   # Game systems
│   │   ├── GameState.js, MarketManager.js
│   │   ├── PhoneManager.js, EventManager.js
│   │   ├── ConsequenceScheduler.js, DecisionLog.js
│   │   ├── DialogueEngine.js, DialogueTreeManager.js
│   │   ├── HaggleManager.js, QualityGate.js
│   │   └── (RoomManager.js — TODO)
│   ├── terminal/                   # UI layer
│   │   ├── TerminalUI.js           # Core renderer
│   │   └── screens.js              # 20+ screen functions
│   └── scenes/                     # Phaser scenes
│       ├── BootScene.js, MenuScene.js
│       ├── CharacterSelectScene.js, GameScene.js
│       ├── DialogueScene.js, LocationScene.js
│       └── EndScene.js
├── public/
│   ├── backgrounds/                # 9 pixel art backgrounds
│   ├── icons/                      # PWA icons
│   ├── manifest.json, sw.js
│   └── index.html
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
| Terminal UI (20+ screens, keyboard+touch) | ✅ |
| Save/Load (5 slots, auto-save) | ✅ |
| PWA (manifest, service worker, offline) | ✅ |
| Mobile layout (safe-area, touch targets, swipe) | ✅ |
| Typewriter screen transitions | ✅ |
| Pixel art backgrounds (9 scenes) | ✅ |
| Haggle Battle v1 (engine + screens) | ✅ |
| Scene system (`DialogueEngine`, 3 scenes) | ✅ |
| Rooms + dialogue trees (data files) | ✅ |
| Rooms wired into game loop | ❌ TODO |
| Inventory system | ❌ TODO |
| Sound design | ❌ TODO |
| Endgame reckoning (Week 26) | ❌ TODO |

---

## Active Roadmap

```
 NOW    Agent-2 Streams (haggle polish, mobile spacing, work cards)
  ↓     B4 (wire dialogue trees) → C1-C2 (room integration)
  ↓     Phase 14 (convert 10+ events to deep branching)
  ↓     Phase 15 (NPC depth — personalityTraits, rivalries, quest lines)
  ↓     Phase 16.5b (Haggle v2 — Pokémon feel, sprites)
  ↓     Phase 29 (Visual Gallery — Canvas-rendered artworks)
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

## 🚀 Phase 30: Phaser 3 Pokémon Battle Integration

> **Status:** APPROVED. We are pivoting the Haggle Battle to a full visual scene in Phaser 3. The pure-text version has been backed up to `Art-Market-Game-V1-Backup`.

**The Architectural Shift:**
Currently, `GameScene` just hosts the `TerminalUI` DOM element. For haggle battles, we will **pause/hide the DOM UI** and launch a dedicated **`HaggleScene` in Phaser**. This gives us Canvas pixel rendering, sprite animations, camera shakes, and particle effects without rewriting the whole game. `HaggleManager` remains the source of truth for battle state.

### Implementation Plan & Agent Tasks

#### 🔧 Agent-2: Core Engine & Scene Bridge (Lead)
- **Task 1:** Modify `HaggleManager.js` and `screens.js`. Instead of pushing HTML screens, they should dispatch an event to launch `HaggleScene` in Phaser.
- **Task 2:** Create `HaggleScene.js`. Set up the scene lifecycle (init, create, update). Receive state from `HaggleManager`.
- **Task 3:** Build the Scene Return mechanism — when the battle ends (deal or fail), destroy `HaggleScene` and unpause/reshow the terminal `GameScene`.

#### 🎨 Agent-1: Visual Arena & Assets (Support)
- **Task 1:** Modify `BootScene.js` to preload sprites: player sprite (`sprite_player.png`), dealer sprites (e.g., `portrait_elena.png`), and backgrounds (e.g., `bg_gallery.png`).
- **Task 2:** Add a `spriteKey` property to all dealers in `characters.js` / contact data so the scene knows which sprite to load.
- **Task 3:** In `HaggleScene`, draw the background, place the two sprites facing off, and implement the visual Gap & Patience bars using `Phaser.GameObjects.Graphics` (rectangles that tween their width).

#### ✨ Agent-3: Interactive UI & Animations (Support)
- **Task 1:** Build the Interactive UI in `HaggleScene`. Create a dialogue box overlay and the 4-button Tactic menu. This can be done via Phaser's `DOM Element` game objects or standard Phaser Text + Interactive Zones.
- **Task 2:** Wire the tactic buttons back to `HaggleManager.executeTactic()`.
- **Task 3:** Implement "Pokémon Animations". When a tactic is executed, add camera shakes, sprite tween impact effects, and typewriter text for the dialogue. Add logic in `haggle_config.js` to map tactics to specific animation types (e.g., Charm = hearts, Hardball = shake).

---

## 🏗️ Phase 31: Full Systems Integration

> **Status:** ACTIVE. Time to fuse the three distinct architecture pillars we've built into one cohesive gameplay loop.

**The Three Systems:**
1. **The DOM Hub (`TerminalUI`):** The dashboard, menus, portfolio, and phone system. This is our central routing station.
2. **The Visual Engine (`Phaser`):** Currently used for `HaggleScene`. We need to expand this to handle `LocationScene` and `DialogueScene` so events are fully visual.
3. **The Data Engine (`rooms.js`, `dialogue_trees.js`, `ConsequenceScheduler`):** The narrative brain that holds all the text, choices, and consequences.

**The Integration Goal:**
To seamlessly move from the DOM Dashboard → into a Phaser Visual Event (loading a room from `rooms.js` and running a conversation from `dialogue_trees.js`) → haggling over a piece of art → and returning to the DOM Dashboard with the portfolio updated.

### Execution Plan & Agent Tasks

#### 🔧 Agent-1: Data & Routing Wire-up (Lead)
- **Task 1:** Inspect how `dashboardScreen` in `screens.js` handles "Attend Event". Right now it pushes a DOM `sceneScreen`. Update this to trigger a Phaser transition (similar to the Haggle bridge).
- **Task 2:** Build or update `LocationScene.js` to read from `rooms.js`. It should load the correct background, draw the room's title, and place any present NPCs (using `characters.js`).
- **Task 3:** Plumb the `dialogue_trees.js` engine into the visual scene so clicking an NPC opens a visual dialogue box.

#### 🎨 Agent-2: Visual Transitions & Polish (Support)
- **Task 1:** Ensure smooth handoffs between `TerminalUI` (DOM) and `Phaser` (Canvas). The transition shouldn't flash black. Build a unified fade-in/fade-out mechanism.
- **Task 2:** Polish the `LocationScene` layout. Add UI for clicking to move between rooms or leaving the location.

#### ✨ Agent-3: Gameplay Loop Validation (Support)
- **Task 1:** Test the full loop end-to-end: Dashboard → Event → Dialogue → Haggle → Dashboard.
- **Task 2:** Fix any state sync issues (e.g., ensuring `GameState` properly saves after a Phaser scene ends).
- **Task 3:** Consolidate any obsolete legacy DOM screens (like the old text-based `roomScreen` or `eventScreen`) to clean up the codebase.

> **Next Step:** Agents will claim tasks and begin executing Phase 31.

---

## 🗺️ Phase 40: Overworld Exploration Engine

> **Status:** PLANNED. Expanding the Pokémon-style visual aesthetic into a full top-down explorable overworld.

**The Overworld Goal:**
Allow the player to physically walk around galleries, art fairs, and studios to interact with NPCs and artworks, fully replacing text-based menus for spatial exploration.

### Execution Plan & Agent Tasks

#### 🕹️ Agent-1: Core Physics & Tilemap Engine (Lead)
- **Task 1:** Set up `OverworldScene.js` as a new Phaser scene with Arcade Physics and camera follow logic.
- **Task 2:** Integrate Tiled JSON maps to render grid-based environments (walls, floors, collisions).
- **Task 3:** Implement 4-directional player movement (pixel-smooth or grid-locking) using a walking spritesheet.

#### 💬 Agent-2: Interaction & Dialogue (Support)
- **Task 1:** Add proximity triggers and interaction zones (e.g., facing an NPC and pressing action).
- **Task 2:** Pause the overworld and overlay a Pokémon-style dialogue box during interactions.
- **Task 3:** Wire interactions seamlessly into `dialogue_trees.js` and transition to `HaggleScene` when a deal starts.

#### 🎨 Agent-3: Assets & Aesthetics (Support)
- **Task 1:** Source or generate top-down 8-bit Noir tilesets and character sprite sheets.
- **Task 2:** Build out intricate Tiled maps for key locations (Chelsea Gallery, Artist Studio).
- **Task 3:** Add ambient polish (idle animations, rendering layers, lighting/shadows).

> **Next Step:** Agent-1 to begin setting up `LocationScene.js` and movement mechanics.

---

## 🏙️ Phase 41: City Hub & World Expansion

> **Status:** PLANNED. Connecting all indoor locations through a massive, persistent outdoor city tilemap for a true RPG feel.

**The World Hub Goal:**
Escalate the game from isolated rooms into a physical city block. Players spawn in the city (e.g. outside their apartment), walk the streets to the gallery, or catch a taxi to the airport.

### Execution Plan & Agent Tasks

#### 🕹️ Agent-1: World Engine & Maps (Lead)
- **Task 1:** Build `CityScene.js` to load the massive outdoor city tilemap (using the Kenney Urban pack).
- **Task 2:** Implement Doorway Warps — walking into the gallery door seamlessly loads `LocationScene` interiors.
- **Task 3:** Configure persistent tracking for `GameState.state.playerLocation` so leaving a building spawns you outside its specific door.

#### 💬 Agent-2: Fast Travel & World Logic (Support)
- **Task 1:** Place Taxi NPCs/Objects around the city that trigger a Fast Travel Dialogue menu (e.g. "Take me to Teterboro FBO").
- **Task 2:** Time mechanics: Ensure walking or taking a taxi advances the game clock/week state appropriately.
- **Task 3:** Wire up the Apartment building as the player's primary hub/save point.

#### 🎨 Agent-3: Urban Asset Integration (Support)
- **Task 1:** Download and configure the Kenney RPG Urban Pack (`roguelike-city` or similar) to ensure aesthetic consistency with `LocationScene`.
- **Task 2:** Build the master `CityMap.json` in Tiled, laying out the streets, the Chelsea gallery district, and the airport helipad.
- **Task 3:** Add ambient city polish (animated cars, pedestrians, day/night color tinting).

> **Next Step:** Agents will claim tasks and begin executing Phase 41.
