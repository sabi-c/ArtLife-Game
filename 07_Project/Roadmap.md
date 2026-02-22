# ArtLife — Development Roadmap & Task Tracker

> **Source of truth for what's built, what's next, and what's planned.**
> Agents: read this before starting any work. Update your section when you start AND complete tasks.

---

## Current State (2026-02-22)

**Tests:** 36/36 unit, 53/53 flow — all green
**Build:** Clean (no new warnings)
**Branch:** `main`
**Deployed:** Cloudflare Pages

### Recently Completed
- **Sprint: Module Hardening & Architecture** — Full DialogueEngine rewrite with 5-tone system (Friendly/Schmoozing/Direct/Generous/Ruthless), tone tracking, condition evaluation, effect application (75→370 LOC). MarketManager.tick() wired into WeekEngine pipeline (prices now actually fluctuate weekly). MarketStore fleshed out with price history, artist snapshots, weekly news generation. InventoryStore expanded with provenance tracking. ConsequenceStore made persistent with full queue management. TerminalAPI updated with all store references. Fixed missing useEventStore import in WeekEngine.
- **Mobile Admin Dashboard** — AdminFAB floating button for touch devices, responsive full-screen layout on mobile, 44px touch targets, Phaser Plugin Inspector for dev-only debugging.
- **Dashboard HUD Upgrade + World Map + User Profiles & Auth** — Rich header panel (character info, city, week, net worth trend), side-by-side Financials+Stats on desktop, warning bar for elevated anti-resources, styled pipeline panel, clickable world map cities with event markers (◈ fair, ◆ auction, ● event), travel-from-map with AP confirmation, PBKDF2 password-protected user profiles (`ProfileManager.js`), profile-scoped save slots, profile create/login/guest flows in `TerminalLogin.jsx`, Switch Agent + Delete Agent in system menu, ~100 lines new CSS
- **Calendar & Time UI + Variable Action Costs** — Action budget panel with gold pip bar (4 AP), calendar strip showing upcoming art world events, variable AP costs (1 AP cheap / 2 AP expensive actions), `[AP]` labels on all options, priority "WEEK COMPLETE" CTA when exhausted, ~90 lines new CSS
- **Screen Audit Bug Fixes (7)** — Fixed initGame reference in character.js, ConsequenceScheduler imports in events.js + journal.js, dead code in phone.js, market.js inspect guard, dashboard.js sparkline null safety, system.js restart/return-to-title
- **MVP Sprint: Quick Wins** — Fix restart option, add "Return to Title", auto-checkpoint saves after every action and week advance, terminal sound effects (hover/select/typewriter via WebAudioService), Quick Start demo option on title screen, cloudflare tunnel script for mobile testing
- **Session Persistence** — Auto-resume from most recent save on page reload. Skips TerminalLogin, loads GameState, pushes dashboardScreen. `VIEW.TERMINAL` state in App.jsx router. All Phaser scene exits emit `UI_ROUTE: TERMINAL`.
- **Haggle Battle Polish** — Multi-step tactic animations (coin rain, hex-shield, slash lines, heart cascade, shadow bluff), player lunge, dealer hit reactions, type effectiveness flashes, smooth bar tweening
- **Dialogue Scene Visual Upgrade** — DialogueBox.jsx rewritten with inline styles (was broken Tailwind), back buttons added to HaggleScene + MacDialogueScene
- **Weekly Report Screen** — `weekReportScreen()` shows financial deltas, market shifts, headlines, messages, and anti-resource warnings after each week advance
- **4 New NPC Dialogue Trees** — Lorenzo Gallo (mega-dealer gatekeeper), Charles Vandermeer (speculator), Kwame Asante (deep artist trust tree with item rewards), Marcus Price (data-driven advisor)
- **Artwork Pool Expanded** — 16 → 28 works. Added Richter, Fontana, Soulages (classic), Okafor, Dao, Voss, Asante (mid-career), Molina×2, Herrera, Zhang, Reyes (speculative). Artworks tie into dialogue tree narratives.
- **Phase 2.7 Code Audit** — all 8 refactoring tasks complete (GameState split, PhoneManager→NPCMemory, GameEventBus, events split, shuffle/id utils)
- **Venue Flow System** — venue picker, room exploration with time budget, NPC talk with dialogue trees, eavesdrops, stat-gated exits
- **Dev Test Toolbar** — bottom-left buttons to jump directly into Haggle Battle, Dialogue Scene, or SceneEngine test
- **Phase 3D JSON Data Layer** — PhoneStore, CalendarStore, SceneEngine completed (by ClaudeCode agent)
- Save/Load fully wired: TitleScene save slot picker, auto-save after character creation, demo seed profile
- Ego Terminal v2 dashboard (sparklines, stat bars, market intelligence, pipeline)

---

## What's Built (Completed Phases)

### Phase 0 — Setup & Scaffolding ✅
- Vite 5 + Phaser 3.87 + React 19 + Zustand 5 + GridEngine 2.48
- 12 Phaser scenes, 7 managers, 15 data files
- Git repo, Cloudflare Pages deployment, PWA

### Phase 1a — Core Loop ✅
- Terminal UI (30+ screens, keyboard + touch, screen stack)
- Phone UI with messages, NPC contacts, unread counts
- Buy/sell works, portfolio tracking, market states (bull/bear/flat)
- Oregon Trail event pacing (~75% event/turn)
- 4 character classes (Nepo Baby, Hedge Fund, Flipper, Insider)

### Phase 1b — Art World Database ✅
- 49+ events across 7 categories
- 16 NPC contacts with phone/favor system
- Anti-resource system: marketHeat, suspicion, burnout, flipHistory, dealerBlacklisted
- Gallery buyback simulation + flipper price penalties

### Phase 2 — Deep Systems / RPG Mechanics ✅
- `QualityGate.js` — stat-gating with blue options
- `ConsequenceScheduler.js` — delayed effect queue with conditional triggers
- `DecisionLog.js` — rich decision journal with tags/NPC links
- NPC memory + autonomous tick (favor decay, memory-aware messages)
- Burnout anti-resource with forced rest at threshold
- S.P.E.C.I.A.L. stat system (HYP/TST/AUD/ACC + intel)
- 6-phase character creator (archetype→stats→traits→drip→vice→name)

### Phase 2.5 — V2 Architecture & UI Overhaul ✅
- Terminal refactored into modular screen files (`screens/*.js`)
- `TerminalAPI.js` facade for all data access
- React ErrorBoundary wrapping entire tree
- `window.ArtLife` global error registry
- `window.game.debug()` full debug snapshot API
- Scene transition system (iris wipe via geometry mask)
- `StateMachine.js` — queued FSM for scene phases
- `Controls.js` — null-safe keyboard with lockInput
- `scene-keys.js` — frozen scene key constants
- Ego Terminal v2 dashboard with:
  - Financials panel (sparkline, market dot indicator)
  - Stats panel (2x2 progress bars: HYP/TST/AUD/ACC)
  - Market Intelligence (procedural flavor news + real newsFeed)
  - Pipeline, World Map, ticker bar
- Haggle Battle v3 (Pokemon-style visual, type attributes, DOM overlay)
- 1-bit Macintosh dialogue scene
- LocationScene (room navigation with items/NPCs/eavesdrops)
- OverworldScene (top-down GridEngine movement)
- CityScene + FastTravelScene (taxi system)
- 16 artworks (5 classic, 5 mid-career, 6 speculative)
- Dialogue trees for Elena Ross + Philippe Noir
- Save/Load (5 slots, auto-save, migration)
- Barbara Kruger ticker system

---

## ✅ Phase 2.7 — Code Audit Refactoring (COMPLETE)

> **Goal:** Execute the refactoring priorities from `Code_Audit.md` before building V2 systems. This clears the path for the Zustand migration and prevents architectural debt from compounding.
> **Completed:** 2026-02-21 — all 8 tasks done, build clean, tests passing.

| # | Task | Status | Priority |
|---|---|---|---|
| 1 | Split `GameState.js` → `GameState.js` + `DealResolver.js` + `WeekEngine.js` | ✅ Done | 🔴 Critical |
| 2 | Split `PhoneManager.js` → `PhoneManager.js` + `NPCMemory.js` | ✅ Done | 🔴 Critical |
| 3 | Add try/catch isolation to `WeekEngine.advanceWeek()` | ✅ Done | 🔴 Critical |
| 4 | Fix cross-manager mutation in `MarketManager.tick()` | ✅ Done | 🟡 Moderate |
| 5 | Replace `window.toggleEgoDashboard` with `GameEventBus` | ✅ Done | 🟡 Moderate |
| 6 | Fix shuffle bias (`utils/shuffle.js`) | ✅ Done | 🟢 Minor |
| 7 | Create shared ID generator (`utils/id.js`) | ✅ Done | 🟢 Minor |
| 8 | Split `events.js` by category → `data/events/*.js` | ✅ Done | 🟢 Minor |

> [!NOTE]
> **All tasks verified.** Build clean (`npx vite build`), no regressions. New files: `NPCMemory.js`, `DealResolver.js`, `WeekEngine.js`, `utils/shuffle.js`, `utils/id.js`, `data/events/{social,market,drama,personal,travel,opportunity,scandal,chain,index}.js`.

> [!TIP]
> **Research Audit Complete.** See `Reference_Tools_Research.md` for full findings. Two critical integrations identified for Phase 3+:
> - **`inkjs`** (npm) — Industry-standard narrative scripting engine for `.ink` scripts.
> - **`react-flow`** (npm) — Node-based visual editor for the CMS.

---

## User Testing Notes (2026-02-21)

> Feedback from manual playtesting session after Phase 3A venue flow + dev toolbar.

| Observation | Priority | Where to Fix |
|---|---|---|
| **Week advance needs a notification/report** — clicking "Advance Week" should show a summary of what happened (deals resolved, NPC messages, market shifts, events triggered). Should pull from real data and look polished. | 🔴 High | `dashboard.js` → new `weekReportScreen`, `WeekEngine.js` → collect report data |
| **Time/calendar/week system needs buildout** — the current week counter is too minimal. Need a proper calendar that shows upcoming events, scheduled consequences, art fair dates. | 🟡 Medium | Phase 3D CalendarStore (done), needs UI integration |
| **Venue flow foundation is solid** — Gallery Opening walkthrough with rooms, NPCs, items, eavesdrops works well. Good base to build on. | ✅ Positive | — |
| **Haggle battle looks good** — Pokemon-style negotiation is working and fun. | ✅ Positive | — |
| **Haggle battle needs action animations** — when an action is called, sprites should animate (items thrown across, shake effects, visual feedback). Needs sprite animation system + thrown-item assets. | 🟡 Medium | `HaggleScene.js` — add tween/particle effects per tactic, sprite sheet animations |
| **Dialogue trees need depth** — multiple branching parts, real options with consequences, item rewards. Build one comprehensive tree as the gold standard. | ✅ Done | Kwame Asante tree (20+ nodes, 3 item rewards). Template in `07_Project/Dialogue_Tree_Template.md` |
| **Dialogue presentation needs Pokemon-style upgrade** — typewriter text, dual portrait layout (player left, NPC right), speaker differentiation, visual novel feel. Should look similar to haggle battle UI but for conversation. | 🔴 High | `MacDialogueScene.js` — add dual portrait zones, name labels, typewriter pacing |
| **Weekly report needs richer content** — show decisions made, inventory changes, dialogue outcomes, event results, not just financials. Make it feel like a real weekly debrief. | 🟡 Medium | `weekReportScreen` in `dashboard.js` — integrate `DecisionLog`, inventory, more `WeekEngine` data |
| **Session persistence (page reload)** — reloading the page should restore the player to their last screen (dashboard, venue, etc.), not restart from title. Need scene-level state tracking. | 🟡 Medium | `GameState.state.currentScreen` + auto-restore on boot |
| **Dev test buttons need better mapping** — Dialogue button should trigger a real dialogue tree scene. All Phaser scenes should have clear back/ESC to return to terminal. | ✅ Done | Dialogue button now launches multi-line Elena Ross conversation. ESC exits all scenes. |

---

## 🔴 Phase 3 — Foundation & Infrastructure (CURRENT)

> **Goal:** Harden the foundation systems that everything else depends on. Make the game loop robust enough that content can be dropped in without rewiring.
> **Prerequisite:** Phase 2.7 code audit refactoring complete ✅.

### 3A. Scene Flow & Navigation Hardening
| Task | Status | Notes |
|---|---|---|
| Wire `dialogue_trees.js` into full venue flow (B4) | ✅ Done | NPC talk screen shows dialogue tree topics, launches DialogueScene or fallback terminal renderer. Topic-based small talk with favor gain. NPC met tracking. |
| Wire rooms into EventManager + GameState (C1) | ✅ Done | Time budget system: venues have `timeLimit`, rooms have `timeCost`, time bar displayed in header. Action cost on venue entry. onEnter effects, eavesdrop unlocks, flags all wired. |
| Full venue flow test (Dashboard→Venue→Dialogue→Haggle→Dashboard) (C2) | IN PROGRESS | Venue picker → venue detail → room explore → NPC talk → dialogue tree all working. Manual testing ready. |
| **Weekly Report Screen** — show summary after advancing week | ✅ Done | `weekReportScreen()` in dashboard.js. Shows financial deltas, market shifts, headlines, new messages, anti-resource warnings. Powered by `WeekEngine.lastReport`. |
| Overworld refactor: extract `Player.js`, `NPC.js`, `MapManager.js` | TODO | Phase 40.5 plan exists in README |
| Doorway warps (OverworldScene → LocationScene interiors) | TODO | |
| Persistent spawn tracking across scene transitions | TODO | `GameState.state.playerLocation` exists but underused |

### 3B. Developer Tools
| Task | Status | Notes |
|---|---|---|
| Dev Test Toolbar (bottom-left quick-launch buttons) | ✅ Done | `[ SceneEngine ]` `[ Haggle Battle ]` `[ Dialogue ]` — jump to any Phaser scene from anywhere |
| Admin Narrative Dashboard (God Mode via `~` key + mobile FAB) | ✅ Done | Spec: `Admin_Narrative_Tracker_Spec.md`. Mobile: floating DEV button (AdminFAB), responsive full-screen layout, 44px touch targets. |
| Consequence Queue visualizer | ✅ Done | Read from `ConsequenceScheduler` |
| NPC Memory Matrix panel | ✅ Done | Show hidden grudges/favors/witnessed |
| State Importer (JSON dropzone for late-game testing) | ✅ Done | |
| Global Flags / Decision viewer | ✅ Done | Read from `DecisionLog` |
| **Content Management Studio (CMS)** | TODO | Spec: `Content_Management_Studio_Spec.md` |
| CMS: Content Library panel (searchable entity tree) | TODO | NPCs, Events, Items, Scenes, Artists |
| CMS: Timeline panel (drag events onto 40-year calendar) | TODO | Visual scheduling with zoom |
| CMS: Wiring Inspector (entity connection editor) | TODO | Add/remove NPCs from scenes, set gates |
| CMS: Consequence Chain Previewer | TODO | Simulate downstream effects of any event |
| CMS: File Loader (auto-import from `data/` directory) | TODO | Vite HMR hot-reload support |

### 3C. Core System Gaps
| Task | Status | Notes |
|---|---|---|
| **Calendar & Time UI** | ✅ Done | Action budget pip panel (4 AP), calendar strip with upcoming events, variable AP costs (1/2), `[AP]` labels, priority advance CTA. New CSS: `db-action-*`, `db-cal-*` |
| **Variable Action Costs** | ✅ Done | `useAction(label, cost=1)`, `hasActions(cost=1)`, MAX_ACTIONS=4. Haggle/sell/art fair=2 AP, browse/visit/call=1 AP |
| **Progressive Disclosure** | ✅ Done | Early (wk 1-4): core loop only. Mid (5-12): +venues, travel, journal, ego dash. Late (13+): +inventory, overworld, retire. Unlock tease messages in dashboard. |
| **Calendar Events Attendance** | ✅ Done | `calendarEventScreen()` — attend art fairs, auctions, biennales from dashboard. Tier-scaled stat rewards, NPC encounters, entry costs. Browse works at fairs/auctions. |
| Tone system for NPC dialogues (5 tones from Roadwarden) | ✅ Done | DialogueEngine rewrite: Friendly/Schmoozing/Direct/Generous/Ruthless. Tone tracking per conversation, persistent `toneHistory` in GameState. |
| Week 20 character specialization (dominant tone → perk) | ✅ Done | `DialogueEngine.getSpecialization()` — dominant tone after Week 20 grants perk via `TONE_SPECIALIZATIONS`. |
| Progressive disclosure (UI reveals through gameplay) | ✅ Done | Early (wk 1-4)/Mid (5-12)/Late (13+) phases with option gating. |
| Inventory system | ✅ Done | Items beyond artworks |
| **Dialogue Scene Visual Upgrade** | ✅ Done | Pokemon-style dual portrait layout (player L, NPC R), typewriter text, speaker name labels. DialogueBox.jsx rewritten with inline styles. Back buttons on both HaggleScene and MacDialogueScene. |
| **Session Persistence** | ✅ Done | Auto-resume from `artlife_last_slot` on page reload. Added `VIEW.TERMINAL` to views.js. App.jsx checks `getMostRecentSlot()` on mount, auto-loads save, pushes dashboardScreen. All Phaser scene exits emit `UI_ROUTE: TERMINAL`. |
| **Haggle Battle Animations** | ✅ Done | Multi-step tactic animations per type: coin rain (financial), hex-shield (logical), slash lines + sparks (aggressive), heart cascade (emotional), shadow eyes (bluff). Player lunge, dealer hit reactions, type effectiveness flashes ("SUPER EFFECTIVE!"), smooth bar tweening. |
| **Juice & Sound Design** | PARTIAL | Terminal SFX wired (hover/select/typewriter via WebAudioService). Remaining: ambient gallery noise, market crash glitch, Phaser scene sounds |
| **Systemic Lattice Triggers** | TODO | Wire `subscribeWithSelector` for Fail States (Informant/Auteur arcs) |
| **NPC Memory Modules** | TODO | Log interactions per NPC for `inkjs` narrative branching |

### 3D. JSON Data Layer (Content Authoring Foundation)
> See `Core_Loop_Systems_Spec.md` for full JSON schemas.

| Task | Status | Notes |
|---|---|---|
| Build `PhoneStore.js` | COMPLETE | Notification engine with urgency levels and interruption mechanics |
| Build `CalendarStore.js` | COMPLETE | Timeline engine that fires `ScheduledEvents` on week advance |
| Build `SceneEngine.js` | COMPLETE | Generic React component rendering JSON narratives (bg, npcs, choices) |
| Build `NPCRegistry.js` | ✅ Done | Expanded into `npcStore.js` (Zustand), subsuming `NPCMemory.js` & `PhoneManager` contacts |
| Build `EventRegistry.js` | ✅ Done | Event trigger conditions, consequences, and follow-up scheduling |
| Build `InventoryStore.js` | ✅ Done | Tracks owned items (artworks, documents, contraband) with provenance |
| Build `MarketEngine.js` | ✅ Done | MarketManager.tick() wired into WeekEngine. MarketStore tracks price history, artist heat snapshots, weekly news. Buyback simulation, flipper penalties, market cycle transitions all active. |

---

## Phase 4 — Architecture & Endgame Buildout (CURRENT HORIZON)

> **Goal:** Transition from a prototype into a robust, scalable game engine that can support massive endgame narratives and procedural content layers without breaking.

### 4A. The Zustand Bedrock & Strict UI Routing
| Task | Status | Notes |
|---|---|---|
| Create `gameStore.js` (Full State Migration) | TODO | Replace `GameState` singleton block |
| Convert `MarketManager` & `HaggleManager` | TODO | Pure utility functions mapping to Zustand |
| Refactor `App.jsx` React UI Router | TODO | Enforce `activeView` instead of raw DOM manipulations |
| Save/Load Centralization | TODO | A master payload bundling all Zustand stores into localstorage |

### 4B. The Content Asset Pipeline
| Task | Status | Notes |
|---|---|---|
| JSON Asset Migration | TODO | Convert massive `.js` arrays (`artworks.js`, `events.js`) into `.json` files |
| The Boot Loader (`BootScene.js`) | TODO | Asynchronously parse and validate JSON payloads before `TitleScene` mounts |

### 4C. Narrative Depth (Pacing & Tones)
| Task | Status | Notes |
|---|---|---|
| The 4-Tone Dialogue System | TODO | Aggressive, Professional, Casual, Mysterious player stances |
| The Memory Matrix Wiring | TODO | Connect `npcStore` Favors/Grudges dynamically into node text |
| Variable Text Parsing | TODO | Support syntax like `{last_purchased_art}` directly in narrative strings |
| Interpretible `WeekEngine.js` Pacing | TODO | Visual day-by-day week transitions that pause for emergency events |

### 4D. The Week 26 Reckoning (Endgame)
| Task | Status | Notes |
|---|---|---|
| Week 26 Cutoff Trigger | TODO | Hard cap the sandbox loop at Week 26 |
| The Museum Retrospective | TODO | Prestige narrative sequence (requires high Rep/Taste) |
| The SEC Investigation | TODO | Prison sequence (requires high Cash/Heat) |
| The Shadow Broker | TODO | Underground syndicate sequence (requires high Intel) |

---

## Phase 5 — The Content Factory & Procedural Ecosystems

> **Goal:** Once the JSON pipeline is solid, we need tooling and dynamic simulation to make the world breathe and feel infinite.

| Task | Status | Notes |
|---|---|---|
| Visual Node CMS Editor | TODO | React Flow-based desktop tool to auth & export dialogue JSONs visually |
| Dynamic AI Rival Collectors | TODO | AI NPCs that bid on and remove global market artworks during the tick |
| The Scandal & Hype Engine | TODO | News events that dynamically multiply/tank base modifier values |
| Procedural SVG Art Certificates | TODO | Algorithmic "Certificates of Authenticity" graphics for artworks |

---

## Phase 6 — Polish, Audio & Analytics

> **Goal:** Final polish layer before sharing the MVP with external playtesters.

| Task | Status | Notes |
|---|---|---|
| Tactile Audio Implementation | TODO | `WebAudioService` for typewriter clacks, auction gavels, startup hums |
| Keyboard-First Navigation | TODO | Arrow Key + Enter mapping across the Ego Dashboard and Terminal |
| Asynchronous Leaderboards | TODO | Firebase POST integration to upload Week 26 final values globally |

---

## Phase 6 — Polish & Release

| Task | Status |
|---|---|
| Full pixel art pass (portraits, backgrounds, UI) | TODO |
| 8-bit noir visual effects (CRT overlay, scanlines, grain) | TODO |
| **Comprehensive UI & Data Audit (Anti-Cheat / Security)** | TODO | Conduct deep research into securing state against DOM manipulation/cheating |
| Sound design (chiptune/ambient + SFX) | TODO |
| Tutorial / onboarding (guided first week) | TODO |
| Playtesting & balance (market math, event frequency) | TODO |
| Endgame reckoning (Week 26+: museum retrospective, SEC investigation, legacy) | TODO |
| Publish on itch.io | TODO |

---

## Stretch Goals

| Feature | Notes |
|---|---|
| Multiplayer auction mode | Competitive bidding against other players |
| Procedural artist generation | Infinite content from templates |
| Full 5-location world | Venice, Hong Kong, Sao Paulo |
| Economic warfare | Short selling, rumor mill, crash events |
| Board seats & art fund management | Late-game institutional mechanics |
| Steam release | Electron or Tauri packaging |

---

## Source Document Index

| Folder | Files | Use For |
|---|---|---|
| `01_Overview/` | Game_Concept, Vision_Statement | High-level design intent |
| `02_Mechanics/` | Market_System, Phone_Contacts, Time_System, Turn_Engine | System design reference |
| `03_Characters/` | Character_Classes, Perks_and_Bonuses | Character content |
| `04_Events/` | Event_Types, Scenarios, Venue_Encounters, Dialogue_Trees(_V2) | Narrative content |
| `05_World/` | Locations, Free_Ports, Room_Schema, Rooms/ | World building |
| `06_Economy/` | Art_Valuation | Economic model |
| `07_Project/` | **This file**, README, Implementation_Plan, MVP_Definition, UI_and_Dynamic_Systems_Spec, Admin_Narrative_Tracker_Spec, **Dialogue_Tree_Template**, Phase_4_Multi_Agent_Orders, Content_Templates, Brainstorm_Notes, Email_and_Walkaround_UI_Spec, UI_Architecture_and_Modularity_Spec | Project management |

---

## Agent Notes

### Workflow
1. Check this Roadmap for your next task
2. Mark task as IN PROGRESS in the table above
3. Read relevant source docs from the index
4. Implement, test (`npm test` + `npm run test:flow`)
5. Mark task as DONE, note any follow-ups
6. If you spec something new, create a file in `07_Project/` and link it here

### Key Conventions
- All CSS classes for new features use a consistent prefix (e.g., `db-` for dashboard, `haggle-` for battle)
- Terminal screens return `{ lines, options, footerHtml }` — use `type: 'raw'` for HTML injection
- `TerminalAPI` is the data facade — screens should never import managers directly
- Tests must stay green: 36/36 unit + 53/53 flow

---

#project #roadmap #planning #game-design
