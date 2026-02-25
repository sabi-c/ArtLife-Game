/**
 * MarketEventBus.js — Central Pub/Sub Event System
 *
 * Connects the three simulation engines:
 *   1. Market Simulation (price reactions)
 *   2. NPC Relationship/Memory (trust/grudge updates)
 *   3. Deal Negotiation (pricing context)
 *
 * ARCHITECTURE:
 *   Any system can emit events → all subscribers are notified synchronously.
 *   Events carry structured data and are logged for Bloomberg terminal display.
 *
 * EVENT TYPES:
 *   Market Events:
 *     artist_death        — { artistId, week }
 *     scandal             — { artistId?, npcId?, severity: 0-1, description }
 *     museum_acquisition  — { artistId, museum, week }
 *     auction_record      — { artistId, workId, price, week }
 *     recession_start     — { severity: 0-1 }
 *     recession_end       — {}
 *     bubble_pop          — { severity: 0-1 }
 *     fair_success        — { fair, week }
 *     gallery_closure     — { npcId, week }
 *
 *   Player Events:
 *     player_lowballed    — { npcId, amount, askingPrice }
 *     player_flipped      — { npcId, workId, profit, weeksHeld }
 *     player_honored_deal — { npcId, amount }
 *     player_tipped_off   — { npcId, info }
 *     player_bought       — { npcId, workId, price }
 *     player_sold         — { npcId, workId, price }
 *
 *   NPC Events:
 *     npc_betrayal        — { npcId, targetNpcId, type }
 *     npc_gossip          — { fromNpcId, toNpcId, aboutPlayerId?, event }
 *     npc_offer_expired   — { npcId, workId }
 *
 * USAGE:
 *   import { MarketEventBus } from './MarketEventBus.js';
 *   MarketEventBus.on('artist_death', (data) => { ... });
 *   MarketEventBus.emit('artist_death', { artistId: 'artist_03' });
 */

export const EVENT_IMPACTS = {
    // ═══════════════════════════════════════════════════════
    // MARKET EVENTS — Affect prices, heat, NPC behavior
    // ═══════════════════════════════════════════════════════

    // ── Artist-Specific Events ──
    artist_death: {
        priceMultiplier: 1.40,    // +40% for the artist's works
        tierSpillover: 0.05,      // +5% for same-tier artists
        heatDelta: 30,
        decayWeeks: 12,
        npcBuyProbMod: 0.25,      // +25% NPC buy probability for this artist
        npcSellProbMod: -0.15,    // Holders less likely to sell
        affectedTiers: [],        // Empty = affects the artist's own tier
        description: '💀 Artist has passed away. Market revaluation in progress.',
    },
    artist_estate_dispute: {
        priceMultiplier: 0.75,
        tierSpillover: -0.02,
        heatDelta: -20,
        decayWeeks: 16,
        npcSellProbMod: 0.20,     // Estate works flood market
        affectedTiers: [],
        description: '⚖️ Estate dispute freezes authentication. Market uncertainty.',
    },
    scandal: {
        priceMultiplier: 0.80,
        tierSpillover: -0.03,
        heatDelta: -25,
        decayWeeks: 8,
        npcSellProbMod: 0.30,     // Panic selling
        npcBuyProbMod: -0.20,     // Buyers avoid
        affectedTiers: [],
        description: '⚠️ Scandal rocks the art world.',
    },
    forgery_discovery: {
        priceMultiplier: 0.60,    // -40% — devastating
        tierSpillover: -0.05,
        heatDelta: -35,
        decayWeeks: 20,
        npcBuyProbMod: -0.40,     // Nobody wants to buy
        npcSellProbMod: 0.50,     // Everyone dumps
        affectedTiers: [],
        description: '🔍 Forgery ring exposed. Authenticity crisis.',
    },
    museum_acquisition: {
        priceMultiplier: 1.15,
        tierSpillover: 0.02,
        heatDelta: 20,
        decayWeeks: 6,
        npcBuyProbMod: 0.15,
        affectedTiers: [],
        description: '🏛️ Major museum acquisition. Institutional validation.',
    },
    biennial_selection: {
        priceMultiplier: 1.20,
        tierSpillover: 0.03,
        heatDelta: 25,
        decayWeeks: 8,
        npcBuyProbMod: 0.20,
        affectedTiers: ['emerging', 'mid-career'],
        description: '🌍 Venice Biennale selection. International spotlight.',
    },
    auction_record: {
        priceMultiplier: 1.10,
        tierSpillover: 0.04,
        heatDelta: 15,
        decayWeeks: 4,
        npcBuyProbMod: 0.10,
        affectedTiers: [],
        description: '🔨 Auction record broken. Collector confidence surges.',
    },
    gallery_closure: {
        priceMultiplier: 0.90,
        tierSpillover: -0.02,
        heatDelta: -15,
        decayWeeks: 6,
        npcSellProbMod: 0.25,
        affectedTiers: [],
        description: '🚪 Gallery closure. Represented artists seek new homes.',
    },
    gallery_mega_merger: {
        priceMultiplier: 1.08,
        tierSpillover: 0.02,
        heatDelta: 10,
        decayWeeks: 8,
        npcBuyProbMod: 0.05,
        affectedTiers: ['blue-chip'],
        description: '🏢 Mega-gallery merger reshapes market landscape.',
    },
    emerging_artist_discovery: {
        priceMultiplier: 1.50,    // +50% for the specific artist
        tierSpillover: 0.02,
        heatDelta: 40,
        decayWeeks: 10,
        npcBuyProbMod: 0.30,
        affectedTiers: ['emerging'],
        description: '⭐ New artist sensation discovered. Bidding war erupts.',
    },
    social_media_viral: {
        priceMultiplier: 1.12,
        tierSpillover: 0.01,
        heatDelta: 18,
        decayWeeks: 3,
        npcBuyProbMod: 0.15,
        affectedTiers: ['emerging', 'mid-career'],
        description: '📱 Work goes viral on social media. Mainstream attention.',
    },

    // ── Economy-Wide Events ──
    recession_start: {
        priceMultiplier: 0.85,
        tierSpillover: -0.10,
        heatDelta: -10,
        decayWeeks: 52,
        npcBuyProbMod: -0.30,     // Major reduction in buying
        npcSellProbMod: 0.15,     // Some distressed selling
        affectedTiers: ['emerging', 'mid-career', 'blue-chip'],
        description: '📉 Economic recession. Art market tightens.',
    },
    recession_end: {
        priceMultiplier: 1.05,
        tierSpillover: 0.03,
        heatDelta: 5,
        decayWeeks: 8,
        npcBuyProbMod: 0.10,
        affectedTiers: ['emerging', 'mid-career', 'blue-chip'],
        description: '📈 Recession easing. Market cautiously optimistic.',
    },
    bubble_pop: {
        priceMultiplier: 0.70,
        tierSpillover: -0.08,
        heatDelta: -20,
        decayWeeks: 16,
        npcBuyProbMod: -0.40,
        npcSellProbMod: 0.35,
        affectedTiers: ['emerging', 'mid-career', 'blue-chip'],
        description: '💥 Speculative bubble burst. Fire sales begin.',
    },
    fair_success: {
        priceMultiplier: 1.05,
        tierSpillover: 0.02,
        heatDelta: 10,
        decayWeeks: 3,
        npcBuyProbMod: 0.12,
        affectedTiers: [],
        description: '🎨 Art fair delivers strong sales.',
    },
    tax_regulation_change: {
        priceMultiplier: 0.92,
        tierSpillover: -0.04,
        heatDelta: -5,
        decayWeeks: 26,
        npcBuyProbMod: -0.15,
        npcSellProbMod: 0.10,
        affectedTiers: ['blue-chip'],
        description: '📋 New tax regulations on art transactions. Market adjusts.',
    },
    crypto_art_crash: {
        priceMultiplier: 0.88,
        tierSpillover: -0.03,
        heatDelta: -12,
        decayWeeks: 10,
        npcBuyProbMod: -0.10,
        affectedTiers: ['emerging'],
        description: '🪙 Crypto art market crashes. Digital skepticism rises.',
    },
    trade_war_sanctions: {
        priceMultiplier: 0.90,
        tierSpillover: -0.05,
        heatDelta: -8,
        decayWeeks: 20,
        npcBuyProbMod: -0.20,
        affectedTiers: ['blue-chip', 'mid-career'],
        description: '🌐 Trade sanctions disrupt international art movement.',
    },
    political_censorship: {
        priceMultiplier: 1.10,    // Controversy = value for some
        tierSpillover: 0.02,
        heatDelta: 15,
        decayWeeks: 6,
        npcBuyProbMod: 0.10,
        affectedTiers: ['emerging', 'mid-career'],
        description: '🔒 Government censorship drives collector solidarity.',
    },

    // ── Collector/Dealer Events ──
    collector_death: {
        priceMultiplier: 1.08,    // Collection hitting market = price discovery
        tierSpillover: 0.01,
        heatDelta: 5,
        decayWeeks: 8,
        npcSellProbMod: 0.20,     // Estate sale
        affectedTiers: [],
        description: '🕯️ Prominent collector passes. Estate sale anticipated.',
    },
    collection_donation: {
        priceMultiplier: 1.12,
        tierSpillover: 0.02,
        heatDelta: 12,
        decayWeeks: 6,
        npcBuyProbMod: 0.08,
        affectedTiers: [],
        description: '🎁 Major collection donated to museum. Validation boost.',
    },
    tech_billionaire_entry: {
        priceMultiplier: 1.18,
        tierSpillover: 0.06,
        heatDelta: 15,
        decayWeeks: 10,
        npcBuyProbMod: 0.20,
        affectedTiers: ['blue-chip', 'emerging'],
        description: '💰 Tech billionaire enters art collecting. Price inflation.',
    },
    blue_chip_deaccession: {
        priceMultiplier: 0.92,
        tierSpillover: -0.03,
        heatDelta: -8,
        decayWeeks: 4,
        npcSellProbMod: 0.15,
        affectedTiers: ['blue-chip'],
        description: '📦 Blue-chip collector deaccessions. Supply floods market.',
    },
    insurance_fraud_bust: {
        priceMultiplier: 0.85,
        tierSpillover: -0.04,
        heatDelta: -15,
        decayWeeks: 12,
        npcBuyProbMod: -0.25,
        affectedTiers: [],
        description: '🚔 Insurance fraud scheme exposed. Trust shaken.',
    },
    new_gallery_opening: {
        priceMultiplier: 1.04,
        tierSpillover: 0.01,
        heatDelta: 8,
        decayWeeks: 4,
        npcBuyProbMod: 0.08,
        affectedTiers: ['emerging', 'mid-career'],
        description: '🏪 Exciting new gallery opens. Fresh energy in the market.',
    },

    // ═══════════════════════════════════════════════════════
    // PLAYER EVENTS — Primarily affect NPC trust
    // ═══════════════════════════════════════════════════════
    player_lowballed: {
        trustDelta: -0.15,
        respectDelta: -0.10,
        grudgeProbability: 0.6,
        significance: 0.8,
        description: 'Player made an insulting offer.',
    },
    player_flipped: {
        trustDelta: -0.20,
        respectDelta: -0.25,
        grudgeProbability: 0.8,
        significance: 0.9,
        description: 'Player quickly flipped a work for profit.',
    },
    player_honored_deal: {
        trustDelta: 0.10,
        respectDelta: 0.15,
        favorProbability: 0.3,
        significance: 0.6,
        description: 'Player honored a deal as agreed.',
    },
    player_tipped_off: {
        trustDelta: 0.20,
        respectDelta: 0.10,
        favorProbability: 0.5,
        significance: 0.7,
        description: 'Player shared valuable information.',
    },
    player_bought: {
        trustDelta: 0.05,
        respectDelta: 0.05,
        significance: 0.4,
        description: 'Player completed a purchase.',
    },
    player_sold: {
        trustDelta: 0.03,
        respectDelta: 0.02,
        significance: 0.3,
        description: 'Player sold a work.',
    },

    // ═══════════════════════════════════════════════════════
    // NPC EVENTS — NPC-to-NPC relationship dynamics
    // ═══════════════════════════════════════════════════════
    npc_betrayal: {
        trustDelta: -0.30,
        respectDelta: -0.20,
        grudgeProbability: 0.9,
        significance: 0.95,
        description: 'NPC betrayal detected.',
    },
    npc_gossip: {
        trustDelta: 0,
        significance: 0.3,
        description: 'Gossip circulating.',
    },
    npc_offer_expired: {
        trustDelta: -0.10,
        respectDelta: -0.05,
        grudgeProbability: 0.4,
        significance: 0.5,
        description: 'An offer went unanswered.',
    },
};

// ────────────────────────────────────────────────────
// MarketEventBus class
// ────────────────────────────────────────────────────

class _MarketEventBus {
    constructor() {
        /** @type {Map<string, Function[]>} */
        this._listeners = new Map();

        /** @type {Array<{type: string, data: object, week: number, timestamp: number}>} */
        this._eventLog = [];

        /** @type {Array<{type: string, artistId?: string, multiplier: number, remaining: number}>} */
        this._activeEffects = [];

        this.MAX_LOG_SIZE = 200;
    }

    /**
     * Subscribe to an event type.
     * @param {string} eventType
     * @param {Function} callback — receives (data, impact)
     * @returns {Function} unsubscribe function
     */
    on(eventType, callback) {
        if (!this._listeners.has(eventType)) {
            this._listeners.set(eventType, []);
        }
        this._listeners.get(eventType).push(callback);

        // Return unsubscribe function
        return () => {
            const list = this._listeners.get(eventType);
            if (list) {
                const idx = list.indexOf(callback);
                if (idx >= 0) list.splice(idx, 1);
            }
        };
    }

    /**
     * Emit an event to all subscribers.
     * @param {string} eventType
     * @param {object} data — event-specific payload
     * @param {number} [week] — current game week (auto-detected if omitted)
     */
    emit(eventType, data = {}, week = null) {
        const impact = EVENT_IMPACTS[eventType] || {};
        const gameWeek = week ?? data.week ?? 0;

        // Log event
        const entry = {
            type: eventType,
            data: { ...data },
            impact: { ...impact },
            week: gameWeek,
            timestamp: Date.now(),
        };
        this._eventLog.push(entry);
        if (this._eventLog.length > this.MAX_LOG_SIZE) {
            this._eventLog.shift();
        }

        // Register active price effect if this event has a market impact
        if (impact.priceMultiplier && impact.decayWeeks) {
            this._activeEffects.push({
                type: eventType,
                artistId: data.artistId || null,
                npcId: data.npcId || null,
                multiplier: impact.priceMultiplier,
                tierSpillover: impact.tierSpillover || 0,
                heatDelta: impact.heatDelta || 0,
                remaining: impact.decayWeeks,
                week: gameWeek,
                description: data.description || impact.description,
            });
        }

        // Notify all subscribers
        const listeners = this._listeners.get(eventType) || [];
        for (const fn of listeners) {
            try {
                fn(data, impact, gameWeek);
            } catch (err) {
                console.error(`[MarketEventBus] Error in ${eventType} listener:`, err);
            }
        }

        // Also notify wildcard listeners
        const wildcardListeners = this._listeners.get('*') || [];
        for (const fn of wildcardListeners) {
            try {
                fn(eventType, data, impact, gameWeek);
            } catch (err) {
                console.error(`[MarketEventBus] Error in wildcard listener:`, err);
            }
        }

        console.log(`[MarketEventBus] ${eventType}`, data);
    }

    /**
     * Get the current aggregate price modifier for an artist,
     * considering all active effects (with linear decay).
     * @param {string} artistId
     * @param {string} [tier] — artist tier for spillover effects
     * @returns {number} multiplier (1.0 = no change)
     */
    getPriceModifier(artistId, tier) {
        let modifier = 1.0;

        for (const effect of this._activeEffects) {
            const decay = effect.remaining / (EVENT_IMPACTS[effect.type]?.decayWeeks || 1);
            const decayedMultiplier = 1.0 + (effect.multiplier - 1.0) * decay;

            if (effect.artistId === artistId) {
                // Direct hit — full effect
                modifier *= decayedMultiplier;
            } else if (tier && effect.tierSpillover) {
                // Tier spillover — reduced effect
                modifier *= 1.0 + effect.tierSpillover * decay;
            }
        }

        return modifier;
    }

    /**
     * Get the current aggregate heat modifier for an artist.
     * @param {string} artistId
     * @returns {number} heat delta to apply
     */
    getHeatModifier(artistId) {
        let delta = 0;
        for (const effect of this._activeEffects) {
            if (effect.artistId === artistId && effect.heatDelta) {
                const decay = effect.remaining / (EVENT_IMPACTS[effect.type]?.decayWeeks || 1);
                delta += effect.heatDelta * decay;
            }
        }
        return delta;
    }

    /**
     * Called each game week to decay active effects.
     */
    tick() {
        this._activeEffects = this._activeEffects.filter(effect => {
            effect.remaining--;
            return effect.remaining > 0;
        });
    }

    /**
     * Get the full event log (for Bloomberg terminal).
     */
    getEventLog() {
        return [...this._eventLog];
    }

    /**
     * Get recent events (last N).
     */
    getRecentEvents(count = 10) {
        return this._eventLog.slice(-count);
    }

    /**
     * Get active effects (for debug/UI).
     */
    getActiveEffects() {
        return [...this._activeEffects];
    }

    /**
     * Clear all state (for game reset).
     */
    reset() {
        this._eventLog = [];
        this._activeEffects = [];
    }
}

export const MarketEventBus = new _MarketEventBus();
