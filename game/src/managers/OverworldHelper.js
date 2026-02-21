import Phaser from 'phaser';

/**
 * OverworldHelper — Phase 40 Agent-3: Ambient Polish
 * 
 * Utility module that any Overworld/Location scene can import.
 * Provides y-depth sorting, NPC idle animations, environment tinting,
 * and tilemap rendering helpers — all non-destructive and additive.
 * 
 * Usage in a scene:
 *   import { OverworldHelper } from '../managers/OverworldHelper.js';
 * 
 *   create() {
 *     this.owHelper = new OverworldHelper(this);
 *     this.owHelper.applyEnvironmentTint(0xeeeeff, 0.08);
 *     this.owHelper.addIdleBob(npcSprite);
 *   }
 * 
 *   update() {
 *     this.owHelper.updateDepthSort(this.player, this.npcGroup);
 *     this.owHelper.updatePlayerAnimation(this.player, velocity);
 *   }
 */
export class OverworldHelper {
    /**
     * @param {Phaser.Scene} scene - The scene to apply polish to
     */
    constructor(scene) {
        this.scene = scene;
    }

    // ─────────────────────────────────────────
    // Y-DEPTH SORTING
    // ─────────────────────────────────────────

    /**
     * Sort sprites by Y position so sprites lower on screen render in front.
     * Call this in update() for all sprites that should overlap correctly.
     * 
     * @param {Phaser.GameObjects.Sprite} player - The player sprite
     * @param {Phaser.GameObjects.Group|Array} otherSprites - NPCs, furniture, etc.
     */
    updateDepthSort(player, otherSprites) {
        if (player) {
            player.setDepth(player.y);
        }

        const sprites = otherSprites?.getChildren ? otherSprites.getChildren() : otherSprites;
        if (sprites && Array.isArray(sprites)) {
            sprites.forEach(sprite => {
                if (sprite && sprite.setDepth) {
                    sprite.setDepth(sprite.y);
                }
            });
        }
    }

    // ─────────────────────────────────────────
    // PLAYER ANIMATION HELPER
    // ─────────────────────────────────────────

    /**
     * Play the correct walking/idle animation based on velocity.
     * Assumes animations 'walk_down', 'walk_left', 'walk_right', 'walk_up',
     * 'idle_down', 'idle_left', 'idle_right', 'idle_up' are registered.
     * 
     * @param {Phaser.GameObjects.Sprite} player - The player sprite
     * @param {{ x: number, y: number }} velocity - The player's body velocity
     * @param {string} [currentFacing='down'] - Fallback facing direction
     * @returns {string} The current facing direction
     */
    updatePlayerAnimation(player, velocity, currentFacing = 'down') {
        if (!player || !player.anims) return currentFacing;

        const vx = velocity?.x || 0;
        const vy = velocity?.y || 0;
        const isMoving = Math.abs(vx) > 5 || Math.abs(vy) > 5;

        let facing = currentFacing;

        if (isMoving) {
            // Determine primary direction
            if (Math.abs(vx) > Math.abs(vy)) {
                facing = vx < 0 ? 'left' : 'right';
            } else {
                facing = vy < 0 ? 'up' : 'down';
            }

            const walkKey = `walk_${facing}`;
            if (player.anims.currentAnim?.key !== walkKey) {
                player.anims.play(walkKey, true);
            }
        } else {
            // Idle
            const idleKey = `idle_${facing}`;
            if (player.anims.currentAnim?.key !== idleKey) {
                player.anims.play(idleKey, true);
            }
        }

        return facing;
    }

    // ─────────────────────────────────────────
    // NPC IDLE ANIMATIONS
    // ─────────────────────────────────────────

    /**
     * Add a subtle breathing/bobbing tween to an NPC sprite.
     * Creates a gentle up-down movement that makes NPCs feel alive.
     * 
     * @param {Phaser.GameObjects.Sprite|Phaser.GameObjects.Image} sprite - The NPC sprite
     * @param {object} [options] - Configuration
     * @param {number} [options.amplitude=2] - Pixels to bob up/down
     * @param {number} [options.duration=2000] - Full cycle duration in ms
     * @param {number} [options.delay=0] - Start delay (randomize for variety)
     */
    addIdleBob(sprite, options = {}) {
        const {
            amplitude = 2,
            duration = 2000,
            delay = Math.random() * 1000  // Random offset so NPCs don't breathe in sync
        } = options;

        const baseY = sprite.y;

        this.scene.tweens.add({
            targets: sprite,
            y: baseY - amplitude,
            duration: duration / 2,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: delay
        });
    }

    /**
     * Add idle bob to all sprites in a group.
     * @param {Phaser.GameObjects.Group|Array} group 
     */
    addIdleBobToGroup(group) {
        const sprites = group?.getChildren ? group.getChildren() : group;
        if (sprites && Array.isArray(sprites)) {
            sprites.forEach(sprite => this.addIdleBob(sprite));
        }
    }

    // ─────────────────────────────────────────
    // ENVIRONMENT TINTING
    // ─────────────────────────────────────────

    /**
     * Apply a subtle color overlay to the entire scene for atmosphere.
     * Creates a full-screen rectangle with the specified tint.
     * 
     * @param {number} color - Hex color (e.g. 0xeeeeff for cool gallery light)
     * @param {number} alpha - Opacity (0.05-0.15 recommended for subtlety)
     * @returns {Phaser.GameObjects.Rectangle} The tint overlay (for later removal)
     */
    applyEnvironmentTint(color = 0xeeeeff, alpha = 0.08) {
        const { width, height } = this.scene.scale;
        const overlay = this.scene.add.rectangle(width / 2, height / 2, width * 3, height * 3, color, alpha);
        overlay.setScrollFactor(0);
        overlay.setDepth(999);  // Always on top
        overlay.setBlendMode(Phaser.BlendModes.ADD);
        return overlay;
    }

    /**
     * Apply a vignette-style darkening at screen edges.
     * Uses a radial gradient texture for a cinematic feel.
     * 
     * @param {number} alpha - Darkness intensity (0.1-0.4 recommended)
     * @returns {Phaser.GameObjects.Image|null} The vignette sprite
     */
    applyVignette(alpha = 0.2) {
        const { width, height } = this.scene.scale;

        // Create a radial gradient texture programmatically
        const key = 'vignette_overlay';
        if (!this.scene.textures.exists(key)) {
            const canvas = this.scene.textures.createCanvas(key, 256, 256);
            const ctx = canvas.getContext();
            const gradient = ctx.createRadialGradient(128, 128, 50, 128, 128, 128);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 256);
            canvas.refresh();
        }

        const vignette = this.scene.add.image(width / 2, height / 2, key);
        vignette.setDisplaySize(width * 3, height * 3);
        vignette.setScrollFactor(0);
        vignette.setDepth(998);
        vignette.setAlpha(alpha);
        return vignette;
    }

    // ─────────────────────────────────────────
    // TILEMAP RENDERING HELPER
    // ─────────────────────────────────────────

    /**
     * Render a 2D array of tile indices using a preloaded spritesheet.
     * Places individual sprite images at each grid cell.
     * 
     * @param {number[][]} tileData - 2D array of tile indices (0 = empty)
     * @param {string} tilesetKey - Key of the loaded spritesheet
     * @param {object} [options] - Configuration
     * @param {number} [options.tileSize=16] - Size of each tile in px
     * @param {number} [options.scale=2] - Visual scale multiplier
     * @param {number} [options.offsetX=0] - Pixel offset from left
     * @param {number} [options.offsetY=0] - Pixel offset from top
     * @returns {Phaser.GameObjects.Group} Group containing all tile sprites
     */
    renderTileLayer(tileData, tilesetKey, options = {}) {
        const {
            tileSize = 16,
            scale = 2,
            offsetX = 0,
            offsetY = 0
        } = options;

        const group = this.scene.add.group();

        for (let row = 0; row < tileData.length; row++) {
            for (let col = 0; col < tileData[row].length; col++) {
                const tileIndex = tileData[row][col];
                if (tileIndex === 0) continue;  // Skip empty tiles

                const x = offsetX + col * tileSize * scale + (tileSize * scale / 2);
                const y = offsetY + row * tileSize * scale + (tileSize * scale / 2);

                const tile = this.scene.add.image(x, y, tilesetKey, tileIndex);
                tile.setScale(scale);
                group.add(tile);
            }
        }

        return group;
    }

    /**
     * Place interactive objects from the GALLERY_OBJECTS array.
     * Creates sprites/images for each object and returns them grouped by type.
     * 
     * @param {Array} objects - Array of object definitions from gallery_map.js
     * @param {object} [options] - Configuration
     * @param {number} [options.tileSize=16]
     * @param {number} [options.scale=2]
     * @param {number} [options.offsetX=0]
     * @param {number} [options.offsetY=0]
     * @returns {{ npcs: Array, furniture: Array, exits: Array, artworks: Array }}
     */
    placeObjects(objects, options = {}) {
        const {
            tileSize = 16,
            scale = 2,
            offsetX = 0,
            offsetY = 0
        } = options;

        const result = { npcs: [], furniture: [], exits: [], artworks: [] };

        objects.forEach(obj => {
            const x = offsetX + obj.x * tileSize * scale + (tileSize * scale / 2);
            const y = offsetY + obj.y * tileSize * scale + (tileSize * scale / 2);

            if (obj.type === 'npc') {
                // Use the assigned sprite key if the texture exists, otherwise placeholder
                const key = this.scene.textures.exists(obj.spriteKey) ? obj.spriteKey : null;
                let npcSprite;

                if (key) {
                    npcSprite = this.scene.add.image(x, y, key);
                    npcSprite.setDisplaySize(tileSize * scale, tileSize * scale);
                } else {
                    // Generate a colored placeholder
                    npcSprite = this.scene.add.rectangle(x, y, tileSize * scale - 4, tileSize * scale - 4, 0xc94040);
                }

                npcSprite.npcData = obj;
                result.npcs.push(npcSprite);
            } else if (obj.type === 'exit') {
                const exitMarker = this.scene.add.rectangle(x, y, tileSize * scale, tileSize * scale, 0x4488cc, 0.3);
                exitMarker.exitData = obj;
                result.exits.push(exitMarker);
            } else if (obj.type === 'artwork') {
                const artFrame = this.scene.add.rectangle(x, y, tileSize * scale - 4, tileSize * scale - 4, 0xc9a84c, 0.6);
                artFrame.setStrokeStyle(1, 0xc9a84c);
                artFrame.artData = obj;
                result.artworks.push(artFrame);
            } else {
                // Furniture — collidable rectangle
                const furn = this.scene.add.rectangle(x, y,
                    (obj.width || 1) * tileSize * scale - 4,
                    tileSize * scale - 4,
                    0x555555, 0.5);
                furn.furnitureData = obj;
                result.furniture.push(furn);
            }
        });

        return result;
    }
}
