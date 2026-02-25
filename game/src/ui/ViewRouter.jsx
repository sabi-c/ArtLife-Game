/**
 * ViewRouter.jsx — View-level routing
 *
 * Renders the active view based on the VIEW constant.
 * Views are exclusive (only one active at a time) and represent
 * full-screen page states.
 *
 * Extracted from App.jsx to keep routing logic separate from app bootstrap.
 */

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { VIEW } from '../core/views.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';

// ════════════════════════════════════════════════════════════
// Lazy View Imports
// ════════════════════════════════════════════════════════════

const ArtnetLogin = lazy(() => import('./boot/ArtnetLogin.jsx'));
const BootSplash = lazy(() => import('./boot/BootSplash.jsx'));
const NarrativeIntro = lazy(() => import('./boot/NarrativeIntro.jsx'));
const CharacterCreator = lazy(() => import('./boot/CharacterCreator.jsx'));
const PlayerDashboard = lazy(() => import('./player/PlayerDashboard.jsx'));
const ScenePlayer = lazy(() => import('./game/ScenePlayer.jsx'));
const DialogueBox = lazy(() => import('./game/DialogueBox.jsx'));
const ArtnetMarketplace = lazy(() => import('./market/ArtnetMarketplace.jsx'));
const BloombergTerminal = lazy(() => import('./market/BloombergTerminal.jsx'));

// ════════════════════════════════════════════════════════════
// Deferred Loading Fallback
// Only shows after 300ms and ONLY if PhaserLoadingScreen isn't
// already visible — prevents multiple loading screens stacking.
// ════════════════════════════════════════════════════════════

function ViewLoadingFallback() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 300);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: '#0a0a0f',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'SF Mono', Courier, monospace",
            color: '#555', fontSize: 12, letterSpacing: '0.2em',
        }}>
            ░░░░░░░░░░
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// Loading Screen (shown while Phaser boots)
// ════════════════════════════════════════════════════════════

function PhaserLoadingScreen() {
    const [dots, setDots] = React.useState('');
    const [status, setStatus] = React.useState('Initializing engine...');

    React.useEffect(() => {
        const dotInterval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        // Listen for progress updates from BootScene
        const checkProgress = setInterval(() => {
            if (window.phaserGame) {
                const scenes = window.phaserGame.scene.scenes || [];
                const activeScene = scenes.find(s => s.sys?.isActive?.());
                if (activeScene) {
                    const key = activeScene.sys.settings.key;
                    if (key === 'BootScene') setStatus('Loading assets...');
                    else setStatus(`Scene: ${key}`);
                }
            }
        }, 300);

        return () => {
            clearInterval(dotInterval);
            clearInterval(checkProgress);
        };
    }, []);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: '#0a0a0f',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: "'IBM Plex Mono', 'SF Mono', Courier, monospace",
            gap: '24px',
        }}>
            <div style={{
                fontSize: '28px', fontWeight: 700,
                color: '#c9a84c', letterSpacing: '0.15em',
                textShadow: '0 0 30px rgba(201,168,76,0.3)',
            }}>
                ARTLIFE
            </div>
            <div style={{
                width: '200px', height: '2px',
                background: '#1a1a2e', borderRadius: '1px',
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #c9a84c, #e8d48b)',
                    animation: 'loadingProgress 2s ease-in-out infinite',
                    width: '60%',
                }} />
            </div>
            <div style={{
                fontSize: '11px', color: '#555',
                letterSpacing: '0.1em',
            }}>
                {status}{dots}
            </div>
            <style>{`
                @keyframes loadingProgress {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(80%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// ViewRouter Component
// ════════════════════════════════════════════════════════════

export default function ViewRouter({
    activeView,
    setActiveView,
    setActiveOverlay,
    viewPayload,
    onLoginComplete,
}) {
    // Track whether Phaser has EVER been ready (once true, never goes back to false)
    const phaserReadyRef = React.useRef(false);
    const [phaserReady, setPhaserReady] = React.useState(false);

    React.useEffect(() => {
        if (phaserReadyRef.current) return; // Already done, don't re-poll

        const checkReady = setInterval(() => {
            // Ready if Phaser game exists AND has run at least one scene create()
            if (window.phaserGame) {
                const scenes = window.phaserGame.scene.scenes || [];
                const hasActiveScene = scenes.some(s => {
                    try { return s.sys?.isActive?.() && s.sys.settings.key !== 'BootScene'; }
                    catch { return false; }
                });
                // Also check if any non-boot scene has ever had create() called
                const hasCreatedScene = scenes.some(s => {
                    try { return s.sys?.settings?.status >= 5 && s.sys.settings.key !== 'BootScene'; }
                    catch { return false; }
                });
                if (hasActiveScene || hasCreatedScene) {
                    phaserReadyRef.current = true;
                    setPhaserReady(true);
                    clearInterval(checkReady);
                }
            }
        }, 200);

        // Absolute timeout: after 8s, force-dismiss loading screen
        const timeout = setTimeout(() => {
            if (!phaserReadyRef.current) {
                console.warn('[ViewRouter] Phaser did not become ready in 8s — dismissing loading screen');
                phaserReadyRef.current = true;
                setPhaserReady(true);
                clearInterval(checkReady);
            }
        }, 8000);

        return () => { clearInterval(checkReady); clearTimeout(timeout); };
    }, []);

    return (
        <Suspense fallback={<ViewLoadingFallback />}>
            {/* ── Loading screen ONLY during initial Phaser boot ── */}
            {activeView === VIEW.PHASER && !phaserReady && (
                <PhaserLoadingScreen />
            )}

            {/* ── Boot Splash (animated sprite) ── */}
            {activeView === VIEW.SPLASH && (
                <BootSplash onContinue={() => setActiveView(VIEW.NARRATIVE)} />
            )}

            {/* ── Narrative Intro (typewriter text) ── */}
            {activeView === VIEW.NARRATIVE && (
                <NarrativeIntro onContinue={() => setActiveView(VIEW.BOOT)} />
            )}

            {/* ── Artnet Login ── */}
            {activeView === VIEW.BOOT && (
                <ArtnetLogin
                    onClose={() => setActiveView(VIEW.SPLASH)}
                    onLoginSuccess={({ email }) => {
                        onLoginComplete({ action: 'load', email });
                        setActiveView(VIEW.BLOOMBERG);
                    }}
                />
            )}

            {/* ── Bloomberg Terminal (full-page view, main hub) ── */}
            {activeView === VIEW.BLOOMBERG && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#0a0a0f' }}>
                    <BloombergTerminal
                        onBrowseMarketplace={() => setActiveView(VIEW.ARTNET_HUB)}
                        onExploreWorld={() => {
                            GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'NewWorldScene');
                            setActiveView(VIEW.PHASER);
                        }}
                    />
                </div>
            )}

            {/* ── Artnet Marketplace (accessible from Bloomberg) ── */}
            {activeView === VIEW.ARTNET_HUB && (
                <ArtnetMarketplace
                    onClose={() => setActiveView(VIEW.BLOOMBERG)}
                    onExplore={() => {
                        GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'NewWorldScene');
                        setActiveView(VIEW.PHASER);
                    }}
                />
            )}

            {/* ── Character Creator ── */}
            {activeView === VIEW.CHARACTER_CREATOR && (
                <CharacterCreator />
            )}

            {/* ── Player Dashboard (React overlay on terminal) ── */}
            {activeView === VIEW.DASHBOARD && (
                <PlayerDashboard onClose={() => setActiveView(VIEW.TERMINAL)} />
            )}

            {/* ── Scene Engine (cutscenes, dialogue) ── */}
            {activeView === VIEW.SCENE_ENGINE && (
                <ScenePlayer
                    onClose={() => setActiveView(VIEW.TERMINAL)}
                    payload={viewPayload}
                />
            )}

            {/* ── Dialogue Layer (overlays Phaser canvas, always mounted) ── */}
            <DialogueBox />
        </Suspense>
    );
}
