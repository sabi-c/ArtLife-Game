/**
 * cities.js
 * City Data — unique venues, flavour per city
 */
export const CITY_DATA = {
    'new-york': {
        name: 'New York',
        vibe: 'The epicenter. Money moves fast, reputations faster.',
        venues: ['Chelsea Galleries', 'Sotheby\'s NY', 'MoMA PS1', 'The Armory Show'],
        specialty: 'Contemporary & blue-chip secondary market',
        marketBonus: 1.0,
    },
    'london': {
        name: 'London',
        vibe: 'Old money meets YBA energy. Discreet, ruthless.',
        venues: ['Mayfair Dealers', 'Christie\'s London', 'White Cube', 'Frieze London'],
        specialty: 'British contemporary & Old Masters',
        marketBonus: 0.95,
    },
    'paris': {
        name: 'Paris',
        vibe: 'Taste is currency here. The wrong opinion can end you.',
        venues: ['Rive Gauche Galleries', 'Drouot Auction', 'Centre Pompidou', 'Paris+ par Art Basel'],
        specialty: 'Post-war European & photography',
        marketBonus: 0.9,
    },
    'hong-kong': {
        name: 'Hong Kong',
        vibe: 'The gateway to Asia. New collectors with deep pockets.',
        venues: ['Art Basel HK', 'Private Showrooms', 'H Queen\'s', 'Tai Kwun'],
        specialty: 'Asian contemporary & luxury crossover',
        marketBonus: 1.1,
    },
    'switzerland': {
        name: 'Switzerland',
        vibe: 'Freeports and alpine discretion. Where art goes to hide.',
        venues: ['Art Basel', 'Geneva Freeport', 'Hauser & Wirth', 'Fondation Beyeler'],
        specialty: 'Museum-grade & tax-efficient storage',
        marketBonus: 1.05,
    },
    'los-angeles': {
        name: 'Los Angeles',
        vibe: 'Celebrity collectors, tech money, and desert light.',
        venues: ['The Broad', 'Gagosian LA', 'Frieze LA', 'LACMA'],
        specialty: 'Emerging artists & entertainment crossover',
        marketBonus: 0.85,
    },
    'miami': {
        name: 'Miami',
        vibe: 'Art Basel Miami Beach is the scene. Then it\'s pool parties.',
        venues: ['Art Basel Miami', 'Design District', 'Pérez Art Museum', 'NADA'],
        specialty: 'Latin American art & emerging talent',
        marketBonus: 0.9,
    },
    'berlin': {
        name: 'Berlin',
        vibe: 'Cheap studios, radical ideas, and gallery weekends.',
        venues: ['KW Institute', 'Gallery Weekend Berlin', 'Hamburger Bahnhof', 'abc Berlin'],
        specialty: 'Conceptual & political art, low prices',
        marketBonus: 0.75,
    }
};
