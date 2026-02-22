import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { TACTICS, BLUE_OPTIONS, DEALER_DIALOGUE, HAGGLE_TYPES } from '../data/haggle_config.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { WebAudioService } from '../managers/WebAudioService.js';

export class HaggleScene extends BaseScene {
    constructor() {
        super({ key: 'HaggleScene' });
    }

    init(data) {
        this.ui = data.ui;
        this.haggleInfo = data.haggleInfo || {};
        this.returnScene = data.returnScene || null;
        this.returnArgs = data.returnArgs || {};
        this.returnCallback = data.returnCallback || null;

        // Merge HaggleManager's live state with haggleInfo extras (bgKey, playerStats, etc.)
        const managerState = HaggleManager.getState();
        const infoState = this.haggleInfo.state || this.haggleInfo;
        this.state = {
            ...infoState,       // bgKey, playerStats, dealerSpriteKey, etc. from caller
            ...managerState,    // live haggle state from HaggleManager (overrides duplicates)
        };

        // Ensure playerStats are always available (for NERVE bar)
        if (!this.state.playerStats) {
            const s = window._artLifeState || {};
            this.state.playerStats = {
                reputation: s.reputation || 0, taste: s.taste || 0,
                audacity: s.audacity || 30, access: s.access || 0,
                intel: s.intel || 0, cash: s.cash || 0,
                suspicion: s.suspicion || 0, marketHeat: s.marketHeat || 0,
            };
        }
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

        // ── Opaque background (required because Phaser config has transparent: true) ──
        this.add.rectangle(width / 2, height / 2, width, height, 0x14141f).setDepth(-1);

        try {
            this._buildScene(width, height);
        } catch (err) {
            console.error('[HaggleScene] create() error:', err);
            window.ArtLife?.recordSceneError?.('HaggleScene', err);
            // Show error text on the opaque background so user sees something
            this.add.text(width / 2, height / 2 - 20, 'HAGGLE ERROR', {
                fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#c94040'
            }).setOrigin(0.5).setDepth(999);
            this.add.text(width / 2, height / 2 + 20, err.message || 'Unknown error', {
                fontFamily: 'monospace', fontSize: '12px', color: '#7a7a8a',
                wordWrap: { width: width - 80 }
            }).setOrigin(0.5).setDepth(999);
            const exitBtn = this.add.text(width / 2, height / 2 + 80, '[ CLICK TO EXIT ]', {
                fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c9a84c'
            }).setOrigin(0.5).setDepth(999).setInteractive({ useHandCursor: true });
            exitBtn.on('pointerdown', () => this.forceExit());
        }
    }

    /** Internal scene builder — separated so create()'s try/catch can catch errors */
    _buildScene(width, height) {
        this.cameras.main.setBackgroundColor('#000000');

        // Emit battle start event
        GameEventBus.emit(GameEvents.HAGGLE_START, {
            dealerType: this.state.dealerTypeKey,
            round: this.state.round,
        });

        // Build the battle scene behind the intro overlay
        this._buildBattleArena(width, height);

        // Play cinematic intro first, then reveal battle
        this._playBattleIntro(width, height, () => {
            // Reveal the battle UI
            this._revealBattleUI(width, height);
        });

        // ── ESC key force-exit (safety hatch) ──
        this.input.keyboard.on('keydown-ESC', this.forceExit, this);

        // Visible back button (top-right)
        const backBtn = this.add.text(width - 16, 12, '[ ESC: BACK ]', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#7a7a8a'
        }).setOrigin(1, 0).setDepth(102).setInteractive({ useHandCursor: true });
        backBtn.on('pointerover', () => backBtn.setColor('#c9a84c'));
        backBtn.on('pointerout', () => backBtn.setColor('#7a7a8a'));
        backBtn.on('pointerdown', () => this.forceExit());
    }

    // ════════════════════════════════════════════════════
    // Pre-Battle Cinematic Intro
    // ════════════════════════════════════════════════════

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
    }

    // ════════════════════════════════════════════════════
    // Battle Arena Setup (built behind intro overlay)
    // ════════════════════════════════════════════════════

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
    }

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

        this.gapText = this.add.text(width - 40, pPanelY + 27, '100%', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c9a84c'
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
    }

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
        const gapPercent = Math.min(1, Math.max(0, gapPercentRaw));
        const gapColor = gapPercent > 0.5 ? 0xc94040 : gapPercent > 0.1 ? 0xc9a84c : 0x3a8a5c;

        if (animate) {
            // Animate bars with tweened redraw
            const targetPatW = 150 * patPercent;
            const targetGapW = 230 * gapPercent;
            const pPanelY = this.scale.height - 250;

            // Use a dummy object to tween bar widths
            const barState = {
                patW: this._lastPatW ?? targetPatW,
                gapW: this._lastGapW ?? targetGapW,
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
                    this.gapBarFill.fillStyle(gapColor, 1);
                    this.gapBarFill.fillRect(this.scale.width - 275, pPanelY + 28, barState.gapW, 10);
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
            this.gapBarFill.fillStyle(gapColor, 1);
            const pPanelY = this.scale.height - 250;
            this.gapBarFill.fillRect(this.scale.width - 275, pPanelY + 28, 230 * gapPercent, 10);
            this._lastGapW = 230 * gapPercent;
        }

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
        this.speakerTab.setText('YOUR MOVE');

        const { width, height } = this.scale;
        const dlHeight = 150;
        const dlY = height - dlHeight - 40;

        // WalkAway comes from HaggleManager.getAvailableTactics() already — do NOT push again
        const tactics = HaggleManager.getAvailableTactics();

        // "Extend Hand" climax — when gap < 10% or patience < 2
        const currentState = HaggleManager.getState();
        const asking = currentState.askingPrice || 1;
        const gapPct = (currentState.gap / asking) * 100;
        if (gapPct < 10 || currentState.patience < 2) {
            this._renderExtendHand(width, height, dlY, dlHeight, currentState);
            return;
        }

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

            const displayLabel = (t.id !== 'walkAway') ? `Drop: ${t.label}` : t.label;
            const txt = this.add.text(x + 10, y + btnH / 2 - 12, displayLabel, {
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

    _renderExtendHand(width, height, dlY, dlHeight, currentState) {
        this.tacticsContainer.removeAll(true);
        this.tacticsContainer.setVisible(true);
        this.speakerTab.setText('═══ EXTEND HAND ═══');

        // Dim the screen
        const dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4).setDepth(50);
        this.tacticsContainer.add(dimOverlay);

        const btnW = width - 120;
        const btnH = dlHeight - 30;
        const btnX = width / 2;
        const btnY = dlY + dlHeight / 2;

        const bg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x1a2e1a, 0.95)
            .setStrokeStyle(2, 0x3a8a5c).setInteractive({ useHandCursor: true }).setDepth(51);

        const label = this.add.text(btnX, btnY - 14, '═══ EXTEND HAND ═══', {
            fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#c9a84c'
        }).setOrigin(0.5).setDepth(52);

        const desc = this.add.text(btnX, btnY + 14, 'Accept the current terms and close the deal.', {
            fontFamily: '"Playfair Display"', fontSize: '14px', color: '#8a8a9a'
        }).setOrigin(0.5).setDepth(52);

        this.tacticsContainer.add([bg, label, desc]);

        // Heartbeat pulse tween
        this.tweens.add({
            targets: bg,
            scaleX: 1.02, scaleY: 1.02,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        bg.on('pointerover', () => bg.setFillStyle(0x2a3e2a));
        bg.on('pointerout', () => bg.setFillStyle(0x1a2e1a));

        bg.on('pointerdown', () => {
            bg.disableInteractive();
            dimOverlay.destroy();

            // 3-second dramatic pause
            const pauseOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(60);
            const pauseText = this.add.text(width / 2, height / 2, '...', {
                fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#c9a84c'
            }).setOrigin(0.5).setDepth(61);

            this.tweens.add({
                targets: pauseText, alpha: 0.3, duration: 500, yoyo: true, repeat: 2,
                onComplete: () => {
                    pauseOverlay.destroy();
                    pauseText.destroy();
                    // Auto-resolve at current gap price
                    const result = HaggleManager.executeTactic('walkAway');
                    // Force deal at current price
                    const state = HaggleManager.getState();
                    state.result = 'deal';
                    state.finalPrice = (state.askingPrice || 0) - (state.gap || 0);
                    state.resolved = true;
                    this.state = state;
                    this.renderResult();
                }
            });
        });
    }

    /**
     * Play the player-side "attack lunge" — sprite moves toward dealer then snaps back.
     */
    playerLunge(onMidpoint) {
        if (!this.player) { onMidpoint?.(); return; }
        const origX = this.player.x;
        this.tweens.add({
            targets: this.player,
            x: origX + 40,
            duration: 120,
            ease: 'Power2',
            yoyo: true,
            onYoyo: () => onMidpoint?.(),
        });
    }

    /**
     * Flash "SUPER EFFECTIVE!" or "Not very effective..." text overlay.
     */
    showEffectivenessFlash(msg, color = '#c9a84c') {
        const { width, height } = this.scale;
        const txt = this.add.text(width / 2, height / 2 - 30, msg, {
            fontFamily: '"Press Start 2P"', fontSize: '14px', color, align: 'center',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(210).setAlpha(0);

        this.tweens.add({
            targets: txt,
            alpha: 1, y: height / 2 - 50,
            duration: 300, ease: 'Back.easeOut',
            hold: 600,
            onComplete: () => {
                this.tweens.add({ targets: txt, alpha: 0, y: height / 2 - 70, duration: 300, onComplete: () => txt.destroy() });
            }
        });
    }

    /**
     * Dealer hit reaction — shake, tint, knockback based on severity.
     */
    dealerHitReaction(success, isSuperEffective) {
        if (!this.dealer) return;
        const origX = this.dealer.x;

        if (success) {
            const intensity = isSuperEffective ? 0.02 : 0.01;
            const shakeCount = isSuperEffective ? 5 : 3;
            this.cameras.main.shake(200, intensity);

            // Knockback
            this.tweens.add({
                targets: this.dealer,
                x: origX + (isSuperEffective ? 25 : 12),
                duration: 60,
                yoyo: true,
                repeat: shakeCount,
                onComplete: () => { this.dealer.x = origX; }
            });

            // Flash white then tint red
            if (this.dealer.setTint) {
                this.dealer.setTint(0xffffff);
                this.time.delayedCall(100, () => {
                    this.dealer.setTint(isSuperEffective ? 0xff4444 : 0xff8888);
                    this.time.delayedCall(400, () => { try { this.dealer.clearTint(); } catch (e) { } });
                });
            }
        } else {
            // Dealer resists — smug bob up
            this.tweens.add({
                targets: this.dealer,
                y: this.dealer.y - 8,
                duration: 150,
                yoyo: true,
                ease: 'Sine.easeOut',
            });
        }
    }

    /**
     * Enhanced tactic animation — multi-step, type-specific visual effects.
     */
    playTacticAnimation(animType, onComplete) {
        const { width, height } = this.scale;
        const dx = this.dealer?.x ?? width - 180;
        const dy = this.dealer?.y ?? height / 2 - 60;
        const px = this.player?.x ?? 180;
        const py = this.player?.y ?? height - 200;

        if (animType === 'coin') {
            // FINANCIAL — raining coins with green screen tint
            const tint = this.add.rectangle(width / 2, height / 2, width, height, 0x22aa44, 0.15).setDepth(190);
            this.tweens.add({ targets: tint, alpha: 0, duration: 800, onComplete: () => tint.destroy() });

            // Multiple coins cascade
            const emojis = ['💰', '💵', '💎', '💰', '💵'];
            emojis.forEach((e, i) => {
                const coin = this.add.text(
                    dx + Phaser.Math.Between(-60, 60),
                    dy - 160 - i * 20,
                    e, { fontSize: '28px' }
                ).setOrigin(0.5).setDepth(195).setAlpha(0);

                this.tweens.add({
                    targets: coin,
                    alpha: 1, y: dy - 20,
                    duration: 400 + i * 80,
                    delay: i * 60,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        this.tweens.add({ targets: coin, alpha: 0, scale: 0.3, duration: 200, onComplete: () => coin.destroy() });
                    }
                });
            });

            this.playerLunge();
            this.time.delayedCall(700, onComplete);

        } else if (animType === 'shield') {
            // LOGICAL — expanding hex-shield with data flash
            this.playerLunge();

            // Shield rings expanding outward
            for (let i = 0; i < 3; i++) {
                const ring = this.add.circle(px, py - 60, 30 + i * 15, 0x4488cc, 0).setStrokeStyle(2, 0x4488cc).setDepth(195);
                this.tweens.add({
                    targets: ring,
                    radius: 80 + i * 20,
                    alpha: 0,
                    duration: 500,
                    delay: i * 100,
                    onComplete: () => ring.destroy(),
                });
                // Fade the stroke
                this.tweens.add({ targets: ring, strokeAlpha: 0, duration: 500, delay: i * 100 });
            }

            // Data flash text
            const dataText = this.add.text(px + 60, py - 80, '▓▒░ HOLD ░▒▓', {
                fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#4488cc',
            }).setDepth(196).setAlpha(0);
            this.tweens.add({
                targets: dataText, alpha: 1, duration: 150,
                hold: 300,
                onComplete: () => this.tweens.add({ targets: dataText, alpha: 0, duration: 200, onComplete: () => dataText.destroy() }),
            });

            this.time.delayedCall(600, onComplete);

        } else if (animType === 'slash') {
            // AGGRESSIVE — diagonal slash lines + red flash + heavy shake
            this.playerLunge(() => {
                // Red screen flash
                const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xff2200, 0.6).setDepth(200);
                this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

                this.cameras.main.shake(250, 0.025);

                // Slash lines across dealer
                const slashGraphics = this.add.graphics().setDepth(199);
                const slashLines = [
                    { x1: dx - 60, y1: dy - 80, x2: dx + 60, y2: dy + 20 },
                    { x1: dx + 60, y1: dy - 80, x2: dx - 60, y2: dy + 20 },
                ];
                slashLines.forEach((sl, i) => {
                    this.time.delayedCall(i * 80, () => {
                        slashGraphics.lineStyle(3, 0xffffff, 1);
                        slashGraphics.lineBetween(sl.x1, sl.y1, sl.x2, sl.y2);
                    });
                });
                this.tweens.add({
                    targets: slashGraphics, alpha: 0, duration: 400, delay: 200,
                    onComplete: () => slashGraphics.destroy(),
                });

                // Impact sparks
                for (let i = 0; i < 6; i++) {
                    const spark = this.add.text(
                        dx + Phaser.Math.Between(-40, 40),
                        dy - 30 + Phaser.Math.Between(-30, 30),
                        '✦', { fontSize: '16px', color: '#ffaa00' }
                    ).setOrigin(0.5).setDepth(201);
                    this.tweens.add({
                        targets: spark,
                        x: spark.x + Phaser.Math.Between(-50, 50),
                        y: spark.y + Phaser.Math.Between(-50, 50),
                        alpha: 0, scale: 0,
                        duration: 300 + i * 50,
                        onComplete: () => spark.destroy(),
                    });
                }
            });

            this.time.delayedCall(700, onComplete);

        } else if (animType === 'charm') {
            // EMOTIONAL — hearts/stars cascade from player to dealer, pink tint
            const tint = this.add.rectangle(width / 2, height / 2, width, height, 0xff88aa, 0.12).setDepth(190);
            this.tweens.add({ targets: tint, alpha: 0, duration: 1000, onComplete: () => tint.destroy() });

            this.playerLunge();

            const charms = ['💖', '✨', '💫', '💖', '✨'];
            charms.forEach((c, i) => {
                const charm = this.add.text(px + 40, py - 80, c, { fontSize: '24px' }).setOrigin(0.5).setDepth(195).setAlpha(0);
                this.tweens.add({
                    targets: charm,
                    x: dx + Phaser.Math.Between(-30, 30),
                    y: dy - 40 + Phaser.Math.Between(-20, 20),
                    alpha: { from: 0, to: 1 },
                    duration: 500 + i * 80,
                    delay: i * 100,
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                        this.tweens.add({ targets: charm, alpha: 0, scale: 1.5, duration: 200, onComplete: () => charm.destroy() });
                    }
                });
            });

            this.time.delayedCall(800, onComplete);

        } else if (animType === 'shadow') {
            // BLUFF — dramatic darkness, glowing eyes, reveal
            const darkness = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0).setDepth(190);
            this.tweens.add({ targets: darkness, alpha: 0.75, duration: 300 });

            // Mysterious eyes appear
            const eyeL = this.add.text(px + 20, py - 90, '👁', { fontSize: '20px' }).setOrigin(0.5).setDepth(195).setAlpha(0);
            const eyeR = this.add.text(px + 50, py - 90, '👁', { fontSize: '20px' }).setOrigin(0.5).setDepth(195).setAlpha(0);
            this.tweens.add({ targets: [eyeL, eyeR], alpha: 1, duration: 200, delay: 300 });

            // Question marks swirl around dealer
            this.time.delayedCall(500, () => {
                const marks = ['❓', '❓', '❓'];
                marks.forEach((m, i) => {
                    const angle = (i / marks.length) * Math.PI * 2;
                    const mark = this.add.text(dx, dy - 50, m, { fontSize: '18px' }).setOrigin(0.5).setDepth(195).setAlpha(0);
                    this.tweens.add({
                        targets: mark,
                        x: dx + Math.cos(angle) * 50,
                        y: dy - 50 + Math.sin(angle) * 30,
                        alpha: 1,
                        duration: 300,
                        delay: i * 80,
                        onComplete: () => {
                            this.tweens.add({ targets: mark, alpha: 0, duration: 300, delay: 200, onComplete: () => mark.destroy() });
                        }
                    });
                });
            });

            // Reveal — light burst
            this.time.delayedCall(900, () => {
                this.tweens.add({ targets: [darkness, eyeL, eyeR], alpha: 0, duration: 300, onComplete: () => { darkness.destroy(); eyeL.destroy(); eyeR.destroy(); } });
            });

            this.time.delayedCall(1200, onComplete);

        } else {
            // Fallback — simple flash
            const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.5).setDepth(200);
            this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
            this.time.delayedCall(400, onComplete);
        }
    }

    executeTactic(tacticId, label) {
        this.tacticsContainer.setVisible(false);
        this.speakerTab.setText('SYSTEM');
        WebAudioService.tactic();

        // Look up tactic definition for animType and type
        let animType = 'slash';
        let tacticType = null;
        if (TACTICS[tacticId]) {
            animType = TACTICS[tacticId].animType;
            tacticType = TACTICS[tacticId].type;
        } else {
            const blueOpt = BLUE_OPTIONS.find(o => o.id === tacticId);
            if (blueOpt) {
                animType = blueOpt.animType || 'charm';
                tacticType = blueOpt.type;
            }
        }

        // Play the multi-step animation, then resolve the tactic
        this.playTacticAnimation(animType, () => {
            const result = HaggleManager.executeTactic(tacticId);

            if (!result) {
                console.warn('[HaggleScene] executeTactic returned null for:', tacticId);
                this.renderTactics();
                return;
            }

            // Type effectiveness check
            const isSuperEffective = result.effectivenessMessage?.toLowerCase().includes('super effective');
            const isNotEffective = result.effectivenessMessage?.toLowerCase().includes('not very effective');

            // Show effectiveness flash + sound
            if (isSuperEffective) {
                this.showEffectivenessFlash('SUPER EFFECTIVE!', '#ffcc00');
                WebAudioService.superEffective();
            } else if (isNotEffective) {
                this.showEffectivenessFlash('Not very effective...', '#666688');
                WebAudioService.miss();
            } else if (result.success) {
                this.showEffectivenessFlash('Effective!', '#88cc88');
                WebAudioService.hit();
            } else {
                WebAudioService.miss();
            }

            // Dealer reaction
            this.dealerHitReaction(result.success, isSuperEffective);

            // Animate bars smoothly
            this.updateBars(true);

            // Use real dealer dialogue from haggle_config instead of generic text
            const dealerDialogue = result.dialogue ? result.dialogue.replace(/"/g, '') : (result.success ? 'Interesting...' : 'I don\'t think so.');
            const priceInfo = result.priceChange ? `\n> Price shifted by $${Math.abs(result.priceChange).toLocaleString()}` : '';

            let effectText = result.success ? '✦ Effective!' : '✗ No effect.';
            if (result.effectivenessMessage) {
                effectText = `✦ ${result.effectivenessMessage}`;
            }

            this.time.delayedCall(400, () => {
                this.playDialogue(`> ${effectText}${priceInfo}`, () => {
                    this.time.delayedCall(800, () => {
                        this.speakerTab.setText(this.state.dealerName?.toUpperCase() || 'DEALER');
                        if (result.dealReached || result.dealFailed) {
                            this.playDialogue(result.finalDialogue ? result.finalDialogue.replace(/"/g, '') : 'We\'re done here.', () => this.renderResult());
                        } else {
                            this.playDialogue(dealerDialogue, () => this.renderTactics());
                        }
                    });
                });
            });
        });
    }

    renderResult() {
        const live = HaggleManager.getState();
        if (live) Object.assign(this.state, live);
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
            WebAudioService.dealSuccess();

            // Full-screen dramatic overlay
            const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.92).setDepth(200);
            overlay.setAlpha(0);
            this.tweens.add({ targets: overlay, alpha: 1, duration: 600 });

            // Screen flash
            const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.9).setDepth(201);
            this.tweens.add({ targets: flash, alpha: 0, duration: 400, delay: 300 });
            this.cameras.main.shake(300, 0.02);

            // Art piece title
            const titleText = this.add.text(width / 2, height / 2 - 80, '🤝  DEAL CLOSED', {
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
            WebAudioService.dealFail();
            const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85).setDepth(200);
            overlay.setAlpha(0);
            this.tweens.add({ targets: overlay, alpha: 1, duration: 400 });

            // Dealer walks away — slide out
            if (this.dealer) {
                this.tweens.add({ targets: this.dealer, x: width + 200, alpha: 0, duration: 1000, ease: 'Power2' });
            }

            const failHeader = this.add.text(width / 2, height / 2 - 60, '💨  NO DEAL', {
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
            GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
            if (this.ui) {
                if (this.returnCallback) {
                    this.returnCallback(this.ui);
                } else {
                    this.ui.popScreen();
                }
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
                GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
                if (this.ui) {
                    if (this.returnCallback) {
                        this.returnCallback(this.ui);
                    } else {
                        const { dashboardScreen } = await import('../terminal/screens/dashboard.js');
                        this.ui.replaceScreen(dashboardScreen(this.ui));
                    }
                }
                this.scene.stop();
            }
        });
    }
}
