# Text-Based RPG Research — 50 Years of Game Mechanics Dissected

> What follows is a comprehensive breakdown of the best text-based, narrative-driven, and turn-based strategy games ever made — fully dissected to understand **exactly** how each mechanic works under the hood and **specifically** what we can pull into ArtLife.

---

## Table of Contents

1. [The Canon: 20 Games That Matter](#the-canon-20-games-that-matter)
2. [Deep Mechanical Dissections](#deep-mechanical-dissections)
3. [The 12 Stealable Mechanics for ArtLife](#the-12-stealable-mechanics-for-artlife)
4. [Narrative Engine Architecture Comparison](#narrative-engine-architecture-comparison)
5. [Technical Implementation Patterns](#technical-implementation-patterns)
6. [Open Source References](#open-source-references)
7. [Priority Roadmap for ArtLife](#priority-roadmap-for-artlife)

---

## The Canon: 20 Games That Matter

### Era 1: The Pioneers (1970s–1980s)

| # | Game | Year | Core Innovation |
|---|---|---|---|
| 1 | **The Oregon Trail** | 1971 | Resource management + random events + pace/ration dials = the survival strategy template |
| 2 | **Colossal Cave Adventure** | 1976 | Rooms as state nodes, inventory as persistent data, verb-noun interaction |
| 3 | **Zork** | 1980 | Rich prose, multi-room puzzles, world-as-simulation philosophy |
| 4 | **A Mind Forever Voyaging** | 1985 | Social simulation through observation. No combat, no puzzles — just witnessing consequences |
| 5 | **MUDs** (Genesis, 1989+) | 1989 | Persistent multiplayer state, player economies, social reputation/guild systems |

### Era 2: Strategy Hybrids (1990s–2010s)

| # | Game | Year | Core Innovation |
|---|---|---|---|
| 6 | **King of Dragon Pass** | 1999 | 600 narrative events with consequences that manifest years later. Advisor council system |
| 7 | **FTL: Faster Than Light** | 2012 | "Blue options" — special event choices unlocked by your current loadout |
| 8 | **A Dark Room** | 2013 | Progressive disclosure — starts with 1 button, reveals 5 complete game systems over time |
| 9 | **The Banner Saga** | 2014 | "You will never have enough." Interconnected resource web: supplies ↔ morale ↔ renown ↔ population |

### Era 3: The Narrative Renaissance (2015–Present)

| # | Game | Year | Core Innovation |
|---|---|---|---|
| 10 | **Fallen London** | 2009+ | Quality-based narrative: hundreds of named variables gate all content. Deepest persistent-state system ever |
| 11 | **80 Days** (Inkle) | 2014 | 750K words of branching narrative. The world turns independently of the player |
| 12 | **Sorcery!** (Inkle) | 2012–16 | Decisions tracked across 4 games. Rewind mechanic. Ink's "weave" architecture |
| 13 | **Sunless Sea** | 2015 | "Something Awaits You" — time-gated event cooldowns. Terror as a dread resource |
| 14 | **Overboard!** (Inkle) | 2021 | NPCs act on independent schedules. Reverse mystery. Built in 100 days with Ink |
| 15 | **Sir Brante** | 2021 | Life journal. Childhood stats evolve into adult traits. Class system constrains all choices |
| 16 | **Roadwarden** | 2022 | 40-day time limit. Attitude system (5 conversation tones). Player journal with custom notes |
| 17 | **Lacuna** | 2021 | Timed dialogue. No save scumming — you live with every decision |
| 18 | **Night Road** (Choice of Games) | 2020 | Faction reputation. Blood/money/standing as interconnected resources |
| 19 | **Overland** | 2019 | Post-apocalyptic Oregon Trail. Scavenging + hard choices about who survives |
| 20 | **AI Dungeon** | 2019 | AI-generated infinite branching. The procedural frontier |

---

## Deep Mechanical Dissections

### 🎯 Oregon Trail — The Pace/Ration Engine

Oregon Trail is deceptively simple: you have **dials** that control burn rate and **random events** that disrupt your plans.

#### The Dials
The player controls two continuous variables at all times:

| Dial | Settings | Trade-off |
|---|---|---|
| **Pace** | Steady → Strenuous → Grueling | Faster = more distance, but stamina drain ↑, illness chance ↑, wagon breakdown ↑ |
| **Rations** | Filling → Meager → Bare Bones | More food = healthier party, but supplies drain faster |

These two dials interact: grueling pace + bare bones rations = fast death. Steady pace + filling meals = safe but slow (and you might not make it before winter). **Every "right" answer has a cost.**

#### The Loop
```
EACH DAY:
  1. Consume food (based on rations × party size)
  2. Travel distance (based on pace + weather + terrain)
  3. Drain stamina (based on pace)
  4. Roll for random event (illness, breakdown, river crossing, hunting opportunity)
  5. Update weather + terrain for next section
  6. Check for death conditions (starvation, illness, party wiped)
```

#### The Hunting Minigame
Hunting costs **1 day of travel** + **bullets** but returns **food**. The trade-off is time vs. resources — stopping to hunt means falling behind schedule, but running out of food means death. Carry limit (100-200 lbs) prevents hoarding.

> **ArtLife parallel**: Our "pace" dial is how aggressively you trade. Conservative = small gains, low risk. Aggressive = big deals, but you burn cash + reputation if things go wrong. Our "rations" are our operating budget — how much you spend on social events, travel, art fairs. **Every week is a pace/ration decision.**

---

### 🏰 King of Dragon Pass — The Advisor + Consequence Web

This is the most mechanically rich text strategy game ever made. 600 events, consequences that manifest **years after the decision**, and a council of advisors whose skills shape your options.

#### The Advisor Ring
You manage a **clan ring** of 7 leaders. Each has:

| Attribute | What It Does |
|---|---|
| **Skills** (Combat, Bargaining, Custom, Plants, Magic, Leadership) | Determines success probability for related actions |
| **Deity worship** | Worshipping war gods → more War magic. Healing gods → more Healing magic |
| **Personality** | Aggressive advisors recommend violence. Diplomatic ones suggest negotiation |
| **Gender balance** | Mix of genders strengthens clan magic overall |

The advisor ring doesn't just give advice — it **mechanically changes outcomes**. Having a strong Bargainer on the ring literally increases your trade success rate.

#### The Consequence Web
Decisions don't just have immediate effects — they set **flags** that trigger events months or years later:

```
DECISION: You find an orphaned child on the road.
  → "Adopt the child" → Sets flag: orphan_adopted = true
    → 2 years later: The child grows up and reveals a prophecy → New questline
    → 5 years later: The child's true parents arrive demanding return → Diplomatic crisis
  → "Leave the child" → Sets flag: orphan_abandoned = true
    → 1 year later: A neighboring clan takes them in → They remember your cruelty
    → 3 years later: The grown child becomes an enemy leader
```

Events check **multiple flags simultaneously**. An event might require: `orphan_adopted = true AND war_with_neighbors = true AND clan_morale > 50` to trigger. This creates a web of consequences that feels organic because **no single decision has a simple 1:1 outcome**.

> **ArtLife parallel**: We already have events. What we need is the **delayed flag system** — a decision in Week 5 sets a flag that triggers a phone message in Week 15 and unlocks a special event in Week 25. Our NPCs should work like the advisor ring — their skills/connections mechanically change what options are available and their success rates.

---

### 🕹️ FTL — The Blue Options System

FTL's genius: some event choices are **only available if you have the right equipment/crew**. These "blue options" are always the best available choice, rewarding preparation and smart resource allocation.

#### How Blue Options Work

```
EVENT: "The ship's oxygen system is failing."

Standard options:
  [1] Send crew to repair it manually   → Risk: crew injury
  [2] Vent the compartment              → Lose that room's function

Blue options (only if you have the right stuff):
  [🔵 Engi crew member] Send the Engi to interface directly → Safe repair, no risk
  [🔵 Level 2 Oxygen system] Reroute backup oxygen → Auto-fix, no crew needed
  [🔵 Repair Drone] Deploy drone to fix the system → Costs 1 drone part
```

Blue options **reward the player for their existing choices** (what crew they hired, what systems they upgraded). They make resource allocation feel meaningful retroactively.

#### The Probability Model
Standard options use dice rolls with visible probabilities. Blue options either guarantee success or dramatically improve odds. The player learns: **"Having the right tool for the job matters more than luck."**

> **ArtLife parallel**: This is the single most impactful mechanic we should implement. Examples:
> - **[🔵 High reputation]** A private sale that others can't access
> - **[🔵 Favor with Diana Chen]** She tips you off before the auction catalog goes public  
> - **[🔵 Own a Basquiat]** Opens doors at the Jean-Michel Foundation gala
> - **[🔵 Intel > 60]** You spot the forgery that fools everyone else
> - **[🔵 Attended Art Basel]** You have connections to reference in negotiations

---

### 🏚️ A Dark Room — Progressive Disclosure

A Dark Room starts like this:

```
[Screen 1]: A Dark Room.
            [Light Fire]
```

That's it. One sentence. One button. **The entire game fits on one screen** — but over the next 3 hours, it reveals:

```
Phase 1: FIRE → Keep fire lit, stranger appears
Phase 2: SETTLEMENT → Gather wood, build huts, attract villagers
Phase 3: ECONOMY → Assign workers: builders, trappers, tanners
Phase 4: CRAFTING → Tanning, curing, weapon-making
Phase 5: EXPLORATION → Map reveals, compass unlocks, Dusty Path tab
Phase 6: COMBAT → Menu-based, weapons and armor upgrades
Phase 7: NARRATIVE TWIST → You realize you're the villain
```

#### How the UI Progressively Reveals
The game dynamically adds UI elements **only when they become relevant**:
- Tabs appear when unlocked (not greyed out — literally absent)
- Resource counters appear only when you first acquire that resource
- The map doesn't exist until you find a compass
- Workers as a concept doesn't exist until you build your first hut

The player is never overwhelmed because **they only see what they've earned access to**. Each new system feels like a discovery, not a tutorial dump.

#### The Twist
Mid-game, the workers are described as "loyal" and "devoted." Late-game, descriptions shift: they become "slaves." The village you built is a labor camp. The fire you lit was a signal for an invading force. **You were the monster all along.** This works because progressive disclosure applies to the *narrative* too — not just the UI.

> **ArtLife parallel**: Don't show the Calendar tab on Week 1. Don't show Intel until the player buys their first piece. Reveal the phone messages system organically when the first NPC "calls." Later phases reveal board seats, art fund management, institutional politics. The UI should grow as the player's career grows.

---

### 🎭 Fallen London — Quality-Based Narrative (QBN)

Fallen London is the deepest persistent-state narrative game ever built. Everything — EVERYTHING — runs on "qualities."

#### What Are Qualities?
Qualities are named variables attached to the player. There are **hundreds** of them:

| Type | Examples | What They Do |
|---|---|---|
| **Main attributes** | Dangerous: 45, Persuasive: 72, Shadowy: 33, Watchful: 60 | Gate content by level. "Requires Persuasive 50" |
| **Connections** | Connected: The Duchess: 3, Connected: Hell: 7 | Faction standing. Opens/closes faction storylets |
| **Progress** | Making Progress in the Case: 7 | Tracks advancement in multi-part stories |
| **Trophies** | A Survivor of the Iron Republic: true | Marks past achievements, unlocks exclusive content |
| **Menaces** | Nightmares: 12, Scandal: 5, Suspicion: 8 | Negative qualities. Hit 8+ = bad things happen |
| **Hidden** | ??? | Backend-only qualities the player can't see but that gate content |

#### How Storylets Work
A **storylet** is a self-contained narrative chunk. Think of each one as an IF statement:

```
STORYLET: "A Midnight Assignation"
  REQUIRES: Persuasive ≥ 60 AND Connected: The Duchess ≥ 3 AND Scandal < 5
  ACTIONS:
    [1] "Attend with charm"
      → CHALLENGE: Persuasive (60% success at level 60)
      → SUCCESS: +2 Connected: The Duchess, +1 Making Progress
      → FAILURE: +3 Scandal, -1 Connected: The Duchess
    [2] "Send a proxy"
      → No challenge. -1 Connected: The Duchess, +1 Shadowy
```

#### Opportunity Cards
Beyond storylets, the game has **opportunity cards** — a deck of possible events that you draw randomly, but **the contents of your deck are filtered by your qualities**. High Watchful qualities mean you draw investigation cards. High Dangerous means you draw combat cards. This means your character build naturally shapes the types of stories you encounter.

#### Menaces as Anti-Resources
Menaces are qualities that accumulate through risky actions:

| Menace | Hits 8+ | Consequence |
|---|---|---|
| **Nightmares** | Sent to a Mirror-Marches dream state | Must spend actions to escape |
| **Scandal** | Exiled to Tomb-Colonies | Lose social standing, must rebuild |
| **Suspicion** | Imprisoned in New Newgate | Lose items, must escape |
| **Wounds** | Sent to boat on the river | Near-death experience |

**Menaces are brilliant because they're a cost you accumulate passively** — every risky action adds a little, and you only pay the price when they overflow. This creates tension: "I *could* do this risky thing, but my Scandal is already at 6..."

> **ArtLife parallel**: This IS our game's architecture. Map it directly:
> 
> | Fallen London | ArtLife |
> |---|---|
> | Persuasive / Dangerous / etc. | Reputation / Insider Knowledge / Network |
> | Connected: The Duchess | npcFavor.elena_ross |
> | Making Progress in the Case | questProgress.forgery_investigation |
> | Nightmares / Scandal | Heat (market suspicion), Burnout (personal), Debt |
> | Opportunity Cards | Phone messages filtered by your current qualities |
> | Storylets | Our events, gated by qualities |

---

### 🚢 Sunless Sea — The "Something Awaits You" Cooldown

Sunless Sea (built on Fallen London's engine) added a brilliant event-pacing mechanic: **"Something Awaits You" (SAY)**.

#### How SAY Works

```
WHILE SAILING:
  Every 60 seconds at sea → Roll 1-100
  If dice ≤ threshold → Set SAY = true (lantern icon appears)

WHEN YOU DOCK AT A PORT:
  If SAY = true:
    → Special port events become available
    → Choosing one consumes SAY = false
    → Must sail again to regenerate SAY
  If SAY = false:
    → Only standard port options available
```

This prevents exploit loops (docking → getting reward → re-docking → getting reward again). **You can't grind a single location.** You must **explore** to regenerate events.

#### Terror as Anti-Resource
Terror is Sunless Sea's "menace" — it rises while sailing in darkness, encountering horrors, or running low on supplies. At 100 Terror, your crew mutinies. Managing Terror means:
- Staying near light sources (buoys, shore)
- Docking at ports that reduce Terror (costs SAY + sometimes resources)
- Returning to London (auto-drops Terror to 50, but costs travel time)

**Terror creates a rhythm**: venture out → accumulate dread → return to safety → venture further. This is the push-pull loop that makes exploration feel meaningful.

> **ArtLife parallel**: We need our own SAY system for phone messages. Instead of flooding the player with 5 messages every turn, **gate message arrival behind a cooldown**. Messages accumulate while you're "out in the art world" (advancing weeks) and arrive in batches. NPC contacts can only message you once per SAY cycle. This prevents message fatigue and makes each message feel more earned.
>
> Our "Terror" equivalent could be **Burnout** or **Market Heat** — a quality that rises when you're aggressive (flipping works fast, attending too many events, burning relationships) and forces you to "cool down" (skip events, take a quiet week, tend to personal life).

---

### 📖 Sir Brante — The Life Journal + Stat Evolution

Sir Brante is an autobiography. You play through an entire life — childhood, adolescence, adulthood, death — and early decisions **physically constrain** later options.

#### Stat Evolution
Stats transform as the character ages:

| Childhood Stats | → Evolve Into → | Adult Stats |
|---|---|---|
| Perception | → | Watchful, Strategic |
| Determination | → | Valor, Conviction |
| Empathy | → | Diplomacy, Manipulation |
| Obedience | → | Theology, Duty |

A child who develops high Perception becomes a watchful adult who notices things others miss. A child who develops Determination becomes brave but potentially reckless. **Your childhood shapes your toolkit, but not your story.**

#### The Journal as Mechanic
Every significant decision is recorded in a journal the player can review. The journal isn't just a log — it's a **constraint engine**:

```
Journal Entry, Age 7:
  "You defended your low-born mother against Grandfather's cruelty."
  → +3 Determination, -2 Obedience
  → Flag: defied_grandfather = true
  → CONSTRAINT: Cannot pursue the Loyal Noble path in Chapter 4
  → ENABLES: Can access the Rebel path in Chapter 5
```

Decisions from Age 7 close off entire career paths at Age 25. The player can **see this happening** — the journal makes the constraint chain visible, turning "I can't do this" from frustrating into narratively satisfying.

#### Lesser Deaths
Characters get 3 "lesser deaths" before the final "true death." A lesser death:
- Costs a life token
- Triggers a recovery scene
- Makes the character **stronger** (+ stats as a reward for surviving)
- Serves as checkpoint: "You went too far. Pull back."

> **ArtLife parallel**: We should track a "career journal" — a visual timeline of key decisions:
> - Week 3: "Bought the Tanaka piece for $12K" → Enables gallery access later
> - Week 8: "Snubbed James Whitfield at the Armory Show" → Blocks auction house route
> - Week 15: "Tipped off Elena about the forgery" → +15 favor, unlocks partnership storyline
> 
> The stat evolution idea maps to our character class system: an Insider who leans into networking develops different capabilities than one who focuses on pure market analysis. **Your playstyle shapes your toolkit.**

---

### 🎲 Overboard! — NPC Simulation + Time Compression

Built by 4 people in 100 days using Ink. Overboard! proves that NPC autonomy creates the best emergent stories.

#### How NPC Simulation Works
Each NPC has:
- A **schedule** (where they are at each time slot)
- A **knowledge set** (what they've seen and heard)
- **Relationships** (who they trust, who they're suspicious of)
- **Goals** (what they're trying to achieve independently)

```
NPC: Commander Singh
  8:00 AM — Bridge (observing passengers)
  9:00 AM — Deck (morning walk)
  10:00 AM — Dining room (breakfast)
  ...

  KNOWLEDGE: []
  SEES: [anything that happens in his current location while he's there]
  WILL REPORT: [if knowledge includes "suspicious activity" AND trust_in_veronica < 5]
```

**NPCs act whether or not the player interacts with them.** If you're manipulating evidence at 9:00 AM and Singh is on the deck, he might see you. If you avoid the deck, he won't — but he'll follow his schedule regardless.

#### Time as Currency
The game runs on a timeline: 8 AM to 4 PM. Every action costs a time slot. You can't be in two places at once. This forces trade-offs:
- Destroy evidence at 10 AM → can't establish alibi with the Captain at 10 AM
- Charm a witness at 11 AM → miss the window to plant evidence before lunch
- Every run teaches you something → next run, you optimize

#### Memory Across Runs
The game highlights choices from previous runs, letting you fast-forward through familiar dialogue. **Your meta-knowledge grows even when the character resets.** This is the "roguelite narrative" loop — each death teaches you something.

> **ArtLife parallel**: Our NPCs should have independent behavior. Specifically:
> - Dealers sell pieces to other buyers if you wait too long
> - Artists' prices rise/fall based on market conditions, not just your actions
> - Calendar events happen whether you attend or not — and NPCs reference them
> - NPC-to-NPC relationships change: Elena feuds with James → choosing one alienates the other
> - Phone messages from NPCs reference events they "attended" that you skipped

---

### ⚔️ Banner Saga — The Resource Web

Banner Saga's core insight: **resources don't exist in isolation — they form a web where spending one affects all the others.**

#### The Four-Way Resource Web

```
           SUPPLIES
          /         \
         /           \
    MORALE ←——————→ RENOWN
         \           /
          \         /
         POPULATION
```

| Resource | What It Is | How It's Spent | If It Runs Out |
|---|---|---|---|
| **Supplies** | Food. 100 people eat 1 supply/day | Consumed automatically daily | People die. Morale drops |
| **Morale** | Collective resolve. -10/day while traveling | Spent passively by travel, combat losses, starvation | Combat penalty (less Willpower for heroes) |
| **Renown** | XP + currency (dual purpose!) | Buy supplies OR promote heroes (permanent stat gains) | Can't upgrade heroes, can't restock supplies |
| **Population** | Clansmen + Fighters + Varl | Lost to starvation, combat, bad decisions | Fewer fighters, weaker caravan, game over |

The brutal insight: **Renown is both XP and money.** Spending it on food means your heroes stay weak. Spending it on hero upgrades means your people might starve. **There is never a "right" answer — only trade-offs.**

#### The Morale Multiplier
Morale affects combat directly: high morale = bonus Willpower (action points). Low morale = penalty. This means resource management isn't abstract — it **directly translates to your ability to survive combat encounters**. A well-fed, happy caravan fights better.

> **ArtLife parallel**: Build a resource web where spending one thing costs another:
> 
> | Our Resource | Functions Like |
> |---|---|
> | **Cash** | Supplies — spend to buy art, attend events, travel, make deals |
> | **Reputation** | Morale — high rep = better deal offers, access to VIP sales; low rep = doors close |
> | **Intel** | Renown — both knowledge AND access. Spend intel to make better buys, or "spend" it by sharing with NPCs to build favor |
> | **Network** (aggregate NPC favor) | Population — more allies = more opportunities, but each relationship requires maintenance |
> | **Time** (weeks/calendar) | The constant constraint — you can't attend Art Basel AND the Venice Biennale if they overlap |

---

### 🗺️ Roadwarden — Time Limit + Attitude + Journal

Roadwarden combines three mechanics that work together brilliantly.

#### The 40-Day Clock
Every action costs time:
- Traveling between locations: 1-3 hours
- Having a conversation: 30 min to 1 hour  
- Resting: a full night
- Investigating a ruin: half a day

At 40 days, you must return. **You cannot see everything in one playthrough.** This forces specialization — do you master the northern settlements or the southern ones? Do you prioritize trade routes or mystery investigation?

#### The Attitude Dial
Before every NPC conversation, you choose your **approach**:

| Attitude | Best Against | Risks | Builds |
|---|---|---|---|
| **Friendly** | Lonely villagers, artisans | Slow trust-building. Some see it as weakness | Long-term trust |
| **Playful** | Children, bored merchants | Can backfire badly with serious NPCs | Amusement, lowered guard |
| **Distanced** | Nobles, priests, officials | They respect it but share less | Professional credibility |
| **Intimidating** | Bandits, cowards, liars | Damages long-term relationship permanently | Immediate compliance |
| **Vulnerable** | Sympathetic types, healers | Manipulative NPCs will exploit you | Emotional connection |

**The attitude choice is permanent for that conversation.** You can't switch mid-dialogue. This forces you to read the NPC and commit to an approach — getting it wrong wastes precious time and potentially burns the relationship.

#### The Player Journal
Roadwarden lets you **write your own notes** in the journal alongside quest entries. This isn't just a log — it's a survival tool. The game gives you information but doesn't tell you what's important. You have to figure it out and record it yourself.

> **ArtLife parallel**: All three mechanics map perfectly:
> - **Time limit**: Our art calendar IS the clock. Auction seasons, fair dates, and exhibition windows are deadlines that force prioritization
> - **Attitude**: We should add a "tone" selector for NPC phone responses: Professional, Schmoozing, Direct, Generous, Ruthless
> - **Journal**: A "collecting journal" where the player tracks deals, provenance notes, and market observations — maybe even free-text notes

---

### 🏛️ Modern Art (Board Game) — The Auction Quartet
Reiner Knizia's masterpiece proves that **how** you sell something changes its value. It doesn't use one auction type; it uses four (or five strategies), shifting constantly.

#### The 5 Auction Types
| Type | How It Works | ArtLife Application |
|---|---|---|
| **English (Open)** | Standard "shout out bids." Highest pays. | Public gallery auctions. Creates "heat" and FOMO. |
| **Sealed Bid** | Everyone secretly writes a price. Reveal simultaneously. Highest wins. | Private dealer sales. "Submit your best offer by Friday." Panic-inducing. |
| **Fixed Price** | Seller names a price. First to say "yes" gets it. | Gallery "Buy It Now" works. Speed deals. |
| **One-Offer** | One lap around the table. You get ONE chance to bid or pass. | High-pressure VIP rooms. "I'm offering this to you once." |
| **Double Auction** | Seller offers two works as a bundle. | Estate sales or "bulk buy" dealer mechanics. |

> **ArtLife parallel**: Different locations should use different auction rules.
> - **Sotheby's/Christie's**: English Auctions (Public, high heat).
> - **Private Dealers**: One-Offer (Take it or leave it).
> - **Estate Sales**: Sealed Bid (Blind strategy).
> **Your class affects this**: An "Insider" might get to see sealed bids before submitting.

---

### 🥂 High Society — The "Poorest Loses" Rule
In *High Society*, you bid on luxury items to get points. But at the end of the game, **the player with the least money is instantly eliminated**, regardless of their score.

#### The Tension
You *must* spend money to win points, but if you spend too much, you auto-lose. This prevents "buying victory" and forces players to gauge everyone else's liquidity.

> **ArtLife parallel**: This is the perfect mechanic for the **Art Market Crash** event.
> - "When the market crashes, the player with the lowest liquidity goes bankrupt (Game Over)."
> - It forces you to keep a "cash buffer" rather than investing 100% in art. Liquidity becomes a survival mechanic.

---

### 📉 Offworld Trading Company — Weaponized Economics
OTC isn't about building armies; it's about **shorting the food supply** right before your opponent needs to buy it.

#### Market Manipulation Tools
- **Shorting**: Selling resources you don't have, hoping to buy them back cheaper later.
- **The Hacker Array**: Artificially inflating/deflating the price of a resource for 60 seconds.
- **EMP/Pirates**: Freezing an opponent's production (supply shock).

> **ArtLife parallel**: The "Hedge Fund Manager" class needs these exact tools.
> - **Rumor Mill**: Spend Intel to temporarily drop an artist's value (then buy cheap).
> - **The Short**: Bet against an artist. If their heat drops, you profit.
> - **Supply Shock**: Convince a collector to "dump" 3 works at once, crashing the price.

---

### 🏗️ The Estates — The Auctioneer's Choice
In *The Estates*, the player who puts an item up for auction has a powerful choice at the end:
1. **Give it to the winner**: The winner pays the bank, gets the item.
2. **Steal it**: The auctioneer pays the *winner* their bid amount, and keeps the item.

This forces bidders to be careful. If I bid $10 (too low), you might just buy it yourself for $10. If I bid $50 (too high), I force you to pay me $50 if you want to keep it.

> **ArtLife parallel**: This is how **Joint Ownership** or **Partner Disputes** could work.
> "Elena wants to sell the sculpture you co-own. She sets a price. You can either (A) let her sell it and take your half, or (B) pay her that amount to keep it all."

---

## The 12 Stealable Mechanics for ArtLife

Ranked by **impact × implementation effort**:

### Tier 1: Implement Now (Highest Impact, Reasonable Effort)

#### 1. 🔵 Blue Options (from FTL)
Gate event choices behind accumulated stats. Every stat suddenly feels meaningful.

```javascript
// In EventManager, add requirements to choices:
choices: [
  { text: "Decline politely", effect: { reputation: -2 } },
  { text: "Negotiate a better price", 
    requires: { reputation: 50 }, // Standard gate
    effect: { cash: -10000, reputation: 5 } },
  { text: "Get first refusal before anyone else", 
    requires: { 'npcFavor.diana_chen': 10 }, // Blue option!
    effect: { cash: -8000, reputation: 8, intel: 3 },
    isBlueOption: true },
]
```

#### 2. ⏰ Consequence Scheduling (from King of Dragon Pass)
Decisions today cause phone messages, events, and NPC reactions weeks later.

```javascript
// When player makes a decision, schedule future consequences:
ConsequenceScheduler.add({
  triggerWeek: state.week + Math.floor(Math.random() * 8) + 3, // 3-10 weeks later
  type: 'phone_message',
  from: 'sasha_klein',
  condition: () => state.reputation > 40, // Only fires if rep is still high
  content: {
    subject: 'Remember that Tanaka piece?',
    body: 'The provenance is... complicated. We need to talk.',
    urgency: 'urgent',
    actions: [
      { label: 'Get independent authentication', effect: { cash: -5000, intel: 3 } },
      { label: 'Sell it quietly before anyone finds out', effect: { cash: 15000, reputation: -15 } },
      { label: 'Confront Sasha', effect: { 'npcFavor.sasha_klein': -20, intel: 5 } },
    ]
  }
});
```

#### 3. 🧠 NPC Memory (from Sir Brante + Overboard!)
NPCs track what they've witnessed and reference it in future interactions.

```javascript
// Each NPC maintains a memory:
npcMemory: {
  elena_ross: {
    firstMet: 3,
    lastContact: 18,
    totalInteractions: 12,
    witnessed: ['bought_from_sasha', 'snubbed_whitfield', 'attended_art_basel'],
    playerAttitude: 'generous', // Most common attitude toward this NPC
    grudges: ['chose_sasha_over_elena_week_8'],
    favors: ['tipped_off_about_forgery'],
    currentMood: 'warm', // Computed from favor score + recent interactions
  }
}

// Messages reference memories:
function generateMessage(npc) {
  if (npc.memory.grudges.includes('chose_sasha_over_elena_week_8')) {
    return "I heard you and Sasha have been doing business. I hope that works out for you.";
  }
  if (npc.memory.favors.length > 2) {
    return "You've been good to me. I have something that might interest you...";
  }
}
```

#### 4. 📈 Quality Gates (from Fallen London)
Unlock exclusive events, storylines, and content behind accumulated milestones.

```javascript
// Events check quality requirements before firing:
{
  id: 'board_seat_offer',
  title: 'A Seat at the Table',
  requirements: {
    reputation: { min: 75 },
    'npcFavor.elena_ross': { min: 15 },
    attendedVeniceBiennale: { equals: true },
    portfolioValue: { min: 500000 },
    weeksSinceLastScandal: { min: 10 },
  },
  weight: 100, // High priority when all conditions met
}
```

---

### Tier 2: Implement Next Phase (High Impact, Medium Effort)

#### 5. 🔻 Progressive Disclosure (from A Dark Room)
Don't show all UI elements on turn 1. Reveal systems as the player's career grows.

```
Week 1-4:   Market tab only. Buy/sell. Phone inactive.
Week 5:     Phone lights up — first NPC message arrives organically.
Week 8:     Calendar tab appears — "Art Basel is coming."
Week 12:    Intel tab unlocks — "You're starting to hear things..."
Week 20:    Relationships tab — deep NPC connections visualized.
Week 30+:   Legacy systems — board seats, art funds, institutional influence.
```

#### 6. 🕸️ Resource Web (from Banner Saga)
Resources should **interact** — spending one affects others:

```
CASH ←→ REPUTATION: Spending lavishly at events costs cash but builds reputation.
                     Having low rep means worse deal prices.

REPUTATION ←→ INTEL: High rep NPCs share insider knowledge.
                      Sharing intel with wrong person burns reputation.

INTEL ←→ DEALS:      Better intel = better buy/sell decisions.
                      But acting on every piece of intel means 
                      you become predictable (reputation risk).

TIME ←→ ALL:          Every week you attend an event is a week you're not 
                      hunting deals. Calendar forces prioritization.
```

#### 7. 🌡️ Menace/Anti-Resources (from Fallen London + Sunless Sea)
Track negative qualities that accumulate through risky actions:

| Anti-Resource | How It Rises | Threshold Effect |
|---|---|---|
| **Market Heat** | Flipping works fast, suspicious provenance, aggressive bidding | ≥ 8: Auction houses flag you. Prices rise. NPCs become wary |
| **Burnout** | Too many events in a row, neglecting personal life, crises | ≥ 8: Forced rest week. Phone messages pile up unanswered |
| **Debt** | Overextending on purchases, failed speculation | ≥ 8: Creditors call. Must sell a work at a loss or lose reputation |
| **Suspicion** | Dealing in forgeries, shady provenance, NPC betrayals | ≥ 8: Investigation event. Risk of losing portfolio pieces |

---

### Tier 3: Implement Later (Medium Impact, Higher Effort)

#### 8. 🎭 Attitude Dial (from Roadwarden)
Add a tone selector for NPC interactions:

| Tone | Best For | Risk | ArtLife Effect |
|---|---|---|---|
| **Schmoozing** | Collectors, socialites | Seen as superficial by dealers | +social standing, -dealer trust |
| **Professional** | Auction houses, advisors | Cold, no emotional bond forms | +credibility, -personal connection |
| **Direct** | Dealers, time-pressured situations | Offends formal NPCs | +efficiency, -diplomacy |
| **Generous** | Artists, struggling galleries | Costs extra money | +deep loyalty, -cash |
| **Ruthless** | Competitive situations, rival collectors | Burns every bridge | +immediate gain, -long-term network |

#### 9. ⏱️ Event Cooldown / SAY System (from Sunless Sea)
Prevent event flooding with a cooldown mechanic:

```javascript
// Messages don't arrive every turn — they accumulate based on activity:
messageReadiness += weekActivities.length * 0.3; // More active = faster message regen
if (messageReadiness >= 1.0) {
  PhoneManager.deliverNextMessage();
  messageReadiness -= 1.0;
}
```

#### 10. 📓 Decision Journal (from Sir Brante + Roadwarden)
Visual timeline of key decisions with visible causal chains:

```
WEEK 3:  Bought Tanaka piece ($12K) ——→ WEEK 8: Elena noticed, offered partnership
WEEK 5:  Snubbed Whitfield at Armory ——→ WEEK 14: Whitfield blocked your auction consignment
WEEK 8:  Accepted Elena's partnership ——→ WEEK 22: Elena introduces you to Venice Biennale VIPs
```

#### 11. 🤖 NPC Autonomy (from Overboard!)
NPCs act independently whether or not you interact with them:

```javascript
// Each NPC has weekly autonomous actions:
function npcAutonomousTick(npc) {
  // Artists' heat rises/falls naturally
  if (npc.role === 'artist') {
    npc.marketHeat += (Math.random() - 0.5) * 10;
  }
  // Dealers sell to other collectors if you ignore them
  if (npc.role === 'dealer' && npc.pendingOffer && npc.pendingOffer.weeksWaiting > 3) {
    npc.pendingOffer = null; // Sold it to someone else
    npc.grudge += 2; // Mild annoyance at being ignored
  }
  // NPCs talk to each other
  if (npc.connections.includes(otherNpc) && Math.random() < 0.2) {
    // Share gossip about the player
    otherNpc.memory.heardAbout.push(...npc.memory.witnessed);
  }
}
```

#### 12. 🔄 Stat Evolution (from Sir Brante)
Player's character class evolves based on playstyle over time:

```
START: "The Insider — $40K, Rep 30, Intel 20"

WEEK 20 EVOLUTION (based on dominant playstyle):
  If mostly bought art:        → "The Collector" (+portfolio bonuses, +artist connections)
  If mostly traded/flipped:    → "The Speculator" (+market prediction, +deal bonuses)
  If mostly networked/events:  → "The Operator" (+NPC favor gains, +event blue options)
  If mostly used intel:        → "The Strategist" (+intel gains, +auction advantages)
```

---

### Tier 4: The Economic Warfare (From Board Games)

#### 13. 📉 The "Poorest Loses" Liquidity Crunch (from High Society)
It's not enough to have high asset value. You must maintain cash flow.

```javascript
// End of year check:
if (marketState === 'CRASH' && player.cash < 50000) {
  triggerEvent('bankruptcy_liquidation'); // Force sell assets at 30% value
}
```

#### 14. 🔨 Variable Auction Rules (from Modern Art)
Different venues use completely different bidding logic, changing the optimal strategy.

- **English**: Standard `currentBid < yourMaxBid`.
- **Sealed**: `submitBid(x)`. If `x > opponentBids`, you win. No feedback loop.
- **One-Offer**: NPC says: "Price is $50k. Yes or no?" No negotiation.

#### 15. 📉 Short Selling (from Offworld Trading Co)
Betting against an artist.

```javascript
// Player shorts "Max Weber" stock at $100
// 2 weeks later: Max Weber scandal (Heat -50) -> Value drops to $40
// Player covers short: Profit = ($100 - $40) * quantity
```

---

## Narrative Engine Architecture Comparison

| Engine | Architecture | Decision Tracking | Best For | Weakness | Open Source? |
|---|---|---|---|---|---|
| **Ink** (Inkle) | Weave: knots → stitches → diverts | Auto-tracks visited paths + visit counts | Complex branching prose. Dialogue-heavy games | Needs integration layer to sync with game state | ✅ [GitHub](https://github.com/inkle/ink) |
| **Twine** | Passage-based hypertext | Variables + conditionals in passages | Simple IF, choose-your-own-adventure | Falls apart for complex simulations | ✅ [GitHub](https://github.com/klembot/twinejs) |
| **StoryNexus / Fallen London** | Quality-based narrative | Named qualities (hundreds) gate all content | Deep RPGs with reputation, faction, and progression systems | Extremely complex to author and balance | ❌ Proprietary |
| **ChoiceScript** (Choice of Games) | Stats-driven branching + Fairmath | Stats determine available options + challenge success | Stat-based RPGs, balanced character builds | Linear structure, hard to simulate systems | 🔶 Partially |
| **Ren'Py** | Visual novel engine | Flags + variables in Python | Visual novels, dating sims | Not suited for strategy/simulation | ✅ [GitHub](https://github.com/renpy/renpy) |
| **Our approach** (JS + Phaser) | Quality-based + event-driven hybrid | `GameState.state` qualities + scheduled consequences | Full control, simulation + narrative mix | We build everything ourselves | N/A |

> **Our system is closest to Fallen London's quality-based architecture**, implemented in JavaScript with Phaser rendering. The `GameState` qualities + `PhoneManager` messages + `EventManager` weighted events = our custom narrative engine. We should formalize this and make qualities explicit.

---

## Technical Implementation Patterns

### Pattern 1: The Decision Log
```javascript
// Rich decision log with context and effects
class DecisionLog {
  static entries = [];
  
  static record(decision) {
    this.entries.push({
      id: `dec_${Date.now()}`,
      week: GameState.state.week,
      event: decision.eventId,
      choiceIndex: decision.choiceIndex,
      choiceText: decision.label,
      context: {
        cash: GameState.state.cash,
        reputation: GameState.state.reputation,
        portfolioValue: this.getPortfolioValue(),
        npcInvolved: decision.npcId || null,
      },
      effects: decision.effects, // { cash: -25000, reputation: +5 }
      tags: decision.tags, // ['purchase', 'private_sale', 'dealer']
      timestamp: Date.now(),
    });
  }
  
  // Query decisions by tag, NPC, or week range
  static getByTag(tag) { return this.entries.filter(e => e.tags?.includes(tag)); }
  static getByNPC(npcId) { return this.entries.filter(e => e.context.npcInvolved === npcId); }
  static getByWeekRange(start, end) {
    return this.entries.filter(e => e.week >= start && e.week <= end);
  }
}
```

### Pattern 2: Consequence Scheduler
```javascript
// Schedule consequences for future turns
class ConsequenceScheduler {
  static queue = [];
  
  static add(consequence) {
    this.queue.push({
      id: `csq_${Date.now()}`,
      triggerWeek: consequence.triggerWeek,
      type: consequence.type, // 'phone_message', 'event', 'stat_change', 'npc_action'
      condition: consequence.condition || (() => true), // Optional runtime condition
      payload: consequence.payload,
      sourceDecision: consequence.sourceDecisionId, // Link back to the decision that caused this
      fired: false,
    });
  }
  
  // Called every advanceWeek()
  static tick(currentWeek) {
    const due = this.queue.filter(c => 
      c.triggerWeek <= currentWeek && !c.fired && c.condition()
    );
    due.forEach(c => {
      c.fired = true;
      this.execute(c);
    });
  }
  
  static execute(consequence) {
    switch (consequence.type) {
      case 'phone_message':
        PhoneManager.addMessage(consequence.payload);
        break;
      case 'event':
        EventManager.queueSpecialEvent(consequence.payload);
        break;
      case 'stat_change':
        Object.entries(consequence.payload).forEach(([stat, delta]) => {
          GameState.state[stat] += delta;
        });
        break;
      case 'npc_action':
        // NPC does something independent
        PhoneManager.contacts[consequence.payload.npcId].favor += consequence.payload.favorDelta;
        break;
    }
  }
}
```

### Pattern 3: Quality Gate Checker
```javascript
// Check if a player meets quality requirements (Fallen London style)
class QualityGate {
  static check(requirements) {
    for (const [key, condition] of Object.entries(requirements)) {
      const value = this.resolveQuality(key);
      
      if (typeof condition === 'object') {
        if (condition.min !== undefined && value < condition.min) return false;
        if (condition.max !== undefined && value > condition.max) return false;
        if (condition.equals !== undefined && value !== condition.equals) return false;
      } else {
        // Simple equality check
        if (value !== condition) return false;
      }
    }
    return true;
  }
  
  // Resolve dotted paths like 'npcFavor.elena_ross'
  static resolveQuality(key) {
    const parts = key.split('.');
    let value = GameState.state;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }
}

// Usage:
const event = {
  requirements: {
    reputation: { min: 60 },
    'npcFavor.elena_ross': { min: 10 },
    attendedArtBasel: { equals: true },
    marketHeat: { max: 5 }, // Can't be too "hot"
  }
};

if (QualityGate.check(event.requirements)) {
  // This event can fire
}
```

### Pattern 4: NPC Autonomous Tick
```javascript
// NPCs act independently each turn
class NPCSimulation {
  static tick() {
    Object.values(PhoneManager.contacts).forEach(npc => {
      // Favor decays over time if you don't interact
      if (npc.lastContact && GameState.state.week - npc.lastContact > 4) {
        npc.favor = Math.max(npc.favor - 1, -100);
      }
      
      // Artists' market heat fluctuates independently
      if (npc.role === 'artist') {
        npc.marketHeat = Math.max(0, npc.marketHeat + (Math.random() - 0.5) * 8);
      }
      
      // Dealers sell pending offers after 3 weeks of waiting
      if (npc.pendingOffer && npc.pendingOffer.offeredWeek + 3 < GameState.state.week) {
        npc.pendingOffer = null;
        npc.favor -= 3; // Minor grudge
        PhoneManager.addMessage({
          from: npc.id,
          subject: 'Sold it',
          body: `That piece I offered you? Found another buyer. These things don't wait.`,
          urgency: 'low',
        });
      }
      
      // NPC-to-NPC gossip
      if (Math.random() < 0.15) {
        const gossipTarget = this.getRandomContact(npc);
        if (gossipTarget && npc.memory?.witnessed.length > 0) {
          gossipTarget.heardAbout = gossipTarget.heardAbout || [];
          gossipTarget.heardAbout.push(...npc.memory.witnessed.slice(-2));
        }
      }
    });
  }
}
```

### Pattern 5: State Serialization (Save/Load)
```javascript
function serializeGameState() {
  return JSON.stringify({
    version: '0.3.0',
    savedAt: Date.now(),
    // Core state
    state: GameState.state,
    // Phone system
    phone: {
      messages: PhoneManager.messages,
      contacts: PhoneManager.contacts,
    },
    // Decision history
    decisions: DecisionLog.entries,
    // Scheduled consequences  
    consequences: ConsequenceScheduler.queue.map(c => ({
      ...c,
      condition: undefined, // Can't serialize functions — store condition ID instead
      conditionId: c.conditionId,
    })),
    // NPC memories
    npcMemory: Object.fromEntries(
      Object.entries(PhoneManager.contacts).map(([id, npc]) => [id, npc.memory])
    ),
  });
}
```

---

## Open Source References

| Repository | Language | What To Study |
|---|---|---|
| [inkle/ink](https://github.com/inkle/ink) | C# | Weave architecture, visit counting, conditional content, knots/stitches |
| [y-lohse/inkjs](https://github.com/y-lohse/inkjs) | JavaScript | JS port of Ink runtime — could integrate directly into our Phaser game |
| [doublespeakgames/adarkroom](https://github.com/doublespeakgames/adarkroom) | JavaScript | **Fully open source!** Progressive disclosure, prestige mechanics, resource management |
| [klembot/twinejs](https://github.com/klembot/twinejs) | JavaScript | Passage-based story structure, variable/macro system |
| [textadventures/quest](https://github.com/textadventures/quest) | C# | Visual script editor patterns, room/object model |
| [okaybenji/text-engine](https://github.com/okaybenji/text-engine) | JavaScript | Browser text adventure engine, command-replay save system |
| [renpy/renpy](https://github.com/renpy/renpy) | Python | Visual novel patterns, flag management, choice trees |
| [Narraitor](https://github.com/topics/narrative-engine) | Various | Decision weight system (minor/major/critical choices) |

> **Special note**: A Dark Room's full source code is on GitHub. It's written in JavaScript. We should study its progressive disclosure implementation directly — it's the closest open-source reference to what we're building.

---

## Priority Roadmap for ArtLife

Based on everything in this research, here's the implementation order that gives maximum impact:

### 🔴 Next Sprint (Before Phase B)
1. **Quality Gates on events** — Add `requirements` field to events. `QualityGate.check()` before firing.
2. **Blue Options on event choices** — Show/hide choices based on player qualities. Mark blue options visually.
3. **Consequence Scheduler** — `ConsequenceScheduler.add()` in event handlers. `.tick()` in `advanceWeek()`.

### 🟡 Phase B–C
4. **NPC Memory** — Track `witnessed[]`, `grudges[]`, `favors[]` per NPC. Reference in messages.
5. **Anti-Resources** — Add `marketHeat` and `burnout` tracking. Threshold events.
6. **Decision Journal** — Log decisions with context. Visual timeline in Intel tab.

### 🟢 Phase D–E
7. **NPC Autonomy** — Weekly autonomous tick per NPC. Favor decay. Independent sales.
8. **Progressive Disclosure** — Phase UI reveals into early/mid/late game.
9. **Attitude Dial** — Tone selector for phone message responses.
10. **Stat Evolution** — Character specialization at Week 20 milestone.

---

## Tags
#research #game-design #text-rpg #narrative-engine #mechanics #decision-systems #deep-dive
