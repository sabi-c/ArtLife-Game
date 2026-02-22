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

// ── NPC definitions (spawned at Tiled dialog object positions) ──
const NPC_DEFS = [
    { id: 'npc_elena', tint: 0xff9999, label: 'Elena Ross', speed: 2 },
    { id: 'npc_margaux', tint: 0x99ccff, label: 'Margaux Villiers', speed: 1.5 },
    { id: 'npc_julian', tint: 0xccff99, label: 'Julian Vance', speed: 2.5 },
];

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
    }

    preload() {
        // Tiled JSON map — always queue load; Phaser deduplicates internally
        this.load.tilemapTiledJSON('pallet_town', '/content/maps/pallet_town.json');

        // Tilesets
        const tilesets = ['world', 'world2', 'grounds', 'grounds2'];
        for (const ts of tilesets) {
            if (!this.textures.exists(ts)) {
                this.load.image(ts, `/assets/tilesets/${ts}.png`);
            }
        }

        // Player spritesheet — 216x384, 3 cols x 4 rows = 12 frames at 72x96
        if (!this.textures.exists('world_player')) {
            this.load.spritesheet('world_player', '/assets/sprites/player.png', {
                frameWidth: 72,
                frameHeight: 96,
            });
        }
    }

    create(data) {
        super.create({ ...data, hideUI: true });

        const { width, height } = this.scale;

        // Opaque background — prevents body theme bleed-through
        this.add.rectangle(width / 2, height / 2, width, height, 0x2d6b30)
            .setDepth(-1).setScrollFactor(0);

        // Verify GridEngine plugin
        if (!this.gridEngine) {
            console.error('[WorldScene] GridEngine plugin not found!');
            this._showError('GridEngine plugin not available');
            return;
        }

        try {
            this._buildScene(data);
            this._playWipeTransition();
        } catch (err) {
            console.error('[WorldScene] create() error:', err);
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
        this.grassZones = [];
        this.items = [];

        for (const obj of objects) {
            const tx = Math.floor(obj.x / tileW);
            const ty = Math.floor(obj.y / tileH);
            const props = {};
            if (obj.properties) {
                for (const p of obj.properties) props[p.name] = p.value;
            }

            if (obj.name === 'door' || obj.type === 'door') {
                this.doors.push({ x: tx, y: ty, nextMap: props.nextMap, ...props });
            } else if (obj.name === 'dialog' || obj.type === 'dialog') {
                this.dialogs.push({ x: tx, y: ty, content: props.content || obj.name, ...props });
            } else if (obj.type === 'grass') {
                // Grass zones are rectangles — store tile bounds
                const w = Math.ceil((obj.width || tileW) / tileW);
                const h = Math.ceil((obj.height || tileH) / tileH);
                this.grassZones.push({ x: tx, y: ty, w, h });
            } else if (obj.type === 'item') {
                this.items.push({ x: tx, y: ty, name: props.item || 'mysterious object', id: `item_${tx}_${ty}` });
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
        const charLayer = renderedLayers.includes('world') ? 'world' : renderedLayers[renderedLayers.length - 1];

        const characters = [{
            id: 'player',
            sprite: this.playerSprite,
            walkingAnimationMapping: 0,
            startPosition: { x: spawnX, y: spawnY },
            charLayer,
            speed: 4,
        }];

        // Add NPC characters
        for (const npc of this.npcData) {
            characters.push({
                id: npc.id,
                sprite: npc.sprite,
                walkingAnimationMapping: 0,
                startPosition: npc.startPosition,
                charLayer,
                speed: npc.speed,
            });
        }

        this.gridEngine.create(this.map, {
            collisionTilePropertyName: 'collides',
            characters,
        });

        // Start NPC wandering
        for (const npc of this.npcData) {
            this.gridEngine.moveRandomly(npc.id, 2000 + Math.random() * 2000);
        }

        // ── Y-depth sorting ──
        this.gridEngine.movementStarted().subscribe(({ charId }) => {
            this._updateCharDepth(charId);
        });
        this.gridEngine.movementStopped().subscribe(({ charId }) => {
            this._updateCharDepth(charId);
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
                // Check grass encounters
                this._checkGrassEncounter(pos);
                // Check item pickups
                this._checkItemPickup(pos);
            }
        });

        // ── Camera ──
        this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
        this.cameras.main.setZoom(2);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels, true);
        this.cameras.main.roundPixels = true;
        this.cameras.main.fadeIn(400, 0, 0, 0);

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
        this.interactKey.on('down', () => this._onInteractPress());

        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        // Mobile joypad support
        window.joypadState = null;

        // ── Scene entry sound ──
        WebAudioService.sceneEnter();

        // ── Notify React ──
        GameEventBus.emit(GameEvents.SCENE_READY, 'WorldScene');
        console.log('[WorldScene] Ready. NPCs:', this.npcData.length, 'Items:', this.items.length);
    }

    // ════════════════════════════════════════════════════
    // NPC Spawning
    // ════════════════════════════════════════════════════

    _spawnNPCs() {
        // Place NPCs at dialog object positions from the Tiled map
        const dialogPositions = this.dialogs.slice(0, NPC_DEFS.length);

        for (let i = 0; i < Math.min(NPC_DEFS.length, dialogPositions.length); i++) {
            const def = NPC_DEFS[i];
            const pos = dialogPositions[i];

            const sprite = this.add.sprite(0, 0, 'world_player');
            sprite.setOrigin(0.5, 0.75);
            sprite.setTint(def.tint);

            this.npcSprites.push(sprite);
            this.npcData.push({
                id: def.id,
                label: def.label,
                sprite,
                speed: def.speed,
                startPosition: { x: pos.x, y: pos.y },
                dialogContent: pos.content,
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
        if (!this.gridEngine) return;
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

        // Daylight refresh every ~5s
        if (time % 5000 < 20) this._applyDaylight();

        // Grass cooldown
        if (this.grassCooldown > 0) this.grassCooldown -= delta;
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
    // Interaction System
    // ════════════════════════════════════════════════════

    _onInteractPress() {
        // If dialog is showing, advance/dismiss it
        if (this.dialogActive) {
            this._dismissDialog();
            return;
        }

        if (!this.gridEngine) return;
        const pos = this.gridEngine.getPosition('player');
        const facing = this.gridEngine.getFacingDirection('player');

        // Calculate target tile
        const target = { x: pos.x, y: pos.y };
        if (facing === 'left') target.x--;
        else if (facing === 'right') target.x++;
        else if (facing === 'up') target.y--;
        else if (facing === 'down') target.y++;

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
            } catch (e) { /* turnTowards may not be available */ }

            WebAudioService.select();
            this._showDialog(
                npcAtTarget.label,
                npcAtTarget.dialogContent || `${npcAtTarget.label}: "The art world is full of surprises."`,
                () => {
                    // Resume wandering after dialog
                    this.gridEngine.moveRandomly(npcAtTarget.id, 2000 + Math.random() * 2000);
                }
            );
            return;
        }

        // ── Check door interaction ──
        const door = this.doors.find(d => d.x === target.x && d.y === target.y);
        if (door) {
            WebAudioService.doorEnter();
            this._enterDoor(door);
            return;
        }

        // ── Check sign/dialog interaction ──
        const dialog = this.dialogs.find(d => d.x === target.x && d.y === target.y);
        if (dialog) {
            WebAudioService.select();
            this._showDialog('Sign', dialog.content);
            return;
        }
    }

    // ════════════════════════════════════════════════════
    // Dialog System (typewriter text, player freeze)
    // ════════════════════════════════════════════════════

    _showDialog(speaker, text, onDismiss) {
        if (this.dialogActive) return;
        this.dialogActive = true;
        this._onDialogDismiss = onDismiss || null;

        const { width, height } = this.scale;
        const boxH = 80;
        const boxY = height - boxH / 2 - 8;
        const padding = 16;

        // Background
        const bg = this.add.rectangle(width / 2, boxY, width - 16, boxH, 0x000000, 0.92)
            .setScrollFactor(0).setDepth(DEPTH.DIALOG_BG)
            .setStrokeStyle(2, 0xffffff);

        // Speaker label
        const label = this.add.text(padding + 8, boxY - boxH / 2 + 8, speaker.toUpperCase(), {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#ffd700',
        }).setScrollFactor(0).setDepth(DEPTH.DIALOG_TEXT).setOrigin(0, 0);

        // Dialog text (typewriter)
        const textObj = this.add.text(padding + 8, boxY - boxH / 2 + 24, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffffff',
            wordWrap: { width: width - 48 },
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
        if (door.nextMap) {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                // Save position for when we return
                const pos = this.gridEngine.getPosition('player');
                GameState.state.overworldPosition = { x: pos.x, y: pos.y };

                // For now, show a dialog about the door (no interior maps yet)
                // When interior maps are added, switch to: this.scene.start('InteriorScene', { map: door.nextMap })
                this.cameras.main.fadeIn(300, 0, 0, 0);
                this._showDialog('Door', `The door to ${door.nextMap || 'this building'} is locked. (Interior maps coming soon!)`);
            });
        } else {
            this._showDialog('Door', 'This door appears to be locked.');
        }
    }

    // ════════════════════════════════════════════════════
    // Grass Encounters
    // ════════════════════════════════════════════════════

    _checkGrassEncounter(pos) {
        if (this.grassCooldown > 0) return;
        if (this.dialogActive) return;

        const inGrass = this.grassZones.some(zone =>
            pos.x >= zone.x && pos.x < zone.x + zone.w &&
            pos.y >= zone.y && pos.y < zone.y + zone.h
        );

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

        const week = GameState.state?.week || 1;
        const normalizedTime = (week % 26) / 26;
        const alpha = Math.abs(0.5 - normalizedTime) * 0.3; // 0 to 0.15

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
        this.npcSprites = [];
        this.npcData = [];
        this.dialogElements = [];
        this.itemSprites = [];
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
