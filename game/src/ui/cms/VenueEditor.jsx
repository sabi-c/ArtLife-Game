import React, { useState, useEffect } from 'react';
import { GameState } from '../../managers/GameState.js';

import { VENUE_MAP as rooms } from '../../data/rooms.js';

export default function VenueEditor() {
    const [venues, setVenues] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [jsonEdit, setJsonEdit] = useState('');
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        // Load venues from rooms.js data
        const venueList = Object.entries(rooms).map(([id, data]) => ({ id, ...data }));
        setVenues(venueList);
    }, []);

    const selected = venues.find(v => v.id === selectedId);

    const showNotif = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSelect = (id) => {
        setSelectedId(id);
        const venue = venues.find(v => v.id === id);
        if (venue) setJsonEdit(JSON.stringify(venue, null, 4));
    };

    const handleDownload = () => {
        const out = {};
        venues.forEach(v => {
            const { id, ...data } = v;
            out[id] = data;
        });
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(out, null, 4));
        const anchor = document.createElement('a');
        anchor.href = dataStr;
        anchor.download = "rooms_dump.json";
        anchor.click();
        showNotif('📥 Downloaded rooms_dump.json');
    };

    // ── Styles ──
    const panel = {
        background: '#0a0a0f', border: '1px solid #333', padding: 16, overflow: 'auto',
        fontFamily: 'inherit', fontSize: 12, color: '#eaeaea', flex: 1, display: 'flex', flexDirection: 'column'
    };

    const btnStyle = {
        background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '4px 12px',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, textTransform: 'uppercase',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px', background: '#111', borderBottom: '1px solid #333',
                fontSize: 12, color: '#c9a84c'
            }}>
                <div>
                    <strong>{venues.length} Venues / Rooms</strong>
                    {notification && <span style={{ color: '#4caf50', marginLeft: 16 }}>{notification}</span>}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleDownload} style={btnStyle}>📥 Export JSON Dump</button>
                </div>
            </div>

            {/* Three-pane layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 10, gap: 10 }}>
                {/* Panel 1: List */}
                <div style={{ ...panel, flex: '0 0 260px' }}>
                    <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>
                        ALL VENUES
                    </div>
                    {venues.map(v => (
                        <div key={v.id} onClick={() => handleSelect(v.id)} style={{
                            padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #1a1a2e',
                            background: selectedId === v.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                            borderLeft: selectedId === v.id ? '3px solid #c9a84c' : '3px solid transparent',
                        }}>
                            <div style={{ fontSize: 13, color: selectedId === v.id ? '#c9a84c' : '#eaeaea', fontWeight: 'bold' }}>{v.name}</div>
                            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>ID: {v.id}</div>
                        </div>
                    ))}
                </div>

                {/* Panel 2: Form */}
                <div style={{ ...panel, flex: '2' }}>
                    {!selected ? (
                        <div style={{ color: '#666', textAlign: 'center', marginTop: 60 }}>Select a Venue to view configuration.</div>
                    ) : (
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#c9a84c', marginBottom: 20 }}>VENUE CONFIG: {selected.name}</div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Room Name</label>
                                    <input readOnly value={selected.name || ''} style={{ width: '100%', padding: 8, background: '#111', color: '#888', border: '1px solid #333' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Description</label>
                                    <textarea readOnly value={selected.description || ''} style={{ width: '100%', height: 60, padding: 8, background: '#111', color: '#888', border: '1px solid #333', resize: 'vertical' }} />
                                </div>
                            </div>

                            <div style={{ marginTop: 20 }}>
                                <div style={{ color: '#88bbdd', fontSize: 11, fontWeight: 'bold', marginBottom: 10 }}>EXITS / CONNECTIONS</div>
                                <div style={{ background: '#111', border: '1px solid #333', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {Object.entries(selected.exits || {}).map(([key, destId]) => (
                                        <div key={key} style={{ fontSize: 12, display: 'flex', gap: 10 }}>
                                            <span style={{ color: '#aaa', minWidth: 60 }}>[{key}]</span>
                                            <span style={{ color: '#c9a84c' }}>→ {destId}</span>
                                        </div>
                                    ))}
                                    {Object.keys(selected.exits || {}).length === 0 && <span style={{ color: '#888', fontSize: 11 }}>No exits defined.</span>}
                                </div>
                            </div>

                            <div style={{ marginTop: 20 }}>
                                <div style={{ color: '#88bbdd', fontSize: 11, fontWeight: 'bold', marginBottom: 10 }}>INTERACTABLES</div>
                                <div style={{ background: '#111', border: '1px solid #333', padding: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {(selected.interactables || []).map((item, i) => (
                                        <div key={i} style={{ fontSize: 11, background: '#222', padding: '4px 8px', borderRadius: 4, color: '#eaeaea' }}>
                                            {item.name || item.id}
                                        </div>
                                    ))}
                                    {(selected.interactables || []).length === 0 && <span style={{ color: '#888', fontSize: 11 }}>No interactables mapped.</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel 3: JSON */}
                <div style={{ ...panel, flex: '0 0 320px' }}>
                    <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 12 }}>RAW JSON DUMP (READ-ONLY)</div>
                    <textarea readOnly value={jsonEdit} spellCheck={false} style={{ flex: 1, background: '#050508', color: '#4caf50', border: '1px solid #333', fontFamily: 'inherit', fontSize: 11, padding: 8, resize: 'none', outline: 'none' }} placeholder="Select Venue to view full JSON payload..." />
                </div>
            </div>
        </div>
    );
}
