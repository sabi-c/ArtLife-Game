/**
 * SpriteRegistry.js — Unified NPC & Player Sprite Management
 *
 * Single source of truth for all character spritesheets, loading, and
 * animation registration. Used by both NewWorldScene and LocationScene.
 *
 * Sprite types:
 *   1. Walk-only sheets  — 4 cols × 4 rows (16 frames: down/left/right/up × 4)
 *   2. Multi-action sheets — 4 cols × N rows, with JSON manifest describing actions
 *
 * Frame size: 160×160 (PixelLab 64×64 scaled up via generate_sprites.py)
 */

// ─── NPC Sprite Catalog ──────────────────────────────────────────────────────
// Maps sprite key → asset definition.
// `actions` is null for walk-only sheets, or an object for multi-action sheets.
const NPC_SPRITES = {
    // ── Walk-only spritesheets (4 dirs × 4 frames = 16 frames) ──
    walk_legacy_gallerist_walk: { file: 'assets/processed/walk_legacy_gallerist_walk.png' },
    walk_auction_house_type_walk: { file: 'assets/processed/walk_auction_house_type_walk.png' },
    walk_elena_ross_walk: { file: 'assets/processed/walk_elena_ross_walk.png' },
    walk_old_money_gallerist_walk: { file: 'assets/processed/walk_old_money_gallerist_walk.png' },
    walk_academic_curator_walk: { file: 'assets/processed/walk_academic_curator_walk.png' },
    walk_art_flipper_walk: { file: 'assets/processed/walk_art_flipper_walk.png' },
    walk_power_collector_f_walk: { file: 'assets/processed/walk_power_collector_f_walk.png' },
    walk_art_critic_walk: { file: 'assets/processed/walk_art_critic_walk.png' },
    walk_it_girl_dealer_walk: { file: 'assets/processed/walk_it_girl_dealer_walk.png' },
    walk_margaux_villiers_walk: { file: 'assets/processed/walk_margaux_villiers_walk.png' },
    walk_avant_garde_curator_walk: { file: 'assets/processed/walk_avant_garde_curator_walk.png' },
    walk_julian_vance_walk: { file: 'assets/processed/walk_julian_vance_walk.png' },
    walk_gallery_assistant_walk: { file: 'assets/processed/walk_gallery_assistant_walk.png' },
    walk_scene_queen_walk: { file: 'assets/processed/walk_scene_queen_walk.png' },
    walk_victoria_sterling_walk: { file: 'assets/processed/walk_victoria_sterling_walk.png' },
    walk_yuki_tanaka_walk: { file: 'assets/processed/walk_yuki_tanaka_walk.png' },

    // ── Multi-action spritesheets (walk + idle + sad_walk) ──
    victoria_sterling: {
        file: 'assets/processed/victoria_sterling_sprites.png',
        actions: {
            walk: { rowOffset: 0 },
            idle: { rowOffset: 4 },
            sadwalk: { rowOffset: 8 },
        },
    },
    yuki_tanaka: {
        file: 'assets/processed/yuki_tanaka_sprites.png',
        actions: {
            walk: { rowOffset: 0 },
            idle: { rowOffset: 4 },
            sadwalk: { rowOffset: 8 },
        },
    },
};

// Standard frame dimensions for all PixelLab-generated sheets
const FRAME_WIDTH = 160;
const FRAME_HEIGHT = 160;

// Direction → row offset within each 4-row action block
const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };

// Scale factor for overworld rendering (160px sprites on ~48px tile world)
const OVERWORLD_SCALE = 0.35;

// ─── SpriteRegistry ──────────────────────────────────────────────────────────

export class SpriteRegistry {

    /**
     * Preload all NPC spritesheets into a Phaser scene.
     * Call this from scene.preload().
     * @param {Phaser.Scene} scene
     * @param {string[]} [only] - Optional list of sprite keys to load (default: all)
     */
    static preloadAll(scene, only = null) {
        const keys = only || Object.keys(NPC_SPRITES);
        for (const key of keys) {
            const def = NPC_SPRITES[key];
            if (!def) continue;
            if (scene.textures.exists(key)) continue;

            scene.load.spritesheet(key, def.file, {
                frameWidth: FRAME_WIDTH,
                frameHeight: FRAME_HEIGHT,
            });
        }

        // Gracefully handle missing sprite files — remove from queue instead of crashing
        scene.load.on('loaderror', (fileObj) => {
            console.warn(`[SpriteRegistry] Skipping missing asset: ${fileObj.key} (${fileObj.url})`);
        });
    }

    /**
     * Register walk/idle/sadwalk animations for all loaded sprites.
     * Call this from scene.create() after assets are loaded.
     * @param {Phaser.Scene} scene
     */
    static createAnims(scene) {
        for (const [key, def] of Object.entries(NPC_SPRITES)) {
            if (!scene.textures.exists(key)) continue;

            if (def.actions) {
                // Multi-action sheet: register walk/idle/sadwalk × 4 dirs
                for (const [action, actionDef] of Object.entries(def.actions)) {
                    const rowOffset = actionDef.rowOffset;
                    for (const [dir, dirOffset] of Object.entries(DIR_ROW)) {
                        const animKey = `${key}-${action}-${dir}`;
                        if (scene.anims.exists(animKey)) continue;

                        const row = rowOffset + dirOffset;
                        const startFrame = row * 4;

                        scene.anims.create({
                            key: animKey,
                            frames: scene.anims.generateFrameNumbers(key, {
                                start: startFrame,
                                end: startFrame + 3,
                            }),
                            frameRate: action === 'idle' ? 4 : 6,
                            repeat: -1,
                        });
                    }
                }
            } else {
                // Walk-only sheet: 4 rows × 4 frames (down/left/right/up)
                for (const [dir, dirOffset] of Object.entries(DIR_ROW)) {
                    const animKey = `${key}_${dir}`;
                    if (scene.anims.exists(animKey)) continue;

                    const startFrame = dirOffset * 4;
                    scene.anims.create({
                        key: animKey,
                        frames: scene.anims.generateFrameNumbers(key, {
                            start: startFrame,
                            end: startFrame + 3,
                        }),
                        frameRate: 6,
                        repeat: -1,
                    });
                }
            }
        }
    }

    /**
     * Check if a sprite key is in the registry.
     * @param {string} key
     * @returns {boolean}
     */
    static has(key) {
        return key in NPC_SPRITES;
    }

    /**
     * Get the definition for a sprite key.
     * @param {string} key
     * @returns {object|null}
     */
    static getDef(key) {
        return NPC_SPRITES[key] || null;
    }

    /**
     * Check if a sprite has multi-action support (idle, sadwalk, etc.)
     * @param {string} key
     * @returns {boolean}
     */
    static isMultiAction(key) {
        return !!(NPC_SPRITES[key]?.actions);
    }

    /**
     * Get the animation key for a sprite + action + direction.
     *
     * For multi-action sprites: 'victoria_sterling-walk-down'
     * For walk-only sprites:    'walk_elena_ross_walk_down'
     *
     * @param {string} spriteKey
     * @param {string} action - 'walk', 'idle', 'sadwalk'
     * @param {string} direction - 'down', 'up', 'left', 'right'
     * @returns {string}
     */
    static getAnimKey(spriteKey, action, direction) {
        const def = NPC_SPRITES[spriteKey];
        if (!def) return null;

        if (def.actions) {
            return `${spriteKey}-${action}-${direction}`;
        }
        // Walk-only sheets only support 'walk' action
        return `${spriteKey}_${direction}`;
    }

    /**
     * Get the walk animation key for a given direction (convenience).
     * @param {string} spriteKey
     * @param {string} direction
     * @returns {string}
     */
    static getWalkAnim(spriteKey, direction) {
        return SpriteRegistry.getAnimKey(spriteKey, 'walk', direction);
    }

    /**
     * Get the idle animation key for a given direction.
     * Falls back to walk if sprite doesn't support idle.
     * @param {string} spriteKey
     * @param {string} direction
     * @returns {string}
     */
    static getIdleAnim(spriteKey, direction) {
        if (SpriteRegistry.isMultiAction(spriteKey)) {
            return SpriteRegistry.getAnimKey(spriteKey, 'idle', direction);
        }
        // Walk-only: no idle, return walk anim (caller can decide to stop on frame 0)
        return SpriteRegistry.getWalkAnim(spriteKey, direction);
    }

    /**
     * Configure a Phaser sprite for overworld display (scale, hitbox).
     * @param {Phaser.GameObjects.Sprite} sprite
     * @param {boolean} [isPhysics=false] - If the sprite has a physics body
     */
    static configureForOverworld(sprite, isPhysics = false) {
        sprite.setScale(OVERWORLD_SCALE);
        if (isPhysics && sprite.body) {
            sprite.body.setSize(40, 20);
            sprite.body.offset.y = 120;
            sprite.body.offset.x = 60;
        }
    }

    /**
     * Get all registered sprite keys.
     * @returns {string[]}
     */
    static getAllKeys() {
        return Object.keys(NPC_SPRITES);
    }

    /**
     * Get only multi-action sprite keys (for player sprite selection).
     * @returns {string[]}
     */
    static getPlayerSpriteKeys() {
        return Object.keys(NPC_SPRITES).filter(k => NPC_SPRITES[k].actions);
    }

    /**
     * Get only walk-only sprite keys (NPC sprites).
     * @returns {string[]}
     */
    static getWalkOnlyKeys() {
        return Object.keys(NPC_SPRITES).filter(k => !NPC_SPRITES[k].actions);
    }

    // ─── Constants ───────────────────────────────────────────────────────────
    static get FRAME_WIDTH() { return FRAME_WIDTH; }
    static get FRAME_HEIGHT() { return FRAME_HEIGHT; }
    static get OVERWORLD_SCALE() { return OVERWORLD_SCALE; }
    static get DIR_ROW() { return DIR_ROW; }
}
