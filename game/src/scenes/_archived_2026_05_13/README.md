---
type: archive_manifest
project: Art_Life
archived_date: 2026-05-13
archived_by: Claude (autonomous Sprint 0)
status: reversible — files can be moved back to scenes/ if needed
---

# Archived scenes — 2026-05-13

Sprint 0 of the rebuild moved these four files out of the active scene tree. Nothing was deleted. To restore, move any file back up one level into `src/scenes/` and re-add to `phaserInit.js` sceneList.

## Why archived

The canonical world scene is `NewWorldScene.js`. The four files below either represent earlier rendering attempts that NewWorldScene replaced, or stubs that were prepared for WorldScene but never wired in. Keeping them in the active scene tree confused future audits and made it look like there were three competing worlds.

## What's in here

### WorldScene.js (1390 lines, 59K)
**Header at top of file said:** "DEPRECATED — Use NewWorldScene.js instead. This file is kept for reference only."

Full Pokemon-style overworld with GridEngine tile movement. Loaded `pallet_town` tilemap and four tilesets (`world`, `world2`, `grounds`, `grounds2`). Inline NPC spawn logic in `_spawnNPCs()` method (~60 lines). Was the second attempt at the world, replaced by NewWorldScene which is the third and current attempt.

**Imports removed from phaserInit.js:** line 29.
**Removed from sceneList:** line 74.
**Removed from AdminDashboard.jsx:** "Legacy WorldScene" debug button at line 369-371.
**Removed from FlowEditor.jsx:** node and edges at lines 61, 88-89.
**dashboard.js line 733:** updated to launch NewWorldScene instead.

### OverworldScene.js (267 lines, 11K)
**Header said:** "Phase 40.5 Top-Down Exploration Engine (Refactored)."

Kenney urban-tileset based top-down explorer using `BaseScene`, `Player`, `NPC`, `CharacterAnims`. Was the first attempt at the world. Marked "unused, replaced by NewWorld" in FlowEditor's status table.

**Imports removed from phaserInit.js:** line 24.
**Removed from sceneList:** line 69.
**Removed from AdminDashboard.jsx:** "Legacy Overworld" debug button at line 365-367.
**Removed from FlowEditor.jsx:** node and edges at line 60, 88.
**FastTravelScene.js:** default `callerScene` updated from `'OverworldScene'` to `'NewWorldScene'`.
**CityScene.js:** comment at line 18 updated.

### Player.js (4807 bytes)
**Comment said:** "STATUS: Ready to use but NOT yet wired into WorldScene."

Player class abstraction prepared for WorldScene's planned refactor. Never imported except by WorldScene + OverworldScene. Has no current usage in NewWorldScene (which inlines its own player logic).

If NewWorldScene wants to extract player logic later, copy from here as a starting point.

### NPC.js (2878 bytes)
**Comment said:** "STATUS: Ready to use but NOT yet wired into WorldScene. WorldScene currently manages NPC sprites inline in _spawnNPCs() (~60 lines)."

NPC class abstraction with similar status to Player.js. Never wired in.

If NewWorldScene wants to formalize NPC handling for the gallery social-battle mechanic (Sprint 4), this is a starting point but the gallerist-asset in `_reference/gallerist-asset/` may be a cleaner foundation given it has full 8-direction animations and named states (drinking, breathing-idle, sad-walk, sitting).

## scene-keys.js note

The two constants `OVERWORLD: 'OverworldScene'` and `WORLD: 'WorldScene'` in `src/data/scene-keys.js` were marked deprecated with comments but kept in place to avoid breaking any consumer that imports from scene-keys. Any future cleanup pass can remove them once a grep confirms zero consumers.

## Test files left in place

`tests/debug_worldscene_flow.cjs`, `tests/debug_worldscene.cjs`, `tests/headless/test_world.cjs` reference WorldScene. These are debug scaffolding, not real tests, and they will fail to find the scene at its old path. They are left in place because the test directory is in flux and a future tests pass can address them. The current `npm test` suite does not invoke these files.

## How to restore

```bash
cd "/Users/seb/Downloads/Manual Library/Playground Seb's Mind/Projects/Art-Market-Game/game/src/scenes"
mv _archived_2026_05_13/WorldScene.js .
# then re-add WorldScene import + registration to phaserInit.js
```

End of manifest.
