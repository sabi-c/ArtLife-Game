---
type: spec
project: Art_Life
date: 2026-05-13
status: load_bearing — drives the Gemini → game pipeline
audience: Seb + collaborators dropping in art
---

# Art Life — Asset Import Spec

The bridge from "I have a Gemini-generated PNG" to "the game loads it without me touching code." This document is the contract.

If you generate a sprite in Midjourney, Gemini, Imagen, Aseprite, or a friend's hand-drawn pass, the game will pick it up automatically as long as the file lives at the right path with the right name and the right resolution.

---

## 1. The drop-in promise

The game runs in three states with respect to every asset:

1. **Real asset present** — the game loads it normally
2. **Real asset missing** — a magenta 1×1 placeholder is substituted by `BootScene._handleLoadError` and the game logs the missing key. No crash.
3. **Procedural fallback** — for entry-flow scenes (DocumentaryScene right now, EmailInbox is React so no asset deps), missing assets are replaced by Phaser-primitive renderings that read in the same visual register. The flow looks intentional even with zero real art.

The implication: **you can build the game flow first, then drop assets in over time.** Don't wait for the art to start playing.

---

## 2. Directory contract

All asset paths are relative to `game/public/`. Paths shown with the relative form so you can drop files in over Cyberduck or the Finder.

```
game/public/
├── portraits/                   # character class portraits
│   ├── portrait_rich_kid.png    ✅ exists
│   ├── portrait_hedge_fund.png  ✅ exists
│   ├── portrait_insider.png     ✅ exists
│   ├── portrait_speculator.png  ❌ MISSING — Prompt 6 in Gemini pack
│   └── portrait_curator.png     ❌ MISSING — Prompt 7 in Gemini pack
│
├── backgrounds/                 # full-scene environments
│   ├── bg_gallery_main_1bit_1771587911969.png  ✅ exists (gallery)
│   ├── bg_home_interior.png     ❌ MISSING — Prompt 8
│   ├── bg_studio_visit.png      ❌ MISSING (Sprint 3)
│   ├── bg_freeport.png          ❌ MISSING (Sprint 3)
│   ├── bg_auction_house.png     ❌ MISSING (Sprint 3)
│   └── bg_cocktail_party.png    ❌ MISSING (Sprint 3)
│
├── title/                       # title screen art
│   └── title_screen.png         ❌ MISSING — Prompt 1
│
├── documentary/                 # documentary intro frames
│   ├── frame_01.png             ❌ MISSING — Prompt 2 ×N
│   ├── frame_02.png             ❌
│   ├── frame_03.png             ❌
│   ├── frame_04.png             ❌
│   ├── frame_05.png             ❌
│   ├── frame_06.png             ❌
│   ├── frame_07.png             ❌
│   └── frame_08.png             ❌  (procedural fallback in DocumentaryScene)
│
├── artnet/                      # in-fiction ArtNet UI assets
│   ├── login_screen.png         ❌ MISSING — Prompt 3
│   ├── homepage_hero.png        ❌ MISSING (Sprint 3)
│   └── article_thumbs/          ❌ 8-12 thumbs needed (Sprint 3)
│       ├── philbrick.png
│       ├── beeple.png
│       ├── salvator_mundi.png
│       ├── documenta15.png
│       ├── lisa_schiff.png
│       ├── cattelan_banana.png
│       ├── christies_2024.png
│       └── ... (4-7 more)
│
├── sprites/                     # in-world sprite assets (existing structure)
│   ├── player_walk.png          ✅ exists
│   ├── player_back.png          ✅ exists
│   ├── dealer_*.png             ✅ exist (8 dealer sprites)
│   ├── npc_*.png                ✅ exist (gallery NPCs spritesheets)
│   └── gallerist_8dir/          ❌ MISSING — Sprint 4 NPC ref
│
└── ui/                          # diegetic UI fragments
    ├── email_envelope_icon.png  ❌ MISSING (for inbox notifications)
    ├── phone_chrome.png         ❌ MISSING (Sprint 3 phone overlay)
    └── ...
```

The two existing inventories on disk:
- 3 class portraits + 13 backgrounds + 15+ walk-cycle sprites + 10 NPC spritesheets (LimeZu premades)
- Splash sequence in `_reference/Art-Life-Reference/splash 1 2 3 4.gif` (animated, can be extracted to frames if useful)

---

## 3. Naming convention

Every asset key follows this pattern:

```
<category>/<descriptor>[_<variant>][_<resolution>].<ext>
```

**Rules:**
- Lowercase, snake_case
- Category folder always present (`portraits/`, `backgrounds/`, etc.)
- Descriptor is human-readable English (`hedge_fund`, `gallery_main`, not `hf01` or `gal_a`)
- Variant is the optional flavor of the same asset (`hedge_fund_smirk`, `gallery_main_night`)
- Resolution suffix when multiple resolutions exist (`_64`, `_128`, `_1bit`). The `_1bit` convention is from the existing inventory and means "matched to the lo-fi pixel register from Norco / Backbone." Use it for new portraits.
- Extension is always `.png` for stills, `.gif` for animated (rare), `.json` for spritesheet manifests
- No spaces. No CamelCase. No timestamps appended (the existing `bg_gallery_main_1bit_1771587911969.png` is a one-off legacy artifact — new files should not include timestamps)

**Loader expects:**
```js
this.load.image('portrait_speculator', 'portraits/portrait_speculator.png');
this.load.image('bg_home_interior',    'backgrounds/bg_home_interior.png');
this.load.image('doc_frame_01',        'documentary/frame_01.png');
```

The loader key (first arg) is what the game references. The path (second arg) is what you drop in. If your file is at `public/portraits/portrait_speculator.png` and the loader expects `portraits/portrait_speculator.png`, you're done — the game picks it up.

---

## 4. Resolution + format rules

| Asset type | Source resolution | Display behavior | Notes |
|---|---|---|---|
| Class portrait | 256×256 (drawn at 128×128 + upscale) | Rendered at native size | Crisp pixel edges. No anti-aliasing. Naming: `portrait_<class>.png`. |
| Documentary frame | 1920×1080 base, downscale on draw | Center-fit at 85% of scene | Will be auto-scaled by DocumentaryScene |
| Background | 1920×1080 | Cover-fit | Letterbox is acceptable; never stretch |
| Title screen | 1920×1080 | Cover-fit | Single-image, no animation needed |
| ArtNet UI screen | 1280×720 | Cover-fit inside a CRT frame | The CRT bezel is procedural |
| NPC walk-cycle | 48×96 per frame, 3 cols × 4 rows | LimeZu format | Existing convention, do not change |
| 8-direction NPC | 32×32 per frame, gallerist-asset format | Sprint 4 social-battle | See `_reference/gallerist-asset/` |
| Email envelope icon | 32×32 | Source for `<img>` in EmailInbox.jsx | Optional, decorative only |

**File format constraints:**
- PNG-8 or PNG-24, sRGB color space
- No transparency on backgrounds (use `#0a0a0f` deep noir black where you'd otherwise use transparent)
- Transparency on portraits + sprites is fine and expected
- File size: target under 200 KB per asset (use TinyPNG or ImageOptim if needed)

---

## 5. Palette validation

Every asset must read inside the locked palette per `docs/project/Art_Style_Guide.md`. Key rules:

| Color | Hex | Where it's used |
|---|---|---|
| Deep noir black | `#0a0a0f` | Backgrounds, shadows |
| Chandelier gold | `#c9a84c` | Highlights, accents, money, important UI |
| Burgundy | `#8b2252` | Wine, danger, secondary accents |
| Teal | `#2a6b6b` | Smoke, atmosphere, tertiary |
| Ivory-warm | `#e8e4df` | Walls, soft surfaces, text |
| **Pure white** | `#ffffff` | **Forbidden.** Never use. Use `#e8e4df` or `#d4d0cc` instead. |

**Mandatory rejections:**
- Pure white (`#ffffff`) anywhere — fails the brief
- Smartphone-modern UI gradients (avoid `#3b82f6`, Apple Material-style anything)
- Bright cheerful primaries (`#ff6b6b`, `#4ade80` as primary — accent only)
- Noble-collector facial expressions (warm reverent smiles, "moved by beauty" eyes)
- Theme-park earnestness, wholesome-cozy lighting, anything Pixar
- Smiles that read moved-by-beauty (acceptable on Curator with conflict; on no other class)

**Quick palette validation:** run the asset through this mental check:
1. Could it pass as Norco (2022) screen-recording?
2. Could it pass as Backbone (2022) interior?
3. Does any character look like they're posing for a stock-photo board meeting?

If yes/yes/no, you're in register. If no/no/yes, regenerate.

---

## 6. The drop-in workflow

For Seb or any collaborator generating art:

### Step 1: Generate
- Open the Gemini prompt pack at `docs/handoff/2026-05-13/04_Gemini_Prompt_Pack.md`
- Pick the prompt for the asset you need (Prompt 1 = title, Prompt 6 = Speculator portrait, etc.)
- Run in Gemini 2.5 Flash Image (nano banana) or Imagen 3
- Generate 3-5 candidates per prompt
- Pick the strongest; if none land, tighten the avoid list per § 5 and retry

### Step 2: Validate
- Open the PNG locally and eyeball-check against § 5 palette + reject list
- If a single class portrait, compare side-by-side against the existing three in `public/portraits/` to make sure it feels like the same family

### Step 3: Name + place
- Use the naming convention from § 3
- Place the file at the path listed in § 2
- E.g. for the Speculator portrait: `public/portraits/portrait_speculator.png`

### Step 4: Verify load
- Run `npm run check-assets` (script lives at `scripts/check-assets.js`, see § 9)
- Confirm the script reports the new asset as found
- Build with `npx vite build`. The asset is now baked in.
- Visual-check: spin up `npm run dev`, navigate to the scene that uses it. Confirm it draws as expected.

### Step 5: Commit
- One asset per commit when possible
- Commit message: `assets: add Speculator class portrait`
- Don't commit Gemini source URLs or seeds in the commit message; do log them in `docs/handoff/2026-05-13/_asset_provenance.md` (see § 10)

---

## 7. Asset slot loader pattern

The proven pattern from `DocumentaryScene.js`:

```js
preload() {
    this._frameKeys = [];
    for (let i = 1; i <= 8; i++) {
        const key = `doc_frame_${String(i).padStart(2, '0')}`;
        this._frameKeys.push(key);
        this.load.image(key, `documentary/frame_${String(i).padStart(2, '0')}.png`);
    }
}

create() {
    // ... later when rendering:
    const key = this._frameKeys[idx];
    const hasRealAsset = this.textures.exists(key) && this.textures.get(key)?.source?.[0]?.width > 8;
    if (hasRealAsset) {
        // Real asset render
        this.add.image(stageX, stageY, key);
    } else {
        // Procedural fallback render
        this._renderProceduralFrame(stageX, stageY, stageW, stageH, idx);
    }
}
```

**Why this pattern works:**
- BootScene's `loaderror` handler substitutes a 1×1 pink pixel for any missing asset key. Phaser doesn't crash.
- The `textures.get(key).source[0].width > 8` check distinguishes "real loaded asset" from "1×1 fallback pink pixel."
- The procedural fallback renders in the same visual register, so the scene reads correctly even with zero assets.
- When real assets land, no code change is needed. The check flips, the real asset draws.

**Where to apply this pattern next:**
- HomeInteriorScene (Sprint 3 — slot for `backgrounds/bg_home_interior.png`)
- ArtnetUI homepage (Sprint 3 — slots for article thumbs)
- Gallery social-battle scene (Sprint 4 — slot for gallery NPC portraits in the 4-button panel)
- Title screen (lower priority — TitleScene currently uses procedural Phaser primitives which look correct already)

---

## 8. What NOT to import

To keep the visual brief tight:

- **Stock photography** of any kind. Even pixelated. Stock vibes are visible across forty pixels.
- **Pure 1-bit black and white** unless it's clearly satirical (the `1bit` suffix in existing files is mislead — those are full-color lo-fi, not 1-bit)
- **AI-generated imagery from Midjourney's "art style" presets** that read as default-Midjourney glossy. If it has the Midjourney-default sheen, regenerate in a different tool or tighten the prompt.
- **Cartoony or chibi-style characters.** The protagonist and NPCs are realistic-proportioned within their 32×32 or 48×96 cell.
- **Smiling faces unless the smile carries conflict.** A clean cheerful smile is a brief violation. A smile while signing a fraudulent paperwork is on-register.
- **Any branded logo without permission** (no real Christie's logo, no real ArtNet logo — the in-game ArtNet is a fictional analog).

---

## 9. The validation script

A small node script that walks `public/` and reports missing assets. Drop it at `game/scripts/check-assets.js` and wire to `npm run check-assets`.

The script does three things:
1. Reads a JSON manifest of expected paths (the one this spec defines, machine-readable)
2. Checks each path exists
3. Reports findings as a checklist: ✅ present, ❌ missing, ⚠️ wrong dimensions (where it can stat the image header)

Implementation lands as part of Sprint 3 execution. The manifest lives at `docs/handoff/2026-05-13/asset_manifest.json` (a separate file referenced from this spec).

Example output:

```
Art Life — Asset Audit (2026-05-13)
====================================
✅ portraits/rich_kid_1bit.png
✅ portraits/hedge_fund_1bit.png
✅ portraits/insider_1bit.png
❌ portraits/speculator_1bit.png    (Gemini Prompt 6)
❌ portraits/curator_1bit.png       (Gemini Prompt 7)
✅ backgrounds/bg_gallery_main_1bit_1771587911969.png
❌ backgrounds/bg_home_interior.png (Gemini Prompt 8)
...

Summary:
  18 present, 27 missing.
  Visit docs/handoff/2026-05-13/04_Gemini_Prompt_Pack.md for the prompts.
```

This becomes the running production todo list for the art generation track.

---

## 10. Asset provenance log

Every asset added to the game gets a one-line entry in `docs/handoff/2026-05-13/_asset_provenance.md`. This is the audit trail.

Entry format:

```
- speculator_1bit.png — Gemini 2.5 Flash Image, seed 4f8a2c, 3rd candidate of 5, 2026-05-13. Source prompt: 04_Gemini_Prompt_Pack.md §Prompt 6.
```

**Why this matters:**
- Provenance keeps you legally clean. If Gemini regenerates a near-identical image to a copyrighted work, you can document that it came from your prompt + their model, not from copy-paste.
- Provenance lets you re-generate variants. If you ship Speculator portrait v1 and later want a v2, you have the seed and the candidate-of context.
- Provenance is what an investor or legal review will ask for if the game ships and someone files a copyright claim.

---

## 11. Asset import for non-pixel-art content

The diegetic-dashboard layer (BloombergTerminal, ArtnetUI, MasterCMS, InventoryDashboard) isn't pixel art — it's React UI. Those screens don't get assets imported; they get **fictional content** imported.

Content sources:
- **Real-world art events 2020-2026** for ArtNet articles. Inventory in `01_Full_Context.md` § Brad Troemel research synthesis.
- **15+ Troemel Report titles** as satirical article vectors (ZIRPSLOP, FLAT ILLUSTRATION, ARTSPEAK, etc.)
- **Real artist names** can be referenced in dialogue but always with a [fictionalized last initial] or a satirical analog to avoid defamation. E.g., "Inigo P." not "Inigo Philbrick" if the in-game character is doing something he didn't actually do.

Drop fictional articles into `game/public/content/articles/` as JSON. Example schema:

```json
{
    "id": "phil_vanuatu_2024",
    "title": "Philbrick's Vanuatu — Why the Fraud Worked Twice",
    "byline": "By Margaux Vannier",
    "publish_date": "2024-03-12",
    "category": "FRAUD",
    "thumb": "philbrick.png",
    "body": [
        "Para 1...",
        "Para 2...",
        "..."
    ],
    "related_articles": ["beeple_christies", "schiff_ponzi"]
}
```

The ArtnetUI component reads this JSON at runtime. New articles drop in, the homepage picks them up.

---

## 12. Asset import for animation + cutscenes

The splash sequence at `_reference/Art-Life-Reference/splash 1 2 3 4.gif` is the existing animation pattern. New animations should:

- Be GIF or APNG (PNG sequence acceptable)
- 4-12 frames per loop is the sweet spot
- Frame rate 8-12 fps for character idle, 16-24 fps for action
- Place at `game/public/anim/` with descriptive name (e.g., `anim_gallery_door_open.gif`)
- Reference from Phaser via:
  ```js
  this.load.aseprite('door_open', 'anim/anim_gallery_door_open.gif', 'anim/anim_gallery_door_open.json');
  ```
- For pure GIF without spritesheet JSON, render as a still and skip animation. Don't try to play raw GIF in Phaser.

---

## 13. Audio (deferred)

This spec does not yet cover audio. When audio is added in a future sprint:
- Place SFX at `public/audio/sfx/`
- Place music at `public/audio/music/`
- Format: OGG Vorbis primary, MP3 fallback
- Use `WebAudioService` (already exists at `src/managers/WebAudioService.js`) as the loader

Defer audio cleanup until visual layer is past first-playable.

---

## 14. The contract — a single page

If a collaborator reads only one section, this is it.

1. Generate art using the Gemini Prompt Pack (`04_Gemini_Prompt_Pack.md`)
2. Validate against the palette + reject list (§ 5)
3. Name it per § 3
4. Place it at the path per § 2
5. Run `npm run check-assets` to confirm
6. Commit
7. Log to `_asset_provenance.md`

That's the entire workflow. Everything else in this document is detail for when the workflow surprises you.

---

End of Asset Import Spec.
