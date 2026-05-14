---
type: design_spec
project: Art_Life
date: 2026-05-13
status: draft_v1
---

# Art Life — Character Creation System

The protagonist is strategic, not romantic. Capital, leverage, reputation, and exit are the gameplay loop. Character creation is the player's first decision and it locks the spine of their playthrough.

The system has three layers stacked on top of each other.

---

## Layer 1: Class (the financial archetype)

The five classes are the spine. Each class determines starting inventory, starting stats, starting capital, and which of the four social skill trees comes pre-warmed.

| Class | Starting capital | Starting inventory | Pre-warmed skill | Defining anxiety |
|---|---|---|---|---|
| Rich Kid | $$$$ (high) | 2 inherited works, no provenance research | Charm | Whether the inheritance is real or a story |
| Hedge Fund Manager | $$$$ (high) | Bloomberg terminal subscription, no actual artworks | Wit | The market correction that ends the cycle |
| Insider | $$ (medium) | 1 work with strong dealer relationships | Information | Being seen as a tool, not a player |
| Speculator | $ (low) | 3 small works on margin, leverage | Conversation (deflection) | Margin call |
| Curator | $$ (medium) | 1 work of real meaning, museum contacts | Information + Charm split | Selling out |

Class is permanent once chosen. The visual portrait, default outfit, and the protagonist's verbal register are class-bound.

---

## Layer 2: Archetype (the relational style)

Cross-cutting archetypes determine how the protagonist behaves in social-battle scenes regardless of class. The player picks one at creation.

| Archetype | Description | XP multiplier (best skill) | XP penalty (worst skill) |
|---|---|---|---|
| Charmer | Wins via social warmth | Charm 1.5x | Information 0.7x |
| Lurker | Wins via patience and observation | Information 1.5x | Charm 0.7x |
| Mercenary | Wins via direct transactional clarity | Wit 1.5x | Conversation 0.7x |
| Idealist | Wins via belief, lands awkwardly | Conversation 1.5x | Wit 0.7x |

A Rich Kid Charmer plays very differently from a Rich Kid Lurker. A Hedge Fund Manager Mercenary is a different game from a Hedge Fund Manager Idealist (the latter is the rarest combination and the one where the ethical conflict bites hardest).

Archetype is permanent once chosen but the multipliers only apply at creation; in long-term play, the player can build any tree.

---

## Layer 3: Stats and customization (the dials)

Six stats. Each starts in the 3-7 range based on class + archetype. Player has 6 free points to distribute at character creation.

| Stat | What it does | Maxes out at |
|---|---|---|
| **Capital** | Cash on hand, leverage ceiling, haggle floor | 10 |
| **Information** | What you know (artist provenance, dealer histories, scandal awareness) | 10 |
| **Charm** | NPC social-battle outcome modifier on Flirt and Deep moves | 10 |
| **Wit** | NPC social-battle outcome modifier on Quick and Inquire moves | 10 |
| **Reputation** | Market standing, gallery invitations, fair access | 10 |
| **Taste** | Curatorial eye, ability to spot undervalued work. The Curator class starts elevated here. | 10 |

Stats grow through play. Stats interact with haggle/battle outcomes deterministically. The dialogue system queries stats before showing certain dialogue options (a Charm < 4 player doesn't get the Flirt-into-Deep transition with a Vain NPC, etc.).

---

## Customization that is not stats

- **Name.** Free text.
- **Pronouns.** Free text.
- **Visual portrait.** Each class has a base portrait. Player can swap hair, outfit accent color, accessory (cufflinks, pendant, watch, phone case) within the class's aesthetic constraints. No cross-class accessories.
- **Hometown.** Free text. Influences a few first-act dialogue options.
- **Email handle.** Free text. This becomes the diegetic email address the player will see in the inbox throughout the game.
- **Tagline / bio.** One line. Read aloud by NPCs at the first fair as a small humiliation if too earnest, a small win if dry.

---

## Where character creation slots into the entry flow

Per Seb's most recent voice, the entry is: title → zoom → documentary → email inbox → click invite → ArtNet login → ArtNet content. Character creation can happen at one of two points:

**Option A: Right after the documentary, before the email.** Documentary ends, screen fills with a "you are" prompt, player picks class + archetype + stats + customization, then the email inbox loads with the player's chosen email handle. Pro: the player gets oriented before being asked to act. Con: it interrupts the documentary-to-email narrative beat.

**Option B: Inside ArtNet as "complete your profile."** After signin, the homepage shows a "complete your profile to access marketplace" gate. Player customizes there. Pro: the customization feels diegetic, it IS just an account-setup step on an art-world platform. Con: the player has been operating an undefined character through the documentary and email already.

Recommended: **Option B**, because it leans into the diegetic-dashboard frame. The character creator is just another app on the in-game OS. The protagonist completes their ArtNet profile, picks their class (which ArtNet calls "professional category"), their archetype (which ArtNet calls "trading style"), their stats (which ArtNet calls "credentials and capital"), and their visual portrait (which ArtNet calls "profile photo"). The diegetic frame turns a meta-game decision into an in-world action.

---

## What gets carried through

Class affects everything: portrait, dialogue voice, starting inventory, which NPCs greet the player warmly, which haggle moves land clean.

Archetype affects social-battle outcomes throughout play.

Stats grow through play and gate certain content (specific dialogue options, certain artworks the player can identify, certain dealers who will return a call).

Customization (name, pronouns, hometown, email, tagline) is cosmetic and narrative flavor. It surfaces in dialogue but doesn't gate mechanics.

---

## What this design avoids

- **Open-ended skill systems.** Six stats and four skill trees. Tight space. The player can lose by spreading too thin, which is thematically right for an art-market game.
- **Visual customization that breaks aesthetic discipline.** No cross-class accessories. No bright cheerful color overrides. The hair-and-outfit options are within the class's defined palette.
- **Romantic-protagonist drift.** No "kindhearted gallery assistant" archetype. No "wide-eyed newcomer." The Idealist archetype is the closest thing to a romantic lens and it carries an XP penalty on Wit, which is the financial-cynicism stat. The system is honest about what it values.

End of character creation system spec.
