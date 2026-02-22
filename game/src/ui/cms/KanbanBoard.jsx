import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useContentStore, CATEGORY_META } from '../../stores/contentStore.js';

// Styles
const mono = '"IBM Plex Mono", "Courier New", monospace';

const boardStyle = {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    overflowX: 'auto',
    height: '100%',
    background: '#0a0a0f',
};

const columnStyle = {
    background: '#111',
    border: '1px solid #2a2a3e',
    borderRadius: '4px',
    width: '320px',
    minWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
};

const columnHeaderStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid #2a2a3e',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#1a1a2e'
};

const cardStyle = (isDragging, color) => ({
    background: isDragging ? '#1a1a2e' : '#0a0a14',
    border: `1px solid ${isDragging ? color : '#333'}`,
    borderLeft: `4px solid ${color}`,
    padding: '12px',
    marginBottom: '8px',
    borderRadius: '4px',
    cursor: 'grab',
    transition: 'background 0.2s',
    boxShadow: isDragging ? `0 4px 12px ${color}33` : 'none',
    opacity: isDragging ? 0.9 : 1,
});

const CARD_COLORS = {
    storyline: '#c9a84c',
    event: '#88bbdd',
    npc: '#4ade80',
    artwork: '#c94040',
    venue: '#a78bfa',
    default: '#888'
};

// ── Main Component ──

export default function KanbanBoard() {
    const { entities, load, loaded, loading, error } = useContentStore();
    const [columns, setColumns] = useState({});

    // Load CMS Content on Mount
    useEffect(() => {
        if (!loaded && !loading) load();
    }, [load, loaded, loading]);

    // Group entities into columns by Category
    useEffect(() => {
        if (!loaded) return;

        const defaultCategories = Object.keys(CATEGORY_META);
        const grouped = { UNASSIGNED: [] };

        defaultCategories.forEach(cat => grouped[cat] = []);

        entities.forEach(entity => {
            if (entity.category && grouped[entity.category]) {
                grouped[entity.category].push(entity);
            } else {
                grouped['UNASSIGNED'].push(entity);
            }
        });

        // Filter out empty columns to keep board readable, except for core categories
        const filteredGrouped = {};
        Object.entries(grouped).forEach(([key, items]) => {
            if (items.length > 0 || defaultCategories.includes(key)) {
                filteredGrouped[key] = items;
            }
        });

        setColumns(filteredGrouped);
    }, [entities, loaded]);

    const onDragEnd = useCallback((result) => {
        const { source, destination, draggableId } = result;

        // Dropped outside a list
        if (!destination) return;

        // Same list, same position
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        // Deep copy state
        const sourceCol = [...columns[source.droppableId]];
        const destCol = [...columns[destination.droppableId]];
        const [movedItem] = sourceCol.splice(source.index, 1);

        // Update in UI state instantly
        if (source.droppableId === destination.droppableId) {
            sourceCol.splice(destination.index, 0, movedItem);
            setColumns({ ...columns, [source.droppableId]: sourceCol });
        } else {
            // Moved to a new category!
            destCol.splice(destination.index, 0, movedItem);
            setColumns({
                ...columns,
                [source.droppableId]: sourceCol,
                [destination.droppableId]: destCol,
            });

            // Update the entity's category in the content store
            useContentStore.setState(state => {
                const entity = state.entities.find(e => e.id === movedItem.id);
                if (entity) entity.category = destination.droppableId;
            });
        }
    }, [columns]);

    if (loading) return <div style={{ color: '#888', padding: 20 }}>Loading Project Board...</div>;
    if (error) return <div style={{ color: '#c94040', padding: 20 }}>Error: {error}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #333', background: '#111', color: '#888', fontSize: 11, fontFamily: mono }}>
                Drag and drop content chunks to reorganize their structural flow within the game's architecture.
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div style={boardStyle}>
                    {Object.entries(columns).map(([colId, items]) => {
                        const meta = CATEGORY_META[colId] || { color: '#888', icon: '📁', label: colId };

                        return (
                            <div key={colId} style={columnStyle}>
                                <div style={{ ...columnHeaderStyle, color: meta.color }}>
                                    <span>{meta.icon} {meta.label || colId}</span>
                                    <span style={{ fontSize: 10, background: '#111', padding: '2px 6px', borderRadius: 10, border: '1px solid #333' }}>
                                        {items.length}
                                    </span>
                                </div>

                                <Droppable droppableId={colId}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            style={{
                                                flex: 1, padding: '12px', overflowY: 'auto',
                                                background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.02)' : 'transparent',
                                                transition: 'background 0.2s', minHeight: '100px'
                                            }}
                                        >
                                            {items.map((item, index) => {
                                                const itemColor = CATEGORY_META[item.category]?.color || CARD_COLORS[item.type] || CARD_COLORS.default;
                                                return (
                                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    ...cardStyle(snapshot.isDragging, itemColor)
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                                                    <div style={{ color: '#eaeaea', fontWeight: 'bold', fontSize: 12, fontFamily: mono }}>
                                                                        {item.title || item.name || item.id}
                                                                    </div>
                                                                    <div style={{ color: itemColor, fontSize: 9, textTransform: 'uppercase', background: '#111', padding: '2px 4px', borderRadius: 2 }}>
                                                                        {item.type}
                                                                    </div>
                                                                </div>
                                                                {(item.description || item.bio) && (
                                                                    <div style={{ color: '#888', fontSize: 10, lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                        {item.description || item.bio}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>
        </div>
    );
}
