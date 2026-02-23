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
 *   triggerChoiceIndex: Legacy index-based trigger
 *   priority:        Higher = fires first if multiple match (default 1)
 *   npcId:           Primary NPC involved
 *   branches:        { branchId: { label, steps: [...], condition? } }
 *     Each step: { eventId, delayWeeks, description, requirements?, branchTo? }
 *     branchTo: fork to another branch based on player choices in the event
 *   rewards:         { stat: amount } — granted on completion
 *
 * Branching: When a step has `branchTo`, the player's choice in that event
 * can fork the storyline to a different branch. The graph renders these
 * as split paths in the StorylineEditor.
 *
 * Used by: EventRegistry.checkStorylineTrigger, storylineStore.tickWeek
 */

export const STORYLINES = [

    // ═════════════════════════════════════════════════════════════
    // ARC 1: THE FORGERY RING (Elena Ross)
    // Triggered: Elena's gallery opening → buy Tomás pieces
    // Full 5-event arc with branching at event 2
    // ═════════════════════════════════════════════════════════════
    {
        id: 'elena_forgery_arc',
        title: 'The Forgery Ring',
        description: 'Your purchase of Tomás Herrera\'s work draws you into a forgery scandal. Do you protect Elena, expose the ring, or profit from the chaos?',
        npcId: 'elena_ross',
        triggerEventId: 'elena_ross_gallery_opening',
        triggerNodeId: 'unknown_artist',
        triggerChoice: "I\'ll take both pieces",
        priority: 2,
        steps: [
            { eventId: 'event_elena_forgery_1', delayWeeks: 4, description: 'Elena calls with unsettling news about provenance' },
            { eventId: 'event_elena_forgery_2', delayWeeks: 3, description: 'A journalist approaches you at an opening', branchTo: { 0: 'protect_elena', 1: 'expose_ring', 2: 'profit_silence' } },
        ],
        branches: {
            protect_elena: {
                label: 'Protect Elena',
                condition: 'Player chose to help Elena cover it up',
                steps: [
                    { eventId: 'event_elena_forgery_climax', delayWeeks: 5, description: 'The reckoning — you and Elena face the fallout together', requirements: { reputation: 15 } },
                ],
            },
            expose_ring: {
                label: 'Expose the Ring',
                condition: 'Player chose to go to the press',
                steps: [
                    { eventId: 'event_elena_forgery_climax', delayWeeks: 4, description: 'Your exposé rocks the Chelsea circuit', requirements: { intel: 8 } },
                ],
            },
            profit_silence: {
                label: 'Profit from Silence',
                condition: 'Player chose to stay quiet and profit',
                steps: [
                    { eventId: 'event_elena_forgery_climax', delayWeeks: 6, description: 'You leverage the information for personal gain' },
                ],
            },
        },
        rewards: { reputation: 10, intel: 5 },
    },

    // ═════════════════════════════════════════════════════════════
    // ARC 2: PERSONA NON GRATA (Elena Cold Shoulder)
    // Triggered: Elena's gallery opening → ask about investment value
    // 2-event redemption arc
    // ═════════════════════════════════════════════════════════════
    {
        id: 'elena_cold_shoulder',
        title: 'Persona Non Grata',
        description: 'After offending Elena with investment talk, doors close across the gallery circuit. Find your way back — or build a new path entirely.',
        npcId: 'elena_ross',
        triggerEventId: 'elena_ross_gallery_opening',
        triggerNodeId: 'investment_coldness',
        triggerChoice: null,
        priority: 1,
        steps: [
            { eventId: 'event_elena_cold_1', delayWeeks: 6, description: 'Gallery invites start drying up', branchTo: { 0: 'apology_path', 1: 'independent_path', 2: 'mediator_path' } },
        ],
        branches: {
            apology_path: {
                label: 'Apologise to Elena',
                condition: 'Send flowers and a handwritten apology',
                steps: [
                    { eventId: 'event_elena_cold_2', delayWeeks: 4, description: 'Marcus Price notices your exclusion and intervenes' },
                ],
            },
            independent_path: {
                label: 'Go Independent',
                condition: 'Focus on rival galleries and alternative channels',
                steps: [
                    { eventId: 'event_elena_cold_2', delayWeeks: 4, description: 'Three months at alt venues builds new reputation' },
                ],
            },
            mediator_path: {
                label: 'Ask for Mediation',
                condition: 'Use a mutual contact to broker reconciliation',
                steps: [
                    { eventId: 'event_elena_cold_2', delayWeeks: 3, description: 'James Whitfield agrees to mediate' },
                ],
            },
        },
        rewards: { reputation: 5 },
    },

    // ═════════════════════════════════════════════════════════════
    // ARC 3: THE VANDERMEER SCHEME (Charles Vandermeer)
    // Triggered: Vandermeer auction → accept partnership proposal
    // 3-event scheme with major fork at step 2
    // ═════════════════════════════════════════════════════════════
    {
        id: 'vandermeer_scheme_arc',
        title: 'The Vandermeer Scheme',
        description: 'Charles Vandermeer draws you into a high-stakes auction manipulation. Commit fully, sabotage from within, or walk away before it\'s too late.',
        npcId: 'charles_vandermeer',
        triggerEventId: 'charles_vandermeer_auction',
        triggerNodeId: 'proposal',
        triggerChoice: 'partnership',
        priority: 2,
        steps: [
            { eventId: 'event_vandermeer_scheme_1', delayWeeks: 3, description: 'Charles outlines the plan over cigars at his club' },
            { eventId: 'event_vandermeer_scheme_2', delayWeeks: 4, description: 'You must choose: commit or back out', requirements: { cash: 50000 }, branchTo: { 0: 'full_commit', 1: 'sabotage', 2: 'walk_away' } },
        ],
        branches: {
            full_commit: {
                label: 'Go All In',
                condition: 'Wire the money and commit to the scheme',
                steps: [
                    { eventId: 'event_vandermeer_scheme_3', delayWeeks: 6, description: 'The auction — everything rides on the hammer' },
                ],
            },
            sabotage: {
                label: 'Sabotage from Within',
                condition: 'Pretend to commit but tip off the auction house',
                steps: [
                    { eventId: 'event_vandermeer_scheme_3', delayWeeks: 5, description: 'The auction — but you\'ve already made your move' },
                ],
            },
            walk_away: {
                label: 'Walk Away',
                condition: 'Tell Charles you\'re out',
                steps: [
                    { eventId: 'event_vandermeer_scheme_3', delayWeeks: 2, description: 'Charles doesn\'t take rejection well' },
                ],
            },
        },
        rewards: { cash: 100000, audacity: 10 },
    },

    // ═════════════════════════════════════════════════════════════
    // ARC 4: CLASH OF COLLECTORS (Philippe Noir Rivalry)
    // Triggered: Philippe cocktail → challenge him directly
    // 3-event rivalry with branching at each stage
    // ═════════════════════════════════════════════════════════════
    {
        id: 'philippe_rivalry_arc',
        title: 'Clash of Collectors',
        description: 'Philippe Noir identifies you as competition. What begins as a rivalry at Sotheby\'s escalates through a Rothko race to a final showdown at Art Basel.',
        npcId: 'philippe_noir',
        triggerEventId: 'philippe_noir_cocktail',
        triggerNodeId: 'direct_challenge',
        triggerChoice: 'challenge',
        priority: 1,
        steps: [
            { eventId: 'event_philippe_rivalry_1', delayWeeks: 2, description: 'Outbid at Sotheby\'s — the first public clash', branchTo: { 0: 'aggressive_collect', 1: 'strategic_retreat', 2: 'diplomatic_nod' } },
        ],
        branches: {
            aggressive_collect: {
                label: 'Aggressive Collector',
                condition: 'Bid $100K to win the Kline — you won\'t back down',
                steps: [
                    { eventId: 'event_philippe_rivalry_2', delayWeeks: 5, description: 'The Rothko Fragment appears — only one buyer gets it' },
                    { eventId: 'event_philippe_rivalry_climax', delayWeeks: 4, description: 'Art Basel: The Reckoning', requirements: { reputation: 25 } },
                ],
            },
            strategic_retreat: {
                label: 'Strategic Retreat',
                condition: 'Let Philippe win — save your powder for bigger fights',
                steps: [
                    { eventId: 'event_philippe_rivalry_2', delayWeeks: 6, description: 'The Rothko — your chance for revenge', requirements: { cash: 350000 } },
                    { eventId: 'event_philippe_rivalry_climax', delayWeeks: 4, description: 'Art Basel: prove yourself', requirements: { reputation: 25 } },
                ],
            },
            diplomatic_nod: {
                label: 'Diplomatic Approach',
                condition: 'Acknowledge the better play — earn Philippe\'s respect',
                steps: [
                    { eventId: 'event_philippe_rivalry_2', delayWeeks: 4, description: 'Philippe proposes a joint acquisition' },
                    { eventId: 'event_philippe_rivalry_climax', delayWeeks: 3, description: 'Art Basel: rivals become allies?', requirements: { reputation: 20 } },
                ],
            },
        },
        rewards: { reputation: 15, audacity: 5 },
    },

    // ═════════════════════════════════════════════════════════════
    // ARC 5: THE ASANTE CONNECTION (Kwame Asante Discovery)
    // Triggered: Studio visit → commission a piece
    // 2-event arc — commission → exhibition
    // ═════════════════════════════════════════════════════════════
    {
        id: 'kwame_discovery_arc',
        title: 'The Asante Connection',
        description: 'Your studio visit with Kwame Asante opens a door into the African contemporary art world. A commission leads to a major exhibition in Lagos.',
        npcId: 'kwame_asante',
        triggerEventId: 'kwame_asante_studio_visit',
        triggerNodeId: 'commissioned_piece',
        triggerChoice: 'commission',
        priority: 1,
        steps: [
            { eventId: 'event_kwame_commission_1', delayWeeks: 8, description: 'Kwame reveals "Homecoming" — your commission exceeds expectations', branchTo: { 0: 'patron_path', 1: 'generous_patron', 2: 'flipper_mistake' } },
        ],
        branches: {
            patron_path: {
                label: 'Appreciative Patron',
                condition: 'Express genuine appreciation for the work',
                steps: [
                    { eventId: 'event_kwame_commission_2', delayWeeks: 4, description: 'Lagos museum wants to exhibit your Homecoming piece', requirements: { reputation: 10 } },
                ],
            },
            generous_patron: {
                label: 'Pay More Than Agreed',
                condition: 'Offer to pay 10x the agreed price',
                steps: [
                    { eventId: 'event_kwame_commission_2', delayWeeks: 3, description: 'Kwame considers you family — Lagos exhibition follows', requirements: { reputation: 10 } },
                ],
            },
            flipper_mistake: {
                label: 'Suggest Auction',
                condition: 'Suggest selling at auction — Kwame cuts you off',
                steps: [],
            },
        },
        rewards: { taste: 8, reputation: 5 },
    },

    // ═════════════════════════════════════════════════════════════
    // ARC 6: THE DEALER\'S CIRCLE (Lorenzo Gallo Network)
    // Triggered: Art fair VIP → accept Lorenzo\'s dinner invitation
    // 2-event arc — VIP dinner → private offering
    // ═════════════════════════════════════════════════════════════
    {
        id: 'lorenzo_network_arc',
        title: 'The Dealer\'s Circle',
        description: 'Lorenzo Gallo introduces you to his international network of mega-collectors. A VIP dinner leads to a once-in-a-decade acquisition opportunity.',
        npcId: 'lorenzo_gallo',
        triggerEventId: 'lorenzo_gallo_art_fair',
        triggerNodeId: 'vip_invitation',
        triggerChoice: 'accept',
        priority: 1,
        steps: [
            { eventId: 'event_lorenzo_network_1', delayWeeks: 3, description: 'VIP dinner with three mega-collectors', branchTo: { 0: 'relationship_first', 1: 'alpha_investor', 2: 'humble_honesty' } },
        ],
        branches: {
            relationship_first: {
                label: 'Relationships First',
                condition: '"I invest in artists, not assets"',
                steps: [
                    { eventId: 'event_lorenzo_network_2', delayWeeks: 5, description: 'Lorenzo calls at midnight — Zao Wou-Ki lithographs', requirements: { reputation: 18, cash: 100000 } },
                ],
            },
            alpha_investor: {
                label: 'Alpha Investor',
                condition: '"I find undervalued talent before the market catches up"',
                steps: [
                    { eventId: 'event_lorenzo_network_2', delayWeeks: 4, description: 'The CEO offers LA gallery connections', requirements: { reputation: 18 } },
                ],
            },
            humble_honesty: {
                label: 'Humble & Honest',
                condition: '"I\'m still figuring it out"',
                steps: [
                    { eventId: 'event_lorenzo_network_2', delayWeeks: 6, description: 'Real connections form over a long evening', requirements: { reputation: 15 } },
                ],
            },
        },
        rewards: { reputation: 10, taste: 5, intel: 3 },
    },

    // ═════════════════════════════════════════════════════════════
    // ARC 7: UNDER MARCUS\'S WING (Marcus Price Mentorship)
    // Triggered: Marcus briefing → accept mentorship offer
    // 3-event mentorship with branching at the final solo test
    // ═════════════════════════════════════════════════════════════
    {
        id: 'marcus_mentorship_arc',
        title: 'Under Marcus\'s Wing',
        description: 'Marcus Price teaches you the art of collecting through three lessons: reading the room, the psychology of negotiation, and a final solo deal.',
        npcId: 'marcus_price',
        triggerEventId: 'marcus_price_briefing',
        triggerNodeId: 'mentorship_offer',
        triggerChoice: 'accept',
        priority: 1,
        steps: [
            { eventId: 'event_marcus_lesson_1', delayWeeks: 2, description: 'First lesson: reading the room at Christie\'s' },
            { eventId: 'event_marcus_lesson_2', delayWeeks: 3, description: 'Second lesson: the psychology of the seller', requirements: { intel: 5 } },
            { eventId: 'event_marcus_final', delayWeeks: 4, description: 'Marcus sends you solo to an estate sale', requirements: { intel: 8, reputation: 15 }, branchTo: { 0: 'bold_buy', 1: 'smart_negotiate', 2: 'call_marcus' } },
        ],
        branches: {
            bold_buy: {
                label: 'Bold Full Purchase',
                condition: 'Take the entire lot at $500K — trust your eye',
                steps: [],
            },
            smart_negotiate: {
                label: 'Counter Offer',
                condition: 'Counter at $350K with detailed valuation',
                steps: [],
            },
            call_marcus: {
                label: 'Call Marcus for Help',
                condition: 'Walk away and call Marcus — the harsh lesson',
                steps: [],
            },
        },
        rewards: { intel: 10, reputation: 8 },
    },
];
