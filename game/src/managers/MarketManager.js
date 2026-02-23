import { ARTISTS } from '../data/artists.js';
import { GameState } from './GameState.js';
import { shuffle } from '../utils/shuffle.js';
import { generateId } from '../utils/id.js';
import { useMarketStore } from '../stores/marketStore.js';
import { MarketHistoryEngine } from './MarketHistoryEngine.js';
import { MarketSimulator } from './MarketSimulator.js';

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
            .catch(err => console.warn('No real_world_data.json found, skipping stochastic anchor data.', err));
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
            artist.heat = Math.max(0, Math.min(100, artist.heat + change));

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

        let targetPrice = work.basePrice * heatMultiplier * marketMultiplier * eraModifier * flipperPenalty * hedonicMultiplier;

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
}
