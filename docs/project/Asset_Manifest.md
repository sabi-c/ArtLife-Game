# 🎨 ArtLife Asset Manifest — Gallery Environment

> Master tracking document for all generated visual assets.
> Updated by agents as assets are produced and processed.

---

## Pipeline Reference

```
generate_image → bg_remove.py (flood-fill) → deploy to public/
```

**Commands:**
```bash
# Remove background (auto-detects color from corners)
python3 scripts/bg_remove.py raw/input.png public/sprites/output.png

# Slice a spritesheet into frames
python3 scripts/sprite_slice.py raw/sheet.png --tile 16 --output frames/

# Batch process a folder
python3 scripts/bg_remove.py raw/ processed/ --batch
```

---

## Section 1: Gallery Interior — White-Walled Art Gallery

### 1A. Scene Backgrounds

| # | Asset | Description | Size | Status | File |
|---|---|---|---|---|---|
| 1 | Gallery Main Hall | White-walled gallery, hardwood floor, track lighting, paintings visible | 512×512 | ⬜ TODO | — |
| 2 | Gallery Back Room | Dimly lit storage/viewing room, crates, easels | 512×512 | ⬜ TODO | — |
| 3 | Gallery Entrance | Glass door, reception desk, welcome area | 512×512 | ⬜ TODO | — |
| 4 | Gallery Courtyard | Outdoor sculpture garden, white gravel paths | 512×512 | ⬜ TODO | — |

### 1B. Gallery Objects (Top-Down Tiles — 16×16 or 32×32)

| # | Asset | Description | Qty Frames | Status | File |
|---|---|---|---|---|---|
| 5 | Painting Frame (Gold) | Ornate gold frame on wall, front-facing | 1 | ⬜ TODO | — |
| 6 | Painting Frame (Black) | Minimalist modern black frame | 1 | ⬜ TODO | — |
| 7 | Painting Frame (White) | Clean white gallery frame | 1 | ⬜ TODO | — |
| 8 | Sculpture Pedestal | White marble pedestal, top-down | 1 | ⬜ TODO | — |
| 9 | Reception Desk | Sleek modern desk, top-down | 1 | ⬜ TODO | — |
| 10 | Gallery Bench | Leather bench for sitting, top-down | 1 | ⬜ TODO | — |
| 11 | Potted Plant (Fig) | Fiddle leaf fig in white pot | 1 | ⬜ TODO | — |
| 12 | Potted Plant (Palm) | Small indoor palm | 1 | ⬜ TODO | — |
| 13 | Wine Glass | Champagne/wine glass on surface | 1 | ⬜ TODO | — |
| 14 | Art Crate | Wooden shipping crate | 1 | ⬜ TODO | — |
| 15 | Track Light | Ceiling track light fixture | 1 | ⬜ TODO | — |

### 1C. Gallery NPC Portraits (Dialogue/Battle — 512×512)

| # | Asset | Character | Description | Status | File |
|---|---|---|---|---|---|
| 16 | Elena Ross | Gallery Owner | 40s, sharp features, power suit, confident smirk | ✅ Exists | `dealer_shark.png` |
| 17 | Margaux Villiers | Art Advisor | 50s, elegant, pearl necklace, knowing eyes | ⬜ TODO | — |
| 18 | Julian Vance | Rival Collector | 30s, slicked hair, tailored suit, competitive eyes | ⬜ TODO | — |
| 19 | The Auctioneer | Christie's | 60s, distinguished, bow tie, commanding presence | ⬜ TODO | — |
| 20 | Young Artist | Emerging Talent | 20s, paint-stained clothes, passionate expression | ⬜ TODO | — |
| 21 | Art Critic | Press | 50s, glasses, notebook, skeptical expression | ⬜ TODO | — |
| 22 | Tech Collector | New Money | 30s, casual luxury, AirPods, disruptive energy | ⬜ TODO | — |
| 23 | Gallery Assistant | Staff | 20s, all black outfit, headset, helpful smile | ⬜ TODO | — |

### 1D. Gallery NPC Walking Sprites (Overworld — 64×64 spritesheet)

| # | Asset | Character | Status | File |
|---|---|---|---|---|
| 24 | Player (Class 1) | Hedge Fund Collector | ✅ Generated | `player_walk.png` |
| 25 | Player (Class 2) | Gallery Insider | ⬜ TODO | — |
| 26 | Player (Class 3) | Old Money Heir | ⬜ TODO | — |
| 27 | Elena Ross Walk | Gallery Owner | ⬜ TODO | — |
| 28 | Margaux Walk | Art Advisor | ⬜ TODO | — |
| 29 | Julian Vance Walk | Rival Collector | ⬜ TODO | — |
| 30 | Generic Patron Walk | Background NPC | ⬜ TODO | — |
| 31 | Gallery Assistant Walk | Staff NPC | ⬜ TODO | — |

---

## Section 2: City Exterior (Phase 41)

| # | Asset | Description | Status | File |
|---|---|---|---|---|
| 32 | Chelsea Street | Night-time street with gallery storefronts | ⬜ TODO | — |
| 33 | Apartment Building | Player's home exterior | ⬜ TODO | — |
| 34 | Taxi | Yellow cab, top-down | ⬜ TODO | — |
| 35 | Airport | Small jet terminal | ⬜ TODO | — |

---

## Section 3: Auction House (Future)

(To be expanded when Phase 16.5b starts)

---

## Processing Log

| Date | Asset | Action | Notes |
|---|---|---|---|
| 2026-02-20 | `dealer_shark.png` | bg_remove test (flood-fill) | ✅ Clean removal, suit preserved |
| 2026-02-20 | `dealer_patron.png` | bg_remove test (flood-fill) | ⚠️ Mixed bg (white+black), partial removal |
| 2026-02-20 | `player_walk.png` | Generated + deployed | Spritesheet 4×4 grid, noir collector |
