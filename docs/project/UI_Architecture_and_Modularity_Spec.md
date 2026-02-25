# UI & Backend Modularization Spec
## Art Market Game

This document outlines the architecture for decoupling the game's backend state from the UI presentation layer, allowing for plug-and-play UI modularity. This supports switching between different visual styles (e.g., Terminal mode, Game Boy walkaround mode, Visual Novel dialogue mode).

## 1. Core Philosophy: State vs. Presentation

The game engine must be headless, maintaining state, logic, and progression entirely separate from how it is rendered.

-   **Backend (The Engine):** Zustand stores and single-source-of-truth managers (`GameState`, `TerminalAPI`, `GameEventBus`).
-   **Frontend (The UI):** React components (DOM) and Phaser scenes (Canvas) acting as "plugins" that listen to the backend and dispatch actions to it.

## 2. Global Event Bus & Hooks (The "Wiring")

To modularize the UI, all communication happens through a standardized set of hooks and events.

### Global Events (`GameEventBus.js`)
Used for broad system-level changes that multiple UI components might care about.
*   `UI_TOGGLE_OVERLAY`: Mounts/unmounts a generic React overlay (e.g., `ADMIN`, `SETTINGS`, `EMAIL`).
*   `UI_ROUTE`: Base routing instruction (e.g., `switch to DASHBOARD`, `switch to WORLD_MAP`).
*   `TIME_ADVANCED`: Triggers UI refreshes when a week passes (used by tickers, news feeds, email inboxes).

### Data Hooks (Zustand Stores)
Specific UI components subscribe only to the data slices they need.
*   `useGameState()`: Core progression (week, cash, reputation, current city).
*   `useUIStore()`: active visual overlays, dialogue trees, cutscene states.
*   `useInventoryStore()`: Player portfolio, held items.

## 3. Interchangeable UI Plugins

A "UI Plugin" is a self-contained module (React component or Phaser Scene) that mounts when required.

### 3A. View Modes (Major Renderers)
*   **TerminalUI (React):** The classic text-based hacker interface.
*   **GameBoyUI (Phaser/React hybrid):** The new top-down RPG interface.

*Switching Logic:* The `App.jsx` router should check a global setting (`SettingsManager.get('gameMode')`). If `terminal`, it renders the classic React DOM. If `overworld`, it mounts the Phaser Game Canvas and hides the DOM.

### 3B. Floating Overlays (Drop-in React Components)
These can be rendered *on top* of any View Mode.
*   `SettingsOverlay`: Z-index 9999, handles game configuration.
*   `DialogueBox`: Visual Novel text box. Listens to `useUIStore.getState().dialog`.
*   `EmailClient`: Full-screen styled overlay for the Email minigame.
*   `AdminDashboard`: Developer hub.

## 4. Required Visual Assets & Icons Inventory

To fully realize the interchangeable UI, standardize the following graphic asset needs:

### A. Icons (Vector/SVG or 1-Bit Pixel)
*   **Navigation:** Back arrow, Exit, Settings Gear, Phone/Terminal toggle.
*   **Stats:** Cash (`$`), Reputation (`★`), Action Points (`■`), Heat (`🔥`), Burnout (`💤`).
*   **Items:** Unread Mail (`📧`), Contacts (`👤`), Market (`📈`).
*   **Interaction:** 'Press Space' prompt, dialogue advance caret (`▼`).

### B. UI Panels (9-Slice Scalable Textures)
*   **Classic Dark:** Solid black fill, 1px white border.
*   **Vaporwave/Mac:** Light grey fill (`#e0e0e0`), shadow edge, window title bar.
*   **Dialogue Box:** Elaborate frame for Visual Novel mode.

### C. Displaying Information
Information displays must define standard props so any UI can render them:
*   **Stat Bars:** Needs `label`, `currentValue`, `maxValue`, `color`. 
*   **Lists/Menus:** Needs `Array<{ label, action(), disabled, icon }>` (Already utilized in Terminal `ui.pushScreen`).
*   **Text Blocks:** Needs `typewriterStyle (bool)`, `speakerName`, `textColor`.

## 5. Next Steps for Implementation

1.  **Extract Routing:** Move all "pushScreen/popScreen" logic out of the Terminal-specific `ui` object and into a global `useRouterStore()`, so the Game Boy UI can trigger the exact same menus.
2.  **Asset Registry:** Create a central map (e.g., `assets.js`) that defines standard keys for the icons/panels listed above, ensuring both React and Phaser load the same graphics.
3.  **Component Library:** Begin isolating UI fragments (like the Stat Bars and Event Buttons) into a standard shared `/components/` folder that can be dropped into any overlay.
