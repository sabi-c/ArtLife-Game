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
                    { label: 'I\'ll take both pieces', tone: 'generous', effects: { cash: -8000, reputation: 3 }, npcEffects: { elena_ross: { favor: 10 } }, next: 'bought_unknown', schedules: [{ weeksDelay: 8, type: 'phone_message', payload: { from: 'elena_ross', subject: 'Tomás made a shortlist', body: 'Just wanted you to know — Tomás Herrera was shortlisted for the Rema Hort Mann Prize. Your early support meant the world. The works you bought are now valued at $12K each.', urgency: 'normal' } }] },
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
                    { label: 'I want the $35K piece', tone: 'direct', requires: { cash: { min: 35000 } }, effects: { cash: -35000 }, npcEffects: { elena_ross: { favor: 5 } }, next: 'bought_tanaka' },
                    { label: 'Any room on the prices?', tone: 'direct', next: 'pricing_negotiation' },
                    { label: 'End conversation', tone: null, next: 'closing' },
                ],
            },

            pricing_negotiation: {
                speaker: 'elena_ross',
                text: '"I don\'t discount my artists. Period." She says it without hostility — it\'s a fact, like gravity. "The price is the price. If it makes you feel better, Yuki\'s last show sold out in two hours. This is the floor, not the ceiling."',
                topics: [
                    { label: 'Understood. I\'ll take the $18K piece.', tone: null, requires: { cash: { min: 18000 } }, effects: { cash: -18000, reputation: 1 }, npcEffects: { elena_ross: { favor: 3 } }, next: 'bought_tanaka_small' },
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
                    { label: 'Done. I\'ll take care of it.', tone: 'generous', requires: { cash: { min: 6000 } }, effects: { cash: -6000, reputation: 5 }, npcEffects: { elena_ross: { favor: 10 } }, next: null },
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
                    { label: 'I\'ll take the $18K piece', tone: null, requires: { cash: { min: 18000 } }, effects: { cash: -18000, reputation: 1 }, npcEffects: { elena_ross: { favor: 3 } }, next: 'bought_tanaka_small' },
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
