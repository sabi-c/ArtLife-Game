/**
 * EngineOverview.jsx — Three-Engine Dashboard & Simulation Control
 *
 * CMS tab for visualizing the interconnected engine architecture and testing:
 *   - Overview: Node-based flow diagram, event fire panel, active effects.
 *   - Diagnostics: System health, listener counts, basic stats.
 *   - NPC Editor: Direct manipulation of trust, respect, and grudges.
 *   - Haggle Test: Simulate a negotiation outcome without playing.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MarketEventBus, EVENT_IMPACTS } from '../../managers/MarketEventBus.js';
import { MarketManager } from '../../managers/MarketManager.js';
import { MarketSimulator } from '../../managers/MarketSimulator.js';
import { useNPCStore } from '../../stores/npcStore.js';
import { GameState } from '../../managers/GameState.js';
import { ARTISTS } from '../../data/artists.js';
import { CONTACTS } from '../../data/contacts.js';
import { HaggleManager } from '../../managers/HaggleManager.js';
import { ARTWORK_MAP } from '../../data/artworks.js';
import { useMarketStore } from '../../stores/marketStore.js';

const mono = "'SF Mono', 'Fira Code', 'Consolas', monospace";

const miniBtn = {
    background: 'transparent', border: '1px solid #333', color: '#888',
    padding: '4px 10px', cursor: 'pointer', fontFamily: mono, fontSize: 9,
    borderRadius: 3, textTransform: 'uppercase', letterSpacing: 0.5,
};
const activeBtn = (a) => ({
    ...miniBtn,
    background: a ? 'rgba(201,168,76,0.15)' : 'transparent',
    borderColor: a ? '#c9a84c' : '#333',
    color: a ? '#c9a84c' : '#888',
});
const dangerBtn = { ...miniBtn, borderColor: '#c94040', color: '#c94040' };
const successBtn = { ...miniBtn, borderColor: '#4caf50', color: '#4caf50' };

// ══════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════

function StatBox({ label, value, color = '#c9a84c', sub }) {
    return (
        <div style={{ background: '#1a1a24', border: '1px solid #333', borderRadius: 4, padding: '8px 12px', flex: 1 }}>
            <div style={{ fontSize: 9, color: '#666', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 16, color, fontFamily: mono, fontWeight: 600 }}>{value}</div>
            {sub && <div style={{ fontSize: 8, color: '#555', marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: OVERVIEW
// ══════════════════════════════════════════════

function EngineFlowGraph({ activeEffects, eventLog }) {
    const nodes = [
        { id: 'events', x: 60, y: 30, label: '🎭 Events', sub: `${eventLog.length} logged`, color: '#c9a84c' },
        { id: 'market', x: 260, y: 30, label: '📊 Market', sub: `${activeEffects.length} active`, color: '#60a5fa' },
        { id: 'npc', x: 460, y: 30, label: '👤 NPC Memory', sub: `${CONTACTS.length} NPCs`, color: '#4ade80' },
        { id: 'haggle', x: 360, y: 110, label: '⚔️ Negotiation', sub: 'trust→price', color: '#f87171' },
        { id: 'terminal', x: 160, y: 110, label: '📡 Terminal', sub: 'live display', color: '#a78bfa' },
    ];
    const edges = [
        { from: 'events', to: 'market', label: 'price adjust' },
        { from: 'events', to: 'npc', label: 'memory' },
        { from: 'market', to: 'terminal', label: 'prices' },
        { from: 'npc', to: 'haggle', label: 'trust/grudge' },
        { from: 'market', to: 'haggle', label: 'base price' },
        { from: 'npc', to: 'terminal', label: 'status' },
    ];

    const getNode = (id) => nodes.find(n => n.id === id);
    return (
        <div style={{ background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 6 }}>ENGINE ARCHITECTURE</div>
            <svg viewBox={`0 0 580 160`} style={{ width: '100%', maxHeight: 160 }}>
                {edges.map((edge, i) => {
                    const from = getNode(edge.from);
                    const to = getNode(edge.to);
                    if (!from || !to) return null;
                    const pulse = activeEffects.length > 0 && (edge.from === 'events' || edge.from === 'market');
                    return (
                        <g key={i}>
                            <line
                                x1={from.x + 60} y1={from.y + 16} x2={to.x} y2={to.y + 16}
                                stroke={pulse ? '#c9a84c' : '#333'} strokeWidth={pulse ? 1.5 : 0.8}
                                strokeDasharray={pulse ? '' : '4'} opacity={pulse ? 0.9 : 0.4}
                            />
                            <text x={(from.x + 60 + to.x) / 2} y={(from.y + to.y) / 2 + 10} fill="#444" fontSize="7" textAnchor="middle">{edge.label}</text>
                        </g>
                    );
                })}
                {nodes.map(node => (
                    <g key={node.id}>
                        <rect x={node.x} y={node.y} width={120} height={35} rx={4} fill="rgba(255,255,255,0.03)" stroke={node.color} strokeWidth={1} />
                        <text x={node.x + 60} y={node.y + 16} fill={node.color} fontSize="10" fontFamily={mono} textAnchor="middle" fontWeight="600">{node.label}</text>
                        <text x={node.x + 60} y={node.y + 28} fill="#666" fontSize="7" fontFamily={mono} textAnchor="middle">{node.sub}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

function EventFirePanel({ onEventFired }) {
    const [selectedEvent, setSelectedEvent] = useState('artist_death');
    const [selectedArtist, setSelectedArtist] = useState(ARTISTS[0]?.id || '');
    const [selectedNpc, setSelectedNpc] = useState(CONTACTS[0]?.id || '');

    const marketEvents = ['artist_death', 'scandal', 'museum_acquisition', 'auction_record', 'recession_start', 'recession_end', 'bubble_pop', 'fair_success', 'gallery_closure'];
    const playerEvents = ['player_lowballed', 'player_flipped', 'player_honored_deal', 'player_tipped_off'];

    const needsArtist = ['artist_death', 'scandal', 'museum_acquisition', 'auction_record'].includes(selectedEvent);
    const needsNpc = ['scandal', 'gallery_closure', 'player_lowballed', 'player_flipped', 'player_honored_deal', 'player_tipped_off'].includes(selectedEvent);

    const fireEvent = () => {
        const week = GameState.state?.week || 1;
        const payload = { week };
        if (needsArtist) payload.artistId = selectedArtist;
        if (needsNpc) payload.npcId = selectedNpc;
        if (selectedEvent === 'player_lowballed') { payload.amount = 5000; payload.askingPrice = 15000; }
        if (selectedEvent === 'player_flipped') { payload.profit = 8000; payload.weeksHeld = 2; }
        MarketEventBus.emit(selectedEvent, payload, week);
        if (needsNpc && payload.npcId) {
            try {
                const impact = EVENT_IMPACTS[selectedEvent] || {};
                useNPCStore.getState().recordInteraction(payload.npcId, selectedEvent, { ...impact, ...payload }, impact.significance, week);
            } catch { /* ignore */ }
        }
        if (onEventFired) onEventFired();
    };

    return (
        <div style={{ background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 8, color: '#555', marginBottom: 3 }}>MARKET EVENTS</div>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
                        {marketEvents.map(e => <button key={e} style={activeBtn(selectedEvent === e)} onClick={() => setSelectedEvent(e)}>{e.replace(/_/g, ' ')}</button>)}
                    </div>
                    <div style={{ fontSize: 8, color: '#555', marginBottom: 3 }}>PLAYER EVENTS</div>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {playerEvents.map(e => <button key={e} style={activeBtn(selectedEvent === e)} onClick={() => setSelectedEvent(e)}>{e.replace(/_/g, ' ')}</button>)}
                    </div>
                </div>
                <div style={{ width: 180 }}>
                    {needsArtist && (
                        <select value={selectedArtist} onChange={e => setSelectedArtist(e.target.value)} style={{ background: '#1a1a24', color: '#ccc', border: '1px solid #333', padding: '3px 6px', fontSize: 10, width: '100%', marginBottom: 6 }}>
                            {ARTISTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    )}
                    {needsNpc && (
                        <select value={selectedNpc} onChange={e => setSelectedNpc(e.target.value)} style={{ background: '#1a1a24', color: '#ccc', border: '1px solid #333', padding: '3px 6px', fontSize: 10, width: '100%', marginBottom: 6 }}>
                            {CONTACTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                    <button style={dangerBtn} onClick={fireEvent}>🔥 FIRE EVENT</button>
                </div>
            </div>
        </div>
    );
}

function OverviewTab({ refreshKey, onRefresh }) {
    const activeEffects = useMemo(() => MarketEventBus.getActiveEffects(), [refreshKey]);
    const eventLog = useMemo(() => MarketEventBus.getEventLog(), [refreshKey]);
    return (
        <div>
            <EngineFlowGraph activeEffects={activeEffects} eventLog={eventLog} />
            <EventFirePanel onEventFired={onRefresh} />
            <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 12 }}>
                    <div style={{ fontSize: 9, color: '#555', marginBottom: 6 }}>ACTIVE EFFECTS ({activeEffects.length})</div>
                    {activeEffects.map((eff, i) => (
                        <div key={i} style={{ fontSize: 10, color: eff.multiplier > 1 ? '#4ade80' : '#f87171', padding: '2px 0' }}>
                            {eff.type} → {eff.multiplier > 1 ? '+' : ''}{((eff.multiplier - 1) * 100).toFixed(0)}% ({eff.remaining}wk left)
                        </div>
                    ))}
                </div>
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 12, maxHeight: 150, overflow: 'auto' }}>
                    <div style={{ fontSize: 9, color: '#555', marginBottom: 6 }}>EVENT LOG</div>
                    {eventLog.slice(-10).reverse().map((ev, i) => (
                        <div key={i} style={{ fontSize: 9, color: '#aaa', padding: '2px 0' }}>W{ev.week}: {ev.type}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: DIAGNOSTICS
// ══════════════════════════════════════════════

function DiagnosticsTab() {
    const memTotal = window.performance?.memory?.totalJSHeapSize;
    const memUsed = window.performance?.memory?.usedJSHeapSize;
    const mb = (bytes) => bytes ? (bytes / 1024 / 1024).toFixed(1) + ' MB' : 'N/A';

    const store = useNPCStore.getState();
    const memEvents = store.contacts.reduce((acc, c) => acc + (c.memory?.events?.length || 0), 0);

    return (
        <div style={{ background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <StatBox label="EVENT LISTENERS" value={MarketEventBus._listeners.size} color="#60a5fa" />
                <StatBox label="NPC.js HEAP" value={store.contacts.length} sub={`${memEvents} memory events`} />
                <StatBox label="MEMORY USED" value={mb(memUsed)} sub={`of ${mb(memTotal)}`} color={memUsed > 100000000 ? '#f87171' : '#4ade80'} />
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: NPC EDITOR
// ══════════════════════════════════════════════

function NPCEditorTab() {
    const contacts = useNPCStore(s => s.contacts);
    const [selectedId, setSelectedId] = useState(contacts[0]?.id);
    const c = contacts.find(x => x.id === selectedId);

    const updateRel = (field, val) => {
        useNPCStore.setState(s => {
            const npc = s.contacts.find(x => x.id === selectedId);
            if (npc?.relationship) npc.relationship[field] = val;
        });
    };

    return (
        <div style={{ display: 'flex', gap: 12, background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 12, height: 300 }}>
            <div style={{ width: 150, overflow: 'auto', borderRight: '1px solid #222', paddingRight: 8 }}>
                {contacts.map(npc => (
                    <button key={npc.id} style={{ ...activeBtn(selectedId === npc.id), display: 'block', width: '100%', textAlign: 'left', marginBottom: 4 }} onClick={() => setSelectedId(npc.id)}>
                        {npc.name.split(' ')[0]}
                    </button>
                ))}
            </div>
            <div style={{ flex: 1, paddingLeft: 8 }}>
                {c?.relationship ? (
                    <div>
                        <h3 style={{ color: '#c9a84c', marginTop: 0 }}>{c.name} — Editor</h3>
                        <label style={{ display: 'block', fontSize: 10, color: '#888', marginBottom: 12 }}>
                            Trust ({(c.relationship.trust).toFixed(2)})
                            <input type="range" min="0" max="1" step="0.05" value={c.relationship.trust} onChange={e => updateRel('trust', Number(e.target.value))} style={{ width: '100%' }} />
                        </label>
                        <label style={{ display: 'block', fontSize: 10, color: '#888', marginBottom: 12 }}>
                            Respect ({(c.relationship.respect).toFixed(2)})
                            <input type="range" min="0" max="1" step="0.05" value={c.relationship.respect} onChange={e => updateRel('respect', Number(e.target.value))} style={{ width: '100%' }} />
                        </label>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <label style={{ fontSize: 10, color: '#888' }}><input type="checkbox" checked={c.relationship.holds_grudge} onChange={e => updateRel('holds_grudge', e.target.checked)} /> Holds Grudge</label>
                            <label style={{ fontSize: 10, color: '#888' }}><input type="checkbox" checked={c.relationship.owes_favor} onChange={e => updateRel('owes_favor', e.target.checked)} /> Owes Favor</label>
                        </div>
                    </div>
                ) : <div style={{ color: '#555', fontSize: 10 }}>No relationship data</div>}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// TAB: HAGGLE TESTER
// ══════════════════════════════════════════════

function HaggleTesterTab() {
    const [npcId, setNpcId] = useState(CONTACTS[0]?.id);
    const [workId, setWorkId] = useState(Object.keys(ARTWORK_MAP)[0]);
    const [result, setResult] = useState(null);

    const runTest = () => {
        const hm = new HaggleManager();
        const startState = hm.start('buy', ARTWORK_MAP[workId]); // just simulating init
        // to fully mock we'd need more, but start gives us the opening info:
        setResult(startState);
    };

    return (
        <div style={{ background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <select value={npcId} onChange={e => setNpcId(e.target.value)} style={{ background: '#1a1a24', color: '#ccc', border: '1px solid #333', padding: '4px', fontSize: 10 }}>
                    {CONTACTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={workId} onChange={e => setWorkId(e.target.value)} style={{ background: '#1a1a24', color: '#ccc', border: '1px solid #333', padding: '4px', fontSize: 10, width: 200 }}>
                    {Object.values(ARTWORK_MAP).filter(w => w.tier !== 'masterpiece').slice(0, 50).map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                </select>
                <button style={activeBtn(true)} onClick={runTest}>SIMULATE</button>
            </div>
            {result && (
                <div style={{ fontSize: 10, color: '#aaa', background: '#1a1a24', padding: 8, borderRadius: 4 }}>
                    <div style={{ color: '#c9a84c', marginBottom: 4 }}>Dealer: {result.dealerName} ({result.dealerType})</div>
                    <div>Asking Price: ${result.askingPrice.toLocaleString()}</div>
                    <div>Player Opening: ${result.playerOffer.toLocaleString()}</div>
                    <div style={{ marginTop: 4, fontStyle: 'italic', color: '#888' }}>"{result.openingDialogue}"</div>
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════

export default function EngineOverview() {
    const [tab, setTab] = useState('overview');
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

    const tabs = ['overview', 'diagnostics', 'npc_editor', 'haggle_test'];

    return (
        <div style={{ padding: 16, maxWidth: 900, margin: '0 auto', fontFamily: mono }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ color: '#c9a84c', margin: 0, fontSize: 16, letterSpacing: 1 }}>⚙️ ENGINE DASHBOARD</h2>
                <div style={{ display: 'flex', gap: 4 }}>
                    {tabs.map(t => (
                        <button key={t} style={activeBtn(tab === t)} onClick={() => setTab(t)}>{t.replace('_', ' ')}</button>
                    ))}
                    <button style={miniBtn} onClick={refresh} style={{ marginLeft: 8 }}>🔄 REFRESH</button>
                </div>
            </div>

            {tab === 'overview' && <OverviewTab refreshKey={refreshKey} onRefresh={refresh} />}
            {tab === 'diagnostics' && <DiagnosticsTab />}
            {tab === 'npc_editor' && <NPCEditorTab />}
            {tab === 'haggle_test' && <HaggleTesterTab />}
        </div>
    );
}
