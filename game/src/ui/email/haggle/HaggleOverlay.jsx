/**
 * HaggleOverlay.jsx — Single-column conversational email overlay
 *
 * Renders a centered modal with a scrollable chat conversation.
 * Messages appear as left/right-aligned bubbles. An AI agent guides
 * the player through reply options in haggle mode. Uses tear-sheet-dark
 * hybrid styling for a minimal gallery aesthetic.
 *
 * Replaces the previous split-panel layout (EmailThread + EmailCompose).
 *
 * @see useEmailState.js for the unified state machine
 * @see AgentGuide.jsx for the AI agent tactic selection UI
 * @see BloombergTerminal.jsx for integration routing (~line 4272)
 */

import React, { useEffect, useRef } from 'react';
import { useEmailState } from './useHaggleState.js';
import ChatBubble from './ChatBubble.jsx';
import AgentGuide from './AgentGuide.jsx';
import HaggleStatusBar from './HaggleStatusBar.jsx';
import './haggle.css';

/**
 * @param {Object} props
 * @param {'static'|'haggle'} props.mode
 * @param {Object} [props.event] - Static deal event data
 * @param {Object} [props.haggleInfo] - HaggleManager.start() result
 * @param {Function} props.onComplete - Called when overlay closes
 */
export default function HaggleOverlay({ mode, event, haggleInfo, onComplete }) {
    const state = useEmailState({ mode, event, haggleInfo, onComplete });
    const conversationRef = useRef(null);

    // Auto-scroll to bottom when thread updates or phase changes
    useEffect(() => {
        if (conversationRef.current) {
            conversationRef.current.scrollTo({
                top: conversationRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [state.thread, state.phase, state.displayedText, state.agentDisplayed, state.composeDisplayed]);

    const isEmailTyping = (state.phase === 'reading' || state.phase === 'receiving')
        && state.displayedText.length < (state.currentEmail?.body ? state.interpolate(state.currentEmail.body).length : 0);

    return (
        <div className="email-overlay">
            <div className="email-modal">
                {/* Header bar */}
                <div className="email-header">
                    <span className="email-header-title">
                        {mode === 'haggle' ? 'Negotiation' : 'Inbox'} — {state.subject}
                    </span>
                    <button className="email-close" onClick={state.handleClose}>
                        Close
                    </button>
                </div>

                {/* Haggle status bar */}
                {mode === 'haggle' && <HaggleStatusBar haggleState={state.haggleState} />}

                {/* Conversation column */}
                <div className="email-conversation" ref={conversationRef}>
                    {/* Thread history */}
                    {state.thread.map((msg) => (
                        <ChatBubble
                            key={msg.id}
                            direction={msg.direction}
                            fromName={msg.fromName}
                            body={msg.body}
                            time={msg.time}
                        />
                    ))}

                    {/* Current email being typed (reading / receiving) */}
                    {(state.phase === 'reading' || state.phase === 'receiving') && state.currentEmail && (
                        <div
                            className="email-bubble email-bubble--in email-bubble--active"
                            onClick={isEmailTyping ? state.skipTypewriter : undefined}
                            style={{ cursor: isEmailTyping ? 'pointer' : 'default' }}
                        >
                            <div className="email-bubble-meta">
                                <span className="email-bubble-from">
                                    {state.currentEmail.fromName || state.currentEmail.from}
                                </span>
                            </div>
                            <div className="email-bubble-body">
                                {renderBody(state.displayedText)}
                                {isEmailTyping && <span className="email-cursor">|</span>}
                            </div>
                        </div>
                    )}

                    {/* Composing reply typewriter */}
                    {state.phase === 'composingReply' && (
                        <div
                            className="email-bubble email-bubble--out email-bubble--active"
                            onClick={state.skipComposeTypewriter}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="email-bubble-meta">
                                <span className="email-bubble-from">You</span>
                            </div>
                            <div className="email-bubble-body">
                                {renderBody(state.composeDisplayed)}
                                <span className="email-cursor">|</span>
                            </div>
                        </div>
                    )}

                    {/* Sending indicator */}
                    {state.phase === 'sending' && (
                        <div className="email-sending-indicator">Sent</div>
                    )}

                    {/* Waiting indicator */}
                    {state.phase === 'waiting' && (
                        <div className="email-typing-indicator">
                            <div className="email-typing-dots">
                                <span /><span /><span />
                            </div>
                        </div>
                    )}

                    {/* AI Agent guide section */}
                    <AgentGuide {...state} />

                    {/* Complete phase */}
                    {state.phase === 'complete' && (
                        <div className="email-complete">
                            {state.outcomeText && (
                                <div className="email-outcome">
                                    <strong>{state.outcomeText}</strong>
                                </div>
                            )}
                            <button className="email-done-btn" onClick={state.handleClose}>
                                Close Inbox
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Render text with **bold** markdown and line breaks */
function renderBody(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
        if (line.trim() === '') return <br key={i} />;
        const parts = line.split(/\*\*(.+?)\*\*/g);
        return (
            <p key={i} className="email-bubble-line">
                {parts.map((part, j) =>
                    j % 2 === 1
                        ? <strong key={j} className="email-highlight">{part}</strong>
                        : part
                )}
            </p>
        );
    });
}
