/**
 * EmailThread.jsx — Left panel: clickable message thread + haggle status
 *
 * Shows scrollable message cards with direction indicators (accent for outgoing,
 * muted for incoming). In haggle mode, displays a status bar with ASK / OFFER /
 * PATIENCE / ROUND at top. Auto-scrolls to bottom on new messages.
 *
 * @see EmailOverlay.jsx for parent integration
 * @see useEmailState.js for thread data shape
 */

import React, { useEffect, useRef } from 'react';

/**
 * @param {Object} props
 * @param {Array} props.thread - Array of { id, fromName, body, direction, time }
 * @param {string} props.selectedMessageId - Currently selected message ID
 * @param {Function} props.onSelectMessage - Callback when message is clicked
 * @param {Object|null} props.haggleState - HaggleManager state (null for static mode)
 * @param {string} props.phase - Current email phase
 * @param {Function} props.fmtNum - Number formatter
 */
export default function EmailThread({ thread, selectedMessageId, onSelectMessage, haggleState, phase, fmtNum }) {
    const threadRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (threadRef.current) {
            threadRef.current.scrollTop = threadRef.current.scrollHeight;
        }
    }, [thread]);

    return (
        <div className="email-thread" ref={threadRef}>
            {/* Haggle status bar */}
            {haggleState && (
                <div className="email-haggle-status">
                    <div className="email-haggle-row">
                        <span className="email-haggle-label">ASK</span>
                        <span className="email-haggle-value">${fmtNum(haggleState.askingPrice)}</span>
                    </div>
                    <div className="email-haggle-row">
                        <span className="email-haggle-label">YOUR OFFER</span>
                        <span className="email-haggle-value">${fmtNum(haggleState.currentOffer)}</span>
                    </div>
                    <div className="email-haggle-row">
                        <span className="email-haggle-label">PATIENCE</span>
                        <span className={`email-haggle-value${haggleState.patience <= 1 ? ' email-haggle-danger' : ''}`}>
                            {haggleState.patience} / {haggleState.maxPatience}
                        </span>
                    </div>
                    <div className="email-haggle-row">
                        <span className="email-haggle-label">ROUND</span>
                        <span className="email-haggle-value">{haggleState.round} / {haggleState.maxRounds}</span>
                    </div>
                </div>
            )}

            <div className="email-thread-title">
                {haggleState ? 'THREAD' : 'THREAD'}
            </div>

            {thread.length === 0 && (
                <div className="email-thread-empty">No previous messages</div>
            )}

            {thread.map((msg) => {
                const isOut = msg.direction === 'outgoing';
                const isSelected = msg.id === selectedMessageId;
                const preview = msg.body
                    .replace(/\*\*(.+?)\*\*/g, '$1')
                    .replace(/\{\{playerName\}\}/g, 'you')
                    .slice(0, 60);

                return (
                    <div
                        key={msg.id}
                        className={`email-msg email-msg--${isOut ? 'out' : 'in'}${isSelected ? ' email-msg--active' : ''}`}
                        onClick={() => onSelectMessage(msg.id)}
                    >
                        <div className="email-msg-from">{isOut ? 'You' : msg.fromName}</div>
                        {msg.time && <div className="email-msg-time">{msg.time}</div>}
                        <div className="email-msg-preview">"{preview}..."</div>
                    </div>
                );
            })}

            {/* Sending indicator */}
            {phase === 'sending' && (
                <div className="email-sending-indicator">Sending...</div>
            )}
        </div>
    );
}
