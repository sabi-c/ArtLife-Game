import React, { useState, useEffect, useCallback } from 'react';
import { GameState } from '../../managers/GameState.js';
import { MarketManager } from '../../managers/MarketManager.js';
import { useCmsStore } from '../../stores/cmsStore.js';

export default function ArtworkEditor() {
    const [artworks, setArtworks] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [jsonEdit, setJsonEdit] = useState('');
    const [notification, setNotification] = useState(null);
    const [filter, setFilter] = useState('all'); // all, inventory, market

    useEffect(() => {
        try {
            // Collect artworks from all state sources
            const allWorks = [];
            if (GameState.state) {
                // Player inventory
                const inv = GameState.state.inventory;
                if (Array.isArray(inv)) {
                    inv.forEach(w => { if (w) allWorks.push({ ...w, _source: 'inventory' }); });
                }

                // NOTE: GameState.state.marketPhase is a STRING ('stable', 'bubble', etc.)
                // NOT an artwork array — do NOT spread it.
            }

            // Market works from MarketManager (the canonical source)
            if (MarketManager.works && Array.isArray(MarketManager.works)) {
                MarketManager.works.forEach(w => { if (w) allWorks.push({ ...w, _source: 'market' }); });
            }

            // Extract from artists pool if MarketManager initialized
            if (MarketManager.artists && Array.isArray(MarketManager.artists)) {
                MarketManager.artists.forEach(artist => {
                    if (artist && Array.isArray(artist.works)) {
                        artist.works.forEach(w => {
                            if (w) allWorks.push({ ...w, _source: 'artist', _artistName: artist.name });
                        });
                    }
                });
            }

            // Deduplicate by id
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
        } catch (err) {
            console.error('[ArtworkEditor] Failed to collect artworks:', err);
            setArtworks([]);
        }
    }, []);

    const filtered = filter === 'all'
        ? artworks
        : artworks.filter(w => w._source === filter);

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

    const handleFieldEdit = useCallback((field, value) => {
        if (!selected) return;
        const updated = artworks.map(w =>
            w.id === selected.id ? { ...w, [field]: value } : w
        );
        setArtworks(updated);
        const updatedWork = updated.find(w => w.id === selected.id);
        if (updatedWork) setJsonEdit(JSON.stringify(updatedWork, null, 4));
        useCmsStore.getState().markDirty('artworks');
    }, [selected, artworks]);

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(artworks, null, 4));
        const anchor = document.createElement('a');
        anchor.href = dataStr;
        anchor.download = "artworks_dump.json";
        anchor.click();
        showNotif('📥 Downloaded artworks_dump.json');
    };

    const handleHotSwap = () => {
        try {
            const parsed = JSON.parse(jsonEdit);
            const updated = artworks.map(w => w.id === parsed.id ? { ...parsed, _source: w._source } : w);
            setArtworks(updated);
            useCmsStore.getState().markDirty('artworks');
            showNotif('🔥 Hot-swapped artwork into memory');
        } catch (err) {
            showNotif('❌ JSON Error: ' + err.message);
        }
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

    const inputStyle = {
        width: '100%', padding: 8, background: '#111', color: '#eaeaea',
        border: '1px solid #333', fontFamily: 'inherit', fontSize: 12,
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <strong>{filtered.length} Artworks</strong>
                    {/* Filter tabs */}
                    {['all', 'inventory', 'market', 'artist'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            ...btnStyle, fontSize: 10,
                            borderColor: filter === f ? '#c9a84c' : '#333',
                            color: filter === f ? '#c9a84c' : '#666',
                        }}>
                            {f === 'all' ? '🏷️ All' : f === 'inventory' ? '🎒 Owned' : f === 'market' ? '📊 Market' : '🎨 Artists'}
                        </button>
                    ))}
                    {notification && <span style={{ color: '#4caf50', marginLeft: 8 }}>{notification}</span>}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleDownload} style={btnStyle}>📥 Export JSON</button>
                </div>
            </div>

            {/* Three-pane layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 10, gap: 10 }}>
                {/* Panel 1: List */}
                <div style={{ ...panel, flex: '0 0 260px' }}>
                    <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>
                        {filter === 'all' ? 'ALL ARTWORKS' : filter.toUpperCase()}
                    </div>
                    {filtered.length === 0 && (
                        <div style={{ color: '#555', fontSize: 11, padding: 20, textAlign: 'center' }}>
                            No artworks found. Start a game to populate.
                        </div>
                    )}
                    {filtered.map(work => (
                        <div key={work.id} onClick={() => handleSelect(work.id)} style={{
                            padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #1a1a2e',
                            background: selectedId === work.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                            borderLeft: selectedId === work.id ? '3px solid #c9a84c' : '3px solid transparent',
                        }}>
                            <div style={{ fontSize: 13, color: selectedId === work.id ? '#c9a84c' : '#eaeaea', fontWeight: 'bold' }}>
                                {work.title || 'Untitled'}
                            </div>
                            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                                {work.artist || 'Unknown'} · ${(work.price || work.originalPrice || 0).toLocaleString()}
                                <span style={{
                                    marginLeft: 8, padding: '1px 5px', borderRadius: 3, fontSize: 8,
                                    background: work._source === 'inventory' ? 'rgba(74,222,128,0.15)' : 'rgba(136,187,221,0.15)',
                                    color: work._source === 'inventory' ? '#4ade80' : '#88bbdd',
                                }}>
                                    {work._source}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Panel 2: Editable Form */}
                <div style={{ ...panel, flex: '2' }}>
                    {!selected ? (
                        <div style={{ color: '#666', textAlign: 'center', marginTop: 60 }}>Select an Artwork to view and edit metadata.</div>
                    ) : (
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#c9a84c', marginBottom: 20 }}>
                                METADATA: {selected.title || 'Untitled'}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Title</label>
                                    <input value={selected.title || ''} onChange={e => handleFieldEdit('title', e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Artist</label>
                                    <input value={selected.artist || ''} onChange={e => handleFieldEdit('artist', e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Medium</label>
                                    <input value={selected.medium || ''} onChange={e => handleFieldEdit('medium', e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Base Price ($)</label>
                                    <input
                                        type="number"
                                        value={selected.price || selected.originalPrice || 0}
                                        onChange={e => handleFieldEdit('price', parseInt(e.target.value) || 0)}
                                        style={{ ...inputStyle, color: '#4caf50' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Year</label>
                                    <input value={selected.year || ''} onChange={e => handleFieldEdit('year', e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Source</label>
                                    <input readOnly value={selected._source || 'unknown'} style={{ ...inputStyle, color: '#666' }} />
                                </div>
                            </div>

                            <div style={{ marginTop: 20 }}>
                                <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Description / Notes</label>
                                <textarea
                                    value={selected.notes || selected.description || ''}
                                    onChange={e => handleFieldEdit('notes', e.target.value)}
                                    placeholder="Add notes about this artwork..."
                                    style={{ ...inputStyle, height: 100, resize: 'vertical' }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel 3: JSON */}
                <div style={{ ...panel, flex: '0 0 320px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ color: '#666', fontSize: 10, textTransform: 'uppercase' }}>RAW JSON</span>
                        <button onClick={handleHotSwap} style={{ ...btnStyle, fontSize: 10 }}>🔥 Hot-Swap</button>
                    </div>
                    <textarea
                        value={jsonEdit}
                        onChange={e => setJsonEdit(e.target.value)}
                        spellCheck={false}
                        style={{ flex: 1, background: '#050508', color: '#4caf50', border: '1px solid #333', fontFamily: 'inherit', fontSize: 11, padding: 8, resize: 'none', outline: 'none' }}
                        placeholder="Select Artwork to view full JSON payload..."
                    />
                </div>
            </div>
        </div>
    );
}

