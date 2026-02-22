import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { EventRegistry } from '../../managers/EventRegistry.js';
import { useStorylineStore } from '../../stores/storylineStore.js';
import { useCmsStore } from '../../stores/cmsStore.js';

/**
 * TimelineCalendar.jsx — 26-Week Storyboard View
 * 
 * Displays all game content mapped across the 26-week game timeline.
 * Content types: storyline steps, random events, market events.
 * Cards are color-coded and drag-and-drop between weeks.
 */

// ── Color Palette ──
const COLORS = {
    storyline: { bg: 'rgba(201,168,76,0.15)', border: '#c9a84c', text: '#c9a84c' },
    event: { bg: 'rgba(136,187,221,0.15)', border: '#88bbdd', text: '#88bbdd' },
    npc: { bg: 'rgba(74,222,128,0.15)', border: '#4ade80', text: '#4ade80' },
    market: { bg: 'rgba(201,64,64,0.15)', border: '#c94040', text: '#c94040' },
    milestone: { bg: 'rgba(167,139,250,0.15)', border: '#a78bfa', text: '#a78bfa' },
};

const CATEGORY_ICONS = {
    storyline: '⛓️',
    event: '🌳',
    npc: '👤',
    market: '📊',
    milestone: '🏁',
};

// ── Card Component ──
function TimelineCard({ item, index, onClick }) {
    const colorSet = COLORS[item.type] || COLORS.event;

    return (
        <Draggable draggableId={item.dragId} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onClick?.(item)}
                    style={{
                        ...provided.draggableProps.style,
                        background: snapshot.isDragging
                            ? colorSet.border + '33'
                            : colorSet.bg,
                        border: `1px solid ${snapshot.isDragging ? colorSet.border : colorSet.border + '66'}`,
                        borderRadius: 4,
                        padding: '6px 8px',
                        marginBottom: 4,
                        cursor: 'grab',
                        transition: 'box-shadow 0.15s',
                        boxShadow: snapshot.isDragging ? `0 0 12px ${colorSet.border}44` : 'none',
                    }}
                >
                    <div style={{
                        fontSize: 9, color: colorSet.text, textTransform: 'uppercase',
                        letterSpacing: 0.5, marginBottom: 2, display: 'flex', gap: 4, alignItems: 'center',
                    }}>
                        <span>{CATEGORY_ICONS[item.type] || '📄'}</span>
                        <span>{item.type}</span>
                    </div>
                    <div style={{
                        fontSize: 11, color: '#eaeaea', fontWeight: 'bold',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: 130,
                    }}>
                        {item.title}
                    </div>
                    {item.subtitle && (
                        <div style={{
                            fontSize: 9, color: '#888', marginTop: 2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            maxWidth: 130,
                        }}>
                            {item.subtitle}
                        </div>
                    )}
                </div>
            )}
        </Draggable>
    );
}

// ── Week Column ──
function WeekColumn({ weekNum, items, currentWeek, onCardClick }) {
    const isCurrentWeek = weekNum === currentWeek;
    const isPast = weekNum < currentWeek;
    const isMilestone = weekNum === 1 || weekNum === 13 || weekNum === 26;

    return (
        <Droppable droppableId={`week-${weekNum}`}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                        minWidth: 160,
                        maxWidth: 160,
                        background: snapshot.isDraggingOver
                            ? 'rgba(201,168,76,0.08)'
                            : isCurrentWeek
                                ? 'rgba(74,222,128,0.05)'
                                : isPast
                                    ? 'rgba(255,255,255,0.01)'
                                    : 'rgba(255,255,255,0.02)',
                        borderRight: '1px solid #1a1a2e',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'background 0.15s',
                    }}
                >
                    {/* Week Header */}
                    <div style={{
                        padding: '8px 10px',
                        borderBottom: isCurrentWeek ? '2px solid #4ade80' : '1px solid #222',
                        background: isCurrentWeek ? 'rgba(74,222,128,0.1)' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 36,
                    }}>
                        <span style={{
                            fontSize: 12,
                            fontWeight: 'bold',
                            color: isCurrentWeek ? '#4ade80' : isPast ? '#555' : '#aaa',
                        }}>
                            W{weekNum}
                        </span>
                        {isMilestone && (
                            <span style={{ fontSize: 8, color: '#a78bfa', textTransform: 'uppercase' }}>
                                {weekNum === 1 ? 'START' : weekNum === 13 ? 'MID' : 'END'}
                            </span>
                        )}
                        {isCurrentWeek && (
                            <span style={{ fontSize: 8, color: '#4ade80', fontWeight: 'bold' }}>NOW</span>
                        )}
                        {items.length > 0 && (
                            <span style={{
                                fontSize: 9, color: '#888',
                                background: '#1a1a2e', padding: '1px 5px', borderRadius: 8,
                            }}>
                                {items.length}
                            </span>
                        )}
                    </div>

                    {/* Cards */}
                    <div style={{
                        flex: 1, padding: '6px 6px', overflowY: 'auto',
                        minHeight: 80,
                    }}>
                        {items.map((item, idx) => (
                            <TimelineCard
                                key={item.dragId}
                                item={item}
                                index={idx}
                                onClick={onCardClick}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                </div>
            )}
        </Droppable>
    );
}

// ── Detail Panel ──
function DetailPanel({ item, onClose }) {
    if (!item) return (
        <div style={{
            padding: 20, color: '#555', textAlign: 'center', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
        }}>
            Click a card to view details
        </div>
    );

    const colorSet = COLORS[item.type] || COLORS.event;

    return (
        <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[item.type]}</span>
                    <span style={{
                        fontSize: 9, textTransform: 'uppercase', letterSpacing: 1,
                        color: colorSet.text, background: colorSet.bg,
                        padding: '2px 8px', borderRadius: 4, border: `1px solid ${colorSet.border}`,
                    }}>
                        {item.type}
                    </span>
                </div>
                <button onClick={onClose} style={{
                    background: 'transparent', border: '1px solid #333', color: '#666',
                    padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
                }}>
                    ✕
                </button>
            </div>

            <h3 style={{ color: '#eaeaea', fontSize: 16, margin: '0 0 8px 0' }}>
                {item.title}
            </h3>

            {item.subtitle && (
                <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>{item.subtitle}</div>
            )}

            <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid #222',
                borderRadius: 4, padding: 12, fontSize: 11, color: '#aaa',
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '6px 12px' }}>
                    <span style={{ color: '#666' }}>ID:</span>
                    <span style={{ color: '#fff', fontFamily: 'monospace' }}>{item.id}</span>
                    <span style={{ color: '#666' }}>Week:</span>
                    <span style={{ color: '#fff' }}>W{item.week}</span>
                    {item.eventId && (
                        <>
                            <span style={{ color: '#666' }}>Event ID:</span>
                            <span style={{ color: '#88bbdd', fontFamily: 'monospace' }}>{item.eventId}</span>
                        </>
                    )}
                    {item.storylineId && (
                        <>
                            <span style={{ color: '#666' }}>Storyline:</span>
                            <span style={{ color: '#c9a84c', fontFamily: 'monospace' }}>{item.storylineId}</span>
                        </>
                    )}
                    {item.category && (
                        <>
                            <span style={{ color: '#666' }}>Category:</span>
                            <span>{item.category}</span>
                        </>
                    )}
                </div>
            </div>

            {item.raw && (
                <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>
                        RAW DATA
                    </div>
                    <pre style={{
                        background: '#050508', border: '1px solid #222', borderRadius: 4,
                        padding: 10, fontSize: 10, color: '#4caf50', overflow: 'auto',
                        maxHeight: 200, margin: 0,
                    }}>
                        {JSON.stringify(item.raw, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function TimelineCalendar() {
    const [selectedItem, setSelectedItem] = useState(null);
    const [filter, setFilter] = useState('all');
    const markDirty = useCmsStore(s => s.markDirty);
    const saveTimelineOverride = useCmsStore(s => s.saveTimelineOverride);
    const timelineOverrides = useCmsStore(s => s.getTimelineOverrides());

    // Get current game week (fallback to 1)
    const currentWeek = window._artLifeState?.week || 1;

    // ── Aggregate all content into timeline items ──
    const allItems = useMemo(() => {
        const items = [];
        let dragIdx = 0;

        // 1. Storylines → map each step to its scheduled week
        const storylines = EventRegistry.getStorylines?.() || [];
        for (const sl of storylines) {
            let cumulativeWeek = 0;
            for (let i = 0; i < (sl.steps || []).length; i++) {
                const step = sl.steps[i];
                cumulativeWeek += (step.delayWeeks || 1);

                // Check for overrides
                const overrideKey = `sl_${sl.id}_step_${i}`;
                const week = timelineOverrides[overrideKey] ?? cumulativeWeek;

                items.push({
                    dragId: `timeline-${dragIdx++}`,
                    id: overrideKey,
                    type: 'storyline',
                    title: sl.title || sl.id,
                    subtitle: `Step ${i + 1}: ${step.eventId || 'unnamed'}`,
                    week: Math.min(Math.max(week, 1), 26),
                    eventId: step.eventId,
                    storylineId: sl.id,
                    stepIndex: i,
                    raw: step,
                });
            }
        }

        // 2. Events → place by minWeek or frequency
        const events = EventRegistry.jsonEvents || [];
        for (const evt of events) {
            const overrideKey = `evt_${evt.id}`;
            const minWeek = evt.frequency?.[0] || 1;
            const week = timelineOverrides[overrideKey] ?? minWeek;

            items.push({
                dragId: `timeline-${dragIdx++}`,
                id: overrideKey,
                type: evt.category === 'market' ? 'market' : 'event',
                title: evt.title || evt.id,
                subtitle: evt.category || '',
                week: Math.min(Math.max(week, 1), 26),
                category: evt.category,
                raw: evt,
            });
        }

        // 3. Milestone markers
        items.push({
            dragId: `timeline-${dragIdx++}`,
            id: 'milestone_start', type: 'milestone',
            title: 'Game Start', subtitle: 'Week 1', week: 1,
        });
        items.push({
            dragId: `timeline-${dragIdx++}`,
            id: 'milestone_mid', type: 'milestone',
            title: 'Midpoint', subtitle: 'Halfway checkpoint', week: 13,
        });
        items.push({
            dragId: `timeline-${dragIdx++}`,
            id: 'milestone_end', type: 'milestone',
            title: 'The Reckoning', subtitle: 'Endgame triggers', week: 26,
        });

        return items;
    }, [timelineOverrides]);

    // ── Group items by week ──
    const weekBuckets = useMemo(() => {
        const buckets = {};
        for (let w = 1; w <= 26; w++) buckets[w] = [];

        const filtered = filter === 'all'
            ? allItems
            : allItems.filter(item => item.type === filter);

        for (const item of filtered) {
            const w = Math.min(Math.max(item.week, 1), 26);
            buckets[w].push(item);
        }
        return buckets;
    }, [allItems, filter]);

    // ── Handle drag-and-drop ──
    const handleDragEnd = useCallback((result) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newWeek = parseInt(destination.droppableId.replace('week-', ''), 10);
        const item = allItems.find(i => i.dragId === draggableId);
        if (!item) return;

        // Don't allow dragging milestones
        if (item.type === 'milestone') return;

        // Save the override
        saveTimelineOverride(item.id, newWeek);
        markDirty('timeline');

        console.log(`[Timeline] Moved "${item.title}" to Week ${newWeek}`);
    }, [allItems, saveTimelineOverride, markDirty]);

    // ── Stats ──
    const stats = useMemo(() => {
        const counts = { storyline: 0, event: 0, market: 0, milestone: 0 };
        allItems.forEach(item => { counts[item.type] = (counts[item.type] || 0) + 1; });
        return counts;
    }, [allItems]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', background: '#111', borderBottom: '1px solid #333',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ color: '#c9a84c', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 }}>
                        📅 26-WEEK STORYBOARD
                    </span>
                    <span style={{ color: '#555', fontSize: 11 }}>
                        {allItems.length} items · W{currentWeek} active
                    </span>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 6 }}>
                    {[
                        { key: 'all', label: 'All', color: '#888' },
                        { key: 'storyline', label: `⛓️ ${stats.storyline}`, color: COLORS.storyline.text },
                        { key: 'event', label: `🌳 ${stats.event}`, color: COLORS.event.text },
                        { key: 'market', label: `📊 ${stats.market}`, color: COLORS.market.text },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            style={{
                                background: filter === f.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                                border: `1px solid ${filter === f.key ? f.color : '#333'}`,
                                color: filter === f.key ? f.color : '#666',
                                padding: '3px 10px', borderRadius: 4,
                                cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                                transition: 'all 0.1s',
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timeline Grid + Detail Panel */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Scrollable Timeline */}
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div style={{
                        flex: 1, overflowX: 'auto', overflowY: 'hidden',
                        display: 'flex', flexDirection: 'row',
                        background: '#0a0a12',
                    }}>
                        {Array.from({ length: 26 }, (_, i) => i + 1).map(weekNum => (
                            <WeekColumn
                                key={weekNum}
                                weekNum={weekNum}
                                items={weekBuckets[weekNum] || []}
                                currentWeek={currentWeek}
                                onCardClick={setSelectedItem}
                            />
                        ))}
                    </div>
                </DragDropContext>

                {/* Detail Sidebar */}
                <div style={{
                    width: 280, minWidth: 280, borderLeft: '1px solid #333',
                    background: 'rgba(0,0,0,0.4)', overflow: 'hidden',
                }}>
                    <DetailPanel
                        item={selectedItem}
                        onClose={() => setSelectedItem(null)}
                    />
                </div>
            </div>
        </div>
    );
}
