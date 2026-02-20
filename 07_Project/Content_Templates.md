# 📋 Content Templates

> Reusable templates for generating game content at scale. Fill 5–10 by hand, then use AI to bulk-generate hundreds.

---

## 🎨 Artist Template

```json
{
  "id": "artist_001",
  "name": "Cecily Brown",
  "nationality": "British",
  "born": 1969,
  "medium": "Painting",
  "style": "Abstract Expressionism / Figurative",
  "tier": "blue-chip",
  "starting_heat": 82,
  "heat_volatility": "low",
  "base_price_range": [200000, 5000000],
  "gallery_affiliation": "Paula Cooper Gallery",
  "notable_collections": ["MoMA", "Tate Modern", "Whitney"],
  "drama_potential": ["market_saturation", "critical_backlash"],
  "flavor_text": "Her canvases blur the line between abstraction and flesh — collectors fight over the early works.",
  "tags": ["painting", "contemporary", "blue-chip", "female"]
}
```

### Tier Definitions
| Tier | Heat Range | Price Range | Examples |
|---|---|---|---|
| **unknown** | 0–20 | $500 – $5,000 | Fresh MFA grads, unrepresented |
| **emerging** | 21–40 | $5,000 – $50,000 | First gallery show, small buzz |
| **mid-career** | 41–60 | $50,000 – $500,000 | Established, institutional interest |
| **hot** | 61–80 | $500,000 – $5,000,000 | Magazine covers, auction records |
| **blue-chip** | 81–100 | $1,000,000 – $50,000,000+ | Market-proven, institutional collections |

---

## 🎭 Scenario Template

```json
{
  "id": "scenario_breakout_artist",
  "title": "The Breakout Artist",
  "category": "market",
  "rarity": "uncommon",
  "trigger": {
    "type": "random",
    "min_turn": 10,
    "probability": 0.15,
    "conditions": ["player_owns_emerging_art"]
  },
  "arc": [
    {
      "phase": 1,
      "description": "Rumour surfaces at a cocktail party about an unknown painter getting gallery interest.",
      "choices": [
        {"label": "Buy 2 works immediately", "effects": {"cash": -15000, "portfolio_add": "target_artist_x2"}},
        {"label": "Ask around for more info", "effects": {"delay_turns": 1, "intel": "+1"}},
        {"label": "Ignore it", "effects": {}}
      ]
    },
    {
      "phase": 2,
      "delay_turns": 8,
      "description": "The gallery announces a solo show. Heat is climbing.",
      "auto_effect": {"artist_heat": "+15"}
    },
    {
      "phase": 3,
      "delay_turns": 12,
      "description": "MoMA acquires a piece. The artist is now mid-career.",
      "choices": [
        {"label": "Sell now — lock in profit", "effects": {"sell_artist_works": true}},
        {"label": "Hold for the peak", "effects": {}},
        {"label": "Buy more before prices climb further", "effects": {"cash": -50000, "portfolio_add": "target_artist_x1"}}
      ]
    }
  ],
  "tags": ["market", "emerging", "timing"]
}
```

---

## 🧑 NPC Template

```json
{
  "id": "npc_dealer_001",
  "name": "Valentina Marchetti",
  "role": "Gallery Director",
  "gallery": "Marchetti & Sons, London",
  "personality": "shrewd, well-connected, dislikes speculators",
  "starting_relationship": 0,
  "relationship_range": [-100, 100],
  "dialogue_memory": [],
  "favor_triggers": ["buy_from_gallery_3x", "attend_opening", "donate_to_institution"],
  "grudge_triggers": ["flip_work_within_5_turns", "outbid_at_auction", "insult_at_party"],
  "perks_at_high_relationship": ["early_access_to_new_artists", "private_sale_discount"],
  "penalties_at_low_relationship": ["refused_service", "price_markup"],
  "flavor_text": "She remembers everything. Buy from her gallery and stay loyal, or find yourself blacklisted across Mayfair.",
  "tags": ["dealer", "london", "old-guard"]
}
```

---

## 🎲 Event Template (Single-Turn)

```json
{
  "id": "event_cocktail_tip",
  "title": "A Whisper at the Opening",
  "category": "social",
  "frequency": "common",
  "turn_interval": [3, 6],
  "location": "any",
  "description": "At the Hauser & Wirth opening, a dealer pulls you aside. She says she has it on good authority that a young painter is about to be picked up by a major New York gallery.",
  "choices": [
    {
      "label": "Buy 2–3 works immediately",
      "requirements": {"min_cash": 10000},
      "effects": {"cash": -12000, "portfolio_add": "random_emerging_x2", "risk": "high"},
      "outcome_positive": "Artist breaks out in 20 turns. 4x return.",
      "outcome_negative": "Artist fades. Works lose 60% value.",
      "positive_probability": 0.4
    },
    {
      "label": "Ask for more info first",
      "effects": {"delay_turns": 1, "intel": "+1"},
      "outcome": "Price rises slightly but you have more confidence."
    },
    {
      "label": "Pass the tip to a rival as a favour",
      "effects": {"npc_relationship": "+10", "target": "random_rival"},
      "outcome": "Rival owes you one."
    },
    {
      "label": "Ignore it",
      "effects": {},
      "outcome": "You watch from the sidelines."
    }
  ],
  "tags": ["social", "tip", "emerging"]
}
```

---

## 🏦 Artwork Template

```json
{
  "id": "work_001",
  "title": "Untitled (Figure in Red)",
  "artist_id": "artist_001",
  "year_created": 2019,
  "medium": "Oil on canvas",
  "type": "unique",
  "base_price": 350000,
  "provenance": [],
  "exhibited_at": [],
  "current_owner": "market",
  "freeport_location": null,
  "tags": ["painting", "contemporary", "figurative"]
}
```

---

## 📊 Content Volume Targets

| Content Type | Hand-Crafted | AI-Generated | Total Target |
|---|---|---|---|
| Artists | 20 | 480 | **500** |
| Artworks | 50 | 950 | **~1,000** (2 per artist avg) |
| NPCs (dealers, collectors, critics) | 15 | 85 | **100** |
| Single-turn events | 15 | 85 | **100** |
| Multi-turn scenarios | 10 | 30 | **40** |
| Dialogue trees | 10 | 40 | **50** |

---

## Tags
#project #templates #content #game-design
