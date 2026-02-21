import React, { useState, useEffect } from 'react';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { GameState } from '../managers/GameState.js';
import { ConsequenceScheduler } from '../managers/ConsequenceScheduler.js';
import { PhoneManager } from '../managers/PhoneManager.js';
import { VIEW } from '../constants/views.js';

export default function AdminDashboard({ onClose }) {
    const [activeTab, setActiveTab] = useState('ui');
    const [gameStateVersion, setGameStateVersion] = useState(0);
    const [importData, setImportData] = useState('');

    // Forces a re-render when we mutate GameState directly
    const forceUpdate = () => setGameStateVersion(v => v + 1);

    // Common styling
    const btnStyle = {
        background: '#111', color: '#c9a84c', border: '1px solid #c9a84c',
        padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
        textAlign: 'left', width: '100%', marginBottom: 10
    };
    const tabBtnStyle = (isActive) => ({
        ...btnStyle,
        background: isActive ? '#c9a84c' : '#111',
        color: isActive ? '#000' : '#c9a84c',
        border: isActive ? '1px solid #c9a84c' : '1px solid #333',
        width: 'auto', marginBottom: 0, textAlign: 'center',
        whiteSpace: 'nowrap'
    });

    const triggerUI = (viewKey, data = null) => {
        GameEventBus.emit(GameEvents.UI_ROUTE, viewKey, data);
        onClose();
    };

    const triggerScene = (sceneKey, data = {}) => {
        GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, sceneKey, data);
        onClose();
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

    const handleImportState = () => {
        try {
            const parsed = JSON.parse(importData);
            if (!parsed.state || !parsed.state.week) throw new Error('Invalid save state JSON format');

            // Reinitialize game managers with new state
            GameState.state = parsed.state;
            window._artLifeState = GameState.state;

            const { generateInitialWorks } = require('../data/artists.js');
            const { MarketManager } = require('../managers/MarketManager.js');
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

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(6, 6, 8, 0.95)', color: '#eaeaea',
            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '40px 20px', overflowY: 'auto'
        }}>
            <div style={{ width: '100%', maxWidth: 1000 }}>

                {/* ── HEADER ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, borderBottom: '1px dashed #333', paddingBottom: 15 }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#c9a84c', letterSpacing: 2 }}>[ SYSTEM ADMIN : GOD MODE ]</h2>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 5 }}>NARRATIVE DEBUGGER & SYSTEM OVERRIDES</div>
                    </div>
                    <button onClick={onClose} style={{ ...btnStyle, width: 'auto', marginBottom: 0 }}>[ ESC ] CLOSE</button>
                </div>

                {/* ── TABS ── */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 30, flexWrap: 'wrap' }}>
                    <button onClick={() => setActiveTab('ui')} style={tabBtnStyle(activeTab === 'ui')}>UIs & OVERLAYS</button>
                    <button onClick={() => setActiveTab('phaser')} style={tabBtnStyle(activeTab === 'phaser')}>PHASER SCENES</button>
                    <button onClick={() => setActiveTab('cheats')} style={tabBtnStyle(activeTab === 'cheats')}>TIME MACHINE</button>
                    <button onClick={() => setActiveTab('consequences')} style={tabBtnStyle(activeTab === 'consequences')}>CONSEQUENCE QUEUE</button>
                    <button onClick={() => setActiveTab('npcs')} style={tabBtnStyle(activeTab === 'npcs')}>NPC MATRIX</button>
                    <button onClick={() => setActiveTab('flags')} style={tabBtnStyle(activeTab === 'flags')}>GLOBAL FLAGS</button>
                </div>

                {/* ── UI TAB ── */}
                {activeTab === 'ui' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                        <div>
                            <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>REACT DOM OVERLAYS</div>
                            <button style={btnStyle} onClick={() => triggerUI(VIEW.BOOT)}>[ Mount Terminal Login ]</button>
                            <button style={btnStyle} onClick={() => triggerUI(VIEW.SCENE_ENGINE)}>[ Mount Scene Engine ]</button>
                            <button style={btnStyle} onClick={() => triggerUI(VIEW.INVENTORY)}>[ Mount Inventory Dashboard ]</button>
                            <button style={btnStyle} onClick={() => triggerUI(VIEW.DASHBOARD)}>[ Mount Player Dashboard ]</button>
                        </div>
                        <div>
                            <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>SYSTEM DIALOGUES</div>
                            <button style={btnStyle} onClick={() => {
                                if (window.game?.startDialogue) {
                                    window.game.startDialogue();
                                    onClose();
                                }
                            }}>[ Trigger Global Dialogue Box ]</button>
                        </div>
                    </div>
                )}

                {/* ── PHASER TAB ── */}
                {activeTab === 'phaser' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                        <div>
                            <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>CORE LOOPS</div>
                            <button style={btnStyle} onClick={() => triggerScene('IntroScene')}>[ Launch: Intro (Character Creator) ]</button>
                            <button style={btnStyle} onClick={() => triggerScene('OverworldScene')}>[ Launch: Overworld Map ]</button>
                            <button style={btnStyle} onClick={() => triggerScene('CityScene')}>[ Launch: Inner City ]</button>
                        </div>
                        <div>
                            <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>INSTANCED SCENES</div>
                            <button style={btnStyle} onClick={() => triggerScene('HaggleScene', {
                                npcId: 'dealer_shark',
                                artwork: { title: 'Debug Piece', artist: 'Admin', price: 50000, medium: 'Code' }
                            })}>[ Launch: Haggle Battle (Shark) ]</button>
                        </div>
                    </div>
                )}

                {/* ── TIME MACHINE / STATE INJECT ── */}
                {activeTab === 'cheats' && (
                    <div>
                        <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>GAMESTATE INSTANCE: {GameState.state ? 'ACTIVE' : 'NULL'}</div>

                        {GameState.state ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                                <div>
                                    <div style={{ marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Cash: ${GameState.state.cash.toLocaleString()}</div>
                                    <button style={btnStyle} onClick={() => cheatCash(100000)}>[ + $100,000 ]</button>
                                    <button style={btnStyle} onClick={() => cheatCash(-100000)}>[ - $100,000 ]</button>

                                    <div style={{ marginTop: 20, marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Reputation: {GameState.state.reputation}</div>
                                    <button style={{ ...btnStyle, border: '1px solid #555', color: '#888' }} onClick={() => {
                                        GameState.state.reputation = 100; forceUpdate();
                                    }}>[ Maximize reputation = 100 ]</button>
                                    <button style={{ ...btnStyle, border: '1px solid #555', color: '#888' }} onClick={() => {
                                        GameState.state.reputation = 0; forceUpdate();
                                    }}>[ Minimize reputation = 0 ]</button>
                                </div>
                                <div>
                                    <div style={{ marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Time Machine (Current Wk: {GameState.state.week})</div>
                                    <button style={btnStyle} onClick={() => advanceTime(1)}>[ Fast Forward 1 Week ]</button>
                                    <button style={btnStyle} onClick={() => advanceTime(4)}>[ Fast Forward 1 Month ]</button>
                                    <button style={btnStyle} onClick={() => advanceTime(52)}>[ Fast Forward 1 Year ]</button>

                                    <div style={{ marginTop: 20, marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>State Importer (JSON Dropzone)</div>
                                    <textarea
                                        style={{ width: '100%', height: '100px', background: '#0a0a0f', color: '#888', border: '1px solid #333', padding: 8, fontFamily: 'inherit', fontSize: 11 }}
                                        placeholder='Paste a valid GameState JSON object here...'
                                        value={importData}
                                        onChange={(e) => setImportData(e.target.value)}
                                    />
                                    <button style={{ ...btnStyle, marginTop: 10 }} onClick={handleImportState}>[ IMPORT & REBOOT STATE ]</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: '#c94040', fontSize: 13 }}>
                                GameState is not initialized yet. Please start a new game or load a dossier first.
                            </div>
                        )}
                    </div>
                )}

                {/* ── CONSEQUENCE QUEUE ── */}
                {activeTab === 'consequences' && (
                    <div>
                        <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>SCHEDULED NARRATIVE CONSEQUENCES</div>
                        {ConsequenceScheduler.queue.filter(c => !c.fired).length === 0 ? (
                            <div style={{ padding: '20px', border: '1px dashed #333', color: '#555', textAlign: 'center' }}>Queue is empty.</div>
                        ) : (
                            ConsequenceScheduler.queue.filter(c => !c.fired).map((csq, i) => (
                                <div key={i} style={{ padding: '15px', border: '1px solid #333', marginBottom: 10, background: '#0a0a0f' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <div style={{ color: '#c9a84c', fontWeight: 'bold' }}>Trigger: Wk {csq.triggerWeek} <span style={{ color: '#666', fontWeight: 'normal' }}>({csq.triggerWeek - (GameState.state?.week || 0)} weeks away)</span></div>
                                        <button style={{ ...btnStyle, width: 'auto', marginBottom: 0, padding: '4px 8px' }} onClick={() => forceConsequence(csq)}>Force Execute Now</button>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#aaa', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span><strong>Type:</strong> {csq.type}</span>
                                        <span><strong>Source:</strong> {csq.sourceEvent || 'Unknown'}</span>
                                        <pre style={{ margin: '5px 0 0 0', padding: '10px', background: '#111', color: '#4ade80', fontSize: 11, overflowX: 'auto' }}>
                                            {JSON.stringify(csq.payload, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ── NPC MEMORY MATRIX ── */}
                {activeTab === 'npcs' && (
                    <div>
                        <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>HIDDEN NPC RELATIONAL DATA</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 15 }}>
                            {PhoneManager.contacts.map((npc, i) => (
                                <div key={i} style={{ padding: '15px', border: '1px solid #333', background: '#0a0a0f' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px dashed #222', paddingBottom: 10 }}>
                                        <div style={{ color: '#fff', fontWeight: 'bold' }}>{npc.id}</div>
                                        <div style={{ color: npc.favor > 0 ? '#4ade80' : npc.favor < 0 ? '#f87171' : '#888' }}>Favor: {npc.favor || 0}</div>
                                    </div>
                                    {!npc.memory ? (
                                        <div style={{ color: '#555', fontSize: 12, fontStyle: 'italic' }}>No memory object instantiated.</div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15, fontSize: 12 }}>
                                            <div>
                                                <strong style={{ color: '#c9a84c' }}>Grudges ({npc.memory.grudges?.length || 0})</strong>
                                                <ul style={{ paddingLeft: 15, margin: '5px 0', color: '#f87171' }}>
                                                    {(npc.memory.grudges || []).map((g, j) => <li key={j}>{g.reason} (Wk {g.week})</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <strong style={{ color: '#c9a84c' }}>Favors ({npc.memory.favors?.length || 0})</strong>
                                                <ul style={{ paddingLeft: 15, margin: '5px 0', color: '#4ade80' }}>
                                                    {(npc.memory.favors || []).map((f, j) => <li key={j}>{f.reason} (Wk {f.week})</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <strong style={{ color: '#c9a84c' }}>Witnessed ({npc.memory.witnessed?.length || 0})</strong>
                                                <ul style={{ paddingLeft: 15, margin: '5px 0', color: '#93c5fd' }}>
                                                    {(npc.memory.witnessed || []).map((w, j) => <li key={j}>{w.description || w.type} (Wk {w.week})</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── GLOBAL FLAGS ── */}
                {activeTab === 'flags' && (
                    <div>
                        <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>EVENTS TRIGGERED & TERMINAL DECISIONS</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div style={{ background: '#0a0a0f', padding: 15, border: '1px solid #333' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#c9a84c' }}>Events Triggered</h4>
                                {(!GameState.state?.eventsTriggered || GameState.state.eventsTriggered.length === 0) ? (
                                    <div style={{ color: '#555', fontSize: 12 }}>No events logged yet.</div>
                                ) : (
                                    <ul style={{ margin: 0, paddingLeft: 20, color: '#eaeaea', fontSize: 13 }}>
                                        {GameState.state.eventsTriggered.map((evtId, i) => (
                                            <li key={i}>{evtId}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div style={{ background: '#0a0a0f', padding: 15, border: '1px solid #333' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#c9a84c' }}>Key Decisions</h4>
                                {(!GameState.state?.decisions || GameState.state.decisions.length === 0) ? (
                                    <div style={{ color: '#555', fontSize: 12 }}>No decisions recorded yet.</div>
                                ) : (
                                    <ul style={{ margin: 0, paddingLeft: 20, color: '#eaeaea', fontSize: 13 }}>
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

            </div>
        </div>
    );
}

