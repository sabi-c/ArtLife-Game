/**
 * SocialBattle.js — Resolution logic for the gallery social-battle mechanic.
 *
 * The protagonist approaches an NPC in NewWorldScene (within 2 tiles, facing them).
 * Interaction triggers SocialBattleOverlay (React) which shows 4 buttons:
 *   - Deep    — opens dialogue tree (managed by DialogueEngine; slow but high-XP)
 *   - Quick   — single-line zinger, deterministic outcome
 *   - Flirt   — flirtatious overture, deterministic outcome
 *   - Inquire — request information, deterministic outcome
 *
 * Each move queries the NPC's social profile (vain, intellectual, flirty, guarded)
 * and the player's stats (Charm, Wit, Information). Move success grants XP toward
 * one of four skill trees and modifies the NPC's relationship score.
 *
 * This module is pure logic — no React, no Phaser. Easy to test.
 */

// ─── NPC social profiles ──────────────────────────────────────────────────────
// Each profile lists which moves land cleanly, which land awkwardly, and which fall flat.
export const NPC_PROFILES = {
    vain: {
        label: 'Vain',
        description: 'Likes being seen, likes being admired, listens for the angle.',
        landings: {
            deep: 'mixed',     // they like to feel deep but rarely are
            quick: 'awkward',  // doesn't satisfy the appetite
            flirt: 'clean',    // primary register
            inquire: 'mixed',  // depends on what's asked
        },
    },
    intellectual: {
        label: 'Intellectual',
        description: 'Wants to be respected for what they know. Rewards engagement.',
        landings: {
            deep: 'clean',
            quick: 'mixed',
            flirt: 'awkward',
            inquire: 'clean',
        },
    },
    flirty: {
        label: 'Flirty',
        description: 'Reads social cues fast. Trades in chemistry.',
        landings: {
            deep: 'mixed',
            quick: 'clean',
            flirt: 'clean',
            inquire: 'mixed',
        },
    },
    guarded: {
        label: 'Guarded',
        description: 'Has been burned. Trust earned slowly, lost fast.',
        landings: {
            deep: 'mixed',
            quick: 'awkward',
            flirt: 'awkward',
            inquire: 'mixed',
        },
    },
};

// ─── Moves ────────────────────────────────────────────────────────────────────
export const MOVES = {
    deep: {
        key: 'deep',
        label: 'Deep',
        verb: 'Open a real conversation',
        stat: 'charm',
        skillTree: 'conversation',
        baseSuccess: 0.55,
        xpReward: { clean: 14, mixed: 7, awkward: 2 },
        // Deep dialogue triggers a DialogueEngine session — return value indicates that.
        triggersDialogue: true,
    },
    quick: {
        key: 'quick',
        label: 'Quick',
        verb: 'Land a one-line zinger',
        stat: 'wit',
        skillTree: 'wit',
        baseSuccess: 0.60,
        xpReward: { clean: 10, mixed: 5, awkward: 1 },
        triggersDialogue: false,
    },
    flirt: {
        key: 'flirt',
        label: 'Flirt',
        verb: 'Make a flirtatious overture',
        stat: 'charm',
        skillTree: 'charm',
        baseSuccess: 0.50,
        xpReward: { clean: 12, mixed: 6, awkward: 1 },
        triggersDialogue: false,
    },
    inquire: {
        key: 'inquire',
        label: 'Inquire',
        verb: 'Ask for information',
        stat: 'information',
        skillTree: 'information',
        baseSuccess: 0.55,
        xpReward: { clean: 10, mixed: 5, awkward: 2 },
        triggersDialogue: false,
    },
};

/**
 * Resolve a single social-battle move.
 *
 * @param {object} args
 * @param {string} args.moveKey       — one of 'deep', 'quick', 'flirt', 'inquire'
 * @param {object} args.npcProfile    — NPC_PROFILES[type] object (or matches the same shape)
 * @param {object} args.playerStats   — { charm, wit, information, taste, capital, reputation }
 * @param {number} [args.npcMood=0.5] — 0..1 — current mood toward player (higher = more receptive)
 * @returns {object} {
 *   outcome: 'clean' | 'mixed' | 'awkward',
 *   relationshipDelta: -2..+2,
 *   xp: { tree, amount },
 *   triggersDialogue: bool,
 *   line: string,            // a flavor line for the UI
 * }
 */
export function resolveMove({ moveKey, npcProfile, playerStats, npcMood = 0.5 }) {
    const move = MOVES[moveKey];
    if (!move) {
        throw new Error(`SocialBattle.resolveMove: unknown moveKey "${moveKey}"`);
    }

    const profile = npcProfile?.landings ? npcProfile : NPC_PROFILES.vain;
    const baseLanding = profile.landings[moveKey] || 'mixed';

    // Player stat modifier — bonus per stat point above 5, penalty below.
    const statValue = Math.max(0, Math.min(10, playerStats?.[move.stat] ?? 5));
    const statBonus = (statValue - 5) * 0.05; // ±0.25 across 0..10

    // Mood modifier — happy NPC tolerates more, guarded NPC tolerates less.
    const moodBonus = (npcMood - 0.5) * 0.30; // ±0.15

    // Roll. Use Math.random — pure logic, no global state.
    const successScore = move.baseSuccess + statBonus + moodBonus;
    const roll = Math.random();

    let outcome;
    if (baseLanding === 'clean') {
        // Easy zone — most rolls clean, awkward only on truly low stats.
        outcome = roll < (successScore + 0.20) ? 'clean'
                : roll < (successScore + 0.40) ? 'mixed'
                : 'awkward';
    } else if (baseLanding === 'awkward') {
        // Hard zone — most rolls awkward, clean only on truly high stats.
        outcome = roll < (successScore - 0.20) ? 'clean'
                : roll < (successScore + 0.10) ? 'mixed'
                : 'awkward';
    } else {
        // Neutral zone — roughly equal split based on stat.
        outcome = roll < successScore ? 'clean'
                : roll < (successScore + 0.30) ? 'mixed'
                : 'awkward';
    }

    const xp = { tree: move.skillTree, amount: move.xpReward[outcome] };
    const relationshipDelta = outcome === 'clean' ? 2
        : outcome === 'mixed' ? 0
        : -1;

    const line = pickLine(move, outcome, profile);

    return {
        outcome,
        relationshipDelta,
        xp,
        triggersDialogue: move.triggersDialogue && outcome !== 'awkward',
        line,
    };
}

// ─── Flavor lines ──────────────────────────────────────────────────────────────
// Tiny seed of dialogue. The DialogueEngine produces deeper sequences when triggered.
const FLAVOR = {
    deep: {
        clean:   ['"That is exactly the thing I keep coming back to."',
                  '"You read it the same way I did."',
                  '"Most people miss that part."'],
        mixed:   ['"…go on."',
                  '"You think so."',
                  '"Possibly."'],
        awkward: ['"This isn\'t really the venue."',
                  '"That\'s a long answer."',
                  '"Have we met?"'],
    },
    quick: {
        clean:   ['(They actually laugh.)',
                  '"You\'re funnier than the room."',
                  '"Ha. OK."'],
        mixed:   ['(A polite smile.)',
                  '"Mm."',
                  '"Sure."'],
        awkward: ['(They look past you.)',
                  '"Right."',
                  '(Silence.)'],
    },
    flirt: {
        clean:   ['"That is a line, and yet."',
                  '"Where are you sitting later?"',
                  '"You\'re bold. I like that."'],
        mixed:   ['"That\'s sweet."',
                  '"Hm."',
                  '"We\'ll see."'],
        awkward: ['(They turn slightly away.)',
                  '"I\'m here with someone."',
                  '"That\'s not what I came here for."'],
    },
    inquire: {
        clean:   ['"Yes — Schiff\'s receivership filing dropped Friday."',
                  '"Off the record, the Hauser shipment is overdue."',
                  '"Look at Gagosian\'s payables. That\'s the tell."'],
        mixed:   ['"I\'ve heard things."',
                  '"Maybe."',
                  '"Ask me again at the after."'],
        awkward: ['"I wouldn\'t know."',
                  '"Why are you asking?"',
                  '"That\'s not my area."'],
    },
};

function pickLine(move, outcome, _profile) {
    const bucket = FLAVOR[move.key]?.[outcome] || ['…'];
    return bucket[Math.floor(Math.random() * bucket.length)];
}

// ─── Convenience: derive NPC profile type from a known NPC sprite key ─────────
export function profileForSpriteKey(spriteKey) {
    const map = {
        npc_critic: 'intellectual',
        npc_curator: 'intellectual',
        npc_artist: 'intellectual',
        npc_collector: 'vain',
        npc_patron: 'vain',
        npc_gallerist: 'flirty',
        npc_handler: 'guarded',
        npc_guard: 'guarded',
        npc_assistant: 'flirty',
        npc_visitor: 'vain',
        npc_dealer: 'guarded',
    };
    const key = map[spriteKey] || 'vain';
    return { type: key, ...NPC_PROFILES[key] };
}
