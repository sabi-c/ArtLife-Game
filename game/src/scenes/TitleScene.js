import Phaser from 'phaser';
import { SceneTransition } from '../utils/SceneTransition.js';
import { SCENE_KEYS } from '../data/scene-keys.js';

/**
 * TitleScene.js — The graphical Phaser entry point for ArtLife.
 * Bypasses TerminalUI and uses a pulsing "Press SPACE" to transition
 * to the CharacterSelectScene.
 */
export class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    init(data) {
        this.ui = data.ui; // TerminalUI instance passed from main.js
    }

    preload() {
        // We'll load a noir gallery background generated in Phase 41
        if (!this.textures.exists('bg_gallery')) {
            this.load.image('bg_gallery', '/backgrounds/gallery_opening.webp');
        }
    }

    create() {
        const { width, height } = this.scale;

        // ── Background ──
        this.cameras.main.setBackgroundColor('#0a0a0f'); // Fallback colour if image missing
        if (this.textures.exists('bg_gallery') && this.textures.get('bg_gallery').source[0].width > 1) {
            const bg = this.add.image(width / 2, height / 2, 'bg_gallery');
            const scaleX = width / bg.width;
            const scaleY = height / bg.height;
            bg.setScale(Math.max(scaleX, scaleY));
        }

        // Add a dark semi-transparent overlay to make text pop
        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f, 0.85);

        // ── Logo Text ──
        this.add.text(width / 2, height * 0.35, 'ARTLIFE', {
            fontFamily: '"Press Start 2P"',
            fontSize: '64px',
            color: '#e8e4df',
            align: 'center',
            letterSpacing: 10
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.45, 'A game of taste, capital, and reputation.', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#ffd700', // Gold
            align: 'center'
        }).setOrigin(0.5);

        // ── Pulsing Start Text ──
        const startText = this.add.text(width / 2, height * 0.75, 'Press SPACE to Start', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#c94040', // Red accent
            align: 'center'
        }).setOrigin(0.5);

        // Pulse animation
        this.tweens.add({
            targets: startText,
            alpha: 0.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ── Input Handling ──
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.input.on('pointerdown', () => this.startGame()); // Mobile support
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.startGame();
        }
    }

    startGame() {
        // Prevent multiple triggers
        this.input.keyboard.removeAllKeys();
        this.input.off('pointerdown');

        // Iris wipe → IntroScene → CharacterSelectScene
        SceneTransition.irisWipeToScene(this, SCENE_KEYS.INTRO, { ui: this.ui }, 600);
    }
}
