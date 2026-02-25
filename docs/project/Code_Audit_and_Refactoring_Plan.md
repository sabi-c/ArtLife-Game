# ArtLife — Comprehensive Game Architecture & Code Audit

## Executive Summary
This document serves as the master blueprint for transitioning ArtLife from a functional prototype into a polished, shippable text-adventure RPG. Based on industry-standard patterns for hybrid React/Phaser games, it establishes a strict separation of concerns: **Zustand** as the ultimate immutable state bridge, **Phaser** for rendering game worlds and grids, and **React** for all UI overlays and heads-up displays.

---

## 🏗️ The Hybrid Architecture Blueprint (React + Phaser + Zustand)

Deep research into GitHub repositories and production hybrid web games confirms the optimal architecture for this stack:

1. **The Game Engine (Phaser 3 + GridEngine):**
   - Phaser is strictly responsible for rendering the game canvas, handling tilemaps, Sprite animations, and capturing WASD/Arrow Key inputs (`GridEngine` top-down movement).
   - Phaser scenes **do not hold permanent game state**. They read from Zustand on boot, and emit actions back to Zustand when events occur in the world.

2. **The User Interface (React 19):**
   - React is exclusively responsible for rendering the HUD, Dialogue Trees, Menus, Ego Dashboards, and Admin Tools.
   - React components **never directly call Phaser API methods**. They interact purely with Zustand.
   - React handles complex DOM interactions (Inventory scrolling, Admin JSON dropping) where Phaser's custom UI plugins would be too brittle.

3. **The Central Nervous System (Zustand 5):**
   - The master `useGameStore` is the single source of truth. It bridges the gap.
   - When a React button is clicked, it calls a Zustand action. If that action requires a visual change in the world, Zustand updates the state, and the Phaser scene reacts to that state change via a subscriber.
   - When a Phaser sprite steps on an event tile, Phaser calls a Zustand action to trigger an event (`useUIStore.getState().openDialogue()`), which React immediately renders on top of the canvas.

---

## Level 1: Core Loop & Pacing Dynamics
**Current State:** The game logic executes linearly when the user clicks 'Advance Week'. The `WeekEngine` fires managers in a rigid sequence, but narrative pacing feels disjointed.
**Refactoring Plan:**
* **The "Oregon Trail" Pacing Engine:** Implement a visual 'Journey' or 'Ticker' state during week transitions, showing days passing (`Monday... Tuesday... Wednesday...`).
* **Interruptible Ticks:** Allow `EventRegistry` to interrupt mid-week if a critical trigger occurs, bringing up an emergency overlay (e.g., "Phone rings at 3 AM on a Thursday").
* **Graceful Fail-Safes (Completed in Sprint 0.5):** The new `TestReporter` successfully isolated test blocks. This try/catch isolation must be maintained so a single manager crash doesn't halt the entire `WeekEngine` loop.

---

## Level 2: Data Architecture & State Management (Sprint 1)
**Current State:** A fractured hybrid of a legacy `GameState` singleton and modern `zustand` stores.
**The Problem:** Changes to the singleton do not natively trigger React re-renders, forcing manual `forceUpdate()` hacks. Save/Load state is fragmented and susceptible to desyncs. 
**Refactoring Plan:**
* **Absolute Zustand Migration:** Abolish the mutative `GameState.state` singleton. Move all properties (cash, inventory, reputation, etc.) into a master `useGameStore`. 
* **Pure Function Managers:** Convert mutative controllers (`MarketManager`, `HaggleManager`) into stateless utility functions that read from and dispatch to the Zustand store.
* **Unified Save/Load System:** Create a central serialization module `SaveManager.js` that aggregates all Zustand slices into encrypted Base64 strings for LocalStorage.

---

## Level 3: World Rendering & The Grid Engine (Sprint 1.5)
**Current State:** The game is mostly menu-driven text.
**The Problem:** We lack spatial exploration to anchor the roleplaying.
**Refactoring Plan:**
* **Legacy Port (`pokemon-react-phaser`):** Extract the `WorldScene.ts` and `Pallet Town` assets from the archived repository.
* **GridEngine Integration:** Bind Phaser 3 to the `GridEngine` plugin. Map WASD/Arrow Keys to tile-based sprite movement.
* **Mobile Joypad:** Implement a React-based `MobileJoypad.jsx` (D-pad + Action Button) overlay that dispatches directional `GameEvents` directly to the `WorldScene` for touch navigation.
* **Seamless Transitions:** Ensure `GameDebugAPI.exitScene()` can instantly tear down the Phaser grid and return the player to the React Terminal UI without memory leaks.

---

## Level 4: Narrative Systems & Dialogue Engines
**Current State:** The scene engine supports branching JSON, but lacks organic roleplaying depth.
**The Problem:** The player's replies are binary (`Yes`/`No`), and dialogue checks rely solely on static stats rather than conversational dynamics. 
**Refactoring Plan:**
* **The 4-Tone System:** Implement four conversational stances: *Aggressive*, *Professional*, *Casual*, and *Mysterious*. Player responses map to these tones.
* **Variable Text Parsing:** Write an interpolator that injects live variables directly into dialogue JSONs (e.g., `"Oh, I saw you bought {last_purchased_art}..."`). 
* **Memory Matrix:** Expand the `npcStore` to track `grudges` and `favors` dynamically, altering NPC greetings.

---

## Level 5: Progression, Economy & Endgame
**Current State:** The player buys and sells art indefinitely until they run out of money.
**The Problem:** There is no defined win state, breaking the late-game economy.
**Refactoring Plan:**
* **The Week 26 Reckoning:** Hard-cap the initial game loop at 26 weeks. Week 26 forces an endgame sequence based on the player's primary stat vector:
    * *High Reputation + Low Cash:* "The Museum Retrospective"
    * *High Cash + High Suspicion:* "The SEC Investigation"
    * *High Taste + High Intel:* "The Shadow Broker"

---

## Level 6: Tooling & The Automated QA Pipeline
**Current State:** Verified and hardened.
**Recent Milestones Achieved:**
* **Automated QA (Sprint 0.5):** We implemented `TestReporter.js`, intercepting browser logs and network requests. The CI now runs headless UI/API Playwright tests natively integrating with React/Phaser bridges.
* **God Mode Dashboards:** The `AdminDashboard.jsx` handles custom state injections.
**Next Steps:**
* **CMS Tooling:** Build a `react-flow` based visual node editor to author dialogue trees without writing JSON by hand.
