import { ARTISTS } from '../data/artists.js';
import { ARTWORKS } from '../data/artworks.js';
import { GameState } from './GameState.js';
import { shuffle } from '../utils/shuffle.js';
import { generateId } from '../utils/id.js';
import { useMarketStore } from '../stores/marketStore.js';
import { clamp } from '../utils/math.js';
import { MarketHistoryEngine } from './MarketHistoryEngine.js';
import { MarketSimulator } from './MarketSimulator.js';
import { MarketEventBus } from './MarketEventBus.js';
import { HISTORICAL_PRICES, getHistoricalData } from '../data/historicalPrices.js';

/**
 * MarketManager.js — Pricing Engine & Artist Index Calculator
 *
 * Core engine that drives all art pricing in the game. Everything that
 * involves artwork value flows through this class.
 *
 * ARCHITECTURE CONTEXT (for other agents):
 * ┌─────────────────────────────────────────────────────┐
 * │  MarketManager (THIS FILE)                          │
 * │  └─ Owns: artist heat, price calculation, market    │
 * │     cycles, hedonic scoring, composite index        │
 * │  └─ Called by: WeekEngine (weekly tick),             │
 * │     MarketSimulator (NPC pricing), HaggleManager    │
 * │     (player pricing), ArtworkEditor (CMS display)   │
 * │  └─ Reads: artists.js, GameState                    │
 * │  └─ Writes to: marketStore (Zustand, via sync)      │
 * └─────────────────────────────────────────────────────┘
 *
 * KEY PRICING FORMULA:
 *   targetPrice = basePrice × heatMult × marketMult × eraMod
 *                 × flipperPenalty × hedonicMult [+ O-U jitter]
 *
 * Economy Model (Research-Backed):
 * - Ornstein-Uhlenbeck mean-reverting random walk for price jitter
 * - Gallery buyback floor simulation
 * - Real-world CAGR drift integration
 * - ArtNet-inspired Hedonic Pricing Model (provenance, medium, age)
 * - Market Cycle Evolution (bull/bear/flat) with momentum signals
 * - Comparable Grouping Artist Index (base 500)
 * - Composite Market Index (cap-weighted, base 1000)
 *
 * INTEGRATION POINTS:
 * - MarketSimulator._getPrice() → calls calculatePrice()
 * - HaggleManager.start() → uses asking prices derived from calculatePrice()
 * - ArtworkEditor metadata tab → shows per-artwork market panel using getMarketSnapshot()
 * - marketStore.syncFromManager() → called after each weekly tick
 *
 * References:
 * - ArtNet Price Database methodology
 * - bmjoy/EconomicSimulation (agent-based market)
 * - Ornstein-Uhlenbeck process for mean-reverting asset prices
 */
export class MarketManager {
    static realWorldData = null;
    static artists = [];
    static works = [];
    static historicalData = null; // Multi-year simulation from MarketHistoryEngine

    static init(works) {
        // Deep copy artists so we can mutate heat
        MarketManager.artists = ARTISTS.map((a) => ({ ...a }));
        MarketManager.works = works;

        // ── Generate multi-year historical data ──
        // This populates price charts, trade history, and market events
        // in the Bloomberg terminal with realistic 5-year data.
        try {
            MarketManager.historicalData = MarketHistoryEngine.generate(ARTISTS, {
                yearsOfHistory: 5,
                seed: 42, // Deterministic for consistent experience
            });
            console.log(`[MarketManager] Generated ${MarketManager.historicalData.compositeHistory.length}-week market history with ${MarketManager.historicalData.trades.length} trades`);

            // Pre-populate marketStore with historical data
            try {
                const store = useMarketStore.getState();
                if (store.loadHistoricalData) {
                    store.loadHistoricalData(MarketManager.historicalData);
                }
            } catch { /* store may not have loadHistoricalData yet */ }

            // Pre-populate trade log with historical trades
            try {
                MarketSimulator.loadHistoricalTrades(MarketManager.historicalData.trades);
            } catch { /* MarketSimulator may not be ready */ }
        } catch (err) {
            console.warn('[MarketManager] Historical data generation failed:', err);
        }

        // Asynchronously load the real-world scraped data backend
        fetch('content/real_world_data.json')
            .then(res => res.json())
            .then(data => { MarketManager.realWorldData = data; })
            .catch(() => {
                // Fallback: use static historicalPrices.js data
                const fallback = {};
                for (const artist of MarketManager.artists) {
                    const hist = getHistoricalData(artist.id) || getHistoricalData(artist.name);
                    if (hist) {
                        fallback[artist.id] = {
                            realWorldAnchor: {
                                auctionHistory: hist.auctionHistory.map(a => ({ year: a.year, price: a.price })),
                                volatilityIndex: hist.volatilityIndex,
                                cagr: hist.cagr,
                            },
                        };
                    }
                }
                MarketManager.realWorldData = fallback;
                console.log(`[MarketManager] Loaded ${Object.keys(fallback).length} historical price anchors from static data`);
            });
    }

    static tick() {
        const state = GameState.state;
        if (!state) return;
        if (MarketManager.artists.length === 0) MarketManager.init([]);

        // ── Market Cycle Evolution (ArtNet-inspired momentum) ──
        MarketManager._evolveMarketCycle(state);

        // Update each artist's heat
        MarketManager.artists.forEach((artist) => {
            const volatility = artist.heatVolatility;
            const change = (Math.random() - 0.45) * volatility * 2;
            artist.heat = clamp(artist.heat + change, 0, 100);

            if (state.marketState === 'bull') {
                artist.heat = Math.min(100, artist.heat + 0.5);
            } else if (state.marketState === 'bear') {
                artist.heat = Math.max(0, artist.heat - 0.8);
            }

            // Gallery Buyback Simulation
            if (artist.heat < 20 && !artist.buybackActive) {
                if (Math.random() < 0.3) {
                    artist.buybackActive = true;
                    artist.buybackFloor = artist.heat;
                }
            }
            if (artist.buybackActive) {
                artist.heat = Math.max(artist.buybackFloor, artist.heat);
                if (Math.random() < 0.10) {
                    artist.buybackActive = false;
                    artist.heat = Math.max(0, artist.heat - 15);
                    GameState.addNews(`📉 ${artist.name}'s market support collapsed. Prices cratering.`);
                }
            }

            // ── Compute Artist Index (Comparable Grouping) ──
            artist.artistIndex = MarketManager._computeArtistIndex(artist);
        });

        // Update work prices
        MarketManager.works.forEach((work) => {
            work.price = MarketManager.calculatePrice(work, true);
        });

        // Occasionally add new works to market
        if (Math.random() < 0.15) {
            MarketManager.addNewWorkToMarket();
        }

        // Tick event bus (decay active effects)
        MarketEventBus.tick();
    }

    /**
     * Standalone tick for CMS simulation — doesn't require GameState.
     * Evolves heat, recalculates prices, and updates artist indices
     * using the provided market cycle parameter.
     *
     * @param {string} cycle — 'bull' | 'bear' | 'flat'
     */
    static tickForSim(cycle = 'flat') {
        if (MarketManager.artists.length === 0) MarketManager.ensureInitForSim();

        // Update each artist's heat
        MarketManager.artists.forEach((artist) => {
            const volatility = artist.heatVolatility || 10;
            const change = (Math.random() - 0.45) * volatility * 2;
            artist.heat = clamp(artist.heat + change, 0, 100);

            if (cycle === 'bull') {
                artist.heat = Math.min(100, artist.heat + 0.5);
            } else if (cycle === 'bear') {
                artist.heat = Math.max(0, artist.heat - 0.8);
            }

            // Gallery Buyback Simulation
            if (artist.heat < 20 && !artist.buybackActive) {
                if (Math.random() < 0.3) {
                    artist.buybackActive = true;
                    artist.buybackFloor = artist.heat;
                }
            }
            if (artist.buybackActive) {
                artist.heat = Math.max(artist.buybackFloor, artist.heat);
                if (Math.random() < 0.10) {
                    artist.buybackActive = false;
                    artist.heat = Math.max(0, artist.heat - 15);
                }
            }

            // Compute Artist Index
            artist.artistIndex = MarketManager._computeArtistIndex(artist);
        });

        // Update work prices with O-U jitter (sim-safe: no GameState dependency)
        MarketManager.works.forEach((work) => {
            const artist = MarketManager.getArtist(work.artistId);
            if (!artist) return;

            const heatMultiplier = 0.5 + Math.pow(artist.heat / 32, 2);
            const marketMultiplier = cycle === 'bull' ? 1.2 : cycle === 'bear' ? 0.8 : 1.0;
            const hedonicMultiplier = MarketManager._hedonicScore(work);
            const eventModifier = MarketEventBus.getPriceModifier(work.artistId, artist.tier);

            const targetPrice = work.basePrice * heatMultiplier * marketMultiplier * hedonicMultiplier * eventModifier;

            // O-U mean-reverting jitter
            const prevPrice = work.price || targetPrice;
            const theta = 0.2;
            const vol = (artist.heatVolatility || 10) / 100;
            let u = 0, v = 0;
            while (u === 0) u = Math.random();
            while (v === 0) v = Math.random();
            const Z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            const randomShock = vol * prevPrice * Z;
            const meanReversion = theta * (targetPrice - prevPrice);
            work.price = Math.max(10, Math.round(prevPrice + meanReversion + randomShock));
        });

        // Occasionally add new works to market
        if (Math.random() < 0.15) {
            MarketManager.addNewWorkToMarket();
        }

        // Tick event bus
        MarketEventBus.tick();
    }

    /**
     * Ensure MarketManager is initialized for standalone CMS simulation.
     * If artists are empty, initialize from ARTISTS data.
     */
    static ensureInitForSim() {
        if (MarketManager.artists.length === 0) {
            MarketManager.artists = ARTISTS.map(a => ({ ...a }));
            console.log(`[MarketManager] Sim-init: loaded ${MarketManager.artists.length} artists`);
        }
        if (MarketManager.works.length === 0) {
            // Use artworks data for simulation
            if (ARTWORKS?.length > 0) {
                MarketManager.works = ARTWORKS.map(w => ({ ...w, price: w.basePrice || w.price || 10000 }));
            } else {
                // Fallback: generate works from artists
                for (const artist of MarketManager.artists) {
                    const count = artist.tier === 'blue-chip' ? 8 : artist.tier === 'mid-career' ? 5 : 3;
                    for (let i = 0; i < count; i++) {
                        const price = Math.round(
                            artist.basePriceMin + Math.random() * (artist.basePriceMax - artist.basePriceMin)
                        );
                        MarketManager.works.push({
                            id: `sim_${artist.id}_${i}`,
                            title: `Work #${i + 1}`,
                            artistId: artist.id,
                            artist: artist.name,
                            medium: artist.medium,
                            basePrice: price,
                            price: price,
                            yearCreated: 2020 + Math.floor(Math.random() * 5),
                            onMarket: Math.random() < 0.6,
                        });
                    }
                }
            }
            console.log(`[MarketManager] Sim-init: loaded ${MarketManager.works.length} works`);
        }
    }

    static calculatePrice(work, includeJitter = false) {
        const artist = MarketManager.getArtist(work.artistId);
        if (!artist) return work.basePrice;

        const heatMultiplier = 0.5 + Math.pow(artist.heat / 32, 2);
        const state = GameState.state;
        const marketMultiplier = state.marketState === 'bull' ? 1.2 : state.marketState === 'bear' ? 0.8 : 1.0;
        const eraModifier = state?.eraModifier || 1.0;
        const flipperPenalty = state?.dealerBlacklisted ? 1.20 : 1.0;

        // ── Hedonic Pricing Model (ArtNet-inspired attribute scoring) ──
        const hedonicMultiplier = MarketManager._hedonicScore(work);

        // ── Event-Reactive Pricing (MarketEventBus active effects) ──
        const eventModifier = MarketEventBus.getPriceModifier(work.artistId, artist.tier);
        const eventHeat = MarketEventBus.getHeatModifier(work.artistId);
        if (eventHeat) {
            // Temporarily boost/dip artist heat for this calculation
            artist.heat = clamp(artist.heat + eventHeat * 0.01, 0, 100);
        }

        let targetPrice = work.basePrice * heatMultiplier * marketMultiplier * eraModifier * flipperPenalty * hedonicMultiplier * eventModifier;

        // ── Real-World Data Drift Integration ──
        const rwData = MarketManager.realWorldData?.[artist.id];
        let volatility = (artist.heatVolatility || 10) / 100;

        if (rwData?.realWorldAnchor) {
            volatility = rwData.realWorldAnchor.volatilityIndex ?? volatility;
            const history = rwData.realWorldAnchor.auctionHistory;
            if (history && history.length >= 2) {
                const start = history[0];
                const end = history[history.length - 1];
                const years = Math.max(1, end.year - start.year);
                const annualDrift = Math.pow(end.price / start.price, 1 / years) - 1;
                const weeklyDrift = annualDrift / 52;
                const weeksElapsed = state?.week || 1;
                const driftMultiplier = Math.pow(1 + weeklyDrift, weeksElapsed);
                targetPrice = targetPrice * driftMultiplier;
            }
        }

        if (includeJitter) {
            // ── Ornstein-Uhlenbeck Process (Mean-Reverting Random Walk) ──
            const prevPrice = work.price || targetPrice;
            const theta = 0.2;
            let u = 0, v = 0;
            while (u === 0) u = Math.random();
            while (v === 0) v = Math.random();
            const Z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            const randomShock = volatility * prevPrice * Z;
            const meanReversion = theta * (targetPrice - prevPrice);
            return Math.max(10, Math.round(prevPrice + meanReversion + randomShock));
        }

        return Math.round(targetPrice);
    }

    static getWorkValue(work) {
        // Return cached weekly price to prevent UI jittering every frame
        return work.price || MarketManager.calculatePrice(work, false);
    }

    static getArtist(artistId) {
        return MarketManager.artists.find((a) => a.id === artistId);
    }

    static getAvailableWorks() {
        // Show 4 works on the market each turn
        const onMarket = MarketManager.works.filter((w) => w.onMarket);
        const shuffled = shuffle(onMarket);
        return shuffled.slice(0, 4);
    }

    static addNewWorkToMarket() {
        const artist = MarketManager.artists[Math.floor(Math.random() * MarketManager.artists.length)];
        const price = Math.round(
            artist.basePriceMin + Math.random() * (artist.basePriceMax - artist.basePriceMin)
        );

        const titles = ['New Work', 'Untitled', 'Study', 'Composition', 'Fragment', 'Series'];
        const title = `${titles[Math.floor(Math.random() * titles.length)]} #${Math.floor(Math.random() * 999)}`;

        MarketManager.works.push({
            id: generateId('work_gen'),
            title: title,
            artistId: artist.id,
            artist: artist.name,
            medium: artist.medium,
            basePrice: price,
            price: price,
            yearCreated: 2024,
            onMarket: true,
        });
    }

    static boostRandomArtistHeat(amount) {
        const artist = MarketManager.artists[Math.floor(Math.random() * MarketManager.artists.length)];
        artist.heat = Math.min(100, artist.heat + amount);
        GameState.addNews(`🔥 ${artist.name} is getting attention. Heat rising.`);
    }

    static boostAllHeat(amount) {
        MarketManager.artists.forEach((a) => {
            a.heat = Math.min(100, a.heat + amount);
        });
    }

    /**
     * Detect if an artist's price is being artificially supported by gallery buybacks.
     */
    static detectArtificialFloor(artistId) {
        const artist = MarketManager.getArtist(artistId);
        return artist ? (artist.buybackActive || false) : false;
    }

    /**
     * Lightweight intra-week price jitter — O-U mean-reverting noise without
     * full heat evolution or market cycle transitions. Called from
     * GameState.advanceTime() whenever the game clock crosses an hour boundary.
     *
     * Uses damped volatility (30% of weekly) and weaker mean reversion (theta 0.15)
     * so prices drift slightly between weekly ticks but don't diverge wildly.
     */
    static microTick() {
        if (MarketManager.works.length === 0) return;

        for (const work of MarketManager.works) {
            if (!work.onMarket) continue;
            const artist = MarketManager.artists.find(a => a.id === work.artistId);
            if (!artist) continue;

            const target = MarketManager.calculatePrice(work, false);
            const vol = (artist.heatVolatility || 5) * 0.3; // Damped volatility
            const theta = 0.15; // Weaker mean reversion than weekly tick
            const shock = vol * work.price * 0.01 * (Math.random() * 2 - 1);
            const reversion = theta * (target - work.price);
            work.price = Math.max(100, Math.round(work.price + reversion * 0.1 + shock));
        }

        MarketManager._lastMicroTick = Date.now();

        // Record snapshot for Bloomberg sparklines
        try {
            useMarketStore.getState().recordMicroTick(MarketManager.artists, MarketManager.works);
        } catch { /* store not ready */ }
    }

    // ══════════════════════════════════════════════════════════════
    // Private: ArtNet-Inspired Economy Mechanics
    // ══════════════════════════════════════════════════════════════

    /**
     * Hedonic Pricing Model — Adjusts price based on intrinsic artwork attributes.
     * Based on ArtNet's hedonic regression approach: provenance, medium, age, and
     * condition all influence the final valuation independently of artist heat.
     */
    static _hedonicScore(work) {
        let score = 1.0;

        // Provenance depth: more ownership history = more value
        const provLen = work.provenanceHistory?.length || 0;
        if (provLen >= 4) score *= 1.15;
        else if (provLen >= 2) score *= 1.05;

        // Medium rarity: oil and sculpture command premium over prints
        const premiumMedia = ['oil on canvas', 'bronze sculpture', 'marble', 'mixed media installation'];
        const discountMedia = ['print', 'digital', 'photography'];
        const med = (work.medium || '').toLowerCase();
        if (premiumMedia.some(m => med.includes(m))) score *= 1.10;
        if (discountMedia.some(m => med.includes(m))) score *= 0.90;

        // Age premium: older works generally appreciate (vintage effect)
        const age = (new Date().getFullYear()) - (work.yearCreated || 2024);
        if (age > 50) score *= 1.20;
        else if (age > 20) score *= 1.08;

        // Exhibition history bonus
        if (work.exhibitionHistory?.length > 0) {
            score *= 1 + (work.exhibitionHistory.length * 0.03);
        }

        return score;
    }

    /**
     * Market Cycle Evolution — Naturally transitions between bull/bear/flat
     * based on aggregate market momentum (inspired by Artnet's decay formula).
     */
    static _evolveMarketCycle(state) {
        if (!state) return;

        // Calculate aggregate momentum from all artists
        const totalHeat = MarketManager.artists.reduce((sum, a) => sum + a.heat, 0);
        const avgHeat = MarketManager.artists.length > 0 ? totalHeat / MarketManager.artists.length : 50;

        // Transition probabilities based on average heat
        const r = Math.random();
        if (state.marketState === 'flat') {
            if (avgHeat > 65 && r < 0.08) {
                state.marketState = 'bull';
                GameState.addNews('📈 Art market entering a BULL CYCLE. Prices rising across the board.');
            } else if (avgHeat < 35 && r < 0.08) {
                state.marketState = 'bear';
                GameState.addNews('📉 Market sentiment shifts BEARISH. Collectors tightening wallets.');
            }
        } else if (state.marketState === 'bull') {
            // Bull markets have a natural decay — they don't last forever
            if (r < 0.06 || avgHeat < 40) {
                state.marketState = 'flat';
                GameState.addNews('📊 Bull market cooling. Market returns to equilibrium.');
            }
        } else if (state.marketState === 'bear') {
            if (r < 0.06 || avgHeat > 55) {
                state.marketState = 'flat';
                GameState.addNews('📊 Bear market bottoming out. Signs of recovery.');
            }
        }
    }

    /**
     * Artist Index — Comparable Grouping (ArtNet methodology)
     * Base 500 + heat contribution + price velocity + tier bonus.
     */
    static _computeArtistIndex(artist) {
        if (!artist) return 500;
        const base = 500;
        const heatContribution = (artist.heat || 0) * 5;

        // Price velocity: average price change across this artist's works
        const artistWorks = MarketManager.works.filter(w => w.artistId === artist.id);
        let velocity = 0;
        if (artistWorks.length > 0) {
            const avgPrice = artistWorks.reduce((s, w) => s + (w.price || w.basePrice), 0) / artistWorks.length;
            const avgBase = artistWorks.reduce((s, w) => s + w.basePrice, 0) / artistWorks.length;
            if (avgBase > 0) velocity = ((avgPrice - avgBase) / avgBase) * 100;
        }

        // Tier bonus
        const tierBonus = { 'blue-chip': 200, 'mid-career': 100, 'emerging': 0 };
        const bonus = tierBonus[artist.tier] || 0;

        return Math.round(base + heatContribution + velocity + bonus);
    }

    /**
     * Composite Art Market Index — Cap-weighted average of all artist indices.
     * Analogous to S&P 500: higher-tier artists contribute more weight.
     * Base 1000 at market equilibrium.
     */
    static getCompositeIndex() {
        if (MarketManager.artists.length === 0) return 1000;
        const weights = { 'blue-chip': 4, 'hot': 2, 'mid-career': 1.5, 'emerging': 1 };
        let totalWeight = 0;
        let weightedSum = 0;
        for (const artist of MarketManager.artists) {
            const idx = artist.artistIndex || MarketManager._computeArtistIndex(artist);
            const w = weights[artist.tier] || 1;
            weightedSum += idx * w;
            totalWeight += w;
        }
        // Normalize around base 1000 (artist indices base at 500)
        return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 2) : 1000;
    }

    /**
     * Sector Indices — Group artists by tier and return per-sector index.
     * Each sector is the simple average of its member artist indices.
     */
    static getSectorIndices() {
        const sectors = {};
        const groups = {};
        for (const artist of MarketManager.artists) {
            const tier = artist.tier || 'emerging';
            if (!groups[tier]) groups[tier] = [];
            groups[tier].push(artist.artistIndex || MarketManager._computeArtistIndex(artist));
        }
        for (const [tier, indices] of Object.entries(groups)) {
            const avg = Math.round(indices.reduce((s, v) => s + v, 0) / indices.length);
            sectors[tier] = { index: avg * 2, count: indices.length }; // *2 to normalize to 1000 base
        }
        return sectors;
    }

    /**
     * Full market summary snapshot — used by CMS dashboard.
     */
    static getMarketSnapshot() {
        const composite = MarketManager.getCompositeIndex();
        const sectors = MarketManager.getSectorIndices();
        const state = GameState.state;
        const artists = MarketManager.artists.map(a => ({
            id: a.id, name: a.name, tier: a.tier, medium: a.medium,
            heat: Math.round(a.heat * 10) / 10,
            index: a.artistIndex || MarketManager._computeArtistIndex(a),
            buybackActive: a.buybackActive || false,
            basePriceMin: a.basePriceMin, basePriceMax: a.basePriceMax,
        }));
        const works = MarketManager.works.map(w => ({
            id: w.id, title: w.title, artist: w.artist, artistId: w.artistId,
            medium: w.medium, price: w.price, basePrice: w.basePrice,
            onMarket: w.onMarket, yearCreated: w.yearCreated,
        }));
        return {
            compositeIndex: composite,
            sectors,
            marketCycle: state?.marketState || 'flat',
            week: state?.week || 0,
            artists,
            works,
            totalMarketCap: works.reduce((s, w) => s + (w.price || w.basePrice), 0),
            worksOnMarket: works.filter(w => w.onMarket).length,
        };
    }

    /**
     * Lightweight tick snapshot for the live terminal.
     * Returns flat array of artist data optimized for real-time display.
     * Called every 1-5 seconds by ArtTerminal.jsx.
     *
     * @returns {{ artists: Array, composite: number, cycle: string, week: number, timestamp: number }}
     */
    static getTickSnapshot() {
        return {
            artists: MarketManager.artists.map(a => {
                const works = MarketManager.works.filter(w => w.artistId === a.id);
                const avgPrice = works.length > 0
                    ? Math.round(works.reduce((s, w) => s + (w.price || w.basePrice || 0), 0) / works.length)
                    : 0;
                const avgBase = works.length > 0
                    ? Math.round(works.reduce((s, w) => s + (w.basePrice || 0), 0) / works.length)
                    : 0;
                const delta = avgBase > 0 ? ((avgPrice - avgBase) / avgBase) * 100 : 0;
                return {
                    id: a.id,
                    name: a.name,
                    tier: a.tier,
                    heat: Math.round((a.heat || 0) * 10) / 10,
                    avgPrice,
                    avgBase,
                    delta: Math.round(delta * 10) / 10,
                    index: a.artistIndex || MarketManager._computeArtistIndex(a),
                    worksCount: works.length,
                    onMarket: works.filter(w => w.onMarket).length,
                    buybackActive: a.buybackActive || false,
                };
            }),
            composite: MarketManager.getCompositeIndex(),
            sectors: MarketManager.getSectorIndices(),
            cycle: GameState.state?.marketState || 'flat',
            week: GameState.state?.week || 0,
            timestamp: Date.now(),
        };
    }

    // ═══════════════════════════════════════════════════════
    // Valuation Engine — Per-Artwork & Per-Collector Analysis
    // ═══════════════════════════════════════════════════════

    /**
     * Full appraisal for a single artwork — price breakdown, comparables,
     * trade history, and confidence rating.
     *
     * @param {string} workId
     * @returns {object|null} structured appraisal or null if not found
     */
    static getArtworkAppraisal(workId) {
        const work = MarketManager.works.find(w => w.id === workId)
            || ARTWORKS.find(a => a.id === workId);
        if (!work) return null;

        const artist = MarketManager.getArtist(work.artistId);
        const currentPrice = MarketManager.calculatePrice(work);
        const hedonicScore = MarketManager._hedonicScore(work);
        const eventModifier = MarketEventBus.getPriceModifier(work.artistId, artist?.tier);
        const eventHeatMod = MarketEventBus.getHeatModifier(work.artistId);

        // Last trade price from simulation trade log
        let lastTradePrice = null;
        let lastTradeWeek = null;
        try {
            const log = MarketSimulator.getTradeLog();
            const match = [...log].reverse().find(t => t.artworkId === workId);
            if (match) {
                lastTradePrice = match.price;
                lastTradeWeek = match.week;
            }
        } catch { /* trade log may not exist yet */ }

        // Comparables — same tier, similar price range
        const tier = work.tier || artist?.tier || 'mid_career';
        const comparables = MarketManager.works
            .filter(w => w.id !== workId && (w.tier === tier || MarketManager.getArtist(w.artistId)?.tier === tier))
            .map(w => ({
                id: w.id,
                title: w.title,
                artist: w.artist,
                price: MarketManager.calculatePrice(w),
                basePrice: w.basePrice,
            }))
            .sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice))
            .slice(0, 5);

        // Confidence rating based on data availability
        let confidence = 'medium';
        const dataPoints = [
            !!work.provenanceChain?.length,
            !!work.exhibitions?.length,
            !!work.literature?.length,
            !!lastTradePrice,
            !!work.valuationHistory?.length,
        ].filter(Boolean).length;
        if (dataPoints >= 4) confidence = 'high';
        else if (dataPoints <= 1) confidence = 'low';

        // Price breakdown object
        const state = GameState.state;
        const heatMultiplier = artist ? 0.5 + Math.pow(artist.heat / 32, 2) : 1.0;
        const marketMultiplier = state?.marketState === 'bull' ? 1.2 : state?.marketState === 'bear' ? 0.8 : 1.0;

        return {
            workId: work.id,
            title: work.title,
            artist: work.artist,
            artistId: work.artistId,
            tier,
            medium: work.medium,
            year: work.year,
            ownerId: work.ownerId,

            // Pricing
            basePrice: work.basePrice || work.askingPrice,
            currentPrice,
            priceBreakdown: {
                base: work.basePrice || work.askingPrice,
                heatMultiplier: Math.round(heatMultiplier * 100) / 100,
                marketMultiplier,
                hedonicScore: Math.round(hedonicScore * 100) / 100,
                eventModifier: Math.round(eventModifier * 100) / 100,
                eventHeatMod: Math.round(eventHeatMod * 10) / 10,
            },

            // Market state
            artistIndex: artist?.artistIndex || 500,
            artistHeat: artist?.heat || 0,
            marketCycle: state?.marketState || 'flat',

            // Trade history
            lastTradePrice,
            lastTradeWeek,
            valuationHistory: work.valuationHistory || [],

            // Comparables
            comparables,

            // Provenance
            provenance: work.provenance,
            provenanceChain: work.provenanceChain || [],
            exhibitions: work.exhibitions || [],
            literature: work.literature || [],

            // Meta
            confidence,
            timestamp: Date.now(),
        };
    }

    /**
     * Portfolio analysis for any owner (NPC or player).
     * Returns NAV, cost basis, P&L, and per-work breakdown.
     *
     * @param {string} ownerId — NPC contact ID or 'player'
     * @returns {object} portfolio summary
     */
    static getCollectorPortfolio(ownerId) {
        // Find all works owned by this entity
        const ownedWorks = MarketManager.works
            .filter(w => w.ownerId === ownerId)
            .concat(ARTWORKS.filter(a => a.ownerId === ownerId && !MarketManager.works.find(w => w.id === a.id)));

        // Per-work analysis
        const holdings = ownedWorks.map(w => {
            const currentValue = MarketManager.calculatePrice(w);
            const costBasis = w.purchasePrice || w.basePrice || w.askingPrice || currentValue;
            const unrealizedPL = currentValue - costBasis;
            const plPercent = costBasis > 0 ? ((unrealizedPL / costBasis) * 100) : 0;
            const artist = MarketManager.getArtist(w.artistId);

            return {
                id: w.id,
                title: w.title,
                artist: w.artist,
                artistId: w.artistId,
                tier: w.tier || artist?.tier || 'unknown',
                medium: w.medium,
                year: w.year,
                costBasis,
                currentValue,
                unrealizedPL,
                plPercent: Math.round(plPercent * 10) / 10,
                artistHeat: artist?.heat || 0,
                artistIndex: artist?.artistIndex || 500,
            };
        });

        // Aggregate totals
        const totalNAV = holdings.reduce((s, h) => s + h.currentValue, 0);
        const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0);
        const totalPL = totalNAV - totalCost;
        const totalPLPercent = totalCost > 0 ? ((totalPL / totalCost) * 100) : 0;

        // Concentration analysis
        const tierConcentration = {};
        const artistConcentration = {};
        for (const h of holdings) {
            tierConcentration[h.tier] = (tierConcentration[h.tier] || 0) + h.currentValue;
            artistConcentration[h.artist] = (artistConcentration[h.artist] || 0) + h.currentValue;
        }
        // Convert to percentages
        for (const key of Object.keys(tierConcentration)) {
            tierConcentration[key] = totalNAV > 0 ? Math.round((tierConcentration[key] / totalNAV) * 1000) / 10 : 0;
        }
        for (const key of Object.keys(artistConcentration)) {
            artistConcentration[key] = totalNAV > 0 ? Math.round((artistConcentration[key] / totalNAV) * 1000) / 10 : 0;
        }

        // Trade history for this owner
        let tradeHistory = [];
        try {
            const log = MarketSimulator.getTradeLog();
            tradeHistory = log.filter(t => t.buyer === ownerId || t.seller === ownerId)
                .map(t => ({
                    side: t.buyer === ownerId ? 'buy' : 'sell',
                    artworkId: t.artworkId,
                    title: t.title || t.artworkId,
                    price: t.price,
                    week: t.week,
                    counterparty: t.buyer === ownerId ? t.seller : t.buyer,
                }));
        } catch { /* non-critical */ }

        return {
            ownerId,
            holdingCount: holdings.length,
            totalNAV,
            totalCost,
            totalPL,
            totalPLPercent: Math.round(totalPLPercent * 10) / 10,
            holdings,
            tierConcentration,
            artistConcentration,
            tradeHistory,
            timestamp: Date.now(),
        };
    }
}
