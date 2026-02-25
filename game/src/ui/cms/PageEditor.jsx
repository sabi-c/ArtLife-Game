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

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
        desc: 'Preloads all game assets. Routes to loading screen when done.',
        status: 'active',
        transitions: [
            { to: 'artnet_loading', label: 'Assets loaded', method: 'GameEventBus UI_ROUTE' },
        ],
        properties: {
            'Asset Manifest': 'Defined in preload() — sprites, tilesets, audio, maps',
            'Loading Bar': 'BootScene progress bar with percentage',
            'Boot Duration': '~2-4 seconds depending on cache',
        },
    },
    {
        id: 'artnet_loading', group: 'Boot Flow', type: 'view',
        name: 'Artnet Loading Screen', key: VIEW.BOOT,
        file: 'ui/ArtnetLogin.jsx',
        desc: 'Artnet-branded loading screen — spinner, "Preparing interface..." text, 3-second delay.',
        status: 'active',
        transitions: [
            { to: 'artnet_login', label: 'Loading complete', method: 'setTimeout → state transition' },
        ],
        properties: {
            'Animation': 'Spinner + progress dots',
            'Duration': '~3 seconds',
            'Background': 'Dark gradient with Artnet branding',
            'Copy': '"Preparing your Artnet experience..."',
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
            { to: 'artnet_dashboard', label: 'Artnet Dashboard', method: 'openOverlay' },
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
            { to: 'intro', label: 'Press Start', method: 'scene.start IntroScene' },
        ],
        properties: {
            'Title Text': 'ART LIFE',
            'Subtitle': 'A Game About the Art Market',
            'Music': 'title_theme.mp3',
            'Background': 'Animated art gallery montage',
        },
    },
    {
        id: 'intro', group: 'Boot Flow', type: 'scene',
        name: 'Intro Cutscene', key: 'IntroScene',
        file: 'scenes/IntroScene.js',
        desc: 'Story introduction cutscene with typewriter narration.',
        status: 'active',
        transitions: [
            { to: 'terminal', label: 'Intro complete', method: 'GameEventBus UI_ROUTE' },
        ],
        properties: {
            'Text Sequence': 'Intro narration slides',
            'Background': 'Art market imagery',
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
            { to: 'bloomberg', label: '` key', method: 'openOverlay BLOOMBERG' },
            { to: 'cms', label: 'CMS btn', method: 'openOverlay MASTER_CMS' },
            { to: 'inventory', label: 'I key', method: 'openOverlay INVENTORY' },
            { to: 'settings', label: 'ESC', method: 'openOverlay SETTINGS' },
            { to: 'gmail', label: 'Email btn', method: 'openOverlay GMAIL_GUIDE' },
            { to: 'endgame', label: 'Week 26', method: 'scene.start EndScene' },
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
            { to: 'mac_dialogue', label: 'Visual Talk', method: 'scene.launch MacDialogueScene' },
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
            { to: 'title_screen', label: 'Restart', method: 'scene.start TitleScene' },
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
        transitions: [
            { to: 'bloomberg_tutorial', label: 'First time', method: 'overlay switch' },
        ],
        properties: { 'Data Feeds': 'Market indices, artist prices', 'Charts': 'Line, bar, candlestick', 'Ticker': 'Scrolling market updates' },
    },
    {
        id: 'bloomberg_tutorial', group: 'Overlays', type: 'view',
        name: 'Bloomberg Tutorial', key: 'BLOOMBERG_TUTORIAL',
        file: 'ui/BloombergTutorial.jsx',
        desc: 'First-time walkthrough of Bloomberg terminal features.',
        status: 'active',
        transitions: [
            { to: 'bloomberg', label: 'Tutorial complete', method: 'close tutorial' },
        ],
        properties: { 'Steps': 'Multi-step guided tour', 'Highlight': 'Interactive hotspot overlays' },
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
        id: 'settings', group: 'Overlays', type: 'overlay',
        name: 'Settings', key: OVERLAY.SETTINGS,
        file: 'ui/SettingsOverlay.jsx',
        desc: 'Game settings — audio, display, controls.',
        status: 'active',
        transitions: [],
        properties: { 'Audio': 'Volume sliders for music/sfx', 'Display': 'Fullscreen, resolution', 'Controls': 'Keybind configuration' },
    },
    {
        id: 'diagnostics', group: 'Overlays', type: 'overlay',
        name: 'Diagnostics', key: OVERLAY.DEBUG_LOG,
        file: 'ui/DiagnosticsOverlay.jsx',
        desc: 'Performance monitoring and state debugging overlay.',
        status: 'active',
        transitions: [],
        properties: { 'FPS': 'Real-time frame rate display', 'Memory': 'Heap usage tracking', 'State': 'Zustand store inspector' },
    },
    {
        id: 'calendar_hud', group: 'Overlays', type: 'view',
        name: 'Calendar HUD', key: 'CALENDAR_HUD',
        file: 'ui/CalendarHUD.jsx',
        desc: 'Week/day calendar overlay showing schedule and events.',
        status: 'active',
        transitions: [],
        properties: { 'Display': 'Monthly calendar grid', 'Events': 'Upcoming gallery openings, auctions', 'Navigation': 'Click day for details' },
    },
    {
        id: 'admin', group: 'Overlays', type: 'overlay',
        name: 'Admin Panel', key: OVERLAY.ADMIN,
        file: 'ui/AdminDashboard.jsx',
        desc: 'God-mode debug tools for development.',
        status: 'active',
        transitions: [],
        properties: { 'Controls': 'Time skip, stat editing, teleport', 'Logs': 'GameState history viewer' },
    },
    {
        id: 'sales_grid', group: 'Overlays', type: 'overlay',
        name: 'Sales Grid', key: OVERLAY.SALES_GRID,
        file: 'ui/SalesGrid.jsx',
        desc: 'Beckmans-style trade history and analytics.',
        status: 'active',
        transitions: [],
        properties: { 'Grid': 'Past trade records', 'Filters': 'By artist, buyer, price range' },
    },
    {
        id: 'artnet_terminal', group: 'Overlays', type: 'flow',
        name: 'Artnet Terminal', key: OVERLAY.ARTNET_UI,
        file: 'ui/ArtnetUI.jsx',
        desc: 'Unified Artnet experience flow — loading, login, Bloomberg terminal, marketplace, artist detail, gallery view.',
        status: 'active',
        children: ['artnet_loading_phase', 'artnet_login_phase', 'bloomberg', 'artnet_marketplace',
            'artnet_artist_detail', 'artnet_gallery_view'],
        transitions: [
            { from: 'artnet_loading_phase', to: 'artnet_login_phase', label: 'Timer complete' },
            { from: 'artnet_login_phase', to: 'bloomberg', label: 'Login success' },
            { from: 'bloomberg', to: 'artnet_marketplace', label: 'Browse Market' },
            { from: 'bloomberg', to: 'artnet_artist_detail', label: 'Artist drilldown' },
            { from: 'bloomberg', to: 'artnet_gallery_view', label: 'Gallery drilldown' },
            { from: 'artnet_marketplace', to: 'bloomberg', label: 'Back / ESC' },
            { from: 'artnet_artist_detail', to: 'bloomberg', label: 'Back / ESC' },
            { from: 'artnet_gallery_view', to: 'bloomberg', label: 'Back / ESC' },
        ],
        properties: {
            'Phases': 'loading → login → bloomberg ↔ marketplace, artist_detail, gallery_view',
            'Transitions': 'Crossfade 300ms with slide animations',
            'ESC': 'Walks backward through phase chain',
        },
    },
    {
        id: 'artnet_artist_detail', group: 'Overlays', type: 'subpage',
        name: 'Artist Detail Page', key: 'ARTNET_ARTIST_DETAIL',
        file: 'ui/ArtnetUI.jsx',
        desc: 'Deep-dive into an artist — bio, heat gauge, stats, price range, recent activity.',
        status: 'active',
        parent: 'artnet_terminal',
        transitions: [
            { to: 'bloomberg', label: 'Back to Terminal', method: 'transitionTo' },
        ],
        properties: {
            'Data Source': 'artists.js — name, tier, heat, medium, basePriceMin/Max, flavor',
            'Stats Grid': 'Tier, Heat, Volatility, Price Range',
            'Heat Gauge': 'Visual bar with gradient (green→gold→red)',
            'Activity Feed': 'Auction results, museum acquisitions, exhibitions',
        },
    },
    {
        id: 'artnet_gallery_view', group: 'Overlays', type: 'subpage',
        name: 'Gallery Page', key: 'ARTNET_GALLERY_VIEW',
        file: 'ui/ArtnetUI.jsx',
        desc: 'Gallery profile — current exhibitions, represented artists, contact info.',
        status: 'active',
        parent: 'artnet_terminal',
        transitions: [
            { to: 'bloomberg', label: 'Back', method: 'transitionTo' },
        ],
        properties: {
            'Data Source': 'rooms.js VENUES array',
            'Exhibitions': 'Current and upcoming shows',
            'Artists Grid': 'Cards for represented artists with tier badges',
            'Contact': 'Address, phone, email, hours',
        },
    },
    {
        id: 'artnet_marketplace', group: 'Overlays', type: 'subpage',
        name: 'Artnet Marketplace', key: OVERLAY.ARTNET_MARKETPLACE,
        file: 'ui/ArtnetMarketplace.jsx',
        desc: 'Browse and purchase art online — artnet.com marketplace clone.',
        status: 'active',
        parent: 'artnet_terminal',
        transitions: [
            { to: 'bloomberg', label: 'Back to Terminal', method: 'transitionTo' },
        ],
        properties: { 'Listings': 'Artwork cards with bid/buy', 'Search': 'Filter by artist, medium, price', 'Cart': 'Purchase flow' },
    },
    {
        id: 'mobile_joypad', group: 'Overlays', type: 'view',
        name: 'Mobile Joypad', key: 'MOBILE_JOYPAD',
        file: 'ui/MobileJoypad.jsx',
        desc: 'Touch controls overlay for mobile play.',
        status: 'active',
        transitions: [],
        properties: { 'D-Pad': 'Virtual directional pad', 'Buttons': 'A/B action buttons', 'Position': 'Bottom corners, auto-hide on desktop' },
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
    const [isMobile, setIsMobile] = useState(false);
    const [showInspector, setShowInspector] = useState(false); // mobile: toggle tree vs inspector

    // Responsive detection
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e) => setIsMobile(e.matches);
        handler(mq);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

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

    const handleSelectPage = useCallback((id) => {
        setSelectedId(id);
        if (isMobile) setShowInspector(true); // auto-switch to inspector on mobile
    }, [isMobile]);

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

    // On mobile: show only one panel at a time
    const showTree = !isMobile || !showInspector;
    const showPanel = !isMobile || showInspector;
    const treeWidth = isMobile ? '100%' : 300;

    return (
        <div style={{ display: 'flex', height: '100%', fontFamily: mono, fontSize: 11, color: '#ccc', background: '#08080d', position: 'relative' }}>

            {/* ═══ Left Panel: Page Tree ═══ */}
            <div style={{
                width: treeWidth,
                borderRight: isMobile ? 'none' : '1px solid #1a1a25',
                overflowY: 'auto', flexShrink: 0,
                display: showTree ? 'flex' : 'none',
                flexDirection: 'column',
            }}>

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
                                            onClick={() => handleSelectPage(page.id)}
                                            style={{
                                                padding: isMobile ? '12px 14px 12px 20px' : '7px 14px 7px 20px',
                                                cursor: 'pointer',
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
            <div style={{ flex: 1, overflowY: 'auto', display: showPanel ? 'block' : 'none' }}>
                {/* Mobile back button */}
                {isMobile && (
                    <button
                        onClick={() => setShowInspector(false)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '10px 16px', width: '100%',
                            background: '#0b0b12', border: 'none',
                            borderBottom: '1px solid #1a1a25',
                            color: '#c9a84c', fontSize: 12, fontFamily: mono,
                            cursor: 'pointer', textAlign: 'left',
                        }}
                    >
                        ← Back to Pages
                    </button>
                )}
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
                <div style={{ fontSize: 13, color: '#555', letterSpacing: '0.08em', marginBottom: 8 }}>TAP A PAGE TO INSPECT</div>
                <div style={{ fontSize: 10, color: '#333', lineHeight: 1.8 }}>
                    {stats.total} total · {stats.active} active · {stats.scenes} scenes · {stats.views} views · {stats.overlays} overlays
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// Page Preview — Visual schematic mockup of what the player sees
// ══════════════════════════════════════════════════════════════

const PREVIEW_ELEMENTS = {
    // Map page IDs to their visual element descriptions
    boot_sequence: { layout: 'centered', elements: ['🎮 ART LIFE', 'Loading bar', 'Asset preloader'] },
    artnet_login: { layout: 'form', elements: ['artnet logo', 'Email input', 'Password input', 'Sign In button', 'Save slots'] },
    character_creator: { layout: 'gallery', elements: ['6 archetype cards', 'Stat preview', 'Description', 'Confirm button'] },
    title_screen: { layout: 'centered', elements: ['ART LIFE title', 'Press START prompt', 'Animated background'] },
    intro_briefing: { layout: 'cinematic', elements: ['Typewriter text', 'Art market briefing', 'Background fade'] },
    overworld: { layout: 'game', elements: ['Pixel map (40×30)', 'Player sprite', 'NPCs (9)', 'Signs (14)', 'Doors', 'HUD'] },
    dashboard: { layout: 'hud', elements: ['Net Worth', 'Cash', 'Portfolio', 'Ledger', 'Stat bars', 'Ticker'] },
    terminal: { layout: 'terminal', elements: ['Console output', 'Ticker tape', 'Week counter', 'Command input', 'Menu options'] },
    scene_engine: { layout: 'cinematic', elements: ['Portrait left', 'Portrait right', 'Narrative text', 'Choice buttons'] },
    city_hub: { layout: 'game', elements: ['City background', 'Venue list', 'Fast travel icon', 'NPC encounters'] },
    venue_interior: { layout: 'game', elements: ['Gallery tilemap', 'Artworks on walls', 'NPCs', 'Exit doors', 'Info signs'] },
    fast_travel: { layout: 'centered', elements: ['City selection', 'Travel animation', 'Destination preview'] },
    dialogue: { layout: 'dialogue', elements: ['Speaker name', 'Dialog text', 'Choice options (2-4)', 'Stat effects'] },
    mac_dialogue: { layout: 'cinematic', elements: ['Left sprite (you)', 'Right sprite (NPC)', 'Dialog bubble', 'Choice panel'] },
    haggle_game: { layout: 'battle', elements: ['Your offer', 'Their counter', 'Round indicator', 'Art preview', 'Accept/Reject'] },
    endgame: { layout: 'centered', elements: ['Final score', 'Portfolio value', 'Achievements', 'Play Again button'] },
};

function PagePreview({ page }) {
    const [expanded, setExpanded] = React.useState(false);
    const preview = PREVIEW_ELEMENTS[page.id] || { layout: page.type, elements: Object.keys(page.properties || {}) };
    const propEntries = Object.entries(page.properties || {});
    const typeColor = TYPE_COLORS[page.type] || '#888';

    // Layout-specific colors
    const layoutColors = {
        game: { bg: '#0a1a0a', border: '#2a5a2a', accent: '#4ade80' },
        terminal: { bg: '#0a0a14', border: '#2a2a4e', accent: '#c9a84c' },
        form: { bg: '#12120d', border: '#3a3a2e', accent: '#c9a84c' },
        centered: { bg: '#0d0d14', border: '#2a2a3e', accent: '#888' },
        dialogue: { bg: '#1a0a0a', border: '#4a2a2a', accent: '#ef4444' },
        cinematic: { bg: '#0d0a1a', border: '#3a2a5a', accent: '#a78bfa' },
        battle: { bg: '#1a0d0a', border: '#4a3a2a', accent: '#f59e0b' },
        hud: { bg: '#0a0a14', border: '#2a2a4e', accent: '#88bbdd' },
        gallery: { bg: '#0d100d', border: '#2a3a2a', accent: '#4ade80' },
        view: { bg: '#0a0a14', border: '#2a2a3e', accent: '#c9a84c' },
        scene: { bg: '#0a1a0a', border: '#2a5a2a', accent: '#4ade80' },
        overlay: { bg: '#0a1020', border: '#2a3a5e', accent: '#4488cc' },
    };

    const lc = layoutColors[preview.layout] || layoutColors.centered;

    return (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #141420' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: '#888', letterSpacing: '0.1em', fontWeight: 600 }}>
                    👁️ PAGE PREVIEW
                </span>
                <button onClick={() => setExpanded(!expanded)} style={{
                    background: 'none', border: '1px solid #222', color: '#555',
                    fontSize: 8, padding: '2px 8px', cursor: 'pointer', fontFamily: mono, borderRadius: 2,
                }}>{expanded ? '⊟ COLLAPSE' : '⊞ EXPAND'}</button>
            </div>

            {/* Preview frame */}
            <div style={{
                position: 'relative', overflow: 'hidden',
                borderRadius: 8, border: `1px solid ${lc.border}`,
                background: lc.bg, height: expanded ? 280 : 140,
                transition: 'height 0.2s ease',
            }}>
                {/* Screen frame */}
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    padding: 10,
                }}>
                    {/* Title bar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        marginBottom: 8, paddingBottom: 6,
                        borderBottom: `1px solid ${lc.border}`,
                    }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
                        <span style={{
                            marginLeft: 8, fontSize: 8, color: lc.accent + '88',
                            letterSpacing: '0.05em',
                        }}>{page.name}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 7, color: '#333' }}>
                            {preview.layout.toUpperCase()}
                        </span>
                    </div>

                    {/* Element blocks */}
                    <div style={{
                        flex: 1, display: 'flex', flexWrap: 'wrap',
                        gap: 4, alignContent: 'flex-start',
                    }}>
                        {preview.elements.map((el, i) => {
                            // Different sizes for different element types
                            const isWide = el.includes('map') || el.includes('background') || el.includes('text') || el.includes('bar') || el.includes('Console') || el.includes('Ticker');
                            const isSmall = el.includes('dot') || el.includes('icon') || el.includes('button');
                            return (
                                <div key={i} style={{
                                    flex: isWide ? '1 0 100%' : isSmall ? '0 0 auto' : '1 0 calc(50% - 4px)',
                                    padding: isSmall ? '3px 6px' : '6px 8px',
                                    borderRadius: 4,
                                    background: `${lc.accent}08`,
                                    border: `1px solid ${lc.accent}22`,
                                    fontSize: 8, color: lc.accent + 'bb',
                                    textAlign: 'center',
                                    minHeight: isWide ? 24 : 18,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {el}
                                </div>
                            );
                        })}
                    </div>

                    {/* Transition arrows at bottom */}
                    {page.transitions?.length > 0 && (
                        <div style={{
                            display: 'flex', gap: 6, marginTop: 6,
                            paddingTop: 6, borderTop: `1px solid ${lc.border}`,
                            overflowX: 'auto',
                        }}>
                            {page.transitions.slice(0, 4).map((t, i) => (
                                <div key={i} style={{
                                    fontSize: 7, padding: '2px 6px', borderRadius: 3,
                                    background: typeColor + '10',
                                    border: `1px solid ${typeColor}22`,
                                    color: typeColor + 'aa',
                                    whiteSpace: 'nowrap',
                                }}>
                                    → {t.label || t.to}
                                </div>
                            ))}
                            {(page.transitions?.length || 0) > 4 && (
                                <span style={{ fontSize: 7, color: '#444' }}>
                                    +{page.transitions.length - 4} more
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick properties under preview */}
            {propEntries.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {propEntries.slice(0, 5).map(([key]) => (
                        <span key={key} style={{
                            fontSize: 7, padding: '2px 5px', borderRadius: 2,
                            background: '#111', border: '1px solid #222', color: '#555',
                        }}>{key}</span>
                    ))}
                    {propEntries.length > 5 && (
                        <span style={{ fontSize: 7, color: '#333' }}>+{propEntries.length - 5}</span>
                    )}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// Property Panel — GameMaker-inspired editable inspector
// ══════════════════════════════════════════════════════════════

function PropertyPanel({ page, allPages, onUpdate }) {
    const [editingProps, setEditingProps] = React.useState(false);

    // ── Styles ──
    const section = { padding: '16px 20px', borderBottom: '1px solid #141420' };
    const sectionHeader = { color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, display: 'block', fontWeight: 600 };
    const sectionHint = { color: '#444', fontSize: 10, marginBottom: 10, lineHeight: 1.5 };
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
    const propEntries = Object.entries(page.properties || {});

    // ── Status descriptions ──
    const STATUS_DESC = {
        active: 'This page is live and working in the game.',
        unused: 'This page exists but is not currently used.',
        planned: 'This page is planned but not yet built.',
    };
    const TYPE_DESC = {
        view: 'A React screen that fills the entire viewport',
        scene: 'A Phaser game scene (pixel graphics, sprites, interaction)',
        overlay: 'A popup layer that sits on top of other content',
    };

    return (
        <div>
            {/* ── Hero Card ── */}
            <div style={{
                padding: '20px', borderBottom: '2px solid #1a1a28',
                background: 'linear-gradient(180deg, #111118 0%, #08080d 100%)',
            }}>
                {/* Name + Icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: TYPE_COLORS[page.type] + '15',
                        border: `1px solid ${TYPE_COLORS[page.type]}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22,
                    }}>
                        {TYPE_ICONS[page.type]}
                    </div>
                    <div style={{ flex: 1 }}>
                        <input
                            value={page.name}
                            onChange={e => onUpdate(page.id, { name: e.target.value })}
                            style={{ ...inputStyle, fontSize: 18, fontWeight: 700, color: '#fff', background: 'transparent', border: '1px solid transparent', padding: '2px 4px', width: '100%' }}
                            onFocus={e => e.target.style.borderColor = '#c9a84c44'}
                            onBlur={e => e.target.style.borderColor = 'transparent'}
                        />
                        <div style={{ fontSize: 10, color: '#555', paddingLeft: 6, marginTop: 2 }}>
                            {TYPE_DESC[page.type] || 'Game page'}
                        </div>
                    </div>
                </div>

                {/* Status + Type badges */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', paddingLeft: 2 }}>
                    <select
                        value={page.status}
                        onChange={e => onUpdate(page.id, { status: e.target.value })}
                        style={{
                            background: STATUS_COLORS[page.status] + '15', border: `1px solid ${STATUS_COLORS[page.status]}44`,
                            color: STATUS_COLORS[page.status], fontSize: 10, padding: '4px 12px', fontFamily: mono,
                            borderRadius: 20, cursor: 'pointer', outline: 'none', fontWeight: 600,
                        }}
                    >
                        <option value="active">● Active</option>
                        <option value="unused">○ Unused</option>
                        <option value="planned">◐ Planned</option>
                    </select>
                    <span style={{
                        fontSize: 10, padding: '4px 12px', borderRadius: 20,
                        background: TYPE_COLORS[page.type] + '18', color: TYPE_COLORS[page.type],
                        border: `1px solid ${TYPE_COLORS[page.type]}33`, fontWeight: 600,
                    }}>
                        {page.type === 'view' ? '📱 React View' : page.type === 'scene' ? '🎮 Phaser Scene' : '📋 Overlay'}
                    </span>
                </div>

                {/* Status description */}
                <div style={{ fontSize: 10, color: '#555', paddingLeft: 2, fontStyle: 'italic' }}>
                    {STATUS_DESC[page.status]}
                </div>
            </div>

            {/* ── Visual Page Preview ── */}
            <PagePreview page={page} />

            {/* ── Flow Breadcrumb ── */}
            <FlowBreadcrumb page={page} allPages={allPages} />

            {/* ── Data Sources ── */}
            <DataSources page={page} />

            {/* ── CMS Cross-links ── */}
            <CMSLinks page={page} />

            {/* ── What This Page Does ── */}
            <div style={section}>
                <span style={sectionHeader}>📝 What This Page Does</span>
                <div style={sectionHint}>Describe what the player sees and can do here.</div>
                <textarea
                    value={page.desc}
                    onChange={e => onUpdate(page.id, { desc: e.target.value })}
                    style={{ ...textareaStyle, fontSize: 12, fontFamily: '-apple-system, sans-serif', lineHeight: 1.6 }}
                    placeholder="Describe what happens on this page..."
                />
            </div>

            {/* ── Page Details ── */}
            <div style={section}>
                <span style={sectionHeader}>⚙️ Page Details</span>
                <div style={sectionHint}>Technical details and features of this page.</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: '#555' }}>{propEntries.length} properties</span>
                    <button onClick={() => setEditingProps(!editingProps)} style={{
                        background: editingProps ? '#c9a84c22' : 'none', border: `1px solid ${editingProps ? '#c9a84c44' : '#222'}`,
                        color: editingProps ? '#c9a84c' : '#555', fontSize: 9, padding: '3px 10px',
                        cursor: 'pointer', fontFamily: mono, borderRadius: 3,
                    }}>
                        {editingProps ? '✓ DONE' : '✏️ EDIT'}
                    </button>
                </div>

                {/* Property cards (read-only by default) */}
                <div style={{ display: 'grid', gridTemplateColumns: propEntries.length > 4 ? '1fr 1fr' : '1fr', gap: 6 }}>
                    {propEntries.map(([key, value]) => (
                        <div key={key} style={{
                            padding: '8px 10px', borderRadius: 6,
                            background: '#0b0b16', border: '1px solid #161625',
                        }}>
                            <div style={{ fontSize: 9, color: '#4ade80', marginBottom: 3, fontWeight: 600, letterSpacing: '0.04em' }}>{key}</div>
                            {editingProps ? (
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <input
                                        value={value}
                                        onChange={e => updateProperty(key, e.target.value)}
                                        style={{ ...inputStyle, fontSize: 10, flex: 1 }}
                                    />
                                    <button onClick={() => removeProperty(key)} title="Remove"
                                        style={{ background: 'none', border: 'none', color: '#c94040', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>×</button>
                                </div>
                            ) : (
                                <div style={{ fontSize: 10, color: '#999', lineHeight: 1.4 }}>{value || '—'}</div>
                            )}
                        </div>
                    ))}
                </div>
                {editingProps && (
                    <button onClick={addProperty} style={{
                        marginTop: 8, background: '#0b0b16', border: '1px dashed #222', color: '#555',
                        fontSize: 10, padding: '6px 12px', cursor: 'pointer', fontFamily: mono,
                        borderRadius: 4, width: '100%', textAlign: 'center',
                    }}>
                        + Add Property
                    </button>
                )}
            </div>

            {/* ── Where Can The Player Go From Here? ── */}
            <div style={section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={sectionHeader}>🔀 Player Exits</span>
                    <button onClick={addTransition} style={{
                        background: 'none', border: '1px solid #222', color: '#555',
                        fontSize: 9, padding: '3px 10px', cursor: 'pointer', fontFamily: mono, borderRadius: 3,
                    }}>
                        + Add Exit
                    </button>
                </div>
                <div style={sectionHint}>Where can the player go from this page?</div>

                {page.transitions.length === 0 ? (
                    <div style={{
                        padding: '16px', textAlign: 'center', borderRadius: 6,
                        background: '#0b0b16', border: '1px dashed #222', color: '#333', fontSize: 10,
                    }}>
                        🚫 Dead end — no exits from this page
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {page.transitions.map((t, i) => {
                            const target = allPages.find(p => p.id === t.to);
                            return (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 12px', borderRadius: 8,
                                    background: '#0b0b16', border: '1px solid #1a1a28',
                                    transition: 'border-color 0.15s',
                                }}>
                                    {/* Arrow icon */}
                                    <div style={{
                                        width: 28, height: 28, borderRadius: 6,
                                        background: '#c9a84c15', border: '1px solid #c9a84c33',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#c9a84c', fontSize: 14, flexShrink: 0,
                                    }}>→</div>
                                    {/* Target info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <select
                                            value={t.to}
                                            onChange={e => updateTransition(i, 'to', e.target.value)}
                                            style={{ ...inputStyle, fontSize: 11, fontWeight: 600, border: '1px solid transparent', background: 'transparent', color: '#ccc', padding: '2px 0', cursor: 'pointer' }}
                                        >
                                            <option value="">— Select target —</option>
                                            {allPages.filter(p => p.id !== page.id).map(p => (
                                                <option key={p.id} value={p.id}>{TYPE_ICONS[p.type]} {p.name}</option>
                                            ))}
                                        </select>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                                            <input
                                                value={t.label} placeholder="When... (e.g. 'Player clicks Start')"
                                                onChange={e => updateTransition(i, 'label', e.target.value)}
                                                style={{ ...inputStyle, fontSize: 9, flex: 2, border: '1px solid transparent', background: 'transparent', color: '#666', padding: '2px 0' }}
                                            />
                                            <input
                                                value={t.method} placeholder="How (technical)"
                                                onChange={e => updateTransition(i, 'method', e.target.value)}
                                                style={{ ...inputStyle, fontSize: 8, flex: 1, border: '1px solid transparent', background: 'transparent', color: '#333', padding: '2px 0' }}
                                            />
                                        </div>
                                    </div>
                                    <button onClick={() => removeTransition(i)} title="Remove this exit"
                                        style={{ background: 'none', border: 'none', color: '#c9404066', cursor: 'pointer', fontSize: 16, padding: '4px', lineHeight: 1 }}>×</button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── How Does The Player Get Here? ── */}
            <div style={section}>
                <span style={sectionHeader}>⬅️ Player Entrances</span>
                <div style={sectionHint}>How does the player arrive at this page?</div>
                {incoming.length === 0 ? (
                    <div style={{
                        padding: '12px', textAlign: 'center', borderRadius: 6,
                        background: '#0b0b16', border: '1px dashed #222', color: '#333', fontSize: 10,
                    }}>
                        ⚠️ Unreachable — no pages lead here
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {incoming.map(p => {
                            const transition = p.transitions.find(t => t.to === page.id);
                            return (
                                <div key={p.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 10px', borderRadius: 6,
                                    background: '#0d0d18', border: '1px solid #1a1a28',
                                }}>
                                    <span style={{ fontSize: 13 }}>{TYPE_ICONS[p.type]}</span>
                                    <div>
                                        <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>{p.name}</div>
                                        {transition?.label && (
                                            <div style={{ fontSize: 8, color: '#555' }}>via "{transition.label}"</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Source File ── */}
            <div style={section}>
                <span style={sectionHeader}>📂 Source File</span>
                <div style={{
                    padding: '8px 12px', borderRadius: 6,
                    background: '#0b0b16', border: '1px solid #161625',
                    color: '#6baed6', fontSize: 11, fontFamily: mono,
                }}>
                    src/{page.file}
                </div>
            </div>

            {/* ── ID + Reset ── */}
            <div style={{ ...section, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: '#333' }}>Internal ID: {page.id}</span>
                <button
                    onClick={() => {
                        if (confirm('Reset this page to defaults?')) {
                            const def = DEFAULT_REGISTRY.find(d => d.id === page.id);
                            if (def) onUpdate(page.id, { ...def });
                        }
                    }}
                    style={{ background: 'none', border: '1px solid #222', color: '#c94040', fontSize: 9, padding: '4px 12px', cursor: 'pointer', fontFamily: mono, borderRadius: 3 }}
                >
                    ↻ Reset to Default
                </button>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// Flow Breadcrumb — traces path from boot to selected page
// ══════════════════════════════════════════════════════════════

function FlowBreadcrumb({ page, allPages }) {
    const path = useMemo(() => {
        // BFS from boot_sequence to find shortest path to selected page
        const visited = new Set();
        const queue = [{ id: 'boot_sequence', path: ['boot_sequence'] }];
        visited.add('boot_sequence');

        while (queue.length > 0) {
            const { id, path: currentPath } = queue.shift();
            if (id === page.id) return currentPath;

            const node = allPages.find(p => p.id === id);
            if (!node) continue;

            for (const t of node.transitions) {
                if (t.to && !visited.has(t.to)) {
                    visited.add(t.to);
                    queue.push({ id: t.to, path: [...currentPath, t.to] });
                }
            }
        }
        // If no path from boot, just show the page itself
        return [page.id];
    }, [page.id, allPages]);

    if (path.length <= 1) return null;

    return (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid #141420', background: '#0a0a12' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                {path.map((id, i) => {
                    const p = allPages.find(pg => pg.id === id);
                    if (!p) return null;
                    const isCurrent = id === page.id;
                    return (
                        <React.Fragment key={id}>
                            {i > 0 && <span style={{ color: '#222', fontSize: 10 }}>→</span>}
                            <span style={{
                                fontSize: 9, padding: '2px 6px', borderRadius: 2,
                                background: isCurrent ? '#c9a84c22' : '#111',
                                color: isCurrent ? '#c9a84c' : '#555',
                                border: `1px solid ${isCurrent ? '#c9a84c33' : '#1a1a25'}`,
                                fontWeight: isCurrent ? 700 : 400,
                            }}>
                                {TYPE_ICONS[p.type]} {p.name}
                            </span>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// Data Sources — which data files feed this page
// ══════════════════════════════════════════════════════════════

const DATA_SOURCES_MAP = {
    boot_sequence: [{ file: 'data/scene-keys.js', label: 'Scene Keys', size: '0.6KB' }],
    artnet_login: [{ file: 'core/views.js', label: 'View Constants', size: '~1KB' }],
    character_creator: [{ file: 'data/characters.js', label: 'Character Classes', size: '10KB', detail: '4 classes, 5 stats each' }],
    overworld: [{ file: 'content/maps/larus.json', label: 'Larus Map', size: '~50KB', detail: '9 warps, 14 signs, 9 NPCs' }],
    terminal: [{ file: 'data/ticker_phrases.js', label: 'Ticker Phrases', size: '4.5KB', detail: '100+ phrases' },
    { file: 'data/scenes.js', label: 'Narrative Scenes', size: '18KB' }],
    city_hub: [{ file: 'data/rooms.js', label: 'Venue Data', size: '96KB', detail: 'All venues and rooms' },
    { file: 'data/cities.js', label: 'City Config', size: '2.5KB' }],
    venue_interior: [{ file: 'data/rooms.js', label: 'Venue Rooms', size: '96KB', detail: 'Items, NPCs, exits per room' },
    { file: 'data/contacts.js', label: 'NPC Contacts', size: '52KB' }],
    haggle_game: [{ file: 'data/haggle_config.js', label: 'Haggle Config', size: '60KB', detail: 'Round rules, price ranges' },
    { file: 'data/artworks.js', label: 'Artwork Database', size: '264KB', detail: '561 real artworks' }],
    dialogue: [{ file: 'data/dialogue_trees.js', label: 'Dialogue Trees', size: '123KB', detail: '5-tone system, branching nodes' },
    { file: 'data/contacts.js', label: 'NPC Contacts', size: '52KB' }],
    mac_dialogue: [{ file: 'data/dialogue_trees.js', label: 'Dialogue Trees', size: '123KB' },
    { file: 'data/backgrounds.js', label: 'Backgrounds', size: '2.2KB' }],
    scene_engine: [{ file: 'data/scenes.js', label: 'Scene Scripts', size: '18KB', detail: 'Branching VN scenes with choices' }],
    fast_travel: [{ file: 'data/cities.js', label: 'City Config', size: '2.5KB' },
    { file: 'data/world_locations.js', label: 'Locations', size: '6.5KB' }],
    bloomberg: [{ file: 'data/artworks.js', label: 'Market Data', size: '264KB' },
    { file: 'data/artists.js', label: 'Artist Prices', size: '5KB' }],
    inventory: [{ file: 'data/artworks.js', label: 'Artwork Database', size: '264KB' }],
    dashboard: [{ file: 'data/characters.js', label: 'Stats Config', size: '10KB' }],
    cms: [{ file: 'data/DataTemplates.js', label: 'CMS Templates', size: '9.7KB' },
    { file: 'data/storylines.js', label: 'Storylines', size: '18KB' }],
    gmail: [{ file: 'data/calendar_events.js', label: 'Calendar Events', size: '12.6KB' }],
};

function DataSources({ page }) {
    const sources = DATA_SOURCES_MAP[page.id];
    if (!sources || sources.length === 0) return null;

    const sectionStyle = { padding: '10px 20px', borderBottom: '1px solid #141420' };
    const labelStyle = { color: '#555', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6, display: 'block' };

    return (
        <div style={sectionStyle}>
            <span style={labelStyle}>Data Sources ({sources.length})</span>
            {sources.map((s, i) => (
                <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                    marginBottom: 2, borderRadius: 3, background: '#0a0a14',
                    border: '1px solid #131325',
                }}>
                    <span style={{ fontSize: 12 }}>📂</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: '#6baed6' }}>{s.file}</div>
                        <div style={{ fontSize: 9, color: '#444' }}>
                            {s.label}
                            {s.size && <span style={{ color: '#333', marginLeft: 6 }}>({s.size})</span>}
                        </div>
                        {s.detail && <div style={{ fontSize: 8, color: '#50c87866', marginTop: 1 }}>{s.detail}</div>}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// CMS Cross-links — jump to related editor tabs
// ══════════════════════════════════════════════════════════════

const CMS_LINKS_MAP = {
    overworld: [{ tab: 'venues', label: 'Venues / Map' }],
    city_hub: [{ tab: 'venues', label: 'Venues / Map' }, { tab: 'npcs', label: 'NPCs & Roles' }],
    venue_interior: [{ tab: 'venues', label: 'Venues / Map' }, { tab: 'artworks', label: 'Artworks' }, { tab: 'npcs', label: 'NPCs' }],
    haggle_game: [{ tab: 'haggle', label: 'Haggle Battles' }, { tab: 'artworks', label: 'Artworks' }, { tab: 'marketsim', label: 'Market Sim' }],
    dialogue: [{ tab: 'events', label: 'Events / Dialogue' }, { tab: 'npcs', label: 'NPCs' }],
    mac_dialogue: [{ tab: 'events', label: 'Events / Dialogue' }],
    scene_engine: [{ tab: 'storylines', label: 'Storylines' }, { tab: 'events', label: 'Events' }],
    terminal: [{ tab: 'board', label: 'Project Board' }],
    bloomberg: [{ tab: 'marketsim', label: 'Market Sim' }, { tab: 'artworks', label: 'Artworks' }],
    character_creator: [{ tab: 'npcs', label: 'NPCs & Roles' }],
    cms: [{ tab: 'board', label: 'Project Board' }, { tab: 'engines', label: 'Engines' }],
    inventory: [{ tab: 'artworks', label: 'Artworks / Market' }],
    dashboard: [{ tab: 'marketsim', label: 'Market Sim' }],
    gmail: [{ tab: 'events', label: 'Events / Dialogue' }],
    fast_travel: [{ tab: 'venues', label: 'Venues / Map' }],
};

function CMSLinks({ page }) {
    const links = CMS_LINKS_MAP[page.id];
    if (!links || links.length === 0) return null;

    const sectionStyle = { padding: '10px 20px', borderBottom: '1px solid #141420' };
    const labelStyle = { color: '#555', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6, display: 'block' };

    // Dispatch navigation event to MasterCMS
    const jumpToTab = (tabId) => {
        window.__cmsNavigateTo = { tab: tabId, ts: Date.now() };
    };

    return (
        <div style={sectionStyle}>
            <span style={labelStyle}>Related Editors</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {links.map((link, i) => (
                    <button key={i} onClick={() => jumpToTab(link.tab)}
                        style={{
                            background: '#0d0d18', border: '1px solid #1a1a28', color: '#c9a84c',
                            fontSize: 9, padding: '4px 10px', cursor: 'pointer',
                            fontFamily: mono, borderRadius: 3, transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.target.style.background = '#161630'; e.target.style.borderColor = '#c9a84c33'; }}
                        onMouseLeave={e => { e.target.style.background = '#0d0d18'; e.target.style.borderColor = '#1a1a28'; }}
                    >
                        → {link.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

