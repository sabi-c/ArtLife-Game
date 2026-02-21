import Phaser from 'phaser';

/**
 * NPC.js — Decoupled NPC entity for GridEngine-based top-down scenes.
 * Reference: phaser_dungeon_crawler/src/enemies/LizardF.js
 *
 * Handles:
 *  - GridEngine random wandering
 *  - Walk animation syncing
 *  - Y-depth sorting
 */
export class NPC extends Phaser.GameObjects.Sprite {
    /** @type {string} GridEngine character id */
    characterId;

    /** @type {string} Animation prefix */
    animPrefix;

    /** @type {number} Random movement interval in ms */
    wanderInterval;

    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {string} texture - spritesheet key
     * @param {object} opts
     * @param {string} opts.characterId - unique GridEngine id (e.g. 'elena')
     * @param {string} opts.animPrefix - animation prefix (e.g. 'npc_elena')
     * @param {number} [opts.wanderInterval=2000] - ms between random moves
     * @param {number} [opts.speed=2]
     * @param {{x: number, y: number}} [opts.startPosition]
     */
    constructor(scene, x, y, texture, opts) {
        super(scene, x, y, texture, 0);
        scene.add.existing(this);

        this.characterId = opts.characterId;
        this.animPrefix = opts.animPrefix;
        this.wanderInterval = opts.wanderInterval || 2000;
        this.speed = opts.speed || 2;
        this.startPosition = opts.startPosition || { x: 0, y: 0 };
    }

    /**
     * Call from scene.update(). Syncs walk animation and Y-depth.
     * @param {Phaser.Scene} scene
     */
    update(scene) {
        const ge = scene.gridEngine;
        if (!ge) return;

        // ── Animation Sync ──
        if (ge.isMoving(this.characterId)) {
            const dir = ge.getFacingDirection(this.characterId);
            this.anims.play(`${this.animPrefix}_${dir}`, true);
        } else {
            this.anims.stop();
        }

        // ── Y-Depth Sorting ──
        this.setDepth(this.y);
    }

    /**
     * Start ambient wandering via GridEngine.
     * Call after gridEngine.create().
     * @param {Phaser.Scene} scene
     */
    startWandering(scene) {
        scene.gridEngine.moveRandomly(this.characterId, this.wanderInterval);
    }

    /**
     * Get the GridEngine config object for this NPC.
     */
    getGridEngineConfig() {
        return {
            id: this.characterId,
            sprite: this,
            startPosition: this.startPosition,
            speed: this.speed,
        };
    }
}
