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
| `data/` | 29 | Static content: artworks, events, NPCs, storylines, maps |
| `managers/` | 24 | Business logic: market sim, haggle, dialogue, save/load |
| `stores/` | 12 | Zustand reactive state: subscribable by React components |
| `ui/` | ~60 | React pages, overlays, CMS editors, dashboards |
| `ui/cms/` | 17 | Content management editors (wired to `cmsStore`) |
| `scenes/` | 13 | Phaser: overworld, battle, dialogue, title, travel |
| `terminal/` | ~8 | Text-based CLI interface |
| `engines/` | ~3 | Game tick, scene engine, calendar |
| `constants/` | 1 | VIEW and OVERLAY route constants |

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

17 editors: Artwork, Event, Storyline, NPC, Room, Map, Venue, Haggle,
Timeline, Kanban, MarketSim, DataHub, DataIngestion, EngineOverview,
ArtTerminal, TearSheet, ActivityLog.

## Deprecated Files

Located in `*/_deprecated/` directories — kept for reference:
- `ui/_deprecated/` — CMSOverlay, GlobalMapCanvas, StorylineCMS
- `stores/_deprecated/` — phoneStore
- `managers/_deprecated/` — MarketConfig, OverworldHelper
