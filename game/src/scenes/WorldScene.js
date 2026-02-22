import Phaser from 'phaser';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super('WorldScene');
        this.unsubscribeEventBus = null;
    }

    preload() {
        console.log('[WorldScene] Preloading assets...');

        // Load Map
        this.load.tilemapTiledJSON('pallet_town', '/content/maps/pallet_town.json');

        // Load Tilesets
        this.load.image('world', '/assets/tilesets/world.png');
        this.load.image('world2', '/assets/tilesets/world2.png');
        this.load.image('grounds', '/assets/tilesets/grounds.png');
        this.load.image('grounds2', '/assets/tilesets/grounds2.png');

        // Load Sprite Frames
        this.load.spritesheet('player', '/assets/sprites/player.png', { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        console.log('[WorldScene] Create started.');

        // Verify GridEngine is available
        if (!this.gridEngine) {
            console.error('[WorldScene] GridEngine plugin not found! Ensure it is registered in config.');
            return;
        }

        // 1. Build Map
        this.map = this.make.tilemap({ key: 'pallet_town' });

        const worldTileset = this.map.addTilesetImage('world', 'world');
        const world2Tileset = this.map.addTilesetImage('world2', 'world2');
        const groundsTileset = this.map.addTilesetImage('grounds', 'grounds');
        const grounds2Tileset = this.map.addTilesetImage('grounds2', 'grounds2');

        const allSets = [worldTileset, world2Tileset, groundsTileset, grounds2Tileset].filter(t => t !== null);

        // 2. Render Layers
        // According to the prototype: Ground, World1, World2, Objects.
        // We'll try to find common names or iterate existing layers.
        const layerNames = this.map.layers.map(layerData => layerData.name);
        console.log('[WorldScene] Available layers in Tilemap:', layerNames);

        layerNames.forEach(layerName => {
            if (layerName !== "Objects") { // Skip object layers for rendering typically
                const layer = this.map.createLayer(layerName, allSets);
                if (layer) layer.setDepth(0);
            }
        });

        // 3. Mount Player Sprite
        this.playerSprite = this.add.sprite(0, 0, 'player');
        this.playerSprite.setOrigin(0.5, 0.5);
        this.playerSprite.setDepth(1);

        // 4. GridEngine Configuration
        const gridEngineConfig = {
            collisionTilePropertyName: "collides",
            characters: [
                {
                    id: "player",
                    sprite: this.playerSprite,
                    walkingAnimationMapping: 0,
                    startPosition: { x: 10, y: 10 }, // Default Pallet Town start payload
                    charLayer: "World 2", // Must match a layer in the map that exists
                    speed: 5,
                },
            ],
        };

        // If 'World2' or 'World 2' isn't exactly right, we will fallback to the top layer
        if (layerNames.includes("World2")) gridEngineConfig.characters[0].charLayer = "World2";
        else if (layerNames.includes("World 2")) gridEngineConfig.characters[0].charLayer = "World 2";
        else gridEngineConfig.characters[0].charLayer = layerNames[layerNames.length - 1];

        console.log(`[WorldScene] Initializing GridEngine on charLayer: ${gridEngineConfig.characters[0].charLayer}`);

        try {
            this.gridEngine.create(this.map, gridEngineConfig);
        } catch (e) {
            console.error('[WorldScene] GridEngine Creation Failed:', e);
        }

        // 5. Camera Follow
        this.cameras.main.startFollow(this.playerSprite, true);
        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels, true);
        this.cameras.main.roundPixels = true;

        // Vignette effect
        const vignette = this.cameras.main.postFX.addVignette();
        vignette.radius = 0.8;

        // Keyboard Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // 6. Mobile Joypad Support via GameEventBus
        // We track virtual joypad state managed by global window variable for simplicity
        window.joypadState = null;

        console.log('[WorldScene] Create complete.');
        GameEventBus.emit(GameEvents.SCENE_READY, 'WorldScene');
    }

    update() {
        if (!this.gridEngine) return;

        // Skip if currently moving
        if (this.gridEngine.isMoving('player')) return;

        // Native keyboard check
        const isUp = this.cursors.up.isDown || this.wasd.up.isDown || window.joypadState === 'UP';
        const isDown = this.cursors.down.isDown || this.wasd.down.isDown || window.joypadState === 'DOWN';
        const isLeft = this.cursors.left.isDown || this.wasd.left.isDown || window.joypadState === 'LEFT';
        const isRight = this.cursors.right.isDown || this.wasd.right.isDown || window.joypadState === 'RIGHT';

        if (isLeft) {
            this.gridEngine.move('player', 'left');
        } else if (isRight) {
            this.gridEngine.move('player', 'right');
        } else if (isUp) {
            this.gridEngine.move('player', 'up');
        } else if (isDown) {
            this.gridEngine.move('player', 'down');
        }
    }

    cleanUp() {
        window.joypadState = null;
        GameEventBus.emit(GameEvents.SCENE_EXIT, 'WorldScene');
    }
}
