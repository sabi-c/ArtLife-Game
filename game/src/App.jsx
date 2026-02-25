/**
 * App.jsx — ArtLife Application Root
 *
 * ARCHITECTURE: Thin shell that orchestrates 3 layers:
 *   1. Phaser engine (game canvas)
 *   2. ViewRouter (full-page views: Boot, CharacterCreator, Dashboard)
 *   3. OverlayRouter (overlays: Bloomberg, Inbox, Admin, CMS, etc.)
 *
 * All overlay and view components are lazy-loaded via their respective
 * routers for automatic code-splitting.
 *
 * Navigation: usePageRouter syncs URL ↔ state for bookmarking + back/forward.
 */

import React, { useEffect, useState, useRef } from 'react';

import { createPhaserGame } from './phaserInit.js';
import { ErrorBoundary } from './ui/ErrorBoundary.jsx';
import { GameEventBus, GameEvents } from './managers/GameEventBus.js';
import { VIEW, OVERLAY } from './core/views.js';
import { GameState } from './managers/GameState.js';
import { WebAudioService } from './managers/WebAudioService.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { usePageRouter, navigate } from './hooks/usePageRouter.js';
import './utils/ContentAPI.js'; // Side-effect: registers window.ContentAPI

// Extracted routers (all children are lazy-loaded)
import ViewRouter from './ui/ViewRouter.jsx';
import OverlayRouter from './ui/OverlayRouter.jsx';

// HUD components (small, always-mounted — not worth lazy-loading)
import MobileJoypad from './ui/MobileJoypad.jsx';
import CalendarHUD from './ui/CalendarHUD.jsx';

// Make navigate() available globally (for Phaser scenes, terminal, etc.)
window.navigate = navigate;

export default function App() {
    const [game, setGame] = useState(null);
    const [phaserError, setPhaserError] = useState(null);
    const [activeView, setActiveView] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('skipBoot')) return VIEW.PHASER;
        return VIEW.PHASER;
    });
    const [viewPayload, setViewPayload] = useState(null);
    const [activeOverlay, setActiveOverlay] = useState(OVERLAY.NONE);
    const [isGridSceneActive, setIsGridSceneActive] = useState(false);
    const [globalHaggleEmail, setGlobalHaggleEmail] = useState(null);
    const [gmailComposeData, setGmailComposeData] = useState(null);
    const autoResumedRef = useRef(false);

    // URL ↔ state sync (enables /market, /admin, /inbox deep links + back/forward)
    const { syncUrl } = usePageRouter(setActiveView, setActiveOverlay, setViewPayload);

    useEffect(() => {
        syncUrl(activeView, activeOverlay);
    }, [activeView, activeOverlay, syncUrl]);

    // Expose overlay setter for headless testing (verify.cjs / Playwright)
    useEffect(() => {
        window.__artlife_setOverlay = setActiveOverlay;
        return () => { delete window.__artlife_setOverlay; };
    }, [setActiveOverlay]);

    // ═══════════════════════════════════════════════════════════
    // Gmail compose event listener (from Bloomberg INQUIRE flow)
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const handleGmailCompose = (e) => {
            setGmailComposeData(e.detail);
            setActiveOverlay(OVERLAY.GMAIL_GUIDE);
        };
        window.addEventListener('openGmailCompose', handleGmailCompose);
        return () => window.removeEventListener('openGmailCompose', handleGmailCompose);
    }, []);

    // ═══════════════════════════════════════════════════════════
    // Keyboard shortcuts
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                setActiveOverlay(prev => prev === OVERLAY.MASTER_CMS ? OVERLAY.NONE : OVERLAY.MASTER_CMS);
            } else if (e.key === 'F2') {
                e.preventDefault();
                setActiveOverlay(prev => prev === OVERLAY.DEBUG_LOG ? OVERLAY.NONE : OVERLAY.DEBUG_LOG);
            } else if (e.key === 'F3') {
                e.preventDefault();
                setActiveOverlay(prev => prev === OVERLAY.DESIGN_GUIDE ? OVERLAY.NONE : OVERLAY.DESIGN_GUIDE);
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

    // ═══════════════════════════════════════════════════════════
    // Global Theme
    // ═══════════════════════════════════════════════════════════
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
        applyTheme();
        const onSettingsChange = (e) => {
            if (e.detail?.key === 'colorTheme') applyTheme();
        };
        window.addEventListener('settings-changed', onSettingsChange);
        return () => window.removeEventListener('settings-changed', onSettingsChange);
    }, []);

    // ═══════════════════════════════════════════════════════════
    // Phaser Init + Session Resume
    // ═══════════════════════════════════════════════════════════
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

        const params = new URLSearchParams(window.location.search);
        if (params.get('skipBoot')) {
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
                            import('./ui/terminal/screens/index.js').then(({ dashboardScreen }) => {
                                ui.pushScreen(dashboardScreen(ui));
                            }).catch(err => {
                                console.error('[App] Failed to load dashboard:', err);
                                setActiveView(VIEW.BOOT);
                            });
                            if (phaserInstance?.canvas) {
                                phaserInstance.canvas.style.visibility = 'hidden';
                                phaserInstance.canvas.style.pointerEvents = 'none';
                            }
                            setActiveView(VIEW.TERMINAL);
                            setActiveOverlay(OVERLAY.BLOOMBERG);
                        }
                    }
                }
            } catch (err) {
                console.error('[App] Auto-resume failed:', err);
            }

            if (!autoResumedRef.current) {
                const introStart = Date.now();
                const introPoll = setInterval(() => {
                    if (window.startPhaserGame) {
                        clearInterval(introPoll);
                        window.startPhaserGame('new');
                    } else if (Date.now() - introStart > 5000) {
                        clearInterval(introPoll);
                        console.error('[App] startPhaserGame never registered for intro');
                        setActiveView(VIEW.BOOT);
                    }
                }, 100);
                setActiveView(VIEW.PHASER);
            }
        }

        return () => {
            if (phaserInstance) phaserInstance.destroy(true);
        };
    }, []);

    // ═══════════════════════════════════════════════════════════
    // Login handler
    // ═══════════════════════════════════════════════════════════
    const handleLoginComplete = ({ action, email, slot }) => {
        if (action === 'new') {
            // New game: go to character creator
            setActiveView(VIEW.CHARACTER_CREATOR);
        } else if (action === 'devmode') {
            try {
                GameState.init({
                    name: 'Dev Agent', playerName: 'dev', id: 'dev_agent',
                    icon: '🔧', tagline: 'Debug mode', startingCash: 500000,
                    startingWorks: 0, perk: 'Debug', difficulty: 'EASY',
                });
            } catch (e) { /* may already exist */ }
            const ui = window.TerminalUIInstance;
            if (ui?.container) {
                ui.container.style.display = '';
                import('./ui/terminal/screens/index.js').then(({ dashboardScreen }) => {
                    ui.pushScreen(dashboardScreen(ui));
                });
            }
            setActiveView(VIEW.TERMINAL);
            setActiveOverlay(OVERLAY.MASTER_CMS);
        } else if (action === 'load') {
            // Load from save slot (GameState.load already called by ArtnetLogin)
            setActiveView(VIEW.PHASER);
            setActiveOverlay(OVERLAY.BLOOMBERG);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // Central UI Router Listener (GameEventBus → state)
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const handler = (viewKey, payload = null) => {
            setActiveView(viewKey);
            setViewPayload(payload);
        };
        const GRID_SCENES = ['WorldScene', 'NewWorldScene', 'LocationScene'];
        const sceneReadyHandler = (sceneName) => {
            if (GRID_SCENES.includes(sceneName)) setIsGridSceneActive(true);
        };
        const sceneExitHandler = (sceneName) => {
            if (GRID_SCENES.includes(sceneName)) setIsGridSceneActive(false);
        };

        GameEventBus.on(GameEvents.UI_ROUTE, handler);
        GameEventBus.on(GameEvents.SCENE_READY, sceneReadyHandler);
        GameEventBus.on(GameEvents.SCENE_EXIT, sceneExitHandler);

        const legacyHandler = (data) => {
            setActiveView(data?.state ? VIEW.DASHBOARD : VIEW.PHASER);
        };
        const overlayHandler = (overlayKey) => {
            setActiveOverlay(prev => prev === overlayKey ? OVERLAY.NONE : overlayKey);
        };

        GameEventBus.on(GameEvents.TOGGLE_DASHBOARD, legacyHandler);
        GameEventBus.on(GameEvents.UI_TOGGLE_OVERLAY, overlayHandler);

        const emailHaggleHandler = (haggleInfo) => {
            setGlobalHaggleEmail(haggleInfo);
        };
        GameEventBus.on(GameEvents.EMAIL_HAGGLE_START, emailHaggleHandler);

        return () => {
            GameEventBus.off(GameEvents.UI_ROUTE, handler);
            GameEventBus.off(GameEvents.SCENE_READY, sceneReadyHandler);
            GameEventBus.off(GameEvents.SCENE_EXIT, sceneExitHandler);
            GameEventBus.off(GameEvents.TOGGLE_DASHBOARD, legacyHandler);
            GameEventBus.off(GameEvents.UI_TOGGLE_OVERLAY, overlayHandler);
            GameEventBus.off(GameEvents.EMAIL_HAGGLE_START, emailHaggleHandler);
        };
    }, []);

    // ═══════════════════════════════════════════════════════════
    // Engine Suspend (hide Phaser canvas when solid UI is open)
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const container = document.getElementById('phaser-game-container');
        if (container) {
            const showPhaser = activeView === VIEW.PHASER;
            container.style.visibility = showPhaser ? 'visible' : 'hidden';
            container.style.pointerEvents = showPhaser ? 'auto' : 'none';
            container.style.background = showPhaser ? '#0a0a0f' : '';

            if (game?.canvas) {
                game.canvas.style.visibility = showPhaser ? 'visible' : 'hidden';
                game.canvas.style.pointerEvents = showPhaser ? 'auto' : 'none';
            }

            const isMobile = window.innerWidth < 769;
            if (showPhaser && isGridSceneActive && isMobile) {
                // Mobile overworld: game takes top ~54%, joypad takes bottom ~46%.
                // Use the container dimensions — don't override canvas CSS (phaserInit sets 100vw/100vh).
                requestAnimationFrame(() => {
                    const topH = Math.floor(window.innerHeight * 0.54);
                    container.style.height = topH + 'px';
                    container.style.bottom = 'auto';
                    container.style.overflow = 'hidden';
                    game?.scale?.resize(window.innerWidth, topH);
                });
            } else {
                container.style.height = '100%';
                container.style.bottom = '';
                container.style.overflow = '';
                if (showPhaser && game) {
                    requestAnimationFrame(() => game?.scale?.refresh());
                }
            }
        }
        const termContainer = document.getElementById('terminal');
        if (termContainer) {
            termContainer.style.display = activeView === VIEW.TERMINAL ? '' : 'none';
        }
    }, [activeView, isGridSceneActive]);

    // ═══════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════

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
            {/* Views (full-page states) — lazy-loaded */}
            <ViewRouter
                activeView={activeView}
                setActiveView={setActiveView}
                viewPayload={viewPayload}
                onLoginComplete={handleLoginComplete}
            />

            {/* Overlays (panels on top of views) — lazy-loaded */}
            <OverlayRouter
                activeOverlay={activeOverlay}
                setActiveOverlay={setActiveOverlay}
                viewPayload={viewPayload}
                globalHaggleEmail={globalHaggleEmail}
                setGlobalHaggleEmail={setGlobalHaggleEmail}
                gmailComposeData={gmailComposeData}
                setGmailComposeData={setGmailComposeData}
            />

            {/* HUD elements */}
            {isGridSceneActive && <MobileJoypad />}
            <CalendarHUD visible={isGridSceneActive} />

            {/* Phaser Canvas Layer */}
            <div id="phaser-game-container" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
        </ErrorBoundary>
    );
}
