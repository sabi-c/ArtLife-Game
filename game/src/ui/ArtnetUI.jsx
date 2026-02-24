/**
 * ArtnetUI.jsx — Unified Artnet Experience Flow
 *
 * Single wrapper component managing 3 animated phases:
 *   loading → login → bloomberg terminal
 *
 * After the Artnet loading screen and login, the user lands on the
 * existing Bloomberg Terminal — the game's main trading interface.
 *
 * Animations inspired by Fintech Salon: smooth reveals, slide-up staggers,
 * line-draw accents, crossfade transitions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import ArtnetLogin from './ArtnetLogin.jsx';
import BloombergTerminal from './BloombergTerminal.jsx';

const FONT = '"ArtnetGrotesk", "Helvetica Neue", Helvetica, Arial, sans-serif';

// ═══════════════════════════════════════════
// CSS Keyframe Animations
// ═══════════════════════════════════════════
const STYLE_ID = 'artnet-ui-keyframes';
function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        @keyframes an-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes an-slide-up {
            from { opacity: 0; transform: translateY(2rem); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes an-slide-down {
            from { opacity: 0; transform: translateY(-1rem); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes an-scale-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes an-logo-pulse {
            0%, 100% { opacity: 0.85; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.02); }
        }
        @keyframes an-dot-orbit {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes an-dot-scale {
            0%, 100% { transform: scale(0.6); opacity: 0.3; }
            50% { transform: scale(1); opacity: 1; }
        }
        @keyframes an-line-draw {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
        }
        @keyframes an-progress {
            0% { width: 0%; }
            60% { width: 80%; }
            100% { width: 100%; }
        }
        @keyframes an-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
    `;
    document.head.appendChild(style);
}

// ═══════════════════════════════════════════
// Rotating Dots Loader
// ═══════════════════════════════════════════
function RotatingDots({ size = 48, color = '#ff4b00' }) {
    const dotCount = 8;
    const radius = size / 2 - 4;
    return (
        <div style={{
            width: size, height: size, position: 'relative',
            animation: 'an-dot-orbit 1.2s linear infinite',
        }}>
            {Array.from({ length: dotCount }).map((_, i) => {
                const angle = (i / dotCount) * Math.PI * 2;
                const x = size / 2 + Math.cos(angle) * radius - 3;
                const y = size / 2 + Math.sin(angle) * radius - 3;
                return (
                    <div key={i} style={{
                        position: 'absolute', left: x, top: y,
                        width: 6, height: 6, borderRadius: '50%',
                        background: color,
                        animation: `an-dot-scale 1.2s ease-in-out ${i * 0.12}s infinite`,
                    }} />
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════
// PHASE 1: LOADING
// ═══════════════════════════════════════════
function LoadingScreen({ onComplete }) {
    const [status, setStatus] = useState('Connecting to artnet...');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const steps = [
            { at: 500, text: 'Loading price database...' },
            { at: 1200, text: 'Fetching market data...' },
            { at: 1800, text: 'Preparing interface...' },
            { at: 2400, text: 'Ready' },
        ];
        const timers = steps.map(s => setTimeout(() => setStatus(s.text), s.at));
        const prog = setInterval(() => setProgress(p => Math.min(p + 1.5, 100)), 40);
        const done = setTimeout(onComplete, 2800);
        return () => { timers.forEach(clearTimeout); clearInterval(prog); clearTimeout(done); };
    }, [onComplete]);

    return (
        <div style={{
            position: 'absolute', inset: 0, background: '#1a1a1a',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            animation: 'an-fade-in 0.4s ease-out',
        }}>
            {/* Logo */}
            <div style={{
                animation: 'an-logo-pulse 2.5s ease-in-out infinite',
                marginBottom: 36,
            }}>
                <div style={{
                    fontFamily: FONT, fontWeight: 700, fontSize: 52,
                    color: '#fff', letterSpacing: '-0.5px',
                    animation: 'an-slide-down 0.6s ease-out both',
                }}>
                    artnet
                </div>
            </div>

            {/* Dots */}
            <div style={{ animation: 'an-fade-in 0.4s ease-out 0.3s both' }}>
                <RotatingDots size={48} color="#ff4b00" />
            </div>

            {/* Status */}
            <div style={{
                marginTop: 28, fontSize: 13, color: '#777',
                fontFamily: FONT, letterSpacing: 0.5,
                animation: 'an-fade-in 0.4s ease-out 0.5s both',
                transition: 'opacity 0.2s',
            }}>
                {status}
            </div>

            {/* Progress bar */}
            <div style={{
                marginTop: 20, width: 200, height: 2,
                background: '#333', borderRadius: 1, overflow: 'hidden',
                animation: 'an-fade-in 0.4s ease-out 0.6s both',
            }}>
                <div style={{
                    height: '100%', background: '#ff4b00', borderRadius: 1,
                    width: `${progress}%`, transition: 'width 0.1s linear',
                }} />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN: ArtnetUI
// ═══════════════════════════════════════════
export default function ArtnetUI({ onClose }) {
    const [phase, setPhase] = useState('loading');
    const [transitioning, setTransitioning] = useState(false);

    useEffect(() => { injectStyles(); }, []);

    // ESC navigation
    useEffect(() => {
        const h = (e) => {
            if (e.key === 'Escape') {
                if (phase === 'bloomberg') transitionTo('login');
                else onClose();
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [phase, onClose]);

    const transitionTo = useCallback((next) => {
        setTransitioning(true);
        setTimeout(() => {
            setPhase(next);
            setTransitioning(false);
        }, 300);
    }, []);

    const handleLoginSuccess = useCallback(() => {
        transitionTo('bloomberg');
    }, [transitionTo]);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9500,
            background: phase === 'loading' ? '#1a1a1a' : '#0d1117',
            fontFamily: FONT,
            transition: 'background 0.4s ease',
        }}>
            {/* Transition overlay */}
            {transitioning && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 99999,
                    background: '#0d1117',
                    animation: 'an-fade-in 0.3s ease-out',
                }} />
            )}

            {phase === 'loading' && (
                <LoadingScreen onComplete={() => transitionTo('login')} />
            )}

            {phase === 'login' && (
                <div style={{ animation: 'an-fade-in 0.4s ease-out' }}>
                    <ArtnetLogin onClose={onClose} onLoginSuccess={handleLoginSuccess} />
                </div>
            )}

            {phase === 'bloomberg' && (
                <div style={{ animation: 'an-fade-in 0.3s ease-out', position: 'absolute', inset: 0 }}>
                    <BloombergTerminal onClose={onClose} />
                </div>
            )}
        </div>
    );
}

