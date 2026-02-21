export const SCANDAL_EVENTS =
[
    {
        id: 'knoedler_forgery',
        title: 'The Gallery Forgery Ring',
        category: 'scandal',
        frequency: [8, 999],
        weight: 1,
        description:
            'A bombshell hits the art world: a prestigious gallery has been selling forgeries for over a decade. ' +
            '60 fake Abstract Expressionist paintings — $80 million in sales. A dealer you know is implicated. ' +
            'They offer you a "lost masterwork" at an incredible price. Your gut says something\'s off.',
        choices: [
            {
                label: 'Accept the deal — if it\'s real, you\'ll make a fortune',
                effects: { cash: -120000, portfolioAdd: 'suspicious_masterwork', suspicion: 15 },
                outcome: 'You bought the work. It looks incredible. But provenance is thin.',
            },
            {
                label: 'Demand independent authentication ($5K)',
                effects: { cash: -5000, intel: 5 },
                outcome: 'Smart. The results will take 8 weeks. You\'ll know the truth.',
            },
            {
                label: 'Tip off a journalist — burn the whole thing down',
                effects: { reputation: 15, npcFavor: { target: 'sasha_klein', amount: -20 } },
                outcome: 'The story breaks. You\'re a hero to the press, a traitor to the trade.',
            },
        ],
    },
    {
        id: 'fractional_ownership_scam',
        title: 'The Fractional Ownership',
        category: 'scandal',
        frequency: [10, 999],
        weight: 1,
        description:
            'A charismatic young dealer offered you fractional ownership in a blue-chip work. Great returns, ' +
            'minimal risk. But now two other collectors have contacted you — they also "own" the same painting. ' +
            'Combined ownership adds up to 300%. Someone\'s been sold a lie.',
        choices: [
            {
                label: 'Pursue legal action immediately ($40K)',
                effects: { cash: -40000, reputation: 5 },
                outcome: 'Your lawyers are on it. The dealer has fled to the South Pacific.',
            },
            {
                label: 'Cut your losses and walk away',
                effects: { cash: -35000 },
                outcome: 'Expensive lesson. You\'ll never trust a handshake deal again.',
            },
            {
                label: 'Use the intel as leverage — rally the other victims',
                effects: { intel: 5, reputation: 10, npcFavor: { target: 'nina_ward', amount: 10 } },
                outcome: 'You organized the group. Strength in numbers. The press takes notice.',
            },
        ],
    },
    {
        id: 'advisor_betrayal',
        title: 'The Advisor\'s Secret',
        category: 'scandal',
        frequency: [12, 999],
        weight: 1,
        steps: [
            {
                type: 'narrative',
                text: 'You\'re reviewing your quarterly statements late at night. Something catches your eye. A purchase from March: $85,000 for a work by Tanaka.',
            },
            {
                type: 'narrative',
                text: 'But your advisor mentioned he got it for $52,000 — "at a great price." That\'s a $33,000 gap. You pull up the original invoice.',
            },
            {
                type: 'stat_change',
                label: 'Something is wrong',
                changes: { intel: 2 },
                text: 'You noticed the discrepancy.',
                advance: 'auto',
                delay: 1500,
            },
            {
                type: 'narrative',
                text: 'You pull up the last 18 months of transactions. The pattern is consistent. Twelve works. Average markup: 40%. Total hidden spread: over $200,000.',
            },
            {
                type: 'reveal',
                text: 'HE WAS SUPPOSED TO BE YOUR FIDUCIARY.\nYOUR TRUSTED ADVISOR.\nAND HE\'S BEEN SKIMMING FROM EVERY DEAL.',
            },
            {
                type: 'choice',
                text: 'Your hands are shaking. You have the evidence. What do you do?',
                choices: [
                    {
                        label: 'Confront him privately — demand repayment',
                        effects: { cash: 100000, npcFavor: { target: 'marcus_price', amount: -40 } },
                        outcome: 'He paid half and begged for discretion. The relationship is over. But you recovered some of the money.',
                    },
                    {
                        label: 'Fire him quietly — find a new advisor',
                        effects: { reputation: 5 },
                        outcome: 'You moved on without scandal. But he\'s still out there, doing it to others.',
                    },
                    {
                        label: 'Go public — warn the entire community',
                        effects: { reputation: 20, npcFavor: { target: 'marcus_price', amount: -80 } },
                        outcome: 'You exposed him. The art world is grateful. Your ex-advisor is ruined. You made a powerful enemy.',
                        schedules: [{
                            weeksDelay: 8,
                            type: 'phone_message',
                            payload: {
                                from: 'system',
                                subject: '📰 Your exposé made waves',
                                body: 'Three other collectors have come forward with similar stories. Your advisor has been formally charged. You\'re being called a whistleblower.',
                                urgency: 'normal',
                                category: 'drama',
                            },
                        }],
                    },
                    {
                        label: 'Hire a forensic accountant — build an airtight case first',
                        isBlueOption: true,
                        requires: { intel: { min: 6 }, cash: { min: 30000 } },
                        effects: { cash: -15000, intel: 5 },
                        outcome: 'The forensic report is devastating. Every transaction, documented. When you move, it will be surgical.',
                        tags: ['strategy', 'scandal'],
                        schedules: [{
                            weeksDelay: 6,
                            type: 'event_unlock',
                            payload: { eventId: 'advisor_reckoning' },
                        }],
                    },
                ],
            },
        ],
    },
    {
        id: 'attribution_crisis',
        title: 'The Attribution War',
        category: 'scandal',
        frequency: [8, 999],
        weight: 2,
        description:
            'Your most valuable work — the centrepiece of your collection — has had its attribution publicly ' +
            'challenged. A scholar at the Met published a paper arguing it\'s "largely by the workshop, not the ' +
            'master." The market is watching. Your portfolio value is swinging wildly.',
        choices: [
            {
                label: 'Commission independent scholarship to defend it ($15K)',
                effects: { cash: -15000, intel: 3 },
                outcome: 'Your expert disagrees with the Met. Now it\'s a scholarly battle.',
            },
            {
                label: 'Sell immediately before the debate worsens',
                effects: { sellStrongest: true, marketHeat: 5 },
                outcome: 'You got out. But the sale itself confirmed doubts.',
            },
            {
                label: 'Hold and ride it out — great works survive scrutiny',
                effects: { reputation: 5 },
                outcome: 'Conviction. Either bravery or denial. Time will tell which.',
            },
        ],
    },
    {
        id: 'auction_shill_bidding',
        title: 'The Phantom Bidders',
        category: 'scandal',
        frequency: [1, 999],
        weight: 2,
        description:
            'You\'re at a major evening sale. The lot you want is heating up — the auctioneer is taking bids ' +
            'from across the room. But something feels wrong. The "bidders" never seem to actually win. ' +
            'They just keep driving the price up.',
        choices: [
            {
                label: 'Stop bidding — you suspect shills',
                effects: { intel: 4, reputation: 3 },
                outcome: 'Your gut was right. The lot sold to a phone bidder at a suspiciously round number.',
                requirement: { intel: 40 },
            },
            {
                label: 'Keep bidding — you want this work',
                effects: { cash: -180000, portfolioAdd: 'auction_overpay' },
                outcome: 'You got the lot. But the price was 40% above estimate. Were you played?',
            },
            {
                label: 'Bid once more, then walk away — set your limit',
                effects: { cash: -120000, portfolioAdd: 'auction_disciplined' },
                outcome: 'Discipline. You got it at a reasonable price. Or you didn\'t get it at all.',
            },
        ],
    },
    {
        id: 'gallery_blacklist',
        title: 'The Blacklist',
        category: 'scandal',
        frequency: [6, 999],
        weight: 2,
        description:
            'Word gets back to you: a major gallery has put you on their "no sell" list. You flipped a work ' +
            'from their program within 6 months, and now they\'ve cut you off. Other galleries are watching.',
        choices: [
            {
                label: 'Apologize and offer to buy the work back at a premium',
                effects: { cash: -50000, marketHeat: -10 },
                outcome: 'Expensive rehabilitation. But the door reopens — slowly.',
            },
            {
                label: 'Accept it — you\'ll buy on the secondary market',
                effects: { marketHeat: 5 },
                outcome: 'The secondary market costs more, but nobody controls your choices.',
            },
            {
                label: 'Publicly criticize the practice — galleries shouldn\'t dictate resale',
                effects: { reputation: -10, marketHeat: 15, intel: 2 },
                outcome: 'You made enemies. But some collectors quietly agree with you.',
            },
        ],
    },
    {
        id: 'banana_moment',
        title: 'The Banana on the Wall',
        category: 'scandal',
        frequency: [1, 999],
        weight: 3,
        description:
            'At Art Basel Miami, an artist duct-tapes a banana to a gallery wall. Price: $120,000. ' +
            'It sells immediately. Another collector pays $120K for a second edition. Then a performance ' +
            'artist walks up and eats it. The internet explodes. Your collector friend calls it genius. ' +
            'A critic calls it the death of art.',
        choices: [
            {
                label: 'Buy the third edition — this is conceptual history',
                effects: { cash: -120000, reputation: -5, portfolioAdd: 'conceptual_stunt' },
                outcome: 'You own a certificate of authenticity for a banana. Welcome to the art world.',
            },
            {
                label: 'Post about it on social media — ride the conversation',
                effects: { reputation: 5, intel: 1 },
                outcome: 'Your take went viral. You\'re part of the discourse now.',
            },
            {
                label: 'Walk away disgusted — the market has lost its mind',
                effects: { reputation: 3 },
                outcome: 'The old guard respects your stance. But they\'re losing.',
            },
        ],
    },
    {
        id: 'self_destructing_art',
        title: 'The Self-Shredding',
        category: 'scandal',
        frequency: [15, 999],
        weight: 1,
        description:
            'A street artist\'s work just self-shredded live at auction — right after selling for $1.4 million. ' +
            'A mechanism hidden in the frame activated as the hammer fell. The auction house is in chaos. ' +
            'But here\'s the twist — early reports say the partially-shredded version is now worth MORE.',
        choices: [
            {
                label: 'Bid on the shredded version — it\'s art history now',
                effects: { cash: -250000, portfolioAdd: 'shredded_masterwork', reputation: 10 },
                outcome: 'You bought the myth. It resold two years later for $25 million.',
            },
            {
                label: 'Buy other works by the same artist before prices spike',
                effects: { cash: -80000, portfolioAdd: 'streetart_surge' },
                outcome: 'The ripple effect. Every work by this artist just doubled.',
            },
            {
                label: 'Sit back and watch the circus — this isn\'t investing',
                effects: { intel: 2 },
                outcome: 'Entertaining. But you missed the biggest story of the year.',
            },
        ],
    },
    {
        id: 'museum_fakes_exhibition',
        title: 'The Fake Exhibition',
        category: 'scandal',
        frequency: [12, 999],
        weight: 1,
        description:
            'A museum in Florida exhibited 25 works attributed to a famous artist. The FBI has now determined ' +
            'they\'re ALL forgeries. How were they caught? A modern-era FedEx logo was visible on the back of ' +
            'one painting\'s cardboard. The museum director has been fired. You attended that show.',
        choices: [
            {
                label: 'Review your own collection for similar red flags — hire an expert',
                effects: { cash: -8000, intel: 5, suspicion: -5 },
                outcome: 'Your collection is clean. But the scare was worth the audit.',
            },
            {
                label: 'Short the artist\'s market — sell any works you hold',
                effects: { sellArtistWorks: true },
                outcome: 'Even genuine works are tainted by the scandal. Smart exit.',
            },
            {
                label: 'Do nothing — your provenance is solid',
                effects: {},
                outcome: 'Confidence. But confidence isn\'t the same as verification.',
            },
        ],
    },
    {
        id: 'stolen_work_surfaces',
        title: 'The Stolen Masterpiece',
        category: 'scandal',
        frequency: [20, 999],
        weight: 1,
        description:
            'A mysterious figure contacts you through an intermediary. They have a work "from a private ' +
            'collection" that matches a painting stolen from a famous museum heist 30 years ago. ' +
            'The painting is worth $50 million on the open market — they want $500K. ' +
            'The hairs on the back of your neck stand up.',
        choices: [
            {
                label: 'Report it to the FBI immediately',
                effects: { reputation: 25, intel: 5 },
                outcome: 'You did the right thing. The FBI thanks you. The art world takes note.',
            },
            {
                label: 'Investigate further — gather intelligence first',
                effects: { intel: 8, suspicion: 15, marketHeat: 10 },
                outcome: 'You\'re playing with fire. But the information you\'re gathering is extraordinary.',
            },
            {
                label: 'Walk away — you were never here',
                effects: {},
                outcome: 'Didn\'t see anything. Don\'t know anything. Can\'t help you.',
            },
        ],
    },
    {
        id: 'freeport_offer',
        title: 'The Freeport',
        category: 'scandal',
        frequency: [8, 999],
        weight: 2,
        description:
            'A dealer mentions the Geneva Freeport — a tax-free vault where $100 billion in art sits, ' +
            'never seen. Works can be bought, stored, and resold without ever leaving the facility. ' +
            'No import duties. No sales tax. Your portfolio could benefit enormously. It\'s perfectly legal. ' +
            'It doesn\'t feel perfectly legal.',
        choices: [
            {
                label: 'Move your best works to the freeport ($20K setup)',
                effects: { cash: -20000, marketHeat: -5 },
                outcome: 'Tax-efficient. Your works are safe in Switzerland. But you can\'t see them.',
            },
            {
                label: 'Store only new acquisitions there — keep existing works visible',
                effects: { cash: -8000, intel: 2 },
                outcome: 'A balanced approach. Public collection meets private vault.',
            },
            {
                label: 'Decline — art should be seen, not vaulted',
                effects: { reputation: 10 },
                outcome: 'The purist move. You believe art is for walls, not warehouses.',
            },
        ],
    },
    {
        id: 'waiting_list_invite',
        title: 'The Waiting List',
        category: 'scandal',
        frequency: [15, 999],
        weight: 1,
        description:
            'A mega-gallery calls. They want to offer you a spot on their client list for a superstar artist. ' +
            'The waiting list is 200 collectors deep. Getting on it means access to works at primary prices — ' +
            'works that resell for 10x immediately. But there\'s an unspoken rule: you CANNOT flip. Ever.',
        choices: [
            {
                label: 'Accept — commit to holding for at least 5 years',
                effects: { cash: -50000, portfolioAdd: 'waiting_list_gem', reputation: 15 },
                outcome: 'You\'re in. The work is extraordinary. And you can\'t sell it.',
            },
            {
                label: 'Accept, but plan to quietly flip after 2 years',
                effects: { cash: -50000, portfolioAdd: 'waiting_list_flip', marketHeat: 20 },
                outcome: 'You bought at $50K. It\'s worth $500K. The temptation is enormous.',
            },
            {
                label: 'Decline — you don\'t play by anyone\'s rules',
                effects: { reputation: -5 },
                outcome: 'They won\'t call again. But you kept your freedom.',
            },
        ],
    },
    {
        id: 'commission_fixing',
        title: 'The Identical Offers',
        category: 'scandal',
        frequency: [8, 999],
        weight: 1,
        description:
            'You\'re consigning a major work to auction. Both Christie\'s and Sotheby\'s come back with ' +
            'identical commission rates — to the decimal. The same guarantee level. The same marketing plan. ' +
            'It\'s as if they coordinated. Because maybe they did.',
        choices: [
            {
                label: 'Accept the rate — it\'s the market standard',
                effects: { cash: -5000 },
                outcome: 'You went along with it. Everyone does.',
            },
            {
                label: 'Investigate and report to regulators',
                effects: { intel: 6, reputation: 15, npcFavor: { target: 'diana_chen', amount: -20 } },
                outcome: 'You opened a can of worms. The auction houses are sweating.',
            },
            {
                label: 'Leverage one against the other — demand better terms',
                effects: { cash: 15000, intel: 2 },
                outcome: 'You played them. Saved $15K on commission. Well done.',
            },
        ],
    },
    {
        id: 'provenance_trail',
        title: 'The Provenance Trail',
        category: 'scandal',
        frequency: [6, 999],
        weight: 2,
        description:
            'A work in your collection has a gap in its provenance — specifically during WWII. An organization ' +
            'claims it was looted from a Jewish family in 1940. The documentation is inconclusive. ' +
            'This could be the end of your most valuable holding, or it could be a false claim.',
        choices: [
            {
                label: 'Hire a provenance researcher — get to the truth ($12K)',
                effects: { cash: -12000, intel: 6 },
                outcome: 'The research will take months. But you\'ll know.',
            },
            {
                label: 'Return the work proactively — it\'s the right thing to do',
                effects: { portfolioRemove: 'strongest', reputation: 30 },
                outcome: 'Maximum moral capital. The family is grateful. The press is generous.',
            },
            {
                label: 'Fight the claim in court — your purchase was legal',
                effects: { cash: -60000, reputation: -15, suspicion: 10 },
                outcome: 'You may win legally. But morally? The court of public opinion has spoken.',
            },
        ],
    },
    {
        id: 'gallery_buyback_exposed',
        title: 'The Artificial Floor',
        category: 'scandal',
        frequency: [10, 999],
        weight: 1,
        description:
            'Your market analyst contact calls with a bombshell: a gallery you buy from regularly has been ' +
            'buying their own artists\' work at auction to prevent prices from falling. "Protecting the market," ' +
            'they call it. Every price you thought was real was artificially supported. If the buybacks stop, ' +
            'your holdings could crater.',
        choices: [
            {
                label: 'Sell everything from that gallery immediately',
                effects: { sellArtistWorks: true, marketHeat: 10 },
                outcome: 'You got out before the floor drops. But you tipped your hand.',
            },
            {
                label: 'Hold — if the gallery is protecting prices, that\'s good for you',
                effects: { intel: 3 },
                outcome: 'You\'re riding a manipulated market. As long as it lasts.',
            },
            {
                label: 'Confront the gallery director privately',
                effects: { intel: 5, npcFavor: { target: 'elena_ross', amount: -15 } },
                outcome: 'They denied everything. But they know that you know.',
            },
        ],
    },
];

