# 🎨 The Artist's Studio — Bushwick

## Venue Overview

```json
{
  "id": "artist_studio",
  "name": "Artist Studio — Bushwick",
  "desc": "Industrial grit. Smells like turpentine and ambition.",
  "startRoom": "studio_street",
  "timeLimit": 6,
  "availableWeeks": "any",
  "frequency": "by invitation only",
  "requires": { "intel": { "min": 15 } }
}
```

**Location:** Off the Jefferson L stop, Bushwick, Brooklyn
**Calendar:** Whenever you're invited. Usually late.
**Time budget:** 6 actions. Time moves slower here. It's personal.
**Who's here:** The artist (Yuki Tanaka or Kwame Asante). Maybe a curator. Maybe a rival.
**The feel:** Creative chaos. Cold coffee. Cigarette smoke. The feeling of being backstage at the universe.

---

## Room Map

```
                     ┌─────────────┐
                     │  THE ROOF   │
                     │  (Terrace)  │
                     └──────┬──────┘
                            │ requires: artist present
                     ┌──────┴──────┐       ┌──────────┐
                     │ THE STUDIO  │──────►│ THE VAULT│
                     │   FLOOR     │       │ (Storage)│
  ┌──────────┐       └──────▲──────┘       └──────────┘
  │  STREET  │──────────────┘
  │ (Start)  │
  └──────────┘
```

---

## Room: The Street

**Start room.** The threshold.

```json
{
  "id": "studio_street",
  "venue": "artist_studio",
  "name": "Wyckoff Avenue",
  "desc": "Graffiti. Warehouses. A rusted buzzer.",
  "look": "It looks like an abandoned factory because it is one. A steel door with no number. A keypad that has been smashed and repaired three times. The graffiti on the brickwork is better than half the art in Chelsea.\n\nA bodega on the corner glows yellow in the night. You can hear heavy bass thumping from three blocks away.",
  "items": [
    {
      "name": "intercom buzzer",
      "desc": "A piece of masking tape reads 'KWAME.' You press it. It buzzes instantly. No questions asked. Someone is expecting you.",
      "isTakeable": false,
      "onLook": null
    },
    {
      "name": "street art mural",
      "desc": "A twenty-foot mural of a decomposing skull. It's signed 'GHOST.' You've seen this tag in Berlin and Tokyo. The street value is zero. The cultural value is infinite.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    }
  ],
  "characters": [],
  "exits": [
    {
      "dir": "in",
      "id": "studio_main_floor",
      "label": "Buzz in and take the freight elevator",
      "block": null,
      "requires": null
    },
    {
      "dir": "out",
      "id": "bushwick_street",
      "label": "Leave the neighborhood",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "You check the address on your phone again. This is definitely it. If you didn't know better, you'd think you were buying drugs, not art.",
    "effects": null
  },
  "timeCost": 0,
  "tags": ["public", "gritty", "entrance"]
}
```

---

## Room: The Studio Floor

The engine room. Where the work happens.

```json
{
  "id": "studio_main_floor",
  "venue": "artist_studio",
  "name": "The Studio Floor",
  "desc": "Canvases everywhere. The smell of oil paint is thick.",
  "look": "Four thousand square feet of raw potential. The floor is splattered with a decade of paint—a Jackson Pollock map of history. Canvases lean against every vertical surface. Some are finished, gleaming wetly under the industrial lights. Others are half-born, sketched in charcoal.\n\nIn the center, a trestle table is covered in brushes, tubes of paint, empty coffee cups, and an overflowing ashtray. This isn't a gallery. It's a workshop.",
  "items": [
    {
      "name": "wet canvas on the easel",
      "desc": "It's huge. Violent. Beautiful. It's not like the polished work you see in the gallery. This is raw. You can see the struggle in the brushstrokes. If you bought this now, straight off the easel, you'd be buying the artist's soul.",
      "isTakeable": false,
      "onLook": { "intel": 2 }
    },
    {
      "name": "sketchbook",
      "desc": "Open on the table. Study after study of the same figure. You realize this is the preparatory work for the show that opens next month. Seeing this is like seeing the code behind the software.",
      "isTakeable": false,
      "requires": { "intel": { "min": 5 } },
      "onLook": { "intel": 3 }
    }
  ],
  "characters": [
    {
      "id": "kwame_asante",
      "desc": "Kwame is wiping paint off his hands with a rag. He looks exhausted but wired. He hasn't slept in two days.",
      "topics": ["work_in_progress", "gallery_pressure", "inspiration"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "out",
      "id": "studio_street",
      "label": "Take the elevator down",
      "block": null,
      "requires": null
    },
    {
      "dir": "side",
      "id": "studio_vault",
      "label": "Check the storage racks",
      "block": "Kwame steps in front of you. 'Not there. That's the old stuff.'",
      "requires": { "npcFavor": { "kwame_asante": { "min": 10 } } }
    },
    {
      "dir": "up",
      "id": "studio_roof",
      "label": "Go up to the roof",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "phone_call_gallery",
      "desc": "Kwame arguing on his phone in the corner",
      "requires": { "intel": { "min": 3 } },
      "content": "\"...I don't care what the contract says! The blue series isn't ready. If you force me to ship it, I'll burn it. Tell the collector to wait.\"",
      "effects": { "intel": 2 },
      "unlocks": "artist_gallery_conflict",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The elevator gate rattles open. The smell hits you first—linseed oil, turpentine, and cheap tobacco.",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["private", "creative", "workshop"]
}
```

---

## Room: The Vault (Storage)

🔒 **Requires:** Artist Favor ≥ 10

The archive. The B-sides. The history.

```json
{
  "id": "studio_vault",
  "venue": "artist_studio",
  "name": "Storage Racks",
  "desc": "Dusty. Crowded. Hidden gems.",
  "look": "A narrow corridor lined with wooden racks. The lighting is dim. This is the graveyard of ideas—works that didn't sell, works that were too weird for the gallery, works the artist kept for themselves.\n\nYou pull out a rack. It's early work. Different style. Rougher. But there's an energy here that the new stuff lacks. This is the 'early period' that museums will fight over in twenty years.",
  "items": [
    {
      "name": "dusty canvas",
      "desc": "From five years ago. Before the fame. Before the prices exploded. It's signed on the back. If you offer cash now, he might let it go for a fraction of his current market price. It's a gamble.",
      "isTakeable": false,
      "onLook": { "intel": 2 }
    },
    {
      "name": "rejected commission",
      "desc": "Aportrait of a famous collector's wife. It's unflattering. Brutal, actually. No wonder they rejected it. It's a masterpiece.",
      "isTakeable": false,
      "requires": { "reputation": { "min": 40 } },
      "onLook": { "intel": 2, "reputation": 1 }
    }
  ],
  "characters": [],
  "exits": [
    {
      "dir": "out",
      "id": "studio_main_floor",
      "label": "Back to the studio",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "Kwame sighs as he lets you in. 'Just don't judge the bad ones. I keep them to remind myself what not to do.'",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["hidden", "archive", "bargains"]
}
```

---

## Room: The Roof

The escape. The view. The real talk.

```json
{
  "id": "studio_roof",
  "venue": "artist_studio",
  "name": "The Roof Terrace",
  "desc": "Manhattan skyline in the distance. Beer in plastic cups.",
  "look": "Tar paper and gravel underfoot. The wind is cold. In the distance, the Manhattan skyline glitters like a promise or a threat. Down here in Bushwick, it feels a million miles away.\n\nThere are a few lawn chairs zip-tied together. A cooler full of cheap beer. This is where the artist comes to breathe. Up here, away from the canvases, the conversation changes. It stops being about the work and starts being about the life.",
  "items": [
    {
      "name": "Manhattan skyline",
      "desc": "From here, the city looks like a circuit board. Somewhere in those lights, people are buying and selling these paintings for more money than this zip code sees in a year.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    },
    {
      "name": "cooler of beer",
      "desc": "Modelo. Ice cold. Helping yourself is a move. It says you're not just a buyer; you're a peer.",
      "isTakeable": false,
      "onLook": null
    }
  ],
  "characters": [
    {
      "id": "kwame_asante_roof",
      "desc": "Kwame is leaning on the parapet, smoking. He looks smaller out here.",
      "topics": ["future_plans", "leaving_new_york", "the_meaning_of_it_all"],
      "requires": { "npcFavor": { "kwame_asante": { "min": 5 } } }
    }
  ],
  "exits": [
    {
      "dir": "down",
      "id": "studio_main_floor",
      "label": "Go back down",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "You push open the heavy fire door. The wind hits you immediately. It's quiet up here.",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["intimate", "social", "view"]
}
```

---

## Venue Encounters

1.  **Direct Sale** — If Artist Favor > 15, opportunity to buy a "wet canvas" at 50% market value (primary market bypass).
2.  **The Crisis** — Artist is destroying work. Choice: Stop them (save the art, lose favor) or Watch (gain favor, lose art).
3.  **The Inspiration** — You suggest a subject. If successful (Intel check), a work dedicated to you appears in a future auction.

---

## Tags
#rooms #studio #bushwick #primary-market #venue
