export const OPPORTUNITY_EVENTS =
[
    {
        id: 'museum_deaccession',
        title: 'Museum Deaccession',
        category: 'opportunity',
        frequency: [1, 999],
        weight: 1,
        description:
            'A mid-tier museum is quietly deaccessioning — selling works from their permanent collection ' +
            'to pay for building renovations. These works have impeccable provenance. The word is out ' +
            'to a select few collectors.',
        choices: [
            {
                label: 'Buy with museum provenance — it adds value',
                effects: { cash: -120000, portfolioAdd: 'museum_provenance' },
                outcome: '"Ex-collection of the Museum of Contemporary Art." That label alone is worth 30%.',
            },
            {
                label: 'Alert the press — museums shouldn\'t sell their collections',
                effects: { reputation: 15 },
                outcome: 'You became a champion of public art. The museum is embarrassed.',
            },
            {
                label: 'Pass — too controversial',
                effects: {},
                outcome: 'You stayed clean. Someone else got the provenance.',
            },
        ],
    },
    {
        id: 'estate_sale',
        title: 'The Estate Sale',
        category: 'opportunity',
        frequency: [1, 999],
        weight: 2,
        description:
            'A legendary collector has passed. Their estate is being liquidated. The family is selling ' +
            'everything — some at auction, some privately. A dealer offers you early access to 5 works ' +
            'before they go to market.',
        choices: [
            {
                label: 'Buy 3 of the best pieces',
                effects: { cash: -150000, portfolioAdd: 'estate_cherry' },
                outcome: 'Cherry-picked from a legendary collection. These will appreciate.',
            },
            {
                label: 'Buy one safe blue-chip piece',
                effects: { cash: -80000, portfolioAdd: 'estate_safe' },
                outcome: 'One piece. The best one. The safest bet.',
            },
            {
                label: 'Wait for the public auction — might be cheaper',
                effects: { intel: 2 },
                outcome: 'The auction is in 3 months. The best pieces will be gone by then.',
            },
        ],
    },
    {
        id: 'art_identification',
        title: 'The Mystery Canvas',
        category: 'opportunity',
        frequency: [1, 999],
        weight: 1,
        description:
            'At a flea market upstate, buried under dusty frames — a canvas that makes you stop. ' +
            'The technique is extraordinary. The signature is illegible. Could be worth $500. ' +
            'Could be worth $500,000.',
        choices: [
            {
                label: 'Buy it — trust your gut ($500)',
                effects: { cash: -500, gamble: { min: -500, max: 200000 } },
                outcome: 'You bet on your eye. Time will tell.',
            },
            {
                label: 'Photograph it — research later',
                effects: { intel: 2 },
                outcome: 'You took notes. But it might be gone when you come back.',
            },
            {
                label: 'Walk away — too risky',
                effects: {},
                outcome: 'You\'ll always wonder.',
            },
        ],
    },
    {
        id: 'commission_offer',
        title: 'The Commission',
        category: 'opportunity',
        frequency: [1, 999],
        weight: 1,
        description:
            'A hot emerging artist offers you a private commission. A unique work, made to your ' +
            'specifications. Nobody else will have one like it. But commissions are a gamble — ' +
            'you won\'t see the finished work for 6 months.',
        choices: [
            {
                label: 'Commission the work — $30K upfront',
                effects: { cash: -30000 },
                outcome: 'You\'ll see it in 6 months. The anticipation is part of the experience.',
            },
            {
                label: 'Negotiate a smaller piece',
                effects: { cash: -12000 },
                outcome: 'A smaller commitment. Less risk, less reward.',
            },
            {
                label: 'Pass — prefer to buy existing works',
                effects: {},
                outcome: 'You like to see what you\'re buying. Fair enough.',
            },
        ],
    },
    {
        id: 'nft_crossover',
        title: 'The NFT Opportunity',
        category: 'opportunity',
        frequency: [1, 999],
        weight: 1,
        description:
            'An artist you own is launching an NFT series tied to their physical works. For holders ' +
            'of original pieces, there\'s an airdrop of "companion" digital works. The crypto crowd ' +
            'is excited. The traditional art world is skeptical.',
        choices: [
            {
                label: 'Claim the NFT and flip it immediately',
                effects: { cash: 15000 },
                outcome: 'Free money from the digital world.',
            },
            {
                label: 'Hold the NFT — it might appreciate with the physical work',
                effects: { intel: 1 },
                outcome: 'You\'re betting on convergence between two worlds.',
            },
            {
                label: 'Ignore the NFT — it\'s not real art',
                effects: { reputation: 3 },
                outcome: 'The purist stance. The old guard approves.',
            },
        ],
    },
];

