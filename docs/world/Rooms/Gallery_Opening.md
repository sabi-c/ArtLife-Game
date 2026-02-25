# 🖼️ Gallery Opening — Chelsea

## Venue Overview

```json
{
  "id": "gallery_opening",
  "name": "Gallery Opening — Chelsea",
  "desc": "A converted warehouse in West Chelsea. Tonight's the opening.",
  "startRoom": "chelsea_main_floor",
  "timeLimit": 5,
  "availableWeeks": "any",
  "frequency": "every 3-6 weeks",
  "requires": null
}
```

**Location:** West 24th Street, Chelsea, New York
**Calendar:** Appears every 3–6 weeks. Thursday evening openings.
**Time budget:** 5 actions. You can't see it all — choose.
**Who's here:** Drawn from NPC pool based on gallery tier. Usually 2–3 collectors, 1 gallerist, sometimes the artist.
**The feel:** The art world's version of a cattle call. Free wine, expensive paintings, and everyone pretending they came for the art.

---

## Room Map

```
                     ┌─────────────┐
                     │   STORAGE   │
                     │  (locked)   │
                     └──────┬──────┘
                            │ requires: npcFavor.gallery_owner ≥ 8
  ┌──────────┐       ┌──────┴──────┐       ┌──────────┐
  │  STREET  │◄──────│  MAIN FLOOR │──────►│ BACKROOM │
  │          │  out  │  (start)    │ back  │ (locked) │
  └──────────┘       └─────────────┘       └──────────┘
                                            requires: reputation ≥ 40
```

---

## Room: Main Gallery Floor

**Start room.** Where everyone begins.

```json
{
  "id": "chelsea_main_floor",
  "venue": "gallery_opening",
  "name": "Main Gallery Floor",
  "desc": "Polished concrete. Track lighting. Wine in plastic cups.",
  "look": "The gallery is a converted warehouse — 4,000 square feet of polished concrete and exposed ductwork. Track lighting pins each painting like a specimen. The crowd is thin but curated: collectors in dark linens, a few gallerists checking phones, an artist hiding in the corner pretending not to watch who looks at what. The wine is cheap. The art isn't.\n\nThree large canvases dominate the east wall. A laminated price list sits face-down on the front desk — you'd have to ask for it, or know where to look.",
  "items": [
    {
      "name": "large canvas — east wall",
      "desc": "A six-foot canvas in thick impasto. The brushwork is confident — almost aggressive. The gallery card reads 'Untitled (Meridian), 2025. Oil on linen. 72 × 60 in.' No price visible. They never put the price where you can see it.",
      "isTakeable": false,
      "onLook": null
    },
    {
      "name": "laminated price list",
      "desc": "You flip it over casually. Six works, ranging from $18,000 to $65,000. The two largest are already marked with red dots — sold before the opening even started. Presale buyers. You're already late.",
      "isTakeable": false,
      "requires": { "intel": { "min": 3 } },
      "onLook": { "intel": 1 }
    },
    {
      "name": "gallery guest book",
      "desc": "Open to tonight's page. Twelve names so far. You recognize three: a hedge fund collector from Greenwich, a curator from the New Museum, and — interestingly — a name that's been in the news for all the wrong reasons. Someone's doing due diligence. Or covering their tracks.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    },
    {
      "name": "half-empty wine glass",
      "desc": "Someone abandoned a glass of Sancerre on the windowsill. A lipstick print on the rim. You're not here for the wine.",
      "isTakeable": false,
      "onLook": null
    }
  ],
  "characters": [
    {
      "id": "elena_ross",
      "desc": "Elena Ross is here, near the east wall. She's holding a glass of white wine she isn't drinking — just gripping it like a prop. Her eyes are on the largest canvas, but her attention is elsewhere.",
      "topics": ["nomura_triptych", "market_sentiment", "business_proposal"],
      "requires": null
    },
    {
      "id": "gallery_assistant",
      "desc": "A young gallery assistant in all black stands by the desk, visibly trying to appear busy. She's the one to ask about pricing, availability, and whether the artist is actually here tonight.",
      "topics": ["pricing", "artist_info", "upcoming_shows"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "back",
      "id": "chelsea_backroom",
      "label": "Slip through the door marked 'Private'",
      "block": "The door is marked 'Private.' A gallerist catches your eye and shakes her head — barely perceptible. You'd need more weight in this room to get through that door.",
      "requires": { "reputation": { "min": 40 } }
    },
    {
      "dir": "upstairs",
      "id": "chelsea_storage",
      "label": "Take the freight elevator to storage",
      "block": "The freight elevator has a keypad. You don't have the code. Yet.",
      "requires": { "npcFavor": { "gallery_owner": { "min": 8 } } }
    },
    {
      "dir": "out",
      "id": "chelsea_street",
      "label": "Step outside",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "dealer_tanaka_whisper",
      "desc": "Two dealers murmuring by the wine table, leaning in close",
      "requires": { "intel": { "min": 5 } },
      "content": "\"...heard the Tanaka estate is liquidating. Everything. They want it done before the tax year ends.\"\n\"How many pieces?\"\n\"Twenty-two. Some of it is extraordinary. Some of it... isn't.\"",
      "effects": { "intel": 2 },
      "unlocks": "tanaka_estate_tip",
      "oneShot": true
    },
    {
      "id": "collector_gossip",
      "desc": "A collector talking too loudly on his phone by the bathroom",
      "requires": { "intel": { "min": 2 } },
      "content": "\"—no, I'm telling you, the Nomura show at Pace is going to change everything. MoMA is already circling. If you don't own one by March, you won't be able to afford one by June.\"",
      "effects": { "intel": 1 },
      "unlocks": null,
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "You push through the heavy glass door into the hum of an opening night. Someone hands you a plastic cup of wine before you've even looked at the art.",
    "effects": null
  },
  "timeCost": 0,
  "tags": ["social", "gallery", "new-york", "start"]
}
```

---

## Room: The Backroom

🔒 **Requires:** Reputation ≥ 40

Where the real business happens. The art on the walls back here isn't for sale tonight. It's leverage.

```json
{
  "id": "chelsea_backroom",
  "venue": "gallery_opening",
  "name": "The Backroom",
  "desc": "Smaller, quieter. The good chairs.",
  "look": "The backroom is a different country. No track lighting — just a single warm lamp on an oak desk. Two Eames chairs face each other across a low table with a bottle of actual wine, not the stuff they're pouring out front. The walls hold three paintings — small, museum-quality, and definitely not for sale tonight. Or maybe they are, if you're the right person asking the right way.\n\nA leather portfolio sits open on the desk. Inside: transparencies of works not yet photographed for the website. The next show, maybe. Or the private holdings they don't advertise.",
  "items": [
    {
      "name": "leather portfolio",
      "desc": "Inside: 35mm transparencies of twelve works. Some are by the same artist showing tonight. Others are by names you recognize — bigger names. The portfolio is the gallery's private inventory. Seeing it is a privilege. The prices penciled in the margins are... ambitious.",
      "isTakeable": false,
      "requires": null,
      "onLook": { "intel": 3 }
    },
    {
      "name": "framed photograph on the desk",
      "desc": "A snapshot of the gallery owner with two collectors at what looks like Art Basel Miami, 2019. One of the collectors is your rival. They're laughing. That's useful information.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    },
    {
      "name": "bottle of Châteauneuf-du-Pape",
      "desc": "2018. Already open. Two glasses poured, one barely touched. Someone left in a hurry.",
      "isTakeable": false,
      "onLook": null
    }
  ],
  "characters": [
    {
      "id": "philippe_noir",
      "desc": "Philippe Noir is seated in the far Eames chair, legs crossed, reading something on his phone with an expression that could be amusement or contempt. Difficult to tell with Philippe.",
      "topics": ["backroom_deal", "market_manipulation", "gallery_politics"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "out",
      "id": "chelsea_main_floor",
      "label": "Return to the main gallery",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "gallery_owner_phone",
      "desc": "The gallery owner's voice, muffled, from behind a closed office door",
      "requires": { "intel": { "min": 7 } },
      "content": "\"...tell them the price is firm. If they want the secondary market piece, they buy the primary work first. That's the deal. Package or nothing.\"\n\nA pause.\n\n\"I don't care what London is offering. This isn't London.\"",
      "effects": { "intel": 2 },
      "unlocks": "packaging_deal_intel",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The door closes behind you and the noise of the opening drops to a murmur. In here, the air smells like wood polish and money.",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["private", "gallery", "high-access"]
}
```

---

## Room: The Street

The decompression chamber. Step outside, breathe, decide what to do next.

```json
{
  "id": "chelsea_street",
  "venue": "gallery_opening",
  "name": "West 24th Street",
  "desc": "Cool night air. Smokers and phone calls.",
  "look": "West 24th between Tenth and Eleventh. The gallery's glass front glows behind you. Out here, the collectors who don't want to be seen talking are talking. Three people smoke on the sidewalk — real cigarettes, not the electronic kind, because this crowd is contrarian about everything.\n\nAcross the street, another gallery is also opening tonight. You can see the crowd through the windows. The art world's version of a block party, except nobody's having fun. They're all working.\n\nA black car idles at the curb. Someone important is either arriving or leaving.",
  "items": [
    {
      "name": "discarded exhibition flyer",
      "desc": "A glossy flyer for next month's show at the gallery across the street. The artist's name jumps out — you've heard whispers about this one. Early career, Instagram following in the hundreds of thousands, no auction record yet. Could be the next breakout. Could be nothing.",
      "isTakeable": true,
      "onTake": { "intel": 1 },
      "onLook": null
    },
    {
      "name": "the black car",
      "desc": "A matte-black Escalade with tinted windows. The driver is reading a newspaper — a physical newspaper. Whoever's inside is either obscenely rich or professionally paranoid. Both, probably.",
      "isTakeable": false,
      "onLook": null
    }
  ],
  "characters": [
    {
      "id": "smoking_collector",
      "desc": "A collector you vaguely recognize from auction previews is smoking alone, scrolling his phone with one hand.",
      "topics": ["auction_tips", "tonight_show", "market_rumors"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "in",
      "id": "chelsea_main_floor",
      "label": "Go back inside",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "smoking_phone_call",
      "desc": "One of the smokers is on the phone, voice carrying in the cold air",
      "requires": { "intel": { "min": 3 } },
      "content": "\"—yeah, I'm at the opening. The work is fine. Not great, not bad. But the backroom stuff? That's where the action is. If you can get in, there's a Richter study they haven't shown anyone. Small, but pedigreed. She's asking one-twenty for it.\"",
      "effects": { "intel": 2 },
      "unlocks": "richter_study_lead",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The night air hits you like a reset button. Chelsea in the evening — all concrete and taxi lights.",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["outdoor", "social", "new-york"]
}
```

---

## Room: Storage

🔒 **Requires:** Gallery Owner NPC Favor ≥ 8

The real collection. Not for public viewing.

```json
{
  "id": "chelsea_storage",
  "venue": "gallery_opening",
  "name": "Storage — Upper Level",
  "desc": "Freight elevator. Climate-controlled. The works they don't show.",
  "look": "The freight elevator opens onto a long, windowless corridor lit by LEDs embedded in the ceiling. The air is 65 degrees and exactly 50% humidity — you can feel the climate control working. Rolling racks line both walls, each slot holding a painting in a padded sleeve. Small labels on each rack: artist name, dimensions, year. There are maybe forty works in here.\n\nThis is the gallery's real inventory. The show downstairs is marketing. This is the vault.\n\nAt the far end, a folding table holds a laptop with spreadsheets open — consignment records, sale prices, buyer names. If you looked long enough, you'd know everything.",
  "items": [
    {
      "name": "rolling racks — left wall",
      "desc": "You pull out a sleeve at random: a mid-size oil painting by an artist whose last auction result was $340,000. It's beautiful. It's also available — the consignment tag reads 'asking: $180K, negotiate.' Below market. Way below. Someone needs cash.",
      "isTakeable": false,
      "requires": null,
      "onLook": { "intel": 3 }
    },
    {
      "name": "laptop on the folding table",
      "desc": "Consignment records. You scan quickly: twelve works on consignment, six owned outright by the gallery. The margins on some of these are staggering — bought at estate sales for five figures, listed for six. One entry catches your eye: a work flagged 'HOLD — museum interest.' Someone at a major institution wants this piece. That changes the math entirely.",
      "isTakeable": false,
      "requires": { "intel": { "min": 6 } },
      "onLook": { "intel": 5 }
    },
    {
      "name": "climate control panel",
      "desc": "65°F, 50% RH. Professional grade. Whatever else you think about this gallery, they take care of the work.",
      "isTakeable": false,
      "onLook": null
    }
  ],
  "characters": [],
  "exits": [
    {
      "dir": "down",
      "id": "chelsea_main_floor",
      "label": "Take the elevator back down",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The freight elevator shudders to a stop. When the gate opens, the air changes — cooler, drier, and perfectly still. You've seen more art in the last ten seconds than most people see in a year.",
    "effects": { "intel": 2 }
  },
  "timeCost": 1,
  "tags": ["private", "high-value", "storage"]
}
```

---

## NPC Scheduling Notes

Characters present at this venue rotate based on game state:
- **Elena Ross** — appears if `heat.elena > 0` or week is even-numbered
- **Philippe Noir** — appears only in Backroom, only if player has Reputation ≥ 40
- **Gallery assistant** — always present on Main Floor
- **Smoking collector** — always present on Street

The artist may appear on Main Floor at high-tier gallery openings (artist heat ≥ 30).

---

## Venue Encounters (triggered by conditions)

1. **The Red Dot** — If player examines price list + has cash ≥ $20,000: option to buy one of the two remaining works before anyone else
2. **The Uninvited Guest** — If a rival NPC is at this venue: they approach you, forced dialogue
3. **The Artist's Confidence** — If artist is present + player owns ≥ 2 of their works: private studio visit invitation

(Detailed encounter scripts in `04_Events/Venue_Encounters.md`)

---

## Tags
#rooms #gallery #chelsea #new-york #venue
