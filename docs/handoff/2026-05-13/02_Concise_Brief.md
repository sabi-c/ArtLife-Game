---
type: handoff_brief
project: Art_Life
date: 2026-05-13
length: one_page
---

# Art Life — One-Page Brief

**What:** Art-market RPG. Pixel art in the register of Norco (2022) and Backbone (2022). Built on Vite + React + Phaser 3. Mid-rebuild as of 2026-05-13.

**Tonal anchor:** The art world is a system of incentives, not a culture of taste. Don't moralize, show the spreadsheet. (Distilled from Brad Troemel research.)

**Protagonist:** Strategic, not romantic. Five classes (Rich Kid, Hedge Fund Manager, Insider, Speculator, Curator). Character creation adds an archetype layer (Charmer, Lurker, Mercenary, Idealist), six stats (Capital, Information, Charm, Wit, Reputation, Taste), and customization (name, pronouns, hometown, email handle, tagline, visual portrait within class). The Curator is the only class that leans aesthetic and it carries an ethical conflict.

**The dashboard layer is diegetic.** The React UI is the protagonist's computer operating system. Email, ArtNet, BloombergTerminal, MasterCMS, InventoryDashboard are all "apps" the character literally operates. Everything is a webpage frame. The phone is the mobile equivalent for Phaser-world mode.

**Entry flow (most recent Seb voice):** Title screen → Enter → zoom into CRT monitor → documentary (Troemel scavenged-screen register) → email inbox notification → click email → ArtNet invite link → ArtNet login → character creation as "complete your profile" → ArtNet homepage → leave computer → home interior → outside → Pokemon-style world → phone notification → first hook → gallery social-battle.

**Gallery social-battle:** Four buttons mapped to four moves: Deep dialogue, Quick comment, Flirtatious, Inquiry. Proximity-based NPC targeting. Same proximity logic for objects (wine, cheese, art). NPC social profiles (vain, intellectual, flirty, guarded) determine which move lands clean.

**What exists in code:** NewWorldScene (710 lines, canonical), 13 backgrounds, 15+ walk-cycle sprites, 3 of 5 class portraits, full haggle scene, 16+ React components. WorldScene + OverworldScene + TitleScene + MenuScene are dead code. Three orphaned managers (MarketHistoryEngine, DealResolver, ArtistProductionEngine). Dual-data ownership landmine between GameState.js singleton and 11 Zustand stores.

**What's missing:** Speculator and Curator class portraits. Documentary intro scene. Email inbox view. ArtNet homepage with articles. Home interior. Studio visit. Freeport. Phone overlay. All audio.

**Real-world content available:** 20+ verified 2020-2026 art-world events ready as ArtNet article fuel (Inigo Philbrick fraud, Beeple Christie's NFT sale, Salvator Mundi controversies, Documenta 15 antisemitism, Lisa Schiff $6.5M Ponzi, Cattelan banana, Christie's $5.7B 2024 sales, Frida Kahlo $54.66M, Venice Biennale Palestine censorship, etc.). Plus 15+ Brad Troemel Report titles as satirical article vectors (ZIRPSLOP, FLAT ILLUSTRATION, ARTSPEAK, KAYFABE, HUSTLE, CIA Ab-Ex PSYOP, etc.).

**Held decisions:** Title screen entry fork (revive TitleScene vs re-stage around ArtnetLogin). Pending Seb.

**First moves:** Sprint 0 (archive dead code, mechanical, safe). Sprint 1 (declare data ownership, architectural, requires Seb signoff). Sprint 2 (wire canonical entry sequence, gated on title-fork decision). Sprint 3 (generate missing artwork via Gemini prompt pack). Sprint 4 (gallery social-battle implementation).

**Workspace root:** `/Users/seb/Downloads/Manual Library/Playground Seb's Mind/Projects/Art-Market-Game/`
**Style guide:** `docs/project/Art_Style_Guide.md`
**Full handoff:** `docs/handoff/2026-05-13/01_Full_Context.md`
**Cleanup plan:** `docs/handoff/2026-05-13/06_Cleanup_Roadmap.md`
**Prompt pack:** `docs/handoff/2026-05-13/04_Gemini_Prompt_Pack.md`
**Character creation:** `docs/handoff/2026-05-13/05_Character_Creation_System.md`
