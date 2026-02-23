/**
 * EmailDesignGuide.jsx — Living design guide for all email UI components
 *
 * Storybook-lite overlay that renders every email component in isolation
 * with mock data. Accessible via F3 hotkey. Each section shows a labeled
 * card with components in various states.
 *
 * @see EmailOverlay.jsx for the actual email overlay
 * @see EmailOverlay.css for all email component styles
 */

import React, { useEffect } from 'react';
import ChatBubble from './ChatBubble.jsx';
import HaggleStatusBar from './HaggleStatusBar.jsx';
import './EmailOverlay.css';
import './EmailDesignGuide.css';

// ════════════════════════════════════════════════════════════
// Mock Data
// ════════════════════════════════════════════════════════════

const MOCK_HAGGLE_STATE = {
    dealerName: 'Margaux Bellamy',
    dealerType: 'patron',
    askingPrice: 285000,
    currentOffer: 195000,
    gap: 90000,
    patience: 3,
    maxPatience: 5,
    round: 2,
    maxRounds: 6,
};

const MOCK_HAGGLE_STATE_DANGER = {
    ...MOCK_HAGGLE_STATE,
    patience: 1,
    round: 5,
    currentOffer: 260000,
    gap: 25000,
};

const MOCK_THREAD = [
    { id: 'demo-1', fromName: 'Margaux Bellamy', body: 'Thank you for your interest in the Richter. This particular piece has significant provenance — it was shown at **Documenta IX** and has been in private collection since \'94.', direction: 'incoming', time: '10:07 AM' },
    { id: 'demo-2', fromName: 'You', body: 'I appreciate the history. However, comparable works from the same period have moved at a **15-20% discount** to your asking. I\'d like to discuss a more competitive figure.', direction: 'outgoing', time: '10:20 AM' },
    { id: 'demo-3', fromName: 'Margaux Bellamy', body: 'I understand your position. The market data you\'re referencing doesn\'t account for the **exhibition history** of this specific work. I can come down slightly — shall we say **$265,000**?', direction: 'incoming', time: '10:34 AM' },
    { id: 'demo-4', fromName: 'You', body: 'That\'s closer. Let me consider it.', direction: 'outgoing', time: '10:41 AM' },
];

const MOCK_TACTICS = [
    { id: 't1', label: 'Anchor Low', type: 'logical', description: 'Open with a low offer to set the range in your favor.', previewText: 'I was thinking closer to $180,000 based on recent comparables...' },
    { id: 't2', label: 'Emotional Appeal', type: 'emotional', description: 'Connect with the seller on a personal level to build rapport.', previewText: 'This piece really speaks to me — it reminds me of...' },
    { id: 't3', label: 'Walk-Away Bluff', type: 'aggressive', description: 'Threaten to leave the negotiation to apply pressure.', previewText: 'I have other options I\'m considering. Unless you can...' },
    { id: 't4', label: 'Budget Constraint', type: 'financial', description: 'Cite a hard spending limit to constrain the range.', previewText: null, locked: true, lockReason: 'Requires Collector Rep 3' },
];

const MOCK_DIALOGUE_CHOICES = [
    { id: 'd1', line: '"The provenance is compelling, but the condition report gives me pause."' },
    { id: 'd2', line: '"I\'ve been watching this artist\'s market closely — the trend favors patience."' },
    { id: 'd3', line: '"Let\'s find something that works for both of us."' },
];

const TYPE_COLORS = {
    emotional: 'var(--email-type-emotional)',
    logical: 'var(--email-type-logical)',
    aggressive: 'var(--email-type-aggressive)',
    financial: 'var(--email-type-financial)',
};

const DESIGN_TOKENS = [
    { name: 'bg', value: '#0e0e14' },
    { name: 'bg-elevated', value: '#141420' },
    { name: 'bg-bubble-in', value: '#1a1a28' },
    { name: 'bg-bubble-out', value: '#1c1c2a' },
    { name: 'accent', value: '#c9a84c' },
    { name: 'border', value: '#2a2a34' },
    { name: 'fg', value: '#e0e0e0' },
    { name: 'fg-muted', value: '#6a6a7a' },
    { name: 'fg-agent', value: '#9a9ab0' },
    { name: 'type-emotional', value: '#c44' },
    { name: 'type-logical', value: '#4488cc' },
    { name: 'type-aggressive', value: '#cc8833' },
    { name: 'type-financial', value: '#44aa66' },
];

const fmtNum = (val) => val?.toLocaleString() || '0';

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export default function EmailDesignGuide({ onClose }) {
    // Close on Escape
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return (
        <div className="edg-overlay">
            <div className="edg-container">
                {/* Header */}
                <div className="edg-header">
                    <div className="edg-title">Email Design Guide</div>
                    <button className="edg-close" onClick={onClose}>Close</button>
                </div>

                {/* 1. Design Tokens */}
                <Section label="01 — Design Tokens">
                    <div className="edg-swatch-grid">
                        {DESIGN_TOKENS.map((t) => (
                            <div key={t.name} className="edg-swatch">
                                <div className="edg-swatch-color" style={{ background: t.value }} />
                                <div className="edg-swatch-info">
                                    <div className="edg-swatch-name">--email-{t.name}</div>
                                    <div className="edg-swatch-value">{t.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 2. Chat Bubbles */}
                <Section label="02 — Chat Bubbles">
                    <div className="email-overlay" style={{ position: 'relative', inset: 'auto', zIndex: 'auto', background: 'none', animation: 'none' }}>
                        <div className="edg-row">
                            <ChatBubble
                                direction="incoming"
                                fromName="Margaux Bellamy"
                                body="Thank you for your interest in the Richter. This piece has **significant provenance**."
                                time="10:07 AM"
                            />
                            <ChatBubble
                                direction="outgoing"
                                fromName="You"
                                body="I appreciate the history. Comparable works have moved at a **15-20% discount** to your asking."
                                time="10:20 AM"
                            />
                            <ChatBubble
                                direction="incoming"
                                fromName="Viktor Hesse"
                                body="A bold position."
                            />
                            <ChatBubble
                                direction="incoming"
                                fromName="Margaux Bellamy"
                                body="Let me think about this..."
                                isTyping={true}
                            />
                        </div>
                    </div>
                    <div className="edg-note">Incoming = left + border-left. Outgoing = right + gold border-right. Last bubble shows typing cursor.</div>
                </Section>

                {/* 3. Typing Indicators */}
                <Section label="03 — Typing Indicators">
                    <div className="email-overlay" style={{ position: 'relative', inset: 'auto', zIndex: 'auto', background: 'none', animation: 'none' }}>
                        <div className="edg-row">
                            <div className="email-typing-indicator">
                                <div className="email-typing-dots">
                                    <span /><span /><span />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e0e0e0', fontFamily: "'Helvetica Neue', sans-serif", fontSize: '13px' }}>
                                <span>Blinking cursor:</span>
                                <span className="email-cursor">|</span>
                            </div>
                        </div>
                    </div>
                    <div className="edg-note">Bouncing dots = waiting for dealer reply. Blinking cursor = typewriter in progress.</div>
                </Section>

                {/* 4. Agent Guide */}
                <Section label="04 — Agent Guide">
                    <div className="email-overlay" style={{ position: 'relative', inset: 'auto', zIndex: 'auto', background: 'none', animation: 'none' }}>
                        <div className="email-agent-section">
                            <div className="email-agent">
                                <div className="email-agent-icon">A</div>
                                <div className="email-agent-content">
                                    <div className="email-agent-text">
                                        She's holding firm on provenance value. Consider anchoring low to reset expectations, or pivot to an emotional connection.
                                        <span className="email-cursor">|</span>
                                    </div>
                                    <div className="email-option-pills">
                                        <button className="email-pill" style={{ animationDelay: '0ms' }}>Tactics</button>
                                        <button className="email-pill" style={{ animationDelay: '80ms' }}>Powers</button>
                                        <button className="email-pill" style={{ animationDelay: '160ms' }}>Info</button>
                                        <button className="email-pill" style={{ animationDelay: '240ms' }}>Deal</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="edg-note">AI agent icon + typewriter text + category pills with staggered animation.</div>
                </Section>

                {/* 5. Tactic Cards */}
                <Section label="05 — Tactic Cards">
                    <div className="email-overlay" style={{ position: 'relative', inset: 'auto', zIndex: 'auto', background: 'none', animation: 'none' }}>
                        <div className="email-tactic-list">
                            {MOCK_TACTICS.map((tactic, i) => (
                                <button
                                    key={tactic.id}
                                    className={`email-tactic-card${tactic.locked ? ' email-tactic-card--locked' : ''}`}
                                    style={{ animationDelay: `${i * 60}ms` }}
                                    disabled={tactic.locked}
                                >
                                    <div className="email-tactic-name">
                                        <span
                                            className="email-type-dot"
                                            style={{ backgroundColor: TYPE_COLORS[tactic.type] || '#888' }}
                                        />
                                        {tactic.label}
                                    </div>
                                    <div className="email-tactic-desc">{tactic.description}</div>
                                    {tactic.previewText && (
                                        <div className="email-tactic-preview">"{tactic.previewText}"</div>
                                    )}
                                    {tactic.locked && (
                                        <div className="email-tactic-lock">{tactic.lockReason}</div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="edg-note">Type dots: red=emotional, blue=logical, orange=aggressive, green=financial. Last card is locked state.</div>
                </Section>

                {/* 6. Dialogue Pills */}
                <Section label="06 — Dialogue Pills">
                    <div className="email-overlay" style={{ position: 'relative', inset: 'auto', zIndex: 'auto', background: 'none', animation: 'none' }}>
                        <div className="email-option-pills email-option-pills--dialogue">
                            {MOCK_DIALOGUE_CHOICES.map((choice, i) => (
                                <button
                                    key={choice.id}
                                    className="email-pill email-pill--dialogue"
                                    style={{ animationDelay: `${i * 80}ms` }}
                                >
                                    {choice.line}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="edg-note">Full-width pills with staggered fade-in. Left-aligned, normal case text.</div>
                </Section>

                {/* 7. Info Panel */}
                <Section label="07 — Info Panel">
                    <div className="email-overlay" style={{ position: 'relative', inset: 'auto', zIndex: 'auto', background: 'none', animation: 'none' }}>
                        <div className="email-info-panel">
                            <div className="email-info-row">
                                <span>Dealer</span>
                                <span>{MOCK_HAGGLE_STATE.dealerName} ({MOCK_HAGGLE_STATE.dealerType})</span>
                            </div>
                            <div className="email-info-row">
                                <span>Asking Price</span>
                                <span>${fmtNum(MOCK_HAGGLE_STATE.askingPrice)}</span>
                            </div>
                            <div className="email-info-row">
                                <span>Your Offer</span>
                                <span>${fmtNum(MOCK_HAGGLE_STATE.currentOffer)}</span>
                            </div>
                            <div className="email-info-row">
                                <span>Gap</span>
                                <span>${fmtNum(MOCK_HAGGLE_STATE.gap)} ({Math.round((MOCK_HAGGLE_STATE.gap / MOCK_HAGGLE_STATE.askingPrice) * 100)}%)</span>
                            </div>
                            <div className="email-info-row">
                                <span>Round</span>
                                <span>{MOCK_HAGGLE_STATE.round} / {MOCK_HAGGLE_STATE.maxRounds}</span>
                            </div>
                            <div className="email-info-row">
                                <span>Patience</span>
                                <span>{MOCK_HAGGLE_STATE.patience} / {MOCK_HAGGLE_STATE.maxPatience}</span>
                            </div>
                        </div>
                    </div>
                    <div className="edg-note">Monospace stat readout. Uses email-info-panel styles.</div>
                </Section>

                {/* 8. Deal Panel */}
                <Section label="08 — Deal Panel">
                    <div className="email-overlay" style={{ position: 'relative', inset: 'auto', zIndex: 'auto', background: 'none', animation: 'none' }}>
                        <div className="email-deal-panel">
                            <button className="email-deal-btn email-deal-btn--accept">
                                Accept at ${fmtNum(MOCK_HAGGLE_STATE.askingPrice)}
                            </button>
                            <button className="email-deal-btn email-deal-btn--walk">
                                Walk Away
                            </button>
                        </div>
                    </div>
                    <div className="edg-note">Green border = accept. Muted = walk away (red on hover).</div>
                </Section>

                {/* 9. Status Bar */}
                <Section label="09 — Status Bar">
                    <div className="email-overlay" style={{ position: 'relative', inset: 'auto', zIndex: 'auto', background: 'none', animation: 'none' }}>
                        <div className="edg-row">
                            <HaggleStatusBar haggleState={MOCK_HAGGLE_STATE} />
                            <HaggleStatusBar haggleState={MOCK_HAGGLE_STATE_DANGER} />
                        </div>
                    </div>
                    <div className="edg-note">Top = normal state. Bottom = danger state (patience 1, round 5) — patience value turns red.</div>
                </Section>

                {/* 10. Full Conversation */}
                <Section label="10 — Full Conversation">
                    <div className="email-overlay" style={{ position: 'relative', inset: 'auto', zIndex: 'auto', background: 'none', animation: 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
                            <HaggleStatusBar haggleState={MOCK_HAGGLE_STATE} />
                            {MOCK_THREAD.map((msg) => (
                                <ChatBubble
                                    key={msg.id}
                                    direction={msg.direction}
                                    fromName={msg.fromName}
                                    body={msg.body}
                                    time={msg.time}
                                />
                            ))}
                            <div className="email-agent-section">
                                <div className="email-agent">
                                    <div className="email-agent-icon">A</div>
                                    <div className="email-agent-content">
                                        <div className="email-agent-text">
                                            She dropped $20K but anchored on provenance. Push the comparables angle or try a walk-away bluff.
                                        </div>
                                        <div className="email-option-pills">
                                            <button className="email-pill" style={{ animationDelay: '0ms' }}>Tactics</button>
                                            <button className="email-pill" style={{ animationDelay: '80ms' }}>Powers</button>
                                            <button className="email-pill" style={{ animationDelay: '160ms' }}>Info</button>
                                            <button className="email-pill" style={{ animationDelay: '240ms' }}>Deal</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="edg-note">Complete mock thread: status bar → messages → agent guide. Shows the full email flow.</div>
                </Section>
            </div>
        </div>
    );
}

/** Reusable section wrapper */
function Section({ label, children }) {
    return (
        <div className="edg-section">
            <div className="edg-section-label">{label}</div>
            <div className="edg-card">
                {children}
            </div>
        </div>
    );
}
