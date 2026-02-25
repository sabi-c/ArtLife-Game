import Phaser from 'phaser';
import { EventRegistry } from '../managers/EventRegistry.js';
import { VIEW } from '../constants/views.js';
import { safeSceneStart, safeSceneLaunch } from '../utils/safeScene.js';
import { autoLoadTiledMaps, preloadAllTilesets, getAllMapIds } from '../utils/tiledAutoLoader.js';

/**
 * BootScene — Preloads shared assets, then launches TitleScene
 * Extracted from phaserInit.js during architectural refactor.
 */
export class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    preload() {
        // ── Asset-load error handler: substitute a 1×1 placeholder so the game
        //    never crashes on a missing PNG — just shows a blank/magenta square.
        this.load.on('loaderror', (file) => {
            console.warn(`[BootScene] Asset failed to load: ${file.key} (${file.url}). Using placeholder.`);
            if (window.ArtLife) window.ArtLife.recordMissingAsset(file.key, file.url);

            // Inject a 1×1 magenta pixel as a named texture so the key still resolves
            if (!this.textures.exists(file.key)) {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 1;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(0, 0, 1, 1);
                this.textures.addCanvas(file.key, canvas);
            }
        });

        // ── Category event backgrounds ──
        const categories = ['gallery', 'market', 'social', 'drama', 'personal', 'fair', 'opportunity'];
        categories.forEach((cat) => {
            this.load.image(`bg_${cat}`, `backgrounds/bg_${cat}.png`);
        });

        // ── Haggle Battle — dealer sprites ──
        this.load.image('dealer_shark', 'sprites/dealer_shark.png');
        this.load.image('dealer_patron', 'sprites/dealer_patron.png');
        this.load.image('dealer_calculator', 'sprites/dealer_calculator.png');
        this.load.image('dealer_nervous', 'sprites/dealer_nervous.png');
        this.load.image('dealer_collector', 'sprites/dealer_collector.png');
        this.load.image('dealer_hustler', 'sprites/dealer_hustler.png');
        this.load.image('dealer_artist', 'sprites/dealer_artist.png');
        this.load.image('dealer_rival', 'sprites/dealer_rival.png');
        this.load.image('player_back', 'sprites/player_back.png');

        // ── Gallery NPC spritesheets (LimeZu premade, 3×4 grid, 48×96 frames) ──
        const galleryNPCs = [
            'npc_curator', 'npc_collector', 'npc_gallerist', 'npc_artist', 'npc_patron',
            'npc_critic', 'npc_assistant', 'npc_handler', 'npc_guard', 'npc_visitor',
        ];
        galleryNPCs.forEach(key => {
            this.load.spritesheet(key, `sprites/gallery/${key}.png`, {
                frameWidth: 48, frameHeight: 96,
            });
        });

        // ── Overworld tilesets ──
        this.load.spritesheet('tiles_urban', 'assets/tilesets/kenney_rpg_urban_pack/Tilemap/tilemap_packed.png', {
            frameWidth: 16, frameHeight: 16, margin: 0, spacing: 1
        });
        this.load.spritesheet('tiles_indoor', 'assets/tilesets/kenney_roguelike_indoors/Tilesheets/roguelikeIndoor_transparent.png', {
            frameWidth: 16, frameHeight: 16, margin: 0, spacing: 1
        });

        // ── Player walk spritesheet ──
        this.load.spritesheet('player_walk', 'sprites/player_walk.png', {
            frameWidth: 160, frameHeight: 160
        });

        // ── Interior Tiled Maps + Tilesets (auto-discovered from map JSON) ──
        // The auto-loader reads each map's JSON, extracts tileset references,
        // and loads only what isn't already cached. No manual tileset registration needed.
        autoLoadTiledMaps(this, getAllMapIds());
        preloadAllTilesets(this); // Single-pass: all tilesets load alongside maps

        // ── Background-image rooms (pre-composed LimeZu premium art) ──
        // These aren't referenced in Tiled JSON, so loaded explicitly
        this.load.image('bg_room_art_gallery_museum', 'assets/rooms/art_gallery_museum.png');
        this.load.image('bg_room_museum_entrance', 'assets/rooms/museum_entrance.png');
        this.load.image('bg_room_dinosaur_museum', 'assets/rooms/dinosaur_museum.png');
        this.load.image('bg_room_small_gallery', 'assets/rooms/small_gallery.png');

        // ── Event JSON Data ──
        this.load.json('events_json', 'content/events.json');
        this.load.json('storylines_json', 'content/storylines.json');
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        // Register player walk animations once for all scenes
        if (this.textures.exists('player_walk')) {
            const dirs = [
                { key: 'walk_down', start: 0, end: 3 },
                { key: 'walk_left', start: 4, end: 7 },
                { key: 'walk_right', start: 8, end: 11 },
                { key: 'walk_up', start: 12, end: 15 },
            ];
            dirs.forEach(({ key, start, end }) => {
                if (!this.anims.exists(key)) {
                    this.anims.create({ key, frames: this.anims.generateFrameNumbers('player_walk', { start, end }), frameRate: 8, repeat: -1 });
                }
            });
        }

        // Cache decoupled event JSON into the Registry for immediate lookup
        const eventsData = this.cache.json.get('events_json');
        if (eventsData && Array.isArray(eventsData)) {
            EventRegistry.jsonEvents = eventsData;
            console.log(`[BootScene] ${eventsData.length} decoupled events loaded`);
        } else {
            console.warn('[BootScene] No events.json data found or failed to parse.');
        }

        // Cache storyline data
        const storylinesData = this.cache.json.get('storylines_json');
        if (storylinesData && Array.isArray(storylinesData)) {
            EventRegistry.jsonStorylines = storylinesData;
            console.log(`[BootScene] ${storylinesData.length} storylines loaded`);
        } else {
            console.warn('[BootScene] No storylines.json data found or failed to parse.');
        }

        const ui = window.game?.ui;
        // The React `ArtnetLogin` is now the true login screen.
        // Expose a method so React can command Phaser to start the game loop when ready.
        window.startPhaserGame = (mode = 'new') => {
            if (mode === 'new') {
                // Fresh visit: play cinematic intro, then hand back to React ArtnetLogin
                safeSceneLaunch(this, 'IntroScene', { ui });
            } else if (mode === 'charselect') {
                // After login "New" selection: go straight to character builder
                import('../managers/GameEventBus.js').then(({ GameEventBus, GameEvents }) => {
                    GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.CHARACTER_CREATOR);
                });
            } else {
                // If loading a save, skip straight to Overworld/Menu.
                safeSceneLaunch(this, 'NewWorldScene', { ui });
            }
            // Hide the boot scene
            this.scene.stop();
        };
    }
}
