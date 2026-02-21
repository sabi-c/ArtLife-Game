export const MARKET_EVENTS =
[
    {
        id: 'forced_sale',
        title: 'A Desperate Seller',
        category: 'market',
        frequency: [1, 999],
        weight: 2,
        description:
            'Word reaches you that a collector in financial difficulty is quietly offloading ' +
            'a significant work. They want a fast, discreet transaction. The piece is good — ' +
            'but at what cost to your reputation?',
        choices: [
            {
                label: 'Offer 40% below market — exploit the situation',
                effects: { cash: -30000, portfolioAdd: 'discounted', reputation: -10 },
                outcome: 'You got a bargain. But word gets around.',
            },
            {
                label: 'Offer a fair price and build goodwill',
                effects: { cash: -50000, portfolioAdd: 'fair', reputation: 10 },
                outcome: 'A fair deal. The seller remembers your kindness.',
            },
            {
                label: 'Pass entirely',
                effects: {},
                outcome: 'The opportunity slips away to someone less ethical.',
            },
        ],
    },
    {
        id: 'market_rumour',
        title: 'Bearish Whispers',
        category: 'market',
        frequency: [1, 999],
        weight: 3,
        description:
            'Over dinner, a hedge fund art advisor tells you the institutional buyers are ' +
            'pulling back. "The smart money is getting cautious," he says. "I\'d lighten up ' +
            'if I were you."',
        choices: [
            {
                label: 'Sell your weakest holdings immediately',
                effects: { sellWeakest: true },
                outcome: 'You trimmed the portfolio. Hopefully early enough.',
            },
            {
                label: 'Ignore it — rumours are rumours',
                effects: {},
                outcome: 'You hold steady. Time will tell.',
            },
            {
                label: 'Buy more — contrarian play',
                effects: { cash: -25000, portfolioAdd: 'contrarian' },
                outcome: 'You\'re betting against the crowd. Bold.',
            },
        ],
    },
    {
        id: 'auction_night',
        title: 'The Evening Sale',
        category: 'market',
        frequency: [1, 999],
        weight: 2,
        steps: [
            {
                type: 'narrative',
                text: 'Christie\'s King Street. The evening sale. You pass through security and take your seat. The room smells of perfume and old money. Paddles everywhere.',
            },
            {
                type: 'narrative',
                text: 'Lot 47 glows under the spotlight — a mid-career painting you\'ve been tracking for months. Estimate: $120,000–$180,000. Your pulse quickens.',
            },
            {
                type: 'dialogue',
                speaker: 'auctioneer',
                speakerName: 'The Auctioneer',
                text: 'Lot forty-seven. Oil on canvas, 2019. We open the bidding at one hundred thousand dollars. One hundred thousand. Do I see one-twenty?',
            },
            {
                type: 'narrative',
                text: 'Hands rise. Phone bids come in. The price climbs: $120K... $140K... $160K. The auctioneer\'s gaze sweeps the room. He looks at you.',
            },
            {
                type: 'choice',
                text: 'The bid is at $160,000. The room is watching.',
                choices: [
                    {
                        label: 'Bid aggressively — go up to $250,000',
                        effects: { cash: -250000, portfolioAdd: 'auction_trophy', reputation: 5 },
                        outcome: 'The gavel falls. "Sold, to the collector in the third row." The premium was steep. But it\'s yours.',
                    },
                    {
                        label: 'Bid cautiously — drop out at $180,000',
                        effects: { cash: -180000, portfolioAdd: 'auction_prudent' },
                        outcome: 'You got it within estimate. Discipline. The room respects that.',
                    },
                    {
                        label: 'Watch from the back — observe who\'s bidding',
                        effects: { intel: 3 },
                        outcome: 'You mapped the room. Paddle 42 is a known hedge fund. Paddle 67 is new money. Now you know who wants what.',
                    },
                    {
                        label: 'Drop your paddle — walk away',
                        effects: {},
                        outcome: 'You stayed disciplined. The results will be in the morning paper. Sometimes the best bid is no bid.',
                    },
                    {
                        label: 'Phone bid through a third party — stay anonymous',
                        isBlueOption: true,
                        requires: { intel: { min: 4 }, cash: { min: 200000 } },
                        effects: { cash: -200000, portfolioAdd: 'auction_anon', intel: 1 },
                        outcome: 'Nobody knows you bought it. No rival, no gossip, no heat. The phone bidder wins — and nobody knows it was you.',
                        tags: ['stealth', 'market'],
                    },
                ],
            },
        ],
    },
    {
        id: 'private_sale',
        title: 'The Private Offer',
        category: 'market',
        frequency: [1, 999],
        weight: 2,
        description:
            'A gallerist calls you directly. "I have something special," she says. "Not on the website, ' +
            'not in the viewing room. I\'m offering it to three people. You\'re one of them." ' +
            'The price is firm. No negotiation.',
        choices: [
            {
                label: 'Take it — private sales are opportunities',
                effects: { cash: -80000, portfolioAdd: 'private_sale', reputation: 5 },
                outcome: 'You\'re in the inner circle. The work is exceptional.',
            },
            {
                label: 'Ask to see it first',
                effects: { intel: 1 },
                outcome: 'She hesitates. "Fine. But the other two are serious."',
            },
            {
                label: 'Decline graciously',
                effects: { reputation: -3 },
                outcome: 'She\'ll think twice before calling you next time.',
            },
            {
                label: 'Negotiate the price — you know what it\'s really worth',
                isBlueOption: true,
                requires: { intel: { min: 6 }, totalWorksBought: { min: 5 } },
                effects: { cash: -55000, portfolioAdd: 'private_sale', reputation: 3, intel: 1 },
                outcome: 'She respected your knowledge. You got it at 30% below ask.',
                tags: ['negotiation', 'market'],
            },
        ],
    },
    {
        id: 'bubble_forming',
        title: 'Is This a Bubble?',
        category: 'market',
        frequency: [1, 999],
        weight: 2,
        steps: [
            {
                type: 'narrative',
                text: 'Three emerging artists have had their auction records triple in six months. Art journalists are calling it "irrational exuberance." Galleries are printing money.'
            },
            {
                type: 'dialogue',
                speaker: 'dealer',
                speakerName: 'A Veteran Gallerist',
                text: '"It\'s musical chairs," the gallerist tells you over coffee. "The music is playing very loudly right now. But when it stops, someone is going to be left holding a $200,000 canvas they can\'t resell for $20,000."'
            },
            {
                type: 'choice',
                text: 'You have two of these hyped artists in your portfolio. What\'s your move?',
                choices: [
                    {
                        label: 'Ride the wave — buy more into the hype',
                        effects: { cash: -40000, portfolioAdd: 'hype_buy', marketHeat: 2 },
                        outcome: 'You contact three advisors and wire the funds. You\'re on the train.',
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'The thrill of the gamble. For the next three weeks, every auction result validates your genius.'
                            },
                            {
                                type: 'narrative',
                                text: 'Let\'s hope it doesn\'t derail.'
                            }
                        ],
                        schedules: [{
                            weeksDelay: 8,
                            type: 'phone_message',
                            payload: {
                                from: 'system',
                                subject: '📉 The Music Stopped',
                                body: 'The bubble burst. One of the artists you bought into just failed to sell at Sotheby\'s evening sale (bought-in). The market instantly froze. Your speculative buys are now illiquid.',
                                urgency: 'urgent',
                                category: 'market',
                            },
                        }, {
                            weeksDelay: 8,
                            type: 'stat_change',
                            payload: { marketHeat: -10, reputation: -2 },
                        }],
                    },
                    {
                        label: 'Take profits — sell your hot holdings to speculators',
                        effects: { sellStrongest: true, cash: 45000 },
                        outcome: 'You cashed out near the top. You call your storage facility to release the works.',
                        nextSteps: [
                            {
                                type: 'dialogue',
                                speaker: 'collector',
                                speakerName: 'Speculative Buyer',
                                text: '"Are you sure you want to sell?" the buyer asks. "This could double again by winter." You just smile. "Take the upside," you say. "I have enough."'
                            },
                            {
                                type: 'narrative',
                                text: 'Discipline pays. When the bubble eventually pops, you\'ll be sitting on cash while others panic.'
                            }
                        ]
                    },
                    {
                        label: 'Do nothing — wait and see',
                        effects: {},
                        outcome: 'Patience. The market will reveal itself.',
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'You watch the frenzy from the sidelines. Sometimes the hardest action to take is no action at all.'
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'gallery_closing',
        title: 'A Gallery Closes',
        category: 'market',
        frequency: [1, 999],
        weight: 1,
        steps: [
            {
                type: 'narrative',
                text: 'A respected mid-tier gallery in Chelsea is closing after 15 years. The director sent out a mass email this morning: "Due to changing market conditions..."'
            },
            {
                type: 'narrative',
                text: 'The translation is simple: they ran out of money. Their roster of artists is suddenly unrepresented. The vultures are already circling.'
            },
            {
                type: 'dialogue',
                speaker: 'dealer',
                speakerName: 'The Liquidator',
                text: '"We\'re trying to place as much inventory as possible by the end of the month," the gallery liquidator tells you over the phone. "Prices are... flexible. We need cash to pay the lease break."'
            },
            {
                type: 'choice',
                text: 'Distressed inventory is a prime opportunity, but association with failure carries its own stench in the art world.',
                choices: [
                    {
                        label: 'Scoop up undervalued works from the roster — exploit the fire sale',
                        effects: { cash: -25000, portfolioAdd: 'fire_sale', heatBoost: { random: true, amount: -5 } },
                        outcome: 'You bought the orphaned works at 40 cents on the dollar. High risk, potential sleeper hits.',
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'Two days later, the delivery truck arrives at your storage facility with three massive crates. The gallery didn\'t even have money left to pad them properly.'
                            }
                        ]
                    },
                    {
                        label: 'Reach out to the artists directly — offer support, bypass the liquidator',
                        effects: { reputation: 15, intel: 2 },
                        outcome: 'You don\'t buy the gallery\'s inventory. Instead, you DM the artists on Instagram.",',
                        nextSteps: [
                            {
                                type: 'dialogue',
                                speaker: 'artist',
                                speakerName: 'Abandoned Artist',
                                text: '"Thank you," one of them replies. "They owe me $15,000 in unpaid sales. I\'m locked out of my studio. Your note means a lot."'
                            },
                            {
                                type: 'narrative',
                                text: 'In two years, when these artists inevitably find new representation, they will remember who checked on them when they were at rock bottom.'
                            }
                        ]
                    },
                    {
                        label: 'Stay away — association with failure is toxic',
                        effects: {},
                        outcome: 'You delete the email. Smart or cold? In this market, there\'s rarely a difference.',
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'By Friday, the gallery\'s social media accounts go dark. Another casualty of Chelsea rent.'
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'crypto_collector',
        title: 'The Crypto Collector',
        category: 'market',
        frequency: [1, 999],
        weight: 1,
        description:
            'A crypto millionaire is buying aggressively — every blue-chip work in sight. Prices are being ' +
            'pushed up across the board. The old guard is horrified. "He doesn\'t even look at the work," ' +
            'one dealer whispers.',
        choices: [
            {
                label: 'Sell to them at inflated prices',
                effects: { sellStrongest: true, reputation: -5 },
                outcome: 'You took their money. The purists will judge you.',
            },
            {
                label: 'Buy before they get to everything',
                effects: { cash: -60000, portfolioAdd: 'pre_crypto' },
                outcome: 'You stocked up before the prices went vertical.',
            },
            {
                label: 'Wait — this won\'t last',
                effects: {},
                outcome: 'You bet on gravity. What goes up...',
            },
        ],
    },
];

