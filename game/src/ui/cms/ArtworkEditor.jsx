import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState } from '../../managers/GameState.js';
import { MarketManager } from '../../managers/MarketManager.js';
import { useCmsStore } from '../../stores/cmsStore.js';
import { useMarketStore } from '../../stores/marketStore.js';
import { CALENDAR_EVENTS } from '../../data/calendar_events.js';
import { ARTWORKS } from '../../data/artworks.js';
import { DEALER_TYPES, ROLE_TO_DEALER_TYPE, HAGGLE_CONFIG } from '../../data/haggle_config.js';

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

// ── Tiny Sparkline ──
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

// ── Market Stats Panel ──
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
            {/* Market Cycle Banner */}
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

            {/* Weekly Intel */}
            {weeklyNews && weeklyNews.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ color: '#c9a84c', fontSize: 10, fontWeight: 'bold', marginBottom: 6 }}>📰 WEEKLY INTEL</div>
                    {weeklyNews.map((news, i) => (
                        <div key={i} style={{
                            fontSize: 10, color: news.includes('[INTEL]') ? '#f59e0b' : '#888',
                            padding: '3px 0', borderBottom: '1px solid #1a1a2e',
                        }}>
                            {news}
                        </div>
                    ))}
                </div>
            )}

            {/* Artist Heat Table */}
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

// ── Calendar Events Panel ──
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

// ── Haggle Price Calculator ──
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

// ═══════════════════════════════════════════════════
// MAIN EXPORT: Enhanced ArtworkEditor
// ═══════════════════════════════════════════════════
export default function ArtworkEditor() {
    const [artworks, setArtworks] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [jsonEdit, setJsonEdit] = useState('');
    const [notification, setNotification] = useState(null);
    const [filter, setFilter] = useState('all');
    const [subTab, setSubTab] = useState('metadata'); // metadata, market, calendar, haggle

    useEffect(() => {
        try {
            const allWorks = [];

            // From static ARTWORKS data
            if (Array.isArray(ARTWORKS)) {
                ARTWORKS.forEach(w => { if (w) allWorks.push({ ...w, _source: 'data' }); });
            }

            if (GameState.state) {
                const inv = GameState.state.inventory;
                if (Array.isArray(inv)) inv.forEach(w => { if (w) allWorks.push({ ...w, _source: 'inventory' }); });
            }

            if (MarketManager.works && Array.isArray(MarketManager.works)) {
                MarketManager.works.forEach(w => { if (w) allWorks.push({ ...w, _source: 'market' }); });
            }

            if (MarketManager.artists && Array.isArray(MarketManager.artists)) {
                MarketManager.artists.forEach(artist => {
                    if (artist && Array.isArray(artist.works)) {
                        artist.works.forEach(w => { if (w) allWorks.push({ ...w, _source: 'artist', _artistName: artist.name }); });
                    }
                });
            }

            // Deduplicate
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

    const filtered = filter === 'all' ? artworks
        : artworks.filter(w => w._source === filter || (filter === 'data' && !w._source));

    const selected = artworks.find(w => w.id === selectedId);

    const showNotif = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

    const handleSelect = (id) => {
        setSelectedId(id);
        const work = artworks.find(w => w.id === id);
        if (work) setJsonEdit(JSON.stringify(work, null, 4));
    };

    const handleFieldEdit = useCallback((field, value) => {
        if (!selected) return;
        const updated = artworks.map(w => w.id === selected.id ? { ...w, [field]: value } : w);
        setArtworks(updated);
        const updatedWork = updated.find(w => w.id === selected.id);
        if (updatedWork) setJsonEdit(JSON.stringify(updatedWork, null, 4));
        useCmsStore.getState().markDirty('artworks');
    }, [selected, artworks]);

    const handleHotSwap = () => {
        try {
            const parsed = JSON.parse(jsonEdit);
            const updated = artworks.map(w => w.id === parsed.id ? { ...parsed, _source: w._source } : w);
            setArtworks(updated);
            useCmsStore.getState().markDirty('artworks');
            showNotif('🔥 Hot-swapped artwork');
        } catch (err) { showNotif('❌ JSON Error: ' + err.message); }
    };

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(artworks, null, 4));
        const anchor = document.createElement('a');
        anchor.href = dataStr; anchor.download = "artworks_dump.json"; anchor.click();
        showNotif('📥 Downloaded artworks_dump.json');
    };

    // Tier stats
    const tierStats = useMemo(() => {
        const stats = { classic: 0, mid_career: 0, speculative: 0, other: 0 };
        artworks.forEach(w => { stats[w.tier] = (stats[w.tier] || 0) + 1; });
        return stats;
    }, [artworks]);

    const totalValue = useMemo(() => artworks.reduce((sum, w) => sum + (w.askingPrice || w.price || 0), 0), [artworks]);

    const sourceColors = { data: '#888', inventory: '#4ade80', market: '#60a5fa', artist: '#c084fc' };

    const subTabs = [
        { id: 'metadata', icon: '📝', label: 'Metadata' },
        { id: 'market', icon: '📊', label: 'Market Stats' },
        { id: 'calendar', icon: '📅', label: 'Calendar' },
        { id: 'haggle', icon: '⚔️', label: 'Haggle Matrix' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px', background: '#111', borderBottom: '1px solid #333',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <strong style={{ color: '#c9a84c', fontSize: 13 }}>🖼️ Artworks & Market</strong>
                    {['all', 'data', 'inventory', 'market', 'artist'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            ...btnStyle, fontSize: 9,
                            borderColor: filter === f ? '#c9a84c' : '#333',
                            color: filter === f ? '#c9a84c' : '#555',
                        }}>
                            {f === 'all' ? '🏷️ All' : f === 'data' ? '📁 Data' : f === 'inventory' ? '🎒 Owned' : f === 'market' ? '📊 Market' : '🎨 Artists'}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 9, color: '#555' }}>
                        {artworks.length} works · ${totalValue.toLocaleString()} total ·
                        C:{tierStats.classic} M:{tierStats.mid_career} S:{tierStats.speculative}
                    </span>
                    {notification && <span style={{ color: '#4ade80', fontSize: 10 }}>{notification}</span>}
                    <button onClick={handleDownload} style={{ ...btnStyle, fontSize: 9 }}>📥 Export</button>
                </div>
            </div>

            {/* Main Layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Artwork List */}
                <div style={{ width: 240, overflowY: 'auto', borderRight: '1px solid #1a1a2e', padding: '8px' }}>
                    {filtered.length === 0 && (
                        <div style={{ color: '#555', fontSize: 10, textAlign: 'center', padding: 20 }}>No artworks found</div>
                    )}
                    {filtered.map(work => {
                        const price = work.askingPrice || work.price || 0;
                        return (
                            <div key={work.id} onClick={() => handleSelect(work.id)} style={{
                                padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #111',
                                background: selectedId === work.id ? 'rgba(201,168,76,0.08)' : 'transparent',
                                borderLeft: selectedId === work.id ? '3px solid #c9a84c' : '3px solid transparent',
                            }}>
                                <div style={{ fontSize: 11, color: selectedId === work.id ? '#c9a84c' : '#eaeaea', fontWeight: 'bold' }}>
                                    {work.title || 'Untitled'}
                                </div>
                                <div style={{ fontSize: 9, color: '#666', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{work.artist || 'Unknown'}</span>
                                    <span style={{ color: '#4ade80' }}>${price.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                                    <span style={{
                                        fontSize: 7, padding: '1px 4px', borderRadius: 2,
                                        background: `${sourceColors[work._source] || '#888'}15`, color: sourceColors[work._source] || '#888',
                                    }}>{work._source}</span>
                                    {work.tier && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 2, background: '#c9a84c15', color: '#c9a84c' }}>{work.tier}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Sub-tab bar */}
                    <div style={{ display: 'flex', gap: 4, padding: '6px 12px', borderBottom: '1px solid #1a1a2e' }}>
                        {subTabs.map(st => (
                            <button key={st.id} onClick={() => setSubTab(st.id)} style={{
                                ...btnStyle, fontSize: 9,
                                borderColor: subTab === st.id ? '#c9a84c' : '#222',
                                color: subTab === st.id ? '#c9a84c' : '#555',
                            }}>{st.icon} {st.label}</button>
                        ))}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                        {/* METADATA SUB-TAB */}
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
                                                <div><label style={labelStyle}>Source</label><input readOnly value={selected._source || 'unknown'} style={{ ...inputStyle, color: '#555' }} /></div>
                                            </div>
                                            <div style={{ marginTop: 10 }}>
                                                <label style={labelStyle}>Provenance</label>
                                                <textarea value={selected.provenance || ''} onChange={e => handleFieldEdit('provenance', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', fontStyle: 'italic', color: '#888' }} />
                                            </div>
                                            <div style={{ marginTop: 10 }}>
                                                <label style={labelStyle}>Notes</label>
                                                <textarea value={selected.notes || ''} onChange={e => handleFieldEdit('notes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Add notes..." />
                                            </div>

                                            {/* Haggle price matrix for selected work */}
                                            <HagglePricePanel work={selected} />
                                        </div>
                                    )}
                                </div>

                                {/* JSON Panel */}
                                <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column' }}>
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

                        {/* MARKET STATS SUB-TAB */}
                        {subTab === 'market' && <MarketStatsPanel />}

                        {/* CALENDAR SUB-TAB */}
                        {subTab === 'calendar' && <CalendarEventsPanel />}

                        {/* HAGGLE MATRIX SUB-TAB */}
                        {subTab === 'haggle' && (
                            <div>
                                <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 'bold', marginBottom: 12 }}>
                                    ⚔️ HAGGLE PRICE SIMULATION
                                </div>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 16 }}>
                                    Shows projected asking prices for every artwork × dealer type combination.
                                    Lower greed factor = better starting price for the player.
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
                                        {artworks.slice(0, 20).map(w => {
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
                    </div>
                </div>
            </div>
        </div>
    );
}
