import { BaseScene } from './BaseScene.js';
import { useUIStore } from '../stores/uiStore.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';

export class MacDialogueScene extends BaseScene {
    constructor() {
        super('MacDialogueScene');
    }

    init(data) {
        this.dialogueData = data;
        this.ui = data.ui;
    }

    preload() {
        if (this.dialogueData.bgKey && !this.textures.exists(this.dialogueData.bgKey)) {
            this.load.image(this.dialogueData.bgKey, `/backgrounds/${this.dialogueData.bgKey}`);
        }
        if (this.dialogueData.rewardItem && this.dialogueData.rewardItem.imageKey && !this.textures.exists(this.dialogueData.rewardItem.imageKey)) {
            this.load.image(this.dialogueData.rewardItem.imageKey, `/sprites/${this.dialogueData.rewardItem.imageKey}`);
        }
    }

    create(data) {
        super.create({ ...data, hideUI: true }); // BaseScene hides terminal UI

        try {
            const camW = this.cameras.main.width;
            const camH = this.cameras.main.height;

            // 1. Background
            if (this.dialogueData.bgKey && this.textures.exists(this.dialogueData.bgKey)) {
                const src = this.textures.get(this.dialogueData.bgKey).source[0];
                if (src.width > 1) { // >1px means a real image, not our placeholder
                    this.bg = this.add.image(camW / 2, camH / 2, this.dialogueData.bgKey);
                    const scale = Math.max(camW / this.bg.width, camH / this.bg.height);
                    this.bg.setScale(scale).setScrollFactor(0);
                } else {
                    this.cameras.main.setBackgroundColor('#1a1a2e');
                }
            } else {
                this.cameras.main.setBackgroundColor('#1a1a2e');
            }

            // 2. Trigger React Overlay UI via Zustand Store
            if (!this.dialogueData.dialogueSequence?.length) {
                console.warn('[MacDialogueScene] No dialogue sequence provided — ending immediately.');
                this.endDialogue(true);
                return;
            }

            useUIStore.getState().openDialogue({
                steps: this.dialogueData.dialogueSequence,
                leftSprite: this.dialogueData.leftSpriteKey,
                rightSprite: this.dialogueData.rightSpriteKey,
                callback: () => { this.endDialogue(); }
            });

            // ── ESC key force-exit (safety hatch) ──
            this.input.keyboard.on('keydown-ESC', this.forceExit, this);

            // Visible back button (top-right)
            const backBtn = this.add.text(camW - 16, 12, '[ ESC: BACK ]', {
                fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#7a7a8a'
            }).setOrigin(1, 0).setDepth(102).setInteractive({ useHandCursor: true });
            backBtn.on('pointerover', () => backBtn.setColor('#c9a84c'));
            backBtn.on('pointerout', () => backBtn.setColor('#7a7a8a'));
            backBtn.on('pointerdown', () => this.forceExit());
        } catch (err) {
            window.ArtLife?.recordSceneError('MacDialogueScene', err);
            this.endDialogue(true); // Bail out gracefully
        }
    }

    forceExit() {
        useUIStore.getState().closeDialogue();
        this.endDialogue(true);
    }

    endDialogue(isForceExit = false) {
        // If there's a reward item and we're not force-exiting, show it in Phaser
        if (!isForceExit && this.dialogueData.rewardItem) {
            this.showReward();
            return;
        }

        // Fade out
        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            this.showTerminalUI();
            GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');

            if (!isForceExit && this.dialogueData.onComplete) {
                this.dialogueData.onComplete();
            } else {
                if (this.ui) {
                    this.ui.popScreen();
                }
            }
            this.scene.stop();
        };
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, cleanup);
        // Safety: if fade doesn't complete (headless/broken WebGL), cleanup after timeout
        this.time.delayedCall(1200, cleanup);
    }

    showReward() {
        const camW = this.cameras.main.width;
        const camH = this.cameras.main.height;

        // Dim background further
        this.add.rectangle(0, 0, camW, camH, 0x000000, 0.7).setOrigin(0, 0);

        const itemStr = this.dialogueData.rewardItem.name;
        const valStr = `Value: $${this.dialogueData.rewardItem.value.toLocaleString()}`;

        this.add.text(camW / 2, camH / 2 - 120, 'You received:', {
            fontFamily: 'monospace', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        if (this.dialogueData.rewardItem.imageKey) {
            const rewardSprite = this.add.image(camW / 2, camH / 2, this.dialogueData.rewardItem.imageKey);
            rewardSprite.setScale(100 / rewardSprite.height); // Scale to roughly 100px height
        }

        this.add.text(camW / 2, camH / 2 + 100, itemStr, {
            fontFamily: '"Chicago", "Courier New", monospace', fontSize: '28px', color: '#00ff00', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(camW / 2, camH / 2 + 140, valStr, {
            fontFamily: 'monospace', fontSize: '20px', color: '#aaaaaa'
        }).setOrigin(0.5);

        const tapText = this.add.text(camW / 2, camH - 60, '[ SPACE TO CONTINUE ]', {
            fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: tapText, alpha: 1, duration: 800, yoyo: true, repeat: -1 });

        const finishFn = () => {
            this.input.keyboard.off('keydown-SPACE', finishFn);
            this.input.keyboard.off('keydown-ENTER', finishFn);
            this.input.off('pointerdown');

            // Re-apply state consequences for reward
            import('../stores/inventoryStore.js').then(({ useInventoryStore }) => {
                if (this.dialogueData.rewardItem) {
                    useInventoryStore.getState().addItem({
                        id: this.dialogueData.rewardItem.name.replace(/\s+/g, '_').toLowerCase(),
                        name: this.dialogueData.rewardItem.name,
                        type: this.dialogueData.rewardItem.type || 'Dialogue Reward',
                        acquiredAt: Date.now()
                    });
                }
            });

            this.endDialogue(true);
        };

        this.time.delayedCall(500, () => {
            this.input.keyboard.on('keydown-SPACE', finishFn);
            this.input.keyboard.on('keydown-ENTER', finishFn);
            this.input.on('pointerdown', finishFn);
        });
    }
}
