/**
 * historicalPrices.js — Real-World Auction Reference Data
 *
 * Provides historical auction results, market cap estimates, and volatility
 * indices for artists in the game. Used by MarketManager.calculatePrice()
 * via the realWorldData hook to add authentic price drift.
 *
 * Data structure per artist:
 *   auctionHistory[]  — chronological sale records (year, title, price, house)
 *   marketCap         — estimated total market for this artist's work
 *   volatilityIndex   — annual price volatility (0-1)
 *   cagr              — compound annual growth rate
 *   medianLotSize     — median auction lot price
 *   peakYear          — year of highest recorded sale
 *   notableCollectors — famous collectors/institutions associated
 *
 * Sources: public auction records, Wikipedia, ArtNet public data.
 */

export const HISTORICAL_PRICES = {

    // ═══════════════════════════════════════════════════════
    // CLASSIC TIER — Blue-chip artists with deep auction histories
    // ═══════════════════════════════════════════════════════

    basquiat: {
        artistName: 'Jean-Michel Basquiat',
        auctionHistory: [
            { year: 2002, title: 'Profit I', price: 5_509_500, house: "Christie's" },
            { year: 2007, title: 'Untitled (Boxer)', price: 13_500_000, house: "Christie's" },
            { year: 2010, title: 'Untitled (Head)', price: 14_600_000, house: "Christie's" },
            { year: 2013, title: 'Dustheads', price: 48_843_750, house: "Christie's" },
            { year: 2016, title: 'Untitled (1982)', price: 57_285_000, house: "Christie's" },
            { year: 2017, title: 'Untitled (Skull)', price: 110_487_500, house: "Sotheby's" },
            { year: 2021, title: 'In This Case', price: 93_105_000, house: "Christie's" },
            { year: 2023, title: 'El Gran Espectaculo', price: 67_100_000, house: "Sotheby's" },
        ],
        marketCap: 2_400_000_000,
        volatilityIndex: 0.22,
        cagr: 0.15,
        medianLotSize: 2_500_000,
        peakYear: 2017,
        notableCollectors: ['Yusaku Maezawa', 'Eli Broad Foundation', 'The Broad Museum'],
    },

    haring: {
        artistName: 'Keith Haring',
        auctionHistory: [
            { year: 2008, title: 'Untitled (1982)', price: 1_200_000, house: "Sotheby's" },
            { year: 2012, title: 'Untitled (Subway)', price: 880_000, house: "Phillips" },
            { year: 2017, title: 'Untitled (1982 Dancing)', price: 6_537_500, house: "Sotheby's" },
            { year: 2019, title: 'Untitled (Devil)', price: 4_200_000, house: "Christie's" },
            { year: 2023, title: 'Untitled (1984)', price: 4_500_000, house: "Christie's" },
        ],
        marketCap: 800_000_000,
        volatilityIndex: 0.15,
        cagr: 0.10,
        medianLotSize: 350_000,
        peakYear: 2017,
        notableCollectors: ['Rubell Family', 'LACMA', 'Keith Haring Foundation'],
    },

    koons: {
        artistName: 'Jeff Koons',
        auctionHistory: [
            { year: 2001, title: 'Michael Jackson and Bubbles', price: 5_616_750, house: "Sotheby's" },
            { year: 2007, title: 'Hanging Heart (Magenta/Gold)', price: 23_561_000, house: "Sotheby's" },
            { year: 2012, title: 'Tulips', price: 33_682_500, house: "Christie's" },
            { year: 2013, title: 'Balloon Dog (Orange)', price: 58_405_000, house: "Christie's" },
            { year: 2019, title: 'Rabbit', price: 91_075_000, house: "Christie's" },
            { year: 2022, title: 'Balloon Monkey (Magenta)', price: 12_900_000, house: "Christie's" },
        ],
        marketCap: 1_500_000_000,
        volatilityIndex: 0.25,
        cagr: 0.12,
        medianLotSize: 1_200_000,
        peakYear: 2019,
        notableCollectors: ['Steven A. Cohen', 'François Pinault', 'Peter Brant'],
    },

    prince: {
        artistName: 'Richard Prince',
        auctionHistory: [
            { year: 2005, title: 'Untitled (Cowboy)', price: 1_248_000, house: "Christie's" },
            { year: 2007, title: 'Overseas Nurse', price: 8_452_000, house: "Sotheby's" },
            { year: 2014, title: 'Untitled (Cowboy)', price: 3_749_000, house: "Christie's" },
            { year: 2019, title: 'Nurse in Hollywood #4', price: 4_800_000, house: "Christie's" },
        ],
        marketCap: 400_000_000,
        volatilityIndex: 0.20,
        cagr: 0.08,
        medianLotSize: 450_000,
        peakYear: 2007,
        notableCollectors: ['Guggenheim Museum', 'Whitney Museum', 'MoMA'],
    },

    sherman: {
        artistName: 'Cindy Sherman',
        auctionHistory: [
            { year: 2007, title: 'Untitled #153', price: 2_112_000, house: "Phillips" },
            { year: 2011, title: 'Untitled #96', price: 3_890_500, house: "Christie's" },
            { year: 2014, title: 'Untitled Film Still #48', price: 1_300_000, house: "Sotheby's" },
            { year: 2020, title: 'Untitled #224', price: 1_500_000, house: "Christie's" },
        ],
        marketCap: 300_000_000,
        volatilityIndex: 0.12,
        cagr: 0.07,
        medianLotSize: 200_000,
        peakYear: 2011,
        notableCollectors: ['MoMA', 'Broad Art Foundation', 'Tate Modern'],
    },

    richter: {
        artistName: 'Gerhard Richter',
        auctionHistory: [
            { year: 2011, title: 'Abstraktes Bild (809-4)', price: 20_800_000, house: "Sotheby's" },
            { year: 2012, title: 'Abstraktes Bild (798-3)', price: 21_800_000, house: "Sotheby's" },
            { year: 2015, title: 'Abstraktes Bild (599)', price: 46_300_000, house: "Sotheby's" },
            { year: 2020, title: 'Abstraktes Bild (952-4)', price: 6_900_000, house: "Christie's" },
        ],
        marketCap: 2_000_000_000,
        volatilityIndex: 0.18,
        cagr: 0.09,
        medianLotSize: 3_000_000,
        peakYear: 2015,
        notableCollectors: ['Eric Clapton', 'MoMA', 'Tate Modern', 'Nationalgalerie Berlin'],
    },

    fontana: {
        artistName: 'Lucio Fontana',
        auctionHistory: [
            { year: 2008, title: 'Concetto Spaziale, La Fine di Dio', price: 11_600_000, house: "Christie's" },
            { year: 2015, title: 'Concetto Spaziale, Attese', price: 24_700_000, house: "Sotheby's" },
            { year: 2019, title: 'Concetto Spaziale (Red)', price: 8_200_000, house: "Christie's" },
        ],
        marketCap: 800_000_000,
        volatilityIndex: 0.16,
        cagr: 0.08,
        medianLotSize: 1_500_000,
        peakYear: 2015,
        notableCollectors: ['Fondazione Fontana', 'Tate', 'MoMA'],
    },

    soulages: {
        artistName: 'Pierre Soulages',
        auctionHistory: [
            { year: 2013, title: 'Peinture 186 x 143 cm', price: 5_100_000, house: "Christie's" },
            { year: 2018, title: 'Peinture 162 x 130 cm', price: 9_600_000, house: "Christie's" },
            { year: 2019, title: 'Peinture 200 x 162 cm', price: 10_600_000, house: "Sotheby's" },
            { year: 2022, title: 'Peinture 195 x 130 cm', price: 20_200_000, house: "Sotheby's" },
        ],
        marketCap: 600_000_000,
        volatilityIndex: 0.14,
        cagr: 0.11,
        medianLotSize: 800_000,
        peakYear: 2022,
        notableCollectors: ['Centre Pompidou', 'Musée Soulages, Rodez', 'Hermitage Museum'],
    },

    // ═══════════════════════════════════════════════════════
    // MID-CAREER TIER — Emerging/established with some auction history
    // ═══════════════════════════════════════════════════════

    boafo: {
        artistName: 'Amoako Boafo',
        auctionHistory: [
            { year: 2020, title: 'Baba Diop', price: 881_000, house: "Phillips" },
            { year: 2021, title: 'Red Scarf', price: 3_400_000, house: "Christie's" },
            { year: 2022, title: 'The Lemon Bathing Suit', price: 1_600_000, house: "Phillips" },
            { year: 2023, title: 'Green Beret', price: 1_100_000, house: "Sotheby's" },
        ],
        marketCap: 50_000_000,
        volatilityIndex: 0.35,
        cagr: 0.20,
        medianLotSize: 200_000,
        peakYear: 2021,
        notableCollectors: ['Roberts Projects', 'ICA Miami'],
    },

    fadojutimi: {
        artistName: 'Jadé Fadojutimi',
        auctionHistory: [
            { year: 2021, title: 'My Bed, I Wanted More', price: 1_100_000, house: "Sotheby's" },
            { year: 2022, title: 'Myths of Pleasure', price: 890_000, house: "Christie's" },
            { year: 2023, title: 'The Clearing', price: 680_000, house: "Phillips" },
        ],
        marketCap: 20_000_000,
        volatilityIndex: 0.40,
        cagr: -0.05,  // Correcting after initial hype
        medianLotSize: 150_000,
        peakYear: 2021,
        notableCollectors: ['Tate Britain', 'Fondation Louis Vuitton'],
    },

    liu_wei: {
        artistName: 'Liu Wei',
        auctionHistory: [
            { year: 2013, title: 'Purple Air 2', price: 1_300_000, house: "Sotheby's HK" },
            { year: 2018, title: 'Scenery', price: 900_000, house: "Christie's HK" },
            { year: 2021, title: 'Invisible Urban No. 4', price: 1_800_000, house: "Phillips" },
        ],
        marketCap: 40_000_000,
        volatilityIndex: 0.20,
        cagr: 0.06,
        medianLotSize: 300_000,
        peakYear: 2021,
        notableCollectors: ['M+ Museum Hong Kong', 'Pace Gallery'],
    },

    // ═══════════════════════════════════════════════════════
    // SIMULATION ARTISTS — Fictional, use generated trajectories
    // ═══════════════════════════════════════════════════════

    // Mapped by artistId from artists.js
    artist_01: { // Marcus Chen
        artistName: 'Marcus Chen',
        auctionHistory: [
            { year: 2022, title: 'Landscape Study #12', price: 8_500, house: 'Ross Gallery' },
            { year: 2023, title: 'Horizon (Blue)', price: 12_000, house: 'Group show' },
            { year: 2024, title: 'After the Storm #4', price: 18_000, house: 'Phillips Day Sale' },
        ],
        marketCap: 200_000,
        volatilityIndex: 0.30,
        cagr: 0.25,
        medianLotSize: 12_000,
        peakYear: 2024,
        notableCollectors: [],
    },

    artist_02: { // Adaeze Okafor
        artistName: 'Adaeze Okafor',
        auctionHistory: [
            { year: 2020, title: 'Woven Memory #1', price: 45_000, house: 'Private sale' },
            { year: 2021, title: 'Between Worlds', price: 180_000, house: "Sotheby's" },
            { year: 2022, title: 'Convergence (Red)', price: 350_000, house: "Christie's" },
            { year: 2023, title: 'Assemblage (Lagos)', price: 620_000, house: 'Frieze London' },
            { year: 2024, title: 'Reclamation', price: 780_000, house: "Phillips" },
        ],
        marketCap: 8_000_000,
        volatilityIndex: 0.28,
        cagr: 0.55,
        medianLotSize: 300_000,
        peakYear: 2024,
        notableCollectors: ['Tate Modern (pending acquisition)'],
    },

    artist_03: { // Elena Voss
        artistName: 'Elena Voss',
        auctionHistory: [
            { year: 2018, title: 'Aftermath #7', price: 28_000, house: 'Private sale' },
            { year: 2020, title: 'The Empty Room', price: 42_000, house: "Sotheby's" },
            { year: 2022, title: 'Traces (Berlin)', price: 55_000, house: "Christie's" },
            { year: 2024, title: 'Series of Rooms #14', price: 75_000, house: "Phillips" },
        ],
        marketCap: 2_000_000,
        volatilityIndex: 0.12,
        cagr: 0.08,
        medianLotSize: 40_000,
        peakYear: 2024,
        notableCollectors: ['Berlinische Galerie', 'Hamburger Bahnhof'],
    },

    artist_04: { // Jean-Pierre Duval
        artistName: 'Jean-Pierre Duval',
        auctionHistory: [
            { year: 2010, title: 'Standing Form (Bronze)', price: 1_200_000, house: "Sotheby's" },
            { year: 2014, title: 'Equilibrium', price: 2_800_000, house: "Christie's" },
            { year: 2017, title: 'Column (Monumental)', price: 4_500_000, house: "Christie's" },
            { year: 2020, title: 'Weight of History', price: 5_200_000, house: "Sotheby's" },
            { year: 2023, title: 'Torso III', price: 7_100_000, house: "Christie's" },
        ],
        marketCap: 120_000_000,
        volatilityIndex: 0.08,
        cagr: 0.10,
        medianLotSize: 3_500_000,
        peakYear: 2023,
        notableCollectors: ['Centre Pompidou', 'Fondation Cartier', 'MUDAM Luxembourg'],
    },

    artist_05: { // Yuki Tanaka
        artistName: 'Yuki Tanaka',
        auctionHistory: [
            { year: 2023, title: 'Noise Garden (Installation)', price: 5_000, house: 'Gallery sale' },
            { year: 2024, title: 'DataStream #2', price: 8_000, house: 'Art Basel Parcours' },
        ],
        marketCap: 80_000,
        volatilityIndex: 0.45,
        cagr: 0.30,
        medianLotSize: 6_000,
        peakYear: 2024,
        notableCollectors: [],
    },

    artist_06: { // Roberto Salazar
        artistName: 'Roberto Salazar',
        auctionHistory: [
            { year: 2021, title: 'Figure Study (Red)', price: 85_000, house: 'Gallery private sale' },
            { year: 2022, title: 'Interior With Light', price: 180_000, house: "Phillips" },
            { year: 2023, title: 'Blue Period #3', price: 380_000, house: "Christie's" },
            { year: 2024, title: 'Self Portrait (2024)', price: 520_000, house: "Sotheby's" },
        ],
        marketCap: 15_000_000,
        volatilityIndex: 0.24,
        cagr: 0.40,
        medianLotSize: 200_000,
        peakYear: 2024,
        notableCollectors: ['Museo Jumex', 'Kurimanzutto Gallery'],
    },

    artist_07: { // Freya Lindqvist
        artistName: 'Freya Lindqvist',
        auctionHistory: [
            { year: 2019, title: 'Chamber of Light (Maquette)', price: 65_000, house: 'Gallery sale' },
            { year: 2021, title: 'Threshold (Documentation)', price: 120_000, house: "Sotheby's" },
            { year: 2023, title: 'Wavelength', price: 180_000, house: "Phillips" },
        ],
        marketCap: 5_000_000,
        volatilityIndex: 0.15,
        cagr: 0.12,
        medianLotSize: 100_000,
        peakYear: 2023,
        notableCollectors: ['Moderna Museet Stockholm', 'Biennale di Venezia'],
    },

    artist_08: { // Kwame Asante
        artistName: 'Kwame Asante',
        auctionHistory: [
            { year: 2022, title: 'Portrait (Red Dust)', price: 18_000, house: 'Gallery sale' },
            { year: 2023, title: 'Threshold (Study)', price: 28_000, house: 'Frieze London booth' },
            { year: 2024, title: 'Homecoming #1', price: 42_000, house: "Phillips Day Sale" },
        ],
        marketCap: 500_000,
        volatilityIndex: 0.30,
        cagr: 0.28,
        medianLotSize: 25_000,
        peakYear: 2024,
        notableCollectors: ['Stevenson Gallery', 'Studio Museum Harlem (wish list)'],
    },
};

/**
 * Lookup helper — resolves by artistId, artist name slug, or direct key.
 * @param {string} key — artist_01, 'basquiat', 'Jean-Michel Basquiat', etc.
 * @returns {object|null} historical price data
 */
export function getHistoricalData(key) {
    if (!key) return null;

    // Direct match
    if (HISTORICAL_PRICES[key]) return HISTORICAL_PRICES[key];

    // Try lowercase slug
    const slug = key.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    if (HISTORICAL_PRICES[slug]) return HISTORICAL_PRICES[slug];

    // Try matching by artistName
    for (const [k, v] of Object.entries(HISTORICAL_PRICES)) {
        if (v.artistName === key) return v;
        if (v.artistName.toLowerCase().includes(key.toLowerCase())) return v;
    }

    return null;
}
