/**
 * ArtistProductionEngine.js
 *
 * Simulates active artists producing new works over time.
 * Called weekly by WeekEngine.
 */

import { ARTISTS } from '../data/artists.js';
import { ARTWORKS, ARTWORK_MAP } from '../data/artworks.js';
import { GameState } from './GameState.js';
import { ActivityLogger } from './ActivityLogger.js';

export class ArtistProductionEngine {
    /**
     * Called weekly from WeekEngine.
     * Iterates through artists and occasionally generates a new artwork.
     */
    static tick(week) {
        for (const artist of ARTISTS) {
            // Rough probability: Master/Blue-Chip artists are slow (1-2%), emerging artists are fast (5-10%)
            let produceChance = 0.05; // 5% default chance per week
            switch (artist.tier) {
                case 'blue_chip': produceChance = 0.01; break; // ~1 work every 2 years
                case 'established': produceChance = 0.02; break; // ~1 work per year
                case 'mid_career': produceChance = 0.04; break; // ~2 works per year
                case 'emerging': produceChance = 0.08; break; // ~4 works per year
                case 'unknown': produceChance = 0.12; break; // ~6 works per year
            }

            if (Math.random() < produceChance) {
                this._produceArtwork(artist, week);
            }
        }
    }

    /**
     * Generates a new artwork for the artist and injects it into the market.
     */
    static _produceArtwork(artist, week) {
        // Base title logic — simple patterned naming
        const adjectives = ['Study of', 'Untitled', 'Composition', 'Iteration', 'Movement', 'Fragment', 'Echo', 'Vision'];
        const noun = ['I', 'II', 'III', 'IV', 'Variation', 'Series A', 'Form X', 'Space'];
        const title = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${noun[Math.floor(Math.random() * noun.length)]}`;

        // Generate ID
        const idBase = `${artist.id}_${title.replace(/\s+/g, '_').toLowerCase()}`;
        let finalId = idBase;
        let counter = 1;
        while (ARTWORK_MAP[finalId]) {
            finalId = `${idBase}_${counter++}`;
        }

        const basePrice = Math.floor(artist.basePriceMin + Math.random() * (artist.basePriceMax - artist.basePriceMin));
        const genre = artist.defaultGenre || 'contemporary';
        const medium = artist.defaultMedium || 'Mixed Media';

        // Use current game year based on weeks (assuming Year 1 starts at default year 2026 for now, or just hardcode current timeline)
        // Art market roughly 1 year = 52 weeks.
        const startYear = 2026;
        const year = startYear + Math.floor(week / 52);

        const newWork = {
            id: finalId,
            artistId: artist.id,
            artist: artist.name,
            title: title,
            year: year,
            medium: medium,
            tier: artist.tier,
            genre: genre,
            basePrice: basePrice,
            askingPrice: basePrice,
            ownerId: 'market', // Newly created work hits the primary dealer market
            _source: 'generated',
            generateWeek: week
        };

        // Add to global DB
        ARTWORKS.push(newWork);
        ARTWORK_MAP[newWork.id] = newWork;

        // Log the production
        ActivityLogger.logSystem('artist_production', { artist: artist.name, artworkId: newWork.id, title: newWork.title, price: basePrice, week });

        // Since it's 'market', MarketSimulator needs to be aware or it gets picked up dynamically by `generateOpenOrders`.
        // We will formally inject it into MarketSimulator.pendingSellOrders immediately so it appears on Bloomberg right away.
        import('./MarketSimulator.js').then(mod => {
            const MarketSimulator = mod.MarketSimulator;
            if (!MarketSimulator.pendingSellOrders.some(o => o.artworkId === newWork.id)) {
                MarketSimulator.pendingSellOrders.push({
                    id: `so_primary_${finalId}`,
                    type: 'sell',
                    npcId: 'dealer_primary', // special system ID or primary gallery
                    artworkId: newWork.id,
                    artwork: newWork,
                    title: newWork.title,
                    artist: newWork.artist,
                    npcName: 'Primary Gallery',
                    askPrice: basePrice,
                    urgency: 'normal',
                    weekPosted: week,
                    expiresWeek: week + 8, // Primary market keeps it listed longer
                    inquire: (artist.tier === 'blue_chip' || artist.tier === 'established') // High tier works hide price
                });
            }
        });
    }
}
