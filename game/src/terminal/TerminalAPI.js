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
