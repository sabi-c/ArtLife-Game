# 🎨 Art Style Guide — "8-Bit Noir"

> The definitive visual language for ArtLife. Every asset, every screen, every pixel follows these rules.

---

## Core Aesthetic

**One sentence:** Oregon Trail meets film noir — lo-fi pixel art drenched in shadow, gold accents, and the kind of moody atmosphere where a champagne glass glints in the dark.

### Visual References

| Reference | What To Take From It |
|---|---|
| **Oregon Trail** (original + remakes) | Clean pixel UI, resource management panels, typewriter dialogue |
| **Tails Noir / Backbone** | Atmospheric pixel art, rain effects, noir film shadows |
| **Norco** | Lo-fi resolution, strong narrative mood, environmental storytelling |
| **Tales of the Neon Sea** | Detailed pixel art city environments, noir lighting with color pops |
| **Pixel Noir** | Hard-boiled detective aesthetic, chiptune-noir soundtrack feel |
| **Papers, Please** | Functional pixel UI that feels like a real desk/workstation |

---

## Color Palette

### Primary Noir Palette
```
┌─────────────┬─────────┬────────────────────────────────────┐
│ Name        │ Hex     │ Usage                              │
├─────────────┼─────────┼────────────────────────────────────┤
│ Deep Black  │ #0a0a0f │ Background, canvas                 │
│ Dark        │ #14141f │ Card backgrounds, panels           │
│ Charcoal    │ #1e1e2e │ Highlighted cards, hover states    │
│ Smoke       │ #2a2a3a │ Dividers, subtle borders           │
│ Slate       │ #4a4a5a │ Disabled text, inactive elements   │
│ Muted       │ #7a7a8a │ Secondary text, subheadings        │
│ Silver      │ #b0b0c0 │ Body text, stat labels             │
│ Ivory       │ #e8e4df │ Primary text, active elements      │
│ Warm White  │ #f5f0eb │ Highlights, emphasis text          │
└─────────────┴─────────┴────────────────────────────────────┘
```

### Accent Colors
```
┌─────────────┬─────────┬────────────────────────────────────┐
│ Name        │ Hex     │ Usage                              │
├─────────────┼─────────┼────────────────────────────────────┤
│ Gold        │ #c9a84c │ Titles, selected items, wealth     │
│ Gold Dim    │ #8a7235 │ Gold on dark backgrounds           │
│ Burgundy    │ #8b2252 │ Urgent messages, danger, scandal   │
│ Teal        │ #2a6b6b │ Intel, information, calm           │
│ Crimson     │ #c94040 │ Negative changes, losses, heat     │
│ Emerald     │ #3a8a5c │ Positive changes, gains, rep boost │
└─────────────┴─────────┴────────────────────────────────────┘
```

### Color Usage Rules
1. **Never use pure white** (#ffffff) — always Ivory or Warm White
2. **Gold is for money and prestige** — titles, selected states, wealth indicators
3. **Crimson is for losses/danger** — negative stats, urgency, anti-resources at threshold
4. **Emerald is for gains/success** — positive stat changes, successful deals
5. **Burgundy is for narrative danger** — scandal, drama, betrayal events
6. **Teal is for information/intel** — data, knowledge, analysis
7. **Backgrounds go no lighter than Charcoal** (#1e1e2e) — even "light" panels are dark

---

## Typography

### Font Stack
| Font | Usage | Size Range | Source |
|---|---|---|---|
| **Press Start 2P** | All UI: headers, labels, stats, buttons | 8px – 18px | Google Fonts |
| **Playfair Display** | All narrative: dialogue, descriptions, taglines | 12px – 18px | Google Fonts |
| **Courier New** | Monospace data: prices, percentages, coordinates | 10px – 14px | System |

### Typography Rules
- **Pixel font** (`Press Start 2P`) for anything the "game system" is saying — UI chrome, resource labels, button text
- **Serif font** (`Playfair Display`) for anything that feels "written" — dialogue, NPC messages, event descriptions, flavor text
- **Monospace** (`Courier New`) for raw data — dollar amounts in tables, percentage changes, coded messages
- All pixel font text should be ALL CAPS or Title Case
- Narrative text uses sentence case with proper punctuation
- **Never mix fonts in the same line** — one font per text block

---

## UI Elements

### Panels & Cards
```
┌─────────────────────────────────┐
│ Border: 1px #2a2a3a (Smoke)     │ ← Default border
│ Fill:   #14141f (Dark)          │ ← Default fill
│                                 │
│ Selected:                       │
│   Border: 2px #c9a84c (Gold)    │ ← Gold highlight
│   Fill:   #1e1e2e (Charcoal)    │ ← Slightly lighter
│                                 │
│ Corner radius: 6px              │
└─────────────────────────────────┘
```

### Buttons
- **Active**: Gold text, no fill. `[ TEXT LIKE THIS ]` with square brackets
- **Hover**: Scale 1.05x, text glows Gold
- **Disabled**: Slate text (#4a4a5a), no hover effect
- **Destructive**: Crimson text for sell/reject/abandon actions

### The Nokia Phone
The right panel is styled as a vintage Nokia — the phone's "screen" is a slightly lighter rectangle inside a darker "body." Messages appear on this screen as if it were a real phone display. This is a key identity element — **never redesign the phone into a modern smartphone.**

---

## Background Art Specifications

### Existing Backgrounds (7 scenes)
All backgrounds are **~512×512 pixel art PNGs**, already in the correct style:

| File | Scene Type | Palette Emphasis |
|---|---|---|
| `bg_gallery.png` | Gallery opening / social | Blue-black, chandelier gold |
| `bg_market.png` | Market / trading floor | Green-tinted noir |
| `bg_drama.png` | Scandal / confrontation | Red-shifted, tense |
| `bg_fair.png` | Art fair / Basel | Warm tones, crowd |
| `bg_opportunity.png` | Deal / opportunity | Blue-gold balance |
| `bg_personal.png` | Personal life events | Warmer, intimate |
| `bg_social.png` | Networking / cocktail party | Blue-purple, sophisticated |

### New Backgrounds Needed

| File | Scene Type | Style Notes |
|---|---|---|
| `bg_auction.png` | Auction house bidding | Rows of seats, raised paddle, spotlight on lot. Gold + crimson. |
| `bg_freeport.png` | Freeport storage facility | Cold fluorescent light, endless crates, sterile. Teal + smoke. |
| `bg_studio.png` | Artist's studio visit | Messy, paint-splattered, bohemian warmth. Warmer palette. |
| `bg_office.png` | Hedge fund / financial | Bloomberg terminals, glass walls, cold blue light. |
| `bg_estate.png` | Estate sale / mansion | Old money, dusty chandeliers, covered furniture. Gold + smoke. |
| `bg_investigation.png` | Forgery / investigation | Dark room, magnifying glass, forensic lighting. Teal + crimson. |
| `bg_title.png` | Title screen | City skyline at night, gallery windows glowing. Full noir. |

### Background Art Rules
1. **Resolution**: 512×512px (will be scaled by Phaser with `pixelArt: true`)
2. **Style**: Deliberate pixel art — visible pixels, limited palette per scene
3. **Mood**: Always moody. Even "happy" scenes have noir shadow
4. **No text in backgrounds** — all text is rendered by Phaser
5. **Color count**: Aim for 16-32 colors per background
6. **Lighting**: Always one dominant light source (chandelier, window, spotlight)

---

## Character Portraits

### Portrait Specifications
- **Size**: 128×128px pixel art (displayed smaller on character cards)
- **Style**: Head and shoulders, 3/4 view or facing slightly off-center
- **Background**: Transparent or solid black (#0a0a0f)
- **Palette**: Each character has their own accent color from the game palette

### Character Portrait Requirements

| Character | Accent Color | Visual Identity | Mood |
|---|---|---|---|
| **The Rich Kid** | Gold (#c9a84c) | Slicked hair, expensive suit, champagne glass, inherited watch | Arrogant, entitled |
| **The Hedge Fund** | Teal (#2a6b6b) | Power suit, glasses with data reflections, tie clip | Calculating, cold |
| **The Insider** | Burgundy (#8b2252) | Turtleneck + blazer, gallery badge, knowing smile | Connected, savvy |
| **The Speculator** | Crimson (#c94040) | Leather jacket, quick eyes, phone in hand, smirking | Reckless, fast |
| **The Curator** | Emerald (#3a8a5c) | Thoughtful expression, museum lanyard, open book | Intellectual, conflicted |

### NPC Portrait Requirements (Phase 3+)
Key NPCs should also have 128×128 portraits for phone conversations:

| NPC Archetype | Based On | Visual Identity |
|---|---|---|
| The Mega-Dealer | Gagosian | Silver hair, power stance, tailored everything |
| The Young Hustler | Philbrick | Charming grin, pocket square, too-perfect hair |
| The Trusted Advisor | Bouvier | Rounded glasses, warm smile that hides something |
| The Speculator Collector | Saatchi | Intense eyes, casual wealth, cigar smoke |
| The Institutional Voice | Broad | Distinguished elder, museum pin, reading glasses |

---

## Effects & Atmosphere

### CRT Scanline Overlay (Already Implemented)
```css
/* Horizontal scanlines — subtle, not distracting */
background: repeating-linear-gradient(
  transparent,
  transparent 2px,
  rgba(0, 0, 0, 0.08) 2px,
  rgba(0, 0, 0, 0.08) 4px
);
```

### Vignette (Already Implemented)
```css
/* Dark edges, bright center — draws focus */
background: radial-gradient(
  ellipse at center,
  transparent 60%,
  rgba(0, 0, 0, 0.5) 100%
);
```

### Typewriter Text Reveal
- All narrative text reveals character-by-character
- Base speed: 30ms per character
- Dramatic pauses at periods: 200ms
- Allow click/tap to instantly show full text
- **Sound**: Optional soft click per character (Phase 5)

### Future Effects (Phase 5)
- Light film grain shader on backgrounds
- Subtle screen flicker on scene transitions
- Rain particle effect for outdoor noir scenes
- Smoke/fog particle overlay for club/gallery scenes

---

## Animation Guidelines

### UI Animations
- **Scene transitions**: 300-400ms fade to black, fade from black
- **Tab switching**: Instant content swap, no slide animation (feels snappier)
- **Card selection**: 1.05x scale on hover, gold border appears instantly
- **Number changes**: Flash emerald (gain) or crimson (loss) for 500ms, then settle to base color

### Character Animations (Future)
- Portraits are **static** in MVP — no animation needed
- Phase 5: Simple 2-frame idle animation (breathing) for selected character
- Phase 5: 3-frame "reaction" for event outcomes (smile, frown, surprise)

---

## Sound Design Direction (Phase 5 — Reference Only)

### Soundtrack
- **Genre**: Chiptune jazz noir hybrid
- Lo-fi beats + pixel-era synth tones + jazz piano loops
- Dark, atmospheric, slightly melancholic
- Different tracks per scene mood (market = tempo ↑, personal = tempo ↓)

### SFX
- Typewriter clicks for text reveal
- Cash register "ka-ching" for purchases
- Subtle phone buzz for new messages
- Auction gavel sound for auction events
- Ambient gallery chatter (low, background)

---

## Tags
#art-style #visual-design #pixel-art #noir #game-design
