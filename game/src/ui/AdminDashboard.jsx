import React, { useState, useEffect } from 'react';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { GameState } from '../managers/GameState.js';
import { VIEW } from '../constants/views.js';

export default function AdminDashboard({ onClose }) {
    const [activeTab, setActiveTab] = useState('ui');
    const [gameStateVersion, setGameStateVersion] = useState(0);

    // Forces a re-render of the cheats tab when we mutate GameState directly
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
        width: 'auto', marginBottom: 0, textAlign: 'center'
    });

    const triggerUI = (viewKey, data = null) => {
        GameEventBus.emit(GameEvents.UI_ROUTE, viewKey, data);
        onClose(); // Auto-close admin board so we can see the UI
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

    const advanceWeek = () => {
        if (!GameState.state) return;
        GameState.advanceWeek();
        forceUpdate();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(6, 6, 8, 0.95)', color: '#eaeaea',
            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '40px 20px', overflowY: 'auto'
        }}>
            <div style={{ width: '100%', maxWidth: 800 }}>

                {/* ── HEADER ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, borderBottom: '1px dashed #333', paddingBottom: 15 }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#c9a84c', letterSpacing: 2 }}>[ SYSTEM ADMIN ]</h2>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 5 }}>DEVELOPER DIAGNOSTICS & OVERRIDES</div>
                    </div>
                    <button onClick={onClose} style={{ ...btnStyle, width: 'auto', marginBottom: 0 }}>[ ESC ] CLOSE</button>
                </div>

                {/* ── TABS ── */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 30 }}>
                    <button onClick={() => setActiveTab('ui')} style={tabBtnStyle(activeTab === 'ui')}>UIs & OVERLAYS</button>
                    <button onClick={() => setActiveTab('phaser')} style={tabBtnStyle(activeTab === 'phaser')}>PHASER SCENES</button>
                    <button onClick={() => setActiveTab('cheats')} style={tabBtnStyle(activeTab === 'cheats')}>STATE MUTATION</button>
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

                {/* ── CHEATS TAB ── */}
                {activeTab === 'cheats' && (
                    <div>
                        <div style={{ color: '#888', marginBottom: 15, fontSize: 12 }}>GAMESTATE INSTANCE: {GameState.state ? 'ACTIVE' : 'NULL'}</div>

                        {GameState.state ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                                <div>
                                    <div style={{ marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Cash: ${GameState.state.cash.toLocaleString()}</div>
                                    <button style={btnStyle} onClick={() => cheatCash(100000)}>[ + $100,000 ]</button>
                                    <button style={btnStyle} onClick={() => cheatCash(-100000)}>[ - $100,000 ]</button>
                                </div>
                                <div>
                                    <div style={{ marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Week: {GameState.state.week}</div>
                                    <button style={btnStyle} onClick={() => advanceWeek()}>[ Fast Forward 1 Week ]</button>

                                    <div style={{ marginTop: 20, marginBottom: 10, fontSize: 13, color: '#c9a84c' }}>Reputation: {GameState.state.reputation}</div>
                                    <button style={{ ...btnStyle, border: '1px solid #555', color: '#888' }} onClick={() => {
                                        GameState.state.reputation = 100; forceUpdate();
                                    }}>[ Maximize Reputation ]</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: '#c94040', fontSize: 13 }}>
                                GameState is not initialized yet. Please start a new game or load a dossier first.
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
