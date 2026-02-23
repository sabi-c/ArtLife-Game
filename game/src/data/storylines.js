/**
 * Storylines — Branching narrative arcs triggered by dialogue outcomes
 *
 * Each storyline maps a dialogue tree outcome to a chain of future events.
 * The storylineStore tracks activation, step progression, and completion.
 *
 * Schema:
 *   id:              Unique storyline identifier
 *   title:           Human-readable arc title
 *   description:     Brief summary for CMS display
 *   triggerEventId:  The dialogue tree ID that can trigger this arc
 *   triggerNodeId:   The named node where the triggering choice lives
 *   triggerChoice:   Label substring or index to match the activating choice
 *   priority:        Higher = fires first if multiple match (default 1)
 *   branches:        { outcomeNodeId: { steps: [...] } }
 *     Each step: { eventId, delayWeeks, requirements? }
 *
 * Used by: EventRegistry.checkStorylineTrigger, storylineStore.tickWeek
 */

export const STORYLINES = [

    // ═══════════════════════════════════════════
    // ARC 1: The Forgery Ring (Elena Ross)
    // ═══════════════════════════════════════════
    {
        id: 'elena_forgery_arc',
        title: 'The Forgery Ring',
        description: 'Your early purchase of Tomas Herrera\'s work draws you into a forgery scandal connected to Elena Ross.',
        triggerEventId: 'elena_ross_gallery_opening',
        triggerNodeId: 'unknown_artist',
        triggerChoice: "I'll take both pieces",
        priority: 2,
        steps: [
            { eventId: 'event_elena_forgery_1', delayWeeks: 4, description: 'Elena calls with unsettling news about provenance' },
            { eventId: 'event_elena_forgery_2', delayWeeks: 3, description: 'A journalist approaches you at an opening' },
            { eventId: 'event_elena_forgery_climax', delayWeeks: 5, description: 'The reckoning — confront Elena or stay silent', requirements: { reputation: 15 } },
        ],
    },

    // ═══════════════════════════════════════════
    // ARC 2: The Cold Shoulder (Elena Ross — alt path)
    // ═══════════════════════════════════════════
    {
        id: 'elena_cold_shoulder',
        title: 'Persona Non Grata',
        description: 'After offending Elena with investment talk, you find doors closing across the gallery circuit.',
        triggerEventId: 'elena_ross_gallery_opening',
        triggerNodeId: 'investment_coldness',
        triggerChoice: null, // Any choice from this node
        priority: 1,
        steps: [
            { eventId: 'event_elena_cold_1', delayWeeks: 6, description: 'Gallery invites start drying up' },
            { eventId: 'event_elena_cold_2', delayWeeks: 4, description: 'Marcus Price notices your exclusion and intervenes' },
        ],
    },

    // ═══════════════════════════════════════════
    // ARC 3: The Vandermeer Scheme (Charles Vandermeer)
    // ═══════════════════════════════════════════
    {
        id: 'vandermeer_scheme_arc',
        title: 'The Vandermeer Scheme',
        description: 'Charles Vandermeer draws you into a high-stakes auction manipulation plot.',
        triggerEventId: 'charles_vandermeer_auction',
        triggerNodeId: 'proposal',
        triggerChoice: 'partnership',
        priority: 2,
        steps: [
            { eventId: 'event_vandermeer_scheme_1', delayWeeks: 3, description: 'Charles outlines the plan over cigars' },
            { eventId: 'event_vandermeer_scheme_2', delayWeeks: 4, description: 'You must choose: commit or back out', requirements: { cash: 50000 } },
            { eventId: 'event_vandermeer_scheme_3', delayWeeks: 6, description: 'The auction — everything rides on the hammer' },
        ],
    },

    // ═══════════════════════════════════════════
    // ARC 4: The Philippe Noir Rivalry
    // ═══════════════════════════════════════════
    {
        id: 'philippe_rivalry_arc',
        title: 'Clash of Collectors',
        description: 'Philippe Noir identifies you as competition. A ruthless rivalry begins.',
        triggerEventId: 'philippe_noir_cocktail',
        triggerNodeId: 'direct_challenge',
        triggerChoice: 'challenge',
        priority: 1,
        steps: [
            { eventId: 'event_philippe_rivalry_1', delayWeeks: 2, description: 'Philippe outbids you publicly at an auction' },
            { eventId: 'event_philippe_rivalry_2', delayWeeks: 5, description: 'A rare piece appears — only one of you can have it' },
            { eventId: 'event_philippe_rivalry_climax', delayWeeks: 4, description: 'The final showdown at Art Basel', requirements: { reputation: 25 } },
        ],
    },

    // ═══════════════════════════════════════════
    // ARC 5: The Kwame Asante Discovery
    // ═══════════════════════════════════════════
    {
        id: 'kwame_discovery_arc',
        title: 'The Asante Connection',
        description: 'Your studio visit with Kwame Asante opens a path into the African contemporary art world.',
        triggerEventId: 'kwame_asante_studio_visit',
        triggerNodeId: 'commissioned_piece',
        triggerChoice: 'commission',
        priority: 1,
        steps: [
            { eventId: 'event_kwame_commission_1', delayWeeks: 8, description: 'Kwame completes your commission — it exceeds expectations' },
            { eventId: 'event_kwame_commission_2', delayWeeks: 4, description: 'A Lagos gallery wants to exhibit the piece' },
        ],
    },

    // ═══════════════════════════════════════════
    // ARC 6: The Lorenzo Gallo Network
    // ═══════════════════════════════════════════
    {
        id: 'lorenzo_network_arc',
        title: 'The Dealer\'s Circle',
        description: 'Lorenzo Gallo introduces you to his international network of mega-collectors.',
        triggerEventId: 'lorenzo_gallo_art_fair',
        triggerNodeId: 'vip_invitation',
        triggerChoice: 'accept',
        priority: 1,
        steps: [
            { eventId: 'event_lorenzo_network_1', delayWeeks: 3, description: 'VIP dinner with three of the world\'s top collectors' },
            { eventId: 'event_lorenzo_network_2', delayWeeks: 5, description: 'A once-in-a-lifetime acquisition opportunity', requirements: { cash: 100000 } },
        ],
    },

    // ═══════════════════════════════════════════
    // ARC 7: The Marcus Price Mentorship
    // ═══════════════════════════════════════════
    {
        id: 'marcus_mentorship_arc',
        title: 'Under Marcus\'s Wing',
        description: 'Marcus Price takes you under his wing, teaching you the art of the deal.',
        triggerEventId: 'marcus_price_briefing',
        triggerNodeId: 'mentorship_offer',
        triggerChoice: 'accept',
        priority: 1,
        steps: [
            { eventId: 'event_marcus_lesson_1', delayWeeks: 2, description: 'First lesson: reading the room at Christie\'s' },
            { eventId: 'event_marcus_lesson_2', delayWeeks: 3, description: 'Second lesson: the psychology of the seller' },
            { eventId: 'event_marcus_final', delayWeeks: 4, description: 'Marcus sends you into a deal solo — sink or swim' },
        ],
    },
];
