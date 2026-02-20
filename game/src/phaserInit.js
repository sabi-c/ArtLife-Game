/**
 * ArtLife — Phaser + Terminal Bridge
 *
 * Initialises the Phaser engine and bridges it to the DOM TerminalUI.
 * Called once from App.jsx via createPhaserGame().
 */

// ─── All imports at the top ───────────────────────────────────────────────────
import Phaser from 'phaser';
import { GridEngine } from 'grid-engine';

// Scenes
import { TitleScene } from './scenes/TitleScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { CharacterSelectScene } from './scenes/CharacterSelectScene.js';
import { HaggleScene } from './scenes/HaggleScene.js';
import { LocationScene } from './scenes/LocationScene.js';
import { DialogueScene } from './scenes/DialogueScene.js';
import { MacDialogueScene } from './scenes/MacDialogueScene.js';
import { OverworldScene } from './scenes/OverworldScene.js';
import { CityScene } from './scenes/CityScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { EndScene } from './scenes/EndScene.js';
import { FastTravelScene } from './scenes/FastTravelScene.js';

// Managers & stores
import { TerminalUI } from './terminal/TerminalUI.js';
import { dashboardScreen } from './terminal/screens.js';
import { GameState } from './managers/GameState.js';
import { MarketManager } from './managers/MarketManager.js';
import { useUIStore } from './stores/uiStore.js';
import { GameEventBus, GameEvents } from './managers/GameEventBus.js';

import './style.css';

// ──────────────────────────────────────────────────────────────────────────────
// ArtLife — Global debug/error namespace (available before Phaser boots)
// ──────────────────────────────────────────────────────────────────────────────
window.ArtLife = {
    _errors: [],
    _missingAssets: [],
    _sceneErrors: [],

    recordError(context, err) {
        const entry = { t: Date.now(), context, msg: err?.message || String(err), stack: err?.stack };
        this._errors.push(entry);
        console.error(`[ArtLife:${context}]`, err);
    },

    recordMissingAsset(key, url) {
        if (!this._missingAssets.find(a => a.key === key)) {
            this._missingAssets.push({ key, url, t: Date.now() });
        }
    },

    recordSceneError(sceneKey, err) {
        this._sceneErrors.push({ sceneKey, msg: err?.message || String(err), t: Date.now() });
        console.error(`[Scene:${sceneKey}]`, err);
    },

    report() {
        return {
            errors: this._errors,
            missingAssets: this._missingAssets,
            sceneErrors: this._sceneErrors,
        };
    },

    clearErrors() {
        this._errors = [];
        this._missingAssets = [];
        this._sceneErrors = [];
    },
};

// Global JS error handler — catches anything that escapes scene try/catch
window.addEventListener('error', (e) => {
    window.ArtLife.recordError('window', e.error || new Error(e.message));
});
window.addEventListener('unhandledrejection', (e) => {
    window.ArtLife.recordError('promise', e.reason);
});

// ─── Terminal UI ───────────────────────────────────────────────────────────────
const container = document.getElementById('terminal');
const ui = new TerminalUI(container);

// Start with terminal hidden — TitleScene handles the intro
if (container) container.style.display = 'none';

// ──────────────────────────────────────────────────────────────────────────────
// BootScene — Preloads shared assets, then launches TitleScene
// ──────────────────────────────────────────────────────────────────────────────
class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    preload() {
        // ── Asset-load error handler: substitute a 1×1 placeholder so the game
        //    never crashes on a missing PNG — just shows a blank/magenta square.
        this.load.on('loaderror', (file) => {
            console.warn(`[BootScene] Asset failed to load: ${file.key} (${file.url}). Using placeholder.`);
            ArtLife.recordMissingAsset(file.key, file.url);
            // Inject a 1×1 magenta pixel as a named texture so the key still resolves
            if (!this.textures.exists(file.key)) {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 1;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(0, 0, 1, 1);
                this.textures.addCanvas(file.key, canvas);
            }
        });

        // ── Category event backgrounds ──
        const categories = ['gallery', 'market', 'social', 'drama', 'personal', 'fair', 'opportunity'];
        categories.forEach((cat) => {
            this.load.image(`bg_${cat}`, `backgrounds/bg_${cat}.png`);
        });

        // ── Haggle Battle — dealer sprites ──
        this.load.image('dealer_shark',      'sprites/dealer_shark.png');
        this.load.image('dealer_patron',     'sprites/dealer_patron.png');
        this.load.image('dealer_calculator', 'sprites/dealer_calculator.png');
        this.load.image('dealer_nervous',    'sprites/dealer_nervous.png');
        this.load.image('dealer_collector',  'sprites/dealer_collector.png');
        this.load.image('dealer_hustler',    'sprites/dealer_hustler.png');
        this.load.image('dealer_artist',     'sprites/dealer_artist.png');
        this.load.image('dealer_rival',      'sprites/dealer_rival.png');
        this.load.image('player_back',       'sprites/player_back.png');

        // ── Overworld tilesets ──
        this.load.spritesheet('tiles_urban', 'assets/tilesets/kenney_rpg_urban_pack/Tilemap/tilemap_packed.png', {
            frameWidth: 16, frameHeight: 16, margin: 0, spacing: 1
        });
        this.load.spritesheet('tiles_indoor', 'assets/tilesets/kenney_roguelike_indoors/Tilesheets/roguelikeIndoor_transparent.png', {
            frameWidth: 16, frameHeight: 16, margin: 0, spacing: 1
        });

        // ── Player walk spritesheet ──
        this.load.spritesheet('player_walk', 'sprites/player_walk.png', {
            frameWidth: 16, frameHeight: 16
        });
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        // Register player walk animations once for all scenes
        if (this.textures.exists('player_walk')) {
            const dirs = [
                { key: 'walk_down',  start: 0,  end: 3 },
                { key: 'walk_left',  start: 4,  end: 7 },
                { key: 'walk_right', start: 8,  end: 11 },
                { key: 'walk_up',    start: 12, end: 15 },
            ];
            dirs.forEach(({ key, start, end }) => {
                if (!this.anims.exists(key)) {
                    this.anims.create({ key, frames: this.anims.generateFrameNumbers('player_walk', { start, end }), frameRate: 8, repeat: -1 });
                }
            });
        }

        this.scene.launch('TitleScene', { ui });
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Scene list — every Phaser scene must be registered here
// ──────────────────────────────────────────────────────────────────────────────
const sceneList = [
    BootScene,
    TitleScene,
    IntroScene,
    CharacterSelectScene,
    HaggleScene,
    LocationScene,
    DialogueScene,
    MacDialogueScene,
    OverworldScene,
    CityScene,
    MenuScene,
    EndScene,
    FastTravelScene,
];

// ──────────────────────────────────────────────────────────────────────────────
// Phaser config
// ──────────────────────────────────────────────────────────────────────────────
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'phaser-game-container',
    transparent: true,
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    plugins: {
        scene: [
            { key: 'gridEngine', plugin: GridEngine, mapping: 'gridEngine' }
        ]
    },
    scene: sceneList
};

// ──────────────────────────────────────────────────────────────────────────────
// Factory — called once from App.jsx useEffect
// ──────────────────────────────────────────────────────────────────────────────
export function createPhaserGame() {
    const phaserGame = new Phaser.Game(config);
    window.phaserGame = phaserGame;

    // Canvas sits behind everything
    phaserGame.canvas.style.position = 'fixed';
    phaserGame.canvas.style.top = '0';
    phaserGame.canvas.style.left = '0';
    phaserGame.canvas.style.zIndex = '0';

    // Terminal stays on top
    if (container) {
        container.style.position = 'relative';
        container.style.zIndex = '10';
    }

    return phaserGame;
}

// ──────────────────────────────────────────────────────────────────────────────
// GameEventBus — bridge Phaser ↔ Terminal UI
// ──────────────────────────────────────────────────────────────────────────────
GameEventBus.on(GameEvents.OVERWORLD_ENTER, () => {
    if (container) container.style.display = 'none';
});
GameEventBus.on(GameEvents.OVERWORLD_EXIT, () => {
    if (container) container.style.display = 'block';
});
GameEventBus.on(GameEvents.UI_NOTIFICATION, (msg) => {
    console.log(`[GameEventBus] ${msg}`);
});

// Bankruptcy / game-over: launch EndScene
GameEventBus.on(GameEvents.GAME_OVER, () => {
    if (window.phaserGame) {
        if (container) container.style.display = 'none';
        window.phaserGame.scene.start('EndScene', { ui });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// PWA: Register Service Worker
// ──────────────────────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => console.log('SW registered:', reg.scope))
            .catch((err) => console.log('SW registration failed:', err));
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// window.game — testing / headless automation API
// ──────────────────────────────────────────────────────────────────────────────
window.game = {
    /** Press a numbered menu option (1-indexed) */
    press: (n) => {
        const opt = ui.options[n - 1];
        if (opt && !opt.disabled && opt.action) {
            ui.selectedIndex = n - 1;
            opt.action();
            return `Selected: ${opt.label}`;
        }
        return `No valid option at index ${n}`;
    },

    /** Get terminal text as plain string */
    read: () => {
        const el = document.getElementById('terminal');
        return el ? el.innerText : '';
    },

    /** Current game state snapshot */
    state: () => {
        const s = GameState.state;
        if (!s) return 'No game started';
        return {
            week: s.week,
            cash: s.cash,
            portfolio: s.portfolio.length,
            portfolioValue: GameState.getPortfolioValue(),
            activeDeals: s.activeDeals.length,
            reputation: s.reputation,
            taste: s.taste,
            access: s.access,
            marketHeat: s.marketHeat,
            burnout: s.burnout,
            city: s.currentCity,
            market: s.marketState,
        };
    },

    /** List current terminal options */
    options: () => ui.options.map((o, i) => `[${i + 1}] ${o.label}${o.disabled ? ' (disabled)' : ''}`),

    /** Go back one screen */
    back: () => { ui.popScreen(); return 'Went back'; },

    /** Advance N weeks */
    advance: (n = 1) => {
        for (let i = 0; i < n; i++) {
            GameState.advanceWeek();
            MarketManager.tick();
        }
        ui.replaceScreen(dashboardScreen(ui));
        return `Advanced ${n} week(s). Now week ${GameState.state.week}`;
    },

    /** Start a new game with character at index (0-2) */
    start: async (charIdx = 0) => {
        const { CHARACTERS } = await import('./data/characters.js');
        GameState.init(CHARACTERS[charIdx]);
        ui.replaceScreen(dashboardScreen(ui));
        return `Started as ${CHARACTERS[charIdx].name}`;
    },

    /** Raw state reference */
    raw: () => GameState.state,

    /** Active Phaser scenes */
    scene: () => {
        if (!window.phaserGame) return 'Phaser not ready';
        return window.phaserGame.scene.getScenes(true).map(s => ({
            key: s.scene.key,
            active: s.scene.isActive(),
            visible: s.scene.isVisible(),
        }));
    },

    /** Dialogue state from Zustand (+ reward flag from Phaser scene) */
    dialogueState: () => {
        const state = useUIStore.getState().dialog;
        if (!state.isOpen) return { active: false };
        // Check Phaser scene for reward item (not stored in Zustand)
        const phaserScene = window.phaserGame?.scene?.getScene('MacDialogueScene');
        return {
            active: true,
            currentLine: state.currentStepIndex,
            totalLines: state.steps?.length || 0,
            speaker: state.steps?.[state.currentStepIndex]?.name || '',
            hasReward: !!(phaserScene?.dialogueData?.rewardItem),
        };
    },

    /** Advance dialogue via Zustand, or dismiss a Phaser reward overlay (once) */
    advanceDialogue: () => {
        const state = useUIStore.getState();
        if (state.dialog.isOpen) {
            state.advanceDialogue();
            return 'Advanced dialogue via Zustand';
        }
        // Dialogue finished (Zustand closed) but MacDialogueScene may still be
        // showing its reward overlay. Guard with _rewardExiting so multiple
        // rapid calls don't trigger multiple camera fadeOuts.
        const macScene = window.phaserGame?.scene?.getScene('MacDialogueScene');
        if (macScene && macScene.scene.isActive() && !macScene._rewardExiting) {
            macScene._rewardExiting = true;
            macScene.forceExit();
            return 'Dismissed reward overlay (MacDialogueScene force-exited)';
        }
        return 'No active dialogue overlay';
    },

    /** HaggleScene state */
    haggleState: () => {
        if (!window.phaserGame) return { active: false };
        const s = window.phaserGame.scene.getScene('HaggleScene');
        if (!s || !s.scene.isActive()) return { active: false };
        const st = s.state || {};
        const round = st.round || 0;
        return {
            active: true,
            round,
            maxRounds: st.maxRounds || 0,
            patience: st.patience || 0,
            gap: st.gap || 0,
            result: st.result || null,
            phase: round === 0 ? 'opening' : (st.resolved ? 'resolved' : 'negotiating'),
            dealerTypeKey: st.dealerTypeKey || '',
        };
    },

    /** Launch a scene directly (bypasses menus) */
    startTestScene: (sceneKey, payload) => {
        if (!window.phaserGame) return 'Engine not ready';
        if (payload && !payload.ui) payload.ui = ui;
        window.phaserGame.scene.start(sceneKey, payload);
        return `Started scene: ${sceneKey}`;
    },

    /** Force-exit ALL active non-Boot Phaser scenes and restore terminal */
    exitScene: () => {
        if (!window.phaserGame) return 'Engine not ready';
        const scenes = window.phaserGame.scene.getScenes(true);
        const stopped = [];
        for (const s of scenes) {
            if (s.scene.key !== 'BootScene') {
                if (s.forceExit) s.forceExit();
                else if (s.endBattle) s.endBattle();
                else s.scene.stop();
                stopped.push(s.scene.key);
            }
        }
        if (container) container.style.display = 'block';
        return stopped.length > 0 ? `Stopped: ${stopped.join(', ')}` : 'No active scenes to stop';
    },

    /** Terminal UI visibility */
    uiState: () => ({
        visible: container ? container.style.display !== 'none' : false,
        optionCount: ui.options.length,
        screenStackDepth: ui._screenStack?.length || 0,
    }),

    ui,
    eventBus: GameEventBus,
    events: GameEvents,

    /** Start a haggle session directly */
    startHaggle: async () => {
        if (!GameState.state) {
            const { CHARACTERS } = await import('./data/characters.js');
            GameState.init(CHARACTERS[0]);
        }
        const { HaggleManager } = await import('./managers/HaggleManager.js');
        const work = {
            id: 'test_api', title: 'Test Artwork', artist: 'Test Artist',
            quality: 8, heat: 6, medium: 'Oil on canvas', year: 2024, estimatedValue: 50000,
        };
        const info = HaggleManager.start({ mode: 'buy', work, npc: null, askingPrice: 50000 });
        const state = HaggleManager.getState();
        if (container) container.style.display = 'none';
        window.phaserGame.scene.start('HaggleScene', {
            ui,
            haggleInfo: { ...info, state, bgKey: 'bg_gallery_main_1bit_1771587911969.png' },
        });
        return { started: true, round: state.round, maxRounds: state.maxRounds };
    },

    /** Start a dialogue scene directly */
    startDialogue: (opts = {}) => {
        const defaults = {
            bgKey: 'bg_gallery_main_1bit_1771587911969.png',
            leftSpriteKey: 'test_legacy_bayer.png',
            rightSpriteKey: 'portrait_it_girl_1bit.png',
            dialogueSequence: [
                { name: 'Test', speakerSide: 'right', text: 'Hello from the test API.' }
            ],
        };
        const data = { ui, ...defaults, ...opts };
        if (container) container.style.display = 'none';
        window.phaserGame.scene.start('MacDialogueScene', data);
        return 'MacDialogueScene started';
    },

    /**
     * Debug report — call window.game.debug() in the browser console
     * to get a snapshot of all errors, missing assets, and scene state.
     */
    debug: () => {
        const report = window.ArtLife.report();
        const sceneList = window.phaserGame
            ? window.phaserGame.scene.getScenes(true).map(s => s.scene.key)
            : [];

        const out = {
            activeScenes: sceneList,
            terminalVisible: container ? container.style.display !== 'none' : false,
            gameState: GameState.state ? {
                week: GameState.state.week,
                cash: GameState.state.cash,
                city: GameState.state.currentCity,
                market: GameState.state.marketState,
            } : null,
            errors: report.errors,
            missingAssets: report.missingAssets,
            sceneErrors: report.sceneErrors,
        };

        console.group('[ArtLife Debug Report]');
        console.log('Active scenes:', sceneList.join(', ') || 'none');
        if (report.errors.length) console.warn('JS Errors:', report.errors);
        if (report.missingAssets.length) console.warn('Missing assets:', report.missingAssets.map(a => a.key).join(', '));
        if (report.sceneErrors.length) console.warn('Scene errors:', report.sceneErrors);
        console.log('Full report:', out);
        console.groupEnd();

        return out;
    },

    /** Clear the error log (useful after resolving issues) */
    clearErrors: () => { window.ArtLife.clearErrors(); return 'Error log cleared.'; },
};
