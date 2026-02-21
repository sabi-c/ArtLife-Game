/**
 * Character class definitions for ArtLife
 * Stats use internal keys: reputation (HYP), taste (TST), audacity (AUD), access (ACC)
 * intel is earned in-game — not set here.
 */
export const CHARACTERS = [
    {
        id: 'rich_kid',
        name: 'THE NEPO BABY',
        icon: '💰',
        tagline: 'Your father built the collection. Now it\'s yours.',
        startingCash: 250000,
        startingWorks: 5,
        perk: 'Inherited Collection',
        description:
            'You start with established works — no need to build from scratch. ' +
            'Random life events bring windfalls and family drama. ' +
            'Low Audacity: you\'re polite. High Taste: years of museum visits.',
        bonusFrequency: 70,
        bonusType: 'estate_event',
        difficulty: 'EASY',
        difficultyColor: '#44cc44',
        startingStats: { reputation: 60, taste: 65, audacity: 20, access: 50, intel: 0 },
        traits: [
            {
                id: 'old_guard',
                icon: '🏛️',
                label: 'Old Guard',
                desc: 'Your family name still carries weight. +10 Hype (REP) at game start.',
                effects: { reputation: 10 },
            },
            {
                id: 'early_education',
                icon: '🎓',
                label: 'Early Education',
                desc: 'Years of museum visits and private tutors. +12 Taste at game start.',
                effects: { taste: 12 },
            },
            {
                id: 'social_circuit',
                icon: '🥂',
                label: 'Social Circuit',
                desc: 'The right schools, the right friends. +12 Access at game start.',
                effects: { access: 12 },
            },
            {
                id: 'controlled_rage',
                icon: '🎭',
                label: 'Controlled Rage',
                desc: 'Beneath the courtesy lies a ruthless streak. +15 Audacity at game start.',
                effects: { audacity: 15 },
            },
        ],
    },
    {
        id: 'hedge_fund',
        name: 'THE HEDGE FUND',
        icon: '📊',
        tagline: 'Art is just another asset class.',
        startingCash: 750000,
        startingWorks: 0,
        perk: 'Annual Bonus',
        description:
            'High capital, no collection. Strong analytical view of market data. ' +
            'Annual bonus every ~52 turns. Moderate Audacity — you close deals. ' +
            'Socially excluded from some tiers — seen as "just a buyer."',
        bonusFrequency: 52,
        bonusType: 'cash_bonus',
        difficulty: 'MEDIUM',
        difficultyColor: '#ffaa00',
        startingStats: { reputation: 45, taste: 40, audacity: 55, access: 55, intel: 20 },
        traits: [
            {
                id: 'data_edge',
                icon: '📡',
                label: 'Data Edge',
                desc: 'Alternative data feeds on collector behavior. +15 Intel at game start.',
                effects: { intel: 15 },
            },
            {
                id: 'network_capital',
                icon: '🤝',
                label: 'Network Capital',
                desc: 'Your LP base includes gallery owners and auction house chairs. +12 Access.',
                effects: { access: 12 },
            },
            {
                id: 'aggressive_closer',
                icon: '💼',
                label: 'Aggressive Closer',
                desc: 'You don\'t leave a room without a deal. +15 Audacity at game start.',
                effects: { audacity: 15 },
            },
            {
                id: 'clean_reputation',
                icon: '✅',
                label: 'Clean Reputation',
                desc: 'Your track record is impeccable. The art world respects your integrity. +12 Hype.',
                effects: { reputation: 12 },
            },
        ],
    },
    {
        id: 'shady_flipper',
        name: 'THE FLIPPER',
        icon: '🃏',
        tagline: 'Buy. Flip. Ghost.',
        startingCash: 400000,
        startingWorks: 3,
        perk: 'Tax Haven',
        description:
            'You move fast and never hold. Secondary market specialist — buy undervalued, ' +
            'flip for quick profit. Maximum Audacity, minimum patience. ' +
            'Galleries watch you closely. Provenance is... flexible.',
        bonusFrequency: 26,
        bonusType: 'flip_bonus',
        difficulty: 'MEDIUM',
        difficultyColor: '#ff7700',
        startingStats: { reputation: 30, taste: 30, audacity: 80, access: 40, intel: 30 },
        traits: [
            {
                id: 'shell_company',
                icon: '🏦',
                label: 'Shell Company',
                desc: 'Offshore structure. Cash is untraceable. +$50k starting cash, +10 Audacity.',
                effects: { cash: 50000, audacity: 10 },
            },
            {
                id: 'street_connections',
                icon: '🤙',
                label: 'Street Connections',
                desc: 'You know the secondary market runners. Backroom deals are your playground. +15 Access.',
                effects: { access: 15 },
            },
            {
                id: 'fresh_papers',
                icon: '📄',
                label: 'Fresh Papers',
                desc: 'Provenance documentation that\'s, let\'s say, enthusiastically sourced. +12 Hype.',
                effects: { reputation: 12 },
            },
            {
                id: 'cold_read',
                icon: '🧠',
                label: 'Cold Read',
                desc: 'You can tell in thirty seconds if someone will buy. +10 Taste, +10 Audacity.',
                effects: { taste: 10, audacity: 10 },
            },
        ],
    },
    {
        id: 'gallery_insider',
        name: 'THE INSIDER',
        icon: '🖼️',
        tagline: 'You\'ve been in the room before anyone else.',
        startingCash: 80000,
        startingWorks: 2,
        perk: 'Early Access',
        description:
            'Low cash but strong relationships. Early access to artists before ' +
            'public market. High Access, high Taste — but limited Audacity. ' +
            'Must be careful with social relationships.',
        bonusFrequency: 52,
        bonusType: 'artist_access',
        difficulty: 'HARD',
        difficultyColor: '#cc4444',
        startingStats: { reputation: 50, taste: 60, audacity: 35, access: 75, intel: 15 },
        traits: [
            {
                id: 'artists_trust',
                icon: '👂',
                label: "Artist's Trust",
                desc: 'Artists share unfinished work and studio visits with you. +15 Taste.',
                effects: { taste: 15 },
            },
            {
                id: 'vernissage_name',
                icon: '🍾',
                label: 'Vernissage Name',
                desc: 'Your name is on every VIP list in the city. +12 Hype at game start.',
                effects: { reputation: 12 },
            },
            {
                id: 'back_channel',
                icon: '📱',
                label: 'Back Channel',
                desc: 'You know what sells before it lists. Deep secondary market intel. +15 Intel.',
                effects: { intel: 15 },
            },
            {
                id: 'studio_access',
                icon: '🔑',
                label: 'Studio Access',
                desc: 'Artists bring you to private studio visits others never see. +15 Access.',
                effects: { access: 15 },
            },
        ],
    },
];

/**
 * Drip options — aesthetic style chosen in Phase 4 of character creation.
 * Effects apply as starting stat bonuses.
 */
export const DRIP_OPTIONS = [
    {
        id: 'quiet_luxury',
        icon: '🧥',
        label: 'QUIET LUXURY',
        desc: 'No logos. Just provenance. Legacy gallerists recognize you instantly. +8 Access with old-money types.',
        effects: { access: 8 },
        flavor: 'Loro Piana. Church\'s brogues. One signet ring.',
    },
    {
        id: 'loud_hypebeast',
        icon: '👟',
        label: 'LOUD HYPEBEAST',
        desc: 'Supreme bag, vintage Rolex, NFT avatar. Opens doors with young collectors. +10 Hype.',
        effects: { reputation: 10 },
        flavor: 'Dunk Lows. Chrome Hearts chain. Acne Studios tote.',
    },
    {
        id: 'tech_bro',
        icon: '💻',
        label: 'TECH BRO',
        desc: 'Patagonia vest and a Figma link to your collection. Makes finance types comfortable. +8 Intel.',
        effects: { intel: 8 },
        flavor: 'Arc\'teryx shell. AirPods Max. Notion for provenance.',
    },
    {
        id: 'avant_garde',
        icon: '🎭',
        label: 'AVANT-GARDE',
        desc: 'Gallery staff wave you through. Artists remember your name. +10 Taste.',
        effects: { taste: 10 },
        flavor: 'Rick Owens. No explanation given. No explanation needed.',
    },
];

/**
 * Vice options — optional flaw chosen in Phase 5 of character creation.
 * Skipping gives a clean slate. Each vice has a buff and a passive curse.
 */
export const VICE_OPTIONS = [
    {
        id: 'crypto_portfolio',
        icon: '₿',
        label: 'CRYPTO PORTFOLIO',
        desc: 'Volatile side income: cash swings ±$50k every 8 weeks. Sometimes a windfall. Sometimes catastrophic.',
        buff: '+$50k initial. Cash event every 8 weeks.',
        curse: 'Unpredictable cash shocks. Always a number.',
        effects: { cash: 50000, passive: 'crypto_swing' },
    },
    {
        id: 'snowblind',
        icon: '❄️',
        label: 'SNOWBLIND',
        desc: 'Thursday night habit. Audacity surges in the short run — but Taste quietly degrades over time.',
        buff: '+20 Audacity at start.',
        curse: '-1 Taste every 10 weeks. Permanent.',
        effects: { audacity: 20, passive: 'taste_decay' },
    },
    {
        id: 'compulsive_gossiper',
        icon: '📢',
        label: 'COMPULSIVE GOSSIPER',
        desc: 'You tell everyone everything. Intel flows in — and right back out. NPCs remember what you\'ve said.',
        buff: '+15 Intel. Early info on every market event.',
        curse: 'Secrets don\'t stay yours. Rivals get tips too.',
        effects: { intel: 15, passive: 'gossip_leak' },
    },
];
