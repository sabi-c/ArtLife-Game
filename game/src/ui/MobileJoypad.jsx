import React, { useEffect, useState } from 'react';

/**
 * MobileJoypad
 * A CSS-styled floating D-pad overlay that communicates via global window variables
 * to drive GridEngine movement in WorldScene.js.
 */
export function MobileJoypad() {
    const [activeDirection, setActiveDirection] = useState(null);

    const handleDown = (dir, e) => {
        if (e) e.preventDefault(); // Prevent touch-scroll on mobile
        window.joypadState = dir;
        setActiveDirection(dir);
    };

    const handleUp = (e) => {
        if (e) e.preventDefault();
        window.joypadState = null;
        setActiveDirection(null);
    };

    // Failsafe: if touch is canceled/leaves the button, halt movement.
    useEffect(() => {
        const resetOnUp = () => handleUp();
        window.addEventListener('mouseup', resetOnUp);
        window.addEventListener('touchend', resetOnUp);
        return () => {
            window.removeEventListener('mouseup', resetOnUp);
            window.removeEventListener('touchend', resetOnUp);
        };
    }, []);

    // Basic retro gameboy-style styling
    const joypadStyle = {
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        zIndex: 1000,
        display: 'grid',
        gridTemplateColumns: '50px 50px 50px',
        gridTemplateRows: '50px 50px 50px',
        gap: '4px',
        userSelect: 'none'
    };

    const btnStyle = (dir) => ({
        backgroundColor: activeDirection === dir ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        color: '#fff',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '18px',
        cursor: 'pointer',
        touchAction: 'none' // Critical for preventing default browser pan/zoom
    });

    const exitBtnStyle = {
        position: 'absolute',
        top: '24px',
        right: '24px',
        zIndex: 1000,
        backgroundColor: 'rgba(200, 0, 0, 0.8)',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '16px',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        fontFamily: 'monospace'
    };

    return (
        <>
            <div style={joypadStyle}>
                <div />
                <button
                    style={btnStyle('UP')}
                    onPointerDown={(e) => handleDown('UP', e)}
                    onPointerUp={handleUp}
                    onPointerCancel={handleUp}
                    onPointerLeave={handleUp}>
                    W
                </button>
                <div />
                <button
                    style={btnStyle('LEFT')}
                    onPointerDown={(e) => handleDown('LEFT', e)}
                    onPointerUp={handleUp}
                    onPointerCancel={handleUp}
                    onPointerLeave={handleUp}>
                    A
                </button>
                <button
                    style={{ ...btnStyle('DOWN'), gridRow: 3, gridColumn: 2 }}
                    onPointerDown={(e) => handleDown('DOWN', e)}
                    onPointerUp={handleUp}
                    onPointerCancel={handleUp}
                    onPointerLeave={handleUp}>
                    S
                </button>
                <button
                    style={btnStyle('RIGHT')}
                    onPointerDown={(e) => handleDown('RIGHT', e)}
                    onPointerUp={handleUp}
                    onPointerCancel={handleUp}
                    onPointerLeave={handleUp}>
                    D
                </button>
            </div>

            <button
                style={exitBtnStyle}
                onClick={() => {
                    if (window.game && window.game.exitScene) {
                        window.game.exitScene();
                    }
                }}>
                [X] EXIT SIMULATION
            </button>
        </>
    );
}

export default MobileJoypad;
