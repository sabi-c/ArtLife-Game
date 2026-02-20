# 📦 Asset Manifest — ArtLife

> Complete inventory of all existing and needed game assets. Status tracked per item.

---

## Backgrounds (public/backgrounds/)

### ✅ Existing (7)
| File | Category | Size | Status |
|---|---|---|---|
| `bg_gallery.png` | Gallery / Social | 63KB | ✅ Done |
| `bg_market.png` | Market / Trading | 29KB | ✅ Done |
| `bg_drama.png` | Scandal / Crisis | 67KB | ✅ Done |
| `bg_fair.png` | Art Fair | 39KB | ✅ Done |
| `bg_opportunity.png` | Deal / Opportunity | 51KB | ✅ Done |
| `bg_personal.png` | Personal Life | 55KB | ✅ Done |
| `bg_social.png` | Networking | 62KB | ✅ Done |

### ❌ Needed (7)
| File | Category | Priority | Notes |
|---|---|---|---|
| `bg_auction.png` | Auction House | P1 (Phase 4) | Rows of seats, raised paddle, spotlight |
| `bg_freeport.png` | Freeport Storage | P2 (Phase 4) | Cold fluorescent, endless crates |
| `bg_studio.png` | Artist Studio | P2 (Phase 3) | Messy, creative, bohemian |
| `bg_office.png` | Financial Office | P2 (Phase 3) | Bloomberg terminals, glass walls |
| `bg_estate.png` | Estate Sale | P3 (Phase 4) | Old money mansion, dusty grandeur |
| `bg_investigation.png` | Investigation | P3 (Phase 4) | Dark forensic room, magnifying glass |
| `bg_title.png` | Title Screen | P1 (Phase 5) | City skyline, gallery windows glowing |

---

## Character Portraits (public/portraits/ — TO CREATE)

### Player Characters
| File | Character | Size | Status |
|---|---|---|---|
| `portrait_rich_kid.png` | The Rich Kid | 128×128 | ❌ Needed (Phase 3) |
| `portrait_hedge_fund.png` | The Hedge Fund | 128×128 | ❌ Needed (Phase 3) |
| `portrait_insider.png` | The Insider | 128×128 | ❌ Needed (Phase 3) |
| `portrait_speculator.png` | The Speculator | 128×128 | ❌ Needed (Phase 3) |
| `portrait_curator.png` | The Curator | 128×128 | ❌ Stretch Goal |

### Key NPCs
| File | NPC Archetype | Size | Status |
|---|---|---|---|
| `npc_mega_dealer.png` | The Mega-Dealer (Gagosian type) | 128×128 | ❌ Phase 3+ |
| `npc_young_hustler.png` | The Young Hustler (Philbrick type) | 128×128 | ❌ Phase 3+ |
| `npc_trusted_advisor.png` | The Trusted Advisor (Bouvier type) | 128×128 | ❌ Phase 3+ |
| `npc_speculator_collector.png` | The Speculator Collector (Saatchi type) | 128×128 | ❌ Phase 3+ |
| `npc_institutional.png` | The Institutional Voice (Broad type) | 128×128 | ❌ Phase 3+ |

---

## UI Elements (Currently Phaser-rendered — No External Assets)

| Element | Current State | Notes |
|---|---|---|
| Nokia phone frame | Programmatic (Phaser Graphics) | Could be replaced with sprite |
| Tab buttons | Programmatic | Working fine as-is |
| Heat bars | Programmatic (colored rectangles) | Working fine as-is |
| Event choice buttons | Programmatic | Working fine as-is |
| Top bar stats | Programmatic | Working fine as-is |

### Potential Sprite Upgrades (Phase 5)
| File | Element | Notes |
|---|---|---|
| `ui_phone_frame.png` | Nokia phone bezel | Replace programmatic with detailed pixel sprite |
| `ui_gavel.png` | Auction gavel icon | For auction events |
| `ui_magnifier.png` | Magnifying glass icon | For investigation/intel events |
| `ui_paddles.png` | Bidding paddles | For auction mini-game |

---

## Audio (Phase 5 — Not Yet Started)

### Music
| File | Usage | Style | Status |
|---|---|---|---|
| `ost_menu.ogg` | Title / Menu screen | Slow jazz noir, chiptune | ❌ |
| `ost_hub.ogg` | Main game hub | Ambient lo-fi noir | ❌ |
| `ost_tension.ogg` | High-stakes events | Fast tempo, building | ❌ |
| `ost_victory.ogg` | Successful deal / end screen | Triumphant chiptune | ❌ |

### SFX
| File | Usage | Status |
|---|---|---|
| `sfx_typewriter.ogg` | Text reveal | ❌ |
| `sfx_cashregister.ogg` | Buy/sell | ❌ |
| `sfx_phone_buzz.ogg` | New message | ❌ |
| `sfx_gavel.ogg` | Auction lot sold | ❌ |
| `sfx_page_turn.ogg` | Tab switching | ❌ |

---

## Fonts (Loaded via Google Fonts in index.html)

| Font | Usage | Status |
|---|---|---|
| Press Start 2P | UI text | ✅ Loaded |
| Playfair Display | Narrative text | ✅ Loaded |
| Courier New | Monospace data | ✅ System font |

---

## Summary

| Category | Existing | Needed | Total |
|---|---|---|---|
| Backgrounds | 7 | 7 | 14 |
| Player Portraits | 0 | 5 | 5 |
| NPC Portraits | 0 | 5+ | 5+ |
| UI Sprites | 0 | 4 | 4 |
| Music Tracks | 0 | 4 | 4 |
| SFX | 0 | 5 | 5 |
| **Total** | **7** | **30+** | **37+** |

---

## Tags
#assets #manifest #art #tracking #game-design
