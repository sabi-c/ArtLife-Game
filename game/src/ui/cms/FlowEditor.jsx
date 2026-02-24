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
import { VIEW, OVERLAY } from '../../constants/views.js';

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
    'BootScene', 'TitleScene', 'IntroScene', 'HaggleScene', 'LocationScene',
    'DialogueScene', 'MacDialogueScene', 'OverworldScene', 'CityScene',
    'MenuScene', 'EndScene', 'FastTravelScene', 'WorldScene',
];

// Pre-detected transitions from codebase analysis
const DEFAULT_EDGES = [
    { from: 'SCENE:BootScene', to: 'VIEW:CHARACTER_CREATOR', label: 'Select Character', action: 'UI_ROUTE' },
    { from: 'SCENE:IntroScene', to: 'VIEW:BOOT', label: 'Finish Intro', action: 'UI_ROUTE' },
    { from: 'SCENE:MacDialogueScene', to: 'VIEW:TERMINAL', label: 'End Dialogue', action: 'UI_ROUTE' },
    { from: 'SCENE:DialogueScene', to: 'VIEW:TERMINAL', label: 'End Dialogue', action: 'UI_ROUTE' },
    { from: 'SCENE:HaggleScene', to: 'VIEW:TERMINAL', label: 'Finish Haggle', action: 'UI_ROUTE' },
    { from: 'SCENE:WorldScene', to: 'VIEW:TERMINAL', label: 'Exit World', action: 'UI_ROUTE' },
    { from: 'SCENE:CityScene', to: 'VIEW:TERMINAL', label: 'Leave City', action: 'UI_ROUTE' },
    { from: 'SCENE:LocationScene', to: 'VIEW:TERMINAL', label: 'Exit Location', action: 'UI_ROUTE' },
    { from: 'SCENE:OverworldScene', to: 'VIEW:TERMINAL', label: 'Exit Overworld', action: 'UI_ROUTE' },
    { from: 'VIEW:CHARACTER_CREATOR', to: 'VIEW:TERMINAL', label: 'Creator Done', action: 'UI_ROUTE' },
    { from: 'VIEW:TERMINAL', to: 'VIEW:PHASER', label: 'Enter World', action: 'UI_ROUTE' },
    { from: 'OVERLAY:BLOOMBERG', to: 'VIEW:TERMINAL', label: 'Close Terminal', action: 'UI_ROUTE' },
];

// ══════════════════════════════════════════════════════════════
// Generate default nodes from constants
// ══════════════════════════════════════════════════════════════

function generateDefaultNodes() {
    const nodes = [];

    // Views — left column (generous vertical spacing)
    Object.keys(VIEW).forEach((key, i) => {
        nodes.push({ id: `VIEW:${key}`, type: 'view', label: key, x: 80, y: 60 + i * 100 });
    });

    // Scenes — middle column (two sub-columns for readability)
    PHASER_SCENES.forEach((name, i) => {
        const col = i < 7 ? 0 : 1;
        const row = i < 7 ? i : i - 7;
        nodes.push({ id: `SCENE:${name}`, type: 'scene', label: name.replace('Scene', ''), x: 480 + col * 200, y: 60 + row * 80 });
    });

    // Overlays — right column (two sub-columns)
    const overlayKeys = Object.keys(OVERLAY).filter(k => OVERLAY[k] !== null);
    overlayKeys.forEach((key, i) => {
        const col = i < 8 ? 0 : 1;
        const row = i < 8 ? i : i - 8;
        nodes.push({ id: `OVERLAY:${key}`, type: 'overlay', label: key.replace(/_/g, ' '), x: 960 + col * 200, y: 60 + row * 72 });
    });

    return nodes;
}

// ══════════════════════════════════════════════════════════════
// FlowEditor component
// ══════════════════════════════════════════════════════════════

export default function FlowEditor({ flowGraph, onUpdate }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Graph data
    const [nodes, setNodes] = useState(() => flowGraph?.nodes?.length > 0 ? flowGraph.nodes : generateDefaultNodes());
    const [edges, setEdges] = useState(() => flowGraph?.edges?.length > 0 ? flowGraph.edges : DEFAULT_EDGES);

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

    // Persist changes
    useEffect(() => {
        if (onUpdate) onUpdate({ nodes, edges });
    }, [nodes, edges]);

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

        // Grid
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 0.5;
        const gx0 = Math.floor(-pan.x / zoom / GRID_SIZE) * GRID_SIZE;
        const gy0 = Math.floor(-pan.y / zoom / GRID_SIZE) * GRID_SIZE;
        const gx1 = gx0 + width / zoom + GRID_SIZE * 2;
        const gy1 = gy0 + height / zoom + GRID_SIZE * 2;
        for (let x = gx0; x < gx1; x += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(x, gy0); ctx.lineTo(x, gy1); ctx.stroke();
        }
        for (let y = gy0; y < gy1; y += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx1, y); ctx.stroke();
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

            // Node body
            ctx.fillStyle = isHovered ? '#1a1a2e' : colors.bg;
            ctx.strokeStyle = isSelected ? '#fff' : colors.border;
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.beginPath();
            ctx.roundRect(n.x, n.y, NODE_W, NODE_H, 4);
            ctx.fill();
            ctx.stroke();

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
    // Toolbar
    // ══════════════════════════════════════════════════════════

    const btnStyle = {
        background: 'none', border: '1px solid #333', color: '#888',
        fontFamily: "'SF Mono', monospace", fontSize: 10, padding: '5px 10px',
        cursor: 'pointer', letterSpacing: '0.1em',
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 500, background: '#0a0a0f' }}>
            {/* Toolbar */}
            <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button style={btnStyle} onClick={fitToView}>FIT</button>
                <button style={btnStyle} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>100%</button>
                <button style={{ ...btnStyle, borderColor: '#c94040', color: '#c94040' }} onClick={resetLayout}>RESET</button>
                {selectedNode && edges.some(e => e.from === selectedNode || e.to === selectedNode) && (
                    <button style={{ ...btnStyle, borderColor: '#c94040', color: '#f87171' }}
                        onClick={deleteSelectedEdge}>DEL EDGES ({selectedNode.split(':')[1]})</button>
                )}
            </div>
            {/* Legend */}
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 5, display: 'flex', gap: 12, fontSize: 10, fontFamily: "'SF Mono', monospace" }}>
                <span style={{ color: TYPE_COLORS.view.text }}>● VIEW</span>
                <span style={{ color: TYPE_COLORS.scene.text }}>● SCENE</span>
                <span style={{ color: TYPE_COLORS.overlay.text }}>● OVERLAY</span>
            </div>
            {/* Help */}
            <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 5, fontSize: 9, color: '#444', fontFamily: "'SF Mono', monospace", textAlign: 'right', lineHeight: 1.8 }}>
                Drag node to move · Drag output port → input port to connect · Scroll to zoom · Click empty space to pan
            </div>
            {/* Canvas */}
            <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: '100%', cursor: isPanning ? 'grabbing' : dragNode ? 'move' : connectFrom ? 'crosshair' : 'default' }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onWheel={onWheel}
                onContextMenu={e => e.preventDefault()}
            />
        </div>
    );
}
