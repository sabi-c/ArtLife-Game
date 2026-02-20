# 🍸 Cocktail Party — Private Collector's Penthouse

## Venue Overview

```json
{
  "id": "cocktail_party",
  "name": "Cocktail Party — Upper East Side",
  "desc": "A private collector's penthouse. By invitation only. Allegedly.",
  "startRoom": "penthouse_foyer",
  "timeLimit": 6,
  "availableWeeks": "any",
  "frequency": "every 4-8 weeks",
  "requires": { "reputation": { "min": 15 } }
}
```

**Location:** Upper East Side, Manhattan. A pre-war building with a doorman who remembers names.
**Calendar:** Every 4–8 weeks. Saturday evening. The kind of event you hear about through whispers.
**Time budget:** 6 actions. More time than a gallery opening — conversations run longer here.
**Who's here:** The serious people. No gallery assistants, no art students. Collectors, advisors, a dealer or two. The host's collection is on the walls — and it's remarkable.
**The feel:** Old money pretending to be casual. The drinks are good. The art on the walls is better. And every conversation is a transaction wearing a social mask.

---

## Room Map

```
  ┌──────────────┐
  │    STUDY     │
  │  (locked)    │
  └──────┬───────┘
         │ requires: npcFavor.host ≥ 5 OR intel ≥ 8
  ┌──────┴───────┐       ┌───────────────┐
  │ LIVING ROOM  │◄──────│    FOYER      │
  │              │       │   (start)     │
  └──────┬───────┘       └───────────────┘
         │
  ┌──────┴───────┐       ┌───────────────┐
  │   TERRACE    │──────►│  POWDER ROOM  │
  │              │       │               │
  └──────────────┘       └───────────────┘
```

---

## Room: The Foyer

**Start room.** The threshold between outside and inside.

```json
{
  "id": "penthouse_foyer",
  "venue": "cocktail_party",
  "name": "The Foyer",
  "desc": "Marble floors. A Warhol by the coat check.",
  "look": "The elevator opens directly into the apartment — because of course it does. The foyer is larger than most Manhattan studios: Carrara marble floors, a slim console table holding a vase of white peonies, and a Warhol dollar sign painting hung casually by the coat rack, as if to say 'yes, we know.'\n\nA young woman in a black dress takes your coat with a practiced smile. From deeper inside, you hear conversation, ice in glasses, and something by Miles Davis played at exactly the right volume — loud enough to set a mood, quiet enough to make you lean in.",
  "items": [
    {
      "name": "Warhol dollar sign painting",
      "desc": "A genuine Warhol. Small — maybe 20 × 16 inches. Dollar signs in acid green and pink on a black ground. Worth somewhere between $300K and $800K depending on the day. And they hung it by the coats. That's either supreme confidence or a very specific kind of message.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    },
    {
      "name": "marble console table",
      "desc": "Beneath the peonies: a neat stack of business cards in a silver tray. You thumb through — art advisors, private wealth managers, a foundation director. The social registry of tonight's event.",
      "isTakeable": false,
      "requires": null,
      "onLook": { "intel": 1 }
    }
  ],
  "characters": [
    {
      "id": "coat_check_attendant",
      "desc": "The coat check attendant — early twenties, clearly a gallerist's assistant moonlighting — gives you a numbered ticket and a half-smile that says she's cataloguing everyone.",
      "topics": ["guest_list", "the_host"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "in",
      "id": "penthouse_living_room",
      "label": "Walk into the living room",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The elevator doors open and you step into a world that smells like expensive candles and old money. Somewhere inside, someone laughs — the kind of laugh that costs $10,000 a year in social maintenance.",
    "effects": null
  },
  "timeCost": 0,
  "tags": ["social", "entry", "upper-east-side"]
}
```

---

## Room: The Living Room

The main event. Where the collection lives and the deals happen.

```json
{
  "id": "penthouse_living_room",
  "venue": "cocktail_party",
  "name": "The Living Room",
  "desc": "Floor-to-ceiling windows. Twelve paintings. Twenty people pretending not to look at each other.",
  "look": "The living room is enormous and immaculate — the kind of space that exists only in pre-war penthouses and the fantasies of interior design magazines. Floor-to-ceiling windows on two sides frame the East River and the Queensboro Bridge. But nobody is looking at the view.\n\nThey're looking at the walls. And the walls are extraordinary.\n\nA de Kooning woman. A small Basquiat crown painting. A pair of Richard Serras in charcoal on paper. And — hung above the fireplace with the confidence of someone who doesn't need to prove anything — a late Rothko in deep maroon and black, the color of dried wine.\n\nTwenty people mill about in clusters of two and three. A bartender in a white jacket mixes drinks from behind a Nakashima slab table that probably cost more than the bartender's apartment. The conversation is low, strategic, and constant.",
  "items": [
    {
      "name": "de Kooning painting",
      "desc": "Woman III study on paper, circa 1952. The gestural marks are violent and alive — you can feel the energy fifty years later. You check the frame backing: Gagosian label, previously exhibited at MoMA. Conservative estimate: $4–6 million. Your host has this hanging next to the kitchen door.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    },
    {
      "name": "Basquiat crown painting",
      "desc": "Small — maybe 24 × 18 inches. Oilstick on paper. A crown, two crossed-out words, and a date: 1983. The year before everything went sideways. This is the kind of piece that anchors a collection. It tells you everything about what the host values: raw energy over polish.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    },
    {
      "name": "the Rothko",
      "desc": "You stand in front of it for a full minute. The maroon field breathes — it actually seems to pulse when you let your eyes go soft. This is a $25 million painting hung above a fireplace in a private home. Some people would call that a crime. Others would call it the whole point.",
      "isTakeable": false,
      "onLook": { "reputation": 1 }
    },
    {
      "name": "Nakashima bar table",
      "desc": "A five-foot slab of black walnut with a live edge. George Nakashima, probably 1960s. The bartender is slicing limes on a cutting board placed carefully on one end. Furniture as sculpture. The host gets it.",
      "isTakeable": false,
      "onLook": null
    }
  ],
  "characters": [
    {
      "id": "the_host",
      "desc": "The host — Arthur Graves, second-generation collector and habitual over-pourer — is near the Rothko, holding court. He's telling a story about meeting Twombly in Rome. You can't tell if he's embellishing or underplaying it. With Arthur, it could be either.",
      "topics": ["collection_strategy", "market_outlook", "selling_a_piece", "studio_visit_invite"],
      "requires": null
    },
    {
      "id": "elena_ross",
      "desc": "Elena Ross is here too — standing near the windows, drink in hand, scanning the room with the systematic attention of someone who plans conversations three moves ahead.",
      "topics": ["partnership", "tonight_collection", "art_fair_plans"],
      "requires": null
    },
    {
      "id": "art_advisor",
      "desc": "Margaux Vidal, an art advisor with a client list she never discusses, is examining the Serra drawings with a loupe. She looks up as you approach — appraising you the way she appraises art.",
      "topics": ["serra_drawings", "client_work", "hidden_gems"],
      "requires": { "reputation": { "min": 25 } }
    }
  ],
  "exits": [
    {
      "dir": "back",
      "id": "penthouse_foyer",
      "label": "Return to the foyer",
      "block": null,
      "requires": null
    },
    {
      "dir": "outside",
      "id": "penthouse_terrace",
      "label": "Step out onto the terrace",
      "block": null,
      "requires": null
    },
    {
      "dir": "hallway",
      "id": "penthouse_study",
      "label": "Slip down the hallway toward the study",
      "block": "Arthur's assistant appears from nowhere. 'That area's private this evening.' You'd need a closer relationship with the host — or enough intel to know what's in there.",
      "requires": { "OR": [{ "npcFavor": { "the_host": { "min": 5 } } }, { "intel": { "min": 8 } }] }
    }
  ],
  "eavesdrops": [
    {
      "id": "advisor_client_call",
      "desc": "Margaux Vidal steps away from the Serra drawings to take a hushed phone call",
      "requires": { "intel": { "min": 6 } },
      "content": "\"—no, tell them we're passing. The provenance has a gap between '74 and '89 and nobody can explain it. I don't care how good the price is. We're not touching it.\"\n\nA pause.\n\n\"Yes, I said passing. Permanently. And tell the other clients too — nobody in my stable buys that work. Someone will, and they'll regret it.\"",
      "effects": { "intel": 3 },
      "unlocks": "provenance_warning",
      "oneShot": true
    },
    {
      "id": "collector_rivalry",
      "desc": "Two collectors near the bar, voices low but heated",
      "requires": { "intel": { "min": 4 } },
      "content": "\"He bought three at the opening. Three. Before anyone else even had a chance.\"\n\"That's not how it works. You call the gallery beforehand, you—\"\n\"That IS how it works. For him. The gallery plays favorites and we all pretend it's fair.\"",
      "effects": { "intel": 1 },
      "unlocks": null,
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "You step into the living room and the Rothko hits you before anything else — a wall of deep maroon that makes the room feel like it has a heartbeat.",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["social", "high-value", "collection", "main"]
}
```

---

## Room: The Terrace

The outdoor escape. Night air, city lights, and the conversations people don't want overheard inside.

```json
{
  "id": "penthouse_terrace",
  "venue": "cocktail_party",
  "name": "The Terrace",
  "desc": "East River below. Bridge lights. The cold air sharpens everything.",
  "look": "The terrace wraps around two sides of the penthouse. The East River is a dark ribbon thirty floors below, crossed by the Queensboro Bridge lit up like a circuit board. Potted boxwoods line the railing — someone's idea of nature. Two heat lamps glow orange at either end.\n\nOut here, the rules change. People say things on terraces they'd never say inside. The cold air works like truth serum. Or maybe it's just that nobody thinks the walls have ears when there are no walls.",
  "items": [
    {
      "name": "abandoned cocktail napkin",
      "desc": "A cocktail napkin with a phone number and two words written in blue ink: 'CALL MONDAY.' No name. Someone made a deal tonight.",
      "isTakeable": true,
      "onTake": { "intel": 1 },
      "onLook": null
    },
    {
      "name": "view of the Queensboro Bridge",
      "desc": "Thirty stories up, the bridge looks like a diagram of ambition — cables reaching for something they can never quite hold. The river below is black and patient. You think about how much money is sitting in the room behind you and how none of it matters to the water.",
      "isTakeable": false,
      "onLook": null
    }
  ],
  "characters": [
    {
      "id": "philippe_noir",
      "desc": "Philippe Noir is out here alone, leaning on the railing with a whisky neat. He looks like he's been waiting for someone. Maybe you.",
      "topics": ["off_the_record", "rival_weakness", "dangerous_opportunity"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "inside",
      "id": "penthouse_living_room",
      "label": "Go back inside",
      "block": null,
      "requires": null
    },
    {
      "dir": "around",
      "id": "penthouse_powder_room",
      "label": "Walk around the terrace to the side entrance",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "terrace_confession",
      "desc": "Two figures at the far end of the terrace, faces lit by phone screens, voices carrying on the wind",
      "requires": { "intel": { "min": 5 } },
      "content": "\"I need to move the Hirst by end of quarter. My accountant says if I don't realize the loss this year, the tax situation becomes—\"\n\"How much are you willing to lose?\"\n\"Forty percent. Maybe fifty. I just need it gone.\"\n\"...I might know someone. But they'll want provenance documentation by Friday.\"",
      "effects": { "intel": 2, "cash": 0 },
      "unlocks": "distressed_hirst_sale",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The cold air slaps you awake. Thirty floors up, Manhattan looks like a spreadsheet made of light.",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["outdoor", "private", "candid"]
}
```

---

## Room: The Powder Room

Not actually a powder room. It's the corridor between the public and private parts of the apartment, where you're not quite supposed to be.

```json
{
  "id": "penthouse_powder_room",
  "venue": "cocktail_party",
  "name": "The Hallway",
  "desc": "Between the public rooms and the private ones. You're not sure you should be here.",
  "look": "The hallway connects the terrace's side entrance to the private wing. The carpet is thick enough to absorb footsteps. On the wall: three small photographs in matching frames — Cindy Sherman, Nan Goldin, Francesca Woodman. All self-portraits. All unsettling in different ways.\n\nA door at the end of the hall is slightly ajar. Through the gap: bookshelves, a desk lamp, the corner of a painting you can't quite make out. The study.\n\nYou can hear the party behind you, muffled. In here, you're in the space between invitation and intrusion.",
  "items": [
    {
      "name": "Cindy Sherman photograph",
      "desc": "Untitled Film Still #21, 1978. The one where she looks like a young career woman arriving in the city, gazing up at skyscrapers. Printed small, intimate. Worth about $500K at last auction. The host hung it in the hallway like it's wallpaper. That's either modesty or the most expensive flexin art history.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    },
    {
      "name": "coat closet — slightly open",
      "desc": "You nudge the door. Inside: coats, a fur that looks like it hasn't been worn since 1985, and — wedged behind a garment bag — a small painting in a padded sleeve. Unframed. No label. Someone stashed this here recently. You recognize the style: it's by the same artist showing at the Chelsea gallery tonight. Why would the host have an unshown work hidden in a coat closet?",
      "isTakeable": false,
      "requires": { "intel": { "min": 5 } },
      "onLook": { "intel": 3 }
    }
  ],
  "characters": [],
  "exits": [
    {
      "dir": "back",
      "id": "penthouse_terrace",
      "label": "Return to the terrace",
      "block": null,
      "requires": null
    },
    {
      "dir": "study",
      "id": "penthouse_study",
      "label": "Push through the door to the study",
      "block": "You reach for the door handle but hesitate. Going in uninvited is a risk. You'd need a relationship with the host — or enough nerve.",
      "requires": { "OR": [{ "npcFavor": { "the_host": { "min": 5 } } }, { "intel": { "min": 8 } }] }
    }
  ],
  "eavesdrops": [],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "You're in the hallway between the party and the private rooms. The noise drops by half. The photographs on the wall stare back at you like witnesses.",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["transitional", "private", "risky"]
}
```

---

## Room: The Study

🔒 **Requires:** Host NPC Favor ≥ 5 OR Intel ≥ 8

The inner sanctum. Where the host keeps the collection he doesn't show at parties.

```json
{
  "id": "penthouse_study",
  "venue": "cocktail_party",
  "name": "The Study",
  "desc": "Leather, lamplight, and the art he doesn't show anyone.",
  "look": "The study is small and warm and completely at odds with the performative elegance of the rest of the apartment. A leather club chair. A standing lamp with a green shade. Bookshelves on three walls — real books, read books, with spines that are cracked and annotated.\n\nAnd behind the desk, resting on a museum-grade easel: a painting that makes you stop breathing for a second.\n\nIt's a Cy Twombly. Late period. Chalk and oil on a grey ground, those famous loops and scrawls that look like a child's handwriting until you realize they're the most sophisticated marks in postwar art. This is the one he tells the story about — meeting Twombly in Rome, buying it directly from the studio.\n\nA ledger sits open on the desk. The host isn't sentimental. He tracks everything — purchase price, insurance valuation, current market estimate. This painting was bought for $120,000 in 1994. The current estimate column reads $8.5M.",
  "items": [
    {
      "name": "Cy Twombly painting",
      "desc": "Late period Twombly. Chalk, wax crayon, and oil on grey-primed canvas. The loops spiral across the surface like a fever chart of emotion. You've seen Twomblys in museums. This one, in this room, under this light, is different. It's not performing for an audience. It's just being itself. You understand suddenly why the host doesn't hang it in the living room. Some things aren't for showing.",
      "isTakeable": false,
      "onLook": { "reputation": 2, "intel": 2 }
    },
    {
      "name": "ledger on the desk",
      "desc": "The host's private collection ledger. Hand-ruled columns: Date Acquired, Source, Purchase Price, Insurance Value, Market Estimate. You scan the entries:\n\n• de Kooning Woman III study — $640K (1998) → $5.2M\n• Basquiat crown — $180K (2001) → $3.8M\n• Rothko (maroon/black) — $4.2M (2005) → $25M\n• Twombly (Rome) — $120K (1994) → $8.5M\n\nThe total at the bottom is circled twice: $56.4M. This man turned $6 million into $56 million by buying what he loved. That's not investing. That's taste as a superpower.",
      "isTakeable": false,
      "requires": { "intel": { "min": 6 } },
      "onLook": { "intel": 5 }
    },
    {
      "name": "annotated exhibition catalogue",
      "desc": "A catalogue from a 2018 retrospective at the Whitney. The margins are filled with the host's handwriting — notes on condition, provenance questions, comparisons to other works. One note catches your eye: 'Watch for early works at estate sales — the widow doesn't know what she has.' That was three years ago. You wonder if he followed through.",
      "isTakeable": false,
      "onLook": { "intel": 2 }
    }
  ],
  "characters": [
    {
      "id": "the_host",
      "desc": "Arthur Graves is here — he must have slipped away from the party. He's in the club chair, shoes off, a glass of port in hand. He looks up when you enter and his expression is... pleased. Not surprised. 'You found it,' he says. 'Good. Sit down.'",
      "topics": ["twombly_story", "collection_philosophy", "private_deal", "mentorship"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "out",
      "id": "penthouse_living_room",
      "label": "Return to the party",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The study smells like leather and old paper. The Twombly on the easel catches the lamplight and the loops seem to move. Arthur looks up from his chair. 'Close the door,' he says. Not unkindly.",
    "effects": { "reputation": 3 }
  },
  "timeCost": 1,
  "tags": ["private", "high-value", "mentorship", "endgame"]
}
```

---

## NPC Scheduling Notes

- **Arthur Graves (the host)** — always present. Starts in Living Room, moves to Study mid-event
- **Elena Ross** — appears at 60% of cocktail parties
- **Philippe Noir** — appears only on the Terrace, 40% chance
- **Margaux Vidal (art advisor)** — appears if player reputation ≥ 25
- **Coat check attendant** — always present in Foyer (minor NPC)

---

## Venue Encounters

1. **The Toast** — Host makes a speech in Living Room → player chooses: listen politely (rep+2), use distraction to examine art closely (intel+3), or network during the speech (social contact)
2. **The Offer You Can't Refuse** — If rep ≥ 50 + host favor ≥ 8: Arthur offers a piece from his collection at below-market. One-time opportunity.
3. **The Rival Arrives** — A rival collector appears at Living Room door. Forced dialogue — they're here for the same Rothko you've been eyeing.

---

## Tags
#rooms #cocktail-party #upper-east-side #new-york #venue
