/**
 * MarketSimulator.js — Autonomous NPC-to-NPC Art Trading Engine
 *
 * Runs each game week (called from WeekEngine), SEPARATE from the
 * player-facing HaggleManager. This simulates a living art market
 * where NPCs buy, sell, and flip artworks based on their profiles.
 *
 * ARCHITECTURE CONTEXT (for other agents):
 * ┌──────────────────────────────────────────────────────┐
 * │  MarketSimulator (THIS FILE)                         │
 * │  └─ Owns: NPC trading, order book, trade log,       │
 * │     market events, multi-week simulation             │
 * │  └─ Depends on: MarketManager (for pricing),        │
 * │     contacts.js (NPC profiles), artworks.js          │
 * │  └─ Called by: WeekEngine (weekly), CMS dashboard    │
 * │     (simulateMultipleWeeks for testing)               │
 * │  └─ Produces: tradeLog, weeklyReports, priceHistory, │
 * │     marketEvents — consumed by MarketSimDashboard    │
 * └──────────────────────────────────────────────────────┘
 *
 * 4-Phase Pipeline (each week):
 *   1. NPC Decision Making — each NPC evaluates buy/sell/hold
 *      Uses: financial stress, cash, market cycle, collection size
 *   2. Order Matching — pair buyers with sellers
 *      Uses: genre preference, tier preference, price/budget ratio
 *   3. Trade Resolution — simplified negotiation between 2 NPCs
 *      Uses: NPC flexibility, urgency, relationship modifiers
 *   4. Settlement — transfer art, cash, boost artist heat, log
 *
 * INTEGRATION POINTS:
 * - _getPrice(work) → delegates to MarketManager.calculatePrice()
 * - NPC state reads from contacts.js (wealth, taste, haggleProfile)  
 * - MarketSimDashboard.jsx → calls simulateMultipleWeeks() for CMS
 * - WeekEngine → calls simulate() each week for live game
 * - priceHistory[] → powers Charts tab in dashboard
 * - marketEvents[] → powers Events tab in dashboard
 *
 * Data Sources:
 *   contacts.js  → wealth, collection, taste, haggleProfile, network
 *   artworks.js  → artwork database with tiers and genres
 *   MarketManager → artist heat, pricing engine, market cycle
 */

import { CONTACTS } from '../data/contacts.js';
import { ARTWORKS } from '../data/artworks.js';
import { ARTWORK_MAP } from '../data/artworks.js';
import { MarketManager } from './MarketManager.js';
import { GameState } from './GameState.js';
import { ActivityLogger } from './ActivityLogger.js';
import { useNPCStore } from '../stores/npcStore.js';
import { ExpressionEngine } from '../core/ExpressionEngine.js';
import { clamp } from '../utils/math.js';

// ── Trade Log (persisted per session) ──
const MAX_LOG_SIZE = 2000;

// ════════════════════════════════════════════
// Market Formulas — SoonFx-inspired expression trees
// Editable without code changes, evaluated by ExpressionEngine
// ════════════════════════════════════════════
export const MARKET_FORMULAS = {
    // NPC sell probability per artwork per week
    // Context: financialStress, cashRatio, isBear, profitRatio, capacityRatio, isForSale
    sellProbability: {
        op: 'clamp', min: 0, max: 0.95,
        value: {
            op: '+', args: [
                0.05,  // base 5%
                { op: 'if', cond: { op: '>', args: [{ ref: 'financialStress' }, 50] }, then: 0.15, else: 0 },
                { op: 'if', cond: { op: '<', args: [{ ref: 'cashRatio' }, 0.3] }, then: 0.20, else: 0 },
                { op: 'if', cond: { ref: 'isBear' }, then: 0.10, else: 0 },
                { op: 'if', cond: { op: '>', args: [{ ref: 'profitRatio' }, 1.4] }, then: 0.15, else: 0 },
                { op: 'if', cond: { op: '>', args: [{ ref: 'capacityRatio' }, 0.8] }, then: 0.10, else: 0 },
                { op: 'if', cond: { ref: 'isForSale' }, then: 0.20, else: 0 },
            ]
        },
    },

    // Match score: how well a sell order fits a buy order
    // Context: genreMatch, genreAvoided, tierMatch, priceRatio, isAlly, isRival, isUrgent
    matchScore: {
        op: 'max', args: [0, {
            op: '+', args: [
                10,  // base score
                { op: 'if', cond: { ref: 'genreMatch' }, then: 30, else: 0 },
                { op: 'if', cond: { ref: 'genreAvoided' }, then: -999, else: 0 },
                { op: 'if', cond: { ref: 'tierMatch' }, then: 20, else: 0 },
                {
                    op: 'if', cond: { op: '<', args: [{ ref: 'priceRatio' }, 0.5] }, then: 15, else:
                    {
                        op: 'if', cond: { op: '<', args: [{ ref: 'priceRatio' }, 0.8] }, then: 10, else:
                            { op: 'if', cond: { op: '>', args: [{ ref: 'priceRatio' }, 1.0] }, then: -10, else: 0 },
                    },
                },
                { op: 'if', cond: { ref: 'isAlly' }, then: 15, else: 0 },
                { op: 'if', cond: { ref: 'isRival' }, then: -20, else: 0 },
                { op: 'if', cond: { ref: 'isUrgent' }, then: 10, else: 0 },
            ]
        }],
    },

    // Deal closure probability for NPC-to-NPC trades
    // Context: isAlly, isRival, buyerPatience, sellerPatience
    dealClosure: {
        op: 'clamp', min: 0.1, max: 0.99,
        value: {
            op: '+', args: [
                0.85,  // base 85%
                { op: 'if', cond: { ref: 'isAlly' }, then: 0.10, else: 0 },
                { op: 'if', cond: { ref: 'isRival' }, then: -0.25, else: 0 },
                {
                    op: '*', args: [
                        { op: '+', args: [{ ref: 'buyerPatience' }, { ref: 'sellerPatience' }] },
                        0.01,
                    ]
                },
            ]
        },
    },

    // Ask price multiplier for sell orders
    // Context: npcFlexibility
    askPriceMultiplier: {
        op: '+', args: [
            1,
            {
                op: '*', args: [
                    { op: '-', args: [1, { ref: 'npcFlexibility' }] },
                    0.15,
                ]
            },
        ],
    },
};

export class MarketSimulator {
    /** All trades executed this session */
    static tradeLog = [];

    /** Summary stats updated each tick */
    static weeklyReport = null;

    /** NPC collection state — initialized from CONTACTS on first tick */
    static _npcState = null;

    // ── Open Order Book (visible to Bloomberg terminal) ──
    /** NPC sell orders visible to the player before auto-matching */
    static pendingSellOrders = [];
    /** NPC buy orders visible to the player (shows demand) */
    static pendingBuyOrders = [];
    /** Monotonically increasing order ID counter */
    static _nextOrderId = 1;

    // ══════════════════════════════════════════════════════════════
    // Initialization
    // ══════════════════════════════════════════════════════════════

    /**
     * Lazy-init NPC state from persisted npcStore first, falling back to CONTACTS.
     * This ensures market simulation data (collection, cash, trade stats) survives
     * page reloads via Zustand persist.
     */
    static _ensureState() {
        if (MarketSimulator._npcState) return;
        MarketSimulator._npcState = {};

        // Try to get persisted data from npcStore (survives reload)
        let storeContacts = [];
        try { storeContacts = useNPCStore.getState().contacts || []; } catch { /* store not ready */ }
        const storeMap = Object.fromEntries(storeContacts.map(c => [c.id, c]));

        for (const c of CONTACTS) {
            const stored = storeMap[c.id];
            const stats = stored?.marketStats || {};

            MarketSimulator._npcState[c.id] = {
                id: c.id,
                name: c.name,
                role: c.role,
                // Financials: prefer persisted store data over static CONTACTS
                cash: stored?.wealth?.liquidCash ?? c.wealth?.liquidCash ?? 100000,
                spendingCeiling: c.wealth?.spendingCeiling ?? 50000,
                annualBudget: c.wealth?.annualBudget ?? 200000,
                financialStress: stats.financialStress ?? c.wealth?.financialStress ?? 20,
                // Collection: prefer persisted over static
                owned: [...(stored?.collection?.owned ?? c.collection?.owned ?? [])],
                forSale: [...(stored?.collection?.forSale ?? c.collection?.forSale ?? [])],
                maxCapacity: c.collection?.maxCapacity ?? 20,
                // Taste (static — not modified by sim)
                preferredGenres: c.taste?.preferredGenres || [],
                preferredTiers: c.taste?.preferredTiers || ['mid_career'],
                avoidedGenres: c.taste?.avoidedGenres || [],
                riskAppetite: c.taste?.riskAppetite || 'moderate',
                // Haggle stats (static profile)
                patience: c.haggleProfile?.patience ?? 6,
                priceFlexibility: c.haggleProfile?.priceFlexibility ?? 0.15,
                bluffChance: c.haggleProfile?.bluffChance ?? 0.2,
                walkawayThreshold: c.haggleProfile?.walkawayThreshold ?? 0.75,
                dealerType: c.haggleProfile?.dealerType || 'patron',
                // Network
                allies: c.network?.allies || [],
                rivals: c.network?.rivals || [],
                // Behavior
                riskTolerance: c.behavior?.riskTolerance ?? 50,
                // Tracking: restore from persisted stats if available
                totalBought: stats.totalBought ?? 0,
                totalSold: stats.totalSold ?? 0,
                totalSpent: stats.totalSpent ?? 0,
                totalEarned: stats.totalEarned ?? 0,
                strategy: stats.strategy ?? 'holder',
            };
        }
    }

    /** Get NPC state (read-only snapshot for UI) */
    static getNPCState() {
        MarketSimulator._ensureState();
        return { ...MarketSimulator._npcState };
    }

    /** Get trade log */
    static getTradeLog() { return [...MarketSimulator.tradeLog]; }

    /** Get weekly report */
    static getWeeklyReport() { return MarketSimulator.weeklyReport; }

    /** Get all trades involving a specific artwork */
    static getTradesByArtwork(artworkId) {
        return MarketSimulator.tradeLog.filter(t => t.artwork === artworkId);
    }

    /** Get all trades involving works by a specific artist */
    static getTradesByArtist(artistId) {
        return MarketSimulator.tradeLog.filter(t => {
            const work = ARTWORKS.find(a => a.id === t.artwork);
            return work?.artistId === artistId;
        });
    }

    // ══════════════════════════════════════════════════════════════
    // Main Simulation Tick (called from WeekEngine)
    // ══════════════════════════════════════════════════════════════

    /**
     * Run one week of NPC market activity.
     * @param {number} week — current game week
     * @param {string} marketCycle — 'bull' | 'bear' | 'flat'
     */
    static simulate(week, marketCycle = 'flat') {
        MarketSimulator._ensureState();
        const state = MarketSimulator._npcState;
        const npcs = Object.values(state);

        // Phase 1: Decision Making
        const sellOrders = [];
        const buyOrders = [];

        for (const npc of npcs) {
            const sells = MarketSimulator._decideSells(npc, week, marketCycle);
            const buys = MarketSimulator._decideBuys(npc, week, marketCycle);
            sellOrders.push(...sells);
            buyOrders.push(...buys);
        }

        // Phase 2: Order Matching
        const matches = MarketSimulator._matchOrders(buyOrders, sellOrders, state);

        // Phase 3 & 4: Resolve + Settle
        const trades = [];
        for (const match of matches) {
            const result = MarketSimulator._resolveTrade(match, state);
            if (result) {
                MarketSimulator._settle(result, state, week);
                trades.push(result);
            }
        }

        // Update strategy labels
        for (const npc of npcs) {
            npc.strategy = MarketSimulator._classifyStrategy(npc);
        }

        // Build weekly report
        MarketSimulator.weeklyReport = {
            week,
            tradesExecuted: trades.length,
            totalVolume: trades.reduce((s, t) => s + t.price, 0),
            avgPrice: trades.length > 0 ? Math.round(trades.reduce((s, t) => s + t.price, 0) / trades.length) : 0,
            sellOrderCount: sellOrders.length,
            buyOrderCount: buyOrders.length,
            matchCount: matches.length,
            topBuyer: MarketSimulator._topBy(npcs, 'totalSpent'),
            topSeller: MarketSimulator._topBy(npcs, 'totalEarned'),
            biggestCollection: MarketSimulator._topBy(npcs, n => n.owned.length),
            trades: trades.map(t => ({
                buyer: t.buyerId, seller: t.sellerId,
                artwork: t.artworkId, price: t.price, week,
                type: 'npc_trade',
                title: t.artwork?.title || '',
                artistId: t.artwork?.artistId || '',
            })),
        };

        // Trim trade log
        MarketSimulator.tradeLog.push(...MarketSimulator.weeklyReport.trades);
        if (MarketSimulator.tradeLog.length > MAX_LOG_SIZE) {
            MarketSimulator.tradeLog = MarketSimulator.tradeLog.slice(-MAX_LOG_SIZE);
        }

        // Generate open orders for Bloomberg order book
        MarketSimulator.generateOpenOrders(week, marketCycle);

        // ── Persist NPC state to Zustand store ──
        try {
            useNPCStore.getState().syncAllMarketData(MarketSimulator._npcState);
        } catch { /* store may not be initialized */ }

        return MarketSimulator.weeklyReport;
    }

    // ══════════════════════════════════════════════════════════════
    // Phase 1: NPC Decision Making
    // ══════════════════════════════════════════════════════════════

    /** Decide which artworks an NPC wants to sell this week */
    static _decideSells(npc, week, marketCycle) {
        const orders = [];
        const ownedWorks = npc.owned
            .map(id => ARTWORKS.find(a => a.id === id))
            .filter(Boolean);

        for (const work of ownedWorks) {
            const currentPrice = MarketSimulator._getPrice(work);
            const askPriceBase = work.askingPrice || currentPrice;

            // Build formula context
            const ctx = {
                financialStress: npc.financialStress || 0,
                cashRatio: npc.spendingCeiling > 0 ? npc.cash / npc.spendingCeiling : 1,
                isBear: marketCycle === 'bear' ? 1 : 0,
                profitRatio: askPriceBase > 0 ? currentPrice / askPriceBase : 1,
                capacityRatio: npc.maxCapacity > 0 ? npc.owned.length / npc.maxCapacity : 0,
                isForSale: npc.forSale.includes(work.id) ? 1 : 0,
            };

            // Evaluate sell probability via formula or fallback
            let sellProbability;
            if (MARKET_FORMULAS.sellProbability) {
                sellProbability = ExpressionEngine.evaluate(MARKET_FORMULAS.sellProbability, ctx);
            } else {
                sellProbability = 0.05;
                if (npc.financialStress > 50) sellProbability += 0.15;
                if (npc.cash < npc.spendingCeiling * 0.3) sellProbability += 0.20;
                if (marketCycle === 'bear') sellProbability += 0.10;
                if (currentPrice > askPriceBase * 1.4) sellProbability += 0.15;
                if (npc.owned.length >= npc.maxCapacity * 0.8) sellProbability += 0.10;
                if (npc.forSale.includes(work.id)) sellProbability += 0.20;
            }

            if (Math.random() < sellProbability) {
                // Ask price via formula or fallback
                let flex;
                if (MARKET_FORMULAS.askPriceMultiplier) {
                    flex = ExpressionEngine.evaluate(MARKET_FORMULAS.askPriceMultiplier, { npcFlexibility: npc.priceFlexibility || 0 });
                } else {
                    flex = 1 + (1 - npc.priceFlexibility) * 0.15;
                }
                orders.push({
                    type: 'sell',
                    npcId: npc.id,
                    artworkId: work.id,
                    artwork: work,
                    askPrice: Math.round(currentPrice * flex),
                    urgency: npc.financialStress > 60 ? 'high' : 'normal',
                });
            }
        }
        return orders;
    }

    /** Decide what an NPC wants to buy this week */
    static _decideBuys(npc, week, marketCycle) {
        if (npc.cash < 2000) return []; // Too broke
        if (npc.owned.length >= npc.maxCapacity) return []; // Collection full

        let buyProbability = 0.15; // Base 15% chance to be buying

        // Bull market → more buying
        if (marketCycle === 'bull') buyProbability += 0.15;

        // Cash-rich → more buying
        if (npc.cash > npc.spendingCeiling * 2) buyProbability += 0.10;

        // Risk appetite
        if (npc.riskAppetite === 'aggressive') buyProbability += 0.10;
        if (npc.riskAppetite === 'conservative') buyProbability -= 0.05;

        if (Math.random() > buyProbability) return [];

        // Budget: min of spending ceiling and 40% of liquid cash
        const budget = Math.min(npc.spendingCeiling, npc.cash * 0.4);

        return [{
            type: 'buy',
            npcId: npc.id,
            budget,
            preferredGenres: npc.preferredGenres,
            preferredTiers: npc.preferredTiers,
            avoidedGenres: npc.avoidedGenres,
            riskTolerance: npc.riskTolerance,
        }];
    }

    // ══════════════════════════════════════════════════════════════
    // Phase 2: Order Matching
    // ══════════════════════════════════════════════════════════════

    /** Match buy orders with sell orders */
    static _matchOrders(buyOrders, sellOrders, npcState) {
        const matches = [];
        const usedSells = new Set();
        const usedBuys = new Set();

        // Shuffle for fairness
        const shuffledBuys = [...buyOrders].sort(() => Math.random() - 0.5);

        for (const buy of shuffledBuys) {
            if (usedBuys.has(buy.npcId)) continue; // 1 buy per NPC per week

            // Score each available sell order for this buyer
            const scored = sellOrders
                .filter(s => {
                    if (usedSells.has(s.artworkId)) return false;
                    if (s.npcId === buy.npcId) return false; // Can't buy own
                    if (s.askPrice > buy.budget * 1.3) return false; // Way too expensive
                    return true;
                })
                .map(sell => ({
                    sell,
                    score: MarketSimulator._matchScore(buy, sell, npcState),
                }))
                .filter(s => s.score > 0)
                .sort((a, b) => b.score - a.score);

            if (scored.length > 0) {
                const best = scored[0].sell;
                matches.push({ buy, sell: best });
                usedSells.add(best.artworkId);
                usedBuys.add(buy.npcId);
            }
        }

        return matches;
    }

    /** Score how well a sell matches a buy (higher = better) */
    static _matchScore(buy, sell, npcState) {
        const work = sell.artwork;
        if (!work) return 0;

        // Build formula context
        const buyer = npcState[buy.npcId];
        const ctx = {
            genreMatch: (buy.preferredGenres.length > 0 && buy.preferredGenres.includes(work.genre)) ? 1 : 0,
            genreAvoided: (buy.preferredGenres.length > 0 && buy.avoidedGenres?.includes(work.genre)) ? 1 : 0,
            tierMatch: buy.preferredTiers?.includes(work.tier) ? 1 : 0,
            priceRatio: buy.budget > 0 ? sell.askPrice / buy.budget : 99,
            isAlly: buyer?.allies?.includes(sell.npcId) ? 1 : 0,
            isRival: buyer?.rivals?.includes(sell.npcId) ? 1 : 0,
            isUrgent: sell.urgency === 'high' ? 1 : 0,
        };

        if (ctx.genreAvoided) return 0; // Hard no, skip formula

        if (MARKET_FORMULAS.matchScore) {
            return ExpressionEngine.evaluate(MARKET_FORMULAS.matchScore, ctx);
        }

        // Hardcoded fallback
        let score = 10;
        if (ctx.genreMatch) score += 30;
        if (ctx.tierMatch) score += 20;
        if (ctx.priceRatio < 0.5) score += 15;
        else if (ctx.priceRatio < 0.8) score += 10;
        else if (ctx.priceRatio > 1.0) score -= 10;
        if (ctx.isAlly) score += 15;
        if (ctx.isRival) score -= 20;
        if (ctx.isUrgent) score += 10;
        return Math.max(0, score);
    }

    // ══════════════════════════════════════════════════════════════
    // Phase 3: Trade Resolution
    // ══════════════════════════════════════════════════════════════

    /** Simplified haggle between buyer and seller */
    static _resolveTrade(match, npcState) {
        const { buy, sell } = match;
        const buyer = npcState[buy.npcId];
        const seller = npcState[sell.npcId];
        if (!buyer || !seller) return null;

        const askPrice = sell.askPrice;
        const maxBid = Math.min(buy.budget, askPrice * 1.1); // Buyer's max

        // Starting bid: buyer offers less based on their flexibility
        const openingBid = askPrice * (1 - buyer.priceFlexibility * 1.5);

        // Negotiate: simplified 3-round convergence
        let bid = openingBid;
        let ask = askPrice;

        for (let round = 0; round < 3; round++) {
            // Buyer raises
            bid += (ask - bid) * buyer.priceFlexibility * 0.6;

            // Seller lowers (based on urgency and flexibility)
            const sellerGive = seller.priceFlexibility * (sell.urgency === 'high' ? 0.8 : 0.4);
            ask -= (ask - bid) * sellerGive;

            // Bluff check: seller pretends to walk away
            if (Math.random() < seller.bluffChance) {
                bid += (ask - bid) * 0.15; // Buyer panics slightly
            }
        }

        // Final gap check
        const finalPrice = Math.round((bid + ask) / 2);
        const gap = Math.abs(ask - bid) / ask;

        // Walk-away check
        if (gap > (1 - seller.walkawayThreshold)) return null; // Too far apart
        if (finalPrice > maxBid) return null; // Buyer can't afford
        if (finalPrice > buyer.cash) return null; // Liquidity check

        // Relationship modifier — use formula
        const closureCtx = {
            isAlly: buyer.allies?.includes(seller.id) ? 1 : 0,
            isRival: buyer.rivals?.includes(seller.id) ? 1 : 0,
            buyerPatience: buyer.patience || 0,
            sellerPatience: seller.patience || 0,
        };

        let dealChance;
        if (MARKET_FORMULAS.dealClosure) {
            dealChance = ExpressionEngine.evaluate(MARKET_FORMULAS.dealClosure, closureCtx);
        } else {
            dealChance = 0.85;
            if (buyer.allies?.includes(seller.id)) dealChance += 0.10;
            if (buyer.rivals?.includes(seller.id)) dealChance -= 0.25;
            dealChance += (buyer.patience + seller.patience) * 0.01;
        }

        if (Math.random() > dealChance) return null; // Deal fell through

        return {
            buyerId: buy.npcId,
            sellerId: sell.npcId,
            artworkId: sell.artworkId,
            artwork: sell.artwork,
            askPrice: sell.askPrice,
            finalBid: Math.round(bid),
            finalAsk: Math.round(ask),
            price: finalPrice,
            discount: Math.round((1 - finalPrice / askPrice) * 100),
        };
    }

    // ══════════════════════════════════════════════════════════════
    // Phase 4: Settlement
    // ══════════════════════════════════════════════════════════════

    /** Execute a completed trade — transfer art + cash */
    static _settle(trade, npcState, week) {
        const buyer = npcState[trade.buyerId];
        const seller = npcState[trade.sellerId];
        if (!buyer || !seller) return;

        // Transfer artwork
        seller.owned = seller.owned.filter(id => id !== trade.artworkId);
        seller.forSale = seller.forSale.filter(id => id !== trade.artworkId);
        buyer.owned.push(trade.artworkId);

        // Transfer cash
        buyer.cash -= trade.price;
        seller.cash += trade.price;

        // Update tracking
        buyer.totalBought++;
        buyer.totalSpent += trade.price;
        seller.totalSold++;
        seller.totalEarned += trade.price;

        // Log to ActivityLogger
        ActivityLogger.logMarket('npc_trade', {
            buyer: buyer.name, buyerId: trade.buyerId,
            seller: seller.name, sellerId: trade.sellerId,
            artwork: trade.artwork?.title || trade.artworkId,
            artworkId: trade.artworkId,
            price: trade.price, discount: trade.discount,
        });

        // Adjust financial stress
        seller.financialStress = Math.max(0, seller.financialStress - 3);
        if (buyer.cash < buyer.spendingCeiling * 0.5) {
            buyer.financialStress = Math.min(100, buyer.financialStress + 5);
        }

        // Boost artist heat from transaction
        try {
            const artistId = trade.artwork?.artistId ||
                trade.artwork?.artist?.toLowerCase().replace(/\s+/g, '_');
            if (artistId && MarketManager.artists) {
                const artist = MarketManager.artists.find(a => a.id === artistId);
                if (artist) {
                    artist.heat = Math.min(100, (artist.heat || 50) + 2 + Math.random() * 3);
                }
            }
        } catch { /* non-critical */ }

        // Add news to game state
        try {
            const buyerName = buyer.name || buyer.id;
            const sellerName = seller.name || seller.id;
            const title = trade.artwork?.title || trade.artworkId;
            const priceStr = `$${trade.price.toLocaleString()}`;
            GameState.addNews(`[Market] ${buyerName} acquired "${title}" from ${sellerName} for ${priceStr}`);
        } catch { /* non-critical */ }

        // ── Update global artwork record with trade history ──
        try {
            const work = ARTWORK_MAP[trade.artworkId];
            if (work) {
                work.owner = trade.buyerId;
                work.lastTradePrice = trade.price;
                work.lastTradeWeek = week;
                if (!work.tradeHistory) work.tradeHistory = [];
                work.tradeHistory.push({
                    buyer: trade.buyerId,
                    seller: trade.sellerId,
                    buyerName: buyer?.name || trade.buyerId,
                    sellerName: seller?.name || trade.sellerId,
                    price: trade.price,
                    week,
                    discount: trade.discount,
                    type: 'npc_trade',
                });
                // Update provenance chain
                if (!work.provenance) work.provenance = [];
                work.provenance.push({
                    owner: trade.buyerId,
                    acquiredWeek: week,
                    acquiredFrom: trade.sellerId,
                    price: trade.price,
                });
            }
        } catch { /* non-critical */ }
    }

    // ══════════════════════════════════════════════════════════════
    // Analytics
    // ══════════════════════════════════════════════════════════════

    /** Classify NPC trading strategy */
    static _classifyStrategy(npc) {
        if (npc.totalBought === 0 && npc.totalSold === 0) return 'holder';
        const ratio = npc.totalSold / Math.max(1, npc.totalBought);
        if (ratio > 1.5 && npc.totalSold > 2) return 'flipper';
        if (npc.totalBought > npc.totalSold + 3) return 'accumulator';
        return 'holder';
    }

    /** Get NPC ranked by metric */
    static _topBy(npcs, metric) {
        const fn = typeof metric === 'function' ? metric : (n) => n[metric];
        const sorted = [...npcs].sort((a, b) => fn(b) - fn(a));
        const top = sorted[0];
        return top ? { id: top.id, name: top.name, value: fn(top) } : null;
    }

    /** Get artwork price via MarketManager or fallback */
    static _getPrice(work) {
        try {
            return MarketManager.calculatePrice(work, false) || work.askingPrice || 10000;
        } catch {
            return work.askingPrice || 10000;
        }
    }

    // ══════════════════════════════════════════════════════════════
    // Intra-Week Micro Trades (called from GameState.advanceTime)
    // ══════════════════════════════════════════════════════════════

    /**
     * Attempt a single NPC-to-NPC trade during intra-week time advancement.
     * Called each game-hour from advanceTime() — ~1% chance per call so trades
     * trickle in throughout the week rather than all resolving at week-end.
     *
     * @param {number} hour — current game hour (0-23)
     * @param {number} dayOfWeek — 1-7
     * @param {string} marketCycle — 'bull' | 'bear' | 'flat'
     * @returns {object|null} — trade result or null if nothing happened
     */
    static simulateMicroTrade(hour, dayOfWeek, marketCycle) {
        // ~1% chance per micro-tick (each game-hour). With ~16 waking hours × 7 days
        // that's ~112 attempts per week, yielding ~1.1 trades/week on average.
        if (Math.random() > 0.01) {
            // Even if no trade, 0.3% chance to post a visible order to the book
            if (Math.random() < 0.003) {
                const week = GameState.state?.week || 1;
                MarketSimulator.generateOpenOrders(week, marketCycle);
            }
            return null;
        }

        MarketSimulator._ensureState();
        const state = MarketSimulator._npcState;
        const npcs = Object.values(state);

        // Pick a random NPC to be the buyer
        const buyerIdx = Math.floor(Math.random() * npcs.length);
        const buyer = npcs[buyerIdx];
        if (!buyer || buyer.cash < 2000 || buyer.owned.length >= buyer.maxCapacity) return null;

        // Generate a buy order
        const buys = MarketSimulator._decideBuys(buyer, GameState.state?.week || 1, marketCycle);
        if (buys.length === 0) return null;
        const buyOrder = buys[0];

        // Find a seller with something to sell
        const sellOrders = [];
        for (const npc of npcs) {
            if (npc.id === buyer.id) continue;
            const sells = MarketSimulator._decideSells(npc, GameState.state?.week || 1, marketCycle);
            sellOrders.push(...sells);
        }
        if (sellOrders.length === 0) return null;

        // Match
        const matches = MarketSimulator._matchOrders([buyOrder], sellOrders, state);
        if (matches.length === 0) return null;

        // Resolve + settle
        const result = MarketSimulator._resolveTrade(matches[0], state);
        if (!result) return null;

        const week = GameState.state?.week || 1;
        MarketSimulator._settle(result, state, week);

        // Record in trade log
        const tradeEntry = {
            buyer: result.buyerId, seller: result.sellerId,
            artwork: result.artworkId, price: result.price, week,
            type: 'sim_manual',
        };
        MarketSimulator.tradeLog.push(tradeEntry);
        if (MarketSimulator.tradeLog.length > MAX_LOG_SIZE) {
            MarketSimulator.tradeLog = MarketSimulator.tradeLog.slice(-MAX_LOG_SIZE);
        }

        return tradeEntry;
    }

    // ══════════════════════════════════════════════════════════════
    // CMS / Debug API
    // ══════════════════════════════════════════════════════════════

    /** Run N weeks of simulation without advancing the game (for CMS testing) */
    static simulateMultipleWeeks(count = 10, startWeek = 1) {
        MarketSimulator._npcState = null; // Reset
        MarketSimulator.tradeLog = [];
        const reports = [];
        const priceHistory = []; // Per-week snapshot of all artist prices
        const marketEvents = []; // Events that fire during simulation
        let currentCycle = 'flat';
        const cycleHistory = [];

        for (let w = startWeek; w < startWeek + count; w++) {
            // Market cycle evolution (more realistic than random)
            const cycleRoll = Math.random();
            if (currentCycle === 'flat') {
                if (cycleRoll < 0.08) currentCycle = 'bull';
                else if (cycleRoll < 0.14) currentCycle = 'bear';
            } else if (currentCycle === 'bull') {
                if (cycleRoll < 0.12) currentCycle = 'flat';
                else if (cycleRoll < 0.04) currentCycle = 'bear'; // crash
            } else if (currentCycle === 'bear') {
                if (cycleRoll < 0.10) currentCycle = 'flat';
            }
            cycleHistory.push(currentCycle);

            // Fire market events (~15% chance per week)
            const evt = MarketSimulator._generateMarketEvent(w, currentCycle);
            if (evt) {
                marketEvents.push(evt);
                // Apply event effects
                MarketSimulator._applyMarketEvent(evt);
            }

            const report = MarketSimulator.simulate(w, currentCycle);
            reports.push(report);

            // Snapshot artist prices + indices for price charts
            try {
                const artistPrices = {};
                const allWorks = ARTWORKS || [];
                for (const artist of (MarketManager.artists || [])) {
                    const works = allWorks.filter(aw => aw.artistId === artist.id);
                    const prices = works.map(aw => MarketSimulator._getPrice(aw));
                    const avgPrice = prices.length > 0
                        ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
                        : artist.basePriceMin || 10000;
                    artistPrices[artist.id] = {
                        name: artist.name, tier: artist.tier,
                        avgPrice, heat: Math.round(artist.heat * 10) / 10,
                        index: artist.artistIndex || 500,
                    };
                }
                const compositeIndex = MarketManager.getCompositeIndex
                    ? MarketManager.getCompositeIndex() : 1000;

                priceHistory.push({
                    week: w, cycle: currentCycle,
                    compositeIndex,
                    artists: artistPrices,
                    volume: report.totalVolume,
                    trades: report.tradesExecuted,
                });
            } catch { /* price tracking is non-critical */ }
        }

        return {
            weeks: count,
            reports,
            totalTrades: reports.reduce((s, r) => s + r.tradesExecuted, 0),
            totalVolume: reports.reduce((s, r) => s + r.totalVolume, 0),
            npcState: MarketSimulator.getNPCState(),
            tradeLog: MarketSimulator.getTradeLog(),
            priceHistory,
            marketEvents,
            cycleHistory,
        };
    }

    // ── Market Events System ──

    static _generateMarketEvent(week, cycle) {
        if (Math.random() > 0.18) return null; // ~18% chance per week

        const artists = MarketManager.artists || [];
        if (artists.length === 0) return null;
        const randArtist = artists[Math.floor(Math.random() * artists.length)];

        const events = [
            {
                type: 'auction_record', severity: 'positive',
                title: `Auction Record: ${randArtist.name}`,
                description: `${randArtist.name}'s work sells for record price at Christie's.`,
                effect: { artistId: randArtist.id, heatDelta: 12 },
            },
            {
                type: 'scandal', severity: 'negative',
                title: `Authenticity Dispute: ${randArtist.name}`,
                description: `Questions raised about provenance of recent ${randArtist.name} work.`,
                effect: { artistId: randArtist.id, heatDelta: -8 },
            },
            {
                type: 'museum_acquisition', severity: 'positive',
                title: `Museum Show: ${randArtist.name}`,
                description: `Major museum announces retrospective of ${randArtist.name}.`,
                effect: { artistId: randArtist.id, heatDelta: 8 },
            },
            {
                type: 'fair_boost', severity: 'positive',
                title: 'Art Fair Season',
                description: 'Frieze / Art Basel period drives collector activity.',
                effect: { allHeatDelta: 3 },
            },
            {
                type: 'economic_downturn', severity: 'negative',
                title: 'Economic Headwinds',
                description: 'Rising interest rates cool luxury spending.',
                effect: { allHeatDelta: -4 },
            },
            {
                type: 'gallery_closure', severity: 'negative',
                title: 'Gallery Closure',
                description: `Gallery representing ${randArtist.name} announces closure.`,
                effect: { artistId: randArtist.id, heatDelta: -10 },
            },
            {
                type: 'social_media_viral', severity: 'positive',
                title: `Viral Moment: ${randArtist.name}`,
                description: `${randArtist.name}'s work goes viral on social media.`,
                effect: { artistId: randArtist.id, heatDelta: 6 },
            },
            {
                type: 'collector_exit', severity: 'neutral',
                title: 'Major Collection Liquidation',
                description: 'Prominent collector selling entire collection at auction.',
                effect: { allHeatDelta: -2 },
            },
        ];

        const evt = events[Math.floor(Math.random() * events.length)];
        return { ...evt, week, cycle };
    }

    static _applyMarketEvent(evt) {
        if (!evt?.effect) return;
        try {
            if (evt.effect.artistId && evt.effect.heatDelta) {
                const artist = (MarketManager.artists || []).find(a => a.id === evt.effect.artistId);
                if (artist) {
                    artist.heat = clamp(artist.heat + evt.effect.heatDelta, 0, 100);
                }
            }
            if (evt.effect.allHeatDelta) {
                for (const artist of (MarketManager.artists || [])) {
                    artist.heat = clamp(artist.heat + evt.effect.allHeatDelta, 0, 100);
                }
            }
        } catch { /* non-critical */ }
    }

    /** Full state snapshot for CMS dashboard */
    static getSnapshot() {
        MarketSimulator._ensureState();
        const npcs = Object.values(MarketSimulator._npcState);
        return {
            npcs: npcs.map(n => ({
                id: n.id,
                name: n.name,
                role: n.role,
                cash: n.cash,
                collectionSize: n.owned.length,
                owned: [...n.owned],
                totalBought: n.totalBought,
                totalSold: n.totalSold,
                totalSpent: n.totalSpent,
                totalEarned: n.totalEarned,
                netProfit: n.totalEarned - n.totalSpent,
                strategy: n.strategy,
                dealerType: n.dealerType,
                financialStress: n.financialStress,
            })),
            weeklyReport: MarketSimulator.weeklyReport,
            tradeLog: MarketSimulator.tradeLog.slice(-50),
        };
    }

    // ══════════════════════════════════════════════════════════════
    // Order Book — Visible NPC Orders for Bloomberg Trading
    // ══════════════════════════════════════════════════════════════

    /**
     * Generate open NPC orders for the Bloomberg order book.
     * Called at week advance and periodically during micro-trades.
     * Creates ~3-5 sell orders and ~3-5 buy orders that persist until
     * matched, filled by the player, or expired (2 weeks).
     */
    static generateOpenOrders(week, marketCycle = 'flat') {
        MarketSimulator._ensureState();
        const state = MarketSimulator._npcState;
        const npcs = Object.values(state);

        // Expire old orders (older than 2 weeks)
        MarketSimulator.pendingSellOrders = MarketSimulator.pendingSellOrders.filter(
            o => o.expiresWeek > week
        );
        MarketSimulator.pendingBuyOrders = MarketSimulator.pendingBuyOrders.filter(
            o => o.expiresWeek > week
        );

        // Don't overpopulate — cap at 8 sell + 8 buy
        const sellCap = 8 - MarketSimulator.pendingSellOrders.length;
        const buyCap = 8 - MarketSimulator.pendingBuyOrders.length;

        // Generate sell orders from NPC decisions
        if (sellCap > 0) {
            const shuffled = [...npcs].sort(() => Math.random() - 0.5);
            let added = 0;
            for (const npc of shuffled) {
                if (added >= sellCap) break;
                const sells = MarketSimulator._decideSells(npc, week, marketCycle);
                for (const sell of sells) {
                    if (added >= sellCap) break;
                    // Skip if this artwork already has a pending order
                    if (MarketSimulator.pendingSellOrders.some(o => o.artworkId === sell.artworkId)) continue;
                    const isHighTier = sell.artwork?.tier === 'blue_chip' || sell.artwork?.tier === 'established';
                    const isShark = npc.dealerType === 'shark';
                    // 30% chance for sharks or high tier works to hide their price
                    const showInquire = (isHighTier || isShark) && Math.random() < 0.3;

                    MarketSimulator.pendingSellOrders.push({
                        id: `so_${MarketSimulator._nextOrderId++}`,
                        ...sell,
                        title: sell.artwork?.title || sell.artworkId,
                        artist: sell.artwork?.artist || 'Unknown',
                        npcName: npc.name,
                        weekPosted: week,
                        expiresWeek: week + 2,
                        inquire: showInquire
                    });
                    added++;
                }
            }
        }

        // Generate buy orders from NPC decisions
        if (buyCap > 0) {
            const shuffled = [...npcs].sort(() => Math.random() - 0.5);
            let added = 0;
            for (const npc of shuffled) {
                if (added >= buyCap) break;
                const buys = MarketSimulator._decideBuys(npc, week, marketCycle);
                for (const buy of buys) {
                    if (added >= buyCap) break;
                    // Skip if this NPC already has a pending buy order
                    if (MarketSimulator.pendingBuyOrders.some(o => o.npcId === buy.npcId)) continue;
                    MarketSimulator.pendingBuyOrders.push({
                        id: `bo_${MarketSimulator._nextOrderId++}`,
                        ...buy,
                        npcName: npc.name,
                        weekPosted: week,
                        expiresWeek: week + 2,
                    });
                    added++;
                }
            }
        }
    }

    /** Get open sell orders (for Bloomberg UI) */
    static getOpenSellOrders() {
        return [...MarketSimulator.pendingSellOrders];
    }

    /** Get open buy orders (for Bloomberg UI) */
    static getOpenBuyOrders() {
        return [...MarketSimulator.pendingBuyOrders];
    }

    /**
     * Player fills a sell order — buys at the asking price.
     * Returns the order if successful, null otherwise.
     * Caller (TerminalAPI) handles cash deduction and portfolio update.
     */
    static fillSellOrder(orderId) {
        const idx = MarketSimulator.pendingSellOrders.findIndex(o => o.id === orderId);
        if (idx === -1) return null;

        const order = MarketSimulator.pendingSellOrders.splice(idx, 1)[0];

        // Update NPC state — remove artwork from seller's collection
        MarketSimulator._ensureState();
        const seller = MarketSimulator._npcState[order.npcId];
        if (seller) {
            seller.owned = seller.owned.filter(id => id !== order.artworkId);
            seller.forSale = seller.forSale.filter(id => id !== order.artworkId);
            seller.cash += order.askPrice;
            seller.totalSold++;
            seller.totalEarned += order.askPrice;
            seller.financialStress = Math.max(0, seller.financialStress - 3);
        }

        // Log trade
        const week = GameState.state?.week || 1;
        const tradeEntry = {
            buyer: 'player', seller: order.npcId,
            artwork: order.artworkId, price: order.askPrice, week,
            type: 'player_buy',
            title: order.artwork?.title || '',
            artistId: order.artwork?.artistId || '',
        };
        MarketSimulator.tradeLog.push(tradeEntry);
        if (MarketSimulator.tradeLog.length > MAX_LOG_SIZE) {
            MarketSimulator.tradeLog = MarketSimulator.tradeLog.slice(-MAX_LOG_SIZE);
        }

        // Boost artist heat from transaction
        try {
            const artistId = order.artwork?.artistId;
            if (artistId && MarketManager.artists) {
                const artist = MarketManager.artists.find(a => a.id === artistId);
                if (artist) artist.heat = Math.min(100, (artist.heat || 50) + 3);
            }
        } catch { /* non-critical */ }

        return order;
    }

    /**
     * Cancel a player-originated order (for sell listings).
     * Returns true if found and removed.
     */
    static cancelOrder(orderId) {
        let idx = MarketSimulator.pendingSellOrders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
            MarketSimulator.pendingSellOrders.splice(idx, 1);
            return true;
        }
        idx = MarketSimulator.pendingBuyOrders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
            MarketSimulator.pendingBuyOrders.splice(idx, 1);
            return true;
        }
        return false;
    }

    /**
     * Seed the trade log with historical demo trades so Bloomberg
     * TradeFeed and analytics panels have data on first open.
     * Uses real ARTWORKS IDs so title lookups resolve correctly.
     * Called from GameState.quickDemoInit() and seedDemoSave().
     */
    static seedTradeLog() {
        // Only seed if trade log is empty — don't overwrite live data
        if (MarketSimulator.tradeLog.length > 0) return;

        const demoTrades = [
            // NPC-to-NPC trades across weeks 2-9
            { buyer: 'elena_vasquez', seller: 'max_sterling', artwork: 'haring_radiant_baby_1982', price: 192000, week: 2 },
            { buyer: 'ibrahim_kone', seller: 'nadia_volkov', artwork: 'kwame_asante_portrait_series', price: 28000, week: 3 },
            { buyer: 'nadia_volkov', seller: 'elena_vasquez', artwork: 'liu_wei_architecture_03', price: 35000, week: 5 },
            { buyer: 'max_sterling', seller: 'ibrahim_kone', artwork: 'amoako_boafo_skin_series', price: 62000, week: 6 },
            { buyer: 'ibrahim_kone', seller: 'max_sterling', artwork: 'priya_sundaram_ghost_print', price: 8500, week: 8 },
            // Player trades (match GameState.transactions)
            { buyer: 'player', seller: 'elena_vasquez', artwork: 'elara_voss_chromatic_field', price: 44000, week: 1 },
            { buyer: 'nadia_volkov', seller: 'player', artwork: 'elara_voss_chromatic_field', price: 68000, week: 5 },
            { buyer: 'player', seller: 'max_sterling', artwork: 'yuki_tanaka_kyoto_study', price: 38000, week: 8 },
            // Late-week NPC trade
            { buyer: 'elena_vasquez', seller: 'ibrahim_kone', artwork: 'jadé_fadojutimi_composition', price: 45000, week: 9 },
        ];

        MarketSimulator.tradeLog.push(...demoTrades);
    }

    /**
     * Load historical trades from MarketHistoryEngine output.
     * Called during MarketManager.init() to pre-populate the trade log
     * with realistic multi-year trade data spanning the full simulation.
     *
     * @param {Array} trades — from MarketHistoryEngine.generate().trades
     */
    static loadHistoricalTrades(trades) {
        if (!trades || trades.length === 0) return;

        // Only load if trade log is empty or has only demo trades (< 20)
        if (MarketSimulator.tradeLog.length > 20) return;

        // Convert engine trades to trade log format and append
        const formatted = trades.map(t => ({
            buyer: t.buyer,
            seller: t.seller,
            artwork: t.artworkId,
            artworkId: t.artworkId,
            title: t.title || '',
            artist: t.artist || '',
            artistId: t.artistId || '',
            price: t.price,
            week: t.week,
            type: t.type || 'historical',
            medium: t.medium || '',
            tier: t.tier || '',
            cycle: t.cycle || 'flat',
        }));

        // Pre-pend historical trades before any existing ones
        MarketSimulator.tradeLog = [...formatted, ...MarketSimulator.tradeLog];

        // Trim to max
        if (MarketSimulator.tradeLog.length > MAX_LOG_SIZE) {
            MarketSimulator.tradeLog = MarketSimulator.tradeLog.slice(-MAX_LOG_SIZE);
        }

        console.log(`[MarketSimulator] Loaded ${formatted.length} historical trades (${MarketSimulator.tradeLog.length} total in log)`);
    }

    /** Reset all simulation state */
    static reset() {
        MarketSimulator._npcState = null;
        MarketSimulator.tradeLog = [];
        MarketSimulator.weeklyReport = null;
        MarketSimulator.pendingSellOrders = [];
        MarketSimulator.pendingBuyOrders = [];
    }
}
