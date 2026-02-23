import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { useCmsStore } from '../stores/cmsStore.js';
import { EventRegistry } from '../managers/EventRegistry.js';
import { useNPCStore } from '../stores/npcStore.js';
import { useContentStore } from '../stores/contentStore.js';

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
import MarketSimDashboard from './cms/MarketSimDashboard.jsx';
import ArtTerminal from './cms/ArtTerminal.jsx';
import ActivityLogViewer from './cms/ActivityLogViewer.jsx';
import DataHub from './cms/DataHub.jsx';

const TABS = [
    { id: 'board', icon: '📋', label: 'Project Board', dirtyDomain: 'kanban' },
    { id: 'timeline', icon: '📅', label: 'Timeline', dirtyDomain: 'timeline' },
    { id: 'storylines', icon: '⛓️', label: 'Storylines', dirtyDomain: 'storylines' },
    { id: 'events', icon: '🎭', label: 'Events / Dialogue', dirtyDomain: 'events' },
    { id: 'npcs', icon: '👤', label: 'NPCs & Roles', dirtyDomain: 'npcs' },
    { id: 'artworks', icon: '🎨', label: 'Artworks / Market', dirtyDomain: 'artworks' },
    { id: 'haggle', icon: '⚔️', label: 'Haggle Battles', dirtyDomain: 'haggle' },
    { id: 'marketsim', icon: '📊', label: 'Market Sim', dirtyDomain: 'market' },
    { id: 'terminal', icon: '📡', label: 'Live Terminal' },
    { id: 'venues', icon: '🏢', label: 'Venues / Map', dirtyDomain: 'maps' },
    { id: 'actlog', icon: '📋', label: 'Activity Log' },
    { id: 'ingest', icon: '📦', label: 'Data Hub' },
];

export default function MasterCMS({ onClose }) {
    const [activeTab, setActiveTab] = useState('board');
    const [saveFlash, setSaveFlash] = useState(null);
    const [closeModal, setCloseModal] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const fileInputRef = useRef(null);

    // ── Responsive detection ──
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e) => {
            setIsMobile(e.matches);
            if (e.matches) setSidebarOpen(false);
        };
        handler(mq);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // ── FIXED: Select raw state, derive values with useMemo ──
    const dirty = useCmsStore(s => s.dirty);
    const lastSaveTime = useCmsStore(s => s.lastSaveTime);

    const hasUnsaved = useMemo(() => Object.values(dirty).some(Boolean), [dirty]);
    const dirtyDomains = useMemo(
        () => Object.entries(dirty).filter(([, d]) => d).map(([k]) => k),
        [dirty]
    );

    // Start auto-save on mount + load content store for counts
    useEffect(() => {
        useCmsStore.getState().startAutoSave();
        useContentStore.getState().load();
    }, []);

    // ── Entity Counts for sidebar badges ──
    const entityCounts = useMemo(() => {
        const events = EventRegistry.jsonEvents || [];
        const storylines = EventRegistry.jsonStorylines || [];
        const npcs = useNPCStore.getState().contacts || [];
        return {
            board: null, // Project Board — no count
            timeline: null,
            storylines: storylines.length || null,
            events: events.length || null,
            npcs: npcs.length || null,
            artworks: null, // computed lazily
            haggle: null,
            marketsim: null,
            venues: null,
            actlog: null,
            ingest: null,
        };
    }, [activeTab]); // recompute when switching tabs (cheap)

    // ── Global Search ──
    const [searchQuery, setSearchQuery] = useState('');
    const searchResults = useMemo(() => {
        if (!searchQuery || searchQuery.length < 2) return [];
        const q = searchQuery.toLowerCase();
        const entities = useContentStore.getState().entities || [];
        return entities
            .filter(e => (e.name || '').toLowerCase().includes(q) || (e.id || '').toLowerCase().includes(q))
            .slice(0, 12);
    }, [searchQuery]);

    // ESC to close
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                if (closeModal) { setCloseModal(false); return; }
                if (hasUnsaved) { setCloseModal(true); return; }
                onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, hasUnsaved, closeModal]);

    const handleSave = () => {
        const ok = useCmsStore.getState().saveAll();
        setSaveFlash(ok ? '✅ Saved' : '❌ Save failed');
        setTimeout(() => setSaveFlash(null), 2500);
    };

    const handleExport = () => {
        useCmsStore.getState().exportBundle();
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
            const ok = useCmsStore.getState().importBundle(ev.target.result);
            setSaveFlash(ok ? '📥 Imported' : '❌ Import failed');
            setTimeout(() => setSaveFlash(null), 2500);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleTabClick = useCallback((tabId) => {
        setActiveTab(tabId);
        if (isMobile) setSidebarOpen(false);
    }, [isMobile]);

    // Cross-editor navigation — child editors can call this to switch tabs
    const navigateTo = useCallback((tabId, entityId) => {
        setActiveTab(tabId);
        // Store selected entity ID for the target editor to pick up
        if (entityId) {
            window.__cmsNavigateTo = { tab: tabId, entityId, ts: Date.now() };
        }
    }, []);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'board': return <KanbanBoard />;
            case 'timeline': return <TimelineCalendar />;
            case 'storylines': return <StorylineEditor onNavigate={navigateTo} />;
            case 'events': return <EventEditor onNavigate={navigateTo} />;
            case 'npcs': return <NPCEditor onNavigate={navigateTo} />;
            case 'artworks': return <ArtworkEditor />;
            case 'haggle': return <HaggleEditor />;
            case 'marketsim': return <MarketSimDashboard />;
            case 'terminal': return <ArtTerminal />;
            case 'actlog': return <ActivityLogViewer />;
            case 'venues': return <VenueEditor />;
            case 'ingest': return <DataHub />;
            default: return null;
        }
    };

    const btnStyle = {
        background: 'transparent', border: '1px solid #444', color: '#aaa',
        padding: isMobile ? '6px 8px' : '5px 12px', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: isMobile ? 10 : 11,
        transition: 'all 0.15s', borderRadius: 3,
    };

    const activeLabel = TABS.find(t => t.id === activeTab);

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
                padding: isMobile ? '8px 10px' : '10px 20px',
                background: '#111', borderBottom: '1px solid #333',
                flexWrap: isMobile ? 'wrap' : 'nowrap', gap: 8,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, minWidth: 0 }}>
                    {/* Hamburger menu on mobile */}
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
                        background: 'transparent', border: 'none', color: '#c9a84c',
                        fontSize: 20, padding: '2px 6px', cursor: 'pointer',
                        display: isMobile ? 'block' : 'none',
                    }}>☰</button>

                    <h1 style={{
                        margin: 0, color: '#c9a84c',
                        fontSize: isMobile ? 13 : 18, letterSpacing: 2, whiteSpace: 'nowrap',
                    }}>
                        {isMobile ? 'CMS' : 'MASTER CMS'}
                    </h1>

                    {/* Active tab indicator on mobile */}
                    {isMobile && activeLabel && (
                        <span style={{ color: '#888', fontSize: 10 }}>
                            {activeLabel.icon} {activeLabel.label}
                        </span>
                    )}

                    {/* Save status indicator */}
                    {!isMobile && (
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
                    )}
                    {saveFlash && (
                        <span style={{ color: '#4caf50', fontSize: 12, fontWeight: 'bold' }}>
                            {saveFlash}
                        </span>
                    )}
                    {/* Global Search */}
                    {!isMobile && (
                        <div style={{ position: 'relative' }}>
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="🔍 Search all domains..."
                                style={{
                                    background: '#0a0a12', color: '#eaeaea', border: '1px solid #333',
                                    padding: '5px 10px', fontFamily: 'inherit', fontSize: 11,
                                    width: 200, borderRadius: 3, outline: 'none',
                                }}
                                onFocus={e => e.target.style.borderColor = '#c9a84c'}
                                onBlur={e => { e.target.style.borderColor = '#333'; setTimeout(() => setSearchQuery(''), 200); }}
                            />
                            {searchResults.length > 0 && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                    background: '#111', border: '1px solid #333', borderRadius: 4,
                                    zIndex: 1000, maxHeight: 300, overflow: 'auto', marginTop: 4,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                }}>
                                    {searchResults.map(r => {
                                        const tabMap = { npc: 'npcs', event: 'events', artist: 'artworks', artwork: 'artworks', venue: 'venues', calendar: 'timeline', scene: 'events', dialogue: 'events' };
                                        const targetTab = tabMap[r.category] || 'board';
                                        return (
                                            <div key={r.id}
                                                onMouseDown={() => { navigateTo(targetTab, r.id); setSearchQuery(''); }}
                                                style={{
                                                    padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #1a1a2e',
                                                    fontSize: 11, display: 'flex', justifyContent: 'space-between',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.1)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <span style={{ color: '#eaeaea' }}>{r.icon} {r.name}</span>
                                                <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase' }}>{r.category}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: isMobile ? 4 : 8, alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={handleSave} style={{
                        ...btnStyle,
                        borderColor: hasUnsaved ? '#c9a84c' : '#444',
                        color: hasUnsaved ? '#c9a84c' : '#666',
                    }}>
                        {isMobile ? '💾' : '💾 Save All'}
                    </button>
                    {!isMobile && (
                        <>
                            <button onClick={handleExport} style={btnStyle}>
                                📦 Export
                            </button>
                            <button onClick={handleImport} style={btnStyle}>
                                📥 Import
                            </button>
                        </>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        style={{ display: 'none' }}
                    />
                    <div style={{ width: 1, height: 20, background: '#333', margin: '0 2px' }} />
                    <button onClick={() => {
                        if (hasUnsaved) {
                            setCloseModal(true);
                            return;
                        }
                        onClose();
                    }} style={{
                        ...btnStyle, color: '#888',
                    }}>
                        {isMobile ? '✕' : '[ ESC ] CLOSE'}
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                {/* Sidebar Navigation */}
                {/* On mobile: overlay. On desktop: static. */}
                {sidebarOpen && (
                    <>
                        {/* Mobile backdrop */}
                        {isMobile && (
                            <div onClick={() => setSidebarOpen(false)} style={{
                                position: 'absolute', inset: 0, zIndex: 10,
                                background: 'rgba(0,0,0,0.6)',
                            }} />
                        )}
                        <nav style={{
                            width: isMobile ? '260px' : '240px',
                            background: isMobile ? '#0a0a12' : 'rgba(0,0,0,0.5)',
                            borderRight: '1px solid #333',
                            display: 'flex', flexDirection: 'column',
                            overflow: 'auto',
                            ...(isMobile ? {
                                position: 'absolute', top: 0, left: 0, bottom: 0,
                                zIndex: 20, boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
                            } : {}),
                        }}>
                            <div style={{
                                padding: isMobile ? '12px 14px' : '16px',
                                color: '#666', fontSize: 10, letterSpacing: 1,
                                borderBottom: '1px solid #222',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                DATABASE DOMAINS
                                {isMobile && (
                                    <button onClick={() => setSidebarOpen(false)} style={{
                                        background: 'transparent', border: 'none', color: '#666',
                                        fontSize: 16, cursor: 'pointer',
                                    }}>✕</button>
                                )}
                            </div>
                            {TABS.map(tab => {
                                const isDirty = tab.dirtyDomain && dirty[tab.dirtyDomain];
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabClick(tab.id)}
                                        style={{
                                            background: activeTab === tab.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                                            color: activeTab === tab.id ? '#c9a84c' : '#aaa',
                                            border: 'none', borderLeft: activeTab === tab.id ? '3px solid #c9a84c' : '3px solid transparent',
                                            borderBottom: '1px solid #1a1a2e',
                                            padding: isMobile ? '14px' : '16px', cursor: 'pointer',
                                            textAlign: 'left', display: 'flex', gap: '12px', alignItems: 'center',
                                            fontFamily: 'inherit', fontSize: isMobile ? 12 : 13,
                                            transition: 'all 0.1s',
                                        }}
                                    >
                                        <span style={{ fontSize: 16 }}>{tab.icon}</span>
                                        {tab.label}
                                        {isDirty && (
                                            <span style={{
                                                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                                                background: '#ff6b35', marginLeft: 'auto', flexShrink: 0,
                                                boxShadow: '0 0 4px #ff6b35',
                                            }} />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </>
                )}

                {/* Main Content Area */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {renderTabContent()}
                </main>
            </div>
            {/* Save/Discard/Cancel Modal */}
            {closeModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999999,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: isMobile ? 16 : 0,
                }}>
                    <div style={{
                        background: '#111', border: '1px solid #333', borderRadius: 8,
                        padding: isMobile ? 16 : 24,
                        minWidth: isMobile ? 'auto' : 380,
                        maxWidth: isMobile ? '100%' : 420,
                        width: isMobile ? '100%' : 'auto',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 16, color: '#c9a84c', marginBottom: 6 }}>⚠️ Unsaved Changes</div>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 20 }}>
                            You have unsaved changes in: <strong style={{ color: '#ff6b35' }}>{dirtyDomains.join(', ')}</strong>
                        </div>
                        <div style={{
                            display: 'flex', gap: 8, justifyContent: 'center',
                            flexWrap: isMobile ? 'wrap' : 'nowrap',
                        }}>
                            <button onClick={() => {
                                useCmsStore.getState().saveAll();
                                setCloseModal(false);
                                setSaveFlash('✅ Saved');
                                setTimeout(() => { setSaveFlash(null); onClose(); }, 600);
                            }} style={{ ...btnStyle, borderColor: '#4caf50', color: '#4caf50', padding: '8px 16px', fontSize: 12, flex: isMobile ? '1 1 auto' : 'none' }}>
                                💾 Save & Close
                            </button>
                            <button onClick={() => {
                                setCloseModal(false);
                                onClose();
                            }} style={{ ...btnStyle, borderColor: '#f87171', color: '#f87171', padding: '8px 16px', fontSize: 12, flex: isMobile ? '1 1 auto' : 'none' }}>
                                🗑️ Discard
                            </button>
                            <button onClick={() => setCloseModal(false)} style={{ ...btnStyle, padding: '8px 16px', fontSize: 12, flex: isMobile ? '1 1 100%' : 'none' }}>
                                ← Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatSaveTime(t) {
    if (!t) return 'never';
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

