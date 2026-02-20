/**
 * ArtLife — Terminal Mode
 * 
 * Pure text-based game interface for fast iteration on mechanics.
 * Replaces Phaser canvas with keyboard-navigable terminal UI.
 */

import { TerminalUI } from './terminal/TerminalUI.js';
import { titleScreen, characterSelectScreen, dashboardScreen } from './terminal/screens.js';
import { GameState } from './managers/GameState.js';
import { MarketManager } from './managers/MarketManager.js';
import Phaser from 'phaser';
import { HaggleScene } from './scenes/HaggleScene.js';

import './style.css';

const container = document.getElementById('terminal');
const ui = new TerminalUI(container);

// Start at title screen
ui.pushScreen(titleScreen(ui));

import { LocationScene } from './scenes/LocationScene.js';

// ══════════════════════════════════════════
// Phaser Engine Setup (For Visual Battles & Overworld)
// ══════════════════════════════════════════
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: document.body,
    transparent: true,
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [HaggleScene, LocationScene]
};
const phaserGame = new Phaser.Game(config);
window.phaserGame = phaserGame;

// Make canvas sit behind terminal so it doesn't block clicks when not active
phaserGame.canvas.style.position = 'absolute';
phaserGame.canvas.style.top = '0';
phaserGame.canvas.style.left = '0';
phaserGame.canvas.style.zIndex = '0';

// Ensure terminal is above
container.style.position = 'relative';
container.style.zIndex = '10';

// ══════════════════════════════════════════
// PWA: Register Service Worker
// ══════════════════════════════════════════
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => console.log('SW registered:', reg.scope))
            .catch((err) => console.log('SW registration failed:', err));
    });
}

// ══════════════════════════════════════════
// Expose game API on window for agent testing
// ══════════════════════════════════════════
window.game = {
    /** Press a number key to select an option (1-indexed) */
    press: (n) => {
        const opt = ui.options[n - 1];
        if (opt && !opt.disabled && opt.action) {
            ui.selectedIndex = n - 1;
            opt.action();
            return `Selected: ${opt.label}`;
        }
        return `No valid option at index ${n}`;
    },

    /** Get current screen state as plain text */
    read: () => {
        const el = document.getElementById('terminal');
        return el ? el.innerText : '';
    },

    /** Get current game state summary */
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

    /** List current options */
    options: () => ui.options.map((o, i) => `[${i + 1}] ${o.label}${o.disabled ? ' (disabled)' : ''}`),

    /** Go back one screen */
    back: () => { ui.popScreen(); return 'Went back'; },

    /** Quick: advance N weeks */
    advance: (n = 1) => {
        for (let i = 0; i < n; i++) {
            GameState.advanceWeek();
            MarketManager.tick();
        }
        ui.replaceScreen(dashboardScreen(ui));
        return `Advanced ${n} week(s). Now week ${GameState.state.week}`;
    },

    /** Quick: start game with character index (0-2) */
    start: async (charIdx = 0) => {
        const { CHARACTERS } = await import('./data/characters.js');
        GameState.init(CHARACTERS[charIdx]);
        ui.replaceScreen(dashboardScreen(ui));
        return `Started as ${CHARACTERS[charIdx].name}`;
    },

    /** Reference to raw state */
    raw: () => GameState.state,
};
