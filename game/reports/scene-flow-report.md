# ArtLife — Scene Flow Test Report

**Date:** 2026-02-21T09:41:28.295Z
**Result:** ✅ ALL PASS  (53/53)

## Check Results

| # | Label | Status | Notes |
|---|-------|--------|-------|
| 1 | TitleScene is active on boot | ✅ |  |
| 2 | Phaser canvas is visible with dimensions | ✅ |  |
| 3 | Terminal is hidden during TitleScene | ✅ |  |
| 4 | CharacterSelectScene activated after clicking title | ✅ |  |
| 5 | CharacterSelectScene is accessible via Phaser API | ✅ |  |
| 6 | 4 character cards rendered (got 4) | ✅ |  |
| 7 | Arrow right: index moved to 1 (got 1) | ✅ |  |
| 8 | Arrow left: index back to 0 (got 0) | ✅ |  |
| 9 | Space key missed JustDown frame — using direct API fallback (confirmSelection) | ⚠️ |  |
| 10 | Terminal UI becomes visible after character confirm | ✅ |  |
| 11 | Phaser canvas hidden when terminal is active | ✅ |  |
| 12 | GameState initialised — week 1 | ✅ |  |
| 13 | Starting cash: $250,000 | ✅ |  |
| 14 | Starting city: new-york | ✅ |  |
| 15 | Dashboard has 14 menu options | ✅ |  |
| 16 | "Visit Venue" in dashboard menu | ✅ |  |
| 17 | "Advance Week" in dashboard menu | ✅ |  |
| 18 | Terminal rendered content (2105 chars) | ✅ |  |
| 19 | Advance returned: "Advanced 1 week(s). Now week 2" | ✅ |  |
| 20 | GameState.week is now 2 (got 2) | ✅ |  |
| 21 | game.start(0): "Started as THE NEPO BABY" | ✅ |  |
| 22 | GameState initialised via API — week 1 | ✅ |  |
| 23 | Cash: $250,000 | ✅ |  |
| 24 | startHaggle() returned started=true | ✅ |  |
| 25 | HaggleScene became active | ✅ |  |
| 26 | Haggle maxRounds: 5 | ✅ |  |
| 27 | Dealer type: collector | ✅ |  |
| 28 | Phase is "opening" (got "opening") | ✅ |  |
| 29 | Canvas visible during HaggleScene | ✅ |  |
| 30 | Terminal restored after HaggleScene exit | ✅ |  |
| 31 | MacDialogueScene is active | ✅ |  |
| 32 | 3 dialogue lines (got 3) | ✅ |  |
| 33 | Speaker field: "Gallerist" | ✅ |  |
| 34 | React DialogueBox name tag rendered in DOM ("Gallerist") | ✅ |  |
| 35 | Terminal restored after dialogue | ✅ |  |
| 36 | MacDialogueScene with reward is active | ✅ |  |
| 37 | Reward item detected | ✅ |  |
| 38 | Terminal restored after reward overlay | ✅ |  |
| 39 | No lingering scenes (found: none) | ✅ |  |
| 40 | No JS errors logged (found 0) | ✅ |  |
| 41 | No scene errors logged (found 0) | ✅ |  |
| 42 | No missing assets logged | ✅ |  |
| 43 | No unexpected browser console errors | ✅ |  |
| 44 | LocationScene launched for gallery_opening | ✅ |  |
| 45 | LocationScene.startDialogue() called without error | ✅ |  |
| 46 | DialogueScene is active after NPC startDialogue() | ✅ |  |
| 47 | DialogueScene has eventData | ✅ |  |
| 48 | DialogueScene has 23 steps | ✅ |  |
| 49 | DialogueScene title: "Talking to Elena Ross" | ✅ |  |
| 50 | HaggleManager.start() triggers without error | ✅ |  |
| 51 | HaggleScene active after dialogue pipeline launch | ✅ |  |
| 52 | HaggleScene reports active state | ✅ |  |
| 53 | HaggleScene maxRounds: 5 | ✅ |  |
| 54 | Terminal UI restored after HaggleScene exit | ✅ |  |

## Missing Assets
_None_

## Browser Errors
_None_

## Screenshots
| Label | File |
|-------|------|
| A1 — TitleScene | `reports/screenshots/A1_title.png` |
| A2 — CharacterSelect | `reports/screenshots/A2_char_select.png` |
| A3 — Dashboard | `reports/screenshots/A3_dashboard.png` |
| A4 — Week 2 | `reports/screenshots/A4_week2.png` |
| B2 — Haggle open | `reports/screenshots/B2_haggle.png` |
| B2b — After haggle | `reports/screenshots/B2b_after_haggle.png` |
| B3 — Dialogue | `reports/screenshots/B3_dialogue.png` |
| B3b — After dialogue | `reports/screenshots/B3b_after_dialogue.png` |
| B4 — Dialogue + reward | `reports/screenshots/B4_dialogue_reward.png` |
| B4b — After reward | `reports/screenshots/B4b_after_reward.png` |
| C1 — LocationScene | `reports/screenshots/C1_location.png` |
| C2 — DialogueScene active | `reports/screenshots/C2_dialogue_active.png` |
| D1 — Haggle from dialogue | `reports/screenshots/D1_haggle_from_dialogue.png` |
| D2 — Terminal after haggle | `reports/screenshots/D2_terminal_after_haggle.png` |