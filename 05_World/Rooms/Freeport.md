# 🔐 The Geneva Freeport

## Venue Overview

```json
{
  "id": "freeport",
  "name": "Geneva Freeport — Ports Francs",
  "desc": "A tax-free vault the size of a city block. Art goes in. Art never comes out.",
  "startRoom": "freeport_security",
  "timeLimit": 4,
  "availableWeeks": "any",
  "frequency": "every 8-12 weeks",
  "requires": {
    "cash": { "min": 100000 },
    "reputation": { "min": 40 }
  }
}
```

**Location:** Route de l'Aéroport, Geneva, Switzerland
**Calendar:** By appointment. Always by appointment.
**Time budget:** 4 actions. You are monitored. Don't linger.
**Who's here:** Charles Vandermeer (your storage advisor). Security. Shadows.
**The feel:** An airport terminal designed by paranoids. Every door beeps. Every corridor is surveilled. The air is 65°F year-round. Nothing here is alive except the money.

---

## Room Map

```
  ┌──────────┐       ┌─────────────┐       ┌──────────────┐
  │ SECURITY │──────►│    VAULT     │──────►│   PRIVATE    │
  │ (Start)  │       │  CORRIDOR   │       │   VIEWING    │
  └──────────┘       └──────┬──────┘       └──────────────┘
                            │                requires: cash ≥ 200K
                     ┌──────┴──────┐
                     │    THE      │
                     │  REGISTRY   │
                     └─────────────┘
                      requires: intel ≥ 6
```

---

## Room: Security Checkpoint

**Start room.** Papers, please.

```json
{
  "id": "freeport_security",
  "venue": "freeport",
  "name": "Security Checkpoint",
  "desc": "Bulletproof glass. Biometric scanners. The politest hostility you've ever felt.",
  "look": "The lobby is aggressively beige. Two guards in grey uniforms sit behind bulletproof glass. A biometric scanner glows blue. Above the desk, a sign in four languages reads: 'All items subject to inspection. No photography. No exceptions.'\n\nYour phone signal died the moment you walked in. The walls are Faraday cages wrapped in Swiss plaster. Whatever happens in here stays in here — electronically and otherwise.",
  "items": [
    {
      "name": "visitor log",
      "desc": "You sign in. The pen is chained to the desk. The previous entry is from three days ago — a name you recognize from the Forbes list, visiting 'Vault 1140.' The one after that is redacted with a black marker.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    },
    {
      "name": "security camera",
      "desc": "Fourteen cameras visible from where you're standing. You count them because you have nothing else to do while they verify your identity. Fourteen that you can see.",
      "isTakeable": false,
      "onLook": null
    },
    {
      "name": "insurance brochure",
      "desc": "Glossy. 'Comprehensive coverage for stored assets. Climate-controlled vaults. Seismic protection. Insurance values up to CHF 500,000,000.' Five hundred million. For one building.",
      "isTakeable": true,
      "onTake": null,
      "onLook": { "intel": 1 }
    }
  ],
  "characters": [
    {
      "id": "charles_vandermeer",
      "desc": "Charles Vandermeer is waiting for you past the checkpoint. He's wearing a linen suit that costs more than some of the art in here. He looks relaxed. He always looks relaxed.",
      "topics": ["storage_options", "tax_optimization", "insurance_valuation"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "in",
      "id": "freeport_vault_corridor",
      "label": "Proceed to the vault corridor",
      "block": "The guard holds up a hand. 'One moment please. We're verifying your access level.'",
      "requires": null
    },
    {
      "dir": "out",
      "id": "geneva_airport_road",
      "label": "Leave the freeport",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "guard_radio",
      "desc": "A guard's radio crackling behind the glass",
      "requires": { "intel": { "min": 4 } },
      "content": "\"...vault 2200 access revoked. Client flagged by FINMA. Do not — repeat, do not — allow entry. Redirect to management.\"",
      "effects": { "intel": 2, "suspicion": 1 },
      "unlocks": "finma_investigation_intel",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The sliding doors close behind you with a hydraulic hiss. Your phone shows 'No Service.' You are now off the grid.",
    "effects": null
  },
  "timeCost": 0,
  "tags": ["secure", "controlled", "entrance"]
}
```

---

## Room: Vault Corridor

The spine of the building. Kilometers of art behind steel doors.

```json
{
  "id": "freeport_vault_corridor",
  "venue": "freeport",
  "name": "Vault Corridor — Level B2",
  "desc": "Fluorescent lights. Numbered doors. The hum of climate control.",
  "look": "The corridor stretches in both directions until it vanishes into perspective. The floor is polished concrete. The ceiling is low — seven feet, maybe. Every twelve meters, a steel door with a keypad and a number. 1100. 1101. 1102.\n\nBehind each door: someone's fortune, someone's tax exemption, someone's secret. An estimated $100 billion in art is stored in this building. More than most national museums. None of it on display. None of it taxed.",
  "items": [
    {
      "name": "vault door 1147 (yours)",
      "desc": "Your vault. The keypad accepts your code. Inside: a 3×4 meter room. Climate-controlled. Humidity 50%. Your stored works sit in custom crates on rolling racks. Each one tagged with a barcode. It's clean, organized, and deeply depressing. Art made to be seen, locked in a box.",
      "isTakeable": false,
      "onLook": { "intel": 1 }
    },
    {
      "name": "adjacent vault door (ajar)",
      "desc": "Vault 1148 is cracked open. An art handler is inside, photographing a canvas for an insurance claim. You catch a glimpse: a Warhol. Medium-size. The handler notices you looking and pulls the door shut.",
      "isTakeable": false,
      "requires": { "intel": { "min": 3 } },
      "onLook": { "intel": 2 }
    },
    {
      "name": "fire suppression panel",
      "desc": "Argon gas system. Not water — water would destroy everything. If the alarm sounds, the corridor fills with inert gas in 90 seconds. There's a placard explaining the evacuation procedure. It's reassuringly detailed.",
      "isTakeable": false,
      "onLook": null
    }
  ],
  "characters": [],
  "exits": [
    {
      "dir": "back",
      "id": "freeport_security",
      "label": "Return to the checkpoint",
      "block": null,
      "requires": null
    },
    {
      "dir": "forward",
      "id": "freeport_private_viewing",
      "label": "Continue to the private viewing suite",
      "block": "Charles shakes his head gently. 'That suite is reserved for clients with... larger holdings. Perhaps after your next acquisition.'",
      "requires": { "cash": { "min": 200000 } }
    },
    {
      "dir": "down",
      "id": "freeport_registry",
      "label": "Take the stairs to the Registry Office",
      "block": "The stairwell door requires a secondary access code you don't have.",
      "requires": { "intel": { "min": 6 } }
    }
  ],
  "eavesdrops": [
    {
      "id": "handler_conversation",
      "desc": "Two art handlers talking around the corner",
      "requires": { "intel": { "min": 5 } },
      "content": "\"...same painting, fourth time this year. It sells, gets moved to a new vault, new owner, new insurance policy. Never leaves the building. The art goes from room 1100 to room 1300. Forty-million-dollar transaction. Nobody sees it. Nobody pays tax on it.\"",
      "effects": { "intel": 4 },
      "unlocks": "freeport_flip_intel",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "Charles badges you through. The corridor is silent except for the constant drone of the HVAC system. 65 degrees. 50% humidity. Forever.",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["secure", "storage", "high-value"]
}
```

---

## Room: Private Viewing Suite

🔒 **Requires:** Cash ≥ $200,000

Where deals happen without daylight.

```json
{
  "id": "freeport_private_viewing",
  "venue": "freeport",
  "name": "Private Viewing Suite",
  "desc": "Museum lighting. A single chair. The illusion of ownership.",
  "look": "A windowless room with a single painting on a mobile easel, lit by a calibrated LED panel. The light temperature matches MoMA's galleries — 3200K, 200 lux. A Le Corbusier lounger faces the easel at the optimal viewing distance.\n\nThis is where you examine works before buying. Or where a seller shows you something that cannot be shown in public — wrong provenance, disputed title, sanctions-listed former owner. The room doesn't judge. The room is Switzerland.",
  "items": [
    {
      "name": "the painting on the easel",
      "desc": "A medium-size abstract works. The provenance document beside it traces ownership through three countries and two shell companies. The last 'legitimate' owner was a European royal family. The one before that is listed as 'Private Collection, 1939-1945.' Those dates tell a story nobody wants to hear.",
      "isTakeable": false,
      "requires": { "intel": { "min": 7 } },
      "onLook": { "intel": 5, "suspicion": 2 }
    },
    {
      "name": "provenance binder",
      "desc": "Photocopies of receipts, exhibition histories, and export licenses. Some are originals. Some are suspiciously crisp for documents supposedly from the 1950s. A sticky note reads: 'Client accepts as-is. No warranty.'",
      "isTakeable": false,
      "onLook": { "intel": 3, "suspicion": 1 }
    }
  ],
  "characters": [
    {
      "id": "charles_vandermeer",
      "desc": "Charles stands by the door with his hands clasped. He's watching you study the provenance file. His expression reveals nothing.",
      "topics": ["provenance_concerns", "purchase_structure", "discretion"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "back",
      "id": "freeport_vault_corridor",
      "label": "Return to the corridor",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The door seals behind you with a soft click. Charles gestures toward the lounger. 'Take your time. There's no rush in here. There's no anything in here.'",
    "effects": null
  },
  "timeCost": 1,
  "tags": ["private", "high-value", "morally-grey"]
}
```

---

## Room: The Registry Office

🔒 **Requires:** Intel ≥ 6

The paper trail. Where ownership is written and rewritten.

```json
{
  "id": "freeport_registry",
  "venue": "freeport",
  "name": "Registry Office — Level B3",
  "desc": "Filing cabinets. Fluorescent buzz. The bureaucracy of billions.",
  "look": "A basement office that could be a post office if not for the content. Filing cabinets line every wall, floor to ceiling. Two clerks sit at desks typing on terminals that look twenty years old. This is deliberate. Old systems are harder to hack.\n\nEvery transaction in this building — every transfer, every sale, every 'temporary import' that became permanent — passes through this room. If you knew how to read these files, you'd know who owns what, who owes what, and who's hiding what.",
  "items": [
    {
      "name": "transfer ledger",
      "desc": "A thick binder. Today's page shows four entries. One of them records a Modigliani transferring between two entities — both registered in Luxembourg, both with the same director. The painting moved zero meters. It changed owners on paper. The tax implications are... creative.",
      "isTakeable": false,
      "requires": { "intel": { "min": 7 } },
      "onLook": { "intel": 5, "suspicion": 2 }
    },
    {
      "name": "old terminal",
      "desc": "Green text on a black screen. The database goes back to 1973. You type a query — your own name. Two entries. Both accurate. Then you type a rival's name. Seven entries. One of them is flagged 'AUDIT PENDING.'",
      "isTakeable": false,
      "requires": { "intel": { "min": 8 } },
      "onLook": { "intel": 4 }
    }
  ],
  "characters": [
    {
      "id": "registry_clerk",
      "desc": "A clerk in bifocals who has processed more wealth than most central banks. She doesn't look up.",
      "topics": ["transfer_process", "historical_records", "compliance_rules"],
      "requires": null
    }
  ],
  "exits": [
    {
      "dir": "up",
      "id": "freeport_vault_corridor",
      "label": "Back to the vault corridor",
      "block": null,
      "requires": null
    }
  ],
  "eavesdrops": [
    {
      "id": "clerk_phone_call",
      "desc": "A clerk on the phone, speaking rapid French",
      "requires": { "intel": { "min": 7 } },
      "content": "\"...non, non. L'acheteur insiste que le tableau reste ici. Pas de transport. Il ne veut pas payer la TVA. Oui, encore un 'prêt temporaire' qui dure vingt ans.\"\n\n(Translation: The buyer insists the painting stays here. No transport. He doesn't want to pay VAT. Yes, another 'temporary loan' that lasts twenty years.)",
      "effects": { "intel": 3 },
      "unlocks": "permanent_loan_scam_intel",
      "oneShot": true
    }
  ],
  "onEnter": {
    "firstVisitOnly": true,
    "text": "The fluorescent light flickers once. A clerk glances up, then returns to her terminal. You are tolerated, not welcomed.",
    "effects": { "intel": 1 }
  },
  "timeCost": 1,
  "tags": ["bureaucratic", "secret", "dangerous"]
}
```

---

## NPC Scheduling Notes

- **Charles Vandermeer** — Always present (your assigned storage advisor). Appears in Security and Private Viewing.
- **Registry Clerk** — Always present in Registry. Anonymous. Efficient.
- If player has `suspicion > 30`, an additional NPC appears in Security: a **FINMA Compliance Officer** who asks uncomfortable questions.

---

## Venue Encounters

1. **The Tax Maneuver** — Charles offers to restructure your holdings through a Luxembourg entity. Saves $50K in taxes. Adds Suspicion +10. Classic risk/reward.
2. **The Lost Painting** — A work reported stolen in 1943 is in the vault next to yours. Choice: Report it (Rep +20, lose access), Ignore it, or Leverage it (Intel +5, Suspicion +15).
3. **The Inspection** — If `suspicion > 25`, Swiss customs conducts a random vault inspection during your visit. If you have any works with questionable provenance: forced choice.

---

## Character-Class Variations

| Class | Variation |
|---|---|
| **Rich Kid** | Inherits vault access from father. Starts with 2 works already stored. Registry shows family name going back 30 years. |
| **Hedge Fund** | Larger vault. Access to Private Viewing from first visit (cash threshold met). Charles is more deferential. |
| **Gallery Insider** | Knows the handlers by name. Can access the Loading Bay (hidden 5th room) where works arrive before being logged. |

---

## Tags
#rooms #freeport #geneva #tax-strategy #morally-grey #venue
