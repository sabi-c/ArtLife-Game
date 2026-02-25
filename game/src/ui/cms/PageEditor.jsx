/**
 * PageEditor.jsx — Game Page Manager (GameMaker-inspired property panel)
 *
 * A production-quality page/scene/overlay editor for the ArtLife CMS.
 * Shows all game pages in a hierarchical tree and provides an editable
 * property panel (inspired by GameMaker's room property editor).
 *
 * Features:
 *   - 25+ pages across 7 groups (Boot Flow → Legacy)
 *   - Editable: name, description, status, transitions
 *   - Add/remove transitions with target picker
 *   - localStorage persistence for all edits
 *   - Status filters (All / Active / Unused / Planned)
 *   - Incoming connection tracking
 *   - "Navigate to page" action button
 *   - Export page registry as JSON
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { VIEW, OVERLAY } from '../../core/views.js';

// ══════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'artlife_page_registry';
const mono = "'SF Mono', 'IBM Plex Mono', Courier, monospace";

const GROUPS = ['Boot Flow', 'Main Game', 'Venue Flow', 'Dialogue', 'Support', 'Overlays', 'Legacy'];

const STATUS_COLORS = { active: '#50c878', unused: '#c94040', planned: '#c9a84c' };
const STATUS_ICONS = { active: '●', unused: '○', planned: '◐' };
const TYPE_ICONS = { scene: '🎮', view: '📄', overlay: '📎' };
const TYPE_COLORS = { scene: '#4ea8de', view: '#c9a84c', overlay: '#a855f7' };

// ══════════════════════════════════════════════════════════════
// Default Page Registry
// ══════════════════════════════════════════════════════════════

const DEFAULT_REGISTRY = [
    // ── Boot Flow ──
    {
        id: 'boot_sequence', group: 'Boot Flow', type: 'scene',
        name: 'Boot Scene', key: 'BootScene',
        file: 'scenes/BootScene.js',
        desc: 'Preloads all game assets. Routes to character creation when done.',
        status: 'active',
        transitions: [
            { to: 'artnet_login', label: 'Assets loaded', method: 'GameEventBus UI_ROUTE' },
        ],
        properties: {
            'Asset Manifest': 'Defined in preload() — sprites, tilesets, audio, maps',
            'Loading Bar': 'BootScene progress bar with percentage',
            'Boot Duration': '~2-4 seconds depending on cache',
        },
    },
    {
        id: 'artnet_login', group: 'Boot Flow', type: 'view',
        name: 'Artnet Login', key: VIEW.BOOT,
        file: 'ui/ArtnetLogin.jsx',
        desc: 'Artnet-styled email login screen. First impression of the game aesthetic.',
        status: 'active',
        transitions: [
            { to: 'character_creator', label: 'Login (new user)', method: 'setActiveView' },
            { to: 'terminal', label: 'Login (returning)', method: 'setActiveView' },
        ],
        properties: {
            'Email Field': 'Text input with artnet.com branding',
            'Background': 'Dark gradient with art market imagery',
            'Animation': 'Fade-in with typewriter prompt',
        },
    },
    {
        id: 'character_creator', group: 'Boot Flow', type: 'view',
        name: 'Character Creator', key: VIEW.CHARACTER_CREATOR,
        file: 'ui/CharacterCreator.jsx',
        desc: 'Choose character class and customize starting stats.',
        status: 'active',
        transitions: [
            { to: 'title_screen', label: 'Character created', method: 'navigate' },
        ],
        properties: {
            'Classes': 'Critic, Collector, Dealer, Curator',
            'Starting Stats': 'Capital, Rep, Intel, Taste, Connections',
            'Portrait': 'Pixel art character portraits',
        },
    },
    {
        id: 'title_screen', group: 'Boot Flow', type: 'scene',
        name: 'Title Screen', key: 'TitleScene',
        file: 'scenes/TitleScene.js',
        desc: 'Graphical title screen with "Press Start" prompt.',
        status: 'active',
        transitions: [
            { to: 'overworld', label: 'Press Start', method: 'scene.stop → launch NewWorldScene' },
        ],
        properties: {
            'Title Text': 'ART LIFE',
            'Subtitle': 'A Game About the Art Market',
            'Music': 'title_theme.mp3',
            'Background': 'Animated art gallery montage',
        },
    },

    // ── Main Game ──
    {
        id: 'overworld', group: 'Main Game', type: 'scene',
        name: 'Overworld (Larus)', key: 'NewWorldScene',
        file: 'scenes/NewWorldScene.js',
        desc: 'Main game world — walk around larus.json map, NPCs, warps, signs.',
        status: 'active',
        transitions: [
            { to: 'dashboard', label: 'ESC / Exit menu', method: 'GameEventBus UI_ROUTE' },
            { to: 'city_hub', label: 'Warp to dungeon', method: 'GameEventBus LAUNCH_SCENE' },
            { to: 'dialogue', label: 'Talk to NPC', method: 'GameEventBus' },
        ],
        properties: {
            'Map File': 'content/maps/larus.json',
            'Warp Zones': '9 warp points defined in map objects',
            'Info Markers': '14 sign/info objects',
            'NPCs': '9 spawned from map data',
            'Spawn Point': 'Default player_spawn object',
            'Camera': 'Follow player with smooth lerp',
        },
    },
    {
        id: 'dashboard', group: 'Main Game', type: 'view',
        name: 'Player Dashboard', key: VIEW.DASHBOARD,
        file: 'ui/PlayerDashboard.jsx',
        desc: 'React overlay — stats, ledger, portfolio summary.',
        status: 'active',
        transitions: [
            { to: 'terminal', label: 'Go to Terminal', method: 'setActiveView' },
            { to: 'overworld', label: 'Return to World', method: 'navigate to PHASER' },
        ],
        properties: {
            'Stats Panel': 'Capital, Rep, Intel, Taste, Connections',
            'Portfolio': 'Grid of owned artworks with values',
            'Week Summary': 'Events, transactions, reputation changes',
        },
    },
    {
        id: 'terminal', group: 'Main Game', type: 'view',
        name: 'Terminal', key: VIEW.TERMINAL,
        file: 'ui/terminal/TerminalUI.js',
        desc: 'DOM text terminal — menus, dashboard, events, narration.',
        status: 'active',
        transitions: [
            { to: 'overworld', label: 'Enter World', method: 'navigate to PHASER' },
        ],
        properties: {
            'Screens': 'dashboard, market, phone, journal, world, ego, character, system',
            'Ticker': '100+ art market phrases, configurable layout',
            'Commands': 'Terminal command system with help text',
            'Week Flow': 'Turn-based week progression from terminal',
        },
    },

    // ── Venue Flow ──
    {
        id: 'city_hub', group: 'Venue Flow', type: 'scene',
        name: 'City Hub', key: 'CityScene',
        file: 'scenes/CityScene.js',
        desc: 'City overview — list of venues, fast travel.',
        status: 'active',
        transitions: [
            { to: 'venue_interior', label: 'Enter venue', method: 'scene.start LocationScene' },
            { to: 'fast_travel', label: 'Travel to city', method: 'scene.launch FastTravelScene' },
            { to: 'terminal', label: 'Leave city', method: 'GameEventBus UI_ROUTE' },
        ],
        properties: {
            'Venue List': 'Loaded from rooms.js — galleries, studios, auction houses',
            'City Background': 'Pixel art cityscape',
            'Available NPCs': 'Context-dependent based on week/events',
        },
    },
    {
        id: 'venue_interior', group: 'Venue Flow', type: 'scene',
        name: 'Venue Interior', key: 'LocationScene',
        file: 'scenes/LocationScene.js',
        desc: 'Inside a gallery/studio/auction house — art, NPCs, events.',
        status: 'active',
        transitions: [
            { to: 'haggle_game', label: 'Buy/Sell art', method: 'scene.start HaggleScene' },
            { to: 'dialogue', label: 'Talk to NPC', method: 'scene.launch DialogueScene' },
            { to: 'city_hub', label: 'Leave venue', method: 'scene.start (return)' },
        ],
        properties: {
            'Venue Data': 'rooms.js — layout, art on walls, NPCs present',
            'Artwork Display': 'Clickable artworks with price/info',
            'NPC Placement': 'Positioned from venue config',
            'Exit Zones': 'Door objects back to city hub',
        },
    },
    {
        id: 'haggle_game', group: 'Venue Flow', type: 'scene',
        name: 'Haggle / Deal', key: 'HaggleScene',
        file: 'scenes/HaggleScene.js',
        desc: 'Art dealing negotiation mini-game.',
        status: 'active',
        transitions: [
            { to: 'terminal', label: 'Deal complete', method: 'GameEventBus UI_ROUTE' },
        ],
        properties: {
            'Config': 'haggle_config.js — round count, price ranges',
            'Dealer Types': 'Gallery, Auction, Private (different AI)',
            'Price Modifiers': 'Market state × reputation × intel',
            'Round Count': '3-5 rounds per negotiation',
        },
    },

    // ── Dialogue ──
    {
        id: 'dialogue', group: 'Dialogue', type: 'scene',
        name: 'Text Dialogue', key: 'DialogueScene',
        file: 'scenes/DialogueScene.js',
        desc: 'Text dialogue with branching choices and stat effects.',
        status: 'active',
        transitions: [
            { to: 'terminal', label: 'End dialogue', method: 'GameEventBus UI_ROUTE' },
            { to: 'haggle_game', label: 'Trigger haggle', method: 'scene.start HaggleScene' },
        ],
        properties: {
            'Dialogue Data': 'dialogue_trees.js — node trees with conditions',
            'Speaker Portraits': 'Character sprite heads',
            'Choice Effects': 'Stat changes, relationship shifts',
            'Conditions': 'Gated choices based on stats/inventory',
        },
    },
    {
        id: 'mac_dialogue', group: 'Dialogue', type: 'scene',
        name: 'Visual Dialogue', key: 'MacDialogueScene',
        file: 'scenes/MacDialogueScene.js',
        desc: 'Over-the-shoulder visual dialogue with sprite art.',
        status: 'active',
        transitions: [
            { to: 'terminal', label: 'End dialogue', method: 'GameEventBus UI_ROUTE' },
        ],
        properties: {
            'Left Sprite': 'Player character (back view)',
            'Right Sprite': 'NPC character (front view, scaled down)',
            'Background': 'Dynamic scene background image',
            'Layout': 'Over-the-shoulder perspective',
        },
    },
    {
        id: 'scene_engine', group: 'Dialogue', type: 'view',
        name: 'Scene Engine (VN)', key: VIEW.SCENE_ENGINE,
        file: 'ui/ScenePlayer.jsx',
        desc: 'React visual novel reader — plays narrative scenes from scenes.js.',
        status: 'active',
        transitions: [
            { to: 'terminal', label: 'Scene complete', method: 'setActiveView' },
        ],
        properties: {
            'Scene Data': 'data/scenes.js — node trees with choices',
            'Conditions': 'Stat checks for gated options',
            'Effects': 'Stat changes on choice selection',
        },
    },

    // ── Support ──
    {
        id: 'fast_travel', group: 'Support', type: 'scene',
        name: 'Fast Travel', key: 'FastTravelScene',
        file: 'scenes/FastTravelScene.js',
        desc: 'City-to-city travel selection.',
        status: 'active',
        transitions: [
            { to: 'venue_interior', label: 'Arrive at venue', method: 'scene.start LocationScene' },
        ],
        properties: {
            'City List': 'Available cities for travel',
            'Animation': 'Travel transition effect',
        },
    },
    {
        id: 'intro', group: 'Support', type: 'scene',
        name: 'Intro Cutscene', key: 'IntroScene',
        file: 'scenes/IntroScene.js',
        desc: 'Story introduction cutscene.',
        status: 'active',
        transitions: [
            { to: 'artnet_login', label: 'Intro complete', method: 'GameEventBus UI_ROUTE' },
        ],
        properties: {
            'Text Sequence': 'Intro narration slides',
            'Background': 'Art market imagery',
        },
    },
    {
        id: 'menu', group: 'Support', type: 'scene',
        name: 'Menu', key: 'MenuScene',
        file: 'scenes/MenuScene.js',
        desc: 'Pause/settings menu.',
        status: 'active',
        transitions: [],
        properties: { 'Options': 'Resume, Settings, Save, Load, Quit' },
    },
    {
        id: 'endgame', group: 'Support', type: 'scene',
        name: 'End Screen', key: 'EndScene',
        file: 'scenes/EndScene.js',
        desc: 'Game over / final results.',
        status: 'active',
        transitions: [
            { to: 'menu', label: 'Restart', method: 'scene.start MenuScene' },
        ],
        properties: { 'End Conditions': 'Week limit reached or triggered event', 'Score': 'Portfolio value + reputation' },
    },

    // ── Overlays ──
    {
        id: 'bloomberg', group: 'Overlays', type: 'overlay',
        name: 'Bloomberg Terminal', key: OVERLAY.BLOOMBERG,
        file: 'ui/BloombergTerminal.jsx',
        desc: 'Market data terminal with real-time art analytics.',
        status: 'active',
        transitions: [],
        properties: { 'Data Feeds': 'Market indices, artist prices', 'Charts': 'Line, bar, candlestick', 'Ticker': 'Scrolling market updates' },
    },
    {
        id: 'cms', group: 'Overlays', type: 'overlay',
        name: 'Master CMS', key: OVERLAY.MASTER_CMS,
        file: 'ui/MasterCMS.jsx',
        desc: 'Content Management System — 15+ editor tabs.',
        status: 'active',
        transitions: [],
        properties: { 'Tabs': 'Board, Timeline, Storylines, Events, NPCs, Artworks, Haggle, Market Sim, Terminal, Venues, Activity Log, Data Hub, Engines, Pages, Flow Map' },
    },
    {
        id: 'gmail', group: 'Overlays', type: 'overlay',
        name: 'Email Client', key: OVERLAY.GMAIL_GUIDE,
        file: 'ui/email/',
        desc: 'In-game email system — receive/respond to deals.',
        status: 'active',
        transitions: [],
        properties: { 'Inbox': 'Email thread list', 'Compose': 'Reply to deals', 'Templates': 'Auto-response patterns' },
    },
    {
        id: 'inventory', group: 'Overlays', type: 'overlay',
        name: 'Inventory', key: OVERLAY.INVENTORY,
        file: 'ui/InventoryDashboard.jsx',
        desc: 'Player inventory — artworks, values, storage.',
        status: 'active',
        transitions: [],
        properties: { 'Grid': 'Artwork cards with thumbnails', 'Sort': 'By value, date, artist', 'Value': 'Current market price estimate' },
    },
    {
        id: 'artnet_dashboard', group: 'Overlays', type: 'overlay',
        name: 'Artnet Dashboard', key: OVERLAY.ARTNET_UI,
        file: 'ui/ArtnetUI.jsx',
        desc: 'Artnet-branded dashboard — marketplace, news, gallery listings.',
        status: 'planned',
        transitions: [
            { to: 'artnet_marketplace', label: 'Browse Market', method: 'overlay switch' },
        ],
        properties: { 'Layout': 'Artnet.com inspired grid layout', 'News Feed': 'Art market headlines', 'Gallery Listings': 'Featured galleries' },
    },
    {
        id: 'artnet_marketplace', group: 'Overlays', type: 'overlay',
        name: 'Artnet Marketplace', key: OVERLAY.ARTNET_MARKETPLACE,
        file: 'ui/ArtnetMarketplace.jsx',
        desc: 'Browse and purchase art online.',
        status: 'planned',
        transitions: [],
        properties: { 'Listings': 'Artwork cards with bid/buy', 'Search': 'Filter by artist, medium, price', 'Cart': 'Purchase flow' },
    },

    // ── Legacy ──
    {
        id: 'overworld_legacy', group: 'Legacy', type: 'scene',
        name: 'Overworld (Grid)', key: 'OverworldScene',
        file: 'scenes/OverworldScene.js',
        desc: 'Legacy grid-engine overworld — replaced by NewWorldScene.',
        status: 'unused',
        transitions: [],
        properties: { 'Replaced By': 'NewWorldScene' },
    },
    {
        id: 'world_legacy', group: 'Legacy', type: 'scene',
        name: 'World (Infinite)', key: 'WorldScene',
        file: 'scenes/WorldScene.js',
        desc: 'Legacy infinite scroll world — replaced by NewWorldScene.',
        status: 'unused',
        transitions: [],
        properties: { 'Replaced By': 'NewWorldScene' },
    },
];

// ══════════════════════════════════════════════════════════════
// Merge saved edits over defaults (local edits win)
// ══════════════════════════════════════════════════════════════

function loadRegistry() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved || !Array.isArray(saved)) return DEFAULT_REGISTRY.map(p => ({ ...p }));
        // Merge: keep defaults as base, layer saved edits on top
        return DEFAULT_REGISTRY.map(def => {
            const override = saved.find(s => s.id === def.id);
            if (!override) return { ...def };
            return {
                ...def,
                name: override.name ?? def.name,
                desc: override.desc ?? def.desc,
                status: override.status ?? def.status,
                transitions: override.transitions ?? def.transitions,
                properties: { ...def.properties, ...(override.properties || {}) },
            };
        });
    } catch { return DEFAULT_REGISTRY.map(p => ({ ...p })); }
}

function saveRegistry(pages) {
    // Only save user-editable fields to keep storage small
    const slim = pages.map(p => ({
        id: p.id, name: p.name, desc: p.desc, status: p.status,
        transitions: p.transitions, properties: p.properties,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
}

// ══════════════════════════════════════════════════════════════
// PageEditor Component
// ══════════════════════════════════════════════════════════════

export default function PageEditor() {
    const [pages, setPages] = useState(() => loadRegistry());
    const [selectedId, setSelectedId] = useState(null);
    const [collapsed, setCollapsed] = useState({});
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dirty, setDirty] = useState(false);

    // Auto-save on changes
    useEffect(() => {
        if (dirty) {
            saveRegistry(pages);
            setDirty(false);
        }
    }, [pages, dirty]);

    const updatePage = useCallback((id, patch) => {
        setPages(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
        setDirty(true);
    }, []);

    const filtered = useMemo(() => {
        let result = pages;
        if (filter !== 'all') result = result.filter(p => p.status === filter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.desc.toLowerCase().includes(q) ||
                p.file.toLowerCase().includes(q) ||
                p.id.includes(q)
            );
        }
        return result;
    }, [pages, filter, searchQuery]);

    const selected = pages.find(p => p.id === selectedId);

    const stats = useMemo(() => ({
        total: pages.length,
        active: pages.filter(p => p.status === 'active').length,
        unused: pages.filter(p => p.status === 'unused').length,
        planned: pages.filter(p => p.status === 'planned').length,
        scenes: pages.filter(p => p.type === 'scene').length,
        views: pages.filter(p => p.type === 'view').length,
        overlays: pages.filter(p => p.type === 'overlay').length,
    }), [pages]);

    return (
        <div style={{ display: 'flex', height: '100%', fontFamily: mono, fontSize: 11, color: '#ccc', background: '#08080d' }}>

            {/* ═══ Left Panel: Page Tree ═══ */}
            <div style={{ width: 340, borderRight: '1px solid #1a1a25', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>

                {/* Header + Search */}
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #1a1a25', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 'bold', color: '#c9a84c', letterSpacing: '0.12em' }}>
                            PAGE EDITOR
                        </span>
                        <span style={{ fontSize: 9, color: '#444' }}>
                            {stats.total} pages
                        </span>
                    </div>

                    {/* Search box */}
                    <input
                        type="text"
                        placeholder="Search pages…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', boxSizing: 'border-box', padding: '6px 10px',
                            background: '#0d0d14', border: '1px solid #222', color: '#aaa',
                            fontSize: 10, fontFamily: mono, borderRadius: 3, marginBottom: 8,
                            outline: 'none',
                        }}
                    />

                    {/* Filter pills */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {[
                            { key: 'all', label: `ALL (${stats.total})`, color: '#666' },
                            { key: 'active', label: `ACTIVE (${stats.active})`, color: STATUS_COLORS.active },
                            { key: 'unused', label: `UNUSED (${stats.unused})`, color: STATUS_COLORS.unused },
                            { key: 'planned', label: `PLANNED (${stats.planned})`, color: STATUS_COLORS.planned },
                        ].map(f => (
                            <button key={f.key} onClick={() => setFilter(f.key)}
                                style={{
                                    background: filter === f.key ? f.color + '18' : 'transparent',
                                    border: `1px solid ${filter === f.key ? f.color + '66' : '#1a1a25'}`,
                                    color: filter === f.key ? f.color : '#444',
                                    fontSize: 8, padding: '3px 8px', cursor: 'pointer',
                                    fontFamily: mono, borderRadius: 2, letterSpacing: '0.05em',
                                    transition: 'all 0.15s',
                                }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Groups + Pages */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {GROUPS.map(group => {
                        const groupPages = filtered.filter(p => p.group === group);
                        if (groupPages.length === 0) return null;
                        const isCollapsed = collapsed[group];

                        return (
                            <div key={group}>
                                {/* Group header */}
                                <div
                                    onClick={() => setCollapsed(prev => ({ ...prev, [group]: !prev[group] }))}
                                    style={{
                                        padding: '7px 16px', cursor: 'pointer', userSelect: 'none',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: '#0b0b12', borderBottom: '1px solid #111',
                                        fontSize: 9, fontWeight: 'bold', color: '#555', letterSpacing: '0.12em',
                                    }}>
                                    <span>{isCollapsed ? '▸' : '▾'} {group.toUpperCase()}</span>
                                    <span style={{ color: '#333', fontWeight: 'normal', fontSize: 9 }}>{groupPages.length}</span>
                                </div>

                                {/* Page items */}
                                {!isCollapsed && groupPages.map(page => {
                                    const isSelected = selectedId === page.id;
                                    return (
                                        <div key={page.id}
                                            onClick={() => setSelectedId(page.id)}
                                            style={{
                                                padding: '7px 14px 7px 20px', cursor: 'pointer',
                                                borderBottom: '1px solid #0e0e16',
                                                background: isSelected ? '#12122a' : 'transparent',
                                                borderLeft: isSelected ? '3px solid #c9a84c' : '3px solid transparent',
                                                opacity: page.status === 'unused' ? 0.45 : page.status === 'planned' ? 0.65 : 1,
                                                transition: 'all 0.12s',
                                            }}
                                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#0e0e1c'; }}
                                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: 12 }}>{TYPE_ICONS[page.type]}</span>
                                                <span style={{ fontWeight: 600, fontSize: 11, color: isSelected ? '#fff' : '#ccc' }}>{page.name}</span>
                                                <span style={{
                                                    marginLeft: 'auto', fontSize: 7, padding: '1px 5px', borderRadius: 2,
                                                    color: STATUS_COLORS[page.status],
                                                    border: `1px solid ${STATUS_COLORS[page.status]}33`,
                                                    background: STATUS_COLORS[page.status] + '0a',
                                                }}>
                                                    {STATUS_ICONS[page.status]} {page.status}
                                                </span>
                                            </div>
                                            <div style={{ color: '#444', fontSize: 9, marginTop: 2, paddingLeft: 18, lineHeight: 1.4 }}>
                                                {page.desc.length > 65 ? page.desc.substring(0, 65) + '…' : page.desc}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Footer stats */}
                <div style={{ padding: '8px 16px', borderTop: '1px solid #1a1a25', flexShrink: 0, fontSize: 9, color: '#333', display: 'flex', gap: 12 }}>
                    <span>🎮 {stats.scenes}</span>
                    <span>📄 {stats.views}</span>
                    <span>📎 {stats.overlays}</span>
                    <button
                        onClick={() => {
                            const blob = new Blob([JSON.stringify(pages, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = 'page_registry.json'; a.click();
                            URL.revokeObjectURL(url);
                        }}
                        style={{ marginLeft: 'auto', background: 'none', border: '1px solid #222', color: '#555', fontSize: 8, padding: '2px 8px', cursor: 'pointer', fontFamily: mono, borderRadius: 2 }}
                    >
                        EXPORT JSON
                    </button>
                </div>
            </div>

            {/* ═══ Right Panel: Property Inspector ═══ */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {!selected ? (
                    <EmptyState stats={stats} />
                ) : (
                    <PropertyPanel page={selected} allPages={pages} onUpdate={updatePage} />
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// Empty State
// ══════════════════════════════════════════════════════════════

function EmptyState({ stats }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, textAlign: 'center' }}>
            <div>
                <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.3 }}>📑</div>
                <div style={{ fontSize: 13, color: '#555', letterSpacing: '0.08em', marginBottom: 8 }}>SELECT A PAGE TO EDIT</div>
                <div style={{ fontSize: 10, color: '#333', lineHeight: 1.8 }}>
                    {stats.total} total pages · {stats.active} active · {stats.scenes} scenes · {stats.views} views · {stats.overlays} overlays
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// Property Panel — GameMaker-inspired editable inspector
// ══════════════════════════════════════════════════════════════

function PropertyPanel({ page, allPages, onUpdate }) {

    // ── Styles ──
    const section = { padding: '12px 20px', borderBottom: '1px solid #141420' };
    const label = { color: '#555', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 5, display: 'block' };
    const inputStyle = {
        width: '100%', boxSizing: 'border-box', padding: '6px 10px',
        background: '#0c0c14', border: '1px solid #1a1a28', color: '#ccc',
        fontSize: 11, fontFamily: mono, borderRadius: 3, outline: 'none',
    };
    const textareaStyle = { ...inputStyle, minHeight: 60, resize: 'vertical', lineHeight: 1.5 };

    // ── Transition helpers ──
    const addTransition = () => {
        const updated = [...page.transitions, { to: '', label: 'New Transition', method: '' }];
        onUpdate(page.id, { transitions: updated });
    };

    const removeTransition = (idx) => {
        const updated = page.transitions.filter((_, i) => i !== idx);
        onUpdate(page.id, { transitions: updated });
    };

    const updateTransition = (idx, field, value) => {
        const updated = page.transitions.map((t, i) => i === idx ? { ...t, [field]: value } : t);
        onUpdate(page.id, { transitions: updated });
    };

    // ── Property helpers ──
    const updateProperty = (key, value) => {
        onUpdate(page.id, { properties: { ...page.properties, [key]: value } });
    };

    const addProperty = () => {
        const key = prompt('Property name:');
        if (key && key.trim()) {
            onUpdate(page.id, { properties: { ...page.properties, [key.trim()]: '' } });
        }
    };

    const removeProperty = (key) => {
        const props = { ...page.properties };
        delete props[key];
        onUpdate(page.id, { properties: props });
    };

    // ── Incoming connections ──
    const incoming = allPages.filter(p => p.transitions.some(t => t.to === page.id));

    return (
        <div>
            {/* ── Header ── */}
            <div style={{
                padding: '16px 20px 14px', borderBottom: '1px solid #1a1a28',
                background: 'linear-gradient(180deg, #0f0f18 0%, #08080d 100%)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{TYPE_ICONS[page.type]}</span>
                    <input
                        value={page.name}
                        onChange={e => onUpdate(page.id, { name: e.target.value })}
                        style={{ ...inputStyle, fontSize: 16, fontWeight: 'bold', color: '#fff', background: 'transparent', border: '1px solid transparent', padding: '2px 4px', flex: 1 }}
                        onFocus={e => e.target.style.borderColor = '#c9a84c44'}
                        onBlur={e => e.target.style.borderColor = 'transparent'}
                    />
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    <select
                        value={page.status}
                        onChange={e => onUpdate(page.id, { status: e.target.value })}
                        style={{
                            background: STATUS_COLORS[page.status] + '15', border: `1px solid ${STATUS_COLORS[page.status]}44`,
                            color: STATUS_COLORS[page.status], fontSize: 9, padding: '3px 10px', fontFamily: mono,
                            borderRadius: 3, cursor: 'pointer', outline: 'none',
                        }}
                    >
                        <option value="active">● ACTIVE</option>
                        <option value="unused">○ UNUSED</option>
                        <option value="planned">◐ PLANNED</option>
                    </select>
                    <span style={{ fontSize: 9, padding: '3px 10px', borderRadius: 3, background: TYPE_COLORS[page.type] + '18', color: TYPE_COLORS[page.type], border: `1px solid ${TYPE_COLORS[page.type]}33` }}>
                        {page.type.toUpperCase()}
                    </span>
                    {page.key && (
                        <span style={{ fontSize: 9, padding: '3px 10px', borderRadius: 3, background: '#111', color: '#555', border: '1px solid #222' }}>
                            {page.key}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Description ── */}
            <div style={section}>
                <span style={label}>Description</span>
                <textarea
                    value={page.desc}
                    onChange={e => onUpdate(page.id, { desc: e.target.value })}
                    style={textareaStyle}
                />
            </div>

            {/* ── Source File ── */}
            <div style={section}>
                <span style={label}>Source File</span>
                <div style={{ color: '#6baed6', fontSize: 11 }}>src/{page.file}</div>
            </div>

            {/* ── Properties (editable key-value pairs) ── */}
            <div style={section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={label}>Properties ({Object.keys(page.properties || {}).length})</span>
                    <button onClick={addProperty} style={{ background: 'none', border: '1px solid #222', color: '#555', fontSize: 8, padding: '2px 8px', cursor: 'pointer', fontFamily: mono, borderRadius: 2 }}>
                        + ADD
                    </button>
                </div>
                {Object.entries(page.properties || {}).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: 6, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 9, color: '#4ade80', marginBottom: 2, fontWeight: 600 }}>{key}</div>
                            <input
                                value={value}
                                onChange={e => updateProperty(key, e.target.value)}
                                style={{ ...inputStyle, fontSize: 10 }}
                            />
                        </div>
                        <button onClick={() => removeProperty(key)} title="Remove property"
                            style={{ background: 'none', border: 'none', color: '#c9404033', cursor: 'pointer', fontSize: 12, padding: '12px 2px 0', lineHeight: 1 }}>
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* ── Transitions (editable) ── */}
            <div style={section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={label}>Transitions → ({page.transitions.length})</span>
                    <button onClick={addTransition} style={{ background: 'none', border: '1px solid #222', color: '#555', fontSize: 8, padding: '2px 8px', cursor: 'pointer', fontFamily: mono, borderRadius: 2 }}>
                        + ADD
                    </button>
                </div>
                {page.transitions.length === 0 ? (
                    <div style={{ color: '#222', fontStyle: 'italic', fontSize: 10 }}>No outgoing transitions</div>
                ) : (
                    page.transitions.map((t, i) => {
                        const target = allPages.find(p => p.id === t.to);
                        return (
                            <div key={i} style={{
                                padding: '8px 10px', marginBottom: 4, borderRadius: 4,
                                background: '#0b0b16', border: '1px solid #161625',
                            }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ color: '#c9a84c', fontSize: 11, flexShrink: 0 }}>→</span>
                                    <select
                                        value={t.to}
                                        onChange={e => updateTransition(i, 'to', e.target.value)}
                                        style={{ ...inputStyle, fontSize: 10, flex: 1 }}
                                    >
                                        <option value="">— Select target —</option>
                                        {allPages.filter(p => p.id !== page.id).map(p => (
                                            <option key={p.id} value={p.id}>{TYPE_ICONS[p.type]} {p.name}</option>
                                        ))}
                                    </select>
                                    <button onClick={() => removeTransition(i)} title="Remove"
                                        style={{ background: 'none', border: 'none', color: '#c94040', cursor: 'pointer', fontSize: 12, padding: 0 }}>×</button>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <input
                                        value={t.label} placeholder="Label"
                                        onChange={e => updateTransition(i, 'label', e.target.value)}
                                        style={{ ...inputStyle, fontSize: 9, flex: 1 }}
                                    />
                                    <input
                                        value={t.method} placeholder="Method"
                                        onChange={e => updateTransition(i, 'method', e.target.value)}
                                        style={{ ...inputStyle, fontSize: 9, flex: 1 }}
                                    />
                                </div>
                                {target && (
                                    <div style={{ fontSize: 8, color: '#444', marginTop: 3, paddingLeft: 16 }}>
                                        {target.file}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── Incoming ── */}
            <div style={section}>
                <span style={label}>← Incoming ({incoming.length})</span>
                {incoming.length === 0 ? (
                    <div style={{ color: '#222', fontStyle: 'italic', fontSize: 10 }}>No incoming connections</div>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {incoming.map(p => (
                            <span key={p.id} style={{
                                fontSize: 9, padding: '3px 8px', borderRadius: 3,
                                background: '#0d0d18', color: '#777', border: '1px solid #1a1a28',
                                cursor: 'default',
                            }}>
                                {TYPE_ICONS[p.type]} {p.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── ID + Reset ── */}
            <div style={{ ...section, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: '#222' }}>ID: {page.id}</span>
                <button
                    onClick={() => {
                        if (confirm('Reset this page to defaults?')) {
                            const def = DEFAULT_REGISTRY.find(d => d.id === page.id);
                            if (def) onUpdate(page.id, { ...def });
                        }
                    }}
                    style={{ background: 'none', border: '1px solid #222', color: '#c94040', fontSize: 8, padding: '2px 8px', cursor: 'pointer', fontFamily: mono, borderRadius: 2 }}
                >
                    RESET TO DEFAULT
                </button>
            </div>
        </div>
    );
}
