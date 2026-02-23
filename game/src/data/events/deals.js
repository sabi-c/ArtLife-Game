/**
 * deals.js — Email-based deal negotiation events
 *
 * Events with `isEmail: true` route to EmailDialogueOverlay instead of
 * the standard EventOverlay. Each step is either an email (incoming/outgoing)
 * or a choice that generates a player reply and optional NPC response.
 *
 * Template vars: {{playerName}} is replaced at render time.
 *
 * @see EmailDialogueOverlay.jsx for the rendering component
 */

export const DEAL_EVENTS = [
    {
        id: 'deal_sasha_approach',
        title: 'Approach from Sasha Klein',
        category: 'deal',
        isEmail: true,
        emailSubject: 'Re: Untitled (Blue), 2022',
        /* Fires when player owns a high-value work and Sasha has positive favor */
        condition: (s) => {
            const hasExpensiveWork = (s.portfolio || []).some(w => (w.price || w.basePrice || 0) > 200000);
            return hasExpensiveWork && (s.week || 0) >= 4;
        },
        steps: [
            {
                type: 'email',
                direction: 'incoming',
                from: 'sasha_klein',
                fromName: 'Sasha Klein',
                body: `Dear {{playerName}},\n\nI understand you recently acquired the Chen piece. I've been following it for some time.\n\nIf you're open to a private arrangement, my client is prepared to offer **$285,000** — above current estimate.\n\nBest,\nSasha`,
            },
            {
                type: 'choice',
                text: 'How do you respond?',
                choices: [
                    {
                        label: 'Counter at $320,000',
                        emailBody: `Dear Sasha,\n\nThank you for reaching out. The work is performing above projections. We would consider **$320,000** given current conditions.\n\nBest regards`,
                        effects: { reputation: 1 },
                        npcResponse: {
                            from: 'sasha_klein',
                            fromName: 'Sasha Klein',
                            body: `Understood. I'll present this to my client.\n\n**$300,000** is the absolute ceiling. Let me know by end of week.`,
                        },
                    },
                    {
                        label: 'Accept the offer',
                        emailBody: `Dear Sasha,\n\nWe accept. Please have your team prepare the paperwork.\n\nBest regards`,
                        effects: { cash: 285000, reputation: 0 },
                        outcome: 'Clean exit at $285K. Work removed from portfolio.',
                    },
                    {
                        label: 'Decline politely',
                        emailBody: `Dear Sasha,\n\nThank you for the interest, but the work is not available at this time. We intend to hold for the foreseeable future.\n\nWarm regards`,
                        effects: { reputation: 1 },
                        outcome: 'You held firm. Sasha respects the conviction.',
                    },
                ],
            },
        ],
    },
    {
        id: 'deal_marcus_flip',
        title: 'Quick Flip Opportunity',
        category: 'deal',
        isEmail: true,
        emailSubject: 'Time-Sensitive: Emerging Market Piece',
        condition: (s) => (s.week || 0) >= 6 && (s.cash || 0) >= 50000,
        steps: [
            {
                type: 'email',
                direction: 'incoming',
                from: 'marcus_price',
                fromName: 'Marcus Price',
                body: `{{playerName}},\n\nI've got a line on a piece that's about to be featured in the next issue of Artforum. The artist is represented by a mid-tier gallery but hasn't broken through yet.\n\nCurrent ask is **$45,000**. Post-publication, we're looking at **$80K-120K** conservatively.\n\nThis won't last. Let me know if you want in.\n\n— Marcus`,
            },
            {
                type: 'choice',
                text: 'What do you tell Marcus?',
                choices: [
                    {
                        label: 'Buy at asking price',
                        emailBody: `Marcus,\n\nI'm in. Wire the **$45,000** today. Send me the details.\n\nThanks for the tip.`,
                        effects: { cash: -45000, intel: 2 },
                        npcResponse: {
                            from: 'marcus_price',
                            fromName: 'Marcus Price',
                            body: `Done. Piece is yours. I'll have the gallery send the condition report.\n\nRemember — you didn't hear this from me.`,
                        },
                    },
                    {
                        label: 'Try to negotiate down',
                        emailBody: `Marcus,\n\nInteresting lead. Would the seller take **$35,000**? The artist has no secondary market track record yet.\n\nLet me know.`,
                        effects: {},
                        npcResponse: {
                            from: 'marcus_price',
                            fromName: 'Marcus Price',
                            body: `Come on. I'm giving you a heads up here. **$42,000** and that's me doing you a favor. Final offer.`,
                        },
                    },
                    {
                        label: 'Pass on it',
                        emailBody: `Marcus,\n\nAppreciate the tip but I'll sit this one out. Cash is tied up elsewhere.\n\nNext time.`,
                        effects: {},
                        outcome: 'You passed. Marcus moves on to the next buyer.',
                    },
                ],
            },
        ],
    },
];
