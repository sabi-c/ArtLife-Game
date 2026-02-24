/**
 * ViewRouter.jsx — View-level routing
 *
 * Renders the active view based on the VIEW constant.
 * Views are exclusive (only one active at a time) and represent
 * full-screen page states.
 *
 * Extracted from App.jsx to keep routing logic separate from app bootstrap.
 */

import React, { Suspense, lazy } from 'react';
import { VIEW } from '../constants/views.js';

// ════════════════════════════════════════════════════════════
// Lazy View Imports
// ════════════════════════════════════════════════════════════

const ArtnetLogin = lazy(() => import('./ArtnetLogin.jsx'));
const CharacterCreator = lazy(() => import('./CharacterCreator.jsx'));
const PlayerDashboard = lazy(() => import('./PlayerDashboard.jsx'));
const ScenePlayer = lazy(() => import('./ScenePlayer.jsx'));
const DialogueBox = lazy(() => import('./DialogueBox.jsx'));

// ════════════════════════════════════════════════════════════
// Loading Fallback
// ════════════════════════════════════════════════════════════

function ViewLoadingFallback() {
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
                    else if (key === 'IntroScene') setStatus('Starting...');
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
    viewPayload,
    onLoginComplete,
}) {
    // Track whether Phaser has started rendering a real scene
    const [phaserReady, setPhaserReady] = React.useState(false);

    React.useEffect(() => {
        // Mark ready when IntroScene or any non-Boot scene starts
        const checkReady = setInterval(() => {
            if (window.phaserGame) {
                const scenes = window.phaserGame.scene.scenes || [];
                const activeScene = scenes.find(s => s.sys?.isActive?.());
                if (activeScene && activeScene.sys.settings.key !== 'BootScene') {
                    setPhaserReady(true);
                    clearInterval(checkReady);
                }
            }
        }, 200);
        return () => clearInterval(checkReady);
    }, []);

    return (
        <Suspense fallback={<ViewLoadingFallback />}>
            {/* ── Loading screen while Phaser boots ── */}
            {activeView === VIEW.PHASER && !phaserReady && (
                <PhaserLoadingScreen />
            )}

            {/* ── Boot / Login Screen (Artnet Login) ── */}
            {activeView === VIEW.BOOT && (
                <ArtnetLogin
                    onClose={() => setActiveView(VIEW.PHASER)}
                    onLoginSuccess={({ email }) => {
                        // Wire ArtnetLogin success into the game flow
                        onLoginComplete({ action: 'new', email });
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
