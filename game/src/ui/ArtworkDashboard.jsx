import React, { useMemo } from 'react';
import { useMarketStore } from '../stores/marketStore.js';
import { GameState } from '../managers/GameState.js';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
    width: '400px',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(0,0,0,0.1)',
    overflowY: 'auto',
    padding: '2rem'
};

const mainStyle = {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
};

const metaBoxStyle = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '10px'
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#111', border: '1px solid #333', padding: '10px', fontSize: '12px' }}>
                <p style={{ margin: '0 0 5px 0', color: '#c9a84c' }}>Week {label}</p>
                <p style={{ margin: 0, color: '#fff' }}>Artist Index: {payload[0].value}</p>
            </div>
        );
    }
    return null;
};

export default function ArtworkDashboard({ onClose, payload }) {
    const { artistSnapshots, priceHistory } = useMarketStore();

    // Fallback if accessed without payload (shouldn't happen in normal flow)
    if (!payload?.work) return null;

    const work = payload.work;
    const artistData = artistSnapshots?.[work.artistId];

    // TST Fog of War Logic
    const tst = GameState.state?.taste ?? 0;
    const canSeeFull = tst >= 40;

    const displayArtist = tst < 20 ? '???' : work.artist;
    const displayMedium = tst < 20 ? '???' : (work.medium || 'Mixed Media');
    const displayYear = tst < 20 ? '????' : work.yearCreated;

    // Calculate the index chart based on the artist
    const chartData = useMemo(() => {
        if (!work.artistId || !priceHistory[work.artistId]) return [];
        return priceHistory[work.artistId].map(doc => {
            // Re-calculate the index for the graph if needed, or just plot avg price
            return { week: doc.week, index: doc.avgPrice };
        });
    }, [work.artistId, priceHistory]);

    return (
        <div style={overlayStyle}>
            <div style={headerStyle}>
                <div>
                    <h1 style={titleStyle}>Condition Report & Provenance</h1>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        DATABASE ID: <span style={{ fontFamily: 'monospace' }}>{work.id}</span>
                    </div>
                </div>
                <button
                    style={btnStyle}
                    onClick={onClose}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#c9a84c'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#444'; }}
                >
                    [X] CLOSE
                </button>
            </div>

            <div style={containerStyle}>
                {/* SIDEBAR: Metadata & Lore */}
                <div style={sidebarStyle}>
                    <h2 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '24px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        {work.title}
                    </h2>
                    <h3 style={{ margin: '0 0 30px 0', color: '#c9a84c', fontSize: '16px', fontWeight: 'normal' }}>
                        {displayArtist}, {displayYear}
                    </h3>

                    <div style={metaBoxStyle}>
                        <div style={{ color: '#666', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '5px' }}>MEDIUM</div>
                        <div style={{ color: '#ccc', fontSize: '14px' }}>{displayMedium}</div>
                    </div>

                    <div style={metaBoxStyle}>
                        <div style={{ color: '#666', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '5px' }}>CURRENT VALUATION</div>
                        <div style={{ color: '#fff', fontSize: '18px', fontFamily: 'monospace' }}>
                            {tst < 20 ? '$???,???' : `$${(work.price || work.basePrice).toLocaleString()}`}
                        </div>
                        {artistData && canSeeFull && (
                            <div style={{ marginTop: '5px', fontSize: '12px', color: artistData.trend === 'up' ? '#4caf50' : artistData.trend === 'down' ? '#f44336' : '#888' }}>
                                Artist Heat: {Math.round(artistData.heat)}/100
                            </div>
                        )}
                    </div>

                    {/* Curatorial Text */}
                    {canSeeFull && work.description && (
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ color: '#666', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>CURATORIAL NOTES</div>
                            <div style={{ color: '#aaa', fontSize: '13px', lineHeight: 1.6 }}>
                                {work.description}
                            </div>
                        </div>
                    )}

                    {/* Flavor Notes */}
                    {canSeeFull && work.notes && work.notes.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ color: '#666', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>CONDITION & RUMORS</div>
                            {work.notes.map((note, idx) => (
                                <div key={idx} style={{ marginBottom: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderLeft: '2px solid #555' }}>
                                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{note.author}:</div>
                                    <div style={{ fontSize: '13px', color: '#ccc', fontStyle: 'italic' }}>"{note.text}"</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MAIN REGION: Image & Market Context */}
                <div style={mainStyle}>
                    {/* Image Area */}
                    <div style={{ width: '100%', maxWidth: '600px', flex: '0 0 auto', aspectRatio: '4/3', background: '#050508', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>
                        {work.imagePath ? (
                            <img src={work.imagePath} alt={work.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ color: '#333', textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🖼️</div>
                                <div style={{ fontSize: '12px', letterSpacing: '0.2em' }}>IMAGE NOT FOUND</div>
                            </div>
                        )}

                        {/* Fake scanlines overlay */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1))', backgroundSize: '100% 4px', pointerEvents: 'none' }} />
                    </div>

                    {/* Data Row */}
                    <div style={{ width: '100%', maxWidth: '800px', display: 'flex', gap: '2rem' }}>

                        {/* Provenance */}
                        {canSeeFull && work.provenanceHistory && (
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#666', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '10px' }}>PROVENANCE HISTORY</div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '15px' }}>
                                    {work.provenanceHistory.map((prov, i) => (
                                        <div key={i} style={{ display: 'flex', marginBottom: i < work.provenanceHistory.length - 1 ? '10px' : '0', fontSize: '12px' }}>
                                            <div style={{ width: '50px', color: '#888' }}>{prov.year}</div>
                                            <div style={{ color: '#ccc' }}>{prov.owner}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sparkline Context */}
                        {canSeeFull && chartData.length > 0 && (
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#666', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '10px' }}>CREATOR ASSET PERFORMANCE</div>
                                <div style={{ height: '150px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '10px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.5} />
                                                    <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="week" hide={true} />
                                            <YAxis hide={true} domain={['dataMin', 'dataMax']} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey="index" stroke="#c9a84c" fillOpacity={1} fill="url(#colorIndex)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
