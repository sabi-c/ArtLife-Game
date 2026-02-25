# ArtLife Game — Architecture

## Data Flow

```
data/*.js  ──→  managers/*.js  ──→  stores/*.js  ──→  ui/*.jsx
(static)        (business logic)     (reactive)        (display)
                       ↕
                GameEventBus
                (pub/sub events)
```

## Layers

| Layer | Files | Purpose |
|---|---|---|
| `data/` | 21+ | Static content: artworks, events, NPCs, storylines, maps, ink scenes |
| `core/` | 5 | Route constants (`views.js`), game tick, scene engine, expression parser |
| `managers/` | 24+ | Business logic: market sim, haggle, dialogue, save/load, NPC, events |
| `stores/` | 11+ | Zustand reactive state: subscribable by React components |
| `hooks/` | 2 | `usePageRouter` (URL ↔ VIEW/OVERLAY sync), `useBloombergFeed` |
| `ui/` | 75+ | React pages, overlays, CMS editors, dashboards |
| `ui/cms/` | 18+ | CMS editors — PageEditor v3, FlowEditor, MapEditor + 15 more |
| `ui/email/` | 6+ | Unified email negotiation (EmailOverlay, inbox/, haggle/) |
| `ui/terminal/` | 15+ | Text-based CLI screens (dashboard split into 4 sub-modules) |
| `scenes/` | 14 | Phaser: overworld (NewWorldScene), battle, dialogue, title, travel |
| `scenes/haggle/` | 3 | HaggleScene mixins: HaggleRenderer, HaggleTactics, HaggleDialogue |
| `utils/` | 12+ | math, format, shuffle, id, ContentAPI, ContentExporter, safeScene |

## Key Stores

| Store | Consumers | Purpose |
|---|---|---|
| `cmsStore` | 13 | CMS bundle save/load/export — backbone of content pipeline |
| `npcStore` | 14 | NPC contacts, memory, favor, grudges |
| `marketStore` | 9 | Artist prices, heat, market state |
| `uiStore` | ~15 | Active view, overlay, route state |
| `storylineStore` | 5 | Story arcs, chapters, completion |
| `inventoryStore` | 4 | Player portfolio, collection |
| `contentStore` | 3 | Kanban board content tracking |
| `eventStore` | 2 | Event registry state |
| `gameStore` | 2 | Scene engine game state (engines/) |
| `calendarStore` | 1 | Calendar/tick state (engines/) |
| `consequenceStore` | 1 | Scheduled consequence queue |

## Key Managers

| Manager | Purpose |
|---|---|
| `GameState` | Singleton — save/load, player state, source of truth |
| `GameEventBus` | Pub/sub event system — decouples all layers |
| `MarketManager` | Artist heat, price calc, market cycles |
| `HaggleManager` | 3-mode negotiation engine |
| `WeekEngine` | Weekly tick — runs DealResolver, production, market sim |
| `SettingsManager` | Global settings, market style, Bloomberg panels |
| `DialogueEngine` | Text-based conversation system |
| `ConsequenceScheduler` | Delayed game consequences |

## Overlay Router

All overlays are lazy-loaded (`React.lazy`) and wrapped with `OverlayErrorBoundary`
(component name + CLOSE/RETRY). See `ui/OverlayRouter.jsx`.

## CMS Pipeline

```
CMS Editors (ui/cms/*.jsx)
    ↓ write to
cmsStore (Zustand)
    ↓ export/import
JSON bundle (artlife_cms_export_YYYY-MM-DD.json)
```

18+ editors: Artwork, Event, Storyline, NPC, Room, Map, Venue, Haggle,
Timeline, Kanban, MarketSim, DataHub, DataIngestion, EngineOverview,
ArtTerminal, TearSheet, ActivityLog, **PageEditor v3**, **FlowEditor**.

## Deprecated Files

Located in `*/_deprecated/` directories — kept for reference:
- `ui/_deprecated/` — CMSOverlay, GlobalMapCanvas, StorylineCMS
- `stores/_deprecated/` — phoneStore
- `managers/_deprecated/` — MarketConfig, OverworldHelper
