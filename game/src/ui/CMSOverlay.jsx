import React, { useState, useEffect } from 'react';
import { EventRegistry } from '../managers/EventRegistry.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';

const mono = '"IBM Plex Mono", "Courier New", monospace';

export default function CMSOverlay({ onClose }) {
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [jsonStr, setJsonStr] = useState('');
    const [parseError, setParseError] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setEvents(EventRegistry.jsonEvents || []);
        requestAnimationFrame(() => setVisible(true));

        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleSelect = (id) => {
        setSelectedEventId(id);
        const ev = events.find(e => e.id === id);
        if (ev) {
            setJsonStr(JSON.stringify(ev, null, 4));
            setParseError(null);
        }
    };

    const handleJsonChange = (e) => {
        const val = e.target.value;
        setJsonStr(val);
        try {
            const parsed = JSON.parse(val);
            setParseError(null);

            // Hot swap in memory
            const updatedEvents = events.map(ev => ev.id === parsed.id ? parsed : ev);
            setEvents(updatedEvents);
            EventRegistry.jsonEvents = updatedEvents;
        } catch (err) {
            setParseError(err.message);
        }
    };

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 4));
        const anchor = document.createElement('a');
        anchor.href = dataStr;
        anchor.download = "events.json";
        anchor.click();
    };

    const handleTestEvent = () => {
        if (!selectedEventId) return;
        GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'DialogueScene', { eventId: selectedEventId });
        onClose(); // Hide CMS to see the scene
    }

    const selectedEvent = events.find(e => e.id === selectedEventId);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(10, 10, 15, 0.98)', color: '#eaeaea', fontFamily: mono,
            display: 'flex', flexDirection: 'column',
            opacity: visible ? 1 : 0, transition: 'opacity 0.2s',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
                <div>
                    <span style={{ color: '#c9a84c', fontSize: 18, fontWeight: 'bold' }}>EVENT CMS VISUALIZER</span>
                    <span style={{ color: '#777', fontSize: 12, marginLeft: 16 }}>Live memory editing</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleDownload} style={{ background: '#111', color: '#c9a84c', border: '1px solid #c9a84c', padding: '4px 12px', cursor: 'pointer', fontFamily: mono, fontSize: 12 }}>
                        [ DOWNLOAD JSON ]
                    </button>
                    <button onClick={onClose} style={{ background: 'none', border: '1px solid #555', color: '#888', padding: '4px 12px', cursor: 'pointer', fontFamily: mono, fontSize: 12 }}>
                        [ ESC ] CLOSE
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left: Sidebar List */}
                <div style={{ width: 250, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', fontSize: 11, color: '#c9a84c', fontWeight: 'bold' }}>
                        EVENTS ({events.length})
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {events.map(ev => (
                            <div key={ev.id} onClick={() => handleSelect(ev.id)} style={{
                                padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #1a1a2e',
                                background: selectedEventId === ev.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                                borderLeft: selectedEventId === ev.id ? '3px solid #c9a84c' : '3px solid transparent',
                            }}>
                                <div style={{ fontSize: 13, color: selectedEventId === ev.id ? '#c9a84c' : '#eaeaea' }}>{ev.id}</div>
                                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{ev.category}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: Graph Visualizer */}
                <div style={{ flex: 2, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', background: '#050508' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', fontSize: 11, color: '#c9a84c', fontWeight: 'bold' }}>
                        NODE MAP {selectedEventId ? `— ${selectedEvent?.title}` : ''}
                    </div>
                    <div style={{ flex: 1, position: 'relative', overflow: 'auto', padding: 20 }}>
                        {!selectedEvent ? (
                            <div style={{ color: '#555', marginTop: 40, textAlign: 'center' }}>Select an event to visualize.</div>
                        ) : (
                            <EventGraph event={selectedEvent} />
                        )}
                    </div>
                </div>

                {/* Right: Live Editor */}
                <div style={{ flex: 1, minWidth: 400, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#c9a84c', fontWeight: 'bold' }}>LIVE EDITOR</span>
                        <button onClick={handleTestEvent} style={{ background: '#c9a84c', color: '#000', border: 'none', padding: '4px 12px', cursor: 'pointer', fontFamily: mono, fontSize: 11, fontWeight: 'bold' }}>
                            [ TEST IN-GAME ]
                        </button>
                    </div>
                    {parseError && (
                        <div style={{ padding: '8px 16px', background: '#4a1111', color: '#ffaaaa', fontSize: 11, borderBottom: '1px solid #ff4444' }}>
                            JSON Error: {parseError}
                        </div>
                    )}
                    <textarea
                        value={jsonStr}
                        onChange={handleJsonChange}
                        spellCheck={false}
                        style={{
                            flex: 1, background: '#0a0a0f', color: '#4ade80', fontFamily: mono, fontSize: 12,
                            padding: 16, border: 'none', resize: 'none', outline: 'none', lineHeight: 1.5,
                        }}
                        placeholder="Select an event to edit its JSON payload natively..."
                    />
                </div>
            </div>
        </div>
    );
}

// ── Simple SVG/Flexbox Node Graph Visualizer ──
function EventGraph({ event }) {
    if (!event.steps || event.steps.length === 0) return <div style={{ color: '#555', textAlign: 'center' }}>No steps found.</div>;

    const nodeW = 220;
    const nodeH = 100;
    const gapY = 40;
    const gapX = 40;

    // Build rudimentary layout
    const nodes = event.steps.map((step, idx) => {
        return {
            ...step,
            index: idx,
            x: 0,
            y: idx * (nodeH + gapY),
        };
    });

    const maxH = nodes.length * (nodeH + gapY);

    return (
        <div style={{ position: 'relative', width: '100%', height: Math.max(800, maxH), paddingBottom: 100 }}>
            {nodes.map(node => (
                <div key={node.index} style={{
                    position: 'absolute', left: node.x, top: node.y, width: nodeW, height: nodeH,
                    background: node.type === 'choice' ? '#1a1a2e' : '#111',
                    border: `1px solid ${node.type === 'choice' ? '#88bbdd' : '#c9a84c'}`,
                    borderRadius: 4, padding: 12, boxSizing: 'border-box',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ fontSize: 10, color: '#888', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Step {node.index}</span>
                        <strong style={{ color: node.type === 'choice' ? '#88bbdd' : '#c9a84c' }}>{node.type.toUpperCase()}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#eaeaea', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        "{node.text}"
                    </div>
                    {node.statChange && (
                        <div style={{ fontSize: 9, color: '#ff9999', marginTop: 4 }}>+Stat Change</div>
                    )}
                    {node.isEnd && (
                        <div style={{ fontSize: 9, color: '#c94040', marginTop: 4, fontWeight: 'bold' }}>[ END SCENE ]</div>
                    )}
                </div>
            ))}

            {/* Draw SVG connections between steps */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <defs>
                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="#888" />
                    </marker>
                </defs>
                {nodes.map(node => {
                    if (node.isEnd) return null;
                    const lines = [];
                    const startX = node.x + nodeW / 2;
                    const startY = node.y + nodeH;

                    if (node.type === 'choice' && node.choices) {
                        node.choices.forEach((c, i) => {
                            const next = nodes[c.nextStep || (node.index + 1)];
                            if (next) {
                                lines.push(<line key={i} x1={startX} y1={startY} x2={next.x + nodeW / 2} y2={next.y} stroke="#88bbdd" strokeWidth={1.5} markerEnd="url(#arrow)" />);
                            }
                        });
                    } else {
                        const next = nodes[node.index + 1];
                        if (next) {
                            lines.push(<line key="next" x1={startX} y1={startY} x2={next.x + nodeW / 2} y2={next.y} stroke="#888" strokeWidth={1.5} markerEnd="url(#arrow)" />);
                        }
                    }
                    return lines;
                })}
            </svg>
        </div>
    );
}
