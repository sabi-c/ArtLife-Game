/**
 * EventEditor — AAA-Quality Node-Based Dialogue Editor
 *
 * Comprehensive editor for dialogue trees with:
 *  - Rich visual node cards showing effects, conditions, tone badges
 *  - Full property panel with inline choice/variant/effect editing
 *  - Named-node system (start, buyer_intel, etc.) instead of index-based
 *  - Dual-mode: edits both DIALOGUE_TREES and EventRegistry events
 *  - Visual validation (orphans, missing targets, unreachable nodes)
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EventRegistry } from '../../managers/EventRegistry.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { useCmsStore } from '../../stores/cmsStore.js';
import { CONTACTS } from '../../data/contacts.js';
import { DIALOGUE_TREES, TONES } from '../../data/dialogue_trees.js';
import { ContentExporter } from '../../utils/ContentExporter.js';
import {
    ReactFlow, MiniMap, Controls, Background,
    useNodesState, useEdgesState, addEdge,
    Handle, Position, MarkerType, ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ══════════════════════════════════════════════════════════════
// Constants & Lookups
// ══════════════════════════════════════════════════════════════

const NPC_MAP = {};
(CONTACTS || []).forEach(c => { NPC_MAP[c.id] = c.name || c.id; });

const TONE_META = {
    friendly: { icon: '🤝', color: '#4ade80', label: 'Friendly' },
    schmoozing: { icon: '💬', color: '#a78bfa', label: 'Schmoozing' },
    direct: { icon: '🎯', color: '#60a5fa', label: 'Direct' },
    generous: { icon: '🎁', color: '#fbbf24', label: 'Generous' },
    ruthless: { icon: '💀', color: '#f87171', label: 'Ruthless' },
};

const NODE_TYPE_META = {
    dialogue: { color: '#c9a84c', icon: '💬', label: 'Dialogue' },
    choice: { color: '#88bbdd', icon: '🔀', label: 'Choice' },
    narration: { color: '#aa66cc', icon: '📖', label: 'Narration' },
    check: { color: '#44bb88', icon: '🔒', label: 'Check' },
    haggle: { color: '#ff6644', icon: '⚔️', label: 'Haggle' },
    end: { color: '#666', icon: '🏁', label: 'End' },
};

// ══════════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════════

const S = {
    panel: {
        background: '#0a0a0f', border: '1px solid #222', padding: 0,
        overflow: 'auto', fontFamily: 'inherit', fontSize: 12, color: '#eaeaea',
        display: 'flex', flexDirection: 'column',
    },
    btn: {
        background: 'transparent', border: '1px solid #444', color: '#aaa',
        padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 10, textTransform: 'uppercase', borderRadius: 3,
    },
    label: {
        display: 'block', color: '#666', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: 1, marginTop: 12, marginBottom: 4,
    },
    input: {
        width: '100%', background: '#050508', color: '#eaeaea',
        border: '1px solid #333', fontFamily: 'inherit', fontSize: 11,
        padding: '5px 8px', outline: 'none', boxSizing: 'border-box', borderRadius: 2,
    },
    pill: (color) => ({
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '1px 6px', borderRadius: 10, fontSize: 9,
        background: `${color}18`, color, border: `1px solid ${color}30`,
        marginRight: 3, marginBottom: 2, whiteSpace: 'nowrap',
    }),
    sectionHead: (color = '#c9a84c') => ({
        fontSize: 9, fontWeight: 'bold', color, letterSpacing: 1,
        textTransform: 'uppercase', marginBottom: 6, marginTop: 14,
        borderBottom: `1px solid ${color}30`, paddingBottom: 3,
    }),
};

// ══════════════════════════════════════════════════════════════
// Helper: Convert named-node tree to React Flow structures
// ══════════════════════════════════════════════════════════════

function treeToFlowData(tree) {
    if (!tree?.nodes) return { nodes: [], edges: [] };
    const nodeIds = Object.keys(tree.nodes);
    const rfNodes = [];
    const rfEdges = [];

    // Layout: arrange nodes in a grid
    const cols = Math.max(3, Math.ceil(Math.sqrt(nodeIds.length)));
    nodeIds.forEach((nid, i) => {
        const node = tree.nodes[nid];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const topics = node.topics || [];
        const hasVariants = (node.variants || []).length > 0;
        const hasEffects = node.effects || node.npcEffects;

        // Determine node visual type
        let nodeType = 'dialogue';
        if (topics.length > 1) nodeType = 'choice';
        if (node.triggerHaggle) nodeType = 'haggle';
        if (topics.length === 0 && !node.text) nodeType = 'end';
        if (node.isNarration) nodeType = 'narration';

        rfNodes.push({
            id: nid,
            type: 'dialogueNode',
            position: node._position || { x: 60 + col * 320, y: 50 + row * 250 },
            data: {
                nodeId: nid,
                node,
                nodeType,
                isStart: nid === 'start',
                hasVariants,
                hasEffects: !!hasEffects,
                topicCount: topics.length,
            },
            draggable: true,
        });

        // Edges from topics
        topics.forEach((topic, ti) => {
            if (topic.next && tree.nodes[topic.next]) {
                const isBlue = topic.isBlueOption;
                const hasReqs = !!topic.requires;
                rfEdges.push({
                    id: `${nid}→${topic.next}:${ti}`,
                    source: nid,
                    sourceHandle: `topic-${ti}`,
                    target: topic.next,
                    targetHandle: 'in',
                    animated: isBlue,
                    style: {
                        stroke: isBlue ? '#60a5fa' : hasReqs ? '#44bb88' : '#555',
                        strokeWidth: isBlue ? 2.5 : 1.5,
                    },
                    markerEnd: { type: MarkerType.ArrowClosed, color: isBlue ? '#60a5fa' : '#555' },
                    label: topic.label?.substring(0, 20) + (topic.label?.length > 20 ? '…' : ''),
                    labelStyle: { fontSize: 8, fill: '#555' },
                    labelBgStyle: { fill: '#0a0a0f', fillOpacity: 0.9 },
                });
            }
        });
    });

    return { nodes: rfNodes, edges: rfEdges };
}

// ══════════════════════════════════════════════════════════════
// Custom React Flow Node: Rich Dialogue Card
// ══════════════════════════════════════════════════════════════

function DialogueNodeCard({ data, selected }) {
    const { nodeId, node, nodeType, isStart, hasVariants, hasEffects, topicCount } = data;
    const meta = NODE_TYPE_META[nodeType] || NODE_TYPE_META.dialogue;
    const topics = node.topics || [];

    // Collect all effects for pills
    const effectPills = [];
    if (node.effects) {
        Object.entries(node.effects).forEach(([k, v]) => {
            const sign = v > 0 ? '+' : '';
            effectPills.push({ label: `${sign}${v} ${k}`, color: v > 0 ? '#4ade80' : '#f87171' });
        });
    }
    if (node.npcEffects) {
        Object.entries(node.npcEffects).forEach(([npcId, fx]) => {
            Object.entries(fx).forEach(([k, v]) => {
                const sign = v > 0 ? '+' : '';
                const name = NPC_MAP[npcId] || npcId;
                effectPills.push({ label: `${sign}${v} ${k} (${name})`, color: v > 0 ? '#fbbf24' : '#f87171' });
            });
        });
    }

    const text = node.text || node.variants?.[node.variants.length - 1]?.text || '';
    const truncText = text.length > 80 ? text.substring(0, 80) + '…' : text;

    return (
        <div style={{
            width: 280, minHeight: 80,
            background: selected ? '#111825' : '#0d0d14',
            border: `1.5px solid ${selected ? '#fff' : meta.color}`,
            borderRadius: 6, overflow: 'hidden',
            boxShadow: selected ? `0 0 12px ${meta.color}40` : 'none',
        }}>
            {/* Target handle */}
            <Handle type="target" position={Position.Top} id="in"
                style={{ background: meta.color, width: 8, height: 8 }} />

            {/* Header Row */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 10px', background: `${meta.color}15`,
                borderBottom: `1px solid ${meta.color}30`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isStart && <span style={{ fontSize: 10, color: '#4ade80' }}>▶</span>}
                    <span style={{ fontSize: 10, color: '#888' }}>
                        {node.speaker ? `🧑 ${NPC_MAP[node.speaker] || node.speaker}` : ''}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {hasVariants && <span style={{ fontSize: 9, color: '#aa66cc' }}>🎭</span>}
                    <span style={{
                        fontSize: 8, padding: '1px 5px', borderRadius: 3,
                        background: `${meta.color}20`, color: meta.color,
                        fontWeight: 'bold', textTransform: 'uppercase',
                    }}>{meta.icon} {meta.label}</span>
                </div>
            </div>

            {/* Node ID */}
            <div style={{ padding: '3px 10px', fontSize: 10, color: meta.color, fontWeight: 'bold', fontFamily: 'monospace' }}>
                {nodeId}
            </div>

            {/* Body Text */}
            {truncText && (
                <div style={{
                    padding: '2px 10px 6px', fontSize: 10, color: '#999',
                    lineHeight: 1.4, fontStyle: 'italic',
                }}>
                    "{truncText}"
                </div>
            )}

            {/* Effect Pills */}
            {effectPills.length > 0 && (
                <div style={{ padding: '2px 10px 4px', display: 'flex', flexWrap: 'wrap' }}>
                    {effectPills.map((p, i) => (
                        <span key={i} style={S.pill(p.color)}>{p.label}</span>
                    ))}
                </div>
            )}

            {/* Topics / Choices */}
            {topics.length > 0 && (
                <div style={{
                    borderTop: `1px solid ${meta.color}15`, padding: '4px 0',
                    background: '#06060a',
                }}>
                    {topics.map((t, ti) => {
                        const toneMeta = t.tone ? TONE_META[t.tone] : null;
                        return (
                            <div key={ti} style={{
                                position: 'relative',
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '3px 10px', fontSize: 9, color: '#bbb',
                                borderLeft: t.isBlueOption ? '2px solid #60a5fa' : '2px solid transparent',
                                background: t.isBlueOption ? 'rgba(96,165,250,0.05)' : 'transparent',
                            }}>
                                {t.requires && <span style={{ color: '#44bb88', fontSize: 8 }}>🔒</span>}
                                {toneMeta && <span style={{ color: toneMeta.color, fontSize: 8 }}>{toneMeta.icon}</span>}
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t.label || '(no label)'}
                                </span>
                                {t.next && <span style={{ color: '#555', fontSize: 8, fontFamily: 'monospace' }}>→{t.next}</span>}
                                {t.triggerHaggle && <span style={{ color: '#ff6644', fontSize: 8 }}>⚔️</span>}
                                <Handle
                                    type="source" position={Position.Right}
                                    id={`topic-${ti}`}
                                    style={{
                                        background: t.isBlueOption ? '#60a5fa' : toneMeta?.color || '#555',
                                        width: 6, height: 6, right: -3,
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Fallback source handle for non-choice nodes */}
            {topics.length === 0 && nodeType !== 'end' && (
                <Handle type="source" position={Position.Bottom} id="out"
                    style={{ background: meta.color, width: 8, height: 8 }} />
            )}
        </div>
    );
}

const nodeTypes = { dialogueNode: DialogueNodeCard };

// ══════════════════════════════════════════════════════════════
// React Flow Graph Wrapper
// ══════════════════════════════════════════════════════════════

function DialogueGraph({ tree, selectedNodeId, onNodeClick, onTreeUpdate }) {
    const { nodes: rfNodesInit, edges: rfEdgesInit } = useMemo(() => treeToFlowData(tree), [tree]);

    const [nodes, setNodes, onNodesChange] = useNodesState(rfNodesInit);
    const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdgesInit);

    // Sync when tree or selection changes
    useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = treeToFlowData(tree);
        setNodes(nds => newNodes.map(nn => {
            const existing = nds.find(n => n.id === nn.id);
            return {
                ...nn,
                position: existing?.position || nn.position,
                selected: nn.id === selectedNodeId,
            };
        }));
        setEdges(newEdges);
    }, [tree, selectedNodeId]);

    const handleNodesChange = useCallback((changes) => {
        onNodesChange(changes);
        const dragged = changes.filter(c => c.type === 'position' && c.dragging === false);
        if (dragged.length > 0 && onTreeUpdate) {
            const updatedNodes = { ...tree.nodes };
            dragged.forEach(c => {
                if (updatedNodes[c.id]) {
                    updatedNodes[c.id] = { ...updatedNodes[c.id], _position: c.position };
                }
            });
            onTreeUpdate({ ...tree, nodes: updatedNodes });
        }
    }, [tree, onNodesChange, onTreeUpdate]);

    const onConnect = useCallback((params) => {
        const { source, sourceHandle, target } = params;
        if (!tree.nodes[source] || !tree.nodes[target]) return;

        const updatedNodes = { ...tree.nodes };
        const srcNode = { ...updatedNodes[source] };

        if (sourceHandle?.startsWith('topic-')) {
            const tIdx = parseInt(sourceHandle.replace('topic-', ''));
            const topics = [...(srcNode.topics || [])];
            if (topics[tIdx]) {
                topics[tIdx] = { ...topics[tIdx], next: target };
                srcNode.topics = topics;
            }
        }

        updatedNodes[source] = srcNode;
        onTreeUpdate({ ...tree, nodes: updatedNodes });
        setEdges(eds => addEdge(params, eds));
    }, [tree, onTreeUpdate, setEdges]);

    // Stats
    const nodeCount = Object.keys(tree.nodes || {}).length;
    const edgeCount = rfEdgesInit.length;
    const orphans = useMemo(() => {
        const targeted = new Set();
        Object.values(tree.nodes || {}).forEach(n => {
            (n.topics || []).forEach(t => { if (t.next) targeted.add(t.next); });
        });
        return Object.keys(tree.nodes || {}).filter(id => id !== 'start' && !targeted.has(id));
    }, [tree]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Stats bar */}
            <div style={{
                display: 'flex', gap: 12, padding: '6px 12px',
                background: '#080810', borderBottom: '1px solid #1a1a2e',
                fontSize: 9, color: '#555',
            }}>
                <span>{nodeCount} nodes</span>
                <span>{edgeCount} connections</span>
                {orphans.length > 0 && (
                    <span style={{ color: '#f87171' }}>⚠ {orphans.length} orphan{orphans.length > 1 ? 's' : ''}: {orphans.join(', ')}</span>
                )}
            </div>

            <div style={{ flex: 1 }}>
                <ReactFlow
                    nodes={nodes} edges={edges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    onNodeClick={(_, node) => onNodeClick(node.id)}
                    fitView
                    proOptions={{ hideAttribution: true }}
                    minZoom={0.15} maxZoom={2}
                    defaultEdgeOptions={{ type: 'smoothstep' }}
                >
                    <Background color="#1a1a2e" gap={25} size={1} />
                    <Controls style={{ fill: '#888', background: '#111' }} />
                    <MiniMap
                        nodeColor={(n) => {
                            const meta = NODE_TYPE_META[n.data?.nodeType];
                            return meta?.color || '#444';
                        }}
                        maskColor="rgba(0,0,0,0.8)"
                        style={{ background: '#080810', border: '1px solid #222' }}
                    />
                </ReactFlow>
            </div>
        </div>
    );
}

function DialogueGraphWrapper(props) {
    return (
        <ReactFlowProvider>
            <DialogueGraph {...props} />
        </ReactFlowProvider>
    );
}

// ══════════════════════════════════════════════════════════════
// Node Property Panel — Full-featured editor sidebar
// ══════════════════════════════════════════════════════════════

function NodePropertyPanel({ nodeId, node, tree, onNodeUpdate, onClose, onAddNode, onDeleteNode }) {
    if (!node) return <div style={{ color: '#555', padding: 16, textAlign: 'center' }}>Select a node to edit</div>;

    const topics = node.topics || [];
    const variants = node.variants || [];

    const updateField = (field, value) => {
        onNodeUpdate(nodeId, { ...node, [field]: value });
    };

    const updateTopic = (idx, field, value) => {
        const updated = [...topics];
        updated[idx] = { ...updated[idx], [field]: value };
        updateField('topics', updated);
    };

    const addTopic = () => {
        updateField('topics', [...topics, { label: 'New option...', tone: null, next: null }]);
    };

    const removeTopic = (idx) => {
        updateField('topics', topics.filter((_, i) => i !== idx));
    };

    const addVariant = () => {
        updateField('variants', [...variants, { check: null, text: 'Variant text...' }]);
    };

    const updateVariant = (idx, field, value) => {
        const updated = [...variants];
        updated[idx] = { ...updated[idx], [field]: value };
        updateField('variants', updated);
    };

    const removeVariant = (idx) => {
        updateField('variants', variants.filter((_, i) => i !== idx));
    };

    // All available targets
    const targetOptions = Object.keys(tree.nodes || {}).filter(id => id !== nodeId);

    // NPC list for speaker dropdown
    const npcOptions = (CONTACTS || []).map(c => ({ id: c.id, name: c.name }));

    return (
        <div style={{ padding: 12, overflow: 'auto', flex: 1 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 'bold', color: '#c9a84c', fontFamily: 'monospace' }}>
                    {nodeId}
                </div>
                <button onClick={onClose} style={{ ...S.btn, padding: '2px 8px', fontSize: 9 }}>✕</button>
            </div>

            {/* Speaker */}
            <label style={S.label}>Speaker</label>
            <select value={node.speaker || ''} onChange={e => updateField('speaker', e.target.value || null)}
                style={{ ...S.input, cursor: 'pointer' }}>
                <option value="">— none —</option>
                {npcOptions.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>

            {/* Primary Text */}
            <label style={S.label}>Text</label>
            <textarea value={node.text || ''} onChange={e => updateField('text', e.target.value || null)}
                style={{ ...S.input, height: 70, resize: 'vertical' }}
                placeholder="Dialogue text..." />
            {node.text && <div style={{ fontSize: 8, color: '#444', textAlign: 'right' }}>{node.text.length} chars</div>}

            {/* ── Variants ── */}
            <div style={S.sectionHead('#aa66cc')}>
                🎭 Variants ({variants.length})
                <button onClick={addVariant} style={{ ...S.btn, float: 'right', fontSize: 8, padding: '1px 6px' }}>+ Add</button>
            </div>
            {variants.map((v, vi) => (
                <div key={vi} style={{
                    background: '#0d0d14', border: '1px solid #222', borderRadius: 4,
                    padding: 8, marginBottom: 6,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 9, color: '#aa66cc' }}>Variant {vi + 1}</span>
                        <button onClick={() => removeVariant(vi)} style={{ ...S.btn, fontSize: 8, padding: '0 4px', color: '#f87171', borderColor: '#f87171' }}>✕</button>
                    </div>
                    <label style={{ ...S.label, marginTop: 4 }}>Condition (JSON)</label>
                    <input value={v.check ? JSON.stringify(v.check) : ''} style={{ ...S.input, fontSize: 10 }}
                        onChange={e => {
                            try { updateVariant(vi, 'check', e.target.value ? JSON.parse(e.target.value) : null); } catch { }
                        }}
                        placeholder='e.g. {"npcFavor.elena_ross":{"min":10}}' />
                    <label style={{ ...S.label, marginTop: 6 }}>Text</label>
                    <textarea value={v.text || ''} onChange={e => updateVariant(vi, 'text', e.target.value)}
                        style={{ ...S.input, height: 50, resize: 'vertical', fontSize: 10 }} />
                </div>
            ))}

            {/* ── Effects ── */}
            <div style={S.sectionHead('#4ade80')}>📊 Node Effects</div>
            <EffectsEditor effects={node.effects || {}} onChange={val => updateField('effects', Object.keys(val).length ? val : undefined)} />

            {/* ── NPC Effects ── */}
            <div style={S.sectionHead('#fbbf24')}>💛 NPC Effects</div>
            <NPCEffectsEditor npcEffects={node.npcEffects || {}} onChange={val => updateField('npcEffects', Object.keys(val).length ? val : undefined)} />

            {/* ── Topics / Choices ── */}
            <div style={S.sectionHead('#88bbdd')}>
                🔀 Topics / Choices ({topics.length})
                <button onClick={addTopic} style={{ ...S.btn, float: 'right', fontSize: 8, padding: '1px 6px' }}>+ Add</button>
            </div>
            {topics.map((t, ti) => (
                <TopicEditor key={ti} topic={t} idx={ti} targets={targetOptions}
                    onChange={(f, v) => updateTopic(ti, f, v)}
                    onRemove={() => removeTopic(ti)} />
            ))}

            {/* ── Footer Actions ── */}
            <div style={{ display: 'flex', gap: 6, marginTop: 20, paddingTop: 12, borderTop: '1px solid #222' }}>
                <button onClick={() => onAddNode()} style={{ ...S.btn, flex: 1, borderColor: '#4ade80', color: '#4ade80' }}>
                    + New Node
                </button>
                <button onClick={() => onDeleteNode(nodeId)} style={{ ...S.btn, flex: 1, borderColor: '#f87171', color: '#f87171' }}>
                    🗑 Delete
                </button>
            </div>
        </div>
    );
}

// ── Topic/Choice inline editor ──
function TopicEditor({ topic, idx, targets, onChange, onRemove }) {
    return (
        <div style={{
            background: topic.isBlueOption ? 'rgba(96,165,250,0.06)' : '#0a0a10',
            border: `1px solid ${topic.isBlueOption ? '#60a5fa30' : '#1a1a2e'}`,
            borderRadius: 4, padding: 8, marginBottom: 6,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: '#88bbdd' }}>Choice {idx + 1}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                    <label style={{ fontSize: 8, color: topic.isBlueOption ? '#60a5fa' : '#444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input type="checkbox" checked={!!topic.isBlueOption}
                            onChange={e => onChange('isBlueOption', e.target.checked || undefined)}
                            style={{ width: 10, height: 10 }} />
                        💙
                    </label>
                    <label style={{ fontSize: 8, color: topic.triggerHaggle ? '#ff6644' : '#444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input type="checkbox" checked={!!topic.triggerHaggle}
                            onChange={e => onChange('triggerHaggle', e.target.checked || undefined)}
                            style={{ width: 10, height: 10 }} />
                        ⚔️
                    </label>
                    <button onClick={onRemove} style={{ ...S.btn, fontSize: 8, padding: '0 4px', color: '#f87171', borderColor: '#f87171' }}>✕</button>
                </div>
            </div>

            {/* Label */}
            <input value={topic.label || ''} onChange={e => onChange('label', e.target.value)}
                style={{ ...S.input, marginBottom: 4 }} placeholder="Choice label..." />

            {/* Tone + Target row */}
            <div style={{ display: 'flex', gap: 4 }}>
                <select value={topic.tone || ''} onChange={e => onChange('tone', e.target.value || null)}
                    style={{ ...S.input, flex: '0 0 100px', cursor: 'pointer', fontSize: 10 }}>
                    <option value="">No tone</option>
                    {Object.entries(TONE_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                </select>
                <select value={topic.next || ''} onChange={e => onChange('next', e.target.value || null)}
                    style={{ ...S.input, flex: 1, cursor: 'pointer', fontSize: 10 }}>
                    <option value="">→ [Leave/End]</option>
                    {targets.map(t => <option key={t} value={t}>→ {t}</option>)}
                </select>
            </div>

            {/* Requirements (collapsible) */}
            {(topic.requires || topic._showReqs) && (
                <div style={{ marginTop: 4 }}>
                    <label style={{ ...S.label, marginTop: 4, fontSize: 8 }}>Requirements (JSON)</label>
                    <input value={topic.requires ? JSON.stringify(topic.requires) : ''}
                        onChange={e => {
                            try { onChange('requires', e.target.value ? JSON.parse(e.target.value) : null); } catch { }
                        }}
                        style={{ ...S.input, fontSize: 9 }}
                        placeholder='e.g. {"cash":{"min":5000}}' />
                </div>
            )}

            {/* Effects preview */}
            {(topic.effects || topic.npcEffects) && (
                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap' }}>
                    {topic.effects && Object.entries(topic.effects).map(([k, v]) => (
                        <span key={k} style={S.pill(v > 0 ? '#4ade80' : '#f87171')}>
                            {v > 0 ? '+' : ''}{v} {k}
                        </span>
                    ))}
                    {topic.npcEffects && Object.entries(topic.npcEffects).map(([npc, fx]) =>
                        Object.entries(fx).map(([k, v]) => (
                            <span key={`${npc}-${k}`} style={S.pill(v > 0 ? '#fbbf24' : '#f87171')}>
                                {v > 0 ? '+' : ''}{v} {k} ({NPC_MAP[npc] || npc})
                            </span>
                        ))
                    )}
                </div>
            )}

            {/* Inline effect editing */}
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <EffectInput label="cash" value={topic.effects?.cash}
                    onChange={v => onChange('effects', { ...(topic.effects || {}), cash: v || undefined })} />
                <EffectInput label="intel" value={topic.effects?.intel}
                    onChange={v => onChange('effects', { ...(topic.effects || {}), intel: v || undefined })} />
                <EffectInput label="rep" value={topic.effects?.reputation}
                    onChange={v => onChange('effects', { ...(topic.effects || {}), reputation: v || undefined })} />
            </div>
        </div>
    );
}

function EffectInput({ label, value, onChange }) {
    return (
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: 7, color: '#444', textTransform: 'uppercase' }}>{label}</div>
            <input type="number" value={value || ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
                style={{ ...S.input, fontSize: 9, padding: '2px 4px', textAlign: 'center' }}
                placeholder="—" />
        </div>
    );
}

function EffectsEditor({ effects, onChange }) {
    const keys = ['cash', 'intel', 'reputation', 'heat', 'suspicion'];
    return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {keys.map(k => (
                <div key={k} style={{ flex: '0 0 60px' }}>
                    <div style={{ fontSize: 7, color: '#444', textTransform: 'uppercase' }}>{k}</div>
                    <input type="number" value={effects[k] ?? ''} style={{ ...S.input, fontSize: 9, padding: '2px 4px', textAlign: 'center' }}
                        onChange={e => {
                            const v = e.target.value ? Number(e.target.value) : undefined;
                            const next = { ...effects };
                            if (v !== undefined) next[k] = v; else delete next[k];
                            onChange(next);
                        }}
                        placeholder="—" />
                </div>
            ))}
        </div>
    );
}

function NPCEffectsEditor({ npcEffects, onChange }) {
    const entries = Object.entries(npcEffects);
    const addNpc = (npcId) => {
        if (!npcId || npcEffects[npcId]) return;
        onChange({ ...npcEffects, [npcId]: { favor: 0 } });
    };
    return (
        <div>
            {entries.map(([npcId, fx]) => (
                <div key={npcId} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '3px 0', borderBottom: '1px solid #111',
                }}>
                    <span style={{ fontSize: 10, color: '#fbbf24', flex: '0 0 100px' }}>{NPC_MAP[npcId] || npcId}</span>
                    <div style={{ fontSize: 7, color: '#444' }}>favor</div>
                    <input type="number" value={fx.favor ?? 0} style={{ ...S.input, width: 50, fontSize: 9, padding: '2px 4px', textAlign: 'center' }}
                        onChange={e => {
                            const v = Number(e.target.value) || 0;
                            const next = { ...npcEffects, [npcId]: { ...fx, favor: v } };
                            if (v === 0) delete next[npcId];
                            onChange(next);
                        }} />
                    <button onClick={() => {
                        const next = { ...npcEffects };
                        delete next[npcId];
                        onChange(next);
                    }} style={{ ...S.btn, fontSize: 8, padding: '0 4px', color: '#f87171' }}>✕</button>
                </div>
            ))}
            <select onChange={e => { addNpc(e.target.value); e.target.value = ''; }}
                style={{ ...S.input, marginTop: 4, fontSize: 9, cursor: 'pointer' }}>
                <option value="">+ Add NPC effect...</option>
                {(CONTACTS || []).filter(c => !npcEffects[c.id]).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// Main Editor Component
// ══════════════════════════════════════════════════════════════

export default function EventEditor() {
    // ── State ──
    const [trees, setTrees] = useState([]);
    const [selectedTreeId, setSelectedTreeId] = useState(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [searchFilter, setSearchFilter] = useState('');
    const [notification, setNotification] = useState(null);
    const [jsonEdit, setJsonEdit] = useState('');
    const [showJSON, setShowJSON] = useState(false);

    const showNotif = useCallback((msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3500);
    }, []);

    // Load trees on mount — use dynamic import to prevent stale localStorage
    useEffect(() => {
        const buildTrees = (events) => {
            const allTrees = [];
            // Load DIALOGUE_TREES
            if (Array.isArray(DIALOGUE_TREES)) {
                DIALOGUE_TREES.forEach(t => {
                    allTrees.push({ ...t, _source: 'dialogue_trees' });
                });
            }
            // Load legacy events (step-based)
            (events || []).forEach(ev => {
                if (ev.steps && !ev.nodes) {
                    const nodes = {};
                    ev.steps.forEach((step, i) => {
                        const nid = step.nodeId || `step_${i}`;
                        nodes[nid] = {
                            speaker: step.speaker,
                            text: step.text,
                            emote: step.emote,
                            topics: step.type === 'choice' ? (step.choices || []).map(c => ({
                                label: c.label || c.text,
                                next: c.nextStep !== undefined ? `step_${c.nextStep}` : null,
                                tone: c.tone || null,
                            })) : (step.isEnd ? [] : [{ label: '→', next: step.nextStep !== undefined ? `step_${step.nextStep}` : `step_${i + 1}` }]),
                            _position: step.position,
                        };
                    });
                    allTrees.push({
                        id: ev.id,
                        npcId: ev.npcId,
                        venue: ev.category || 'unknown',
                        trigger: ev.trigger || 'event',
                        nodes,
                        _source: 'events',
                        _originalEvent: ev,
                    });
                }
            });
            return allTrees;
        };

        const registryEvents = EventRegistry.jsonEvents || [];
        // Dynamic import to compare against source file — prevents stale cmsStore snapshots
        import('../../data/events.js').then(mod => {
            const sourceEvents = mod.EVENTS || mod.default || [];
            const events = sourceEvents.length > registryEvents.length ? sourceEvents : registryEvents;
            if (events.length > registryEvents.length) {
                EventRegistry.jsonEvents = JSON.parse(JSON.stringify(events));
            }
            setTrees(buildTrees(events));
        }).catch(() => {
            setTrees(buildTrees(registryEvents));
        });
    }, []);

    const selectedTree = trees.find(t => t.id === selectedTreeId);
    const selectedNode = selectedTree?.nodes?.[selectedNodeId];

    // ── Handlers ──
    const handleSelectTree = useCallback((id) => {
        setSelectedTreeId(id);
        setSelectedNodeId(null);
        const t = trees.find(tr => tr.id === id);
        if (t) setJsonEdit(JSON.stringify(t, null, 2));
    }, [trees]);

    const handleTreeUpdate = useCallback((updatedTree) => {
        setTrees(prev => prev.map(t => t.id === updatedTree.id ? updatedTree : t));
        useCmsStore.getState().markDirty('dialogues');
        setJsonEdit(JSON.stringify(updatedTree, null, 2));
    }, []);

    const handleNodeUpdate = useCallback((nodeId, updatedNode) => {
        if (!selectedTree) return;
        const updatedNodes = { ...selectedTree.nodes, [nodeId]: updatedNode };
        handleTreeUpdate({ ...selectedTree, nodes: updatedNodes });
    }, [selectedTree, handleTreeUpdate]);

    const handleAddNode = useCallback(() => {
        if (!selectedTree) return;
        let newId = 'new_node';
        let i = 1;
        while (selectedTree.nodes[newId]) { newId = `new_node_${i++}`; }
        const updatedNodes = {
            ...selectedTree.nodes,
            [newId]: { speaker: selectedTree.npcId || null, text: 'New dialogue...', topics: [] },
        };
        handleTreeUpdate({ ...selectedTree, nodes: updatedNodes });
        setSelectedNodeId(newId);
        showNotif(`✅ Added node: ${newId}`);
    }, [selectedTree, handleTreeUpdate, showNotif]);

    const handleDeleteNode = useCallback((nodeId) => {
        if (!selectedTree || nodeId === 'start') {
            showNotif('❌ Cannot delete start node');
            return;
        }
        const updatedNodes = { ...selectedTree.nodes };
        delete updatedNodes[nodeId];
        // Remove references to deleted node
        Object.values(updatedNodes).forEach(n => {
            if (n.topics) {
                n.topics = n.topics.map(t => t.next === nodeId ? { ...t, next: null } : t);
            }
        });
        handleTreeUpdate({ ...selectedTree, nodes: updatedNodes });
        setSelectedNodeId(null);
        showNotif(`🗑 Deleted node: ${nodeId}`);
    }, [selectedTree, handleTreeUpdate, showNotif]);

    const handleNewTree = useCallback(() => {
        const newId = `new_tree_${Date.now()}`;
        const newTree = {
            id: newId, npcId: 'elena_ross', venue: 'gallery_opening',
            trigger: 'room_talk', entryConditions: null,
            nodes: {
                start: {
                    speaker: 'elena_ross', text: 'Hello there.', topics: [
                        { label: 'Hi!', tone: 'friendly', next: null },
                    ]
                },
            },
            _source: 'new',
        };
        setTrees(prev => [newTree, ...prev]);
        setSelectedTreeId(newId);
        setSelectedNodeId(null);
        showNotif('✅ Created new tree');
    }, [showNotif]);

    const handleExport = useCallback(async () => {
        try {
            await ContentExporter.download('dialogues', 'artlife_dialogues.json');
            showNotif('📥 Exported dialogues with schema');
        } catch (e) {
            showNotif('❌ Export failed: ' + e.message);
        }
    }, [showNotif]);

    const handleHotSwap = useCallback(() => {
        try {
            const parsed = JSON.parse(jsonEdit);
            handleTreeUpdate(parsed);
            showNotif('🔥 Hot-swapped into memory');
        } catch (err) {
            showNotif('❌ JSON Error: ' + err.message);
        }
    }, [jsonEdit, handleTreeUpdate, showNotif]);

    const handleTestTree = useCallback(() => {
        if (!selectedTreeId) return;
        GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'DialogueScene', {
            eventId: selectedTreeId,
            returnScene: 'MainMenuScene',
            returnArgs: {},
        });
    }, [selectedTreeId]);

    // ── Filtered tree list ──
    const filteredTrees = useMemo(() => {
        if (!searchFilter) return trees;
        const q = searchFilter.toLowerCase();
        return trees.filter(t =>
            t.id.toLowerCase().includes(q) ||
            (NPC_MAP[t.npcId] || '').toLowerCase().includes(q) ||
            (t.venue || '').toLowerCase().includes(q)
        );
    }, [trees, searchFilter]);

    // ══════════════════════════════════════════════════════════
    // Render
    // ══════════════════════════════════════════════════════════

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px', background: '#111', borderBottom: '1px solid #333',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <strong style={{ color: '#c9a84c', fontSize: 13 }}>🌳 Dialogue Trees</strong>
                    <span style={{ color: '#555', fontSize: 10 }}>{trees.length} trees</span>
                    {notification && <span style={{ color: '#4ade80', fontSize: 10 }}>{notification}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowJSON(!showJSON)} style={{
                        ...S.btn, borderColor: showJSON ? '#c9a84c' : '#333',
                        color: showJSON ? '#c9a84c' : '#666',
                    }}>{ } JSON</button>
                    <button onClick={handleExport} style={S.btn}>📥 Export</button>
                    <button onClick={handleNewTree} style={{ ...S.btn, borderColor: '#4ade80', color: '#4ade80' }}>+ New Tree</button>
                </div>
            </div>

            {/* Tree Metadata Bar */}
            {selectedTree && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px',
                    background: '#0a0a12', borderBottom: '1px solid #222', fontSize: 10,
                }}>
                    <span style={{ color: '#c9a84c', fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedTree.id}</span>
                    <span style={S.pill('#60a5fa')}>🧑 {NPC_MAP[selectedTree.npcId] || selectedTree.npcId}</span>
                    <span style={S.pill('#aa66cc')}>📍 {selectedTree.venue}</span>
                    <span style={S.pill('#44bb88')}>⚡ {selectedTree.trigger}</span>
                    <span style={{ color: '#444' }}>{Object.keys(selectedTree.nodes || {}).length} nodes</span>
                    <div style={{ flex: 1 }} />
                    <button onClick={handleTestTree} style={{ ...S.btn, borderColor: '#4ade80', color: '#4ade80' }}>▶ Test</button>
                    <button onClick={handleAddNode} style={{ ...S.btn, borderColor: '#88bbdd', color: '#88bbdd' }}>+ Node</button>
                </div>
            )}

            {/* Three-pane layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left: Tree Picker */}
                <div style={{ ...S.panel, flex: '0 0 240px', borderRight: '1px solid #222' }}>
                    <div style={{ padding: '8px 10px' }}>
                        <input value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
                            style={{ ...S.input, fontSize: 10 }}
                            placeholder="🔍 Search trees, NPCs, venues..." />
                    </div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {filteredTrees.map(t => {
                            const nodeCount = Object.keys(t.nodes || {}).length;
                            const npcName = NPC_MAP[t.npcId] || t.npcId;
                            const isSel = selectedTreeId === t.id;
                            return (
                                <div key={t.id} onClick={() => handleSelectTree(t.id)} style={{
                                    padding: '8px 12px', cursor: 'pointer',
                                    borderBottom: '1px solid #111',
                                    background: isSel ? 'rgba(201,168,76,0.08)' : 'transparent',
                                    borderLeft: isSel ? '3px solid #c9a84c' : '3px solid transparent',
                                }}>
                                    <div style={{
                                        fontSize: 11, fontWeight: 'bold',
                                        color: isSel ? '#c9a84c' : '#ddd',
                                        fontFamily: 'monospace',
                                    }}>
                                        {t.id}
                                    </div>
                                    <div style={{ fontSize: 9, color: '#666', marginTop: 3, display: 'flex', gap: 8 }}>
                                        <span>🧑 {npcName}</span>
                                        <span>📍 {t.venue}</span>
                                        <span>💬 {nodeCount}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Center: Node Graph */}
                <div style={{ ...S.panel, flex: 1 }}>
                    {!selectedTree ? (
                        <div style={{ color: '#555', textAlign: 'center', marginTop: 80, fontSize: 13 }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🌳</div>
                            Select a dialogue tree to visualize
                        </div>
                    ) : (
                        <DialogueGraphWrapper
                            tree={selectedTree}
                            selectedNodeId={selectedNodeId}
                            onNodeClick={setSelectedNodeId}
                            onTreeUpdate={handleTreeUpdate}
                        />
                    )}
                </div>

                {/* Right: Property Panel or JSON */}
                <div style={{ ...S.panel, flex: '0 0 320px', borderLeft: '1px solid #222' }}>
                    {showJSON ? (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 10 }}>
                            <div style={{ ...S.sectionHead('#4ade80'), marginTop: 0 }}>RAW JSON</div>
                            <textarea value={jsonEdit} onChange={e => setJsonEdit(e.target.value)}
                                spellCheck={false}
                                style={{
                                    flex: 1, background: '#050508', color: '#4ade80',
                                    border: '1px solid #222', fontFamily: 'monospace', fontSize: 10,
                                    padding: 8, resize: 'none', outline: 'none', borderRadius: 3,
                                }} />
                            <button onClick={handleHotSwap} style={{
                                ...S.btn, marginTop: 8, width: '100%',
                                borderColor: '#c9a84c', color: '#c9a84c',
                            }}>🔥 Hot-Swap Into Memory</button>
                        </div>
                    ) : (
                        <NodePropertyPanel
                            nodeId={selectedNodeId}
                            node={selectedNode}
                            tree={selectedTree || { nodes: {} }}
                            onNodeUpdate={handleNodeUpdate}
                            onClose={() => setSelectedNodeId(null)}
                            onAddNode={handleAddNode}
                            onDeleteNode={handleDeleteNode}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// Re-export for backward compat
export function EventGraphWrapperExport({ event, onNodeClick, editingIdx, onUpdateEvent }) {
    // Convert legacy step-based event to tree format
    const tree = useMemo(() => {
        if (event.nodes) return event;
        const nodes = {};
        (event.steps || []).forEach((step, i) => {
            nodes[`step_${i}`] = {
                speaker: step.speaker, text: step.text,
                topics: step.type === 'choice' && step.choices
                    ? step.choices.map(c => ({ label: c.label || c.text, next: c.nextStep != null ? `step_${c.nextStep}` : null }))
                    : (!step.isEnd ? [{ label: '→', next: `step_${(step.nextStep ?? i + 1)}` }] : []),
                _position: step.position,
            };
        });
        return { ...event, nodes };
    }, [event]);

    return (
        <ReactFlowProvider>
            <DialogueGraph tree={tree} selectedNodeId={null}
                onNodeClick={(id) => onNodeClick(parseInt(id.replace('step_', '')))}
                onTreeUpdate={(t) => {
                    // Convert back to step format if needed
                    if (onUpdateEvent && event.steps) {
                        const steps = Object.entries(t.nodes).map(([nid, n], i) => ({
                            ...n, nodeId: nid, type: (n.topics || []).length > 1 ? 'choice' : 'dialogue',
                            choices: (n.topics || []).length > 1 ? n.topics.map(tp => ({ label: tp.label, nextStep: tp.next ? parseInt(tp.next.replace('step_', '')) : undefined })) : undefined,
                            position: n._position,
                        }));
                        onUpdateEvent(event.id, 'steps', steps);
                    }
                }} />
        </ReactFlowProvider>
    );
}
