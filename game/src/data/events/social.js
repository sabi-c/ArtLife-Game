export const SOCIAL_EVENTS =
[
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

