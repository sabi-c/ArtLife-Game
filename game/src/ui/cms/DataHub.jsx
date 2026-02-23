import React, { useState, useRef, useCallback } from 'react';
import { useCmsStore } from '../../stores/cmsStore.js';
import { EventRegistry } from '../../managers/EventRegistry.js';
import { useNPCStore } from '../../stores/npcStore.js';
import { MarketManager } from '../../managers/MarketManager.js';

// ══════════════════════════════════════
// Styles
// ══════════════════════════════════════
const S = {
    root: {
        padding: 32, display: 'flex', flexDirection: 'column', gap: 24,
        height: '100%', overflow: 'auto', fontFamily: 'inherit',
        background: 'linear-gradient(180deg, #080810 0%, #0a0a14 100%)',
    },
    section: {
        background: '#0c0c18', border: '1px solid #1a1a2e', borderRadius: 8,
        padding: 24, position: 'relative',
    },
    sectionTitle: {
        color: '#c9a84c', fontSize: 13, fontWeight: 700, letterSpacing: 2,
        textTransform: 'uppercase', margin: '0 0 16px 0',
    },
    gold: { color: '#c9a84c' },
    dim: { color: '#555', fontSize: 11 },
    text: { color: '#ccc', fontSize: 13, lineHeight: 1.6 },
    btn: {
        background: '#111', border: '1px solid #c9a84c', color: '#c9a84c',
        padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 12, textTransform: 'uppercase', fontWeight: 700,
        letterSpacing: 1, borderRadius: 4, transition: 'all 0.2s',
    },
    btnDanger: {
        background: '#1a0a0a', border: '1px solid #f44336', color: '#f44336',
        padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 11, textTransform: 'uppercase', fontWeight: 700,
        borderRadius: 4,
    },
    btnSmall: {
        background: '#111', border: '1px solid #333', color: '#aaa',
        padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 11, borderRadius: 4,
    },
    badge: (color = '#c9a84c') => ({
        display: 'inline-block', background: `${color}22`, color,
        border: `1px solid ${color}44`, borderRadius: 12, padding: '3px 10px',
        fontSize: 11, fontWeight: 600,
    }),
    dropzone: (active) => ({
        border: `2px dashed ${active ? '#c9a84c' : '#333'}`,
        borderRadius: 8, padding: 32, textAlign: 'center',
        background: active ? 'rgba(201, 168, 76, 0.05)' : 'transparent',
        transition: 'all 0.2s', cursor: 'pointer',
    }),
    table: {
        width: '100%', borderCollapse: 'collapse', fontSize: 13,
    },
    th: {
        textAlign: 'left', padding: '8px 12px', color: '#c9a84c',
        borderBottom: '1px solid #222', fontSize: 11, textTransform: 'uppercase',
        letterSpacing: 1,
    },
    td: {
        padding: '8px 12px', color: '#ccc', borderBottom: '1px solid #111',
    },
    status: (type) => ({
        padding: '10px 16px', borderRadius: 4, marginTop: 12,
        background: type === 'success' ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
        border: `1px solid ${type === 'success' ? '#4caf50' : '#f44336'}`,
        color: type === 'success' ? '#4caf50' : '#ffaaaa',
        fontSize: 12,
    }),
    presetCard: (active) => ({
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: active ? 'rgba(201,168,76,0.08)' : '#0a0a12',
        border: `1px solid ${active ? '#c9a84c55' : '#1a1a2e'}`, borderRadius: 6,
        transition: 'all 0.2s',
    }),
};

// ══════════════════════════════════════
// Component
// ══════════════════════════════════════
export default function DataHub() {
    const store = useCmsStore();
    const [status, setStatus] = useState(null);
    const [newPresetName, setNewPresetName] = useState('');
    const [showPresetInput, setShowPresetInput] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [importPreview, setImportPreview] = useState(null);
    const [jsonPaste, setJsonPaste] = useState('');
    const [pasteTarget, setPasteTarget] = useState('auto');
    const fileRef = useRef(null);

    const flash = useCallback((type, message) => {
        setStatus({ type, message });
        setTimeout(() => setStatus(null), 5000);
    }, []);

    // ── Data Summary ──
    const summary = store.getDataSummary();
    const presets = store.listPresets();
    const activePreset = store.activePreset;

    // ── Preset Handlers ──
    const handleSavePreset = () => {
        const name = newPresetName.trim();
        if (!name) return flash('error', 'Enter a preset name');
        store.saveAsPreset(name);
        setNewPresetName('');
        setShowPresetInput(false);
        flash('success', `Preset "${name}" saved`);
    };

    const handleLoadPreset = (name) => {
        if (store.loadPreset(name)) flash('success', `Loaded preset: "${name}"`);
        else flash('error', `Failed to load preset: "${name}"`);
    };

    const handleDeletePreset = (name) => {
        if (confirm(`Delete preset "${name}"? This cannot be undone.`)) {
            store.deletePreset(name);
            flash('success', `Deleted preset: "${name}"`);
        }
    };

    // ── File Import ──
    const processFile = (file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                const preview = {
                    filename: file.name,
                    events: (parsed.events || []).length,
                    storylines: (parsed.storylines || []).length,
                    npcs: (parsed.npcs || []).length,
                    artworks: (parsed.artworks || []).length,
                    artists: (parsed.artists || []).length,
                    hasMaps: !!parsed.maps,
                    hasHaggle: !!parsed.haggle_config,
                    raw: parsed,
                };
                setImportPreview(preview);
            } catch (err) {
                flash('error', `Parse error: ${err.message}`);
            }
        };
        reader.readAsText(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) processFile(file);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleConfirmImport = () => {
        if (!importPreview?.raw) return;
        const ok = store.importBundle(importPreview.raw);
        if (ok) {
            flash('success', `Imported: ${importPreview.filename}`);
            setImportPreview(null);
        } else {
            flash('error', 'Import failed');
        }
    };

    // ── JSON Paste Ingest ──
    const handlePasteIngest = () => {
        try {
            const parsed = JSON.parse(jsonPaste);
            const incoming = Array.isArray(parsed) ? parsed : [parsed];
            if (incoming.length === 0) throw new Error('Payload is empty.');

            let domain = pasteTarget;
            if (domain === 'auto') {
                const s = incoming[0];
                if (s.npcId && Array.isArray(s.steps)) domain = 'storylines';
                else if (s.id && s.type === 'start') domain = 'events';
                else if (s.tier && s.role) domain = 'npcs';
                else if (s.id && s.works) domain = 'market';
                else throw new Error('Cannot auto-detect domain. Select target manually.');
            }

            let inserted = 0, updated = 0;
            if (domain === 'storylines') {
                const arr = [...EventRegistry.jsonStorylines];
                incoming.forEach(sl => { const i = arr.findIndex(x => x.id === sl.id); if (i >= 0) { arr[i] = sl; updated++; } else { arr.push(sl); inserted++; } });
                EventRegistry.jsonStorylines = arr;
            } else if (domain === 'events') {
                const arr = [...EventRegistry.jsonEvents];
                incoming.forEach(ev => { const i = arr.findIndex(x => x.id === ev.id); if (i >= 0) { arr[i] = ev; updated++; } else { arr.push(ev); inserted++; } });
                EventRegistry.jsonEvents = arr;
            } else if (domain === 'npcs') {
                useNPCStore.setState(state => {
                    const contacts = [...(state.contacts || [])];
                    incoming.forEach(npc => { const i = contacts.findIndex(x => x.id === npc.id); if (i >= 0) { contacts[i] = { ...contacts[i], ...npc }; updated++; } else { contacts.push(npc); inserted++; } });
                    return { contacts };
                });
            } else if (domain === 'market') {
                if (!MarketManager.artists) throw new Error('MarketManager not ready.');
                const arr = [...MarketManager.artists];
                incoming.forEach(a => { const i = arr.findIndex(x => x.id === a.id); if (i >= 0) { arr[i] = a; updated++; } else { arr.push(a); inserted++; } });
                MarketManager.artists = arr;
            }
            setJsonPaste('');
            flash('success', `[${domain.toUpperCase()}] ${inserted} new, ${updated} updated`);
        } catch (err) {
            flash('error', err.message);
        }
    };

    // ── Export ──
    const handleExport = () => {
        if (store.exportBundle()) flash('success', 'Bundle exported → downloads');
        else flash('error', 'Export failed');
    };

    // ══════════════════════════════════════
    // Render
    // ══════════════════════════════════════
    return (
        <div style={S.root}>
            {/* ── Status Flash ── */}
            {status && <div style={S.status(status.type)}>{status.message}</div>}

            {/* ═══ Section 1: Active Preset ═══ */}
            <div style={S.section}>
                <h3 style={S.sectionTitle}>📦 Data Presets</h3>

                {/* Active preset banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ ...S.text, fontWeight: 600 }}>Active:</span>
                    <span style={S.badge()}>{activePreset || 'Unsaved State'}</span>
                    <div style={{ flex: 1 }} />
                    {!showPresetInput ? (
                        <button style={S.btn} onClick={() => setShowPresetInput(true)}>
                            + Save Current as Preset
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                value={newPresetName}
                                onChange={e => setNewPresetName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                                placeholder="Preset name..."
                                autoFocus
                                style={{
                                    background: '#111', border: '1px solid #c9a84c', color: '#eee',
                                    padding: '8px 12px', fontFamily: 'inherit', fontSize: 12, borderRadius: 4, width: 180,
                                }}
                            />
                            <button style={S.btn} onClick={handleSavePreset}>Save</button>
                            <button style={S.btnSmall} onClick={() => setShowPresetInput(false)}>Cancel</button>
                        </div>
                    )}
                </div>

                {/* Preset list */}
                {presets.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {presets.map(p => (
                            <div key={p.name} style={S.presetCard(p.name === activePreset)}>
                                <div>
                                    <span style={{ color: '#eee', fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                                    <span style={S.dim}> — {new Date(p.savedAt).toLocaleDateString()}</span>
                                    <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                                        {Object.entries(p.summary || {}).filter(([, v]) => v > 0).map(([k, v]) => (
                                            <span key={k} style={S.badge('#888')}>{v} {k}</span>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {p.name !== activePreset && (
                                        <button style={S.btn} onClick={() => handleLoadPreset(p.name)}>Load</button>
                                    )}
                                    <button style={S.btnDanger} onClick={() => handleDeletePreset(p.name)}>✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={S.dim}>No presets saved yet. Save your current data as a preset to get started.</div>
                )}
            </div>

            {/* ═══ Section 2: Import / Export ═══ */}
            <div style={S.section}>
                <h3 style={S.sectionTitle}>🔄 Bulk Import / Export</h3>

                <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                    {/* File drop zone */}
                    <div
                        style={{ ...S.dropzone(dragActive), flex: 1 }}
                        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                    >
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                        <div style={{ ...S.text, fontWeight: 600 }}>Drop JSON file here</div>
                        <div style={S.dim}>or click to browse</div>
                        <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} style={{ display: 'none' }} />
                    </div>

                    {/* Export panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }}>
                        <button style={S.btn} onClick={handleExport}>⬇ Export Full Bundle</button>
                        <div style={S.dim}>Downloads all game data as a single JSON file that can be re-imported or shared.</div>
                    </div>
                </div>

                {/* Import preview */}
                {importPreview && (
                    <div style={{ background: '#0a0a20', border: '1px solid #c9a84c44', borderRadius: 6, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ ...S.text, fontWeight: 600 }}>Preview: {importPreview.filename}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button style={S.btn} onClick={handleConfirmImport}>✓ Confirm Import</button>
                                <button style={S.btnSmall} onClick={() => setImportPreview(null)}>Cancel</button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {importPreview.events > 0 && <span style={S.badge('#4caf50')}>{importPreview.events} events</span>}
                            {importPreview.storylines > 0 && <span style={S.badge('#2196f3')}>{importPreview.storylines} storylines</span>}
                            {importPreview.npcs > 0 && <span style={S.badge('#ff9800')}>{importPreview.npcs} NPCs</span>}
                            {importPreview.artworks > 0 && <span style={S.badge('#e91e63')}>{importPreview.artworks} artworks</span>}
                            {importPreview.artists > 0 && <span style={S.badge('#9c27b0')}>{importPreview.artists} artists</span>}
                            {importPreview.hasMaps && <span style={S.badge('#00bcd4')}>maps</span>}
                            {importPreview.hasHaggle && <span style={S.badge('#cddc39')}>haggle config</span>}
                        </div>
                    </div>
                )}

                {/* JSON paste fallback */}
                <details style={{ marginTop: 16 }}>
                    <summary style={{ ...S.text, cursor: 'pointer', color: '#888' }}>
                        ▸ Advanced: Paste Raw JSON
                    </summary>
                    <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                            <span style={{ ...S.dim, textTransform: 'uppercase', letterSpacing: 1 }}>Target:</span>
                            <select
                                value={pasteTarget}
                                onChange={e => setPasteTarget(e.target.value)}
                                style={{ background: '#111', color: '#eee', border: '1px solid #333', padding: '6px 10px', fontFamily: 'inherit', fontSize: 12, borderRadius: 4 }}
                            >
                                <option value="auto">Auto-Detect</option>
                                <option value="storylines">Storylines</option>
                                <option value="events">Events</option>
                                <option value="npcs">NPCs</option>
                                <option value="market">Market (Artists)</option>
                            </select>
                        </div>
                        <textarea
                            value={jsonPaste}
                            onChange={e => setJsonPaste(e.target.value)}
                            spellCheck={false}
                            placeholder='Paste JSON array here...'
                            style={{
                                width: '100%', minHeight: 160, background: '#080812',
                                border: '1px solid #222', color: '#4caf50', padding: 12,
                                fontFamily: 'monospace', fontSize: 12, borderRadius: 4,
                                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                        <button style={{ ...S.btn, marginTop: 8 }} onClick={handlePasteIngest}>
                            Execute Injection
                        </button>
                    </div>
                </details>
            </div>

            {/* ═══ Section 3: Data Summary ═══ */}
            <div style={S.section}>
                <h3 style={S.sectionTitle}>📊 Live Data Summary</h3>
                <table style={S.table}>
                    <thead>
                        <tr>
                            <th style={S.th}>Domain</th>
                            <th style={S.th}>Count</th>
                            <th style={S.th}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { domain: 'Events', count: summary.events, icon: '🎭' },
                            { domain: 'Storylines', count: summary.storylines, icon: '⛓️' },
                            { domain: 'NPCs', count: summary.npcs, icon: '👤' },
                            { domain: 'Artists', count: summary.artists, icon: '🎨' },
                            { domain: 'Artworks', count: summary.artworks, icon: '🖼️' },
                        ].map(row => (
                            <tr key={row.domain}>
                                <td style={S.td}>{row.icon} {row.domain}</td>
                                <td style={S.td}>
                                    <span style={{ ...S.gold, fontWeight: 700, fontSize: 16 }}>{row.count}</span>
                                </td>
                                <td style={S.td}>
                                    <span style={S.badge(row.count > 0 ? '#4caf50' : '#f44336')}>
                                        {row.count > 0 ? 'Loaded' : 'Empty'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ ...S.dim, marginTop: 12 }}>
                    Counts reflect live in-memory data. Save as a preset to preserve across sessions.
                </div>
            </div>
        </div>
    );
}
