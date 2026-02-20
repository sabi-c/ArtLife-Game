import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters.js';
import { GameState } from '../managers/GameState.js';

export class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
        this.selectedIndex = 0;
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.fadeIn(400, 10, 10, 15);

        // Header
        this.add.text(width / 2, 40, 'CHOOSE YOUR PATH', {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: '#c9a84c',
        }).setOrigin(0.5);

        this.add.text(width / 2, 70, 'Each collector begins with different advantages', {
            fontFamily: '"Playfair Display"',
            fontSize: '14px',
            color: '#7a7a8a',
            fontStyle: 'italic',
        }).setOrigin(0.5);

        // Character cards
        this.cards = [];
        const cardWidth = 280;
        const cardSpacing = 20;
        const totalWidth = CHARACTERS.length * cardWidth + (CHARACTERS.length - 1) * cardSpacing;
        const startX = (width - totalWidth) / 2;

        CHARACTERS.forEach((char, i) => {
            const x = startX + i * (cardWidth + cardSpacing);
            const card = this.createCharacterCard(x, 100, cardWidth, char, i);
            this.cards.push(card);
        });

        // Select button
        this.selectButton = this.add.text(width / 2, height - 60, '[ BEGIN ]', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#c9a84c',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.selectButton.on('pointerover', () => this.selectButton.setScale(1.05));
        this.selectButton.on('pointerout', () => this.selectButton.setScale(1));
        this.selectButton.on('pointerdown', () => {
            const chosen = CHARACTERS[this.selectedIndex];
            GameState.init(chosen);
            this.cameras.main.fadeOut(400, 10, 10, 15);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('GameScene');
            });
        });

        this.highlightCard(0);
    }

    createCharacterCard(x, y, w, char, index) {
        const h = 420;
        const container = this.add.container(x, y);

        // Card background
        const bg = this.add.graphics();
        bg.fillStyle(0x14141f, 1);
        bg.fillRoundedRect(0, 0, w, h, 6);
        bg.lineStyle(1, 0x2a2a3a);
        bg.strokeRoundedRect(0, 0, w, h, 6);
        container.add(bg);

        // Icon
        this.add.text(x + w / 2, y + 30, char.icon, {
            fontSize: '32px',
        }).setOrigin(0.5);

        // Name
        this.add.text(x + w / 2, y + 70, char.name, {
            fontFamily: '"Press Start 2P"',
            fontSize: '11px',
            color: '#e8e4df',
        }).setOrigin(0.5);

        // Tagline
        this.add.text(x + w / 2, y + 95, `"${char.tagline}"`, {
            fontFamily: '"Playfair Display"',
            fontSize: '12px',
            color: '#7a7a8a',
            fontStyle: 'italic',
            wordWrap: { width: w - 30 },
            align: 'center',
        }).setOrigin(0.5);

        // Stats
        const statsY = y + 130;
        const statsStyle = {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: '#b0b0c0',
            lineSpacing: 10,
        };

        const statsText = [
            `CASH:  ${char.startingCash}`,
            `WORKS: ${char.startingWorks}`,
            `PERK:  ${char.perk}`,
        ].join('\n');

        this.add.text(x + 15, statsY, statsText, statsStyle);

        // Description
        this.add.text(x + 15, statsY + 80, char.description, {
            fontFamily: '"Playfair Display"',
            fontSize: '12px',
            color: '#7a7a8a',
            wordWrap: { width: w - 30 },
            lineSpacing: 4,
        });

        // Make entire area clickable
        const hitArea = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerdown', () => {
            this.selectedIndex = index;
            this.highlightCard(index);
        });

        return { container, bg, index };
    }

    highlightCard(index) {
        this.cards.forEach((card, i) => {
            card.bg.clear();
            if (i === index) {
                card.bg.fillStyle(0x1e1e2e, 1);
                card.bg.fillRoundedRect(0, 0, 280, 420, 6);
                card.bg.lineStyle(2, 0xc9a84c);
                card.bg.strokeRoundedRect(0, 0, 280, 420, 6);
            } else {
                card.bg.fillStyle(0x14141f, 1);
                card.bg.fillRoundedRect(0, 0, 280, 420, 6);
                card.bg.lineStyle(1, 0x2a2a3a);
                card.bg.strokeRoundedRect(0, 0, 280, 420, 6);
            }
        });
    }
}
