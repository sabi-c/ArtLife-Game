/**
 * EmailDialogueOverlay.jsx — Artnet-styled email exchange overlay
 *
 * Renders deal negotiation events as an email conversation between the
 * player and an NPC. Features typewriter text reveal, send animation,
 * inline markdown (**bold**), and {{playerName}} template replacement.
 *
 * Data model: Events with `isEmail: true` have steps of type 'email'
 * (incoming messages) and 'choice' (player response selection).
 * Choices can trigger NPC responses via `npcResponse` field.
 *
 * @see src/data/events/deals.js for example email events
 * @see BloombergTerminal.jsx for integration routing
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameState } from '../managers/GameState.js';

/**
 * Render email body text with {{playerName}} interpolation and **bold** markdown.
 * Price values in bold render with accent color via .an-email-highlight class.
 */
function renderEmailBody(text) {
    const playerName = GameState.state?.playerName || 'The Dealer';
    const processed = text.replace(/\{\{playerName\}\}/g, playerName);

    return processed.split('\n').map((line, i) => {
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
 * direction: 'incoming' | 'outgoing'
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

/**
 * Phases of the email dialogue:
 * - reading: Incoming email typewriters in the right panel
 * - choosing: Choice buttons appear below the email
 * - sending: Player draft slides into thread + envelope animation
 * - waiting: Pulsing dots while NPC "responds"
 * - receiving: NPC response typewriters in right panel
 * - complete: Done — fire onComplete with effects
 */
export default function EmailDialogueOverlay({ event, onComplete }) {
    const [stepIndex, setStepIndex] = useState(0);
    const [phase, setPhase] = useState('reading'); // reading | choosing | sending | waiting | receiving | complete
    const [displayedText, setDisplayedText] = useState('');
    const [thread, setThread] = useState([]); // Thread history for left panel
    const [currentEmail, setCurrentEmail] = useState(null);
    const [selectedChoice, setSelectedChoice] = useState(null);
    const [outcomeText, setOutcomeText] = useState(null);
    const threadRef = useRef(null);

    const steps = event?.steps || [];
    const step = steps[stepIndex];
    const subject = event?.emailSubject || event?.title || 'No Subject';

    // Generate fake timestamps from step index
    const getTime = (idx) => {
        const baseHour = 10;
        const min = (idx * 13 + 7) % 60; // pseudo-random minutes
        const hour = baseHour + Math.floor(idx / 3);
        return `${hour}:${min.toString().padStart(2, '0')} AM`;
    };

    // Typewriter effect for current email body
    useEffect(() => {
        if (phase !== 'reading' && phase !== 'receiving') return;
        if (!currentEmail) return;

        const text = currentEmail.body || '';
        let i = 0;
        setDisplayedText('');

        const interval = setInterval(() => {
            i++;
            setDisplayedText(text.slice(0, i));
            if (i >= text.length) {
                clearInterval(interval);
                // After typing completes, transition to next phase
                if (phase === 'reading') {
                    // Check if next step is a choice
                    const nextStep = steps[stepIndex + 1];
                    if (nextStep?.type === 'choice') {
                        setStepIndex(s => s + 1);
                        setPhase('choosing');
                    } else if (stepIndex >= steps.length - 1) {
                        setPhase('complete');
                    } else {
                        setStepIndex(s => s + 1);
                    }
                } else if (phase === 'receiving') {
                    // NPC response done — check for more steps or complete
                    const nextIdx = stepIndex + 1;
                    if (nextIdx < steps.length) {
                        setStepIndex(nextIdx);
                    } else {
                        setPhase('complete');
                    }
                }
            }
        }, 18); // ~55 chars/sec

        return () => clearInterval(interval);
    }, [phase, currentEmail]);

    // Process current step
    useEffect(() => {
        if (!step) return;

        if (step.type === 'email' && step.direction === 'incoming') {
            setCurrentEmail(step);
            setPhase('reading');
        }
    }, [stepIndex]);

    // Initialize first step
    useEffect(() => {
        if (steps.length > 0 && steps[0].type === 'email') {
            setCurrentEmail(steps[0]);
            setPhase('reading');
        }
    }, []);

    // Scroll thread to bottom when updated
    useEffect(() => {
        if (threadRef.current) {
            threadRef.current.scrollTop = threadRef.current.scrollHeight;
        }
    }, [thread]);

    // Skip typewriter on click
    const handleSkipTyping = () => {
        if ((phase === 'reading' || phase === 'receiving') && currentEmail) {
            setDisplayedText(currentEmail.body || '');
        }
    };

    // Handle player choice selection
    const handleChoice = (choice, idx) => {
        setSelectedChoice(idx);

        // Apply effects
        if (choice.effects) {
            try { GameState.applyEffects(choice.effects); }
            catch (e) { console.warn('[EmailDialogue] Effect error:', e); }
        }

        // Add incoming email to thread history
        if (currentEmail) {
            setThread(t => [...t, {
                fromName: currentEmail.fromName || currentEmail.from,
                body: currentEmail.body,
                direction: 'incoming',
                time: getTime(thread.length),
            }]);
        }

        // Add player reply to thread
        if (choice.emailBody) {
            setThread(t => [...t, {
                fromName: 'You',
                body: choice.emailBody,
                direction: 'outgoing',
                time: getTime(thread.length + 1),
            }]);
        }

        // Enter sending phase
        setPhase('sending');

        // After send animation, check for NPC response
        setTimeout(() => {
            if (choice.npcResponse) {
                setPhase('waiting');
                // Pulsing dots for 1.5s, then show NPC response
                setTimeout(() => {
                    setCurrentEmail(choice.npcResponse);
                    setDisplayedText('');
                    setPhase('receiving');
                }, 1500);
            } else if (choice.outcome) {
                setOutcomeText(choice.outcome);
                setPhase('complete');
            } else {
                setPhase('complete');
            }
        }, 600); // Match envelope-fly animation duration
    };

    // Close overlay
    const handleClose = () => {
        onComplete?.({ choiceIndex: selectedChoice });
    };

    return (
        <div className="an-email-overlay">
            <div className="an-email-modal">
                {/* Header bar */}
                <div className="an-email-header">
                    <span className="an-email-header-title">INBOX — {subject}</span>
                    <button className="an-email-close" onClick={handleClose}>✕ CLOSE</button>
                </div>

                {/* Split layout: thread | current email */}
                <div className="an-email-split">
                    {/* Left: Thread history */}
                    <div className="an-email-thread" ref={threadRef}>
                        <div className="an-email-thread-title">THREAD</div>
                        {thread.length === 0 && (
                            <div className="an-email-thread-empty">No previous messages</div>
                        )}
                        {thread.map((msg, i) => (
                            <ThreadMessage key={i} {...msg} />
                        ))}
                        {/* Envelope fly animation during sending */}
                        {phase === 'sending' && (
                            <div className="an-email-envelope-fly">
                                <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
                                    <rect x="0.5" y="0.5" width="23" height="17" rx="2" stroke="var(--an-accent)" />
                                    <path d="M0.5 0.5L12 10L23.5 0.5" stroke="var(--an-accent)" strokeWidth="1" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Right: Current email */}
                    <div className="an-email-current" onClick={handleSkipTyping}>
                        {/* Sender info */}
                        {currentEmail && (
                            <div className="an-email-sender">
                                <div className="an-email-sender-name">
                                    From: {currentEmail.fromName || currentEmail.from}
                                </div>
                                <div className="an-email-sender-subject">Re: {subject}</div>
                            </div>
                        )}

                        {/* Email body with typewriter */}
                        {(phase === 'reading' || phase === 'receiving') && (
                            <div className="an-email-body">
                                {renderEmailBody(displayedText)}
                                {displayedText.length < (currentEmail?.body?.length || 0) && (
                                    <span className="an-email-cursor">▌</span>
                                )}
                            </div>
                        )}

                        {/* Choosing phase — show full email + choice buttons */}
                        {phase === 'choosing' && step?.type === 'choice' && (
                            <>
                                <div className="an-email-body">
                                    {currentEmail && renderEmailBody(currentEmail.body)}
                                </div>
                                <div className="an-email-actions">
                                    {step.choices.map((choice, i) => (
                                        <button
                                            key={i}
                                            className="an-email-action-btn"
                                            onClick={() => handleChoice(choice, i)}
                                            disabled={selectedChoice !== null}
                                        >
                                            {choice.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Waiting phase — pulsing dots */}
                        {phase === 'waiting' && (
                            <div className="an-email-body">
                                <div className="an-email-waiting">
                                    <span className="an-email-dots">...</span>
                                </div>
                            </div>
                        )}

                        {/* Sending phase — brief "sent" message */}
                        {phase === 'sending' && (
                            <div className="an-email-body">
                                <div className="an-email-sent-msg">Message sent</div>
                            </div>
                        )}

                        {/* Complete phase — outcome + close */}
                        {phase === 'complete' && (
                            <div className="an-email-body">
                                {currentEmail && phase === 'complete' && displayedText && renderEmailBody(displayedText)}
                                {outcomeText && (
                                    <div className="an-email-outcome">{outcomeText}</div>
                                )}
                                <button className="an-email-done-btn" onClick={handleClose}>
                                    Close Inbox
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
