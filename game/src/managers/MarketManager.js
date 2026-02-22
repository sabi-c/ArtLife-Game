import { ARTISTS } from '../data/artists.js';
import { GameState } from './GameState.js';
import { shuffle } from '../utils/shuffle.js';
import { generateId } from '../utils/id.js';

/**
 * Market simulation engine
 * Manages artist heat, price calculations, and available works
 */
export class MarketManager {
    static realWorldData = null;
    static artists = [];
    static works = [];

    static init(works) {
        // Deep copy artists so we can mutate heat
        MarketManager.artists = ARTISTS.map((a) => ({ ...a }));
        MarketManager.works = works;

        // Asynchronously load the real-world scraped data backend
        fetch('content/real_world_data.json')
            .then(res => res.json())
            .then(data => { MarketManager.realWorldData = data; })
            .catch(err => console.warn('No real_world_data.json found, skipping stochastic anchor data.', err));
    }

    static tick() {
        const state = GameState.state;
        if (!state) return; // Guard: no game in progress
        if (MarketManager.artists.length === 0) MarketManager.init([]); // Guard: artists not loaded yet

        // Update each artist's heat
        MarketManager.artists.forEach((artist) => {
            const volatility = artist.heatVolatility;
            const change = (Math.random() - 0.45) * volatility * 2; // slight positive bias
            artist.heat = Math.max(0, Math.min(100, artist.heat + change));

            // Market state influence
            if (state.marketState === 'bull') {
                artist.heat = Math.min(100, artist.heat + 0.5);
            } else if (state.marketState === 'bear') {
                artist.heat = Math.max(0, artist.heat - 0.8);
            }

            // ─── Gallery Buyback Simulation ───
            // When artist heat drops below 20, there's a chance the gallery "protects" the market
            // by buying back works at auction — artificially stabilizing prices
            if (artist.heat < 20 && !artist.buybackActive) {
                if (Math.random() < 0.3) {
                    artist.buybackActive = true;
                    artist.buybackFloor = artist.heat; // remember where the floor was set
                }
            }
            // If buyback is active, heat can't drop below the floor
            if (artist.buybackActive) {
                artist.heat = Math.max(artist.buybackFloor, artist.heat);
                // 10% chance per turn the gallery stops the buyback — then crash
                if (Math.random() < 0.10) {
                    artist.buybackActive = false;
                    artist.heat = Math.max(0, artist.heat - 15); // crash when support removed
                    GameState.addNews(`📉 ${artist.name}'s market support collapsed. Prices cratering.`);
                }
            }
        });

        // Update work prices
        MarketManager.works.forEach((work) => {
            work.price = MarketManager.calculatePrice(work, true);
        });

        // Occasionally add new works to market
        if (Math.random() < 0.15) {
            MarketManager.addNewWorkToMarket();
        }

        // NOTE: marketHeat and suspicion decay moved to WeekEngine._decayAntiResources()
        // MarketManager should only manage the market, not GameState anti-resources.
    }

    static calculatePrice(work, includeJitter = false) {
        const artist = MarketManager.getArtist(work.artistId);
        if (!artist) return work.basePrice;

        const heatMultiplier = 0.5 + Math.pow(artist.heat / 32, 2);
        const state = GameState.state;
        const marketMultiplier = state.marketState === 'bull' ? 1.2 : state.marketState === 'bear' ? 0.8 : 1.0;
        const eraModifier = state?.eraModifier || 1.0;
        const flipperPenalty = state?.dealerBlacklisted ? 1.20 : 1.0;

        // Fundamental Base Value based on generic gameplay vectors
        let targetPrice = work.basePrice * heatMultiplier * marketMultiplier * eraModifier * flipperPenalty;

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

                // Calculate Required Annual CAGR Drift to hit target
                const annualDrift = Math.pow(end.price / start.price, 1 / years) - 1;
                // Convert to weekly compounding drift rate
                const weeklyDrift = annualDrift / 52;

                const weeksElapsed = state?.week || 1;
                const driftMultiplier = Math.pow(1 + weeklyDrift, weeksElapsed);

                // Inflate the fundamental value mathematically using the scraper data
                targetPrice = targetPrice * driftMultiplier;
            }
        }

        if (includeJitter) {
            // ── Ornstein-Uhlenbeck Process (Mean-Reverting Random Walk) ──
            // Allows the stock to jitter randomly, but magnetically pulls it toward the target fundamental value.
            const prevPrice = work.price || targetPrice;
            const theta = 0.2; // Speed of mean reversion (20% correction towards fundamental value per week)

            // Box-Muller transform for standard normal random variable Z
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
     * Returns true if the artist has active buyback support.
     * High Intel (60+) should reveal this to the player.
     */
    static detectArtificialFloor(artistId) {
        const artist = MarketManager.getArtist(artistId);
        return artist ? (artist.buybackActive || false) : false;
    }
}
