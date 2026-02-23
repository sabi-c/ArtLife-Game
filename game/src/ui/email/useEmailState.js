/**
 * useEmailState.js — Unified state machine for email overlay
 *
 * Normalizes both static (scripted deal events) and haggle (HaggleManager-driven)
 * negotiation flows into a single phase machine. Provides typewriter text,
 * thread accumulation, tactic selection, and phase transitions.
 *
 * Phases: reading -> choosing -> sending -> waiting -> receiving -> complete
 *
 * Static mode: reads event.steps[], advances stepIndex on choice
 * Haggle mode: calls HaggleManager.executeTactic(), reads HaggleManager.getState()
 *
 * @see EmailOverlay.jsx for the top-level shell that consumes this hook
 * @see HaggleManager.js for the negotiation engine
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState } from '../../managers/GameState.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { HaggleManager } from '../../managers/HaggleManager.js';
import { TACTICS, BLUE_OPTIONS, TACTIC_DIALOGUE_CHOICES, BATTLE_MENU_CATEGORIES } from '../../data/haggle_config.js';

/** Strip emoji from labels for clean professional display */
const stripEmoji = (str) =>
    str.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]|[★⭐⚔️]/gu, '').trim();

/** Format currency values */
const fmtNum = (val) => val?.toLocaleString() || '0';

/** Generate pseudo-random timestamps from message index */
const getTime = (idx) => {
    const baseHour = 10;
    const min = (idx * 13 + 7) % 60;
    const hour = baseHour + Math.floor(idx / 3);
    return `${hour}:${min.toString().padStart(2, '0')} AM`;
};

/** Render text with {{playerName}} interpolation */
const interpolate = (text) => {
    const playerName = GameState.state?.playerName || 'The Dealer';
    return (text || '').replace(/\{\{playerName\}\}/g, playerName);
};

/**
 * @param {Object} params
 * @param {'static'|'haggle'} params.mode
 * @param {Object} [params.event] - Static deal event (when mode='static')
 * @param {Object} [params.haggleInfo] - HaggleManager start result (when mode='haggle')
 * @param {Function} params.onComplete - Called when overlay should close
 */
export function useEmailState({ mode, event, haggleInfo, onComplete }) {
    // Phase machine
    const [phase, setPhase] = useState('reading');

    // Thread of all messages exchanged
    const [thread, setThread] = useState([]);

    // Current email being displayed in the compose/read pane
    const [currentEmail, setCurrentEmail] = useState(null);

    // Typewriter progress
    const [displayedText, setDisplayedText] = useState('');
    const typingRef = useRef(null);

    // Outcome text shown at completion
    const [outcomeText, setOutcomeText] = useState(null);

    // Selected message in thread (for click-to-view)
    const [selectedMessageId, setSelectedMessageId] = useState(null);

    // Static mode: step tracking
    const [stepIndex, setStepIndex] = useState(0);
    const [selectedChoice, setSelectedChoice] = useState(null);

    // Haggle mode: derived state
    const [haggleState, setHaggleState] = useState(null);
    const [availableTactics, setAvailableTactics] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedTactic, setSelectedTactic] = useState(null);

    // Message ID counter
    const msgIdRef = useRef(0);
    const nextMsgId = () => `msg-${++msgIdRef.current}`;

    // ── Derived values ──
    const steps = event?.steps || [];
    const step = steps[stepIndex];
    const subject = mode === 'static'
        ? (event?.emailSubject || event?.title || 'No Subject')
        : `Re: Inquiry ${haggleInfo?.work?.title || 'Artwork'}`;

    // ── Initialize ──
    useEffect(() => {
        if (mode === 'static') {
            if (steps.length > 0 && steps[0].type === 'email') {
                setCurrentEmail(steps[0]);
                setPhase('reading');
            }
        } else if (mode === 'haggle') {
            if (!haggleInfo) return;
            const st = HaggleManager.getState();
            setHaggleState(st);
            setAvailableTactics(HaggleManager.getAvailableTactics());
            setCurrentEmail({
                fromName: haggleInfo.dealerName,
                body: haggleInfo.openingDialogue,
            });
            setPhase('reading');
        }
    }, []); // Run once on mount

    // ── Refresh haggle state helper ──
    const refreshHaggle = useCallback(() => {
        setHaggleState(HaggleManager.getState());
        setAvailableTactics(HaggleManager.getAvailableTactics());
    }, []);

    // ── Typewriter effect ──
    useEffect(() => {
        if (phase !== 'reading' && phase !== 'receiving') return;
        if (!currentEmail?.body) return;

        const text = interpolate(currentEmail.body);
        let i = 0;
        setDisplayedText('');

        if (typingRef.current) clearInterval(typingRef.current);

        typingRef.current = setInterval(() => {
            i += 1;
            setDisplayedText(text.slice(0, i));
            if (i >= text.length) {
                clearInterval(typingRef.current);
                typingRef.current = null;
                onTypewriterComplete();
            }
        }, 25); // 25ms/char for polished feel

        return () => {
            if (typingRef.current) clearInterval(typingRef.current);
        };
    }, [phase, currentEmail]);

    /** Called when typewriter finishes (or is skipped) */
    const onTypewriterComplete = useCallback(() => {
        if (mode === 'static') {
            if (phase === 'reading') {
                const nextStep = steps[stepIndex + 1];
                if (nextStep?.type === 'choice') {
                    setStepIndex(s => s + 1);
                    setPhase('choosing');
                } else if (stepIndex >= steps.length - 1) {
                    setPhase('complete');
                } else {
                    setStepIndex(s => s + 1);
                }
            } else if (phase === 'receiving') {
                const nextIdx = stepIndex + 1;
                if (nextIdx < steps.length) {
                    setStepIndex(nextIdx);
                } else {
                    setPhase('complete');
                }
            }
        } else if (mode === 'haggle') {
            if (phase === 'reading') {
                setPhase('choosing');
            } else if (phase === 'receiving') {
                const st = HaggleManager.getState();
                if (st?.resolved) {
                    setPhase('complete');
                    const isDeal = st.result === 'deal';
                    setOutcomeText(isDeal
                        ? `Deal closed at $${fmtNum(st.finalPrice)}`
                        : 'Negotiation collapsed.');
                } else {
                    setPhase('choosing');
                }
            }
        }
    }, [mode, phase, stepIndex, steps]);

    // ── Process static step changes ──
    useEffect(() => {
        if (mode !== 'static') return;
        if (!step) return;
        if (step.type === 'email' && step.direction === 'incoming') {
            setCurrentEmail(step);
            setPhase('reading');
        }
    }, [stepIndex]);

    // ── Skip typewriter on click ──
    const skipTypewriter = useCallback(() => {
        if (phase !== 'reading' && phase !== 'receiving') return;
        if (!currentEmail?.body) return;

        if (typingRef.current) {
            clearInterval(typingRef.current);
            typingRef.current = null;
        }
        setDisplayedText(interpolate(currentEmail.body));
        onTypewriterComplete();
    }, [phase, currentEmail, onTypewriterComplete]);

    // ── Add message to thread ──
    const addToThread = useCallback((fromName, body, direction) => {
        const id = nextMsgId();
        setThread(prev => {
            const newThread = [...prev, {
                id,
                fromName,
                body: interpolate(body),
                direction,
                time: getTime(prev.length),
            }];
            return newThread;
        });
        setSelectedMessageId(id);
        return id;
    }, []);

    // ── Static mode: handle choice ──
    const handleStaticChoice = useCallback((choice, idx) => {
        setSelectedChoice(idx);

        // Apply effects
        if (choice.effects) {
            try { GameState.applyEffects(choice.effects); }
            catch (e) { console.warn('[EmailOverlay] Effect error:', e); }
        }

        // Add incoming email to thread
        if (currentEmail) {
            addToThread(
                currentEmail.fromName || currentEmail.from,
                currentEmail.body,
                'incoming'
            );
        }

        // Add player reply to thread
        if (choice.emailBody) {
            addToThread('You', choice.emailBody, 'outgoing');
        }

        setPhase('sending');

        setTimeout(() => {
            if (choice.npcResponse) {
                setPhase('waiting');
                setTimeout(() => {
                    setCurrentEmail(choice.npcResponse);
                    setDisplayedText('');
                    setPhase('receiving');
                }, 1500);
            } else if (choice.outcome) {
                setOutcomeText(choice.outcome);
                setPhase('complete');
            } else {
                setPhase('complete');
            }
        }, 800); // Send animation duration
    }, [currentEmail, addToThread]);

    // ── Haggle mode: select category ──
    const selectCategory = useCallback((categoryId) => {
        setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
        setSelectedTactic(null);
    }, [selectedCategory]);

    // ── Haggle mode: select tactic (shows dialogue choices) ──
    const selectTactic = useCallback((tactic) => {
        if (tactic.locked) return;
        setSelectedTactic(tactic);
    }, []);

    // ── Haggle mode: execute tactic with optional dialogue choice ──
    const executeTactic = useCallback((tacticId, dialogueChoiceId) => {
        // Add NPC's last email to thread
        if (currentEmail) {
            addToThread(currentEmail.fromName, currentEmail.body, 'incoming');
        }

        // Find the tactic for a descriptive player reply
        const allTactics = HaggleManager.getAvailableTactics();
        const tactic = allTactics.find(t => t.id === tacticId);

        // Build player reply text
        let playerReplyText;
        if (dialogueChoiceId) {
            const choices = TACTIC_DIALOGUE_CHOICES[tacticId];
            const chosen = choices?.find(c => c.id === dialogueChoiceId);
            playerReplyText = chosen?.line || `Let's discuss this further.`;
        } else {
            playerReplyText = tactic
                ? `Let's discuss this further. I'd like to ${stripEmoji(tactic.label).toLowerCase()}.`
                : `Let's discuss this further.`;
        }
        addToThread('You', playerReplyText, 'outgoing');

        setPhase('sending');

        // Execute the tactic in HaggleManager
        const roundResult = HaggleManager.executeTactic(tacticId);
        refreshHaggle();

        // Reset tactic selection
        setSelectedTactic(null);
        setSelectedCategory(null);

        setTimeout(() => {
            setPhase('waiting');
            setTimeout(() => {
                let nextBody = roundResult.dialogue;

                if (roundResult.dealReached || roundResult.dealFailed) {
                    nextBody += `\n\n${roundResult.finalDialogue}`;
                }

                setCurrentEmail({
                    fromName: haggleInfo.dealerName,
                    body: nextBody,
                });
                setDisplayedText('');
                setPhase('receiving');
            }, 1200);
        }, 800);
    }, [currentEmail, haggleInfo, addToThread, refreshHaggle]);

    // ── Haggle mode: accept deal at current price ──
    const acceptDeal = useCallback(() => {
        if (currentEmail) {
            addToThread(currentEmail.fromName, currentEmail.body, 'incoming');
        }
        const st = HaggleManager.getState();
        addToThread('You', `I accept at $${fmtNum(st?.askingPrice)}.`, 'outgoing');

        // Force deal resolution in HaggleManager
        if (HaggleManager.active) {
            HaggleManager.active.resolved = true;
            HaggleManager.active.result = 'deal';
            HaggleManager.active.finalPrice = st?.askingPrice;
        }
        refreshHaggle();

        setOutcomeText(`Deal closed at $${fmtNum(st?.askingPrice)}`);
        setPhase('complete');
    }, [currentEmail, addToThread, refreshHaggle]);

    // ── Haggle mode: walk away ──
    const walkAway = useCallback(() => {
        if (currentEmail) {
            addToThread(currentEmail.fromName, currentEmail.body, 'incoming');
        }
        addToThread('You', 'Thank you for your time, but I\'ll pass.', 'outgoing');

        if (HaggleManager.active) {
            HaggleManager.active.resolved = true;
            HaggleManager.active.result = 'walkaway';
        }
        refreshHaggle();

        setOutcomeText('You walked away from the deal.');
        setPhase('complete');
    }, [currentEmail, addToThread, refreshHaggle]);

    // ── Close handler ──
    const handleClose = useCallback(() => {
        if (mode === 'haggle') {
            const st = HaggleManager.getState();
            if (st?.resolved) {
                HaggleManager.applyResult();
            } else {
                HaggleManager.active = null;
            }
            GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Negotiation ended.');
        }
        onComplete?.({ choiceIndex: selectedChoice });
    }, [mode, selectedChoice, onComplete]);

    // ── Categorized tactics for the chip UI ──
    const categorizedTactics = mode === 'haggle' ? {
        tactics: availableTactics.filter(t => !t.isBlueOption),
        powers: availableTactics.filter(t => t.isBlueOption),
    } : {};

    // ── Dialogue choices for currently selected tactic ──
    const dialogueChoices = selectedTactic
        ? (TACTIC_DIALOGUE_CHOICES[selectedTactic.id] || [])
        : [];

    return {
        // State
        mode,
        phase,
        thread,
        currentEmail,
        displayedText,
        outcomeText,
        selectedMessageId,
        subject,
        step,

        // Haggle-specific
        haggleState,
        availableTactics,
        categorizedTactics,
        selectedCategory,
        selectedTactic,
        dialogueChoices,

        // Actions
        skipTypewriter,
        handleStaticChoice,
        selectCategory,
        selectTactic,
        executeTactic,
        acceptDeal,
        walkAway,
        handleClose,
        setSelectedMessageId,

        // Helpers
        interpolate,
        stripEmoji,
        fmtNum,
    };
}
