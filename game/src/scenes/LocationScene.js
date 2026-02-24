/**
 * LocationScene.js — Top-Down Exploration Engine for interior rooms
 *
 * Supports two modes:
 *   1. Tiled mode: Tiled JSON map + GridEngine (gallery_test, Soho, Chelsea, etc.)
 *   2. Classic mode: hardcoded tile array + Arcade physics (legacy venues)
 *
 * Key features:
 *   - Wall collision enforcement on the `world` tile layer
 *   - Artwork popup with ARTWORKS database integration (via artworkId property)
 *   - NPC dialogue tree integration (via TREES_BY_NPC lookup)
 *   - NPC meetContact integration with npcStore
 *   - Door transitions between rooms and back to WorldScene
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { VENUES, VENUE_MAP } from '../data/rooms.js';
import { CONTACTS } from '../data/contacts.js';
import { DIALOGUE_TREES, TREES_BY_NPC } from '../data/dialogue_trees.js';
import { DialogueTreeManager } from '../managers/DialogueTreeManager.js';
import { QualityGate } from '../managers/QualityGate.js';
import { GameState } from '../managers/GameState.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { SCENE_KEYS } from '../data/scene-keys.js';
import { ARTWORK_MAP } from '../data/artworks.js';
import { useNPCStore } from '../stores/npcStore.js';
import { useCmsStore } from '../stores/cmsStore.js';
import { VIEW } from '../constants/views.js';
import { safeSceneStart, safeSceneLaunch } from '../utils/safeScene.js';

// ── Layer depth constants (matches WorldScene) ──
const DEPTH = {
    BELOW_PLAYER: 0,
    WORLD: 2,
    ABOVE_PLAYER: 100,
    POPUP_BG: 200,
    POPUP_TEXT: 201,
    HUD: 500,
};

const LAYER_DEPTHS = {
    below_player: DEPTH.BELOW_PLAYER,
    world: DEPTH.WORLD,
    above_player: DEPTH.ABOVE_PLAYER,
};

// ── Contact lookup for NPC sprite resolution ──
const CONTACT_MAP = Object.fromEntries(CONTACTS.map(c => [c.id, c]));

/**
 * LocationScene — Top-Down Exploration Engine
 * Supports two modes:
 *   1. Classic mode: hardcoded tile array + Arcade physics (existing venues)
 *   2. Tiled mode: Tiled JSON map + GridEngine (gallery_test, future interiors)
 */
export class LocationScene extends BaseScene {
    constructor() {
        super('LocationScene');
    }

    preload() {
        this.load.image('kenney_indoor', 'assets/tilesets/kenney_roguelike_indoors/Tilesheets/roguelikeIndoor_transparent.png');

        // Overworld tilesets (needed for Tiled interior maps that share the outdoor tileset)
        const overworldTilesets = ['grounds', 'world', 'world2', 'grounds2'];
        for (const ts of overworldTilesets) {
            if (!this.textures.exists(ts)) {
                this.load.image(ts, `assets/tilesets/${ts}.png`);
            }
        }

        // Gallery-specific tilesets
        if (!this.textures.exists('gallery_tileset')) {
            this.load.image('gallery_tileset', 'assets/tilesets/gallery_tileset.png');
        }
        // LimeZu Modern Interiors tilesets (professional 48x48)
        if (!this.textures.exists('Room_Builder_free_48x48')) {
            this.load.image('Room_Builder_free_48x48', 'assets/tilesets/Room_Builder_free_48x48.png');
        }
        if (!this.textures.exists('Interiors_free_48x48')) {
            this.load.image('Interiors_free_48x48', 'assets/tilesets/Interiors_free_48x48.png');
        }
        // Fossil Museum tileset (Princess-Phoenix, scaled 16→48px)
        if (!this.textures.exists('fossil_museum_48x48')) {
            this.load.image('fossil_museum_48x48', 'assets/tilesets/fossil_museum_48x48.png');
        }
        // Themed LimeZu tilesets (premium Modern Interiors pack)
        const themedSets = ['7_Art_48x48', '22_Museum_48x48', '1_Generic_48x48', '13_Conference_Hall_48x48', '2_LivingRoom_48x48'];
        for (const ts of themedSets) {
            if (!this.textures.exists(ts)) {
                this.load.image(ts, `assets/tilesets/${ts}.png`);
            }
        }

        // Gallery sprite assets (furniture, paintings, decorations)
        const gallerySprites = [
            'gallery_bench', 'gallery_pedestal', 'gallery_desk', 'gallery_plant',
            'gallery_rope', 'gallery_rope_end', 'gallery_wine_table', 'gallery_sign',
            'gallery_decorations', 'track_light', 'red_dot', 'price_list',
            'painting_small_abstract', 'painting_medium_landscape',
            'painting_large_portrait', 'painting_large_modern',
            'painting_small_photo', 'painting_empty_frame',
        ];
        for (const key of gallerySprites) {
            if (!this.textures.exists(key)) {
                this.load.image(key, `sprites/gallery/${key}.png`);
            }
        }

        // NPC dealer spritesheet (3 cols × 4 rows, 48×48 frames)
        if (!this.textures.exists('npc_dealer')) {
            this.load.spritesheet('npc_dealer', 'sprites/gallery/npc_dealer.png', {
                frameWidth: 48, frameHeight: 48,
            });
        }

        // Player sprite for Tiled mode (same as WorldScene)
        if (!this.textures.exists('world_player')) {
            this.load.spritesheet('world_player', 'assets/sprites/player.png', {
                frameWidth: 72, frameHeight: 96,
            });
        }

        // LimeZu character sprites for NPCs (16×32 frames, 24 per strip, scale 3x for 48px tiles)
        const limeZuChars = ['adam', 'alex', 'amelia', 'bob'];
        for (const name of limeZuChars) {
            const runKey = `lz_${name}_run`;
            if (!this.textures.exists(runKey)) {
                this.load.spritesheet(runKey, `sprites/characters/${name}_run.png`, {
                    frameWidth: 16, frameHeight: 32,
                });
            }
            const idleKey = `lz_${name}_idle`;
            if (!this.textures.exists(idleKey)) {
                this.load.spritesheet(idleKey, `sprites/characters/${name}_idle.png`, {
                    frameWidth: 16, frameHeight: 32,
                });
            }
        }

        const npcKeys = [
            'walk_legacy_gallerist_walk', 'walk_auction_house_type_walk', 'walk_elena_ross_walk',
            'walk_old_money_gallerist_walk', 'walk_academic_curator_walk', 'walk_young_artist_walk',
            'walk_art_flipper_walk', 'walk_tech_collector_f_walk', 'walk_power_collector_f_walk',
            'walk_art_critic_walk', 'walk_young_power_dealer_walk', 'walk_underground_connector_walk',
            'walk_it_girl_dealer_walk', 'walk_margaux_villiers_walk', 'walk_avant_garde_curator_walk',
            'walk_julian_vance_walk'
        ];

        npcKeys.forEach(key => {
            this.load.spritesheet(key, `sprites/${key}.png`, { frameWidth: 160, frameHeight: 160 });
        });

        if (!this.textures.exists('placeholder_exit')) {
            const gfx = this.add.graphics();
            gfx.fillStyle(0x4488cc, 1);
            gfx.fillRect(0, 0, 16, 16);
            gfx.generateTexture('placeholder_exit', 16, 16);
            gfx.destroy();
        }

        // Preload ALL Tiled maps referenced by venues in rooms.js.
        // Phaser deduplicates internally — loading an already-cached map is a no-op.
        // This ensures any venue's Tiled rooms are available without scene restart.
        const allTiledMaps = new Set();
        for (const venue of VENUES) {
            for (const room of venue.rooms) {
                if (room.tiledMap) allTiledMaps.add(room.tiledMap);
            }
        }
        for (const mapId of allTiledMaps) {
            if (!this.cache.tilemap.has(`map_${mapId}`)) {
                this.load.tilemapTiledJSON(`map_${mapId}`, `content/maps/${mapId}.json`);
            }
        }
    }

    create(data) {
        super.create({ ...data, hideUI: true });

        this.venueId = data?.venueId || 'gallery_opening';
        this.returnScene = data?.returnScene || null;
        this.returnArgs = data?.returnArgs || {};
        this._popupActive = false;
        this._lastViewedPainting = null;

        const venue = VENUE_MAP[this.venueId];
        // Use provided roomId, or fall back to venue's startRoom, or legacy default
        this.roomId = data?.roomId || (venue?.startRoom) || 'chelsea_main_floor';
        this.roomData = venue ? venue.rooms.find(r => r.id === this.roomId) : null;

        console.log(`[LocationScene] venueId=${this.venueId} roomId=${this.roomId} venue=${!!venue} roomData=${!!this.roomData} tiledMap=${this.roomData?.tiledMap || 'none'}`);

        // Venue time budget
        if (data && data.venueTimeRemaining !== undefined) {
            this.venueTimeRemaining = data.venueTimeRemaining;
        } else if (venue) {
            this.venueTimeRemaining = venue.timeLimit || 5;
            GameState.consumeAction();
        } else {
            this.venueTimeRemaining = 5;
        }

        // Resolve player sprite key
        const charId = GameState.state?.character?.id || 'julian_vance';
        this.playerSpriteKey = `walk_${charId}_walk`;

        // Setup sprite animations (legacy walk_ spritesheets)
        const npcKeys = Object.keys(this.textures.list).filter(k => k.startsWith('walk_'));
        npcKeys.forEach(key => {
            if (!this.anims.exists(`${key}_down`)) {
                this.anims.create({ key: `${key}_down`, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
                this.anims.create({ key: `${key}_left`, frames: this.anims.generateFrameNumbers(key, { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
                this.anims.create({ key: `${key}_right`, frames: this.anims.generateFrameNumbers(key, { start: 8, end: 11 }), frameRate: 6, repeat: -1 });
                this.anims.create({ key: `${key}_up`, frames: this.anims.generateFrameNumbers(key, { start: 12, end: 15 }), frameRate: 6, repeat: -1 });
            }
        });

        // LimeZu character animations (16×32, 6 frames per direction: down/left/right/up)
        const lzChars = ['adam', 'alex', 'amelia', 'bob'];
        for (const name of lzChars) {
            const runKey = `lz_${name}_run`;
            if (this.textures.exists(runKey) && !this.anims.exists(`${runKey}_down`)) {
                this.anims.create({ key: `${runKey}_down`, frames: this.anims.generateFrameNumbers(runKey, { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
                this.anims.create({ key: `${runKey}_left`, frames: this.anims.generateFrameNumbers(runKey, { start: 6, end: 11 }), frameRate: 8, repeat: -1 });
                this.anims.create({ key: `${runKey}_right`, frames: this.anims.generateFrameNumbers(runKey, { start: 12, end: 17 }), frameRate: 8, repeat: -1 });
                this.anims.create({ key: `${runKey}_up`, frames: this.anims.generateFrameNumbers(runKey, { start: 18, end: 23 }), frameRate: 8, repeat: -1 });
            }
        }

        const { width, height } = this.scale;

        this.cameras.main.fadeIn(300, 0, 0, 0);
        this.add.rectangle(width / 2, height / 2, width, height, 0x14141f).setDepth(-1);
        this.cameras.main.setBackgroundColor('#14141f');

        try {
            const vignette = this.cameras.main.postFX.addVignette();
            vignette.radius = 0.85;
        } catch (e) { /* Canvas renderer fallback */ }

        if (!this.roomData) {
            this.add.text(width / 2, height / 2, `Error: Room missing.`).setOrigin(0.5);
            this.time.delayedCall(2000, () => this.leaveLocation());
            return;
        }

        // ── Branch: Tiled JSON map or classic hardcoded map ──
        if (this.roomData.tiledMap) {
            this._createTiledScene(data);
        } else {
            this._createClassicScene(data);
        }

        // ── Common UI ──
        this._createHUD(width, height);
    }

    // ════════════════════════════════════════════════════
    // Tiled Map Mode (GridEngine + Tiled JSON)
    // ════════════════════════════════════════════════════

    _createTiledScene(data) {
        this._isTiledMode = true;

        const mapKey = `map_${this.roomData.tiledMap}`;

        // ── CMS map override: if MapEditor has saved edits, inject them into the cache ──
        const cmsMap = useCmsStore.getState().getMapSnapshot?.(this.roomData.tiledMap);
        if (cmsMap) {
            try {
                this.cache.tilemap.add(mapKey, { data: cmsMap, format: Phaser.Tilemaps.Formats.TILED_JSON });
                console.log(`[LocationScene] Using CMS-edited map for: ${this.roomData.tiledMap}`);
            } catch (e) {
                console.warn('[LocationScene] Failed to inject CMS map, using preloaded', e);
            }
        }

        // Build tilemap from preloaded JSON — wrapped in try/catch for resilience
        try {
            this.map = this.make.tilemap({ key: mapKey });
        } catch (err) {
            console.error(`[LocationScene] Failed to create tilemap: ${mapKey}`, err);
            if (window.ArtLife) window.ArtLife.recordError('tilemap_load', err.message);
            this._createClassicScene(data);
            return;
        }

        // Check for background image mode — pre-composed room PNG used as visual backdrop
        // The bgImage property is set by bg_room_builder.py on maps using premium LimeZu artwork
        const bgImageProp = this.map.properties?.bgImage
            || this.map.properties?.find?.(p => p.name === 'bgImage')?.value;

        if (bgImageProp && this.textures.exists(`bg_room_${this.roomData.tiledMap}`)) {
            // Display pre-composed room image as the visual layer
            const bgKey = `bg_room_${this.roomData.tiledMap}`;
            this._bgImage = this.add.image(0, 0, bgKey)
                .setOrigin(0, 0)
                .setDepth(DEPTH.BELOW_PLAYER);
            console.log(`[LocationScene] Using background image: ${bgKey}`);
        }

        // Add all tilesets referenced in the map
        const allSets = [];
        for (const tsData of this.map.tilesets) {
            const ts = this.map.addTilesetImage(tsData.name, tsData.name);
            if (ts) allSets.push(ts);
        }

        if (allSets.length === 0 && !this._bgImage) {
            console.error('[LocationScene] No tilesets loaded for Tiled map');
            this._createClassicScene(data);
            return;
        }

        // Render tile layers (collision layer is invisible when using bg image)
        for (const layerData of this.map.layers) {
            const name = layerData.name;
            if (name === 'objects') continue;
            const layer = this.map.createLayer(name, allSets);
            if (layer) {
                layer.setDepth(LAYER_DEPTHS[name] ?? DEPTH.WORLD);
                // Hide the collision-only world layer when using background image
                if (this._bgImage && name === 'world') {
                    layer.setAlpha(0);
                }
            }
        }

        // Parse objects
        const objectLayer = this.map.getObjectLayer('objects');
        const objects = objectLayer?.objects || [];
        const tileW = this.map.tileWidth;
        const tileH = this.map.tileHeight;

        let spawnX = 5, spawnY = 8;
        this._tiledDoors = [];
        this._tiledDialogs = [];
        this._tiledPaintings = [];
        this._tiledNPCs = [];

        for (const obj of objects) {
            const tx = Math.floor(obj.x / tileW);
            const ty = Math.floor(obj.y / tileH);
            const props = {};
            if (obj.properties) {
                for (const p of obj.properties) props[p.name] = p.value;
            }

            const nameOrType = obj.name || obj.type || '';

            if (nameOrType === 'spawn') {
                spawnX = tx;
                spawnY = ty;
            } else if (nameOrType === 'door') {
                this._tiledDoors.push({ x: tx, y: ty, ...props });
            } else if (nameOrType === 'dialog') {
                this._tiledDialogs.push({ x: tx, y: ty, content: props.content || obj.name, ...props });
            } else if (nameOrType === 'painting') {
                this._tiledPaintings.push({ x: tx, y: ty, ...props });
            } else if (nameOrType === 'npc') {
                this._tiledNPCs.push({ x: tx, y: ty, ...props });
            }
        }

        // Override spawn from data if returning from another scene
        if (data?.spawnX != null) spawnX = data.spawnX;
        if (data?.spawnY != null) spawnY = data.spawnY;

        // ── Player sprite ──
        const spriteKey = this.textures.exists('world_player') ? 'world_player' : 'player_walk';
        this.player = this.add.sprite(0, 0, spriteKey);
        this.player.setDepth(4);

        // Register player walk animations for this spritesheet
        if (!this.anims.exists('loc_walk_down')) {
            const dirs = [
                { key: 'loc_walk_down', start: 0, end: 2 },
                { key: 'loc_walk_left', start: 3, end: 5 },
                { key: 'loc_walk_right', start: 6, end: 8 },
                { key: 'loc_walk_up', start: 9, end: 11 },
            ];
            dirs.forEach(({ key, start, end }) => {
                this.anims.create({
                    key, frames: this.anims.generateFrameNumbers(spriteKey, { start, end }),
                    frameRate: 8, repeat: -1
                });
            });
        }

        // NPC dealer walk animations (3 cols × 4 rows, 48×48)
        if (this.textures.exists('npc_dealer') && !this.anims.exists('dealer_walk_down')) {
            const dealerDirs = [
                { key: 'dealer_walk_down', start: 0, end: 2 },
                { key: 'dealer_walk_left', start: 3, end: 5 },
                { key: 'dealer_walk_right', start: 6, end: 8 },
                { key: 'dealer_walk_up', start: 9, end: 11 },
            ];
            dealerDirs.forEach(({ key, start, end }) => {
                this.anims.create({
                    key, frames: this.anims.generateFrameNumbers('npc_dealer', { start, end }),
                    frameRate: 6, repeat: -1,
                });
            });
        }

        // Gallery NPC walk animations (3 cols × 4 rows, 48×96 frames)
        // Same frame layout as npc_dealer: down(0-2), left(3-5), right(6-8), up(9-11)
        const galleryNPCKeys = [
            'npc_curator', 'npc_collector', 'npc_gallerist', 'npc_artist', 'npc_patron',
            'npc_critic', 'npc_assistant', 'npc_handler', 'npc_guard', 'npc_visitor',
        ];
        galleryNPCKeys.forEach(npcKey => {
            if (this.textures.exists(npcKey) && !this.anims.exists(`${npcKey}_walk_down`)) {
                const dirs = [
                    { key: `${npcKey}_walk_down`, start: 0, end: 2 },
                    { key: `${npcKey}_walk_left`, start: 3, end: 5 },
                    { key: `${npcKey}_walk_right`, start: 6, end: 8 },
                    { key: `${npcKey}_walk_up`, start: 9, end: 11 },
                ];
                dirs.forEach(({ key, start, end }) => {
                    this.anims.create({
                        key, frames: this.anims.generateFrameNumbers(npcKey, { start, end }),
                        frameRate: 6, repeat: -1,
                    });
                });
            }
        });

        // ── Spawn NPC sprites ──
        // Priority: contact-specific walk sprite > gallery NPC > LimeZu > fallback
        const GALLERY_NPCS = [
            'npc_curator', 'npc_collector', 'npc_gallerist', 'npc_artist', 'npc_patron',
            'npc_critic', 'npc_assistant', 'npc_handler', 'npc_guard', 'npc_visitor',
        ];
        const LZ_CHARS = ['adam', 'alex', 'amelia', 'bob'];
        const npcCharacters = [];
        this._tiledNPCs.forEach((npc, i) => {
            const npcId = `gallery_npc_${i}`;

            // Resolve contact data from Tiled NPC id property
            const contact = npc.id ? CONTACT_MAP[npc.id] : null;
            const contactSpriteKey = contact?.spriteKey;

            const galleryKey = GALLERY_NPCS[i % GALLERY_NPCS.length];
            const lzName = LZ_CHARS[i % LZ_CHARS.length];
            const lzRunKey = `lz_${lzName}_run`;
            let npcSprite;
            let npcSpriteScale = 1;
            let npcSpriteKey = null;

            if (contactSpriteKey && this.textures.exists(contactSpriteKey)) {
                // Contact-specific walk spritesheet (160×160 frames, preloaded above)
                npcSprite = this.add.sprite(0, 0, contactSpriteKey, 0).setDepth(4);
                npcSpriteKey = contactSpriteKey;
            } else if (this.textures.exists(galleryKey)) {
                // LimeZu premade 48×96 character — offset up so feet sit on tile
                npcSprite = this.add.sprite(0, 0, galleryKey, 0).setDepth(4);
                npcSprite.setOrigin(0.5, 0.75);
                npcSpriteKey = galleryKey;
            } else if (this.textures.exists(lzRunKey)) {
                // LimeZu 16×32 sprite — needs 3x scale for 48px tiles
                npcSprite = this.add.sprite(0, 0, lzRunKey, 0).setDepth(4);
                npcSpriteScale = 3;
                npcSprite.setScale(npcSpriteScale);
            } else if (this.textures.exists('npc_dealer')) {
                npcSprite = this.add.sprite(0, 0, 'npc_dealer').setDepth(4);
            } else {
                const fallback = this.textures.exists('world_player') ? 'world_player' : 'player_walk';
                npcSprite = this.add.sprite(0, 0, fallback).setDepth(4);
            }

            // NPC label — prefer contact name over Tiled label
            const displayName = contact?.name || npc.label || npc.id || 'NPC';
            this.add.text(npc.x * tileW + tileW / 2, npc.y * tileH - 12,
                displayName, {
                    fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ffaaaa',
                    stroke: '#000000', strokeThickness: 2,
                }).setOrigin(0.5).setDepth(DEPTH.HUD);

            npcCharacters.push({
                id: npcId,
                sprite: npcSprite,
                startPosition: { x: npc.x, y: npc.y },
                data: npc,
                contactId: contact?.id || null,
                lzName: this.textures.exists(lzRunKey) ? lzName : null,
                galleryKey: npcSpriteKey,
                scale: npcSpriteScale,
            });
        });

        // ── Painting sprites on map ──
        this._tiledPaintings.forEach(p => {
            const spriteKey = p.sprite || 'painting_small_abstract';
            if (this.textures.exists(spriteKey)) {
                const sprite = this.add.image(
                    p.x * tileW + tileW / 2,
                    p.y * tileH + tileH / 2,
                    spriteKey
                ).setDepth(DEPTH.WORLD + 1);
                p._sprite = sprite;
            } else {
                // Fallback gold diamond marker
                const gfx = this.add.graphics();
                gfx.fillStyle(0xc9a84c, 0.8);
                gfx.fillRect(-4, -4, 8, 8);
                gfx.setPosition(p.x * tileW + tileW / 2, p.y * tileH + tileH / 2);
                gfx.setDepth(DEPTH.WORLD + 1);
            }
        });

        // ── Furniture sprites on map ──
        this._tiledFurniture = [];
        for (const obj of objects) {
            const nameOrType = obj.name || obj.type || '';
            if (nameOrType !== 'furniture') continue;
            const fProps = {};
            if (obj.properties) {
                for (const p of obj.properties) fProps[p.name] = p.value;
            }
            const fx = Math.floor(obj.x / tileW);
            const fy = Math.floor(obj.y / tileH);
            const spriteKey = fProps.sprite;
            if (spriteKey && this.textures.exists(spriteKey)) {
                const sprite = this.add.image(
                    fx * tileW + tileW / 2,
                    fy * tileH + tileH / 2,
                    spriteKey
                ).setDepth(DEPTH.WORLD + 1);
                this._tiledFurniture.push({ x: fx, y: fy, sprite, ...fProps });
            }
        }

        // ── GridEngine setup ──
        if (this.gridEngine) {
            const characters = [
                {
                    id: 'player',
                    sprite: this.player,
                    startPosition: { x: spawnX, y: spawnY },
                    speed: 3,
                },
                ...npcCharacters.map(npc => ({
                    id: npc.id,
                    sprite: npc.sprite,
                    startPosition: npc.startPosition,
                    speed: 1,
                })),
            ];

            this.gridEngine.create(this.map, {
                collisionTilePropertyName: 'collides',
                characters,
            });

            // Enforce wall collision: mark ALL non-empty tiles in the `world` layer
            // as colliding. This is necessary because GIDs often don't carry the
            // `collides` property from the tileset definition. The layer convention is:
            //   below_player = floor/decorative (walkable)
            //   world = walls/furniture (colliding)
            //   above_player = overlay (visual only)
            const worldLayer = this.map.getLayer('world')?.tilemapLayer;
            if (worldLayer) {
                worldLayer.forEachTile(tile => {
                    if (tile.index > 0) {
                        tile.properties = tile.properties || {};
                        tile.properties.collides = true;
                    }
                });
            }

            // Camera follow player with smooth lerp (matching WorldScene)
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

            // Fixed zoom like WorldScene — keeps player visible and centered
            const { width: vw } = this.scale;
            const zoom = vw < 500 ? 2.5 : 2;
            this.cameras.main.setZoom(zoom);
            this.cameras.main.roundPixels = true;

            // ── NPC random walk + walk animation hooks ──
            npcCharacters.forEach(npc => {
                this.gridEngine.moveRandomly(npc.id, 1500, 3);
            });

            this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
                if (charId === 'player') return;
                const npc = npcCharacters.find(n => n.id === charId);
                if (!npc?.galleryKey) return;
                // Try walk_ spritesheet animation (4 dirs × 4 frames)
                const animKey = `${npc.galleryKey}_${direction.toLowerCase()}`;
                if (this.anims.exists(animKey) && npc.sprite?.anims) {
                    npc.sprite.anims.play(animKey, true);
                }
            });
            this.gridEngine.movementStopped().subscribe(({ charId }) => {
                if (charId === 'player') return;
                const npc = npcCharacters.find(n => n.id === charId);
                if (npc?.sprite?.anims) npc.sprite.anims.stop();
            });
        } else {
            console.warn('[LocationScene] GridEngine not available, falling back to basic movement');
            // Simple physics fallback
            this.physics.add.existing(this.player);
            this.player.setPosition(spawnX * tileW + tileW / 2, spawnY * tileH + tileH / 2);
            this.player.body.setCollideWorldBounds(true);
            this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        }

        // ── Input ──
        this.cursors = this.input.keyboard.createCursorKeys();
        this._wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };
        this._keys = {
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            esc: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
            e: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        };

        this._npcCharacters = npcCharacters;
        this._lastInteractTime = 0;

        // Window-level SPACE/ESC fallback — Phaser keyboard requires canvas focus
        this._windowKeyHandler = (e) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                if (this._popupActive) {
                    this._updatePopup();
                } else {
                    const now = Date.now();
                    if (now - this._lastInteractTime < 200) return;
                    this._lastInteractTime = now;
                    this._tiledInteract();
                }
            } else if (e.code === 'Escape') {
                this.leaveLocation();
            } else if (e.code === 'KeyE' && this._popupActive) {
                this._closePopup();
                this._startHaggleForPainting(this._lastViewedPainting);
            }
        };
        window.addEventListener('keydown', this._windowKeyHandler);

        // Handle resize for responsive zoom
        this.scale.on('resize', (gameSize) => {
            if (!this.cameras?.main) return;
            const w = gameSize.width;
            const newZoom = w < 500 ? 2.5 : 2;
            this.cameras.main.setZoom(newZoom);
        });

        // Location name toast (Pokemon-style)
        this._showLocationToast(this.roomData.name || this.venueId);

        // Signal React to show mobile controls (same pattern as WorldScene)
        this._sceneReady = true;
    }

    _showLocationToast(name) {
        const { width } = this.scale;
        const barH = 36;

        const bg = this.add.rectangle(width / 2, -barH / 2, width, barH, 0x000000, 0.75)
            .setScrollFactor(0).setDepth(DEPTH.HUD);
        const text = this.add.text(width / 2, -barH / 2, name.toUpperCase(), {
            fontFamily: '"Press Start 2P", monospace', fontSize: '10px',
            color: '#ffffff', letterSpacing: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

        this.tweens.add({
            targets: [bg, text], y: barH / 2, duration: 400, ease: 'Power2',
            onComplete: () => {
                this.time.delayedCall(2000, () => {
                    this.tweens.add({
                        targets: [bg, text], alpha: 0, duration: 600,
                        onComplete: () => { bg.destroy(); text.destroy(); },
                    });
                });
            },
        });
    }

    // ════════════════════════════════════════════════════
    // Classic Mode (Hardcoded tile array + Arcade physics)
    // ════════════════════════════════════════════════════

    _createClassicScene(data) {
        this._isTiledMode = false;

        const { width, height } = this.scale;

        const level = [
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
        ];

        const map = this.make.tilemap({ data: level, tileWidth: 16, tileHeight: 16 });
        const tiles = map.addTilesetImage('kenney_indoor', 'kenney_indoor', 16, 16, 0, 1);

        const mapW = 15 * 16 * 2;
        const mapH = 10 * 16 * 2;
        const ox = (width - mapW) / 2;
        const oy = (height - mapH) / 2;

        const layer = map.createLayer(0, tiles, ox, oy);
        layer.setScale(2);

        // Setup Room Interactables
        this.interactables = this.physics.add.group();
        this.populateRoom(width / 2, height / 2);

        // Player Setup
        const spriteKey = this.textures.exists(this.playerSpriteKey) ? this.playerSpriteKey : 'walk_julian_vance_walk';
        this.player = this.physics.add.sprite(width / 2, height / 2, spriteKey);
        this.player.setScale(2);
        this.player.setCollideWorldBounds(true);
        this.physics.world.setBounds(ox, oy, mapW, mapH);
        this.player.facing = 'down';

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(ox, oy, mapW, mapH);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.walkSpeed = 120;

        this.physics.add.collider(this.player, this.interactables);
    }

    // ════════════════════════════════════════════════════
    // Common HUD
    // ════════════════════════════════════════════════════

    _createHUD(width, height) {
        this.add.text(20, 20, `📍 ${this.roomData.name.toUpperCase()}`, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c9a84c'
        }).setScrollFactor(0).setDepth(DEPTH.HUD);

        const exitBtn = this.add.text(width - 20, 20, '[ LEAVE VENUE ]', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c94040'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(DEPTH.HUD);

        exitBtn.on('pointerover', () => exitBtn.setColor('#ff8888'));
        exitBtn.on('pointerout', () => exitBtn.setColor('#c94040'));
        exitBtn.on('pointerdown', () => this.leaveLocation());

        this.timeText = this.add.text(width - 20, 40, `⏰ Time Left: ${this.venueTimeRemaining}`, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#aaaaaa'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.HUD);

        // Narrative description popup
        if (this.roomData.desc) {
            this.descBox = this.add.rectangle(width / 2, height - 40, width - 40, 60, 0x111118, 0.9)
                .setScrollFactor(0).setDepth(DEPTH.HUD - 1);
            this.descBox.setStrokeStyle(1, 0x3a3a4e);
            this.descText = this.add.text(width / 2, height - 40, this.roomData.desc, {
                fontFamily: '"Playfair Display"', fontSize: '13px', color: '#d4d0cc',
                wordWrap: { width: width - 80 }, align: 'center'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD);

            this.time.delayedCall(5000, () => {
                this.tweens.add({ targets: [this.descBox, this.descText], alpha: 0, duration: 500 });
            });
        }

        // Interaction hint (Tiled mode)
        if (this._isTiledMode) {
            this._hintText = this.add.text(width / 2, height - 16, '', {
                fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#888888',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD).setAlpha(0);
        }
    }

    // ════════════════════════════════════════════════════
    // Update Loop
    // ════════════════════════════════════════════════════

    update(time, delta) {
        if (!this.player) return;

        // Emit SCENE_READY on first frame (enables mobile joypad in React)
        if (this._sceneReady && !this._readyEmitted) {
            this._readyEmitted = true;
            GameEventBus.emit(GameEvents.SCENE_READY, 'LocationScene');
        }

        if (this._popupActive) {
            this._updatePopup();
            return;
        }

        if (this._isTiledMode) {
            this._updateTiledMode(time, delta);
        } else {
            this._updateClassicMode(time, delta);
        }
    }

    _updateTiledMode(time, delta) {
        if (!this.gridEngine) return;

        // ESC to leave
        if (Phaser.Input.Keyboard.JustDown(this._keys.esc)) {
            this.leaveLocation();
            return;
        }

        // GridEngine movement (arrows + WASD + mobile joypad)
        if (!this.gridEngine.isMoving('player')) {
            const left = this.cursors.left.isDown || this._wasd.left.isDown || window.joypadState === 'LEFT';
            const right = this.cursors.right.isDown || this._wasd.right.isDown || window.joypadState === 'RIGHT';
            const up = this.cursors.up.isDown || this._wasd.up.isDown || window.joypadState === 'UP';
            const down = this.cursors.down.isDown || this._wasd.down.isDown || window.joypadState === 'DOWN';

            if (left) this.gridEngine.move('player', 'left');
            else if (right) this.gridEngine.move('player', 'right');
            else if (up) this.gridEngine.move('player', 'up');
            else if (down) this.gridEngine.move('player', 'down');
        }

        // Walk animation
        if (!this.player?.anims) return;
        const facing = this.gridEngine.getFacingDirection('player');
        const moving = this.gridEngine.isMoving('player');
        if (moving) {
            const animKey = `loc_walk_${facing}`;
            if (this.anims.exists(animKey)) this.player.anims.play(animKey, true);
        } else {
            this.player.anims.stop();
        }

        // Auto-trigger door when player steps onto it (Pokemon-style walk-through)
        // Skip on first few frames to prevent instant exit when spawning on/near a door
        if (!this._doorTransitioning && this._frameCount > 10) {
            const pos = this.gridEngine.getPosition('player');
            const doorUnderPlayer = this._tiledDoors.find(d => d.x === pos.x && d.y === pos.y);
            if (doorUnderPlayer) {
                this._doorTransitioning = true;
                if (doorUnderPlayer.nextMap === 'worldscene') {
                    this.leaveLocation();
                } else {
                    this._enterTiledDoor(doorUnderPlayer);
                }
                return;
            }
        }
        this._frameCount = (this._frameCount || 0) + 1;

        // Update interaction hint
        this._updateHint();

        // SPACE to interact
        if (Phaser.Input.Keyboard.JustDown(this._keys.space) || window.joypadAction) {
            window.joypadAction = false;
            this._tiledInteract();
        }
    }

    _updateClassicMode(time, delta) {
        if (!this.player.body) return;

        this.player.body.setVelocity(0);

        const sk = this.player.texture.key;
        if (this.cursors.left.isDown) {
            this.player.body.setVelocityX(-this.walkSpeed);
            this.player.facing = 'left';
            if (this.anims.exists(`${sk}_left`)) this.player.anims.play(`${sk}_left`, true);
        } else if (this.cursors.right.isDown) {
            this.player.body.setVelocityX(this.walkSpeed);
            this.player.facing = 'right';
            if (this.anims.exists(`${sk}_right`)) this.player.anims.play(`${sk}_right`, true);
        } else if (this.cursors.up.isDown) {
            this.player.body.setVelocityY(-this.walkSpeed);
            this.player.facing = 'up';
            if (this.anims.exists(`${sk}_up`)) this.player.anims.play(`${sk}_up`, true);
        } else if (this.cursors.down.isDown) {
            this.player.body.setVelocityY(this.walkSpeed);
            this.player.facing = 'down';
            if (this.anims.exists(`${sk}_down`)) this.player.anims.play(`${sk}_down`, true);
        } else {
            this.player.anims.stop();
        }

        if (Phaser.Input.Keyboard.JustDown(this.actionKey)) {
            this.checkForInteraction();
        }
    }

    // ════════════════════════════════════════════════════
    // Tiled Mode — Interaction System
    // ════════════════════════════════════════════════════

    _getTargetTile() {
        if (!this.gridEngine) return null;
        const pos = this.gridEngine.getPosition('player');
        const dir = this.gridEngine.getFacingDirection('player');
        const target = { ...pos };
        if (dir === 'left') target.x--;
        else if (dir === 'right') target.x++;
        else if (dir === 'up') target.y--;
        else if (dir === 'down') target.y++;
        return target;
    }

    _updateHint() {
        if (!this._hintText) return;
        const target = this._getTargetTile();
        if (!target) { this._hintText.setAlpha(0); return; }

        const painting = this._tiledPaintings.find(p => p.x === target.x && p.y === target.y);
        const npc = this._tiledNPCs.find(n => n.x === target.x && n.y === target.y);
        const door = this._tiledDoors.find(d => d.x === target.x && d.y === target.y);
        const dialog = this._tiledDialogs.find(d => d.x === target.x && d.y === target.y);

        if (painting) {
            this._hintText.setText('[SPACE] View Artwork').setAlpha(1);
        } else if (npc) {
            this._hintText.setText(`[SPACE] Talk to ${npc.label || 'NPC'}`).setAlpha(1);
        } else if (door) {
            this._hintText.setText('[SPACE] Exit').setAlpha(1);
        } else if (dialog) {
            this._hintText.setText('[SPACE] Read').setAlpha(1);
        } else {
            this._hintText.setAlpha(0);
        }
    }

    _tiledInteract() {
        const target = this._getTargetTile();
        if (!target) return;

        // Also check the tile the player is standing on (for doors you walk onto)
        const playerPos = this.gridEngine ? this.gridEngine.getPosition('player') : null;

        // Check paintings
        const painting = this._tiledPaintings.find(p => p.x === target.x && p.y === target.y);
        if (painting) {
            this._showPaintingPopup(painting);
            return;
        }

        // Check NPCs — check both facing tile and current position for GridEngine NPCs
        const npc = this._tiledNPCs.find(n => {
            if (n.x === target.x && n.y === target.y) return true;
            // Also check GridEngine position for NPCs that may have moved
            if (this.gridEngine) {
                const npcIdx = this._tiledNPCs.indexOf(n);
                try {
                    const npcPos = this.gridEngine.getPosition(`gallery_npc_${npcIdx}`);
                    return npcPos.x === target.x && npcPos.y === target.y;
                } catch (e) { /* NPC not in GridEngine */ }
            }
            return false;
        });
        if (npc) {
            this._showNPCDialogue(npc);
            return;
        }

        // Check doors — check both facing tile AND standing-on tile
        const door = this._tiledDoors.find(d => d.x === target.x && d.y === target.y)
            || (playerPos && this._tiledDoors.find(d => d.x === playerPos.x && d.y === playerPos.y));
        if (door) {
            if (door.nextMap === 'worldscene') {
                // Return to WorldScene
                this.leaveLocation();
            } else {
                // Enter another venue
                this._enterTiledDoor(door);
            }
            return;
        }

        // Check dialogs/signs
        const dialog = this._tiledDialogs.find(d => d.x === target.x && d.y === target.y);
        if (dialog) {
            this._showDialogBox(dialog.content);
            return;
        }
    }

    // ════════════════════════════════════════════════════
    // Painting Popup
    // ════════════════════════════════════════════════════

    _showPaintingPopup(painting) {
        this._popupActive = true;
        this._lastViewedPainting = painting;

        // Resolve artwork data — prefer ARTWORK_MAP lookup via artworkId,
        // fall back to inline Tiled properties
        const artworkId = painting.artworkId;
        const artwork = artworkId ? ARTWORK_MAP[artworkId] : null;
        const displayTitle = artwork?.title || painting.title || 'Untitled';
        const displayArtist = artwork?.artist || painting.artist || 'Unknown Artist';
        const displayPrice = artwork?.askingPrice || parseInt(painting.price) || 0;
        const displayDesc = artwork?.provenance || painting.description || '';
        const displayMedium = artwork?.medium || '';
        const displayYear = artwork?.year || '';
        // Build subtitle line: "Medium, Year"
        const subtitle = [displayMedium, displayYear].filter(Boolean).join(', ');

        const { width, height } = this.scale;
        const pw = Math.min(440, width - 40);
        const ph = 280;

        this._popupElements = [];

        // Dark overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(DEPTH.POPUP_BG);
        this._popupElements.push(overlay);

        // Panel
        const panel = this.add.rectangle(width / 2, height / 2, pw, ph, 0x1a1a2e, 0.95)
            .setScrollFactor(0).setDepth(DEPTH.POPUP_BG + 1);
        panel.setStrokeStyle(1, 0xc9a84c);
        this._popupElements.push(panel);

        const cx = width / 2;
        const top = height / 2 - ph / 2 + 20;

        // Title
        const title = this.add.text(cx, top, displayTitle, {
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: '20px', color: '#c9a84c', align: 'center',
            wordWrap: { width: pw - 40 },
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT);
        this._popupElements.push(title);

        // Artist
        const artistText = this.add.text(cx, top + 32, displayArtist, {
            fontFamily: '"Playfair Display"', fontSize: '14px', color: '#d4d0cc',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT);
        this._popupElements.push(artistText);

        // Medium + Year subtitle
        if (subtitle) {
            const subtitleText = this.add.text(cx, top + 52, subtitle, {
                fontFamily: '"Playfair Display"', fontSize: '11px', color: '#888888',
                fontStyle: 'italic',
            }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT);
            this._popupElements.push(subtitleText);
        }

        // Description / provenance
        const descY = subtitle ? top + 72 : top + 60;
        const desc = this.add.text(cx, descY, displayDesc, {
            fontFamily: '"Playfair Display"', fontSize: '12px', color: '#999999',
            wordWrap: { width: pw - 60 }, align: 'center',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT);
        this._popupElements.push(desc);

        // Price
        const priceStr = displayPrice > 0 ? `$${displayPrice.toLocaleString()}` : 'Price on Application';
        const priceText = this.add.text(cx, top + 140, priceStr, {
            fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#c9a84c',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT);
        this._popupElements.push(priceText);

        // Actions
        const actions = this.add.text(cx, top + 180, '[SPACE] Close     [E] Make an Offer', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#666666',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT);
        this._popupElements.push(actions);

        // Fade in
        this._popupElements.forEach(el => {
            el.setAlpha(0);
            this.tweens.add({ targets: el, alpha: el === overlay ? 0.7 : 1, duration: 200 });
        });
    }

    _updatePopup() {
        if (Phaser.Input.Keyboard.JustDown(this._keys.space)) {
            this._closePopup();
        } else if (Phaser.Input.Keyboard.JustDown(this._keys.e)) {
            this._closePopup();
            this._startHaggleForPainting(this._lastViewedPainting);
        }
    }

    _closePopup() {
        this._popupActive = false;
        if (this._popupElements) {
            this._popupElements.forEach(el => el.destroy());
            this._popupElements = null;
        }
    }

    // ════════════════════════════════════════════════════
    // NPC Dialogue (Tiled mode)
    // ════════════════════════════════════════════════════

    _showNPCDialogue(npc) {
        this._currentNPC = npc;

        // Mark this NPC as "met" in the npcStore if their id matches a contact
        const npcId = npc.id;
        if (npcId) {
            try {
                const contact = useNPCStore.getState().getContact(npcId);
                if (contact && !contact.met) {
                    useNPCStore.getState().meetContact(npcId);
                    console.log(`[LocationScene] Met NPC: ${npcId}`);
                }
            } catch (e) { /* npcStore not initialized */ }
        }

        // Check for a full dialogue tree for this NPC at this venue
        const trees = npcId ? TREES_BY_NPC[npcId] : null;
        if (trees) {
            let targetTree = trees.find(t => t.venue === this.venueId);
            if (!targetTree) targetTree = trees[0];
            if (targetTree) {
                // Launch the rich DialogueScene with branching options
                const event = DialogueTreeManager.convertTreeToEvent(targetTree);
                this.scene.pause();
                this.scene.launch('DialogueScene', {
                    event,
                    ui: this.ui,
                    onExit: () => {
                        this.scene.stop('DialogueScene');
                        this.scene.resume('LocationScene');
                    },
                });
                return;
            }
        }

        // Fallback: inline dialogue popup (existing behavior)
        this._popupActive = true;

        const { width, height } = this.scale;
        this._popupElements = [];

        // Dialogue box at bottom
        const boxH = 140;
        const boxY = height - boxH / 2 - 10;

        const overlay = this.add.rectangle(width / 2, boxY, width - 20, boxH, 0x111118, 0.95)
            .setScrollFactor(0).setDepth(DEPTH.POPUP_BG);
        overlay.setStrokeStyle(1, 0x3a3a4e);
        this._popupElements.push(overlay);

        // NPC name
        const nameText = this.add.text(30, boxY - boxH / 2 + 12, npc.label || npc.id, {
            fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#c9a84c',
        }).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT);
        this._popupElements.push(nameText);

        // Dialogue text
        const dialogueText = this.add.text(30, boxY - boxH / 2 + 32, npc.dialogue || 'Hello.', {
            fontFamily: '"Playfair Display"', fontSize: '14px', color: '#d4d0cc',
            wordWrap: { width: width - 80 },
        }).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT);
        this._popupElements.push(dialogueText);

        // Options
        const optionsY = boxY + 10;
        const options = [];

        if (this._lastViewedPainting) {
            options.push({ text: `Make an offer on "${this._lastViewedPainting.title}"`, action: 'haggle' });
        }
        if (npc.canHaggle === 'true' && this._tiledPaintings.length > 0) {
            options.push({ text: 'Tell me about the artwork', action: 'info' });
        }
        options.push({ text: 'Just looking.', action: 'dismiss' });

        options.forEach((opt, i) => {
            const optText = this.add.text(30, optionsY + i * 18, `▸ ${opt.text}`, {
                fontFamily: '"Press Start 2P"', fontSize: '8px',
                color: i === 0 ? '#ffffff' : '#888888',
            }).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT)
              .setInteractive({ useHandCursor: true });

            optText.on('pointerover', () => optText.setColor('#c9a84c'));
            optText.on('pointerout', () => optText.setColor(i === 0 ? '#ffffff' : '#888888'));
            optText.on('pointerdown', () => {
                this._closePopup();
                if (opt.action === 'haggle') {
                    this._startHaggleForPainting(this._lastViewedPainting);
                } else if (opt.action === 'info') {
                    // Show info about the first painting
                    const firstPainting = this._tiledPaintings[0];
                    if (firstPainting) this._showPaintingPopup(firstPainting);
                }
                // 'dismiss' just closes
            });

            this._popupElements.push(optText);
        });

        // Close hint
        const closeHint = this.add.text(width - 30, boxY + boxH / 2 - 16, '[SPACE] Close', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#555555',
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT);
        this._popupElements.push(closeHint);
    }

    // ════════════════════════════════════════════════════
    // Dialog Box (signs/placards)
    // ════════════════════════════════════════════════════

    _showDialogBox(content) {
        this._popupActive = true;
        this._popupElements = [];

        const { width, height } = this.scale;
        const boxH = 80;
        const boxY = height - boxH / 2 - 10;

        const bg = this.add.rectangle(width / 2, boxY, width - 20, boxH, 0x111118, 0.95)
            .setScrollFactor(0).setDepth(DEPTH.POPUP_BG);
        bg.setStrokeStyle(1, 0x3a3a4e);
        this._popupElements.push(bg);

        const text = this.add.text(width / 2, boxY, content, {
            fontFamily: '"Playfair Display"', fontSize: '14px', color: '#d4d0cc',
            wordWrap: { width: width - 80 }, align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT);
        this._popupElements.push(text);

        const hint = this.add.text(width / 2, boxY + boxH / 2 - 12, '[SPACE]', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#555555',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP_TEXT);
        this._popupElements.push(hint);
    }

    // ════════════════════════════════════════════════════
    // Haggle Launch
    // ════════════════════════════════════════════════════

    _startHaggleForPainting(painting) {
        if (!painting) return;

        // Resolve artwork data from ARTWORKS database if artworkId is present
        const artwork = painting.artworkId ? ARTWORK_MAP[painting.artworkId] : null;
        const price = artwork?.askingPrice || parseInt(painting.price) || 10000;
        const work = {
            id: artwork?.id || `gallery_${painting.title?.replace(/\s/g, '_') || 'unknown'}`,
            title: artwork?.title || painting.title || 'Untitled',
            artist: artwork?.artist || painting.artist || 'Unknown',
            medium: artwork?.medium || painting.description || '',
            basePrice: price,
            price: price,
        };

        // Find NPC contact data if available
        const npcId = this._currentNPC?.id || this._tiledNPCs?.[0]?.id;
        const npc = npcId ? CONTACTS.find(c => c.id === npcId) : null;

        HaggleManager.start({
            mode: 'buy',
            work,
            npc,
            askingPrice: price,
        });

        const haggleInfo = {
            state: HaggleManager.getState(),
        };

        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start(SCENE_KEYS.HAGGLE, {
                ui: this.ui,
                haggleInfo,
                returnScene: SCENE_KEYS.LOCATION,
                returnArgs: {
                    venueId: this.venueId,
                    roomId: this.roomId,
                    venueTimeRemaining: this.venueTimeRemaining - 1,
                    returnScene: this.returnScene,
                    returnArgs: this.returnArgs,
                },
            });
        });
    }

    _enterTiledDoor(door) {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // Resolve target venue: prefer explicit venueId, fall back to staying in current venue.
            // door.nextMap is a Tiled map filename (e.g. 'soho_gallery_exhibition'), NOT a venue ID.
            let targetVenueId = door.venueId || this.venueId;
            let targetRoomId = door.roomId || door.nextMapRoom || null;

            // If no explicit roomId, find the room within the venue whose tiledMap matches nextMap.
            // This handles intra-venue transitions in multi-room venues like soho_gallery.
            if (!targetRoomId && door.nextMap) {
                const venue = VENUE_MAP[targetVenueId];
                if (venue) {
                    const matchingRoom = venue.rooms.find(r => r.tiledMap === door.nextMap);
                    if (matchingRoom) {
                        targetRoomId = matchingRoom.id;
                    } else {
                        // nextMap might be an external venue ID (legacy compat)
                        if (VENUE_MAP[door.nextMap]) {
                            targetVenueId = door.nextMap;
                            targetRoomId = null; // will use venue's startRoom
                        }
                    }
                }
            }

            this.scene.restart({
                venueId: targetVenueId,
                roomId: targetRoomId,
                venueTimeRemaining: this.venueTimeRemaining,
                ui: this.ui,
            });
        });
    }

    // ════════════════════════════════════════════════════
    // Classic Mode — Room Population & Interaction
    // ════════════════════════════════════════════════════

    populateRoom(centerX, centerY) {
        if (this.roomData.characters) {
            this.roomData.characters.forEach((charData, i) => {
                if (charData.requires && !QualityGate.check(charData.requires)) return;

                const charDef = CONTACTS.find(c => c.id === charData.id) || { name: charData.id };
                const spriteKey = charDef.spriteKey || 'walk_legacy_gallerist_walk';
                const charSprite = this.add.sprite(centerX + (i * 60) - 30, centerY - 60, spriteKey);
                charSprite.anims.play(`${spriteKey}_down`, true);
                charSprite.setScale(2);
                this.physics.add.existing(charSprite);
                charSprite.body.setImmovable(true);

                charSprite.interactType = 'character';
                charSprite.interactId = charData.id;
                charSprite.interactName = charDef.name;
                this.interactables.add(charSprite);

                this.add.text(charSprite.x, charSprite.y - 20, charSprite.interactName, {
                    fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#ffaaaa'
                }).setOrigin(0.5);
            });
        }

        // ── Items (gold-tinted interactable sprites) ──
        if (this.roomData.items && this.roomData.items.length > 0) {
            this.roomData.items.forEach((item, i) => {
                if (item.requires && !QualityGate.check(item.requires)) return;

                const itemSprite = this.add.sprite(centerX + 80 + (i * 40), centerY - 20, 'placeholder_exit');
                itemSprite.setTint(0xffd700); // gold for items
                itemSprite.setScale(1.5);
                this.physics.add.existing(itemSprite);
                itemSprite.body.setImmovable(true);

                itemSprite.interactType = 'item';
                itemSprite.interactId = item.name;
                itemSprite.interactName = item.name;
                itemSprite.itemData = item;
                this.interactables.add(itemSprite);

                this.add.text(itemSprite.x, itemSprite.y - 14, `📦 ${item.name}`, {
                    fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#ffd700'
                }).setOrigin(0.5);
            });
        }

        // ── Eavesdrops (purple-tinted ambient dialogue, gated by requires) ──
        if (this.roomData.eavesdrops && this.roomData.eavesdrops.length > 0) {
            this.roomData.eavesdrops.forEach((eaves, i) => {
                if (typeof eaves === 'string') return; // skip legacy string eavesdrops
                if (eaves.requires && !QualityGate.check(eaves.requires)) return;

                const eavesSprite = this.add.sprite(centerX - 80 - (i * 40), centerY, 'placeholder_exit');
                eavesSprite.setTint(0x9966cc); // purple for eavesdrops
                eavesSprite.setScale(1.2);
                this.physics.add.existing(eavesSprite);
                eavesSprite.body.setImmovable(true);

                eavesSprite.interactType = 'eavesdrop';
                eavesSprite.interactId = eaves.id;
                eavesSprite.interactName = eaves.desc || 'Overheard conversation';
                eavesSprite.eavesdropData = eaves;
                this.interactables.add(eavesSprite);

                this.add.text(eavesSprite.x, eavesSprite.y - 14, '💬', {
                    fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#9966cc'
                }).setOrigin(0.5);
            });
        }

        // ── onEnter narrative (first visit only) ──
        if (this.roomData.onEnter) {
            const oe = this.roomData.onEnter;
            const s = GameState.state;
            const roomKey = this.roomData.id;
            const isFirstVisit = !s?.visitedRooms?.includes(roomKey);

            if (oe.text && (!oe.firstVisitOnly || isFirstVisit)) {
                // Mark room as visited
                if (s && isFirstVisit) {
                    if (!s.visitedRooms) s.visitedRooms = [];
                    s.visitedRooms.push(roomKey);
                }

                // Show narrative popup
                this.time.delayedCall(500, () => {
                    this._showClassicNarrative(oe.text);
                });

                // Apply stat effects
                if (oe.effects) {
                    GameState.applyEffects(oe.effects);
                }
            }
        }

        if (this.roomData.exits) {
            this.roomData.exits.forEach((ext, i) => {
                const canEnter = !ext.requires || QualityGate.check(ext.requires);
                const blockMsg = canEnter ? null : ext.block || 'Locked.';

                const exitSprite = this.add.sprite(centerX + (i * 60) - 30, centerY + 60, 'placeholder_exit');
                exitSprite.setTint(canEnter ? 0xffffff : 0x555555);
                exitSprite.setScale(2);
                this.physics.add.existing(exitSprite);
                exitSprite.body.setImmovable(true);

                exitSprite.interactType = 'exit';
                exitSprite.interactId = ext.id;
                exitSprite.interactName = ext.label;
                exitSprite.canEnter = canEnter;
                exitSprite.blockMsg = blockMsg;
                this.interactables.add(exitSprite);

                this.add.text(exitSprite.x, exitSprite.y - 20, `🚪 ${ext.label}`, {
                    fontFamily: '"Press Start 2P"', fontSize: '6px', color: canEnter ? '#aaddff' : '#666666'
                }).setOrigin(0.5);
            });
        }
    }

    checkForInteraction() {
        const range = 40;
        let pX = this.player.x;
        let pY = this.player.y;

        if (this.player.facing === 'left') pX -= range;
        else if (this.player.facing === 'right') pX += range;
        else if (this.player.facing === 'up') pY -= range;
        else if (this.player.facing === 'down') pY += range;

        let closest = null;
        let minDist = 30;

        this.interactables.getChildren().forEach(obj => {
            const dist = Phaser.Math.Distance.Between(pX, pY, obj.x, obj.y);
            if (dist < minDist) {
                minDist = dist;
                closest = obj;
            }
        });

        if (closest) {
            this.handleInteraction(closest);
        }
    }

    handleInteraction(obj) {
        if (obj.interactType === 'exit') {
            if (obj.canEnter) {
                const venue = VENUE_MAP[this.venueId];
                const destRoom = venue ? venue.rooms.find(r => r.id === obj.interactId) : null;
                const cost = destRoom ? (destRoom.timeCost || 0) : 0;

                if (this.venueTimeRemaining < cost) {
                    this.cameras.main.shake(100, 0.005);
                    this.showOverheadMessage("Out of Time! Venue closing.");
                    this.time.delayedCall(1500, () => this.leaveLocation());
                    return;
                }

                this.venueTimeRemaining -= cost;

                this.cameras.main.fadeOut(300, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.restart({
                        venueId: this.venueId,
                        roomId: obj.interactId,
                        venueTimeRemaining: this.venueTimeRemaining,
                        ui: this.ui
                    });
                });
            } else {
                this.cameras.main.shake(100, 0.005);
                this.showOverheadMessage(obj.blockMsg || "Locked.");
            }
        } else if (obj.interactType === 'character') {
            this.startDialogue(obj.interactId);
        } else if (obj.interactType === 'item') {
            // Show item description and apply onLook effects
            const item = obj.itemData;
            const desc = item.desc || item.name;
            this._showClassicNarrative(desc);
            if (item.onLook) GameState.applyEffects(item.onLook);
        } else if (obj.interactType === 'eavesdrop') {
            // Show overheard dialogue and apply effects
            const eaves = obj.eavesdropData;
            this._showClassicNarrative(eaves.content || eaves.desc);
            if (eaves.effects) GameState.applyEffects(eaves.effects);
            // oneShot eavesdrops: destroy after first interaction
            if (eaves.oneShot) {
                obj.destroy();
            }
            // Unlock flags
            if (eaves.unlocks && GameState.state) {
                if (!GameState.state.flags) GameState.state.flags = {};
                GameState.state.flags[eaves.unlocks] = true;
            }
        }
    }

    /** Show a narrative text popup at the bottom of the screen — used for onEnter text,
     *  item descriptions, and eavesdrop content in classic mode. SPACE to dismiss. */
    _showClassicNarrative(text) {
        if (this._narrativeActive) return;
        this._narrativeActive = true;

        const { width, height } = this.scale;
        const boxH = 80;
        const padding = 12;

        const bg = this.add.rectangle(width / 2, height - boxH / 2, width, boxH, 0x000000, 0.85);
        const narrativeText = this.add.text(padding, height - boxH + padding, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#ffffff',
            wordWrap: { width: width - padding * 2 },
            lineSpacing: 6,
        });
        const hint = this.add.text(width - padding, height - 12, '[SPACE]', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#888888',
        }).setOrigin(1, 1);

        const dismiss = () => {
            bg.destroy();
            narrativeText.destroy();
            hint.destroy();
            this._narrativeActive = false;
        };

        // Dismiss on SPACE key press (with delay to prevent instant dismiss)
        this.time.delayedCall(300, () => {
            const handler = this.input.keyboard.on('keydown-SPACE', () => {
                this.input.keyboard.off('keydown-SPACE', handler);
                dismiss();
            });
        });
    }

    showOverheadMessage(text) {
        const msg = this.add.text(this.player.x, this.player.y - 40, text, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ff4444'
        }).setOrigin(0.5);
        this.tweens.add({
            targets: msg, y: msg.y - 20, alpha: 0, duration: 1500,
            onComplete: () => msg.destroy()
        });
    }

    startDialogue(characterId) {
        const trees = TREES_BY_NPC[characterId];
        let targetTree = null;

        if (trees) {
            targetTree = trees.find(t => t.venue === this.venueId);
            if (!targetTree) targetTree = trees[0];
        } else {
            if (DIALOGUE_TREES[characterId] && !Array.isArray(DIALOGUE_TREES[characterId])) {
                targetTree = DIALOGUE_TREES[characterId];
            }
        }

        if (!targetTree) {
            console.warn(`No dialogue tree found for ${characterId} at ${this.venueId}`);
            this.player.body.setVelocity(0);
            return;
        }

        const event = DialogueTreeManager.convertTreeToEvent(targetTree);

        this.scene.pause();
        this.scene.launch('DialogueScene', {
            event: event,
            ui: this.ui,
            onExit: () => {
                this.scene.stop('DialogueScene');
                this.scene.resume('LocationScene');
            }
        });
    }

    // ════════════════════════════════════════════════════
    // Leave Location
    // ════════════════════════════════════════════════════

    cleanup() {
        // Remove window-level keyboard listener
        if (this._windowKeyHandler) {
            window.removeEventListener('keydown', this._windowKeyHandler);
            this._windowKeyHandler = null;
        }
        window.joypadAction = false;
    }

    leaveLocation() {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (this.returnScene === 'WorldScene') {
                GameEventBus.emit(GameEvents.SCENE_EXIT, 'LocationScene');
                this.scene.stop();
                GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'WorldScene', {
                    spawnX: this.returnArgs?.spawnX,
                    spawnY: this.returnArgs?.spawnY,
                });
            } else if (this.returnScene) {
                this.scene.start(this.returnScene, {
                    ...this.returnArgs,
                    ui: this.ui
                });
            } else {
                GameEventBus.emit(GameEvents.SCENE_EXIT, 'LocationScene');
                GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.TERMINAL);
                this.showTerminalUI();
                if (this.ui) {
                    this.ui.popScreen();
                    this.ui.render();
                }
                this.scene.stop();
            }
        });
    }
}
