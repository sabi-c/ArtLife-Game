/**
 * HaggleRenderer.js — Visual rendering, scene setup, and result screens for HaggleScene.
 *
 * Mixin module: exports methods that get assigned to HaggleScene.prototype.
 * All methods use `this` referring to the HaggleScene instance.
 *
 * Contains:
 *   - _playBattleIntro — Cinematic VS intro with letterbox bars and name slides
 *   - _buildBattleArena — Background, dealer/player sprites, round text
 *   - _revealBattleUI — Post-intro sprite slide-in and UI initialization
 *   - drawUIContainers — Patience bar, gap bar, nerve bar panels
 *   - updateBars — Animated or instant bar redraws from HaggleManager state
 *   - drawInteractiveUI — Dialogue box and menu panel setup
 *   - _showResultScreen — Full cinematic result (deal success/fail)
 *   - _checkDealAchievements — Achievement badge logic for deal results
 */

import Phaser from 'phaser';
import { HaggleManager } from '../../managers/HaggleManager.js';
import { MarketManager } from '../../managers/MarketManager.js';
import { GameState } from '../../managers/GameState.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { WebAudioService } from '../../managers/WebAudioService.js';
import { HAGGLE_ACHIEVEMENTS } from '../../data/haggle_config.js';
import { clamp } from '../../utils/math.js';

export const HaggleRendererMixin = {

    _playBattleIntro(width, height, onComplete) {
        const INTRO_DEPTH = 500;
        const introElements = [];

        // Full black overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000)
            .setDepth(INTRO_DEPTH).setAlpha(1);
        introElements.push(overlay);

        // Narrow "eye" letterbox bars (cinematic widescreen effect)
        const barH = height * 0.35;
        const topBar = this.add.rectangle(width / 2, 0, width, barH, 0x000000)
            .setOrigin(0.5, 0).setDepth(INTRO_DEPTH + 5);
        const bottomBar = this.add.rectangle(width / 2, height, width, barH, 0x000000)
            .setOrigin(0.5, 1).setDepth(INTRO_DEPTH + 5);
        introElements.push(topBar, bottomBar);

        // "Eye stripe" — the visible band between bars showing a dramatic gradient
        const eyeStripe = this.add.rectangle(width / 2, height / 2, width, height * 0.3, 0x1a0a0a)
            .setDepth(INTRO_DEPTH + 1).setAlpha(0);
        introElements.push(eyeStripe);

        // Dealer name (right side)
        const dealerName = this.state.npcName || this.state.dealerName || 'The Dealer';
        const dealerText = this.add.text(width + 200, height / 2 - 8, dealerName.toUpperCase(), {
            fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#c94040',
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 0, fill: true },
        }).setOrigin(1, 1).setDepth(INTRO_DEPTH + 3);
        introElements.push(dealerText);

        // Player name (left side)
        const playerName = window._artLifeState?.playerName || 'YOU';
        const playerText = this.add.text(-200, height / 2 + 8, playerName.toUpperCase(), {
            fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#4a9eff',
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 0, fill: true },
        }).setOrigin(0, 0).setDepth(INTRO_DEPTH + 3);
        introElements.push(playerText);

        // "VS" text (center)
        const vsText = this.add.text(width / 2, height / 2, 'VS', {
            fontFamily: '"Press Start 2P"', fontSize: '28px', color: '#c9a84c',
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 0, fill: true },
        }).setOrigin(0.5).setDepth(INTRO_DEPTH + 4).setAlpha(0).setScale(3);
        introElements.push(vsText);

        // Narrative flavor text
        const flavors = [
            'The air grows tense...',
            'A battle of wits begins.',
            'Every word is a weapon.',
            'The stakes couldn\'t be higher.',
            'Two forces collide.',
        ];
        const flavor = flavors[Math.floor(Math.random() * flavors.length)];
        const flavorText = this.add.text(width / 2, height / 2 + 50, flavor, {
            fontFamily: '"Playfair Display", serif', fontSize: '16px', color: '#888',
            fontStyle: 'italic',
        }).setOrigin(0.5).setDepth(INTRO_DEPTH + 3).setAlpha(0);
        introElements.push(flavorText);

        // ── Animation Timeline ──
        WebAudioService.sceneEnter();

        // Phase 1 (0ms): Reveal the eye stripe
        this.tweens.add({
            targets: overlay, alpha: 0.85, duration: 300,
        });
        this.tweens.add({
            targets: eyeStripe, alpha: 1, duration: 400,
        });

        // Phase 2 (400ms): Slide in names from opposite sides
        this.tweens.add({
            targets: dealerText, x: width - 40, duration: 600, ease: 'Power3', delay: 400,
        });
        this.tweens.add({
            targets: playerText, x: 40, duration: 600, ease: 'Power3', delay: 500,
        });

        // Phase 3 (1000ms): VS slam with screen shake
        this.time.delayedCall(1000, () => {
            WebAudioService.hit();
            vsText.setAlpha(1);
            this.tweens.add({
                targets: vsText, scale: 1, duration: 300, ease: 'Back.easeOut',
            });
            // Screen shake
            this.cameras.main.shake(200, 0.01);
        });

        // Phase 4 (1400ms): Show flavor text
        this.tweens.add({
            targets: flavorText, alpha: 1, duration: 500, delay: 1400,
        });

        // Phase 5 (2500ms): Flash and clear intro
        this.time.delayedCall(2500, () => {
            // White flash
            const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff)
                .setDepth(INTRO_DEPTH + 10).setAlpha(0);
            introElements.push(flash);

            this.tweens.add({
                targets: flash, alpha: 0.8, duration: 100, yoyo: true, hold: 50,
                onComplete: () => {
                    // Fade out all intro elements
                    for (const el of introElements) {
                        this.tweens.add({
                            targets: el, alpha: 0, duration: 400,
                            onComplete: () => el.destroy(),
                        });
                    }
                    // Open letterbox bars
                    this.tweens.add({
                        targets: topBar, y: -barH, duration: 500, ease: 'Power2',
                    });
                    this.tweens.add({
                        targets: bottomBar, y: height + barH, duration: 500, ease: 'Power2',
                    });

                    this.time.delayedCall(500, onComplete);
                },
            });
        });
    },

    _buildBattleArena(width, height) {
        // Background
        const bgKey = this.state.bgKey || 'bg_gallery';
        if (this.textures.exists(bgKey)) {
            this.bg = this.add.image(width / 2, height / 2 - 80, bgKey);
            const scale = Math.max(width / this.bg.width, (height - 250) / this.bg.height);
            this.bg.setScale(scale).setTint(0x888888);
        }

        // Dealer sprite
        const dealerKey = this.state.dealerSpriteKey || `dealer_${this.state.dealerTypeKey || 'patron'}`;
        const dealerSprite = this.textures.exists(dealerKey) ? dealerKey : 'dealer_patron';

        if (this.textures.exists(dealerSprite)) {
            const dealerTargetH = 200;
            const dlTex = this.textures.get(dealerSprite).source[0];
            const dlScale = dlTex.height > 0 ? dealerTargetH / dlTex.height : 1;
            this.dealer = this.add.image(width - 180, height / 2 - 60, dealerSprite)
                .setOrigin(0.5, 1).setScale(dlScale).setAlpha(0);

            const isWebGL = this.sys.game.renderer.type === Phaser.WEBGL;
            if (isWebGL) { this.dealer.setBlendMode(Phaser.BlendModes.LIGHTEN); }
        } else {
            this.dealer = this.add.text(width - 180, height / 2 - 60, this.state.dealerIcon || '', { fontSize: '100px' }).setOrigin(0.5, 1).setAlpha(0);
        }

        // Player sprite
        const playerKey = this.state.playerSpriteKey || 'player_back';
        if (this.textures.exists(playerKey)) {
            const playerTargetH = 200;
            const plTex = this.textures.get(playerKey).source[0];
            const plScale = plTex.height > 0 ? playerTargetH / plTex.height : 1;
            this.player = this.add.image(180, height - 200, playerKey)
                .setOrigin(0.5, 1).setScale(plScale).setAlpha(0);

            const isWebGL = this.sys.game.renderer.type === Phaser.WEBGL;
            if (isWebGL) { this.player.setBlendMode(Phaser.BlendModes.LIGHTEN); }
        } else {
            this.player = this.add.text(180, height - 200, '', { fontSize: '120px' }).setOrigin(0.5, 1).setScale(-1, 1).setAlpha(0);
        }

        // Letterbox bars (persistent battle chrome)
        this.add.rectangle(0, 0, width, 40, 0x000000).setOrigin(0, 0).setDepth(100);
        this.add.rectangle(0, height - 40, width, 40, 0x000000).setOrigin(0, 0).setDepth(100);
        this.roundText = this.add.text(width / 2, 20, `ROUND ${this.state.round || 1} / ${this.state.maxRounds || 5}`, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c9a84c'
        }).setOrigin(0.5, 0.5).setDepth(101);
    },

    _revealBattleUI(width, height) {
        try {
            const vignette = this.cameras.main.postFX.addVignette();
            vignette.radius = 0.75;
        } catch (e) { /* Canvas renderer fallback */ }

        // Slide in sprites
        this.dealer.x += 200;
        this.tweens.add({ targets: this.dealer, x: width - 180, alpha: 0.95, duration: 800, ease: 'Power2' });

        this.player.x -= 200;
        this.tweens.add({ targets: this.player, x: 180, alpha: 0.95, duration: 800, ease: 'Power2', delay: 200 });

        // Build UI
        this.drawUIContainers(width, height);
        this.updateBars();
        this.drawInteractiveUI(width, height);

        // Start opening dialogue
        this.time.delayedCall(1000, () => {
            this.playDialogue(this.haggleInfo.openingDialogue || "Let's negotiate.", () => {
                this.renderTactics();
            });
        });
    },

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

        // Player Info — includes NERVE (AUD) bar
        const pPanelY = height - 250;
        this.add.rectangle(width - 290, pPanelY, 260, 80, 0x1a1a2e, 0.9).setOrigin(0, 0).setStrokeStyle(2, 0x2a2a3a);

        this.add.text(width - 275, pPanelY + 12, 'GAP TO ASK', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#e8e4df'
        });

        this.add.text(width - 275, pPanelY + 45, (this.state.work?.title || 'Artwork').substring(0, 25), {
            fontFamily: '"Playfair Display"', fontSize: '12px', color: '#7a7a8a'
        });

        this.gapBarBg = this.add.graphics();
        this.gapBarBg.fillStyle(0x000000, 1).fillRect(width - 275, pPanelY + 28, 230, 10).lineStyle(1, 0x3a3a4e).strokeRect(width - 275, pPanelY + 28, 230, 10);
        this.gapBarFill = this.add.graphics();

        this.gapText = this.add.text(width - 40, pPanelY + 27, this.state.inquire ? '???' : '100%', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: this.state.inquire ? '#888888' : '#c9a84c'
        }).setOrigin(1, 0);

        // NERVE (AUD) bar
        const audacity = this.state.playerStats?.audacity ?? 0;
        this.add.text(width - 275, pPanelY + 60, 'NERVE', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#7a7a8a'
        });

        const nerveBarW = 120;
        this.add.graphics()
            .fillStyle(0x000000, 1).fillRect(width - 215, pPanelY + 58, nerveBarW, 10)
            .lineStyle(1, 0x3a3a4e).strokeRect(width - 215, pPanelY + 58, nerveBarW, 10);

        const nerveFill = Math.min(1, audacity / 100);
        const nerveColor = audacity >= 50 ? 0x4488cc : 0x3a5a8a;
        this.add.graphics()
            .fillStyle(nerveColor, 1)
            .fillRect(width - 215, pPanelY + 58, nerveBarW * nerveFill, 10);

        this.add.text(width - 215 + nerveBarW + 8, pPanelY + 57, `${audacity}`, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: audacity >= 50 ? '#88ccff' : '#5a6a8a'
        });

        // AUD > 50 glow on player sprite
        if (audacity >= 50 && this.player) {
            if (this.player.setTint) this.player.setTint(0x88aadd);
        }
    },

    updateBars(animate = false) {
        // Merge live haggle state without losing local extras (bgKey, playerStats, etc.)
        const live = HaggleManager.getState();
        if (live) {
            Object.assign(this.state, live);
        }
        this.roundText.setText(`ROUND ${this.state.round || 1} / ${this.state.maxRounds || 5}`);

        const patPercent = Math.max(0, this.state.patience / (this.state.maxPatience || 1));
        const patColor = patPercent > 0.5 ? 0x3a8a5c : patPercent > 0.25 ? 0xc9a84c : 0xc94040;

        const asking = this.state.askingPrice || 1;
        const gapPercentRaw = this.state.gap / asking;
        const gapPercent = clamp(gapPercentRaw, 0, 1);
        const gapColor = gapPercent > 0.5 ? 0xc94040 : gapPercent > 0.1 ? 0xc9a84c : 0x3a8a5c;

        if (animate) {
            // Animate bars with tweened redraw
            const targetPatW = 150 * patPercent;
            const targetGapW = 230 * gapPercent;
            const pPanelY = this.scale.height - 250;

            // Use a dummy object to tween bar widths
            const barState = {
                patW: this._lastPatW ?? targetPatW,
                gapW: this.state.inquire ? 0 : (this._lastGapW ?? targetGapW),
            };

            this.tweens.add({
                targets: barState,
                patW: targetPatW,
                gapW: targetGapW,
                duration: 600,
                ease: 'Power2',
                onUpdate: () => {
                    this.patBarFill.clear();
                    this.patBarFill.fillStyle(patColor, 1);
                    this.patBarFill.fillRect(120, 68, barState.patW, 10);

                    this.gapBarFill.clear();
                    if (!this.state.inquire) {
                        this.gapBarFill.fillStyle(gapColor, 1);
                        this.gapBarFill.fillRect(this.scale.width - 275, pPanelY + 28, barState.gapW, 10);
                    } else {
                        // Draw a static "unknown" bar pattern
                        this.gapBarFill.fillStyle(0x3a3a4e, 1);
                        this.gapBarFill.fillRect(this.scale.width - 275, pPanelY + 28, 230, 10);
                    }
                },
                onComplete: () => {
                    this._lastPatW = targetPatW;
                    this._lastGapW = targetGapW;
                }
            });
        } else {
            // Instant redraw (initial draw)
            this.patBarFill.clear();
            this.patBarFill.fillStyle(patColor, 1);
            this.patBarFill.fillRect(120, 68, 150 * patPercent, 10);
            this._lastPatW = 150 * patPercent;

            this.gapBarFill.clear();
            const pPanelY = this.scale.height - 250;
            if (!this.state.inquire) {
                this.gapBarFill.fillStyle(gapColor, 1);
                this.gapBarFill.fillRect(this.scale.width - 275, pPanelY + 28, 230 * gapPercent, 10);
                this._lastGapW = 230 * gapPercent;
            } else {
                this.gapBarFill.fillStyle(0x3a3a4e, 1);
                this.gapBarFill.fillRect(this.scale.width - 275, pPanelY + 28, 230, 10);
                this._lastGapW = 0;
            }
        }

        if (this.state.inquire) {
            this.gapText.setText('???');
            this.gapText.setColor('#888888');
        } else {
            this.gapText.setText(`${Math.round(gapPercent * 100)}%`);
            this.gapText.setColor(gapColor === 0xc94040 ? '#c94040' : gapColor === 0x3a8a5c ? '#3a8a5c' : '#c9a84c');
        }
    },

    drawInteractiveUI(width, height) {
        // Dialogue Box at bottom — expanded for menu system
        const dlHeight = 180;
        const dlY = height - dlHeight - 40;

        this.dialogueBg = this.add.rectangle(width / 2, dlY + dlHeight / 2, width - 40, dlHeight, 0x14141f, 0.95);
        this.dialogueBg.setStrokeStyle(3, 0x3a3a4e);

        this.speakerTab = this.add.text(35, dlY - 14, this.state.dealerName?.toUpperCase() || 'DEALER', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c9a84c', backgroundColor: '#14141f', padding: { x: 8, y: 4 }
        });

        this.dialogueTextContent = this.add.text(40, dlY + 16, '', {
            fontFamily: '"Playfair Display"', fontSize: '17px', color: '#e8e4df', wordWrap: { width: width - 100, useAdvancedWrap: true }, lineSpacing: 6
        });

        // Right-side menu panel (Pokemon-style action box)
        const menuW = 260;
        this.menuBg = this.add.rectangle(width - menuW / 2 - 20, dlY + dlHeight / 2, menuW, dlHeight, 0x0a0a1e, 0.98);
        this.menuBg.setStrokeStyle(2, 0x3a3a4e).setVisible(false);

        // Tactics Grid Container (hidden initially)
        this.tacticsContainer = this.add.container(0, 0);
        this.tacticsContainer.setVisible(false);

        // Store layout constants for reuse
        this._uiLayout = { dlHeight, dlY, menuW };
    },

    /** The actual result screen — called after dealer dialogue cutscene */
    _showResultScreen(isDeal) {
        const { width, height } = this.scale;
        const DEPTH = 200;
        const elements = [];

        // Hide dialogue box for the result overlay
        this.dialogueBg.setAlpha(0);
        this.speakerTab.setAlpha(0);
        this.dialogueTextContent.setAlpha(0);
        this.tacticsContainer.removeAll(true);
        this.tacticsContainer.setVisible(true);

        if (isDeal) {
            // ═════════════════════════════════════════════
            // ═══ CINEMATIC ART ACQUISITION CELEBRATION ═══
            // ═════════════════════════════════════════════
            WebAudioService.dealSuccess?.();

            const work = this.state.work || {};
            const finalPrice = this.state.finalPrice || 0;
            const askingPrice = this.state.askingPrice || 0;
            const savings = askingPrice - finalPrice;
            const savingsPct = askingPrice > 0 ? Math.round((savings / askingPrice) * 100) : 0;

            // Market value comparison
            let marketValue = 0;
            try { marketValue = MarketManager.calculatePrice(work, false) || work.basePrice || askingPrice; } catch (e) { marketValue = askingPrice; }
            const vsMkt = finalPrice - marketValue;
            const vsMktPct = marketValue > 0 ? Math.round((vsMkt / marketValue) * 100) : 0;
            const isGoodDeal = vsMkt < 0;

            const cashAfter = (GameState.state?.cash || 0) - finalPrice;
            const roundCount = this.state.rounds?.length || this.state.round || '?';
            const dealerKey = this.state.dealerTypeKey || 'patron';

            // ── Phase 0: Blackout + flash ──
            const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x050510, 0.96).setDepth(DEPTH).setAlpha(0);
            elements.push(overlay);
            this.tweens.add({ targets: overlay, alpha: 1, duration: 400 });

            const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.85).setDepth(DEPTH + 1);
            elements.push(flash);
            this.tweens.add({ targets: flash, alpha: 0, duration: 300, delay: 200 });
            this.cameras.main.shake(250, 0.012);

            // ── Phase 1 (400ms): "ART ACQUIRED" header ──
            const headerText = this.add.text(width / 2, 48, '✦  A R T   A C Q U I R E D  ✦', {
                fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#c9a84c',
                stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setDepth(DEPTH + 2).setAlpha(0);
            elements.push(headerText);
            this.tweens.add({ targets: headerText, alpha: 1, y: 44, duration: 600, delay: 400, ease: 'Back.easeOut' });

            // Gold decorative line
            const headerLine = this.add.graphics().setDepth(DEPTH + 2).setAlpha(0);
            headerLine.lineStyle(1, 0xc9a84c, 0.4);
            headerLine.lineBetween(width * 0.2, 66, width * 0.8, 66);
            elements.push(headerLine);
            this.tweens.add({ targets: headerLine, alpha: 1, duration: 400, delay: 650 });

            // ── Phase 2 (700ms): Artwork card (left side) ──
            const cardCenterX = width * 0.28;
            const cardCenterY = height / 2 - 10;
            const cardW = Math.min(180, width * 0.25);
            const cardH = Math.min(220, height * 0.42);

            // Gold frame
            const frame = this.add.rectangle(cardCenterX, cardCenterY, cardW + 12, cardH + 12, 0x0a0a1a, 0.95)
                .setStrokeStyle(2.5, 0xc9a84c).setDepth(DEPTH + 2).setAlpha(0);
            elements.push(frame);

            // Inner mat
            const mat = this.add.rectangle(cardCenterX, cardCenterY, cardW, cardH, 0x151520)
                .setStrokeStyle(1, 0x222236).setDepth(DEPTH + 2).setAlpha(0);
            elements.push(mat);

            // Artwork image or placeholder
            const spriteKey = work.sprite || work.spriteKey;
            let artDisp;
            if (spriteKey && this.textures.exists(spriteKey)) {
                const tex = this.textures.get(spriteKey).source[0];
                const scale = Math.min((cardW - 16) / tex.width, (cardH - 70) / tex.height);
                artDisp = this.add.image(cardCenterX, cardCenterY - 20, spriteKey)
                    .setScale(scale).setDepth(DEPTH + 3).setAlpha(0);
            } else {
                artDisp = this.add.text(cardCenterX, cardCenterY - 20, '🖼️', {
                    fontSize: '56px',
                }).setOrigin(0.5).setDepth(DEPTH + 3).setAlpha(0);
            }
            elements.push(artDisp);

            // Title + artist beneath artwork
            const titleTxt = this.add.text(cardCenterX, cardCenterY + cardH / 2 - 28,
                `"${(work.title || 'Untitled').substring(0, 22)}"`, {
                fontFamily: '"Playfair Display"', fontSize: '13px', color: '#e8e4df', fontStyle: 'italic',
                align: 'center', wordWrap: { width: cardW - 10 },
            }).setOrigin(0.5).setDepth(DEPTH + 3).setAlpha(0);
            elements.push(titleTxt);

            const artistTxt = this.add.text(cardCenterX, cardCenterY + cardH / 2 - 10,
                work.artist || 'Unknown Artist', {
                fontFamily: '"Playfair Display"', fontSize: '10px', color: '#7a7a8a', align: 'center',
            }).setOrigin(0.5).setDepth(DEPTH + 3).setAlpha(0);
            elements.push(artistTxt);

            // Medium / Year tag
            const medStr = [work.medium, work.year].filter(Boolean).join(', ');
            if (medStr) {
                const medTxt = this.add.text(cardCenterX, cardCenterY + cardH / 2 + 4, medStr, {
                    fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#444', align: 'center',
                }).setOrigin(0.5).setDepth(DEPTH + 3).setAlpha(0);
                elements.push(medTxt);
            }

            // Staggered card reveal
            [frame, mat, artDisp, titleTxt, artistTxt].forEach((el, i) => {
                this.tweens.add({ targets: el, alpha: 1, duration: 400, delay: 700 + i * 70, ease: 'Power2' });
            });

            // Gentle float
            this.tweens.add({ targets: artDisp, y: artDisp.y - 3, yoyo: true, repeat: -1, duration: 2500, ease: 'Sine.easeInOut', delay: 1200 });

            // ── Phase 3 (1200ms): Price comparison panel (right side) ──
            const panelX = width * 0.66;
            const panelW = Math.min(280, width * 0.36);
            const panelTopY = 80;

            // Panel bg
            const panelBg = this.add.rectangle(panelX, panelTopY + 90, panelW, 190, 0x0c0c18, 0.92)
                .setStrokeStyle(1.5, 0x222236).setDepth(DEPTH + 2).setAlpha(0);
            elements.push(panelBg);
            this.tweens.add({ targets: panelBg, alpha: 1, duration: 350, delay: 1200 });

            // Price rows
            const rows = [
                { lbl: 'DEAL PRICE', val: `$${finalPrice.toLocaleString()}`, col: '#4ade80', fs: '13px' },
                { lbl: 'ASKING PRICE', val: `$${askingPrice.toLocaleString()}`, col: '#f87171', fs: '9px', strike: true },
                { lbl: 'MARKET VALUE', val: `$${marketValue.toLocaleString()}`, col: '#60a5fa', fs: '9px' },
            ];

            rows.forEach((r, i) => {
                const ry = panelTopY + 18 + i * 30;
                const l = this.add.text(panelX - panelW / 2 + 14, ry, r.lbl, {
                    fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#555',
                }).setDepth(DEPTH + 3).setAlpha(0);
                const v = this.add.text(panelX + panelW / 2 - 14, ry, r.val, {
                    fontFamily: '"Press Start 2P"', fontSize: r.fs, color: r.col,
                }).setOrigin(1, 0).setDepth(DEPTH + 3).setAlpha(0);
                elements.push(l, v);
                this.tweens.add({ targets: [l, v], alpha: 1, duration: 250, delay: 1300 + i * 160 });

                if (r.strike) {
                    const sg = this.add.graphics().setDepth(DEPTH + 4).setAlpha(0);
                    sg.lineStyle(1.5, 0xf87171, 0.5);
                    const tw = r.val.length * 7;
                    sg.lineBetween(panelX + panelW / 2 - 14 - tw - 2, ry + 6, panelX + panelW / 2 - 10, ry + 6);
                    elements.push(sg);
                    this.tweens.add({ targets: sg, alpha: 1, duration: 200, delay: 1600 });
                }
            });

            // Savings / Market comparison badges
            const bdgY = panelTopY + 112;
            if (savings > 0) {
                const sBg = this.add.rectangle(panelX - panelW / 4, bdgY, panelW / 2 - 8, 24, 0x0e1e0e)
                    .setStrokeStyle(1, 0x2e6e2e).setDepth(DEPTH + 3).setAlpha(0);
                const sTx = this.add.text(panelX - panelW / 4, bdgY, `▼ ${savingsPct}% OFF`, {
                    fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#4ade80',
                }).setOrigin(0.5).setDepth(DEPTH + 3).setAlpha(0);
                elements.push(sBg, sTx);
                this.tweens.add({ targets: [sBg, sTx], alpha: 1, duration: 250, delay: 1850 });
            }

            if (marketValue > 0) {
                const mc = isGoodDeal ? '#4ade80' : '#f87171';
                const ml = isGoodDeal ? `▼ ${Math.abs(vsMktPct)}% VS MKT` : `▲ ${Math.abs(vsMktPct)}% VS MKT`;
                const mBg = this.add.rectangle(panelX + panelW / 4, bdgY, panelW / 2 - 8, 24, isGoodDeal ? 0x0e1e0e : 0x1e0e0e)
                    .setStrokeStyle(1, isGoodDeal ? 0x2e6e2e : 0x6e2e2e).setDepth(DEPTH + 3).setAlpha(0);
                const mTx = this.add.text(panelX + panelW / 4, bdgY, ml, {
                    fontFamily: '"Press Start 2P"', fontSize: '6px', color: mc,
                }).setOrigin(0.5).setDepth(DEPTH + 3).setAlpha(0);
                elements.push(mBg, mTx);
                this.tweens.add({ targets: [mBg, mTx], alpha: 1, duration: 250, delay: 2000 });
            }

            // ── Stats row ──
            const stY = panelTopY + 148;
            [
                { lbl: 'ROUNDS', val: `${roundCount}`, ico: '⚔️' },
                { lbl: 'SAVED', val: savings > 0 ? `$${savings.toLocaleString()}` : '--', ico: '💰' },
                { lbl: 'CASH', val: `$${Math.max(0, cashAfter).toLocaleString()}`, ico: '💵' },
            ].forEach((s, i) => {
                const sx = panelX - panelW / 2 + 14 + i * (panelW / 3);
                const sl = this.add.text(sx, stY, `${s.ico} ${s.lbl}`, {
                    fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#555',
                }).setDepth(DEPTH + 3).setAlpha(0);
                const sv = this.add.text(sx, stY + 12, s.val, {
                    fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#c9a84c',
                }).setDepth(DEPTH + 3).setAlpha(0);
                elements.push(sl, sv);
                this.tweens.add({ targets: [sl, sv], alpha: 1, duration: 250, delay: 2200 + i * 120 });
            });

            // ── Phase 4: Achievements ──
            const earnedAchievements = this._checkDealAchievements(dealerKey, finalPrice, askingPrice, roundCount);
            if (earnedAchievements.length > 0) {
                const achY = height - 130;
                const achBg = this.add.rectangle(width / 2, achY, width - 60, 36, 0x1a1a0e, 0.9)
                    .setStrokeStyle(1, 0x8a8a3a).setDepth(DEPTH + 2).setAlpha(0);
                elements.push(achBg);
                this.tweens.add({ targets: achBg, alpha: 1, duration: 300, delay: 2600 });

                const achSpacing = Math.min(120, (width - 100) / earnedAchievements.length);
                earnedAchievements.forEach((ach, i) => {
                    const ax = width / 2 - ((earnedAchievements.length - 1) * achSpacing) / 2 + i * achSpacing;
                    const icon = this.add.text(ax, achY - 2, ach.icon, {
                        fontSize: '16px',
                    }).setOrigin(0.5).setDepth(DEPTH + 3).setAlpha(0);
                    const name = this.add.text(ax, achY + 12, ach.name, {
                        fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#c9a84c',
                    }).setOrigin(0.5).setDepth(DEPTH + 3).setAlpha(0);
                    elements.push(icon, name);
                    this.tweens.add({ targets: [icon, name], alpha: 1, duration: 300, delay: 2700 + i * 150 });
                    // Pop animation on icon
                    this.tweens.add({ targets: icon, scale: 1.4, yoyo: true, duration: 200, delay: 2800 + i * 150 });
                });
            }

            // ── Collection confirmation ──
            const colY = height - 85;
            const colBg = this.add.rectangle(width / 2, colY, width - 60, 26, 0x0a1a0a, 0.9)
                .setStrokeStyle(1, 0x3a8a5c).setDepth(DEPTH + 2).setAlpha(0);
            const portfolioCount = (GameState.state?.portfolio?.length || 0) + 1;
            const colTx = this.add.text(width / 2, colY, `✦ Added to collection — ${portfolioCount} work${portfolioCount !== 1 ? 's' : ''} in portfolio`, {
                fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#4ade80',
            }).setOrigin(0.5).setDepth(DEPTH + 3).setAlpha(0);
            elements.push(colBg, colTx);
            const colDelay = earnedAchievements.length > 0 ? 3100 : 2700;
            this.tweens.add({ targets: [colBg, colTx], alpha: 1, duration: 350, delay: colDelay });

            // ── Continue button ──
            const btnY = height - 48;
            const btnBg = this.add.rectangle(width / 2, btnY, 220, 32, 0x1a2e4e, 0.9)
                .setStrokeStyle(2, 0x4488cc).setInteractive({ useHandCursor: true }).setDepth(DEPTH + 5).setAlpha(0);
            const btnTx = this.add.text(width / 2, btnY, 'ADD TO COLLECTION →', {
                fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#88ccff',
            }).setOrigin(0.5).setDepth(DEPTH + 5).setAlpha(0);
            elements.push(btnBg, btnTx);
            this.tweens.add({ targets: [btnBg, btnTx], alpha: 1, duration: 350, delay: colDelay + 400 });

            btnBg.on('pointerover', () => btnBg.setFillStyle(0x2a3e6e));
            btnBg.on('pointerout', () => btnBg.setFillStyle(0x1a2e4e));
            btnBg.on('pointerdown', () => {
                btnBg.disableInteractive();
                HaggleManager.applyResult();
                this.cameras.main.flash(400, 201, 168, 76);
                this.time.delayedCall(500, () => this.endBattle());
            });

            // ── Ambient sparkles ──
            this.time.delayedCall(1000, () => {
                for (let i = 0; i < 10; i++) {
                    const sp = this.add.text(
                        Phaser.Math.Between(30, width - 30),
                        Phaser.Math.Between(30, height - 60),
                        i % 3 === 0 ? '✦' : '·',
                        { fontSize: `${Phaser.Math.Between(6, 14)}px`, color: '#c9a84c' }
                    ).setOrigin(0.5).setDepth(DEPTH + 1).setAlpha(0);
                    elements.push(sp);
                    this.tweens.add({
                        targets: sp,
                        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.15, 0.4) },
                        y: sp.y - Phaser.Math.Between(8, 25),
                        duration: Phaser.Math.Between(2000, 3500),
                        delay: i * 180,
                        yoyo: true, repeat: -1,
                    });
                }
            });

            this.tacticsContainer.add(elements);

        } else {
            // ═══════════════════════════════════════════
            // ═══ DEAL FAILED — ARTWORK SLIPS AWAY ═════
            // ═══════════════════════════════════════════
            WebAudioService.dealFail?.();

            const work = this.state.work || {};
            const askingPrice = this.state.askingPrice || 0;

            const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0505, 0.88).setDepth(DEPTH).setAlpha(0);
            elements.push(overlay);
            this.tweens.add({ targets: overlay, alpha: 1, duration: 400 });

            // Dealer walks away with rotation
            if (this.dealer) {
                this.tweens.add({
                    targets: this.dealer,
                    x: width + 300, alpha: 0, angle: -5,
                    duration: 1200, ease: 'Power3',
                });
            }

            // Red vignette pulse
            const vig = this.add.rectangle(width / 2, height / 2, width, height, 0xff0000, 0.06).setDepth(DEPTH + 1).setAlpha(0);
            elements.push(vig);
            this.tweens.add({ targets: vig, alpha: 0.06, duration: 400, yoyo: true, delay: 200 });

            // Header
            const failH = this.add.text(width / 2, height / 2 - 80, '💨  NO DEAL', {
                fontFamily: '"Press Start 2P"', fontSize: '22px', color: '#c94040',
                stroke: '#000', strokeThickness: 2,
            }).setOrigin(0.5).setDepth(DEPTH + 2).setAlpha(0);
            elements.push(failH);
            this.tweens.add({ targets: failH, alpha: 1, duration: 500, delay: 400 });

            // Title fades
            const failTitle = this.add.text(width / 2, height / 2 - 30, `"${work.title || 'The artwork'}"`, {
                fontFamily: '"Playfair Display"', fontSize: '20px', color: '#e8e4df', fontStyle: 'italic',
            }).setOrigin(0.5).setDepth(DEPTH + 2).setAlpha(0);
            elements.push(failTitle);
            this.tweens.add({ targets: failTitle, alpha: 0.6, duration: 500, delay: 600 });
            this.tweens.add({ targets: failTitle, alpha: 0.15, duration: 2000, delay: 1600, ease: 'Power2' });

            const failSub = this.add.text(width / 2, height / 2 + 10, 'slipped through your fingers.', {
                fontFamily: '"Playfair Display"', fontSize: '14px', color: '#7a7a8a',
            }).setOrigin(0.5).setDepth(DEPTH + 2).setAlpha(0);
            elements.push(failSub);
            this.tweens.add({ targets: failSub, alpha: 1, duration: 500, delay: 800 });

            // Missed details
            const missInfo = [
                `Asking: $${askingPrice.toLocaleString()}`,
                `Artist: ${work.artist || 'Unknown'}`,
                `Rounds: ${this.state.rounds?.length || this.state.round || '?'}`,
            ].join('  ·  ');
            const missText = this.add.text(width / 2, height / 2 + 46, missInfo, {
                fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#3a3a3a',
            }).setOrigin(0.5).setDepth(DEPTH + 2).setAlpha(0);
            elements.push(missText);
            this.tweens.add({ targets: missText, alpha: 1, duration: 350, delay: 1100 });

            // Return
            const bY = height / 2 + 90;
            const bBg = this.add.rectangle(width / 2, bY, 200, 34, 0x2e1a1a, 0.9)
                .setStrokeStyle(2, 0xc94040).setInteractive({ useHandCursor: true }).setDepth(DEPTH + 5).setAlpha(0);
            const bTx = this.add.text(width / 2, bY, 'RETURN →', {
                fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ff8888',
            }).setOrigin(0.5).setDepth(DEPTH + 5).setAlpha(0);
            elements.push(bBg, bTx);
            this.tweens.add({ targets: [bBg, bTx], alpha: 1, duration: 350, delay: 1400 });

            bBg.on('pointerover', () => bBg.setFillStyle(0x4e2a2a));
            bBg.on('pointerout', () => bBg.setFillStyle(0x2e1a1a));
            bBg.on('pointerdown', () => {
                HaggleManager.applyResult();
                this.endBattle();
            });

            this.tacticsContainer.add(elements);
        }
    },

    /** Check which achievements this deal earned */
    _checkDealAchievements(dealerKey, finalPrice, askingPrice, rounds) {
        const earned = [];
        const ach = HAGGLE_ACHIEVEMENTS;
        const totalDeals = (GameState.state?.totalWorksBought || 0) + (GameState.state?.totalWorksSold || 0);
        const savingsPct = askingPrice > 0 ? ((askingPrice - finalPrice) / askingPrice) * 100 : 0;

        // First deal ever
        if (totalDeals === 0 && ach.first_deal) earned.push(ach.first_deal);

        // Beat a shark
        if (dealerKey === 'shark' && finalPrice < askingPrice && ach.beat_shark) earned.push(ach.beat_shark);

        // Beat a speculator
        if (dealerKey === 'speculator' && ach.beat_speculator) earned.push(ach.beat_speculator);

        // Nervous breakdown — round 1 win
        if (dealerKey === 'nervous' && (rounds === 1 || rounds === '1') && ach.nervous_breakdown) earned.push(ach.nervous_breakdown);

        // Provenance kill — 25%+ discount
        if (savingsPct >= 25 && ach.provenance_kill) earned.push(ach.provenance_kill);

        // Hard bargainer — won without raise (check if no raise in rounds)
        const usedRaise = this.state.rounds?.some?.(r => r.tacticId === 'raiseOffer');
        if (!usedRaise && ach.no_raise_win) earned.push(ach.no_raise_win);

        // Cap at 3 achievements to avoid clutter
        return earned.slice(0, 3);
    },
};
