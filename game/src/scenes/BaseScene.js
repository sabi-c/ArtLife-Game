/**
 * src/scenes/BaseScene.js
 * Extracted during Phase 41 Refactoring.
 * 
 * Provides centralized UI lifecycle management for all Phaser scenes.
 */

import Phaser from 'phaser';

export class BaseScene extends Phaser.Scene {
    constructor(key) {
        super(key);
    }

    create(data) {
        this.ui = data?.ui || window.TerminalUIInstance;

        // Optionally pass `{ hideUI: true }` in scene data 
        if (data?.hideUI !== false && this.ui?.container) {
            this.hideTerminalUI();
        }

        // Handle safe cleanup of scenes with a standard shutdown hook
        this.events.once('shutdown', this.cleanup, this);
    }

    hideTerminalUI() {
        if (this.ui?.container) {
            this.ui.container.style.display = 'none';
        }
    }

    showTerminalUI() {
        if (this.ui?.container) {
            this.ui.container.style.display = 'block';
        }
    }

    // Override this in subclasses for specific cleanup logic
    cleanup() {
        // e.g. destroy background music, clear intervals, etc.
    }
}
