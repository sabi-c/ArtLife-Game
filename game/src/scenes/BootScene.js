import Phaser from 'phaser';
import { EventRegistry } from '../managers/EventRegistry.js';

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

        // ── Interior Tiled Maps + Tilesets ──
        this.load.tilemapTiledJSON('map_gallery_test', 'content/maps/gallery_test.json');
        this.load.tilemapTiledJSON('map_uptown_gallery', 'content/maps/uptown_gallery.json');
        this.load.tilemapTiledJSON('map_artist_studio_visit', 'content/maps/artist_studio_visit.json');
        // Multi-room venue: SoHo Gallery (lobby + exhibition + office)
        this.load.tilemapTiledJSON('map_soho_gallery_lobby', 'content/maps/soho_gallery_lobby.json');
        this.load.tilemapTiledJSON('map_soho_gallery_exhibition', 'content/maps/soho_gallery_exhibition.json');
        this.load.tilemapTiledJSON('map_soho_gallery_office', 'content/maps/soho_gallery_office.json');
        // Chelsea Gallery (showcase room)
        this.load.tilemapTiledJSON('map_chelsea_gallery', 'content/maps/chelsea_gallery.json');
        // Chelsea Showcase (museum gallery — 18×14, 9 paintings)
        this.load.tilemapTiledJSON('map_chelsea_showcase', 'content/maps/chelsea_showcase.json');
        // Fossil Museum (Princess-Phoenix tileset, scaled 16→48px)
        this.load.tilemapTiledJSON('map_fossil_museum', 'content/maps/fossil_museum.json');
        this.load.image('fossil_museum_48x48', 'assets/tilesets/fossil_museum_48x48.png');
        this.load.image('gallery_tileset', 'assets/tilesets/gallery_tileset.png');
        this.load.image('Room_Builder_free_48x48', 'assets/tilesets/Room_Builder_free_48x48.png');
        this.load.image('Interiors_free_48x48', 'assets/tilesets/Interiors_free_48x48.png');
        // ── Themed LimeZu tilesets (premium Modern Interiors pack) ──
        this.load.image('7_Art_48x48', 'assets/tilesets/7_Art_48x48.png');
        this.load.image('22_Museum_48x48', 'assets/tilesets/22_Museum_48x48.png');
        this.load.image('1_Generic_48x48', 'assets/tilesets/1_Generic_48x48.png');
        this.load.image('13_Conference_Hall_48x48', 'assets/tilesets/13_Conference_Hall_48x48.png');
        this.load.image('2_LivingRoom_48x48', 'assets/tilesets/2_LivingRoom_48x48.png');

        // ── Background-image rooms (pre-composed LimeZu premium art) ──
        this.load.tilemapTiledJSON('map_art_gallery_museum', 'content/maps/art_gallery_museum.json');
        this.load.tilemapTiledJSON('map_museum_entrance', 'content/maps/museum_entrance.json');
        this.load.tilemapTiledJSON('map_dinosaur_museum', 'content/maps/dinosaur_museum.json');
        this.load.tilemapTiledJSON('map_small_gallery', 'content/maps/small_gallery.json');
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
            console.log(`[BootScene] Injected ${eventsData.length} decoupled events into EventRegistry`);
        } else {
            console.warn('[BootScene] No events.json data found or failed to parse.');
        }

        // Cache storyline data
        const storylinesData = this.cache.json.get('storylines_json');
        if (storylinesData && Array.isArray(storylinesData)) {
            EventRegistry.jsonStorylines = storylinesData;
            console.log(`[BootScene] Injected ${storylinesData.length} storylines into EventRegistry`);
        } else {
            console.warn('[BootScene] No storylines.json data found or failed to parse.');
        }

        const ui = window.game?.ui;
        // The React `TerminalLogin` is now the true title screen.
        // Expose a method so React can command Phaser to start the game loop when ready.
        window.startPhaserGame = (mode = 'new') => {
            if (mode === 'new') {
                // Fresh visit: play cinematic intro, then hand back to React TerminalLogin
                this.scene.launch('IntroScene', { ui });
            } else if (mode === 'charselect') {
                // After login "New" selection: go straight to character builder
                import('../managers/GameEventBus.js').then(({ GameEventBus, GameEvents }) => {
                    GameEventBus.emit(GameEvents.UI_ROUTE, 'CHARACTER_CREATOR');
                });
            } else {
                // If loading a save, skip straight to Overworld/Menu.
                this.scene.launch('OverworldScene', { ui });
            }
            // Hide the boot scene
            this.scene.stop();
        };
    }
}
