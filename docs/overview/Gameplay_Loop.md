# ArtLife — Gameplay Loop & Experience Design

> The definitive reference for how the player experiences the game, from boot to daily routine.

---

## The Core Spatial Loop

ArtLife is a **Pokémon-style art world RPG** where the player physically moves through the world using a top-down GridEngine overworld. Everything revolves around a daily routine of digital work (computer terminal) and physical exploration (walking the art world).

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         THE DAILY ROUTINE                                │
│                                                                          │
│   HOME (Player's Apartment)                                              │
│     └─→ Computer Terminal (Win95 OS)                                     │
│           ├── Art Terminal (Bloomberg/Artnet)  ── market, research, buy   │
│           ├── Email Client                    ── negotiations, deals     │
│           └── Instant Messenger               ── NPC chat, tips, gossip  │
│                                                                          │
│   EXIT APARTMENT → Walk the City                                         │
│     ├── Galleries ── browse art, talk to gallerists, buy works           │
│     ├── Art Fairs ── Frieze, Basel booth walk with stalls                │
│     ├── Auction Houses ── bid on lots, watch sales                       │
│     ├── NPC Offices ── private meetings, haggle battles                  │
│     ├── Parties & Events ── cocktail parties, openings, networking       │
│     ├── Studios ── visit artists, commission work                        │
│     └── Airport ── fly to other cities (London, Basel, HK, Venice, Miami)│
│                                                                          │
│   TRAVEL (within city)                                                   │
│     ├── Walk ── free, slow                                               │
│     ├── Taxi ── fast-travel to known locations (Level 1+)                │
│     ├── Limo ── prestige bonus ($500K+ net worth)                        │
│     └── Private Jet ── any city, VIP ($5M+ net worth)                    │
│                                                                          │
│   RETURN HOME → Advance Time → Weekly Report → Level Up? → Next Cycle    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Home — The Computer Terminal

The player walks into their apartment and approaches the desk. Pressing SPACE activates the computer, which boots into a **retro operating system** (Win95 / early Mac OS aesthetic). The desktop has **three core applications:**

### 1. Art Terminal (Artnet / Bloomberg)
- Full market data: artist indices, composite index, sector breakdown
- Artnet-style marketplace: browse, search, filter, INQUIRE
- Artist detail pages: bio, heat gauge, stats, activity feed
- Gallery pages: exhibitions, represented artists, contact info
- Order book: open buy/sell orders, place trades
- NPC trade feed: watch the AI market play out in real-time

### 2. Email Client
- Receive deal offers from NPCs
- Negotiate purchases/sales via email threads (haggle-by-email)
- Exhibition invitations, auction notifications
- Respond with tactic-based dialogue choices
- Gmail-style compose window

### 3. Instant Messenger
- Quick NPC conversations (tips, gossip, favors)
- Relationship building through casual chat
- Market rumors and insider info
- Group chats (collector circles, gallery networks)
- Nokia-style phone contacts integration

**Exit the terminal** by pressing ESC → walk away from the desk → leave the apartment.

---

## Phase 2: The City — Physical Exploration

Once the player exits their apartment, they walk through the city (Pokémon GridEngine overworld). Key destinations:

### Galleries
Walk inside a gallery → browse artworks on the walls → interact with each piece (view details, price, provenance) → talk to the gallerist → negotiate a purchase → make an offer (launches haggle battle).

### Art Fairs (Frieze, Basel, etc.)
Enter a large venue → walk through **individual booth stalls** → each booth belongs to a different gallery → browse their selections → mix of known and unknown artists → time-limited event (happens on specific calendar weeks).

### Auction Houses
Attend live auctions → watch lots come up → decide to bid → competitive bidding against NPC collectors → price escalation dynamics → win or lose.

### NPC Offices / Private Meetings
Visit a dealer or collector's office → sit down for a 1-on-1 → negotiate over a specific artwork → full haggle battle (Pokémon-style turn-based negotiation).

### Parties & Social Events
Gallery openings, cocktail parties, art world galas → mingle with NPCs → overhear gossip (eavesdrops) → make connections → gain intel → network for future deals.

### Artist Studios
Visit working artists → see their process → commission new works → build relationships → get early access to pieces before they hit galleries.

---

## Phase 3: Systems That Tie It Together

### Leaderboard / Rankings
Integrated into the Art Terminal — see how you rank against NPC collectors by:
- Portfolio value
- Collection quality (tier composition)
- Trade volume
- Reputation / social capital

### Mini-Games
Context-specific activities that appear during gameplay:
- **Party games** — social challenges at events
- **Art creation** — if you're making art yourself (player-as-artist archetype)
- **Appraisal challenges** — identify fakes, estimate values
- **Networking games** — speed-networking at fairs

### NPC Economics
Every NPC has a monthly P&L:
- Monthly income from their profession (advisory fees, gallery sales, etc.)
- Monthly expenses (rent, staff, operations)
- Annual budget for art purchases
- Budget remaining determines buying willingness
- Financial stress affects negotiation behavior

### Market Simulation
The art market runs autonomously between player actions:
- NPC-to-NPC trades every week
- Artist heat evolves based on transactions
- Market cycles (bull/bear/flat) transition naturally
- Composite index tracks overall market health
- All data visible through the Art Terminal

### Inventory & Assets
Full inventory view accessible from the computer terminal or phone:

| Category | Contents | Details |
|---|---|---|
| **Art Collection** | All owned artworks | Title, artist, purchase price, current value, ROI, provenance, condition |
| **Vehicles** | Taxi account → Limo → Private Jet | Travel mode, upgrade status, unlock requirements |
| **Properties** | Starter apartment → Penthouse → Multiple homes | Location, size, decoration level, storage capacity |
| **Relationships** | NPC contact cards | Favor level, met date, trade history, alliance status |
| **Documents** | Contracts, certificates, permits | Freeport receipts, insurance, consignment agreements |

### Home & Living (Sims-Lite)
Your apartment is more than a place to sleep — it's a status symbol and personal space:

**Art Display:**
- **Hang art in your apartment** — select from collection, place on walls
- **Hang art in your gallery** — if you own/rent gallery space, curate exhibitions
- **Freeport storage** — store high-value pieces securely (insurance + tax benefits)
- Art on display affects NPC impressions when they visit

**Decoration & Furnishing:**
- Buy furniture, rugs, plants, lighting from shops or online
- Drag-and-place items in your apartment (tile-based placement)
- Furniture tiers: IKEA starter → mid-century modern → designer → bespoke
- Each upgrade improves your "home prestige" stat (affects NPC respect)

**Property Upgrades:**
- **Starter apartment** — small, basic furniture, 1 wall for art
- **Loft** — larger, mod-cons, 3-4 walls, guest room for NPC visits
- **Penthouse** — massive, multiple rooms, roof terrace, private viewing room
- **Multiple properties** — own apartments in different cities (act as home bases)

**Object Interaction:**
- Walk up to any object in your home → SPACE to interact
- Desk → Computer OS / Phone → Art Terminal / Email / IM
- Bookshelf → Read art history (intel boost)
- Record player → Ambient music selection
- Couch → Rest (reduce burnout)
- Wine cabinet → Host a private dinner (NPC event)

---

## Phase 4: Travel & Multi-City

### Getting Around
Players can travel within and between cities:

| Mode | Unlock | Cost | Speed |
|---|---|---|---|
| **Walking** | Default | Free | Slow (grid movement) |
| **Taxi** | Level 1 | $ | Instant fast-travel within city |
| **Limo** | Net worth $500K+ | $$ | Fast-travel + prestige bonus |
| **Commercial Flight** | Level 5 | $$$ | Travel to other cities |
| **Private Jet** | Net worth $5M+ | $$$$ | Any city, no wait, VIP access |

### Cities & Airports
- Walk to the **airport** → select destination → fly to a new city
- Each city has its own overworld map, galleries, NPCs, and art scene:
  - **New York** — home base, Chelsea/SoHo/Upper East Side galleries
  - **London** — Frieze, Mayfair dealers, Saatchi
  - **Basel** — Art Basel, old-money collectors, Swiss freeports
  - **Hong Kong** — emerging Asian market, auction houses
  - **Venice** — Biennale (time-limited), historical institutions
  - **Miami** — Art Basel Miami Beach, party scene
- **Hotels** — in foreign cities you stay at a hotel (smaller apartment with computer)
- **Flight restrictions** — some cities only accessible at certain levels or net worth thresholds

### Fast Travel
Within a city, call a taxi from your phone to jump between known locations without walking every street. Upgrade to limo service for a prestige boost (NPCs react with more respect).

---

## Phase 5: Progression & Leveling

### The Level System
Players progress through **tiers of access** based on experience, net worth, and social standing:

| Level | Title | Net Worth Gate | Unlocks |
|---|---|---|---|
| 1 | **Nobody** | $0 | Walk around home city, 2-3 starter contacts, phone calls only |
| 2 | **Newcomer** | $10K | Art Terminal (basic view), email, first gallery access |
| 3 | **Emerging** | $50K | Artnet account, attend openings, taxi service |
| 4 | **Known** | $150K | Art fairs, auction observation, 8+ contacts |
| 5 | **Established** | $500K | Commercial flights, all city galleries, limo |
| 6 | **Respected** | $1M | Private viewings, VIP events, NPC office meetings |
| 7 | **Power Player** | $3M | Auction bidding, board invitations, exclusive parties |
| 8 | **Top Collector** | $5M | Private jet, freeport storage, art fund management |
| 9 | **Legend** | $10M | Museum loans, retrospective offers, political access |
| 10 | **Titan** | $25M+ | Full world access, anything goes, endgame content |

### What Gates Access

Access is gated by **three pillars** working together:

1. **Level / XP** — earned by doing things (attending events, making trades, meeting people)
2. **Net Worth** — total portfolio value + liquid cash (unlocks luxury tiers)
3. **Social Standing** — aggregate NPC favor / reputation (unlocks exclusive social content)

> **Early Game (Levels 1-3):** You're a nobody. You only know a handful of people. No Artnet account. You can only cold-call a few contacts to start doing deals — flipping small pieces, building your starter collection.
>
> **Mid Game (Levels 4-6):** You've made a name. Galleries recognize you, art fairs let you in, you can fly to other cities. Your rolodex grows. Deals get bigger.
>
> **Late Game (Levels 7-10):** You're a power player. Private jets, board seats, museum retrospectives. NPCs seek you out. The endgame reckoning approaches.

### Social Trees
Each NPC relationship unlocks access:
- **Favor Level 1** — Basic conversation, small talk
- **Favor Level 3** — They share tips, market gossip
- **Favor Level 5** — Private deal offers, insider access
- **Favor Level 7** — Introduction to their network (unlock new NPCs)
- **Favor Level 10** — Full alliance, joint ventures, exclusive opportunities

---

## Phase 6: Artwork Database & Scaling

### Tiered Artwork Pool
Artworks scale with player progression:

| Tier | Price Range | Access Level | Source |
|---|---|---|---|
| **Starter** | $500 – $10K | Level 1+ | Emerging/unknown artists, prints, multiples |
| **Mid-Tier** | $10K – $250K | Level 3+ | Mid-career artists, gallery inventory |
| **High-End** | $250K – $5M | Level 5+ | Established artists, auction lots |
| **Blue-Chip** | $5M – $100M+ | Level 7+ | Masters, museum-quality, trophy works |

### Scaling the Database
**Phase 1 (Current):** 50+ handcrafted artworks in `artworks.js` — enough for gameplay.

**Phase 2 (Planned):** WikiArt API or similar service integration:
- Pull from databases of real artworks (title, artist, medium, year, image)
- Map to in-game pricing tiers automatically
- Procedural generation layer: vary prices, provenance, condition
- Massive catalogue (thousands of works) makes every playthrough feel different

**Phase 3 (Future):** Backend database:
- Persistent server-side artwork catalogue
- Player-generated content (user-uploaded art for custom scenarios)
- Multiplayer shared market with real artwork data

---

## Visual / Aesthetic Goals

| Element | Reference |
|---|---|
| Overworld | Pokémon (Gen 3-4 pixel art, GridEngine) |
| Computer OS | Windows 95 / Classic Mac OS (retro desktop) |
| Art Terminal | Bloomberg Terminal + Artnet.com hybrid |
| Email | Gmail / early webmail |
| IM | AIM / MSN Messenger |
| Haggle | Pokémon battles (turn-based, type effectiveness) |
| Galleries | Museum interior tilemap rooms |
| Art Fairs | Large venue with booth grid |

---

## Genre DNA

- **Pokémon** — walk the world, encounter NPCs, turn-based battles
- **Stardew Valley** — daily routine, relationship building, seasonal events
- **Recettear** — buy/sell loop, haggle mechanics, market timing
- **Offworld Trading Company** — market tension, speculation
- **Crusader Kings** — character-driven emergent narrative
- **Uplink** — retro computer interface, hacking aesthetics

---

## Tags
#vision #gameplay-loop #experience-design #game-design
