import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    DEALER_TYPES, TACTICS, BLUE_OPTIONS, HAGGLE_CONFIG, HAGGLE_TYPES,
    TYPE_EFFECTIVENESS, DEALER_DIALOGUE, ROLE_TO_DEALER_TYPE,
    TACTIC_PRESETS, NEGOTIATION_PHASES, PHASE_MODIFIERS,
    STAT_DESCRIPTIONS, STAT_THRESHOLDS, HAGGLE_ACHIEVEMENTS,
} from '../../data/haggle_config.js';
import { HaggleManager } from '../../managers/HaggleManager.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { GameState } from '../../managers/GameState.js';
import { useCmsStore } from '../../stores/cmsStore.js';

// ── Attempt to load CONTACTS safely ──
let CONTACTS = [];
try { CONTACTS = require('../../data/contacts.js').CONTACTS || []; } catch { }

// ── Color & Style Constants ──────────────────────
const TYPE_COLORS = {
    emotional: { bg: '#2a1a2a', border: '#8a3a8a', text: '#c084fc', icon: '💜' },
    logical: { bg: '#1a1a2a', border: '#3a3a8a', text: '#60a5fa', icon: '🧮' },
    aggressive: { bg: '#2a1a1a', border: '#8a3a3a', text: '#f87171', icon: '🗡️' },
    financial: { bg: '#1a2a1a', border: '#3a8a3a', text: '#4ade80', icon: '💰' },
};

const mono = '"IBM Plex Mono", "Courier New", monospace';
const panelBg = '#0a0a14';
const inputStyle = {
    width: '100%', padding: '6px 8px', background: '#111', border: '1px solid #333',
    color: '#eaeaea', fontFamily: mono, fontSize: 11, boxSizing: 'border-box', outline: 'none',
    borderRadius: 3,
};
const labelStyle = { display: 'block', color: '#666', fontSize: 9, textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.5 };
const sectionHeader = { color: '#c9a84c', fontWeight: 'bold', fontSize: 12, letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 };
const cardStyle = {
    background: panelBg, border: '1px solid #1a1a2e', borderRadius: 4, padding: 10, cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
};
const btnPrimary = {
    background: '#c9a84c', color: '#000', fontWeight: 'bold', border: 'none',
    padding: '8px 16px', cursor: 'pointer', fontFamily: mono, fontSize: 12, borderRadius: 4,
};
const btnSecondary = {
    background: 'transparent', border: '1px solid #444', color: '#aaa',
    padding: '5px 12px', cursor: 'pointer', fontFamily: mono, fontSize: 11, borderRadius: 3,
};
const tagStyle = (color) => ({
    display: 'inline-block', padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 'bold',
    color, border: `1px solid ${color}33`, background: `${color}11`,
});

// ── Persistence helpers ──
function getPersistedConfig() {
    try { return JSON.parse(localStorage.getItem('artlife-haggle-config') || 'null'); } catch { return null; }
}
function persistConfig(snapshot) {
    localStorage.setItem('artlife-haggle-config', JSON.stringify(snapshot));
}
function snapshotCurrentConfig() {
    return {
        dealers: JSON.parse(JSON.stringify(DEALER_TYPES)),
        tactics: JSON.parse(JSON.stringify(TACTICS)),
        blueOptions: JSON.parse(JSON.stringify(BLUE_OPTIONS)),
        config: JSON.parse(JSON.stringify(HAGGLE_CONFIG)),
        dialogue: JSON.parse(JSON.stringify(DEALER_DIALOGUE)),
        roleMapping: JSON.parse(JSON.stringify(ROLE_TO_DEALER_TYPE)),
        savedAt: new Date().toISOString(),
    };
}
function restoreFromSnapshot(snapshot) {
    if (snapshot.dealers) Object.keys(snapshot.dealers).forEach(k => { if (DEALER_TYPES[k]) Object.assign(DEALER_TYPES[k], snapshot.dealers[k]); });
    if (snapshot.tactics) Object.keys(snapshot.tactics).forEach(k => { if (TACTICS[k]) Object.assign(TACTICS[k], snapshot.tactics[k]); });
    if (snapshot.config) Object.assign(HAGGLE_CONFIG, snapshot.config);
    if (snapshot.dialogue) Object.keys(snapshot.dialogue).forEach(pool => {
        if (DEALER_DIALOGUE[pool]) Object.assign(DEALER_DIALOGUE[pool], snapshot.dialogue[pool]);
    });
    if (snapshot.roleMapping) Object.assign(ROLE_TO_DEALER_TYPE, snapshot.roleMapping);
}

// ═══════════════════════════════════════════════════
// 1. DEALER EDITOR
// ═══════════════════════════════════════════════════
function DealerEditorSection({ onNotify }) {
    const [selectedDealer, setSelectedDealer] = useState(null);
    const [editValues, setEditValues] = useState({});

    const selectDealer = (key) => { setSelectedDealer(key); setEditValues({ ...DEALER_TYPES[key] }); };
    const updateField = (field, value) => setEditValues(prev => ({ ...prev, [field]: value }));

    const hotSwapDealer = () => {
        if (!selectedDealer) return;
        Object.assign(DEALER_TYPES[selectedDealer], editValues);
        useCmsStore.getState().markDirty('events');
        onNotify?.('🔥 Hot-swapped dealer: ' + editValues.name);
    };

    const dealerEntries = Object.entries(DEALER_TYPES);
    const tc = editValues.haggleStyle ? (TYPE_COLORS[editValues.haggleStyle] || {}) : {};

    return (
        <div style={{ display: 'flex', gap: 16, height: '100%' }}>
            <div style={{ width: 200, overflowY: 'auto', borderRight: '1px solid #1a1a2e', paddingRight: 12 }}>
                <div style={sectionHeader}>🎭 DEALER TYPES ({dealerEntries.length})</div>
                {dealerEntries.map(([key, d]) => {
                    const dtc = TYPE_COLORS[d.haggleStyle] || {};
                    return (
                        <div key={key} onClick={() => selectDealer(key)} style={{
                            ...cardStyle, marginBottom: 6,
                            borderColor: selectedDealer === key ? '#c9a84c' : dtc.border || '#1a1a2e',
                            boxShadow: selectedDealer === key ? '0 0 8px rgba(201,168,76,0.2)' : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 18 }}>{d.icon}</span>
                                <div>
                                    <div style={{ color: '#eaeaea', fontWeight: 'bold', fontSize: 11 }}>{d.name}</div>
                                    <div style={{ color: dtc.text || '#888', fontSize: 9 }}>{dtc.icon} {d.haggleStyle}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {!selectedDealer ? (
                    <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>Select a dealer to edit</div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 28 }}>{editValues.icon}</span>
                                <div>
                                    <div style={{ fontSize: 16, color: '#c9a84c', fontWeight: 'bold' }}>{editValues.name}</div>
                                    <div style={{ fontSize: 10, color: tc.text }}>{tc.icon} {editValues.haggleStyle}</div>
                                </div>
                            </div>
                            <button onClick={hotSwapDealer} style={btnPrimary}>🔥 Hot-Swap</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>Name</label>
                                <input value={editValues.name || ''} onChange={e => updateField('name', e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Icon (emoji)</label>
                                <input value={editValues.icon || ''} onChange={e => updateField('icon', e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Haggle Style</label>
                                <select value={editValues.haggleStyle || ''} onChange={e => updateField('haggleStyle', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                    {Object.values(HAGGLE_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Patience (rounds)</label>
                                <input type="number" min="1" max="10" value={editValues.patience || 3} onChange={e => updateField('patience', parseInt(e.target.value) || 3)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Greed Factor (×)</label>
                                <input type="number" step="0.05" min="0.5" max="2.0" value={editValues.greedFactor || 1.0} onChange={e => updateField('greedFactor', parseFloat(e.target.value) || 1.0)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Bluff Resistance (0–1)</label>
                                <input type="number" step="0.05" min="0" max="1" value={editValues.bluffResistance || 0.5} onChange={e => updateField('bluffResistance', parseFloat(e.target.value) || 0.5)} style={inputStyle} />
                            </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <label style={labelStyle}>Description</label>
                            <textarea value={editValues.description || ''} onChange={e => updateField('description', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                        </div>
                        <div style={{ marginTop: 10 }}>
                            <label style={labelStyle}>Lore (background flavor text)</label>
                            <textarea value={editValues.lore || ''} onChange={e => updateField('lore', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', fontStyle: 'italic', color: '#888' }} />
                        </div>

                        {/* Stat Bars */}
                        <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
                            {[
                                { label: 'Patience', val: editValues.patience || 3, max: 6, color: '#4ade80' },
                                { label: 'Greed', val: Math.round((editValues.greedFactor || 1) * 5), max: 10, color: '#f87171' },
                                { label: 'Bluff Resist', val: Math.round((editValues.bluffResistance || 0.5) * 10), max: 10, color: '#60a5fa' },
                            ].map(bar => (
                                <div key={bar.label} style={{ flex: 1 }}>
                                    <div style={{ fontSize: 9, color: '#666', marginBottom: 4 }}>{bar.label}</div>
                                    <div style={{ height: 6, background: '#1a1a2e', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${(bar.val / bar.max) * 100}%`, background: bar.color, borderRadius: 3, transition: 'width 0.3s' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// 2. TACTIC EDITOR
// ═══════════════════════════════════════════════════
function TacticEditorSection({ onNotify }) {
    const [selectedTactic, setSelectedTactic] = useState(null);
    const [isBlue, setIsBlue] = useState(false);
    const [editValues, setEditValues] = useState({});

    const allTactics = useMemo(() => {
        const base = Object.entries(TACTICS).map(([k, t]) => ({ key: k, ...t, _isBlue: false }));
        const blue = BLUE_OPTIONS.map((b, i) => ({ key: `blue_${i}`, tableIdx: i, ...b, _isBlue: true }));
        return [...base, ...blue];
    }, []);

    const selectTactic = (t) => { setSelectedTactic(t.key); setIsBlue(t._isBlue); setEditValues({ ...t }); };
    const updateField = (field, value) => setEditValues(prev => ({ ...prev, [field]: value }));

    const hotSwapTactic = () => {
        if (!selectedTactic) return;
        if (isBlue) {
            const idx = editValues.tableIdx;
            if (idx !== undefined) Object.assign(BLUE_OPTIONS[idx], editValues);
        } else {
            Object.assign(TACTICS[selectedTactic], editValues);
        }
        useCmsStore.getState().markDirty('events');
        onNotify?.('🔥 Hot-swapped tactic: ' + editValues.label);
    };

    const tc = editValues.type ? (TYPE_COLORS[editValues.type] || {}) : {};

    return (
        <div style={{ display: 'flex', gap: 16, height: '100%' }}>
            <div style={{ width: 220, overflowY: 'auto', borderRight: '1px solid #1a1a2e', paddingRight: 12 }}>
                <div style={sectionHeader}>⚔️ BASE TACTICS ({Object.keys(TACTICS).length})</div>
                {allTactics.filter(t => !t._isBlue).map(t => {
                    const ttc = TYPE_COLORS[t.type] || {};
                    return (
                        <div key={t.key} onClick={() => selectTactic(t)} style={{
                            ...cardStyle, marginBottom: 4,
                            borderColor: selectedTactic === t.key ? '#c9a84c' : ttc.border || '#1a1a2e',
                        }}>
                            <div style={{ fontSize: 11, color: '#eaeaea', fontWeight: 'bold' }}>{t.label}</div>
                            <div style={{ fontSize: 9, color: ttc.text }}>{ttc.icon} {t.type} · {Math.round(t.baseSuccess * 100)}%</div>
                        </div>
                    );
                })}

                <div style={{ ...sectionHeader, marginTop: 16, color: '#3b82f6' }}>⭐ BLUE OPTIONS ({BLUE_OPTIONS.length})</div>
                {allTactics.filter(t => t._isBlue).map(t => (
                    <div key={t.key} onClick={() => selectTactic(t)} style={{
                        ...cardStyle, marginBottom: 4,
                        borderColor: selectedTactic === t.key ? '#3b82f6' : '#1a1a2e',
                    }}>
                        <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 'bold' }}>{t.label}</div>
                        <div style={{ fontSize: 9, color: '#888' }}>{t.requiredStat} ≥ {t.requiredMin} · {Math.round(t.baseSuccess * 100)}%</div>
                    </div>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {!selectedTactic ? (
                    <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>Select a tactic to edit</div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 16, color: isBlue ? '#60a5fa' : '#c9a84c', fontWeight: 'bold' }}>{editValues.label}</div>
                                <div style={{ fontSize: 10, color: tc.text }}>{tc.icon} {editValues.type}</div>
                            </div>
                            <button onClick={hotSwapTactic} style={btnPrimary}>🔥 Hot-Swap</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>Label</label>
                                <input value={editValues.label || ''} onChange={e => updateField('label', e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Type</label>
                                <select value={editValues.type || ''} onChange={e => updateField('type', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                    {Object.values(HAGGLE_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Animation</label>
                                <select value={editValues.animType || 'coin'} onChange={e => updateField('animType', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                    {['coin', 'shield', 'slash', 'shadow', 'charm'].map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <label style={labelStyle}>Description</label>
                            <textarea value={editValues.description || ''} onChange={e => updateField('description', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                        </div>

                        <div style={{ marginTop: 16, background: '#050508', border: '1px solid #222', borderRadius: 4, padding: 12 }}>
                            <div style={{ fontSize: 10, color: '#c9a84c', marginBottom: 10, fontWeight: 'bold' }}>⚙️ FORMULA PARAMETERS</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={labelStyle}>Base Success</label>
                                    <input type="number" step="0.05" min="0" max="1" value={editValues.baseSuccess || 0} onChange={e => updateField('baseSuccess', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, color: '#4ade80' }} />
                                    <div style={{ fontSize: 8, color: '#555', marginTop: 2 }}>{Math.round((editValues.baseSuccess || 0) * 100)}% chance</div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Price Shift</label>
                                    <input type="number" step="0.05" min="-0.5" max="0.5" value={editValues.priceShift || 0} onChange={e => updateField('priceShift', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, color: (editValues.priceShift || 0) > 0 ? '#f87171' : '#4ade80' }} />
                                    <div style={{ fontSize: 8, color: '#555', marginTop: 2 }}>{(editValues.priceShift || 0) > 0 ? '▲' : '▼'}{Math.abs(Math.round((editValues.priceShift || 0) * 100))}%</div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Patience Effect</label>
                                    <input type="number" min="-3" max="3" value={editValues.patienceEffect || 0} onChange={e => updateField('patienceEffect', parseInt(e.target.value) || 0)} style={{ ...inputStyle, color: (editValues.patienceEffect || 0) > 0 ? '#4ade80' : '#f87171' }} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Stat Bonus</label>
                                    <select value={editValues.statBonus || 'none'} onChange={e => updateField('statBonus', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                        {['none', 'cash', 'reputation', 'taste', 'audacity', 'intel', 'access'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Stat Weight</label>
                                    <input type="number" step="0.001" min="0" max="0.05" value={editValues.statWeight || 0} onChange={e => updateField('statWeight', parseFloat(e.target.value) || 0)} style={inputStyle} />
                                    <div style={{ fontSize: 8, color: '#555', marginTop: 2 }}>+{((editValues.statWeight || 0) * 100).toFixed(1)}% per point</div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Heat Gain</label>
                                    <input type="number" min="0" max="10" value={editValues.heatGain || 0} onChange={e => updateField('heatGain', parseInt(e.target.value) || 0)} style={{ ...inputStyle, color: '#ff9999' }} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Suspicion Gain</label>
                                    <input type="number" min="0" max="10" value={editValues.suspicionGain || 0} onChange={e => updateField('suspicionGain', parseInt(e.target.value) || 0)} style={{ ...inputStyle, color: '#ffaa55' }} />
                                </div>
                                {isBlue && (
                                    <>
                                        <div>
                                            <label style={labelStyle}>Required Stat</label>
                                            <select value={editValues.requiredStat || 'taste'} onChange={e => updateField('requiredStat', e.target.value)} style={{ ...inputStyle, color: '#60a5fa', cursor: 'pointer' }}>
                                                {['taste', 'reputation', 'intel', 'access', 'audacity', 'cash'].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Required Min</label>
                                            <input type="number" min="0" max="100" value={editValues.requiredMin || 0} onChange={e => updateField('requiredMin', parseInt(e.target.value) || 0)} style={{ ...inputStyle, color: '#60a5fa' }} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {editValues.dialogue && (
                            <div style={{ marginTop: 16 }}>
                                <label style={labelStyle}>Dialogue Line</label>
                                <textarea value={editValues.dialogue || ''} onChange={e => updateField('dialogue', e.target.value)} rows={3} style={{ ...inputStyle, fontStyle: 'italic', color: '#c9a84c', resize: 'vertical' }} />
                            </div>
                        )}

                        <div style={{ marginTop: 16, background: '#111', border: '1px solid #333', borderRadius: 4, padding: 12, fontSize: 10, color: '#888' }}>
                            <div style={{ color: '#c9a84c', fontWeight: 'bold', marginBottom: 6 }}>📊 SUCCESS FORMULA PREVIEW</div>
                            <code style={{ color: '#4ade80', fontSize: 10 }}>
                                P = {editValues.baseSuccess || 0} + ({editValues.statBonus || 'stat'} × {editValues.statWeight || 0}) × typeMultiplier - (suspicion × {HAGGLE_CONFIG.suspicionPenalty})
                            </code>
                            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                {[25, 50, 75, 100].map(stat => {
                                    const base = (editValues.baseSuccess || 0) + stat * (editValues.statWeight || 0);
                                    return (
                                        <div key={stat} style={{ textAlign: 'center' }}>
                                            <div style={{ color: '#666', fontSize: 8 }}>{editValues.statBonus || 'stat'} = {stat}</div>
                                            <div style={{ color: '#4ade80', fontWeight: 'bold' }}>{Math.min(Math.round(base * 100), 95)}%</div>
                                            <div style={{ color: '#666', fontSize: 7 }}>SE: {Math.min(Math.round(base * HAGGLE_CONFIG.superEffectiveMultiplier * 100), 95)}%</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// 3. DIALOGUE EDITOR
// ═══════════════════════════════════════════════════
function DialogueEditorSection({ onNotify }) {
    const [selectedPool, setSelectedPool] = useState('opening');
    const [selectedDealer, setSelectedDealer] = useState('shark');
    const [, forceUpdate] = useState(0);

    const pools = Object.keys(DEALER_DIALOGUE);
    const dealerKeys = Object.keys(DEALER_TYPES);
    const lines = DEALER_DIALOGUE[selectedPool]?.[selectedDealer] || [];

    const updateLine = (index, newText) => { DEALER_DIALOGUE[selectedPool][selectedDealer][index] = newText; forceUpdate(n => n + 1); useCmsStore.getState().markDirty('events'); };
    const addLine = () => {
        if (!DEALER_DIALOGUE[selectedPool]) DEALER_DIALOGUE[selectedPool] = {};
        if (!DEALER_DIALOGUE[selectedPool][selectedDealer]) DEALER_DIALOGUE[selectedPool][selectedDealer] = [];
        DEALER_DIALOGUE[selectedPool][selectedDealer].push('"New dialogue line..."');
        forceUpdate(n => n + 1); useCmsStore.getState().markDirty('events'); onNotify?.('➕ Added dialogue line');
    };
    const removeLine = (index) => { DEALER_DIALOGUE[selectedPool][selectedDealer].splice(index, 1); forceUpdate(n => n + 1); useCmsStore.getState().markDirty('events'); };

    const poolLabels = {
        opening: '🎬 Opening', onRaise: '💰 On Raise', onHoldFirm: '🤝 On Hold Firm', onWalkAway: '🗡️ On Walk Away',
        onBluff: '🎭 On Bluff', onBlueOption: '⭐ On Blue Option', onFlatter: '💐 On Flatter', onQuestionProvenance: '🔍 On Provenance',
        onInvokeMarket: '📊 On Market Data', onSilence: '🤫 On Silence', onDeal: '✅ On Deal', onFail: '❌ On Fail',
    };

    return (
        <div style={{ display: 'flex', gap: 16, height: '100%' }}>
            <div style={{ width: 180, borderRight: '1px solid #1a1a2e', paddingRight: 12, overflowY: 'auto' }}>
                <div style={sectionHeader}>💬 POOLS ({pools.length})</div>
                {pools.map(pool => (
                    <div key={pool} onClick={() => setSelectedPool(pool)} style={{
                        ...cardStyle, marginBottom: 4, fontSize: 10,
                        borderColor: selectedPool === pool ? '#c9a84c' : '#1a1a2e',
                        color: selectedPool === pool ? '#c9a84c' : '#aaa',
                    }}>
                        {poolLabels[pool] || pool}
                    </div>
                ))}
                <div style={{ ...sectionHeader, marginTop: 16 }}>🎭 DEALER</div>
                {dealerKeys.map(dk => (
                    <div key={dk} onClick={() => setSelectedDealer(dk)} style={{
                        ...cardStyle, marginBottom: 4, fontSize: 10,
                        borderColor: selectedDealer === dk ? '#c9a84c' : '#1a1a2e',
                        color: selectedDealer === dk ? '#c9a84c' : '#aaa',
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <span>{DEALER_TYPES[dk]?.icon}</span> {DEALER_TYPES[dk]?.name}
                    </div>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 14, color: '#c9a84c', fontWeight: 'bold' }}>
                            {DEALER_TYPES[selectedDealer]?.icon} {DEALER_TYPES[selectedDealer]?.name} — {poolLabels[selectedPool] || selectedPool}
                        </div>
                        <div style={{ fontSize: 10, color: '#666' }}>{lines.length} line(s)</div>
                    </div>
                    <button onClick={addLine} style={btnSecondary}>➕ Add Line</button>
                </div>
                {lines.length === 0 && <div style={{ color: '#555', fontSize: 11, padding: 20, textAlign: 'center', background: '#050508', borderRadius: 4 }}>No dialogue lines</div>}
                {lines.map((line, idx) => (
                    <div key={idx} style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ color: '#555', fontSize: 10, minWidth: 20, paddingTop: 8 }}>#{idx + 1}</span>
                        <textarea value={line} onChange={e => updateLine(idx, e.target.value)} rows={2} style={{ ...inputStyle, flex: 1, fontStyle: 'italic', color: '#c9a84c', resize: 'vertical' }} />
                        <button onClick={() => removeLine(idx)} style={{ ...btnSecondary, fontSize: 10, padding: '4px 8px', color: '#f87171', borderColor: '#8a3a3a' }}>✕</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// 4. TYPE CHART + CONFIG + PRESETS + STATS
// ═══════════════════════════════════════════════════
function TypeChartSection({ onNotify }) {
    const types = Object.values(HAGGLE_TYPES);
    const [, forceUpdate] = useState(0);

    return (
        <div style={{ overflowY: 'auto' }}>
            {/* Type Matrix */}
            <div style={sectionHeader}>⚔️ TYPE EFFECTIVENESS MATRIX</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 24 }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #333' }}>
                        <th style={{ color: '#666', padding: 8, textAlign: 'left', fontSize: 9 }}>TACTIC ↓ / DEALER →</th>
                        {types.map(t => <th key={t} style={{ color: (TYPE_COLORS[t] || {}).text, padding: 8, textAlign: 'center', fontSize: 10 }}>{(TYPE_COLORS[t] || {}).icon} {t}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {types.map(tacticType => {
                        const tc = TYPE_COLORS[tacticType] || {};
                        const eff = TYPE_EFFECTIVENESS[tacticType] || {};
                        return (
                            <tr key={tacticType} style={{ borderBottom: '1px solid #1a1a2e' }}>
                                <td style={{ color: tc.text, padding: 8, fontWeight: 'bold', fontSize: 10 }}>{tc.icon} {tacticType}</td>
                                {types.map(ds => {
                                    let color = '#444', label = '1.0×';
                                    if (eff.strongAgainst === ds) { color = '#4ade80'; label = `${HAGGLE_CONFIG.superEffectiveMultiplier}× ✊`; }
                                    else if (eff.weakAgainst === ds) { color = '#f87171'; label = `${HAGGLE_CONFIG.notEffectiveMultiplier}× 😰`; }
                                    return <td key={ds} style={{ textAlign: 'center', padding: 8, color, fontWeight: label !== '1.0×' ? 'bold' : 'normal', fontSize: 10 }}>{label}</td>;
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Negotiation Phases */}
            <div style={sectionHeader}>📋 NEGOTIATION PHASES</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {Object.entries(PHASE_MODIFIERS).map(([key, phase]) => (
                    <div key={key} style={{ flex: 1, background: '#050508', border: '1px solid #222', borderRadius: 4, padding: 12 }}>
                        <div style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 11, marginBottom: 6 }}>{key.toUpperCase()}</div>
                        <div style={{ color: '#888', fontSize: 9, marginBottom: 8 }}>{phase.description}</div>
                        <div style={{ fontSize: 9, color: '#4ade80' }}>Bluff bonus: {phase.bluffBonus > 0 ? '+' : ''}{Math.round(phase.bluffBonus * 100)}%</div>
                        <div style={{ fontSize: 9, color: '#f87171' }}>Walk penalty: {phase.walkAwayPenalty > 0 ? '+' : ''}{Math.round(phase.walkAwayPenalty * 100)}%</div>
                    </div>
                ))}
            </div>

            {/* Tactic Presets */}
            {TACTIC_PRESETS && Object.keys(TACTIC_PRESETS).length > 0 && (
                <>
                    <div style={sectionHeader}>🎯 TACTIC PRESETS</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                        {Object.entries(TACTIC_PRESETS).map(([key, preset]) => (
                            <div key={key} style={{ background: '#050508', border: '1px solid #222', borderRadius: 4, padding: 12 }}>
                                <div style={{ fontWeight: 'bold', fontSize: 12, color: '#eaeaea', marginBottom: 4 }}>{preset.name}</div>
                                <div style={{ fontSize: 9, color: '#888', marginBottom: 8 }}>{preset.description}</div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                                    {preset.tactics.map(tid => {
                                        const t = TACTICS[tid] || BLUE_OPTIONS.find(b => b.id === tid);
                                        const tc = t ? (TYPE_COLORS[t.type] || {}) : {};
                                        return <span key={tid} style={tagStyle(tc.text || '#888')}>{t?.label || tid}</span>;
                                    })}
                                </div>
                                <div style={{ fontSize: 8, color: '#666', fontStyle: 'italic' }}>{preset.strategy}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Battle Config */}
            <div style={sectionHeader}>⚙️ BATTLE CONFIGURATION</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
                {Object.entries(HAGGLE_CONFIG).map(([key, val]) => (
                    <div key={key} style={{ background: '#050508', border: '1px solid #222', borderRadius: 4, padding: 8 }}>
                        <label style={labelStyle}>{key.replace(/([A-Z])/g, ' $1')}</label>
                        <input type="number" step="any" value={val} onChange={e => { HAGGLE_CONFIG[key] = parseFloat(e.target.value) || 0; forceUpdate(n => n + 1); useCmsStore.getState().markDirty('events'); }} style={{ ...inputStyle, color: '#4ade80' }} />
                    </div>
                ))}
            </div>

            {/* Stat Descriptions */}
            {STAT_DESCRIPTIONS && (
                <>
                    <div style={sectionHeader}>📈 PLAYER STATS (Haggle Effects)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
                        {Object.entries(STAT_DESCRIPTIONS).map(([key, stat]) => (
                            <div key={key} style={{ background: '#050508', border: '1px solid #222', borderRadius: 4, padding: 10 }}>
                                <div style={{ fontSize: 14, marginBottom: 4 }}>{stat.icon} <strong style={{ color: '#eaeaea', fontSize: 11 }}>{stat.name}</strong></div>
                                <div style={{ fontSize: 9, color: '#888', marginBottom: 6 }}>{stat.description}</div>
                                <div style={{ fontSize: 9, color: '#c9a84c' }}>⚔️ {stat.haggleEffect}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* NPC Role Mapping */}
            <div style={sectionHeader}>👤 NPC ROLE → DEALER TYPE MAPPING</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 24 }}>
                {Object.entries(ROLE_TO_DEALER_TYPE).map(([role, dtype]) => (
                    <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#050508', border: '1px solid #222', borderRadius: 4, padding: '5px 8px', fontSize: 10 }}>
                        <span style={{ color: '#888' }}>{role}</span>
                        <span style={{ color: '#555' }}>→</span>
                        <span style={{ color: '#c9a84c' }}>{DEALER_TYPES[dtype]?.icon} {dtype}</span>
                    </div>
                ))}
            </div>

            {/* Achievements */}
            {HAGGLE_ACHIEVEMENTS && (
                <>
                    <div style={sectionHeader}>🏆 ACHIEVEMENTS ({Object.keys(HAGGLE_ACHIEVEMENTS).length})</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {Object.entries(HAGGLE_ACHIEVEMENTS).map(([key, ach]) => (
                            <div key={key} style={{ background: '#050508', border: '1px solid #222', borderRadius: 4, padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 18 }}>{ach.icon}</span>
                                <div>
                                    <div style={{ color: '#eaeaea', fontSize: 10, fontWeight: 'bold' }}>{ach.name}</div>
                                    <div style={{ color: '#666', fontSize: 8 }}>{ach.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════
// 5. TEST LAUNCHER
// ═══════════════════════════════════════════════════
function TestLauncherSection({ onNotify }) {
    const [mode, setMode] = useState('buy');
    const [dealerType, setDealerType] = useState('random');
    const [askingPrice, setAskingPrice] = useState(25000);
    const [artworkTitle, setArtworkTitle] = useState('Test Artwork');
    const [artworkArtist, setArtworkArtist] = useState('Various');
    const [npcId, setNpcId] = useState('none');

    const npcs = useMemo(() => {
        const list = [{ id: 'none', name: '(Anonymous Dealer)' }];
        if (Array.isArray(CONTACTS)) CONTACTS.forEach(c => list.push({ id: c.id, name: c.name }));
        return list;
    }, []);

    const handleLaunch = () => {
        if (!GameState.state) { onNotify?.('❌ Game not running — start a game first'); return; }
        const npc = npcId !== 'none' ? CONTACTS.find(c => c.id === npcId) : null;
        const work = { id: `test_${Date.now()}`, title: artworkTitle, artist: artworkArtist, year: '2024', medium: 'Oil on Canvas' };
        try {
            const result = HaggleManager.start({ mode, work, npc, askingPrice: parseInt(askingPrice) || 25000 });
            if (dealerType !== 'random' && HaggleManager.active && DEALER_TYPES[dealerType]) {
                HaggleManager.active.dealerTypeKey = dealerType;
                HaggleManager.active.dealerType = DEALER_TYPES[dealerType];
                HaggleManager.active.dealerIcon = DEALER_TYPES[dealerType].icon;
                HaggleManager.active.patience = DEALER_TYPES[dealerType].patience;
            }
            GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'HaggleScene', { haggleInfo: { ...result, bgKey: 'bg_gallery_main_1bit_1771587911969.png' }, returnScene: 'MainMenuScene', returnArgs: {} });
            onNotify?.(`⚔️ Launched ${mode} battle vs ${result.dealerName} (${result.dealerType}) @ $${parseInt(askingPrice).toLocaleString()}`);
        } catch (err) { onNotify?.('❌ Error: ' + err.message); }
    };

    return (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={sectionHeader}>🎮 TEST BATTLE LAUNCHER</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Mode</label><select value={mode} onChange={e => setMode(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}><option value="buy">🛒 Buy</option><option value="sell">💰 Sell</option></select></div>
                <div><label style={labelStyle}>Dealer Type</label><select value={dealerType} onChange={e => setDealerType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}><option value="random">🎲 Random</option>{Object.entries(DEALER_TYPES).map(([k, d]) => <option key={k} value={k}>{d.icon} {d.name}</option>)}</select></div>
                <div><label style={labelStyle}>Asking Price ($)</label><input type="number" value={askingPrice} onChange={e => setAskingPrice(e.target.value)} style={{ ...inputStyle, color: '#4ade80' }} /></div>
                <div><label style={labelStyle}>NPC</label><select value={npcId} onChange={e => setNpcId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>{npcs.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></div>
                <div><label style={labelStyle}>Artwork Title</label><input value={artworkTitle} onChange={e => setArtworkTitle(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Artist</label><input value={artworkArtist} onChange={e => setArtworkArtist(e.target.value)} style={inputStyle} /></div>
            </div>
            <button onClick={handleLaunch} style={{ ...btnPrimary, width: '100%', marginTop: 16, padding: '12px', fontSize: 14, letterSpacing: 1 }}>⚔️ LAUNCH HAGGLE BATTLE</button>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════
export default function HaggleEditor() {
    const [activeSection, setActiveSection] = useState('dealers');
    const [notification, setNotification] = useState(null);

    const showNotif = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3500); };

    // Restore persisted config on mount
    useEffect(() => {
        const saved = getPersistedConfig();
        if (saved) { restoreFromSnapshot(saved); showNotif('📦 Restored saved haggle config'); }
    }, []);

    const handleSave = () => {
        const snap = snapshotCurrentConfig();
        persistConfig(snap);
        useCmsStore.getState().markDirty('events');
        showNotif('💾 Config saved to localStorage');
    };

    const handleReset = () => {
        localStorage.removeItem('artlife-haggle-config');
        showNotif('🔄 Config reset — reload to restore defaults');
    };

    const sections = [
        { id: 'dealers', icon: '🎭', label: 'Dealers' },
        { id: 'tactics', icon: '⚔️', label: 'Tactics & Powers' },
        { id: 'dialogue', icon: '💬', label: 'Dialogue' },
        { id: 'types', icon: '📊', label: 'Types & Config' },
        { id: 'test', icon: '🎮', label: 'Test Battle' },
    ];

    const totalTactics = Object.keys(TACTICS).length + BLUE_OPTIONS.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#111', borderBottom: '1px solid #333' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <strong style={{ color: '#c9a84c', fontSize: 13 }}>⚔️ Haggle System Editor</strong>
                    {sections.map(s => (
                        <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                            ...btnSecondary, fontSize: 10,
                            borderColor: activeSection === s.id ? '#c9a84c' : '#333',
                            color: activeSection === s.id ? '#c9a84c' : '#666',
                        }}>{s.icon} {s.label}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 9, color: '#555' }}>
                        {Object.keys(DEALER_TYPES).length} dealers · {totalTactics} tactics · {Object.keys(HAGGLE_ACHIEVEMENTS || {}).length} achievements
                    </span>
                    <button onClick={handleSave} style={{ ...btnSecondary, fontSize: 9, color: '#4ade80', borderColor: '#3a8a3a' }}>💾 Save</button>
                    <button onClick={handleReset} style={{ ...btnSecondary, fontSize: 9, color: '#f87171', borderColor: '#8a3a3a' }}>🔄 Reset</button>
                </div>
            </div>

            {notification && (
                <div style={{
                    padding: '6px 16px', fontSize: 11,
                    background: notification.startsWith('❌') ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
                    color: notification.startsWith('❌') ? '#f87171' : '#4ade80',
                    borderBottom: '1px solid #222',
                }}>{notification}</div>
            )}

            <div style={{ flex: 1, overflow: 'hidden', padding: 16 }}>
                {activeSection === 'dealers' && <DealerEditorSection onNotify={showNotif} />}
                {activeSection === 'tactics' && <TacticEditorSection onNotify={showNotif} />}
                {activeSection === 'dialogue' && <DialogueEditorSection onNotify={showNotif} />}
                {activeSection === 'types' && <TypeChartSection onNotify={showNotif} />}
                {activeSection === 'test' && <TestLauncherSection onNotify={showNotif} />}
            </div>
        </div>
    );
}
