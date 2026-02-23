import { ARTISTS, generateInitialWorks } from '../data/artists.js';
import { ARTWORKS, ARTWORK_MAP } from '../data/artworks.js';
import { MarketManager } from './MarketManager.js';
import { PhoneManager } from './PhoneManager.js';
import { ConsequenceScheduler } from './ConsequenceScheduler.js';
import { DecisionLog } from './DecisionLog.js';
import { CONTACTS } from '../data/contacts.js';
import { BACKGROUND_TRAITS } from '../data/backgrounds.js';
import { GameEventBus, GameEvents } from './GameEventBus.js';
import { shuffle } from '../utils/shuffle.js';
import { clamp } from '../utils/math.js';
import { generateId } from '../utils/id.js';
import { ProfileManager } from './ProfileManager.js';
import { resetSystemicTriggers } from '../engines/SystemicTriggers.js';
import { WebAudioService } from './WebAudioService.js';

/**
 * Central game state manager for ArtLife
 * Tracks everything: cash, portfolio, week, market, decisions
 */
export class GameState {
    static state = null;

    static init(character) {
        let works;
        try {
            works = generateInitialWorks();
            MarketManager.init(works);
            PhoneManager.init();
            ConsequenceScheduler.reset();
            DecisionLog.reset();
            resetSystemicTriggers();
        } catch (err) {
            console.error('[GameState.init] Subsystem init error (non-fatal):', err);
            works = works || [];
        }

        // Calculate initial stats starting from character base
        let initialCash = character.startingCash;
        let initialReputation = character.startingStats?.reputation ?? 50;
        let initialTaste = character.startingStats?.taste ?? 50;
        let initialAudacity = character.startingStats?.audacity ?? 30;
        let initialAccess = character.startingStats?.access ?? 50;
        let initialIntel = character.startingStats?.intel ?? 0;

        // Apply background trait modifiers
        const traitsList = [];
        if (character.selectedTraits) {
            Object.keys(character.selectedTraits).forEach(key => {
                const optId = character.selectedTraits[key];
                const traitData = BACKGROUND_TRAITS[key]?.options.find(o => o.id === optId);
                if (traitData) {
                    traitsList.push(traitData.trait);
                    if (traitData.effects) {
                        if (traitData.effects.cash) initialCash += traitData.effects.cash;
                        if (traitData.effects.access) initialAccess += traitData.effects.access;
                        if (traitData.effects.taste) initialTaste += traitData.effects.taste;
                        if (traitData.effects.audacity) initialAudacity = Math.min(100, initialAudacity + traitData.effects.audacity);
                        if (traitData.effects.reputation) initialReputation += traitData.effects.reputation;
                        if (traitData.effects.intel) initialIntel += traitData.effects.intel;
                    }
                }
            });
        }

        // Apply selected trait (Phase 3 of character creator) stat bonuses
        if (character.selectedTrait?.effects) {
            const fx = character.selectedTrait.effects;
            if (fx.reputation) initialReputation = Math.min(100, initialReputation + fx.reputation);
            if (fx.taste) initialTaste = Math.min(100, initialTaste + fx.taste);
            if (fx.audacity) initialAudacity = Math.min(100, initialAudacity + fx.audacity);
            if (fx.access) initialAccess = Math.min(100, initialAccess + fx.access);
            if (fx.intel) initialIntel = Math.min(100, initialIntel + fx.intel);
            if (fx.cash) initialCash += fx.cash;
        }

        // Apply drip aesthetic bonuses (Phase 4)
        if (character.selectedDrip?.effects) {
            const fx = character.selectedDrip.effects;
            if (fx.reputation) initialReputation = Math.min(100, initialReputation + fx.reputation);
            if (fx.taste) initialTaste = Math.min(100, initialTaste + fx.taste);
            if (fx.audacity) initialAudacity = Math.min(100, initialAudacity + fx.audacity);
            if (fx.access) initialAccess = Math.min(100, initialAccess + fx.access);
            if (fx.intel) initialIntel = Math.min(100, initialIntel + fx.intel);
            if (fx.cash) initialCash += fx.cash;
        }

        // Apply vice bonuses (Phase 5, optional)
        if (character.selectedVice?.effects) {
            const fx = character.selectedVice.effects;
            if (fx.reputation) initialReputation = Math.min(100, initialReputation + fx.reputation);
            if (fx.taste) initialTaste = Math.min(100, initialTaste + fx.taste);
            if (fx.audacity) initialAudacity = Math.min(100, initialAudacity + fx.audacity);
            if (fx.access) initialAccess = Math.min(100, initialAccess + fx.access);
            if (fx.intel) initialIntel = Math.min(100, initialIntel + fx.intel);
            if (fx.cash) initialCash += fx.cash;
        }

        // Build starting portfolio for characters with starting works
        const startingPortfolio = [];
        if (character.startingWorks > 0) {
            const availableWorks = works.filter((w) => w.onMarket);
            const shuffled = shuffle(availableWorks);
            for (let i = 0; i < character.startingWorks && i < shuffled.length; i++) {
                const work = shuffled[i];
                work.onMarket = false;
                work.purchasePrice = work.price;
                work.purchaseWeek = 0;
                work.purchaseCity = 'new-york';
                work.storage = 'home';
                work.insured = false;
                work.provenance = [{ type: 'inherited', week: 0, city: 'new-york', price: work.price, source: 'starting collection' }];
                startingPortfolio.push(work);
            }
        }

        // Expose state reference for React components (read-only reference)
        window._artLifeState = null; // will be set after object construction below

        GameState.state = {
            character: character,
            playerName: character.playerName || 'The Dealer',
            selectedTrait: character.selectedTrait ?? null,
            selectedDrip: character.selectedDrip ?? null,
            selectedVice: character.selectedVice ?? null,
            traits: traitsList,
            cash: initialCash,
            portfolio: startingPortfolio,
            week: 1,
            currentCity: 'new-york', // Starting city
            marketState: 'flat', // bull, bear, flat
            marketStateTurnsRemaining: 20 + Math.floor(Math.random() * 40),
            reputation: initialReputation,  // HYP — industry attention
            taste: initialTaste,            // TST — curatorial eye
            audacity: initialAudacity,      // AUD — shamelessness / haggle edge
            access: initialAccess,          // ACC — network reach
            intel: initialIntel,
            // ── History tracking (used by Ego Dashboard graph & ledger) ──
            wealthHistory: [{ week: 1, cash: initialCash, assets: 0 }],
            transactions: [],
            newsFeed: [],
            decisions: [],
            activeDeals: [],     // tracks works currently pending sale/action
            pendingOffers: [],   // incoming purchase/trade offers from NPCs
            visitedCities: ['new-york'], // cities the player has traveled to
            visitedRooms: [],    // rooms the player has explored in venues
            collectedItems: [],  // item IDs picked up in WorldScene
            overworldPosition: null, // { x, y, facing } for WorldScene persistence
            totalWorksBought: startingPortfolio.length,
            totalWorksSold: 0,
            eventsTriggered: [],
            // Anti-resources — rise from shady or aggressive behaviour
            marketHeat: 0,       // rises from flipping, shady deals. Triggers gallery blacklists
            suspicion: 0,        // rises from buying fakes, sketchy provenance
            burnout: 0,          // rises from overactivity, consecutive events, high stress
            flipHistory: [],     // { workId, buyWeek, sellWeek } for flipper detection
            dealerBlacklisted: false, // locked out of primary market if true
            consecutiveEventWeeks: 0, // tracks back-to-back event weeks for burnout
            forcedRest: false,   // set to true when burnout forces a rest week
            actionsThisWeek: 0,  // resets each week, max 3
            // ── Phase 41: Persistent World Position ──
            playerLocation: {
                locationId: 'player_apartment',  // current world_locations.js ID
                cityX: 5,                        // tile X in CityScene
                cityY: 14,                       // tile Y in CityScene
                insideVenue: false,              // true when inside a LocationScene
            },
            hoursUsedToday: 0,   // resets each week, max ~8 hours of activity
            dayOfWeek: 1,        // 1 = Monday, 7 = Sunday
            hour: 8,             // 0-23 (Starts at 8:00 AM)
            minute: 0,           // 0-59
            // ── Macro Economic State ──
            eraModifier: 1.0,    // Global price multiplier
            activeModifiers: [], // Array of active event economic modifiers
            // ── Tone / dialogue tracking ──
            toneHistory: {},     // { npcId: [tone1, tone2, ...] }
            // ── Bloomberg Watchlist ──
            watchlist: [],       // Array of { type: 'artist'|'artwork', id: string, addedWeek: number, addedPrice?: number }
            // ── Bloomberg Sell Listings ──
            bloombergListings: [], // Player sell listings: { id, artworkId, title, tier, askPrice, weekListed, expiresWeek }
        };

        // Expose reference for React UI components (PlayerDashboard etc.)
        window._artLifeState = GameState.state;
    }

    /**
     * Advance the game by one week.
     * Delegates to WeekEngine for isolated subsystem processing.
     * WeekEngine is registered at import time to avoid circular deps.
     */
    static advanceWeek() {
        if (GameState._weekEngine) {
            GameState._weekEngine.advanceWeek();
        } else {
            console.error('[GameState] WeekEngine not registered. Call GameState.registerWeekEngine() first.');
        }
    }

    /** Called by WeekEngine at import time to register itself */
    static registerWeekEngine(engine) {
        GameState._weekEngine = engine;
    }

    static _weekEngine = null;

    static changeCity(newCity) {
        if (GameState.state.currentCity === newCity) return false;

        GameState.state.currentCity = newCity;
        // Traveling takes a week
        GameState.advanceWeek();
        GameState.addNews(`✈️ Traveled to ${newCity.replace('-', ' ').toUpperCase()}.`);
        // Reset player position to that city's default spawn
        GameState.state.playerLocation = {
            locationId: 'player_apartment',
            cityX: 5,
            cityY: 14,
            insideVenue: false,
        };
        return true;
    }

    /**
     * Move to a world location (Phase 41 — fast travel / walking).
     * Deducts cost, advances hours, and updates persistent position.
     */
    static moveToLocation(location) {
        const state = GameState.state;
        if (location.cost && state.cash < location.cost) return false;
        if (location.cost) state.cash -= location.cost;
        state.hoursUsedToday = (state.hoursUsedToday || 0) + (location.travelTime || 0);
        state.playerLocation = {
            locationId: location.id,
            cityX: location.spawnX,
            cityY: location.spawnY,
            insideVenue: false,
        };
        if (location.travelTime > 0) {
            GameState.addNews(`🚶 Walked to ${location.name}. (${location.travelTime}h)`);
            GameState.advanceTime(location.travelTime * 60);
        }
        return true;
    }

    /**
     * Advance the narrative clock by minutes.
     * Rolls over hours, days, and eventually the macro-week automatically.
     */
    static advanceTime(minutes) {
        const state = GameState.state;
        const oldHour = state.hour;
        state.minute += minutes;

        while (state.minute >= 60) {
            state.minute -= 60;
            state.hour += 1;
        }

        // Fire micro-tick on each hour boundary for intra-week price jitter + trade drip
        if (Math.floor(state.hour) !== Math.floor(oldHour)) {
            try { MarketManager.microTick(); } catch { /* non-critical */ }
            // Attempt an intra-week NPC trade (lazy import avoids circular dep)
            try {
                import('./MarketSimulator.js').then(({ MarketSimulator }) => {
                    const trade = MarketSimulator.simulateMicroTrade(
                        state.hour, state.dayOfWeek, state.marketState
                    );
                    if (trade) {
                        import('./ActivityLogger.js').then(({ ActivityLogger }) => {
                            ActivityLogger.logMarket('micro_trade', trade);
                        }).catch(() => { });
                    }
                }).catch(() => { });
            } catch { /* non-critical */ }
        }

        // If we push past midnight, force a sleep until 8 AM next day
        // Future systems will add exhaustion/burnout penalties for staying up late
        if (state.hour >= 24) {
            state.hour = 8;
            state.minute = 0;
            state.dayOfWeek += 1;

            GameState.addNews(`🌅 Slept until morning.`);

            // Sunday night rollover -> New Macro Week
            if (state.dayOfWeek > 7) {
                state.dayOfWeek = 1;
                GameState.advanceWeek();
            }
        }
    }

    /**
     * Enter a building (sets insideVenue flag).
     */
    static enterVenue(locationId) {
        GameState.state.playerLocation.insideVenue = true;
        GameState.state.playerLocation.locationId = locationId;
    }

    /**
     * Exit a building (clears insideVenue flag, keeps cityX/Y for door spawn).
     */
    static exitVenue() {
        GameState.state.playerLocation.insideVenue = false;
    }

    static buyWork(work) {
        if (GameState.state.cash < work.price) return false;

        GameState.state.cash -= work.price;
        work.onMarket = false;
        work.purchasePrice = work.price;
        work.purchaseWeek = GameState.state.week;
        work.purchaseCity = GameState.state.currentCity;
        work.storage = 'home';      // 'home' | 'freeport' | 'gallery-loan'
        work.insured = false;
        work.provenance = [{
            type: 'acquired',
            week: GameState.state.week,
            city: GameState.state.currentCity,
            price: work.price,
            source: 'market',
        }];
        GameState.state.portfolio.push(work);
        GameState.state.totalWorksBought++;

        // Record transaction for Ego Dashboard ledger
        (GameState.state.transactions = GameState.state.transactions || []).unshift({
            id: generateId('buy'),
            action: 'BUY',
            title: work.title,
            artist: work.artist,
            price: work.price,
            week: GameState.state.week,
        });
        if (GameState.state.transactions.length > 50) GameState.state.transactions.pop();

        GameState.addNews(`Acquired "${work.title}" by ${work.artist} for $${work.price.toLocaleString()}`);

        // ── Update global artwork registry ──
        try {
            const artRef = ARTWORK_MAP[work.id];
            if (artRef) {
                artRef.owner = 'player';
                artRef.lastTradePrice = work.price;
                artRef.lastTradeWeek = GameState.state.week;
                if (!artRef.tradeHistory) artRef.tradeHistory = [];
                artRef.tradeHistory.push({
                    buyer: 'player',
                    seller: 'market',
                    price: work.price,
                    week: GameState.state.week,
                    type: 'market_buy',
                });
            }
        } catch { /* non-critical */ }

        return true;
    }

    static sellWork(workId, strategy = 'public') {
        const state = GameState.state;
        const index = state.portfolio.findIndex((w) => w.id === workId);
        if (index === -1) return false;

        const work = state.portfolio[index];

        // Remove from portfolio immediately
        state.portfolio.splice(index, 1);

        // Determine resolution time based on strategy
        let delay = 1; // Instant fallback
        if (strategy === 'auction') delay = 3 + Math.floor(Math.random() * 2); // 3-4 weeks
        else if (strategy === 'contact') delay = 1 + Math.floor(Math.random() * 2); // 1-2 weeks
        else if (strategy === 'public') delay = 2 + Math.floor(Math.random() * 2); // 2-3 weeks

        state.activeDeals.push({
            type: 'sale',
            work: work,
            strategy: strategy,
            startWeek: state.week,
            resolutionWeek: state.week + delay
        });

        // Track flip speed for flipper detection
        const holdTime = state.week - (work.purchaseWeek || 0);
        state.flipHistory.push({
            workId: work.id,
            buyWeek: work.purchaseWeek || 0,
            sellWeek: state.week,
            holdTime,
        });

        GameState.addNews(`Listed "${work.title}" via ${strategy}. Expected resolve in ${delay} weeks.`);

        // ── Mark artwork as listed in global registry ──
        try {
            const artRef = ARTWORK_MAP[work.id];
            if (artRef) {
                artRef.listedForSale = true;
                artRef.listStrategy = strategy;
                artRef.listWeek = state.week;
            }
        } catch { /* non-critical */ }

        return true;
    }

    static getPortfolioValue() {
        return GameState.state.portfolio.reduce((sum, work) => {
            return sum + MarketManager.getWorkValue(work);
        }, 0);
    }

    // ── Macro Game Loop: Time & Actions ──

    /**
     * Consumes 1 Weekly Action. Max actions per week is 3.
     * Automatically triggers WeekEngine if the budget is hit.
     * @returns {boolean} true if the week actually advanced
     */
    static consumeAction() {
        if (!GameState.state) return false;

        GameState.state.actionsThisWeek += 1;

        if (GameState.state.actionsThisWeek >= 3) {
            // Dynamic import: breaks GameState ↔ WeekEngine circular dependency
            import('./WeekEngine.js').then(({ WeekEngine }) => {
                WeekEngine.advanceWeek();

                // Fire an event so React/Phaser UI can render an alert
                import('./GameEventBus.js').then(({ GameEventBus, GameEvents }) => {
                    GameEventBus.emit(GameEvents.HUD_MESSAGE, "Week advanced! Action budget refreshed.");
                });
            });
            return true;
        }

        return false;
    }

    static isBankrupt() {
        return GameState.state.cash < 0 && GameState.state.portfolio.length === 0;
    }

    static applyEffects(effects) {
        const state = GameState.state;
        const summary = []; // human-readable changes

        // ─── Portfolio effects (event-driven acquisitions/removals) ───
        if (effects.portfolioAdd) {
            const tag = effects.portfolioAdd;
            // Generate a work from a random artist on the market
            const artistPool = (typeof MarketManager !== 'undefined' && MarketManager.artists) ? MarketManager.artists : [];
            if (artistPool.length > 0) {
                const artist = artistPool[Math.floor(Math.random() * artistPool.length)];
                const basePrice = Math.round(
                    (artist.basePriceMin || 5000) + Math.random() * ((artist.basePriceMax || 50000) - (artist.basePriceMin || 5000))
                );
                const titles = ['Untitled', 'Study', 'Composition', 'Fragment', 'Series', 'Nocturne', 'Portrait'];
                const title = `${titles[Math.floor(Math.random() * titles.length)]} #${Math.floor(Math.random() * 999)}`;
                const work = {
                    id: generateId('work_evt'),
                    title,
                    artistId: artist.id,
                    artist: artist.name,
                    medium: artist.medium || 'Mixed Media',
                    basePrice,
                    price: basePrice,
                    yearCreated: 2024,
                    onMarket: false,
                    purchasePrice: Math.abs(effects.cash || 0) || basePrice,
                    purchaseWeek: state.week,
                    purchaseCity: state.currentCity,
                    storage: 'home',
                    insured: false,
                    eventTag: tag,
                    provenance: [{
                        type: 'acquired (event)',
                        week: state.week,
                        city: state.currentCity,
                        price: Math.abs(effects.cash || 0) || basePrice,
                        source: tag,
                    }],
                };
                state.portfolio.push(work);
                state.totalWorksBought = (state.totalWorksBought || 0) + 1;
                summary.push(`Acquired "${work.title}" by ${work.artist}`);
                GameState.addNews(`🖼️ Acquired "${work.title}" by ${work.artist} via ${tag.replace(/_/g, ' ')}.`);
            }
        }
        if (effects.portfolioRemove) {
            const mode = effects.portfolioRemove;
            if (state.portfolio.length > 0) {
                if (mode === 'weakest') {
                    // Remove the lowest-value piece
                    const sorted = [...state.portfolio].sort((a, b) => (a.price || a.basePrice || 0) - (b.price || b.basePrice || 0));
                    const removed = sorted[0];
                    state.portfolio = state.portfolio.filter(w => w.id !== removed.id);
                    summary.push(`Lost "${removed.title}" from collection`);
                    GameState.addNews(`📦 "${removed.title}" removed from your collection.`);
                } else if (mode === 'strongest') {
                    const sorted = [...state.portfolio].sort((a, b) => (b.price || b.basePrice || 0) - (a.price || a.basePrice || 0));
                    const removed = sorted[0];
                    state.portfolio = state.portfolio.filter(w => w.id !== removed.id);
                    summary.push(`Lost "${removed.title}" from collection`);
                    GameState.addNews(`📦 "${removed.title}" removed from your collection.`);
                } else if (mode === 'half') {
                    const count = Math.ceil(state.portfolio.length / 2);
                    const removed = state.portfolio.splice(0, count);
                    summary.push(`Lost ${removed.length} works from collection`);
                    GameState.addNews(`📦 Lost ${removed.length} works from your collection.`);
                }
            }
        }

        // ─── Inventory Storage effects (Items, Contraband, Documents) ───
        if (effects.inventoryAdd) {
            const item = effects.inventoryAdd;
            import('../stores/inventoryStore.js').then(({ useInventoryStore }) => {
                useInventoryStore.getState().addItem({ ...item, week: state.week });
            });
            summary.push(`Acquired item: ${item.name}`);
            GameState.addNews(`🧰 Acquired artifact: ${item.name}`);
        }
        if (effects.inventoryRemove) {
            const itemId = effects.inventoryRemove;
            import('../stores/inventoryStore.js').then(({ useInventoryStore }) => {
                useInventoryStore.getState().removeItem(itemId);
            });
            summary.push(`Lost artifact from inventory`);
            GameState.addNews(`🧰 An artifact was removed from your inventory.`);
        }

        if (effects.cash) {
            state.cash += effects.cash;
            summary.push(effects.cash > 0 ? `+$${effects.cash.toLocaleString()}` : `-$${Math.abs(effects.cash).toLocaleString()}`);
        }
        if (effects.reputation) {
            state.reputation = clamp(state.reputation + effects.reputation, 0, 100);
            summary.push(`Reputation ${effects.reputation > 0 ? '+' : ''}${effects.reputation}`);
        }
        if (effects.intel) {
            state.intel += effects.intel;
            summary.push(`Intel ${effects.intel > 0 ? '+' : ''}${effects.intel}`);
        }
        if (effects.taste) {
            state.taste = clamp(state.taste + effects.taste, 0, 100);
            summary.push(`Taste ${effects.taste > 0 ? '+' : ''}${effects.taste}`);
        }
        if (effects.audacity) {
            state.audacity = clamp((state.audacity || 30) + effects.audacity, 0, 100);
            summary.push(`Audacity ${effects.audacity > 0 ? '+' : ''}${effects.audacity}`);
        }
        if (effects.access) {
            state.access = clamp(state.access + effects.access, 0, 100);
            summary.push(`Access ${effects.access > 0 ? '+' : ''}${effects.access}`);
        }
        if (effects.burnout) {
            state.burnout = clamp(state.burnout + effects.burnout, 0, 10);
            summary.push(`Burnout ${effects.burnout > 0 ? '+' : ''}${effects.burnout}`);
        }
        if (effects.gamble) {
            const result = effects.gamble.min + Math.random() * (effects.gamble.max - effects.gamble.min);
            const rounded = Math.round(result);
            state.cash += rounded;
            const text = rounded >= 0
                ? `🎰 You won $${rounded.toLocaleString()} at the table.`
                : `🎰 You lost $${Math.abs(rounded).toLocaleString()} at the table.`;
            GameState.addNews(text);
        }
        if (effects.heatBoost) {
            MarketManager.boostRandomArtistHeat(effects.heatBoost.amount || 5);
        }
        if (effects.heatBoostAll) {
            MarketManager.boostAllHeat(effects.heatBoostAll);
        }
        // ─── Anti-resource effects ───
        if (effects.marketHeat) {
            state.marketHeat = clamp(state.marketHeat + effects.marketHeat, 0, 100);
            if (effects.marketHeat > 0) {
                GameState.addNews(`🌡️ Market heat rising. The art world is watching you closely.`);
            } else {
                GameState.addNews(`❄️ Market heat cooling. You're regaining trust.`);
            }
        }
        if (effects.suspicion) {
            state.suspicion = clamp(state.suspicion + effects.suspicion, 0, 100);
            if (effects.suspicion > 0) {
                GameState.addNews(`🔍 Suspicion is building around your recent acquisitions.`);
            } else {
                GameState.addNews(`✅ Your provenance checks out. Suspicion reduced.`);
            }
        }
        if (effects.npcFavor) {
            // Accept both {target, amount} and {id, amount} formats
            const npcId = effects.npcFavor.target || effects.npcFavor.id;
            const amount = effects.npcFavor.amount;
            if (npcId && amount !== undefined) {
                PhoneManager.adjustFavor(npcId, amount);
                const npcData = CONTACTS.find(c => c.id === npcId);
                if (npcData) {
                    const direction = amount > 0 ? 'appreciates your actions' : 'is not happy with you';
                    GameState.addNews(`${npcData.emoji} ${npcData.name} ${direction}.`);
                    summary.push(`${npcData.name} ${amount > 0 ? '+' : ''}${amount} favor`);
                }
            }
        }
        // Flipper blacklist check from effects
        if (state.marketHeat >= 50 && !state.dealerBlacklisted) {
            state.dealerBlacklisted = true;
            GameState.addNews('🚫 You\'ve been blacklisted by major galleries. Primary market access revoked.');
            summary.push('⚠ BLACKLISTED from primary market');
        }

        // Store for UI access
        GameState.lastEffectsSummary = summary;

        // Audio feedback for stat changes (skip during silent contexts like WeekEngine bulk processing)
        if (summary.length > 0 && !effects._silent) {
            const hasNegative = (effects.cash < 0) || (effects.reputation < 0) || (effects.suspicion > 0) || (effects.marketHeat > 0) || (effects.burnout > 0);
            const hasPositive = (effects.cash > 0) || (effects.reputation > 0) || (effects.taste > 0) || (effects.access > 0);
            if (hasNegative && !hasPositive) {
                WebAudioService.penalty();
            } else if (hasPositive) {
                WebAudioService.success();
            }
        }

        return summary;
    }

    static addNews(text) {
        GameState.state.newsFeed.push({
            text: text,
            week: GameState.state.week,
        });
        // Keep last 20
        if (GameState.state.newsFeed.length > 20) {
            GameState.state.newsFeed.shift();
        }
    }

    static recordDecision(eventTitle, choiceLabel) {
        GameState.state.decisions.push({
            event: eventTitle,
            choice: choiceLabel,
            week: GameState.state.week,
        });
    }

    // ════════════════════════════════════════
    // Global Settings are now handled by SettingsManager.js
    // ════════════════════════════════════════

    // ══════════════════════════════════════════
    // Save / Load — Profile-Scoped Multi-Slot System
    // ══════════════════════════════════════════
    static MAX_SLOTS = 5;
    static activeSlot = 0;

    /**
     * Profile-scoped slot key.
     */
    static _slotKey(slotIndex) {
        const profileId = ProfileManager.getActiveProfile()?.id || 'guest';
        return `artlife_profile_${profileId}_slot_${slotIndex}`;
    }

    static _lastSlotKey() {
        const profileId = ProfileManager.getActiveProfile()?.id || 'guest';
        return `artlife_profile_${profileId}_last_slot`;
    }

    /**
     * Save to a specific slot (0-4). Stores both full state and lightweight metadata.
     */
    static save(slotIndex = GameState.activeSlot) {
        // ── Snapshot artwork runtime state (only artworks with changes) ──
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
            state: GameState.state,
            artworkState,  // persisted artwork runtime fields
            meta: {
                playerName: GameState.state.playerName || 'The Dealer',
                characterName: GameState.state.character?.name || 'Unknown',
                characterIcon: GameState.state.character?.icon || '🎭',
                week: GameState.state.week,
                cash: GameState.state.cash,
                portfolioCount: GameState.state.portfolio?.length || 0,
                netWorth: GameState.state.cash + GameState.getPortfolioValue(),
                city: GameState.state.currentCity || 'new-york',
                reputation: GameState.state.reputation,
                savedAt: new Date().toISOString(),
                version: '0.3.0',
            }
        };
        localStorage.setItem(GameState._slotKey(slotIndex), JSON.stringify(saveData));
        localStorage.setItem(GameState._lastSlotKey(), String(slotIndex));
        GameState.activeSlot = slotIndex;
    }

    /**
     * Load from a specific slot.
     * Re-initialises MarketManager and ConsequenceScheduler so their in-memory
     * state is consistent with the restored GameState.
     */
    static load(slotIndex = 0) {
        // Migrate old save format if needed
        GameState._migrateOldSave();

        const raw = localStorage.getItem(GameState._slotKey(slotIndex));
        if (!raw) return false;

        try {
            const saveData = JSON.parse(raw);

            // Validate save data has required structure
            if (!saveData?.state || typeof saveData.state.week !== 'number') {
                console.error('Corrupt save data in slot', slotIndex);
                return false;
            }

            GameState.state = saveData.state;
            GameState.activeSlot = slotIndex;

            // Ensure newer state fields exist on old saves
            if (!GameState.state.playerLocation) {
                GameState.state.playerLocation = {
                    locationId: 'player_apartment', cityX: 5, cityY: 14, insideVenue: false,
                };
            }

            // Keep global reference in sync for React components
            window._artLifeState = GameState.state;

            // Re-initialise market with fresh works so price calculations work.
            MarketManager.init(generateInitialWorks());

            // Restore phone manager so NPC inboxes are ready
            PhoneManager.init();

            // ConsequenceScheduler state is lost on load (pending consequences
            // are not serialised). Reset so we start clean rather than corrupt.
            ConsequenceScheduler.reset();
            resetSystemicTriggers();

            // ── Restore artwork runtime state from save ──
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

            return true;
        } catch (e) {
            console.error('Failed to load save slot', slotIndex, e);
            return false;
        }
    }

    /**
     * Get metadata for all save slots (without loading full state).
     * Returns array of { meta, slotIndex } or null for empty slots.
     */
    static getSaveSlots() {
        GameState._migrateOldSave();

        const slots = [];
        for (let i = 0; i < GameState.MAX_SLOTS; i++) {
            const raw = localStorage.getItem(GameState._slotKey(i));
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

    /**
     * Get the most recently used save slot index.
     */
    static getMostRecentSlot() {
        try {
            const val = localStorage.getItem(GameState._lastSlotKey());
            if (val === null || val === '') return null;
            const parsed = parseInt(val, 10);
            if (isNaN(parsed) || parsed < 0 || parsed >= GameState.MAX_SLOTS) return null;
            return parsed;
        } catch (e) {
            // localStorage may be blocked (private browsing, security policy)
            return null;
        }
    }

    /**
     * Delete a specific save slot.
     */
    static deleteSave(slotIndex) {
        localStorage.removeItem(GameState._slotKey(slotIndex));
    }

    /**
     * Returns true if any save slot has data.
     */
    static hasSave() {
        for (let i = 0; i < GameState.MAX_SLOTS; i++) {
            if (localStorage.getItem(GameState._slotKey(i))) return true;
        }
        return false;
    }

    /**
     * Auto-save to the current active slot.
     */
    static autoSave() {
        if (GameState.state) {
            GameState.save(GameState.activeSlot);
        }
    }

    /**
     * Migrate old single-slot save to new multi-slot format.
     */
    /**
     * Seed a demo save into slot 0 if no saves exist.
     * Called from TitleScene so there's always a profile to load for testing.
     */
    static seedDemoSave() {
        if (GameState.hasSave()) return; // don't overwrite real saves

        // 12-week demo with realistic trading history:
        // 5 total buys, 3 sells (2 profit, 1 loss), 2 current holds
        const demoState = {
            character: {
                id: 'hedge_fund',
                name: 'THE HEDGE FUND',
                icon: '📊',
                tagline: 'Art is just another asset class.',
                startingCash: 750000,
                startingWorks: 0,
                perk: 'Market Analytics',
                difficulty: 'MEDIUM',
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
            week: 12,
            currentCity: 'new-york',
            marketState: 'bull',
            marketStateTurnsRemaining: 12,
            reputation: 62,
            taste: 64,
            audacity: 40,
            access: 60,
            intel: 65,
            // 12-week arc: buy-dip W1-3, recovery W4-8, plateau W9-12
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
                // 5 BUYs + 3 SELLs in reverse-chrono order (newest first)
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
            decisions: [],
            activeDeals: [],
            pendingOffers: [],
            visitedCities: ['new-york', 'london'],
            visitedRooms: [],
            collectedItems: [],
            overworldPosition: null,
            totalWorksBought: 5,
            totalWorksSold: 3,
            eventsTriggered: [],
            marketHeat: 8,
            suspicion: 0,
            burnout: 2,
            flipHistory: [
                { workId: 'demo_sold_1', buyWeek: 1, sellWeek: 5, holdTime: 4 },
                { workId: 'demo_sold_2', buyWeek: 2, sellWeek: 4, holdTime: 2 },
                { workId: 'demo_sold_3', buyWeek: 3, sellWeek: 7, holdTime: 4 },
            ],
            dealerBlacklisted: false,
            consecutiveEventWeeks: 0,
            forcedRest: false,
            actionsThisWeek: 0,
            eraModifier: 1.0,
            activeModifiers: [],
            playerLocation: {
                locationId: 'player_apartment',
                cityX: 5, cityY: 14,
                insideVenue: false,
            },
            hoursUsedToday: 0,
            // Watchlist with 2 artists + 1 artwork for notification data
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
                playerName: 'Seb',
                characterName: 'THE HEDGE FUND',
                characterIcon: '📊',
                week: 12,
                cash: 795000,
                portfolioCount: 2,
                netWorth: 852000,
                city: 'new-york',
                reputation: 62,
                savedAt: new Date().toISOString(),
                version: 'demo-seed',
            }
        };

        ProfileManager.ensureGuestProfile();
        localStorage.setItem(GameState._slotKey(0), JSON.stringify(saveData));
        localStorage.setItem(GameState._lastSlotKey(), '0');
    }

    /**
     * Instantly initialize GameState with demo data (no save/load).
     * Used by Admin Dashboard to quickly bootstrap a testable game state.
     */
    /**
     * Quick demo state for Admin Dashboard testing and CMS "Test Room" launches.
     * IMPORTANT: Every field here must mirror init() — see CLAUDE.md state shape rules.
     * If you add a field to init(), add it here too (and vice versa).
     */
    static quickDemoInit() {
        try {
            const works = generateInitialWorks();
            MarketManager.init(works);
            PhoneManager.init();
            ConsequenceScheduler.reset();
            DecisionLog.reset();
            resetSystemicTriggers();
        } catch (err) {
            console.error('[GameState] quickDemoInit subsystem init error (non-fatal):', err);
            // Continue — state can still be set even if some subsystems fail
        }

        // 12-week demo with realistic trading history (mirrors seedDemoSave)
        GameState.state = {
            // ── Identity (chosen at character creation) ──
            character: {
                id: 'hedge_fund', name: 'THE HEDGE FUND', icon: '📊',
                tagline: 'Art is just another asset class.',
                startingCash: 750000, startingWorks: 0,
                perk: 'Market Analytics', difficulty: 'MEDIUM',
            },
            playerName: 'Dev Agent',
            selectedTrait: { id: 'quant_eye', label: 'Quant Eye', effects: { taste: 8 } },
            selectedDrip: { id: 'power_suit', label: 'Power Suit', icon: '👔', effects: { reputation: 5, access: 5 } },
            selectedVice: null,
            traits: ['Quant Eye'],
            // ── Financials ──
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
            // ── Time & Market ──
            week: 12, currentCity: 'new-york',
            marketState: 'bull', marketStateTurnsRemaining: 12, // weeks until market state transition
            // ── Core Stats (0-100 scale) ──
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
                { text: 'Bull market continues.', week: 10 },
                { text: 'Yuki Tanaka shortlisted for Turner Prize.', week: 11 },
                { text: 'Acquired "Red Squares on White" by Tomas Herrera for $12,000', week: 12 },
            ],
            decisions: [], activeDeals: [], // active sell/trade deals in pipeline
            totalWorksBought: 5, totalWorksSold: 3, eventsTriggered: [], // triggered event IDs (for cooldown)
            // ── Anti-Resources (bad stats that rise from risky behavior) ──
            marketHeat: 8, suspicion: 0, burnout: 2,
            flipHistory: [
                { workId: 'demo_sold_1', buyWeek: 1, sellWeek: 5, holdTime: 4 },
                { workId: 'demo_sold_2', buyWeek: 2, sellWeek: 4, holdTime: 2 },
                { workId: 'demo_sold_3', buyWeek: 3, sellWeek: 7, holdTime: 4 },
            ],
            dealerBlacklisted: false, // permanent flag from too many lowball offers
            // ── Action Economy ──
            consecutiveEventWeeks: 0, forcedRest: false, actionsThisWeek: 0, // MAX_ACTIONS = 4
            // ── World Position & Time of Day ──
            playerLocation: { locationId: 'player_apartment', cityX: 5, cityY: 14, insideVenue: false },
            hoursUsedToday: 0, dayOfWeek: 1, hour: 8, minute: 0,
            // ── Tone System (dialogue style tracking) ──
            toneHistory: {},
            // ── Pending NPC trade offers (expire after 3 weeks) ──
            pendingOffers: [],
            // ── Exploration tracking ──
            visitedCities: ['new-york', 'london'],
            visitedRooms: [], // room IDs visited (for onEnter.firstVisitOnly checks)
            collectedItems: [], // item IDs picked up in WorldScene/LocationScene
            overworldPosition: null, // { x, y } for WorldScene re-entry
            // ── Market modifiers ──
            eraModifier: 1.0, // multiplier for era-specific price adjustments
            activeModifiers: [], // temporary gameplay modifiers from events/perks
            watchlist: [
                { type: 'artist', id: 'yuki_tanaka', addedWeek: 3 },
                { type: 'artist', id: 'kwame_asante', addedWeek: 5 },
                { type: 'artwork', id: 'basquiat_untitled_1982', addedWeek: 6, addedPrice: 420000 },
            ],
            bloombergListings: [],
        };

        window._artLifeState = GameState.state;

        // Seed the MarketSimulator trade log with historical NPC + player trades
        try {
            import('./MarketSimulator.js').then(({ MarketSimulator }) => {
                MarketSimulator.seedTradeLog();
            });
        } catch { /* non-critical */ }

        GameEventBus.emit(GameEvents.UI_NOTIFICATION, 'Demo state initialized — all features unlocked.');
        return true;
    }

    static _migrateOldSave() {
        // Migrate from old single-save format
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

        // Migrate from old multi-slot format (artlife_slot_N) to profile-scoped
        for (let i = 0; i < GameState.MAX_SLOTS; i++) {
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
        // Migrate old last_slot key
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

    /** Alias for init() — some callers use newGame() */
    static newGame(character) {
        return GameState.init(character);
    }
}
