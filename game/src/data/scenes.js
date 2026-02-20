/**
 * scenes.js
 * Definitions for Narrative Scenes and Dialogue Trees
 */

import { GameState } from '../managers/GameState.js';
import { MarketManager } from '../managers/MarketManager.js';
import { PhoneManager } from '../managers/PhoneManager.js';

export const SCENES = [
    {
        id: 'debug_dinner',
        title: 'Dinner at Balthazar',
        nodes: {
            start: {
                text: (s) => `You sit down at a corner booth with your contact. The wine flows, and the conversation turns to the current market (${s.marketState.toUpperCase()}).`,
                choices: [
                    {
                        label: 'Talk about recent auctions (+2 Intel)',
                        next: 'talk_intel',
                        effect: (s) => s.intel += 2
                    },
                    {
                        label: 'Flex your collection strength (+3 Rep)',
                        condition: (s) => s.portfolio.length > 5,
                        disabledLabel: 'Flex your collection (Requires 6+ works)',
                        next: 'flex_collection',
                        effect: (s) => s.reputation += 3
                    },
                    {
                        label: 'Complain about gallery waitlists (-1 Rep)',
                        next: 'complain',
                        effect: (s) => s.reputation -= 1
                    }
                ]
            },
            talk_intel: {
                text: '"Did you see the latest Yoshihara result? Madness."\n\nThey lean in and whisper some off-the-record rumors about a major private collection being quietly liquidated.',
                choices: [
                    { label: 'Order desert and leave', next: 'end' }
                ]
            },
            flex_collection: {
                text: 'You casually mention the pieces you just moved into deep storage. They nod, clearly impressed by your capital constraints.',
                choices: [
                    { label: 'End the night on a high note', next: 'end' }
                ]
            },
            complain: {
                text: 'They give you a tight smile. "We all have to wait our turn." The rest of the dinner is somewhat tense.',
                choices: [
                    { label: 'Pay the bill and depart', next: 'end' }
                ]
            }
        }
    },
    {
        id: 'gallery_opening',
        title: 'Gallery Opening — Chelsea',
        nodes: {
            start: {
                text: "You push through the heavy glass door into the hum of an opening night. Someone hands you a plastic cup of wine before you've even looked at the art. The gallery is a converted warehouse — track lighting pins each painting like a specimen.",
                choices: [
                    { label: 'Look around the Main Floor', next: 'main_floor' }
                ]
            },
            main_floor: {
                text: "Main Gallery Floor\n\nThe crowd is thin but curated: collectors in dark linens, a few gallerists checking phones, an artist hiding in the corner. Three large canvases dominate the east wall. A laminated price list sits face-down on the front desk.",
                choices: [
                    {
                        label: '👀 Inspect the large canvas (+1 Intel)',
                        next: 'main_inspect_canvas',
                        effect: (s) => s.intel += 1
                    },
                    {
                        label: '📋 Flip over the price list (Requires 3+ Intel)',
                        condition: (s) => s.intel >= 3,
                        disabledLabel: 'Flip over the price list (Requires 3+ Intel)',
                        next: 'main_inspect_prices'
                    },
                    {
                        label: '🗣️ Eavesdrop on two dealers (Requires 5+ Intel)',
                        condition: (s) => s.intel >= 5,
                        disabledLabel: 'Eavesdrop on two dealers (Requires 5+ Intel)',
                        next: 'main_eavesdrop',
                        effect: (s) => s.intel += 2
                    },
                    { label: '🚪 Go outside for air', next: 'street' },
                    {
                        label: '🔒 Enter the Private Backroom (Requires 40+ Rep)',
                        condition: (s) => s.reputation >= 40,
                        disabledLabel: 'Enter the Private Backroom (Requires 40+ Rep)',
                        next: 'backroom'
                    },
                    { label: '👋 Leave the gallery', next: 'end' }
                ]
            },
            main_inspect_canvas: {
                text: "A six-foot canvas in thick impasto. The brushwork is confident — almost aggressive. The gallery card reads 'Untitled (Meridian), 2025. Oil on linen. 72 × 60 in.' No price visible. They never put the price where you can see it.",
                choices: [{ label: 'Back to the room', next: 'main_floor' }]
            },
            main_inspect_prices: {
                text: "You flip it over casually. Six works, ranging from $18,000 to $65,000. The two largest are already marked with red dots — sold before the opening even started. Presale buyers. You're already late.",
                choices: [{ label: 'Back to the room', next: 'main_floor' }]
            },
            main_eavesdrop: {
                text: "\"…heard the Tanaka estate is liquidating. Everything. They want it done before the tax year ends.\"\n\"How many pieces?\"\n\"Twenty-two. Some of it is extraordinary. Some of it... isn't.\"\n\n(Gained +2 Intel)",
                choices: [{ label: 'Back to the room', next: 'main_floor' }]
            },
            street: {
                text: "West 24th Street\n\nThe night air hits you like a reset button. Out here, the collectors who don't want to be seen talking are talking. Three people smoke on the sidewalk. Across the street, another gallery is also opening tonight. A black Escalade idles at the curb.",
                choices: [
                    {
                        label: '🗑️ Check discarded flyer on ground',
                        next: 'street_flyer',
                        effect: (s) => s.intel += 1
                    },
                    {
                        label: '🗣️ Eavesdrop on smokers (Requires 3+ Intel)',
                        condition: (s) => s.intel >= 3,
                        disabledLabel: 'Eavesdrop on smokers (Requires 3+ Intel)',
                        next: 'street_eavesdrop',
                        effect: (s) => s.intel += 2
                    },
                    { label: '🚪 Go back inside', next: 'main_floor' },
                    { label: '👋 Leave the area', next: 'end' }
                ]
            },
            street_flyer: {
                text: "A glossy flyer for next month's show at the gallery across the street. The artist's name jumps out — you've heard whispers. Early career, massive Instagram following, no auction record yet. Could be the next breakout.\n\n(Gained +1 Intel)",
                choices: [{ label: 'Back to the street', next: 'street' }]
            },
            street_eavesdrop: {
                text: "\"…yeah, I'm at the opening. The work is fine. Not great, not bad. But the backroom stuff? That's where the action is. If you can get in, there's a Richter study they haven't shown anyone. She's asking one-twenty for it.\"\n\n(Gained +2 Intel)",
                choices: [{ label: 'Back to the street', next: 'street' }]
            },
            backroom: {
                text: "The Backroom\n\nThe door closes behind you and the noise drops to a murmur. In here, the air smells like wood polish and money. No track lighting — just a warm lamp on an oak desk. The walls hold three paintings — museum-quality, and definitely not for sale tonight. Or maybe they are, if you're the right person.",
                choices: [
                    {
                        label: '📁 Inspect the leather portfolio',
                        next: 'backroom_portfolio',
                        effect: (s) => s.intel += 3
                    },
                    {
                        label: '🗣️ Listen at the gallery owner\'s office door (Requires 7+ Intel)',
                        condition: (s) => s.intel >= 7,
                        disabledLabel: 'Listen at office door (Requires 7+ Intel)',
                        next: 'backroom_owner_call',
                        effect: (s) => s.intel += 2
                    },
                    { label: '🚪 Return to main floor', next: 'main_floor' }
                ]
            },
            backroom_portfolio: {
                text: "Inside: 35mm transparencies of twelve works. Some by the artist showing tonight, others by bigger names. The portfolio is the gallery's private inventory. Seeing it is a privilege. The prices penciled in the margins are... ambitious.\n\n(Gained +3 Intel)",
                choices: [{ label: 'Back to the room', next: 'backroom' }]
            },
            backroom_owner_call: {
                text: "\"…tell them the price is firm. If they want the secondary market piece, they buy the primary work first. That's the deal. Package or nothing.\"\nA pause. \"I don't care what London is offering. This isn't London.\"\n\n(Gained +2 Intel)",
                choices: [{ label: 'Back to the room', next: 'backroom' }]
            }
        }
    },
    {
        id: 'cocktail_party',
        title: 'Cocktail Party — Upper East Side',
        nodes: {
            start: {
                text: "The elevator doors open and you step into a world that smells like expensive candles and old money. Somewhere inside, someone laughs — the kind of laugh that costs $10,000 a year in social maintenance.",
                choices: [
                    { label: 'Step into the Foyer', next: 'foyer' }
                ]
            },
            foyer: {
                text: "The Foyer\n\nThe foyer is larger than most Manhattan studios: Carrara marble floors, a console table with peonies, and a genuine Warhol dollar sign painting hung casually by the coat rack. A young woman takes your coat.",
                choices: [
                    {
                        label: '👀 Inspect the Warhol (+1 Intel)',
                        next: 'foyer_warhol',
                        effect: (s) => s.intel += 1
                    },
                    {
                        label: '👀 Check the business cards (+1 Intel)',
                        next: 'foyer_cards',
                        effect: (s) => s.intel += 1
                    },
                    { label: '🚶 Walk into the Living Room', next: 'living_room' }
                ]
            },
            foyer_warhol: {
                text: "A genuine Warhol. Dollar signs in acid green and pink on a black ground. Worth somewhere between $300K and $800K depending on the day. They hung it by the coats. That's a very specific kind of message.\n\n(Gained +1 Intel)",
                choices: [{ label: 'Back to the Foyer', next: 'foyer' }]
            },
            foyer_cards: {
                text: "A neat stack of business cards in a silver tray. Art advisors, private wealth managers, a foundation director. The social registry of tonight's event.\n\n(Gained +1 Intel)",
                choices: [{ label: 'Back to the Foyer', next: 'foyer' }]
            },
            living_room: {
                text: "The Living Room\n\nFloor-to-ceiling windows frame the East River. But nobody is looking at the view; they're looking at the walls. A de Kooning, a Basquiat, Richard Serras, and a late Rothko hung above the fireplace. Twenty people mill about in clusters, drinks in hand.",
                choices: [
                    {
                        label: '👀 Examine the Rothko (+1 Rep)',
                        next: 'living_rothko',
                        effect: (s) => s.reputation += 1
                    },
                    {
                        label: '🗣️ Eavesdrop on the Art Advisor (Requires 6+ Intel)',
                        condition: (s) => s.intel >= 6,
                        disabledLabel: 'Eavesdrop on Art Advisor (Requires 6+ Intel)',
                        next: 'living_eavesdrop',
                        effect: (s) => s.intel += 3
                    },
                    { label: '🚪 Go out to the Terrace', next: 'terrace' },
                    {
                        label: '🔒 Enter the Private Study (Requires 8+ Intel or 5+ Host Favor)',
                        // Simplified condition for now: 8+ Intel 
                        condition: (s) => s.intel >= 8,
                        disabledLabel: 'Enter the Private Study (Requires 8+ Intel)',
                        next: 'study'
                    },
                    { label: '🚪 Return to the Foyer', next: 'foyer' }
                ]
            },
            living_rothko: {
                text: "The maroon field breathes — it actually seems to pulse when you let your eyes go soft. A $25 million painting hung above a fireplace in a private home. Some call it a crime. Others call it the whole point.\n\n(Gained +1 Reputation)",
                choices: [{ label: 'Back to the Living Room', next: 'living_room' }]
            },
            living_eavesdrop: {
                text: "\"…no, tell them we're passing. The provenance has a gap between '74 and '89 and nobody can explain it. I don't care how good the price is... Yes, permanently. Someone will buy it, and they'll regret it.\"\n\n(Gained +3 Intel)",
                choices: [{ label: 'Back to the Living Room', next: 'living_room' }]
            },
            terrace: {
                text: "The Terrace\n\nThe cold air slaps you awake. Thirty floors up, Manhattan looks like a spreadsheet made of light. Out here, people say things they'd never say inside.",
                choices: [
                    {
                        label: '👀 Pick up abandoned cocktail napkin',
                        next: 'terrace_napkin',
                        effect: (s) => s.intel += 1
                    },
                    {
                        label: '🗣️ Eavesdrop on two figures (Requires 5+ Intel)',
                        condition: (s) => s.intel >= 5,
                        disabledLabel: 'Eavesdrop on figures (Requires 5+ Intel)',
                        next: 'terrace_eavesdrop',
                        effect: (s) => s.intel += 2
                    },
                    { label: '🚪 Walk to the Hallway', next: 'hallway' },
                    { label: '🚪 Return to Living Room', next: 'living_room' }
                ]
            },
            terrace_napkin: {
                text: "A cocktail napkin with a phone number and two words written in blue ink: 'CALL MONDAY.' No name. Someone made a deal tonight.\n\n(Gained +1 Intel)",
                choices: [{ label: 'Back to the Terrace', next: 'terrace' }]
            },
            terrace_eavesdrop: {
                text: "\"…I need to move the Hirst by end of quarter. My accountant says if I don't realize the loss this year...\"\n\"How much are you willing to lose?\"\n\"Forty percent. Maybe fifty. I just need it gone.\"\n\n(Gained +2 Intel)",
                choices: [{ label: 'Back to the Terrace', next: 'terrace' }]
            },
            hallway: {
                text: "The Hallway\n\nThe corridor connects the terrace to the private wing. Three unsettling self-portraits on the wall. A coat closet is slightly ajar. At the end, the door to the study.",
                choices: [
                    {
                        label: '👀 Check the coat closet (Requires 5+ Intel)',
                        condition: (s) => s.intel >= 5,
                        disabledLabel: 'Check the coat closet (Requires 5+ Intel)',
                        next: 'hallway_closet',
                        effect: (s) => s.intel += 3
                    },
                    {
                        label: '🔒 Enter the Private Study (Requires 8+ Intel)',
                        condition: (s) => s.intel >= 8,
                        disabledLabel: 'Enter the Private Study (Requires 8+ Intel)',
                        next: 'study'
                    },
                    { label: '🚪 Return to Terrace', next: 'terrace' }
                ]
            },
            hallway_closet: {
                text: "Inside: Wedged behind a garment bag — a small painting in a padded sleeve. Unframed. Someone stashed this here recently. It's by the same artist showing at the Chelsea gallery tonight. Why hidden?\n\n(Gained +3 Intel)",
                choices: [{ label: 'Back to the Hallway', next: 'hallway' }]
            },
            study: {
                text: "The Study\n\nThe inner sanctum. Leather, lamplight, and the art he doesn't show anyone. Behind the desk, resting on a museum-grade easel: a late period Cy Twombly. The host is sitting in a club chair. 'You found it,' he says. 'Good. Sit down.'\n\n(Gained +3 Reputation)",
                choices: [
                    {
                        label: '👀 Read the ledger on the desk (Requires 6+ Intel)',
                        condition: (s) => s.intel >= 6,
                        disabledLabel: 'Read the ledger (Requires 6+ Intel)',
                        next: 'study_ledger',
                        effect: (s) => s.intel += 5
                    },
                    { label: '🚪 Return to the Party (Leave)', next: 'end' } // Ending the event with high reputation
                ]
            },
            study_ledger: {
                text: "The host's private collection ledger. He tracks everything.\n\n• de Kooning Woman III — $640K (1998) → $5.2M\n• Rothko — $4.2M (2005) → $25M\n• Twombly — $120K (1994) → $8.5M\n\nThis man turned $6 million into $56 million by buying what he loved. Taste as a superpower.\n\n(Gained +5 Intel)",
                choices: [{ label: 'Leave the study', next: 'end' }]
            }
        }
    }
];

// Initialize scenes in the DialogueEngine
import { DialogueEngine } from '../managers/DialogueEngine.js';
SCENES.forEach(scene => DialogueEngine.registerScene(scene));
