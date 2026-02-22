import React, { useEffect, useState } from 'react';

/**
 * MobileJoypad v2 — floating D-pad + action buttons for WorldScene.
 *
 * Layout:
 *   [D-pad bottom-left]     [B sprint] [A interact] [bottom-right]
 *   [EXIT top-right]
 *
 * Communication:
 *   - window.joypadState = 'UP'|'DOWN'|'LEFT'|'RIGHT'|null  (direction)
 *   - window.joypadSprint = true|false  (B button held)
 *   - A button dispatches SPACE KeyboardEvent (interact/advance dialog)
 */
export function MobileJoypad() {
    const [activeDirection, setActiveDirection] = useState(null);
    const [sprintHeld, setSprintHeld] = useState(false);

    const handleDown = (dir, e) => {
        if (e) e.preventDefault();
        window.joypadState = dir;
        setActiveDirection(dir);
    };

    const handleUp = (e) => {
        if (e) e.preventDefault();
        window.joypadState = null;
        setActiveDirection(null);
    };

    const handleSprintDown = (e) => {
        if (e) e.preventDefault();
        window.joypadSprint = true;
        setSprintHeld(true);
    };

    const handleSprintUp = (e) => {
        if (e) e.preventDefault();
        window.joypadSprint = false;
        setSprintHeld(false);
    };

    // Global release failsafe
    useEffect(() => {
        const reset = () => {
            window.joypadState = null;
            window.joypadSprint = false;
            setActiveDirection(null);
            setSprintHeld(false);
        };
        window.addEventListener('mouseup', reset);
        window.addEventListener('touchend', reset);
        return () => {
            window.removeEventListener('mouseup', reset);
            window.removeEventListener('touchend', reset);
            window.joypadState = null;
            window.joypadSprint = false;
        };
    }, []);

    const exitScene = () => {
        window.joypadState = null;
        window.joypadSprint = false;
        if (window.phaserGame) {
            const scene = window.phaserGame.scene.getScene('WorldScene');
            if (scene?.exitScene) {
                scene.exitScene();
                return;
            }
        }
        if (window.game?.exitScene) window.game.exitScene();
    };

    const btnProps = (dir) => ({
        style: dpadBtnStyle(dir, activeDirection),
        onPointerDown: (e) => handleDown(dir, e),
        onPointerUp: handleUp,
        onPointerCancel: handleUp,
        onPointerLeave: handleUp,
    });

    return (
        <div style={overlayStyle}>
            {/* D-pad — 3x3 grid, arrows in cross pattern */}
            <div style={padStyle}>
                <div />
                <button {...btnProps('UP')}>{'\u25B2'}</button>
                <div />
                <button {...btnProps('LEFT')}>{'\u25C0'}</button>
                <div style={centerStyle} />
                <button {...btnProps('RIGHT')}>{'\u25B6'}</button>
                <div />
                <button {...btnProps('DOWN')}>{'\u25BC'}</button>
                <div />
            </div>

            {/* Action buttons — B (sprint) + A (interact) */}
            <div style={actionGroupStyle}>
                <button
                    style={sprintBtnStyle(sprintHeld)}
                    onPointerDown={handleSprintDown}
                    onPointerUp={handleSprintUp}
                    onPointerCancel={handleSprintUp}
                    onPointerLeave={handleSprintUp}
                >
                    B
                </button>
                <button
                    style={actionBtnStyle}
                    onPointerDown={(e) => {
                        e.preventDefault();
                        window.dispatchEvent(new KeyboardEvent('keydown', {
                            key: ' ', code: 'Space', keyCode: 32,
                        }));
                    }}
                    onPointerUp={(e) => {
                        e.preventDefault();
                        window.dispatchEvent(new KeyboardEvent('keyup', {
                            key: ' ', code: 'Space', keyCode: 32,
                        }));
                    }}
                >
                    A
                </button>
            </div>

            {/* Exit button */}
            <button style={exitBtnStyle} onPointerDown={exitScene}>
                EXIT
            </button>
        </div>
    );
}

// ── Styles ──

const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 999,
    pointerEvents: 'none',
};

const padStyle = {
    position: 'absolute',
    bottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
    left: '20px',
    display: 'grid',
    gridTemplateColumns: 'clamp(44px, 12vw, 64px) clamp(44px, 12vw, 64px) clamp(44px, 12vw, 64px)',
    gridTemplateRows: 'clamp(44px, 12vw, 64px) clamp(44px, 12vw, 64px) clamp(44px, 12vw, 64px)',
    gap: '3px',
    pointerEvents: 'auto',
    userSelect: 'none',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    padding: '4px',
};

const centerStyle = {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
};

const dpadBtnStyle = (dir, active) => ({
    background: active === dir ? 'rgba(255, 215, 0, 0.4)' : 'rgba(10, 10, 15, 0.7)',
    border: active === dir ? '2px solid rgba(255, 215, 0, 0.6)' : '2px solid rgba(255, 255, 255, 0.15)',
    color: active === dir ? '#ffd700' : '#cccccc',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    touchAction: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: 'background 0.1s, border-color 0.1s',
});

const actionGroupStyle = {
    position: 'absolute',
    bottom: 'calc(36px + env(safe-area-inset-bottom, 0px))',
    right: '20px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    pointerEvents: 'auto',
    userSelect: 'none',
};

const actionBtnBase = {
    width: 'clamp(48px, 14vw, 64px)',
    height: 'clamp(48px, 14vw, 64px)',
    borderRadius: '50%',
    fontSize: 'clamp(14px, 4vw, 18px)',
    fontFamily: '"Press Start 2P", monospace',
    fontWeight: 'bold',
    cursor: 'pointer',
    touchAction: 'none',
    WebkitTapHighlightColor: 'transparent',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const actionBtnStyle = {
    ...actionBtnBase,
    background: 'rgba(10, 10, 15, 0.7)',
    border: '2px solid rgba(255, 215, 0, 0.3)',
    color: '#ffd700',
};

const sprintBtnStyle = (active) => ({
    ...actionBtnBase,
    width: 'clamp(40px, 12vw, 56px)',
    height: 'clamp(40px, 12vw, 56px)',
    fontSize: 'clamp(11px, 3vw, 14px)',
    background: active ? 'rgba(100, 200, 255, 0.4)' : 'rgba(10, 10, 15, 0.7)',
    border: active ? '2px solid rgba(100, 200, 255, 0.6)' : '2px solid rgba(255, 255, 255, 0.15)',
    color: active ? '#64c8ff' : '#999999',
});

const exitBtnStyle = {
    position: 'absolute',
    top: 'calc(16px + env(safe-area-inset-top, 0px))',
    right: '16px',
    padding: '10px 20px',
    borderRadius: '6px',
    background: 'rgba(180, 40, 40, 0.85)',
    border: '1px solid rgba(255, 100, 100, 0.3)',
    color: '#ffffff',
    fontSize: '11px',
    fontFamily: '"Press Start 2P", monospace',
    letterSpacing: '1px',
    cursor: 'pointer',
    pointerEvents: 'auto',
    WebkitTapHighlightColor: 'transparent',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
};

export default MobileJoypad;
