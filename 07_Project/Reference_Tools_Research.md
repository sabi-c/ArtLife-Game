# ArtLife: Open-Source Reference Tools & Research Audit

> Compiled 2026-02-21. This document maps the best open-source tools and repos to each system in our architecture, with specific recommendations on what to steal, adapt, or avoid.

---

## 1. Narrative / Dialogue Engine

**Our System:** `SceneEngine.js` (Core Loop Spec §3)

| Tool | Tech | Why It Matters | Recommendation |
|---|---|---|---|
| **[inkjs](https://github.com/y-lohse/inkjs)** | JS (npm) | The industry-standard narrative scripting language (used by *80 Days*, *Heaven's Vault*). Compiles `.ink` scripts into JSON that a JS runtime parses. Has native support for variables, conditionals, and branching. | **🟢 STRONGLY CONSIDER.** Instead of writing our own JSON branching parser from scratch, we could write narrative in `.ink` format (much more author-friendly) and let inkjs handle the parsing. Our `SceneEngine` would just be a React renderer on top of inkjs. |
| **[Arrow](https://github.com/mhgolkar/Arrow)** | Cross-platform | A visual node-based narrative editor that exports to JSON. Supports variables, characters, and complex branching flows. | **🟡 REFERENCE.** Arrow's visual editor is what our CMS Timeline/Wiring Inspector is trying to be. Study its node connection model for the Wiring Inspector panel. |
| **[Bark](https://github.com/nclarke-development-studio/bark)** | React + React Flow | A dialogue/JSON editor built in React with React Flow Renderer. Drag-and-drop node graph. | **🟢 STEAL THE UI PATTERN.** Bark is literally a React-based node dialogue editor. Its React Flow integration is exactly what our CMS Wiring Inspector needs. |
| **[Drafft](https://drafft.dev)** | Web | Modern branching dialogue tool with quest/item/grid integration. Standard JSON export. | **🟡 REFERENCE.** Drafft's quest+item integration alongside dialogue is close to our unified JSON philosophy. |
| **[Narrat](https://narrat.dev)** | JS | A beginner-friendly narrative game engine with built-in RPG features, choices, and conditions. | **🟡 REFERENCE.** Narrat's approach to combining narrative + RPG stats is similar to our Quality Gate system. |

### Key Learning
**inkjs is the strongest candidate for replacing our custom JSON branching parser.** It is battle-tested, widely used, and the `.ink` scripting format is far more author-friendly than writing raw JSON. Our `SceneEngine.js` could import `inkjs`, load compiled `.ink.json` stories, and render them in React — getting us the best of both worlds.

---

## 2. Content Management / Visual Editor

**Our System:** Content Management Studio Spec

| Tool | Tech | Why It Matters | Recommendation |
|---|---|---|---|
| **[React Flow](https://reactflow.dev)** | React | The gold-standard React library for building node-based editors, workflow builders, and visual programming interfaces. | **🟢 USE THIS.** React Flow should be the rendering engine for our CMS Wiring Inspector and potentially the Timeline. It's designed exactly for this use case. |
| **[rpgboss](https://github.com/rpgboss/rpgboss)** | Scala/Java | A point-and-click RPG game editor with event management. | **🔴 SKIP.** Wrong tech stack (JVM), and it's a full engine, not a content tool. |
| **[GameCalendarKit](https://github.com/Gravideots/GameCalendarKit)** | Unity C# | A Unity asset for managing in-game time and events with a visual editor. | **🟡 REFERENCE for Calendar UI.** Study how it visualizes time-based event placement. Our Calendar panel should feel like this, but in React. |

### Key Learning
**React Flow is the must-have dependency for the CMS.** Instead of building our own drag-and-drop node system, we use React Flow to render the Wiring Inspector (entity connections), and potentially the Timeline (events on a scrollable axis). This saves weeks of custom UI work.

---

## 3. Market / Economic Simulation

**Our System:** `MarketEngine.js` (Core Loop Spec §7)

| Tool | Tech | Why It Matters | Recommendation |
|---|---|---|---|
| **[js-trading-simulator](https://github.com/pavankat/js-trading-simulator)** | JS + jQuery | A stock trading game with portfolio tracking, buy/sell, and net worth calculation. | **🟡 REFERENCE.** Its price fluctuation logic (random walks with constraints) is a good starting model for our artist heat system. |
| **[Spice Hustle](https://github.com/topics/commodity-trading-game)** | React + TypeScript | A commodity trading sim built in React. Market prices fluctuate based on supply/demand/events. | **🟢 STUDY CLOSELY.** Spice Hustle's commodity model (where external events shift prices) is very close to our "Era Events inject market modifiers" system. |
| **[Stock-Market-Simulator (bkeuria1)](https://github.com/bkeuria1/Stock-Market-Simulator)** | MERN Stack | Full portfolio with buy/sell, charts, and historical data. | **🟡 REFERENCE.** Its React dashboard with portfolio charts is similar to our Ego Dashboard Net Worth graph. |

### Key Learning
**Our Market Engine should model art as a commodity with event-based price shocks**, exactly like Spice Hustle. The formula `basePrice × artistHeat × eraModifier × (1 ± volatility)` is validated by how these simulators work.

---

## 4. Text Adventure / Game Engine

**Our System:** The overall game loop

| Tool | Tech | Why It Matters | Recommendation |
|---|---|---|---|
| **[text-engine (okaybenji)](https://github.com/okaybenji/text-engine)** | Vanilla JS | A tiny, zero-dependency text adventure engine. Rooms, items, NPCs defined as JS objects. | **🟢 STUDY THE DATA MODEL.** text-engine's room/item/NPC object structure is remarkably similar to our Core Loop JSON schemas. It validates our approach. |
| **[besnik/text-adventure-game-js-engine](https://github.com/besnik/text-adventure-game-js-engine)** | React + JS | A text adventure engine built in React. | **🟡 REFERENCE.** Proves that React is a viable renderer for text adventure games. |

---

## 5. Summary: What to Integrate vs. Reference

| Category | Action | Tool |
|---|---|---|
| **Narrative Parsing** | **INTEGRATE** (npm install) | `inkjs` — replaces custom JSON branching parser |
| **CMS Visual Editor** | **INTEGRATE** (npm install) | `react-flow` — renders node graphs for Wiring Inspector |
| **Market Simulation** | **REFERENCE** (study patterns) | `Spice Hustle` — event-based commodity price model |
| **Calendar UI** | **REFERENCE** (study UX) | `GameCalendarKit` — visual event placement on timeline |
| **Dialogue Editor** | **REFERENCE** (study architecture) | `Bark` — React-based dialogue node editor |
| **Data Model** | **REFERENCE** (validate schemas) | `text-engine` — room/item/NPC object patterns |
