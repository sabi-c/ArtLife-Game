# ArtLife: Content Management Studio (The "Director's Chair")

The Admin Narrative Tracker gives us read-only visibility into hidden state. But to actually *author* narrative content efficiently, we need a step above that: a **Content Management Studio (CMS)** — a visual workspace where Seb can load JSON data files, connect entities together, schedule events onto the timeline, and preview the entire narrative chain before it ever runs in-game.

Think of it as "Unity Editor meets Notion" — but built as a React overlay inside the game itself.

---

## 1. The Problem This Solves

Right now, to add a new NPC encounter, you need to:
1. Write the NPC JSON in `contacts.js`
2. Write the event JSON in `events.js`
3. Write the scene JSON referencing both
4. Manually set the trigger week in the calendar
5. Hope you didn't break any cross-references

The CMS eliminates steps 2-5 by providing a visual interface that handles the wiring automatically.

---

## 2. Architecture: Three Panels

The CMS is a full-screen React overlay (toggled via `F1` or a dev menu), split into three panels:

### Panel 1: The Content Library (Left Sidebar)
A searchable, filterable tree of every loaded JSON entity in the game.

```
📁 NPCs (16 loaded)
  ├── 🧑 Margaux Bellefleur [Mega-Dealer]
  ├── 🧑 Larry Gagosian [Mega-Dealer]
  └── 🧑 Elena Ross [Gallery Owner]
📁 Events (49 loaded)
  ├── 🎭 The King Is Dead [ERA_SHIFT]
  ├── 🎭 Forgery Scandal [SCANDAL]
  └── 🎭 Collector Dinner [SOCIAL]
📁 Items (12 loaded)
  ├── 🖼️ Untitled Crown Sketch [ARTWORK]
  └── 📄 Fake Provenance Doc [DOCUMENT]
📁 Scenes (8 loaded)
  ├── 🎬 Boom Boom Room Intro
  └── 🎬 Sotheby's Main Hall
📁 Artists (8 loaded)
  └── 🎨 Jean-Michel Basquiat
```

**Actions:**
- Click any entity to inspect its full JSON in a detail pane
- Drag an entity onto the Timeline (Panel 2) to schedule it
- Drag an NPC onto a Scene to add them to `npcsPresent`
- Drag an Item onto a Scene to make it discoverable there

### Panel 2: The Timeline (Center)
A horizontal scrollable timeline representing the 40-year game span (Week 1, Year 1980 → Week 52, Year 2020).

```
1980 ──────── 1985 ──────── 1988 ──────── 1990 ──────── 1995 ──────── 2000
  │              │            │              │              │
  ▼              ▼            ▼              ▼              ▼
[Game Start]  [Art Basel]  [Basquiat    [YBA Emerges]  [Dot-Com
                             Death]                     Bubble]
```

**Actions:**
- Drag events from the Library and drop them onto specific weeks
- Click an event on the timeline to see its full consequence chain (what it triggers, what follow-ups are scheduled)
- Zoom in/out to see weekly vs. yearly granularity
- Color-coded by category: 🔴 ERA_SHIFT, 🟡 SCANDAL, 🟢 OPPORTUNITY, 🔵 SOCIAL

### Panel 3: The Wiring Inspector (Right Sidebar)
When you select any entity, this panel shows all of its connections to other entities.

**Example: Selecting "The King Is Dead" event:**
```
🎭 The King Is Dead
├── Triggers at: Week 32, 1988
├── Scene: scene_basquiat_death
├── NPCs Present: npc_margaux, npc_assistant
├── Market Effects:
│   └── neo-expressionism × 3.5
├── Unlocks Events:
│   └── evt_assistant_sketches (immediate)
│   └── evt_basquiat_price_surge (4 weeks later)
│   └── evt_basquiat_retrospective (52 weeks later)
├── Phone Messages Sent:
│   └── msg_margaux_basquiat → npc_margaux
└── Gate Requirements: none
```

**Actions:**
- Click any linked entity to jump to it
- Add new connections via dropdowns (e.g., "Add NPC to this scene")
- Remove connections
- Set gate requirements (e.g., "Requires Access ≥ 60")

---

## 3. The File Loader

The CMS needs to ingest content from the existing `data/` directory. On boot, it scans:

```javascript
const contentSources = {
    npcs: () => import('../data/contacts.js'),
    events: () => import('../data/events.js'),
    artists: () => import('../data/artists.js'),
    items: () => import('../data/artworks.js'),
    scenes: () => import('../data/scenes.js'),
    calendar: () => import('../data/calendar_events.js'),
    rooms: () => import('../data/rooms.js')
};
```

It normalizes everything into a unified `ContentStore` (Zustand) that the three panels read from.

### Hot-Reload Support
When Seb edits a JSON file in VS Code and saves, Vite's HMR should automatically reload the content in the CMS without a full page refresh.

---

## 4. The Consequence Chain Previewer

The most powerful feature: click any event and hit `[ PREVIEW CHAIN ]`. The CMS simulates the entire downstream effect:

```
🎭 The King Is Dead (Week 32, 1988)
  └── 📈 Market: neo-expressionism multiplier → 3.5x
  └── 📱 Phone: msg_margaux_basquiat sent to Margaux
  └── 🔓 Unlock: evt_assistant_sketches (available immediately)
      └── IF player buys sketches ($100k):
          └── 📦 Inventory: item_basquiat_notebooks added
          └── 💰 Value projection: $100k → $2.3M by 1998
      └── IF player ignores:
          └── ❌ Event expires permanently
  └── ⏰ Scheduled: evt_basquiat_price_surge (Week 36, 1988)
      └── 📈 Market: all Basquiat works +200% value
  └── ⏰ Scheduled: evt_basquiat_retrospective (Week 32, 1989)
      └── 🎭 New scene: Museum retrospective event
```

This lets Seb immediately see "if I write this event, what happens 10 weeks later?" without needing to play the game for 3 hours.

---

## 5. Export & Sync

After wiring things together in the CMS, the changes need to persist:

- **Option A (Simple):** The CMS writes updated JSON back to `localStorage` and the game reads from there at runtime.
- **Option B (Production):** The CMS exports a `content_manifest.json` file that ClaudeCode's build system reads.
- **Option C (Ideal):** The CMS directly writes back to the source `.js` data files via a lightweight dev server API (only in dev mode).

---

## 6. Relationship to Other Specs

| Spec | Relationship |
|---|---|
| `Admin_Narrative_Tracker_Spec.md` | The Tracker is **read-only runtime debugging**. The CMS is **authoring-time content wiring**. They share the same Zustand stores but serve different purposes. |
| `Core_Loop_Systems_Spec.md` | The CMS reads and writes the exact JSON schemas defined in the Core Loop Spec. Every schema in that doc = one entity type in the CMS Library. |
| `UI_and_Dynamic_Systems_Spec.md` | The CMS is a developer tool and does NOT need to respect the ThemeProvider. It always renders as a clean React overlay regardless of the active game theme. |
