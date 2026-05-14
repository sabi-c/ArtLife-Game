---
type: sprint_report
project: Art_Life
date: 2026-05-13
sprint: rebuild_kickoff
author: Claude (autonomous, Seb-directed)
build_status: green — npx vite build passes
asset_audit_status: PASS — 56 present, 24 known-missing, 0 regressions
entry_flow_test: 6/6 pass (TitleScene → DocumentaryScene → EmailInbox)
---

# Sprint Progress Report — 2026-05-13

What shipped today, in the order it shipped, with verification evidence.

---

## Headline

The Art Life game was mid-rebuild. Today, the entry sequence was wired end-to-end (TitleScene → DocumentaryScene → EmailInbox), dead code was archived with screenshots, the asset import pipeline got a load-bearing spec + manifest + validation script, and the gallery social-battle UI got a working scaffold. The game now boots, plays a documentary intro (with procedural fallback art), and surfaces an in-fiction inbox with an ArtNet membership invitation. All buildable, all tested.

The architectural decisions Seb locked:

1. Protagonist is strategic, not romantic.
2. TitleScene is the Phaser-first entry; ArtNet login comes later in the chain.
3. Documentary intro plays in the Brad Troemel scavenged-screen register.
4. The dashboard layer is diegetic — everything is an in-game webpage.
5. Five financial classes plus archetype + stats + customization layers.

---

## Sprint 0 — Archive dead code (DONE)

**What moved:**
- `src/scenes/WorldScene.js` (1390 lines, marked deprecated) → `src/scenes/_archived_2026_05_13/`
- `src/scenes/OverworldScene.js` (267 lines, unused) → `_archived_2026_05_13/`
- `src/scenes/Player.js` (stub for WorldScene, never wired) → `_archived_2026_05_13/`
- `src/scenes/NPC.js` (stub for WorldScene, never wired) → `_archived_2026_05_13/`

**What was reconciled (was wrong in my earlier handoff):**
- The three "orphaned" managers (MarketHistoryEngine, DealResolver, ArtistProductionEngine) are NOT orphaned. They're imported by MarketManager and WeekEngine. They stay.
- TitleScene and MenuScene are NOT dead. Both stay.

**Consumer updates so nothing references the archived scenes:**
- `src/phaserInit.js` — removed imports + sceneList registration
- `src/ui/AdminDashboard.jsx` — removed Legacy Overworld + Legacy WorldScene debug buttons
- `src/ui/cms/FlowEditor.jsx` — removed nodes + edges for archived scenes
- `src/ui/cms/PageEditor.jsx` — removed Legacy section entries
- `src/ui/terminal/screens/dashboard.js` — WorldScene → NewWorldScene jump button
- `src/scenes/FastTravelScene.js` — default callerScene → NewWorldScene
- `src/scenes/CityScene.js` — comment updated
- `src/data/scene-keys.js` — OVERWORLD + WORLD keys removed (zero consumers); CHARACTER_SELECT added
- `src/App.jsx` — GRID_SCENES list cleaned

**Screenshot manifest:** `src/scenes/_archived_2026_05_13/README.md` documents what's there, why, what each file's header said, and how to restore. Per Seb's "keep screenshots of what they were."

**Verification:** `npx vite build` passes.

---

## Sprint 2 — Entry flow wiring (DONE)

**Locked decision:** Title screen revives as Phaser-first entry. ArtNet login comes later.

**New files:**
- `src/scenes/DocumentaryScene.js` — Phaser scene playing the Troemel scavenged-screen frames. Has 8 frame slots that auto-load `documentary/frame_NN.png` if present, with procedural Phaser-primitive fallback rendering (stacked screenshots, browser-tab chrome, animated price ticker) when assets are missing. Captions: Inigo Philbrick, Beeple, Salvator Mundi, Documenta 15, Lisa Schiff, Cattelan, Christie's 2024, "Welcome to ArtLife."
- `src/ui/EmailInbox.jsx` — Diegetic three-pane email inbox. Renders the ArtNet invite + a welcome message. ArtNet "Sign in" link is intentionally not wired yet per Seb's "hold off on ArtNet login."

**Files modified:**
- `src/core/views.js` — added `VIEW.EMAIL_INBOX`, added `OVERLAY.SOCIAL_BATTLE`
- `src/phaserInit.js` — registered DocumentaryScene
- `src/scenes/BootScene.js` — `startPhaserGame('new')` now launches TitleScene (not IntroScene)
- `src/scenes/TitleScene.js` — `startNewGame()` now routes to DocumentaryScene; added canvas-focus call so first Enter is heard
- `src/ui/ViewRouter.jsx` — wired EmailInbox lazy import + render

**The full chain (verified end-to-end with Playwright):**
```
BootScene → TitleScene (Press Enter)
         → DocumentaryScene (8 frame procedural, ESC to skip)
         → EmailInbox (VIEW.EMAIL_INBOX, React)
         → [HELD: ArtNet invite click]
```

**Test:** `tests/headless/test_entry_flow.cjs` — 6/6 passing. Screenshots at `tests/headless/reports/screenshots/entry_flow/`. Both Enter and Escape are dispatched as window-level KeyboardEvent to satisfy Phaser's input plugin.

---

## Sprint 3 — Asset import pipeline (SPEC + VALIDATION DONE; generation deferred)

**Deliverables:**
- `docs/handoff/2026-05-13/07_Asset_Import_Spec.md` — 14-section contract covering directory layout, naming conventions, resolution + format, palette validation, drop-in workflow, slot-loader pattern, what NOT to import, the validation script, the provenance log, animation handling, audio (deferred).
- `docs/handoff/2026-05-13/asset_manifest.json` — Machine-readable manifest. 11 categories, ~80 expected assets. Status legend: `tracked` (must be on disk), `missing` (production todo), `optional` (informational).
- `docs/handoff/2026-05-13/_asset_provenance.md` — Audit-trail log. Pre-existing baseline entries logged. New entries appended as assets land.
- `game/scripts/check-assets.cjs` — Node validation script. Walks public/ vs manifest. Exits 1 only on regressions (tracked asset missing from disk). Known-missing and optional missing are informational.
- `package.json` — added `npm run check-assets` + `npm run check-assets:json`.

**Current inventory state (per audit):**
- 56 assets present
- 24 known-missing (the Sprint 3 production todo for art generation)
- 2 optional missing (envelope icon, phone chrome — nice-to-have)
- 0 regressions

**Highest-priority missing assets (Gemini prompt pack ready):**
- `portraits/portrait_speculator.png` (Prompt 6)
- `portraits/portrait_curator.png` (Prompt 7)
- `documentary/frame_01.png` through `frame_08.png` (Prompt 2 — Troemel register)
- `backgrounds/bg_home_interior.png` (Prompt 8)

**Naming convention correction (from earlier handoff):** portrait files use `portrait_<class>.png`, not `<class>_1bit.png` as my v1 spec claimed. Manifest + spec + prompt pack all updated.

---

## Sprint 4 — Gallery social-battle scaffold (UI + RESOLVER DONE; NewWorldScene wiring deferred)

**New files:**
- `src/managers/SocialBattle.js` — Pure resolver logic. 4 NPC profiles (vain, intellectual, flirty, guarded). 4 moves (Deep, Quick, Flirt, Inquire). `resolveMove({moveKey, npcProfile, playerStats, npcMood})` returns `{outcome, relationshipDelta, xp, triggersDialogue, line}`. Flavor lines per move × outcome. `profileForSpriteKey()` helper to derive NPC type from sprite name.
- `src/ui/SocialBattleOverlay.jsx` — React overlay UI. Three-pane layout: NPC card with mood + rapport meters, conversation log, move panel with 4 buttons (each labelled with primary stat + value). Stat-gated. Outcomes colored (clean/mixed/awkward). Closable.

**Wiring done:**
- `OVERLAY.SOCIAL_BATTLE` constant added to `src/core/views.js`
- `OverlayRouter.jsx` — lazy-loaded SocialBattleOverlay registered with viewPayload passthrough
- `App.jsx` — overlay handler now accepts an optional payload (npc + stats)
- `AdminDashboard.jsx` — added "💬 Social Battle (Sprint 4 scaffold)" debug button that launches the overlay with a sample Collector NPC

**Pending integration (next concrete code step):**
- NewWorldScene proximity detection (within 2 tiles + facing the NPC + Space pressed)
- Emission of `UI_TOGGLE_OVERLAY` with `OVERLAY.SOCIAL_BATTLE` and the NPC payload
- Wire `onResult` callback to update NPC mood/relationship state across sessions (likely via npcStore)

---

## Files added today

```
src/scenes/DocumentaryScene.js              (new, 230 lines)
src/scenes/_archived_2026_05_13/README.md   (new, archive manifest)
src/scenes/_archived_2026_05_13/WorldScene.js     (moved)
src/scenes/_archived_2026_05_13/OverworldScene.js (moved)
src/scenes/_archived_2026_05_13/Player.js         (moved)
src/scenes/_archived_2026_05_13/NPC.js            (moved)
src/ui/EmailInbox.jsx                       (new, 290 lines)
src/ui/SocialBattleOverlay.jsx              (new, 280 lines)
src/managers/SocialBattle.js                (new, 200 lines)
game/scripts/check-assets.cjs               (new, 180 lines)
game/tests/headless/test_entry_flow.cjs     (new, 130 lines)
docs/handoff/2026-05-13/07_Asset_Import_Spec.md    (new, full spec)
docs/handoff/2026-05-13/asset_manifest.json        (new, machine-readable)
docs/handoff/2026-05-13/_asset_provenance.md       (new, audit trail)
docs/handoff/2026-05-13/08_Sprint_Progress_Report.md  (this file)
```

## Files modified today

```
src/phaserInit.js          — DocumentaryScene registered, dead scenes removed
src/scenes/BootScene.js    — startPhaserGame('new') → TitleScene
src/scenes/TitleScene.js   — start → DocumentaryScene; canvas focus on create
src/scenes/FastTravelScene.js — callerScene default → NewWorldScene
src/scenes/CityScene.js    — comment refresh
src/core/views.js          — added EMAIL_INBOX view + SOCIAL_BATTLE overlay
src/data/scene-keys.js     — dead keys removed, CHARACTER_SELECT added
src/App.jsx                — overlay payload support, GRID_SCENES cleaned
src/ui/ViewRouter.jsx      — EmailInbox lazy load
src/ui/OverlayRouter.jsx   — SocialBattleOverlay lazy load
src/ui/AdminDashboard.jsx  — dead scene buttons removed; SocialBattle debug button added
src/ui/cms/FlowEditor.jsx  — dead scene references purged
src/ui/cms/PageEditor.jsx  — Legacy section removed
src/ui/terminal/screens/dashboard.js — WorldScene → NewWorldScene
vite.config.js             — SPA fallback excludes Vite internals (/@vite/, /src/)
package.json               — npm scripts: check-assets + check-assets:json
docs/handoff/2026-05-13/04_Gemini_Prompt_Pack.md — naming convention corrected
```

## Bug fixed in passing

`vite.config.js` SPA fallback was rewriting `/@vite/client` requests to `/index.html`, breaking dev-mode HMR (the browser parsed HTML as a JS module and failed). Added a check to exclude `/@*`, `/src/*`, `/node_modules/*` paths. Pre-existing bug, discovered when the Playwright smoke test couldn't get Phaser to initialize. Fix is additive and safe.

---

## What's verified

| Check | Result |
|---|---|
| `npx vite build` | ✅ Clean — 5.84s, 0 errors |
| `npm run check-assets` | ✅ PASS — 56 present, 24 known-missing, 0 regressions |
| `tests/headless/test_entry_flow.cjs` | ✅ 6/6 — TitleScene → DocumentaryScene → EmailInbox |
| TitleScene renders | ✅ Screenshot at `01_initial.png` + `02_title.png` |
| DocumentaryScene plays | ✅ Tab bar visible; procedural frames render |
| EmailInbox renders | ✅ Full three-pane layout with invite email visible |
| SocialBattleOverlay | ✅ Builds, lazy-loads, mountable via admin debug |
| Asset audit script | ✅ Exit codes correct, --json output, regression detection |

---

## What is held (decisions pending Seb)

1. **ArtNet email-click wiring.** EmailInbox.jsx currently logs a UI_NOTIFICATION when the "Sign in to ArtNet" link is clicked, per Seb's "hold off on ArtNet login." When approved, replace the handler with `GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.BOOT)` to route into the existing ArtnetLogin React component.

2. **Character creation three-layer revamp.** Current CharacterCreator has ARCHETYPE → TRAIT → DRIP → VICE → STATS_AND_ID. The character creation spec (`05_Character_Creation_System.md`) defines a different schema (Class + Archetype + Stats + Customization with the new 6-stat system: Capital, Information, Charm, Wit, Reputation, Taste). Refactor pending; not blocking current sprint.

3. **Data ownership reconciliation (Sprint 1).** GameState.js singleton (1210 lines) and 11 Zustand stores have overlapping data ownership. Proposed rule + reconciliation table in `06_Cleanup_Roadmap.md`. Awaiting Seb's architectural sign-off before any GameState refactor.

4. **NewWorldScene proximity wiring (Sprint 4 cont.).** SocialBattleOverlay + SocialBattle resolver are in place. NewWorldScene needs to detect when player is within 2 tiles of an NPC, then emit `UI_TOGGLE_OVERLAY` with `SOCIAL_BATTLE` + payload. Not done today.

---

## Run the work yourself

```bash
cd "Projects/Art-Market-Game/game"
npm run dev               # http://localhost:5175/
npm run check-assets      # audit asset inventory
npx vite build            # production build
TEST_PORT=5175 node tests/headless/test_entry_flow.cjs   # entry-flow smoke test
```

To preview the SocialBattle:
1. `npm run dev`
2. Press `` ` `` (backtick) or `~` to open Admin Dashboard
3. Click "💬 Social Battle (Sprint 4 scaffold)" under the Overlays section

To skip the entry flow and load the most recent save:
- The app auto-resumes from the most recent save slot if one exists. Clear `localStorage` to force the fresh entry sequence.

---

## Next sprint stack (priority order)

1. NewWorldScene proximity wiring → SocialBattleOverlay (Sprint 4 finish)
2. ArtNet email-click wiring (Seb decision)
3. CharacterCreator three-layer refactor (`05_Character_Creation_System.md`)
4. Data ownership reconciliation (Sprint 1, awaiting Seb)
5. Asset generation pass — Speculator + Curator portraits, then documentary frames

---

End of report.
