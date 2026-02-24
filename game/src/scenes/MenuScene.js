import Phaser from 'phaser';
import { safeSceneStart, safeSceneLaunch } from "../utils/safeScene.js";

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Title
        this.add.text(width / 2, height * 0.28, 'ARTLIFE', {
            fontFamily: '"Press Start 2P"',
            fontSize: '48px',
            color: '#c9a84c',
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 0, fill: true },
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, height * 0.38, 'An Art Market Simulation', {
            fontFamily: '"Playfair Display"',
            fontSize: '18px',
            color: '#b0b0c0',
            fontStyle: 'italic',
        }).setOrigin(0.5);

        // Divider line
        const line = this.add.graphics();
        line.lineStyle(1, 0x4a4a5a);
        line.lineBetween(width * 0.3, height * 0.45, width * 0.7, height * 0.45);

        // Menu options
        const menuItems = [
            { text: '[ NEW GAME ]', scene: null, disabled: true },
            { text: '[ CONTINUE ]', scene: null, disabled: true },
        ];

        menuItems.forEach((item, i) => {
            const y = height * 0.55 + i * 50;
            const color = item.disabled ? '#4a4a5a' : '#e8e4df';
            const hoverColor = '#c9a84c';

            const txt = this.add.text(width / 2, y, item.text, {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                color: color,
            }).setOrigin(0.5);

            if (!item.disabled) {
                txt.setInteractive({ useHandCursor: true });

                txt.on('pointerover', () => {
                    txt.setColor(hoverColor);
                    txt.setScale(1.05);
                });

                txt.on('pointerout', () => {
                    txt.setColor(color);
                    txt.setScale(1);
                });

                txt.on('pointerdown', () => {
                    this.cameras.main.fadeOut(300, 10, 10, 15);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        safeSceneStart(this, item.scene);
                    });
                });
            }
        });

        // Version
        this.add.text(width - 16, height - 16, 'v0.1.0', {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: '#2a2a3a',
        }).setOrigin(1, 1);

        // Fade in
        this.cameras.main.fadeIn(400, 10, 10, 15);
    }
}
