/**
 * Character class definitions for ArtLife
 */
export const CHARACTERS = [
    {
        id: 'rich_kid',
        name: 'THE RICH KID',
        icon: '💰',
        tagline: 'Your father built the collection. Now it\'s yours.',
        startingCash: 250000,
        startingWorks: 5,
        perk: 'Inherited Collection',
        description:
            'You start with established works — no need to build from scratch. ' +
            'Random life events bring windfalls and family drama. ' +
            'But you have no insider knowledge, and your taste may be outdated.',
        bonusFrequency: 70,
        bonusType: 'estate_event',
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
            'Annual bonus every ~52 turns provides a significant cash injection. ' +
            'Socially excluded from some gallery tiers — seen as "just a buyer."',
        bonusFrequency: 52,
        bonusType: 'cash_bonus',
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
            'public market. Receives advance notice of gallery openings and artist ' +
            'breakouts. Must be careful with social relationships.',
        bonusFrequency: 52,
        bonusType: 'artist_access',
    },
];
