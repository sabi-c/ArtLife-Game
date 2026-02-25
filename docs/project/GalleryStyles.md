# Gallery Style System — Art World UI Presets

> **Spec for multiple art-world-inspired dashboard layouts.**
> Each style is a complete visual reskin of the Bloomberg Terminal — same data, different presentation.
> Cycle through styles with the ◐ button or select from Settings.

---

## Architecture

**File:** `src/ui/BloombergTerminal.jsx` + `BloombergTerminal.css`
**Setting:** `SettingsManager.get('marketStyle')` — cycles through all registered styles.
**Pattern:** Each style is a CSS class on the root `.bb-overlay` element + a corresponding layout component or conditional JSX in the main render.

### Current Styles (v0.4.1)
| Style | Class | Status | Description |
|-------|-------|--------|-------------|
| Gallery Dashboard | `.bb-gallery` | DONE | Single-column, warm cream bg, letter-spaced headers, IBM Plex Mono |
| Gagosian Tearsheet | `.bb-tearsheet-mode` | DONE | Serif (Georgia), paginated, print-ready, Frieze LA exact replica |
| Bloomberg Dark | (default) | DONE | 3-column grid, dark bg, cyan/gold, monospace, trading terminal |

### Planned Styles
| Style | Class | Priority | Reference |
|-------|-------|----------|-----------|
| Artnet Auction | `.bb-artnet` | HIGH | artnet.com price database + auction results |
| Sotheby's Catalogue | `.bb-sothebys` | HIGH | sothebys.com lot pages + PDF catalogues |
| Deitch Projects | `.bb-deitch` | MEDIUM | defrfrfritch.com — punk/underground gallery aesthetic |

---

## Style 1: Artnet Auction Results

### Reference
Artnet's price database is the industry standard for art market data. Their visual language is **clean, data-dense, sans-serif** — like a financial analytics platform crossed with an art publication.

### Visual Language
- **Font:** System sans-serif (Helvetica Neue / Arial). Clean, no-nonsense.
- **Background:** Pure white `#ffffff`
- **Text:** Near-black `#333333`, with lighter gray `#666666` for secondary
- **Accent:** Artnet red `#cc0000` for branding, blue `#0066cc` for links/interactive
- **Layout:** Dense tabular data — think spreadsheet meets magazine. Two-column: artwork image left, data table right.
- **Price display:** Bold, with hammer price + premium + estimate range. "$XXX,XXX (with premium)" format.
- **Key UI elements:**
  - Lot number badges
  - Estimate range: "Est. $40,000 – $60,000"
  - Hammer price vs. premium price distinction
  - Sale name + date header
  - Artist name as link/header, followed by nationality + birth/death
  - Medium/dimensions/year in gray italic
  - Price history charts (line graph, simple)
  - "Bought In" / "Sold" status badges

### Implementation Plan
1. **Layout:** Two-panel per work — thumbnail left (square crop), data right
2. **Header bar:** Red Artnet-style header with "ARTLIFE PRICE DATABASE" in white
3. **Collection as auction results table** — each work is a "lot" row
4. **Price data:** Estimate range, current value, purchase price, ROI as gain/loss
5. **Market data:** Artist index as "artist page" sidebar
6. **Scrollable table** with sortable columns (by price, artist, date acquired)
7. **Minimal decoration** — just data, borders between rows

### Data Mapping
| Artnet Element | Game Data |
|---------------|-----------|
| Lot Number | Portfolio index |
| Sale Name | "ArtLife Collection, Week XX" |
| Hammer Price | Purchase price |
| Premium Price | Current estimated value |
| Estimate | MarketManager price range |
| Artist (Nationality, b. YYYY) | artist name + lifespan |
| Medium, Dimensions | work.medium, work.dimensions |
| Provenance | provenanceChain |

---

## Style 2: Sotheby's Catalogue

### Reference
Sotheby's PDFs and lot pages are **the most luxurious** in the auction world. Heavy paper feel, serif typography, generous whitespace, subtle gold accents.

### Visual Language
- **Font:** Serif for body (similar to Mercury or Freight Text), clean sans-serif for headers/labels (like Sohne or GT America)
- **Background:** Off-white `#fafaf7` with very subtle warm tint
- **Text:** Deep charcoal `#1c1c1c`
- **Accent:** Sotheby's blue `#003da5` (their brand), subdued gold `#b8860b` for estimates
- **Layout:** Centered single-column, generous margins (100px+), formal hierarchy
- **Price display:** Large lot number, "ESTIMATE $XX,000–$XX,000" in blue, "SOLD FOR $XX,000" in bold
- **Key UI elements:**
  - Large lot number (oversized, blue) as page anchor
  - "PROPERTY FROM THE COLLECTION OF..."  header
  - Condition report link
  - Catalogue note (essay text)
  - Sale information bar (date, location, sale number)
  - Bidding section with increment display
  - Full-bleed artwork images with thin border

### Implementation Plan
1. **Layout:** Single-column, ultra-wide margins, centered content
2. **Header:** Clean "SOTHEBY'S" wordmark + sale info (ArtLife Week XX, [City])
3. **Each work = a lot page:**
   - Large blue lot number (LOT 1, LOT 2...)
   - "PROPERTY FROM THE COLLECTION OF [PLAYER NAME]" or "PROPERTY OF A PRIVATE COLLECTOR" for market works
   - Full-width artwork image/placeholder
   - Artist + metadata in formal catalogue style
   - Estimate range: "ESTIMATE $XX,000 – $XX,000" in blue
   - Provenance / Exhibited / Literature in catalogue format
4. **Sale info sidebar** — Total lots, estimated total, sale date
5. **Navigation** — Lot number pills at top for quick jump

### Data Mapping
| Sotheby's Element | Game Data |
|------------------|-----------|
| Lot Number | Sequential index |
| Sale Title | "ArtLife Contemporary Art, [City]" |
| Property From | playerName (owned) / "Private Collector" (market) |
| Estimate | ±15% of MarketManager price |
| Sold For | purchasePrice (owned) |
| Condition | "Excellent" / based on work age |
| Catalogue Note | work.description |

---

## Style 3: Deitch Projects

### Reference
Jeffrey Deitch represents the **downtown, underground, street-art-adjacent** gallery world. His spaces (Wooster St, Grand St, LA) have a raw, project-space energy. The visual language is bold, graphic, sometimes chaotic — the opposite of Gagosian's restraint.

### Visual Language
- **Font:** Bold sans-serif (Impact/Helvetica Black for headers), monospace or typewriter for body
- **Background:** Raw white or industrial gray `#e8e8e8`
- **Text:** Heavy black `#000000`, no subtlety
- **Accent:** Neon/fluorescent highlights — hot pink `#ff00ff`, electric yellow `#ffff00`, or construction orange `#ff6600`
- **Layout:** Collage/zine aesthetic — overlapping elements, rotated text, torn-paper edges, mixed font sizes
- **Price display:** Minimal — prices hidden or secondary to the art. Focus on the work, not the market.
- **Key UI elements:**
  - Giant artist names (72px+, all caps, tight tracking)
  - "OPENING RECEPTION" / "ON VIEW" event banners
  - Raw photography (installation views, process shots)
  - Sticker/badge elements
  - Hand-drawn or rough border treatments
  - Mix of serif and sans-serif in same line (editorial chaos)
  - Instagram-grid-style image layout

### Implementation Plan
1. **Layout:** Masonry/collage grid — works displayed as cards at varying sizes
2. **Header:** Giant "DEITCH" in Impact, with show title below
3. **Each work = a card:**
   - Large artwork placeholder (varied aspect ratios)
   - Artist name HUGE, title small underneath
   - Minimal metadata — just medium and year
   - Price hidden by default, hover/click to reveal
4. **Sidebar:** "NOW SHOWING" with rotating highlighted work
5. **Color scheme:** White bg with one fluorescent accent color (randomized per session)
6. **Typography:** Mix of Impact (headers), Courier (body), hand-drawn feel
7. **Animation:** Cards fade/slide in, slight rotation on hover

### Data Mapping
| Deitch Element | Game Data |
|---------------|-----------|
| Show Title | "Week XX: [City]" |
| Featured Artist | Highest-heat artist in portfolio |
| Card Text | artist + title only |
| Price | Hidden, click to reveal (intel-gated) |
| "Opening" | Current week events |

---

## Implementation Order

### Sprint 1: Artnet (HIGH priority — data-focused, closest to existing Bloomberg) ✅ DONE
- [x] Add `'artnet'` to marketStyle cycle
- [x] `ArtnetView` component — tabular auction results layout (~120 lines JSX)
- [x] CSS: `.bb-artnet` + `an-*` scoped styles (~250 lines)
- [x] Red header bar + lot table + price columns
- [x] Sortable table headers (click to sort by lot, price, artist, title)

### Sprint 2: Sotheby's (HIGH priority — luxury auction catalogue) ✅ DONE
- [x] Add `'sothebys'` to marketStyle cycle
- [x] `SothebysView` component — lot-by-lot catalogue pages (~170 lines JSX)
- [x] CSS: `.bb-sothebys` + `sb-*` scoped styles (~300 lines)
- [x] Blue lot numbers + estimate ranges + formal typography
- [x] Sale info header + lot navigation pills

### Sprint 3: Deitch (MEDIUM priority — most creative, most different) ✅ DONE
- [x] Add `'deitch'` to marketStyle cycle
- [x] `DeitchView` component — masonry card grid (~120 lines JSX)
- [x] CSS: `.bb-deitch` + `dp-*` scoped styles (~280 lines)
- [x] Giant Impact typography + fluorescent accents (CSS var `--dp-accent`) + collage feel
- [x] Hover interactions + price reveal mechanic (click "INQUIRE" to show price)

---

## Technical Notes

- Each new style adds ~200-300 lines CSS + ~150-250 lines JSX
- All styles read from the same game data (GameState, MarketManager, MarketSimulator)
- Panel config (`showPanel()`) controls which data categories appear in each style
- Print styles (`@media print`) should work for all catalogue/tearsheet styles
- New styles registered in `SettingsManager.SCHEMA.marketStyle.options`
- Cycle order: Gallery → Tearsheet → Artnet → Sotheby's → Deitch → Bloomberg Dark
