# 🔧 Technical Stack — Recommended

> How to actually build ArtLife, with rationale for each choice.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                   BROWSER                         │
│                                                    │
│  ┌──────────────┐   ┌────────────────────────┐   │
│  │   Phaser 3    │   │   Ink / inkjs           │   │
│  │  Game Engine  │◄──┤  Narrative Engine       │   │
│  │  (rendering,  │   │  (dialogue, events,     │   │
│  │   input, UI)  │   │   branching choices)     │   │
│  └──────┬───────┘   └────────────────────────┘   │
│         │                                          │
│  ┌──────▼───────────────────────────────────────┐ │
│  │         Game State Manager (JS)               │ │
│  │  Portfolio, Market, Artists, NPCs, Calendar   │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │              localStorage / IndexedDB         │ │
│  │              (save / load system)             │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## Layer 1 — Game Engine: Phaser 3

| Aspect | Detail |
|---|---|
| **What** | Open-source 2D game framework for HTML5 |
| **Why** | Purpose-built for browser games. Handles canvas rendering, sprite management, input, audio, and scene management. Huge community, excellent docs. |
| **Pixel art support** | First-class — Aseprite import, crisp pixel scaling, no anti-aliasing blurring |
| **Turn-based fit** | Scene-based architecture maps perfectly to turn phases (Action → Resolution → Event → New Week) |
| **Alternative considered** | Pixi.js (renderer only — no game-level features), vanilla Canvas (too low-level) |
| **Install** | `npm install phaser` or CDN |
| **Docs** | [phaser.io](https://phaser.io) |

---

## Layer 2 — Narrative Engine: Ink + inkjs

| Aspect | Detail |
|---|---|
| **What** | Inkle Studios' scripting language for branching interactive fiction, with a JS runtime |
| **Why** | Designed for exactly the dialogue trees and event branching in your GDD. Writer-friendly syntax. Used in commercial games (*80 Days*, *Sorcery!*). Separates narrative from game code. |
| **How it integrates** | Write `.ink` files → compile to JSON → load with `inkjs` in the browser → Phaser renders the choices as UI elements |
| **Key features** | Variables, conditional branches, knots/stitches (story sections), tags, external function calls back into game state |
| **Alternative considered** | Twine/Twee (good but less integration-friendly), hardcoded JS (unmaintainable at scale) |
| **Install** | `npm install inkjs` + [Inky editor](https://github.com/inkle/inky) for writing |

---

## Layer 3 — Game State Manager: Pure JavaScript

| Aspect | Detail |
|---|---|
| **What** | Custom JS modules managing the simulation: artists, market, portfolio, NPCs, calendar |
| **Why** | No framework needed — a clean class-based structure keeps state predictable and testable |
| **Pattern** | Central `GameState` object with sub-managers (`MarketManager`, `PortfolioManager`, `ArtistManager`, `EventScheduler`) |
| **Persistence** | Serialize to JSON → store in `localStorage` (simple) or `IndexedDB` (larger saves) |

---

## Layer 4 — Build & Dev Tools

| Tool | Purpose |
|---|---|
| **Vite** | Fast dev server with hot-reload. Works great with Phaser. |
| **Aseprite** | Pixel art editor for sprites, UI elements, portraits (paid, $20) |
| **Inky** | Visual editor for writing Ink stories (free, open source) |
| **Git + GitHub** | Version control. Public or private repo. |

---

## Art Style Technical Approach: "8-Bit Noir"

```
Palette:   Deep blacks, muted golds, burgundy, smoke grey, ivory white
Font:      Pixel font (e.g. "Press Start 2P" from Google Fonts) for UI
           Serif font (e.g. "Playfair Display") for narrative text
Effects:   CRT scanline overlay (CSS or shader), slight vignette
           Typewriter text reveal for dialogue
           Subtle grain / noise filter on backgrounds
```

---

## Minimal First Setup (Get Something On Screen)

```bash
# 1. Create project
mkdir artlife && cd artlife
npm init -y

# 2. Install core dependencies
npm install phaser inkjs
npm install -D vite

# 3. Project structure
artlife/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js          # Phaser entry point
│   ├── scenes/
│   │   ├── BootScene.js
│   │   ├── MenuScene.js
│   │   ├── GameScene.js
│   │   └── DialogueScene.js
│   ├── managers/
│   │   ├── GameState.js
│   │   ├── MarketManager.js
│   │   ├── ArtistManager.js
│   │   └── PortfolioManager.js
│   ├── data/
│   │   ├── artists.json
│   │   └── events.json
│   └── narrative/
│       ├── main.ink       # Master Ink file
│       └── compiled.json  # Compiled output
├── assets/
│   ├── sprites/
│   ├── ui/
│   └── audio/
└── ink/
    └── *.ink              # Raw Ink story files
```

---

## Reference Repos & Tutorials

| Resource | URL | Relevance |
|---|---|---|
| Oregon Trail JS Remake | [GitHub](https://github.com) (search "oregon trail javascript") | Core loop reference: resource management + events + decisions |
| GameDev Academy Oregon Trail Tutorial | [gamedevacademy.org](https://gamedevacademy.org) | Step-by-step HTML5 text game with events, stats, and shops |
| Phaser 3 Turn-Based RPG Tutorial | [phaser.io/tutorials](https://phaser.io) | Scene management and turn-based flow in Phaser |
| inkjs GitHub | [github.com/y-lohse/inkjs](https://github.com/y-lohse/inkjs) | Official JS runtime for Ink + boilerplate template |
| Inky Editor | [github.com/inkle/inky](https://github.com/inkle/inky) | Visual writing tool for Ink narratives |
| Phaser + Ink Demo | GitHub: "phaser-ink-demo" | Integration example |

---

## Tags
#project #technical #stack #game-design
