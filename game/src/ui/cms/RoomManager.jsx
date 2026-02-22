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

import React, { useState, useEffect, useMemo } from 'react';
import { VENUES, VENUE_MAP, ROOM_MAP } from '../../data/rooms.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';

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

function ActionsPanel({ venue, mapData, onClose }) {
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
// Main RoomManager Component
// ════════════════════════════════════════════════════════════════

export default function RoomManager({ onClose }) {
    const [selectedVenueId, setSelectedVenueId] = useState(null);
    const [mapData, setMapData] = useState({});

    // Fetch all Tiled map JSONs on mount
    useEffect(() => {
        const tiledMaps = new Set();
        for (const venue of VENUES) {
            for (const room of venue.rooms) {
                if (room.tiledMap) tiledMaps.add(room.tiledMap);
            }
        }

        Promise.all(
            [...tiledMaps].map(async (id) => {
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

    return (
        <div style={{
            flex: 1, display: 'flex', gap: 1, overflow: 'hidden',
            padding: '8px', fontFamily: mono,
        }}>
            {/* Left: Room List */}
            <div style={{ width: '25%', minWidth: 220, display: 'flex', flexDirection: 'column' }}>
                <RoomList
                    selectedVenueId={selectedVenueId}
                    onSelectVenue={setSelectedVenueId}
                    mapData={mapData}
                />
            </div>

            {/* Center: Room Inspector */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '0 8px' }}>
                <RoomInspector venue={selectedVenue} mapData={mapData} />
            </div>

            {/* Right: Actions */}
            <ActionsPanel venue={selectedVenue} mapData={mapData} onClose={onClose} />
        </div>
    );
}
