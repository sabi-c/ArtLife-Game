/**
 * ArtnetUI.jsx — Unified Artnet Experience Flow
 *
 * Single wrapper component managing 4 animated phases:
 *   loading → login → dashboard → marketplace
 *
 * Animations inspired by Fintech Salon: smooth reveals, slide-up staggers,
 * line-draw accents, crossfade transitions.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ArtnetLogin from './ArtnetLogin.jsx';
import ArtnetMarketplace from './ArtnetMarketplace.jsx';
import { GameState } from '../managers/GameState.js';
import { MarketManager } from '../managers/MarketManager.js';
import { MarketSimulator } from '../managers/MarketSimulator.js';
import { ARTWORKS } from '../data/artworks.js';

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
        @keyframes an-week-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,75,0,0.4); }
            50% { box-shadow: 0 0 0 8px rgba(255,75,0,0); }
        }
        .an-ui-hover:hover { background: #f5f5f5 !important; }
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
// Animated line (Fintech Salon style)
// ═══════════════════════════════════════════
function AnimatedLine({ delay = 0, origin = 'left', color = '#e6e6e6' }) {
    return (
        <div style={{
            width: '100%', height: 1, background: color,
            transformOrigin: origin,
            animation: `an-line-draw 0.8s ease-out ${delay}s both`,
        }} />
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
// PHASE 3: DASHBOARD
// ═══════════════════════════════════════════
function DashboardScreen({ userEmail, onBrowseMarketplace, onLogout, onClose }) {
    const [weekAdvancing, setWeekAdvancing] = useState(false);
    const [s, setS] = useState(GameState?.state);

    // Re-read state after week advance
    const refreshState = useCallback(() => setS({ ...GameState?.state }), []);

    const portfolio = s?.portfolio || [];
    const week = s?.week || 1;
    const city = s?.currentCity || 'New York';

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

    const fmtVal = (v) => {
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
        return `$${v.toLocaleString()}`;
    };

    const handleAdvanceWeek = useCallback(() => {
        setWeekAdvancing(true);
        setTimeout(() => {
            try { GameState.advanceWeek(); } catch (e) { console.warn('advanceWeek:', e); }
            refreshState();
            setWeekAdvancing(false);
        }, 1200);
    }, [refreshState]);

    const cards = [
        { icon: '🎨', label: 'Collection', value: fmtVal(collectionValue), sub: `${portfolio.length} works`, color: '#ff4b00' },
        { icon: '📈', label: 'Market', value: `${openOrders}`, sub: 'open listings', color: '#0066cc' },
        { icon: '🖼️', label: 'Database', value: `${ARTWORKS.length}`, sub: 'artworks catalogued', color: '#2e7d32' },
    ];

    return (
        <div style={{
            position: 'absolute', inset: 0, background: '#f2f2f2',
            overflowY: 'auto', fontFamily: FONT,
        }}>
            {/* Week advance overlay */}
            {weekAdvancing && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: '#1a1a1a', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    animation: 'an-fade-in 0.3s ease-out',
                }}>
                    <div style={{
                        fontFamily: FONT, fontSize: 14, color: '#777',
                        textTransform: 'uppercase', letterSpacing: 2,
                        animation: 'an-slide-up 0.4s ease-out both',
                        marginBottom: 12,
                    }}>
                        Advancing to
                    </div>
                    <div style={{
                        fontFamily: FONT, fontSize: 48, fontWeight: 700,
                        color: '#fff', animation: 'an-slide-up 0.4s ease-out 0.15s both',
                    }}>
                        Week {week + 1}
                    </div>
                    <div style={{
                        marginTop: 20,
                        animation: 'an-fade-in 0.4s ease-out 0.3s both',
                    }}>
                        <RotatingDots size={36} color="#ff4b00" />
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{
                background: '#fff', borderBottom: '1px solid #e6e6e6',
                animation: 'an-slide-down 0.5s ease-out both',
            }}>
                <div style={{
                    maxWidth: 900, margin: '0 auto', padding: '16px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: '#231f20' }}>
                        artnet
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{
                            fontSize: 12, color: '#999', fontFamily: FONT,
                            background: '#f5f5f5', padding: '4px 10px', borderRadius: 10,
                        }}>
                            Week {week} · {city}
                        </span>
                        <span style={{ fontSize: 13, color: '#999' }}>{userEmail}</span>
                        <button onClick={onLogout} style={{
                            background: 'none', border: '1px solid #ddd', borderRadius: 4,
                            padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                            fontFamily: FONT, color: '#999',
                        }}>
                            Log Out
                        </button>
                        <button onClick={onClose} style={{
                            background: 'none', border: 'none', fontSize: 18,
                            cursor: 'pointer', color: '#ccc', padding: 0,
                        }}>✕</button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>
                {/* Welcome */}
                <div style={{ animation: 'an-slide-up 0.5s ease-out 0.1s both', marginBottom: 8 }}>
                    <div style={{ fontSize: 32, fontWeight: 300, color: '#231f20', letterSpacing: '-0.5px' }}>
                        Welcome back
                    </div>
                </div>
                <div style={{ animation: 'an-slide-up 0.5s ease-out 0.2s both', marginBottom: 28 }}>
                    <div style={{ fontSize: 14, color: '#999' }}>
                        Manage your collection, explore the market, advance the simulation
                    </div>
                </div>

                {/* Line accent */}
                <div style={{ animation: 'an-fade-in 0.5s ease-out 0.3s both', marginBottom: 24 }}>
                    <AnimatedLine delay={0.3} origin="left" />
                </div>

                {/* Stat Cards */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16, marginBottom: 28,
                }}>
                    {cards.map((card, i) => (
                        <div key={card.label} style={{
                            background: '#fff', borderRadius: 6, padding: '20px 16px',
                            animation: `an-slide-up 0.5s ease-out ${0.25 + i * 0.1}s both`,
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                            }}>
                                <span style={{ fontSize: 16 }}>{card.icon}</span>
                                <span style={{
                                    fontSize: 11, color: '#999', textTransform: 'uppercase',
                                    letterSpacing: 1, fontWeight: 500,
                                }}>{card.label}</span>
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#231f20', marginBottom: 2 }}>
                                {card.value}
                            </div>
                            <div style={{ fontSize: 12, color: '#999' }}>{card.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Primary Actions */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                    animation: 'an-slide-up 0.5s ease-out 0.55s both',
                    marginBottom: 16,
                }}>
                    {/* Browse Marketplace */}
                    <button onClick={onBrowseMarketplace} style={{
                        padding: '18px 20px', background: '#231f20', color: '#fff',
                        border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
                        fontSize: 15, fontWeight: 600, textAlign: 'left',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'background 0.2s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = '#333'}
                        onMouseLeave={e => e.currentTarget.style.background = '#231f20'}
                    >
                        <div>
                            <div>Browse Marketplace</div>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 4, fontWeight: 400 }}>
                                Search, filter, inquire
                            </div>
                        </div>
                        <span style={{ fontSize: 20 }}>→</span>
                    </button>

                    {/* Advance One Week */}
                    <button onClick={handleAdvanceWeek} disabled={weekAdvancing} style={{
                        padding: '18px 20px', background: '#fff', color: '#231f20',
                        border: '2px solid #ff4b00', borderRadius: 6, cursor: 'pointer',
                        fontFamily: FONT, fontSize: 15, fontWeight: 600, textAlign: 'left',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all 0.2s',
                        animation: 'an-week-pulse 2s ease-in-out infinite',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ff4b00'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#231f20'; }}
                    >
                        <div>
                            <div>Advance One Week</div>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 4, fontWeight: 400 }}>
                                Week {week} → Week {week + 1}
                            </div>
                        </div>
                        <span style={{ fontSize: 20 }}>⟳</span>
                    </button>
                </div>

                {/* Secondary Cards */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                    animation: 'an-slide-up 0.5s ease-out 0.65s both',
                }}>
                    <div className="an-ui-hover" style={{
                        padding: '14px 16px', background: '#fff', borderRadius: 6,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'background 0.15s',
                    }}>
                        <span style={{ fontSize: 18 }}>💰</span>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#231f20' }}>Price Database</div>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>17M+ auction results</div>
                        </div>
                    </div>
                    <div className="an-ui-hover" style={{
                        padding: '14px 16px', background: '#fff', borderRadius: 6,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'background 0.15s',
                    }}>
                        <span style={{ fontSize: 18 }}>📊</span>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#231f20' }}>Analytics</div>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Market trends & reports</div>
                        </div>
                    </div>
                </div>

                {/* Bottom line + links */}
                <div style={{
                    animation: 'an-fade-in 0.5s ease-out 0.75s both',
                    marginTop: 28,
                }}>
                    <AnimatedLine delay={0.75} origin="right" />
                    <div style={{
                        marginTop: 16, display: 'flex', gap: 20, justifyContent: 'center',
                    }}>
                        {['Saved Artworks', 'Following', 'Alerts', 'Settings'].map(link => (
                            <span key={link} style={{
                                fontSize: 12, color: '#ccc', cursor: 'pointer',
                                transition: 'color 0.15s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.color = '#231f20'}
                                onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
                            >
                                {link}
                            </span>
                        ))}
                    </div>
                </div>
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
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => { injectStyles(); }, []);

    // ESC navigation
    useEffect(() => {
        const h = (e) => {
            if (e.key === 'Escape') {
                if (phase === 'marketplace') setPhase('dashboard');
                else if (phase === 'dashboard') transitionTo('login');
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
            {/* Transition overlay */}
            {transitioning && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 99999,
                    background: '#f2f2f2',
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

            {phase === 'dashboard' && (
                <div style={{ animation: 'an-fade-in 0.3s ease-out' }}>
                    <DashboardScreen
                        userEmail={userEmail}
                        onBrowseMarketplace={() => transitionTo('marketplace')}
                        onLogout={() => transitionTo('login')}
                        onClose={onClose}
                    />
                </div>
            )}

            {phase === 'marketplace' && (
                <div style={{ animation: 'an-fade-in 0.4s ease-out' }}>
                    <ArtnetMarketplace onClose={() => setPhase('dashboard')} />
                </div>
            )}
        </div>
    );
}
