/**
 * ArtworkEditor.jsx — Comprehensive Artwork & Market CMS
 *
 * 7 sub-tabs covering the full artwork pipeline:
 *   1. Metadata   — Edit individual artwork fields, JSON hot-swap
 *   2. Artists     — Edit simulation artists (heat, volatility, tier, price ranges)
 *   3. Market      — Live market stats (artist heat index, sparklines, cycle)
 *   4. Controls    — Tick market, force cycles, era modifier, run sim previews
 *   5. Portfolio   — Player's owned works with ROI tracking
 *   6. Calendar    — Art world calendar events
 *   7. Haggle      — Haggle price matrix across all dealer types
 *
 * CMS persistence: artwork edits are saved to cmsStore snapshots.
 * Bulk operations: multi-select artworks for batch tier/price changes.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState } from '../../managers/GameState.js';
import { MarketManager } from '../../managers/MarketManager.js';
import { useCmsStore } from '../../stores/cmsStore.js';
import { useMarketStore } from '../../stores/marketStore.js';
import { CALENDAR_EVENTS } from '../../data/calendar_events.js';
import { ARTWORKS } from '../../data/artworks.js';
import { ARTISTS } from '../../data/artists.js';
import { DEALER_TYPES, HAGGLE_CONFIG } from '../../data/haggle_config.js';
import { MarketSimulator } from '../../managers/MarketSimulator.js';
import TearSheetView from './TearSheetView.jsx';

// ── Style Constants ──
const mono = '"IBM Plex Mono", "Courier New", monospace';
const panelBg = '#0a0a14';
const inputStyle = {
    width: '100%', padding: '6px 8px', background: '#111', border: '1px solid #333',
    color: '#eaeaea', fontFamily: mono, fontSize: 11, boxSizing: 'border-box', outline: 'none', borderRadius: 3,
};
const labelStyle = { display: 'block', color: '#666', fontSize: 9, textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.5 };
const btnStyle = {
    background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '4px 12px',
    cursor: 'pointer', fontFamily: mono, fontSize: 11, borderRadius: 3,
};
const btnPrimary = {
    background: '#c9a84c', color: '#000', fontWeight: 'bold', border: 'none',
    padding: '6px 14px', cursor: 'pointer', fontFamily: mono, fontSize: 11, borderRadius: 4,
};
const cardStyle = {
    background: panelBg, border: '1px solid #1a1a2e', borderRadius: 4, padding: 10,
};

// ── Tiny Sparkline (shared) ──
function Sparkline({ data, width = 100, height = 24, color = '#4ade80' }) {
    if (!data || data.length < 2) return <span style={{ color: '#555', fontSize: 9 }}>—</span>;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg width={width} height={height} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ════════════════════════════════════════════════════════════
// SUB-TAB: Market Stats (artist heat index, sparklines)
// ════════════════════════════════════════════════════════════
function MarketStatsPanel() {
    const artistSnapshots = useMarketStore(s => s.artistSnapshots);
    const marketCycle = useMarketStore(s => s.marketCycle);
    const weeklyNews = useMarketStore(s => s.weeklyNews);
    const priceHistory = useMarketStore(s => s.priceHistory);

    const artists = useMemo(() => {
        return Object.entries(artistSnapshots || {}).map(([id, snap]) => ({
            id, ...snap,
            prices: (priceHistory?.[id] || []).map(h => h.avgPrice).filter(Boolean),
        })).sort((a, b) => (b.heat || 0) - (a.heat || 0));
    }, [artistSnapshots, priceHistory]);

    const cycleColors = { bull: '#4ade80', bear: '#f87171', flat: '#888' };
    const cycleIcons = { bull: '📈', bear: '📉', flat: '➡️' };
    const trendIcons = { up: '▲', down: '▼', flat: '—' };
    const trendColors = { up: '#4ade80', down: '#f87171', flat: '#888' };

    return (
        <div>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 12,
                background: `${cycleColors[marketCycle] || '#888'}11`, border: `1px solid ${cycleColors[marketCycle] || '#888'}33`,
                borderRadius: 4,
            }}>
                <span style={{ fontSize: 18 }}>{cycleIcons[marketCycle] || '➡️'}</span>
                <div>
                    <div style={{ color: cycleColors[marketCycle], fontWeight: 'bold', fontSize: 12 }}>
                        {(marketCycle || 'flat').toUpperCase()} MARKET
                    </div>
                    <div style={{ color: '#888', fontSize: 9 }}>Current market conditions</div>
                </div>
            </div>

            {weeklyNews && weeklyNews.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ color: '#c9a84c', fontSize: 10, fontWeight: 'bold', marginBottom: 6 }}>📰 WEEKLY INTEL</div>
                    {weeklyNews.map((news, i) => (
                        <div key={i} style={{
                            fontSize: 10, color: news.includes('[INTEL]') ? '#f59e0b' : '#888',
                            padding: '3px 0', borderBottom: '1px solid #1a1a2e',
                        }}>{news}</div>
                    ))}
                </div>
            )}

            <div style={{ color: '#c9a84c', fontSize: 10, fontWeight: 'bold', marginBottom: 8 }}>🔥 ARTIST HEAT INDEX</div>
            {artists.length === 0 ? (
                <div style={{ color: '#555', fontSize: 10, textAlign: 'center', padding: 20 }}>No market data yet — advance the game week</div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                            <th style={{ textAlign: 'left', padding: 4, color: '#666' }}>Artist</th>
                            <th style={{ textAlign: 'center', padding: 4, color: '#666' }}>Heat</th>
                            <th style={{ textAlign: 'center', padding: 4, color: '#666' }}>Trend</th>
                            <th style={{ textAlign: 'center', padding: 4, color: '#666' }}>Index</th>
                            <th style={{ textAlign: 'right', padding: 4, color: '#666' }}>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {artists.slice(0, 15).map(a => (
                            <tr key={a.id} style={{ borderBottom: '1px solid #111' }}>
                                <td style={{ padding: '4px', color: '#eaeaea' }}>
                                    {a.name}
                                    {a.buybackActive && <span style={{ color: '#f59e0b', fontSize: 8, marginLeft: 4 }}>⚠️</span>}
                                </td>
                                <td style={{ textAlign: 'center', padding: 4 }}>
                                    <div style={{ width: 40, height: 4, background: '#1a1a2e', borderRadius: 2, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}>
                                        <div style={{ height: '100%', width: `${Math.min(a.heat || 0, 100)}%`, background: (a.heat || 0) > 60 ? '#f87171' : (a.heat || 0) > 30 ? '#f59e0b' : '#4ade80', borderRadius: 2 }} />
                                    </div>
                                    <span style={{ color: '#888', fontSize: 9 }}>{Math.round(a.heat || 0)}</span>
                                </td>
                                <td style={{ textAlign: 'center', color: trendColors[a.trend], padding: 4, fontWeight: 'bold' }}>
                                    {trendIcons[a.trend] || '—'}
                                </td>
                                <td style={{ textAlign: 'center', padding: 4, color: (a.artistIndex || 500) > 500 ? '#4ade80' : '#f87171' }}>
                                    {a.artistIndex || '—'}
                                </td>
                                <td style={{ textAlign: 'right', padding: 4 }}>
                                    <Sparkline data={a.prices} width={60} height={16} color={trendColors[a.trend]} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// SUB-TAB: Artists Editor (edit simulation artists in real-time)
// ════════════════════════════════════════════════════════════
function ArtistsPanel({ onNotify }) {
    // Read live from MarketManager.artists (mutable during session)
    const [artists, setArtists] = useState(() => {
        return (MarketManager.artists?.length > 0 ? MarketManager.artists : ARTISTS).map(a => ({ ...a }));
    });
    const [selectedIdx, setSelectedIdx] = useState(0);

    const selected = artists[selectedIdx];
    const tierColors = { 'blue-chip': '#c9a84c', 'hot': '#f87171', 'mid-career': '#f59e0b', 'emerging': '#4ade80' };

    const updateField = (field, value) => {
        const updated = artists.map((a, i) => i === selectedIdx ? { ...a, [field]: value } : a);
        setArtists(updated);
        // Hot-swap into MarketManager so changes take effect immediately
        if (MarketManager.artists?.length > 0) {
            const mmArtist = MarketManager.artists.find(a => a.id === updated[selectedIdx].id);
            if (mmArtist) Object.assign(mmArtist, { [field]: value });
        }
        useCmsStore.getState().markDirty('artworks');
    };

    const handleSaveArtists = () => {
        useCmsStore.getState().saveSnapshot('artists', artists);
        onNotify?.('💾 Artists saved to CMS');
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 'bold' }}>🎨 SIMULATION ARTISTS ({artists.length})</div>
                <button onClick={handleSaveArtists} style={btnPrimary}>💾 Save Artists</button>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
                {/* Artist list */}
                <div style={{ width: 220 }}>
                    {artists.map((a, i) => (
                        <div key={a.id} onClick={() => setSelectedIdx(i)} style={{
                            padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #111',
                            background: selectedIdx === i ? 'rgba(201,168,76,0.08)' : 'transparent',
                            borderLeft: selectedIdx === i ? '3px solid #c9a84c' : '3px solid transparent',
                        }}>
                            <div style={{ fontSize: 11, color: selectedIdx === i ? '#c9a84c' : '#eaeaea', fontWeight: 'bold' }}>
                                {a.name}
                            </div>
                            <div style={{ fontSize: 9, display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                                <span style={{ color: tierColors[a.tier] || '#888' }}>{a.tier}</span>
                                <span style={{ color: '#888' }}>🔥 {Math.round(a.heat)}</span>
                            </div>
                            {/* Heat bar */}
                            <div style={{ height: 3, background: '#1a1a2e', borderRadius: 2, marginTop: 3 }}>
                                <div style={{
                                    height: '100%', borderRadius: 2,
                                    width: `${Math.min(a.heat, 100)}%`,
                                    background: a.heat > 60 ? '#f87171' : a.heat > 30 ? '#f59e0b' : '#4ade80',
                                }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Artist detail editor */}
                {selected && (
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#c9a84c', marginBottom: 4 }}>{selected.name}</div>
                        <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic', marginBottom: 16 }}>{selected.flavor}</div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            <div>
                                <label style={labelStyle}>Tier</label>
                                <select value={selected.tier} onChange={e => updateField('tier', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                    <option value="blue-chip">Blue-Chip</option>
                                    <option value="hot">Hot</option>
                                    <option value="mid-career">Mid-Career</option>
                                    <option value="emerging">Emerging</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Medium</label>
                                <input value={selected.medium || ''} onChange={e => updateField('medium', e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Heat (0-100)</label>
                                <input type="range" min={0} max={100} value={Math.round(selected.heat)} onChange={e => updateField('heat', Number(e.target.value))}
                                    style={{ width: '100%', accentColor: selected.heat > 60 ? '#f87171' : '#4ade80' }} />
                                <span style={{ fontSize: 10, color: '#888' }}>{Math.round(selected.heat)}</span>
                            </div>
                            <div>
                                <label style={labelStyle}>Heat Volatility</label>
                                <input type="number" min={0} max={20} value={selected.heatVolatility} onChange={e => updateField('heatVolatility', Number(e.target.value))} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Base Price Min ($)</label>
                                <input type="number" value={selected.basePriceMin} onChange={e => updateField('basePriceMin', Number(e.target.value))} style={{ ...inputStyle, color: '#4ade80' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Base Price Max ($)</label>
                                <input type="number" value={selected.basePriceMax} onChange={e => updateField('basePriceMax', Number(e.target.value))} style={{ ...inputStyle, color: '#4ade80' }} />
                            </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <label style={labelStyle}>Flavor Text</label>
                            <textarea value={selected.flavor || ''} onChange={e => updateField('flavor', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', fontStyle: 'italic', color: '#888' }} />
                        </div>

                        {/* Quick actions */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            <button onClick={() => { updateField('heat', Math.min(100, selected.heat + 10)); onNotify?.(`🔥 +10 heat for ${selected.name}`); }}
                                style={{ ...btnStyle, borderColor: '#f87171', color: '#f87171' }}>+10 Heat</button>
                            <button onClick={() => { updateField('heat', Math.max(0, selected.heat - 10)); onNotify?.(`❄️ -10 heat for ${selected.name}`); }}
                                style={{ ...btnStyle, borderColor: '#60a5fa', color: '#60a5fa' }}>-10 Heat</button>
                            <button onClick={() => { updateField('buybackActive', !selected.buybackActive); onNotify?.(`${selected.buybackActive ? '🔓 Buyback OFF' : '🔒 Buyback ON'} for ${selected.name}`); }}
                                style={{ ...btnStyle, borderColor: selected.buybackActive ? '#4ade80' : '#f59e0b', color: selected.buybackActive ? '#4ade80' : '#f59e0b' }}>
                                {selected.buybackActive ? '🔓 Stop Buyback' : '🔒 Force Buyback'}
                            </button>
                        </div>

                        {/* Linked artworks */}
                        <div style={{ marginTop: 16 }}>
                            <div style={{ color: '#666', fontSize: 9, textTransform: 'uppercase', marginBottom: 6 }}>Linked Artworks</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {ARTWORKS.filter(w => w.artistId === selected.id || w.artist === selected.name).map(w => (
                                    <span key={w.id} style={{
                                        fontSize: 9, padding: '2px 6px', background: '#111', border: '1px solid #222',
                                        borderRadius: 3, color: '#aaa',
                                    }}>{w.title} (${(w.askingPrice || 0).toLocaleString()})</span>
                                ))}
                                {MarketManager.works?.filter(w => w.artistId === selected.id).map(w => (
                                    <span key={w.id} style={{
                                        fontSize: 9, padding: '2px 6px', background: '#111', border: '1px solid #60a5fa33',
                                        borderRadius: 3, color: '#60a5fa',
                                    }}>{w.title} (${(w.price || 0).toLocaleString()})</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// SUB-TAB: Market Controls (tick, force cycles, era modifier)
// ════════════════════════════════════════════════════════════
function MarketControlsPanel({ onNotify }) {
    const [tickCount, setTickCount] = useState(1);
    const [results, setResults] = useState([]);

    const forceCycle = (cycle) => {
        const s = GameState.state;
        if (!s) { onNotify?.('No game state'); return; }
        s.marketState = cycle;
        onNotify?.(`📊 Forced market to ${cycle.toUpperCase()}`);
    };

    const tickMarket = () => {
        for (let i = 0; i < tickCount; i++) {
            MarketManager.tick();
        }
        // Sync to store
        const s = GameState.state;
        if (s) {
            useMarketStore.getState().syncFromManager(
                MarketManager.artists, MarketManager.works, s.marketState, s.week || 1
            );
            useMarketStore.getState().generateWeeklyNews(MarketManager.artists);
        }
        // Capture results
        const snapshot = MarketManager.artists.map(a => ({
            name: a.name, heat: Math.round(a.heat),
            buyback: a.buybackActive || false,
            index: MarketManager._computeArtistIndex(a),
        }));
        setResults(snapshot);
        onNotify?.(`📈 Ticked market ${tickCount}x`);
    };

    const adjustEra = (delta) => {
        const s = GameState.state;
        if (!s) return;
        s.eraModifier = Math.max(0.5, Math.min(2.0, (s.eraModifier || 1.0) + delta));
        onNotify?.(`🕰️ Era modifier: ${s.eraModifier.toFixed(2)}x`);
    };

    const eraModifier = GameState.state?.eraModifier || 1.0;
    const marketState = GameState.state?.marketState || 'flat';

    return (
        <div>
            <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 'bold', marginBottom: 16 }}>🎮 MARKET CONTROLS</div>

            {/* Force Market Cycle */}
            <div style={{ ...cardStyle, marginBottom: 12 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Force Market Cycle (current: {marketState.toUpperCase()})</div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['bull', 'flat', 'bear'].map(c => (
                        <button key={c} onClick={() => forceCycle(c)} style={{
                            ...btnStyle, flex: 1,
                            borderColor: marketState === c ? ({ bull: '#4ade80', flat: '#888', bear: '#f87171' }[c]) : '#333',
                            color: marketState === c ? ({ bull: '#4ade80', flat: '#888', bear: '#f87171' }[c]) : '#555',
                        }}>
                            {{ bull: '📈', flat: '➡️', bear: '📉' }[c]} {c.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tick Market */}
            <div style={{ ...cardStyle, marginBottom: 12 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Tick Market Simulation</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={tickCount} onChange={e => setTickCount(Number(e.target.value))}
                        style={{ ...inputStyle, width: 80, cursor: 'pointer' }}>
                        {[1, 5, 10, 26, 52].map(n => <option key={n} value={n}>{n}x</option>)}
                    </select>
                    <button onClick={tickMarket} style={btnPrimary}>▶ TICK</button>
                    <span style={{ fontSize: 9, color: '#555' }}>
                        {tickCount === 1 ? '1 week' : `${tickCount} weeks`} of market movement
                    </span>
                </div>
            </div>

            {/* Era Modifier */}
            <div style={{ ...cardStyle, marginBottom: 12 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Era Modifier ({eraModifier.toFixed(2)}x)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => adjustEra(-0.1)} style={btnStyle}>-0.1</button>
                    <div style={{ flex: 1, height: 6, background: '#1a1a2e', borderRadius: 3, position: 'relative' }}>
                        <div style={{
                            position: 'absolute', left: `${((eraModifier - 0.5) / 1.5) * 100}%`,
                            top: -2, width: 10, height: 10, borderRadius: '50%',
                            background: eraModifier > 1.2 ? '#f87171' : eraModifier < 0.8 ? '#60a5fa' : '#4ade80',
                            border: '2px solid #222',
                        }} />
                    </div>
                    <button onClick={() => adjustEra(0.1)} style={btnStyle}>+0.1</button>
                    <button onClick={() => { if (GameState.state) GameState.state.eraModifier = 1.0; onNotify?.('🔄 Era reset to 1.0x'); }}
                        style={{ ...btnStyle, fontSize: 9 }}>Reset</button>
                </div>
                <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
                    {'< 1.0 = recession / deflation  |  > 1.0 = boom / inflation'}
                </div>
            </div>

            {/* Tick Results */}
            {results.length > 0 && (
                <div style={{ ...cardStyle }}>
                    <div style={{ ...labelStyle, marginBottom: 8 }}>Last Tick Results</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #333' }}>
                                <th style={{ textAlign: 'left', padding: 4, color: '#666' }}>Artist</th>
                                <th style={{ textAlign: 'center', padding: 4, color: '#666' }}>Heat</th>
                                <th style={{ textAlign: 'center', padding: 4, color: '#666' }}>Index</th>
                                <th style={{ textAlign: 'center', padding: 4, color: '#666' }}>Buyback</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map(r => (
                                <tr key={r.name} style={{ borderBottom: '1px solid #111' }}>
                                    <td style={{ padding: 4, color: '#eaeaea' }}>{r.name}</td>
                                    <td style={{ textAlign: 'center', padding: 4, color: r.heat > 60 ? '#f87171' : '#4ade80' }}>{r.heat}</td>
                                    <td style={{ textAlign: 'center', padding: 4, color: r.index > 500 ? '#4ade80' : '#f87171' }}>{r.index}</td>
                                    <td style={{ textAlign: 'center', padding: 4, color: r.buyback ? '#f59e0b' : '#333' }}>{r.buyback ? 'ACTIVE' : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// SUB-TAB: Portfolio (player's owned works + ROI)
// ════════════════════════════════════════════════════════════
function PortfolioPanel() {
    const portfolio = GameState.state?.portfolio || [];
    const cash = GameState.state?.cash || 0;
    const week = GameState.state?.week || 0;

    const enriched = useMemo(() => {
        return portfolio.map(w => {
            const currentValue = MarketManager.getWorkValue(w) || w.price || w.askingPrice || 0;
            const purchasePrice = w.purchasePrice || w.askingPrice || currentValue;
            const holdWeeks = week - (w.purchaseWeek || 0);
            const roi = purchasePrice > 0 ? ((currentValue - purchasePrice) / purchasePrice * 100) : 0;
            return { ...w, currentValue, purchasePrice, holdWeeks, roi };
        }).sort((a, b) => b.currentValue - a.currentValue);
    }, [portfolio, week]);

    const totalCost = enriched.reduce((s, w) => s + w.purchasePrice, 0);
    const totalValue = enriched.reduce((s, w) => s + w.currentValue, 0);
    const totalROI = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0;

    return (
        <div>
            <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 'bold', marginBottom: 12 }}>💼 PLAYER PORTFOLIO</div>

            {/* Summary cards */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ ...cardStyle, flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase' }}>Cash</div>
                    <div style={{ fontSize: 16, color: '#4ade80', fontWeight: 'bold' }}>${cash.toLocaleString()}</div>
                </div>
                <div style={{ ...cardStyle, flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase' }}>Portfolio Value</div>
                    <div style={{ fontSize: 16, color: '#c9a84c', fontWeight: 'bold' }}>${totalValue.toLocaleString()}</div>
                </div>
                <div style={{ ...cardStyle, flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase' }}>Total Cost</div>
                    <div style={{ fontSize: 16, color: '#888', fontWeight: 'bold' }}>${totalCost.toLocaleString()}</div>
                </div>
                <div style={{ ...cardStyle, flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase' }}>Total ROI</div>
                    <div style={{ fontSize: 16, color: totalROI >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                        {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%
                    </div>
                </div>
                <div style={{ ...cardStyle, flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase' }}>Net Worth</div>
                    <div style={{ fontSize: 16, color: '#eaeaea', fontWeight: 'bold' }}>${(cash + totalValue).toLocaleString()}</div>
                </div>
            </div>

            {/* Works list */}
            {enriched.length === 0 ? (
                <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>No artworks in portfolio — buy some works first</div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                            <th style={{ textAlign: 'left', padding: 6, color: '#666' }}>Artwork</th>
                            <th style={{ textAlign: 'left', padding: 6, color: '#666' }}>Artist</th>
                            <th style={{ textAlign: 'right', padding: 6, color: '#666' }}>Bought At</th>
                            <th style={{ textAlign: 'right', padding: 6, color: '#666' }}>Current</th>
                            <th style={{ textAlign: 'right', padding: 6, color: '#666' }}>ROI</th>
                            <th style={{ textAlign: 'center', padding: 6, color: '#666' }}>Hold</th>
                            <th style={{ textAlign: 'center', padding: 6, color: '#666' }}>Tier</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enriched.map(w => (
                            <tr key={w.id} style={{ borderBottom: '1px solid #111' }}>
                                <td style={{ padding: 6, color: '#eaeaea' }}>{w.title || 'Untitled'}</td>
                                <td style={{ padding: 6, color: '#888' }}>{w.artist || '?'}</td>
                                <td style={{ padding: 6, textAlign: 'right', color: '#888' }}>${w.purchasePrice.toLocaleString()}</td>
                                <td style={{ padding: 6, textAlign: 'right', color: '#4ade80' }}>${w.currentValue.toLocaleString()}</td>
                                <td style={{
                                    padding: 6, textAlign: 'right', fontWeight: 'bold',
                                    color: w.roi >= 0 ? '#4ade80' : '#f87171',
                                }}>
                                    {w.roi >= 0 ? '+' : ''}{w.roi.toFixed(1)}%
                                </td>
                                <td style={{ padding: 6, textAlign: 'center', color: '#555' }}>{w.holdWeeks}w</td>
                                <td style={{ padding: 6, textAlign: 'center' }}>
                                    <span style={{
                                        fontSize: 8, padding: '1px 5px', borderRadius: 2,
                                        background: '#c9a84c15', color: '#c9a84c',
                                    }}>{w.tier}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// SUB-TAB: Calendar Events
// ════════════════════════════════════════════════════════════
function CalendarEventsPanel() {
    const events = useMemo(() => {
        return CALENDAR_EVENTS.map(ev => ({
            ...ev,
            monthName: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][ev.month] || '?',
        })).sort((a, b) => a.month - b.month || a.weekInMonth - b.weekInMonth);
    }, []);

    const typeColors = { fair: '#c9a84c', auction: '#f87171', biennale: '#a78bfa', market: '#4ade80', exhibition: '#60a5fa', social: '#f59e0b' };

    return (
        <div>
            <div style={{ color: '#c9a84c', fontSize: 10, fontWeight: 'bold', marginBottom: 8 }}>📅 ART WORLD CALENDAR ({events.length} events)</div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {events.map(ev => (
                    <div key={ev.id} style={{
                        padding: '6px 8px', marginBottom: 4, borderLeft: `3px solid ${typeColors[ev.type] || '#888'}`,
                        background: '#050508', borderRadius: '0 3px 3px 0',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 10, color: '#eaeaea', fontWeight: 'bold' }}>{ev.name}</div>
                            <div style={{ fontSize: 8, color: '#888' }}>{ev.monthName} W{ev.weekInMonth} · {ev.location}</div>
                        </div>
                        <div style={{ fontSize: 8, color: typeColors[ev.type] || '#888', marginTop: 2 }}>
                            {ev.type.toUpperCase()} · T{ev.tier}
                            {ev.cost > 0 && <span style={{ color: '#f87171', marginLeft: 6 }}>${ev.cost.toLocaleString()}</span>}
                        </div>
                        {ev.dealOpportunity && <div style={{ fontSize: 8, color: '#666', marginTop: 2, fontStyle: 'italic' }}>{ev.dealOpportunity}</div>}
                        {ev.npcPresence && ev.npcPresence.length > 0 && (
                            <div style={{ fontSize: 8, color: '#555', marginTop: 2 }}>
                                👤 {ev.npcPresence.join(', ')}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// SUB-TAB: Haggle Price Matrix
// ════════════════════════════════════════════════════════════
function HagglePricePanel({ work }) {
    if (!work) return null;
    const price = work.price || work.askingPrice || work.originalPrice || 0;
    const dealerTypes = Object.entries(DEALER_TYPES);
    return (
        <div style={{ marginTop: 16 }}>
            <div style={{ color: '#c9a84c', fontSize: 10, fontWeight: 'bold', marginBottom: 8 }}>⚔️ HAGGLE PRICE MATRIX</div>
            <div style={{ fontSize: 9, color: '#888', marginBottom: 8 }}>
                Projected asking prices by dealer type (base: ${price.toLocaleString()})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {dealerTypes.map(([key, d]) => {
                    const ask = Math.round(price * d.greedFactor);
                    const minOffer = Math.round(ask * HAGGLE_CONFIG.minOfferPercent);
                    const savingPct = Math.round((1 - HAGGLE_CONFIG.minOfferPercent) * 100);
                    return (
                        <div key={key} style={{ background: '#050508', border: '1px solid #222', borderRadius: 4, padding: 6 }}>
                            <div style={{ fontSize: 10, color: '#eaeaea' }}>{d.icon} {d.name}</div>
                            <div style={{ fontSize: 9, color: '#4ade80' }}>Ask: ${ask.toLocaleString()}</div>
                            <div style={{ fontSize: 8, color: '#888' }}>Floor: ${minOffer.toLocaleString()} ({savingPct}% off)</div>
                            <div style={{ fontSize: 8, color: '#555' }}>Patience: {d.patience} rounds</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ArtworkMarketPanel — Per-artwork market intelligence panel
// ═══════════════════════════════════════════════════════════════

function MiniSparkline({ data, width = 140, height = 32, color = '#c9a84c' }) {
    if (!data || data.length < 2) return <span style={{ color: '#333', fontSize: 9 }}>no data</span>;
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
            <polygon points={`0,${height} ${points} ${width},${height}`} fill={`${color}12`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
    );
}

function ArtworkMarketPanel({ work }) {
    if (!work) return null;

    // Get artist data
    const artist = MarketManager.getArtist?.(work.artistId) || ARTISTS.find(a => a.id === work.artistId);
    const currentPrice = work.price || work.basePrice || 0;
    const basePrice = work.basePrice || currentPrice;
    const priceDelta = basePrice > 0 ? ((currentPrice - basePrice) / basePrice) * 100 : 0;

    // Get price history from marketStore
    const marketStore = useMarketStore.getState();
    const priceHistory = marketStore?.priceHistory?.[work.artistId] || [];
    const priceData = priceHistory.map(h => h.avgPrice);

    // Get intra-week sparkline data
    const intraWeek = marketStore?.intraWeekPrices?.[work.artistId] || [];

    // Trade history for this artwork
    const artworkTrades = MarketSimulator.getTradesByArtwork?.(work.id) || [];

    // Hedonic score
    const hedonicScore = MarketManager._hedonicScore?.(work) || 1.0;

    // Artist index — only compute if artist exists
    const artistIndex = artist
        ? (artist.artistIndex || MarketManager._computeArtistIndex(artist) || 500)
        : 500;

    // Market cycle
    const cycle = marketStore?.marketCycle || 'flat';
    const cycleColor = { bull: '#4ade80', bear: '#f87171', flat: '#94a3b8' };

    const statRow = (label, value, color = '#ddd') => (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #111' }}>
            <span style={{ fontSize: 9, color: '#555' }}>{label}</span>
            <span style={{ fontSize: 10, color, fontWeight: 'bold', fontFamily: mono }}>{value}</span>
        </div>
    );

    return (
        <div style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Header */}
            <div style={{ fontSize: 9, color: '#c9a84c', fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>
                📊 MARKET DATA
            </div>

            {/* Price Chart */}
            <div style={{ background: '#050508', border: '1px solid #1a1a2e', borderRadius: 4, padding: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 8, color: '#555' }}>PRICE HISTORY</span>
                    <span style={{ fontSize: 8, color: priceDelta > 0 ? '#4ade80' : priceDelta < 0 ? '#f87171' : '#555' }}>
                        {priceDelta > 0 ? '▲' : priceDelta < 0 ? '▼' : '—'}{Math.abs(priceDelta).toFixed(1)}%
                    </span>
                </div>
                <MiniSparkline
                    data={priceData.length > 1 ? priceData : intraWeek.length > 1 ? intraWeek : [basePrice, currentPrice]}
                    width={240} height={40}
                    color={priceDelta >= 0 ? '#4ade80' : '#f87171'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#333', marginTop: 2 }}>
                    <span>Base</span>
                    <span>Current</span>
                </div>
            </div>

            {/* Key Metrics */}
            <div style={{ background: '#050508', border: '1px solid #1a1a2e', borderRadius: 4, padding: 8 }}>
                {statRow('Current Price', `$${currentPrice.toLocaleString()}`, '#4ade80')}
                {statRow('Base Price', `$${basePrice.toLocaleString()}`)}
                {statRow('P&L', `${priceDelta > 0 ? '+' : ''}${priceDelta.toFixed(1)}%`, priceDelta > 0 ? '#4ade80' : priceDelta < 0 ? '#f87171' : '#94a3b8')}
                {statRow('Market Cycle', cycle.toUpperCase(), cycleColor[cycle])}
                {artist && statRow('Artist Heat', `${Math.round(artist.heat || 0)}`, artist.heat > 60 ? '#f87171' : artist.heat > 30 ? '#fbbf24' : '#4ade80')}
                {artist && statRow('Artist Index', artistIndex.toLocaleString(), '#60a5fa')}
                {statRow('Hedonic Score', `×${hedonicScore.toFixed(2)}`, hedonicScore > 1 ? '#c9a84c' : '#888')}
                {artist?.buybackActive && statRow('⚠️ Buyback', 'ACTIVE', '#fbbf24')}
            </div>

            {/* Trade History */}
            <div style={{ background: '#050508', border: '1px solid #1a1a2e', borderRadius: 4, padding: 8 }}>
                <div style={{ fontSize: 8, color: '#555', letterSpacing: 1, marginBottom: 4 }}>TRADE HISTORY</div>
                {artworkTrades.length === 0 ? (
                    <div style={{ fontSize: 9, color: '#333', textAlign: 'center', padding: 8 }}>No trades recorded</div>
                ) : (
                    artworkTrades.slice(-5).reverse().map((t, i) => (
                        <div key={i} style={{ fontSize: 9, padding: '3px 0', borderBottom: '1px solid #0a0a12', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#888' }}>W{t.week}</span>
                            <span style={{ color: '#4ade80', fontWeight: 'bold' }}>${t.price?.toLocaleString()}</span>
                            <span style={{ color: '#555' }}>{t.buyer?.slice(0, 10)}</span>
                        </div>
                    ))
                )}
            </div>

            {/* Integration Status */}
            <div style={{ background: '#050508', border: '1px solid #1a1a2e', borderRadius: 4, padding: 8 }}>
                <div style={{ fontSize: 8, color: '#555', letterSpacing: 1, marginBottom: 4 }}>DATA SOURCE</div>
                <div style={{ fontSize: 9, color: work._source === 'market' ? '#4ade80' : work._source === 'inventory' ? '#60a5fa' : '#c9a84c' }}>
                    {work._source === 'market' ? '🟢 Live Market' : work._source === 'inventory' ? '🔵 Player Portfolio' : '🟡 Static Data'}
                </div>
                <div style={{ fontSize: 8, color: '#333', marginTop: 4 }}>
                    Ready for API · {work.id}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT: Enhanced ArtworkEditor with 7 sub-tabs
// ═══════════════════════════════════════════════════════════════
export default function ArtworkEditor() {
    const [artworks, setArtworks] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set()); // bulk selection
    const [jsonEdit, setJsonEdit] = useState('');
    const [notification, setNotification] = useState(null);
    const [filter, setFilter] = useState('all');
    const [subTab, setSubTab] = useState('metadata');
    const [artworkSearch, setArtworkSearch] = useState('');
    const [artworkSort, setArtworkSort] = useState('name');

    // Load artworks from all sources on mount
    useEffect(() => {
        try {
            const allWorks = [];
            if (Array.isArray(ARTWORKS)) {
                ARTWORKS.forEach(w => { if (w) allWorks.push({ ...w, _source: 'data' }); });
            }
            if (GameState.state) {
                const portfolio = GameState.state.portfolio;
                if (Array.isArray(portfolio)) portfolio.forEach(w => { if (w) allWorks.push({ ...w, _source: 'inventory' }); });
            }
            if (MarketManager.works && Array.isArray(MarketManager.works)) {
                MarketManager.works.forEach(w => { if (w) allWorks.push({ ...w, _source: 'market' }); });
            }
            // Deduplicate by id
            const unique = [], seen = new Set();
            for (const w of allWorks) {
                if (!w || !w.id) continue;
                if (!seen.has(w.id)) { seen.add(w.id); unique.push(w); }
            }
            setArtworks(unique);
        } catch (err) {
            console.error('[ArtworkEditor] Failed to collect artworks:', err);
            setArtworks([]);
        }
    }, []);

    const filtered = useMemo(() => {
        let list = filter === 'all' ? artworks
            : artworks.filter(w => w._source === filter || (filter === 'data' && !w._source));
        // Search
        if (artworkSearch.trim()) {
            const q = artworkSearch.toLowerCase();
            list = list.filter(w => (
                (w.title || '').toLowerCase().includes(q) ||
                (w.artist || '').toLowerCase().includes(q) ||
                (w.medium || '').toLowerCase().includes(q) ||
                (w.genre || '').toLowerCase().includes(q) ||
                (w.id || '').toLowerCase().includes(q)
            ));
        }
        // Sort
        const sortFns = {
            name: (a, b) => (a.title || '').localeCompare(b.title || ''),
            artist: (a, b) => (a.artist || '').localeCompare(b.artist || ''),
            price_desc: (a, b) => (b.askingPrice || b.price || 0) - (a.askingPrice || a.price || 0),
            price_asc: (a, b) => (a.askingPrice || a.price || 0) - (b.askingPrice || b.price || 0),
            tier: (a, b) => (a.tier || '').localeCompare(b.tier || ''),
            delta: (a, b) => {
                const da = (a.basePrice && a.basePrice > 0) ? ((a.price || a.askingPrice || a.basePrice) - a.basePrice) / a.basePrice : 0;
                const db = (b.basePrice && b.basePrice > 0) ? ((b.price || b.askingPrice || b.basePrice) - b.basePrice) / b.basePrice : 0;
                return db - da;
            },
        };
        return [...list].sort(sortFns[artworkSort] || sortFns.name);
    }, [artworks, filter, artworkSearch, artworkSort]);

    const selected = artworks.find(w => w.id === selectedId);

    const showNotif = useCallback((msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); }, []);

    const handleSelect = (id, evt) => {
        // Shift-click for bulk selection
        if (evt?.shiftKey) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
            });
            return;
        }
        setSelectedId(id);
        setSelectedIds(new Set());
        const work = artworks.find(w => w.id === id);
        if (work) setJsonEdit(JSON.stringify(work, null, 4));
    };

    const handleFieldEdit = useCallback((field, value) => {
        if (!selected) return;
        const updated = artworks.map(w => w.id === selected.id ? { ...w, [field]: value } : w);
        setArtworks(updated);
        const updatedWork = updated.find(w => w.id === selected.id);
        if (updatedWork) setJsonEdit(JSON.stringify(updatedWork, null, 4));
        // Persist to CMS store
        useCmsStore.getState().saveSnapshot('artworks', updated.filter(w => w._source === 'data'));
    }, [selected, artworks]);

    const handleHotSwap = () => {
        try {
            const parsed = JSON.parse(jsonEdit);
            const updated = artworks.map(w => w.id === parsed.id ? { ...parsed, _source: w._source } : w);
            setArtworks(updated);
            useCmsStore.getState().saveSnapshot('artworks', updated.filter(w => w._source === 'data'));
            showNotif('🔥 Hot-swapped artwork');
        } catch (err) { showNotif('❌ JSON Error: ' + err.message); }
    };

    // ── Bulk Operations ──
    const handleBulkTier = (tier) => {
        const updated = artworks.map(w => selectedIds.has(w.id) ? { ...w, tier } : w);
        setArtworks(updated);
        useCmsStore.getState().saveSnapshot('artworks', updated.filter(w => w._source === 'data'));
        showNotif(`📦 Set ${selectedIds.size} works to tier: ${tier}`);
        setSelectedIds(new Set());
    };

    const handleBulkPriceAdjust = (factor) => {
        const updated = artworks.map(w => {
            if (!selectedIds.has(w.id)) return w;
            const price = w.askingPrice || w.price || 0;
            return { ...w, askingPrice: Math.round(price * factor), basePrice: Math.round((w.basePrice || price) * factor) };
        });
        setArtworks(updated);
        useCmsStore.getState().saveSnapshot('artworks', updated.filter(w => w._source === 'data'));
        showNotif(`💰 Adjusted ${selectedIds.size} works by ${factor > 1 ? '+' : ''}${Math.round((factor - 1) * 100)}%`);
        setSelectedIds(new Set());
    };

    const handleDownload = () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(artworks, null, 4));
        const anchor = document.createElement('a');
        anchor.href = dataStr; anchor.download = 'artworks_dump.json'; anchor.click();
        showNotif('📥 Downloaded artworks_dump.json');
    };

    // ── Import CSV/JSON ──
    const handleImport = (evt) => {
        const file = evt.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                let imported;
                if (file.name.endsWith('.csv')) {
                    // Parse Artnet-style CSV: title,artist,year,medium,askingPrice,genre,tier
                    const lines = text.split('\n').filter(l => l.trim());
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                    imported = lines.slice(1).map((line, idx) => {
                        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                        const obj = {};
                        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
                        return {
                            id: obj.id || `import_${Date.now()}_${idx}`,
                            title: obj.title || 'Untitled',
                            artist: obj.artist || 'Unknown',
                            year: obj.year || '',
                            medium: obj.medium || '',
                            askingPrice: parseInt(obj.askingprice || obj.price || '0') || 0,
                            basePrice: parseInt(obj.askingprice || obj.price || '0') || 0,
                            genre: obj.genre || 'contemporary painting',
                            tier: obj.tier || 'speculative',
                            provenance: obj.provenance || '',
                            sprite: 'art_object_red_squares.png',
                            _source: 'data',
                        };
                    });
                } else {
                    imported = JSON.parse(text);
                    if (!Array.isArray(imported)) imported = [imported];
                    imported = imported.map(w => ({ ...w, _source: 'data', basePrice: w.basePrice || w.askingPrice || 0 }));
                }
                const merged = [...artworks];
                const existingIds = new Set(merged.map(w => w.id));
                let added = 0;
                for (const w of imported) {
                    if (!existingIds.has(w.id)) {
                        merged.push(w);
                        existingIds.add(w.id);
                        added++;
                    }
                }
                setArtworks(merged);
                useCmsStore.getState().saveSnapshot('artworks', merged.filter(w => w._source === 'data'));
                showNotif(`📥 Imported ${added} new artworks (${imported.length - added} duplicates skipped)`);
            } catch (err) {
                showNotif('❌ Import error: ' + err.message);
            }
        };
        reader.readAsText(file);
        evt.target.value = '';
    };

    // Stats
    const tierStats = useMemo(() => {
        const stats = { classic: 0, mid_career: 0, speculative: 0 };
        artworks.forEach(w => { stats[w.tier] = (stats[w.tier] || 0) + 1; });
        return stats;
    }, [artworks]);
    const totalValue = useMemo(() => artworks.reduce((sum, w) => sum + (w.askingPrice || w.price || 0), 0), [artworks]);
    const sourceColors = { data: '#888', inventory: '#4ade80', market: '#60a5fa', artist: '#c084fc' };

    const subTabs = [
        { id: 'metadata', icon: '📝', label: 'Metadata' },
        { id: 'artists', icon: '🎨', label: 'Artists' },
        { id: 'market', icon: '📊', label: 'Market' },
        { id: 'controls', icon: '🎮', label: 'Controls' },
        { id: 'portfolio', icon: '💼', label: 'Portfolio' },
        { id: 'calendar', icon: '📅', label: 'Calendar' },
        { id: 'haggle', icon: '⚔️', label: 'Haggle' },
        { id: 'tearsheet', icon: '📄', label: 'Tear Sheet' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px', background: '#111', borderBottom: '1px solid #333',
                flexWrap: 'wrap', gap: 6,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#c9a84c', fontSize: 13 }}>🖼️ Artworks & Market</strong>
                    {['all', 'data', 'inventory', 'market'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            ...btnStyle, fontSize: 9,
                            borderColor: filter === f ? '#c9a84c' : '#333',
                            color: filter === f ? '#c9a84c' : '#555',
                        }}>
                            {f === 'all' ? 'All' : f === 'data' ? '📁 Catalogue' : f === 'inventory' ? '🎒 Owned' : '📊 Market'}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, color: '#555' }}>
                        {artworks.length} works · ${totalValue.toLocaleString()} ·
                        C:{tierStats.classic || 0} M:{tierStats.mid_career || 0} S:{tierStats.speculative || 0}
                    </span>
                    {notification && <span style={{ color: '#4ade80', fontSize: 10 }}>{notification}</span>}
                    <button onClick={handleDownload} style={{ ...btnStyle, fontSize: 9 }}>📥 Export JSON</button>
                    <label style={{ ...btnStyle, fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        📤 Import
                        <input type="file" accept=".json,.csv" onChange={handleImport} style={{ display: 'none' }} />
                    </label>
                </div>
            </div>

            {/* Bulk operations bar (visible when items are selected) */}
            {selectedIds.size > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px',
                    background: 'rgba(201,168,76,0.08)', borderBottom: '1px solid #c9a84c33',
                }}>
                    <span style={{ fontSize: 10, color: '#c9a84c' }}>{selectedIds.size} selected</span>
                    <div style={{ width: 1, height: 16, background: '#333' }} />
                    <span style={{ fontSize: 9, color: '#666' }}>Tier:</span>
                    {['classic', 'mid_career', 'speculative'].map(t => (
                        <button key={t} onClick={() => handleBulkTier(t)} style={{ ...btnStyle, fontSize: 8, padding: '2px 8px' }}>{t}</button>
                    ))}
                    <div style={{ width: 1, height: 16, background: '#333' }} />
                    <span style={{ fontSize: 9, color: '#666' }}>Price:</span>
                    {[0.8, 0.9, 1.1, 1.2, 1.5].map(f => (
                        <button key={f} onClick={() => handleBulkPriceAdjust(f)}
                            style={{ ...btnStyle, fontSize: 8, padding: '2px 8px', color: f > 1 ? '#4ade80' : '#f87171' }}>
                            {f > 1 ? '+' : ''}{Math.round((f - 1) * 100)}%
                        </button>
                    ))}
                    <button onClick={() => setSelectedIds(new Set())} style={{ ...btnStyle, fontSize: 8, padding: '2px 8px', marginLeft: 'auto' }}>Clear</button>
                </div>
            )}

            {/* Main Layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Artwork List (only for metadata/haggle tabs that need selection) */}
                {['metadata', 'market', 'controls', 'haggle'].includes(subTab) && (
                    <div style={{ width: 260, overflowY: 'auto', borderRight: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column' }}>
                        {/* Search + Sort */}
                        <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid #1a1a2e' }}>
                            <input
                                type="text" placeholder="🔍 Search artworks..."
                                value={artworkSearch} onChange={e => setArtworkSearch(e.target.value)}
                                style={{ ...inputStyle, width: '100%', fontSize: 10, padding: '5px 8px', marginBottom: 4, boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <select value={artworkSort} onChange={e => setArtworkSort(e.target.value)}
                                    style={{ background: '#0a0a12', border: '1px solid #222', color: '#666', fontSize: 8, borderRadius: 3, padding: '2px 4px', fontFamily: mono }}>
                                    <option value="name">A→Z Name</option>
                                    <option value="artist">A→Z Artist</option>
                                    <option value="price_desc">Price ↓</option>
                                    <option value="price_asc">Price ↑</option>
                                    <option value="delta">P&L ↓</option>
                                    <option value="tier">Tier</option>
                                </select>
                                <span style={{ fontSize: 8, color: '#444' }}>{filtered.length} works</span>
                            </div>
                        </div>
                        <div style={{ fontSize: 9, color: '#444', padding: '4px 8px', textAlign: 'center' }}>
                            Shift+click to bulk select
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
                            {filtered.length === 0 && (
                                <div style={{ color: '#555', fontSize: 10, textAlign: 'center', padding: 20 }}>No artworks found</div>
                            )}
                            {filtered.map(work => {
                                const price = work.askingPrice || work.price || 0;
                                const baseP = work.basePrice || price;
                                const delta = baseP > 0 ? ((price - baseP) / baseP) * 100 : 0;
                                const isBulk = selectedIds.has(work.id);
                                return (
                                    <div key={work.id} onClick={(e) => handleSelect(work.id, e)} style={{
                                        padding: '7px 8px', cursor: 'pointer', borderBottom: '1px solid #0a0a12',
                                        background: isBulk ? 'rgba(201,168,76,0.15)' : selectedId === work.id ? 'rgba(201,168,76,0.08)' : 'transparent',
                                        borderLeft: isBulk ? '3px solid #f59e0b' : selectedId === work.id ? '3px solid #c9a84c' : '3px solid transparent',
                                        borderRadius: 3,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <span style={{ fontSize: 10, color: selectedId === work.id ? '#c9a84c' : '#eaeaea', fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {work.title || 'Untitled'}
                                            </span>
                                            <span style={{ fontSize: 9, color: '#4ade80', fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: 4 }}>
                                                ${price.toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 9, color: '#555', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{work.artist || 'Unknown'}{work.year ? `, ${work.year}` : ''}</span>
                                            {delta !== 0 && (
                                                <span style={{ fontSize: 8, color: delta > 0 ? '#4ade80' : '#f87171' }}>
                                                    {delta > 0 ? '▲' : '▼'}{Math.abs(delta).toFixed(0)}%
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                                            <span style={{
                                                fontSize: 7, padding: '1px 4px', borderRadius: 2,
                                                background: `${sourceColors[work._source] || '#888'}15`, color: sourceColors[work._source] || '#888',
                                            }}>{work._source}</span>
                                            {work.tier && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 2, background: '#c9a84c15', color: '#c9a84c' }}>{work.tier}</span>}
                                            {work.medium && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 2, background: '#60a5fa15', color: '#60a5fa' }}>{work.medium?.slice(0, 12)}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Sub-tab bar */}
                    <div style={{ display: 'flex', gap: 4, padding: '6px 12px', borderBottom: '1px solid #1a1a2e', flexWrap: 'wrap' }}>
                        {subTabs.map(st => (
                            <button key={st.id} onClick={() => setSubTab(st.id)} style={{
                                ...btnStyle, fontSize: 9,
                                borderColor: subTab === st.id ? '#c9a84c' : '#222',
                                color: subTab === st.id ? '#c9a84c' : '#555',
                            }}>{st.icon} {st.label}</button>
                        ))}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                        {/* METADATA */}
                        {subTab === 'metadata' && (
                            <div style={{ display: 'flex', gap: 12, height: '100%' }}>
                                <div style={{ flex: 2 }}>
                                    {!selected ? (
                                        <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>Select an artwork to edit</div>
                                    ) : (
                                        <div>
                                            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#c9a84c', marginBottom: 16 }}>
                                                {selected.title || 'Untitled'}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                                <div><label style={labelStyle}>Title</label><input value={selected.title || ''} onChange={e => handleFieldEdit('title', e.target.value)} style={inputStyle} /></div>
                                                <div><label style={labelStyle}>Artist</label><input value={selected.artist || ''} onChange={e => handleFieldEdit('artist', e.target.value)} style={inputStyle} /></div>
                                                <div><label style={labelStyle}>Year</label><input value={selected.year || ''} onChange={e => handleFieldEdit('year', e.target.value)} style={inputStyle} /></div>
                                                <div><label style={labelStyle}>Medium</label><input value={selected.medium || ''} onChange={e => handleFieldEdit('medium', e.target.value)} style={inputStyle} /></div>
                                                <div><label style={labelStyle}>Dimensions</label><input value={selected.dimensions || ''} onChange={e => handleFieldEdit('dimensions', e.target.value)} style={inputStyle} /></div>
                                                <div><label style={labelStyle}>Asking Price ($)</label><input type="number" value={selected.askingPrice || selected.price || 0} onChange={e => handleFieldEdit('askingPrice', parseInt(e.target.value) || 0)} style={{ ...inputStyle, color: '#4ade80' }} /></div>
                                                <div><label style={labelStyle}>Genre</label><input value={selected.genre || ''} onChange={e => handleFieldEdit('genre', e.target.value)} style={inputStyle} /></div>
                                                <div><label style={labelStyle}>Tier</label>
                                                    <select value={selected.tier || 'speculative'} onChange={e => handleFieldEdit('tier', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                                        <option value="classic">Classic</option>
                                                        <option value="mid_career">Mid-Career</option>
                                                        <option value="speculative">Speculative</option>
                                                    </select>
                                                </div>
                                                <div><label style={labelStyle}>Artist ID</label>
                                                    <select value={selected.artistId || ''} onChange={e => handleFieldEdit('artistId', e.target.value || null)}
                                                        style={{ ...inputStyle, cursor: 'pointer', color: selected.artistId ? '#60a5fa' : '#555' }}>
                                                        <option value="">— Not linked —</option>
                                                        {ARTISTS.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: 10 }}>
                                                <label style={labelStyle}>Provenance</label>
                                                <textarea value={selected.provenance || ''} onChange={e => handleFieldEdit('provenance', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', fontStyle: 'italic', color: '#888' }} />
                                            </div>
                                            <div style={{ marginTop: 10 }}>
                                                <label style={labelStyle}>Notes</label>
                                                <textarea value={selected.notes || ''} onChange={e => handleFieldEdit('notes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Add notes..." />
                                            </div>
                                            <HagglePricePanel work={selected} />
                                        </div>
                                    )}
                                </div>

                                {/* Market Data Panel */}
                                {selected && <ArtworkMarketPanel work={selected} />}

                                {/* JSON Panel */}
                                <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ color: '#666', fontSize: 9, textTransform: 'uppercase' }}>RAW JSON</span>
                                        <button onClick={handleHotSwap} style={{ ...btnStyle, fontSize: 9 }}>🔥 Hot-Swap</button>
                                    </div>
                                    <textarea
                                        value={jsonEdit} onChange={e => setJsonEdit(e.target.value)} spellCheck={false}
                                        style={{
                                            flex: 1, background: '#050508', color: '#4ade80', border: '1px solid #222',
                                            fontFamily: mono, fontSize: 10, padding: 8, resize: 'none', outline: 'none', borderRadius: 4,
                                        }}
                                        placeholder="Select artwork to view JSON..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* ARTISTS */}
                        {subTab === 'artists' && <ArtistsPanel onNotify={showNotif} />}

                        {/* MARKET STATS */}
                        {subTab === 'market' && <MarketStatsPanel />}

                        {/* MARKET CONTROLS */}
                        {subTab === 'controls' && <MarketControlsPanel onNotify={showNotif} />}

                        {/* PORTFOLIO */}
                        {subTab === 'portfolio' && <PortfolioPanel />}

                        {/* CALENDAR */}
                        {subTab === 'calendar' && <CalendarEventsPanel />}

                        {/* HAGGLE MATRIX */}
                        {subTab === 'haggle' && (
                            <div>
                                <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 'bold', marginBottom: 12 }}>
                                    ⚔️ HAGGLE PRICE SIMULATION
                                </div>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 16 }}>
                                    Projected asking prices by dealer type. Lower greed factor = better starting price.
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #333' }}>
                                            <th style={{ textAlign: 'left', padding: 6, color: '#666' }}>Artwork</th>
                                            <th style={{ textAlign: 'left', padding: 6, color: '#666' }}>Base Price</th>
                                            {Object.entries(DEALER_TYPES).map(([k, d]) => (
                                                <th key={k} style={{ textAlign: 'center', padding: 6, color: '#666', fontSize: 8 }}>
                                                    {d.icon}<br />{d.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {artworks.slice(0, 30).map(w => {
                                            const base = w.askingPrice || w.price || 0;
                                            return (
                                                <tr key={w.id} style={{ borderBottom: '1px solid #111' }}>
                                                    <td style={{ padding: 6, color: '#eaeaea', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {w.title || 'Untitled'}
                                                    </td>
                                                    <td style={{ padding: 6, color: '#4ade80' }}>${base.toLocaleString()}</td>
                                                    {Object.entries(DEALER_TYPES).map(([k, d]) => {
                                                        const ask = Math.round(base * d.greedFactor);
                                                        const diff = d.greedFactor - 1;
                                                        return (
                                                            <td key={k} style={{
                                                                textAlign: 'center', padding: 6, fontSize: 9,
                                                                color: diff > 0.2 ? '#f87171' : diff > 0 ? '#f59e0b' : '#4ade80',
                                                            }}>
                                                                ${ask.toLocaleString()}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* TEAR SHEET */}
                        {subTab === 'tearsheet' && (
                            <div style={{ flex: 1, margin: -16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <TearSheetView />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
