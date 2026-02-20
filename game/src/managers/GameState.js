import { ARTISTS, generateInitialWorks } from '../data/artists.js';
import { MarketManager } from './MarketManager.js';
import { PhoneManager } from './PhoneManager.js';
import { ConsequenceScheduler } from './ConsequenceScheduler.js';
import { DecisionLog } from './DecisionLog.js';
import { CONTACTS } from '../data/contacts.js';
import { BACKGROUND_TRAITS } from '../data/backgrounds.js';
import { GameEventBus, GameEvents } from './GameEventBus.js';

/**
 * Central game state manager for ArtLife
 * Tracks everything: cash, portfolio, week, market, decisions
 */
export class GameState {
    static state = null;

    static init(character) {
        const works = generateInitialWorks();
        MarketManager.init(works);
        PhoneManager.init();
        ConsequenceScheduler.reset();
        DecisionLog.reset();

        // Calculate initial stats starting from character base
        let initialCash = character.startingCash;
        let initialAccess = 50;
        let initialTaste = 50;
        let initialReputation = 50;
        let initialIntel = 0;

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
                        if (traitData.effects.reputation) initialReputation += traitData.effects.reputation;
                        if (traitData.effects.intel) initialIntel += traitData.effects.intel;
                    }
                }
            });
        }

        // Build starting portfolio for characters with starting works
        const startingPortfolio = [];
        if (character.startingWorks > 0) {
            const availableWorks = works.filter((w) => w.onMarket);
            const shuffled = availableWorks.sort(() => Math.random() - 0.5);
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

        GameState.state = {
            character: character,
            playerName: character.playerName || 'The Dealer',
            traits: traitsList,
            cash: initialCash,
            portfolio: startingPortfolio,
            week: 1,
            currentCity: 'new-york', // Starting city
            marketState: 'flat', // bull, bear, flat
            marketStateTurnsRemaining: 20 + Math.floor(Math.random() * 40),
            reputation: initialReputation,
            taste: initialTaste,           // curatorial eye
            access: initialAccess,          // network reach
            intel: initialIntel,
            newsFeed: [],
            decisions: [],
            activeDeals: [],     // tracks works currently pending sale/action
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
            actionsUsed: 0,      // resets each week, max 3
            // ── Phase 41: Persistent World Position ──
            playerLocation: {
                locationId: 'player_apartment',  // current world_locations.js ID
                cityX: 5,                        // tile X in CityScene
                cityY: 14,                       // tile Y in CityScene
                insideVenue: false,              // true when inside a LocationScene
            },
            hoursUsedToday: 0,   // resets each week, max ~8 hours of activity
        };
    }

    static advanceWeek() {
        const state = GameState.state;
        state.week++;
        state.actionsUsed = 0;  // Reset action budget
        // ── Forced rest check (burnout) ──
        if (state.forcedRest) {
            state.forcedRest = false;
            state.burnout = Math.max(0, state.burnout - 3);
            GameState.addNews('😴 You took a forced rest week. Burnout easing.');
            return; // Skip normal processing
        }

        // ── Pipeline / Active Deals Resolution ──
        // Filter out deals that resolve this week
        const resolvedDeals = [];
        state.activeDeals = state.activeDeals.filter(deal => {
            if (state.week >= deal.resolutionWeek) {
                resolvedDeals.push(deal);
                return false; // remove from active
            }
            return true; // keep in active
        });

        // Process resolved deals
        resolvedDeals.forEach(deal => {
            if (deal.type === 'sale') {
                const finalValue = MarketManager.getWorkValue(deal.work);
                // Apply a modifier based on strategy and randomness
                let modifier = 1.0;
                if (deal.strategy === 'auction') {
                    // Auctions are highly variable (0.8x to 1.5x) but take longer
                    modifier = 0.8 + (Math.random() * 0.7);
                } else if (deal.strategy === 'contact') {
                    // Contact sales are stable but rely on network (access)
                    const accessBonus = (state.access - 50) * 0.002; // -10% to +10% based on access
                    modifier = 0.9 + accessBonus + (Math.random() * 0.1);
                } else {
                    // Public listing
                    modifier = 0.95 + (Math.random() * 0.1);
                }

                const finalPrice = Math.floor(finalValue * modifier);
                state.cash += finalPrice;
                state.totalWorksSold++;

                // Track flip stat
                const holdTime = state.week - deal.work.purchaseWeek;
                if (holdTime < 4) state.marketHeat += 8;
                else if (holdTime < 8) state.marketHeat += 3;

                GameState.addNews(`🤝 SALE COMPLETE: "${deal.work.title}" sold via ${deal.strategy} for $${finalPrice.toLocaleString()}`);
            }
        });

        // Generate phone messages for this turn
        PhoneManager.generateTurnMessages();

        // ── NPC autonomous tick ──
        PhoneManager.npcAutonomousTick();

        // ── Fire scheduled consequences ──
        ConsequenceScheduler.tick(state.week);

        // ── Resolve pending offers ──
        if (state.pendingOffers && state.pendingOffers.length > 0) {
            state.pendingOffers = state.pendingOffers.filter(offer => {
                if (state.week >= offer.resolveWeek) {
                    if (offer.accepted && offer.work) {
                        // Auto-purchase at the offered price
                        const w = offer.work;
                        if (state.cash >= w.price) {
                            GameState.buyWork(w);
                            GameState.addNews(`🤝 OFFER ACCEPTED: "${w.title}" purchased for $${w.price.toLocaleString()}!`);
                            PhoneManager.addMessage({
                                from: 'Gallery',
                                subject: `Offer Accepted — ${w.title}`,
                                body: `Good news! Your ${offer.offerPrice ? 'offer of $' + offer.offerPrice.toLocaleString() : 'offer'} on "${w.title}" has been accepted. The work has been added to your collection.`,
                            });
                        } else {
                            GameState.addNews(`⚠️ Offer on "${w.title}" accepted but you can't afford it anymore!`);
                            PhoneManager.addMessage({
                                from: 'Gallery',
                                subject: `Offer Accepted — ${w.title}`,
                                body: `Your offer was accepted, but unfortunately your available funds are insufficient. The offer has lapsed.`,
                            });
                        }
                    } else {
                        // Rejected
                        GameState.addNews(`❌ Offer on "${offer.work?.title || 'unknown'}" was rejected.`);
                        PhoneManager.addMessage({
                            from: 'Gallery',
                            subject: `Offer Update — ${offer.work?.title || 'Artwork'}`,
                            body: `We appreciate your interest, but after careful consideration, we've decided to decline your offer at this time. The consignor was firm on the asking price.`,
                        });
                        state.marketHeat = Math.min(100, (state.marketHeat || 0) + 2);
                    }
                    return false; // remove from pending
                }
                return true; // keep pending
            });
        }

        // ── Freeport storage costs (deducted monthly = every 4 weeks) ──
        if (state.week % 4 === 0) {
            const freeportPieces = state.portfolio.filter(w => w.storage === 'freeport');
            const storageCost = freeportPieces.length * 200;
            if (storageCost > 0) {
                state.cash -= storageCost;
                GameState.addNews(`🔒 Freeport storage fees: -$${storageCost.toLocaleString()} (${freeportPieces.length} pieces)`);
            }
        }

        // ── Insurance / Theft risk (home-stored uninsured works) ──
        // Collect stolen works first, then remove — avoids index-shift bugs from splice-inside-forEach
        const stolen = [];
        state.portfolio = state.portfolio.filter(work => {
            if (work.storage === 'home' && !work.insured && Math.random() < 0.01) {
                stolen.push(work);
                return false;
            }
            return true;
        });
        stolen.forEach(work => {
            const val = MarketManager.getWorkValue(work);
            GameState.addNews(`🚨 THEFT: "${work.title}" by ${work.artist} ($${val.toLocaleString()}) was stolen from your home! Uninsured.`);
        });

        // ── Burnout tracking ──
        // Burnout rises from high marketHeat or consecutive event weeks
        if (state.marketHeat > 30) {
            state.burnout = Math.min(10, state.burnout + 0.5);
        }
        // Natural burnout recovery (slow)
        if (state.burnout > 0 && state.marketHeat < 15) {
            state.burnout = Math.max(0, state.burnout - 0.3);
        }
        // Forced rest at burnout >= 8
        if (state.burnout >= 8) {
            state.forcedRest = true;
            GameState.addNews('🔥 Burnout critical. You need to rest next week.');
        }

        // Check market state transition
        state.marketStateTurnsRemaining--;
        if (state.marketStateTurnsRemaining <= 0) {
            const states = ['bull', 'bear', 'flat'];
            const current = state.marketState;
            const next = states.filter((s) => s !== current)[Math.floor(Math.random() * 2)];
            state.marketState = next;
            state.marketStateTurnsRemaining = 20 + Math.floor(Math.random() * 40);

            const newsText = next === 'bull'
                ? '📈 The market is turning bullish. Prices are climbing.'
                : next === 'bear'
                    ? '📉 Bear market signals. Collectors are cautious.'
                    : '➡️ Market stabilising. Flat conditions ahead.';
            GameState.addNews(newsText);
        }

        // ── Game-Over check ──
        if (GameState.isBankrupt()) {
            GameEventBus.emit(GameEvents.GAME_OVER, { reason: 'bankrupt', week: state.week });
        }
    }

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
        }
        return true;
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

        GameState.addNews(`Acquired "${work.title}" by ${work.artist} for $${work.price.toLocaleString()}`);
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
        return true;
    }

    static getPortfolioValue() {
        return GameState.state.portfolio.reduce((sum, work) => {
            return sum + MarketManager.getWorkValue(work);
        }, 0);
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
                    id: `work_evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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

        if (effects.cash) {
            state.cash += effects.cash;
            summary.push(effects.cash > 0 ? `+$${effects.cash.toLocaleString()}` : `-$${Math.abs(effects.cash).toLocaleString()}`);
        }
        if (effects.reputation) {
            state.reputation = Math.max(0, Math.min(100, state.reputation + effects.reputation));
            summary.push(`Reputation ${effects.reputation > 0 ? '+' : ''}${effects.reputation}`);
        }
        if (effects.intel) {
            state.intel += effects.intel;
            summary.push(`Intel ${effects.intel > 0 ? '+' : ''}${effects.intel}`);
        }
        if (effects.taste) {
            state.taste = Math.max(0, Math.min(100, state.taste + effects.taste));
            summary.push(`Taste ${effects.taste > 0 ? '+' : ''}${effects.taste}`);
        }
        if (effects.access) {
            state.access = Math.max(0, Math.min(100, state.access + effects.access));
            summary.push(`Access ${effects.access > 0 ? '+' : ''}${effects.access}`);
        }
        if (effects.burnout) {
            state.burnout = Math.max(0, Math.min(10, state.burnout + effects.burnout));
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
            state.marketHeat = Math.max(0, Math.min(100, state.marketHeat + effects.marketHeat));
            if (effects.marketHeat > 0) {
                GameState.addNews(`🌡️ Market heat rising. The art world is watching you closely.`);
            } else {
                GameState.addNews(`❄️ Market heat cooling. You're regaining trust.`);
            }
        }
        if (effects.suspicion) {
            state.suspicion = Math.max(0, Math.min(100, state.suspicion + effects.suspicion));
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
    // Save / Load — Multi-Slot System
    // ══════════════════════════════════════════
    static MAX_SLOTS = 5;
    static activeSlot = 0;

    /**
     * Save to a specific slot (0-4). Stores both full state and lightweight metadata.
     */
    static save(slotIndex = GameState.activeSlot) {
        const saveData = {
            state: GameState.state,
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
        localStorage.setItem(`artlife_slot_${slotIndex}`, JSON.stringify(saveData));
        localStorage.setItem('artlife_last_slot', String(slotIndex));
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

        const raw = localStorage.getItem(`artlife_slot_${slotIndex}`);
        if (!raw) return false;

        try {
            const saveData = JSON.parse(raw);
            GameState.state = saveData.state;
            GameState.activeSlot = slotIndex;

            // Re-initialise market with fresh works so price calculations work.
            // Artist heat values from the save would be more accurate, but works
            // list is not serialised — reinit gives a correct-enough market.
            MarketManager.init(generateInitialWorks());

            // Restore phone manager so NPC inboxes are ready
            PhoneManager.init();

            // ConsequenceScheduler state is lost on load (pending consequences
            // are not serialised). Reset so we start clean rather than corrupt.
            ConsequenceScheduler.reset();

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
            const raw = localStorage.getItem(`artlife_slot_${i}`);
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
        const val = localStorage.getItem('artlife_last_slot');
        return val !== null ? parseInt(val) : null;
    }

    /**
     * Delete a specific save slot.
     */
    static deleteSave(slotIndex) {
        localStorage.removeItem(`artlife_slot_${slotIndex}`);
    }

    /**
     * Returns true if any save slot has data.
     */
    static hasSave() {
        for (let i = 0; i < GameState.MAX_SLOTS; i++) {
            if (localStorage.getItem(`artlife_slot_${i}`)) return true;
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
    static _migrateOldSave() {
        const old = localStorage.getItem('artlife_save');
        if (old && !localStorage.getItem('artlife_slot_0')) {
            try {
                const state = JSON.parse(old);
                const saveData = {
                    state: state,
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
                localStorage.setItem('artlife_slot_0', JSON.stringify(saveData));
                localStorage.setItem('artlife_last_slot', '0');
                localStorage.removeItem('artlife_save');
            } catch (e) {
                console.error('Failed to migrate old save:', e);
            }
        }
    }
}
