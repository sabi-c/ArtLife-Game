import { BaseScene } from './BaseScene.js';
import { VENUES } from '../data/rooms.js';
import { GameState } from '../managers/GameState.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { SCENE_KEYS } from '../data/scene-keys.js';

/**
 * CityScene — Phase 41 City Hub & World Expansion
 *
 * A persistent outdoor city map where the player walks between buildings.
 * Each building entrance is a "Doorway Warp" that loads the corresponding
 * LocationScene interior. Leaving an interior spawns you back outside the
 * door you entered.
 *
 * For now this is a menu-based hub (like Pokémon's town map) while Phase 40
 * builds the real walking overworld. Once OverworldScene has Tiled maps,
 * CityScene will consume them for the outdoor blocks.
 */

// City locations map — each has a position on screen, a venueId, and a label
const CITY_LOCATIONS = [
    { id: 'apartment', label: '🏠 Your Apartment', venueId: null, x: 0.15, y: 0.25, color: '#8888aa' },
    { id: 'gallery', label: '🖼️ Chelsea Gallery', venueId: 'gallery_opening', x: 0.50, y: 0.20, color: '#c9a84c' },
    { id: 'auction_house', label: '🔨 Auction House', venueId: 'auction_house', x: 0.85, y: 0.25, color: '#cc6644' },
    { id: 'cocktail_party', label: '🍸 Rooftop Lounge', venueId: 'cocktail_party', x: 0.30, y: 0.50, color: '#aa66cc' },
    { id: 'artist_studio', label: '🎨 Artist Studio', venueId: 'artist_studio', x: 0.70, y: 0.50, color: '#4a9e6a' },
    { id: 'freeport', label: '🔒 Freeport Vault', venueId: 'freeport', x: 0.50, y: 0.75, color: '#7a7a8a' },
    { id: 'taxi', label: '🚕 Taxi Stand', venueId: null, x: 0.15, y: 0.75, color: '#cccc44', isTaxi: true },
];

export class CityScene extends BaseScene {
    constructor() {
        super('CityScene');
    }

    // Note: init() function removed and folded into create() per BaseScene pattern.

    create(data) {
        super.create({ ...data, hideUI: true }); // Extends from BaseScene
        this.spawnAt = data?.spawnAt || null;

        this.cameras.main.fadeIn(400, 0, 0, 0);
        const { width, height } = this.scale;

        // ── Background ──
        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a14).setDepth(-1);
        this.cameras.main.setBackgroundColor('#0a0a14');

        // Draw a simple grid pattern for streets
        const gfx = this.add.graphics();
        gfx.lineStyle(1, 0x222233, 0.3);
        for (let x = 0; x < width; x += 40) {
            gfx.lineBetween(x, 0, x, height);
        }
        for (let y = 0; y < height; y += 40) {
            gfx.lineBetween(0, y, width, y);
        }

        // ── Header ──
        const cityName = GameState.state?.currentCity?.replace('-', ' ')?.toUpperCase() || 'NEW YORK';
        this.add.text(width / 2, 25, `🏙️  ${cityName}  🏙️`, {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#c9a84c'
        }).setOrigin(0.5).setDepth(100);

        // Leave button → back to DOM dashboard
        const exitBtn = this.add.text(width - 20, 20, '[ DASHBOARD ]', {
            fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#c94040'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(100);

        exitBtn.on('pointerover', () => exitBtn.setColor('#ff8888'));
        exitBtn.on('pointerout', () => exitBtn.setColor('#c94040'));
        exitBtn.on('pointerdown', () => this.returnToDashboard());

        // ── Render Location Nodes ──
        CITY_LOCATIONS.forEach(loc => {
            const cx = width * loc.x;
            const cy = height * loc.y;

            // Building card
            const cardW = 180;
            const cardH = 50;
            const isSpawn = this.spawnAt === loc.id;

            const card = this.add.rectangle(cx, cy, cardW, cardH, 0x1a1a2e, 0.9);
            card.setStrokeStyle(isSpawn ? 2 : 1, isSpawn ? 0xc9a84c : 0x3a3a4e);

            const label = this.add.text(cx, cy, loc.label, {
                fontFamily: '"Press Start 2P"', fontSize: '8px', color: loc.color,
                align: 'center'
            }).setOrigin(0.5);

            // Determine if venue exists in rooms.js
            const venueExists = loc.venueId ? VENUES.find(v => v.id === loc.venueId) : false;

            if (loc.isTaxi) {
                // Taxi → fast travel (Agent-2 will implement the full menu)
                card.setInteractive({ useHandCursor: true });
                card.on('pointerover', () => { card.setStrokeStyle(2, 0xcccc44); label.setColor('#ffff66'); });
                card.on('pointerout', () => { card.setStrokeStyle(1, 0x3a3a4e); label.setColor(loc.color); });
                card.on('pointerdown', () => {
                    // Launch FastTravelScene as overlay, pause CityScene
                    this.scene.launch(SCENE_KEYS.FAST_TRAVEL, {
                        ui: this.ui,
                        callerScene: SCENE_KEYS.CITY,
                    });
                    this.scene.pause();
                });
            } else if (loc.id === 'apartment') {
                // Apartment → save point (Agent-2 will implement)
                card.setInteractive({ useHandCursor: true });
                card.on('pointerover', () => { card.setStrokeStyle(2, 0x8888aa); label.setColor('#aaaacc'); });
                card.on('pointerout', () => { card.setStrokeStyle(1, 0x3a3a4e); label.setColor(loc.color); });
                card.on('pointerdown', () => {
                    // Auto-save and show confirmation
                    GameState.autoSave();
                    const saved = this.add.text(cx, cy + 35, '💾 SAVED', {
                        fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#4a9e6a'
                    }).setOrigin(0.5);
                    this.tweens.add({ targets: saved, alpha: 0, y: cy + 20, duration: 1200, onComplete: () => saved.destroy() });
                });
            } else if (venueExists) {
                // Doorway Warp → LocationScene
                card.setInteractive({ useHandCursor: true });
                card.on('pointerover', () => { card.setStrokeStyle(2, 0xc9a84c); label.setColor('#eecc66'); });
                card.on('pointerout', () => { card.setStrokeStyle(isSpawn ? 2 : 1, isSpawn ? 0xc9a84c : 0x3a3a4e); label.setColor(loc.color); });
                card.on('pointerdown', () => this.enterBuilding(loc));
            } else {
                // Venue not in rooms.js yet — show as locked
                card.setAlpha(0.5);
                label.setAlpha(0.5);
            }
        });

        // ── Street connectors (decorative lines between nodes) ──
        const lineGfx = this.add.graphics();
        lineGfx.lineStyle(1, 0x333344, 0.4);
        // Connect adjacent locations with faint lines
        const connections = [
            ['apartment', 'gallery'], ['gallery', 'auction_house'],
            ['apartment', 'cocktail_party'], ['cocktail_party', 'artist_studio'],
            ['gallery', 'freeport'], ['taxi', 'freeport'],
            ['apartment', 'taxi'],
        ];
        connections.forEach(([a, b]) => {
            const locA = CITY_LOCATIONS.find(l => l.id === a);
            const locB = CITY_LOCATIONS.find(l => l.id === b);
            if (locA && locB) {
                lineGfx.lineBetween(width * locA.x, height * locA.y, width * locB.x, height * locB.y);
            }
        });
        lineGfx.setDepth(-1);

        // ── ESC key force-exit (safety hatch) ──
        this.input.keyboard.on('keydown-ESC', () => this.returnToDashboard());
    }

    enterBuilding(loc) {
        // Track player location for spawn-back using Phase 41 schema
        if (GameState.state) {
            // Ensure playerLocation exists (old saves may lack it)
            if (!GameState.state.playerLocation) {
                GameState.state.playerLocation = {
                    locationId: 'player_apartment', cityX: 5, cityY: 14, insideVenue: false,
                };
            }
            GameState.state.playerLocation.locationId = loc.id;
            GameState.state.playerLocation.insideVenue = true;
        }

        const venue = VENUES.find(v => v.id === loc.venueId);
        const startRoom = venue?.startRoom || venue?.rooms?.[0]?.id || 'entrance';

        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('LocationScene', {
                venueId: loc.venueId,
                roomId: startRoom,
                ui: this.ui,
                returnScene: 'CityScene',
                returnArgs: { spawnAt: loc.id },
            });
        });
    }

    returnToDashboard() {
        // Reset insideVenue when returning to dashboard
        if (GameState.state && GameState.state.playerLocation) {
            GameState.state.playerLocation.insideVenue = false;
            GameState.state.playerLocation.locationId = 'player_apartment';
        }

        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            GameEventBus.emit(GameEvents.SCENE_EXIT, 'CityScene');
            GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
            this.showTerminalUI();
            if (this.ui) {
                this.ui.popScreen();
                this.ui.render();
            }
            this.scene.stop();
        });
    }
}
