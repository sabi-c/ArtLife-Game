import { BaseScene } from './BaseScene.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { TACTICS, BLUE_OPTIONS, DEALER_DIALOGUE, HAGGLE_TYPES } from '../data/haggle_config.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';

export class HaggleScene extends BaseScene {
    constructor() {
        super({ key: 'HaggleScene' });
    }

    init(data) {
        this.ui = data.ui;
        this.haggleInfo = data.haggleInfo || {}; // initial state
        this.state = HaggleManager.getState() || data.haggleInfo?.state || this.haggleInfo;
        this.returnScene = data.returnScene || null;
        this.returnArgs = data.returnArgs || {};
    }

    preload() {
        // Dynamically load custom background or sprites if provided in State
        if (this.state.bgKey && !this.textures.exists(this.state.bgKey)) {
            this.load.image(this.state.bgKey, `/backgrounds/${this.state.bgKey}`);
        }
        if (this.state.dealerSpriteKey && !this.textures.exists(this.state.dealerSpriteKey)) {
            this.load.image(this.state.dealerSpriteKey, `/sprites/${this.state.dealerSpriteKey}`);
        }
        if (this.state.playerSpriteKey && !this.textures.exists(this.state.playerSpriteKey)) {
            this.load.image(this.state.playerSpriteKey, `/sprites/${this.state.playerSpriteKey}`);
        }
    }

    create(data) {
        super.create({ ...data, hideUI: true }); // Hides UI via BaseScene

        const { width, height } = this.scale;

        // ── Cinematic Entry (pokemon-react-phaser battle transition) ──
        this.cameras.main.fadeIn(500, 0, 0, 0);
        try {
            const vignette = this.cameras.main.postFX.addVignette();
            vignette.radius = 0.75; // Tighter vignette for battle intensity
        } catch (e) { /* Canvas renderer fallback */ }

        // Emit battle start event
        GameEventBus.emit(GameEvents.HAGGLE_START, {
            dealerType: this.state.dealerTypeKey,
            round: this.state.round,
        });
        const bgKey = this.state.bgKey || 'bg_gallery';
        if (this.textures.exists(bgKey)) {
            this.bg = this.add.image(width / 2, height / 2 - 80, bgKey);
            const scale = Math.max(width / this.bg.width, (height - 250) / this.bg.height);
            this.bg.setScale(scale).setTint(0x888888);
        } else {
            this.cameras.main.setBackgroundColor('#14141f');
        }

        // 2. Sprites
        const dealerKey = this.state.dealerSpriteKey || `dealer_${this.state.dealerTypeKey || 'patron'}`;
        const dealerSprite = this.textures.exists(dealerKey) ? dealerKey : 'dealer_patron';

        if (this.textures.exists(dealerSprite)) {
            const dealerTargetH = 200;
            const dlTex = this.textures.get(dealerSprite).source[0];
            const dlScale = dlTex.height > 0 ? dealerTargetH / dlTex.height : 1;
            this.dealer = this.add.image(width - 180, height / 2 - 60, dealerSprite)
                .setOrigin(0.5, 1)
                .setScale(dlScale)
                .setAlpha(0.95);

            const isWebGL = this.sys.game.renderer.type === Phaser.WEBGL;
            if (isWebGL) { this.dealer.setBlendMode(Phaser.BlendModes.LIGHTEN); }
        } else {
            this.dealer = this.add.text(width - 180, height / 2 - 60, this.state.dealerIcon || '👤', { fontSize: '100px' }).setOrigin(0.5, 1);
        }

        const playerKey = this.state.playerSpriteKey || 'player_back';
        if (this.textures.exists(playerKey)) {
            const playerTargetH = 200;
            const plTex = this.textures.get(playerKey).source[0];
            const plScale = plTex.height > 0 ? playerTargetH / plTex.height : 1;
            this.player = this.add.image(180, height - 200, playerKey)
                .setOrigin(0.5, 1)
                .setScale(plScale)
                .setAlpha(0.95);

            const isWebGL = this.sys.game.renderer.type === Phaser.WEBGL;
            if (isWebGL) { this.player.setBlendMode(Phaser.BlendModes.LIGHTEN); }
        } else {
            this.player = this.add.text(180, height - 200, '🕵️', { fontSize: '120px' }).setOrigin(0.5, 1).setScale(-1, 1);
        }

        // Letterbox bars
        this.add.rectangle(0, 0, width, 40, 0x000000).setOrigin(0, 0).setDepth(100);
        this.add.rectangle(0, height - 40, width, 40, 0x000000).setOrigin(0, 0).setDepth(100);
        this.roundText = this.add.text(width / 2, 20, `ROUND ${this.state.round || 1} / ${this.state.maxRounds || 5}`, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c9a84c'
        }).setOrigin(0.5, 0.5).setDepth(101);

        // Intro slides
        this.dealer.x += 200;
        this.dealer.alpha = 0;
        this.tweens.add({ targets: this.dealer, x: width - 180, alpha: 0.95, duration: 800, ease: 'Power2' });

        this.player.x -= 200;
        this.player.alpha = 0;
        this.tweens.add({ targets: this.player, x: 180, alpha: 0.95, duration: 800, ease: 'Power2', delay: 200 });

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

        // ── ESC key force-exit (safety hatch) ──
        this.input.keyboard.on('keydown-ESC', this.forceExit, this);
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
        const dlHeight = 150;
        const dlY = height - dlHeight - 40;

        this.dialogueBg = this.add.rectangle(width / 2, dlY + dlHeight / 2, width - 60, dlHeight, 0x14141f, 0.95);
        this.dialogueBg.setStrokeStyle(3, 0x3a3a4e);

        this.speakerTab = this.add.text(45, dlY - 14, this.state.dealerName?.toUpperCase() || 'DEALER', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c9a84c', backgroundColor: '#14141f', padding: { x: 8, y: 4 }
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
        // If the haggle is already resolved, skip straight to result screen
        if (this.state.resolved) {
            this.renderResult();
            return;
        }

        this.tacticsContainer.removeAll(true);
        this.tacticsContainer.setVisible(true);
        this.speakerTab.setText('YOUR TURN');

        const { width, height } = this.scale;
        const dlHeight = 150;
        const dlY = height - dlHeight - 40;

        // WalkAway comes from HaggleManager.getAvailableTactics() already — do NOT push again
        const tactics = HaggleManager.getAvailableTactics();

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

            // Map tactic types to header colors
            let typeColor = isBlue ? '#88ccff' : '#e8e4df';
            let typeBgColor = isBlue ? 0x1a2e4e : 0x1a1a2e;
            let typeHoverColor = isBlue ? 0x2a3e6e : 0x2a2a3e;
            let typeBorderColor = isBlue ? 0x4488cc : 0x3a3a4e;

            // Type styling
            let typeLabel = '';
            if (t.type) {
                switch (t.type) {
                    case HAGGLE_TYPES.EMOTIONAL: typeBorderColor = 0xff88aa; typeLabel = 'EMOTION'; break;
                    case HAGGLE_TYPES.LOGICAL: typeBorderColor = 0x88bbff; typeLabel = 'LOGIC'; break;
                    case HAGGLE_TYPES.AGGRESSIVE: typeBorderColor = 0xff6666; typeLabel = 'AGGRESSIVE'; break;
                    case HAGGLE_TYPES.FINANCIAL: typeBorderColor = 0x88cc88; typeLabel = 'FINANCIAL'; break;
                }
            }
            if (t.id === 'walkAway') {
                typeBorderColor = 0xff6666;
            }

            const bg = this.add.rectangle(x + btnW / 2, y + btnH / 2, btnW, btnH, typeBgColor)
                .setStrokeStyle(1.5, typeBorderColor).setInteractive({ useHandCursor: true });

            const txt = this.add.text(x + 10, y + btnH / 2 - 12, t.label, {
                fontFamily: '"Press Start 2P"', fontSize: '10px', color: typeColor
            }).setOrigin(0, 0.5);

            const descText = this.add.text(x + 10, y + btnH / 2 + 10, t.description || '', {
                fontFamily: '"Playfair Display"', fontSize: '12px', color: '#7a7a8a'
            }).setOrigin(0, 0.5);

            // Add the type label in the top right corner
            let typeBadge = null;
            if (typeLabel) {
                typeBadge = this.add.text(x + btnW - 5, y + 5, typeLabel, {
                    fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#' + typeBorderColor.toString(16).padStart(6, '0')
                }).setOrigin(1, 0).setAlpha(0.7);
            }

            bg.on('pointerover', () => bg.setFillStyle(typeHoverColor));
            bg.on('pointerout', () => bg.setFillStyle(typeBgColor));

            bg.on('pointerdown', () => this.executeTactic(t.id, t.label));

            this.tacticsContainer.add([bg, txt, descText]);
            if (typeBadge) this.tacticsContainer.add(typeBadge);
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

            // Guard: if tactic was locked or state invalid, recover gracefully
            if (!result) {
                console.warn('[HaggleScene] executeTactic returned null for:', tacticId);
                this.renderTactics();
                return;
            }

            // Animate dealer reaction based on success
            if (result.success) {
                this.cameras.main.shake(200, 0.01);
                this.tweens.add({ targets: this.dealer, x: this.dealer.x + 15, duration: 50, yoyo: true, repeat: 3 });
                if (this.dealer.setTint) { this.dealer.setTint(0xff8888); this.time.delayedCall(300, () => this.dealer.clearTint()); }
            } else {
                // Dealer resists
                this.tweens.add({ targets: this.dealer, y: this.dealer.y - 10, duration: 100, yoyo: true });
            }

            // Use real dealer dialogue from haggle_config instead of generic text
            const dealerDialogue = result.dialogue ? result.dialogue.replace(/"/g, '') : (result.success ? 'Interesting...' : 'I don\'t think so.');
            const priceInfo = result.priceChange ? `\n> Price shifted by $${Math.abs(result.priceChange).toLocaleString()}` : '';

            let effectText = result.success ? '✦ Effective!' : '✗ No effect.';
            if (result.effectivenessMessage) {
                effectText = `✦ ${result.effectivenessMessage}`;
            }

            this.playDialogue(`> ${effectText}${priceInfo}`, () => {
                this.updateBars();
                this.time.delayedCall(800, () => {
                    this.speakerTab.setText(this.state.dealerName?.toUpperCase() || 'DEALER');
                    // Check if game over
                    if (result.dealReached || result.dealFailed) {
                        this.playDialogue(result.finalDialogue ? result.finalDialogue.replace(/"/g, '') : 'We\'re done here.', () => this.renderResult());
                    } else {
                        this.playDialogue(dealerDialogue, () => this.renderTactics());
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
        const isDeal = this.state.result === 'deal';

        // Hide the dialogue box area
        this.dialogueBg.setAlpha(0);
        this.speakerTab.setAlpha(0);
        this.dialogueTextContent.setAlpha(0);

        if (isDeal) {
            // ═══ ART ACQUISITION CELEBRATION ═══
            // Full-screen dramatic overlay
            const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.92).setDepth(200);
            overlay.setAlpha(0);
            this.tweens.add({ targets: overlay, alpha: 1, duration: 600 });

            // Screen flash
            const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.9).setDepth(201);
            this.tweens.add({ targets: flash, alpha: 0, duration: 400, delay: 300 });
            this.cameras.main.shake(300, 0.02);

            // Art piece title
            const titleText = this.add.text(width / 2, height / 2 - 80, '🎨  ACQUIRED', {
                fontFamily: '"Press Start 2P"', fontSize: '28px', color: '#c9a84c', align: 'center'
            }).setOrigin(0.5).setDepth(202).setAlpha(0);
            this.tweens.add({ targets: titleText, alpha: 1, y: height / 2 - 90, duration: 800, delay: 500, ease: 'Power2' });

            const workTitle = this.add.text(width / 2, height / 2 - 30, `"${this.state.work?.title || 'Untitled'}"`, {
                fontFamily: '"Playfair Display"', fontSize: '22px', color: '#e8e4df', fontStyle: 'italic', align: 'center'
            }).setOrigin(0.5).setDepth(202).setAlpha(0);
            this.tweens.add({ targets: workTitle, alpha: 1, duration: 600, delay: 800 });

            const artistText = this.add.text(width / 2, height / 2 + 10, `by ${this.state.work?.artist || 'Unknown Artist'}`, {
                fontFamily: '"Playfair Display"', fontSize: '16px', color: '#7a7a8a', align: 'center'
            }).setOrigin(0.5).setDepth(202).setAlpha(0);
            this.tweens.add({ targets: artistText, alpha: 1, duration: 600, delay: 1000 });

            // Price details
            const savings = (this.state.askingPrice || 0) - (this.state.finalPrice || 0);
            const priceText = this.add.text(width / 2, height / 2 + 60, `DEAL AT $${(this.state.finalPrice || 0).toLocaleString()}`, {
                fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#3a8a5c', align: 'center'
            }).setOrigin(0.5).setDepth(202).setAlpha(0);
            this.tweens.add({ targets: priceText, alpha: 1, duration: 600, delay: 1200 });

            if (savings > 0) {
                const savingsText = this.add.text(width / 2, height / 2 + 90, `You saved $${savings.toLocaleString()} from the asking price`, {
                    fontFamily: '"Playfair Display"', fontSize: '14px', color: '#c9a84c', align: 'center'
                }).setOrigin(0.5).setDepth(202).setAlpha(0);
                this.tweens.add({ targets: savingsText, alpha: 1, duration: 600, delay: 1400 });
            }

            // Continue button (appears last)
            const btnY = height / 2 + 140;
            const bg = this.add.rectangle(width / 2, btnY, 220, 36, 0x1a2e4e, 0.9).setStrokeStyle(2, 0x4488cc).setInteractive({ useHandCursor: true }).setDepth(202).setAlpha(0);
            const txt = this.add.text(width / 2, btnY, 'CONTINUE →', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#88ccff' }).setOrigin(0.5).setDepth(202).setAlpha(0);

            this.tweens.add({ targets: [bg, txt], alpha: 1, duration: 400, delay: 1800 });

            bg.on('pointerover', () => bg.setFillStyle(0x2a3e6e));
            bg.on('pointerout', () => bg.setFillStyle(0x1a2e4e));
            bg.on('pointerdown', () => {
                HaggleManager.applyResult();
                this.endBattle();
            });

            this.tacticsContainer.add([overlay, flash, titleText, workTitle, artistText, priceText, bg, txt]);

        } else {
            // ═══ FAILED DEAL SCREEN ═══
            const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85).setDepth(200);
            overlay.setAlpha(0);
            this.tweens.add({ targets: overlay, alpha: 1, duration: 400 });

            // Dealer walks away — slide out
            if (this.dealer) {
                this.tweens.add({ targets: this.dealer, x: width + 200, alpha: 0, duration: 1000, ease: 'Power2' });
            }

            const failHeader = this.add.text(width / 2, height / 2 - 60, '💨  WALKED AWAY', {
                fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#c94040', align: 'center'
            }).setOrigin(0.5).setDepth(202).setAlpha(0);
            this.tweens.add({ targets: failHeader, alpha: 1, duration: 600, delay: 400 });

            const failSub = this.add.text(width / 2, height / 2, `"${this.state.work?.title || 'The artwork'}" slipped through your fingers.`, {
                fontFamily: '"Playfair Display"', fontSize: '16px', color: '#7a7a8a', align: 'center', wordWrap: { width: width - 200 }
            }).setOrigin(0.5).setDepth(202).setAlpha(0);
            this.tweens.add({ targets: failSub, alpha: 1, duration: 600, delay: 700 });

            const btnY = height / 2 + 80;
            const bg = this.add.rectangle(width / 2, btnY, 200, 36, 0x2e1a1a, 0.9).setStrokeStyle(2, 0xc94040).setInteractive({ useHandCursor: true }).setDepth(202).setAlpha(0);
            const txt = this.add.text(width / 2, btnY, 'RETURN →', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ff8888' }).setOrigin(0.5).setDepth(202).setAlpha(0);

            this.tweens.add({ targets: [bg, txt], alpha: 1, duration: 400, delay: 1200 });

            bg.on('pointerover', () => bg.setFillStyle(0x4e2a2a));
            bg.on('pointerout', () => bg.setFillStyle(0x2e1a1a));
            bg.on('pointerdown', () => {
                HaggleManager.applyResult();
                this.endBattle();
            });

            this.tacticsContainer.add([overlay, failHeader, failSub, bg, txt]);
        }
    }

    /**
     * Force-exit the haggle scene (ESC key safety hatch).
     * Cleans up state and restores the terminal UI regardless of battle state.
     */
    forceExit() {
        console.warn('[HaggleScene] Force-exiting via ESC');
        this.input.keyboard.off('keydown-ESC', this.forceExit, this);
        if (this.typeEvent) this.typeEvent.remove();

        const { width, height } = this.scale;
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9).setDepth(200);
        this.add.text(width / 2, height / 2, 'LEFT THE TABLE', {
            fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#c94040'
        }).setOrigin(0.5).setDepth(201);

        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            try { HaggleManager.applyResult(); } catch (e) { /* no active haggle to apply */ }
            GameEventBus.emit(GameEvents.HAGGLE_END, { dealerType: this.state?.dealerTypeKey, result: 'force_exit', round: this.state?.round });
            this.showTerminalUI();
            if (this.ui) {
                this.ui.popScreen();
            }
            this.scene.stop();
        });
    }

    endBattle() {
        // Emit result event via event bus
        this.input.keyboard.off('keydown-ESC', this.forceExit, this);
        GameEventBus.emit(GameEvents.HAGGLE_END, {
            dealerType: this.state.dealerTypeKey,
            result: this.state.result,
            round: this.state.round,
        });

        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, async () => {
            if (this.returnScene) {
                // Return to the scene that launched the haggle (e.g. LocationScene)
                this.scene.start(this.returnScene, {
                    ...this.returnArgs,
                    ui: this.ui,
                });
            } else {
                // Fall back to terminal dashboard
                this.showTerminalUI();
                if (this.ui) {
                    const { dashboardScreen } = await import('../terminal/screens/dashboard.js');
                    this.ui.replaceScreen(dashboardScreen(this.ui));
                }
                this.scene.stop();
            }
        });
    }
}
