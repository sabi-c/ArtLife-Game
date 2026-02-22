# ArtLife — Sprite GridEngine (Pokemon-Style) Integration Plan

## Executive Summary
This document provides a highly technical, copy-paste ready blueprint for porting the `pokemon-react-phaser` prototype into the main ArtLife repository. The goal is to establish a robust, admin-accessible Grid Walking Sandbox equipped with mobile touch controls, proving our spatial-roleplaying capability within the React+Phaser+Zustand architecture.

---

## Phase 1: Explicit Asset Migration
We will directly copy the required map and rendering assets from `_Archive/Prototypes/pokemon-react-phaser/public/assets/` into our live `game/public/content/` and `game/public/assets/` directories.

### 1. Tilemap JSONs
Copy the following Tiled exports to `game/public/content/maps/`:
- `pallet_town.json`

### 2. Environment Tilesets
Copy the following files from `images/tilesets/` to `game/public/assets/tilesets/`:
- `world.png`
- `world2.png`
- `grounds.png`
- `grounds2.png`

### 3. Character Sprites
Copy the following files from `images/characters/` to `game/public/assets/sprites/`:
- `player.png`
- `bicycle.png`
- `FRLG Peds1.png` (and other NPC variations as needed)

---

## Phase 2: The `WorldScene.js` Port
We will port the typescript `WorldScene.ts` into a vanilla ES6 Phaser class (`game/src/scenes/WorldScene.js`).

### 1. Scene Initialization & Preloading
```javascript
import Phaser from "phaser";

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super("WorldScene");
    }

    preload() {
        // Load Maps
        this.load.tilemapTiledJSON("pallet_town", "/content/maps/pallet_town.json");
        
        // Load Tilesets
        this.load.image("world", "/assets/tilesets/world.png");
        this.load.image("world2", "/assets/tilesets/world2.png");
        
        // Load Sprite Frames (Assuming standard 32x32 character sprites)
        this.load.spritesheet("player", "/assets/sprites/player.png", { frameWidth: 32, frameHeight: 32 });
    }
}
```

### 2. Tilemap Assembly & Character Mounting
```javascript
create() {
    // 1. Build Map
    this.map = this.make.tilemap({ key: "pallet_town" });
    const tilesetA = this.map.addTilesetImage("world", "world");
    const tilesetB = this.map.addTilesetImage("world2", "world2");
    
    // 2. Render Layers
    this.map.createLayer("Ground", [tilesetA, tilesetB]);
    this.map.createLayer("World1", [tilesetA, tilesetB]);
    this.map.createLayer("World2", [tilesetA, tilesetB]);

    // 3. Mount Player Sprite
    this.playerSprite = this.add.sprite(0, 0, "player");
    this.playerSprite.setOrigin(0.5, 0.5);
    this.playerSprite.setDepth(1);
}
```

### 3. GridEngine Configuration
We must formally initialize the `GridEngine` plugin, binding it to the generated Tilemap and our newly mounted player sprite.

```javascript
// Still inside create()
const gridEngineConfig = {
    collisionTilePropertyName: "collides",
    characters: [
        {
            id: "player",
            sprite: this.playerSprite,
            walkingAnimationMapping: 0,
            startPosition: { x: 10, y: 10 }, // Default Pallet Town start payload
            charLayer: "World2",
            speed: 5,
        },
    ],
};

this.gridEngine.create(this.map, gridEngineConfig);

// 4. Camera Follow
this.cameras.main.startFollow(this.playerSprite, true);
this.cameras.main.setZoom(1);
this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels, true);
```

### 4. GameEventBus Keyboard & Mobile Listening
Rather than using `this.input.keyboard.createCursorKeys()`, `WorldScene.js` must listen to the global `GameEventBus` so React UI commands (from the Mobile Joypad) work identically to native keyboard presses.

```javascript
update() {
    // This will be handled by the bus and WASD, but native cursors remain as a fallback:
    const cursors = this.input.keyboard.createCursorKeys();
    
    if (cursors.left.isDown || window.joypadState === 'LEFT') {
        this.gridEngine.move("player", "left");
    } else if (cursors.right.isDown || window.joypadState === 'RIGHT') {
        this.gridEngine.move("player", "right");
    } else if (cursors.up.isDown || window.joypadState === 'UP') {
        this.gridEngine.move("player", "up");
    } else if (cursors.down.isDown || window.joypadState === 'DOWN') {
        this.gridEngine.move("player", "down");
    }
}
```

---

## Phase 3: The React UI & Mobile Overlay
A game without mobile support isn't shippable. We will build a React overlay that floats above the canvas, dispatching hardware-agnostic events to the Phaser engine.

### 1. `MobileJoypad.jsx`
Create `game/src/ui/MobileJoypad.jsx`. This component renders a classic D-Pad and an 'A' Interact button, mapping to the bottom corners of the screen.

```jsx
import React from 'react';

// Using simulated window state or Zustand boolean flags to track hold logic
export function MobileJoypad() {
    const handleDown = (dir) => { window.joypadState = dir; };
    const handleUp = () => { window.joypadState = null; };

    return (
        <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 100 }}>
            <button onPointerDown={() => handleDown('UP')} onPointerUp={handleUp}>W</button>
            <div>
                 <button onPointerDown={() => handleDown('LEFT')} onPointerUp={handleUp}>A</button>
                 <button onPointerDown={() => handleDown('DOWN')} onPointerUp={handleUp}>S</button>
                 <button onPointerDown={() => handleDown('RIGHT')} onPointerUp={handleUp}>D</button>
            </div>
        </div>
    );
}
```

### 2. The Dev-Teardown Escaper
Place a prominent React `[X] Exit Simulation` button docked at the top right of the screen. Clicking this fires our global teardown hook:
```jsx
<button onClick={() => window.game.exitScene()}>Exit Simulation</button>
```

---

## Phase 4: Admin Integration & Routing Loop
The game loop must securely launch and destroy this test environment.

1. **Admin Dashboard Button:** Inside `AdminDashboard.jsx`, under the "PHASER SCENES" tab, add `[ Mount GridEngine Prototype (Pokemon) ]`.
2. **Mount Execution:** This button fires `window.game.startTestScene('WorldScene')`.
3. **App.jsx Enumeration:** Update `App.jsx` so that when `activeView === OVERLAY.PHASER_ONLY`, it also mounts `<MobileJoypad />` on top.
4. **Exit Execution:** Clicking "Exit" natively unmounts `MobileJoypad`, destroys the `WorldScene` Phaser instance, and reloads `dashboardScreen()` into the Terminal view.

---

## Future Horizon: The Object Interaction Loop
Once movement is perfect, we will bind GridEngine's `positionChangeFinished` and interaction raycasting.

When the player stops facing an NPC and presses "Enter" (or the UI 'A' button interact):
1. `WorldScene.js` identifies the Tile Object immediately in front of the avatar.
2. `WorldScene.js` extracts that object's `eventID` properties.
3. `WorldScene.js` emits the payload to Zustand: `useGameStore.getState().triggerWorldInteraction(eventID)`.
4. React overlays the standard `DialogueBox.jsx` on top of the world grid, allowing Pokemon-style 1-on-1 conversations anywhere in the map.
