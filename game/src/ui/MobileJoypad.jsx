import React, { useEffect, useState } from 'react';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';

/**
 * MobileJoypad — floating D-pad overlay for WorldScene grid movement.
 * Communicates via window.joypadState (read by WorldScene update loop).
 * Shows only when WorldScene is active (controlled by App.jsx).
 */
export function MobileJoypad() {
    const [activeDirection, setActiveDirection] = useState(null);

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

    // Global touch/mouse release failsafe
    useEffect(() => {
        const reset = () => {
            window.joypadState = null;
            setActiveDirection(null);
        };
        window.addEventListener('mouseup', reset);
        window.addEventListener('touchend', reset);
        return () => {
            window.removeEventListener('mouseup', reset);
            window.removeEventListener('touchend', reset);
            window.joypadState = null;
        };
    }, []);

    const exitScene = () => {
        window.joypadState = null;
        // Try scene's own exit, then fall back to debug API
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
        style: btnStyle(dir, activeDirection),
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
                <button {...btnProps('UP')}>&#9650;</button>
                <div />
                <button {...btnProps('LEFT')}>&#9664;</button>
                <div style={centerStyle} />
                <button {...btnProps('RIGHT')}>&#9654;</button>
                <div />
                <button {...btnProps('DOWN')}>&#9660;</button>
                <div />
            </div>

            {/* Action button (SPACE / interact) */}
            <button
                style={actionBtnStyle}
                onPointerDown={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32 }));
                }}
                onPointerUp={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32 }));
                }}
            >
                A
            </button>

            {/* Exit button */}
            <button style={exitBtnStyle} onClick={exitScene}>
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
    bottom: '28px',
    left: '20px',
    display: 'grid',
    gridTemplateColumns: '56px 56px 56px',
    gridTemplateRows: '56px 56px 56px',
    gap: '3px',
    pointerEvents: 'auto',
    userSelect: 'none',
};

const centerStyle = {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
};

const btnStyle = (dir, active) => ({
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

const actionBtnStyle = {
    position: 'absolute',
    bottom: '48px',
    right: '28px',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(10, 10, 15, 0.7)',
    border: '2px solid rgba(255, 215, 0, 0.3)',
    color: '#ffd700',
    fontSize: '20px',
    fontFamily: '"Press Start 2P", monospace',
    fontWeight: 'bold',
    cursor: 'pointer',
    touchAction: 'none',
    pointerEvents: 'auto',
    WebkitTapHighlightColor: 'transparent',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
};

const exitBtnStyle = {
    position: 'absolute',
    top: '16px',
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
