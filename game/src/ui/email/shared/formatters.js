/**
 * formatters.js — Shared text rendering and formatting utilities
 *
 * Used by inbox, haggle, and chat systems for consistent
 * text rendering with markdown bold, line breaks, and currency formatting.
 */

import React from 'react';

/**
 * Render text with **bold** markdown and line breaks as React elements.
 * Used by ChatBubble (haggle) and could be used by inbox previews.
 *
 * @param {string} text - Raw text with optional **bold** markers
 * @returns {React.ReactNode[]} Array of <p> elements
 */
export function renderMarkdownBody(text) {
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
 * Format a number as currency (e.g., 195000 → "195,000").
 * @param {number} val
 * @returns {string}
 */
export function fmtCurrency(val) {
    return val?.toLocaleString() || '0';
}

/**
 * Strip leading emoji from a string label.
 * @param {string} str
 * @returns {string}
 */
export function stripEmoji(str) {
    return str?.replace(/^[\p{Emoji}\s]+/u, '').trim() || str;
}
