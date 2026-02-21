/**
 * world_locations.js — Phase 41: City Hub World Data
 *
 * Defines all buildings, landmarks, taxi stops, and warp points
 * for the outdoor CityScene overworld.
 *
 * Each location has:
 *   id          — unique key
 *   name        — display name
 *   type        — 'building' | 'taxi' | 'landmark' | 'transit'
 *   city        — which city this location belongs to
 *   spawnX/Y    — tile coordinates where player appears outside
 *   doorX/Y     — tile coordinates of the warp zone / entry point
 *   venueId     — links to rooms.js VENUE_MAP for indoor scenes (if building)
 *   startRoom   — which room to load inside LocationScene
 *   travelTime  — game-hours consumed by walking here (0 = adjacent)
 *   cost        — $ cost to enter / use (0 = free)
 *   icon        — emoji for UI
 *   desc        — flavour text
 *   requires    — QualityGate requirements (null = always available)
 *   tags        — search/filter tags
 */

// ─────────────────────────────────────────
// NEW YORK CITY — The Main Hub
// ─────────────────────────────────────────
export const WORLD_LOCATIONS = [
    // ── Player's Apartment ──
    {
        id: 'player_apartment',
        name: 'Your Apartment',
        type: 'building',
        city: 'new-york',
        spawnX: 5,
        spawnY: 14,
        doorX: 5,
        doorY: 13,
        venueId: null,       // Special — handled as save/hub screen
        startRoom: null,
        travelTime: 0,
        cost: 0,
        icon: '🏠',
        desc: 'A walk-up in the West Village. Not much, but it\'s home.',
        requires: null,
        tags: ['home', 'save', 'hub'],
    },

    // ── Chelsea Gallery District ──
    {
        id: 'chelsea_gallery',
        name: 'Chelsea Gallery',
        type: 'building',
        city: 'new-york',
        spawnX: 12,
        spawnY: 8,
        doorX: 12,
        doorY: 7,
        venueId: 'gallery_opening',
        startRoom: 'chelsea_main_floor',
        travelTime: 1,
        cost: 0,
        icon: '🖼️',
        desc: 'A converted warehouse on West 24th. Tonight there\'s an opening.',
        requires: null,
        tags: ['gallery', 'social', 'art'],
    },

    // ── Auction House ──
    {
        id: 'auction_house',
        name: 'Sotheby\'s NY',
        type: 'building',
        city: 'new-york',
        spawnX: 20,
        spawnY: 8,
        doorX: 20,
        doorY: 7,
        venueId: 'cocktail_party',
        startRoom: 'whitfield_foyer',
        travelTime: 2,
        cost: 0,
        icon: '🏛️',
        desc: 'The auction house on York Avenue. Paddle required.',
        requires: { reputation: { min: 30 } },
        tags: ['auction', 'market', 'high-stakes'],
    },

    // ── Teterboro FBO / Private Aviation ──
    {
        id: 'teterboro_fbo',
        name: 'Teterboro FBO',
        type: 'transit',
        city: 'new-york',
        spawnX: 28,
        spawnY: 14,
        doorX: 28,
        doorY: 13,
        venueId: null,       // Special — triggers city travel menu
        startRoom: null,
        travelTime: 3,
        cost: 5000,
        icon: '✈️',
        desc: 'A private terminal across the Hudson. This is how serious collectors travel.',
        requires: { cash: { min: 10000 } },
        tags: ['travel', 'airport', 'luxury'],
    },

    // ── Helipad ──
    {
        id: 'helipad',
        name: 'Downtown Helipad',
        type: 'transit',
        city: 'new-york',
        spawnX: 30,
        spawnY: 5,
        doorX: 30,
        doorY: 4,
        venueId: null,
        startRoom: null,
        travelTime: 1,
        cost: 8000,
        icon: '🚁',
        desc: 'The fastest way out. Expensive, but time is money.',
        requires: { cash: { min: 20000 }, access: { min: 60 } },
        tags: ['travel', 'helipad', 'vip'],
    },

    // ── Taxi Stops ──
    {
        id: 'taxi_village',
        name: 'Taxi — West Village',
        type: 'taxi',
        city: 'new-york',
        spawnX: 3,
        spawnY: 14,
        doorX: 3,
        doorY: 14,
        venueId: null,
        startRoom: null,
        travelTime: 0,
        cost: 50,
        icon: '🚕',
        desc: 'A yellow cab idling at the curb.',
        requires: null,
        tags: ['taxi', 'fast-travel'],
    },
    {
        id: 'taxi_chelsea',
        name: 'Taxi — Chelsea',
        type: 'taxi',
        city: 'new-york',
        spawnX: 14,
        spawnY: 10,
        doorX: 14,
        doorY: 10,
        venueId: null,
        startRoom: null,
        travelTime: 0,
        cost: 50,
        icon: '🚕',
        desc: 'A taxi idling outside the galleries.',
        requires: null,
        tags: ['taxi', 'fast-travel'],
    },
    {
        id: 'taxi_uptown',
        name: 'Taxi — Uptown',
        type: 'taxi',
        city: 'new-york',
        spawnX: 22,
        spawnY: 10,
        doorX: 22,
        doorY: 10,
        venueId: null,
        startRoom: null,
        travelTime: 0,
        cost: 50,
        icon: '🚕',
        desc: 'A cab near the auction houses.',
        requires: null,
        tags: ['taxi', 'fast-travel'],
    },

    // ── Café (Rest / Intel) ──
    {
        id: 'cafe_chelsea',
        name: 'La Colombe Coffee',
        type: 'building',
        city: 'new-york',
        spawnX: 10,
        spawnY: 10,
        doorX: 10,
        doorY: 9,
        venueId: null,       // Rest mechanic — reduces burnout
        startRoom: null,
        travelTime: 0,
        cost: 8,
        icon: '☕',
        desc: 'Overpriced espresso and overheard conversations.',
        requires: null,
        tags: ['rest', 'intel', 'social'],
    },
];

/**
 * Quick lookup helpers
 */
export const LOCATIONS_BY_ID = Object.fromEntries(
    WORLD_LOCATIONS.map(loc => [loc.id, loc])
);

export const LOCATIONS_BY_CITY = (city) =>
    WORLD_LOCATIONS.filter(loc => loc.city === city);

export const TAXI_STOPS = (city) =>
    WORLD_LOCATIONS.filter(loc => loc.type === 'taxi' && loc.city === city);

export const FAST_TRAVEL_DESTINATIONS = (city) =>
    WORLD_LOCATIONS.filter(loc =>
        loc.city === city &&
        loc.type !== 'taxi' &&
        loc.id !== 'player_apartment' // don't list home as a destination from taxi
    );
