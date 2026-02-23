# Antigravity Gallery Assets v2 — Per-Asset Prompts with Green Screen

> **Round 2**: Individual prompts per asset. Green screen backgrounds for clean extraction.
> After generating each image, report back the file path and dimensions.

---

## CRITICAL RULES FOR ALL IMAGES

1. **Background**: Solid bright green (#00FF00) chroma key background. The ENTIRE background must be a perfectly uniform solid bright green (#00FF00) with ZERO variation. No gradients, no shadows on the background, no checkerboard — just pure solid #00FF00 green.
2. **Style**: Pixel art, 16-bit SNES RPG, top-down 3/4 perspective (like Pokemon Gen 3 or Stardew Valley)
3. **Edges**: Crisp pixel-perfect edges against the green. No anti-aliasing bleed into the green. Hard pixel boundaries.
4. **No shadows on background**: Any drop shadows should NOT extend onto the green background.
5. **Save as PNG** with exact dimensions specified per asset.
6. **Color palette**: Gallery whites (#f5f5f0, #e8e8e0), warm wood (#8B6914, #A0784C), gold accents (#C9A84C), concrete grey (#888888). Never use pure green (#00FF00) in the artwork itself.

---

## ASSET PROMPTS (generate each one separately)

### Asset 1: `gallery_floor.png` — 288x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A horizontal strip showing 6 floor tiles side by side, each tile exactly 48x48 pixels.
Total image: 288 pixels wide x 48 pixels tall.

Tiles left to right:
1. Polished light grey concrete floor with subtle texture
2. Same concrete with a fine crack pattern
3. Same concrete slightly darker variant
4. Dark hardwood floor with visible plank lines (rich brown)
5. Dark hardwood floor variant with different grain direction
6. Dark hardwood floor with a small knot detail

Each tile must tile seamlessly. Top-down perspective, flat. No perspective distortion.
Hard crisp pixel edges. The green background should NOT be visible — floor tiles fill the entire 48x48 space.
```

### Asset 2: `gallery_walls.png` — 480x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A horizontal strip showing 10 wall tiles side by side, each tile exactly 48x48 pixels.
Total image: 480 pixels wide x 48 pixels tall.

Tiles left to right:
1. White gallery wall — plain flat white face (top-down 3/4 view)
2. White gallery wall — top edge with slight shadow at top
3. White gallery wall — bottom edge with warm wood baseboard trim
4. White gallery wall — inner corner (left side)
5. White gallery wall — inner corner (right side)
6. White gallery wall — outer corner left
7. White gallery wall — outer corner right
8. Wall with gold/brass picture rail (thin horizontal line near top)
9. Wall with gold picture hook hanging from rail
10. Doorway — dark opening in white wall, wooden threshold

The wall tiles are the most important — they form the room boundary. 3/4 top-down angle so you see both the face and top of the wall.
```

### Asset 3: `gallery_bench.png` — 96x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A gallery viewing bench seen from top-down 3/4 perspective. Dark wood frame with black leather cushions. Seats 2 people. Placed in center of room facing a wall.

Image dimensions: exactly 96 pixels wide x 48 pixels tall.
The bench should be centered in the image. Crisp pixel edges against the green background.
```

### Asset 4: `gallery_pedestal.png` — 48x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A white display pedestal with a small gold sculpture on top. 3/4 top-down view. Square base, clean geometric lines. The pedestal is white/cream colored.

Image dimensions: exactly 48x48 pixels. Centered in frame. Crisp edges against green.
```

### Asset 5: `gallery_desk.png` — 96x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A gallery reception/sales desk seen from top-down 3/4 view. Dark wood, with a small computer monitor, papers, and a desk lamp visible on top.

Image dimensions: exactly 96 pixels wide x 48 pixels tall. Centered. Crisp edges.
```

### Asset 6: `gallery_rope.png` — 48x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A velvet rope barrier segment seen from above. Brass post on one side with dark red velvet rope extending horizontally. Museum/gallery style.

Image dimensions: exactly 48x48 pixels. Centered. Crisp edges against green.
```

### Asset 7: `gallery_rope_end.png` — 48x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A standalone brass velvet rope end post (no rope attached). Just the brass post with a round top, seen from above at 3/4 angle.

Image dimensions: exactly 48x48 pixels. Centered. Crisp edges against green.
```

### Asset 8: `gallery_plant.png` — 48x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A minimalist potted plant in a white ceramic pot. Single tall green plant (like a fiddle leaf fig or snake plant). Top-down 3/4 view.

IMPORTANT: The plant leaves should use dark green (#2D5A1E, #3A7A2E) NOT bright green — must contrast clearly against the #00FF00 background.

Image dimensions: exactly 48x48 pixels. Centered. Crisp edges against green.
```

### Asset 9: `gallery_wine_table.png` — 48x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A small round cocktail table with white tablecloth, two wine glasses, and a wine bottle. Gallery opening reception style. Top-down 3/4 view.

Image dimensions: exactly 48x48 pixels. Centered. Crisp edges against green.
```

### Asset 10: `painting_small_abstract.png` — 32x32 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A small framed painting seen on a wall from 3/4 top-down RPG angle. Gold frame with colorful abstract art inside (bold reds, blues, yellows). The frame has visible depth/thickness from the angled perspective.

Image dimensions: exactly 32x32 pixels. Centered. Crisp edges against green.
```

### Asset 11: `painting_medium_landscape.png` — 48x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A medium-sized framed landscape painting on a wall, seen from 3/4 top-down RPG angle. Dark wood frame. Landscape scene inside (rolling hills, sky blue, greens). Visible frame depth.

Image dimensions: exactly 48x48 pixels. Centered. Crisp edges against green.
```

### Asset 12: `painting_large_portrait.png` — 64x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A large framed portrait painting on a wall, seen from 3/4 top-down RPG angle. Ornate gold frame. Portrait of a figure against a dark background inside. This is the biggest painting.

Image dimensions: exactly 64 pixels wide x 48 pixels tall. Centered. Crisp edges against green.
```

### Asset 13: `painting_large_modern.png` — 64x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A large framed modern/geometric painting on a wall, 3/4 top-down angle. Minimal black frame. Bold geometric art inside (black, white, and gold Mondrian-style blocks).

Image dimensions: exactly 64 pixels wide x 48 pixels tall. Centered. Crisp edges against green.
```

### Asset 14: `painting_small_photo.png` — 32x32 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A small framed black-and-white photograph on a wall, 3/4 top-down angle. Thin black frame. Monochrome photograph inside (architectural or figure subject).

Image dimensions: exactly 32x32 pixels. Centered. Crisp edges against green.
```

### Asset 15: `painting_empty_frame.png` — 48x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

An empty picture frame on a wall, 3/4 top-down angle. Gold frame with nothing inside — just the bare wall visible through the frame (use off-white #F0F0E8 for the wall, NOT green). This represents a sold/removed artwork.

Image dimensions: exactly 48x48 pixels. Centered. Crisp edges against green.
```

### Asset 16: `npc_dealer.png` — 144x192 pixels (SPRITESHEET)

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A character spritesheet for an art dealer NPC. 3 columns x 4 rows grid = 12 frames. Each frame is exactly 48x48 pixels. Total image: 144 pixels wide x 192 pixels tall.

Character: Slim art dealer in a black turtleneck, dark grey trousers. Sophisticated look. Maybe holding a clipboard.

Grid layout:
- Row 1 (top): Walking DOWN (facing camera). 3 frames: idle, step-left, step-right
- Row 2: Walking LEFT. 3 frames: idle, step-left, step-right
- Row 3: Walking RIGHT. 3 frames: idle, step-left, step-right
- Row 4 (bottom): Walking UP (back to camera). 3 frames: idle, step-left, step-right

Standard top-down RPG walk cycle like Pokemon or Stardew Valley characters.
The character should NOT use any green (#00FF00) in their clothing or body.
Each 48x48 frame cell should have the green background visible around the character.
```

### Asset 17: `track_light.png` — 48x16 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A ceiling track light seen from above. Silver/chrome tube with 3 small spotlight heads. Gallery-style modern track lighting.

Image dimensions: exactly 48 pixels wide x 16 pixels tall. Centered. Crisp edges against green.
```

### Asset 18: `gallery_sign.png` — 96x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

An exhibition title placard mounted on a wall. White rectangular card with small text lines (the text doesn't need to be readable, just suggested). Thin border. Seen from 3/4 top-down angle.

Image dimensions: exactly 96 pixels wide x 48 pixels tall. Centered. Crisp edges against green.
```

### Asset 19: `red_dot.png` — 16x16 pixels

```
Pixel art. Solid bright green (#00FF00) background.

A small circular red "sold" dot sticker. Bright red (#CC0000) circle, 10-12 pixels diameter, centered in frame. This is placed next to paintings that have been sold.

Image dimensions: exactly 16x16 pixels.
```

### Asset 20: `price_list.png` — 32x48 pixels

```
Pixel art, 16-bit SNES RPG style. Solid bright green (#00FF00) background.

A laminated price list/card standing on a desk. Small white rectangular card with tiny horizontal lines suggesting text. Seen from 3/4 angle.

Image dimensions: exactly 32 pixels wide x 48 pixels tall. Centered. Crisp edges against green.
```

---

## AFTER GENERATING — REPORT BACK FORMAT

After generating all assets, please respond with this exact format so the developer (Claude Code) can integrate them:

```
GALLERY ASSETS GENERATED
========================
Files saved to: [folder path]

Asset checklist:
[ ] gallery_floor.png      — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] gallery_walls.png       — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] gallery_bench.png       — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] gallery_pedestal.png    — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] gallery_desk.png        — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] gallery_rope.png        — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] gallery_rope_end.png    — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] gallery_plant.png       — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] gallery_wine_table.png  — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] painting_small_abstract.png  — [actual width]x[actual height] — [OK / ISSUE]
[ ] painting_medium_landscape.png — [actual width]x[actual height] — [OK / ISSUE]
[ ] painting_large_portrait.png  — [actual width]x[actual height] — [OK / ISSUE]
[ ] painting_large_modern.png    — [actual width]x[actual height] — [OK / ISSUE]
[ ] painting_small_photo.png     — [actual width]x[actual height] — [OK / ISSUE]
[ ] painting_empty_frame.png     — [actual width]x[actual height] — [OK / ISSUE]
[ ] npc_dealer.png          — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] track_light.png         — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] gallery_sign.png        — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] red_dot.png             — [actual width]x[actual height] — [OK / ISSUE: description]
[ ] price_list.png          — [actual width]x[actual height] — [OK / ISSUE: description]

Background color used: #00FF00
Any issues: [describe any problems]
```

Then tell the developer to run:
```bash
# 1. Copy all generated PNGs to:
#    game/public/sprites/gallery/

# 2. Run background removal:
python3 scripts/bg_remove.py public/sprites/gallery/ assets/gallery_processed/ --batch --color 00FF00 --tolerance 50

# 3. Run gallery pipeline to resize to final dimensions:
python3 scripts/gallery_asset_pipeline.py

# 4. Deploy processed assets:
python3 scripts/gallery_asset_pipeline.py --deploy

# 5. Verify build:
npx vite build
```

---

## INTEGRATION NOTES FOR DEVELOPER

These assets are used by:
- **`public/content/maps/gallery_test.json`** — Tiled JSON map referencing tile IDs
- **`src/scenes/LocationScene.js`** — Renders the Tiled map, painting popups, NPC interaction
- **`src/scenes/BootScene.js`** — Must preload all gallery sprite textures

The gallery map currently uses the `grounds.png` tileset (outdoor tiles as placeholder). Once these gallery-specific tiles are ready, we need to:
1. Create a `gallery_tileset.png` from the floor + wall tiles
2. Update `gallery_test.json` to reference the new tileset
3. Add furniture/painting sprites as Phaser sprites (not tilemap tiles) placed at object layer positions
4. Load NPC dealer spritesheet with `frameWidth: 48, frameHeight: 48` and create walk animations
