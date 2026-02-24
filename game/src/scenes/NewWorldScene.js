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

// ─── Manual animation fallback definitions ──────────────────────────────────
// Only used if Aseprite auto-parse doesn't produce the expected anim keys
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

// ─── Asset base URL (captured at import time, before SPA routing changes location) ──
// On localhost:     INITIAL_BASE = 'http://localhost:5175/'
// On GitHub Pages:  INITIAL_BASE = 'https://sabi-c.github.io/ArtLife-Game/'
const INITIAL_BASE = new URL('./', window.location.href).href;

// ─── Tileset name → loaded texture key mapping ─────────────────────────────
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
        this._assetErrors = [];
    }

    // ════════════════════════════════════════════════════
    // Preload
    // ════════════════════════════════════════════════════
    preload() {
        console.log('[NewWorldScene] preload()');
        this._assetErrors = [];

        // Use URL captured at module import time (before SPA routing changed it)
        this.load.setBaseURL(INITIAL_BASE);
        console.log('[NewWorldScene] Loader baseURL:', INITIAL_BASE);

        this.load.on('loaderror', (file) => {
            const msg = `Asset FAILED: ${file.key} (${file.url})`;
            console.error(`[NewWorldScene] ${msg}`);
            this._assetErrors.push(msg);
        });

        // Tilemap JSON
        this.load.tilemapTiledJSON('larus', 'assets/luminus/larus.json');

        // Tileset images (non-extruded, matching larus.json margin=0/spacing=0)
        this.load.image('lum_overworld', 'assets/luminus/overworld.png');
        this.load.image('lum_inner', 'assets/luminus/inner.png');
        this.load.image('lum_collision', 'assets/luminus/collision.png');

        // Character sprite — Aseprite atlas format (textures[] wrapper, NOT flat frames{})
        this.load.aseprite('character', 'assets/luminus/character.png', 'assets/luminus/character.json');

        // Warp particle
        this.load.image('particle_warp', 'assets/luminus/particle_warp.png');

        // NPC interaction marker
        this.load.image('question_mark', 'assets/luminus/question_mark.png');

        this.load.on('complete', () => {
            console.log('[NewWorldScene] All assets loaded.');
            if (this._assetErrors.length) {
                console.warn('[NewWorldScene] Failed assets:', this._assetErrors);
            }
        });
    }

    // ════════════════════════════════════════════════════
    // Create
    // ════════════════════════════════════════════════════
    create() {
        console.log('[NewWorldScene] create()');
        this._createFailed = false;

        // Bail early if critical assets failed to load
        if (this._assetErrors.length > 0) {
            this._createFailed = true;
            this._showError('Asset loading failed:\n' + this._assetErrors.join('\n'));
            return;
        }

        try {
            this._createMap();
            this._createAnims();
            this._createPlayer();
            this._createWarps();
            this._createCamera();
            this._createControls();
            this._createHUD();
            console.log('[NewWorldScene] ✓ All systems initialized');

            // Tell App.jsx to show MobileJoypad on touch devices
            GameEventBus.emit(GameEvents.SCENE_READY, 'NewWorldScene');
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
            const ts = this.map.addTilesetImage(tiledName, textureKey);
            if (!ts) {
                console.warn(`[NewWorldScene] Tileset "${tiledName}" → "${textureKey}" failed to register`);
            }
        }

        // Create all tile layers, respecting Tiled properties for depth and collision
        let layersCreated = 0;
        for (const layerData of this.map.layers) {
            const layer = this.map.createLayer(layerData.name, this.map.tilesets);
            if (!layer) {
                console.warn(`[NewWorldScene] Layer "${layerData.name}" failed to create`);
                continue;
            }
            layersCreated++;

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

        console.log(`[NewWorldScene] Map: ${this.map.widthInPixels}x${this.map.heightInPixels}, ${layersCreated} layers`);
    }

    // ════════════════════════════════════════════════════
    // Animations
    // ════════════════════════════════════════════════════
    _createAnims() {
        // Try Aseprite auto-parse first (reads frame tags from the JSON)
        try {
            const created = this.anims.createFromAseprite('character');
            console.log(`[NewWorldScene] Aseprite auto-created ${created.length} animations`);
        } catch (e) {
            console.warn('[NewWorldScene] createFromAseprite failed:', e.message);
        }

        // Check for expected animation keys — create manually if missing
        const expected = [
            'character-walk-down', 'character-walk-up', 'character-walk-left', 'character-walk-right',
            'character-idle-down', 'character-idle-up', 'character-idle-left', 'character-idle-right',
        ];
        const missing = expected.filter(k => !this.anims.exists(k));

        if (missing.length > 0) {
            console.log('[NewWorldScene] Missing anims:', missing, '— creating manually from frame names');
            for (const anim of PLAYER_ANIMS) {
                if (this.anims.exists(anim.key)) continue;
                const frames = this.anims.generateFrameNames('character', {
                    prefix: anim.prefix,
                    start: anim.start,
                    end: anim.end,
                    zeroPad: 2,
                });
                if (frames.length === 0) {
                    console.warn(`[NewWorldScene] ⚠ 0 frames for "${anim.key}" (prefix: "${anim.prefix}")`);
                    continue; // Skip — don't create empty animation (that causes the duration crash)
                }
                this.anims.create({
                    key: anim.key,
                    frames,
                    frameRate: 8,
                    repeat: -1,
                });
            }
        }

        // Log all available animations for debugging
        const allAnims = [];
        this.anims.anims.each(a => allAnims.push(a.key));
        console.log(`[NewWorldScene] Available animations (${allAnims.length}):`, allAnims.slice(0, 20));
    }

    // ════════════════════════════════════════════════════
    // Player
    // ════════════════════════════════════════════════════
    _createPlayer() {
        // Verify character texture loaded
        if (!this.textures.exists('character')) {
            throw new Error('Character texture not loaded — check assets/luminus/character.png + .json');
        }

        // Find spawn point from Tiled object layer
        const spawnPoint = this.map.findObject('spawn', obj => obj.name === 'Spawn Point');
        const x = spawnPoint ? spawnPoint.x : 400;
        const y = spawnPoint ? spawnPoint.y : 400;

        this.player = this.physics.add.sprite(x, y, 'character');
        this.player.setDepth(DEPTH.PLAYER);
        this.player.body.setSize(12, 8);
        this.player.body.offset.y = this.player.height / 1.8;
        this.player.setCollideWorldBounds(true);

        // Play idle animation — use first available
        const idleKey = 'character-idle-down';
        if (this.anims.exists(idleKey)) {
            this.player.play(idleKey);
        } else {
            // Fallback: play any available character animation
            const allAnims = [];
            this.anims.anims.each(a => allAnims.push(a.key));
            const fallback = allAnims.find(k => k.includes('character') || k.includes('idle'));
            if (fallback) {
                this.player.play(fallback);
                console.warn(`[NewWorldScene] Using fallback animation: ${fallback}`);
            } else {
                console.warn('[NewWorldScene] No animations available — player will be static');
            }
        }

        // Set world bounds to map size
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // Collision with tilemap
        if (this.collisionLayer) {
            this.physics.add.collider(this.player, this.collisionLayer);
        }

        console.log(`[NewWorldScene] Player spawned at (${x}, ${y})`);
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
                    console.log('[NewWorldScene] Warp to scene:', sceneTarget);
                    GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, sceneTarget);
                } else if (gotoId) {
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

        console.log(`[NewWorldScene] Created ${warpSources.length} warps, ${destinations.length} destinations`);
    }

    // ════════════════════════════════════════════════════
    // Camera
    // ════════════════════════════════════════════════════
    _createCamera() {
        // Detect mobile/touch device
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Mobile: wider view (lower zoom) since joypad takes up screen space
        const zoom = isMobile ? 2.0 : 2.5;
        this.cameras.main.setZoom(zoom);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.setBackgroundColor('#2d6b30');

        // Mobile: offset camera follow upward so player stays above joypad
        // Joypad covers ~46vh of the screen from the bottom.
        // Negative Y = player rendered in upper portion of screen, above d-pad.
        if (isMobile) {
            const viewportH = this.scale.height / zoom;
            const offsetY = -(viewportH * 0.22); // shift player 22% UP from center
            this.cameras.main.setFollowOffset(0, offsetY);
            console.log(`[NewWorldScene] Mobile camera: zoom=${zoom}, followOffset Y=${offsetY.toFixed(0)}`);
        }
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

        // Sprint: B button (mobile) doubles speed
        const baseSpeed = 80;
        const speed = window.joypadSprint ? baseSpeed * 2 : baseSpeed;
        const body = this.player.body;
        body.setVelocity(0);

        // Read both keyboard AND mobile joypad input
        const joypad = window.joypadState; // 'UP'|'DOWN'|'LEFT'|'RIGHT'|null
        const left = this.cursors.left.isDown || this.wasd.left.isDown || joypad === 'LEFT';
        const right = this.cursors.right.isDown || this.wasd.right.isDown || joypad === 'RIGHT';
        const up = this.cursors.up.isDown || this.wasd.up.isDown || joypad === 'UP';
        const down = this.cursors.down.isDown || this.wasd.down.isDown || joypad === 'DOWN';

        // Helper: safely play animation
        const tryPlay = (key) => {
            if (this.anims.exists(key)) {
                this.player.play(key, true);
            }
        };

        // Horizontal
        if (left) {
            body.setVelocityX(-speed);
            tryPlay('character-walk-left');
            this.direction = 'left';
        } else if (right) {
            body.setVelocityX(speed);
            tryPlay('character-walk-right');
            this.direction = 'right';
        }

        // Vertical
        if (up) {
            body.setVelocityY(-speed);
            if (!left && !right) {
                tryPlay('character-walk-up');
                this.direction = 'up';
            }
        } else if (down) {
            body.setVelocityY(speed);
            if (!left && !right) {
                tryPlay('character-walk-down');
                this.direction = 'down';
            }
        }

        // Normalize diagonal speed
        body.velocity.normalize().scale(speed);

        // Idle animation when not moving
        if (body.velocity.x === 0 && body.velocity.y === 0) {
            tryPlay(`character-idle-${this.direction}`);
        }
    }

    // ════════════════════════════════════════════════════
    // Exit
    // ════════════════════════════════════════════════════
    exitScene() {
        console.log('[NewWorldScene] exitScene()');
        // Hide MobileJoypad
        GameEventBus.emit(GameEvents.SCENE_EXIT, 'NewWorldScene');
        // Clean up joypad state
        window.joypadState = null;
        window.joypadSprint = false;
        try {
            this.scene.stop();
        } catch (e) { /* ignore */ }
        GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.DASHBOARD);
    }

    /**
     * Phaser lifecycle — called when the scene is stopped.
     * Clean up event listeners and global state.
     */
    shutdown() {
        window.joypadState = null;
        window.joypadSprint = false;
        GameEventBus.emit(GameEvents.SCENE_EXIT, 'NewWorldScene');
    }

    // ════════════════════════════════════════════════════
    // Error display
    // ════════════════════════════════════════════════════
    _showError(msg) {
        // Also report to global error log for headless debugging
        window.__artlife_errors = window.__artlife_errors || [];
        window.__artlife_errors.push({ scene: 'NewWorldScene', error: msg, time: new Date().toISOString() });

        const { width, height } = this.scale;
        this.add.text(width / 2, height / 2 - 30, 'NewWorldScene Error', {
            fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ff4444',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD);

        this.add.text(width / 2, height / 2 + 10, msg, {
            fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa',
            wordWrap: { width: width - 60 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD);

        const btn = this.add.text(width / 2, height / 2 + 70, '[ EXIT ]', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ff8888',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => this.exitScene());

        this.input.keyboard.on('keydown-ESC', () => this.exitScene());
    }
}
