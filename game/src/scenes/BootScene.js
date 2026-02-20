import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Preload event background images
        const categories = ['gallery', 'market', 'social', 'drama', 'personal', 'fair', 'opportunity'];
        categories.forEach((cat) => {
            this.load.image(`bg_${cat}`, `backgrounds/bg_${cat}.png`);
        });

        // Preload Haggle Battle Sprites
        this.load.image('player_back', 'sprites/player_back.png');
        this.load.image('dealer_shark', 'sprites/dealer_shark.png');
        this.load.image('dealer_patron', 'sprites/dealer_patron.png');
        this.load.image('dealer_calculator', 'sprites/dealer_calculator.png');
        this.load.image('dealer_nervous', 'sprites/dealer_nervous.png');
        this.load.image('dealer_collector', 'sprites/dealer_collector.png');
        this.load.image('dealer_hustler', 'sprites/dealer_hustler.png');
    }

    create() {
        this.cameras.main.setBackgroundColor('#0a0a0f');
        this.cameras.main.fadeIn(800, 0, 0, 0);

        this.time.delayedCall(1200, () => {
            this.cameras.main.fadeOut(600, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });
    }
}
