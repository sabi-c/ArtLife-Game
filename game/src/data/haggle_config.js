/**
 * haggle_config.js — Data definitions for the Pokémon-style Haggle Battle system
 * 
 * Defines dealer personality types, player tactics, success formulas,
 * dialogue templates, round configuration, and negotiation phase system.
 * 
 * Content drawn from real-world art market mechanics, institutional critique,
 * relational aesthetics, gallery economics, and Seb's art world research.
 */

// ════════════════════════════════════════════
// Haggle Type & Attribute System
// ════════════════════════════════════════════
export const HAGGLE_TYPES = {
    EMOTIONAL: 'emotional',
    LOGICAL: 'logical',
    AGGRESSIVE: 'aggressive',
    FINANCIAL: 'financial',
};

// Type multipliers (Rock-Paper-Scissors)
// Emotional > Aggressive > Financial > Logical > Emotional
export const TYPE_EFFECTIVENESS = {
    [HAGGLE_TYPES.EMOTIONAL]: { strongAgainst: HAGGLE_TYPES.AGGRESSIVE, weakAgainst: HAGGLE_TYPES.LOGICAL },
    [HAGGLE_TYPES.LOGICAL]: { strongAgainst: HAGGLE_TYPES.EMOTIONAL, weakAgainst: HAGGLE_TYPES.FINANCIAL },
    [HAGGLE_TYPES.AGGRESSIVE]: { strongAgainst: HAGGLE_TYPES.FINANCIAL, weakAgainst: HAGGLE_TYPES.EMOTIONAL },
    [HAGGLE_TYPES.FINANCIAL]: { strongAgainst: HAGGLE_TYPES.LOGICAL, weakAgainst: HAGGLE_TYPES.AGGRESSIVE },
};

// ════════════════════════════════════════════
// Negotiation Phases
// ════════════════════════════════════════════
export const NEGOTIATION_PHASES = {
    OPENING: 'opening',
    MID: 'mid',
    ENDGAME: 'endgame',
};

export const PHASE_MODIFIERS = {
    [NEGOTIATION_PHASES.OPENING]: {
        description: 'Feeling each other out — bluffs are more believable',
        successMod: 0,
        bluffBonus: 0.1,
        walkAwayPenalty: -0.1,
    },
    [NEGOTIATION_PHASES.MID]: {
        description: 'The real negotiation — all tactics at baseline',
        successMod: 0,
        bluffBonus: 0,
        walkAwayPenalty: 0,
    },
    [NEGOTIATION_PHASES.ENDGAME]: {
        description: 'Last chance — walk-aways are terrifying, raises are welcomed',
        successMod: 0.05,
        bluffBonus: -0.1,
        walkAwayPenalty: 0.15,
    },
};

// ════════════════════════════════════════════
// Dealer Personality Types (9 types)
// ════════════════════════════════════════════
export const DEALER_TYPES = {
    shark: {
        name: 'Shark',
        icon: '🦈',
        description: 'Aggressive counters, short patience. Runs the table at Art Basel.',
        patience: 3,
        greedFactor: 1.3,
        bluffResistance: 0.4,
        weakTo: 'walkAway',
        strongAgainst: 'holdFirm',
        counterStyle: 'aggressive',
        dialoguePool: 'shark',
        haggleStyle: HAGGLE_TYPES.AGGRESSIVE,
        lore: 'Has 20 gallery locations worldwide. Inventory worth more than some countries\' GDP. Will call your bluff and then call your mother.',
    },
    patron: {
        name: 'Patron',
        icon: '🎩',
        description: 'Values relationships over profit. Hosts dinners at the Chateau.',
        patience: 5,
        greedFactor: 1.0,
        bluffResistance: 0.6,
        weakTo: 'holdFirm',
        strongAgainst: 'walkAway',
        counterStyle: 'warm',
        dialoguePool: 'patron',
        haggleStyle: HAGGLE_TYPES.EMOTIONAL,
        lore: 'Third-generation collector. Has a Rothko in the bathroom. Sponsors emerging artists not for profit but "for the culture."',
    },
    calculator: {
        name: 'Calculator',
        icon: '🧮',
        description: 'Purely price-driven, ignores charm. Has spreadsheets for spreadsheets.',
        patience: 4,
        greedFactor: 1.15,
        bluffResistance: 0.3,
        weakTo: 'bluff',
        strongAgainst: 'holdFirm',
        counterStyle: 'analytical',
        dialoguePool: 'calculator',
        haggleStyle: HAGGLE_TYPES.LOGICAL,
        lore: 'Former Goldman analyst who pivoted to art advising. Treats auction results like earnings reports. Has never been emotionally moved by a painting.',
    },
    nervous: {
        name: 'Nervous',
        icon: '😰',
        description: 'Folds under pressure quickly. First time at the fair.',
        patience: 2,
        greedFactor: 0.9,
        bluffResistance: 0.7,
        weakTo: 'raise',
        strongAgainst: 'bluff',
        counterStyle: 'anxious',
        dialoguePool: 'nervous',
        haggleStyle: HAGGLE_TYPES.EMOTIONAL,
        lore: 'Inherited a collection they don\'t understand. Googles "is my painting expensive" before every meeting.',
    },
    collector: {
        name: 'Collector',
        icon: '🖼️',
        description: 'Emotionally attached, values the art itself more than profit.',
        patience: 4,
        greedFactor: 1.2,
        bluffResistance: 0.5,
        weakTo: 'blueOption',
        strongAgainst: 'walkAway',
        counterStyle: 'passionate',
        dialoguePool: 'collector',
        haggleStyle: HAGGLE_TYPES.EMOTIONAL,
        lore: 'Sleeps in a room surrounded by their collection. Names their paintings. Once turned down $5M because "it would be lonely without it."',
    },
    hustler: {
        name: 'Young Hustler',
        icon: '⚡',
        description: 'Fast-talking, tries to rush the deal. Operates from Instagram DMs.',
        patience: 3,
        greedFactor: 1.1,
        bluffResistance: 0.35,
        weakTo: 'holdFirm',
        strongAgainst: 'raise',
        counterStyle: 'fast',
        dialoguePool: 'hustler',
        haggleStyle: HAGGLE_TYPES.FINANCIAL,
        lore: 'Unlicensed dealer who "knows a guy." Flipped 15 works last month. Has zero provenance documentation and considers that a feature.',
    },

    // ── NEW DEALER TYPES ──

    curator: {
        name: 'Institutional Curator',
        icon: '🏛️',
        description: 'Speaks in art jargon, weaponizes institutional authority.',
        patience: 5,
        greedFactor: 0.85, // Institutions pay less
        bluffResistance: 0.65,
        weakTo: 'bluff',
        strongAgainst: 'raise',
        counterStyle: 'institutional',
        dialoguePool: 'curator',
        haggleStyle: HAGGLE_TYPES.LOGICAL,
        lore: 'Studied at Rietveld, interned at Witte de With, has installed shows at Stedelijk. Uses "problematizes" in casual conversation. Their artist statement for a cup of coffee would be 300 words.',
    },
    speculator: {
        name: 'Speculator',
        icon: '📈',
        description: 'Treats art as pure investment vehicle. No sentiment, only alpha.',
        patience: 3,
        greedFactor: 1.4,
        bluffResistance: 0.2,
        weakTo: 'walkAway',
        strongAgainst: 'bluff',
        counterStyle: 'calculated',
        dialoguePool: 'speculator',
        haggleStyle: HAGGLE_TYPES.FINANCIAL,
        lore: 'Bought 15 works by an artist nobody knows. Yet. Has a "portfolio theory" for art allocation. Considers beauty a "beta factor."',
    },
    advisor: {
        name: 'Art Advisor',
        icon: '💄',
        description: 'Smooth, connected, possibly working for both sides.',
        patience: 4,
        greedFactor: 1.05,
        bluffResistance: 0.55,
        weakTo: 'raise',
        strongAgainst: 'walkAway',
        counterStyle: 'diplomatic',
        dialoguePool: 'advisor',
        haggleStyle: HAGGLE_TYPES.EMOTIONAL,
        lore: 'Knows the gallery director personally. Has been "looking at your portfolio." Charges 10% from both buyer and seller and calls it "alignment of interests."',
    },
};

// ════════════════════════════════════════════
// Player Tactics (8 base tactics)
// ════════════════════════════════════════════
export const TACTICS = {
    raise: {
        id: 'raise',
        type: HAGGLE_TYPES.FINANCIAL,
        label: '💰 Raise Offer',
        description: 'Increase your offer — shows good faith but costs more',
        baseSuccess: 0.6,
        priceShift: 0.15,
        statBonus: 'cash',
        statWeight: 0.001,
        patienceEffect: 1,
        heatGain: 0,
        suspicionGain: 0,
        unlockStat: null,
        unlockMin: 0,
        animType: 'coin',
        phase: null, // Available in all phases
    },
    holdFirm: {
        id: 'holdFirm',
        type: HAGGLE_TYPES.LOGICAL,
        label: '🤝 Hold Firm',
        description: 'Repeat your price — uses reputation as leverage',
        baseSuccess: 0.35,
        priceShift: 0,
        statBonus: 'reputation',
        statWeight: 0.005,
        patienceEffect: -1,
        heatGain: 0,
        suspicionGain: 0,
        unlockStat: null,
        unlockMin: 0,
        animType: 'shield',
        phase: null,
    },
    walkAway: {
        id: 'walkAway',
        type: HAGGLE_TYPES.AGGRESSIVE,
        label: '🗡️ Walk Away',
        description: 'Threaten to leave — risky, they might let you go',
        baseSuccess: 0.25,
        priceShift: -0.1,
        statBonus: 'audacity',
        statWeight: 0.006,
        patienceEffect: -2,
        heatGain: 1,
        suspicionGain: 0,
        unlockStat: null,
        unlockMin: 0,
        animType: 'slash',
        phase: null,
    },
    bluff: {
        id: 'bluff',
        type: HAGGLE_TYPES.EMOTIONAL,
        label: '🎭 Bluff',
        description: 'Claim you have another offer — big swing, requires Intel',
        baseSuccess: 0.45,
        priceShift: -0.2,
        statBonus: 'intel',
        statWeight: 0.008,
        patienceEffect: -1,
        heatGain: 2,
        suspicionGain: 2,
        unlockStat: 'intel',
        unlockMin: 30,
        animType: 'shadow',
        phase: null,
    },

    // ── NEW TACTICS ──

    flatter: {
        id: 'flatter',
        type: HAGGLE_TYPES.EMOTIONAL,
        label: '💐 Flatter',
        description: 'Compliment their eye, their collection, their taste — everyone loves to hear it',
        baseSuccess: 0.5,
        priceShift: -0.05,
        statBonus: 'taste',
        statWeight: 0.004,  // Your own taste makes flattery more convincing
        patienceEffect: 1,
        heatGain: 0,
        suspicionGain: 1,
        unlockStat: null,
        unlockMin: 0,
        animType: 'charm',
        phase: null,
    },
    questionProvenance: {
        id: 'questionProvenance',
        type: HAGGLE_TYPES.LOGICAL,
        label: '🔍 Question Provenance',
        description: 'Ask about exhibition history, previous owners, documentation gaps',
        baseSuccess: 0.4,
        priceShift: -0.15,
        statBonus: 'intel',
        statWeight: 0.006,
        patienceEffect: -1,
        heatGain: 1,
        suspicionGain: 0,
        unlockStat: 'intel',
        unlockMin: 25,
        animType: 'shadow',
        phase: null,
    },
    invokeMarket: {
        id: 'invokeMarket',
        type: HAGGLE_TYPES.FINANCIAL,
        label: '📊 Invoke Market Data',
        description: 'Quote auction results, comparable sales, market indices',
        baseSuccess: 0.45,
        priceShift: -0.1,
        statBonus: 'intel',
        statWeight: 0.005,
        patienceEffect: 0,
        heatGain: 0,
        suspicionGain: 0,
        unlockStat: 'intel',
        unlockMin: 20,
        animType: 'coin',
        phase: null,
    },
    silence: {
        id: 'silence',
        type: HAGGLE_TYPES.AGGRESSIVE,
        label: '🤫 Strategic Silence',
        description: 'Say nothing. Let them fill the uncomfortable void.',
        baseSuccess: 0.3,
        priceShift: -0.08,
        statBonus: 'audacity',
        statWeight: 0.007,
        patienceEffect: -1,
        heatGain: 0,
        suspicionGain: 0,
        unlockStat: 'audacity',
        unlockMin: 15,
        animType: 'shield',
        phase: null,
    },
};

// ════════════════════════════════════════════
// Blue Options (stat-gated premium tactics)
// Satirical art-world power moves
// ════════════════════════════════════════════
export const BLUE_OPTIONS = [
    // ── ORIGINAL BLUE OPTIONS ──
    {
        id: 'museumLoan',
        type: HAGGLE_TYPES.EMOTIONAL,
        label: '★ Mention your museum loan',
        description: 'Name-drop your institutional connections',
        requiredStat: 'taste',
        requiredMin: 50,
        baseSuccess: 0.7,
        priceShift: -0.15,
        patienceEffect: 0,
        heatGain: 0,
        suspicionGain: 0,
        animType: 'charm',
        dialogue: '"I\'ve been discussing a museum loan program with the Tate Modern. This piece would fit perfectly in the collection I\'m curating."',
    },
    {
        id: 'insiderInfo',
        type: HAGGLE_TYPES.LOGICAL,
        label: '★ Share insider market intel',
        description: 'Reveal you know something they don\'t',
        requiredStat: 'intel',
        requiredMin: 60,
        baseSuccess: 0.65,
        priceShift: -0.2,
        patienceEffect: 1,
        heatGain: 1,
        suspicionGain: 1,
        animType: 'shadow',
        dialogue: '"I have it on good authority that this artist\'s next show is already sold out. The market\'s about to shift."',
    },
    {
        id: 'socialProof',
        type: HAGGLE_TYPES.EMOTIONAL,
        label: '★ Name-drop a mutual contact',
        description: 'Leverage your network',
        requiredStat: 'access',
        requiredMin: 45,
        baseSuccess: 0.55,
        priceShift: -0.1,
        patienceEffect: 1,
        heatGain: 0,
        suspicionGain: 0,
        animType: 'charm',
        dialogue: '"Marcus Thorne mentioned you might be open to negotiation. He speaks very highly of you."',
    },
    {
        id: 'craquelure',
        type: HAGGLE_TYPES.AGGRESSIVE,
        label: '★ Point out condition issues',
        description: 'Your trained eye spots something others miss',
        requiredStat: 'taste',
        requiredMin: 70,
        baseSuccess: 0.6,
        priceShift: -0.25,
        patienceEffect: -1,
        heatGain: 0,
        suspicionGain: 1,
        animType: 'slash',
        dialogue: '"I notice faint craquelure along the lower right edge. Nothing serious, but it does affect valuation. You see it, don\'t you?"',
    },
    {
        id: 'hardLowball',
        type: HAGGLE_TYPES.AGGRESSIVE,
        label: '★ Hard Lowball',
        description: 'Drop a number so low it\'s an insult — then dare them to blink',
        requiredStat: 'audacity',
        requiredMin: 50,
        baseSuccess: 0.35,
        priceShift: -0.35,
        patienceEffect: -2,
        heatGain: 3,
        suspicionGain: 0,
        animType: 'slash',
        dialogue: '"I\'ll be honest — I could get this at auction for half that. So let\'s both save the theatre."',
    },

    // ── NEW BLUE OPTIONS ──
    {
        id: 'relationalAesthetics',
        type: HAGGLE_TYPES.EMOTIONAL,
        label: '★ Deploy relational aesthetics',
        description: 'Reframe the transaction as a "relational artwork" — Bourriaud would be proud',
        requiredStat: 'taste',
        requiredMin: 60,
        baseSuccess: 0.65,
        priceShift: -0.12,
        patienceEffect: 2,
        heatGain: 0,
        suspicionGain: 0,
        animType: 'charm',
        dialogue: '"This isn\'t a sale — this is a relational encounter. The artwork exists in the space between us right now. The price is just a gesture toward the meaning we\'re co-creating."',
    },
    {
        id: 'institutionalCritique',
        type: HAGGLE_TYPES.LOGICAL,
        label: '★ Invoke institutional critique',
        description: 'Question the gallery system\'s markup and overhead — make them defend their 50%',
        requiredStat: 'intel',
        requiredMin: 55,
        baseSuccess: 0.55,
        priceShift: -0.18,
        patienceEffect: -1,
        heatGain: 2,
        suspicionGain: 0,
        animType: 'shadow',
        dialogue: '"You know, Hans Haacke made an entire career out of exposing gallery markup structures. I wonder what he\'d say about this price point. What\'s the gallery\'s cut here — the standard fifty?"',
    },
    {
        id: 'curatorName',
        type: HAGGLE_TYPES.EMOTIONAL,
        label: '★ Name the next documenta curator',
        description: 'Casually drop that you know who\'s curating the next major exhibition',
        requiredStat: 'access',
        requiredMin: 70,
        baseSuccess: 0.75,
        priceShift: -0.15,
        patienceEffect: 1,
        heatGain: 0,
        suspicionGain: 2,
        animType: 'charm',
        dialogue: '"I was having dinner with Naomi last week — she\'s planning something extraordinary for documenta. This artist would be perfect. I could make an introduction..."',
    },
    {
        id: 'fakeCompetitor',
        type: HAGGLE_TYPES.AGGRESSIVE,
        label: '★ Fabricate an auction rumor',
        description: 'Claim you heard this artist is about to hit the secondary market hard',
        requiredStat: 'audacity',
        requiredMin: 65,
        baseSuccess: 0.5,
        priceShift: -0.22,
        patienceEffect: -1,
        heatGain: 3,
        suspicionGain: 3,
        animType: 'slash',
        dialogue: '"Between us? I heard Christie\'s is sitting on six consignments of this artist for the autumn sales. That\'s going to flood the market. You might want to move this now."',
    },
    {
        id: 'philanthropyAngle',
        type: HAGGLE_TYPES.EMOTIONAL,
        label: '★ Promise a public donation',
        description: 'Suggest you\'ll donate a work to a public collection — tax deductible halo effect',
        requiredStat: 'reputation',
        requiredMin: 55,
        baseSuccess: 0.6,
        priceShift: -0.1,
        patienceEffect: 2,
        heatGain: 0,
        suspicionGain: 1,
        animType: 'charm',
        dialogue: '"I\'ve been in discussions with the Park Foundation about a long-term loan program. If this piece enters my collection, it has a path to public display. That matters to you, doesn\'t it?"',
    },
    {
        id: 'artJargonBlitz',
        type: HAGGLE_TYPES.LOGICAL,
        label: '★ Art jargon blitz',
        description: 'Overwhelm them with so much theory they forget they\'re negotiating',
        requiredStat: 'taste',
        requiredMin: 80,
        baseSuccess: 0.55,
        priceShift: -0.15,
        patienceEffect: 0,
        heatGain: 0,
        suspicionGain: 2,
        animType: 'shadow',
        dialogue: '"This piece problematizes the liminal space between spectacle and intimacy. It interrogates our post-internet condition while gesturing toward a phenomenological recalibration of... sorry, where were we? The price. Right. I think we were lower."',
    },
    {
        id: 'provenanceTrip',
        type: HAGGLE_TYPES.AGGRESSIVE,
        label: '★ Question the provenance chain',
        description: 'Demand to see documentation — every gap costs them',
        requiredStat: 'intel',
        requiredMin: 75,
        baseSuccess: 0.6,
        priceShift: -0.28,
        patienceEffect: -2,
        heatGain: 2,
        suspicionGain: 0,
        animType: 'slash',
        dialogue: '"I see a gap between 2003 and 2011 in the provenance. Eight years unaccounted for. Where was this work? Who stored it? Under what conditions? That uncertainty has to be reflected in the price."',
    },
    {
        id: 'veniceInvite',
        type: HAGGLE_TYPES.FINANCIAL,
        label: '★ Dangle a Venice invitation',
        description: 'Hint that you can get them into Venice Biennale events — the ultimate social currency',
        requiredStat: 'access',
        requiredMin: 80,
        baseSuccess: 0.7,
        priceShift: -0.18,
        patienceEffect: 2,
        heatGain: 0,
        suspicionGain: 1,
        animType: 'coin',
        dialogue: '"I have two extra passes to the Arsenale preview in June. The kind of access money can\'t buy. Perhaps we could discuss this artwork... and dinner plans in Venice."',
    },
    {
        id: 'masterClass',
        type: HAGGLE_TYPES.LOGICAL,
        label: '★ The Connoisseur\'s Lecture',
        description: 'Demonstrate such deep knowledge of the artist that they feel embarrassed to overcharge you',
        requiredStat: 'taste',
        requiredMin: 90,
        baseSuccess: 0.75,
        priceShift: -0.2,
        patienceEffect: 1,
        heatGain: 0,
        suspicionGain: 0,
        animType: 'charm',
        dialogue: '"This is from their Berlin period, isn\'t it? Right after the Secession show. You can see how they\'ve resolved the tension between the Khartoum School influence and the CoBrA spontaneity. The blow-drying technique here creates that crackling depth. It\'s stunning. Now — shall we talk numbers?"',
    },
    {
        id: 'deaccession',
        type: HAGGLE_TYPES.FINANCIAL,
        label: '★ Offer a swap deal',
        description: 'Propose trading a work from your collection instead of cash — the art world barter',
        requiredStat: 'reputation',
        requiredMin: 65,
        baseSuccess: 0.5,
        priceShift: -0.3,
        patienceEffect: 0,
        heatGain: 1,
        suspicionGain: 0,
        animType: 'coin',
        dialogue: '"What if instead of cash, I offered you a trade? I have an early work by someone whose secondary market is about to explode. A swap benefits us both — and avoids the taxable event."',
    },
    {
        id: 'walkIntoCall',
        type: HAGGLE_TYPES.AGGRESSIVE,
        label: '★ Take a fake phone call',
        description: 'Stage an interrupting call from a "collector" wanting the same work',
        requiredStat: 'audacity',
        requiredMin: 40,
        baseSuccess: 0.4,
        priceShift: -0.1,
        patienceEffect: -1,
        heatGain: 2,
        suspicionGain: 3,
        animType: 'slash',
        dialogue: '"Sorry — one second. ...Yes, the one we discussed. Mm-hmm. I\'m actually looking at it right now. ...I\'ll let you know. Sorry about that. Where were we?"',
    },
];

// ════════════════════════════════════════════
// Tactic Presets (reusable templates)
// ════════════════════════════════════════════
export const TACTIC_PRESETS = {
    safe_opener: {
        name: '🛡️ Safe Opener',
        description: 'Conservative opening for unfamiliar dealers',
        tactics: ['raise', 'flatter', 'holdFirm'],
        strategy: 'Open with Flatter to build rapport, then Raise to show good faith. Hold Firm if they push back.',
    },
    art_snob: {
        name: '🎓 Art Snob',
        description: 'Weaponize your knowledge advantage',
        tactics: ['questionProvenance', 'invokeMarket', 'artJargonBlitz', 'masterClass'],
        strategy: 'Question Provenance to create doubt, Invoke Market Data to back it up, then deploy Art Jargon Blitz or Connoisseur Lecture to dominate.',
    },
    high_roller: {
        name: '💎 High Roller',
        description: 'When you have the cash to back up confidence',
        tactics: ['raise', 'veniceInvite', 'philanthropyAngle', 'deaccession'],
        strategy: 'Lead with Raise, then pivot to Venice Invite or Philanthropy to sweeten. Use Deaccession to reduce cash outlay.',
    },
    pressure_play: {
        name: '🔥 Pressure Play',
        description: 'Maximum aggression for big discounts',
        tactics: ['walkAway', 'hardLowball', 'fakeCompetitor', 'silence'],
        strategy: 'Hard Lowball to anchor low, Strategic Silence to let them sweat, Walk Away if they resist. High risk, high reward.',
    },
    social_butterfly: {
        name: '🦋 Social Butterfly',
        description: 'Leverage connections and relationships',
        tactics: ['flatter', 'socialProof', 'curatorName', 'museumLoan'],
        strategy: 'Flatter first, then Name-Drop to establish credentials. Museum Loan or Curator Name for the kill shot.',
    },
    institutional: {
        name: '🏛️ Institutional Play',
        description: 'You represent a collection or foundation',
        tactics: ['museumLoan', 'institutionalCritique', 'philanthropyAngle', 'holdFirm'],
        strategy: 'Lead with Museum Loan authority. Use Institutional Critique to question their pricing. Philanthropy as sweetener.',
    },
};

// ════════════════════════════════════════════
// Tactic Dialogue Choices
// When a player picks a tactic, they choose HOW to execute it.
// Each choice has different effectiveness per dealer type.
// effectiveness: 'good' = +15% success, 'neutral' = baseline, 'bad' = -15%
// ════════════════════════════════════════════
export const TACTIC_DIALOGUE_CHOICES = {
    raise: [
        {
            id: 'raise_generous',
            line: '"I want to be fair. Let me come up substantially."',
            tone: 'sincere',
            effectiveness: { patron: 'good', collector: 'good', nervous: 'good', shark: 'neutral', calculator: 'neutral', hustler: 'neutral', curator: 'neutral', speculator: 'bad', advisor: 'neutral' },
        },
        {
            id: 'raise_strategic',
            line: '"Based on the comparables, I can justify moving to this number."',
            tone: 'analytical',
            effectiveness: { calculator: 'good', speculator: 'good', advisor: 'good', shark: 'neutral', patron: 'neutral', curator: 'neutral', hustler: 'bad', nervous: 'neutral', collector: 'bad' },
        },
        {
            id: 'raise_casual',
            line: '"Alright, alright — let me bump it up. We\'re close."',
            tone: 'friendly',
            effectiveness: { hustler: 'good', patron: 'good', advisor: 'neutral', shark: 'bad', calculator: 'bad', nervous: 'neutral', collector: 'neutral', curator: 'bad', speculator: 'neutral' },
        },
    ],
    holdFirm: [
        {
            id: 'hold_reputation',
            line: '"My track record speaks for itself. This is what I pay."',
            tone: 'authoritative',
            effectiveness: { shark: 'good', speculator: 'good', advisor: 'neutral', patron: 'neutral', calculator: 'neutral', nervous: 'good', hustler: 'neutral', collector: 'bad', curator: 'neutral' },
        },
        {
            id: 'hold_principled',
            line: '"I\'ve done my research. This price is fair for both of us."',
            tone: 'logical',
            effectiveness: { calculator: 'good', curator: 'good', advisor: 'good', patron: 'neutral', nervous: 'neutral', shark: 'neutral', speculator: 'neutral', hustler: 'bad', collector: 'neutral' },
        },
        {
            id: 'hold_patient',
            line: '"I\'m in no rush. Take your time to consider."',
            tone: 'calm',
            effectiveness: { nervous: 'good', collector: 'good', patron: 'good', curator: 'neutral', shark: 'bad', hustler: 'bad', calculator: 'neutral', speculator: 'bad', advisor: 'neutral' },
        },
    ],
    walkAway: [
        {
            id: 'walk_cold',
            line: '"We\'re too far apart. I\'m going to pass."',
            tone: 'cold',
            effectiveness: { nervous: 'good', patron: 'good', advisor: 'good', shark: 'neutral', hustler: 'neutral', calculator: 'neutral', collector: 'bad', curator: 'bad', speculator: 'neutral' },
        },
        {
            id: 'walk_dramatic',
            line: "\"Thank you for your time. I'll be at the next booth.\"",
            tone: 'theatrical',
            effectiveness: { shark: 'good', hustler: 'good', speculator: 'neutral', patron: 'neutral', nervous: 'good', calculator: 'bad', collector: 'bad', curator: 'neutral', advisor: 'neutral' },
        },
    ],
    bluff: [
        {
            id: 'bluff_competitor',
            line: '"I actually have another offer lined up — better terms, too."',
            tone: 'confident',
            effectiveness: { nervous: 'good', hustler: 'good', patron: 'neutral', shark: 'neutral', advisor: 'neutral', calculator: 'bad', collector: 'bad', curator: 'bad', speculator: 'neutral' },
        },
        {
            id: 'bluff_insider',
            line: '"Between us, I have intel that changes the picture here."',
            tone: 'conspiratorial',
            effectiveness: { speculator: 'good', advisor: 'good', shark: 'good', calculator: 'neutral', patron: 'bad', nervous: 'neutral', collector: 'bad', curator: 'neutral', hustler: 'neutral' },
        },
        {
            id: 'bluff_deadline',
            line: '"My collector is flying out tomorrow. This needs to happen today."',
            tone: 'urgent',
            effectiveness: { hustler: 'good', nervous: 'good', shark: 'neutral', patron: 'neutral', calculator: 'neutral', advisor: 'neutral', collector: 'bad', curator: 'bad', speculator: 'good' },
        },
    ],
    flatter: [
        {
            id: 'flatter_taste',
            line: '"Your eye is extraordinary. Nobody curates a collection like this."',
            tone: 'admiring',
            effectiveness: { collector: 'good', patron: 'good', curator: 'good', shark: 'neutral', nervous: 'good', advisor: 'neutral', hustler: 'bad', calculator: 'bad', speculator: 'bad' },
        },
        {
            id: 'flatter_reputation',
            line: '"Everyone in the scene talks about you. You\'re the real deal."',
            tone: 'impressed',
            effectiveness: { hustler: 'good', shark: 'good', advisor: 'good', patron: 'neutral', nervous: 'neutral', speculator: 'neutral', calculator: 'bad', collector: 'neutral', curator: 'bad' },
        },
        {
            id: 'flatter_knowledge',
            line: '"I can tell you really understand this artist\'s trajectory."',
            tone: 'intellectual',
            effectiveness: { curator: 'good', calculator: 'good', speculator: 'good', collector: 'good', patron: 'neutral', shark: 'bad', nervous: 'neutral', hustler: 'bad', advisor: 'neutral' },
        },
    ],
    questionProvenance: [
        {
            id: 'prov_gentle',
            line: '"Could you walk me through the exhibition history?"',
            tone: 'curious',
            effectiveness: { patron: 'good', curator: 'good', collector: 'neutral', nervous: 'neutral', advisor: 'neutral', shark: 'neutral', calculator: 'neutral', hustler: 'bad', speculator: 'bad' },
        },
        {
            id: 'prov_aggressive',
            line: '"There are gaps in the provenance. I need documentation."',
            tone: 'demanding',
            effectiveness: { nervous: 'good', hustler: 'good', shark: 'neutral', speculator: 'neutral', calculator: 'neutral', advisor: 'neutral', patron: 'bad', collector: 'bad', curator: 'bad' },
        },
    ],
    invokeMarket: [
        {
            id: 'market_data',
            line: '"The last three auction results averaged 20% below this ask."',
            tone: 'factual',
            effectiveness: { calculator: 'good', speculator: 'good', advisor: 'good', shark: 'neutral', curator: 'neutral', patron: 'neutral', hustler: 'bad', nervous: 'neutral', collector: 'bad' },
        },
        {
            id: 'market_trend',
            line: '"The market is cooling. Smart money is waiting."',
            tone: 'warning',
            effectiveness: { nervous: 'good', speculator: 'good', hustler: 'neutral', shark: 'neutral', advisor: 'neutral', calculator: 'neutral', patron: 'bad', collector: 'bad', curator: 'bad' },
        },
    ],
    silence: [
        {
            id: 'silence_stare',
            line: '...',
            tone: 'intense',
            effectiveness: { nervous: 'good', hustler: 'good', patron: 'neutral', shark: 'neutral', advisor: 'neutral', calculator: 'bad', collector: 'neutral', curator: 'bad', speculator: 'neutral' },
        },
        {
            id: 'silence_sip',
            line: '*takes a slow sip of champagne*',
            tone: 'unbothered',
            effectiveness: { shark: 'good', patron: 'good', collector: 'good', curator: 'neutral', advisor: 'neutral', speculator: 'neutral', hustler: 'bad', nervous: 'neutral', calculator: 'bad' },
        },
    ],
};

// Effectiveness modifiers
export const DIALOGUE_EFFECTIVENESS = {
    good: 0.15,     // +15% success bonus
    neutral: 0,     // baseline
    bad: -0.15,     // -15% success penalty
};

// ════════════════════════════════════════════
// Battle Menu Categories (Pokemon-style)
// ════════════════════════════════════════════
export const BATTLE_MENU_CATEGORIES = [
    { id: 'tactics', label: 'TACTICS', icon: '⚔️', color: '#c9a84c', description: 'Base negotiation moves' },
    { id: 'powers', label: 'POWERS', icon: '⭐', color: '#60a5fa', description: 'Stat-gated special moves' },
    { id: 'info', label: 'INFO', icon: '📊', color: '#888', description: 'View dealer stats and round info' },
    { id: 'deal', label: 'DEAL', icon: '🤝', color: '#4ade80', description: 'Extend hand or walk away' },
];

// ════════════════════════════════════════════
// Dialogue Templates (per dealer personality)
// ════════════════════════════════════════════
export const DEALER_DIALOGUE = {
    // Opening lines (when haggle starts)
    opening: {
        shark: [
            '"Let\'s not waste each other\'s time. I know what this is worth."',
            '"You want this? So does everyone else."',
            '"I\'ve turned down three offers this morning. Make yours count."',
            '"The smartest move you can make today is saying yes to my number."',
        ],
        patron: [
            '"What a pleasure. Shall we discuss terms?"',
            '"I do love these conversations. Art is about connection, after all."',
            '"Ah, you have a wonderful eye. This piece has been waiting for someone like you."',
            '"I always say — the best transactions are the ones that feel like friendships."',
        ],
        calculator: [
            '"Here are the numbers. The market says—"',
            '"I\'ve run the comps. Here\'s where we stand."',
            '"Based on lot 47B from the evening sale and adjusted for medium, I arrive at—"',
            '"Let me pull up the Artnet analytics. The 12-month price trend suggests—"',
        ],
        nervous: [
            '"Oh, you\'re interested? That\'s... that\'s great."',
            '"I wasn\'t sure anyone would — well, let\'s talk."',
            '"My advisor said I should hold firm on the price, but... I\'m open to suggestions."',
            '"I know it\'s expensive. Is it too expensive? I can\'t tell anymore."',
        ],
        collector: [
            '"This piece means a great deal to me. I need to know it\'s going to the right home."',
            '"Do you truly appreciate what you\'re looking at?"',
            '"I lived with this work for seventeen years. Every morning I saw something new in it."',
            '"Before we discuss numbers — tell me why you want this."',
        ],
        hustler: [
            '"Yo, I got three people texting me about this right now. You in or what?"',
            '"Quick — this won\'t last. What\'s your number?"',
            '"No cap, this is the last one. The artist pulled the others for a museum show."',
            '"DM from Sotheby\'s. Clock is ticking, bestie."',
        ],
        curator: [
            '"This work occupies a fascinating space between institutional critique and post-relational aesthetics."',
            '"As I was telling the Stedelijk\'s acquisitions committee last week—"',
            '"The asking price reflects the work\'s position within a broader discursive framework."',
            '"Before we discuss terms, I should mention — this piece was in our Venice presentation."',
        ],
        speculator: [
            '"The secondary market delta on this artist is +340% over 18 months."',
            '"I have a thesis on this position. Want to hear it?"',
            '"This isn\'t just art. It\'s an asymmetric bet with institutional tailwind."',
            '"My quant model flagged this artist six months before the Whitney show."',
        ],
        advisor: [
            '"Let me handle this. I know the gallery director personally."',
            '"I\'ve been looking at your portfolio. This would complement the Tanaka beautifully."',
            '"Between us? My other client passed on this. Their loss, your opportunity."',
            '"I have a unique relationship with this gallery. We can get a better number."',
        ],
    },

    // Response to RAISE
    onRaise: {
        shark: ['"Getting warmer. But we\'re not there yet."', '"That\'s more like it. Keep going."', '"You can do better. I saw your last purchase."'],
        patron: ['"I appreciate the gesture. We\'re getting closer."', '"Your generosity speaks well of you."', '"How thoughtful. I think we can make this work."'],
        calculator: ['"Noted. That moves us %PERCENT% closer to fair value."', '"Adjusting... still a gap of $%GAP%."', '"That narrows the delta to within acceptable variance."'],
        nervous: ['"Oh! That\'s — yes, that\'s better. Much better."', '"Really? Oh wow, okay."', '"I was so worried you\'d lowball me. Thank you."'],
        collector: ['"Hmm. I see you\'re serious about this."', '"Money isn\'t everything, but... that helps."', '"The fact that you\'re willing to pay more means you understand."'],
        hustler: ['"Now we\'re cooking! Almost there, fam."', '"Bet! One more bump and we\'re golden."', '"See? That wasn\'t so hard. We\'re almost locked."'],
        curator: ['"The institution appreciates the revised offer. I\'ll take it to the committee."', '"That figure better reflects the work\'s discursive value."'],
        speculator: ['"That improves the return profile. I could redeploy the capital."', '"The bid-ask spread is narrowing. Getting interesting."'],
        advisor: ['"Good move. I think they\'ll take that."', '"Smart. You\'re showing respect without overpaying."'],
    },

    // Response to HOLD FIRM
    onHoldFirm: {
        shark: ['"You\'re wasting my time."', '"I respect the persistence. But my price holds too."'],
        patron: ['"I admire conviction. Let me think..."', '"Steadfast. I like that in a collector."'],
        calculator: ['"The numbers don\'t change just because you repeat them."', '"Stalemate noted. Perhaps we should reconsider."'],
        nervous: ['"I... I don\'t know if I can... maybe..."', '"You\'re making me nervous. But okay, let me think."'],
        collector: ['"It\'s not about the money for me."', '"Stubbornness is not the same as taste."'],
        hustler: ['"Bro, time is money. We moving or not?"', '"Aight, I see you. But I got other offers."'],
        curator: ['"The work\'s institutional importance transcends the current negotiation."', '"I understand. Let me reframe — this isn\'t a price, it\'s a valuation."'],
        speculator: ['"Static positions bore me. Give me a reason to stay in this trade."', '"You\'re not pricing in the optionality."'],
        advisor: ['"Bold strategy. Let me see if the gallery will budge."', '"I like the conviction. Let me work on them."'],
    },

    // Response to WALK AWAY
    onWalkAway: {
        shark: ['"Go ahead. Walk. ...Wait."', '"Fine. Leave. You\'ll be back."'],
        patron: ['"Oh dear. I wouldn\'t want to lose a friend over this."', '"Please, let\'s not end things this way."'],
        calculator: ['"Your loss. The data supports my price."', '"Leaving? That\'s an emotional decision."'],
        nervous: ['"Wait! Don\'t go! Maybe I was asking too much..."', '"Oh no, please! Let me reconsider!"'],
        collector: ['"Perhaps this piece deserves a more committed buyer."', '"If you can walk away that easily, maybe it\'s not meant for you."'],
        hustler: ['"Yo hold up, hold up. Let me see what I can do."', '"Don\'t test me — but okay, I might flex a little."'],
        curator: ['"The institution will find another venue for this work."', '"Interesting. Most serious collectors don\'t leave."'],
        speculator: ['"Your exit is my entry signal. I\'ll buy this myself."', '"Walking away from alpha. Brave."'],
        advisor: ['"Wait — let me make one call. I can fix this."', '"You\'re leaving value on the table. Let me negotiate."'],
    },

    // Response to BLUFF
    onBluff: {
        shark: ['"Another offer? Show me the proof."', '"I don\'t believe you. But... interesting."'],
        patron: ['"Oh? Competition? How exciting."', '"I see. Well, I wouldn\'t want you to miss an opportunity."'],
        calculator: ['"Interesting claim. I\'ll factor that in."', '"If that\'s true, it changes the equation."'],
        nervous: ['"Someone else wants it?! Oh no..."', '"I knew it. Everyone always — okay, okay."'],
        collector: ['"I don\'t care about other offers. I care about this piece."', '"Your other \'offer\' doesn\'t understand this work like I do."'],
        hustler: ['"Cap. No way you got another bid."', '"Proof or it didn\'t happen, my guy."'],
        curator: ['"The institutional framework doesn\'t respond to market pressure."', '"Interesting claim. We should verify with the registrar."'],
        speculator: ['"I track every transaction in this market. Who\'s the buyer?"', '"Unlikely. My model shows no active bids at that level."'],
        advisor: ['"Oh really? Who\'s the other advisor? I know everyone."', '"Let me check. I have sources at every major gallery."'],
    },

    // Response to BLUE OPTION
    onBlueOption: {
        shark: ['"...That\'s actually impressive. Fine."', '"Okay, you\'ve got connections. I\'ll adjust."'],
        patron: ['"Wonderful! That changes things entirely."', '"I had no idea. Please, let\'s make this work."'],
        calculator: ['"New data point accepted. Recalculating."', '"That changes the risk profile. Let me adjust."'],
        nervous: ['"Really?! Oh that\'s — wow, okay, I trust you."', '"I didn\'t know that. Yes, yes, let\'s do this."'],
        collector: ['"You truly understand this work. I\'m moved."', '"A kindred spirit. Let\'s find the right number."'],
        hustler: ['"Okay okay, you\'re legit. Respect."', '"Aight, you got sauce. Let\'s lock it in."'],
        curator: ['"Your institutional awareness is... refreshing. Let me reconsider."', '"That contexts the work differently. The committee may accept."'],
        speculator: ['"That\'s material non-public information. I\'m adjusting my model."', '"Interesting alpha. My thesis just evolved."'],
        advisor: ['"Excellent intel. This is why you hired me."', '"Perfect. That gives me ammunition for the negotiation."'],
    },

    // Response to FLATTER
    onFlatter: {
        shark: ['"Flattery won\'t change the price. ...But it doesn\'t hurt."'],
        patron: ['"Oh, how kind! You really do understand quality."', '"You\'re too generous. But I accept the compliment."'],
        calculator: ['"Sentiment is not a variable in my model."', '"Appreciated, but irrelevant to the calculation."'],
        nervous: ['"You... you really think so? That means a lot."', '"Nobody ever compliments my collection. Thank you."'],
        collector: ['"Finally, someone who sees what I see."', '"You understand the piece. That matters more than the price."'],
        hustler: ['"Smooth talker. I see you. But yeah, it is fire."', '"Facts. I got taste. Now — your number?"'],
        curator: ['"I appreciate the phenomenological engagement with the work."', '"Your aesthetic literacy is evident."'],
        speculator: ['"Don\'t try to charm me. ...But yes, the thesis is sound."'],
        advisor: ['"Compliments won\'t get me to drop my fee. ...But I appreciate it."'],
    },

    // Response to QUESTION PROVENANCE
    onQuestionProvenance: {
        shark: ['"Everything checks out. You want the paperwork? Fine."', '"The provenance is airtight. Move on."'],
        patron: ['"Oh, I can trace this back to the artist\'s studio. Let me show you..."'],
        calculator: ['"Documentation is available. I\'ve already verified it."'],
        nervous: ['"Oh gosh, I... I think the papers are somewhere... let me look."', '"Provenance? I... my uncle left me these. He didn\'t keep great records."'],
        collector: ['"I acquired this directly from the artist. We were close."'],
        hustler: ['"Provenance, schmovenance. The work speaks for itself."', '"Don\'t worry about the paperwork. It\'s clean. Trust me."'],
        curator: ['"The exhibition history is impeccable. Stedelijk, 2003. Fondation Cartier, 2007."'],
        speculator: ['"Everything is logged. Artnet, Artsy, catalogue raisonné."'],
        advisor: ['"I can provide the full provenance package. That\'s what you\'re paying me for."'],
    },

    // Response to INVOKE MARKET
    onInvokeMarket: {
        shark: ['"You\'re reading yesterday\'s numbers. I have today\'s."'],
        patron: ['"Auction results don\'t capture the intangible value."'],
        calculator: ['"Interesting. But my comps use a different weighting. Let me show you."', '"I ran the same analysis. We\'re using different baselines."'],
        nervous: ['"The market? I don\'t really follow auction results..."'],
        collector: ['"I didn\'t buy this based on the market. I bought it because I love it."'],
        hustler: ['"Markets are for stocks, bro. This is art. It\'s vibes."'],
        curator: ['"Market data is reductive. The work\'s cultural value transcends commercial metrics."'],
        speculator: ['"Finally, someone who speaks my language. Let\'s compare models."', '"That\'s the public data. I have the off-market transactions too."'],
        advisor: ['"I wrote that market report. So yes, I\'m aware."'],
    },

    // Response to STRATEGIC SILENCE
    onSilence: {
        shark: ['"...Nothing? Fine. My price holds."', '"...Alright, you want to play it that way."'],
        patron: ['"...Shall I pour some more tea while we think?"'],
        calculator: ['"...Silence doesn\'t change the numbers."'],
        nervous: ['"...Why aren\'t you saying anything? Did I say something wrong?"', '"...This is making me very uncomfortable."'],
        collector: ['"...I see. You\'re thinking about the work. I respect that."'],
        hustler: ['"...Yo, you still there? Say something!"', '"...This is weird. You want the piece or not?"'],
        curator: ['"...Ah. A performative pause. How very Sehgal."'],
        speculator: ['"...Reading me for information? Good strategy. I respect it."'],
        advisor: ['"...I\'ll take that as dissatisfaction. Let me see what I can do."'],
    },

    // Deal closed (success)
    onDeal: {
        shark: ['"Done. Don\'t make me regret this."', '"Sealed. You got the best price I\'ve given all month."'],
        patron: ['"Wonderful. It\'s been a pleasure doing business."', '"I knew we\'d find common ground. Welcome to the collection."'],
        calculator: ['"Optimal outcome achieved."', '"Transaction logged. Both parties within acceptable parameters."'],
        nervous: ['"Oh thank goodness. I was so worried..."', '"Really? We have a deal? Oh, what a relief."'],
        collector: ['"Take care of it. Promise me."', '"It\'s going to a good home. I can feel it."'],
        hustler: ['"Bet! We locked in. Pleasure."', '"Secure! I\'ll send you the details. Quick and clean."'],
        curator: ['"The institution is pleased with this arrangement."', '"A mutually beneficial outcome that honors the work\'s legacy."'],
        speculator: ['"Position closed. Nice doing business."', '"Good execution. Clean fill."'],
        advisor: ['"Another successful acquisition. That\'s why you work with me."', '"Handled. I\'ll have the paperwork ready tomorrow."'],
    },

    // Walk away (failure)
    onFail: {
        shark: ['"Your loss. Next."', '"I warned you. That piece will sell by tonight."'],
        patron: ['"Such a shame. Perhaps another time."', '"I do hope we can remain friends regardless."'],
        calculator: ['"Sub-optimal. Moving on."', '"Deal did not meet threshold. Terminating."'],
        nervous: ['"I\'m sorry it didn\'t work out..."', '"Maybe I should have... oh well."'],
        collector: ['"The piece deserves better."', '"Some things aren\'t meant to change hands."'],
        hustler: ['"Aight, peace. You missed out."', '"Your loss. Three people in my DMs right now."'],
        curator: ['"The work will find an appropriate institutional home."', '"A missed opportunity for your collection\'s narrative."'],
        speculator: ['"Opportunity cost logged. On to the next trade."', '"You just passed on 3x upside. But okay."'],
        advisor: ['"I couldn\'t get you there. My fee still applies, of course."'],
    },
};

// ════════════════════════════════════════════
// NPC → Dealer Type Mapping
// ════════════════════════════════════════════
// Maps NPC roles from contacts.js to dealer types
export const ROLE_TO_DEALER_TYPE = {
    'gallerist': 'patron',
    'mega_dealer': 'shark',
    'mega-dealer': 'shark',
    'auction': 'calculator',
    'auction-house': 'calculator',
    'collector': 'collector',
    'advisor': 'advisor',
    'fixer': 'hustler',
    'curator': 'curator',
    'journalist': 'nervous',
    'critic': 'collector',
    'speculator': 'speculator',
    'young_hustler': 'hustler',
    'institutional': 'curator',
    'artist': 'nervous',
    'dealer': 'shark',
};

// ════════════════════════════════════════════
// Stat Formulas & Thresholds
// ════════════════════════════════════════════
export const STAT_THRESHOLDS = {
    // At what stat level does the player unlock advanced tactics?
    novice: 0,
    competent: 25,
    skilled: 50,
    expert: 75,
    master: 100,
};

// Stat descriptions for tooltip display
export const STAT_DESCRIPTIONS = {
    cash: {
        name: 'Cash',
        icon: '💵',
        description: 'Money available for acquisitions. Higher cash means you can back up bold offers.',
        haggleEffect: 'Boosts Raise Offer success and unlocks high-value purchases.',
    },
    reputation: {
        name: 'Reputation',
        icon: '⭐',
        description: 'How well-known and respected you are in the art world.',
        haggleEffect: 'Boosts Hold Firm success. High reputation dealers take you more seriously.',
    },
    taste: {
        name: 'Taste',
        icon: '🎨',
        description: 'Your connoisseurship — knowledge of techniques, movements, and quality.',
        haggleEffect: 'Unlocks Museum Loan, Condition Issues, Art Jargon Blitz, and Connoisseur\'s Lecture.',
    },
    intel: {
        name: 'Intel',
        icon: '🕵️',
        description: 'Market intelligence — who\'s buying what, price trends, insider info.',
        haggleEffect: 'Unlocks Bluff, Insider Info, Provenance questioning, and Market Data tactics.',
    },
    audacity: {
        name: 'Audacity',
        icon: '🔥',
        description: 'Your nerve — willingness to take risks and push boundaries.',
        haggleEffect: 'Boosts Walk Away success. Unlocks Hard Lowball and Fake Phone Call.',
    },
    access: {
        name: 'Access',
        icon: '🔑',
        description: 'Your network — who you know and what doors they open.',
        haggleEffect: 'Unlocks Name-Drops, Curator Name-Drop, and Venice Invitation.',
    },
};

// ════════════════════════════════════════════
// Round Configuration
// ════════════════════════════════════════════
export const HAGGLE_CONFIG = {
    minRounds: 2,
    maxRounds: 5,
    proposalSteps: 3,
    proposalStepDuration: 700,

    // Price boundaries
    minOfferPercent: 0.5,
    maxOfferPercent: 1.0,

    // Suspicion penalty: each point of suspicion reduces all success rates
    suspicionPenalty: 0.005,

    // Heat effects on future negotiations
    heatMemory: 0.01,

    // Phase thresholds (round-based)
    openingEndsAt: 1,      // Round 1 = opening phase
    endgameStartsAt: 4,    // Round 4+ = endgame phase (middle is 2-3)

    // Bonus for matching type effectiveness
    superEffectiveMultiplier: 1.5,
    notEffectiveMultiplier: 0.5,

    // Max stats for calculation clamping
    maxStatValue: 100,
};

// ════════════════════════════════════════════
// Battle Sprites — Pixel Art Paths
// ════════════════════════════════════════════
export const PLAYER_SPRITE = 'sprites/player_back.png';

export const DEALER_SPRITES = {
    shark: 'sprites/dealer_shark.png',
    patron: 'sprites/dealer_patron.png',
    calculator: 'sprites/dealer_calculator.png',
    nervous: 'sprites/dealer_nervous.png',
    collector: 'sprites/dealer_collector.png',
    hustler: 'sprites/dealer_hustler.png',
    curator: 'sprites/dealer_curator.png',
    speculator: 'sprites/dealer_speculator.png',
    advisor: 'sprites/dealer_advisor.png',
};

// ════════════════════════════════════════════
// Achievement / Mastery Unlocks
// ════════════════════════════════════════════
export const HAGGLE_ACHIEVEMENTS = {
    first_deal: { name: 'Opening Bid', description: 'Complete your first haggle', icon: '🤝' },
    walk_and_return: { name: 'The Bluff Walk', description: 'Walk away and have them call you back', icon: '🚪' },
    perfect_lowball: { name: 'Art of the Steal', description: 'Land a Hard Lowball successfully', icon: '💀' },
    jargon_master: { name: 'Fluent in Artspeak', description: 'Use Art Jargon Blitz on a Curator', icon: '📚' },
    all_blue_options: { name: 'Full Arsenal', description: 'Unlock all Blue Options', icon: '⭐' },
    beat_shark: { name: 'Bigger Fish', description: 'Get a deal below asking from a Shark', icon: '🦈' },
    beat_speculator: { name: 'Contrarian', description: 'Out-negotiate a Speculator', icon: '📈' },
    connoisseur: { name: 'True Connoisseur', description: 'Use the Connoisseur\'s Lecture (taste ≥ 90)', icon: '🎓' },
    venice_access: { name: 'Arsenale Access', description: 'Dangle a Venice invitation', icon: '🇮🇹' },
    ten_streak: { name: 'Market Maker', description: 'Win 10 haggles in a row', icon: '🏆' },
    no_raise_win: { name: 'Hard Bargainer', description: 'Win without ever using Raise Offer', icon: '💎' },
    nervous_breakdown: { name: 'Too Easy', description: 'Make a Nervous dealer fold in round 1', icon: '😰' },
    provenance_kill: { name: 'Paper Trail', description: 'Get 25%+ discount by questioning provenance', icon: '🔍' },
};
