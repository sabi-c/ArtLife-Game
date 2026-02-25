# ArtLife — GDD & Project Hub

> A turn-based art market simulation game where players build, speculate, and strategise their way through the contemporary art world.
> Live: [sabi-c.github.io/ArtLife-Game](https://sabi-c.github.io/ArtLife-Game/)

---

## Quick Start

```bash
cd game
npm install
npm run dev       # → http://localhost:5175
```

---

## Document Map

### Overview & Vision
| Document | Description |
|----------|-------------|
| [Game Concept](docs/overview/Game_Concept.md) | Core vision, pillars, and elevator pitch |
| [Gameplay Loop](docs/overview/Gameplay_Loop.md) | Full experience design: home → computer terminal → city exploration → systems |
| [Vision Statement](docs/overview/Vision_Statement.md) | Tone, audience, and goals |
| [Fundamentals of Play](docs/project/Fundamentals_of_Play.md) | Design philosophy grounded in game theory (Caillois, Blatner) |

---

### Mechanics
| Document | Description |
|----------|-------------|
| [Time System](docs/mechanics/Time_System.md) | How turns and compressed time work |
| [Turn Engine](docs/mechanics/Turn_Engine.md) | What happens each turn cycle |
| [Market System](docs/mechanics/Market_System.md) | How art prices fluctuate |
| [Phone & Contacts](docs/mechanics/Phone_Contacts.md) | Nokia phone, NPC contacts, calendar, messages |

---

### Characters & Events
| Document | Description |
|----------|-------------|
| [Character Classes](docs/characters/Character_Classes.md) | Playable personas and starting conditions |
| [Perks and Bonuses](docs/characters/Perks_and_Bonuses.md) | Ongoing advantages per class |
| [Event Types](docs/events/Event_Types.md) | Gallery openings, cocktail parties, free ports, etc. |
| [Dialogue Trees](docs/events/Dialogue_Trees.md) | Decision branching between turns |
| [Dialogue Trees V2](docs/events/Dialogue_Trees_V2.md) | Updated branching system |
| [Scenarios](docs/events/Scenarios.md) | Story scenarios and random events |
| [Venue Encounters](docs/events/Venue_Encounters.md) | Location-specific encounter designs |

---

### World & Economy
| Document | Description |
|----------|-------------|
| [Locations](docs/world/Locations.md) | Where the game takes place |
| [Free Ports](docs/world/Free_Ports.md) | Freeport mechanics and storage |
| [Room Schema](docs/world/Room_Schema.md) | Room data structure specification |
| [Art Valuation](docs/economy/Art_Valuation.md) | How artworks are priced and valued |
| **Rooms (World):** | |
| [Artist Studio](docs/world/Rooms/Artist_Studio.md) | Studio room spec |
| [Art Fair Basel](docs/world/Rooms/Art_Fair_Basel.md) | Art fair room spec |
| [Auction House](docs/world/Rooms/Auction_House.md) | Auction house spec |
| [Freeport](docs/world/Rooms/Freeport.md) | Freeport storage spec |
| [Cocktail Party](docs/world/Rooms/Cocktail_Party.md) | Social event spec |
| [Gallery Opening](docs/world/Rooms/Gallery_Opening.md) | Gallery opening spec |

---

### CMS & Admin Tools
| Document | Description |
|----------|-------------|
| [Content Management Studio Spec](docs/project/Content_Management_Studio_Spec.md) | Visual authoring workspace — drag-and-drop events, NPC wiring, CMS architecture |
| [Page Flow Map](docs/project/PageFlow.md) | All game screens, overlays, and scene transitions with routes |
| [Scene Flow Visual Editor Plan](docs/project/Scene_Flow_Visual_Editor_Plan.md) | Node-based React Flow editor for drag-and-drop scene transitions |
| [Admin Dashboard & Settings Plan](docs/project/Admin_Dashboard_and_Settings_Overhaul_Plan.md) | Live JSON editing, visual map spawning, snapshot memory tools |
| [Admin Narrative Tracker Spec](docs/project/Admin_Narrative_Tracker_Spec.md) | "God Mode" dashboard for tracking hidden flags and consequence queue |
| [Email & Walkaround UI Spec](docs/project/Email_and_Walkaround_UI_Spec.md) | Email overlay & negotiation UI |

---

### Technical Reference
| Document | Description |
|----------|-------------|
| [Technical Stack](docs/project/Technical_Stack.md) | Why each technology (Phaser 3, inkjs, Vite, localStorage) |
| [Implementation Plan](docs/project/Implementation_Plan.md) | Production-grade code patterns, error handling, build order |
| [Core Loop Systems Spec](docs/project/Core_Loop_Systems_Spec.md) | 7 core systems (Phone, Calendar, Scene, NPC, Event, Inventory, Pricing) |
| [UI Architecture & Modularity](docs/project/UI_Architecture_and_Modularity_Spec.md) | Component patterns |
| [UI & Dynamic Systems Spec](docs/project/UI_and_Dynamic_Systems_Spec.md) | React ThemeProvider & 40-Year Era framework |
| [Systemic Time & Event Architecture](docs/project/Systemic_Time_and_Event_Architecture_Plan.md) | 24-hour clock linking macro weeks to micro exploration |
| [Pokemon Grid Engine Integration](docs/project/Pokemon_Grid_Engine_Integration_Plan.md) | GridEngine integration for overworld |
| [Phase 4 Multi-Agent Orders](docs/project/Phase_4_Multi_Agent_Orders.md) | Multi-agent NPC trading system design |

---

### Content & Data
| Document | Description |
|----------|-------------|
| [Art World Database](docs/project/Art_World_Database.md) | 50+ real scandals, sales, dealers, collectors, heists, and fairs for game content |
| [Art Style Guide](docs/project/Art_Style_Guide.md) | Visual language: palette, typography, UI patterns, asset specs, effects |
| [Gallery Styles](docs/project/GalleryStyles.md) | Gallery visual styling guide |
| [Asset Manifest](docs/project/Asset_Manifest.md) | Complete inventory of all existing and needed game assets |
| [Content Templates](docs/project/Content_Templates.md) | Templates for writing events, NPC dialogue, and calendar entries |
| [Dialogue Tree Template](docs/project/Dialogue_Tree_Template.md) | AI content pipeline: JSON schema, field docs, examples for generating new scenes |
| [Data Ingestion Template](docs/project/Data_Ingestion_Template.md) | Standardized schema for AI scrapers feeding real-world auction data |
| [Antigravity Gallery Assets Prompt](docs/project/Antigravity_Gallery_Assets_Prompt.md) | Asset generation prompts |
| [Antigravity Gallery v2](docs/project/Antigravity_Gallery_v2.md) | Gallery v2 spec |

---

### Project Management
| Document | Description |
|----------|-------------|
| [Agent Coordination & Source of Truth](docs/project/README.md) | **Read this first.** Live agent coordination, phase status, what's built, dev workflow |
| [Roadmap](docs/project/Roadmap.md) | Full task tracker — phases, current sprint, session logs |
| [MVP Definition](docs/project/MVP_Definition.md) | What to build first — scope and success criteria |
| [Codebase Management Protocol](docs/project/Codebase_Management_Protocol.md) | How to manage complexity at scale |
| [Brainstorm Notes](docs/project/Brainstorm_Notes.md) | Raw ideas from brainstorming sessions |
| [Game Dev Questions](docs/project/Game_Dev_Questions.md) | Critical design decisions to answer before building |
| [Synthesis & Action Plan](docs/project/Synthesis_and_Action_Plan.md) | Synthesis of research and design decisions |
| [Comprehensive Game Design Action Plan v2](docs/project/Comprehensive%20Game%20Design%20Action%20Plan%20for%20ArtLife%20V2%20-%20A%20Systemic%20Neo-Noir%20Simulation.md) | Systemic neo-noir simulation plan |

---

### Code Audits & Research
| Document | Description |
|----------|-------------|
| [Audit Report 2026-02-25](docs/project/Audit_Report_2026-02-25.md) | **Latest.** Full codebase audit: PageEditor v1/v2/v3 history, GitHub status, tech debt, documentation gap analysis |
| [Code Audit](docs/project/Code_Audit.md) | V1 code audit — 15 issues found (4 critical), refactoring priorities |
| [Code Audit & Refactoring Plan](docs/project/Code_Audit_and_Refactoring_Plan.md) | Phase 4 assessment: Zustand transition, data hardcoding, React UI routing |
| [Text RPG Research](docs/project/Text_RPG_Research.md) | 50 years of text RPG mechanics, engines, and decision patterns |
| [Reference Tools Research](docs/project/Reference_Tools_Research.md) | Audit of narrative engines, CMS tools, and market sims |
| [Terminal Login Spec](docs/project/Terminal_Login_Spec.md) | Boot sequence & profile select UI |
| [README Archive](docs/project/README_ARCHIVE.md) | Historical logs, completed V1 work, session notes |

---

### Code Architecture (In-Game)
| Document | Description |
|----------|-------------|
| [Game README](game/README.md) | Quick start, architecture overview, market economy, CMS reference |
| [Architecture](game/ARCHITECTURE.md) | Layer breakdown, data flow, key stores & managers |
| [Claude Instructions](game/CLAUDE.md) | Agent workflow, pre-approved permissions, build/test patterns, common pitfalls |
| [UI Plugin Architecture](game/docs/UI_PLUGIN_ARCHITECTURE.md) | UI plugin patterns |

---

## Last Updated
2026-02-25

## Tags
#game-design #art-market #simulation #turn-based #cms #phaser3 #react
