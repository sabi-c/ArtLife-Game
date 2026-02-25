/**
 * SceneGraph.jsx — Bird's-eye visual map of all scene/view/overlay connections
 *
 * Auto-layout dashboard showing the complete game navigation tree.
 * Features:
 *   - 6 swimlane groups (Boot → Core → Venues → Interaction → Overlays → Legacy)
 *   - Named User Flow presets with path highlighting & dimming
 *   - Breadcrumb bar showing selected flow steps
 *   - Zoom controls (1x–3x) + Zoom-to-Fit
 *   - Minimap in bottom-right corner
 *   - Click-to-navigate to PageEditor
 *   - Hover details with connection list
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { VIEW, OVERLAY } from '../../core/views.js';

// ══════════════════════════════════════════════════════════════
// Design tokens
// ══════════════════════════════════════════════════════════════

const mono = '"SF Mono", "Fira Code", Consolas, monospace';

const TYPE_COLORS = {
    view: { bg: '#1a1508', border: '#c9a84c', text: '#c9a84c', glow: 'rgba(201,168,76,0.25)' },
    overlay: { bg: '#0a1020', border: '#4488cc', text: '#88bbff', glow: 'rgba(68,136,204,0.25)' },
    scene: { bg: '#081a10', border: '#4ade80', text: '#4ade80', glow: 'rgba(74,222,128,0.25)' },
};

const STATUS_DOT = { active: '#4ade80', unused: '#666', planned: '#f59e0b' };

// ══════════════════════════════════════════════════════════════
// Node data — grouped by swimlane
// ══════════════════════════════════════════════════════════════

const LANES = [
    {
        label: 'Boot Flow', color: '#c9a84c',
        nodes: [
            { id: 'SCENE:TitleScene', type: 'scene', label: 'Title Screen', file: 'scenes/TitleScene.js', status: 'active', desc: 'Graphical title, Press Start' },
            { id: 'SCENE:IntroScene', type: 'scene', label: 'Intro Briefing', file: 'scenes/IntroScene.js', status: 'active', desc: 'Cinematic typewriter intro' },
            { id: 'VIEW:BOOT', type: 'view', label: 'Artnet Login', file: 'ui/ArtnetLogin.jsx', status: 'active', desc: 'Loading screen → email login' },
            { id: 'VIEW:CHARACTER_CREATOR', type: 'view', label: 'Character Creator', file: 'ui/CharacterCreator.jsx', status: 'active', desc: '6-phase character creation' },
        ]
    },
    {
        label: 'Core Game', color: '#4ade80',
        nodes: [
            { id: 'VIEW:TERMINAL', type: 'view', label: 'Terminal Dashboard', file: 'ui/terminal/TerminalUI.js', status: 'active', desc: 'Main game hub — menus, stats, events' },
            { id: 'VIEW:DASHBOARD', type: 'view', label: 'Player Dashboard', file: 'ui/PlayerDashboard.jsx', status: 'active', desc: 'React stats & ledger overlay' },
            { id: 'VIEW:SCENE_ENGINE', type: 'view', label: 'Scene Engine', file: 'ui/ScenePlayer.jsx', status: 'active', desc: 'ink.js visual novel cutscenes' },
            { id: 'SCENE:NewWorldScene', type: 'scene', label: 'Overworld', file: 'scenes/NewWorldScene.js', status: 'active', desc: 'Pokemon-style grid walk-around' },
        ]
    },
    {
        label: 'Venues & Locations', color: '#f59e0b',
        nodes: [
            { id: 'SCENE:CityScene', type: 'scene', label: 'City Hub', file: 'scenes/CityScene.js', status: 'active', desc: 'Venue list, fast travel' },
            { id: 'SCENE:LocationScene', type: 'scene', label: 'Location Interior', file: 'scenes/LocationScene.js', status: 'active', desc: 'Gallery rooms — NPCs, artworks' },
            { id: 'SCENE:FastTravelScene', type: 'scene', label: 'Fast Travel', file: 'scenes/FastTravelScene.js', status: 'active', desc: 'City-to-city transit' },
        ]
    },
    {
        label: 'Interaction', color: '#ef4444',
        nodes: [
            { id: 'SCENE:DialogueScene', type: 'scene', label: 'Dialogue', file: 'scenes/DialogueScene.js', status: 'active', desc: 'Text-based branching dialogue' },
            { id: 'SCENE:MacDialogueScene', type: 'scene', label: 'Visual Dialogue', file: 'scenes/MacDialogueScene.js', status: 'active', desc: 'Over-the-shoulder portrait dialogue' },
            { id: 'SCENE:HaggleScene', type: 'scene', label: 'Haggle Battle', file: 'scenes/HaggleScene.js', status: 'active', desc: 'Pokemon-style negotiation mini-game' },
            { id: 'SCENE:EndScene', type: 'scene', label: 'Endgame', file: 'scenes/EndScene.js', status: 'active', desc: 'Game over / final credits' },
        ]
    },
    {
        label: 'Overlays', color: '#4488cc',
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
        label: 'Legacy / Planned', color: '#666',
        nodes: [
            { id: 'SCENE:WorldScene', type: 'scene', label: 'WorldScene (old)', file: 'scenes/WorldScene.js', status: 'unused', desc: 'Deprecated — use NewWorldScene' },
            { id: 'SCENE:OverworldScene', type: 'scene', label: 'Overworld (old)', file: 'scenes/OverworldScene.js', status: 'unused', desc: 'Deprecated legacy overworld' },
            { id: 'SCENE:BootScene', type: 'scene', label: 'Boot Loader', file: 'scenes/BootScene.js', status: 'active', desc: 'Asset preloader' },
            { id: 'OVERLAY:ARTNET_MARKETPLACE', type: 'overlay', label: 'Marketplace', file: 'ui/ArtnetMarketplace.jsx', status: 'planned', desc: 'Artnet marketplace (planned)' },
        ]
    },
];

const EDGES = [
    { from: 'SCENE:TitleScene', to: 'SCENE:IntroScene', label: 'Press Start' },
    { from: 'SCENE:IntroScene', to: 'VIEW:BOOT', label: 'Fadeout' },
    { from: 'VIEW:BOOT', to: 'VIEW:CHARACTER_CREATOR', label: 'Login' },
    { from: 'VIEW:CHARACTER_CREATOR', to: 'VIEW:TERMINAL', label: 'Done' },
    { from: 'VIEW:TERMINAL', to: 'SCENE:NewWorldScene', label: 'Walk Around' },
    { from: 'SCENE:NewWorldScene', to: 'VIEW:TERMINAL', label: 'ESC / Exit' },
    { from: 'SCENE:NewWorldScene', to: 'SCENE:CityScene', label: 'Enter City' },
    { from: 'SCENE:CityScene', to: 'SCENE:LocationScene', label: 'Enter Venue' },
    { from: 'SCENE:CityScene', to: 'SCENE:FastTravelScene', label: 'Fast Travel' },
    { from: 'SCENE:CityScene', to: 'VIEW:TERMINAL', label: 'Leave City' },
    { from: 'SCENE:FastTravelScene', to: 'SCENE:LocationScene', label: 'Arrive' },
    { from: 'SCENE:LocationScene', to: 'SCENE:DialogueScene', label: 'Talk to NPC' },
    { from: 'SCENE:LocationScene', to: 'SCENE:HaggleScene', label: 'Buy/Sell Art' },
    { from: 'SCENE:DialogueScene', to: 'VIEW:TERMINAL', label: 'End Dialogue' },
    { from: 'SCENE:MacDialogueScene', to: 'VIEW:TERMINAL', label: 'End Dialogue' },
    { from: 'SCENE:HaggleScene', to: 'VIEW:TERMINAL', label: 'Finish Haggle' },
    { from: 'VIEW:TERMINAL', to: 'OVERLAY:BLOOMBERG', label: '` key' },
    { from: 'VIEW:TERMINAL', to: 'OVERLAY:ADMIN', label: '~ key' },
    { from: 'VIEW:TERMINAL', to: 'SCENE:EndScene', label: 'Week 26' },
    { from: 'SCENE:EndScene', to: 'SCENE:TitleScene', label: 'Restart' },
];

// ══════════════════════════════════════════════════════════════
// Named User Flow Presets
// ══════════════════════════════════════════════════════════════

const USER_FLOWS = [
    {
        id: 'new_player', label: '🎮 New Player', color: '#c9a84c', estMin: 5,
        desc: 'First-time player journey from title to gameplay',
        path: ['SCENE:TitleScene', 'SCENE:IntroScene', 'VIEW:BOOT', 'VIEW:CHARACTER_CREATOR', 'VIEW:TERMINAL'],
    },
    {
        id: 'gallery_visit', label: '🎨 Gallery Visit', color: '#f59e0b', estMin: 3,
        desc: 'Visit a gallery, look at art, haggle for a deal',
        path: ['VIEW:TERMINAL', 'SCENE:NewWorldScene', 'SCENE:CityScene', 'SCENE:LocationScene', 'SCENE:HaggleScene', 'VIEW:TERMINAL'],
    },
    {
        id: 'npc_dialogue', label: '💬 NPC Dialogue', color: '#ef4444', estMin: 2,
        desc: 'Walk around, find NPC, talk to them',
        path: ['VIEW:TERMINAL', 'SCENE:NewWorldScene', 'SCENE:CityScene', 'SCENE:LocationScene', 'SCENE:DialogueScene', 'VIEW:TERMINAL'],
    },
    {
        id: 'auction_run', label: '🏛️ Auction Run', color: '#a78bfa', estMin: 4,
        desc: 'Fast travel to auction house and bid on art',
        path: ['VIEW:TERMINAL', 'SCENE:NewWorldScene', 'SCENE:CityScene', 'SCENE:FastTravelScene', 'SCENE:LocationScene', 'SCENE:HaggleScene', 'VIEW:TERMINAL'],
    },
    {
        id: 'quick_play', label: '⚡ Quick Play', color: '#4ade80', estMin: 1,
        desc: 'Load an existing save and jump into gameplay',
        path: ['SCENE:TitleScene', 'VIEW:BOOT', 'VIEW:TERMINAL'],
    },
    {
        id: 'endgame', label: '🏆 Endgame', color: '#e879f9', estMin: 2,
        desc: 'Reach week 26 and see the final credits',
        path: ['VIEW:TERMINAL', 'SCENE:EndScene', 'SCENE:TitleScene'],
    },
];

// ══════════════════════════════════════════════════════════════
// Layout engine
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
                x: PADDING + 8, y: y + i * (NODE_H + NODE_GAP_Y),
                w: NODE_W, h: NODE_H, ...node,
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
    const [activeFlow, setActiveFlow] = useState(null);
    const [zoom, setZoom] = useState(1);
    const svgRef = useRef(null);
    const scrollRef = useRef(null);

    const { positions, totalHeight } = useMemo(() => computeLayout(LANES), []);
    const allNodes = useMemo(() => LANES.flatMap(l => l.nodes), []);

    // ── Flow highlighting ──
    const flowData = useMemo(() => {
        if (!activeFlow) return null;
        const flow = USER_FLOWS.find(f => f.id === activeFlow);
        if (!flow) return null;
        const nodeSet = new Set(flow.path);
        const edgeSet = new Set();
        for (let i = 0; i < flow.path.length - 1; i++) {
            edgeSet.add(`${flow.path[i]}→${flow.path[i + 1]}`);
        }
        return { flow, nodeSet, edgeSet };
    }, [activeFlow]);

    const isNodeInFlow = useCallback((nodeId) => {
        if (!flowData) return true;
        return flowData.nodeSet.has(nodeId);
    }, [flowData]);

    const isEdgeInFlow = useCallback((from, to) => {
        if (!flowData) return false;
        return flowData.edgeSet.has(`${from}→${to}`);
    }, [flowData]);

    // ── Stats ──
    const stats = useMemo(() => {
        const active = allNodes.filter(n => n.status === 'active').length;
        const unused = allNodes.filter(n => n.status === 'unused').length;
        const planned = allNodes.filter(n => n.status === 'planned').length;
        return {
            total: allNodes.length, active, unused, planned,
            views: allNodes.filter(n => n.type === 'view').length,
            scenes: allNodes.filter(n => n.type === 'scene').length,
            overlays: allNodes.filter(n => n.type === 'overlay').length,
            edges: EDGES.length,
        };
    }, [allNodes]);

    // ── Click handler ──
    const handleNodeClick = useCallback((node) => {
        if (onNavigate) onNavigate('pages');
    }, [onNavigate]);

    // ── Edge path ──
    const getEdgePath = useCallback((fromId, toId) => {
        const from = positions[fromId];
        const to = positions[toId];
        if (!from || !to) return null;
        const fx = from.x + from.w, fy = from.y + from.h / 2;
        const tx = to.x, ty = to.y + to.h / 2;
        const cpx = Math.max(Math.abs(tx - fx) * 0.5, 60);
        return `M ${fx} ${fy} C ${fx + cpx} ${fy}, ${tx - cpx} ${ty}, ${tx} ${ty}`;
    }, [positions]);

    // ── Zoom-to-fit ──
    const zoomToFit = useCallback(() => {
        setZoom(1);
        scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, []);

    const svgWidth = NODE_W + PADDING * 2 + 16;

    return (
        <div style={{
            display: 'flex', height: '100%', background: '#0a0a12',
            fontFamily: mono, color: '#ccc', fontSize: 11,
        }}>
            {/* ── Left Sidebar ── */}
            <div style={{
                width: 280, minWidth: 280, borderRight: '1px solid #222',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 16px 12px', borderBottom: '1px solid #222',
                    fontSize: 14, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.05em',
                }}>
                    🗺️ SCENE GRAPH
                </div>

                {/* ── User Flow Presets ── */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a2e' }}>
                    <div style={{ fontSize: 9, color: '#666', letterSpacing: '0.1em', marginBottom: 8 }}>USER FLOWS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {USER_FLOWS.map(flow => {
                            const isActive = activeFlow === flow.id;
                            return (
                                <button key={flow.id} onClick={() => setActiveFlow(isActive ? null : flow.id)} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '6px 10px', cursor: 'pointer', borderRadius: 4,
                                    background: isActive ? `${flow.color}15` : 'transparent',
                                    border: `1px solid ${isActive ? flow.color : '#222'}`,
                                    color: isActive ? flow.color : '#888',
                                    fontFamily: mono, fontSize: 10, textAlign: 'left',
                                    transition: 'all 0.15s',
                                }}>
                                    <span style={{ flex: 1 }}>{flow.label}</span>
                                    {isActive && <span style={{ fontSize: 8, opacity: 0.6 }}>✕</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Breadcrumb bar (when flow is active) ── */}
                {flowData && (
                    <div style={{
                        padding: '10px 16px', borderBottom: '1px solid #1a1a2e',
                        background: `${flowData.flow.color}08`,
                    }}>
                        <div style={{ fontSize: 9, color: flowData.flow.color, marginBottom: 6, fontWeight: 700, letterSpacing: '0.08em' }}>
                            {flowData.flow.label.toUpperCase()} — {flowData.flow.path.length} steps
                        </div>
                        <div style={{ fontSize: 9, color: '#666', marginBottom: 8 }}>{flowData.flow.desc}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                            {flowData.flow.path.map((nodeId, i) => {
                                const node = allNodes.find(n => n.id === nodeId);
                                return (
                                    <React.Fragment key={i}>
                                        {i > 0 && <span style={{ color: '#444', fontSize: 10 }}>→</span>}
                                        <span style={{
                                            fontSize: 9, padding: '2px 6px', borderRadius: 3,
                                            background: `${flowData.flow.color}15`,
                                            color: flowData.flow.color,
                                            border: `1px solid ${flowData.flow.color}33`,
                                            whiteSpace: 'nowrap',
                                        }}>{node?.label || nodeId.split(':')[1]}</span>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                        <div style={{ fontSize: 9, color: '#555', marginTop: 6 }}>
                            ⏱ ~{flowData.flow.estMin} min estimated
                        </div>
                    </div>
                )}

                {/* ── Stats ── */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a2e' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                        <StatItem label="Total Nodes" value={stats.total} color="#fff" />
                        <StatItem label="Connections" value={stats.edges} color="#fff" />
                        <StatItem label="Views" value={stats.views} color="#c9a84c" />
                        <StatItem label="Scenes" value={stats.scenes} color="#4ade80" />
                        <StatItem label="Overlays" value={stats.overlays} color="#4488cc" />
                        <StatItem label="Active" value={stats.active} color="#4ade80" />
                    </div>
                </div>

                {/* ── Legend ── */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a2e' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <LegendItem color="#c9a84c" label="View" />
                        <LegendItem color="#4ade80" label="Scene" />
                        <LegendItem color="#4488cc" label="Overlay" />
                    </div>
                </div>

                {/* ── Hovered Node Detail ── */}
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
                                    borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.08em',
                                }}>{hovered.status}</span>
                            </div>
                            <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 9, color: '#666', letterSpacing: '0.1em', marginBottom: 6 }}>CONNECTIONS</div>
                                {EDGES.filter(e => e.from === hovered.id || e.to === hovered.id).map((e, i) => (
                                    <div key={i} style={{ fontSize: 9, color: '#888', padding: '2px 0', borderBottom: '1px solid #151525' }}>
                                        {e.from === hovered.id
                                            ? <span>→ <span style={{ color: '#aaa' }}>{e.to.split(':')[1]}</span> <span style={{ color: '#555' }}>({e.label})</span></span>
                                            : <span>← <span style={{ color: '#aaa' }}>{e.from.split(':')[1]}</span> <span style={{ color: '#555' }}>({e.label})</span></span>
                                        }
                                    </div>
                                ))}
                                {EDGES.filter(e => e.from === hovered.id || e.to === hovered.id).length === 0 && (
                                    <div style={{ fontSize: 9, color: '#444', fontStyle: 'italic' }}>No connections</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: '#444', fontSize: 10, fontStyle: 'italic', marginTop: 20, textAlign: 'center' }}>
                            Hover a node to see details
                        </div>
                    )}
                </div>
            </div>

            {/* ── Main: SVG Graph ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

                {/* ── Zoom controls bar ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderBottom: '1px solid #222',
                    background: 'rgba(10,10,15,0.95)', flexShrink: 0,
                }}>
                    <span style={{ fontSize: 9, color: '#555' }}>ZOOM</span>
                    {[1, 1.5, 2].map(z => (
                        <button key={z} onClick={() => setZoom(z)} style={{
                            background: zoom === z ? '#c9a84c' : '#111',
                            color: zoom === z ? '#000' : '#888',
                            border: '1px solid #333', padding: '3px 8px',
                            cursor: 'pointer', fontFamily: mono, fontSize: 9, borderRadius: 2,
                        }}>{z}x</button>
                    ))}
                    <button onClick={zoomToFit} style={{
                        background: '#111', color: '#888', border: '1px solid #333',
                        padding: '3px 8px', cursor: 'pointer', fontFamily: mono, fontSize: 9, borderRadius: 2,
                    }}>FIT</button>

                    <div style={{ flex: 1 }} />

                    {activeFlow && (
                        <button onClick={() => setActiveFlow(null)} style={{
                            background: 'rgba(201,168,76,0.1)', border: '1px solid #c9a84c33',
                            color: '#c9a84c', padding: '3px 10px', cursor: 'pointer',
                            fontFamily: mono, fontSize: 9, borderRadius: 3,
                        }}>✕ Clear Flow Filter</button>
                    )}
                </div>

                {/* ── Canvas ── */}
                <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
                    <svg
                        ref={svgRef}
                        width={svgWidth * zoom}
                        height={(totalHeight + 40) * zoom}
                        style={{ display: 'block', minHeight: '100%' }}
                        viewBox={`0 0 ${svgWidth} ${totalHeight + 40}`}
                    >
                        <defs>
                            <marker id="sg-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="#333" />
                            </marker>
                            <marker id="sg-arrow-hl" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="#c9a84c" />
                            </marker>
                            <marker id="sg-arrow-flow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill={flowData?.flow.color || '#c9a84c'} />
                            </marker>
                        </defs>

                        {/* ── Lane backgrounds ── */}
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
                                            fontFamily={mono} letterSpacing="0.12em">
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
                            const inFlow = isEdgeInFlow(edge.from, edge.to);
                            const isHighlighted = hovered && (edge.from === hovered.id || edge.to === hovered.id);
                            const dimmed = flowData && !inFlow && !isHighlighted;

                            return (
                                <g key={`edge-${i}`}>
                                    {/* Flow glow effect */}
                                    {inFlow && (
                                        <path d={path} fill="none"
                                            stroke={flowData.flow.color} strokeWidth={4} opacity={0.15}
                                        />
                                    )}
                                    <path
                                        d={path} fill="none"
                                        stroke={inFlow ? flowData.flow.color : isHighlighted ? '#c9a84c' : dimmed ? '#151525' : '#222'}
                                        strokeWidth={inFlow ? 2.5 : isHighlighted ? 2 : 1}
                                        strokeDasharray={inFlow || isHighlighted ? 'none' : '4 4'}
                                        markerEnd={inFlow ? 'url(#sg-arrow-flow)' : isHighlighted ? 'url(#sg-arrow-hl)' : 'url(#sg-arrow)'}
                                        style={{ transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s' }}
                                        opacity={dimmed ? 0.3 : 1}
                                    />
                                    {(isHighlighted || inFlow) && (
                                        <text
                                            x={positions[edge.from] ? positions[edge.from].x + positions[edge.from].w + 12 : 0}
                                            y={positions[edge.from] ? positions[edge.from].y + positions[edge.from].h / 2 - 6 : 0}
                                            fill={inFlow ? flowData.flow.color + 'aa' : '#c9a84c88'}
                                            fontSize={8} fontFamily={mono}
                                        >
                                            {edge.label}
                                        </text>
                                    )}
                                </g>
                            );
                        })}

                        {/* ── Nodes ── */}
                        {allNodes.map(node => {
                            const pos = positions[node.id];
                            if (!pos) return null;
                            const colors = TYPE_COLORS[node.type] || TYPE_COLORS.view;
                            const isHovered = hovered?.id === node.id;
                            const inFlow = isNodeInFlow(node.id);
                            const isUnused = node.status === 'unused';
                            const dimmed = flowData && !inFlow && !isHovered;
                            const opacity = dimmed ? 0.15 : isUnused ? 0.4 : 1;

                            // Flow step number
                            let flowStep = null;
                            if (flowData && inFlow) {
                                const idx = flowData.flow.path.indexOf(node.id);
                                if (idx >= 0) flowStep = idx + 1;
                            }

                            return (
                                <g
                                    key={node.id}
                                    style={{ cursor: 'pointer', opacity, transition: 'opacity 0.2s' }}
                                    onMouseEnter={() => setHovered(node)}
                                    onClick={() => handleNodeClick(node)}
                                >
                                    {/* Glow */}
                                    {(isHovered || (inFlow && flowData)) && (
                                        <rect
                                            x={pos.x - 3} y={pos.y - 3}
                                            width={pos.w + 6} height={pos.h + 6}
                                            rx={8} fill={inFlow && flowData ? flowData.flow.color + '18' : colors.glow}
                                        />
                                    )}
                                    {/* Background */}
                                    <rect
                                        x={pos.x} y={pos.y} width={pos.w} height={pos.h}
                                        rx={5}
                                        fill={isHovered ? colors.bg : inFlow && flowData ? '#0d0d18' : '#0d0d18'}
                                        stroke={inFlow && flowData ? flowData.flow.color : isHovered ? colors.border : (isUnused ? '#333' : colors.border + '88')}
                                        strokeWidth={inFlow && flowData ? 2 : isHovered ? 2 : 1}
                                        style={{ transition: 'all 0.15s' }}
                                    />
                                    {/* Flow step badge */}
                                    {flowStep && (
                                        <g>
                                            <circle cx={pos.x - 2} cy={pos.y - 2} r={8}
                                                fill={flowData.flow.color} />
                                            <text x={pos.x - 2} y={pos.y + 2} fill="#000"
                                                fontSize={9} fontWeight={700} fontFamily={mono}
                                                textAnchor="middle">{flowStep}</text>
                                        </g>
                                    )}
                                    {/* Status dot */}
                                    <circle cx={pos.x + 12} cy={pos.y + pos.h / 2} r={3}
                                        fill={STATUS_DOT[node.status] || '#666'} />
                                    {/* Label */}
                                    <text
                                        x={pos.x + 22} y={pos.y + pos.h / 2 + 4}
                                        fill={inFlow && flowData ? flowData.flow.color : isHovered ? colors.text : (isUnused ? '#555' : '#aaa')}
                                        fontSize={10} fontWeight={isHovered || (inFlow && flowData) ? 700 : 400}
                                        fontFamily={mono} style={{ transition: 'fill 0.15s' }}
                                    >
                                        {node.label}
                                    </text>
                                    {/* Type badge */}
                                    <text
                                        x={pos.x + pos.w - 8} y={pos.y + 12}
                                        fill={colors.border + '55'} fontSize={7}
                                        fontFamily={mono} textAnchor="end"
                                    >{node.type.toUpperCase()}</text>
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {/* ── Minimap ── */}
                <div style={{
                    position: 'absolute', bottom: 12, right: 12,
                    width: 120, height: 80, background: 'rgba(10,10,18,0.9)',
                    border: '1px solid #333', borderRadius: 4, padding: 4,
                    pointerEvents: 'none',
                }}>
                    <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${totalHeight}`} preserveAspectRatio="xMidYMid meet">
                        {allNodes.map(node => {
                            const pos = positions[node.id];
                            if (!pos) return null;
                            const colors = TYPE_COLORS[node.type] || TYPE_COLORS.view;
                            const inFlow = isNodeInFlow(node.id);
                            return (
                                <rect key={node.id}
                                    x={pos.x} y={pos.y} width={pos.w} height={pos.h}
                                    rx={2}
                                    fill={inFlow && flowData ? flowData.flow.color + '44' : colors.border + '33'}
                                    stroke={inFlow && flowData ? flowData.flow.color : colors.border + '66'}
                                    strokeWidth={1}
                                />
                            );
                        })}
                        {EDGES.map((edge, i) => {
                            const path = getEdgePath(edge.from, edge.to);
                            if (!path) return null;
                            const inFlow = isEdgeInFlow(edge.from, edge.to);
                            return (
                                <path key={i} d={path} fill="none"
                                    stroke={inFlow && flowData ? flowData.flow.color + '66' : '#333'}
                                    strokeWidth={inFlow ? 2 : 0.5}
                                />
                            );
                        })}
                    </svg>
                    <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 7, color: '#555' }}>MINIMAP</div>
                </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color + '33', border: `1px solid ${color}` }} />
            <span style={{ fontSize: 9, color: '#888' }}>{label}</span>
        </div>
    );
}
