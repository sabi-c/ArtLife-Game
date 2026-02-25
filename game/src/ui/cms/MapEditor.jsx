/**
 * MapEditor.jsx — Visual Tiled-like map editor for the CMS
 *
 * Full tile painting editor with:
 *   - TilesetPicker: select tiles from loaded tilesets to paint with
 *   - EditorToolbar: select/pencil/eraser/eyedropper/fill tools + layer selector
 *   - Canvas rendering of tile layers and object overlay
 *   - Tile painting: click or drag to place/erase tiles on the active layer
 *   - Object editing: click-to-select, drag-to-move, property inspector
 *   - Undo/Redo via JSON snapshot history (Cmd+Z / Cmd+Shift+Z)
 *   - Export/download modified JSON
 *
 * Used inside RoomManager.jsx as an edit mode for individual rooms.
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ARTWORKS } from '../../data/artworks.js';
import { CONTACTS } from '../../data/contacts.js';

const mono = '"IBM Plex Mono", "Courier New", monospace';

// Editor tool modes
const TOOL = { SELECT: 'select', PENCIL: 'pencil', ERASER: 'eraser', EYEDROPPER: 'eyedropper', FILL: 'fill' };

// Object type colors and icons for the map overlay
const OBJ_STYLES = {
    painting: { color: '#c9a84c', label: 'P', bg: 'rgba(201,168,76,0.3)' },
    npc: { color: '#4ade80', label: 'N', bg: 'rgba(74,222,128,0.3)' },
    door: { color: '#88bbdd', label: 'D', bg: 'rgba(136,187,221,0.3)' },
    spawn: { color: '#ff6b6b', label: 'S', bg: 'rgba(255,107,107,0.3)' },
    dialog: { color: '#aa66cc', label: '?', bg: 'rgba(170,102,204,0.3)' },
};

/** Load an image and return a Promise */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load: ${src}`));
        img.src = src;
    });
}

/** Safely get flat tile data from a layer (handles both flat data and chunked infinite format) */
function getLayerData(layer, mapWidth, mapHeight) {
    if (!layer) return [];
    if (layer.data && Array.isArray(layer.data)) return layer.data;
    if (layer.chunks) {
        // Base64-encoded chunks can't be decoded in CMS
        if (layer.chunks[0]?.data && typeof layer.chunks[0].data === 'string') return [];
        const flat = new Array(mapWidth * mapHeight).fill(0);
        for (const chunk of layer.chunks) {
            if (!Array.isArray(chunk.data)) continue;
            for (let row = 0; row < chunk.height; row++) {
                for (let col = 0; col < chunk.width; col++) {
                    const mx = chunk.x + col;
                    const my = chunk.y + row;
                    if (mx >= 0 && mx < mapWidth && my >= 0 && my < mapHeight) {
                        flat[my * mapWidth + mx] = chunk.data[row * chunk.width + col];
                    }
                }
            }
        }
        return flat;
    }
    return [];
}

/** Get a Tiled object's custom properties as a flat dict */
function getProps(obj) {
    const props = {};
    for (const p of (obj.properties || [])) {
        props[p.name] = p.value;
    }
    return props;
}

/** Set a custom property on a Tiled object (mutates in place) */
function setProp(obj, name, value) {
    if (!obj.properties) obj.properties = [];
    const existing = obj.properties.find(p => p.name === name);
    if (existing) {
        existing.value = value;
    } else {
        obj.properties.push({ name, type: 'string', value });
    }
}

// ════════════════════════════════════════════════════════════════
// Undo/Redo History Hook
// ════════════════════════════════════════════════════════════════

function useMapEditorHistory(initialState, maxStates = 50) {
    const [history, setHistory] = useState(() => [JSON.stringify(initialState)]);
    const [pointer, setPointer] = useState(0);

    const pushState = useCallback((state) => {
        const serialized = JSON.stringify(state);
        setHistory(prev => {
            // Discard any redo states beyond current pointer
            const truncated = prev.slice(0, pointer + 1);
            truncated.push(serialized);
            // Limit history size
            if (truncated.length > maxStates) truncated.shift();
            return truncated;
        });
        setPointer(prev => Math.min(prev + 1, maxStates - 1));
    }, [pointer, maxStates]);

    const undo = useCallback(() => {
        if (pointer <= 0) return null;
        const newPointer = pointer - 1;
        setPointer(newPointer);
        return JSON.parse(history[newPointer]);
    }, [pointer, history]);

    const redo = useCallback(() => {
        if (pointer >= history.length - 1) return null;
        const newPointer = pointer + 1;
        setPointer(newPointer);
        return JSON.parse(history[newPointer]);
    }, [pointer, history]);

    const canUndo = pointer > 0;
    const canRedo = pointer < history.length - 1;

    return { pushState, undo, redo, canUndo, canRedo };
}

// ════════════════════════════════════════════════════════════════
// Tileset Picker (left sidebar)
// ════════════════════════════════════════════════════════════════

function TilesetPicker({ mapJSON, tilesetImages, selectedTileGid, onSelectTile }) {
    const [activeTilesetIdx, setActiveTilesetIdx] = useState(0);
    const canvasRef = useRef(null);

    const tilesets = mapJSON.tilesets || [];
    const ts = tilesets[activeTilesetIdx];
    const tw = mapJSON.tilewidth;
    const th = mapJSON.tileheight;

    // Calculate tileset grid dimensions
    const tsImg = ts ? tilesetImages[ts.name] : null;
    const tsCols = ts ? (ts.columns || (tsImg ? Math.floor(tsImg.width / tw) : 0)) : 0;
    const tsRows = ts && tsImg ? Math.ceil((tsImg.height / th)) : 0;

    // Draw the tileset grid
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !tsImg || !ts) return;
        const ctx = canvas.getContext('2d');
        const scale = 1;

        canvas.width = tsCols * tw * scale;
        canvas.height = tsRows * th * scale;

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tsImg, 0, 0, canvas.width, canvas.height);

        // Highlight selected tile
        if (selectedTileGid >= ts.firstgid && selectedTileGid < ts.firstgid + tsCols * tsRows) {
            const localId = selectedTileGid - ts.firstgid;
            const sx = (localId % tsCols) * tw * scale;
            const sy = Math.floor(localId / tsCols) * th * scale;
            ctx.strokeStyle = '#c9a84c';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx, sy, tw * scale, th * scale);
            // Gold overlay
            ctx.fillStyle = 'rgba(201,168,76,0.3)';
            ctx.fillRect(sx, sy, tw * scale, th * scale);
        }

        // Draw subtle grid
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= tsCols; x++) {
            ctx.beginPath();
            ctx.moveTo(x * tw * scale, 0);
            ctx.lineTo(x * tw * scale, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= tsRows; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * th * scale);
            ctx.lineTo(canvas.width, y * th * scale);
            ctx.stroke();
        }
    }, [tsImg, ts, selectedTileGid, tsCols, tsRows, tw, th]);

    const handleClick = (e) => {
        if (!ts || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const tileX = Math.floor(mx / tw);
        const tileY = Math.floor(my / th);
        if (tileX >= 0 && tileX < tsCols && tileY >= 0 && tileY < tsRows) {
            const gid = ts.firstgid + tileY * tsCols + tileX;
            onSelectTile(gid);
        }
    };

    if (tilesets.length === 0) {
        return (
            <div style={{ padding: 12, color: '#555', fontSize: 10, fontFamily: mono }}>
                No tilesets available for this map.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tileset selector dropdown */}
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #1a1a2e' }}>
                <div style={{ fontSize: 9, color: '#c9a84c', marginBottom: 4, fontFamily: mono, letterSpacing: 1 }}>
                    TILESET
                </div>
                <select
                    value={activeTilesetIdx}
                    onChange={(e) => setActiveTilesetIdx(Number(e.target.value))}
                    style={{
                        width: '100%', background: '#0a0a14', border: '1px solid #2a2a3e',
                        color: '#ddd', padding: '4px 6px', fontFamily: mono, fontSize: 10,
                    }}
                >
                    {tilesets.map((t, i) => (
                        <option key={i} value={i}>
                            {t.name || `Tileset ${i + 1}`}
                        </option>
                    ))}
                </select>
            </div>

            {/* Selected tile info */}
            <div style={{
                padding: '6px 10px', borderBottom: '1px solid #1a1a2e',
                fontSize: 9, color: '#666', fontFamily: mono,
            }}>
                {selectedTileGid > 0
                    ? <span>GID: <span style={{ color: '#c9a84c' }}>{selectedTileGid}</span></span>
                    : <span style={{ color: '#444' }}>Click a tile to select</span>
                }
                {ts && <span style={{ marginLeft: 8 }}>{tsCols}&times;{tsRows} tiles</span>}
            </div>

            {/* Tileset grid canvas */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 4 }}>
                {tsImg ? (
                    <canvas
                        ref={canvasRef}
                        onClick={handleClick}
                        style={{
                            imageRendering: 'pixelated',
                            cursor: 'pointer',
                            display: 'block',
                            maxWidth: '100%',
                        }}
                    />
                ) : (
                    <div style={{ padding: 12, color: '#555', fontSize: 10, fontFamily: mono }}>
                        Tileset image not loaded: {ts?.name}
                    </div>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// Editor Toolbar
// ════════════════════════════════════════════════════════════════

function EditorToolbar({ activeTool, onSetTool, activeLayer, onSetLayer, mapJSON,
    showGrid, onToggleGrid, showObjects, onToggleObjects, canUndo, canRedo, onUndo, onRedo }) {

    const layerNames = useMemo(() => {
        return (mapJSON.layers || [])
            .filter(l => l.type === 'tilelayer')
            .map(l => l.name);
    }, [mapJSON.layers]);

    const tools = [
        { id: TOOL.SELECT, label: 'SEL', icon: '\u2B9C', title: 'Select (V)' },
        { id: TOOL.PENCIL, label: 'PEN', icon: '\u270F', title: 'Pencil (B)' },
        { id: TOOL.ERASER, label: 'ERA', icon: '\u2716', title: 'Eraser (E)' },
        { id: TOOL.EYEDROPPER, label: 'EYE', icon: '\uD83D\uDCA7', title: 'Eyedropper (I)' },
        { id: TOOL.FILL, label: 'FILL', icon: '\uD83D\uDEA3', title: 'Fill (G)' },
    ];

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderBottom: '1px solid #1a1a2e',
            background: 'rgba(10,10,15,0.95)', flexShrink: 0, fontFamily: mono,
        }}>
            {/* Tool buttons */}
            {tools.map(t => (
                <button
                    key={t.id}
                    onClick={() => onSetTool(t.id)}
                    title={t.title}
                    style={{
                        background: activeTool === t.id ? '#c9a84c' : '#111',
                        color: activeTool === t.id ? '#000' : '#888',
                        border: `1px solid ${activeTool === t.id ? '#c9a84c' : '#333'}`,
                        padding: '3px 8px', cursor: 'pointer', fontFamily: mono, fontSize: 10,
                    }}
                >
                    {t.label}
                </button>
            ))}

            <div style={{ width: 1, height: 18, background: '#2a2a3e', margin: '0 4px' }} />

            {/* Layer selector */}
            <span style={{ fontSize: 9, color: '#555' }}>LAYER</span>
            <select
                value={activeLayer}
                onChange={(e) => onSetLayer(e.target.value)}
                style={{
                    background: '#0a0a14', border: '1px solid #2a2a3e',
                    color: '#ddd', padding: '3px 6px', fontFamily: mono, fontSize: 10,
                }}
            >
                {layerNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                ))}
            </select>

            <div style={{ width: 1, height: 18, background: '#2a2a3e', margin: '0 4px' }} />

            {/* Toggles */}
            <button
                onClick={onToggleGrid}
                style={{
                    ...tbtnBase,
                    color: showGrid ? '#4ade80' : '#555',
                    border: showGrid ? '1px solid #3a8a5c' : '1px solid #333',
                }}
                title="Toggle grid"
            >GRID</button>
            <button
                onClick={onToggleObjects}
                style={{
                    ...tbtnBase,
                    color: showObjects ? '#4ade80' : '#555',
                    border: showObjects ? '1px solid #3a8a5c' : '1px solid #333',
                }}
                title="Toggle objects"
            >OBJ</button>

            <div style={{ width: 1, height: 18, background: '#2a2a3e', margin: '0 4px' }} />

            {/* Undo/Redo */}
            <button onClick={onUndo} disabled={!canUndo}
                style={{ ...tbtnBase, color: canUndo ? '#88bbdd' : '#333' }}
                title="Undo (Cmd+Z)"
            >UNDO</button>
            <button onClick={onRedo} disabled={!canRedo}
                style={{ ...tbtnBase, color: canRedo ? '#88bbdd' : '#333' }}
                title="Redo (Cmd+Shift+Z)"
            >REDO</button>
        </div>
    );
}

const tbtnBase = {
    background: '#111', border: '1px solid #333', padding: '3px 6px',
    cursor: 'pointer', fontFamily: mono, fontSize: 9,
};

// ════════════════════════════════════════════════════════════════
// Flood Fill utility
// ════════════════════════════════════════════════════════════════

function floodFill(data, width, height, startX, startY, newGid) {
    const idx = startY * width + startX;
    const targetGid = data[idx];
    if (targetGid === newGid) return data; // No-op if same tile
    const result = [...data];
    const stack = [[startX, startY]];
    const visited = new Set();

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const key = y * width + x;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (visited.has(key)) continue;
        if (result[key] !== targetGid) continue;
        visited.add(key);
        result[key] = newGid;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return result;
}

// ════════════════════════════════════════════════════════════════
// Canvas Map Renderer (extended with tile painting)
// ════════════════════════════════════════════════════════════════

function MapCanvas({ mapJSON, bgImageUrl, tilesetImages, selectedObjId, onSelectObject,
    onMoveObject, zoom, activeTool, activeLayer, selectedTileGid, onTilePaint,
    onTileErase, onTileFill, onEyedrop, showGrid, showObjects, hoverTile, onHoverTile }) {

    const canvasRef = useRef(null);
    const [dragging, setDragging] = useState(null);
    const [isPainting, setIsPainting] = useState(false);

    const tw = mapJSON.tilewidth;
    const th = mapJSON.tileheight;
    const mapW = mapJSON.width * tw;
    const mapH = mapJSON.height * th;

    const objLayer = mapJSON.layers?.find(l => l.type === 'objectgroup');
    const objects = objLayer?.objects || [];

    // Draw the map on canvas
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const scale = zoom;

        canvas.width = mapW * scale;
        canvas.height = mapH * scale;

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(scale, scale);

        // Draw background image if available
        if (bgImageUrl && tilesetImages._bgImage) {
            ctx.drawImage(tilesetImages._bgImage, 0, 0, mapW, mapH);
        } else {
            // Draw tile layers from tilesets
            const tileLayers = mapJSON.layers?.filter(l => l.type === 'tilelayer') || [];
            for (const layer of tileLayers) {
                if (!layer.visible || layer.opacity === 0) continue;
                ctx.globalAlpha = layer.opacity ?? 1;

                // Dim non-active layers slightly when painting
                const isActive = layer.name === activeLayer;
                if (!isActive && activeTool !== TOOL.SELECT) {
                    ctx.globalAlpha *= 0.5;
                }

                const layerData = getLayerData(layer, mapJSON.width, mapJSON.height);
                if (!layerData.length) continue;

                for (let y = 0; y < mapJSON.height; y++) {
                    for (let x = 0; x < mapJSON.width; x++) {
                        const gid = layerData[y * mapJSON.width + x] || 0;
                        if (gid === 0) continue;

                        let tileset = null;
                        for (let i = mapJSON.tilesets.length - 1; i >= 0; i--) {
                            if (gid >= mapJSON.tilesets[i].firstgid) {
                                tileset = mapJSON.tilesets[i];
                                break;
                            }
                        }
                        if (!tileset) continue;

                        const localId = gid - tileset.firstgid;
                        const tsImg = tilesetImages[tileset.name];
                        if (!tsImg) continue;

                        const tsCols = tileset.columns || Math.floor(tileset.imagewidth / tw);
                        const srcX = (localId % tsCols) * tw;
                        const srcY = Math.floor(localId / tsCols) * th;

                        ctx.drawImage(tsImg, srcX, srcY, tw, th, x * tw, y * th, tw, th);
                    }
                }
                ctx.globalAlpha = 1;
            }
        }

        // Draw grid lines
        if (showGrid) {
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= mapJSON.width; x++) {
                ctx.beginPath();
                ctx.moveTo(x * tw, 0);
                ctx.lineTo(x * tw, mapH);
                ctx.stroke();
            }
            for (let y = 0; y <= mapJSON.height; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * th);
                ctx.lineTo(mapW, y * th);
                ctx.stroke();
            }
        }

        // Draw hover tile ghost (for pencil tool)
        if (hoverTile && activeTool === TOOL.PENCIL && selectedTileGid > 0) {
            ctx.globalAlpha = 0.5;
            // Find the tileset for the selected GID and draw the ghost tile
            let tileset = null;
            for (let i = mapJSON.tilesets.length - 1; i >= 0; i--) {
                if (selectedTileGid >= mapJSON.tilesets[i].firstgid) {
                    tileset = mapJSON.tilesets[i];
                    break;
                }
            }
            if (tileset) {
                const tsImg = tilesetImages[tileset.name];
                if (tsImg) {
                    const localId = selectedTileGid - tileset.firstgid;
                    const tsCols = tileset.columns || Math.floor(tileset.imagewidth / tw);
                    const srcX = (localId % tsCols) * tw;
                    const srcY = Math.floor(localId / tsCols) * th;
                    ctx.drawImage(tsImg, srcX, srcY, tw, th, hoverTile.x * tw, hoverTile.y * th, tw, th);
                }
            }
            ctx.globalAlpha = 1;
            // Gold border on hover cell
            ctx.strokeStyle = '#c9a84c';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(hoverTile.x * tw, hoverTile.y * th, tw, th);
        } else if (hoverTile && activeTool === TOOL.ERASER) {
            // Red X on hover cell for eraser
            ctx.fillStyle = 'rgba(201,64,64,0.3)';
            ctx.fillRect(hoverTile.x * tw, hoverTile.y * th, tw, th);
            ctx.strokeStyle = '#c94040';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(hoverTile.x * tw, hoverTile.y * th, tw, th);
        } else if (hoverTile && activeTool === TOOL.EYEDROPPER) {
            ctx.strokeStyle = '#88bbdd';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(hoverTile.x * tw, hoverTile.y * th, tw, th);
        }

        // Draw objects overlay
        if (showObjects) {
            for (const obj of objects) {
                const style = OBJ_STYLES[obj.name] || { color: '#888', label: '\u00B7', bg: 'rgba(128,128,128,0.2)' };
                const ox = obj.x;
                const oy = obj.y;
                const isSelected = obj.id === selectedObjId;

                const radius = tw * 0.35;
                ctx.beginPath();
                ctx.arc(ox, oy, radius, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? style.color : style.bg;
                ctx.fill();
                ctx.strokeStyle = style.color;
                ctx.lineWidth = isSelected ? 2 : 1;
                ctx.stroke();

                ctx.fillStyle = isSelected ? '#000' : style.color;
                ctx.font = `bold ${Math.round(tw * 0.3)}px ${mono}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(style.label, ox, oy);

                if (isSelected) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 3]);
                    ctx.strokeRect(ox - tw / 2, oy - th / 2, tw, th);
                    ctx.setLineDash([]);
                }
            }
        }

        ctx.restore();
    }, [mapJSON, bgImageUrl, tilesetImages, selectedObjId, zoom, mapW, mapH, tw, th,
        objects, showGrid, showObjects, hoverTile, activeTool, selectedTileGid, activeLayer]);

    useEffect(() => { draw(); }, [draw]);

    const getMapCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom,
        };
    };

    const getTileCoords = (e) => {
        const { x, y } = getMapCoords(e);
        return {
            tileX: Math.floor(x / tw),
            tileY: Math.floor(y / th),
        };
    };

    const findObjectAt = (mx, my) => {
        const hitRadius = tw * 0.5;
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            const dx = mx - obj.x;
            const dy = my - obj.y;
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
                return obj;
            }
        }
        return null;
    };

    const handleMouseDown = (e) => {
        if (e.button === 1 || e.button === 2) return; // Ignore middle/right click

        if (activeTool === TOOL.SELECT) {
            const { x, y } = getMapCoords(e);
            const hit = findObjectAt(x, y);
            if (hit) {
                onSelectObject(hit.id);
                setDragging({ objId: hit.id, startX: hit.x, startY: hit.y, mouseStartX: x, mouseStartY: y });
            } else {
                onSelectObject(null);
            }
        } else if (activeTool === TOOL.PENCIL) {
            const { tileX, tileY } = getTileCoords(e);
            if (tileX >= 0 && tileX < mapJSON.width && tileY >= 0 && tileY < mapJSON.height) {
                onTilePaint(tileX, tileY);
                setIsPainting(true);
            }
        } else if (activeTool === TOOL.ERASER) {
            const { tileX, tileY } = getTileCoords(e);
            if (tileX >= 0 && tileX < mapJSON.width && tileY >= 0 && tileY < mapJSON.height) {
                onTileErase(tileX, tileY);
                setIsPainting(true);
            }
        } else if (activeTool === TOOL.EYEDROPPER) {
            const { tileX, tileY } = getTileCoords(e);
            if (tileX >= 0 && tileX < mapJSON.width && tileY >= 0 && tileY < mapJSON.height) {
                onEyedrop(tileX, tileY);
            }
        } else if (activeTool === TOOL.FILL) {
            const { tileX, tileY } = getTileCoords(e);
            if (tileX >= 0 && tileX < mapJSON.width && tileY >= 0 && tileY < mapJSON.height) {
                onTileFill(tileX, tileY);
            }
        }
    };

    const handleMouseMove = (e) => {
        // Update hover tile for ghost preview
        const { tileX, tileY } = getTileCoords(e);
        if (tileX >= 0 && tileX < mapJSON.width && tileY >= 0 && tileY < mapJSON.height) {
            onHoverTile({ x: tileX, y: tileY });
        } else {
            onHoverTile(null);
        }

        if (activeTool === TOOL.SELECT && dragging) {
            const { x, y } = getMapCoords(e);
            const dx = x - dragging.mouseStartX;
            const dy = y - dragging.mouseStartY;
            const newX = Math.round((dragging.startX + dx) / tw) * tw;
            const newY = Math.round((dragging.startY + dy) / th) * th;
            onMoveObject(dragging.objId, newX, newY);
        } else if (isPainting && activeTool === TOOL.PENCIL) {
            if (tileX >= 0 && tileX < mapJSON.width && tileY >= 0 && tileY < mapJSON.height) {
                onTilePaint(tileX, tileY);
            }
        } else if (isPainting && activeTool === TOOL.ERASER) {
            if (tileX >= 0 && tileX < mapJSON.width && tileY >= 0 && tileY < mapJSON.height) {
                onTileErase(tileX, tileY);
            }
        }
    };

    const handleMouseUp = () => {
        setDragging(null);
        setIsPainting(false);
    };

    // Cursor based on active tool
    const cursorMap = {
        [TOOL.SELECT]: dragging ? 'grabbing' : 'default',
        [TOOL.PENCIL]: 'crosshair',
        [TOOL.ERASER]: 'crosshair',
        [TOOL.EYEDROPPER]: 'crosshair',
        [TOOL.FILL]: 'crosshair',
    };

    return (
        <div
            style={{
                overflow: 'auto',
                flex: 1,
                background: '#0a0a14',
                cursor: cursorMap[activeTool] || 'default',
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { handleMouseUp(); onHoverTile(null); }}
        >
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                style={{
                    imageRendering: 'pixelated',
                    display: 'block',
                    margin: '8px auto',
                }}
            />
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// Property Editor Panel (unchanged from original)
// ════════════════════════════════════════════════════════════════

function PropertyEditor({ mapJSON, selectedObjId, onUpdateProperty, onAddObject, onDeleteObject }) {
    const objLayer = mapJSON.layers?.find(l => l.type === 'objectgroup');
    const obj = objLayer?.objects?.find(o => o.id === selectedObjId);

    if (!obj) {
        return (
            <div style={{ padding: 12, color: '#555', fontSize: 11, fontFamily: mono }}>
                <div style={{ marginBottom: 12, color: '#888' }}>Click an object on the map to edit its properties.</div>
                <div style={{ fontSize: 10, color: '#444', lineHeight: 1.6 }}>
                    <div><span style={{ color: '#c9a84c' }}>P</span> = Painting</div>
                    <div><span style={{ color: '#4ade80' }}>N</span> = NPC</div>
                    <div><span style={{ color: '#88bbdd' }}>D</span> = Door</div>
                    <div><span style={{ color: '#ff6b6b' }}>S</span> = Spawn</div>
                    <div><span style={{ color: '#aa66cc' }}>?</span> = Dialog</div>
                </div>

                <div style={{ marginTop: 16, borderTop: '1px solid #1a1a2e', paddingTop: 12 }}>
                    <div style={{ fontSize: 10, color: '#c9a84c', marginBottom: 8 }}>ADD OBJECT</div>
                    {['painting', 'npc', 'door', 'dialog', 'spawn'].map(type => (
                        <button
                            key={type}
                            onClick={() => onAddObject(type)}
                            style={{
                                display: 'block', width: '100%', marginBottom: 4,
                                background: '#111', border: `1px solid ${OBJ_STYLES[type]?.color || '#333'}`,
                                color: OBJ_STYLES[type]?.color || '#888',
                                padding: '4px 8px', cursor: 'pointer', fontFamily: mono, fontSize: 10,
                                textAlign: 'left',
                            }}
                        >
                            + {type.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const props = getProps(obj);
    const style = OBJ_STYLES[obj.name] || { color: '#888' };

    const fields = {
        painting: ['artworkId', 'title', 'artist', 'price', 'description'],
        npc: ['id', 'label', 'dialogue', 'canHaggle'],
        door: ['nextMap', 'nextMapRoom', 'label'],
        dialog: ['content'],
        spawn: [],
    };

    const currentFields = fields[obj.name] || Object.keys(props);

    /** Link a painting to an ARTWORKS entry — auto-fills title, artist, price */
    const handleLinkArtwork = (artworkId) => {
        const artwork = ARTWORKS.find(a => a.id === artworkId);
        if (!artwork) return;
        onUpdateProperty(obj.id, 'artworkId', artworkId);
        onUpdateProperty(obj.id, 'title', artwork.title);
        onUpdateProperty(obj.id, 'artist', artwork.artist);
        onUpdateProperty(obj.id, 'price', String(artwork.askingPrice));
        onUpdateProperty(obj.id, 'description', artwork.provenance || '');
    };

    /** Link an NPC to a CONTACTS entry — auto-fills id, label, dialogue */
    const handleLinkNPC = (contactId) => {
        const contact = CONTACTS.find(c => c.id === contactId);
        if (!contact) return;
        onUpdateProperty(obj.id, 'id', contact.id);
        onUpdateProperty(obj.id, 'label', contact.name);
        onUpdateProperty(obj.id, 'dialogue', contact.greetings?.[0] || 'Hello.');
        onUpdateProperty(obj.id, 'canHaggle', contact.role === 'dealer' ? 'true' : 'false');
    };

    return (
        <div style={{ padding: 12, fontSize: 11, fontFamily: mono }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #1a1a2e',
            }}>
                <div>
                    <span style={{ color: style.color, fontWeight: 'bold', fontSize: 13 }}>
                        {obj.name.toUpperCase()}
                    </span>
                    <span style={{ color: '#555', marginLeft: 8 }}>#{obj.id}</span>
                </div>
                <button
                    onClick={() => onDeleteObject(obj.id)}
                    style={{
                        background: '#1a0a0a', border: '1px solid #c94040', color: '#c94040',
                        padding: '2px 8px', cursor: 'pointer', fontFamily: mono, fontSize: 9,
                    }}
                >DEL</button>
            </div>

            {/* LINK ARTWORK dropdown for painting objects */}
            {obj.name === 'painting' && (
                <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #1a1a2e' }}>
                    <div style={{ fontSize: 9, color: '#c9a84c', marginBottom: 4 }}>LINK ARTWORK</div>
                    <select
                        value={props.artworkId || ''}
                        onChange={(e) => e.target.value && handleLinkArtwork(e.target.value)}
                        style={{ ...inputStyle, color: props.artworkId ? '#4ade80' : '#888' }}
                    >
                        <option value="">— Select artwork —</option>
                        {ARTWORKS.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.title} — {a.artist} (${a.askingPrice.toLocaleString()})
                            </option>
                        ))}
                    </select>
                    {props.artworkId && (
                        <div style={{ fontSize: 9, color: '#3a8a5c', marginTop: 2 }}>
                            Linked to: {props.artworkId}
                        </div>
                    )}
                </div>
            )}

            {/* LINK NPC dropdown for npc objects */}
            {obj.name === 'npc' && (
                <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #1a1a2e' }}>
                    <div style={{ fontSize: 9, color: '#4ade80', marginBottom: 4 }}>LINK NPC</div>
                    <select
                        value={props.id || ''}
                        onChange={(e) => e.target.value && handleLinkNPC(e.target.value)}
                        style={{ ...inputStyle, color: CONTACTS.some(c => c.id === props.id) ? '#4ade80' : '#888' }}
                    >
                        <option value="">— Select contact —</option>
                        {CONTACTS.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} — {c.role} {c.emoji || ''}
                            </option>
                        ))}
                    </select>
                    {CONTACTS.some(c => c.id === props.id) && (
                        <div style={{ fontSize: 9, color: '#3a8a5c', marginTop: 2 }}>
                            Linked to: {props.id}
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div>
                    <div style={{ fontSize: 9, color: '#555', marginBottom: 2 }}>X (tile)</div>
                    <input
                        type="number"
                        value={Math.round(obj.x / mapJSON.tilewidth)}
                        onChange={(e) => onUpdateProperty(obj.id, '_x', Number(e.target.value) * mapJSON.tilewidth)}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <div style={{ fontSize: 9, color: '#555', marginBottom: 2 }}>Y (tile)</div>
                    <input
                        type="number"
                        value={Math.round(obj.y / mapJSON.tileheight)}
                        onChange={(e) => onUpdateProperty(obj.id, '_y', Number(e.target.value) * mapJSON.tileheight)}
                        style={inputStyle}
                    />
                </div>
            </div>

            {currentFields.map(field => (
                <div key={field} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: '#888', marginBottom: 2 }}>{field}</div>
                    {field === 'description' || field === 'dialogue' || field === 'content' ? (
                        <textarea
                            value={props[field] || ''}
                            onChange={(e) => onUpdateProperty(obj.id, field, e.target.value)}
                            style={{ ...inputStyle, height: 60, resize: 'vertical' }}
                        />
                    ) : field === 'canHaggle' ? (
                        <select
                            value={props[field] || 'false'}
                            onChange={(e) => onUpdateProperty(obj.id, field, e.target.value)}
                            style={inputStyle}
                        >
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </select>
                    ) : field === 'artworkId' ? (
                        <input
                            type="text"
                            value={props[field] || ''}
                            readOnly
                            style={{ ...inputStyle, color: '#555' }}
                            title="Use LINK ARTWORK dropdown above"
                        />
                    ) : (
                        <input
                            type="text"
                            value={props[field] || ''}
                            onChange={(e) => onUpdateProperty(obj.id, field, e.target.value)}
                            style={inputStyle}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#0a0a14', border: '1px solid #2a2a3e', color: '#ddd',
    padding: '4px 6px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11,
    borderRadius: 2,
};

// ════════════════════════════════════════════════════════════════
// Main MapEditor Component
// ════════════════════════════════════════════════════════════════

export default function MapEditor({ mapJSON: initialMapJSON, roomData, onClose, onSave }) {
    const [mapJSON, setMapJSON] = useState(() => JSON.parse(JSON.stringify(initialMapJSON)));
    const [selectedObjId, setSelectedObjId] = useState(null);
    const [tilesetImages, setTilesetImages] = useState({});
    const [zoom, setZoom] = useState(2);
    const [dirty, setDirty] = useState(false);
    const [notification, setNotification] = useState(null);

    // Tile painting state
    const [activeTool, setActiveTool] = useState(TOOL.SELECT);
    const [activeLayer, setActiveLayer] = useState('below_player');
    const [selectedTileGid, setSelectedTileGid] = useState(0);
    const [showGrid, setShowGrid] = useState(true);
    const [showObjects, setShowObjects] = useState(true);
    const [hoverTile, setHoverTile] = useState(null);

    // Right sidebar mode: 'properties' (objects) or 'tileset' (tile picker)
    const [rightPanel, setRightPanel] = useState('tileset');

    // Undo/redo history
    const { pushState, undo, redo, canUndo, canRedo } = useMapEditorHistory(initialMapJSON);

    // Track whether we've pushed state before first edit (to avoid double-push)
    const lastPaintedTile = useRef(null);

    const notify = (msg, duration = 3000) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), duration);
    };

    // Initialize active layer to first tile layer
    useEffect(() => {
        const firstTileLayer = mapJSON.layers?.find(l => l.type === 'tilelayer');
        if (firstTileLayer) setActiveLayer(firstTileLayer.name);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load tileset images and optional background image
    useEffect(() => {
        const images = {};
        const promises = [];

        const bgProp = Array.isArray(mapJSON.properties)
            ? mapJSON.properties.find(p => p.name === 'bgImage')?.value
            : mapJSON.properties?.bgImage;

        if (bgProp) {
            promises.push(
                loadImage(bgProp).then(img => { images._bgImage = img; }).catch(() => { })
            );
        }

        for (const ts of (mapJSON.tilesets || [])) {
            if (ts.image) {
                let imgPath = ts.image;
                if (imgPath.startsWith('../') || imgPath.startsWith('assets/')) {
                    imgPath = imgPath.replace(/^\.\.\//, '').replace(/^\.\.\//, '');
                }
                promises.push(
                    loadImage(imgPath).then(img => { images[ts.name] = img; }).catch(() => {
                        console.warn(`[MapEditor] Failed to load tileset image: ${imgPath}`);
                    })
                );
            }
        }

        Promise.all(promises).then(() => setTilesetImages(images));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (e) => {
            // Don't capture when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            // Tool hotkeys
            if (e.key === 'v' || e.key === 'V') { setActiveTool(TOOL.SELECT); return; }
            if (e.key === 'b' || e.key === 'B') { setActiveTool(TOOL.PENCIL); return; }
            if (e.key === 'e' || e.key === 'E') { setActiveTool(TOOL.ERASER); return; }
            if (e.key === 'i' || e.key === 'I') { setActiveTool(TOOL.EYEDROPPER); return; }
            if (e.key === 'g' || e.key === 'G') { setActiveTool(TOOL.FILL); return; }

            // Undo/Redo
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
                e.preventDefault();
                const state = redo();
                if (state) { setMapJSON(state); setDirty(true); }
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                const state = undo();
                if (state) { setMapJSON(state); setDirty(true); }
                return;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [undo, redo]);

    // ── Tile painting callbacks ──

    /** Save state before editing (called once at start of stroke) */
    const saveBeforeEdit = useCallback(() => {
        pushState(mapJSON);
    }, [mapJSON, pushState]);

    /** Paint a single tile at (x,y) on the active layer */
    const handleTilePaint = useCallback((tileX, tileY) => {
        if (selectedTileGid <= 0) return;
        const key = `${tileX},${tileY}`;
        // Avoid re-painting the same tile during a drag stroke
        if (lastPaintedTile.current === key) return;

        // Push undo state only for the first tile in a stroke
        if (!lastPaintedTile.current) saveBeforeEdit();
        lastPaintedTile.current = key;

        setMapJSON(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const layer = next.layers?.find(l => l.name === activeLayer && l.type === 'tilelayer');
            if (!layer) return prev;
            layer.data[tileY * next.width + tileX] = selectedTileGid;
            return next;
        });
        setDirty(true);
    }, [selectedTileGid, activeLayer, saveBeforeEdit]);

    /** Erase a single tile at (x,y) on the active layer */
    const handleTileErase = useCallback((tileX, tileY) => {
        const key = `${tileX},${tileY}`;
        if (lastPaintedTile.current === key) return;
        if (!lastPaintedTile.current) saveBeforeEdit();
        lastPaintedTile.current = key;

        setMapJSON(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const layer = next.layers?.find(l => l.name === activeLayer && l.type === 'tilelayer');
            if (!layer) return prev;
            layer.data[tileY * next.width + tileX] = 0;
            return next;
        });
        setDirty(true);
    }, [activeLayer, saveBeforeEdit]);

    /** Flood fill from (x,y) with selected tile */
    const handleTileFill = useCallback((tileX, tileY) => {
        if (selectedTileGid <= 0) return;
        saveBeforeEdit();

        setMapJSON(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const layer = next.layers?.find(l => l.name === activeLayer && l.type === 'tilelayer');
            if (!layer) return prev;
            layer.data = floodFill(layer.data, next.width, next.height, tileX, tileY, selectedTileGid);
            return next;
        });
        setDirty(true);
    }, [selectedTileGid, activeLayer, saveBeforeEdit]);

    /** Eyedropper: pick the tile GID at (x,y) from the active layer */
    const handleEyedrop = useCallback((tileX, tileY) => {
        const layer = mapJSON.layers?.find(l => l.name === activeLayer && l.type === 'tilelayer');
        if (!layer) return;
        const gid = layer.data[tileY * mapJSON.width + tileX];
        if (gid > 0) {
            setSelectedTileGid(gid);
            setActiveTool(TOOL.PENCIL); // Switch to pencil after picking
            notify(`Picked tile GID ${gid}`);
        }
    }, [mapJSON, activeLayer]);

    // Reset lastPaintedTile when mouse is released (via MapCanvas handleMouseUp)
    // We detect this by watching isPainting state from MapCanvas — simpler: reset on mouseup at document level
    useEffect(() => {
        const onUp = () => { lastPaintedTile.current = null; };
        window.addEventListener('mouseup', onUp);
        return () => window.removeEventListener('mouseup', onUp);
    }, []);

    // ── Object editing callbacks (same as before) ──

    const handleMoveObject = useCallback((objId, newX, newY) => {
        setMapJSON(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const objLayer = next.layers?.find(l => l.type === 'objectgroup');
            const obj = objLayer?.objects?.find(o => o.id === objId);
            if (obj) { obj.x = newX; obj.y = newY; }
            return next;
        });
        setDirty(true);
    }, []);

    const handleUpdateProperty = useCallback((objId, field, value) => {
        saveBeforeEdit();
        setMapJSON(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const objLayer = next.layers?.find(l => l.type === 'objectgroup');
            const obj = objLayer?.objects?.find(o => o.id === objId);
            if (!obj) return prev;
            if (field === '_x') obj.x = value;
            else if (field === '_y') obj.y = value;
            else setProp(obj, field, value);
            return next;
        });
        setDirty(true);
    }, [saveBeforeEdit]);

    const handleAddObject = useCallback((type) => {
        saveBeforeEdit();
        setMapJSON(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            let objLayer = next.layers?.find(l => l.type === 'objectgroup');
            if (!objLayer) {
                objLayer = { draworder: 'topdown', id: next.nextlayerid++, name: 'objects', objects: [], opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0, width: 0, height: 0 };
                next.layers.push(objLayer);
            }
            const newId = next.nextobjectid || (Math.max(0, ...objLayer.objects.map(o => o.id)) + 1);
            next.nextobjectid = newId + 1;
            const centerX = Math.floor(next.width / 2) * next.tilewidth;
            const centerY = Math.floor(next.height / 2) * next.tileheight;
            const defaults = {
                painting: [
                    { name: 'title', type: 'string', value: 'Untitled' },
                    { name: 'artist', type: 'string', value: 'Unknown' },
                    { name: 'price', type: 'string', value: '10000' },
                    { name: 'description', type: 'string', value: '' },
                ],
                npc: [
                    { name: 'id', type: 'string', value: 'new_npc' },
                    { name: 'label', type: 'string', value: 'NPC' },
                    { name: 'dialogue', type: 'string', value: 'Hello.' },
                    { name: 'canHaggle', type: 'string', value: 'false' },
                ],
                door: [
                    { name: 'nextMap', type: 'string', value: 'worldscene' },
                    { name: 'label', type: 'string', value: 'Exit' },
                ],
                dialog: [{ name: 'content', type: 'string', value: 'A sign.' }],
                spawn: [],
            };
            objLayer.objects.push({
                id: newId, name: type, point: true,
                x: centerX, y: centerY, width: 0, height: 0,
                rotation: 0, type: '', visible: true,
                properties: defaults[type] || [],
            });
            return next;
        });
        setDirty(true);
        notify(`Added ${type}`);
    }, [saveBeforeEdit]);

    const handleDeleteObject = useCallback((objId) => {
        saveBeforeEdit();
        setMapJSON(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const objLayer = next.layers?.find(l => l.type === 'objectgroup');
            if (objLayer) objLayer.objects = objLayer.objects.filter(o => o.id !== objId);
            return next;
        });
        setSelectedObjId(null);
        setDirty(true);
        notify('Object deleted');
    }, [saveBeforeEdit]);

    // ── Save / Download ──

    const handleSave = () => {
        if (onSave) {
            onSave(mapJSON);
            notify('Map saved!');
            setDirty(false);
        }
    };

    const handleDownload = () => {
        const blob = new Blob([JSON.stringify(mapJSON, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${roomData?.tiledMap || 'map'}.json`;
        a.click();
        URL.revokeObjectURL(url);
        notify('Downloaded!');
    };

    const handleUndo = () => {
        const state = undo();
        if (state) { setMapJSON(state); setDirty(true); }
    };

    const handleRedo = () => {
        const state = redo();
        if (state) { setMapJSON(state); setDirty(true); }
    };

    const bgProp = Array.isArray(mapJSON.properties)
        ? mapJSON.properties.find(p => p.name === 'bgImage')?.value
        : null;

    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', fontFamily: mono,
        }}>
            {/* Top Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderBottom: '1px solid #2a2a3e',
                background: 'rgba(10,10,15,0.95)', flexShrink: 0,
            }}>
                <button onClick={onClose} style={toolBtnStyle}>BACK</button>
                <span style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 12 }}>MAP EDITOR</span>
                <span style={{ color: '#555', fontSize: 10 }}>
                    {roomData?.name || roomData?.tiledMap} ({mapJSON.width}&times;{mapJSON.height})
                </span>

                <div style={{ flex: 1 }} />

                <span style={{ fontSize: 9, color: '#555' }}>ZOOM</span>
                {[1, 2, 3].map(z => (
                    <button
                        key={z}
                        onClick={() => setZoom(z)}
                        style={{
                            ...toolBtnStyle,
                            background: zoom === z ? '#c9a84c' : '#111',
                            color: zoom === z ? '#000' : '#888',
                        }}
                    >{z}x</button>
                ))}

                <div style={{ width: 1, height: 20, background: '#2a2a3e', margin: '0 4px' }} />

                <button onClick={handleDownload} style={toolBtnStyle}>DOWNLOAD</button>
                <button
                    onClick={handleSave}
                    disabled={!dirty}
                    style={{
                        ...toolBtnStyle,
                        background: dirty ? '#1a3a1a' : '#111',
                        border: dirty ? '1px solid #3a8a5c' : '1px solid #333',
                        color: dirty ? '#4ade80' : '#555',
                    }}
                >SAVE</button>

                {notification && (
                    <span style={{
                        color: '#4ade80', fontSize: 10,
                        padding: '2px 8px', background: '#1a3a1a',
                        border: '1px solid #3a8a5c', borderRadius: 2,
                    }}>{notification}</span>
                )}
                {dirty && <span style={{ color: '#c94040', fontSize: 9 }}>UNSAVED</span>}
            </div>

            {/* Tool Bar (pencil/eraser/etc + layer selector) */}
            <EditorToolbar
                activeTool={activeTool}
                onSetTool={setActiveTool}
                activeLayer={activeLayer}
                onSetLayer={setActiveLayer}
                mapJSON={mapJSON}
                showGrid={showGrid}
                onToggleGrid={() => setShowGrid(g => !g)}
                showObjects={showObjects}
                onToggleObjects={() => setShowObjects(o => !o)}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
            />

            {/* Main area: tileset picker + canvas + property/tileset sidebar */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Left sidebar: Tileset Picker */}
                <div style={{
                    width: 220, minWidth: 220,
                    background: 'rgba(10,10,15,0.95)',
                    borderRight: '1px solid #2a2a3e',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '8px 12px', borderBottom: '1px solid #2a2a3e',
                        fontSize: 11, color: '#c9a84c', fontFamily: mono,
                        fontWeight: 'bold', letterSpacing: 2,
                    }}>TILES</div>
                    <TilesetPicker
                        mapJSON={mapJSON}
                        tilesetImages={tilesetImages}
                        selectedTileGid={selectedTileGid}
                        onSelectTile={(gid) => {
                            setSelectedTileGid(gid);
                            if (activeTool === TOOL.SELECT || activeTool === TOOL.EYEDROPPER) {
                                setActiveTool(TOOL.PENCIL);
                            }
                        }}
                    />
                </div>

                {/* Canvas area */}
                <MapCanvas
                    mapJSON={mapJSON}
                    bgImageUrl={bgProp}
                    tilesetImages={tilesetImages}
                    selectedObjId={selectedObjId}
                    onSelectObject={setSelectedObjId}
                    onMoveObject={handleMoveObject}
                    zoom={zoom}
                    activeTool={activeTool}
                    activeLayer={activeLayer}
                    selectedTileGid={selectedTileGid}
                    onTilePaint={handleTilePaint}
                    onTileErase={handleTileErase}
                    onTileFill={handleTileFill}
                    onEyedrop={handleEyedrop}
                    showGrid={showGrid}
                    showObjects={showObjects}
                    hoverTile={hoverTile}
                    onHoverTile={setHoverTile}
                />

                {/* Right sidebar: Properties / Tileset toggle */}
                <div style={{
                    width: 260, minWidth: 260,
                    background: 'rgba(10,10,15,0.95)',
                    borderLeft: '1px solid #2a2a3e',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    display: 'flex', flexDirection: 'column',
                }}>
                    {/* Panel toggle tabs */}
                    <div style={{
                        display: 'flex', borderBottom: '1px solid #2a2a3e',
                    }}>
                        {[
                            { id: 'properties', label: 'OBJECTS' },
                            { id: 'tileset', label: 'LAYERS' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setRightPanel(tab.id)}
                                style={{
                                    flex: 1, padding: '8px 4px', cursor: 'pointer',
                                    background: rightPanel === tab.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                                    color: rightPanel === tab.id ? '#c9a84c' : '#555',
                                    border: 'none', borderBottom: rightPanel === tab.id ? '2px solid #c9a84c' : '2px solid transparent',
                                    fontFamily: mono, fontSize: 10, fontWeight: 'bold', letterSpacing: 1,
                                }}
                            >{tab.label}</button>
                        ))}
                    </div>

                    {rightPanel === 'properties' ? (
                        <PropertyEditor
                            mapJSON={mapJSON}
                            selectedObjId={selectedObjId}
                            onUpdateProperty={handleUpdateProperty}
                            onAddObject={handleAddObject}
                            onDeleteObject={handleDeleteObject}
                        />
                    ) : (
                        <LayerPanel mapJSON={mapJSON} activeLayer={activeLayer} onSetLayer={setActiveLayer} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// Layer Panel (right sidebar alternative view)
// ════════════════════════════════════════════════════════════════

function LayerPanel({ mapJSON, activeLayer, onSetLayer }) {
    const layers = mapJSON.layers || [];

    return (
        <div style={{ padding: 12, fontFamily: mono, fontSize: 11 }}>
            <div style={{ fontSize: 10, color: '#c9a84c', marginBottom: 8, letterSpacing: 1 }}>MAP LAYERS</div>
            {layers.map((layer, i) => {
                const isActive = layer.name === activeLayer;
                const isTile = layer.type === 'tilelayer';
                const isObj = layer.type === 'objectgroup';
                const tileCount = isTile ? getLayerData(layer, mapJSON.width, mapJSON.height).filter(t => t > 0).length : 0;
                const objCount = isObj ? (layer.objects || []).length : 0;

                return (
                    <div
                        key={i}
                        onClick={() => isTile && onSetLayer(layer.name)}
                        style={{
                            padding: '8px 10px', marginBottom: 4,
                            background: isActive ? 'rgba(201,168,76,0.15)' : '#0a0a14',
                            border: isActive ? '1px solid #c9a84c' : '1px solid #1a1a2e',
                            borderRadius: 2,
                            cursor: isTile ? 'pointer' : 'default',
                            opacity: isTile ? 1 : 0.6,
                        }}
                    >
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <span style={{
                                color: isActive ? '#c9a84c' : '#ddd',
                                fontWeight: isActive ? 'bold' : 'normal',
                            }}>{layer.name}</span>
                            <span style={{ color: '#555', fontSize: 9 }}>
                                {isTile ? `${tileCount} tiles` : isObj ? `${objCount} obj` : layer.type}
                            </span>
                        </div>
                        <div style={{ fontSize: 9, color: '#444', marginTop: 2 }}>
                            {isTile ? 'tile layer' : isObj ? 'object group' : layer.type}
                            {layer.opacity < 1 && ` (${Math.round(layer.opacity * 100)}%)`}
                        </div>
                    </div>
                );
            })}

            {/* Map info */}
            <div style={{ marginTop: 16, padding: '8px 10px', background: '#0a0a14', border: '1px solid #1a1a2e', borderRadius: 2 }}>
                <div style={{ fontSize: 9, color: '#c9a84c', marginBottom: 4, letterSpacing: 1 }}>MAP INFO</div>
                <div style={{ fontSize: 10, color: '#888' }}>
                    Size: {mapJSON.width}&times;{mapJSON.height} tiles
                </div>
                <div style={{ fontSize: 10, color: '#888' }}>
                    Tile: {mapJSON.tilewidth}&times;{mapJSON.tileheight}px
                </div>
                <div style={{ fontSize: 10, color: '#888' }}>
                    Tilesets: {(mapJSON.tilesets || []).length}
                </div>
                <div style={{ fontSize: 10, color: '#888' }}>
                    Layers: {(mapJSON.layers || []).length}
                </div>
            </div>
        </div>
    );
}

const toolBtnStyle = {
    background: '#111',
    border: '1px solid #333',
    color: '#888',
    padding: '4px 10px',
    cursor: 'pointer',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 10,
};
