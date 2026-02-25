# 🌍 Locations

## Overview
The game takes place across a set of real-world art market hubs. Each location has its own character, event types, and gallery tier. Players may be based in one city but travel to others for key events.

---

## Primary Locations

### 🗽 New York
- **Character:** The commercial centre. Fast, aggressive, money-first.
- **Key Venues:** Chelsea galleries, auction houses (Christie's, Sotheby's, Phillips)
- **Events:** Major auctions, studio visits, art fairs (Armory Show)
- **Market Tone:** High liquidity, competitive, transparent pricing
- **Advantage:** Best auction access, most active secondary market

**Implemented Venues:**

| Venue | File | Rooms | Key NPCs |
|---|---|---|---|
| Gallery Opening — Chelsea | [Gallery_Opening.md](Rooms/Gallery_Opening.md) | Main Floor, Backroom, Street, Storage | Elena Ross, Gallery Assistant |
| Cocktail Party — Upper East Side | [Cocktail_Party.md](Rooms/Cocktail_Party.md) | Foyer, Living Room, Terrace, Hallway, Study | Philippe Noir, Host, Sasha Klein |
| Auction House — Rockefeller Plaza | [Auction_House.md](Rooms/Auction_House.md) | Main Hall, Bidding Floor, Private Viewing, Cashier | Marcus Price, Diana Chen |
| Artist Studio — Bushwick | [Artist_Studio.md](Rooms/Artist_Studio.md) | Street, Studio Floor, Vault, Roof | Kwame Asante |

---

### 🇨🇭 Basel / Zurich
- **Character:** The institutional heart. Serious, discreet, legacy-focused.
- **Key Venues:** Art Basel (June), private banking connections, freeports
- **Events:** Art Basel (annual, ~52 turns), freeport transactions, private sales
- **Market Tone:** Slow, considered, high-value
- **Advantage:** Best freeport access, European collector networking

**Implemented Venues:**

| Venue | File | Rooms | Key NPCs |
|---|---|---|---|
| Art Basel — Messeplatz | [Art_Fair_Basel.md](Rooms/Art_Fair_Basel.md) | Exhibition Hall, Blue Chip Booth, VIP Lounge, Loading Dock | Lorenzo Gallo, Senior Director, Baroness von H. |
| Geneva Freeport | [Freeport.md](Rooms/Freeport.md) | Security, Vault Corridor, Private Viewing, Registry | Charles Vandermeer, Registry Clerk |

---

### 🇬🇧 London
- **Character:** The bridge between old money and new ideas.
- **Key Venues:** Mayfair galleries, Frieze (October), Tate, Serpentine
- **Events:** Frieze Art Fair (annual), cocktail circuit, YBA-adjacent scene
- **Market Tone:** Cultural credibility-driven, strong mid-market
- **Advantage:** Best for emerging British/European artists, strong critical press

**Planned Venues:** Frieze Art Fair, Mayfair Gallery, Private Club (Phase 2+)

---

### 🇭🇰 Hong Kong
- **Character:** The gateway to Asian capital. Fast growth, new money.
- **Key Venues:** Art Basel Hong Kong (March), local auction houses
- **Events:** Art Basel HK (annual), strong collector dinner circuit
- **Market Tone:** Growth-oriented, speculation-friendly
- **Advantage:** Access to Asian artists early, fast-moving collectors

**Planned Venues:** Art Basel HK, Private Dining (Phase 2+)

---

### 🇮🇹 Venice (Biennale)
- **Character:** Prestige and cultural legitimacy above all.
- **Key Events:** Venice Biennale (every ~104 turns / 2 years)
- **Market Tone:** Non-commercial officially — but enormous heat mover
- **Advantage:** Artists featured here get significant heat boosts — great for holders

**Planned Venues:** National Pavilion, Giardini, Vernissage Party (Phase 3+)

---

## Venue Access Summary

| Venue | Location | Frequency | Entry Gate | Time Limit |
|---|---|---|---|---|
| Gallery Opening | New York | Every 3-6 weeks | None | 5 |
| Cocktail Party | New York | Every 4-8 weeks | Invitation required | 5 |
| Auction House | New York | Seasonal (May/Nov) | Rep ≥ 20 | 5 |
| Artist Studio | New York | By invitation | Intel ≥ 15 | 6 |
| Art Basel | Basel | Annual (June) | Rep ≥ 30 | 4 |
| Freeport | Geneva | Every 8-12 weeks | Cash ≥ $100K, Rep ≥ 40 | 4 |

---

## Location Mechanics
- Player has a **home base** (chosen at start)
- Travelling to another city costs 1 action slot
- Some events are **location-exclusive** — you must be present
- Freeport access is tied to specific cities (Geneva, Singapore, Delaware)

---

## Encounter Distribution

Each venue has scripted encounters that trigger based on player state. See [Venue_Encounters.md](../04_Events/Venue_Encounters.md) for full definitions.

| Venue | # Encounters | Themes |
|---|---|---|
| Gallery Opening | 2 | Pre-sale window, backroom consignment |
| Cocktail Party | 3 | Drunk collector, toast speech, private offer |
| Auction House | 2 | Forgery crisis, lot manipulation intel |
| Artist Studio | 1 | Private commission offer |
| Art Basel | *(in venue file)* | Impulse buy, journalist trade, double-booking |
| Freeport | 1 + *(in venue file)* | Wartime loot, tax maneuver, inspection |
| Any venue | 1 | Rival confrontation |

---

## Tags
#world #locations #venues #game-design
