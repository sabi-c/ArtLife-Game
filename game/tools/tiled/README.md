# Tiled Map Editor — Room Editing Guide

## Quick Start (3 Steps)

```bash
# 1. Start the room watcher (in one terminal)
npm run room:watch

# 2. Open a room in Tiled (in another terminal)
npm run room:edit chelsea_showcase -- --open

# 3. Edit in Tiled → Cmd+S to save → game auto-reloads!
```

The watcher detects your save, auto-exports to JSON, and Vite HMR reloads the game.

## Opening the Tiled Project

For the best experience, open the Tiled project file first:

1. Open Tiled
2. File > Open Project > navigate to `tools/tiled/ArtLife.tiled-project`
3. This configures Tiled to find all tilesets and templates

Then open any `.tmx` file from `tools/tiled/`.

## Available Commands

```bash
# Convert a game map to editable TMX format
npm run room:edit <map_id>
npm run room:edit chelsea_showcase -- --open

# Generate a new room from template
npm run room:new museum my_gallery --title "My Gallery"

# List all rooms
npm run room:list

# Validate room walkability
npm run room:validate chelsea_showcase

# Start the file watcher
npm run room:watch
```

## Editable Maps

All game maps have been converted to TMX for Tiled editing:

| Map | Size | Description |
|-----|------|-------------|
| `chelsea_showcase` | 18×14 | Museum gallery — 9 paintings, Elena Ross NPC |
| `chelsea_gallery` | 16×14 | Chelsea gallery with 9 paintings |
| `soho_gallery_lobby` | 12×10 | SoHo gallery lobby |
| `soho_gallery_exhibition` | 16×12 | Exhibition room with 8 paintings |
| `soho_gallery_office` | 10×8 | Gallery office |
| `uptown_gallery` | 12×10 | Uptown gallery |
| `artist_studio_visit` | 14×10 | Artist's studio |
| `gallery_test` | 12×10 | Test gallery |
| `room_template` | 12×10 | Blank template for new rooms |

## Tilesets

### Room_Builder_free_48x48 (firstgid = 1)
- **Walls**: Rows 0-4 (tiles 1-85) — tops, fronts, corners, sides
- **Floors**: Rows 5+ (tiles 86-391) — wood, tile, concrete, carpet varieties
- Wall tiles have `collides: true` set in the .tsx file

### Interiors_free_48x48 (firstgid = 392)
- **Furniture**: Sofas, tables, desks, chairs, bookcases, beds
- **Decorations**: Plants, lamps, vases, paintings, rugs
- **Kitchen/Bath**: Counters, sinks, toilets, fridges
- See `src/data/interior_tile_map.json` for full tile ID reference
- Add `collides: true` on furniture that should block movement

## Layer Structure (IMPORTANT)

Your map MUST have these 4 layers in this order:

| Layer | Type | Purpose |
|-------|------|---------|
| `below_player` | Tile Layer | Floors, rugs, floor details |
| `world` | Tile Layer | Walls, furniture, objects at player level |
| `above_player` | Tile Layer | Ceiling details, overhanging elements |
| `objects` | Object Layer | Spawn, doors, NPCs, paintings, dialogs |

## Object Types

Add these as **Point** objects on the `objects` layer:

### spawn
- **Name**: `spawn`
- Player starts here when entering the room
- Place near the south/bottom door

### door
- **Name**: `door`
- **Properties**:
  - `nextMap` (string): venue ID to enter, or `worldscene` to exit to overworld
  - `nextMapRoom` (string): room ID within the venue (optional)
  - `label` (string): display name shown during transition

### painting
- **Name**: `painting`
- **Properties**:
  - `title` (string): artwork title
  - `artist` (string): artist name
  - `price` (string): price in dollars (e.g., "48000")
  - `description` (string): medium, year, style description
- Place on walls (row 1 typically = north wall)

### npc
- **Name**: `npc`
- **Properties**:
  - `id` (string): NPC contact ID (e.g., "elena_ross")
  - `label` (string): display name (e.g., "Elena Ross")
  - `dialogue` (string): initial greeting text
  - `canHaggle` (bool): whether this NPC can negotiate artwork sales

### dialog
- **Name**: `dialog`
- **Properties**:
  - `content` (string): text to show when player interacts

## Collision Setup

In Tiled, set the `collides` custom property on tiles that should block movement:

1. Open a tileset (click the tileset tab at bottom)
2. Select wall/furniture tiles
3. In Properties panel: Add Property > Name: `collides` > Type: `bool` > Value: `true`
4. GridEngine uses `collisionTilePropertyName: 'collides'` to detect blocked tiles

The Room_Builder wall tiles already have collision set in the .tsx file.

## Map Size Guidelines

| Room Type | Size | Notes |
|-----------|------|-------|
| Small gallery | 10×8 | Intimate, 2-4 paintings |
| Standard gallery | 14×10 | Main exhibition, 6-8 paintings |
| Large gallery | 16×14 | Showcase room, 9+ paintings |
| Office | 8×8 | Small back office |
| Lobby | 12×8 | Entry area |

## Tips

- **Tile size is 48×48 pixels** — all tiles and the grid use this size
- **Zoom to 2x** in Tiled to see tiles at game scale
- **Floor first**: Paint the `below_player` layer completely with floor tiles
- **Walls on world layer**: Place walls on the `world` layer with `collides: true`
- **Furniture on world layer**: Tables, desks, chairs go on `world`
- **Exit door at bottom**: Convention is to place the exit door on the south wall (last row)
- **Spawn 1 tile above exit**: Place spawn point 1-2 tiles north of the exit door
- The camera follows the player at 2x zoom — design for the player seeing ~6-8 tiles around them
