import { ARTISTS } from '../data/artists.js';
import { GameState } from './GameState.js';

/**
 * Market simulation engine
 * Manages artist heat, price calculations, and available works
 */
export class MarketManager {
    static artists = [];
    static works = [];

    static init(works) {
        // Deep copy artists so we can mutate heat
        MarketManager.artists = ARTISTS.map((a) => ({ ...a }));
        MarketManager.works = works;
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
            work.price = MarketManager.calculatePrice(work);
        });

        // Occasionally add new works to market
        if (Math.random() < 0.15) {
            MarketManager.addNewWorkToMarket();
        }

        // Natural marketHeat decay — cools 1 point per turn
        if (state.marketHeat > 0) {
            state.marketHeat = Math.max(0, state.marketHeat - 1);
        }
        // Natural suspicion decay — cools 0.5 per turn
        if (state.suspicion > 0) {
            state.suspicion = Math.max(0, state.suspicion - 0.5);
        }
    }

    static calculatePrice(work) {
        const artist = MarketManager.getArtist(work.artistId);
        if (!artist) return work.basePrice;

        const heatMultiplier =
            artist.heat < 20 ? 0.5 + (artist.heat / 20) * 0.3 :
                artist.heat < 40 ? 0.9 + ((artist.heat - 20) / 20) * 0.3 :
                    artist.heat < 60 ? 1.3 + ((artist.heat - 40) / 20) * 0.5 :
                        artist.heat < 80 ? 2.0 + ((artist.heat - 60) / 20) * 2.0 :
                            5.0 + ((artist.heat - 80) / 20) * 5.0;

        const state = GameState.state;
        const marketMultiplier =
            state.marketState === 'bull' ? 1.2 + Math.random() * 0.3 :
                state.marketState === 'bear' ? 0.6 + Math.random() * 0.2 :
                    1.0;

        // Flipper penalty — known flippers pay 20% more (galleries mark them up)
        const flipperPenalty = state.dealerBlacklisted ? 1.20 : 1.0;

        return Math.round(work.basePrice * heatMultiplier * marketMultiplier * flipperPenalty);
    }

    static getWorkValue(work) {
        return MarketManager.calculatePrice(work);
    }

    static getArtist(artistId) {
        return MarketManager.artists.find((a) => a.id === artistId);
    }

    static getAvailableWorks() {
        // Show 4 works on the market each turn
        const onMarket = MarketManager.works.filter((w) => w.onMarket);
        const shuffled = onMarket.sort(() => Math.random() - 0.5);
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
            id: `work_gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
