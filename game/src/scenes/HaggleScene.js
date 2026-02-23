/**
 * HaggleScene.js — Pokemon-style battle UI for art deal negotiation.
 *
 * Orchestrator module: scene lifecycle, state management, and routing.
 * Visual rendering, menu system, and dialogue/animation are split into
 * mixin modules under ./haggle/:
 *   - HaggleRenderer.js — scene setup, sprites, bars, result screens
 *   - HaggleTactics.js — menu system, tactic execution, dialogue choices
 *   - HaggleDialogue.js — typewriter, combat animations, visual effects
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
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { WebAudioService } from '../managers/WebAudioService.js';
import { DEALER_DIALOGUE } from '../data/haggle_config.js';

// Mixin modules — methods are assigned to HaggleScene.prototype below
import { HaggleRendererMixin } from './haggle/HaggleRenderer.js';
import { HaggleTacticsMixin } from './haggle/HaggleTactics.js';
import { HaggleDialogueMixin } from './haggle/HaggleDialogue.js';

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
    // Routing — entry points into menu/result flow
    // ════════════════════════════════════════════════════

    renderTactics() {
        if (this.state.resolved) {
            this.renderResult();
            return;
        }
        this._renderMainMenu();
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

    // ════════════════════════════════════════════════════
    // Exit / Cleanup
    // ════════════════════════════════════════════════════

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

// ── Apply mixin modules to prototype ──
// Each mixin exports an object of methods that become HaggleScene instance methods.
// This pattern keeps `this` references intact while splitting code across files.
Object.assign(HaggleScene.prototype, HaggleRendererMixin);
Object.assign(HaggleScene.prototype, HaggleTacticsMixin);
Object.assign(HaggleScene.prototype, HaggleDialogueMixin);
