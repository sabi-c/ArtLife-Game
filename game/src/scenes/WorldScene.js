/**
 * WorldScene — Pokemon-style overworld with GridEngine tile movement.
 *
 * Loads the pallet_town Tiled map, renders tileset layers with proper depth,
 * and uses GridEngine for grid-based 4-directional movement.
 *
 * Supports keyboard (WASD/arrows) and mobile joypad (window.joypadState).
 */

import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { WebAudioService } from '../managers/WebAudioService.js';

// Layer depth ordering — below_player layers sit behind the sprite,
// world layers are at player level, above_player renders on top.
const LAYER_DEPTHS = {
    below_player: 0,
    below_player2: 1,
    world: 2,
    world2: 3,
    above_player: 5,  // above player sprite (depth 4)
};

export default class WorldScene extends BaseScene {
    constructor() {
        super({ key: 'WorldScene' });
    }

    preload() {
        // Tiled JSON map
        if (!this.textures.exists('pallet_town_map')) {
            this.load.tilemapTiledJSON('pallet_town', '/content/maps/pallet_town.json');
        }

        // Tilesets (names must match Tiled tileset names exactly)
        if (!this.textures.exists('world')) this.load.image('world', '/assets/tilesets/world.png');
        if (!this.textures.exists('world2')) this.load.image('world2', '/assets/tilesets/world2.png');
        if (!this.textures.exists('grounds')) this.load.image('grounds', '/assets/tilesets/grounds.png');
        if (!this.textures.exists('grounds2')) this.load.image('grounds2', '/assets/tilesets/grounds2.png');

        // Player spritesheet — 216x384 image, 3 cols x 4 rows = 12 frames at 72x96 each
        if (!this.textures.exists('world_player')) {
            this.load.spritesheet('world_player', '/assets/sprites/player.png', {
                frameWidth: 72,
                frameHeight: 96,
            });
        }
    }

    create(data) {
        super.create({ ...data, hideUI: true });

        const { width, height } = this.scale;

        // Opaque background — prevents body theme bleed-through
        this.add.rectangle(width / 2, height / 2, width, height, 0x2d6b30).setDepth(-1).setScrollFactor(0);

        // Verify GridEngine plugin
        if (!this.gridEngine) {
            console.error('[WorldScene] GridEngine plugin not found!');
            this._showError('GridEngine plugin not available');
            return;
        }

        try {
            this._buildScene();
        } catch (err) {
            console.error('[WorldScene] create() error:', err);
            window.ArtLife?.recordSceneError?.('WorldScene', err);
            this._showError(err.message);
        }
    }

    _buildScene() {
        // ── Build tilemap ──
        this.map = this.make.tilemap({ key: 'pallet_town' });

        // Add tilesets — first arg must match the tileset name in Tiled
        const grounds = this.map.addTilesetImage('grounds', 'grounds');
        const world = this.map.addTilesetImage('world', 'world');
        const world2 = this.map.addTilesetImage('world2', 'world2');
        const grounds2 = this.map.addTilesetImage('grounds2', 'grounds2');
        const allSets = [grounds, world, world2, grounds2].filter(Boolean);

        if (allSets.length === 0) {
            throw new Error('No tilesets loaded — check tileset names match Tiled export');
        }

        // ── Render tile layers with proper depth ordering ──
        const renderedLayers = [];
        for (const layerData of this.map.layers) {
            const name = layerData.name;
            if (name === 'objects') continue; // object layer, not renderable
            const layer = this.map.createLayer(name, allSets);
            if (layer) {
                layer.setDepth(LAYER_DEPTHS[name] ?? 2);
                renderedLayers.push(name);
            }
        }
        console.log('[WorldScene] Rendered layers:', renderedLayers);

        // ── Find spawn point from Tiled objects ──
        let spawnX = 5, spawnY = 16; // fallback
        const objectLayer = this.map.getObjectLayer('objects');
        if (objectLayer) {
            const spawn = objectLayer.objects.find(o => o.name === 'spawn' || o.type === 'spawn');
            if (spawn) {
                // Tiled object positions are in pixels — convert to tile coords
                spawnX = Math.floor(spawn.x / this.map.tileWidth);
                spawnY = Math.floor(spawn.y / this.map.tileHeight);
                console.log('[WorldScene] Spawn from map:', spawnX, spawnY);
            }
        }

        // ── Player sprite ──
        this.playerSprite = this.add.sprite(0, 0, 'world_player');
        this.playerSprite.setOrigin(0.5, 0.75); // feet near tile center
        this.playerSprite.setDepth(4); // between world2 (3) and above_player (5)

        // ── GridEngine setup ──
        // Determine the correct charLayer — use "world" layer for collision/movement
        const charLayer = renderedLayers.includes('world') ? 'world' : renderedLayers[renderedLayers.length - 1];

        this.gridEngine.create(this.map, {
            collisionTilePropertyName: 'collides',
            characters: [{
                id: 'player',
                sprite: this.playerSprite,
                walkingAnimationMapping: 0,
                startPosition: { x: spawnX, y: spawnY },
                charLayer,
                speed: 4,
            }],
        });

        console.log(`[WorldScene] GridEngine initialized — charLayer: ${charLayer}, spawn: (${spawnX}, ${spawnY})`);

        // ── Camera ──
        this.cameras.main.startFollow(this.playerSprite, true);
        this.cameras.main.setZoom(2);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels, true);
        this.cameras.main.roundPixels = true;

        // Subtle vignette
        try {
            const vig = this.cameras.main.postFX.addVignette();
            vig.radius = 0.85;
        } catch (e) { /* postFX may not be available in all renderers */ }

        // ── Input ──
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });

        // ESC to exit
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => this.exitScene());

        // Mobile joypad support
        window.joypadState = null;

        // ── Interaction key (SPACE/E) ──
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.interactKey.on('down', () => this._handleInteraction());

        // ── Notify React overlay ──
        GameEventBus.emit(GameEvents.SCENE_READY, 'WorldScene');
        console.log('[WorldScene] Ready.');
    }

    update() {
        if (!this.gridEngine) return;
        if (this.gridEngine.isMoving('player')) return;

        const up = this.cursors?.up.isDown || this.wasd?.up.isDown || window.joypadState === 'UP';
        const down = this.cursors?.down.isDown || this.wasd?.down.isDown || window.joypadState === 'DOWN';
        const left = this.cursors?.left.isDown || this.wasd?.left.isDown || window.joypadState === 'LEFT';
        const right = this.cursors?.right.isDown || this.wasd?.right.isDown || window.joypadState === 'RIGHT';

        if (left) this.gridEngine.move('player', 'left');
        else if (right) this.gridEngine.move('player', 'right');
        else if (up) this.gridEngine.move('player', 'up');
        else if (down) this.gridEngine.move('player', 'down');
    }

    _handleInteraction() {
        if (!this.gridEngine) return;
        const pos = this.gridEngine.getPosition('player');
        const facing = this.gridEngine.getFacingDirection('player');

        // Calculate the tile we're facing
        const target = { ...pos };
        if (facing === 'left') target.x--;
        else if (facing === 'right') target.x++;
        else if (facing === 'up') target.y--;
        else if (facing === 'down') target.y++;

        // Check for Tiled object interactions (doors, dialogs)
        const objectLayer = this.map?.getObjectLayer('objects');
        if (!objectLayer) return;

        const tileW = this.map.tileWidth;
        const tileH = this.map.tileHeight;

        for (const obj of objectLayer.objects) {
            const objTileX = Math.floor(obj.x / tileW);
            const objTileY = Math.floor(obj.y / tileH);

            if (objTileX === target.x && objTileY === target.y) {
                if (obj.name === 'door' || obj.type === 'door') {
                    const nextMap = obj.properties?.find(p => p.name === 'nextMap')?.value;
                    console.log('[WorldScene] Door interaction → nextMap:', nextMap);
                    WebAudioService.select();
                    // TODO: scene transition to interior
                } else if (obj.name === 'dialog' || obj.type === 'dialog') {
                    const content = obj.properties?.find(p => p.name === 'content')?.value;
                    if (content) {
                        console.log('[WorldScene] Dialog:', content);
                        WebAudioService.select();
                        this._showDialogBubble(content);
                    }
                }
            }
        }
    }

    _showDialogBubble(text) {
        const { width, height } = this.scale;
        const bg = this.add.rectangle(width / 2, height - 60, width - 40, 80, 0x000000, 0.85)
            .setScrollFactor(0).setDepth(100).setStrokeStyle(2, 0xffffff);
        const txt = this.add.text(width / 2, height - 60, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '11px',
            color: '#ffffff',
            wordWrap: { width: width - 80 },
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

        this.time.delayedCall(3000, () => {
            bg.destroy();
            txt.destroy();
        });
    }

    exitScene() {
        window.joypadState = null;
        GameEventBus.emit(GameEvents.SCENE_EXIT, 'WorldScene');
        GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
        this.showTerminalUI();
        this.scene.stop();
    }

    // Called by BaseScene shutdown event
    cleanup() {
        window.joypadState = null;
        GameEventBus.emit(GameEvents.SCENE_EXIT, 'WorldScene');
    }

    _showError(msg) {
        const { width, height } = this.scale;
        this.add.text(width / 2, height / 2 - 20, 'WorldScene Error', {
            fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ff4444',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(999);
        this.add.text(width / 2, height / 2 + 10, msg, {
            fontFamily: 'monospace', fontSize: '12px', color: '#aaaaaa',
            wordWrap: { width: width - 60 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(999);

        // Exit button
        const btn = this.add.text(width / 2, height / 2 + 60, '[ EXIT ]', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ff8888',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(999).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => this.exitScene());
    }
}
