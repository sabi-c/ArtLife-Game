/**
 * ContentExporter.js — Unified export engine for all CMS content types
 * 
 * Exports game content as schema-annotated JSON files that can be:
 * - Imported back into the CMS
 * - Used as templates by other AI agents
 * - Version-tracked externally
 * 
 * Supported content types:
 *   npcs, events, dialogues, haggles, rooms, artworks, storylines, calendar
 */

// ── Schema definitions (machine-readable documentation) ──

const SCHEMAS = {
    npc: {
        _description: 'ArtLife NPC / Contact — a character in the art world with stats, inventory, and haggle behavior',
        fields: {
            id: { type: 'string', required: true, description: 'Unique identifier (snake_case)', example: 'elena_ross' },
            name: { type: 'string', required: true, description: 'Display name', example: 'Elena Ross' },
            emoji: { type: 'string', required: false, description: 'Emoji icon', example: '🎨' },
            role: { type: 'string', required: true, description: 'World role (gallerist, dealer, collector, curator, critic, fixer, etc.)', example: 'gallerist' },
            tier: { type: 'string', required: true, description: 'Power tier: S/A/B/C', example: 'A' },
            tint: { type: 'number', required: false, description: 'Hex color tint for overworld sprite (0xRRGGBB)' },
            spriteKey: { type: 'string', required: false, description: 'Asset key for walk sprite sheet', example: 'walk_elena_ross_walk' },
            portraitKey: { type: 'string', required: false, description: 'Asset key for portrait image' },
            backstory: { type: 'string', required: false, description: 'Character background narrative' },
            motivations: { type: 'string[]', required: false, description: 'What drives this character' },
            traits: { type: 'string[]', required: false, description: 'Personality traits (comma-separated tags)' },
            wealth: {
                type: 'object', required: false, description: 'Financial profile',
                fields: {
                    liquidCash: { type: 'number', description: 'Available cash ($)' },
                    annualBudget: { type: 'number', description: 'Yearly art spend ($)' },
                    spendingCeiling: { type: 'number', description: 'Max single purchase ($)' },
                    incomeSource: { type: 'string', description: 'Where the money comes from' },
                    financialStress: { type: 'number', description: '0-100 financial pressure level' },
                }
            },
            collection: {
                type: 'object', required: false, description: 'Art inventory',
                fields: {
                    owned: { type: 'string[]', description: 'Artwork IDs currently held' },
                    forSale: { type: 'string[]', description: 'Artwork IDs available for purchase' },
                    pastSales: { type: 'string[]', description: 'Artwork IDs previously sold' },
                    totalValue: { type: 'number', description: 'Estimated portfolio value ($)' },
                }
            },
            taste: {
                type: 'object', required: false, description: 'Curatorial philosophy',
                fields: {
                    preferredStyles: { type: 'string[]', description: 'Art styles they favor' },
                    avoidedStyles: { type: 'string[]', description: 'Art styles they reject' },
                    priceRange: { type: 'object', description: '{ min, max } purchase range' },
                    riskProfile: { type: 'string', description: 'conservative/moderate/aggressive' },
                }
            },
            haggleProfile: {
                type: 'object', required: false, description: 'Battle parameters for haggle system',
                fields: {
                    dealerType: { type: 'string', description: 'Key into DEALER_TYPES (patron, shark, hustler, etc.)' },
                    patience: { type: 'number', description: '1-10 rounds before walking away' },
                    bluffChance: { type: 'number', description: '0.0-1.0 probability of faking rejection' },
                    priceFlexibility: { type: 'number', description: '0.0-0.5 how much they bend on price' },
                    walkawayThreshold: { type: 'number', description: '0.5-1.0 gap tolerance before leaving' },
                    emotionalTriggers: { type: 'string[]', description: 'Tactic IDs that emotionally affect them' },
                    openingLine: { type: 'string', description: 'First dialogue in haggle scene' },
                }
            },
            network: {
                type: 'object', required: false, description: 'Social connections',
                fields: {
                    allies: { type: 'string[]', description: 'NPC IDs they trust' },
                    rivals: { type: 'string[]', description: 'NPC IDs they oppose' },
                    faction: { type: 'string', description: 'Power group alignment' },
                }
            },
            behavior: {
                type: 'object', required: false, description: 'Overworld AI behavior',
                fields: {
                    riskTolerance: { type: 'number', description: '0-100 how risky their moves are' },
                    temperament: { type: 'string', description: 'calm/volatile/calculated/impulsive' },
                    scheduleAffinity: { type: 'string', description: 'morning/afternoon/evening/night' },
                }
            },
            dialogue: {
                type: 'object', required: false, description: 'Dialogue configuration',
                fields: {
                    greetings: { type: 'string[]', description: 'Random greeting lines' },
                    tonePreference: { type: 'string', description: 'Preferred conversation tone' },
                    topics: { type: 'string[]', description: 'Conversation topic IDs' },
                }
            },
        }
    },

    dialogue_tree: {
        _description: 'Branching NPC conversation tree with tone system, stat gates, and haggle triggers',
        fields: {
            id: { type: 'string', required: true, description: 'Unique tree identifier', example: 'elena_ross_gallery_opening' },
            npcId: { type: 'string', required: true, description: 'NPC contact ID who speaks', example: 'elena_ross' },
            venue: { type: 'string', required: true, description: 'Venue ID where this tree is active', example: 'gallery_opening' },
            trigger: { type: 'string', required: true, description: 'How it activates: room_talk, interact, event', example: 'room_talk' },
            entryConditions: { type: 'object|null', required: false, description: 'Stat gates to enter the conversation' },
            nodes: {
                type: 'Record<string, DialogueNode>', required: true, description: 'Node graph of conversation',
                fields: {
                    speaker: { type: 'string|null', description: 'NPC ID or null for narrator' },
                    text: { type: 'string|null', description: 'Static text (null if using variants)' },
                    variants: { type: 'array', description: '[ { check: {stat: {min}}, text: string } ] — conditional text' },
                    effects: { type: 'object', description: '{ stat: delta } applied on entering this node' },
                    npcEffects: { type: 'object', description: '{ npcId: { favor: delta } } NPC favor changes' },
                    topics: {
                        type: 'array', description: 'Player response options',
                        fields: {
                            label: { type: 'string', description: 'Display text for the choice' },
                            tone: { type: 'string|null', description: 'Tone used: friendly/schmoozing/direct/generous/ruthless' },
                            requires: { type: 'object|null', description: '{ stat: { min } } stat gate' },
                            isBlueOption: { type: 'boolean', description: 'True for premium/intel-gated options' },
                            triggerHaggle: { type: 'boolean', description: 'True to launch haggle battle after this choice' },
                            work: { type: 'object', description: 'Artwork data for haggle: { id, title, artist, year }' },
                            npcInvolved: { type: 'string', description: 'Override NPC for haggle (defaults to tree npcId)' },
                            effects: { type: 'object', description: '{ stat: delta } applied when chosen' },
                            npcEffects: { type: 'object', description: '{ npcId: { favor: delta } }' },
                            next: { type: 'string|null', description: 'Next node ID (null = end conversation)' },
                            schedules: { type: 'array', description: 'Delayed consequences: [{ weeksDelay, type, payload }]' },
                        }
                    },
                }
            },
            onComplete: { type: 'object', required: false, description: '{ effects, schedules } — fired when tree ends' },
        }
    },

    haggle_config: {
        _description: 'Haggle battle system configuration — dealer types, tactics, type effectiveness matrix',
        fields: {
            DEALER_TYPES: { type: 'Record<string, DealerType>', description: 'All dealer archetypes with stats' },
            TACTICS: { type: 'Record<string, Tactic>', description: 'All player tactics with effects' },
            TYPE_EFFECTIVENESS: { type: 'Record<string, Effectiveness>', description: 'Rock-paper-scissors matrix' },
            ROLE_TO_DEALER_TYPE: { type: 'Record<string, string>', description: 'NPC role → dealer type mapping' },
            HAGGLE_CONFIG: { type: 'object', description: 'Global battle parameters' },
        }
    },

    event: {
        _description: 'Game event with narrative steps and player choices',
        fields: {
            id: { type: 'string', required: true, description: 'Unique event ID', example: 'event_elena_forgery_1' },
            category: { type: 'string', required: true, description: 'social/market/drama/personal/travel/opportunity/scandal/chain/storyline' },
            title: { type: 'string', required: true, description: 'Event display title' },
            npcId: { type: 'string', required: false, description: 'Primary NPC involved' },
            requirements: { type: 'object', required: false, description: '{ stat: minValue } gates' },
            weight: { type: 'number', required: false, description: 'Selection probability weight (default 1)' },
            steps: {
                type: 'array', description: 'Sequential event steps',
                fields: {
                    type: { type: 'string', description: 'narrative/choice/stat_change/reveal' },
                    text: { type: 'string', description: 'Display text' },
                    characterId: { type: 'string', description: 'Speaker NPC ID or "narrator"' },
                    choices: { type: 'array', description: '[ { label, nextStep, statChange, requires } ]' },
                    isEnd: { type: 'boolean', description: 'True if this step ends the event' },
                }
            },
        }
    },

    storyline: {
        _description: 'Multi-week event chain triggered by player choices',
        fields: {
            id: { type: 'string', required: true, example: 'storyline_elena_forgery' },
            title: { type: 'string', required: true },
            description: { type: 'string', required: true },
            npcId: { type: 'string', required: true, description: 'Primary NPC driving the storyline' },
            triggerEventId: { type: 'string', required: true, description: 'Event ID that activates this storyline' },
            triggerChoiceIndex: { type: 'number', required: true, description: 'Choice index in the trigger event' },
            steps: {
                type: 'array', description: 'Storyline progression steps',
                fields: {
                    eventId: { type: 'string', description: 'Event to fire at this step' },
                    delayWeeks: { type: 'number', description: 'Weeks to wait before firing' },
                    requirements: { type: 'object', description: '{ stat: minValue } gates for this step' },
                }
            },
            rewards: { type: 'object', required: false, description: '{ stat: bonus } on storyline completion' },
        }
    },

    venue: {
        _description: 'Venue/location with interconnected rooms, items, NPCs, and eavesdrops',
        fields: {
            id: { type: 'string', required: true, example: 'gallery_opening' },
            name: { type: 'string', required: true },
            desc: { type: 'string', required: true },
            startRoom: { type: 'string', required: true, description: 'Room ID where player enters' },
            timeLimit: { type: 'number', required: false, description: 'Max turns in this venue' },
            requires: { type: 'object|null', description: '{ stat: { min } } entry requirements' },
            rooms: {
                type: 'array', description: 'Rooms within the venue',
                fields: {
                    id: { type: 'string' }, name: { type: 'string' }, desc: { type: 'string' },
                    ambience: { type: 'string' },
                    items: { type: 'array', description: '[ { name, desc, isTakeable, onLook } ]' },
                    characters: { type: 'array', description: '[ { id, eventId, greeting } ]' },
                    exits: { type: 'array', description: '[ { dir, id, label, block, requires } ]' },
                    eavesdrops: { type: 'array', description: '[ { text, effect } ]' },
                    timeCost: { type: 'number' },
                    tags: { type: 'string[]' },
                }
            },
        }
    },
};

// ── Export functions ──

export class ContentExporter {
    /**
     * Export a specific content type as schema-annotated JSON
     * @param {string} type — 'npcs' | 'events' | 'dialogues' | 'haggles' | 'rooms' | 'storylines'
     * @returns {Promise<object>} JSON object with _schema, _meta, and data
     */
    static async export(type) {
        const result = {
            _schema: SCHEMAS[this._schemaKey(type)] || {},
            _meta: {
                exportedAt: new Date().toISOString(),
                version: '1.0.0',
                contentType: type,
                game: 'ArtLife',
            },
            data: [],
        };

        switch (type) {
            case 'npcs': {
                const { CONTACTS } = await import('../data/contacts.js');
                result.data = CONTACTS;
                result._meta.count = CONTACTS.length;
                break;
            }
            case 'events': {
                const { EVENTS } = await import('../data/events.js');
                result.data = EVENTS;
                result._meta.count = EVENTS.length;
                break;
            }
            case 'dialogues': {
                const { DIALOGUE_TREES, TONES, TONE_SPECIALIZATIONS } = await import('../data/dialogue_trees.js');
                result.data = { trees: DIALOGUE_TREES, tones: TONES, specializations: TONE_SPECIALIZATIONS };
                result._meta.count = DIALOGUE_TREES.length;
                break;
            }
            case 'haggles': {
                const { DEALER_TYPES, TACTICS, TYPE_EFFECTIVENESS, ROLE_TO_DEALER_TYPE, HAGGLE_CONFIG } =
                    await import('../data/haggle_config.js');
                result.data = { DEALER_TYPES, TACTICS, TYPE_EFFECTIVENESS, ROLE_TO_DEALER_TYPE, HAGGLE_CONFIG };
                result._meta.dealerCount = Object.keys(DEALER_TYPES).length;
                result._meta.tacticCount = Object.keys(TACTICS).length;
                break;
            }
            case 'rooms': {
                const { VENUES } = await import('../data/rooms.js');
                result.data = VENUES;
                result._meta.count = VENUES.length;
                break;
            }
            case 'storylines': {
                try {
                    const resp = await fetch('/content/storylines.json');
                    result.data = await resp.json();
                    result._meta.count = result.data.length;
                } catch { result.data = []; result._meta.count = 0; }
                break;
            }
            default:
                throw new Error(`Unknown content type: ${type}`);
        }

        return result;
    }

    /**
     * Export a single NPC with full stat blocks
     * @param {string} npcId — contact ID
     * @returns {Promise<object>} Schema-annotated NPC JSON
     */
    static async exportNPC(npcId) {
        const { CONTACTS } = await import('../data/contacts.js');
        const npc = CONTACTS.find(c => c.id === npcId);
        if (!npc) throw new Error(`NPC not found: ${npcId}`);
        return {
            _schema: SCHEMAS.npc,
            _meta: { exportedAt: new Date().toISOString(), contentType: 'npc', id: npcId },
            data: npc,
        };
    }

    /**
     * Export all content types as a single bundle
     * @returns {Promise<object>} Complete game content bundle
     */
    static async exportAll() {
        const types = ['npcs', 'events', 'dialogues', 'haggles', 'rooms', 'storylines'];
        const bundle = {
            _meta: { exportedAt: new Date().toISOString(), version: '1.0.0', game: 'ArtLife' },
            _schemas: SCHEMAS,
        };
        for (const type of types) {
            try {
                const result = await this.export(type);
                bundle[type] = result.data;
            } catch (err) {
                bundle[type] = { error: err.message };
            }
        }
        return bundle;
    }

    /**
     * Download an export as a .json file
     * @param {string} type — content type or 'all'
     * @param {string} [filename] — override filename
     */
    static async download(type, filename) {
        const data = type === 'all' ? await this.exportAll() : await this.export(type);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `artlife_${type}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Get all available schemas (for documentation/AI agent consumption)
     */
    static getSchemas() { return SCHEMAS; }

    // Internal helper
    static _schemaKey(type) {
        const map = { npcs: 'npc', events: 'event', dialogues: 'dialogue_tree', haggles: 'haggle_config', rooms: 'venue', storylines: 'storyline' };
        return map[type] || type;
    }
}

// ── Import / Validation ──

export class ContentImporter {
    /**
     * Validate imported JSON against the schema
     * @param {object} jsonData — parsed JSON with _schema and data 
     * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
     */
    static validate(jsonData) {
        const errors = [];
        const warnings = [];

        if (!jsonData) { errors.push('No data provided'); return { valid: false, errors, warnings }; }
        if (!jsonData._meta?.contentType) warnings.push('Missing _meta.contentType — cannot auto-detect schema');
        if (!jsonData.data) { errors.push('Missing data field'); return { valid: false, errors, warnings }; }

        const type = jsonData._meta?.contentType;
        if (type === 'npcs' || type === 'npc') {
            const items = Array.isArray(jsonData.data) ? jsonData.data : [jsonData.data];
            items.forEach((item, i) => {
                if (!item.id) errors.push(`Item ${i}: missing required field 'id'`);
                if (!item.name) errors.push(`Item ${i}: missing required field 'name'`);
                if (!item.role) warnings.push(`Item ${i}: missing 'role' (will default to 'dealer')`);
                if (item.haggleProfile) {
                    const hp = item.haggleProfile;
                    if (hp.patience && (hp.patience < 1 || hp.patience > 15)) warnings.push(`Item ${i}: patience ${hp.patience} outside recommended range 1-15`);
                    if (hp.bluffChance && (hp.bluffChance < 0 || hp.bluffChance > 1)) errors.push(`Item ${i}: bluffChance must be 0.0-1.0`);
                    if (hp.priceFlexibility && (hp.priceFlexibility < 0 || hp.priceFlexibility > 1)) errors.push(`Item ${i}: priceFlexibility must be 0.0-1.0`);
                }
            });
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * Import a file via FileReader and validate
     * @param {File} file — uploaded .json file
     * @returns {Promise<{ valid, errors, warnings, data }>}
     */
    static async importFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    const validation = this.validate(jsonData);
                    resolve({ ...validation, data: jsonData });
                } catch (err) {
                    resolve({ valid: false, errors: [`JSON parse error: ${err.message}`], warnings: [], data: null });
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
}
