---
type: cleanup_roadmap
project: Art_Life
date: 2026-05-13
status: drafted_pending_seb_signoff
---

# Art Life — Cleanup Roadmap

What an agent (or Seb) can safely do, in what order, before any new construction. Treat this as the load-bearing first sprint.

Every step is gated by Seb's explicit signoff. Nothing should run autonomously without him confirming. The dual-data ownership decision in particular requires his architectural call.

---

## Sprint 0: Archive the dead (safe, mechanical, no logic changes)

Goal: stop the deprecated code from competing with the canonical code for attention.

**Moves:**

1. Create `game/src/scenes/_archived_2026_05_13/`.
2. Move `WorldScene.js` (1390 lines, marked deprecated at line 1-2) into archive folder.
3. Move `OverworldScene.js` (267 lines, never called, partial implementation) into archive folder.
4. Move `TitleScene.js` and `MenuScene.js` (legacy menu pattern, not in current flow) into archive folder.
5. Update `game/src/phaserInit.js` to remove the 4 archived scenes from the registration list. Verify scene-keys.js doesn't reference them.
6. Create `game/src/managers/_archived_2026_05_13/`.
7. Move `MarketHistoryEngine.js`, `DealResolver.js`, `ArtistProductionEngine.js` into archive folder. Verify zero inbound imports (the first audit agent confirmed zero).
8. Run `npm test` and `npm run dev` to confirm the game still boots.

**What this unblocks:** future refactors stop tripping over inert code. The file tree visibly shrinks. Any future audit reads cleaner.

**What can go wrong:** the audit agent said zero inbound imports for the orphaned managers, but a dynamic import or window-attached reference might exist. The npm test is the trip wire.

---

## Sprint 1: Declare data ownership (architectural, requires Seb)

Goal: end the dual-layer landmine where GameState.js (1210-line singleton) and 11 Zustand stores both claim the same data types.

**The proposed rule:**

- **GameState.js owns persisted player profile only.** Save/load, character archetype, class, stats, narrative flags, accomplishments, irreversible facts.
- **Zustand stores own live volatile state.** Current market prices, NPC mood snapshots this session, inventory in flux, UI overlay state, calendar entries, event registry, dialogue progress.
- **No data type is owned by both.** Where overlap currently exists, the store wins for live state and GameState is a snapshot read at save time only.

**Specific reconciliations to make explicit:**

| Data type | Current ownership conflict | Proposed owner |
|---|---|---|
| Player stats (class, archetype, XP) | GameState + gameStore | GameState only |
| Live inventory (artworks held this session) | GameState + inventoryStore | inventoryStore. GameState reads at save. |
| Market prices (live ticker) | GameState + marketStore | marketStore only |
| Trade ledger (what happened) | GameState + marketStore | both, but marketStore is live append-log and GameState is daily snapshot |
| NPC state (mood, relationship score) | GameState + npcStore | npcStore live, GameState daily snapshot |
| Calendar entries | GameState + calendarStore | calendarStore live, GameState snapshot |
| Dialogue progress per NPC | GameState + storylineStore | storylineStore live, GameState snapshot |
| UI overlay state (modals open, current view) | uiStore only | uiStore only (already clean) |

**Implementation pattern:** GameState exposes a `snapshot()` method that reads from all stores at save time and writes back via `hydrate(snapshot)` at load. Stores never write back into GameState directly during runtime.

**Seb needs to confirm this rule before any code moves.** If he wants a different ownership pattern, name it and the table changes.

---

## Sprint 2: Wire the canonical scene transitions (mechanical, after Seb picks entry fork)

Goal: collapse the entry sequence into a single canonical path.

Pre-decision required: title screen entry fork (revive TitleScene vs re-stage around ArtnetLogin). Until Seb picks, this sprint cannot start.

**If Seb picks revive-TitleScene:**
1. Restore TitleScene from archive.
2. Replace ArtnetLogin's role as game entry with TitleScene as the Phaser entry.
3. TitleScene plays the title art, listens for Enter.
4. On Enter, TitleScene triggers a camera zoom + scene transition to DocumentaryScene (new).
5. DocumentaryScene plays the Troemel-register documentary sequence (assets generated separately per Gemini prompts).
6. DocumentaryScene ends. Camera pulls back. Email inbox React overlay mounts.
7. Email overlay shows new message. Click triggers ArtnetLogin React component.
8. ArtnetLogin signin transitions to ArtnetUI homepage.
9. ArtnetUI homepage has a "complete your profile" link that launches CharacterCreator.
10. CharacterCreator completion transitions back to ArtnetUI with profile filled.

**If Seb picks re-stage-around-ArtnetLogin:**
1. ArtnetLogin gains a pre-login state called `title_idle`.
2. In title_idle, ArtnetLogin renders the existing title art and listens for Enter.
3. On Enter, ArtnetLogin transitions to a `documentary_playing` state.
4. documentary_playing plays the documentary sequence inline.
5. End of documentary transitions to `email_idle` state with email overlay.
6. Email click transitions to actual `login_form` state (the current ArtnetLogin).
7. Successful signin transitions to ArtnetUI.

Either path produces the same final user experience. Revive-TitleScene is the cleaner story spine (Phaser-first, React-on-top). Re-stage-around-ArtnetLogin is faster to ship (one component change).

---

## Sprint 3: Plug the gaps (asset generation, after prompts are tuned)

Goal: produce the missing artwork to unblock new scene construction.

Priorities, in order:

1. **Class portraits for Speculator and Curator** (the missing two of five). Style anchor: existing Rich Kid, Hedge Fund Manager, Insider portraits in `game/public/portraits/`. Prompts in 04_Gemini_Prompt_Pack.md.
2. **Documentary intro scene art**. Four to eight frames in the Troemel scavenged-screen register. Each frame a scavenged composite of real auction images, AI imagery, browser chrome, real headlines.
3. **Email inbox view**. The protagonist's inbox at game start. Treat as a webpage. Address: probably `email.local` or similar diegetic placeholder.
4. **ArtNet homepage articles**. 8-12 article thumbnails using the 20-plus real 2020-2026 events from the Troemel research plus the 15-plus Report titles for satirical articles.
5. **Home interior**. The space the player zooms out into after closing the computer.
6. **Studio visit**. A studio interior for the studio-visit scene type.
7. **Freeport**. The clinical-teal-and-smoke storage facility.
8. **Phone overlay**. Vintage-Nokia-style mobile chrome.

Each generation goes through the prompt pack, gets validated against the Art_Style_Guide palette and the Troemel register, then lands in `game/public/`.

---

## Sprint 4: Gallery social-battle mechanic (new feature, after sprints 0-3)

Goal: build the four-button social-battle into the gallery scene.

**Design:**
- Player walks in 8-direction movement using existing NewWorldScene patterns.
- NPC proximity detection: when player faces an NPC within 2 tiles, an interaction icon (3 dots, a speech bubble, or similar) appears above the NPC.
- Press confirm: a radial menu appears with four buttons: Deep, Quick, Flirt, Inquire. Each maps to a keyboard or controller button.
- Each move queries the NPC's social profile (vain, intellectual, flirty, guarded). Move success depends on stat match + NPC mood.
- Successful moves grant XP toward one of four social skill trees (Conversation, Wit, Charm, Information).
- Same proximity logic applies to objects: wine glass, cheese platter, art piece, plant, doorway. Each object gives ambient XP or triggers a side-quest hook.

**Reusable from existing code:** the dialogue tree manager in `managers/DialogueTreeManager.js` (currently stubbed) needs to wake up for Deep dialogue. The other three moves can be one-shot deterministic responses with random variation.

**Reusable assets:** `_reference/gallerist-asset/` has the exact animation states the NPCs in this scene need (drinking, breathing-idle, sad-walk, sitting).

---

## What this roadmap does NOT do

- It does not redesign the start menu beyond the entry-fork decision. That's a separate sprint once Seb picks the fork.
- It does not touch the haggle/battle system internals. Existing HaggleManager and HaggleScene stay as-is for now.
- It does not generate audio. Music and SFX are a deferred concern.
- It does not delete anything. All "archive" moves are reversible.

End of cleanup roadmap.
