import React, { useState, useMemo } from 'react';
import { useMarketStore } from '../../stores/marketStore.js';
import { GameState } from '../../managers/GameState.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// ── Styles ──
const overlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0a0a0f',
    backgroundImage: 'radial-gradient(circle at 50% 10%, #1a1a24 0%, #0a0a0f 80%)',
    zIndex: 10000,
    color: '#d4d4d4',
    fontFamily: '"Geist Mono", monospace',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
};

const headerStyle = {
    padding: '1.5rem 2rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.2)'
};

const titleStyle = {
    fontSize: '20px',
    color: '#c9a84c',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    margin: 0
};

const btnStyle = {
    background: 'transparent',
    border: '1px solid #444',
    color: '#888',
    padding: '8px 16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
};

const containerStyle = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
};

const sidebarStyle = {
    width: '320px',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(0,0,0,0.1)'
};

const mainStyle = {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto'
};

const artistItemStyle = (isSelected) => ({
    padding: '1rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
    background: isSelected ? 'rgba(201, 168, 76, 0.05)' : 'transparent',
    borderLeft: isSelected ? '3px solid #c9a84c' : '3px solid transparent',
    transition: 'all 0.2s ease',
    opacity: isSelected ? 1 : 0.7
});

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#111', border: '1px solid #333', padding: '10px', fontSize: '12px' }}>
                <p style={{ margin: '0 0 5px 0', color: '#c9a84c' }}>Week {label}</p>
                {payload.map(p => (
                    <p key={p.dataKey} style={{ margin: '3px 0', color: p.color }}>
                        {p.name}: {p.dataKey.includes('Price') || p.name.includes('Price') ? '$' + p.value.toLocaleString() : p.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function MarketDashboard({ onClose }) {
    const { priceHistory, artistSnapshots } = useMarketStore();
    const marketState = useMarketStore(s => s.marketCycle) || GameState.state?.marketState || 'neutral';

    // Get list of active artists sorted by heat
    const artists = useMemo(() => {
        return Object.entries(artistSnapshots || {})
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.artistIndex - a.artistIndex);
    }, [artistSnapshots]);

    // Default to first artist (using useMemo to avoid setState during render)
    const defaultId = useMemo(() => artists?.[0]?.id || null, [artists]);
    const [selectedId, setSelectedId] = useState(null);
    const effectiveId = selectedId || defaultId;

    const selectedData = effectiveId ? artistSnapshots[effectiveId] : null;
    const chartData = useMemo(() => {
        if (!effectiveId || !priceHistory?.[effectiveId]) return [];
        return priceHistory[effectiveId].map(doc => ({
            ...doc,
            displayRange: [doc.lowPrice || 0, doc.highPrice || 0]
        }));
    }, [effectiveId, priceHistory]);

    // Empty state when no market data
    if (artists.length === 0) {
        return (
            <div style={overlayStyle}>
                <div style={headerStyle}>
                    <div>
                        <h1 style={titleStyle}>Artnet Intelligence</h1>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            GLOBAL MARKET STATE: <span style={{ color: '#888' }}>{marketState.toUpperCase()}</span>
                        </div>
                    </div>
                    <button style={btnStyle} onClick={onClose}>[X] CLOSE</button>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: 48 }}>📊</div>
                    <div style={{ color: '#888', fontSize: 14, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
                        No market data available yet. Market intelligence populates as you trade artworks and progress through the game.
                    </div>
                    <button onClick={onClose} style={{ ...btnStyle, marginTop: 12, padding: '10px 24px' }}>
                        ← BACK TO TERMINAL
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={overlayStyle}>
            <div style={headerStyle}>
                <div>
                    <h1 style={titleStyle}>Artnet Intelligence</h1>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        GLOBAL MARKET STATE: <span style={{ color: marketState === 'bull' ? '#4caf50' : marketState === 'bear' ? '#f44336' : '#888' }}>{marketState.toUpperCase()}</span>
                    </div>
                </div>
                <button
                    style={btnStyle}
                    onClick={onClose}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#c9a84c'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#444'; }}
                >
                    [X] CLOSE TERMINAL
                </button>
            </div>

            <div style={containerStyle}>
                {/* SIDEBAR: Artist List */}
                <div style={sidebarStyle}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', color: '#666', letterSpacing: '0.1em' }}>
                        ARTIST INDEX RANKING
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {artists?.map(artist => (
                            <div
                                key={artist.id}
                                style={artistItemStyle(selectedId === artist.id)}
                                onClick={() => setSelectedId(artist.id)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>{artist.name}</div>
                                    <div style={{ color: '#c9a84c', fontSize: '14px', fontWeight: 'bold' }}>{artist.artistIndex}</div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px' }}>
                                    <span style={{ color: '#888' }}>Tier {artist.tier || '?'}</span>
                                    <span style={{ color: artist.trend > 0 ? '#4caf50' : artist.trend < 0 ? '#f44336' : '#888' }}>
                                        Heat: {Math.round(artist.heat || 0)} {artist.trend > 0 ? '↑' : artist.trend < 0 ? '↓' : '→'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MAIN: Charts */}
                <div style={mainStyle}>
                    {selectedData && (
                        <div>
                            <div style={{ marginBottom: '2rem' }}>
                                <h2 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '28px', letterSpacing: '-0.02em' }}>{selectedData.name || 'Unknown Artist'}</h2>
                                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#aaa' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 15px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ color: '#666', marginBottom: '4px', letterSpacing: '0.1em', fontSize: '10px' }}>ARTIST INDEX</div>
                                        <div style={{ fontSize: '20px', color: '#c9a84c', fontFamily: 'monospace' }}>{selectedData.artistIndex || 0}</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 15px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ color: '#666', marginBottom: '4px', letterSpacing: '0.1em', fontSize: '10px' }}>HEAT PERCENTILE</div>
                                        <div style={{ fontSize: '20px', color: '#fff', fontFamily: 'monospace' }}>{Math.round(selectedData.heat || 0)}/100</div>
                                    </div>
                                    {selectedData.buybackActive && (
                                        <div style={{ background: 'rgba(196, 60, 60, 0.1)', padding: '10px 15px', borderRadius: '4px', border: '1px solid rgba(196, 60, 60, 0.3)' }}>
                                            <div style={{ color: '#c43c3c', marginBottom: '4px', letterSpacing: '0.1em', fontSize: '10px' }}>MARKET ALERT</div>
                                            <div style={{ fontSize: '14px', color: '#ffb3b3' }}>Institutional Support</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ height: '400px', width: '100%', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ color: '#888', marginBottom: '15px', fontSize: '12px', letterSpacing: '0.1em' }}>PRICE HISTORY & VOLUME</div>
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="week" stroke="#555" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(val) => `Wk ${val}`} />
                                            <YAxis yAxisId="left" stroke="#555" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(val) => `$${val / 1000}k`} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#555" tick={{ fill: '#666', fontSize: 11 }} />

                                            <Tooltip content={<CustomTooltip />} />

                                            {/* Price Range Area (Low to High) */}
                                            <Area yAxisId="left" type="monotone" dataKey="displayRange" stroke="none" fill="#333" fillOpacity={0.4} />

                                            {/* Avg Price Line */}
                                            <Area yAxisId="left" type="monotone" dataKey="avgPrice" name="Avg Price" stroke="#c9a84c" strokeWidth={2} fillOpacity={1} fill="url(#colorAvg)" />

                                            {/* Volume Bar (represented as a secondary line for now) */}
                                            <Line yAxisId="right" type="step" dataKey="volume" name="Volume" stroke="#666" strokeWidth={1} dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                                        No trading data available for this artist yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
