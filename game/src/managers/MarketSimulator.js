/**
 * MarketSimulator — Autonomous NPC-to-NPC art trading engine
 *
 * Runs each game week (called from WeekEngine), separate from the
 * player-facing haggle battle. Simulates a living art market where
 * NPCs buy, sell, and flip artworks based on their profiles.
 *
 * 4-Phase Pipeline:
 *   1. NPC Decision Making — each NPC evaluates buy/sell/hold
 *   2. Order Matching      — pair buyers with sellers
 *   3. Trade Resolution    — simplified haggle between 2 NPCs
 *   4. Settlement          — transfer art, cash, boost heat, log
 *
 * Data Sources:
 *   contacts.js  → wealth, collection, taste, haggleProfile, network
 *   artworks.js  → artwork database with tiers and genres
 *   MarketManager → artist heat, pricing engine, market cycle
 */

import { CONTACTS } from '../data/contacts.js';
import { ARTWORKS } from '../data/artworks.js';
import { MarketManager } from './MarketManager.js';
import { GameState } from './GameState.js';
import { ActivityLogger } from './ActivityLogger.js';
import { useNPCStore } from '../stores/npcStore.js';

// ── Trade Log (persisted per session) ──
const MAX_LOG_SIZE = 200;

export class MarketSimulator {
    /** All trades executed this session */
    static tradeLog = [];

    /** Summary stats updated each tick */
    static weeklyReport = null;

    /** NPC collection state — initialized from CONTACTS on first tick */
    static _npcState = null;

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
            })),
        };

        // Trim trade log
        MarketSimulator.tradeLog.push(...MarketSimulator.weeklyReport.trades);
        if (MarketSimulator.tradeLog.length > MAX_LOG_SIZE) {
            MarketSimulator.tradeLog = MarketSimulator.tradeLog.slice(-MAX_LOG_SIZE);
        }

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
            let sellProbability = 0.05; // Base 5% chance per week

            // Financial pressure increases selling
            if (npc.financialStress > 50) sellProbability += 0.15;
            if (npc.cash < npc.spendingCeiling * 0.3) sellProbability += 0.20;

            // Bear market → more selling
            if (marketCycle === 'bear') sellProbability += 0.10;

            // Profit motive: sell if current price >> what they might have paid
            const currentPrice = MarketSimulator._getPrice(work);
            const askPrice = work.askingPrice || currentPrice;
            if (currentPrice > askPrice * 1.4) sellProbability += 0.15; // >40% profit

            // Collection too full
            if (npc.owned.length >= npc.maxCapacity * 0.8) sellProbability += 0.10;

            // Already marked for sale gets a boost
            if (npc.forSale.includes(work.id)) sellProbability += 0.20;

            // Dice roll
            if (Math.random() < sellProbability) {
                // Ask price: current market + NPC flexibility
                const flex = 1 + (1 - npc.priceFlexibility) * 0.15;
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
        let score = 10; // Base

        const work = sell.artwork;
        if (!work) return 0;

        // Genre match
        if (buy.preferredGenres.length > 0) {
            if (buy.preferredGenres.includes(work.genre)) score += 30;
            else if (buy.avoidedGenres.includes(work.genre)) return 0; // Hard no
        }

        // Tier match
        if (buy.preferredTiers.includes(work.tier)) score += 20;

        // Price vs budget (closer to budget = lower score, bargains preferred)
        const priceRatio = sell.askPrice / buy.budget;
        if (priceRatio < 0.5) score += 15; // Bargain
        else if (priceRatio < 0.8) score += 10;
        else if (priceRatio > 1.0) score -= 10;

        // Ally bonus
        const buyer = npcState[buy.npcId];
        if (buyer?.allies?.includes(sell.npcId)) score += 15;
        if (buyer?.rivals?.includes(sell.npcId)) score -= 20;

        // Urgent sellers are more attractive (willing to deal)
        if (sell.urgency === 'high') score += 10;

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

        // Relationship modifier
        let dealChance = 0.85; // Base 85% deal closure
        if (buyer.allies?.includes(seller.id)) dealChance += 0.10;
        if (buyer.rivals?.includes(seller.id)) dealChance -= 0.25;

        // Patience modifier
        dealChance += (buyer.patience + seller.patience) * 0.01;

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
        if (Math.random() > 0.01) return null;

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
        for (let w = startWeek; w < startWeek + count; w++) {
            const cycle = ['bull', 'flat', 'bear'][Math.floor(Math.random() * 3)];
            reports.push(MarketSimulator.simulate(w, cycle));
        }
        return {
            weeks: count,
            reports,
            totalTrades: reports.reduce((s, r) => s + r.tradesExecuted, 0),
            totalVolume: reports.reduce((s, r) => s + r.totalVolume, 0),
            npcState: MarketSimulator.getNPCState(),
            tradeLog: MarketSimulator.getTradeLog(),
        };
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

    /** Reset all simulation state */
    static reset() {
        MarketSimulator._npcState = null;
        MarketSimulator.tradeLog = [];
        MarketSimulator.weeklyReport = null;
    }
}
