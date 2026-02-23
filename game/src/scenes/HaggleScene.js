/**
 * HaggleScene.js — Pokemon-style battle UI for art deal negotiation.
 *
 * Renders a full-screen Phaser scene with dealer portrait, price bars,
 * tactic menu, and animated dialogue. The player picks tactics (CHARM,
 * LOWBALL, BLUFF, WALK AWAY, etc.) and the dealer responds based on
 * their personality type (shark, patron, speculator).
 *
 * Data flow:
 *   HaggleManager.start(haggleInfo) → sets up state (prices, NPC, mode)
 *   HaggleScene.init(data) → merges HaggleManager.getState() with scene data
 *   Player selects tactic → HaggleManager.applyTactic() → state update → re-render
 *   Deal resolves → HaggleManager.resolve() → return to caller scene
 *
 * Key imports:
 *   HaggleManager — stateful negotiation engine (current offer, rounds, tactics)
 *   haggle_config.js — TACTICS, BLUE_OPTIONS, DEALER_DIALOGUE, TACTIC_DIALOGUE_CHOICES
 *
 * Modes: 'buy' (player acquiring) or 'sell' (player selling)
 * AP cost: 2 actions per haggle attempt
 *
 * Returns to caller via:
 *   - this.returnScene (e.g. 'LocationScene') with this.returnArgs
 *   - this.returnCallback (function) for Bloomberg terminal haggles
 *   - Falls back to UI_ROUTE 'TERMINAL' if neither set
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { MarketManager } from '../managers/MarketManager.js';
import { GameState } from '../managers/GameState.js';
import { TACTICS, BLUE_OPTIONS, DEALER_DIALOGUE, HAGGLE_TYPES, TACTIC_DIALOGUE_CHOICES, DIALOGUE_EFFECTIVENESS, BATTLE_MENU_CATEGORIES, HAGGLE_ACHIEVEMENTS } from '../data/haggle_config.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { WebAudioService } from '../managers/WebAudioService.js';
import { clamp } from '../utils/math.js';

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
            this.load.image(this.state.bgKey, `backgrounds/${this.state.bgKey}`);
        }
        if (this.state.dealerSpriteKey && !this.textures.exists(this.state.dealerSpriteKey)) {
            this.load.image(this.state.dealerSpriteKey, `sprites/${this.state.dealerSpriteKey}`);
        }
        if (this.state.playerSpriteKey && !this.textures.exists(this.state.playerSpriteKey)) {
            this.load.image(this.state.playerSpriteKey, `sprites/${this.state.playerSpriteKey}`);
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
        this.cameras.main.fadeIn(300, 0, 0, 0);

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
    }

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
    }

    playDialogue(text, onComplete) {
        this.tacticsContainer.setVisible(false);
        this.menuBg?.setVisible(false);
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

    // ════════════════════════════════════════════════════
    // POKEMON-STYLE MENU SYSTEM
    // Stage 1: Main Menu (TACTICS / POWERS / INFO / DEAL)
    // Stage 2: Tactic Selection (within chosen category)
    // Stage 3: Dialogue Choice (HOW to execute the tactic)
    // ════════════════════════════════════════════════════

    renderTactics() {
        if (this.state.resolved) {
            this.renderResult();
            return;
        }
        this._renderMainMenu();
    }

    /** Stage 1: 2×2 category menu (like Pokemon's FIGHT/BAG/POKEMON/RUN) */
    _renderMainMenu() {
        this.tacticsContainer.removeAll(true);
        this.tacticsContainer.setVisible(true);
        this.menuBg?.setVisible(true);
        this.speakerTab.setText('YOUR MOVE');
        this.dialogueTextContent.setText('What will you do?');

        const { width, height } = this.scale;
        const { dlHeight, dlY, menuW } = this._uiLayout;

        // Check for extend hand / deal close conditions
        const currentState = HaggleManager.getState();
        const asking = currentState.askingPrice || 1;
        const gapPct = (currentState.gap / asking) * 100;

        // 2×2 grid in the right-side menu area
        const menuX = width - menuW - 20;
        const menuY = dlY + 8;
        const btnW = (menuW - 24) / 2;
        const btnH = (dlHeight - 28) / 2;
        const gap = 6;

        const categories = [
            { id: 'tactics', label: '⚔️ TACTICS', color: 0xc9a84c, textColor: '#c9a84c' },
            { id: 'powers', label: '⭐ POWERS', color: 0x60a5fa, textColor: '#60a5fa' },
            { id: 'info', label: '📊 INFO', color: 0x888888, textColor: '#888888' },
            { id: gapPct < 10 ? 'extend' : 'deal', label: gapPct < 10 ? '🤝 DEAL!' : '🤝 DEAL', color: gapPct < 10 ? 0x4ade80 : 0x3a8a5c, textColor: gapPct < 10 ? '#4ade80' : '#3a8a5c' },
        ];

        categories.forEach((cat, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = menuX + 8 + col * (btnW + gap) + btnW / 2;
            const y = menuY + 4 + row * (btnH + gap) + btnH / 2;

            const bg = this.add.rectangle(x, y, btnW, btnH, 0x1a1a2e)
                .setStrokeStyle(2, cat.color).setInteractive({ useHandCursor: true });

            const txt = this.add.text(x, y, cat.label, {
                fontFamily: '"Press Start 2P"', fontSize: '9px', color: cat.textColor, align: 'center',
            }).setOrigin(0.5);

            bg.on('pointerover', () => { bg.setFillStyle(0x2a2a3e); this.dialogueTextContent.setText(this._getCategoryHint(cat.id)); });
            bg.on('pointerout', () => { bg.setFillStyle(0x1a1a2e); });

            bg.on('pointerdown', () => {
                WebAudioService.tactic?.();
                if (cat.id === 'tactics') this._renderTacticList(false);
                else if (cat.id === 'powers') this._renderTacticList(true);
                else if (cat.id === 'info') this._renderInfoScreen();
                else if (cat.id === 'deal') this._renderDealMenu();
                else if (cat.id === 'extend') this._renderExtendHand(width, height, dlY, dlHeight, currentState);
            });

            // Pulse the DEAL button if gap < 10%
            if (cat.id === 'extend') {
                this.tweens.add({ targets: bg, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' });
            }

            this.tacticsContainer.add([bg, txt]);
        });
    }

    _getCategoryHint(id) {
        switch (id) {
            case 'tactics': return 'Choose a negotiation tactic.';
            case 'powers': return 'Use a special ability (stat-gated).';
            case 'info': return 'View the dealer\'s profile and round details.';
            case 'deal': return 'Close the deal or walk away.';
            case 'extend': return 'The gap is close! Seal the deal!';
            default: return '';
        }
    }

    /** Stage 2: List of available tactics (scrollable, with BACK button) */
    _renderTacticList(powersOnly = false) {
        this.tacticsContainer.removeAll(true);
        const { width, height } = this.scale;
        const { dlHeight, dlY } = this._uiLayout;

        const allTactics = HaggleManager.getAvailableTactics();
        const filtered = powersOnly
            ? allTactics.filter(t => t.isBlueOption)
            : allTactics.filter(t => !t.isBlueOption && t.id !== 'walkAway');

        this.speakerTab.setText(powersOnly ? '⭐ POWERS' : '⚔️ TACTICS');
        this.dialogueTextContent.setText(powersOnly ? 'Choose a special power.' : 'Choose your tactic.');

        // Scrollable list on the left side of dialogue box
        const listX = 40;
        const listW = width - 320;
        const itemH = 36;
        const maxVisible = Math.floor((dlHeight - 10) / itemH);

        const page = this._tacticPage || 0;
        const visibleTactics = filtered.slice(page * maxVisible, (page + 1) * maxVisible);
        const totalPages = Math.ceil(filtered.length / maxVisible);

        visibleTactics.forEach((t, i) => {
            const y = dlY + 8 + i * itemH;
            const isLocked = t.locked;

            // Type colors
            let borderColor = 0x3a3a4e;
            let typeIcon = '';
            if (t.type) {
                switch (t.type) {
                    case HAGGLE_TYPES.EMOTIONAL: borderColor = 0xff88aa; typeIcon = '❤️'; break;
                    case HAGGLE_TYPES.LOGICAL: borderColor = 0x88bbff; typeIcon = '🧠'; break;
                    case HAGGLE_TYPES.AGGRESSIVE: borderColor = 0xff6666; typeIcon = '🔥'; break;
                    case HAGGLE_TYPES.FINANCIAL: borderColor = 0x88cc88; typeIcon = '💰'; break;
                }
            }

            const bg = this.add.rectangle(listX + listW / 2, y + itemH / 2, listW, itemH - 4, isLocked ? 0x0a0a0f : 0x1a1a2e)
                .setStrokeStyle(1.5, isLocked ? 0x222222 : borderColor);

            if (!isLocked) {
                bg.setInteractive({ useHandCursor: true });
                bg.on('pointerover', () => {
                    bg.setFillStyle(0x2a2a3e);
                    this.dialogueTextContent.setText(t.description || '');
                });
                bg.on('pointerout', () => bg.setFillStyle(0x1a1a2e));
                bg.on('pointerdown', () => this._renderDialogueChoices(t));
            }

            const label = this.add.text(listX + 10, y + itemH / 2, `${typeIcon} ${t.label}`, {
                fontFamily: '"Press Start 2P"', fontSize: '9px',
                color: isLocked ? '#333' : '#e8e4df',
            }).setOrigin(0, 0.5);

            this.tacticsContainer.add([bg, label]);

            if (isLocked) {
                const lock = this.add.text(listX + listW - 10, y + itemH / 2, '🔒', {
                    fontSize: '12px'
                }).setOrigin(1, 0.5);
                this.tacticsContainer.add(lock);
            }

            // Success rate badge (right side)
            if (!isLocked && t.baseSuccess) {
                const pct = Math.round(t.baseSuccess * 100);
                const pctColor = pct >= 60 ? '#4ade80' : pct >= 40 ? '#c9a84c' : '#f87171';
                const badge = this.add.text(listX + listW - 10, y + itemH / 2, `${pct}%`, {
                    fontFamily: '"Press Start 2P"', fontSize: '8px', color: pctColor,
                }).setOrigin(1, 0.5);
                this.tacticsContainer.add(badge);
            }
        });

        // Page nav (if needed)
        if (totalPages > 1) {
            const navY = dlY + dlHeight - 16;
            if (page > 0) {
                const prev = this.add.text(listX + 10, navY, '◄ PREV', {
                    fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#888',
                }).setInteractive({ useHandCursor: true });
                prev.on('pointerdown', () => { this._tacticPage = page - 1; this._renderTacticList(powersOnly); });
                this.tacticsContainer.add(prev);
            }
            if (page < totalPages - 1) {
                const next = this.add.text(listX + listW - 10, navY, 'NEXT ►', {
                    fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#888',
                }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
                next.on('pointerdown', () => { this._tacticPage = page + 1; this._renderTacticList(powersOnly); });
                this.tacticsContainer.add(next);
            }
            const pageText = this.add.text(listX + listW / 2, navY, `${page + 1}/${totalPages}`, {
                fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#555',
            }).setOrigin(0.5, 0);
            this.tacticsContainer.add(pageText);
        }

        // BACK button (right side)
        this._addBackButton(() => this._renderMainMenu());
    }

    /** Stage 3: Dialogue choice — HOW to execute the tactic */
    _renderDialogueChoices(tactic) {
        this.tacticsContainer.removeAll(true);
        const { width, height } = this.scale;
        const { dlHeight, dlY } = this._uiLayout;

        const choices = TACTIC_DIALOGUE_CHOICES[tactic.id];

        // If no dialogue choices for this tactic, go straight to execute
        if (!choices || choices.length === 0) {
            this.executeTactic(tactic.id, tactic.label, null);
            return;
        }

        this.speakerTab.setText('💬 CHOOSE YOUR WORDS');
        this.dialogueTextContent.setText(`${tactic.label} — Pick your approach:`);

        const listX = 40;
        const listW = width - 120;
        const itemH = Math.min(50, (dlHeight - 20) / choices.length);

        choices.forEach((choice, i) => {
            const y = dlY + 10 + i * itemH;

            // Calculate effectiveness hint for current dealer
            const dealerKey = this.state.dealerTypeKey || 'patron';
            const eff = choice.effectiveness?.[dealerKey] || 'neutral';
            let effColor = 0x3a3a4e;
            let effIcon = '';
            let effLabel = '';
            if (eff === 'good') { effColor = 0x2e4e2e; effIcon = '✦'; effLabel = 'STRONG'; }
            else if (eff === 'bad') { effColor = 0x4e2e2e; effIcon = '✗'; effLabel = 'WEAK'; }
            else { effIcon = '·'; effLabel = ''; }

            const bg = this.add.rectangle(listX + listW / 2, y + itemH / 2, listW, itemH - 4, 0x1a1a2e)
                .setStrokeStyle(1.5, effColor === 0x3a3a4e ? 0x3a3a4e : effColor)
                .setInteractive({ useHandCursor: true });

            // Dialogue line
            const lineTxt = this.add.text(listX + 14, y + itemH / 2 - 6, choice.line, {
                fontFamily: '"Playfair Display"', fontSize: '14px', color: '#e8e4df', fontStyle: 'italic',
                wordWrap: { width: listW - 100 },
            }).setOrigin(0, 0.5);

            // Tone tag
            const toneTxt = this.add.text(listX + 14, y + itemH / 2 + 10, `[${choice.tone}]`, {
                fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#555',
            }).setOrigin(0, 0.5);

            // Effectiveness hint (subtle — only shows after high intel?)
            // For now, always show a subtle hint via border color
            let effBadge = null;
            if (effLabel) {
                effBadge = this.add.text(listX + listW - 14, y + itemH / 2, `${effIcon} ${effLabel}`, {
                    fontFamily: '"Press Start 2P"', fontSize: '7px',
                    color: eff === 'good' ? '#4ade80' : '#f87171',
                }).setOrigin(1, 0.5).setAlpha(0.7);
            }

            bg.on('pointerover', () => {
                bg.setFillStyle(eff === 'good' ? 0x1e3e1e : eff === 'bad' ? 0x3e1e1e : 0x2a2a3e);
            });
            bg.on('pointerout', () => bg.setFillStyle(0x1a1a2e));

            bg.on('pointerdown', () => {
                // Player selected their words — execute with this dialogue choice
                this._selectedDialogue = choice;
                this.executeTactic(tactic.id, tactic.label, choice);
            });

            const elements = [bg, lineTxt, toneTxt];
            if (effBadge) elements.push(effBadge);
            this.tacticsContainer.add(elements);
        });

        // BACK button
        this._addBackButton(() => {
            this._tacticPage = 0;
            this._renderTacticList(tactic.isBlueOption || false);
        });
    }

    /** INFO screen — shows dealer profile, round stats, gap analysis */
    _renderInfoScreen() {
        this.tacticsContainer.removeAll(true);
        const { width } = this.scale;
        const { dlHeight, dlY } = this._uiLayout;
        const state = HaggleManager.getState();

        this.speakerTab.setText('📊 INTEL');
        this.dialogueTextContent.setText('');

        const infoX = 40;
        const col2X = width / 2;

        // Left column: Dealer info
        const lines = [
            { label: 'DEALER', value: state.dealerName || 'Unknown', color: '#c9a84c' },
            { label: 'TYPE', value: (state.dealerType?.name || state.dealerTypeKey || '?').toUpperCase(), color: '#888' },
            { label: 'PATIENCE', value: `${state.patience} / ${state.maxPatience || '?'}`, color: state.patience <= 2 ? '#f87171' : '#4ade80' },
            { label: 'ROUND', value: `${state.round} / ${state.maxRounds}`, color: '#888' },
        ];

        lines.forEach((l, i) => {
            const y = dlY + 14 + i * 22;
            this.tacticsContainer.add(
                this.add.text(infoX, y, `${l.label}:`, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#555' })
            );
            this.tacticsContainer.add(
                this.add.text(infoX + 100, y, l.value, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: l.color })
            );
        });

        // Right column: Price info
        const asking = state.askingPrice || 0;
        const gap = state.gap || 0;
        const offer = asking - gap;
        const gapPct = Math.round((gap / (asking || 1)) * 100);

        const priceLines = [
            { label: 'ASKING', value: `$${asking.toLocaleString()}`, color: '#f87171' },
            { label: 'YOUR OFFER', value: `$${offer.toLocaleString()}`, color: '#4ade80' },
            { label: 'GAP', value: `$${gap.toLocaleString()} (${gapPct}%)`, color: '#c9a84c' },
            { label: 'ARTWORK', value: (state.work?.title || 'Unknown').substring(0, 25), color: '#888' },
        ];

        priceLines.forEach((l, i) => {
            const y = dlY + 14 + i * 22;
            this.tacticsContainer.add(
                this.add.text(col2X, y, `${l.label}:`, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#555' })
            );
            this.tacticsContainer.add(
                this.add.text(col2X + 110, y, l.value, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: l.color })
            );
        });

        // Type effectiveness hint
        const dealerStyle = state.dealerType?.style;
        if (dealerStyle) {
            const hint = this.add.text(infoX, dlY + dlHeight - 22, `Dealer style: ${dealerStyle.toUpperCase()} — choose your approach wisely.`, {
                fontFamily: '"Playfair Display"', fontSize: '12px', color: '#555', fontStyle: 'italic',
            });
            this.tacticsContainer.add(hint);
        }

        this._addBackButton(() => this._renderMainMenu());
    }

    /** DEAL menu — Walk Away or Extend Hand */
    _renderDealMenu() {
        this.tacticsContainer.removeAll(true);
        const { width } = this.scale;
        const { dlHeight, dlY } = this._uiLayout;
        const currentState = HaggleManager.getState();
        const asking = currentState.askingPrice || 1;
        const gapPct = (currentState.gap / asking) * 100;

        this.speakerTab.setText('🤝 DEAL');
        this.dialogueTextContent.setText(`Gap: ${Math.round(gapPct)}% — $${currentState.gap?.toLocaleString() || '?'} apart.`);

        const centerX = width / 2;
        const btnW = 240;
        const btnH = 44;

        // Walk Away
        const walkY = dlY + 30;
        const walkBg = this.add.rectangle(centerX, walkY + btnH / 2, btnW, btnH, 0x2e1a1a)
            .setStrokeStyle(2, 0xc94040).setInteractive({ useHandCursor: true });
        const walkTxt = this.add.text(centerX, walkY + btnH / 2, '💨 WALK AWAY', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#f87171',
        }).setOrigin(0.5);
        walkBg.on('pointerover', () => walkBg.setFillStyle(0x4e2a2a));
        walkBg.on('pointerout', () => walkBg.setFillStyle(0x2e1a1a));
        walkBg.on('pointerdown', () => {
            // Check for dialogue choices on walkAway
            const walkTactic = { id: 'walkAway', label: '💨 Walk Away', isBlueOption: false };
            this._renderDialogueChoices(walkTactic);
        });

        // Extend Hand (only if gap < 25%)
        const elements = [walkBg, walkTxt];
        if (gapPct < 25) {
            const extendY = dlY + 30 + btnH + 10;
            const extendBg = this.add.rectangle(centerX, extendY + btnH / 2, btnW, btnH, 0x1a2e1a)
                .setStrokeStyle(2, 0x3a8a5c).setInteractive({ useHandCursor: true });
            const extendTxt = this.add.text(centerX, extendY + btnH / 2, '🤝 EXTEND HAND', {
                fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#4ade80',
            }).setOrigin(0.5);
            extendBg.on('pointerover', () => extendBg.setFillStyle(0x2a3e2a));
            extendBg.on('pointerout', () => extendBg.setFillStyle(0x1a2e1a));
            extendBg.on('pointerdown', () => this._renderExtendHand(width, this.scale.height, dlY, dlHeight, currentState));

            if (gapPct < 10) {
                this.tweens.add({ targets: extendBg, scaleX: 1.02, scaleY: 1.02, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
            }
            elements.push(extendBg, extendTxt);
        }

        this.tacticsContainer.add(elements);
        this._addBackButton(() => this._renderMainMenu());
    }

    /** Reusable BACK button in bottom-right of menu */
    _addBackButton(onBack) {
        const { width } = this.scale;
        const { dlHeight, dlY, menuW } = this._uiLayout;

        const btnX = width - 60;
        const btnY = dlY + dlHeight - 18;

        const backBg = this.add.rectangle(btnX, btnY, 80, 22, 0x1a1a2e)
            .setStrokeStyle(1, 0x3a3a4e).setInteractive({ useHandCursor: true });
        const backTxt = this.add.text(btnX, btnY, '◄ BACK', {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#888',
        }).setOrigin(0.5);

        backBg.on('pointerover', () => { backBg.setFillStyle(0x2a2a3e); backTxt.setColor('#e8e4df'); });
        backBg.on('pointerout', () => { backBg.setFillStyle(0x1a1a2e); backTxt.setColor('#888'); });
        backBg.on('pointerdown', () => { this._tacticPage = 0; onBack(); });

        this.tacticsContainer.add([backBg, backTxt]);
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

    executeTactic(tacticId, label, dialogueChoice = null) {
        this.tacticsContainer.setVisible(false);
        this.menuBg?.setVisible(false);
        this.speakerTab.setText('SYSTEM');
        WebAudioService.tactic?.();

        // ── Dialogue cutscene moment ──
        // If a dialogue choice was selected, show the player's line first
        const showPlayerLine = dialogueChoice?.line;

        const proceedWithTactic = () => {
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

                // Apply dialogue choice effectiveness modifier
                if (dialogueChoice) {
                    const dealerKey = this.state.dealerTypeKey || 'patron';
                    const eff = dialogueChoice.effectiveness?.[dealerKey] || 'neutral';
                    const mod = DIALOGUE_EFFECTIVENESS[eff] || 0;

                    if (mod !== 0) {
                        // Re-roll success with modifier applied
                        const baseRoll = result.success;
                        const adjustedChance = (result.successChance || 0.5) + mod;
                        const newRoll = Math.random() < adjustedChance;

                        // Override result if dialogue choice changed the outcome
                        if (newRoll !== baseRoll) {
                            result.success = newRoll;
                            if (eff === 'good' && newRoll) {
                                result.effectivenessMessage = 'Your words struck a chord! SUPER EFFECTIVE!';
                            } else if (eff === 'bad' && !newRoll) {
                                result.effectivenessMessage = 'Wrong approach... not very effective.';
                            }
                        } else if (eff === 'good' && newRoll) {
                            result.effectivenessMessage = 'Great choice of words! Effective!';
                        }
                    }
                }

                // Type effectiveness check
                const isSuperEffective = result.effectivenessMessage?.toLowerCase().includes('super effective');
                const isNotEffective = result.effectivenessMessage?.toLowerCase().includes('not very effective');

                // Show effectiveness flash + sound
                if (isSuperEffective) {
                    this.showEffectivenessFlash('SUPER EFFECTIVE!', '#ffcc00');
                    WebAudioService.superEffective?.();
                } else if (isNotEffective) {
                    this.showEffectivenessFlash('Not very effective...', '#666688');
                    WebAudioService.miss?.();
                } else if (result.success) {
                    this.showEffectivenessFlash('Effective!', '#88cc88');
                    WebAudioService.hit?.();
                } else {
                    WebAudioService.miss?.();
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
        };

        // ── Cutscene: show player's chosen dialogue line first ──
        if (showPlayerLine) {
            this.speakerTab.setText('YOU');
            this.playDialogue(showPlayerLine, () => {
                // Brief dramatic pause before the tactic resolves
                this.time.delayedCall(300, proceedWithTactic);
            });
        } else {
            proceedWithTactic();
        }
    }

    renderResult() {
        const live = HaggleManager.getState();
        if (live) Object.assign(this.state, live);

        const { width, height } = this.scale;
        const isDeal = this.state.result === 'deal';
        const dealerKey = this.state.dealerTypeKey || 'patron';

        // ── Phase 0: Dealer speaks closing words over the battle scene ──
        // The battle arena is still visible — dealer delivers their parting line
        const closingPool = isDeal ? DEALER_DIALOGUE.onDeal : DEALER_DIALOGUE.onFail;
        const closingLines = closingPool?.[dealerKey] || closingPool?.patron || ['"Until next time."'];
        const closingLine = closingLines[Math.floor(Math.random() * closingLines.length)].replace(/"/g, '');

        this.tacticsContainer.removeAll(true);
        this.tacticsContainer.setVisible(false);
        this.menuBg?.setVisible(false);

        // Show dealer's closing words in the dialogue box (still over battle scene)
        this.dialogueBg.setAlpha(1);
        this.speakerTab.setAlpha(1).setText(this.state.dealerName?.toUpperCase() || 'DEALER');
        this.dialogueTextContent.setAlpha(1);

        this.playDialogue(closingLine, () => {
            // Brief dramatic pause, then transition to result screen
            this.time.delayedCall(800, () => {
                this._showResultScreen(isDeal);
            });
        });
    }

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
    }

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
                        // Dynamic import via barrel to stay consistent with other lazy-loaders
                        const { dashboardScreen } = await import('../terminal/screens/index.js');
                        this.ui.replaceScreen(dashboardScreen(this.ui));
                    }
                }
                this.scene.stop();
            }
        });
    }
}
