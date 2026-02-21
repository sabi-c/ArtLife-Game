# ArtLife — Phaser Pattern Research Report

**Date:** 2026-02-20
**Sources:** `_reference/monster-tamer/` (JS, Phaser 3, no bundler) + `../pokemon-react-phaser/` (TS, Vite, React + Zustand)

---

## Summary

Two local reference repos were audited for patterns applicable to ArtLife's stack (Phaser 3 + React 19 + Zustand 5 + Vite + GridEngine). The findings below are ordered by priority for integration.

---

## 1. Controls Class (`src/utils/Controls.js`)

**Source:** `_reference/monster-tamer/src/utils/controls.js`

**Problem it solves:** Scattered `this.cursors = this.input.keyboard.createCursorKeys()` calls in every scene. When `keyboard` is `undefined` (headless, focus lost, SSR), each scene needs its own null-check — or it crashes.

**Pattern:**
```js
export class Controls {
    #scene;
    #cursorKeys;
    #lockPlayerInput = false;

    constructor(scene) {
        this.#scene = scene;
        this.#cursorKeys = scene.input.keyboard?.createCursorKeys(); // null-safe
    }

    get isInputLocked() { return this.#lockPlayerInput; }
    set lockInput(val) { this.#lockPlayerInput = val; }

    wasSpaceKeyPressed() {
        if (!this.#cursorKeys) return false;
        if (this.#lockPlayerInput) return false;
        return Phaser.Input.Keyboard.JustDown(this.#cursorKeys.space);
    }

    getDirectionKeyJustPressed() {
        if (!this.#cursorKeys) return DIRECTION.NONE;
        // ArrowLeft/Right/Up/Down with JustDown checks
    }
}
```

**Benefit for ArtLife:** All scenes currently call `this.input.keyboard.createCursorKeys()` directly and use `Phaser.Input.Keyboard.JustDown()` inline. Centralising into Controls:
- Prevents crashes when keyboard is null (mobile, headless)
- `lockInput = true` during scene transitions / dialogue animations (stops double-triggers)
- One place to add gamepad/touch support later

**Integration:** Create `src/utils/Controls.js`. Use in CharacterSelectScene, HaggleScene, OverworldScene, LocationScene.

---

## 2. StateMachine (`src/utils/StateMachine.js`)

**Source:** `_reference/monster-tamer/src/utils/state-machine.js`

**Problem it solves:** HaggleScene currently manages phase state with a plain `this.phase` string + multiple `if/else` branches scattered across `update()`, `openingSequence()`, `handleTacticSelection()`, etc. State transitions are hard to trace and easy to corrupt.

**Pattern:**
```js
export class StateMachine {
    #states = new Map();   // name → { name, onEnter }
    #currentState;
    #isChangingState = false;
    #changingStateQueue = [];

    constructor(id, context) { /* id for debug logs, context for `this` binding */ }

    addState({ name, onEnter }) {
        this.#states.set(name, { name, onEnter: onEnter?.bind(this.#context) });
    }

    setState(name) {
        if (this.#isChangingState) {
            this.#changingStateQueue.push(name); // queue if mid-transition
            return;
        }
        this.#currentState = this.#states.get(name);
        this.#currentState.onEnter?.();
    }

    update() {
        if (this.#changingStateQueue.length > 0) this.setState(this.#changingStateQueue.shift());
    }

    get currentStateName() { return this.#currentState?.name; }
}
```

**Benefit for ArtLife:** HaggleScene has phases: `opening → player_turn → dealer_response → closing → complete`. A StateMachine makes each phase's entry logic explicit and prevents impossible transitions (e.g., going from `complete` back to `opening`).

**Integration:** Create `src/utils/StateMachine.js`. Refactor HaggleScene to use it; also useful for MacDialogueScene (idle → typing → waiting → reward → done).

---

## 3. BaseScene (`src/scenes/BaseScene.js`)

**Source:** `_reference/monster-tamer/src/scenes/base-scene.js`

**Problem it solves:** Every scene duplicates RESUME/SHUTDOWN event registration, Controls creation, and `bringToTop()` calls.

**Pattern:**
```js
export class BaseScene extends Phaser.Scene {
    _controls;

    constructor(config) {
        super(config);
        if (this.constructor === BaseScene) throw new Error('Abstract class');
    }

    create() {
        this._controls = new Controls(this);
        this.events.on(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneCleanup, this);
        this.scene.bringToTop();
    }

    handleSceneResume(sys, data) {
        this._controls.lockInput = false; // always unlock on resume
    }

    handleSceneCleanup() {
        this.events.off(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);
        // Subclasses call super.handleSceneCleanup() then do their own cleanup
    }

    _log(message) {
        console.log(`%c${message}`, 'color: orange; background: black;');
    }
}
```

**Benefit for ArtLife:** Guarantees:
- Controls always initialised before `update()` runs (current ArtLife bug risk: `this.cursors` used before create finishes)
- Input always unlocked on RESUME (currently missing — after HaggleScene exits, input can be locked)
- Consistent `_log()` styled console output for debugging
- SHUTDOWN cleanup always removes listeners (currently some scenes leak event listeners on scene stop)

**Integration:** Create `src/scenes/BaseScene.js`. Migrate HaggleScene, OverworldScene, LocationScene, MacDialogueScene to extend it. CharacterSelectScene can stay as-is (simple enough).

---

## 4. Scene Transition (`src/utils/SceneTransition.js`)

**Source:** `_reference/monster-tamer/src/utils/scene-transition.js`

**Problem it solves:** Scene switches currently happen with a hard cut. No transition animation.

**Pattern:**
```js
export function createSceneTransition(scene, { callback, skipSceneTransition = false } = {}) {
    if (skipSceneTransition) { callback?.(); return; }

    const { width, height } = scene.scale;
    const rect = new Phaser.Geom.Rectangle(0, height / 2, width, 0);
    const g = scene.add.graphics().fillRectShape(rect).setDepth(-1);
    const mask = g.createGeometryMask();
    scene.cameras.main.setMask(mask);

    scene.tweens.add({
        targets: rect,
        delay: 400, duration: 800,
        ease: Phaser.Math.Easing.Expo.InOut,
        height: { from: 0, to: height },
        y: { from: height / 2, to: 0 },
        onUpdate: () => g.clear().fillRectShape(rect),
        onComplete: () => {
            mask.destroy();
            scene.cameras.main.clearMask();
            callback?.();
        },
    });
}
```

**Benefit for ArtLife:** The iris/wipe animation (rectangle expanding from center) is a classic JRPG transition that fits ArtLife's aesthetic. `skipSceneTransition: true` can be passed for fast-travel or test environments.

**Integration:** Create `src/utils/SceneTransition.js`. Use at the end of TitleScene (→ CharacterSelectScene) and LocationScene (→ MacDialogueScene/HaggleScene).

---

## 5. Scene Keys + Asset Keys Constants

**Source:** `_reference/monster-tamer/src/scenes/scene-keys.js`

**Problem it solves:** Scene keys like `'HaggleScene'`, `'MacDialogueScene'`, `'OverworldScene'` are string literals scattered across 10+ files. A typo in a scene key silently fails (Phaser just logs a warning and does nothing).

**Pattern:**
```js
// src/data/scene-keys.js
export const SCENE_KEYS = Object.freeze({
    BOOT:             'BootScene',
    TITLE:            'TitleScene',
    INTRO:            'IntroScene',
    CHARACTER_SELECT: 'CharacterSelectScene',
    OVERWORLD:        'OverworldScene',
    CITY:             'CityScene',
    FAST_TRAVEL:      'FastTravelScene',
    LOCATION:         'LocationScene',
    HAGGLE:           'HaggleScene',
    DIALOGUE:         'DialogueScene',
    MAC_DIALOGUE:     'MacDialogueScene',
    END:              'EndScene',
});

// src/data/asset-keys.js
export const ASSET_KEYS = Object.freeze({
    BG_GALLERY_MAIN:       'bg_gallery_main_1bit_1771587911969.png',
    BG_GALLERY_BACKROOM:   'bg_gallery_backroom_1bit_1771587929810.png',
    PORTRAIT_IT_GIRL:      'portrait_it_girl_1bit.png',
    PORTRAIT_LEGACY:       'portrait_legacy_gallerist_1bit.png',
    PORTRAIT_CONNECTOR:    'portrait_underground_connector_1bit.png',
    // etc.
});
```

**Benefit for ArtLife:** IDE autocomplete, refactoring safety, one-file audit of all registered assets. Particularly useful when adding new backgrounds/portraits — the key list in asset-keys.js becomes the single source of truth.

**Integration priority: LOW** — useful but not blocking. Can add incrementally.

---

## 6. DataManager Pattern

**Source:** `_reference/monster-tamer/src/utils/data-manager.js`

**Problem it solves:** Game data (save state, settings) stored in Phaser's `game.registry` with no schema validation. Data can be partially written and left corrupt on crash.

**Pattern:**
```js
export class DataManager {
    static #phaserEventEmitter;
    static initialGameData = { playerMonstersParty: [], playerInventory: [], ... };

    static init(registry) {
        this.#phaserEventEmitter = registry;
        registry.set(DATA_MANAGER_STORE_KEYS.PLAYER_MONSTERS, this.initialGameData.playerMonstersParty);
    }

    static getAnimations() { return this.#phaserEventEmitter.get(DATA_MANAGER_STORE_KEYS.ANIMATIONS); }
    static saveData() { /* localStorage.setItem with schema validation */ }
    static loadData() { /* load + merge with initialGameData defaults */ }
}
```

**Benefit for ArtLife:** GameState.js currently holds state in a plain JS object. Adding save/load with DataManager pattern (localStorage + defaults merge) is the next natural step for persistence.

**Integration priority: MEDIUM** — needed before adding save slots.

---

## 7. React + Zustand Confirmation (pokemon-react-phaser)

**Source:** `../pokemon-react-phaser/src/`

**Key takeaway:** This repo uses the **exact same architecture as ArtLife**: Phaser 3 + React + Zustand + Vite + GridEngine + TypeScript.

Notable patterns:
- `useUIStore` (Zustand) — controls which UI panels are visible (battle menu, inventory, etc.). Same approach as ArtLife's dialogue store.
- `useUserDataStore` (Zustand) — persists player data. Equivalent to our GameState but with Zustand persistence middleware.
- `WorldScene.ts` + `BattleScene.ts` — Phaser scenes that dispatch Zustand actions (`useUIStore.getState().openBattleMenu()`). Same pattern we use in MacDialogueScene.
- TypeScript interfaces for all Phaser data objects — optional upgrade path for ArtLife.

**Validation:** ArtLife's React-Zustand-Phaser bridge architecture is confirmed correct by this production-level reference. The only missing piece is Zustand `persist` middleware for save data.

---

## Integration Roadmap (Recommended Order)

| Priority | Item | Effort | Blocking? |
|----------|------|--------|-----------|
| 1 | `Controls.js` — null-safe keyboard, `lockInput` | 1 day | Fixes input double-trigger bugs |
| 2 | `StateMachine.js` — for HaggleScene phases | 1 day | Fixes phase state corruption risk |
| 3 | `BaseScene.js` — shared lifecycle, RESUME/SHUTDOWN | 2 days | Fixes listener leaks |
| 4 | `SceneTransition.js` — iris wipe between scenes | 0.5 day | Polish |
| 5 | `SCENE_KEYS` / `ASSET_KEYS` constants | 0.5 day | Refactor safety |
| 6 | DataManager / Zustand persist — save slots | 2 days | Save system |

---

## Current ArtLife Test Status (2026-02-20)

- `test_game.cjs`: **23/23** unit tests passing
- `test_flow.cjs`: **42/42** scene flow checks passing
- Zero JS errors, zero scene errors, zero missing assets in global error audit
- GitHub: `https://github.com/sabi-c/ArtLife-Game.git` (branch: `main`)
- Cloudflare: connect repo in dashboard → build: `npm run build` → output: `dist`
