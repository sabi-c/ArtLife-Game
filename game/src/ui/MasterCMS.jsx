import React, { useState, useEffect, useRef } from 'react';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { useCmsStore } from '../stores/cmsStore.js';

// Sub-components
import StorylineEditor from './cms/StorylineEditor.jsx';
import EventEditor from './cms/EventEditor.jsx';
import NPCEditor from './cms/NPCEditor.jsx';
import ArtworkEditor from './cms/ArtworkEditor.jsx';
import VenueEditor from './cms/VenueEditor.jsx';
import DataIngestion from './cms/DataIngestion.jsx';
import KanbanBoard from './cms/KanbanBoard.jsx';
import TimelineCalendar from './cms/TimelineCalendar.jsx';
import HaggleEditor from './cms/HaggleEditor.jsx';

const TABS = [
    { id: 'board', icon: '📋', label: 'Project Board' },
    { id: 'timeline', icon: '📅', label: 'Timeline' },
    { id: 'storylines', icon: '⛓️', label: 'Storylines' },
    { id: 'events', icon: '🌳', label: 'Events / Dialogue' },
    { id: 'npcs', icon: '👤', label: 'NPCs & Roles' },
    { id: 'artworks', icon: '🖼️', label: 'Artworks / Market' },
    { id: 'haggle', icon: '⚔️', label: 'Haggle Battles' },
    { id: 'venues', icon: '🏢', label: 'Venues / Map' },
    { id: 'ingest', icon: '🤖', label: 'AI Ingestion Port' },
];

export default function MasterCMS({ onClose }) {
    const [activeTab, setActiveTab] = useState('board');
    const [saveFlash, setSaveFlash] = useState(null);
    const fileInputRef = useRef(null);

    const hasUnsaved = useCmsStore(s => s.hasUnsavedChanges());
    const dirtyDomains = useCmsStore(s => s.getDirtyDomains());
    const lastSaveTime = useCmsStore(s => s.lastSaveTime);
    const saveAll = useCmsStore(s => s.saveAll);
    const exportBundle = useCmsStore(s => s.exportBundle);
    const importBundle = useCmsStore(s => s.importBundle);
    const startAutoSave = useCmsStore(s => s.startAutoSave);
    const stopAutoSave = useCmsStore(s => s.stopAutoSave);

    // Start auto-save on mount
    useEffect(() => {
        startAutoSave();
        return () => stopAutoSave();
    }, []);

    // Close on ESC — with unsaved changes warning
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (hasUnsaved) {
                    const ok = window.confirm('You have unsaved CMS changes. Save before closing?');
                    if (ok) saveAll();
                }
                onClose();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, hasUnsaved, saveAll]);

    const handleSave = () => {
        const ok = saveAll();
        setSaveFlash(ok ? '✅ Saved' : '❌ Save failed');
        setTimeout(() => setSaveFlash(null), 2500);
    };

    const handleExport = () => {
        exportBundle();
        setSaveFlash('📦 Exported');
        setTimeout(() => setSaveFlash(null), 2500);
    };

    const handleImport = () => {
        fileInputRef.current?.click();
    };

    const handleImportFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const ok = importBundle(ev.target.result);
            setSaveFlash(ok ? '📥 Imported' : '❌ Import failed');
            setTimeout(() => setSaveFlash(null), 2500);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const formatSaveTime = (ts) => {
        if (!ts) return 'never';
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'board': return <KanbanBoard />;
            case 'timeline': return <TimelineCalendar />;
            case 'storylines': return <StorylineEditor />;
            case 'events': return <EventEditor />;
            case 'npcs': return <NPCEditor />;
            case 'artworks': return <ArtworkEditor />;
            case 'haggle': return <HaggleEditor />;
            case 'venues': return <VenueEditor />;
            case 'ingest': return <DataIngestion />;
            default: return null;
        }
    };

    const btnStyle = {
        background: 'transparent', border: '1px solid #444', color: '#aaa',
        padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
        transition: 'all 0.15s',
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
                padding: '10px 20px', background: '#111', borderBottom: '1px solid #333'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h1 style={{ margin: 0, color: '#c9a84c', fontSize: 18, letterSpacing: 2 }}>
                        MASTER CMS
                    </h1>
                    {/* Save status indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                            background: hasUnsaved ? '#ff6b35' : '#4caf50',
                            boxShadow: hasUnsaved ? '0 0 6px #ff6b35' : '0 0 4px #4caf50',
                        }} />
                        <span style={{ color: '#666', fontSize: 11 }}>
                            {hasUnsaved
                                ? `Unsaved: ${dirtyDomains.join(', ')}`
                                : `Saved ${formatSaveTime(lastSaveTime)}`
                            }
                        </span>
                    </div>
                    {saveFlash && (
                        <span style={{ color: '#4caf50', fontSize: 12, fontWeight: 'bold' }}>
                            {saveFlash}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={handleSave} style={{
                        ...btnStyle,
                        borderColor: hasUnsaved ? '#c9a84c' : '#444',
                        color: hasUnsaved ? '#c9a84c' : '#666',
                    }}>
                        💾 Save All
                    </button>
                    <button onClick={handleExport} style={btnStyle}>
                        📦 Export
                    </button>
                    <button onClick={handleImport} style={btnStyle}>
                        📥 Import
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        style={{ display: 'none' }}
                    />
                    <div style={{ width: 1, height: 20, background: '#333', margin: '0 4px' }} />
                    <button onClick={() => {
                        if (hasUnsaved) {
                            const ok = window.confirm('Save unsaved changes before closing?');
                            if (ok) saveAll();
                        }
                        onClose();
                    }} style={{
                        ...btnStyle, color: '#888',
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
