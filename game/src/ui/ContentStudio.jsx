/**
 * ContentStudio.jsx — The "Director's Chair" CMS
 *
 * A full-screen React overlay for visual content authoring.
 * Three panels: Content Library (left), Timeline (center), Wiring Inspector (right).
 * See: 07_Project/Content_Management_Studio_Spec.md
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useContentStore, CATEGORY_META } from '../stores/contentStore.js';
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { VIEW, OVERLAY } from '../constants/views.js';

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
// Flow Map Panel — @xyflow/react interactive node graph
// ════════════════════════════════════════════════════════════════

// Group colors
const GC = {
    boot: '#c94040',  // Red — boot/login flow
    core: '#c9a84c',  // Gold — core game loop
    terminal: '#3a8a5c',  // Green — terminal screens (action)
    info: '#88bbdd',  // Blue — info/stat screens
    scene: '#aa66cc',  // Purple — Phaser scenes
    overlay: '#e08050',  // Orange — React overlays
};

// Node style helper
const flowNode = (id, label, x, y, color, group) => ({
    id,
    data: { label, color, group },
    position: { x, y },
    type: 'default',
    style: {
        background: color + '22',
        border: `2px solid ${color}`,
        borderRadius: 6,
        color: '#eaeaea',
        fontSize: 10,
        fontFamily: '"IBM Plex Mono", monospace',
        padding: '6px 12px',
        minWidth: 110,
        textAlign: 'center',
    },
});

const flowEdge = (source, target, animated = false) => ({
    id: `${source}-${target}`,
    source,
    target,
    animated,
    style: { stroke: '#3a3a5e' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3a3a5e' },
});

// ── All pages/screens the user can see ──
const INITIAL_NODES = [
    // ── BOOT FLOW (TerminalLogin.jsx steps) ──
    flowNode('boot', 'BOOT\n(Typewriter)', 0, 0, GC.boot, 'boot'),
    flowNode('profile_menu', 'PROFILE MENU', 0, 80, GC.boot, 'boot'),
    flowNode('profile_create', 'CREATE PROFILE', 200, 40, GC.boot, 'boot'),
    flowNode('profile_login', 'LOGIN', 200, 120, GC.boot, 'boot'),
    flowNode('primary_menu', 'PRIMARY MENU\n(New/Load)', 0, 180, GC.boot, 'boot'),
    flowNode('dossier_select', 'DOSSIER SELECT\n(Save Slots)', 200, 200, GC.boot, 'boot'),
    flowNode('confirm', 'CONFIRM\n(Review)', 400, 160, GC.boot, 'boot'),
    flowNode('auth', 'AUTH\n(Authenticating)', 400, 240, GC.boot, 'boot'),

    // ── PHASER INTRO SCENES ──
    flowNode('title_scene', 'TITLE SCENE', 0, 320, GC.scene, 'scene'),
    flowNode('intro_scene', 'INTRO SCENE\n(Cutscene)', 200, 320, GC.scene, 'scene'),
    flowNode('char_select', 'CHARACTER SELECT', 400, 320, GC.scene, 'scene'),

    // ── CORE TERMINAL DASHBOARD ──
    flowNode('dashboard', 'DASHBOARD\n(Main Hub)', 0, 460, GC.core, 'core'),

    // ── MARKET DESK ──
    flowNode('market', 'BROWSE MARKET', -200, 580, GC.terminal, 'terminal'),
    flowNode('inspect', 'INSPECT ARTWORK', -380, 580, GC.terminal, 'terminal'),
    flowNode('collection', 'MY COLLECTION', -200, 660, GC.terminal, 'terminal'),
    flowNode('piece_detail', 'PIECE DETAIL', -380, 660, GC.terminal, 'terminal'),

    // ── OPERATIONS ──
    flowNode('venue_picker', 'VENUE PICKER', 0, 580, GC.terminal, 'terminal'),
    flowNode('venue_detail', 'VENUE DETAIL', 0, 660, GC.terminal, 'terminal'),
    flowNode('room', 'ROOM VIEW', 0, 740, GC.terminal, 'terminal'),
    flowNode('npc_talk', 'NPC DIALOGUE', 170, 740, GC.terminal, 'terminal'),
    flowNode('city', 'TRAVEL / CITY', 200, 580, GC.terminal, 'terminal'),
    flowNode('news', 'MARKET INTEL', 200, 660, GC.terminal, 'terminal'),

    // ── DOSSIER ──
    flowNode('phone', 'PHONE\n(NPC Contacts)', 400, 460, GC.info, 'info'),
    flowNode('contact_detail', 'CONTACT DETAIL', 580, 460, GC.info, 'info'),
    flowNode('ego', 'EGO DASHBOARD\n(Stats)', 400, 540, GC.info, 'info'),
    flowNode('journal', 'JOURNAL', 400, 620, GC.info, 'info'),
    flowNode('legacy_end', 'LEGACY / RETIRE', 580, 620, GC.info, 'info'),

    // ── WEEK CYCLE ──
    flowNode('calendar_event', 'CALENDAR EVENT\n(Attend)', -200, 460, GC.core, 'core'),
    flowNode('week_advance', 'ADVANCE WEEK', -200, 380, GC.core, 'core'),
    flowNode('week_report', 'WEEK REPORT', -380, 380, GC.core, 'core'),

    // ── PHASER SCENES ──
    flowNode('haggle', 'HAGGLE SCENE\n(Art Battle)', 600, 720, GC.scene, 'scene'),
    flowNode('world', 'WORLD SCENE\n(Pokemon Walk)', 400, 720, GC.scene, 'scene'),
    flowNode('location', 'LOCATION SCENE', 200, 820, GC.scene, 'scene'),
    flowNode('dialogue_scene', 'DIALOGUE SCENE\n(Visual Novel)', 400, 820, GC.scene, 'scene'),
    flowNode('mac_dialogue', 'MAC DIALOGUE', 600, 820, GC.scene, 'scene'),
    flowNode('overworld', 'OVERWORLD\n(Legacy)', 0, 820, GC.scene, 'scene'),
    flowNode('fast_travel', 'FAST TRAVEL\n(Map)', 200, 720, GC.scene, 'scene'),
    flowNode('end_scene', 'END SCENE\n(Game Over)', 0, 920, GC.scene, 'scene'),
    flowNode('menu_scene', 'MENU SCENE', 200, 920, GC.scene, 'scene'),

    // ── REACT OVERLAYS ──
    flowNode('admin', 'ADMIN DASHBOARD\n(~ key)', 600, 0, GC.overlay, 'overlay'),
    flowNode('settings', 'SETTINGS\n(Overlay)', 600, 80, GC.overlay, 'overlay'),
    flowNode('inventory', 'INVENTORY\n(Overlay)', 780, 0, GC.overlay, 'overlay'),
    flowNode('cms', 'CONTENT STUDIO\n(F1)', 780, 80, GC.overlay, 'overlay'),
    flowNode('player_dash', 'PLAYER DASHBOARD\n(React)', 600, 160, GC.overlay, 'overlay'),

    // ── SAVE/LOAD / SYSTEM ──
    flowNode('save_load', 'SAVE / LOAD', -380, 460, GC.boot, 'boot'),
    flowNode('pause_menu', 'PAUSE MENU', -380, 540, GC.boot, 'boot'),
    flowNode('settings_term', 'SETTINGS\n(Terminal)', -380, 620, GC.boot, 'boot'),

    // ── EVENT SCREENS ──
    flowNode('event_screen', 'EVENT SCREEN', 580, 540, GC.info, 'info'),
    flowNode('event_step', 'EVENT STEP\n(Branching)', 580, 620, GC.info, 'info'),
    flowNode('scene_screen', 'SCENE SCREEN\n(Text)', 780, 540, GC.info, 'info'),
];

const INITIAL_EDGES = [
    // Boot flow
    flowEdge('boot', 'profile_menu'),
    flowEdge('profile_menu', 'profile_create'),
    flowEdge('profile_menu', 'profile_login'),
    flowEdge('profile_menu', 'primary_menu'),
    flowEdge('profile_create', 'primary_menu'),
    flowEdge('profile_login', 'primary_menu'),
    flowEdge('primary_menu', 'dossier_select'),
    flowEdge('dossier_select', 'confirm'),
    flowEdge('confirm', 'auth'),

    // New game → Phaser intro
    flowEdge('primary_menu', 'title_scene', true),
    flowEdge('title_scene', 'intro_scene'),
    flowEdge('intro_scene', 'char_select'),
    flowEdge('char_select', 'dashboard'),

    // Load game → dashboard
    flowEdge('auth', 'dashboard'),

    // Dashboard → Market Desk
    flowEdge('dashboard', 'market'),
    flowEdge('market', 'inspect'),
    flowEdge('dashboard', 'collection'),
    flowEdge('collection', 'piece_detail'),

    // Dashboard → Operations
    flowEdge('dashboard', 'venue_picker'),
    flowEdge('venue_picker', 'venue_detail'),
    flowEdge('venue_detail', 'room'),
    flowEdge('room', 'npc_talk'),
    flowEdge('dashboard', 'city'),
    flowEdge('city', 'news'),

    // Dashboard → Dossier
    flowEdge('dashboard', 'phone'),
    flowEdge('phone', 'contact_detail'),
    flowEdge('dashboard', 'ego'),
    flowEdge('dashboard', 'journal'),
    flowEdge('journal', 'legacy_end'),

    // Dashboard → Week Cycle
    flowEdge('dashboard', 'calendar_event'),
    flowEdge('dashboard', 'week_advance'),
    flowEdge('week_advance', 'week_report'),
    flowEdge('week_report', 'dashboard', true),

    // Dashboard → Scenes
    flowEdge('market', 'haggle', true),
    flowEdge('dashboard', 'world', true),
    flowEdge('dashboard', 'fast_travel', true),
    flowEdge('venue_detail', 'location', true),
    flowEdge('dashboard', 'dialogue_scene', true),
    flowEdge('dialogue_scene', 'mac_dialogue'),
    flowEdge('dashboard', 'overworld', true),
    flowEdge('dashboard', 'end_scene'),

    // Dashboard → System
    flowEdge('dashboard', 'save_load'),
    flowEdge('dashboard', 'pause_menu'),
    flowEdge('pause_menu', 'settings_term'),

    // Dashboard → Events
    flowEdge('dashboard', 'event_screen'),
    flowEdge('event_screen', 'event_step'),
    flowEdge('event_screen', 'scene_screen'),

    // Overlays (global access)
    flowEdge('admin', 'settings'),
    flowEdge('admin', 'cms'),
    flowEdge('admin', 'inventory'),
];

const LEGEND = [
    { color: GC.boot, label: 'Boot / System' },
    { color: GC.core, label: 'Core Loop' },
    { color: GC.terminal, label: 'Terminal Actions' },
    { color: GC.info, label: 'Info Screens' },
    { color: GC.scene, label: 'Phaser Scenes' },
    { color: GC.overlay, label: 'React Overlays' },
];

// ── Node click → navigation mapping ──
const NODE_ACTIONS = {
    // Terminal screens → push onto terminal stack
    dashboard: { type: 'terminal', screen: 'dashboardScreen' },
    market: { type: 'terminal', screen: 'marketScreen' },
    collection: { type: 'terminal', screen: 'portfolioScreen' },
    phone: { type: 'terminal', screen: 'phoneScreen' },
    ego: { type: 'terminal', screen: 'egoDashboardScreen' },
    journal: { type: 'terminal', screen: 'journalScreen' },
    city: { type: 'terminal', screen: 'cityScreen' },
    news: { type: 'terminal', screen: 'newsScreen' },
    pause_menu: { type: 'terminal', screen: 'pauseMenuScreen' },
    save_load: { type: 'terminal', screen: 'saveLoadScreen' },
    settings_term: { type: 'terminal', screen: 'settingsScreen' },
    // Overlays
    admin: { type: 'overlay', key: 'ADMIN' },
    settings: { type: 'overlay', key: 'SETTINGS' },
    inventory: { type: 'overlay', key: 'INVENTORY' },
    cms: { type: 'overlay', key: 'CMS' },
    // Phaser scenes
    world: { type: 'scene', name: 'WorldScene' },
    haggle: { type: 'scene', name: 'HaggleScene' },
    // Boot steps
    boot: { type: 'boot', step: 'BOOT' },
    profile_menu: { type: 'boot', step: 'PROFILE_MENU' },
    primary_menu: { type: 'boot', step: 'PRIMARY_MENU' },
};

function navigateToNode(nodeId, onClose) {
    const action = NODE_ACTIONS[nodeId];
    if (!action) return;

    if (action.type === 'terminal') {
        onClose();
        const ui = window.TerminalUIInstance;
        if (ui) {
            import('../terminal/screens/index.js').then(mod => {
                const screenFn = mod[action.screen];
                if (screenFn) {
                    ui.pushScreen(screenFn(ui));
                    GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.TERMINAL);
                }
            });
        }
    } else if (action.type === 'overlay') {
        onClose();
        GameEventBus.emit(GameEvents.UI_TOGGLE_OVERLAY, action.key);
    } else if (action.type === 'scene') {
        onClose();
        GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, action.name, {});
    } else if (action.type === 'boot') {
        onClose();
        GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.BOOT, { previewStep: action.step });
    }
}

const STORAGE_KEY_POSITIONS = 'artlife_flow_positions';
const STORAGE_KEY_EDGES = 'artlife_flow_edges';
const STORAGE_KEY_NODES = 'artlife_flow_custom_nodes';

const GROUP_TYPES = Object.keys(GC); // ['boot', 'core', 'terminal', 'info', 'scene', 'overlay']

function loadSavedPositions() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_POSITIONS);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

function loadSavedEdges() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_EDGES);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function loadCustomNodes() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_NODES);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function getInitialNodes() {
    const saved = loadSavedPositions();
    const base = INITIAL_NODES.map(n => {
        if (saved[n.id]) {
            return { ...n, position: saved[n.id] };
        }
        return n;
    });
    // Merge custom nodes
    const custom = loadCustomNodes();
    return [...base, ...custom];
}

function getInitialEdges() {
    return loadSavedEdges() || INITIAL_EDGES;
}

// ── Node Properties Panel ──
function NodePropertiesPanel({ node, onUpdate, onDelete, onNavigate }) {
    if (!node) {
        return (
            <div style={{
                width: 260, background: '#0a0a14', borderLeft: '1px solid #2a2a3e',
                padding: 16, fontSize: 11, color: '#555', display: 'flex',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            }}>
                Click a node to inspect
            </div>
        );
    }

    const data = node.data || {};
    const inputStyle = {
        width: '100%', background: '#111', border: '1px solid #333',
        color: '#eaeaea', padding: '6px 8px', fontFamily: mono, fontSize: 11,
        outline: 'none', boxSizing: 'border-box', marginTop: 4,
    };

    return (
        <div style={{
            width: 260, background: '#0a0a14', borderLeft: '1px solid #2a2a3e',
            padding: 12, fontSize: 11, overflowY: 'auto', display: 'flex',
            flexDirection: 'column', gap: 10,
        }}>
            <div style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 }}>
                NODE INSPECTOR
            </div>

            <div>
                <label style={{ color: '#888' }}>ID</label>
                <input value={node.id} readOnly style={{ ...inputStyle, color: '#555' }} />
            </div>

            <div>
                <label style={{ color: '#888' }}>Label</label>
                <input
                    value={data.label || ''}
                    onChange={e => onUpdate(node.id, { label: e.target.value })}
                    style={inputStyle}
                />
            </div>

            <div>
                <label style={{ color: '#888' }}>Type</label>
                <select
                    value={data.group || 'core'}
                    onChange={e => onUpdate(node.id, { group: e.target.value, color: GC[e.target.value] })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                >
                    {GROUP_TYPES.map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>
            </div>

            <div>
                <label style={{ color: '#888' }}>Description</label>
                <textarea
                    value={data.description || ''}
                    onChange={e => onUpdate(node.id, { description: e.target.value })}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
                {NODE_ACTIONS[node.id] && (
                    <button
                        onClick={() => onNavigate(node.id)}
                        style={{
                            flex: 1, background: '#1a3a2a', border: '1px solid #3a8a5c',
                            color: '#4ade80', padding: '6px', cursor: 'pointer',
                            fontFamily: mono, fontSize: 10,
                        }}
                    >NAVIGATE</button>
                )}
                <button
                    onClick={() => { if (confirm(`Delete node "${data.label}"?`)) onDelete(node.id); }}
                    style={{
                        flex: 1, background: '#3a1a1a', border: '1px solid #c94040',
                        color: '#f87171', padding: '6px', cursor: 'pointer',
                        fontFamily: mono, fontSize: 10,
                    }}
                >DELETE</button>
            </div>
        </div>
    );
}

// ── Add Node Form ──
function AddNodeForm({ onAdd, onCancel }) {
    const [label, setLabel] = useState('');
    const [group, setGroup] = useState('core');

    const inputStyle = {
        width: '100%', background: '#111', border: '1px solid #333',
        color: '#eaeaea', padding: '6px 8px', fontFamily: mono, fontSize: 11,
        outline: 'none', boxSizing: 'border-box', marginTop: 4,
    };

    return (
        <div style={{
            position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
            background: '#0a0a14', border: '1px solid #c9a84c', padding: 16,
            zIndex: 100, minWidth: 240, borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.8)'
        }}>
            <div style={{ color: '#c9a84c', fontWeight: 'bold', marginBottom: 10, fontSize: 12 }}>ADD NODE</div>
            <div style={{ marginBottom: 8 }}>
                <label style={{ color: '#888', fontSize: 11 }}>Label</label>
                <input value={label} onChange={e => setLabel(e.target.value)} style={inputStyle} autoFocus />
            </div>
            <div style={{ marginBottom: 10 }}>
                <label style={{ color: '#888', fontSize: 11 }}>Type</label>
                <select value={group} onChange={e => setGroup(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {GROUP_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
                <button
                    onClick={() => { if (label.trim()) onAdd(label.trim(), group); }}
                    style={{
                        flex: 1, background: '#c9a84c', border: 'none', color: '#000',
                        padding: '6px', cursor: 'pointer', fontFamily: mono, fontSize: 10, fontWeight: 'bold',
                    }}
                >CREATE</button>
                <button
                    onClick={onCancel}
                    style={{
                        flex: 1, background: 'none', border: '1px solid #444', color: '#888',
                        padding: '6px', cursor: 'pointer', fontFamily: mono, fontSize: 10,
                    }}
                >CANCEL</button>
            </div>
        </div>
    );
}

function FlowMapPanel({ onClose }) {
    const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(getInitialEdges);
    const [selectedNode, setSelectedNode] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);

    // Persist node positions on drag stop
    const handleNodeDragStop = useCallback((event, node) => {
        const saved = loadSavedPositions();
        saved[node.id] = node.position;
        localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(saved));
    }, []);

    // Persist edges whenever they change
    const persistEdges = useCallback((newEdges) => {
        localStorage.setItem(STORAGE_KEY_EDGES, JSON.stringify(newEdges));
    }, []);

    // Connect handler — create new edges
    const handleConnect = useCallback((params) => {
        const newEdge = {
            ...params,
            id: `${params.source}-${params.target}`,
            style: { stroke: '#3a3a5e' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3a3a5e' },
        };
        setEdges(eds => {
            const updated = addEdge(newEdge, eds);
            persistEdges(updated);
            return updated;
        });
    }, [setEdges, persistEdges]);

    // Edge click → delete
    const handleEdgeClick = useCallback((event, edge) => {
        if (confirm(`Delete connection ${edge.source} → ${edge.target}?`)) {
            setEdges(eds => {
                const updated = eds.filter(e => e.id !== edge.id);
                persistEdges(updated);
                return updated;
            });
        }
    }, [setEdges, persistEdges]);

    // Node click → select for properties panel (double-click to navigate)
    const handleNodeClick = useCallback((event, node) => {
        setSelectedNode(node);
    }, []);

    const handleNodeDoubleClick = useCallback((event, node) => {
        navigateToNode(node.id, onClose);
    }, [onClose]);

    // Update node data from properties panel
    const handleUpdateNode = useCallback((nodeId, updates) => {
        setNodes(nds => nds.map(n => {
            if (n.id !== nodeId) return n;
            const newData = { ...n.data, ...updates };
            const color = updates.color || newData.color;
            return {
                ...n,
                data: newData,
                style: {
                    ...n.style,
                    background: color + '22',
                    border: `2px solid ${color}`,
                },
            };
        }));
        // Update selected node reference
        setSelectedNode(prev => prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...updates } } : prev);
    }, [setNodes]);

    // Delete node
    const handleDeleteNode = useCallback((nodeId) => {
        setNodes(nds => nds.filter(n => n.id !== nodeId));
        setEdges(eds => {
            const updated = eds.filter(e => e.source !== nodeId && e.target !== nodeId);
            persistEdges(updated);
            return updated;
        });
        setSelectedNode(null);
        // Remove from saved positions
        const saved = loadSavedPositions();
        delete saved[nodeId];
        localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(saved));
        // Remove from custom nodes if applicable
        const custom = loadCustomNodes().filter(n => n.id !== nodeId);
        localStorage.setItem(STORAGE_KEY_NODES, JSON.stringify(custom));
    }, [setNodes, setEdges, persistEdges]);

    // Add new node
    const handleAddNode = useCallback((label, group) => {
        const id = 'custom_' + Date.now().toString(36);
        const color = GC[group] || GC.core;
        const newNode = flowNode(id, label, 0, 0, color, group);
        setNodes(nds => [...nds, newNode]);
        // Persist custom node
        const custom = loadCustomNodes();
        custom.push(newNode);
        localStorage.setItem(STORAGE_KEY_NODES, JSON.stringify(custom));
        setShowAddForm(false);
    }, [setNodes]);

    // Reset layout
    const handleResetLayout = useCallback(() => {
        if (!confirm('Reset all node positions to defaults?')) return;
        localStorage.removeItem(STORAGE_KEY_POSITIONS);
        localStorage.removeItem(STORAGE_KEY_EDGES);
        localStorage.removeItem(STORAGE_KEY_NODES);
        setNodes(INITIAL_NODES);
        setEdges(INITIAL_EDGES);
        setSelectedNode(null);
    }, [setNodes, setEdges]);

    // Export JSON
    const handleExport = useCallback(() => {
        const data = {
            nodes: nodes.map(n => ({
                id: n.id, label: n.data?.label, group: n.data?.group,
                x: Math.round(n.position.x), y: Math.round(n.position.y),
                description: n.data?.description,
            })),
            edges: edges.map(e => ({
                source: e.source, target: e.target, animated: e.animated || false,
            })),
        };
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        alert('Flow JSON copied to clipboard!');
    }, [nodes, edges]);

    const minimapStyle = {
        backgroundColor: '#0a0a14',
        maskColor: 'rgba(0,0,0,0.6)',
    };

    const toolBtnStyle = {
        background: '#111', border: '1px solid #333', color: '#888',
        padding: '4px 10px', cursor: 'pointer', fontFamily: mono, fontSize: 10,
    };

    return (
        <div style={{ ...panelStyle, flex: 1, position: 'relative', flexDirection: 'row' }}>
            {/* Main flow area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ ...headerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        FLOW MAP
                        <span style={{ color: '#555', fontSize: 10, marginLeft: 12, fontWeight: 'normal' }}>
                            {nodes.length} nodes &middot; {edges.length} edges &middot; Double-click to navigate &middot; Click edge to delete
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setShowAddForm(true)} style={{ ...toolBtnStyle, color: '#4ade80', borderColor: '#3a8a5c' }}>+ ADD NODE</button>
                        <button onClick={handleExport} style={toolBtnStyle}>EXPORT</button>
                        <button onClick={handleResetLayout} style={{ ...toolBtnStyle, color: '#f87171', borderColor: '#c94040' }}>RESET</button>
                    </div>
                </div>

                {/* Legend */}
                <div style={{
                    display: 'flex', gap: 12, padding: '6px 16px', borderBottom: '1px solid #1a1a2e',
                    flexWrap: 'wrap',
                }}>
                    {LEGEND.map(({ color, label }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{
                                width: 10, height: 10, borderRadius: 2,
                                background: color + '44', border: `1px solid ${color}`,
                            }} />
                            <span style={{ fontSize: 9, color: '#888' }}>{label}</span>
                        </div>
                    ))}
                </div>

                <div style={{ flex: 1, position: 'relative' }}>
                    <ReactFlowProvider>
                        {showAddForm && (
                            <AddNodeForm
                                onAdd={handleAddNode}
                                onCancel={() => setShowAddForm(false)}
                            />
                        )}
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={(changes) => {
                                onEdgesChange(changes);
                            }}
                            onNodeClick={handleNodeClick}
                            onNodeDoubleClick={handleNodeDoubleClick}
                            onNodeDragStop={handleNodeDragStop}
                            onConnect={handleConnect}
                            onEdgeClick={handleEdgeClick}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            minZoom={0.2}
                            maxZoom={2}
                            proOptions={{ hideAttribution: true }}
                            style={{ background: '#08080e' }}
                            connectionLineStyle={{ stroke: '#c9a84c' }}
                        >
                            <Background color="#1a1a2e" gap={20} size={1} />
                            <Controls
                                style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 4 }}
                            />
                            <MiniMap
                                style={minimapStyle}
                                nodeColor={(node) => node.data?.color || '#555'}
                                nodeStrokeWidth={0}
                                nodeBorderRadius={3}
                            />
                        </ReactFlow>
                    </ReactFlowProvider>
                </div>
            </div>

            {/* Properties Panel */}
            <NodePropertiesPanel
                node={selectedNode}
                onUpdate={handleUpdateNode}
                onDelete={handleDeleteNode}
                onNavigate={(id) => navigateToNode(id, onClose)}
            />
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
                    <FlowMapPanel onClose={onClose} />
                </div>
            )}
        </div>
    );
}
