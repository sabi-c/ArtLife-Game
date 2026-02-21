import React, { useState, useEffect, useRef } from 'react';
import { SceneEngine } from '../engines/SceneEngine';
import boomRoomJson from '../data/scenes/boom_room.json';

export default function ScenePlayer({ onClose }) {
    const [scene, setScene] = useState(null);
    const [currentStep, setCurrentStep] = useState(null);
    const textRef = useRef(null);

    useEffect(() => {
        // Init the scene engine with our test story
        const engine = new SceneEngine(boomRoomJson);
        setScene(engine);

        // Run the first tick
        const step = engine.continue();
        setCurrentStep(step);

        return () => engine.destroy();
    }, []);

    if (!scene || !currentStep) return null;

    if (currentStep.error) {
        return (
            <div className="pd-overlay visible">
                <div className="pd-container" style={{ color: 'red', padding: 40 }}>
                    <h2>Scene Error</h2>
                    <p>{currentStep.message}</p>
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
        );
    }

    const handleChoice = (index) => {
        const nextStep = scene.choose(index);
        setCurrentStep(nextStep);
    };

    return (
        <div className="pd-overlay visible" style={{ zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050508' }}>

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
                        onError={(e) => e.target.style.display = 'none'} // Hide if sprite doesn't exist yet
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
                    ★ ITEM ACQUIRED: {currentStep.stateTags.reward.toUpperCase().replace(/_/g, ' ')}
                </div>
            )}

            {/* Visual Novel Text Box */}
            <div style={{
                position: 'absolute', bottom: 40, width: '90%', maxWidth: 1000,
                padding: 30, border: '2px solid #c9a84c', background: 'rgba(10, 10, 15, 0.95)', color: '#eaeaea',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)', borderRadius: 4
            }}>
                <div style={{ marginBottom: 20 }}>
                    {currentStep.lines.map((line, idx) => (
                        <p key={idx} style={{ fontSize: 20, lineHeight: 1.6, marginBottom: 15, fontFamily: '"Playfair Display", serif' }}>{line}</p>
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
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = '#c9a84c'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = '#444'; }}
                        >
                            ➤ {choice}
                        </button>
                    ))}
                </div>

                {currentStep.isEnd && (
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ color: '#88dd88', fontFamily: 'monospace' }}>[ SCENE COMPLETE ]</p>
                        <button onClick={onClose} style={{
                            background: '#c9a84c', color: '#000', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace'
                        }}>RETURN TO DASHBOARD</button>
                    </div>
                )}
            </div>
        </div>
    );
}
