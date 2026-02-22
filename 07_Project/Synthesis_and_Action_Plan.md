# Phase 4 to Phase 8 Synthesis & Action Plan

## Overview
We've spent recent sessions mapping out five massive architectural expansions for Artlife:
1. **The Grid Engine Integration** (Pokemon-style walking)
2. **The 24-Hour Time & Sequencer Engine** (Replacing macro weeks with granular hours)
3. **The Advanced Admin Debugger** (Live state editing, temporal reversing, spatial spawners)
4. **The Visual Scene Flow Editor** (React Flow-based dragged-node authoring)
5. **The Phase 4 Endgame Refactor** (Zustand unification, JSON pipelines)

While the vision is complete, building these out of order will create severe technical debt. If we build the Visual Flow Editor before the game Engine knows how to dynamically fetch JSON, the editor is useless. If we build the Time Engine before unifying our State, variables will desync.

## The Execution Strategy (Sequential Priority)

To unblock development, these features must be executed in the following order:

### Priority 1: The Unified Zustand State (Phase 4, Sprint 1)
Currently, `capital`, `reputation`, and `week` are trapped in a static singleton (`GameState.js`), while events and NPCs use React's `Zustand` store. 
- **Action:** We absolutely MUST unify this into a central `useGameStore`. The Admin Editor, Time Engine, and Visual Flow Editor all require a single, predictable state tree to read/write from.

### Priority 2: The JSON Asset Pipeline (Phase 4, Sprint 2)
The Visual Flow Editor we just planned is designed to output JSON files. But right now, `events.js` and `dialogue_trees.js` are hardcoded JavaScript arrays. 
- **Action:** We need to upgrade the Phaser loading screen (`BootScene.js`) to asynchronously fetch JSON content payloads before the game begins. This prepares the engine to accept content pushed directly by the CMS editor.

### Priority 3: The Interaction Loop (Phase 1.5 Polish)
You currently have the `WorldScene.js` running, and the mobile joystick works. However, walking into a wall or stepping on a specific tile does nothing.
- **Action:** We need to build the `TileInteraction` trigger so that standing on tile [X, Y] and pressing "A" actually launches a narrative sequence in the `DialogueScene` or `HaggleScene`.

### Priority 4: The 24-Hour Time Engine (Phase 5)
Once the state is unified and the player can physically interact with the world, we can introduce granular time.
- **Action:** Map player footsteps and interactions to the new 24-hour clock. Add the `CalendarHUD` and the `dayOfWeek` logic to replace the generic "Action Points" system.

### Priority 5: The Visual Editor & Admin Tools (Phase 6 & 7)
Once the underlying engine is unified and fully deterministic, we build the visual React Flow editor and the Admin Spawning tools as a polished layer on top.
- **Action:** Because the foundation is solid, building the visual node graph just becomes a matter of rendering UI that compiles to standard JSON arrays—arrays identical to what the unified engine already expects.

---

## Next Steps
This sequence ensures every new feature has a rock-solid foundation to stand on. If you approve this priority order, I recommend immediately diving into **Priority 1: The Unified Zustand State Migration** to overhaul `GameState.js`.
