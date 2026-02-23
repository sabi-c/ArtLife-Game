/**
 * MarketSimDashboard — CMS panel for NPC market simulation insights
 *
 * Shows: Top collectors, trade log, NPC strategies, multi-week simulator
 */
import React, { useState, useMemo, useCallback } from 'react';
import { MarketSimulator } from '../../managers/MarketSimulator.js';

// ── Styles ──
const card = {
    background: '#0a0a12', border: '1px solid #222', borderRadius: 6,
    padding: 12, fontSize: 11, color: '#ddd',
};
const headerBar = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', background: '#111', borderBottom: '1px solid #333',
};
const miniBtn = {
    background: 'transparent', border: '1px solid #444', color: '#aaa',
    padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 10, borderRadius: 3, textTransform: 'uppercase',
};
const sectionTitle = (text, color = '#c9a84c') => (
    <div style={{
        fontSize: 10, fontWeight: 'bold', color, letterSpacing: 1,
        textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
        borderBottom: `1px solid ${color}33`, paddingBottom: 4,
    }}>{text}</div>
);

const strategyColors = {
    accumulator: '#4ade80',
    flipper: '#f59e0b',
    holder: '#94a3b8',
};

const roleColors = {
    dealer: '#c9a84c', gallerist: '#60a5fa', auction: '#a78bfa',
    artist: '#4ade80', collector: '#f87171', advisor: '#fb923c',
    speculator: '#e879f9', mega_dealer: '#fbbf24', young_hustler: '#22d3ee',
    institutional: '#94a3b8', curator: '#a78bfa',
};

export default function MarketSimDashboard() {
    const [simResult, setSimResult] = useState(null);
    const [weekCount, setWeekCount] = useState(20);
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('collectors');

    const showNotif = useCallback((msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3500);
    }, []);

    // Run multi-week simulation
    const runSim = useCallback(() => {
        const result = MarketSimulator.simulateMultipleWeeks(weekCount);
        setSimResult(result);
        showNotif(`✅ Simulated ${weekCount} weeks — ${result.totalTrades} trades, $${result.totalVolume.toLocaleString()} volume`);
    }, [weekCount, showNotif]);

    // Get snapshot (live or from sim)
    const snapshot = useMemo(() => {
        if (simResult) {
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
                weeklyReport: simResult.reports?.[simResult.reports.length - 1] || null,
            };
        }
        return MarketSimulator.getSnapshot();
    }, [simResult]);

    const npcs = snapshot?.npcs || [];
    const tradeLog = snapshot?.tradeLog || [];

    // Sorted views
    const byCollection = useMemo(() => [...npcs].sort((a, b) => b.collectionSize - a.collectionSize), [npcs]);
    const byProfit = useMemo(() => [...npcs].sort((a, b) => b.netProfit - a.netProfit), [npcs]);
    const bySpent = useMemo(() => [...npcs].sort((a, b) => b.totalSpent - a.totalSpent), [npcs]);

    const tabs = [
        { id: 'collectors', icon: '🏆', label: 'Top Collectors' },
        { id: 'trades', icon: '🔄', label: 'Trade Log' },
        { id: 'strategies', icon: '🎯', label: 'NPC Strategies' },
        { id: 'alerts', icon: '⚠️', label: 'Market Alerts' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={headerBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <strong style={{ color: '#c9a84c', fontSize: 13 }}>📊 NPC Market Simulation</strong>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                            ...miniBtn,
                            borderColor: activeTab === t.id ? '#c9a84c' : '#333',
                            color: activeTab === t.id ? '#c9a84c' : '#666',
                        }}>{t.icon} {t.label}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {notification && <span style={{ color: '#4ade80', fontSize: 10 }}>{notification}</span>}
                    <select value={weekCount} onChange={e => setWeekCount(Number(e.target.value))}
                        style={{ background: '#0a0a12', border: '1px solid #333', color: '#aaa', padding: '3px 8px', fontSize: 10, borderRadius: 3 }}>
                        {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n} weeks</option>)}
                    </select>
                    <button onClick={runSim} style={{ ...miniBtn, borderColor: '#4ade80', color: '#4ade80' }}>
                        ▶ RUN SIMULATION
                    </button>
                </div>
            </div>

            {/* Summary Bar */}
            {simResult && (
                <div style={{
                    display: 'flex', gap: 12, padding: '8px 16px', background: '#0a0a12',
                    borderBottom: '1px solid #222', flexWrap: 'wrap',
                }}>
                    <StatBox label="TOTAL TRADES" value={simResult.totalTrades} color="#4ade80" />
                    <StatBox label="TOTAL VOLUME" value={`$${simResult.totalVolume.toLocaleString()}`} color="#c9a84c" />
                    <StatBox label="WEEKS" value={simResult.weeks} color="#60a5fa" />
                    <StatBox label="AVG TRADES/WK"
                        value={(simResult.totalTrades / simResult.weeks).toFixed(1)} color="#e879f9" />
                    {simResult.reports && (
                        <StatBox label="ACTIVE BUYERS"
                            value={npcs.filter(n => n.totalBought > 0).length} color="#fb923c" />
                    )}
                </div>
            )}

            {/* Main Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {!simResult ? (
                    <div style={{ textAlign: 'center', color: '#555', marginTop: 80, fontSize: 14 }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                        <div>Click <strong>RUN SIMULATION</strong> to generate NPC market activity</div>
                        <div style={{ fontSize: 11, marginTop: 8, color: '#444' }}>
                            NPCs will buy, sell, and trade artworks based on their taste profiles, wealth, and market conditions
                        </div>
                    </div>
                ) : activeTab === 'collectors' ? (
                    <CollectorsTab npcs={byCollection} />
                ) : activeTab === 'trades' ? (
                    <TradeLogTab trades={tradeLog} npcs={npcs} />
                ) : activeTab === 'strategies' ? (
                    <StrategiesTab npcs={npcs} byProfit={byProfit} bySpent={bySpent} />
                ) : activeTab === 'alerts' ? (
                    <AlertsTab npcs={npcs} trades={tradeLog} simResult={simResult} />
                ) : null}
            </div>
        </div>
    );
}

// ── Sub-Components ──

function StatBox({ label, value, color }) {
    return (
        <div style={{ ...card, padding: '6px 14px', textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color, marginTop: 2 }}>{value}</div>
        </div>
    );
}

function CollectorsTab({ npcs }) {
    return (
        <div>
            {sectionTitle('🏆 TOP COLLECTORS BY COLLECTION SIZE')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {npcs.map((n, i) => (
                    <div key={n.id} style={{
                        ...card,
                        borderColor: i === 0 ? '#c9a84c' : '#222',
                        display: 'flex', flexDirection: 'column', gap: 6,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ color: i < 3 ? '#c9a84c' : '#aaa', fontWeight: 'bold' }}>
                                    #{i + 1} {n.name}
                                </span>
                                <span style={{
                                    marginLeft: 8, fontSize: 9, padding: '1px 6px', borderRadius: 3,
                                    background: `${roleColors[n.role] || '#666'}20`,
                                    color: roleColors[n.role] || '#666',
                                    border: `1px solid ${roleColors[n.role] || '#666'}40`,
                                }}>{n.role}</span>
                            </div>
                            <span style={{
                                fontSize: 9, padding: '1px 6px', borderRadius: 3,
                                background: `${strategyColors[n.strategy] || '#666'}20`,
                                color: strategyColors[n.strategy] || '#666',
                            }}>{n.strategy}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#888' }}>
                            <span>🖼️ {n.collectionSize} pieces</span>
                            <span>💰 ${n.cash?.toLocaleString()}</span>
                            <span>📈 {n.totalBought} bought</span>
                            <span>📉 {n.totalSold} sold</span>
                        </div>

                        {/* Collection bar */}
                        <div style={{ position: 'relative', height: 6, background: '#1a1a2e', borderRadius: 3 }}>
                            <div style={{
                                width: `${Math.min(100, (n.collectionSize / 20) * 100)}%`,
                                height: '100%', borderRadius: 3,
                                background: `linear-gradient(90deg, ${roleColors[n.role] || '#666'}, ${roleColors[n.role] || '#666'}88)`,
                            }} />
                        </div>

                        {/* Artworks owned */}
                        {n.owned.length > 0 && (
                            <div style={{ fontSize: 9, color: '#555', lineHeight: 1.6 }}>
                                {n.owned.slice(0, 6).map(id => (
                                    <span key={id} style={{
                                        display: 'inline-block', padding: '1px 5px', marginRight: 4,
                                        marginBottom: 2, background: '#111', border: '1px solid #222',
                                        borderRadius: 2,
                                    }}>{id}</span>
                                ))}
                                {n.owned.length > 6 && <span style={{ color: '#444' }}>+{n.owned.length - 6} more</span>}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function TradeLogTab({ trades, npcs }) {
    const npcMap = useMemo(() => {
        const m = {};
        npcs.forEach(n => { m[n.id] = n.name; });
        return m;
    }, [npcs]);

    const recentTrades = useMemo(() => [...trades].reverse().slice(0, 50), [trades]);

    return (
        <div>
            {sectionTitle(`🔄 TRADE LOG (${trades.length} total)`)}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #333', color: '#666', textTransform: 'uppercase', fontSize: 9 }}>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>WK</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>BUYER</th>
                            <th style={{ textAlign: 'center', padding: '6px 8px' }}>→</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>SELLER</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>ARTWORK</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px' }}>PRICE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentTrades.map((t, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #1a1a2e' }}>
                                <td style={{ padding: '5px 8px', color: '#555' }}>{t.week}</td>
                                <td style={{ padding: '5px 8px', color: '#4ade80' }}>{npcMap[t.buyer] || t.buyer}</td>
                                <td style={{ padding: '5px 8px', color: '#333', textAlign: 'center' }}>→</td>
                                <td style={{ padding: '5px 8px', color: '#f87171' }}>{npcMap[t.seller] || t.seller}</td>
                                <td style={{ padding: '5px 8px', color: '#c9a84c' }}>{t.artwork}</td>
                                <td style={{ padding: '5px 8px', color: '#eaeaea', textAlign: 'right' }}>
                                    ${t.price?.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StrategiesTab({ npcs, byProfit, bySpent }) {
    return (
        <div>
            {sectionTitle('🎯 NPC TRADING STRATEGIES')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                {['accumulator', 'flipper', 'holder'].map(strat => {
                    const count = npcs.filter(n => n.strategy === strat).length;
                    return (
                        <div key={strat} style={{ ...card, textAlign: 'center' }}>
                            <div style={{ fontSize: 20 }}>
                                {strat === 'accumulator' ? '📦' : strat === 'flipper' ? '🔄' : '🏠'}
                            </div>
                            <div style={{ color: strategyColors[strat], fontWeight: 'bold', fontSize: 12, marginTop: 4 }}>
                                {strat.toUpperCase()}
                            </div>
                            <div style={{ color: '#666', fontSize: 10 }}>{count} NPCs</div>
                        </div>
                    );
                })}
            </div>

            {sectionTitle('💰 PROFIT LEADERBOARD')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {byProfit.filter(n => n.totalBought > 0 || n.totalSold > 0).map((n, i) => (
                    <div key={n.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '6px 10px', background: '#050508', border: '1px solid #1a1a2e',
                        borderRadius: 4,
                    }}>
                        <span style={{ color: '#555', fontSize: 10, width: 20 }}>#{i + 1}</span>
                        <span style={{ color: '#eaeaea', flex: 1, fontSize: 11 }}>{n.name}</span>
                        <span style={{
                            fontSize: 9, padding: '1px 6px', borderRadius: 3,
                            background: `${strategyColors[n.strategy]}20`,
                            color: strategyColors[n.strategy],
                        }}>{n.strategy}</span>
                        <span style={{ fontSize: 10, width: 60, textAlign: 'right', color: '#888' }}>
                            {n.totalBought}B / {n.totalSold}S
                        </span>
                        <span style={{
                            fontSize: 11, fontWeight: 'bold', width: 100, textAlign: 'right',
                            color: n.netProfit >= 0 ? '#4ade80' : '#f87171',
                        }}>
                            {n.netProfit >= 0 ? '+' : ''}${n.netProfit.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AlertsTab({ npcs, trades, simResult }) {
    const alerts = useMemo(() => {
        const a = [];

        // NPC cornering an artist's market
        const artworkCounts = {};
        npcs.forEach(n => {
            n.owned.forEach(id => {
                const artistPart = id.split('_').slice(0, 2).join('_');
                const key = `${n.id}:${artistPart}`;
                artworkCounts[key] = (artworkCounts[key] || 0) + 1;
            });
        });
        Object.entries(artworkCounts).forEach(([key, count]) => {
            if (count >= 3) {
                const [npcId, artist] = key.split(':');
                const npc = npcs.find(n => n.id === npcId);
                a.push({
                    type: 'corner', severity: 'high',
                    text: `${npc?.name || npcId} is cornering the ${artist} market (${count} pieces)`,
                });
            }
        });

        // Financial distress
        npcs.forEach(n => {
            if (n.financialStress > 70) {
                a.push({ type: 'stress', severity: 'warning', text: `${n.name} under financial pressure (stress: ${n.financialStress})` });
            }
            if (n.cash < 5000 && n.collectionSize > 3) {
                a.push({ type: 'liquidity', severity: 'warning', text: `${n.name} nearly illiquid ($${n.cash.toLocaleString()} cash, ${n.collectionSize} pieces)` });
            }
        });

        // Big flippers
        npcs.forEach(n => {
            if (n.strategy === 'flipper' && n.netProfit > 50000) {
                a.push({ type: 'flipper', severity: 'info', text: `${n.name} flipping for profit (+$${n.netProfit.toLocaleString()})` });
            }
        });

        // Empty collections
        const emptyCount = npcs.filter(n => n.collectionSize === 0 && n.totalSold > 0).length;
        if (emptyCount > 0) {
            a.push({ type: 'empty', severity: 'info', text: `${emptyCount} NPC(s) have sold their entire collection` });
        }

        return a;
    }, [npcs, trades]);

    const sevColors = { high: '#f87171', warning: '#fb923c', info: '#60a5fa' };

    return (
        <div>
            {sectionTitle('⚠️ MARKET ALERTS')}
            {alerts.length === 0 ? (
                <div style={{ color: '#555', textAlign: 'center', marginTop: 40 }}>
                    No alerts — market appears stable
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {alerts.map((alert, i) => (
                        <div key={i} style={{
                            ...card, display: 'flex', alignItems: 'center', gap: 10,
                            borderColor: `${sevColors[alert.severity]}40`,
                        }}>
                            <span style={{
                                fontSize: 9, padding: '2px 6px', borderRadius: 3,
                                background: `${sevColors[alert.severity]}20`,
                                color: sevColors[alert.severity],
                                textTransform: 'uppercase', fontWeight: 'bold',
                            }}>{alert.severity}</span>
                            <span style={{ color: '#eaeaea' }}>{alert.text}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
