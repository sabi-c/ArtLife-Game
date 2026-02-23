/**
 * ArtTerminal.jsx — Live Day-Trading Terminal for Art Market
 *
 * Multi-panel, auto-ticking terminal that shows real-time price movement,
 * trade feeds, and market alerts. Hooks into MarketManager.microTick()
 * for live O-U price jitter.
 *
 * ARCHITECTURE CONTEXT (for other agents):
 * ┌──────────────────────────────────────────────────────┐
 * │  ArtTerminal (THIS FILE)                             │
 * │  └─ Consumes: MarketManager.getTickSnapshot(),       │
 * │     MarketManager.microTick(), MarketSimulator.tradeLog│
 * │  └─ Lives in: MasterCMS sidebar → "Live Terminal"     │
 * │  └─ Frontend-ready: all data structures match the     │
 * │     getTickSnapshot() API for plug-in replacement     │
 * └──────────────────────────────────────────────────────┘
 *
 * Layout: Header → [Watchlist | Chart] → [Feed | OrderBook | Alerts]
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MarketManager } from '../../managers/MarketManager.js';
import { MarketSimulator } from '../../managers/MarketSimulator.js';
import { useMarketStore } from '../../stores/marketStore.js';

// ══════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════

const mono = '"IBM Plex Mono", "Courier New", monospace';

const termBg = '#06060e';
const panelBg = '#0a0a14';
const borderClr = '#1a1a2e';
const dimText = '#444';
const mutedText = '#666';

const panel = {
    background: panelBg,
    border: `1px solid ${borderClr}`,
    borderRadius: 4,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
};

const panelHeader = {
    padding: '6px 10px',
    borderBottom: `1px solid ${borderClr}`,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: mono,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};

const speedBtn = (active) => ({
    background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
    border: `1px solid ${active ? '#c9a84c' : '#222'}`,
    color: active ? '#c9a84c' : '#444',
    padding: '2px 8px',
    fontSize: 8,
    fontFamily: mono,
    borderRadius: 3,
    cursor: 'pointer',
});

// ══════════════════════════════════════════════
// SVG SPARKLINE (compact, for watchlist rows)
// ══════════════════════════════════════════════

function TinySparkline({ data, width = 60, height = 16, color = '#4ade80' }) {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 2) - 1;
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg width={width} height={height} style={{ display: 'block' }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth={1} />
        </svg>
    );
}

// ══════════════════════════════════════════════
// SVG CHART (large, for center panel)
// ══════════════════════════════════════════════

function PriceChart({ data, width = 500, height = 180, color = '#c9a84c', label = '' }) {
    if (!data || data.length < 2) {
        return (
            <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dimText, fontSize: 10 }}>
                Waiting for tick data...
            </div>
        );
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 20) - 10;
        return `${x},${y}`;
    }).join(' ');
    const last = data[data.length - 1];
    const lastY = height - ((last - min) / range) * (height - 20) - 10;

    // Grid lines
    const gridLines = 4;
    const grids = [];
    for (let i = 0; i <= gridLines; i++) {
        const y = 10 + (i / gridLines) * (height - 20);
        const val = max - (i / gridLines) * range;
        grids.push(
            <g key={i}>
                <line x1={0} y1={y} x2={width} y2={y} stroke="#111" strokeWidth={0.5} />
                <text x={4} y={y - 2} fill="#333" fontSize={7} fontFamily={mono}>${Math.round(val).toLocaleString()}</text>
            </g>
        );
    }

    return (
        <svg width={width} height={height} style={{ display: 'block' }}>
            {grids}
            <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`${color}08`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
            {/* Current price dot */}
            <circle cx={width} cy={lastY} r={3} fill={color} />
            <text x={width - 4} y={lastY - 8} fill={color} fontSize={9} fontFamily={mono} textAnchor="end" fontWeight="bold">
                ${last.toLocaleString()}
            </text>
            {label && <text x={8} y={height - 4} fill="#333" fontSize={8} fontFamily={mono}>{label}</text>}
        </svg>
    );
}

// ══════════════════════════════════════════════
// MAIN TERMINAL
// ══════════════════════════════════════════════

export default function ArtTerminal() {
    const [tickSpeed, setTickSpeed] = useState(2000); // ms, 0 = paused
    const [selectedArtist, setSelectedArtist] = useState(null);
    const [priceHistory, setPriceHistory] = useState({}); // artistId → [prices]
    const [compositeHistory, setCompositeHistory] = useState([]);
    const [tickCount, setTickCount] = useState(0);
    const [alerts, setAlerts] = useState([]);
    const [snapshot, setSnapshot] = useState(null);
    const [watchlistSort, setWatchlistSort] = useState('delta');
    const feedRef = useRef(null);
    const maxHistory = 60; // Keep last 60 ticks of price data

    // ── Auto-tick engine ──
    useEffect(() => {
        if (tickSpeed === 0) return;

        const interval = setInterval(() => {
            // Fire a micro-tick to jitter prices
            try { MarketManager.microTick(); } catch (e) { /* not initialized */ }

            // Grab snapshot
            const snap = MarketManager.getTickSnapshot();
            if (!snap || !snap.artists || snap.artists.length === 0) return;

            setSnapshot(snap);
            setTickCount(c => c + 1);

            // Accumulate price history per artist
            setPriceHistory(prev => {
                const next = { ...prev };
                for (const a of snap.artists) {
                    const hist = next[a.id] || [];
                    hist.push(a.avgPrice);
                    if (hist.length > maxHistory) hist.shift();
                    next[a.id] = hist;
                }
                return next;
            });

            // Composite index history
            setCompositeHistory(prev => {
                const next = [...prev, snap.composite];
                if (next.length > maxHistory) next.shift();
                return next;
            });

            // Auto-select first artist if none selected
            if (!selectedArtist && snap.artists.length > 0) {
                setSelectedArtist(snap.artists[0].id);
            }

            // Generate alerts on notable ticks
            const newAlerts = [];
            for (const a of snap.artists) {
                if (Math.abs(a.delta) > 15) {
                    newAlerts.push({
                        time: new Date().toLocaleTimeString(),
                        msg: `${a.delta > 0 ? '🔥' : '⚠️'} ${a.name} ${a.delta > 0 ? '+' : ''}${a.delta.toFixed(1)}%`,
                        color: a.delta > 0 ? '#4ade80' : '#f87171',
                    });
                }
                if (a.buybackActive) {
                    newAlerts.push({
                        time: new Date().toLocaleTimeString(),
                        msg: `🛡️ ${a.name} buyback active`,
                        color: '#fbbf24',
                    });
                }
            }
            if (newAlerts.length > 0) {
                setAlerts(prev => [...newAlerts, ...prev].slice(0, 30));
            }
        }, tickSpeed);

        return () => clearInterval(interval);
    }, [tickSpeed, selectedArtist]);

    // ── Derived data ──
    const sortedArtists = useMemo(() => {
        if (!snapshot) return [];
        const list = [...snapshot.artists];
        const fns = {
            delta: (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
            name: (a, b) => a.name.localeCompare(b.name),
            price: (a, b) => b.avgPrice - a.avgPrice,
            heat: (a, b) => b.heat - a.heat,
        };
        return list.sort(fns[watchlistSort] || fns.delta);
    }, [snapshot, watchlistSort]);

    const selectedData = snapshot?.artists?.find(a => a.id === selectedArtist);
    const selectedPrices = priceHistory[selectedArtist] || [];
    const trades = MarketSimulator.tradeLog || [];
    const recentTrades = trades.slice(-20).reverse();
    const cycleColor = { bull: '#4ade80', bear: '#f87171', flat: '#94a3b8' };
    const tierColor = { 'blue-chip': '#c9a84c', hot: '#f87171', 'mid-career': '#60a5fa', emerging: '#4ade80' };

    // ── Not initialized state ──
    if (!snapshot || snapshot.artists.length === 0) {
        return (
            <div style={{ background: termBg, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: mono, color: '#333' }}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>📡</div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>ART TERMINAL</div>
                <div style={{ fontSize: 10, color: '#333', maxWidth: 300, textAlign: 'center', lineHeight: 1.6 }}>
                    Waiting for market data...<br />
                    Start a game or run a simulation from the NPC Simulation panel to populate the market.
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>
                    {[1000, 2000, 5000].map(s => (
                        <button key={s} onClick={() => setTickSpeed(s)} style={speedBtn(tickSpeed === s)}>
                            {s / 1000}s
                        </button>
                    ))}
                    <button onClick={() => setTickSpeed(0)} style={speedBtn(tickSpeed === 0)}>⏸</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: termBg, height: '100%', display: 'flex', flexDirection: 'column', fontFamily: mono, overflow: 'hidden' }}>

            {/* ═══ TOP BAR ═══ */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px', borderBottom: `1px solid ${borderClr}`, background: '#08081a',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Composite Index */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 8, color: dimText }}>ART</span>
                        <span style={{ fontSize: 18, fontWeight: 'bold', color: '#c9a84c' }}>
                            {snapshot.composite.toLocaleString()}
                        </span>
                        {compositeHistory.length > 1 && (() => {
                            const prev = compositeHistory[compositeHistory.length - 2];
                            const d = ((snapshot.composite - prev) / prev) * 100;
                            return (
                                <span style={{ fontSize: 10, color: d > 0 ? '#4ade80' : d < 0 ? '#f87171' : '#555' }}>
                                    {d > 0 ? '▲' : d < 0 ? '▼' : '—'}{Math.abs(d).toFixed(2)}%
                                </span>
                            );
                        })()}
                        <TinySparkline
                            data={compositeHistory}
                            width={80} height={18}
                            color="#c9a84c"
                        />
                    </div>

                    {/* Market cycle */}
                    <span style={{
                        fontSize: 8, padding: '2px 8px', borderRadius: 3,
                        background: `${cycleColor[snapshot.cycle] || '#555'}15`,
                        color: cycleColor[snapshot.cycle] || '#555',
                        fontWeight: 'bold', letterSpacing: 1,
                    }}>
                        {(snapshot.cycle || 'FLAT').toUpperCase()}
                    </span>

                    {/* Sector indices */}
                    {snapshot.sectors && Object.entries(snapshot.sectors).map(([tier, data]) => (
                        <span key={tier} style={{ fontSize: 8, color: tierColor[tier] || '#555' }}>
                            {tier.slice(0, 3).toUpperCase()} {data.index}
                        </span>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 8, color: dimText }}>W:{snapshot.week}</span>
                    <span style={{ fontSize: 8, color: dimText }}>T:{tickCount}</span>
                    <div style={{ width: 1, height: 14, background: '#222' }} />
                    {[1000, 2000, 5000].map(s => (
                        <button key={s} onClick={() => setTickSpeed(s)} style={speedBtn(tickSpeed === s)}>
                            {s / 1000}s
                        </button>
                    ))}
                    <button onClick={() => setTickSpeed(0)} style={speedBtn(tickSpeed === 0)}>⏸</button>
                </div>
            </div>

            {/* ═══ MAIN AREA ═══ */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* ─── LEFT: WATCHLIST ─── */}
                <div style={{ width: 240, display: 'flex', flexDirection: 'column', ...panel, borderRadius: 0, border: 'none', borderRight: `1px solid ${borderClr}` }}>
                    <div style={{ ...panelHeader, color: '#c9a84c' }}>
                        <span>WATCHLIST</span>
                        <select
                            value={watchlistSort}
                            onChange={e => setWatchlistSort(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: dimText, fontSize: 8, fontFamily: mono }}
                        >
                            <option value="delta">Δ%</option>
                            <option value="name">A-Z</option>
                            <option value="price">Price</option>
                            <option value="heat">Heat</option>
                        </select>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {sortedArtists.map(a => {
                            const isActive = selectedArtist === a.id;
                            const deltaColor = a.delta > 0 ? '#4ade80' : a.delta < 0 ? '#f87171' : '#555';
                            return (
                                <div
                                    key={a.id}
                                    onClick={() => setSelectedArtist(a.id)}
                                    style={{
                                        padding: '6px 10px', cursor: 'pointer',
                                        borderBottom: `1px solid ${isActive ? '#c9a84c22' : '#0a0a14'}`,
                                        background: isActive ? 'rgba(201,168,76,0.06)' : 'transparent',
                                        borderLeft: isActive ? '2px solid #c9a84c' : '2px solid transparent',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <span style={{ fontSize: 10, color: isActive ? '#c9a84c' : '#ddd', fontWeight: 'bold' }}>
                                            {a.name}
                                        </span>
                                        <span style={{ fontSize: 10, color: deltaColor, fontWeight: 'bold' }}>
                                            {a.delta > 0 ? '+' : ''}{a.delta.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                        <span style={{ fontSize: 9, color: mutedText }}>
                                            ${a.avgPrice.toLocaleString()}
                                        </span>
                                        <TinySparkline
                                            data={priceHistory[a.id] || []}
                                            width={50} height={14}
                                            color={deltaColor}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                                        <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 2, background: `${tierColor[a.tier] || '#888'}15`, color: tierColor[a.tier] || '#888' }}>
                                            {a.tier}
                                        </span>
                                        <span style={{ fontSize: 7, color: '#333' }}>🔥{a.heat}</span>
                                        {a.buybackActive && <span style={{ fontSize: 7, color: '#fbbf24' }}>🛡️</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── RIGHT AREA ─── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* CENTER: CHART */}
                    <div style={{ flex: 1, ...panel, borderRadius: 0, border: 'none', borderBottom: `1px solid ${borderClr}`, minHeight: 200 }}>
                        <div style={{ ...panelHeader, color: selectedData ? (tierColor[selectedData.tier] || '#ddd') : '#555' }}>
                            <span>
                                {selectedData ? `${selectedData.name} — $${selectedData.avgPrice.toLocaleString()}` : 'SELECT ARTIST'}
                                {selectedData && (
                                    <span style={{ color: selectedData.delta > 0 ? '#4ade80' : selectedData.delta < 0 ? '#f87171' : '#555', marginLeft: 8 }}>
                                        {selectedData.delta > 0 ? '▲' : selectedData.delta < 0 ? '▼' : '—'}{Math.abs(selectedData.delta).toFixed(1)}%
                                    </span>
                                )}
                            </span>
                            {selectedData && (
                                <span style={{ fontSize: 8, color: dimText }}>
                                    IDX: {selectedData.index} · 🔥{selectedData.heat} · {selectedData.worksCount} works
                                </span>
                            )}
                        </div>
                        <div style={{ flex: 1, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PriceChart
                                data={selectedPrices}
                                width={Math.max(400, (selectedPrices.length || 1) * 8)}
                                height={180}
                                color={selectedData ? (tierColor[selectedData.tier] || '#c9a84c') : '#c9a84c'}
                                label={selectedData?.tier || ''}
                            />
                        </div>
                    </div>

                    {/* BOTTOM ROW: 3 panels */}
                    <div style={{ height: 200, display: 'flex', overflow: 'hidden' }}>

                        {/* Trade Feed */}
                        <div ref={feedRef} style={{ flex: 1, ...panel, borderRadius: 0, border: 'none', borderRight: `1px solid ${borderClr}` }}>
                            <div style={{ ...panelHeader, color: '#4ade80' }}>
                                <span>TRADE FEED</span>
                                <span style={{ color: dimText, fontWeight: 'normal' }}>{recentTrades.length}</span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
                                {recentTrades.length === 0 ? (
                                    <div style={{ fontSize: 9, color: '#222', textAlign: 'center', padding: 16 }}>No trades yet</div>
                                ) : (
                                    recentTrades.map((t, i) => (
                                        <div key={i} style={{
                                            fontSize: 9, padding: '3px 6px', borderBottom: '1px solid #0a0a14',
                                            display: 'flex', gap: 6,
                                        }}>
                                            <span style={{ color: '#333', width: 24 }}>W{t.week}</span>
                                            <span style={{ color: '#4ade80', fontWeight: 'bold', width: 60 }}>${t.price?.toLocaleString()}</span>
                                            <span style={{ color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {t.title || t.artworkId}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Order Book */}
                        <div style={{ flex: 1, ...panel, borderRadius: 0, border: 'none', borderRight: `1px solid ${borderClr}` }}>
                            <div style={{ ...panelHeader, color: '#60a5fa' }}>
                                <span>ORDER BOOK</span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                                {/* Bids */}
                                <div style={{ flex: 1, overflowY: 'auto', borderRight: `1px solid ${borderClr}` }}>
                                    <div style={{ fontSize: 7, color: '#333', textAlign: 'center', padding: '2px 0', borderBottom: '1px solid #111' }}>BIDS</div>
                                    {sortedArtists.filter(a => a.onMarket > 0).slice(0, 8).map(a => (
                                        <div key={a.id} style={{ fontSize: 8, padding: '2px 6px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0a0a14' }}>
                                            <span style={{ color: '#4ade80' }}>${Math.round(a.avgPrice * 0.92).toLocaleString()}</span>
                                            <span style={{ color: '#333' }}>{a.name.slice(0, 8)}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Asks */}
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    <div style={{ fontSize: 7, color: '#333', textAlign: 'center', padding: '2px 0', borderBottom: '1px solid #111' }}>ASKS</div>
                                    {sortedArtists.filter(a => a.onMarket > 0).slice(0, 8).map(a => (
                                        <div key={a.id} style={{ fontSize: 8, padding: '2px 6px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0a0a14' }}>
                                            <span style={{ color: '#333' }}>{a.name.slice(0, 8)}</span>
                                            <span style={{ color: '#f87171' }}>${Math.round(a.avgPrice * 1.08).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Alerts */}
                        <div style={{ flex: 1, ...panel, borderRadius: 0, border: 'none' }}>
                            <div style={{ ...panelHeader, color: '#fbbf24' }}>
                                <span>⚡ ALERTS</span>
                                <span style={{ color: dimText, fontWeight: 'normal' }}>{alerts.length}</span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
                                {alerts.length === 0 ? (
                                    <div style={{ fontSize: 9, color: '#222', textAlign: 'center', padding: 16 }}>Waiting for events...</div>
                                ) : (
                                    alerts.map((a, i) => (
                                        <div key={i} style={{
                                            fontSize: 9, padding: '3px 6px', borderBottom: '1px solid #0a0a14',
                                            display: 'flex', gap: 6,
                                        }}>
                                            <span style={{ color: '#222', fontSize: 7 }}>{a.time}</span>
                                            <span style={{ color: a.color }}>{a.msg}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
