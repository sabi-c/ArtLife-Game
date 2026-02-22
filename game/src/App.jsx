import React, { useEffect, useState, useRef } from 'react';
import Phaser from 'phaser';

import { createPhaserGame } from './phaserInit.js';
import DialogueBox from './ui/DialogueBox.jsx';
import PlayerDashboard from './ui/PlayerDashboard.jsx';
import { ErrorBoundary } from './ui/ErrorBoundary.jsx';
import { GameEventBus, GameEvents } from './managers/GameEventBus.js';
import ScenePlayer from './ui/ScenePlayer.jsx';
import InventoryDashboard from './ui/InventoryDashboard.jsx';
import TerminalLogin from './ui/TerminalLogin.jsx';
import AdminDashboard, { AdminFAB } from './ui/AdminDashboard.jsx';
import SettingsOverlay from './ui/SettingsOverlay.jsx';
import ContentStudio from './ui/ContentStudio.jsx';
import MobileJoypad from './ui/MobileJoypad.jsx';
import CalendarHUD from './ui/CalendarHUD.jsx';
import StorylineCMS from './ui/StorylineCMS.jsx';
import EventCMS from './ui/CMSOverlay.jsx';
import MasterCMS from './ui/MasterCMS.jsx';
import MarketDashboard from './ui/MarketDashboard.jsx';
import ArtworkDashboard from './ui/ArtworkDashboard.jsx';
import DiagnosticsOverlay from './ui/DiagnosticsOverlay.jsx';
import { VIEW, OVERLAY } from './constants/views.js';
import { GameState } from './managers/GameState.js';
import { WebAudioService } from './managers/WebAudioService.js';
import { SettingsManager } from './managers/SettingsManager.js';
import './api/ContentAPI.js'; // Side-effect: registers window.ContentAPI

export default function App() {
    const [game, setGame] = useState(null);
    const [phaserError, setPhaserError] = useState(null);
    const [activeView, setActiveView] = useState(() => {
        // E2E Test Backdoor: skip straight to Phaser
        const params = new URLSearchParams(window.location.search);
        if (params.get('skipBoot')) return VIEW.PHASER;
        // Fresh visit starts with IntroScene (Phaser cinematic), not BOOT
        // Auto-resume will override this to TERMINAL if a save exists
        return VIEW.PHASER;
    });
    const [viewPayload, setViewPayload] = useState(null);
    const [activeOverlay, setActiveOverlay] = useState(OVERLAY.NONE);
    const [isGridSceneActive, setIsGridSceneActive] = useState(false);
    const autoResumedRef = useRef(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                setActiveOverlay(prev => prev === OVERLAY.CMS ? OVERLAY.NONE : OVERLAY.CMS);
            } else if (e.key === 'F2') {
                e.preventDefault();
                setActiveOverlay(prev => prev === OVERLAY.DEBUG_LOG ? OVERLAY.NONE : OVERLAY.DEBUG_LOG);
            } else if (e.key === '`' || e.key === '~') {
                setActiveOverlay(prev => {
                    const next = prev === OVERLAY.ADMIN ? OVERLAY.NONE : OVERLAY.ADMIN;
                    if (next === OVERLAY.ADMIN) WebAudioService.select();
                    else WebAudioService.hover();
                    return next;
                });
            } else if (e.key === 'Escape') {
                setActiveOverlay(prev => {
                    if (prev !== OVERLAY.NONE) {
                        WebAudioService.hover();
                        return OVERLAY.NONE;
                    }
                    return prev;
                });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Global Theme Applier
    useEffect(() => {
        const applyTheme = () => {
            const theme = SettingsManager.get('colorTheme');
            if (theme === 'pantone_blue') {
                document.body.classList.add('theme-pantone-blue');
                document.body.classList.remove('theme-uplink');
            } else if (theme === 'uplink') {
                document.body.classList.add('theme-uplink');
                document.body.classList.remove('theme-pantone-blue');
            } else {
                document.body.classList.remove('theme-pantone-blue');
                document.body.classList.remove('theme-uplink');
            }
        };
        applyTheme(); // apply initially

        const onSettingsChange = (e) => {
            if (e.detail?.key === 'colorTheme') {
                applyTheme();
            }
        };
        window.addEventListener('settings-changed', onSettingsChange);
        return () => window.removeEventListener('settings-changed', onSettingsChange);
    }, []);

    useEffect(() => {
        let phaserInstance;
        try {
            phaserInstance = createPhaserGame();
            setGame(phaserInstance);
        } catch (err) {
            console.error('[App] Phaser init failed:', err);
            setPhaserError(err.message || 'Phaser failed to initialise.');
            return () => { };
        }

        // ── Session Persistence / Test Backdoor ──
        const params = new URLSearchParams(window.location.search);
        if (params.get('skipBoot')) {
            // Test runner wants to boot directly into TitleScene
            // BootScene.create() sets window.startPhaserGame asynchronously,
            // so we poll until it's available (up to 5s)
            const pollStart = Date.now();
            const pollId = setInterval(() => {
                if (window.startPhaserGame) {
                    clearInterval(pollId);
                    window.startPhaserGame('new');
                } else if (Date.now() - pollStart > 5000) {
                    clearInterval(pollId);
                    console.error('[App] skipBoot: startPhaserGame never registered');
                }
            }, 100);
            setActiveView(VIEW.PHASER);
        } else {
            // Auto-resume from most recent save slot
            try {
                const slot = GameState.getMostRecentSlot();
                if (slot !== null && !autoResumedRef.current) {
                    const loaded = GameState.load(slot);
                    if (loaded) {
                        autoResumedRef.current = true;
                        const ui = window.TerminalUIInstance;
                        if (ui?.container) {
                            ui.container.style.display = '';
                            import('./terminal/screens/index.js').then(({ dashboardScreen }) => {
                                ui.pushScreen(dashboardScreen(ui));
                            }).catch(err => {
                                console.error('[App] Failed to load dashboard:', err);
                                setActiveView(VIEW.BOOT); // Fallback to login
                            });
                            // Hide canvas — terminal only
                            if (phaserInstance?.canvas) {
                                phaserInstance.canvas.style.visibility = 'hidden';
                                phaserInstance.canvas.style.pointerEvents = 'none';
                            }
                            setActiveView(VIEW.TERMINAL);
                        }
                        // If UI wasn't available, fall through to BOOT (default)
                    }
                }
            } catch (err) {
                console.error('[App] Auto-resume failed:', err);
                // Fall through to intro cinematic below
            }

            // No save found (or auto-resume failed) — launch IntroScene cinematic
            if (!autoResumedRef.current) {
                const introStart = Date.now();
                const introPoll = setInterval(() => {
                    if (window.startPhaserGame) {
                        clearInterval(introPoll);
                        window.startPhaserGame('new'); // → BootScene → IntroScene
                    } else if (Date.now() - introStart > 5000) {
                        clearInterval(introPoll);
                        console.error('[App] startPhaserGame never registered for intro');
                        setActiveView(VIEW.BOOT); // Fallback to login screen
                    }
                }, 100);
                setActiveView(VIEW.PHASER);
            }
        }

        return () => {
            if (phaserInstance) phaserInstance.destroy(true);
        };
    }, []);

    const handleLoginComplete = ({ action }) => {
        if (action === 'devmode') {
            // Dev Mode: initialize minimal state and open Content Studio
            try { GameState.init({ name: 'Dev Agent', playerName: 'dev', id: 'dev_agent', icon: '🔧', tagline: 'Debug mode', startingCash: 500000, startingWorks: 0, perk: 'Debug', difficulty: 'EASY' }); } catch (e) { /* may already exist */ }
            const ui = window.TerminalUIInstance;
            if (ui?.container) {
                ui.container.style.display = '';
                import('./terminal/screens/index.js').then(({ dashboardScreen }) => {
                    ui.pushScreen(dashboardScreen(ui));
                });
            }
            setActiveView(VIEW.TERMINAL);
            setActiveOverlay(OVERLAY.CMS);
        } else if (action === 'load') {
            // Load path: show terminal dashboard (not React PlayerDashboard)
            const ui = window.TerminalUIInstance;
            if (ui?.container) {
                ui.container.style.display = '';
                import('./terminal/screens/index.js').then(({ dashboardScreen }) => {
                    ui.pushScreen(dashboardScreen(ui));
                });
            }
            setActiveView(VIEW.TERMINAL);
        } else {
            // New game: launch CharacterSelectScene directly (IntroScene already played)
            setActiveView(VIEW.PHASER);
            const pollStart = Date.now();
            const pollId = setInterval(() => {
                if (window.startPhaserGame) {
                    clearInterval(pollId);
                    window.startPhaserGame('charselect');
                    // Give canvas keyboard focus for Phaser input
                    setTimeout(() => {
                        const canvas = game?.canvas || window.phaserGame?.canvas;
                        if (canvas) {
                            canvas.setAttribute('tabindex', '0');
                            canvas.focus();
                        }
                    }, 200);
                } else if (Date.now() - pollStart > 8000) {
                    clearInterval(pollId);
                    console.error('[App] startPhaserGame never registered after 8s');
                    setActiveView(VIEW.BOOT); // Fallback to login
                }
            }, 100);
        }
    };

    // Central UI Router Listener
    useEffect(() => {
        const handler = (viewKey, payload = null) => {
            setActiveView(viewKey);
            setViewPayload(payload);
        };
        const GRID_SCENES = ['WorldScene', 'LocationScene'];
        const sceneReadyHandler = (sceneName) => {
            if (GRID_SCENES.includes(sceneName)) setIsGridSceneActive(true);
        };
        const sceneExitHandler = (sceneName) => {
            if (GRID_SCENES.includes(sceneName)) setIsGridSceneActive(false);
        };

        GameEventBus.on(GameEvents.UI_ROUTE, handler);
        GameEventBus.on(GameEvents.SCENE_READY, sceneReadyHandler);
        GameEventBus.on(GameEvents.SCENE_EXIT, sceneExitHandler);

        // Also map legacy TOGGLE_DASHBOARD to UI_ROUTE for now just in case
        const legacyHandler = (data) => {
            setActiveView(data?.state ? VIEW.DASHBOARD : VIEW.PHASER);
        };

        const overlayHandler = (overlayKey) => {
            setActiveOverlay(prev => prev === overlayKey ? OVERLAY.NONE : overlayKey);
        };

        GameEventBus.on(GameEvents.TOGGLE_DASHBOARD, legacyHandler);
        GameEventBus.on(GameEvents.UI_TOGGLE_OVERLAY, overlayHandler);

        return () => {
            GameEventBus.off(GameEvents.UI_ROUTE, handler);
            GameEventBus.off(GameEvents.SCENE_READY, sceneReadyHandler);
            GameEventBus.off(GameEvents.SCENE_EXIT, sceneExitHandler);
            GameEventBus.off(GameEvents.TOGGLE_DASHBOARD, legacyHandler);
            GameEventBus.off(GameEvents.UI_TOGGLE_OVERLAY, overlayHandler);
        };
    }, []);

    // Engine Suspend logic: hide Phaser canvas if a solid UI is open
    useEffect(() => {
        const container = document.getElementById('phaser-game-container');
        if (container) {
            const showPhaser = activeView === VIEW.PHASER;
            container.style.visibility = showPhaser ? 'visible' : 'hidden';
            container.style.pointerEvents = showPhaser ? 'auto' : 'none';
            // Opaque background prevents body color (e.g. Pantone Blue theme) from
            // bleeding through when the transparent Phaser canvas is active.
            container.style.background = showPhaser ? '#0a0a0f' : '';

            // Also sync canvas visibility — auto-resume and other flows may hide
            // the canvas directly, so always reconcile it here.
            if (game?.canvas) {
                game.canvas.style.visibility = showPhaser ? 'visible' : 'hidden';
                game.canvas.style.pointerEvents = showPhaser ? 'auto' : 'none';
            }

            // On mobile with WorldScene active, shrink canvas to top portion
            // so the Game Boy control panel fits below.
            const isMobile = window.innerWidth < 769;
            if (showPhaser && isGridSceneActive && isMobile) {
                requestAnimationFrame(() => {
                    const topH = Math.floor(window.innerHeight * 0.54);
                    container.style.height = topH + 'px';
                    container.style.bottom = 'auto';
                    if (game?.canvas) {
                        game.canvas.style.height = topH + 'px';
                    }
                    game?.scale?.resize(window.innerWidth, topH);
                });
            } else {
                // Reset container to fill viewport — Phaser Scale.RESIZE mode
                // handles sizing automatically based on the parent element.
                container.style.height = '100%';
                container.style.bottom = '';
                if (game?.canvas) {
                    game.canvas.style.height = '';
                }
                // Trigger Phaser's scale manager to recalculate from parent
                if (showPhaser && game) {
                    requestAnimationFrame(() => {
                        game?.scale?.refresh();
                    });
                }
            }
        }
        // Terminal visibility: show when in TERMINAL view, hide when Phaser takes over
        const termContainer = document.getElementById('terminal');
        if (termContainer) {
            if (activeView === VIEW.TERMINAL) {
                termContainer.style.display = '';
            } else if (activeView === VIEW.PHASER) {
                termContainer.style.display = 'none';
            }
        }
    }, [activeView, isGridSceneActive]);

    if (phaserError) {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: '#0a0a0f',
                color: '#c94040', fontFamily: 'monospace',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '16px', padding: '40px',
            }}>
                <div style={{ fontSize: '20px' }}>ENGINE ERROR</div>
                <div style={{ fontSize: '12px', color: '#7a7a8a' }}>{phaserError}</div>
                <button onClick={() => window.location.reload()}
                    style={{ background: 'none', border: '1px solid #c9a84c', color: '#c9a84c', padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    [ RELOAD ]
                </button>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            {/* ── CENTRAL UI ROUTER ── */}
            {activeView === VIEW.BOOT && (
                <TerminalLogin onComplete={handleLoginComplete} previewStep={viewPayload?.previewStep} />
            )}

            {/* The DialogueLayer overlays the Phase Canvas, so it sits outside the router bounds */}
            <DialogueBox />

            {activeView === VIEW.DASHBOARD && (
                <PlayerDashboard onClose={() => setActiveView(VIEW.TERMINAL)} />
            )}

            {activeView === VIEW.SCENE_ENGINE && (
                <ScenePlayer onClose={() => setActiveView(VIEW.TERMINAL)} payload={viewPayload} />
            )}

            {/* ── OVERLAY REGISTRY ── */}
            {activeOverlay === OVERLAY.ADMIN ? (
                <AdminDashboard onClose={() => setActiveOverlay(OVERLAY.NONE)} />
            ) : (
                <AdminFAB onClick={() => { setActiveOverlay(OVERLAY.ADMIN); WebAudioService.select(); }} />
            )}

            {activeOverlay === OVERLAY.SETTINGS && (
                <SettingsOverlay onClose={() => setActiveOverlay(OVERLAY.NONE)} />
            )}

            {activeOverlay === OVERLAY.INVENTORY && (
                <InventoryDashboard onClose={() => setActiveOverlay(OVERLAY.NONE)} />
            )}

            {activeOverlay === OVERLAY.CMS && (
                <ErrorBoundary>
                    <ContentStudio onClose={() => setActiveOverlay(OVERLAY.NONE)} />
                </ErrorBoundary>
            )}

            {activeOverlay === OVERLAY.STORYLINE_CMS && (
                <StorylineCMS onClose={() => setActiveOverlay(OVERLAY.NONE)} />
            )}

            {activeOverlay === OVERLAY.EVENT_CMS && (
                <EventCMS onClose={() => setActiveOverlay(OVERLAY.NONE)} />
            )}

            {activeOverlay === OVERLAY.MASTER_CMS && (
                <ErrorBoundary>
                    <MasterCMS onClose={() => setActiveOverlay(OVERLAY.NONE)} />
                </ErrorBoundary>
            )}

            {activeOverlay === OVERLAY.MARKET_DASHBOARD && (
                <MarketDashboard onClose={() => setActiveOverlay(OVERLAY.NONE)} />
            )}

            {activeOverlay === OVERLAY.ARTWORK_DASHBOARD && (
                <ErrorBoundary>
                    <ArtworkDashboard onClose={() => setActiveOverlay(OVERLAY.NONE)} payload={viewPayload} />
                </ErrorBoundary>
            )}

            {activeOverlay === OVERLAY.DEBUG_LOG && (
                <DiagnosticsOverlay onClose={() => setActiveOverlay(OVERLAY.NONE)} />
            )}

            {isGridSceneActive && <MobileJoypad />}
            {<CalendarHUD visible={isGridSceneActive} />}

            {/* The Phaser Canvas Layer sets up in this div */}
            <div id="phaser-game-container" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
        </ErrorBoundary>
    );
}
