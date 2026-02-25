/**
 * Room & Venue data for ArtLife
 * Converted from markdown venue files in 05_World/Rooms/
 * Schema: 05_World/Room_Schema.md
 *
 * Venue shape:
 *   id, name, desc, startRoom, timeLimit, availableWeeks, frequency, requires, rooms[]
 *
 * Room shape:
 *   id          — unique room identifier
 *   venue       — parent venue id
 *   name, desc  — display name and short description for HUD
 *   look        — longer narrative text for LOOK command
 *   tiledMap    — (optional) Tiled JSON map key; if present, uses visual Tiled mode
 *   items[]     — interactable objects { name, desc, isTakeable, requires, onLook, onTake }
 *   characters[]— NPCs present { id, desc, topics[], requires }
 *   exits[]     — room transitions { dir, id, label, block, requires }
 *   eavesdrops[]— overheard dialogue { id, desc, content, effects, requires, unlocks, oneShot }
 *   onEnter     — { firstVisitOnly, text, effects } triggered on room entry
 *   timeCost    — action points spent entering this room (default 1)
 *   tags[]      — metadata tags for filtering/search
 *
 * Requirement objects (used in exits, items, characters, eavesdrops):
 *   { stat: { min: N, max: N } }              — scalar stat gate
 *   { 'npcFavor.npc_id': { min: N } }         — dotted-path NPC favor
 *   { npcFavor: { npc_id: { min: N } } }      — nested object NPC favor
 *   { OR: [ {req1}, {req2} ] }                — pass if ANY sub-requirement met
 *
 * Exports: VENUES (array), ROOM_MAP (flat room lookup), VENUE_MAP (venue lookup)
 */

// ─────────────────────────────────────────────
// VENUE 1: GALLERY OPENING — Chelsea, New York
// Source: 05_World/Rooms/Gallery_Opening.md
// ─────────────────────────────────────────────

const GALLERY_OPENING = {
    id: 'gallery_opening',
    name: 'Gallery Opening — Chelsea',
    desc: 'A converted warehouse in West Chelsea. Tonight\'s the opening.',
    startRoom: 'chelsea_main_floor',
    timeLimit: 5,
    availableWeeks: 'any',
    frequency: 'every 3-6 weeks',
    requires: null,
    rooms: [
        {
            id: 'chelsea_main_floor',
            venue: 'gallery_opening',
            name: 'Main Gallery Floor',
            desc: 'Polished concrete. Track lighting. Wine in plastic cups.',
            look: 'The gallery is a converted warehouse — 4,000 square feet of polished concrete and exposed ductwork. Track lighting pins each painting like a specimen. The crowd is thin but curated: collectors in dark linens, a few gallerists checking phones, an artist hiding in the corner pretending not to watch who looks at what. The wine is cheap. The art isn\'t.\n\nThree large canvases dominate the east wall. A laminated price list sits face-down on the front desk — you\'d have to ask for it, or know where to look.',
            items: [
                { name: 'large canvas — east wall', desc: 'A six-foot canvas in thick impasto. The brushwork is confident — almost aggressive. The gallery card reads \'Untitled (Meridian), 2025. Oil on linen. 72 × 60 in.\' No price visible. They never put the price where you can see it.', isTakeable: false, onLook: null },
                { name: 'laminated price list', desc: 'You flip it over casually. Six works, ranging from $18,000 to $65,000. The two largest are already marked with red dots — sold before the opening even started. Presale buyers. You\'re already late.', isTakeable: false, requires: { intel: { min: 3 } }, onLook: { intel: 1 } },
                { name: 'gallery guest book', desc: 'Open to tonight\'s page. Twelve names so far. You recognize three: a hedge fund collector from Greenwich, a curator from the New Museum, and — interestingly — a name that\'s been in the news for all the wrong reasons. Someone\'s doing due diligence. Or covering their tracks.', isTakeable: false, onLook: { intel: 1 } },
                { name: 'half-empty wine glass', desc: 'Someone abandoned a glass of Sancerre on the windowsill. A lipstick print on the rim. You\'re not here for the wine.', isTakeable: false, onLook: null },
            ],
            characters: [
                { id: 'elena_ross', desc: 'Elena Ross is here, near the east wall. She\'s holding a glass of white wine she isn\'t drinking — just gripping it like a prop. Her eyes are on the largest canvas, but her attention is elsewhere.', topics: ['nomura_triptych', 'market_sentiment', 'business_proposal'], requires: null },
                { id: 'gallery_assistant', desc: 'A young gallery assistant in all black stands by the desk, visibly trying to appear busy. She\'s the one to ask about pricing, availability, and whether the artist is actually here tonight.', topics: ['pricing', 'artist_info', 'upcoming_shows'], requires: null },
            ],
            exits: [
                { dir: 'back', id: 'chelsea_backroom', label: 'Slip through the door marked \'Private\'', block: 'The door is marked \'Private.\' A gallerist catches your eye and shakes her head — barely perceptible. You\'d need more weight in this room to get through that door.', requires: { reputation: { min: 40 } } },
                { dir: 'upstairs', id: 'chelsea_storage', label: 'Take the freight elevator to storage', block: 'The freight elevator has a keypad. You don\'t have the code. Yet.', requires: { npcFavor: { gallery_owner: { min: 8 } } } },
                { dir: 'out', id: 'chelsea_street', label: 'Step outside', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'dealer_tanaka_whisper', desc: 'Two dealers murmuring by the wine table, leaning in close', requires: { intel: { min: 5 } }, content: '"...heard the Tanaka estate is liquidating. Everything. They want it done before the tax year ends."\n"How many pieces?"\n"Twenty-two. Some of it is extraordinary. Some of it... isn\'t."', effects: { intel: 2 }, unlocks: 'tanaka_estate_tip', oneShot: true },
                { id: 'collector_gossip', desc: 'A collector talking too loudly on his phone by the bathroom', requires: { intel: { min: 2 } }, content: '"—no, I\'m telling you, the Nomura show at Pace is going to change everything. MoMA is already circling. If you don\'t own one by March, you won\'t be able to afford one by June."', effects: { intel: 1 }, unlocks: null, oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'You push through the heavy glass door into the hum of an opening night. Someone hands you a plastic cup of wine before you\'ve even looked at the art.', effects: null },
            timeCost: 0,
            tags: ['social', 'gallery', 'new-york', 'start'],
        },
        {
            id: 'chelsea_backroom',
            venue: 'gallery_opening',
            name: 'The Backroom',
            desc: 'Smaller, quieter. The good chairs.',
            look: 'The backroom is a different country. No track lighting — just a single warm lamp on an oak desk. Two Eames chairs face each other across a low table with a bottle of actual wine, not the stuff they\'re pouring out front. The walls hold three paintings — small, museum-quality, and definitely not for sale tonight. Or maybe they are, if you\'re the right person asking the right way.\n\nA leather portfolio sits open on the desk. Inside: transparencies of works not yet photographed for the website. The next show, maybe. Or the private holdings they don\'t advertise.',
            items: [
                { name: 'leather portfolio', desc: 'Inside: 35mm transparencies of twelve works. Some are by the same artist showing tonight. Others are by names you recognize — bigger names. The portfolio is the gallery\'s private inventory. Seeing it is a privilege. The prices penciled in the margins are... ambitious.', isTakeable: false, requires: null, onLook: { intel: 3 } },
                { name: 'framed photograph on the desk', desc: 'A snapshot of the gallery owner with two collectors at what looks like Art Basel Miami, 2019. One of the collectors is your rival. They\'re laughing. That\'s useful information.', isTakeable: false, onLook: { intel: 1 } },
                { name: 'bottle of Châteauneuf-du-Pape', desc: '2018. Already open. Two glasses poured, one barely touched. Someone left in a hurry.', isTakeable: false, onLook: null },
            ],
            characters: [
                { id: 'philippe_noir', desc: 'Philippe Noir is seated in the far Eames chair, legs crossed, reading something on his phone with an expression that could be amusement or contempt. Difficult to tell with Philippe.', topics: ['backroom_deal', 'market_manipulation', 'gallery_politics'], requires: null },
            ],
            exits: [
                { dir: 'out', id: 'chelsea_main_floor', label: 'Return to the main gallery', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'gallery_owner_phone', desc: 'The gallery owner\'s voice, muffled, from behind a closed office door', requires: { intel: { min: 7 } }, content: '"...tell them the price is firm. If they want the secondary market piece, they buy the primary work first. That\'s the deal. Package or nothing."\n\nA pause.\n\n"I don\'t care what London is offering. This isn\'t London."', effects: { intel: 2 }, unlocks: 'packaging_deal_intel', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'The door closes behind you and the noise of the opening drops to a murmur. In here, the air smells like wood polish and money.', effects: null },
            timeCost: 1,
            tags: ['private', 'gallery', 'high-access'],
        },
        {
            id: 'chelsea_street',
            venue: 'gallery_opening',
            name: 'West 24th Street',
            desc: 'Cool night air. Smokers and phone calls.',
            look: 'West 24th between Tenth and Eleventh. The gallery\'s glass front glows behind you. Out here, the collectors who don\'t want to be seen talking are talking. Three people smoke on the sidewalk — real cigarettes, not the electronic kind, because this crowd is contrarian about everything.\n\nAcross the street, another gallery is also opening tonight. You can see the crowd through the windows. The art world\'s version of a block party, except nobody\'s having fun. They\'re all working.\n\nA black car idles at the curb. Someone important is either arriving or leaving.',
            items: [
                { name: 'discarded exhibition flyer', desc: 'A glossy flyer for next month\'s show at the gallery across the street. The artist\'s name jumps out — you\'ve heard whispers about this one. Early career, Instagram following in the hundreds of thousands, no auction record yet. Could be the next breakout. Could be nothing.', isTakeable: true, onTake: { intel: 1 }, onLook: null },
                { name: 'the black car', desc: 'A matte-black Escalade with tinted windows. The driver is reading a newspaper — a physical newspaper. Whoever\'s inside is either obscenely rich or professionally paranoid. Both, probably.', isTakeable: false, onLook: null },
            ],
            characters: [
                { id: 'smoking_collector', desc: 'A collector you vaguely recognize from auction previews is smoking alone, scrolling his phone with one hand.', topics: ['auction_tips', 'tonight_show', 'market_rumors'], requires: null },
            ],
            exits: [
                { dir: 'in', id: 'chelsea_main_floor', label: 'Go back inside', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'smoking_phone_call', desc: 'One of the smokers is on the phone, voice carrying in the cold air', requires: { intel: { min: 3 } }, content: '"—yeah, I\'m at the opening. The work is fine. Not great, not bad. But the backroom stuff? That\'s where the action is. If you can get in, there\'s a Richter study they haven\'t shown anyone. Small, but pedigreed. She\'s asking one-twenty for it."', effects: { intel: 2 }, unlocks: 'richter_study_lead', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'The night air hits you like a reset button. Chelsea in the evening — all concrete and taxi lights.', effects: null },
            timeCost: 1,
            tags: ['outdoor', 'social', 'new-york'],
        },
        {
            id: 'chelsea_storage',
            venue: 'gallery_opening',
            name: 'Storage — Upper Level',
            desc: 'Freight elevator. Climate-controlled. The works they don\'t show.',
            look: 'The freight elevator opens onto a long, windowless corridor lit by LEDs embedded in the ceiling. The air is 65 degrees and exactly 50% humidity — you can feel the climate control working. Rolling racks line both walls, each slot holding a painting in a padded sleeve. Small labels on each rack: artist name, dimensions, year. There are maybe forty works in here.\n\nThis is the gallery\'s real inventory. The show downstairs is marketing. This is the vault.\n\nAt the far end, a folding table holds a laptop with spreadsheets open — consignment records, sale prices, buyer names. If you looked long enough, you\'d know everything.',
            items: [
                { name: 'rolling racks — left wall', desc: 'You pull out a sleeve at random: a mid-size oil painting by an artist whose last auction result was $340,000. It\'s beautiful. It\'s also available — the consignment tag reads \'asking: $180K, negotiate.\' Below market. Way below. Someone needs cash.', isTakeable: false, requires: null, onLook: { intel: 3 } },
                { name: 'laptop on the folding table', desc: 'Consignment records. You scan quickly: twelve works on consignment, six owned outright by the gallery. The margins on some of these are staggering — bought at estate sales for five figures, listed for six. One entry catches your eye: a work flagged \'HOLD — museum interest.\' Someone at a major institution wants this piece. That changes the math entirely.', isTakeable: false, requires: { intel: { min: 6 } }, onLook: { intel: 5 } },
                { name: 'climate control panel', desc: '65°F, 50% RH. Professional grade. Whatever else you think about this gallery, they take care of the work.', isTakeable: false, onLook: null },
            ],
            characters: [],
            exits: [
                { dir: 'down', id: 'chelsea_main_floor', label: 'Take the elevator back down', block: null, requires: null },
            ],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'The freight elevator shudders to a stop. When the gate opens, the air changes — cooler, drier, and perfectly still. You\'ve seen more art in the last ten seconds than most people see in a year.', effects: { intel: 2 } },
            timeCost: 1,
            tags: ['private', 'high-value', 'storage'],
        },
    ],
};

// ─────────────────────────────────────────────
// VENUE 2: COCKTAIL PARTY — Upper East Side
// Source: 05_World/Rooms/Cocktail_Party.md
// ─────────────────────────────────────────────

const COCKTAIL_PARTY = {
    id: 'cocktail_party',
    name: 'Cocktail Party — Upper East Side',
    desc: 'A private collector\'s penthouse. By invitation only. Allegedly.',
    startRoom: 'penthouse_foyer',
    timeLimit: 6,
    availableWeeks: 'any',
    frequency: 'every 4-8 weeks',
    requires: { reputation: { min: 15 } },
    rooms: [
        {
            id: 'penthouse_foyer',
            venue: 'cocktail_party',
            name: 'The Foyer',
            desc: 'Marble floors. A Warhol by the coat check.',
            look: 'The elevator opens directly into the apartment — because of course it does. The foyer is larger than most Manhattan studios: Carrara marble floors, a slim console table holding a vase of white peonies, and a Warhol dollar sign painting hung casually by the coat rack, as if to say \'yes, we know.\'\n\nA young woman in a black dress takes your coat with a practiced smile. From deeper inside, you hear conversation, ice in glasses, and something by Miles Davis played at exactly the right volume — loud enough to set a mood, quiet enough to make you lean in.',
            items: [
                { name: 'Warhol dollar sign painting', desc: 'A genuine Warhol. Small — maybe 20 × 16 inches. Dollar signs in acid green and pink on a black ground. Worth somewhere between $300K and $800K depending on the day. And they hung it by the coats. That\'s either supreme confidence or a very specific kind of message.', isTakeable: false, onLook: { intel: 1 } },
                { name: 'marble console table', desc: 'Beneath the peonies: a neat stack of business cards in a silver tray. You thumb through — art advisors, private wealth managers, a foundation director. The social registry of tonight\'s event.', isTakeable: false, requires: null, onLook: { intel: 1 } },
            ],
            characters: [
                { id: 'coat_check_attendant', desc: 'The coat check attendant — early twenties, clearly a gallerist\'s assistant moonlighting — gives you a numbered ticket and a half-smile that says she\'s cataloguing everyone.', topics: ['guest_list', 'the_host'], requires: null },
            ],
            exits: [
                { dir: 'in', id: 'penthouse_living_room', label: 'Walk into the living room', block: null, requires: null },
            ],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'The elevator doors open and you step into a world that smells like expensive candles and old money. Somewhere inside, someone laughs — the kind of laugh that costs $10,000 a year in social maintenance.', effects: null },
            timeCost: 0,
            tags: ['social', 'entry', 'upper-east-side'],
        },
        {
            id: 'penthouse_living_room',
            venue: 'cocktail_party',
            name: 'The Living Room',
            desc: 'Floor-to-ceiling windows. Twelve paintings. Twenty people pretending not to look at each other.',
            look: 'The living room is enormous and immaculate — the kind of space that exists only in pre-war penthouses and the fantasies of interior design magazines. Floor-to-ceiling windows on two sides frame the East River and the Queensboro Bridge. But nobody is looking at the view.\n\nThey\'re looking at the walls. And the walls are extraordinary.\n\nA de Kooning woman. A small Basquiat crown painting. A pair of Richard Serras in charcoal on paper. And — hung above the fireplace with the confidence of someone who doesn\'t need to prove anything — a late Rothko in deep maroon and black, the color of dried wine.\n\nTwenty people mill about in clusters of two and three. A bartender in a white jacket mixes drinks from behind a Nakashima slab table that probably cost more than the bartender\'s apartment. The conversation is low, strategic, and constant.',
            items: [
                { name: 'de Kooning painting', desc: 'Woman III study on paper, circa 1952. The gestural marks are violent and alive — you can feel the energy fifty years later. You check the frame backing: Gagosian label, previously exhibited at MoMA. Conservative estimate: $4–6 million. Your host has this hanging next to the kitchen door.', isTakeable: false, onLook: { intel: 1 } },
                { name: 'Basquiat crown painting', desc: 'Small — maybe 24 × 18 inches. Oilstick on paper. A crown, two crossed-out words, and a date: 1983. The year before everything went sideways. This is the kind of piece that anchors a collection. It tells you everything about what the host values: raw energy over polish.', isTakeable: false, onLook: { intel: 1 } },
                { name: 'the Rothko', desc: 'You stand in front of it for a full minute. The maroon field breathes — it actually seems to pulse when you let your eyes go soft. This is a $25 million painting hung above a fireplace in a private home. Some people would call that a crime. Others would call it the whole point.', isTakeable: false, onLook: { reputation: 1 } },
                { name: 'Nakashima bar table', desc: 'A five-foot slab of black walnut with a live edge. George Nakashima, probably 1960s. The bartender is slicing limes on a cutting board placed carefully on one end. Furniture as sculpture. The host gets it.', isTakeable: false, onLook: null },
            ],
            characters: [
                { id: 'the_host', desc: 'The host — Arthur Graves, second-generation collector and habitual over-pourer — is near the Rothko, holding court. He\'s telling a story about meeting Twombly in Rome. You can\'t tell if he\'s embellishing or underplaying it. With Arthur, it could be either.', topics: ['collection_strategy', 'market_outlook', 'selling_a_piece', 'studio_visit_invite'], requires: null },
                { id: 'elena_ross', desc: 'Elena Ross is here too — standing near the windows, drink in hand, scanning the room with the systematic attention of someone who plans conversations three moves ahead.', topics: ['partnership', 'tonight_collection', 'art_fair_plans'], requires: null },
                { id: 'art_advisor', desc: 'Margaux Vidal, an art advisor with a client list she never discusses, is examining the Serra drawings with a loupe. She looks up as you approach — appraising you the way she appraises art.', topics: ['serra_drawings', 'client_work', 'hidden_gems'], requires: { reputation: { min: 25 } } },
            ],
            exits: [
                { dir: 'back', id: 'penthouse_foyer', label: 'Return to the foyer', block: null, requires: null },
                { dir: 'outside', id: 'penthouse_terrace', label: 'Step out onto the terrace', block: null, requires: null },
                { dir: 'hallway', id: 'penthouse_study', label: 'Slip down the hallway toward the study', block: 'Arthur\'s assistant appears from nowhere. \'That area\'s private this evening.\' You\'d need a closer relationship with the host — or enough intel to know what\'s in there.', requires: { OR: [{ npcFavor: { the_host: { min: 5 } } }, { intel: { min: 8 } }] } },
            ],
            eavesdrops: [
                { id: 'advisor_client_call', desc: 'Margaux Vidal steps away from the Serra drawings to take a hushed phone call', requires: { intel: { min: 6 } }, content: '"—no, tell them we\'re passing. The provenance has a gap between \'74 and \'89 and nobody can explain it. I don\'t care how good the price is. We\'re not touching it."\n\nA pause.\n\n"Yes, I said passing. Permanently. And tell the other clients too — nobody in my stable buys that work. Someone will, and they\'ll regret it."', effects: { intel: 3 }, unlocks: 'provenance_warning', oneShot: true },
                { id: 'collector_rivalry', desc: 'Two collectors near the bar, voices low but heated', requires: { intel: { min: 4 } }, content: '"He bought three at the opening. Three. Before anyone else even had a chance."\n"That\'s not how it works. You call the gallery beforehand, you—"\n"That IS how it works. For him. The gallery plays favorites and we all pretend it\'s fair."', effects: { intel: 1 }, unlocks: null, oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'You step into the living room and the Rothko hits you before anything else — a wall of deep maroon that makes the room feel like it has a heartbeat.', effects: null },
            timeCost: 1,
            tags: ['social', 'high-value', 'collection', 'main'],
        },
        {
            id: 'penthouse_terrace',
            venue: 'cocktail_party',
            name: 'The Terrace',
            desc: 'East River below. Bridge lights. The cold air sharpens everything.',
            look: 'The terrace wraps around two sides of the penthouse. The East River is a dark ribbon thirty floors below, crossed by the Queensboro Bridge lit up like a circuit board. Potted boxwoods line the railing — someone\'s idea of nature. Two heat lamps glow orange at either end.\n\nOut here, the rules change. People say things on terraces they\'d never say inside. The cold air works like truth serum. Or maybe it\'s just that nobody thinks the walls have ears when there are no walls.',
            items: [
                { name: 'abandoned cocktail napkin', desc: 'A cocktail napkin with a phone number and two words written in blue ink: \'CALL MONDAY.\' No name. Someone made a deal tonight.', isTakeable: true, onTake: { intel: 1 }, onLook: null },
                { name: 'view of the Queensboro Bridge', desc: 'Thirty stories up, the bridge looks like a diagram of ambition — cables reaching for something they can never quite hold. The river below is black and patient. You think about how much money is sitting in the room behind you and how none of it matters to the water.', isTakeable: false, onLook: null },
            ],
            characters: [
                { id: 'philippe_noir', desc: 'Philippe Noir is out here alone, leaning on the railing with a whisky neat. He looks like he\'s been waiting for someone. Maybe you.', topics: ['off_the_record', 'rival_weakness', 'dangerous_opportunity'], requires: null },
            ],
            exits: [
                { dir: 'inside', id: 'penthouse_living_room', label: 'Go back inside', block: null, requires: null },
                { dir: 'around', id: 'penthouse_powder_room', label: 'Walk around the terrace to the side entrance', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'terrace_confession', desc: 'Two figures at the far end of the terrace, faces lit by phone screens, voices carrying on the wind', requires: { intel: { min: 5 } }, content: '"I need to move the Hirst by end of quarter. My accountant says if I don\'t realize the loss this year, the tax situation becomes—"\n"How much are you willing to lose?"\n"Forty percent. Maybe fifty. I just need it gone."\n"...I might know someone. But they\'ll want provenance documentation by Friday."', effects: { intel: 2 }, unlocks: 'distressed_hirst_sale', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'The cold air slaps you awake. Thirty floors up, Manhattan looks like a spreadsheet made of light.', effects: null },
            timeCost: 1,
            tags: ['outdoor', 'private', 'candid'],
        },
        {
            id: 'penthouse_powder_room',
            venue: 'cocktail_party',
            name: 'The Hallway',
            desc: 'Between the public rooms and the private ones. You\'re not sure you should be here.',
            look: 'The hallway connects the terrace\'s side entrance to the private wing. The carpet is thick enough to absorb footsteps. On the wall: three small photographs in matching frames — Cindy Sherman, Nan Goldin, Francesca Woodman. All self-portraits. All unsettling in different ways.\n\nA door at the end of the hall is slightly ajar. Through the gap: bookshelves, a desk lamp, the corner of a painting you can\'t quite make out. The study.\n\nYou can hear the party behind you, muffled. In here, you\'re in the space between invitation and intrusion.',
            items: [
                { name: 'Cindy Sherman photograph', desc: 'Untitled Film Still #21, 1978. The one where she looks like a young career woman arriving in the city, gazing up at skyscrapers. Printed small, intimate. Worth about $500K at last auction. The host hung it in the hallway like it\'s wallpaper. That\'s either modesty or the most expensive flex in art history.', isTakeable: false, onLook: { intel: 1 } },
                { name: 'coat closet — slightly open', desc: 'You nudge the door. Inside: coats, a fur that looks like it hasn\'t been worn since 1985, and — wedged behind a garment bag — a small painting in a padded sleeve. Unframed. No label. Someone stashed this here recently. You recognize the style: it\'s by the same artist showing at the Chelsea gallery tonight. Why would the host have an unshown work hidden in a coat closet?', isTakeable: false, requires: { intel: { min: 5 } }, onLook: { intel: 3 } },
            ],
            characters: [],
            exits: [
                { dir: 'back', id: 'penthouse_terrace', label: 'Return to the terrace', block: null, requires: null },
                { dir: 'study', id: 'penthouse_study', label: 'Push through the door to the study', block: 'You reach for the door handle but hesitate. Going in uninvited is a risk. You\'d need a relationship with the host — or enough nerve.', requires: { OR: [{ npcFavor: { the_host: { min: 5 } } }, { intel: { min: 8 } }] } },
            ],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'You\'re in the hallway between the party and the private rooms. The noise drops by half. The photographs on the wall stare back at you like witnesses.', effects: null },
            timeCost: 1,
            tags: ['transitional', 'private', 'risky'],
        },
        {
            id: 'penthouse_study',
            venue: 'cocktail_party',
            name: 'The Study',
            desc: 'Leather, lamplight, and the art he doesn\'t show anyone.',
            look: 'The study is small and warm and completely at odds with the performative elegance of the rest of the apartment. A leather club chair. A standing lamp with a green shade. Bookshelves on three walls — real books, read books, with spines that are cracked and annotated.\n\nAnd behind the desk, resting on a museum-grade easel: a painting that makes you stop breathing for a second.\n\nIt\'s a Cy Twombly. Late period. Chalk and oil on a grey ground, those famous loops and scrawls that look like a child\'s handwriting until you realize they\'re the most sophisticated marks in postwar art. This is the one he tells the story about — meeting Twombly in Rome, buying it directly from the studio.\n\nA ledger sits open on the desk. The host isn\'t sentimental. He tracks everything — purchase price, insurance valuation, current market estimate. This painting was bought for $120,000 in 1994. The current estimate column reads $8.5M.',
            items: [
                { name: 'Cy Twombly painting', desc: 'Late period Twombly. Chalk, wax crayon, and oil on grey-primed canvas. The loops spiral across the surface like a fever chart of emotion. You\'ve seen Twomblys in museums. This one, in this room, under this light, is different. It\'s not performing for an audience. It\'s just being itself. You understand suddenly why the host doesn\'t hang it in the living room. Some things aren\'t for showing.', isTakeable: false, onLook: { reputation: 2, intel: 2 } },
                { name: 'ledger on the desk', desc: 'The host\'s private collection ledger. Hand-ruled columns: Date Acquired, Source, Purchase Price, Insurance Value, Market Estimate. You scan the entries:\n\n• de Kooning Woman III study — $640K (1998) → $5.2M\n• Basquiat crown — $180K (2001) → $3.8M\n• Rothko (maroon/black) — $4.2M (2005) → $25M\n• Twombly (Rome) — $120K (1994) → $8.5M\n\nThe total at the bottom is circled twice: $56.4M. This man turned $6 million into $56 million by buying what he loved. That\'s not investing. That\'s taste as a superpower.', isTakeable: false, requires: { intel: { min: 6 } }, onLook: { intel: 5 } },
                { name: 'annotated exhibition catalogue', desc: 'A catalogue from a 2018 retrospective at the Whitney. The margins are filled with the host\'s handwriting — notes on condition, provenance questions, comparisons to other works. One note catches your eye: \'Watch for early works at estate sales — the widow doesn\'t know what she has.\' That was three years ago. You wonder if he followed through.', isTakeable: false, onLook: { intel: 2 } },
            ],
            characters: [
                { id: 'the_host', desc: 'Arthur Graves is here — he must have slipped away from the party. He\'s in the club chair, shoes off, a glass of port in hand. He looks up when you enter and his expression is... pleased. Not surprised. \'You found it,\' he says. \'Good. Sit down.\'', topics: ['twombly_story', 'collection_philosophy', 'private_deal', 'mentorship'], requires: null },
            ],
            exits: [
                { dir: 'out', id: 'penthouse_living_room', label: 'Return to the party', block: null, requires: null },
            ],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'The study smells like leather and old paper. The Twombly on the easel catches the lamplight and the loops seem to move. Arthur looks up from his chair. \'Close the door,\' he says. Not unkindly.', effects: { reputation: 3 } },
            timeCost: 1,
            tags: ['private', 'high-value', 'mentorship', 'endgame'],
        },
    ],
};

// ─────────────────────────────────────────────
// VENUE 3: AUCTION HOUSE — Rockefeller Plaza
// Source: 05_World/Rooms/Auction_House.md
// ─────────────────────────────────────────────

const AUCTION_HOUSE = {
    id: 'auction_house',
    name: 'Christie\'s — Rockefeller Plaza',
    desc: 'The theater of the market. High ceilings, hushed voices, and the smell of fear.',
    startRoom: 'auction_main_hall',
    timeLimit: 5,
    availableWeeks: 'auction_weeks',
    frequency: 'seasonal (May/Nov)',
    requires: { reputation: { min: 20 } },
    rooms: [
        {
            id: 'auction_main_hall',
            venue: 'auction_house',
            name: 'Main Hall',
            desc: 'Marble floors. A registration desk that judges you.',
            look: 'The lobby is designed to make you feel small. Three stories of glass and limestone. A banner hangs from the ceiling: \'masterpieces from the Estate of...\' followed by a name that used to mean power. Now it just means inventory.\n\nThe registration desk is a fortress. Behind it, assistants in impeccable suits hand out paddles like weapons. To your left, a champagne bar serves vintage Dom Pérignon to people who are about to spend millions. To your right, the entrance to the bidding floor, guarded by security.',
            items: [
                { name: 'stack of catalogs', desc: 'Heavy, glossy, and smelling of ink. The cover lot is a Rothko. Estimate: upon request. You flip through it — the estimates are conservative. Teaser rates. They want a bidding war.', isTakeable: true, onTake: { intel: 1 }, onLook: null },
                { name: 'champagne bar', desc: 'Free alcohol. In a casino, they give you drinks to keep you gambling. Here, they give you drinks so you numb the part of your brain that understands value.', isTakeable: false, onLook: null },
                { name: 'digital screen', desc: 'Scrolling currency conversions: USD, GBP, EUR, HKD, CNY. The numbers move faster than you can read. Money doesn\'t sleep, and it definitely doesn\'t stay in one currency.', isTakeable: false, onLook: { intel: 1 } },
            ],
            characters: [
                { id: 'marcus_price', desc: 'Marcus Price is near the bar, looking anxious. He\'s checking his phone every four seconds. His client is late, or bail didn\'t come through.', topics: ['tonight_estimates', 'client_gossip', 'market_correction'], requires: null },
            ],
            exits: [
                { dir: 'in', id: 'auction_bidding_floor', label: 'Enter the Bidding Floor', block: 'Security stops you. \'Registration first, please.\'', requires: null },
                { dir: 'out', id: 'rockefeller_plaza', label: 'Leave the auction', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'specialist_whisper', desc: 'A specialist briefing a client near the coat check', requires: { intel: { min: 4 } }, content: '"...the guarantee is third-party. The irrevocable bid is already in place. We\'re just going through the motions to establish a public price. It\'s sold."', effects: { intel: 3 }, unlocks: 'third_party_guarantee_intel', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'The air conditioning is set to \'refrigerated.\' You can smell ozone and expensive dry cleaning.', effects: null },
            timeCost: 0,
            tags: ['social', 'market', 'public'],
        },
        {
            id: 'auction_bidding_floor',
            venue: 'auction_house',
            name: 'The Bidding Floor',
            desc: 'Rows of chairs. The rostrum. The silence before the drop.',
            look: 'Five hundred chairs arranged in a semicircle. The front rows are reserved for people who fly private. The back rows are for journalists and students. Along the side wall, a bank of telephones is manned by staff speaking in hushed French, Mandarin, and Russian.\n\nThe rostrum towers over everything. Behind it, a rotating display shows the current lot. Right now, it\'s a small canvas by a surrealist who died poor. The current bid is three million dollars.',
            items: [
                { name: 'your paddle', desc: 'Plastic. White. Number 742. It feels light in your hand, but lifting it costs a fortune. It\'s the most dangerous object in the room.', isTakeable: false, onLook: null },
                { name: 'the currency display', desc: 'The numbers tick up in real-time. $3,000,000. £2,400,000. €2,800,000. It turns abstract after a while. Just scorekeeping.', isTakeable: false, onLook: null },
                { name: 'the telephone bank', desc: 'Twenty staff members on landlines. They are the avatars of the invisible money. One of them waves a hand — a new bid from Hong Kong.', isTakeable: false, onLook: { intel: 1 } },
            ],
            characters: [
                { id: 'rich_kid_rival', desc: 'Your rival is in the third row, whispering to an advisor. They look confident. Too confident.', topics: ['bidding_strategy', 'lot_47', 'fake_politeness'], requires: null },
            ],
            exits: [
                { dir: 'back', id: 'auction_main_hall', label: 'Return to the Hall', block: null, requires: null },
                { dir: 'side', id: 'auction_private_viewing', label: 'Slip into the Private Viewing Room', block: 'A security guard blocks the velvet rope. \'Strictly private viewing, I\'m afraid.\'', requires: { reputation: { min: 60 } } },
                { dir: 'cashier', id: 'auction_cashier', label: 'Go to the Cashier / Exit', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'telephone_bid', desc: 'A staff member covering the mouthpiece of her phone', requires: { intel: { min: 6 } }, content: '"...he says he\'s out. Wait. No. He says one more. But only if you can slow down the auctioneer. He needs a minute."', effects: { intel: 2 }, unlocks: 'stalled_auction_intel', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'The room is quieter than a church. The only sound is the auctioneer\'s rhythmical chant. \'Do I see five? Five million? Selling at four point eight...\'', effects: null },
            timeCost: 1,
            tags: ['market', 'high-stakes', 'public'],
        },
        {
            id: 'auction_private_viewing',
            venue: 'auction_house',
            name: 'Private Viewing Room',
            desc: 'Velvet ropes. A single painting on a stand.',
            look: 'This room doesn\'t exist on the floor plan. The walls are upholstered in grey silk. There is only one painting here, displayed on an easel under dedicated lighting.\n\nIt\'s a Renaissance panel. Dark varnish. Cracked wood. It was withdrawn from the sale this morning \'for further research.\' Now you see why. It\'s too good to be true, or it\'s the discovery of the century. Three men in suits are arguing about it in low voices.',
            items: [
                { name: 'the withdrawn lot', desc: 'Attributed to a follower of Titian. But the hands... the hands are perfect. If this is real, it\'s worth fifty million. If it\'s not, it\'s worth the wood it\'s painted on.', isTakeable: false, requires: { intel: { min: 5 } }, onLook: { intel: 4 } },
                { name: 'condition report', desc: 'Lying open on a side table. \'Significant restoration visible under UV. Panel cradling serves no structural purpose. Provenance gap 1938-1946.\' The kiss of death.', isTakeable: false, onLook: { intel: 3, suspicion: 1 } },
            ],
            characters: [
                { id: 'senior_specialist', desc: 'The Head of Old Masters is rubbing his temples. He looks like he hasn\'t slept in a week.', topics: ['provenance_gap', 'private_treaty_sale', 'attribution_error'], requires: { reputation: { min: 50 } } },
            ],
            exits: [
                { dir: 'out', id: 'auction_bidding_floor', label: 'Return to the Floor', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'attribution_argument', desc: 'The argument near the easel', requires: { intel: { min: 5 } }, content: '"...I don\'t care what the X-ray says. The underdrawing is clumsy. It\'s a workshop copy. If we sell this as the master, we\'re done. Pull it permanently."', effects: { intel: 4 }, unlocks: 'titian_forgery_intel', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'The air in here is heavy. The silence is different — it\'s the silence of a problem that money can\'t fix.', effects: null },
            timeCost: 1,
            tags: ['private', 'secret', 'high-value'],
        },
        {
            id: 'auction_cashier',
            venue: 'auction_house',
            name: 'Settlement Office',
            desc: 'Where the winners pay.',
            look: 'A small, windowless room that looks like a high-end bank. The excitement of the bidding floor is gone. Here, it\'s just wire transfers and shipping forms. A printer hums rhythmically, spitting out invoices with six and seven zeros.\n\nThe exit to the street is through a side door. You don\'t walk out the front with a painting under your arm.',
            items: [
                { name: 'shipping manifesto', desc: 'A list of destinations: The Geneva Freeport. The Singapore Freeport. A storage facility in Delaware. None of this art is going to anyone\'s home. It\'s just moving from one dark room to another.', isTakeable: false, onLook: { intel: 1 } },
            ],
            characters: [
                { id: 'account_manager', desc: 'Efficient. Unsmiling. She processes millions of dollars like she\'s scanning groceries.', topics: ['payment_terms', 'shipping_logistics', 'tax_avoidance'], requires: null },
            ],
            exits: [
                { dir: 'out', id: 'rockefeller_plaza', label: 'Leave the auction', block: null, requires: null },
            ],
            eavesdrops: [],
            onEnter: null,
            timeCost: 0,
            tags: ['administrative', 'exit'],
        },
    ],
};

// ─────────────────────────────────────────────
// VENUE 4: ARTIST STUDIO — Bushwick, Brooklyn
// Source: 05_World/Rooms/Artist_Studio.md
// ─────────────────────────────────────────────

const ARTIST_STUDIO = {
    id: 'artist_studio',
    name: 'Artist Studio — Bushwick',
    desc: 'Industrial grit. Smells like turpentine and ambition.',
    startRoom: 'studio_street',
    timeLimit: 6,
    availableWeeks: 'any',
    frequency: 'by invitation only',
    requires: { intel: { min: 15 } },
    rooms: [
        {
            id: 'studio_street',
            venue: 'artist_studio',
            name: 'Wyckoff Avenue',
            desc: 'Graffiti. Warehouses. A rusted buzzer.',
            look: 'It looks like an abandoned factory because it is one. A steel door with no number. A keypad that has been smashed and repaired three times. The graffiti on the brickwork is better than half the art in Chelsea.\n\nA bodega on the corner glows yellow in the night. You can hear heavy bass thumping from three blocks away.',
            items: [
                { name: 'intercom buzzer', desc: 'A piece of masking tape reads \'KWAME.\' You press it. It buzzes instantly. No questions asked. Someone is expecting you.', isTakeable: false, onLook: null },
                { name: 'street art mural', desc: 'A twenty-foot mural of a decomposing skull. It\'s signed \'GHOST.\' You\'ve seen this tag in Berlin and Tokyo. The street value is zero. The cultural value is infinite.', isTakeable: false, onLook: { intel: 1 } },
            ],
            characters: [],
            exits: [
                { dir: 'in', id: 'studio_main_floor', label: 'Buzz in and take the freight elevator', block: null, requires: null },
                { dir: 'out', id: 'bushwick_street', label: 'Leave the neighborhood', block: null, requires: null },
            ],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'You check the address on your phone again. This is definitely it. If you didn\'t know better, you\'d think you were buying drugs, not art.', effects: null },
            timeCost: 0,
            tags: ['public', 'gritty', 'entrance'],
        },
        {
            id: 'studio_main_floor',
            venue: 'artist_studio',
            name: 'The Studio Floor',
            desc: 'Canvases everywhere. The smell of oil paint is thick.',
            look: 'Four thousand square feet of raw potential. The floor is splattered with a decade of paint—a Jackson Pollock map of history. Canvases lean against every vertical surface. Some are finished, gleaming wetly under the industrial lights. Others are half-born, sketched in charcoal.\n\nIn the center, a trestle table is covered in brushes, tubes of paint, empty coffee cups, and an overflowing ashtray. This isn\'t a gallery. It\'s a workshop.',
            items: [
                { name: 'wet canvas on the easel', desc: 'It\'s huge. Violent. Beautiful. It\'s not like the polished work you see in the gallery. This is raw. You can see the struggle in the brushstrokes. If you bought this now, straight off the easel, you\'d be buying the artist\'s soul.', isTakeable: false, onLook: { intel: 2 } },
                { name: 'sketchbook', desc: 'Open on the table. Study after study of the same figure. You realize this is the preparatory work for the show that opens next month. Seeing this is like seeing the code behind the software.', isTakeable: false, requires: { intel: { min: 5 } }, onLook: { intel: 3 } },
            ],
            characters: [
                { id: 'kwame_asante', desc: 'Kwame is wiping paint off his hands with a rag. He looks exhausted but wired. He hasn\'t slept in two days.', topics: ['work_in_progress', 'gallery_pressure', 'inspiration'], requires: null },
            ],
            exits: [
                { dir: 'out', id: 'studio_street', label: 'Take the elevator down', block: null, requires: null },
                { dir: 'side', id: 'studio_vault', label: 'Check the storage racks', block: 'Kwame steps in front of you. \'Not there. That\'s the old stuff.\'', requires: { npcFavor: { kwame_asante: { min: 10 } } } },
                { dir: 'up', id: 'studio_roof', label: 'Go up to the roof', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'phone_call_gallery', desc: 'Kwame arguing on his phone in the corner', requires: { intel: { min: 3 } }, content: '"...I don\'t care what the contract says! The blue series isn\'t ready. If you force me to ship it, I\'ll burn it. Tell the collector to wait."', effects: { intel: 2 }, unlocks: 'artist_gallery_conflict', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'The elevator gate rattles open. The smell hits you first—linseed oil, turpentine, and cheap tobacco.', effects: null },
            timeCost: 1,
            tags: ['private', 'creative', 'workshop'],
        },
        {
            id: 'studio_vault',
            venue: 'artist_studio',
            name: 'Storage Racks',
            desc: 'Dusty. Crowded. Hidden gems.',
            look: 'A narrow corridor lined with wooden racks. The lighting is dim. This is the graveyard of ideas—works that didn\'t sell, works that were too weird for the gallery, works the artist kept for themselves.\n\nYou pull out a rack. It\'s early work. Different style. Rougher. But there\'s an energy here that the new stuff lacks. This is the \'early period\' that museums will fight over in twenty years.',
            items: [
                { name: 'dusty canvas', desc: 'From five years ago. Before the fame. Before the prices exploded. It\'s signed on the back. If you offer cash now, he might let it go for a fraction of his current market price. It\'s a gamble.', isTakeable: false, onLook: { intel: 2 } },
                { name: 'rejected commission', desc: 'A portrait of a famous collector\'s wife. It\'s unflattering. Brutal, actually. No wonder they rejected it. It\'s a masterpiece.', isTakeable: false, requires: { reputation: { min: 40 } }, onLook: { intel: 2, reputation: 1 } },
            ],
            characters: [],
            exits: [
                { dir: 'out', id: 'studio_main_floor', label: 'Back to the studio', block: null, requires: null },
            ],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'Kwame sighs as he lets you in. \'Just don\'t judge the bad ones. I keep them to remind myself what not to do.\'', effects: null },
            timeCost: 1,
            tags: ['hidden', 'archive', 'bargains'],
        },
        {
            id: 'studio_roof',
            venue: 'artist_studio',
            name: 'The Roof Terrace',
            desc: 'Manhattan skyline in the distance. Beer in plastic cups.',
            look: 'Tar paper and gravel underfoot. The wind is cold. In the distance, the Manhattan skyline glitters like a promise or a threat. Down here in Bushwick, it feels a million miles away.\n\nThere are a few lawn chairs zip-tied together. A cooler full of cheap beer. This is where the artist comes to breathe. Up here, away from the canvases, the conversation changes. It stops being about the work and starts being about the life.',
            items: [
                { name: 'Manhattan skyline', desc: 'From here, the city looks like a circuit board. Somewhere in those lights, people are buying and selling these paintings for more money than this zip code sees in a year.', isTakeable: false, onLook: { intel: 1 } },
                { name: 'cooler of beer', desc: 'Modelo. Ice cold. Helping yourself is a move. It says you\'re not just a buyer; you\'re a peer.', isTakeable: false, onLook: null },
            ],
            characters: [
                { id: 'kwame_asante_roof', desc: 'Kwame is leaning on the parapet, smoking. He looks smaller out here.', topics: ['future_plans', 'leaving_new_york', 'the_meaning_of_it_all'], requires: { npcFavor: { kwame_asante: { min: 5 } } } },
            ],
            exits: [
                { dir: 'down', id: 'studio_main_floor', label: 'Go back down', block: null, requires: null },
            ],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'You push open the heavy fire door. The wind hits you immediately. It\'s quiet up here.', effects: null },
            timeCost: 1,
            tags: ['intimate', 'social', 'view'],
        },
    ],
};

// ─────────────────────────────────────────────
// VENUE 5: ART FAIR BASEL — Messeplatz, Switzerland
// Source: 05_World/Rooms/Art_Fair_Basel.md
// ─────────────────────────────────────────────

const ART_FAIR_BASEL = {
    id: 'art_basel',
    name: 'Art Basel — The Messeplatz',
    desc: 'The Olympics of the art world. Too big, too bright, too much money.',
    startRoom: 'basel_main_hall',
    timeLimit: 4,
    availableWeeks: 'fair_weeks',
    frequency: 'annual (June)',
    requires: { reputation: { min: 30 } },
    rooms: [
        {
            id: 'basel_main_hall',
            venue: 'art_basel',
            name: 'Messeplatz Hall 2',
            desc: 'Infinite rows of white walls. The hum of ten thousand deals.',
            look: 'The scale is oppressive. A grid of three hundred booths stretches to the horizon, each one a perfect white cube. The lighting is engineered to eliminate shadows and fatigue. You can smell new carpet and expensive perfume.\n\nCollectors sprint — actually sprint — from booth to booth. The fear of missing out is palpable. It\'s not about looking at art; it\'s about claiming it before someone else does.',
            items: [
                { name: 'fair map', desc: 'A booklet the size of a novel. Galleries are arranged by hierarchy: the powerful in the center, the hopefuls at the edges. You are currently in the \'Feature\' sector. The real power is in the \'Galleries\' sector.', isTakeable: true, onTake: null, onLook: null },
                { name: 'sales report screen', desc: 'A digital ticker shows confirmed sales. A Richter just went for $20M. A Basquiat for $45M. The numbers are reassuringly obscene.', isTakeable: false, onLook: { marketHeat: 1 } },
            ],
            characters: [
                { id: 'lorenzo_gallo', desc: 'Lorenzo Gallo is leaning against a pillar, looking bored. He\'s arguably the most powerful dealer in Europe. His boredom is a power move.', topics: ['european_market', 'venice_biennale', 'tax_havens'], requires: null },
            ],
            exits: [
                { dir: 'center', id: 'basel_blue_chip_booth', label: 'Push into the center aisle (Blue Chip Galleries)', block: null, requires: null },
                { dir: 'up', id: 'basel_vip_lounge', label: 'Go upstairs to the First Choice Lounge', block: 'A steward checks your badge. \'VIP First Choice only until 2 PM.\' Your badge is the wrong color.', requires: { reputation: { min: 70 } } },
                { dir: 'side', id: 'basel_press_room', label: 'Duck into the Press Room', block: null, requires: { intel: { min: 4 } } },
                { dir: 'out', id: 'basel_tram_stop', label: 'Leave the fair', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'panicked_advisor', desc: 'An art advisor shouting into her phone near the exit', requires: { intel: { min: 3 } }, content: '"...I don\'t care that he\'s on a boat! Get him on the satellite phone. The Gagosian piece is already on hold. We have five minutes to counter or we lose it."', effects: { intel: 1 }, unlocks: null, oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'Your phone buzzes instantly. \'Network congestion.\' There are too many billionaires in one building.', effects: null },
            timeCost: 0,
            tags: ['public', 'crowded', 'high-stress'],
        },
        {
            id: 'basel_blue_chip_booth',
            venue: 'art_basel',
            name: 'Mega-Gallery Booth',
            desc: 'The prime real estate. Works you\'ve seen in textbooks.',
            look: 'This isn\'t a booth; it\'s a museum wing. The carpet is thicker here. The lighting is better. On the back wall hangs a painting that was in the Tate retrospective last year. It\'s not for sale — it\'s \'on loan\' to the booth to signal dominance.\n\nThree directors sit at a long white desk, ignoring everyone who isn\'t wearing a Patek Philippe. They aren\'t selling art; they are granting access to asset classes.',
            items: [
                { name: 'the masterpiece', desc: 'A ten-foot canvas. Aggressive. Joyless. Important. It radiates money. The label says \'Price on Application,\' which means if you have to ask, you\'re the wrong kind of rich.', isTakeable: false, onLook: { reputation: 1 } },
                { name: 'iPad on the desk', desc: 'Left unattended for a split second. It shows the \'Available\' list. Most works are marked \'Reserve: Museum\' or \'Sold: Trustee.\' The game is rigged.', isTakeable: false, requires: { intel: { min: 6 } }, onLook: { intel: 3 } },
            ],
            characters: [
                { id: 'senior_director', desc: 'She looks through you like you\'re made of glass. She\'s waiting for a specific collector from Qatar.', topics: ['primary_market_access', 'waiting_list', 'upcoming_museum_shows'], requires: { reputation: { min: 50 } } },
            ],
            exits: [
                { dir: 'out', id: 'basel_main_hall', label: 'Back to the aisle', block: null, requires: null },
                { dir: 'back', id: 'basel_loading_dock', label: 'Slip through the service entrance', block: 'Staff only.', requires: { intel: { min: 5 } } },
            ],
            eavesdrops: [
                { id: 'gallery_gossip_basel', desc: 'Two directors whispering behind the desk', requires: { intel: { min: 6 } }, content: '"...we can\'t sell it to him. He flipped the condo piece last year. Blacklist him. Tell him it\'s promised to the Guggenheim."', effects: { intel: 2 }, unlocks: 'blacklist_intel', oneShot: true },
            ],
            onEnter: null,
            timeCost: 1,
            tags: ['social', 'exclusive', 'high-value'],
        },
        {
            id: 'basel_vip_lounge',
            venue: 'art_basel',
            name: 'VIP First Choice Lounge',
            desc: 'Oysters. Champagne. Silence.',
            look: 'The roar of the fair is dampened by sound-absorbing panels. Up here, it\'s a cocktail party. Waiters circulate with Ruinart and oysters. This is the only place in the building where people are sitting down.\n\nYou spot a famous hedge fund manager weeping silently in the corner. He missed the Jasper Johns.',
            items: [
                { name: 'oyster bar', desc: 'Freshly shucked. Tastes like the ocean and 500-franc notes.', isTakeable: false, onLook: null },
                { name: 'financial times', desc: 'A stack of pink newspapers. The headline: \'Art Market Cools as Interest Rates Rise.\' Nobody in this room seems to have noticed.', isTakeable: true, onTake: { intel: 1 }, onLook: null },
            ],
            characters: [
                { id: 'baroness_von_h', desc: 'The Baroness. She\'s bought more art in the last hour than you\'ll buy in your skirmish. She looks tired.', topics: ['legacy_planning', 'private_museums', 'philanthropy'], requires: null },
            ],
            exits: [
                { dir: 'down', id: 'basel_main_hall', label: 'Return to the madness', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'billionaire_whisper', desc: 'A quiet conversation between two men in bespoke suits', requires: { intel: { min: 8 } }, content: '"...move the assets to the Singapore freeport. The Geneva regulations are getting too tight. I want the Rothko gone by Tuesday."', effects: { intel: 4 }, unlocks: 'freeport_intel', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'The steward nods at your badge. \'Welcome back.\' You belong here now.', effects: { reputation: 2 } },
            timeCost: 1,
            tags: ['exclusive', 'vip', 'relaxing'],
        },
        {
            id: 'basel_loading_dock',
            venue: 'art_basel',
            name: 'Messeplatz Loading Dock',
            desc: 'Crates. Trucks. The unglamorous truth.',
            look: 'This is how the art gets here. Huge wooden crates stenciled with \'FRAGILE\' and \'THIS WAY UP.\' Art handlers in jumpsuits smoke cigarettes near idling trucks. It smells like diesel and raw pine.\n\nA crate has been pried open for customs inspection. You can see the corner of a painting worth more than the truck it arrived in.',
            items: [
                { name: 'shipping manifest', desc: 'Taped to a crate. Sender: \'Private Collection, Cayman Islands.\' Receiver: \'Gallery X, Basel.\' Value: \'USD 12,000,000.\' Description: \'Household Goods.\'', isTakeable: false, requires: null, onLook: { intel: 2, suspicion: 1 } },
            ],
            characters: [],
            exits: [
                { dir: 'in', id: 'basel_blue_chip_booth', label: 'Slip back into the fair', block: null, requires: null },
            ],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'You step out of the sterile fair into the grit of logistics. This feels more real than anything inside.', effects: null },
            timeCost: 1,
            tags: ['behind-scenes', 'industrial'],
        },
        {
            id: 'basel_press_room',
            venue: 'art_basel',
            name: 'Media Centre — Hall 1 Mezzanine',
            desc: 'Laptops. Deadlines. The smell of free coffee and desperation.',
            look: 'A low-ceilinged room carpeted in industrial grey. Fifty journalists sit at long tables, typing furiously. Monitors on the wall show a live feed of the fair floor. The WiFi actually works in here — a rare luxury.\n\nA press conference is wrapping up at the far end. A curator is defending a controversial acquisition while a reporter from The Art Newspaper asks pointed questions. Nobody looks happy.',
            items: [
                { name: 'press releases', desc: 'A table overflowing with glossy handouts. Gallery announcements, artist statements, sales summaries. Most of them are propaganda. But buried in the stack: a leaked internal memo from a major gallery detailing their \'placement strategy\' — which collectors get first access, and why.', isTakeable: true, onTake: { intel: 2 }, onLook: null },
                { name: 'sales whiteboard', desc: 'An unofficial tally kept by journalists tracking confirmed sales. Updated in real-time with marker. \'$450M total (Day 1).\' Someone has written \'BUBBLE?\' in red at the bottom. Someone else has crossed it out.', isTakeable: false, onLook: { intel: 1, marketHeat: 1 } },
            ],
            characters: [
                { id: 'art_journalist', desc: 'Marta Reyes, critic for Frieze magazine. She looks exhausted but alert. She\'s the one who broke the Knoedler forgery story. She knows where the bodies are buried.', topics: ['market_bubble', 'gallery_scandals', 'upcoming_exposé'], requires: null },
            ],
            exits: [
                { dir: 'out', id: 'basel_main_hall', label: 'Back to the fair floor', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'journalist_source', desc: 'A journalist taking a call in the corridor outside', requires: { intel: { min: 6 } }, content: '"...confirmed. Three works in the evening sale were guaranteed by the same buyer who\'s also bidding. It\'s circular. The auction house knows. They don\'t care as long as the headline number holds."', effects: { intel: 3 }, unlocks: 'circular_guarantee_intel', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'You flash your badge. The guard waves you through without looking up. In here, you\'re either press or a source. Either way, you\'re useful.', effects: null },
            timeCost: 1,
            tags: ['information', 'media', 'intel-rich'],
        },
    ],
};

// ─────────────────────────────────────────────
// VENUE 6: GENEVA FREEPORT — Switzerland
// Source: 05_World/Rooms/Freeport.md
// ─────────────────────────────────────────────

const FREEPORT = {
    id: 'freeport',
    name: 'Geneva Freeport — Ports Francs',
    desc: 'A tax-free vault the size of a city block. Art goes in. Art never comes out.',
    startRoom: 'freeport_security',
    timeLimit: 4,
    availableWeeks: 'any',
    frequency: 'every 8-12 weeks',
    requires: { cash: { min: 100000 }, reputation: { min: 40 } },
    rooms: [
        {
            id: 'freeport_security',
            venue: 'freeport',
            name: 'Security Checkpoint',
            desc: 'Bulletproof glass. Biometric scanners. The politest hostility you\'ve ever felt.',
            look: 'The lobby is aggressively beige. Two guards in grey uniforms sit behind bulletproof glass. A biometric scanner glows blue. Above the desk, a sign in four languages reads: \'All items subject to inspection. No photography. No exceptions.\'\n\nYour phone signal died the moment you walked in. The walls are Faraday cages wrapped in Swiss plaster. Whatever happens in here stays in here — electronically and otherwise.',
            items: [
                { name: 'visitor log', desc: 'You sign in. The pen is chained to the desk. The previous entry is from three days ago — a name you recognize from the Forbes list, visiting \'Vault 1140.\' The one after that is redacted with a black marker.', isTakeable: false, onLook: { intel: 1 } },
                { name: 'security camera', desc: 'Fourteen cameras visible from where you\'re standing. You count them because you have nothing else to do while they verify your identity. Fourteen that you can see.', isTakeable: false, onLook: null },
                { name: 'insurance brochure', desc: 'Glossy. \'Comprehensive coverage for stored assets. Climate-controlled vaults. Seismic protection. Insurance values up to CHF 500,000,000.\' Five hundred million. For one building.', isTakeable: true, onTake: null, onLook: { intel: 1 } },
            ],
            characters: [
                { id: 'charles_vandermeer', desc: 'Charles Vandermeer is waiting for you past the checkpoint. He\'s wearing a linen suit that costs more than some of the art in here. He looks relaxed. He always looks relaxed.', topics: ['storage_options', 'tax_optimization', 'insurance_valuation'], requires: null },
            ],
            exits: [
                { dir: 'in', id: 'freeport_vault_corridor', label: 'Proceed to the vault corridor', block: 'The guard holds up a hand. \'One moment please. We\'re verifying your access level.\'', requires: null },
                { dir: 'out', id: 'geneva_airport_road', label: 'Leave the freeport', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'guard_radio', desc: 'A guard\'s radio crackling behind the glass', requires: { intel: { min: 4 } }, content: '"...vault 2200 access revoked. Client flagged by FINMA. Do not — repeat, do not — allow entry. Redirect to management."', effects: { intel: 2, suspicion: 1 }, unlocks: 'finma_investigation_intel', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'The sliding doors close behind you with a hydraulic hiss. Your phone shows \'No Service.\' You are now off the grid.', effects: null },
            timeCost: 0,
            tags: ['secure', 'controlled', 'entrance'],
        },
        {
            id: 'freeport_vault_corridor',
            venue: 'freeport',
            name: 'Vault Corridor — Level B2',
            desc: 'Fluorescent lights. Numbered doors. The hum of climate control.',
            look: 'The corridor stretches in both directions until it vanishes into perspective. The floor is polished concrete. The ceiling is low — seven feet, maybe. Every twelve meters, a steel door with a keypad and a number. 1100. 1101. 1102.\n\nBehind each door: someone\'s fortune, someone\'s tax exemption, someone\'s secret. An estimated $100 billion in art is stored in this building. More than most national museums. None of it on display. None of it taxed.',
            items: [
                { name: 'vault door 1147 (yours)', desc: 'Your vault. The keypad accepts your code. Inside: a 3×4 meter room. Climate-controlled. Humidity 50%. Your stored works sit in custom crates on rolling racks. Each one tagged with a barcode. It\'s clean, organized, and deeply depressing. Art made to be seen, locked in a box.', isTakeable: false, onLook: { intel: 1 } },
                { name: 'adjacent vault door (ajar)', desc: 'Vault 1148 is cracked open. An art handler is inside, photographing a canvas for an insurance claim. You catch a glimpse: a Warhol. Medium-size. The handler notices you looking and pulls the door shut.', isTakeable: false, requires: { intel: { min: 3 } }, onLook: { intel: 2 } },
                { name: 'fire suppression panel', desc: 'Argon gas system. Not water — water would destroy everything. If the alarm sounds, the corridor fills with inert gas in 90 seconds. There\'s a placard explaining the evacuation procedure. It\'s reassuringly detailed.', isTakeable: false, onLook: null },
            ],
            characters: [],
            exits: [
                { dir: 'back', id: 'freeport_security', label: 'Return to the checkpoint', block: null, requires: null },
                { dir: 'forward', id: 'freeport_private_viewing', label: 'Continue to the private viewing suite', block: 'Charles shakes his head gently. \'That suite is reserved for clients with... larger holdings. Perhaps after your next acquisition.\'', requires: { cash: { min: 200000 } } },
                { dir: 'down', id: 'freeport_registry', label: 'Take the stairs to the Registry Office', block: 'The stairwell door requires a secondary access code you don\'t have.', requires: { intel: { min: 6 } } },
            ],
            eavesdrops: [
                { id: 'handler_conversation', desc: 'Two art handlers talking around the corner', requires: { intel: { min: 5 } }, content: '"...same painting, fourth time this year. It sells, gets moved to a new vault, new owner, new insurance policy. Never leaves the building. The art goes from room 1100 to room 1300. Forty-million-dollar transaction. Nobody sees it. Nobody pays tax on it."', effects: { intel: 4 }, unlocks: 'freeport_flip_intel', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'Charles badges you through. The corridor is silent except for the constant drone of the HVAC system. 65 degrees. 50% humidity. Forever.', effects: null },
            timeCost: 1,
            tags: ['secure', 'storage', 'high-value'],
        },
        {
            id: 'freeport_private_viewing',
            venue: 'freeport',
            name: 'Private Viewing Suite',
            desc: 'Museum lighting. A single chair. The illusion of ownership.',
            look: 'A windowless room with a single painting on a mobile easel, lit by a calibrated LED panel. The light temperature matches MoMA\'s galleries — 3200K, 200 lux. A Le Corbusier lounger faces the easel at the optimal viewing distance.\n\nThis is where you examine works before buying. Or where a seller shows you something that cannot be shown in public — wrong provenance, disputed title, sanctions-listed former owner. The room doesn\'t judge. The room is Switzerland.',
            items: [
                { name: 'the painting on the easel', desc: 'A medium-size abstract work. The provenance document beside it traces ownership through three countries and two shell companies. The last \'legitimate\' owner was a European royal family. The one before that is listed as \'Private Collection, 1939-1945.\' Those dates tell a story nobody wants to hear.', isTakeable: false, requires: { intel: { min: 7 } }, onLook: { intel: 5, suspicion: 2 } },
                { name: 'provenance binder', desc: 'Photocopies of receipts, exhibition histories, and export licenses. Some are originals. Some are suspiciously crisp for documents supposedly from the 1950s. A sticky note reads: \'Client accepts as-is. No warranty.\'', isTakeable: false, onLook: { intel: 3, suspicion: 1 } },
            ],
            characters: [
                { id: 'charles_vandermeer', desc: 'Charles stands by the door with his hands clasped. He\'s watching you study the provenance file. His expression reveals nothing.', topics: ['provenance_concerns', 'purchase_structure', 'discretion'], requires: null },
            ],
            exits: [
                { dir: 'back', id: 'freeport_vault_corridor', label: 'Return to the corridor', block: null, requires: null },
            ],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'The door seals behind you with a soft click. Charles gestures toward the lounger. \'Take your time. There\'s no rush in here. There\'s no anything in here.\'', effects: null },
            timeCost: 1,
            tags: ['private', 'high-value', 'morally-grey'],
        },
        {
            id: 'freeport_registry',
            venue: 'freeport',
            name: 'Registry Office — Level B3',
            desc: 'Filing cabinets. Fluorescent buzz. The bureaucracy of billions.',
            look: 'A basement office that could be a post office if not for the content. Filing cabinets line every wall, floor to ceiling. Two clerks sit at desks typing on terminals that look twenty years old. This is deliberate. Old systems are harder to hack.\n\nEvery transaction in this building — every transfer, every sale, every \'temporary import\' that became permanent — passes through this room. If you knew how to read these files, you\'d know who owns what, who owes what, and who\'s hiding what.',
            items: [
                { name: 'transfer ledger', desc: 'A thick binder. Today\'s page shows four entries. One of them records a Modigliani transferring between two entities — both registered in Luxembourg, both with the same director. The painting moved zero meters. It changed owners on paper. The tax implications are... creative.', isTakeable: false, requires: { intel: { min: 7 } }, onLook: { intel: 5, suspicion: 2 } },
                { name: 'old terminal', desc: 'Green text on a black screen. The database goes back to 1973. You type a query — your own name. Two entries. Both accurate. Then you type a rival\'s name. Seven entries. One of them is flagged \'AUDIT PENDING.\'', isTakeable: false, requires: { intel: { min: 8 } }, onLook: { intel: 4 } },
            ],
            characters: [
                { id: 'registry_clerk', desc: 'A clerk in bifocals who has processed more wealth than most central banks. She doesn\'t look up.', topics: ['transfer_process', 'historical_records', 'compliance_rules'], requires: null },
            ],
            exits: [
                { dir: 'up', id: 'freeport_vault_corridor', label: 'Back to the vault corridor', block: null, requires: null },
            ],
            eavesdrops: [
                { id: 'clerk_phone_call', desc: 'A clerk on the phone, speaking rapid French', requires: { intel: { min: 7 } }, content: '"...non, non. L\'acheteur insiste que le tableau reste ici. Pas de transport. Il ne veut pas payer la TVA. Oui, encore un \'prêt temporaire\' qui dure vingt ans."\n\n(Translation: The buyer insists the painting stays here. No transport. He doesn\'t want to pay VAT. Yes, another \'temporary loan\' that lasts twenty years.)', effects: { intel: 3 }, unlocks: 'permanent_loan_scam_intel', oneShot: true },
            ],
            onEnter: { firstVisitOnly: true, text: 'The fluorescent light flickers once. A clerk glances up, then returns to her terminal. You are tolerated, not welcomed.', effects: { intel: 1 } },
            timeCost: 1,
            tags: ['bureaucratic', 'secret', 'dangerous'],
        },
    ],
};

// ─────────────────────────────────────────────
// VENUE 7: TEST GALLERY — SoHo (Tiled Map Demo)
// ─────────────────────────────────────────────

const GALLERY_TEST = {
    id: 'gallery_test',
    name: 'SoHo Contemporary',
    desc: 'A small contemporary gallery in SoHo. White walls, polished floors, serious art.',
    startRoom: 'gallery_test_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: 'gallery_test_main',
            venue: 'gallery_test',
            name: 'Main Exhibition',
            desc: 'Kenji Nomura & Amara Osei: New Works. The opening crowd has thinned. Good.',
            look: 'A clean white box — 2,000 square feet of gallery perfection. Six paintings hung at exactly 57 inches center. Track lighting. Polished concrete. A dealer stands near the back wall, watching who looks at what.',
            items: [],
            characters: [{ id: 'elena_ross' }],
            exits: [{ dir: 'south', id: null, label: 'Exit to street' }],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'The gallery is quiet. Just you, the art, and a dealer pretending not to watch you.', effects: null },
            timeCost: 0,
            tags: ['gallery', 'tiled', 'test'],
        }
    ],
};

// ─────────────────────────────────────────────
// VENUE 8: UPTOWN GALLERY (Generated)
// ─────────────────────────────────────────────

const UPTOWN_GALLERY = {
    id: 'uptown_gallery',
    name: 'Uptown Contemporary',
    desc: 'A polished uptown gallery. Group show with works by emerging and mid-career artists.',
    startRoom: 'uptown_gallery_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: 'uptown_gallery_main',
            venue: 'uptown_gallery',
            name: 'Group Show',
            desc: 'Uptown Contemporary — Group Show. The crowd is thin. A dealer stands near the back.',
            look: 'High ceilings, track lighting, polished floors. The gallery feels more institutional than the downtown spaces.',
            items: [],
            characters: [{ id: 'philippe_noir' }],
            exits: [{ dir: 'south', id: null, label: 'Exit to street' }],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'The gallery is pristine. Everything here is priced to impress.', effects: null },
            timeCost: 0,
            tags: ['gallery', 'tiled', 'generated'],
        }
    ],
};

// ─────────────────────────────────────────────
// VENUE 9: ARTIST STUDIO VISIT (Generated)
// ─────────────────────────────────────────────

const ARTIST_STUDIO_VISIT = {
    id: 'artist_studio_visit',
    name: 'Kwame Asante\'s Studio',
    desc: 'A working studio in Brooklyn. Paint-splattered floors, canvases stacked against walls.',
    startRoom: 'artist_studio_visit_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: 'artist_studio_visit_main',
            venue: 'artist_studio_visit',
            name: 'Main Studio',
            desc: 'Kwame Asante\'s working studio. Unfinished canvases lean against every surface.',
            look: 'The smell of turpentine and linseed oil. Natural light pours through skylights. This is where the work happens.',
            items: [],
            characters: [{ id: 'kwame_asante' }],
            exits: [{ dir: 'south', id: null, label: 'Exit to street' }],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'The studio is alive. Half-finished works everywhere. Kwame is at his easel.', effects: null },
            timeCost: 0,
            tags: ['studio', 'tiled', 'generated'],
        }
    ],
};

// ─────────────────────────────────────────────
// Generated multi-room venues
// ─────────────────────────────────────────────

const SOHO_GALLERY = {
    id: 'soho_gallery',
    name: 'SoHo Gallery — Group Show',
    desc: 'A three-room contemporary gallery in SoHo with lobby, exhibition hall, and private office.',
    startRoom: 'soho_gallery_lobby_main',
    timeLimit: 5,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: 'soho_gallery_lobby_main',
            venue: 'soho_gallery',
            name: 'Gallery — Lobby',
            desc: 'Gallery — Lobby',
            look: 'A gallery interior.',
            items: [],
            characters: [{ id: 'receptionist' }],
            exits: [{ dir: 'south', id: null, label: 'Exit' }],
            eavesdrops: [],
            timeCost: 0,
            tags: ['gallery', 'tiled', 'generated'],
        },
        {
            id: 'soho_gallery_exhibition_main',
            venue: 'soho_gallery',
            name: 'Main Exhibition',
            desc: 'Main Exhibition',
            look: 'A gallery interior.',
            items: [],
            characters: [{ id: 'gallery_dealer' }],
            exits: [{ dir: 'south', id: null, label: 'Exit' }],
            eavesdrops: [],
            timeCost: 0,
            tags: ['gallery', 'tiled', 'generated'],
        },
        {
            id: 'soho_gallery_office_main',
            venue: 'soho_gallery',
            name: 'Back Office',
            desc: 'Back Office',
            look: 'An office interior.',
            items: [],
            characters: [{ id: 'gallery_owner' }],
            exits: [{ dir: 'south', id: null, label: 'Exit' }],
            eavesdrops: [],
            timeCost: 0,
            tags: ['office', 'tiled', 'generated'],
        },
    ],
};

// ─────────────────────────────────────────────
// VENUE 10: CHELSEA GALLERY (Showcase Room)
// ─────────────────────────────────────────────

const CHELSEA_GALLERY = {
    id: 'chelsea_gallery',
    name: 'Chelsea Gallery — New Works',
    desc: 'A polished Chelsea gallery. Beige floors, gold accents, serious contemporary art.',
    startRoom: 'chelsea_gallery_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: 'chelsea_gallery_main',
            venue: 'chelsea_gallery',
            name: 'Main Exhibition',
            desc: 'A curated show of contemporary works. Nine paintings line the walls. A gold sofa faces the north wall.',
            look: 'Warm beige floors, white walls, track lighting. A reception desk sits near the entrance. Plants soften the corners. The dealer watches from near the back.',
            items: [],
            characters: [{ id: 'elena_ross' }],
            exits: [{ dir: 'south', id: null, label: 'Exit to street' }],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'The gallery is warm and inviting. Gold accents catch the light. Nine paintings demand your attention.', effects: null },
            timeCost: 0,
            tags: ['gallery', 'tiled', 'showcase'],
        }
    ],
};

// ─────────────────────────────────────────────
// VENUE 11: CHELSEA SHOWCASE (Museum Gallery)
// Generated by tools/generate_room.js (museum template)
// ─────────────────────────────────────────────

const CHELSEA_SHOWCASE = {
    id: 'chelsea_showcase',
    name: 'Chelsea Showcase — Contemporary Masters',
    desc: 'A museum-quality gallery in West Chelsea. Beige floors, gold accents, nine works from Basquiat to Asante.',
    startRoom: 'chelsea_showcase_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: 'chelsea_showcase_main',
            venue: 'chelsea_showcase',
            name: 'Museum Gallery',
            desc: 'Nine paintings line the walls — Basquiat, Haring, Koons, Sherman. A gold sofa faces the north wall. Elena Ross watches from near the reception desk.',
            look: 'Warm beige floors, white walls with picture rail molding. Four large paintings dominate the north wall. A gold viewing sofa sits on a Persian rug. The reception desk has a laptop and a desk lamp. Plants soften the corners. Elena Ross stands near the east wall, drink in hand.',
            items: [],
            characters: [{ id: 'elena_ross' }],
            exits: [{ dir: 'south', id: null, label: 'Exit to street' }],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'The gallery is warm and hushed. Nine paintings demand your attention — Basquiat crowns, Haring babies, a Koons that catches the light. Elena Ross nods from across the room.', effects: null },
            timeCost: 0,
            tags: ['gallery', 'tiled', 'museum', 'showcase'],
        }
    ],
};

// ─────────────────────────────────────────────
// VENUE: FOSSIL MUSEUM — Natural History Wing
// Tileset: fossil_museum_48x48 (Princess-Phoenix, DeviantArt)
// ─────────────────────────────────────────────

const FOSSIL_MUSEUM = {
    id: 'fossil_museum',
    name: 'Fossil Museum — Paleontology Wing',
    desc: 'The natural history museum\'s paleontology wing. Two complete dinosaur skeletons tower over gray stone floors. The air smells like old rock and polished brass.',
    startRoom: 'fossil_museum_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: 'fossil_museum_main',
            venue: 'fossil_museum',
            name: 'Paleontology Wing',
            desc: 'A grand hall with vaulted arches. Two dinosaur skeletons — a T-Rex and a velociraptor pack — dominate the center. Display cases line the walls with amber, fossils, and geological specimens.',
            look: 'The T-Rex skull alone is worth more than your apartment. The information plaques are written in that particular museum tone — confident, timeless, faintly condescending.',
            items: [],
            characters: [
                { id: 'dr_morton', desc: 'The museum curator. Tweed jacket, reading glasses on a chain. Knows the provenance of every bone in this building.' }
            ],
            exits: [{ dir: 'south', id: null, label: 'Exit to street' }],
            eavesdrops: [
                { id: 'fossil_child', desc: 'A child and parent by the display case', content: 'A child tugs their parent\'s sleeve: "Is that one real?" The parent hesitates too long.', effects: null },
                { id: 'fossil_students', desc: 'Two students near the raptor display', content: 'Two paleontology students argue about cladistics near the raptor display.', effects: null },
                { id: 'fossil_guard', desc: 'A security guard by the exit', content: 'A security guard yawns. Night shifts in the fossil wing are quiet.', effects: null },
            ],
            onEnter: { firstVisitOnly: true, text: 'You step into the paleontology wing and stop. The T-Rex skeleton is enormous — jaws open, frozen mid-roar. Across the hall, a pack of velociraptors seems to track your movement. Dr. Morton adjusts his glasses and walks over.', effects: null },
            timeCost: 0,
            tags: ['museum', 'tiled', 'fossil', 'cultural'],
        }
    ],
};

// ─────────────────────────────────────────────
// VENUE: ART GALLERY MUSEUM (Pre-composed LimeZu background)
// Generated by tools/bg_room_builder.py
// ─────────────────────────────────────────────

const ART_GALLERY_MUSEUM = {
    id: 'art_gallery_museum',
    name: 'Metropolitan Art Gallery',
    desc: 'A grand museum gallery with columns, arched corridors, and masterworks from Hokusai to the Renaissance.',
    startRoom: 'art_gallery_museum_main',
    timeLimit: 4,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: 'art_gallery_museum_main',
            venue: 'art_gallery_museum',
            name: 'Metropolitan Gallery',
            desc: 'The Great Wave. The Starry Night study. A suspected La Gioconda workshop copy. The lighting is museum-perfect.',
            look: 'Columns and arches frame the galleries. Display cases hold illuminated manuscripts and Roman bronze. A curator watches from behind the reception desk.',
            items: [],
            characters: [{ id: 'curator_ward' }],
            exits: [{ dir: 'south', id: null, label: 'Exit to street' }],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'You step through the columns and the gallery opens before you. The Great Wave dominates the upper gallery. Below, arched corridors lead to display cases and medieval manuscripts.', effects: null },
            timeCost: 0,
            tags: ['museum', 'tiled', 'bgimage', 'masterworks'],
        }
    ],
};

// ─────────────────────────────────────────────
// VENUE: MUSEUM ENTRANCE (Pre-composed LimeZu background)
// Generated by tools/bg_room_builder.py
// ─────────────────────────────────────────────

const MUSEUM_ENTRANCE = {
    id: 'museum_entrance',
    name: 'Museum Entrance Hall',
    desc: 'Ticket booth, artifact displays, and a security guard who has seen everything.',
    startRoom: 'museum_entrance_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: 'museum_entrance_main',
            venue: 'museum_entrance',
            name: 'Entrance Hall',
            desc: 'The museum entrance. Greek amphoras and Egyptian scarabs guard the threshold. A ticket booth demands $25.',
            look: 'High ceilings. Display cases filled with ancient pottery. A turnstile separates the lobby from the galleries proper.',
            items: [],
            characters: [{ id: 'museum_guard' }],
            exits: [{ dir: 'south', id: null, label: 'Exit museum' }],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'The entrance hall echoes with footsteps on marble. Glass cases display Greek amphoras and Egyptian scarabs. A guard nods as you pass.', effects: null },
            timeCost: 0,
            tags: ['museum', 'tiled', 'bgimage', 'entrance'],
        }
    ],
};

// ─────────────────────────────────────────────
// VENUE: DINOSAUR MUSEUM (Pre-composed LimeZu background)
// Generated by tools/bg_room_builder.py
// ─────────────────────────────────────────────

const DINOSAUR_MUSEUM = {
    id: 'dinosaur_museum',
    name: 'Natural History — Dinosaur Hall',
    desc: 'Complete skeletons tower overhead. A painted Triceratops watches from the north wall. Dr. Chen knows every bone.',
    startRoom: 'dinosaur_museum_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: 'dinosaur_museum_main',
            venue: 'dinosaur_museum',
            name: 'Dinosaur Hall',
            desc: 'The Parasaurolophus centerpiece could produce sounds audible for miles. The collection includes Pachycephalosaurus, Ankylosaurus, and extensive fossil beds.',
            look: 'Bones upon bones. The hall is cathedral-like. Display cases line the walls. The painted Triceratops mural at the far end feels almost alive.',
            items: [],
            characters: [{ id: 'dr_chen' }],
            exits: [{ dir: 'south', id: null, label: 'Exit hall' }],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'The Dinosaur Hall opens before you — a cathedral of bones. Pachycephalosaurus skulls ten inches thick. Ankylosaurus armor plates. And at the center, a complete Parasaurolophus skeleton.', effects: null },
            timeCost: 0,
            tags: ['museum', 'tiled', 'bgimage', 'dinosaurs'],
        }
    ],
};

// ─────────────────────────────────────────────
// VENUE: SMALL GALLERY (Pre-composed LimeZu background)
// Generated by tools/bg_room_builder.py
// ─────────────────────────────────────────────

const SMALL_GALLERY = {
    id: 'small_gallery',
    name: 'Contemporary Art Studio',
    desc: 'A compact contemporary gallery. Elena Ross is handling the Nomura and Osei pieces.',
    startRoom: 'small_gallery_main',
    timeLimit: 3,
    availableWeeks: 'any',
    frequency: 'always',
    requires: null,
    rooms: [
        {
            id: 'small_gallery_main',
            venue: 'small_gallery',
            name: 'Contemporary Works',
            desc: 'Three works: Nomura\'s "Untitled (Meridian)", Osei\'s "Crown (Gold)", and Nomura\'s "Binary Sunset #7". Elena Ross is circling.',
            look: 'Small but curated. Warm lighting on white walls. The gold leaf on Osei\'s piece catches the gallery spots.',
            items: [],
            characters: [{ id: 'elena_ross' }],
            exits: [{ dir: 'south', id: null, label: 'Exit gallery' }],
            eavesdrops: [],
            onEnter: { firstVisitOnly: true, text: 'A small gallery, perfectly lit. Three works demand your attention. Elena Ross stands near the Nomura, watching.', effects: null },
            timeCost: 0,
            tags: ['gallery', 'tiled', 'bgimage', 'contemporary'],
        }
    ],
};

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

export const VENUES = [
    GALLERY_OPENING,
    COCKTAIL_PARTY,
    AUCTION_HOUSE,
    ARTIST_STUDIO,
    ART_FAIR_BASEL,
    FREEPORT,
    GALLERY_TEST,
    UPTOWN_GALLERY,
    ARTIST_STUDIO_VISIT,
    SOHO_GALLERY,
    CHELSEA_GALLERY,
    CHELSEA_SHOWCASE,
    FOSSIL_MUSEUM,
    ART_GALLERY_MUSEUM,
    MUSEUM_ENTRANCE,
    DINOSAUR_MUSEUM,
    SMALL_GALLERY,
];

/**
 * Flat lookup: roomId → room object
 */
export const ROOM_MAP = {};
for (const venue of VENUES) {
    for (const room of venue.rooms) {
        ROOM_MAP[room.id] = room;
    }
}

/**
 * Venue lookup: venueId → venue object
 */
export const VENUE_MAP = {};
for (const venue of VENUES) {
    VENUE_MAP[venue.id] = venue;
}
