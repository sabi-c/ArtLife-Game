# ArtLife — Art Market Game

> A text-based art market simulation where you play as an emerging art dealer navigating galleries, collectors, auctions, and the volatile contemporary art market.

## Quick Start

```bash
cd game
npm install
npm run dev          # → http://localhost:5173
npx vite build       # Production build
```

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│               REACT UI LAYER (App.jsx)                   │
│  ViewRouter (full-page views, lazy-loaded)               │
│  OverlayRouter (modals on top, lazy-loaded + boundaries) │
│  email/ module (EmailOverlay — unified haggle + deals)   │
└──────────────┬───────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────┐
│                     PHASER GAME LAYER                    │
│  NewWorldScene, CityScene, LocationScene,                │
│  HaggleScene (3-mixin), DialogueScene, MacDialogueScene  │
└──────────────┬───────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────┐
│                     MANAGER LAYER (24+)                  │
│                                                          │
│  GameState ──── WeekEngine ──── MarketManager            │
│       │              │               │                   │
│       ├── NPCManager │     MarketSimulator (NPC-NPC)     │
│       ├── HaggleManager (player haggle battles)          │
│       ├── DialogueEngine + DialogueTreeManager           │
│       ├── PhoneManager, DealResolver                     │
│       └── ActivityLogger, ConsequenceScheduler           │
└──────────────┬───────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────┐
│                      DATA LAYER                          │
│  artists.js, artworks.js, contacts.js, rooms.js,         │
│  dialogue_trees.js, haggle_config.js, calendar_events.js │
│  storylines.js, world_locations.js, events/ (8 files)   │
└──────────────┬───────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────┐
│                    STORE LAYER (Zustand, 11+)             │
│  marketStore, cmsStore, npcStore, uiStore                │
│  storylineStore, calendarStore, consequenceStore         │
│  inventoryStore, contentStore, eventStore, gameStore     │
└──────────────┬───────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────┐
│                    CMS / ADMIN LAYER                     │
│  MasterCMS.jsx (15 tabs) →                               │
│    PageEditor v3, FlowEditor, MapEditor, VenueEditor,    │
│    ArtworkEditor, NPCEditor, EventEditor, StorylineEditor│
│    HaggleEditor, MarketSimDashboard, DataHub, KanbanBoard│
└──────────────────────────────────────────────────────────┘
```

### Routing System

URL-based routing via `hooks/usePageRouter.js`. Pattern: `/{page}?overlay={overlay}`.

| URL | View | Overlay |
|-----|------|---------|
| `/` | PHASER | Bloomberg/Artnet (user preference) |
| `/boot` | BOOT | — |
| `/terminal` | TERMINAL | — |
| `/market` | PHASER | BLOOMBERG |
| `/inbox` | PHASER | GMAIL_GUIDE |
| `/artnet` | PHASER | ARTNET_MARKETPLACE |
| `/cms` | PHASER | MASTER_CMS |
| `/admin` | PHASER | ADMIN |
| `/character` | CHARACTER_CREATOR | — |
| `/debug` | PHASER | DEBUG_LOG |
| `/sales` | PHASER | SALES_GRID |

## Market Economy System

The game's economy is powered by three interconnected engines:

### 1. MarketManager (Pricing Engine)
**File:** `src/managers/MarketManager.js`

Core pricing formula:
```
price = basePrice × heatMult × marketMult × eraMod × flipperPenalty × hedonicMult 
        + Ornstein-Uhlenbeck jitter
```

Features:
- **Artist Heat** — per-artist popularity (0-100), evolves weekly
- **Hedonic Pricing** — provenance, medium, age, exhibition history multipliers
- **Market Cycles** — bull/bear/flat with natural transitions
- **Composite Index** — cap-weighted market index (base 1000, like S&P 500)
- **Sector Indices** — per-tier breakdowns (blue-chip, hot, mid-career, emerging)
- **Gallery Buyback Floor** — artificial price support simulation
- **O-U Jitter** — mean-reverting random walk for realistic price movement

### 2. MarketSimulator (NPC Trading)
**File:** `src/managers/MarketSimulator.js`

4-phase weekly pipeline:
1. **Decision** — NPCs evaluate buy/sell based on stress, cash, market cycle
2. **Matching** — Score-based order book pairing (genre, tier, price fit)
3. **Negotiation** — 3-round simplified haggle between NPCs
4. **Settlement** — Transfer artwork/cash, boost heat, log trade

Also provides:
- Multi-week simulation for CMS testing
- Market events system (8 types: auction records, scandals, museum shows, etc.)
- Per-week price history tracking for charts
- Open order book for dashboard visualization

### 3. HaggleManager (Player Battles)
**File:** `src/managers/HaggleManager.js`

Pokémon-style type-effectiveness negotiation:
```
Emotional > Aggressive > Financial > Logical > Emotional
```

- 8 base tactics + stat-gated Blue Options
- 9 dealer personality types (Shark, Patron, Calculator, etc.)
- NPC taste/wealth/collection awareness
- Type effectiveness: Super Effective (+20% success, 1.5× price shift)

## CMS (Director's Chair)

Navigate to `/cms` or press `` ` `` to open AdminDashboard → switch to MasterCMS. 15 tabs:

| Tab | Component | Purpose |
|-----|-----------|---------|
| Project Board | KanbanBoard | Task tracking (Kanban) |
| Timeline | TimelineCalendar | Timeline event scheduling |
| Storylines | StorylineEditor | Narrative arc manager with graph viz |
| Events / Dialogue | EventEditor | Game events with consequence chains |
| NPCs & Roles | NPCEditor | Edit contacts, relationships, haggle profiles |
| Artworks / Market | ArtworkEditor | Full artwork database with market panel |
| Haggle Battles | HaggleEditor | Negotiation battle configuration |
| Market Sim | MarketSimDashboard | 8-view Bloomberg-style market analysis |
| Live Terminal | ArtTerminal | Live CLI interface |
| Venues / Map | VenueEditor | Room and venue management |
| Activity Log | ActivityLogViewer | Change and event log |
| Data Hub | DataHub | Content templates, import/export |
| Engines | EngineOverview | Engine status dashboard |
| **Pages** | **PageEditor v3** | **All game screens — hierarchical tree + property panel** |
| Flow Map | FlowEditor | Node-based scene transition graph |

## Data Files

| File | Purpose |
|------|---------|
| `artists.js` | Artist definitions (tier, heat, price ranges, flavor) |
| `artworks.js` | Artwork catalogue (title, medium, price, genre, tier) |
| `contacts.js` | NPC profiles (wealth, taste, haggleProfile, network) |
| `haggle_config.js` | Haggle battle balance (tactics, dealer types, dialogue) |
| `rooms.js` | Location definitions for overworld |
| `dialogue_trees.js` | Branching dialogue data |
| `calendar_events.js` | Art world calendar (fairs, auctions, openings) |

## Stores (Zustand)

| Store | Persisted | Purpose |
|-------|-----------|---------|
| `marketStore` | Partial | Artist snapshots, price history, market cycle |
| `cmsStore` | Yes | CMS snapshots, dirty flags, edit history |
| `npcStore` | Yes | CMS-edited NPC overrides, relationship edits |
| `uiStore` | No | UI state (modals, active panels) |

## Key Integration Points

```
Artwork Price Flow:
  artists.js → MarketManager.calculatePrice() → artwork.price
       ↓                                              ↓
  marketStore.syncFromManager()         HaggleManager.start() 
       ↓                                     (uses price as askingPrice)
  MarketSimDashboard (charts)                    ↓
  ArtworkEditor (market panel)          HaggleScene (battle UI)
                                              ↓
                                    HaggleManager.applyResult()
                                         (updates GameState)
```

## For Other Agents

Every manager file has an **ARCHITECTURE CONTEXT** block at the top documenting:
- What this file owns
- What it depends on
- Who calls it
- What it produces
- Integration points with other systems

Look for `ARCHITECTURE CONTEXT (for other agents)` in file headers.

## Tech Stack

- **Game Engine:** Phaser 3 (scenes, canvas, sprites, input)
- **UI Framework:** React 19 (overlays, CMS, dashboards)
- **State:** Zustand 5 (with immer + persist middleware)
- **Narrative:** inkjs (compiled .ink story JSONs)
- **Grid Movement:** GridEngine (tile-based overworld)
- **Build:** Vite 5 (SW auto-versioning, manual Phaser chunk)
- **Styling:** Inline styles + CSS (CMS dark theme, `--email-*` tokens)
- **Node Editor:** @xyflow/react (FlowEditor tab)
- **Drag & Drop:** @hello-pangea/dnd (Kanban board)
- **Charts:** Recharts (market analytics)
