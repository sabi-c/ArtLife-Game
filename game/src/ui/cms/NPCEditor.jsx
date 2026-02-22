import React, { useState } from 'react';
import { useNPCStore } from '../../stores/npcStore.js';

export default function NPCEditor() {
    const contacts = useNPCStore(s => s.contacts);
    const [selectedId, setSelectedId] = useState(null);
    const [jsonEdit, setJsonEdit] = useState('');
    const [notification, setNotification] = useState(null);

    const allNpcs = [...contacts].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const selected = allNpcs.find(n => n.id === selectedId);

    const showNotif = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSelect = (id) => {
        setSelectedId(id);
        const npc = allNpcs.find(n => n.id === id);
        if (npc) setJsonEdit(JSON.stringify(npc, null, 4));
    };

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allNpcs, null, 4));
        const anchor = document.createElement('a');
        anchor.href = dataStr;
        anchor.download = "npcs.json";
        anchor.click();
        showNotif('Downloaded npcs.json');
    };

    const handleHotSwap = () => {
        try {
            const parsed = JSON.parse(jsonEdit);
            useNPCStore.setState(state => {
                const idx = state.contacts.findIndex(n => n.id === parsed.id);
                if (idx >= 0) {
                    state.contacts[idx] = { ...state.contacts[idx], ...parsed };
                } else {
                    state.contacts.push(parsed);
                }
            });
            showNotif('Hot-swapped NPC into memory');
        } catch (err) {
            showNotif('JSON Error: ' + err.message);
        }
    };

    const handleFieldEdit = (field, value) => {
        if (!selected) return;
        const updated = { ...selected, [field]: value };
        setJsonEdit(JSON.stringify(updated, null, 4));

        useNPCStore.setState(state => {
            const idx = state.contacts.findIndex(n => n.id === updated.id);
            if (idx >= 0) {
                state.contacts[idx] = { ...state.contacts[idx], [field]: value };
            }
        });
    };

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
                    <strong>{allNpcs.length} NPCs Tracked</strong>
                    {notification && <span style={{ color: '#4caf50', marginLeft: 16 }}>{notification}</span>}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleDownload} style={btnStyle}>Export JSON</button>
                </div>
            </div>

            {/* Three-pane layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 10, gap: 10 }}>
                {/* Panel 1: List */}
                <div style={{ ...panel, flex: '0 0 260px' }}>
                    <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>
                        ALL NPCS
                    </div>
                    {allNpcs.length === 0 && (
                        <div style={{ color: '#555', padding: 12 }}>No NPCs loaded. Initialize game state first.</div>
                    )}
                    {allNpcs.map(npc => (
                        <div key={npc.id} onClick={() => handleSelect(npc.id)} style={{
                            padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #1a1a2e',
                            background: selectedId === npc.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                            borderLeft: selectedId === npc.id ? '3px solid #c9a84c' : '3px solid transparent',
                        }}>
                            <div style={{ fontSize: 13, color: selectedId === npc.id ? '#c9a84c' : '#eaeaea', fontWeight: 'bold' }}>{npc.name}</div>
                            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                                ID: {npc.id} {npc.tier ? `· Tier ${npc.tier}` : ''} {npc.met ? '· MET' : ''}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Panel 2: Profile Form */}
                <div style={{ ...panel, flex: '2' }}>
                    {!selected ? (
                        <div style={{ color: '#666', textAlign: 'center', marginTop: 60 }}>Select an NPC to edit profile.</div>
                    ) : (
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#c9a84c', marginBottom: 20 }}>NPC PROFILE: {selected.name}</div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Full Name</label>
                                    <input value={selected.name || ''} onChange={e => handleFieldEdit('name', e.target.value)} style={{ width: '100%', padding: 8, background: '#111', color: '#fff', border: '1px solid #333', fontFamily: 'inherit' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Role / Class</label>
                                    <input value={selected.role || ''} onChange={e => handleFieldEdit('role', e.target.value)} style={{ width: '100%', padding: 8, background: '#111', color: '#fff', border: '1px solid #333', fontFamily: 'inherit' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Favor</label>
                                    <input type="number" value={selected.favor || 0} onChange={e => handleFieldEdit('favor', parseInt(e.target.value))} style={{ width: '100%', padding: 8, background: '#111', color: '#fff', border: '1px solid #333', fontFamily: 'inherit' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Tier</label>
                                    <input type="number" value={selected.tier || 1} onChange={e => handleFieldEdit('tier', parseInt(e.target.value))} style={{ width: '100%', padding: 8, background: '#111', color: '#fff', border: '1px solid #333', fontFamily: 'inherit' }} />
                                </div>
                            </div>

                            <div style={{ marginTop: 20 }}>
                                <label style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Traits (Comma Sep)</label>
                                <input value={(selected.traits || []).join(', ')} onChange={e => handleFieldEdit('traits', e.target.value.split(',').map(s => s.trim()))} style={{ width: '100%', padding: 8, background: '#111', color: '#fff', border: '1px solid #333', fontFamily: 'inherit' }} />
                            </div>

                            <div style={{ marginTop: 30, padding: 16, border: '1px dashed #444', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ color: '#88bbdd', fontSize: 11, fontWeight: 'bold', marginBottom: 10 }}>LIVE RELATIONSHIP STATS</div>
                                <div style={{ display: 'flex', gap: 20, fontSize: 11 }}>
                                    <div>Favor: <strong style={{ color: selected.favor > 0 ? '#3a8a5c' : selected.favor < 0 ? '#c94040' : '#fff' }}>{selected.favor || 0}</strong></div>
                                    <div>Met: <strong style={{ color: '#fff' }}>{selected.met ? 'YES' : 'NO'}</strong></div>
                                    <div>Phone Unlocked: <strong style={{ color: '#c9a84c' }}>{selected.phoneUnlocked ? 'YES' : 'NO'}</strong></div>
                                </div>
                                {selected.memory && (
                                    <div style={{ marginTop: 8, fontSize: 10, color: '#666' }}>
                                        Witnessed: {selected.memory.witnessed?.length || 0} | Grudges: {selected.memory.grudges?.length || 0} | Favors: {selected.memory.favors?.length || 0}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel 3: JSON Editor */}
                <div style={{ ...panel, flex: '0 0 320px' }}>
                    <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 12 }}>RAW JSON DUMP</div>
                    <textarea value={jsonEdit} onChange={(e) => setJsonEdit(e.target.value)} spellCheck={false} style={{ flex: 1, background: '#050508', color: '#4caf50', border: '1px solid #333', fontFamily: 'inherit', fontSize: 11, padding: 8, resize: 'none', outline: 'none' }} placeholder="Select NPC to view full JSON payload..." />
                    <button onClick={handleHotSwap} style={{ ...btnStyle, marginTop: 8, width: '100%', borderColor: '#c9a84c', color: '#c9a84c' }}>Hot-Swap Into Memory</button>
                </div>
            </div>
        </div>
    );
}
