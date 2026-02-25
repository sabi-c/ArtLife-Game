/**
 * CharacterAnims.js — Centralized animation registry
 * Reference: phaser_dungeon_crawler/src/anims/CharacterAnims.js
 *
 * Call once from the scene's create() to register all walk-cycle animations.
 * Idempotent — safe to call multiple times (checks anims.exists first).
 */

/**
 * Register a standard 4-direction walk cycle for a spritesheet.
 * Expects a 4×4 grid: row 0=down, row 1=left, row 2=right, row 3=up.
 * @param {Phaser.Animations.AnimationManager} anims
 * @param {string} key - texture key (e.g. 'player_walk')
 * @param {string} prefix - animation prefix (e.g. 'player_walk')
 * @param {number} frameRate
 */
export function registerWalkAnims(anims, key, prefix, frameRate = 8) {
    const directions = ['down', 'left', 'right', 'up'];
    directions.forEach((dir, row) => {
        const animKey = `${prefix}_${dir}`;
        if (!anims.exists(animKey)) {
            anims.create({
                key: animKey,
                frames: anims.generateFrameNumbers(key, {
                    start: row * 4,
                    end: row * 4 + 3,
                }),
                frameRate,
                repeat: -1,
            });
        }
    });
}

/**
 * Register all known character animations in bulk.
 * @param {Phaser.Animations.AnimationManager} anims
 * @param {Array<{key: string, prefix: string, frameRate?: number}>} characters
 */
export function registerAllAnims(anims, characters) {
    for (const c of characters) {
        registerWalkAnims(anims, c.key, c.prefix, c.frameRate || 8);
    }
}
