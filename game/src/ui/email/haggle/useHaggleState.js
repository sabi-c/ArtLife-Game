/**
 * useEmailState.js — Unified state machine for email overlay
 *
 * Normalizes both static (scripted deal events) and haggle (HaggleManager-driven)
 * negotiation flows into a single phase machine with AI agent guidance.
 *
 * Phases (haggle mode):
 *   reading -> agentPrompting -> choosingCategory -> agentTacticPrompt ->
 *   choosingTactic -> choosingDialogue -> composingReply -> sending ->
 *   waiting -> receiving -> (loop or complete)
 *
 * Phases (static mode):
 *   reading -> choosingCategory -> sending -> waiting -> receiving -> complete
 *
 * @see EmailOverlay.jsx for the top-level shell that consumes this hook
 * @see HaggleManager.js for the negotiation engine
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState } from '../../../managers/GameState.js';
import { GameEventBus, GameEvents } from '../../../managers/GameEventBus.js';
import { HaggleManager } from '../../../managers/HaggleManager.js';
import { TACTICS, BLUE_OPTIONS, TACTIC_DIALOGUE_CHOICES, BATTLE_MENU_CATEGORIES } from '../../../data/haggle_config.js';

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

/** Agent prompt text constants */
const AGENT_PROMPTS = {
    chooseCategory: 'What would you like your reply to be?',
    chooseTactic: (category) => `Here are your ${category.toLowerCase()} options:`,
    chooseDialogue: (tacticLabel) => `How would you like to ${tacticLabel.toLowerCase()}?`,
};

/** Email typewriter speed (ms per character) */
const EMAIL_TYPE_SPEED = 25;
/** Agent typewriter speed — slower for conversational feel */
const AGENT_TYPE_SPEED = 45;

/**
 * @param {Object} params
 * @param {'static'|'haggle'} params.mode
 * @param {Object} [params.event] - Static deal event (when mode='static')
 * @param {Object} [params.haggleInfo] - HaggleManager start result (when mode='haggle')
 * @param {Function} params.onComplete - Called when overlay should close
 */
export function useEmailState({ mode, event, haggleInfo, onComplete }) {
    // ── Phase machine ──
    const [phase, setPhase] = useState('reading');

    // ── Thread of all messages exchanged ──
    const [thread, setThread] = useState([]);

    // ── Current email being displayed ──
    const [currentEmail, setCurrentEmail] = useState(null);

    // ── Email typewriter progress ──
    const [displayedText, setDisplayedText] = useState('');
    const typingRef = useRef(null);

    // ── Agent typewriter progress ──
    const [agentText, setAgentText] = useState('');
    const [agentDisplayed, setAgentDisplayed] = useState('');
    const agentTypingRef = useRef(null);

    // ── Compose (outgoing reply) typewriter ──
    const [composeText, setComposeText] = useState('');
    const [composeDisplayed, setComposeDisplayed] = useState('');
    const composeTypingRef = useRef(null);

    // ── Outcome text shown at completion ──
    const [outcomeText, setOutcomeText] = useState(null);

    // ── Static mode: step tracking ──
    const [stepIndex, setStepIndex] = useState(0);
    const [selectedChoice, setSelectedChoice] = useState(null);

    // ── Haggle mode: derived state ──
    const [haggleState, setHaggleState] = useState(null);
    const [availableTactics, setAvailableTactics] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedTactic, setSelectedTactic] = useState(null);

    // ── Message ID counter ──
    const msgIdRef = useRef(0);
    const nextMsgId = () => `msg-${++msgIdRef.current}`;

    // ── Track round count for agent speed scaling ──
    const roundRef = useRef(0);

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

    // ── Email typewriter effect (reading / receiving phases) ──
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
        }, EMAIL_TYPE_SPEED);

        return () => {
            if (typingRef.current) clearInterval(typingRef.current);
        };
    }, [phase, currentEmail]);

    // ── Agent typewriter effect (agentPrompting / agentTacticPrompt phases) ──
    useEffect(() => {
        if (phase !== 'agentPrompting' && phase !== 'agentTacticPrompt' && phase !== 'choosingDialoguePrompt') return;
        if (!agentText) return;

        let i = 0;
        setAgentDisplayed('');

        if (agentTypingRef.current) clearInterval(agentTypingRef.current);

        // Speed up on subsequent rounds (45ms first round, 30ms after)
        const speed = roundRef.current > 1 ? 30 : AGENT_TYPE_SPEED;

        agentTypingRef.current = setInterval(() => {
            i += 1;
            setAgentDisplayed(agentText.slice(0, i));
            if (i >= agentText.length) {
                clearInterval(agentTypingRef.current);
                agentTypingRef.current = null;
                onAgentTypewriterComplete();
            }
        }, speed);

        return () => {
            if (agentTypingRef.current) clearInterval(agentTypingRef.current);
        };
    }, [phase, agentText]);

    // ── Compose typewriter effect (composingReply phase) ──
    useEffect(() => {
        if (phase !== 'composingReply') return;
        if (!composeText) return;

        let i = 0;
        setComposeDisplayed('');

        if (composeTypingRef.current) clearInterval(composeTypingRef.current);

        composeTypingRef.current = setInterval(() => {
            i += 1;
            setComposeDisplayed(composeText.slice(0, i));
            if (i >= composeText.length) {
                clearInterval(composeTypingRef.current);
                composeTypingRef.current = null;
                onComposeTypewriterComplete();
            }
        }, EMAIL_TYPE_SPEED);

        return () => {
            if (composeTypingRef.current) clearInterval(composeTypingRef.current);
        };
    }, [phase, composeText]);

    /** Called when email typewriter finishes (reading/receiving) */
    const onTypewriterComplete = useCallback(() => {
        if (mode === 'static') {
            if (phase === 'reading') {
                const nextStep = steps[stepIndex + 1];
                if (nextStep?.type === 'choice') {
                    setStepIndex(s => s + 1);
                    // Static mode goes straight to choices, no agent
                    setPhase('choosingCategory');
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
            if (phase === 'reading' || phase === 'receiving') {
                const st = HaggleManager.getState();
                if (phase === 'receiving' && st?.resolved) {
                    setPhase('complete');
                    const isDeal = st.result === 'deal';
                    setOutcomeText(isDeal
                        ? `Deal closed at $${fmtNum(st.finalPrice)}`
                        : 'Negotiation collapsed.');
                } else {
                    // Transition to agent prompting
                    roundRef.current += 1;
                    setAgentText(AGENT_PROMPTS.chooseCategory);
                    setPhase('agentPrompting');
                }
            }
        }
    }, [mode, phase, stepIndex, steps]);

    /** Called when agent typewriter finishes */
    const onAgentTypewriterComplete = useCallback(() => {
        if (phase === 'agentPrompting') {
            setPhase('choosingCategory');
        } else if (phase === 'agentTacticPrompt') {
            setPhase('choosingTactic');
        } else if (phase === 'choosingDialoguePrompt') {
            setPhase('choosingDialogue');
        }
    }, [phase]);

    /** Called when compose typewriter finishes */
    const onComposeTypewriterComplete = useCallback(() => {
        // Add the completed outgoing message to thread
        addToThread('You', composeText, 'outgoing');
        setPhase('sending');
    }, [composeText]);

    // ── Process static step changes ──
    useEffect(() => {
        if (mode !== 'static') return;
        if (!step) return;
        if (step.type === 'email' && step.direction === 'incoming') {
            setCurrentEmail(step);
            setPhase('reading');
        }
    }, [stepIndex]);

    // ── Skip email typewriter on click ──
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

    // ── Skip agent typewriter on click ──
    const skipAgentTypewriter = useCallback(() => {
        if (phase !== 'agentPrompting' && phase !== 'agentTacticPrompt' && phase !== 'choosingDialoguePrompt') return;
        if (!agentText) return;

        if (agentTypingRef.current) {
            clearInterval(agentTypingRef.current);
            agentTypingRef.current = null;
        }
        setAgentDisplayed(agentText);
        onAgentTypewriterComplete();
    }, [phase, agentText, onAgentTypewriterComplete]);

    // ── Skip compose typewriter on click ──
    const skipComposeTypewriter = useCallback(() => {
        if (phase !== 'composingReply') return;
        if (!composeText) return;

        if (composeTypingRef.current) {
            clearInterval(composeTypingRef.current);
            composeTypingRef.current = null;
        }
        setComposeDisplayed(composeText);
        // Add to thread and advance
        addToThread('You', composeText, 'outgoing');
        setPhase('sending');
    }, [phase, composeText]);

    // ── Add message to thread ──
    const addToThread = useCallback((fromName, body, direction) => {
        const id = nextMsgId();
        setThread(prev => [...prev, {
            id,
            fromName,
            body: interpolate(body),
            direction,
            time: getTime(prev.length),
        }]);
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
        }, 800);
    }, [currentEmail, addToThread]);

    // ── Haggle mode: select category ──
    const selectCategory = useCallback((categoryId) => {
        setSelectedCategory(categoryId);
        setSelectedTactic(null);

        // INFO and DEAL show inline, no agent prompt needed
        if (categoryId === 'info' || categoryId === 'deal') {
            setPhase('choosingTactic');
        } else {
            // TACTIC or POWER — agent types tactic intro
            const catLabel = categoryId === 'tactics' ? 'tactic' : 'power';
            setAgentText(AGENT_PROMPTS.chooseTactic(catLabel));
            setPhase('agentTacticPrompt');
        }
    }, []);

    // ── Haggle mode: select tactic ──
    const selectTactic = useCallback((tactic) => {
        if (tactic.locked) return;
        setSelectedTactic(tactic);

        const choices = TACTIC_DIALOGUE_CHOICES[tactic.id] || [];
        if (choices.length > 0) {
            // Agent prompts for dialogue variant
            setAgentText(AGENT_PROMPTS.chooseDialogue(stripEmoji(tactic.label)));
            setPhase('choosingDialoguePrompt');
        } else {
            // No dialogue choices — execute directly
            executeDirectTactic(tactic);
        }
    }, []);

    // ── Execute a tactic directly (no dialogue choices) ──
    const executeDirectTactic = useCallback((tactic) => {
        const replyText = tactic.dialogue
            || `Let's discuss this further. I'd like to ${stripEmoji(tactic.label).toLowerCase()}.`;

        // Add NPC's last email to thread
        if (currentEmail) {
            addToThread(currentEmail.fromName, currentEmail.body, 'incoming');
        }

        // Add player reply
        addToThread('You', replyText, 'outgoing');

        setPhase('sending');

        // Execute in HaggleManager
        const roundResult = HaggleManager.executeTactic(tactic.id);
        refreshHaggle();

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

    // ── Execute from dialogue choice ──
    const executeDialogueChoice = useCallback((dialogueChoiceId) => {
        if (!selectedTactic) return;
        const tacticId = selectedTactic.id;

        const choices = TACTIC_DIALOGUE_CHOICES[tacticId];
        const chosen = choices?.find(c => c.id === dialogueChoiceId);
        const replyText = chosen?.line || `Let's discuss this further.`;

        // Add NPC's last email to thread
        if (currentEmail) {
            addToThread(currentEmail.fromName, currentEmail.body, 'incoming');
        }

        // Add player reply to thread
        addToThread('You', replyText, 'outgoing');

        setPhase('sending');

        // Execute in HaggleManager
        const roundResult = HaggleManager.executeTactic(tacticId);
        refreshHaggle();

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
    }, [selectedTactic, currentEmail, haggleInfo, addToThread, refreshHaggle]);

    // ── Haggle mode: execute tactic (legacy path, kept for compatibility) ──
    const executeTactic = useCallback((tacticId, dialogueChoiceId) => {
        let playerReplyText;
        if (dialogueChoiceId) {
            const choices = TACTIC_DIALOGUE_CHOICES[tacticId];
            const chosen = choices?.find(c => c.id === dialogueChoiceId);
            playerReplyText = chosen?.line || `Let's discuss this further.`;
        } else {
            const allTactics = HaggleManager.getAvailableTactics();
            const tactic = allTactics.find(t => t.id === tacticId);
            playerReplyText = tactic
                ? `Let's discuss this further. I'd like to ${stripEmoji(tactic.label).toLowerCase()}.`
                : `Let's discuss this further.`;
        }

        if (currentEmail) {
            addToThread(currentEmail.fromName, currentEmail.body, 'incoming');
        }
        addToThread('You', playerReplyText, 'outgoing');

        setPhase('sending');

        const roundResult = HaggleManager.executeTactic(tacticId);
        refreshHaggle();

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

    // ── Back navigation ──
    const goBack = useCallback(() => {
        if (phase === 'choosingTactic' || phase === 'agentTacticPrompt') {
            setSelectedCategory(null);
            setSelectedTactic(null);
            setPhase('choosingCategory');
        } else if (phase === 'choosingDialogue' || phase === 'choosingDialoguePrompt') {
            setSelectedTactic(null);
            setPhase('choosingTactic');
        }
    }, [phase]);

    // ── Haggle mode: accept deal at current price ──
    const acceptDeal = useCallback(() => {
        if (currentEmail) {
            addToThread(currentEmail.fromName, currentEmail.body, 'incoming');
        }
        const st = HaggleManager.getState();
        addToThread('You', `I accept at $${fmtNum(st?.askingPrice)}.`, 'outgoing');

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

    // ── Categorized tactics with email body previews ──
    const categorizedTactics = mode === 'haggle' ? {
        tactics: availableTactics.filter(t => !t.isBlueOption).map(t => ({
            ...t,
            dialogueChoices: TACTIC_DIALOGUE_CHOICES[t.id] || [],
            previewText: (TACTIC_DIALOGUE_CHOICES[t.id]?.[0]?.line) || t.dialogue || null,
        })),
        powers: availableTactics.filter(t => t.isBlueOption).map(t => ({
            ...t,
            dialogueChoices: TACTIC_DIALOGUE_CHOICES[t.id] || [],
            previewText: t.dialogue || (TACTIC_DIALOGUE_CHOICES[t.id]?.[0]?.line) || null,
        })),
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
        subject,
        step,

        // Agent state
        agentText,
        agentDisplayed,
        composeDisplayed,

        // Haggle-specific
        haggleState,
        availableTactics,
        categorizedTactics,
        selectedCategory,
        selectedTactic,
        dialogueChoices,

        // Actions
        skipTypewriter,
        skipAgentTypewriter,
        skipComposeTypewriter,
        handleStaticChoice,
        selectCategory,
        selectTactic,
        executeTactic,
        executeDialogueChoice,
        acceptDeal,
        walkAway,
        handleClose,
        goBack,

        // Helpers
        interpolate,
        stripEmoji,
        fmtNum,
    };
}
