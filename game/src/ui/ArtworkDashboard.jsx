import React, { useMemo } from 'react';
import { useMarketStore } from '../stores/marketStore.js';
import { GameState } from '../managers/GameState.js';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ── Inline Local Error Boundary for Graps ──
class ChartErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c94040', fontSize: 12, border: '1px dashed rgba(201,64,64,0.3)', background: 'rgba(201,64,64,0.05)', borderRadius: 4 }}>
                    📈 Market Data Stream Interrupted.
                </div>
            );
        }
        return this.props.children;
    }
}

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
            <div style={{ background: '#111', border: '1px solid #333', padding: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
                <p style={{ margin: '0 0 5px 0', color: '#c9a84c' }}>Week {label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ margin: 0, color: p.color }}>
                        {p.name}: {p.name === 'Volume' ? p.value : `$${p.value.toLocaleString()}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// ── Components ──

function MarketTape({ work }) {
    // Generate simulated recent transaction activity logically
    const activity = useMemo(() => {
        const venues = ['Sotheby\'s', 'Christie\'s', 'Private Sale', 'Gallery X', 'Phillips de Pury'];
        const types = ['BID', 'ASK', 'SOLD'];
        const rows = [];
        const base = work.price || work.basePrice || 10000;

        for (let i = 0; i < 9; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            // Create a randomized pricing spread around the asset's base evaluation
            const p = Math.floor(base * (0.85 + Math.random() * 0.3));
            rows.push({
                time: `-${Math.floor(Math.random() * 60)}m`,
                venue: venues[Math.floor(Math.random() * venues.length)],
                type: t,
                price: p
            });
        }

        // Sort chronologically ascending towards present
        return rows.sort((a, b) => {
            const aMin = parseInt(a.time.replace('-', '').replace('m', ''));
            const bMin = parseInt(b.time.replace('-', '').replace('m', ''));
            return aMin - bMin;
        });
    }, [work]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', borderRadius: 4, height: '220px' }}>
            <div style={{ padding: '10px 12px', fontSize: 10, color: '#666', borderBottom: '1px solid rgba(255,255,255,0.05)', letterSpacing: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span>MARKET TAPE (ORDER BOOK)</span>
                <span className="live-pulse" style={{ color: '#c94040' }}>● LIVE</span>
            </div>
            <div style={{ overflowY: 'auto', padding: '12px', flex: 1 }}>
                {activity.map((a, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 10, fontFamily: 'monospace' }}>
                        <span style={{ color: '#555', width: 40 }}>{a.time}</span>
                        <span style={{ color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.venue}</span>
                        <span style={{ color: a.type === 'BID' ? '#4caf50' : a.type === 'ASK' ? '#f44336' : '#c9a84c', width: 40, textAlign: 'center' }}>{a.type}</span>
                        <span style={{ color: '#ccc', width: 70, textAlign: 'right' }}>${a.price.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ArtworkDashboard({ onClose, payload }) {
    const { artistSnapshots, priceHistory } = useMarketStore();

    if (!payload?.work) return null;

    const work = payload.work;
    const artistData = artistSnapshots?.[work.artistId];

    // Check Fog of War
    const tst = GameState.state?.taste ?? 0;
    const canSeeFull = tst >= 40;

    const displayArtist = tst < 20 ? '???' : work.artist;
    const displayMedium = tst < 20 ? '???' : (work.medium || 'Mixed Media');
    const displayYear = tst < 20 ? '????' : work.yearCreated;

    // Build Time-Series Chart Data
    const chartData = useMemo(() => {
        if (!work?.artistId || !priceHistory?.[work.artistId]) return [];
        return priceHistory[work.artistId].map(doc => {
            return {
                week: doc.week,
                price: doc.avgPrice || 0,
                // Fallback rendering minimum volume for UI aesthetics if exact orderbook volume wasn't recorded
                volume: doc.volume || Math.floor(Math.random() * 4) + 1
            };
        });
    }, [work?.artistId, priceHistory]);

    // Derived Market KPI calculations
    const kpis = useMemo(() => {
        if (chartData.length === 0) return null;

        const prices = chartData.map(d => d.price);
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const current = prices[prices.length - 1] || work.basePrice;

        // 4-Week Trajectory momentum check
        const older = prices.length > 4 ? prices[prices.length - 5] : prices[0];
        const momentum = older && older > 0 ? ((current - older) / older) * 100 : 0;

        // Liquidity Index
        const totalVolume = chartData.reduce((sum, d) => sum + d.volume, 0);
        let liquidityScore = 'LOW';
        if (totalVolume > 20) liquidityScore = 'HIGH';
        else if (totalVolume > 8) liquidityScore = 'MED';

        return { high, low, current, momentum, liquidityScore, totalVolume };
    }, [chartData, work.basePrice]);

    return (
        <div style={overlayStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <div>
                    <h1 style={titleStyle}>ArtNet Analytics & Market Economy</h1>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        ASSET ID: <span style={{ fontFamily: 'monospace' }}>{work.id}</span>
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

            {/* Top Stat Ribbon (Bloomberg Style) */}
            {canSeeFull && kpis && (
                <div style={{ display: 'flex', padding: '15px 2rem', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: '#666', letterSpacing: 1 }}>CURRENT VALUATION</div>
                        <div style={{ fontSize: 22, color: '#fff', fontFamily: 'monospace' }}>${kpis.current.toLocaleString()}</div>
                    </div>
                    <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '20px' }}>
                        <div style={{ fontSize: 10, color: '#666', letterSpacing: 1 }}>26W HIGH / LOW</div>
                        <div style={{ fontSize: 15, color: '#ccc', fontFamily: 'monospace', marginTop: 4 }}>
                            <span style={{ color: '#4caf50' }}>H: ${kpis.high.toLocaleString()}</span>
                            <span style={{ color: '#555', margin: '0 8px' }}>|</span>
                            <span style={{ color: '#f44336' }}>L: ${kpis.low.toLocaleString()}</span>
                        </div>
                    </div>
                    <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '20px' }}>
                        <div style={{ fontSize: 10, color: '#666', letterSpacing: 1 }}>4W TRAJECTORY MOMENTUM</div>
                        <div style={{ fontSize: 18, color: kpis.momentum >= 0 ? '#4caf50' : '#f44336', fontFamily: 'monospace', marginTop: 2 }}>
                            {kpis.momentum >= 0 ? '▲' : '▼'} {Math.abs(kpis.momentum).toFixed(2)}%
                        </div>
                    </div>
                    <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '20px' }}>
                        <div style={{ fontSize: 10, color: '#666', letterSpacing: 1 }}>LIQUIDITY & VOLUME INDEX</div>
                        <div style={{ fontSize: 14, color: '#ccc', fontFamily: 'monospace', marginTop: 4 }}>
                            {kpis.liquidityScore} ({kpis.totalVolume} settled tx)
                        </div>
                    </div>
                </div>
            )}

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
                        <div style={{ color: '#666', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '5px' }}>RESTRICTED VALUATION</div>
                        <div style={{ color: '#fff', fontSize: '18px', fontFamily: 'monospace' }}>
                            {tst < 20 ? '$???,???' : `$${(work.price || work.basePrice).toLocaleString()}`}
                        </div>
                    </div>

                    {artistData && canSeeFull && (
                        <div style={metaBoxStyle}>
                            <div style={{ color: '#666', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '5px' }}>CREATOR HEAT RATING</div>
                            <div style={{ fontSize: '16px', color: artistData.trend === 'up' ? '#4caf50' : artistData.trend === 'down' ? '#f44336' : '#ccc' }}>
                                {Math.round(artistData.heat || 0)} / 100
                            </div>
                        </div>
                    )}

                    {/* Curatorial Text */}
                    {canSeeFull && work.description && (
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ color: '#666', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>CONDITION REPORT</div>
                            <div style={{ color: '#aaa', fontSize: '13px', lineHeight: 1.6 }}>
                                {work.description}
                            </div>
                        </div>
                    )}

                    {/* Provanance */}
                    {canSeeFull && work?.provenanceHistory && work.provenanceHistory.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ color: '#666', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>PROVENANCE RECORD</div>
                            {work.provenanceHistory.map((prov, i) => (
                                <div key={i} style={{ display: 'flex', marginBottom: '6px', fontSize: '12px' }}>
                                    <div style={{ width: '50px', color: '#888' }}>{prov?.year || '????'}</div>
                                    <div style={{ color: '#ccc' }}>{prov?.owner || 'Unknown'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MAIN REGION: Image & Market Context */}
                <div style={mainStyle}>
                    {/* Image Box Area */}
                    <div style={{ width: '100%', maxWidth: '800px', flex: '0 0 auto', height: '400px', background: '#050508', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>
                        {work.imagePath ? (
                            <img src={work.imagePath} alt={work.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ color: '#333', textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🖼️</div>
                                <div style={{ fontSize: '12px', letterSpacing: '0.2em' }}>ASSET DIGITIZATION PENDING</div>
                            </div>
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1))', backgroundSize: '100% 4px', pointerEvents: 'none' }} />
                    </div>

                    {/* Economics Row */}
                    <div style={{ width: '100%', maxWidth: '800px', display: 'flex', gap: '2rem' }}>

                        {/* Sparkline Context (Composed Chart) */}
                        <div style={{ flex: 2 }}>
                            <div style={{ color: '#666', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '10px' }}>AUTHORITY INDEX & TRADING VOLUME</div>
                            <div style={{ height: '220px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '15px 10px 5px 5px' }}>
                                {(!canSeeFull || chartData.length === 0) ? (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '12px' }}>
                                        Insufficient Taste Level to resolve market telemetry.
                                    </div>
                                ) : (
                                    <ChartErrorBoundary>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                                <XAxis dataKey="week" stroke="#444" tick={{ fill: '#666', fontSize: 10 }} tickLine={false} />

                                                {/* Left Y Axis for Price */}
                                                <YAxis yAxisId="left" stroke="#444" tick={{ fill: '#666', fontSize: 10 }} tickFormatter={val => `$${val / 1000}k`} tickLine={false} />

                                                {/* Right Y Axis for Volume */}
                                                <YAxis yAxisId="right" orientation="right" hide={true} />

                                                <Tooltip content={<CustomTooltip />} />

                                                <Bar yAxisId="right" dataKey="volume" name="Volume" fill="#2a2a3e" barSize={12} radius={[2, 2, 0, 0]} />
                                                <Line yAxisId="left" type="monotone" dataKey="price" name="Price" stroke="#c9a84c" strokeWidth={2} dot={{ r: 2, fill: '#000', stroke: '#c9a84c' }} activeDot={{ r: 4 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </ChartErrorBoundary>
                                )}
                            </div>
                        </div>

                        {/* Order Book Panel */}
                        {canSeeFull && (
                            <div style={{ flex: 1 }}>
                                <MarketTape work={work} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.4; }
                    50% { opacity: 1; }
                    100% { opacity: 0.4; }
                }
                .live-pulse {
                    animation: pulse 2s infinite;
                }
            `}</style>
        </div>
    );
}
