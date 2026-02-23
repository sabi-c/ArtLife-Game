/**
 * MarketHistoryEngine.js — Multi-Year Art Market Simulation
 *
 * Generates realistic multi-year price history at game init. This is the
 * backbone of the art market simulation. Every price chart, sparkline,
 * and historical trade in the Bloomberg terminal originates here.
 *
 * ARCHITECTURE CONTEXT:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  MarketHistoryEngine.generate(artists, config)             │
 * │    ├─ buildAuctionCalendar(years)                          │
 * │    ├─ generateMacroEvents(years)                           │
 * │    ├─ for each week:                                       │
 * │    │   ├─ evolveMarketCycle()                              │
 * │    │   ├─ applyMacroEvent()                                │
 * │    │   ├─ for each artist:                                 │
 * │    │   │   ├─ correlatedHeatStep()                         │
 * │    │   │   ├─ GBM price with O-U reversion                 │
 * │    │   │   ├─ seasonalMultiplier()                         │
 * │    │   │   └─ lifecycleProgression()                       │
 * │    │   ├─ generateWeeklyTrades()                           │
 * │    │   └─ computeCompositeIndex()                          │
 * │    └─ return { priceHistory, heatHistory, trades, events,  │
 * │              compositeHistory, sectorHistory }             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Price Model: Geometric Brownian Motion with Ornstein-Uhlenbeck reversion
 *   dP = θ(μ - P)dt + σP·dW + seasonal + event shocks
 *
 * References:
 * - ArtNet Price Database hedonic regression
 * - Mei Moses Fine Art Index methodology
 * - bmjoy/EconomicSimulation agent-based markets
 * - O-U process for mean-reverting assets
 */

import { ARTISTS } from '../data/artists.js';
import { ARTWORKS } from '../data/artworks.js';

// ════════════════════════════════════════════════════
// Configuration defaults
// ════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
    yearsOfHistory: 5,          // 260 weeks
    weeksPerYear: 52,
    seed: null,                 // null = random, number = deterministic
    tradeFrequencyBase: 3,      // avg trades per week (scales with # NPCs)
    enableLifecycle: true,
    enableMacroEvents: true,
    enableCorrelation: true,
    enableSeasonality: true,
};

// ── Tier-calibrated parameters (research-backed) ──
const TIER_PARAMS = {
    'blue-chip': {
        annualDrift: 0.04,      // +4% CAGR (stable appreciation)
        volatility: 0.08,       // Low vol
        theta: 0.15,            // Slow mean-reversion
        correlationRho: 0.5,    // Strong intra-tier correlation
        promotionProb: 0,       // Can't promote further
        heatFloor: 65,          // Blue-chip rarely drops below
        heatCeiling: 98,
    },
    'hot': {
        annualDrift: 0.18,      // +18% CAGR (rapid appreciation)
        volatility: 0.25,       // High vol
        theta: 0.10,            // Slow reversion (can overshoot)
        correlationRho: 0.35,
        promotionProb: 0.10,    // 10%/yr → mid-career
        heatFloor: 45,
        heatCeiling: 100,
    },
    'mid-career': {
        annualDrift: 0.03,      // +3% CAGR (modest)
        volatility: 0.12,       // Moderate vol
        theta: 0.20,            // Moderate reversion
        correlationRho: 0.4,
        promotionProb: 0.02,    // 2%/yr → blue-chip (rare)
        heatFloor: 30,
        heatCeiling: 85,
    },
    'emerging': {
        annualDrift: 0.08,      // +8% but huge variance
        volatility: 0.35,       // Very high vol
        theta: 0.05,            // Very slow reversion (wild swings)
        correlationRho: 0.25,
        promotionProb: 0.05,    // 5%/yr → hot
        heatFloor: 5,
        heatCeiling: 90,
    },
    'speculative': {
        annualDrift: -0.05,     // Often negative (most fail)
        volatility: 0.50,       // Extreme vol
        theta: 0.03,
        correlationRho: 0.15,
        promotionProb: 0.02,    // 2%/yr → emerging (rare breakout)
        heatFloor: 0,
        heatCeiling: 70,
    },
};

// ── Auction calendar (week numbers within a year) ──
const AUCTION_CALENDAR = [
    { startWeek: 10, endWeek: 12, name: 'Spring Auctions NYC', volumeMult: 1.4, pricePremium: 0.05 },
    { startWeek: 20, endWeek: 22, name: 'Art Basel', volumeMult: 1.5, pricePremium: 0.08, emergingBoost: 15 },
    { startWeek: 36, endWeek: 38, name: 'Frieze London', volumeMult: 1.3, pricePremium: 0.04 },
    { startWeek: 44, endWeek: 48, name: 'Fall Auctions NYC/London', volumeMult: 1.6, pricePremium: 0.07, blueChipBoost: 10 },
    { startWeek: 49, endWeek: 50, name: 'Art Basel Miami', volumeMult: 1.2, pricePremium: 0.03, emergingBoost: 10 },
];

const SUMMER_QUIET = { startWeek: 25, endWeek: 35, volumeMult: 0.5, pricePremium: -0.03 };

// ── Macro event templates ──
const MACRO_EVENT_TYPES = [
    {
        type: 'recession', probability: 0.08, // ~8%/yr
        durationWeeks: [26, 52], // 6-12 months
        heatImpact: -2,         // per week
        priceImpact: -0.005,    // per week multiplier
        description: '📉 Global economic downturn. Art market contracts.',
    },
    {
        type: 'bubble', probability: 0.06,
        durationWeeks: [12, 26],
        heatImpact: +3,
        priceImpact: +0.008,
        description: '📈 Speculative bubble forms. Prices surge across all tiers.',
    },
    {
        type: 'scandal', probability: 0.10,
        durationWeeks: [4, 12],
        heatImpact: -1,         // general (targeted -40 on specific artist)
        priceImpact: -0.002,
        description: '⚠️ Art world scandal. Confidence shaken.',
    },
    {
        type: 'museum_acquisition', probability: 0.15,
        durationWeeks: [2, 4],
        heatImpact: 0,
        priceImpact: 0,
        description: '🏛️ Major museum acquisition boosts artist profile.',
    },
    {
        type: 'art_fair_boom', probability: 0.12,
        durationWeeks: [2, 6],
        heatImpact: +2,
        priceImpact: +0.003,
        description: '🎨 Art fair delivers record sales.',
    },
];

// ── NPC buyer/seller names for historical trades ──
const HISTORICAL_ACTORS = [
    'Private Collection, New York', 'Private Collection, London', 'Galerie du Nord, Paris',
    'Sterling Advisory', 'Kone Collection, Abidjan', 'Volkov Foundation',
    'Anonymous Bidder', 'Corporate Collection', 'Family Trust',
    'Gallery XYZ', 'Basel Art Fund', 'Deitch Advisory',
    'Hong Kong Collector', 'Zurich Private Bank', 'Los Angeles Collector',
    'Miami Collection', 'Berlin Galerie', 'Tokyo Contemporary Fund',
    'Singapore Art Holdings', 'São Paulo Collector',
];

// ════════════════════════════════════════════════════
// Seeded PRNG (Mulberry32) — deterministic if seed provided
// ════════════════════════════════════════════════════

function mulberry32(seed) {
    let t = seed | 0;
    return function () {
        t = (t + 0x6D2B79F5) | 0;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

// Box-Muller for normal distribution
function gaussianRandom(rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ════════════════════════════════════════════════════
// MarketHistoryEngine
// ════════════════════════════════════════════════════

export class MarketHistoryEngine {

    /**
     * Generate multi-year art market history.
     *
     * @param {Array} artists — artist definitions from artists.js
     * @param {Object} config — override DEFAULT_CONFIG
     * @returns {{
     *   priceHistory: Object,     // { artistId: [{ week, avgPrice, highPrice, lowPrice, volume }] }
     *   heatHistory: Object,      // { artistId: [{ week, heat }] }
     *   compositeHistory: Array,  // [{ week, composite, cycle }]
     *   sectorHistory: Object,    // { tier: [{ week, index }] }
     *   trades: Array,            // [{ week, buyer, seller, artworkId, title, artistId, price, type }]
     *   events: Array,            // [{ week, type, description, impact }]
     *   artistStates: Object,     // { artistId: { heat, tier, careerAge, basePrice } }
     *   auctionCalendar: Array,   // [{ week, name, ... }]
     * }}
     */
    static generate(artists = ARTISTS, config = {}) {
        const cfg = { ...DEFAULT_CONFIG, ...config };
        const totalWeeks = cfg.yearsOfHistory * cfg.weeksPerYear;
        const rng = cfg.seed !== null ? mulberry32(cfg.seed) : Math.random.bind(Math);

        // ── Initialize artist state ──
        const artistStates = {};
        for (const a of artists) {
            const params = TIER_PARAMS[a.tier] || TIER_PARAMS.emerging;
            const basePrice = (a.basePriceMin + a.basePriceMax) / 2;
            artistStates[a.id] = {
                id: a.id,
                name: a.name,
                tier: a.tier,
                heat: a.heat || 50,
                heatVolatility: a.heatVolatility || 5,
                basePrice,
                currentPrice: basePrice,
                careerAge: 0,
                medium: a.medium || 'Mixed Media',
                params: { ...params },
            };
        }

        // ── Generate macro events for the full period ──
        const macroEvents = cfg.enableMacroEvents
            ? MarketHistoryEngine._generateMacroEvents(totalWeeks, rng)
            : [];

        // ── Build auction calendar for all years ──
        const fullCalendar = MarketHistoryEngine._buildFullCalendar(cfg.yearsOfHistory, cfg.weeksPerYear);

        // ── Simulation state ──
        let marketCycle = 'flat';
        let cycleMomentum = 0;
        const marketNoise = {};  // Shared noise per tier for correlation

        // ── Output accumulators ──
        const priceHistory = {};
        const heatHistory = {};
        const compositeHistory = [];
        const sectorHistory = {};
        const trades = [];
        const events = [];

        for (const a of artists) {
            priceHistory[a.id] = [];
            heatHistory[a.id] = [];
        }

        // ════════════════════════════════════════════
        // Main simulation loop — week by week
        // ════════════════════════════════════════════

        for (let week = 1; week <= totalWeeks; week++) {
            const yearWeek = ((week - 1) % cfg.weeksPerYear) + 1;

            // ── Check for macro events this week ──
            const activeEvents = macroEvents.filter(
                e => week >= e.startWeek && week < e.startWeek + e.durationWeeks
            );

            // ── Evolve market cycle ──
            const cycleResult = MarketHistoryEngine._evolveMarketCycle(
                marketCycle, cycleMomentum, artistStates, rng
            );
            marketCycle = cycleResult.cycle;
            cycleMomentum = cycleResult.momentum;

            // Apply macro event overrides
            for (const evt of activeEvents) {
                if (evt.type === 'recession') marketCycle = 'bear';
                if (evt.type === 'bubble') marketCycle = 'bull';
            }

            // ── Seasonal multiplier ──
            const seasonMult = cfg.enableSeasonality
                ? MarketHistoryEngine._seasonalMultiplier(yearWeek)
                : 1.0;

            // ── Generate correlated tier noise ──
            const tierNoise = {};
            for (const tier of Object.keys(TIER_PARAMS)) {
                tierNoise[tier] = gaussianRandom(rng);
            }

            // ── Evolve each artist ──
            const weekPrices = {};
            for (const aId of Object.keys(artistStates)) {
                const as = artistStates[aId];
                const params = TIER_PARAMS[as.tier] || TIER_PARAMS.emerging;

                // ── Correlated heat evolution ──
                const rho = cfg.enableCorrelation ? params.correlationRho : 0;
                const sharedNoise = tierNoise[as.tier] || 0;
                const idioNoise = gaussianRandom(rng);
                const combinedNoise = rho * sharedNoise + Math.sqrt(1 - rho * rho) * idioNoise;

                const heatChange = combinedNoise * as.heatVolatility * 0.5;
                let newHeat = as.heat + heatChange;

                // Market cycle impact on heat
                if (marketCycle === 'bull') newHeat += 0.3;
                if (marketCycle === 'bear') newHeat -= 0.5;

                // Macro event impacts
                for (const evt of activeEvents) {
                    newHeat += evt.heatImpact || 0;
                    // Scandal targets a specific artist
                    if (evt.type === 'scandal' && evt.targetArtistId === aId) {
                        newHeat -= 40;
                    }
                    // Museum acquisition boosts specific artist
                    if (evt.type === 'museum_acquisition' && evt.targetArtistId === aId) {
                        newHeat += 20;
                    }
                }

                // Seasonal auction boosts
                const calendarEvent = fullCalendar.find(
                    c => yearWeek >= c.startWeek && yearWeek <= c.endWeek
                );
                if (calendarEvent) {
                    if (calendarEvent.emergingBoost && as.tier === 'emerging') {
                        newHeat += calendarEvent.emergingBoost * 0.1;
                    }
                    if (calendarEvent.blueChipBoost && as.tier === 'blue-chip') {
                        newHeat += calendarEvent.blueChipBoost * 0.1;
                    }
                }

                // Clamp heat
                newHeat = Math.max(params.heatFloor, Math.min(params.heatCeiling, newHeat));
                as.heat = newHeat;

                // ── GBM + O-U price evolution ──
                const weeklyDrift = params.annualDrift / cfg.weeksPerYear;
                const weeklyVol = params.volatility / Math.sqrt(cfg.weeksPerYear);
                const priceNoise = gaussianRandom(rng);

                // Heat-based multiplier (quadratic — matches existing MarketManager)
                const heatMult = 0.5 + Math.pow(as.heat / 32, 2);
                const targetPrice = as.basePrice * heatMult;

                // O-U mean reversion toward target
                const meanReversion = params.theta * (targetPrice - as.currentPrice) / cfg.weeksPerYear;

                // GBM shock
                const gbmShock = as.currentPrice * weeklyDrift + as.currentPrice * weeklyVol * priceNoise;

                // Seasonal premium
                const seasonalAdj = as.currentPrice * (seasonMult - 1.0) * 0.1;

                // Calendar event premium
                let calendarAdj = 0;
                if (calendarEvent) {
                    calendarAdj = as.currentPrice * calendarEvent.pricePremium * 0.3;
                }

                // Macro event price impact
                let macroAdj = 0;
                for (const evt of activeEvents) {
                    macroAdj += as.currentPrice * (evt.priceImpact || 0);
                }

                let newPrice = as.currentPrice + meanReversion + gbmShock + seasonalAdj + calendarAdj + macroAdj;
                newPrice = Math.max(Math.round(as.basePrice * 0.1), Math.round(newPrice)); // Floor at 10% of base
                as.currentPrice = newPrice;

                // Record history
                const jitter = newPrice * 0.03 * gaussianRandom(rng);
                const high = Math.round(newPrice + Math.abs(jitter));
                const low = Math.round(newPrice - Math.abs(jitter));

                weekPrices[aId] = newPrice;
                priceHistory[aId].push({
                    week,
                    avgPrice: Math.round(newPrice),
                    highPrice: high,
                    lowPrice: low,
                    volume: Math.max(1, Math.round(2 + rng() * 3)),
                });

                heatHistory[aId].push({ week, heat: Math.round(as.heat * 10) / 10 });

                // ── Lifecycle progression (once per year at week 52) ──
                if (cfg.enableLifecycle && yearWeek === cfg.weeksPerYear) {
                    as.careerAge++;
                    const promoRoll = rng();
                    const promoNeeded = params.promotionProb;

                    // Additional heat requirement for promotion
                    const heatThreshold = {
                        'emerging': 60,
                        'hot': 55,
                        'mid-career': 80,
                    };

                    if (promoNeeded > 0 && promoRoll < promoNeeded && as.heat > (heatThreshold[as.tier] || 999)) {
                        const promoMap = {
                            'speculative': 'emerging',
                            'emerging': 'hot',
                            'hot': 'mid-career',
                            'mid-career': 'blue-chip',
                        };
                        const newTier = promoMap[as.tier];
                        if (newTier) {
                            const oldTier = as.tier;
                            as.tier = newTier;
                            as.basePrice = Math.round(as.basePrice * 1.5); // 50% base price jump on promotion
                            events.push({
                                week,
                                type: 'tier_promotion',
                                artistId: aId,
                                description: `🌟 ${as.name} promoted from ${oldTier} to ${newTier}`,
                                impact: { oldTier, newTier, priceJump: 1.5 },
                            });
                        }
                    }
                }
            }

            // ── Generate weekly trades ──
            const weekTrades = MarketHistoryEngine._generateWeeklyTrades(
                artistStates, weekPrices, week, marketCycle, seasonMult, fullCalendar, yearWeek, rng, cfg
            );
            trades.push(...weekTrades);

            // ── Compute composite and sector indices ──
            const artistArr = Object.values(artistStates);
            const composite = MarketHistoryEngine._computeComposite(artistArr);
            compositeHistory.push({ week, composite: Math.round(composite), cycle: marketCycle });

            // Sector indices
            const tierGroups = {};
            for (const as of artistArr) {
                if (!tierGroups[as.tier]) tierGroups[as.tier] = [];
                tierGroups[as.tier].push(as);
            }
            for (const [tier, group] of Object.entries(tierGroups)) {
                if (!sectorHistory[tier]) sectorHistory[tier] = [];
                const idx = MarketHistoryEngine._computeComposite(group);
                sectorHistory[tier].push({ week, index: Math.round(idx) });
            }

            // ── Log macro event starts ──
            for (const evt of macroEvents) {
                if (evt.startWeek === week) {
                    events.push({
                        week: evt.startWeek,
                        type: evt.type,
                        description: evt.description,
                        impact: {
                            durationWeeks: evt.durationWeeks,
                            targetArtistId: evt.targetArtistId,
                        },
                    });
                }
            }

            // ── Log calendar events ──
            if (calendarEvent && yearWeek === calendarEvent.startWeek) {
                events.push({
                    week,
                    type: 'auction_season',
                    description: `🎪 ${calendarEvent.name}`,
                    impact: { volumeMult: calendarEvent.volumeMult, pricePremium: calendarEvent.pricePremium },
                });
            }
        }

        return {
            priceHistory,
            heatHistory,
            compositeHistory,
            sectorHistory,
            trades,
            events,
            artistStates,
            auctionCalendar: fullCalendar,
            config: cfg,
        };
    }

    // ════════════════════════════════════════════════════
    // Private helpers
    // ════════════════════════════════════════════════════

    /**
     * Generate macro events across the full simulation period.
     */
    static _generateMacroEvents(totalWeeks, rng) {
        const events = [];
        const yearLength = 52;
        const years = Math.ceil(totalWeeks / yearLength);

        for (let year = 0; year < years; year++) {
            for (const template of MACRO_EVENT_TYPES) {
                if (rng() < template.probability) {
                    const weekOffset = year * yearLength;
                    const start = weekOffset + Math.floor(rng() * yearLength) + 1;
                    const duration = template.durationWeeks[0] +
                        Math.floor(rng() * (template.durationWeeks[1] - template.durationWeeks[0]));

                    const evt = {
                        ...template,
                        startWeek: Math.min(start, totalWeeks),
                        durationWeeks: duration,
                    };

                    // Scandal/museum targets a random artist
                    if (template.type === 'scandal' || template.type === 'museum_acquisition') {
                        const artistIds = Object.keys(ARTISTS.reduce((m, a) => { m[a.id] = true; return m; }, {}));
                        evt.targetArtistId = artistIds[Math.floor(rng() * artistIds.length)] || null;
                    }

                    events.push(evt);
                }
            }
        }

        return events;
    }

    /**
     * Build full auction calendar across all years.
     */
    static _buildFullCalendar(years, weeksPerYear) {
        const calendar = [];
        // Just return the template — yearWeek matching handles multi-year
        return AUCTION_CALENDAR.map(c => ({ ...c }));
    }

    /**
     * Seasonal price multiplier based on the art auction calendar.
     */
    static _seasonalMultiplier(yearWeek) {
        // Check auction events
        for (const event of AUCTION_CALENDAR) {
            if (yearWeek >= event.startWeek && yearWeek <= event.endWeek) {
                return 1.0 + event.pricePremium;
            }
        }
        // Summer quiet period
        if (yearWeek >= SUMMER_QUIET.startWeek && yearWeek <= SUMMER_QUIET.endWeek) {
            return 1.0 + SUMMER_QUIET.pricePremium;
        }
        return 1.0;
    }

    /**
     * Evolve market cycle with momentum-based transitions.
     */
    static _evolveMarketCycle(currentCycle, momentum, artistStates, rng) {
        const artists = Object.values(artistStates);
        const avgHeat = artists.length > 0
            ? artists.reduce((s, a) => s + a.heat, 0) / artists.length : 50;

        // Update momentum (exponential moving average of heat)
        const alpha = 0.1;
        const newMomentum = momentum * (1 - alpha) + avgHeat * alpha;

        const r = rng();
        let cycle = currentCycle;

        if (currentCycle === 'flat') {
            if (newMomentum > 60 && r < 0.06) cycle = 'bull';
            else if (newMomentum < 38 && r < 0.06) cycle = 'bear';
        } else if (currentCycle === 'bull') {
            if (r < 0.04 || newMomentum < 42) cycle = 'flat';
        } else if (currentCycle === 'bear') {
            if (r < 0.04 || newMomentum > 55) cycle = 'flat';
        }

        return { cycle, momentum: newMomentum };
    }

    /**
     * Generate realistic trades for a given week.
     */
    static _generateWeeklyTrades(artistStates, prices, week, cycle, seasonMult, calendar, yearWeek, rng, cfg) {
        const trades = [];
        const artists = Object.values(artistStates);
        if (artists.length === 0) return trades;

        // Base trade count scaled by number of artists and season
        let tradeCount = cfg.tradeFrequencyBase;
        if (cycle === 'bull') tradeCount *= 1.3;
        if (cycle === 'bear') tradeCount *= 0.6;

        // Calendar volume multiplier
        const calEvt = calendar.find(c => yearWeek >= c.startWeek && yearWeek <= c.endWeek);
        if (calEvt) tradeCount *= calEvt.volumeMult;

        // Summer quiet
        if (yearWeek >= SUMMER_QUIET.startWeek && yearWeek <= SUMMER_QUIET.endWeek) {
            tradeCount *= SUMMER_QUIET.volumeMult;
        }

        // Poisson-ish count
        const actualCount = Math.max(0, Math.round(tradeCount + (rng() - 0.5) * tradeCount * 0.6));

        for (let i = 0; i < actualCount; i++) {
            // Pick random artist weighted by heat (hotter artists trade more)
            const weights = artists.map(a => 0.5 + (a.heat || 50) / 100);
            const totalWeight = weights.reduce((s, w) => s + w, 0);
            let pick = rng() * totalWeight;
            let selectedArtist = artists[0];
            for (let j = 0; j < artists.length; j++) {
                pick -= weights[j];
                if (pick <= 0) { selectedArtist = artists[j]; break; }
            }

            const artworkPrice = prices[selectedArtist.id] || selectedArtist.currentPrice;

            // Price variance for this trade (±20% around current price)
            const tradePrice = Math.round(
                artworkPrice * (0.8 + rng() * 0.4)
            );

            // Pick buyer and seller from historical actors
            const buyerIdx = Math.floor(rng() * HISTORICAL_ACTORS.length);
            let sellerIdx = Math.floor(rng() * HISTORICAL_ACTORS.length);
            if (sellerIdx === buyerIdx) sellerIdx = (sellerIdx + 1) % HISTORICAL_ACTORS.length;

            // Find a matching artwork from ARTWORKS data
            const matchingWorks = ARTWORKS.filter(w => w.artistId === selectedArtist.id);
            const artwork = matchingWorks.length > 0
                ? matchingWorks[Math.floor(rng() * matchingWorks.length)]
                : null;

            trades.push({
                week,
                buyer: HISTORICAL_ACTORS[buyerIdx],
                seller: HISTORICAL_ACTORS[sellerIdx],
                artworkId: artwork?.id || `hist_${selectedArtist.id}_${week}_${i}`,
                title: artwork?.title || `Work by ${selectedArtist.name}`,
                artistId: selectedArtist.id,
                artist: selectedArtist.name,
                price: Math.max(100, tradePrice),
                type: 'historical',
                medium: selectedArtist.medium,
                tier: selectedArtist.tier,
                cycle,
            });
        }

        return trades;
    }

    /**
     * Compute composite market index (cap-weighted, base 1000).
     */
    static _computeComposite(artists) {
        if (artists.length === 0) return 1000;
        const tierWeight = {
            'blue-chip': 4, 'hot': 2, 'mid-career': 1.5, 'emerging': 1, 'speculative': 0.5,
        };

        let totalWeightedIndex = 0;
        let totalWeight = 0;

        for (const a of artists) {
            const w = tierWeight[a.tier] || 1;
            const index = 500 + (a.heat || 50) * 5; // Simple index
            totalWeightedIndex += index * w;
            totalWeight += w;
        }

        return totalWeight > 0 ? (totalWeightedIndex / totalWeight) * 2 : 1000;
    }

    /**
     * Quick preview: generate just the composite index history without full detail.
     * Useful for lightweight terminal display.
     */
    static generateCompositePreview(artists = ARTISTS, weeks = 260) {
        const result = MarketHistoryEngine.generate(artists, {
            yearsOfHistory: Math.ceil(weeks / 52),
            enableMacroEvents: true,
            enableLifecycle: false,
            seed: 42,  // Deterministic for consistent preview
        });
        return result.compositeHistory.slice(0, weeks);
    }
}
