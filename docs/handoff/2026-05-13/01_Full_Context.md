---
type: handoff
project: Art_Life
date: 2026-05-13
audience: continuation_agent
length: full_context
---

# Art Life — Full Context Handoff

Date: 2026-05-13. Game: Art Life (working title), an art-market RPG in the visual register of Norco (2022) and Backbone (2022), built on Vite + React + Phaser 3, currently mid-rebuild after a multi-iteration accretion of scenes, managers, and stores.

If you are picking this up cold, read this doc end to end, then read 02_Concise_Brief, then the cleanup roadmap and the prompt pack. Do not touch code until 06_Cleanup_Roadmap has been reviewed.

---

## 1. The thesis in one paragraph

The art world is a system of incentives, not a culture of taste. The protagonist is a dealer, speculator, or fund manager, not a curator or collector. Capital, leverage, reputation, and exit are the gameplay loop. The aesthetic critique is downstream of the financial mechanism. Don't moralize. Show the spreadsheet. (This sentence is a direct distillation of the Brad Troemel research findings and is the load-bearing tonal anchor for every other decision.)

---

## 2. Locked decisions (as of 2026-05-13)

These are the framing decisions Seb has signed off on. Treat them as constants unless explicitly re-opened.

- **Protagonist is strategic, not romantic.** They see art as an asset class, as early signal, or as volatility. Never as something that moves them. Image generation, dialogue, and stat design must honor this.
- **Five classes are the spine, customization is layered on top.** Rich Kid, Hedge Fund Manager, Insider, Speculator, Curator. The Curator is the only class that can lean toward an aesthetic relationship with art, and even there it comes with an ethical conflict mechanic. Character creation lets the player customize within and beyond these classes (see 05_Character_Creation_System).
- **The dashboard layer is diegetic.** The React UI is the protagonist's computer operating system. Every dashboard component (ArtnetMarketplace, BloombergTerminal, MasterCMS, InboxShell, InventoryDashboard) is an "app" the character literally operates. The phone is the mobile equivalent for use in Phaser-world mode.
- **Everything is a webpage frame.** Treat the in-game OS as a browser metaphor. Email contains links. Links open ArtNet articles. Articles can reference other articles. The protagonist navigates via tabs and windows, not menu screens. This dissolves the boundary between game UI and game content.
- **NewWorldScene is canonical.** WorldScene.js and OverworldScene.js are dead and will be archived. TitleScene and MenuScene as currently coded are also dead.
- **Tonal register: lo-fi screen-recording maximalism.** Scavenged screenshots, browser tabs, Instagram chrome, AI imagery flattened into real interface frames. The effect is "scrolling someone's phone at 2 AM," not "watching a documentary." Per Brad Troemel research, this is the visual anchor for the documentary intro specifically and a usable register for any in-game ArtNet article visual.
- **Gallery scenes use a four-button social-battle mechanic.** Deep dialogue, Quick comment, Flirtatious, Inquiry. Proximity-based targeting on NPCs. Same proximity logic for object interactions (wine, cheese, art pieces). See 06_Cleanup_Roadmap for implementation notes.

---

## 3. Held decisions (pending Seb)

- **Title screen entry fork.** Option A: revive TitleScene (currently dead in code) as a Phaser title before the React Artnet login, with Enter-to-zoom-into-the-CRT-monitor. Option B: re-stage so the zoom and documentary happen inside or around the existing ArtnetLogin component. Holding for Seb. Both are documented.
- **Email-as-entry vs ArtNet-as-entry order.** Seb's most recent voice was: title → zoom → documentary → email inbox → click invite → ArtNet login → ArtNet content. So email is the entry, ArtNet is the destination one click later. This is captured but not yet locked because it interacts with the title screen fork.

---

## 4. Entry flow as Seb has specified it (most recent voice)

Title screen with vintage CRT computer art (existing, liked).
Press Enter.
Camera zooms into the CRT monitor.
The CRT fills the screen and starts playing a documentary-style web-browser sequence in the Brad Troemel register: scavenged screenshots of real auctions, AI-imagery pasted into real interface frames, headlines, ticker symbols, slide-deck typography, voiceover (optional, may be silent with captions).
Documentary ends. Browser tab closes or another window pops up.
Email inbox is now visible on the computer desktop. A new message has arrived.
Click email. The email contains an invite link to ArtNet.com.
Click link. ArtNet login screen loads.
Sign in. ArtNet homepage with articles.
At some point: character creation triggers, either right after the documentary or inside ArtNet as a "complete your profile" step.
The player operates the computer (email, ArtNet, inventory, terminal) for some duration.
Player leaves the computer. The view zooms out to reveal the home interior.
Player walks outside. Pokemon-style world.
Phone notification arrives. The first hook (email invite to a fair, phone call, NPC meeting) drives the player into the world.
Player follows hook into a gallery, fair, or studio.
Gallery social-battle begins.
First haggle/Pokemon-battle plays out.
Loop continues.

---

## 5. The existing codebase, in one paragraph

Vite + React + Phaser 3. The entry today is App.jsx mounting at `#root`, ArtnetLogin (React) calling `window.startPhaserGame('new')`, BootScene preloading, then IntroScene playing cinematic text, then NewWorldScene taking over. NewWorldScene is the canonical world scene (710 lines, luminus-rpg patterns with tilemaps, arcade physics, warp portals). The React layer has 16-plus mounted components: ArtnetLogin, ArtnetMarketplace, ArtnetUI, BloombergTerminal, MasterCMS, AdminDashboard, InventoryDashboard, MarketDashboard, ArtworkDashboard, CharacterCreator, SettingsOverlay, SalesGrid, DiagnosticsOverlay, BloombergTutorial, HaggleOverlay, InboxShell. Eleven Zustand stores (npcStore, cmsStore, marketStore, uiStore, eventStore, inventoryStore, storylineStore, contentStore, gameStore, consequenceStore, calendarStore) and one massive 1210-line GameState singleton overlap on data ownership, which is the single biggest landmine in the codebase. Eleven managers, of which three (MarketHistoryEngine, DealResolver, ArtistProductionEngine) have real code but zero inbound imports.

---

## 6. The visual register (locked from Seb's Art_Style_Guide.md plus Troemel research)

Three pixel art anchors: Norco (2022) for lo-fi-as-asset, Backbone / Tails Noir (2022) for shadow density, Papers Please (2013) for administrative weight. Cross-cut with 1940s-50s film noir for the lighting language.

Color logic per space, not generic:
- Gallery opening: blue-black base, chandelier gold spotlights, ivory walls, deep red wine, soft greens in bouquet
- Auction house: gold and crimson dominant, warm overhead spotlight, deep blacks elsewhere
- Freeport: clinical teal, smoke, harsh fluorescent
- Studio: warmer tungsten, cluttered, paint-streaked
- Market floor: green-tinted noir
- Scandal scenes: red-shifted
- Documentary intro: scavenged-screen aesthetic, dissolves the line between document and forgery

Base palette: #0a0a0f black, #c9a84c gold, #8b2252 burgundy, #2a6b6b teal, ivory-warm whites only, never pure white.
Always one dominant light source per interior, always.

Avoid list:
- Modern smartphone UI (the in-game phone stays vintage Nokia)
- Pure white anything
- Bright cheerful palettes
- Innocence in character design
- Fictional art-world references (use real galleries, real dealers, real auction houses)
- Cute or whimsical tone (darkly comedic yes, cozy no)
- Noble-collector facial expressions
- Smiles that read "moved by beauty"

---

## 7. Reference inventory (what's already on disk)

In the project's reference folders:
- `_reference/gallerist-asset/`: 32x32 8-direction NPC sprite pack with multi-state animations (drinking, breathing-idle, sad-walk, sitting). This is the gallery-opening ground truth. The states are exactly what the gallery social-battle needs.
- `_reference/Art-Life-Reference/`: Three Modern Interiors tileset packs (~156 MB total, not yet wired into code), Frieze LA PDF, Gmail UI kit PDF, art world data samples (PDB_FineArt_Sample, PDB_DecArt_Sample), pixel splash screens.
- `_reference/monster-tamer/`: Complete Phaser 3 Pokemon-like reference codebase, tutorial project. Code template, minimal art.

In the game's assets:
- 13 scene backgrounds (title, gallery main + backroom, auction, market, fair, social, personal, drama, opportunity, plus 1-bit dithered variants)
- Walk-cycle sprites for 15-plus characters, 8-direction
- Gallery tileset, luminus tilemap (wired in NewWorldScene)
- Haggle battle scene with multiple character poses
- Three of five class portraits (Rich Kid, Hedge Fund Manager, Insider). **Speculator and Curator portraits are missing.**

Zero audio assets. Music and SFX are a known later-priority gap.

---

## 8. The Troemel content layer

A scout report on Brad Troemel's public work (Patreon gated content not used, public surfaces only) returned:
- His genius is plausible deniability through formal mimicry: parody that looks identical to real reporting
- His visual aesthetic is lo-fi screen-recording maximalism (scavenged screenshots, AI imagery pasted into real interface frames)
- He treats the art world as a system of incentives, not a culture of taste

15-plus Report titles harvested for tonal reference: ZIRPSLOP, FLAT ILLUSTRATION, FUNKO, SELFIE MUSEUM, ARTSPEAK, KAYFABE, HUSTLE, CIA Ab-Ex PSYOP, AI, NFT, ART SCHOOL, CONTEMPORARY ART, HIPSTER, CANCELLED, HEALING, CLOUTBOMBING, LITERALISTS, POST INTERNET ART, LEFT CAN'T MEME, CELEBRITY ART. Each title is a vector for in-game ArtNet news article generation.

20-plus real 2020-2026 art-world events with verified sources, ready as ArtNet article fuel: Inigo Philbrick fraud ($86M, fled to Vanuatu, 7-year sentence, released 2024). Beeple's $69.3M Christie's NFT sale. Salvator Mundi downgrades and Saudi gallery rumors. Documenta 15 antisemitism scandal. Lisa Schiff's $6.5M art-advisory collapse on the eve of Frieze NY ($6.5M restitution, 2.5-year sentence 2025). Cattelan's banana resold $6.2M, eaten on stage by Justin Sun. Warhol heist with explosives in Netherlands. 2,000 counterfeit Banksys seized in Italy. Christie's annual sales dropping from $8.4B (2022) to $5.7B (2024). Frida Kahlo setting women-at-auction record at $54.66M. Venice Biennale Palestine censorship row. Galleries closed in summer 2025: Blum, Venus Over Manhattan, Kasmin.

Full list and source URLs in the source agent report (see project log).

---

## 9. The three biggest landmines

1. **Data ownership.** GameState.js (1210 lines, singleton, persistence) overlaps with 11 Zustand stores on the same data types. A trade can land in MarketStore but not show in a GameState snapshot, or vice versa. Before rebuild, declare ownership: GameState owns persisted player profile, stores own live volatile state, no overlap. (06_Cleanup_Roadmap has the specific reconciliation plan.)

2. **Dead scene clutter.** WorldScene.js (1390 lines deprecated), OverworldScene.js (267 lines never called), TitleScene.js, MenuScene.js. All inert in current flow. Archive immediately.

3. **Orphaned managers.** MarketHistoryEngine, DealResolver, ArtistProductionEngine each have 100-700 lines of real code and zero inbound references. Either wire them into the market loop or archive them so the refactor agents don't trip on them.

---

## 10. Workspace map

```
Art-Market-Game/
  _Archive/                    # existing archive
  _reference/                  # design references (NOT to be wired into game code)
    Art-Life-Reference/
    gallerist-asset/
    monster-tamer/
  docs/
    characters/
    economy/
    events/
    handoff/2026-05-13/        # THIS HANDOFF
    mechanics/
    overview/
    project/                   # Art_Style_Guide.md lives here
    world/
  game/
    src/
      App.jsx                  # React entry
      main.jsx
      phaserInit.js            # Phaser scene registry
      scenes/                  # 17 scenes (most dead, see Cleanup_Roadmap)
      managers/                # 11 managers, 3 orphaned
      stores/                  # 11 Zustand stores
      ui/                      # 16+ mounted React components
      data/                    # game data (artists, artworks, dialogue trees, etc.)
      hooks/
    public/                    # 710 files of live assets
    assets/                    # 130 files, processing pipeline
    tools/
    tests/
    docs/
  ag-manager/                  # asset generation manager (separate)
```

---

## 11. What a continuation agent should do first

In order:

1. Read this document end to end.
2. Read `06_Cleanup_Roadmap.md`.
3. Read `Art_Style_Guide.md` if not already.
4. Skim `04_Gemini_Prompt_Pack.md` and `05_Character_Creation_System.md`.
5. Ask Seb the **two unresolved questions**: (a) which entry fork on the title screen (revive TitleScene vs re-stage around ArtnetLogin), and (b) approval on the cleanup roadmap moves before executing any archive operation.
6. Only after Seb answers (a) and (b), begin code changes. Start with archive-only moves (the dead scenes and orphaned managers), then move to the data-ownership reconciliation, then to new scene construction.

---

## 12. The single most surprising thing

The codebase has more than it needs. There are 1390 lines of deprecated world-scene code competing with the canonical 710-line NewWorldScene. There are three orphaned managers with hundreds of lines of unused logic. There are 13 backgrounds already on disk for scenes that don't have wired scenes pointing at them. The bottleneck is not "we need to build more." It is "we need to declare what already exists, and what doesn't, so the rebuild can stop fighting the previous iteration's ghosts." Treat the cleanup roadmap as the load-bearing first sprint, not the prompt pack.

End of full context handoff.
