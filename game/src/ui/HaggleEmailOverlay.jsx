/**
 * HaggleEmailOverlay.jsx — Artnet-styled email negotiation UI
 *
 * Replaces the old Phaser-based HaggleScene. Wraps HaggleManager's state
 * machine into a purely DOM-based email thread overlay.
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { SettingsManager } from '../managers/SettingsManager.js';

// Format numbers
const fmtNum = (val) => val?.toLocaleString() || '0';

/**
 * Render email body text with **bold** markdown.
 * Price values in bold render with accent color via .an-email-highlight class.
 */
function renderEmailBody(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
        if (line.trim() === '') return <br key={i} />;
        const parts = line.split(/\*\*(.+?)\*\*/g);
        return (
            <p key={i} className="an-email-line">
                {parts.map((part, j) =>
                    j % 2 === 1
                        ? <strong key={j} className="an-email-highlight">{part}</strong>
                        : part
                )}
            </p>
        );
    });
}

/**
 * Individual message bubble in the thread sidebar.
 */
function ThreadMessage({ fromName, body, direction, time }) {
    const isOut = direction === 'outgoing';
    const preview = body.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\{\{playerName\}\}/g, 'you').slice(0, 60);
    return (
        <div className={`an-email-msg an-email-msg--${isOut ? 'out' : 'in'}`}>
            <div className="an-email-msg-from">{isOut ? 'You' : fromName}</div>
            {time && <div className="an-email-msg-time">{time}</div>}
            <div className="an-email-msg-preview">"{preview}..."</div>
        </div>
    );
}

export default function HaggleEmailOverlay({ haggleInfo, onClose }) {
    const [phase, setPhase] = useState('reading'); // reading | choosing | sending | waiting | receiving | complete
    const [displayedText, setDisplayedText] = useState('');
    const [thread, setThread] = useState([]);
    const [currentEmail, setCurrentEmail] = useState(null);
    const [outcomeText, setOutcomeText] = useState(null);
    const [availableTactics, setAvailableTactics] = useState([]);

    // Derived state from HaggleManager
    const [haggleState, setHaggleState] = useState(null);

    const appTheme = SettingsManager.get('appTheme') || 'artnet';
    const themeClass = appTheme === 'retro' ? ' theme-retro' : '';

    const threadRef = useRef(null);
    const typingIntervalRef = useRef(null);

    // Initial load
    useEffect(() => {
        if (!haggleInfo) return;

        // Ensure starting state is pulled
        const st = HaggleManager.getState();
        setHaggleState(st);
        setAvailableTactics(HaggleManager.getAvailableTactics());

        setCurrentEmail({
            fromName: haggleInfo.dealerName,
            body: haggleInfo.openingDialogue,
        });
        setPhase('reading');
    }, [haggleInfo]);

    // Keep state updated
    const updateHaggleState = () => {
        setHaggleState(HaggleManager.getState());
        setAvailableTactics(HaggleManager.getAvailableTactics());
    };

    // Generate fake timestamps
    const getTime = (idx) => {
        const baseHour = 10;
        const min = (idx * 13 + 7) % 60;
        const hour = baseHour + Math.floor(idx / 3);
        return `${hour}:${min.toString().padStart(2, '0')} AM`;
    };

    // Typewriter effect
    useEffect(() => {
        if (phase !== 'reading' && phase !== 'receiving') return;
        if (!currentEmail) return;

        const text = currentEmail.body || '';
        let i = 0;
        setDisplayedText('');

        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

        typingIntervalRef.current = setInterval(() => {
            i += 2; // Speed up typing slightly
            setDisplayedText(text.slice(0, Math.min(i, text.length)));

            if (i >= text.length) {
                clearInterval(typingIntervalRef.current);

                if (phase === 'reading') {
                    setPhase('choosing');
                } else if (phase === 'receiving') {
                    // Check if resolved
                    const st = HaggleManager.getState();
                    if (st?.resolved) {
                        setPhase('complete');
                        const isDeal = st.result === 'deal';
                        setOutcomeText(isDeal ? `Deal closed at $${fmtNum(st.finalPrice)}` : 'Negotiation collapsed.');
                    } else {
                        setPhase('choosing');
                    }
                }
            }
        }, 15);

        return () => clearInterval(typingIntervalRef.current);
    }, [phase, currentEmail]);

    // Scroll thread
    useEffect(() => {
        if (threadRef.current) {
            threadRef.current.scrollTop = threadRef.current.scrollHeight;
        }
    }, [thread]);

    // Skip typewriter
    const handleSkipTyping = () => {
        if ((phase === 'reading' || phase === 'receiving') && currentEmail) {
            if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
            setDisplayedText(currentEmail.body || '');

            // Advance phase immediately
            if (phase === 'reading') setPhase('choosing');
            else if (phase === 'receiving') {
                const st = HaggleManager.getState();
                if (st?.resolved) {
                    setPhase('complete');
                    const isDeal = st.result === 'deal';
                    setOutcomeText(isDeal ? `Deal closed at $${fmtNum(st.finalPrice)}` : 'Negotiation collapsed.');
                } else setPhase('choosing');
            }
        }
    };

    const handleChoice = (tactic) => {
        if (tactic.locked) return;

        // Add NPC's LAST email to thread before player replies
        if (currentEmail) {
            setThread(t => [...t, {
                fromName: currentEmail.fromName,
                body: currentEmail.body,
                direction: 'incoming',
                time: getTime(thread.length),
            }]);
        }

        // Add Player's reply to thread (using tactic label as email body)
        const playerReplyText = `Let's discuss this further. I'd like to ${tactic.label.toLowerCase()}.`;
        setThread(t => [...t, {
            fromName: 'You',
            body: playerReplyText,
            direction: 'outgoing',
            time: getTime(thread.length + 1),
        }]);

        setPhase('sending');

        // Execute tactic
        const roundResult = HaggleManager.executeTactic(tactic.id);
        updateHaggleState();

        setTimeout(() => {
            setPhase('waiting');
            setTimeout(() => {
                // Determine what email to show next
                let nextBody = roundResult.dialogue;

                // If resolved, append final dialogue
                if (roundResult.dealReached || roundResult.dealFailed) {
                    nextBody += `\n\n${roundResult.finalDialogue}`;
                }

                setCurrentEmail({
                    fromName: haggleInfo.dealerName,
                    body: nextBody,
                });
                setDisplayedText('');
                setPhase('receiving');
            }, 1200);
        }, 600);
    };

    const handleClose = () => {
        const st = HaggleManager.getState();
        if (st && st.resolved && st.result === 'deal') {
            HaggleManager.applyResult(); // Write the deal to GameState and clear HaggleManager
        } else if (st && st.resolved) {
            // Walkaway logic
            HaggleManager.applyResult();
        } else {
            // Aborted mid-deal?
            // Optionally apply a penalty or just clear it. Let's just clear.
            HaggleManager.active = null;
        }

        GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Negotiation ended.');
        onClose?.(); // Close the overlay
    };

    const subject = `Re: Inquiry ${haggleInfo?.work?.title || 'Artwork'}`;

    return (
        <div className={`an-email-overlay${themeClass}`}>
            <div className="an-email-modal">
                <div className="an-email-header">
                    <span className="an-email-header-title">HAGGLE — {subject}</span>
                    {phase === 'complete' && <button className="an-email-close" onClick={handleClose}>✕ CLOSE</button>}
                </div>

                <div className="an-email-split">
                    {/* Left Panel: Thread & Status */}
                    <div className="an-email-thread" ref={threadRef}>
                        {haggleState && (
                            <div style={{ padding: '0 15px', marginBottom: '10px', fontSize: '11px', borderBottom: '1px solid var(--an-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--an-text-muted)' }}>ASK:</span>
                                    <span style={{ fontWeight: 'bold' }}>${fmtNum(haggleState.askingPrice)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--an-text-muted)' }}>YOUR OFFER:</span>
                                    <span>${fmtNum(haggleState.currentOffer)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: 'var(--an-text-muted)' }}>PATIENCE:</span>
                                    <span style={{ color: haggleState.patience <= 1 ? 'var(--an-accent)' : 'inherit' }}>
                                        {haggleState.patience} / {haggleState.maxPatience}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="an-email-thread-title">PREVIOUS MESSAGES</div>
                        {thread.length === 0 && <div className="an-email-thread-empty">Thread started</div>}
                        {thread.map((msg, i) => (
                            <ThreadMessage key={i} {...msg} />
                        ))}

                        {phase === 'sending' && (
                            <div className="an-email-envelope-fly">
                                <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
                                    <rect x="0.5" y="0.5" width="23" height="17" rx="2" stroke="var(--an-accent)" />
                                    <path d="M0.5 0.5L12 10L23.5 0.5" stroke="var(--an-accent)" strokeWidth="1" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Current Email / Choices */}
                    <div className="an-email-current">
                        {currentEmail && (
                            <div className="an-email-sender" onClick={handleSkipTyping} style={{ cursor: phase === 'reading' || phase === 'receiving' ? 'pointer' : 'default' }}>
                                <div className="an-email-sender-name">
                                    From: {currentEmail.fromName}
                                </div>
                                <div className="an-email-sender-subject">{subject}</div>
                            </div>
                        )}

                        {(phase === 'reading' || phase === 'receiving') && (
                            <div className="an-email-body" onClick={handleSkipTyping} style={{ cursor: 'pointer', flex: 1 }}>
                                {renderEmailBody(displayedText)}
                                {displayedText.length < (currentEmail?.body?.length || 0) && (
                                    <span className="an-email-cursor">▌</span>
                                )}
                            </div>
                        )}

                        {phase === 'waiting' && (
                            <div className="an-email-body">
                                <div className="an-email-waiting">
                                    <span className="an-email-dots">...</span>
                                </div>
                            </div>
                        )}

                        {phase === 'sending' && (
                            <div className="an-email-body">
                                <div className="an-email-sent-msg">Message sent</div>
                            </div>
                        )}

                        {phase === 'complete' && (
                            <div className="an-email-body">
                                {currentEmail && displayedText && renderEmailBody(displayedText)}
                                {outcomeText && (
                                    <div className="an-email-outcome" style={{ marginTop: '20px', padding: '15px', background: 'rgba(204,0,0,0.05)', border: '1px solid var(--an-border)' }}>
                                        <strong>{outcomeText}</strong>
                                    </div>
                                )}
                                <button className="an-email-done-btn" onClick={handleClose} style={{ marginTop: '20px' }}>
                                    Close Pipeline
                                </button>
                            </div>
                        )}

                        {phase === 'choosing' && (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div className="an-email-body" style={{ flex: 1, paddingBottom: '20px' }}>
                                    {currentEmail && renderEmailBody(currentEmail.body)}
                                </div>
                                <div className="an-email-actions" style={{ borderTop: '1px solid var(--an-border)', paddingTop: '15px' }}>
                                    <div style={{ paddingBottom: '10px', fontSize: '11px', color: 'var(--an-text-muted)' }}>RESPOND WITH TACTIC:</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {availableTactics.map((tactic, i) => (
                                            <button
                                                key={i}
                                                className="an-email-action-btn"
                                                onClick={() => handleChoice(tactic)}
                                                disabled={tactic.locked}
                                                style={{ textAlign: 'left', opacity: tactic.locked ? 0.5 : 1 }}
                                            >
                                                <strong>{tactic.label}</strong>
                                                <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
                                                    {tactic.desc}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
