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
import { VIEW, OVERLAY } from './constants/views.js';
import { GameState } from './managers/GameState.js';
import { WebAudioService } from './managers/WebAudioService.js';
import { SettingsManager } from './managers/SettingsManager.js';

export default function App() {
    const [game, setGame] = useState(null);
    const [phaserError, setPhaserError] = useState(null);
    const [activeView, setActiveView] = useState(() => {
        // E2E Test Backdoor: skip straight to Phaser
        const params = new URLSearchParams(window.location.search);
        return params.get('skipBoot') ? VIEW.PHASER : VIEW.BOOT;
    });
    const [viewPayload, setViewPayload] = useState(null);
    const [activeOverlay, setActiveOverlay] = useState(OVERLAY.NONE);
    const autoResumedRef = useRef(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === '`' || e.key === '~') {
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
            } else {
                document.body.classList.remove('theme-pantone-blue');
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
            if (window.startPhaserGame) window.startPhaserGame('new');
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
                // Fall through to BOOT view (default)
            }
        }

        return () => {
            if (phaserInstance) phaserInstance.destroy(true);
        };
    }, []);

    const handleLoginComplete = ({ action }) => {
        if (action === 'load') {
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
            // New game: launch Phaser intro sequence
            setActiveView(VIEW.PHASER);
            if (window.startPhaserGame) {
                setTimeout(() => {
                    window.startPhaserGame(action);
                }, 50); // delay to ensure React un-hides the canvas container
            }
        }
    };

    // Central UI Router Listener
    useEffect(() => {
        const handler = (viewKey, payload = null) => {
            setActiveView(viewKey);
            setViewPayload(payload);
        };
        GameEventBus.on(GameEvents.UI_ROUTE, handler);

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
            GameEventBus.off(GameEvents.TOGGLE_DASHBOARD, legacyHandler);
            GameEventBus.off(GameEvents.UI_TOGGLE_OVERLAY, overlayHandler);
        };
    }, []);

    // Engine Suspend logic: hide Phaser canvas if a solid UI is open
    useEffect(() => {
        const container = document.getElementById('phaser-game-container');
        if (container) {
            // Canvas visible only when a Phaser scene is active
            container.style.visibility = (activeView === VIEW.PHASER) ? 'visible' : 'hidden';
            container.style.pointerEvents = (activeView === VIEW.PHASER) ? 'auto' : 'none';
        }
        // Terminal visibility: show when in TERMINAL view, hide when Phaser takes over
        const termContainer = document.getElementById('terminal');
        if (termContainer) {
            if (activeView === VIEW.TERMINAL) {
                termContainer.style.display = '';
            }
            // Don't hide terminal here — Phaser scenes manage it via showTerminalUI/hideUI
        }
    }, [activeView]);

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
                <TerminalLogin onComplete={handleLoginComplete} />
            )}

            {/* The DialogueLayer overlays the Phase Canvas, so it sits outside the router bounds */}
            <DialogueBox />

            {activeView === VIEW.DASHBOARD && (
                <PlayerDashboard onClose={() => setActiveView(VIEW.PHASER)} />
            )}

            {activeView === VIEW.SCENE_ENGINE && (
                <ScenePlayer onClose={() => setActiveView(VIEW.PHASER)} payload={viewPayload} />
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

            {/* The Phaser Canvas Layer sets up in this div */}
            <div id="phaser-game-container" />
        </ErrorBoundary>
    );
}
