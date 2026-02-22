# ArtLife — Comprehensive Game Architecture & Code Audit

## Executive Summary
This document serves as the master blueprint for transitioning ArtLife from a functional prototype into a polished, shippable text-adventure RPG. It identifies critical technical debt across all layers of the stack and proposes robust, scalable architectural patterns. The goal is to solidify the underlying engine so that content designers can rapidly scale dialogue, events, and market conditions without fighting the codebase.

---

## Level 1: Core Loop & Pacing Dynamics
**Current State:** The game logic executes linearly when the user clicks 'Advance Week'. The `WeekEngine` fires managers in a rigid sequence, but narrative pacing feels disjointed.
**The Problem:** The player lacks agency in pacing. Events trigger instantly without buildup, and the market feels static between rigid ticks.
**Refactoring Plan:**
* **The "Oregon Trail" Pacing Engine:** Implement a visual 'Journey' or 'Ticker' state during week transitions, showing days passing (`Monday... Tuesday... Wednesday...`).
* **Interruptible Ticks:** Allow `EventRegistry` to interrupt mid-week if a critical trigger occurs, bringing up an emergency overlay (e.g., "Phone rings at 3 AM on a Thursday").
* **Consequence Chaining:** Connect decisions directly to the `ConsequenceScheduler` with visible delayed tension (e.g., "The gallerist will remember this...").
* **Graceful Fail-Safes:** Wrap all `WeekEngine` loop steps in structured `try/catch` blocks. If the MarketManager crashes, the week should still advance and log an error to the dashboard, rather than halting the entire game loop.

---

## Level 2: Data Architecture & State Management
**Current State:** A fractured hybrid of a legacy `GameState` singleton and modern `zustand` stores.
**The Problem:** Changes to the singleton do not natively trigger React re-renders, forcing manual `forceUpdate()` hacks. Save/Load state is fragmented and susceptible to desyncs. Hardcoded data arrays (`data/artworks.js`) bloat the bundle size.
**Refactoring Plan:**
* **Absolute Zustand Migration:** Abolish the mutative `GameState.state` singleton. Move all properties (cash, inventory, reputation, etc.) into a master `useGameStore`. 
* **Pure Function Managers:** Convert mutative controllers (`MarketManager`, `HaggleManager`) into stateless utility functions that read from and dispatch to the Zustand store.
* **Asynchronous Asset Pipeline:** Deprecate massive `.js` data arrays. Migrate all artworks, NPCs, and events to `.json` files in `public/content/`. 
* **Boot Loader Scene:** Implement an initial `BootScene` that handles parsing, validating, and injecting these JSON blobs into memory before the Title Screen appears.
* **Unified Save/Load System:** Create a central serialization module that aggregates all Zustand slices into encrypted Base64 strings for LocalStorage, with robust version migration support.

---

## Level 3: UI/UX & Rendering Boundaries
**Current State:** The DOM-based Terminal and Canvas-based Phaser scenes fight for screen control.
**The Problem:** Components manually toggle `display: none` on raw DOM elements (e.g., `document.getElementById('terminal')`), bypassing React's virtual DOM. This causes phantom black screens and input ghosting.
**Refactoring Plan:**
* **Strict Event-Driven Routing:** `App.jsx` becomes the absolute dictator of visibility. Phaser scenes emit `GameEvents.SCENE_READY` and `GameEvents.SCENE_EXIT` via the `GameEventBus`, instructing React to mount/unmount the interface explicitly.
* **Analog Design Enforcement:** Remove all CSS fade-in, slide, or bounce animations that make the game feel like a "web app." Enforce instant-rendering text, monospace fonts, and a tactile click sound system using `WebAudioService`.
* **Universal Overlay Registry:** Expand the `OVERLAY` enum so that features like Inventory, Settings, and Menus float consistently over both Terminal and Canvas modes without context switching.

---

## Level 4: Narrative Systems & Dialogue Engines
**Current State:** The scene engine supports branching JSON, but lacks organic roleplaying depth.
**The Problem:** The player's replies are binary (`Yes`/`No`), and dialogue checks rely solely on static stats (Taste > 50) rather than conversational dynamics. 
**Refactoring Plan:**
* **The 4-Tone System:** Implement four conversational stances: *Aggressive*, *Professional*, *Casual*, and *Mysterious*. Player responses map to these tones. Consistently using a tone builds "Stance Reputation," unlocking deeper narrative branches (e.g., a shark dealer only respects Aggressive players).
* **Variable Text Parsing:** Write an interpolator that injects live variables directly into dialogue JSONs (e.g., `"Oh, I saw you bought {last_purchased_art} for ${last_purchased_price}..."`). 
* **Memory Matrix:** Expand the `npcStore` to track `grudges` and `favors`. Dialogue nodes will query this matrix to dynamically alter standard greetings based on past slights, ensuring the world feels alive.

---

## Level 5: Progression, Economy & Endgame
**Current State:** The player buys and sells art indefinitely until they run out of money.
**The Problem:** There is no defined win state, the late-game economy snowballs breaking balancing, and replayability is low once the systems are figured out.
**Refactoring Plan:**
* **The Week 26 Reckoning:** Hard-cap the initial game loop at 26 weeks (half a year). Week 26 forces a bespoke endgame sequence based on the player's primary stat vector:
    * *High Reputation + Low Cash:* "The Museum Retrospective" (Prestige Ending).
    * *High Cash + High Suspicion:* "The SEC Investigation" (Survival/Prison Ending).
    * *High Taste + High Intel:* "The Master Forger" (Shadow Broker Ending).
* **Anti-Snowball Taxation:** Implement rising maintenance fees (Storage, Insurance, Lifestyle) that scale with network size, ensuring the late game remains economically challenging.
* **Class Asymmetry:** Enforce unique starting conditions for the 3 classes. The 'Nepo Baby' starts with high Access but terrible Reputation; the 'Art Cop' starts with high Intel but no Cash. Each unlocks exclusive narrative branches.

---

## Level 6: Tooling & The Dev Experience
**Current State:** Testing narrative paths requires playing the game linearly and hoping the RNG favors you.
**The Problem:** Content authoring is blind, and debugging state bugs requires `console.log` diving.
**Refactoring Plan:**
* **Content Management Studio (CMS):** A bespoke React-based visual node editor running on a separate port. It validates JSON schema rules, previews Dialogue Tree flow, and exports `.json` directly into the `public` folder.
* **Omniscient God Mode:** Expand the `AdminDashboard`. Add a "State Injector" to arbitrarily teleport to Week 25, grant desired artworks, set NPC grudges, and instantly trigger any `EventID` without RNG to systematically verify branches.

---

## Implementation Strategy: The Critical Path

1. **Sprint 1: The Zustand Bedrock.** Rip out `GameState`, migrate to Zustand, fix save architectures, and enforce the React `App.jsx` UI routing boundary. 
2. **Sprint 2: The Content Pipeline.** Build the `.json` static asset loader, deprecate `.js` data arrays, and stand up the CMS tool.
3. **Sprint 3: Narrative Depth.** Implement the 4-Tone system, Memory Matrix, and Variable Text interpolation into the Dialogue Engine.
4. **Sprint 4: The Reckoning.** Build and polish the Week 26 Endgame sequences, finalizing the 3 Class paths, making the game fully playable end-to-end.
