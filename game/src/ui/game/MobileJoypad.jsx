import React, { useEffect, useState, useCallback } from 'react';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { navigate } from '../../hooks/usePageRouter.js';

/**
 * Art Boy — Frosted-glass game controller for overworld scenes.
 *
 * Layout (bottom ~46vh of viewport, semi-transparent):
 *   ┌──────────────────────────────────────────┐
 *   │              ✦ Art Boy ✦                │
 *   │  ┌───┐                          (A)     │
 *   │  │ ▲ │                       (B)        │
 *   │ ◀│ ● │▶          SELECT START           │
 *   │  │ ▼ │                                  │
 *   │  └───┘                                  │
 *   └──────────────────────────────────────────┘
 *
 * Buttons:
 *   D-Pad  → window.joypadState ('UP'|'DOWN'|'LEFT'|'RIGHT'|null)
 *   A      → window.joypadAction (interact/confirm)
 *   B      → window.joypadSprint (hold to run)
 *   START  → Open admin dashboard
 *   SELECT → Open inventory
 *   EXIT   → Exit scene → dashboard
 */
export function MobileJoypad() {
    const [activeDir, setActiveDir] = useState(null);
    const [sprintHeld, setSprintHeld] = useState(false);
    const [aPressed, setAPressed] = useState(false);

    const dirDown = useCallback((dir, e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        window.joypadState = dir;
        setActiveDir(dir);
    }, []);

    const dirUp = useCallback((e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        window.joypadState = null;
        setActiveDir(null);
    }, []);

    const sprintDown = useCallback((e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        window.joypadSprint = true;
        setSprintHeld(true);
    }, []);

    const sprintUp = useCallback((e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        window.joypadSprint = false;
        setSprintHeld(false);
    }, []);

    const interactDown = useCallback((e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        setAPressed(true);
        window.joypadAction = true;
    }, []);

    const interactUp = useCallback((e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        setAPressed(false);
        window.joypadAction = false;
    }, []);

    // Global release failsafe
    useEffect(() => {
        const reset = () => {
            window.joypadState = null;
            window.joypadSprint = false;
            window.joypadAction = false;
            setActiveDir(null);
            setSprintHeld(false);
            setAPressed(false);
        };
        window.addEventListener('mouseup', reset);
        window.addEventListener('touchend', reset);
        return () => {
            window.removeEventListener('mouseup', reset);
            window.removeEventListener('touchend', reset);
            window.joypadState = null;
            window.joypadSprint = false;
            window.joypadAction = false;
        };
    }, []);

    const exitScene = useCallback(() => {
        window.joypadState = null;
        window.joypadSprint = false;
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(30);
        if (window.phaserGame) {
            for (const key of ['NewWorldScene', 'WorldScene']) {
                const scene = window.phaserGame.scene.getScene(key);
                if (scene?.exitScene) { scene.exitScene(); return; }
            }
        }
        if (window.game?.exitScene) window.game.exitScene();
    }, []);

    const openStart = useCallback(() => {
        if (navigator.vibrate) navigator.vibrate(20);
        // Exit scene first, then navigate to admin
        exitScene();
        setTimeout(() => navigate('/admin'), 100);
    }, [exitScene]);

    const openSelect = useCallback(() => {
        if (navigator.vibrate) navigator.vibrate(20);
        // Exit scene first, then navigate to inventory
        exitScene();
        setTimeout(() => navigate('/inventory'), 100);
    }, [exitScene]);

    // Common touch props for D-pad buttons
    const dpadTouch = (dir) => ({
        onPointerDown: (e) => dirDown(dir, e),
        onPointerUp: dirUp,
        onPointerCancel: dirUp,
        onPointerLeave: dirUp,
    });

    return (
        <>
            {/* Art Boy shell — frosted glass controller */}
            <div className="gb-shell">
                {/* Screen label */}
                <div className="gb-screen-label">
                    <span className="gb-logo">✦ Art Boy</span>
                </div>

                {/* Controls area */}
                <div className="gb-controls">
                    {/* D-PAD — cross-shaped */}
                    <div className="gb-dpad-container">
                        <div className="gb-dpad">
                            <button
                                className={`gb-dpad-btn gb-dpad-up ${activeDir === 'UP' ? 'active' : ''}`}
                                {...dpadTouch('UP')}
                                aria-label="Up"
                            >
                                <span className="gb-arrow">▲</span>
                            </button>
                            <button
                                className={`gb-dpad-btn gb-dpad-left ${activeDir === 'LEFT' ? 'active' : ''}`}
                                {...dpadTouch('LEFT')}
                                aria-label="Left"
                            >
                                <span className="gb-arrow">◀</span>
                            </button>
                            <div className="gb-dpad-center" />
                            <button
                                className={`gb-dpad-btn gb-dpad-right ${activeDir === 'RIGHT' ? 'active' : ''}`}
                                {...dpadTouch('RIGHT')}
                                aria-label="Right"
                            >
                                <span className="gb-arrow">▶</span>
                            </button>
                            <button
                                className={`gb-dpad-btn gb-dpad-down ${activeDir === 'DOWN' ? 'active' : ''}`}
                                {...dpadTouch('DOWN')}
                                aria-label="Down"
                            >
                                <span className="gb-arrow">▼</span>
                            </button>
                        </div>
                    </div>

                    {/* A + B buttons — angled like a real Game Boy */}
                    <div className="gb-ab-container">
                        <div className="gb-ab-group">
                            <div className="gb-ab-btn-wrapper gb-b-wrapper">
                                <button
                                    className={`gb-ab-btn gb-btn-b ${sprintHeld ? 'active' : ''}`}
                                    onPointerDown={sprintDown}
                                    onPointerUp={sprintUp}
                                    onPointerCancel={sprintUp}
                                    onPointerLeave={sprintUp}
                                    aria-label="B - Sprint"
                                >B</button>
                                <span className="gb-btn-label">SPRINT</span>
                            </div>
                            <div className="gb-ab-btn-wrapper gb-a-wrapper">
                                <button
                                    className={`gb-ab-btn gb-btn-a ${aPressed ? 'active' : ''}`}
                                    onPointerDown={interactDown}
                                    onPointerUp={interactUp}
                                    onPointerCancel={interactUp}
                                    onPointerLeave={interactUp}
                                    aria-label="A - Interact"
                                >A</button>
                                <span className="gb-btn-label">ACTION</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* EXIT / SELECT / START — center pills */}
                <div className="gb-meta-row">
                    <button className="gb-meta-btn gb-meta-exit" onPointerDown={exitScene} aria-label="Exit">
                        ✕ EXIT
                    </button>
                    <button className="gb-meta-btn" onPointerDown={openSelect} aria-label="Select">
                        SELECT
                    </button>
                    <button className="gb-meta-btn" onPointerDown={openStart} aria-label="Start">
                        START
                    </button>
                </div>
            </div>

            <style>{`
                /* ── Game Boy Shell ── */
                .gb-shell {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 46vh;
                    min-height: 220px;
                    max-height: 340px;
                    background: rgba(20, 25, 30, 0.75);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    border-top: 3px solid rgba(212, 216, 220, 0.4);
                    border-radius: 20px 20px 0 0;
                    z-index: 998;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 8px 16px calc(8px + env(safe-area-inset-bottom, 0px));
                    box-shadow: 0 -4px 20px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.1);
                    touch-action: none;
                    user-select: none;
                    -webkit-user-select: none;
                }

                .gb-screen-label {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                    margin-bottom: 6px;
                }
                .gb-logo {
                    font-family: "Press Start 2P", monospace;
                    font-size: 11px;
                    color: #c9a84c;
                    letter-spacing: 3px;
                    text-transform: uppercase;
                    font-weight: bold;
                    text-shadow: 0 0 8px rgba(201, 168, 76, 0.3);
                }


                /* ── Controls Row ── */
                .gb-controls {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    max-width: 420px;
                    padding: 0 8px;
                }

                /* ── D-PAD ── */
                .gb-dpad-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .gb-dpad {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    grid-template-rows: repeat(3, 1fr);
                    width: clamp(120px, 30vw, 150px);
                    height: clamp(120px, 30vw, 150px);
                }
                .gb-dpad-btn {
                    background: rgba(45, 52, 54, 0.8);
                    border: 1px solid rgba(100, 110, 114, 0.3);
                    color: rgba(200, 200, 200, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    touch-action: none;
                    -webkit-tap-highlight-color: transparent;
                    transition: background 0.08s;
                    padding: 0;
                    margin: 0;
                }
                .gb-dpad-btn.active {
                    background: rgba(30, 39, 46, 0.9);
                }
                .gb-dpad-btn .gb-arrow {
                    font-size: clamp(12px, 3.5vw, 16px);
                    pointer-events: none;
                }

                /* Cross shape: position buttons in a + pattern */
                .gb-dpad-up {
                    grid-column: 2; grid-row: 1;
                    border-radius: 6px 6px 0 0;
                    box-shadow: 0 -2px 4px rgba(0,0,0,0.2);
                }
                .gb-dpad-left {
                    grid-column: 1; grid-row: 2;
                    border-radius: 6px 0 0 6px;
                    box-shadow: -2px 0 4px rgba(0,0,0,0.2);
                }
                .gb-dpad-center {
                    grid-column: 2; grid-row: 2;
                    background: rgba(45, 52, 54, 0.8);
                }
                .gb-dpad-right {
                    grid-column: 3; grid-row: 2;
                    border-radius: 0 6px 6px 0;
                    box-shadow: 2px 0 4px rgba(0,0,0,0.2);
                }
                .gb-dpad-down {
                    grid-column: 2; grid-row: 3;
                    border-radius: 0 0 6px 6px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                /* Empty corner cells */
                .gb-dpad > *:nth-child(n) {
                    /* Default: no background for grid gaps */
                }

                /* ── A + B Buttons ── */
                .gb-ab-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .gb-ab-group {
                    display: flex;
                    gap: clamp(12px, 4vw, 20px);
                    align-items: flex-start;
                    transform: rotate(-20deg);
                }
                .gb-ab-btn-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                }
                .gb-a-wrapper {
                    margin-top: -10px;
                }
                .gb-ab-btn {
                    width: clamp(48px, 14vw, 60px);
                    height: clamp(48px, 14vw, 60px);
                    border-radius: 50%;
                    border: none;
                    font-family: "Press Start 2P", monospace;
                    font-size: clamp(14px, 4vw, 18px);
                    font-weight: bold;
                    cursor: pointer;
                    touch-action: none;
                    -webkit-tap-highlight-color: transparent;
                    transition: background 0.08s, transform 0.08s;
                    box-shadow: 0 3px 6px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2);
                }
                .gb-btn-a {
                    background: #8b1a4a;
                    color: #dda0b8;
                }
                .gb-btn-a.active {
                    background: #6b1038;
                    transform: scale(0.94);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 4px rgba(0,0,0,0.3);
                }
                .gb-btn-b {
                    background: #8b1a4a;
                    color: #dda0b8;
                }
                .gb-btn-b.active {
                    background: #6b1038;
                    transform: scale(0.94);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 4px rgba(0,0,0,0.3);
                }
                .gb-btn-label {
                    font-family: "Press Start 2P", monospace;
                    font-size: 6px;
                    color: rgba(200, 200, 200, 0.6);
                    letter-spacing: 1px;
                    transform: rotate(20deg);
                    white-space: nowrap;
                }

                /* ── START / SELECT / EXIT ── */
                .gb-meta-row {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    align-items: center;
                    margin-top: 4px;
                    padding-bottom: 4px;
                }
                .gb-meta-btn {
                    background: rgba(60, 70, 80, 0.7);
                    border: 1px solid rgba(200, 200, 200, 0.15);
                    color: rgba(200, 200, 200, 0.8);
                    font-family: "Press Start 2P", monospace;
                    font-size: 7px;
                    letter-spacing: 1px;
                    padding: 6px 14px;
                    border-radius: 12px;
                    cursor: pointer;
                    touch-action: none;
                    -webkit-tap-highlight-color: transparent;
                    box-shadow: inset 0 -1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
                    transform: rotate(-8deg);
                }
                .gb-meta-btn:active {
                    background: rgba(40, 50, 60, 0.9);
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);
                }
                .gb-meta-exit {
                    color: rgba(255, 100, 100, 0.8);
                    border-color: rgba(255, 100, 100, 0.2);
                }

                /* ── Hide on desktop (keyboard controls suffice) ── */
                @media (min-width: 769px) {
                    .gb-shell {
                        display: none;
                    }
                }

                /* ── Extra small phones ── */
                @media (max-height: 600px) {
                    .gb-shell {
                        height: 42vh;
                        min-height: 180px;
                        padding: 4px 12px calc(4px + env(safe-area-inset-bottom, 0px));
                    }
                    .gb-screen-label { margin-bottom: 2px; }
                    .gb-meta-row { margin-top: 0; }
                }
            `}</style>
        </>
    );
}

export default MobileJoypad;
