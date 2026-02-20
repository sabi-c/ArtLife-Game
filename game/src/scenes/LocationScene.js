import Phaser from 'phaser';
import { VENUE_MAP } from '../data/rooms.js';
import { CONTACTS } from '../data/contacts.js';
import { DIALOGUE_TREES, TREES_BY_NPC } from '../data/dialogue_trees.js';
import { DialogueTreeManager } from '../managers/DialogueTreeManager.js';
import { QualityGate } from '../managers/QualityGate.js';
import { GameState } from '../managers/GameState.js';

/**
 * LocationScene — Top-Down Exploration Engine
 * Replaces the text menu bridge with a fully explorable tilemap.
 */
export class LocationScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LocationScene' });
    }

    init(data) {
        this.venueId = data.venueId || 'gallery_opening';
        this.roomId = data.roomId || 'chelsea_main_floor';
        this.returnScene = data.returnScene || null;
        this.returnArgs = data.returnArgs || {};
        this.ui = data.ui;

        // Find room data
        const venue = VENUE_MAP[this.venueId];
        this.roomData = venue ? venue.rooms.find(r => r.id === this.roomId) : null;

        // Resolve player sprite key from GameState character, fallback to generic
        const charId = GameState.state?.character?.id || 'julian_vance';
        this.playerSpriteKey = `walk_${charId}_walk`;

        // Hide terminal
        if (this.ui && this.ui.container) {
            this.ui.container.style.display = 'none';
        }
    }

    preload() {
        this.load.image('kenney_indoor', '/assets/tilesets/kenney_roguelike_indoors/Tilesheets/roguelikeIndoor_transparent.png');

        const npcKeys = [
            'walk_legacy_gallerist_walk', 'walk_auction_house_type_walk', 'walk_elena_ross_walk',
            'walk_old_money_gallerist_walk', 'walk_academic_curator_walk', 'walk_young_artist_walk',
            'walk_art_flipper_walk', 'walk_tech_collector_f_walk', 'walk_power_collector_f_walk',
            'walk_art_critic_walk', 'walk_young_power_dealer_walk', 'walk_underground_connector_walk',
            'walk_it_girl_dealer_walk', 'walk_margaux_villiers_walk', 'walk_avant_garde_curator_walk',
            'walk_julian_vance_walk'
        ];

        npcKeys.forEach(key => {
            // Assume 4x4 grid. The images are typically 64x64 or 128x128 total.
            // If it's a 32x32 pixel character in a 4x4 sheet, the frame is usually 16x16, 24x24, or 32x32. 
            // We'll assume typical RPG Maker size or generic 32x32.
            this.load.spritesheet(key, `/sprites/${key}.png`, { frameWidth: 32, frameHeight: 32 });
        });

        if (!this.textures.exists('placeholder_exit')) {
            const gfx = this.add.graphics();
            gfx.fillStyle(0x4488cc, 1);
            gfx.fillRect(0, 0, 16, 16);
            gfx.generateTexture('placeholder_exit', 16, 16);
            gfx.destroy();
        }
    }

    create() {
        // Setup sprite animations globally for this scene
        const npcKeys = Object.keys(this.textures.list).filter(k => k.startsWith('walk_'));
        npcKeys.forEach(key => {
            // Typical 4x4 grid mappings: Down (0-3), Left (4-7), Right (8-11), Up (12-15)
            if (!this.anims.exists(`${key}_down`)) {
                this.anims.create({ key: `${key}_down`, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
                this.anims.create({ key: `${key}_left`, frames: this.anims.generateFrameNumbers(key, { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
                this.anims.create({ key: `${key}_right`, frames: this.anims.generateFrameNumbers(key, { start: 8, end: 11 }), frameRate: 6, repeat: -1 });
                this.anims.create({ key: `${key}_up`, frames: this.anims.generateFrameNumbers(key, { start: 12, end: 15 }), frameRate: 6, repeat: -1 });
            }
        });

        const { width, height } = this.scale;

        // Fade in
        this.cameras.main.fadeIn(300, 0, 0, 0);
        this.cameras.main.setBackgroundColor('#14141f');

        // ── Camera Vignette PostFX (visual consistency with OverworldScene) ──
        try {
            const vignette = this.cameras.main.postFX.addVignette();
            vignette.radius = 0.85;
        } catch (e) { /* Canvas renderer fallback */ }

        if (!this.roomData) {
            this.add.text(width / 2, height / 2, `Error: Room missing.`).setOrigin(0.5);
            this.time.delayedCall(2000, () => this.leaveLocation());
            return;
        }

        // Draw basic dynamic map (16x16 Kenney tiles scaled by 2)
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

        // Center the map in the middle of the screen (approximate for now)
        const mapW = 15 * 16 * 2;
        const mapH = 10 * 16 * 2;
        const ox = (width - mapW) / 2;
        const oy = (height - mapH) / 2;

        const layer = map.createLayer(0, tiles, ox, oy);
        layer.setScale(2);

        // UI Layer
        this.add.text(20, 20, `📍 ${this.roomData.name.toUpperCase()}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#c9a84c'
        }).setScrollFactor(0).setDepth(100);

        const exitBtn = this.add.text(width - 20, 20, '[ LEAVE VENUE ]', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#c94040'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(100);

        exitBtn.on('pointerover', () => exitBtn.setColor('#ff8888'));
        exitBtn.on('pointerout', () => exitBtn.setColor('#c94040'));
        exitBtn.on('pointerdown', () => this.leaveLocation());

        // Narrative Description popup at start
        if (this.roomData.desc) {
            this.descBox = this.add.rectangle(width / 2, height - 40, width - 40, 60, 0x111118, 0.9).setScrollFactor(0).setDepth(99);
            this.descBox.setStrokeStyle(1, 0x3a3a4e);
            this.descText = this.add.text(width / 2, height - 40, this.roomData.desc, {
                fontFamily: '"Playfair Display"', fontSize: '13px', color: '#d4d0cc', wordWrap: { width: width - 80 }, align: 'center'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

            // Auto hide after 5 seconds
            this.time.delayedCall(5000, () => {
                this.tweens.add({ targets: [this.descBox, this.descText], alpha: 0, duration: 500 });
            });
        }

        // Setup Room Interactables
        this.interactables = this.physics.add.group();
        this.populateRoom(width / 2, height / 2);

        // Player Setup — use character-aware sprite key, fall back gracefully
        const spriteKey = this.textures.exists(this.playerSpriteKey) ? this.playerSpriteKey : 'walk_julian_vance_walk';
        this.player = this.physics.add.sprite(width / 2, height / 2, spriteKey);
        this.player.setScale(2);
        this.player.setCollideWorldBounds(true);
        this.physics.world.setBounds(ox, oy, mapW, mapH);
        this.player.facing = 'down';

        // Camera Setup
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(ox, oy, mapW, mapH);

        // Input Setup
        this.cursors = this.input.keyboard.createCursorKeys();
        this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.walkSpeed = 120;

        // Collisions
        this.physics.add.collider(this.player, this.interactables);
    }

    populateRoom(centerX, centerY) {
        // NPCs
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

        // Exits
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

    update(time, delta) {
        if (!this.player || !this.player.body) return;

        this.player.body.setVelocity(0);

        // Handle 4-way Input (Classic Pokemon movement)
        const sk = this.player.texture.key; // active sprite key
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

        // Interaction Check
        if (Phaser.Input.Keyboard.JustDown(this.actionKey)) {
            this.checkForInteraction();
        }
    }

    checkForInteraction() {
        const range = 40;
        let pX = this.player.x;
        let pY = this.player.y;

        // Check the tile directly in front of the player
        if (this.player.facing === 'left') pX -= range;
        else if (this.player.facing === 'right') pX += range;
        else if (this.player.facing === 'up') pY -= range;
        else if (this.player.facing === 'down') pY += range;

        let closest = null;
        let minDist = 30; // Max allowed distance to consider

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
                this.cameras.main.fadeOut(300, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.restart({ venueId: this.venueId, roomId: obj.interactId, ui: this.ui });
                });
            } else {
                this.cameras.main.shake(100, 0.005);
                // Optionally show block message overhead
            }
        } else if (obj.interactType === 'character') {
            this.startDialogue(obj.interactId);
        }
    }

    startDialogue(characterId) {
        // Find if this NPC has a dialogue tree in this venue
        const trees = TREES_BY_NPC[characterId];
        let targetTree = null;

        if (trees) {
            targetTree = trees.find(t => t.venue === this.venueId);
            if (!targetTree) targetTree = trees[0]; // fallback
        } else {
            // Check DIALOGUE_TREES legacy structure (some keys might be direct character IDs instead of arrays)
            if (DIALOGUE_TREES[characterId] && !Array.isArray(DIALOGUE_TREES[characterId])) {
                targetTree = DIALOGUE_TREES[characterId];
            }
        }

        if (!targetTree) {
            console.warn(`No dialogue tree found for ${characterId} at ${this.venueId}`);
            // Show brief generic message overhead
            this.player.body.setVelocity(0);
            return;
        }

        const event = DialogueTreeManager.convertTreeToEvent(targetTree);

        // Pause Overworld and launch Dialogue Overlay
        this.scene.pause();
        this.scene.launch('DialogueScene', {
            event: event,
            ui: this.ui,
            // When DialogueScene calls exitToHub(), it checks for onExit
            onExit: () => {
                this.scene.stop('DialogueScene');
                this.scene.resume('LocationScene');
            }
        });
    }

    leaveLocation() {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (this.returnScene) {
                // Return to previous visual scene (e.g., CityScene)
                this.scene.start(this.returnScene, {
                    ...this.returnArgs,
                    ui: this.ui
                });
            } else {
                // Return to DOM Dashboard
                if (this.ui && this.ui.container) {
                    this.ui.container.style.display = 'block';
                    this.ui.popScreen(); // Remove empty trap screen
                    this.ui.render();
                }
                this.scene.stop();
            }
        });
    }
}
