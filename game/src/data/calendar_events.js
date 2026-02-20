/**
 * Art world calendar — seasonal events mapped to in-game weeks.
 * The art world runs on a predictable annual rhythm.
 */

export const CALENDAR_EVENTS = [
    // ── JANUARY ──
    {
        id: 'new_year_sales',
        name: 'New Year Sales',
        month: 0,
        weekInMonth: 1,
        duration: 2,
        type: 'market',
        tier: 2,
        location: 'New York',
        description: 'Post-holiday deals. Galleries clearing inventory.',
        cost: 0,
        dealOpportunity: 'Discounted works from galleries needing to close their year-end books.',
        npcPresence: ['sasha_klein', 'marcus_price'],
    },

    // ── FEBRUARY ──
    {
        id: 'la_art_show',
        name: 'LA Art Show',
        month: 1,
        weekInMonth: 2,
        duration: 1,
        type: 'fair',
        tier: 2,
        location: 'Los Angeles',
        description: 'The West Coast\'s biggest contemporary art fair.',
        cost: 3000,
        dealOpportunity: 'Emerging LA artists at accessible prices.',
        npcPresence: ['elena_ross', 'nico_strand'],
    },
    {
        id: 'arco_madrid',
        name: 'ARCO Madrid',
        month: 1,
        weekInMonth: 3,
        duration: 1,
        type: 'fair',
        tier: 2,
        location: 'Madrid',
        description: 'Spain\'s international contemporary art fair. Gateway to Latin American markets.',
        cost: 4000,
        dealOpportunity: 'Latin American and Spanish artists below global market rates.',
        npcPresence: ['elena_ross'],
    },

    // ── MARCH ──
    {
        id: 'tefaf_maastricht',
        name: 'TEFAF Maastricht',
        month: 2,
        weekInMonth: 1,
        duration: 1,
        type: 'fair',
        tier: 1,
        location: 'Maastricht',
        description: 'The world\'s finest art and antiques fair. Old masters, serious connoisseurs, and museum-quality works. Every piece is vetted by a committee.',
        cost: 8000,
        dealOpportunity: 'Museum-quality old masters and historical works with impeccable provenance.',
        npcPresence: ['james_whitfield', 'philippe_noir', 'dr_eloise_park'],
    },
    {
        id: 'armory_show',
        name: 'The Armory Show',
        month: 2,
        weekInMonth: 2,
        duration: 1,
        type: 'fair',
        tier: 1,
        location: 'New York',
        description: 'NYC\'s premier international art fair. Javits Center.',
        cost: 2000,
        dealOpportunity: 'Mid-career artists on the rise. Good for portfolio diversification.',
        npcPresence: ['elena_ross', 'diana_chen', 'nina_ward'],
    },
    {
        id: 'art_dubai',
        name: 'Art Dubai',
        month: 2,
        weekInMonth: 3,
        duration: 1,
        type: 'fair',
        tier: 1,
        location: 'Dubai',
        description: 'The Middle East\'s leading art fair. Big money, big ambitions.',
        cost: 12000,
        dealOpportunity: 'Access to Gulf collectors and Middle Eastern/South Asian artists.',
        npcPresence: ['lorenzo_gallo', 'charles_vandermeer', 'margaux_fontaine'],
    },

    // ── APRIL ──
    {
        id: 'spring_auctions',
        name: 'Spring Auction Week',
        month: 3,
        weekInMonth: 2,
        duration: 1,
        type: 'auction',
        tier: 1,
        location: 'New York',
        description: 'Christie\'s and Sotheby\'s spring marquee sales.',
        cost: 0,
        dealOpportunity: 'Major auction lots. Shill bidding risk is highest here.',
        npcPresence: ['diana_chen', 'robert_hall', 'charles_vandermeer'],
    },

    // ── MAY ──
    {
        id: 'venice_biennale',
        name: 'Venice Biennale',
        month: 4,
        weekInMonth: 1,
        duration: 2,
        type: 'biennale',
        tier: 1,
        location: 'Venice',
        description: 'The most prestigious exhibition in art. National pavilions, the Arsenale, parties on yachts.',
        cost: 12000,
        dealOpportunity: 'Artists shown in Venice become blue-chip overnight. Spot them early.',
        npcPresence: ['lorenzo_gallo', 'philippe_noir', 'dr_eloise_park', 'charles_vandermeer'],
        biennial: true,
    },
    {
        id: 'frieze_new_york',
        name: 'Frieze New York',
        month: 4,
        weekInMonth: 3,
        duration: 1,
        type: 'fair',
        tier: 1,
        location: 'New York',
        description: 'Frieze\'s New York edition at The Shed. Contemporary focus with cross-disciplinary programming.',
        cost: 3000,
        dealOpportunity: 'Emerging and mid-career contemporary artists. Discovery-oriented.',
        npcPresence: ['elena_ross', 'yuki_tanaka', 'nina_ward', 'nico_strand'],
    },

    // ── JUNE ──
    {
        id: 'art_basel',
        name: 'Art Basel',
        month: 5,
        weekInMonth: 2,
        duration: 1,
        type: 'fair',
        tier: 1,
        location: 'Basel',
        description: 'The world\'s premier art fair. 280 galleries. $3 billion in art. If you\'re not here, you don\'t exist.',
        cost: 15000,
        dealOpportunity: 'Everything — blue-chip, emerging, secondary market. The most important deals of the year.',
        npcPresence: ['lorenzo_gallo', 'sasha_klein', 'james_whitfield', 'charles_vandermeer', 'victoria_sterling', 'margaux_fontaine'],
    },
    {
        id: 'hamptons_summer',
        name: 'Hamptons Season Opens',
        month: 5,
        weekInMonth: 4,
        duration: 8,
        type: 'social',
        tier: 2,
        location: 'Hamptons',
        description: 'Beach houses, poolside negotiations, studio visits.',
        cost: 0,
        dealOpportunity: 'Private sales happen over dinner. Relationships matter more than money here.',
        npcPresence: ['victoria_sterling', 'philippe_noir'],
    },

    // ── JULY ──
    {
        id: 'summer_group_shows',
        name: 'Summer Group Shows',
        month: 6,
        weekInMonth: 1,
        duration: 4,
        type: 'exhibition',
        tier: 2,
        location: 'Various',
        description: 'Quieter gallery season. Good for discovering new talent.',
        cost: 0,
        dealOpportunity: 'Emerging artists at lower prices. Less competition.',
        npcPresence: ['kwame_asante', 'yuki_tanaka'],
    },

    // ── AUGUST ──
    {
        id: 'st_barts_season',
        name: 'St. Barts Season',
        month: 7,
        weekInMonth: 1,
        duration: 3,
        type: 'social',
        tier: 2,
        location: 'St. Barts',
        description: 'Beach clubs, mega-yachts, and sunset deal-making.',
        cost: 15000,
        dealOpportunity: 'Mega-collector private sales. Trophy works change hands.',
        npcPresence: ['philippe_noir', 'lorenzo_gallo', 'victoria_sterling'],
    },

    // ── SEPTEMBER ──
    {
        id: 'gallery_season_opens',
        name: 'Gallery Season Opens',
        month: 8,
        weekInMonth: 2,
        duration: 3,
        type: 'market',
        tier: 1,
        location: 'New York',
        description: 'Chelsea galleries unveil their fall programs. The art world wakes up.',
        cost: 0,
        dealOpportunity: 'New works at primary market prices. Waiting list access for loyal collectors.',
        npcPresence: ['elena_ross', 'james_whitfield', 'sasha_klein'],
    },
    {
        id: 'sao_paulo_bienal',
        name: 'São Paulo Biennial',
        month: 8,
        weekInMonth: 3,
        duration: 3,
        type: 'biennale',
        tier: 2,
        location: 'São Paulo',
        description: 'The second-oldest biennale in the world. Latin America\'s most important contemporary art exhibition.',
        cost: 6000,
        dealOpportunity: 'Latin American artists before they break into global markets.',
        npcPresence: ['elena_ross'],
        biennial: true,
    },

    // ── OCTOBER ──
    {
        id: 'frieze_london',
        name: 'Frieze London',
        month: 9,
        weekInMonth: 2,
        duration: 1,
        type: 'fair',
        tier: 1,
        location: 'London',
        description: 'Regent\'s Park. The best of European contemporary art. Plus Frieze Masters for historical works.',
        cost: 6000,
        dealOpportunity: 'Strong UK and European contemporary. Frieze Masters for blue-chip historical.',
        npcPresence: ['james_whitfield', 'nina_ward', 'charles_vandermeer'],
    },
    {
        id: 'fiac_paris',
        name: 'Paris+ par Art Basel',
        month: 9,
        weekInMonth: 3,
        duration: 1,
        type: 'fair',
        tier: 1,
        location: 'Paris',
        description: 'At the Grand Palais. French elegance meets global art market.',
        cost: 6000,
        dealOpportunity: 'European blue-chip and modern masters. Pinault and Arnault territory.',
        npcPresence: ['lorenzo_gallo', 'margaux_fontaine', 'philippe_noir'],
    },

    // ── NOVEMBER ──
    {
        id: 'fall_auctions',
        name: 'Fall Auction Week',
        month: 10,
        weekInMonth: 2,
        duration: 1,
        type: 'auction',
        tier: 1,
        location: 'New York',
        description: 'The biggest sales of the year. Records will be broken. Paddle up.',
        cost: 0,
        dealOpportunity: 'Trophy lots, guarantees, and shill bidding. The most expensive week in art.',
        npcPresence: ['diana_chen', 'robert_hall', 'lorenzo_gallo', 'charles_vandermeer'],
    },
    {
        id: 'paris_photo',
        name: 'Paris Photo',
        month: 10,
        weekInMonth: 3,
        duration: 1,
        type: 'fair',
        tier: 2,
        location: 'Paris',
        description: 'The world\'s premier photography fair. At the Grand Palais.',
        cost: 4000,
        dealOpportunity: 'Photography market is undervalued relative to painting. Opportunity area.',
        npcPresence: ['nina_ward'],
    },

    // ── DECEMBER ──
    {
        id: 'art_basel_miami',
        name: 'Art Basel Miami Beach',
        month: 11,
        weekInMonth: 1,
        duration: 1,
        type: 'fair',
        tier: 1,
        location: 'Miami',
        description: 'Sun, parties, and billions in art. The year\'s grand finale. Where the banana was taped to the wall.',
        cost: 20000,
        dealOpportunity: 'Everything — plus satellite fairs (NADA, Untitled, Scope) for emerging art.',
        npcPresence: ['lorenzo_gallo', 'sasha_klein', 'victoria_sterling', 'nico_strand', 'charles_vandermeer', 'margaux_fontaine'],
    },
    {
        id: 'whitney_biennial',
        name: 'Whitney Biennial',
        month: 11,
        weekInMonth: 2,
        duration: 2,
        type: 'biennale',
        tier: 1,
        location: 'New York',
        description: 'America\'s most important survey of contemporary art. Careers are made here.',
        cost: 0,
        dealOpportunity: 'Artists featured become institutional darlings. Buy before the biennial, profit after.',
        npcPresence: ['dr_eloise_park', 'elena_ross', 'nina_ward'],
        biennial: true,
    },
    {
        id: 'holiday_parties',
        name: 'Holiday Party Season',
        month: 11,
        weekInMonth: 3,
        duration: 2,
        type: 'social',
        tier: 2,
        location: 'New York',
        description: 'End-of-year gatherings. Reflect, network, and plan for next year.',
        cost: 2000,
        dealOpportunity: 'Relationship-building. No hard deals — but the conversations set up January.',
        npcPresence: ['sasha_klein', 'elena_ross', 'philippe_noir'],
    },
];

/**
 * Map a game week to upcoming calendar events
 */
export function getUpcomingEvents(currentWeek, lookAhead = 6) {
    const results = [];

    for (let w = currentWeek; w < currentWeek + lookAhead; w++) {
        const weekInYear = w % 52;
        const month = Math.floor(weekInYear / 4.33);
        const weekInMonth = Math.floor(weekInYear % 4.33) + 1;

        CALENDAR_EVENTS.forEach((event) => {
            if (event.month === month && weekInMonth >= event.weekInMonth &&
                weekInMonth < event.weekInMonth + (event.duration || 1)) {
                // Check biennial
                const year = Math.floor(w / 52);
                if (event.biennial && year % 2 !== 1) return;

                results.push({
                    ...event,
                    gameWeek: w,
                    weeksAway: w - currentWeek,
                });
            }
        });
    }

    // Deduplicate by event id
    const seen = new Set();
    return results.filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
    });
}
