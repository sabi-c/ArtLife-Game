# 🎯 MVP Definition — ArtLife v0.1

> The smallest playable version that proves the core loop is fun.

---

## What the MVP IS

A browser-based, **single-session prototype** where a player:

1. **Picks a character class** (2 classes: Rich Kid, Hedge Fund Manager)
2. **Plays through ~20 turns** (representing ~5 months in-game)
3. **Makes buy / sell / hold decisions** each turn
4. **Experiences 5–8 random events** with branching dialogue choices
5. **Watches their portfolio value** rise or fall based on artist heat + market state
6. **Sees an end-of-game summary** (portfolio value, key decisions made)

**Aesthetic:** 8-bit noir pixel art UI with typewriter text reveals, dark palette, minimal but atmospheric.

---

## What the MVP is NOT

- ❌ Not multiplayer
- ❌ Not a complete game with all 5 characters, all locations, all events
- ❌ Not a polished commercial product
- ❌ No save/load system
- ❌ No sound or music (yet)
- ❌ No freeport mechanics (yet)
- ❌ No NPC relationship system (yet)
- ❌ No travel between locations (yet)

---

## Core Systems Required

### 1. Character Selection Screen
- Pick from 2 classes: **Rich Kid** (Trust fund buffer) or **Hedge Fund Manager** (Short selling ability)
- Display starting capital, collection, and unique perk
- Simple pixel art portrait for each

### 2. Turn Engine (Simplified)
```
Player Action Phase → Advance Week → Market Update → Event Delivery → New Week
```
- **1 action per turn** at MVP (buy, sell, or hold)
- No "attend event" as a separate action — events just happen between turns

### 3. Market System (Simplified)
- **5 artists** with starting heat scores
- Heat shifts by ±1–5 each turn (weighted random)
- **1 market state** (Bull/Bear/Flat) — shifts once during the 20-turn play
- Price = Base × Heat Multiplier × Market Multiplier (no rarity/provenance yet)

### 4. Portfolio View
- List of owned works with current value
- Total portfolio value displayed
- Simple "+X%" or "-X%" change indicators

### 5. Buy/Sell Interface
- **Buy:** See 2–3 available works each turn (artist, price, heat trend indicator)
- **Sell:** Select from owned works, see current market value vs. purchase price

### 6. Event / Dialogue System
- **8–10 pre-written events** using Ink
- Events fire between turns (1 event every 2–3 turns)
- Each event: flavour text + 2–3 choices with consequences
- Consequences affect: portfolio value, cash, artist heat, or future event triggers

### 7. End Screen
- Summary after turn 20:
  - Starting vs. ending portfolio value
  - Key decisions made (listed as narrative moments)
  - "Play Again?" button

---

## Content Required for MVP

| Content Type | Quantity | Notes |
|---|---|---|
| Character classes | 2 | Rich Kid, Hedge Fund Manager |
| Artists | 5 | Fictional, with base heat scores |
| Artworks per artist | 2–3 | ~12 total works in the market |
| Dialogue events | 8–10 | Written in Ink |
| Character portraits | 2 | Simple pixel art |
| UI screens | 4 | Menu, Game, Dialogue, End |

---

## Success Criteria

The MVP is successful if:
- [x] A player can complete a 20-turn session start to finish
- [x] Buying and selling art feels strategic (not random clicking)
- [x] Events and dialogue choices create genuine "hmm, what should I do?" moments
- [x] The 8-bit noir aesthetic is visible and atmospheric
- [x] **You have fun playing it**

---

## What Comes AFTER MVP

If the core loop works, the next priorities are (see Roadmap):
1. Add remaining 3 character classes
2. Expand to 15+ artists
3. Implement freeport mechanics
4. Add NPC relationships
5. Multi-location travel
6. Save/load system
7. Sound design

---

## Tags
#project #mvp #scope #game-design
