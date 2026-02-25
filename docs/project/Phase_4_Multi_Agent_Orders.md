# Phase 4: Multi-Agent Execution Orders
> **Objective:** Parallelize the expansion of the Haggle Battle, Scene Engine, and Dialogue / Inventory systems.
> **Instructions for the User:** You can copy/paste the task blocks below and feed them directly to individual AI Agents (like Claude or another instance of Antigravity) to have them work on these systems simultaneously.

---

## 🟢 Agent 1: The Negotiator — Haggle Battle Expansion
**Target Files:** `game/src/scenes/HaggleScene.js`, `game/src/managers/HaggleManager.js`, `game/src/engines/SceneEngine.js`

**Your Objective:** The Haggle Battle currently works beautifully in isolation, but it needs to be wired into the broader game loop and "Juiced" up. 

**Task Checklist:**
1. **SceneEngine Bridge:** Modify `SceneEngine.js` so that if it encounters an ink tag like `# trigger: MINIGAME_HAGGLE`, it pauses the story, launches the Phaser `HaggleScene`, and upon resolution, returns to a specific knot in the `.ink` script (e.g., `-> haggle_won` or `-> haggle_lost`).
2. **State Resolution:** Update `HaggleManager.js` so that when a deal is struck (`onDeal`), it automatically triggers `useGameStore.getState().setCapital()` to deduct cash, and `useInventoryStore.getState().addItem()` to grant the artwork to the player.
3. **Add "Juice":** Integrate `use-sound` inside `HaggleScene.js` (or via React event listeners) to play a heavy "thud" sound when the player uses the `Hard Lowball` tactic, and use `react-powerglitch` or Phaser screen shakes if the dealer's patience drops below 2.

---

## 🔵 Agent 2: The Director — Scene Engine Visuals & Item Rewards
**Target Files:** `game/src/engines/SceneEngine.js`, `game/src/ui/ScenePlayer.jsx`, `game/src/stores/inventoryStore.js`

**Your Objective:** Transform the barebones `ScenePlayer` into a visual novel style storytelling engine, and allow narrative scenes to grant physical inventory items.

**Task Checklist:**
1. **Visual Parsing:** Update `SceneEngine.js` and `ScenePlayer.jsx` to constantly read the tags `# background: [image_key]` and `# npc: [sprite_key]`. 
2. **Visual Rendering:** Build out the UI in `ScenePlayer.jsx` to render the loaded background image covering the screen and place the assigned NPC sprite overlaying it, transitioning smoothly between slides.
3. **Narrative Rewards:** Add parsing logic in `SceneEngine.js` to detect `# reward: [item_id]`. When detected, automatically push a predefined item object into `useInventoryStore.getState().addItem()`. 
4. **Reward UI Toast:** Build a small, visually striking React toast notification that slides onto the screen in `ScenePlayer.jsx` saying "Item Acquired: [Item Name]" when a reward triggers.

---

## 🟣 Agent 3: The Architect — Dialogue & Inventory UI Integration
**Target Files:** `game/src/ui/DialogueBox.jsx`, `game/src/ui/InventoryDashboard.jsx` (Create Setup), `game/src/App.jsx`

**Your Objective:** Consolidate the old Dialogue logic into the new UI paradigm, and give the player a dedicated place to view the items they just earned from the Scene Engine.

**Task Checklist:**
1. **Build `InventoryDashboard.jsx`:** Create a new React component modeled similarly to `PlayerDashboard.jsx`. It should subscribe to `useInventoryStore` and display a sleek, neo-noir grid of items (like forged documents, VIP passes, or artwork folios) the player currently owns.
2. **Hook Up the Dashboard:** Add a toggle in `App.jsx` (and a button in the main UI/Terminal) to open the Inventory Dashboard smoothly. Ensure tapping ESC closes it.
3. **Refactor DialogueBox:** Currently, `DialogueBox.jsx` relies on an older `uiStore` method (`openDialogue`). Audit this file to ensure it plays nicely with the overarching DOM structure. Optionally, prepare it to accept "Interrupt" style dialogues that can pop up spontaneously from the new `PhoneStore` urgent messages without breaking gameplay.
