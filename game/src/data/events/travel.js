export const TRAVEL_EVENTS =
[
    {
        id: 'art_fair',
        title: 'Art Basel Approaches',
        category: 'fair',
        frequency: [1, 999],
        weight: 2,
        description:
            'Art Basel is next week. The biggest art fair in the world. 280 galleries, every major ' +
            'dealer, and $3 billion in art changing hands. Attendance means access. Absence means FOMO.',
        choices: [
            {
                label: 'Attend and go all in',
                effects: { cash: -5000, fairAccess: true, heatBoostAll: 3 },
                outcome: 'You\'re in Basel. The deals are flowing.',
            },
            {
                label: 'Attend but just observe',
                effects: { cash: -2000, intel: 3 },
                outcome: 'You watched. You learned. You spent less.',
            },
            {
                label: 'Skip it this year',
                effects: {},
                outcome: 'You saved the trip. But you missed the energy.',
            },
        ],
    },
    {
        id: 'venice_biennale',
        title: 'The Venice Biennale',
        category: 'fair',
        frequency: [1, 999],
        weight: 1,
        description:
            'The Venice Biennale opens this week. It\'s not a commercial fair — it\'s where reputations ' +
            'are made. Artists in the national pavilions become blue-chip overnight. The social scene ' +
            'is unmatched.',
        choices: [
            {
                label: 'Go — network at the highest level',
                effects: { cash: -8000, reputation: 10, intel: 4 },
                outcome: 'You walked the Arsenale. You dined on the Grand Canal. You belong.',
            },
            {
                label: 'Send a representative',
                effects: { cash: -3000, intel: 2 },
                outcome: 'Your eyes and ears were there. You were not.',
            },
            {
                label: 'Skip — focus on buying opportunities at home',
                effects: { cash: -10000, portfolioAdd: 'while_away' },
                outcome: 'While everyone was in Venice, you had the New York market to yourself.',
            },
        ],
    },
    {
        id: 'frieze_london',
        title: 'Frieze London',
        category: 'fair',
        frequency: [1, 999],
        weight: 2,
        description:
            'The white tents go up in Regent\'s Park. Frieze London is the heart of the European art ' +
            'market every October. This year, the tent is buzzing about AI art and whether painting is dead.',
        choices: [
            {
                label: 'Attend the VIP preview day',
                effects: { cash: -4000, intel: 3, reputation: 5 },
                outcome: 'Preview day is where the real deals happen. Before the public arrives.',
            },
            {
                label: 'Go on the public days',
                effects: { cash: -1000, intel: 1 },
                outcome: 'The best works are gone. But you saw what\'s next.',
            },
            {
                label: 'Sit this one out',
                effects: {},
                outcome: 'London will still be there.',
            },
        ],
    },
    {
        id: 'gambling_monaco',
        title: 'A Night in Monaco',
        category: 'social',
        frequency: [1, 999],
        weight: 1,
        description:
            'You\'re at a collector\'s dinner in Monaco. After dessert, the host suggests the casino. ' +
            '"Just for fun." But the stakes at this table are anything but casual.',
        choices: [
            {
                label: 'Play big — you\'re here to be seen',
                effects: { gamble: { min: -50000, max: 100000 } },
                outcome: 'The chips fell where they may.',
            },
            {
                label: 'Play conservatively — small bets, big networking',
                effects: { gamble: { min: -5000, max: 15000 }, reputation: 5 },
                outcome: 'You played it cool. Made connections.',
            },
            {
                label: 'Watch from the bar',
                effects: { reputation: 3 },
                outcome: 'You observed. You learned who the real risk-takers are.',
            },
        ],
    },
    {
        id: 'vacation_stbarts',
        title: 'St. Barts Encounter',
        category: 'social',
        frequency: [1, 999],
        weight: 1,
        description:
            'On vacation in St. Barts, you run into a mega-collector at a beach club. Over rosé, they ' +
            'mention selling a piece from their private collection. Museum-quality. Sunset negotiations.',
        choices: [
            {
                label: 'Express serious interest — arrange a viewing',
                effects: { cash: -200000, portfolioAdd: 'trophy', reputation: 10 },
                outcome: 'A once-in-a-lifetime acquisition, sealed over sunset drinks.',
            },
            {
                label: 'Show interest but play it cool',
                effects: { intel: 2, reputation: 5 },
                outcome: 'You didn\'t commit. But you know what\'s available.',
            },
            {
                label: 'Keep it social — no business on vacation',
                effects: { reputation: 3 },
                outcome: 'You enjoyed the beach. The deal can wait.',
            },
        ],
    },
    {
        id: 'miami_art_week',
        title: 'Miami Art Week',
        category: 'fair',
        frequency: [1, 999],
        weight: 2,
        description:
            'It\'s December in Miami. Art Basel Miami Beach, NADA, Untitled, Scope — the entire art ' +
            'world descends on South Beach. The parties run until 4am. The deals happen at breakfast.',
        choices: [
            {
                label: 'Do the full circuit — every fair, every party',
                effects: { cash: -8000, intel: 4, reputation: 8 },
                outcome: 'You saw everything. You met everyone. You need a vacation from your vacation.',
            },
            {
                label: 'Focus on one fair only — go deep',
                effects: { cash: -3000, intel: 2 },
                outcome: 'You missed the breadth but found depth.',
            },
            {
                label: 'Skip Miami — it\'s become a circus',
                effects: {},
                outcome: 'Some of the most respected collectors agree with you.',
            },
        ],
    },
];

