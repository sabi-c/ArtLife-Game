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
| 4.1 | **Characters at MVP?** | ✅ **2–3 classes** to ship faster. |
| 4.2 | **Player name/avatar?** | ⬜ TBD. |
| 4.3 | **How many dialogue events?** | ⬜ As many as possible — template-driven, AI-generated at scale. |
| 4.4 | **Named or procedural NPCs?** | ⬜ Likely hybrid — key NPCs named, background NPCs procedural. |
| 4.5 | **Events repeat or unique?** | ⬜ Mix — core events repeat with variation, rare events are unique. |

---

## 🌍 5. World & Scope

| # | Question | Answer |
|---|---|---|
| 5.1 | **Locations at MVP?** | ⬜ Start small, expand. |
| 5.2 | **Travel cost?** | ⬜ TBD. |
| 5.3 | **Auction style?** | ⬜ TBD. |
| 5.4 | **Gallery tiers?** | ⬜ TBD — but likely yes, they add strategic depth. |

---

## 🔧 6. Technical & Platform

| # | Question | Answer |
|---|---|---|
| 6.1 | **Browser-only?** | ⬜ Browser first, expand later. |
| 6.2 | **Single-player at MVP?** | ✅ **Yes.** |
| 6.3 | **Save/Load?** | ✅ **Yes — essential** for multi-day play. |
| 6.4 | **Build it yourself or collaborator?** | ✅ **Collaborative.** Build together, learn as we go. |
| 6.5 | **JS/HTML/CSS comfort?** | ⬜ Learning curve — needs scaffolding and guidance. |

---

## 💰 7. Business & Release

| # | Question | Answer |
|---|---|---|
| 7.1 | **Passion project or commercial?** | ⬜ TBD — building it first. |
| 7.2 | **Target audience?** | ⬜ Art world insiders + strategy gamers. |
| 7.3 | **Distribution?** | ⬜ TBD. |
| 7.4 | **Timeline?** | ✅ **ASAP.** Get mechanics working fast, iterate from there. |

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
