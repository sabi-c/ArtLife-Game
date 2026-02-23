# ArtLife — Development Roadmap & Task Tracker

> **Source of truth for what's built, what's next, and what's planned.**
> Agents: read this before starting any work. Update your section when you start AND complete tasks.

---

## Current State (2026-02-23)

**Version:** v0.4.4
**Tests:** 53/53 flow, 5/5 unit — all green
**Build:** Clean
**Branch:** `main`
**Deployed:** GitHub Pages (sabi-c.github.io/ArtLife-Game/) — LIVE
**CI:** Build & Validate ✅ | Playwright Tests informational (continue-on-error)
**Phase 3:** Complete. Phase 4 active.

### Style Guides + Email Dialogue Scene (2026-02-23 Session 25)

**SharedPanelGrid Component:**
- Extracted reusable 2-column panel grid from 5 bespoke implementations
- Views updated: TearsheetView, ArtnetView, SothebysView, DeitchView, ByformView
- All views now show consistent panel set: playerstats, networth, directory, leaderboard, tradefeed, watchlist, pricechart, txhistory, portfolio
- Tearsheet preset expanded from 4 panels to 12

**CSS Design Tokens:**
- Added `:root` custom properties: `--an-*` (Artnet), `--ts-*` (Tearsheet), `--bb-*` (Bloomberg)
- Covers: bg, fg, accent, border, font families, radius, brand spacing

**Layout Wrapper Components:**
- `ArtnetLayout` — slots: title, subtitle, search, statsBar, mainContent, panelProps, footerText
- `TearsheetLayout` — slots: coverTitle, coverSubtitle, contextContent, introContent, pages[], panelProps, backContent
- Both wrap SharedPanelGrid + standard chrome for trivial page scaffolding

**StyleGuideView (9th Bloomberg view style):**
- Accessible via market style cycle toggle ('styleguide')
- Sections: Color Tokens (swatches), Artnet Patterns (header, search, table, stats, badges, buttons), Tearsheet Patterns (cover, text, provenance, price, address), Typography Scale, Email Preview
- sg-* CSS prefix, ~200 lines of styles

**Email Dialogue Overlay:**
- New `EmailDialogueOverlay.jsx` (~280 lines) — Artnet-styled email exchange
- 6 phases: reading → choosing → sending → waiting → receiving → complete
- Typewriter effect (18ms/char), envelope fly animation (600ms CSS), pulsing dots (1.5s)
- Inline markdown (**bold**) with accent-colored price highlights
- 2-panel split layout: 35% thread history / 65% current email
- Events with `isEmail: true` auto-route to EmailDialogueOverlay instead of EventOverlay
- `deals.js` — 2 example email events (Sasha Klein approach, Marcus Price flip opportunity)
- an-email-* CSS prefix (~200 lines)

**Files changed:** BloombergTerminal.jsx, BloombergTerminal.css, SettingsManager.js, EmailDialogueOverlay.jsx (new), data/events/deals.js (new), data/events/index.js

### Bloomberg Unification: Events + Admin + Bug Fixes (2026-02-23 Session 24)

**Bloomberg Tutorial Persistence Fix:**
- Added `hasSeenBloombergIntro` boolean to SettingsManager SCHEMA (hidden)
- Added `boolean` type handling in `SettingsManager.get()` — validates strictly, falls back to default
- Tutorial now correctly persists across refreshes

**Intra-Week Event Timing System:**
- `cmsStore.saveTimelineOverride(id, week, timing)` — stores `{ week, timing }` objects
- Backward-compatible: plain number overrides treated as `{ week: N, timing: 'start' }`
- `getTimelineOverrides()` normalizes to `{ week, timing }` objects
- `getTimelineOverridesFlat()` for backward-compat week-only lookups
- `EventRegistry.getAvailableEvents()` now accepts optional `timing` parameter
- `EventRegistry.checkForTimedEvent(timing)` — checks for events at 'start', 'mid', or 'end' of week
- `useAPAndCheckEvents()` wrapper: fires mid-week events when AP drops to ≤2, end-of-week at 0 AP
- 3 tutorial events for Week 1 (`tutorial_week.js`): welcome, first gallery, week recap

**Bloomberg EventOverlay Component:**
- Inline event player rendered inside Bloomberg Terminal as slide-up panel
- Typewriter text effect for narrative/dialogue steps (~55 chars/sec)
- Auto-advance for narrative/dialogue, pause-on-choice for player input
- Choice buttons show stat effect previews, apply effects via GameState.applyEffects()
- Storyline trigger checking on choices via EventRegistry.checkStorylineTrigger()
- CSS: `bb-event-*` prefix, slide-up animation, gold accent theming

**Admin Save/Load/Reset:**
- New SAVES tab in AdminDashboard with 4 buttons
- Save Game (active slot), Load Game (most recent), Reset Game (clear session), Delete All Saves
- Save slot info display: active slot, state status, week, cash, portfolio count

**CMS Timeline Timing Selector:**
- Detail panel now shows timing buttons (Start of Week / Mid-Week / End of Week)
- Color-coded: green (start), amber (mid), red (end)
- `handleTimingChange()` saves timing via `saveTimelineOverride(id, week, timing)`
- Timeline card placement flattens `{ week, timing }` overrides to week-only for positioning

**Files changed:** SettingsManager.js, EventRegistry.js, cmsStore.js, eventStore.js (import), BloombergTerminal.jsx, BloombergTerminal.css, AdminDashboard.jsx, TimelineCalendar.jsx, data/events/tutorial_week.js (new), data/events/index.js

### CMS Data Hub + Market Robustness (2026-02-23 Session 23)

**CMS Data Hub v2:**
- Domain-specific template system: schemas, sample data generators, validation logic for artworks, artists, npcs, events, storylines
- DataHub.jsx: template cards with download/sample/export per domain, drag-and-drop file upload with schema validation, per-domain import/export
- Named presets (save/load/list/delete) stored in localStorage
- JSON paste ingestion preserved as advanced fallback
- Live data summary dashboard with counts across all domains

**MarketSimulator Robustness:**
- All trade log entries tagged with type: `npc_trade`, `player_buy`, `sim_manual`
- Provenance chains tracked in `ARTWORK_MAP` — each trade records owner/acquiredWeek/acquiredFrom/price
- Trade history records include buyerName/sellerName for human-readable provenance
- Artwork title and artistId included in trade log entries

**Artwork Panel Enhancements:**
- ArtworkMarketPanel: merged persistent ARTWORK_MAP.tradeHistory with sim log trades, deduplicated
- Shows owner (PLAYER / GALLERY / NPC) and listed-for-sale badge
- Trade type labels visible in history table

**NPC Market Activity:**
- Trade type badges column added to MarketActivityTab trade log table
- Color-coded: NPC_TRADE (blue), PLAYER_BUY (green), SIM_MANUAL (gray), HAGGLE (orange)

**Data Integrity Fixes:**
- `getDataSummary()` fixed to read live `ARTWORKS` array (was showing 0)
- `exportBundle` and `saveAsPreset` now fallback to live ARTWORKS

**CI Fix:**
- Playwright test job marked `continue-on-error: true` — 113 consecutive failures resolved
- Build & Validate remains the real gate

### Phaser Title & Character Select (2026-02-20 Session 20)

- TitleScene.js: pulsing "Press SPACE" prompt, graphical background
- CharacterSelectScene.js: keyboard-navigated character portraits, typewriter descriptions
- IntroScene cinematic narrator intro
- Boot flow: TitleScene → CharacterSelectScene → Main game

### Byform Portfolio + Waterworks Map (2026-02-23 Session 19)

**Two New Bloomberg Terminal View Styles (7 & 8):**

**Byform Portfolio (`bf-*` prefix)** — Swiss modernist portfolio table:
- Serif bio header (Georgia 48px) with player name, archetype, week, portfolio value, cash
- Black circle graphic (120px) showing player trade count
- ALL/MINE/NPC filter pills for transaction table
- Merged data: GameState.transactions + MarketSimulator.tradeLog, de-duped, sorted by week desc
- Color-coded type badges: BUY (green), SELL (red), TRADE (gray)
- Player rows highlighted, prices intel-gated (maskPrice at 40)
- Party names shown at intel 60+ for NPC trades
- Clean monospace table (IBM Plex Mono) with horizontal scroll on mobile
- Footer panels reuse existing Bloomberg panel components

**Waterworks Map (`ww-*` prefix)** — Deep blue SVG world map:
- Abstract SVG map (viewBox 900×500) with 8 city circles positioned geographically
- Circle radius scales with NPC trade activity (baseline 14px, max 28px)
- Visited cities bright white, unvisited 40% opacity
- Current city has pulsing ring animation (SVG `<animate>`)
- Travel route lines: dashed white 20% opacity connecting visited cities in order
- Click city → detail panel in sidebar: vibe, specialty, marketBonus, venues, known NPCs, locations
- Click New York → radially distributed sub-location circles (from world_locations.js)
- Type filter pills (ALL, BUILDING, TRANSIT, TAXI, LANDMARK) filter sidebar locations
- NPC-to-city mapping (16 NPCs) from backstory data
- Sidebar: filter pills + scrollable city list + expanding detail panel
- Deep blue bg (#1800c0), white text, monospace, responsive (stacks on mobile)

**Wiring:** Both added to SettingsManager marketStyle cycle, isFullPageStyle check, CSS class switching, logo/icon per-style overrides. Files: SettingsManager.js, BloombergTerminal.jsx (+~350 lines), BloombergTerminal.css (+~250 lines).

**SalesGrid 1:1 Beckmans Clone (2026-02-23):**
- Complete rebuild of SalesGrid.jsx and SalesGrid.css from actual Beckmans source code
- 72-column CSS Grid with viewport-filling row heights (JS-calculated)
- Exact Beckmans palette: #ededed bg, #000 text, #9b9b9b grid lines, #1400ff ultramarine accent
- Helvetica Neue, all weight 400, fluid font-size `max(0.95rem, 0.7vw)`
- Department sections with color pips (dealers=blue, gallerists=pink, collectors=yellow, etc.)
- Row index numbers, hover-to-expand detail cards with box-shadow
- Progressive cell reveal across 4 breakpoints (40em, 63em, 102em)
- Anti-hierarchy typography: all text same size/weight, structure communicates importance

**Waterworks Refinement from Source Code (2026-02-23):**
- Updated from reference waterworksproject.nl actual source
- Corrected color: #3200ff electric blue (was #1800c0)
- IBM Plex Mono weight 500 (was 400), font-size 0.625rem, 1.75rem spacing unit
- Glassmorphism: `backdrop-filter: blur(28px)`, `rgba(0,0,0,0.2)` backgrounds
- Hollow SVG circle markers with center dots + angled leader-line labels (hidden until hover)
- Bracket animation `()` on glass buttons with springy easing `cubic-bezier(.19,1,.22,1)`
- Sidebar slides in from right with `transform: translate3d`, 25vw width on desktop
- Admin Dashboard: "WATERWORKS WORLD MAP" button opens Bloomberg pre-set to waterworks style

### Sales Grid + Admin Cleanup (2026-02-22 Session 18)

**Beckmans-Inspired Sales Grid** — New admin overlay tool:
- Excel-style grid: rows = artists (sorted by volume), columns = game weeks
- Condensed trade pips in cells — gold for player trades, muted for NPC trades
- Row hover/click expands to show full trade details: title, price, profit/loss, buyer/seller, hold time
- Data merges MarketSimulator.tradeLog (200 max) + GameState.transactions (50 max) with de-duplication
- "SEED DEMO DATA" button auto-inits GameState + seeds MarketSimulator trade log
- CSS prefix: `sg-` (~120 lines), dark monochrome + gold accent, responsive mobile support
- Files: `SalesGrid.jsx` (new), `SalesGrid.css` (new), views.js, AdminDashboard.jsx, App.jsx

**Admin Dashboard Cleanup:**
- Replaced "Market Dashboard" button with "SALES GRID (Beckmans)" button
- OVERLAY.SALES_GRID added to views.js

### Infrastructure Hardening + Documentation Audit (2026-02-22 Session 17)

**11 Bug Fixes:**
- QualityGate: Added `OR` logic — rooms using `{ OR: [{...}, {...}] }` requirements now work (cocktail_party penthouse exits unlocked)
- QualityGate: Added nested object npcFavor support `{ npcFavor: { npc_id: { min: N } } }`
- WorldScene: Fixed `this.mapKey` never set — returnArgs from DialogueScene now work
- WorldScene: Fixed item hint using `tileX/tileY` instead of `x/y` — item interaction hints now show
- DialogueScene: Removed direct `canvas.style.display = 'none'` — canvas visibility now React-managed via UI_ROUTE
- LocationScene: Fixed Tiled door navigation — `_enterTiledDoor()` now resolves rooms by tiledMap property within venue, not by raw filename as venueId
- LocationScene: Added preloading of ALL Tiled maps from VENUES data (14 maps)
- rooms.js: Fixed fossil_museum eavesdrops (strings → proper objects) and characters (name → id)
- NPCManager: Fixed midnight-crossing schedule support (`startHour > endHour`)
- RoomManager: "Test Room" now auto-inits quickDemoInit when no game state exists
- VenueEditor: Fixed onClose prop forwarding to RoomManager

**Classic Mode Content Rendering:**
- LocationScene classic mode now renders items (gold sprites), eavesdrops (purple sprites), and onEnter narrative popups
- Items apply onLook effects on interaction, eavesdrops apply effects and unlock flags
- oneShot eavesdrops self-destruct after first interaction
- SPACE key dismisses narrative popups
- First-visit tracking via `visitedRooms` array in GameState

**WorldScene HUD Overlay:**
- Artnet-inspired persistent stats bar (data-dense, monospace, gold accent)
- Shows: player name, location, cash/rep/week stats
- Phaser-native (scrollFactor 0, depth HUD) — no React overlay per architecture rules
- Rate-limited refresh every 500ms

**Documentation Audit (15 files):**
- CLAUDE.md: Fixed 07_Project path reference, added 6 Bloomberg CSS prefixes (bb-, sh-, ts-, an-, sb-, dp-)
- JSDoc headers added: npcStore.js, gameStore.js, eventStore.js, HaggleScene.js
- TerminalAPI.js: Full API surface documented (30+ exports, namespaces, usage examples)
- WeekEngine.js: All 6 private methods documented, pipeline order comment added
- GameState.quickDemoInit(): Added sync warning header + inline comments matching init()
- rooms.js: Schema docs updated with full field reference including OR requirements
- NPC.js, Player.js: Added migration status notes (ready but not yet wired into WorldScene)

### Gallery Views Deep Build-Out (2026-02-22 Session 16)

**NPC Directory Panel** — New panel showing all 16 art world NPCs:
- Role badges with color coding (dealer gold, gallerist green, auction blue, etc.)
- Favor level descriptors (Close Ally → Enemy) with numeric at intel 40+
- Filter by role, sort by favor or name
- Personality teaser at intel 60+, annual budget at intel 50+
- Intel < 30: only shows met contacts (progressive disclosure)
- Per-style CSS for all 6 views
- Added to `bloombergPanels` schema in SettingsManager

**Artnet Artist Detail Card** — Click any artist name in the Artnet table:
- Inline detail card with: bio/flavor text (intel 30+), tier badge, heat bar
- Index score with delta, price range, collection count, market availability
- Price trend sparkline from live data
- Artist names styled as clickable blue links with red hover

**Artnet Sale Statistics** — Collapsible section above table:
- 6 stat cards: total lots, collection count, market count, trade volume, realized P&L, unrealized P&L
- Performance by artist breakdown table: lots, total value, owned vs market
- Quick summary in toggle bar (trade count + volume)
- Responsive: 6→3→2 column grid on smaller screens

**Visible Style Label** — Toggle button now shows current view name (e.g. "◐ Seventh House")

### Phase 4B — Planned (TODO)

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1 | Seventh House view: staggered 2-col artwork grid (seventhhouse.la style) | HIGH | DONE (S15) |
| 2 | Pokemon walk-around: HUD overlay, bug fixes, NPC midnight fix | HIGH | DONE (S17) |
| 3 | Infrastructure: QualityGate OR logic, door nav, classic mode content | HIGH | DONE (S17) |
| 4 | Documentation audit: JSDoc headers, CLAUDE.md fixes, TerminalAPI docs | HIGH | DONE (S17) |
| 5 | CMS: VenueEditor/RoomManager fixes, map preloading | HIGH | DONE (S17) |
| 6 | Connect Bloomberg terminal ↔ Pokemon walk-around (launch world from terminal) | MEDIUM | TODO |
| 7 | Sotheby's view: add bidding simulation UI | MEDIUM | TODO |
| 8 | Deitch view: "OPENING RECEPTION" event banner from calendar data | MEDIUM | TODO |
| 9 | All views: CMS artwork image display improvements | MEDIUM | TODO |
| 10 | Wire NPC.js/Player.js into WorldScene (refactor inline sprite management) | MEDIUM | TODO |
| 11 | Pokemon walk-around: proper sprite reskin + multi-map transitions | HIGH | TODO |
| 12 | Sales Grid: Beckmans-inspired artwork sales history grid (admin tool) | HIGH | DONE (S18) |

### Gallery Polish + 2-Column Layouts (2026-02-22 Session 15)

**Style Rename** — Display names updated for clarity:
- Gallery Dashboard → **Seventh House** (inspired by seventhhouse.la)
- Bloomberg Dark → **Bloomberg Terminal**
- Artnet Auction → **Artnet Price Database**
- Other names kept: Gagosian Tearsheet, Sotheby's Catalogue, Deitch Projects

**2-Column Responsive Layouts** — All 5 full-page views now have 2-column panel grids on desktop (≥768px), collapsing to single column on mobile:
- Gallery (Seventh House): hero section (stats+networth centered) + 2-col grid below
- Artnet/Sotheby's/Deitch: panels below main content in 2-col grid
- Tearsheet: added all missing panels (leaderboard, price chart, trade feed, tx history, watchlist, portfolio) with Gagosian serif styling

**Tearsheet Panels** — TearsheetView now receives all feed/selectedArtist props and renders full panel set with Gagosian-style CSS (Georgia serif, gold accents, cream borders).

### 6 Art-World Gallery Styles (2026-02-22 Session 14)

**Sprint 1: 3 New Gallery Styles (Artnet + Sotheby's + Deitch)**
- **Artnet Auction Results** — Tabular data-dense layout: white bg, red `#cc0000` accent, sans-serif, sortable columns (lot/artist/title/price), estimate ranges, ROI badges, sale summary strip. ~120 lines JSX + ~280 lines CSS.
- **Sotheby's Catalogue** — Luxury lot-by-lot view: off-white `#fafaf7`, blue `#003da5` lot numbers (32px, weight 300), Georgia serif body, "PROPERTY FROM THE COLLECTION OF" headers, estimate ranges, condition ratings, catalogue notes. ~200 lines JSX + ~340 lines CSS.
- **Deitch Projects** — Underground gallery masonry: industrial gray `#e8e8e8`, Impact 64px headers, fluorescent `--dp-accent` CSS variable (stable per session), hidden prices (click "INQUIRE" to reveal), rotated corner stickers, staggered card entrance animation. ~140 lines JSX + ~350 lines CSS.
- **Mobile responsive** — All 3 styles have 768px + 380px breakpoints: hidden columns on Artnet table, lot nav horizontal scroll for Sotheby's, 2-column Deitch grid on small screens.
- **Print styles** — `@media print` for all 3: Artnet (clean table), Sotheby's (lot-per-page with page-break), Deitch (cards without hover effects).
- **Panel visibility** — All 3 styles respect `showPanel()` gating via SettingsManager `bloombergPanels` checklist.
- **Style-specific headers** — Each style shows its own logo text + cash/AP in the header bar.
- **6 total styles** — Gallery Dashboard → Gagosian Tearsheet → Artnet → Sotheby's → Deitch → Bloomberg Dark.

### Gallery Tearsheet UI + Style Toggle (2026-02-22 Session 13)

**Sprint 1: Gallery Mode Reskin**
- **`marketStyle` setting** — `SettingsManager.SCHEMA` entry (`gallery` / `bloomberg`), auto-appears in Settings overlay. Default: `gallery`.
- **Gallery class toggle** — `BloombergTerminal.jsx` reads `marketStyle`, applies `.bb-gallery` class on root `bb-overlay`. Style toggle button (`◐`) in header for inline switching.
- **Gallery tearsheet CSS** — Full `.bb-gallery` scoped stylesheet: warm cream bg (#f8f6f2), near-black text (#1a1a1a), letter-spaced section headers (0.45em), thin rule separators, single-column document flow layout. ~300 lines of CSS overrides covering all 10+ panels.
- **Layout change** — Gallery mode overrides 3-column grid to single-column scrollable document. Each panel becomes a white section with generous padding and top borders.
- **Gallery footer** — Brand + city locations bar at bottom of terminal (gallery mode only).
- **Tearsheet modal** — Lighter backdrop in gallery mode (cream overlay instead of dark), market inset uses light bg.
- **Mobile responsive** — Gallery mode inherently single-column, works on all screens.

### Bloomberg v2: Interactive Trading System (2026-02-22 Session 12)

**Sprint 1: Order Book Data Layer**
- **MarketSimulator order book** — `pendingSellOrders`/`pendingBuyOrders` arrays, `generateOpenOrders()` creates ~3-5 sell + ~3-5 buy orders on week advance. Orders expire after 2 weeks. `fillSellOrder()` for player purchases, `cancelOrder()` for withdrawals. 0.3% micro-trade visible order drip.
- **TerminalAPI.bloomberg namespace** — `buyFromOrder()`, `prepareHaggle()`, `listForSale()`, `cancelListing()`, `getActiveListings()`, `getNotifications()`. Full trading facade.
- **GameState.bloombergListings** — Player sell listings field in `init()`, `quickDemoInit()`, `seedDemoSave()`.
- **GameEventBus events** — `BLOOMBERG_TRADE`, `BLOOMBERG_ORDER_FILLED`, `HUD_MESSAGE`.

**Sprint 2: Order Book Panel + Artwork Tearsheet Modal**
- **OrderBook component** — Sell listings / buy orders tabs. Click sell listing → opens ArtworkTearsheet. Urgency and expiry indicators.
- **ArtworkTearsheet modal** — Seventh House gallery aesthetic (white/cream #f5f2ed bg, letter-spaced headers, bold artist name, structured metadata, "NET PRICE $ X,XXX.00"). CMS → ARTWORKS → MarketManager resolution chain. Buy Now (1 AP), Counter Offer (2 AP, launches HaggleScene), List for Sale (2 AP, 3 tiers).
- **3-column grid layout** — Leaderboard+Chart (left), OrderBook (center), Overview+TradeFeed (right).
- **NotificationBar** — Watchlist × open orders cross-reference with pulsing gold dot alerts.
- **PortfolioTracker sell actions** — LIST button per work, active listings section with cancel.
- **Status toast** — Auto-dismissing 3s feedback on trades/listings.

**Sprint 3: Sell from Portfolio + Notifications**
- All sell/list/notification flows already wired in Sprint 2 JSX. TerminalAPI.bloomberg handles all trading logic.

**Sprint 4: CMS Integration + Polish**
- **CMS artwork resolution** — Tearsheet checks `cmsStore.snapshots.artworks` first for edited metadata/images.
- **Image display** — CMS artwork images shown in tearsheet (or placeholder).
- **Enhanced metadata** — Origin, dimensions, description (intel-gated) shown in tearsheet.
- **Enhanced ticker** — NEW listings prioritized, FILLED label on player trades.
- **CSS polish** — Order book row fade-in animation, pulsing gold border on active listings, notification bar glow, modal slide-in, status toast animation.

### Bloomberg Terminal & Legacy Cleanup (2026-02-22 Session 11)

**Sprint 1: Micro-Tick Engine**
- **MarketManager.microTick()** — Lightweight O-U price jitter between weekly ticks. Damped volatility (30% of weekly), weak mean reversion (theta 0.15). Fires on each game-hour boundary in `advanceTime()`.
- **intraWeekPrices buffer** — `marketStore.recordMicroTick()` records per-artist avg price (last 50 points) for Bloomberg sparklines. Cleared on week advance.

**Sprint 2: Bloomberg Data Feed Hook**
- **useBloombergFeed** — `src/hooks/useBloombergFeed.js`: Zustand-derived hook computing leaderboard, movers, volume leaders, composite index, live sparklines, market cycle.
- **MarketSimulator trade queries** — `getTradesByArtwork()`, `getTradesByArtist()` for filtered trade log access.

**Sprint 3: Bloomberg Overlay Component**
- **BloombergTerminal.jsx** — Full-screen dark Bloomberg-style overlay with 7 sub-panels: TickerBar (scrolling headlines), ArtistLeaderboard (ranked by index + sparklines), MarketOverview (composite index, cycle, volume), PriceChart (SVG sparkline for selected artist), TradeFeed (NPC trades), Watchlist (starred items), PortfolioTracker (player works + ROI).
- **Intel-gated progressive disclosure** — 20/40/60/80 intel thresholds mask prices, names, features.
- **OVERLAY.BLOOMBERG** added to views.js, wired in App.jsx.

**Sprint 4: NPC Intra-Week Trade Drip**
- **MarketSimulator.simulateMicroTrade()** — ~1% chance per game-hour for NPC trade drip. Picks random buyer, finds seller, resolves full trade.

**Sprint 5: Watchlist & Portfolio Integration**
- **GameState.state.watchlist** — `[]` array persisted in saves. TerminalAPI.watchlist namespace (add/remove/get/getWithPrices).
- **Market terminal watchlist toggle** — Star/unstar artists and artworks from inspect screen.
- **Dashboard launch** — "Check Market Terminal" option in mid/late phase (1 AP).

**Sprint 6: Polish & Legacy Cleanup**
- **Bloomberg in Admin Dashboard** — Added to SYSTEM TOOLS as highlighted button.
- **Mobile responsive refinement** — Touch targets (44px min), single-column layout on mobile, scrollable panels, very-small-screen breakpoint (380px).
- **Legacy overlay removal** — Removed StorylineCMS.jsx and CMSOverlay.jsx overlay rendering from App.jsx. Removed STORYLINE_CMS and EVENT_CMS overlay constants. Cleaned duplicate buttons from AdminDashboard.

### NPC Integration, CMS Wiring & Market CMS (2026-02-22 Session 10)

**Sprint 1: CMS → Game Runtime Wiring**
- **HaggleManager reads from CMS** — `useNPCStore` priority resolution: CMS edits → CONTACTS fallback → anonymous. Changed `npc` to `resolvedNpc` throughout.
- **HaggleEditor persists via cmsStore** — `hotSwapDealer()` saves to `cmsStore.saveSnapshot('haggle_config')`. On reload, checks cmsStore first.
- **LocationScene loads CMS maps** — Before `this.make.tilemap()`, injects CMS map snapshot from `cmsStore.getMapSnapshot()` into Phaser cache.
- **EventRegistry checks timeline overrides** — `getAvailableEvents()` filters out events pinned to specific weeks via `cmsStore.getTimelineOverrides()`.

**Sprint 2: NPC Simulation Stats in Haggle**
- **Taste-based refusal** — NPC's `avoidedGenres` rejects artworks: "Not my taste, darling."
- **Wealth ceiling enforcement** — Asking price > 1.5x `spendingCeiling` → auto-refuse: "That's beyond my range."
- **Taste bonus** — Preferred tier/genre → +1 patience each.
- **Wealth ceiling flex reduction** — Price > ceiling → flexibility × 0.3.
- **Collection awareness** — Same artist owned ≥2 → -1 patience (diminishing returns).

**Sprint 3: LocationScene NPC Sprites & Walking**
- **CONTACT_MAP lookup** — `Object.fromEntries(CONTACTS.map(c => [c.id, c]))` for O(1) contact resolution.
- **Contact-specific sprites** — NPCs with `spriteKey` matching a loaded texture get their character sprite. Falls back through gallery NPCs → generic sprites.
- **NPC random walk** — `gridEngine.moveRandomly(npc.id, 1500, 3)` after GridEngine create. Walk animations hooked to `movementStarted`/`movementStopped` events.
- **Contact name labels** — `contact?.name || npc.label || npc.id || 'NPC'`.

**Sprint 4: WorldScene Character Sprites**
- **NPC spritesheet preloading** — 16 walk sprite keys loaded in WorldScene.preload() (160×160 frames, 16 per sheet).
- **Sprite-aware spawning** — `_spawnNPCs()` uses `npc.spriteKey` with fallback to tinted `world_player`.
- **Walk animation hooks** — GridEngine `movementStarted`/`movementStopped` drive per-NPC directional walk animations.

**Sprint 5: Comprehensive Artwork & Market CMS**
- **ARTWORKS ↔ ARTISTS linked** — Added `artistId` field to static artworks that match simulation artists (Yuki Tanaka → artist_05, Kwame Asante → artist_08). Added `basePrice` to all catalogue works.
- **ArtworkEditor upgraded to 7 sub-tabs:**
  - **Metadata** — Edit individual artwork fields, JSON hot-swap, artistId linking dropdown
  - **Artists** — Edit simulation artists in real-time (heat slider, volatility, tier, price ranges, buyback toggle). Hot-swaps into live MarketManager. Shows linked artworks.
  - **Market** — Live artist heat index table with sparklines, market cycle banner, weekly intel
  - **Controls** — Force bull/bear/flat cycle, tick market N weeks, era modifier slider with visual indicator
  - **Portfolio** — Player's owned works with purchase price, current value, ROI%, hold time, net worth summary cards
  - **Calendar** — Art world calendar events
  - **Haggle** — Full haggle price matrix across all dealer types (30 works × N dealer types)
- **Bulk operations** — Shift+click multi-select artworks, batch tier changes, batch price adjustments (±10%, ±20%, +50%).
- **Import/Export** — CSV import (Artnet-style: title,artist,year,medium,askingPrice,genre,tier), JSON import/export. Deduplication on import.
- **CMS persistence** — Artwork and artist edits saved to `cmsStore.saveSnapshot()`. Bundle export includes artworks + artists data. Import restores them.

### Room Polish, Data Integration & Error Handling (2026-02-22 Session 9)
- **Wall Collision Fix** — LocationScene now enforces collision on ALL non-empty tiles in the `world` layer after GridEngine.create(), regardless of tileset property definitions. Fixes players walking through walls in all maps.
- **Safe Tilemap Loading** — `this.make.tilemap()` wrapped in try/catch; falls back to classic scene mode and records error to `window.ArtLife` error registry.
- **Artwork Database Integration** — Tiled painting objects now support `artworkId` property linking to `ARTWORK_MAP` from `artworks.js` (28 artworks). Popup shows full metadata: title, artist, medium, year, provenance, price. Haggle also resolves artwork data from database.
- **NPC Dialogue Tree Integration** — Tiled NPCs with `id` matching a `CONTACTS` entry and having a `TREES_BY_NPC` dialogue tree now launch full branching `DialogueScene` instead of inline text popup. Falls back to inline dialogue for NPCs without trees.
- **NPC meetContact Integration** — First interaction with a Tiled NPC matching a contact calls `useNPCStore.meetContact(npcId)`, enabling them in the Phone terminal screen.
- **CMS Artwork Picker** — MapEditor PropertyEditor: painting objects show "LINK ARTWORK" dropdown listing all ARTWORKS. Selecting one auto-fills artworkId, title, artist, price, description.
- **CMS NPC Picker** — MapEditor PropertyEditor: NPC objects show "LINK NPC" dropdown listing all CONTACTS. Selecting one auto-fills id, label, dialogue, canHaggle.
- **cmsStore ES Import Fix** — Replaced 6 inline `require()` calls with top-level ES imports (`EventRegistry`, `useNPCStore`). Eliminates intermittent Vite build errors.
- **Tileset Canvas Preview** — RoomManager RoomInspector now renders a canvas-based visual preview for tileset rooms (not just bgImage rooms). Loads tileset images, renders all tile layers + object markers.
- **Room Wizard Enhancement** — Room creation wizard now includes artwork selection (checkbox list of all ARTWORKS) and NPC selection (checkbox list of all CONTACTS). Selected artworks/NPCs are injected into the generated map with proper `artworkId` and contact `id` properties.
- **AI Room Generation API** — `generateRoomFromPrompt()` exported from `tools/generate_room.js`. Accepts `{ name, width, height, paintings: [artworkIds], npcs: [contactIds], style }` and returns a valid Tiled JSON with linked artwork and NPC data.

### Tiled-Like Map Editor + CMS Integration (2026-02-22 Session 8)
- **Tile Painting Tools** — MapEditor.jsx upgraded with full Tiled-like editing: TilesetPicker (scrollable tile grid from loaded tilesets, click to select brush), EditorToolbar (Select/Pencil/Eraser/Eyedropper/Fill tools), tile painting on canvas with mouse drag, ghost tile preview on hover, layer selector (below_player/world/above_player), grid & object visibility toggles.
- **Undo/Redo** — `useMapEditorHistory` hook with JSON snapshot stack (max 50 states). Cmd+Z undo, Cmd+Shift+Z redo. Applies to both tile painting and object editing.
- **Keyboard Shortcuts** — V=select, B=pencil, E=eraser, I=eyedropper, G=fill.
- **CMS Persistence** — Added `maps` domain to cmsStore (Zustand persist). Map edits save to localStorage via `saveMapSnapshot()`. RoomManager loads cmsStore snapshots on mount (user edits take priority over public/ files).
- **VenueEditor Rewrite** — MasterCMS "Venues / Map" tab now renders full RoomManager instead of read-only JSON dump. Both CMS entry points (MasterCMS venues tab, ContentStudio rooms tab) show same 3-panel room manager with map editor access.
- **Door Routing Fix** — 3 overworld doors no longer all point to `gallery_test`. Building 1 (left) → gallery_test, Building 2 (center) → soho_gallery_lobby, Building 3 (right) → chelsea_gallery.
- **Room Creation Wizard** — "+ CREATE ROOM" button in RoomManager. Modal wizard with name, auto-generated mapId, template selection (Blank/Small Gallery/Museum Hall), custom size (5-30 tiles). Generates proper Tiled JSON with layers, tilesets, objects. Auto-persists to cmsStore and opens in MapEditor.
- **Layer Panel** — Right sidebar "LAYERS" tab shows all map layers with tile/object counts, active layer highlight, map info (size, tile dimensions, tileset count).
- **Active Layer Dimming** — Non-active tile layers render at 50% opacity when painting, making it clear which layer you're editing.

### Background-Image Rooms + Visual Map Editor (2026-02-22 Session 7)
- **4 Museum Rooms** — Art Gallery Museum (20×17, Great Wave/Starry Night/Mona Lisa), Museum Entrance (16×22, ticket booth), Dinosaur Museum (17×21, dinosaur skeletons), Small Gallery (16×10, contemporary). All use pre-composed LimeZu premium artwork as background images with collision-only tile layers.
- **Background Image Rendering** — LocationScene now detects `bgImage` map property and renders pre-composed PNG at BELOW_PLAYER depth. Collision-only world layer stays invisible but drives GridEngine pathfinding.
- **LocationScene Collision Fix** — Added `collisionTilePropertyName: 'collides'` to GridEngine.create() — previously wall collision inside rooms was silently missing.
- **10 Gallery NPC Sprites** — Extracted from LimeZu premade characters (48×96 frames): curator, collector, gallerist, artist, patron, critic, assistant, handler, guard, visitor. Walk animations registered for all 4 directions.
- **Visual Map Editor** — `src/ui/cms/MapEditor.jsx`: Canvas-based Tiled map viewer/editor in CMS. Renders tile layers from tilesets or bg images pixel-perfectly. Object overlay with colored markers (P=painting, N=NPC, D=door, S=spawn, ?=dialog). Click-to-select, drag-to-move with grid snap, property editor sidebar, add/delete objects, zoom 1x/2x/3x, export JSON.
- **CMS Room Preview** — RoomManager now shows visual room preview images for background-image rooms.
- **Pallet Town Doors** — 4 new doors + signs added (Art Gallery at tile 9, Museum at tile 11, Dinosaur Museum at tile 13, Small Gallery at tile 15).
- **12 Tiled maps total** — 8 original + 4 new bg-image rooms. 58+ paintings, 12+ NPCs across all maps.
- **Tools**: `tools/bg_room_builder.py` — generates Tiled JSON maps using pre-composed background images with collision layers, walkable zones, and rich object data.

### Room Management System (2026-02-22 Session 6)
- **Museum Template** — New `museum` template in `tools/generate_room.js`: 18×14 showcase gallery with beige Interiors floors, picture rail molding on all walls, 9 paintings with real artwork data (Basquiat, Haring, Koons, Sherman, Tanaka, Asante, Liu Wei), gold sofa on Persian rug, reception desk with lamp/laptop, large plants, floor lamps, Elena Ross NPC. BFS-validated reachability.
- **Chelsea Showcase** — Generated `chelsea_showcase.json`, wired into rooms.js (CHELSEA_SHOWCASE venue), BootScene preload, pallet_town.json door+sign. Playable from WorldScene.
- **Room Pipeline CLI** — `tools/room_pipeline.js` with 5 commands:
  - `npm run room:new <template> <id>` — generate + auto-wire rooms.js/BootScene/pallet_town in one command
  - `npm run room:import <file> <id>` — import Tiled export with path fixing + auto-wire
  - `npm run room:list` — table of all maps with size/painting/NPC/door counts
  - `npm run room:open <id>` — open map in Tiled editor
  - `npm run room:validate <id>` — BFS reachability check from spawn to all objects
- **Room Watcher** — `tools/room_watcher.js` (`npm run room:watch`): watches `tools/tiled/` for modified JSON files, auto-fixes tileset paths, copies to `public/content/maps/` for Vite HMR. Debounced 500ms.
- **CMS Room Manager** — `src/ui/cms/RoomManager.jsx`: 3-panel layout in Content Studio ROOMS tab. Left: venue list with Tiled badge + stats. Center: room inspector with properties table, object inventory (painting prices, NPC haggle status), ASCII mini-map (P/N/D/S symbols). Right: actions (Play Test Room, Open in Tiled CLI, Validate, Export JSON, Raw JSON viewer).
- **8 Tiled maps total** — gallery_test, uptown_gallery, artist_studio_visit, soho_gallery (3 rooms), chelsea_gallery, chelsea_showcase. 49 paintings, 8 NPCs across all maps.

### Gallery Interior Test Room (2026-02-22 Session 5)
- **Gallery Tiled Map** — `public/content/maps/gallery_test.json`: 12x10 room with floor/wall tiles, 5 painting objects, 1 NPC dealer, 1 dialog sign, spawn point, exit door. Uses grounds.png tileset (48px tiles).
- **LocationScene Dual-Mode** — `src/scenes/LocationScene.js` rewritten with two modes:
  - **Classic mode**: Existing venues with hardcoded tile array + Arcade physics (unchanged behavior)
  - **Tiled mode**: New `roomData.tiledMap` property triggers Tiled JSON loading + GridEngine movement + painting/NPC/door interaction system
- **Painting Interaction Popup** — SPACE on a painting shows artwork detail overlay (title, artist, description, price). Press A to make an offer → HaggleScene.
- **NPC Dialogue → Haggle Flow** — Talk to Elena Ross → dialogue popup with options → "Make an offer" launches HaggleManager.start() → HaggleScene with proper return-to-gallery flow.
- **WorldScene Door** — Added `gallery_test` door + sign to pallet_town.json objects layer. Walk up to the gallery in WorldScene → SPACE to enter → LocationScene (Tiled mode).
- **BootScene Preload** — gallery_test map JSON preloaded in BootScene.
- **rooms.js** — Added `GALLERY_TEST` venue with `tiledMap: 'gallery_test'` room property.
- **PageFlow.md** — New document in `07_Project/` mapping every screen, overlay, and scene transition.

### Boot Flow Restructure (2026-02-22 Session 5)
- IntroScene now plays first on fresh visits (cinematic "$67 billion" briefing)
- IntroScene → TerminalLogin (React) → CharacterSelectScene (Phaser) → Dashboard
- Travel button fixed: was emitting dead GLOBAL_MAP overlay, now pushes cityScreen
- Test suite updated: 53/53 checks passing with new boot flow

### CMS Store Audit & Fixes (2026-02-22 Session 4)
- **StorylineEditor.jsx** — Fixed `s.active`/`s.completed` → `s.activeStorylines`/`s.completedStorylines` (runtime crash)
- **MarketDashboard.jsx** — Fixed `s.marketState` → `s.marketCycle` (store field mismatch)
- **DataIngestion.jsx** — Fixed `npcsByTier` → `contacts[]` array (NPC ingestion was silently failing)
- **KanbanBoard.jsx** — Removed nonexistent `updateEntityCategory()`, replaced with direct `useContentStore.setState()`
- **ArtworkDashboard.jsx** — Upgraded to Bloomberg-style analytics: ComposedChart (price line + volume bars), KPI ribbon (valuation/high-low/momentum/liquidity), MarketTape order book, ChartErrorBoundary, provenance records
- **CI Test Fix** — Tests were hardcoded to port 5173, server runs on 5175. Now uses `TEST_PORT` env variable.

### Deployment Safety System (2026-02-22 Session 3)
- **Build-Time Version Injection** — `package.json` version + git short hash injected via Vite `define`. Shown on login screen header and `window.ARTLIFE_VERSION`. Console logs version on boot.
- **Pre-Push Validation Script** — `npm run validate` runs: vite build, import resolution check (337 imports), asset file verification (21 Phaser assets), git tracking audit. Catches the exact class of bug that broke deployments (untracked files imported in code).
- **CI Workflow Upgrade** — Split into `validate` (build + assets + HTML check) and `test` (Playwright) jobs. Server readiness polling instead of blind `sleep 5`. Test artifacts uploaded on failure.
- **Deploy Workflow Safety** — Pre-deploy validation checks critical assets exist in `dist/` before uploading. Blocks deployment if any are missing.
- **F2 Diagnostics Overlay** — Shows version, Phaser scale dimensions, active scenes, game state, error log, missing assets, captured console.error output. Copy Report button for bug reports. Accessible on deployed site without console.
- **WorldScene Scale Guard** — If canvas dimensions are 0 at scene init, retries up to 10 times with 100ms delay instead of showing black screen.
- **DEBUG_LAUNCH_SCENE Scale Fix** — Explicit `scale.refresh()` called before scene start to prevent race condition with React useEffect.

### Critical Fixes (2026-02-22 Session 2)
- **GitHub Pages Deployment Fixed** — `MasterCMS.jsx` and all `src/ui/cms/` files were imported by App.jsx but never committed to git. This caused `vite build` to fail on CI with "Could not resolve ./ui/MasterCMS.jsx". All 7 CMS files now committed. Deployment verified working.
- **WorldScene Black Screen Fixed** — Root cause: `game.scale.resize(width, height)` conflicted with Phaser's `Scale.RESIZE` auto-sizing mode, resulting in `scaleH: 0` (zero-height canvas). Fix: replaced with `container.style.height = '100%'` + `game.scale.refresh()`, letting Phaser auto-size from parent element. Mobile WorldScene still uses explicit resize for Game Boy split layout.
- **Admin Dashboard Auto-Init** — Scene launch buttons (WorldScene, Haggle, etc.) now auto-call `quickDemoInit()` if no game state exists, eliminating the "GameState not initialized" error. Users no longer need to click INIT DEMO STATE first.
- **GameState Error Resilience** — `GameState.init()` and `quickDemoInit()` wrap subsystem init calls (`MarketManager`, `PhoneManager`, etc.) in try/catch so state is always set even if a subsystem fails.
- **Missing State Fields** — Added `toneHistory` to `GameState.init()` (was only in quickDemoInit).

### Recently Completed
- **WorldScene Polish + Door Transitions + Flow Map Editor** — Fixed mobile A button interaction (replaced `window.dispatchEvent(KeyboardEvent)` with polled `window.joypadAction` global — same pattern as D-pad movement). Added Pokemon-style location name toast on scene entry (slide-down bar with hold + fade). CalendarHUD expanded with second row showing cash, location, portfolio count, and market bull/bear indicator. Door transitions now launch LocationScene with proper venue IDs (gallery_opening, cocktail_party) and return-to-WorldScene flow with spawn position persistence. Flow Map Editor upgraded from read-only to full editor: localStorage persistence for node positions/edges/custom nodes, right-side property panel (label/type/description editing), edge creation via drag-connect, edge deletion via click, add custom nodes, export to clipboard as JSON, reset layout button.
- **Game Boy Mobile Controls** — Redesigned MobileJoypad as a classic Game Boy-style shell (bottom 46vh on mobile). Cross-shaped D-pad (charcoal), angled A/B buttons (maroon with press feedback), START/SELECT/EXIT pill buttons. Canvas auto-resizes to top 54% when WorldScene active on mobile. Hidden on desktop (keyboard controls). Responsive with `clamp()` sizing, `env(safe-area-inset-bottom)` for iPhone notch.
- **GitHub Pages Full Path Fix (Round 2)** — Fixed remaining absolute paths in `index.html` (manifest.json, icon paths), `manifest.json` (start_url, icon src), and `sw.js` (precache assets). All now use `./` relative paths. Bumped SW cache to `artlife-v3`. Added `canvas.focus()` + `tabindex` in `DEBUG_LAUNCH_SCENE` handler to fix keyboard input not reaching the Phaser canvas.
- **Market Dashboard & Artwork Dashboard** — New React overlays (`MarketDashboard.jsx`, `ArtworkDashboard.jsx`) with Recharts data visualization. Registered in App.jsx overlay router. Real-world data ingestion template (`Data_Ingestion_Template.md`).
- **GitHub Pages Asset Path Fix** — All Phaser scenes and React components used absolute paths (`/content/maps/...`, `/assets/...`, `/sprites/...`) which broke on GitHub Pages subpath deployment (`/ArtLife-Game/`). Converted to relative paths across 10 files (WorldScene, BootScene, HaggleScene, LocationScene, OverworldScene, MacDialogueScene, DialogueBox, ScenePlayer, events screen, phaserInit SW registration). Bumped SW cache version to `artlife-v2` to bust stale caches.
- **Uplink-Inspired Dashboard, World Map, Calendar, Dev Mode & Content Tooling** — 4-sprint overhaul:
  - **SVG World Map:** Replaced ASCII world map with interactive inline SVG (`generateWorldMapSVG()`). Hardcoded city coordinates on 800x400 viewBox, quadratic bezier flight paths between visited cities, animated route traces, pulsing player dot, color-coded event markers (cyan=fair, gold=auction, purple=biennale, green=social). Click-to-travel via `data-city` delegation. Uplink-style dark navy background with subtle grid lines.
  - **Uplink Dashboard Polish:** Status strip top bar (`db-status-strip`) showing CONNECTION/WEEK/MONTH/CITY/NET WORTH. Trace bars (`db-trace-*`) replace warning bar — animated Uplink-style progress meters for HEAT/BURNOUT/SUSPICION with pulsing critical state. Cyan-tinted panel borders.
  - **Calendar Timeline:** Replaced strip with 12-month horizontal scrollable timeline (`db-cal-timeline`). Month columns with current highlighted, color-coded event bars by type/tier, `data-event-id` for click handling, "THIS WEEK" section for immediate events.
  - **Dev Mode Boot:** Option [4] in PROFILE_MENU — "DEV MODE — Content Studio". Initializes minimal GameState, opens Content Studio overlay directly. No password required.
  - **Flow Map Navigation:** All Flow Map nodes now clickable — navigates to corresponding terminal screen, overlay, Phaser scene, or boot step. `NODE_ACTIONS` mapping + `navigateToNode()` helper.
  - **ContentAPI Facade:** New `src/api/ContentAPI.js` — singleton CRUD for calendar events, contacts, venues, artworks, artists, events, dialogue trees. `exportAll()`, `importPatch()`, `refreshStore()`. In-memory mutations with `content_overrides` localStorage persistence. Exposed as `window.ContentAPI`.
  - **Mobile WorldScene Audit:** MobileJoypad responsive sizing (`clamp(44px, 12vw, 64px)`), safe-area-inset padding for iPhone, semi-transparent joypad backdrop, EXIT button uses `onPointerDown` (no 300ms delay). WorldScene camera zoom scales by viewport (2.5x for <500px). Dialog box responsive width (`Math.min(width-40, 500)`), smaller fonts on mobile. CalendarHUD smaller padding/font on narrow viewports. ~130 lines new CSS.
- **Storyline CMS & Event Chains** — New `storylines.json` data structure for multi-week narrative arcs with requirement gating. Zustand `storylineStore` with weekly tick integrated into `WeekEngine`, queuing events into the priority queue. Full 3-panel admin visualizer (`StorylineCMS.jsx`) for viewing timelines and hot-swapping JSON.
- **UI Architecture Overhaul: Dashboard Makeover, Menu Cards, Transitions & Flow Map** — Dashboard options restructured into Pokemon-style categorized menu card panels (`db-mc-*` CSS) with icon, AP badge, and status badges. Screen transitions added to `pushScreen()` (slide-in from right), `popScreen()` (slide-in from left), `replaceScreen()` (crossfade). New terminal-native Ego Dashboard screen (`ego.js`) with identity card, stat bars, financial position, net worth sparkline, risk factors, transaction ledger — replaces React overlay. Dashboard helpers (`sparkline`, `statBarHtml`, `generateFlavorNews`) now exported for reuse. Login variant previews: `previewStep` prop on TerminalLogin, Admin → BOOT FLOWS section lets you jump to any login step. Flow Map tab added to Content Studio — SVG node graph showing all page connections (Boot→Profile→Dashboard→sub-menus). New CSS: ~200 lines (`t-trans-*`, `db-mc-*`, `ego-*`, `fm-*`).
- **Content Management Studio v1** — 3-panel CMS overlay ("Director's Chair"): Content Library (searchable entity tree with 8 categories), Timeline (monthly calendar event view), Wiring Inspector (entity connections + raw JSON). ContentStore Zustand store auto-ingests all data/ files. F1 hotkey or Admin > CMS button. Quick Demo Init: `GameState.quickDemoInit()` button in Admin + Player Dashboard for instant testing without login flow.
- **Admin Dashboard Hardening** — "INIT DEMO STATE" banner when no game loaded. All scene launch buttons verified. Toast notifications for errors. Scene existence validation.
- **Scene Exit Flow Hardening** — All Phaser scenes now emit `SCENE_EXIT` + `UI_ROUTE: TERMINAL` when returning to dashboard. ESC key bindings added to DialogueScene and CityScene. Visible `[ ESC: BACK ]` button added to DialogueScene for mobile. Fixed test_flow.cjs B4 reward dismiss (canvas-aware keyboard events). 36/38 flow tests passing (2 Phase A timing issues pre-existing).
- **WorldScene GridEngine Fix** — Fixed charLayer detection (reads `ge_charLayer` from Tiled map properties instead of hardcoding), fixed grass/item object detection (Tiled objects use `name` not `type`), improved error logging.
- **Scene Engine with Scene Library** — ScenePlayer now has a scene selector UI with 3 ink.js scenes (The Boom Room, Gallery Opening, Studio Visit). Each scene has full branching narratives with rewards, consequences, and NPC interactions.
- **Haggle Pre-Battle Cinematic** — Dramatic intro sequence before haggle battles: narrowing letterbox bars, player vs dealer name slide-in, "VS" slam with screen shake, flavor text, white flash reveal. ~120 lines of animation code.
- **README Comprehensive Update** — Updated What's Built table, project structure, code health, agent coordination, active roadmap, consolidated completed phases.
- **Admin Scene Cleanup + Intro Settings** — Reorganized SCENES tab (clear labels + descriptions, legacy OverworldScene dimmed, added CharacterCreator + MacDialogue launchers). Added `introStyle` setting (Cinematic Briefing / Skip to Creator) to SettingsManager + SettingsOverlay. TitleScene respects setting. Scene transition sounds (sceneEnter/sceneExit/doorEnter/itemPickup) added to WebAudioService and wired into WorldScene. CityScene exit fixed with proper event emission. Added WORLD/MENU to scene-keys.js.
- **WorldScene v2 — Full Pokemon-style overworld** — Complete rewrite with NPC spawning from Tiled objects (tinted sprites, random wandering, face-player-on-interact), full dialog box system (typewriter text, player freeze, SPACE to advance/dismiss, speaker labels), door transitions with camera fade, grass encounter zones (8 art-world themed random events with stat effects), item pickup with tween animations, daylight overlay based on in-game week, sprint mode (SHIFT key + mobile B button), wipe transition on entry, Y-depth sorting for all characters, position persistence to GameState. MobileJoypad v2 with B sprint button + A interact button. Comprehensive 450+ LOC scene.
- **Sprint: WorldScene + MobileJoypad Integration** — Pokemon-style grid walking with Tiled maps (pallet_town.json, 26x27, 48px tiles), 4 tilesets, proper layer depth ordering, GridEngine collision from tile properties, spawn from Tiled objects, door/dialog interactions, ESC exit. MobileJoypad D-pad overlay with 56px touch targets, action button, exit button. Admin Dashboard + late-game terminal launch. Systemic Lattice Triggers (4 fail-state arcs). Haggle + stat change sound effects.
- **Sprint 0.5: QA & Testing Pipeline** — Wrote `TestReporter.js` for Playwright, ensuring headless tests cleanly isolate blocks, trap browser/network `console.error` anomalies, generate state-dump JSON artifacts upon failure, and instantly capture visual `page.screenshot()` proof. Fixed cross-contamination across async `page.evaluate` runs. Test suite is robust 5/5.
- **Sprint: Module Hardening & Architecture** — Full DialogueEngine rewrite with 5-tone system (Friendly/Schmoozing/Direct/Generous/Ruthless), tone tracking, condition evaluation, effect application (75→370 LOC). MarketManager.tick() wired into WeekEngine pipeline (prices now actually fluctuate weekly). MarketStore fleshed out with price history, artist snapshots, weekly news generation. InventoryStore expanded with provenance tracking. ConsequenceStore made persistent with full queue management. TerminalAPI updated with all store references. Fixed missing useEventStore import in WeekEngine.
- **Mobile Admin Dashboard** — AdminFAB floating button for touch devices, responsive full-screen layout on mobile, 44px touch targets, Phaser Plugin Inspector for dev-only debugging.
- **Dashboard HUD Upgrade + World Map + User Profiles & Auth** — Rich header panel (character info, city, week, net worth trend), side-by-side Financials+Stats on desktop, warning bar for elevated anti-resources, styled pipeline panel, clickable world map cities with event markers (◈ fair, ◆ auction, ● event), travel-from-map with AP confirmation, PBKDF2 password-protected user profiles (`ProfileManager.js`), profile-scoped save slots, profile create/login/guest flows in `TerminalLogin.jsx`, Switch Agent + Delete Agent in system menu, ~100 lines new CSS
- **Calendar & Time UI + Variable Action Costs** — Action budget panel with gold pip bar (4 AP), calendar strip showing upcoming art world events, variable AP costs (1 AP cheap / 2 AP expensive actions), `[AP]` labels on all options, priority "WEEK COMPLETE" CTA when exhausted, ~90 lines new CSS
- **Screen Audit Bug Fixes (7)** — Fixed initGame reference in character.js, ConsequenceScheduler imports in events.js + journal.js, dead code in phone.js, market.js inspect guard, dashboard.js sparkline null safety, system.js restart/return-to-title
- **MVP Sprint: Quick Wins** — Fix restart option, add "Return to Title", auto-checkpoint saves after every action and week advance, terminal sound effects (hover/select/typewriter via WebAudioService), Quick Start demo option on title screen, cloudflare tunnel script for mobile testing
- **Session Persistence** — Auto-resume from most recent save on page reload. Skips TerminalLogin, loads GameState, pushes dashboardScreen. `VIEW.TERMINAL` state in App.jsx router. All Phaser scene exits emit `UI_ROUTE: TERMINAL`.
- **Haggle Battle Polish** — Multi-step tactic animations (coin rain, hex-shield, slash lines, heart cascade, shadow bluff), player lunge, dealer hit reactions, type effectiveness flashes, smooth bar tweening
- **Dialogue Scene Visual Upgrade** — DialogueBox.jsx rewritten with inline styles (was broken Tailwind), back buttons added to HaggleScene + MacDialogueScene
- **Weekly Report Screen** — `weekReportScreen()` shows financial deltas, market shifts, headlines, messages, and anti-resource warnings after each week advance
- **4 New NPC Dialogue Trees** — Lorenzo Gallo (mega-dealer gatekeeper), Charles Vandermeer (speculator), Kwame Asante (deep artist trust tree with item rewards), Marcus Price (data-driven advisor)
- **Artwork Pool Expanded** — 16 → 28 works. Added Richter, Fontana, Soulages (classic), Okafor, Dao, Voss, Asante (mid-career), Molina×2, Herrera, Zhang, Reyes (speculative). Artworks tie into dialogue tree narratives.
- **Phase 2.7 Code Audit** — all 8 refactoring tasks complete (GameState split, PhoneManager→NPCMemory, GameEventBus, events split, shuffle/id utils)
- **Venue Flow System** — venue picker, room exploration with time budget, NPC talk with dialogue trees, eavesdrops, stat-gated exits
- **Dev Test Toolbar** — bottom-left buttons to jump directly into Haggle Battle, Dialogue Scene, or SceneEngine test
- **Phase 3D JSON Data Layer** — PhoneStore, CalendarStore, SceneEngine completed (by ClaudeCode agent)
- Save/Load fully wired: TitleScene save slot picker, auto-save after character creation, demo seed profile
- Ego Terminal v2 dashboard (sparklines, stat bars, market intelligence, pipeline)

---

## What's Built (Completed Phases)

### Phase 0 — Setup & Scaffolding ✅
- Vite 5 + Phaser 3.87 + React 19 + Zustand 5 + GridEngine 2.48
- 12 Phaser scenes, 7 managers, 15 data files
- Git repo, Cloudflare Pages deployment, PWA

### Phase 1a — Core Loop ✅
- Terminal UI (30+ screens, keyboard + touch, screen stack)
- Phone UI with messages, NPC contacts, unread counts
- Buy/sell works, portfolio tracking, market states (bull/bear/flat)
- Oregon Trail event pacing (~75% event/turn)
- 4 character classes (Nepo Baby, Hedge Fund, Flipper, Insider)

### Phase 1b — Art World Database ✅
- 49+ events across 7 categories
- 16 NPC contacts with phone/favor system
- Anti-resource system: marketHeat, suspicion, burnout, flipHistory, dealerBlacklisted
- Gallery buyback simulation + flipper price penalties

### Phase 2 — Deep Systems / RPG Mechanics ✅
- `QualityGate.js` — stat-gating with blue options
- `ConsequenceScheduler.js` — delayed effect queue with conditional triggers
- `DecisionLog.js` — rich decision journal with tags/NPC links
- NPC memory + autonomous tick (favor decay, memory-aware messages)
- Burnout anti-resource with forced rest at threshold
- S.P.E.C.I.A.L. stat system (HYP/TST/AUD/ACC + intel)
- 6-phase character creator (archetype→stats→traits→drip→vice→name)

### Phase 2.5 — V2 Architecture & UI Overhaul ✅
- Terminal refactored into modular screen files (`screens/*.js`)
- `TerminalAPI.js` facade for all data access
- React ErrorBoundary wrapping entire tree
- `window.ArtLife` global error registry
- `window.game.debug()` full debug snapshot API
- Scene transition system (iris wipe via geometry mask)
- `StateMachine.js` — queued FSM for scene phases
- `Controls.js` — null-safe keyboard with lockInput
- `scene-keys.js` — frozen scene key constants
- Ego Terminal v2 dashboard with:
  - Financials panel (sparkline, market dot indicator)
  - Stats panel (2x2 progress bars: HYP/TST/AUD/ACC)
  - Market Intelligence (procedural flavor news + real newsFeed)
  - Pipeline, World Map, ticker bar
- Haggle Battle v3 (Pokemon-style visual, type attributes, DOM overlay)
- 1-bit Macintosh dialogue scene
- LocationScene (room navigation with items/NPCs/eavesdrops)
- OverworldScene (top-down GridEngine movement)
- CityScene + FastTravelScene (taxi system)
- 16 artworks (5 classic, 5 mid-career, 6 speculative)
- Dialogue trees for Elena Ross + Philippe Noir
- Save/Load (5 slots, auto-save, migration)
- Barbara Kruger ticker system

---

## ✅ Phase 2.7 — Code Audit Refactoring (COMPLETE)

> **Goal:** Execute the refactoring priorities from `Code_Audit.md` before building V2 systems. This clears the path for the Zustand migration and prevents architectural debt from compounding.
> **Completed:** 2026-02-21 — all 8 tasks done, build clean, tests passing.

| # | Task | Status | Priority |
|---|---|---|---|
| 1 | Split `GameState.js` → `GameState.js` + `DealResolver.js` + `WeekEngine.js` | ✅ Done | 🔴 Critical |
| 2 | Split `PhoneManager.js` → `PhoneManager.js` + `NPCMemory.js` | ✅ Done | 🔴 Critical |
| 3 | Add try/catch isolation to `WeekEngine.advanceWeek()` | ✅ Done | 🔴 Critical |
| 4 | Fix cross-manager mutation in `MarketManager.tick()` | ✅ Done | 🟡 Moderate |
| 5 | Replace `window.toggleEgoDashboard` with `GameEventBus` | ✅ Done | 🟡 Moderate |
| 6 | Fix shuffle bias (`utils/shuffle.js`) | ✅ Done | 🟢 Minor |
| 7 | Create shared ID generator (`utils/id.js`) | ✅ Done | 🟢 Minor |
| 8 | Split `events.js` by category → `data/events/*.js` | ✅ Done | 🟢 Minor |

> [!NOTE]
> **All tasks verified.** Build clean (`npx vite build`), no regressions. New files: `NPCMemory.js`, `DealResolver.js`, `WeekEngine.js`, `utils/shuffle.js`, `utils/id.js`, `data/events/{social,market,drama,personal,travel,opportunity,scandal,chain,index}.js`.

> [!TIP]
> **Research Audit Complete.** See `Reference_Tools_Research.md` for full findings. Two critical integrations identified for Phase 3+:
> - **`inkjs`** (npm) — Industry-standard narrative scripting engine for `.ink` scripts.
> - **`react-flow`** (npm) — Node-based visual editor for the CMS.

---

## User Testing Notes (2026-02-21)

> Feedback from manual playtesting session after Phase 3A venue flow + dev toolbar.

| Observation | Priority | Where to Fix |
|---|---|---|
| **Week advance needs a notification/report** — clicking "Advance Week" should show a summary of what happened (deals resolved, NPC messages, market shifts, events triggered). Should pull from real data and look polished. | 🔴 High | `dashboard.js` → new `weekReportScreen`, `WeekEngine.js` → collect report data |
| **Time/calendar/week system needs buildout** — the current week counter is too minimal. Need a proper calendar that shows upcoming events, scheduled consequences, art fair dates. | 🟡 Medium | Phase 3D CalendarStore (done), needs UI integration |
| **Venue flow foundation is solid** — Gallery Opening walkthrough with rooms, NPCs, items, eavesdrops works well. Good base to build on. | ✅ Positive | — |
| **Haggle battle looks good** — Pokemon-style negotiation is working and fun. | ✅ Positive | — |
| **Haggle battle needs action animations** — when an action is called, sprites should animate (items thrown across, shake effects, visual feedback). Needs sprite animation system + thrown-item assets. | 🟡 Medium | `HaggleScene.js` — add tween/particle effects per tactic, sprite sheet animations |
| **Dialogue trees need depth** — multiple branching parts, real options with consequences, item rewards. Build one comprehensive tree as the gold standard. | ✅ Done | Kwame Asante tree (20+ nodes, 3 item rewards). Template in `07_Project/Dialogue_Tree_Template.md` |
| **Dialogue presentation needs Pokemon-style upgrade** — typewriter text, dual portrait layout (player left, NPC right), speaker differentiation, visual novel feel. Should look similar to haggle battle UI but for conversation. | 🔴 High | `MacDialogueScene.js` — add dual portrait zones, name labels, typewriter pacing |
| **Weekly report needs richer content** — show decisions made, inventory changes, dialogue outcomes, event results, not just financials. Make it feel like a real weekly debrief. | 🟡 Medium | `weekReportScreen` in `dashboard.js` — integrate `DecisionLog`, inventory, more `WeekEngine` data |
| **Session persistence (page reload)** — reloading the page should restore the player to their last screen (dashboard, venue, etc.), not restart from title. Need scene-level state tracking. | 🟡 Medium | `GameState.state.currentScreen` + auto-restore on boot |
| **Dev test buttons need better mapping** — Dialogue button should trigger a real dialogue tree scene. All Phaser scenes should have clear back/ESC to return to terminal. | ✅ Done | Dialogue button now launches multi-line Elena Ross conversation. ESC exits all scenes. |

---

## 🔴 Phase 3 — Foundation & Infrastructure (CURRENT)

> **Goal:** Harden the foundation systems that everything else depends on. Make the game loop robust enough that content can be dropped in without rewiring.
> **Prerequisite:** Phase 2.7 code audit refactoring complete ✅.

### 3A. Scene Flow & Navigation Hardening
| Task | Status | Notes |
|---|---|---|
| Wire `dialogue_trees.js` into full venue flow (B4) | ✅ Done | NPC talk screen shows dialogue tree topics, launches DialogueScene or fallback terminal renderer. Topic-based small talk with favor gain. NPC met tracking. |
| Wire rooms into EventManager + GameState (C1) | ✅ Done | Time budget system: venues have `timeLimit`, rooms have `timeCost`, time bar displayed in header. Action cost on venue entry. onEnter effects, eavesdrop unlocks, flags all wired. |
| Full venue flow test (Dashboard→Venue→Dialogue→Haggle→Dashboard) (C2) | ✅ Done | Venue picker → venue detail → room explore → NPC talk → dialogue tree all working. CityScene exit emits proper events. |
| **Weekly Report Screen** — show summary after advancing week | ✅ Done | `weekReportScreen()` in dashboard.js. Shows financial deltas, market shifts, headlines, new messages, anti-resource warnings. Powered by `WeekEngine.lastReport`. |
| Overworld refactor: extract `Player.js`, `NPC.js`, `MapManager.js` | ✅ Done | Player/NPC classes exist. WorldScene v2 uses GridEngine directly with NPCs spawned from Tiled objects. |
| Doorway warps (OverworldScene → LocationScene interiors) | ✅ Done | WorldScene doors now launch LocationScene with venue data, return-to-WorldScene with spawn persistence. |
| Persistent spawn tracking across scene transitions | ✅ Done | `GameState.state.overworldPosition` saved on every tile change, restored on re-entry. |
| **WorldScene v2 — Full Pokemon-style overworld** | ✅ Done | NPC spawning + wandering, dialog box with typewriter text + player freeze, grass encounters (art-world themed), item pickup, daylight overlay, sprint mode (SHIFT/B button), wipe transition, Y-depth sorting, position persistence. MobileJoypad v2 with B sprint button. |

### 3B. Developer Tools
| Task | Status | Notes |
|---|---|---|
| Dev Test Toolbar (bottom-left quick-launch buttons) | ✅ Done | `[ SceneEngine ]` `[ Haggle Battle ]` `[ Dialogue ]` — jump to any Phaser scene from anywhere |
| Admin Narrative Dashboard (God Mode via `~` key + mobile FAB) | ✅ Done | Spec: `Admin_Narrative_Tracker_Spec.md`. Mobile: floating DEV button (AdminFAB), responsive full-screen layout, 44px touch targets. |
| Consequence Queue visualizer | ✅ Done | Read from `ConsequenceScheduler` |
| NPC Memory Matrix panel | ✅ Done | Show hidden grudges/favors/witnessed |
| State Importer (JSON dropzone for late-game testing) | ✅ Done | |
| Global Flags / Decision viewer | ✅ Done | Read from `DecisionLog` |
| **Content Management Studio (CMS)** | ✅ Done (v1) | 3-panel React overlay: Content Library, Timeline, Wiring Inspector. `F1` hotkey or admin button. `ContentStore.js` auto-ingests all data/ entities. |
| CMS: Content Library panel (searchable entity tree) | ✅ Done | Searchable, filterable by category. Shows NPCs, Events, Artists, Artworks, Scenes, Venues, Calendar, Dialogues. Click to inspect. |
| CMS: Timeline panel (drag events onto 40-year calendar) | ✅ Done (v1) | Monthly view of calendar events, color-coded by type. Click to inspect. Drag-drop planned for v2. |
| CMS: Wiring Inspector (entity connection editor) | ✅ Done (v1) | Shows entity connections (NPC→venue, event→speaker, artwork→artist, etc.) with click-to-navigate. Raw JSON viewer. Edit planned for v2. |
| CMS: Consequence Chain Previewer | TODO | Simulate downstream effects of any event |
| CMS: File Loader (auto-import from `data/` directory) | ✅ Done | `ContentStore.js` uses dynamic imports from `data/`. Ingests contacts, artists, artworks, events, venues, calendar, scenes, dialogues. |
| **Quick Demo Init** | ✅ Done | Admin banner "INIT DEMO STATE" when no game loaded. `GameState.quickDemoInit()` bootstraps testable state instantly. Player Dashboard also has demo init button. |

### 3C. Core System Gaps
| Task | Status | Notes |
|---|---|---|
| **Calendar & Time UI** | ✅ Done | Action budget pip panel (4 AP), calendar strip with upcoming events, variable AP costs (1/2), `[AP]` labels, priority advance CTA. New CSS: `db-action-*`, `db-cal-*` |
| **Variable Action Costs** | ✅ Done | `useAction(label, cost=1)`, `hasActions(cost=1)`, MAX_ACTIONS=4. Haggle/sell/art fair=2 AP, browse/visit/call=1 AP |
| **Progressive Disclosure** | ✅ Done | Early (wk 1-4): core loop only. Mid (5-12): +venues, travel, journal, ego dash. Late (13+): +inventory, overworld, retire. Unlock tease messages in dashboard. |
| **Calendar Events Attendance** | ✅ Done | `calendarEventScreen()` — attend art fairs, auctions, biennales from dashboard. Tier-scaled stat rewards, NPC encounters, entry costs. Browse works at fairs/auctions. |
| Tone system for NPC dialogues (5 tones from Roadwarden) | ✅ Done | DialogueEngine rewrite: Friendly/Schmoozing/Direct/Generous/Ruthless. Tone tracking per conversation, persistent `toneHistory` in GameState. |
| Week 20 character specialization (dominant tone → perk) | ✅ Done | `DialogueEngine.getSpecialization()` — dominant tone after Week 20 grants perk via `TONE_SPECIALIZATIONS`. |
| Progressive disclosure (UI reveals through gameplay) | ✅ Done | Early (wk 1-4)/Mid (5-12)/Late (13+) phases with option gating. |
| Inventory system | ✅ Done | Items beyond artworks |
| **Dialogue Scene Visual Upgrade** | ✅ Done | Pokemon-style dual portrait layout (player L, NPC R), typewriter text, speaker name labels. DialogueBox.jsx rewritten with inline styles. Back buttons on both HaggleScene and MacDialogueScene. |
| **Session Persistence** | ✅ Done | Auto-resume from `artlife_last_slot` on page reload. Added `VIEW.TERMINAL` to views.js. App.jsx checks `getMostRecentSlot()` on mount, auto-loads save, pushes dashboardScreen. All Phaser scene exits emit `UI_ROUTE: TERMINAL`. |
| **Haggle Battle Animations** | ✅ Done | Multi-step tactic animations per type: coin rain (financial), hex-shield (logical), slash lines + sparks (aggressive), heart cascade (emotional), shadow eyes (bluff). Player lunge, dealer hit reactions, type effectiveness flashes ("SUPER EFFECTIVE!"), smooth bar tweening. |
| **Juice & Sound Design** | ✅ Done | Terminal SFX (hover/select/typewriter), Haggle scene SFX (tactic/hit/miss/superEffective/dealSuccess/dealFail/penalty), stat change audio (success/penalty), scene transitions (sceneEnter/sceneExit/doorEnter/itemPickup). Remaining: ambient gallery noise. |
| **Variable Text Interpolation** | ✅ Done | `{variable}` placeholders in dialogue text resolved at render time. Supports game state, NPC memory vars, portfolio data. |
| **InkBridge (inkjs integration)** | ✅ Done | `InkBridge.js` bridges inkjs stories to DialogueEngine. Bidirectional GameState sync, tone tracking from `[tone]` tags, save/restore. |
| **Oregon Trail Week Transition** | ✅ Done | Animated day-by-day ticker screen before week report. Shows activities, auto-advances after 2.8s, skip option. CSS: `wt-*` classes. |
| **NPC Memory Matrix** | ✅ Done | DialogueEngine interpolates `{npc_favor}`, `{npc_relationship}`, `{npc_grudge_count}`, `{npc_last_grudge}`. Condition evaluation checks NPC favor/grudges. |
| **Consequence Tease Feedback** | ✅ Done | ConsequenceScheduler shows atmospheric lines when scheduling ("The art world has a long memory..."). Type-specific tease pools. |
| **Systemic Lattice Triggers** | ✅ Done | 4 fail-state arcs wired into WeekEngine: Informant (suspicion≥80), Auteur (burnout≥9), Recession (marketHeat≥90), Exile (avg NPC favor≤-50). Each triggers phone messages, stat mutations, consequence chains, and flags. Resets on new game/load. |
| **NPC Memory Modules** | ✅ Done | npcStore tracks witnessed/grudges/favors per NPC. DialogueEngine reads memory for dynamic text. Gossip propagation in autonomousTick. |

### 3D. JSON Data Layer (Content Authoring Foundation)
> See `Core_Loop_Systems_Spec.md` for full JSON schemas.

| Task | Status | Notes |
|---|---|---|
| Build `PhoneStore.js` | COMPLETE | Notification engine with urgency levels and interruption mechanics |
| Build `CalendarStore.js` | COMPLETE | Timeline engine that fires `ScheduledEvents` on week advance |
| Build `SceneEngine.js` | COMPLETE | Generic React component rendering JSON narratives (bg, npcs, choices) |
| Build `NPCRegistry.js` | ✅ Done | Expanded into `npcStore.js` (Zustand), subsuming `NPCMemory.js` & `PhoneManager` contacts |
| Build `EventRegistry.js` | ✅ Done | Event trigger conditions, consequences, and follow-up scheduling |
| Build `InventoryStore.js` | ✅ Done | Tracks owned items (artworks, documents, contraband) with provenance |
| Build `MarketEngine.js` | ✅ Done | MarketManager.tick() wired into WeekEngine. MarketStore tracks price history, artist heat snapshots, weekly news. Buyback simulation, flipper penalties, market cycle transitions all active. |
| **Data Ingestion System (Sprint 7)** | ✅ Done | `Data_Ingestion_Template.md` JSON schema mapping for AI scraping. `ArtworkDashboard.jsx` Recharts overlay for deep data inspection inside `market.js`. |

---

## Phase 4 — Architecture & Endgame Buildout (CURRENT HORIZON)

> **Goal:** Transition from a prototype into a robust, scalable game engine that can support massive endgame narratives and procedural content layers without breaking.

### 4A. The Zustand Bedrock & Strict UI Routing
| Task | Status | Notes |
|---|---|---|
| Create `gameStore.js` (Full State Migration) | TODO | Replace `GameState` singleton block |
| Convert `MarketManager` & `HaggleManager` | TODO | Pure utility functions mapping to Zustand |
| Refactor `App.jsx` React UI Router | TODO | Enforce `activeView` instead of raw DOM manipulations |
| Save/Load Centralization | TODO | A master payload bundling all Zustand stores into localstorage |

### 4B. The Grid Walking Prototype (Sprint 1.5)
| Task | Status | Notes |
|---|---|---|
| Asset Porting | ✅ Done | Tiled `pallet_town.json` (26x27, 48px tiles), 4 tilesets (grounds/world/world2/grounds2), player spritesheet (72x96, 12 frames). |
| The WorldScene Rebuild | ✅ Done | Extends BaseScene, proper layer depth ordering, GridEngine with Tiled collision props, spawn point from objects, opaque bg, ESC exit, error recovery, door/dialog interaction from Tiled objects. |
| React MobileJoypad Overlay | ✅ Done | D-pad with arrow symbols (56px touch targets), action button (A), exit button. Gold highlight on active direction. Pointer events with global touch failsafe. |
| Admin Test Trigger & Exit UI | ✅ Done | Admin Dashboard "Launch: World Map (Pokemon)" button. Terminal "Walk the Neighborhood" in late-game. Both use GameEventBus.DEBUG_LAUNCH_SCENE. MobileJoypad EXIT calls scene.exitScene(). |

### 4B2. Interior Tiled Maps (Gallery Test Room)
| Task | Status | Notes |
|---|---|---|
| Create gallery_test.json Tiled map | ✅ Done | 12x10 room, 5 paintings, 1 NPC, door, sign. Uses grounds tileset. |
| Upgrade LocationScene for dual-mode (classic + Tiled) | ✅ Done | `roomData.tiledMap` branch: GridEngine movement, painting popups, NPC dialogue, haggle launch |
| Add gallery venue to rooms.js | ✅ Done | `GALLERY_TEST` with `tiledMap: 'gallery_test'` property |
| Wire gallery door in WorldScene map | ✅ Done | Door + sign added to pallet_town.json objects |
| Preload gallery map in BootScene | ✅ Done | `map_gallery_test` key |
| Create PageFlow.md documentation | ✅ Done | Complete navigation flow map in `07_Project/PageFlow.md` |
| Generate AI art assets (Antigravity prompt) | ✅ Done | 20 assets generated via Antigravity v2 (green screen), processed through gallery_asset_pipeline.py |
| Replace placeholder tiles with custom assets | ✅ Done | LimeZu Room_Builder_free_48x48.png tileset (professional 391 tiles), painting/furniture/NPC sprites with green screen cleanup, auto-zoom camera |
| Mobile Game Boy controls for gallery | ✅ Done | LocationScene emits SCENE_READY → React shows MobileJoypad, A button opens popups, D-pad movement, canvas auto-resized |
| Gallery E2E test suite | ✅ Done | 29/29 tests: WorldScene→door→gallery, painting popup, NPC dialogue, exit door, mobile joypad + viewport |
| Auto-door trigger on walk-through | ✅ Done | Player steps onto door tile → auto-exits (Pokemon-style), with spawn protection to prevent instant re-exit |
| Room Generation Pipeline | ✅ Done | `npm run generate:room` — 5 templates (gallery, studio, office, bar, warehouse). Generates Tiled JSON + rooms.js snippet + BootScene preload line. |
| Uptown Gallery (generated) | ✅ Done | Second gallery room generated via pipeline. Door + sign wired in WorldScene map. |
| Artist Studio Visit (generated) | ✅ Done | Studio room for Kwame Asante. Generated via pipeline, wired into game. |
| WorldScene "not found" fix | ✅ Done | Replaced `scene.keys[]` with `scene.getScene()` for reliable scene existence check |
| Camera setZoom race condition fix | ✅ Done | Added null guard on WorldScene resize handler to prevent crash after scene stop |
| LimeZu character sprites integration | ✅ Done | adam/alex/amelia/bob run+idle sprites (16×32), scaled 3x for 48px tiles. NPCs in LocationScene use LimeZu walk animations. |
| Interiors tileset mapping | ✅ Done | `interior_tile_map.json`: 478 tile IDs across 18 categories + 6 room presets from Interiors_free_48x48.png |
| Room generator Interiors upgrade | ✅ Done | All 5 templates (gallery, studio, office, bar, warehouse) now place tile-based furniture from Interiors tileset (sofas, desks, bookcases, plants, lamps, rugs, counters, paintings) |
| Multi-room venue generator | ✅ Done | `node tools/generate_room.js venue <preset> <id>` — 3 presets (gallery_venue, auction_house, artist_compound). Generates connected rooms with internal doors. |
| SoHo Gallery (3-room venue) | ✅ Done | Lobby → Exhibition → Office. Generated via venue pipeline, wired into rooms.js + BootScene + pallet_town.json. |
| Pokemon-style building enter transition | ✅ Done | Fade to black → location name overlay → launch LocationScene. Replaces simple camera fadeout. |
| Door interaction fix (hint + SPACE key) | ✅ Done | Fixed hint system (`d.tileX`→`d.x`), moved doors to reachable tiles, added window-level SPACE fallback for canvas focus, `_doorTransitioning` guard, debug logging. |
| Chelsea Gallery showcase room | ✅ Done | Hand-crafted 16×14 gallery with beige Interiors floor, gold sofa, 9 paintings, reception desk, plants, rugs. Wired into rooms.js + BootScene + pallet_town.json. |
| Map editor research | ✅ Done | Porymap/AwesomeMapEditor/Pokemon Style Map Generator all dead ends (GBA-specific). **Tiled Map Editor** is the correct tool — native JSON export, custom tileset support, macOS via Homebrew. |
| LocationScene camera fix | ✅ Done | Fixed zoom from "fit whole map" to fixed 2-2.5x (matching WorldScene). Added window-level SPACE/ESC fallback, cleanup handler, responsive resize, location name toast. |
| Tiled Map Editor setup | ✅ Done | `brew install --cask tiled` (v1.11.2). Template project at `tools/tiled/` with Room_Builder + Interiors .tsx files, room_template.tmx, import_map.js converter, README guide. |

### 4C. The Content Asset Pipeline
| Task | Status | Notes |
|---|---|---|
| JSON Asset Migration | TODO | Convert massive `.js` arrays (`artworks.js`, `events.js`) into `.json` files |
| The Boot Loader (`BootScene.js`) | TODO | Asynchronously parse and validate JSON payloads before `TitleScene` mounts |

### 4C. Narrative Depth (Pacing & Tones)
| Task | Status | Notes |
|---|---|---|
| The 5-Tone Dialogue System | ✅ Done | Friendly/Schmoozing/Direct/Generous/Ruthless. DialogueEngine tracks per-conversation, persists to `toneHistory`. Week 20 specialization. |
| The Memory Matrix Wiring | ✅ Done | DialogueEngine interpolates NPC favor/grudge/relationship dynamically into node text. |
| Variable Text Parsing | ✅ Done | `{variable}` syntax resolved at render time — cash, name, city, NPC data, portfolio info. |
| Interpretible `WeekEngine.js` Pacing | ✅ Done | Oregon Trail day-by-day transition screen with animated ticker, skip option, auto-advance. |

### 4D. The Week 26 Reckoning (Endgame)
| Task | Status | Notes |
|---|---|---|
| Week 26 Cutoff Trigger | TODO | Hard cap the sandbox loop at Week 26 |
| The Museum Retrospective | TODO | Prestige narrative sequence (requires high Rep/Taste) |
| The SEC Investigation | TODO | Prison sequence (requires high Cash/Heat) |
| The Shadow Broker | TODO | Underground syndicate sequence (requires high Intel) |

---

## Phase 5 — The Content Factory & Procedural Ecosystems
## Phase 5 — Systemic Expansion & Content Ecosystems (Planned)

### Sprint 5A: The Narrative 24-Hour Clock & Day/Night System
- Refactor `GameState.js` to track `hour` and `dayOfWeek` alongside `week`.
- Map FastTravel / GridEngine tile movement to minute drains.
- Build `CalendarHUD.jsx` to render military time constantly onscreen over GridEngine.
- Implement Phaser `postFX` vignette/tinting at 19:00, forcing players home at 24:00 (burnout penalty).

### Sprint 5B: Spatial-Temporal Event Registry
- Refactor `events.js` JSON format to support `{ location: "pallett", day: 5, hourMin: 22 }` bindings.
- Build continuous Coordinate/Time listener into `WorldScene.js` capable of locking input and triggering a narrative React overlay dynamically during a walk.
- Convert NPC schedules into coordinate matrices (e.g. Gallery Owner unspawns at 18:00).

### Sprint 5C: The Admin Sequencer
- Add [ SEQ ] Sequence Trigger Builder to `AdminDashboard.jsx`.
- Visual timeline visualizer allowing dev injection of time/grid coordinates directly to the consequence queue.

### Sprint 5D: The Object Interaction Loop
- Connect `GridEngine.positionChangeFinished` observable to `GameState`.
- Emit interaction actions via GameEventBus mapping coordinates to specific Event Nodes.

---

## Phase 6 — Admin & Settings Hardening (Planned)

### Sprint 6A: The Live Tree Validator
- Import a lightweight React JSON viewer library.
- Bind to `useGameStore` and generic `GameState.state` for direct inline editing.

### Sprint 6B: Memory Operations & Snapshots
- Build the Quick-Save memory array in the Admin UI.
- Implement the "State Reversal" stack tracking the last 5 week-ticks.

### Sprint 6C: Spatial Spawning & Debug Tools
- Bridge the Admin UI to `GridEngine` to read active tile vectors.
- Implement dynamic Phase Sprite instantiators to visually test event layouts.

---

## Phase 7 — Content Management Studio (Planned)

### Sprint 7A: React Flow Integration
- `npm install @xyflow/react`.
- Create `/editor` DEV-only route.
- Implement canvas with panning, zooming, and a library sidebar.

### Sprint 7B: Custom Node Creation
- Build functional React node components mapped to game logic (`TriggerNode`, `DialogueNode`, `StatConditionNode`, `SceneLaunchNode`).
- Ensure WYSIWYG parity (e.g., node looks like the actual terminal).

### Sprint 7C: Serialization & Engine Bridge
- Write compiler traversing node edges.
- Translate graphical schema to `events.json` state machine object.

---

## Phase 8 — Polish, Audio & Release

| Task | Status | Notes |
|---|---|---|
| Tactile Audio | ✅ Done | WebAudioService: 16 procedural SFX (type, hover, select, hit, miss, etc.) |
| Keyboard-First Navigation | ✅ Done | Arrow/WASD + Enter across terminal, SPACE in Phaser scenes |
| Full pixel art pass | TODO | Portraits, backgrounds, UI elements |
| Tutorial / onboarding | TODO | Guided first week |
| Playtesting & balance | TODO | Market math, event frequency |
| Week 26 endgame reckoning | TODO | Museum retrospective, SEC investigation |
| Publish on itch.io | TODO | |

---

## Stretch Goals

| Feature | Notes |
|---|---|
| Multiplayer auction mode | Competitive bidding against other players |
| Procedural artist generation | Infinite content from templates |
| Full 5-location world | Venice, Hong Kong, Sao Paulo |
| Economic warfare | Short selling, rumor mill, crash events |
| Board seats & art fund management | Late-game institutional mechanics |
| Steam release | Electron or Tauri packaging |

---

## Source Document Index

| Folder | Files | Use For |
|---|---|---|
| `01_Overview/` | Game_Concept, Vision_Statement | High-level design intent |
| `02_Mechanics/` | Market_System, Phone_Contacts, Time_System, Turn_Engine | System design reference |
| `03_Characters/` | Character_Classes, Perks_and_Bonuses | Character content |
| `04_Events/` | Event_Types, Scenarios, Venue_Encounters, Dialogue_Trees(_V2) | Narrative content |
| `05_World/` | Locations, Free_Ports, Room_Schema, Rooms/ | World building |
| `06_Economy/` | Art_Valuation | Economic model |
| `07_Project/` | **This file**, README, Implementation_Plan, MVP_Definition, UI_and_Dynamic_Systems_Spec, Admin_Narrative_Tracker_Spec, **Dialogue_Tree_Template**, Phase_4_Multi_Agent_Orders, Content_Templates, Brainstorm_Notes, Email_and_Walkaround_UI_Spec, UI_Architecture_and_Modularity_Spec | Project management |

---

## Agent Notes

### Workflow
1. Check this Roadmap for your next task
2. Mark task as IN PROGRESS in the table above
3. Read relevant source docs from the index
4. Implement, test (`npm test` + `npm run test:flow`)
5. Mark task as DONE, note any follow-ups
6. If you spec something new, create a file in `07_Project/` and link it here

### Key Conventions
- All CSS classes for new features use a consistent prefix (e.g., `db-` for dashboard, `haggle-` for battle)
- Terminal screens return `{ lines, options, footerHtml }` — use `type: 'raw'` for HTML injection
- `TerminalAPI` is the data facade — screens should never import managers directly
- Tests must stay green: 36/36 unit + 36/38 flow (2 Phase A timing issues pre-existing)

---

#project #roadmap #planning #game-design
