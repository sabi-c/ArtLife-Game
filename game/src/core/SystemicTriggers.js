/**
 * SystemicTriggers.js — Fail State Arc System
 *
 * Checks anti-resource thresholds after each week advance and triggers
 * narrative arcs when critical levels are reached. Each arc reshapes
 * gameplay mechanics and opens new narrative paths.
 *
 * Called from WeekEngine.advanceWeek() at the end of the pipeline.
 *
 * Four arcs:
 *   1. Informant  — suspicion >= 80 → legal pressure, asset seizure
 *   2. Auteur     — burnout >= 9   → mental collapse, reputation shift
 *   3. Recession  — marketHeat >= 90 → market crash, price collapse
 *   4. Exile      — NPC favor avg <= -50 → social blacklisting
 */

import { GameState } from '../managers/GameState.js';
import { PhoneManager } from '../managers/PhoneManager.js';
import { ConsequenceScheduler } from '../managers/ConsequenceScheduler.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { useNPCStore } from '../stores/npcStore.js';

// ── Arc tracking (prevents re-firing) ──
const firedArcs = new Set();

/**
 * Check all fail-state thresholds. Call once per advanceWeek().
 * Each arc fires at most once per game session.
 */
export function checkSystemicTriggers() {
    const state = GameState.state;
    if (!state) return null;

    const triggered = [];

    // 1. Informant Arc — Legal Collapse
    if (!firedArcs.has('informant') && state.suspicion >= 80) {
        triggerInformantArc(state);
        triggered.push('informant');
    }

    // 2. Auteur Arc — Mental Collapse
    if (!firedArcs.has('auteur') && state.burnout >= 9) {
        triggerAuteurArc(state);
        triggered.push('auteur');
    }

    // 3. Recession Arc — Market Collapse
    if (!firedArcs.has('recession') && state.marketHeat >= 90) {
        triggerRecessionArc(state);
        triggered.push('recession');
    }

    // 4. Exile Arc — Social Collapse
    if (!firedArcs.has('exile')) {
        const avgFavor = getAverageNPCFavor();
        if (avgFavor <= -50) {
            triggerExileArc(state, avgFavor);
            triggered.push('exile');
        }
    }

    return triggered.length > 0 ? triggered : null;
}

/**
 * Reset arc tracking (for new game).
 */
export function resetSystemicTriggers() {
    firedArcs.clear();
}

// ────────────────────────────────────────────────────────────────────────────
// ARC IMPLEMENTATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Arc 1: The Informant — Suspicion >= 80
 * Legal pressure mounts. Feds are watching. Cash seized, access restricted.
 */
function triggerInformantArc(state) {
    firedArcs.add('informant');
    console.warn('⚡ SYSTEMIC EMERGENCE: Informant Arc triggered (suspicion:', state.suspicion, ')');

    // Immediate: urgent phone message
    PhoneManager.sendMessage({
        from: 'system',
        subject: 'URGENT: Legal Notice',
        body: 'They know. Get out of the gallery now. The feds are coming. Do not pack anything.',
        urgency: 'urgent',
        category: 'alert',
    });

    // Immediate effects: cash penalty, access down
    const seizureAmount = Math.floor(state.cash * 0.3);
    state.cash -= seizureAmount;
    state.access = Math.max(0, state.access - 20);
    GameState.addNews(`FEDERAL INVESTIGATION: $${seizureAmount.toLocaleString()} in assets frozen. Gallery access restricted.`);

    // Schedule follow-up consequences
    ConsequenceScheduler.addRelative(2, 'phone_message', {
        from: 'system',
        subject: 'Legal counsel needed',
        body: 'Your lawyer called. The investigation is widening. You need to lay low and stop dealing in anything questionable.',
        urgency: 'normal',
        category: 'alert',
    }, { sourceEvent: 'informant_arc' });

    ConsequenceScheduler.addRelative(4, 'stat_change', {
        suspicion: -30,
        reputation: -15,
    }, {
        sourceEvent: 'informant_arc',
        condition: () => GameState.state.suspicion > 20,
    });

    ConsequenceScheduler.addRelative(4, 'news', {
        text: 'The investigation has concluded. Some charges dropped, but your reputation in the art world has taken a hit.',
    }, { sourceEvent: 'informant_arc' });

    // Set a flag so other systems can react
    state.flags = state.flags || {};
    state.flags.informantArcActive = true;

    GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Informant Arc triggered — suspicion critical');
}

/**
 * Arc 2: The Auteur — Burnout >= 9
 * Mental collapse. Time skip, stat rebalancing, new creative identity.
 */
function triggerAuteurArc(state) {
    firedArcs.add('auteur');
    console.warn('⚡ SYSTEMIC EMERGENCE: Auteur Arc triggered (burnout:', state.burnout, ')');

    // Immediate: concerned phone message
    PhoneManager.sendMessage({
        from: 'system',
        subject: 'Missed Appointment',
        body: 'You missed our last three sessions. The gallery called and said you locked the doors. Are you okay?',
        urgency: 'normal',
        category: 'personal',
    });

    // Immediate effects: forced rest, taste boost, social cost
    state.forcedRest = true;
    state.taste = Math.min(100, state.taste + 15);
    state.reputation = Math.max(0, state.reputation - 20);
    state.burnout = Math.max(0, state.burnout - 4);
    GameState.addNews('BURNOUT COLLAPSE: You blacked out during the week. When you came to, everything had changed.');

    // Schedule recovery arc
    ConsequenceScheduler.addRelative(1, 'phone_message', {
        from: 'system',
        subject: 'A new perspective',
        body: 'The breakdown gave you clarity. Your eye for art has sharpened, but bridges have been burned.',
        urgency: 'low',
        category: 'personal',
    }, { sourceEvent: 'auteur_arc' });

    ConsequenceScheduler.addRelative(3, 'stat_change', {
        taste: 10,
        burnout: -2,
    }, { sourceEvent: 'auteur_arc' });

    ConsequenceScheduler.addRelative(3, 'news', {
        text: 'Critics are calling your recent acquisitions "visionary." The art world loves a comeback story.',
    }, { sourceEvent: 'auteur_arc' });

    state.flags = state.flags || {};
    state.flags.auteurArcActive = true;

    GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Auteur Arc triggered — burnout critical');
}

/**
 * Arc 3: The Recession — Market Heat >= 90
 * Market crash. All prices drop, panic selling, opportunity for contrarians.
 */
function triggerRecessionArc(state) {
    firedArcs.add('recession');
    console.warn('⚡ SYSTEMIC EMERGENCE: Recession Arc triggered (marketHeat:', state.marketHeat, ')');

    // Immediate: market crash message
    PhoneManager.sendMessage({
        from: 'system',
        subject: 'MARKET CRASH',
        body: 'The bubble has burst. Art indices are down 40%. Galleries are closing. Collectors are panic-selling.',
        urgency: 'urgent',
        category: 'intel',
    });

    // Force bear market
    state.marketState = 'bear';
    state.marketStateTurnsRemaining = 8 + Math.floor(Math.random() * 8);

    // Devalue portfolio
    state.portfolio.forEach(work => {
        work.price = Math.floor(work.price * 0.6);
    });

    // Reduce market heat (crash resets the frenzy)
    state.marketHeat = Math.max(0, state.marketHeat - 40);

    GameState.addNews('MARKET CRASH: Art indices plunge 40%. The speculative frenzy is over. Bargain hunters circle.');

    // Schedule recovery signals
    ConsequenceScheduler.addRelative(3, 'phone_message', {
        from: 'system',
        subject: 'Bottom-fishing opportunity',
        body: 'The smart money is buying now. Prices are at historical lows. This could be the chance of a lifetime.',
        urgency: 'normal',
        category: 'intel',
    }, { sourceEvent: 'recession_arc' });

    ConsequenceScheduler.addRelative(6, 'news', {
        text: 'Market analysts see signs of stabilization. Some sectors are recovering.',
    }, { sourceEvent: 'recession_arc' });

    state.flags = state.flags || {};
    state.flags.recessionArcActive = true;

    GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Recession Arc triggered — market crash');
}

/**
 * Arc 4: The Exile — Average NPC favor <= -50
 * Social exile. Locked out of high-end venues, must rebuild from underground.
 */
function triggerExileArc(state, avgFavor) {
    firedArcs.add('exile');
    console.warn('⚡ SYSTEMIC EMERGENCE: Exile Arc triggered (avg NPC favor:', avgFavor, ')');

    // Immediate: social exile message
    PhoneManager.sendMessage({
        from: 'system',
        subject: 'You\'re out',
        body: 'Word has spread. No one in the art world will take your calls. You\'ve burned every bridge.',
        urgency: 'urgent',
        category: 'personal',
    });

    // Immediate effects
    state.access = Math.max(0, state.access - 30);
    state.reputation = Math.max(0, state.reputation - 25);
    GameState.addNews('SOCIAL EXILE: The art world has turned its back on you. Gallery doors are closing.');

    // Schedule possible redemption path
    ConsequenceScheduler.addRelative(4, 'phone_message', {
        from: 'system',
        subject: 'Underground connections',
        body: 'There are people who don\'t care about your reputation. They care about results. Meet me at the warehouse.',
        urgency: 'normal',
        category: 'intel',
    }, { sourceEvent: 'exile_arc' });

    ConsequenceScheduler.addRelative(6, 'stat_change', {
        access: 10,
        reputation: 5,
    }, {
        sourceEvent: 'exile_arc',
        condition: () => getAverageNPCFavor() > -30,
    });

    state.flags = state.flags || {};
    state.flags.exileArcActive = true;

    GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Exile Arc triggered — social collapse');
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calculate average NPC favor across all met contacts.
 */
function getAverageNPCFavor() {
    const contacts = useNPCStore.getState().contacts;
    const metContacts = contacts.filter(c => c.met);
    if (metContacts.length === 0) return 0;
    const totalFavor = metContacts.reduce((sum, c) => sum + (c.favor || 0), 0);
    return totalFavor / metContacts.length;
}
