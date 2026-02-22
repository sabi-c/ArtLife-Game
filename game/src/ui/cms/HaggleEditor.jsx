import React, { useState, useCallback, useMemo } from 'react';
import { DEALER_TYPES, TACTICS, BLUE_OPTIONS, HAGGLE_CONFIG, HAGGLE_TYPES, TYPE_EFFECTIVENESS } from '../../data/haggle_config.js';
import { HaggleManager } from '../../managers/HaggleManager.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { MarketManager } from '../../managers/MarketManager.js';
import { GameState } from '../../managers/GameState.js';
import { CONTACTS } from '../../data/contacts.js';

// ── Color palette ──────────────────────────────────
const TYPE_COLORS = {
    [HAGGLE_TYPES.FINANCIAL]: { bg: '#1a2a1a', border: '#3a8a3a', text: '#4ade80', icon: '💰' },
    [HAGGLE_TYPES.EMOTIONAL]: { bg: '#2a1a2a', border: '#8a3a8a', text: '#c084fc', icon: '💜' },
    [HAGGLE_TYPES.AGGRESSIVE]: { bg: '#2a1a1a', border: '#8a3a3a', text: '#f87171', icon: '🗡️' },
    [HAGGLE_TYPES.LOGICAL]: { bg: '#1a1a2a', border: '#3a3a8a', text: '#60a5fa', icon: '🧮' },
};

const panelStyle = {
    background: '#0a0a14', border: '1px solid #1a1a2e', borderRadius: 4,
    padding: 14, fontSize: 11, flex: 1,
};

const btnStyle = {
    background: 'transparent', border: '1px solid #444', color: '#aaa',
    padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
};

// ── Type Effectiveness Chart ──────────────────────
function TypeChart() {
    const types = Object.keys(HAGGLE_TYPES).map(k => HAGGLE_TYPES[k]);
    return (
        <div style={panelStyle}>
            <div style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 12, marginBottom: 12 }}>
                ⚔️ TYPE EFFECTIVENESS CHART
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                    <tr>
                        <th style={{ color: '#666', padding: 6, textAlign: 'left' }}>Tactic ↓ / Dealer →</th>
                        {types.map(t => {
                            const tc = TYPE_COLORS[t] || {};
                            return <th key={t} style={{ color: tc.text || '#888', padding: 6, textAlign: 'center' }}>{tc.icon} {t}</th>;
                        })}
                    </tr>
                </thead>
                <tbody>
                    {types.map(tacticType => {
                        const tc = TYPE_COLORS[tacticType] || {};
                        return (
                            <tr key={tacticType}>
                                <td style={{ color: tc.text || '#888', padding: 6, fontWeight: 'bold' }}>
                                    {tc.icon} {tacticType}
                                </td>
                                {types.map(dealerStyle => {
                                    const key = `${tacticType}_vs_${dealerStyle}`;
                                    const eff = TYPE_EFFECTIVENESS[key];
                                    let label = '1.0×';
                                    let color = '#555';
                                    if (eff !== undefined) {
                                        label = `${eff}×`;
                                        color = eff > 1 ? '#4ade80' : eff < 1 ? '#f87171' : '#888';
                                    }
                                    return (
                                        <td key={dealerStyle} style={{ textAlign: 'center', padding: 6, color, fontWeight: eff !== 1 ? 'bold' : 'normal' }}>
                                            {label}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Dealer Card ──────────────────────────────────
function DealerCard({ dealerKey, dealer, isSelected, onSelect }) {
    const tc = TYPE_COLORS[dealer.haggleStyle] || {};
    return (
        <div
            onClick={() => onSelect(dealerKey)}
            style={{
                ...panelStyle,
                cursor: 'pointer',
                borderColor: isSelected ? '#c9a84c' : tc.border || '#333',
                background: isSelected ? 'rgba(201,168,76,0.08)' : tc.bg || '#0a0a14',
                flex: 'none', width: 180, minHeight: 120,
            }}
        >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{dealer.icon}</div>
            <div style={{ color: '#eaeaea', fontWeight: 'bold', fontSize: 13 }}>{dealer.name}</div>
            <div style={{ color: '#888', fontSize: 10, marginTop: 4 }}>{dealer.description}</div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 9, color: tc.text }}>{tc.icon} {dealer.haggleStyle}</div>
                <div style={{ fontSize: 9, color: '#666' }}>Patience: {'❤️'.repeat(dealer.patience)}{'🖤'.repeat(5 - dealer.patience)}</div>
                <div style={{ fontSize: 9, color: '#666' }}>Greed: ×{dealer.greedFactor}</div>
                <div style={{ fontSize: 9, color: '#4ade80' }}>Weak to: {dealer.weakTo}</div>
                <div style={{ fontSize: 9, color: '#f87171' }}>Strong vs: {dealer.strongAgainst}</div>
            </div>
        </div>
    );
}

// ── Tactic Card ──────────────────────────────────
function TacticCard({ tactic, isBlue }) {
    const tc = TYPE_COLORS[tactic.type] || {};
    return (
        <div style={{
            ...panelStyle,
            flex: 'none', minWidth: 220,
            borderColor: isBlue ? '#3b82f6' : tc.border || '#333',
            background: isBlue ? 'rgba(59,130,246,0.08)' : tc.bg || '#0a0a14',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{isBlue ? '⭐' : tc.icon}</span>
                <span style={{ color: isBlue ? '#60a5fa' : '#eaeaea', fontWeight: 'bold', fontSize: 12 }}>
                    {tactic.label}
                </span>
            </div>
            <div style={{ color: '#888', fontSize: 10, marginBottom: 8 }}>{tactic.description}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 9 }}>
                <div style={{ color: tc.text }}>Type: {tactic.type}</div>
                <div style={{ color: '#4ade80' }}>Base: {Math.round(tactic.baseSuccess * 100)}%</div>
                <div style={{ color: tactic.patienceEffect > 0 ? '#4ade80' : '#f87171' }}>
                    Patience: {tactic.patienceEffect > 0 ? '+' : ''}{tactic.patienceEffect}
                </div>
                <div style={{ color: '#888' }}>
                    Stat: {tactic.statBonus || 'none'} (×{tactic.statWeight || 0})
                </div>
                {tactic.heatGain > 0 && <div style={{ color: '#ff9999' }}>Heat: +{tactic.heatGain}</div>}
                {tactic.suspicionGain > 0 && <div style={{ color: '#ffaa55' }}>Suspicion: +{tactic.suspicionGain}</div>}
                {isBlue && tactic.requiredStat && (
                    <div style={{ color: '#60a5fa', gridColumn: '1 / -1' }}>
                        Requires: {tactic.requiredStat} ≥ {tactic.requiredMin}
                    </div>
                )}
            </div>
            {tactic.dialogue && (
                <div style={{ marginTop: 8, fontSize: 10, color: '#c9a84c', fontStyle: 'italic', borderTop: '1px solid #222', paddingTop: 6 }}>
                    {tactic.dialogue}
                </div>
            )}
        </div>
    );
}

// ── Test Battle Launcher ─────────────────────────
function TestLauncher() {
    const [mode, setMode] = useState('buy');
    const [dealerType, setDealerType] = useState('random');
    const [askingPrice, setAskingPrice] = useState(25000);
    const [artworkTitle, setArtworkTitle] = useState('Test Artwork');
    const [artworkArtist, setArtworkArtist] = useState('Various');
    const [npcId, setNpcId] = useState('none');
    const [notification, setNotification] = useState(null);

    const npcs = useMemo(() => {
        const list = [{ id: 'none', name: '(Anonymous Dealer)' }];
        if (CONTACTS && Array.isArray(CONTACTS)) {
            CONTACTS.forEach(c => list.push({ id: c.id, name: c.name }));
        }
        return list;
    }, []);

    const handleLaunch = () => {
        if (!GameState.state) {
            setNotification('❌ Game not running — start a game first');
            setTimeout(() => setNotification(null), 3000);
            return;
        }

        const npc = npcId !== 'none' ? CONTACTS.find(c => c.id === npcId) : null;
        const work = {
            id: `test_haggle_${Date.now()}`,
            title: artworkTitle,
            artist: artworkArtist,
            year: '2024',
            medium: 'Test Medium',
        };

        try {
            const result = HaggleManager.start({
                mode,
                work,
                npc,
                askingPrice: parseInt(askingPrice) || 25000,
            });

            // Override dealer type if specified
            if (dealerType !== 'random' && HaggleManager.active && DEALER_TYPES[dealerType]) {
                HaggleManager.active.dealerTypeKey = dealerType;
                HaggleManager.active.dealerType = DEALER_TYPES[dealerType];
                HaggleManager.active.dealerIcon = DEALER_TYPES[dealerType].icon;
                HaggleManager.active.patience = DEALER_TYPES[dealerType].patience;
            }

            const haggleInfo = {
                ...result,
                bgKey: 'bg_gallery_main_1bit_1771587911969.png',
            };

            // Launch HaggleScene
            GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'HaggleScene', {
                haggleInfo,
                returnScene: 'MainMenuScene',
                returnArgs: {},
            });

            setNotification(`⚔️ Launched ${mode} battle: "${artworkTitle}" @ $${parseInt(askingPrice).toLocaleString()} vs ${result.dealerName} (${result.dealerType})`);
        } catch (err) {
            setNotification('❌ Error: ' + err.message);
        }
        setTimeout(() => setNotification(null), 4000);
    };

    const inputStyle = {
        width: '100%', padding: '6px 8px', background: '#111', border: '1px solid #333',
        color: '#eaeaea', fontFamily: 'inherit', fontSize: 11, boxSizing: 'border-box',
    };

    return (
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 12 }}>
                🎮 TEST BATTLE LAUNCHER
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                    <label style={{ color: '#666', fontSize: 9, textTransform: 'uppercase' }}>Mode</label>
                    <select value={mode} onChange={e => setMode(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="buy">🛒 Buy</option>
                        <option value="sell">💰 Sell</option>
                    </select>
                </div>
                <div>
                    <label style={{ color: '#666', fontSize: 9, textTransform: 'uppercase' }}>Dealer Type</label>
                    <select value={dealerType} onChange={e => setDealerType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="random">🎲 Random</option>
                        {Object.entries(DEALER_TYPES).map(([key, d]) => (
                            <option key={key} value={key}>{d.icon} {d.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ color: '#666', fontSize: 9, textTransform: 'uppercase' }}>Asking Price ($)</label>
                    <input type="number" value={askingPrice} onChange={e => setAskingPrice(e.target.value)} style={{ ...inputStyle, color: '#4ade80' }} />
                </div>
                <div>
                    <label style={{ color: '#666', fontSize: 9, textTransform: 'uppercase' }}>NPC</label>
                    <select value={npcId} onChange={e => setNpcId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {npcs.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ color: '#666', fontSize: 9, textTransform: 'uppercase' }}>Artwork Title</label>
                    <input value={artworkTitle} onChange={e => setArtworkTitle(e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={{ color: '#666', fontSize: 9, textTransform: 'uppercase' }}>Artist</label>
                    <input value={artworkArtist} onChange={e => setArtworkArtist(e.target.value)} style={inputStyle} />
                </div>
            </div>

            <button
                onClick={handleLaunch}
                style={{
                    ...btnStyle,
                    background: '#c9a84c', color: '#000', fontWeight: 'bold',
                    padding: '10px 20px', fontSize: 13, letterSpacing: 1,
                    border: 'none', borderRadius: 4,
                }}
            >
                ⚔️ LAUNCH HAGGLE BATTLE
            </button>

            {notification && (
                <div style={{
                    padding: '8px 12px', borderRadius: 4, fontSize: 11,
                    background: notification.startsWith('❌') ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
                    color: notification.startsWith('❌') ? '#f87171' : '#4ade80',
                    border: `1px solid ${notification.startsWith('❌') ? '#8a3a3a' : '#3a8a3a'}`,
                }}>
                    {notification}
                </div>
            )}
        </div>
    );
}

// ── Main HaggleEditor Component ──────────────────
export default function HaggleEditor() {
    const [selectedDealer, setSelectedDealer] = useState(null);
    const [activeSection, setActiveSection] = useState('overview'); // overview, tactics, test

    const dealerEntries = Object.entries(DEALER_TYPES);
    const tacticEntries = Object.entries(TACTICS);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header with section tabs */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px', background: '#111', borderBottom: '1px solid #333',
                fontSize: 12, color: '#c9a84c',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <strong>⚔️ Haggle System</strong>
                    {['overview', 'tactics', 'test'].map(s => (
                        <button
                            key={s}
                            onClick={() => setActiveSection(s)}
                            style={{
                                ...btnStyle, fontSize: 10,
                                borderColor: activeSection === s ? '#c9a84c' : '#333',
                                color: activeSection === s ? '#c9a84c' : '#666',
                            }}
                        >
                            {s === 'overview' ? '📊 Dealers & Types' : s === 'tactics' ? '⚔️ Tactics & Blue Options' : '🎮 Test Battle'}
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: 10, color: '#666' }}>
                    Max Rounds: {HAGGLE_CONFIG.maxRounds} · {dealerEntries.length} dealers · {tacticEntries.length + BLUE_OPTIONS.length} tactics
                </div>
            </div>

            {/* Content area */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {activeSection === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Dealer Gallery */}
                        <div>
                            <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}>
                                DEALER PERSONALITY TYPES
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {dealerEntries.map(([key, dealer]) => (
                                    <DealerCard
                                        key={key}
                                        dealerKey={key}
                                        dealer={dealer}
                                        isSelected={selectedDealer === key}
                                        onSelect={setSelectedDealer}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Selected Dealer Detail */}
                        {selectedDealer && DEALER_TYPES[selectedDealer] && (
                            <div style={panelStyle}>
                                <div style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 14, marginBottom: 12 }}>
                                    {DEALER_TYPES[selectedDealer].icon} {DEALER_TYPES[selectedDealer].name} — Detail
                                </div>
                                <pre style={{
                                    background: '#050508', border: '1px solid #222', padding: 12,
                                    color: '#4ade80', fontSize: 10, whiteSpace: 'pre-wrap', margin: 0,
                                    maxHeight: 200, overflow: 'auto',
                                }}>
                                    {JSON.stringify(DEALER_TYPES[selectedDealer], null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* Type Effectiveness Chart */}
                        <TypeChart />
                    </div>
                )}

                {activeSection === 'tactics' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Base Tactics */}
                        <div>
                            <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}>
                                BASE TACTICS (always available)
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {tacticEntries.map(([key, tactic]) => (
                                    <TacticCard key={key} tactic={tactic} isBlue={false} />
                                ))}
                            </div>
                        </div>

                        {/* Blue Options */}
                        <div>
                            <div style={{ color: '#3b82f6', fontSize: 10, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}>
                                ⭐ BLUE OPTIONS (stat-gated premium tactics)
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {BLUE_OPTIONS.map(bo => (
                                    <TacticCard key={bo.id} tactic={bo} isBlue={true} />
                                ))}
                            </div>
                        </div>

                        {/* Config Summary */}
                        <div style={panelStyle}>
                            <div style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>
                                ⚙️ HAGGLE CONFIG
                            </div>
                            <pre style={{
                                background: '#050508', border: '1px solid #222', padding: 12,
                                color: '#4ade80', fontSize: 10, whiteSpace: 'pre-wrap', margin: 0,
                            }}>
                                {JSON.stringify(HAGGLE_CONFIG, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}

                {activeSection === 'test' && (
                    <div style={{ maxWidth: 600, margin: '0 auto' }}>
                        <TestLauncher />

                        <div style={{ ...panelStyle, marginTop: 16 }}>
                            <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 8 }}>
                                HOW IT WORKS
                            </div>
                            <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6 }}>
                                <p style={{ margin: '0 0 8px' }}>
                                    <strong style={{ color: '#c9a84c' }}>1.</strong> Configure the battle parameters above — mode (buy/sell), dealer type, price, NPC, and artwork.
                                </p>
                                <p style={{ margin: '0 0 8px' }}>
                                    <strong style={{ color: '#c9a84c' }}>2.</strong> Click <strong>Launch Haggle Battle</strong> to start the Pokemon-style negotiation scene.
                                </p>
                                <p style={{ margin: '0 0 8px' }}>
                                    <strong style={{ color: '#c9a84c' }}>3.</strong> Use tactics each round. Every tactic has a <strong>type</strong> (Financial/Emotional/Aggressive/Logical) that interacts with the dealer's personality type.
                                </p>
                                <p style={{ margin: '0 0 8px' }}>
                                    <strong style={{ color: '#c9a84c' }}>4.</strong> Type advantages give <strong>1.5×</strong> success, disadvantages give <strong>0.5×</strong>. Check the Type Chart on the Dealers tab.
                                </p>
                                <p style={{ margin: '0 0 0' }}>
                                    <strong style={{ color: '#c9a84c' }}>5.</strong> ⭐ <strong>Blue Options</strong> are premium tactics gated by your stats (taste, reputation, intel, access, audacity). They're more powerful but require investment.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
