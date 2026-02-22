/**
 * ContentStudio.jsx — The "Director's Chair" CMS
 *
 * A full-screen React overlay for visual content authoring.
 * Three panels: Content Library (left), Timeline (center), Wiring Inspector (right).
 * See: 07_Project/Content_Management_Studio_Spec.md
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useContentStore, CATEGORY_META } from '../stores/contentStore.js';

const mono = '"IBM Plex Mono", "Courier New", monospace';

// ── Styles ──
const panelStyle = {
    background: 'rgba(10, 10, 15, 0.95)',
    border: '1px solid #2a2a3e',
    borderRadius: 4,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
};

const headerStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid #2a2a3e',
    fontSize: 11,
    color: '#c9a84c',
    letterSpacing: 2,
    fontWeight: 'bold',
};

// ════════════════════════════════════════════════════════════════
// Content Library Panel (Left Sidebar)
// ════════════════════════════════════════════════════════════════

function ContentLibrary() {
    const entities = useContentStore(s => s.entities);
    const loaded = useContentStore(s => s.loaded);
    const loading = useContentStore(s => s.loading);
    const error = useContentStore(s => s.error);
    const searchQuery = useContentStore(s => s.searchQuery);
    const selectedCategory = useContentStore(s => s.selectedCategory);
    const selectedEntity = useContentStore(s => s.selectedEntity);
    const { setSearch, setCategory, selectEntity, load, getFiltered, getCounts } = useContentStore.getState();

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => getFiltered(), [entities, searchQuery, selectedCategory]);
    const counts = useMemo(() => getCounts(), [entities]);

    if (loading) {
        return (
            <div style={{ ...panelStyle, flex: 1 }}>
                <div style={headerStyle}>CONTENT LIBRARY</div>
                <div style={{ padding: 20, color: '#555', textAlign: 'center' }}>Loading content...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ ...panelStyle, flex: 1 }}>
                <div style={headerStyle}>CONTENT LIBRARY</div>
                <div style={{ padding: 20, color: '#c94040', textAlign: 'center' }}>{error}</div>
            </div>
        );
    }

    return (
        <div style={{ ...panelStyle, flex: 1 }}>
            <div style={headerStyle}>CONTENT LIBRARY ({entities.length})</div>

            {/* Search */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a2e' }}>
                <input
                    type="text"
                    placeholder="Search entities..."
                    value={searchQuery}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        width: '100%', background: '#0a0a14', border: '1px solid #333',
                        color: '#eaeaea', padding: '8px 10px', fontFamily: mono, fontSize: 12,
                        outline: 'none', boxSizing: 'border-box',
                    }}
                />
            </div>

            {/* Category Tabs */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px',
                borderBottom: '1px solid #1a1a2e',
            }}>
                <button
                    onClick={() => setCategory(null)}
                    style={{
                        background: !selectedCategory ? '#c9a84c' : '#111',
                        color: !selectedCategory ? '#000' : '#888',
                        border: '1px solid #333', padding: '4px 8px',
                        fontSize: 10, cursor: 'pointer', fontFamily: mono,
                    }}
                >ALL</button>
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <button
                        key={key}
                        onClick={() => setCategory(selectedCategory === key ? null : key)}
                        style={{
                            background: selectedCategory === key ? meta.color : '#111',
                            color: selectedCategory === key ? '#000' : meta.color,
                            border: `1px solid ${selectedCategory === key ? meta.color : '#333'}`,
                            padding: '4px 8px', fontSize: 10, cursor: 'pointer', fontFamily: mono,
                        }}
                    >
                        {meta.icon} {counts[key] || 0}
                    </button>
                ))}
            </div>

            {/* Entity List */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding: 20, color: '#444', textAlign: 'center', fontSize: 12 }}>
                        {loaded ? 'No matching entities.' : 'Press LOAD to scan content.'}
                    </div>
                ) : filtered.map(entity => {
                    const meta = CATEGORY_META[entity.category] || {};
                    const isSelected = selectedEntity?.id === entity.id;
                    return (
                        <div
                            key={`${entity.category}-${entity.id}`}
                            onClick={() => selectEntity(entity)}
                            style={{
                                padding: '10px 14px', cursor: 'pointer',
                                borderBottom: '1px solid #1a1a2e',
                                background: isSelected ? 'rgba(201,168,76,0.1)' : 'transparent',
                                borderLeft: isSelected ? '3px solid #c9a84c' : '3px solid transparent',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>{entity.icon || meta.icon}</span>
                                <span style={{ color: isSelected ? '#c9a84c' : '#ddd', fontSize: 13 }}>
                                    {entity.name}
                                </span>
                            </div>
                            <div style={{ fontSize: 10, color: '#555', marginTop: 2, paddingLeft: 24 }}>
                                {entity.subcategory || entity.category}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// Timeline Panel (Center)
// ════════════════════════════════════════════════════════════════

function TimelinePanel() {
    const entities = useContentStore(s => s.entities);
    const calendarEvents = useMemo(
        () => entities.filter(e => e.category === 'calendar').map(e => e.data),
        [entities]
    );

    // Group calendar events by month
    const byMonth = useMemo(() => {
        const grouped = {};
        for (const ev of calendarEvents) {
            const key = ev.month || 'unscheduled';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(ev);
        }
        return grouped;
    }, [calendarEvents]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <div style={{ ...panelStyle, flex: 2 }}>
            <div style={headerStyle}>TIMELINE</div>

            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: 16, WebkitOverflowScrolling: 'touch' }}>
                {calendarEvents.length === 0 ? (
                    <div style={{ color: '#444', textAlign: 'center', padding: 40 }}>
                        <div style={{ fontSize: 24, marginBottom: 12 }}>📅</div>
                        <div style={{ fontSize: 12 }}>Calendar events will appear here.</div>
                        <div style={{ fontSize: 10, color: '#333', marginTop: 4 }}>Load content from the library to populate.</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
                        {months.map((month, idx) => {
                            const events = byMonth[idx + 1] || [];
                            return (
                                <div key={idx} style={{
                                    minWidth: 140, background: '#0a0a14', border: '1px solid #1a1a2e',
                                    borderRadius: 4, padding: 10,
                                }}>
                                    <div style={{
                                        fontSize: 11, color: '#c9a84c', fontWeight: 'bold',
                                        marginBottom: 8, textAlign: 'center',
                                    }}>{month}</div>
                                    {events.length === 0 ? (
                                        <div style={{ color: '#333', fontSize: 10, textAlign: 'center' }}>—</div>
                                    ) : events.map(ev => (
                                        <div
                                            key={ev.id}
                                            style={{
                                                padding: '6px 8px', marginBottom: 4,
                                                background: '#111', border: '1px solid #2a2a3e',
                                                borderRadius: 2, cursor: 'pointer', fontSize: 10,
                                            }}
                                            onClick={() => useContentStore.getState().selectEntity(
                                                useContentStore.getState().entities.find(e => e.id === ev.id)
                                            )}
                                        >
                                            <div style={{ color: getEventColor(ev.type), fontWeight: 'bold' }}>
                                                {ev.name}
                                            </div>
                                            <div style={{ color: '#555', marginTop: 2 }}>
                                                {ev.location} · {ev.tier}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function getEventColor(type) {
    const colors = {
        ART_FAIR: '#44bbff', AUCTION: '#c9a84c', BIENNALE: '#aa66cc',
        SOCIAL: '#88dd88', OPENING: '#ff9999',
    };
    return colors[type] || '#888';
}

// ════════════════════════════════════════════════════════════════
// Wiring Inspector Panel (Right Sidebar)
// ════════════════════════════════════════════════════════════════

function WiringInspector() {
    const selectedEntity = useContentStore(s => s.selectedEntity);
    const entities = useContentStore(s => s.entities);

    if (!selectedEntity) {
        return (
            <div style={{ ...panelStyle, flex: 1 }}>
                <div style={headerStyle}>WIRING INSPECTOR</div>
                <div style={{ padding: 20, color: '#444', textAlign: 'center', fontSize: 12 }}>
                    Select an entity to inspect its connections.
                </div>
            </div>
        );
    }

    const meta = CATEGORY_META[selectedEntity.category] || {};
    const data = selectedEntity.data;

    // Find connections based on entity type
    const connections = findConnections(selectedEntity, entities);

    return (
        <div style={{ ...panelStyle, flex: 1 }}>
            <div style={headerStyle}>WIRING INSPECTOR</div>

            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {/* Entity Header */}
                <div style={{
                    padding: '16px 14px', borderBottom: '1px solid #1a1a2e',
                    background: 'rgba(201,168,76,0.05)',
                }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{meta.icon} {selectedEntity.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                        {selectedEntity.category.toUpperCase()} · {selectedEntity.id}
                    </div>
                </div>

                {/* Connections */}
                {connections.length > 0 && (
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1a2e' }}>
                        <div style={{ fontSize: 11, color: '#c9a84c', marginBottom: 8 }}>CONNECTIONS ({connections.length})</div>
                        {connections.map((conn, idx) => (
                            <div
                                key={idx}
                                onClick={() => conn.entity && useContentStore.getState().selectEntity(conn.entity)}
                                style={{
                                    padding: '6px 10px', marginBottom: 4,
                                    background: '#0a0a14', border: '1px solid #1a1a2e',
                                    borderRadius: 2, cursor: conn.entity ? 'pointer' : 'default',
                                    fontSize: 11,
                                }}
                            >
                                <span style={{ color: '#888' }}>{conn.type}: </span>
                                <span style={{ color: conn.entity ? '#c9a84c' : '#555' }}>{conn.label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Raw JSON */}
                <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: '#c9a84c', marginBottom: 8 }}>RAW DATA</div>
                    <pre style={{
                        background: '#0a0a14', border: '1px solid #1a1a2e',
                        padding: 12, fontSize: 10, color: '#4ade80',
                        overflowX: 'auto', overflowY: 'auto',
                        maxHeight: 400, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        margin: 0,
                    }}>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
}

/** Find connections between entities */
function findConnections(entity, allEntities) {
    const connections = [];
    const data = entity.data;

    if (entity.category === 'venue') {
        // Venue → rooms → characters
        for (const room of (data.rooms || [])) {
            for (const char of (room.characters || [])) {
                const npc = allEntities.find(e => e.category === 'npc' && e.id === char.id);
                connections.push({
                    type: `Room: ${room.name}`,
                    label: char.id,
                    entity: npc || null,
                });
            }
        }
    }

    if (entity.category === 'calendar') {
        // Calendar event → NPC presence
        for (const npcId of (data.npcPresence || [])) {
            const npc = allEntities.find(e => e.category === 'npc' && e.id === npcId);
            connections.push({
                type: 'NPC Present',
                label: npc?.name || npcId,
                entity: npc || null,
            });
        }
    }

    if (entity.category === 'event') {
        // Event → steps with speakers
        const speakers = new Set();
        for (const step of (data.steps || [])) {
            if (step.speakerName && step.speakerName !== 'narrator') {
                speakers.add(step.speakerName);
            }
        }
        for (const speaker of speakers) {
            const npc = allEntities.find(e => e.category === 'npc' && e.name === speaker);
            connections.push({
                type: 'Speaker',
                label: speaker,
                entity: npc || null,
            });
        }
    }

    if (entity.category === 'npc') {
        // NPC → events where they appear, venues where they're stationed
        for (const other of allEntities) {
            if (other.category === 'calendar' && other.data.npcPresence?.includes(entity.id)) {
                connections.push({
                    type: 'Attends',
                    label: other.name,
                    entity: other,
                });
            }
            if (other.category === 'venue') {
                for (const room of (other.data.rooms || [])) {
                    if (room.characters?.some(c => c.id === entity.id)) {
                        connections.push({
                            type: `Located in`,
                            label: `${other.name} → ${room.name}`,
                            entity: other,
                        });
                    }
                }
            }
        }
    }

    if (entity.category === 'artwork') {
        // Artwork → artist
        const artist = allEntities.find(e => e.category === 'artist' && e.name === data.artist);
        if (artist) {
            connections.push({ type: 'Artist', label: artist.name, entity: artist });
        }
    }

    if (entity.category === 'artist') {
        // Artist → artworks
        for (const other of allEntities) {
            if (other.category === 'artwork' && other.data.artist === entity.name) {
                connections.push({ type: 'Artwork', label: other.name, entity: other });
            }
        }
    }

    return connections;
}

// ════════════════════════════════════════════════════════════════
// Flow Map Panel
// ════════════════════════════════════════════════════════════════

const FLOW_NODES = [
    // Boot flow
    { id: 'boot', label: 'BOOT', x: 60, y: 40, color: '#c94040', group: 'system' },
    { id: 'profile_menu', label: 'PROFILE MENU', x: 60, y: 100, color: '#c94040', group: 'system' },
    { id: 'profile_create', label: 'CREATE PROFILE', x: 180, y: 70, color: '#c94040', group: 'system' },
    { id: 'profile_login', label: 'LOGIN', x: 180, y: 130, color: '#c94040', group: 'system' },
    { id: 'primary_menu', label: 'PRIMARY MENU', x: 60, y: 180, color: '#c94040', group: 'system' },
    { id: 'dossier_select', label: 'LOAD SAVE', x: 180, y: 180, color: '#c94040', group: 'system' },
    // Core loop
    { id: 'dashboard', label: 'DASHBOARD', x: 60, y: 280, color: '#c9a84c', group: 'core' },
    { id: 'ego', label: 'EGO DASHBOARD', x: 220, y: 250, color: '#88bbdd', group: 'info' },
    { id: 'market', label: 'BROWSE MARKET', x: 220, y: 310, color: '#3a8a5c', group: 'action' },
    { id: 'collection', label: 'MY COLLECTION', x: 370, y: 310, color: '#3a8a5c', group: 'action' },
    { id: 'phone', label: 'PHONE', x: 370, y: 250, color: '#88bbdd', group: 'info' },
    { id: 'venue', label: 'VISIT VENUE', x: 220, y: 380, color: '#3a8a5c', group: 'action' },
    { id: 'travel', label: 'TRAVEL', x: 370, y: 380, color: '#3a8a5c', group: 'action' },
    { id: 'journal', label: 'JOURNAL', x: 500, y: 250, color: '#88bbdd', group: 'info' },
    { id: 'market_intel', label: 'MARKET INTEL', x: 500, y: 310, color: '#88bbdd', group: 'info' },
    { id: 'inventory', label: 'INVENTORY', x: 500, y: 380, color: '#88bbdd', group: 'info' },
    // Venue sub-flow
    { id: 'venue_detail', label: 'VENUE DETAIL', x: 220, y: 450, color: '#3a8a5c', group: 'action' },
    { id: 'room', label: 'ROOM', x: 370, y: 450, color: '#3a8a5c', group: 'action' },
    { id: 'npc_talk', label: 'NPC TALK', x: 500, y: 450, color: '#3a8a5c', group: 'action' },
    // Week flow
    { id: 'week_transition', label: 'WEEK TRANSITION', x: 60, y: 380, color: '#c9a84c', group: 'core' },
    { id: 'week_report', label: 'WEEK REPORT', x: 60, y: 450, color: '#c9a84c', group: 'core' },
    // System
    { id: 'settings', label: 'SETTINGS', x: 60, y: 530, color: '#c94040', group: 'system' },
    { id: 'admin', label: 'ADMIN', x: 180, y: 530, color: '#c94040', group: 'system' },
    { id: 'cms', label: 'CMS', x: 300, y: 530, color: '#c94040', group: 'system' },
    // Scenes
    { id: 'haggle', label: 'HAGGLE', x: 420, y: 530, color: '#aa66cc', group: 'scene' },
    { id: 'world', label: 'WORLD MAP', x: 540, y: 530, color: '#aa66cc', group: 'scene' },
];

const FLOW_EDGES = [
    ['boot', 'profile_menu'],
    ['profile_menu', 'profile_create'],
    ['profile_menu', 'profile_login'],
    ['profile_menu', 'primary_menu'],
    ['profile_create', 'primary_menu'],
    ['profile_login', 'primary_menu'],
    ['primary_menu', 'dashboard'],
    ['primary_menu', 'dossier_select'],
    ['dossier_select', 'dashboard'],
    ['dashboard', 'ego'],
    ['dashboard', 'market'],
    ['dashboard', 'collection'],
    ['dashboard', 'phone'],
    ['dashboard', 'venue'],
    ['dashboard', 'travel'],
    ['dashboard', 'journal'],
    ['dashboard', 'market_intel'],
    ['dashboard', 'inventory'],
    ['dashboard', 'week_transition'],
    ['dashboard', 'settings'],
    ['dashboard', 'admin'],
    ['week_transition', 'week_report'],
    ['week_report', 'dashboard'],
    ['venue', 'venue_detail'],
    ['venue_detail', 'room'],
    ['room', 'npc_talk'],
    ['market', 'haggle'],
    ['dashboard', 'world'],
    ['admin', 'cms'],
];

function FlowMapPanel() {
    const svgW = 640;
    const svgH = 580;
    const nodeW = 110;
    const nodeH = 28;

    return (
        <div style={{ ...panelStyle, flex: 1 }}>
            <div style={headerStyle}>FLOW MAP</div>
            <div className="fm-container">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: '100%', minHeight: 500 }}>
                    <defs>
                        <marker id="fm-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="#2a2a3e" />
                        </marker>
                    </defs>

                    {/* Edges */}
                    {FLOW_EDGES.map(([fromId, toId], i) => {
                        const from = FLOW_NODES.find(n => n.id === fromId);
                        const to = FLOW_NODES.find(n => n.id === toId);
                        if (!from || !to) return null;
                        const x1 = from.x + nodeW / 2;
                        const y1 = from.y + nodeH / 2;
                        const x2 = to.x + nodeW / 2;
                        const y2 = to.y + nodeH / 2;
                        return <line key={i} className="fm-edge" x1={x1} y1={y1} x2={x2} y2={y2} />;
                    })}

                    {/* Nodes */}
                    {FLOW_NODES.map(node => (
                        <g key={node.id} className="fm-node" transform={`translate(${node.x},${node.y})`}>
                            <rect
                                width={nodeW} height={nodeH} rx={4}
                                fill={node.color + '22'}
                                stroke={node.color}
                                strokeWidth={1.5}
                            />
                            <text x={nodeW / 2} y={nodeH / 2 + 3} textAnchor="middle"
                                style={{ fontSize: 8, fill: '#eaeaea' }}>
                                {node.label}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// Main CMS Component
// ════════════════════════════════════════════════════════════════

export default function ContentStudio({ onClose }) {
    const [visible, setVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('content');

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const tabStyle = (isActive) => ({
        background: isActive ? '#c9a84c' : 'none',
        color: isActive ? '#000' : '#888',
        border: isActive ? '1px solid #c9a84c' : '1px solid #444',
        padding: '6px 14px', cursor: 'pointer', fontFamily: mono, fontSize: 11,
        fontWeight: isActive ? 'bold' : 'normal',
    });

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(5, 5, 8, 0.98)',
            fontFamily: mono, color: '#eaeaea',
            display: 'flex', flexDirection: 'column',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.3s ease',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px', borderBottom: '1px solid #2a2a3e',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ color: '#c9a84c', fontSize: 16, fontWeight: 'bold', letterSpacing: 3 }}>
                        CONTENT STUDIO
                    </span>
                    <span style={{ color: '#555', fontSize: 11 }}>
                        The Director's Chair
                    </span>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                        <button onClick={() => setActiveTab('content')} style={tabStyle(activeTab === 'content')}>CONTENT</button>
                        <button onClick={() => setActiveTab('flowmap')} style={tabStyle(activeTab === 'flowmap')}>FLOW MAP</button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: '1px solid #444', color: '#888',
                            padding: '6px 16px', cursor: 'pointer', fontFamily: mono, fontSize: 12,
                        }}
                    >[ ESC ] CLOSE</button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'content' && (
                <div style={{
                    flex: 1, display: 'flex', gap: 1, overflow: 'hidden',
                    padding: '8px',
                }}>
                    <div style={{ width: '25%', minWidth: 220, display: 'flex', flexDirection: 'column' }}>
                        <ContentLibrary />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '0 8px' }}>
                        <TimelinePanel />
                    </div>
                    <div style={{ width: '30%', minWidth: 280, display: 'flex', flexDirection: 'column' }}>
                        <WiringInspector />
                    </div>
                </div>
            )}

            {activeTab === 'flowmap' && (
                <div style={{ flex: 1, padding: '8px', overflow: 'hidden' }}>
                    <FlowMapPanel />
                </div>
            )}
        </div>
    );
}
