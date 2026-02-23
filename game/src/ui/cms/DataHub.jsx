import React, { useState, useRef, useCallback } from 'react';
import { useCmsStore } from '../../stores/cmsStore.js';
import { EventRegistry } from '../../managers/EventRegistry.js';
import { useNPCStore } from '../../stores/npcStore.js';
import { MarketManager } from '../../managers/MarketManager.js';
import { ARTWORKS } from '../../data/artworks.js';
import { DOMAIN_SCHEMAS, SAMPLE_TEMPLATES, validateDomainData, detectDomain } from '../../data/DataTemplates.js';

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
        fontSize: 11, textTransform: 'uppercase', fontWeight: 700, borderRadius: 4,
    },
    btnSmall: {
        background: '#111', border: '1px solid #333', color: '#aaa',
        padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 11, borderRadius: 4,
    },
    btnDomain: (color) => ({
        background: `${color}11`, border: `1px solid ${color}55`, color,
        padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 11, borderRadius: 4, fontWeight: 600,
        transition: 'all 0.2s',
    }),
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
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
    th: {
        textAlign: 'left', padding: '8px 12px', color: '#c9a84c',
        borderBottom: '1px solid #222', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1,
    },
    td: { padding: '8px 12px', color: '#ccc', borderBottom: '1px solid #111' },
    status: (type) => ({
        padding: '10px 16px', borderRadius: 4, marginTop: 0,
        background: type === 'success' ? 'rgba(76,175,80,0.1)' : type === 'warning' ? 'rgba(255,152,0,0.1)' : 'rgba(244,67,54,0.1)',
        border: `1px solid ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#f44336'}`,
        color: type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#ffaaaa',
        fontSize: 12,
    }),
    presetCard: (active) => ({
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: active ? 'rgba(201,168,76,0.08)' : '#0a0a12',
        border: `1px solid ${active ? '#c9a84c55' : '#1a1a2e'}`, borderRadius: 6,
        transition: 'all 0.2s',
    }),
    validationBox: {
        background: '#080812', border: '1px solid #222', borderRadius: 6,
        padding: 16, marginTop: 12, maxHeight: 200, overflow: 'auto',
    },
};

// ══════════════════════════════════════
// Helpers
// ══════════════════════════════════════
function downloadJSON(data, filename) {
    const str = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.href = str;
    a.download = filename;
    a.click();
}

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
    const [selectedDomain, setSelectedDomain] = useState(null);
    const fileRef = useRef(null);

    const flash = useCallback((type, message) => {
        setStatus({ type, message });
        setTimeout(() => setStatus(null), 6000);
    }, []);

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
        flash('success', `Preset "${name}" saved with ${Object.values(summary).reduce((a, b) => a + b, 0)} total items`);
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

    // ── Manage Domain ──
    const handleManageDomain = (domain) => {
        if (!store.snapshots[domain]) {
            let existingData = [];
            if (domain === 'events') existingData = EventRegistry.jsonEvents;
            else if (domain === 'storylines') existingData = EventRegistry.jsonStorylines;
            else if (domain === 'npcs') existingData = useNPCStore.getState().contacts;
            else if (domain === 'artists') existingData = MarketManager.artists;
            else if (domain === 'artworks') existingData = ARTWORKS;

            if (existingData && existingData.length > 0) {
                store.saveSnapshot(domain, existingData);
            }
        }
        setSelectedDomain(domain);
    };

    // ── Template Downloads ──
    const handleDownloadTemplate = (domain) => {
        const sample = SAMPLE_TEMPLATES[domain]();
        const schema = DOMAIN_SCHEMAS[domain];
        const template = {
            _meta: {
                domain,
                schema: {
                    required: schema.requiredFields,
                    optional: schema.optionalFields,
                    types: schema.fieldTypes,
                },
                instructions: `Fill in the ${schema.label} data below. Required fields: ${schema.requiredFields.join(', ')}. Each item must have a unique "${schema.idField}".`,
            },
            [domain]: [sample, sample], // Two sample items
        };
        downloadJSON(template, `artlife_template_${domain}.json`);
        flash('success', `Downloaded ${schema.label} template`);
    };

    const handleDownloadSample = (domain) => {
        const items = [];
        for (let i = 0; i < 3; i++) items.push(SAMPLE_TEMPLATES[domain]());
        downloadJSON(items, `artlife_sample_${domain}.json`);
        flash('success', `Downloaded ${DOMAIN_SCHEMAS[domain].label} sample data`);
    };

    // ── File Import ──
    const processFile = (file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);

                // Handle bundle format (has _meta or multiple domain keys)
                if (parsed._meta && parsed._meta.game === 'ArtLife') {
                    // Full bundle
                    const preview = {
                        filename: file.name, type: 'bundle',
                        events: (parsed.events || []).length,
                        storylines: (parsed.storylines || []).length,
                        npcs: (parsed.npcs || []).length,
                        artworks: (parsed.artworks || []).length,
                        artists: (parsed.artists || []).length,
                        hasMaps: !!parsed.maps, hasHaggle: !!parsed.haggle_config,
                        raw: parsed, validation: null,
                    };
                    setImportPreview(preview);
                    return;
                }

                // Handle template format (has _meta.domain)
                let items = parsed;
                let detectedDomain = null;

                if (parsed._meta?.domain && parsed[parsed._meta.domain]) {
                    items = parsed[parsed._meta.domain];
                    detectedDomain = parsed._meta.domain;
                }

                // Handle array format
                if (Array.isArray(items)) {
                    detectedDomain = detectedDomain || detectDomain(items);
                    if (!detectedDomain) {
                        flash('error', 'Cannot detect data domain. Use a template or specify the domain.');
                        return;
                    }
                    const validation = validateDomainData(detectedDomain, items);
                    setImportPreview({
                        filename: file.name, type: 'domain',
                        domain: detectedDomain,
                        items,
                        count: items.length,
                        validation,
                        raw: null,
                    });
                    return;
                }

                // Try to detect domain keys in object
                for (const domain of Object.keys(DOMAIN_SCHEMAS)) {
                    if (parsed[domain] && Array.isArray(parsed[domain])) {
                        detectedDomain = domain;
                        items = parsed[domain];
                        break;
                    }
                }
                if (detectedDomain) {
                    const validation = validateDomainData(detectedDomain, items);
                    setImportPreview({
                        filename: file.name, type: 'domain',
                        domain: detectedDomain, items, count: items.length,
                        validation, raw: null,
                    });
                } else {
                    flash('error', 'Unrecognized file format');
                }
            } catch (err) {
                flash('error', `Parse error: ${err.message}`);
            }
        };
        reader.readAsText(file);
    };

    const handleDrop = (e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer?.files?.[0]; if (f) processFile(f); };
    const handleFileSelect = (e) => { const f = e.target.files?.[0]; if (f) processFile(f); };

    const handleConfirmImport = () => {
        if (!importPreview) return;

        if (importPreview.type === 'bundle') {
            const ok = store.importBundle(importPreview.raw);
            if (ok) {
                flash('success', `Bundle imported: ${importPreview.filename}`);
                store.logImport({ action: 'import', domain: 'bundle', source: importPreview.filename, count: Object.values(importPreview.raw).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0), details: `Full bundle import from ${importPreview.filename}` });
                setImportPreview(null);
            }
            else flash('error', 'Bundle import failed');
            return;
        }

        // Domain-specific import
        const { domain, items } = importPreview;
        let inserted = 0, updated = 0;

        try {
            if (domain === 'storylines') {
                const arr = [...EventRegistry.jsonStorylines];
                items.forEach(sl => { const i = arr.findIndex(x => x.id === sl.id); if (i >= 0) { arr[i] = sl; updated++; } else { arr.push(sl); inserted++; } });
                EventRegistry.jsonStorylines = arr;
            } else if (domain === 'events') {
                const arr = [...EventRegistry.jsonEvents];
                items.forEach(ev => { const i = arr.findIndex(x => x.id === ev.id); if (i >= 0) { arr[i] = ev; updated++; } else { arr.push(ev); inserted++; } });
                EventRegistry.jsonEvents = arr;
            } else if (domain === 'npcs') {
                useNPCStore.setState(state => {
                    const contacts = [...(state.contacts || [])];
                    items.forEach(npc => { const i = contacts.findIndex(x => x.id === npc.id); if (i >= 0) { contacts[i] = { ...contacts[i], ...npc }; updated++; } else { contacts.push(npc); inserted++; } });
                    return { contacts };
                });
            } else if (domain === 'artists') {
                if (!MarketManager.artists) MarketManager.artists = [];
                const arr = [...MarketManager.artists];
                items.forEach(a => { const i = arr.findIndex(x => x.id === a.id); if (i >= 0) { arr[i] = a; updated++; } else { arr.push(a); inserted++; } });
                MarketManager.artists = arr;
            } else if (domain === 'artworks') {
                store.saveSnapshot('artworks', items);
                inserted = items.length;
            }

            store.logImport({ action: 'import', domain, source: importPreview.filename || 'paste', count: inserted + updated, details: `${inserted} new, ${updated} updated` });
            flash('success', `[${DOMAIN_SCHEMAS[domain].label}] ${inserted} new, ${updated} updated`);
            setImportPreview(null);
        } catch (err) {
            store.logImport({ action: 'import_error', domain, source: importPreview.filename || 'unknown', count: 0, details: err.message });
            flash('error', `Import failed: ${err.message}`);
        }
    };

    // ── JSON Paste ──
    const handlePasteIngest = () => {
        try {
            const parsed = JSON.parse(jsonPaste);
            const incoming = Array.isArray(parsed) ? parsed : [parsed];
            if (incoming.length === 0) throw new Error('Empty payload');

            let domain = pasteTarget;
            if (domain === 'auto') {
                domain = detectDomain(incoming);
                if (!domain) throw new Error('Cannot auto-detect. Select target manually.');
            }

            const validation = validateDomainData(domain, incoming);
            if (!validation.valid) {
                flash('warning', `Validation: ${validation.errors.length} errors. ${validation.validItems}/${validation.totalItems} items valid.`);
            }

            // Use the same import logic
            setImportPreview({ filename: 'paste', type: 'domain', domain, items: incoming, count: incoming.length, validation, raw: null });
        } catch (err) {
            flash('error', err.message);
        }
    };

    // ── Export ──
    const handleExportBundle = () => {
        if (store.exportBundle()) {
            store.logImport({ action: 'export', domain: 'bundle', source: 'full_export', count: 0, details: 'Full bundle exported to downloads' });
            flash('success', 'Full bundle exported → downloads');
        }
        else flash('error', 'Export failed');
    };

    const handleExportDomain = (domain) => {
        const schema = DOMAIN_SCHEMAS[domain];
        let data = [];
        try {
            if (domain === 'events') data = EventRegistry.jsonEvents || [];
            else if (domain === 'storylines') data = EventRegistry.jsonStorylines || [];
            else if (domain === 'npcs') data = useNPCStore.getState().contacts || [];
            else if (domain === 'artists') data = MarketManager.artists || [];
            else if (domain === 'artworks') data = store.snapshots?.artworks || [];
        } catch { /* empty */ }

        if (data.length === 0) { flash('warning', `No ${schema.label} data to export`); return; }
        downloadJSON(data, `artlife_${domain}_${new Date().toISOString().slice(0, 10)}.json`);
        flash('success', `Exported ${data.length} ${schema.label}`);
    };

    // ══════════════════════════════════════
    // Render
    // ══════════════════════════════════════
    if (selectedDomain) {
        const schema = DOMAIN_SCHEMAS[selectedDomain];
        const items = store.snapshots[selectedDomain] || [];

        return (
            <div style={S.root}>
                <div style={S.section}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ ...S.sectionTitle, margin: 0 }}>{schema.icon} Manage {schema.label}</h3>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button style={S.btnDanger} onClick={() => { if (confirm('Delete ALL items?')) store.deleteAllItems(selectedDomain); }}>Delete All</button>
                            <button style={S.btn} onClick={() => setSelectedDomain(null)}>Back to Hub</button>
                        </div>
                    </div>
                    {items.length === 0 ? (
                        <div style={S.dim}>No items found. Import some first.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                            {items.map((item, i) => (
                                <div key={item.id || i} style={{ background: '#0a0a14', border: '1px solid #222', padding: 12, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ overflow: 'hidden', paddingRight: 10 }}>
                                        <div style={{ color: '#eee', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.title || item.name || item.id}
                                        </div>
                                        <div style={{ ...S.dim, fontSize: 10, marginTop: 4, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.artist || item.artistId || item.category || item.type || item.id}
                                        </div>
                                    </div>
                                    <button style={{ ...S.btnDanger, padding: '4px 8px', fontSize: 10, minWidth: 28 }} onClick={() => store.deleteItem(selectedDomain, item.id)}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={S.root}>
            {status && <div style={S.status(status.type)}>{status.message}</div>}

            {/* ═══ Section 1: Presets ═══ */}
            <div style={S.section}>
                <h3 style={S.sectionTitle}>📦 Data Presets</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ ...S.text, fontWeight: 600 }}>Active:</span>
                    <span style={S.badge()}>{activePreset || 'Unsaved State'}</span>
                    <div style={{ flex: 1 }} />
                    {!showPresetInput ? (
                        <button style={S.btn} onClick={() => setShowPresetInput(true)}>+ Save Current as Preset</button>
                    ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input value={newPresetName} onChange={e => setNewPresetName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSavePreset()} placeholder="Preset name..." autoFocus
                                style={{ background: '#111', border: '1px solid #c9a84c', color: '#eee', padding: '8px 12px', fontFamily: 'inherit', fontSize: 12, borderRadius: 4, width: 180 }} />
                            <button style={S.btn} onClick={handleSavePreset}>Save</button>
                            <button style={S.btnSmall} onClick={() => setShowPresetInput(false)}>Cancel</button>
                        </div>
                    )}
                </div>
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
                                    {p.name !== activePreset && <button style={S.btn} onClick={() => handleLoadPreset(p.name)}>Load</button>}
                                    <button style={S.btnDanger} onClick={() => handleDeletePreset(p.name)}>✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={S.dim}>No presets saved yet. Save your current data as "Test Mode" to snapshot it.</div>
                )}
            </div>

            {/* ═══ Section 2: Domain Templates ═══ */}
            <div style={S.section}>
                <h3 style={S.sectionTitle}>📝 Domain Templates</h3>
                <p style={{ ...S.dim, marginBottom: 16 }}>Download JSON templates with the correct schema for each data domain. Fill them in and re-import.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                    {Object.entries(DOMAIN_SCHEMAS).map(([key, schema]) => (
                        <div key={key} style={{ background: '#0a0a14', border: `1px solid ${schema.color}33`, borderRadius: 6, padding: 14 }}>
                            <div style={{ fontSize: 18, marginBottom: 4 }}>{schema.icon}</div>
                            <div style={{ color: schema.color, fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{schema.label}</div>
                            <div style={{ ...S.dim, marginBottom: 8 }}>
                                {schema.requiredFields.length} required, {schema.optionalFields.length} optional fields
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button style={S.btnDomain(schema.color)} onClick={() => handleDownloadTemplate(key)}>Template</button>
                                <button style={S.btnDomain(schema.color)} onClick={() => handleDownloadSample(key)}>Sample</button>
                                <button style={S.btnDomain(schema.color)} onClick={() => handleExportDomain(key)}>Export</button>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 10, color: '#444' }}>
                                Live: <strong style={{ color: schema.color }}>{summary[key === 'npcs' ? 'npcs' : key] || 0}</strong>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ Section 3: Import ═══ */}
            <div style={S.section}>
                <h3 style={S.sectionTitle}>🔄 Import Data</h3>
                <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                    <div style={{ ...S.dropzone(dragActive), flex: 1 }}
                        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                        <div style={{ ...S.text, fontWeight: 600 }}>Drop JSON file here</div>
                        <div style={S.dim}>Accepts: full bundles, domain templates, or raw arrays</div>
                        <div style={{ ...S.dim, marginTop: 4 }}>Auto-detects domain • validates before import</div>
                        <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} style={{ display: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
                        <button style={S.btn} onClick={handleExportBundle}>⬇ Export Full Bundle</button>
                        <div style={S.dim}>Downloads all domains as one JSON</div>
                    </div>
                </div>

                {/* Import Preview */}
                {importPreview && (
                    <div style={{ background: '#0a0a20', border: '1px solid #c9a84c44', borderRadius: 6, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div>
                                <span style={{ ...S.text, fontWeight: 600 }}>Preview: {importPreview.filename}</span>
                                {importPreview.domain && (
                                    <span style={{ ...S.badge(DOMAIN_SCHEMAS[importPreview.domain]?.color || '#888'), marginLeft: 8 }}>
                                        {DOMAIN_SCHEMAS[importPreview.domain]?.label}
                                    </span>
                                )}
                                {importPreview.type === 'bundle' && <span style={{ ...S.badge('#c9a84c'), marginLeft: 8 }}>Full Bundle</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button style={S.btn} onClick={handleConfirmImport}>✓ Confirm Import</button>
                                <button style={S.btnSmall} onClick={() => setImportPreview(null)}>Cancel</button>
                            </div>
                        </div>

                        {/* Item counts */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                            {importPreview.type === 'bundle' ? (
                                <>
                                    {importPreview.events > 0 && <span style={S.badge('#4caf50')}>{importPreview.events} events</span>}
                                    {importPreview.storylines > 0 && <span style={S.badge('#2196f3')}>{importPreview.storylines} storylines</span>}
                                    {importPreview.npcs > 0 && <span style={S.badge('#ff9800')}>{importPreview.npcs} NPCs</span>}
                                    {importPreview.artworks > 0 && <span style={S.badge('#e91e63')}>{importPreview.artworks} artworks</span>}
                                    {importPreview.artists > 0 && <span style={S.badge('#9c27b0')}>{importPreview.artists} artists</span>}
                                </>
                            ) : (
                                <span style={S.badge(DOMAIN_SCHEMAS[importPreview.domain]?.color)}>{importPreview.count} items</span>
                            )}
                        </div>

                        {/* Validation results */}
                        {importPreview.validation && (
                            <div style={S.validationBox}>
                                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                                    <span style={S.badge(importPreview.validation.valid ? '#4caf50' : '#f44336')}>
                                        {importPreview.validation.valid ? '✓ Valid' : '✗ Issues Found'}
                                    </span>
                                    <span style={S.dim}>{importPreview.validation.validItems}/{importPreview.validation.totalItems} items pass</span>
                                </div>
                                {importPreview.validation.errors.length > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ color: '#f44336', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>ERRORS</div>
                                        {importPreview.validation.errors.slice(0, 10).map((e, i) => (
                                            <div key={i} style={{ color: '#ffaaaa', fontSize: 11, padding: '2px 0' }}>• {e}</div>
                                        ))}
                                        {importPreview.validation.errors.length > 10 && (
                                            <div style={S.dim}>...and {importPreview.validation.errors.length - 10} more</div>
                                        )}
                                    </div>
                                )}
                                {importPreview.validation.warnings.length > 0 && (
                                    <div>
                                        <div style={{ color: '#ff9800', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>WARNINGS</div>
                                        {importPreview.validation.warnings.slice(0, 5).map((w, i) => (
                                            <div key={i} style={{ color: '#ffcc80', fontSize: 11, padding: '2px 0' }}>• {w}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* JSON paste fallback */}
                <details style={{ marginTop: 16 }}>
                    <summary style={{ ...S.text, cursor: 'pointer', color: '#888' }}>▸ Advanced: Paste Raw JSON</summary>
                    <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                            <span style={{ ...S.dim, textTransform: 'uppercase', letterSpacing: 1 }}>Target:</span>
                            <select value={pasteTarget} onChange={e => setPasteTarget(e.target.value)}
                                style={{ background: '#111', color: '#eee', border: '1px solid #333', padding: '6px 10px', fontFamily: 'inherit', fontSize: 12, borderRadius: 4 }}>
                                <option value="auto">Auto-Detect</option>
                                {Object.entries(DOMAIN_SCHEMAS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                            </select>
                        </div>
                        <textarea value={jsonPaste} onChange={e => setJsonPaste(e.target.value)} spellCheck={false}
                            placeholder='Paste JSON array here...'
                            style={{
                                width: '100%', minHeight: 160, background: '#080812', border: '1px solid #222', color: '#4caf50',
                                padding: 12, fontFamily: 'monospace', fontSize: 12, borderRadius: 4, resize: 'vertical', outline: 'none', boxSizing: 'border-box'
                            }} />
                        <button style={{ ...S.btn, marginTop: 8 }} onClick={handlePasteIngest}>Validate & Preview</button>
                    </div>
                </details>
            </div>

            {/* ═══ Section 4: Import / Export History ═══ */}
            <div style={S.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={S.sectionTitle}>📋 Import / Export History</h3>
                    {store.importLog.length > 0 && (
                        <button style={S.btnSmall} onClick={() => store.clearImportLog()}>Clear Log</button>
                    )}
                </div>
                {store.importLog.length === 0 ? (
                    <div style={S.dim}>No import/export operations recorded yet.</div>
                ) : (
                    <div style={{ maxHeight: 200, overflow: 'auto', background: '#080812', border: '1px solid #222', borderRadius: 6, padding: 8 }}>
                        {[...store.importLog].reverse().map((entry, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                                borderBottom: '1px solid #111', fontSize: 11, color: '#bbb',
                            }}>
                                <span style={{
                                    fontSize: 14,
                                    minWidth: 18,
                                }}>{entry.action === 'export' ? '📤' : entry.action === 'import_error' ? '❌' : '📥'}</span>
                                <span style={{ color: '#666', minWidth: 60 }}>
                                    {new Date(entry.timestamp).toLocaleTimeString()}
                                </span>
                                <span style={{ color: '#c9a84c', fontWeight: 600, minWidth: 70 }}>
                                    {entry.domain}
                                </span>
                                <span style={{ flex: 1 }}>{entry.details}</span>
                                {entry.count > 0 && (
                                    <span style={{ color: '#4caf50', fontWeight: 700 }}>{entry.count} items</span>
                                )}
                                <span style={{ color: '#555', fontSize: 9 }}>{entry.source}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══ Section 5: Live Data Summary ═══ */}
            <div style={S.section}>
                <h3 style={S.sectionTitle}>📊 Live Data Summary</h3>
                <table style={S.table}>
                    <thead>
                        <tr>
                            <th style={S.th}>Domain</th>
                            <th style={S.th}>Count</th>
                            <th style={S.th}>Status</th>
                            <th style={S.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(DOMAIN_SCHEMAS).map(([key, schema]) => {
                            const count = summary[key] || 0;
                            return (
                                <tr key={key}>
                                    <td style={S.td}>{schema.icon} {schema.label}</td>
                                    <td style={S.td}><span style={{ ...S.gold, fontWeight: 700, fontSize: 16 }}>{count}</span></td>
                                    <td style={S.td}><span style={S.badge(count > 0 ? '#4caf50' : '#f44336')}>{count > 0 ? 'Loaded' : 'Empty'}</span></td>
                                    <td style={S.td}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button style={S.btnSmall} onClick={() => handleExportDomain(key)} disabled={count === 0}>Export</button>
                                            <button style={S.btnSmall} onClick={() => handleDownloadTemplate(key)}>Template</button>
                                            <button style={S.btnSmall} onClick={() => handleManageDomain(key)} disabled={count === 0}>Manage</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div style={{ ...S.dim, marginTop: 12 }}>Counts reflect live in-memory data. Save as a preset to preserve across sessions.</div>
            </div>
        </div>
    );
}
