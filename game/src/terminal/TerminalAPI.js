/**
 * TerminalAPI.js
 * Extracted during Phase 41 Architecture Refactoring.
 * A facade that provides rendering screens with a single point of access
 * to game state, managers, and data.
 */

import { GameState } from '../managers/GameState.js';
import { QualityGate } from '../managers/QualityGate.js';
import { MarketManager } from '../managers/MarketManager.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { ConsequenceScheduler } from '../managers/ConsequenceScheduler.js';
import { DecisionLog } from '../managers/DecisionLog.js';
import { DialogueTreeManager } from '../managers/DialogueTreeManager.js';
import { TickerSystem } from '../ui/TickerSystem.js';
import { useUIStore } from '../stores/uiStore.js';
import { ARTWORKS } from '../data/artworks.js';
import { VENUES } from '../data/rooms.js';
import { CHARACTERS } from '../data/characters.js';
import { CONTACTS } from '../data/contacts.js';
import { DIALOGUE_TREES, TREES_BY_NPC } from '../data/dialogue_trees.js';
import { PhoneManager } from '../managers/PhoneManager.js';
import { useNPCStore } from '../stores/npcStore.js';
import { useEventStore } from '../stores/eventStore.js';
import { useMarketStore } from '../stores/marketStore.js';
import { useInventoryStore } from '../stores/inventoryStore.js';
import { useConsequenceStore } from '../stores/consequenceStore.js';
import { EventRegistry } from '../managers/EventRegistry.js';
import { MarketSimulator } from '../managers/MarketSimulator.js';
// Import WeekEngine to trigger self-registration with GameState
import { WeekEngine } from '../managers/WeekEngine.js';

export const TerminalAPI = {
    // ── State & Managers ──
    state: () => GameState.state,
    market: MarketManager,
    assets: window.AssetManager || {},
    haggle: HaggleManager,
    scheduler: ConsequenceScheduler,
    log: DecisionLog,
    dialogue: DialogueTreeManager,
    network: PhoneManager,
    npcStore: useNPCStore,
    ticker: TickerSystem,
    settings: window.SettingsManager || {},
    gate: QualityGate,
    decisions: DecisionLog,

    // ── Stores ──
    uiStore: useUIStore,
    marketStore: useMarketStore,
    inventoryStore: useInventoryStore,
    consequenceStore: useConsequenceStore,
    eventStore: useEventStore,

    // ── Data ──
    artworks: ARTWORKS,
    venues: VENUES,
    characters: CHARACTERS,
    contacts: CONTACTS,
    messages: [], // Removed MESSAGES
    dialogueTrees: DIALOGUE_TREES,
    treesByNpc: TREES_BY_NPC,

    // ── Game Helpers ──
    advanceWeek: () => {
        // WeekEngine handles MarketManager.tick(), store sync, and autoSave internally
        GameState.advanceWeek();
    },
    getLastWeekReport: () => WeekEngine.lastReport,
    getPendingEvent: () => EventRegistry.getPendingEvent(),

    initGame: {
        init: (characterData) => GameState.init(characterData),
        changeCity: (city) => GameState.changeCity(city),
        autoSave: () => GameState.autoSave(),
        applyEffects: (effects) => GameState.applyEffects(effects),
        // ── Save/Load ──
        hasSave: () => GameState.hasSave(),
        getSaveSlots: () => GameState.getSaveSlots(),
        saveGame: (slotIndex) => GameState.save(slotIndex),
        loadGame: (slotIndex) => GameState.load(slotIndex),
        deleteSave: (slotIndex) => GameState.deleteSave(slotIndex),
        getMostRecentSlot: () => GameState.getMostRecentSlot(),
        buyWork: (work) => {
            const s = GameState.state;
            s.cash -= work.price;
            work.owner = 'player';
            work.purchasePrice = work.price;
            work.purchaseWeek = s.week;
            work.purchaseCity = s.currentCity;
            work.storage = 'home';
            work.provenance = work.provenance || [];
            work.provenance.push({
                type: 'acquired', week: s.week, city: s.currentCity, price: work.price, source: 'Market'
            });
            s.portfolio.push(work);
        }
    },
    addNews: (msg) => GameState.addNews(msg),
    getPortfolioValue: () => GameState.getPortfolioValue(),
    applyEffects: (effects) => GameState.applyEffects(effects),

    // ═══════════════════════════════════════════════════════════
    //  NPC MARKET API — plugin point for UI components
    // ═══════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════
    //  BLOOMBERG WATCHLIST API
    // ═══════════════════════════════════════════════════════════

    watchlist: {
        /** Add an artist or artwork to the watchlist */
        add: (type, id, price) => {
            const s = GameState.state;
            if (!s) return;
            if (!s.watchlist) s.watchlist = [];
            if (s.watchlist.some(w => w.id === id)) return; // already watching
            s.watchlist.push({ type, id, addedWeek: s.week, addedPrice: price || null });
        },
        /** Remove an item from the watchlist */
        remove: (id) => {
            const s = GameState.state;
            if (!s?.watchlist) return;
            s.watchlist = s.watchlist.filter(w => w.id !== id);
        },
        /** Check if an item is on the watchlist */
        isWatched: (id) => {
            return (GameState.state?.watchlist || []).some(w => w.id === id);
        },
        /** Get the full watchlist */
        get: () => GameState.state?.watchlist || [],
        /** Get watchlist with resolved current prices */
        getWithPrices: () => {
            const list = GameState.state?.watchlist || [];
            return list.map(item => {
                let currentPrice = 0;
                if (item.type === 'artist') {
                    const works = MarketManager.works?.filter(w => w.artistId === item.id && w.onMarket) || [];
                    currentPrice = works.length > 0
                        ? Math.round(works.reduce((s, w) => s + w.price, 0) / works.length)
                        : 0;
                } else {
                    const work = ARTWORKS.find(a => a.id === item.id);
                    try { currentPrice = MarketManager.calculatePrice(work, false); }
                    catch { currentPrice = work?.askingPrice || 0; }
                }
                const delta = item.addedPrice ? ((currentPrice - item.addedPrice) / item.addedPrice * 100) : 0;
                return { ...item, currentPrice, delta: Math.round(delta * 10) / 10 };
            });
        },
    },

    // ═══════════════════════════════════════════════════════════
    //  BLOOMBERG TRADING API — buy, sell, haggle from terminal
    // ═══════════════════════════════════════════════════════════

    bloomberg: {
        /** Get open sell orders, intel-gated (masks NPC names < intel 60, prices < intel 20) */
        getOpenSellOrders: () => MarketSimulator.getOpenSellOrders(),

        /** Get open buy orders */
        getOpenBuyOrders: () => MarketSimulator.getOpenBuyOrders(),

        /**
         * Player buys directly from a sell order.
         * Returns { success, order, error } — caller handles AP deduction.
         */
        buyFromOrder: (orderId) => {
            const s = GameState.state;
            if (!s) return { success: false, error: 'No game state' };

            const order = MarketSimulator.pendingSellOrders.find(o => o.id === orderId);
            if (!order) return { success: false, error: 'Order no longer available' };
            if (s.cash < order.askPrice) return { success: false, error: 'Insufficient funds' };

            // Fill the order (updates NPC state, logs trade)
            const filled = MarketSimulator.fillSellOrder(orderId);
            if (!filled) return { success: false, error: 'Order fill failed' };

            // Transfer to player: deduct cash, add to portfolio
            s.cash -= filled.askPrice;
            const work = filled.artwork || ARTWORKS.find(a => a.id === filled.artworkId) || {
                id: filled.artworkId, title: filled.title, artist: filled.artist,
                price: filled.askPrice,
            };
            work.onMarket = false;
            work.purchasePrice = filled.askPrice;
            work.purchaseWeek = s.week;
            work.purchaseCity = s.currentCity;
            work.storage = 'home';
            work.provenance = work.provenance || [];
            work.provenance.push({
                type: 'acquired', week: s.week, city: s.currentCity,
                price: filled.askPrice, source: `Bloomberg (from ${filled.npcName || 'NPC'})`,
            });
            s.portfolio.push(work);
            s.totalWorksBought = (s.totalWorksBought || 0) + 1;

            // Record transaction
            (s.transactions = s.transactions || []).unshift({
                id: `bb_buy_${Date.now()}`,
                action: 'BUY', title: work.title, artist: work.artist,
                price: filled.askPrice, week: s.week,
            });
            if (s.transactions.length > 50) s.transactions.pop();

            GameState.addNews(`Acquired "${work.title}" via Bloomberg for $${filled.askPrice.toLocaleString()}`);
            return { success: true, order: filled };
        },

        /**
         * Prepare haggle data for launching a HaggleScene from Bloomberg.
         * Returns haggleInfo object ready for HaggleManager.start().
         */
        prepareHaggle: (orderId) => {
            const order = MarketSimulator.pendingSellOrders.find(o => o.id === orderId);
            if (!order) return null;

            const npc = CONTACTS.find(c => c.id === order.npcId) || {
                id: order.npcId, name: order.npcName || 'Dealer', role: 'dealer',
            };

            return {
                mode: 'buy',
                work: order.artwork || { id: order.artworkId, title: order.title, artist: order.artist, price: order.askPrice },
                npc,
                askingPrice: order.askPrice,
                playerOffer: Math.round(order.askPrice * 0.7),
                bloombergOrderId: orderId, // Track which order this haggle is for
            };
        },

        /**
         * Player lists a portfolio piece for sale.
         * @param {string} workId — portfolio work ID
         * @param {'quick'|'market'|'premium'} tier — sale strategy
         * Returns { success, listing, error }
         */
        listForSale: (workId, tier = 'market') => {
            const s = GameState.state;
            if (!s) return { success: false, error: 'No game state' };

            const idx = s.portfolio.findIndex(w => w.id === workId);
            if (idx === -1) return { success: false, error: 'Work not in portfolio' };

            const work = s.portfolio[idx];
            let currentValue = 0;
            try { currentValue = MarketManager.calculatePrice(work, false); }
            catch { currentValue = work.price || work.basePrice || 10000; }

            // Tier multipliers and durations
            const tiers = {
                quick: { mult: 0.85, minWeeks: 0, maxWeeks: 1 },
                market: { mult: 1.0, minWeeks: 2, maxWeeks: 4 },
                premium: { mult: 1.15, minWeeks: 4, maxWeeks: 8 },
            };
            const t = tiers[tier] || tiers.market;
            const askPrice = Math.round(currentValue * t.mult);
            const duration = t.minWeeks + Math.floor(Math.random() * (t.maxWeeks - t.minWeeks + 1));

            // Remove from portfolio
            s.portfolio.splice(idx, 1);

            // Create listing
            const listing = {
                id: `bl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                artworkId: work.id,
                title: work.title,
                artist: work.artist,
                tier,
                askPrice,
                estimatedValue: currentValue,
                weekListed: s.week,
                expiresWeek: s.week + duration,
                work, // Full work object for re-adding on cancel
            };
            if (!s.bloombergListings) s.bloombergListings = [];
            s.bloombergListings.push(listing);

            // Also add to activeDeals for the existing sell resolution system
            s.activeDeals.push({
                type: 'sale',
                work,
                strategy: tier === 'quick' ? 'public' : tier === 'premium' ? 'auction' : 'contact',
                startWeek: s.week,
                resolutionWeek: s.week + duration,
                bloombergListingId: listing.id,
            });

            GameState.addNews(`Listed "${work.title}" via Bloomberg (${tier}) at $${askPrice.toLocaleString()}`);
            return { success: true, listing };
        },

        /**
         * Cancel a player Bloomberg listing.
         * Returns the work to portfolio.
         */
        cancelListing: (listingId) => {
            const s = GameState.state;
            if (!s?.bloombergListings) return false;

            const idx = s.bloombergListings.findIndex(l => l.id === listingId);
            if (idx === -1) return false;

            const listing = s.bloombergListings.splice(idx, 1)[0];

            // Return work to portfolio
            if (listing.work) {
                s.portfolio.push(listing.work);
            }

            // Remove from activeDeals too
            s.activeDeals = (s.activeDeals || []).filter(d => d.bloombergListingId !== listingId);

            GameState.addNews(`Cancelled Bloomberg listing for "${listing.title}"`);
            return true;
        },

        /** Get player's active Bloomberg sell listings */
        getActiveListings: () => {
            return GameState.state?.bloombergListings || [];
        },

        /**
         * Compute notifications by cross-referencing watchlist against open orders.
         * Returns array of { type, message, artworkId?, artistId?, orderId? }
         */
        getNotifications: () => {
            const s = GameState.state;
            if (!s) return [];
            const watchlist = s.watchlist || [];
            if (watchlist.length === 0) return [];

            const notifications = [];
            const sellOrders = MarketSimulator.getOpenSellOrders();

            for (const item of watchlist) {
                if (item.type === 'artist') {
                    // Check if any sell orders match this watched artist
                    const matching = sellOrders.filter(o => o.artwork?.artistId === item.id);
                    for (const order of matching) {
                        notifications.push({
                            type: 'watchlist_match',
                            message: `"${order.title}" by watched artist now on market — ${order.askPrice ? '$' + order.askPrice.toLocaleString() : ''}`,
                            artworkId: order.artworkId,
                            orderId: order.id,
                        });
                    }
                } else if (item.type === 'artwork') {
                    const matching = sellOrders.filter(o => o.artworkId === item.id);
                    for (const order of matching) {
                        const delta = item.addedPrice && order.askPrice
                            ? ((order.askPrice - item.addedPrice) / item.addedPrice * 100).toFixed(1)
                            : null;
                        notifications.push({
                            type: 'watchlist_match',
                            message: `Watched artwork "${order.title}" available — $${order.askPrice.toLocaleString()}${delta ? ` (${delta > 0 ? '+' : ''}${delta}%)` : ''}`,
                            artworkId: order.artworkId,
                            orderId: order.id,
                        });
                    }
                }
            }

            return notifications;
        },
    },

    npcMarket: {
        /**
         * Get full market profile for an NPC — combines static contacts data,
         * persisted npcStore data, and live MarketSimulator state.
         * Priority: live sim > persisted store > static CONTACTS.
         */
        getProfile: (npcId) => {
            const contact = CONTACTS.find(c => c.id === npcId);
            const storeContact = useNPCStore.getState().contacts.find(c => c.id === npcId);
            const simState = MarketSimulator.getNPCState()[npcId];
            const stats = storeContact?.marketStats || {};

            // Resolve collection (live sim > store > static)
            const ownedIds = simState?.owned ?? storeContact?.collection?.owned ?? contact?.collection?.owned ?? [];
            const ownedWorks = ownedIds.map(id => ARTWORKS.find(a => a.id === id)).filter(Boolean);

            // Calculate collection value
            let collectionValue = 0;
            for (const w of ownedWorks) {
                try { collectionValue += MarketManager.calculatePrice(w, false); }
                catch { collectionValue += w.askingPrice || 0; }
            }

            const cash = simState?.cash ?? storeContact?.wealth?.liquidCash ?? contact?.wealth?.liquidCash ?? 0;
            const totalEarned = simState?.totalEarned ?? stats.totalEarned ?? 0;
            const totalSpent = simState?.totalSpent ?? stats.totalSpent ?? 0;

            return {
                // Identity
                id: npcId,
                name: contact?.name ?? storeContact?.name ?? npcId,
                role: contact?.role ?? storeContact?.role ?? 'unknown',
                emoji: contact?.emoji ?? '',
                // Financials
                cash,
                annualBudget: contact?.wealth?.annualBudget ?? 0,
                spendingCeiling: contact?.wealth?.spendingCeiling ?? 0,
                financialStress: simState?.financialStress ?? stats.financialStress ?? contact?.wealth?.financialStress ?? 0,
                netWorth: cash + collectionValue,
                // Collection
                owned: ownedWorks,
                ownedIds,
                forSale: simState?.forSale ?? storeContact?.collection?.forSale ?? contact?.collection?.forSale ?? [],
                collectionSize: ownedIds.length,
                collectionValue,
                maxCapacity: contact?.collection?.maxCapacity ?? 20,
                // Trade stats
                totalBought: simState?.totalBought ?? stats.totalBought ?? 0,
                totalSold: simState?.totalSold ?? stats.totalSold ?? 0,
                totalSpent,
                totalEarned,
                netProfit: totalEarned - totalSpent,
                strategy: simState?.strategy ?? stats.strategy ?? 'holder',
                // Trade log for this NPC
                recentTrades: MarketSimulator.getTradeLog()
                    .filter(t => t.buyer === npcId || t.seller === npcId)
                    .slice(-20),
                // Taste (for UI display)
                preferredGenres: contact?.taste?.preferredGenres ?? [],
                preferredTiers: contact?.taste?.preferredTiers ?? [],
                avoidedGenres: contact?.taste?.avoidedGenres ?? [],
                // Relationship
                favor: storeContact?.favor ?? 0,
                met: storeContact?.met ?? false,
            };
        },

        /**
         * Get all NPCs ranked by collection value (descending).
         * @param {number} limit — max results
         */
        getCollectionRankings: (limit = 10) => {
            const profiles = CONTACTS.map(c => {
                const p = TerminalAPI.npcMarket.getProfile(c.id);
                return p;
            });
            return profiles
                .sort((a, b) => b.collectionValue - a.collectionValue)
                .slice(0, limit);
        },

        /** Get recent art trades across all NPCs */
        getArtFlow: (limit = 50) => MarketSimulator.getTradeLog().slice(-limit),

        /** Get top collections with details */
        getTopCollections: (limit = 5) => {
            return TerminalAPI.npcMarket.getCollectionRankings(limit)
                .filter(p => p.collectionSize > 0);
        },

        /** Get weekly market report from MarketSimulator */
        getWeeklyReport: () => MarketSimulator.getWeeklyReport(),

        /** Get full simulation snapshot */
        getSimSnapshot: () => MarketSimulator.getSnapshot(),
    },
};
