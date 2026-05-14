/**
 * sceneTemplates.js — Reusable Parameterized Scene/Dialogue Templates
 *
 * Instead of hardcoding every conversation in scenes.js, templates define
 * *patterns* that get inflated at runtime with specific NPC/venue/artwork
 * data. This lets us generate hundreds of encounters from a handful of
 * high-quality templates.
 *
 * Template shape:
 *   id           — unique template identifier
 *   type         — 'dialogue' | 'event' | 'venue_encounter' | 'cutscene'
 *   category     — grouping: 'persistent' | 'story' | 'reusable'
 *   params       — required parameter names the caller must provide
 *   optionalParams — optional params with defaults
 *   tags         — for filtering/search
 *   nodes        — either static node map or function(params) → node map
 *
 * Usage:
 *   import { resolveTemplate } from '../data/sceneTemplates.js';
 *   const scene = resolveTemplate('npc_conversation', {
 *       npcId: 'sasha_klein', venue: 'gallery_opening', mood: 'friendly'
 *   });
 *   // → returns a complete scene object compatible with DialogueEngine
 */

import { CONTACTS } from './contacts.js';
import { ARTWORKS } from './artworks.js';
import { MarketManager } from '../managers/MarketManager.js';

// ══════════════════════════════════════════════════════════════
// Helper: look up NPC data
// ══════════════════════════════════════════════════════════════
function npc(id) {
    return CONTACTS.find(c => c.id === id) || { name: id, role: 'unknown', greetings: ['Hello.'] };
}

function greeting(contact) {
    const gs = contact.greetings || ['Hello.'];
    return gs[Math.floor(Math.random() * gs.length)];
}

function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ══════════════════════════════════════════════════════════════
// Template Registry
// ══════════════════════════════════════════════════════════════

export const SCENE_TEMPLATES = {

    // ──────────────────────────────────────────
    // 1. Generic NPC Conversation
    //    Works with any NPC at any venue.
    // ──────────────────────────────────────────
    npc_conversation: {
        id: 'npc_conversation',
        type: 'dialogue',
        category: 'reusable',
        params: ['npcId'],
        optionalParams: { venue: null, mood: 'neutral', topic: null },
        tags: ['social', 'npc', 'dialogue'],
        build(p) {
            const c = npc(p.npcId);
            const moodText = {
                friendly: `${c.name} smiles when they see you. "${greeting(c)}"`,
                neutral: `${c.name} nods in your direction. "${greeting(c)}"`,
                cold: `${c.name} regards you coolly. Their expression says everything.`,
                hostile: `${c.name} sees you and their jaw tightens. This won't be easy.`,
            };
            const venueNote = p.venue ? `\n\nYou're at ${p.venue}.` : '';

            return {
                id: `npc_conv_${p.npcId}_${Date.now()}`,
                title: `Conversation with ${c.name}`,
                nodes: {
                    start: {
                        text: (moodText[p.mood] || moodText.neutral) + venueNote,
                        choices: [
                            {
                                label: `Ask about the market (+1 Intel)`,
                                next: 'talk_market',
                                effect(s) { s.updateStat('intel', 1); },
                            },
                            {
                                label: `Make small talk (+1 Rep)`,
                                next: 'small_talk',
                                effect(s) { s.updateStat('reputation', 1); },
                            },
                            ...(c.role === 'dealer' ? [{
                                label: `Ask if they have anything interesting to sell`,
                                next: 'dealer_pitch',
                            }] : []),
                            ...(c.role === 'artist' ? [{
                                label: `Ask about their latest work`,
                                next: 'artist_work',
                            }] : []),
                            { label: 'End conversation', next: 'end' },
                        ],
                    },
                    talk_market: {
                        text: `${c.name} leans in. "The market is... interesting right now. Everyone's watching the auction results. If the Basquiat hold above $10M, the rest follows. If they don't—" They trail off and take a sip of wine.`,
                        choices: [
                            { label: 'Push for more detail (+1 Intel)', next: 'market_detail', effect(s) { s.updateStat('intel', 1); } },
                            { label: 'Change the subject', next: 'start' },
                            { label: 'Leave', next: 'end' },
                        ],
                    },
                    market_detail: {
                        text: `"Look," ${c.name} says quietly, "I'm hearing things about the emerging tier. Three galleries are about to raise prices 30-40%. If you're going to buy, buy now. Before the VIP preview at Basel." They tap the side of their nose. "You didn't hear that from me."`,
                        choices: [{ label: 'Thank them and move on', next: 'end' }],
                    },
                    small_talk: {
                        text: `You chat about nothing important — the wine, the crowd, whether the DJ is acceptable. ${c.name} relaxes slightly. These moments matter. Trust is built in the margins.`,
                        choices: [
                            { label: 'Ask a real question', next: 'talk_market' },
                            { label: 'Wrap up gracefully', next: 'end' },
                        ],
                    },
                    dealer_pitch: {
                        text: `${c.name}'s eyes sharpen. "Actually, yes. I have something that just came in. Private sale. The seller is motivated." They pull out their phone and show you a photograph. "It's not on the market yet. Interested?"`,
                        choices: [
                            { label: 'Express interest (+2 Intel)', next: 'dealer_show', effect(s) { s.updateStat('intel', 2); } },
                            { label: 'Play it cool', next: 'end' },
                        ],
                    },
                    dealer_show: {
                        text: `They swipe through three images. A mid-career abstract, well-provenanced, priced below the last auction comp. "The seller doesn't want this going through a house. Too public. If you can close by Friday, it's yours."`,
                        choices: [{ label: "I'll think about it", next: 'end' }],
                    },
                    artist_work: {
                        text: `${c.name}'s face lights up. "I've been working on a new series. Bigger. More confrontational. The gallery hates it, obviously." They laugh. "But that's how you know it's good, right?"`,
                        choices: [
                            { label: 'Ask to see the studio (+2 Rep)', next: 'studio_invite', effect(s) { s.updateStat('reputation', 2); } },
                            { label: 'Wish them luck', next: 'end' },
                        ],
                    },
                    studio_invite: {
                        text: `"You know what? Come by the studio. Sunday. I'll show you the new stuff before anyone sees it." ${c.name} scribbles an address on a cocktail napkin. "Don't bring anyone."`,
                        choices: [{ label: 'Pocket the address', next: 'end' }],
                    },
                },
            };
        },
    },

    // ──────────────────────────────────────────
    // 2. Gallery Tour
    //    Parameterized walkthrough of any gallery.
    // ──────────────────────────────────────────
    gallery_tour: {
        id: 'gallery_tour',
        type: 'venue_encounter',
        category: 'reusable',
        params: ['venueId', 'galleryName'],
        optionalParams: { artistName: 'an emerging artist', artworkCount: 6 },
        tags: ['gallery', 'venue', 'art', 'social'],
        build(p) {
            return {
                id: `gallery_tour_${p.venueId}_${Date.now()}`,
                title: `${p.galleryName} — Opening Night`,
                nodes: {
                    start: {
                        text: `You push through the glass door into ${p.galleryName}. The crowd is thin but purposeful — collectors in dark linens, gallerists checking phones, an assistant making notes on a clipboard.\n\nThe show features ${p.artworkCount} works by ${p.artistName}. Track lighting pins each piece like a specimen. A price list sits face-down on the front desk.`,
                        choices: [
                            { label: '👀 Examine the main piece', next: 'inspect', effect(s) { s.updateStat('intel', 1); } },
                            { label: '📋 Check the price list', next: 'prices', condition(s) { return s.stats.intel >= 3; }, disabledLabel: 'Check the price list (Requires 3+ Intel)' },
                            { label: '🗣️ Talk to the gallery assistant', next: 'assistant' },
                            { label: '👋 Leave', next: 'end' },
                        ],
                    },
                    inspect: {
                        text: `You stand in front of the largest canvas. The brushwork is confident — almost aggressive. You notice the gallery card doesn't list a price. They never do. You'd have to ask, and asking changes the power dynamic.\n\nThe work has presence. Whether it has staying power is another question entirely.`,
                        choices: [
                            { label: 'Ask the assistant about availability', next: 'assistant' },
                            { label: 'Check the other works', next: 'browse', effect(s) { s.updateStat('intel', 1); } },
                            { label: 'Step outside for air', next: 'outside' },
                        ],
                    },
                    prices: {
                        text: `You flip the price list casually. ${p.artworkCount} works, ranging from $18,000 to $65,000. The two largest are already marked with red dots — sold before the opening. Pre-sale buyers. You're already late.`,
                        choices: [
                            { label: "Talk to the assistant about what's left", next: 'assistant' },
                            { label: 'Look more carefully at the unsold work', next: 'browse', effect(s) { s.updateStat('intel', 1); } },
                        ],
                    },
                    assistant: {
                        text: `The gallery assistant — all black, carefully neutral expression — greets you warmly enough. "Welcome. The artist is here tonight if you'd like an introduction. Several works are still available. Are you collecting, or just looking?"\n\nThe question is strategic. Your answer will determine how much attention you get.`,
                        choices: [
                            { label: '"Collecting. Tell me about the available pieces."', next: 'buying_mode', effect(s) { s.updateStat('reputation', 1); } },
                            { label: '"Just looking tonight."', next: 'browse' },
                        ],
                    },
                    buying_mode: {
                        text: `The assistant's demeanor shifts — subtly, but you notice. They pull out a separate sheet. "These three are available. The medium canvas just came off hold today — the previous buyer couldn't close. If you're interested, I can arrange a private viewing tomorrow."`,
                        choices: [
                            { label: 'Schedule the viewing', next: 'end' },
                            { label: 'Keep browsing', next: 'browse' },
                        ],
                    },
                    browse: {
                        text: `You work your way along the walls. Several pieces catch your eye. The work improves as you move deeper — the strongest pieces are furthest from the door. That's deliberate. The gallery wants you deep inside before showing you the best.`,
                        choices: [
                            { label: 'Head outside', next: 'outside' },
                            { label: 'Leave the gallery', next: 'end' },
                        ],
                    },
                    outside: {
                        text: `The night air resets you. Out here, the collectors who don't want to be seen talking are talking. A black car idles at the curb. Across the street, another gallery is also opening tonight — the art world's version of a block party.`,
                        choices: [
                            { label: 'Go back inside', next: 'start' },
                            { label: 'Head home', next: 'end' },
                        ],
                    },
                },
            };
        },
    },

    // ──────────────────────────────────────────
    // 3. Auction Event
    //    Bidding scene at any auction house.
    // ──────────────────────────────────────────
    auction_event: {
        id: 'auction_event',
        type: 'event',
        category: 'reusable',
        params: ['auctionHouse', 'lotTitle', 'lotArtist'],
        optionalParams: { estimateLow: 50000, estimateHigh: 100000, startingBid: 40000 },
        tags: ['auction', 'market', 'high-stakes'],
        build(p) {
            const est = `$${(p.estimateLow / 1000).toFixed(0)}K–$${(p.estimateHigh / 1000).toFixed(0)}K`;
            return {
                id: `auction_${Date.now()}`,
                title: `${p.auctionHouse} — Evening Sale`,
                nodes: {
                    start: {
                        text: `The auctioneer's voice fills the room. "Lot forty-seven. ${p.lotArtist}, '${p.lotTitle}.' Estimate ${est}. We'll start the bidding at $${(p.startingBid / 1000).toFixed(0)},000."\n\nA paddle goes up in the third row. Then another from the phone bank. The room tightens.`,
                        choices: [
                            { label: '🏏 Raise your paddle', next: 'bid_1' },
                            { label: '👀 Watch and wait', next: 'observe' },
                            { label: '📱 Bid by phone (anonymous)', next: 'phone_bid', condition(s) { return s.stats.intel >= 5; }, disabledLabel: 'Bid by phone (Requires 5+ Intel)' },
                        ],
                    },
                    bid_1: {
                        text: `You raise your paddle. The auctioneer catches it instantly. "New bidder, paddle seven-four-two." The price jumps. The collector in the third row turns to look at you. You feel the weight of the room.\n\nThe phone bank counters immediately. The price is climbing.`,
                        choices: [
                            { label: 'Stay in — raise again', next: 'bid_war', effect(s) { s.updateStat('audacity', 2); } },
                            { label: 'Drop out gracefully', next: 'drop_out' },
                        ],
                    },
                    bid_war: {
                        text: `Back and forth. You. The phone. You. The third-row collector drops out — you see the exact moment they give up, a slight shake of the head. Now it's just you and the invisible bidder on the phone.\n\nThe price is past the high estimate. The room is watching. This is the part where rational people stop.`,
                        choices: [
                            { label: 'One more bid — win it', next: 'win', effect(s) { s.updateStat('audacity', 3); } },
                            { label: 'Let it go', next: 'drop_out' },
                        ],
                    },
                    win: {
                        text: `"Selling once... selling twice... SOLD! To paddle seven-four-two." The gavel cracks. You own it. The room applauds politely — the art world's version of a standing ovation.\n\nYou paid above estimate. The advisors will say you overpaid. But you have the painting, and they don't. In three years, this price will look like a bargain. Or it won't. That's the game.`,
                        choices: [{ label: 'Head to the cashier', next: 'end' }],
                    },
                    drop_out: {
                        text: `You set your paddle down. The auctioneer's eyes skip past you without a pause — you're already forgotten. The phone bidder wins at just over estimate. The specialist looks relieved.\n\nSometimes the smartest move is the one you don't make.`,
                        choices: [{ label: 'Move on to the next lot', next: 'end' }],
                    },
                    observe: {
                        text: `You watch the bidding unfold. Two collectors go back and forth. The room reads the body language — one is sweating, the other is ice. Ice wins. Always.\n\nThe hammer price lands right at the high estimate. Textbook. You learn more watching than bidding.`,
                        choices: [
                            { label: 'Wait for the next lot', next: 'end', effect(s) { s.updateStat('intel', 2); } },
                        ],
                    },
                    phone_bid: {
                        text: `You slip out to the lobby and call the specialist line. "I'd like to bid on lot forty-seven. Anonymously, please." A pause, then: "Of course. We'll assign you to Phone Bank Seven. Your cover name is 'The Collector from Geneva.' Standard procedure."\n\nAnonymity is expensive. But so is everyone knowing what you buy.`,
                        choices: [
                            { label: 'Bid through the phone', next: 'bid_war', effect(s) { s.updateStat('intel', 1); } },
                            { label: 'Change your mind', next: 'drop_out' },
                        ],
                    },
                },
            };
        },
    },

    // ──────────────────────────────────────────
    // 4. Studio Visit
    //    Private visit to any artist's workspace.
    // ──────────────────────────────────────────
    studio_visit: {
        id: 'studio_visit',
        type: 'venue_encounter',
        category: 'reusable',
        params: ['artistNpcId'],
        optionalParams: { medium: 'painting', neighborhood: 'Bushwick' },
        tags: ['studio', 'artist', 'private', 'buying'],
        build(p) {
            const a = npc(p.artistNpcId);
            return {
                id: `studio_visit_${p.artistNpcId}_${Date.now()}`,
                title: `Studio Visit — ${a.name}`,
                nodes: {
                    start: {
                        text: `You find the address — an unmarked door in ${p.neighborhood}. A freight elevator takes you up to ${a.name}'s studio. The smell of ${p.medium === 'painting' ? 'turpentine and linseed oil' : 'fixative and raw materials'} hits you before the door opens.\n\n${a.name} is working. Or was working. They look up with the expression of someone interrupted mid-thought.`,
                        choices: [
                            { label: 'Apologize for the timing', next: 'apology', effect(s) { s.updateStat('reputation', 1); } },
                            { label: 'Ask about the work on the easel', next: 'current_work', effect(s) { s.updateStat('intel', 1); } },
                            { label: 'Look around the studio quietly', next: 'explore' },
                        ],
                    },
                    apology: {
                        text: `"No, no — I invited you." ${a.name} wipes their hands and smiles. "I work better when someone's watching, actually. Keeps me honest." They gesture around the space. "Look at whatever you want. There are no secrets here. Except the ones behind that curtain."`,
                        choices: [
                            { label: '...look behind the curtain', next: 'hidden_work', condition(s) { return s.stats.audacity >= 5; }, disabledLabel: 'Look behind the curtain (Requires 5+ Audacity)' },
                            { label: 'Explore the studio', next: 'explore' },
                        ],
                    },
                    current_work: {
                        text: `The canvas on the easel is enormous. Unfinished, but you can see where it's going. The energy is different from the gallery work — rawer, more aggressive. This is what they actually want to make, before the market softens the edges.\n\n"This one's not for sale," they say. Then, after a beat: "Probably."`,
                        choices: [
                            { label: 'Make an offer anyway', next: 'early_offer', effect(s) { s.updateStat('audacity', 2); } },
                            { label: 'Ask about the older work', next: 'explore' },
                        ],
                    },
                    explore: {
                        text: `The studio is a palimpsest of labor. Canvases lean against every wall. Some finished, some abandoned. A workbench overflows with materials. In the corner, a rack of older work is half-hidden by a drop cloth.\n\nThis archive is where the real value lives — the early-period work, before the prices inflated. If any of it's for sale, you're looking at below-market.`,
                        choices: [
                            { label: 'Ask about buying from the archive', next: 'archive_buy', effect(s) { s.updateStat('intel', 2); } },
                            { label: 'Head to the roof for a beer', next: 'roof' },
                        ],
                    },
                    hidden_work: {
                        text: `Behind the curtain: a series of twelve small works on paper. Intimate. Personal. Nothing like what the gallery shows. ${a.name} watches you carefully. "Those are... experiments. I don't know if they're good. The gallery hasn't seen them."\n\nYou're looking at potential. If this series ever shows, the early pieces will be worth a fortune.`,
                        choices: [
                            { label: 'Express genuine admiration (+3 Rep)', next: 'end', effect(s) { s.updateStat('reputation', 3); } },
                            { label: 'Ask the price', next: 'archive_buy' },
                        ],
                    },
                    archive_buy: {
                        text: `${a.name} hesitates. "The gallery takes 50% of everything. But these—" they gesture at the older work "—aren't under contract. If you want one, we can work something out. Directly." They name a price. It's fair. Maybe even generous.`,
                        choices: [
                            { label: 'Accept the price', next: 'end' },
                            { label: 'Try to negotiate', next: 'end', effect(s) { s.updateStat('audacity', 1); } },
                        ],
                    },
                    early_offer: {
                        text: `${a.name} looks surprised. Then amused. "You want to buy the unfinished painting. Off the easel. Before anyone's seen it." A long pause. "That's either incredibly smart or incredibly stupid. I respect both."\n\nThey name a number. It's high — but for a piece no one else has seen, it might be the deal of the year.`,
                        choices: [
                            { label: 'Take the deal', next: 'end' },
                            { label: 'Think it over', next: 'end' },
                        ],
                    },
                    roof: {
                        text: `On the roof, the Manhattan skyline glitters in the distance. ${a.name} hands you a beer. Up here, the conversation changes. It stops being about the work and becomes about the life.\n\n"Sometimes I wonder if I should just teach," they say. "Make art on weekends. Stop playing the game." They take a drink. "But I can't. The game is the only thing that proves the art matters."`,
                        choices: [
                            { label: '"The art matters regardless."', next: 'end', effect(s) { s.updateStat('reputation', 2); } },
                            { label: '"The game is what pays the rent."', next: 'end', effect(s) { s.updateStat('intel', 1); } },
                        ],
                    },
                },
            };
        },
    },

    // ──────────────────────────────────────────
    // 5. Cocktail Party Encounter
    //    Parameterized social event with
    //    eavesdropping opportunities.
    // ──────────────────────────────────────────
    cocktail_party: {
        id: 'cocktail_party',
        type: 'event',
        category: 'reusable',
        params: ['hostName', 'location'],
        optionalParams: { guestNpcIds: [], exclusivity: 'moderate' },
        tags: ['social', 'networking', 'eavesdrop'],
        build(p) {
            const guests = (p.guestNpcIds || []).map(id => npc(id));
            const guestList = guests.length > 0
                ? guests.map(g => g.name).join(', ') + ' — among others'
                : 'The usual suspects';

            return {
                id: `cocktail_${Date.now()}`,
                title: `Cocktail Party — ${p.location}`,
                nodes: {
                    start: {
                        text: `${p.hostName}'s apartment. ${p.location}. The elevator opens directly into the foyer — marble, peonies, a painting by the coat check that costs more than most apartments.\n\nInside, twenty people navigate the space between conversation and commerce. Tonight's guest list: ${guestList}.`,
                        choices: [
                            { label: 'Work the room', next: 'mingle', effect(s) { s.updateStat('reputation', 1); } },
                            { label: 'Find the bar first', next: 'bar' },
                            { label: 'Look at the art collection', next: 'collection', effect(s) { s.updateStat('intel', 1); } },
                        ],
                    },
                    mingle: {
                        text: `You circulate. Handshakes, air kisses, the careful exchange of business cards. Everyone is performing a version of themselves. You learn to read the performances — who's buying, who's selling, who's bluffing.\n\nA collector pulls you aside. "Stay away from the emerging tier this quarter. Trust me."`,
                        choices: [
                            { label: 'Press for specifics (+2 Intel)', next: 'intel_drop', effect(s) { s.updateStat('intel', 2); } },
                            { label: 'Head to the terrace', next: 'terrace' },
                        ],
                    },
                    bar: {
                        text: `The bartender pours you something excellent without asking what you want. That's the caliber of party this is. At the bar, you overhear fragments — prices, names, grudges.`,
                        choices: [
                            { label: 'Eavesdrop on the two dealers', next: 'eavesdrop', condition(s) { return s.stats.intel >= 4; }, disabledLabel: 'Eavesdrop (Requires 4+ Intel)' },
                            { label: 'Join the main conversation', next: 'mingle' },
                        ],
                    },
                    collection: {
                        text: `The walls are extraordinary. Museum-quality pieces hung with the casual confidence of someone who doesn't need to prove anything. You study the collection like a code — each piece reveals something about the collector's strategy, taste, and ego.`,
                        choices: [
                            { label: 'Ask the host about a specific piece', next: 'host_talk', effect(s) { s.updateStat('reputation', 1); } },
                            { label: 'Keep browsing', next: 'mingle' },
                        ],
                    },
                    eavesdrop: {
                        text: `"...the Tanaka estate is liquidating. Everything. Twenty-two pieces. Some extraordinary, some not. They want it done before tax year ends."\n\n"How reliable is this?"\n\n"My source is the lawyer."`,
                        choices: [
                            { label: 'Store this intel (+3 Intel)', next: 'mingle', effect(s) { s.updateStat('intel', 3); } },
                        ],
                    },
                    intel_drop: {
                        text: `The collector glances around, then lowers their voice. "Three galleries are about to raise emerging-tier prices 30-40%. It's coordinated. If you're going to buy, buy now. Before the VIP preview at Basel." They tap the side of their nose.`,
                        choices: [{ label: 'Thank them and circulate', next: 'terrace' }],
                    },
                    host_talk: {
                        text: `${p.hostName} brightens when you ask about the art. "You noticed the placement? Most people look at the Rothko first — it's the obvious power piece. But the real gem is the small drawing by the kitchen. I bought it for nothing in '98. It's worth more than the Rothko now."\n\nThis is how wealth works. It hides in plain sight.`,
                        choices: [{ label: 'Continue the evening', next: 'terrace' }],
                    },
                    terrace: {
                        text: `The terrace. Cold air, bridge lights, and the kind of honesty that only happens thirty floors up. Out here, people say what they actually think.\n\nYou lean on the railing. The city spreads out below like a circuit board. Somewhere in those lights, your next deal is waiting.`,
                        choices: [
                            { label: 'Enjoy the view and leave', next: 'end' },
                            { label: 'Stay for one more conversation', next: 'mingle' },
                        ],
                    },
                },
            };
        },
    },

    // ──────────────────────────────────────────
    // 6. Market Event Reaction
    //    Triggered by MarketEventBus events.
    //    Provides narrative context for
    //    mechanical events (forgery, death, etc.)
    // ──────────────────────────────────────────
    market_event_reaction: {
        id: 'market_event_reaction',
        type: 'cutscene',
        category: 'reusable',
        params: ['eventType', 'artistName'],
        optionalParams: { magnitude: 'moderate', npcReactorId: null },
        tags: ['event', 'market', 'narrative'],
        build(p) {
            const reactor = p.npcReactorId ? npc(p.npcReactorId) : null;
            const headlines = {
                artist_death: `BREAKING: ${p.artistName} Dies — Market Braces for Impact`,
                forgery_discovery: `SCANDAL: Forgeries Discovered in ${p.artistName} Catalogue`,
                museum_acquisition: `${p.artistName} Work Acquired by Major Museum`,
                biennial_selection: `${p.artistName} Selected for Venice Biennale`,
                gallery_fire: `DISASTER: Fire Destroys Works at ${p.artistName} Gallery`,
                record_auction: `${p.artistName} Sets New Auction Record`,
                market_correction: `Market Correction Hits ${p.artistName} Tier`,
            };

            const headline = headlines[p.eventType] || `News: ${p.eventType.replace(/_/g, ' ')} — ${p.artistName}`;

            return {
                id: `event_reaction_${p.eventType}_${Date.now()}`,
                title: headline,
                nodes: {
                    start: {
                        text: `Your phone buzzes. Then buzzes again. Then doesn't stop.\n\n**${headline}**\n\n${reactor ? `${reactor.name} calls you immediately. "Have you seen this? This changes everything."` : 'The art world is reacting in real-time. Your Bloomberg terminal is lighting up.'}`,
                        choices: [
                            { label: 'Check the Bloomberg Terminal', next: 'terminal' },
                            ...(reactor ? [{ label: `Talk to ${reactor.name}`, next: 'react' }] : []),
                            { label: 'Process this quietly', next: 'end' },
                        ],
                    },
                    terminal: {
                        text: `The terminal confirms it. Prices are ${['artist_death', 'museum_acquisition', 'biennial_selection', 'record_auction'].includes(p.eventType) ? 'spiking' : 'cratering'}. The order book is chaos — ${['artist_death', 'forgery_discovery', 'gallery_fire'].includes(p.eventType) ? 'panic selling everywhere' : 'everyone trying to buy at once'}.\n\nThis is either an opportunity or a disaster. The difference is timing.`,
                        choices: [{ label: 'Make your move', next: 'end' }],
                    },
                    react: {
                        text: `"Listen," ${reactor.name} says, "I've been through these before. The market overreacts. It always overreacts. The question is: do you have the nerve to ${['forgery_discovery', 'gallery_fire', 'market_correction'].includes(p.eventType) ? 'buy when everyone is selling' : 'hold when everyone is buying'}?"\n\nThey're right. But knowing and doing are different things.`,
                        choices: [{ label: 'End the call', next: 'end' }],
                    },
                },
            };
        },
    },
};

// ══════════════════════════════════════════════════════════════
// Template Resolver — inflates a template with parameters
// ══════════════════════════════════════════════════════════════

/**
 * Resolve a scene template into a concrete scene object.
 *
 * @param {string} templateId — key from SCENE_TEMPLATES
 * @param {Object} params — required + optional parameters
 * @returns {Object|null} — inflated scene compatible with DialogueEngine
 */
export function resolveTemplate(templateId, params = {}) {
    const template = SCENE_TEMPLATES[templateId];
    if (!template) {
        console.warn(`[SceneTemplates] Unknown template: ${templateId}`);
        return null;
    }

    // Validate required params
    for (const req of template.params) {
        if (params[req] === undefined) {
            console.warn(`[SceneTemplates] Missing required param '${req}' for template '${templateId}'`);
            return null;
        }
    }

    // Merge with optional defaults
    const merged = { ...template.optionalParams, ...params };

    // Build the scene
    return template.build(merged);
}

/**
 * Get all available templates, optionally filtered by tag or category.
 *
 * @param {Object} [filter] — { tag: string, category: string, type: string }
 * @returns {Array} — array of template metadata (without build functions)
 */
export function getTemplateList(filter = {}) {
    return Object.values(SCENE_TEMPLATES)
        .filter(t => {
            if (filter.tag && !t.tags.includes(filter.tag)) return false;
            if (filter.category && t.category !== filter.category) return false;
            if (filter.type && t.type !== filter.type) return false;
            return true;
        })
        .map(t => ({
            id: t.id,
            type: t.type,
            category: t.category,
            params: t.params,
            optionalParams: Object.keys(t.optionalParams || {}),
            tags: t.tags,
        }));
}
