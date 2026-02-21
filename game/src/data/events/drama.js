export const DRAMA_EVENTS =
[
    {
        id: 'scandal_plagiarism',
        title: 'Plagiarism Scandal',
        category: 'drama',
        frequency: [1, 999],
        weight: 1,
        description:
            'An artist in your portfolio has been accused of plagiarism. The story is gathering ' +
            'momentum on social media. No official verdict yet, but the market is already nervous.',
        choices: [
            {
                label: 'Sell before the market reacts',
                effects: { sellArtistWorks: true },
                outcome: 'You exited cleanly — but the artist may be innocent.',
            },
            {
                label: 'Hold and wait for the truth',
                effects: {},
                outcome: 'You bet on innocence. High risk, potential vindication.',
            },
            {
                label: 'Publicly defend the artist',
                effects: { reputation: -5, artistHeatStabilize: true },
                outcome: 'Your reputation is now tied to theirs.',
            },
        ],
    },
    {
        id: 'forgery_discovery',
        title: 'The Forgery',
        category: 'drama',
        frequency: [1, 999],
        weight: 1,
        steps: [
            {
                type: 'narrative',
                text: 'You sent a mid-century piece out for a routine cleaning and authentication check ahead of a possible sale. This morning, the conservator called you directly.'
            },
            {
                type: 'dialogue',
                speaker: 'artist',
                speakerName: 'The Conservator',
                text: '"I\'m looking at the titanium white pigment under the microscope," she says, her voice low. "This pigment wasn\'t commercially available until 1980. The painting is dated 1965."'
            },
            {
                type: 'narrative',
                text: 'Your stomach drops. The painting is likely a forgery. The authentication board hasn\'t been notified yet, but they will be if you proceed.'
            },
            {
                type: 'choice',
                text: 'A forgery in your collection is both a financial loss and a reputational hazard. How do you handle it?',
                choices: [
                    {
                        label: 'Submit it to the authentication board — face the truth publicly',
                        effects: { intel: 2, reputation: 5, portfolioRemove: 'weakest' },
                        outcome: 'You instructed the conservator to report it. You\'re taking the financial hit, but protecting the market.',
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'The board reviews it and destroys the piece, as is standard practice for known forgeries. You lost the asset.'
                            },
                            {
                                type: 'narrative',
                                text: 'However, other collectors respect your integrity. You didn\'t pass the hot potato.'
                            }
                        ]
                    },
                    {
                        label: 'Quietly sell it to an unscrupulous buyer before anyone finds out',
                        effects: { cash: 30000, reputation: -20, marketHeat: 3 },
                        outcome: 'You tell the conservator you\'ve changed your mind, pick up the piece, and immediately consign it to a shady secondary dealer.',
                        nextSteps: [
                            {
                                type: 'dialogue',
                                speaker: 'dealer',
                                speakerName: 'Secondary Dealer',
                                text: '"I don\'t ask questions if the price is right," he tells you. He wires you the money.'
                            },
                            {
                                type: 'narrative',
                                text: 'You passed the problem. But if it ever resurfaces and gets traced back to you, your reputation in the legitimate art world is finished.'
                            }
                        ],
                        schedules: [{
                            weeksDelay: 12,
                            type: 'phone_message',
                            payload: {
                                from: 'system',
                                subject: '🚨 Forgery trace',
                                body: 'That forgery you sold? The secondary dealer got caught. He gave them your name to reduce his sentence. Your reputation just took a massive hit.',
                                urgency: 'urgent',
                                category: 'drama',
                            },
                        }, {
                            weeksDelay: 12,
                            type: 'stat_change',
                            payload: { reputation: -25 },
                        }],
                    },
                    {
                        label: 'Pull it from the market, lock it in storage, and eat the loss',
                        effects: { portfolioRemove: 'weakest' },
                        outcome: 'You quietly pull the piece back to your private storage. It will never see the light of day again.',
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'You destroyed the evidence of your own mistake. A clean conscience, but a significantly thinner wallet.'
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'metoo_moment',
        title: 'The Accusation',
        category: 'drama',
        frequency: [1, 999],
        weight: 1,
        description:
            'An artist whose work you own has been accused of serious misconduct. Galleries are ' +
            'pulling their work. Institutions are returning pieces. The market value is in freefall.',
        choices: [
            {
                label: 'Sell immediately — distance yourself',
                effects: { sellArtistWorks: true, reputation: 3 },
                outcome: 'You cut ties. The loss stings, but your reputation is clean.',
            },
            {
                label: 'Hold — separate the art from the artist',
                effects: { reputation: -10 },
                outcome: 'A controversial stance. Some respect it. Most don\'t.',
            },
            {
                label: 'Donate the proceeds to a relevant cause',
                effects: { sellArtistWorks: true, reputation: 20 },
                outcome: 'Maximum moral capital. Minimum financial return.',
            },
        ],
    },
    {
        id: 'tax_investigation',
        title: 'The Letter from the IRS',
        category: 'drama',
        frequency: [1, 999],
        weight: 1,
        description:
            'An official-looking letter arrives. The IRS is reviewing your art-related deductions. ' +
            'They want to see documentation for every acquisition and donation from the past three years.',
        choices: [
            {
                label: 'Hire a top tax attorney — fight it properly',
                effects: { cash: -25000 },
                outcome: 'Expensive but thorough. Your attorney knows how to handle this.',
            },
            {
                label: 'Cooperate fully — nothing to hide',
                effects: { cash: -10000 },
                outcome: 'You paid a modest penalty. It\'s resolved.',
            },
            {
                label: 'Move your best works to a freeport immediately',
                effects: { cash: -5000, reputation: -10 },
                outcome: 'Legally grey. Effective. Morally questionable.',
            },
        ],
    },
    {
        id: 'lawsuit',
        title: 'The Lawsuit',
        category: 'drama',
        frequency: [1, 999],
        weight: 1,
        description:
            'A previous seller is claiming you defrauded them. They say you knew the work was worth ' +
            'far more than what you paid. It\'s a weak case, but legal fees add up.',
        choices: [
            {
                label: 'Fight it in court — you did nothing wrong',
                effects: { cash: -40000 },
                outcome: 'You won. But the legal bills are staggering.',
            },
            {
                label: 'Settle quietly out of court',
                effects: { cash: -20000 },
                outcome: 'It goes away. No admission of guilt.',
            },
            {
                label: 'Countersue — make an example',
                effects: { cash: -60000, reputation: 10 },
                outcome: 'You sent a message. Nobody will try this again.',
            },
        ],
    },
    {
        id: 'critic_takedown',
        title: 'The Scathing Review',
        category: 'drama',
        frequency: [1, 999],
        weight: 2,
        description:
            'A prominent critic just published a devastating review of an artist in your collection. ' +
            '"Overrated, overpriced, and over," they wrote. The article is going viral. ' +
            'Collectors are calling their advisors.',
        choices: [
            {
                label: 'Sell before the damage spreads',
                effects: { sellArtistWorks: true },
                outcome: 'You got out. The prices are already falling.',
            },
            {
                label: 'Hold firm — critics have been wrong before',
                effects: { heatBoost: { random: true, amount: -8 } },
                outcome: 'You bet against the critic. History may vindicate you.',
            },
            {
                label: 'Buy more — the price just got cheaper',
                effects: { cash: -15000, portfolioAdd: 'contrarian' },
                outcome: 'Contrarian buying. Either genius or foolish.',
            },
        ],
    },
];

