import Phaser from 'phaser';
import { HaggleManager } from '../managers/HaggleManager.js';
import { TACTICS, BLUE_OPTIONS } from '../data/haggle_config.js';

export class HaggleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HaggleScene' });
    }

    init(data) {
        this.ui = data.ui;
        this.haggleInfo = data.haggleInfo; // initial state
        this.state = data.haggleInfo?.state || HaggleManager.getState() || this.haggleInfo;

        if (this.ui && this.ui._container) {
            this.ui._container.style.display = 'none';
        }
    }

    create() {
        const { width, height } = this.scale;

        // 1. Background
        if (this.textures.exists('bg_gallery')) {
            this.bg = this.add.image(width / 2, height / 2 - 80, 'bg_gallery');
            const scale = Math.max(width / this.bg.width, (height - 250) / this.bg.height);
            this.bg.setScale(scale).setTint(0x888888);
        } else {
            this.cameras.main.setBackgroundColor('#14141f');
        }

        // 2. Sprites
        const dealerKey = `dealer_${this.state.dealerTypeKey || 'patron'}`;
        const dealerSprite = this.textures.exists(dealerKey) ? dealerKey : 'dealer_patron';

        if (this.textures.exists(dealerSprite)) {
            this.dealer = this.add.image(width - 150, height / 2 - 120, dealerSprite)
                .setOrigin(0.5, 1).setScale(3).setBlendMode(Phaser.BlendModes.LIGHTEN);
        } else {
            this.dealer = this.add.text(width - 150, height / 2 - 120, this.state.dealerIcon || '👤', { fontSize: '100px' }).setOrigin(0.5, 1);
        }

        if (this.textures.exists('player_back')) {
            this.player = this.add.image(150, height - 250, 'player_back')
                .setOrigin(0.5, 1).setScale(3).setBlendMode(Phaser.BlendModes.LIGHTEN);
        } else {
            this.player = this.add.text(150, height - 250, '🕵️', { fontSize: '120px' }).setOrigin(0.5, 1).setScale(-1, 1);
        }

        // Letterbox bars
        this.add.rectangle(0, 0, width, 40, 0x000000).setOrigin(0, 0).setDepth(100);
        this.add.rectangle(0, height - 40, width, 40, 0x000000).setOrigin(0, 0).setDepth(100);
        this.roundText = this.add.text(width / 2, 20, `ROUND ${this.state.round || 1} / ${this.state.maxRounds || 5}`, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#888888'
        }).setOrigin(0.5, 0.5).setDepth(101);

        // Intro slides
        this.dealer.x += 200;
        this.dealer.alpha = 0;
        this.tweens.add({ targets: this.dealer, x: width - 150, alpha: 1, duration: 800, ease: 'Power2' });

        this.player.x -= 200;
        this.player.alpha = 0;
        this.tweens.add({ targets: this.player, x: 150, alpha: 1, duration: 800, ease: 'Power2', delay: 200 });

        // 3. UI
        this.drawUIContainers(width, height);
        this.updateBars();

        // 4. Interactive Box
        this.drawInteractiveUI(width, height);

        // Start opening dialogue
        this.time.delayedCall(1000, () => {
            this.playDialogue(this.haggleInfo.openingDialogue || "Let's negotiate.", () => {
                this.renderTactics();
            });
        });
    }

    drawUIContainers(width, height) {
        // Dealer Info
        const dPanelY = 40;
        this.add.rectangle(30, dPanelY, 260, 60, 0x1a1a2e, 0.9).setOrigin(0, 0).setStrokeStyle(2, 0x2a2a3a);

        this.add.text(45, dPanelY + 12, this.state.dealerName?.toUpperCase() || 'DEALER', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#e8e4df'
        });
        this.add.text(45, dPanelY + 30, 'PATIENCE', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#7a7a8a'
        });

        this.patBarBg = this.add.graphics();
        this.patBarBg.fillStyle(0x000000, 1).fillRect(120, dPanelY + 28, 150, 10).lineStyle(1, 0x3a3a4e).strokeRect(120, dPanelY + 28, 150, 10);
        this.patBarFill = this.add.graphics();

        // Player Info
        const pPanelY = height - 250;
        this.add.rectangle(width - 290, pPanelY, 260, 60, 0x1a1a2e, 0.9).setOrigin(0, 0).setStrokeStyle(2, 0x2a2a3a);

        this.add.text(width - 275, pPanelY + 12, 'GAP TO ASK', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#e8e4df'
        });

        this.add.text(width - 275, pPanelY + 45, (this.state.work?.title || 'Artwork').substring(0, 25), {
            fontFamily: '"Playfair Display"', fontSize: '12px', color: '#7a7a8a'
        });

        this.gapBarBg = this.add.graphics();
        this.gapBarBg.fillStyle(0x000000, 1).fillRect(width - 275, pPanelY + 28, 230, 10).lineStyle(1, 0x3a3a4e).strokeRect(width - 275, pPanelY + 28, 230, 10);
        this.gapBarFill = this.add.graphics();

        this.gapText = this.add.text(width - 40, pPanelY + 27, '100%', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c9a84c'
        }).setOrigin(1, 0);
    }

    updateBars() {
        this.state = HaggleManager.getState();
        this.roundText.setText(`ROUND ${this.state.round || 1} / ${this.state.maxRounds || 5}`);

        const patPercent = Math.max(0, this.state.patience / (this.state.maxPatience || 1));
        const patColor = patPercent > 0.5 ? 0x3a8a5c : patPercent > 0.25 ? 0xc9a84c : 0xc94040;

        this.patBarFill.clear();
        this.patBarFill.fillStyle(patColor, 1);
        this.patBarFill.fillRect(120, 68, 150 * patPercent, 10);

        const asking = this.state.askingPrice || 1;
        const gapPercentRaw = this.state.gap / asking;
        const gapPercent = Math.min(1, Math.max(0, gapPercentRaw));
        const gapColor = gapPercent > 0.5 ? 0xc94040 : gapPercent > 0.1 ? 0xc9a84c : 0x3a8a5c;

        this.gapBarFill.clear();
        this.gapBarFill.fillStyle(gapColor, 1);
        const pPanelY = this.scale.height - 250;
        this.gapBarFill.fillRect(this.scale.width - 275, pPanelY + 28, 230 * gapPercent, 10);

        this.gapText.setText(`${Math.round(gapPercent * 100)}%`);
        this.gapText.setColor(gapColor === 0xc94040 ? '#c94040' : gapColor === 0x3a8a5c ? '#3a8a5c' : '#c9a84c');
    }

    drawInteractiveUI(width, height) {
        // Dialogue Box at bottom
        const dlHeight = 120;
        const dlY = height - dlHeight - 40;

        this.dialogueBg = this.add.rectangle(width / 2, dlY + dlHeight / 2, width - 60, dlHeight, 0x14141f, 0.95);
        this.dialogueBg.setStrokeStyle(3, 0x3a3a4e);

        this.speakerTab = this.add.text(45, dlY - 14, this.state.dealerName?.toUpperCase() || 'DEALER', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#14141f', backgroundColor: '#e8e4df', padding: { x: 8, y: 4 }
        });

        this.dialogueTextContent = this.add.text(50, dlY + 20, '', {
            fontFamily: '"Playfair Display"', fontSize: '18px', color: '#e8e4df', wordWrap: { width: width - 100, useAdvancedWrap: true }, lineSpacing: 8
        });

        // Tactics Grid Container (hidden initially)
        this.tacticsContainer = this.add.container(0, 0);
        this.tacticsContainer.setVisible(false);
    }

    playDialogue(text, onComplete) {
        this.tacticsContainer.setVisible(false);
        this.dialogueTextContent.setText('');

        let i = 0;
        if (this.typeEvent) this.typeEvent.remove();

        this.typeEvent = this.time.addEvent({
            delay: 20,
            repeat: text.length - 1,
            callback: () => {
                this.dialogueTextContent.text += text[i];
                i++;
                if (i === text.length && onComplete) {
                    this.time.delayedCall(500, onComplete);
                }
            }
        });
    }

    renderTactics() {
        if (!this.state.isActive && this.state.resolved) {
            this.renderResult();
            return;
        }

        this.tacticsContainer.removeAll(true);
        this.tacticsContainer.setVisible(true);
        this.speakerTab.setText('YOUR TURN');

        const { width, height } = this.scale;
        const dlHeight = 120;
        const dlY = height - dlHeight - 40;

        const tactics = HaggleManager.getAvailableTactics();
        // Add Walk Away manually
        tactics.push({ id: 'walkAway', label: '🗡️ Walk Away', description: 'End negotiation', baseSuccess: 1, tacticId: 'walkAway' });

        // Draw 2x2 grid inside dialogue box area
        const cols = 2;
        const padX = 20;
        const padY = 15;
        const btnW = (width - 60 - padX * 3) / 2;
        const btnH = (dlHeight - padY * 3) / 2;

        let ox = 30 + padX;
        let oy = dlY + padY;

        tactics.forEach((t, index) => {
            if (index > 3 && t.id !== 'walkAway') return; // Limit to 4 for clean layout, but let's just arrange them

            const x = ox + (index % cols) * (btnW + padX);
            const y = oy + Math.floor(index / cols) * (btnH + padY);

            const isBlue = t.isBlueOption;
            const bg = this.add.rectangle(x + btnW / 2, y + btnH / 2, btnW, btnH, isBlue ? 0x1a2e4e : 0x1a1a2e)
                .setStrokeStyle(1, isBlue ? 0x4488cc : 0x3a3a4e).setInteractive({ useHandCursor: true });

            const txt = this.add.text(x + 10, y + btnH / 2, t.label, {
                fontFamily: '"Press Start 2P"', fontSize: '10px', color: isBlue ? '#88ccff' : '#e8e4df'
            }).setOrigin(0, 0.5);

            bg.on('pointerover', () => bg.setFillStyle(isBlue ? 0x2a3e6e : 0x2a2a3e));
            bg.on('pointerout', () => bg.setFillStyle(isBlue ? 0x1a2e4e : 0x1a1a2e));

            bg.on('pointerdown', () => this.executeTactic(t.id, t.label));

            this.tacticsContainer.add([bg, txt]);
        });
    }

    executeTactic(tacticId, label) {
        this.tacticsContainer.setVisible(false);
        this.speakerTab.setText('SYSTEM');

        // Look up tactic definition for animType
        let animType = 'slash'; // default
        if (TACTICS[tacticId]) animType = TACTICS[tacticId].animType;
        else {
            const blueOpt = BLUE_OPTIONS.find(o => o.id === tacticId);
            if (blueOpt) animType = blueOpt.animType || 'charm';
        }

        // Tactic Animation Step
        let animDuration = 400;
        if (animType === 'coin') {
            // Drop a coin
            const coin = this.add.text(this.dealer.x, this.dealer.y - 120, '💰', { fontSize: '40px' }).setOrigin(0.5);
            this.tweens.add({ targets: coin, y: this.dealer.y, alpha: 0, duration: 400, ease: 'Bounce.easeOut', onComplete: () => coin.destroy() });
        } else if (animType === 'shield') {
            // Blue flash shield
            const shield = this.add.rectangle(this.player.x, this.player.y - 50, 100, 100, 0x4488cc, 0.5).setOrigin(0.5);
            this.tweens.add({ targets: shield, scale: 1.5, alpha: 0, duration: 400, onComplete: () => shield.destroy() });
        } else if (animType === 'slash') {
            // Screen flash + slash
            const flash = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xffffff, 0.8).setDepth(200);
            this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
            this.cameras.main.shake(150, 0.015);
        } else if (animType === 'charm') {
            // Floating hearts
            const heart = this.add.text(this.player.x, this.player.y - 80, '💖', { fontSize: '30px' }).setOrigin(0.5);
            this.tweens.add({ targets: heart, x: this.dealer.x, y: this.dealer.y - 50, alpha: 0, duration: 600, ease: 'Sine.easeOut', onComplete: () => heart.destroy() });
            animDuration = 600;
        } else if (animType === 'shadow') {
            // Dark fade
            const shadow = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.7).setDepth(150);
            this.tweens.add({ targets: shadow, alpha: 0, duration: 500, onComplete: () => shadow.destroy() });
            animDuration = 500;
        }

        this.time.delayedCall(animDuration, () => {
            const result = HaggleManager.executeTactic(tacticId);

            // Animate dealer reaction based on success
            if (result.success) {
                this.cameras.main.shake(200, 0.01);
                this.tweens.add({ targets: this.dealer, x: this.dealer.x + 15, duration: 50, yoyo: true, repeat: 3 });
                if (this.dealer.setTint) { this.dealer.setTint(0xff8888); this.time.delayedCall(300, () => this.dealer.clearTint()); }
            } else {
                // Dealer resists
                this.tweens.add({ targets: this.dealer, y: this.dealer.y - 10, duration: 100, yoyo: true });
            }

            const flavor = result.success ? "It's super effective!" : "But it failed!";
            this.playDialogue(`> Used ${label.split(' ')[1] || label}...\n> ${flavor}`, () => {
                this.updateBars();
                this.time.delayedCall(1000, () => {
                    this.speakerTab.setText(this.state.dealerName?.toUpperCase() || 'DEALER');
                    // Check if game over
                    if (result.dealReached || result.dealFailed) {
                        this.playDialogue(result.finalDialogue, () => this.renderResult());
                    } else {
                        this.playDialogue(result.dialogue.replace(/"/g, ''), () => this.renderTactics());
                    }
                });
            });
        });
    }

    renderResult() {
        this.state = HaggleManager.getState();
        this.tacticsContainer.removeAll(true);
        this.tacticsContainer.setVisible(true);

        const { width, height } = this.scale;
        const dlHeight = 120;
        const dlY = height - dlHeight - 40;

        const isDeal = this.state.result === 'deal';

        this.speakerTab.setText('RESULT');
        this.dialogueTextContent.setText('');

        const banner = this.add.text(width / 2, dlY + 40, isDeal ? '🤝 DEAL STRUCK' : '🏃 NEGOTIATION FAILED', {
            fontFamily: '"Press Start 2P"', fontSize: '16px', color: isDeal ? '#3a8a5c' : '#c94040'
        }).setOrigin(0.5);

        const sub = this.add.text(width / 2, dlY + 70, isDeal ? `Final Price: $${this.state.finalPrice.toLocaleString()}` : `They walked away.`, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#e8e4df'
        }).setOrigin(0.5);

        const btnW = 200;
        const btnY = dlY + dlHeight - 30;
        const bg = this.add.rectangle(width / 2, btnY, btnW, 30, 0x1a2e4e).setStrokeStyle(1, 0x4488cc).setInteractive({ useHandCursor: true });
        const txt = this.add.text(width / 2, btnY, 'CONTINUE →', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#88ccff' }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            HaggleManager.applyResult();
            this.endBattle();
        });

        this.tacticsContainer.add([banner, sub, bg, txt]);
    }

    endBattle() {
        if (this.ui && this.ui._container) {
            this.ui._container.style.display = 'block';
            this.ui.render();
        }
        this.scene.stop();
    }
}
