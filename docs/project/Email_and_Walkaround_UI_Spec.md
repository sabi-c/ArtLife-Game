# ArtLife — Email Minigame & Walkaround UI Spec

> **Date:** 2026-02-21  
> **Status:** Ideation / Backlog  
> **Source:** User feedback  

---

## 1. The Email Minigame Concept
Currently, the game uses the `PhoneManager` and `messageDetailScreen` for all communications (texts, system alerts, offers). The new vision proposes splitting standard text-like communications from **Emails**.

### Features 
* **Distinct UI:** A dedicated Email client accessible via the Phone menu (or a future diegetic laptop/desk interface).
* **Interaction Types:** Unlike simple text messages that just have "Read/Delete" or simple action buttons, Emails can involve richer interactions (e.g., attachments, forwarding documents, drafting custom responses, or parsing complex contracts).
* **The Minigame:** Managing the inbox becomes a gameplay loop in itself. This could involve identifying spam, prioritizing VIP gallery offers, or cross-referencing attachments with `Intel` stats before signing deals.

### Current Implementation
A placeholder menu item `📧 Email (Coming Soon)` has been added to the main Phone screen in `src/terminal/screens/phone.js`.

---

## 2. The "Game Boy" Diegetic UI Transition
The current user interface relies heavily on the React-based DOM `TerminalUI` (which acts like a boot OS / mainframe). The long-term vision is to transition these menus into physical, spatial interactions using a **top-down 2D Overworld** (resembling classic Game Boy or Pokémon games).

### Rationale
* **Immersion:** Instead of navigating a list of text menus to "Visit Gallery", the player physically walks their avatar out of their apartment and into the gallery.
* **Iconography & Polish:** Moving away from text-lists to visual icons and interactable environmental objects (e.g., a physical laptop on a desk to open the Email minigame).

### Existing Foundation
We already have the technical foundation for this in the codebase:
* `GridEngine` is installed and actively used in `OverworldScene.js` and `CityScene.js`.
* Movement, collision, and interaction schemas are already being tested.
* The React DOM overlays (like the newly built `SettingsOverlay` and `AdminDashboard`) can easily be triggered by in-world Phaser events (e.g., interacting with a computer sprite emits `GameEvents.UI_TOGGLE_OVERLAY`).

### Next Steps for Implementation
1. **Map the Terminal to the World:** Audit every screen in the `TerminalUI` (Dashboard, Market, Inventory, Phone, World) and design a physical equivalent (e.g., Phone becomes an item in the HUD, Market is a physical auction house building).
2. **Diegetic Desk:** As specced in `UI_and_Dynamic_Systems_Spec.md`, the player's apartment should serve as a hub where menus are accessed via physical objects (PC = Emails/Stats, Corkboard = Intel/Pipelines).
