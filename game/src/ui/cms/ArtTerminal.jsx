/**
 * ArtTerminal.jsx — Live Day-Trading Terminal for Art Market
 *
 * Multi-panel, auto-ticking terminal that shows real-time price movement,
 * trade feeds, and market alerts. Hooks into MarketManager.microTick()
 * for live O-U price jitter and MarketSimulator.simulate() for full
 * weekly NPC trade cycles.
 *
 * ARCHITECTURE CONTEXT (for other agents):
 * ┌──────────────────────────────────────────────────────┐
 * │  ArtTerminal (THIS FILE)                             │
 * │  └─ LIVE MODE: MarketManager.microTick() on interval  │
 * │  └─ SIM MODE: MarketSimulator.simulate() per week     │
 * │  └─ Consumes: getTickSnapshot(), getOpenSellOrders(), │
 * │     tradeLog, marketEvents                            │
 * │  └─ Lives in: MasterCMS sidebar → "📡 Live Terminal"    │
 * │  └─ Sibling: MarketSimDashboard (batch sim + 8 tabs)  │
 * └──────────────────────────────────────────────────────┘
 *
 * Layout: Header → [Watchlist | Chart] → [Feed | OrderBook | Alerts]
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MarketManager } from '../../managers/MarketManager.js';
import { MarketSimulator } from '../../managers/MarketSimulator.js';
import { GameState } from '../../managers/GameState.js';
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
// SVG OHLC CANDLESTICK CHART
// ══════════════════════════════════════════════

function CandlestickChart({ candles, width = 500, height = 180, color = '#c9a84c', label = '' }) {
    if (!candles || candles.length < 2) {
        return (
            <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dimText, fontSize: 10 }}>
                Accumulating tick data...
            </div>
        );
    }

    const chartH = height - 30; // reserve 30px for volume bars
    const volH = 25;
    const allPrices = candles.flatMap(c => [c.high, c.low]);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const range = max - min || 1;
    const maxVol = Math.max(...candles.map(c => c.vol || 0), 1);
    const barW = Math.max(3, Math.min(12, (width - 20) / candles.length - 2));

    const yScale = (v) => chartH - ((v - min) / range) * (chartH - 20) - 10;

    // Grid lines
    const grids = [];
    for (let i = 0; i <= 4; i++) {
        const y = 10 + (i / 4) * (chartH - 20);
        const val = max - (i / 4) * range;
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
            {candles.map((c, i) => {
                const x = 10 + (i / (candles.length - 1)) * (width - 20);
                const isUp = c.close >= c.open;
                const bodyColor = isUp ? '#4ade80' : '#f87171';
                const wickColor = isUp ? '#2a7a4a' : '#a03030';
                const top = yScale(Math.max(c.open, c.close));
                const bottom = yScale(Math.min(c.open, c.close));
                const bodyH = Math.max(1, bottom - top);
                return (
                    <g key={i}>
                        {/* Wick */}
                        <line x1={x} y1={yScale(c.high)} x2={x} y2={yScale(c.low)} stroke={wickColor} strokeWidth={1} />
                        {/* Body */}
                        <rect x={x - barW / 2} y={top} width={barW} height={bodyH} fill={bodyColor} rx={1} />
                        {/* Volume bar */}
                        {c.vol > 0 && (
                            <rect
                                x={x - barW / 2} y={chartH + 2 + volH - (c.vol / maxVol) * volH}
                                width={barW} height={(c.vol / maxVol) * volH}
                                fill={isUp ? '#4ade8030' : '#f8717130'} rx={1}
                            />
                        )}
                    </g>
                );
            })}
            {/* Current price line */}
            {candles.length > 0 && (() => {
                const last = candles[candles.length - 1];
                const y = yScale(last.close);
                return (
                    <>
                        <line x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={0.5} strokeDasharray="3,3" />
                        <text x={width - 4} y={y - 4} fill={color} fontSize={9} fontFamily={mono} textAnchor="end" fontWeight="bold">
                            ${last.close.toLocaleString()}
                        </text>
                    </>
                );
            })()}
            {label && <text x={8} y={height - 4} fill="#333" fontSize={8} fontFamily={mono}>{label}</text>}
        </svg>
    );
}

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
    const [simWeek, setSimWeek] = useState(1);
    const [lastSimTrades, setLastSimTrades] = useState(0);
    const [autoSim, setAutoSim] = useState(false); // auto-sim interval
    const [ohlcHistory, setOhlcHistory] = useState({}); // artistId → [{open,high,low,close,vol}]
    const [compositeOhlc, setCompositeOhlc] = useState([]); // [{open,high,low,close,vol}]
    const [bottomTab, setBottomTab] = useState('feed'); // 'feed' | 'portfolio'
    const feedRef = useRef(null);
    const candlePeriod = 5; // ticks per candle
    const tickAccum = useRef({}); // accumulate ticks for OHLC
    const compositeAccum = useRef({ ticks: [] });
    const maxHistory = 60; // Keep last 60 ticks of price data
    const maxCandles = 40; // Keep last 40 candles

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

            // Accumulate OHLC data per artist
            if (tickCount > 0 && (tickCount + 1) % candlePeriod === 0) {
                setOhlcHistory(prev => {
                    const next = { ...prev };
                    for (const a of snap.artists) {
                        const acc = tickAccum.current[a.id];
                        if (acc && acc.length >= candlePeriod) {
                            const candle = {
                                open: acc[0], high: Math.max(...acc), low: Math.min(...acc),
                                close: acc[acc.length - 1],
                                vol: (MarketSimulator.tradeLog || []).filter(t => {
                                    const work = (MarketManager.works || []).find(w => w.id === t.artwork);
                                    return work?.artistId === a.id;
                                }).length,
                            };
                            const hist = [...(next[a.id] || []), candle];
                            if (hist.length > maxCandles) hist.shift();
                            next[a.id] = hist;
                        }
                        tickAccum.current[a.id] = [];
                    }
                    return next;
                });

                // Composite OHLC
                const cAcc = compositeAccum.current.ticks;
                if (cAcc.length >= candlePeriod) {
                    setCompositeOhlc(prev => {
                        const candle = {
                            open: cAcc[0], high: Math.max(...cAcc), low: Math.min(...cAcc),
                            close: cAcc[cAcc.length - 1],
                            vol: (MarketSimulator.tradeLog || []).length,
                        };
                        const next = [...prev, candle];
                        if (next.length > maxCandles) next.shift();
                        return next;
                    });
                    compositeAccum.current.ticks = [];
                }
            } else {
                // Accumulate ticks
                for (const a of snap.artists) {
                    if (!tickAccum.current[a.id]) tickAccum.current[a.id] = [];
                    tickAccum.current[a.id].push(a.avgPrice);
                }
                compositeAccum.current.ticks.push(snap.composite);
            }

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

    // ── Sim Week handler ──
    const runSimWeek = useCallback(() => {
        const cycle = snapshot?.cycle || 'flat';
        const week = simWeek;
        try {
            const result = MarketSimulator.simulate(week, cycle);
            setSimWeek(w => w + 1);

            // Count new trades
            const newTradeCount = (MarketSimulator.tradeLog || []).length;
            const tradesThisWeek = newTradeCount - lastSimTrades;
            setLastSimTrades(newTradeCount);

            // Generate alert for sim week
            setAlerts(prev => [{
                time: new Date().toLocaleTimeString(),
                msg: `📅 Week ${week} simulated — ${tradesThisWeek} trades`,
                color: '#60a5fa',
            }, ...prev].slice(0, 50));

            // Force a snapshot refresh
            const snap = MarketManager.getTickSnapshot();
            if (snap?.artists?.length > 0) setSnapshot(snap);
        } catch (e) {
            setAlerts(prev => [{
                time: new Date().toLocaleTimeString(),
                msg: `❌ Sim error: ${e.message}`,
                color: '#f87171',
            }, ...prev].slice(0, 50));
        }
    }, [simWeek, snapshot, lastSimTrades]);

    // ── Auto-SIM engine ──
    useEffect(() => {
        if (!autoSim) return;
        const interval = setInterval(() => { runSimWeek(); }, 3000);
        return () => clearInterval(interval);
    }, [autoSim, runSimWeek]);

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
    const recentTrades = trades.slice(-30).reverse();
    const cycleColor = { bull: '#4ade80', bear: '#f87171', flat: '#94a3b8' };
    const tierColor = { 'blue-chip': '#c9a84c', hot: '#f87171', 'mid-career': '#60a5fa', emerging: '#4ade80' };

    // Real order book from MarketSimulator
    const openOrders = useMemo(() => {
        try { return MarketSimulator.getOpenSellOrders() || []; } catch { return []; }
    }, [tickCount, simWeek]);

    // Portfolio data from GameState
    const portfolio = useMemo(() => {
        try {
            const state = GameState.state;
            if (!state) return { cash: 0, items: [], value: 0, netWorth: 0 };
            const items = (state.portfolio || []).map(w => {
                const currentVal = MarketManager.calculatePrice?.(w) || w.currentVal || w.purchasePrice || 0;
                return { ...w, currentVal, roi: w.purchasePrice > 0 ? ((currentVal - w.purchasePrice) / w.purchasePrice * 100) : 0 };
            });
            const value = items.reduce((s, w) => s + w.currentVal, 0);
            return { cash: state.cash || 0, items, value, netWorth: (state.cash || 0) + value };
        } catch { return { cash: 0, items: [], value: 0, netWorth: 0 }; }
    }, [tickCount, simWeek]);

    // Market depth: supply vs demand
    const marketDepth = useMemo(() => {
        const supply = openOrders.length;
        const demand = sortedArtists.reduce((s, a) => s + (a.heat > 50 ? 2 : a.heat > 20 ? 1 : 0), 0);
        const total = supply + demand || 1;
        return { supply, demand, supplyPct: (supply / total) * 100, demandPct: (demand / total) * 100 };
    }, [openOrders, sortedArtists]);

    // Market stats
    const marketCap = sortedArtists.reduce((s, a) => s + (a.avgPrice * (a.worksCount || 1)), 0);
    const totalVolume = trades.reduce((s, t) => s + (t.price || 0), 0);

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
                    <span style={{ fontSize: 8, color: dimText }}>W:{simWeek}</span>
                    <span style={{ fontSize: 8, color: dimText }}>T:{tickCount}</span>
                    <span style={{ fontSize: 8, color: '#333' }}>{trades.length} trades</span>
                    <div style={{ width: 1, height: 14, background: '#222' }} />
                    <button onClick={runSimWeek} style={{
                        ...speedBtn(false),
                        borderColor: '#60a5fa', color: '#60a5fa', fontWeight: 'bold',
                    }}>⏩ SIM</button>
                    <button onClick={() => setAutoSim(!autoSim)} style={{
                        ...speedBtn(autoSim),
                        borderColor: autoSim ? '#4ade80' : '#333', color: autoSim ? '#4ade80' : '#444',
                        fontWeight: 'bold',
                    }}>{autoSim ? '⏹ STOP' : '▶ AUTO'}</button>
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

                    {/* CENTER: CHART — OHLC Candlestick */}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {selectedData && (
                                    <span style={{ fontSize: 8, color: dimText }}>
                                        IDX: {selectedData.index} · 🔥{selectedData.heat} · {selectedData.worksCount} works
                                    </span>
                                )}
                                {/* Market depth bar */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: 6, color: '#4ade80' }}>D</span>
                                    <div style={{ width: 40, height: 4, background: '#1a1a2e', borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
                                        <div style={{ width: `${marketDepth.demandPct}%`, height: '100%', background: '#4ade8060' }} />
                                        <div style={{ width: `${marketDepth.supplyPct}%`, height: '100%', background: '#f8717160' }} />
                                    </div>
                                    <span style={{ fontSize: 6, color: '#f87171' }}>S</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ flex: 1, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {(ohlcHistory[selectedArtist] || []).length >= 2 ? (
                                <CandlestickChart
                                    candles={ohlcHistory[selectedArtist]}
                                    width={Math.max(400, (ohlcHistory[selectedArtist]?.length || 1) * 14)}
                                    height={180}
                                    color={selectedData ? (tierColor[selectedData.tier] || '#c9a84c') : '#c9a84c'}
                                    label={selectedData?.tier || ''}
                                />
                            ) : (
                                <PriceChart
                                    data={selectedPrices}
                                    width={Math.max(400, (selectedPrices.length || 1) * 8)}
                                    height={180}
                                    color={selectedData ? (tierColor[selectedData.tier] || '#c9a84c') : '#c9a84c'}
                                    label={`${selectedData?.tier || ''} · accumulating OHLC...`}
                                />
                            )}
                        </div>
                    </div>

                    {/* BOTTOM ROW: 4 panels */}
                    <div style={{ height: 220, display: 'flex', overflow: 'hidden' }}>

                        {/* Trade Feed / Portfolio toggle */}
                        <div style={{ flex: 1.2, ...panel, borderRadius: 0, border: 'none', borderRight: `1px solid ${borderClr}` }}>
                            <div style={{ ...panelHeader, color: bottomTab === 'feed' ? '#4ade80' : '#c9a84c' }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span onClick={() => setBottomTab('feed')} style={{ cursor: 'pointer', color: bottomTab === 'feed' ? '#4ade80' : dimText }}>TRADES</span>
                                    <span onClick={() => setBottomTab('portfolio')} style={{ cursor: 'pointer', color: bottomTab === 'portfolio' ? '#c9a84c' : dimText }}>PORTFOLIO</span>
                                </div>
                                <span style={{ color: dimText, fontWeight: 'normal' }}>{bottomTab === 'feed' ? recentTrades.length : portfolio.items.length}</span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
                                {bottomTab === 'feed' ? (
                                    recentTrades.length === 0 ? (
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
                                    )
                                ) : (
                                    /* Portfolio view */
                                    <>
                                        <div style={{ padding: '6px 6px', borderBottom: '1px solid #1a1a2e', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 8, color: '#888' }}>Cash</span>
                                            <span style={{ fontSize: 9, color: '#c9a84c', fontWeight: 'bold' }}>${portfolio.cash.toLocaleString()}</span>
                                        </div>
                                        <div style={{ padding: '4px 6px', borderBottom: '1px solid #1a1a2e', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 8, color: '#888' }}>Portfolio</span>
                                            <span style={{ fontSize: 9, color: '#ddd' }}>${portfolio.value.toLocaleString()}</span>
                                        </div>
                                        <div style={{ padding: '4px 6px', borderBottom: '1px solid #2a2a3e', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 8, color: '#888' }}>Net Worth</span>
                                            <span style={{ fontSize: 10, color: '#c9a84c', fontWeight: 'bold' }}>${portfolio.netWorth.toLocaleString()}</span>
                                        </div>
                                        {portfolio.items.slice(0, 8).map((w, i) => (
                                            <div key={i} style={{
                                                fontSize: 8, padding: '3px 6px', borderBottom: '1px solid #0a0a14',
                                                display: 'flex', gap: 4, alignItems: 'baseline',
                                            }}>
                                                <span style={{ color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {w.title || w.id}
                                                </span>
                                                <span style={{ color: '#ddd', width: 52 }}>${w.currentVal?.toLocaleString()}</span>
                                                <span style={{ color: w.roi >= 0 ? '#4ade80' : '#f87171', width: 40, textAlign: 'right', fontWeight: 'bold' }}>
                                                    {w.roi >= 0 ? '+' : ''}{w.roi.toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Order Book — REAL data from MarketSimulator */}
                        <div style={{ flex: 1, ...panel, borderRadius: 0, border: 'none', borderRight: `1px solid ${borderClr}` }}>
                            <div style={{ ...panelHeader, color: '#60a5fa' }}>
                                <span>ORDER BOOK</span>
                                <span style={{ color: dimText, fontWeight: 'normal' }}>{openOrders.length}</span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
                                {openOrders.length === 0 ? (
                                    <div style={{ fontSize: 9, color: '#222', textAlign: 'center', padding: 16 }}>No open orders — run a sim week</div>
                                ) : (
                                    openOrders.slice(0, 12).map((o, i) => {
                                        const work = (MarketManager.works || []).find(w => w.id === o.artworkId);
                                        return (
                                            <div key={i} style={{
                                                fontSize: 8, padding: '3px 6px', borderBottom: '1px solid #0a0a14',
                                                display: 'flex', gap: 4, alignItems: 'baseline',
                                            }}>
                                                <span style={{ color: o.type === 'sell' ? '#f87171' : '#4ade80', fontWeight: 'bold', width: 28 }}>
                                                    {(o.type || 'sell').toUpperCase()}
                                                </span>
                                                <span style={{ color: '#c9a84c', width: 52 }}>${(o.askPrice || o.price || 0).toLocaleString()}</span>
                                                <span style={{ color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {work?.title || o.artworkId}
                                                </span>
                                                <span style={{ color: '#333', fontSize: 7 }}>
                                                    {o.sellerName || o.seller || ''}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
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

                    {/* ═══ STATS FOOTER ═══ */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '4px 12px', borderTop: `1px solid ${borderClr}`, background: '#08081a',
                        fontSize: 7, fontFamily: mono, color: '#333',
                    }}>
                        <span>MKT CAP: <span style={{ color: '#c9a84c' }}>${(marketCap / 1000).toFixed(0)}K</span></span>
                        <span>VOL: <span style={{ color: '#4ade80' }}>${(totalVolume / 1000).toFixed(0)}K</span></span>
                        <span>ORDERS: <span style={{ color: '#60a5fa' }}>{openOrders.length}</span></span>
                        <span>ARTISTS: <span style={{ color: '#ddd' }}>{sortedArtists.length}</span></span>
                        <span>DEPTH: <span style={{ color: '#4ade80' }}>{marketDepth.demand}D</span>/<span style={{ color: '#f87171' }}>{marketDepth.supply}S</span></span>
                        {autoSim && <span style={{ color: '#4ade80' }}>● AUTO-SIM</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
