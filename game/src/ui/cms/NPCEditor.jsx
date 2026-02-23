import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNPCStore } from '../../stores/npcStore.js';
import { useCmsStore } from '../../stores/cmsStore.js';
import { EventRegistry } from '../../managers/EventRegistry.js';
import { ContentExporter, ContentImporter } from '../../utils/ContentExporter.js';
import { CONTACTS } from '../../data/contacts.js';

// ═════════════════════════════════════════════════════════════
// NPC Management System — Full CMS Editor
// ═════════════════════════════════════════════════════════════

const TABS = [
    { key: 'identity', label: '🧬 Identity & Lore', color: '#c9a84c' },
    { key: 'visuals', label: '🎨 Sprite & Visuals', color: '#60a5fa' },
    { key: 'schedule', label: '📅 Schedule', color: '#4ade80' },
    { key: 'dialogue', label: '💬 Dialogue', color: '#a78bfa' },
    { key: 'relationships', label: '🔗 Relationships', color: '#f87171' },
    { key: 'overworld', label: '🗺️ Overworld', color: '#fb923c' },
];

const ROLES = [
    'dealer', 'gallerist', 'auction', 'artist', 'collector',
    'advisor', 'speculator', 'young_hustler', 'institutional', 'mega_dealer'
];

const BEHAVIORS = ['wandering', 'stationary', 'patrol'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAPS = ['pallet_town', 'gallery_interior', 'auction_house', 'studio', 'wine_bar', 'art_fair'];

// ── Shared Styles ──
const labelStyle = {
    display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase',
    marginBottom: 4, letterSpacing: 1, marginTop: 14,
};
const inputStyle = {
    width: '100%', padding: '7px 10px', background: '#050508', color: '#eaeaea',
    border: '1px solid #333', fontFamily: 'inherit', fontSize: 12, outline: 'none',
    boxSizing: 'border-box', borderRadius: 3,
};
const selectStyle = { ...inputStyle, cursor: 'pointer' };
const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: 80, lineHeight: '1.5' };
const miniBtn = {
    background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '3px 10px',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, borderRadius: 3,
};
const sectionTitle = (text, color = '#c9a84c') => (
    <div style={{
        fontSize: 12, fontWeight: 'bold', color, marginBottom: 10, marginTop: 4,
        borderBottom: `1px solid ${color}33`, paddingBottom: 6
    }}>
        {text}
    </div>
);

// ═══════════════════════════════════════
// Tab 1: Identity & Lore
// ═══════════════════════════════════════
function IdentityTab({ npc, onEdit }) {
    // Find the full CONTACTS entry for static data
    const contactData = CONTACTS.find(c => c.id === npc.id) || {};

    return (
        <div>
            {sectionTitle('CORE IDENTITY')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    <label style={labelStyle}>Full Name</label>
                    <input value={npc.name || ''} onChange={e => onEdit('name', e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Role / Archetype</label>
                    <select value={npc.role || 'dealer'} onChange={e => onEdit('role', e.target.value)} style={selectStyle}>
                        {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Title / Position</label>
                    <input value={npc.title || contactData.title || ''} onChange={e => onEdit('title', e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Emoji Icon</label>
                    <input value={npc.emoji || contactData.emoji || ''} onChange={e => onEdit('emoji', e.target.value)} style={{ ...inputStyle, width: 60, textAlign: 'center', fontSize: 20 }} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    <label style={labelStyle}>Tier (1-5 Power Level)</label>
                    <input type="range" min={1} max={5} value={npc.tier || 1} onChange={e => onEdit('tier', parseInt(e.target.value))}
                        style={{ width: '100%' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666' }}>
                        <span>Street</span><span>Mid</span><span>Elite</span><span>Power</span><span>Legend</span>
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Initial Favor ({npc.favor ?? contactData.initialFavor ?? 0})</label>
                    <input type="range" min={-100} max={100} value={npc.favor ?? contactData.initialFavor ?? 0}
                        onChange={e => onEdit('favor', parseInt(e.target.value))} style={{ width: '100%' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666' }}>
                        <span style={{ color: '#f87171' }}>Hostile</span>
                        <span>Neutral</span>
                        <span style={{ color: '#4ade80' }}>Allied</span>
                    </div>
                </div>
            </div>

            {sectionTitle('PERSONALITY & LORE')}
            <label style={labelStyle}>Personality</label>
            <textarea value={npc.personality || contactData.personality || ''} onChange={e => onEdit('personality', e.target.value)}
                style={textareaStyle} placeholder="Sharp, discreet, old-money connections..." />

            <label style={labelStyle}>Backstory</label>
            <textarea value={npc.backstory || ''} onChange={e => onEdit('backstory', e.target.value)}
                style={{ ...textareaStyle, minHeight: 120 }}
                placeholder="Elena Ross grew up in the shadow of Chelsea galleries. Her father was a framer; she learned to spot a Basquiat before she could drive..." />

            <label style={labelStyle}>Motivations (one per line)</label>
            <textarea value={(npc.motivations || []).join('\n')} onChange={e => onEdit('motivations', e.target.value.split('\n').filter(Boolean))}
                style={{ ...textareaStyle, minHeight: 60 }}
                placeholder="Protect her artists&#10;Expose forgeries&#10;Build the gallery's reputation" />

            {contactData.archetypeAbility && (
                <>
                    <label style={labelStyle}>Archetype Ability</label>
                    <textarea value={npc.archetypeAbility || contactData.archetypeAbility || ''} onChange={e => onEdit('archetypeAbility', e.target.value)}
                        style={{ ...textareaStyle, borderColor: '#c9a84c44', color: '#c9a84c' }}
                        placeholder="Special gameplay mechanic..." />
                </>
            )}

            <label style={labelStyle}>Traits (comma sep)</label>
            <input value={(npc.traits || []).join(', ')} onChange={e => onEdit('traits', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                style={inputStyle} placeholder="loyal, secretive, well-connected" />

            {/* ── WEALTH ── */}
            {sectionTitle('💰 WEALTH & BUDGET')}
            {(() => {
                const w = npc.wealth || {};
                const setWealth = (field, val) => onEdit('wealth', { ...w, [field]: val });
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Liquid Cash ($)</label>
                            <input type="number" value={w.liquidCash || 0} onChange={e => setWealth('liquidCash', parseInt(e.target.value) || 0)}
                                style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Annual Budget ($)</label>
                            <input type="number" value={w.annualBudget || 0} onChange={e => setWealth('annualBudget', parseInt(e.target.value) || 0)}
                                style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Spending Ceiling ($)</label>
                            <input type="number" value={w.spendingCeiling || 0} onChange={e => setWealth('spendingCeiling', parseInt(e.target.value) || 0)}
                                style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Income Source</label>
                            <select value={w.incomeSource || 'unknown'} onChange={e => setWealth('incomeSource', e.target.value)} style={selectStyle}>
                                {['gallery_sales', 'private_sales_commission', 'advisory_fees', 'salary_commission',
                                    'art_sales', 'trading_profits', 'flipping', 'endowment', 'family_wealth',
                                    'tech_dividends', 'consulting_fees', 'gallery_empire', 'advisory_fees_kickbacks', 'unknown'
                                ].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                            </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Financial Stress ({w.financialStress || 0}%)</label>
                            <input type="range" min={0} max={100} value={w.financialStress || 0}
                                onChange={e => setWealth('financialStress', parseInt(e.target.value))} style={{ width: '100%' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666' }}>
                                <span style={{ color: '#4ade80' }}>Relaxed</span>
                                <span style={{ color: '#fb923c' }}>Moderate</span>
                                <span style={{ color: '#f87171' }}>Desperate</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── COLLECTION ── */}
            {sectionTitle('📦 COLLECTION INVENTORY')}
            {(() => {
                const c = npc.collection || {};
                const setCol = (field, val) => onEdit('collection', { ...c, [field]: val });
                const owned = c.owned || [];
                const forSale = c.forSale || [];
                const past = c.pastSales || [];
                return (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div style={{ padding: 10, background: '#0a0a12', borderRadius: 6, border: '1px solid #222', textAlign: 'center' }}>
                                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#4ade80' }}>{owned.length}</div>
                                <div style={{ fontSize: 9, color: '#888' }}>OWNED</div>
                            </div>
                            <div style={{ padding: 10, background: '#0a0a12', borderRadius: 6, border: '1px solid #222', textAlign: 'center' }}>
                                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#fb923c' }}>{forSale.length}</div>
                                <div style={{ fontSize: 9, color: '#888' }}>FOR SALE</div>
                            </div>
                            <div style={{ padding: 10, background: '#0a0a12', borderRadius: 6, border: '1px solid #222', textAlign: 'center' }}>
                                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#a78bfa' }}>{past.length}</div>
                                <div style={{ fontSize: 9, color: '#888' }}>PAST SALES</div>
                            </div>
                        </div>

                        <label style={labelStyle}>Owned Works (IDs, comma sep)</label>
                        <input value={owned.join(', ')} onChange={e => setCol('owned', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            style={inputStyle} placeholder="basquiat_untitled_1982, kwame_asante_threshold" />

                        <label style={labelStyle}>For Sale (IDs, comma sep)</label>
                        <input value={forSale.join(', ')} onChange={e => setCol('forSale', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            style={inputStyle} placeholder="fontana_concetto_spaziale" />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>Total Value ($)</label>
                                <input type="number" value={c.totalValue || 0} onChange={e => setCol('totalValue', parseInt(e.target.value) || 0)}
                                    style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Max Capacity</label>
                                <input type="number" value={c.maxCapacity || 10} onChange={e => setCol('maxCapacity', parseInt(e.target.value))}
                                    style={inputStyle} />
                            </div>
                        </div>

                        {past.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                                <label style={labelStyle}>Past Sales</label>
                                {past.map((s, i) => (
                                    <div key={i} style={{ fontSize: 10, color: '#888', padding: '4px 0', borderBottom: '1px solid #1a1a2e' }}>
                                        📜 <span style={{ color: '#eaeaea' }}>{s.workId}</span> → ${(s.soldPrice || 0).toLocaleString()} (Week {s.soldWeek}) → {s.buyer}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ── CURATORIAL TASTE ── */}
            {sectionTitle('🎯 CURATORIAL TASTE')}
            {(() => {
                const t = npc.taste || {};
                const setTaste = (field, val) => onEdit('taste', { ...t, [field]: val });
                const ALL_MEDIUMS = ['painting', 'sculpture', 'photography', 'mixed_media', 'installation', 'digital', 'video', 'ceramics', 'street_art'];
                const ALL_GENRES = ['contemporary painting', 'abstract painting', 'pop-art', 'neo-expressionism', 'conceptual', 'post-colonial', 'figurative', 'new_media', 'conceptual photography', 'nft'];
                const ALL_TIERS = ['speculative', 'emerging', 'mid_career', 'hot', 'classic', 'blue-chip'];
                const RISK_OPTIONS = ['conservative', 'moderate', 'aggressive'];

                const toggleArray = (arr, item) => arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

                return (
                    <div>
                        <label style={labelStyle}>Preferred Mediums</label>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {ALL_MEDIUMS.map(m => {
                                const active = (t.preferredMediums || []).includes(m);
                                return (
                                    <button key={m} onClick={() => setTaste('preferredMediums', toggleArray(t.preferredMediums || [], m))}
                                        style={{
                                            ...miniBtn, padding: '3px 8px', fontSize: 9,
                                            background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
                                            borderColor: active ? '#c9a84c' : '#333', color: active ? '#c9a84c' : '#666',
                                        }}>{m.replace(/_/g, ' ')}</button>
                                );
                            })}
                        </div>

                        <label style={labelStyle}>Preferred Genres</label>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {ALL_GENRES.map(g => {
                                const active = (t.preferredGenres || []).includes(g);
                                return (
                                    <button key={g} onClick={() => setTaste('preferredGenres', toggleArray(t.preferredGenres || [], g))}
                                        style={{
                                            ...miniBtn, padding: '3px 8px', fontSize: 9,
                                            background: active ? 'rgba(96,165,250,0.15)' : 'transparent',
                                            borderColor: active ? '#60a5fa' : '#333', color: active ? '#60a5fa' : '#666',
                                        }}>{g}</button>
                                );
                            })}
                        </div>

                        <label style={labelStyle}>Preferred Tiers</label>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {ALL_TIERS.map(tier => {
                                const active = (t.preferredTiers || []).includes(tier);
                                return (
                                    <button key={tier} onClick={() => setTaste('preferredTiers', toggleArray(t.preferredTiers || [], tier))}
                                        style={{
                                            ...miniBtn, padding: '3px 8px', fontSize: 9,
                                            background: active ? 'rgba(74,222,128,0.15)' : 'transparent',
                                            borderColor: active ? '#4ade80' : '#333', color: active ? '#4ade80' : '#666',
                                        }}>{tier.replace(/_/g, ' ')}</button>
                                );
                            })}
                        </div>

                        <label style={labelStyle}>Risk Appetite</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {RISK_OPTIONS.map(r => (
                                <button key={r} onClick={() => setTaste('riskAppetite', r)} style={{
                                    ...miniBtn, padding: '5px 14px',
                                    background: t.riskAppetite === r ? 'rgba(201,168,76,0.15)' : 'transparent',
                                    borderColor: t.riskAppetite === r ? '#c9a84c' : '#333',
                                    color: t.riskAppetite === r ? '#c9a84c' : '#666',
                                }}>{r.charAt(0).toUpperCase() + r.slice(1)}</button>
                            ))}
                        </div>

                        <label style={labelStyle}>Curatorial Philosophy</label>
                        <textarea value={t.philosophy || ''} onChange={e => setTaste('philosophy', e.target.value)}
                            style={{ ...textareaStyle, minHeight: 60 }}
                            placeholder="Art is alive. She only sells work she believes in..." />
                    </div>
                );
            })()}
        </div>
    );
}

// ═══════════════════════════════════════
// Tab 2: Sprite & Visuals
// ═══════════════════════════════════════
function VisualsTab({ npc, onEdit }) {
    const contactData = CONTACTS.find(c => c.id === npc.id) || {};
    const [dragOver, setDragOver] = useState(false);

    const handlePortraitUpload = useCallback((file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => onEdit('portraitUrl', e.target.result);
        reader.readAsDataURL(file);
    }, [onEdit]);

    const TINT_PRESETS = [
        { label: 'None', hex: '#ffffff', tint: 0xffffff },
        { label: 'Rose', hex: '#ff9999', tint: 0xff9999 },
        { label: 'Sky', hex: '#99ccff', tint: 0x99ccff },
        { label: 'Lime', hex: '#ccff99', tint: 0xccff99 },
        { label: 'Gold', hex: '#ffcc66', tint: 0xffcc66 },
        { label: 'Violet', hex: '#cc99ff', tint: 0xcc99ff },
        { label: 'Coral', hex: '#ff8866', tint: 0xff8866 },
    ];

    return (
        <div>
            {sectionTitle('SPRITE CONFIGURATION', '#60a5fa')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    <label style={labelStyle}>Sprite Sheet Key</label>
                    <input value={npc.spriteKey || contactData.spriteKey || ''} onChange={e => onEdit('spriteKey', e.target.value)}
                        style={inputStyle} placeholder="walk_elena_ross_walk" />
                    <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
                        Must match a loaded Phaser texture key
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Tint Color</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {TINT_PRESETS.map(t => (
                            <div key={t.hex} onClick={() => onEdit('tint', t.tint)} style={{
                                width: 28, height: 28, background: t.hex, borderRadius: 4, cursor: 'pointer',
                                border: (npc.tint === t.tint) ? '2px solid #fff' : '2px solid #333',
                                boxShadow: (npc.tint === t.tint) ? `0 0 8px ${t.hex}88` : 'none',
                            }} title={t.label} />
                        ))}
                    </div>
                    <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
                        Current: 0x{(npc.tint || 0xffffff).toString(16).toUpperCase()}
                    </div>
                </div>
            </div>

            {sectionTitle('PORTRAIT', '#60a5fa')}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault(); setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file?.type.startsWith('image/')) handlePortraitUpload(file);
                }}
                style={{
                    border: `2px dashed ${dragOver ? '#60a5fa' : '#333'}`,
                    borderRadius: 8, padding: 20, textAlign: 'center',
                    background: dragOver ? 'rgba(96,165,250,0.05)' : 'rgba(0,0,0,0.2)',
                    transition: 'all 0.15s', cursor: 'pointer',
                    minHeight: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}
                onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file'; input.accept = 'image/*';
                    input.onchange = (e) => handlePortraitUpload(e.target.files[0]);
                    input.click();
                }}
            >
                {npc.portraitUrl ? (
                    <>
                        <img src={npc.portraitUrl} alt="NPC Portrait"
                            style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, border: '1px solid #333', imageRendering: 'pixelated' }} />
                        <div style={{ fontSize: 10, color: '#888', marginTop: 8 }}>Click or drag to replace</div>
                        <button onClick={(e) => { e.stopPropagation(); onEdit('portraitUrl', null); }}
                            style={{ ...miniBtn, marginTop: 8, borderColor: '#f87171', color: '#f87171' }}>
                            ✕ Remove Portrait
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>{npc.emoji || contactData.emoji || '👤'}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>Drop portrait image here</div>
                        <div style={{ fontSize: 10, color: '#555' }}>or click to browse</div>
                    </>
                )}
            </div>

            {sectionTitle('SPRITE PREVIEW', '#60a5fa')}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: '#0a0a12', borderRadius: 6, border: '1px solid #222' }}>
                <div style={{ width: 64, height: 64, background: '#111', border: '1px solid #333', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 32 }}>{npc.emoji || contactData.emoji || '👤'}</span>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: '#eaeaea', fontWeight: 'bold' }}>{npc.name}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>Key: {npc.spriteKey || contactData.spriteKey || '—'}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>Tint: <span style={{ color: `#${(npc.tint || 0xffffff).toString(16)}` }}>■</span> 0x{(npc.tint || 0xffffff).toString(16).toUpperCase()}</div>
                    <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>Sprite preview renders in-game only (requires loaded textures)</div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Tab 3: Schedule Editor
// ═══════════════════════════════════════
function ScheduleTab({ npc, onEdit }) {
    const schedule = npc.schedule || [];

    const addBlock = () => {
        onEdit('schedule', [...schedule, {
            map: 'pallet_town', days: [1, 2, 3, 4, 5], startHour: 8, endHour: 18,
            x: 10, y: 10, behavior: 'wandering',
        }]);
    };

    const updateBlock = (idx, field, value) => {
        const updated = [...schedule];
        updated[idx] = { ...updated[idx], [field]: value };
        onEdit('schedule', updated);
    };

    const removeBlock = (idx) => {
        onEdit('schedule', schedule.filter((_, i) => i !== idx));
    };

    const dupBlock = (idx) => {
        const dup = { ...schedule[idx] };
        onEdit('schedule', [...schedule.slice(0, idx + 1), dup, ...schedule.slice(idx + 1)]);
    };

    return (
        <div>
            {sectionTitle('WEEKLY SCHEDULE', '#4ade80')}
            <div style={{ fontSize: 10, color: '#888', marginBottom: 16 }}>
                Define when and where this NPC appears on each map. Multiple blocks create a daily routine.
            </div>

            {schedule.map((block, idx) => (
                <div key={idx} style={{
                    border: '1px solid #222', borderRadius: 6, padding: 14, marginBottom: 12,
                    background: 'rgba(0,0,0,0.3)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 'bold' }}>
                            Block #{idx + 1}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => dupBlock(idx)} style={{ ...miniBtn, borderColor: '#4ade80', color: '#4ade80' }}>⎘ Dup</button>
                            <button onClick={() => removeBlock(idx)} style={{ ...miniBtn, borderColor: '#f87171', color: '#f87171' }}>✕</button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={labelStyle}>Map</label>
                            <select value={block.map} onChange={e => updateBlock(idx, 'map', e.target.value)} style={selectStyle}>
                                {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Behavior</label>
                            <select value={block.behavior} onChange={e => updateBlock(idx, 'behavior', e.target.value)} style={selectStyle}>
                                {BEHAVIORS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Hours</label>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <input type="number" min={0} max={23} value={block.startHour} onChange={e => updateBlock(idx, 'startHour', parseInt(e.target.value))}
                                    style={{ ...inputStyle, width: 50 }} />
                                <span style={{ color: '#666' }}>→</span>
                                <input type="number" min={0} max={24} value={block.endHour} onChange={e => updateBlock(idx, 'endHour', parseInt(e.target.value))}
                                    style={{ ...inputStyle, width: 50 }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                        <div>
                            <label style={labelStyle}>Days Active</label>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {DAYS.map((day, dayIdx) => {
                                    const dayNum = dayIdx + 1;
                                    const active = (block.days || []).includes(dayNum);
                                    return (
                                        <button key={day} onClick={() => {
                                            const days = active ? block.days.filter(d => d !== dayNum) : [...(block.days || []), dayNum].sort();
                                            updateBlock(idx, 'days', days);
                                        }} style={{
                                            ...miniBtn, padding: '3px 6px', fontSize: 9,
                                            background: active ? 'rgba(74,222,128,0.15)' : 'transparent',
                                            borderColor: active ? '#4ade80' : '#333',
                                            color: active ? '#4ade80' : '#666',
                                        }}>{day}</button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Spawn Position</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ color: '#666', fontSize: 10 }}>X:</span>
                                <input type="number" value={block.x || 0} onChange={e => updateBlock(idx, 'x', parseInt(e.target.value))}
                                    style={{ ...inputStyle, width: 50 }} />
                                <span style={{ color: '#666', fontSize: 10 }}>Y:</span>
                                <input type="number" value={block.y || 0} onChange={e => updateBlock(idx, 'y', parseInt(e.target.value))}
                                    style={{ ...inputStyle, width: 50 }} />
                            </div>
                        </div>
                    </div>

                    {/* Visual schedule bar */}
                    <div style={{ marginTop: 10, display: 'flex', gap: 0, height: 14 }}>
                        {Array.from({ length: 24 }, (_, h) => {
                            const active = h >= block.startHour && h < block.endHour;
                            return (
                                <div key={h} style={{
                                    flex: 1, background: active ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.03)',
                                    borderRight: '1px solid #1a1a2e', position: 'relative',
                                }} title={`${h}:00`}>
                                    {(h % 6 === 0) && <span style={{ position: 'absolute', bottom: -12, left: 0, fontSize: 7, color: '#555' }}>{h}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <button onClick={addBlock} style={{ ...miniBtn, borderColor: '#4ade80', color: '#4ade80', width: '100%', padding: '8px 0' }}>
                + Add Schedule Block
            </button>
        </div>
    );
}

// ═══════════════════════════════════════
// Tab 4: Dialogue Pool
// ═══════════════════════════════════════
function DialogueTab({ npc, onEdit }) {
    const contactData = CONTACTS.find(c => c.id === npc.id) || {};
    const greetings = npc.greetings || contactData.greetings || [];
    const [previewIdx, setPreviewIdx] = useState(0);
    const availableEvents = useMemo(() => EventRegistry.jsonEvents || [], []);

    return (
        <div>
            {sectionTitle('GREETINGS POOL', '#a78bfa')}
            <div style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>
                Random greetings shown when NPC appears or sends messages.
            </div>

            {greetings.map((g, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ color: '#a78bfa', fontSize: 10, width: 20, textAlign: 'right' }}>{idx + 1}.</span>
                    <input value={g} onChange={e => {
                        const updated = [...greetings];
                        updated[idx] = e.target.value;
                        onEdit('greetings', updated);
                    }} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => onEdit('greetings', greetings.filter((_, i) => i !== idx))}
                        style={{ ...miniBtn, borderColor: '#f87171', color: '#f87171', padding: '2px 6px' }}>✕</button>
                </div>
            ))}
            <button onClick={() => onEdit('greetings', [...greetings, ''])}
                style={{ ...miniBtn, borderColor: '#a78bfa', color: '#a78bfa', marginTop: 4 }}>
                + Add Greeting
            </button>

            {/* Preview */}
            {greetings.length > 0 && (
                <div style={{ marginTop: 16, padding: 16, background: '#0a0a12', borderRadius: 8, border: '1px solid #222' }}>
                    <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>📱 Message Preview</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 24 }}>{npc.emoji || contactData.emoji || '👤'}</div>
                        <div>
                            <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 'bold' }}>{npc.name}</div>
                            <div style={{ fontSize: 12, color: '#eaeaea', marginTop: 4, fontStyle: 'italic' }}>
                                "{greetings[previewIdx % greetings.length]}"
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setPreviewIdx(previewIdx + 1)}
                        style={{ ...miniBtn, marginTop: 8, borderColor: '#a78bfa', color: '#a78bfa' }}>
                        🔄 Random Greeting
                    </button>
                </div>
            )}

            {sectionTitle('EVENT & DIALOGUE LINKS', '#a78bfa')}
            <label style={labelStyle}>Linked Event ID</label>
            <select value={npc.eventId || ''} onChange={e => onEdit('eventId', e.target.value)} style={selectStyle}>
                <option value="">— No linked event —</option>
                {availableEvents.map(evt => (
                    <option key={evt.id} value={evt.id}>{evt.title || evt.id} ({evt.category})</option>
                ))}
            </select>
            <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
                When set, interacting with this NPC in the overworld launches DialogueScene with this event
            </div>

            <label style={labelStyle}>Fallback Dialog (inline)</label>
            <input value={npc.dialogContent || ''} onChange={e => onEdit('dialogContent', e.target.value)}
                style={inputStyle} placeholder={`${npc.name}: "The art world is full of surprises."`} />
            <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
                Shown when NPC has no linked event (inline text bubble in WorldScene)
            </div>

            {sectionTitle('HAGGLE PERSONALITY', '#a78bfa')}
            <label style={labelStyle}>Dealer Type</label>
            <select value={npc.dealerType || ''} onChange={e => onEdit('dealerType', e.target.value)} style={selectStyle}>
                <option value="">— None —</option>
                <option value="patron">🎨 Patron (fair, accessible)</option>
                <option value="collector">💎 Collector (premium, selective)</option>
                <option value="shark">🦈 Shark (aggressive, high-stakes)</option>
                <option value="hustler">⚡ Hustler (fast, risky)</option>
                <option value="institutional">🏛️ Institutional (formal, slow)</option>
            </select>

            <label style={labelStyle}>Haggle Opening Lines (one per line)</label>
            <textarea value={(npc.haggleLines || []).join('\n')} onChange={e => onEdit('haggleLines', e.target.value.split('\n').filter(Boolean))}
                style={{ ...textareaStyle, minHeight: 60 }}
                placeholder="Let's talk numbers.&#10;I know what this is worth.&#10;Make me an offer I can't refuse." />
        </div>
    );
}

// ═══════════════════════════════════════
// Tab 5: Relationships
// ═══════════════════════════════════════
function RelationshipsTab({ npc, allNpcs, onEdit }) {
    const affinities = npc.affinities || {};
    const contactData = CONTACTS.find(c => c.id === npc.id) || {};

    const updateAffinity = (targetId, value) => {
        const updated = { ...affinities, [targetId]: parseInt(value) };
        onEdit('affinities', updated);
    };

    const factions = useMemo(() => {
        const groups = {};
        allNpcs.forEach(n => {
            const role = n.role || 'unknown';
            if (!groups[role]) groups[role] = [];
            groups[role].push(n);
        });
        return groups;
    }, [allNpcs]);

    return (
        <div>
            {sectionTitle('FACTION & ROLE', '#f87171')}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {Object.entries(factions).map(([role, members]) => {
                    const isMember = members.some(m => m.id === npc.id);
                    return (
                        <div key={role} style={{
                            padding: '6px 12px', borderRadius: 4, fontSize: 10,
                            background: isMember ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isMember ? '#f87171' : '#222'}`,
                            color: isMember ? '#f87171' : '#666',
                        }}>
                            {role.replace('_', ' ').toUpperCase()} ({members.length})
                        </div>
                    );
                })}
            </div>

            {sectionTitle('NPC-TO-NPC AFFINITIES', '#f87171')}
            <div style={{ fontSize: 10, color: '#888', marginBottom: 12 }}>
                Set how this NPC feels about other NPCs. Affects gossip, alliances, and dialogue.
            </div>

            <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {allNpcs.filter(n => n.id !== npc.id).map(other => (
                    <div key={other.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                        borderBottom: '1px solid #1a1a2e',
                    }}>
                        <span style={{ fontSize: 16 }}>{other.emoji || '👤'}</span>
                        <span style={{ fontSize: 11, color: '#eaeaea', flex: 1, minWidth: 120 }}>{other.name}</span>
                        <input type="range" min={-100} max={100} value={affinities[other.id] || 0}
                            onChange={e => updateAffinity(other.id, e.target.value)}
                            style={{ width: 120 }} />
                        <span style={{
                            fontSize: 11, width: 40, textAlign: 'right', fontWeight: 'bold',
                            color: (affinities[other.id] || 0) > 0 ? '#4ade80' : (affinities[other.id] || 0) < 0 ? '#f87171' : '#666',
                        }}>{affinities[other.id] || 0}</span>
                    </div>
                ))}
            </div>

            {sectionTitle('MEMORY (RUNTIME)', '#f87171')}
            {npc.memory ? (
                <div style={{ fontSize: 10, color: '#888', padding: 12, background: '#0a0a12', borderRadius: 6, border: '1px solid #222' }}>
                    <div>👁️ Witnessed: {npc.memory.witnessed?.length || 0} events</div>
                    <div>😤 Grudges: {npc.memory.grudges?.length || 0}</div>
                    <div>🤝 Favors: {npc.memory.favors?.length || 0}</div>
                    <div>📅 Last Contact: Week {npc.memory.lastContact || 0}</div>
                    {npc.memory.witnessed?.length > 0 && (
                        <div style={{ marginTop: 8, borderTop: '1px solid #222', paddingTop: 8 }}>
                            <div style={{ color: '#666', marginBottom: 4 }}>Recent witnessed:</div>
                            {npc.memory.witnessed.slice(-3).map((w, i) => (
                                <div key={i} style={{ color: '#555', fontSize: 9 }}>• {JSON.stringify(w)}</div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ fontSize: 10, color: '#555', padding: 12 }}>No memory data yet (NPC hasn't been encountered in-game)</div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════
// Tab 6: Overworld Controls
// ═══════════════════════════════════════
function OverworldTab({ npc, onEdit }) {
    return (
        <div>
            {sectionTitle('MOVEMENT', '#fb923c')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    <label style={labelStyle}>Walk Speed ({npc.speed || 2})</label>
                    <input type="range" min={0.5} max={5} step={0.5} value={npc.speed || 2}
                        onChange={e => onEdit('speed', parseFloat(e.target.value))} style={{ width: '100%' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666' }}>
                        <span>Slow</span><span>Normal</span><span>Fast</span>
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Wander Interval ({npc.wanderInterval || 2000}ms)</label>
                    <input type="range" min={500} max={5000} step={100} value={npc.wanderInterval || 2000}
                        onChange={e => onEdit('wanderInterval', parseInt(e.target.value))} style={{ width: '100%' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666' }}>
                        <span>Fidgety</span><span>Calm</span><span>Zen</span>
                    </div>
                </div>
            </div>

            {sectionTitle('BEHAVIOR', '#fb923c')}
            <label style={labelStyle}>Default Behavior</label>
            <select value={npc.defaultBehavior || 'wandering'} onChange={e => onEdit('defaultBehavior', e.target.value)} style={selectStyle}>
                {BEHAVIORS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
            </select>

            <label style={labelStyle}>Facing Direction</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {['up', 'down', 'left', 'right'].map(dir => (
                    <button key={dir} onClick={() => onEdit('facingDefault', dir)} style={{
                        ...miniBtn, padding: '6px 14px',
                        background: npc.facingDefault === dir ? 'rgba(251,146,60,0.15)' : 'transparent',
                        borderColor: npc.facingDefault === dir ? '#fb923c' : '#333',
                        color: npc.facingDefault === dir ? '#fb923c' : '#666',
                    }}>
                        {dir === 'up' ? '⬆' : dir === 'down' ? '⬇' : dir === 'left' ? '⬅' : '➡'} {dir}
                    </button>
                ))}
            </div>

            {sectionTitle('INTERACTION', '#fb923c')}
            <label style={labelStyle}>Interaction Range (tiles)</label>
            <input type="number" min={1} max={5} value={npc.interactionRange || 1}
                onChange={e => onEdit('interactionRange', parseInt(e.target.value))} style={{ ...inputStyle, width: 80 }} />
            <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
                How close the player must be to see the interaction hint (SPACE)
            </div>

            {sectionTitle('EMOTES', '#fb923c')}
            <div style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>
                Bubble emotes shown above the NPC when player is nearby.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                {['❗', '❓', '♥', '💬', '💰', '🎨', '⚠️', '💤'].map(emote => {
                    const enabled = (npc.emotes || []).includes(emote);
                    return (
                        <button key={emote} onClick={() => {
                            const emotes = enabled
                                ? (npc.emotes || []).filter(e => e !== emote)
                                : [...(npc.emotes || []), emote];
                            onEdit('emotes', emotes);
                        }} style={{
                            fontSize: 18, padding: '4px 8px', background: enabled ? 'rgba(251,146,60,0.15)' : 'transparent',
                            border: `1px solid ${enabled ? '#fb923c' : '#333'}`, borderRadius: 4, cursor: 'pointer',
                            opacity: enabled ? 1 : 0.4,
                        }}>{emote}</button>
                    );
                })}
            </div>
            <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
                Selected emotes will randomly appear when the player is within interaction range
            </div>

            {/* ── HAGGLE PROFILE ── */}
            {sectionTitle('⚔️ HAGGLE PROFILE', '#e879f9')}
            <div style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>
                These stats directly drive the battle system when this NPC enters a haggle.
            </div>
            {(() => {
                const hp = npc.haggleProfile || {};
                const setHP = (field, val) => onEdit('haggleProfile', { ...hp, [field]: val });
                const DEALER_TYPES_LIST = ['patron', 'shark', 'collector', 'nervous', 'calculator', 'hustler', 'curator', 'speculator', 'advisor'];
                const TRIGGER_OPTIONS = ['flattery', 'provenance_drop', 'market_data', 'comp_analysis', 'fakeout_call', 'walk_away', 'social_proof', 'artist_connection', 'institutional_interest'];

                return (
                    <div>
                        <label style={labelStyle}>Dealer Type (Pokémon-style typing for haggle battles)</label>
                        <select value={hp.dealerType || 'patron'} onChange={e => setHP('dealerType', e.target.value)} style={selectStyle}>
                            {DEALER_TYPES_LIST.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                            <div>
                                <label style={labelStyle}>Price Flexibility ({Math.round((hp.priceFlexibility || 0.15) * 100)}%)</label>
                                <input type="range" min={0} max={50} value={Math.round((hp.priceFlexibility || 0.15) * 100)}
                                    onChange={e => setHP('priceFlexibility', parseInt(e.target.value) / 100)} style={{ width: '100%' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666' }}>
                                    <span>Firm</span><span>Flexible</span>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Patience ({hp.patience || 6} rounds)</label>
                                <input type="range" min={2} max={12} value={hp.patience || 6}
                                    onChange={e => setHP('patience', parseInt(e.target.value))} style={{ width: '100%' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666' }}>
                                    <span>Impatient</span><span>Enduring</span>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Bluff Chance ({Math.round((hp.bluffChance || 0.1) * 100)}%)</label>
                                <input type="range" min={0} max={80} value={Math.round((hp.bluffChance || 0.1) * 100)}
                                    onChange={e => setHP('bluffChance', parseInt(e.target.value) / 100)} style={{ width: '100%' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666' }}>
                                    <span style={{ color: '#4ade80' }}>Honest</span><span style={{ color: '#f87171' }}>Deceptive</span>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Walkaway Threshold ({Math.round((hp.walkawayThreshold || 0.70) * 100)}%)</label>
                                <input type="range" min={30} max={95} value={Math.round((hp.walkawayThreshold || 0.70) * 100)}
                                    onChange={e => setHP('walkawayThreshold', parseInt(e.target.value) / 100)} style={{ width: '100%' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#666' }}>
                                    <span>Easy deal</span><span>Hard sell</span>
                                </div>
                            </div>
                        </div>

                        <label style={labelStyle}>Emotional Triggers</label>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {TRIGGER_OPTIONS.map(trig => {
                                const active = (hp.emotionalTriggers || []).includes(trig);
                                return (
                                    <button key={trig} onClick={() => {
                                        const triggers = active
                                            ? (hp.emotionalTriggers || []).filter(t => t !== trig)
                                            : [...(hp.emotionalTriggers || []), trig];
                                        setHP('emotionalTriggers', triggers);
                                    }} style={{
                                        ...miniBtn, padding: '3px 8px', fontSize: 9,
                                        background: active ? 'rgba(232,121,249,0.15)' : 'transparent',
                                        borderColor: active ? '#e879f9' : '#333', color: active ? '#e879f9' : '#666',
                                    }}>{trig.replace(/_/g, ' ')}</button>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* ── BEHAVIOR ── */}
            {sectionTitle('🧠 BEHAVIOR MODEL', '#22d3ee')}
            {(() => {
                const b = npc.behavior || {};
                const setBeh = (field, val) => onEdit('behavior', { ...b, [field]: val });
                const TEMPS = ['warm', 'cold', 'volatile', 'calculated'];
                const ANCHORS = ['below_market', 'market', 'above_market'];

                return (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Risk Tolerance ({b.riskTolerance || 50}%)</label>
                                <input type="range" min={0} max={100} value={b.riskTolerance || 50}
                                    onChange={e => setBeh('riskTolerance', parseInt(e.target.value))} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Loyalty Threshold ({b.loyaltyThreshold || 25} favor)</label>
                                <input type="range" min={0} max={80} value={b.loyaltyThreshold || 25}
                                    onChange={e => setBeh('loyaltyThreshold', parseInt(e.target.value))} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Buying Freq ({Math.round((b.buyingFrequency || 0.15) * 100)}%/week)</label>
                                <input type="range" min={0} max={80} value={Math.round((b.buyingFrequency || 0.15) * 100)}
                                    onChange={e => setBeh('buyingFrequency', parseInt(e.target.value) / 100)} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Sell Pressure ({Math.round((b.sellPressure || 0.10) * 100)}%/week)</label>
                                <input type="range" min={0} max={80} value={Math.round((b.sellPressure || 0.10) * 100)}
                                    onChange={e => setBeh('sellPressure', parseInt(e.target.value) / 100)} style={{ width: '100%' }} />
                            </div>
                        </div>

                        <label style={labelStyle}>Price Anchor</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {ANCHORS.map(a => (
                                <button key={a} onClick={() => setBeh('priceAnchor', a)} style={{
                                    ...miniBtn, padding: '5px 14px',
                                    background: b.priceAnchor === a ? 'rgba(34,211,238,0.15)' : 'transparent',
                                    borderColor: b.priceAnchor === a ? '#22d3ee' : '#333',
                                    color: b.priceAnchor === a ? '#22d3ee' : '#666',
                                }}>{a.replace(/_/g, ' ')}</button>
                            ))}
                        </div>

                        <label style={labelStyle}>Temperament</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {TEMPS.map(t => (
                                <button key={t} onClick={() => setBeh('temperament', t)} style={{
                                    ...miniBtn, padding: '5px 14px',
                                    background: b.temperament === t ? 'rgba(34,211,238,0.15)' : 'transparent',
                                    borderColor: b.temperament === t ? '#22d3ee' : '#333',
                                    color: b.temperament === t ? '#22d3ee' : '#666',
                                }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                            ))}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════
// Main NPCEditor Component
// ═══════════════════════════════════════════════════════════
export default function NPCEditor() {
    const contacts = useNPCStore(s => s.contacts);
    const markDirty = useCmsStore(s => s.markDirty);
    const [selectedId, setSelectedId] = useState(null);
    const [activeTab, setActiveTab] = useState('identity');
    const [notification, setNotification] = useState(null);
    const [search, setSearch] = useState('');

    const allNpcs = useMemo(() =>
        [...contacts].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        [contacts]);

    const filteredNpcs = useMemo(() => {
        if (!search) return allNpcs;
        const q = search.toLowerCase();
        return allNpcs.filter(n =>
            (n.name || '').toLowerCase().includes(q) ||
            (n.role || '').toLowerCase().includes(q) ||
            (n.id || '').toLowerCase().includes(q)
        );
    }, [allNpcs, search]);

    const selected = allNpcs.find(n => n.id === selectedId);

    const showNotif = useCallback((msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    }, []);

    const handleSelect = (id) => setSelectedId(id);

    const handleFieldEdit = useCallback((field, value) => {
        if (!selectedId) return;
        useNPCStore.setState(state => {
            const idx = state.contacts.findIndex(n => n.id === selectedId);
            if (idx >= 0) {
                state.contacts[idx] = { ...state.contacts[idx], [field]: value };
            }
        });
        markDirty?.('npcs');
    }, [selectedId, markDirty]);

    const importRef = useRef(null);

    const handleExport = async () => {
        try {
            await ContentExporter.download('npcs', 'artlife_npcs.json');
            showNotif('📥 Exported all NPCs with schema annotations');
        } catch (err) {
            showNotif('❌ Export failed: ' + err.message);
        }
    };

    const handleExportSingle = async () => {
        if (!selectedId) return;
        try {
            const data = await ContentExporter.exportNPC(selectedId);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `artlife_npc_${selectedId}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showNotif(`📥 Exported ${selected?.name || selectedId}`);
        } catch (err) {
            showNotif('❌ Export failed: ' + err.message);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const result = await ContentImporter.importFile(file);
            if (!result.valid) {
                showNotif('❌ Import errors: ' + result.errors.join(', '));
                return;
            }
            const items = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
            useNPCStore.setState(state => {
                items.forEach(item => {
                    const idx = state.contacts.findIndex(n => n.id === item.id);
                    if (idx >= 0) state.contacts[idx] = { ...state.contacts[idx], ...item };
                    else state.contacts.push(item);
                });
            });
            markDirty?.('npcs');
            showNotif(`✅ Imported ${items.length} NPC(s)` + (result.warnings.length > 0 ? ` (${result.warnings.length} warnings)` : ''));
        } catch (err) {
            showNotif('❌ Import failed: ' + err.message);
        }
        e.target.value = '';
    };

    const handleAddNPC = () => {
        const id = `npc_${Date.now()}`;
        useNPCStore.setState(state => {
            state.contacts.push({
                id, name: 'New NPC', role: 'dealer', title: '', emoji: '👤',
                favor: 0, met: false, traits: [], personality: '', greetings: [],
                schedule: [], memory: { witnessed: [], grudges: [], favors: [], lastContact: 0 },
            });
        });
        setSelectedId(id);
        markDirty?.('npcs');
        showNotif('✨ Created new NPC');
    };

    // Role color mapping
    const roleColor = (role) => {
        const colors = {
            dealer: '#c9a84c', gallerist: '#60a5fa', auction: '#a78bfa', artist: '#4ade80',
            collector: '#f87171', advisor: '#fb923c', speculator: '#e879f9', mega_dealer: '#fbbf24',
            young_hustler: '#22d3ee', institutional: '#94a3b8',
        };
        return colors[role] || '#666';
    };

    // Count stats
    const stats = useMemo(() => {
        const counts = {};
        allNpcs.forEach(n => { counts[n.role] = (counts[n.role] || 0) + 1; });
        return counts;
    }, [allNpcs]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px', background: '#111', borderBottom: '1px solid #333',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ color: '#c9a84c', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 }}>
                        👥 {allNpcs.length} NPCs
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {Object.entries(stats).slice(0, 5).map(([role, count]) => (
                            <span key={role} style={{
                                fontSize: 9, padding: '2px 6px', borderRadius: 3,
                                background: `${roleColor(role)}15`, color: roleColor(role), border: `1px solid ${roleColor(role)}33`,
                            }}>{role} {count}</span>
                        ))}
                    </div>
                    {notification && <span style={{ color: '#4caf50', fontSize: 11 }}>{notification}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleAddNPC} style={{ ...miniBtn, borderColor: '#4ade80', color: '#4ade80' }}>+ New NPC</button>
                    {selected && <button onClick={handleExportSingle} style={{ ...miniBtn, borderColor: '#e879f9', color: '#e879f9' }}>📤 Export NPC</button>}
                    <button onClick={handleExport} style={miniBtn}>📥 Export All</button>
                    <button onClick={() => importRef.current?.click()} style={{ ...miniBtn, borderColor: '#60a5fa', color: '#60a5fa' }}>📂 Import</button>
                    <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                </div>
            </div>

            {/* Main layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left: NPC List */}
                <div style={{
                    width: 260, minWidth: 260, borderRight: '1px solid #333',
                    background: '#0a0a0f', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    {/* Search */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #222' }}>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search NPCs..." style={{ ...inputStyle, fontSize: 11 }} />
                    </div>

                    {/* List */}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {filteredNpcs.length === 0 && (
                            <div style={{ color: '#555', padding: 16, textAlign: 'center', fontSize: 11 }}>
                                {search ? 'No matches' : 'No NPCs loaded. Initialize game state.'}
                            </div>
                        )}
                        {filteredNpcs.map(npc => {
                            const contactData = CONTACTS.find(c => c.id === npc.id);
                            return (
                                <div key={npc.id} onClick={() => handleSelect(npc.id)} style={{
                                    padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #1a1a2e',
                                    background: selectedId === npc.id ? 'rgba(201,168,76,0.08)' : 'transparent',
                                    borderLeft: selectedId === npc.id ? '3px solid #c9a84c' : '3px solid transparent',
                                    transition: 'background 0.1s',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 16 }}>{npc.emoji || contactData?.emoji || '👤'}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 12, fontWeight: 'bold',
                                                color: selectedId === npc.id ? '#c9a84c' : '#eaeaea',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>{npc.name}</div>
                                            <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
                                                <span style={{ color: roleColor(npc.role), marginRight: 6 }}>{(npc.role || 'unknown').replace('_', ' ')}</span>
                                                {npc.met && <span style={{ color: '#4ade80' }}>✓ met</span>}
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: 10, fontWeight: 'bold', width: 28, textAlign: 'right',
                                            color: (npc.favor || 0) > 0 ? '#4ade80' : (npc.favor || 0) < 0 ? '#f87171' : '#555',
                                        }}>{npc.favor || 0}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Detail Panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {!selected ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 14 }}>
                            Select an NPC to manage
                        </div>
                    ) : (
                        <>
                            {/* Tab Bar */}
                            <div style={{
                                display: 'flex', borderBottom: '1px solid #333', background: '#0a0a0f',
                                padding: '0 12px', overflow: 'auto',
                            }}>
                                {TABS.map(tab => (
                                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                                        background: 'transparent', border: 'none', borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
                                        color: activeTab === tab.key ? tab.color : '#666',
                                        padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                                        transition: 'all 0.1s', whiteSpace: 'nowrap',
                                    }}>{tab.label}</button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                                {activeTab === 'identity' && <IdentityTab npc={selected} onEdit={handleFieldEdit} />}
                                {activeTab === 'visuals' && <VisualsTab npc={selected} onEdit={handleFieldEdit} />}
                                {activeTab === 'schedule' && <ScheduleTab npc={selected} onEdit={handleFieldEdit} />}
                                {activeTab === 'dialogue' && <DialogueTab npc={selected} onEdit={handleFieldEdit} />}
                                {activeTab === 'relationships' && <RelationshipsTab npc={selected} allNpcs={allNpcs} onEdit={handleFieldEdit} />}
                                {activeTab === 'overworld' && <OverworldTab npc={selected} onEdit={handleFieldEdit} />}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
