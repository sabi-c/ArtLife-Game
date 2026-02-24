/**
 * EmailDesignGuide.jsx — Living design guide for all email UI components
 *
 * Storybook-lite overlay that renders every email component in isolation
 * with mock data. Fully interactive — pills click, tactics select, the
 * full conversation demo cycles through phases. Accessible via F3 hotkey.
 *
 * @see EmailOverlay.jsx for the actual email overlay
 * @see EmailOverlay.css for all email component styles
 */

import React, { useEffect, useState, useCallback } from 'react';
import ChatBubble from './haggle/ChatBubble.jsx';
import HaggleStatusBar from './haggle/HaggleStatusBar.jsx';
import './haggle/haggle.css';
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

const CATEGORIES = [
    { id: 'tactics', label: 'TACTICS' },
    { id: 'powers', label: 'POWERS' },
    { id: 'info', label: 'INFO' },
    { id: 'deal', label: 'DEAL' },
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

/** Demo phases for the interactive conversation section */
const DEMO_PHASES = ['choosingCategory', 'choosingTactic', 'choosingDialogue', 'composingReply', 'waiting', 'complete'];
const DEMO_PHASE_LABELS = {
    choosingCategory: 'Category Selection',
    choosingTactic: 'Tactic Selection',
    choosingDialogue: 'Dialogue Choice',
    composingReply: 'Composing Reply',
    waiting: 'Waiting for Response',
    complete: 'Negotiation Complete',
};

const fmtNum = (val) => val?.toLocaleString() || '0';

/** Inline style override to neutralize the .email-overlay layout while keeping CSS vars */
const CONTEXT_STYLE = { position: 'relative', inset: 'auto', zIndex: 'auto', background: 'none', animation: 'none' };

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export default function EmailDesignGuide({ onClose }) {
    // Interactive state for component demos
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedTactic, setSelectedTactic] = useState(null);
    const [selectedDialogue, setSelectedDialogue] = useState(null);
    const [demoPhase, setDemoPhase] = useState('choosingCategory');
    const [flashId, setFlashId] = useState(null);

    // Flash feedback on click — briefly highlights the clicked element
    const flash = useCallback((id) => {
        setFlashId(id);
        setTimeout(() => setFlashId(null), 300);
    }, []);

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

    // Reset interactive flow when cycling demo phase
    const cycleDemoPhase = () => {
        const idx = DEMO_PHASES.indexOf(demoPhase);
        const next = DEMO_PHASES[(idx + 1) % DEMO_PHASES.length];
        setDemoPhase(next);
        if (next === 'choosingCategory') {
            setSelectedCategory(null);
            setSelectedTactic(null);
            setSelectedDialogue(null);
        }
    };

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
                    <div className="email-overlay" style={CONTEXT_STYLE}>
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
                    <div className="email-overlay" style={CONTEXT_STYLE}>
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
                            <div className="email-sending-indicator">Sent</div>
                        </div>
                    </div>
                    <div className="edg-note">Bouncing dots = waiting. Blinking cursor = typewriter. "Sent" = sending indicator.</div>
                </Section>

                {/* 4. Agent Guide — Interactive */}
                <Section label="04 — Agent Guide (click pills)">
                    <div className="email-overlay" style={CONTEXT_STYLE}>
                        <div className="email-agent-section">
                            <div className="email-agent">
                                <div className="email-agent-icon">A</div>
                                <div className="email-agent-content">
                                    <div className="email-agent-text">
                                        {selectedCategory
                                            ? `You selected "${selectedCategory}". ${selectedCategory === 'tactics' ? 'Choose a negotiation tactic below.' : selectedCategory === 'info' ? 'Viewing dealer statistics.' : selectedCategory === 'deal' ? 'Accept or walk away.' : 'Power moves available.'}`
                                            : 'She\'s holding firm on provenance value. Consider anchoring low to reset expectations, or pivot to an emotional connection.'}
                                        {!selectedCategory && <span className="email-cursor">|</span>}
                                    </div>
                                    <div className="email-option-pills">
                                        {CATEGORIES.map((cat, i) => (
                                            <button
                                                key={cat.id}
                                                className={`email-pill${selectedCategory === cat.id ? ' edg-pill-active' : ''}${flashId === `cat-${cat.id}` ? ' edg-flash' : ''}`}
                                                style={{ animationDelay: `${i * 80}ms` }}
                                                onClick={() => { setSelectedCategory(cat.id); flash(`cat-${cat.id}`); }}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Show tactic cards when tactics selected */}
                                    {selectedCategory === 'tactics' && (
                                        <div className="email-tactic-list">
                                            {MOCK_TACTICS.map((tactic, i) => (
                                                <button
                                                    key={tactic.id}
                                                    className={`email-tactic-card${tactic.locked ? ' email-tactic-card--locked' : ''}${selectedTactic === tactic.id ? ' edg-tactic-active' : ''}`}
                                                    style={{ animationDelay: `${i * 60}ms` }}
                                                    disabled={tactic.locked}
                                                    onClick={() => !tactic.locked && setSelectedTactic(selectedTactic === tactic.id ? null : tactic.id)}
                                                >
                                                    <div className="email-tactic-name">
                                                        <span className="email-type-dot" style={{ backgroundColor: TYPE_COLORS[tactic.type] || '#888' }} />
                                                        {tactic.label}
                                                    </div>
                                                    <div className="email-tactic-desc">{tactic.description}</div>
                                                    {tactic.previewText && <div className="email-tactic-preview">"{tactic.previewText}"</div>}
                                                    {tactic.locked && <div className="email-tactic-lock">{tactic.lockReason}</div>}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Show info panel when info selected */}
                                    {selectedCategory === 'info' && (
                                        <div className="email-info-panel">
                                            <div className="email-info-row"><span>Dealer</span><span>{MOCK_HAGGLE_STATE.dealerName} ({MOCK_HAGGLE_STATE.dealerType})</span></div>
                                            <div className="email-info-row"><span>Asking Price</span><span>${fmtNum(MOCK_HAGGLE_STATE.askingPrice)}</span></div>
                                            <div className="email-info-row"><span>Your Offer</span><span>${fmtNum(MOCK_HAGGLE_STATE.currentOffer)}</span></div>
                                            <div className="email-info-row"><span>Gap</span><span>${fmtNum(MOCK_HAGGLE_STATE.gap)} ({Math.round((MOCK_HAGGLE_STATE.gap / MOCK_HAGGLE_STATE.askingPrice) * 100)}%)</span></div>
                                        </div>
                                    )}

                                    {/* Show deal panel when deal selected */}
                                    {selectedCategory === 'deal' && (
                                        <div className="email-deal-panel">
                                            <button className="email-deal-btn email-deal-btn--accept" onClick={() => flash('accept')}>
                                                Accept at ${fmtNum(MOCK_HAGGLE_STATE.askingPrice)}
                                            </button>
                                            <button className="email-deal-btn email-deal-btn--walk" onClick={() => flash('walk')}>
                                                Walk Away
                                            </button>
                                        </div>
                                    )}

                                    {/* Dialogue choices after tactic selected */}
                                    {selectedTactic && (
                                        <div className="email-option-pills email-option-pills--dialogue">
                                            {MOCK_DIALOGUE_CHOICES.map((choice, i) => (
                                                <button
                                                    key={choice.id}
                                                    className={`email-pill email-pill--dialogue${selectedDialogue === choice.id ? ' edg-pill-active' : ''}`}
                                                    style={{ animationDelay: `${i * 80}ms` }}
                                                    onClick={() => setSelectedDialogue(choice.id)}
                                                >
                                                    {choice.line}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Back button */}
                                    {selectedCategory && (
                                        <button className="email-back-btn" onClick={() => { setSelectedCategory(null); setSelectedTactic(null); setSelectedDialogue(null); }}>
                                            Back
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="edg-note">Interactive: click category pills to expand sub-views. Click tactics to see dialogue choices. Back button resets.</div>
                </Section>

                {/* 5. Tactic Cards (standalone) */}
                <Section label="05 — Tactic Cards">
                    <div className="email-overlay" style={CONTEXT_STYLE}>
                        <div className="email-tactic-list">
                            {MOCK_TACTICS.map((tactic, i) => (
                                <button
                                    key={tactic.id}
                                    className={`email-tactic-card${tactic.locked ? ' email-tactic-card--locked' : ''}`}
                                    style={{ animationDelay: `${i * 60}ms` }}
                                    disabled={tactic.locked}
                                >
                                    <div className="email-tactic-name">
                                        <span className="email-type-dot" style={{ backgroundColor: TYPE_COLORS[tactic.type] || '#888' }} />
                                        {tactic.label}
                                    </div>
                                    <div className="email-tactic-desc">{tactic.description}</div>
                                    {tactic.previewText && <div className="email-tactic-preview">"{tactic.previewText}"</div>}
                                    {tactic.locked && <div className="email-tactic-lock">{tactic.lockReason}</div>}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="edg-note">Type dots: red=emotional, blue=logical, orange=aggressive, green=financial. Last card is locked state.</div>
                </Section>

                {/* 6. Dialogue Pills */}
                <Section label="06 — Dialogue Pills">
                    <div className="email-overlay" style={CONTEXT_STYLE}>
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
                    <div className="email-overlay" style={CONTEXT_STYLE}>
                        <div className="email-info-panel">
                            <div className="email-info-row"><span>Dealer</span><span>{MOCK_HAGGLE_STATE.dealerName} ({MOCK_HAGGLE_STATE.dealerType})</span></div>
                            <div className="email-info-row"><span>Asking Price</span><span>${fmtNum(MOCK_HAGGLE_STATE.askingPrice)}</span></div>
                            <div className="email-info-row"><span>Your Offer</span><span>${fmtNum(MOCK_HAGGLE_STATE.currentOffer)}</span></div>
                            <div className="email-info-row"><span>Gap</span><span>${fmtNum(MOCK_HAGGLE_STATE.gap)} ({Math.round((MOCK_HAGGLE_STATE.gap / MOCK_HAGGLE_STATE.askingPrice) * 100)}%)</span></div>
                            <div className="email-info-row"><span>Round</span><span>{MOCK_HAGGLE_STATE.round} / {MOCK_HAGGLE_STATE.maxRounds}</span></div>
                            <div className="email-info-row"><span>Patience</span><span>{MOCK_HAGGLE_STATE.patience} / {MOCK_HAGGLE_STATE.maxPatience}</span></div>
                        </div>
                    </div>
                    <div className="edg-note">Monospace stat readout. Uses email-info-panel styles.</div>
                </Section>

                {/* 8. Deal Panel */}
                <Section label="08 — Deal Panel">
                    <div className="email-overlay" style={CONTEXT_STYLE}>
                        <div className="email-deal-panel">
                            <button className={`email-deal-btn email-deal-btn--accept${flashId === 'accept' ? ' edg-flash' : ''}`} onClick={() => flash('accept')}>
                                Accept at ${fmtNum(MOCK_HAGGLE_STATE.askingPrice)}
                            </button>
                            <button className={`email-deal-btn email-deal-btn--walk${flashId === 'walk' ? ' edg-flash' : ''}`} onClick={() => flash('walk')}>
                                Walk Away
                            </button>
                        </div>
                    </div>
                    <div className="edg-note">Green border = accept. Muted = walk away (red on hover). Click for flash feedback.</div>
                </Section>

                {/* 9. Status Bar */}
                <Section label="09 — Status Bar">
                    <div className="email-overlay" style={CONTEXT_STYLE}>
                        <div className="edg-row">
                            <HaggleStatusBar haggleState={MOCK_HAGGLE_STATE} />
                            <HaggleStatusBar haggleState={MOCK_HAGGLE_STATE_DANGER} />
                        </div>
                    </div>
                    <div className="edg-note">Top = normal state. Bottom = danger state (patience 1, round 5) — patience value turns red.</div>
                </Section>

                {/* 10. Full Conversation — Interactive Phase Demo */}
                <Section label="10 — Full Conversation (interactive)">
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="edg-close" onClick={cycleDemoPhase} style={{ padding: '4px 14px' }}>
                            Phase: {DEMO_PHASE_LABELS[demoPhase]}
                        </button>
                        <span style={{ fontSize: 10, color: '#6a6a7a', fontFamily: "'IBM Plex Mono', monospace" }}>
                            Click to cycle through phases
                        </span>
                    </div>
                    <div className="email-overlay" style={CONTEXT_STYLE}>
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

                            {/* Phase: waiting */}
                            {demoPhase === 'waiting' && (
                                <div className="email-typing-indicator">
                                    <div className="email-typing-dots">
                                        <span /><span /><span />
                                    </div>
                                </div>
                            )}

                            {/* Phase: composingReply */}
                            {demoPhase === 'composingReply' && (
                                <div className="email-bubble email-bubble--out email-bubble--active">
                                    <div className="email-bubble-meta">
                                        <span className="email-bubble-from">You</span>
                                    </div>
                                    <div className="email-bubble-body">
                                        <p className="email-bubble-line">I was thinking closer to $180,000 based on recent comparables...</p>
                                        <span className="email-cursor">|</span>
                                    </div>
                                </div>
                            )}

                            {/* Phase: agent choosing */}
                            {(demoPhase === 'choosingCategory' || demoPhase === 'choosingTactic' || demoPhase === 'choosingDialogue') && (
                                <div className="email-agent-section">
                                    <div className="email-agent">
                                        <div className="email-agent-icon">A</div>
                                        <div className="email-agent-content">
                                            <div className="email-agent-text">
                                                {demoPhase === 'choosingCategory' && 'She dropped $20K but anchored on provenance. Push the comparables angle or try a walk-away bluff.'}
                                                {demoPhase === 'choosingTactic' && 'Good choice. Select a specific tactic to deploy.'}
                                                {demoPhase === 'choosingDialogue' && 'Anchor Low selected. Pick your opening line.'}
                                            </div>
                                            {demoPhase === 'choosingCategory' && (
                                                <div className="email-option-pills">
                                                    {CATEGORIES.map((cat, i) => (
                                                        <button key={cat.id} className="email-pill" style={{ animationDelay: `${i * 80}ms` }}
                                                            onClick={() => setDemoPhase('choosingTactic')}>
                                                            {cat.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {demoPhase === 'choosingTactic' && (
                                                <div className="email-tactic-list">
                                                    {MOCK_TACTICS.filter(t => !t.locked).map((tactic, i) => (
                                                        <button key={tactic.id} className="email-tactic-card" style={{ animationDelay: `${i * 60}ms` }}
                                                            onClick={() => setDemoPhase('choosingDialogue')}>
                                                            <div className="email-tactic-name">
                                                                <span className="email-type-dot" style={{ backgroundColor: TYPE_COLORS[tactic.type] || '#888' }} />
                                                                {tactic.label}
                                                            </div>
                                                            <div className="email-tactic-desc">{tactic.description}</div>
                                                        </button>
                                                    ))}
                                                    <button className="email-back-btn" onClick={() => setDemoPhase('choosingCategory')}>Back</button>
                                                </div>
                                            )}
                                            {demoPhase === 'choosingDialogue' && (
                                                <>
                                                    <div className="email-option-pills email-option-pills--dialogue">
                                                        {MOCK_DIALOGUE_CHOICES.map((choice, i) => (
                                                            <button key={choice.id} className="email-pill email-pill--dialogue" style={{ animationDelay: `${i * 80}ms` }}
                                                                onClick={() => setDemoPhase('composingReply')}>
                                                                {choice.line}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button className="email-back-btn" onClick={() => setDemoPhase('choosingTactic')}>Back</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Phase: complete */}
                            {demoPhase === 'complete' && (
                                <div className="email-complete">
                                    <div className="email-outcome">
                                        <strong>Deal reached at $220,000 — 23% below asking price.</strong>
                                    </div>
                                    <button className="email-done-btn" onClick={cycleDemoPhase}>
                                        Close Inbox
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="edg-note">Interactive demo: click pills/tactics/dialogue to advance through phases. "Phase" button cycles manually.</div>
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
