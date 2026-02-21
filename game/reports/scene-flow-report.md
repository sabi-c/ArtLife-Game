# ArtLife — Scene Flow Test Report

**Date:** 2026-02-21T13:12:10.183Z
**Result:** ❌ 2 FAILED  (36/38)

## Check Results

| # | Label | Status | Notes |
|---|-------|--------|-------|
| 1 | TitleScene is active on boot | ❌ |  |
| 2 | Phaser canvas is visible with dimensions | ✅ |  |
| 3 | Terminal is hidden during TitleScene | ✅ |  |
| 4 | CharacterSelectScene activated after clicking title | ❌ |  |
| 5 | CharacterSelectScene navigation skipped (title click did not trigger transition) | ⚠️ |  |
| 6 | Phase A3, A4 skipped — no game state | ⚠️ |  |
| 7 | game.start(0): "Started as THE NEPO BABY" | ✅ |  |
| 8 | GameState initialised via API — week 1 | ✅ |  |
| 9 | Cash: $250,000 | ✅ |  |
| 10 | startHaggle() returned started=true | ✅ |  |
| 11 | HaggleScene became active | ✅ |  |
| 12 | Haggle maxRounds: 5 | ✅ |  |
| 13 | Dealer type: hustler | ✅ |  |
| 14 | Phase is "opening" (got "opening") | ✅ |  |
| 15 | Canvas visible during HaggleScene | ✅ |  |
| 16 | Terminal restored after HaggleScene exit | ✅ |  |
| 17 | MacDialogueScene is active | ✅ |  |
| 18 | 3 dialogue lines (got 3) | ✅ |  |
| 19 | Speaker field: "Gallerist" | ✅ |  |
| 20 | React DialogueBox name tag rendered in DOM ("Gallerist") | ✅ |  |
| 21 | Terminal restored after dialogue | ✅ |  |
| 22 | MacDialogueScene with reward is active | ✅ |  |
| 23 | Reward item detected | ✅ |  |
| 24 | Terminal restored after reward overlay | ✅ |  |
| 25 | No lingering scenes (found: none) | ✅ |  |
| 26 | No JS errors logged (found 0) | ✅ |  |
| 27 | No scene errors logged (found 0) | ✅ |  |
| 28 | No missing assets logged | ✅ |  |
| 29 | No unexpected browser console errors | ✅ |  |
| 30 | LocationScene launched for gallery_opening | ✅ |  |
| 31 | LocationScene.startDialogue() called without error | ✅ |  |
| 32 | DialogueScene is active after NPC startDialogue() | ✅ |  |
| 33 | DialogueScene has eventData | ✅ |  |
| 34 | DialogueScene has 23 steps | ✅ |  |
| 35 | DialogueScene title: "Talking to Elena Ross" | ✅ |  |
| 36 | HaggleManager.start() triggers without error | ✅ |  |
| 37 | HaggleScene active after dialogue pipeline launch | ✅ |  |
| 38 | HaggleScene reports active state | ✅ |  |
| 39 | HaggleScene maxRounds: 5 | ✅ |  |
| 40 | Terminal UI restored after HaggleScene exit | ✅ |  |

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