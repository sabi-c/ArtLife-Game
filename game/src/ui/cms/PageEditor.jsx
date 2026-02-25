/**
 * PageEditor.jsx — Hierarchical Page Tree + Inspector
 *
 * Shows all game pages (Views, Scenes, Overlays) in a tree structure
 * organized by flow order. Clicking a page opens an editable inspector
 * panel with metadata, transitions, component info, and content.
 *
 * This is the practical editing companion to the visual FlowEditor.
 */

import React, { useState, useMemo } from 'react';
import { VIEW, OVERLAY } from '../../core/views.js';
import { useCmsStore } from '../../stores/cmsStore.js';
import { navigate } from '../../hooks/usePageRouter.js';

// ══════════════════════════════════════════════════════════════
// Page Registry — every page in the game with editable metadata
// ══════════════════════════════════════════════════════════════

const PAGE_REGISTRY = [
    // ── Boot Flow ──
    {
        id: 'boot_sequence', group: 'Boot Flow', type: 'scene',
        name: 'Boot Scene', key: 'BootScene',
        file: 'scenes/BootScene.js',
        desc: 'Preloads all game assets (sprites, maps, audio). Routes to character creation when done.',
        status: 'active',
        transitions: [
            { to: 'artnet_login', label: 'Assets loaded', method: 'GameEventBus UI_ROUTE' },
        ],
        component: 'BootScene (Phaser)',
        configFields: ['Asset list in preload()', 'Loading progress bar'],
    },
    {
        id: 'artnet_login', group: 'Boot Flow', type: 'view',
        name: 'Artnet Login', key: VIEW.BOOT,
        file: 'ui/ArtnetLogin.jsx',
        desc: 'Artnet-styled email login screen. User enters email to begin. First impression of the game\'s aesthetic.',
        status: 'active',
        transitions: [
            { to: 'character_creator', label: 'Login success (new user)', method: 'setActiveView' },
            { to: 'artnet_dashboard', label: 'Login success (returning user)', method: 'setActiveView' },
        ],
        component: 'ArtnetLogin.jsx',
        configFields: ['Login form fields', 'Animation timing', 'Background style'],
    },
    {
        id: 'character_creator', group: 'Boot Flow', type: 'view',
        name: 'Character Creator', key: VIEW.CHARACTER_CREATOR,
        file: 'ui/CharacterCreator.jsx',
        desc: 'Choose your character class and customize stats. Sets initial game state.',
        status: 'active',
        transitions: [
            { to: 'title_screen', label: 'Character created', method: 'navigate' },
        ],
        component: 'CharacterCreator.jsx',
        configFields: ['Character classes', 'Starting stats', 'Portrait options'],
    },
    {
        id: 'title_screen', group: 'Boot Flow', type: 'scene',
        name: 'Title Screen', key: 'TitleScene',
        file: 'scenes/TitleScene.js',
        desc: 'Graphical title screen with "Press Start" prompt. Launches the overworld.',
        status: 'active',
        transitions: [
            { to: 'overworld', label: 'Press Start', method: 'scene.stop → launch NewWorldScene' },
        ],
        component: 'TitleScene (Phaser)',
        configFields: ['Title text', 'Background animation', 'Music track'],
    },

    // ── Main Game ──
    {
        id: 'overworld', group: 'Main Game', type: 'scene',
        name: 'Overworld (Larus)', key: 'NewWorldScene',
        file: 'scenes/NewWorldScene.js',
        desc: 'The main game world — walk around larus.json map, talk to NPCs, enter warps, read signs.',
        status: 'active',
        transitions: [
            { to: 'dashboard', label: 'ESC / Exit menu', method: 'GameEventBus UI_ROUTE' },
            { to: 'city_hub', label: 'Warp zone (dungeon)', method: 'GameEventBus LAUNCH_SCENE' },
        ],
        component: 'NewWorldScene (Phaser)',
        configFields: ['Map: larus.json', 'Warp zones (9)', 'Info markers (14)', 'NPCs (9)', 'Spawn point'],
    },
    {
        id: 'dashboard', group: 'Main Game', type: 'view',
        name: 'Player Dashboard', key: VIEW.DASHBOARD,
        file: 'ui/PlayerDashboard.jsx',
        desc: 'React overlay — stats, ledger, portfolio summary.',
        status: 'active',
        transitions: [
            { to: 'terminal', label: 'Close dashboard', method: 'setActiveView' },
        ],
        component: 'PlayerDashboard.jsx',
        configFields: ['Stats display', 'Portfolio grid', 'Weekly summary'],
    },
    {
        id: 'terminal', group: 'Main Game', type: 'view',
        name: 'Terminal', key: VIEW.TERMINAL,
        file: 'ui/terminal/TerminalUI.js',
        desc: 'DOM-based text terminal — menus, dashboard views, event narration.',
        status: 'active',
        transitions: [
            { to: 'overworld', label: 'Enter World', method: 'navigate to PHASER' },
            { to: 'bloomberg', label: 'Open Bloomberg', method: 'overlay' },
            { to: 'cms', label: 'Open CMS', method: 'overlay' },
        ],
        component: 'TerminalUI.js (vanilla DOM)',
        configFields: ['Screen stack (dashboard, market, phone, etc.)', 'Ticker phrases', 'Terminal commands'],
    },

    // ── Venue Flow ──
    {
        id: 'city_hub', group: 'Venue Flow', type: 'scene',
        name: 'City Hub', key: 'CityScene',
        file: 'scenes/CityScene.js',
        desc: 'City overview — list of venues, fast travel between cities.',
        status: 'active',
        transitions: [
            { to: 'venue_interior', label: 'Enter venue', method: 'scene.start LocationScene' },
            { to: 'fast_travel', label: 'Travel to city', method: 'scene.launch FastTravelScene' },
            { to: 'terminal', label: 'Leave city', method: 'GameEventBus UI_ROUTE' },
        ],
        component: 'CityScene (Phaser)',
        configFields: ['Venue list', 'City background', 'Available NPCs'],
    },
    {
        id: 'venue_interior', group: 'Venue Flow', type: 'scene',
        name: 'Venue Interior', key: 'LocationScene',
        file: 'scenes/LocationScene.js',
        desc: 'Inside a gallery, auction house, or studio — browse art, talk to NPCs, trigger events.',
        status: 'active',
        transitions: [
            { to: 'haggle_game', label: 'Buy/Sell art', method: 'scene.start HaggleScene' },
            { to: 'dialogue', label: 'Talk to NPC', method: 'scene.launch DialogueScene' },
            { to: 'city_hub', label: 'Leave venue', method: 'scene.start (return)' },
        ],
        component: 'LocationScene (Phaser)',
        configFields: ['Venue data (rooms.js)', 'NPC list', 'Artwork display', 'Exit zones'],
    },
    {
        id: 'haggle_game', group: 'Venue Flow', type: 'scene',
        name: 'Haggle / Deal', key: 'HaggleScene',
        file: 'scenes/HaggleScene.js',
        desc: 'Art dealing mini-game — negotiation rounds with dealer AI.',
        status: 'active',
        transitions: [
            { to: 'terminal', label: 'Deal complete', method: 'GameEventBus UI_ROUTE' },
        ],
        component: 'HaggleScene (Phaser)',
        configFields: ['haggle_config.js', 'Dealer types', 'Price modifiers', 'Round count'],
    },

    // ── Dialogue ──
    {
        id: 'dialogue', group: 'Dialogue', type: 'scene',
        name: 'Text Dialogue', key: 'DialogueScene',
        file: 'scenes/DialogueScene.js',
        desc: 'Text-based dialogue with choices — branching conversations, stat effects.',
        status: 'active',
        transitions: [
            { to: 'terminal', label: 'End dialogue', method: 'GameEventBus UI_ROUTE' },
        ],
        component: 'DialogueScene (Phaser)',
        configFields: ['dialogue_trees.js', 'Speaker portraits', 'Choice effects'],
    },
    {
        id: 'mac_dialogue', group: 'Dialogue', type: 'scene',
        name: 'Visual Dialogue', key: 'MacDialogueScene',
        file: 'scenes/MacDialogueScene.js',
        desc: 'Over-the-shoulder visual dialogue — sprite backgrounds, cinematic feel.',
        status: 'active',
        transitions: [
            { to: 'terminal', label: 'End dialogue', method: 'GameEventBus UI_ROUTE' },
        ],
        component: 'MacDialogueScene (Phaser)',
        configFields: ['Left/right sprites', 'Background image', 'Dialogue data'],
    },
    {
        id: 'scene_engine', group: 'Dialogue', type: 'view',
        name: 'Scene Engine (VN)', key: VIEW.SCENE_ENGINE,
        file: 'ui/ScenePlayer.jsx',
        desc: 'React-based visual novel reader — plays narrative scene trees from scenes.js.',
        status: 'active',
        transitions: [
            { to: 'terminal', label: 'Scene complete', method: 'setActiveView' },
        ],
        component: 'ScenePlayer.jsx',
        configFields: ['data/scenes.js entries', 'Node tree structure', 'Condition checks'],
    },

    // ── Support Scenes ──
    {
        id: 'fast_travel', group: 'Support', type: 'scene',
        name: 'Fast Travel', key: 'FastTravelScene',
        file: 'scenes/FastTravelScene.js',
        desc: 'City-to-city travel selection overlay.',
        status: 'active',
        transitions: [
            { to: 'venue_interior', label: 'Arrive at venue', method: 'scene.start LocationScene' },
        ],
        component: 'FastTravelScene (Phaser)',
        configFields: ['City list', 'Travel animation'],
    },
    {
        id: 'intro', group: 'Support', type: 'scene',
        name: 'Intro Cutscene', key: 'IntroScene',
        file: 'scenes/IntroScene.js',
        desc: 'Story introduction cutscene.',
        status: 'active',
        transitions: [
            { to: 'artnet_login', label: 'Intro done', method: 'GameEventBus UI_ROUTE' },
        ],
        component: 'IntroScene (Phaser)',
        configFields: ['Intro text sequence', 'Background animation'],
    },
    {
        id: 'menu', group: 'Support', type: 'scene',
        name: 'Menu', key: 'MenuScene',
        file: 'scenes/MenuScene.js',
        desc: 'Pause/settings menu.',
        status: 'active',
        transitions: [],
        component: 'MenuScene (Phaser)',
        configFields: ['Menu options', 'Save/Load state'],
    },
    {
        id: 'endgame', group: 'Support', type: 'scene',
        name: 'End Screen', key: 'EndScene',
        file: 'scenes/EndScene.js',
        desc: 'Game over / final results screen.',
        status: 'active',
        transitions: [
            { to: 'menu', label: 'Restart', method: 'scene.start MenuScene' },
        ],
        component: 'EndScene (Phaser)',
        configFields: ['End conditions', 'Score display'],
    },

    // ── Legacy (unused) ──
    {
        id: 'overworld_legacy', group: 'Legacy', type: 'scene',
        name: 'Overworld (Grid)', key: 'OverworldScene',
        file: 'scenes/OverworldScene.js',
        desc: 'Legacy grid-engine overworld — replaced by NewWorldScene.',
        status: 'unused',
        transitions: [],
        component: 'OverworldScene (Phaser)',
        configFields: [],
    },
    {
        id: 'world_legacy', group: 'Legacy', type: 'scene',
        name: 'World (Infinite)', key: 'WorldScene',
        file: 'scenes/WorldScene.js',
        desc: 'Legacy infinite scrolling world — replaced by NewWorldScene.',
        status: 'unused',
        transitions: [],
        component: 'WorldScene (Phaser)',
        configFields: [],
    },

    // ── Overlays ──
    {
        id: 'bloomberg', group: 'Overlays', type: 'overlay',
        name: 'Bloomberg Terminal', key: OVERLAY.BLOOMBERG,
        file: 'ui/BloombergTerminal.jsx',
        desc: 'Bloomberg-style market data terminal with real-time art market analytics.',
        status: 'active',
        transitions: [],
        component: 'BloombergTerminal.jsx',
        configFields: ['Market data feeds', 'Chart types', 'Ticker display'],
    },
    {
        id: 'cms', group: 'Overlays', type: 'overlay',
        name: 'Master CMS', key: OVERLAY.MASTER_CMS,
        file: 'ui/MasterCMS.jsx',
        desc: 'Content Management System — edit game data, maps, storylines, and flow.',
        status: 'active',
        transitions: [],
        component: 'MasterCMS.jsx',
        configFields: ['CMS tabs', 'Data domains'],
    },
    {
        id: 'gmail', group: 'Overlays', type: 'overlay',
        name: 'Email Client', key: OVERLAY.GMAIL_GUIDE,
        file: 'ui/email/',
        desc: 'In-game email system — receive messages, respond to deals.',
        status: 'active',
        transitions: [],
        component: 'EmailUI components',
        configFields: ['Email templates', 'Inbox data', 'Auto-responses'],
    },
    {
        id: 'inventory', group: 'Overlays', type: 'overlay',
        name: 'Inventory', key: OVERLAY.INVENTORY,
        file: 'ui/InventoryDashboard.jsx',
        desc: 'Player inventory — artworks owned, value, storage locations.',
        status: 'active',
        transitions: [],
        component: 'InventoryDashboard.jsx',
        configFields: ['Artwork grid', 'Sort/filter', 'Value display'],
    },
    {
        id: 'artnet_dashboard', group: 'Overlays', type: 'overlay',
        name: 'Artnet Dashboard', key: OVERLAY.ARTNET_UI,
        file: 'ui/ArtnetUI.jsx',
        desc: 'Artnet-branded dashboard shell — marketplace, news, gallery listings.',
        status: 'planned',
        transitions: [
            { to: 'artnet_marketplace', label: 'Browse Market', method: 'overlay' },
        ],
        component: 'ArtnetUI.jsx (planned)',
        configFields: ['Dashboard layout', 'News feed', 'Gallery listings'],
    },
    {
        id: 'artnet_marketplace', group: 'Overlays', type: 'overlay',
        name: 'Artnet Marketplace', key: OVERLAY.ARTNET_MARKETPLACE,
        file: 'ui/ArtnetMarketplace.jsx',
        desc: 'Browse and purchase art through the Artnet marketplace interface.',
        status: 'planned',
        transitions: [],
        component: 'ArtnetMarketplace.jsx (planned)',
        configFields: ['Artwork listings', 'Price display', 'Purchase flow'],
    },
];

// ══════════════════════════════════════════════════════════════
// Group pages by their group field
// ══════════════════════════════════════════════════════════════

const GROUPS = ['Boot Flow', 'Main Game', 'Venue Flow', 'Dialogue', 'Support', 'Overlays', 'Legacy'];

const STATUS_COLORS = {
    active: '#50c878',
    unused: '#c94040',
    planned: '#c9a84c',
};

const TYPE_ICONS = {
    scene: '🎮',
    view: '📄',
    overlay: '📎',
};

// ══════════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════════

const mono = "'SF Mono', 'IBM Plex Mono', Courier, monospace";

// ══════════════════════════════════════════════════════════════
// PageEditor Component
// ══════════════════════════════════════════════════════════════

export default function PageEditor() {
    const [selectedPage, setSelectedPage] = useState(null);
    const [collapsedGroups, setCollapsedGroups] = useState({});
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, unused, planned

    const filteredPages = useMemo(() =>
        filterStatus === 'all'
            ? PAGE_REGISTRY
            : PAGE_REGISTRY.filter(p => p.status === filterStatus),
        [filterStatus]
    );

    const toggleGroup = (group) => {
        setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const selected = PAGE_REGISTRY.find(p => p.id === selectedPage);

    return (
        <div style={{ display: 'flex', height: '100%', fontFamily: mono, fontSize: 11, color: '#ccc', background: '#0a0a0f' }}>

            {/* ── Left: Page Tree ── */}
            <div style={{ width: 320, borderRight: '1px solid #1a1a25', overflowY: 'auto', flexShrink: 0 }}>

                {/* Header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a25' }}>
                    <div style={{ fontSize: 12, fontWeight: 'bold', color: '#c9a84c', letterSpacing: '0.1em', marginBottom: 8 }}>
                        PAGE TREE
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {['all', 'active', 'unused', 'planned'].map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                                style={{
                                    background: filterStatus === s ? (STATUS_COLORS[s] || '#333') + '22' : 'none',
                                    border: `1px solid ${filterStatus === s ? (STATUS_COLORS[s] || '#333') : '#222'}`,
                                    color: filterStatus === s ? (STATUS_COLORS[s] || '#ccc') : '#555',
                                    fontSize: 9, padding: '3px 8px', cursor: 'pointer',
                                    fontFamily: mono, letterSpacing: '0.05em', borderRadius: 2,
                                }}>
                                {s.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 9, color: '#444', marginTop: 6 }}>
                        {filteredPages.length} pages · {filteredPages.filter(p => p.status === 'active').length} active
                    </div>
                </div>

                {/* Groups */}
                {GROUPS.map(group => {
                    const pages = filteredPages.filter(p => p.group === group);
                    if (pages.length === 0) return null;
                    const collapsed = collapsedGroups[group];

                    return (
                        <div key={group}>
                            <div onClick={() => toggleGroup(group)}
                                style={{
                                    padding: '8px 16px', cursor: 'pointer', userSelect: 'none',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: '#0d0d14', borderBottom: '1px solid #111',
                                    fontSize: 10, fontWeight: 'bold', color: '#666', letterSpacing: '0.1em',
                                }}>
                                <span>{collapsed ? '▸' : '▾'} {group.toUpperCase()}</span>
                                <span style={{ color: '#333', fontWeight: 'normal' }}>{pages.length}</span>
                            </div>

                            {!collapsed && pages.map(page => (
                                <div key={page.id}
                                    onClick={() => setSelectedPage(page.id)}
                                    style={{
                                        padding: '8px 16px 8px 28px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #111',
                                        background: selectedPage === page.id ? '#14142a' : 'transparent',
                                        borderLeft: selectedPage === page.id ? '3px solid #c9a84c' : '3px solid transparent',
                                        opacity: page.status === 'unused' ? 0.5 : page.status === 'planned' ? 0.7 : 1,
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => { if (selectedPage !== page.id) e.target.style.background = '#0f0f1e'; }}
                                    onMouseLeave={e => { if (selectedPage !== page.id) e.target.style.background = 'transparent'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 13 }}>{TYPE_ICONS[page.type]}</span>
                                        <span style={{ fontWeight: 'bold', fontSize: 11 }}>{page.name}</span>
                                        <span style={{
                                            marginLeft: 'auto', fontSize: 8, padding: '1px 6px',
                                            borderRadius: 2, border: `1px solid ${STATUS_COLORS[page.status]}44`,
                                            color: STATUS_COLORS[page.status], background: STATUS_COLORS[page.status] + '11',
                                        }}>
                                            {page.status}
                                        </span>
                                    </div>
                                    <div style={{ color: '#555', fontSize: 9, marginTop: 2, paddingLeft: 19 }}>
                                        {page.desc.substring(0, 60)}{page.desc.length > 60 ? '…' : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* ── Right: Page Inspector ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: selected ? 0 : 20 }}>
                {!selected ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                            <div style={{ fontSize: 12, letterSpacing: '0.1em' }}>Select a page to inspect</div>
                            <div style={{ fontSize: 10, color: '#222', marginTop: 8 }}>Click any page in the tree to view its details</div>
                        </div>
                    </div>
                ) : (
                    <PageInspector page={selected} />
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// Page Inspector — detailed view of a single page
// ══════════════════════════════════════════════════════════════

function PageInspector({ page }) {
    const sectionStyle = { marginBottom: 16, padding: '12px 20px', borderBottom: '1px solid #1a1a25' };
    const labelStyle = { color: '#666', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 };
    const valueStyle = { color: '#ccc', fontSize: 11, lineHeight: 1.6 };

    return (
        <div>
            {/* Header */}
            <div style={{
                padding: '16px 20px', borderBottom: '1px solid #222',
                background: 'linear-gradient(180deg, #111118 0%, #0a0a0f 100%)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{TYPE_ICONS[page.type]}</span>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#fff', fontFamily: mono }}>{page.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <span style={{
                        fontSize: 9, padding: '2px 8px', borderRadius: 3,
                        background: STATUS_COLORS[page.status] + '22',
                        color: STATUS_COLORS[page.status],
                        border: `1px solid ${STATUS_COLORS[page.status]}44`,
                    }}>{page.status.toUpperCase()}</span>
                    <span style={{
                        fontSize: 9, padding: '2px 8px', borderRadius: 3,
                        background: '#222', color: '#888', border: '1px solid #333',
                    }}>{page.type.toUpperCase()}</span>
                    {page.key && (
                        <span style={{
                            fontSize: 9, padding: '2px 8px', borderRadius: 3,
                            background: '#111', color: '#555', border: '1px solid #222',
                        }}>{page.key}</span>
                    )}
                </div>
                <div style={{ color: '#aaa', fontSize: 11, lineHeight: 1.6 }}>{page.desc}</div>
            </div>

            {/* Source File */}
            <div style={sectionStyle}>
                <div style={labelStyle}>Source File</div>
                <div style={{ color: '#88bbdd', fontSize: 11 }}>src/{page.file}</div>
            </div>

            {/* Component */}
            <div style={sectionStyle}>
                <div style={labelStyle}>Renders</div>
                <div style={valueStyle}>{page.component}</div>
            </div>

            {/* Transitions */}
            <div style={sectionStyle}>
                <div style={labelStyle}>Transitions ({page.transitions.length})</div>
                {page.transitions.length === 0 ? (
                    <div style={{ color: '#333', fontStyle: 'italic' }}>No outgoing transitions</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {page.transitions.map((t, i) => {
                            const target = PAGE_REGISTRY.find(p => p.id === t.to);
                            return (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 12px', borderRadius: 4,
                                    background: '#0d0d1a', border: '1px solid #1a1a30',
                                }}>
                                    <span style={{ color: '#c9a84c', fontSize: 13 }}>→</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', color: '#ccc' }}>
                                            {target?.name || t.to}
                                        </div>
                                        <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
                                            {t.label}
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: 8, padding: '2px 6px', borderRadius: 2,
                                        background: '#111', color: '#555', border: '1px solid #222',
                                    }}>{t.method}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Configurable Fields */}
            {page.configFields && page.configFields.length > 0 && (
                <div style={sectionStyle}>
                    <div style={labelStyle}>Editable Content</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {page.configFields.map((field, i) => (
                            <div key={i} style={{
                                padding: '6px 12px', borderRadius: 3,
                                background: '#0a0a14', border: '1px solid #181828',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{ color: '#4ade80', fontSize: 10 }}>◆</span>
                                <span style={{ color: '#aaa', fontSize: 10 }}>{field}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Incoming connections */}
            {(() => {
                const incoming = PAGE_REGISTRY.filter(p =>
                    p.transitions.some(t => t.to === page.id)
                );
                return (
                    <div style={sectionStyle}>
                        <div style={labelStyle}>Incoming ({incoming.length})</div>
                        {incoming.length === 0 ? (
                            <div style={{ color: '#333', fontStyle: 'italic' }}>No incoming connections</div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {incoming.map(p => (
                                    <span key={p.id} style={{
                                        fontSize: 9, padding: '3px 8px', borderRadius: 3,
                                        background: '#111', color: '#888', border: '1px solid #222',
                                        cursor: 'default',
                                    }}>
                                        {TYPE_ICONS[p.type]} {p.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
