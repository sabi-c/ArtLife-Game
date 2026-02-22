import React, { useState, useEffect } from 'react';
import { SceneEngine } from '../engines/SceneEngine';
import { WebAudioService } from '../managers/WebAudioService.js';

// ── Scene Library ──
import boomRoomJson from '../data/scenes/boom_room.json';
import galleryOpeningJson from '../data/scenes/gallery_opening.json';
import studioVisitJson from '../data/scenes/studio_visit.json';

const SCENE_LIBRARY = [
    {
        id: 'boom_room',
        title: 'The Boom Room',
        subtitle: 'Margaux offers you something dangerous.',
        location: 'VIP Lounge, Lower East Side',
        data: boomRoomJson,
    },
    {
        id: 'gallery_opening',
        title: 'Gallery Opening',
        subtitle: 'A Chelsea gallery hides secrets in the back room.',
        location: 'Chelsea Gallery District',
        data: galleryOpeningJson,
    },
    {
        id: 'studio_visit',
        title: 'Studio Visit',
        subtitle: 'Julian Vance wants your honest opinion.',
        location: 'Artist Studio, Bermondsey',
        data: studioVisitJson,
    },
];

const baseFont = '"IBM Plex Mono", "Courier New", monospace';
const serifFont = '"Playfair Display", serif';

export default function ScenePlayer({ onClose, payload }) {
    const [selectedScene, setSelectedScene] = useState(null);
    const [scene, setScene] = useState(null);
    const [currentStep, setCurrentStep] = useState(null);

    // If payload specifies a scene, skip selection
    useEffect(() => {
        if (payload?.sceneId) {
            const found = SCENE_LIBRARY.find(s => s.id === payload.sceneId);
            if (found) setSelectedScene(found);
        }
    }, [payload]);

    // Initialize SceneEngine when a scene is selected
    useEffect(() => {
        if (!selectedScene) return;
        const engine = new SceneEngine(selectedScene.data);
        setScene(engine);
        const step = engine.continue();
        setCurrentStep(step);
        WebAudioService.sceneEnter();
        return () => engine.destroy();
    }, [selectedScene]);

    const handleChoice = (index) => {
        WebAudioService.select();
        const nextStep = scene.choose(index);
        setCurrentStep(nextStep);
    };

    const handleBack = () => {
        WebAudioService.sceneExit();
        setSelectedScene(null);
        setScene(null);
        setCurrentStep(null);
    };

    // ── Scene Selection Screen ──
    if (!selectedScene) {
        return (
            <div className="pd-overlay visible" style={{
                zIndex: 9999, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', background: '#050508',
            }}>
                <div style={{ width: '90%', maxWidth: 700, textAlign: 'center' }}>
                    <div style={{ marginBottom: 40 }}>
                        <h1 style={{ color: '#c9a84c', fontFamily: baseFont, fontSize: 24, letterSpacing: 3, margin: 0 }}>
                            SCENE ENGINE
                        </h1>
                        <p style={{ color: '#666', fontFamily: baseFont, fontSize: 12, marginTop: 8 }}>
                            Interactive narrative scenes powered by ink
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {SCENE_LIBRARY.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => { WebAudioService.select(); setSelectedScene(s); }}
                                style={{
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid #333',
                                    padding: '20px 24px', cursor: 'pointer', textAlign: 'left',
                                    fontFamily: baseFont, transition: 'all 0.2s ease',
                                    minHeight: 44,
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.08)'; e.currentTarget.style.borderColor = '#c9a84c'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = '#333'; }}
                            >
                                <div style={{ color: '#c9a84c', fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
                                    {s.title}
                                </div>
                                <div style={{ color: '#aaa', fontSize: 13, marginBottom: 6 }}>
                                    {s.subtitle}
                                </div>
                                <div style={{ color: '#555', fontSize: 11 }}>
                                    {s.location}
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            marginTop: 30, background: 'none', border: '1px solid #444',
                            color: '#888', padding: '10px 24px', cursor: 'pointer',
                            fontFamily: baseFont, fontSize: 13, minHeight: 44,
                        }}
                    >
                        [ BACK TO DASHBOARD ]
                    </button>
                </div>
            </div>
        );
    }

    // ── Loading / Error States ──
    if (!scene || !currentStep) return null;

    if (currentStep.error) {
        return (
            <div className="pd-overlay visible" style={{
                zIndex: 9999, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', background: '#050508',
            }}>
                <div style={{ color: '#c94040', padding: 40, textAlign: 'center', fontFamily: baseFont }}>
                    <h2 style={{ color: '#c94040' }}>Scene Error</h2>
                    <p style={{ color: '#888' }}>{currentStep.message}</p>
                    <button onClick={handleBack} style={{
                        marginTop: 20, background: 'none', border: '1px solid #c94040',
                        color: '#c94040', padding: '10px 20px', cursor: 'pointer', fontFamily: baseFont,
                    }}>[ TRY ANOTHER ]</button>
                </div>
            </div>
        );
    }

    // ── Active Scene Playback ──
    return (
        <div className="pd-overlay visible" style={{
            zIndex: 9999, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: '#050508',
        }}>

            {/* Background Image Layer */}
            {currentStep.stateTags?.background && (
                <div
                    style={{
                        position: 'absolute', inset: 0, zIndex: -2,
                        backgroundImage: `url(/backgrounds/${currentStep.stateTags.background})`,
                        backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.6
                    }}
                />
            )}

            {/* NPC Sprite Layer */}
            {currentStep.stateTags?.npc && (
                <div
                    style={{
                        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: -1,
                    }}
                >
                    <img
                        src={`/sprites/${currentStep.stateTags.npc}.png`}
                        alt="NPC"
                        style={{ height: '75vh', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))' }}
                        className="pixelated"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
            )}

            {/* Reward Toast Notification */}
            {currentStep.stateTags?.reward && (
                <div style={{
                    position: 'absolute', top: 40, right: 40, background: '#1a1a2e', border: '2px solid #00ff00',
                    padding: '15px 25px', color: '#00ff00', fontFamily: 'monospace', fontSize: 16,
                    boxShadow: '0 0 20px rgba(0,255,0,0.2)', zIndex: 50
                }}>
                    ITEM ACQUIRED: {currentStep.stateTags.reward.toUpperCase().replace(/_/g, ' ')}
                </div>
            )}

            {/* Scene Title Bar */}
            <div style={{
                position: 'absolute', top: 20, left: 30, color: '#555', fontFamily: baseFont, fontSize: 11,
            }}>
                {selectedScene.location}
            </div>

            {/* Visual Novel Text Box */}
            <div style={{
                position: 'absolute', bottom: 40, width: '90%', maxWidth: 1000,
                padding: 30, border: '2px solid #c9a84c', background: 'rgba(10, 10, 15, 0.95)', color: '#eaeaea',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)', borderRadius: 4
            }}>
                <div style={{ marginBottom: 20 }}>
                    {currentStep.lines.map((line, idx) => (
                        <p key={idx} style={{ fontSize: 20, lineHeight: 1.6, marginBottom: 15, fontFamily: serifFont }}>{line}</p>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {currentStep.choices.map((choice, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleChoice(idx)}
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: '#c9a84c',
                                padding: '12px 20px', cursor: 'pointer', textAlign: 'left', fontSize: 16, fontFamily: 'monospace',
                                transition: 'all 0.2s ease', minHeight: 44,
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = '#c9a84c'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = '#444'; }}
                        >
                            {choice}
                        </button>
                    ))}
                </div>

                {currentStep.isEnd && (
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <p style={{ color: '#88dd88', fontFamily: 'monospace', margin: 0 }}>[ SCENE COMPLETE ]</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={handleBack} style={{
                                background: 'none', border: '1px solid #444', color: '#888',
                                padding: '10px 20px', cursor: 'pointer', fontFamily: 'monospace', minHeight: 44,
                            }}>MORE SCENES</button>
                            <button onClick={onClose} style={{
                                background: '#c9a84c', color: '#000', border: 'none',
                                padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace', minHeight: 44,
                            }}>RETURN</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
