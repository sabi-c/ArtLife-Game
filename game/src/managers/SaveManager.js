import { ProfileManager } from './ProfileManager.js';
import { MarketManager } from './MarketManager.js';
import { PhoneManager } from './PhoneManager.js';
import { ConsequenceScheduler } from './ConsequenceScheduler.js';
import { resetSystemicTriggers } from '../core/SystemicTriggers.js';
import { ARTWORKS, ARTWORK_MAP } from '../data/artworks.js';
import { generateInitialWorks } from '../data/artists.js';
import { GameEventBus, GameEvents } from './GameEventBus.js';

/**
 * SaveManager — Handles all save/load/slot management for ArtLife.
 *
 * Extracted from GameState.js for single-responsibility.
 * Reads/writes GameState.state but doesn't own it.
 */
export class SaveManager {
    static MAX_SLOTS = 5;
    static activeSlot = 0;

    // ─── Slot Key Helpers ───

    /** Profile-scoped slot key. */
    static _slotKey(slotIndex) {
        const profileId = ProfileManager.getActiveProfile()?.id || 'guest';
        return `artlife_profile_${profileId}_slot_${slotIndex}`;
    }

    static _lastSlotKey() {
        const profileId = ProfileManager.getActiveProfile()?.id || 'guest';
        return `artlife_profile_${profileId}_last_slot`;
    }

    // ─── Save ───

    /**
     * Save to a specific slot (0-4). Stores both full state and lightweight metadata.
     * @param {object} gameState - Reference to GameState.state
     * @param {function} getPortfolioValue - Function that returns current portfolio value
     * @param {number} [slotIndex] - Slot to save into (default: activeSlot)
     */
    static save(gameState, getPortfolioValue, slotIndex = SaveManager.activeSlot) {
        // Snapshot artwork runtime state (only artworks with changes)
        const artworkState = {};
        try {
            for (const w of ARTWORKS) {
                if (w.tradeHistory?.length > 0 || w.owner !== 'gallery') {
                    artworkState[w.id] = {
                        owner: w.owner,
                        tradeHistory: w.tradeHistory,
                        lastTradePrice: w.lastTradePrice,
                        lastTradeWeek: w.lastTradeWeek,
                        listedForSale: w.listedForSale || false,
                        listStrategy: w.listStrategy,
                        listWeek: w.listWeek,
                    };
                }
            }
        } catch { /* artworks module may not be loaded */ }

        const saveData = {
            state: gameState,
            artworkState,
            meta: {
                playerName: gameState.playerName || 'The Dealer',
                characterName: gameState.character?.name || 'Unknown',
                characterIcon: gameState.character?.icon || '🎭',
                week: gameState.week,
                cash: gameState.cash,
                portfolioCount: gameState.portfolio?.length || 0,
                netWorth: gameState.cash + getPortfolioValue(),
                city: gameState.currentCity || 'new-york',
                reputation: gameState.reputation,
                savedAt: new Date().toISOString(),
                version: '0.3.0',
            }
        };
        localStorage.setItem(SaveManager._slotKey(slotIndex), JSON.stringify(saveData));
        localStorage.setItem(SaveManager._lastSlotKey(), String(slotIndex));
        SaveManager.activeSlot = slotIndex;
    }

    // ─── Load ───

    /**
     * Load from a specific slot.
     * Re-initialises MarketManager and ConsequenceScheduler so their in-memory
     * state is consistent with the restored GameState.
     * @returns {{ state: object }|false} The loaded state, or false on failure
     */
    static load(slotIndex = 0) {
        // Migrate old save format if needed
        SaveManager._migrateOldSave();

        const raw = localStorage.getItem(SaveManager._slotKey(slotIndex));
        if (!raw) return false;

        try {
            const saveData = JSON.parse(raw);

            // Validate save data has required structure
            if (!saveData?.state || typeof saveData.state.week !== 'number') {
                console.error('Corrupt save data in slot', slotIndex);
                return false;
            }

            const state = saveData.state;
            SaveManager.activeSlot = slotIndex;

            // Ensure newer state fields exist on old saves
            if (!state.playerLocation) {
                state.playerLocation = {
                    locationId: 'player_apartment', cityX: 5, cityY: 14, insideVenue: false,
                };
            }

            // Re-initialise market with fresh works so price calculations work
            MarketManager.init(generateInitialWorks());
            PhoneManager.init();
            ConsequenceScheduler.reset();
            resetSystemicTriggers();

            // Restore artwork runtime state from save
            try {
                if (saveData.artworkState) {
                    for (const [artId, data] of Object.entries(saveData.artworkState)) {
                        const artRef = ARTWORK_MAP[artId];
                        if (artRef) {
                            artRef.owner = data.owner || 'gallery';
                            artRef.tradeHistory = data.tradeHistory || [];
                            artRef.lastTradePrice = data.lastTradePrice;
                            artRef.lastTradeWeek = data.lastTradeWeek;
                            artRef.listedForSale = data.listedForSale || false;
                            artRef.listStrategy = data.listStrategy;
                            artRef.listWeek = data.listWeek;
                        }
                    }
                }
            } catch { /* non-critical */ }

            return { state };
        } catch (e) {
            console.error('Failed to load save slot', slotIndex, e);
            return false;
        }
    }

    // ─── Slot Queries ───

    /**
     * Get metadata for all save slots (without loading full state).
     * @returns {Array<{meta: object, slotIndex: number}|null>}
     */
    static getSaveSlots() {
        SaveManager._migrateOldSave();

        const slots = [];
        for (let i = 0; i < SaveManager.MAX_SLOTS; i++) {
            const raw = localStorage.getItem(SaveManager._slotKey(i));
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    slots.push({ meta: data.meta, slotIndex: i });
                } catch (e) {
                    slots.push(null);
                }
            } else {
                slots.push(null);
            }
        }
        return slots;
    }

    /** Get the most recently used save slot index. */
    static getMostRecentSlot() {
        try {
            const val = localStorage.getItem(SaveManager._lastSlotKey());
            if (val === null || val === '') return null;
            const parsed = parseInt(val, 10);
            if (isNaN(parsed) || parsed < 0 || parsed >= SaveManager.MAX_SLOTS) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    /** Delete a specific save slot. */
    static deleteSave(slotIndex) {
        localStorage.removeItem(SaveManager._slotKey(slotIndex));
    }

    /** Returns true if any save slot has data. */
    static hasSave() {
        for (let i = 0; i < SaveManager.MAX_SLOTS; i++) {
            if (localStorage.getItem(SaveManager._slotKey(i))) return true;
        }
        return false;
    }

    /** Auto-save to the current active slot. */
    static autoSave(gameState, getPortfolioValue) {
        if (gameState) {
            SaveManager.save(gameState, getPortfolioValue, SaveManager.activeSlot);
        }
    }

    // ─── Demo / Seed ───

    /**
     * Seed a demo save into slot 0 if no saves exist.
     * Called from TitleScene so there's always a profile to load for testing.
     */
    static seedDemoSave() {
        if (SaveManager.hasSave()) return;

        const demoState = {
            character: {
                id: 'hedge_fund', name: 'THE HEDGE FUND', icon: '📊',
                tagline: 'Art is just another asset class.',
                startingCash: 750000, startingWorks: 0,
                perk: 'Market Analytics', difficulty: 'MEDIUM',
            },
            playerName: 'Seb',
            selectedTrait: { id: 'quant_eye', label: 'Quant Eye', effects: { taste: 8 } },
            selectedDrip: { id: 'power_suit', label: 'Power Suit', effects: { reputation: 5, access: 5 } },
            selectedVice: null,
            traits: ['Quant Eye'],
            cash: 795000,
            portfolio: [
                {
                    id: 'demo_work_4', title: 'Void Study #7', artist: 'Yuki Tanaka',
                    artistId: 'yuki_tanaka',
                    price: 42000, purchasePrice: 38000, purchaseWeek: 8,
                    purchaseCity: 'new-york', owner: 'player', storage: 'home',
                    onMarket: false, era: 'contemporary', medium: 'Oil on canvas',
                    provenance: [{ type: 'acquired', week: 8, city: 'new-york', price: 38000, source: 'Market' }],
                },
                {
                    id: 'demo_work_5', title: 'Red Squares on White', artist: 'Tomas Herrera',
                    artistId: 'tomas_herrera',
                    price: 15000, purchasePrice: 12000, purchaseWeek: 12,
                    purchaseCity: 'new-york', owner: 'player', storage: 'home',
                    onMarket: false, era: 'emerging', medium: 'Acrylic on panel',
                    provenance: [{ type: 'acquired', week: 12, city: 'new-york', price: 12000, source: 'Market' }],
                },
            ],
            week: 12, currentCity: 'new-york',
            marketState: 'bull', marketStateTurnsRemaining: 12,
            reputation: 62, taste: 64, audacity: 40, access: 60, intel: 65,
            wealthHistory: [
                { week: 1, cash: 750000, assets: 0 },
                { week: 2, cash: 706000, assets: 44000 },
                { week: 3, cash: 668000, assets: 90000 },
                { week: 4, cash: 697000, assets: 51000 },
                { week: 5, cash: 765000, assets: 51000 },
                { week: 6, cash: 770000, assets: 48000 },
                { week: 7, cash: 781200, assets: 42000 },
                { week: 8, cash: 743200, assets: 82000 },
                { week: 9, cash: 748000, assets: 85000 },
                { week: 10, cash: 760000, assets: 88000 },
                { week: 11, cash: 790000, assets: 55000 },
                { week: 12, cash: 795000, assets: 57000 },
            ],
            transactions: [
                { id: 'tx_8', action: 'BUY', title: 'Red Squares on White', artist: 'Tomas Herrera', price: 12000, week: 12 },
                { id: 'tx_7', action: 'BUY', title: 'Void Study #7', artist: 'Yuki Tanaka', price: 38000, week: 8 },
                { id: 'tx_6', action: 'SELL', title: 'Fragment Study IV', artist: 'Kwame Asante', price: 11200, week: 7, profit: 1700, holdWeeks: 4 },
                { id: 'tx_5', action: 'SELL', title: 'Concrete Prayer', artist: 'Elena Voss', price: 68000, week: 5, profit: 24000, holdWeeks: 4 },
                { id: 'tx_4', action: 'SELL', title: 'Untitled After Rain', artist: 'Javier Molina', price: 29000, week: 4, profit: -9000, holdWeeks: 2 },
                { id: 'tx_3', action: 'BUY', title: 'Fragment Study IV', artist: 'Kwame Asante', price: 9500, week: 3 },
                { id: 'tx_2', action: 'BUY', title: 'Untitled After Rain', artist: 'Javier Molina', price: 38000, week: 2 },
                { id: 'tx_1', action: 'BUY', title: 'Concrete Prayer', artist: 'Elena Voss', price: 44000, week: 1 },
            ],
            newsFeed: [
                { text: 'Bull market continues — collectors scrambling for contemporary.', week: 10 },
                { text: 'Yuki Tanaka shortlisted for Turner Prize.', week: 11 },
                { text: 'Acquired "Red Squares on White" by Tomas Herrera for $12,000', week: 12 },
                { text: '[Market] Elena Voss featured in Frieze spotlight — prices surging.', week: 9 },
            ],
            decisions: [], activeDeals: [], pendingOffers: [],
            visitedCities: ['new-york', 'london'],
            visitedRooms: [], collectedItems: [], overworldPosition: null,
            totalWorksBought: 5, totalWorksSold: 3, eventsTriggered: [],
            marketHeat: 8, suspicion: 0, burnout: 2,
            flipHistory: [
                { workId: 'demo_sold_1', buyWeek: 1, sellWeek: 5, holdTime: 4 },
                { workId: 'demo_sold_2', buyWeek: 2, sellWeek: 4, holdTime: 2 },
                { workId: 'demo_sold_3', buyWeek: 3, sellWeek: 7, holdTime: 4 },
            ],
            dealerBlacklisted: false, consecutiveEventWeeks: 0, forcedRest: false,
            actionsThisWeek: 0, eraModifier: 1.0, activeModifiers: [],
            playerLocation: { locationId: 'player_apartment', cityX: 5, cityY: 14, insideVenue: false },
            hoursUsedToday: 0,
            watchlist: [
                { type: 'artist', id: 'yuki_tanaka', addedWeek: 3 },
                { type: 'artist', id: 'kwame_asante', addedWeek: 5 },
                { type: 'artwork', id: 'basquiat_untitled_1982', addedWeek: 6, addedPrice: 420000 },
            ],
            bloombergListings: [],
        };

        const saveData = {
            state: demoState,
            meta: {
                playerName: 'Seb', characterName: 'THE HEDGE FUND', characterIcon: '📊',
                week: 12, cash: 795000, portfolioCount: 2, netWorth: 852000,
                city: 'new-york', reputation: 62,
                savedAt: new Date().toISOString(), version: 'demo-seed',
            }
        };

        ProfileManager.ensureGuestProfile();
        localStorage.setItem(SaveManager._slotKey(0), JSON.stringify(saveData));
        localStorage.setItem(SaveManager._lastSlotKey(), '0');
    }

    // ─── Migration ───

    /** Migrate old save formats to current profile-scoped multi-slot format. */
    static _migrateOldSave() {
        // Old single-save → profile slot 0
        const old = localStorage.getItem('artlife_save');
        if (old) {
            const guestId = ProfileManager.ensureGuestProfile() || ProfileManager.getActiveProfile()?.id || 'guest';
            const newKey = `artlife_profile_${guestId}_slot_0`;
            if (!localStorage.getItem(newKey)) {
                try {
                    const state = JSON.parse(old);
                    const saveData = {
                        state,
                        meta: {
                            playerName: state.playerName || 'The Dealer',
                            characterName: state.character?.name || 'Unknown',
                            characterIcon: state.character?.icon || '🎭',
                            week: state.week || 1,
                            cash: state.cash || 0,
                            portfolioCount: state.portfolio?.length || 0,
                            netWorth: state.cash || 0,
                            city: state.currentCity || 'new-york',
                            reputation: state.reputation || 50,
                            savedAt: new Date().toISOString(),
                            version: 'migrated',
                        }
                    };
                    localStorage.setItem(newKey, JSON.stringify(saveData));
                    localStorage.setItem(`artlife_profile_${guestId}_last_slot`, '0');
                    localStorage.removeItem('artlife_save');
                } catch (e) {
                    console.error('Failed to migrate old save:', e);
                }
            }
        }

        // Old multi-slot (artlife_slot_N) → profile-scoped
        for (let i = 0; i < SaveManager.MAX_SLOTS; i++) {
            const oldKey = `artlife_slot_${i}`;
            const oldData = localStorage.getItem(oldKey);
            if (oldData) {
                const guestId = ProfileManager.ensureGuestProfile() || ProfileManager.getActiveProfile()?.id || 'guest';
                const newKey = `artlife_profile_${guestId}_slot_${i}`;
                if (!localStorage.getItem(newKey)) {
                    localStorage.setItem(newKey, oldData);
                }
                localStorage.removeItem(oldKey);
            }
        }

        // Old last_slot key
        const oldLast = localStorage.getItem('artlife_last_slot');
        if (oldLast !== null) {
            const guestId = ProfileManager.getActiveProfile()?.id || 'guest';
            const newLastKey = `artlife_profile_${guestId}_last_slot`;
            if (!localStorage.getItem(newLastKey)) {
                localStorage.setItem(newLastKey, oldLast);
            }
            localStorage.removeItem('artlife_last_slot');
        }
    }
}
