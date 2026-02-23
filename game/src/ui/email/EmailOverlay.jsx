/**
 * EmailOverlay.jsx — Top-level unified email overlay shell
 *
 * Routes between static (scripted deal events) and haggle (HaggleManager)
 * modes via the useEmailState hook. Renders a split-panel layout:
 * left = EmailThread (message history + haggle status),
 * right = EmailCompose (current email, typewriter, tactic chips).
 *
 * Replaces both EmailDialogueOverlay.jsx and HaggleEmailOverlay.jsx.
 *
 * @see useEmailState.js for the unified state machine
 * @see BloombergTerminal.jsx for integration routing (~line 4272)
 */

import React from 'react';
import { useEmailState } from './useEmailState.js';
import EmailThread from './EmailThread.jsx';
import EmailCompose from './EmailCompose.jsx';
import './EmailOverlay.css';

/**
 * @param {Object} props
 * @param {'static'|'haggle'} props.mode
 * @param {Object} [props.event] - Static deal event data
 * @param {Object} [props.haggleInfo] - HaggleManager.start() result
 * @param {Function} props.onComplete - Called when overlay closes
 */
export default function EmailOverlay({ mode, event, haggleInfo, onComplete }) {
    const state = useEmailState({ mode, event, haggleInfo, onComplete });

    return (
        <div className="email-overlay">
            <div className="email-modal">
                {/* Header bar */}
                <div className="email-header">
                    <span className="email-header-title">
                        {mode === 'haggle' ? 'NEGOTIATION' : 'INBOX'} — {state.subject}
                    </span>
                    <button className="email-close" onClick={state.handleClose}>
                        CLOSE
                    </button>
                </div>

                {/* Split layout: thread | compose */}
                <div className="email-split">
                    <EmailThread
                        thread={state.thread}
                        selectedMessageId={state.selectedMessageId}
                        onSelectMessage={state.setSelectedMessageId}
                        haggleState={mode === 'haggle' ? state.haggleState : null}
                        phase={state.phase}
                        fmtNum={state.fmtNum}
                    />
                    <EmailCompose
                        {...state}
                    />
                </div>
            </div>
        </div>
    );
}
