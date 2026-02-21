# Terminal Login & Dossier System Specification

## Overview
The user's initial interaction with the game will be through a stylized, animated "Terminal Login" sequence. This replaces a standard main menu with an immersive, hacker-style booting sequence that loads their "Dossier" (save file).

## The Flow
1. **Initial Boot (TitleScreen / Intro)**
   - The screen is black.
   - Text types out automatically with variable timing (simulating a retro terminal booting up).
   - `> CONNECTING TO ART SECURE NETWORK...`
   - `> HANDSHAKE ESTABLISHED.`

2. **Dossier Selection (User Select)**
   - The screen transitions to an `Authorize Dossier` prompt.
   - A list of existing profiles (Agents) is shown.
   - The user can:
     - **Select a dossier** to load an existing character.
     - **Delete a dossier** with a `[ DEL ]` command.
     - **Create a new dossier** (leads to Character Select/Creation).

3. **Authorization Animation (The Handoff)**
   - When a dossier is selected, a rapid terminal text animation plays.
   - `> AUTHORIZING AGENT [NAME]...`
   - `> DECRYPTING PORTFOLIO... [ OK ]`
   - `> SYNCING CALENDAR... [ OK ]`
   - The terminal flashes and smoothly fades into the main `PlayerDashboard` (or overworld).

## UI/UX Mechanics
- **Animation Quality**: Use variable timeouts (`setTimeout` with mathematical jitter) to make typing feel organic, not robotic.
- **Sound (Juice)**: Hook up `use-sound` to play mechanical keyboard clacks or terminal beeps during the text sequence (to be implemented by ClaudeCode, but we state the hooks).
- **DOM Structure**: The terminal sequence will be built using the existing `TerminalUI` rendering loop, leveraging `pushScreen()` and typewriter delays.

## Development Checklist
- [ ] Create `DossierScreen` in `TerminalUI` to list, load, and delete saves.
- [ ] Build the `TypingAnimation` utility to handle variable-speed text readout.
- [ ] Implement the login transition sequence directly before the `PlayerDashboard` mounts.
- [ ] Update `App.jsx` and `GameEventBus` to track standard login flow.
