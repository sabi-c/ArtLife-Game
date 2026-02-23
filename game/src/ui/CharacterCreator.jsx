import React, { useState, useEffect } from 'react';
import { CHARACTERS, DRIP_OPTIONS, VICE_OPTIONS } from '../data/characters.js';
import { GameState } from '../managers/GameState.js';
import { WebAudioService } from '../managers/WebAudioService.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { SettingsManager } from '../managers/SettingsManager.js';

const STEPS = {
    ARCHETYPE: 1,
    TRAIT: 2,
    DRIP: 3,
    VICE: 4,
    STATS_AND_ID: 5
};

export default function CharacterCreator({ ui }) {
    const [step, setStep] = useState(STEPS.ARCHETYPE);

    const appTheme = SettingsManager.get('appTheme') || 'artnet';
    const isArtnet = appTheme === 'artnet';

    const theme = isArtnet ? {
        bg: '#f8f9fa',
        text: '#1a1a1a',
        accent: '#c9a84c',
        muted: '#6c757d',
        border: '#dee2e6',
        highlightBg: 'rgba(201,168,76,0.1)',
        font: '"Inter", -apple-system, sans-serif',
        titleFont: '"Playfair Display", serif',
        titleShadow: 'none',
        inputBg: '#ffffff',
        boxBg: '#ffffff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        borderRadius: '4px'
    } : {
        bg: '#0a0a0f',
        text: '#eaeaea',
        accent: '#c9a84c',
        muted: '#888',
        border: '#333',
        highlightBg: 'rgba(201,168,76,0.05)',
        font: '"IBM Plex Mono", "Courier New", Courier, monospace',
        titleFont: '"Press Start 2P"',
        titleShadow: 'none',
        inputBg: '#09090c',
        boxBg: '#0e0e14',
        boxShadow: 'none',
        borderRadius: '0px'
    };

    // Character selections
    const [selectedArchetype, setSelectedArchetype] = useState(null);
    const [selectedTrait, setSelectedTrait] = useState(null);
    const [selectedDrip, setSelectedDrip] = useState(null);
    const [selectedVice, setSelectedVice] = useState(null);

    // Final review
    const [playerName, setPlayerName] = useState('');
    const [stats, setStats] = useState({ reputation: 0, taste: 0, audacity: 0, access: 0 });
    const [bonusPoints, setBonusPoints] = useState(0);

    // Initialise stats when archetype is chosen
    useEffect(() => {
        if (selectedArchetype) {
            setStats({ ...selectedArchetype.startingStats });
            const pts = { EASY: 15, MEDIUM: 20, HARD: 25 }[selectedArchetype.difficulty] || 20;
            setBonusPoints(pts);
        }
    }, [selectedArchetype]);

    const handleNext = () => {
        if (step === STEPS.ARCHETYPE && !selectedArchetype) return;
        if (step === STEPS.TRAIT && !selectedTrait) return;
        if (step === STEPS.DRIP && !selectedDrip) return;

        WebAudioService.select();
        setStep(Math.min(step + 1, STEPS.STATS_AND_ID));
    };

    const handleBack = () => {
        WebAudioService.hover();
        setStep(Math.max(step - 1, STEPS.ARCHETYPE));
    };

    const handleConfirm = () => {
        WebAudioService.success();

        const finalName = playerName.trim() || 'The Dealer';

        const finalChar = {
            ...selectedArchetype,
            playerName: finalName,
            startingStats: { ...stats },
            selectedTrait: selectedTrait,
            selectedDrip: selectedDrip,
            selectedVice: selectedVice?.id !== 'none' ? selectedVice : null
        };

        GameState.init(finalChar);
        GameState.autoSave();

        // Reveal the terminal background container
        if (ui && ui.container) {
            ui.container.style.display = '';
        }

        import('../terminal/screens/index.js').then(({ dashboardScreen }) => {
            if (ui) ui.pushScreen(dashboardScreen(ui));
            const phaserCanvas = document.getElementById('phaser-game-container');
            if (phaserCanvas) phaserCanvas.style.display = 'none';
            // Final routing to close this view and show the terminal dashboard
            GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
        });
    };

    const cardStyle = (isSelected) => ({
        border: `1px solid ${isSelected ? theme.accent : theme.border}`,
        backgroundColor: isSelected ? theme.highlightBg : theme.boxBg,
        padding: 16,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        transition: 'all 0.2s',
        filter: isSelected ? `drop-shadow(0 0 8px ${isArtnet ? 'rgba(0,0,0,0.1)' : 'rgba(201,168,76,0.15)'})` : 'none',
        transform: isSelected ? 'translateY(-2px)' : 'none',
        borderRadius: theme.borderRadius,
        boxShadow: isArtnet && !isSelected ? theme.boxShadow : 'none'
    });

    const renderArchetypeSelection = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: isArtnet ? 16 : 13, color: theme.text, marginBottom: 8, fontFamily: isArtnet ? theme.font : 'inherit', fontWeight: isArtnet ? 'bold' : 'normal' }}>SELECT APPLICANT PROFILE</h2>
                <p style={{ fontSize: 11, color: theme.muted }}>Your background defines your starting capital, perks, and market difficulty.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: '0 20px' }}>
                {CHARACTERS.map(char => (
                    <div
                        key={char.id}
                        style={cardStyle(selectedArchetype?.id === char.id)}
                        onClick={() => {
                            WebAudioService.hover();
                            setSelectedArchetype(char);
                            setSelectedTrait(null); // Reset trait on archetype change
                        }}
                    >
                        <div style={{ fontSize: 32, marginBottom: 12 }}>{char.icon}</div>
                        <div style={{ fontFamily: isArtnet ? theme.font : '"Press Start 2P"', fontSize: isArtnet ? 12 : 9, fontWeight: isArtnet ? 'bold' : 'normal', color: selectedArchetype?.id === char.id ? theme.accent : theme.text, marginBottom: 8, lineHeight: 1.4 }}>{char.name}</div>

                        <div style={{ width: '100%', height: 1, backgroundColor: theme.border, margin: '8px 0' }} />

                        <div style={{ fontSize: 11, color: isArtnet ? '#e69900' : '#ffaa00', marginBottom: 4 }}>${char.startingCash.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: isArtnet ? theme.text : '#fff', marginBottom: 12, fontStyle: isArtnet ? 'italic' : 'normal' }}>"{char.perk}"</div>

                        <div style={{ fontSize: 10, color: isArtnet ? '#28a745' : '#aaeeaa', marginBottom: 12, fontWeight: isArtnet ? 'bold' : 'normal' }}>+ {char.difficulty === 'HARD' ? 25 : char.difficulty === 'MEDIUM' ? 20 : 15} build pts</div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, width: '100%', fontSize: 10, color: theme.muted, marginBottom: 16 }}>
                            <div>HYP:{char.startingStats.reputation}</div>
                            <div>TST:{char.startingStats.taste}</div>
                            <div>AUD:{char.startingStats.audacity}</div>
                            <div>ACC:{char.startingStats.access}</div>
                        </div>

                        <div style={{ marginTop: 'auto', border: `1px solid ${char.difficultyColor}`, color: char.difficultyColor, fontSize: 10, padding: '4px 8px', borderRadius: 4 }}>
                            {char.difficulty}
                        </div>
                    </div>
                ))}
            </div>

            {selectedArchetype && (
                <div style={{ margin: '24px 20px 0', padding: 16, backgroundColor: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: theme.borderRadius, textAlign: 'center' }}>
                    <div style={{ fontFamily: isArtnet ? theme.font : '"Press Start 2P"', fontSize: isArtnet ? 13 : 9, fontWeight: isArtnet ? 'bold' : 'normal', color: theme.accent, marginBottom: 8 }}>{selectedArchetype.tagline}</div>
                    <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.5 }}>{selectedArchetype.description}</div>
                </div>
            )}
        </div>
    );

    const renderTraitSelection = () => {
        if (!selectedArchetype) return null;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: isArtnet ? 16 : 13, color: theme.text, marginBottom: 8, fontFamily: isArtnet ? theme.font : 'inherit', fontWeight: isArtnet ? 'bold' : 'normal' }}>COMPETITIVE ADVANTAGE</h2>
                    <p style={{ fontSize: 11, color: theme.muted }}>Select a starting trait unique to the {selectedArchetype.name} profile.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, padding: '0 40px' }}>
                    {selectedArchetype.traits.map(trait => (
                        <div
                            key={trait.id}
                            style={{
                                ...cardStyle(selectedTrait?.id === trait.id),
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                textAlign: 'left',
                                padding: 20
                            }}
                            onClick={() => {
                                WebAudioService.hover();
                                setSelectedTrait(trait);
                            }}
                        >
                            <div style={{ fontSize: 24, marginRight: 16 }}>{trait.icon}</div>
                            <div>
                                <div style={{ fontFamily: isArtnet ? theme.font : '"Press Start 2P"', fontSize: isArtnet ? 13 : 9, fontWeight: isArtnet ? 'bold' : 'normal', color: selectedTrait?.id === trait.id ? theme.accent : theme.text, marginBottom: 8 }}>{trait.label}</div>
                                <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5 }}>{trait.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    // Make sure we have the base empty vice for "No Vice" option
    const viceOptionsWithNone = [
        { id: 'none', icon: '✅', label: 'Clean Record', flavor: 'No mechanical bonuses. No mechanical flaws.', effects: {} },
        ...VICE_OPTIONS
    ];

    const renderDripSelection = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: isArtnet ? 16 : 13, color: isArtnet ? '#6644dd' : '#aa88ff', marginBottom: 8, fontFamily: isArtnet ? theme.font : 'inherit', fontWeight: isArtnet ? 'bold' : 'normal' }}>PRESENTATION PROFILE</h2>
                <p style={{ fontSize: 11, color: theme.muted }}>Your aesthetic sends a message before you open your mouth.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, padding: '0 40px' }}>
                {DRIP_OPTIONS.map(drip => (
                    <div
                        key={drip.id}
                        style={{
                            ...cardStyle(selectedDrip?.id === drip.id),
                            borderColor: selectedDrip?.id === drip.id ? (isArtnet ? '#6644dd' : '#aa88ff') : theme.border,
                            backgroundColor: selectedDrip?.id === drip.id ? (isArtnet ? 'rgba(102,68,221,0.05)' : 'rgba(170,136,255,0.05)') : theme.boxBg,
                            filter: selectedDrip?.id === drip.id ? `drop-shadow(0 0 8px ${isArtnet ? 'rgba(0,0,0,0.1)' : 'rgba(170,136,255,0.15)'})` : 'none',
                        }}
                        onClick={() => {
                            WebAudioService.hover();
                            setSelectedDrip(drip);
                        }}
                    >
                        <div style={{ fontSize: 32, marginBottom: 12 }}>{drip.icon}</div>
                        <div style={{ fontFamily: isArtnet ? theme.font : '"Press Start 2P"', fontSize: isArtnet ? 12 : 8, fontWeight: isArtnet ? 'bold' : 'normal', color: selectedDrip?.id === drip.id ? (isArtnet ? '#6644dd' : '#aa88ff') : theme.text, marginBottom: 8, lineHeight: 1.4 }}>{drip.label}</div>
                        <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5 }}>{drip.flavor}</div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderViceSelection = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: isArtnet ? 16 : 13, color: isArtnet ? '#dd3333' : '#ff4444', marginBottom: 8, fontFamily: isArtnet ? theme.font : 'inherit', fontWeight: isArtnet ? 'bold' : 'normal' }}>FATAL FLAW (OPTIONAL)</h2>
                <p style={{ fontSize: 11, color: theme.muted }}>Accept a permanent mechanical penalty in exchange for an immediate boost.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, padding: '0 40px' }}>
                {viceOptionsWithNone.map((vice, i) => {
                    const isNone = vice.id === 'none';
                    return (
                        <div
                            key={vice.id}
                            style={{
                                ...cardStyle((selectedVice?.id === vice.id) || (!selectedVice && isNone)),
                                borderColor: (selectedVice?.id === vice.id) || (!selectedVice && isNone) ? (isNone ? theme.muted : (isArtnet ? '#dd3333' : '#ff4444')) : theme.border,
                                backgroundColor: (selectedVice?.id === vice.id) || (!selectedVice && isNone) ? (isNone ? (isArtnet ? '#f3f4f6' : 'rgba(255,255,255,0.05)') : (isArtnet ? 'rgba(221,51,51,0.05)' : 'rgba(255,68,68,0.05)')) : theme.boxBg,
                                filter: (selectedVice?.id === vice.id) || (!selectedVice && isNone) ? (isNone ? 'none' : `drop-shadow(0 0 8px ${isArtnet ? 'rgba(0,0,0,0.1)' : 'rgba(255,68,68,0.15)'})`) : 'none',
                                gridColumn: isNone ? '1 / -1' : 'auto', // Clean record spans full width at the top
                                flexDirection: isNone ? 'row' : 'column',
                                textAlign: isNone ? 'left' : 'center',
                                padding: isNone ? '16px 24px' : 16
                            }}
                            onClick={() => {
                                WebAudioService.hover();
                                setSelectedVice(vice);
                            }}
                        >
                            <div style={{ fontSize: isNone ? 24 : 32, marginBottom: isNone ? 0 : 12, marginRight: isNone ? 16 : 0 }}>{vice.icon}</div>
                            <div>
                                <div style={{ fontFamily: isArtnet ? theme.font : '"Press Start 2P"', fontSize: isArtnet ? 12 : 8, fontWeight: isArtnet ? 'bold' : 'normal', color: ((selectedVice?.id === vice.id) || (!selectedVice && isNone)) ? (isNone ? theme.text : (isArtnet ? '#dd3333' : '#ff4444')) : theme.text, marginBottom: 8, lineHeight: 1.4 }}>{vice.label}</div>
                                <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5 }}>
                                    {vice.flavor}
                                    {!isNone && vice.desc && (
                                        <div style={{ marginTop: 8, color: isArtnet ? '#995555' : '#ccaaaa', fontSize: 10 }}>{vice.desc}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
    const adjustStat = (stat, delta) => {
        const base = selectedArchetype.startingStats[stat];
        const current = stats[stat];
        const next = current + delta;

        if (delta > 0) {
            if (bonusPoints <= 0) return; // No points left
            if (next > 95) return;        // Hard cap
        } else {
            if (next < 0) return;         // Cannot go negative
            if (next < base - 15) return; // Cannot reduce more than 15 below base
        }

        setStats({ ...stats, [stat]: next });
        setBonusPoints(bonusPoints - delta);
        WebAudioService.hover();
    };

    const renderStatsAndId = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 40px' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: isArtnet ? 16 : 13, color: theme.text, marginBottom: 8, fontFamily: isArtnet ? theme.font : 'inherit', fontWeight: isArtnet ? 'bold' : 'normal' }}>RISK ASSESSMENT & IDENTITY</h2>
                <p style={{ fontSize: 11, color: theme.muted }}>Allocate remaining points and sign the application.</p>
            </div>

            <div style={{
                margin: '0 auto 24px', padding: '12px 24px',
                backgroundColor: bonusPoints > 0 ? 'rgba(68,204,68,0.1)' : (isArtnet ? 'rgba(204,136,51,0.1)' : 'rgba(204,136,51,0.1)'),
                border: `1px solid ${bonusPoints > 0 ? '#44cc44' : (isArtnet ? theme.accent : '#cc8833')}`,
                color: bonusPoints > 0 ? '#44cc44' : (isArtnet ? theme.accent : '#cc8833'),
                fontFamily: isArtnet ? theme.font : '"Press Start 2P"', fontSize: 11, textAlign: 'center',
                borderRadius: theme.borderRadius, fontWeight: isArtnet ? 'bold' : 'normal'
            }}>
                {bonusPoints} POINTS REMAINING
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, max-content) 1fr minmax(120px, max-content)', gap: '16px 24px', alignItems: 'center', marginBottom: 32 }}>
                {[
                    { key: 'reputation', label: 'HYPE (REP)', color: isArtnet ? '#6666dd' : '#8888ff' },
                    { key: 'taste', label: 'TASTE (TST)', color: isArtnet ? '#dd8822' : '#ffaa44' },
                    { key: 'audacity', label: 'AUDACITY (AUD)', color: isArtnet ? '#cc4422' : '#ee6644' },
                    { key: 'access', label: 'ACCESS (ACC)', color: isArtnet ? '#2299dd' : '#44bbff' }
                ].map(stat => {
                    const base = selectedArchetype.startingStats[stat.key];
                    const val = stats[stat.key];
                    const delta = val - base;

                    return (
                        <React.Fragment key={stat.key}>
                            <div style={{ fontFamily: isArtnet ? theme.font : '"Press Start 2P"', fontSize: isArtnet ? 11 : 9, color: isArtnet ? theme.text : '#ccccee', textAlign: 'right', fontWeight: isArtnet ? 'bold' : 'normal' }}>{stat.label}</div>

                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <button
                                    onClick={() => adjustStat(stat.key, -1)}
                                    disabled={val <= Math.max(0, base - 15)}
                                    style={{
                                        background: 'none', border: 'none', color: val <= Math.max(0, base - 15) ? (isArtnet ? '#ccc' : '#333') : (isArtnet ? theme.accent : '#7788cc'),
                                        fontFamily: isArtnet ? theme.font : '"Press Start 2P"', fontSize: isArtnet ? 14 : 12, cursor: val <= Math.max(0, base - 15) ? 'default' : 'pointer', padding: '0 12px'
                                    }}
                                >
                                    ◄
                                </button>

                                <div style={{ flex: 1, backgroundColor: isArtnet ? '#e9ecef' : '#0a0a18', height: 12, position: 'relative', borderRadius: isArtnet ? '6px' : '0', overflow: isArtnet ? 'hidden' : 'visible' }}>
                                    {/* Base bar */}
                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(val, base)}%`, backgroundColor: stat.color, opacity: isArtnet ? 0.6 : 0.4 }} />
                                    {/* Bonus bar */}
                                    {val > base && (
                                        <div style={{ position: 'absolute', left: `${base}%`, top: 0, bottom: 0, width: `${val - base}%`, backgroundColor: stat.color, opacity: 1.0 }} />
                                    )}
                                    {/* Penalty bar */}
                                    {val < base && (
                                        <div style={{ position: 'absolute', left: `${val}%`, top: 0, bottom: 0, width: `${base - val}%`, backgroundColor: isArtnet ? '#dc3545' : '#882222', opacity: isArtnet ? 0.8 : 0.6 }} />
                                    )}
                                    {/* Base marker line */}
                                    <div style={{ position: 'absolute', left: `${base}%`, top: isArtnet ? 0 : -4, bottom: isArtnet ? 0 : -4, width: 2, backgroundColor: isArtnet ? '#343a40' : '#6666aa' }} />
                                </div>

                                <button
                                    onClick={() => adjustStat(stat.key, 1)}
                                    disabled={bonusPoints <= 0 || val >= 95}
                                    style={{
                                        background: 'none', border: 'none', color: (bonusPoints <= 0 || val >= 95) ? (isArtnet ? '#ccc' : '#333') : (isArtnet ? theme.accent : '#7788cc'),
                                        fontFamily: isArtnet ? theme.font : '"Press Start 2P"', fontSize: isArtnet ? 14 : 12, cursor: (bonusPoints <= 0 || val >= 95) ? 'default' : 'pointer', padding: '0 12px'
                                    }}
                                >
                                    ►
                                </button>
                            </div>

                            <div style={{ fontFamily: isArtnet ? theme.font : '"Press Start 2P"', fontSize: isArtnet ? 12 : 10, color: delta > 0 ? '#28a745' : delta < 0 ? '#dc3545' : theme.muted, width: 60, fontWeight: isArtnet ? 'bold' : 'normal' }}>
                                {val} {delta > 0 ? `+${delta}` : delta < 0 ? delta : ''}
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            <div style={{ borderTop: `1px dashed ${theme.border}`, paddingTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ fontSize: 11, color: theme.muted, marginBottom: 12, fontWeight: isArtnet ? 'bold' : 'normal' }}>SIGN AGENT DOSSIER (APPLICANT NAME)</label>
                <input
                    type="text"
                    value={playerName}
                    onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        if (val.length <= 18 && /^[A-Z0-9 '\-.&]*$/.test(val)) {
                            setPlayerName(val);
                        }
                    }}
                    placeholder="ENTER NAME..."
                    style={{
                        backgroundColor: theme.inputBg,
                        border: `1px solid ${theme.border}`,
                        color: theme.accent,
                        fontFamily: isArtnet ? theme.font : '"Press Start 2P"',
                        fontSize: isArtnet ? 16 : 14,
                        fontWeight: isArtnet ? 'bold' : 'normal',
                        padding: '16px 24px',
                        width: '100%',
                        maxWidth: 400,
                        textAlign: 'center',
                        outline: 'none',
                        borderRadius: theme.borderRadius
                    }}
                />
            </div>
        </div>
    );

    return (
        <div className="character-creator-overlay" style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: theme.bg, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', color: theme.text,
            fontFamily: theme.font
        }}>
            <div style={{ width: '100%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                <header style={{ marginBottom: 20, textAlign: 'center', borderBottom: `1px dashed ${theme.border}`, paddingBottom: 10 }}>
                    <h1 style={{ fontFamily: theme.titleFont, fontSize: isArtnet ? 24 : 16, color: theme.accent, margin: 0, textShadow: theme.titleShadow, letterSpacing: isArtnet ? '2px' : 'normal' }}>ARTLIFE MEMBER REGISTRATION</h1>
                    <div style={{ fontSize: 11, color: theme.muted, marginTop: 8 }}>SECTION {step} OF 5</div>
                </header>

                <main style={{ flex: 1, overflowY: 'auto' }}>
                    {step === STEPS.ARCHETYPE && renderArchetypeSelection()}
                    {step === STEPS.TRAIT && renderTraitSelection()}
                    {step === STEPS.DRIP && renderDripSelection()}
                    {step === STEPS.VICE && renderViceSelection()}
                    {step === STEPS.STATS_AND_ID && renderStatsAndId()}
                </main>

                <footer style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', borderTop: `1px dashed ${theme.border}`, paddingTop: 15 }}>
                    <button onClick={handleBack} disabled={step === STEPS.ARCHETYPE} style={{
                        background: isArtnet ? (step === STEPS.ARCHETYPE ? '#f0f0f0' : '#fff') : 'none', border: `1px solid ${step === STEPS.ARCHETYPE ? (isArtnet ? '#ddd' : '#333') : (isArtnet ? '#ccc' : '#555')}`, color: step === STEPS.ARCHETYPE ? (isArtnet ? '#aaa' : '#333') : (isArtnet ? '#333' : '#888'),
                        padding: '10px 20px', cursor: step === STEPS.ARCHETYPE ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 12, borderRadius: theme.borderRadius
                    }}>
                        [BACK]
                    </button>
                    {step < STEPS.STATS_AND_ID ? (
                        <button
                            onClick={handleNext}
                            disabled={(step === STEPS.ARCHETYPE && !selectedArchetype) || (step === STEPS.TRAIT && !selectedTrait) || (step === STEPS.DRIP && !selectedDrip)}
                            style={{
                                background: ((step === STEPS.ARCHETYPE && !selectedArchetype) || (step === STEPS.TRAIT && !selectedTrait) || (step === STEPS.DRIP && !selectedDrip)) ? (isArtnet ? '#e0e0e0' : '#333') : (isArtnet ? '#111' : theme.accent),
                                border: '1px solid transparent', color: ((step === STEPS.ARCHETYPE && !selectedArchetype) || (step === STEPS.TRAIT && !selectedTrait) || (step === STEPS.DRIP && !selectedDrip)) ? (isArtnet ? '#fff' : '#000') : (isArtnet ? '#fff' : '#000'),
                                padding: '10px 20px', cursor: ((step === STEPS.ARCHETYPE && !selectedArchetype) || (step === STEPS.TRAIT && !selectedTrait) || (step === STEPS.DRIP && !selectedDrip)) ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 'bold', fontSize: 12, borderRadius: theme.borderRadius
                            }}
                        >
                            [NEXT]
                        </button>
                    ) : (
                        <button onClick={handleConfirm} disabled={!playerName.trim()} style={{
                            background: !playerName.trim() ? (isArtnet ? '#e0e0e0' : '#333') : (isArtnet ? '#28a745' : '#44cc44'), border: '1px solid transparent', color: !playerName.trim() ? (isArtnet ? '#fff' : '#000') : (isArtnet ? '#fff' : '#000'),
                            padding: '10px 20px', cursor: !playerName.trim() ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 'bold', fontSize: 12, borderRadius: theme.borderRadius
                        }}>
                            [SUBMIT APPLICATION]
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
