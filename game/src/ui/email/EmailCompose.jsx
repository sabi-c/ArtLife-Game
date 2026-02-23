/**
 * EmailCompose.jsx — Right panel: email body, typewriter, tactic chips
 *
 * Displays the current email with typewriter text + cursor. Click to skip.
 * In choosing phase, renders response options:
 * - Static mode: vertical pill-styled choice buttons
 * - Haggle mode: Gmail-style category row -> tactic chips -> dialogue sub-chips
 *
 * Tactic chips use type-color dots (red=emotional, blue=logical, orange=aggressive,
 * green=financial) with no emoji in labels.
 *
 * @see useEmailState.js for state and actions
 * @see haggle_config.js for TACTICS, BLUE_OPTIONS, TACTIC_DIALOGUE_CHOICES
 */

import React from 'react';
import { HAGGLE_TYPES, BATTLE_MENU_CATEGORIES } from '../../data/haggle_config.js';

/** Map haggle types to CSS color classes */
const TYPE_COLORS = {
    [HAGGLE_TYPES.EMOTIONAL]: '#c44',
    [HAGGLE_TYPES.LOGICAL]: '#4488cc',
    [HAGGLE_TYPES.AGGRESSIVE]: '#cc8833',
    [HAGGLE_TYPES.FINANCIAL]: '#44aa66',
};

/**
 * Render email body text with **bold** markdown and line breaks.
 * Bold text renders with accent color via .email-highlight class.
 */
function renderEmailBody(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
        if (line.trim() === '') return <br key={i} />;
        const parts = line.split(/\*\*(.+?)\*\*/g);
        return (
            <p key={i} className="email-line">
                {parts.map((part, j) =>
                    j % 2 === 1
                        ? <strong key={j} className="email-highlight">{part}</strong>
                        : part
                )}
            </p>
        );
    });
}

export default function EmailCompose({
    mode, phase, currentEmail, displayedText, outcomeText, subject,
    step, skipTypewriter, handleStaticChoice, interpolate, fmtNum, stripEmoji,
    // Haggle-specific
    haggleState, categorizedTactics, selectedCategory, selectedTactic,
    dialogueChoices, selectCategory, selectTactic, executeTactic,
    acceptDeal, walkAway, handleClose,
}) {
    const isTyping = (phase === 'reading' || phase === 'receiving')
        && displayedText.length < (currentEmail?.body ? interpolate(currentEmail.body).length : 0);

    return (
        <div className="email-compose" onClick={isTyping ? skipTypewriter : undefined}>
            {/* Email header info */}
            {currentEmail && (
                <div className="email-sender">
                    <div className="email-sender-row">
                        <span className="email-sender-label">From:</span>
                        <span className="email-sender-value">{currentEmail.fromName || currentEmail.from}</span>
                    </div>
                    <div className="email-sender-row">
                        <span className="email-sender-label">To:</span>
                        <span className="email-sender-value">You</span>
                    </div>
                    <div className="email-sender-row">
                        <span className="email-sender-label">Subject:</span>
                        <span className="email-sender-value">{subject}</span>
                    </div>
                </div>
            )}

            {/* Reading / Receiving: typewriter body */}
            {(phase === 'reading' || phase === 'receiving') && (
                <div className="email-body" style={{ cursor: isTyping ? 'pointer' : 'default' }}>
                    {renderEmailBody(displayedText)}
                    {isTyping && <span className="email-cursor">|</span>}
                </div>
            )}

            {/* Sending phase */}
            {phase === 'sending' && (
                <div className="email-body">
                    <div className="email-sent-msg">Message sent</div>
                </div>
            )}

            {/* Waiting phase */}
            {phase === 'waiting' && (
                <div className="email-body">
                    <div className="email-waiting">
                        <span className="email-dots">...</span>
                    </div>
                </div>
            )}

            {/* Complete phase */}
            {phase === 'complete' && (
                <div className="email-body">
                    {currentEmail && displayedText && renderEmailBody(displayedText)}
                    {outcomeText && (
                        <div className="email-outcome">
                            <strong>{outcomeText}</strong>
                        </div>
                    )}
                    <button className="email-done-btn" onClick={handleClose}>
                        Close Inbox
                    </button>
                </div>
            )}

            {/* Choosing phase */}
            {phase === 'choosing' && (
                <div className="email-choosing">
                    <div className="email-body email-body--choosing">
                        {currentEmail && renderEmailBody(interpolate(currentEmail.body))}
                    </div>

                    {/* Static mode: pill choice buttons */}
                    {mode === 'static' && step?.type === 'choice' && (
                        <div className="email-actions">
                            {step.choices.map((choice, i) => (
                                <button
                                    key={i}
                                    className="email-action-btn"
                                    onClick={() => handleStaticChoice(choice, i)}
                                >
                                    {choice.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Haggle mode: Gmail-style tactic chips */}
                    {mode === 'haggle' && (
                        <div className="email-tactic-panel">
                            {/* Category row */}
                            <div className="email-category-row">
                                {BATTLE_MENU_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        className={`email-category-chip${selectedCategory === cat.id ? ' email-category-chip--active' : ''}`}
                                        onClick={() => selectCategory(cat.id)}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            {/* TACTICS category expanded */}
                            {selectedCategory === 'tactics' && !selectedTactic && (
                                <div className="email-chip-grid">
                                    {(categorizedTactics.tactics || []).map(tactic => (
                                        <button
                                            key={tactic.id}
                                            className={`email-tactic-chip${tactic.locked ? ' email-tactic-chip--locked' : ''}`}
                                            onClick={() => selectTactic(tactic)}
                                            disabled={tactic.locked}
                                            title={tactic.locked ? tactic.lockReason : tactic.description}
                                        >
                                            <span
                                                className="email-type-dot"
                                                style={{ backgroundColor: TYPE_COLORS[tactic.type] || '#888' }}
                                            />
                                            {stripEmoji(tactic.label)}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* POWERS category expanded */}
                            {selectedCategory === 'powers' && !selectedTactic && (
                                <div className="email-chip-grid">
                                    {(categorizedTactics.powers || []).map(tactic => (
                                        <button
                                            key={tactic.id}
                                            className={`email-tactic-chip${tactic.locked ? ' email-tactic-chip--locked' : ''}`}
                                            onClick={() => selectTactic(tactic)}
                                            disabled={tactic.locked}
                                            title={tactic.locked ? tactic.lockReason : tactic.description}
                                        >
                                            <span
                                                className="email-type-dot"
                                                style={{ backgroundColor: TYPE_COLORS[tactic.type] || '#888' }}
                                            />
                                            {stripEmoji(tactic.label)}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* INFO category: inline stat readout */}
                            {selectedCategory === 'info' && haggleState && (
                                <div className="email-info-panel">
                                    <div className="email-info-row">
                                        <span>Dealer</span>
                                        <span>{haggleState.dealerName} ({haggleState.dealerType})</span>
                                    </div>
                                    <div className="email-info-row">
                                        <span>Asking Price</span>
                                        <span>${fmtNum(haggleState.askingPrice)}</span>
                                    </div>
                                    <div className="email-info-row">
                                        <span>Your Offer</span>
                                        <span>${fmtNum(haggleState.currentOffer)}</span>
                                    </div>
                                    <div className="email-info-row">
                                        <span>Gap</span>
                                        <span>${fmtNum(haggleState.gap)} ({haggleState.askingPrice > 0 ? Math.round((haggleState.gap / haggleState.askingPrice) * 100) : 0}%)</span>
                                    </div>
                                    <div className="email-info-row">
                                        <span>Round</span>
                                        <span>{haggleState.round} / {haggleState.maxRounds}</span>
                                    </div>
                                    <div className="email-info-row">
                                        <span>Patience</span>
                                        <span>{haggleState.patience} / {haggleState.maxPatience}</span>
                                    </div>
                                </div>
                            )}

                            {/* DEAL category: accept + walk away */}
                            {selectedCategory === 'deal' && haggleState && (
                                <div className="email-deal-panel">
                                    <button
                                        className="email-deal-btn email-deal-btn--accept"
                                        onClick={acceptDeal}
                                    >
                                        Accept at ${fmtNum(haggleState.askingPrice)}
                                    </button>
                                    <button
                                        className="email-deal-btn email-deal-btn--walk"
                                        onClick={walkAway}
                                    >
                                        Walk Away
                                    </button>
                                </div>
                            )}

                            {/* Dialogue sub-chips after selecting a tactic */}
                            {selectedTactic && dialogueChoices.length > 0 && (
                                <div className="email-dialogue-choices">
                                    <div className="email-dialogue-title">
                                        How do you {stripEmoji(selectedTactic.label).toLowerCase()}?
                                    </div>
                                    {dialogueChoices.map(choice => (
                                        <button
                                            key={choice.id}
                                            className="email-dialogue-chip"
                                            onClick={() => executeTactic(selectedTactic.id, choice.id)}
                                        >
                                            {choice.line}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Direct execution if no dialogue choices for this tactic */}
                            {selectedTactic && dialogueChoices.length === 0 && (
                                <div className="email-dialogue-choices">
                                    <button
                                        className="email-dialogue-chip"
                                        onClick={() => executeTactic(selectedTactic.id)}
                                    >
                                        Use {stripEmoji(selectedTactic.label)}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
