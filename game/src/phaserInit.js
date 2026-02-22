/**
 * ArtLife — Phaser + Terminal Bridge
 *
 * Initialises the Phaser engine and bridges it to the DOM TerminalUI.
 * Called once from App.jsx via createPhaserGame().
 */

// ─── All imports at the top ───────────────────────────────────────────────────
import Phaser from 'phaser';
import { GridEngine } from 'grid-engine';

// Extracted utils and scenes
import './utils/ErrorRegistry.js'; // Registers window.ArtLife globally
import { configureGameDebugAPI } from './utils/GameDebugAPI.js';
import { BootScene } from './scenes/BootScene.js';

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
import { GameEventBus, GameEvents } from './managers/GameEventBus.js';

import './style.css';


// ─── Terminal UI ───────────────────────────────────────────────────────────────
const container = document.getElementById('terminal');
const ui = new TerminalUI(container);
window.TerminalUIInstance = ui;

// Start with terminal hidden — TitleScene handles the intro
if (container) container.style.display = 'none';

// Configure debug API
configureGameDebugAPI(ui);

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
        autoCenter: Phaser.Scale.NO_CENTER
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    plugins: {
        scene: [
            { key: 'gridEngine', plugin: GridEngine, mapping: 'gridEngine' }
        ],
        global: []
    },
    scene: sceneList
};

// Dev-only: Phaser Plugin Inspector for real-time game object inspection
if (import.meta.env.DEV) {
    import('phaser-plugin-inspector').then(({ PhaserPluginInspector }) => {
        config.plugins.global.push({
            key: 'PhaserPluginInspector',
            plugin: PhaserPluginInspector,
            start: true
        });
    }).catch(() => {
        // Inspector not installed or failed to load — no-op
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory — called once from App.jsx useEffect
// ──────────────────────────────────────────────────────────────────────────────
export function createPhaserGame() {
    const phaserGame = new Phaser.Game(config);
    window.phaserGame = phaserGame;

    // Canvas sits behind everything — fixed to viewport top-left
    // NO_CENTER is set in scale config, but also zero margins explicitly
    // to prevent Scale Manager from computing CENTER_BOTH offsets on resize.
    phaserGame.canvas.style.position = 'fixed';
    phaserGame.canvas.style.top = '0';
    phaserGame.canvas.style.left = '0';
    phaserGame.canvas.style.marginTop = '0';
    phaserGame.canvas.style.marginLeft = '0';
    phaserGame.canvas.style.zIndex = '0';

    // Keep margins zeroed if Scale Manager fires a resize event
    phaserGame.scale.on('resize', () => {
        phaserGame.canvas.style.marginTop = '0';
        phaserGame.canvas.style.marginLeft = '0';
    });

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
        if (window.phaserGame.canvas) {
            window.phaserGame.canvas.style.visibility = 'visible';
            window.phaserGame.canvas.style.pointerEvents = 'auto';
        }
        window.phaserGame.scene.start('EndScene', { ui });
    }
});

// Admin Dashboard overrides — also used by market haggle and venue cutscenes
GameEventBus.on(GameEvents.DEBUG_LAUNCH_SCENE, (sceneKey, data = {}) => {
    if (window.phaserGame) {
        // Hide terminal
        if (container) container.style.display = 'none';

        // Make phaser container visible (React effect uses this div)
        const phaserContainer = document.getElementById('phaser-game-container');
        if (phaserContainer) {
            phaserContainer.style.visibility = 'visible';
            phaserContainer.style.pointerEvents = 'auto';
        }

        // Make canvas itself visible
        if (window.phaserGame.canvas) {
            window.phaserGame.canvas.style.visibility = 'visible';
            window.phaserGame.canvas.style.pointerEvents = 'auto';
        }

        // Stop all ACTIVE scenes first so we don't have overlapped updates
        window.phaserGame.scene.scenes.forEach(scene => {
            if (scene.sys.isActive() && scene.sys.settings.key !== 'BootScene') {
                window.phaserGame.scene.stop(scene.sys.settings.key);
            }
        });

        // Launch the requested scene
        window.phaserGame.scene.start(sceneKey, { ui, ...data });

        // Sync React state so activeView effect stays consistent
        GameEventBus.emit(GameEvents.UI_ROUTE, 'PHASER');
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
