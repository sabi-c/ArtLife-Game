import React, { useState, useEffect, useCallback } from 'react';
import { EventRegistry } from '../managers/EventRegistry.js';
import { useStorylineStore } from '../stores/storylineStore.js';

/**
 * StorylineCMS.jsx
 *
 * Full-screen admin overlay for managing storyline chains.
 * Three panels: Storyline List | Timeline Visualizer | Step Editor.
 */
export default function StorylineCMS({ onClose }) {
    const [storylines, setStorylines] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [editingStep, setEditingStep] = useState(null); // { storylineIdx, stepIdx }
    const [jsonEdit, setJsonEdit] = useState('');
    const [notification, setNotification] = useState(null);

    const storeStatus = useStorylineStore((s) => s.getStatusSummary());
    const forceActivate = useStorylineStore((s) => s.forceActivate);

    useEffect(() => {
        // Load from EventRegistry
        const data = EventRegistry.getStorylines();
        setStorylines(data.length > 0 ? JSON.parse(JSON.stringify(data)) : []);
    }, []);

    const selected = storylines.find(s => s.id === selectedId);

    const showNotif = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleTestFire = useCallback((storyline) => {
        forceActivate(storyline.id, storyline);
        showNotif(`✅ Activated "${storyline.title}" — next event in ${storyline.steps[0]?.delayWeeks || 1} weeks`);
    }, [forceActivate]);

    const handleDownload = () => {
        const blob = new Blob([JSON.stringify(storylines, null, 4)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'storylines.json'; a.click();
        URL.revokeObjectURL(url);
        showNotif('📥 Downloaded storylines.json');
    };

    const handleHotSwap = () => {
        try {
            const parsed = JSON.parse(jsonEdit);
            setStorylines(parsed);
            EventRegistry.jsonStorylines = parsed;
            showNotif('🔥 Hot-swapped storylines into memory');
        } catch (e) {
            showNotif('❌ Invalid JSON: ' + e.message);
        }
    };

    const handleStepEdit = (field, value) => {
        if (!editingStep) return;
        const updated = [...storylines];
        const sl = updated.find(s => s.id === selectedId);
        if (sl && sl.steps[editingStep.stepIdx]) {
            sl.steps[editingStep.stepIdx][field] = value;
            setStorylines(updated);
            EventRegistry.jsonStorylines = updated;
        }
    };

    // ── Styles ──
    const panel = {
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        padding: 16,
        overflow: 'auto',
        fontFamily: 'var(--font)',
        fontSize: 12,
        color: 'var(--fg)',
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.92)',
            display: 'grid',
            gridTemplateColumns: '280px 1fr 300px',
            gridTemplateRows: '50px 1fr 40px',
            gap: 2,
        }}>
            {/* ── Header ── */}
            <div style={{
                gridColumn: '1 / -1',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px',
                background: 'var(--highlight-bg)',
                borderBottom: '1px solid var(--border)',
                fontFamily: 'var(--font)',
                color: 'var(--gold)',
                textTransform: 'uppercase',
                letterSpacing: 2,
            }}>
                <span style={{ fontSize: 16, fontWeight: 'bold' }}>
                    STORYLINE CMS <span style={{ color: 'var(--dim)', fontSize: 11 }}>
                        — {storylines.length} chains · {storeStatus.totalActive} active · {storeStatus.totalCompleted} completed
                    </span>
                </span>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleDownload} style={btnStyle}>📥 Export JSON</button>
                    <button onClick={onClose} style={{ ...btnStyle, borderColor: 'var(--red)', color: 'var(--red)' }}>✕ Close</button>
                </div>
            </div>

            {/* ── Panel 1: Storyline List ── */}
            <div style={{ ...panel, gridRow: '2' }}>
                <div style={{ color: 'var(--dim)', fontSize: 10, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>
                    ALL STORYLINES
                </div>
                {storylines.map((sl) => {
                    const isActive = storeStatus.active.some(a => a.id === sl.id);
                    const isCompleted = storeStatus.completed.includes(sl.id);
                    return (
                        <div key={sl.id}
                            onClick={() => { setSelectedId(sl.id); setEditingStep(null); }}
                            style={{
                                padding: '10px 12px',
                                marginBottom: 4,
                                cursor: 'pointer',
                                background: selectedId === sl.id ? 'var(--highlight-bg)' : 'transparent',
                                borderLeft: selectedId === sl.id ? '3px solid var(--gold)' : '3px solid transparent',
                                transition: 'all 0.15s',
                            }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--fg)' }}>
                                {sl.title}
                                {isActive && <span style={{ color: 'var(--green)', marginLeft: 8, fontSize: 10 }}>[ACTIVE]</span>}
                                {isCompleted && <span style={{ color: 'var(--dim)', marginLeft: 8, fontSize: 10 }}>[DONE]</span>}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
                                NPC: {sl.npcId} · {sl.steps.length} steps
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Panel 2: Timeline Visualizer ── */}
            <div style={{ ...panel, gridRow: '2', position: 'relative' }}>
                {!selected ? (
                    <div style={{ color: 'var(--dim)', textAlign: 'center', marginTop: 60 }}>
                        Select a storyline to view its timeline
                    </div>
                ) : (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--gold)' }}>{selected.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{selected.description}</div>
                            <div style={{ marginTop: 8 }}>
                                <button onClick={() => handleTestFire(selected)} style={{ ...btnStyle, borderColor: 'var(--green)', color: 'var(--green)' }}>
                                    ▶ Test Fire
                                </button>
                            </div>
                        </div>

                        {/* Trigger */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ color: 'var(--dim)', fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>TRIGGER</div>
                            <div style={nodeStyle('#c94040')}>
                                <div style={{ fontWeight: 'bold' }}>Event: {selected.triggerEventId}</div>
                                <div style={{ fontSize: 10, color: 'var(--dim)' }}>Choice Index: {selected.triggerChoiceIndex}</div>
                            </div>
                        </div>

                        {/* Steps Timeline */}
                        <div style={{ color: 'var(--dim)', fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>TIMELINE</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {selected.steps.map((step, idx) => {
                                const activeInfo = storeStatus.active.find(a => a.id === selected.id);
                                const isCurrent = activeInfo && activeInfo.currentStep === idx;
                                const isPast = activeInfo && activeInfo.currentStep > idx;
                                return (
                                    <React.Fragment key={idx}>
                                        {/* Delay connector */}
                                        <div style={{
                                            width: 2, height: 24,
                                            background: 'var(--border)',
                                            marginLeft: 20,
                                            position: 'relative',
                                        }}>
                                            <span style={{
                                                position: 'absolute', left: 14, top: 4,
                                                fontSize: 9, color: 'var(--dim)',
                                            }}>+{step.delayWeeks}w</span>
                                        </div>
                                        {/* Step node */}
                                        <div
                                            onClick={() => setEditingStep({ stepIdx: idx })}
                                            style={{
                                                ...nodeStyle(isCurrent ? '#00ff00' : isPast ? 'var(--dim)' : 'var(--gold)'),
                                                cursor: 'pointer',
                                                opacity: isPast ? 0.5 : 1,
                                                borderStyle: editingStep?.stepIdx === idx ? 'solid' : 'dashed',
                                            }}>
                                            <div style={{ fontWeight: 'bold' }}>
                                                {isCurrent && '▶ '}{step.eventId}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--dim)' }}>
                                                Delay: {step.delayWeeks}w
                                                {Object.keys(step.requirements || {}).length > 0 && (
                                                    <> · Req: {Object.entries(step.requirements).map(([k, v]) => `${k}≥${v}`).join(', ')}</>
                                                )}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Rewards */}
                        {selected.rewards && (
                            <div style={{ marginTop: 20 }}>
                                <div style={{ color: 'var(--dim)', fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>REWARDS ON COMPLETION</div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {Object.entries(selected.rewards).map(([k, v]) => (
                                        <span key={k} style={{
                                            padding: '4px 8px',
                                            background: 'var(--highlight-bg)',
                                            border: '1px solid var(--green)',
                                            color: 'var(--green)',
                                            fontSize: 11,
                                        }}>+{v} {k}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Panel 3: Step Editor ── */}
            <div style={{ ...panel, gridRow: '2' }}>
                {editingStep && selected?.steps[editingStep.stepIdx] ? (
                    <StepEditor
                        step={selected.steps[editingStep.stepIdx]}
                        stepIdx={editingStep.stepIdx}
                        onChange={handleStepEdit}
                    />
                ) : (
                    <div>
                        <div style={{ color: 'var(--dim)', fontSize: 10, textTransform: 'uppercase', marginBottom: 12 }}>
                            RAW JSON EDITOR
                        </div>
                        <textarea
                            value={jsonEdit || JSON.stringify(storylines, null, 2)}
                            onChange={(e) => setJsonEdit(e.target.value)}
                            style={{
                                width: '100%', height: 'calc(100% - 60px)',
                                background: '#0a0a0f', color: 'var(--fg)',
                                border: '1px solid var(--border)',
                                fontFamily: 'var(--font)', fontSize: 11,
                                padding: 8, resize: 'none',
                            }}
                        />
                        <button onClick={handleHotSwap} style={{ ...btnStyle, marginTop: 8, width: '100%' }}>
                            🔥 Hot-Swap Into Memory
                        </button>
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div style={{
                gridColumn: '1 / -1',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px',
                background: 'var(--highlight-bg)',
                borderTop: '1px solid var(--border)',
                color: 'var(--dim)', fontSize: 10,
                fontFamily: 'var(--font)',
            }}>
                <span>ESC to close · Click a step to edit · Changes are in-memory only until exported</span>
                {notification && (
                    <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{notification}</span>
                )}
            </div>
        </div>
    );
}

function StepEditor({ step, stepIdx, onChange }) {
    return (
        <div>
            <div style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 'bold', marginBottom: 12 }}>
                EDITING STEP {stepIdx}
            </div>

            <label style={labelStyle}>Event ID</label>
            <input
                value={step.eventId}
                onChange={(e) => onChange('eventId', e.target.value)}
                style={inputStyle}
            />

            <label style={labelStyle}>Delay (weeks)</label>
            <input
                type="number"
                value={step.delayWeeks}
                onChange={(e) => onChange('delayWeeks', parseInt(e.target.value) || 1)}
                style={inputStyle}
            />

            <label style={labelStyle}>Requirements (JSON)</label>
            <textarea
                value={JSON.stringify(step.requirements || {}, null, 2)}
                onChange={(e) => {
                    try {
                        onChange('requirements', JSON.parse(e.target.value));
                    } catch (_) { /* invalid JSON, ignore */ }
                }}
                style={{ ...inputStyle, height: 80, resize: 'vertical' }}
            />
        </div>
    );
}

// ── Shared Styles ──
const btnStyle = {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--dim)',
    padding: '4px 12px',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    fontSize: 11,
    textTransform: 'uppercase',
};

const nodeStyle = (borderColor) => ({
    padding: '10px 14px',
    border: `1px dashed ${borderColor}`,
    background: 'var(--highlight-bg)',
    marginBottom: 2,
});

const labelStyle = {
    display: 'block',
    color: 'var(--dim)',
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: 1,
};

const inputStyle = {
    width: '100%',
    background: '#0a0a0f',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
    fontFamily: 'var(--font)',
    fontSize: 11,
    padding: '6px 8px',
};
