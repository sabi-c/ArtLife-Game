import React, { useState, useEffect, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import './PlayerDashboard.css';

// ─── Stat metadata (matches STAT_DEFS in CharacterSelectScene) ───────────────
const STAT_META = [
    { key: 'reputation', short: 'HYP', label: 'Hype',     color: '#8888ff' },
    { key: 'taste',      short: 'TST', label: 'Taste',    color: '#ffaa44' },
    { key: 'audacity',   short: 'AUD', label: 'Audacity', color: '#ee6644' },
    { key: 'access',     short: 'ACC', label: 'Access',   color: '#44bbff' },
    { key: 'intel',      short: 'INT', label: 'Intel',    color: '#88dd88' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pull a live snapshot from the GameState reference exposed by Phaser. */
function readState() {
    try {
        return window._artLifeState ?? null;
    } catch {
        return null;
    }
}

function portfolioValue(portfolio) {
    if (!portfolio?.length) return 0;
    return portfolio.reduce((sum, w) => sum + (w.price || w.purchasePrice || 0), 0);
}

function fmt$(n) {
    if (n === undefined || n === null) return '—';
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
    return `$${n.toLocaleString()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ label, short, value, color }) {
    return (
        <div className="pd-stat-row">
            <span className="pd-stat-label" style={{ color }}>{short}</span>
            <div className="pd-stat-bar-bg">
                <div
                    className="pd-stat-bar-fill"
                    style={{ width: `${Math.min(100, value || 0)}%`, background: color }}
                />
            </div>
            <span className="pd-stat-val">{value ?? 0}</span>
        </div>
    );
}

function LedgerRow({ tx }) {
    const isSell = tx.action === 'SELL';
    return (
        <div className="pd-ledger-row">
            <span className={`pd-tag pd-tag-${tx.action.toLowerCase()}`}>{tx.action}</span>
            <span className="pd-ledger-title">"{tx.title}"</span>
            <span className={`pd-ledger-price ${isSell ? 'pd-color-green' : 'pd-color-red'}`}>
                {isSell ? '+' : '-'}{fmt$(tx.price)}
            </span>
            <span className="pd-ledger-week">Wk {tx.week}</span>
        </div>
    );
}

function EmptyLedger() {
    return (
        <div style={{ color: '#444', fontSize: '12px', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
            No transactions yet. Go buy something.
        </div>
    );
}

const GraphTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const liquid = payload.find(p => p.dataKey === 'cash');
    const assets = payload.find(p => p.dataKey === 'assets');
    const net = (liquid?.value || 0) + (assets?.value || 0);
    return (
        <div className="pd-tooltip">
            <p className="pd-tooltip-title">Week {label}</p>
            {liquid && <p className="pd-tooltip-liquid">Liquid: {fmt$(liquid.value)}</p>}
            {assets && <p className="pd-tooltip-assets">Art: {fmt$(assets.value)}</p>}
            <p style={{ color: '#fff', margin: '4px 0 0', borderTop: '1px solid #333', paddingTop: '4px' }}>
                Net: {fmt$(net)}
            </p>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlayerDashboard({ onClose }) {
    const [visible, setVisible] = useState(false);
    const [snap, setSnap] = useState(null); // snapshot of game state

    // Fade-in + ESC handler
    useEffect(() => {
        setVisible(true);
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Poll GameState every 1.5s to keep data fresh
    const refresh = useCallback(() => {
        const s = readState();
        if (!s) { setSnap(null); return; }

        const pv = portfolioValue(s.portfolio);
        setSnap({
            // Identity
            playerName:  s.playerName  || 'The Dealer',
            character:   s.character   || {},
            selectedDrip: s.selectedDrip || null,
            selectedVice: s.selectedVice || null,
            // Stats
            reputation: s.reputation ?? 0,
            taste:       s.taste      ?? 0,
            audacity:    s.audacity   ?? 0,
            access:      s.access     ?? 0,
            intel:       s.intel      ?? 0,
            // Financials
            cash:         s.cash      ?? 0,
            portfolioVal: pv,
            netWorth:     (s.cash ?? 0) + pv,
            marketHeat:   s.marketHeat ?? 0,
            marketState:  s.marketState || 'flat',
            week:         s.week       || 1,
            currentCity:  s.currentCity || 'new-york',
            // History
            wealthHistory: s.wealthHistory || [],
            transactions:  s.transactions  || [],
            portfolio:     s.portfolio     || [],
        });
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 1500);
        return () => clearInterval(id);
    }, [refresh]);

    // ── No game state yet ─────────────────────────────────────────────────────
    if (!snap) {
        return (
            <div className={`pd-overlay ${visible ? 'visible' : ''}`}>
                <div className="pd-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ color: '#555', fontFamily: 'Courier', textAlign: 'center', padding: 40 }}>
                        <div style={{ fontSize: 32, marginBottom: 16 }}>◈</div>
                        <div>No game in progress.</div>
                        <div style={{ fontSize: 11, marginTop: 8, color: '#333' }}>Start a game first.</div>
                        <button className="pd-close-btn" style={{ marginTop: 24 }} onClick={onClose}>[ESC] Close</button>
                    </div>
                </div>
            </div>
        );
    }

    const char = snap.character;
    const marketColor = snap.marketState === 'bull' ? '#4caf50' : snap.marketState === 'bear' ? '#c94040' : '#888';

    // Build graph data — always include current state as last point
    const graphData = snap.wealthHistory.length > 0
        ? snap.wealthHistory
        : [{ week: snap.week, cash: snap.cash, assets: snap.portfolioVal }];

    return (
        <div className={`pd-overlay ${visible ? 'visible' : ''}`}>
            <div className="pd-container">

                {/* ── Header ── */}
                <div className="pd-header">
                    <div className="pd-header-title">EGO DASHBOARD</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ color: '#555', fontSize: 11, fontFamily: 'Courier' }}>
                            WK {snap.week} · {snap.currentCity.toUpperCase()} ·{' '}
                            <span style={{ color: marketColor }}>{snap.marketState.toUpperCase()}</span>
                        </span>
                        <button className="pd-close-btn" onClick={onClose}>[X] ESC</button>
                    </div>
                </div>

                <div className="pd-content">

                    {/* ── LEFT: Identity + Stats ── */}
                    <div className="pd-col pd-left">

                        <div className="pd-card pd-identity-card">
                            <div className="pd-avatar">{char.icon || '🎭'}</div>
                            <h2 className="pd-name">{snap.playerName}</h2>
                            <div className="pd-class">{char.name || '—'}</div>
                            <div className="pd-divider" />

                            <div className="pd-tray">
                                {snap.selectedDrip
                                    ? <div><strong style={{ color: '#888' }}>DRIP</strong>&nbsp; {snap.selectedDrip.icon} {snap.selectedDrip.label}</div>
                                    : <div style={{ color: '#333' }}>No drip set.</div>
                                }
                            </div>

                            {snap.selectedVice ? (
                                <div className="pd-vice">
                                    {snap.selectedVice.icon} VICE: {snap.selectedVice.label}
                                </div>
                            ) : (
                                <div style={{ fontSize: 11, color: '#333', marginTop: 8, textAlign: 'center' }}>Clean slate.</div>
                            )}
                        </div>

                        <div className="pd-card pd-stats-card">
                            <h3 className="pd-card-header">S.P.E.C.I.A.L.</h3>
                            {STAT_META.map(s => (
                                <StatRow
                                    key={s.key}
                                    short={s.short}
                                    label={s.label}
                                    value={snap[s.key]}
                                    color={s.color}
                                />
                            ))}
                            <div className="pd-stats-helper">
                                HYP: Hype · TST: Taste · AUD: Audacity<br />
                                ACC: Access · INT: Intel (earned)
                            </div>
                        </div>
                    </div>

                    {/* ── CENTER: Status + Ledger ── */}
                    <div className="pd-col pd-center">

                        <div className="pd-card pd-status-card">
                            <h3 className="pd-card-header">Current Position</h3>
                            <div className="pd-status-grid">
                                <div>
                                    <div className="pd-status-label">Liquid Capital</div>
                                    <div className="pd-status-value pd-color-green">{fmt$(snap.cash)}</div>
                                </div>
                                <div>
                                    <div className="pd-status-label">Art Value</div>
                                    <div className="pd-status-value pd-color-gold">{fmt$(snap.portfolioVal)}</div>
                                </div>
                                <div>
                                    <div className="pd-status-label">Net Worth</div>
                                    <div className="pd-status-value" style={{ color: '#fff' }}>{fmt$(snap.netWorth)}</div>
                                </div>
                                <div>
                                    <div className="pd-status-label">Market Heat</div>
                                    <div className="pd-status-value" style={{ color: snap.marketHeat > 30 ? '#c94040' : '#888' }}>
                                        {snap.marketHeat}
                                        {snap.marketHeat > 50 && ' 🔥'}
                                    </div>
                                </div>
                            </div>
                            {snap.portfolio.length > 0 && (
                                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #222', fontSize: 11, color: '#555' }}>
                                    {snap.portfolio.length} work{snap.portfolio.length !== 1 ? 's' : ''} in collection
                                </div>
                            )}
                        </div>

                        <div className="pd-card pd-ledger-card">
                            <h3 className="pd-card-header">Transaction Ledger</h3>
                            <div className="pd-ledger-list">
                                {snap.transactions.length === 0
                                    ? <EmptyLedger />
                                    : snap.transactions.slice(0, 20).map(tx => (
                                        <LedgerRow key={tx.id} tx={tx} />
                                    ))
                                }
                            </div>
                        </div>

                    </div>

                    {/* ── RIGHT: Net Worth Graph ── */}
                    <div className="pd-col pd-right">
                        <div className="pd-card pd-graph-card">
                            <h3 className="pd-card-header">Net Worth Trajectory</h3>
                            {graphData.length < 2 ? (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 12 }}>
                                    Advance a week to start tracking.
                                </div>
                            ) : (
                                <div className="pd-graph-container">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={graphData} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                                            <defs>
                                                <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="gradAssets" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e28" vertical={false} />
                                            <XAxis
                                                dataKey="week"
                                                stroke="#333"
                                                tick={{ fill: '#555', fontSize: 11 }}
                                                label={{ value: 'Week', position: 'insideBottom', offset: -4, fill: '#444', fontSize: 10 }}
                                            />
                                            <YAxis
                                                stroke="#333"
                                                tick={{ fill: '#555', fontSize: 11 }}
                                                tickFormatter={v => fmt$(v)}
                                                width={60}
                                            />
                                            <Tooltip content={<GraphTooltip />} />
                                            <Legend
                                                verticalAlign="top" height={28}
                                                wrapperStyle={{ fontSize: 11, color: '#666' }}
                                            />
                                            <Area
                                                type="monotone"
                                                name="Liquid"
                                                dataKey="cash"
                                                stroke="#4caf50"
                                                strokeWidth={2}
                                                fill="url(#gradCash)"
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                            />
                                            <Area
                                                type="monotone"
                                                name="Art Value"
                                                dataKey="assets"
                                                stroke="#c9a84c"
                                                strokeWidth={2}
                                                strokeDasharray="4 4"
                                                fill="url(#gradAssets)"
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
