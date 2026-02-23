import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EventRegistry } from '../../managers/EventRegistry.js';
import { useStorylineStore } from '../../stores/storylineStore.js';
import { useCmsStore } from '../../stores/cmsStore.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { CONTACTS } from '../../data/contacts.js';
import { ContentExporter } from '../../utils/ContentExporter.js';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Handle, Position, MarkerType, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function StorylineEditor() {
    const [storylines, setStorylines] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [editingStep, setEditingStep] = useState(null); // { stepIdx }
    const [jsonEdit, setJsonEdit] = useState('');
    const [notification, setNotification] = useState(null);

    const active = useStorylineStore((s) => s.activeStorylines);
    const completed = useStorylineStore((s) => s.completedStorylines);
    const storeStatus = {
        totalActive: (active || []).length,
        totalCompleted: (completed || []).length,
        active: active || [],
        completed: completed || []
    };

    const forceActivate = useStorylineStore((s) => s.forceActivate);

    useEffect(() => {
        // Load from EventRegistry
        const data = EventRegistry.getStorylines();
        setStorylines(data.length > 0 ? JSON.parse(JSON.stringify(data)) : []);
    }, []);

    const selected = storylines.find(s => s.id === selectedId);

    // ── Event existence map ──
    const eventExistsMap = useMemo(() => {
        const events = EventRegistry.jsonEvents || [];
        const map = {};
        for (const sl of storylines) {
            for (const step of (sl.steps || [])) {
                if (step.eventId && !(step.eventId in map)) {
                    const found = events.find(e => e.id === step.eventId);
                    map[step.eventId] = found ? { exists: true, title: found.title || step.eventId, choiceCount: (found.steps || []).filter(s => s.type === 'choice').length } : { exists: false };
                }
            }
        }
        return map;
    }, [storylines]);

    const healthSummary = useMemo(() => {
        let total = 0, existing = 0, missing = 0;
        for (const sl of storylines) {
            for (const step of (sl.steps || [])) {
                total++;
                const info = eventExistsMap[step.eventId];
                if (info?.exists) existing++; else missing++;
            }
        }
        return { total, existing, missing };
    }, [storylines, eventExistsMap]);

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
            useCmsStore.getState().markDirty('storylines');
            showNotif('🔥 Hot-swapped storylines into memory');
        } catch (e) {
            showNotif('❌ Invalid JSON: ' + e.message);
        }
    };

    const handleStorylineUpdate = useCallback((storylineId, field, value) => {
        setStorylines(prev => {
            const updated = [...prev];
            const sl = updated.find(s => s.id === storylineId);
            if (sl) {
                sl[field] = value;
                EventRegistry.jsonStorylines = updated;
                useCmsStore.getState().markDirty('storylines');
                if (selectedId === storylineId) setJsonEdit(JSON.stringify(sl, null, 4));
            }
            return updated;
        });
    }, [selectedId]);

    const handleStepEdit = (field, value) => {
        if (!editingStep) return;
        const updated = [...storylines];
        const sl = updated.find(s => s.id === selectedId);
        if (sl && sl.steps[editingStep.stepIdx]) {
            sl.steps[editingStep.stepIdx][field] = value;
            setStorylines(updated);
            EventRegistry.jsonStorylines = updated;
            useCmsStore.getState().markDirty('storylines');
        }
    };

    const handleAddStep = () => {
        if (!selected) return;
        const newStep = {
            eventId: "new_event_id",
            delayWeeks: 1,
            position: { x: 300, y: 100 }
        };
        handleStorylineUpdate(selected.id, 'steps', [...(selected.steps || []), newStep]);
    };

    const handleAddLinkedStep = (eventId) => {
        if (!selected || !eventId) return;
        const evt = (EventRegistry.jsonEvents || []).find(e => e.id === eventId);
        const newStep = {
            eventId,
            delayWeeks: 1,
            stepType: 'event_ref',
            position: { x: 300, y: 100 },
        };
        handleStorylineUpdate(selected.id, 'steps', [...(selected.steps || []), newStep]);
        showNotif(`🔗 Linked event: ${evt?.title || eventId}`);
    };

    const handleTestStoryline = () => {
        if (!selected || !selected.steps?.length) return;
        const firstStep = selected.steps[0];
        if (!firstStep.eventId || firstStep.eventId === 'new_event_id') {
            showNotif('❌ First step has no valid event ID');
            return;
        }
        GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'DialogueScene', {
            eventId: firstStep.eventId,
            returnScene: 'MainMenuScene',
            returnArgs: {},
        });
        showNotif(`▶ Testing first step: ${firstStep.eventId}`);
    };

    const [showEventPicker, setShowEventPicker] = useState(false);
    const availableEvents = useMemo(() => EventRegistry.jsonEvents || [], []);

    // ── Styles ──
    const panel = {
        background: 'rgba(10, 10, 15, 0.95)',
        border: '1px solid #2a2a3e',
        padding: 16,
        overflow: 'auto',
        fontFamily: 'inherit',
        fontSize: 12,
        color: '#eaeaea',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
    };

    const btnStyle = {
        background: 'transparent',
        border: '1px solid #444',
        color: '#aaa',
        padding: '4px 12px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 11,
        textTransform: 'uppercase',
    };

    const nodeStyle = (borderColor) => ({
        padding: '10px 14px',
        border: `1px dashed ${borderColor}`,
        background: 'rgba(255,255,255,0.03)',
        marginBottom: 2,
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px', background: '#111', borderBottom: '1px solid #333',
                fontSize: 12, color: '#c9a84c'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <strong>{storylines.length} chains</strong>
                    <span style={{ color: '#4caf50' }}>● {storeStatus.totalActive} active</span>
                    <span style={{ color: '#666' }}>● {storeStatus.totalCompleted} completed</span>
                    <span style={{ color: healthSummary.missing > 0 ? '#f87171' : '#4caf50', fontSize: 10, padding: '2px 8px', border: `1px solid ${healthSummary.missing > 0 ? '#f87171' : '#4caf50'}`, borderRadius: 3 }}>
                        {healthSummary.missing > 0 ? `⚠️ ${healthSummary.missing} missing events` : `✅ ${healthSummary.existing}/${healthSummary.total} events linked`}
                    </span>
                    {notification && <span style={{ color: '#4caf50' }}>{notification}</span>}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleDownload} style={btnStyle}>📥 Export JSON</button>
                    <button style={btnStyle}>➕ New Storyline</button>
                </div>
            </div>

            {/* Three-pane layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 10, gap: 10 }}>
                {/* Panel 1: List */}
                <div style={{ ...panel, flex: '0 0 260px' }}>
                    <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>
                        ALL STORYLINES
                    </div>
                    {storylines.map((sl) => {
                        const isActive = storeStatus.active.some(a => a.id === sl.id);
                        const isCompleted = storeStatus.completed.includes(sl.id);
                        const activeEntry = storeStatus.active.find(a => a.id === sl.id);
                        const stepsOk = (sl.steps || []).filter(s => eventExistsMap[s.eventId]?.exists).length;
                        const stepsTotal = (sl.steps || []).length;
                        const allOk = stepsOk === stepsTotal;
                        const progress = activeEntry ? ((activeEntry.currentStep + 1) / stepsTotal) * 100 : 0;
                        return (
                            <div key={sl.id}
                                onClick={() => { setSelectedId(sl.id); setEditingStep(null); }}
                                style={{
                                    padding: '10px 12px',
                                    marginBottom: 4,
                                    cursor: 'pointer',
                                    background: selectedId === sl.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                                    borderLeft: selectedId === sl.id ? '3px solid #c9a84c' : '3px solid transparent',
                                    transition: 'all 0.15s',
                                }}>
                                <div style={{ fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {sl.title}
                                    {isActive && <span style={{ color: '#4caf50', fontSize: 10, padding: '1px 4px', background: 'rgba(76,175,80,0.15)', borderRadius: 3 }}>ACTIVE</span>}
                                    {isCompleted && <span style={{ color: '#666', fontSize: 10, padding: '1px 4px', background: 'rgba(100,100,100,0.15)', borderRadius: 3 }}>DONE</span>}
                                </div>
                                <div style={{ fontSize: 10, color: '#888', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>{sl.npcId || 'None'}</span>
                                    <span>·</span>
                                    <span style={{ color: allOk ? '#4caf50' : '#f87171' }}>
                                        {allOk ? '✅' : '⚠️'} {stepsOk}/{stepsTotal} events
                                    </span>
                                </div>
                                {/* Progress bar for active storylines */}
                                {isActive && (
                                    <div style={{ marginTop: 6, height: 3, background: '#222', borderRadius: 2 }}>
                                        <div style={{ width: `${progress}%`, height: '100%', background: '#c9a84c', borderRadius: 2, transition: 'width 0.3s' }} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Panel 2: Timeline Visualizer */}
                <div style={panel}>
                    {!selected ? (
                        <div style={{ color: '#666', textAlign: 'center', marginTop: 60 }}>
                            Select a storyline to view its timeline
                        </div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#c9a84c' }}>{selected.title}</div>
                                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{selected.description}</div>
                                <div style={{ marginTop: 8 }}>
                                    <button onClick={() => handleTestFire(selected)} style={{ ...btnStyle, borderColor: '#4caf50', color: '#4caf50' }}>
                                        ▶ Activate
                                    </button>
                                    <button onClick={handleTestStoryline} style={{ ...btnStyle, marginLeft: 8, borderColor: '#60a5fa', color: '#60a5fa' }}>
                                        🎮 Test Scene
                                    </button>
                                    <button onClick={handleAddStep} style={{ ...btnStyle, marginLeft: 8, borderColor: '#88bbdd', color: '#88bbdd' }}>
                                        + Add Step
                                    </button>
                                    <button onClick={() => setShowEventPicker(!showEventPicker)} style={{ ...btnStyle, marginLeft: 8, borderColor: '#c9a84c', color: '#c9a84c' }}>
                                        🔗 Link Event
                                    </button>
                                    {showEventPicker && (
                                        <div style={{ position: 'absolute', top: 40, left: 0, zIndex: 100, background: '#111', border: '1px solid #333', borderRadius: 4, padding: 8, maxHeight: 200, overflow: 'auto', minWidth: 280 }}>
                                            <div style={{ fontSize: 9, color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>Select event to link:</div>
                                            {availableEvents.map(evt => (
                                                <div key={evt.id}
                                                    onClick={() => { handleAddLinkedStep(evt.id); setShowEventPicker(false); }}
                                                    style={{ padding: '6px 8px', cursor: 'pointer', fontSize: 11, color: '#eaeaea', borderBottom: '1px solid #1a1a2e' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.1)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <div>{evt.title || evt.id}</div>
                                                    <div style={{ fontSize: 9, color: '#888' }}>{evt.category} · {evt.nodes?.length || 0} nodes</div>
                                                </div>
                                            ))}
                                            {availableEvents.length === 0 && <div style={{ color: '#666', fontSize: 10 }}>No events found</div>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#050508', border: '1px dashed #333', minHeight: 400 }}>
                                <StorylineGraph
                                    storyline={selected}
                                    onNodeClick={(idx) => setEditingStep({ stepIdx: idx })}
                                    editingStepIdx={editingStep?.stepIdx}
                                    onUpdateStoryline={handleStorylineUpdate}
                                    activeInfo={storeStatus.active.find(a => a.id === selected.id)}
                                />
                            </div>

                            {/* Rewards */}
                            {selected.rewards && (
                                <div style={{ marginTop: 20 }}>
                                    <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>REWARDS ON COMPLETION</div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        {Object.entries(selected.rewards).map(([k, v]) => (
                                            <span key={k} style={{
                                                padding: '4px 8px',
                                                background: 'rgba(76, 175, 80, 0.1)',
                                                border: '1px solid #4caf50',
                                                color: '#4caf50',
                                                fontSize: 11,
                                            }}>+{v} {k}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Panel 3: Step Editor */}
                <div style={{ ...panel, flex: '0 0 300px' }}>
                    {editingStep && selected && selected.steps[editingStep.stepIdx] ? (
                        <StepEditor
                            step={selected.steps[editingStep.stepIdx]}
                            stepIdx={editingStep.stepIdx}
                            onChange={handleStepEdit}
                            onClose={() => setEditingStep(null)}
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 12 }}>
                                RAW JSON EDITOR
                            </div>
                            <textarea
                                value={jsonEdit || JSON.stringify(storylines, null, 2)}
                                onChange={(e) => setJsonEdit(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: '#050508', color: '#4caf50',
                                    border: '1px solid #333',
                                    fontFamily: 'inherit', fontSize: 11,
                                    padding: 8, resize: 'none',
                                    outline: 'none'
                                }}
                            />
                            <button onClick={handleHotSwap} style={{ ...btnStyle, marginTop: 8, width: '100%', borderColor: '#c9a84c', color: '#c9a84c' }}>
                                🔥 Hot-Swap Into Memory
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StepEditor({ step, stepIdx, onChange, onClose }) {
    const labelStyle = {
        display: 'block',
        color: '#888',
        fontSize: 10,
        textTransform: 'uppercase',
        marginTop: 12,
        marginBottom: 4,
        letterSpacing: 1,
    };

    const inputStyle = {
        width: '100%',
        background: '#050508',
        color: '#eaeaea',
        border: '1px solid #444',
        fontFamily: 'inherit',
        fontSize: 11,
        padding: '6px 8px',
        outline: 'none',
        boxSizing: 'border-box'
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 'bold' }}>
                    EDITING STEP {stepIdx}
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✕</button>
            </div>

            <label style={labelStyle}>Step Type</label>
            <select
                value={step.stepType || 'event_ref'}
                onChange={(e) => onChange('stepType', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="event_ref">🔗 Event Reference</option>
                <option value="inline">📝 Inline Step</option>
            </select>

            <label style={labelStyle}>Event ID (Target)</label>
            <select
                value={step.eventId || ''}
                onChange={(e) => onChange('eventId', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">— Select Event —</option>
                {(EventRegistry.jsonEvents || []).map(evt => (
                    <option key={evt.id} value={evt.id}>{evt.title || evt.id} ({evt.category})</option>
                ))}
            </select>
            <input
                value={step.eventId || ''}
                onChange={(e) => onChange('eventId', e.target.value)}
                placeholder="Or type custom ID..."
                style={{ ...inputStyle, marginTop: 4, fontSize: 10, color: '#888' }}
            />

            <label style={labelStyle}>Delay (weeks)</label>
            <input
                type="number"
                value={step.delayWeeks || ''}
                onChange={(e) => onChange('delayWeeks', parseInt(e.target.value) || 0)}
                style={inputStyle}
            />

            <label style={labelStyle}>Requirements (JSON)</label>
            <textarea
                value={JSON.stringify(step.requirements || {}, null, 2)}
                onChange={(e) => {
                    try {
                        onChange('requirements', JSON.parse(e.target.value));
                    } catch (_) { /* invalid JSON, ignore while typing */ }
                }}
                style={{ ...inputStyle, height: 120, resize: 'vertical' }}
            />

            <div style={{ marginTop: 20, color: '#666', fontSize: 10 }}>
                Modifying steps will instantly update the in-memory state. To save permanently, export JSON and replace `storylines.json`.
            </div>
        </div>
    );
}

// ── Custom React Flow Nodes ──

const TriggerNode = ({ data }) => {
    return (
        <div style={{
            width: 200, padding: '10px 14px',
            border: `1px dashed #c94040`, background: '#111',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)', borderRadius: 4
        }}>
            <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>TRIGGER</div>
            <div style={{ fontWeight: 'bold', color: '#eaeaea', fontSize: 11 }}>Event: {data.triggerEventId}</div>
            <div style={{ fontSize: 10, color: '#888' }}>Choice: {data.triggerChoiceIndex}</div>
            <Handle type="source" position={Position.Bottom} style={{ background: '#c94040' }} />
        </div>
    );
};

const StoryStepNode = ({ data }) => {
    const { step, isCurrent, isPast, isSelected, eventTitle, eventExists, choiceCount, availableEvents, onLinkEvent } = data;
    const missing = eventExists === false;
    const borderColor = missing ? '#f87171' : isCurrent ? '#4caf50' : isPast ? '#666' : '#c9a84c';
    return (
        <div style={{
            width: 220, padding: '10px 14px',
            border: `${isSelected ? 'solid' : 'dashed'} 1px ${borderColor}`,
            background: missing ? 'rgba(248,113,113,0.05)' : '#1a1a2e',
            opacity: isPast ? 0.5 : 1,
            boxShadow: isSelected ? '0 0 0 2px rgba(255,255,255,0.2)' : '0 4px 6px rgba(0,0,0,0.3)',
            borderRadius: 4,
            display: 'flex', flexDirection: 'column'
        }}>
            <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
            <div style={{ fontWeight: 'bold', color: missing ? '#f87171' : '#fff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                {isCurrent && '▶ '}{missing && '⚠️ '}{step.eventId}
            </div>
            {missing && (
                <div style={{ fontSize: 9, color: '#f87171', marginTop: 2, fontWeight: 'bold' }}>
                    EVENT NOT FOUND
                </div>
            )}
            {eventTitle && eventTitle !== step.eventId && !missing && (
                <div style={{ fontSize: 10, color: '#88bbdd', marginTop: 2, fontStyle: 'italic' }}>
                    “{eventTitle}”
                    {choiceCount > 0 && <span style={{ color: '#666', marginLeft: 4 }}>({choiceCount} choices)</span>}
                </div>
            )}
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>
                Delay: {step.delayWeeks || 0}w
                {step.description && <div style={{ color: '#777', marginTop: 2, fontStyle: 'italic' }}>{step.description}</div>}
                {Object.keys(step.requirements || {}).length > 0 && (
                    <div style={{ color: '#88bbdd', marginTop: 2 }}>Req: {Object.entries(step.requirements).map(([k, v]) => `${k}≥${v}`).join(', ')}</div>
                )}
            </div>
            {isSelected && availableEvents && (
                <div style={{ marginTop: 6, borderTop: '1px solid #333', paddingTop: 6 }}>
                    <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 3 }}>Link Event:</div>
                    <select
                        value={step.eventId || ''}
                        onChange={(e) => onLinkEvent?.(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%', padding: '3px 4px', background: '#111', color: '#c9a84c',
                            border: '1px solid #444', fontFamily: 'inherit', fontSize: 10,
                            cursor: 'pointer',
                        }}
                    >
                        <option value="">-- select event --</option>
                        {availableEvents.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.id} — {ev.title || 'untitled'}</option>
                        ))}
                    </select>
                </div>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: '#c9a84c' }} />
        </div>
    );
};

const nodeTypes = {
    triggerNode: TriggerNode,
    storyStepNode: StoryStepNode
};

function StorylineGraphWrapper({ storyline, onNodeClick, editingStepIdx, onUpdateStoryline, activeInfo }) {
    if (!storyline) return null;

    // Get available events for the linking dropdown
    const availableEvents = useMemo(() => EventRegistry.jsonEvents || [], []);

    const handleLinkEvent = useCallback((stepIdx, newEventId) => {
        const updatedSteps = [...(storyline.steps || [])];
        if (updatedSteps[stepIdx]) {
            updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], eventId: newEventId };
            onUpdateStoryline(storyline.id, 'steps', updatedSteps);
        }
    }, [storyline, onUpdateStoryline]);

    const initialNodes = [];
    const initialEdges = [];

    // Trigger Node
    initialNodes.push({
        id: 'trigger',
        type: 'triggerNode',
        position: storyline.triggerPosition || { x: 250, y: 50 },
        data: { triggerEventId: storyline.triggerEventId, triggerChoiceIndex: storyline.triggerChoiceIndex },
        draggable: true,
    });

    if (storyline.steps && storyline.steps.length > 0) {
        initialEdges.push({
            id: `e-trigger-0`,
            source: 'trigger',
            target: '0',
            animated: true,
            style: { stroke: '#c94040', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#c94040' },
        });

        storyline.steps.forEach((step, idx) => {
            const isCurrent = activeInfo && activeInfo.currentStep === idx;
            const isPast = activeInfo && activeInfo.currentStep > idx;
            const eventDef = availableEvents.find(e => e.id === step.eventId);

            initialNodes.push({
                id: String(idx),
                type: 'storyStepNode',
                position: step.position || { x: 250, y: 180 + idx * 130 },
                data: {
                    step, isCurrent, isPast,
                    isSelected: editingStepIdx === idx,
                    eventTitle: eventDef?.title || null,
                    eventExists: !!eventDef,
                    choiceCount: eventDef ? (eventDef.steps || []).filter(s => s.type === 'choice').length : 0,
                    availableEvents: editingStepIdx === idx ? availableEvents : null,
                    onLinkEvent: (newId) => handleLinkEvent(idx, newId),
                },
                draggable: true,
            });

            if (idx < storyline.steps.length - 1) {
                const nextStep = storyline.steps[idx + 1];
                initialEdges.push({
                    id: `e${idx}-${idx + 1}`,
                    source: String(idx),
                    target: String(idx + 1),
                    label: `+${nextStep.delayWeeks || 0}w`,
                    labelStyle: { fill: '#aaa', fontSize: 10 },
                    labelBgStyle: { fill: '#111', color: '#111', fillOpacity: 0.8 },
                    style: { stroke: '#888', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#888' },
                });
            }
        });
    }

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useEffect(() => {
        setNodes(nds => {
            const newNodes = [];
            newNodes.push({
                id: 'trigger',
                type: 'triggerNode',
                position: nds.find(n => n.id === 'trigger')?.position || storyline.triggerPosition || { x: 250, y: 50 },
                data: { triggerEventId: storyline.triggerEventId, triggerChoiceIndex: storyline.triggerChoiceIndex },
                draggable: true,
            });
            if (storyline.steps) {
                storyline.steps.forEach((step, idx) => {
                    const existing = nds.find(n => n.id === String(idx));
                    const isCurrent = activeInfo && activeInfo.currentStep === idx;
                    const isPast = activeInfo && activeInfo.currentStep > idx;
                    const eventDef = availableEvents.find(e => e.id === step.eventId);
                    newNodes.push({
                        id: String(idx),
                        type: 'storyStepNode',
                        position: existing?.position || step.position || { x: 250, y: 180 + idx * 130 },
                        data: {
                            step, isCurrent, isPast,
                            isSelected: editingStepIdx === idx,
                            eventTitle: eventDef?.title || null,
                            availableEvents: editingStepIdx === idx ? availableEvents : null,
                            onLinkEvent: (newId) => handleLinkEvent(idx, newId),
                        },
                        draggable: true,
                    });
                });
            }
            return newNodes;
        });
        setEdges(initialEdges);
    }, [storyline.id, editingStepIdx, JSON.stringify(storyline.steps?.map(s => ({ ...s, position: undefined }))), activeInfo]);

    const handleNodesChange = useCallback((changes) => {
        onNodesChange(changes);
        const dragged = changes.filter(c => c.type === 'position' && c.dragging === false);
        if (dragged.length > 0) {
            let updatedSteps = storyline.steps ? [...storyline.steps] : [];
            let triggerPos = storyline.triggerPosition;

            dragged.forEach(c => {
                if (c.id === 'trigger') {
                    triggerPos = c.position;
                } else {
                    const idx = parseInt(c.id);
                    if (updatedSteps[idx]) {
                        updatedSteps[idx].position = c.position;
                    }
                }
            });

            if (triggerPos !== storyline.triggerPosition) {
                onUpdateStoryline(storyline.id, 'triggerPosition', triggerPos);
            }
            onUpdateStoryline(storyline.id, 'steps', updatedSteps);
        }
    }, [storyline, onNodesChange, onUpdateStoryline]);

    // Handle new edge connections — rewire step ordering
    const onConnect = useCallback((params) => {
        const { source, target } = params;
        if (source === 'trigger') return; // Can't rewire the trigger
        const sourceIdx = parseInt(source);
        const targetIdx = parseInt(target);
        if (isNaN(sourceIdx) || isNaN(targetIdx)) return;

        // For now, just add the visual edge — step reordering is complex
        setEdges(eds => addEdge({
            ...params,
            style: { stroke: '#c9a84c', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#c9a84c' },
            animated: true,
        }, eds));

        console.log(`[StorylineEditor] Connected step ${sourceIdx} → step ${targetIdx}`);
    }, [setEdges]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => {
                if (node.id !== 'trigger') onNodeClick(parseInt(node.id));
            }}
            fitView
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
            maxZoom={2}
            defaultEdgeOptions={{ type: 'smoothstep' }}
        >
            <Background color="#333" gap={20} />
            <Controls style={{ fill: '#888', background: '#111' }} />
        </ReactFlow>
    );
}

export function StorylineGraph({ storyline, onNodeClick, editingStepIdx, onUpdateStoryline, activeInfo }) {
    return (
        <ReactFlowProvider>
            <StorylineGraphWrapper storyline={storyline} onNodeClick={onNodeClick} editingStepIdx={editingStepIdx} onUpdateStoryline={onUpdateStoryline} activeInfo={activeInfo} />
        </ReactFlowProvider>
    );
}
