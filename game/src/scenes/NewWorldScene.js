/**
 * NewWorldScene.js — Overworld scene built on luminus-rpg patterns
 *
 * Replaces the old GridEngine-based WorldScene with arcade physics,
 * auto-layer tilemap creation, and a warp/portal system.
 *
 * Based on: github.com/SkyAlpha/luminus-rpg (MIT License)
 * Adapted for ArtLife's React + Phaser architecture.
 */
import Phaser from 'phaser';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { VIEW } from '../constants/views.js';

// ─── Depth constants ────────────────────────────────────────────────────────
const DEPTH = {
    WORLD: 0,
    PLAYER: 10,
    ABOVE_PLAYER: 99,
    HUD: 200,
};

// ─── Animation definitions for the character atlas ─────────────────────────
const PLAYER_ANIMS = [
    { key: 'character-walk-down', prefix: 'walk-down/character-down', start: 0, end: 3 },
    { key: 'character-walk-up', prefix: 'walk-up/character-up', start: 0, end: 3 },
    { key: 'character-walk-left', prefix: 'walk-left/character-left', start: 0, end: 3 },
    { key: 'character-walk-right', prefix: 'walk-right/character-right', start: 0, end: 3 },
    { key: 'character-idle-down', prefix: 'idle-down/idle-down', start: 0, end: 0 },
    { key: 'character-idle-up', prefix: 'idle-up/idle-up', start: 0, end: 0 },
    { key: 'character-idle-left', prefix: 'idle-left/idle-left', start: 0, end: 0 },
    { key: 'character-idle-right', prefix: 'idle-right/idle-right', start: 0, end: 0 },
];

// ─── Tileset name → loaded texture key mapping ─────────────────────────────
// The names in Tiled (larus.json) map to our preloaded texture keys
const TILESET_MAP = [
    { tiledName: 'base', textureKey: 'lum_overworld' },
    { tiledName: 'inner', textureKey: 'lum_inner' },
    { tiledName: 'collision', textureKey: 'lum_collision' },
];

export default class NewWorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'NewWorldScene' });
        this.player = null;
        this.cursors = null;
        this.collisionLayer = null;
        this.warpZones = [];
        this.direction = 'down';
        this._createFailed = false;
    }

    // ════════════════════════════════════════════════════
    // Preload
    // ════════════════════════════════════════════════════
    preload() {
        console.log('[NewWorldScene] preload()');

        this.load.on('loaderror', (file) => {
            console.error(`[NewWorldScene] Asset FAILED: ${file.key} (${file.url})`);
        });

        // Tilemap JSON
        this.load.tilemapTiledJSON('larus', 'assets/luminus/larus.json');

        // Tileset images (extruded versions for anti-bleed)
        this.load.image('lum_overworld', 'assets/luminus/overworld.png');
        this.load.image('lum_inner', 'assets/luminus/inner.png');
        this.load.image('lum_collision', 'assets/luminus/collision.png');

        // Character atlas (sprite sheet + JSON)
        this.load.atlas('character', 'assets/luminus/character.png', 'assets/luminus/character.json');

        // Warp particle
        this.load.image('particle_warp', 'assets/luminus/particle_warp.png');

        // NPC interaction marker
        this.load.image('question_mark', 'assets/luminus/question_mark.png');

        this.load.on('complete', () => {
            console.log('[NewWorldScene] All assets loaded');
        });
    }

    // ════════════════════════════════════════════════════
    // Create
    // ════════════════════════════════════════════════════
    create() {
        console.log('[NewWorldScene] create()');
        this._createFailed = false;

        try {
            this._createMap();
            this._createAnims();
            this._createPlayer();
            this._createWarps();
            this._createCamera();
            this._createControls();
            this._createHUD();
        } catch (err) {
            console.error('[NewWorldScene] create() error:', err);
            this._createFailed = true;
            this._showError(err.message);
        }
    }

    // ════════════════════════════════════════════════════
    // Map Creation (adapted from LuminusMapCreator)
    // ════════════════════════════════════════════════════
    _createMap() {
        this.map = this.make.tilemap({ key: 'larus' });

        // Register tilesets
        for (const { tiledName, textureKey } of TILESET_MAP) {
            this.map.addTilesetImage(tiledName, textureKey);
        }

        // Create all tile layers, respecting Tiled properties for depth and collision
        for (const layerData of this.map.layers) {
            const layer = this.map.createLayer(layerData.name, this.map.tilesets);
            if (!layer) continue;

            // Read custom properties from Tiled
            const props = {};
            for (const p of layerData.properties || []) {
                props[p.name] = p.value;
            }

            // Apply depth from Tiled property
            if (props.depth !== undefined) {
                layer.setDepth(props.depth);
            }

            // Collision layer (invisible but active)
            if (props.collides) {
                layer.setCollisionByProperty({ collides: true });
                layer.setAlpha(0); // hide collision tiles
                this.collisionLayer = layer;
            }
        }

        console.log('[NewWorldScene] Map created:', this.map.widthInPixels, 'x', this.map.heightInPixels);
    }

    // ════════════════════════════════════════════════════
    // Animations
    // ════════════════════════════════════════════════════
    _createAnims() {
        for (const anim of PLAYER_ANIMS) {
            if (!this.anims.exists(anim.key)) {
                this.anims.create({
                    key: anim.key,
                    frames: this.anims.generateFrameNames('character', {
                        prefix: anim.prefix,
                        start: anim.start,
                        end: anim.end,
                        zeroPad: 2,
                    }),
                    frameRate: 8,
                    repeat: -1,
                });
            }
        }
    }

    // ════════════════════════════════════════════════════
    // Player
    // ════════════════════════════════════════════════════
    _createPlayer() {
        // Find spawn point from Tiled object layer
        const spawnPoint = this.map.findObject('spawn', obj => obj.name === 'Spawn Point');
        const x = spawnPoint ? spawnPoint.x : 400;
        const y = spawnPoint ? spawnPoint.y : 400;

        this.player = this.physics.add.sprite(x, y, 'character');
        this.player.setDepth(DEPTH.PLAYER);
        this.player.body.setSize(12, 8);
        this.player.body.offset.y = this.player.height / 1.8;
        this.player.setCollideWorldBounds(true);

        this.player.play('character-idle-down');

        // Set world bounds to map size
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // Collision with tilemap
        if (this.collisionLayer) {
            this.physics.add.collider(this.player, this.collisionLayer);
        }

        console.log('[NewWorldScene] Player spawned at', x, y);
    }

    // ════════════════════════════════════════════════════
    // Warps / Portals (adapted from LuminusWarp)
    // ════════════════════════════════════════════════════
    _createWarps() {
        const warpsLayer = this.map.getObjectLayer('warps');
        if (!warpsLayer) {
            console.log('[NewWorldScene] No warps layer found');
            return;
        }

        const allObjects = warpsLayer.objects;
        const warpSources = allObjects.filter(o => o.properties && o.properties.length > 0);
        const destinations = allObjects.filter(o => !o.properties || o.properties.length === 0);

        for (const warp of warpSources) {
            const zone = this.add.zone(warp.x, warp.y, warp.width, warp.height);
            zone.setOrigin(0, 0);
            this.physics.add.existing(zone);
            zone.body.immovable = true;

            // Parse warp properties
            const props = {};
            for (const p of warp.properties) {
                props[p.name] = p.value;
            }

            // Collision → teleport
            this.physics.add.collider(zone, this.player, () => {
                const sceneTarget = props.scene;
                const gotoId = props.goto;

                if (sceneTarget) {
                    // Scene transition → emit event for ArtLife system
                    console.log('[NewWorldScene] Warp to scene:', sceneTarget);
                    GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, sceneTarget);
                } else if (gotoId) {
                    // Same-map teleport
                    const dest = destinations.find(d => d.id === gotoId);
                    if (dest) {
                        this.cameras.main.fade(500, 0, 0, 0);
                        this.time.delayedCall(500, () => {
                            this.player.setPosition(dest.x, dest.y);
                            this.cameras.main.fadeIn(500);
                        });
                    }
                }
            });
        }

        console.log('[NewWorldScene] Created', warpSources.length, 'warps');
    }

    // ════════════════════════════════════════════════════
    // Camera
    // ════════════════════════════════════════════════════
    _createCamera() {
        this.cameras.main.setZoom(2.5);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.setBackgroundColor('#2d6b30');
    }

    // ════════════════════════════════════════════════════
    // Controls
    // ════════════════════════════════════════════════════
    _createControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });

        // ESC → exit to dashboard
        this.input.keyboard.on('keydown-ESC', () => {
            this.exitScene();
        });
    }

    // ════════════════════════════════════════════════════
    // HUD
    // ════════════════════════════════════════════════════
    _createHUD() {
        const { width, height } = this.scale;
        this.exitBtn = this.add.text(16, 16, '← ESC', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 6, y: 4 },
        })
            .setScrollFactor(0)
            .setDepth(DEPTH.HUD)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.exitScene());
    }

    // ════════════════════════════════════════════════════
    // Update — 8-directional movement
    // ════════════════════════════════════════════════════
    update() {
        if (this._createFailed || !this.player || !this.player.body) return;

        const speed = 80;
        const body = this.player.body;
        body.setVelocity(0);

        const left = this.cursors.left.isDown || this.wasd.left.isDown;
        const right = this.cursors.right.isDown || this.wasd.right.isDown;
        const up = this.cursors.up.isDown || this.wasd.up.isDown;
        const down = this.cursors.down.isDown || this.wasd.down.isDown;

        // Horizontal
        if (left) {
            body.setVelocityX(-speed);
            this.player.play('character-walk-left', true);
            this.direction = 'left';
        } else if (right) {
            body.setVelocityX(speed);
            this.player.play('character-walk-right', true);
            this.direction = 'right';
        }

        // Vertical
        if (up) {
            body.setVelocityY(-speed);
            if (!left && !right) {
                this.player.play('character-walk-up', true);
                this.direction = 'up';
            }
        } else if (down) {
            body.setVelocityY(speed);
            if (!left && !right) {
                this.player.play('character-walk-down', true);
                this.direction = 'down';
            }
        }

        // Normalize diagonal speed
        body.velocity.normalize().scale(speed);

        // Idle animation when not moving
        if (body.velocity.x === 0 && body.velocity.y === 0) {
            this.player.play(`character-idle-${this.direction}`, true);
        }
    }

    // ════════════════════════════════════════════════════
    // Exit
    // ════════════════════════════════════════════════════
    exitScene() {
        console.log('[NewWorldScene] exitScene()');
        try {
            this.scene.stop();
        } catch (e) { /* ignore */ }
        GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.DASHBOARD);
    }

    // ════════════════════════════════════════════════════
    // Error display
    // ════════════════════════════════════════════════════
    _showError(msg) {
        const { width, height } = this.scale;
        this.add.text(width / 2, height / 2 - 20, 'NewWorldScene Error', {
            fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ff4444',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD);
        this.add.text(width / 2, height / 2 + 10, msg, {
            fontFamily: 'monospace', fontSize: '12px', color: '#aaaaaa',
            wordWrap: { width: width - 60 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD);

        const btn = this.add.text(width / 2, height / 2 + 60, '[ EXIT ]', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ff8888',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => this.exitScene());

        this.input.keyboard.on('keydown-ESC', () => this.exitScene());
    }
}
