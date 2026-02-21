# ArtLife: Dynamic Systems & UI Plugin Architecture

This document serves as the architectural foundation and conceptual spec for the advanced UI systems and historical progression mechanics discussed for ArtLife v2. 

The goal for ClaudeCode (or whichever agent implements this) is to build the underlying state and hooks so that Seb can drop in pure narrative and historical data without having to rewire the entire game constantly.

---

## 1. Modular "UI Plugin" Architecture

To support vastly different aesthetics without rewriting the core game logic, the UI layer must be completely decoupled from the Game State layer (Zustand).

We want to build the UI as interchangeable "Themes" or "Plugins":

### The Three Core Themes
1. **The Terminal (Current V1):** Text-based, DOS-style, pure data.
2. **The "Clean Web OVR" (Brad Troemel Style):** Hyper-minimalist, white backgrounds, mimicking contemporary art websites or pretentious online viewing rooms (OVRs).
3. **The "Diegetic Desk" (The Ideal 3D/2D Hybrid):** The player stares at a physical desk top down.
    *   **The Phone:** Rings for contacts and haggle calls.
    *   **The Rolodex:** Clicking it opens your contacts and rep.
    *   **The Ledger/Computer:** Clicking it opens your portfolio and market stats.
    *   **The Calendar:** Shows upcoming auctions and deadlines.

### Technical Implementation
*   **State:** Use Zustand exclusively for `state` (money, items, rep, week).
*   **Context/Provider:** Wrap the App in a `<ThemeProvider>` that injects the current active UI Plugin.
*   **Component Mapping:** A master registry maps abstract actions to specific React components based on the Theme.
    *   *Example:* If `Theme === 'Desk'`, `action.openMarket` zooms the camera into the laptop on the desk.
    *   *Example:* If `Theme === 'Terminal'`, `action.openMarket` pushes a text list screen to the terminal stack.

---

## 2. The Dynamic "Diegetic Desk" System

If the player uses the "Desk" UI theme, the environment should naturally evolve over the course of the 40-year game.

### Evolving Objects (Progression Visually Represented)
The state of your desk is a direct reflection of your stats:
*   **Low Access / Starter:** A messy, basic wooden desk. A rotary phone. A cheap notepad.
*   **High Capital:** The desk upgrades to solid mahogany or glass. The notepad becomes a high-end laptop.
*   **Acquisitions:** When you buy a physical piece of art (like a small sculpture or a sketch), it permanently lives on your desk until you sell it.
*   **Auction States:** An "Auction Paddle" appears on the desk 2 weeks before a major auction.
*   **Substance Abuse (Vice Mechanics):** If you are running the "Snowblind" trait, lines of cocaine might literally appear on the desk. When the 80s end and the supply dries up, the desk changes to reflect the new era's vices.

---

## 3. The "40-Year Career" (Historical Eras)

The game spans multiple decades (e.g., 1980 to 2020). The code foundation needs a dynamic "Era Engine" that modifies the economy and the available narrative based on the current year.

### Era Transitions and Events
The state needs an array of `Historical Events` that trigger on specific weeks/years. These events drastically alter the market.

#### Example Scenario: 1988 (The Death of Basquiat)
*   **The Trigger:** Week X, 1988. A global news ticker announces Basquiat's death.
*   **The Market Impact:** 
    *   Any Basquiat paintings in your collection instantly 10x in Estimated Value.
    *   All "Downtown Scene" artists get a permanent +20 to their Global `Heat` score.
*   **The Narrative Hook (Exclusivity):** If you have a high enough `Access` stat or the right contacts (e.g., you are friends with his assistant), a unique dialogue event triggers: *You can buy all of the assistant's notebook sketches for $100k.* 
    *   If you ignore it, the event is gone forever. If you buy them, they mature into millions of dollars 10 years later.

### Technical Implementation
Create a unified `EventEngine.js` that checks for triggers at the start of every week:
```javascript
const HistoricalEvents = [
  {
    year: 1988,
    week: 32,
    id: "BASQUIAT_DEATH",
    effects: {
      marketModifier: { tags: ["neo-expressionism"], multiplier: 3.5 },
      unlockEncounter: "assistant_sketches_deal"
    }
  },
  {
    year: 2008,
    week: 40,
    id: "GLOBAL_FINANCIAL_CRASH",
    effects: {
      playerLiquidCash: (cash) => cash * 0.5, // The Crypto/Market Crash vice
      marketModifier: { tags: ["blue-chip"], multiplier: 0.6 }
    }
  }
];
```

By building the events engine this way, you can write hundreds of JSON event blocks (The 70s Minimalist boom, the YBA explosion in the 90s, the 2008 crash) and the game will automatically handle the massive economic shockwaves.
