/**
 * modals.jsx — Dashboard modal overlays and config dropdowns
 *
 * Contains: StyleGuideView, EventOverlay, PanelConfigDropdown
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState } from '../../managers/GameState.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { SettingsManager } from '../../managers/SettingsManager.js';
import { fmtNum, resolveImageUrl } from './dashboardUtils.jsx';

// ══════════════════════════════════════════════════════════════
// 22. StyleGuideView — Design system reference for Artnet + Tearsheet
//
// Accessible via marketStyle cycle toggle ('styleguide').
// Shows labelled examples of both design systems plus shared elements.
// Developers can reference this view when building new pages.
// ══════════════════════════════════════════════════════════════
function StyleGuideView() {
    return (
        <div className="sg-view">
            <div className="sg-header">
                <h1 className="sg-title">ArtLife Design System</h1>
                <p className="sg-subtitle">Component reference for Artnet and Tearsheet visual languages</p>
            </div>

            {/* ── Section 1: Color Tokens ── */}
            <div className="sg-section">
                <h2 className="sg-section-title">Color Tokens</h2>
                <div className="sg-swatches">
                    <div className="sg-swatch-group">
                        <h3 className="sg-swatch-label">Artnet (--an-*)</h3>
                        <div className="sg-swatch" style={{ background: 'var(--an-bg)', color: 'var(--an-fg)', border: '1px solid var(--an-border)' }}>--an-bg / --an-fg</div>
                        <div className="sg-swatch" style={{ background: 'var(--an-accent)', color: '#fff' }}>--an-accent (#cc0000)</div>
                        <div className="sg-swatch" style={{ background: 'var(--an-accent-light)', color: 'var(--an-fg)' }}>--an-accent-light</div>
                        <div className="sg-swatch" style={{ background: 'var(--an-border)' }}>--an-border</div>
                    </div>
                    <div className="sg-swatch-group">
                        <h3 className="sg-swatch-label">Tearsheet (--ts-*)</h3>
                        <div className="sg-swatch" style={{ background: 'var(--ts-bg)', color: 'var(--ts-fg)', border: '1px solid var(--ts-border)' }}>--ts-bg / --ts-fg</div>
                        <div className="sg-swatch" style={{ background: 'var(--ts-accent)', color: '#fff' }}>--ts-accent (#1a1a1a)</div>
                        <div className="sg-swatch" style={{ background: 'var(--ts-border)' }}>--ts-border</div>
                    </div>
                    <div className="sg-swatch-group">
                        <h3 className="sg-swatch-label">Bloomberg (--bb-*)</h3>
                        <div className="sg-swatch" style={{ background: 'var(--bb-bg)', color: 'var(--bb-fg)' }}>--bb-bg / --bb-fg</div>
                        <div className="sg-swatch" style={{ background: 'var(--bb-accent)', color: '#000' }}>--bb-accent (#ff8c00)</div>
                        <div className="sg-swatch" style={{ background: 'var(--bb-green)', color: '#000' }}>--bb-green</div>
                        <div className="sg-swatch" style={{ background: 'var(--bb-red)', color: '#fff' }}>--bb-red</div>
                    </div>
                </div>
            </div>

            {/* ── Section 2: Artnet Patterns ── */}
            <div className="sg-section">
                <h2 className="sg-section-title">Artnet Patterns</h2>

                {/* Header bar */}
                <div className="sg-example">
                    <div className="sg-example-label">Header Bar</div>
                    <div className="an-header-bar" style={{ position: 'relative' }}>
                        <div className="an-header-left">
                            <span className="an-logo">artlife</span>
                            <span className="an-header-title">Price Database</span>
                        </div>
                        <span className="an-header-subtitle">W12 · MAR 2024</span>
                    </div>
                </div>

                {/* Search input */}
                <div className="sg-example">
                    <div className="sg-example-label">Search Input</div>
                    <div style={{ background: 'var(--an-bg)', padding: 12 }}>
                        <input className="an-search" placeholder="Search by artist, title, medium..." readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--an-border)', borderRadius: 'var(--an-radius)', fontFamily: 'var(--an-font-body)', fontSize: 13 }} />
                    </div>
                </div>

                {/* Data table */}
                <div className="sg-example">
                    <div className="sg-example-label">Data Table (3 sample rows)</div>
                    <div style={{ background: 'var(--an-bg)', padding: 12 }}>
                        <table className="sg-an-table">
                            <thead>
                                <tr>
                                    <th>LOT</th><th>ARTIST</th><th>TITLE</th><th>MEDIUM</th><th>EST.</th><th>PRICE</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>1</td><td>Wei Chen</td><td>Untitled (Blue)</td><td>Oil on canvas</td><td>$180K–220K</td><td className="sg-an-price">$285,000</td></tr>
                                <tr><td>2</td><td>Kwame Mensah</td><td>Market Forces</td><td>Acrylic on panel</td><td>$90K–120K</td><td className="sg-an-price">$142,500</td></tr>
                                <tr><td>3</td><td>Yuki Tanaka</td><td>Tokyo Drift III</td><td>Mixed media</td><td>$60K–80K</td><td className="sg-an-price">$78,000</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="sg-example">
                    <div className="sg-example-label">Stat Cards + Badges</div>
                    <div style={{ background: 'var(--an-bg)', padding: 12, display: 'flex', gap: 12 }}>
                        <div className="sg-an-stat-card">
                            <div className="sg-an-stat-value">$2.4M</div>
                            <div className="sg-an-stat-label">Total Sales</div>
                        </div>
                        <div className="sg-an-stat-card">
                            <div className="sg-an-stat-value">847</div>
                            <div className="sg-an-stat-label">Lots Tracked</div>
                        </div>
                        <span className="sg-an-badge sg-an-badge--hot">HOT</span>
                        <span className="sg-an-badge sg-an-badge--new">NEW</span>
                        <span className="sg-an-badge sg-an-badge--sold">SOLD</span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="sg-example">
                    <div className="sg-example-label">Action Buttons</div>
                    <div style={{ background: 'var(--an-bg)', padding: 12, display: 'flex', gap: 8 }}>
                        <button className="sg-an-btn sg-an-btn--primary">Place Bid</button>
                        <button className="sg-an-btn sg-an-btn--secondary">Add to Watchlist</button>
                        <button className="sg-an-btn sg-an-btn--danger">Cancel Order</button>
                    </div>
                </div>
            </div>

            {/* ── Section 3: Tearsheet Patterns ── */}
            <div className="sg-section">
                <h2 className="sg-section-title">Tearsheet Patterns</h2>

                {/* Cover page */}
                <div className="sg-example">
                    <div className="sg-example-label">Cover Page</div>
                    <div className="sg-ts-cover-demo">
                        <div className="sg-ts-gallery-name">G A G O S I A N</div>
                        <div className="sg-ts-cover-title">Selected Works</div>
                        <div className="sg-ts-cover-subtitle">Spring 2024</div>
                    </div>
                </div>

                {/* Text page */}
                <div className="sg-example">
                    <div className="sg-example-label">Text Page</div>
                    <div className="sg-ts-text-demo">
                        <p style={{ fontFamily: 'var(--ts-font-serif)', fontSize: 15, lineHeight: 1.8, color: 'var(--ts-fg)' }}>
                            The exhibition brings together a selection of significant works that trace the evolution of contemporary practice across two decades. Each piece represents a pivotal moment in the artist's investigation of form, material, and meaning.
                        </p>
                    </div>
                </div>

                {/* Info section + provenance */}
                <div className="sg-example">
                    <div className="sg-example-label">Provenance + Price Block</div>
                    <div className="sg-ts-info-demo">
                        <div className="sg-ts-info-section">
                            <div className="sg-ts-info-head">PROVENANCE</div>
                            <div className="sg-ts-info-item">Private collection, New York</div>
                            <div className="sg-ts-info-item">Acquired from the artist, 2021</div>
                        </div>
                        <div className="sg-ts-price-block">
                            <div className="sg-ts-price-label">PRICE</div>
                            <div className="sg-ts-price-value">$ 285,000.00</div>
                        </div>
                    </div>
                </div>

                {/* Address block */}
                <div className="sg-example">
                    <div className="sg-example-label">Gallery Address Block</div>
                    <div className="sg-ts-address-demo">
                        <div style={{ letterSpacing: 'var(--ts-brand-spacing)', fontFamily: 'var(--ts-font-sans)', fontSize: 11, fontWeight: 600 }}>ARTLIFE</div>
                        <div style={{ fontFamily: 'var(--ts-font-serif)', fontSize: 12, color: '#666', marginTop: 4 }}>980 Madison Avenue</div>
                        <div style={{ fontFamily: 'var(--ts-font-serif)', fontSize: 12, color: '#666' }}>New York</div>
                        <div style={{ fontFamily: 'var(--ts-font-serif)', fontSize: 12, color: '#666' }}>artlife.game</div>
                    </div>
                </div>
            </div>

            {/* ── Section 4: Typography Scale ── */}
            <div className="sg-section">
                <h2 className="sg-section-title">Typography</h2>
                <div className="sg-type-scale">
                    <div className="sg-type-row">
                        <span className="sg-type-label">--an-font-body</span>
                        <span style={{ fontFamily: 'var(--an-font-body)', fontSize: 14 }}>Helvetica Neue — The quick brown fox</span>
                    </div>
                    <div className="sg-type-row">
                        <span className="sg-type-label">--an-font-mono</span>
                        <span style={{ fontFamily: 'var(--an-font-mono)', fontSize: 13 }}>IBM Plex Mono — $285,000.00</span>
                    </div>
                    <div className="sg-type-row">
                        <span className="sg-type-label">--ts-font-serif</span>
                        <span style={{ fontFamily: 'var(--ts-font-serif)', fontSize: 15 }}>Georgia — Selected Works, Spring 2024</span>
                    </div>
                    <div className="sg-type-row">
                        <span className="sg-type-label">--ts-font-sans</span>
                        <span style={{ fontFamily: 'var(--ts-font-sans)', fontSize: 13, letterSpacing: '0.35em' }}>G A G O S I A N</span>
                    </div>
                    <div className="sg-type-row">
                        <span className="sg-type-label">--bb-font-mono</span>
                        <span style={{ fontFamily: 'var(--bb-font-mono)', fontSize: 11, color: '#00e676' }}>ARTLIFE MARKET TERMINAL ████</span>
                    </div>
                </div>
            </div>

            {/* ── Section 5: Email Preview ── */}
            <div className="sg-section">
                <h2 className="sg-section-title">Email Dialogue (Preview)</h2>
                <div className="sg-example">
                    <div className="sg-example-label">Artnet-Styled Email Exchange</div>
                    <div className="sg-email-preview">
                        <div className="sg-email-header-demo">INBOX — Re: Untitled (Blue), 2022</div>
                        <div className="sg-email-split-demo">
                            <div className="sg-email-thread-demo">
                                <div className="sg-email-msg-demo sg-email-msg--in-demo">
                                    <div className="sg-email-msg-from">Sasha Klein</div>
                                    <div className="sg-email-msg-time">10:32 AM</div>
                                    <div className="sg-email-msg-preview">"I understand you recently acquired..."</div>
                                </div>
                                <div className="sg-email-msg-demo sg-email-msg--out-demo">
                                    <div className="sg-email-msg-from">You</div>
                                    <div className="sg-email-msg-time">10:45 AM</div>
                                    <div className="sg-email-msg-preview">"Thank you for reaching out..."</div>
                                </div>
                            </div>
                            <div className="sg-email-current-demo">
                                <p>Dear Player,</p>
                                <p>I understand you recently acquired the Chen piece. My client is prepared to offer <strong style={{ color: 'var(--an-accent)' }}>$285,000</strong> — above current estimate.</p>
                                <p>Best, Sasha</p>
                                <div className="sg-email-actions-demo">
                                    <button className="sg-an-btn sg-an-btn--primary">Counter at $320,000</button>
                                    <button className="sg-an-btn sg-an-btn--secondary">Accept the offer</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// EventOverlay — Inline event player for Bloomberg Terminal
//
// Displays stepped events (narrative, dialogue, choice) as a
// slide-in notification panel. Auto-advances narrative/dialogue
// steps; pauses on choice steps for player input.
// ══════════════════════════════════════════════════════════════
function EventOverlay({ event, onComplete }) {
    const [stepIndex, setStepIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedChoice, setSelectedChoice] = useState(null);
    const [outcomeText, setOutcomeText] = useState(null);

    const steps = event?.steps || [];
    const step = steps[stepIndex];
    const isLastStep = stepIndex >= steps.length - 1;

    // Typewriter effect for narrative/dialogue
    useEffect(() => {
        if (!step) return;
        const text = step.text || '';
        if (step.type === 'choice') {
            setDisplayedText(text);
            setIsTyping(false);
            return;
        }
        // Typewriter: reveal text character by character
        setIsTyping(true);
        setDisplayedText('');
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setDisplayedText(text.slice(0, i));
            if (i >= text.length) {
                clearInterval(interval);
                setIsTyping(false);
            }
        }, 18); // ~55 chars/sec
        return () => clearInterval(interval);
    }, [stepIndex, step]);

    // Auto-advance for narrative/dialogue steps (after typing completes)
    useEffect(() => {
        if (!step || isTyping) return;
        if (step.type === 'choice' || step.type === 'stat_change') return;
        const delay = step.delay || 2500;
        const timer = setTimeout(() => advanceStep(), delay);
        return () => clearTimeout(timer);
    }, [stepIndex, isTyping, step]);

    const advanceStep = () => {
        if (isLastStep) {
            onComplete?.({});
            return;
        }
        setSelectedChoice(null);
        setOutcomeText(null);
        setStepIndex(s => s + 1);
    };

    // Skip typing on click (fast-forward to full text)
    const handleClick = () => {
        if (isTyping) {
            setDisplayedText(step?.text || '');
            setIsTyping(false);
            return;
        }
        if (step?.type !== 'choice') {
            advanceStep();
        }
    };

    const handleChoice = (choice, idx) => {
        setSelectedChoice(idx);
        // Apply effects via GameState
        if (choice.effects) {
            try { GameState.applyEffects(choice.effects); } catch (e) { console.warn('[EventOverlay] Effect error:', e); }
        }
        // Check storyline triggers
        try {
            EventRegistry.checkStorylineTrigger(event.id, idx, choice.label);
        } catch (e) { console.warn('[EventOverlay] Storyline trigger error:', e); }

        if (choice.outcome) {
            setOutcomeText(choice.outcome);
            // Auto-advance after showing outcome
            setTimeout(() => {
                if (isLastStep) onComplete?.({ choiceIndex: idx, choice });
                else advanceStep();
            }, 2500);
        } else {
            setTimeout(() => {
                if (isLastStep) onComplete?.({ choiceIndex: idx, choice });
                else advanceStep();
            }, 500);
        }
    };

    if (!step) return null;

    return (
        <div className="bb-event-overlay" onClick={handleClick}>
            <div className="bb-event-panel" onClick={e => e.stopPropagation()}>
                {/* Event title bar */}
                <div className="bb-event-header">
                    <span className="bb-event-tag">EVENT</span>
                    <span className="bb-event-title">{event.title}</span>
                    <span className="bb-event-progress">{stepIndex + 1}/{steps.length}</span>
                </div>

                {/* Speaker label for dialogue */}
                {step.type === 'dialogue' && step.speakerName && (
                    <div className="bb-event-speaker">{step.speakerName}</div>
                )}

                {/* Main text area */}
                <div className="bb-event-text">
                    {displayedText}
                    {isTyping && <span className="bb-event-cursor">▌</span>}
                </div>

                {/* Stat change indicator */}
                {step.type === 'stat_change' && step.changes && (
                    <div className="bb-event-stats">
                        {Object.entries(step.changes).map(([stat, val]) => (
                            <span key={stat} className={`bb-event-stat ${val > 0 ? 'positive' : 'negative'}`}>
                                {stat}: {val > 0 ? '+' : ''}{val}
                            </span>
                        ))}
                    </div>
                )}

                {/* Choice buttons */}
                {step.type === 'choice' && !selectedChoice && selectedChoice !== 0 && (
                    <div className="bb-event-choices">
                        {(step.choices || []).map((choice, idx) => (
                            <button
                                key={idx}
                                className="bb-event-choice-btn"
                                onClick={() => handleChoice(choice, idx)}
                            >
                                {choice.label}
                                {choice.effects && (
                                    <span className="bb-event-choice-effects">
                                        {Object.entries(choice.effects).map(([k, v]) =>
                                            `${k}: ${v > 0 ? '+' : ''}${v}`
                                        ).join(', ')}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Outcome text after choice */}
                {outcomeText && (
                    <div className="bb-event-outcome">{outcomeText}</div>
                )}

                {/* Click to continue hint */}
                {step.type !== 'choice' && !isTyping && (
                    <div className="bb-event-hint" onClick={handleClick}>Click to continue</div>
                )}
            </div>
        </div>
    );
}

export { StyleGuideView, EventOverlay };
