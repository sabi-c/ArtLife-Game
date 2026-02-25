# 🔨 Auction House — Rockefeller Plaza

## Venue Overview

```json
{
  "id": "auction_house",
  "name": "Christie's — Rockefeller Plaza",
  "desc": "The theater of the market. High ceilings, hushed voices, and the smell of fear.",
  "startRoom": "auction_main_hall",
  "timeLimit": 5,
  "availableWeeks": "auction_weeks",
  "frequency": "seasonal (May/Nov)",
  "requires": { "reputation": { "min": 20 } }
}
```

**Location:** Rockefeller Plaza, New York
**Calendar:** Major evening sales in May and November. Day sales in between.
**Time budget:** 5 actions. The sale moves fast.
**Who's here:** Everyone who matters. The mega-dealers, the advisors, the hedge fund guys, and the people who used to own the art.
**The feel:** A courtroom where the only crime is being poor. The tension is physical.

---

## Room Map

```
                     ┌─────────────┐
                     │   PRIVATE   │
                     │   VIEWING   │
                     └──────┬──────┘
                            │ requires: reputation ≥ 60 OR intel ≥ 8
  ┌──────────┐       ┌──────┴──────┐       ┌──────────┐
  │ CASHIER  │◄──────│   BIDDING   │◄──────│ MAIN HALL│
  │ (Exit)   │       │    FLOOR    │       │ (Start)  │
  └──────────┘       └─────────────┘       └──────────┘
```

---

## Room: Main Hall

**Start room.** The staging area. Registration paddles and champagne.

```json
{
  "id": "auction_main_hall",
  "venue": "auction_house",
  "name": "Main Hall",
  "desc": "Marble floors. A registration desk that judges you.",
  "look": "The lobby is designed to make you feel small. Three stories of glass and limestone. A banner hangs from the ceiling: 'masterpieces from the Estate of...' followed by a name that used to mean power. Now it just means inventory.\n\nThe registration desk is a fortress. Behind it, assistants in impeccable suits hand out paddles like weapons. To your left, a champagne bar serves vintage Dom Pérignon to people who are about to spend millions. To your right, the entrance to the bidding floor, guarded by security.",
  "items": [
    {
      "name": "stack of catalogs",
      "desc": "Heavy, glossy, and smelling of ink. The cover lot is a Rothko. Estimate: upon request. You flip through it — the estimates are conservative. Teaser rates. They want a bidding war.",
      "isTakeable": true,
      "onTake": { "intel": 1 },
      "onLook": null
    },
    {
      "name": "champagne bar",
      "desc": "Free alcohol. In a casino, they give you drinks to keep you gambling. Here, they give you drinks so you numb the part of your brain that understands value.",
      "isTakeable": false,
      "onLook": null
    },
    {
      "name": "digital screen",
      "desc": "Scrolling currency conversions: USD, GBP, EUR, HKD, CNY. The numbers move faster than you can read. Money doesn't sleep, and it definitely doesn't stay in one currency.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    }
  ],
  "characters": [
    {
      "id": "marcus_price",
      "desc": "Marcus Price is near the bar, looking anxious. He's checking his phone every four seconds. His client is late, or bail didn't come through.",
      "topics": ["tonight_estimates", "client_gossip", "market_correction"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "in",
      "id": "auction_bidding_floor",
      "label": "Enter the Bidding Floor",
      "block": "Security stops you. 'Registration first, please.'",
      "requires": null
    },
    {
      "dir": "out",
      "id": "rockefeller_plaza",
      "label": "Leave the auction",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "specialist_whisper",
      "desc": "A specialist briefing a client near the coat check",
      "requires": { "intel": { "min": 4 } },
      "content": "\"...the guarantee is third-party. The irrevocable bid is already in place. We're just going through the motions to establish a public price. It's sold.\"",
      "effects": { "intel": 3 },
      "unlocks": "third_party_guarantee_intel",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The air conditioning is set to 'refrigerated.' You can smell ozone and expensive dry cleaning.",
    "effects": null
  },
  "timeCost": 0,
  "tags": ["social", "market", "public"]
}
```

---

## Room: The Bidding Floor

The arena. Where prices become truth.

```json
{
  "id": "auction_bidding_floor",
  "venue": "auction_house",
  "name": "The Bidding Floor",
  "desc": "Rows of chairs. The rostrum. The silence before the drop.",
  "look": "Five hundred chairs arranged in a semicircle. The front rows are reserved for people who fly private. The back rows are for journalists and students. Along the side wall, a bank of telephones is manned by staff speaking in hushed French, Mandarin, and Russian.\n\nThe rostrum towers over everything. Behind it, a rotating display shows the current lot. Right now, it's a small canvas by a surrealist who died poor. The current bid is three million dollars.",
  "items": [
    {
      "name": "your paddle",
      "desc": "Plastic. White. Number 742. It feels light in your hand, but lifting it costs a fortune. It's the most dangerous object in the room.",
      "isTakeable": false,
      "onLook": null
    },
    {
      "name": "the currency display",
      "desc": "The numbers tick up in real-time. $3,000,000. £2,400,000. €2,800,000. It turns abstract after a while. Just scorekeeping.",
      "isTakeable": false,
      "onLook": null
    },
    {
      "name": "the telephone bank",
      "desc": "Twenty staff members on landlines. They are the avatars of the invisible money. One of them waves a hand — a new bid from Hong Kong.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    }
  ],
  "characters": [
    {
      "id": "rich_kid_rival",
      "desc": "Your rival is in the third row, whispering to an advisor. They look confident. Too confident.",
      "topics": ["bidding_strategy", "lot_47", "fake_politeness"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "back",
      "id": "auction_main_hall",
      "label": "Return to the Hall",
      "block": null,
      "requires": null
    },
    {
      "dir": "side",
      "id": "auction_private_viewing",
      "label": "Slip into the Private Viewing Room",
      "block": "A security guard blocks the velvet rope. 'Strictly private viewing, I'm afraid.'",
      "requires": { "reputation": { "min": 60 } }
    },
    {
      "dir": "cashier",
      "id": "auction_cashier",
      "label": "Go to the Cashier / Exit",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "telephone_bid",
      "desc": "A staff member covering the mouthpiece of her phone",
      "requires": { "intel": { "min": 6 } },
      "content": "\"...he says he's out. Wait. No. He says one more. But only if you can slow down the auctioneer. He needs a minute.\"",
      "effects": { "intel": 2 },
      "unlocks": "stalled_auction_intel",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The room is quieter than a church. The only sound is the auctioneer's rhythmical chant. 'Do I see five? Five million? Selling at four point eight...'",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["market", "high-stakes", "public"]
}
```

---

## Room: Private Viewing Room

🔒 **Requires:** Reputation ≥ 60 OR Intel ≥ 8

The inner sanctum. For VIPs and works with "issues."

```json
{
  "id": "auction_private_viewing",
  "venue": "auction_house",
  "name": "Private Viewing Room",
  "desc": " velvet ropes. A single painting on a stand.",
  "look": "This room doesn't exist on the floor plan. The walls are upholstered in grey silk. There is only one painting here, displayed on an easel under dedicated lighting.\n\nIt's a Renaissance panel. Dark varnish. Cracked wood. It was withdrawn from the sale this morning 'for further research.' Now you see why. It's too good to be true, or it's the discovery of the century. Three men in suits are arguing about it in low voices.",
  "items": [
    {
      "name": "the withdrawn lot",
      "desc": "Attributed to a follower of Titian. But the hands... the hands are perfect. If this is real, it's worth fifty million. If it's not, it's worth the wood it's painted on.",
      "isTakeable": false,
      "requires": { "intel": { "min": 5 } },
      "onLook": { "intel": 4 }
    },
    {
      "name": "condition report",
      "desc": "Lying open on a side table. 'Significant restoration visible under UV. Panel cradling serves no structural purpose. Provenance gap 1938-1946.' The kiss of death.",
      "isTakeable": false,
      "onLook": { "intel": 3, "suspicion": 1 }
    }
  ],
  "characters": [
    {
      "id": "senior_specialist",
      "desc": "The Head of Old Masters is rubbing his temples. He looks like he hasn't slept in a week.",
      "topics": ["provenance_gap", "private_treaty_sale", "attribution_error"],
      "requires": { "reputation": { "min": 50 } }
    }
  ],
  "exits": [
    {
      "dir": "out",
      "id": "auction_bidding_floor",
      "label": "Return to the Floor",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "attribution_argument",
      "desc": "The argument near the easel",
      "requires": { "intel": { "min": 5 } },
      "content": "\"...I don't care what the X-ray says. The underdrawing is clumsy. It's a workshop copy. If we sell this as the master, we're done. Pull it permanently.\"",
      "effects": { "intel": 4 },
      "unlocks": "titian_forgery_intel",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The air in here is heavy. The silence is different — it's the silence of a problem that money can't fix.",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["private", "secret", "high-value"]
}
```

---

## Room: Cashier / Exit

The reckoning.

```json
{
  "id": "auction_cashier",
  "venue": "auction_house",
  "name": "Settlement Office",
  "desc": "Where the winners pay.",
  "look": "A small, windowless room that looks like a high-end bank. The excitement of the bidding floor is gone. Here, it's just wire transfers and shipping forms. A printer hums rhythmically, spitting out invoices with six and seven zeros.\n\nThe exit to the street is through a side door. You don't walk out the front with a painting under your arm.",
  "items": [
    {
      "name": "shipping manifesto",
      "desc": "A list of destinations: The Geneva Freeport. The Singapore Freeport. A storage facility in Delaware. None of this art is going to anyone's home. It's just moving from one dark room to another.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    }
  ],
  "characters": [
    {
      "id": "account_manager",
      "desc": "Efficient. Unsmiling. She processes millions of dollars like she's scanning groceries.",
      "topics": ["payment_terms", "shipping_logistics", "tax_avoidance"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "out",
      "id": "rockefeller_plaza",
      "label": "Leave the auction",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [],
  "onEnter": null,
  "timeCost": 0,
  "tags": ["administrative", "exit"]
}
```

---

## Venue Encounters

1.  **The Mistaken Bid** — If player waves to a friend on the bidding floor, the auctioneer takes it as a bid. Requires quick reaction (Confirmation choice).
2.  **The Paddle Drop** — If `suspicion > 20`, security politely asks to see your registration documents again. Blocks entry to floor for 1 turn.
3.  **The Crash** — Only if market state is 'bear'. A major lot passes (unsold). The room goes silent. `marketHeat` drops by 10 instantly.

---

## Tags
#rooms #auction #high-stakes #market #venue
