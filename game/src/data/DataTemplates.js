/**
 * DataTemplates.js — Domain schemas, sample generators, and validation
 * Used by DataHub.jsx for structured import/export of game data
 */

// ═══════════════════════════════════════════════════════════
//  DOMAIN SCHEMAS — Required fields, types, defaults
// ═══════════════════════════════════════════════════════════

export const DOMAIN_SCHEMAS = {
    artworks: {
        label: 'Artworks',
        icon: '🖼️',
        color: '#e91e63',
        requiredFields: ['id', 'title', 'artist', 'askingPrice'],
        optionalFields: ['artistId', 'tier', 'genre', 'medium', 'yearCreated', 'provenance', 'description', 'condition', 'dimensions', 'onMarket', 'owner'],
        fieldTypes: {
            id: 'string', title: 'string', artist: 'string', artistId: 'string',
            askingPrice: 'number', tier: 'number', genre: 'string', medium: 'string',
            yearCreated: 'number', condition: 'string', dimensions: 'string',
            description: 'string', onMarket: 'boolean', owner: 'string',
        },
        idField: 'id',
    },
    artists: {
        label: 'Artists',
        icon: '🎨',
        color: '#9c27b0',
        requiredFields: ['id', 'name', 'basePriceMin', 'basePriceMax'],
        optionalFields: ['medium', 'genre', 'tier', 'heat', 'volatility', 'momentum', 'works', 'bio', 'nationality', 'birthYear'],
        fieldTypes: {
            id: 'string', name: 'string', basePriceMin: 'number', basePriceMax: 'number',
            medium: 'string', genre: 'string', tier: 'number', heat: 'number',
            volatility: 'number', momentum: 'number', bio: 'string',
            nationality: 'string', birthYear: 'number',
        },
        idField: 'id',
    },
    npcs: {
        label: 'NPCs / Contacts',
        icon: '👤',
        color: '#ff9800',
        requiredFields: ['id', 'name', 'role', 'tier'],
        optionalFields: ['emoji', 'personality', 'bio', 'city', 'schedule', 'wealth', 'collection', 'taste', 'dialogue', 'relationships', 'overworld', 'sprite'],
        fieldTypes: {
            id: 'string', name: 'string', role: 'string', tier: 'number',
            emoji: 'string', personality: 'string', bio: 'string', city: 'string',
        },
        idField: 'id',
    },
    events: {
        label: 'Events / Dialogue',
        icon: '🎭',
        color: '#4caf50',
        requiredFields: ['id', 'title', 'type'],
        optionalFields: ['description', 'choices', 'effects', 'conditions', 'weekRange', 'city', 'location', 'npcId', 'repeatable', 'priority'],
        fieldTypes: {
            id: 'string', title: 'string', type: 'string', description: 'string',
            city: 'string', location: 'string', npcId: 'string',
            repeatable: 'boolean', priority: 'number',
        },
        idField: 'id',
    },
    storylines: {
        label: 'Storylines',
        icon: '⛓️',
        color: '#2196f3',
        requiredFields: ['id', 'npcId', 'steps'],
        optionalFields: ['title', 'description', 'triggerWeek', 'tags', 'priority'],
        fieldTypes: {
            id: 'string', npcId: 'string', title: 'string', description: 'string',
            triggerWeek: 'number', priority: 'number',
        },
        idField: 'id',
    },
};

// ═══════════════════════════════════════════════════════════
//  SAMPLE DATA GENERATORS — Blank templates for each domain
// ═══════════════════════════════════════════════════════════

export const SAMPLE_TEMPLATES = {
    artworks: () => ({
        id: `artwork_${Date.now()}`,
        title: 'Untitled Work',
        artist: 'Unknown Artist',
        artistId: '',
        askingPrice: 10000,
        tier: 2,
        genre: 'contemporary',
        medium: 'Oil on canvas',
        yearCreated: 2024,
        condition: 'excellent',
        dimensions: '48 × 36 in',
        description: '',
        onMarket: true,
        owner: 'gallery',
    }),
    artists: () => ({
        id: `artist_${Date.now()}`,
        name: 'New Artist',
        basePriceMin: 5000,
        basePriceMax: 50000,
        medium: 'Mixed Media',
        genre: 'contemporary',
        tier: 2,
        heat: 50,
        volatility: 0.3,
        momentum: 0,
        bio: '',
        nationality: '',
        birthYear: 1990,
        works: [],
    }),
    npcs: () => ({
        id: `npc_${Date.now()}`,
        name: 'New Contact',
        role: 'collector',
        tier: 2,
        emoji: '🧑',
        personality: 'reserved',
        bio: '',
        city: 'new-york',
        schedule: [],
        wealth: { liquidCash: 100000, tier: 'mid' },
        collection: { owned: [], forSale: [], maxCapacity: 10 },
        taste: { preferredGenres: [], preferredMediums: [], riskAppetite: 0.5 },
        relationships: {},
    }),
    events: () => ({
        id: `evt_${Date.now()}`,
        title: 'New Event',
        type: 'start',
        description: '',
        choices: [
            { label: 'Option A', next: null, effects: {} },
            { label: 'Option B', next: null, effects: {} },
        ],
        conditions: {},
        weekRange: [1, 52],
        city: 'new-york',
        repeatable: false,
        priority: 50,
    }),
    storylines: () => ({
        id: `storyline_${Date.now()}`,
        npcId: '',
        title: 'New Storyline',
        description: '',
        triggerWeek: 1,
        priority: 50,
        steps: [
            { week: 1, type: 'dialogue', text: 'Opening dialogue...' },
        ],
        tags: [],
    }),
};

// ═══════════════════════════════════════════════════════════
//  VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate an array of items against a domain schema.
 * Returns { valid: boolean, errors: string[], warnings: string[], validItems: number }
 */
export function validateDomainData(domain, items) {
    const schema = DOMAIN_SCHEMAS[domain];
    if (!schema) return { valid: false, errors: [`Unknown domain: ${domain}`], warnings: [], validItems: 0 };
    if (!Array.isArray(items)) return { valid: false, errors: ['Data must be an array'], warnings: [], validItems: 0 };

    const errors = [];
    const warnings = [];
    let validItems = 0;
    const seenIds = new Set();

    items.forEach((item, idx) => {
        const prefix = `Item ${idx + 1}`;
        let itemValid = true;

        // Required fields
        for (const field of schema.requiredFields) {
            if (item[field] === undefined || item[field] === null || item[field] === '') {
                errors.push(`${prefix}: missing required field "${field}"`);
                itemValid = false;
            }
        }

        // Type checks
        for (const [field, expectedType] of Object.entries(schema.fieldTypes)) {
            if (item[field] !== undefined && item[field] !== null) {
                const actualType = typeof item[field];
                if (actualType !== expectedType) {
                    if (expectedType === 'number' && !isNaN(Number(item[field]))) {
                        warnings.push(`${prefix}: field "${field}" is string but coercible to number`);
                    } else {
                        errors.push(`${prefix}: field "${field}" expected ${expectedType}, got ${actualType}`);
                        itemValid = false;
                    }
                }
            }
        }

        // Duplicate ID check
        const id = item[schema.idField];
        if (id) {
            if (seenIds.has(id)) {
                errors.push(`${prefix}: duplicate ID "${id}"`);
                itemValid = false;
            }
            seenIds.add(id);
        }

        if (itemValid) validItems++;
    });

    // Optional field warnings
    const allKnown = new Set([...schema.requiredFields, ...schema.optionalFields]);
    const sampleItem = items[0];
    if (sampleItem) {
        Object.keys(sampleItem).forEach(key => {
            if (!allKnown.has(key) && key !== '_meta') {
                warnings.push(`Unknown field "${key}" (will be preserved but unused)`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        validItems,
        totalItems: items.length,
    };
}

/**
 * Auto-detect domain from an array of objects
 */
export function detectDomain(items) {
    if (!Array.isArray(items) || items.length === 0) return null;
    const sample = items[0];

    // Check each domain's required fields
    for (const [domain, schema] of Object.entries(DOMAIN_SCHEMAS)) {
        const matchCount = schema.requiredFields.filter(f => sample[f] !== undefined).length;
        if (matchCount === schema.requiredFields.length) return domain;
    }

    // Heuristic fallbacks
    if (sample.npcId && Array.isArray(sample.steps)) return 'storylines';
    if (sample.askingPrice || sample.basePrice) return 'artworks';
    if (sample.basePriceMin) return 'artists';
    if (sample.role && sample.tier) return 'npcs';
    if (sample.type === 'start' || sample.choices) return 'events';

    return null;
}
