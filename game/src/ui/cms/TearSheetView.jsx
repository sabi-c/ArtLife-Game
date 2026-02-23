/**
 * TearSheetView.jsx — Gagosian / Frieze-style Art Tear Sheet
 *
 * A print-ready, gallery-quality tear sheet that replicates the layout
 * of high-end gallery sales materials (specifically modeled on the
 * Gagosian / Frieze Los Angeles 2026 catalog).
 *
 * Features:
 *   - Alternating Artwork/Details page layout
 *   - Serif typography (Cormorant Garamond)
 *   - Print-ready with @media print styles
 *   - Integrated with game artwork + artist data
 */
import React, { useState, useMemo, useEffect } from 'react';
import { ARTISTS, generateInitialWorks } from '../../data/artists.js';

// ── Inject the Google Font ──
const FONT_LINK_ID = 'tearsheet-font';
if (typeof document !== 'undefined' && !document.getElementById(FONT_LINK_ID)) {
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&display=swap';
    document.head.appendChild(link);
}

// ── Print Styles (injected once) ──
const PRINT_STYLE_ID = 'tearsheet-print';
if (typeof document !== 'undefined' && !document.getElementById(PRINT_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = PRINT_STYLE_ID;
    style.textContent = `
        @media print {
            body * { visibility: hidden !important; }
            .tearsheet-container, .tearsheet-container * { visibility: visible !important; }
            .tearsheet-container {
                position: fixed !important; left: 0 !important; top: 0 !important;
                width: 100% !important; height: auto !important;
                overflow: visible !important; background: white !important;
                z-index: 999999 !important;
            }
            .tearsheet-toolbar { display: none !important; }
            .tearsheet-page { page-break-after: always; break-after: page; }
            .tearsheet-page:last-child { page-break-after: auto; }
            @page { margin: 0.75in; size: letter; }
        }
    `;
    document.head.appendChild(style);
}

// ── Gallery names for provenance ──
const GALLERIES = [
    'Gagosian, New York', 'Hauser & Wirth, Zürich', 'Pace Gallery, New York',
    'David Zwirner, London', 'White Cube, London', 'Perrotin, Paris',
    'Lehmann Maupin, Seoul', 'Thaddaeus Ropac, Salzburg', 'Lisson Gallery, London',
];

const VENUES_EXHIBIT = [
    { city: 'Los Angeles', venue: 'The Broad', show: 'New Perspectives in Contemporary Art' },
    { city: 'New York', venue: 'MoMA PS1', show: 'Emerging Voices' },
    { city: 'London', venue: 'Serpentine Gallery', show: 'Beyond the Frame' },
    { city: 'Berlin', venue: 'KW Institute', show: 'Material Dialogues' },
    { city: 'Basel', venue: 'Art Basel', show: 'Unlimited Sector' },
    { city: 'Venice', venue: 'La Biennale', show: 'All the World\'s Futures' },
    { city: 'Tokyo', venue: 'Mori Art Museum', show: 'Another Energy' },
    { city: 'Paris', venue: 'Centre Pompidou', show: 'Modernités Plurielles' },
];

// ── Deterministic pseudo-random from string hash ──
function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function generateProvenance(work, artist) {
    const h = hashStr(work.id);
    const gallery = GALLERIES[h % GALLERIES.length];
    const lines = [gallery];
    if (artist.tier === 'blue-chip' || artist.tier === 'hot') {
        lines.push(GALLERIES[(h + 3) % GALLERIES.length]);
    }
    return lines;
}

function generateExhibited(work, artist) {
    const h = hashStr(work.id + work.artist);
    const exhibits = [];
    const count = artist.tier === 'blue-chip' ? 3 : artist.tier === 'hot' ? 2 : 1;
    for (let i = 0; i < count; i++) {
        const v = VENUES_EXHIBIT[(h + i * 7) % VENUES_EXHIBIT.length];
        const year = work.yearCreated + i;
        exhibits.push(`${v.city}, ${v.venue}, *${v.show}*, ${year}`);
    }
    return exhibits;
}

function generateDimensions(work) {
    const h = hashStr(work.id);
    const isLarge = work.basePrice > 100000;
    const w = isLarge ? 40 + (h % 40) : 12 + (h % 30);
    const ht = isLarge ? 30 + ((h >> 4) % 50) : 10 + ((h >> 4) % 24);
    return {
        inches: `${w} × ${ht} in.`,
        cm: `(${(w * 2.54).toFixed(1)} × ${(ht * 2.54).toFixed(1)} cm)`,
    };
}

function getTierBirthYear(artist) {
    const h = hashStr(artist.id);
    if (artist.tier === 'blue-chip') return 1940 + (h % 20);
    if (artist.tier === 'hot') return 1970 + (h % 15);
    if (artist.tier === 'mid-career') return 1965 + (h % 20);
    return 1985 + (h % 12);
}

// ── Medium descriptor mapping ──
function getMediumDescription(medium) {
    const map = {
        'Painting': 'Oil on linen',
        'Mixed Media': 'Mixed media on canvas',
        'Photography': 'Archival pigment print',
        'Sculpture': 'Patinated bronze',
        'Digital / New Media': 'Digital print on aluminum',
        'Installation': 'Mixed media installation',
    };
    return map[medium] || medium;
}

// Color palettes for artwork placeholders
const PALETTE_SETS = [
    ['#2c3e50', '#34495e', '#1a252f', '#4a6274'],
    ['#8e44ad', '#9b59b6', '#6c3483', '#a569bd'],
    ['#c0392b', '#e74c3c', '#922b21', '#f1948a'],
    ['#2980b9', '#3498db', '#1f6da0', '#85c1e9'],
    ['#27ae60', '#2ecc71', '#1e8449', '#82e0aa'],
    ['#d4ac0d', '#f1c40f', '#9a7d0a', '#f9e154'],
    ['#e67e22', '#f39c12', '#ca6f1e', '#f5b041'],
    ['#1abc9c', '#16a085', '#117a65', '#76d7c4'],
];

// ══════════════════════════════════════════════
// ARTWORK PLACEHOLDER — generates a stylized
// abstract art placeholder for the tear sheet
// ══════════════════════════════════════════════

function ArtworkPlaceholder({ work, artist, style }) {
    const h = hashStr(work.id);
    const palette = PALETTE_SETS[h % PALETTE_SETS.length];
    const bg = palette[0];
    const accent1 = palette[1];
    const accent2 = palette[2];
    const accent3 = palette[3];

    // Different composition styles based on medium
    const isPhoto = work.medium === 'Photography';
    const isSculpture = work.medium === 'Sculpture';
    const isDigital = work.medium === 'Digital / New Media';

    return (
        <div style={{
            width: '100%', aspectRatio: isSculpture ? '3/4' : '4/3',
            background: bg, position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...style,
        }}>
            {/* Abstract composition */}
            {isPhoto ? (
                // Photography — gradient wash
                <>
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${bg} 30%, ${accent1} 70%, ${accent3} 100%)` }} />
                    <div style={{ position: 'absolute', top: '20%', left: '15%', width: '70%', height: '60%', border: `2px solid ${accent3}44`, borderRadius: 2 }} />
                </>
            ) : isSculpture ? (
                // Sculpture — geometric form
                <>
                    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 60%, ${accent1} 0%, ${bg} 70%)` }} />
                    <div style={{ width: '40%', height: '65%', background: accent2, borderRadius: '50% 50% 5% 5%', opacity: 0.7 }} />
                </>
            ) : isDigital ? (
                // Digital — grid/noise
                <>
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${bg}, ${accent1})` }} />
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            left: `${10 + (i * 15) % 80}%`, top: `${5 + (i * 23) % 80}%`,
                            width: `${20 + (h >> i) % 30}%`, height: 2,
                            background: accent3, opacity: 0.5,
                        }} />
                    ))}
                </>
            ) : (
                // Painting / Mixed Media — abstract blocks
                <>
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${(h % 4) * 45}deg, ${bg}, ${accent1} 50%, ${accent2})` }} />
                    <div style={{
                        position: 'absolute', width: '60%', height: '50%',
                        top: '20%', left: '20%',
                        background: accent3, opacity: 0.3,
                        transform: `rotate(${(h % 12) - 6}deg)`,
                    }} />
                    <div style={{
                        position: 'absolute', width: '35%', height: '35%',
                        bottom: '15%', right: '10%',
                        borderRadius: '50%',
                        background: `radial-gradient(${accent1}, transparent)`,
                        opacity: 0.5,
                    }} />
                </>
            )}

            {/* Frame border for paintings */}
            {(work.medium === 'Painting' || work.medium === 'Mixed Media') && (
                <div style={{
                    position: 'absolute', inset: 0,
                    border: '8px solid #8B7355',
                    boxShadow: 'inset 0 0 0 2px #6B5B3F, inset 0 0 0 4px #A0926B',
                    pointerEvents: 'none',
                }} />
            )}
        </div>
    );
}

// ══════════════════════════════════════════════
// ARTWORK PAGE — Large image + caption
// ══════════════════════════════════════════════

function ArtworkPage({ work, artist }) {
    const dims = generateDimensions(work);
    const mediumDesc = getMediumDescription(work.medium);

    return (
        <div className="tearsheet-page" style={{
            background: '#f5f5f0', minHeight: '100vh',
            display: 'flex', flexDirection: 'column',
            padding: '60px 80px 40px',
            fontFamily: '"Cormorant Garamond", "Georgia", serif',
            boxSizing: 'border-box',
            pageBreakAfter: 'always',
        }}>
            {/* Top micro-header */}
            <div style={{
                fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
                color: '#999', textAlign: 'right', marginBottom: 24,
                fontFamily: '"Cormorant Garamond", serif', fontWeight: 500,
            }}>
                {artist.name}&ensp;·&ensp;<em>{work.title}</em>
            </div>

            {/* Artwork Image */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                <ArtworkPlaceholder work={work} artist={artist} style={{ maxWidth: 700, maxHeight: 500, boxShadow: '0 4px 30px rgba(0,0,0,0.1)' }} />
            </div>

            {/* Caption bar — bottom */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                borderTop: 'none', paddingTop: 20, marginTop: 'auto',
            }}>
                <div style={{ fontSize: 13, color: '#333', lineHeight: 1.7 }}>
                    <span>{artist.name}, </span>
                    <em>{work.title}</em>
                    <span>, {work.yearCreated}</span>
                    <br />
                    <span style={{ color: '#666' }}>{mediumDesc}</span>
                    <br />
                    <span style={{ color: '#666' }}>{dims.inches} {dims.cm}</span>
                </div>
                <div style={{
                    fontSize: 11, letterSpacing: 4, textTransform: 'uppercase',
                    color: '#333', fontWeight: 600,
                }}>
                    ARTLIFE
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// DETAILS PAGE — Provenance + Exhibition
// ══════════════════════════════════════════════

function DetailsPage({ work, artist }) {
    const dims = generateDimensions(work);
    const mediumDesc = getMediumDescription(work.medium);
    const birthYear = getTierBirthYear(artist);
    const provenance = generateProvenance(work, artist);
    const exhibited = generateExhibited(work, artist);

    return (
        <div className="tearsheet-page" style={{
            background: '#fff', minHeight: '100vh',
            padding: '100px 100px 60px',
            fontFamily: '"Cormorant Garamond", "Georgia", serif',
            boxSizing: 'border-box',
            pageBreakAfter: 'always',
        }}>
            {/* Centered header — small caps */}
            <div style={{
                textAlign: 'center', fontSize: 12, letterSpacing: 3,
                textTransform: 'uppercase', color: '#555',
                marginBottom: 60, fontWeight: 500,
            }}>
                {artist.name},&ensp;<em style={{ textTransform: 'none' }}>{work.title}</em>&ensp;({work.yearCreated})
            </div>

            {/* Main details block */}
            <div style={{ maxWidth: 520, margin: '0 auto 0 100px', lineHeight: 2 }}>
                {/* Artist + specs */}
                <div style={{ marginBottom: 40 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                        {artist.name} <span style={{ fontWeight: 400, color: '#666' }}>(b. {birthYear})</span>
                    </div>
                    <div style={{ fontSize: 16, color: '#333' }}>
                        <em>{work.title}</em>, {work.yearCreated}
                    </div>
                    <div style={{ fontSize: 14, color: '#555' }}>
                        {mediumDesc}
                    </div>
                    <div style={{ fontSize: 14, color: '#555' }}>
                        {dims.inches} {dims.cm}
                    </div>
                </div>

                {/* Provenance */}
                <div style={{ marginBottom: 36 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>
                        Provenance
                    </div>
                    {provenance.map((line, i) => (
                        <div key={i} style={{ fontSize: 14, color: '#444' }}>{line}</div>
                    ))}
                </div>

                {/* Exhibited */}
                <div style={{ marginBottom: 36 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>
                        Exhibited
                    </div>
                    {exhibited.map((line, i) => (
                        <div key={i} style={{ fontSize: 13, color: '#444', lineHeight: 1.8 }}
                            dangerouslySetInnerHTML={{ __html: line.replace(/\*(.*?)\*/g, '<em>$1</em>') }}
                        />
                    ))}
                </div>

                {/* Market Data (game-specific addition) */}
                <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #e0e0e0' }}>
                    <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#999', marginBottom: 12 }}>
                        Market Data
                    </div>
                    <div style={{ display: 'flex', gap: 40 }}>
                        <div>
                            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Price</div>
                            <div style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>
                                ${work.price?.toLocaleString() || work.basePrice?.toLocaleString()}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Heat Index</div>
                            <div style={{ fontSize: 20, fontWeight: 600, color: artist.heat > 60 ? '#c0392b' : artist.heat > 30 ? '#d4ac0d' : '#27ae60' }}>
                                {artist.heat}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Tier</div>
                            <div style={{ fontSize: 16, fontWeight: 500, color: '#333', textTransform: 'capitalize' }}>
                                {artist.tier}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{
                position: 'absolute', bottom: 50, right: 100,
                fontSize: 11, letterSpacing: 4, textTransform: 'uppercase',
                color: '#bbb', fontWeight: 600,
            }}>
                ARTLIFE
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// COVER PAGE
// ══════════════════════════════════════════════

function CoverPage() {
    return (
        <div className="tearsheet-page" style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            minHeight: '100vh',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            fontFamily: '"Cormorant Garamond", "Georgia", serif',
            color: 'white', textAlign: 'center',
            pageBreakAfter: 'always', position: 'relative',
        }}>
            <div style={{ fontSize: 52, fontWeight: 300, letterSpacing: 8, textTransform: 'uppercase', marginBottom: 16 }}>
                ArtLife
            </div>
            <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: 6, textTransform: 'uppercase', color: '#c9a84c', marginBottom: 40 }}>
                Collection Catalog
            </div>
            <div style={{ width: 60, height: 1, background: '#c9a84c', marginBottom: 40 }} />
            <div style={{ fontSize: 14, letterSpacing: 3, color: '#aaa' }}>
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 12, letterSpacing: 2, color: '#666', marginTop: 8 }}>
                {ARTISTS.length} Artists · Gallery Edition
            </div>

            {/* Bottom corner branding */}
            <div style={{
                position: 'absolute', bottom: 40, right: 60,
                fontSize: 10, letterSpacing: 4, color: '#555',
            }}>
                PRIVATE COLLECTION
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// MAIN EXPORT: TearSheetView
// ══════════════════════════════════════════════

export default function TearSheetView() {
    const [filter, setFilter] = useState('all');
    const [showMarket, setShowMarket] = useState(true);

    const works = useMemo(() => generateInitialWorks(), []);
    const artistMap = useMemo(() => {
        const m = {};
        ARTISTS.forEach(a => { m[a.id] = a; });
        return m;
    }, []);

    const filtered = useMemo(() => {
        if (filter === 'all') return works;
        return works.filter(w => {
            const a = artistMap[w.artistId];
            return a && a.tier === filter;
        });
    }, [works, filter, artistMap]);

    return (
        <div className="tearsheet-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* ── Toolbar (hidden in print) ── */}
            <div className="tearsheet-toolbar" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px', background: '#111', borderBottom: '1px solid #333',
                fontFamily: '"IBM Plex Mono", monospace', fontSize: 11,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <strong style={{ color: '#c9a84c', fontSize: 12 }}>📄 Tear Sheet</strong>
                    <span style={{ color: '#555' }}>|</span>
                    {['all', 'blue-chip', 'hot', 'mid-career', 'emerging'].map(t => (
                        <button key={t} onClick={() => setFilter(t)} style={{
                            background: filter === t ? 'rgba(201,168,76,0.15)' : 'transparent',
                            border: `1px solid ${filter === t ? '#c9a84c' : '#333'}`,
                            color: filter === t ? '#c9a84c' : '#666',
                            padding: '3px 10px', cursor: 'pointer',
                            fontFamily: 'inherit', fontSize: 10, borderRadius: 3,
                            textTransform: 'capitalize',
                        }}>{t === 'all' ? 'All Tiers' : t}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ color: '#666', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input type="checkbox" checked={showMarket} onChange={e => setShowMarket(e.target.checked)}
                            style={{ accentColor: '#c9a84c' }} />
                        Market Data
                    </label>
                    <button onClick={() => window.print()} style={{
                        background: 'transparent', border: '1px solid #4caf50', color: '#4caf50',
                        padding: '3px 12px', cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 10, borderRadius: 3,
                    }}>🖨️ Print / PDF</button>
                    <span style={{ color: '#444', fontSize: 10 }}>
                        {filtered.length} works
                    </span>
                </div>
            </div>

            {/* ── Scrollable Tear Sheet ── */}
            <div style={{
                flex: 1, overflow: 'auto',
                background: '#e8e8e0', // neutral grey surround
            }}>
                {/* Cover */}
                <CoverPage />

                {/* Artwork + Details pages */}
                {filtered.map(work => {
                    const artist = artistMap[work.artistId];
                    if (!artist) return null;
                    return (
                        <React.Fragment key={work.id}>
                            <ArtworkPage work={work} artist={artist} />
                            <DetailsPage work={work} artist={artist} />
                        </React.Fragment>
                    );
                })}

                {/* Colophon */}
                <div className="tearsheet-page" style={{
                    background: '#fff', minHeight: '60vh',
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center',
                    fontFamily: '"Cormorant Garamond", serif',
                    padding: 60,
                }}>
                    <div style={{ fontSize: 14, letterSpacing: 4, textTransform: 'uppercase', color: '#999', marginBottom: 20 }}>
                        ARTLIFE
                    </div>
                    <div style={{ width: 40, height: 1, background: '#ccc', marginBottom: 20 }} />
                    <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', lineHeight: 2, maxWidth: 400 }}>
                        This catalog was generated from the ArtLife game database.
                        All artists, artworks, and market data are fictional
                        and created for gameplay purposes.
                    </div>
                    <div style={{ fontSize: 11, color: '#ccc', marginTop: 30, letterSpacing: 2 }}>
                        © {new Date().getFullYear()} ArtLife · All Rights Reserved
                    </div>
                </div>
            </div>
        </div>
    );
}
