/**
 * HaggleStatusBar.jsx — Compact sticky status bar for haggle negotiations
 *
 * Displays ASK / OFFER / PATIENCE / ROUND in a horizontal strip at the
 * top of the conversation. Uses monospace font and letter-spaced labels
 * for the tear-sheet-dark aesthetic.
 *
 * @see useEmailState.js for haggleState data shape
 */

import React from 'react';

/** Format currency values */
const fmtNum = (val) => val?.toLocaleString() || '0';

/**
 * @param {Object} props
 * @param {Object} props.haggleState - HaggleManager state snapshot
 */
export default function HaggleStatusBar({ haggleState }) {
    if (!haggleState) return null;

    return (
        <div className="email-status-bar">
            <div className="email-status-item">
                <span className="email-status-label">ASK</span>
                <span className="email-status-value">${fmtNum(haggleState.askingPrice)}</span>
            </div>
            <div className="email-status-item">
                <span className="email-status-label">OFFER</span>
                <span className="email-status-value">${fmtNum(haggleState.currentOffer)}</span>
            </div>
            <div className="email-status-item">
                <span className="email-status-label">PATIENCE</span>
                <span className={`email-status-value${haggleState.patience <= 1 ? ' email-status-danger' : ''}`}>
                    {haggleState.patience}/{haggleState.maxPatience}
                </span>
            </div>
            <div className="email-status-item">
                <span className="email-status-label">ROUND</span>
                <span className="email-status-value">{haggleState.round}/{haggleState.maxRounds}</span>
            </div>
        </div>
    );
}
