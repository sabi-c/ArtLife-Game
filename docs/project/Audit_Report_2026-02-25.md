# ArtLife — Full Codebase Audit Report
**Date:** 2026-02-25
**Branch audited:** `master` (== `origin/main`)
**Auditor:** Claude Code

---

## Executive Summary

ArtLife is a sophisticated, browser-based art market simulation game built with **Phaser 3 + React 19 + Zustand 5 + Vite**. The project is at **v0.4.4**, Phase 3 complete, Phase 4 active. All tests pass (53/53 flow, 5/5 unit), the build is clean, and the game is live at [https://sabi-c.github.io/ArtLife-Game/](https://sabi-c.github.io/ArtLife-Game/).

This report covers: project state, recent changes, CMS PageEditor version history, GitHub push status, documentation gaps fixed, and a technical debt assessment.

---

## 1. GitHub / Branch Status

| Item | Status |
|------|--------|
| `master` vs `origin/main` | **Identical** — 0 commits ahead, 0 behind |
| `claude/update-docs-audit-6aEdb` | Documentation + bug fix branch (this audit) |
| All PageEditor commits | **On GitHub** ✅ |
| Build | Clean ✅ |
| Tests | 53/53 flow, 5/5 unit ✅ |
| Deployed | Live on GitHub Pages ✅ |

---

## 2. CMS Pages Tab — PageEditor Version History

The **Pages** tab in MasterCMS (id: `pages`, icon: 📑) contains the **PageEditor** component. It evolved through three explicitly versioned commits, all of which are on `origin/main` and live on GitHub Pages.

| Commit | Version | What Was Added |
|--------|---------|----------------|
| `b0c4b183` | **v1** | Hierarchical page tree + property inspector in CMS |
| `dcacae11` | **v2** | Production-quality GameMaker-inspired property panel |
| `75eabe25` | **v3** (current) | Flow breadcrumbs (BFS path), data source mapping, CMS cross-links |

### Current PageEditor Features (v3)
- **25+ pages** across 7 groups: Boot Flow, Main Game, Venue Flow, Dialogue, Support, Overlays, Legacy
- **Status filters**: All / Active / Unused / Planned with live counts
- **Search**: Filter by name, description, file, or ID
- **Property inspector** (right panel): edit name, description, status, transitions, custom properties
- **Transition editor**: add/remove transitions with target page picker
- **Incoming connections tracker**: shows which pages link to the selected page
- **Data source mapping**: links pages to their backing source files
- **Flow breadcrumbs**: shows shortest path from Boot → current page (BFS)
- **CMS cross-links**: "Edit in" buttons that switch to the relevant CMS tab
- **localStorage persistence**: edits survive page reloads
- **Export JSON**: download the full page registry

### Why the Pages Tab Appeared to "Not Load" (Now Fixed)

**Root cause:** The service worker used `clients.claim()` to take control of open browser tabs, but there was no `controllerchange` listener to reload the page. Users who had the site open during a new deployment kept running the old JS bundle (which lacked PageEditor) until they manually refreshed.

**Fix applied (this audit):** Added a `controllerchange` listener to `phaserInit.js`:
```javascript
navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
```
This triggers a one-time auto-reload when a new service worker activates, ensuring users always get the latest assets after a deployment. The fix prevents infinite loops because `controllerchange` only fires when the controller actually changes.

---

## 3. Full MasterCMS Tab Inventory

MasterCMS (`game/src/ui/MasterCMS.jsx`) has **15 tabs** — not 7 as listed in older docs:

| # | Tab ID | Label | Component | Domain |
|---|--------|-------|-----------|--------|
| 1 | `board` | Project Board | KanbanBoard | kanban |
| 2 | `timeline` | Timeline | TimelineCalendar | timeline |
| 3 | `storylines` | Storylines | StorylineEditor | storylines |
| 4 | `events` | Events / Dialogue | EventEditor | events |
| 5 | `npcs` | NPCs & Roles | NPCEditor | npcs |
| 6 | `artworks` | Artworks / Market | ArtworkEditor | artworks |
| 7 | `haggle` | Haggle Battles | HaggleEditor | haggle |
| 8 | `marketsim` | Market Sim | MarketSimDashboard | market |
| 9 | `terminal` | Live Terminal | ArtTerminal | — |
| 10 | `venues` | Venues / Map | VenueEditor | maps |
| 11 | `actlog` | Activity Log | ActivityLogViewer | — |
| 12 | `ingest` | Data Hub | DataHub | — |
| 13 | `engines` | Engines | EngineOverview | — |
| 14 | `pages` | Pages | **PageEditor** | — |
| 15 | `flow` | Flow Map | FlowEditor | flow |

Access: Navigate to `/cms` in-game, or press backtick (`` ` ``) to open AdminDashboard then switch to CMS.

---

## 4. Architecture State (Current)

```
game/src/
├── App.jsx                    # React root
├── phaserInit.js              # Phaser factory + SW registration (FIXED: controllerchange)
├── style.css                  # Global styles (~60KB)
├── core/                      # Route constants & game loop (views.js, GameTick.js, etc.)
├── data/                      # Static content (~21 files + events/, scenes/, maps/ subdirs)
├── managers/                  # Business logic (~24 files)
├── stores/                    # Zustand state (~11 files)
├── scenes/                    # Phaser scenes (14 + haggle/ subdirectory with 3 mixins)
├── ui/                        # React UI (~75+ files)
│   ├── cms/                   # CMS editors (18+ files, including PageEditor v3)
│   ├── email/                 # Email overlay system (EmailOverlay, EmailThread, etc.)
│   │   ├── inbox/             # InboxShell (Gmail-style inbox)
│   │   └── haggle/            # HaggleOverlay (email-based negotiation)
│   ├── dashboard/             # Bloomberg dashboard sub-components
│   ├── terminal/              # Terminal screens (dashboard, market, phone, etc.)
│   ├── ViewRouter.jsx         # Full-page view router
│   └── OverlayRouter.jsx      # Lazy-loaded overlay router
├── hooks/                     # Custom React hooks (usePageRouter, useBloombergFeed)
└── utils/                     # Utilities (math.js, format.js, shuffle.js, etc.)
```

### Key Manager Files
| File | Size | Purpose |
|------|------|---------|
| `GameState.js` | ~55KB | Central singleton — save/load, player state |
| `MarketSimulator.js` | ~52KB | NPC trading simulation |
| `HaggleManager.js` | ~32KB | Pokémon-style negotiation engine |
| `GameEventBus.js` | — | Pub/sub bridge (Phaser ↔ React ↔ Terminal) |
| `MarketManager.js` | — | Artist heat, price calc, market cycles |
| `WeekEngine.js` | — | Weekly advance orchestrator |

### Key Store Files
| Store | Purpose |
|-------|---------|
| `cmsStore.js` | CMS persistence, dirty flags, auto-save, snapshots |
| `npcStore.js` | NPC contacts, memory, favor |
| `marketStore.js` | Artist prices, heat, market state |
| `uiStore.js` | UI state (view, overlay, panels) |
| `storylineStore.js` | Story arcs, completion state |
| `inventoryStore.js` | Player portfolio |
| `consequenceStore.js` | Scheduled consequence queue |
| `calendarStore.js` | Calendar/tick state |

---

## 5. Recent Development History (Last 10 Commits)

| Commit | Message |
|--------|---------|
| `b260407b` | feat: auto-version SW cache on every build |
| `f4f1b95c` | fix: bump SW cache v4→v5 to bust stale MasterCMS bundle |
| `75eabe25` | feat: PageEditor v3 — flow breadcrumbs, data sources, CMS cross-links |
| `dcacae11` | feat: PageEditor v2 — production-quality property panel |
| `b0c4b183` | feat: PageEditor — hierarchical page tree + inspector in CMS |
| `9fd9a361` | feat: FlowEditor — accurate transitions, node metadata, status tracking |
| `88010fa9` | housekeeping: Phase B — game/src reorganization (14 dirs → 8) |
| `bf118fb5` | housekeeping: Phase A root folder cleanup |
| `01ca5d3b` | fix: map editor tileset loading on GitHub Pages |
| `881c1508` | feat: Phase 2 — info markers, NPCs, action key + dialogue |

### Key Sessions (from Roadmap.md)
- **Session 29 (2026-02-23):** Email haggle game-wide integration — `EMAIL_HAGGLE_START` event, global EmailOverlay in App.jsx, AdminDashboard EMAIL test tab, DialogueScene now launches email negotiation
- **Session 27 (2026-02-23):** Unified email overlay — merged `EmailDialogueOverlay.jsx` + `HaggleEmailOverlay.jsx` into `src/ui/email/` module (5 files). Gmail-style tactic chips with type-color dots
- **Session 26 (2026-02-23):** Code refactoring sprint — `math.js`, `format.js`, `shared-helpers.js`, dashboard split (1,716 → 4 modules), HaggleScene split (1,913 → 3 mixins)

---

## 6. Features Implemented (Complete List)

| Feature | Status |
|---------|--------|
| 3 character classes + deep 6-phase creation | ✅ |
| 49+ events (7 categories, branching) | ✅ |
| Multi-step branching engine (nextSteps) | ✅ |
| 16 NPC contacts with phone/favor system | ✅ |
| Market simulation (8 artists, bull/bear cycles) | ✅ |
| Terminal UI (11+ screen modules, keyboard + touch) | ✅ |
| Save/Load (5 slots, auto-save, session persistence) | ✅ |
| PWA (manifest, service worker, offline) | ✅ |
| Mobile layout (safe-area, touch targets, joypad) | ✅ |
| Haggle Battle v3 (Phaser visual + email negotiation) | ✅ |
| Email overlay system (Gmail-style, unified) | ✅ |
| 14 Phaser scenes (World, City, Location, Haggle, Dialogue, etc.) | ✅ |
| GridEngine overworld (NPCs, encounters, items) | ✅ |
| 28 artworks across 3 tiers | ✅ |
| Admin Dashboard (God Mode — 7 tabs incl. EMAIL) | ✅ |
| MasterCMS (15 tabs — see section 3) | ✅ |
| PageEditor v3 (hierarchical tree, property panel, flow breadcrumbs) | ✅ |
| FlowEditor (node-based scene transition graph) | ✅ |
| Scene Engine (ink.js visual novel — 3 compiled scenes) | ✅ |
| WebAudioService (16 procedural SFX) | ✅ |
| Market engine (weekly price fluctuation) | ✅ |
| CMS Data Hub (templates, validation, presets, import/export) | ✅ |
| Bloomberg terminal (9 view styles) | ✅ |
| Sales Grid admin tool | ✅ |
| MarketSimulator (provenance chains, trade type tags) | ✅ |
| GitHub Pages deployment (all relative paths) | ✅ |
| SW auto-versioning on every build | ✅ |
| SW `controllerchange` reload (this audit) | ✅ |
| Week 26 endgame reckoning | ⏳ TODO |

---

## 7. Technical Debt Assessment

| Issue | Severity | Notes |
|-------|----------|-------|
| `GameState.js` god object (~55KB) | 🔴 High | Manages too much; hard to test. Phase 4 target: migrate to `gameStore` (Zustand) |
| No true unit tests | 🟠 Medium | Only E2E Playwright tests; managers lack Jest unit coverage |
| `ConsequenceScheduler` incomplete | 🟠 Medium | Consequences schedule but `GameTick.js` execute stub is a TODO |
| Static class singletons | 🟡 Low | All managers are static; can't instantiate fresh in tests |
| No TypeScript | 🟡 Low | Plain JS throughout; type errors surface only at runtime |
| No ESLint | 🟡 Low | Consistent code style relies on conventions, not tooling |

---

## 8. Documentation Gaps (Fixed in This Audit)

The following documentation files were updated as part of this audit (see individual files for details):

| File | What Was Fixed |
|------|----------------|
| `_index.md` | Converted Obsidian links to GitHub Markdown; added 45+ missing docs; added CMS/Admin/Technical sections |
| `docs/project/README.md` | MasterCMS: 7 tabs → 15 tabs; added Session 29; updated project structure tree; fixed code health counts; removed completed "next tasks" |
| `game/README.md` | Architecture diagram updated; CMS section now lists all 15 tabs; added routing system section; updated tech stack |
| `game/CLAUDE.md` | Fixed doc paths (`07_Project/` → `docs/project/`); removed Mac-only `afplay`; standardized dev port to 5175 |
| `game/ARCHITECTURE.md` | Added `core/` and `hooks/` layers; added `email/` module; updated CMS editor count |
| `docs/project/PageFlow.md` | Fixed deprecated ContentStudio F1 reference; added all overlays; updated View State Machine; added route reference |

---

## 9. Next Priorities (Phase 4)

1. **Week 26 Endgame Reckoning** — Museum Retrospective vs SEC Investigation vs Shadow Broker. The primary Phase 4 milestone
2. **Zustand migration** — Replace `GameState.js` singleton with `gameStore` (Zustand) for testability and reactivity
3. **Guided onboarding / tutorial** — Week 1 hand-holding for new players
4. **Real-world art data ingestion** — Feed actual auction results and market data into the simulation
5. **Unit test suite** — Jest tests for key managers (MarketManager, HaggleManager, DialogueEngine)

---

## 10. Quick Navigation Reference

| Goal | File |
|------|------|
| Understand the game | `docs/overview/Game_Concept.md` |
| Agent coordination & phase status | `docs/project/README.md` |
| Full task tracker | `docs/project/Roadmap.md` |
| Architecture overview | `game/ARCHITECTURE.md` |
| Claude agent instructions | `game/CLAUDE.md` |
| All page/scene flow | `docs/project/PageFlow.md` |
| CMS & admin tools | `docs/project/Content_Management_Studio_Spec.md` |
| Market economy deep dive | `game/README.md` (Market Economy section) |
| Dialogue tree format | `docs/project/Dialogue_Tree_Template.md` |
| Art world lore & NPCs | `docs/project/Art_World_Database.md` |
| This report | `docs/project/Audit_Report_2026-02-25.md` |
