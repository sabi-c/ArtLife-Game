/**
 * FlowEditor.jsx — Visual node-based page transition graph
 *
 * Renders all VIEWs, OVERLAYs, and Phaser scenes as draggable nodes
 * on a canvas, connected by bezier curves representing transitions.
 *
 * Data model stored in cmsStore.flowGraph:
 *   { nodes: [{ id, type, label, x, y }], edges: [{ from, to, label, action }] }
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { VIEW, OVERLAY } from '../../core/views.js';
import { useCmsStore } from '../../stores/cmsStore.js';
import { navigate } from '../../hooks/usePageRouter.js';

// ══════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════

const NODE_W = 160;
const NODE_H = 48;
const PORT_R = 6;
const GRID_SIZE = 20;

const TYPE_COLORS = {
    view: { bg: '#1a1508', border: '#c9a84c', text: '#c9a84c', port: '#c9a84c' },
    overlay: { bg: '#0a1020', border: '#4488cc', text: '#88bbff', port: '#4488cc' },
    scene: { bg: '#081a10', border: '#4ade80', text: '#4ade80', port: '#4ade80' },
};

// All known Phaser scenes (from phaserInit.js)
const PHASER_SCENES = [
    'BootScene', 'TitleScene', 'IntroScene', 'NewWorldScene',
    'OverworldScene', 'CityScene', 'LocationScene', 'HaggleScene',
    'DialogueScene', 'MacDialogueScene', 'FastTravelScene',
    'WorldScene', 'MenuScene', 'EndScene',
];

const DEFAULT_EDGES = [
    // ── Main User Flow (SPLASH → NARRATIVE → LOGIN → Bloomberg → Market/Overworld) ──
    { from: 'VIEW:SPLASH', to: 'VIEW:NARRATIVE', label: 'Click / Tap', action: 'setActiveView' },
    { from: 'VIEW:NARRATIVE', to: 'VIEW:BOOT', label: 'Continue', action: 'setActiveView' },
    { from: 'VIEW:BOOT', to: 'VIEW:BLOOMBERG', label: 'Login Success', action: 'onLoginComplete → setActiveView' },
    { from: 'VIEW:BLOOMBERG', to: 'VIEW:ARTNET_HUB', label: '🌐 Browse Market', action: 'setActiveView' },
    { from: 'VIEW:BLOOMBERG', to: 'VIEW:PHASER', label: '🗺️ Explore World', action: 'DEBUG_LAUNCH_SCENE + setActiveView' },
    { from: 'VIEW:ARTNET_HUB', to: 'VIEW:BLOOMBERG', label: 'Back', action: 'setActiveView' },
    { from: 'VIEW:ARTNET_HUB', to: 'VIEW:PHASER', label: 'Explore', action: 'DEBUG_LAUNCH_SCENE + setActiveView' },
    // ── Character Creator (from 'new' login action) ──
    { from: 'VIEW:BOOT', to: 'VIEW:CHARACTER_CREATOR', label: 'New Game', action: 'onLoginComplete' },
    { from: 'VIEW:CHARACTER_CREATOR', to: 'VIEW:TERMINAL', label: 'Done', action: 'navigate' },
    // ── Phaser Scenes (BootScene preloads, NewWorldScene is the overworld) ──
    { from: 'SCENE:BootScene', to: 'SCENE:NewWorldScene', label: 'startPhaserGame(overworld)', action: 'scene.start' },
    // ── Overworld exits ──
    { from: 'SCENE:NewWorldScene', to: 'VIEW:DASHBOARD', label: 'ESC / Exit', action: 'GameEventBus UI_ROUTE' },
    { from: 'SCENE:NewWorldScene', to: 'SCENE:CityScene', label: 'Warp (dungeon)', action: 'GameEventBus LAUNCH_SCENE' },
    // ── City flow ──
    { from: 'SCENE:CityScene', to: 'SCENE:LocationScene', label: 'Enter Location', action: 'scene.start' },
    { from: 'SCENE:CityScene', to: 'SCENE:FastTravelScene', label: 'Fast Travel', action: 'scene.launch' },
    { from: 'SCENE:CityScene', to: 'VIEW:TERMINAL', label: 'Leave City', action: 'GameEventBus UI_ROUTE' },
    // ── Location flow ──
    { from: 'SCENE:LocationScene', to: 'SCENE:HaggleScene', label: 'Buy/Sell Art', action: 'scene.start' },
    { from: 'SCENE:LocationScene', to: 'SCENE:DialogueScene', label: 'Talk to NPC', action: 'scene.launch' },
    // ── Haggle / Dialogue exits ──
    { from: 'SCENE:HaggleScene', to: 'VIEW:TERMINAL', label: 'Finish Haggle', action: 'GameEventBus UI_ROUTE' },
    { from: 'SCENE:DialogueScene', to: 'VIEW:TERMINAL', label: 'End Dialogue', action: 'GameEventBus UI_ROUTE' },
    { from: 'SCENE:MacDialogueScene', to: 'VIEW:TERMINAL', label: 'End Dialogue', action: 'GameEventBus UI_ROUTE' },
    // ── World scenes ──
    { from: 'SCENE:FastTravelScene', to: 'SCENE:LocationScene', label: 'Arrive', action: 'scene.start' },
    // ── End game ──
    { from: 'SCENE:EndScene', to: 'SCENE:MenuScene', label: 'Restart', action: 'scene.start' },
    // ── Overlays ──
    { from: 'OVERLAY:MASTER_CMS', to: 'VIEW:TERMINAL', label: 'Close', action: 'navigate' },
];

// ══════════════════════════════════════════════════════════════
// Node metadata — file paths, descriptions, and status
// ══════════════════════════════════════════════════════════════
const NODE_META = {
    // ── Views (React full-page states) ──
    'VIEW:SPLASH': { file: 'ui/boot/BootSplash.jsx', status: 'active', desc: 'Animated tiled computer splash — entry point' },
    'VIEW:NARRATIVE': { file: 'ui/boot/NarrativeIntro.jsx', status: 'active', desc: '"$67 million" typewriter intro text' },
    'VIEW:BOOT': { file: 'ui/boot/ArtnetLogin.jsx', status: 'active', desc: 'Artnet-style email login screen' },
    'VIEW:BLOOMBERG': { file: 'ui/market/BloombergTerminal.jsx', status: 'active', desc: 'Bloomberg Terminal full-page hub — Market + Overworld buttons' },
    'VIEW:ARTNET_HUB': { file: 'ui/market/ArtnetMarketplace.jsx', status: 'active', desc: 'Artnet-style marketplace browser' },
    'VIEW:PHASER': { file: 'phaserInit.js', status: 'active', desc: 'Raw Phaser canvas (overworld, haggle, etc.)' },
    'VIEW:TERMINAL': { file: 'ui/terminal/TerminalUI.js', status: 'active', desc: 'DOM terminal — text menus, dashboard, events' },
    'VIEW:DASHBOARD': { file: 'ui/player/PlayerDashboard.jsx', status: 'active', desc: 'React stats & ledger overlay' },
    'VIEW:SCENE_ENGINE': { file: 'ui/game/ScenePlayer.jsx', status: 'active', desc: 'Visual-novel cutscene player' },
    'VIEW:CHARACTER_CREATOR': { file: 'ui/boot/CharacterCreator.jsx', status: 'active', desc: 'React character creation flow' },
    // ── Phaser Scenes ──
    'SCENE:BootScene': { file: 'scenes/BootScene.js', status: 'active', desc: 'Asset preloader — defines startPhaserGame()' },
    'SCENE:TitleScene': { file: 'scenes/TitleScene.js', status: 'unused', desc: 'Legacy graphical title screen (replaced by BootSplash)' },
    'SCENE:IntroScene': { file: 'scenes/IntroScene.js', status: 'unused', desc: 'Legacy story intro (replaced by NarrativeIntro)' },
    'SCENE:NewWorldScene': { file: 'scenes/NewWorldScene.js', status: 'active', desc: 'Larus overworld — NPCs, warps, dialogue, tilemap' },
    'SCENE:OverworldScene': { file: 'scenes/OverworldScene.js', status: 'unused', desc: 'Legacy grid-engine overworld (replaced by NewWorld)' },
    'SCENE:WorldScene': { file: 'scenes/WorldScene.js', status: 'unused', desc: 'Legacy infinite world (replaced by NewWorld)' },
    'SCENE:CityScene': { file: 'scenes/CityScene.js', status: 'active', desc: 'City hub — venue list, fast travel' },
    'SCENE:LocationScene': { file: 'scenes/LocationScene.js', status: 'active', desc: 'Venue interior — NPCs, artworks, haggle triggers' },
    'SCENE:HaggleScene': { file: 'scenes/HaggleScene.js', status: 'active', desc: 'Art dealing mini-game (buy/sell negotiation)' },
    'SCENE:DialogueScene': { file: 'scenes/DialogueScene.js', status: 'active', desc: 'Text-based dialogue with choices' },
    'SCENE:MacDialogueScene': { file: 'scenes/MacDialogueScene.js', status: 'active', desc: 'Visual over-the-shoulder dialogue' },
    'SCENE:FastTravelScene': { file: 'scenes/FastTravelScene.js', status: 'active', desc: 'City-to-city travel overlay' },
    'SCENE:MenuScene': { file: 'scenes/MenuScene.js', status: 'active', desc: 'Pause/settings menu' },
    'SCENE:EndScene': { file: 'scenes/EndScene.js', status: 'active', desc: 'Game over / final screen' },
    // ── Overlays ──
    'OVERLAY:ADMIN': { file: 'ui/AdminDashboard.jsx', status: 'active', desc: 'Admin panel — debug tools' },
    'OVERLAY:SETTINGS': { file: 'ui/SettingsPanel.jsx', status: 'active', desc: 'Game settings (audio, display)' },
    'OVERLAY:INVENTORY': { file: 'ui/InventoryPanel.jsx', status: 'active', desc: 'Player inventory grid' },
    'OVERLAY:DEBUG_LOG': { file: 'ui/DebugLog.jsx', status: 'active', desc: 'Real-time debug event log' },
    'OVERLAY:MASTER_CMS': { file: 'ui/cms/', status: 'active', desc: 'Content Management System' },
    'OVERLAY:MARKET_DASHBOARD': { file: 'ui/dashboard/', status: 'active', desc: 'Market analytics dashboard' },
    'OVERLAY:ARTWORK_DASHBOARD': { file: 'ui/ArtworkDashboard.jsx', status: 'planned', desc: 'Artwork detail viewer (planned)' },
    'OVERLAY:BLOOMBERG': { file: 'ui/market/BloombergTerminal.jsx', status: 'active', desc: 'Bloomberg-style market terminal (overlay variant)' },
    'OVERLAY:SALES_GRID': { file: 'ui/SalesGrid.jsx', status: 'planned', desc: 'Sales history grid (planned)' },
    'OVERLAY:DESIGN_GUIDE': { file: 'ui/DesignGuide.jsx', status: 'planned', desc: 'Visual design reference' },
    'OVERLAY:GMAIL_GUIDE': { file: 'ui/email/', status: 'active', desc: 'In-game email client' },
    'OVERLAY:ARTNET_LOGIN': { file: 'ui/boot/ArtnetLogin.jsx', status: 'active', desc: 'Artnet login overlay variant' },
    'OVERLAY:ARTNET_MARKETPLACE': { file: 'ui/market/ArtnetMarketplace.jsx', status: 'active', desc: 'Artnet marketplace overlay variant' },
    'OVERLAY:ARTNET_UI': { file: 'ui/ArtnetUI.jsx', status: 'planned', desc: 'Artnet UI shell' },
};

// ══════════════════════════════════════════════════════════════
// Generate default nodes from constants
// ══════════════════════════════════════════════════════════════

function generateDefaultNodes() {
    const nodes = [];

    // Views — left column (generous vertical spacing)
    Object.keys(VIEW).forEach((key, i) => {
        const meta = NODE_META[`VIEW:${key}`] || {};
        nodes.push({ id: `VIEW:${key}`, type: 'view', label: key, x: 80, y: 60 + i * 100, meta });
    });

    // Scenes — middle column (two sub-columns for readability)
    PHASER_SCENES.forEach((name, i) => {
        const col = i < 7 ? 0 : 1;
        const row = i < 7 ? i : i - 7;
        const meta = NODE_META[`SCENE:${name}`] || {};
        nodes.push({ id: `SCENE:${name}`, type: 'scene', label: name.replace('Scene', ''), x: 480 + col * 200, y: 60 + row * 80, meta });
    });

    // Overlays — right column (two sub-columns)
    const overlayKeys = Object.keys(OVERLAY).filter(k => OVERLAY[k] !== null);
    overlayKeys.forEach((key, i) => {
        const col = i < 8 ? 0 : 1;
        const row = i < 8 ? i : i - 8;
        const meta = NODE_META[`OVERLAY:${key}`] || {};
        nodes.push({ id: `OVERLAY:${key}`, type: 'overlay', label: key.replace(/_/g, ' '), x: 960 + col * 200, y: 60 + row * 72, meta });
    });

    return nodes;
}

// ══════════════════════════════════════════════════════════════
// FlowEditor component
// ══════════════════════════════════════════════════════════════

export default function FlowEditor({ flowGraph, onUpdate }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const saveFlowGraph = useCmsStore(s => s.saveFlowGraph);

    // Graph data — load from cmsStore first, then props, then defaults
    const savedGraph = useCmsStore(s => s.snapshots.flowGraph);
    const [nodes, setNodes] = useState(() => savedGraph?.nodes?.length > 0 ? savedGraph.nodes : (flowGraph?.nodes?.length > 0 ? flowGraph.nodes : generateDefaultNodes()));
    const [edges, setEdges] = useState(() => savedGraph?.edges?.length > 0 ? savedGraph.edges : (flowGraph?.edges?.length > 0 ? flowGraph.edges : DEFAULT_EDGES));

    // Interaction state
    const [dragNode, setDragNode] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [selectedNode, setSelectedNode] = useState(null);
    const [connectFrom, setConnectFrom] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [hoveredNode, setHoveredNode] = useState(null);
    const [showAddNode, setShowAddNode] = useState(false);
    const [editingLabel, setEditingLabel] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchRef = useRef(null);

    // Auto-save to cmsStore on every change
    useEffect(() => {
        const timer = setTimeout(() => {
            saveFlowGraph({ nodes, edges });
            if (onUpdate) onUpdate({ nodes, edges });
        }, 300); // debounce 300ms
        return () => clearTimeout(timer);
    }, [nodes, edges, saveFlowGraph, onUpdate]);

    // Add new node
    const addNewNode = (type, label) => {
        const id = `${type.toUpperCase()}:${label.replace(/\s+/g, '_')}`;
        if (nodes.some(n => n.id === id)) return; // already exists
        const maxX = Math.max(...nodes.map(n => n.x), 100);
        setNodes(prev => [...prev, { id, type, label, x: maxX + 220, y: 100 + Math.random() * 300 }]);
        setShowAddNode(false);
    };

    // Rename a node
    const renameNode = (nodeId, newLabel) => {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, label: newLabel } : n));
        setEditingLabel(null);
    };

    // Navigate to the page/overlay this node represents
    const navigateToNode = (node) => {
        if (node.type === 'overlay') {
            const overlayKey = node.id.replace('OVERLAY:', '');
            const pathMap = {
                'BLOOMBERG': '/market', 'ADMIN': '/admin', 'SETTINGS': '/settings',
                'INVENTORY': '/inventory', 'MASTER_CMS': '/cms', 'MARKET_DASHBOARD': '/market/data',
                'ARTWORK_DASHBOARD': '/artwork', 'SALES_GRID': '/sales', 'DEBUG_LOG': '/debug',
                'DESIGN_GUIDE': '/design', 'GMAIL_GUIDE': '/inbox',
                'ARTNET_LOGIN': '/artnet/login', 'ARTNET_MARKETPLACE': '/artnet',
                'ARTNET_UI': '/artnet/ui',
            };
            if (pathMap[overlayKey]) navigate(pathMap[overlayKey]);
        } else if (node.type === 'view') {
            const viewKey = node.id.replace('VIEW:', '');
            const pathMap = { 'BOOT': '/boot', 'TERMINAL': '/terminal', 'DASHBOARD': '/dashboard', 'CHARACTER_CREATOR': '/character', 'SCENE_ENGINE': '/scene' };
            if (pathMap[viewKey]) navigate(pathMap[viewKey]);
        }
    };

    // ── Coordinate transforms ──
    const screenToWorld = useCallback((sx, sy) => ({
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
    }), [pan, zoom]);

    const worldToScreen = useCallback((wx, wy) => ({
        x: wx * zoom + pan.x,
        y: wy * zoom + pan.y,
    }), [pan, zoom]);

    // ── Hit testing ──
    const hitTestNode = useCallback((wx, wy) => {
        for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            if (wx >= n.x && wx <= n.x + NODE_W && wy >= n.y && wy <= n.y + NODE_H) return n;
        }
        return null;
    }, [nodes]);

    const hitTestOutputPort = useCallback((wx, wy) => {
        for (const n of nodes) {
            const px = n.x + NODE_W;
            const py = n.y + NODE_H / 2;
            if (Math.hypot(wx - px, wy - py) < PORT_R * 2) return n;
        }
        return null;
    }, [nodes]);

    const hitTestInputPort = useCallback((wx, wy) => {
        for (const n of nodes) {
            const px = n.x;
            const py = n.y + NODE_H / 2;
            if (Math.hypot(wx - px, wy - py) < PORT_R * 2) return n;
        }
        return null;
    }, [nodes]);

    // ══════════════════════════════════════════════════════════
    // Canvas rendering
    // ══════════════════════════════════════════════════════════

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        // Grid — dot pattern (Figma-style)
        const gx0 = Math.floor(-pan.x / zoom / GRID_SIZE) * GRID_SIZE;
        const gy0 = Math.floor(-pan.y / zoom / GRID_SIZE) * GRID_SIZE;
        const gx1 = gx0 + width / zoom + GRID_SIZE * 2;
        const gy1 = gy0 + height / zoom + GRID_SIZE * 2;
        ctx.fillStyle = '#1e1e30';
        for (let x = gx0; x < gx1; x += GRID_SIZE) {
            for (let y = gy0; y < gy1; y += GRID_SIZE) {
                ctx.beginPath();
                ctx.arc(x, y, 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Edges
        const nodeMap = {};
        nodes.forEach(n => { nodeMap[n.id] = n; });

        edges.forEach(e => {
            const src = nodeMap[e.from];
            const dst = nodeMap[e.to];
            if (!src || !dst) return;

            const x1 = src.x + NODE_W;
            const y1 = src.y + NODE_H / 2;
            const x2 = dst.x;
            const y2 = dst.y + NODE_H / 2;
            const cp = Math.max(60, Math.abs(x2 - x1) * 0.4);

            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x1 + cp, y1, x2 - cp, y2, x2, y2);
            ctx.stroke();

            // Arrowhead
            const t = 0.95;
            const ax = (1 - t) ** 3 * x1 + 3 * (1 - t) ** 2 * t * (x1 + cp) + 3 * (1 - t) * t ** 2 * (x2 - cp) + t ** 3 * x2;
            const ay = (1 - t) ** 3 * y1 + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3 * y2;
            const angle = Math.atan2(y2 - ay, x2 - ax);
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - 8 * Math.cos(angle - 0.3), y2 - 8 * Math.sin(angle - 0.3));
            ctx.lineTo(x2 - 8 * Math.cos(angle + 0.3), y2 - 8 * Math.sin(angle + 0.3));
            ctx.fill();

            // Edge label
            if (e.label) {
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2 - 8;
                ctx.font = '9px "SF Mono", Courier, monospace';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.fillText(e.label, mx, my);
            }
        });

        // "Drawing" edge (connecting)
        if (connectFrom) {
            const src = nodeMap[connectFrom];
            if (src) {
                const x1 = src.x + NODE_W;
                const y1 = src.y + NODE_H / 2;
                const w = screenToWorld(mousePos.x, mousePos.y);
                const cp = Math.max(40, Math.abs(w.x - x1) * 0.4);
                ctx.strokeStyle = '#c9a84c88';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.bezierCurveTo(x1 + cp, y1, w.x - cp, w.y, w.x, w.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Nodes
        nodes.forEach(n => {
            const colors = TYPE_COLORS[n.type] || TYPE_COLORS.view;
            const isSelected = selectedNode === n.id;
            const isHovered = hoveredNode === n.id;
            const isUnused = n.meta?.status === 'unused';
            const isPlanned = n.meta?.status === 'planned';

            // Dim unused nodes
            ctx.globalAlpha = isUnused ? 0.4 : isPlanned ? 0.6 : 1;

            // Node body
            ctx.fillStyle = isHovered ? '#1a1a2e' : colors.bg;
            ctx.strokeStyle = isSelected ? '#fff' : colors.border;
            ctx.lineWidth = isSelected ? 2 : 1;
            if (isUnused) ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.roundRect(n.x, n.y, NODE_W, NODE_H, 4);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);

            // Status indicator
            if (isUnused || isPlanned) {
                const statusColor = isUnused ? '#c94040' : '#c9a84c';
                ctx.fillStyle = statusColor;
                ctx.beginPath();
                ctx.arc(n.x + NODE_W - 10, n.y + 10, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Type badge
            ctx.font = 'bold 8px "SF Mono", monospace';
            ctx.fillStyle = colors.border + '88';
            ctx.textAlign = 'left';
            ctx.fillText(n.type.toUpperCase(), n.x + 8, n.y + 14);

            // Label
            ctx.font = '11px "SF Mono", monospace';
            ctx.fillStyle = colors.text;
            ctx.fillText(n.label, n.x + 8, n.y + 32, NODE_W - 16);

            // Output port (right)
            ctx.fillStyle = colors.port;
            ctx.beginPath();
            ctx.arc(n.x + NODE_W, n.y + NODE_H / 2, PORT_R, 0, Math.PI * 2);
            ctx.fill();

            // Input port (left)
            ctx.strokeStyle = colors.port;
            ctx.lineWidth = 1.5;
            ctx.fillStyle = '#0a0a0f';
            ctx.beginPath();
            ctx.arc(n.x, n.y + NODE_H / 2, PORT_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.globalAlpha = 1;
        });

        ctx.restore();

        // HUD
        ctx.font = '10px "SF Mono", monospace';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'left';
        ctx.fillText(`${nodes.length} nodes · ${edges.length} edges · ${Math.round(zoom * 100)}%`, 12, height - 12);
    }, [nodes, edges, pan, zoom, selectedNode, hoveredNode, connectFrom, mousePos, screenToWorld]);

    // ── Render loop ──
    useEffect(() => {
        const id = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(id);
    }, [draw]);

    // ── Resize canvas ──
    useEffect(() => {
        const resize = () => {
            const c = containerRef.current;
            const canvas = canvasRef.current;
            if (!c || !canvas) return;
            canvas.width = c.clientWidth;
            canvas.height = c.clientHeight;
            draw();
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [draw]);

    // ══════════════════════════════════════════════════════════
    // Mouse handlers
    // ══════════════════════════════════════════════════════════

    const getCanvasXY = useCallback((e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }, []);

    const onMouseDown = useCallback((e) => {
        const { x: sx, y: sy } = getCanvasXY(e);
        const { x: wx, y: wy } = screenToWorld(sx, sy);

        // Right click or middle = pan
        if (e.button === 1 || e.button === 2) {
            setIsPanning(true);
            setPanStart({ x: sx - pan.x, y: sy - pan.y });
            return;
        }

        // Check output port hit (start connection)
        const portNode = hitTestOutputPort(wx, wy);
        if (portNode) {
            setConnectFrom(portNode.id);
            return;
        }

        // Check node hit (start drag)
        const hit = hitTestNode(wx, wy);
        if (hit) {
            setDragNode(hit.id);
            setDragOffset({ x: wx - hit.x, y: wy - hit.y });
            setSelectedNode(hit.id);
        } else {
            setSelectedNode(null);
            // Start panning
            setIsPanning(true);
            setPanStart({ x: sx - pan.x, y: sy - pan.y });
        }
    }, [getCanvasXY, screenToWorld, hitTestNode, hitTestOutputPort, pan]);

    const onMouseMove = useCallback((e) => {
        const { x: sx, y: sy } = getCanvasXY(e);
        setMousePos({ x: sx, y: sy });
        const { x: wx, y: wy } = screenToWorld(sx, sy);

        if (isPanning) {
            setPan({ x: sx - panStart.x, y: sy - panStart.y });
            return;
        }

        if (dragNode) {
            setNodes(prev => prev.map(n =>
                n.id === dragNode
                    ? { ...n, x: Math.round((wx - dragOffset.x) / GRID_SIZE) * GRID_SIZE, y: Math.round((wy - dragOffset.y) / GRID_SIZE) * GRID_SIZE }
                    : n
            ));
            return;
        }

        // Hover detection
        const hit = hitTestNode(wx, wy);
        setHoveredNode(hit?.id || null);
    }, [getCanvasXY, screenToWorld, isPanning, panStart, dragNode, dragOffset, hitTestNode]);

    const onMouseUp = useCallback((e) => {
        if (connectFrom) {
            const { x: sx, y: sy } = getCanvasXY(e);
            const { x: wx, y: wy } = screenToWorld(sx, sy);
            const target = hitTestInputPort(wx, wy);
            if (target && target.id !== connectFrom) {
                const already = edges.some(e => e.from === connectFrom && e.to === target.id);
                if (!already) {
                    const label = prompt('Edge label (e.g. "Press Start"):') || '';
                    setEdges(prev => [...prev, { from: connectFrom, to: target.id, label, action: 'manual' }]);
                }
            }
            setConnectFrom(null);
        }
        setDragNode(null);
        setIsPanning(false);
    }, [connectFrom, getCanvasXY, screenToWorld, hitTestInputPort, edges]);

    const onWheel = useCallback((e) => {
        e.preventDefault();
        const { x: sx, y: sy } = getCanvasXY(e);
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = Math.max(0.2, Math.min(3, zoom * zoomFactor));

        // Zoom toward cursor
        const wx = (sx - pan.x) / zoom;
        const wy = (sy - pan.y) / zoom;
        setPan({ x: sx - wx * newZoom, y: sy - wy * newZoom });
        setZoom(newZoom);
    }, [getCanvasXY, zoom, pan]);

    // ── Delete edge ──
    const deleteSelectedEdge = useCallback(() => {
        if (!selectedNode) return;
        setEdges(prev => prev.filter(e => e.from !== selectedNode && e.to !== selectedNode));
    }, [selectedNode]);

    // ── Reset layout ──
    const resetLayout = useCallback(() => {
        setNodes(generateDefaultNodes());
        setEdges(DEFAULT_EDGES);
        setPan({ x: 0, y: 0 });
        setZoom(1);
    }, []);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                setShowSearch(true);
                setTimeout(() => searchRef.current?.focus(), 50);
            }
            if (e.key === 'Escape' && showSearch) {
                setShowSearch(false);
                setSearchQuery('');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [showSearch]);

    // ── Search results ──
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return nodes.filter(n =>
            n.label.toLowerCase().includes(q) ||
            n.id.toLowerCase().includes(q) ||
            (n.meta?.desc || '').toLowerCase().includes(q)
        );
    }, [searchQuery, nodes]);

    // ── Fly camera to node ──
    const flyToNode = useCallback((node) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const targetZoom = 1.2;
        setZoom(targetZoom);
        setPan({
            x: canvas.width / 2 - (node.x + NODE_W / 2) * targetZoom,
            y: canvas.height / 2 - (node.y + NODE_H / 2) * targetZoom,
        });
        setSelectedNode(node.id);
        setShowSearch(false);
        setSearchQuery('');
    }, []);

    // ── Fit to view ──
    const fitToView = useCallback(() => {
        if (nodes.length === 0) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const minX = Math.min(...nodes.map(n => n.x)) - 40;
        const minY = Math.min(...nodes.map(n => n.y)) - 40;
        const maxX = Math.max(...nodes.map(n => n.x + NODE_W)) + 40;
        const maxY = Math.max(...nodes.map(n => n.y + NODE_H)) + 40;
        const graphW = maxX - minX;
        const graphH = maxY - minY;
        const newZoom = Math.min(canvas.width / graphW, canvas.height / graphH, 2);
        setZoom(newZoom);
        setPan({
            x: (canvas.width - graphW * newZoom) / 2 - minX * newZoom,
            y: (canvas.height - graphH * newZoom) / 2 - minY * newZoom,
        });
    }, [nodes]);

    // ══════════════════════════════════════════════════════════
    // Node Inspector
    // ══════════════════════════════════════════════════════════

    const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;
    const incomingEdges = selectedNode ? edges.filter(e => e.to === selectedNode) : [];
    const outgoingEdges = selectedNode ? edges.filter(e => e.from === selectedNode) : [];
    const allNodeIds = nodes.map(n => n.id);

    const addEdge = (targetId) => {
        if (!selectedNode || !targetId || selectedNode === targetId) return;
        const exists = edges.some(e => e.from === selectedNode && e.to === targetId);
        if (!exists) setEdges(prev => [...prev, { from: selectedNode, to: targetId, label: 'navigate' }]);
    };

    const removeEdge = (from, to) => {
        setEdges(prev => prev.filter(e => !(e.from === from && e.to === to)));
    };

    const updateEdgeLabel = (from, to, label) => {
        setEdges(prev => prev.map(e => e.from === from && e.to === to ? { ...e, label } : e));
    };

    const deleteNode = (nodeId) => {
        setNodes(prev => prev.filter(n => n.id !== nodeId));
        setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
        setSelectedNode(null);
    };

    // ══════════════════════════════════════════════════════════
    // Toolbar
    // ══════════════════════════════════════════════════════════

    const btnStyle = {
        background: 'none', border: '1px solid #333', color: '#888',
        fontFamily: "'SF Mono', monospace", fontSize: 10, padding: '5px 10px',
        cursor: 'pointer', letterSpacing: '0.1em',
    };

    const panelStyle = {
        position: 'absolute', top: 0, right: 0, width: 280, height: '100%',
        background: 'rgba(12, 12, 18, 0.97)', borderLeft: '1px solid #222',
        zIndex: 10, overflowY: 'auto', padding: '12px', boxSizing: 'border-box',
        fontFamily: "'SF Mono', monospace", fontSize: 11, color: '#ccc',
    };

    const sectionStyle = { marginBottom: 14, padding: '8px 0', borderBottom: '1px solid #1a1a25' };
    const labelStyle = { color: '#666', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 };
    const badgeStyle = (color) => ({
        display: 'inline-block', padding: '2px 8px', borderRadius: 3, fontSize: 10,
        background: color + '22', color, border: `1px solid ${color}44`, marginRight: 4, marginBottom: 4,
    });

    const edgeLabelOptions = ['navigate', 'open_overlay', 'close_overlay', 'start_scene', 'trigger_event', 'back'];

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 500, background: '#0a0a0f' }}>
            {/* Toolbar */}
            <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 5, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <button style={btnStyle} onClick={fitToView} title="Zoom to fit all nodes">⊞ FIT</button>
                <button style={btnStyle} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset to 100% zoom">⊡ 100%</button>
                <button style={{ ...btnStyle, color: '#50c878', borderColor: '#50c87866' }}
                    onClick={() => setShowAddNode(!showAddNode)} title="Add a new node">+ NODE</button>
                <button style={btnStyle} onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50); }} title="Search nodes (⌘F)">🔍</button>
                <button style={{ ...btnStyle, borderColor: '#c94040', color: '#c94040' }} onClick={resetLayout} title="Reset to default layout">↻ RESET</button>
                {selectedNode && edges.some(e => e.from === selectedNode || e.to === selectedNode) && (
                    <button style={{ ...btnStyle, borderColor: '#c94040', color: '#f87171' }}
                        onClick={deleteSelectedEdge}>DEL EDGES ({selectedNode.split(':')[1]})</button>
                )}
                <span style={{ fontSize: 9, color: '#333', fontFamily: "'SF Mono', monospace", marginLeft: 8 }}>
                    {nodes.length} nodes · {edges.length} edges · {Math.round(zoom * 100)}%
                </span>
            </div>

            {/* Add Node Popup */}
            {showAddNode && (
                <div style={{ position: 'absolute', top: 36, left: 8, zIndex: 20, background: '#111', border: '1px solid #333', padding: 12, borderRadius: 4, width: 220 }}>
                    <div style={{ fontSize: 10, color: '#888', marginBottom: 8, fontFamily: "'SF Mono', monospace" }}>ADD NEW NODE</div>
                    {['view', 'overlay', 'scene'].map(type => (
                        <div key={type} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <input id={`add-${type}-input`} placeholder={`New ${type} name...`}
                                    style={{ flex: 1, background: '#0a0a0f', color: TYPE_COLORS[type].text, border: `1px solid ${TYPE_COLORS[type].border}44`, fontSize: 10, padding: '4px 6px', fontFamily: "'SF Mono', monospace" }}
                                    onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { addNewNode(type, e.target.value); e.target.value = ''; } }} />
                                <button onClick={() => { const el = document.getElementById(`add-${type}-input`); if (el?.value) { addNewNode(type, el.value); el.value = ''; } }}
                                    style={{ ...btnStyle, padding: '3px 8px', color: TYPE_COLORS[type].text, borderColor: TYPE_COLORS[type].border + '44' }}>+</button>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => setShowAddNode(false)} style={{ ...btnStyle, width: '100%', marginTop: 4, fontSize: 9, color: '#555' }}>CLOSE</button>
                </div>
            )}
            {/* Legend */}
            <div style={{ position: 'absolute', top: 8, right: selectedNodeData ? 290 : 8, zIndex: 5, display: 'flex', gap: 12, fontSize: 10, fontFamily: "'SF Mono', monospace", transition: 'right 0.2s' }}>
                <span style={{ color: TYPE_COLORS.view.text }}>● VIEW</span>
                <span style={{ color: TYPE_COLORS.scene.text }}>● SCENE</span>
                <span style={{ color: TYPE_COLORS.overlay.text }}>● OVERLAY</span>
            </div>
            {/* Help */}
            <div style={{ position: 'absolute', bottom: 8, right: selectedNodeData ? 290 : 8, zIndex: 5, fontSize: 9, color: '#444', fontFamily: "'SF Mono', monospace", textAlign: 'right', lineHeight: 1.8, transition: 'right 0.2s' }}>
                Drag node to move · Drag output → input to connect · Scroll to zoom · Click node to inspect
            </div>

            {/* ── Node Inspector Panel ── */}
            {selectedNodeData && (
                <div style={panelStyle}>
                    {/* Header with editable label */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        {editingLabel === selectedNodeData.id ? (
                            <input autoFocus
                                defaultValue={selectedNodeData.label}
                                onBlur={e => renameNode(selectedNodeData.id, e.target.value || selectedNodeData.label)}
                                onKeyDown={e => { if (e.key === 'Enter') renameNode(selectedNodeData.id, e.target.value || selectedNodeData.label); if (e.key === 'Escape') setEditingLabel(null); }}
                                style={{ flex: 1, background: '#111', color: TYPE_COLORS[selectedNodeData.type]?.text || '#ccc', border: '1px solid #333', fontSize: 13, fontWeight: 'bold', padding: '2px 6px', fontFamily: "'SF Mono', monospace", marginRight: 6 }} />
                        ) : (
                            <div onClick={() => setEditingLabel(selectedNodeData.id)}
                                style={{ fontWeight: 'bold', color: TYPE_COLORS[selectedNodeData.type]?.text || '#ccc', fontSize: 13, cursor: 'text', flex: 1 }}
                                title="Click to rename">
                                {selectedNodeData.label} ✏️
                            </div>
                        )}
                        <button onClick={() => setSelectedNode(null)} style={{ ...btnStyle, padding: '2px 6px', fontSize: 9 }}>✕</button>
                    </div>

                    {/* Navigate to page button */}
                    {(selectedNodeData.type === 'overlay' || selectedNodeData.type === 'view') && (
                        <button onClick={() => navigateToNode(selectedNodeData)}
                            style={{ ...btnStyle, width: '100%', marginBottom: 10, padding: '6px', color: '#50c878', borderColor: '#50c87844', fontSize: 10, textAlign: 'center', justifyContent: 'center' }}>
                            → OPEN THIS PAGE
                        </button>
                    )}

                    {/* Type + Status */}
                    <div style={sectionStyle}>
                        <div style={labelStyle}>Type</div>
                        <span style={badgeStyle(TYPE_COLORS[selectedNodeData.type]?.text || '#888')}>
                            {selectedNodeData.type.toUpperCase()}
                        </span>
                        {selectedNodeData.meta?.status && (
                            <span style={badgeStyle(
                                selectedNodeData.meta.status === 'active' ? '#50c878' :
                                    selectedNodeData.meta.status === 'unused' ? '#c94040' : '#c9a84c'
                            )}>
                                {selectedNodeData.meta.status.toUpperCase()}
                            </span>
                        )}
                        <span style={{ color: '#555', fontSize: 9, display: 'block', marginTop: 4 }}>{selectedNodeData.id}</span>
                    </div>

                    {/* File path */}
                    {selectedNodeData.meta?.file && (
                        <div style={sectionStyle}>
                            <div style={labelStyle}>Source File</div>
                            <div style={{ color: '#88bbdd', fontSize: 10, wordBreak: 'break-all', cursor: 'default' }}>
                                src/{selectedNodeData.meta.file}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {selectedNodeData.meta?.desc && (
                        <div style={sectionStyle}>
                            <div style={labelStyle}>Description</div>
                            <div style={{ color: '#aaa', fontSize: 10, lineHeight: 1.5 }}>
                                {selectedNodeData.meta.desc}
                            </div>
                        </div>
                    )}

                    {/* Status selector */}
                    <div style={sectionStyle}>
                        <div style={labelStyle}>Status</div>
                        <select
                            value={selectedNodeData.meta?.status || 'active'}
                            onChange={(e) => {
                                setNodes(prev => prev.map(n =>
                                    n.id === selectedNodeData.id
                                        ? { ...n, meta: { ...n.meta, status: e.target.value } }
                                        : n
                                ));
                            }}
                            style={{ background: '#111', color: '#aaa', border: '1px solid #333', fontSize: 10, padding: '4px 8px', width: '100%', fontFamily: "'SF Mono', monospace" }}
                        >
                            <option value="active">✅ Active — in use</option>
                            <option value="unused">🔴 Unused — can be removed</option>
                            <option value="planned">🟡 Planned — not yet built</option>
                        </select>
                    </div>

                    {/* Incoming connections */}
                    <div style={sectionStyle}>
                        <div style={labelStyle}>Incoming ({incomingEdges.length})</div>
                        {incomingEdges.length === 0 && <div style={{ color: '#444', fontStyle: 'italic' }}>No incoming edges</div>}
                        {incomingEdges.map((e, i) => {
                            const fromNode = nodes.find(n => n.id === e.from);
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                    <span style={{ color: TYPE_COLORS[fromNode?.type]?.text || '#888' }}>
                                        ← {fromNode?.label || e.from}
                                    </span>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                        <select value={e.label || 'navigate'}
                                            onChange={(ev) => updateEdgeLabel(e.from, e.to, ev.target.value)}
                                            style={{ background: '#111', color: '#888', border: '1px solid #333', fontSize: 9, padding: '2px 4px' }}>
                                            {edgeLabelOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                        <button onClick={() => removeEdge(e.from, e.to)}
                                            style={{ ...btnStyle, padding: '1px 5px', color: '#c94040', borderColor: '#c9404044' }}>✕</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Outgoing connections */}
                    <div style={sectionStyle}>
                        <div style={labelStyle}>Outgoing ({outgoingEdges.length})</div>
                        {outgoingEdges.length === 0 && <div style={{ color: '#444', fontStyle: 'italic' }}>No outgoing edges</div>}
                        {outgoingEdges.map((e, i) => {
                            const toNode = nodes.find(n => n.id === e.to);
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                    <span style={{ color: TYPE_COLORS[toNode?.type]?.text || '#888' }}>
                                        → {toNode?.label || e.to}
                                    </span>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                        <select value={e.label || 'navigate'}
                                            onChange={(ev) => updateEdgeLabel(e.from, e.to, ev.target.value)}
                                            style={{ background: '#111', color: '#888', border: '1px solid #333', fontSize: 9, padding: '2px 4px' }}>
                                            {edgeLabelOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                        <button onClick={() => removeEdge(e.from, e.to)}
                                            style={{ ...btnStyle, padding: '1px 5px', color: '#c94040', borderColor: '#c9404044' }}>✕</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add new edge */}
                    <div style={sectionStyle}>
                        <div style={labelStyle}>Add Connection</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <select id="flow-add-target"
                                style={{ flex: 1, background: '#111', color: '#888', border: '1px solid #333', fontSize: 10, padding: '4px' }}>
                                <option value="">Select target...</option>
                                {allNodeIds
                                    .filter(id => id !== selectedNode && !outgoingEdges.some(e => e.to === id))
                                    .sort()
                                    .map(id => {
                                        const n = nodes.find(nn => nn.id === id);
                                        return <option key={id} value={id}>{n?.label || id}</option>;
                                    })}
                            </select>
                            <button onClick={() => {
                                const sel = document.getElementById('flow-add-target');
                                if (sel?.value) { addEdge(sel.value); sel.value = ''; }
                            }} style={{ ...btnStyle, color: '#50c878', borderColor: '#50c87844' }}>+</button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={sectionStyle}>
                        <div style={labelStyle}>Actions</div>
                        <button onClick={() => deleteNode(selectedNodeData.id)}
                            style={{ ...btnStyle, width: '100%', color: '#c94040', borderColor: '#c9404044', fontSize: 10, padding: '6px' }}>
                            Delete Node
                        </button>
                    </div>

                    {/* Node position */}
                    <div style={{ color: '#333', fontSize: 9, marginTop: 8 }}>
                        pos: ({Math.round(selectedNodeData.x)}, {Math.round(selectedNodeData.y)})
                    </div>
                </div>
            )}

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                style={{ display: 'block', width: selectedNodeData ? 'calc(100% - 280px)' : '100%', height: '100%', cursor: isPanning ? 'grabbing' : dragNode ? 'move' : connectFrom ? 'crosshair' : 'default', transition: 'width 0.2s' }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onWheel={onWheel}
                onContextMenu={e => e.preventDefault()}
            />

            {/* ── Minimap ── */}
            <div style={{
                position: 'absolute', bottom: 12, left: 12,
                width: 140, height: 90, background: 'rgba(10,10,18,0.92)',
                border: '1px solid #333', borderRadius: 4, padding: 4, zIndex: 6,
                pointerEvents: 'none',
            }}>
                {nodes.length > 0 && (() => {
                    const minX = Math.min(...nodes.map(n => n.x)) - 20;
                    const minY = Math.min(...nodes.map(n => n.y)) - 20;
                    const maxX = Math.max(...nodes.map(n => n.x + NODE_W)) + 20;
                    const maxY = Math.max(...nodes.map(n => n.y + NODE_H)) + 20;
                    const gw = maxX - minX || 1;
                    const gh = maxY - minY || 1;
                    const scale = Math.min(132 / gw, 82 / gh);
                    return (
                        <svg width={132} height={82} viewBox={`${minX} ${minY} ${gw} ${gh}`} preserveAspectRatio="xMidYMid meet">
                            {edges.map((e, i) => {
                                const src = nodes.find(n => n.id === e.from);
                                const dst = nodes.find(n => n.id === e.to);
                                if (!src || !dst) return null;
                                return (
                                    <line key={i}
                                        x1={src.x + NODE_W} y1={src.y + NODE_H / 2}
                                        x2={dst.x} y2={dst.y + NODE_H / 2}
                                        stroke="#333" strokeWidth={2 / scale}
                                    />
                                );
                            })}
                            {nodes.map(n => (
                                <rect key={n.id}
                                    x={n.x} y={n.y} width={NODE_W} height={NODE_H}
                                    rx={2} fill={(TYPE_COLORS[n.type]?.border || '#888') + '44'}
                                    stroke={(TYPE_COLORS[n.type]?.border || '#888') + '88'}
                                    strokeWidth={selectedNode === n.id ? 3 / scale : 1 / scale}
                                />
                            ))}
                        </svg>
                    );
                })()}
                <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 7, color: '#444' }}>MINIMAP</div>
            </div>

            {/* ── Search Overlay (Cmd+F) ── */}
            {showSearch && (
                <div style={{
                    position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
                    width: 360, zIndex: 30, background: 'rgba(15,15,22,0.98)',
                    border: '1px solid #c9a84c55', borderRadius: 8, padding: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>🔍</span>
                        <input
                            ref={searchRef}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search nodes..."
                            style={{
                                flex: 1, background: '#111', border: '1px solid #333',
                                color: '#eee', fontSize: 13, padding: '8px 12px',
                                fontFamily: "'SF Mono', monospace", borderRadius: 4, outline: 'none',
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); }
                                if (e.key === 'Enter' && searchResults.length > 0) flyToNode(searchResults[0]);
                            }}
                        />
                        <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} style={{
                            ...btnStyle, padding: '6px 10px', fontSize: 11,
                        }}>✕</button>
                    </div>
                    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                        {searchQuery && searchResults.length === 0 && (
                            <div style={{ color: '#555', fontSize: 10, padding: '8px 0', textAlign: 'center' }}>No results</div>
                        )}
                        {searchResults.map(node => (
                            <div key={node.id}
                                onClick={() => flyToNode(node)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 10px', cursor: 'pointer', borderRadius: 4,
                                    background: 'transparent',
                                    borderBottom: '1px solid #1a1a25',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#1a1a2e'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: TYPE_COLORS[node.type]?.border || '#888',
                                    flexShrink: 0,
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 11, color: TYPE_COLORS[node.type]?.text || '#ccc', fontWeight: 600 }}>
                                        {node.label}
                                    </div>
                                    <div style={{ fontSize: 9, color: '#555' }}>
                                        {node.type.toUpperCase()} · {node.meta?.desc?.substring(0, 50) || node.id}
                                    </div>
                                </div>
                                <span style={{ fontSize: 8, color: '#444' }}>↵</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: 8, color: '#333', marginTop: 6, textAlign: 'center' }}>
                        ⌘F Search · Enter to fly · Esc to close
                    </div>
                </div>
            )}
        </div>
    );
}
