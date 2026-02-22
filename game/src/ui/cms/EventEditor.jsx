import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EventRegistry } from '../../managers/EventRegistry.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Handle, Position, MarkerType, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function EventEditor() {
    const [events, setEvents] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [editingNode, setEditingNode] = useState(null); // { stepIndex: idx }
    const [jsonEdit, setJsonEdit] = useState('');
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        setEvents(EventRegistry.jsonEvents || []);
    }, []);

    const selected = events.find(e => e.id === selectedId);

    const showNotif = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSelect = (id) => {
        setSelectedId(id);
        const ev = events.find(e => e.id === id);
        if (ev) setJsonEdit(JSON.stringify(ev, null, 4));
        setEditingNode(null);
    };

    const handleEventUpdate = (eventId, field, value) => {
        const updated = [...events];
        const ev = updated.find(e => e.id === eventId);
        if (ev) {
            ev[field] = value;
            setEvents(updated);
            EventRegistry.jsonEvents = updated;
            if (selectedId === eventId) setJsonEdit(JSON.stringify(ev, null, 4));
        }
    };

    const handleAddStep = () => {
        if (!selected) return;
        const newStep = {
            type: "dialogue",
            speaker: "System",
            text: "New dialogue step...",
            position: { x: 300, y: 100 }
        };
        handleEventUpdate(selected.id, 'steps', [...(selected.steps || []), newStep]);
    };

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 4));
        const anchor = document.createElement('a');
        anchor.href = dataStr;
        anchor.download = "events.json";
        anchor.click();
        showNotif('📥 Downloaded events.json');
    };

    const handleHotSwap = () => {
        try {
            const parsed = JSON.parse(jsonEdit);
            const updated = events.map(ev => ev.id === parsed.id ? parsed : ev);
            if (!events.find(ev => ev.id === parsed.id)) updated.push(parsed);

            setEvents(updated);
            EventRegistry.jsonEvents = updated;
            showNotif('🔥 Hot-swapped into memory');
        } catch (err) {
            showNotif('❌ JSON Error: ' + err.message);
        }
    };

    const handleTestEvent = () => {
        if (!selectedId) return;
        GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'DialogueScene', { eventId: selectedId });
    };

    const handleNodeEdit = (field, value) => {
        if (!editingNode || !selected) return;
        const updated = [...events];
        const ev = updated.find(e => e.id === selectedId);
        if (ev && ev.steps[editingNode.stepIndex]) {
            ev.steps[editingNode.stepIndex][field] = value;
            setEvents(updated);
            EventRegistry.jsonEvents = updated;
            setJsonEdit(JSON.stringify(ev, null, 4));
        }
    };

    // ── Styles ──
    const panel = {
        background: '#0a0a0f',
        border: '1px solid #333',
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px', background: '#111', borderBottom: '1px solid #333',
                fontSize: 12, color: '#c9a84c'
            }}>
                <div>
                    <strong>{events.length} dialog events</strong>
                    {notification && <span style={{ color: '#4caf50', marginLeft: 16 }}>{notification}</span>}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleDownload} style={btnStyle}>📥 Export JSON</button>
                    <button style={btnStyle}>➕ New Event</button>
                </div>
            </div>

            {/* Three-pane layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 10, gap: 10 }}>
                {/* Panel 1: List */}
                <div style={{ ...panel, flex: '0 0 260px' }}>
                    <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>
                        ALL EVENTS
                    </div>
                    {events.map(ev => (
                        <div key={ev.id} onClick={() => handleSelect(ev.id)} style={{
                            padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #1a1a2e',
                            background: selectedId === ev.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                            borderLeft: selectedId === ev.id ? '3px solid #c9a84c' : '3px solid transparent',
                        }}>
                            <div style={{ fontSize: 13, color: selectedId === ev.id ? '#c9a84c' : '#eaeaea', fontWeight: 'bold' }}>{ev.id}</div>
                            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{ev.category || 'Uncategorized'}</div>
                        </div>
                    ))}
                </div>

                {/* Panel 2: Node Graph */}
                <div style={panel}>
                    {!selected ? (
                        <div style={{ color: '#666', textAlign: 'center', marginTop: 60 }}>
                            Select an event to visualize its dialogue tree.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#c9a84c' }}>{selected.id}</div>
                                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{selected.category}</div>
                                </div>
                                <div>
                                    <button onClick={handleTestEvent} style={{ ...btnStyle, borderColor: '#4caf50', color: '#4caf50' }}>
                                        ▶ Test In-Game
                                    </button>
                                    <button onClick={handleAddStep} style={{ ...btnStyle, marginLeft: 8, borderColor: '#88bbdd', color: '#88bbdd' }}>
                                        + Add Step
                                    </button>
                                </div>
                            </div>

                            <div style={{ flex: 1, position: 'relative', overflow: 'auto', background: '#050508', border: '1px dashed #333' }}>
                                <EventGraphWrapperExport event={selected} onNodeClick={(idx) => setEditingNode({ stepIndex: idx })} editingIdx={editingNode?.stepIndex} onUpdateEvent={handleEventUpdate} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel 3: Step / JSON Editor */}
                <div style={{ ...panel, flex: '0 0 320px' }}>
                    {editingNode && selected && selected.steps[editingNode.stepIndex] ? (
                        <NodeEditor
                            node={selected.steps[editingNode.stepIndex]}
                            idx={editingNode.stepIndex}
                            onChange={handleNodeEdit}
                            onClose={() => setEditingNode(null)}
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', marginBottom: 12 }}>
                                RAW JSON EDITOR
                            </div>
                            <textarea
                                value={jsonEdit}
                                onChange={(e) => setJsonEdit(e.target.value)}
                                spellCheck={false}
                                style={{
                                    flex: 1, background: '#050508', color: '#4caf50',
                                    border: '1px solid #333', fontFamily: 'inherit', fontSize: 11,
                                    padding: 8, resize: 'none', outline: 'none'
                                }}
                                placeholder="Select an event to edit..."
                            />
                            <button onClick={handleHotSwap} style={{ ...btnStyle, marginTop: 8, width: '100%', borderColor: '#c9a84c', color: '#c9a84c' }}>
                                🔥 Hot-Swap Payload Into Memory
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Node Editor ──
function NodeEditor({ node, idx, onChange, onClose }) {
    const labelStyle = { display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 };
    const inputStyle = { width: '100%', background: '#050508', color: '#eaeaea', border: '1px solid #444', fontFamily: 'inherit', fontSize: 11, padding: '6px 8px', outline: 'none', boxSizing: 'border-box' };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ color: '#88bbdd', fontSize: 12, fontWeight: 'bold' }}>
                    EDITING NODE {idx} : {node.type.toUpperCase()}
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✕</button>
            </div>

            <label style={labelStyle}>Speaker</label>
            <input value={node.speaker || ''} onChange={(e) => onChange('speaker', e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Emote</label>
            <input value={node.emote || ''} onChange={(e) => onChange('emote', e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Text Content</label>
            <textarea value={node.text || ''} onChange={(e) => onChange('text', e.target.value)} style={{ ...inputStyle, height: 80, resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <label style={{ color: '#eaeaea', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={!!node.isEnd} onChange={(e) => onChange('isEnd', e.target.checked)} />
                    Is End Node
                </label>
            </div>

            {node.type === 'choice' && (
                <div style={{ marginTop: 20 }}>
                    <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 8, borderBottom: '1px dashed #333', paddingBottom: 4 }}>Choices (JSON)</div>
                    <textarea
                        value={JSON.stringify(node.choices || [], null, 2)}
                        onChange={(e) => {
                            try { onChange('choices', JSON.parse(e.target.value)); } catch (_) { }
                        }}
                        style={{ ...inputStyle, height: 120, resize: 'vertical' }}
                    />
                </div>
            )}
        </div>
    );
}

// ── Custom React Flow Nodes ──

const DialogueNode = ({ data }) => {
    const { step, isSelected } = data;
    return (
        <div style={{
            width: 200, height: 90,
            background: step.type === 'choice' ? '#1a1a2e' : '#111',
            border: `1px solid ${isSelected ? '#fff' : (step.type === 'choice' ? '#88bbdd' : '#c9a84c')}`,
            boxShadow: isSelected ? '0 0 0 2px rgba(255,255,255,0.2)' : 'none',
            borderRadius: 4, padding: '8px 12px', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column'
        }}>
            <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
            <div style={{ fontSize: 10, color: '#888', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>Step {step.index} {step.speaker ? `(${step.speaker})` : ''}</span>
                <strong style={{ color: step.type === 'choice' ? '#88bbdd' : '#c9a84c' }}>{step.type.toUpperCase()}</strong>
            </div>
            <div style={{ fontSize: 11, color: '#eaeaea', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                "{step.text}"
            </div>
            {step.isEnd && <div style={{ fontSize: 9, color: '#c94040', marginTop: 4, fontWeight: 'bold' }}>[ END SCENE ]</div>}

            {step.type !== 'choice' && !step.isEnd && (
                <Handle type="source" position={Position.Bottom} style={{ background: '#888' }} />
            )}
            {step.type === 'choice' && step.choices?.map((c, i) => (
                <Handle
                    key={i}
                    type="source"
                    position={Position.Bottom}
                    id={`choice-${i}`}
                    style={{ background: '#88bbdd', left: `${(i + 1) * (100 / (step.choices.length + 1))}%` }}
                />
            ))}
        </div>
    );
};

const nodeTypes = {
    dialogue: DialogueNode
};

// ── React Flow Integrator ──

function EventGraphWrapper({ event, onNodeClick, editingIdx, onUpdateEvent }) {
    if (!event.steps || event.steps.length === 0) return <div style={{ color: '#555', textAlign: 'center', padding: 20 }}>No steps found.</div>;

    const initialNodes = event.steps.map((step, idx) => ({
        id: String(idx),
        type: 'dialogue',
        position: step.position || { x: 40, y: 20 + idx * 130 },
        data: { step: { ...step, index: idx }, isSelected: editingIdx === idx },
        draggable: true,
    }));

    const initialEdges = [];
    event.steps.forEach((step, idx) => {
        if (step.isEnd) return;
        if (step.type === 'choice' && step.choices) {
            step.choices.forEach((c, i) => {
                const targetIdx = c.nextStep !== undefined ? c.nextStep : (idx + 1);
                if (event.steps[targetIdx]) {
                    initialEdges.push({
                        id: `e${idx}-${targetIdx}-${i}`,
                        source: String(idx),
                        sourceHandle: `choice-${i}`,
                        target: String(targetIdx),
                        animated: true,
                        style: { stroke: '#88bbdd', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#88bbdd' },
                    });
                }
            });
        } else {
            const targetIdx = step.nextStep !== undefined ? step.nextStep : (idx + 1);
            if (event.steps[targetIdx]) {
                initialEdges.push({
                    id: `e${idx}-${targetIdx}`,
                    source: String(idx),
                    target: String(targetIdx),
                    style: { stroke: '#888', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#888' },
                });
            }
        }
    });

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync from props
    useEffect(() => {
        setNodes(nds => event.steps.map((step, idx) => {
            const existing = nds.find(n => n.id === String(idx));
            return {
                id: String(idx),
                type: 'dialogue',
                position: existing ? existing.position : (step.position || { x: 40, y: 20 + idx * 130 }),
                data: { step: { ...step, index: idx }, isSelected: editingIdx === idx },
                draggable: true,
            };
        }));
        setEdges(initialEdges);
    }, [event.id, editingIdx, JSON.stringify(event.steps.map(s => ({ ...s, position: undefined })))]);

    const handleNodesChange = useCallback((changes) => {
        onNodesChange(changes);
        const dragged = changes.filter(c => c.type === 'position' && c.dragging === false);
        if (dragged.length > 0) {
            const updatedSteps = [...event.steps];
            dragged.forEach(c => {
                if (updatedSteps[parseInt(c.id)]) {
                    updatedSteps[parseInt(c.id)].position = c.position;
                }
            });
            onUpdateEvent(event.id, 'steps', updatedSteps);
        }
    }, [event.steps, onNodesChange, onUpdateEvent, event.id]);

    const onConnect = useCallback((params) => {
        const { source, sourceHandle, target } = params;
        const sourceIdx = parseInt(source);
        const targetIdx = parseInt(target);

        const updatedSteps = [...event.steps];
        const step = { ...updatedSteps[sourceIdx] };

        if (step.type === 'choice' && sourceHandle?.startsWith('choice-')) {
            const choiceIdx = parseInt(sourceHandle.replace('choice-', ''));
            const updatedChoices = [...(step.choices || [])];
            updatedChoices[choiceIdx] = { ...updatedChoices[choiceIdx], nextStep: targetIdx };
            step.choices = updatedChoices;
        } else if (step.type !== 'choice') {
            step.nextStep = targetIdx;
        }

        updatedSteps[sourceIdx] = step;
        onUpdateEvent(event.id, 'steps', updatedSteps);
        setEdges((eds) => addEdge(params, eds));
    }, [event, onUpdateEvent, setEdges]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => onNodeClick(parseInt(node.id))}
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

export function EventGraphWrapperExport({ event, onNodeClick, editingIdx, onUpdateEvent }) {
    return (
        <ReactFlowProvider>
            <EventGraphWrapper event={event} onNodeClick={onNodeClick} editingIdx={editingIdx} onUpdateEvent={onUpdateEvent} />
        </ReactFlowProvider>
    );
}
