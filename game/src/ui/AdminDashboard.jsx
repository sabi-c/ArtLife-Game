import React, { useState, useEffect } from 'react';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { GameState } from '../managers/GameState.js';
import { ConsequenceScheduler } from '../managers/ConsequenceScheduler.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { VIEW, OVERLAY } from '../constants/views.js';
import { useNPCStore } from '../stores/npcStore.js';
import { SettingsManager } from '../managers/SettingsManager.js';

const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export default function AdminDashboard({ onClose }) {
    const [activeTab, setActiveTab] = useState('ui');
    const [gameStateVersion, setGameStateVersion] = useState(0);
    const [importData, setImportData] = useState('');

    const forceUpdate = () => setGameStateVersion(v => v + 1);

    const btnStyle = {
        background: '#111', color: '#c9a84c', border: '1px solid #c9a84c',
        padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
        textAlign: 'left', width: '100%', marginBottom: 10,
        minHeight: 44, // mobile touch target
    };
    const tabBtnStyle = (isActive) => ({
        ...btnStyle,
        background: isActive ? '#c9a84c' : '#111',
        color: isActive ? '#000' : '#c9a84c',
        border: isActive ? '1px solid #c9a84c' : '1px solid #333',
        width: 'auto', marginBottom: 0, textAlign: 'center',
        whiteSpace: 'nowrap', minHeight: 40,
        padding: '6px 12px', fontSize: 12,
    });

    const triggerUI = (viewKey, data = null) => {
        GameEventBus.emit(GameEvents.UI_ROUTE, viewKey, data);
        onClose();
    };

    const triggerOverlay = (overlayKey) => {
        // Don't call onClose() — it would reset overlay to NONE, canceling the toggle.
        // The overlay handler in App.jsx will switch from ADMIN to the target overlay.
        onClose(); // close admin first
        // Use setTimeout to ensure React processes the admin close before toggling
        setTimeout(() => {
            GameEventBus.emit(GameEvents.UI_TOGGLE_OVERLAY, overlayKey);
        }, 0);
    };

    const triggerScene = (sceneKey, data = {}) => {
        // Scenes that need game state — auto-init if missing
        const needsState = ['WorldScene', 'CityScene', 'OverworldScene', 'LocationScene', 'HaggleScene'];
        if (needsState.includes(sceneKey) && !GameState.state) {
            GameState.quickDemoInit();
            forceUpdate();
            if (!GameState.state) {
                GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Failed to initialize game state.');
                return;
            }
        }
        GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, sceneKey, data);
        onClose();
    };

    const launchHaggleBattle = () => {
        if (!GameState.state) {
            GameState.quickDemoInit();
            forceUpdate();
            if (!GameState.state) {
                GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Failed to initialize game state.');
                return;
            }
        }
        const haggleInfo = HaggleManager.start({
            mode: 'buy',
            work: { id: 'debug_art_1', title: 'Debug Piece (Code)', artist: 'Admin', price: 50000, medium: 'Code' },
            npc: { id: 'dealer_shark', name: 'The Shark', role: 'mega-dealer' },
            askingPrice: 50000,
            playerOffer: 35000
        });
        triggerScene('HaggleScene', { haggleInfo });
    };

    const cheatCash = (amount) => {
        if (!GameState.state) return;
        GameState.applyEffects({ cash: amount });
        forceUpdate();
    };

    const advanceTime = (weeks) => {
        if (!GameState.state) return;
        for (let i = 0; i < weeks; i++) {
            GameState.advanceWeek();
        }
        forceUpdate();
    };

    const forceConsequence = (csq) => {
        if (!csq || csq.fired) return;
        csq.fired = true;
        ConsequenceScheduler.execute(csq);
        forceUpdate();
    };

    const handleImportState = async () => {
        try {
            const parsed = JSON.parse(importData);
            if (!parsed.state || !parsed.state.week) throw new Error('Invalid save state JSON format');

            GameState.state = parsed.state;
            window._artLifeState = GameState.state;

            // Dynamic imports for modules not used elsewhere in this file
            const { generateInitialWorks } = await import('../data/artists.js');
            const { MarketManager } = await import('../managers/MarketManager.js');
            const { PhoneManager } = await import('../managers/PhoneManager.js');
            MarketManager.init(generateInitialWorks());
            PhoneManager.init();
            ConsequenceScheduler.reset();

            setImportData('');
            forceUpdate();
            GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'State imported successfully.');
        } catch (e) {
            console.error('Import Error:', e);
            GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Failed to import JSON state.');
        }
    };

    const tabs = [
        { key: 'ui', label: 'UIs' },
        { key: 'phaser', label: 'SCENES' },
        { key: 'cheats', label: 'TIME' },
        { key: 'economy', label: 'ECONOMY' },
        { key: 'consequences', label: 'QUEUE' },
        { key: 'npcs', label: 'NPCs' },
        { key: 'flags', label: 'FLAGS' },
        { key: 'saves', label: 'SAVES' },
    ];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(6, 6, 8, 0.95)', color: '#eaeaea',
            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: isTouchDevice ? '16px 12px' : '40px 20px',
            overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        }}>
            <div style={{ width: '100%', maxWidth: 1000 }}>

                {/* ── HEADER ── */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 20, borderBottom: '1px dashed #333', paddingBottom: 12,
                    flexWrap: 'wrap', gap: 10,
                }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#c9a84c', letterSpacing: 2, fontSize: isTouchDevice ? 14 : 18 }}>[ SYSTEM ADMIN : GOD MODE ]</h2>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>NARRATIVE DEBUGGER & SYSTEM OVERRIDES</div>
                    </div>
                    <button onClick={onClose} style={{
                        ...btnStyle, width: 'auto', marginBottom: 0,
                        minHeight: 44, padding: '8px 20px',
                    }}>CLOSE</button>
                </div>

                {/* ── GAME STATE BANNER ── */}
                {!GameState.state && (
                    <div style={{
                        padding: '16px 20px', marginBottom: 20,
                        background: 'rgba(201, 64, 64, 0.1)', border: '1px solid #c94040',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: 12,
                    }}>
                        <div>
                            <div style={{ color: '#c94040', fontSize: 13, fontWeight: 'bold' }}>NO GAME STATE</div>
                            <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>Most features require an active game. Init demo state to test everything.</div>
                        </div>
                        <button style={{
                            ...btnStyle, width: 'auto', marginBottom: 0,
                            background: '#c9a84c', color: '#000', fontWeight: 'bold',
                            border: 'none', padding: '10px 20px',
                        }} onClick={() => { GameState.quickDemoInit(); forceUpdate(); }}>
                            [ INIT DEMO STATE ]
                        </button>
                    </div>
                )}

                {/* ── TABS ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isTouchDevice ? 'repeat(3, 1fr)' : 'repeat(6, auto)',
                    gap: 8, marginBottom: 20,
                }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)} style={tabBtnStyle(activeTab === t.key)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── UI TAB ── */}
                {activeTab === 'ui' && (
                    <div style={{ display: 'grid', gridTemplateColumns: isTouchDevice ? '1fr' : '1fr 1fr', gap: '0 20px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#c9a84c' }}>SYSTEM TOOLS</h3>
                            <button style={btnStyle} onClick={() => triggerUI(VIEW.TERMINAL)}>■ TERMINAL INTERFACE</button>
                            <button style={{ ...btnStyle, borderColor: '#4caf50', color: '#4caf50' }} onClick={() => triggerOverlay(OVERLAY.MASTER_CMS)}>🏗️ MASTER CMS & VISUAL EDITOR</button>
                            <button style={{ ...btnStyle, borderColor: '#00e5ff', color: '#00e5ff' }} onClick={() => triggerOverlay(OVERLAY.BLOOMBERG)}>📊 BLOOMBERG MARKET TERMINAL</button>
                            <button style={{ ...btnStyle, borderColor: '#8b7355', color: '#d4a843' }} onClick={() => triggerOverlay(OVERLAY.SALES_GRID)}>📊 SALES GRID (Beckmans)</button>
                            <button style={{ ...btnStyle, borderColor: '#4040ff', color: '#8080ff' }} onClick={() => {
                                SettingsManager.set('marketStyle', 'waterworks');
                                triggerOverlay(OVERLAY.BLOOMBERG);
                            }}>🗺️ WATERWORKS WORLD MAP</button>
                        </div>
                        <div>
                            <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>SYSTEM DIALOGUES</div>
                            <button style={btnStyle} onClick={() => {
                                if (window.game?.startDialogue) {
                                    window.game.startDialogue();
                                    onClose();
                                }
                            }}>[ Trigger Global Dialogue Box ]</button>
                            <div style={{ color: '#888', marginBottom: 15, marginTop: 20, fontSize: 12 }}>DEVELOPER TOOLS</div>
                            <button style={btnStyle} onClick={() => triggerOverlay(OVERLAY.CMS)}>
                                [ Content Studio (Legacy) ]
                                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>Visual content wiring & timeline editor</div>
                            </button>
                            <button style={btnStyle} onClick={() => {
                                SettingsManager.set('hasSeenBloombergIntro', false);
                                GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Tutorial Reset. It will play next time Bloomberg opens.');
                                forceUpdate();
                            }}>
                                [ Reset Bloomberg Tutorial ]
                            </button>

                            <div style={{ color: '#888', marginBottom: 15, marginTop: 20, fontSize: 12 }}>BOOT FLOWS</div>
                            {['BOOT', 'PROFILE_MENU', 'PROFILE_CREATE', 'PROFILE_LOGIN', 'PRIMARY_MENU', 'DOSSIER_SELECT', 'CONFIRM', 'AUTH'].map(step => (
                                <button key={step} style={{ ...btnStyle, fontSize: 11, padding: '6px 12px', minHeight: 36 }}
                                    onClick={() => triggerUI(VIEW.BOOT, { previewStep: step })}>
                                    [ {step} ]
                                </button>
                            ))}
                        </div>
                        {/* ── Bloomberg Panel Config ── */}
                        <div style={{ gridColumn: '1 / -1', marginTop: 20 }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#c9a84c' }}>BLOOMBERG PANEL CONFIG</h3>
                            <div style={{
                                background: '#0a0a0f', border: '1px solid #333', padding: 16,
                            }}>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                                    {['full', 'minimal', 'trading', 'tearsheet'].map(preset => (
                                        <button key={preset} style={{
                                            ...btnStyle, width: 'auto', marginBottom: 0,
                                            padding: '6px 14px', fontSize: 10, letterSpacing: '0.15em',
                                            minHeight: 32,
                                        }} onClick={() => {
                                            SettingsManager.applyPreset('bloombergPanels', preset);
                                            forceUpdate();
                                        }}>
                                            {preset.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: isTouchDevice ? '1fr 1fr' : '1fr 1fr 1fr',
                                    gap: '6px 16px',
                                }}>
                                    {(SettingsManager.SCHEMA.find(s => s.id === 'bloombergPanels')?.options || []).map(opt => {
                                        const panels = SettingsManager.get('bloombergPanels');
                                        const checked = panels.includes(opt.value);
                                        return (
                                            <label key={opt.value} style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                fontSize: 11, color: checked ? '#e0e0e8' : '#555',
                                                cursor: 'pointer', padding: '3px 0',
                                            }}>
                                                <input type="checkbox" checked={checked}
                                                    style={{ accentColor: '#c9a84c', width: 14, height: 14, cursor: 'pointer' }}
                                                    onChange={() => {
                                                        SettingsManager.toggleChecklistItem('bloombergPanels', opt.value);
                                                        forceUpdate();
                                                    }}
                                                />
                                                {opt.display}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PHASER TAB ── */}
                {activeTab === 'phaser' && (
                    <div style={{ display: 'grid', gridTemplateColumns: isTouchDevice ? '1fr' : '1fr 1fr', gap: '0 20px' }}>
                        <div>
                            <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>EXPLORATION</div>
                            <button style={btnStyle} onClick={() => triggerScene('WorldScene')}>
                                [ Overworld — Pokemon Walk ]
                                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>Tiled map, NPCs, dialog, encounters</div>
                            </button>
                            <button style={btnStyle} onClick={() => triggerScene('CityScene')}>
                                [ City Hub — Location Map ]
                                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>Click buildings to enter venues</div>
                            </button>
                            <button style={{ ...btnStyle, opacity: 0.6 }} onClick={() => triggerScene('OverworldScene')}>
                                [ Legacy Overworld (test) ]
                                <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>Old 160px sprites, hardcoded map</div>
                            </button>
                        </div>
                        <div>
                            <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>BATTLE & DIALOGUE</div>
                            <button style={btnStyle} onClick={launchHaggleBattle}>
                                [ Haggle Battle ]
                                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>Pokemon-style negotiation</div>
                            </button>
                            <button style={btnStyle} onClick={() => triggerScene('MacDialogueScene', {
                                bgKey: 'bg_gallery_main_1bit_1771587911969.png',
                                dialogueSequence: [
                                    { name: 'Gallerist', speakerSide: 'right', text: 'Welcome to the gallery. I have a few pieces you might find... interesting.' },
                                    { name: 'You', speakerSide: 'left', text: 'Show me what you\'ve got.' },
                                    { name: 'Gallerist', speakerSide: 'right', text: 'This Basquiat is from his early period. Quite rare.' },
                                ],
                                leftSpriteKey: 'player_back.png',
                                rightSpriteKey: 'portrait_it_girl_1bit.png',
                            })}>
                                [ Dialogue Scene (Mac) ]
                                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>1-bit Macintosh visual novel</div>
                            </button>
                            <div style={{ color: '#888', marginBottom: 15, marginTop: 20, fontSize: 12 }}>NEW GAME FLOW</div>
                            <button style={btnStyle} onClick={() => triggerScene('IntroScene')}>
                                [ Intro — Cinematic Briefing ]
                                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>Typewriter narration → character select</div>
                            </button>
                            <button style={btnStyle} onClick={() => triggerScene('CharacterSelectScene')}>
                                [ Character Creator ]
                                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>6-phase archetype/trait/drip selection</div>
                            </button>
                        </div>
                    </div>
                )}

                {/* ── TIME MACHINE / STATE INJECT ── */}
                {activeTab === 'cheats' && (
                    <div>
                        <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>GAMESTATE: {GameState.state ? 'ACTIVE' : 'NULL'}</div>

                        {GameState.state ? (
                            <div style={{ display: 'grid', gridTemplateColumns: isTouchDevice ? '1fr' : '1fr 1fr', gap: '10px 20px' }}>
                                <div>
                                    <div style={{ marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Cash: ${GameState.state.cash.toLocaleString()}</div>
                                    <button style={btnStyle} onClick={() => cheatCash(100000)}>[ + $100,000 ]</button>
                                    <button style={btnStyle} onClick={() => cheatCash(-100000)}>[ - $100,000 ]</button>

                                    <div style={{ marginTop: 15, marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Reputation: {GameState.state.reputation}</div>
                                    <button style={{ ...btnStyle, border: '1px solid #555', color: '#888' }} onClick={() => {
                                        GameState.state.reputation = 100; forceUpdate();
                                    }}>[ Max reputation = 100 ]</button>
                                    <button style={{ ...btnStyle, border: '1px solid #555', color: '#888' }} onClick={() => {
                                        GameState.state.reputation = 0; forceUpdate();
                                    }}>[ Min reputation = 0 ]</button>
                                </div>
                                <div>
                                    <div style={{ marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Week: {GameState.state.week}</div>
                                    <button style={btnStyle} onClick={() => advanceTime(1)}>[ +1 Week ]</button>
                                    <button style={btnStyle} onClick={() => advanceTime(4)}>[ +1 Month ]</button>
                                    <button style={btnStyle} onClick={() => advanceTime(52)}>[ +1 Year ]</button>

                                    <div style={{ marginTop: 15, marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>State Importer</div>
                                    <textarea
                                        style={{ width: '100%', height: 80, background: '#0a0a0f', color: '#888', border: '1px solid #333', padding: 8, fontFamily: 'inherit', fontSize: 11, resize: 'vertical' }}
                                        placeholder='Paste GameState JSON...'
                                        value={importData}
                                        onChange={(e) => setImportData(e.target.value)}
                                    />
                                    <button style={{ ...btnStyle, marginTop: 8 }} onClick={handleImportState}>[ IMPORT STATE ]</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: '#c94040', fontSize: 13 }}>
                                GameState not initialized. Start or load a game first.
                            </div>
                        )}
                    </div>
                )}

                {/* ── ECONOMY / MARKET TOOLS ── */}
                {activeTab === 'economy' && (
                    <div>
                        <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>MACRO ECONOMIC CONTROLS</div>
                        {GameState.state ? (
                            <div style={{ display: 'grid', gridTemplateColumns: isTouchDevice ? '1fr' : '1fr 1fr', gap: '10px 20px' }}>
                                <div>
                                    <div style={{ marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Market Cycle: {GameState.state.marketState.toUpperCase()}</div>
                                    <button style={btnStyle} onClick={() => { GameState.state.marketState = 'bull'; forceUpdate(); }}>[ Force BULL Market ]</button>
                                    <button style={btnStyle} onClick={() => { GameState.state.marketState = 'bear'; forceUpdate(); }}>[ Force BEAR Market ]</button>
                                    <button style={btnStyle} onClick={() => { GameState.state.marketState = 'flat'; forceUpdate(); }}>[ Force FLAT Market ]</button>

                                    <div style={{ marginTop: 15, marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Era Modifier: x{GameState.state.eraModifier?.toFixed(1) || '1.0'}</div>
                                    <button style={btnStyle} onClick={() => { GameState.state.eraModifier = 2.0; forceUpdate(); }}>[ 1980s Boom (x2.0) ]</button>
                                    <button style={btnStyle} onClick={() => { GameState.state.eraModifier = 0.5; forceUpdate(); }}>[ 2008 Crash (x0.5) ]</button>
                                    <button style={{ ...btnStyle, border: '1px solid #555', color: '#888' }} onClick={() => { GameState.state.eraModifier = 1.0; forceUpdate(); }}>[ Reset Era (x1.0) ]</button>
                                </div>
                                <div>
                                    <div style={{ marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Micro / Artist Heat</div>
                                    <div style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>Quick-jump artist heat to test price elasticity.</div>

                                    <button style={btnStyle} onClick={async () => {
                                        const { MarketManager } = await import('../managers/MarketManager.js');
                                        MarketManager.boostRandomArtistHeat(50);
                                        forceUpdate();
                                        GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Boosted random artist heat by 50');
                                    }}>[ +50 Random Artist Heat ]</button>

                                    <button style={btnStyle} onClick={async () => {
                                        const { MarketManager } = await import('../managers/MarketManager.js');
                                        MarketManager.artists.forEach(a => { a.heat = 100; });
                                        forceUpdate();
                                        GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Set ALL Artists to 100 Heat');
                                    }}>[ Max Heat (All Artists) ]</button>

                                    <button style={{ ...btnStyle, border: '1px solid #555', color: '#888' }} onClick={async () => {
                                        const { MarketManager } = await import('../managers/MarketManager.js');
                                        MarketManager.artists.forEach(a => { a.heat = 0; });
                                        forceUpdate();
                                        GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Set ALL Artists to 0 Heat');
                                    }}>[ Crash Heat (All Artists) ]</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: '#c94040', fontSize: 13 }}>
                                GameState not initialized. Start or load a game first.
                            </div>
                        )}
                    </div>
                )}

                {/* ── CONSEQUENCE QUEUE ── */}
                {activeTab === 'consequences' && (
                    <div>
                        <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>SCHEDULED CONSEQUENCES</div>
                        {ConsequenceScheduler.queue.filter(c => !c.fired).length === 0 ? (
                            <div style={{ padding: 20, border: '1px dashed #333', color: '#555', textAlign: 'center' }}>Queue is empty.</div>
                        ) : (
                            ConsequenceScheduler.queue.filter(c => !c.fired).map((csq, i) => (
                                <div key={i} style={{ padding: 12, border: '1px solid #333', marginBottom: 10, background: '#0a0a0f' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                        <div style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 13 }}>Wk {csq.triggerWeek} <span style={{ color: '#666', fontWeight: 'normal' }}>({csq.triggerWeek - (GameState.state?.week || 0)}w away)</span></div>
                                        <button style={{ ...btnStyle, width: 'auto', marginBottom: 0, padding: '4px 12px', minHeight: 36 }} onClick={() => forceConsequence(csq)}>Force</button>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#aaa' }}>
                                        <div><strong>Type:</strong> {csq.type} | <strong>Source:</strong> {csq.sourceEvent || '?'}</div>
                                        <pre style={{ margin: '5px 0 0 0', padding: 8, background: '#111', color: '#4ade80', fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                            {JSON.stringify(csq.payload, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ── NPC MEMORY MATRIX ── */}
                {activeTab === 'npcs' && (() => {
                    const npcContacts = useNPCStore.getState().contacts || [];
                    return (
                        <div>
                            <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>NPC RELATIONAL DATA ({npcContacts.length} contacts)</div>
                            {npcContacts.length === 0 ? (
                                <div>
                                    <div style={{ padding: 20, border: '1px dashed #333', color: '#555', textAlign: 'center', marginBottom: 10 }}>
                                        NPC store is empty. Start or load a game to populate NPCs.
                                    </div>
                                    <button style={btnStyle} onClick={() => { useNPCStore.getState().init(); forceUpdate(); }}>[ INIT NPC STORE ]</button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
                                    {npcContacts.map((npc, i) => (
                                        <div key={i} style={{ padding: 12, border: '1px solid #333', background: '#0a0a0f' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px dashed #222', paddingBottom: 8 }}>
                                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{npc.name || npc.id} <span style={{ color: '#555', fontWeight: 'normal', fontSize: 11 }}>({npc.role || 'unknown'}){npc.met ? ' ✓ met' : ''}</span></div>
                                                <div style={{ color: npc.favor > 0 ? '#4ade80' : npc.favor < 0 ? '#f87171' : '#888' }}>Favor: {npc.favor || 0}</div>
                                            </div>
                                            {!npc.memory ? (
                                                <div style={{ color: '#555', fontSize: 11, fontStyle: 'italic' }}>No memory.</div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: isTouchDevice ? '1fr' : '1fr 1fr 1fr', gap: 12, fontSize: 12 }}>
                                                    <div>
                                                        <strong style={{ color: '#c9a84c' }}>Grudges ({npc.memory.grudges?.length || 0})</strong>
                                                        <ul style={{ paddingLeft: 15, margin: '4px 0', color: '#f87171' }}>
                                                            {(npc.memory.grudges || []).map((g, j) => <li key={j}>{g.reason} (Wk {g.week})</li>)}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong style={{ color: '#c9a84c' }}>Favors ({npc.memory.favors?.length || 0})</strong>
                                                        <ul style={{ paddingLeft: 15, margin: '4px 0', color: '#4ade80' }}>
                                                            {(npc.memory.favors || []).map((f, j) => <li key={j}>{f.reason} (Wk {f.week})</li>)}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong style={{ color: '#c9a84c' }}>Witnessed ({npc.memory.witnessed?.length || 0})</strong>
                                                        <ul style={{ paddingLeft: 15, margin: '4px 0', color: '#93c5fd' }}>
                                                            {(npc.memory.witnessed || []).map((w, j) => <li key={j}>{w.description || w.type} (Wk {w.week})</li>)}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* ── GLOBAL FLAGS ── */}
                {activeTab === 'flags' && (
                    <div>
                        <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>EVENTS & DECISIONS</div>
                        <div style={{ display: 'grid', gridTemplateColumns: isTouchDevice ? '1fr' : '1fr 1fr', gap: 15 }}>
                            <div style={{ background: '#0a0a0f', padding: 12, border: '1px solid #333' }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#c9a84c', fontSize: 13 }}>Events Triggered</h4>
                                {(!GameState.state?.eventsTriggered || GameState.state.eventsTriggered.length === 0) ? (
                                    <div style={{ color: '#555', fontSize: 12 }}>No events logged yet.</div>
                                ) : (
                                    <ul style={{ margin: 0, paddingLeft: 18, color: '#eaeaea', fontSize: 12 }}>
                                        {GameState.state.eventsTriggered.map((evtId, i) => (
                                            <li key={i}>{evtId}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div style={{ background: '#0a0a0f', padding: 12, border: '1px solid #333' }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#c9a84c', fontSize: 13 }}>Key Decisions</h4>
                                {(!GameState.state?.decisions || GameState.state.decisions.length === 0) ? (
                                    <div style={{ color: '#555', fontSize: 12 }}>No decisions recorded yet.</div>
                                ) : (
                                    <ul style={{ margin: 0, paddingLeft: 18, color: '#eaeaea', fontSize: 12 }}>
                                        {GameState.state.decisions.map((dec, i) => (
                                            <li key={i}>
                                                <strong>{dec.event}</strong>: {dec.choice} <span style={{ color: '#555' }}>(Wk {dec.week})</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SAVES TAB ── */}
                {activeTab === 'saves' && (
                    <div>
                        <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>GAME STATE MANAGEMENT</div>
                        <div style={{ display: 'grid', gridTemplateColumns: isTouchDevice ? '1fr' : '1fr 1fr', gap: '0 20px' }}>
                            <div>
                                <button style={{ ...btnStyle, borderColor: '#4ade80', color: '#4ade80' }} onClick={() => {
                                    try {
                                        GameState.save(GameState.activeSlot || 0);
                                        GameEventBus.emit(GameEvents.UI_NOTIFICATION, `Game saved to slot ${GameState.activeSlot || 0}`);
                                        forceUpdate();
                                    } catch (e) { GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Save failed: ' + e.message); }
                                }}>
                                    💾 SAVE GAME (Slot {GameState.activeSlot || 0})
                                </button>
                                <button style={btnStyle} onClick={() => {
                                    try {
                                        const slot = GameState.getMostRecentSlot?.() || GameState.activeSlot || 0;
                                        GameState.load(slot);
                                        GameEventBus.emit(GameEvents.UI_NOTIFICATION, `Game loaded from slot ${slot}`);
                                        forceUpdate();
                                    } catch (e) { GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Load failed: ' + e.message); }
                                }}>
                                    📂 LOAD GAME (Most Recent)
                                </button>
                            </div>
                            <div>
                                <button style={{ ...btnStyle, borderColor: '#f59e0b', color: '#f59e0b' }} onClick={() => {
                                    if (!confirm('Reset game state? This clears the current session but keeps saves.')) return;
                                    try {
                                        GameState.state = null;
                                        GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.BOOT || 'BOOT');
                                        GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Game state reset');
                                        onClose();
                                    } catch (e) { GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Reset failed: ' + e.message); }
                                }}>
                                    🔄 RESET GAME (Clear Session)
                                </button>
                                <button style={{ ...btnStyle, borderColor: '#ef4444', color: '#ef4444' }} onClick={() => {
                                    if (!confirm('DELETE ALL SAVES? This cannot be undone!')) return;
                                    try {
                                        for (let i = 0; i < 5; i++) {
                                            try { GameState.deleteSave(i); } catch (_) { /* slot may not exist */ }
                                        }
                                        GameState.state = null;
                                        GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'All saves deleted');
                                        forceUpdate();
                                    } catch (e) { GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Delete failed: ' + e.message); }
                                }}>
                                    🗑️ DELETE ALL SAVES
                                </button>
                            </div>
                        </div>
                        {/* Save slot info */}
                        <div style={{ marginTop: 16, background: '#0a0a0f', padding: 12, border: '1px solid #333' }}>
                            <h4 style={{ margin: '0 0 8px 0', color: '#c9a84c', fontSize: 13 }}>Save Slot Info</h4>
                            <div style={{ fontSize: 12, color: '#aaa' }}>
                                <div>Active slot: <strong style={{ color: '#eaeaea' }}>{GameState.activeSlot ?? 'none'}</strong></div>
                                <div>Game state: <strong style={{ color: GameState.state ? '#4ade80' : '#ef4444' }}>{GameState.state ? 'loaded' : 'empty'}</strong></div>
                                {GameState.state && (
                                    <>
                                        <div>Week: <strong style={{ color: '#eaeaea' }}>{GameState.state.week || '?'}</strong></div>
                                        <div>Cash: <strong style={{ color: '#eaeaea' }}>${(GameState.state.cash || 0).toLocaleString()}</strong></div>
                                        <div>Portfolio: <strong style={{ color: '#eaeaea' }}>{(GameState.state.portfolio || []).length} works</strong></div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

// ── Mobile FAB (floating action button) ──
// Rendered separately — App.jsx mounts this when admin is closed
export function AdminFAB({ onClick }) {
    return (
        <button
            className="admin-fab"
            onClick={onClick}
            aria-label="Open Dev Tools"
        >
            DEV
        </button>
    );
}
