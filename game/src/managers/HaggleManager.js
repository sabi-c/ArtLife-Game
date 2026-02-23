/**
 * HaggleManager.js — Pokémon-Style Art Negotiation Battle System
 *
 * Turn-based negotiation engine for PLAYER-facing deals.
 * This is DIFFERENT from MarketSimulator (NPC-to-NPC trades).
 *
 * ARCHITECTURE CONTEXT (for other agents):
 * ┌──────────────────────────────────────────────────────┐
 * │  HaggleManager (THIS FILE)                           │
 * │  └─ Owns: player haggle state machine, tactic        │
 * │     resolution, dealer AI, price convergence          │
 * │  └─ Depends on: haggle_config.js (tactics, types,    │
 * │     dealer personalities), GameState (player stats),  │
 * │     npcStore (CMS-edited NPC overrides)                │
 * │  └─ Called by: HaggleScene (Phaser), dialogue system  │
 * │  └─ CMS views: HaggleEditor.jsx, ArtworkEditor haggle │
 * │     sub-tab                                            │
 * └──────────────────────────────────────────────────────┘
 *
 * Battle Flow:
 *   start() → player selects artwork + NPC → determines dealer type
 *   getAvailableTactics() → returns unlocked tactics for this round
 *   executeTactic(id) → resolves tactic, updates price, checks win/loss
 *   applyResult() → if deal, transfers artwork+cash in GameState
 *
 * Type System (Rock-Paper-Scissors):
 *   Emotional > Aggressive > Financial > Logical > Emotional
 *   Each tactic has a type; each dealer has a style.
 *   Super Effective = +20% success, 1.5× price shift
 *   Not Very Effective = -15% success, 0.5× price shift
 *
 * INTEGRATION POINTS:
 * - Asking price comes from MarketManager.calculatePrice() (via artwork.price)
 * - NPC profiles read from contacts.js, overridden by npcStore (CMS edits)
 * - Deal results write to GameState (cash, portfolio, provenance, flip history)
 * - haggle_config.js defines ALL balance data (dealer types, tactics, dialogue)
 * - ArtworkEditor "Haggle" sub-tab shows the full haggle matrix for CMS testing
 */

import { DEALER_TYPES, TACTICS, BLUE_OPTIONS, DEALER_DIALOGUE, ROLE_TO_DEALER_TYPE, HAGGLE_CONFIG, HAGGLE_TYPES, TYPE_EFFECTIVENESS } from '../data/haggle_config.js';
import { ExpressionEngine } from '../engine/ExpressionEngine.js';
import { GameState } from './GameState.js';
import { useNPCStore } from '../stores/npcStore.js';
import { ARTWORK_MAP } from '../data/artworks.js';
import { MarketEventBus, EVENT_IMPACTS } from './MarketEventBus.js';

class _HaggleManager {
    constructor() {
        this.active = null; // Current haggle state, or null
    }

    // ════════════════════════════════════════════
    // Start a new haggle
    // ════════════════════════════════════════════

    /**
     * @param {Object} params
     * @param {string} params.mode — 'buy' or 'sell'
     * @param {Object} params.work — the artwork being negotiated
     * @param {Object} params.npc — the NPC contact (from contacts.js), or null for anonymous
     * @param {number} params.askingPrice — the starting asking price
     * @param {number} params.playerOffer — the player's opening offer (optional, defaults to 70% of ask)
     */
    start({ mode, work, npc, askingPrice, playerOffer }) {
        const s = GameState.state;

        // ── Resolve NPC profile: CMS edits (useNPCStore) take priority over hardcoded CONTACTS ──
        const storeContact = npc?.id
            ? useNPCStore.getState().contacts?.find(c => c.id === npc.id)
            : null;
        const resolvedNpc = storeContact ? { ...npc, ...storeContact } : npc;

        // ── Taste-based interest check ──
        // If NPC has taste preferences, check if they'd even want this artwork
        const taste = resolvedNpc?.taste;
        if (taste && work) {
            if (taste.avoidedGenres?.includes(work.genre)) {
                return { refused: true, reason: 'taste_mismatch', message: `"Not my taste, darling."` };
            }
        }

        // ── Wealth ceiling enforcement ──
        // If asking price exceeds NPC's spending ceiling, they refuse outright
        const ceiling = resolvedNpc?.wealth?.spendingCeiling;
        if (ceiling && askingPrice > ceiling * 1.5) {
            return { refused: true, reason: 'too_expensive', message: `"That's beyond my range."` };
        }

        // ── Determine dealer type ──
        // Priority: npc.haggleProfile.dealerType > npc.dealerType > ROLE_TO_DEALER_TYPE[role] > random
        const profile = resolvedNpc?.haggleProfile || {};
        const dealerTypeKey = profile.dealerType
            || resolvedNpc?.dealerType
            || (resolvedNpc ? (ROLE_TO_DEALER_TYPE[resolvedNpc.role] || 'patron') : this._randomDealerType());
        const dealerType = DEALER_TYPES[dealerTypeKey] || DEALER_TYPES.patron;

        // ── Apply NPC-specific overrides from haggleProfile ──
        // These let individual NPCs fight differently even within the same dealer type
        let npcPatience = profile.patience ?? dealerType.patience;
        const npcBluffChance = profile.bluffChance ?? 0.1;
        let npcFlexibility = profile.priceFlexibility ?? 0.15;
        const npcWalkaway = profile.walkawayThreshold ?? 0.70;
        const npcTriggers = profile.emotionalTriggers || [];

        // ── Relationship modifiers (Engine 2 → Engine 3 pipeline) ──
        let relationshipPriceModifier = 1.0;
        let relationshipData = null;
        try {
            const store = useNPCStore.getState();
            relationshipData = store.getRelationship(resolvedNpc?.id);
            if (relationshipData) {
                // Grudge → +25% markup (they don't want to deal with you)
                if (relationshipData.holds_grudge) {
                    relationshipPriceModifier *= 1 + 0.25 * relationshipData.grudge_severity;
                    npcPatience = Math.max(1, npcPatience - 2); // Less patient
                }
                // Owes favor → 15% discount
                if (relationshipData.owes_favor) {
                    relationshipPriceModifier *= 0.85;
                    npcPatience += 1;
                }
                // Trust → flexibility range (0.0-0.2 extra flexibility)
                npcFlexibility += relationshipData.trust * 0.15;
                // Respect → bluff reduction (they don't bluff people they respect)
                // (handled in executeTactic)
                // Low trust → reduced patience
                if (relationshipData.trust < 0.3) {
                    npcPatience = Math.max(1, npcPatience - 1);
                }
            }
        } catch { /* npcStore may not be ready */ }

        // ── Taste bonus: preferred genre/tier gives extra patience ──
        if (taste && work) {
            if (taste.preferredTiers?.includes(work.tier)) npcPatience += 1;
            if (taste.preferredGenres?.includes(work.genre)) npcPatience += 1;
        }

        // ── Wealth ceiling flex reduction: if price nears ceiling, NPC is tight ──
        if (ceiling && askingPrice > ceiling) {
            npcFlexibility *= 0.3; // dramatically reduce flexibility
        }

        // ── Collection awareness: diminishing returns for same artist ──
        const owned = resolvedNpc?.collection?.owned || [];
        if (work && owned.length > 0) {
            const sameArtistCount = owned.filter(id => {
                const ow = ARTWORK_MAP[id];
                return ow && ow.artist === work.artist;
            }).length;
            if (sameArtistCount >= 2) npcPatience -= 1; // already has enough
        }

        // Adjusted asking price based on dealer greed + NPC flexibility
        // Uses formula-as-data if available, falls back to hardcoded
        const F = HAGGLE_CONFIG.formulas;
        let adjustedAsk;
        if (F?.adjustedAskingPrice) {
            adjustedAsk = ExpressionEngine.evaluate(F.adjustedAskingPrice, {
                baseAskingPrice: askingPrice,
                dealerGreed: dealerType.greedFactor,
                npcFlexibility: npcFlexibility,
            });
        } else {
            const flexAdjust = 1 + ((1 - npcFlexibility) * 0.1);
            adjustedAsk = Math.round(askingPrice * dealerType.greedFactor * flexAdjust);
        }

        // Apply relationship price modifier
        adjustedAsk = Math.round(adjustedAsk * relationshipPriceModifier);

        // Player's opening offer
        const opening = playerOffer || Math.round(adjustedAsk * 0.7);

        // Calculate initial gap
        const gap = adjustedAsk - opening;

        this.active = {
            mode,                    // 'buy' or 'sell'
            work,                    // Artwork object
            npc: resolvedNpc,        // Resolved NPC (CMS → CONTACTS fallback)
            dealerTypeKey,
            dealerType,
            dealerName: resolvedNpc ? resolvedNpc.name : 'The Dealer',
            dealerIcon: dealerType.icon,

            askingPrice: adjustedAsk,
            currentOffer: opening,
            gap,

            round: 0,
            maxRounds: HAGGLE_CONFIG.maxRounds,
            patience: npcPatience,

            // NPC-specific battle parameters (used by executeTactic)
            npcProfile: {
                bluffChance: npcBluffChance,
                priceFlexibility: npcFlexibility,
                walkawayThreshold: npcWalkaway,
                emotionalTriggers: npcTriggers,
                temperament: resolvedNpc?.behavior?.temperament || 'warm',
                riskTolerance: resolvedNpc?.behavior?.riskTolerance ?? 50,
            },

            // History for display
            rounds: [],

            // Result
            resolved: false,
            result: null,           // 'deal' | 'walkaway' | 'timeout'
            finalPrice: null,

            // Player stats snapshot for formula calculations
            playerStats: {
                reputation: s.reputation || 0,
                taste: s.taste || 0,
                audacity: s.audacity || 30,
                access: s.access || 0,
                intel: s.intel || 0,
                cash: s.cash || 0,
                suspicion: s.suspicion || 0,
                marketHeat: s.marketHeat || 0,
            },
        };

        return {
            dealerName: this.active.dealerName,
            dealerType: dealerType.name,
            dealerIcon: dealerType.icon,
            askingPrice: adjustedAsk,
            playerOffer: opening,
            openingDialogue: this._getDialogue('opening'),
        };
    }

    // ════════════════════════════════════════════
    // Get available tactics for current round
    // ════════════════════════════════════════════

    getAvailableTactics() {
        if (!this.active) return [];
        const s = this.active.playerStats;
        const tactics = [];

        // Base tactics
        for (const [key, tactic] of Object.entries(TACTICS)) {
            const locked = tactic.unlockStat && s[tactic.unlockStat] < tactic.unlockMin;
            tactics.push({
                ...tactic,
                locked,
                lockReason: locked ? `Requires ${tactic.unlockStat} ≥ ${tactic.unlockMin} (you have ${s[tactic.unlockStat]})` : null,
            });
        }

        // Blue options (stat-gated)
        for (const blue of BLUE_OPTIONS) {
            const hasReq = s[blue.requiredStat] >= blue.requiredMin;
            tactics.push({
                id: blue.id,
                label: blue.label,
                description: blue.description,
                isBlueOption: true,
                locked: !hasReq,
                lockReason: !hasReq ? `Requires ${blue.requiredStat} ≥ ${blue.requiredMin} (you have ${s[blue.requiredStat]})` : null,
                baseSuccess: blue.baseSuccess,
                priceShift: blue.priceShift,
                patienceEffect: blue.patienceEffect,
                heatGain: blue.heatGain,
                suspicionGain: blue.suspicionGain,
                dialogue: blue.dialogue,
            });
        }

        return tactics;
    }

    // ════════════════════════════════════════════
    // Helper: Get Type Effectiveness Multiplier
    // ════════════════════════════════════════════
    _getTypeEffectiveness(tacticType, dealerStyle) {
        if (!tacticType || !dealerStyle) return 1.0;

        const typeData = TYPE_EFFECTIVENESS[tacticType];
        if (!typeData) return 1.0;

        if (typeData.strongAgainst === dealerStyle) return 1.5; // Super Effective
        if (typeData.weakAgainst === dealerStyle) return 0.5;   // Not very effective

        return 1.0; // Neutral
    }

    // ════════════════════════════════════════════
    // Execute a tactic
    // ════════════════════════════════════════════

    /**
     * @param {string} tacticId — ID of the tactic to use
     * @returns {Object} Round result with dialogue, price changes, and state
     */
    executeTactic(tacticId) {
        if (!this.active || this.active.resolved) return null;

        const h = this.active;
        h.round++;

        // Find the tactic
        const allTactics = this.getAvailableTactics();
        const tactic = allTactics.find(t => t.id === tacticId);
        if (!tactic || tactic.locked) return null;

        // ── Type Effectiveness (computed before formula context) ──
        let effectivenessMult = 1.0;
        let effectivenessMessage = null;
        if (tactic.type && h.dealerType.haggleStyle) {
            effectivenessMult = this._getTypeEffectiveness(tactic.type, h.dealerType.haggleStyle);
            if (effectivenessMult > 1.0) effectivenessMessage = 'It\'s super effective!';
            else if (effectivenessMult < 1.0) effectivenessMessage = 'It\'s not very effective...';
        }

        // ── Calculate success via ExpressionEngine ──
        const F = HAGGLE_CONFIG.formulas;
        const formulaCtx = {
            tactic: { baseSuccess: tactic.baseSuccess, priceShift: tactic.priceShift, statWeight: tactic.statWeight || 0 },
            statVal: (tactic.statBonus ? (h.playerStats[tactic.statBonus] || 0) : 0),
            isWeakTo: h.dealerType.weakTo === tacticId ? 1 : 0,
            isStrongAgainst: h.dealerType.strongAgainst === tacticId ? 1 : 0,
            isBlueOption: tactic.isBlueOption ? 1 : 0,
            blueCollectorBonus: (tactic.isBlueOption && h.dealerTypeKey === 'collector') ? 1 : 0,
            typeMult: effectivenessMult,
            suspicion: h.playerStats.suspicion || 0,
            marketHeat: h.playerStats.marketHeat || 0,
        };

        let successChance;
        if (F?.successChance) {
            successChance = ExpressionEngine.evaluate(F.successChance, formulaCtx);
        } else {
            // Hardcoded fallback (original logic)
            successChance = tactic.baseSuccess;
            const tacticDef = TACTICS[tacticId] || BLUE_OPTIONS.find(b => b.id === tacticId);
            if (tactic.statBonus && tacticDef) {
                const statVal = h.playerStats[tactic.statBonus] || 0;
                successChance += statVal * (tactic.statWeight || 0);
            }
            if (h.dealerType.weakTo === tacticId) successChance += 0.2;
            if (h.dealerType.strongAgainst === tacticId) successChance -= 0.15;
            if (tactic.isBlueOption && h.dealerTypeKey === 'collector') successChance += 0.15;
            if (effectivenessMult > 1.0) successChance += 0.20;
            else if (effectivenessMult < 1.0) successChance -= 0.15;
            successChance -= h.playerStats.suspicion * HAGGLE_CONFIG.suspicionPenalty;
            successChance -= h.playerStats.marketHeat * HAGGLE_CONFIG.heatMemory;
            successChance = Math.max(0.05, Math.min(0.95, successChance));
        }

        // ── Roll ──
        const roll = Math.random();
        const success = roll < successChance;

        // ── Apply effects ──
        let priceChange = 0;
        let patienceChange = tactic.patienceEffect || 0;

        if (success) {
            // Price moves in player's favor, multiplied by effectiveness
            let shiftMult = 1.0;
            if (F?.priceShiftMultiplier) {
                shiftMult = ExpressionEngine.evaluate(F.priceShiftMultiplier, formulaCtx);
            } else {
                if (effectivenessMult > 1.0) shiftMult = 1.5;
                else if (effectivenessMult < 1.0) shiftMult = 0.5;
            }
            const actualPriceShift = tactic.priceShift * shiftMult;

            priceChange = Math.round(h.askingPrice * Math.abs(actualPriceShift));
            if (h.mode === 'buy') {
                h.currentOffer = h.currentOffer; // Player's offer stays
                h.askingPrice = Math.max(h.currentOffer, h.askingPrice - priceChange);
            } else {
                h.currentOffer = Math.min(h.askingPrice, h.currentOffer + priceChange);
            }
        } else {
            // Price moves against player or stays
            if (tacticId === 'raise') {
                // Raise always increases player's offer even on "failure"
                priceChange = Math.round(h.askingPrice * tactic.priceShift);
                h.currentOffer = Math.min(h.askingPrice, h.currentOffer + priceChange);
            }
            patienceChange = Math.min(patienceChange, -1); // Failed tactics always cost patience
        }

        h.patience = Math.max(0, h.patience + patienceChange);
        h.gap = h.askingPrice - h.currentOffer;

        // Heat and suspicion effects
        if (tactic.heatGain) GameState.state.marketHeat = Math.min(100, (GameState.state.marketHeat || 0) + tactic.heatGain);
        if (tactic.suspicionGain) GameState.state.suspicion = Math.min(100, (GameState.state.suspicion || 0) + tactic.suspicionGain);

        // ── Get dealer dialogue ──
        let dialogueKey;
        if (tactic.isBlueOption) {
            dialogueKey = 'onBlueOption';
        } else {
            const keyMap = { raise: 'onRaise', holdFirm: 'onHoldFirm', walkAway: 'onWalkAway', bluff: 'onBluff' };
            dialogueKey = keyMap[tacticId] || 'onRaise';
        }
        const dialogue = this._getDialogue(dialogueKey);

        // ── Check for resolution ──
        let dealReached = false;
        let dealFailed = false;

        // Deal: gap is ≤ threshold of asking price
        const dealThresh = F?.dealThreshold != null ? ExpressionEngine.evaluate(F.dealThreshold, formulaCtx) : 0.05;
        if (h.gap <= h.askingPrice * dealThresh) {
            dealReached = true;
        }

        // Failure conditions
        if (h.patience <= 0) {
            dealFailed = true;
        }
        if (tacticId === 'walkAway' && !success) {
            dealFailed = true;
        }
        if (h.round >= h.maxRounds) {
            const timeoutThresh = F?.timeoutThreshold != null ? ExpressionEngine.evaluate(F.timeoutThreshold, formulaCtx) : 0.15;
            if (h.gap <= h.askingPrice * timeoutThresh) {
                dealReached = true;
            } else {
                dealFailed = true;
            }
        }

        // Build round record
        const roundResult = {
            round: h.round,
            tacticId,
            tacticLabel: tactic.label,
            success,
            successChance: Math.round(successChance * 100),
            priceChange,
            dialogue,
            playerOffer: h.currentOffer,
            askingPrice: h.askingPrice,
            gap: h.gap,
            patience: h.patience,
            dealReached,
            dealFailed,
            isBlueOption: tactic.isBlueOption || false,
            tacticType: tactic.type,
            effectivenessMult,
            effectivenessMessage,
        };

        h.rounds.push(roundResult);

        // ── Resolve if needed ──
        if (dealReached) {
            h.resolved = true;
            h.result = 'deal';
            // Final price via formula or fallback
            const priceCtx = { currentOffer: h.currentOffer, askingPrice: h.askingPrice };
            h.finalPrice = F?.dealClosurePrice
                ? ExpressionEngine.evaluate(F.dealClosurePrice, priceCtx)
                : Math.round((h.currentOffer + h.askingPrice) / 2);
            roundResult.finalDialogue = this._getDialogue('onDeal');
            roundResult.finalPrice = h.finalPrice;
        } else if (dealFailed) {
            h.resolved = true;
            h.result = 'walkaway';
            roundResult.finalDialogue = this._getDialogue('onFail');
        }

        return roundResult;
    }

    // ════════════════════════════════════════════
    // Get current haggle state (for screen rendering)
    // ════════════════════════════════════════════

    getState() {
        if (!this.active) return null;
        const h = this.active;
        return {
            mode: h.mode,
            work: h.work,
            dealerName: h.dealerName,
            dealerIcon: h.dealerIcon,
            dealerType: h.dealerType.name,
            dealerTypeKey: h.dealerTypeKey,
            askingPrice: h.askingPrice,
            currentOffer: h.currentOffer,
            gap: h.gap,
            round: h.round,
            maxRounds: h.maxRounds,
            patience: h.patience,
            maxPatience: h.dealerType.patience,
            rounds: h.rounds,
            resolved: h.resolved,
            result: h.result,
            finalPrice: h.finalPrice,
            playerStats: h.playerStats,
        };
    }

    // ════════════════════════════════════════════
    // Apply deal result to GameState
    // ════════════════════════════════════════════

    applyResult() {
        if (!this.active || !this.active.resolved) return null;
        const h = this.active;

        if (h.result === 'deal') {
            if (h.mode === 'buy') {
                // Buy: deduct cash, update work in place to sync with globalWorks
                GameState.state.cash -= h.finalPrice;

                h.work.onMarket = false;
                h.work.owner = 'player';
                h.work.purchasePrice = h.finalPrice;
                h.work.purchaseWeek = GameState.state.week;
                h.work.purchaseCity = GameState.state.currentCity;
                h.work.storage = 'home';
                h.work.insured = false;
                h.work.provenance = h.work.provenance || [];
                h.work.provenance.push({
                    type: 'acquired (haggle)',
                    week: GameState.state.week,
                    city: GameState.state.currentCity,
                    price: h.finalPrice,
                    source: h.dealerName,
                });

                GameState.state.portfolio.push(h.work);
                GameState.state.totalWorksBought = (GameState.state.totalWorksBought || 0) + 1;
                GameState.addNews(`🤝 Haggled and bought "${h.work.title}" for $${h.finalPrice.toLocaleString()} (saved $${(h.askingPrice - h.finalPrice).toLocaleString()})`);
            } else {
                // Sell: add cash, remove from portfolio, change global owner
                GameState.state.cash += h.finalPrice;
                GameState.state.portfolio = GameState.state.portfolio.filter(w => w.id !== h.work.id);
                GameState.state.totalWorksSold = (GameState.state.totalWorksSold || 0) + 1;
                h.work.owner = 'dealer';
                h.work.onMarket = false;

                // Flip tracking — mirrors GameState.sellWork() logic
                const holdTime = GameState.state.week - (h.work.purchaseWeek || 0);
                GameState.state.flipHistory = GameState.state.flipHistory || [];
                GameState.state.flipHistory.push({
                    workId: h.work.id,
                    buyWeek: h.work.purchaseWeek || 0,
                    sellWeek: GameState.state.week,
                    holdTime,
                });

                GameState.addNews(`💰 Sold "${h.work.title}" for $${h.finalPrice.toLocaleString()}`);
            }

            // Reputation boost for successful deals
            GameState.state.reputation = Math.min(100, GameState.state.reputation + 1);

            // ── Sync NPC collection to npcStore ──
            try {
                const npcId = h.npc?.id;
                if (npcId) {
                    const store = useNPCStore.getState();
                    const contact = store.getContact(npcId);
                    if (contact) {
                        const owned = [...(contact.collection?.owned || [])];
                        if (h.mode === 'buy') {
                            // Player bought → remove from NPC's collection
                            const idx = owned.indexOf(h.work.id);
                            if (idx >= 0) owned.splice(idx, 1);
                        } else {
                            // Player sold → add to NPC's collection
                            owned.push(h.work.id);
                        }
                        store.syncMarketData(npcId, {
                            ...contact,
                            cash: (contact.wealth?.liquidCash || 0) + (h.mode === 'buy' ? h.finalPrice : -h.finalPrice),
                            owned,
                        });
                    }
                }
            } catch { /* npcStore may not be ready */ }

            // ── Update global artwork trade history ──
            try {
                const artworkRef = ARTWORK_MAP[h.work.id];
                if (artworkRef) {
                    artworkRef.owner = h.mode === 'buy' ? 'player' : (h.npc?.id || 'dealer');
                    artworkRef.lastTradePrice = h.finalPrice;
                    artworkRef.lastTradeWeek = GameState.state.week;
                    if (!artworkRef.tradeHistory) artworkRef.tradeHistory = [];
                    artworkRef.tradeHistory.push({
                        buyer: h.mode === 'buy' ? 'player' : (h.npc?.id || 'dealer'),
                        seller: h.mode === 'buy' ? (h.npc?.id || 'dealer') : 'player',
                        price: h.finalPrice,
                        week: GameState.state.week,
                        type: 'haggle',
                    });
                }
            } catch { /* non-critical */ }
        } else {
            // Walk away — minor heat from wasted time
            GameState.addNews(`❌ Haggle over "${h.work.title}" fell through.`);
        }

        const result = {
            mode: h.mode,
            result: h.result,
            finalPrice: h.finalPrice,
            work: h.work,
            dealerName: h.dealerName,
            rounds: h.rounds.length,
        };

        this.active = null;

        // ── Emit events to MarketEventBus + record in NPC memory ──
        try {
            const npcId = result.work?.npcId || h.npc?.id;
            const week = GameState.state?.week || 0;
            if (result.result === 'deal') {
                const eventType = result.mode === 'buy' ? 'player_bought' : 'player_sold';
                MarketEventBus.emit(eventType, {
                    npcId, workId: result.work?.id, price: result.finalPrice, week,
                });
                // Record in NPC memory
                if (npcId) {
                    const impact = EVENT_IMPACTS[eventType] || {};
                    useNPCStore.getState().recordInteraction(npcId, eventType, {
                        ...impact, workId: result.work?.id, price: result.finalPrice,
                    }, impact.significance, week);
                }
                // Check for flip (sold within 4 weeks of purchase)
                if (result.mode === 'sell' && result.work?.purchaseWeek) {
                    const holdTime = week - result.work.purchaseWeek;
                    if (holdTime <= 4) {
                        const profit = result.finalPrice - (result.work.purchasePrice || 0);
                        MarketEventBus.emit('player_flipped', {
                            npcId, workId: result.work?.id, profit, weeksHeld: holdTime, week,
                        });
                        if (npcId) {
                            const flipImpact = EVENT_IMPACTS.player_flipped || {};
                            useNPCStore.getState().recordInteraction(npcId, 'player_flipped', {
                                ...flipImpact, profit, weeksHeld: holdTime,
                            }, flipImpact.significance, week);
                        }
                    }
                }
            } else {
                // Walkaway — check if player was lowballing
                if (npcId && h.currentOffer < h.askingPrice * 0.6) {
                    MarketEventBus.emit('player_lowballed', {
                        npcId, amount: h.currentOffer, askingPrice: h.askingPrice, week,
                    });
                    const lowballImpact = EVENT_IMPACTS.player_lowballed || {};
                    useNPCStore.getState().recordInteraction(npcId, 'player_lowballed', {
                        ...lowballImpact, amount: h.currentOffer, askingPrice: h.askingPrice,
                    }, lowballImpact.significance, week);
                }
            }
        } catch { /* non-critical event emission */ }

        return result;
    }

    // ════════════════════════════════════════════
    // Private helpers
    // ════════════════════════════════════════════

    _getDialogue(key) {
        if (!this.active) return '"..."';
        const pool = DEALER_DIALOGUE[key]?.[this.active.dealerTypeKey];
        if (!pool || pool.length === 0) return '"..."';
        const line = pool[Math.floor(Math.random() * pool.length)];

        // Replace template tokens
        return line
            .replace('%PERCENT%', `${Math.round((this.active.gap / this.active.askingPrice) * 100)}%`)
            .replace('%GAP%', `${this.active.gap.toLocaleString()}`);
    }

    _randomDealerType() {
        const keys = Object.keys(DEALER_TYPES);
        return keys[Math.floor(Math.random() * keys.length)];
    }
}

export const HaggleManager = new _HaggleManager();
