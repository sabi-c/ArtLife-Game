/**
 * Controls.js — Null-safe keyboard wrapper with lockInput flag.
 * Pattern from monster-tamer reference implementation.
 *
 * Wraps Phaser's keyboard system so scenes can disable input cleanly
 * (e.g. during dialogue, transitions, or UI overlays) by setting lockInput = true.
 */
import Phaser from 'phaser';

export class Controls {
    /**
     * @param {Phaser.Scene|null} scene - The Phaser scene that owns the keyboard.
     *   Pass null/undefined in unit tests — all methods safely return false.
     */
    constructor(scene) {
        this.scene = scene;
        /** Set to true to block all input without destroying key objects. */
        this.lockInput = false;

        if (scene?.input?.keyboard) {
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.wasd = scene.input.keyboard.addKeys({
                up:    Phaser.Input.Keyboard.KeyCodes.W,
                down:  Phaser.Input.Keyboard.KeyCodes.S,
                left:  Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D,
                space: Phaser.Input.Keyboard.KeyCodes.SPACE,
                enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
            });
        } else {
            this.cursors = null;
            this.wasd = null;
        }
    }

    // ─── Held-down checks (use in physics loops) ──────────────────────

    get isLeftDown() {
        if (this.lockInput || !this.cursors) return false;
        return this.cursors.left.isDown || (this.wasd?.left?.isDown ?? false);
    }

    get isRightDown() {
        if (this.lockInput || !this.cursors) return false;
        return this.cursors.right.isDown || (this.wasd?.right?.isDown ?? false);
    }

    get isUpDown() {
        if (this.lockInput || !this.cursors) return false;
        return this.cursors.up.isDown || (this.wasd?.up?.isDown ?? false);
    }

    get isDownDown() {
        if (this.lockInput || !this.cursors) return false;
        return this.cursors.down.isDown || (this.wasd?.down?.isDown ?? false);
    }

    // ─── JustDown checks (use for single-press actions) ───────────────

    wasLeftKeyPressed() {
        if (this.lockInput || !this.cursors) return false;
        return Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
               !!(this.wasd?.left && Phaser.Input.Keyboard.JustDown(this.wasd.left));
    }

    wasRightKeyPressed() {
        if (this.lockInput || !this.cursors) return false;
        return Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
               !!(this.wasd?.right && Phaser.Input.Keyboard.JustDown(this.wasd.right));
    }

    wasUpKeyPressed() {
        if (this.lockInput || !this.cursors) return false;
        return Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
               !!(this.wasd?.up && Phaser.Input.Keyboard.JustDown(this.wasd.up));
    }

    wasDownKeyPressed() {
        if (this.lockInput || !this.cursors) return false;
        return Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
               !!(this.wasd?.down && Phaser.Input.Keyboard.JustDown(this.wasd.down));
    }

    wasSpaceKeyPressed() {
        if (this.lockInput || !this.cursors) return false;
        return Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
               !!(this.wasd?.space && Phaser.Input.Keyboard.JustDown(this.wasd.space));
    }

    wasEnterKeyPressed() {
        if (this.lockInput || !this.wasd?.enter) return false;
        return Phaser.Input.Keyboard.JustDown(this.wasd.enter);
    }

    /** Null-safe cleanup — call from scene shutdown handler. */
    destroy() {
        this.cursors = null;
        this.wasd = null;
        this.scene = null;
    }
}
