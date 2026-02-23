/**
 * ActivityLogViewer — CMS Dashboard for Universal Activity Logger
 *
 * Displays a chronological timeline of all game actions with:
 *  - Category filters (dialogue, haggle, trade, movement, npc, etc.)
 *  - Week range filtering
 *  - NPC filtering
 *  - Text search
 *  - Stats summary
 *  - Click-to-expand detail view
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ActivityLogger } from '../../managers/ActivityLogger.js';
import { CONTACTS } from '../../data/contacts.js';

const NPC_MAP = {};
(CONTACTS || []).forEach(c => { NPC_MAP[c.id] = c.name || c.id; });

const CAT_META = ActivityLogger.CATEGORY_META;

// ── Styles ──
const S = {
    pill: (color, active) => ({
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 12, fontSize: 10,
        background: active ? `${color}25` : 'transparent',
        color: active ? color : '#555',
        border: `1px solid ${active ? color : '#222'}`,
        cursor: 'pointer', userSelect: 'none',
        transition: 'all 0.15s ease',
    }),
    input: {
        background: '#050508', color: '#eaeaea',
        border: '1px solid #333', fontFamily: 'inherit', fontSize: 10,
        padding: '4px 8px', outline: 'none', borderRadius: 3,
    },
};

export default function ActivityLogViewer() {
    const [entries, setEntries] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [npcFilter, setNpcFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [weekMin, setWeekMin] = useState('');
    const [weekMax, setWeekMax] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Refresh data
    const refresh = useCallback(() => {
        setEntries([...ActivityLogger.getAll()]);
        setRefreshKey(k => k + 1);
    }, []);

    useEffect(() => { refresh(); }, []);

    // Stats
    const stats = useMemo(() => ActivityLogger.getStats(), [refreshKey, entries.length]);

    // Filtered entries
    const filtered = useMemo(() => {
        let results = [...entries].reverse();

        if (categoryFilter) {
            results = results.filter(e => e.category === categoryFilter);
        }
        if (npcFilter) {
            results = results.filter(e => e.npcId === npcFilter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            results = results.filter(e =>
                e.action.toLowerCase().includes(q) ||
                JSON.stringify(e.details).toLowerCase().includes(q) ||
                (e.npcId || '').toLowerCase().includes(q)
            );
        }
        if (weekMin) {
            const wm = parseInt(weekMin);
            if (!isNaN(wm)) results = results.filter(e => e.week >= wm);
        }
        if (weekMax) {
            const wx = parseInt(weekMax);
            if (!isNaN(wx)) results = results.filter(e => e.week <= wx);
        }

        return results.slice(0, 200); // Cap display
    }, [entries, categoryFilter, npcFilter, searchQuery, weekMin, weekMax]);

    // Unique NPCs in log
    const npcOptions = useMemo(() => {
        const ids = new Set();
        entries.forEach(e => { if (e.npcId) ids.add(e.npcId); });
        return Array.from(ids).map(id => ({ id, name: NPC_MAP[id] || id }));
    }, [entries]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#eaeaea', fontFamily: 'inherit' }}>
            {/* ── Header ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', background: '#111', borderBottom: '1px solid #333',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <strong style={{ color: '#c9a84c', fontSize: 13 }}>📋 Activity Log</strong>
                    <span style={{ color: '#555', fontSize: 10 }}>{entries.length} total entries</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={refresh} style={{
                        background: 'transparent', border: '1px solid #444', color: '#aaa',
                        padding: '3px 10px', cursor: 'pointer', fontSize: 10, borderRadius: 3,
                    }}>🔄 Refresh</button>
                    <button onClick={() => { ActivityLogger.reset(); refresh(); }} style={{
                        background: 'transparent', border: '1px solid #f8717130', color: '#f87171',
                        padding: '3px 10px', cursor: 'pointer', fontSize: 10, borderRadius: 3,
                    }}>🗑 Clear</button>
                </div>
            </div>

            {/* ── Stats Bar ── */}
            <div style={{
                display: 'flex', gap: 16, padding: '8px 16px',
                background: '#0a0a12', borderBottom: '1px solid #222', fontSize: 10,
            }}>
                <div><span style={{ color: '#555' }}>Total:</span> <strong style={{ color: '#c9a84c' }}>{stats.total}</strong></div>
                {Object.entries(stats.categories || {}).map(([cat, count]) => {
                    const meta = CAT_META[cat];
                    return (
                        <div key={cat}>
                            <span style={{ color: meta?.color || '#555' }}>{meta?.icon} {meta?.label}:</span>
                            <strong style={{ color: meta?.color, marginLeft: 3 }}>{count}</strong>
                        </div>
                    );
                })}
                {stats.topNPC && (
                    <div><span style={{ color: '#555' }}>Top NPC:</span> <strong style={{ color: '#fbbf24' }}>{NPC_MAP[stats.topNPC] || stats.topNPC} ({stats.topNPCCount})</strong></div>
                )}
            </div>

            {/* ── Filters ── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 16px',
                background: '#080810', borderBottom: '1px solid #1a1a2e',
            }}>
                {/* Category pills */}
                <span style={S.pill('#888', !categoryFilter)}
                    onClick={() => setCategoryFilter(null)}>All</span>
                {Object.entries(CAT_META).map(([cat, meta]) => (
                    <span key={cat} style={S.pill(meta.color, categoryFilter === cat)}
                        onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}>
                        {meta.icon} {meta.label}
                    </span>
                ))}

                <div style={{ flex: 1 }} />

                {/* NPC filter */}
                <select value={npcFilter} onChange={e => setNpcFilter(e.target.value)}
                    style={{ ...S.input, width: 130, cursor: 'pointer' }}>
                    <option value="">All NPCs</option>
                    {npcOptions.map(n => <option key={n.id} value={n.id}>🧑 {n.name}</option>)}
                </select>

                {/* Week range */}
                <input value={weekMin} onChange={e => setWeekMin(e.target.value)}
                    style={{ ...S.input, width: 50, textAlign: 'center' }} placeholder="Wk ≥" />
                <input value={weekMax} onChange={e => setWeekMax(e.target.value)}
                    style={{ ...S.input, width: 50, textAlign: 'center' }} placeholder="Wk ≤" />

                {/* Search */}
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    style={{ ...S.input, width: 180 }} placeholder="🔍 Search actions..." />
            </div>

            {/* ── Timeline ── */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
                {filtered.length === 0 ? (
                    <div style={{ color: '#555', textAlign: 'center', marginTop: 60, fontSize: 13 }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                        {entries.length === 0
                            ? 'No activity recorded yet. Play the game to generate logs.'
                            : 'No entries match your filters.'
                        }
                    </div>
                ) : (
                    <div style={{ paddingTop: 8 }}>
                        {filtered.map(entry => {
                            const meta = CAT_META[entry.category] || {};
                            const isExpanded = expandedId === entry.id;
                            const npcName = entry.npcId ? (NPC_MAP[entry.npcId] || entry.npcId) : null;
                            const time = new Date(entry.timestamp).toLocaleTimeString();

                            return (
                                <div key={entry.id} onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                    style={{
                                        padding: '8px 12px', cursor: 'pointer',
                                        borderBottom: '1px solid #111',
                                        borderLeft: `3px solid ${meta.color || '#333'}`,
                                        background: isExpanded ? 'rgba(201,168,76,0.04)' : 'transparent',
                                        transition: 'background 0.15s',
                                    }}>
                                    {/* Main row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 14 }}>{meta.icon}</span>
                                        <span style={{
                                            fontSize: 9, color: meta.color, fontWeight: 'bold',
                                            textTransform: 'uppercase', minWidth: 70,
                                        }}>{meta.label}</span>
                                        <span style={{ fontSize: 11, color: '#ddd', flex: 1 }}>
                                            {formatAction(entry)}
                                        </span>
                                        {npcName && <span style={{ fontSize: 9, color: '#fbbf24' }}>🧑 {npcName}</span>}
                                        <span style={{ fontSize: 9, color: '#444' }}>Wk {entry.week}</span>
                                        <span style={{ fontSize: 8, color: '#333' }}>{time}</span>
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div style={{
                                            marginTop: 8, padding: 8,
                                            background: '#050508', borderRadius: 4,
                                            border: '1px solid #222',
                                        }}>
                                            <pre style={{
                                                fontSize: 9, color: '#4ade80',
                                                fontFamily: 'monospace', margin: 0,
                                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                            }}>
                                                {JSON.stringify(entry.details, null, 2)}
                                            </pre>
                                            {entry.tags?.length > 0 && (
                                                <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                                                    {entry.tags.map((t, i) => (
                                                        <span key={i} style={{
                                                            fontSize: 8, padding: '1px 5px', borderRadius: 10,
                                                            background: '#222', color: '#888', border: '1px solid #333',
                                                        }}>#{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

/** Format action details into a readable one-liner */
function formatAction(entry) {
    const d = entry.details;
    switch (entry.action) {
        case 'choice_made':
            return `"${d.choiceLabel || '—'}" in ${d.eventTitle || d.eventId}${d.isBlueOption ? ' 💙' : ''}`;
        case 'event_triggered':
            return `Event: "${d.title || d.eventId}" [${d.category || '—'}]`;
        case 'week_advanced':
            return `Week ${d.week} — Cash: $${(d.cash || 0).toLocaleString()}, Rep: ${d.reputation || 0}`;
        case 'arc_activated':
            return `"${d.title}" storyline activated (${d.totalSteps} steps)`;
        case 'step_fired':
            return `Storyline "${d.storylineId}" → event ${d.eventId}`;
        case 'npc_trade':
            return `${d.buyer} bought "${d.artwork}" from ${d.seller} for $${(d.price || 0).toLocaleString()}`;
        case 'battle_start':
            return `Haggle started: ${d.mode} "${d.artwork}" vs ${d.npc || '—'}`;
        case 'battle_end':
            return `Haggle ${d.result}: ${d.artwork} @ $${(d.price || 0).toLocaleString()}`;
        default:
            // Generic format
            const parts = [];
            if (d.choiceLabel) parts.push(`"${d.choiceLabel}"`);
            if (d.eventTitle || d.eventId) parts.push(d.eventTitle || d.eventId);
            if (d.title) parts.push(d.title);
            if (d.artwork) parts.push(`"${d.artwork}"`);
            if (d.price) parts.push(`$${d.price.toLocaleString()}`);
            return parts.length > 0 ? parts.join(' — ') : entry.action.replace(/_/g, ' ');
    }
}
