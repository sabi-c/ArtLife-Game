/**
 * ArtnetUI.jsx — Unified Artnet Experience Flow
 *
 * Single wrapper component managing 4 animated phases:
 *   loading → login → dashboard → marketplace
 *
 * Animations: CSS keyframe rotating dots, crossfade, slide-up stagger
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ArtnetLogin from './ArtnetLogin.jsx';
import ArtnetMarketplace from './ArtnetMarketplace.jsx';
import GameState from '../managers/GameState.js';
import MarketManager from '../managers/MarketManager.js';
import MarketSimulator from '../managers/MarketSimulator.js';
import { ARTWORKS } from '../data/artworks.js';

const FONT = '"ArtnetGrotesk", "Helvetica Neue", Helvetica, Arial, sans-serif';

// ═══════════════════════════════════════════
// CSS Keyframe Animations (injected once)
// ═══════════════════════════════════════════
const STYLE_ID = 'artnet-ui-keyframes';
function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        @keyframes artnet-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes artnet-fade-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        @keyframes artnet-slide-up {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes artnet-logo-pulse {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.03); opacity: 1; }
        }
        @keyframes artnet-dot-orbit {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes artnet-dot-scale {
            0%, 100% { transform: scale(0.7); opacity: 0.4; }
            50% { transform: scale(1); opacity: 1; }
        }
        @keyframes artnet-progress-bar {
            0% { width: 0%; }
            70% { width: 85%; }
            100% { width: 100%; }
        }
        @keyframes artnet-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        @keyframes artnet-check-draw {
            from { stroke-dashoffset: 24; }
            to { stroke-dashoffset: 0; }
        }
        @keyframes artnet-card-enter {
            from { opacity: 0; transform: translateY(24px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
    `;
    document.head.appendChild(style);
}

// ═══════════════════════════════════════════
// Artnet SVG Logo (wordmark)
// ═══════════════════════════════════════════
function ArtnetWordmark({ size = 42, color = '#231f20', style = {} }) {
    return (
        <div style={{
            fontFamily: FONT, fontWeight: 700, fontSize: size,
            letterSpacing: '-0.5px', color, ...style
        }}>
            artnet
        </div>
    );
}

// ═══════════════════════════════════════════
// Rotating Dots Loader (SmoothMotion-inspired)
// ═══════════════════════════════════════════
function RotatingDots({ size = 48, color = '#ff4b00' }) {
    const dotCount = 8;
    const radius = size / 2 - 5;
    return (
        <div style={{
            width: size, height: size, position: 'relative',
            animation: 'artnet-dot-orbit 1.2s linear infinite',
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
                        opacity: 0.3 + (i / dotCount) * 0.7,
                        animation: `artnet-dot-scale 1.2s ease-in-out ${i * 0.1}s infinite`,
                    }} />
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════
// PHASE 1 — LOADING SCREEN
// ═══════════════════════════════════════════
function LoadingScreen({ onComplete }) {
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('Connecting to artnet...');

    useEffect(() => {
        const steps = [
            { at: 400, text: 'Loading database...' },
            { at: 1000, text: 'Fetching market data...' },
            { at: 1600, text: 'Preparing interface...' },
            { at: 2200, text: 'Ready' },
        ];
        const timers = steps.map(s =>
            setTimeout(() => setStatusText(s.text), s.at)
        );
        const progressTimer = setInterval(() => {
            setProgress(p => Math.min(p + 2, 100));
        }, 50);
        const done = setTimeout(() => onComplete(), 2800);
        return () => {
            timers.forEach(clearTimeout);
            clearInterval(progressTimer);
            clearTimeout(done);
        };
    }, [onComplete]);

    return (
        <div style={{
            position: 'absolute', inset: 0,
            background: '#1a1a1a',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            animation: 'artnet-fade-in 0.4s ease-out',
        }}>
            {/* Logo */}
            <div style={{ animation: 'artnet-logo-pulse 2s ease-in-out infinite', marginBottom: 32 }}>
                <ArtnetWordmark size={56} color="#fff" />
            </div>

            {/* Rotating dots */}
            <RotatingDots size={52} color="#ff4b00" />

            {/* Status text */}
            <div style={{
                marginTop: 28, fontSize: 14, color: '#999',
                fontFamily: FONT, letterSpacing: 0.5,
                transition: 'opacity 0.3s',
            }}>
                {statusText}
            </div>

            {/* Progress bar */}
            <div style={{
                marginTop: 20, width: 220, height: 2,
                background: '#333', borderRadius: 1, overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%', background: '#ff4b00',
                    borderRadius: 1,
                    width: `${progress}%`,
                    transition: 'width 0.15s ease-out',
                }} />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// PHASE 3 — DASHBOARD
// ═══════════════════════════════════════════
function DashboardScreen({ userEmail, onBrowseMarketplace, onLogout, onClose }) {
    const s = GameState?.state;
    const portfolio = s?.portfolio || [];

    // Stats
    const collectionValue = useMemo(() => {
        return portfolio.reduce((sum, w) => {
            try { return sum + (MarketManager.calculatePrice?.(w, false) || w.basePrice || 0); }
            catch { return sum + (w.basePrice || 0); }
        }, 0);
    }, [portfolio]);

    const openOrders = useMemo(() => {
        try { return MarketSimulator.getOpenSellOrders?.()?.length || 0; }
        catch { return 0; }
    }, []);

    const totalArtworks = ARTWORKS.length;

    const fmtVal = (v) => {
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
        return `$${v.toLocaleString()}`;
    };

    const cards = [
        {
            icon: '🎨', label: 'Collection Value',
            value: fmtVal(collectionValue),
            sub: `${portfolio.length} works`,
            color: '#ff4b00',
        },
        {
            icon: '📈', label: 'Market Activity',
            value: `${openOrders}`,
            sub: 'open listings',
            color: '#0066cc',
        },
        {
            icon: '🖼️', label: 'Database',
            value: `${totalArtworks}`,
            sub: 'artworks catalogued',
            color: '#2e7d32',
        },
    ];

    return (
        <div style={{
            position: 'absolute', inset: 0,
            background: '#f2f2f2',
            animation: 'artnet-fade-in 0.5s ease-out',
            overflowY: 'auto',
        }}>
            {/* Header */}
            <div style={{
                background: '#fff', borderBottom: '1px solid #e6e6e6',
                padding: '20px 32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <ArtnetWordmark size={28} />
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#999', fontFamily: FONT }}>
                        {userEmail}
                    </span>
                    <button
                        onClick={onLogout}
                        style={{
                            background: 'none', border: '1px solid #ccc', borderRadius: 4,
                            padding: '6px 14px', fontSize: 13, cursor: 'pointer',
                            fontFamily: FONT, color: '#666',
                        }}
                    >
                        Log Out
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', fontSize: 20,
                            cursor: 'pointer', color: '#999', padding: 0,
                        }}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Welcome */}
            <div style={{
                maxWidth: 900, margin: '0 auto', padding: '40px 24px',
            }}>
                <div style={{
                    animation: 'artnet-slide-up 0.5s ease-out',
                    marginBottom: 32,
                }}>
                    <div style={{
                        fontSize: 28, fontWeight: 300, color: '#231f20',
                        fontFamily: FONT, marginBottom: 8,
                    }}>
                        Welcome back
                    </div>
                    <div style={{
                        fontSize: 14, color: '#999', fontFamily: FONT,
                    }}>
                        Your artnet dashboard — manage your collection, explore the market
                    </div>
                </div>

                {/* Stat Cards */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 16, marginBottom: 40,
                }}>
                    {cards.map((card, i) => (
                        <div key={card.label} style={{
                            background: '#fff', borderRadius: 8, padding: '24px 20px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            animation: `artnet-card-enter 0.5s ease-out ${0.1 + i * 0.12}s both`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <span style={{ fontSize: 20 }}>{card.icon}</span>
                                <span style={{ fontSize: 12, color: '#999', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    {card.label}
                                </span>
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 700, color: '#231f20', fontFamily: FONT, marginBottom: 4 }}>
                                {card.value}
                            </div>
                            <div style={{ fontSize: 13, color: '#999', fontFamily: FONT }}>
                                {card.sub}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div style={{
                    animation: `artnet-card-enter 0.5s ease-out 0.5s both`,
                }}>
                    <button
                        onClick={onBrowseMarketplace}
                        style={{
                            width: '100%', padding: '20px 24px',
                            background: '#231f20', color: '#fff', border: 'none',
                            borderRadius: 8, cursor: 'pointer', fontFamily: FONT,
                            fontSize: 16, fontWeight: 700, letterSpacing: 0.5,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'background 0.2s',
                            marginBottom: 12,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#333'}
                        onMouseLeave={e => e.currentTarget.style.background = '#231f20'}
                    >
                        <span>Browse Marketplace</span>
                        <span style={{ fontSize: 18 }}>→</span>
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <button
                            onClick={() => { }}
                            style={{
                                padding: '16px 20px',
                                background: '#fff', color: '#231f20',
                                border: '1px solid #e6e6e6', borderRadius: 8,
                                cursor: 'pointer', fontFamily: FONT,
                                fontSize: 14, fontWeight: 400,
                                display: 'flex', alignItems: 'center', gap: 10,
                                transition: 'border-color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#999'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e6e6e6'}
                        >
                            <span style={{ fontSize: 18 }}>💰</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600 }}>Price Database</div>
                                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>17M+ auction results</div>
                            </div>
                        </button>
                        <button
                            onClick={() => { }}
                            style={{
                                padding: '16px 20px',
                                background: '#fff', color: '#231f20',
                                border: '1px solid #e6e6e6', borderRadius: 8,
                                cursor: 'pointer', fontFamily: FONT,
                                fontSize: 14, fontWeight: 400,
                                display: 'flex', alignItems: 'center', gap: 10,
                                transition: 'border-color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#999'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e6e6e6'}
                        >
                            <span style={{ fontSize: 18 }}>📊</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600 }}>Analytics</div>
                                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Market trends & reports</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Quick Links */}
                <div style={{
                    marginTop: 32, padding: '20px 0',
                    borderTop: '1px solid #e6e6e6',
                    display: 'flex', gap: 24, justifyContent: 'center',
                    animation: `artnet-card-enter 0.5s ease-out 0.6s both`,
                }}>
                    {['Saved Artworks', 'Following', 'Alerts', 'Settings'].map(link => (
                        <span key={link} style={{
                            fontSize: 13, color: '#999', cursor: 'pointer',
                            fontFamily: FONT,
                            transition: 'color 0.15s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.color = '#231f20'}
                            onMouseLeave={e => e.currentTarget.style.color = '#999'}
                        >
                            {link}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN WRAPPER — ArtnetUI
// ═══════════════════════════════════════════
export default function ArtnetUI({ onClose }) {
    const [phase, setPhase] = useState('loading'); // loading | login | dashboard | marketplace
    const [transitioning, setTransitioning] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => { injectStyles(); }, []);

    // ESC handler
    useEffect(() => {
        const h = (e) => {
            if (e.key === 'Escape') {
                if (phase === 'marketplace') setPhase('dashboard');
                else if (phase === 'dashboard') setPhase('login');
                else onClose();
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [phase, onClose]);

    // Smooth transition helper
    const transitionTo = useCallback((nextPhase) => {
        setTransitioning(true);
        setTimeout(() => {
            setPhase(nextPhase);
            setTransitioning(false);
        }, 350);
    }, []);

    // Login success handler
    const handleLoginSuccess = useCallback((data) => {
        setUserEmail(data?.email || 'user@artnet.com');
        transitionTo('dashboard');
    }, [transitionTo]);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9500,
            background: phase === 'loading' ? '#1a1a1a' : '#f2f2f2',
            fontFamily: FONT,
            transition: 'background 0.4s ease',
        }}>
            {/* Transition fade overlay */}
            {transitioning && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 99999,
                    background: phase === 'loading' ? '#1a1a1a' : '#f2f2f2',
                    animation: 'artnet-fade-in 0.35s ease-out',
                }} />
            )}

            {/* Phase: Loading */}
            {phase === 'loading' && (
                <LoadingScreen onComplete={() => transitionTo('login')} />
            )}

            {/* Phase: Login */}
            {phase === 'login' && (
                <div style={{ animation: 'artnet-fade-in 0.4s ease-out' }}>
                    <ArtnetLogin
                        onClose={onClose}
                        onLoginSuccess={handleLoginSuccess}
                    />
                </div>
            )}

            {/* Phase: Dashboard */}
            {phase === 'dashboard' && (
                <DashboardScreen
                    userEmail={userEmail}
                    onBrowseMarketplace={() => transitionTo('marketplace')}
                    onLogout={() => transitionTo('login')}
                    onClose={onClose}
                />
            )}

            {/* Phase: Marketplace */}
            {phase === 'marketplace' && (
                <div style={{ animation: 'artnet-fade-in 0.4s ease-out' }}>
                    <ArtnetMarketplace
                        onClose={() => setPhase('dashboard')}
                    />
                </div>
            )}
        </div>
    );
}
