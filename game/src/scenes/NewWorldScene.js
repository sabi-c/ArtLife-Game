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
import { SettingsManager } from '../managers/SettingsManager.js';
import { SpriteRegistry } from '../managers/SpriteRegistry.js';
import { CONTACTS } from '../data/contacts.js';
import { VIEW } from '../core/views.js';

// Dev-only debug logging (silent in production)
const _DEV = import.meta.env?.DEV ?? false;
function _log(...args) { if (_DEV) console.log('[NewWorldScene]', ...args); }

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

// ─── Alternative sprites now managed by SpriteRegistry ──────────────────────

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
        this._activeSpriteKey = 'character'; // current sprite texture key
        this._breathTween = null; // idle breathing tween reference
        this._assetErrors = [];
    }

    // ════════════════════════════════════════════════════
    // Preload
    // ════════════════════════════════════════════════════
    preload() {
        _log('preload()');
        this._assetErrors = [];

        // Use URL captured at module import time (before SPA routing changed it)
        this.load.setBaseURL(INITIAL_BASE);
        _log('baseURL:', INITIAL_BASE);

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

        // Preload configured character or fallback
        const selectedSprite = window.game?.uiState()?.playerSprite || 'character';
        if (selectedSprite === 'character') {
            this.load.aseprite('character', 'assets/luminus/character.png', 'assets/luminus/character.json');
        }
        // ── All NPC + player spritesheets via SpriteRegistry ──
        // The following line is intentionally kept as it was in the original document
        // and the provided snippet indicates it should remain.
        const selectedSpriteFromSettings = SettingsManager.get('playerSprite') || 'character';
        this._activeSpriteKey = selectedSpriteFromSettings;
        SpriteRegistry.preloadAll(this);

        // Warp particle
        this.load.image('particle_warp', 'assets/luminus/particle_warp.png');

        // NPC interaction marker
        this.load.image('question_mark', 'assets/luminus/question_mark.png');

        this.load.on('complete', () => {
            _log('All assets loaded.');
            if (this._assetErrors.length) {
                console.warn('[NewWorldScene] Failed assets:', this._assetErrors);
            }
        });
    }

    // ════════════════════════════════════════════════════
    // Create
    // ════════════════════════════════════════════════════
    create() {
        _log('create()');
        this._createFailed = false;

        // Wire up shutdown/clean up events to prevent memory leaks
        this.events.on('shutdown', this.shutdown, this);
        this.events.on('destroy', this.shutdown, this);

        // Warn about failed assets but continue — missing NPC sprites are non-critical
        if (this._assetErrors.length > 0) {
            console.warn('[NewWorldScene] Some assets failed to load (will skip):', this._assetErrors);
        }

        try {
            // Build contact lookup map for NPC sprite resolution
            this._contactMap = Object.fromEntries(CONTACTS.map(c => [c.id, c]));

            this._createMap();
            this._createAnims();
            this._createPlayer();
            this._createWarps();
            this._createInfoMarkers();
            this._createNPCs();
            this._createCamera();
            this._createControls();
            this._createHUD();
            _log('✓ All systems initialized');

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
        this.collisionLayers = [];
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
                this.collisionLayers.push(layer);
            }
        }

        // Set physics world bounds to match the FULL map
        // (default is canvas size which restricts movement to visible area)
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        _log(`Map: ${this.map.widthInPixels}x${this.map.heightInPixels}, ${layersCreated} layers`);
    }

    // ════════════════════════════════════════════════════
    // Animations
    // ════════════════════════════════════════════════════
    _createAnims() {
        // Try Aseprite auto-parse first (reads frame tags from the JSON)
        try {
            const created = this.anims.createFromAseprite('character');
            _log(`Aseprite auto-created ${created.length} animations`);
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
            _log('Missing anims:', missing, '— creating manually');
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
                    continue;
                }
                this.anims.create({
                    key: anim.key,
                    frames,
                    frameRate: 8,
                    repeat: -1,
                });
            }
        }

        // ── Register animations for all PixelLab spritesheets via SpriteRegistry ──
        SpriteRegistry.createAnims(this);

        // Log all available animations for debugging
        const allAnims = [];
        this.anims.anims.each(a => allAnims.push(a.key));
        _log(`${allAnims.length} animations available`);
    }

    // ════════════════════════════════════════════════════
    // Player
    // ════════════════════════════════════════════════════
    _createPlayer() {
        // Determine which sprite to use
        const spriteKey = this._activeSpriteKey;
        const useAlt = spriteKey !== 'character' && this.textures.exists(spriteKey);
        const textureKey = useAlt ? spriteKey : 'character';

        // Verify texture loaded
        if (!this.textures.exists(textureKey)) {
            throw new Error(`Player texture "${textureKey}" not loaded`);
        }

        // Find spawn point from Tiled object layer
        const spawnPoint = this.map.findObject('spawn', obj => obj.name === 'Spawn Point');
        const x = spawnPoint ? spawnPoint.x : 400;
        const y = spawnPoint ? spawnPoint.y : 400;

        this.player = this.physics.add.sprite(x, y, textureKey);
        this.player.setDepth(DEPTH.PLAYER);

        if (useAlt) {
            // PixelLab sprites are 160×160 — scale down for overworld
            SpriteRegistry.configureForOverworld(this.player, true);
        } else {
            this.player.body.setSize(12, 8);
            this.player.body.offset.y = this.player.height / 1.8;
        }
        this.player.setCollideWorldBounds(true);

        // Play idle animation
        const idleKey = useAlt ? `${spriteKey}-idle-down` : 'character-idle-down';
        if (this.anims.exists(idleKey)) {
            this.player.play(idleKey);
        } else {
            const walkKey = useAlt ? `${spriteKey}-walk-down` : 'character-walk-down';
            if (this.anims.exists(walkKey)) {
                this.player.play(walkKey);
            } else {
                console.warn('[NewWorldScene] No animations available — player will be static');
            }
        }

        // Collision with tilemap
        if (this.collisionLayers?.length) {
            for (const cl of this.collisionLayers) {
                this.physics.add.collider(this.player, cl);
            }
        }

        // Listen for sprite changes from admin settings
        this._settingsHandler = () => this._onPlayerSpriteChanged();
        document.addEventListener('settings-changed', this._settingsHandler);

        _log(`Player spawned at (${x}, ${y}) with sprite: ${textureKey}`);
    }

    /**
     * Hot-swap the player sprite when the admin changes the setting.
     */
    _onPlayerSpriteChanged() {
        const newKey = SettingsManager.get('playerSprite') || 'character';
        if (newKey === this._activeSpriteKey) return;

        this._activeSpriteKey = newKey;
        const useAlt = newKey !== 'character' && this.textures.exists(newKey);
        const textureKey = useAlt ? newKey : 'character';

        if (!this.textures.exists(textureKey)) return;

        // Swap texture
        this.player.setTexture(textureKey);

        if (useAlt) {
            SpriteRegistry.configureForOverworld(this.player, true);
        } else {
            this.player.setScale(1);
            this.player.body.setSize(12, 8);
            this.player.body.offset.y = this.player.height / 1.8;
            this.player.body.offset.x = 0;
        }

        // Play idle in current direction
        const idleKey = useAlt
            ? `${newKey}-idle-${this.direction}`
            : `character-idle-${this.direction}`;
        if (this.anims.exists(idleKey)) {
            this.player.play(idleKey);
        }

        _log(`Hot-swapped player sprite to: ${textureKey}`);
    }

    // ════════════════════════════════════════════════════
    // Warps / Portals (adapted from LuminusWarp)
    // ════════════════════════════════════════════════════
    _createWarps() {
        const warpsLayer = this.map.getObjectLayer('warps');
        if (!warpsLayer) {
            _log('No warps layer found');
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
                // Prevent multiple triggers while transition is happening
                if (this._warping) return;
                this._warping = true;

                const sceneTarget = props.scene;
                const gotoId = props.goto;

                if (sceneTarget) {
                    _log('Warp to scene:', sceneTarget);
                    GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, sceneTarget);
                } else if (gotoId) {
                    const dest = destinations.find(d => d.id === gotoId);
                    if (dest) {
                        this.cameras.main.fade(500, 0, 0, 0);
                        this.time.delayedCall(500, () => {
                            this.player.setPosition(dest.x, dest.y);
                            this.cameras.main.fadeIn(500);
                            this.time.delayedCall(500, () => { this._warping = false; });
                        });
                    } else {
                        this._warping = false; // reset if destination not found
                    }
                } else {
                    this._warping = false; // reset if no target
                }
            });
        }

        _log(`Created ${warpSources.length} warps, ${destinations.length} destinations`);
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

        // Prevent tile bleeding/seam artifacts via sub-pixel rounding
        this.cameras.main.roundPixels = true;

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // IMPORTANT: Phaser config has transparent:true (for other scenes).
        // Override for this scene so the background color actually renders
        this.cameras.main.transparent = false;
        this.cameras.main.setBackgroundColor('#2d6b30');

        // Also set the container background to match, as a fallback
        const gc = document.getElementById('phaser-game-container');
        if (gc) gc.style.background = '#2d6b30';

        // Constrain camera to map bounds to prevent green void at edges
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // Mobile: offset camera follow upward so player stays above joypad
        if (isMobile) {
            const viewportH = this.scale.height / zoom;
            const offsetY = -(viewportH * 0.22); // shift player 22% UP from center
            this.cameras.main.setFollowOffset(0, offsetY);
            _log(`Mobile camera: zoom=${zoom}, offset Y=${offsetY.toFixed(0)}`);
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

        // Action key — Space or Enter → interact with nearby markers/NPCs
        this.input.keyboard.on('keydown-SPACE', () => this._handleAction());
        this.input.keyboard.on('keydown-ENTER', () => this._handleAction());
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
    update(time, delta) {
        if (this._createFailed || !this.player || !this.player.body) return;

        // Freeze movement during dialogue (still allow action key to dismiss)
        if (this._dialogueActive) {
            this.player.body.setVelocity(0);
            // Still check mobile action to dismiss
            if (window.joypadAction) {
                window.joypadAction = false;
                this._handleAction();
            }
            return;
        }

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

        // Resolve animation prefix based on active sprite
        const sk = this._activeSpriteKey;
        const useAlt = sk !== 'character' && this.textures.exists(sk);
        const prefix = useAlt ? sk : 'character';

        // Helper: safely play animation
        const tryPlay = (key) => {
            if (this.anims.exists(key)) {
                this.player.play(key, true);
            }
        };

        // Cancel breathing tween when moving
        const cancelBreathing = () => {
            if (this._breathTween) {
                this._breathTween.stop();
                this._breathTween = null;
                const baseScale = useAlt ? 0.35 : 1;
                this.player.setScale(baseScale);
            }
        };

        // Horizontal
        if (left) {
            cancelBreathing();
            body.setVelocityX(-speed);
            tryPlay(`${prefix}-walk-left`);
            this.direction = 'left';
        } else if (right) {
            cancelBreathing();
            body.setVelocityX(speed);
            tryPlay(`${prefix}-walk-right`);
            this.direction = 'right';
        }

        // Vertical
        if (up) {
            cancelBreathing();
            body.setVelocityY(-speed);
            if (!left && !right) {
                tryPlay(`${prefix}-walk-up`);
                this.direction = 'up';
            }
        } else if (down) {
            cancelBreathing();
            body.setVelocityY(speed);
            if (!left && !right) {
                tryPlay(`${prefix}-walk-down`);
                this.direction = 'down';
            }
        }

        // Normalize diagonal speed, but guard zero-vectors to prevent sudden movements
        if (left || right || up || down) {
            body.velocity.normalize().scale(speed);
        } else {
            body.setVelocity(0);
        }

        // Idle animation + breathing tween when not moving
        if (body.velocity.x === 0 && body.velocity.y === 0) {
            // Play idle/breathing animation frames
            const idleKey = `${prefix}-idle-${this.direction}`;
            const walkIdleKey = `character-idle-${this.direction}`;
            if (this.anims.exists(idleKey)) {
                tryPlay(idleKey);
            } else if (this.anims.exists(walkIdleKey)) {
                tryPlay(walkIdleKey);
            }

            // Add subtle scale breathing tween if not already active
            if (!this._breathTween) {
                const baseScale = useAlt ? 0.35 : 1;
                this._breathTween = this.tweens.add({
                    targets: this.player,
                    scaleY: baseScale * 1.02,
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }
        }

        // Mobile action button (A)
        if (window.joypadAction) {
            window.joypadAction = false;
            this._handleAction();
        }

        // NPC patrol behavior
        this._updateNPCPatrol(time);
    }

    /**
     * Update NPC patrol — random walking with direction changes.
     */
    _updateNPCPatrol(time) {
        const PATROL_SPEED = 30;
        const DIRS = ['down', 'up', 'left', 'right'];
        const VEL = {
            down: { x: 0, y: PATROL_SPEED },
            up: { x: 0, y: -PATROL_SPEED },
            left: { x: -PATROL_SPEED, y: 0 },
            right: { x: PATROL_SPEED, y: 0 },
        };

        for (const npc of (this.npcs || [])) {
            const sk = npc.getData('_spriteKey');
            if (!sk) continue; // skip question-mark placeholders

            const timer = (npc.getData('_patrolTimer') || 0) + this.game.loop.delta;
            const wait = npc.getData('_patrolWait') || 2500;

            if (timer >= wait) {
                // Choose: 60% chance walk new direction, 40% chance idle
                const shouldWalk = Math.random() < 0.6;
                if (shouldWalk) {
                    const dir = Phaser.Utils.Array.GetRandom(DIRS);
                    npc.setData('_patrolDir', dir);
                    npc.setData('_isWalking', true);
                    npc.body.setVelocity(VEL[dir].x, VEL[dir].y);

                    const walkKey = SpriteRegistry.getWalkAnim(sk, dir);
                    if (walkKey && this.anims.exists(walkKey)) {
                        npc.play(walkKey, true);
                    }
                } else {
                    // Idle
                    npc.setData('_isWalking', false);
                    npc.body.setVelocity(0, 0);
                    const dir = npc.getData('_patrolDir') || 'down';
                    const idleKey = SpriteRegistry.getIdleAnim(sk, dir);
                    if (idleKey && this.anims.exists(idleKey)) {
                        npc.play(idleKey, true);
                    } else {
                        npc.anims.stop();
                    }
                }

                npc.setData('_patrolTimer', 0);
                npc.setData('_patrolWait', Phaser.Math.Between(1500, 3500));
            } else {
                npc.setData('_patrolTimer', timer);
            }

            // Update name label position to follow NPC
            const label = npc.getData('_label');
            const hasSprite = !!npc.getData('_spriteKey');
            if (label) {
                label.setPosition(npc.x, npc.y - (hasSprite ? 35 : 16));
            }

            // Sync interaction marker and check distance
            const marker = npc.getData('_interactMarker');
            if (marker && this.player) {
                marker.setX(npc.x); // keep centered above them

                // Show if nearby and not already talking
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
                const isNear = dist < 40;

                if (isNear && !this._dialogueActive) {
                    marker.setVisible(true);
                } else {
                    marker.setVisible(false);
                }
            }
        }
    }

    // ════════════════════════════════════════════════════
    // Info Markers (signs, objects with messages)
    // ════════════════════════════════════════════════════
    _createInfoMarkers() {
        const infoLayer = this.map.getObjectLayer('info');
        if (!infoLayer) { _log('No info layer'); return; }

        this.infoZones = [];
        for (const obj of infoLayer.objects) {
            const props = {};
            for (const p of (obj.properties || [])) { props[p.name] = p.value; }
            if (!props.message && !props.messageID) continue;

            const zone = this.add.zone(obj.x + (obj.width / 2), obj.y + (obj.height / 2), Math.max(obj.width, 24), Math.max(obj.height, 24));
            this.physics.add.existing(zone, true); // static body
            zone.setData('message', props.message || `Message #${props.messageID}`);
            zone.setData('name', obj.name || 'Sign');
            this.infoZones.push(zone);
        }
        _log(`Created ${this.infoZones.length} info markers`);
    }

    // ════════════════════════════════════════════════════
    // NPCs (from enemies/markers object layers)
    // ════════════════════════════════════════════════════
    _createNPCs() {
        const enemyLayer = this.map.getObjectLayer('enemies');
        if (!enemyLayer) { _log('No enemies layer'); return; }

        this.npcs = [];
        this._npcColliders = [];

        // Legacy map -> Contact map for placeholder maps like larus.json
        const TILEMAP_OVERRIDE = {
            '1': 'sasha_klein',
            '2': 'elena_ross',
            '3': 'marcus_price',
            'rat': 'yuki_tanaka'
        };

        for (const obj of enemyLayer.objects) {
            const npcX = obj.x + (obj.width / 2);
            const npcY = obj.y + (obj.height / 2);

            // Read Tiled properties (id, name, etc.)
            const props = {};
            for (const p of (obj.properties || [])) { props[p.name] = p.value; }

            let npcId = props.id || obj.name || '?';

            // Map legacy generic tilemap IDs to actual ArtLife contacts
            if (TILEMAP_OVERRIDE[npcId]) npcId = TILEMAP_OVERRIDE[npcId];
            if (props.texture && TILEMAP_OVERRIDE[props.texture]) npcId = TILEMAP_OVERRIDE[props.texture];

            // Resolve NPC sprite: look up contact's spriteKey
            const contact = this._contactMap?.[npcId];
            const spriteKey = contact?.spriteKey || null;
            const npcName = contact?.name || props.label || obj.name || 'Unknown NPC';

            const hasSprite = spriteKey && this.textures.exists(spriteKey);

            let npc;
            if (hasSprite) {
                npc = this.physics.add.sprite(npcX, npcY, spriteKey);
                SpriteRegistry.configureForOverworld(npc, true);
                npc.setDepth(DEPTH.PLAYER - 1);
                npc.body.immovable = true;

                // Play idle animation facing down
                const idleKey = SpriteRegistry.getIdleAnim(spriteKey, 'down');
                if (idleKey && this.anims.exists(idleKey)) {
                    npc.play(idleKey);
                } else {
                    // Try walk animation as fallback
                    const walkKey = SpriteRegistry.getWalkAnim(spriteKey, 'down');
                    if (walkKey && this.anims.exists(walkKey)) {
                        npc.play(walkKey);
                    }
                }

                // Random patrol — change direction every 2-4 seconds
                npc.setData('_patrolDir', 'down');
                npc.setData('_patrolTimer', 0);
                npc.setData('_patrolWait', Phaser.Math.Between(1500, 3500));
                npc.setData('_spriteKey', spriteKey);
            } else {
                // Fallback: question_mark placeholder with floating tween
                npc = this.physics.add.sprite(npcX, npcY, 'question_mark');
                npc.setDepth(DEPTH.PLAYER - 1);
                npc.body.immovable = true;
                npc.setScale(0.8);

                this.tweens.add({
                    targets: npc,
                    y: npcY - 4,
                    duration: 1200,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }

            // NPC name label
            const label = this.add.text(npcX, npcY - (hasSprite ? 35 : 16), npcName, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '6px',
                color: '#ffddaa',
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0.5).setDepth(DEPTH.HUD - 1);
            npc.setData('_label', label);

            // Interaction marker (!) that appears when you get close
            const interactMarker = this.add.text(npcX, npcY - (hasSprite ? 45 : 26), '!', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0.5).setDepth(DEPTH.HUD).setVisible(false);

            this.tweens.add({
                targets: interactMarker,
                y: interactMarker.y - 4,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
            npc.setData('_interactMarker', interactMarker);

            // Store NPC data
            npc.setData('npcId', npcId);
            npc.setData('name', contact?.name || npcName);
            npc.setData('contactId', contact?.id || null);
            this.npcs.push(npc);

            // Store collision so we can clean it up later
            const collider = this.physics.add.collider(this.player, npc);
            this._npcColliders.push(collider);
        }
        _log(`Created ${this.npcs.length} NPCs (${this.npcs.filter(n => n.getData('_spriteKey')).length} with sprites)`);
    }

    // ════════════════════════════════════════════════════
    // Action Key — interact with nearest marker/NPC
    // ════════════════════════════════════════════════════
    _handleAction() {
        if (this._dialogueActive) {
            this._dismissDialogue();
            return;
        }

        const px = this.player.x;
        const py = this.player.y;
        const RANGE = 40;

        // Check info markers first
        for (const zone of (this.infoZones || [])) {
            const dist = Phaser.Math.Distance.Between(px, py, zone.x, zone.y);
            if (dist < RANGE) {
                this._showDialogue(zone.getData('name'), zone.getData('message'));
                return;
            }
        }

        // Check NPCs
        for (const npc of (this.npcs || [])) {
            const dist = Phaser.Math.Distance.Between(px, py, npc.x, npc.y);
            if (dist < RANGE) {
                this._showDialogue(npc.getData('name') || 'NPC', `NPC #${npc.getData('npcId')} noticed you.`);
                return;
            }
        }
    }

    // ════════════════════════════════════════════════════
    // Dialogue Popup (in-world message box)
    // ════════════════════════════════════════════════════
    _showDialogue(speaker, text) {
        this._dismissDialogue(); // clear any existing

        this._dialogueActive = true;
        const cam = this.cameras.main;
        const visibleW = cam.width / cam.zoom;
        const visibleH = cam.height / cam.zoom;

        const boxW = Math.min(visibleW * 0.85, 400); // Max width of 400px
        const boxH = 70;
        const boxX = (cam.width - boxW) / 2;
        const boxY = cam.height - boxH - 16;

        // Dark semi-transparent backdrop
        this._dlgBg = this.add.rectangle(boxX + boxW / 2, boxY + boxH / 2, boxW, boxH, 0x0a0a14, 0.92)
            .setScrollFactor(0)
            .setDepth(DEPTH.HUD + 10)
            .setStrokeStyle(1, 0xc9a84c);

        // Speaker name
        this._dlgName = this.add.text(boxX + 10, boxY + 8, speaker.toUpperCase(), {
            fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#c9a84c',
        }).setScrollFactor(0).setDepth(DEPTH.HUD + 11);

        // Message text with typewriter effect
        this._dlgText = this.add.text(boxX + 10, boxY + 26, '', {
            fontFamily: 'monospace', fontSize: '11px', color: '#dddddd',
            wordWrap: { width: boxW - 20 }, lineSpacing: 4,
        }).setScrollFactor(0).setDepth(DEPTH.HUD + 11);

        // Typewriter
        let charIndex = 0;
        const cleanText = text.replace(/^- /, ''); // strip leading "- "
        this._dlgTimer = this.time.addEvent({
            delay: 25,
            repeat: cleanText.length - 1,
            callback: () => {
                charIndex++;
                this._dlgText.setText(cleanText.substring(0, charIndex));
            },
        });

        // Press indicator
        this._dlgHint = this.add.text(boxX + boxW - 10, boxY + boxH - 12, '▼', {
            fontFamily: 'monospace', fontSize: '10px', color: '#888',
        }).setScrollFactor(0).setDepth(DEPTH.HUD + 11).setOrigin(1, 0);

        // Blink the indicator
        this.tweens.add({
            targets: this._dlgHint,
            alpha: 0.3,
            duration: 500,
            yoyo: true,
            repeat: -1,
        });

        // Stop player movement during dialogue
        if (this.player?.body) {
            this.player.body.setVelocity(0);
        }
    }

    _dismissDialogue() {
        this._dialogueActive = false;
        if (this._dlgTimer) { this._dlgTimer.remove(); this._dlgTimer = null; }
        if (this._dlgBg) { this._dlgBg.destroy(); this._dlgBg = null; }
        if (this._dlgName) { this._dlgName.destroy(); this._dlgName = null; }
        if (this._dlgText) { this._dlgText.destroy(); this._dlgText = null; }
        if (this._dlgHint) { this._dlgHint.destroy(); this._dlgHint = null; }
    }

    // ════════════════════════════════════════════════════
    // Exit
    // ════════════════════════════════════════════════════
    exitScene() {
        _log('exitScene()');
        // Hide MobileJoypad
        GameEventBus.emit(GameEvents.SCENE_EXIT, 'NewWorldScene');
        // Clean up joypad state
        window.joypadState = null;
        window.joypadSprint = false;
        // Restore container background for other scenes
        const gc = document.getElementById('phaser-game-container');
        if (gc) gc.style.background = '#0a0a0f';
        try {
            this.scene.stop();
        } catch (e) {
            console.warn('[NewWorldScene] scene.stop() error:', e);
        }
        GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.DASHBOARD);
    }

    /**
     * Phaser lifecycle — called when the scene is stopped.
     * Clean up event listeners and global state.
     */
    shutdown() {
        window.joypadState = null;
        window.joypadSprint = false;
        const gc = document.getElementById('phaser-game-container');
        if (gc) gc.style.background = '#0a0a0f';
        if (this._settingsHandler) {
            document.removeEventListener('settings-changed', this._settingsHandler);
            this._settingsHandler = null;
        }
        if (this._breathTween) {
            this._breathTween.stop();
            this._breathTween = null;
        }
        if (this._npcColliders) {
            this._npcColliders.forEach(c => c.destroy());
            this._npcColliders = [];
        }
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
