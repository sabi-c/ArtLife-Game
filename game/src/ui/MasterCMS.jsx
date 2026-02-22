import React, { useState, useEffect } from 'react';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';

// Sub-components that we will build out
import StorylineEditor from './cms/StorylineEditor.jsx';
import EventEditor from './cms/EventEditor.jsx';
import NPCEditor from './cms/NPCEditor.jsx';
import ArtworkEditor from './cms/ArtworkEditor.jsx';
import VenueEditor from './cms/VenueEditor.jsx';
import DataIngestion from './cms/DataIngestion.jsx';
import KanbanBoard from './cms/KanbanBoard.jsx';

const TABS = [
    { id: 'board', icon: '📋', label: 'Project Board' },
    { id: 'storylines', icon: '⛓️', label: 'Storylines' },
    { id: 'events', icon: '🌳', label: 'Events / Dialogue' },
    { id: 'npcs', icon: '👤', label: 'NPCs & Roles' },
    { id: 'artworks', icon: '🖼️', label: 'Artworks / Market' },
    { id: 'venues', icon: '🏢', label: 'Venues / Map' },
    { id: 'ingest', icon: '🤖', label: 'AI Ingestion Port' },
];

export default function MasterCMS({ onClose }) {
    const [activeTab, setActiveTab] = useState('board');

    // Close on ESC
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'board': return <KanbanBoard />;
            case 'storylines': return <StorylineEditor />;
            case 'events': return <EventEditor />;
            case 'npcs': return <NPCEditor />;
            case 'artworks': return <ArtworkEditor />;
            case 'venues': return <VenueEditor />;
            case 'ingest': return <DataIngestion />;
            default: return null;
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: '#050508', color: '#eaeaea',
            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Header */}
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px', background: '#111', borderBottom: '1px solid #333'
            }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                    <h1 style={{ margin: 0, color: '#c9a84c', fontSize: 18, letterSpacing: 2 }}>
                        MASTER CMS
                    </h1>
                    <span style={{ color: '#666', fontSize: 12 }}>
                        Visual Database Editor
                    </span>
                </div>
                <div>
                    <button onClick={onClose} style={{
                        background: 'transparent', color: '#888', border: '1px solid #444',
                        padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12
                    }}>
                        [ ESC ] CLOSE
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Sidebar Navigation */}
                <nav style={{
                    width: '240px', background: 'rgba(0,0,0,0.5)',
                    borderRight: '1px solid #333', display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ padding: '16px', color: '#666', fontSize: 10, letterSpacing: 1, borderBottom: '1px solid #222' }}>
                        DATABASE DOMAINS
                    </div>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                background: activeTab === tab.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                                color: activeTab === tab.id ? '#c9a84c' : '#aaa',
                                border: 'none', borderLeft: activeTab === tab.id ? '3px solid #c9a84c' : '3px solid transparent',
                                borderBottom: '1px solid #1a1a2e', padding: '16px', cursor: 'pointer',
                                textAlign: 'left', display: 'flex', gap: '12px', alignItems: 'center',
                                fontFamily: 'inherit', fontSize: 13, transition: 'all 0.1s'
                            }}
                        >
                            <span style={{ fontSize: 16 }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Main Content Area */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {renderTabContent()}
                </main>
            </div>
        </div>
    );
}
