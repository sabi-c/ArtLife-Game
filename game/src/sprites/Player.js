import Phaser from 'phaser';

/**
 * Player.js — Decoupled player entity for GridEngine-based top-down movement.
 * Reference: phaser3-top-down-template Player class + phaser_dungeon_crawler KnightM.js
 *
 * Handles:
 *  - Keyboard input (WASD + Arrow Keys)
 *  - GridEngine movement commands
 *  - Walk animation syncing
 *  - Directional interaction raycasting (Spacebar / E)
 *  - Y-depth sorting
 */
export class Player extends Phaser.GameObjects.Sprite {
    /** @type {string} GridEngine character id */
    characterId = 'player';

    /** @type {string} Animation prefix */
    animPrefix = 'player_walk';

    /**
     * @param {Phaser.Scene} scene
     * @param {number} x - pixel x (will be overridden by GridEngine startPosition)
     * @param {number} y - pixel y
     * @param {string} texture - spritesheet key
     * @param {object} [opts]
     * @param {string} [opts.characterId='player']
     * @param {string} [opts.animPrefix='player_walk']
     */
    constructor(scene, x, y, texture, opts = {}) {
        super(scene, x, y, texture, 0);
        scene.add.existing(this);

        this.characterId = opts.characterId || 'player';
        this.animPrefix = opts.animPrefix || 'player_walk';

        // Input — WASD + Arrow Keys
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
        this.actionKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.interactKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        /** @type {Function|null} Callback fired on successful NPC interaction */
        this.onInteract = null;
    }

    /**
     * Call from scene.update(). Handles movement, animation sync, and interaction.
     * @param {Phaser.Scene} scene
     */
    update(scene) {
        const ge = scene.gridEngine;
        if (!ge) return;

        // ── Movement ──
        const left = this.cursors.left.isDown || this.wasd.left.isDown;
        const right = this.cursors.right.isDown || this.wasd.right.isDown;
        const up = this.cursors.up.isDown || this.wasd.up.isDown;
        const down = this.cursors.down.isDown || this.wasd.down.isDown;

        if (left) ge.move(this.characterId, 'left');
        else if (right) ge.move(this.characterId, 'right');
        else if (up) ge.move(this.characterId, 'up');
        else if (down) ge.move(this.characterId, 'down');

        // ── Animation Sync ──
        if (ge.isMoving(this.characterId)) {
            const dir = ge.getFacingDirection(this.characterId);
            this.anims.play(`${this.animPrefix}_${dir}`, true);
        } else {
            this.anims.stop();
        }

        // ── Y-Depth Sorting ──
        this.setDepth(this.y);

        // ── Interaction Raycasting (Spacebar / E) ──
        if (
            Phaser.Input.Keyboard.JustDown(this.actionKey) ||
            Phaser.Input.Keyboard.JustDown(this.interactKey)
        ) {
            this._tryInteract(scene);
        }
    }

    /**
     * Check the tile the player is facing and fire onInteract if an NPC is there.
     * @private
     */
    _tryInteract(scene) {
        const ge = scene.gridEngine;
        const facing = ge.getFacingDirection(this.characterId);
        const pos = ge.getPosition(this.characterId);
        const target = { x: pos.x, y: pos.y };

        if (facing === 'left') target.x -= 1;
        else if (facing === 'right') target.x += 1;
        else if (facing === 'up') target.y -= 1;
        else if (facing === 'down') target.y += 1;

        const charsAt = ge.getCharactersAt(target);
        if (charsAt.length > 0 && this.onInteract) {
            const npcId = charsAt[0];
            // Stop NPC so they don't walk away during dialogue
            ge.stopMovement(npcId);
            this.onInteract(npcId, target);
        }
    }

    /**
     * Get the GridEngine config object for this player.
     * @param {{x: number, y: number}} startPosition
     * @param {number} [speed=4]
     */
    getGridEngineConfig(startPosition, speed = 4) {
        return {
            id: this.characterId,
            sprite: this,
            startPosition,
            speed,
        };
    }
}
