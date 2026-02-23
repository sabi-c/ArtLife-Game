# ArtLife — Complete Page Flow Map

> Visual map of every screen, overlay, and scene transition in the game.
> Updated: 2026-02-22

---

## Boot Sequence

```
[Page Load]
  └─ App.jsx mounts (React)
       ├─ Check artlife_last_slot → auto-resume saved game?
       │    ├─ YES → Load save → VIEW.TERMINAL → Dashboard
       │    └─ NO → VIEW.PHASER → BootScene
       │
       └─ BootScene (Phaser)
            ├─ Preload all shared assets (tilesets, sprites, JSON data)
            └─ Expose window.startPhaserGame(mode)
                 ├─ mode='new' → IntroScene (cinematic briefing)
                 ├─ mode='charselect' → CharacterSelectScene
                 └─ mode='load' → OverworldScene
```

---

## IntroScene (Cinematic)

```
IntroScene
  ├─ 6 typewritten lines ("The art market moves $67 billion...")
  ├─ SPACE/ENTER → advance line
  ├─ ESC → skip all
  └─ After final line → "ACCESS GRANTED" flash
       └─ Emit UI_ROUTE: BOOT → TerminalLogin
```

---

## TerminalLogin (React)

```
BOOT (TerminalLogin)
  └─ PROFILE_MENU
       ├─ [1] Create New Agent → PROFILE_CREATE
       │    └─ Enter name/password → PRIMARY_MENU
       ├─ [2] Authorize Existing Dossier → PROFILE_LOGIN
       │    └─ Enter credentials → PRIMARY_MENU
       ├─ [3] Guest Access → PRIMARY_MENU
       └─ [4] Dev Mode → Quick Demo Init + Content Studio overlay

PRIMARY_MENU
  ├─ Submit New Application
  │    └─ startPhaserGame('charselect') → CharacterSelectScene
  └─ Authorize Dossier → DOSSIER_SELECT
       └─ Pick save slot → Load game → VIEW.TERMINAL → Dashboard
```

---

## CharacterSelectScene (Phaser)

```
CharacterSelectScene
  └─ 6-phase character builder
       ├─ Phase 1: Archetype selection
       ├─ Phase 2: Stat allocation
       ├─ Phase 3: Trait selection
       ├─ Phase 4: Drip (style)
       ├─ Phase 5: Vice
       └─ Phase 6: Name confirmation
            └─ Emit UI_ROUTE: TERMINAL → Dashboard
```

---

## Dashboard (Terminal — Main Game Hub)

```
DASHBOARD (dashboardScreen)
  │
  ├─ EARLY GAME (Weeks 1-4):
  │    ├─ Browse Market → marketScreen → inspectScreen → Haggle
  │    ├─ My Collection → portfolioScreen
  │    ├─ Phone → phoneScreen → contactScreen
  │    └─ System → systemScreen (save/load/settings/restart)
  │
  ├─ MID GAME (Weeks 5-12): + all above, plus:
  │    ├─ Visit Venue → venuePickerScreen → LocationScene
  │    ├─ Travel → cityScreen (fast travel between cities)
  │    ├─ Market Intel → MarketDashboard (React overlay)
  │    ├─ Journal → journalScreen
  │    └─ Ego Dashboard → egoScreen
  │
  ├─ LATE GAME (Weeks 13+): + all above, plus:
  │    ├─ Inventory → InventoryDashboard (React overlay)
  │    ├─ Walk Neighborhood → WorldScene (Pokemon walk)
  │    └─ Retire → endgame sequence
  │
  └─ Advance Week [always visible]
       └─ WeekEngine.advanceWeek() → weekTransitionScreen → weekReportScreen → Dashboard
```

---

## Venue Flow (LocationScene)

```
Dashboard → "Visit Venue" → venuePickerScreen
  └─ Select venue → LocationScene (Phaser)
       │
       ├─ CLASSIC MODE (existing venues):
       │    ├─ Walk around (Arcade physics, cursor keys)
       │    ├─ SPACE → interact with NPC/exit/item
       │    ├─ NPC → DialogueScene (Phaser overlay)
       │    ├─ Exit door → scene.restart(new room)
       │    └─ "LEAVE VENUE" / time expires → back to Dashboard
       │
       └─ TILED MODE (gallery_test, future interiors):
            ├─ Walk around (GridEngine, cursor keys + mobile joypad)
            ├─ SPACE → interact with painting/NPC/door/sign
            ├─ Painting → artwork detail popup (title, artist, price)
            │    └─ [A] Make Offer → HaggleScene
            ├─ NPC → dialogue popup with options
            │    └─ "Make an offer" → HaggleScene
            ├─ Door → return to WorldScene or enter new room
            └─ ESC / "LEAVE VENUE" → back to caller
```

---

## WorldScene (Pokemon Overworld)

```
Dashboard → "Walk Neighborhood" → WorldScene (Phaser)
  ├─ Grid movement (GridEngine, 48px tiles)
  ├─ SPACE → interact with facing tile
  │    ├─ Door → LocationScene (venue interior)
  │    ├─ Sign → dialog box (typewriter text)
  │    ├─ NPC → dialog box with speaker label
  │    ├─ Grass → random art-world encounter
  │    └─ Item → pickup with tween animation
  ├─ SHIFT → sprint mode
  ├─ ESC → exit to Dashboard
  └─ Day/night overlay based on in-game week
```

---

## HaggleScene (Pokemon Battle)

```
HaggleScene (Phaser)
  ├─ Pre-battle cinematic (letterbox, VS slam)
  ├─ 5 rounds max, turn-based
  │    ├─ Player selects tactic (Financial/Logical/Aggressive/Emotional/Bluff)
  │    ├─ Dealer responds based on type effectiveness
  │    ├─ Price gap narrows/widens
  │    └─ Deal when gap ≤ 5% of asking price
  ├─ WIN → purchase artwork, return to caller
  ├─ LOSE → no deal, return to caller
  └─ Return: scene.start(returnScene, returnArgs)
```

---

## Dialogue Scenes

```
DialogueScene (Phaser)
  ├─ Multi-node branching dialogue tree
  ├─ Choices with stat requirements (blue options)
  ├─ Effects: favor, intel, reputation changes
  ├─ Can trigger HaggleScene from dialogue
  ├─ ESC → exit to caller
  └─ Return via onExit callback → resume parent scene

MacDialogueScene (Phaser)
  ├─ 1-bit Macintosh aesthetic
  ├─ InkBridge integration for .ink stories
  └─ Same return pattern as DialogueScene
```

---

## React Overlays (Toggle from Anywhere)

```
OVERLAYS (managed by App.jsx overlay router)
  ├─ ` (backtick)  → AdminDashboard (God Mode)
  ├─ F1            → ContentStudio (CMS)
  ├─ F2            → Diagnostics panel
  │
  ├─ Via Dashboard options or Admin buttons:
  │    ├─ MARKET      → MarketDashboard (Recharts analytics)
  │    ├─ ARTWORK     → ArtworkDashboard (Bloomberg-style deep dive)
  │    ├─ INVENTORY   → InventoryDashboard
  │    ├─ SETTINGS    → SettingsOverlay
  │    ├─ CMS         → MasterCMS (full content editor)
  │    └─ PLAYER      → PlayerDashboard
  │
  └─ All close with ESC
```

---

## Scene Key Reference

| Scene Key | File | Purpose |
|---|---|---|
| `BootScene` | `scenes/BootScene.js` | Asset preloader, exposes startPhaserGame |
| `IntroScene` | `scenes/IntroScene.js` | Cinematic narrator intro |
| `CharacterSelectScene` | `scenes/CharacterSelectScene.js` | 6-phase character builder |
| `OverworldScene` | `scenes/OverworldScene.js` | Legacy overworld (deprecated, kept for saves) |
| `WorldScene` | `scenes/WorldScene.js` | Pokemon-style grid walking |
| `LocationScene` | `scenes/LocationScene.js` | Interior room exploration (classic + Tiled modes) |
| `HaggleScene` | `scenes/HaggleScene.js` | Pokemon-style negotiation battle |
| `DialogueScene` | `scenes/DialogueScene.js` | Branching dialogue trees |
| `MacDialogueScene` | `scenes/MacDialogueScene.js` | 1-bit Macintosh dialogue |
| `CityScene` | `scenes/CityScene.js` | City overview / fast travel |
| `FastTravelScene` | `scenes/FastTravelScene.js` | Travel animation |
| `MenuScene` | `scenes/MenuScene.js` | In-game menu |
| `EndScene` | `scenes/EndScene.js` | Game over / retirement |

---

## View State Machine (App.jsx)

```
VIEW.PHASER    → Show Phaser canvas, hide React terminal
VIEW.BOOT      → Show TerminalLogin React component
VIEW.TERMINAL  → Show Terminal DOM (dashboard, screens)
```

Transitions between views are triggered by `GameEventBus.emit(GameEvents.UI_ROUTE, viewName)`.

---

#project #documentation #page-flow
