/**
 * MarketSimDashboard — Bloomberg-Terminal-Style Market Simulation Command Center
 *
 * 8 tabs: Ticker, Charts, Order Book, Collectors, Trade Feed, Strategies, Alerts, Events
 * All charts via inline SVG — no external dependencies.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { MarketSimulator } from '../../managers/MarketSimulator.js';
import { MarketManager } from '../../managers/MarketManager.js';

// ══════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════

const mono = '"IBM Plex Mono", "Courier New", monospace';
const card = { background: '#0a0a12', border: '1px solid #222', borderRadius: 4, padding: 10, fontSize: 10, color: '#ddd', fontFamily: mono };
const miniBtn = {
    background: 'transparent', border: '1px solid #333', color: '#666',
    padding: '4px 10px', cursor: 'pointer', fontFamily: mono, fontSize: 9,
    borderRadius: 3, textTransform: 'uppercase', letterSpacing: 0.5,
};
const activeBtn = (isActive) => ({
    ...miniBtn,
    borderColor: isActive ? '#c9a84c' : '#333',
    color: isActive ? '#c9a84c' : '#555',
    background: isActive ? 'rgba(201,168,76,0.08)' : 'transparent',
});

const cycleColors = { bull: '#4ade80', bear: '#f87171', flat: '#94a3b8' };
const cycleIcons = { bull: '📈', bear: '📉', flat: '📊' };
const tierColors = { 'blue-chip': '#c9a84c', 'hot': '#f87171', 'mid-career': '#60a5fa', 'emerging': '#4ade80' };
const severityColors = { positive: '#4ade80', negative: '#f87171', neutral: '#94a3b8' };
const strategyColors = { accumulator: '#4ade80', flipper: '#f59e0b', holder: '#94a3b8' };
const roleColors = {
    dealer: '#c9a84c', gallerist: '#60a5fa', auction: '#a78bfa',
    artist: '#4ade80', collector: '#f87171', advisor: '#fb923c',
    speculator: '#e879f9', mega_dealer: '#fbbf24', young_hustler: '#22d3ee',
    institutional: '#94a3b8', curator: '#a78bfa',
};

// ══════════════════════════════════════════════
// SVG SPARKLINE
// ══════════════════════════════════════════════

function Sparkline({ data, width = 120, height = 28, color = '#c9a84c', showArea = false }) {
    if (!data || data.length < 2) return <span style={{ color: '#333', fontSize: 9 }}>—</span>;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} style={{ display: 'block' }}>
            {showArea && (
                <polygon
                    points={`0,${height} ${points} ${width},${height}`}
                    fill={`${color}15`}
                />
            )}
            <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
    );
}

// ══════════════════════════════════════════════
// STAT BOX
// ══════════════════════════════════════════════

function StatBox({ label, value, color = '#c9a84c', delta, sub }) {
    return (
        <div style={{
            background: '#0a0a12', border: '1px solid #1a1a2e', borderRadius: 4,
            padding: '6px 12px', minWidth: 80, fontFamily: mono,
        }}>
            <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                {value}
                {delta !== undefined && (
                    <span style={{ fontSize: 10, color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#555' }}>
                        {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'}{Math.abs(delta).toFixed(1)}%
                    </span>
                )}
            </div>
            {sub && <div style={{ fontSize: 8, color: '#444', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: TICKER
// ══════════════════════════════════════════════

function TickerTab({ simResult, priceHistory }) {
    if (!simResult) return <EmptyState />;
    const latest = priceHistory?.[priceHistory.length - 1];
    const prev = priceHistory?.[priceHistory.length - 2];
    const compositeData = priceHistory?.map(p => p.compositeIndex) || [];
    const compositeNow = latest?.compositeIndex || 1000;
    const compositePrev = prev?.compositeIndex || compositeNow;
    const compositeDelta = compositePrev > 0 ? ((compositeNow - compositePrev) / compositePrev) * 100 : 0;

    // Get sector data from latest snapshot
    const sectors = {};
    if (latest?.artists) {
        for (const [id, a] of Object.entries(latest.artists)) {
            if (!sectors[a.tier]) sectors[a.tier] = { total: 0, count: 0 };
            sectors[a.tier].total += a.index;
            sectors[a.tier].count++;
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Composite Index Hero */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 24, padding: 16,
                background: 'linear-gradient(135deg, #0a0a12 0%, #111 100%)',
                border: '1px solid #222', borderRadius: 6,
            }}>
                <div>
                    <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 2 }}>
                        ARTLIFE COMPOSITE INDEX
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 'bold', color: '#c9a84c', fontFamily: mono }}>
                        {compositeNow.toLocaleString()}
                    </div>
                    <div style={{
                        fontSize: 12, color: compositeDelta > 0 ? '#4ade80' : compositeDelta < 0 ? '#f87171' : '#94a3b8',
                    }}>
                        {compositeDelta > 0 ? '▲' : compositeDelta < 0 ? '▼' : '—'} {Math.abs(compositeDelta).toFixed(2)}%
                    </div>
                </div>
                <div style={{ flex: 1 }}>
                    <Sparkline data={compositeData} width={300} height={50} color="#c9a84c" showArea />
                </div>
                <div style={{
                    padding: '6px 16px', borderRadius: 4,
                    background: `${cycleColors[latest?.cycle || 'flat']}15`,
                    border: `1px solid ${cycleColors[latest?.cycle || 'flat']}40`,
                    color: cycleColors[latest?.cycle || 'flat'],
                    fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase',
                }}>
                    {cycleIcons[latest?.cycle || 'flat']} {latest?.cycle || 'FLAT'} MARKET
                </div>
            </div>

            {/* Sector Indices */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(sectors).map(([tier, data]) => {
                    const avg = Math.round((data.total / data.count) * 2);
                    return (
                        <StatBox key={tier} label={tier} value={avg.toLocaleString()}
                            color={tierColors[tier] || '#aaa'} sub={`${data.count} artists`} />
                    );
                })}
            </div>

            {/* Artist Ticker Strip */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: 8, color: '#555', padding: '6px 10px', borderBottom: '1px solid #1a1a2e', letterSpacing: 1 }}>
                    ARTIST TICKER
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {latest?.artists && Object.entries(latest.artists).map(([id, a]) => {
                        const prevA = prev?.artists?.[id];
                        const delta = prevA ? ((a.avgPrice - prevA.avgPrice) / prevA.avgPrice) * 100 : 0;
                        const artistHistory = priceHistory.map(p => p.artists?.[id]?.avgPrice).filter(Boolean);
                        return (
                            <div key={id} style={{
                                padding: '8px 12px', borderRight: '1px solid #1a1a2e',
                                borderBottom: '1px solid #1a1a2e', minWidth: 160, flex: '1 0 160px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 'bold', color: tierColors[a.tier] || '#aaa' }}>
                                        {a.name}
                                    </span>
                                    <span style={{
                                        fontSize: 9,
                                        color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#555',
                                    }}>
                                        {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'}{Math.abs(delta).toFixed(1)}%
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                                    <span style={{ fontSize: 13, fontWeight: 'bold', color: '#eee' }}>
                                        ${a.avgPrice.toLocaleString()}
                                    </span>
                                    <Sparkline data={artistHistory} width={60} height={18}
                                        color={delta >= 0 ? '#4ade80' : '#f87171'} />
                                </div>
                                <div style={{ fontSize: 8, color: '#444', marginTop: 2 }}>
                                    Heat {a.heat} · Idx {a.index}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: CHARTS
// ══════════════════════════════════════════════

function ChartsTab({ priceHistory, simResult }) {
    const [selectedArtist, setSelectedArtist] = useState(null);
    if (!priceHistory?.length) return <EmptyState />;

    const artistIds = Object.keys(priceHistory[0]?.artists || {});
    const compositeData = priceHistory.map(p => p.compositeIndex);
    const volumeData = priceHistory.map(p => p.volume);

    // Full chart SVG
    const chartW = 500, chartH = 160;
    const renderChart = (data, color, label) => {
        if (!data || data.length < 2) return null;
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const points = data.map((v, i) => {
            const x = (i / (data.length - 1)) * chartW;
            const y = chartH - ((v - min) / range) * (chartH - 20) - 10;
            return `${x},${y}`;
        }).join(' ');

        return (
            <div style={{ ...card, marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: '#555', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color }}>{label}</span>
                    <span>{data[data.length - 1]?.toLocaleString()}</span>
                </div>
                <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none"
                    style={{ display: 'block', maxHeight: chartH }}>
                    <polygon points={`0,${chartH} ${points} ${chartW},${chartH}`} fill={`${color}10`} />
                    <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map(pct => (
                        <line key={pct} x1={0} y1={chartH * pct} x2={chartW} y2={chartH * pct}
                            stroke="#1a1a2e" strokeWidth={0.5} />
                    ))}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#444', marginTop: 4 }}>
                    <span>W{priceHistory[0]?.week}</span>
                    <span>W{priceHistory[priceHistory.length - 1]?.week}</span>
                </div>
            </div>
        );
    };

    // Per-artist chart when selected
    const artistData = selectedArtist
        ? priceHistory.map(p => p.artists?.[selectedArtist]?.avgPrice).filter(Boolean)
        : null;
    const artistInfo = selectedArtist ? priceHistory[0]?.artists?.[selectedArtist] : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {renderChart(compositeData, '#c9a84c', '🏛️ COMPOSITE INDEX')}
            {renderChart(volumeData, '#60a5fa', '📊 WEEKLY VOLUME ($)')}

            {/* Artist selector */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {artistIds.map(id => {
                    const a = priceHistory[priceHistory.length - 1]?.artists?.[id];
                    if (!a) return null;
                    return (
                        <button key={id} onClick={() => setSelectedArtist(selectedArtist === id ? null : id)}
                            style={activeBtn(selectedArtist === id)}>
                            {a.name}
                        </button>
                    );
                })}
            </div>

            {selectedArtist && artistData && (
                renderChart(artistData, tierColors[artistInfo?.tier] || '#aaa',
                    `${artistInfo?.name || 'Artist'} — AVG PRICE`)
            )}
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: ORDER BOOK
// ══════════════════════════════════════════════

function OrderBookTab({ simResult }) {
    if (!simResult) return <EmptyState />;
    const sells = MarketSimulator.getOpenSellOrders?.() || [];
    const buys = MarketSimulator.getOpenBuyOrders?.() || [];

    return (
        <div style={{ display: 'flex', gap: 12 }}>
            {/* Sell Side (Asks) */}
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: '#f87171', fontWeight: 'bold', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
                    📕 ASKS ({sells.length})
                </div>
                {sells.length === 0 ? (
                    <div style={{ color: '#333', fontSize: 10, textAlign: 'center', padding: 20 }}>No open sell orders</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #222' }}>
                                <th style={{ textAlign: 'left', padding: 4, color: '#555' }}>Artwork</th>
                                <th style={{ textAlign: 'right', padding: 4, color: '#555' }}>Ask</th>
                                <th style={{ textAlign: 'left', padding: 4, color: '#555' }}>Seller</th>
                                <th style={{ textAlign: 'center', padding: 4, color: '#555' }}>Urgency</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sells.slice(0, 15).map((o, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                                    <td style={{ padding: 4, color: '#ddd' }}>{o.artworkTitle || o.artworkId}</td>
                                    <td style={{ padding: 4, color: '#f87171', textAlign: 'right', fontWeight: 'bold' }}>
                                        ${o.askPrice?.toLocaleString()}
                                    </td>
                                    <td style={{ padding: 4, color: '#888' }}>{o.sellerName || o.sellerId}</td>
                                    <td style={{ padding: 4, textAlign: 'center' }}>
                                        <span style={{
                                            fontSize: 8, padding: '1px 6px', borderRadius: 3,
                                            background: o.urgency === 'high' ? '#f8717115' : '#94a3b815',
                                            color: o.urgency === 'high' ? '#f87171' : '#94a3b8',
                                        }}>{o.urgency || 'normal'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Buy Side (Bids) */}
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: '#4ade80', fontWeight: 'bold', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
                    📗 BIDS ({buys.length})
                </div>
                {buys.length === 0 ? (
                    <div style={{ color: '#333', fontSize: 10, textAlign: 'center', padding: 20 }}>No open buy orders</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #222' }}>
                                <th style={{ textAlign: 'left', padding: 4, color: '#555' }}>Buyer</th>
                                <th style={{ textAlign: 'right', padding: 4, color: '#555' }}>Budget</th>
                                <th style={{ textAlign: 'left', padding: 4, color: '#555' }}>Pref Tiers</th>
                            </tr>
                        </thead>
                        <tbody>
                            {buys.slice(0, 15).map((o, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                                    <td style={{ padding: 4, color: '#ddd' }}>{o.buyerName || o.buyerId}</td>
                                    <td style={{ padding: 4, color: '#4ade80', textAlign: 'right', fontWeight: 'bold' }}>
                                        ${o.budget?.toLocaleString()}
                                    </td>
                                    <td style={{ padding: 4, color: '#666' }}>
                                        {(o.preferredTiers || []).join(', ') || 'any'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: COLLECTORS
// ══════════════════════════════════════════════

function CollectorsTab({ npcs }) {
    if (!npcs.length) return <EmptyState />;
    const sorted = [...npcs].sort((a, b) => b.collectionSize - a.collectionSize);

    return (
        <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #333' }}>
                        <th style={{ textAlign: 'left', padding: 6, color: '#555' }}>#</th>
                        <th style={{ textAlign: 'left', padding: 6, color: '#555' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: 6, color: '#555' }}>Role</th>
                        <th style={{ textAlign: 'right', padding: 6, color: '#555' }}>Collection</th>
                        <th style={{ textAlign: 'right', padding: 6, color: '#555' }}>Cash</th>
                        <th style={{ textAlign: 'right', padding: 6, color: '#555' }}>P&L</th>
                        <th style={{ textAlign: 'right', padding: 6, color: '#555' }}>Bought</th>
                        <th style={{ textAlign: 'right', padding: 6, color: '#555' }}>Sold</th>
                        <th style={{ textAlign: 'left', padding: 6, color: '#555' }}>Strategy</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((npc, i) => (
                        <tr key={npc.id} style={{
                            borderBottom: '1px solid #111',
                            background: i === 0 ? 'rgba(201,168,76,0.05)' : 'transparent',
                        }}>
                            <td style={{ padding: 6, color: i < 3 ? '#c9a84c' : '#444' }}>{i + 1}</td>
                            <td style={{ padding: 6, color: '#eee', fontWeight: i < 3 ? 'bold' : 'normal' }}>
                                {npc.name}
                            </td>
                            <td style={{ padding: 6 }}>
                                <span style={{
                                    fontSize: 8, padding: '2px 6px', borderRadius: 3,
                                    background: `${roleColors[npc.role] || '#888'}15`,
                                    color: roleColors[npc.role] || '#888',
                                }}>{npc.role}</span>
                            </td>
                            <td style={{ padding: 6, textAlign: 'right', color: '#60a5fa', fontWeight: 'bold' }}>
                                {npc.collectionSize}
                            </td>
                            <td style={{ padding: 6, textAlign: 'right', color: '#aaa' }}>
                                ${npc.cash?.toLocaleString()}
                            </td>
                            <td style={{
                                padding: 6, textAlign: 'right', fontWeight: 'bold',
                                color: npc.netProfit > 0 ? '#4ade80' : npc.netProfit < 0 ? '#f87171' : '#555',
                            }}>
                                {npc.netProfit > 0 ? '+' : ''}${npc.netProfit?.toLocaleString()}
                            </td>
                            <td style={{ padding: 6, textAlign: 'right', color: '#4ade80' }}>{npc.totalBought}</td>
                            <td style={{ padding: 6, textAlign: 'right', color: '#fb923c' }}>{npc.totalSold}</td>
                            <td style={{ padding: 6 }}>
                                <span style={{
                                    fontSize: 8, padding: '2px 6px', borderRadius: 3,
                                    background: `${strategyColors[npc.strategy] || '#888'}15`,
                                    color: strategyColors[npc.strategy] || '#888',
                                }}>{npc.strategy}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: TRADE FEED
// ══════════════════════════════════════════════

function TradeFeedTab({ trades, npcs }) {
    if (!trades.length) return <EmptyState />;
    const npcMap = {};
    npcs.forEach(n => { npcMap[n.id] = n; });

    return (
        <div>
            <div style={{ fontSize: 8, color: '#555', letterSpacing: 1, marginBottom: 8 }}>
                SHOWING LAST {Math.min(trades.length, 50)} TRADES
            </div>
            {trades.slice(-50).reverse().map((t, i) => {
                const buyer = npcMap[t.buyer] || { name: t.buyer };
                const seller = npcMap[t.seller] || { name: t.seller };
                return (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                        borderBottom: '1px solid #111', fontSize: 10,
                    }}>
                        <span style={{ color: '#333', fontSize: 8, width: 28 }}>W{t.week}</span>
                        <span style={{ color: '#4ade80', fontWeight: 'bold', minWidth: 80 }}>
                            ${t.price?.toLocaleString()}
                        </span>
                        <span style={{ flex: 1, color: '#aaa' }}>
                            <span style={{ color: roleColors[buyer.role] || '#ddd' }}>{buyer.name}</span>
                            <span style={{ color: '#333' }}> ← </span>
                            <span style={{ color: roleColors[seller.role] || '#888' }}>{seller.name}</span>
                        </span>
                        <span style={{ color: '#666', fontSize: 9 }}>{t.artwork}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: STRATEGIES
// ══════════════════════════════════════════════

function StrategiesTab({ npcs }) {
    if (!npcs.length) return <EmptyState />;

    const byStrategy = {};
    npcs.forEach(n => {
        const s = n.strategy || 'holder';
        if (!byStrategy[s]) byStrategy[s] = [];
        byStrategy[s].push(n);
    });

    const byProfit = [...npcs].sort((a, b) => b.netProfit - a.netProfit);

    return (
        <div style={{ display: 'flex', gap: 16 }}>
            {/* Strategy Groups */}
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: '#c9a84c', fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 }}>
                    STRATEGY DISTRIBUTION
                </div>
                {Object.entries(byStrategy).map(([strat, members]) => (
                    <div key={strat} style={{ ...card, marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ color: strategyColors[strat] || '#aaa', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                {strat}
                            </span>
                            <span style={{ color: '#555' }}>{members.length} NPCs</span>
                        </div>
                        {/* Strategy bar */}
                        <div style={{ width: '100%', height: 4, background: '#111', borderRadius: 2 }}>
                            <div style={{
                                width: `${(members.length / npcs.length) * 100}%`, height: '100%',
                                background: strategyColors[strat] || '#555', borderRadius: 2,
                            }} />
                        </div>
                        <div style={{ marginTop: 6, fontSize: 9, color: '#666' }}>
                            {members.map(m => m.name).join(', ')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Profit Leaderboard */}
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: '#c9a84c', fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 }}>
                    P&L RANKING
                </div>
                {byProfit.map((npc, i) => (
                    <div key={npc.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
                        borderBottom: '1px solid #111', fontSize: 10,
                    }}>
                        <span style={{ color: i < 3 ? '#c9a84c' : '#333', width: 16 }}>{i + 1}</span>
                        <span style={{ flex: 1, color: '#ddd' }}>{npc.name}</span>
                        <span style={{
                            fontWeight: 'bold',
                            color: npc.netProfit > 0 ? '#4ade80' : npc.netProfit < 0 ? '#f87171' : '#555',
                        }}>
                            {npc.netProfit > 0 ? '+' : ''}${npc.netProfit?.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: ALERTS
// ══════════════════════════════════════════════

function AlertsTab({ npcs, trades, simResult, priceHistory }) {
    const alerts = useMemo(() => {
        const a = [];
        // Buyback alerts
        npcs.forEach(n => {
            if (n.financialStress > 60) a.push({ type: 'stress', severity: 'warning', msg: `${n.name} under financial stress (${n.financialStress})` });
        });
        // Volume spike detection
        if (priceHistory?.length > 3) {
            const recent = priceHistory.slice(-3);
            const avgVol = recent.reduce((s, p) => s + p.volume, 0) / 3;
            const prev3 = priceHistory.slice(-6, -3);
            if (prev3.length > 0) {
                const prevAvg = prev3.reduce((s, p) => s + p.volume, 0) / prev3.length;
                if (avgVol > prevAvg * 1.5) a.push({ type: 'volume', severity: 'info', msg: `Volume spiking — ${Math.round((avgVol / prevAvg - 1) * 100)}% above average` });
            }
        }
        // Big movers
        if (priceHistory?.length > 1) {
            const latest = priceHistory[priceHistory.length - 1];
            const first = priceHistory[0];
            for (const [id, a_] of Object.entries(latest.artists || {})) {
                const f = first.artists?.[id];
                if (!f) continue;
                const pct = ((a_.avgPrice - f.avgPrice) / f.avgPrice) * 100;
                if (pct > 50) a.push({ type: 'mover', severity: 'success', msg: `${a_.name} up ${pct.toFixed(0)}% over ${simResult?.weeks || '?'} weeks` });
                if (pct < -30) a.push({ type: 'mover', severity: 'danger', msg: `${a_.name} down ${Math.abs(pct).toFixed(0)}% — potential crash` });
            }
        }
        // No activity warning
        if (trades.length === 0) a.push({ type: 'dead', severity: 'warning', msg: 'No trades recorded — market may be illiquid' });
        return a;
    }, [npcs, trades, priceHistory, simResult]);

    const colors = { success: '#4ade80', warning: '#fbbf24', danger: '#f87171', info: '#60a5fa' };

    return (
        <div>
            {alerts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#333', padding: 40 }}>✅ No alerts</div>
            ) : (
                alerts.map((alert, i) => (
                    <div key={i} style={{
                        padding: '8px 12px', marginBottom: 4, borderRadius: 4,
                        borderLeft: `3px solid ${colors[alert.severity] || '#555'}`,
                        background: `${colors[alert.severity] || '#555'}08`,
                        fontSize: 11, color: '#ddd',
                    }}>
                        {alert.msg}
                    </div>
                ))
            )}
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: EVENTS
// ══════════════════════════════════════════════

function EventsTab({ marketEvents }) {
    if (!marketEvents?.length) return (
        <div style={{ textAlign: 'center', color: '#333', padding: 40 }}>
            No market events recorded. Run a simulation to generate events.
        </div>
    );

    const typeIcons = {
        auction_record: '🔨', scandal: '🚨', museum_acquisition: '🏛️',
        fair_boost: '🎪', economic_downturn: '📉', gallery_closure: '🚪',
        social_media_viral: '📱', collector_exit: '🚶',
    };

    return (
        <div>
            <div style={{ fontSize: 8, color: '#555', letterSpacing: 1, marginBottom: 8 }}>
                {marketEvents.length} EVENTS OVER SIMULATION
            </div>
            {marketEvents.map((evt, i) => (
                <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
                    borderBottom: '1px solid #111', fontSize: 10,
                }}>
                    <span style={{ fontSize: 16, lineHeight: '20px' }}>{typeIcons[evt.type] || '⚡'}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', color: severityColors[evt.severity] || '#ddd', marginBottom: 2 }}>
                            {evt.title}
                        </div>
                        <div style={{ color: '#888' }}>{evt.description}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 50 }}>
                        <div style={{ fontSize: 9, color: '#555' }}>W{evt.week}</div>
                        <div style={{
                            fontSize: 8, padding: '1px 4px', borderRadius: 2,
                            background: `${cycleColors[evt.cycle] || '#555'}20`,
                            color: cycleColors[evt.cycle] || '#555',
                        }}>{evt.cycle}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════
// EMPTY STATE
// ══════════════════════════════════════════════

function EmptyState() {
    return (
        <div style={{ textAlign: 'center', color: '#333', marginTop: 60, fontSize: 13, fontFamily: mono }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div>Click <strong style={{ color: '#4ade80' }}>▶ RUN SIMULATION</strong> to generate market data</div>
            <div style={{ fontSize: 10, marginTop: 6, color: '#2a2a3e' }}>
                NPCs will trade artworks based on taste, wealth, and market conditions
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════

export default function MarketSimDashboard() {
    const [simResult, setSimResult] = useState(null);
    const [weekCount, setWeekCount] = useState(20);
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('ticker');

    const showNotif = useCallback((msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 4000);
    }, []);

    const runSim = useCallback(() => {
        const result = MarketSimulator.simulateMultipleWeeks(weekCount);
        setSimResult(result);
        showNotif(`✅ ${weekCount}wk sim — ${result.totalTrades} trades, $${result.totalVolume.toLocaleString()} vol, ${result.marketEvents?.length || 0} events`);
    }, [weekCount, showNotif]);

    // Extract data from sim result
    const snapshot = useMemo(() => {
        if (!simResult) return { npcs: [], tradeLog: [] };
        const state = simResult.npcState;
        return {
            npcs: Object.values(state).map(n => ({
                id: n.id, name: n.name, role: n.role, cash: n.cash,
                collectionSize: n.owned.length, owned: [...n.owned],
                totalBought: n.totalBought, totalSold: n.totalSold,
                totalSpent: n.totalSpent, totalEarned: n.totalEarned,
                netProfit: n.totalEarned - n.totalSpent,
                strategy: n.strategy, dealerType: n.dealerType,
                financialStress: n.financialStress,
            })),
            tradeLog: simResult.tradeLog || [],
        };
    }, [simResult]);

    const npcs = snapshot.npcs;
    const tradeLog = snapshot.tradeLog;
    const priceHistory = simResult?.priceHistory || [];
    const marketEvents = simResult?.marketEvents || [];

    // Cycle from latest price history
    const currentCycle = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].cycle : 'flat';

    const tabs = [
        { id: 'ticker', icon: '📈', label: 'Ticker' },
        { id: 'charts', icon: '📊', label: 'Charts' },
        { id: 'orderbook', icon: '📋', label: 'Order Book' },
        { id: 'collectors', icon: '🏆', label: 'Collectors' },
        { id: 'trades', icon: '🔄', label: 'Trade Feed' },
        { id: 'strategies', icon: '🎯', label: 'Strategies' },
        { id: 'alerts', icon: '⚠️', label: 'Alerts' },
        { id: 'events', icon: '⚡', label: 'Events' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: '#0a0a12',
                borderBottom: `2px solid ${cycleColors[currentCycle]}40`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 'bold', color: '#c9a84c' }}>
                        ⬡ ARTLIFE MARKET TERMINAL
                    </span>
                    <span style={{
                        fontSize: 9, padding: '2px 8px', borderRadius: 3,
                        background: `${cycleColors[currentCycle]}20`,
                        color: cycleColors[currentCycle], fontWeight: 'bold',
                    }}>
                        {cycleIcons[currentCycle]} {currentCycle.toUpperCase()}
                    </span>
                    {notification && <span style={{ color: '#4ade80', fontSize: 9, marginLeft: 8 }}>{notification}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <select value={weekCount} onChange={e => setWeekCount(Number(e.target.value))}
                        style={{
                            background: '#0a0a12', border: '1px solid #222', color: '#888',
                            padding: '3px 8px', fontSize: 9, borderRadius: 3, fontFamily: mono,
                        }}>
                        {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}wk</option>)}
                    </select>
                    <button onClick={runSim} style={{
                        ...miniBtn, borderColor: '#4ade80', color: '#4ade80',
                        fontWeight: 'bold', padding: '4px 14px',
                    }}>
                        ▶ RUN SIMULATION
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            {simResult && (
                <div style={{
                    display: 'flex', gap: 8, padding: '8px 12px', background: '#060610',
                    borderBottom: '1px solid #1a1a2e', flexWrap: 'wrap',
                }}>
                    <StatBox label="TRADES" value={simResult.totalTrades} color="#4ade80" />
                    <StatBox label="VOLUME" value={`$${simResult.totalVolume.toLocaleString()}`} color="#c9a84c" />
                    <StatBox label="EVENTS" value={marketEvents.length} color="#e879f9" />
                    <StatBox label="AVG/WK" value={(simResult.totalTrades / simResult.weeks).toFixed(1)} color="#60a5fa" />
                    <StatBox label="ACTIVE" value={npcs.filter(n => n.totalBought > 0).length} color="#fb923c"
                        sub={`of ${npcs.length} NPCs`} />
                </div>
            )}

            {/* Tab Bar */}
            <div style={{
                display: 'flex', gap: 2, padding: '4px 12px', background: '#080810',
                borderBottom: '1px solid #1a1a2e',
            }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                        ...miniBtn, fontSize: 9, padding: '4px 10px',
                        borderColor: activeTab === t.id ? '#c9a84c' : 'transparent',
                        color: activeTab === t.id ? '#c9a84c' : '#444',
                        background: activeTab === t.id ? 'rgba(201,168,76,0.06)' : 'transparent',
                        borderRadius: '3px 3px 0 0',
                    }}>{t.icon} {t.label}</button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                {activeTab === 'ticker' && <TickerTab simResult={simResult} priceHistory={priceHistory} />}
                {activeTab === 'charts' && <ChartsTab priceHistory={priceHistory} simResult={simResult} />}
                {activeTab === 'orderbook' && <OrderBookTab simResult={simResult} />}
                {activeTab === 'collectors' && <CollectorsTab npcs={npcs} />}
                {activeTab === 'trades' && <TradeFeedTab trades={tradeLog} npcs={npcs} />}
                {activeTab === 'strategies' && <StrategiesTab npcs={npcs} />}
                {activeTab === 'alerts' && <AlertsTab npcs={npcs} trades={tradeLog} simResult={simResult} priceHistory={priceHistory} />}
                {activeTab === 'events' && <EventsTab marketEvents={marketEvents} />}
            </div>
        </div>
    );
}
