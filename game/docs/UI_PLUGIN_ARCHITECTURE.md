# ArtLife — UI Plugin Architecture

## Overview

ArtLife's UI is designed as a **swappable skin layer** on top of a shared game state engine. The game logic (stats, inventory, market simulation, dialogue trees, haggle mechanics) is fully decoupled from how screens look and feel. This means we can ship multiple UI themes without touching game logic.

---

## Current Architecture

```
┌─────────────────────────────────────────────┐
│                  App.jsx                     │
│  (React root — mounts Phaser + React overlay)│
├──────────────┬──────────────────────────────┤
│  Phaser Layer │     Terminal Layer           │
│  (z-index: 0) │     (z-index: 10)           │
│               │                              │
│  TitleScene   │  TerminalUI.js               │
│  IntroScene   │    ├─ screens/dashboard.js   │
│  CharSelect   │    ├─ screens/market.js      │
│  HaggleScene  │    ├─ screens/phone.js       │
│  Overworld    │    ├─ screens/journal.js     │
│  LocationScene│    ├─ screens/world.js       │
│  DialogueScene│    └─ screens/system.js      │
│               │                              │
│  Canvas-based │  DOM-based (HTML/CSS)        │
└──────────────┴──────────────────────────────┘
         │                    │
         └────────┬───────────┘
                  ▼
         ┌────────────────┐
         │   Game State    │
         │   (GameState.js)│
         │   (TerminalAPI) │
         │   (HaggleMgr)   │
         │   (Zustand store)│
         └────────────────┘
```

### Key Files

| File | Role | UI-Swappable? |
|------|------|---------------|
| `src/managers/GameState.js` | Core state: cash, stats, portfolio, week | NO — shared across all UIs |
| `src/managers/HaggleManager.js` | Haggle logic (tactics, patience, pricing) | NO — shared |
| `src/terminal/TerminalAPI.js` | Bridge between UI screens and GameState | NO — shared |
| `src/terminal/TerminalUI.js` | DOM renderer for terminal screens | YES — swap this |
| `src/terminal/screens/*.js` | Screen content (what text/options to show) | YES — swap these |
| `src/scenes/TitleScene.js` | Phaser canvas title screen | YES — swap this |
| `src/scenes/IntroScene.js` | Phaser canvas intro cinematic | YES — swap this |
| `src/scenes/CharacterSelectScene.js` | Phaser canvas character creator | YES — swap this |
| `src/scenes/HaggleScene.js` | Phaser canvas haggle battle | YES — swap this |
| `src/data/characters.js` | Character definitions, stats, traits | NO — shared |
| `src/data/artworks.js` | Art piece database | NO — shared |
| `src/data/dialogue_trees.js` | NPC dialogue content | NO — shared |
| `src/ui/TickerSystem.js` | Kruger-style scrolling ticker | YES — theme-specific |
| `src/style.css` | All terminal CSS styling | YES — swap this |

---

## Screen Lifecycle

Every terminal screen is a **thunk** — a function that returns `{ lines, options, footerHtml? }`:

```js
export function dashboardScreen(ui) {
    return () => {
        const s = TerminalAPI.state();
        const lines = [ H('EGO TERMINAL'), ... ];
        const options = [ { label: 'Browse Market', action: () => ... } ];
        return { lines, options };
    };
}
```

**To create a new UI theme**, you replace the screen functions and the renderer, not the game logic.

---

## How to Swap UI Themes

### Option A: CSS-Only Reskin
Easiest. Change `src/style.css` colors, fonts, backgrounds. No code changes.

**Good for:** Uplink theme, Bloomberg theme, 90s Geocities theme

### Option B: Screen Content Swap
Replace the text/layout in `src/terminal/screens/*.js`. Same renderer, different content.

**Good for:** Different diegetic framings (bank portal vs. desk objects vs. gallery wall)

### Option C: Full Renderer Swap
Replace `TerminalUI.js` with a new renderer class that implements the same interface:

```js
class NewRenderer {
    constructor(container) { ... }
    pushScreen(screenFn) { ... }
    popScreen() { ... }
    replaceScreen(screenFn) { ... }
    render() { ... }
    showNotification(msg, icon) { ... }
}
```

**Good for:** Radically different UI paradigms (desk with clickable objects, website-style, etc.)

### Option D: Full Phaser Scene Swap
Replace the Phaser scenes (`TitleScene`, `CharacterSelectScene`, `HaggleScene`). These are independent classes — swap them in `phaserInit.js`'s `sceneList` array.

**Good for:** Different visual styles for the canvas-rendered scenes

---

## UI Theme Concepts

### 1. Terminal (Current — "Uplink" inspired)
- **Renderer:** `TerminalUI.js` (DOM text renderer)
- **Aesthetic:** Monospace text, scanlines, gold accents, keyboard navigation
- **Diegetic frame:** Bloomberg terminal / Swiss bank portal
- **Scenes:** Minimal Phaser (dark backgrounds, text-driven)
- **Reference:** Uplink (Introversion), Her Story, Hacknet

### 2. Desk & Objects
- **Renderer:** New React component with clickable hotspots
- **Aesthetic:** Top-down desk view, physical objects (phone, newspaper, rolodex, art catalog)
- **Diegetic frame:** Your actual desk — changes as you level up
- **Dynamic elements:**
  - Rolodex grows as you meet contacts
  - Art pieces appear on wall behind desk
  - Calendar shows upcoming events
  - Phone rings for incoming offers
  - Newspaper headline changes weekly
  - Desk upgrades: cheap IKEA → mahogany → marble
  - Drug paraphernalia appears/disappears based on Vice
- **Scenes:** Phaser scenes with sprite-based desk, click targets
- **Reference:** Papers Please, Lucas Pope's desk games, Her Story

### 3. Gallery Website
- **Renderer:** React component styled as a clean art gallery website
- **Aesthetic:** White space, serif fonts, minimal grid layouts
- **Diegetic frame:** Your gallery's website / online viewing room
- **Dynamic elements:**
  - Portfolio page shows your collection
  - "Inquire" buttons for market
  - News feed as blog posts
  - Artist pages with bios
- **Reference:** Gagosian.com, David Zwirner site, Are.na, Brad Troemel's work

### 4. Period-Accurate (Era Mode)
- **Renderer:** CSS theme swap per decade
- **Aesthetic:** Changes based on starting era
  - 1980s: CRT green phosphor, no internet, fax machine, Rolodex
  - 1990s: Windows 95 style, early web, email
  - 2000s: Web 2.0, BlackBerry, art fairs boom
  - 2020s: Current terminal aesthetic, Instagram influence
- **Diegetic frame:** The tools available in that era
- **Dynamic elements:**
  - Technology unlocks over time (fax → email → Instagram)
  - Drug availability changes (cocaine 80s → pills 90s → microdosing 2020s)
  - Art market events tied to real history (Basquiat death '88, dot-com crash '00, NFT boom '21)
  - Each 40-year playthrough spans multiple visual eras
- **Reference:** Hypnospace Outlaw, Digital: A Love Story

---

## Shared Game State (Never Changes Between Themes)

```
GameState {
    playerName, characterId, characterIcon
    cash, portfolio[], activeDeals[]
    week, currentCity, marketState
    reputation (HYP), taste (TST), audacity (AUD), access (ACC), intel
    burnout, marketHeat
    selectedTrait, selectedDrip, selectedVice
    actionsThisWeek, newsFeed[], pendingOffers[]
    eventsTriggered[]
}
```

### TerminalAPI Methods (Shared Interface)
```
TerminalAPI.state()              → current GameState
TerminalAPI.market.getAvailableWorks()
TerminalAPI.market.getArtist(id)
TerminalAPI.haggle.start(config)
TerminalAPI.haggle.getState()
TerminalAPI.advanceWeek()
TerminalAPI.getPortfolioValue()
TerminalAPI.addNews(text)
TerminalAPI.network.getUnreadCount()
TerminalAPI.dialogue.convertTreeToEvent(tree)
```

Any UI theme can call these methods — the game logic doesn't care how it's rendered.

---

## Adding a New Theme: Step-by-Step

1. **Create a theme directory:** `src/themes/desk/` (or `gallery/`, `retro/`, etc.)
2. **Implement a renderer** that matches the `TerminalUI` interface (pushScreen, popScreen, render, showNotification)
3. **Create screen functions** that return `{ lines, options }` (or your theme's equivalent data structure)
4. **Create a CSS file** for the theme's styling
5. **Wire it up** in `phaserInit.js` by swapping the renderer instantiation:
   ```js
   // const ui = new TerminalUI(container);     // Terminal theme
   // const ui = new DeskUI(container);          // Desk theme
   // const ui = new GalleryWebUI(container);    // Gallery theme
   ```
6. **Swap Phaser scenes** if needed (TitleScene, CharacterSelectScene have visual themes baked in)

### Theme Config (Future)
```js
// src/themes/index.js
export const THEMES = {
    terminal: { renderer: TerminalUI, css: 'terminal.css', scenes: defaultScenes },
    desk:     { renderer: DeskUI,     css: 'desk.css',     scenes: deskScenes },
    gallery:  { renderer: GalleryUI,  css: 'gallery.css',  scenes: galleryScenes },
    retro:    { renderer: RetroUI,    css: 'retro.css',    scenes: retroScenes },
};
```

---

## Current Screen Map (V2 Diegetic Theme)

| Screen | Diegetic Frame | File |
|--------|---------------|------|
| Title | "Membership Portal" — Swiss bank login | `TitleScene.js` |
| Intro | "Intake Briefing" — narrator cinematic | `IntroScene.js` |
| Character Create | "Wealth Management Intake" — 6-section form | `CharacterSelectScene.js` |
| Dashboard | "Ego Terminal" — Bloomberg for snobs | `screens/dashboard.js` |
| Market | "Online Viewing Room" — TST/ACC gated | `screens/market.js` |
| Haggle | "Boardroom Bloodbath" — poker/negotiation | `HaggleScene.js` |
| Portfolio | Collection management | `screens/market.js` |
| Phone | Messages & contacts | `screens/phone.js` |
| Journal | Calendar & log | `screens/journal.js` |
| City/Travel | World map & fast travel | `screens/world.js` |
| Overworld | Pokemon-style walk mode | `OverworldScene.js` |

---

## Stat-Gated UI Elements

These are **game mechanics** that affect what the player sees, regardless of theme:

| Stat | UI Gate | Implementation |
|------|---------|---------------|
| TST (Taste) | Market info visibility | `inspectScreen()` — price precision, artist name, description |
| ACC (Access) | Market work count | `marketScreen()` — velvet rope, 3/5/7/8 works visible |
| AUD (Audacity) | Haggle options | `HaggleScene` — NERVE bar, hardLowball at AUD≥50 |
| HYP (Reputation) | NPC dialogue gates | `dialogue_trees.js` — stat requirements on branches |
| Intel | Market intel sections | `inspectScreen()` — unlocks at 20/40/60/80 intel |

These gates should be preserved across ALL themes.
