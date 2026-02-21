/**
 * Dialogue Trees — Branching NPC Conversations
 *
 * 5-tone system: Friendly, Schmoozing, Direct, Generous, Ruthless
 * Source: 04_Events/Dialogue_Trees_V2.md
 *
 * Used by: DialogueTreeManager, DialogueScene, QualityGate
 */

// ─────────────────────────────────────────────
// TONE SYSTEM
// ─────────────────────────────────────────────

export const TONES = [
    { id: 'friendly', icon: '🤝', label: 'Friendly', bestFor: 'Artists, curators, emerging gallerists', risk: 'Too slow for deals, can\'t extract intel fast', statLean: '+reputation' },
    { id: 'schmoozing', icon: '🎭', label: 'Schmoozing', bestFor: 'Collectors, socialites, auction staff', risk: 'Seen as superficial if overused (favor -2 after 3rd time)', statLean: '+intel' },
    { id: 'direct', icon: '🗡️', label: 'Direct', bestFor: 'Dealers, time-sensitive deals, rivals', risk: 'Offends old guard, permanently damages some NPCs', statLean: '+cash efficiency' },
    { id: 'generous', icon: '💎', label: 'Generous', bestFor: 'Struggling galleries, young artists, advisors', risk: 'Drains cash, creates expectations you can\'t maintain', statLean: '+NPC favor' },
    { id: 'ruthless', icon: '🔥', label: 'Ruthless', bestFor: 'Rival collectors, auction wars, market plays', risk: 'Burns bridges permanently. Some NPCs never speak again.', statLean: '+marketHeat' },
];

/**
 * Character specializations — triggered at Week 20 based on dominant tone
 */
export const TONE_SPECIALIZATIONS = {
    friendly: { title: 'The Patron', bonus: 'Artist-initiated offers +50% more favorable', unlock: 'Artists approach you first at venues' },
    schmoozing: { title: 'The Insider', bonus: 'Gain +1 intel from every conversation, even failed ones', unlock: 'Eavesdrops require 2 less intel' },
    direct: { title: 'The Shark', bonus: '15% discount on all primary market purchases', unlock: 'Skip bidding floor — direct settlement' },
    generous: { title: 'The Benefactor', bonus: 'Museum board invitation → institutional access', unlock: 'Dr. Park approaches with donation request' },
    ruthless: { title: 'The Predator', bonus: 'Force intel reveals from any NPC (1x per venue visit)', unlock: 'Rivals avoid venues where you are' },
};

// ─────────────────────────────────────────────
// DIALOGUE TREES
// ─────────────────────────────────────────────

export const DIALOGUE_TREES = [

    // ═══════════════════════════════════════════
    // TREE 1: Elena Ross — Gallery Opening
    // ═══════════════════════════════════════════

    {
        id: 'elena_ross_gallery_opening',
        npcId: 'elena_ross',
        venue: 'gallery_opening',
        trigger: 'room_talk',
        entryConditions: null,
        nodes: {
            start: {
                speaker: 'elena_ross',
                text: null,
                variants: [
                    { check: { 'npcFavor.elena_ross': { min: 10 } }, text: '"You came! I was hoping you would. Come, let me show you what Yuki\'s been working on. I\'m not supposed to have favourites, but..." She trails off with a conspiratorial smile.' },
                    { check: { 'attended.gallery_opening': true }, text: '"Welcome back. I remember you from last time — you were looking at the Tanaka pieces. Good eye." She extends a hand.' },
                    { check: null, text: '"Welcome to Ross Gallery. I\'m Elena." She says it with the practised warmth of someone who\'s greeted a thousand collectors. But her eyes do a quick scan — shoes, watch, posture. She\'s already categorising you.' },
                ],
                topics: [
                    { label: 'Ask about the new exhibition', tone: null, requires: null, next: 'exhibition_topic' },
                    { label: 'I\'d like to know about your artists', tone: 'friendly', requires: null, next: 'artist_access' },
                    { label: 'Let\'s talk about what\'s available', tone: 'direct', requires: null, next: 'business_talk' },
                    { label: 'I brought something for the gallery', tone: 'generous', requires: { cash: { min: 5000 } }, isBlueOption: true, next: 'generous_gift', effects: { cash: -5000 }, npcEffects: { elena_ross: { favor: 8 } } },
                    { label: 'Just looking. [Leave]', tone: null, next: null },
                ],
            },

            exhibition_topic: {
                speaker: 'elena_ross',
                text: '"This is Yuki\'s strongest body of work yet. She spent three months in Kyoto, and you can feel it — the restraint, the negative space. Every piece is a conversation between what\'s there and what isn\'t." Elena pauses at a large canvas. "This one is already spoken for. But these two..." She gestures to the smaller pieces.',
                effects: { intel: 1 },
                topics: [
                    { label: 'Tell me about Yuki\'s trajectory', tone: null, requires: null, next: 'yuki_trajectory' },
                    { label: 'What are the prices on the remaining works?', tone: 'direct', requires: null, next: 'pricing_reveal' },
                    { label: 'Who already bought the large piece?', tone: 'schmoozing', requires: { intel: { min: 3 } }, isBlueOption: true, next: 'buyer_intel' },
                    { label: 'End conversation', tone: null, next: 'closing' },
                ],
            },

            yuki_trajectory: {
                speaker: 'elena_ross',
                text: '"She\'s got a show at Palais de Tokyo next spring. A collector in Basel bought four pieces last year. The Hammer Museum is circling." Elena lowers her voice. "Honestly? If you\'re going to buy Yuki, buy now. In eighteen months, these prices will look like a joke."',
                effects: { intel: 2 },
                npcEffects: { elena_ross: { favor: 1 } },
                topics: [
                    { label: 'I\'d like to see a price list', tone: 'direct', next: 'pricing_reveal' },
                    { label: 'Could I visit Yuki\'s studio?', tone: 'friendly', requires: { 'npcFavor.elena_ross': { min: 8 } }, isBlueOption: true, next: 'studio_invite' },
                    { label: 'End conversation', tone: null, next: 'closing' },
                ],
            },

            artist_access: {
                speaker: 'elena_ross',
                text: '"I represent twelve artists. Yuki Tanaka and Kwame Asante are the ones most people ask about. But honestly?" She steers you toward a corner of the gallery. "This is the one I\'m most excited by." She points to a small, intense painting by an artist whose name you don\'t recognise.',
                effects: { intel: 1 },
                topics: [
                    { label: 'Tell me about this unknown artist', tone: 'friendly', next: 'unknown_artist' },
                    { label: 'I\'m more interested in Kwame Asante', tone: null, next: 'kwame_discussion' },
                    { label: 'End conversation', tone: null, next: 'closing' },
                ],
            },

            unknown_artist: {
                speaker: 'elena_ross',
                text: '"His name is Tomás Herrera. Venezuelan. Works from a squat in Bushwick. He paints like Bacon dreamed — all viscera and tenderness." Her eyes light up in a way they haven\'t for anything else. "I can let two pieces go at $4,000 each. Gallery commission is minimal — I\'m subsidising him from my own pocket."',
                effects: { intel: 3 },
                npcEffects: { elena_ross: { favor: 3 } },
                topics: [
                    { label: 'I\'ll take both pieces', tone: 'generous', triggerHaggle: true, effects: { cash: -8000, reputation: 3 }, npcEffects: { elena_ross: { favor: 10 } }, next: 'bought_unknown', schedules: [{ weeksDelay: 8, type: 'phone_message', payload: { from: 'elena_ross', subject: 'Tomás made a shortlist', body: 'Just wanted you to know — Tomás Herrera was shortlisted for the Rema Hort Mann Prize. Your early support meant the world. The works you bought are now valued at $12K each.', urgency: 'normal' } }] },
                    { label: 'I\'ll think about it', tone: null, next: 'closing' },
                    { label: 'Is he a good investment?', tone: 'direct', npcEffects: { elena_ross: { favor: -3 } }, next: 'investment_coldness' },
                ],
            },

            investment_coldness: {
                speaker: 'elena_ross',
                text: 'Elena\'s expression tightens. "I don\'t sell investments. I sell art. If you want a commodity, there\'s a Gagosian down the street." She picks up her wine glass. The warmth is gone.',
                npcEffects: { elena_ross: { favor: -5 } },
                topics: [
                    { label: 'I\'m sorry — that came out wrong', tone: 'friendly', npcEffects: { elena_ross: { favor: 2 } }, next: 'apology_accepted' },
                    { label: 'Fair enough. [Leave]', tone: null, next: null },
                ],
            },

            apology_accepted: {
                speaker: 'elena_ross',
                text: 'She softens, slightly. "Look, I get it. Everyone thinks about value. But Tomás... he\'s the real thing. And the real things don\'t come with guarantees." She sighs. "Come back next week. I\'ll introduce you properly."',
                npcEffects: { elena_ross: { favor: 1 } },
                schedules: [{ weeksDelay: 2, type: 'phone_message', payload: { from: 'elena_ross', subject: 'Studio visit', body: 'If you\'re free Thursday, Tomás is having an open studio. Small group. I\'d like you to come.', urgency: 'normal' } }],
                topics: [
                    { label: 'I\'d like that. [Leave]', tone: null, next: null },
                ],
            },

            business_talk: {
                speaker: 'elena_ross',
                text: '"Available works." She checks something on her phone. "I have three Tanakas left from this show. Two small works — $12K and $18K. One medium — $35K. Everything else is reserved or sold." She looks at you directly. "Are you buying, or browsing?"',
                effects: { intel: 2 },
                topics: [
                    { label: 'I want the $35K piece', tone: 'direct', requires: { cash: { min: 35000 } }, triggerHaggle: true, effects: { cash: -35000 }, npcEffects: { elena_ross: { favor: 5 } }, next: 'bought_tanaka' },
                    { label: 'Any room on the prices?', tone: 'direct', next: 'pricing_negotiation' },
                    { label: 'End conversation', tone: null, next: 'closing' },
                ],
            },

            pricing_negotiation: {
                speaker: 'elena_ross',
                text: '"I don\'t discount my artists. Period." She says it without hostility — it\'s a fact, like gravity. "The price is the price. If it makes you feel better, Yuki\'s last show sold out in two hours. This is the floor, not the ceiling."',
                topics: [
                    { label: 'Understood. I\'ll take the $18K piece.', tone: null, requires: { cash: { min: 18000 } }, triggerHaggle: true, effects: { cash: -18000, reputation: 1 }, npcEffects: { elena_ross: { favor: 3 } }, next: 'bought_tanaka_small' },
                    { label: 'I respect that. [Leave]', tone: null, next: null },
                ],
            },

            buyer_intel: {
                speaker: 'elena_ross',
                text: 'Elena glances around, then leans in. "Philippe Noir. He sent someone — didn\'t even come himself. Had the piece shipped to Basel before the show opened." She shakes her head. "That\'s the game. By the time you see it on the wall, the real money has already moved."',
                effects: { intel: 4 },
                npcEffects: { elena_ross: { favor: -1 } },
                topics: [
                    { label: 'Philippe Noir... do you have his contact?', tone: 'schmoozing', requires: { reputation: { min: 40 } }, isBlueOption: true, next: 'philippe_introduction', effects: { intel: 2 } },
                    { label: 'Interesting. What\'s left for the rest of us?', tone: null, next: 'pricing_reveal' },
                    { label: 'End conversation', tone: null, next: 'closing' },
                ],
            },

            philippe_introduction: {
                speaker: 'elena_ross',
                text: '"I can\'t give you his number — he\'d kill me. But he\'ll be at the Westerman cocktail party next month. I\'ll make sure you\'re on the list." She writes something in her phone. "Just... don\'t be impressed by him. That\'s what he feeds on."',
                effects: { intel: 2 },
                npcEffects: { elena_ross: { favor: 2 } },
                schedules: [{ weeksDelay: 3, type: 'phone_message', payload: { from: 'elena_ross', subject: 'Westerman Party — you\'re on the list', body: 'I spoke to the host. You\'re confirmed for the Westerman cocktail party. Philippe will be there. Wear something good.', urgency: 'normal' } }],
                topics: [
                    { label: 'Thank you, Elena. [Leave]', tone: null, next: null },
                ],
            },

            studio_invite: {
                speaker: 'elena_ross',
                text: '"You want to visit Yuki\'s studio?" Elena looks genuinely surprised — and pleased. "Most collectors don\'t bother. They just want the finished product." She pulls out her phone. "Let me text her. Thursday afternoons are her open studio time. I\'ll make sure she knows you\'re coming."',
                effects: { intel: 3, reputation: 2 },
                npcEffects: { elena_ross: { favor: 5 }, yuki_tanaka: { favor: 3 } },
                schedules: [{ weeksDelay: 1, type: 'phone_message', payload: { from: 'yuki_tanaka', subject: 'Elena told me about you', body: 'Hi! Elena said you wanted to see the studio. I\'m in Bushwick — Unit 3B, third floor above the bodega. Thursday from 2pm. Bring coffee? ☕', urgency: 'normal' } }],
                topics: [
                    { label: 'I\'d love that. Thank you. [Leave]', tone: null, next: null },
                ],
            },

            generous_gift: {
                speaker: 'elena_ross',
                text: 'Elena opens the box — it\'s a rare exhibition catalogue from a 1970s show at Leo Castelli. Her mouth opens. "Where did you find this? I\'ve been looking for this for years." She holds it like it\'s sacred. "You didn\'t have to do this. Really." For once, the gallery director mask drops completely.',
                effects: { reputation: 5 },
                npcEffects: { elena_ross: { favor: 8 } },
                topics: [
                    { label: 'I saw it and thought of you', tone: 'friendly', npcEffects: { elena_ross: { favor: 3 } }, next: 'gift_warmth' },
                    { label: 'Consider it an investment in our relationship', tone: 'schmoozing', npcEffects: { elena_ross: { favor: -2 } }, next: 'gift_awkward' },
                ],
            },

            gift_warmth: {
                speaker: 'elena_ross',
                text: '"You know what? I have something I was saving for a museum. But I think you should see it first." She leads you to the back of the gallery, past the office, to a door you hadn\'t noticed. Behind it is a small room with a single painting — luminous, devastating, unsigned. "Tomás painted this the day his mother died. It\'s not for sale. But I\'m willing to let it go to someone who understands."',
                effects: { intel: 5 },
                topics: [
                    { label: 'How much?', tone: 'direct', next: 'secret_painting_price' },
                    { label: 'It\'s extraordinary. [Leave speechless]', tone: null, next: null },
                ],
            },

            secret_painting_price: {
                speaker: 'elena_ross',
                text: '"$6,000. And that\'s a gift." She means it. The painting is worth ten times that if Tomás breaks out. And you both know it.',
                topics: [
                    { label: 'Done. I\'ll take care of it.', tone: 'generous', requires: { cash: { min: 6000 } }, triggerHaggle: true, effects: { cash: -6000, reputation: 5 }, npcEffects: { elena_ross: { favor: 10 } }, next: null },
                    { label: 'Let me think on it. [Leave]', tone: null, next: null },
                ],
            },

            gift_awkward: {
                speaker: 'elena_ross',
                text: 'She stiffens. The mask goes back on. "Right. Well. Thank you for the catalogue." She puts it down on her desk with less reverence than before. The moment is gone.',
                topics: [
                    { label: '[Leave]', tone: null, next: null },
                ],
            },

            pricing_reveal: {
                speaker: 'elena_ross',
                text: '"Two small Tanakas — $12K and $18K. Last works from this body. Next show prices will be higher."',
                effects: { intel: 1 },
                topics: [
                    { label: 'I\'ll take the $18K piece', tone: null, requires: { cash: { min: 18000 } }, triggerHaggle: true, effects: { cash: -18000, reputation: 1 }, npcEffects: { elena_ross: { favor: 3 } }, next: 'bought_tanaka_small' },
                    { label: 'End conversation', tone: null, next: 'closing' },
                ],
            },

            kwame_discussion: {
                speaker: 'elena_ross',
                text: '"Kwame is... difficult. In the best possible way. He doesn\'t want to be collected — he wants to be understood." She pauses. "He turned down a $200K commission last month because the collector wanted to choose the subject. That\'s who he is."',
                effects: { intel: 2 },
                topics: [
                    { label: 'How do I earn his trust?', tone: 'friendly', next: 'kwame_trust' },
                    { label: 'End conversation', tone: null, next: 'closing' },
                ],
            },

            kwame_trust: {
                speaker: 'elena_ross',
                text: '"Buy his work. But more importantly — live with it. Don\'t flip it. Don\'t store it. Hang it in your home. He checks. He actually visits collectors\' homes." She smiles. "If he likes what he sees, he\'ll offer you first refusal on new work. That\'s the holy grail."',
                effects: { intel: 3 },
                npcEffects: { kwame_asante: { favor: 1 } },
                topics: [
                    { label: 'I\'ll remember that. Thank you. [Leave]', tone: null, next: null },
                ],
            },

            bought_tanaka: {
                speaker: 'elena_ross',
                text: '"Excellent choice." She\'s genuinely pleased — not just the sale, but that you chose well. "I\'ll have it wrapped and delivered this week. Welcome to the Tanaka collectors\' circle. It\'s a good place to be."',
                effects: { reputation: 3 },
                topics: [
                    { label: 'Thank you, Elena. [Leave]', tone: null, next: null },
                ],
            },

            bought_tanaka_small: {
                speaker: 'elena_ross',
                text: '"Good eye. That\'s the one I\'d have picked." She marks it with a red dot. "I\'ll send the invoice Monday."',
                topics: [
                    { label: 'Looking forward to it. [Leave]', tone: null, next: null },
                ],
            },

            bought_unknown: {
                speaker: 'elena_ross',
                text: 'Elena looks like she might cry. She doesn\'t — she\'s a professional. But her voice catches. "Thank you. Seriously. You have no idea what this means for him." She writes your name on two red dots and sticks them on the wall. "I won\'t forget this."',
                effects: { reputation: 5 },
                topics: [
                    { label: '[Leave quietly]', tone: null, next: null },
                ],
            },

            closing: {
                speaker: 'elena_ross',
                text: '"It was lovely meeting you. Don\'t be a stranger — openings are every six weeks." She presses a business card into your hand. Ross Gallery. Chelsea. The card stock is heavy and cream-coloured. Expensive simplicity.',
                npcEffects: { elena_ross: { favor: 1 } },
                topics: [],
            },
        },
        onComplete: { effects: {}, schedules: [] },
    },

    // ═══════════════════════════════════════════
    // TREE 2: Philippe Noir — Cocktail Party
    // ═══════════════════════════════════════════

    {
        id: 'philippe_noir_cocktail',
        npcId: 'philippe_noir',
        venue: 'cocktail_party',
        trigger: 'room_talk',
        entryConditions: null,
        nodes: {
            start: {
                speaker: null,
                text: null,
                variants: [
                    { check: { 'npcFavor.philippe_noir': { min: 10 } }, text: 'Philippe sees you and raises his glass — a gesture that, from him, is the equivalent of a warm embrace. He drifts toward you, unhurried. "I was hoping you\'d be here. I have something I want to show you."' },
                    { check: { 'npcFavor.philippe_noir': { min: 5 } }, text: 'Philippe nods as you approach. Not warmly — he doesn\'t do warm. But there\'s recognition. You\'ve passed some invisible test. "Good evening. Are you enjoying the party, or are you here to work?" A faint smile.' },
                    { check: null, text: 'Philippe Noir is standing near the fireplace, alone — a deliberate kind of alone. The kind that says \'approach at your own risk.\' He\'s holding a glass of something amber, swirling it slowly. He looks at you the way a cat looks at a bird that\'s just entered the room.' },
                ],
                topics: [
                    { label: 'Introduce yourself properly', tone: 'friendly', requires: null, next: 'introduction' },
                    { label: 'Comment on the art on the walls', tone: null, requires: null, next: 'test_knowledge' },
                    { label: 'I hear you\'re deaccessioning. I\'m interested.', tone: 'direct', requires: { intel: { min: 5 } }, isBlueOption: true, next: 'direct_approach' },
                    { label: 'Offer to buy him a drink', tone: 'schmoozing', next: 'schmooze_attempt' },
                    { label: 'Leave him alone. [Walk away]', tone: null, next: null },
                ],
            },

            introduction: {
                speaker: 'philippe_noir',
                text: '"Yes, I know who you are." He says it without malice or interest. A statement of fact. "Elena mentioned you. She has good instincts about people — usually." The \'usually\' hangs in the air like smoke.',
                topics: [
                    { label: 'What do you collect?', tone: 'friendly', next: 'his_collection' },
                    { label: 'What did Elena say about me?', tone: 'schmoozing', next: 'elena_opinion' },
                    { label: 'End conversation', tone: null, next: 'cold_closing' },
                ],
            },

            test_knowledge: {
                speaker: null,
                text: 'You gesture toward a painting on the wall — an abstract in deep reds and blacks. "Beautiful piece," you say. Philippe doesn\'t look at the painting. He looks at you.',
                topics: [
                    { label: '"It reminds me of early de Kooning — the gesture, the violence."', tone: null, requires: { intel: { min: 7 } }, isBlueOption: true, next: 'knowledge_pass', effects: { intel: 1 } },
                    { label: '"Is it valuable?"', tone: 'direct', next: 'knowledge_fail' },
                    { label: '"I love the colours."', tone: 'friendly', next: 'knowledge_mediocre' },
                ],
            },

            knowledge_pass: {
                speaker: 'philippe_noir',
                text: 'Something shifts in his expression. Not warmth — acknowledgment. "Actually, it\'s a Soulages. Not de Kooning. But I see why you\'d say that. The intent is similar." He takes a sip. "Most people in this room would have said \'nice colours.\' You at least understand what you\'re looking at."',
                effects: { intel: 2, reputation: 3 },
                npcEffects: { philippe_noir: { favor: 5 } },
                topics: [
                    { label: 'Tell me about your collection', tone: 'friendly', next: 'his_collection' },
                    { label: 'I heard you\'re selling some pieces', tone: 'direct', requires: { intel: { min: 5 } }, next: 'deaccession_hint' },
                    { label: 'End conversation', tone: null, next: 'warm_closing' },
                ],
            },

            knowledge_fail: {
                speaker: 'philippe_noir',
                text: '"Valuable." He repeats the word like it\'s a dead insect he\'s found in his drink. "Everything in this room is valuable. The question is whether it\'s important." He turns away from you slightly. The audience is over.',
                npcEffects: { philippe_noir: { favor: -5 } },
                topics: [
                    { label: 'I\'m sorry — I meant—', tone: 'friendly', next: 'recovery_attempt' },
                    { label: '[Walk away]', tone: null, next: null },
                ],
            },

            knowledge_mediocre: {
                speaker: 'philippe_noir',
                text: '"The colours." He says it flatly. "Yes. They are red and black. Well observed." His expression is a closed door. You haven\'t failed the test, but you certainly haven\'t passed it.',
                topics: [
                    { label: 'What artist is it?', tone: 'friendly', next: 'soulages_lesson' },
                    { label: '[Walk away]', tone: null, next: null },
                ],
            },

            soulages_lesson: {
                speaker: 'philippe_noir',
                text: '"Pierre Soulages. He called his work \'outrenoir\' — beyond black. He believed black wasn\'t the absence of light, but the presence of all light reflected." For a moment, Philippe looks at the painting instead of judging you. "He worked until he was 102. That kind of devotion is rarer than the art itself."',
                effects: { intel: 3 },
                npcEffects: { philippe_noir: { favor: 1 } },
                topics: [
                    { label: 'I\'d like to learn more. About art, and about your collection.', tone: 'friendly', next: 'his_collection' },
                    { label: 'Thank you for that. [Leave]', tone: null, next: null },
                ],
            },

            recovery_attempt: {
                speaker: 'philippe_noir',
                text: 'He pauses. Turns back. "Most people don\'t apologise. They double down." A beat. "That\'s something, at least. What is it you actually want to talk about?"',
                npcEffects: { philippe_noir: { favor: 2 } },
                topics: [
                    { label: 'I want to build a serious collection. I need guidance.', tone: 'friendly', next: 'mentorship_hook' },
                    { label: 'I hear you\'re selling pieces. I\'m a buyer.', tone: 'direct', next: 'direct_approach' },
                    { label: 'End conversation', tone: null, next: 'cold_closing' },
                ],
            },

            his_collection: {
                speaker: 'philippe_noir',
                text: '"Four hundred and twelve works. Forty years of collecting." He says it without pride — a surveyor describing terrain. "Post-war European. Some American. I bought my first Kiefer when I was twenty-three, with money I didn\'t have. I\'ve never regretted a single purchase. I\'ve regretted every sale."',
                effects: { intel: 3 },
                npcEffects: { philippe_noir: { favor: 2 } },
                topics: [
                    { label: 'Why are you selling now?', tone: 'direct', requires: { intel: { min: 5 } }, next: 'deaccession_hint' },
                    { label: 'What makes a great collection?', tone: 'friendly', next: 'mentorship_hook' },
                    { label: 'End conversation', tone: null, next: 'warm_closing' },
                ],
            },

            elena_opinion: {
                speaker: 'philippe_noir',
                text: '"She said you have taste but no patience. A common affliction in your generation." He regards you over the rim of his glass. "Patience is the only competitive advantage in this market. Everything else can be bought."',
                effects: { intel: 2 },
                topics: [
                    { label: 'She\'s right. I\'m working on it.', tone: 'friendly', npcEffects: { philippe_noir: { favor: 2 } }, next: 'mentorship_hook' },
                    { label: 'And yet you\'re selling?', tone: 'ruthless', npcEffects: { philippe_noir: { favor: -3 } }, next: 'challenged' },
                    { label: 'End conversation', tone: null, next: 'cold_closing' },
                ],
            },

            challenged: {
                speaker: 'philippe_noir',
                text: 'His eyes narrow. "Deaccessioning and selling are not the same thing. I am curating what I leave behind. There\'s a difference." The temperature drops three degrees. "But I appreciate the candour. Most people wouldn\'t dare."',
                npcEffects: { philippe_noir: { favor: 1 } },
                topics: [
                    { label: 'What are you letting go of?', tone: 'direct', next: 'deaccession_hint' },
                    { label: '[Walk away]', tone: null, next: null },
                ],
            },

            direct_approach: {
                speaker: 'philippe_noir',
                text: 'He stares at you for three seconds. In Philippe-time, that\'s an eternity. "You know about the deaccession." It\'s not a question. "Who told you?"',
                topics: [
                    { label: 'I have good sources. What\'s available?', tone: 'direct', npcEffects: { philippe_noir: { favor: -1 } }, next: 'deaccession_hint' },
                    { label: 'Elena mentioned it, indirectly', tone: 'friendly', npcEffects: { philippe_noir: { favor: 0 } }, next: 'deaccession_hint' },
                    { label: 'Does it matter? I\'m offering discretion and cash.', tone: 'ruthless', requires: { cash: { min: 100000 } }, isBlueOption: true, npcEffects: { philippe_noir: { favor: -3 } }, next: 'ruthless_offer', effects: { marketHeat: 2 } },
                ],
            },

            deaccession_hint: {
                speaker: 'philippe_noir',
                text: '"I\'m releasing eight works. Minor pieces — a Fontana, two Burris, a Richter window. Nothing from the core collection." He pauses. "The Richter is the most interesting. 2004. Perfect condition. I paid €180,000. It\'s now worth considerably more." He lets that sit.',
                effects: { intel: 5 },
                npcEffects: { philippe_noir: { favor: 2 } },
                topics: [
                    { label: 'I\'d like first refusal on the Richter', tone: 'direct', requires: { cash: { min: 50000 }, reputation: { min: 40 } }, isBlueOption: true, next: 'richter_offer' },
                    { label: 'Would you consider a private dinner to discuss terms?', tone: 'friendly', requires: { 'npcFavor.philippe_noir': { min: 5 } }, next: 'dinner_invite' },
                    { label: 'Thank you for telling me. [Leave]', tone: null, effects: { intel: 1 }, next: null },
                ],
            },

            richter_offer: {
                speaker: 'philippe_noir',
                text: '"First refusal." He considers it. "I don\'t typically do this. But Elena vouches for you, and I prefer private sales to the circus of auction houses." He reaches into his jacket and produces a card — plain white, black type, no title. Just a name and a number. "Call my office Monday. If we agree on a price before Thursday, it\'s yours."',
                effects: { intel: 3, reputation: 5 },
                npcEffects: { philippe_noir: { favor: 5 } },
                schedules: [{ weeksDelay: 1, type: 'phone_message', payload: { from: 'philippe_noir', subject: 'The Richter', body: 'I\'ll accept €320,000. That\'s below Artnet estimates. Don\'t make me regret this.', urgency: 'urgent', actions: [{ label: 'Accept — wire the funds', effects: { cash: -320000, reputation: 10 } }, { label: 'Counter at €280,000', effects: { reputation: -2 } }, { label: 'Pass', effects: {} }] } }],
                topics: [
                    { label: 'I\'ll call Monday. [Leave]', tone: null, next: null },
                ],
            },

            ruthless_offer: {
                speaker: 'philippe_noir',
                text: 'He laughs — a single, short bark. "Discretion and cash. You sound like a Swiss bank." He finishes his drink. "I don\'t sell to intermediaries, speculators, or people who treat art like real estate. Which one are you?"',
                topics: [
                    { label: 'A collector who knows what he wants. No games.', tone: 'direct', npcEffects: { philippe_noir: { favor: 3 } }, next: 'deaccession_hint' },
                    { label: 'Someone who pays above asking. No questions.', tone: 'ruthless', npcEffects: { philippe_noir: { favor: -5 } }, next: 'final_rejection' },
                ],
            },

            final_rejection: {
                speaker: 'philippe_noir',
                text: '"Then we have nothing to discuss." He sets down his glass and walks away. Not fast. Not slow. Just gone. You\'ve been dismissed by one of the most powerful collectors in Europe.',
                npcEffects: { philippe_noir: { favor: -10 } },
                topics: [],
            },

            mentorship_hook: {
                speaker: 'philippe_noir',
                text: '"A serious collection." He turns the phrase over. "Do you know the difference between a collection and an accumulation?" He doesn\'t wait for an answer. "An accumulation is what rich people have. A collection has a thesis. Every work argues for the next. Mine tells a story about post-war Europe — the guilt, the rebuilding, the rage. What story does yours tell?"',
                effects: { intel: 4, reputation: 2 },
                npcEffects: { philippe_noir: { favor: 3 } },
                topics: [
                    { label: 'I don\'t know yet. That\'s why I\'m asking.', tone: 'friendly', npcEffects: { philippe_noir: { favor: 3 } }, next: 'dinner_invite' },
                    { label: 'Contemporary. The market is there.', tone: 'direct', npcEffects: { philippe_noir: { favor: -2 } }, next: 'market_contempt' },
                ],
            },

            market_contempt: {
                speaker: 'philippe_noir',
                text: '"The market." He says it the way you\'d say \'cockroaches.\' "The market is what happens when people who don\'t love art have too much money. If you\'re chasing the market, you\'ll always be behind it." He drains his glass. "Good evening."',
                npcEffects: { philippe_noir: { favor: -3 } },
                topics: [
                    { label: '[He\'s gone]', tone: null, next: null },
                ],
            },

            dinner_invite: {
                speaker: 'philippe_noir',
                text: '"Come to dinner. Saturday. My apartment." He says it like he\'s sentencing you to something. "I\'ll show you the real collection — not the pieces I put in museums for the tax write-off. The ones I keep for myself. Bring your opinions. I\'ll decide if they\'re worth anything."',
                effects: { intel: 3, reputation: 5 },
                npcEffects: { philippe_noir: { favor: 5 } },
                schedules: [{ weeksDelay: 1, type: 'phone_message', payload: { from: 'philippe_noir', subject: 'Saturday — dinner', body: '8pm. Bring nothing. The doorman knows your name.', urgency: 'normal' } }],
                topics: [
                    { label: 'I\'ll be there. [Leave]', tone: null, next: null },
                ],
            },

            schmooze_attempt: {
                speaker: 'philippe_noir',
                text: '"A drink." He looks at his glass — full. Then back at you. "I have a drink. What I don\'t have is a reason to continue this conversation." It\'s not cruel. It\'s efficient. He\'s 73 years old and has learned that time is the most expensive thing in the room.',
                npcEffects: { philippe_noir: { favor: -2 } },
                topics: [
                    { label: 'Fair enough. Let me give you one — I know about the Soulages on the wall.', tone: 'direct', requires: { intel: { min: 7 } }, isBlueOption: true, effects: { intel: 1 }, next: 'knowledge_pass' },
                    { label: '[Walk away]', tone: null, next: null },
                ],
            },

            warm_closing: {
                speaker: 'philippe_noir',
                text: 'Philippe gives you a slight nod — the kind reserved for people he might remember tomorrow. "We\'ll talk again." Coming from him, that\'s practically a marriage proposal.',
                npcEffects: { philippe_noir: { favor: 1 } },
                topics: [],
            },

            cold_closing: {
                speaker: 'philippe_noir',
                text: 'Philippe turns back to the fireplace. You\'ve been filed under \'unremarkable.\'',
                topics: [],
            },
        },
        onComplete: { effects: {}, schedules: [] },
    },

    // ═══════════════════════════════════════════
    // TREE (late): Gallery Assistant — Gallery Opening
    // Pricing intel + NPC warmth. No haggle — pure information.
    // ═══════════════════════════════════════════

    {
        id: 'gallery_assistant_opening',
        npcId: 'gallery_assistant',
        venue: 'gallery_opening',
        trigger: 'room_talk',
        entryConditions: null,
        nodes: {
            start: {
                speaker: 'gallery_assistant',
                text: 'A young assistant in a linen blazer catches your eye. "Welcome. Can I help you find anything tonight? I know every piece in the show."',
                topics: [
                    { label: 'What are the prices like here?', tone: null, requires: null, next: 'pricing_info' },
                    { label: 'Which piece is getting the most attention?', tone: null, requires: null, next: 'hot_work' },
                    { label: 'Thanks, just browsing.', tone: null, next: 'closing' },
                ],
            },

            pricing_info: {
                speaker: 'gallery_assistant',
                text: '"The price range tonight is €4,000 to €35,000. The smaller works by Tomás Herrera start at €4,000. The two Yuki Tanaka pieces on the east wall are €12,000 and €18,000. There\'s also a medium Tanaka for €35,000, but I\'ve already seen two people photograph it very closely — so if you\'re interested, I\'d speak to Elena soon."',
                effects: { intel: 2 },
                topics: [
                    { label: 'Tell me more about the Tanaka pieces.', tone: 'friendly', next: 'tanaka_detail' },
                    { label: 'What about the Herrera works?', tone: null, next: 'herrera_detail' },
                    { label: 'Thanks, that helps.', tone: null, next: 'closing' },
                ],
            },

            hot_work: {
                speaker: 'gallery_assistant',
                text: '"The Yuki Tanaka on the east wall — the one with the pale ground. Elena has been pulling people over to it all evening. She\'s very protective of it. I\'ve seen three red-dot conversations happen near it that didn\'t result in a dot. She\'s choosing the buyer."',
                effects: { intel: 3 },
                topics: [
                    { label: 'What price is it?', tone: null, next: 'pricing_info' },
                    { label: 'Interesting. How do I get on Elena\'s list?', tone: 'friendly', next: 'elena_access' },
                    { label: 'Thanks. I\'ll take a look.', tone: null, next: 'closing' },
                ],
            },

            tanaka_detail: {
                speaker: 'gallery_assistant',
                text: '"Yuki spent three months in Kyoto for this body of work. The negative space is intentional — she was influenced by Zen garden design. The Hammer Museum in LA has already reached out about the medium piece, but Elena is holding it for a private sale first. The smaller works are genuinely more intimate — easier to live with."',
                effects: { intel: 2 },
                topics: [
                    { label: 'I\'d like to speak to Elena about the medium piece.', tone: null, next: 'closing' },
                    { label: 'Thanks for the context.', tone: null, next: 'closing' },
                ],
            },

            herrera_detail: {
                speaker: 'gallery_assistant',
                text: '"Tomás is Venezuelan, working out of Bushwick. This is only his second gallery show. Elena subsidises his studio time — she really believes in him. The two small pieces are €4,000 each. If you buy both, she\'ll throw in a studio visit." The assistant lowers their voice. "Between us? These are the pieces I\'d buy."',
                effects: { intel: 3 },
                topics: [
                    { label: 'Both pieces for €8,000. Let me find Elena.', tone: null, next: 'closing' },
                    { label: 'Good tip. Thanks.', tone: null, next: 'closing' },
                ],
            },

            elena_access: {
                speaker: 'gallery_assistant',
                text: '"Honestly? Come to her openings. Buy a small piece first — show you\'re a real collector, not a speculator. She\'s seen enough people treat her roster like a stock portfolio to have a radar for it." They glance over their shoulder. "Also, she loves it when people ask about the artists as people, not as investments."',
                effects: { intel: 2 },
                topics: [
                    { label: 'That\'s really helpful. Thank you.', tone: 'friendly', next: 'closing' },
                ],
            },

            closing: {
                speaker: 'gallery_assistant',
                text: '"Enjoy the show. If you need anything else, I\'ll be near the desk." They hand you a printed price list — a thoughtful, old-school touch in a world of QR codes.',
                effects: { intel: 1 },
                topics: [],
            },
        },
        onComplete: { effects: {}, schedules: [] },
    },

    // ═══════════════════════════════════════════
    // TREE: Philippe Noir — Gallery Backroom (gallery_opening venue)
    // A short, high-stakes tree for the private backroom encounter.
    // ═══════════════════════════════════════════

    {
        id: 'philippe_noir_gallery_backroom',
        npcId: 'philippe_noir',
        venue: 'gallery_opening',
        trigger: 'room_talk',
        entryConditions: null,
        nodes: {
            start: {
                speaker: 'philippe_noir',
                text: '"You got past the gallerist." He looks up from his phone. Not surprised — Philippe is never surprised. "That means you\'re either important or audacious. Sit down. I have twenty minutes."',
                topics: [
                    { label: 'I\'m interested in the Meridian piece.', tone: 'direct', requires: null, next: 'meridian_angle' },
                    { label: 'I came to talk about the Tanaka estate.', tone: 'direct', requires: { intel: { min: 5 } }, isBlueOption: true, next: 'tanaka_opening' },
                    { label: 'Just wanted to see who was back here.', tone: 'schmoozing', requires: null, next: 'test_response' },
                ],
            },

            meridian_angle: {
                speaker: 'philippe_noir',
                text: '"The Meridian." He closes his phone. "Elena mentioned a potential buyer. You move fast." He leans back. "I\'m not the seller. But I know who is. And I know what they\'re willing to accept. Which is less than what Elena told you."',
                effects: { intel: 3 },
                topics: [
                    { label: 'What\'s the real number?', tone: 'direct', next: 'real_number' },
                    { label: 'Why are you telling me this?', tone: 'friendly', next: 'his_angle' },
                ],
            },

            real_number: {
                speaker: 'philippe_noir',
                text: '"Forty thousand. Not forty-eight. Elena\'s building margin for herself." He pauses to let that settle. "If you go back out there and offer forty-two — and hold there — you\'ll get it. Tell Elena I sent you. She won\'t like it, but she won\'t lose the sale either."',
                effects: { intel: 4, reputation: 2 },
                npcEffects: { philippe_noir: { favor: 5 } },
                topics: [
                    { label: 'Thank you. I\'ll use that.', tone: 'friendly', next: 'closing_deal' },
                    { label: 'What do you get out of this?', tone: 'direct', next: 'his_angle' },
                ],
            },

            his_angle: {
                speaker: 'philippe_noir',
                text: '"I get someone in my debt who might be useful later. The art world runs on obligation, not money." He looks at you directly for the first time. "Don\'t overthink it. Just use the information."',
                effects: { intel: 2 },
                npcEffects: { philippe_noir: { favor: 3 } },
                topics: [
                    { label: 'Understood. I appreciate the angle.', tone: null, next: 'closing_deal' },
                ],
            },

            tanaka_opening: {
                speaker: 'philippe_noir',
                text: 'Something shifts behind his eyes. "You know about the Tanaka estate." Not a question. "Then you know it\'s not on the market. Officially." He glances at the door. "Twenty-two works. Some of them significant. They want it handled quietly. No auction. No publicity."',
                effects: { intel: 5 },
                npcEffects: { philippe_noir: { favor: 8 } },
                topics: [
                    { label: 'I want to be considered as a buyer.', tone: 'direct', next: 'tanaka_offer' },
                    { label: 'I\'m interested in brokering it.', tone: 'direct', requires: { reputation: { min: 40 } }, next: 'tanaka_broker' },
                ],
            },

            tanaka_offer: {
                speaker: 'philippe_noir',
                text: '"Then you\'ll need capital — serious capital — and discretion. Call me in three days." He slides a card across the table. A personal number, handwritten. "Come prepared with a number, not a range. Ranges waste my time."',
                effects: { intel: 2, reputation: 3 },
                npcEffects: { philippe_noir: { favor: 10 } },
                topics: [
                    { label: 'Three days. I\'ll be ready.', tone: null, next: null },
                ],
            },

            tanaka_broker: {
                speaker: 'philippe_noir',
                text: '"A broker." He considers this. "You\'d need a strong buyer network and the kind of reputation that makes sellers comfortable with silence." He studies you. "You might be there. Might. Call me. We\'ll discuss the terms."',
                effects: { intel: 3, reputation: 5 },
                npcEffects: { philippe_noir: { favor: 15 } },
                topics: [
                    { label: 'I\'ll be in touch.', tone: null, next: null },
                ],
            },

            test_response: {
                speaker: 'philippe_noir',
                text: '"You came to see who\'s back here." He repeats your words slowly. "That\'s either very honest or very stupid. I haven\'t decided which." A beat. "The gallerist doesn\'t let anyone through that door unless they have a reason. What\'s yours?"',
                topics: [
                    { label: 'I\'m looking for the Meridian buyer pool.', tone: 'direct', next: 'meridian_angle' },
                    { label: 'I\'m building my network. You\'re a good node.', tone: 'schmoozing', next: 'schmooze_response' },
                ],
            },

            schmooze_response: {
                speaker: 'philippe_noir',
                text: '"A node." He almost smiles. "That\'s an interesting way to describe a person." He stands. "I\'ll remember that. You can remember this: I don\'t do favours for strangers, but I do notice when someone is paying attention." He gestures toward the door. "Go enjoy the opening."',
                npcEffects: { philippe_noir: { favor: 3 } },
                topics: [
                    { label: 'Thank you for the time.', tone: null, next: null },
                ],
            },

            closing_deal: {
                speaker: null,
                text: 'Philippe returns to his phone. The meeting is over — and you\'ve walked out with intelligence that just changed the terms of the deal waiting for you on the gallery floor.',
                topics: [],
            },
        },
        onComplete: { effects: {}, schedules: [] },
    },

    // ═══════════════════════════════════════════
    // TREE (late): Elena Ross — Meridian Artwork (simplified LocationScene haggle trigger)
    // A focused, 3-node tree for the LocationScene NPC encounter.
    // ═══════════════════════════════════════════

    {
        id: 'elena_ross_meridian',
        npcId: 'elena_ross',
        venue: 'gallery_opening',
        trigger: 'room_talk',
        entryConditions: null,
        nodes: {
            start: {
                speaker: 'elena_ross',
                text: '"Ah. You found the east wall." Elena steps beside you, studying your face. "That piece — Untitled (Meridian) — is by a young artist I\'ve been watching for two years. She finished it last month. I haven\'t listed it publicly. You\'re seeing it first."',
                topics: [
                    { label: 'Express interest in the artwork.', tone: 'friendly', requires: null, next: 'interested' },
                    { label: 'Ask about the price directly.', tone: 'direct', requires: null, next: 'price_talk' },
                    { label: 'Just looking for now.', tone: null, next: 'closing' },
                ],
            },

            interested: {
                speaker: 'elena_ross',
                text: '"I thought you might be. There\'s something about the way you looked at it — like you recognised something." She pauses. "I\'m asking €48,000. It\'s fair for where she\'s going. And I\'ll tell you something: she has a Venice shortlist interview next month. This price will look very different by summer."',
                effects: { intel: 2 },
                topics: [
                    { label: 'Make an offer on the Meridian piece.', tone: 'direct', requires: { cash: { min: 38000 } }, triggerHaggle: true,
                      work: { id: 'meridian_001', title: 'Untitled (Meridian)', artist: 'Unknown', year: '2025', medium: 'Oil on linen', dimensions: '180 x 140 cm' },
                      effects: { cash: -48000 }, npcInvolved: 'elena_ross', next: null },
                    { label: 'It\'s beautiful. I need to think about it.', tone: null, next: 'closing' },
                ],
            },

            price_talk: {
                speaker: 'elena_ross',
                text: '"€48,000." She says it without hesitation. "It\'s not a negotiating position — it\'s the price. She\'s been shortlisted for Venice and the Hammer has expressed interest. If you want it, now is the time. If you want to wait, that\'s fine too. But it won\'t be here next week."',
                effects: { intel: 1 },
                topics: [
                    { label: 'I\'ll take it. Let\'s talk terms.', tone: 'direct', requires: { cash: { min: 38000 } }, triggerHaggle: true,
                      work: { id: 'meridian_001', title: 'Untitled (Meridian)', artist: 'Unknown', year: '2025', medium: 'Oil on linen', dimensions: '180 x 140 cm' },
                      effects: { cash: -48000 }, npcInvolved: 'elena_ross', next: null },
                    { label: 'Let me think about it.', tone: null, next: 'closing' },
                ],
            },

            closing: {
                speaker: 'elena_ross',
                text: '"Of course. Take your time." She presses a card into your hand. "I\'m here until ten. And if you change your mind after tonight — call me. I can hold it for 48 hours."',
                topics: [],
            },
        },
        onComplete: { effects: {}, schedules: [] },
    },
    // ═══════════════════════════════════════════
    // TREE: Lorenzo Gallo — Art Fair VIP Lounge
    // The most powerful dealer alive. Access is a privilege.
    // ═══════════════════════════════════════════

    {
        id: 'lorenzo_gallo_art_fair',
        npcId: 'lorenzo_gallo',
        venue: 'art_fair',
        trigger: 'room_talk',
        title: 'The Gatekeeper',
        entryConditions: { reputation: { min: 40 } },
        nodes: {
            start: {
                speaker: 'lorenzo_gallo',
                text: null,
                variants: [
                    { check: { 'npcFavor.lorenzo_gallo': { min: 10 } }, text: 'Lorenzo is on the phone when you enter. He holds up one finger — wait. When he finishes, he doesn\'t smile. But he pours you an espresso from the machine behind his desk. That\'s more than most people get.' },
                    { check: { reputation: { min: 60 } }, text: 'Lorenzo Gallo is reviewing transparencies at a light table. He doesn\'t look up. "Sit." It\'s not rude — it\'s efficient. He finishes what he\'s doing, then turns. "I know your name. You\'ve been making interesting choices."' },
                    { check: null, text: 'The VIP lounge is behind a curtain that most people don\'t even notice. Lorenzo Gallo is sitting alone at a marble table, a single espresso in front of him. He looks at you with the patience of a man who has been approached ten thousand times. "Yes?"' },
                ],
                topics: [
                    { label: 'I\'d like access to your primary market artists', tone: 'direct', requires: { reputation: { min: 50 } }, isBlueOption: true, next: 'primary_access' },
                    { label: 'I\'ve been collecting your artists\' work on the secondary market', tone: 'friendly', next: 'secondary_confession' },
                    { label: 'I hear you\'re showing new work by Elara Voss', tone: null, next: 'voss_inquiry' },
                    { label: 'I just wanted to introduce myself', tone: 'schmoozing', next: 'introduction_attempt' },
                ],
            },

            primary_access: {
                speaker: 'lorenzo_gallo',
                text: '"Primary access." He repeats it like he\'s tasting wine. "I have four hundred collectors on a waiting list for my top ten artists. Some have been waiting five years." He sets down his cup. "What makes you different from every other person with a chequebook and an Instagram account?"',
                topics: [
                    { label: 'I don\'t flip. I build collections with a thesis.', tone: 'friendly', requires: { reputation: { min: 60 } }, isBlueOption: true, next: 'thesis_test', effects: { intel: 1 } },
                    { label: 'I have the capital and I move fast.', tone: 'direct', next: 'capital_pitch' },
                    { label: 'Elena Ross recommended I speak with you.', tone: 'schmoozing', requires: { 'npcFavor.elena_ross': { min: 10 } }, isBlueOption: true, next: 'elena_referral' },
                ],
            },

            thesis_test: {
                speaker: 'lorenzo_gallo',
                text: '"A thesis." For the first time, something shifts in his expression. Not warmth — curiosity. "Tell me your thesis. In one sentence. If I\'m still awake after, we\'ll continue."',
                topics: [
                    { label: 'Post-colonial identity through material practice — the artists remaking what the West calls "craft" into capital-A Art.', tone: 'friendly', requires: { intel: { min: 8 } }, isBlueOption: true, next: 'thesis_impressed', effects: { intel: 2, reputation: 3 } },
                    { label: 'Contemporary painting is the new blue chip. I\'m buying the generation that replaces Richter.', tone: 'direct', next: 'thesis_mediocre' },
                    { label: 'I collect what I love. I don\'t have a thesis yet.', tone: 'friendly', next: 'thesis_honest' },
                ],
            },

            thesis_impressed: {
                speaker: 'lorenzo_gallo',
                text: 'He\'s quiet for five seconds. That\'s a long time in Lorenzo-time. "That\'s... not stupid." Coming from him, that\'s a standing ovation. He pulls out his phone. "I have three artists you should see. Not at the fair — at the gallery. Monday. 10 AM. Bring your passport and your conviction." He writes the address on a napkin. His handwriting is precise and small.',
                effects: { intel: 5, reputation: 5 },
                npcEffects: { lorenzo_gallo: { favor: 15 } },
                schedules: [{ weeksDelay: 1, type: 'phone_message', payload: { from: 'lorenzo_gallo', subject: 'Monday — 10 AM', body: 'Gallery is at Via Montenapoleone 12. Don\'t be late. I\'m showing you work that hasn\'t been photographed yet. Leave your phone in the car.', urgency: 'urgent' } }],
                topics: [
                    { label: 'I\'ll be there. Thank you.', tone: null, next: null },
                ],
            },

            thesis_mediocre: {
                speaker: 'lorenzo_gallo',
                text: '"The new blue chip." He doesn\'t bother hiding his disappointment. "Everyone says that. You know who actually finds the next Richter? Not the people looking for one." He stands. The meeting is wrapping up. "Come back when you have something original to say."',
                npcEffects: { lorenzo_gallo: { favor: -3 } },
                topics: [
                    { label: 'Fair enough. [Leave]', tone: null, next: null },
                ],
            },

            thesis_honest: {
                speaker: 'lorenzo_gallo',
                text: '"You don\'t have a thesis." He considers this. "That\'s either laziness or honesty. I\'ll assume honesty because you had the courage to say it to me." He finishes his espresso. "Here\'s what I suggest: spend six months looking and not buying. Go to every show, every studio, every auction. When you know what you care about — not what\'s going up, what you CARE about — come see me again."',
                effects: { intel: 3 },
                npcEffects: { lorenzo_gallo: { favor: 3 } },
                topics: [
                    { label: 'I will. Thank you for the honesty.', tone: null, next: null },
                ],
            },

            secondary_confession: {
                speaker: 'lorenzo_gallo',
                text: 'His jaw tightens. "You\'ve been buying my artists at auction." It\'s not a question. "Which ones?"',
                topics: [
                    { label: 'A Tanaka and two Asante works. I\'ve kept all of them.', tone: 'friendly', next: 'kept_works' },
                    { label: 'I flipped a few pieces. Made good returns.', tone: 'direct', next: 'flipper_rage' },
                ],
            },

            kept_works: {
                speaker: 'lorenzo_gallo',
                text: '"You kept them." He relaxes, fractionally. "That\'s good. The secondary market is a casino — but at least you\'re not gambling with my artists\' reputations." He studies you. "Where are they? Home? Storage?"',
                topics: [
                    { label: 'Hanging in my apartment. I live with them.', tone: 'friendly', npcEffects: { lorenzo_gallo: { favor: 8 } }, next: 'living_with_art' },
                    { label: 'In a freeport. Properly stored.', tone: 'direct', npcEffects: { lorenzo_gallo: { favor: -2 } }, next: 'freeport_disdain' },
                ],
            },

            living_with_art: {
                speaker: 'lorenzo_gallo',
                text: '"You live with them." Something almost human enters his voice. "Good. Art should be lived with. Not stored in a box in Geneva next to gold bars and other people\'s guilt." He pulls a card from his breast pocket. Cream stock, embossed. No email, no website. Just a name and a phone number. "Call the gallery. Tell them Lorenzo said to put you on the Asante list. Next body of work drops in spring."',
                effects: { intel: 3, reputation: 5 },
                npcEffects: { lorenzo_gallo: { favor: 10 } },
                topics: [
                    { label: 'This means a lot. Thank you.', tone: null, next: null },
                ],
            },

            freeport_disdain: {
                speaker: 'lorenzo_gallo',
                text: '"A freeport." The word comes out like he\'s describing a disease. "My artists make work to be seen, not to appreciate in tax-free darkness." He stands. "When you decide to be a collector instead of a warehouser, we can talk."',
                npcEffects: { lorenzo_gallo: { favor: -5 } },
                topics: [
                    { label: '[Leave]', tone: null, next: null },
                ],
            },

            flipper_rage: {
                speaker: 'lorenzo_gallo',
                text: 'The temperature in the room drops to absolute zero. "You flipped my artists\' work." He says it quietly — which is worse than if he shouted. "Do you know what that does? It makes the artist a commodity. It turns their studio into a factory. It destroys careers." He picks up his phone. "Your name is going on a list. Not the waiting list."',
                npcEffects: { lorenzo_gallo: { favor: -20 } },
                effects: { marketHeat: 5 },
                topics: [
                    { label: '[You\'ve been blacklisted]', tone: null, next: null },
                ],
            },

            elena_referral: {
                speaker: 'lorenzo_gallo',
                text: '"Elena." The name softens him — barely. "She has taste. Unusual for someone her age." He leans back. "She called me about you, actually. Said you bought Tomás Herrera\'s work and kept it. That counts for something with me."',
                effects: { intel: 2 },
                npcEffects: { lorenzo_gallo: { favor: 5 } },
                topics: [
                    { label: 'I believe in supporting artists early.', tone: 'friendly', npcEffects: { lorenzo_gallo: { favor: 5 } }, next: 'living_with_art' },
                    { label: 'Elena has never steered me wrong.', tone: 'schmoozing', next: 'voss_inquiry' },
                ],
            },

            voss_inquiry: {
                speaker: 'lorenzo_gallo',
                text: '"Elara Voss." He nods slowly. "She\'s the most exciting painter I\'ve represented in twenty years. Three museum shows confirmed for next year. The Whitney wants her for the Biennial." He pauses. "I have two small works available. $22,000 each. But I choose who buys them."',
                effects: { intel: 4 },
                topics: [
                    { label: 'I\'d like to be considered.', tone: 'friendly', requires: { reputation: { min: 50 } }, isBlueOption: true, next: 'voss_consideration' },
                    { label: 'What are the criteria?', tone: 'direct', next: 'voss_criteria' },
                    { label: 'Thank you for the information. [Leave]', tone: null, next: null },
                ],
            },

            voss_consideration: {
                speaker: 'lorenzo_gallo',
                text: '"Considered." He writes your name in a leather notebook. Actual pen and paper. "I\'ll look into your collection. If it\'s serious, I\'ll call you. If I don\'t call, don\'t call me." He closes the notebook. "One more thing: if you ever flip an Elara Voss, I will personally ensure you never buy from any gallery in my network again. Clear?"',
                effects: { reputation: 3 },
                npcEffects: { lorenzo_gallo: { favor: 5 } },
                schedules: [{ weeksDelay: 3, type: 'phone_message', payload: { from: 'lorenzo_gallo', subject: 'Voss — Decision', body: 'I looked into your holdings. You can have one piece. $22,000. No negotiation. Confirm by Friday or it goes to the next name.', urgency: 'urgent' } }],
                topics: [
                    { label: 'Crystal clear. [Leave]', tone: null, next: null },
                ],
            },

            voss_criteria: {
                speaker: 'lorenzo_gallo',
                text: '"The criteria." He counts on his fingers. "One: you don\'t flip. Two: you have a collection that makes sense — not a random grab bag. Three: you\'re willing to lend to museum shows when asked. Four: you don\'t post every acquisition on social media like a child showing off a toy." He looks at you. "How many of those do you meet?"',
                effects: { intel: 2 },
                topics: [
                    { label: 'All four.', tone: 'direct', requires: { reputation: { min: 50 } }, next: 'voss_consideration' },
                    { label: 'I\'m working on it.', tone: 'friendly', npcEffects: { lorenzo_gallo: { favor: 1 } }, next: 'thesis_honest' },
                ],
            },

            introduction_attempt: {
                speaker: 'lorenzo_gallo',
                text: '"Introduce yourself." He doesn\'t offer his hand. "Everyone introduces themselves. The question is what you do after." He waits. The silence is a test.',
                topics: [
                    { label: 'I\'m building a collection focused on emerging voices.', tone: 'friendly', next: 'thesis_test' },
                    { label: 'I have capital and I\'m looking for primary market access.', tone: 'direct', next: 'capital_pitch' },
                    { label: 'I just wanted to pay my respects. [Leave]', tone: null, npcEffects: { lorenzo_gallo: { favor: 1 } }, next: null },
                ],
            },

            capital_pitch: {
                speaker: 'lorenzo_gallo',
                text: '"Capital." He says it like it\'s a common cold. "Everyone has capital. Do you know how many billionaires I turned down last year? Eleven. Capital is the least interesting thing about a collector." He waves his hand. "Come back with a reason."',
                npcEffects: { lorenzo_gallo: { favor: -2 } },
                topics: [
                    { label: '[Leave]', tone: null, next: null },
                ],
            },
        },
        onComplete: { effects: {}, schedules: [] },
    },

    // ═══════════════════════════════════════════
    // TREE: Charles Vandermeer — Auction Preview
    // The speculator. Market kingmaker or destroyer.
    // ═══════════════════════════════════════════

    {
        id: 'charles_vandermeer_auction',
        npcId: 'charles_vandermeer',
        venue: 'auction_house',
        trigger: 'room_talk',
        title: 'The Speculator',
        entryConditions: null,
        nodes: {
            start: {
                speaker: 'charles_vandermeer',
                text: null,
                variants: [
                    { check: { 'npcFavor.charles_vandermeer': { min: 10 } }, text: 'Charles is already waving you over before you\'ve crossed the room. He\'s vibrating with energy — he always is. "You need to see this. I\'ve found something and I need a partner." He pulls you toward a corner away from the other previewer.' },
                    { check: null, text: 'Charles Vandermeer is studying a lot catalogue with the intensity of a general planning an invasion. He\'s younger than you expected — mid-thirties, expensive sneakers, a watch that costs more than most of the art in this room. He catches your eye and grins. It\'s the grin of someone who just saw an opportunity.' },
                ],
                topics: [
                    { label: 'What are you looking at?', tone: null, next: 'the_play' },
                    { label: 'I hear you move markets. Is that true?', tone: 'direct', next: 'market_mover' },
                    { label: 'Someone told me you\'re the person to know for early-stage plays.', tone: 'schmoozing', next: 'reputation_talk' },
                    { label: 'Just browsing. [Walk away]', tone: null, next: null },
                ],
            },

            the_play: {
                speaker: 'charles_vandermeer',
                text: '"Lot 47. Javier Molina. Cuban, based in Miami. Paints like Diebenkorn had a fight with Raúl Martínez." He flips the catalogue to a full-page image. "Estimate: $8,000 to $12,000. I bought fifteen of his works last month from his studio. Nobody knows yet." His eyes are bright. "In six weeks, I\'m placing two in a museum show I\'m sponsoring. Then one at Phillips. By spring, his price floor is $40,000."',
                effects: { intel: 5 },
                topics: [
                    { label: 'You\'re manufacturing a market.', tone: 'direct', next: 'manufacturing_market' },
                    { label: 'What do you need from me?', tone: null, next: 'partnership_offer' },
                    { label: 'That\'s insider manipulation. I\'m out.', tone: 'friendly', npcEffects: { charles_vandermeer: { favor: -5 } }, next: 'moral_exit' },
                ],
            },

            manufacturing_market: {
                speaker: 'charles_vandermeer',
                text: '"Manufacturing." He winces theatrically. "I prefer \'accelerating.\' The talent is real — Molina is genuinely excellent. I\'m just compressing the timeline. Instead of waiting ten years for the market to find him, I\'m bringing the market to him." He shrugs. "Larry Gagosian did the same thing with Basquiat. I\'m just more transparent about it."',
                effects: { intel: 2 },
                topics: [
                    { label: 'What\'s the play, specifically?', tone: 'direct', next: 'partnership_offer' },
                    { label: 'And when you dump your holdings?', tone: 'ruthless', next: 'dump_question' },
                    { label: 'I\'ll think about it. [Leave]', tone: null, next: 'open_door' },
                ],
            },

            dump_question: {
                speaker: 'charles_vandermeer',
                text: '"Dump?" He looks genuinely offended. "I hold for eighteen months minimum. I\'m not a day-trader." He leans in. "Look, the cynical version of what I do is pump-and-dump. The real version is: I find artists nobody is paying attention to, I use my network and resources to create attention, and I keep enough skin in the game that my interests and the artist\'s interests are aligned." He pauses. "Until they\'re not."',
                effects: { intel: 3 },
                topics: [
                    { label: '"Until they\'re not." Tell me about that part.', tone: 'direct', next: 'dark_side' },
                    { label: 'I\'m in. What do you need?', tone: null, next: 'partnership_offer' },
                ],
            },

            dark_side: {
                speaker: 'charles_vandermeer',
                text: 'For the first time, Charles drops the salesman energy. "Last year I backed a sculptor in Berlin. Incredible work. I bought thirty pieces, placed five in institutions, engineered a Christie\'s inclusion." He pauses. "Then she had a nervous breakdown. Couldn\'t produce. The market I\'d built evaporated in three months. I lost $400,000." He looks at you directly. "But she lost her career. And I think about that."',
                effects: { intel: 4 },
                npcEffects: { charles_vandermeer: { favor: 3 } },
                topics: [
                    { label: 'You feel responsible?', tone: 'friendly', npcEffects: { charles_vandermeer: { favor: 3 } }, next: 'responsible' },
                    { label: 'Is Molina different?', tone: null, next: 'molina_different' },
                ],
            },

            responsible: {
                speaker: 'charles_vandermeer',
                text: '"I feel..." He searches for the word. "Aware. I\'m aware that what I do has consequences beyond my spreadsheet. That\'s why I need partners now — people who will hold, who will lend to museums, who will create a real collector base. Not just a price bubble." He\'s being honest. You can tell because he\'s stopped smiling.',
                effects: { intel: 2, reputation: 2 },
                npcEffects: { charles_vandermeer: { favor: 5 } },
                topics: [
                    { label: 'I want to be part of building something real. Count me in.', tone: 'friendly', next: 'real_partnership' },
                    { label: 'Let me think about it.', tone: null, next: 'open_door' },
                ],
            },

            molina_different: {
                speaker: 'charles_vandermeer',
                text: '"Molina is 58 years old. He\'s been painting for thirty years. He\'s not going to have a breakdown — he\'s going to have a retrospective." Charles grins again — but it\'s warmer now. "This is a case where the market is genuinely behind the art. I\'m just closing the gap faster."',
                effects: { intel: 2 },
                topics: [
                    { label: 'Okay. What\'s the partnership look like?', tone: null, next: 'partnership_offer' },
                    { label: 'I need to think. [Leave]', tone: null, next: 'open_door' },
                ],
            },

            partnership_offer: {
                speaker: 'charles_vandermeer',
                text: '"Simple. You buy Lot 47 at auction — the Molina. I buy Lots 48 and 52. We hold. In six weeks, I place mine in the Pérez Art Museum show. Your piece appreciates by association. We don\'t coordinate, we don\'t talk about prices, we just... both happen to believe in the same artist." He winks. "It\'s not collusion. It\'s coincidence."',
                effects: { intel: 3, marketHeat: 2 },
                topics: [
                    { label: 'I\'ll bid on Lot 47. Let\'s do this.', tone: 'direct', requires: { cash: { min: 12000 } }, next: 'deal_made', effects: { marketHeat: 3 } },
                    { label: 'What if I want a bigger stake? Let me buy directly from his studio.', tone: 'ruthless', requires: { cash: { min: 25000 } }, isBlueOption: true, next: 'bigger_stake' },
                    { label: 'Too risky for me. [Pass]', tone: null, next: 'open_door' },
                ],
            },

            real_partnership: {
                speaker: 'charles_vandermeer',
                text: '"Good. Good." He\'s energised again. "Here\'s what I\'m thinking: you buy three Molina works directly from the studio. $6,000 each. I\'ll introduce you to him — he\'s incredible, you\'ll love him. Then we build a proper collector group. Five people, all committed to holding." He pulls out his phone. "I\'m sending you the studio address. Go this week. Tell him Charles sent you."',
                effects: { intel: 4, reputation: 3 },
                npcEffects: { charles_vandermeer: { favor: 10 } },
                schedules: [{ weeksDelay: 1, type: 'phone_message', payload: { from: 'charles_vandermeer', subject: 'Molina studio — go NOW', body: 'Studio is in Wynwood, Building 7, Unit C. He\'s there every day 6am-6pm. Buy the three pieces on the south wall. Tell him I sent you. DO NOT post anything on Instagram.', urgency: 'urgent' } }],
                topics: [
                    { label: 'I\'m in. Thank you, Charles.', tone: null, next: null },
                ],
            },

            deal_made: {
                speaker: 'charles_vandermeer',
                text: '"Done." He shakes your hand — firm, fast, transactional. "I\'ll see you at the sale. Don\'t bid above $14,000 — let me handle the room if it gets competitive. And after? We don\'t know each other." He winks again. "Welcome to the game within the game."',
                effects: { reputation: 2 },
                npcEffects: { charles_vandermeer: { favor: 8 } },
                schedules: [{ weeksDelay: 2, type: 'phone_message', payload: { from: 'charles_vandermeer', subject: 'Molina result', body: 'Lot 47 — you got it for $11,500. Pérez Museum show confirmed for March. Hold tight. This is going to move.', urgency: 'normal' } }],
                topics: [
                    { label: 'See you at the sale. [Leave]', tone: null, next: null },
                ],
            },

            bigger_stake: {
                speaker: 'charles_vandermeer',
                text: '"Bigger stake." His eyebrows go up. "I like your appetite. Alright — I\'ll set up a studio visit. You can buy up to five works at $5,000 each, studio price. That\'s below what I paid." He holds up a finger. "But if you flip even ONE before the museum show, I will make sure every gallery in Miami knows you\'re a liability. We clear?"',
                effects: { intel: 2, reputation: 3 },
                npcEffects: { charles_vandermeer: { favor: 12 } },
                topics: [
                    { label: 'Clear. Set up the visit.', tone: null, next: null },
                ],
            },

            moral_exit: {
                speaker: 'charles_vandermeer',
                text: '"Insider manipulation." He laughs — not cruelly. "That\'s what people who can\'t see opportunity call it." He shrugs. "No hard feelings. The art world is full of people who play it safe and end up with mediocre collections. Your call." He turns back to the catalogue.',
                topics: [
                    { label: '[Walk away]', tone: null, next: null },
                ],
            },

            reputation_talk: {
                speaker: 'charles_vandermeer',
                text: '"The person to know." He grins. "I\'m the person to know if you want to be in the room where the next big thing is decided before the rest of the market hears about it. I\'m also the person to know if you want to lose a lot of money very quickly." He shrugs. "Both are true. Depends which version of me you get."',
                effects: { intel: 2 },
                topics: [
                    { label: 'I want to hear about your current play.', tone: null, next: 'the_play' },
                    { label: 'What\'s your track record?', tone: 'direct', next: 'track_record' },
                ],
            },

            track_record: {
                speaker: 'charles_vandermeer',
                text: '"Seven artists backed in the last five years. Four are now represented by major galleries. One is in the MoMA collection. One had a breakdown." He pauses. "And one was a forgery I didn\'t catch." He says it without shame. "That\'s the game. 5 out of 7 is elite in any field."',
                effects: { intel: 4 },
                topics: [
                    { label: 'Tell me about the current play.', tone: null, next: 'the_play' },
                    { label: 'Interesting. I\'ll be in touch. [Leave]', tone: null, npcEffects: { charles_vandermeer: { favor: 1 } }, next: null },
                ],
            },

            open_door: {
                speaker: 'charles_vandermeer',
                text: '"The door is always open." He hands you a card — matte black with gold lettering. VANDERMEER ADVISORY. "When you\'re ready to stop watching and start playing, call me. I move fast and I don\'t repeat offers."',
                npcEffects: { charles_vandermeer: { favor: 2 } },
                topics: [],
            },
        },
        onComplete: { effects: {}, schedules: [] },
    },

    // ═══════════════════════════════════════════
    // TREE: Kwame Asante — Studio Visit
    // Deep branching, multiple paths, item rewards.
    // THE GOLD STANDARD comprehensive tree.
    // ═══════════════════════════════════════════

    {
        id: 'kwame_asante_studio_visit',
        npcId: 'kwame_asante',
        venue: 'studio_visit',
        trigger: 'room_talk',
        title: 'The Artist\'s Trust',
        entryConditions: null,
        nodes: {
            start: {
                speaker: null,
                text: null,
                variants: [
                    { check: { 'npcFavor.kwame_asante': { min: 15 } }, text: 'Kwame opens the door before you knock. "I saw you coming up the street." He\'s wearing paint-stained overalls and a warm smile. The studio smells like linseed oil and coffee. "Come in. I want to show you something I\'ve been working on. I think you\'ll understand it."' },
                    { check: { 'npcFavor.kwame_asante': { min: 5 } }, text: 'Kwame answers the door cautiously. He\'s always cautious — it takes time to earn his trust. But he steps aside. "Come in. Don\'t touch anything on the left wall — it\'s still wet." The studio is a controlled chaos of canvases, stretched linen, and jars of pigment that glow like crushed jewels.' },
                    { check: null, text: 'The studio is on the third floor of a converted warehouse in Bushwick. Kwame Asante opens the door and looks at you for a long moment before speaking. "Elena said I should talk to you. I\'m not sure why. Most collectors want a selfie and a story for their dinner parties." He doesn\'t move from the doorway. "What do you want?"' },
                ],
                topics: [
                    { label: 'I want to understand your work. Not just own it.', tone: 'friendly', next: 'understand_work' },
                    { label: 'I bought one of your pieces at auction. I came to tell you in person.', tone: 'friendly', next: 'auction_confession' },
                    { label: 'I\'m building a collection and your name keeps coming up.', tone: 'direct', next: 'name_keeps_coming' },
                    { label: 'I brought you something.', tone: 'generous', requires: { cash: { min: 2000 } }, isBlueOption: true, next: 'brought_gift', effects: { cash: -2000 } },
                ],
            },

            understand_work: {
                speaker: 'kwame_asante',
                text: 'Something in his posture softens. He steps aside. "Alright. Come in." He leads you past finished canvases — portraits that seem to breathe — to a small back room. On the wall is a painting unlike anything else in the studio. It\'s large, dark, intimate. A figure sits in a chair, face half-obscured. The brushwork is violent and tender at the same time. "This is my mother. She died three years ago. I\'ve been trying to paint this ever since."',
                effects: { intel: 2 },
                npcEffects: { kwame_asante: { favor: 3 } },
                topics: [
                    { label: 'Tell me about her.', tone: 'friendly', npcEffects: { kwame_asante: { favor: 5 } }, next: 'mothers_story' },
                    { label: 'The brushwork in the face — why leave it unresolved?', tone: null, requires: { intel: { min: 5 } }, isBlueOption: true, next: 'technical_discussion' },
                    { label: 'Is this for sale?', tone: 'direct', npcEffects: { kwame_asante: { favor: -8 } }, next: 'too_soon' },
                ],
            },

            mothers_story: {
                speaker: 'kwame_asante',
                text: 'He\'s quiet for a long time. "She was a seamstress in Accra. She could make anything — a suit from scraps, a wedding dress from curtains. She taught me that materials have memory." He touches the canvas lightly. "This red? It\'s from earth I brought back from her village. Ground it myself." His voice catches. "She never saw me in a gallery. She died six months before my first solo show."',
                effects: { intel: 3, reputation: 2 },
                npcEffects: { kwame_asante: { favor: 5 } },
                topics: [
                    { label: 'She would have been proud.', tone: 'friendly', npcEffects: { kwame_asante: { favor: 3 } }, next: 'pride_response' },
                    { label: 'The earth pigment — you\'re literally putting her home into the work.', tone: null, requires: { intel: { min: 6 } }, isBlueOption: true, next: 'pigment_insight', effects: { intel: 2 } },
                    { label: '[Stay quiet. Let him be with the painting.]', tone: 'friendly', npcEffects: { kwame_asante: { favor: 8 } }, next: 'silence_respect' },
                ],
            },

            pigment_insight: {
                speaker: 'kwame_asante',
                text: 'He turns to you. His eyes are wet but his expression is sharp. "Yes. Exactly. That\'s what nobody else sees." He moves to a shelf and picks up a small jar — red-brown earth sealed with wax. "This is from her village. Akyem. I have enough for maybe three more paintings." He holds it out. "I want you to have some. Keep it. And when you look at my work in your home, you\'ll know what\'s inside it."',
                effects: { intel: 4, reputation: 5 },
                npcEffects: { kwame_asante: { favor: 10 } },
                reward: { id: 'akyem_earth_pigment', name: 'Jar of Akyem Earth', type: 'gift', description: 'A small jar of red earth from Kwame Asante\'s mother\'s village. Sacred pigment. Not for sale — for understanding.' },
                topics: [
                    { label: 'I\'ll treasure this. Thank you, Kwame.', tone: 'friendly', next: 'new_work_reveal' },
                ],
            },

            silence_respect: {
                speaker: 'kwame_asante',
                text: 'You stand together in silence for two full minutes. It\'s the right thing to do. Finally he exhales. "You\'re the first collector who didn\'t immediately ask the price." He looks at you with something new in his eyes — respect. "Let me show you what I\'m working on for the spring show."',
                effects: { intel: 2, reputation: 3 },
                npcEffects: { kwame_asante: { favor: 10 } },
                topics: [
                    { label: 'I\'d love to see it.', tone: null, next: 'new_work_reveal' },
                ],
            },

            pride_response: {
                speaker: 'kwame_asante',
                text: '"Proud." He tests the word. "I think she would have been confused, mostly. She didn\'t understand why people paid money for paintings when they could pay for food." He almost smiles. "But yes. I think she would have been proud." He covers the painting with a cloth. Gently. "Come. Let me show you what else I\'m making."',
                npcEffects: { kwame_asante: { favor: 3 } },
                topics: [
                    { label: 'Lead the way.', tone: null, next: 'new_work_reveal' },
                ],
            },

            new_work_reveal: {
                speaker: 'kwame_asante',
                text: 'He pulls a cloth off a series of five paintings leaning against the wall. They\'re extraordinary — figures emerging from abstract fields of colour, each one a different shade of that red earth mixed with blues and golds. "The \'Homecoming\' series. Five paintings. My gallery wants $45,000 each. They\'ll sell out in a day." He turns to you. "But I get to choose the first buyer. And I\'d like it to be you."',
                effects: { intel: 5 },
                topics: [
                    { label: 'I\'m honoured. Which one?', tone: 'friendly', next: 'choose_painting' },
                    { label: 'All five. Name the price.', tone: 'generous', requires: { cash: { min: 200000 } }, isBlueOption: true, next: 'all_five', effects: { reputation: 5, marketHeat: 3 } },
                    { label: 'I need to think about it. This is a significant commitment.', tone: null, next: 'think_about_it' },
                ],
            },

            choose_painting: {
                speaker: 'kwame_asante',
                text: '"This one." He points to the third painting — the largest. A woman standing in a doorway, half in shadow, half in golden light. "It\'s called \'Threshold.\' It\'s the best thing I\'ve ever painted." He pauses. "Lorenzo is going to kill me for giving you first pick. He has four collectors who\'d take it sight unseen."',
                effects: { intel: 2 },
                npcEffects: { kwame_asante: { favor: 5 } },
                topics: [
                    { label: 'I\'ll take it. $45,000. Done.', tone: 'direct', requires: { cash: { min: 45000 } }, triggerHaggle: true, effects: { cash: -45000, reputation: 8 }, npcEffects: { kwame_asante: { favor: 10 }, lorenzo_gallo: { favor: -3 } }, next: 'purchase_threshold' },
                    { label: 'Can I live with it for a week before committing?', tone: 'friendly', next: 'trial_period' },
                ],
            },

            trial_period: {
                speaker: 'kwame_asante',
                text: '"Live with it." He nods slowly. "Nobody has ever asked me that. They usually just want the transaction." He wraps the painting carefully. "Take it. One week. If it doesn\'t speak to you — if you wake up in the morning and don\'t look at it first — bring it back. No hard feelings."',
                effects: { reputation: 5 },
                npcEffects: { kwame_asante: { favor: 15 } },
                reward: { id: 'kwame_threshold_trial', name: 'Kwame Asante — "Threshold" (on trial)', type: 'artwork_trial', description: 'On loan from the artist for one week. Your decision will define the relationship.' },
                schedules: [{ weeksDelay: 1, type: 'phone_message', payload: { from: 'kwame_asante', subject: 'The painting', body: 'It\'s been a week. What did you decide? Be honest. I can handle either answer.', urgency: 'normal', actions: [{ label: 'I wake up and look at it first. I\'m keeping it. ($45,000)', effects: { cash: -45000, reputation: 10 } }, { label: 'It\'s extraordinary, but it\'s not mine to keep. I\'m bringing it back.', effects: { reputation: 3 } }] } }],
                topics: [
                    { label: 'Thank you for trusting me with this.', tone: null, next: null },
                ],
            },

            all_five: {
                speaker: 'kwame_asante',
                text: '"All five." He stares at you. "No collector has ever bought an entire series from me." He sits down on a paint-spattered stool. "That\'s... $225,000 at gallery price. But because it\'s the complete set, and because you understand what this work means — I\'ll do $200,000. No gallery commission. Direct."',
                npcEffects: { kwame_asante: { favor: 20 } },
                topics: [
                    { label: 'Done. Wire transfer or cheque?', tone: 'direct', requires: { cash: { min: 200000 } }, effects: { cash: -200000, reputation: 15 }, npcEffects: { kwame_asante: { favor: 15 } }, next: 'all_five_bought' },
                    { label: 'Could I do three now and two when they\'re finished?', tone: 'friendly', next: 'partial_series' },
                ],
            },

            all_five_bought: {
                speaker: 'kwame_asante',
                text: 'Kwame stands and extends his hand. When you shake, he holds on for an extra beat. "I want you to know something. This money — it\'s going to fund two years of work. No gallery pressure, no production schedule. Just me and the canvas." His voice is thick with emotion. "You\'re not buying paintings. You\'re buying me time."',
                effects: { reputation: 10, intel: 5 },
                reward: { id: 'kwame_studio_key', name: 'Key to Kwame\'s Studio', type: 'access', description: 'Kwame gave you a key to his studio. "Come anytime. The coffee is terrible but the paintings are honest."' },
                schedules: [{ weeksDelay: 4, type: 'phone_message', payload: { from: 'kwame_asante', subject: 'Something new', body: 'I finished something last night. It\'s different from anything I\'ve done. I want you to see it before anyone else. Come by Thursday? Bring that terrible coffee you like.', urgency: 'normal' } }],
                topics: [
                    { label: 'That\'s exactly what I wanted to buy.', tone: null, next: null },
                ],
            },

            partial_series: {
                speaker: 'kwame_asante',
                text: '"Three now, two later." He considers it. "I can do that. $45,000 each for the first three. I\'ll hold the last two for you — but I need to know by spring. Lorenzo is already asking about them."',
                effects: { reputation: 5 },
                npcEffects: { kwame_asante: { favor: 8 } },
                topics: [
                    { label: 'Deal. I\'ll take these three.', tone: 'direct', requires: { cash: { min: 135000 } }, effects: { cash: -135000, reputation: 5 }, next: 'partial_bought' },
                    { label: 'Let me think about the timing.', tone: null, next: 'think_about_it' },
                ],
            },

            partial_bought: {
                speaker: 'kwame_asante',
                text: '"Good." He starts wrapping them — carefully, with the kind of attention he gives to the work itself. "I\'ll crate them properly. You\'ll have them by Friday." He pauses. "One condition: if you ever want to sell any of these, you call me first. Not a dealer. Not an auction house. Me."',
                npcEffects: { kwame_asante: { favor: 5 } },
                topics: [
                    { label: 'You have my word.', tone: null, next: null },
                ],
            },

            purchase_threshold: {
                speaker: 'kwame_asante',
                text: 'He places a red dot sticker on the frame — but gently, like he\'s putting a plaster on something precious. "Take care of her. She\'s my mother standing in her own doorway, deciding whether to let the world in." He takes a breath. "I\'m trusting you with my family."',
                effects: { reputation: 5 },
                topics: [
                    { label: 'I understand the weight of that. Thank you.', tone: null, next: null },
                ],
            },

            think_about_it: {
                speaker: 'kwame_asante',
                text: '"Think about it." He nods — no pressure, no sales pitch. "That\'s the right instinct. Living with art is a commitment. Take my number." He writes it on the back of a paint-smeared receipt. "Call me when you\'re ready. Or don\'t. Either way, I\'m glad you came."',
                npcEffects: { kwame_asante: { favor: 3 } },
                topics: [
                    { label: 'Thank you for showing me the work. [Leave]', tone: null, next: null },
                ],
            },

            auction_confession: {
                speaker: 'kwame_asante',
                text: 'His expression shifts. Not anger — wariness. "You bought one at auction." He crosses his arms. "Which one? And what did you do with it?"',
                topics: [
                    { label: '"Portrait of a Man with Red Dust." It\'s hanging in my living room.', tone: 'friendly', next: 'auction_living_room' },
                    { label: 'I sold it. Made a good return.', tone: 'direct', next: 'auction_flipped' },
                    { label: 'It\'s in storage. Safe and insured.', tone: null, next: 'auction_storage' },
                ],
            },

            auction_living_room: {
                speaker: 'kwame_asante',
                text: 'The wariness melts. "Your living room." He actually smiles. "Can I see a photo? I always want to know where they end up." He takes out his phone, expectant. "Elena told me you weren\'t a flipper. But I needed to hear it from you."',
                effects: { intel: 2 },
                npcEffects: { kwame_asante: { favor: 10 } },
                topics: [
                    { label: '[Show him the photo]', tone: 'friendly', npcEffects: { kwame_asante: { favor: 5 } }, next: 'new_work_reveal' },
                ],
            },

            auction_flipped: {
                speaker: 'kwame_asante',
                text: 'The door to the studio might as well be closing. "You flipped it." He says it flatly. "You bought my work — something I spent four months on — and turned it into a commodity." He points to the door. "I think we\'re done. Please don\'t come back."',
                npcEffects: { kwame_asante: { favor: -20 } },
                topics: [
                    { label: '[You\'ve been dismissed]', tone: null, next: null },
                ],
            },

            auction_storage: {
                speaker: 'kwame_asante',
                text: '"Storage." He sighs. "It\'s not the worst answer, but it\'s not the right one either. A painting in storage is a conversation nobody\'s having." He looks at you. "Hang it. Live with it. Then come back and tell me what it said to you."',
                npcEffects: { kwame_asante: { favor: 1 } },
                topics: [
                    { label: 'I will. I promise.', tone: 'friendly', next: 'think_about_it' },
                    { label: '[Leave quietly]', tone: null, next: null },
                ],
            },

            name_keeps_coming: {
                speaker: 'kwame_asante',
                text: '"My name keeps coming up." He leans against the doorframe. "That\'s usually a bad sign. It means the speculators are circling." He studies you. "Are you a speculator? Or a collector?"',
                topics: [
                    { label: 'A collector. I want to understand before I buy.', tone: 'friendly', npcEffects: { kwame_asante: { favor: 3 } }, next: 'understand_work' },
                    { label: 'I\'m interested in your trajectory. The market sees potential.', tone: 'direct', npcEffects: { kwame_asante: { favor: -5 } }, next: 'trajectory_response' },
                ],
            },

            trajectory_response: {
                speaker: 'kwame_asante',
                text: '"My trajectory." He repeats it with distaste. "I\'m not a stock. I\'m a person who makes things." He steps back. "If you want to talk about trajectories, call my gallery. If you want to talk about painting, come back with different questions."',
                npcEffects: { kwame_asante: { favor: -3 } },
                topics: [
                    { label: 'You\'re right. I\'m sorry. Can we start over?', tone: 'friendly', npcEffects: { kwame_asante: { favor: 2 } }, next: 'understand_work' },
                    { label: '[Leave]', tone: null, next: null },
                ],
            },

            too_soon: {
                speaker: 'kwame_asante',
                text: 'He steps back. The warmth evaporates. "I just told you about my dead mother and your first question is the price?" He shakes his head. "This is why I don\'t do studio visits."',
                topics: [
                    { label: 'I\'m sorry. That was thoughtless.', tone: 'friendly', npcEffects: { kwame_asante: { favor: 3 } }, next: 'mothers_story' },
                    { label: '[Leave in shame]', tone: null, next: null },
                ],
            },

            technical_discussion: {
                speaker: 'kwame_asante',
                text: '"The unresolved face." He looks at you with new interest. "You know painting." It\'s not a question. "I can\'t finish it. Every time I try, it becomes a likeness — accurate but dead. I want it to be alive. So I leave the face open." He picks up a brush and gestures at the canvas. "The viewer has to complete it. That\'s the point. You bring your own mother\'s face to it."',
                effects: { intel: 4 },
                npcEffects: { kwame_asante: { favor: 8 } },
                topics: [
                    { label: 'Like Richter\'s blurred photographs — the absence IS the presence.', tone: null, requires: { intel: { min: 8 } }, isBlueOption: true, effects: { intel: 3, reputation: 3 }, npcEffects: { kwame_asante: { favor: 5 } }, next: 'richter_comparison' },
                    { label: 'That\'s beautiful. Show me more of your process.', tone: 'friendly', next: 'new_work_reveal' },
                ],
            },

            richter_comparison: {
                speaker: 'kwame_asante',
                text: '"Richter." He nods vigorously. "Yes. Exactly. But I\'m not using blur — I\'m using absence. Different tool, same intent." He actually laughs. "Do you know, you\'re the third collector to ever reference Richter in my studio. The first two own works in the Tate." He goes to a cabinet and pulls out a small sketchbook. "Here. I want you to have this. It\'s the studies for the Homecoming series."',
                effects: { intel: 5, reputation: 5 },
                npcEffects: { kwame_asante: { favor: 10 } },
                reward: { id: 'kwame_sketchbook', name: 'Kwame Asante\'s Sketchbook (Homecoming Studies)', type: 'document', description: 'Pencil and watercolour studies for the Homecoming series. Forty pages of process. Priceless for understanding the finished works.' },
                topics: [
                    { label: 'I can\'t accept this. It\'s too valuable.', tone: 'friendly', npcEffects: { kwame_asante: { favor: 3 } }, next: 'insist_sketchbook' },
                    { label: 'Thank you. I\'ll study every page.', tone: null, next: 'new_work_reveal' },
                ],
            },

            insist_sketchbook: {
                speaker: 'kwame_asante',
                text: '"Too valuable." He pushes it into your hands. "It\'s paper and pencil. The value is in understanding. And you\'ve shown me you understand." He\'s not taking it back. "Besides — I have a digital backup. I\'m a Luddite, not a fool."',
                topics: [
                    { label: 'I\'m honoured. Let me see the new work.', tone: null, next: 'new_work_reveal' },
                ],
            },

            brought_gift: {
                speaker: 'kwame_asante',
                text: 'You hand him the package — a vintage set of Sennelier oil pastels, the same brand Picasso used. He opens it slowly. "Where did you find these? This is the 1960s set — they don\'t make this formulation anymore." He holds one up to the light. The colour is impossibly rich. "You did your homework."',
                effects: { reputation: 3 },
                npcEffects: { kwame_asante: { favor: 12 } },
                topics: [
                    { label: 'A friend in Paris tracked them down.', tone: 'friendly', npcEffects: { kwame_asante: { favor: 3 } }, next: 'gift_warmth_kwame' },
                    { label: 'I thought they\'d be useful for the new work.', tone: null, next: 'gift_warmth_kwame' },
                ],
            },

            gift_warmth_kwame: {
                speaker: 'kwame_asante',
                text: '"Come in. Come in." The wariness is completely gone. He practically pulls you through the door. "I want to show you everything. The new series, the experiments, even the failures." He sets the pastels down with the reverence of someone handling relics. "Most people bring wine. You brought me tools. That tells me something."',
                effects: { intel: 3 },
                npcEffects: { kwame_asante: { favor: 5 } },
                topics: [
                    { label: 'Show me everything.', tone: null, next: 'new_work_reveal' },
                ],
            },
        },
        onComplete: { effects: {}, schedules: [] },
    },

    // ═══════════════════════════════════════════
    // TREE: Marcus Price — Market Briefing
    // Data-driven advisor. Intel-heavy, relationship-light.
    // ═══════════════════════════════════════════

    {
        id: 'marcus_price_briefing',
        npcId: 'marcus_price',
        venue: 'cocktail_party',
        trigger: 'room_talk',
        title: 'The Analyst',
        entryConditions: null,
        nodes: {
            start: {
                speaker: 'marcus_price',
                text: null,
                variants: [
                    { check: { 'npcFavor.marcus_price': { min: 10 } }, text: 'Marcus finds you before you find him. He\'s holding two drinks — he anticipated you\'d be here. "I ran the numbers on your portfolio. We need to talk." He hands you a glass and steers you toward a quiet corner. His tablet is already open.' },
                    { check: null, text: 'Marcus Price is standing near the bar, scrolling through something on his tablet. He\'s the only person at a cocktail party who looks like he\'s at work — because he is. He notices you and raises an eyebrow. "Are you here to network or to make money? Different conversations."' },
                ],
                topics: [
                    { label: 'Make money. What are you seeing?', tone: 'direct', next: 'market_analysis' },
                    { label: 'I need portfolio advice. What should I be buying?', tone: null, next: 'portfolio_review' },
                    { label: 'What\'s your read on the current market?', tone: null, next: 'macro_view' },
                    { label: 'Both. But intel first.', tone: 'schmoozing', next: 'market_analysis' },
                ],
            },

            market_analysis: {
                speaker: 'marcus_price',
                text: 'He turns the tablet toward you. It shows a scatter plot of auction results. "Three signals right now. One: post-war European is overheated — Richter, Kiefer, Soulages are all above trend. Correction coming." He swipes. "Two: Southeast Asian contemporary is underpriced relative to quality. Vietnamese artists especially." Swipe. "Three: there\'s a generational shift happening in African art — Amoako Boafo was the beginning, not the peak."',
                effects: { intel: 6 },
                topics: [
                    { label: 'What specifically should I buy?', tone: 'direct', next: 'specific_picks' },
                    { label: 'How do you get this data?', tone: null, next: 'data_source' },
                    { label: 'What about my current holdings?', tone: null, next: 'portfolio_review' },
                    { label: 'The African art signal — tell me more.', tone: 'friendly', next: 'african_art_deep' },
                ],
            },

            specific_picks: {
                speaker: 'marcus_price',
                text: '"Picks." He pulls up another screen. "Three names. Write these down." He glances around, lowers his voice. "Ngozi Okafor — Nigerian, installation artist, just got into the Sharjah Biennial. Works are $8,000 now. My model says $35,000 in eighteen months." He pauses. "Dao Van Tri — Vietnamese painter, gallery price $12,000, auction estimate $20,000 by year-end. And—" He hesitates. "This last one is riskier."',
                effects: { intel: 5 },
                topics: [
                    { label: 'I can handle risk. Tell me.', tone: 'direct', next: 'risky_pick' },
                    { label: 'The first two are enough. How do I access them?', tone: null, next: 'access_plan' },
                    { label: 'What\'s your fee for this kind of advice?', tone: 'direct', next: 'fee_discussion' },
                ],
            },

            risky_pick: {
                speaker: 'marcus_price',
                text: '"Javier Molina. Cuban. Based in Miami." He watches your reaction. "Someone — I won\'t say who — has been quietly accumulating his work. Fifteen pieces in the last two months. That\'s a market manipulation pattern." He shows you a graph. "But here\'s the thing: even without the manipulation, my model says Molina is underpriced by 60%. The manipulator might actually be right. The question is: do you want to ride the wave or get out of its way?"',
                effects: { intel: 7 },
                topics: [
                    { label: 'Who\'s accumulating?', tone: 'direct', requires: { intel: { min: 8 } }, isBlueOption: true, next: 'vandermeer_reveal' },
                    { label: 'I\'ll ride the wave. How do I get in?', tone: null, next: 'molina_entry' },
                    { label: 'Too risky. The other two picks are cleaner.', tone: null, next: 'access_plan' },
                ],
            },

            vandermeer_reveal: {
                speaker: 'marcus_price',
                text: '"I can\'t say the name." He pauses. "But if you\'ve been to any auction previews lately, you might have met someone who talks about \'accelerating\' markets." He raises an eyebrow meaningfully. "That person\'s track record is 5 out of 7. Those are good odds. But the two failures were spectacular."',
                effects: { intel: 4 },
                reward: { id: 'marcus_market_report', name: 'Marcus Price — Confidential Market Brief', type: 'document', description: 'A data-driven analysis of three underpriced artists, market manipulation signals, and portfolio rebalancing recommendations.' },
                topics: [
                    { label: 'Charles Vandermeer.', tone: 'direct', effects: { intel: 1 }, npcEffects: { marcus_price: { favor: 3 } }, next: 'confirmed_vandermeer' },
                    { label: 'I\'ll figure it out. What else do you have?', tone: null, next: 'portfolio_review' },
                ],
            },

            confirmed_vandermeer: {
                speaker: 'marcus_price',
                text: '"I didn\'t say that name." But he doesn\'t deny it either. "The point is: the Molina play is real, but it has a puppet master. If you\'re in, know that you\'re riding someone else\'s wave. And waves crash." He closes his tablet. "My advice? Buy Okafor and Dao instead. Organic growth, no manipulation. Slower returns but you sleep at night."',
                effects: { intel: 3 },
                npcEffects: { marcus_price: { favor: 5 } },
                topics: [
                    { label: 'Good advice. How do I access Okafor and Dao?', tone: null, next: 'access_plan' },
                    { label: 'What do you charge for ongoing advisory?', tone: 'direct', next: 'fee_discussion' },
                ],
            },

            molina_entry: {
                speaker: 'marcus_price',
                text: '"There\'s a Molina in the next Phillips day sale. Lot 47. Estimate $8,000-$12,000. I expect it to hammer at $11,000-$13,000 with the buyer interest I\'m seeing." He pulls up the lot on his tablet. "If you want primary market access, you\'d need to go through the accumulator. And that means being in their debt."',
                effects: { intel: 3 },
                topics: [
                    { label: 'I\'ll bid at auction. Cleaner that way.', tone: null, npcEffects: { marcus_price: { favor: 2 } }, next: 'access_plan' },
                    { label: 'I\'ll take the debt. Put me in touch.', tone: 'ruthless', effects: { marketHeat: 2 }, next: 'dangerous_path' },
                ],
            },

            dangerous_path: {
                speaker: 'marcus_price',
                text: '"Your call." He sends a text. "I\'ve given your number to someone. He\'ll reach out." He puts his phone away. "For the record: I think this is a mistake. But I\'m your advisor, not your mother."',
                effects: { intel: 1 },
                npcEffects: { marcus_price: { favor: -2 } },
                schedules: [{ weeksDelay: 1, type: 'phone_message', payload: { from: 'charles_vandermeer', subject: 'Marcus said I should call', body: 'I hear you\'re interested in Molina. We should talk. Are you at the Phillips preview on Thursday?', urgency: 'normal' } }],
                topics: [
                    { label: 'Noted. Thanks, Marcus.', tone: null, next: null },
                ],
            },

            portfolio_review: {
                speaker: 'marcus_price',
                text: 'He opens a spreadsheet. Your spreadsheet. "I pulled your portfolio from the last auction records and gallery confirmations. Don\'t ask how." He scrolls. "You\'re over-concentrated in one tier. And you have too much exposure to a single gallery\'s roster. If that gallery closes — and they do — your portfolio loses 40% overnight."',
                effects: { intel: 5 },
                topics: [
                    { label: 'What should I rebalance?', tone: null, next: 'rebalance_advice' },
                    { label: 'How did you get my portfolio data?', tone: 'direct', next: 'data_source' },
                ],
            },

            rebalance_advice: {
                speaker: 'marcus_price',
                text: '"Diversify across three axes: geography, medium, and price tier." He draws a triangle on a napkin. "You want Asian contemporary, European post-war, and American emerging. You want paintings, but also photography and sculpture — different market cycles. And you want at least one piece above $100K to anchor the collection with institutional credibility."',
                effects: { intel: 5, reputation: 2 },
                reward: { id: 'marcus_portfolio_plan', name: 'Portfolio Rebalancing Plan', type: 'document', description: 'A data-driven strategy for diversifying your collection across geography, medium, and price tier.' },
                topics: [
                    { label: 'This is incredibly helpful. What do you charge?', tone: null, next: 'fee_discussion' },
                    { label: 'Can you send me the full analysis?', tone: null, npcEffects: { marcus_price: { favor: 2 } }, next: 'full_analysis' },
                ],
            },

            full_analysis: {
                speaker: 'marcus_price',
                text: '"I\'ll email it tonight. Twenty pages. Market signals, portfolio heat map, rebalancing recommendations, and a watchlist of twelve artists my model flags as underpriced." He finishes his drink. "First report is free. After that, we talk about a retainer."',
                effects: { intel: 3 },
                npcEffects: { marcus_price: { favor: 5 } },
                schedules: [{ weeksDelay: 1, type: 'phone_message', payload: { from: 'marcus_price', subject: 'Analysis attached', body: 'As promised. Twenty-two pages — I went long. Key takeaway: you need to diversify geographically. Three names highlighted in yellow are my highest-conviction picks. Read the risk disclosures. Then call me.', urgency: 'normal' } }],
                topics: [
                    { label: 'Looking forward to it. Thank you, Marcus.', tone: null, next: null },
                ],
            },

            data_source: {
                speaker: 'marcus_price',
                text: '"How I get the data." He almost smiles — the closest Marcus gets to humour. "Auction results are public. Gallery pricing is semi-public if you know who to ask. Freeport storage records are... accessible to people with the right relationships at the right ports." He shrugs. "Information asymmetry is the only edge in this market. I make it my business to have more information than anyone else in the room."',
                effects: { intel: 4 },
                topics: [
                    { label: 'I want that edge too. What would a retainer look like?', tone: 'direct', next: 'fee_discussion' },
                    { label: 'Impressive. Let\'s talk specific picks.', tone: null, next: 'specific_picks' },
                ],
            },

            african_art_deep: {
                speaker: 'marcus_price',
                text: '"The African art signal." He pulls up a chart showing auction prices over five years. The line goes up at 45 degrees. "Boafo was a $2,000 artist in 2018. His work sold for $3.4 million at auction in 2022. That\'s not a fluke — it\'s a market correction. African contemporary was underpriced for decades because of institutional bias. That bias is breaking down." He tabs to a new screen. "The next wave is East African. Keep your eyes on Kenyan and Ethiopian artists."',
                effects: { intel: 5 },
                topics: [
                    { label: 'Any specific names?', tone: null, next: 'specific_picks' },
                    { label: 'How does this affect my portfolio?', tone: null, next: 'portfolio_review' },
                ],
            },

            macro_view: {
                speaker: 'marcus_price',
                text: '"Macro." He sets down his drink. "Interest rates are the most important thing in the art market and nobody talks about it. When rates are low, rich people park cash in art. When rates rise, they sell to cover other positions." He checks something on his phone. "Right now? Rates are ambiguous. Which means the market is a knife fight between believers and liquidators. Perfect conditions for someone who knows what they\'re doing."',
                effects: { intel: 4 },
                topics: [
                    { label: 'Am I a believer or a liquidator?', tone: null, next: 'market_analysis' },
                    { label: 'What should I be doing right now?', tone: 'direct', next: 'portfolio_review' },
                ],
            },

            fee_discussion: {
                speaker: 'marcus_price',
                text: '"My retainer is $5,000 per quarter. For that you get: weekly market signals, monthly portfolio reviews, access to my auction analytics platform, and a direct line when something time-sensitive comes up." He pauses. "Most of my clients make that back on a single avoided mistake. The art market punishes ignorance more than any other asset class."',
                effects: { intel: 2 },
                topics: [
                    { label: 'Done. Sign me up.', tone: 'direct', requires: { cash: { min: 5000 } }, effects: { cash: -5000, intel: 3 }, npcEffects: { marcus_price: { favor: 10 } }, next: 'retainer_signed' },
                    { label: 'Let me think about it.', tone: null, npcEffects: { marcus_price: { favor: 1 } }, next: 'think_retainer' },
                ],
            },

            retainer_signed: {
                speaker: 'marcus_price',
                text: '"Good decision." He extends his hand — a formal, businesslike shake. "First brief lands in your inbox Monday. I\'ll include the watchlist, the portfolio heat map, and three time-sensitive opportunities." For the first time tonight, something like warmth enters his voice. "Welcome to the informed side of the market."',
                effects: { reputation: 3 },
                schedules: [
                    { weeksDelay: 1, type: 'phone_message', payload: { from: 'marcus_price', subject: 'Brief #1 — Three opportunities', body: 'Attached: Q1 market brief. Key signals: (1) Okafor — buy before Sharjah opens, (2) Dao — Phillips lot 23 is underestimated, (3) Avoid Richter secondary market — correction imminent. Call me if you need valuation on anything.', urgency: 'normal' } },
                ],
                topics: [
                    { label: 'Looking forward to Monday. [Leave]', tone: null, next: null },
                ],
            },

            think_retainer: {
                speaker: 'marcus_price',
                text: '"Take your time." He hands you a card — minimal design, just a name and phone number. "But remember: in this market, the cost of not knowing is always higher than the cost of knowing."',
                npcEffects: { marcus_price: { favor: 1 } },
                topics: [],
            },

            access_plan: {
                speaker: 'marcus_price',
                text: '"Access." He pulls up a contact list. "Okafor is represented by a small gallery in Lagos — Rele Gallery. I have a relationship with the director. I can get you a studio visit next time you\'re in that region. Dao is easier — Galerie Quynh in Ho Chi Minh City, and they have a booth at Art Basel Hong Kong." He sends two emails while talking to you. "Done. I\'ve introduced you by email. You\'re on their radar."',
                effects: { intel: 4, reputation: 3 },
                npcEffects: { marcus_price: { favor: 5 } },
                schedules: [{ weeksDelay: 2, type: 'phone_message', payload: { from: 'marcus_price', subject: 'Galerie Quynh responded', body: 'They have a Dao Van Tri available. 120x90cm, oil on silk. $12,000. If you want it, confirm in 48 hours. They have two other buyers in the queue.', urgency: 'urgent', actions: [{ label: 'Buy it — $12,000', effects: { cash: -12000, reputation: 3 } }, { label: 'Pass — too fast', effects: {} }] } }],
                topics: [
                    { label: 'Marcus, you\'re invaluable. Thank you.', tone: null, next: null },
                ],
            },
        },
        onComplete: { effects: {}, schedules: [] },
    },

];

// ─────────────────────────────────────────────
// LOOKUPS
// ─────────────────────────────────────────────

/**
 * Flat lookup: treeId → tree object
 */
export const TREE_MAP = {};
for (const tree of DIALOGUE_TREES) {
    TREE_MAP[tree.id] = tree;
}

/**
 * Lookup: npcId → [tree, tree, ...]
 */
export const TREES_BY_NPC = {};
for (const tree of DIALOGUE_TREES) {
    if (!TREES_BY_NPC[tree.npcId]) TREES_BY_NPC[tree.npcId] = [];
    TREES_BY_NPC[tree.npcId].push(tree);
}

/**
 * Lookup: venueId → [tree, tree, ...]
 */
export const TREES_BY_VENUE = {};
for (const tree of DIALOGUE_TREES) {
    if (!tree.venue) continue;
    if (!TREES_BY_VENUE[tree.venue]) TREES_BY_VENUE[tree.venue] = [];
    TREES_BY_VENUE[tree.venue].push(tree);
}
