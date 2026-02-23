/**
 * WorldScene v2 — Full Pokemon-style overworld with GridEngine tile movement.
 *
 * Features:
 *  - Tiled map rendering with proper layer depth ordering
 *  - GridEngine 4-directional grid movement (keyboard + mobile joypad)
 *  - NPC spawning with random wandering and interaction
 *  - Dialog box with typewriter text, player freeze, SPACE to advance
 *  - Door transitions with camera fade
 *  - Item pickup from Tiled object layer (pokeballs)
 *  - Grass encounter zones (art world events)
 *  - Daylight overlay based on in-game week
 *  - Sprint mode (SHIFT / mobile B button)
 *  - Position persistence across scene visits
 *  - Wipe transition on entry
 *  - Y-depth sorting for all characters
 */

import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { GameState } from '../managers/GameState.js';
import { WebAudioService } from '../managers/WebAudioService.js';
import { NPCManager } from '../managers/NPCManager.js';

// ── Layer depth constants ──
const DEPTH = {
    BELOW_PLAYER: 0,
    BELOW_PLAYER2: 1,
    WORLD: 2,
    WORLD2: 3,
    // Characters use their Y position for depth (typically 4-50 range)
    ABOVE_PLAYER: 100,
    DIALOG_BG: 200,
    DIALOG_TEXT: 201,
    WIPE: 300,
    DAYLIGHT: 400,
    HUD: 500,
};

// ── Layer name → depth mapping for Tiled layers ──
const LAYER_DEPTHS = {
    below_player: DEPTH.BELOW_PLAYER,
    below_player2: DEPTH.BELOW_PLAYER2,
    world: DEPTH.WORLD,
    world2: DEPTH.WORLD2,
    above_player: DEPTH.ABOVE_PLAYER,
};

// ── Art-world flavor for grass encounters ──
const GRASS_ENCOUNTERS = [
    { text: 'You spot a discarded exhibition catalogue on the ground.', effect: { intel: 1 } },
    { text: 'A street artist offers you a print. You politely decline.', effect: null },
    { text: 'You overhear two collectors arguing about NFTs.', effect: { taste: 1 } },
    { text: 'A suspicious figure tries to sell you a "genuine Banksy".', effect: { suspicion: 1 } },
    { text: 'You find a crumpled gallery opening invitation.', effect: { access: 1 } },
    { text: 'The wind carries the faint smell of turpentine.', effect: null },
    { text: 'A pigeon lands on a nearby sculpture. Art?', effect: null },
    { text: 'You notice a tiny gallery tucked between two buildings.', effect: { reputation: 1 } },
];

export default class WorldScene extends BaseScene {
    constructor() {
        super({ key: 'WorldScene' });
        this.npcSprites = [];
        this.npcData = [];
        this.dialogActive = false;
        this.dialogElements = [];
        this.isSprinting = false;
        this.lastGrassCheck = { x: -1, y: -1 };
        this.grassCooldown = 0;
        this.itemsCollected = new Set();
        this._sceneReady = false;
        this._createFailed = false;
    }

    preload() {
        // Catch asset-load errors so we get diagnostics instead of silent black screens
        this.load.on('loaderror', (file) => {
            console.error(`[WorldScene] Asset failed to load: ${file.key} (${file.url})`);
            window.ArtLife?.recordMissingAsset?.(file.key, file.url);
        });

        // Tiled JSON map — always queue load; Phaser deduplicates internally
        this.load.tilemapTiledJSON('pallet_town', 'content/maps/pallet_town.json');

        // Tilesets
        const tilesets = ['world', 'world2', 'grounds', 'grounds2'];
        for (const ts of tilesets) {
            if (!this.textures.exists(ts)) {
                this.load.image(ts, `assets/tilesets/${ts}.png`);
            }
        }

        // Player spritesheet — 216x384, 3 cols x 4 rows = 12 frames at 72x96
        if (!this.textures.exists('world_player')) {
            this.load.spritesheet('world_player', 'assets/sprites/player.png', {
                frameWidth: 72,
                frameHeight: 96,
            });
        }

        // NPC walk spritesheets (160×160 frames, 4×4 grid: down/left/right/up × 4 frames)
        // These are the same sprites used in LocationScene for contact-specific NPCs
        const npcWalkKeys = [
            'walk_legacy_gallerist_walk', 'walk_auction_house_type_walk', 'walk_elena_ross_walk',
            'walk_old_money_gallerist_walk', 'walk_academic_curator_walk', 'walk_young_artist_walk',
            'walk_art_flipper_walk', 'walk_tech_collector_f_walk', 'walk_power_collector_f_walk',
            'walk_art_critic_walk', 'walk_young_power_dealer_walk', 'walk_underground_connector_walk',
            'walk_it_girl_dealer_walk', 'walk_margaux_villiers_walk', 'walk_avant_garde_curator_walk',
            'walk_julian_vance_walk',
        ];
        for (const key of npcWalkKeys) {
            if (!this.textures.exists(key)) {
                this.load.spritesheet(key, `sprites/${key}.png`, { frameWidth: 160, frameHeight: 160 });
            }
        }
    }

    create(data) {
        super.create({ ...data, hideUI: true });
        this._sceneReady = false;
        this._createFailed = false;

        // Initialize joypad globals immediately so update() never reads undefined
        window.joypadState = window.joypadState ?? null;
        window.joypadSprint = window.joypadSprint ?? false;
        window.joypadAction = window.joypadAction ?? false;

        const { width, height } = this.scale;

        // Opaque background — prevents body theme bleed-through
        this.add.rectangle(width / 2, height / 2, width, height, 0x2d6b30)
            .setDepth(-1).setScrollFactor(0);

        // Verify GridEngine plugin — retry once after a frame if not ready
        if (!this.gridEngine) {
            console.warn('[WorldScene] GridEngine not ready, retrying next frame...');
            this.time.delayedCall(50, () => {
                if (!this.gridEngine) {
                    console.error('[WorldScene] GridEngine plugin not found after retry!');
                    this._createFailed = true;
                    this._showError('GridEngine plugin not available');
                    return;
                }
                this._initScene(data);
            });
            return;
        }

        this._initScene(data);
    }

    _initScene(data) {
        // Guard: if scale dimensions are 0, defer until Phaser recalculates
        const { width, height } = this.scale;
        if (width < 10 || height < 10) {
            console.warn(`[WorldScene] Scale too small (${width}x${height}), waiting for resize...`);
            if (!this._scaleRetryCount) this._scaleRetryCount = 0;
            this._scaleRetryCount++;
            if (this._scaleRetryCount > 10) {
                this._createFailed = true;
                this._showError(`Canvas has zero dimensions (${width}x${height}). Try reloading.`);
                return;
            }
            this.time.delayedCall(100, () => this._initScene(data));
            return;
        }

        try {
            this._buildScene(data);
            this._playWipeTransition();
        } catch (err) {
            console.error('[WorldScene] create() error:', err);
            this._createFailed = true;
            window.ArtLife?.recordSceneError?.('WorldScene', err);
            this._showError(err.message);
        }
    }

    // ════════════════════════════════════════════════════
    // Scene Construction
    // ════════════════════════════════════════════════════

    _buildScene(data) {
        // ── Build tilemap ──
        this.map = this.make.tilemap({ key: 'pallet_town' });
        this.mapKey = 'pallet_town'; // Store for returnArgs on scene re-entry from DialogueScene

        const grounds = this.map.addTilesetImage('grounds', 'grounds');
        const world = this.map.addTilesetImage('world', 'world');
        const world2 = this.map.addTilesetImage('world2', 'world2');
        const grounds2 = this.map.addTilesetImage('grounds2', 'grounds2');
        const allSets = [grounds, world, world2, grounds2].filter(Boolean);

        if (allSets.length === 0) {
            throw new Error('No tilesets loaded — check tileset names match Tiled export');
        }

        // ── Render tile layers ──
        const renderedLayers = [];
        for (const layerData of this.map.layers) {
            const name = layerData.name;
            if (name === 'objects') continue;
            const layer = this.map.createLayer(name, allSets);
            if (layer) {
                layer.setDepth(LAYER_DEPTHS[name] ?? DEPTH.WORLD);
                renderedLayers.push(name);
            }
        }

        // ── Parse Tiled objects ──
        const objectLayer = this.map.getObjectLayer('objects');
        const objects = objectLayer?.objects || [];
        const tileW = this.map.tileWidth;
        const tileH = this.map.tileHeight;

        // Find spawn point
        let spawnX = 5, spawnY = 16;
        const spawn = objects.find(o => o.name === 'spawn' || o.type === 'spawn');
        if (spawn) {
            spawnX = Math.floor(spawn.x / tileW);
            spawnY = Math.floor(spawn.y / tileH);
        }

        // Restore saved position if available
        const saved = GameState.state?.overworldPosition;
        if (saved && typeof saved.x === 'number') {
            spawnX = saved.x;
            spawnY = saved.y;
        }

        // Override with data passed from door transition
        if (data?.spawnX != null) spawnX = data.spawnX;
        if (data?.spawnY != null) spawnY = data.spawnY;

        // ── Catalog interactive objects ──
        this.doors = [];
        this.dialogs = [];
        this.grassTiles = new Set(); // individual grass tile positions
        this.items = [];
        this.eventZones = new Map(); // key: "x,y", value: eventId

        for (const obj of objects) {
            const tx = Math.floor(obj.x / tileW);
            const ty = Math.floor(obj.y / tileH);
            const props = {};
            if (obj.properties) {
                for (const p of obj.properties) props[p.name] = p.value;
            }

            const nameOrType = obj.name || obj.type || '';

            if (nameOrType === 'door') {
                this.doors.push({ x: tx, y: ty, nextMap: props.nextMap, ...props });
            } else if (nameOrType === 'dialog') {
                this.dialogs.push({ x: tx, y: ty, content: props.content || obj.name, ...props });
            } else if (nameOrType === 'grass') {
                // Grass objects can be points (single tile) or rectangles
                if (obj.width > 0 && obj.height > 0) {
                    const w = Math.ceil(obj.width / tileW);
                    const h = Math.ceil(obj.height / tileH);
                    for (let gx = 0; gx < w; gx++) {
                        for (let gy = 0; gy < h; gy++) {
                            this.grassTiles.add(`${tx + gx},${ty + gy}`);
                        }
                    }
                } else {
                    // Point object — single grass tile
                    this.grassTiles.add(`${tx},${ty}`);
                }
            } else if (nameOrType === 'event') {
                const eventId = props.eventId || props.event_id || obj.name;
                if (obj.width > 0 && obj.height > 0) {
                    const w = Math.ceil(obj.width / tileW);
                    const h = Math.ceil(obj.height / tileH);
                    for (let gx = 0; gx < w; gx++) {
                        for (let gy = 0; gy < h; gy++) {
                            this.eventZones.set(`${tx + gx},${ty + gy}`, eventId);
                        }
                    }
                } else {
                    this.eventZones.set(`${tx},${ty}`, eventId);
                }
            } else if (nameOrType === 'pokeball' || nameOrType === 'item') {
                const itemName = props.pokemon_inside
                    ? `Pokeball (#${props.pokemon_inside})`
                    : (props.item || 'mysterious object');
                this.items.push({ x: tx, y: ty, name: itemName, id: `item_${tx}_${ty}` });
            }
        }

        // ── Player sprite ──
        this.playerSprite = this.add.sprite(0, 0, 'world_player');
        this.playerSprite.setOrigin(0.5, 0.75);

        // ── NPC sprites ──
        this._spawnNPCs();

        // ── Item sprites (pokeballs) ──
        this._spawnItems();

        // ── GridEngine setup ──
        // Detect charLayer from Tiled's ge_charLayer property (set by GridEngine plugin in Tiled)
        // Phaser converts Tiled layer properties to flat objects: { ge_charLayer: "world2" }
        let charLayer = undefined;
        for (const layerData of this.map.layers) {
            const val = layerData.properties?.ge_charLayer;
            if (val) { charLayer = val; break; }
        }
        this.charLayer = charLayer; // Save for dynamic spawns

        const charConfig = (id, sprite, startPosition, speed) => {
            const cfg = { id, sprite, walkingAnimationMapping: 0, startPosition, speed };
            if (charLayer) cfg.charLayer = charLayer;
            return cfg;
        };

        const characters = [
            charConfig('player', this.playerSprite, { x: spawnX, y: spawnY }, 4),
        ];

        // Add NPC characters
        for (const npc of this.npcData) {
            characters.push(
                charConfig(npc.id, npc.sprite, npc.startPosition, npc.speed)
            );
        }

        this.gridEngine.create(this.map, {
            collisionTilePropertyName: 'collides',
            characters,
        });

        // Start NPC wandering for eligible chars
        for (const npc of this.npcData) {
            if (npc.behavior === 'wandering') {
                this.gridEngine.moveRandomly(npc.id, 2000 + Math.random() * 2000);
            }
        }

        // ── Y-depth sorting + NPC walk animations ──
        this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
            this._updateCharDepth(charId);
            // Play walk animation for NPCs with dedicated spritesheets
            if (charId !== 'player') {
                const npc = this.npcData.find(n => n.id === charId);
                if (npc?.spriteKey && this.anims.exists(`${npc.spriteKey}_${direction.toLowerCase()}`)) {
                    npc.sprite.anims.play(`${npc.spriteKey}_${direction.toLowerCase()}`, true);
                }
            }
        });
        this.gridEngine.movementStopped().subscribe(({ charId }) => {
            this._updateCharDepth(charId);
            // Stop walk animation for NPCs
            if (charId !== 'player') {
                const npc = this.npcData.find(n => n.id === charId);
                if (npc?.sprite?.anims) npc.sprite.anims.stop();
            }
        });
        // Initial depth
        this._updateCharDepth('player');
        for (const npc of this.npcData) this._updateCharDepth(npc.id);

        // ── Position persistence ──
        this.gridEngine.positionChangeFinished().subscribe(({ charId }) => {
            if (charId === 'player' && GameState.state) {
                const pos = this.gridEngine.getPosition('player');
                const facing = this.gridEngine.getFacingDirection('player');
                GameState.state.overworldPosition = {
                    x: pos.x,
                    y: pos.y,
                    facing,
                };

                // Drain 1 minute from the narrative clock per tile step
                GameState.advanceTime(1);

                // Check grass encounters
                this._checkGrassEncounter(pos);
                // Check event trigger zones
                this._checkEventTrigger(pos);
                // Check item pickups
                this._checkItemPickup(pos);
            }
        });

        // ── Camera ──
        this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
        const vw = this.scale.width;
        const zoom = vw < 500 ? 2.5 : vw < 800 ? 2 : 2;
        this.cameras.main.setZoom(zoom);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels, true);
        this.cameras.main.roundPixels = true;
        this.cameras.main.fadeIn(400, 0, 0, 0);

        // Handle orientation/resize changes
        this.scale.on('resize', (gameSize) => {
            if (!this.cameras?.main) return;
            const w = gameSize.width;
            const newZoom = w < 500 ? 2.5 : w < 800 ? 2 : 2;
            this.cameras.main.setZoom(newZoom);
        });

        // Vignette
        try {
            const vig = this.cameras.main.postFX.addVignette();
            vig.radius = 0.85;
        } catch (e) { /* postFX may not be available */ }

        // ── Daylight overlay ──
        this.daylightOverlay = this.add.graphics();
        this.daylightOverlay.setDepth(DEPTH.DAYLIGHT);
        this.daylightOverlay.setScrollFactor(0);
        this._applyDaylight();

        this.lastHour = GameState.state?.hour ?? 8;

        // ── Input ──
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });

        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => this.exitScene());

        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this._lastInteractTime = 0;
        this.interactKey.on('down', () => this._onInteractPress());

        // Window-level SPACE fallback — Phaser keyboard requires canvas focus
        this._windowKeyHandler = (e) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                this._onInteractPress();
            }
        };
        window.addEventListener('keydown', this._windowKeyHandler);

        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        // Mobile joypad support — globals already initialized in create()
        this._joypadActionConsumed = false;

        // ── Location name toast ──
        this._showLocationToast('PALLET TOWN');

        // ── Persistent stats HUD — Artnet-inspired data bar at top of canvas ──
        this._buildStatsHUD();

        // ── Interaction hint (floats above player head) ──
        this._interactHint = this.add.text(0, 0, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
        }).setOrigin(0.5, 1).setDepth(DEPTH.HUD).setAlpha(0);

        // ── Scene entry sound ──
        WebAudioService.sceneEnter();

        // Mark scene as ready — SCENE_READY event deferred to first update() frame
        // so React overlays have time to mount before we signal readiness
        this._sceneReady = true;
        this._moveLogTimer = 0;
        console.log('[WorldScene] Built successfully.',
            'charLayer:', charLayer || '(implicit)',
            'NPCs:', this.npcData.length,
            'Items:', this.items.length,
            'Grass tiles:', this.grassTiles.size,
            'Doors:', this.doors.length,
            'Dialogs:', this.dialogs.length,
        );
        // Log all door positions for debugging
        for (const d of this.doors) {
            console.log(`[WorldScene] Door at (${d.x},${d.y}) → ${d.nextMap || '(none)'}${d.label ? ' "' + d.label + '"' : ''}`);
        }
    }

    // ════════════════════════════════════════════════════
    // NPC Spawning
    // ════════════════════════════════════════════════════

    _spawnNPCs() {
        const hour = GameState.state?.hour ?? 8;
        const day = GameState.state?.dayOfWeek ?? 1;
        const mapId = 'pallet_town';

        const activeNPCs = NPCManager.getNPCsForMap(mapId, day, hour);

        // Create walk animations for NPC spritesheets (once per key)
        // walk_ spritesheets: 160×160, 4 dirs × 4 frames (down 0-3, left 4-7, right 8-11, up 12-15)
        for (const npc of activeNPCs) {
            const sk = npc.spriteKey;
            if (sk && this.textures.exists(sk) && !this.anims.exists(`${sk}_down`)) {
                this.anims.create({ key: `${sk}_down`, frames: this.anims.generateFrameNumbers(sk, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
                this.anims.create({ key: `${sk}_left`, frames: this.anims.generateFrameNumbers(sk, { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
                this.anims.create({ key: `${sk}_right`, frames: this.anims.generateFrameNumbers(sk, { start: 8, end: 11 }), frameRate: 6, repeat: -1 });
                this.anims.create({ key: `${sk}_up`, frames: this.anims.generateFrameNumbers(sk, { start: 12, end: 15 }), frameRate: 6, repeat: -1 });
            }
        }

        for (const npc of activeNPCs) {
            const hasSprite = npc.spriteKey && this.textures.exists(npc.spriteKey);
            const sprite = this.add.sprite(0, 0, hasSprite ? npc.spriteKey : 'world_player');
            sprite.setOrigin(0.5, 0.75);
            // Only tint if using the generic world_player fallback
            if (!hasSprite && npc.tint) sprite.setTint(npc.tint);

            this.npcSprites.push(sprite);
            this.npcData.push({
                ...npc,
                sprite
            });
        }
    }

    // ════════════════════════════════════════════════════
    // Item Spawning
    // ════════════════════════════════════════════════════

    _spawnItems() {
        // Loaded items from save?
        const collected = GameState.state?.collectedItems || [];
        this.itemsCollected = new Set(collected);

        this.itemSprites = [];
        for (const item of this.items) {
            if (this.itemsCollected.has(item.id)) continue;

            // Draw a simple colored circle as item indicator
            const px = item.x * this.map.tileWidth + this.map.tileWidth / 2;
            const py = item.y * this.map.tileHeight + this.map.tileHeight / 2;
            const circle = this.add.circle(px, py, 8, 0xffd700, 1);
            circle.setDepth(DEPTH.WORLD2 + 1);
            circle.setStrokeStyle(2, 0xffa500);

            // Gentle bob animation
            this.tweens.add({
                targets: circle,
                y: py - 4,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            this.itemSprites.push({ ...item, sprite: circle });
        }
    }

    // ════════════════════════════════════════════════════
    // Update Loop
    // ════════════════════════════════════════════════════

    update(time, delta) {
        if (this._createFailed) return;
        if (!this.gridEngine) return;

        // Emit SCENE_READY on first update frame — ensures Phaser is fully initialized
        if (this._sceneReady && !this._readyEmitted) {
            this._readyEmitted = true;
            GameEventBus.emit(GameEvents.SCENE_READY, 'WorldScene');
        }

        if (this.dialogActive) return; // Freeze movement during dialog

        // Sprint detection
        this.isSprinting = this.shiftKey?.isDown || window.joypadSprint === true;
        const speed = this.isSprinting ? 7 : 4;

        // Update player speed
        try {
            this.gridEngine.setSpeed('player', speed);
        } catch (e) { /* setSpeed may not exist in all GridEngine versions */ }

        if (this.gridEngine.isMoving('player')) return;

        const up = this.cursors?.up.isDown || this.wasd?.up.isDown || window.joypadState === 'UP';
        const down = this.cursors?.down.isDown || this.wasd?.down.isDown || window.joypadState === 'DOWN';
        const left = this.cursors?.left.isDown || this.wasd?.left.isDown || window.joypadState === 'LEFT';
        const right = this.cursors?.right.isDown || this.wasd?.right.isDown || window.joypadState === 'RIGHT';

        if (left) this.gridEngine.move('player', 'left');
        else if (right) this.gridEngine.move('player', 'right');
        else if (up) this.gridEngine.move('player', 'up');
        else if (down) this.gridEngine.move('player', 'down');

        // Mobile A button interaction (polls global flag each frame)
        if (window.joypadAction && !this._joypadActionConsumed) {
            this._joypadActionConsumed = true;
            this._onInteractPress();
        }
        if (!window.joypadAction) this._joypadActionConsumed = false;

        // Daylight refresh every ~5s
        if (time % 5000 < 20) this._applyDaylight();

        // Hourly NPC schedule sync
        const currentHour = GameState.state?.hour ?? 8;
        if (this.lastHour !== currentHour) {
            this.lastHour = currentHour;
            this._syncNPCs();
        }

        // ── Interaction hint ──
        this._updateInteractHint();

        // ── Stats HUD refresh (rate-limited) ──
        this._updateStatsHUD();

        // ── Movement logger (every 2s) ──
        this._moveLogTimer = (this._moveLogTimer || 0) + delta;
        if (this._moveLogTimer > 2000) {
            this._moveLogTimer = 0;
            const p = this.gridEngine.getPosition('player');
            const f = this.gridEngine.getFacingDirection('player');
            const nearDoor = this.doors.find(d =>
                Math.abs(d.x - p.x) <= 1 && Math.abs(d.y - p.y) <= 1
            );
            if (nearDoor) {
                console.log(`[WorldScene] Player (${p.x},${p.y}) facing ${f} — NEAR DOOR at (${nearDoor.x},${nearDoor.y}) → ${nearDoor.nextMap}`);
            }
        }

        // Grass cooldown
        if (this.grassCooldown > 0) this.grassCooldown -= delta;
    }

    _syncNPCs() {
        if (!this.gridEngine) return;

        const hour = GameState.state?.hour ?? 8;
        const day = GameState.state?.dayOfWeek ?? 1;
        const mapId = 'pallet_town';

        const activeNPCs = NPCManager.getNPCsForMap(mapId, day, hour);
        const activeIds = activeNPCs.map(n => n.id);
        const currentIds = this.npcData.map(n => n.id);

        // Remove departed NPCs
        for (let i = this.npcData.length - 1; i >= 0; i--) {
            const npc = this.npcData[i];
            if (!activeIds.includes(npc.id)) {
                try {
                    this.gridEngine.removeCharacter(npc.id);
                } catch (e) { }
                if (npc.sprite) npc.sprite.destroy();
                this.npcSprites = this.npcSprites.filter(s => s !== npc.sprite);
                this.npcData.splice(i, 1);
            }
        }

        // Add arriving NPCs
        for (const npcDef of activeNPCs) {
            if (!currentIds.includes(npcDef.id)) {
                const hasSprite = npcDef.spriteKey && this.textures.exists(npcDef.spriteKey);
                const sprite = this.add.sprite(0, 0, hasSprite ? npcDef.spriteKey : 'world_player');
                sprite.setOrigin(0.5, 0.75);
                if (!hasSprite && npcDef.tint) sprite.setTint(npcDef.tint);
                sprite.setDepth(DEPTH.WORLD2 + 1 + npcDef.startPosition.y); // Initial depth

                this.npcSprites.push(sprite);
                const npcDataObj = { ...npcDef, sprite };
                this.npcData.push(npcDataObj);

                try {
                    const cfg = {
                        id: npcDef.id,
                        sprite: sprite,
                        startPosition: npcDef.startPosition,
                        speed: npcDef.speed,
                        walkingAnimationMapping: 0
                    };
                    if (this.charLayer) cfg.charLayer = this.charLayer;

                    this.gridEngine.addCharacter(cfg);

                    if (npcDef.behavior === 'wandering') {
                        this.gridEngine.moveRandomly(npcDef.id, 2000 + Math.random() * 2000);
                    }
                } catch (e) {
                    console.warn('[WorldScene] Failed to add late NPC to gridEngine', e);
                }
            }
        }
    }

    // ════════════════════════════════════════════════════
    // Y-Depth Sorting
    // ════════════════════════════════════════════════════

    _updateCharDepth(charId) {
        try {
            const pos = this.gridEngine.getPosition(charId);
            const sprite = charId === 'player'
                ? this.playerSprite
                : this.npcData.find(n => n.id === charId)?.sprite;
            if (sprite) {
                // Depth = base + Y position so characters lower on screen are in front
                sprite.setDepth(DEPTH.WORLD2 + 1 + pos.y);
            }
        } catch (e) { /* character may not exist yet */ }
    }

    // ════════════════════════════════════════════════════
    // Interaction Hint
    // ════════════════════════════════════════════════════

    _updateInteractHint() {
        if (!this._interactHint || !this.gridEngine || this.dialogActive) {
            if (this._interactHint) this._interactHint.setAlpha(0);
            return;
        }

        const pos = this.gridEngine.getPosition('player');
        const target = this.gridEngine.getFacingPosition('player');

        // Check what's at the target tile
        let hintText = '';

        // Door? (check facing tile AND standing on)
        const door = this.doors.find(d => d.x === target.x && d.y === target.y)
            || this.doors.find(d => d.x === pos.x && d.y === pos.y);
        if (door) {
            hintText = '[SPACE] Enter';
        }

        // NPC?
        if (!hintText) {
            const npc = this.npcData.find(n => {
                try {
                    const npcPos = this.gridEngine.getPosition(n.id);
                    return npcPos.x === target.x && npcPos.y === target.y;
                } catch (e) { return false; }
            });
            if (npc) hintText = '[SPACE] Talk';
        }

        // Dialog sign? (check facing tile AND standing on)
        if (!hintText) {
            const dialog = this.dialogs.find(d => d.x === target.x && d.y === target.y)
                || this.dialogs.find(d => d.x === pos.x && d.y === pos.y);
            if (dialog) hintText = '[SPACE] Read';
        }

        // Item?
        if (!hintText) {
            const item = this.itemSprites.find(i => i.x === target.x && i.y === target.y);
            if (item) hintText = '[SPACE] Pick up';
        }

        if (hintText) {
            // Position above the player sprite
            const tileW = this.map.tileWidth;
            const tileH = this.map.tileHeight;
            const px = pos.x * tileW + tileW / 2;
            const py = pos.y * tileH - 8;
            this._interactHint.setText(hintText);
            this._interactHint.setPosition(px, py);
            this._interactHint.setAlpha(1);
        } else {
            this._interactHint.setAlpha(0);
        }
    }

    // ════════════════════════════════════════════════════
    // Interaction System
    // ════════════════════════════════════════════════════

    _onInteractPress() {
        // Debounce — prevent double-fire from Phaser key + window listener
        const now = Date.now();
        if (now - this._lastInteractTime < 200) return;
        this._lastInteractTime = now;

        // Already transitioning through a door
        if (this._doorTransitioning) return;

        // If dialog is showing, advance/dismiss it
        if (this.dialogActive) {
            this._dismissDialog();
            return;
        }

        if (!this.gridEngine) return;
        const pos = this.gridEngine.getPosition('player');
        const facing = this.gridEngine.getFacingDirection('player');
        const target = this.gridEngine.getFacingPosition('player');

        console.log(`[WorldScene] INTERACT pos=(${pos.x},${pos.y}) facing=${facing} target=(${target.x},${target.y}) doors=${this.doors.length}`);

        // ── Check NPC interaction ──
        const npcAtTarget = this.npcData.find(n => {
            try {
                const npcPos = this.gridEngine.getPosition(n.id);
                return npcPos.x === target.x && npcPos.y === target.y;
            } catch (e) { return false; }
        });

        if (npcAtTarget) {
            // Stop NPC movement during interaction
            this.gridEngine.stopMovement(npcAtTarget.id);

            // Face the NPC toward the player
            const reverseFacing = { left: 'right', right: 'left', up: 'down', down: 'up' };
            try {
                this.gridEngine.turnTowards(npcAtTarget.id, reverseFacing[facing] || 'down');
            } catch (e) { /* GridEngine v2.40+ added turnTowards() — guard for older cached builds */ }

            WebAudioService.select();

            // If NPC has a linked event, launch full DialogueScene
            if (npcAtTarget.eventId) {
                console.log(`[WorldScene] NPC ${npcAtTarget.label} → DialogueScene (${npcAtTarget.eventId})`);
                GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'DialogueScene', {
                    eventId: npcAtTarget.eventId,
                    npcId: npcAtTarget.id,
                    npcLabel: npcAtTarget.label,
                    dealerType: npcAtTarget.dealerType,
                    returnScene: 'WorldScene',
                    returnArgs: { mapKey: this.mapKey },
                });
            } else {
                // Fallback: inline dialog bubble
                this._showDialog(
                    npcAtTarget.label,
                    npcAtTarget.dialogContent || `${npcAtTarget.label}: "The art world is full of surprises."`,
                    () => {
                        // Resume wandering after dialog if applicable
                        if (npcAtTarget.behavior === 'wandering') {
                            this.gridEngine.moveRandomly(npcAtTarget.id, 2000 + Math.random() * 2000);
                        }
                    }
                );
            }
            return;
        }

        // ── Check door interaction (facing tile OR standing on) ──
        const door = this.doors.find(d => d.x === target.x && d.y === target.y)
            || this.doors.find(d => d.x === pos.x && d.y === pos.y);
        if (door) {
            console.log(`[WorldScene] DOOR FOUND at (${door.x},${door.y}) → ${door.nextMap}`);
            WebAudioService.doorEnter();
            this._enterDoor(door);
            return;
        }

        // ── Check sign/dialog interaction (facing tile OR standing on) ──
        const dialog = this.dialogs.find(d => d.x === target.x && d.y === target.y)
            || this.dialogs.find(d => d.x === pos.x && d.y === pos.y);
        if (dialog) {
            WebAudioService.select();
            this._showDialog('Sign', dialog.content);
            return;
        }

        console.log(`[WorldScene] Nothing found at target (${target.x},${target.y}) or pos (${pos.x},${pos.y})`);
    }

    // ════════════════════════════════════════════════════
    // Dialog System (typewriter text, player freeze)
    // ════════════════════════════════════════════════════

    _showDialog(speaker, text, onDismiss) {
        if (this.dialogActive) return;
        this.dialogActive = true;
        this._onDialogDismiss = onDismiss || null;

        const { width, height } = this.scale;
        const isSmall = width < 500;
        const boxH = isSmall ? 70 : 80;
        const boxY = height - boxH / 2 - 8;
        const padding = isSmall ? 10 : 16;
        const boxW = Math.min(width - 40, 500);

        // Background
        const bg = this.add.rectangle(width / 2, boxY, boxW, boxH, 0x000000, 0.92)
            .setScrollFactor(0).setDepth(DEPTH.DIALOG_BG)
            .setStrokeStyle(2, 0xffffff);

        // Speaker label
        const fontSize = isSmall ? '7px' : '8px';
        const textFontSize = isSmall ? '8px' : '10px';
        const label = this.add.text(width / 2 - boxW / 2 + padding, boxY - boxH / 2 + 8, speaker.toUpperCase(), {
            fontFamily: '"Press Start 2P", monospace',
            fontSize,
            color: '#ffd700',
        }).setScrollFactor(0).setDepth(DEPTH.DIALOG_TEXT).setOrigin(0, 0);

        // Dialog text (typewriter)
        const textObj = this.add.text(width / 2 - boxW / 2 + padding, boxY - boxH / 2 + 24, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: textFontSize,
            color: '#ffffff',
            wordWrap: { width: boxW - padding * 2 - 16 },
            lineSpacing: 6,
        }).setScrollFactor(0).setDepth(DEPTH.DIALOG_TEXT).setOrigin(0, 0);

        // Advance indicator
        const indicator = this.add.text(width - padding - 8, boxY + boxH / 2 - 12, '\u25BC', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#ffd700',
        }).setScrollFactor(0).setDepth(DEPTH.DIALOG_TEXT).setOrigin(1, 1).setAlpha(0);

        // Blink the indicator
        this.tweens.add({
            targets: indicator,
            alpha: { from: 0, to: 1 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            delay: text.length * 30 + 200, // Start blinking after typewriter finishes
        });

        this.dialogElements = [bg, label, textObj, indicator];

        // Typewriter effect
        this._typewriterText = text;
        this._typewriterIndex = 0;
        this._typewriterObj = textObj;
        this._typewriterDone = false;

        this._typewriterTimer = this.time.addEvent({
            delay: 30,
            repeat: text.length - 1,
            callback: () => {
                this._typewriterIndex++;
                textObj.setText(text.substring(0, this._typewriterIndex));
                if (this._typewriterIndex >= text.length) {
                    this._typewriterDone = true;
                }
            },
        });
    }

    _dismissDialog() {
        if (!this.dialogActive) return;

        // If typewriter is still going, complete it instantly
        if (!this._typewriterDone) {
            if (this._typewriterTimer) this._typewriterTimer.remove();
            if (this._typewriterObj) {
                this._typewriterObj.setText(this._typewriterText);
            }
            this._typewriterDone = true;
            return; // First press completes text, second press dismisses
        }

        // Dismiss dialog
        for (const el of this.dialogElements) {
            if (el) el.destroy();
        }
        this.dialogElements = [];
        this.dialogActive = false;

        // Fire callback
        if (this._onDialogDismiss) {
            this._onDialogDismiss();
            this._onDialogDismiss = null;
        }
    }

    // ════════════════════════════════════════════════════
    // Door Transitions
    // ════════════════════════════════════════════════════

    _enterDoor(door) {
        if (!door.nextMap) {
            this._showDialog('Door', 'This door appears to be locked.');
            return;
        }

        // Prevent double-trigger
        if (this._doorTransitioning) return;
        this._doorTransitioning = true;

        console.log(`[WorldScene] Entering door → ${door.nextMap} (room: ${door.nextMapRoom || 'default'})`);

        // Freeze player movement and save position immediately
        this.gridEngine.stopMovement('player');
        const pos = this.gridEngine.getPosition('player');
        GameState.state.overworldPosition = { x: pos.x, y: pos.y };

        const launchData = {
            venueId: door.nextMap,
            roomId: door.nextMapRoom || null,
            returnScene: 'WorldScene',
            returnArgs: { spawnX: pos.x, spawnY: pos.y + 1 },
        };

        const { width, height } = this.cameras.main;

        // Black overlay + location name (Pokemon-style building enter)
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
            .setDepth(999).setScrollFactor(0);

        const label = door.label || door.nextMap.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const locationText = this.add.text(width / 2, height / 2, label, {
            fontFamily: '"Press Start 2P", monospace', fontSize: '14px',
            color: '#f0d060', align: 'center',
        }).setOrigin(0.5).setDepth(1000).setScrollFactor(0).setAlpha(0);

        // Animate: fade to black → show location name → launch scene
        this.tweens.add({
            targets: overlay, alpha: 1, duration: 400, ease: 'Power2',
            onComplete: () => {
                locationText.setAlpha(1);
                // Brief hold to show location name, then transition
                this.time.delayedCall(500, () => {
                    console.log(`[WorldScene] Launching LocationScene with`, launchData);
                    GameEventBus.emit(GameEvents.SCENE_EXIT, 'WorldScene');
                    this.scene.stop();
                    GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'LocationScene', launchData);
                });
            },
        });
    }

    // ════════════════════════════════════════════════════
    // Grass Encounters
    // ════════════════════════════════════════════════════

    _checkGrassEncounter(pos) {
        if (this.grassCooldown > 0) return;
        if (this.dialogActive) return;

        const inGrass = this.grassTiles.has(`${pos.x},${pos.y}`);
        if (!inGrass) return;

        // Don't trigger on the same tile twice in a row
        if (pos.x === this.lastGrassCheck.x && pos.y === this.lastGrassCheck.y) return;
        this.lastGrassCheck = { x: pos.x, y: pos.y };

        // ~20% chance per grass tile
        if (Math.random() > 0.20) return;

        this.grassCooldown = 3000; // 3 second cooldown

        const encounter = GRASS_ENCOUNTERS[Math.floor(Math.random() * GRASS_ENCOUNTERS.length)];
        WebAudioService.notify();

        this._showDialog('Encounter', encounter.text, () => {
            if (encounter.effect && GameState.state) {
                GameState.applyEffects({ ...encounter.effect, _silent: true });
            }
        });
    }

    // ════════════════════════════════════════════════════
    // Event Trigger Zones
    // ════════════════════════════════════════════════════

    _checkEventTrigger(pos) {
        if (this.dialogActive) return;

        const eventId = this.eventZones.get(`${pos.x},${pos.y}`);
        if (!eventId) return;

        // Ensure we don't rapid-fire the same event by returning if we just checked it
        if (pos.x === this.lastGrassCheck.x && pos.y === this.lastGrassCheck.y) return;
        this.lastGrassCheck = { x: pos.x, y: pos.y };

        console.log(`[WorldScene] Stepped on Event Zone: ${eventId}`);

        // Emitting DEBUG_LAUNCH_SCENE temporarily routes us to the DialogueScene
        // with the requested event ID, suspending this scene automatically as it runs in parallel / modal
        GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'DialogueScene', {
            eventId,
            returnScene: 'WorldScene',
            returnArgs: { mapKey: this.mapKey },
        });
    }

    // ════════════════════════════════════════════════════
    // Item Pickup
    // ════════════════════════════════════════════════════

    _checkItemPickup(pos) {
        for (let i = this.itemSprites.length - 1; i >= 0; i--) {
            const item = this.itemSprites[i];
            if (item.x === pos.x && item.y === pos.y && !this.itemsCollected.has(item.id)) {
                this.itemsCollected.add(item.id);

                // Save to GameState
                if (GameState.state) {
                    GameState.state.collectedItems = [...this.itemsCollected];
                }

                // Remove sprite with a quick scale-down
                this.tweens.add({
                    targets: item.sprite,
                    scaleX: 0,
                    scaleY: 0,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => item.sprite.destroy(),
                });

                WebAudioService.itemPickup();
                this._showDialog('Found Item', `You found: ${item.name}!`);

                this.itemSprites.splice(i, 1);
                break;
            }
        }
    }

    // ════════════════════════════════════════════════════
    // Daylight Overlay
    // ════════════════════════════════════════════════════

    _applyDaylight() {
        if (!this.daylightOverlay) return;
        const { width, height } = this.scale;
        this.daylightOverlay.clear();

        const hour = GameState.state?.hour ?? 8;
        const minute = GameState.state?.minute ?? 0;

        let alpha = 0;
        const timeDec = hour + minute / 60;

        // Narrative Lighting Scale:
        // 8am - 5pm (17:00): 0 alpha (Bright)
        // 5pm - 8pm (20:00): Ramp to 0.45
        // 8pm - 4am (04:00): 0.45 alpha (Dark/Night)
        // 4am - 8am (08:00): Ramp to 0 (Dawn)
        if (timeDec >= 17 && timeDec < 20) {
            alpha = ((timeDec - 17) / 3) * 0.45;
        } else if (timeDec >= 20 || timeDec < 4) {
            alpha = 0.45;
        } else if (timeDec >= 4 && timeDec < 8) {
            alpha = 0.45 - (((timeDec - 4) / 4) * 0.45);
        }

        this.daylightOverlay.fillStyle(0x000033, alpha);
        this.daylightOverlay.fillRect(0, 0, width, height);
    }

    // ════════════════════════════════════════════════════
    // Wipe Transition (pokemon-phaser inspired)
    // ════════════════════════════════════════════════════

    _playWipeTransition() {
        const { width, height } = this.scale;

        const topWipe = this.add.rectangle(width / 2, 0, width, height / 2, 0x000000)
            .setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.WIPE);
        const bottomWipe = this.add.rectangle(width / 2, height, width, height / 2, 0x000000)
            .setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH.WIPE);

        this.tweens.add({
            targets: topWipe,
            scaleY: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => topWipe.destroy(),
        });
        this.tweens.add({
            targets: bottomWipe,
            scaleY: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => bottomWipe.destroy(),
        });
    }

    // ════════════════════════════════════════════════════
    // Location Name Toast
    // ════════════════════════════════════════════════════

    _showLocationToast(name) {
        const { width } = this.scale;
        const barH = 40;

        const bg = this.add.rectangle(width / 2, -barH / 2, width, barH, 0x000000, 0.75)
            .setScrollFactor(0).setDepth(DEPTH.HUD);

        const text = this.add.text(width / 2, -barH / 2, name, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#ffffff',
            letterSpacing: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

        // Slide down
        this.tweens.add({
            targets: [bg, text],
            y: barH / 2,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                // Hold, then fade out
                this.time.delayedCall(2000, () => {
                    this.tweens.add({
                        targets: [bg, text],
                        alpha: 0,
                        duration: 600,
                        onComplete: () => {
                            bg.destroy();
                            text.destroy();
                        },
                    });
                });
            },
        });
    }

    // ════════════════════════════════════════════════════
    // Stats HUD — persistent Artnet-inspired data bar
    // ════════════════════════════════════════════════════

    _buildStatsHUD() {
        const { width } = this.scale;
        const barH = 24;
        const textStyle = {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#c9a84c', // gold accent (Artnet-inspired)
            stroke: '#000000',
            strokeThickness: 2,
        };

        // Semi-transparent background bar
        this._hudBg = this.add.rectangle(width / 2, barH / 2, width, barH, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(DEPTH.HUD - 1);

        // Player name (left)
        const s = GameState.state;
        const name = s?.playerName || 'Player';
        this._hudName = this.add.text(8, 5, name, { ...textStyle, color: '#c9a84c' })
            .setScrollFactor(0).setDepth(DEPTH.HUD);

        // Location (center)
        this._hudLocation = this.add.text(width / 2, 5, 'PALLET TOWN', { ...textStyle, color: '#ffffff' })
            .setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.HUD);

        // Stats (right) — Cash / Rep / Week
        const cash = s?.cash ? `$${Math.round(s.cash / 1000)}K` : '$0';
        const rep = `REP ${s?.reputation || 0}`;
        const week = `WK ${s?.week || 1}`;
        this._hudStats = this.add.text(width - 8, 5, `${cash}  ${rep}  ${week}`, { ...textStyle, color: '#aaaaaa', fontSize: '6px' })
            .setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.HUD);

        // Track last update time for rate-limiting refreshes
        this._hudLastUpdate = 0;
    }

    /** Refresh HUD text — called from update(), rate-limited to every 500ms. */
    _updateStatsHUD() {
        if (!this._hudStats) return;
        const now = this.time.now;
        if (now - this._hudLastUpdate < 500) return;
        this._hudLastUpdate = now;

        const s = GameState.state;
        if (!s) return;
        const cash = `$${Math.round(s.cash / 1000)}K`;
        const rep = `REP ${s.reputation || 0}`;
        const week = `WK ${s.week || 1}`;
        this._hudStats.setText(`${cash}  ${rep}  ${week}`);
    }

    // ════════════════════════════════════════════════════
    // Exit
    // ════════════════════════════════════════════════════

    exitScene() {
        if (this.dialogActive) this._dismissDialog();

        // Save final position
        if (this.gridEngine && GameState.state) {
            try {
                const pos = this.gridEngine.getPosition('player');
                GameState.state.overworldPosition = { x: pos.x, y: pos.y };
            } catch (e) { /* ignore */ }
        }

        window.joypadState = null;
        window.joypadSprint = false;
        window.joypadAction = false;
        WebAudioService.sceneExit();

        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            GameEventBus.emit(GameEvents.SCENE_EXIT, 'WorldScene');
            GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
            this.showTerminalUI();
            this.scene.stop();
        });
    }

    // ════════════════════════════════════════════════════
    // Cleanup (called by BaseScene shutdown event)
    // ════════════════════════════════════════════════════

    cleanup() {
        window.joypadState = null;
        window.joypadSprint = false;
        window.joypadAction = false;
        this.npcSprites = [];
        this.npcData = [];
        this.dialogElements = [];
        this.itemSprites = [];
        // Remove window-level keyboard listener
        if (this._windowKeyHandler) {
            window.removeEventListener('keydown', this._windowKeyHandler);
            this._windowKeyHandler = null;
        }
        GameEventBus.emit(GameEvents.SCENE_EXIT, 'WorldScene');
    }

    // ════════════════════════════════════════════════════
    // Error Display
    // ════════════════════════════════════════════════════

    _showError(msg) {
        const { width, height } = this.scale;
        this.add.text(width / 2, height / 2 - 20, 'WorldScene Error', {
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
    }
}
