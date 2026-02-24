import Phaser from 'phaser';
import { GameState } from '../managers/GameState.js';
import { WORLD_LOCATIONS, LOCATIONS_BY_ID, FAST_TRAVEL_DESTINATIONS, TAXI_STOPS } from '../data/world_locations.js';
import { CITY_DATA } from '../data/cities.js';
import { QualityGate } from '../managers/QualityGate.js';
import { safeSceneStart, safeSceneLaunch } from "../utils/safeScene.js";

/**
 * FastTravelScene — Phase 41 Taxi / Transit Overlay
 *
 * Launched as an overlay on top of CityScene (or OverworldScene).
 * Shows a Pokémon-style menu of destinations the player can travel to.
 * Deducts taxi fare, updates playerLocation, and warps CityScene.
 */
export class FastTravelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'FastTravelScene' });
    }

    init(data) {
        this.callerScene = data.callerScene || 'OverworldScene';
        this.currentCity = data.city || GameState.state?.currentCity || 'new-york';
        this.taxiCost = data.taxiCost || 50;
        this.ui = data.ui;
        this.onSelect = data.onSelect || null; // callback(locationId)
    }

    create() {
        const { width, height } = this.scale;

        // ── Semi-transparent backdrop ──
        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0, 0)
            .setInteractive() // block clicks from passing through
            .setDepth(0);

        // ── Menu Container ──
        const menuW = Math.min(420, width - 40);
        const menuX = width / 2;
        const menuStartY = 60;

        // Header
        this.add.text(menuX, menuStartY, '🚕  WHERE TO?', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(10);

        const cashText = `CASH: $${(GameState.state?.cash || 0).toLocaleString()}  •  FARE: $${this.taxiCost}`;
        this.add.text(menuX, menuStartY + 25, cashText, {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: '#888888',
        }).setOrigin(0.5).setDepth(10);

        // ── Destination Buttons ──
        const destinations = this._getDestinations();
        let btnY = menuStartY + 60;

        destinations.forEach((loc) => {
            const canAfford = !loc.cost || (GameState.state?.cash || 0) >= (this.taxiCost + (loc.cost || 0));
            const meetsReqs = !loc.requires || QualityGate.check(loc.requires);
            const available = canAfford && meetsReqs;

            // Button background
            const btnBg = this.add.rectangle(menuX, btnY, menuW, 40,
                available ? 0x1a1a2e : 0x110000, 0.9
            ).setStrokeStyle(1, available ? 0x3a3a4e : 0x331111).setDepth(10);

            // Icon + Name
            const label = `${loc.icon}  ${loc.name}`;
            const costLabel = loc.cost > 0 ? ` ($${loc.cost.toLocaleString()})` : '';
            const timeLabel = loc.travelTime > 0 ? ` — ${loc.travelTime}h` : '';

            const labelText = this.add.text(menuX - menuW / 2 + 16, btnY, label, {
                fontFamily: '"Playfair Display"',
                fontSize: '14px',
                color: available ? '#d4d0cc' : '#664444',
            }).setOrigin(0, 0.5).setDepth(11);

            const detailText = this.add.text(menuX + menuW / 2 - 16, btnY, `${costLabel}${timeLabel}`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '7px',
                color: available ? '#888888' : '#553333',
            }).setOrigin(1, 0.5).setDepth(11);

            if (available) {
                btnBg.setInteractive({ useHandCursor: true });
                btnBg.on('pointerover', () => {
                    btnBg.setStrokeStyle(1, 0xc9a84c).setFillStyle(0x2a2a3e, 0.95);
                    labelText.setColor('#ffffff');
                });
                btnBg.on('pointerout', () => {
                    btnBg.setStrokeStyle(1, 0x3a3a4e).setFillStyle(0x1a1a2e, 0.9);
                    labelText.setColor('#d4d0cc');
                });
                btnBg.on('pointerdown', () => {
                    this._selectDestination(loc);
                });
            }

            // Locked reason
            if (!available) {
                let reason = '';
                if (!canAfford) reason = 'Not enough cash';
                else if (!meetsReqs) reason = 'Requirements not met';
                this.add.text(menuX, btnY + 16, reason, {
                    fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#553333',
                }).setOrigin(0.5).setDepth(11);
                btnY += 12; // extra space for locked label
            }

            btnY += 50;
        });

        // ── Cancel Button ──
        const cancelBtn = this.add.text(menuX, btnY + 10, '[ CANCEL ]', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#c94040',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);

        cancelBtn.on('pointerover', () => cancelBtn.setColor('#ff8888'));
        cancelBtn.on('pointerout', () => cancelBtn.setColor('#c94040'));
        cancelBtn.on('pointerdown', () => this._close());

        // ── ESC key to close ──
        this.input.keyboard.once('keydown-ESC', () => this._close());
    }

    _getDestinations() {
        const city = this.currentCity;
        // Get all non-taxi locations in this city
        return WORLD_LOCATIONS.filter(loc =>
            loc.city === city &&
            loc.type !== 'taxi' &&
            loc.id !== GameState.state?.playerLocation?.locationId
        );
    }

    _selectDestination(location) {
        // Deduct taxi fare
        if (GameState.state) {
            GameState.state.cash -= this.taxiCost;
            GameState.addNews(`🚕 Took a taxi to ${location.name}. (-$${this.taxiCost})`);
        }

        // Update persistent location
        GameState.moveToLocation(location);

        // If this location has a venue, go directly inside
        if (location.venueId) {
            GameState.enterVenue(location.id);

            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                // Stop the city scene and launch the indoor LocationScene
                this.scene.stop(this.callerScene);
                this.scene.start('LocationScene', {
                    venueId: location.venueId,
                    roomId: location.startRoom,
                    ui: this.ui,
                });
                this.scene.stop(); // stop FastTravelScene
            });
        } else if (location.type === 'transit') {
            // Transit = international travel menu
            this._showCityTravel(location);
        } else if (location.id === 'player_apartment') {
            // Home = save + rest
            this._goHome();
        } else if (location.id === 'cafe_chelsea') {
            // Café = burnout reduction
            this._visitCafe(location);
        } else {
            // Generic warp — just move the player in CityScene
            if (this.onSelect) this.onSelect(location.id);
            this._close();
        }
    }

    _showCityTravel(transitLocation) {
        // Clear the current menu and show city destinations
        this.children.removeAll(true);
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0, 0).setDepth(0);

        this.add.text(width / 2, 50, `${transitLocation.icon}  INTERNATIONAL TRAVEL`, {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#c9a84c',
        }).setOrigin(0.5).setDepth(10);

        this.add.text(width / 2, 75, `Flight cost: $${transitLocation.cost.toLocaleString()}`, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#888888',
        }).setOrigin(0.5).setDepth(10);

        let btnY = 110;
        const cities = Object.entries(CITY_DATA)
            .filter(([id]) => id !== this.currentCity);

        cities.forEach(([cityId, city]) => {
            const cost = transitLocation.cost;
            const canAfford = (GameState.state?.cash || 0) >= cost;

            const btnBg = this.add.rectangle(width / 2, btnY, 360, 38,
                canAfford ? 0x1a1a2e : 0x110000, 0.9
            ).setStrokeStyle(1, canAfford ? 0x3a3a4e : 0x331111).setDepth(10);

            const label = this.add.text(width / 2 - 160, btnY, `✈️  ${city.name}`, {
                fontFamily: '"Playfair Display"', fontSize: '14px',
                color: canAfford ? '#d4d0cc' : '#664444',
            }).setOrigin(0, 0.5).setDepth(11);

            this.add.text(width / 2 + 160, btnY, `$${cost.toLocaleString()}`, {
                fontFamily: '"Press Start 2P"', fontSize: '7px',
                color: canAfford ? '#888888' : '#553333',
            }).setOrigin(1, 0.5).setDepth(11);

            if (canAfford) {
                btnBg.setInteractive({ useHandCursor: true });
                btnBg.on('pointerover', () => {
                    btnBg.setStrokeStyle(1, 0xc9a84c).setFillStyle(0x2a2a3e, 0.95);
                    label.setColor('#ffffff');
                });
                btnBg.on('pointerout', () => {
                    btnBg.setStrokeStyle(1, 0x3a3a4e).setFillStyle(0x1a1a2e, 0.9);
                    label.setColor('#d4d0cc');
                });
                btnBg.on('pointerdown', () => {
                    GameState.changeCity(cityId);
                    this.cameras.main.fadeOut(500, 0, 0, 0);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        // Restart the city scene with new city data
                        this.scene.stop(this.callerScene);
                        this.scene.start(this.callerScene, {
                            city: cityId,
                            ui: this.ui,
                        });
                        this.scene.stop();
                    });
                });
            }

            btnY += 48;
        });

        // Back button
        const backBtn = this.add.text(width / 2, btnY + 10, '[ BACK ]', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c94040',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);

        backBtn.on('pointerdown', () => this._close());
    }

    _goHome() {
        if (GameState.state) {
            GameState.state.burnout = Math.max(0, (GameState.state.burnout || 0) - 2);
            GameState.addNews('🏠 You rested at home. Burnout reduced.');
            GameState.autoSave();
            GameState.addNews('💾 Game auto-saved.');
        }
        this._close();
    }

    _visitCafe(location) {
        if (GameState.state) {
            GameState.state.burnout = Math.max(0, (GameState.state.burnout || 0) - 1);
            GameState.state.cash -= location.cost;
            GameState.addNews(`☕ Had an espresso at ${location.name}. Burnout eased slightly. (-$${location.cost})`);
        }
        this._close();
    }

    _close() {
        // Resume the caller scene
        this.scene.resume(this.callerScene);
        this.scene.stop();
    }
}
