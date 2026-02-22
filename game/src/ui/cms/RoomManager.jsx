/**
 * RoomManager.jsx — CMS Room Management Panel
 *
 * A three-panel layout for managing Tiled room maps:
 *   Left:   Room list with venue grouping and stats
 *   Center: Room inspector with properties, object inventory, ASCII mini-map
 *   Right:  Actions (test room, open in Tiled, raw JSON)
 *
 * Wired into ContentStudio.jsx as the "ROOMS" tab.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VENUES, VENUE_MAP, ROOM_MAP } from '../../data/rooms.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { useCmsStore } from '../../stores/cmsStore.js';
import MapEditor from './MapEditor.jsx';

const mono = '"IBM Plex Mono", "Courier New", monospace';

// ── Shared styles matching ContentStudio conventions ──
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
    fontFamily: mono,
};

const btnStyle = {
    background: '#111',
    border: '1px solid #333',
    color: '#888',
    padding: '6px 12px',
    cursor: 'pointer',
    fontFamily: mono,
    fontSize: 10,
};

const goldBtnStyle = {
    ...btnStyle,
    background: '#1a1a0a',
    border: '1px solid #c9a84c',
    color: '#c9a84c',
};

const greenBtnStyle = {
    ...btnStyle,
    background: '#0a1a0a',
    border: '1px solid #3a8a5c',
    color: '#4ade80',
};

// ── Fetch and cache Tiled map JSON from public/ ──
const mapCache = {};

async function fetchMapJSON(tiledMap) {
    if (!tiledMap) return null;
    if (mapCache[tiledMap]) return mapCache[tiledMap];
    try {
        const resp = await fetch(`content/maps/${tiledMap}.json`);
        if (!resp.ok) return null;
        const json = await resp.json();
        mapCache[tiledMap] = json;
        return json;
    } catch {
        return null;
    }
}

/** Count objects by type in a Tiled map JSON */
function countObjects(mapJSON) {
    const objLayer = mapJSON?.layers?.find(l => l.type === 'objectgroup');
    if (!objLayer) return { paintings: 0, npcs: 0, doors: 0, dialogs: 0 };
    const objs = objLayer.objects || [];
    return {
        paintings: objs.filter(o => o.name === 'painting').length,
        npcs: objs.filter(o => o.name === 'npc').length,
        doors: objs.filter(o => o.name === 'door').length,
        dialogs: objs.filter(o => o.name === 'dialog').length,
    };
}

/** Generate ASCII mini-map from Tiled layers */
function generateAsciiMap(mapJSON) {
    if (!mapJSON) return 'No map data';
    const w = mapJSON.width;
    const h = mapJSON.height;
    const below = mapJSON.layers?.find(l => l.name === 'below_player');
    const world = mapJSON.layers?.find(l => l.name === 'world');
    const objLayer = mapJSON.layers?.find(l => l.type === 'objectgroup');

    // Build object position lookup
    const objMap = {};
    if (objLayer) {
        for (const obj of objLayer.objects) {
            const tx = Math.floor(obj.x / mapJSON.tilewidth);
            const ty = Math.floor(obj.y / mapJSON.tileheight);
            const key = `${tx},${ty}`;
            if (obj.name === 'painting') objMap[key] = 'P';
            else if (obj.name === 'npc') objMap[key] = 'N';
            else if (obj.name === 'door') objMap[key] = 'D';
            else if (obj.name === 'spawn') objMap[key] = 'S';
            else if (obj.name === 'dialog') objMap[key] = '?';
        }
    }

    const lines = [];
    for (let y = 0; y < h; y++) {
        let line = '';
        for (let x = 0; x < w; x++) {
            const key = `${x},${y}`;
            if (objMap[key]) {
                line += objMap[key];
            } else if (world?.data?.[y * w + x] > 0) {
                line += '\u2588'; // Full block — furniture
            } else if (below?.data?.[y * w + x] > 0) {
                line += '\u00B7'; // Middle dot — floor
            } else {
                line += ' ';
            }
        }
        lines.push(line);
    }
    return lines.join('\n');
}

// ════════════════════════════════════════════════════════════════
// Left Panel — Room List
// ════════════════════════════════════════════════════════════════

function RoomList({ selectedVenueId, onSelectVenue, mapData }) {
    return (
        <div style={{ ...panelStyle, flex: 1 }}>
            <div style={headerStyle}>
                VENUES ({VENUES.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {VENUES.map(venue => {
                    const isSelected = selectedVenueId === venue.id;
                    const hasTiled = venue.rooms.some(r => r.tiledMap);
                    const roomCount = venue.rooms.length;

                    // Count total objects across all Tiled maps in this venue
                    let totalPaintings = 0;
                    let totalNPCs = 0;
                    for (const room of venue.rooms) {
                        if (room.tiledMap && mapData[room.tiledMap]) {
                            const c = countObjects(mapData[room.tiledMap]);
                            totalPaintings += c.paintings;
                            totalNPCs += c.npcs;
                        }
                    }

                    return (
                        <div
                            key={venue.id}
                            onClick={() => onSelectVenue(venue.id)}
                            style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #1a1a2e',
                                background: isSelected ? 'rgba(201,168,76,0.1)' : 'transparent',
                                borderLeft: isSelected ? '3px solid #c9a84c' : '3px solid transparent',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, opacity: hasTiled ? 1 : 0.4 }}>
                                    {hasTiled ? '\uD83D\uDDFA\uFE0F' : '\uD83D\uDCC4'}
                                </span>
                                <span style={{
                                    color: isSelected ? '#c9a84c' : '#ddd',
                                    fontSize: 12,
                                    fontFamily: mono,
                                }}>
                                    {venue.name}
                                </span>
                            </div>
                            <div style={{
                                fontSize: 10, color: '#555', marginTop: 3, paddingLeft: 24,
                                fontFamily: mono,
                                display: 'flex', gap: 12,
                            }}>
                                <span>{roomCount} room{roomCount !== 1 ? 's' : ''}</span>
                                {hasTiled && <span style={{ color: '#3a8a5c' }}>TILED</span>}
                                {totalPaintings > 0 && <span>{totalPaintings} paintings</span>}
                                {totalNPCs > 0 && <span>{totalNPCs} NPCs</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// Center Panel — Room Inspector
// ════════════════════════════════════════════════════════════════

function RoomInspector({ venue, mapData }) {
    const [selectedRoomId, setSelectedRoomId] = useState(null);

    // Reset selection when venue changes
    useEffect(() => {
        if (venue?.rooms?.length > 0) {
            setSelectedRoomId(venue.rooms[0].id);
        } else {
            setSelectedRoomId(null);
        }
    }, [venue?.id]);

    if (!venue) {
        return (
            <div style={{ ...panelStyle, flex: 2 }}>
                <div style={headerStyle}>ROOM INSPECTOR</div>
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#444', fontSize: 12, fontFamily: mono,
                }}>
                    Select a venue to inspect its rooms.
                </div>
            </div>
        );
    }

    const room = venue.rooms.find(r => r.id === selectedRoomId) || venue.rooms[0];
    const mapJSON = room?.tiledMap ? mapData[room.tiledMap] : null;
    const counts = mapJSON ? countObjects(mapJSON) : null;
    const ascii = mapJSON ? generateAsciiMap(mapJSON) : null;

    // Get painting objects with their properties
    const paintings = [];
    const npcs = [];
    if (mapJSON) {
        const objLayer = mapJSON.layers?.find(l => l.type === 'objectgroup');
        if (objLayer) {
            for (const obj of objLayer.objects) {
                if (obj.name === 'painting') {
                    const props = {};
                    for (const p of (obj.properties || [])) props[p.name] = p.value;
                    paintings.push(props);
                } else if (obj.name === 'npc') {
                    const props = {};
                    for (const p of (obj.properties || [])) props[p.name] = p.value;
                    npcs.push(props);
                }
            }
        }
    }

    return (
        <div style={{ ...panelStyle, flex: 2 }}>
            <div style={{ ...headerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>ROOM INSPECTOR</span>
                <span style={{ color: '#555', fontWeight: 'normal', fontSize: 10 }}>
                    {venue.name}
                </span>
            </div>

            {/* Room tabs if multi-room venue */}
            {venue.rooms.length > 1 && (
                <div style={{
                    display: 'flex', gap: 4, padding: '8px 12px',
                    borderBottom: '1px solid #1a1a2e', flexWrap: 'wrap',
                }}>
                    {venue.rooms.map(r => (
                        <button
                            key={r.id}
                            onClick={() => setSelectedRoomId(r.id)}
                            style={{
                                background: selectedRoomId === r.id ? '#c9a84c' : '#111',
                                color: selectedRoomId === r.id ? '#000' : '#888',
                                border: `1px solid ${selectedRoomId === r.id ? '#c9a84c' : '#333'}`,
                                padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontFamily: mono,
                            }}
                        >
                            {r.name}
                        </button>
                    ))}
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 0 }}>
                {/* Properties */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1a2e' }}>
                    <div style={{ fontSize: 11, color: '#c9a84c', marginBottom: 8, fontFamily: mono }}>PROPERTIES</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: mono, fontSize: 11 }}>
                        <tbody>
                            {[
                                ['ID', room?.id],
                                ['Venue', room?.venue],
                                ['Name', room?.name],
                                ['Tiled Map', room?.tiledMap || '(none)'],
                                ['Map Size', mapJSON ? `${mapJSON.width}\u00D7${mapJSON.height}` : '—'],
                                ['Tags', (room?.tags || []).join(', ')],
                            ].map(([label, val]) => (
                                <tr key={label}>
                                    <td style={{ color: '#888', padding: '2px 8px 2px 0', whiteSpace: 'nowrap' }}>{label}</td>
                                    <td style={{ color: '#ddd', padding: '2px 0' }}>{val}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Object Inventory */}
                {counts && (
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1a2e' }}>
                        <div style={{ fontSize: 11, color: '#c9a84c', marginBottom: 8, fontFamily: mono }}>
                            OBJECTS ({counts.paintings + counts.npcs + counts.doors + counts.dialogs})
                        </div>

                        <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                            {[
                                ['\uD83D\uDDBC\uFE0F', 'Paintings', counts.paintings, '#c9a84c'],
                                ['\uD83D\uDC64', 'NPCs', counts.npcs, '#4ade80'],
                                ['\uD83D\uDEAA', 'Doors', counts.doors, '#88bbdd'],
                                ['\uD83D\uDCAC', 'Dialogs', counts.dialogs, '#aa66cc'],
                            ].map(([icon, label, count, color]) => (
                                <div key={label} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 16 }}>{icon}</div>
                                    <div style={{ fontSize: 18, color, fontWeight: 'bold', fontFamily: mono }}>{count}</div>
                                    <div style={{ fontSize: 9, color: '#555', fontFamily: mono }}>{label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Painting table */}
                        {paintings.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 4, fontFamily: mono }}>PAINTINGS</div>
                                <div style={{
                                    background: '#0a0a14', border: '1px solid #1a1a2e',
                                    borderRadius: 2, maxHeight: 150, overflowY: 'auto',
                                }}>
                                    {paintings.map((p, i) => (
                                        <div key={i} style={{
                                            padding: '4px 8px', borderBottom: '1px solid #111',
                                            fontSize: 10, fontFamily: mono,
                                            display: 'flex', justifyContent: 'space-between',
                                        }}>
                                            <span style={{ color: '#ddd' }}>{p.title || `Artwork ${i + 1}`}</span>
                                            <span style={{ color: '#c9a84c' }}>
                                                ${Number(p.price || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* NPC table */}
                        {npcs.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 4, fontFamily: mono }}>NPCs</div>
                                <div style={{
                                    background: '#0a0a14', border: '1px solid #1a1a2e',
                                    borderRadius: 2,
                                }}>
                                    {npcs.map((n, i) => (
                                        <div key={i} style={{
                                            padding: '4px 8px', borderBottom: '1px solid #111',
                                            fontSize: 10, fontFamily: mono,
                                        }}>
                                            <span style={{ color: '#4ade80' }}>{n.label || n.id}</span>
                                            <span style={{ color: '#555', marginLeft: 8 }}>
                                                {n.canHaggle === 'true' ? '[haggle]' : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Visual Room Preview (background-image rooms) */}
                {mapJSON?.properties && (() => {
                    const bgProp = Array.isArray(mapJSON.properties)
                        ? mapJSON.properties.find(p => p.name === 'bgImage')?.value
                        : mapJSON.properties?.bgImage;
                    if (!bgProp) return null;
                    // Derive the public URL from the bgImage path
                    const imgUrl = bgProp.startsWith('assets/') ? bgProp : `assets/rooms/${room?.tiledMap}.png`;
                    return (
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1a2e' }}>
                            <div style={{ fontSize: 11, color: '#c9a84c', marginBottom: 8, fontFamily: mono }}>
                                ROOM PREVIEW
                                <span style={{ color: '#555', fontWeight: 'normal', marginLeft: 8, fontSize: 9 }}>
                                    {mapJSON.width}&times;{mapJSON.height} tiles &bull; background image
                                </span>
                            </div>
                            <div style={{
                                background: '#0a0a14', border: '1px solid #1a1a2e',
                                borderRadius: 2, padding: 4, textAlign: 'center',
                            }}>
                                <img
                                    src={imgUrl}
                                    alt={`${room?.name || 'Room'} preview`}
                                    style={{
                                        maxWidth: '100%', maxHeight: 300,
                                        imageRendering: 'pixelated',
                                        border: '1px solid #2a2a3e',
                                    }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            </div>
                        </div>
                    );
                })()}

                {/* ASCII Mini-map */}
                {ascii && (
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1a2e' }}>
                        <div style={{ fontSize: 11, color: '#c9a84c', marginBottom: 8, fontFamily: mono }}>
                            MINI-MAP
                            <span style={{ color: '#555', fontWeight: 'normal', marginLeft: 8, fontSize: 9 }}>
                                P=painting N=npc D=door S=spawn ?=dialog \u2588=furniture \u00B7=floor
                            </span>
                        </div>
                        <pre style={{
                            background: '#0a0a14', border: '1px solid #1a1a2e',
                            padding: 8, fontSize: 10, lineHeight: 1.2,
                            color: '#4ade80', fontFamily: mono,
                            overflowX: 'auto', margin: 0,
                            letterSpacing: 2,
                        }}>
                            {ascii}
                        </pre>
                    </div>
                )}

                {/* Description */}
                {room?.look && (
                    <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, color: '#c9a84c', marginBottom: 8, fontFamily: mono }}>DESCRIPTION</div>
                        <div style={{ fontSize: 11, color: '#999', lineHeight: 1.5, fontFamily: mono }}>
                            {room.look}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// Right Panel — Actions
// ════════════════════════════════════════════════════════════════

function ActionsPanel({ venue, mapData, onClose, onEditMap }) {
    const [showJSON, setShowJSON] = useState(false);
    const [notification, setNotification] = useState(null);

    const notify = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    if (!venue) {
        return (
            <div style={{ ...panelStyle, width: 260 }}>
                <div style={headerStyle}>ACTIONS</div>
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#444', fontSize: 11, fontFamily: mono, textAlign: 'center', padding: 16,
                }}>
                    Select a venue to see available actions.
                </div>
            </div>
        );
    }

    const firstTiledRoom = venue.rooms.find(r => r.tiledMap);
    const mapJSON = firstTiledRoom?.tiledMap ? mapData[firstTiledRoom.tiledMap] : null;

    const handleTestRoom = () => {
        if (onClose) onClose();
        // Launch LocationScene with this venue
        setTimeout(() => {
            GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'LocationScene', {
                venueId: venue.id,
                roomId: venue.startRoom,
            });
        }, 100);
        notify('Launching room...');
    };

    const handleCopyCliCommand = (cmd) => {
        navigator.clipboard.writeText(cmd).then(() => notify('Copied!'));
    };

    const handleExportJSON = () => {
        const data = {
            venue,
            maps: {},
        };
        for (const room of venue.rooms) {
            if (room.tiledMap && mapData[room.tiledMap]) {
                data.maps[room.tiledMap] = mapData[room.tiledMap];
            }
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${venue.id}_export.json`;
        a.click();
        URL.revokeObjectURL(url);
        notify('Exported!');
    };

    return (
        <div style={{ ...panelStyle, width: 260 }}>
            <div style={headerStyle}>ACTIONS</div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Notification */}
                {notification && (
                    <div style={{
                        background: '#1a3a1a', border: '1px solid #3a8a5c',
                        color: '#4ade80', padding: '6px 10px', fontSize: 10,
                        fontFamily: mono, borderRadius: 2, textAlign: 'center',
                    }}>
                        {notification}
                    </div>
                )}

                {/* Test Room */}
                <button onClick={handleTestRoom} style={{ ...greenBtnStyle, width: '100%', padding: '10px 12px', fontSize: 11 }}>
                    PLAY TEST ROOM
                </button>

                {/* Visual Map Editor */}
                {firstTiledRoom && mapJSON && (
                    <button
                        onClick={() => onEditMap && onEditMap(firstTiledRoom.tiledMap)}
                        style={{ ...goldBtnStyle, width: '100%', padding: '10px 12px', fontSize: 11 }}
                    >
                        EDIT MAP
                    </button>
                )}

                {/* Open in Tiled */}
                {firstTiledRoom && (
                    <div>
                        <div style={{ fontSize: 9, color: '#555', marginBottom: 4, fontFamily: mono }}>OPEN IN TILED (CLI)</div>
                        <div style={{
                            background: '#0a0a14', border: '1px solid #1a1a2e',
                            padding: '6px 8px', fontSize: 10, fontFamily: mono, color: '#88bbdd',
                            cursor: 'pointer', borderRadius: 2,
                        }}
                            onClick={() => handleCopyCliCommand(`npm run room:open ${firstTiledRoom.tiledMap}`)}
                            title="Click to copy"
                        >
                            npm run room:open {firstTiledRoom.tiledMap}
                        </div>
                    </div>
                )}

                {/* Validate */}
                {firstTiledRoom && (
                    <div>
                        <div style={{ fontSize: 9, color: '#555', marginBottom: 4, fontFamily: mono }}>VALIDATE REACHABILITY</div>
                        <div style={{
                            background: '#0a0a14', border: '1px solid #1a1a2e',
                            padding: '6px 8px', fontSize: 10, fontFamily: mono, color: '#88bbdd',
                            cursor: 'pointer', borderRadius: 2,
                        }}
                            onClick={() => handleCopyCliCommand(`npm run room:validate ${firstTiledRoom.tiledMap}`)}
                            title="Click to copy"
                        >
                            npm run room:validate {firstTiledRoom.tiledMap}
                        </div>
                    </div>
                )}

                {/* Export */}
                <button onClick={handleExportJSON} style={{ ...goldBtnStyle, width: '100%' }}>
                    EXPORT VENUE JSON
                </button>

                {/* Venue Stats */}
                <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 9, color: '#555', marginBottom: 4, fontFamily: mono }}>VENUE INFO</div>
                    <div style={{
                        background: '#0a0a14', border: '1px solid #1a1a2e',
                        borderRadius: 2, padding: 8, fontFamily: mono, fontSize: 10,
                    }}>
                        <div style={{ color: '#888' }}>ID: <span style={{ color: '#ddd' }}>{venue.id}</span></div>
                        <div style={{ color: '#888' }}>Rooms: <span style={{ color: '#ddd' }}>{venue.rooms.length}</span></div>
                        <div style={{ color: '#888' }}>Time Limit: <span style={{ color: '#ddd' }}>{venue.timeLimit} turns</span></div>
                        <div style={{ color: '#888' }}>Available: <span style={{ color: '#ddd' }}>{venue.availableWeeks}</span></div>
                        {venue.requires && (
                            <div style={{ color: '#888' }}>Requires: <span style={{ color: '#c94040' }}>{JSON.stringify(venue.requires)}</span></div>
                        )}
                    </div>
                </div>

                {/* Pipeline commands */}
                <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 9, color: '#555', marginBottom: 4, fontFamily: mono }}>PIPELINE COMMANDS</div>
                    <div style={{
                        background: '#0a0a14', border: '1px solid #1a1a2e',
                        borderRadius: 2, padding: 8, fontFamily: mono, fontSize: 9, color: '#555',
                        lineHeight: 1.6,
                    }}>
                        {[
                            'npm run room:list',
                            'npm run room:new museum <id>',
                            'npm run room:import <file> <id>',
                            'npm run room:watch',
                        ].map(cmd => (
                            <div
                                key={cmd}
                                style={{ cursor: 'pointer', color: '#666' }}
                                onClick={() => handleCopyCliCommand(cmd)}
                                title="Click to copy"
                            >
                                $ {cmd}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Raw JSON toggle */}
                <button
                    onClick={() => setShowJSON(!showJSON)}
                    style={{ ...btnStyle, width: '100%', marginTop: 4 }}
                >
                    {showJSON ? 'HIDE' : 'SHOW'} RAW JSON
                </button>

                {showJSON && (
                    <pre style={{
                        background: '#0a0a14', border: '1px solid #1a1a2e',
                        padding: 8, fontSize: 9, color: '#4ade80',
                        overflowX: 'auto', overflowY: 'auto',
                        maxHeight: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        margin: 0, fontFamily: mono,
                    }}>
                        {JSON.stringify(venue, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════
// Room Creation Wizard Modal
// ════════════════════════════════════════════════════════════════

/** Generate a blank Tiled JSON map with standard layers and tilesets */
function generateBlankMap(width, height, template = 'blank') {
    const tw = 48;
    const th = 48;
    const totalTiles = width * height;

    // Base tilesets — Room_Builder for walls, Interiors for decor
    const tilesets = [
        {
            columns: 27,
            firstgid: 1,
            image: '../../assets/tilesets/Room_Builder_free_48x48.png',
            imageheight: 1296,
            imagewidth: 1296,
            margin: 0,
            name: 'Room_Builder_free_48x48',
            spacing: 0,
            tilecount: 729,
            tilewidth: tw,
            tileheight: th,
        },
        {
            columns: 32,
            firstgid: 730,
            image: '../../assets/tilesets/Interiors_free_48x48.png',
            imageheight: 1584,
            imagewidth: 1536,
            margin: 0,
            name: 'Interiors_free_48x48',
            spacing: 0,
            tilecount: 1056,
            tilewidth: tw,
            tileheight: th,
        },
    ];

    // Initialize empty tile data
    const emptyData = new Array(totalTiles).fill(0);

    // For gallery template, fill floor and add walls
    let belowData = [...emptyData];
    let worldData = [...emptyData];
    if (template === 'gallery' || template === 'museum') {
        // Fill floor with a beige floor tile (Room_Builder firstgid=1, tile 109 = clean floor)
        const floorTile = 110; // Light wooden floor
        belowData = belowData.map(() => floorTile);

        // Add walls on edges (tile 1 = wall top-left, etc.)
        for (let x = 0; x < width; x++) {
            worldData[x] = 28;                          // Top wall
            worldData[(height - 1) * width + x] = 82;  // Bottom wall
        }
        for (let y = 0; y < height; y++) {
            worldData[y * width] = 55;                  // Left wall
            worldData[y * width + (width - 1)] = 57;   // Right wall
        }
    }

    // Create spawn and exit door objects
    const objects = [
        {
            id: 1, name: 'spawn', point: true,
            x: Math.floor(width / 2) * tw, y: (height - 2) * th,
            width: 0, height: 0, rotation: 0, type: '', visible: true, properties: [],
        },
        {
            id: 2, name: 'door', point: true,
            x: Math.floor(width / 2) * tw, y: (height - 1) * th,
            width: 0, height: 0, rotation: 0, type: '', visible: true,
            properties: [
                { name: 'nextMap', type: 'string', value: 'worldscene' },
                { name: 'label', type: 'string', value: 'Exit' },
            ],
        },
    ];

    // For gallery/museum, add a few paintings on the north wall
    if (template === 'gallery' || template === 'museum') {
        const paintingCount = template === 'museum' ? 5 : 3;
        const spacing = Math.floor(width / (paintingCount + 1));
        for (let i = 0; i < paintingCount; i++) {
            objects.push({
                id: 3 + i, name: 'painting', point: true,
                x: (spacing * (i + 1)) * tw, y: 2 * th,
                width: 0, height: 0, rotation: 0, type: '', visible: true,
                properties: [
                    { name: 'title', type: 'string', value: `Artwork ${i + 1}` },
                    { name: 'artist', type: 'string', value: 'Unknown' },
                    { name: 'price', type: 'string', value: `${(5000 + i * 2500)}` },
                    { name: 'description', type: 'string', value: '' },
                ],
            });
        }
        // Add an NPC
        objects.push({
            id: 3 + paintingCount, name: 'npc', point: true,
            x: Math.floor(width * 0.7) * tw, y: Math.floor(height * 0.5) * th,
            width: 0, height: 0, rotation: 0, type: '', visible: true,
            properties: [
                { name: 'id', type: 'string', value: 'gallery_npc' },
                { name: 'label', type: 'string', value: 'Gallery Curator' },
                { name: 'dialogue', type: 'string', value: 'Welcome to the gallery.' },
                { name: 'canHaggle', type: 'string', value: 'false' },
            ],
        });
    }

    return {
        compressionlevel: -1,
        height,
        width,
        infinite: false,
        orientation: 'orthogonal',
        renderorder: 'right-down',
        tilewidth: tw,
        tileheight: th,
        tiledversion: '1.11.2',
        type: 'map',
        version: '1.10',
        nextlayerid: 5,
        nextobjectid: objects.length + 1,
        tilesets,
        layers: [
            {
                data: belowData, height, width,
                id: 1, name: 'below_player', opacity: 1,
                type: 'tilelayer', visible: true, x: 0, y: 0,
            },
            {
                data: worldData, height, width,
                id: 2, name: 'world', opacity: 1,
                type: 'tilelayer', visible: true, x: 0, y: 0,
            },
            {
                data: [...emptyData], height, width,
                id: 3, name: 'above_player', opacity: 1,
                type: 'tilelayer', visible: true, x: 0, y: 0,
            },
            {
                draworder: 'topdown', id: 4, name: 'objects',
                objects, opacity: 1, type: 'objectgroup',
                visible: true, x: 0, y: 0,
            },
        ],
    };
}

function RoomWizard({ onClose, onCreateRoom }) {
    const [name, setName] = useState('');
    const [mapId, setMapId] = useState('');
    const [template, setTemplate] = useState('gallery');
    const [width, setWidth] = useState(12);
    const [height, setHeight] = useState(10);

    // Auto-generate mapId from name
    const handleNameChange = (val) => {
        setName(val);
        setMapId(val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    };

    const handleCreate = () => {
        if (!mapId) return;
        const mapJSON = generateBlankMap(width, height, template);
        onCreateRoom(mapId, name || mapId, mapJSON);
    };

    const templates = [
        { id: 'blank', label: 'Blank Room', desc: 'Empty room, no walls or floor' },
        { id: 'gallery', label: 'Small Gallery', desc: '3 paintings, 1 NPC, walls + floor' },
        { id: 'museum', label: 'Museum Hall', desc: '5 paintings, 1 NPC, larger layout' },
    ];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
        }}>
            <div style={{
                background: '#0a0a14', border: '1px solid #c9a84c',
                borderRadius: 4, padding: 24, width: 420,
                fontFamily: mono,
            }}>
                <div style={{ fontSize: 14, color: '#c9a84c', fontWeight: 'bold', marginBottom: 16, letterSpacing: 2 }}>
                    CREATE NEW ROOM
                </div>

                {/* Name */}
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>ROOM NAME</div>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="My Gallery"
                        style={wizInputStyle}
                        autoFocus
                    />
                </div>

                {/* Map ID */}
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>MAP ID (auto-generated)</div>
                    <input
                        type="text"
                        value={mapId}
                        onChange={(e) => setMapId(e.target.value)}
                        placeholder="my_gallery"
                        style={wizInputStyle}
                    />
                </div>

                {/* Template */}
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>TEMPLATE</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {templates.map(t => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setTemplate(t.id);
                                    if (t.id === 'museum') { setWidth(18); setHeight(14); }
                                    else if (t.id === 'gallery') { setWidth(12); setHeight(10); }
                                    else { setWidth(10); setHeight(10); }
                                }}
                                style={{
                                    background: template === t.id ? 'rgba(201,168,76,0.15)' : '#111',
                                    border: template === t.id ? '1px solid #c9a84c' : '1px solid #333',
                                    color: template === t.id ? '#c9a84c' : '#888',
                                    padding: '8px 12px', cursor: 'pointer', fontFamily: mono, fontSize: 11,
                                    textAlign: 'left', borderRadius: 2,
                                }}
                            >
                                <div style={{ fontWeight: 'bold' }}>{t.label}</div>
                                <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{t.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Size */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>WIDTH (tiles)</div>
                        <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))}
                            min={5} max={30} style={{ ...wizInputStyle, width: 80 }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>HEIGHT (tiles)</div>
                        <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))}
                            min={5} max={30} style={{ ...wizInputStyle, width: 80 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', fontSize: 10, color: '#555', fontFamily: mono }}>
                        = {width * 48}&times;{height * 48}px
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{
                        background: '#111', border: '1px solid #333', color: '#888',
                        padding: '8px 16px', cursor: 'pointer', fontFamily: mono, fontSize: 11,
                    }}>CANCEL</button>
                    <button
                        onClick={handleCreate}
                        disabled={!mapId}
                        style={{
                            background: mapId ? '#1a3a1a' : '#111',
                            border: mapId ? '1px solid #3a8a5c' : '1px solid #333',
                            color: mapId ? '#4ade80' : '#555',
                            padding: '8px 16px', cursor: mapId ? 'pointer' : 'not-allowed',
                            fontFamily: mono, fontSize: 11, fontWeight: 'bold',
                        }}
                    >CREATE & EDIT</button>
                </div>
            </div>
        </div>
    );
}

const wizInputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#111', border: '1px solid #2a2a3e', color: '#ddd',
    padding: '8px 10px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12,
    borderRadius: 2,
};

// ════════════════════════════════════════════════════════════════
// Main RoomManager Component
// ════════════════════════════════════════════════════════════════

export default function RoomManager({ onClose }) {
    const [selectedVenueId, setSelectedVenueId] = useState(null);
    const [mapData, setMapData] = useState({});
    const [editingMapId, setEditingMapId] = useState(null);
    const [showWizard, setShowWizard] = useState(false);

    // Fetch all Tiled map JSONs on mount, preferring cmsStore snapshots
    useEffect(() => {
        const tiledMaps = new Set();
        for (const venue of VENUES) {
            for (const room of venue.rooms) {
                if (room.tiledMap) tiledMaps.add(room.tiledMap);
            }
        }

        // Check cmsStore for persisted map edits first
        const savedMaps = useCmsStore.getState().getAllMapSnapshots();

        Promise.all(
            [...tiledMaps].map(async (id) => {
                // Use cmsStore snapshot if available (user's edits take priority)
                if (savedMaps[id]) {
                    mapCache[id] = savedMaps[id];
                    return [id, savedMaps[id]];
                }
                const json = await fetchMapJSON(id);
                return [id, json];
            })
        ).then(results => {
            const data = {};
            for (const [id, json] of results) {
                if (json) data[id] = json;
            }
            setMapData(data);
        });
    }, []);

    const selectedVenue = selectedVenueId ? VENUE_MAP[selectedVenueId] : null;

    // Find the room data for the editing map
    const editingRoom = editingMapId
        ? VENUES.flatMap(v => v.rooms).find(r => r.tiledMap === editingMapId)
        : null;

    // Handle saving edited map JSON back — persists to cmsStore (localStorage)
    const handleSaveMap = useCallback((updatedJSON) => {
        // Update in-memory cache so inspector refreshes
        setMapData(prev => ({ ...prev, [editingMapId]: updatedJSON }));
        mapCache[editingMapId] = updatedJSON;

        // Persist to cmsStore for cross-session persistence
        useCmsStore.getState().saveMapSnapshot(editingMapId, updatedJSON);
    }, [editingMapId]);

    // Handle creating a new room from the wizard
    const handleCreateRoom = useCallback((mapId, name, mapJSON) => {
        // Save to cmsStore and in-memory cache
        useCmsStore.getState().saveMapSnapshot(mapId, mapJSON);
        setMapData(prev => ({ ...prev, [mapId]: mapJSON }));
        mapCache[mapId] = mapJSON;
        setShowWizard(false);
        // Open it immediately in the editor
        setEditingMapId(mapId);
    }, []);

    // If editing a map, show the MapEditor full-screen
    if (editingMapId && mapData[editingMapId]) {
        return (
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <MapEditor
                    mapJSON={mapData[editingMapId]}
                    roomData={editingRoom}
                    onClose={() => setEditingMapId(null)}
                    onSave={handleSaveMap}
                />
            </div>
        );
    }

    return (
        <div style={{
            flex: 1, display: 'flex', gap: 1, overflow: 'hidden',
            padding: '8px', fontFamily: mono, position: 'relative',
        }}>
            {/* Room creation wizard modal */}
            {showWizard && (
                <RoomWizard
                    onClose={() => setShowWizard(false)}
                    onCreateRoom={handleCreateRoom}
                />
            )}

            {/* Left: Room List */}
            <div style={{ width: '25%', minWidth: 220, display: 'flex', flexDirection: 'column' }}>
                <RoomList
                    selectedVenueId={selectedVenueId}
                    onSelectVenue={setSelectedVenueId}
                    mapData={mapData}
                />
                {/* Create Room button at bottom of list */}
                <button
                    onClick={() => setShowWizard(true)}
                    style={{
                        margin: '4px 0 0', padding: '10px 12px',
                        background: '#1a1a0a', border: '1px solid #c9a84c',
                        color: '#c9a84c', cursor: 'pointer',
                        fontFamily: mono, fontSize: 11, fontWeight: 'bold',
                        borderRadius: 4,
                    }}
                >+ CREATE ROOM</button>
            </div>

            {/* Center: Room Inspector */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '0 8px' }}>
                <RoomInspector venue={selectedVenue} mapData={mapData} />
            </div>

            {/* Right: Actions */}
            <ActionsPanel
                venue={selectedVenue}
                mapData={mapData}
                onClose={onClose}
                onEditMap={setEditingMapId}
            />
        </div>
    );
}
