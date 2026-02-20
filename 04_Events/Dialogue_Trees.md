# 🌿 Dialogue Trees

## Overview
Between turns, events surface as dialogue cards. Each card presents a scenario and gives the player 2–4 choices. Choices have immediate and/or delayed consequences — on portfolio, relationships, or market position.

---

## Structure of a Dialogue Card

```
┌─────────────────────────────────────────────────────┐
│  📍 EVENT TYPE        📅 Week 34, Year 2             │
│                                                       │
│  [Character portrait or scene illustration]           │
│                                                       │
│  "Event description / flavour text here.              │
│   Sets the scene and stakes."                         │
│                                                       │
│  ┌─────────────────────────────────────────────┐     │
│  │  [A]  Option one — short label              │     │
│  │  [B]  Option two — short label              │     │
│  │  [C]  Option three — short label            │     │
│  │  [D]  Do nothing / pass                     │     │
│  └─────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

---

## Example Dialogue Trees

---

### Cocktail Party Tip
> *"At the Hauser & Wirth opening, a dealer you vaguely know pulls you aside. She says she has it on good authority that a young painter — currently unknown — is about to be picked up by a major New York gallery."*

- **[A] Buy 2–3 of her works immediately**
  → Spend capital now, high risk, high reward if tip is right
  → *Possible outcome:* Artist breaks out in 20 turns, 4x return

- **[B] Ask for more information before committing**
  → Delays action by 1 turn, tip may leak to others
  → *Possible outcome:* Slightly higher entry price but more confidence

- **[C] Pass the tip to a rival collector as a favour**
  → Builds relationship with rival, skip the risk yourself
  → *Possible outcome:* Rival owes you one — future benefit TBD

- **[D] Ignore it**
  → No action, no risk
  → *Possible outcome:* Watch artist explode without you

---

### Forced Sale Opportunity
> *"You hear through the grapevine that a collector in financial difficulty is quietly offloading a significant work — a piece by an artist whose market is currently strong. They want a fast, discreet transaction."*

- **[A] Move quickly and make an offer below market**
  → Potentially buy at 30–40% discount
  → *Possible outcome:* Great deal, but relationship damage if seller later regrets

- **[B] Offer a fair price, build goodwill**
  → Pay closer to market value
  → *Possible outcome:* Seller becomes a future ally/source

- **[C] Refer them to an auction house instead**
  → You stay out of it, signal integrity
  → *Possible outcome:* Auction house relationship improves

- **[D] Pass entirely**
  → Miss the deal

---

### Inheritance Event (Rich Kid Class)
> *"Your phone rings at 3am. Your father has died of a heart attack. Among the estate: a villa in Cap Ferrat, significant debt, and a collection of 22 works — some extraordinary, some questionable."*

- **[A] Keep the entire collection**
  → Portfolio expands significantly, but also inherits tax obligations
  → *Possible outcome:* Long-term value if you hold the right pieces

- **[B] Sell the weaker works, keep the blue-chips**
  → Raises cash, streamlines portfolio
  → *Possible outcome:* Balanced — capital + quality holdings

- **[C] Put everything to auction immediately**
  → Maximum liquidity, clean slate
  → *Possible outcome:* Large cash injection but miss long-term upside

- **[D] Donate the collection to an institution**
  → Zero financial gain, massive reputation and social capital gain
  → *Possible outcome:* Unlocks institutional events and curator relationships

---

### Scandal Event
> *"An artist you hold significantly has been accused of plagiarism. The story is gathering momentum online. No official verdict yet, but the market is already nervous."*

- **[A] Sell immediately before the market reacts**
  → Protect your position, but adds to the panic
  → *Possible outcome:* Exit cleanly, but artist may recover and you miss it

- **[B] Hold and wait for more information**
  → Bet that it blows over
  → *Possible outcome:* If vindicated, heat recovers. If confirmed, heavy loss.

- **[C] Publicly defend the artist**
  → Use your reputation to calm the market
  → *Possible outcome:* Artist heat stabilises — but your reputation is now tied to theirs

- **[D] Quietly reach out to the artist directly**
  → Private intel — find out the truth before deciding
  → *Possible outcome:* Costs 1 extra turn but gives you better information

---

## Design Notes
- Choices should **never be obviously correct** — trade-offs are the point
- Some choices have **delayed consequences** (2–20 turns later)
- Player's **character class** can unlock additional options not available to others
- Relationship history with NPCs can change what choices are available

---

## 🎭 Tone System (V2)

The V2 dialogue system introduces **5 conversation tones** that shape NPC interactions and long-term character evolution. See [Dialogue_Trees_V2.md](Dialogue_Trees_V2.md) for full specification.

| Tone | Icon | Effect |
|---|---|---|
| Friendly | 🤝 | Builds trust slowly, +reputation |
| Schmoozing | 🎭 | Extracts intel, risks being seen as superficial |
| Direct | 🗡️ | Efficient deals, offends traditionalists |
| Generous | 💎 | Deep NPC favor, drains resources |
| Ruthless | 🔥 | Maximum intel/advantage, burns relationships permanently |

**At Week 20**, the player's dominant tone triggers a **character specialization** with permanent bonuses.

---

## 🏛️ Venue Encounters

Scripted encounters fire during room exploration based on player state. See [Venue_Encounters.md](Venue_Encounters.md) for 10 fully-defined encounters across all venues.

---

## Tags
#events #dialogue #narrative #game-design

