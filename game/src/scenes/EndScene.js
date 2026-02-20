import Phaser from 'phaser';
import { GameState } from '../managers/GameState.js';

export class EndScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndScene' });
    }

    init(data) {
        this.reason = data?.reason || 'complete';
    }

    create() {
        const { width, height } = this.scale;
        const state = GameState.state;
        this.cameras.main.fadeIn(600, 10, 10, 15);

        // Title
        const title = this.reason === 'bankruptcy' ? 'BANKRUPT' : 'GAME OVER';
        const titleColor = this.reason === 'bankruptcy' ? '#c94040' : '#c9a84c';

        this.add.text(width / 2, 60, title, {
            fontFamily: '"Press Start 2P"',
            fontSize: '36px',
            color: titleColor,
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 0, fill: true },
        }).setOrigin(0.5);

        // Tagline
        const tagline = this.reason === 'bankruptcy'
            ? 'The market was unkind. Your debts caught up with you.'
            : 'Your time in the art world has come to an end.';

        this.add.text(width / 2, 110, tagline, {
            fontFamily: '"Playfair Display"',
            fontSize: '16px',
            color: '#7a7a8a',
            fontStyle: 'italic',
        }).setOrigin(0.5);

        // Stats
        const statsX = width / 2 - 200;
        const statsW = 400;
        const statsY = 160;

        const statsBg = this.add.graphics();
        statsBg.fillStyle(0x14141f, 1);
        statsBg.fillRoundedRect(statsX, statsY, statsW, 220, 6);
        statsBg.lineStyle(1, 0x2a2a3a);
        statsBg.strokeRoundedRect(statsX, statsY, statsW, 220, 6);

        const stats = [
            ['Character', state.character.name],
            ['Weeks Played', `${state.week}`],
            ['Starting Cash', `$${state.character.startingCash.toLocaleString()}`],
            ['Final Cash', `$${state.cash.toLocaleString()}`],
            ['Portfolio Value', `$${GameState.getPortfolioValue().toLocaleString()}`],
            ['Works Acquired', `${state.totalWorksBought}`],
            ['Works Sold', `${state.totalWorksSold}`],
        ];

        stats.forEach(([label, value], i) => {
            const y = statsY + 20 + i * 28;
            this.add.text(statsX + 20, y, label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '8px',
                color: '#7a7a8a',
            });
            this.add.text(statsX + statsW - 20, y, value, {
                fontFamily: '"Press Start 2P"',
                fontSize: '8px',
                color: '#e8e4df',
            }).setOrigin(1, 0);
        });

        // Key Decisions
        if (state.decisions.length > 0) {
            this.add.text(width / 2, 400, 'KEY DECISIONS', {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: '#c9a84c',
            }).setOrigin(0.5);

            state.decisions.slice(-5).forEach((d, i) => {
                this.add.text(width / 2, 430 + i * 24, `• ${d.event}: ${d.choice}`, {
                    fontFamily: '"Playfair Display"',
                    fontSize: '12px',
                    color: '#b0b0c0',
                    wordWrap: { width: 500 },
                }).setOrigin(0.5, 0);
            });
        }

        // Play Again
        const playAgain = this.add.text(width / 2, height - 60, '[ PLAY AGAIN ]', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#c9a84c',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playAgain.on('pointerover', () => playAgain.setScale(1.05));
        playAgain.on('pointerout', () => playAgain.setScale(1));
        playAgain.on('pointerdown', () => {
            this.cameras.main.fadeOut(400, 10, 10, 15);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });
    }
}
