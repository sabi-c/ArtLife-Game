# Admin Dashboard & Settings Overhaul Plan

## The Goal
The current `AdminDashboard.jsx` (God Mode) is highly functional but relies on hardcoded buttons for specific actions (e.g., `+ $100,000`, `+1 Week`, specific scene triggers). As the game's complexity scales with GridEngine exploration, narrative clocks, and hundreds of variables, we need a **dynamic, robust, and extensible debugging suite**. 

This plan outlines the overhaul of the Admin Settings, transforming it from a static control panel into a professional-grade visual debugger and game manipulation tool.

---

## 1. Dynamic State & Flag Editor
Instead of hardcoding every possible stat change, we need a live JSON-tree visualizer that allows direct manipulation of the `GameState`, `npcStore`, and `eventStore` in real-time.

### Features
- **Live Memory Inspector:** A collapsible, searchable tree-view of the entire Zustand store and GameState singletons. 
- **Inline Editing:** Click any primitive value (e.g., `cash: 50000`) to open an input field and change it instantly.
- **Flag Manager:** A dedicated UI to view all boolean flags (e.g., `met_lorenzo_gallo: true`), toggle them on/off, and manually inject new flags to test edge-case dialogue branches without playing the whole game.

---

## 2. Advanced Save State Management (Snapshotting)
Currently, we can import/export a raw JSON string. We need to upgrade this to support rapid iterative testing.

### Features
- **Quick-Save / Quick-Load Slots:** 10 dedicated memory slots for developers to snapshot the exact state right before a complex event.
- **State Export/Import:** Download the current state as a `.json` file to share with other developers/agents for bug reproduction.
- **Time Reversal (Undo):** A chronological history of the last 10 `advanceWeek()` ticks, allowing the admin to step backwards in time to undo a catastrophic market collapse or test a different dialogue choice.

---

## 3. The Sequencer & World Spawner
Building on the "Systemic Time Architecture," the Admin Dashboard will become a map editor for testing.

### Features
- **Coordinate Spawner:** While standing in `WorldScene.js`, open the Admin panel and click `[ Spawn NPC ]` or `[ Spawn Trigger ]`. It will drop an entity at your current tile coordinates, allowing you to visually compose events rather than guessing X/Y values in your code.
- **Consequence Visualizer:** A Gantt-chart style timeline showing exactly when scheduled consequences will fire, with the ability to drag and drop them to different weeks/hours to accelerate testing.

---

## 4. UI & Theme Customizer
The game's aesthetic relies on CSS variables and strict themes (e.g., Pantone Dark Blue). We will add a real-time styling editor.

### Features
- **Live CSS Tweaker:** Adjust primary colors, font sizes, and border radii using sliders.
- **Theme Cycler:** Instantly flip between "Terminal Hacker", "Blue Chip Neutral", or "Glitch" themes to verify UI contrast and responsiveness.
- **PostFX Playground:** Adjust the Phaser vignette, scanlines, and bloom intensity sliders via the React overlay, outputting the exact config object to paste back into the source code.

---

## 5. Security & Production Fencing (Anti-Cheat)
Because this is a web game, savvy players will find the React DevTools. 

### Features
- **Environment Gating:** Wrap the entire Admin Dashboard in an `import.meta.env.DEV` check. 
- **Production Console Warning:** Implement a stylistic "Hold Up" ascII art warning if a player opens the Chrome DevTools in the production build.
- **Encrypted LocalStorage:** Minify and obfuscate the SaveState payload in production to prevent easy JSON manipulation by players looking to give themselves `$99,000,000`.

---

## Implementation Phases

**Phase A: The Live Tree Validator (Sprint 3.4)**
- Import a lightweight React JSON viewer library (e.g., `react-json-view`).
- Bind it to `useGameStore` and generic `GameState.state`.
- Implement inline editing and deep-merging to hydrate the store with the edited values.

**Phase B: Memory Operations & Snapshots (Sprint 3.5)**
- Build the Quick-Save memory array in the Admin UI.
- Implement the "State Reversal" stack tracking the last 5 week-ticks.

**Phase C: Spatial Spawning & Tools (Sprint 3.6)**
- Bridge the Admin UI to `GridEngine` to read the player's active tile.
- Implement the "Drop Entity" button that dynamically instantiates a Phaser sprite at those coordinates.
