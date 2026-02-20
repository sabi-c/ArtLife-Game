# 🌍 Art Basel — The Messeplatz

## Venue Overview

```json
{
  "id": "art_basel",
  "name": "Art Basel — The Messeplatz",
  "desc": "The Olympics of the art world. Too big, too bright, too much money.",
  "startRoom": "basel_main_hall",
  "timeLimit": 4, 
  "availableWeeks": "fair_weeks",
  "frequency": "annual (June)",
  "requires": { "reputation": { "min": 30 } }
}
```

**Location:** Messeplatz, Basel, Switzerland
**Calendar:** June. The center of the year.
**Time budget:** 4 actions. The fair is enormous (300 galleries), but your time is short. The best work sells in the first ten minutes.
**Who's here:** The entire industry. If they aren't here, they're dead or broke.
**The feel:** Airport terminal meets high-end shopping mall. Sterile light. Bad coffee. Incredible art treated like widgets.

---

## Room Map

```
                     ┌─────────────┐
                     │  VIP FIRST  │
                     │  CHOICE     │
                     └──────┬──────┘
                            │ requires: reputation ≥ 70
  ┌──────────┐       ┌──────┴──────┐       ┌──────────┐
  │  PRESS   │◄──────│ EXHIBITION  │──────►│ LOADING  │
  │  ROOM    │       │   HALL      │       │  DOCK    │
  └──────────┘       └───┬───▲─────┘       └──────────┘
                         │   │
                     ┌───▼───┴───┐
                     │ BLUE CHIP │
                     │   BOOTH   │
                     └───────────┘
```

---

## Room: Exhibition Hall

**Start room.** The sensory overload.

```json
{
  "id": "basel_main_hall",
  "venue": "art_basel",
  "name": "Messeplatz Hall 2",
  "desc": "Infinite rows of white walls. The hum of ten thousand deals.",
  "look": "The scale is oppressive. A grid of three hundred booths stretches to the horizon, each one a perfect white cube. The lighting is engineered to eliminate shadows and fatigue. You can smell new carpet and expensive perfume.\n\nCollectors sprint — actually sprint — from booth to booth. The fear of missing out is palpable. It's not about looking at art; it's about claiming it before someone else does.",
  "items": [
    {
      "name": "fair map",
      "desc": "A booklet the size of a novel. Galleries are arranged by hierarchy: the powerful in the center, the hopefuls at the edges. You are currently in the 'Feature' sector. The real power is in the 'Galleries' sector.",
      "isTakeable": true,
      "onTake": null,
      "onLook": null
    },
    {
      "name": "sales report screen",
      "desc": "A digital ticker shows confirmed sales. A Richter just went for $20M. A Basquiat for $45M. The numbers are reassuringly obscene.",
      "isTakeable": false,
      "onLook": { "marketHeat": 1 }
    }
  ],
  "characters": [
    {
      "id": "lorenzo_gallo",
      "desc": "Lorenzo Gallo is leaning against a pillar, looking bored. He's arguably the most powerful dealer in Europe. His boredom is a power move.",
      "topics": ["european_market", "venice_biennale", "tax_havens"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "center",
      "id": "basel_blue_chip_booth",
      "label": "Push into the center aisle (Blue Chip Galleries)",
      "block": null,
      "requires": null
    },
    {
      "dir": "up",
      "id": "basel_vip_lounge",
      "label": "Go upstairs to the First Choice Lounge",
      "block": "A steward checks your badge. 'VIP First Choice only until 2 PM.' Your badge is the wrong color.",
      "requires": { "reputation": { "min": 70 } }
    },
    {
      "dir": "side",
      "id": "basel_press_room",
      "label": "Duck into the Press Room",
      "block": null,
      "requires": { "intel": { "min": 4 } }
    },
    {
      "dir": "out",
      "id": "basel_tram_stop",
      "label": "Leave the fair",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "panicked_advisor",
      "desc": "An art advisor shouting into her phone near the exit",
      "requires": { "intel": { "min": 3 } },
      "content": "\"...I don't care that he's on a boat! Get him on the satellite phone. The Gagosian piece is already on hold. We have five minutes to counter or we lose it.\"",
      "effects": { "intel": 1 },
      "unlocks": null,
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "Your phone buzzes instantly. 'Network congestion.' There are too many billionaires in one building.",
    "effects": null
  },
  "timeCost": 0,
  "tags": ["public", "crowded", "high-stress"]
}
```

---

## Room: The Blue Chip Booth

The center of gravity. Gagosian, Hauser & Wirth, Pace.

```json
{
  "id": "basel_blue_chip_booth",
  "venue": "art_basel",
  "name": "Mega-Gallery Booth",
  "desc": "The prime real estate. Works you've seen in textbooks.",
  "look": "This isn't a booth; it's a museum wing. The carpet is thicker here. The lighting is better. On the back wall hangs a painting that was in the Tate retrospective last year. It's not for sale — it's 'on loan' to the booth to signal dominance.\n\nThree directors sit at a long white desk, ignoring everyone who isn't wearing a Patek Philippe. They aren't selling art; they are granting access to asset classes.",
  "items": [
    {
      "name": "the masterpiece",
      "desc": "A ten-foot canvas. Aggressive. Joyless. Important. It radiates money. The label says 'Price on Application,' which means if you have to ask, you're the wrong kind of rich.",
      "isTakeable": false,
      "onLook": { "reputation": 1 }
    },
    {
      "name": "iPad on the desk",
      "desc": "Left unattended for a split second. It shows the 'Available' list. Most works are marked 'Reserve: Museum' or 'Sold: Trustee.' The game is rigged.",
      "isTakeable": false,
      "requires": { "intel": { "min": 6 } },
      "onLook": { "intel": 3 }
    }
  ],
  "characters": [
    {
      "id": "senior_director",
      "desc": "She looks through you like you're made of glass. She's waiting for a specific collector from Qatar.",
      "topics": ["primary_market_access", "waiting_list", "upcoming_museum_shows"],
      "requires": { "reputation": { "min": 50 } }
    }
  ],
  "exits": [
    {
      "dir": "out",
      "id": "basel_main_hall",
      "label": "Back to the aisle",
      "block": null,
      "requires": null
    },
    {
      "dir": "back",
      "id": "basel_loading_dock",
      "label": "Slip through the service entrance",
      "block": "Staff only.",
      "requires": { "intel": { "min": 5 } }
    }
  ],
  "eavesdrops": [
    {
      "id": "gallery_gossip_basel",
      "desc": "Two directors whispering behind the desk",
      "requires": { "intel": { "min": 6 } },
      "content": "\"...we can't sell it to him. He flipped the condo piece last year. Blacklist him. Tell him it's promised to the Guggenheim.\"",
      "effects": { "intel": 2 },
      "unlocks": "blacklist_intel",
      "oneShot": true
    }
  ],
  "onEnter": null,
  "timeCost": 1,
  "tags": ["social", "exclusive", "high-value"]
}
```

---

## Room: VIP First Choice Lounge

🔒 **Requires:** Reputation ≥ 70

The oasis. Where the deals are celebrated or mourned.

```json
{
  "id": "basel_vip_lounge",
  "venue": "art_basel",
  "name": "VIP First Choice Lounge",
  "desc": "Oysters. Champagne. Silence.",
  "look": "The roar of the fair is dampened by sound-absorbing panels. Up here, it's a cocktail party. Waiters circulate with Ruinart and oysters. This is the only place in the building where people are sitting down.\n\nYou spot a famous hedge fund manager weeping silently in the corner. He missed the Jasper Johns.",
  "items": [
    {
      "name": "oyster bar",
      "desc": "Freshly shucked. Tastes like the ocean and 500-franc notes.",
      "isTakeable": false,
      "onLook": null
    },
    {
      "name": "financial times",
      "desc": "A stack of pink newspapers. The headline: 'Art Market Cools as Interest Rates Rise.' Nobody in this room seems to have noticed.",
      "isTakeable": true,
      "onTake": { "intel": 1 },
      "onLook": null
    }
  ],
  "characters": [
    {
      "id": "baroness_von_h",
      "desc": "The Baroness. She's bought more art in the last hour than you'll buy in your skirmish. She looks tired.",
      "topics": ["legacy_planning", "private_museums", "philanthropy"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "down",
      "id": "basel_main_hall",
      "label": "Return to the madness",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "billionaire_whisper",
      "desc": "A quiet conversation between two men in bespoke suits",
      "requires": { "intel": { "min": 8 } },
      "content": "\"...move the assets to the Singapore freeport. The Geneva regulations are getting too tight. I want the Rothko gone by Tuesday.\"",
      "effects": { "intel": 4 },
      "unlocks": "freeport_intel",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The steward nods at your badge. 'Welcome back.' You belong here now.",
    "effects": { "reputation": 2 }
  },
  "timeCost": 1,
  "tags": ["exclusive", "vip", "relaxing"]
}
```

---

## Room: Loading Dock

🔒 **Requires:** Intel ≥ 5 (Found via service entrance)

The reality check.

```json
{
  "id": "basel_loading_dock",
  "venue": "art_basel",
  "name": "Messeplatz Loading Dock",
  "desc": "Crates. Trucks. The unglamorous truth.",
  "look": "This is how the art gets here. Huge wooden crates stenciled with 'FRAGILE' and 'THIS WAY UP.' Art handlers in jumpsuits smoke cigarettes near idling trucks. It smells like diesel and raw pine.\n\nA crate has been pried open for customs inspection. You can see the corner of a painting worth more than the truck it arrived in.",
  "items": [
    {
      "name": "shipping manifest",
      "desc": "Taped to a crate. Sender: 'Private Collection, Cayman Islands.' Receiver: 'Gallery X, Basel.' Value: 'USD 12,000,000.' Description: 'Household Goods.'",
      "isTakeable": false,
      "requires": null,
      "onLook": { "intel": 2, "suspicion": 1 }
    }
  ],
  "characters": [],
  "exits": [
    {
      "dir": "in",
      "id": "basel_blue_chip_booth",
      "label": "Slip back into the fair",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "You step out of the sterile fair into the grit of logistics. This feels more real than anything inside.",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["behind-scenes", "industrial"]
}
```

---

## Room: Press Room

🔒 **Requires:** Intel ≥ 4

Where narrative is manufactured.

```json
{
  "id": "basel_press_room",
  "venue": "art_basel",
  "name": "Media Centre — Hall 1 Mezzanine",
  "desc": "Laptops. Deadlines. The smell of free coffee and desperation.",
  "look": "A low-ceilinged room carpeted in industrial grey. Fifty journalists sit at long tables, typing furiously. Monitors on the wall show a live feed of the fair floor. The WiFi actually works in here — a rare luxury.\n\nA press conference is wrapping up at the far end. A curator is defending a controversial acquisition while a reporter from The Art Newspaper asks pointed questions. Nobody looks happy.",
  "items": [
    {
      "name": "press releases",
      "desc": "A table overflowing with glossy handouts. Gallery announcements, artist statements, sales summaries. Most of them are propaganda. But buried in the stack: a leaked internal memo from a major gallery detailing their 'placement strategy' — which collectors get first access, and why.",
      "isTakeable": true,
      "onTake": { "intel": 2 },
      "onLook": null
    },
    {
      "name": "sales whiteboard",
      "desc": "An unofficial tally kept by journalists tracking confirmed sales. Updated in real-time with marker. '$450M total (Day 1).' Someone has written 'BUBBLE?' in red at the bottom. Someone else has crossed it out.",
      "isTakeable": false,
      "onLook": { "intel": 1, "marketHeat": 1 }
    }
  ],
  "characters": [
    {
      "id": "art_journalist",
      "desc": "Marta Reyes, critic for Frieze magazine. She looks exhausted but alert. She's the one who broke the Knoedler forgery story. She knows where the bodies are buried.",
      "topics": ["market_bubble", "gallery_scandals", "upcoming_exposé"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "out",
      "id": "basel_main_hall",
      "label": "Back to the fair floor",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "journalist_source",
      "desc": "A journalist taking a call in the corridor outside",
      "requires": { "intel": { "min": 6 } },
      "content": "\"...confirmed. Three works in the evening sale were guaranteed by the same buyer who's also bidding. It's circular. The auction house knows. They don't care as long as the headline number holds.\"",
      "effects": { "intel": 3 },
      "unlocks": "circular_guarantee_intel",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "You flash your badge. The guard waves you through without looking up. In here, you're either press or a source. Either way, you're useful.",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["information", "media", "intel-rich"]
}
```

---

## Venue Encounters

1.  **The Impulse Buy** — A dealer offers you a work "right now, before I email the PDF." High pressure. 10% discount but risky.
2.  **The Journalist** — Approach in Press Room. Trade intel for reputation boost.
3.  **The Double Book** — You promised to meet two different people at the same time. Choose one, burn the other.

---

## Tags
#rooms #art-basel #switzerland #mega-fair #venue
