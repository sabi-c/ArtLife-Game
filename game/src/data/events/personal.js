export const PERSONAL_EVENTS =
[
    {
        id: 'inheritance',
        title: 'The Phone Call',
        category: 'personal',
        frequency: [40, 999],
        weight: 1,
        classRestriction: 'rich_kid',
        description:
            'Your phone rings at 3am. Your father has died. Among the estate: a villa in Cap Ferrat, ' +
            'significant debt, and a collection of 22 works — some extraordinary, some questionable.',
        choices: [
            {
                label: 'Keep the entire collection',
                effects: { portfolioAdd: 'inheritance_full', cash: -50000 },
                outcome: 'You inherit everything — including the tax obligations.',
            },
            {
                label: 'Sell the weak works, keep the blue-chips',
                effects: { portfolioAdd: 'inheritance_curated', cash: 100000 },
                outcome: 'A balanced move. Cash and quality.',
            },
            {
                label: 'Auction everything — clean slate',
                effects: { cash: 500000 },
                outcome: 'Maximum liquidity. No sentimentality.',
            },
            {
                label: 'Donate the collection to an institution',
                effects: { reputation: 50 },
                outcome: 'Zero financial gain. Enormous cultural capital.',
            },
        ],
    },
    {
        id: 'bonus_season',
        title: 'Bonus Season',
        category: 'personal',
        frequency: [45, 999],
        weight: 1,
        classRestriction: 'hedge_fund',
        description:
            'It\'s that time of year. Your fund had a strong quarter. Your bonus has landed — ' +
            'a significant sum. The art market is calling.',
        choices: [
            {
                label: 'Go big — blue-chip masterpiece',
                effects: { cash: 200000, spendMode: 'blue_chip' },
                outcome: 'Fresh capital for a trophy acquisition.',
            },
            {
                label: 'Spread it across emerging artists',
                effects: { cash: 200000, spendMode: 'diversify' },
                outcome: 'Building a broad portfolio of bets.',
            },
            {
                label: 'Save it — markets feel uncertain',
                effects: { cash: 200000 },
                outcome: 'Cash is king. You\'ll wait.',
            },
        ],
    },
    {
        id: 'early_access',
        title: 'The Back Room',
        category: 'personal',
        frequency: [1, 999],
        weight: 2,
        classRestriction: 'gallery_insider',
        description:
            'A gallerist you\'ve known for years pulls you into the back room. "Nobody has seen these yet," ' +
            'she says, gesturing to three canvases against the wall. "I\'m giving you first look."',
        choices: [
            {
                label: 'Buy all three — trust your eye',
                effects: { cash: -45000, portfolioAdd: 'early_access_full' },
                outcome: 'Three works before anyone else even knew they existed.',
            },
            {
                label: 'Pick the best one',
                effects: { cash: -18000, portfolioAdd: 'early_access_one' },
                outcome: 'You chose well. She appreciates your discernment.',
            },
            {
                label: 'Thank her but pass',
                effects: { reputation: -5 },
                outcome: 'She went out on a limb for you. She notices.',
            },
        ],
    },
    {
        id: 'home_renovation',
        title: 'The Storage Problem',
        category: 'personal',
        frequency: [1, 999],
        weight: 2,
        description:
            'Your apartment is running out of wall space. And closet space. Your partner is annoyed. ' +
            '"It\'s either me or the Basquiat," they say. (They might be serious.)',
        choices: [
            {
                label: 'Rent climate-controlled storage — $3K/month',
                effects: { cash: -12000 },
                outcome: 'Your works are safe. Your relationship survives. For now.',
            },
            {
                label: 'Sell some works to make room',
                effects: { sellWeakest: true },
                outcome: 'Space reclaimed. But you\'ll miss that small Tanaka print.',
            },
            {
                label: 'Keep everything at home — art is for living with',
                effects: { reputation: 3 },
                outcome: 'You step over canvases to get to the bathroom. Worth it.',
            },
        ],
    },
    {
        id: 'health_scare',
        title: 'The Doctor\'s Visit',
        category: 'personal',
        frequency: [1, 999],
        weight: 1,
        description:
            'You haven\'t been sleeping. The stress of the market, the late nights at openings, ' +
            'the constant deal-making. Your doctor says you need to slow down. "Take a month off," ' +
            'she says. "Or else."',
        choices: [
            {
                label: 'Take the month off — health first',
                effects: { cash: -5000, reputation: -5 },
                outcome: 'You missed a month of deals. But you\'re alive.',
            },
            {
                label: 'Ignore it — there\'s a fair next week',
                effects: { reputation: 3. },
                outcome: 'You pushed through. The body keeps score.',
            },
            {
                label: 'Compromise — attend events but no buying',
                effects: { intel: 3 },
                outcome: 'You showed face but kept your wallet closed.',
            },
        ],
    },
    {
        id: 'divorce',
        title: 'The Split',
        category: 'personal',
        frequency: [60, 999],
        weight: 1,
        description:
            'Your marriage is over. The lawyers want to know who gets the art. ' +
            'Half your collection is legally theirs. This is going to be expensive.',
        choices: [
            {
                label: 'Give them cash, keep the art',
                effects: { cash: -200000 },
                outcome: 'Painful but the collection stays intact.',
            },
            {
                label: 'Split the collection evenly',
                effects: { portfolioRemove: 'half' },
                outcome: 'Fair. Devastating. But fair.',
            },
            {
                label: 'Fight for everything in court',
                effects: { cash: -100000, reputation: -15 },
                outcome: 'You won most of it. But at what cost?',
            },
        ],
    },
];

