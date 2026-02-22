import React, { useEffect, useState } from 'react';
import { useUIStore } from '../stores/uiStore.js';

/**
 * DialogueBox — React overlay for MacDialogueScene.
 *
 * Pokemon-style dialogue with dual portraits, typewriter text,
 * speaker name labels, and space-to-advance.
 *
 * Uses inline styles (no Tailwind dependency).
 */
export default function DialogueBox() {
    const [dialog, setDialog] = useState(() => useUIStore.getState().dialog);

    useEffect(() => {
        const unsub = useUIStore.subscribe((state) => setDialog(state.dialog));
        return unsub;
    }, []);

    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const currentStep = dialog.steps?.[dialog.currentStepIndex];

    // Typewriter effect
    useEffect(() => {
        if (!currentStep) return;
        setDisplayedText('');
        setIsTyping(true);

        const fullText = currentStep.text || '';
        let i = 0;
        const interval = setInterval(() => {
            setDisplayedText(fullText.slice(0, i + 1));
            i++;
            if (i >= fullText.length) {
                setIsTyping(false);
                clearInterval(interval);
            }
        }, 25);

        return () => clearInterval(interval);
    }, [currentStep]);

    // Keyboard: Space/Enter to advance or skip typewriter
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                if (isTyping) {
                    setIsTyping(false);
                    setDisplayedText(currentStep.text);
                } else {
                    useUIStore.getState().advanceDialogue();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isTyping, currentStep]);

    // Click/tap to advance
    const handleClick = (e) => {
        // Prevent click if hovering/clicking a choice button
        if (e.target.closest('.dlg-choice-btn')) return;

        if (isTyping) {
            setIsTyping(false);
            setDisplayedText(currentStep.text);
        } else if (!dialog.choices || dialog.choices.length === 0) {
            useUIStore.getState().advanceDialogue();
        }
    };

    const handleChoiceClick = (choice) => {
        if (choice.action) {
            choice.action();
        }
    };

    const isLeft = currentStep?.speakerSide === 'left';

    if (!dialog.isOpen) return null;

    return (
        <div style={styles.overlay} onClick={handleClick}>
            {/* Dark backdrop */}
            <div style={styles.backdrop} />

            {/* Bottom dialogue area */}
            <div style={styles.dialogueArea}>
                {/* Left Portrait */}
                <div style={{
                    ...styles.portraitSlot,
                    opacity: isLeft ? 1 : 0.3,
                    transform: isLeft ? 'scale(1)' : 'scale(0.9)',
                }}>
                    {dialog.leftSprite && (
                        <img
                            src={`sprites/${dialog.leftSprite}`}
                            alt="Player"
                            style={styles.portraitImg}
                        />
                    )}
                </div>

                {/* Text Box */}
                <div style={styles.textBox}>
                    {/* Speaker Name Tag */}
                    <div style={{
                        ...styles.nameTag,
                        left: isLeft ? 16 : 'auto',
                        right: isLeft ? 'auto' : 16,
                    }}>
                        {currentStep?.name || '???'}
                    </div>

                    {/* Dialogue Text */}
                    <div style={styles.textContent}>
                        {displayedText}
                        {isTyping && <span style={styles.cursor}>_</span>}
                    </div>

                    {/* Choices (if any) */}
                    {!isTyping && dialog.choices && dialog.choices.length > 0 && (
                        <div style={styles.choicesContainer}>
                            {dialog.choices.map((choice, idx) => (
                                <button
                                    key={idx}
                                    className="dlg-choice-btn"
                                    style={{
                                        ...styles.choiceBtn,
                                        borderColor: choice.isBlue ? '#88bbdd' : '#555'
                                    }}
                                    onClick={() => handleChoiceClick(choice)}
                                    onMouseOver={(e) => {
                                        e.target.style.borderColor = choice.isBlue ? '#aaddff' : '#c9a84c';
                                        e.target.style.color = choice.isBlue ? '#aaddff' : '#c9a84c';
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.borderColor = choice.isBlue ? '#88bbdd' : '#555';
                                        e.target.style.color = '#fff';
                                    }}
                                >
                                    {choice.isBlue && '🔵 '}{choice.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Advance indicator */}
                    {!isTyping && (!dialog.choices || dialog.choices.length === 0) && (
                        <div style={styles.advanceIndicator}>▼</div>
                    )}
                </div>

                {/* Right Portrait */}
                <div style={{
                    ...styles.portraitSlot,
                    opacity: !isLeft ? 1 : 0.3,
                    transform: !isLeft ? 'scale(1)' : 'scale(0.9)',
                }}>
                    {dialog.rightSprite && (
                        <img
                            src={`sprites/${dialog.rightSprite}`}
                            alt="NPC"
                            style={styles.portraitImg}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '24px',
        zIndex: 50,
        pointerEvents: 'auto',
        cursor: 'pointer',
    },
    backdrop: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        pointerEvents: 'none',
    },
    dialogueArea: {
        position: 'relative',
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-end',
    },
    portraitSlot: {
        width: 120,
        height: 120,
        flexShrink: 0,
        background: '#0a0a14',
        border: '3px solid #fff',
        borderRadius: 6,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.3s, transform 0.3s',
    },
    portraitImg: {
        height: '100%',
        objectFit: 'contain',
        imageRendering: 'pixelated',
    },
    textBox: {
        flex: 1,
        position: 'relative',
        background: '#0a0a14',
        border: '4px solid #fff',
        borderRadius: 8,
        padding: '28px 20px 20px 20px',
        boxShadow: '6px 6px 0 0 rgba(255,255,255,0.15)',
        minHeight: 100,
    },
    nameTag: {
        position: 'absolute',
        top: -14,
        background: '#fff',
        color: '#0a0a14',
        padding: '2px 12px',
        fontFamily: '"Chicago", "Courier New", monospace',
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 1,
        border: '2px solid #0a0a14',
    },
    textContent: {
        fontFamily: '"Chicago", "Courier New", monospace',
        fontSize: 17,
        color: '#fff',
        lineHeight: 1.6,
        minHeight: 60,
    },
    cursor: {
        animation: 'dlg-blink 0.8s infinite',
        color: '#c9a84c',
    },
    advanceIndicator: {
        position: 'absolute',
        bottom: 8,
        right: 12,
        color: '#fff',
        fontSize: 14,
        animation: 'dlg-bounce 1s infinite',
    },
    choicesContainer: {
        marginTop: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    choiceBtn: {
        background: '#1a1a2e',
        color: '#fff',
        border: '2px solid #555',
        padding: '10px 16px',
        textAlign: 'left',
        fontFamily: '"Chicago", "Courier New", monospace',
        fontSize: 15,
        cursor: 'pointer',
        transition: 'all 0.2s',
    }
};
