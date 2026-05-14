import React, { useState, useEffect, useCallback } from 'react';
import { SettingsManager } from '../../managers/SettingsManager.js';
import { WebAudioService } from '../../managers/WebAudioService.js';

/**
 * SettingsOverlay — Auto-generated from SettingsManager.SCHEMA
 * 
 * Renders all non-hidden settings grouped by section.
 * Supports: cycle, range, boolean, checklist types.
 * Persists immediately via SettingsManager.set().
 */

// ── Styles ──
const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 999999,
    background: 'rgba(6, 6, 8, 0.97)', color: '#eaeaea',
    fontFamily: '"IBM Plex Mono", "Courier New", monospace',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '40px 20px', overflowY: 'auto',
};

const btnStyle = {
    background: '#111', color: '#c9a84c', border: '1px solid #c9a84c44',
    padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
    textAlign: 'left', width: '100%', marginBottom: 8,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    transition: 'border-color 0.15s',
};

const sectionLabelStyle = {
    color: '#666', marginTop: 32, marginBottom: 12, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: '0.12em',
    borderBottom: '1px solid #1a1a25', paddingBottom: 6,
};

// ── Setting Row Components ──

function CycleSetting({ def, value, onChange }) {
    const option = def.options.find(o => o.value === value);
    return (
        <button style={btnStyle} onClick={() => {
            const idx = def.options.findIndex(o => o.value === value);
            const next = def.options[(idx + 1) % def.options.length];
            onChange(next.value);
        }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#c9a84c44'}>
            <span>{def.label}</span>
            <span style={{ color: '#fff', fontSize: 12 }}>[{option?.display || value}]</span>
        </button>
    );
}

function RangeSetting({ def, value, onChange }) {
    return (
        <div style={{ ...btnStyle, cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{def.label}</span>
                <span style={{ color: '#fff', fontSize: 12, fontFamily: 'monospace' }}>{value}%</span>
            </div>
            <input type="range" min={def.min ?? 0} max={def.max ?? 100} step={def.step ?? 1}
                value={value} onChange={e => onChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#c9a84c', cursor: 'pointer' }} />
        </div>
    );
}

function BoolSetting({ def, value, onChange }) {
    return (
        <button style={btnStyle} onClick={() => onChange(!value)}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#c9a84c44'}>
            <span>{def.label}</span>
            <span style={{ color: value ? '#4ade80' : '#666', fontSize: 12 }}>
                [{value ? 'ON' : 'OFF'}]
            </span>
        </button>
    );
}

function ChecklistSetting({ def, value, onChange }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div style={{ marginBottom: 8 }}>
            <button style={btnStyle} onClick={() => setExpanded(!expanded)}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#c9a84c44'}>
                <span>{def.label}</span>
                <span style={{ color: '#888', fontSize: 11 }}>{value.length}/{def.options.length} {expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
                <div style={{ background: '#0a0a0f', border: '1px solid #1a1a25', padding: 10, marginTop: -4 }}>
                    {/* Presets */}
                    {def.presets && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                            {Object.keys(def.presets).map(name => (
                                <button key={name} onClick={() => onChange([...def.presets[name]])}
                                    style={{ background: 'none', border: '1px solid #333', color: '#888', padding: '3px 8px', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.05em' }}>
                                    {name.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Items */}
                    {def.options.map(opt => {
                        const isActive = value.includes(opt.value);
                        return (
                            <div key={opt.value} onClick={() => {
                                const next = isActive ? value.filter(v => v !== opt.value) : [...value, opt.value];
                                onChange(next);
                            }}
                                style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', cursor: 'pointer', fontSize: 11, color: isActive ? '#ccc' : '#555', borderBottom: '1px solid #111' }}>
                                <span>{opt.display}</span>
                                <span style={{ color: isActive ? '#4ade80' : '#333' }}>{isActive ? '●' : '○'}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Main Component ──

export default function SettingsOverlay({ onClose }) {
    const [settings, setSettings] = useState({});
    const [version] = useState(0); // force re-read

    // Load all settings from SettingsManager
    useEffect(() => {
        const s = {};
        SettingsManager.SCHEMA.forEach(def => {
            s[def.id] = SettingsManager.get(def.id);
        });
        setSettings(s);
    }, [version]);

    // ESC key handler
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') { WebAudioService.select?.(); onClose(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const updateSetting = useCallback((key, value) => {
        SettingsManager.set(key, value);
        setSettings(prev => ({ ...prev, [key]: value }));
        WebAudioService.select?.();
    }, []);

    // Get visible schema items
    const visibleSchema = SettingsManager.SCHEMA.filter(s => !s.hidden);

    // Group by section
    const sections = {};
    visibleSchema.forEach(def => {
        const sec = def.section || (def.type === 'range' ? 'audio' :
            ['introStyle', 'dialogueStyle', 'textSpeed'].includes(def.id) ? 'gameplay' : 'display');
        if (!sections[sec]) sections[sec] = [];
        sections[sec].push(def);
    });

    const sectionOrder = ['display', 'gameplay', 'navigation', 'audio'];
    const sectionLabels = { display: 'Display', gameplay: 'Gameplay', navigation: 'Navigation', audio: 'Audio' };

    return (
        <div style={overlayStyle}>
            <div style={{ width: '100%', maxWidth: 600 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px dashed #333', paddingBottom: 15 }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#c9a84c', letterSpacing: 2, fontSize: 22 }}>[ SYSTEM SETTINGS ]</h2>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 5 }}>CONFIGURATION & PREFERENCES</div>
                    </div>
                    <button onClick={() => { WebAudioService.select?.(); onClose(); }}
                        style={{ ...btnStyle, width: 'auto', marginBottom: 0, padding: '8px 16px' }}>
                        [ ESC ] CLOSE
                    </button>
                </div>

                {/* Auto-generated settings */}
                {sectionOrder.filter(s => sections[s]).map(sec => (
                    <div key={sec}>
                        <div style={sectionLabelStyle}>{sectionLabels[sec] || sec}</div>
                        {sections[sec].map(def => {
                            const val = settings[def.id];
                            if (val === undefined) return null;
                            switch (def.type) {
                                case 'cycle': return <CycleSetting key={def.id} def={def} value={val} onChange={v => updateSetting(def.id, v)} />;
                                case 'range': return <RangeSetting key={def.id} def={def} value={val} onChange={v => updateSetting(def.id, v)} />;
                                case 'boolean': return <BoolSetting key={def.id} def={def} value={val} onChange={v => updateSetting(def.id, v)} />;
                                case 'checklist': return <ChecklistSetting key={def.id} def={def} value={val} onChange={v => updateSetting(def.id, v)} />;
                                default: return null;
                            }
                        })}
                    </div>
                ))}

                {/* Footer */}
                <div style={{ marginTop: 40, borderTop: '1px solid #1a1a25', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => {
                        if (confirm('Reset all settings to defaults?')) {
                            localStorage.removeItem(SettingsManager.SETTINGS_KEY);
                            SettingsManager._cache = null;
                            SettingsManager.init();
                            const s = {};
                            SettingsManager.SCHEMA.forEach(def => { s[def.id] = SettingsManager.get(def.id); });
                            setSettings(s);
                        }
                    }} style={{ background: 'none', border: '1px solid #c9404044', color: '#c94040', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>
                        RESET DEFAULTS
                    </button>
                    <span style={{ fontSize: 9, color: '#333' }}>
                        v1.2.0 · {SettingsManager.SCHEMA.length} settings
                    </span>
                </div>
            </div>
        </div>
    );
}
