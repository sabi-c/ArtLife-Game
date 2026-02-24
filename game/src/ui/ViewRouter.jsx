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

const TerminalLogin = lazy(() => import('./TerminalLogin.jsx'));
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
// ViewRouter Component
// ════════════════════════════════════════════════════════════

export default function ViewRouter({
    activeView,
    setActiveView,
    viewPayload,
    onLoginComplete,
}) {
    return (
        <Suspense fallback={<ViewLoadingFallback />}>
            {/* ── Boot / Login Screen ── */}
            {activeView === VIEW.BOOT && (
                <TerminalLogin
                    onComplete={onLoginComplete}
                    previewStep={viewPayload?.previewStep}
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
