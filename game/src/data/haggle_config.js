/**
 * haggle_config.js — Data definitions for the Pokémon-style Haggle Battle system
 * 
 * Defines dealer personality types, player tactics, success formulas,
 * dialogue templates, and round configuration.
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
export const TYPE_EFFECTIVENESS = {
    [HAGGLE_TYPES.EMOTIONAL]: { strongAgainst: HAGGLE_TYPES.AGGRESSIVE, weakAgainst: HAGGLE_TYPES.LOGICAL },
    [HAGGLE_TYPES.LOGICAL]: { strongAgainst: HAGGLE_TYPES.EMOTIONAL, weakAgainst: HAGGLE_TYPES.FINANCIAL },
    [HAGGLE_TYPES.AGGRESSIVE]: { strongAgainst: HAGGLE_TYPES.FINANCIAL, weakAgainst: HAGGLE_TYPES.EMOTIONAL },
    [HAGGLE_TYPES.FINANCIAL]: { strongAgainst: HAGGLE_TYPES.LOGICAL, weakAgainst: HAGGLE_TYPES.AGGRESSIVE },
};

// ════════════════════════════════════════════
// Dealer Personality Types
// ════════════════════════════════════════════
export const DEALER_TYPES = {
    shark: {
        name: 'Shark',
        icon: '🦈',
        description: 'Aggressive counters, short patience',
        patience: 3,          // Rounds before they walk away
        greedFactor: 1.3,     // Multiplier on their asking price
        bluffResistance: 0.4, // How well they detect bluffs (0-1)
        weakTo: 'walkAway',   // Tactic they're most vulnerable to (legacy)
        strongAgainst: 'holdFirm', // legacy
        counterStyle: 'aggressive', // How they respond to offers
        dialoguePool: 'shark',
        haggleStyle: HAGGLE_TYPES.AGGRESSIVE, // Strong vs Financial, Weak vs Emotional
    },
    patron: {
        name: 'Patron',
        icon: '🎩',
        description: 'Values relationships over profit',
        patience: 5,
        greedFactor: 1.0,
        bluffResistance: 0.6,
        weakTo: 'holdFirm',
        strongAgainst: 'walkAway',
        counterStyle: 'warm',
        dialoguePool: 'patron',
        haggleStyle: HAGGLE_TYPES.EMOTIONAL, // Strong vs Aggressive, Weak vs Logical
    },
    calculator: {
        name: 'Calculator',
        icon: '🧮',
        description: 'Purely price-driven, ignores charm',
        patience: 4,
        greedFactor: 1.15,
        bluffResistance: 0.3,
        weakTo: 'bluff',
        strongAgainst: 'holdFirm',
        counterStyle: 'analytical',
        dialoguePool: 'calculator',
        haggleStyle: HAGGLE_TYPES.LOGICAL, // Strong vs Emotional, Weak vs Financial
    },
    nervous: {
        name: 'Nervous',
        icon: '😰',
        description: 'Folds under pressure quickly',
        patience: 2,
        greedFactor: 0.9,
        bluffResistance: 0.7,
        weakTo: 'raise',
        strongAgainst: 'bluff',
        counterStyle: 'anxious',
        dialoguePool: 'nervous',
        haggleStyle: HAGGLE_TYPES.EMOTIONAL,
    },
    collector: {
        name: 'Collector',
        icon: '🖼️',
        description: 'Emotionally attached, values the art itself',
        patience: 4,
        greedFactor: 1.2,
        bluffResistance: 0.5,
        weakTo: 'blueOption',
        strongAgainst: 'walkAway',
        counterStyle: 'passionate',
        dialoguePool: 'collector',
        haggleStyle: HAGGLE_TYPES.EMOTIONAL,
    },
    hustler: {
        name: 'Young Hustler',
        icon: '⚡',
        description: 'Fast-talking, tries to rush the deal',
        patience: 3,
        greedFactor: 1.1,
        bluffResistance: 0.35,
        weakTo: 'holdFirm',
        strongAgainst: 'raise',
        counterStyle: 'fast',
        dialoguePool: 'hustler',
        haggleStyle: HAGGLE_TYPES.FINANCIAL, // Strong vs Logical, Weak vs Aggressive
    },
};

// ════════════════════════════════════════════
// Player Tactics
// ════════════════════════════════════════════
export const TACTICS = {
    raise: {
        id: 'raise',
        type: HAGGLE_TYPES.FINANCIAL,
        label: '💰 Raise Offer',
        description: 'Increase your offer — shows good faith but costs more',
        baseSuccess: 0.6,
        priceShift: 0.15,     // Moves price 15% toward their ask
        statBonus: 'cash',    // Higher cash = slight boost (you look serious)
        statWeight: 0.001,    // Per $1000 of cash, +0.1% success
        patienceEffect: 1,    // Restores 1 patience
        heatGain: 0,
        suspicionGain: 0,
        unlockStat: null,
        unlockMin: 0,
        animType: 'coin',
    },
    holdFirm: {
        id: 'holdFirm',
        type: HAGGLE_TYPES.LOGICAL,
        label: '🤝 Hold Firm',
        description: 'Repeat your price — uses reputation as leverage',
        baseSuccess: 0.35,
        priceShift: 0,
        statBonus: 'reputation',
        statWeight: 0.005,    // Per rep point, +0.5% success
        patienceEffect: -1,   // Costs 1 patience
        heatGain: 0,
        suspicionGain: 0,
        unlockStat: null,
        unlockMin: 0,
        animType: 'shield',
    },
    walkAway: {
        id: 'walkAway',
        type: HAGGLE_TYPES.AGGRESSIVE,
        label: '🗡️ Walk Away',
        description: 'Threaten to leave — risky, they might let you go',
        baseSuccess: 0.25,
        priceShift: -0.1,     // If successful, they drop price 10%
        statBonus: 'audacity', // Audacity determines how convincingly you sell the threat
        statWeight: 0.006,
        patienceEffect: -2,
        heatGain: 1,
        suspicionGain: 0,
        unlockStat: null,
        unlockMin: 0,
        animType: 'slash',
    },
    bluff: {
        id: 'bluff',
        type: HAGGLE_TYPES.EMOTIONAL,
        label: '🎭 Bluff',
        description: 'Claim you have another offer — big swing, requires Intel',
        baseSuccess: 0.45,
        priceShift: -0.2,     // If successful, huge price drop
        statBonus: 'intel',
        statWeight: 0.008,
        patienceEffect: -1,
        heatGain: 2,
        suspicionGain: 2,
        unlockStat: 'intel',
        unlockMin: 30,
        animType: 'shadow',
    },
};

// ════════════════════════════════════════════
// Blue Options (stat-gated premium tactics)
// ════════════════════════════════════════════
export const BLUE_OPTIONS = [
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
        priceShift: -0.35,   // Huge drop if it lands
        patienceEffect: -2,
        heatGain: 3,
        suspicionGain: 0,
        animType: 'slash',
        dialogue: '"I\'ll be honest — I could get this at auction for half that. So let\'s both save the theatre."',
    },
];

// ════════════════════════════════════════════
// Dialogue Templates (per dealer personality)
// ════════════════════════════════════════════
export const DEALER_DIALOGUE = {
    // Opening lines (when haggle starts)
    opening: {
        shark: ['"Let\'s not waste each other\'s time. I know what this is worth."', '"You want this? So does everyone else."'],
        patron: ['"What a pleasure. Shall we discuss terms?"', '"I do love these conversations. Art is about connection, after all."'],
        calculator: ['"Here are the numbers. The market says — "', '"I\'ve run the comps. Here\'s where we stand."'],
        nervous: ['"Oh, you\'re interested? That\'s... that\'s great."', '"I wasn\'t sure anyone would — well, let\'s talk."'],
        collector: ['"This piece means a great deal to me. I need to know it\'s going to the right home."', '"Do you truly appreciate what you\'re looking at?"'],
        hustler: ['"Yo, I got three people texting me about this right now. You in or what?"', '"Quick — this won\'t last. What\'s your number?"'],
    },

    // Response to RAISE
    onRaise: {
        shark: ['"Getting warmer. But we\'re not there yet."', '"That\'s more like it. Keep going."'],
        patron: ['"I appreciate the gesture. We\'re getting closer."', '"Your generosity speaks well of you."'],
        calculator: ['"Noted. That moves us %PERCENT% closer to fair value."', '"Adjusting... still a gap of $%GAP%."'],
        nervous: ['"Oh! That\'s — yes, that\'s better. Much better."', '"Really? Oh wow, okay."'],
        collector: ['"Hmm. I see you\'re serious about this."', '"Money isn\'t everything, but... that helps."'],
        hustler: ['"Now we\'re cooking! Almost there, fam."', '"Bet! One more bump and we\'re golden."'],
    },

    // Response to HOLD FIRM
    onHoldFirm: {
        shark: ['"You\'re wasting my time."', '"I respect the persistence. But my price holds too."'],
        patron: ['"I admire conviction. Let me think..."', '"Steadfast. I like that in a collector."'],
        calculator: ['"The numbers don\'t change just because you repeat them."', '"Stalemate noted. Perhaps we should reconsider."'],
        nervous: ['"I... I don\'t know if I can... maybe..."', '"You\'re making me nervous. But okay, let me think."'],
        collector: ['"It\'s not about the money for me."', '"Stubbornness is not the same as taste."'],
        hustler: ['"Bro, time is money. We moving or not?"', '"Aight, I see you. But I got other offers."'],
    },

    // Response to WALK AWAY
    onWalkAway: {
        shark: ['"Go ahead. Walk. ...Wait."', '"Fine. Leave. You\'ll be back."'],
        patron: ['"Oh dear. I wouldn\'t want to lose a friend over this."', '"Please, let\'s not end things this way."'],
        calculator: ['"Your loss. The data supports my price."', '"Leaving? That\'s an emotional decision."'],
        nervous: ['"Wait! Don\'t go! Maybe I was asking too much..."', '"Oh no, please! Let me reconsider!"'],
        collector: ['"Perhaps this piece deserves a more committed buyer."', '"If you can walk away that easily, maybe it\'s not meant for you."'],
        hustler: ['"Yo hold up, hold up. Let me see what I can do."', '"Don\'t test me — but okay, I might flex a little."'],
    },

    // Response to BLUFF
    onBluff: {
        shark: ['"Another offer? Show me the proof."', '"I don\'t believe you. But... interesting."'],
        patron: ['"Oh? Competition? How exciting."', '"I see. Well, I wouldn\'t want you to miss an opportunity."'],
        calculator: ['"Interesting claim. I\'ll factor that in."', '"If that\'s true, it changes the equation."'],
        nervous: ['"Someone else wants it?! Oh no..."', '"I knew it. Everyone always — okay, okay."'],
        collector: ['"I don\'t care about other offers. I care about this piece."', '"Your other \'offer\' doesn\'t understand this work like I do."'],
        hustler: ['"Cap. No way you got another bid."', '"Proof or it didn\'t happen, my guy."'],
    },

    // Response to BLUE OPTION
    onBlueOption: {
        shark: ['"...That\'s actually impressive. Fine."', '"Okay, you\'ve got connections. I\'ll adjust."'],
        patron: ['"Wonderful! That changes things entirely."', '"I had no idea. Please, let\'s make this work."'],
        calculator: ['"New data point accepted. Recalculating."', '"That changes the risk profile. Let me adjust."'],
        nervous: ['"Really?! Oh that\'s — wow, okay, I trust you."', '"I didn\'t know that. Yes, yes, let\'s do this."'],
        collector: ['"You truly understand this work. I\'m moved."', '"A kindred spirit. Let\'s find the right number."'],
        hustler: ['"Okay okay, you\'re legit. Respect."', '"Aight, you got sauce. Let\'s lock it in."'],
    },

    // Deal closed (success)
    onDeal: {
        shark: ['"Done. Don\'t make me regret this."'],
        patron: ['"Wonderful. It\'s been a pleasure doing business."'],
        calculator: ['"Optimal outcome achieved."'],
        nervous: ['"Oh thank goodness. I was so worried..."'],
        collector: ['"Take care of it. Promise me."'],
        hustler: ['"Bet! We locked in. Pleasure."'],
    },

    // Walk away (failure)
    onFail: {
        shark: ['"Your loss. Next."'],
        patron: ['"Such a shame. Perhaps another time."'],
        calculator: ['"Sub-optimal. Moving on."'],
        nervous: ['"I\'m sorry it didn\'t work out..."'],
        collector: ['"The piece deserves better."'],
        hustler: ['"Aight, peace. You missed out."'],
    },
};

// ════════════════════════════════════════════
// NPC → Dealer Type Mapping
// ════════════════════════════════════════════
// Maps NPC roles from contacts.js to dealer types
export const ROLE_TO_DEALER_TYPE = {
    'gallerist': 'patron',
    'mega-dealer': 'shark',
    'auction-house': 'calculator',
    'collector': 'collector',
    'advisor': 'calculator',
    'fixer': 'hustler',
    'curator': 'patron',
    'journalist': 'nervous',
    'critic': 'collector',
};

// ════════════════════════════════════════════
// Round Configuration
// ════════════════════════════════════════════
export const HAGGLE_CONFIG = {
    minRounds: 2,
    maxRounds: 5,
    proposalSteps: 3,          // Number of animation steps for the letter
    proposalStepDuration: 700, // ms per step

    // Price boundaries
    minOfferPercent: 0.5,      // Player can't offer less than 50% of ask
    maxOfferPercent: 1.0,      // Player can't offer more than 100% of ask

    // Suspicion penalty: each point of suspicion reduces all success rates
    suspicionPenalty: 0.005,   // -0.5% per suspicion point

    // Heat effects on future negotiations
    heatMemory: 0.01,          // Each point of heat = -1% to starting success rates
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
};
