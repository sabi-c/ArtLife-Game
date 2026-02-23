/**
 * ChatBubble.jsx — Single message bubble for conversation layout
 *
 * Renders an incoming (left-aligned, border-left) or outgoing (right-aligned,
 * border-right gold) message with optional typewriter cursor. Supports bold
 * markdown via **text** syntax.
 *
 * @see EmailOverlay.jsx for parent integration
 */

import React from 'react';

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

/**
 * @param {Object} props
 * @param {'incoming'|'outgoing'} props.direction
 * @param {string} props.fromName - Sender display name
 * @param {string} props.body - Full or partial (typewriter) message text
 * @param {string} [props.time] - Timestamp string
 * @param {boolean} [props.isTyping] - Show blinking cursor
 */
export default function ChatBubble({ direction, fromName, body, time, isTyping }) {
    const isOut = direction === 'outgoing';

    return (
        <div className={`email-bubble email-bubble--${isOut ? 'out' : 'in'}`}>
            <div className="email-bubble-meta">
                <span className="email-bubble-from">{fromName}</span>
                {time && <span className="email-bubble-time">{time}</span>}
            </div>
            <div className="email-bubble-body">
                {renderBody(body)}
                {isTyping && <span className="email-cursor">|</span>}
            </div>
        </div>
    );
}
