/**
 * GameDebugAPI.js
 * Extracted from phaserInit.js during Phase 41 refactoring.
 * Headless automation and manual debugging API exposed on window.game.
 */

import { GameState } from '../managers/GameState.js';
import { useUIStore } from '../stores/uiStore.js';
import { MarketManager } from '../managers/MarketManager.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { dashboardScreen } from '../terminal/screens/index.js';

export function configureGameDebugAPI(ui) {
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
            const { CHARACTERS } = await import('../data/characters.js');
            GameState.init(CHARACTERS[charIdx]);
            ui.replaceScreen(dashboardScreen(ui));
            return `Started as ${CHARACTERS[charIdx].name}`;
        },

        /** Raw state reference */
        raw: () => GameState.state,

        /** All registered Phaser scenes (active and inactive) */
        scene: () => {
            if (!window.phaserGame) return [];
            return window.phaserGame.scene.getScenes(false).map(s => ({
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
            if (window.phaserGame.canvas) window.phaserGame.canvas.style.display = 'block';
            window.phaserGame.scene.start(sceneKey, payload);
            return `Started scene: ${sceneKey}`;
        },

        /** Force-exit ALL active non-Boot Phaser scenes and restore terminal */
        exitScene: () => {
            const container = document.getElementById('terminal');
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
        uiState: () => {
            const container = document.getElementById('terminal');
            return {
                visible: container ? container.style.display !== 'none' : false,
                optionCount: ui.options.length,
                screenStackDepth: ui._screenStack?.length || 0,
            };
        },

        ui,
        eventBus: GameEventBus,
        events: GameEvents,

        /** Start a haggle session directly */
        startHaggle: async () => {
            if (!GameState.state) {
                const { CHARACTERS } = await import('../data/characters.js');
                GameState.init(CHARACTERS[0]);
            }
            const { HaggleManager } = await import('../managers/HaggleManager.js');
            const work = {
                id: 'test_api', title: 'Test Artwork', artist: 'Test Artist',
                quality: 8, heat: 6, medium: 'Oil on canvas', year: 2024, estimatedValue: 50000,
            };
            const info = HaggleManager.start({ mode: 'buy', work, npc: null, askingPrice: 50000 });
            const state = HaggleManager.getState();
            const container = document.getElementById('terminal');
            if (container) container.style.display = 'none';
            if (window.phaserGame.canvas) window.phaserGame.canvas.style.display = 'block';
            window.phaserGame.scene.start('HaggleScene', {
                ui,
                haggleInfo: { ...info, state, bgKey: 'bg_gallery_main_1bit_1771587911969.png' },
            });
            return { started: true, round: state.round, maxRounds: state.maxRounds };
        },

        /** Start a dialogue scene directly — uses a real multi-line conversation */
        startDialogue: (opts = {}) => {
            const defaults = {
                bgKey: 'bg_gallery_main_1bit_1771587911969.png',
                leftSpriteKey: 'test_legacy_bayer.png',
                rightSpriteKey: 'portrait_it_girl_1bit.png',
                dialogueSequence: [
                    { name: 'Elena Ross', speakerSide: 'right', text: 'Welcome to Ross Gallery. I\'m Elena.' },
                    { name: 'Elena Ross', speakerSide: 'right', text: 'She says it with practised warmth, but her eyes do a quick scan — shoes, watch, posture. She\'s already categorising you.' },
                    { name: 'You', speakerSide: 'left', text: 'I\'m interested in the new exhibition. What can you tell me?' },
                    { name: 'Elena Ross', speakerSide: 'right', text: 'This is Yuki\'s strongest body of work yet. She spent three months in Kyoto, and you can feel it — the restraint, the negative space.' },
                    { name: 'Elena Ross', speakerSide: 'right', text: 'Every piece is a conversation between what\'s there and what isn\'t.' },
                    { name: 'You', speakerSide: 'left', text: 'Tell me about Yuki\'s trajectory.' },
                    { name: 'Elena Ross', speakerSide: 'right', text: 'She\'s got a show at Palais de Tokyo next spring. A collector in Basel bought four pieces last year. The Hammer Museum is circling.' },
                    { name: 'Elena Ross', speakerSide: 'right', text: 'Honestly? If you\'re going to buy Yuki, buy now. In eighteen months, these prices will look like a joke.' },
                    { name: 'You', speakerSide: 'left', text: 'I\'d like to see a price list.' },
                    { name: 'Elena Ross', speakerSide: 'right', text: 'Two small Tanakas — $12K and $18K. Last works from this body. Next show prices will be higher.' },
                    { name: 'Elena Ross', speakerSide: 'right', text: 'It was lovely meeting you. Don\'t be a stranger — openings are every six weeks.' },
                ],
            };
            const data = { ui, ...defaults, ...opts };
            const container = document.getElementById('terminal');
            if (container) container.style.display = 'none';
            if (window.phaserGame.canvas) window.phaserGame.canvas.style.display = 'block';
            window.phaserGame.scene.start('MacDialogueScene', data);
            return 'MacDialogueScene started';
        },

        /** Debug report — call window.game.debug() in the browser console */
        debug: () => {
            const container = document.getElementById('terminal');
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
}
