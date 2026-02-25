/**
 * SceneGraph.jsx — Bird's-eye visual map of all scene/view/overlay connections
 *
 * Auto-layout dashboard showing the complete game navigation tree.
 * Reuses FlowEditor's data model (DEFAULT_EDGES, NODE_META) but presents
 * it as a clean, auto-arranged SVG with hover details and click-to-navigate.
 *
 * Layout: 5 horizontal lanes (Boot → Core → Venues → Combat → Overlays)
 * Each node shows status color, file path on hover, and click navigates.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { VIEW, OVERLAY } from '../../core/views.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';

// ══════════════════════════════════════════════════════════════
// Data — mirrors FlowEditor but structured for auto-layout
// ══════════════════════════════════════════════════════════════

const TYPE_COLORS = {
    view: { bg: '#1a1508', border: '#c9a84c', text: '#c9a84c', glow: 'rgba(201,168,76,0.25)' },
    overlay: { bg: '#0a1020', border: '#4488cc', text: '#88bbff', glow: 'rgba(68,136,204,0.25)' },
    scene: { bg: '#081a10', border: '#4ade80', text: '#4ade80', glow: 'rgba(74,222,128,0.25)' },
};

const STATUS_DOT = { active: '#4ade80', unused: '#666', planned: '#f59e0b' };

// Nodes grouped by swimlane for auto-layout
const LANES = [
    {
        label: 'Boot Flow',
        color: '#c9a84c',
        nodes: [
            { id: 'SCENE:TitleScene', type: 'scene', label: 'Title Screen', file: 'scenes/TitleScene.js', status: 'active', desc: 'Graphical title, Press Start' },
            { id: 'SCENE:IntroScene', type: 'scene', label: 'Intro Briefing', file: 'scenes/IntroScene.js', status: 'active', desc: 'Cinematic typewriter intro' },
            { id: 'VIEW:BOOT', type: 'view', label: 'Artnet Login', file: 'ui/ArtnetLogin.jsx', status: 'active', desc: 'Loading screen → email login' },
            { id: 'VIEW:CHARACTER_CREATOR', type: 'view', label: 'Character Creator', file: 'ui/CharacterCreator.jsx', status: 'active', desc: '6-phase character creation' },
        ]
    },
    {
        label: 'Core Game',
        color: '#4ade80',
        nodes: [
            { id: 'VIEW:TERMINAL', type: 'view', label: 'Terminal Dashboard', file: 'ui/terminal/TerminalUI.js', status: 'active', desc: 'Main game hub — menus, stats, events' },
            { id: 'VIEW:DASHBOARD', type: 'view', label: 'Player Dashboard', file: 'ui/PlayerDashboard.jsx', status: 'active', desc: 'React stats & ledger overlay' },
            { id: 'VIEW:SCENE_ENGINE', type: 'view', label: 'Scene Engine', file: 'ui/ScenePlayer.jsx', status: 'active', desc: 'ink.js visual novel cutscenes' },
            { id: 'SCENE:NewWorldScene', type: 'scene', label: 'Overworld', file: 'scenes/NewWorldScene.js', status: 'active', desc: 'Pokemon-style grid walk-around' },
        ]
    },
    {
        label: 'Venues & Locations',
        color: '#f59e0b',
        nodes: [
            { id: 'SCENE:CityScene', type: 'scene', label: 'City Hub', file: 'scenes/CityScene.js', status: 'active', desc: 'Venue list, fast travel' },
            { id: 'SCENE:LocationScene', type: 'scene', label: 'Location Interior', file: 'scenes/LocationScene.js', status: 'active', desc: 'Gallery rooms — NPCs, artworks' },
            { id: 'SCENE:FastTravelScene', type: 'scene', label: 'Fast Travel', file: 'scenes/FastTravelScene.js', status: 'active', desc: 'City-to-city transit' },
        ]
    },
    {
        label: 'Interaction',
        color: '#ef4444',
        nodes: [
            { id: 'SCENE:DialogueScene', type: 'scene', label: 'Dialogue', file: 'scenes/DialogueScene.js', status: 'active', desc: 'Text-based branching dialogue' },
            { id: 'SCENE:MacDialogueScene', type: 'scene', label: 'Visual Dialogue', file: 'scenes/MacDialogueScene.js', status: 'active', desc: 'Over-the-shoulder portrait dialogue' },
            { id: 'SCENE:HaggleScene', type: 'scene', label: 'Haggle Battle', file: 'scenes/HaggleScene.js', status: 'active', desc: 'Pokemon-style negotiation mini-game' },
            { id: 'SCENE:EndScene', type: 'scene', label: 'Endgame', file: 'scenes/EndScene.js', status: 'active', desc: 'Game over / final credits' },
        ]
    },
    {
        label: 'Overlays',
        color: '#4488cc',
        nodes: [
            { id: 'OVERLAY:ADMIN', type: 'overlay', label: 'Admin Panel', file: 'ui/AdminDashboard.jsx', status: 'active', desc: 'God-mode debug tools' },
            { id: 'OVERLAY:BLOOMBERG', type: 'overlay', label: 'Bloomberg', file: 'ui/BloombergTerminal.jsx', status: 'active', desc: '9-style market terminal' },
            { id: 'OVERLAY:MASTER_CMS', type: 'overlay', label: 'CMS', file: 'ui/MasterCMS.jsx', status: 'active', desc: '15-tab content studio' },
            { id: 'OVERLAY:SETTINGS', type: 'overlay', label: 'Settings', file: 'ui/SettingsPanel.jsx', status: 'active', desc: 'Audio, display settings' },
            { id: 'OVERLAY:INVENTORY', type: 'overlay', label: 'Inventory', file: 'ui/InventoryPanel.jsx', status: 'active', desc: 'Player items grid' },
            { id: 'OVERLAY:GMAIL_GUIDE', type: 'overlay', label: 'Email Client', file: 'ui/email/', status: 'active', desc: 'Gmail-style email overlay' },
            { id: 'OVERLAY:SALES_GRID', type: 'overlay', label: 'Sales Grid', file: 'ui/SalesGrid.jsx', status: 'active', desc: 'Beckmans trade history' },
        ]
    },
    {
        label: 'Legacy / Planned',
        color: '#666',
        nodes: [
            { id: 'SCENE:WorldScene', type: 'scene', label: 'WorldScene (old)', file: 'scenes/WorldScene.js', status: 'unused', desc: 'Deprecated — use NewWorldScene' },
            { id: 'SCENE:OverworldScene', type: 'scene', label: 'Overworld (old)', file: 'scenes/OverworldScene.js', status: 'unused', desc: 'Deprecated legacy overworld' },
            { id: 'SCENE:BootScene', type: 'scene', label: 'Boot Loader', file: 'scenes/BootScene.js', status: 'active', desc: 'Asset preloader' },
            { id: 'OVERLAY:ARTNET_MARKETPLACE', type: 'overlay', label: 'Marketplace', file: 'ui/ArtnetMarketplace.jsx', status: 'planned', desc: 'Artnet marketplace (planned)' },
        ]
    },
];

const EDGES = [
    // Boot flow
    { from: 'SCENE:TitleScene', to: 'SCENE:IntroScene', label: 'Press Start' },
    { from: 'SCENE:IntroScene', to: 'VIEW:BOOT', label: 'Fadeout' },
    { from: 'VIEW:BOOT', to: 'VIEW:CHARACTER_CREATOR', label: 'Login' },
    { from: 'VIEW:CHARACTER_CREATOR', to: 'VIEW:TERMINAL', label: 'Done' },
    // Core loops
    { from: 'VIEW:TERMINAL', to: 'SCENE:NewWorldScene', label: 'Walk Around' },
    { from: 'SCENE:NewWorldScene', to: 'VIEW:TERMINAL', label: 'ESC / Exit' },
    { from: 'SCENE:NewWorldScene', to: 'SCENE:CityScene', label: 'Enter City' },
    // Venues
    { from: 'SCENE:CityScene', to: 'SCENE:LocationScene', label: 'Enter Venue' },
    { from: 'SCENE:CityScene', to: 'SCENE:FastTravelScene', label: 'Fast Travel' },
    { from: 'SCENE:CityScene', to: 'VIEW:TERMINAL', label: 'Leave City' },
    { from: 'SCENE:FastTravelScene', to: 'SCENE:LocationScene', label: 'Arrive' },
    // Interactions
    { from: 'SCENE:LocationScene', to: 'SCENE:DialogueScene', label: 'Talk to NPC' },
    { from: 'SCENE:LocationScene', to: 'SCENE:HaggleScene', label: 'Buy/Sell Art' },
    { from: 'SCENE:DialogueScene', to: 'VIEW:TERMINAL', label: 'End Dialogue' },
    { from: 'SCENE:MacDialogueScene', to: 'VIEW:TERMINAL', label: 'End Dialogue' },
    { from: 'SCENE:HaggleScene', to: 'VIEW:TERMINAL', label: 'Finish Haggle' },
    // Overlays (from anywhere)
    { from: 'VIEW:TERMINAL', to: 'OVERLAY:BLOOMBERG', label: '` key' },
    { from: 'VIEW:TERMINAL', to: 'OVERLAY:ADMIN', label: '~ key' },
    // Endgame
    { from: 'VIEW:TERMINAL', to: 'SCENE:EndScene', label: 'Week 26' },
    { from: 'SCENE:EndScene', to: 'SCENE:TitleScene', label: 'Restart' },
];

// ══════════════════════════════════════════════════════════════
// Layout engine — positions nodes in lanes
// ══════════════════════════════════════════════════════════════

const NODE_W = 150;
const NODE_H = 40;
const LANE_GAP = 32;
const NODE_GAP_Y = 16;
const LANE_HEADER = 28;
const PADDING = 24;

function computeLayout(lanes) {
    const positions = {};
    let y = PADDING;

    lanes.forEach(lane => {
        y += LANE_HEADER + 8;
        lane.nodes.forEach((node, i) => {
            positions[node.id] = {
                x: PADDING + 8,
                y: y + i * (NODE_H + NODE_GAP_Y),
                w: NODE_W,
                h: NODE_H,
                ...node,
            };
        });
        y += lane.nodes.length * (NODE_H + NODE_GAP_Y) + LANE_GAP;
    });

    return { positions, totalHeight: y };
}

// ══════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════

export default function SceneGraph({ onNavigate }) {
    const [hovered, setHovered] = useState(null);
    const [selectedLane, setSelectedLane] = useState(null);
    const [viewMode, setViewMode] = useState('graph'); // 'graph' or 'list'
    const svgRef = useRef(null);

    const { positions, totalHeight } = useMemo(() => computeLayout(LANES), []);

    // ── Stats ──
    const stats = useMemo(() => {
        const all = LANES.flatMap(l => l.nodes);
        const active = all.filter(n => n.status === 'active').length;
        const unused = all.filter(n => n.status === 'unused').length;
        const planned = all.filter(n => n.status === 'planned').length;
        const views = all.filter(n => n.type === 'view').length;
        const scenes = all.filter(n => n.type === 'scene').length;
        const overlays = all.filter(n => n.type === 'overlay').length;
        return { total: all.length, active, unused, planned, views, scenes, overlays, edges: EDGES.length };
    }, []);

    // ── Click handler ──
    const handleNodeClick = useCallback((node) => {
        if (!onNavigate) return;
        // Navigate to the appropriate CMS tab
        if (node.id === 'VIEW:BOOT') return onNavigate('pages');
        if (node.id.startsWith('VIEW:')) return onNavigate('pages');
        if (node.id.startsWith('SCENE:')) return onNavigate('pages');
        if (node.id.startsWith('OVERLAY:')) return onNavigate('pages');
    }, [onNavigate]);

    // ── Edge path generator ──
    const getEdgePath = useCallback((fromId, toId) => {
        const from = positions[fromId];
        const to = positions[toId];
        if (!from || !to) return null;

        const fx = from.x + from.w;
        const fy = from.y + from.h / 2;
        const tx = to.x;
        const ty = to.y + to.h / 2;

        // If target is above source, curve to the right
        const dx = Math.abs(tx - fx);
        const cpx = Math.max(dx * 0.5, 60);

        return `M ${fx} ${fy} C ${fx + cpx} ${fy}, ${tx - cpx} ${ty}, ${tx} ${ty}`;
    }, [positions]);

    const svgWidth = NODE_W + PADDING * 2 + 16;

    // ══════════════════════════════════════════════════════════
    // Styles
    // ══════════════════════════════════════════════════════════

    const containerStyle = {
        display: 'flex', height: '100%', background: '#0a0a12',
        fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
        color: '#ccc', fontSize: 11,
    };

    const sidebarStyle = {
        width: 280, minWidth: 280, borderRight: '1px solid #222',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
    };

    const mainStyle = {
        flex: 1, overflow: 'auto', position: 'relative',
    };

    return (
        <div style={containerStyle}>
            {/* ── Left Sidebar: Stats + Legend + Details ── */}
            <div style={sidebarStyle}>
                {/* Header */}
                <div style={{
                    padding: '16px 16px 12px', borderBottom: '1px solid #222',
                    fontSize: 14, fontWeight: 700, color: '#c9a84c',
                    letterSpacing: '0.05em',
                }}>
                    🗺️ SCENE GRAPH
                </div>

                {/* Stats */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a2e' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                        <StatItem label="Total Nodes" value={stats.total} color="#fff" />
                        <StatItem label="Connections" value={stats.edges} color="#fff" />
                        <StatItem label="Views" value={stats.views} color="#c9a84c" />
                        <StatItem label="Scenes" value={stats.scenes} color="#4ade80" />
                        <StatItem label="Overlays" value={stats.overlays} color="#4488cc" />
                        <StatItem label="Active" value={stats.active} color="#4ade80" />
                        <StatItem label="Unused" value={stats.unused} color="#666" />
                        <StatItem label="Planned" value={stats.planned} color="#f59e0b" />
                    </div>
                </div>

                {/* Legend */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a2e' }}>
                    <div style={{ fontSize: 9, color: '#666', marginBottom: 8, letterSpacing: '0.1em' }}>LEGEND</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <LegendItem color="#c9a84c" label="React View" />
                        <LegendItem color="#4ade80" label="Phaser Scene" />
                        <LegendItem color="#4488cc" label="Overlay" />
                        <LegendItem color="#666" label="Deprecated / Planned" />
                    </div>
                </div>

                {/* Hovered Node Detail */}
                <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                    {hovered ? (
                        <div>
                            <div style={{ fontSize: 9, color: '#666', letterSpacing: '0.1em', marginBottom: 8 }}>
                                SELECTED NODE
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: TYPE_COLORS[hovered.type]?.text || '#ccc', marginBottom: 4 }}>
                                {hovered.label}
                            </div>
                            <div style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>{hovered.id}</div>
                            <div style={{ fontSize: 10, color: '#aaa', marginBottom: 6 }}>{hovered.desc}</div>
                            <div style={{ fontSize: 9, color: '#555', fontFamily: 'monospace' }}>
                                📂 {hovered.file}
                            </div>
                            <div style={{ marginTop: 8, fontSize: 9 }}>
                                <span style={{
                                    display: 'inline-block', padding: '2px 6px',
                                    background: STATUS_DOT[hovered.status] + '22',
                                    color: STATUS_DOT[hovered.status],
                                    borderRadius: 3, textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                }}>
                                    {hovered.status}
                                </span>
                            </div>
                            {/* Connections */}
                            <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 9, color: '#666', letterSpacing: '0.1em', marginBottom: 6 }}>CONNECTIONS</div>
                                {EDGES.filter(e => e.from === hovered.id || e.to === hovered.id).map((e, i) => (
                                    <div key={i} style={{
                                        fontSize: 9, color: '#888', padding: '2px 0',
                                        borderBottom: '1px solid #151525',
                                    }}>
                                        {e.from === hovered.id
                                            ? <span>→ <span style={{ color: '#aaa' }}>{e.to.split(':')[1]}</span> <span style={{ color: '#555' }}>({e.label})</span></span>
                                            : <span>← <span style={{ color: '#aaa' }}>{e.from.split(':')[1]}</span> <span style={{ color: '#555' }}>({e.label})</span></span>
                                        }
                                    </div>
                                ))}
                                {EDGES.filter(e => e.from === hovered.id || e.to === hovered.id).length === 0 && (
                                    <div style={{ fontSize: 9, color: '#444', fontStyle: 'italic' }}>No connections (dead end)</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: '#444', fontSize: 10, fontStyle: 'italic', marginTop: 20, textAlign: 'center' }}>
                            Hover over a node to see details
                        </div>
                    )}
                </div>
            </div>

            {/* ── Main: SVG Graph ── */}
            <div style={mainStyle}>
                <svg
                    ref={svgRef}
                    width="100%"
                    height={totalHeight + 40}
                    style={{ display: 'block', minHeight: '100%' }}
                >
                    <defs>
                        <marker id="sg-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="#333" />
                        </marker>
                        <marker id="sg-arrow-highlight" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="#c9a84c" />
                        </marker>
                    </defs>

                    {/* ── Lane backgrounds + labels ── */}
                    {(() => {
                        let y = PADDING;
                        return LANES.map((lane, li) => {
                            const laneY = y;
                            const laneH = LANE_HEADER + 8 + lane.nodes.length * (NODE_H + NODE_GAP_Y) + LANE_GAP - NODE_GAP_Y;
                            y += LANE_HEADER + 8 + lane.nodes.length * (NODE_H + NODE_GAP_Y) + LANE_GAP;
                            return (
                                <g key={`lane-${li}`}>
                                    <rect
                                        x={4} y={laneY} width="calc(100% - 8)" height={laneH}
                                        rx={6} fill="none" stroke={lane.color + '15'}
                                        style={{ width: 'calc(100% - 8px)' }}
                                    />
                                    <text x={PADDING} y={laneY + 18} fill={lane.color} fontSize={10} fontWeight={700}
                                        fontFamily='"SF Mono", monospace' letterSpacing="0.12em">
                                        {lane.label.toUpperCase()}
                                    </text>
                                </g>
                            );
                        });
                    })()}

                    {/* ── Edges ── */}
                    {EDGES.map((edge, i) => {
                        const path = getEdgePath(edge.from, edge.to);
                        if (!path) return null;
                        const isHighlighted = hovered && (edge.from === hovered.id || edge.to === hovered.id);
                        return (
                            <g key={`edge-${i}`}>
                                <path
                                    d={path}
                                    fill="none"
                                    stroke={isHighlighted ? '#c9a84c' : '#222'}
                                    strokeWidth={isHighlighted ? 2 : 1}
                                    strokeDasharray={isHighlighted ? 'none' : '4 4'}
                                    markerEnd={isHighlighted ? 'url(#sg-arrow-highlight)' : 'url(#sg-arrow)'}
                                    style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                                />
                                {isHighlighted && (
                                    <text
                                        x={positions[edge.from] ? positions[edge.from].x + positions[edge.from].w + 12 : 0}
                                        y={positions[edge.from] ? positions[edge.from].y + positions[edge.from].h / 2 - 6 : 0}
                                        fill="#c9a84c88" fontSize={8} fontFamily='"SF Mono", monospace'
                                    >
                                        {edge.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* ── Nodes ── */}
                    {LANES.flatMap(lane => lane.nodes).map(node => {
                        const pos = positions[node.id];
                        if (!pos) return null;
                        const colors = TYPE_COLORS[node.type] || TYPE_COLORS.view;
                        const isHovered = hovered?.id === node.id;
                        const isUnused = node.status === 'unused';
                        const opacity = isUnused ? 0.4 : 1;

                        return (
                            <g
                                key={node.id}
                                style={{ cursor: 'pointer', opacity }}
                                onMouseEnter={() => setHovered(node)}
                                onClick={() => handleNodeClick(node)}
                            >
                                {/* Glow */}
                                {isHovered && (
                                    <rect
                                        x={pos.x - 3} y={pos.y - 3}
                                        width={pos.w + 6} height={pos.h + 6}
                                        rx={8} fill={colors.glow}
                                    />
                                )}
                                {/* Background */}
                                <rect
                                    x={pos.x} y={pos.y}
                                    width={pos.w} height={pos.h}
                                    rx={5}
                                    fill={isHovered ? colors.bg : '#0d0d18'}
                                    stroke={isHovered ? colors.border : (isUnused ? '#333' : colors.border + '88')}
                                    strokeWidth={isHovered ? 2 : 1}
                                    style={{ transition: 'all 0.15s' }}
                                />
                                {/* Status dot */}
                                <circle
                                    cx={pos.x + 12} cy={pos.y + pos.h / 2}
                                    r={3} fill={STATUS_DOT[node.status] || '#666'}
                                />
                                {/* Label */}
                                <text
                                    x={pos.x + 22} y={pos.y + pos.h / 2 + 4}
                                    fill={isHovered ? colors.text : (isUnused ? '#555' : '#aaa')}
                                    fontSize={10} fontWeight={isHovered ? 700 : 400}
                                    fontFamily='"SF Mono", "Fira Code", monospace'
                                    style={{ transition: 'fill 0.15s' }}
                                >
                                    {node.label}
                                </text>
                                {/* Type badge */}
                                <text
                                    x={pos.x + pos.w - 8} y={pos.y + 12}
                                    fill={colors.border + '55'} fontSize={7}
                                    fontFamily='"SF Mono", monospace'
                                    textAnchor="end"
                                >
                                    {node.type.toUpperCase()}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}

// ── Helpers ──

function StatItem({ label, value, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666', fontSize: 9, letterSpacing: '0.05em' }}>{label}</span>
            <span style={{ color, fontWeight: 700, fontSize: 13 }}>{value}</span>
        </div>
    );
}

function LegendItem({ color, label }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color + '33', border: `1px solid ${color}` }} />
            <span style={{ fontSize: 9, color: '#888' }}>{label}</span>
        </div>
    );
}
