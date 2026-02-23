# Antigravity Asset Generation Prompt — Gallery Tileset

> Give this prompt to Antigravity to generate the pixel art assets for the gallery interior.
> All assets should be saved as PNG files with transparent backgrounds.

---

## Style Guide

- **Aesthetic**: Pixel art, 16-bit SNES RPG style, top-down perspective (3/4 view like Pokemon or Stardew Valley)
- **Palette**: Gallery whites (#f5f5f0, #e8e8e0), warm wood tones (#8B6914, #A0784C), gold accents (#C9A84C), polished concrete grey (#888888, #999999)
- **Tile size**: 48x48 pixels per tile (this is critical — the game engine uses 48px tiles)
- **Background**: Transparent (PNG with alpha)
- **Consistency**: All tiles should look cohesive together, as if from the same tileset

---

## Asset List

### 1. Gallery Floor Tiles (48x48 px each) — 6 variants

Save as a single spritesheet: `gallery_floor.png` (288x48, 6 tiles in a row)

| Tile | Description |
|---|---|
| 1 | Polished concrete floor (light grey, slight texture) |
| 2 | Polished concrete floor variant (subtle crack pattern) |
| 3 | Polished concrete floor variant (slightly darker patch) |
| 4 | Dark hardwood floor (rich brown, plank lines visible) |
| 5 | Dark hardwood floor variant (slightly different grain) |
| 6 | Dark hardwood floor variant (knot detail) |

### 2. Gallery Wall Tiles (48x48 px each) — 10 tiles

Save as a single spritesheet: `gallery_walls.png` (480x48, 10 tiles in a row)

| Tile | Description |
|---|---|
| 1 | White gallery wall (plain, flat white face) |
| 2 | White gallery wall — top edge (slight shadow at top) |
| 3 | White gallery wall — bottom edge (baseboard trim, warm wood color) |
| 4 | White gallery wall — left corner (inner corner shadow) |
| 5 | White gallery wall — right corner (inner corner shadow) |
| 6 | White gallery wall — outer corner left |
| 7 | White gallery wall — outer corner right |
| 8 | Wall with picture rail (thin horizontal line near top, gold/brass color) |
| 9 | Wall with picture hook (small gold hook hanging from rail) |
| 10 | Doorway (dark opening in white wall, threshold visible) |

### 3. Gallery Furniture Sprites

| File | Size | Description |
|---|---|---|
| `gallery_bench.png` | 96x48 | Top-down viewing bench (dark wood or black leather, seats 2, placed in center of room facing wall) |
| `gallery_pedestal.png` | 48x48 | White display pedestal (3/4 view, square base, clean lines) |
| `gallery_desk.png` | 96x48 | Reception/sales desk (dark wood, computer monitor visible, papers) |
| `gallery_rope.png` | 48x48 | Velvet rope barrier segment (brass post, dark red velvet rope) |
| `gallery_rope_end.png` | 48x48 | Velvet rope end post (brass post with no rope, standalone) |
| `gallery_plant.png` | 48x48 | Minimalist potted plant (white ceramic pot, single tall plant) |
| `gallery_wine_table.png` | 48x48 | Small round table with wine glasses (gallery opening reception) |

### 4. Painting Frame Sprites (hung on wall, 3/4 top-down perspective)

These are the artworks visible on the gallery walls. Each should look like a framed painting seen from a top-down RPG angle (you see the frame from slightly above, painting face is visible).

| File | Size | Description |
|---|---|---|
| `painting_small_abstract.png` | 32x32 | Small gold frame with colorful abstract art inside (bold reds, blues) |
| `painting_medium_landscape.png` | 48x48 | Medium dark wood frame with landscape painting (greens, sky blue) |
| `painting_large_portrait.png` | 64x48 | Large ornate frame with portrait painting (figure, dark background) |
| `painting_large_modern.png` | 64x48 | Large minimal frame with geometric/modern art (black, white, gold) |
| `painting_small_photo.png` | 32x32 | Small black frame with photograph (monochrome, figure or architecture) |
| `painting_empty_frame.png` | 48x48 | Empty frame on wall (just the frame, no art inside — sold/removed) |

### 5. NPC Dealer Sprite (4-direction walk cycle)

Save as: `npc_dealer.png` (spritesheet)

- **Character**: Art dealer in black turtleneck, dark trousers, confident posture
- **Frame size**: 48x48 per frame
- **Layout**: 3 columns x 4 rows = 12 frames total (144x192 spritesheet)
  - Row 0 (frames 0-2): Walking DOWN (facing camera)
  - Row 1 (frames 3-5): Walking LEFT
  - Row 2 (frames 6-8): Walking RIGHT
  - Row 3 (frames 9-11): Walking UP (back to camera)
- **Animation**: Standard RPG walk cycle — stand, step left, stand, step right
- **Style**: Slim figure, sophisticated look, maybe holding a wine glass or clipboard

### 6. Gallery Interior Decorative Elements

| File | Size | Description |
|---|---|---|
| `track_light.png` | 48x16 | Ceiling track light (seen from above, silver tube with 3 small spotlights) |
| `gallery_sign.png` | 96x48 | Exhibition title placard on wall (white rectangle with small text lines) |
| `red_dot.png` | 16x16 | Small red "sold" dot sticker (placed near paintings that are sold) |
| `price_list.png` | 32x48 | Laminated price list on desk (small white card with lines) |

---

## Delivery Format

Please deliver all assets as individual PNG files with transparent backgrounds. Organize in a folder structure like:

```
gallery_assets/
  ├── gallery_floor.png        (288x48 spritesheet)
  ├── gallery_walls.png        (480x48 spritesheet)
  ├── gallery_bench.png        (96x48)
  ├── gallery_pedestal.png     (48x48)
  ├── gallery_desk.png         (96x48)
  ├── gallery_rope.png         (48x48)
  ├── gallery_rope_end.png     (48x48)
  ├── gallery_plant.png        (48x48)
  ├── gallery_wine_table.png   (48x48)
  ├── painting_small_abstract.png   (32x32)
  ├── painting_medium_landscape.png (48x48)
  ├── painting_large_portrait.png   (64x48)
  ├── painting_large_modern.png     (64x48)
  ├── painting_small_photo.png      (32x32)
  ├── painting_empty_frame.png      (48x48)
  ├── npc_dealer.png           (144x192 spritesheet)
  ├── track_light.png          (48x16)
  ├── gallery_sign.png         (96x48)
  ├── red_dot.png              (16x16)
  └── price_list.png           (32x48)
```

---

## Reference

The game is a top-down art market RPG built with Phaser 3. The gallery is a white-cube contemporary art space in SoHo, New York. Think: Gagosian or Pace Gallery but as a pixel art game location. The player walks around the gallery viewing paintings and negotiating with a dealer.

Existing game tilesets for reference:
- Kenney Roguelike Indoor pack (16x16 base) — used for other indoor scenes
- Custom outdoor tilesets at 48x48 — used for the overworld

The gallery assets need to be at 48x48 to match the game's tile grid.
