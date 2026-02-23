/**
 * EngineOverview.jsx — Three-Engine Dashboard & Simulation Control
 *
 * CMS tab for visualizing the interconnected engine architecture:
 *   - Node-based flow diagram showing Event → Market → NPC → Negotiation
 *   - Event test panel (fire events, watch cascading effects)
 *   - Simulation runner (multi-week fast forward with live stats)
 *   - NPC relationship inspector (trust/memory/grudge state per NPC)
 *   - Active effects monitor (decaying price events)
 *
 * Registered in MasterCMS as the "Engines" tab.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MarketEventBus, EVENT_IMPACTS } from '../../managers/MarketEventBus.js';
import { MarketManager } from '../../managers/MarketManager.js';
import { MarketSimulator } from '../../managers/MarketSimulator.js';
import { useNPCStore } from '../../stores/npcStore.js';
import { useMarketStore } from '../../stores/marketStore.js';
import { GameState } from '../../managers/GameState.js';
import { ARTISTS } from '../../data/artists.js';
import { CONTACTS } from '../../data/contacts.js';

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
const dangerBtn = {
    ...miniBtn,
    borderColor: '#c94040',
    color: '#c94040',
};
const successBtn = {
    ...miniBtn,
    borderColor: '#4caf50',
    color: '#4caf50',
};

// ══════════════════════════════════════════════
// NODE GRAPH — Visual engine interconnection
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
    const w = 580, h = 160;

    return (
        <div style={{ background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 6 }}>ENGINE ARCHITECTURE</div>
            <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxHeight: 160 }}>
                {/* Edges */}
                {edges.map((edge, i) => {
                    const from = getNode(edge.from);
                    const to = getNode(edge.to);
                    if (!from || !to) return null;
                    const pulse = activeEffects.length > 0 && (edge.from === 'events' || edge.from === 'market');
                    return (
                        <g key={i}>
                            <line
                                x1={from.x + 60} y1={from.y + 16} x2={to.x} y2={to.y + 16}
                                stroke={pulse ? '#c9a84c' : '#333'}
                                strokeWidth={pulse ? 1.5 : 0.8}
                                strokeDasharray={pulse ? '' : '4'}
                                opacity={pulse ? 0.9 : 0.4}
                            />
                            <text
                                x={(from.x + 60 + to.x) / 2}
                                y={(from.y + to.y) / 2 + 10}
                                fill="#444" fontSize="7" textAnchor="middle"
                            >{edge.label}</text>
                        </g>
                    );
                })}
                {/* Nodes */}
                {nodes.map(node => (
                    <g key={node.id}>
                        <rect
                            x={node.x} y={node.y} width={120} height={35} rx={4}
                            fill="rgba(255,255,255,0.03)"
                            stroke={node.color} strokeWidth={1}
                        />
                        <text x={node.x + 60} y={node.y + 16} fill={node.color}
                            fontSize="10" fontFamily={mono} textAnchor="middle" fontWeight="600">
                            {node.label}
                        </text>
                        <text x={node.x + 60} y={node.y + 28} fill="#666"
                            fontSize="7" fontFamily={mono} textAnchor="middle">
                            {node.sub}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

// ══════════════════════════════════════════════
// EVENT FIRE PANEL — Test event emission
// ══════════════════════════════════════════════

function EventFirePanel({ onEventFired }) {
    const [selectedEvent, setSelectedEvent] = useState('artist_death');
    const [selectedArtist, setSelectedArtist] = useState(ARTISTS[0]?.id || '');
    const [selectedNpc, setSelectedNpc] = useState(CONTACTS[0]?.id || '');
    const [lastFired, setLastFired] = useState(null);

    const marketEvents = ['artist_death', 'scandal', 'museum_acquisition', 'auction_record',
        'recession_start', 'recession_end', 'bubble_pop', 'fair_success', 'gallery_closure'];
    const playerEvents = ['player_lowballed', 'player_flipped', 'player_honored_deal', 'player_tipped_off'];

    const needsArtist = ['artist_death', 'scandal', 'museum_acquisition', 'auction_record'].includes(selectedEvent);
    const needsNpc = ['scandal', 'gallery_closure', 'player_lowballed', 'player_flipped',
        'player_honored_deal', 'player_tipped_off'].includes(selectedEvent);

    const fireEvent = () => {
        const week = GameState.state?.week || 1;
        const payload = { week };
        if (needsArtist) payload.artistId = selectedArtist;
        if (needsNpc) payload.npcId = selectedNpc;
        if (selectedEvent === 'player_lowballed') {
            payload.amount = 5000;
            payload.askingPrice = 15000;
        }
        if (selectedEvent === 'player_flipped') {
            payload.profit = 8000;
            payload.weeksHeld = 2;
        }
        if (selectedEvent === 'recession_start' || selectedEvent === 'bubble_pop') {
            payload.severity = 0.7;
        }

        MarketEventBus.emit(selectedEvent, payload, week);

        // Also record interaction in NPC memory if applicable
        if (needsNpc && payload.npcId) {
            try {
                const impact = EVENT_IMPACTS[selectedEvent] || {};
                useNPCStore.getState().recordInteraction(payload.npcId, selectedEvent, {
                    ...impact, ...payload,
                }, impact.significance, week);
            } catch { /* non-critical */ }
        }

        setLastFired({ type: selectedEvent, ...payload, ts: Date.now() });
        if (onEventFired) onEventFired();
    };

    const impact = EVENT_IMPACTS[selectedEvent] || {};

    return (
        <div style={{ background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 8 }}>FIRE TEST EVENT</div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Event selector */}
                <div style={{ flex: '1 1 200px' }}>
                    <div style={{ fontSize: 8, color: '#555', marginBottom: 3 }}>MARKET EVENTS</div>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
                        {marketEvents.map(e => (
                            <button key={e} style={activeBtn(selectedEvent === e)}
                                onClick={() => setSelectedEvent(e)}>
                                {e.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 8, color: '#555', marginBottom: 3 }}>PLAYER EVENTS</div>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {playerEvents.map(e => (
                            <button key={e} style={activeBtn(selectedEvent === e)}
                                onClick={() => setSelectedEvent(e)}>
                                {e.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Parameters */}
                <div style={{ flex: '0 0 180px' }}>
                    {needsArtist && (
                        <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 8, color: '#555', marginBottom: 2 }}>ARTIST</div>
                            <select value={selectedArtist} onChange={e => setSelectedArtist(e.target.value)}
                                style={{
                                    background: '#1a1a24', color: '#ccc', border: '1px solid #333',
                                    borderRadius: 3, padding: '3px 6px', fontSize: 10, fontFamily: mono, width: '100%'
                                }}>
                                {ARTISTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    )}
                    {needsNpc && (
                        <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 8, color: '#555', marginBottom: 2 }}>NPC</div>
                            <select value={selectedNpc} onChange={e => setSelectedNpc(e.target.value)}
                                style={{
                                    background: '#1a1a24', color: '#ccc', border: '1px solid #333',
                                    borderRadius: 3, padding: '3px 6px', fontSize: 10, fontFamily: mono, width: '100%'
                                }}>
                                {CONTACTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    <button style={dangerBtn} onClick={fireEvent}>
                        🔥 FIRE EVENT
                    </button>
                </div>
            </div>

            {/* Impact preview */}
            <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {impact.priceMultiplier && (
                    <div style={{ fontSize: 9, color: impact.priceMultiplier > 1 ? '#4ade80' : '#f87171' }}>
                        Price: {impact.priceMultiplier > 1 ? '+' : ''}{((impact.priceMultiplier - 1) * 100).toFixed(0)}%
                        <span style={{ color: '#555' }}> ({impact.decayWeeks}wk decay)</span>
                    </div>
                )}
                {impact.trustDelta !== undefined && impact.trustDelta !== 0 && (
                    <div style={{ fontSize: 9, color: impact.trustDelta > 0 ? '#4ade80' : '#f87171' }}>
                        Trust: {impact.trustDelta > 0 ? '+' : ''}{(impact.trustDelta * 100).toFixed(0)}%
                    </div>
                )}
                {impact.respectDelta !== undefined && impact.respectDelta !== 0 && (
                    <div style={{ fontSize: 9, color: impact.respectDelta > 0 ? '#4ade80' : '#f87171' }}>
                        Respect: {impact.respectDelta > 0 ? '+' : ''}{(impact.respectDelta * 100).toFixed(0)}%
                    </div>
                )}
                {impact.grudgeProbability && (
                    <div style={{ fontSize: 9, color: '#f87171' }}>
                        Grudge: {(impact.grudgeProbability * 100).toFixed(0)}% chance
                    </div>
                )}
            </div>

            {/* Last fired result */}
            {lastFired && (
                <div style={{
                    marginTop: 6, fontSize: 9, color: '#c9a84c', padding: '4px 8px',
                    background: 'rgba(201,168,76,0.08)', borderRadius: 3, border: '1px solid rgba(201,168,76,0.15)'
                }}>
                    ✅ Fired: <strong>{lastFired.type}</strong>
                    {lastFired.artistId && <span> → {ARTISTS.find(a => a.id === lastFired.artistId)?.name}</span>}
                    {lastFired.npcId && <span> → {CONTACTS.find(c => c.id === lastFired.npcId)?.name}</span>}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════
// ACTIVE EFFECTS MONITOR
// ══════════════════════════════════════════════

function ActiveEffectsPanel({ effects }) {
    if (!effects.length) {
        return (
            <div style={{ background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: '#555', letterSpacing: 1 }}>ACTIVE PRICE EFFECTS</div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 6, fontStyle: 'italic' }}>
                    No active effects. Fire an event above to create one.
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 6 }}>
                ACTIVE PRICE EFFECTS ({effects.length})
            </div>
            {effects.map((eff, i) => {
                const decayPct = (eff.remaining / (EVENT_IMPACTS[eff.type]?.decayWeeks || 1) * 100).toFixed(0);
                const isPositive = eff.multiplier > 1;
                return (
                    <div key={i} style={{
                        display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0',
                        borderBottom: '1px solid #1a1a24', fontSize: 10
                    }}>
                        <span style={{ color: isPositive ? '#4ade80' : '#f87171', fontWeight: 600, width: 50 }}>
                            {isPositive ? '+' : ''}{((eff.multiplier - 1) * 100).toFixed(0)}%
                        </span>
                        <span style={{ color: '#c9a84c', flex: 1 }}>
                            {eff.type.replace(/_/g, ' ')}
                            {eff.artistId && <span style={{ color: '#888' }}> → {ARTISTS.find(a => a.id === eff.artistId)?.name || eff.artistId}</span>}
                        </span>
                        {/* Decay bar */}
                        <div style={{ width: 60, height: 6, background: '#1a1a24', borderRadius: 3 }}>
                            <div style={{
                                width: `${decayPct}%`, height: '100%', borderRadius: 3,
                                background: isPositive ? '#4ade80' : '#f87171',
                                transition: 'width 0.3s ease',
                            }} />
                        </div>
                        <span style={{ color: '#555', width: 30, fontSize: 8 }}>{eff.remaining}wk</span>
                    </div>
                );
            })}
        </div>
    );
}

// ══════════════════════════════════════════════
// SIMULATION RUNNER — Multi-week fast forward
// ══════════════════════════════════════════════

function SimulationRunner({ onRun }) {
    const [weeks, setWeeks] = useState(4);
    const [running, setRunning] = useState(false);
    const [log, setLog] = useState([]);

    const runSimulation = useCallback(async () => {
        setRunning(true);
        setLog([]);
        const results = [];
        for (let w = 0; w < weeks; w++) {
            const startWeek = GameState.state?.week || 1;
            try {
                MarketManager.simulate();
                const report = MarketSimulator.getWeeklyReport();
                results.push({
                    week: startWeek,
                    trades: report?.tradesExecuted || 0,
                    volume: report?.totalVolume || 0,
                    activeEffects: MarketEventBus.getActiveEffects().length,
                });
            } catch (err) {
                results.push({ week: startWeek, error: err.message });
            }
        }
        setLog(results);
        setRunning(false);
        if (onRun) onRun();
    }, [weeks, onRun]);

    return (
        <div style={{ background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 6 }}>SIMULATION RUNNER</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 9, color: '#888' }}>Run</span>
                <input type="number" min={1} max={52} value={weeks}
                    onChange={e => setWeeks(Number(e.target.value))}
                    style={{
                        background: '#1a1a24', color: '#ccc', border: '1px solid #333',
                        borderRadius: 3, padding: '3px 6px', fontSize: 11, fontFamily: mono, width: 50
                    }}
                />
                <span style={{ fontSize: 9, color: '#888' }}>weeks of simulation</span>
                <button style={successBtn} onClick={runSimulation} disabled={running}>
                    {running ? '⏳ Running...' : '▶️ RUN'}
                </button>
                <button style={dangerBtn} onClick={() => { MarketEventBus.reset(); if (onRun) onRun(); }}>
                    🗑️ RESET EFFECTS
                </button>
            </div>
            {log.length > 0 && (
                <div style={{ maxHeight: 150, overflow: 'auto' }}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: '50px 60px 80px 60px', gap: 4,
                        fontSize: 9, color: '#555', borderBottom: '1px solid #222', paddingBottom: 2, marginBottom: 2
                    }}>
                        <span>WEEK</span><span>TRADES</span><span>VOLUME</span><span>EFFECTS</span>
                    </div>
                    {log.map((r, i) => (
                        <div key={i} style={{
                            display: 'grid', gridTemplateColumns: '50px 60px 80px 60px', gap: 4,
                            fontSize: 10, color: r.error ? '#f87171' : '#ccc', padding: '1px 0'
                        }}>
                            <span>W{r.week}</span>
                            <span>{r.error ? '—' : r.trades}</span>
                            <span>{r.error ? r.error : `$${(r.volume / 1000).toFixed(0)}K`}</span>
                            <span>{r.error ? '' : r.activeEffects}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════
// NPC RELATIONSHIP INSPECTOR
// ══════════════════════════════════════════════

function NPCInspector() {
    const contacts = useNPCStore(s => s.contacts);
    const [selectedNpc, setSelectedNpc] = useState(null);
    const selected = selectedNpc ? contacts.find(c => c.id === selectedNpc) : null;
    const rel = selected?.relationship || {};
    const memory = selected?.memory || {};

    // Trust bar helper
    const TrustBar = ({ label, value, max = 1, color }) => (
        <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#666' }}>
                <span>{label}</span>
                <span>{typeof value === 'number' ? (value * 100).toFixed(0) + '%' : String(value)}</span>
            </div>
            {typeof value === 'number' && (
                <div style={{ width: '100%', height: 4, background: '#1a1a24', borderRadius: 2, marginTop: 1 }}>
                    <div style={{
                        width: `${(value / max) * 100}%`, height: '100%', borderRadius: 2,
                        background: color || '#c9a84c', transition: 'width 0.3s ease'
                    }} />
                </div>
            )}
        </div>
    );

    return (
        <div style={{ background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 6 }}>NPC RELATIONSHIP INSPECTOR</div>

            {/* NPC list */}
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8 }}>
                {contacts.filter(c => c.met || c.relationship).slice(0, 16).map(c => {
                    const r = c.relationship || {};
                    const color = r.holds_grudge ? '#f87171' : r.trust > 0.7 ? '#4ade80' : '#888';
                    return (
                        <button key={c.id} style={{
                            ...miniBtn,
                            borderColor: selectedNpc === c.id ? color : '#333',
                            color: selectedNpc === c.id ? color : '#666',
                            background: selectedNpc === c.id ? `${color}15` : 'transparent',
                            fontSize: 8,
                        }} onClick={() => setSelectedNpc(c.id)}>
                            {c.emoji || '👤'} {c.name?.split(' ')[0]}
                        </button>
                    );
                })}
            </div>

            {/* Detail */}
            {selected && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* Left: Relationship axes */}
                    <div>
                        <div style={{ fontSize: 9, color: '#c9a84c', marginBottom: 6, fontWeight: 600 }}>
                            {selected.name} — {selected.role}
                        </div>
                        <TrustBar label="TRUST" value={rel.trust || 0.5} color={rel.trust > 0.6 ? '#4ade80' : rel.trust < 0.3 ? '#f87171' : '#c9a84c'} />
                        <TrustBar label="RESPECT" value={rel.respect || 0.5} color="#60a5fa" />
                        <TrustBar label="GRUDGE" value={rel.grudge_severity || 0} color="#f87171" />
                        <div style={{ fontSize: 9, marginTop: 4, display: 'flex', gap: 8 }}>
                            <span style={{ color: rel.holds_grudge ? '#f87171' : '#333', fontSize: 10 }}>
                                {rel.holds_grudge ? '😡 GRUDGE' : '—'}
                            </span>
                            <span style={{ color: rel.owes_favor ? '#4ade80' : '#333', fontSize: 10 }}>
                                {rel.owes_favor ? '🤝 OWES FAVOR' : '—'}
                            </span>
                        </div>
                        <div style={{ fontSize: 8, color: '#555', marginTop: 4 }}>
                            Interactions: {rel.interaction_count || 0} | Favor: {selected.favor || 0}
                        </div>
                        <div style={{ fontSize: 8, color: '#555' }}>
                            Temperament: {selected.behavior?.temperament || 'neutral'}
                        </div>
                    </div>

                    {/* Right: Memory events */}
                    <div>
                        <div style={{ fontSize: 8, color: '#555', marginBottom: 4 }}>
                            MEMORY ({(memory.events || []).length} events)
                        </div>
                        <div style={{ maxHeight: 140, overflow: 'auto' }}>
                            {(memory.events || [])
                                .sort((a, b) => b.significance - a.significance)
                                .slice(0, 12)
                                .map((ev, i) => (
                                    <div key={i} style={{
                                        display: 'flex', gap: 4, padding: '2px 0',
                                        borderBottom: '1px solid #1a1a24', fontSize: 9
                                    }}>
                                        <span style={{ color: '#c9a84c', width: 30 }}>
                                            {(ev.significance * 100).toFixed(0)}%
                                        </span>
                                        <span style={{
                                            color: ev.type.includes('grudge') || ev.type.includes('lowball') ? '#f87171' :
                                                ev.type.includes('favor') || ev.type.includes('honored') ? '#4ade80' : '#888', flex: 1
                                        }}>
                                            {ev.type.replace(/_/g, ' ')}
                                        </span>
                                        <span style={{ color: '#555' }}>W{ev.week || '?'}</span>
                                    </div>
                                ))}
                            {(!memory.events || memory.events.length === 0) && (
                                <div style={{ fontSize: 9, color: '#444', fontStyle: 'italic' }}>No memories yet</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════
// EVENT LOG
// ══════════════════════════════════════════════

function EventLogPanel({ events }) {
    if (!events.length) return null;
    return (
        <div style={{ background: '#0d0d12', border: '1px solid #222', borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 6 }}>
                EVENT LOG ({events.length})
            </div>
            <div style={{ maxHeight: 150, overflow: 'auto' }}>
                {events.slice(-20).reverse().map((ev, i) => (
                    <div key={i} style={{
                        display: 'flex', gap: 6, padding: '2px 0',
                        borderBottom: '1px solid #1a1a24', fontSize: 9
                    }}>
                        <span style={{ color: '#555', width: 30 }}>W{ev.week}</span>
                        <span style={{ color: '#c9a84c', fontWeight: 600 }}>
                            {ev.type.replace(/_/g, ' ')}
                        </span>
                        <span style={{ color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.impact?.description || ''}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════

export default function EngineOverview() {
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

    const activeEffects = useMemo(() => MarketEventBus.getActiveEffects(), [refreshKey]);
    const eventLog = useMemo(() => MarketEventBus.getEventLog(), [refreshKey]);

    return (
        <div style={{ padding: 16, maxWidth: 900, margin: '0 auto', fontFamily: mono }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                    <h2 style={{ color: '#c9a84c', margin: 0, fontSize: 16, letterSpacing: 1 }}>
                        ⚙️ ENGINE OVERVIEW
                    </h2>
                    <div style={{ fontSize: 10, color: '#555' }}>
                        Three-engine architecture: Event → Market → NPC → Negotiation
                    </div>
                </div>
                <button style={miniBtn} onClick={refresh}>🔄 REFRESH</button>
            </div>

            <EngineFlowGraph activeEffects={activeEffects} eventLog={eventLog} />
            <EventFirePanel onEventFired={refresh} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ActiveEffectsPanel effects={activeEffects} />
                <EventLogPanel events={eventLog} />
            </div>
            <SimulationRunner onRun={refresh} />
            <NPCInspector />
        </div>
    );
}
