/**
 * NPC contacts for ArtLife
 * Each NPC has a role, personality, and relationship mechanics.
 * They send messages, offer deals, and remember your choices.
 */

export const CONTACTS = [
    // ─────── DEALERS ───────
    {
        id: 'sasha_klein',
        name: 'Sasha Klein',
        role: 'dealer',
        title: 'Private Art Dealer',
        emoji: '💎',
        spriteKey: 'dealer_shark',
        personality: 'Sharp, discreet, old-money connections. Knows everyone worth knowing.',
        initialFavor: 10,
        greetings: [
            'Darling, I have something for you.',
            'Don\'t tell anyone I called you first.',
            'I thought of you immediately.',
        ],
    },
    {
        id: 'marcus_price',
        name: 'Marcus Price',
        role: 'dealer',
        title: 'Contemporary Art Advisor',
        emoji: '📊',
        spriteKey: 'dealer_calculator',
        personality: 'Data-driven, analytical, sometimes cold. Treats art like equities.',
        initialFavor: 0,
        greetings: [
            'The numbers are interesting right now.',
            'I ran the analysis. You should see this.',
            'Market signal. Call me.',
        ],
    },

    // ─────── GALLERISTS ───────
    {
        id: 'elena_ross',
        name: 'Elena Ross',
        role: 'gallerist',
        title: 'Director, Ross Gallery (Chelsea)',
        emoji: '🎨',
        spriteKey: 'dealer_patron',
        personality: 'Passionate about emerging artists. Fiercely loyal to her roster.',
        initialFavor: 5,
        greetings: [
            'Opening this Saturday. You should come.',
            'I have a new artist you need to see.',
            'The show is incredible. Please come.',
        ],
    },
    {
        id: 'james_whitfield',
        name: 'James Whitfield',
        role: 'gallerist',
        title: 'Founder, Whitfield & Partners (Mayfair)',
        emoji: '🏛️',
        spriteKey: 'dealer_patron',
        personality: 'Old school, formal, gatekeeps aggressively. Access is earned.',
        initialFavor: -5,
        greetings: [
            'We have a viewing next week. By invitation only.',
            'I have a piece that might interest a serious collector.',
            'Are you free Tuesday? I\'d like to introduce you to someone.',
        ],
    },

    // ─────── AUCTION HOUSE ───────
    {
        id: 'diana_chen',
        name: 'Diana Chen',
        role: 'auction',
        title: 'Specialist, Christie\'s Post-War & Contemporary',
        emoji: '🔨',
        spriteKey: 'dealer_calculator',
        personality: 'Professional, connected, always knows what\'s coming to market.',
        initialFavor: 0,
        greetings: [
            'The November sale catalogue is out. Some surprises.',
            'There\'s a lot I think you should look at.',
            'Off the record — this estimate is conservative.',
        ],
    },
    {
        id: 'robert_hall',
        name: 'Robert Hall',
        role: 'auction',
        title: 'Head of Private Sales, Sotheby\'s',
        emoji: '🏷️',
        spriteKey: 'dealer_calculator',
        personality: 'Smooth, persuasive, always selling. But his intel is usually good.',
        initialFavor: 0,
        greetings: [
            'I have something that never made it to auction.',
            'Before I call anyone else — interested?',
            'The market is shifting. We should talk.',
        ],
    },

    // ─────── ARTISTS ───────
    {
        id: 'yuki_tanaka',
        name: 'Yuki Tanaka',
        role: 'artist',
        title: 'Emerging Artist (Digital/Installation)',
        emoji: '✨',
        spriteKey: 'dealer_nervous',
        personality: 'Young, ambitious, grateful for collectors who believe early.',
        initialFavor: 15,
        greetings: [
            'Hey, I wanted to show you what I\'m working on.',
            'Would you visit the studio? I value your opinion.',
            'I got into a residency! Thought you\'d want to know.',
        ],
    },
    {
        id: 'kwame_asante',
        name: 'Kwame Asante',
        role: 'artist',
        title: 'Mid-Career Artist (Painting)',
        emoji: '🖼️',
        spriteKey: 'dealer_collector',
        personality: 'Thoughtful, private, cautious about who collects his work.',
        initialFavor: 0,
        greetings: [
            'I\'m selective about who I work with.',
            'I heard you bought one of mine. Let\'s talk.',
            'I have a new body of work. Small audience only.',
        ],
    },

    // ─────── COLLECTORS (RIVALS) ───────
    {
        id: 'victoria_sterling',
        name: 'Victoria Sterling',
        role: 'collector',
        title: 'Tech Heiress & Collector',
        emoji: '👑',
        spriteKey: 'dealer_collector',
        personality: 'Competitive, flashy, buys to be seen. Instagram-curated taste.',
        initialFavor: -10,
        greetings: [
            'I saw your latest acquisition. Interesting choice.',
            'We keep ending up at the same openings.',
            'I heard you passed on the Voss. Smart? Or scared?',
        ],
    },
    {
        id: 'philippe_noir',
        name: 'Philippe Noir',
        role: 'collector',
        title: 'Old-Guard European Collector',
        emoji: '🎩',
        spriteKey: 'dealer_collector',
        personality: 'Quiet power, massive collection, rarely seen. Judge of taste.',
        initialFavor: 0,
        greetings: [
            'I noticed your collection. You have an eye.',
            'Would you join me for dinner? I\'d like to discuss something.',
            'I\'m deaccessioning a few pieces. Discreetly.',
        ],
    },

    // ─────── ADVISORS ───────
    {
        id: 'nina_ward',
        name: 'Nina Ward',
        role: 'advisor',
        title: 'Art Market Analyst',
        emoji: '📈',
        spriteKey: 'dealer_calculator',
        personality: 'Sharp, data-obsessed, sees patterns before anyone else.',
        initialFavor: 5,
        greetings: [
            'I\'m seeing something in the data. Call me.',
            'The heat scores are moving. You should be paying attention.',
            'Quick heads up — the institutional buyers are repositioning.',
        ],
    },

    // ─────── MEGA-DEALERS (Art World Database archetypes) ───────
    {
        id: 'lorenzo_gallo',
        name: 'Lorenzo Gallo',
        role: 'mega_dealer',
        title: 'Founder, Gallo Gallery (20 locations worldwide)',
        emoji: '🦅',
        spriteKey: 'dealer_shark',
        personality: 'The most powerful dealer alive. Controls supply for 50+ artists. Access is a privilege, not a right.',
        initialFavor: -20,
        archetypeAbility: 'Controls supply. Getting access requires Rep 80+. Best primary prices but demands absolute loyalty — flip a work and you\'re blacklisted forever.',
        greetings: [
            'I don\'t usually take meetings. But you\'ve been noticed.',
            'I have something. But I need to know you\'re serious.',
            'My artists don\'t sell to just anyone.',
        ],
    },

    // ─────── SPECULATORS ───────
    {
        id: 'charles_vandermeer',
        name: 'Charles Vandermeer',
        role: 'speculator',
        title: 'Collector & Market Mover',
        emoji: '🎭',
        spriteKey: 'dealer_shark',
        personality: 'Buys cheap from unknowns, orchestrates massive publicity, then sells at peak. Market kingmaker or destroyer.',
        initialFavor: 0,
        archetypeAbility: 'Moves markets. If he buys your artist, heat +20. If he dumps, heat -30. His portfolio decisions send shockwaves.',
        greetings: [
            'I\'m building something. Want in?',
            'I just acquired 15 works by an artist nobody knows. Yet.',
            'Have you noticed what\'s happening with [ARTIST]? I have.',
        ],
    },

    // ─────── YOUNG HUSTLERS ───────
    {
        id: 'nico_strand',
        name: 'Nico Strand',
        role: 'young_hustler',
        title: 'Independent Dealer (Unlicensed)',
        emoji: '⚡',
        spriteKey: 'dealer_hustler',
        personality: 'Charismatic, fast-talking, exciting deals. But the provenance is often thin and the paperwork thinner.',
        initialFavor: 10,
        archetypeAbility: 'Offers exciting but potentially fraudulent deals. Risk/reward wildcard — his deals are 50% genius, 50% prison.',
        greetings: [
            'Bro. I have something insane. Can you talk?',
            'Don\'t ask where I got this. Just look at it.',
            'I\'m putting together a group buy. Limited spots. You in?',
        ],
    },

    // ─────── ART ADVISORS (potentially dishonest) ───────
    {
        id: 'margaux_fontaine',
        name: 'Margaux Fontaine',
        role: 'advisor',
        title: 'Private Art Advisor',
        emoji: '💄',
        spriteKey: 'dealer_calculator',
        personality: 'Charming, well-connected, seemingly trustworthy. Manages purchasing for wealthy clients. But her advisory fees don\'t tell the whole story.',
        initialFavor: 15,
        archetypeAbility: 'Manages buying for you — saves time and offers access. But she might be adding hidden markups. Trust mechanic: high favor = transparent, low favor = skimming.',
        greetings: [
            'I found something perfect for your collection.',
            'Let me handle this one. I know the gallery director personally.',
            'I\'ve been looking at your portfolio. We should rebalance.',
        ],
    },

    // ─────── INSTITUTIONAL COLLECTORS ───────
    {
        id: 'dr_eloise_park',
        name: 'Dr. Eloise Park',
        role: 'institutional',
        title: 'Director, Park Foundation for Contemporary Art',
        emoji: '🏛️',
        spriteKey: 'dealer_patron',
        personality: 'Museum builder. Believes art should be public. Offers enormous legitimacy boosts but wants your best works donated or loaned long-term.',
        initialFavor: 0,
        archetypeAbility: 'Offers legitimacy — her endorsement adds +15 reputation and museum-quality provenance to any work. But she wants donations, not sales.',
        greetings: [
            'We\'re planning a major exhibition. Your collection has a piece we need.',
            'I\'d like to discuss a long-term loan arrangement.',
            'The Foundation is acquiring. Are you open to a conversation?',
        ],
    },
];

/**
 * Generate initial NPC state from contacts data
 */
export function initializeContacts() {
    return CONTACTS.map((contact) => ({
        id: contact.id,
        name: contact.name,
        role: contact.role,
        title: contact.title,
        emoji: contact.emoji,
        spriteKey: contact.spriteKey || 'dealer_patron',
        favor: contact.initialFavor,
        met: false,
        lastContact: 0,
        interactions: 0,
    }));
}
