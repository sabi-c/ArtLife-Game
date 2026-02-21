export const CHAIN_EVENTS =
[
    // ── FORGERY CHAIN: Part 1 — The Discovery ──
    {
        id: 'forgery_chain_discovery',
        title: 'The Authentication Crisis',
        category: 'scandal',
        frequency: [10, 999],
        weight: 1,
        steps: [
            {
                type: 'narrative',
                text: 'A routine insurance valuation. Your appraiser — a quiet woman with a magnifying loupe and thirty years of experience — has been examining your collection all morning.',
            },
            {
                type: 'narrative',
                text: 'She stops at one painting. Leans in. Adjusts the light. Pulls out a UV torch. She\'s been staring at the same corner for four minutes.',
            },
            {
                type: 'dialogue',
                speaker: 'appraiser',
                speakerName: 'Insurance Appraiser',
                text: 'This piece... the craquelure pattern isn\'t right for the stated date. And this pigment — I\'d need a lab to confirm, but I don\'t think this cadmium yellow was available in 1948.',
            },
            {
                type: 'stat_change',
                label: 'Your stomach drops',
                changes: { suspicion: 10, intel: 2 },
                text: 'The value of this work is now uncertain.',
                advance: 'auto',
                delay: 1800,
            },
            {
                type: 'choice',
                text: 'She looks up from the painting. "What do you want me to do?"',
                speaker: 'appraiser',
                choices: [
                    {
                        label: 'Full scientific analysis — I need the truth ($15K)',
                        effects: { cash: -15000, intel: 3 },
                        outcome: '"I\'ll have the lab results in eight weeks," she says. Eight weeks of not knowing.',
                        schedules: [{
                            weeksDelay: 8,
                            type: 'event_unlock',
                            payload: { eventId: 'forgery_chain_results' },
                        }],
                    },
                    {
                        label: 'Sell the work before anyone else finds out',
                        effects: { cash: 30000, reputation: -15, suspicion: -5 },
                        outcome: 'You called your dealer that night. The work left your apartment in a van before sunrise. If anyone finds out...',
                    },
                    {
                        label: 'Pull it from display — eat the loss quietly',
                        effects: { portfolioRemove: 'weakest' },
                        outcome: 'You moved it to storage. The wall is bare. You stare at the empty space and wonder.',
                    },
                ],
            },
        ],
    },

    // ── FORGERY CHAIN: Part 2 — The Results (unlocked by Part 1) ──
    {
        id: 'forgery_chain_results',
        title: 'The Lab Results',
        category: 'scandal',
        frequency: [1, 999],
        weight: 1,
        steps: [
            {
                type: 'narrative',
                text: 'Eight weeks. The email arrives at 7:14 AM. Subject line: "Authentication Report — CONFIDENTIAL." Your coffee goes cold.',
            },
            {
                type: 'dialogue',
                speaker: 'diana_chen',
                speakerName: 'Diana Chen — Authentication Expert',
                text: 'The news is... complicated. The painting is period-correct — the canvas dates to the late 1940s. But the stretcher bars are modern replacements. And one pigment in the sky area wasn\'t commercially available until 1963.',
            },
            {
                type: 'dialogue',
                speaker: 'diana_chen',
                speakerName: 'Diana Chen',
                text: 'My opinion? The base painting is authentic. But it\'s been "improved" — someone repainted sections, probably in the 1960s. It\'s real. But it\'s not entirely what it claims to be.',
            },
            {
                type: 'stat_change',
                label: 'Partial authentication',
                changes: { intel: 3, suspicion: -5 },
                text: 'The truth is complicated. The market won\'t care about nuance.',
                advance: 'auto',
                delay: 1800,
            },
            {
                type: 'choice',
                text: 'Diana folds her hands. "What you do with this information is up to you."',
                choices: [
                    {
                        label: 'Accept partial devaluation — disclose everything',
                        effects: { reputation: 15, cash: -40000 },
                        outcome: 'Full transparency. The market adjusts. Your reputation adjusts upward. Trust is currency.',
                    },
                    {
                        label: 'Get a second opinion — another $10K',
                        effects: { cash: -10000, intel: 2 },
                        outcome: 'Another expert, another 6 weeks. But you need certainty.',
                        schedules: [{
                            weeksDelay: 6,
                            type: 'phone_message',
                            payload: {
                                from: 'system',
                                subject: '🔬 Second opinion arrived',
                                body: 'The second expert largely agrees with Diana. The painting is authentic but restored. Current market value: approximately 60% of original attribution.',
                                urgency: 'normal',
                                category: 'intel',
                            },
                        }],
                    },
                    {
                        label: 'Sue the original seller — they must have known',
                        effects: { cash: -25000, reputation: -5 },
                        outcome: 'The lawyers are engaged. This could take years. And it will be public.',
                        schedules: [{
                            weeksDelay: 12,
                            type: 'event_unlock',
                            payload: { eventId: 'forgery_chain_resolution' },
                        }],
                    },
                ],
            },
        ],
    },

    // ── FORGERY CHAIN: Part 3 — The Resolution (unlocked by Part 2 lawsuit) ──
    {
        id: 'forgery_chain_resolution',
        title: 'The Verdict',
        category: 'scandal',
        frequency: [1, 999],
        weight: 1,
        steps: [
            {
                type: 'narrative',
                text: 'Twelve weeks of depositions, expert testimony, and legal fees. The art world has been watching. ArtNews covered it. Your name is in the headline.',
            },
            {
                type: 'reveal',
                text: 'THE COURT RULED IN YOUR FAVOUR.\nTHE SELLER KNEW ABOUT THE RESTORATION\nAND FAILED TO DISCLOSE IT.',
            },
            {
                type: 'stat_change',
                label: 'Justice, at a cost',
                changes: { cash: 80000, reputation: 10, intel: 3 },
                text: 'You won damages. Your reputation for integrity grew. But the legal bills were enormous.',
                advance: 'click',
            },
            {
                type: 'choice',
                text: 'A journalist from The Art Newspaper calls. "Can I get a comment for our coverage?"',
                choices: [
                    {
                        label: '"This is about accountability in the art market"',
                        effects: { reputation: 10 },
                        outcome: 'Your quote runs on the front page. You\'re now a voice for collector rights.',
                    },
                    {
                        label: '"No comment" — keep it private',
                        effects: { reputation: 3 },
                        outcome: 'Quiet dignity. The insiders respect you more for it.',
                    },
                    {
                        label: 'Use the press — name every dealer who ever burned you',
                        effects: { reputation: -10, intel: 5 },
                        outcome: 'You went scorched earth. Made enemies. But nobody will mess with you again.',
                    },
                ],
            },
        ],
    },

    // ── ADVISOR RECKONING (unlocked by advisor_betrayal Blue Option) ──
    {
        id: 'advisor_reckoning',
        title: 'The Reckoning',
        category: 'scandal',
        frequency: [1, 999],
        weight: 1,
        steps: [
            {
                type: 'narrative',
                text: 'The forensic accountant\'s report is 47 pages. Every transaction documented. Every hidden markup highlighted in red. The total damage: $217,000.',
            },
            {
                type: 'narrative',
                text: 'You sit in your lawyer\'s office. The fluorescent lights hum. Your ex-advisor\'s name is on every page. Your lawyer looks up.',
            },
            {
                type: 'dialogue',
                speaker: 'lawyer',
                speakerName: 'Your Attorney',
                text: 'With this evidence, we can pursue full restitution plus damages. But if you go public, other collectors will come forward. This could become the biggest advisor fraud case in a decade.',
            },
            {
                type: 'choice',
                text: 'The evidence is airtight. How do you use it?',
                choices: [
                    {
                        label: 'Full lawsuit + press conference — make an example',
                        effects: { cash: 150000, reputation: 25, npcFavor: { target: 'marcus_price', amount: -100 } },
                        outcome: 'The story runs everywhere. Six other collectors join the lawsuit. Your advisor\'s career is over. You became the face of accountability.',
                    },
                    {
                        label: 'Private settlement — maximum cash, minimum drama',
                        effects: { cash: 200000 },
                        outcome: 'He paid everything plus interest. An NDA was signed. You got your money back. Nobody else knows.',
                    },
                    {
                        label: 'Leverage for intel — make him your informant',
                        isBlueOption: true,
                        requires: { intel: { min: 8 } },
                        effects: { cash: 100000, intel: 10 },
                        outcome: 'He feeds you insider information for the next year in exchange for your silence. Morally grey. Strategically brilliant.',
                        tags: ['strategy', 'insider'],
                    },
                ],
            },
        ],
    },
];
