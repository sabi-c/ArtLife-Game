# Dialogue Tree Template — AI Content Pipeline

> **Purpose:** Give this file to an AI agent to generate new dialogue trees for ArtLife.
> The AI should output valid JS that can be appended to `game/src/data/dialogue_trees.js`.

---

## How Dialogue Trees Work

Each tree is an object in the `DIALOGUE_TREES` array. A tree belongs to one NPC and one venue. It has a `nodes` object where each key is a node ID. The player enters at `start` and navigates through nodes via `topics` (dialogue options).

**Key concepts:**
- **Nodes** are moments in conversation. They have speaker text and a list of topics (choices).
- **Topics** are player responses. They can require stats, grant effects, change NPC favor, trigger haggles, give items, and schedule future phone messages.
- **Variants** on the `start` node let the NPC greet differently based on relationship level.
- **Blue options** (`isBlueOption: true`) are stat-gated choices that reward investment in stats.
- **Tones** track the player's dialogue style (friendly/schmoozing/direct/generous/ruthless).

---

## JSON Schema

```javascript
{
    // ── METADATA ──
    id: 'npc_id_venue_name',           // Unique tree ID (snake_case)
    npcId: 'npc_id',                   // Must match a contact ID in contacts.js
    venue: 'venue_id',                 // Which venue this tree appears at
    trigger: 'room_talk',             // How it's triggered (always 'room_talk' for now)
    title: 'Short Display Title',      // Shown in topic list
    entryConditions: null,             // Or: { reputation: { min: 40 } }

    // ── NODES ──
    nodes: {
        // The conversation always starts at 'start'
        start: {
            speaker: 'npc_id',         // Who is speaking (null = narrator)
            text: null,                // null if using variants below

            // OPTIONAL: Different greetings based on relationship
            variants: [
                { check: { 'npcFavor.npc_id': { min: 10 } }, text: 'Warm greeting...' },
                { check: { reputation: { min: 40 } }, text: 'Respectful greeting...' },
                { check: null, text: 'Default/cold greeting...' },  // Fallback (always last)
            ],

            // Player choices from this node
            topics: [
                {
                    label: 'What the player says or does',  // Displayed as button text
                    tone: 'friendly',                       // One of: friendly, schmoozing, direct, generous, ruthless, null
                    requires: null,                         // Or: { intel: { min: 5 } } or { cash: { min: 10000 } }
                    isBlueOption: false,                    // true = stat-gated option (shows as blue)
                    next: 'node_id',                        // Which node to go to (null = end conversation)
                    effects: { intel: 2, reputation: 3 },   // OPTIONAL: immediate stat changes
                    npcEffects: { npc_id: { favor: 5 } },   // OPTIONAL: NPC relationship changes
                    triggerHaggle: false,                    // OPTIONAL: true = launch haggle battle
                    schedules: [],                          // OPTIONAL: delayed effects (see below)
                },
            ],
        },

        // Additional conversation nodes follow the same pattern
        some_node: {
            speaker: 'npc_id',
            text: 'What the NPC says in this moment. Can be multiple sentences. Use rich, literary prose.',

            // OPTIONAL: Stat/relationship effects just from reaching this node
            effects: { intel: 3 },
            npcEffects: { npc_id: { favor: 2 } },

            // OPTIONAL: Item reward for reaching this node
            reward: {
                id: 'unique_item_id',
                name: 'Display Name',
                type: 'gift',              // gift, document, access, artwork_trial
                description: 'What this item is and why it matters.',
            },

            topics: [
                // ... more choices
            ],
        },

        // Terminal nodes have empty topics arrays
        closing: {
            speaker: 'npc_id',
            text: 'Final words from the NPC.',
            topics: [],   // Empty = conversation ends here
        },
    },

    onComplete: { effects: {}, schedules: [] },
}
```

---

## Scheduled Messages (Future Phone Messages)

Topics or nodes can schedule phone messages that arrive weeks later:

```javascript
schedules: [
    {
        weeksDelay: 3,                    // How many weeks until message arrives
        type: 'phone_message',
        payload: {
            from: 'npc_id',              // Sender NPC
            subject: 'Subject line',
            body: 'Full message text. Can reference prior conversation.',
            urgency: 'normal',            // normal, urgent
            // OPTIONAL: Give the player choices in the message
            actions: [
                { label: 'Accept the offer ($50,000)', effects: { cash: -50000, reputation: 10 } },
                { label: 'Decline politely', effects: { reputation: -2 } },
            ],
        },
    },
],
```

---

## Available Stats for `requires` and `effects`

| Stat | Description | Range |
|---|---|---|
| `cash` | Player's money | 0–999999 |
| `reputation` (HYP) | Hype/reputation score | 0–100 |
| `taste` (TST) | Taste/knowledge score | 0–100 |
| `audacity` (AUD) | Risk-taking score | 0–100 |
| `access` (ACC) | Network access score | 0–100 |
| `intel` | Information/intelligence | 0–100 |
| `marketHeat` | How much attention you're drawing | 0–100 |
| `suspicion` | How suspicious authorities are | 0–100 |
| `burnout` | Mental exhaustion | 0–10 |

**NPC favor checks** use the format: `'npcFavor.npc_id': { min: 10 }`

---

## Available NPC IDs

| ID | Name | Role |
|---|---|---|
| `sasha_klein` | Sasha Klein | Private Dealer |
| `marcus_price` | Marcus Price | Art Advisor |
| `elena_ross` | Elena Ross | Gallerist (Chelsea) |
| `james_whitfield` | James Whitfield | Gallerist (Mayfair) |
| `diana_chen` | Diana Chen | Auction Specialist |
| `robert_hall` | Robert Hall | Private Sales |
| `yuki_tanaka` | Yuki Tanaka | Emerging Artist |
| `kwame_asante` | Kwame Asante | Mid-Career Artist |
| `victoria_sterling` | Victoria Sterling | Rival Collector |
| `philippe_noir` | Philippe Noir | Old-Guard Collector |
| `nina_ward` | Nina Ward | Market Analyst |
| `lorenzo_gallo` | Lorenzo Gallo | Mega-Dealer |
| `charles_vandermeer` | Charles Vandermeer | Speculator |
| `nico_strand` | Nico Strand | Young Hustler |
| `margaux_fontaine` | Margaux Fontaine | Art Advisor |
| `dr_eloise_park` | Dr. Eloise Park | Museum Director |

---

## Available Venue IDs

| ID | Name |
|---|---|
| `gallery_opening` | Gallery Opening |
| `cocktail_party` | Cocktail Party |
| `auction_house` | Auction House |
| `art_fair` | Art Fair |
| `studio_visit` | Studio Visit |

---

## Five Tones

Every player choice can be tagged with a tone. This tracks the player's dominant personality:

| Tone | Icon | Best For | Risk |
|---|---|---|---|
| `friendly` | 🤝 | Artists, curators | Too slow for deals |
| `schmoozing` | 🎭 | Collectors, socialites | Seen as superficial |
| `direct` | 🗡️ | Dealers, time-sensitive | Offends old guard |
| `generous` | 💎 | Struggling artists, advisors | Drains cash |
| `ruthless` | 🔥 | Rivals, auction wars | Burns bridges permanently |

---

## Design Guidelines

1. **Write like literary fiction.** NPCs should feel like real people with internal lives, not quest-givers.
2. **Every choice should have consequences.** No "filler" options. Even small talk should adjust favor.
3. **Reward knowledge.** Blue options (stat-gated) should give significantly better intel or access.
4. **Create dilemmas.** The best trees force the player to choose between money and relationships.
5. **Reference other NPCs.** Trees should name-drop other contacts to create a web of connections.
6. **Schedule follow-ups.** Use `schedules` to send phone messages 1-4 weeks later — it makes the world feel alive.
7. **Include item rewards** for deep trust paths — sketchbooks, documents, access keys, art trials.
8. **10-20 nodes per tree.** The `start` node should have 3-4 topics. Deep branches should go 4-5 levels.
9. **Terminal nodes** (empty `topics: []`) should have a final NPC line that reflects how the conversation went.
10. **Cross-reference artworks.** If an NPC mentions a specific artwork, its `id` should match an entry in `artworks.js`.

---

## Example: Minimal Tree (3 nodes)

```javascript
{
    id: 'gallery_assistant_opening',
    npcId: 'gallery_assistant',
    venue: 'gallery_opening',
    trigger: 'room_talk',
    title: 'Gallery Assistant',
    entryConditions: null,
    nodes: {
        start: {
            speaker: 'gallery_assistant',
            text: '"Welcome. Can I help you find anything tonight?"',
            topics: [
                { label: 'What are the prices?', tone: null, next: 'pricing' },
                { label: 'Just browsing.', tone: null, next: 'closing' },
            ],
        },
        pricing: {
            speaker: 'gallery_assistant',
            text: '"The range is $4,000 to $35,000. The smaller works start at $4,000."',
            effects: { intel: 2 },
            topics: [
                { label: 'Thanks, that helps.', tone: null, next: 'closing' },
            ],
        },
        closing: {
            speaker: 'gallery_assistant',
            text: '"Enjoy the show."',
            effects: { intel: 1 },
            topics: [],
        },
    },
    onComplete: { effects: {}, schedules: [] },
},
```

---

## Example: Complex Tree (excerpt — Kwame Asante, 20+ nodes)

```javascript
{
    id: 'kwame_asante_studio_visit',
    npcId: 'kwame_asante',
    venue: 'studio_visit',
    trigger: 'room_talk',
    title: 'The Artist\'s Trust',
    entryConditions: null,
    nodes: {
        start: {
            speaker: null,
            text: null,
            variants: [
                { check: { 'npcFavor.kwame_asante': { min: 15 } }, text: 'Kwame opens the door before you knock...' },
                { check: null, text: '"Elena said I should talk to you. Most collectors want a selfie. What do you want?"' },
            ],
            topics: [
                { label: 'I want to understand your work.', tone: 'friendly', next: 'understand_work' },
                { label: 'I brought you something.', tone: 'generous', requires: { cash: { min: 2000 } }, isBlueOption: true, next: 'brought_gift', effects: { cash: -2000 } },
            ],
        },
        understand_work: {
            speaker: 'kwame_asante',
            text: 'He leads you to a painting of his mother. "She died three years ago. I\'ve been trying to paint this ever since."',
            effects: { intel: 2 },
            npcEffects: { kwame_asante: { favor: 3 } },
            topics: [
                { label: 'Tell me about her.', tone: 'friendly', npcEffects: { kwame_asante: { favor: 5 } }, next: 'mothers_story' },
                { label: 'Is this for sale?', tone: 'direct', npcEffects: { kwame_asante: { favor: -8 } }, next: 'too_soon' },
            ],
        },
        mothers_story: {
            speaker: 'kwame_asante',
            text: '"She was a seamstress in Accra..."',
            effects: { intel: 3, reputation: 2 },
            npcEffects: { kwame_asante: { favor: 5 } },
            topics: [
                { label: '[Stay quiet. Let him be with the painting.]', tone: 'friendly', npcEffects: { kwame_asante: { favor: 8 } }, next: 'silence_respect' },
                { label: 'The earth pigment — you\'re literally putting her home into the work.', tone: null, requires: { intel: { min: 6 } }, isBlueOption: true, next: 'pigment_insight', effects: { intel: 2 } },
            ],
        },
        pigment_insight: {
            speaker: 'kwame_asante',
            text: '"Yes. Exactly. That\'s what nobody else sees."',
            effects: { intel: 4, reputation: 5 },
            npcEffects: { kwame_asante: { favor: 10 } },
            reward: { id: 'akyem_earth_pigment', name: 'Jar of Akyem Earth', type: 'gift', description: 'Sacred pigment from Kwame\'s mother\'s village.' },
            topics: [
                { label: 'I\'ll treasure this. Thank you.', tone: 'friendly', next: 'new_work_reveal' },
            ],
        },
        // ... 15+ more nodes ...
    },
    onComplete: { effects: {}, schedules: [] },
},
```

---

## Output Format

When generating a new tree, output it as:

```javascript
// Paste this into the DIALOGUE_TREES array in game/src/data/dialogue_trees.js
// (before the closing ];)

    // ═══════════════════════════════════════════
    // TREE: [NPC Name] — [Venue/Context]
    // [One-line description]
    // ═══════════════════════════════════════════

    {
        id: '...',
        // ... full tree object
    },
```
