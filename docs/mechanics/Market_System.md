# 📈 Market System

## Overview
Art prices in the game fluctuate based on a combination of artist trajectory, macro market conditions, social events, and random chance — mirroring real-world art market dynamics.

---

## Artist Heat Score
Each artist has a **Heat Score (0–100)** that drives their work's value.

| Heat Range | Status | Price Behaviour |
|---|---|---|
| 0–20 | Unknown | Cheap, flat |
| 21–40 | Emerging | Slowly rising |
| 41–60 | Mid-career | Steady, predictable |
| 61–80 | Hot | Rapidly rising, volatile |
| 81–100 | Blue-chip | Very high, slow growth |

### What Moves Heat
- ✅ Major institutional show → +Heat
- ✅ Art Basel / Frieze feature → +Heat
- ✅ Purchased by a famous collector → +Heat
- ❌ Scandal or controversy → -Heat
- ❌ Market oversaturation → -Heat
- ❌ Artist death (short spike, then settles) → variable

---

## Macro Market Conditions
The overall market has a **Bull / Bear / Flat** state that affects all prices:
- **Bull Market** — everything trends up, speculation is rewarded
- **Bear Market** — prices fall, holding costs more, panic selling tempting
- **Flat Market** — patience pays, only strong individual artists move

Market state shifts every ~20–60 turns, sometimes triggered by world events.

---

## Price Mechanics
- Each work has a **Base Value** set at acquisition
- Value = Base Value × Artist Heat Multiplier × Market Multiplier × Rarity Factor
- Private sales vs. auction = different price outcomes (auctions can spike or crash a price)

---

## Information Asymmetry
- Not all players see all information equally
- **Insider characters** (gallery, hedge fund) get early signals
- **Tip events** can surface through cocktail parties or relationships
- Acting on tips too early = risk; too late = missed opportunity

---

## Tags
#mechanics #market #economy
