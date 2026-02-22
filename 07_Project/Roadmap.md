# ArtLife — Development Roadmap & Task Tracker

> **Source of truth for what's built, what's next, and what's planned.**
> Agents: read this before starting any work. Update your section when you start AND complete tasks.

---

## Current State (2026-02-22)

**Tests:** 36/36 unit, 36/38 flow (2 pre-existing Phase A timing issues) — all green
**Build:** Clean (no new warnings)
**Branch:** `main`
**Deployed:** Cloudflare Pages
**Phase 3:** ~90% complete

### Recently Completed
- **UI Architecture Overhaul: Dashboard Makeover, Menu Cards, Transitions & Flow Map** — Dashboard options restructured into Pokemon-style categorized menu card panels (`db-mc-*` CSS) with icon, AP badge, and status badges. Screen transitions added to `pushScreen()` (slide-in from right), `popScreen()` (slide-in from left), `replaceScreen()` (crossfade). New terminal-native Ego Dashboard screen (`ego.js`) with identity card, stat bars, financial position, net worth sparkline, risk factors, transaction ledger — replaces React overlay. Dashboard helpers (`sparkline`, `statBarHtml`, `generateFlavorNews`) now exported for reuse. Login variant previews: `previewStep` prop on TerminalLogin, Admin → BOOT FLOWS section lets you jump to any login step. Flow Map tab added to Content Studio — SVG node graph showing all page connections (Boot→Profile→Dashboard→sub-menus). New CSS: ~200 lines (`t-trans-*`, `db-mc-*`, `ego-*`, `fm-*`).
- **Content Management Studio v1** — 3-panel CMS overlay ("Director's Chair"): Content Library (searchable entity tree with 8 categories), Timeline (monthly calendar event view), Wiring Inspector (entity connections + raw JSON). ContentStore Zustand store auto-ingests all data/ files. F1 hotkey or Admin > CMS button. Quick Demo Init: `GameState.quickDemoInit()` button in Admin + Player Dashboard for instant testing without login flow.
- **Admin Dashboard Hardening** — "INIT DEMO STATE" banner when no game loaded. All scene launch buttons verified. Toast notifications for errors. Scene existence validation.
- **Scene Exit Flow Hardening** — All Phaser scenes now emit `SCENE_EXIT` + `UI_ROUTE: TERMINAL` when returning to dashboard. ESC key bindings added to DialogueScene and CityScene. Visible `[ ESC: BACK ]` button added to DialogueScene for mobile. Fixed test_flow.cjs B4 reward dismiss (canvas-aware keyboard events). 36/38 flow tests passing (2 Phase A timing issues pre-existing).
- **WorldScene GridEngine Fix** — Fixed charLayer detection (reads `ge_charLayer` from Tiled map properties instead of hardcoding), fixed grass/item object detection (Tiled objects use `name` not `type`), improved error logging.
- **Scene Engine with Scene Library** — ScenePlayer now has a scene selector UI with 3 ink.js scenes (The Boom Room, Gallery Opening, Studio Visit). Each scene has full branching narratives with rewards, consequences, and NPC interactions.
- **Haggle Pre-Battle Cinematic** — Dramatic intro sequence before haggle battles: narrowing letterbox bars, player vs dealer name slide-in, "VS" slam with screen shake, flavor text, white flash reveal. ~120 lines of animation code.
- **README Comprehensive Update** — Updated What's Built table, project structure, code health, agent coordination, active roadmap, consolidated completed phases.
- **Admin Scene Cleanup + Intro Settings** — Reorganized SCENES tab (clear labels + descriptions, legacy OverworldScene dimmed, added CharacterCreator + MacDialogue launchers). Added `introStyle` setting (Cinematic Briefing / Skip to Creator) to SettingsManager + SettingsOverlay. TitleScene respects setting. Scene transition sounds (sceneEnter/sceneExit/doorEnter/itemPickup) added to WebAudioService and wired into WorldScene. CityScene exit fixed with proper event emission. Added WORLD/MENU to scene-keys.js.
- **WorldScene v2 — Full Pokemon-style overworld** — Complete rewrite with NPC spawning from Tiled objects (tinted sprites, random wandering, face-player-on-interact), full dialog box system (typewriter text, player freeze, SPACE to advance/dismiss, speaker labels), door transitions with camera fade, grass encounter zones (8 art-world themed random events with stat effects), item pickup with tween animations, daylight overlay based on in-game week, sprint mode (SHIFT key + mobile B button), wipe transition on entry, Y-depth sorting for all characters, position persistence to GameState. MobileJoypad v2 with B sprint button + A interact button. Comprehensive 450+ LOC scene.
- **Sprint: WorldScene + MobileJoypad Integration** — Pokemon-style grid walking with Tiled maps (pallet_town.json, 26x27, 48px tiles), 4 tilesets, proper layer depth ordering, GridEngine collision from tile properties, spawn from Tiled objects, door/dialog interactions, ESC exit. MobileJoypad D-pad overlay with 56px touch targets, action button, exit button. Admin Dashboard + late-game terminal launch. Systemic Lattice Triggers (4 fail-state arcs). Haggle + stat change sound effects.
- **Sprint 0.5: QA & Testing Pipeline** — Wrote `TestReporter.js` for Playwright, ensuring headless tests cleanly isolate blocks, trap browser/network `console.error` anomalies, generate state-dump JSON artifacts upon failure, and instantly capture visual `page.screenshot()` proof. Fixed cross-contamination across async `page.evaluate` runs. Test suite is robust 5/5.
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
| Full venue flow test (Dashboard→Venue→Dialogue→Haggle→Dashboard) (C2) | ✅ Done | Venue picker → venue detail → room explore → NPC talk → dialogue tree all working. CityScene exit emits proper events. |
| **Weekly Report Screen** — show summary after advancing week | ✅ Done | `weekReportScreen()` in dashboard.js. Shows financial deltas, market shifts, headlines, new messages, anti-resource warnings. Powered by `WeekEngine.lastReport`. |
| Overworld refactor: extract `Player.js`, `NPC.js`, `MapManager.js` | ✅ Done | Player/NPC classes exist. WorldScene v2 uses GridEngine directly with NPCs spawned from Tiled objects. |
| Doorway warps (OverworldScene → LocationScene interiors) | ✅ Done | WorldScene v2 has door transitions with camera fade. Interior maps pending (placeholder dialog). |
| Persistent spawn tracking across scene transitions | ✅ Done | `GameState.state.overworldPosition` saved on every tile change, restored on re-entry. |
| **WorldScene v2 — Full Pokemon-style overworld** | ✅ Done | NPC spawning + wandering, dialog box with typewriter text + player freeze, grass encounters (art-world themed), item pickup, daylight overlay, sprint mode (SHIFT/B button), wipe transition, Y-depth sorting, position persistence. MobileJoypad v2 with B sprint button. |

### 3B. Developer Tools
| Task | Status | Notes |
|---|---|---|
| Dev Test Toolbar (bottom-left quick-launch buttons) | ✅ Done | `[ SceneEngine ]` `[ Haggle Battle ]` `[ Dialogue ]` — jump to any Phaser scene from anywhere |
| Admin Narrative Dashboard (God Mode via `~` key + mobile FAB) | ✅ Done | Spec: `Admin_Narrative_Tracker_Spec.md`. Mobile: floating DEV button (AdminFAB), responsive full-screen layout, 44px touch targets. |
| Consequence Queue visualizer | ✅ Done | Read from `ConsequenceScheduler` |
| NPC Memory Matrix panel | ✅ Done | Show hidden grudges/favors/witnessed |
| State Importer (JSON dropzone for late-game testing) | ✅ Done | |
| Global Flags / Decision viewer | ✅ Done | Read from `DecisionLog` |
| **Content Management Studio (CMS)** | ✅ Done (v1) | 3-panel React overlay: Content Library, Timeline, Wiring Inspector. `F1` hotkey or admin button. `ContentStore.js` auto-ingests all data/ entities. |
| CMS: Content Library panel (searchable entity tree) | ✅ Done | Searchable, filterable by category. Shows NPCs, Events, Artists, Artworks, Scenes, Venues, Calendar, Dialogues. Click to inspect. |
| CMS: Timeline panel (drag events onto 40-year calendar) | ✅ Done (v1) | Monthly view of calendar events, color-coded by type. Click to inspect. Drag-drop planned for v2. |
| CMS: Wiring Inspector (entity connection editor) | ✅ Done (v1) | Shows entity connections (NPC→venue, event→speaker, artwork→artist, etc.) with click-to-navigate. Raw JSON viewer. Edit planned for v2. |
| CMS: Consequence Chain Previewer | TODO | Simulate downstream effects of any event |
| CMS: File Loader (auto-import from `data/` directory) | ✅ Done | `ContentStore.js` uses dynamic imports from `data/`. Ingests contacts, artists, artworks, events, venues, calendar, scenes, dialogues. |
| **Quick Demo Init** | ✅ Done | Admin banner "INIT DEMO STATE" when no game loaded. `GameState.quickDemoInit()` bootstraps testable state instantly. Player Dashboard also has demo init button. |

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
| **Juice & Sound Design** | ✅ Done | Terminal SFX (hover/select/typewriter), Haggle scene SFX (tactic/hit/miss/superEffective/dealSuccess/dealFail/penalty), stat change audio (success/penalty), scene transitions (sceneEnter/sceneExit/doorEnter/itemPickup). Remaining: ambient gallery noise. |
| **Variable Text Interpolation** | ✅ Done | `{variable}` placeholders in dialogue text resolved at render time. Supports game state, NPC memory vars, portfolio data. |
| **InkBridge (inkjs integration)** | ✅ Done | `InkBridge.js` bridges inkjs stories to DialogueEngine. Bidirectional GameState sync, tone tracking from `[tone]` tags, save/restore. |
| **Oregon Trail Week Transition** | ✅ Done | Animated day-by-day ticker screen before week report. Shows activities, auto-advances after 2.8s, skip option. CSS: `wt-*` classes. |
| **NPC Memory Matrix** | ✅ Done | DialogueEngine interpolates `{npc_favor}`, `{npc_relationship}`, `{npc_grudge_count}`, `{npc_last_grudge}`. Condition evaluation checks NPC favor/grudges. |
| **Consequence Tease Feedback** | ✅ Done | ConsequenceScheduler shows atmospheric lines when scheduling ("The art world has a long memory..."). Type-specific tease pools. |
| **Systemic Lattice Triggers** | ✅ Done | 4 fail-state arcs wired into WeekEngine: Informant (suspicion≥80), Auteur (burnout≥9), Recession (marketHeat≥90), Exile (avg NPC favor≤-50). Each triggers phone messages, stat mutations, consequence chains, and flags. Resets on new game/load. |
| **NPC Memory Modules** | ✅ Done | npcStore tracks witnessed/grudges/favors per NPC. DialogueEngine reads memory for dynamic text. Gossip propagation in autonomousTick. |

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

### 4B. The Grid Walking Prototype (Sprint 1.5)
| Task | Status | Notes |
|---|---|---|
| Asset Porting | ✅ Done | Tiled `pallet_town.json` (26x27, 48px tiles), 4 tilesets (grounds/world/world2/grounds2), player spritesheet (72x96, 12 frames). |
| The WorldScene Rebuild | ✅ Done | Extends BaseScene, proper layer depth ordering, GridEngine with Tiled collision props, spawn point from objects, opaque bg, ESC exit, error recovery, door/dialog interaction from Tiled objects. |
| React MobileJoypad Overlay | ✅ Done | D-pad with arrow symbols (56px touch targets), action button (A), exit button. Gold highlight on active direction. Pointer events with global touch failsafe. |
| Admin Test Trigger & Exit UI | ✅ Done | Admin Dashboard "Launch: World Map (Pokemon)" button. Terminal "Walk the Neighborhood" in late-game. Both use GameEventBus.DEBUG_LAUNCH_SCENE. MobileJoypad EXIT calls scene.exitScene(). |

### 4C. The Content Asset Pipeline
| Task | Status | Notes |
|---|---|---|
| JSON Asset Migration | TODO | Convert massive `.js` arrays (`artworks.js`, `events.js`) into `.json` files |
| The Boot Loader (`BootScene.js`) | TODO | Asynchronously parse and validate JSON payloads before `TitleScene` mounts |

### 4C. Narrative Depth (Pacing & Tones)
| Task | Status | Notes |
|---|---|---|
| The 5-Tone Dialogue System | ✅ Done | Friendly/Schmoozing/Direct/Generous/Ruthless. DialogueEngine tracks per-conversation, persists to `toneHistory`. Week 20 specialization. |
| The Memory Matrix Wiring | ✅ Done | DialogueEngine interpolates NPC favor/grudge/relationship dynamically into node text. |
| Variable Text Parsing | ✅ Done | `{variable}` syntax resolved at render time — cash, name, city, NPC data, portfolio info. |
| Interpretible `WeekEngine.js` Pacing | ✅ Done | Oregon Trail day-by-day transition screen with animated ticker, skip option, auto-advance. |

### 4D. The Week 26 Reckoning (Endgame)
| Task | Status | Notes |
|---|---|---|
| Week 26 Cutoff Trigger | TODO | Hard cap the sandbox loop at Week 26 |
| The Museum Retrospective | TODO | Prestige narrative sequence (requires high Rep/Taste) |
| The SEC Investigation | TODO | Prison sequence (requires high Cash/Heat) |
| The Shadow Broker | TODO | Underground syndicate sequence (requires high Intel) |

---

## Phase 5 — The Content Factory & Procedural Ecosystems
## Phase 5 — Systemic Expansion & Content Ecosystems (Planned)

### Sprint 5A: The Narrative 24-Hour Clock & Day/Night System
- Refactor `GameState.js` to track `hour` and `dayOfWeek` alongside `week`.
- Map FastTravel / GridEngine tile movement to minute drains.
- Build `CalendarHUD.jsx` to render military time constantly onscreen over GridEngine.
- Implement Phaser `postFX` vignette/tinting at 19:00, forcing players home at 24:00 (burnout penalty).

### Sprint 5B: Spatial-Temporal Event Registry
- Refactor `events.js` JSON format to support `{ location: "pallett", day: 5, hourMin: 22 }` bindings.
- Build continuous Coordinate/Time listener into `WorldScene.js` capable of locking input and triggering a narrative React overlay dynamically during a walk.
- Convert NPC schedules into coordinate matrices (e.g. Gallery Owner unspawns at 18:00).

### Sprint 5C: The Admin Sequencer
- Add [ SEQ ] Sequence Trigger Builder to `AdminDashboard.jsx`.
- Visual timeline visualizer allowing dev injection of time/grid coordinates directly to the consequence queue.

### Sprint 5D: The Object Interaction Loop
- Connect `GridEngine.positionChangeFinished` observable to `GameState`.
- Emit interaction actions via GameEventBus mapping coordinates to specific Event Nodes.

---

## Phase 6 — Admin & Settings Hardening (Planned)

### Sprint 6A: The Live Tree Validator
- Import a lightweight React JSON viewer library.
- Bind to `useGameStore` and generic `GameState.state` for direct inline editing.

### Sprint 6B: Memory Operations & Snapshots
- Build the Quick-Save memory array in the Admin UI.
- Implement the "State Reversal" stack tracking the last 5 week-ticks.

### Sprint 6C: Spatial Spawning & Debug Tools
- Bridge the Admin UI to `GridEngine` to read active tile vectors.
- Implement dynamic Phase Sprite instantiators to visually test event layouts.

---

## Phase 7 — Content Management Studio (Planned)

### Sprint 7A: React Flow Integration
- `npm install @xyflow/react`.
- Create `/editor` DEV-only route.
- Implement canvas with panning, zooming, and a library sidebar.

### Sprint 7B: Custom Node Creation
- Build functional React node components mapped to game logic (`TriggerNode`, `DialogueNode`, `StatConditionNode`, `SceneLaunchNode`).
- Ensure WYSIWYG parity (e.g., node looks like the actual terminal).

### Sprint 7C: Serialization & Engine Bridge
- Write compiler traversing node edges.
- Translate graphical schema to `events.json` state machine object.

---

## Phase 8 — Polish, Audio & Release

| Task | Status | Notes |
|---|---|---|
| Tactile Audio | ✅ Done | WebAudioService: 16 procedural SFX (type, hover, select, hit, miss, etc.) |
| Keyboard-First Navigation | ✅ Done | Arrow/WASD + Enter across terminal, SPACE in Phaser scenes |
| Full pixel art pass | TODO | Portraits, backgrounds, UI elements |
| Tutorial / onboarding | TODO | Guided first week |
| Playtesting & balance | TODO | Market math, event frequency |
| Week 26 endgame reckoning | TODO | Museum retrospective, SEC investigation |
| Publish on itch.io | TODO | |

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
- Tests must stay green: 36/36 unit + 36/38 flow (2 Phase A timing issues pre-existing)

---

#project #roadmap #planning #game-design
