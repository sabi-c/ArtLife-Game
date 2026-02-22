/**
 * MapEditor.jsx — Visual Tiled map editor for the CMS
 *
 * Renders a Tiled JSON map on a canvas with:
 *   - Background image rendering (for bg-image rooms)
 *   - Tileset-based tile rendering (for standard rooms)
 *   - Object overlay: paintings, NPCs, doors, spawn, dialog markers
 *   - Click-to-select objects with property inspector
 *   - Drag-to-move objects
 *   - Export modified JSON
 *
 * Used inside RoomManager.jsx as an edit mode for individual rooms.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

const mono = '"IBM Plex Mono", "Courier New", monospace';

// Object type colors and icons for the map overlay
const OBJ_STYLES = {
    painting: { color: '#c9a84c', label: 'P', bg: 'rgba(201,168,76,0.3)' },
    npc:      { color: '#4ade80', label: 'N', bg: 'rgba(74,222,128,0.3)' },
    door:     { color: '#88bbdd', label: 'D', bg: 'rgba(136,187,221,0.3)' },
    spawn:    { color: '#ff6b6b', label: 'S', bg: 'rgba(255,107,107,0.3)' },
    dialog:   { color: '#aa66cc', label: '?', bg: 'rgba(170,102,204,0.3)' },
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
// Canvas Map Renderer
// ════════════════════════════════════════════════════════════════

function MapCanvas({ mapJSON, bgImageUrl, tilesetImages, selectedObjId, onSelectObject, onMoveObject, zoom }) {
    const canvasRef = useRef(null);
    const [dragging, setDragging] = useState(null);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef(null);

    const tw = mapJSON.tilewidth;
    const th = mapJSON.tileheight;
    const mapW = mapJSON.width * tw;
    const mapH = mapJSON.height * th;

    // Get objects layer
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

                for (let y = 0; y < mapJSON.height; y++) {
                    for (let x = 0; x < mapJSON.width; x++) {
                        const gid = layer.data[y * mapJSON.width + x];
                        if (gid === 0) continue;

                        // Find which tileset this gid belongs to
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

        // Draw grid lines (subtle)
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
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

        // Draw objects
        for (const obj of objects) {
            const style = OBJ_STYLES[obj.name] || { color: '#888', label: '·', bg: 'rgba(128,128,128,0.2)' };
            const ox = obj.x;
            const oy = obj.y;
            const isSelected = obj.id === selectedObjId;

            // Object marker circle
            const radius = tw * 0.35;
            ctx.beginPath();
            ctx.arc(ox, oy, radius, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? style.color : style.bg;
            ctx.fill();
            ctx.strokeStyle = style.color;
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.stroke();

            // Label
            ctx.fillStyle = isSelected ? '#000' : style.color;
            ctx.font = `bold ${Math.round(tw * 0.3)}px ${mono}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(style.label, ox, oy);

            // Selection highlight
            if (isSelected) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.strokeRect(ox - tw / 2, oy - th / 2, tw, th);
                ctx.setLineDash([]);
            }
        }

        ctx.restore();
    }, [mapJSON, bgImageUrl, tilesetImages, selectedObjId, zoom, mapW, mapH, tw, th, objects]);

    useEffect(() => { draw(); }, [draw]);

    // Handle mouse events for object selection and dragging
    const getMapCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom,
        };
    };

    const findObjectAt = (mx, my) => {
        const hitRadius = tw * 0.5;
        // Check in reverse order (top objects first)
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
        if (e.button === 1 || e.button === 2) {
            // Middle/right click = pan
            setIsPanning(true);
            panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
            return;
        }
        const { x, y } = getMapCoords(e);
        const hit = findObjectAt(x, y);
        if (hit) {
            onSelectObject(hit.id);
            setDragging({ objId: hit.id, startX: hit.x, startY: hit.y, mouseStartX: x, mouseStartY: y });
        } else {
            onSelectObject(null);
        }
    };

    const handleMouseMove = (e) => {
        if (isPanning && panStart.current) {
            setPanOffset({
                x: e.clientX - panStart.current.x,
                y: e.clientY - panStart.current.y,
            });
            return;
        }
        if (!dragging) return;
        const { x, y } = getMapCoords(e);
        const dx = x - dragging.mouseStartX;
        const dy = y - dragging.mouseStartY;
        // Snap to tile grid
        const newX = Math.round((dragging.startX + dx) / tw) * tw;
        const newY = Math.round((dragging.startY + dy) / th) * th;
        onMoveObject(dragging.objId, newX, newY);
    };

    const handleMouseUp = () => {
        setDragging(null);
        setIsPanning(false);
        panStart.current = null;
    };

    return (
        <div
            style={{
                overflow: 'auto',
                flex: 1,
                background: '#0a0a14',
                cursor: dragging ? 'grabbing' : 'crosshair',
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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
// Property Editor Panel
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

    // Property fields based on object type
    const fields = {
        painting: ['title', 'artist', 'price', 'description'],
        npc: ['id', 'label', 'dialogue', 'canHaggle'],
        door: ['nextMap', 'nextMapRoom', 'label'],
        dialog: ['content'],
        spawn: [],
    };

    const currentFields = fields[obj.name] || Object.keys(props);

    return (
        <div style={{ padding: 12, fontSize: 11, fontFamily: mono }}>
            {/* Object header */}
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

            {/* Position */}
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

            {/* Custom properties */}
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

    const notify = (msg, duration = 3000) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), duration);
    };

    // Load tileset images and optional background image
    useEffect(() => {
        const images = {};
        const promises = [];

        // Check for background image
        const bgProp = Array.isArray(mapJSON.properties)
            ? mapJSON.properties.find(p => p.name === 'bgImage')?.value
            : mapJSON.properties?.bgImage;

        if (bgProp) {
            promises.push(
                loadImage(bgProp).then(img => { images._bgImage = img; }).catch(() => {})
            );
        }

        // Load tilesets
        for (const ts of (mapJSON.tilesets || [])) {
            if (ts.image) {
                // Resolve tileset image path relative to public/content/maps/
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
    }, []);  // Only load once on mount

    // Handle object movement (from drag on canvas)
    const handleMoveObject = useCallback((objId, newX, newY) => {
        setMapJSON(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const objLayer = next.layers?.find(l => l.type === 'objectgroup');
            const obj = objLayer?.objects?.find(o => o.id === objId);
            if (obj) {
                obj.x = newX;
                obj.y = newY;
            }
            return next;
        });
        setDirty(true);
    }, []);

    // Handle property updates
    const handleUpdateProperty = useCallback((objId, field, value) => {
        setMapJSON(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const objLayer = next.layers?.find(l => l.type === 'objectgroup');
            const obj = objLayer?.objects?.find(o => o.id === objId);
            if (!obj) return prev;

            if (field === '_x') {
                obj.x = value;
            } else if (field === '_y') {
                obj.y = value;
            } else {
                setProp(obj, field, value);
            }
            return next;
        });
        setDirty(true);
    }, []);

    // Add a new object at map center
    const handleAddObject = useCallback((type) => {
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
                dialog: [
                    { name: 'content', type: 'string', value: 'A sign.' },
                ],
                spawn: [],
            };

            objLayer.objects.push({
                id: newId,
                name: type,
                point: true,
                x: centerX,
                y: centerY,
                width: 0, height: 0,
                rotation: 0, type: '',
                visible: true,
                properties: defaults[type] || [],
            });

            return next;
        });
        setDirty(true);
        notify(`Added ${type}`);
    }, []);

    // Delete selected object
    const handleDeleteObject = useCallback((objId) => {
        setMapJSON(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const objLayer = next.layers?.find(l => l.type === 'objectgroup');
            if (objLayer) {
                objLayer.objects = objLayer.objects.filter(o => o.id !== objId);
            }
            return next;
        });
        setSelectedObjId(null);
        setDirty(true);
        notify('Object deleted');
    }, []);

    // Export/save the modified map
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

    const bgProp = Array.isArray(mapJSON.properties)
        ? mapJSON.properties.find(p => p.name === 'bgImage')?.value
        : null;

    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', fontFamily: mono,
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderBottom: '1px solid #2a2a3e',
                background: 'rgba(10,10,15,0.95)', flexShrink: 0,
            }}>
                <button onClick={onClose} style={toolBtnStyle}>
                    BACK
                </button>
                <span style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 12 }}>
                    MAP EDITOR
                </span>
                <span style={{ color: '#555', fontSize: 10 }}>
                    {roomData?.name || roomData?.tiledMap} ({mapJSON.width}&times;{mapJSON.height})
                </span>

                <div style={{ flex: 1 }} />

                {/* Zoom controls */}
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

                <button onClick={handleDownload} style={toolBtnStyle}>
                    DOWNLOAD JSON
                </button>
                <button
                    onClick={handleSave}
                    disabled={!dirty}
                    style={{
                        ...toolBtnStyle,
                        background: dirty ? '#1a3a1a' : '#111',
                        border: dirty ? '1px solid #3a8a5c' : '1px solid #333',
                        color: dirty ? '#4ade80' : '#555',
                    }}
                >
                    SAVE
                </button>

                {notification && (
                    <span style={{
                        color: '#4ade80', fontSize: 10,
                        padding: '2px 8px', background: '#1a3a1a',
                        border: '1px solid #3a8a5c', borderRadius: 2,
                    }}>{notification}</span>
                )}

                {dirty && (
                    <span style={{ color: '#c94040', fontSize: 9 }}>UNSAVED</span>
                )}
            </div>

            {/* Main area: canvas + property editor */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Canvas area */}
                <MapCanvas
                    mapJSON={mapJSON}
                    bgImageUrl={bgProp}
                    tilesetImages={tilesetImages}
                    selectedObjId={selectedObjId}
                    onSelectObject={setSelectedObjId}
                    onMoveObject={handleMoveObject}
                    zoom={zoom}
                />

                {/* Property editor sidebar */}
                <div style={{
                    width: 260, minWidth: 260,
                    background: 'rgba(10,10,15,0.95)',
                    borderLeft: '1px solid #2a2a3e',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    <div style={{
                        padding: '8px 12px', borderBottom: '1px solid #2a2a3e',
                        fontSize: 11, color: '#c9a84c', fontFamily: mono,
                        fontWeight: 'bold', letterSpacing: 2,
                    }}>PROPERTIES</div>
                    <PropertyEditor
                        mapJSON={mapJSON}
                        selectedObjId={selectedObjId}
                        onUpdateProperty={handleUpdateProperty}
                        onAddObject={handleAddObject}
                        onDeleteObject={handleDeleteObject}
                    />
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
