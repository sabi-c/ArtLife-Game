/**
 * AgentGuide.jsx — AI agent that guides players through reply options
 *
 * Renders a small agent icon with typewriter prompts and cascading option
 * pills. Handles the full selection flow: category -> tactic -> dialogue.
 * Uses tear-sheet-dark styling with staggered fade-in animations.
 *
 * Flow:
 *   agentPrompting -> choosingCategory -> agentTacticPrompt -> choosingTactic
 *   -> choosingDialogue -> (user picks, parent handles composingReply)
 *
 * @see useEmailState.js for phase machine and actions
 * @see haggle_config.js for tactic/power data structures
 */

import React from 'react';
import { HAGGLE_TYPES, BATTLE_MENU_CATEGORIES } from '../../data/haggle_config.js';

/** Map haggle types to CSS color classes */
const TYPE_COLORS = {
    [HAGGLE_TYPES.EMOTIONAL]: 'var(--email-type-emotional)',
    [HAGGLE_TYPES.LOGICAL]: 'var(--email-type-logical)',
    [HAGGLE_TYPES.AGGRESSIVE]: 'var(--email-type-aggressive)',
    [HAGGLE_TYPES.FINANCIAL]: 'var(--email-type-financial)',
};

/**
 * @param {Object} props - Destructured from useEmailState return
 */
export default function AgentGuide({
    phase, mode, agentDisplayed, agentText,
    skipAgentTypewriter, categorizedTactics, selectedCategory,
    selectedTactic, dialogueChoices,
    selectCategory, selectTactic, executeDialogueChoice, executeTactic,
    acceptDeal, walkAway, haggleState, fmtNum, stripEmoji, goBack,
    // Static mode
    step, handleStaticChoice,
}) {
    const isAgentTyping = (phase === 'agentPrompting' || phase === 'agentTacticPrompt' || phase === 'choosingDialoguePrompt')
        && agentDisplayed.length < (agentText?.length || 0);

    // Determine which phases show the agent section
    const showAgent = phase === 'agentPrompting' || phase === 'choosingCategory'
        || phase === 'agentTacticPrompt' || phase === 'choosingTactic'
        || phase === 'choosingDialoguePrompt' || phase === 'choosingDialogue';

    // Static mode choosing — no agent, just pills
    if (mode === 'static' && phase === 'choosingCategory') {
        return (
            <div className="email-agent-section">
                {step?.type === 'choice' && (
                    <div className="email-option-pills">
                        {step.choices.map((choice, i) => (
                            <button
                                key={i}
                                className="email-pill"
                                style={{ animationDelay: `${i * 80}ms` }}
                                onClick={() => handleStaticChoice(choice, i)}
                            >
                                {choice.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (!showAgent || mode !== 'haggle') return null;

    // Can go back from tactic/dialogue selection
    const canGoBack = phase === 'choosingTactic' || phase === 'agentTacticPrompt'
        || phase === 'choosingDialogue' || phase === 'choosingDialoguePrompt';

    return (
        <div className="email-agent-section" onClick={isAgentTyping ? skipAgentTypewriter : undefined}>
            {/* Agent icon + text */}
            <div className="email-agent">
                <div className="email-agent-icon">A</div>
                <div className="email-agent-content">
                    {agentDisplayed && (
                        <div className="email-agent-text">
                            {agentDisplayed}
                            {isAgentTyping && <span className="email-cursor">|</span>}
                        </div>
                    )}

                    {/* Category pills (choosingCategory phase) */}
                    {phase === 'choosingCategory' && (
                        <div className="email-option-pills">
                            {BATTLE_MENU_CATEGORIES.map((cat, i) => (
                                <button
                                    key={cat.id}
                                    className="email-pill"
                                    style={{ animationDelay: `${i * 80}ms` }}
                                    onClick={() => selectCategory(cat.id)}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tactic cards (choosingTactic phase) */}
                    {phase === 'choosingTactic' && selectedCategory === 'tactics' && (
                        <div className="email-tactic-list">
                            {(categorizedTactics.tactics || []).map((tactic, i) => (
                                <button
                                    key={tactic.id}
                                    className={`email-tactic-card${tactic.locked ? ' email-tactic-card--locked' : ''}`}
                                    style={{ animationDelay: `${i * 60}ms` }}
                                    onClick={() => !tactic.locked && selectTactic(tactic)}
                                    disabled={tactic.locked}
                                >
                                    <div className="email-tactic-name">
                                        <span
                                            className="email-type-dot"
                                            style={{ backgroundColor: TYPE_COLORS[tactic.type] || '#888' }}
                                        />
                                        {stripEmoji(tactic.label)}
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
                    )}

                    {/* Power cards (choosingTactic phase, powers category) */}
                    {phase === 'choosingTactic' && selectedCategory === 'powers' && (
                        <div className="email-tactic-list">
                            {(categorizedTactics.powers || []).map((tactic, i) => (
                                <button
                                    key={tactic.id}
                                    className={`email-tactic-card${tactic.locked ? ' email-tactic-card--locked' : ''}`}
                                    style={{ animationDelay: `${i * 60}ms` }}
                                    onClick={() => !tactic.locked && selectTactic(tactic)}
                                    disabled={tactic.locked}
                                >
                                    <div className="email-tactic-name">
                                        <span
                                            className="email-type-dot"
                                            style={{ backgroundColor: TYPE_COLORS[tactic.type] || '#888' }}
                                        />
                                        {stripEmoji(tactic.label)}
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
                    )}

                    {/* Info panel (choosingTactic phase, info category) */}
                    {phase === 'choosingTactic' && selectedCategory === 'info' && haggleState && (
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

                    {/* Deal panel (choosingTactic phase, deal category) */}
                    {phase === 'choosingTactic' && selectedCategory === 'deal' && haggleState && (
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

                    {/* Dialogue sub-choices (choosingDialogue phase) */}
                    {phase === 'choosingDialogue' && dialogueChoices.length > 0 && (
                        <div className="email-option-pills email-option-pills--dialogue">
                            {dialogueChoices.map((choice, i) => (
                                <button
                                    key={choice.id}
                                    className="email-pill email-pill--dialogue"
                                    style={{ animationDelay: `${i * 80}ms` }}
                                    onClick={() => executeDialogueChoice(choice.id)}
                                >
                                    {choice.line}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Back button */}
                    {canGoBack && (phase === 'choosingTactic' || phase === 'choosingDialogue') && (
                        <button className="email-back-btn" onClick={goBack}>
                            Back
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
