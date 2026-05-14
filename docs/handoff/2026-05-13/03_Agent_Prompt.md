---
type: agent_prompt
project: Art_Life
date: 2026-05-13
usage: paste_into_new_claude_session
---

# Sendable agent prompt

Paste this into a fresh Claude Code session to onboard the agent to Art Life.

---

## START PROMPT

You are picking up Seb's Art Life video game project mid-rebuild. The project lives at `/Users/seb/Downloads/Manual Library/Playground Seb's Mind/Projects/Art-Market-Game/`. Read these documents in order before doing anything else:

1. **Full context** at `docs/handoff/2026-05-13/01_Full_Context.md`
2. **Concise brief** at `docs/handoff/2026-05-13/02_Concise_Brief.md`
3. **Cleanup roadmap** at `docs/handoff/2026-05-13/06_Cleanup_Roadmap.md`
4. **Style guide** at `docs/project/Art_Style_Guide.md`
5. **Character creation system** at `docs/handoff/2026-05-13/05_Character_Creation_System.md`
6. **Gemini prompt pack** at `docs/handoff/2026-05-13/04_Gemini_Prompt_Pack.md`
7. **This prompt** (you are here)

Art Life is an art-market RPG in the visual register of Norco (2022) and Backbone (2022), built on Vite + React + Phaser 3. The tonal anchor distilled from Brad Troemel research is: the art world is a system of incentives, not a culture of taste. Don't moralize. Show the spreadsheet.

**Locked decisions** (do not re-open without explicit Seb input):
- Protagonist is strategic, not romantic
- Five financial classes with archetype + stats + customization layers on top
- Dashboard layer is diegetic (React UI = protagonist's computer operating system, every dashboard is an "app")
- "Everything is a webpage" frame: email contains links, links open ArtNet articles, etc.
- NewWorldScene is the canonical world scene
- Visual register: lo-fi screen-recording maximalism for documentary intro, Backbone shadow density for interiors, Papers Please functional UI weight, palette per Art_Style_Guide.md

**Held decisions** (Seb needs to answer before code moves):
- Title screen entry fork: revive TitleScene (Phaser-first) vs re-stage around ArtnetLogin (React-first)
- Cleanup roadmap moves: approval to archive dead scenes and orphaned managers

**The codebase has three biggest landmines:**
1. Dual-data ownership between GameState.js (1210 lines) and 11 Zustand stores
2. Dead scene clutter (WorldScene, OverworldScene, TitleScene, MenuScene)
3. Three orphaned managers (MarketHistoryEngine, DealResolver, ArtistProductionEngine)

**Your first move:** Do NOT propose new construction yet. Ask Seb the two held questions above. After he answers, execute Sprint 0 from the cleanup roadmap first (archive dead code, mechanical only). Then Sprint 1 (data ownership reconciliation, after Seb confirms the proposed rule).

Sprints 2 through 4 (entry sequence wiring, asset generation, gallery social-battle) come only after sprints 0 and 1 are clean.

Real-world art content is available for in-game ArtNet articles: 20+ verified 2020-2026 events (Inigo Philbrick fraud, Beeple NFT sale, Salvator Mundi controversies, Documenta 15 antisemitism, Lisa Schiff fraud, Cattelan banana, Christie's annual sales collapse, Frida Kahlo auction record, Venice Biennale Palestine censorship) plus 15+ Brad Troemel Report titles as satirical vectors (ZIRPSLOP, FLAT ILLUSTRATION, ARTSPEAK, KAYFABE, HUSTLE, CIA Ab-Ex PSYOP, etc.). Full inventory in the Brad Troemel research synthesis in the full context doc.

Tone rules: pixel art register, no em dashes, 12-hour AM/PM time, never pure white in any visual element, no smartphone modern UI, no noble-collector facial expressions, no cute or wholesome anything.

## END PROMPT

---

## Usage notes

- The full context document is the load-bearing artifact. The brief is for collaborator readers. This prompt is for a fresh Claude session.
- Update all five handoff docs together when the situation changes (especially after Seb resolves the held decisions).
- The Gemini prompt pack is self-contained and can be handed to a non-coding collaborator who's doing art generation.
- The character creation system spec is the design source for the CharacterCreator React component refactor when Sprint 3 lands there.
