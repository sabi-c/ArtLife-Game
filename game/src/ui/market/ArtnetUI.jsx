/**
 * ArtnetUI.jsx — Unified Artnet Experience Flow
 *
 * Single wrapper component managing 6 animated phases:
 *   loading → login → bloomberg ↔ marketplace
 *                         ↕
 *                  artist_detail
 *                         ↕
 *                   gallery_view
 *
 * After the Artnet loading screen and login, the user lands on the
 * Bloomberg Terminal. From there they can navigate to the Artnet
 * Marketplace search page, artist detail pages, or gallery pages.
 *
 * Animations inspired by Fintech Salon: smooth reveals, slide-up staggers,
 * line-draw accents, crossfade transitions.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ArtnetLogin from '../boot/ArtnetLogin.jsx';
import BloombergTerminal from './BloombergTerminal.jsx';
import ArtnetMarketplace from './ArtnetMarketplace.jsx';
import { ARTISTS } from '../../data/artists.js';
import { VENUES } from '../../data/rooms.js';
import { fmtMoney } from '../../utils/formatMoney.js';

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
            from { opacity: 0; transform: scale(0.97); }
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
        @keyframes an-slide-in-right {
            from { opacity: 0; transform: translateX(40px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes an-slide-in-left {
            from { opacity: 0; transform: translateX(-40px); }
            to { opacity: 1; transform: translateX(0); }
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
// SUB-PAGE: Artist Detail
// ═══════════════════════════════════════════
const TIER_COLORS = {
    'emerging': '#50c878',
    'hot': '#ff4b00',
    'mid-career': '#c9a84c',
    'blue-chip': '#4a90d9',
};

function ArtistDetailPage({ artistId, onBack }) {
    const artist = useMemo(() => ARTISTS.find(a => a.id === artistId) || ARTISTS[0], [artistId]);
    const tierColor = TIER_COLORS[artist.tier] || '#888';
    const priceRange = `${fmtMoney(artist.basePriceMin)} – ${fmtMoney(artist.basePriceMax)}`;

    return (
        <div style={{
            position: 'absolute', inset: 0, background: '#0d1117',
            color: '#e0e0e0', fontFamily: FONT, overflow: 'auto',
            animation: 'an-slide-in-right 0.4s cubic-bezier(0.16,1,0.3,1) both',
        }}>
            {/* Top bar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderBottom: '1px solid #1e293b',
            }}>
                <button onClick={onBack} style={{
                    background: 'none', border: '1px solid #333', color: '#999',
                    padding: '6px 16px', cursor: 'pointer', fontFamily: FONT,
                    fontSize: 12, letterSpacing: '0.05em',
                }}>
                    ← BACK TO TERMINAL
                </button>
                <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.15em' }}>
                    ARTNET / ARTIST
                </div>
            </div>

            {/* Hero section */}
            <div style={{ padding: '40px 48px 32px' }}>
                <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
                    {/* Artist avatar placeholder */}
                    <div style={{
                        width: 140, height: 140, borderRadius: 8,
                        background: `linear-gradient(135deg, ${tierColor}33, ${tierColor}11)`,
                        border: `1px solid ${tierColor}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 48, color: tierColor, flexShrink: 0,
                        animation: 'an-scale-in 0.5s ease-out 0.1s both',
                    }}>
                        {artist.name.charAt(0)}
                    </div>

                    <div style={{ flex: 1, animation: 'an-slide-up 0.5s ease-out 0.15s both' }}>
                        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
                            {artist.name}
                        </h1>
                        <div style={{ marginTop: 8, fontSize: 14, color: '#888' }}>
                            {artist.medium}
                        </div>
                        <div style={{ marginTop: 16, fontSize: 15, color: '#aaa', lineHeight: 1.6, maxWidth: 600 }}>
                            {artist.flavor}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats grid */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 1, margin: '0 48px', background: '#1e293b', borderRadius: 8,
                overflow: 'hidden', animation: 'an-slide-up 0.5s ease-out 0.25s both',
            }}>
                {[
                    { label: 'TIER', value: artist.tier.toUpperCase(), color: tierColor },
                    { label: 'HEAT', value: `${artist.heat}/100`, color: artist.heat > 60 ? '#ff4b00' : artist.heat > 30 ? '#c9a84c' : '#555' },
                    { label: 'VOLATILITY', value: `${artist.heatVolatility}/10`, color: artist.heatVolatility > 4 ? '#c94040' : '#50c878' },
                    { label: 'PRICE RANGE', value: priceRange, color: '#e0e0e0' },
                ].map((stat, i) => (
                    <div key={i} style={{
                        background: '#0f1520', padding: '20px 24px',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.15em', marginBottom: 8 }}>
                            {stat.label}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Heat gauge bar */}
            <div style={{
                margin: '24px 48px', animation: 'an-slide-up 0.5s ease-out 0.35s both',
            }}>
                <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.15em', marginBottom: 8 }}>
                    MARKET HEAT
                </div>
                <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${artist.heat}%`,
                        background: `linear-gradient(90deg, #50c878, #c9a84c ${Math.min(artist.heat * 1.5, 100)}%, #ff4b00)`,
                        transition: 'width 1s ease-out',
                    }} />
                </div>
            </div>

            {/* Key dates / events placeholder */}
            <div style={{
                margin: '32px 48px', padding: 24,
                background: '#0f1520', borderRadius: 8,
                border: '1px solid #1e293b',
                animation: 'an-slide-up 0.5s ease-out 0.45s both',
            }}>
                <div style={{ fontSize: 12, color: '#555', letterSpacing: '0.15em', marginBottom: 16 }}>
                    RECENT ACTIVITY
                </div>
                <div style={{ fontSize: 13, color: '#777', lineHeight: 2 }}>
                    <div>📊 Avg auction price up <span style={{ color: '#50c878' }}>+12%</span> this quarter</div>
                    <div>🏛️ Artwork acquired by Museum of Contemporary Art</div>
                    <div>📈 3 works sold at Christie's Evening Sale</div>
                    <div>🎨 Solo exhibition opening at Pace Gallery, March</div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// SUB-PAGE: Gallery View
// ═══════════════════════════════════════════
function GalleryPage({ galleryId, onBack }) {
    const venue = useMemo(() => {
        const allVenues = Array.isArray(VENUES) ? VENUES : Object.values(VENUES || {}).flat();
        return allVenues.find(r => r.id === galleryId) || {
            id: galleryId,
            name: galleryId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            description: 'A contemporary art gallery in the heart of the city.',
            type: 'gallery',
        };
    }, [galleryId]);

    // Pick a few artists to "represent"
    const representedArtists = useMemo(() => ARTISTS.slice(0, 4), []);

    return (
        <div style={{
            position: 'absolute', inset: 0, background: '#fafafa',
            color: '#231f20', fontFamily: FONT, overflow: 'auto',
            animation: 'an-slide-in-right 0.4s cubic-bezier(0.16,1,0.3,1) both',
        }}>
            {/* Top bar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderBottom: '1px solid #eee',
                background: '#fff',
            }}>
                <button onClick={onBack} style={{
                    background: 'none', border: '1px solid #ddd', color: '#666',
                    padding: '6px 16px', cursor: 'pointer', fontFamily: FONT,
                    fontSize: 12, letterSpacing: '0.05em',
                }}>
                    ← BACK
                </button>
                <div style={{ fontSize: 11, color: '#999', letterSpacing: '0.15em' }}>
                    ARTNET / GALLERY
                </div>
            </div>

            {/* Gallery header */}
            <div style={{
                padding: '48px 48px 32px',
                animation: 'an-slide-up 0.5s ease-out 0.1s both',
            }}>
                <h1 style={{
                    margin: 0, fontSize: 36, fontWeight: 700, color: '#231f20',
                    letterSpacing: '-0.5px',
                }}>
                    {venue.name}
                </h1>
                <div style={{ marginTop: 8, fontSize: 14, color: '#888' }}>
                    {venue.type || 'Gallery'} — New York
                </div>
                <div style={{
                    marginTop: 16, fontSize: 15, color: '#555',
                    lineHeight: 1.6, maxWidth: 700,
                }}>
                    {venue.description}
                </div>
            </div>

            {/* Current shows */}
            <div style={{
                margin: '0 48px', padding: 24,
                background: '#fff', borderRadius: 8,
                border: '1px solid #eee',
                animation: 'an-slide-up 0.5s ease-out 0.2s both',
            }}>
                <div style={{ fontSize: 12, color: '#999', letterSpacing: '0.15em', marginBottom: 16 }}>
                    CURRENT EXHIBITIONS
                </div>
                <div style={{
                    padding: '16px 0', borderBottom: '1px solid #f0f0f0',
                }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#231f20' }}>
                        New Perspectives: Emerging Voices
                    </div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                        Group Show — Through March 28, 2026
                    </div>
                </div>
                <div style={{ padding: '16px 0' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#231f20' }}>
                        Solo Exhibition: Recent Works
                    </div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                        Opening Reception — April 5, 2026
                    </div>
                </div>
            </div>

            {/* Represented Artists */}
            <div style={{
                margin: '24px 48px', animation: 'an-slide-up 0.5s ease-out 0.3s both',
            }}>
                <div style={{ fontSize: 12, color: '#999', letterSpacing: '0.15em', marginBottom: 16 }}>
                    REPRESENTED ARTISTS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {representedArtists.map(a => (
                        <div key={a.id} style={{
                            background: '#fff', border: '1px solid #eee',
                            borderRadius: 6, padding: 16, cursor: 'pointer',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4b00'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#231f20' }}>
                                {a.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                                {a.medium}
                            </div>
                            <div style={{
                                marginTop: 8, fontSize: 11, fontWeight: 600,
                                color: TIER_COLORS[a.tier] || '#888',
                                textTransform: 'uppercase', letterSpacing: '0.1em',
                            }}>
                                {a.tier}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact */}
            <div style={{
                margin: '32px 48px 48px', padding: 24,
                background: '#fff', borderRadius: 8,
                border: '1px solid #eee',
                animation: 'an-slide-up 0.5s ease-out 0.4s both',
            }}>
                <div style={{ fontSize: 12, color: '#999', letterSpacing: '0.15em', marginBottom: 12 }}>
                    GALLERY CONTACT
                </div>
                <div style={{ fontSize: 14, color: '#231f20', lineHeight: 1.8 }}>
                    <div>📍 541 West 25th Street, New York, NY 10001</div>
                    <div>📞 +1 (212) 555-0147</div>
                    <div>✉️ info@gallery.artnet.com</div>
                    <div>🕐 Tue–Sat, 10am–6pm</div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN: ArtnetUI — 6-Phase Flow
// ═══════════════════════════════════════════
export default function ArtnetUI({ onClose }) {
    const [phase, setPhase] = useState('loading');
    const [transitioning, setTransitioning] = useState(false);
    const [drilldownId, setDrilldownId] = useState(null);

    useEffect(() => { injectStyles(); }, []);

    // ESC navigation — walks backward through the flow
    useEffect(() => {
        const h = (e) => {
            if (e.key === 'Escape') {
                if (phase === 'artist_detail' || phase === 'gallery_view') transitionTo('bloomberg');
                else if (phase === 'marketplace') transitionTo('bloomberg');
                else if (phase === 'bloomberg') transitionTo('login');
                else onClose();
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [phase, onClose]);

    const transitionTo = useCallback((next, payload = null) => {
        setTransitioning(true);
        if (payload) setDrilldownId(payload);
        setTimeout(() => {
            setPhase(next);
            setTransitioning(false);
        }, 300);
    }, []);

    const handleLoginSuccess = useCallback(() => {
        transitionTo('bloomberg');
    }, [transitionTo]);

    // Choose background based on phase
    const bgColor = phase === 'loading' ? '#1a1a1a'
        : phase === 'marketplace' || phase === 'gallery_view' ? '#fafafa'
            : '#0d1117';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9500,
            background: bgColor,
            fontFamily: FONT,
            transition: 'background 0.4s ease',
        }}>
            {/* Transition overlay */}
            {transitioning && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 99999,
                    background: bgColor,
                    animation: 'an-fade-in 0.25s ease-out',
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
                <div style={{
                    animation: 'an-scale-in 0.4s cubic-bezier(0.16,1,0.3,1) both',
                    position: 'absolute', inset: 0,
                }}>
                    <BloombergTerminal
                        onClose={onClose}
                        onBrowseMarketplace={() => transitionTo('marketplace')}
                        onDrilldownArtist={(id) => transitionTo('artist_detail', id)}
                        onDrilldownGallery={(id) => transitionTo('gallery_view', id)}
                    />
                </div>
            )}

            {phase === 'marketplace' && (
                <div style={{
                    animation: 'an-slide-in-right 0.4s cubic-bezier(0.16,1,0.3,1) both',
                    position: 'absolute', inset: 0,
                }}>
                    <ArtnetMarketplace onClose={() => transitionTo('bloomberg')} />
                </div>
            )}

            {phase === 'artist_detail' && (
                <ArtistDetailPage
                    artistId={drilldownId}
                    onBack={() => transitionTo('bloomberg')}
                />
            )}

            {phase === 'gallery_view' && (
                <GalleryPage
                    galleryId={drilldownId}
                    onBack={() => transitionTo('bloomberg')}
                />
            )}
        </div>
    );
}

