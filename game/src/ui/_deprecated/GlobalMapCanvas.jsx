import React, { useState, useEffect } from 'react';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { GameState } from '../managers/GameState.js';

// Coordinates scaled implicitly to the SVG viewBox (which we use as a base)
// We will use percentage-based positioning for responsive sizing over the SVG.
const CITIES = {
    'new-york': { name: 'New York', top: '35%', left: '26%' },
    'los-angeles': { name: 'Los Angeles', top: '38%', left: '16%' },
    'miami': { name: 'Miami', top: '44%', left: '27%' },
    'london': { name: 'London', top: '28%', left: '48%' },
    'paris': { name: 'Paris', top: '31%', left: '49%' },
    'berlin': { name: 'Berlin', top: '27%', left: '52%' },
    'switzerland': { name: 'Zurich', top: '32%', left: '51%' },
    'hong-kong': { name: 'Hong Kong', top: '45%', left: '81%' },
};

export default function GlobalMapCanvas({ onClose }) {
    const [currentCity, setCurrentCity] = useState('new-york');
    const [visible, setVisible] = useState(false);
    const [targetCity, setTargetCity] = useState(null);

    useEffect(() => {
        // Init from GameState
        if (window._artLifeState && window._artLifeState.currentCity) {
            setCurrentCity(window._artLifeState.currentCity);
        }

        // slight delay for fade-in effect
        requestAnimationFrame(() => setVisible(true));

        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleCityClick = (cityKey) => {
        if (cityKey === currentCity || targetCity) return; // already here or traveling
        setTargetCity(cityKey);
        // Simulate travel time
        setTimeout(() => {
            // Deduct cost and update state logic here normally
            // For now, just update local state
            setCurrentCity(cityKey);
            setTargetCity(null);
        }, 1200);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99990,
            background: 'rgba(0,0,0,0.85)',
            opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden'
        }}>
            {/* The SVG Map Background */}
            <div style={{
                position: 'relative',
                width: '90%', height: '80%',
                maxWidth: 1600,
                // Make the map look like Uplink's cyan radar grid
                filter: 'invert(1) sepia(1) saturate(5) hue-rotate(130deg) brightness(0.8) contrast(2)',
                background: 'url(/assets/world_map.svg) center/contain no-repeat',
                opacity: 0.6
            }}>
                {/* Connection Line layer */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    {targetCity && (
                        <ConnectionLine
                            from={CITIES[currentCity]}
                            to={CITIES[targetCity]}
                        />
                    )}
                </svg>

                {/* City Nodes */}
                {Object.entries(CITIES).map(([key, data]) => (
                    <div key={key}
                        onClick={() => handleCityClick(key)}
                        style={{
                            position: 'absolute',
                            top: data.top, left: data.left,
                            transform: 'translate(-50%, -50%)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            cursor: key !== currentCity ? 'crosshair' : 'default',
                            zIndex: 2,
                        }}>
                        <div style={{
                            width: 12, height: 12,
                            background: key === currentCity ? 'var(--fg)' : key === targetCity ? 'var(--gold)' : 'transparent',
                            border: `2px solid ${key === currentCity ? 'var(--fg)' : 'var(--border)'}`,
                            boxShadow: key === currentCity ? '0 0 10px var(--fg)' : 'none',
                            transform: 'rotate(45deg)', // Diamond shape
                            transition: 'all 0.2s ease',
                        }} />
                        <span style={{
                            marginTop: 6,
                            color: key === currentCity ? 'var(--fg)' : 'var(--dim)',
                            fontFamily: 'var(--font)', fontSize: 11,
                            fontWeight: 'bold', textTransform: 'uppercase',
                            textShadow: '0 0 4px #000, 0 0 4px #000',
                            opacity: (key === currentCity || key === targetCity) ? 1 : 0.6
                        }}>
                            {data.name}
                        </span>
                    </div>
                ))}
            </div>

            {/* Header / Info Panel */}
            <div style={{
                position: 'absolute', top: 30, left: 30,
                color: 'var(--fg)', fontFamily: 'var(--font)',
                textTransform: 'uppercase', letterSpacing: '2px',
            }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--gold)', textShadow: '0 0 10px var(--gold)' }}>
                    GLOBAL NETWORK_
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 8 }}>
                    ESTABLISHED CONNECTIONS: {Object.keys(CITIES).length} <br />
                    ACTIVE NODE: {CITIES[currentCity]?.name}
                </div>
            </div>

            <button onClick={onClose} style={{
                position: 'absolute', top: 30, right: 30,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--dim)', padding: '6px 12px', cursor: 'pointer',
                fontFamily: 'var(--font)', textTransform: 'uppercase'
            }}>
                [ DISCONNECT ]
            </button>
        </div>
    );
}

function ConnectionLine({ from, to, isGhost = false }) {
    // Basic straight line animation for the connection
    return (
        <line
            x1={from.left} y1={from.top}
            x2={to.left} y2={to.top}
            stroke={isGhost ? "var(--green)" : "var(--gold)"}
            strokeWidth={isGhost ? "1" : "2"}
            strokeDasharray={isGhost ? "4 4" : "10 5"}
            style={{
                filter: `drop-shadow(0 0 ${isGhost ? 2 : 4}px ${isGhost ? 'var(--green)' : 'var(--gold)'})`,
                animation: `dashTrace ${isGhost ? '2.5s' : '1.2s'} linear forwards`,
                opacity: isGhost ? 0.3 : 1
            }}
        />
    );
}
