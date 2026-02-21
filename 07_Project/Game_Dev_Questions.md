# ❓ Game Development Questions

> Critical decisions for ArtLife. ✅ = answered, ⬜ = still open.

---

## 🎯 1. Core Identity

| # | Question | Answer |
|---|---|---|
| 1.1 | **Narrative game or systems game?** | ✅ **Both.** Heavy simulation math AND lots of scenarios. The sim drives the world; the scenarios give it flavour. |
| 1.2 | **Win condition?** | ✅ **Multiple metrics, open sandbox.** Most art pieces collected, highest-value pieces passed through, and/or most money accumulated. No single "you win" screen — it's about your legacy. |
| 1.3 | **Playthrough length?** | ✅ **Multi-day.** This is a game you play over several sessions, like an RPG. Save/load is essential. |
| 1.4 | **Replayability?** | ✅ **Yes, core priority.** Oregon Trail model — different variables at start, different choices = different outcomes. |

---

## 🎨 2. Aesthetics & Presentation

| # | Question | Answer |
|---|---|---|
| 2.1 | **What does "8-bit noir" look like?** | ✅ **Pixel art, slightly animated.** Not static — subtle idle animations, transitions. Reference: Pixel Noir, Backbone, Norco. |
| 2.2 | **Character portraits / illustrations?** | ⬜ Deferred — mechanics first, art later. |
| 2.3 | **Animation level?** | ✅ **Slightly animated pixel art.** Not static, but not full animation. Subtle movement. |
| 2.4 | **Sound design?** | ⬜ Deferred — not a priority for first build. |
| 2.5 | **UI paradigm?** | ✅ **Oregon Trail style first.** Text-based with decision panels. Layer visuals on top later. |

---

## ⚙️ 3. Mechanics Depth

| # | Question | Answer |
|---|---|---|
| 3.1 | **How many artists?** | ✅ **~500.** Use AI to bulk-generate from templates. Real artist names sourced from ArtNews Top 100 + expanded pool. |
| 3.2 | **Fictional or real artists?** | ✅ **Real.** Fed from ArtNews, real auction data. Always topical. |
| 3.3 | **Market data transparency?** | ⬜ TBD — likely class-dependent visibility. |
| 3.4 | **NPC relationship depth?** | ✅ **High.** Dialogue memory, favour/grudge mechanics. Full depth. |
| 3.5 | **Losing state?** | ✅ **Yes — bankruptcy.** Multiple ways to lose. |
| 3.6 | **Actions per turn?** | ⬜ Reference Oregon Trail pacing — TBD through playtesting. |

---

## 🧑 4. Characters & Narrative

| # | Question | Answer |
|---|---|---|
| 4.1 | **Characters at MVP?** | ✅ **3 classes** (Rich Kid, Hedge Fund, Insider) to ship faster. |
| 4.2 | **Player name/avatar?** | ✅ **Handled via CharacterSelectScene.** Player chooses background, vice, and drip which dictate starting stats. |
| 4.3 | **How many dialogue events?** | ✅ **Template-driven scale.** Powered by `inkjs` scripts and JSON event definitions. Target is 100+ events and 50+ scenes. |
| 4.4 | **Named or procedural NPCs?** | ✅ **Hybrid.** Key NPCs are named and tracked via `NPCRegistry`. Procedural NPCs fill out auctions and parties. |
| 4.5 | **Events repeat or unique?** | ✅ **Mix.** Core events repeat with variation based on current era/week. High-priority narrative events are unique. |

---

## 🌍 5. World & Scope

| # | Question | Answer |
|---|---|---|
| 5.1 | **Locations at MVP?** | ✅ **Chelsea gallery district + Airport.** Fast travel unlocks other global hubs (Basel, London) later. |
| 5.2 | **Travel cost?** | ✅ **Cash + Actions.** Traveling costs money and consumes actions from the weekly budget. |
| 5.3 | **Auction style?** | ✅ **Iterative bidding minigame.** Handled via dedicated `AuctionScene` using the `HaggleManager` core. |
| 5.4 | **Gallery tiers?** | ✅ **Yes.** Galleries have prestige levels that act as Quality Gates for player access. |

---

## 🔧 6. Technical & Platform

| # | Question | Answer |
|---|---|---|
| 6.1 | **Browser-only?** | ✅ **Browser first.** Built with React + Phaser, bundled via Vite. |
| 6.2 | **Single-player at MVP?** | ✅ **Yes.** |
| 6.3 | **Save/Load?** | ✅ **Yes — essential.** GameState serialization natively managed via Zustand stores (in V2) to `localStorage`. |
| 6.4 | **Build it yourself or collaborator?** | ✅ **Collaborative.** Seb + Antigravity + ClaudeCode as a dedicated trio. |
| 6.5 | **JS/HTML/CSS comfort?** | ✅ **Agent-assisted scaffolding.** React/Phaser bridges handled by architectural blueprints. |

---

## 💰 7. Business & Release

| # | Question | Answer |
|---|---|---|
| 7.1 | **Passion project or commercial?** | ⬜ TBD — building it first. |
| 7.2 | **Target audience?** | ⬜ Art world insiders + strategy gamers. |
| 7.3 | **Distribution?** | ✅ **Web/PWA.** Service worker already checked in `phaserInit.js` for progressive web app capabilities. |
| 7.4 | **Timeline?** | ✅ **ASAP.** V2 foundational architecture actively being built to support rapid content authoring via the CMS. |

---

## 🏗️ Key Architectural Decision: Template-Driven Content

> *"We just need to make really good templates... then we can tell AI to scour and start building all of it."*

This is the content strategy:
1. Design **templates** for each content type (artists, scenarios, NPCs, dialogues, events)
2. Fill 5–10 examples by hand to prove the template works
3. Use AI to **bulk-generate** hundreds of entries from the template
4. Human review and curate the best output

See: [[07_Project/Content_Templates]] for the template specs.

---

## Tags
#project #questions #planning #game-design
