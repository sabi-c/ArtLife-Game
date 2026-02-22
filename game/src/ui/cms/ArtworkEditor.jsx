import React, { useState, useEffect } from 'react';
import { GameState } from '../../managers/GameState.js';
import { MarketManager } from '../../managers/MarketManager.js';

export default function ArtworkEditor() {
    const [artworks, setArtworks] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [jsonEdit, setJsonEdit] = useState('');
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        // Collect artworks from all state sources
        const allWorks = [];
        if (GameState.state) {
            allWorks.push(...GameState.state.inventory);
            allWorks.push(...GameState.state.marketPhase); // available market works

            // Extract from artists pool if MarketManager initialized
            if (MarketManager.artists && MarketManager.artists.length > 0) {
                MarketManager.artists.forEach(artist => {
                    allWorks.push(...artist.works);
                });
            }
        }

        // Deduplicate
        const unique = [];
        const seen = new Set();
        for (const w of allWorks) {
            if (!w || !w.id) continue;
            if (!seen.has(w.id)) {
                seen.add(w.id);
                unique.push(w);
            }
        }

        setArtworks(unique);
    }, []);

    const selected = artworks.find(w => w.id === selectedId);

    const showNotif = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSelect = (id) => {
        setSelectedId(id);
        const work = artworks.find(w => w.id === id);
        if (work) setJsonEdit(JSON.stringify(work, null, 4));
    };

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(artworks, null, 4));
        const anchor = document.createElement('a');
        anchor.href = dataStr;
        anchor.download = "artworks_dump.json";
        anchor.click();
        showNotif('📥 Downloaded artworks_dump.json');
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

    if (!GameState.state) {
        return (
            <div style={{ padding: 40, color: '#888', textAlign: 'center' }}>
                Game State not initialized. Please load or start a game to view live Artworks.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px', background: '#111', borderBottom: '1px solid #333',
                fontSize: 12, color: '#c9a84c'
            }}>
                <div>
                    <strong>{artworks.length} Artworks in Memory</strong>
                    {notification && <span style={{ color: '#4caf50', marginLeft: 16 }}>{notification}</span>}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleDownload} style={btnStyle}>📥 Export JSON Dump</button>
                    <button style={btnStyle}>➕ New Artwork</button>
                </div>
            </div>

            {/* Three-pane layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 10, gap: 10 }}>
                {/* Panel 1: List */}
                <div style={{ ...panel, flex: '0 0 260px' }}>
                    <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>
                        ALL ARTWORKS
                    </div>
                    {artworks.map(work => (
                        <div key={work.id} onClick={() => handleSelect(work.id)} style={{
                            padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #1a1a2e',
                            background: selectedId === work.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                            borderLeft: selectedId === work.id ? '3px solid #c9a84c' : '3px solid transparent',
                        }}>
                            <div style={{ fontSize: 13, color: selectedId === work.id ? '#c9a84c' : '#eaeaea', fontWeight: 'bold' }}>{work.title}</div>
                            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>ID: {work.id} · {work.artist}</div>
                        </div>
                    ))}
                </div>

                {/* Panel 2: Form */}
                <div style={{ ...panel, flex: '2' }}>
                    {!selected ? (
                        <div style={{ color: '#666', textAlign: 'center', marginTop: 60 }}>Select an Artwork to view metadata.</div>
                    ) : (
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#c9a84c', marginBottom: 20 }}>METADATA: {selected.title}</div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Title</label>
                                    <input readOnly value={selected.title || ''} style={{ width: '100%', padding: 8, background: '#111', color: '#888', border: '1px solid #333' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Artist</label>
                                    <input readOnly value={selected.artist || ''} style={{ width: '100%', padding: 8, background: '#111', color: '#888', border: '1px solid #333' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Medium</label>
                                    <input readOnly value={selected.medium || ''} style={{ width: '100%', padding: 8, background: '#111', color: '#888', border: '1px solid #333' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Base Price</label>
                                    <input readOnly value={`$${(selected.price || selected.originalPrice || 0).toLocaleString()}`} style={{ width: '100%', padding: 8, background: '#111', color: '#4caf50', border: '1px solid #333' }} />
                                </div>
                            </div>

                            <div style={{ marginTop: 20 }}>
                                <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Description / Notes</label>
                                <textarea readOnly value={selected.notes || 'No description available.'} style={{ width: '100%', height: 100, padding: 8, background: '#111', color: '#888', border: '1px solid #333', resize: 'vertical' }} />
                            </div>

                            <div style={{ marginTop: 20, color: '#666', fontSize: 10 }}>
                                * Artworks are dynamically instanced during gameplay via generator logic. Direct hot-swapping is disabled for instances. Use the AI Ingestion tab to add new generator source data.
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel 3: JSON */}
                <div style={{ ...panel, flex: '0 0 320px' }}>
                    <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 12 }}>RAW JSON DUMP (READ-ONLY)</div>
                    <textarea readOnly value={jsonEdit} spellCheck={false} style={{ flex: 1, background: '#050508', color: '#4caf50', border: '1px solid #333', fontFamily: 'inherit', fontSize: 11, padding: 8, resize: 'none', outline: 'none' }} placeholder="Select Artwork to view full JSON payload..." />
                </div>
            </div>
        </div>
    );
}
