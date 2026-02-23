/**
 * tutorial_week.js — Week 1 tutorial events with intra-week timing.
 *
 * These events are pinned to Week 1 via CMS timeline overrides and fire
 * at different points within the week (start, mid, end) to introduce
 * the player to core mechanics.
 *
 * Timing is set via cmsStore.saveTimelineOverride() — the events themselves
 * are normal pool events. The timeline override format:
 *   { week: 1, timing: 'start'|'mid'|'end' }
 */
export const TUTORIAL_WEEK_EVENTS = [
    {
        id: 'tutorial_welcome',
        title: 'Welcome to the Art World',
        category: 'personal',
        frequency: [1, 1], // Week 1 only
        weight: 10,        // High weight to ensure selection
        steps: [
            {
                type: 'narrative',
                text: 'Your phone buzzes. A text from an unknown number: "The gallery is open. They\'re expecting you."',
            },
            {
                type: 'narrative',
                text: 'You step out onto the street. Chelsea is humming — white cube galleries stretching in every direction, each one a small temple to somebody\'s vision.',
            },
            {
                type: 'dialogue',
                speaker: 'narrator',
                speakerName: 'Inner Voice',
                text: 'Four actions per week. That\'s all the time you\'ve got. Browse the market, make calls, visit galleries. Choose wisely.',
            },
            {
                type: 'choice',
                text: 'How do you want to start your first week?',
                choices: [
                    {
                        label: 'Hit the galleries — I want to see what\'s for sale',
                        effects: { intel: 2 },
                        outcome: 'You push through the first glass door. The dealer barely looks up. Good — that means you can look without being sold to.',
                    },
                    {
                        label: 'Work the phone — connections matter more than art',
                        effects: { reputation: 2 },
                        outcome: 'You start dialing. In this business, it\'s not what you know — it\'s who you know. And who knows you.',
                    },
                    {
                        label: 'Study the market data — knowledge is power',
                        effects: { intel: 3 },
                        outcome: 'You pull up the terminal. Numbers don\'t lie. Well — sometimes they do. But at least they\'re consistent about it.',
                    },
                ],
            },
        ],
    },
    {
        id: 'tutorial_first_gallery',
        title: 'Your First Gallery Visit',
        category: 'personal',
        frequency: [1, 1],
        weight: 10,
        steps: [
            {
                type: 'narrative',
                text: 'Halfway through the week. You\'ve spent some time, made some moves. The Bloomberg terminal on your phone pings with a price update.',
            },
            {
                type: 'dialogue',
                speaker: 'narrator',
                speakerName: 'Inner Voice',
                text: 'The market moves whether you\'re watching or not. Every week, prices shift — artists rise and fall. Pay attention to the ticker.',
            },
            {
                type: 'narrative',
                text: 'A painting catches your eye in a gallery window. Small, intense, underpriced. The kind of thing that could double in a year — or gather dust.',
            },
            {
                type: 'choice',
                text: 'What\'s your approach to buying?',
                choices: [
                    {
                        label: 'Buy what I love — the money will follow',
                        effects: { taste: 2 },
                        outcome: 'The romantic approach. Sometimes it works. When it doesn\'t, at least you have good art on your walls.',
                    },
                    {
                        label: 'Buy what\'s undervalued — this is business',
                        effects: { intel: 2 },
                        outcome: 'Cold, calculated, correct. The spreadsheet doesn\'t care about your feelings. Neither does the market.',
                    },
                ],
            },
        ],
    },
    {
        id: 'tutorial_week_recap',
        title: 'Week in Review',
        category: 'personal',
        frequency: [1, 1],
        weight: 10,
        steps: [
            {
                type: 'narrative',
                text: 'Your first week is done. The city quiets down as galleries close for the evening. Time to take stock.',
            },
            {
                type: 'dialogue',
                speaker: 'narrator',
                speakerName: 'Inner Voice',
                text: 'Each week ends with a market tick. Prices update, new works appear, opportunities expire. Advance the week when you\'re ready.',
            },
            {
                type: 'narrative',
                text: 'Twenty-five weeks to go. The art world is patient — but only to a point. Make your moves count.',
            },
        ],
    },
];
