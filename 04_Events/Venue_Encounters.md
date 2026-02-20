# 🎭 Venue Encounters — Scripted Room Events

> Events triggered by specific room + player-state combinations during venue visits. These fire via `RoomManager` when the player enters a room or interacts with an item, adding dynamic narrative to exploration.

---

## Encounter Format

```javascript
{
    id: 'encounter_id',
    venue: 'venue_id',                  // Which venue file
    room: 'room_id',                    // Which room triggers it
    trigger: 'on_enter' | 'on_interact' | 'on_time', // When it fires
    triggerCondition: { ... },          // QualityGate — player state required
    oneShot: true,                      // Only fires once per playthrough
    priority: 3,                        // Higher = fires first if multiple eligible
    timeCost: 1,                        // Actions consumed
    narrative: '...',                   // Noir prose setup
    choices: [ ... ],                   // Player options
    schedules: [ ... ],                // ConsequenceScheduler entries
}
```

---

## Encounter 1: The Red Dot 🔴

**Venue:** Gallery Opening — Main Floor
**Trigger:** Enter `chelsea_main_floor` with `cash ≥ 20000`
**Theme:** Pre-sale buying window — be first or lose it

```json
{
    "id": "encounter_red_dot",
    "venue": "gallery_opening",
    "room": "chelsea_main_floor",
    "trigger": "on_enter",
    "triggerCondition": { "cash": { "min": 20000 } },
    "oneShot": true,
    "priority": 5,
    "timeCost": 1,
    "narrative": "Elena intercepts you before you've even taken off your coat. 'There's a piece I'm about to red-dot. It's reserved for a museum, but they're dragging their feet on the paperwork.' She checks her watch. 'I can hold it for five minutes. After that, the Fondation Beyeler gets the call.'",
    "choices": [
        {
            "label": "Buy it immediately — don't even ask the price",
            "tone": "direct",
            "effects": { "cash": -22000, "reputation": 5 },
            "npcEffects": { "elena_ross": { "favor": 5 } },
            "outcome": "You nod. She smiles. A red dot appears on the wall label. The piece is yours before you've even seen it properly. This is how the game works — trust, speed, and cash.",
            "schedules": [{
                "weeksDelay": 6,
                "type": "phone_message",
                "payload": {
                    "from": "elena_ross",
                    "subject": "The museum is furious",
                    "body": "The Fondation Beyeler called. They're not happy. But they'll get over it. The piece is already worth more than you paid. Good instincts."
                }
            }]
        },
        {
            "label": "Ask about the piece first",
            "tone": "friendly",
            "effects": { "intel": 2 },
            "outcome": "She describes it — a mid-career work by an artist on the rise. Interesting, but you've used up your five minutes asking questions. Her phone buzzes. 'Too late. Basel just confirmed.' She shrugs. The moment is gone.",
            "npcEffects": { "elena_ross": { "favor": -1 } }
        },
        {
            "label": "Pass — museums should have first refusal",
            "tone": "generous",
            "effects": { "reputation": 3 },
            "npcEffects": { "elena_ross": { "favor": 2 } },
            "outcome": "Elena tilts her head. 'That's... unusually noble.' She puts her phone away. 'I'll remember that.' She will."
        }
    ]
}
```

---

## Encounter 2: The Backroom Deal 🚪

**Venue:** Gallery Opening — Backroom
**Trigger:** Enter `chelsea_backroom` with `reputation ≥ 50`
**Theme:** Exclusive below-market offer — the privilege of access

```json
{
    "id": "encounter_backroom_deal",
    "venue": "gallery_opening",
    "room": "chelsea_backroom",
    "trigger": "on_enter",
    "triggerCondition": { "reputation": { "min": 50 } },
    "oneShot": true,
    "priority": 4,
    "timeCost": 1,
    "narrative": "The gallery assistant closes the door behind you. On a table, unwrapped from acid-free tissue: a painting you've only seen in photographs. It's a major work from a sold-out series. The assistant speaks quietly. 'Elena wants you to have first look. It's a consignment — the original buyer needs liquidity. Below market. Significantly below market.'",
    "choices": [
        {
            "label": "Name your price — I'll take it",
            "tone": "direct",
            "requires": { "cash": { "min": 45000 } },
            "isBlueOption": true,
            "effects": { "cash": -45000, "reputation": 3 },
            "npcEffects": { "elena_ross": { "favor": 5 } },
            "outcome": "You write a number on a card and slide it across the table. The assistant makes a call. Thirty seconds later: 'Accepted.' You just bought a $70,000 painting for $45,000. The consigner was desperate. You weren't."
        },
        {
            "label": "What's the story behind the consignment?",
            "tone": "schmoozing",
            "effects": { "intel": 4 },
            "outcome": "The assistant hesitates. 'Divorce. She got the apartment, he got the art. He doesn't want the art — he wants to hurt her by selling it cheap.' You now know more than you should.",
            "npcEffects": { "elena_ross": { "favor": -1 } }
        },
        {
            "label": "I don't buy from forced sales. It feels wrong.",
            "tone": "generous",
            "effects": { "reputation": 5 },
            "npcEffects": { "elena_ross": { "favor": 3 } },
            "outcome": "The assistant blinks. Nobody refuses these offers. 'I'll let Elena know.' The painting goes back in the tissue. Someone else will take it within the hour."
        }
    ]
}
```

---

## Encounter 3: The Drunk Collector 🥂

**Venue:** Cocktail Party — Terrace
**Trigger:** Enter `cocktail_terrace` with `timeCost ≥ 3` (late in visit)
**Theme:** Distressed intel from a loose tongue

```json
{
    "id": "encounter_drunk_collector",
    "venue": "cocktail_party",
    "room": "cocktail_terrace",
    "trigger": "on_enter",
    "triggerCondition": null,
    "oneShot": true,
    "priority": 3,
    "timeCost": 1,
    "narrative": "A man in a crumpled Brioni suit is leaning on the railing, holding a glass that's mostly ice. He's been here since the beginning. His eyes are glazed but his mouth is still working. 'You collect, right? I can always tell. It's the way you look at walls.' He laughs at his own joke. 'I need to sell something. Something big. And I need to do it quietly.'",
    "choices": [
        {
            "label": "I'm listening. What do you have?",
            "tone": "direct",
            "effects": { "intel": 5 },
            "outcome": "He pulls out his phone and shows you a photograph. It's a de Kooning. Museum quality. 'My wife doesn't know I own it. It's in a storage unit in Red Hook. I need $400K by Friday.' He writes an address on a cocktail napkin. This is either the opportunity of a lifetime or a trap.",
            "schedules": [{
                "weeksDelay": 1,
                "type": "phone_message",
                "payload": {
                    "from": "system",
                    "subject": "Re: The de Kooning",
                    "body": "The address on the napkin checks out. The storage unit exists. A friend at Christie's says the painting is real — it appeared in a 2004 catalogue. The question is provenance. Do you want to proceed?"
                }
            }]
        },
        {
            "label": "You should talk to a professional, not a stranger at a party",
            "tone": "friendly",
            "effects": { "reputation": 2 },
            "outcome": "He blinks. Something clears in his eyes. 'You're right. God, you're right. I'm a mess.' He puts down the glass. 'Thank you.' He might actually remember this kindness.",
            "npcEffects": {}
        },
        {
            "label": "How much below market are you willing to go?",
            "tone": "ruthless",
            "effects": { "intel": 3, "suspicion": 3 },
            "outcome": "'Fifty percent. Maybe more.' He's shaking slightly. This is desperation dressed in Italian tailoring. You could take advantage of this. You could also walk away.",
            "schedules": [{
                "weeksDelay": 1,
                "type": "phone_message",
                "payload": {
                    "from": "system",
                    "subject": "Opportunity: Distressed sale",
                    "body": "The drunk collector's name is Gerald Hoffman. His financials are public — he's overleveraged on three properties. The de Kooning is real. You could acquire it for $200K. Market value: $450K. Ethical value: questionable."
                }
            }]
        }
    ]
}
```

---

## Encounter 4: The Overheard Forgery 🔍

**Venue:** Auction House — Bidding Floor
**Trigger:** Enter `auction_bidding_floor` while owning a work by the same artist as a lot
**Theme:** Provenance crisis — keep quiet or blow the whistle

```json
{
    "id": "encounter_overheard_forgery",
    "venue": "auction_house",
    "room": "auction_bidding_floor",
    "trigger": "on_enter",
    "triggerCondition": { "portfolioCount": { "min": 1 } },
    "oneShot": true,
    "priority": 6,
    "timeCost": 1,
    "narrative": "Between lots, you overhear two specialists whispering near the curtain. One is holding a UV light. '...the varnish is wrong. It's uniform — no craquelure variation. This was painted in the last five years, not 1962.' The other checks the catalog. The lot in question is by the same artist whose work hangs in your apartment.",
    "choices": [
        {
            "label": "Report it to the auction house director",
            "tone": "friendly",
            "effects": { "reputation": 10, "intel": 2 },
            "outcome": "You approach the head of department discreetly. Within thirty minutes, the lot is withdrawn. Your name isn't mentioned publicly, but the right people know. You just saved someone millions — and earned a reputation for integrity that money can't buy.",
            "schedules": [{
                "weeksDelay": 2,
                "type": "phone_message",
                "payload": {
                    "from": "diana_chen",
                    "subject": "Thank you",
                    "body": "I heard what you did at the sale. That took guts. We owe you one. Next time you're at a viewing, ask for me directly."
                }
            }]
        },
        {
            "label": "Stay quiet — the forgery drives down the artist's market",
            "tone": "ruthless",
            "effects": { "marketHeat": 3, "suspicion": 5 },
            "outcome": "You say nothing. The lot sells for $1.2M to a buyer in Hong Kong. When the forgery is discovered — and it will be — the entire market for this artist collapses. Your holdings will lose value. But you'll be positioned to buy the dip.",
            "schedules": [{
                "weeksDelay": 6,
                "type": "stat_change",
                "payload": { "effects": { "suspicion": 5 } }
            }]
        },
        {
            "label": "Buy the lot yourself — you'll know the truth",
            "tone": "direct",
            "requires": { "cash": { "min": 80000 } },
            "isBlueOption": true,
            "effects": { "cash": -80000, "intel": 5 },
            "outcome": "You raise your paddle. The bidding is brief — nobody else wants it at this level. You now own a painting that might be worth $1.2M or $0. Either way, you control the narrative."
        }
    ]
}
```

---

## Encounter 5: Studio Revelation 🎨

**Venue:** Artist Studio — Studio Floor
**Trigger:** Enter `studio_main_floor` with `totalWorksBought ≥ 4`
**Theme:** Private commission offer — the artist trusts you

```json
{
    "id": "encounter_studio_revelation",
    "venue": "artist_studio",
    "room": "studio_main_floor",
    "trigger": "on_enter",
    "triggerCondition": { "totalWorksBought": { "min": 4 } },
    "oneShot": true,
    "priority": 4,
    "timeCost": 1,
    "narrative": "Kwame stops painting when you walk in. He wipes his hands slowly, studying you. 'You've been buying a lot of art.' It's not a question. 'I've been thinking about something. A commission. Something I've never done before.' He pulls out a sketchbook and shows you a drawing — it's you. Or rather, it's a portrait of a collector. Abstract. Fragmented. Disturbing and beautiful.",
    "choices": [
        {
            "label": "Commission the portrait. Name your price.",
            "tone": "generous",
            "requires": { "cash": { "min": 15000 } },
            "effects": { "cash": -15000, "reputation": 8 },
            "npcEffects": { "kwame_asante": { "favor": 15 } },
            "outcome": "Kwame nods. No negotiation. He tears the page from the sketchbook and pins it to the wall. 'Give me six weeks.' The portrait will be unlike anything in his catalog — and it will be about you.",
            "schedules": [{
                "weeksDelay": 6,
                "type": "phone_message",
                "payload": {
                    "from": "kwame_asante",
                    "subject": "It's done",
                    "body": "Come see it. I think it's the best thing I've ever painted. And I hate you for making me say that."
                }
            }]
        },
        {
            "label": "I'm flattered, but I don't want art about me",
            "tone": "friendly",
            "effects": { "reputation": 2 },
            "npcEffects": { "kwame_asante": { "favor": 3 } },
            "outcome": "He laughs. 'Fair enough. Most collectors want the immortality. You're different.' He goes back to painting. The sketch stays on the wall."
        },
        {
            "label": "How much will it be worth?",
            "tone": "direct",
            "effects": {},
            "npcEffects": { "kwame_asante": { "favor": -10 } },
            "outcome": "Kwame's face closes. He puts the sketchbook away. 'Forget I asked.' He turns back to his canvas. You've measured the wrong thing."
        }
    ]
}
```

---

## Encounter 6: The Uninvited Guest 👤

**Venue:** Any venue — any room with another collector NPC present
**Trigger:** Room contains a rival collector NPC + `reputation ≥ 30`
**Theme:** Forced confrontation — social chess

```json
{
    "id": "encounter_uninvited_guest",
    "venue": null,
    "room": null,
    "trigger": "on_enter",
    "triggerCondition": { "reputation": { "min": 30 } },
    "oneShot": false,
    "priority": 2,
    "timeCost": 1,
    "narrative": "Victoria Sterling spots you across the room. She makes a beeline, champagne in hand. 'Darling! I didn't expect to see you here.' Her smile is a weapon. 'I heard you've been doing well. Very well. Some people are saying too well.' She lets the implication hang.",
    "choices": [
        {
            "label": "Return the compliment — deflect with charm",
            "tone": "schmoozing",
            "effects": { "intel": 1 },
            "npcEffects": { "victoria_sterling": { "favor": 1 } },
            "outcome": "You match her energy. Two predators circling each other at a garden party. Neither of you learns anything, but neither of you shows weakness. Stalemate."
        },
        {
            "label": "Ask her directly what she's heard",
            "tone": "direct",
            "effects": { "intel": 3 },
            "npcEffects": { "victoria_sterling": { "favor": -2 } },
            "outcome": "'I heard you flipped a Koons for triple in six months. People notice that kind of thing.' She sips her champagne. 'I notice that kind of thing.' She's putting you on notice."
        },
        {
            "label": "Ignore her and walk to the other side of the room",
            "tone": null,
            "effects": { "suspicion": -1 },
            "npcEffects": { "victoria_sterling": { "favor": -5 } },
            "outcome": "You turn and walk away mid-sentence. It's the most aggressive thing you could do at a cocktail party. She'll remember this."
        },
        {
            "label": "Invite her to lunch to discuss a potential collaboration",
            "tone": "generous",
            "effects": { "reputation": 2 },
            "npcEffects": { "victoria_sterling": { "favor": 5 } },
            "outcome": "'Lunch?' She looks genuinely surprised. 'How... civilised.' She accepts. This could be the beginning of an alliance or the setup for a betrayal. With Victoria, it's usually both.",
            "schedules": [{
                "weeksDelay": 2,
                "type": "phone_message",
                "payload": {
                    "from": "victoria_sterling",
                    "subject": "Lunch — Le Bernardin?",
                    "body": "Thursday at 1pm? I have a proposition. Bring your checkbook. 😘"
                }
            }]
        }
    ]
}
```

---

## Encounter 7: The Toast 🥂

**Venue:** Cocktail Party — Living Room
**Trigger:** Enter `cocktail_living_room` with host NPC present
**Theme:** Speech event — public display with lasting consequences

```json
{
    "id": "encounter_toast",
    "venue": "cocktail_party",
    "room": "cocktail_living_room",
    "trigger": "on_enter",
    "triggerCondition": null,
    "oneShot": true,
    "priority": 3,
    "timeCost": 1,
    "narrative": "The host taps a glass. The room falls quiet. 'I'd like to raise a toast — to our newest collector friend.' She gestures at you. Every face in the room turns. 'Would you like to say a few words?' There is no good way to decline.",
    "choices": [
        {
            "label": "Give a gracious speech about the art on the walls",
            "tone": "friendly",
            "effects": { "reputation": 5 },
            "outcome": "You speak for ninety seconds about the collection, the curation, the host's eye. It's warm without being sycophantic. People nod. Someone takes a photo. You've passed a social test you didn't study for."
        },
        {
            "label": "Make a joke — keep it light",
            "tone": "schmoozing",
            "effects": { "reputation": 2, "intel": 1 },
            "outcome": "'I'd say something profound about art, but I've had three glasses of this excellent wine.' Laughter. Relief. You've shown everyone that you don't take yourself too seriously — which, in this room, is the most serious thing you could do."
        },
        {
            "label": "Say something provocative about the market",
            "tone": "ruthless",
            "effects": { "reputation": -3, "intel": 3, "marketHeat": 2 },
            "outcome": "'The best collection in this room isn't on the walls — it's in the tax-free storage in Geneva.' Silence. Then a few nervous laughs. You've just said the quiet part loud. Half the room loves you. The other half wants you dead."
        },
        {
            "label": "Decline politely — 'I'll let the art speak for itself'",
            "tone": null,
            "effects": { "reputation": 1 },
            "outcome": "A murmur of approval. The host nods. 'Well said.' It's the safest choice. Nobody will remember it tomorrow."
        }
    ]
}
```

---

## Encounter 8: The Offer You Can't Refuse 💰

**Venue:** Cocktail Party — Study
**Trigger:** Enter `cocktail_study` with host `favor ≥ 8`
**Theme:** Below-market piece — reward for relationship investment

```json
{
    "id": "encounter_cant_refuse",
    "venue": "cocktail_party",
    "room": "cocktail_study",
    "trigger": "on_enter",
    "triggerCondition": { "npcFavor.host_npc": { "min": 8 } },
    "oneShot": true,
    "priority": 5,
    "timeCost": 1,
    "narrative": "The host closes the study door. It's just the two of you now. On the desk, a small painting wrapped in brown paper. 'I've been holding this for the right person. It's a Richter — small, 2006. I paid €40,000 for it. I'll sell it to you for what I paid.' She slides it toward you. 'No commission. No paperwork. Just us.'",
    "choices": [
        {
            "label": "Accept — and thank her sincerely",
            "tone": "friendly",
            "requires": { "cash": { "min": 40000 } },
            "effects": { "cash": -40000, "reputation": 5 },
            "outcome": "You shake hands. No contracts. No gallery cut. The painting goes under your arm. This is how the old world works — trust, discretion, and a handshake. The Richter is now worth €65,000."
        },
        {
            "label": "Accept — but ask if there are more",
            "tone": "direct",
            "requires": { "cash": { "min": 40000 } },
            "effects": { "cash": -40000, "intel": 2 },
            "npcEffects": { "host_npc": { "favor": -2 } },
            "outcome": "She pauses. 'There are always more. But greed is the fastest way to ruin a friendship.' She wraps the painting. The deal is done, but the warmth has cooled."
        },
        {
            "label": "I can't accept this — it's too generous",
            "tone": "generous",
            "effects": { "reputation": 8 },
            "npcEffects": { "host_npc": { "favor": 10 } },
            "outcome": "'Nobody refuses a gift in this world,' she says, stunned. She puts the painting back. But your stock has just gone through the roof. She will tell everyone about this."
        }
    ]
}
```

---

## Encounter 9: The Auction Whisper 🤫

**Venue:** Auction House — Main Hall
**Trigger:** Enter `auction_main_hall` with `intel ≥ 7`
**Theme:** Lot manipulation intel — inside information

```json
{
    "id": "encounter_auction_whisper",
    "venue": "auction_house",
    "room": "auction_main_hall",
    "trigger": "on_enter",
    "triggerCondition": { "intel": { "min": 7 } },
    "oneShot": true,
    "priority": 4,
    "timeCost": 0,
    "narrative": "Marcus Price corners you near the champagne. He's sweating. 'Listen. Lot 47 — the Basquiat drawing. The guarantee is fake. The irrevocable bid is from the consigner's own foundation. They're bidding on their own work to set a public price. If you bid against them, you're just inflating their record.' He looks around. 'Don't tell anyone I told you.'",
    "choices": [
        {
            "label": "Thank him — and stay out of Lot 47",
            "tone": "friendly",
            "effects": { "intel": 5 },
            "npcEffects": { "marcus_price": { "favor": 3 } },
            "outcome": "You nod. Lot 47 sells for $3.2M to an anonymous phone bidder. You know it's the consigner. Nobody else does. This is the real market — the one that happens behind the curtain."
        },
        {
            "label": "Bid on Lot 47 anyway — force them higher",
            "tone": "ruthless",
            "effects": { "intel": 2, "marketHeat": 5, "suspicion": 3 },
            "outcome": "You raise your paddle. The phone bidder hesitates. You push them to $4.1M before dropping out. They've been forced to overpay for their own manipulation. It's dirty pool, but it's effective.",
            "npcEffects": { "marcus_price": { "favor": -5 } }
        },
        {
            "label": "Report the scheme to the auction house",
            "tone": "friendly",
            "effects": { "reputation": 8, "suspicion": -3 },
            "npcEffects": { "marcus_price": { "favor": -10 } },
            "outcome": "You quietly inform the head of department. The lot is withdrawn. Marcus Price won't speak to you again — you burned his source. But the auction house considers you a trusted insider now.",
            "schedules": [{
                "weeksDelay": 1,
                "type": "phone_message",
                "payload": {
                    "from": "diana_chen",
                    "subject": "You did the right thing",
                    "body": "We pulled Lot 47. You saved us a scandal. I owe you a favor — and I always pay my debts."
                }
            }]
        }
    ]
}
```

---

## Encounter 10: The Freeport Ghost 👻

**Venue:** Freeport — Vault Corridor
**Trigger:** Enter `freeport_vault_corridor` with `suspicion ≤ 15` AND `intel ≥ 5`
**Theme:** Moral crossroads — art world's dark secrets

```json
{
    "id": "encounter_freeport_ghost",
    "venue": "freeport",
    "room": "freeport_vault_corridor",
    "trigger": "on_enter",
    "triggerCondition": { "intel": { "min": 5 } },
    "oneShot": true,
    "priority": 5,
    "timeCost": 1,
    "narrative": "As you pass vault 1143, the door is ajar. Inside, a single crate sits on trestles. The stencil reads 'EK/1943/W' — a wartime designation. You know enough to know that 'EK' stands for 'Einsatzstab Kassel,' a Nazi looting unit. This painting was stolen seventy years ago. And someone is storing it here, five meters from your own vault.",
    "choices": [
        {
            "label": "Report it to Swiss authorities",
            "tone": "friendly",
            "effects": { "reputation": 15, "suspicion": -5 },
            "outcome": "You photograph the crate and call FINMA. Within a week, the vault is sealed, the painting confiscated. The owner — a Liechtenstein trust — denies knowledge. Your identity as the whistleblower is protected. For now.",
            "schedules": [
                {
                    "weeksDelay": 4,
                    "type": "news",
                    "payload": { "text": "Breaking: Wartime-looted painting recovered from Geneva Freeport. Anonymous tip leads to Liechtenstein trust investigation." }
                },
                {
                    "weeksDelay": 4,
                    "type": "stat_change",
                    "payload": { "effects": { "reputation": 5 } }
                }
            ]
        },
        {
            "label": "Close the door and walk away",
            "tone": null,
            "effects": { "suspicion": 2 },
            "outcome": "You pull the door shut. The corridor is empty. Nobody saw you. The painting will stay in that vault for another decade, belonging to nobody and everybody. You add another secret to your collection — the invisible kind."
        },
        {
            "label": "Leverage it — find out who owns vault 1143",
            "tone": "ruthless",
            "effects": { "intel": 8, "suspicion": 8, "marketHeat": 3 },
            "outcome": "You take a photo of the crate label. In the Registry Office, you use Charles's access to cross-reference vault 1143. The owner's name is familiar — a prominent collector who just bought three works from your target gallery. You now have leverage over one of the most powerful people in the art world. This knowledge is dangerous.",
            "schedules": [{
                "weeksDelay": 3,
                "type": "phone_message",
                "payload": {
                    "from": "system",
                    "subject": "You're being watched",
                    "body": "An encrypted message arrives: 'I know what you saw in corridor B2. We should talk. — C.' The initial could belong to anyone. Or no one."
                }
            }]
        }
    ]
}
```

---

## Design Notes

### Trigger Priority
When multiple encounters are eligible in the same room, `priority` determines firing order. Higher = fires first. Only one encounter fires per room visit.

### Relationship to Venue Encounter Sections
Each venue file (Gallery Opening, Cocktail Party, etc.) contains a short "Venue Encounters" section listing 2-3 encounter ideas. This file expands those into full, implementable encounter definitions with choices, effects, and consequences.

### Cross-References
- **Encounter 1 (Red Dot)** references Elena Ross from `Dialogue_Trees_V2.md`
- **Encounter 4 (Forgery)** + **Encounter 9 (Whisper)** connect to the Auction House venue
- **Encounter 5 (Studio Revelation)** connects to Kwame Asante in the Artist Studio
- **Encounter 6 (Uninvited Guest)** introduces Victoria Sterling as a recurring rival
- **Encounter 10 (Freeport Ghost)** ties into the Freeport's moral-grey-zone themes
- Encounters **4**, **9**, and **10** can chain — player reputation for honesty or corruption compounds

### Tone Coverage
| Tone | Featured In |
|---|---|
| Friendly 🤝 | Encounters 1, 4, 7, 9, 10 |
| Schmoozing 🎭 | Encounters 2, 6, 7 |
| Direct 🗡️ | Encounters 1, 2, 3, 4, 5, 8, 9 |
| Generous 💎 | Encounters 1, 2, 5, 6, 8 |
| Ruthless 🔥 | Encounters 3, 4, 7, 9, 10 |

---

## Tags
#encounters #events #venues #rooms #noir #game-design
