import { BaseScene } from './BaseScene.js';
import { Player } from '../sprites/Player.js';
import { NPC } from '../sprites/NPC.js';
import { registerAllAnims } from '../anims/CharacterAnims.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { GameState } from '../managers/GameState.js';

/**
 * OverworldScene — Phase 40.5 Top-Down Exploration Engine (Refactored)
 *
 * Now uses decoupled Player, NPC, and CharacterAnims classes.
 * Handles: tilemap setup, GridEngine config, camera, and scene transitions.
 */
export class OverworldScene extends BaseScene {
    constructor() {
        super('OverworldScene');
    }



    preload() {
        // Load Kenney Urban Tileset
        this.load.image('ow_urban_tiles', '/assets/tilesets/kenney_rpg_urban_pack/Tilemap/tilemap_packed.png');

        // Load spritesheets (idempotent)
        if (!this.textures.exists('player_walk')) {
            this.load.spritesheet('player_walk', '/sprites/player_walk.png', { frameWidth: 160, frameHeight: 160 });
        }
        if (!this.textures.exists('npc_elena')) {
            this.load.spritesheet('npc_elena', '/sprites/walk_elena_ross_walk.png', { frameWidth: 160, frameHeight: 160 });
        }
        if (!this.textures.exists('npc_margaux')) {
            this.load.spritesheet('npc_margaux', '/sprites/walk_margaux_villiers_walk.png', { frameWidth: 160, frameHeight: 160 });
        }
    }

    create(data) {
        super.create({ ...data, hideUI: true }); // Hides UI via BaseScene
        this.venueId = data?.venueId || 'gallery_test';
        this.roomId = data?.roomId || 'entrance';

        const { width, height } = this.scale;

        // ── Fade In (cinematic entry, pokemon-react-phaser pattern) ──
        this.cameras.main.fadeIn(400, 0, 0, 0);
        this.add.rectangle(width / 2, height / 2, width, height, 0x14141f).setDepth(-1);
        this.cameras.main.setBackgroundColor('#14141f');

        // ── Camera Vignette PostFX (1-line polish from pokemon-react-phaser) ──
        try {
            const vignette = this.cameras.main.postFX.addVignette();
            vignette.radius = 0.85;
        } catch (e) {
            // WebGL postFX not supported in Canvas renderer — safe to ignore
        }

        // ── Daylight Overlay (time-of-day tinting from pokemon-react-phaser) ──
        this.daylightOverlay = this.add.graphics();
        this.daylightOverlay.setDepth(999);
        this.daylightOverlay.setScrollFactor(0);
        this._applyDaylight();

        // ── Register Animations (centralized) ──
        registerAllAnims(this.anims, [
            { key: 'player_walk', prefix: 'player_walk' },
            { key: 'npc_elena', prefix: 'npc_elena' },
            { key: 'npc_margaux', prefix: 'npc_margaux' },
        ]);

        // ── Tilemap ──
        const mapData = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 70, 70, 70, 70, 12, 12, 12, 12, 70, 70, 70, 70, 0, 0, 0, 0, 0, 0],
            [0, 0, 70, 70, 70, 70, 12, 12, 12, 12, 70, 70, 70, 70, 0, 0, 0, 0, 0, 0],
            [0, 0, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0, 0, 0],
            [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0],
            [28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 0, 0],
            [28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 0, 0],
            [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0],
            [0, 0, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0, 0, 0],
            [0, 0, 70, 70, 70, 70, 12, 12, 12, 12, 70, 70, 70, 70, 0, 0, 0, 0, 0, 0],
            [0, 0, 70, 70, 70, 70, 12, 12, 12, 12, 70, 70, 70, 70, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ];

        const map = this.make.tilemap({ data: mapData, tileWidth: 16, tileHeight: 16 });
        const tiles = map.addTilesetImage('ow_urban_tiles', 'ow_urban_tiles', 16, 16, 0, 1);

        const mapW = 20 * 16;
        const mapH = 13 * 16;
        const ox = (width - mapW) / 2;
        const oy = (height - mapH) / 2;

        const layer = map.createLayer(0, tiles, ox, oy);

        // Collisions (tile index 70 = building walls)
        layer.forEachTile(tile => {
            if (tile.index === 70) {
                tile.properties.ge_collide = true;
            }
        });

        // ── HUD (will move to GameUI scene later) ──
        this.add.text(20, 20, 'TOWN WALK TEST ENGINE', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#8888aa'
        }).setScrollFactor(0).setDepth(100);

        const exitBtn = this.add.text(width - 20, 20, '[ RETURN TO TERMINAL ]', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c94040'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(100);

        exitBtn.on('pointerover', () => exitBtn.setColor('#ff8888'));
        exitBtn.on('pointerout', () => exitBtn.setColor('#c94040'));
        exitBtn.on('pointerdown', () => this.leaveLocation());

        // ── Mobile Touch-to-Move ──
        this.input.on('pointerdown', (pointer) => {
            // Only handle taps on the game area, not the exit button
            if (pointer.y < 40) return;
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const tileX = map.worldToTileX(worldPoint.x);
            const tileY = map.worldToTileY(worldPoint.y);
            if (tileX !== null && tileY !== null) {
                this.gridEngine.moveTo('player', { x: tileX, y: tileY });
            }
        });

        // ── Player (decoupled) ──
        this.player = new Player(this, 0, 0, 'player_walk');
        this.player.onInteract = (npcId) => this._handleNPCInteraction(npcId);

        // ── NPCs (decoupled) ──
        this.npcs = [
            new NPC(this, 0, 0, 'npc_elena', {
                characterId: 'elena',
                animPrefix: 'npc_elena',
                startPosition: { x: 12, y: 8 },
                speed: 2,
                wanderInterval: 2000,
            }),
            new NPC(this, 0, 0, 'npc_margaux', {
                characterId: 'margaux',
                animPrefix: 'npc_margaux',
                startPosition: { x: 6, y: 4 },
                speed: 2,
                wanderInterval: 2500,
            }),
        ];

        // ── GridEngine Setup ──
        const gridEngineConfig = {
            characters: [
                this.player.getGridEngineConfig({ x: 10, y: 6 }, 4),
                ...this.npcs.map(npc => npc.getGridEngineConfig()),
            ],
            numberOfDirections: 4,
        };
        this.gridEngine.create(map, gridEngineConfig);

        // Start NPC wandering
        this.npcs.forEach(npc => npc.startWandering(this));

        // ── Position Auto-Save (pokemon-react-phaser pattern) ──
        // Save player position to GameState on every tile change
        this.gridEngine.positionChangeFinished().subscribe((observer) => {
            if (observer.charId === 'player' && GameState.state) {
                const pos = this.gridEngine.getPosition('player');
                const facing = this.gridEngine.getFacingDirection('player');
                GameState.state.overworldPosition = {
                    x: pos.x,
                    y: pos.y,
                    venueId: this.venueId,
                    roomId: this.roomId,
                    facingDirection: facing,
                };
                GameEventBus.emit(GameEvents.PLAYER_POSITION_CHANGED, GameState.state.overworldPosition);
            }
        });

        // ── Camera ──
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08); // setLerp for smooth follow
        this.cameras.main.setZoom(5);
        this.cameras.main.setBounds(ox, oy, mapW, mapH);

        // Emit overworld enter event
        GameEventBus.emit(GameEvents.OVERWORLD_ENTER, { venueId: this.venueId });

        // ── ESC key force-exit (safety hatch) ──
        this.input.keyboard.on('keydown-ESC', this.leaveLocation, this);
    }

    update(time, delta) {
        if (!this.player) return;

        // Delegate to decoupled entities
        this.player.update(this);
        this.npcs.forEach(npc => npc.update(this));

        // Refresh daylight every ~5 seconds (in-game week cycles)
        if (time % 5000 < 20) {
            this._applyDaylight();
        }
    }

    /**
     * Apply a time-based daylight tint overlay.
     * Uses the in-game week number to simulate passage of time.
     * Inspired by pokemon-react-phaser's real-time daylight system.
     * @private
     */
    _applyDaylight() {
        if (!this.daylightOverlay) return;
        const { width, height } = this.scale;
        this.daylightOverlay.clear();

        // Use in-game week to create a subtle time-of-day feel
        // Weeks 1-6: morning (light), 7-13: afternoon, 14-20: evening (darker), 21-26: night
        const week = GameState.state?.week || 1;
        const normalizedTime = (week % 26) / 26; // 0-1 cycle
        const alpha = Math.abs(0.5 - normalizedTime) * 0.3; // 0 to 0.15 range

        this.daylightOverlay.fillStyle(0x000033, alpha);
        this.daylightOverlay.fillRect(0, 0, width, height);
    }

    /**
     * Handle NPC interaction — triggered by Player's onInteract callback.
     * @param {string} npcId
     */
    _handleNPCInteraction(npcId) {
        let npcName = npcId;
        if (npcId === 'elena') npcName = 'elena_ross';
        if (npcId === 'margaux') npcName = 'margaux_villiers';

        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('DialogueScene', {
                event: {
                    title: `Chat with ${npcId}`,
                    steps: [{
                        type: 'narrative',
                        text: `You cautiously approach ${npcId}. "What do you want?" they ask.`,
                        characterId: npcName,
                    }],
                },
                ui: this.ui,
                returnScene: 'OverworldScene',
                returnArgs: { venueId: this.venueId, roomId: this.roomId },
            });
        });
    }

    leaveLocation() {
        GameEventBus.emit(GameEvents.OVERWORLD_EXIT, { venueId: this.venueId });
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.showTerminalUI();
            if (this.ui) this.ui.render();
            this.scene.stop();
        });
    }
}
