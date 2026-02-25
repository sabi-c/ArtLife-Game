# 🏛️ Room Schema — Data Format Reference

## Overview
Every navigable space in ArtLife is a **room** — a data node that describes a physical location the player can explore. Rooms live inside **venues** (gallery openings, auction houses, cocktail parties, etc.). A venue visit is a self-contained exploration session with a time budget.

---

## Room Object Format

```json
{
  "id": "unique_room_id",
  "venue": "parent_venue_id",
  "name": "Human-Readable Room Name",
  "desc": "One-line atmospheric summary (shown in room list / exits)",
  "look": "Full atmospheric description — 2-4 sentences of noir prose. Revealed on first entry or LOOK command. This is where the writing lives.",
  "items": [],
  "characters": [],
  "exits": [],
  "eavesdrops": [],
  "onEnter": null,
  "timeCost": 1,
  "tags": []
}
```

---

## Field Reference

### Core Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✅ | Unique room identifier, snake_case |
| `venue` | string | ✅ | Parent venue ID (e.g. `gallery_opening`) |
| `name` | string | ✅ | Display name shown in UI header |
| `desc` | string | ✅ | One-line summary shown in exit lists and navigation |
| `look` | string | ✅ | Full atmospheric prose — the heart of each room |
| `timeCost` | number | ❌ | Actions consumed to enter this room (default: 1) |
| `tags` | array | ❌ | Metadata tags: `["social", "private", "dangerous"]` |

### Items

Objects in the room the player can examine or interact with.

```json
{
  "name": "price list",
  "desc": "Laminated, tucked behind the front desk. Six figures start at the top and get worse.",
  "isTakeable": false,
  "requires": { "intel": { "min": 3 } },
  "onLook": { "intel": 1 },
  "onTake": null,
  "onUse": null
}
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name (clickable in UI) |
| `desc` | string | Description shown when examined |
| `isTakeable` | boolean | Can the player pick this up? (default: false) |
| `requires` | object | QualityGate — stats needed to see/interact with this item |
| `onLook` | object/null | Effects triggered when examined (stat changes) |
| `onTake` | object/null | Effects triggered when picked up |
| `onUse` | object/null | Effects triggered when used |

### Characters

NPCs present in the room. Links to dialogue trees.

```json
{
  "id": "elena_ross",
  "desc": "Elena Ross is here, holding a glass of white wine she isn't drinking.",
  "topics": ["nomura_triptych", "art_basel"],
  "requires": null,
  "onTalk": null
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | NPC ID (matches contacts/dialogue tree data) |
| `desc` | string | Presence description — how they appear in this room |
| `topics` | array | Available conversation topics (id refs to dialogue tree nodes) |
| `requires` | object/null | QualityGate — stats needed to approach this NPC |
| `onTalk` | object/null | Callback effects when conversation starts |

### Exits

Connections to other rooms. Can be gated.

```json
{
  "dir": "back",
  "id": "chelsea_backroom",
  "label": "Slip through the back door",
  "block": "The door is marked 'Private.' (Reputation ≥ 40)",
  "requires": { "reputation": { "min": 40 } }
}
```

| Field | Type | Description |
|---|---|---|
| `dir` | string | Direction or action label (`north`, `back`, `upstairs`, `out`) |
| `id` | string | Target room ID |
| `label` | string | Descriptive text for the exit option |
| `block` | string/null | Message shown if player doesn't meet requirements |
| `requires` | object/null | QualityGate — stats needed to use this exit |

### Eavesdrops

Overheard conversations the player can listen in on. Gated by stats.

```json
{
  "id": "dealer_whisper",
  "desc": "Two dealers whispering by the wine table",
  "requires": { "intel": { "min": 5 } },
  "content": "'...the Tanaka estate is liquidating. Everything. Quietly.'",
  "effects": { "intel": 2 },
  "unlocks": "tanaka_estate_tip",
  "oneShot": true
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique eavesdrop ID |
| `desc` | string | What the player sees as a clickable option |
| `requires` | object | QualityGate — intel/rep needed to notice this |
| `content` | string | The overheard dialogue — always in quotes, italicized |
| `effects` | object | Stat changes when listened to |
| `unlocks` | string/null | Event or intel flag unlocked |
| `oneShot` | boolean | Disappears after first listen (default: true) |

### onEnter

Optional callback when the player first enters this room. Can trigger events, descriptions, or stat changes.

```json
{
  "firstVisitOnly": true,
  "text": "The smell hits you first — turpentine and coffee.",
  "effects": null,
  "triggerEvent": null
}
```

---

## Venue Wrapper Format

Each venue file contains a venue object wrapping its rooms:

```json
{
  "id": "gallery_opening",
  "name": "Gallery Opening — Chelsea",
  "desc": "A converted warehouse in West Chelsea. Tonight's the opening.",
  "startRoom": "chelsea_main_floor",
  "timeLimit": 5,
  "availableWeeks": "any",
  "frequency": "every 3-6 weeks",
  "requires": null,
  "rooms": [ ... ]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Venue identifier |
| `name` | string | Display name |
| `desc` | string | One-line venue description |
| `startRoom` | string | Room ID where the player spawns |
| `timeLimit` | number | Total actions available during this visit |
| `availableWeeks` | string | When this venue can appear |
| `frequency` | string | How often this venue event fires |
| `requires` | object/null | QualityGate for venue access |

---

## Design Principles

1. **Every room tells a story** — The `look` text is not filler. It's noir prose that builds atmosphere.
2. **Gating creates discovery** — Locked exits and hidden items reward character investment.
3. **Time pressure creates choices** — You can't see everything in one visit. Come back later.
4. **Eavesdrops reward attention** — The juiciest intel comes from listening, not talking.
5. **Items serve the fiction** — No generic "key" objects. Everything is a business card, a price list, a photograph.

---

## Tags
#rooms #schema #world-building #game-design
