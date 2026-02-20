import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters.js';
import { GameState } from '../managers/GameState.js';

/**
 * CharacterSelectScene.js — Graphical selection flow replacing TerminalUI.
 * Inspired by Pokemon Emerald's start sequence.
 */
export class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
    }

    init(data) {
        this.ui = data.ui; // TerminalUI reference for handing control back
    }

    create() {
        this.width = this.scale.width;
        this.height = this.scale.height;

        this.cameras.main.setBackgroundColor('#14141f');

        // ── Header ──
        this.add.text(this.width / 2, 40, 'CHOOSE YOUR BACKGROUND', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#e8e4df'
        }).setOrigin(0.5);

        // ── State variables ──
        this.selectedIndex = 0;
        this.portraits = [];
        this.typewriterEvent = null;

        // ── Render Portraits (Placeholders for now) ──
        const portraitWidth = 140;
        const portraitHeight = 180;
        const spacing = 180;
        const startX = this.width / 2 - spacing;
        const startY = this.height * 0.4;

        CHARACTERS.forEach((char, i) => {
            const x = startX + (i * spacing);

            // Container for ease of scaling/animations
            const container = this.add.container(x, startY);

            // Background card
            const bg = this.add.rectangle(0, 0, portraitWidth, portraitHeight, 0x1a1a2e)
                .setStrokeStyle(2, 0x333344);
            container.add(bg);

            // Icon
            const icon = this.add.text(0, -30, char.icon, { fontSize: '48px' }).setOrigin(0.5);
            container.add(icon);

            // Name
            const nameObj = this.add.text(0, 40, char.name, {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: '#e8e4df',
                align: 'center',
                wordWrap: { width: portraitWidth - 20 }
            }).setOrigin(0.5).setLineSpacing(6);
            container.add(nameObj);

            this.portraits.push({ container, bg, nameObj });
        });

        // ── Info Panel ──
        const panelWidth = this.width * 0.8;
        this.add.rectangle(this.width / 2, this.height * 0.8, panelWidth, 120, 0x000000, 0.5)
            .setStrokeStyle(1, 0x444455);

        this.titleText = this.add.text(this.width / 2, this.height * 0.8 - 40, '', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffd700'
        }).setOrigin(0.5);

        this.descText = this.add.text(this.width / 2, this.height * 0.8 - 15, '', {
            fontFamily: '"Courier"', fontSize: '14px', color: '#aaaaaa',
            wordWrap: { width: panelWidth - 40 },
            lineHeight: 1.5,
            align: 'center'
        }).setOrigin(0.5, 0);

        // Instructions
        this.add.text(this.width / 2, this.height - 20, '← → to select  |  SPACE to confirm', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#8888aa'
        }).setOrigin(0.5);

        // ── Input ──
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER
        });

        // Initial selection render
        this.updateSelection();
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.wasd.left)) {
            this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex - 1, 0, CHARACTERS.length);
            this.updateSelection();
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.wasd.right)) {
            this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + 1, 0, CHARACTERS.length);
            this.updateSelection();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.wasd.space) || Phaser.Input.Keyboard.JustDown(this.wasd.enter)) {
            this.confirmSelection();
        }
    }

    updateSelection() {
        // Reset all styles
        this.portraits.forEach((p, i) => {
            p.container.setScale(1.0);
            p.bg.setStrokeStyle(2, 0x333344);
            p.bg.fillColor = 0x1a1a2e;
            p.nameObj.setColor('#e8e4df');
        });

        // Highlight selected
        const selected = this.portraits[this.selectedIndex];

        this.tweens.add({
            targets: selected.container,
            scale: 1.1,
            duration: 150,
            ease: 'Back.easeOut'
        });

        selected.bg.setStrokeStyle(2, 0xffd700); // Gold border
        selected.bg.fillColor = 0x2a2a4e;
        selected.nameObj.setColor('#ffd700');

        // Typewriter Effect for Description
        const char = CHARACTERS[this.selectedIndex];
        this.titleText.setText(char.tagline);

        const fullDesc = `Starting Cash: $${char.startingCash.toLocaleString()} | Perk: ${char.perk}\n\n${char.description}`;
        this.typewrite(fullDesc);
    }

    typewrite(text) {
        if (this.typewriterEvent) {
            this.typewriterEvent.remove();
        }

        this.descText.setText('');
        let charIndex = 0;

        this.typewriterEvent = this.time.addEvent({
            delay: 15,
            repeat: text.length - 1,
            callback: () => {
                this.descText.text += text[charIndex];
                charIndex++;
            }
        });
    }

    confirmSelection() {
        this.input.keyboard.removeAllKeys();

        const char = CHARACTERS[this.selectedIndex];

        // Final flash animation on the selected portrait
        const selected = this.portraits[this.selectedIndex];
        this.tweens.add({
            targets: selected.bg,
            fillColor: 0xffffff,
            duration: 100,
            yoyo: true,
            repeat: 3
        });

        this.cameras.main.flash(800, 255, 255, 255);
        this.time.delayedCall(800, () => {
            // Initialize GameState with selected character
            GameState.init(char);

            // Transition control back to Terminal UI
            if (this.ui && this.ui.container) {
                this.ui.container.style.display = 'block';
                import('../terminal/screens.js').then(({ dashboardScreen }) => {
                    this.ui.pushScreen(dashboardScreen(this.ui));

                    // Hide the Phaser canvas — terminal takes over
                    this.sys.game.canvas.style.display = 'none';
                    this.scene.stop();
                });
            } else {
                this.scene.stop();
            }
        });
    }
}
