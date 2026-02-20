/**
 * Event pool for ArtLife
 * Oregon Trail-style: something happens almost every turn.
 * Events are categorized, weighted, and some are class-restricted.
 */

// ─────────────────────────────────────────────
// SOCIAL EVENTS — Gallery openings, parties, dinners
// ─────────────────────────────────────────────
const SOCIAL_EVENTS = [
    {
        id: 'cocktail_tip',
        title: 'A Whisper at the Opening',
        category: 'social',
        frequency: [1, 999],
        weight: 3,
        steps: [
            // ── ACT 1: The Setting ──
            {
                type: 'narrative',
                text: 'The gallery is a converted warehouse in Chelsea — exposed brick, polished concrete, the kind of lighting that costs more than most people\'s rent. You accept a glass of champagne from a tray that appears at exactly the right moment.',
            },
            {
                type: 'narrative',
                text: 'The crowd is thin tonight. The serious collectors came early. The Instagram people will come later. Right now, it\'s just money and paintings and the sound of heels on concrete.',
            },
            {
                type: 'dialogue',
                speaker: 'dealer',
                speakerName: 'Margaux Villiers',
                text: 'She materializes beside you — Margaux Villiers, mid-tier dealer, always impeccably dressed, always exactly one drink ahead of you. "I need to tell you something," she says, looking over her shoulder. "Not here. Follow me."',
            },
            {
                type: 'narrative',
                text: 'She walks you to a quiet corner near the fire exit, where the music from the speakers doesn\'t quite reach. She lowers her voice.',
            },
            {
                type: 'dialogue',
                speaker: 'dealer',
                speakerName: 'Margaux Villiers',
                text: '"I have it on good authority that an unknown painter — working out of a studio in Red Hook — is about to be picked up by a major New York gallery. Pace, maybe. Or Gagosian. The announcement is in two weeks. After that, the prices triple. Right now, you can buy direct for almost nothing."',
            },
            // ── ACT 2: The Decision ──
            {
                type: 'choice',
                text: 'Margaux watches you, waiting. Her eyes are calculating — she\'s not giving this away for free. There\'s always an angle.',
                choices: [
                    // ── BRANCH A: Buy Immediately ──
                    {
                        label: 'Buy 2 works immediately — act on faith',
                        effects: { cash: -15000 },
                        outcome: 'You trust your gut. You trust Margaux — mostly. Within the hour, you\'re in a cab to Red Hook with $15,000 in a wire transfer.',
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'The studio is on the third floor of a building that smells like wet cement. The artist — a young Korean-American woman named Jae-Eun Park — opens the door in paint-stained overalls. She\'s surprised. Nobody comes to her studio.',
                            },
                            {
                                type: 'dialogue',
                                speaker: 'artist',
                                speakerName: 'Jae-Eun Park',
                                text: '"You want to buy? Now? I thought — I mean, nobody has even reviewed my show yet." She gestures at the canvases lining the walls. Large-scale, color-field works that remind you of Helen Frankenthaler but with something rawer. Something angry.',
                            },
                            {
                                type: 'choice',
                                text: 'Two pieces stand out. Both are extraordinary. But you can only carry so much risk.',
                                choices: [
                                    {
                                        label: 'Take the large diptych — \"The Drowning\" — $12,000',
                                        effects: { cash: -12000, portfolioAdd: 'studio_direct', reputation: 5, taste: 2 },
                                        outcome: 'She wraps it herself. Her hands are shaking. You\'re the first collector who ever bought directly from her. If the gallery deal goes through, this painting will be worth six figures.',
                                        schedules: [{
                                            weeksDelay: 3,
                                            type: 'phone_message',
                                            payload: {
                                                from: 'system',
                                                subject: '📈 Jae-Eun Park — Gallery signed',
                                                body: 'The announcement dropped this morning. Jae-Eun Park signed with Pace Gallery. Her Red Hook studio is now a pilgrimage site. "The Drowning" — the diptych you bought for $12,000 — just got an insurance appraisal at $85,000.',
                                                urgency: 'normal',
                                                category: 'intel',
                                            },
                                        }],
                                    },
                                    {
                                        label: 'Take two smaller pieces — spread the risk — $15,000',
                                        effects: { cash: -15000, portfolioAdd: 'studio_direct', reputation: 3 },
                                        outcome: 'Diversification. Two canvases, two bets. She signs the backs with a Sharpie. "I can\'t believe this is happening," she whispers.',
                                        schedules: [{
                                            weeksDelay: 3,
                                            type: 'phone_message',
                                            payload: {
                                                from: 'system',
                                                subject: '📈 Park signed — your early bet pays off',
                                                body: 'Pace Gallery announces Jae-Eun Park as their newest artist. Your two pieces are now valued at 4× what you paid. Margaux texts you a champagne emoji.',
                                                urgency: 'normal',
                                                category: 'intel',
                                            },
                                        }],
                                    },
                                    {
                                        label: 'Negotiate — offer $8,000 for the diptych',
                                        effects: { cash: -8000, portfolioAdd: 'studio_direct', reputation: -2 },
                                        outcome: 'She hesitates. You can see the calculation behind her eyes — she needs the money. "Okay," she says quietly. You got a deal. It doesn\'t feel like a victory.',
                                        schedules: [{
                                            weeksDelay: 3,
                                            type: 'phone_message',
                                            payload: {
                                                from: 'system',
                                                subject: '📈 Park signed — and she remembers',
                                                body: 'Jae-Eun Park signed with Pace. Your diptych is worth $85,000 now. But word is she told the gallery about the lowball offer. "He knew what it was worth," she reportedly said. Reputation matters.',
                                                urgency: 'normal',
                                                category: 'drama',
                                            },
                                        },
                                        {
                                            weeksDelay: 3,
                                            type: 'stat_change',
                                            payload: { reputation: -5, marketHeat: 3 },
                                        }],
                                    },
                                ],
                            },
                        ],
                    },
                    // ── BRANCH B: Ask for Details ──
                    {
                        label: 'Ask for more details first — "Which gallery? Which artist?"',
                        effects: { intel: 1 },
                        outcome: 'You\'re not the type to jump without looking down.',
                        nextSteps: [
                            {
                                type: 'dialogue',
                                speaker: 'dealer',
                                speakerName: 'Margaux Villiers',
                                text: '"I can\'t give you the gallery — I promised my source. But the artist is young. Korean-American. Large-scale color field. Working in Red Hook." She pauses. "Information has a shelf life, darling. By next week, everyone will know."',
                            },
                            {
                                type: 'choice',
                                text: 'She\'s given you just enough to act on — or just enough to verify. Your move.',
                                choices: [
                                    {
                                        label: 'Research the artist first — verify through your contacts',
                                        effects: { intel: 3 },
                                        outcome: 'You spend the evening on the phone. Gallery assistants confirm: a young painter in Red Hook is being courted by a major gallery. The tip checks out.',
                                        schedules: [{
                                            weeksDelay: 1,
                                            type: 'phone_message',
                                            payload: {
                                                from: 'system',
                                                subject: '🔍 Red Hook artist — verified',
                                                body: 'Your research confirms it: Jae-Eun Park, 28, Red Hook studio. Two galleries are competing for her. Prices will spike. You have a one-week window.',
                                                urgency: 'urgent',
                                                category: 'intel',
                                            },
                                        }],
                                    },
                                    {
                                        label: 'Ask Margaux what she wants in return — nothing is free',
                                        effects: { intel: 2, reputation: 2 },
                                        outcome: 'She smiles. "I have a client who wants an introduction to someone in your Rolodex. Elena Ross. Can you make it happen?" The art world runs on favours.',
                                        npcEffects: { elena_ross: { favor: -1 } },
                                    },
                                    {
                                        label: 'File it away and move on — too many unknowns',
                                        effects: { intel: 1 },
                                        outcome: 'You nod, thank her, and drift back to the champagne. Three weeks later, you read about the gallery signing in ArtNews. The tip was real. You just didn\'t move.',
                                    },
                                ],
                            },
                        ],
                    },
                    // ── BRANCH C: Pass the Tip ──
                    {
                        label: 'Pass the tip to a colleague — bank a favour',
                        effects: { reputation: 5 },
                        outcome: 'You know exactly who to call. Viktor Petrov — a collector with deep pockets and shallow patience. He\'ll act immediately.',
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'You text Viktor from the bathroom. Within thirty minutes, he replies: "Done. Bought three. You\'re a saint." He doesn\'t know where the tip came from. He doesn\'t care.',
                            },
                            {
                                type: 'choice',
                                text: 'Viktor owes you now. The question is when — and how — to collect.',
                                choices: [
                                    {
                                        label: 'Ask for first look at his next deaccession',
                                        effects: { access: 3, intel: 1 },
                                        outcome: '"Done," he says. "I\'m selling a Richter next month. You\'ll see it before anyone." The favour economy works.',
                                        schedules: [{
                                            weeksDelay: 4,
                                            type: 'phone_message',
                                            payload: {
                                                from: 'system',
                                                subject: '💎 Viktor — Richter preview',
                                                body: 'Viktor\'s Richter is ready for private viewing. 1998, squeegee painting, museum provenance. He\'s asking $340,000 but will hear $280,000 from you. First look, as promised.',
                                                urgency: 'normal',
                                                category: 'deal',
                                            },
                                        }],
                                    },
                                    {
                                        label: 'Save the favour — you don\'t need anything today',
                                        effects: { reputation: 3 },
                                        outcome: 'Patience. The best favours are the ones you haven\'t called in yet.',
                                    },
                                ],
                            },
                        ],
                    },
                    // ── BRANCH D: Ignore ──
                    {
                        label: 'Ignore it entirely — tips are for amateurs',
                        effects: {},
                        outcome: 'You sip your champagne and move on. You\'ve heard a hundred tips. Most of them are worthless. Most of them.',
                    },
                    // ── BRANCH E: Blue Option — Insider Play ──
                    {
                        label: 'Ask which gallery — you have contacts there',
                        isBlueOption: true,
                        requires: { intel: { min: 5 }, reputation: { min: 40 } },
                        effects: { intel: 2 },
                        outcome: 'You hold her gaze. "Margaux. I know people at every major gallery in this city. If you tell me which one, I can get in before the announcement, at a price that works for both of us."',
                        tags: ['insider', 'social'],
                        nextSteps: [
                            {
                                type: 'dialogue',
                                speaker: 'dealer',
                                speakerName: 'Margaux Villiers',
                                text: '"Pace." She says it like she\'s handing you a loaded weapon. "The meeting is Thursday. Larry himself is flying in to see the work. After that, the prices are institutional."',
                            },
                            {
                                type: 'narrative',
                                text: 'You know three people at Pace. One of them owes you a favour from Art Basel two years ago. Your fingers find your phone before Margaux finishes her sentence.',
                            },
                            {
                                type: 'choice',
                                text: 'You have 72 hours before the gallery meeting. The intel is platinum-grade. How do you use it?',
                                choices: [
                                    {
                                        label: 'Call your Pace contact — negotiate a pre-signing purchase',
                                        effects: { cash: -10000, intel: 3, reputation: 5, access: 3 },
                                        outcome: 'Your contact at Pace arranges a private view. You buy the best two pieces at a price that will look laughably cheap in a month. This is how the inside game works.',
                                        schedules: [{
                                            weeksDelay: 2,
                                            type: 'phone_message',
                                            payload: {
                                                from: 'system',
                                                subject: '📈 That tip paid off — big',
                                                body: 'Pace Gallery announces Jae-Eun Park. Your pre-signing purchase is now worth 5× what you paid. Margaux sends a text: "You\'re welcome." She\'ll want something back. They always do.',
                                                urgency: 'normal',
                                                category: 'intel',
                                            },
                                        }],
                                    },
                                    {
                                        label: 'Go directly to the artist\'s studio — cut out the gallery entirely',
                                        effects: { cash: -8000, portfolioAdd: 'studio_direct', taste: 3, reputation: 3 },
                                        outcome: 'You show up in Red Hook before the gallery even knows you exist. Jae-Eun Park sells you a painting right off the easel, still wet. By Thursday, she\'ll have representation. By Friday, this painting won\'t be available at any price.',
                                        schedules: [{
                                            weeksDelay: 2,
                                            type: 'phone_message',
                                            payload: {
                                                from: 'system',
                                                subject: '🎨 Direct studio buy — Pace announcement',
                                                body: 'Pace signs Jae-Eun Park. Your direct studio purchase skipped the gallery markup entirely. The painting you bought for $8,000 is now listed at $65,000 through Pace. Smart money.',
                                                urgency: 'normal',
                                                category: 'intel',
                                            },
                                        }],
                                    },
                                    {
                                        label: 'Sit on the intel — wait for the announcement, then leverage it',
                                        effects: { intel: 5 },
                                        outcome: 'You don\'t buy anything. Instead, you wait. When the announcement drops, you\'re the person everyone calls for context. Knowledge isn\'t always about action. Sometimes it\'s about position.',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'studio_visit',
        title: 'The Studio Visit',
        category: 'social',
        frequency: [1, 999],
        weight: 2,
        steps: [
            {
                type: 'narrative',
                text: 'You take the L train to Bushwick. The building is unmarked — just a rusted metal door between a bodega and a nail salon. You check the text again. Third floor, unit 3B.',
            },
            {
                type: 'narrative',
                text: 'The studio smells like turpentine and cold coffee. Canvases cover every wall — floor to ceiling. Drop cloths splattered with years of colour. This is where the work happens.',
            },
            {
                type: 'dialogue',
                speaker: 'artist',
                speakerName: 'The Artist',
                text: 'Nobody has seen these. I\'ve been working for two years in silence. I wanted to show someone I trust before the gallery gets involved.',
            },
            {
                type: 'choice',
                text: 'Three canvases lean against the far wall. Extraordinary up close. The brushwork is alive.',
                choices: [
                    {
                        label: 'Buy all three directly — $45K',
                        effects: { cash: -45000, portfolioAdd: 'studio_direct', reputation: 8 },
                        outcome: 'You bought at source. No gallery markup. No waiting list. The artist remembers who believed first.',
                        schedules: [{
                            weeksDelay: 12,
                            type: 'phone_message',
                            payload: {
                                from: 'system',
                                subject: '🎨 Studio artist signed by major gallery',
                                body: 'The artist from the Bushwick studio just got signed by Hauser & Wirth. Your early purchases are now worth 4× what you paid.',
                                urgency: 'normal',
                                category: 'intel',
                            },
                        }],
                    },
                    {
                        label: 'Pick the best one — $18K',
                        effects: { cash: -18000, portfolioAdd: 'studio_direct', reputation: 5 },
                        outcome: 'You chose the strongest piece. She appreciates your discernment.',
                    },
                    {
                        label: 'Just build the relationship — no purchase',
                        effects: { reputation: 10 },
                        outcome: 'You showed respect. The artist trusts you now. That\'s worth more than any canvas.',
                    },
                    {
                        label: 'Decline politely — you have to go',
                        effects: { reputation: -3 },
                        outcome: 'You were busy. The invitation won\'t come again easily.',
                    },
                ],
            },
        ],
    },
    {
        id: 'collector_dinner',
        title: 'The Collector\'s Dinner',
        category: 'social',
        frequency: [1, 999],
        weight: 3,
        steps: [
            // ── ACT 1: The Invitation ──
            {
                type: 'narrative',
                text: 'A heavy cream envelope arrives. Embossed in gold: your name, a date, an address on the Upper East Side. The host is Marcus Thorne — hedge fund legend, art world kingmaker. His collection is legendary. His guest list is power.',
            },
            {
                type: 'narrative',
                text: 'You know the rules. Attendance is a statement. Absence is noticed. And what you do inside those walls matters more than what you buy at any gallery.',
            },
            {
                type: 'choice',
                text: 'The dinner is tonight. How do you approach it?',
                choices: [
                    // ── BRANCH A: Aggressive Networking ──
                    {
                        label: 'Attend and network aggressively — work the room',
                        effects: { cash: -1000, reputation: 3 },
                        outcome: 'You arrive early. Press your suit. Check your breath. Tonight is about positioning.',
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'The apartment is vast — a pre-war penthouse with views of Central Park that make your chest tight. A Rothko dominates the foyer. A Twombly hangs in the powder room like it\'s nothing. You count seven people you recognize from ArtNews.',
                            },
                            {
                                type: 'dialogue',
                                speaker: 'collector',
                                speakerName: 'Marcus Thorne',
                                text: 'Ah, you came. Good. I\'ve heard interesting things about you. Come — there\'s someone I want you to meet.',
                            },
                            {
                                type: 'narrative',
                                text: 'He steers you toward a corner of the room where a compact woman in a black Chanel suit is examining a small painting. She turns. You recognize her: Isabelle Duvall, advisor to three sovereign wealth funds and the person who decides where $400 million in art acquisitions goes every year.',
                            },
                            {
                                type: 'choice',
                                text: 'Isabelle looks at you with polite curiosity. Marcus disappears into the crowd.',
                                choices: [
                                    // A1: Talk Deals
                                    {
                                        label: 'Talk about your recent acquisitions — impress with your portfolio',
                                        effects: { reputation: 5, intel: 1 },
                                        outcome: 'She listens. Nods occasionally. You can\'t tell if she\'s impressed or sizing you up for weakness. Then she says something unexpected.',
                                        nextSteps: [
                                            {
                                                type: 'dialogue',
                                                speaker: 'advisor',
                                                speakerName: 'Isabelle Duvall',
                                                text: 'One of our funds is deaccessioning a small Kiefer — 1987, exceptional provenance. We need discretion. Are you interested?',
                                            },
                                            {
                                                type: 'choice',
                                                text: 'A private sale offer from a sovereign wealth fund. The price will be steep but the provenance is museum-grade.',
                                                choices: [
                                                    {
                                                        label: 'Express serious interest — "Name the price"',
                                                        effects: { cash: -120000, portfolioAdd: 'sovereign_kiefer', reputation: 10 },
                                                        outcome: 'She texts someone. A number arrives: $120,000. Below market. She\'s testing you — and you passed. The Kiefer is yours.',
                                                        schedules: [{
                                                            weeksDelay: 8,
                                                            type: 'phone_message',
                                                            payload: {
                                                                from: 'system',
                                                                subject: '🏛️ Isabelle Duvall — follow-up',
                                                                body: 'Isabelle Duvall has added you to her quarterly briefing list. You now have advance notice of institutional deaccessions. This is how the inside game works.',
                                                                urgency: 'normal',
                                                                category: 'intel',
                                                            },
                                                        }],
                                                    },
                                                    {
                                                        label: 'Negotiate — you know Kiefer prices have softened',
                                                        effects: { intel: 2 },
                                                        outcome: 'She raises an eyebrow. "You\'ve done your homework." She respects that. The offer stands, but she gives you a week to decide.',
                                                        schedules: [{
                                                            weeksDelay: 1,
                                                            type: 'phone_message',
                                                            payload: {
                                                                from: 'system',
                                                                subject: '⏰ Kiefer deadline',
                                                                body: 'Isabelle\'s Kiefer offer expires tomorrow. $95,000 — she came down. Last chance.',
                                                                urgency: 'urgent',
                                                                category: 'deal',
                                                            },
                                                        }],
                                                    },
                                                    {
                                                        label: 'Decline gracefully — too rich for your blood right now',
                                                        effects: { reputation: -2 },
                                                        outcome: 'She doesn\'t blink. "Perhaps next time." But you sense the door just closed a little.',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    // A2: Talk Philosophy
                                    {
                                        label: 'Ask about the Rothko in the foyer — show your eye, not your wallet',
                                        effects: { taste: 3, reputation: 3 },
                                        outcome: 'Her expression changes. For the first time all evening, she looks genuinely interested. "You noticed the Rothko. Most people walk past it to find the bar."',
                                        nextSteps: [
                                            {
                                                type: 'dialogue',
                                                speaker: 'advisor',
                                                speakerName: 'Isabelle Duvall',
                                                text: 'I\'m curating a private exhibition in Venice next month. Sixteen works from six collections. Very quiet. Very exclusive. I need people who can actually see. Would you like to come?',
                                            },
                                            {
                                                type: 'choice',
                                                text: 'An invitation to Venice. From Isabelle Duvall. This is how careers change shape.',
                                                choices: [
                                                    {
                                                        label: 'Accept — "I wouldn\'t miss it"',
                                                        effects: { cash: -8000, reputation: 12, taste: 5, access: 5 },
                                                        outcome: 'She smiles. Actually smiles. "I\'ll have my assistant send the details." You just joined a circle most collectors spend decades trying to enter.',
                                                        schedules: [{
                                                            weeksDelay: 4,
                                                            type: 'phone_message',
                                                            payload: {
                                                                from: 'system',
                                                                subject: '✈️ Venice: Exhibition Details',
                                                                body: 'Palazzo Grassi, third floor. Private entrance. Three days of viewings with some of the most important collectors in Europe. Your taste just opened a door money can\'t buy.',
                                                                urgency: 'normal',
                                                                category: 'personal',
                                                            },
                                                        }],
                                                    },
                                                    {
                                                        label: 'Decline — schedule conflict',
                                                        effects: { reputation: -3 },
                                                        outcome: '"I understand." Her warmth cools by exactly two degrees. Some invitations only come once.',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    // A3: Excuse Yourself
                                    {
                                        label: 'Make small talk and excuse yourself — you have other targets',
                                        effects: { intel: 2 },
                                        outcome: 'You gather intel from three other conversations. A gallery director mentions a closing. A collector brags about a flip. You file everything away.',
                                        nextSteps: [
                                            {
                                                type: 'narrative',
                                                text: 'Later, at the bar, you overhear Marcus Thorne on the phone. His voice is low but you catch fragments: "...selling the Basquiat quietly... before the market... need it done this month..."',
                                            },
                                            {
                                                type: 'choice',
                                                text: 'Marcus Thorne is secretly selling a Basquiat. This information is worth a fortune — or a friendship.',
                                                choices: [
                                                    {
                                                        label: 'Approach Marcus later — position yourself as a buyer',
                                                        effects: { cash: -200000, portfolioAdd: 'thorne_basquiat', reputation: 8 },
                                                        outcome: 'You wait until dessert. Mention it casually. His eyes narrow, then relax. "How much did you hear?" Enough. The deal is done in whispers.',
                                                        schedules: [{
                                                            weeksDelay: 6,
                                                            type: 'phone_message',
                                                            payload: {
                                                                from: 'system',
                                                                subject: '🎨 Basquiat market moves',
                                                                body: 'Word leaked that Thorne sold his Basquiat. The market is buzzing. Your quiet purchase is now public knowledge — and worth 40% more than you paid.',
                                                                urgency: 'normal',
                                                                category: 'intel',
                                                            },
                                                        }],
                                                    },
                                                    {
                                                        label: 'Pass the intel to a rival dealer — bank a future favour',
                                                        effects: { reputation: 5, intel: 3 },
                                                        outcome: 'You text a dealer you trust. Within hours, they\'ve made an approach. You didn\'t buy anything — but you just became the most useful person in their phone.',
                                                        schedules: [{
                                                            weeksDelay: 3,
                                                            type: 'phone_message',
                                                            payload: {
                                                                from: 'system',
                                                                subject: '🤝 Favour returned',
                                                                body: 'The dealer you tipped off just gave you first look at a Richter coming to market next week. "We\'re even now." Not quite — but it\'s a start.',
                                                                urgency: 'normal',
                                                                category: 'deal',
                                                            },
                                                        }],
                                                    },
                                                    {
                                                        label: 'Keep it to yourself — information is leverage',
                                                        effects: { intel: 5 },
                                                        outcome: 'You say nothing. To anyone. The knowledge sits in your chest like a loaded weapon. When the time comes, you\'ll know how to use it.',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                    // ── BRANCH B: Reserved Observation ──
                    {
                        label: 'Attend but stay reserved — observe from the edges',
                        effects: { cash: -500, reputation: 2 },
                        outcome: 'You arrive precisely on time. Find a glass of wine. Find a wall. Watch.',
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'From your vantage point by the window, you notice something the networkers miss. A young woman stands alone near the Twombly, studying it with an intensity that borders on devotion. She\'s not dressed for this crowd. Her shoes are wrong. Her bag is from a thrift store. But the way she looks at that painting...',
                            },
                            {
                                type: 'narrative',
                                text: 'Nobody is talking to her. The room\'s social radar has scanned her and filed her under "irrelevant." You recognize that look. You\'ve seen it in Bushwick studios and graduate studios. That\'s the look of someone who actually makes things.',
                            },
                            {
                                type: 'choice',
                                text: 'The young artist is completely alone in a room full of power.',
                                choices: [
                                    // B1: Approach the artist
                                    {
                                        label: 'Walk over and introduce yourself',
                                        effects: { taste: 3, reputation: 2 },
                                        outcome: 'Her name is Yuki Sato. She\'s an MFA student at Columbia, invited because Marcus Thorne\'s wife saw her thesis show. She\'s terrified. She\'s brilliant.',
                                        nextSteps: [
                                            {
                                                type: 'dialogue',
                                                speaker: 'artist',
                                                speakerName: 'Yuki Sato',
                                                text: 'You\'re the first person who\'s spoken to me all night. I thought maybe I was invisible. I have a studio in Sunset Park — it\'s nothing fancy but... would you want to see what I\'m working on? Nobody in this room has asked.',
                                            },
                                            {
                                                type: 'choice',
                                                text: 'A studio visit offer from an unknown artist. These are the moments that make or break a career — hers and yours.',
                                                choices: [
                                                    {
                                                        label: 'Accept — "I\'d love to. Name the day."',
                                                        effects: { taste: 5, reputation: 8 },
                                                        outcome: 'Her face lights up. You exchange numbers. This is how it starts — a conversation by a Twombly, a handshake, an instinct. In two years, you\'ll either look like a genius or a sentimentalist.',
                                                        schedules: [{
                                                            weeksDelay: 2,
                                                            type: 'phone_message',
                                                            payload: {
                                                                from: 'system',
                                                                subject: '🎨 Yuki Sato — Studio Visit',
                                                                body: 'Yuki\'s studio is astonishing. Thirty canvases, all in a series about light pollution and memory. Raw. Ambitious. Nobody knows about her yet. You could buy the entire series for $15,000.',
                                                                urgency: 'normal',
                                                                category: 'deal',
                                                            },
                                                        }],
                                                    },
                                                    {
                                                        label: 'Give her your card — "Let me think about it"',
                                                        effects: { intel: 1 },
                                                        outcome: 'She takes the card. Looks at it. Puts it in her thrift-store bag carefully, like it\'s made of glass. You\'ll hear from her. Probably.',
                                                    },
                                                    {
                                                        label: 'Politely decline — she\'s too green, too risky',
                                                        effects: {},
                                                        outcome: 'She nods. "I understand." But something in her eyes dims. The next person who says yes to her might make a fortune. It won\'t be you.',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    // B2: Eavesdrop on gossip
                                    {
                                        label: 'Stay quiet and eavesdrop — the real conversations happen in whispers',
                                        effects: { intel: 4 },
                                        outcome: 'You drift from group to group, always on the periphery. Listening.',
                                        nextSteps: [
                                            {
                                                type: 'narrative',
                                                text: 'You piece together a map of the room. Three conversations reveal three facts: (1) A major Chelsea gallery is about to be evicted. (2) A tech billionaire is liquidating his collection through a private dealer. (3) Two board members of the Whitney are fighting over a deaccession.',
                                            },
                                            {
                                                type: 'choice',
                                                text: 'Three pieces of intel, each potentially valuable. But acting on all of them would stretch you thin.',
                                                choices: [
                                                    {
                                                        label: 'Focus on the gallery eviction — distressed inventory coming to market',
                                                        effects: { intel: 3 },
                                                        outcome: 'You make a mental note of the gallery name. When they start fire-selling, you\'ll be first in line.',
                                                        schedules: [{
                                                            weeksDelay: 3,
                                                            type: 'phone_message',
                                                            payload: {
                                                                from: 'system',
                                                                subject: '🏪 Gallery fire sale',
                                                                body: 'The Chelsea gallery is closing. Their entire roster — 40 works — is being offloaded at 30-50% below market. Your intel from the dinner paid off.',
                                                                urgency: 'urgent',
                                                                category: 'deal',
                                                            },
                                                        }],
                                                    },
                                                    {
                                                        label: 'Pursue the tech billionaire liquidation — big fish, big opportunity',
                                                        effects: { access: 3, intel: 2 },
                                                        outcome: 'You find the private dealer\'s number through a friend of a friend. These are works that haven\'t been seen in public for a decade.',
                                                        schedules: [{
                                                            weeksDelay: 5,
                                                            type: 'phone_message',
                                                            payload: {
                                                                from: 'system',
                                                                subject: '💎 Private collection viewable',
                                                                body: 'You\'ve been granted a viewing of the tech billionaire\'s collection. Seventeen works. Pre-auction. Just you and two other serious buyers.',
                                                                urgency: 'normal',
                                                                category: 'deal',
                                                            },
                                                        }],
                                                    },
                                                    {
                                                        label: 'File everything away — knowledge is its own reward',
                                                        effects: { intel: 5 },
                                                        outcome: 'You leave the dinner with more information than anyone else — and you didn\'t spend a dime to get it.',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    // B3: Leave early
                                    {
                                        label: 'Leave early — you\'ve seen enough',
                                        effects: { burnout: -1 },
                                        outcome: 'You slip out during dessert. The cool night air feels like freedom. Sometimes the smartest move is knowing when to leave.',
                                    },
                                ],
                            },
                        ],
                    },
                    // ── BRANCH C: Decline ──
                    {
                        label: 'Decline the invitation — you have other plans',
                        effects: { reputation: -5 },
                        outcome: 'People noticed your absence. Especially Marcus Thorne. His assistant texts you the next morning: "Marcus was disappointed you couldn\'t make it." The subtext is clear.',
                        schedules: [{
                            weeksDelay: 4,
                            type: 'phone_message',
                            payload: {
                                from: 'system',
                                subject: '❄️ The cold shoulder',
                                body: 'You\'ve been passed over for a private sale that went to another collector. Thorne\'s people handled it. Your absence at the dinner was noted.',
                                urgency: 'normal',
                                category: 'drama',
                            },
                        }],
                    },
                    // ── BRANCH D: Co-host (Blue Option) ──
                    {
                        label: 'Offer to co-host — bring wine from your private cellar',
                        isBlueOption: true,
                        requires: { reputation: { min: 55 }, cash: { min: 40000 } },
                        effects: { cash: -15000, reputation: 8 },
                        outcome: 'Marcus raises his glass to you at the table. "My co-host this evening." The room shifts. You just moved up a tier.',
                        tags: ['social', 'status'],
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'After dinner, the room thins. The important people stay. Marcus pours you a \'61 Pétrus and gets to the point.',
                            },
                            {
                                type: 'dialogue',
                                speaker: 'collector',
                                speakerName: 'Marcus Thorne',
                                text: 'I\'m restructuring my collection. I need to move some pieces quietly. But I also need someone to co-curate a show at my foundation. In either case, I need someone I trust. So — what interests you more? Business or legacy?',
                            },
                            {
                                type: 'choice',
                                text: 'Marcus Thorne is offering you either a business partnership or a curatorial collaboration. Either one changes your position permanently.',
                                choices: [
                                    {
                                        label: 'Business — "Let me help you move the collection"',
                                        effects: { cash: -20000, access: 10, intel: 5 },
                                        outcome: 'He leans back. "Good. I\'ll have my people send you the list tomorrow. Twenty-two works. Some are... complicated." You just became a principal dealer for one of the largest private collections in America.',
                                        schedules: [
                                            {
                                                weeksDelay: 2,
                                                type: 'phone_message',
                                                payload: {
                                                    from: 'system',
                                                    subject: '📋 Thorne Collection — Deaccession List',
                                                    body: 'Thorne\'s assistant sent the list. Twenty-two works including a Richter, two Koons, a Hirst, and a Kiefer. Estimated total value: $8.4 million. Your commission is 10%. This is the big leagues.',
                                                    urgency: 'urgent',
                                                    category: 'deal',
                                                },
                                            },
                                            {
                                                weeksDelay: 8,
                                                type: 'stat_change',
                                                payload: { cash: 50000, reputation: 10, access: 5 },
                                            },
                                        ],
                                    },
                                    {
                                        label: 'Legacy — "I want to curate the show"',
                                        effects: { taste: 10, reputation: 15 },
                                        outcome: '"Bold choice." He nods slowly. "The show is about memory and material. I want it to be important, not just expensive. You have six months." You just got handed the keys to one of New York\'s most prestigious private foundations.',
                                        schedules: [{
                                            weeksDelay: 10,
                                            type: 'phone_message',
                                            payload: {
                                                from: 'system',
                                                subject: '🏛️ Foundation show — critical acclaim',
                                                body: 'Your show at the Thorne Foundation opened to ecstatic reviews. "A curatorial debut of rare sensitivity," wrote the Times. Your reputation in the museum world just exploded.',
                                                urgency: 'normal',
                                                category: 'personal',
                                            },
                                        }],
                                    },
                                    {
                                        label: 'Both — "Why choose?"',
                                        effects: { cash: -30000, reputation: 12, taste: 5, access: 8, burnout: 3 },
                                        outcome: 'He laughs. "I like ambition." You shake hands. This will consume your next six months — but the return will be transformational. If you survive it.',
                                        schedules: [
                                            {
                                                weeksDelay: 4,
                                                type: 'phone_message',
                                                payload: {
                                                    from: 'system',
                                                    subject: '🔥 Burnout warning',
                                                    body: 'You\'re managing Thorne\'s deaccession AND curating his foundation show. The pace is brutal. Your assistant quit. You haven\'t slept properly in two weeks. But the results are coming.',
                                                    urgency: 'urgent',
                                                    category: 'personal',
                                                },
                                            },
                                            {
                                                weeksDelay: 10,
                                                type: 'stat_change',
                                                payload: { cash: 80000, reputation: 20, access: 8, taste: 5, burnout: 2 },
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'rival_encounter',
        title: 'A Rival Appears',
        category: 'social',
        frequency: [1, 999],
        weight: 2,
        steps: [
            {
                type: 'narrative',
                text: 'The gallery opening is packed. You grab a drink and push through the crowd toward the back room, where the serious pieces are kept.'
            },
            {
                type: 'narrative',
                text: 'You spot it immediately. The large-scale canvas you’ve had your eye on from the preview PDF. But someone else is already there.'
            },
            {
                type: 'dialogue',
                speaker: 'collector',
                speakerName: 'Julian Vance',
                text: 'He’s tracing the line of the frame with a proprietary finger. Julian Vance — your most consistent rival. He hasn’t seen you yet.'
            },
            {
                type: 'dialogue',
                speaker: 'dealer',
                speakerName: 'The Gallerist',
                text: 'The gallerist is hovering between the two of you, watching the tension form. She knows exactly what she’s doing. A bidding war is good for business.'
            },
            {
                type: 'choice',
                text: 'Julian hasn’t put a hold on it yet, but he’s seconds away. What’s your move?',
                choices: [
                    {
                        label: 'Move in fast — buy it before he can open his mouth',
                        effects: { cash: -35000, portfolioAdd: 'contested', reputation: 3 },
                        outcome: 'You step past him and nod to the gallerist. "I\'ll take it. Full price." Julian freezes. His eyes snap to you.',
                        nextSteps: [
                            {
                                type: 'dialogue',
                                speaker: 'collector',
                                speakerName: 'Julian Vance',
                                text: '"That’s poor form," he says quietly, his voice tight. "We were discussing terms." You smile back. "The only term that matters is \'sold\'."'
                            },
                            {
                                type: 'narrative',
                                text: 'You snatched the piece. But Julian won\'t forget this humiliation.'
                            }
                        ],
                        schedules: [{
                            weeksDelay: 5,
                            type: 'phone_message',
                            payload: {
                                from: 'system',
                                subject: '⚡ Rival collector retaliates',
                                body: 'Word is Julian Vance is still angry about that piece you snatched. He just outbid you on a private sale out of spite.',
                                urgency: 'normal',
                                category: 'drama',
                            },
                        }, {
                            weeksDelay: 5,
                            type: 'stat_change',
                            payload: { reputation: -3, marketHeat: 5 },
                        }],
                    },
                    {
                        label: 'Let him have it — play the long game',
                        effects: { reputation: 5, intel: 2 },
                        outcome: 'You stop, watch him for a moment, then turn around. Let him overpay. You have other targets.',
                        nextSteps: [
                            {
                                type: 'narrative',
                                text: 'Later, the gallerist finds you near the bar.'
                            },
                            {
                                type: 'dialogue',
                                speaker: 'dealer',
                                speakerName: 'The Gallerist',
                                text: '"I saw you back away. That was graceful. Between us? I think Julian overpaid. Let me show you something I haven’t brought out yet."'
                            }
                        ]
                    },
                    {
                        label: 'Approach him — propose splitting the artist\'s available works',
                        effects: { cash: -15000, reputation: 5 },
                        outcome: 'You walk up beside him. "It’s a strong piece," you say. "But the diptych in the hallway is better. What if we split them?"',
                        nextSteps: [
                            {
                                type: 'dialogue',
                                speaker: 'collector',
                                speakerName: 'Julian Vance',
                                text: 'He looks at you, evaluating the angle. "A détente?" he asks. "Fine. I take this one, you take the diptych. We don\'t drive the prices up on each other."'
                            },
                            {
                                type: 'narrative',
                                text: 'An unexpected alliance. For now.'
                            }
                        ]
                    },
                    {
                        label: 'Call Elena Ross — you\'re on her VIP list',
                        isBlueOption: true,
                        requires: { reputation: { min: 50 }, 'npcFavor.elena_ross': { min: 5 } },
                        effects: { cash: -25000, reputation: 8 },
                        outcome: 'You don\'t even walk into the room. You pull out your phone and text Elena.',
                        npcInvolved: 'elena_ross',
                        tags: ['insider', 'market'],
                        nextSteps: [
                            {
                                type: 'dialogue',
                                speaker: 'dealer',
                                speakerName: 'Elena Ross',
                                text: 'Her reply takes ten seconds: "It\'s yours. I\'ll tell my desk to put the red dot up now. Walk in and see Julian\'s face."'
                            },
                            {
                                type: 'narrative',
                                text: 'You walk into the back room just as the gallery assistant sticks a red dot next to the painting. Julian points to it, confused. You walk past him with a glass of champagne.'
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'art_world_gossip',
        title: 'Gossip at the Bar',
        category: 'social',
        frequency: [1, 999],
        weight: 4,
        description:
            'After the opening, you end up at the bar with a group of insiders. The wine is flowing, ' +
            'and so are the rumours. Someone mentions a gallery is about to close. Someone else says ' +
            'a major collector just got divorced.',
        choices: [
            {
                label: 'Listen carefully — knowledge is power',
                effects: { intel: 3 },
                outcome: 'You absorbed everything. Half of it will turn out to be true.',
            },
            {
                label: 'Contribute your own intel — trade information',
                effects: { intel: 2, reputation: 3 },
                outcome: 'You gave a little, got a lot. The art world runs on reciprocity.',
            },
            {
                label: 'Leave early — loose lips sink ships',
                effects: {},
                outcome: 'You slipped out before saying too much. Disciplined.',
            },
        ],
    },
    {
        id: 'instagram_moment',
        title: 'The Instagram Moment',
        category: 'social',
        frequency: [1, 999],
        weight: 2,
        description:
            'A collector with 400K followers posts a photo of your latest acquisition. ' +
            '"Incredible taste," they caption it. Your phone starts buzzing. Suddenly everyone ' +
            'wants to know about the artist.',
        choices: [
            {
                label: 'Lean into it — share the story, boost the artist',
                effects: { heatBoost: { random: false, amount: 8 }, reputation: 5 },
                outcome: 'The artist\'s heat just spiked. Your phone won\'t stop.',
            },
            {
                label: 'Stay quiet — let the work speak for itself',
                effects: { reputation: 3 },
                outcome: 'Mystery is its own currency in this world.',
            },
            {
                label: 'Use the attention to quietly sell',
                effects: { sellStrongest: true },
                outcome: 'You sold at peak attention. Smart.',
            },
        ],
    },
];

// ─────────────────────────────────────────────
// MARKET EVENTS — Trading, deals, market moves
// ─────────────────────────────────────────────
const MARKET_EVENTS = [
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

// ─────────────────────────────────────────────
// DRAMA EVENTS — Scandals, controversies, legal
// ─────────────────────────────────────────────
const DRAMA_EVENTS = [
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

// ─────────────────────────────────────────────
// PERSONAL EVENTS — Life happens
// ─────────────────────────────────────────────
const PERSONAL_EVENTS = [
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

// ─────────────────────────────────────────────
// TRAVEL/FAIR EVENTS — Art Basel, Venice, etc.
// ─────────────────────────────────────────────
const TRAVEL_EVENTS = [
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

// ─────────────────────────────────────────────
// OPPORTUNITY EVENTS — Lucky breaks, unique chances
// ─────────────────────────────────────────────
const OPPORTUNITY_EVENTS = [
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

// ─────────────────────────────────────────────
// SCANDAL EVENTS — Real art world scandals adapted for gameplay
// Drawn from the Art World Database research
// ─────────────────────────────────────────────
const SCANDAL_EVENTS = [
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

// ─────────────────────────────────────────────
// CHAIN EVENTS — Multi-week arcs triggered by ConsequenceScheduler
// These are NOT in the random pool. They fire via event_unlock only.
// ─────────────────────────────────────────────
const CHAIN_EVENTS = [
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

// ─────────────────────────────────────────────
// Combine all events
// ─────────────────────────────────────────────
export const EVENTS = [
    ...SOCIAL_EVENTS,
    ...MARKET_EVENTS,
    ...DRAMA_EVENTS,
    ...PERSONAL_EVENTS,
    ...TRAVEL_EVENTS,
    ...OPPORTUNITY_EVENTS,
    ...SCANDAL_EVENTS,
    ...CHAIN_EVENTS,
];
