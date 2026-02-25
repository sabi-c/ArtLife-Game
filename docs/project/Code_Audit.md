# ArtLife: Code Audit & Refactoring Plan

> **What this is:** A complete audit of the existing game codebase with specific issues found, why they matter, how to fix them, and what each fix teaches you about software architecture. Written for Seb to learn from and for ClaudeCode to execute.

---

## Executive Summary

| Metric | Value |
|---|---|
| **Total source files audited** | 55 |
| **Total lines of code** | ~7,200+ (excluding 150KB data files) |
| **Critical issues** | 4 |
| **Moderate issues** | 6 |
| **Minor / style issues** | 5 |
| **Recommended new files** | 3 |

**The codebase is remarkably well-structured for a prototype.** The event system, quality gates, and consequence scheduler are all cleanly written. But as V2 adds 7 new systems, three architectural patterns will become blockers if not addressed.

---

## 🔴 Critical Issues (Must Fix for V2)

### 1. The God Object: `GameState.js` (919 lines)

**The Problem:**
`GameState.js` does everything. It manages cash, portfolio, week advancement, deal resolution, NPC offers, market heat, burnout, save/load, transactions, active deals, news feed, stat application, city navigation, and venue entry/exit — all in a single class with a single `static state` object.

```javascript
// This ONE object holds: cash, portfolio, week, market state, 
// active deals, pending offers, burnout, suspicion, marketHeat,
// character data, stats, news feed, transactions, city position,
// venue state, events triggered, actions taken, and more.
static state = null;
```

**Why this matters:**
- **Every system imports `GameState`**, creating a dependency spider web. When you change how cash works, you might break the save system, the deal resolver, and the stat applier — because they're all in the same file reading the same object.
- **The `advanceWeek()` function is 185 lines long** (lines 156–340) and does everything sequentially: resolves deals, generates phone messages, ticks NPCs, fires consequences, processes offers, updates burnout, checks bankruptcy — all inside one function.
- **No error isolation.** If the deal resolver throws, the NPC tick, consequence scheduler, and market update never run.

**The Fix (3 files):**

```
GameState.js (919 lines) → split into:
├── GameState.js (~200 lines) — core state: cash, stats, week, character
├── DealResolver.js (~150 lines) — active deals + sale resolution
└── WeekEngine.js (~100 lines) — orchestrates advanceWeek() safely
```

**Why this is better:**
Think of it like a restaurant kitchen. Right now, one chef (GameState) is cooking, doing dishes, taking orders, AND managing the register. If they drop a plate, the whole kitchen stops. Splitting into specialists means the line cook can burn a steak without the cashier going down.

```javascript
// WeekEngine.js — The orchestrator
export function advanceWeek() {
    const state = GameState.state;
    state.week++;
    
    // Each step isolated — one failure doesn't kill the others
    try { DealResolver.resolveDeals(state); } 
    catch (e) { console.error('[WeekEngine] Deal resolution failed:', e); }
    
    try { PhoneManager.generateTurnMessages(); }
    catch (e) { console.error('[WeekEngine] Phone messages failed:', e); }
    
    try { PhoneManager.npcAutonomousTick(); }
    catch (e) { console.error('[WeekEngine] NPC tick failed:', e); }
    
    try { ConsequenceScheduler.tick(state.week); }
    catch (e) { console.error('[WeekEngine] Consequences failed:', e); }
    
    try { MarketManager.tick(); }
    catch (e) { console.error('[WeekEngine] Market tick failed:', e); }
}
```

---

### 2. Static Classes as Singletons (All Managers)

**The Problem:**
Every manager uses `static` methods and `static` fields:

```javascript
export class MarketManager {
    static artists = [];  // Mutable global state
    static works = [];    // Mutable global state
    
    static tick() { ... }
    static calculatePrice(work) { ... }
}
```

**Why this matters:**
- **Cannot be tested in isolation.** You can't create two separate `MarketManager` instances to test different scenarios.
- **Cannot be garbage collected.** Static state lives forever. If you load a new game, the old market data still lurks in memory unless you manually call `reset()`.
- **Order-dependent initialization.** `MarketManager.init()` must be called before `MarketManager.tick()`, but nothing enforces this. If a scene calls `tick()` first, you get a silent bug.

**The Better Pattern: Zustand Stores**

This is exactly what `zustand` was designed for, and why we specified it in the V2 Implementation Plan:

```javascript
// Before (static singleton — fragile)
MarketManager.tick();
const price = MarketManager.calculatePrice(work);

// After (Zustand store — reactive, testable, serializable)
const { tick, calculatePrice } = useMarketStore.getState();
tick();
const price = calculatePrice(work);
```

**Why Zustand is better:**
- **Reactive.** React components automatically re-render when store data changes. No need to manually bridge state.
- **Serializable.** `persist` middleware gives you save/load for free — no manual `toJSON()` needed.
- **Testable.** You can create isolated store instances for unit tests.
- **No initialization order.** Stores are created with defaults. No `init()` needed.

**The Migration Path (Non-Breaking):**
Don't rewrite everything at once. Wrap existing managers as Zustand stores one at a time:

```javascript
// Step 1: Wrap MarketManager in a Zustand adapter
export const useMarketStore = create((set, get) => ({
    artists: [],
    works: [],
    init: (works) => {
        MarketManager.init(works);
        set({ artists: MarketManager.artists, works: MarketManager.works });
    },
    tick: () => {
        MarketManager.tick();
        set({ artists: [...MarketManager.artists], works: [...MarketManager.works] });
    }
}));
```

---

### 3. PhoneManager Double Duty

**The Problem:**
`PhoneManager.js` (542 lines) does two unrelated jobs:
1. **Messaging system** — sending/receiving messages, unread counts, actions
2. **NPC memory system** — grudges, favors, witnessed events, autonomous ticking

**Why this matters:** When you add the V2 NPC Registry (which needs memory, schedule, and stats), you'll be fighting with `PhoneManager` over who owns NPC data. Right now, NPC favor is tracked in `PhoneManager.contacts[npcId].favor` — but the NPC Registry spec puts it in `npc.baseStats.loyalty`.

**The Fix:**
```
PhoneManager.js (542 lines) → split into:
├── PhoneManager.js (~250 lines) — messaging only: send, receive, read, actions
└── NPCMemory.js (~200 lines) — grudges, favors, witnessed, autonomous tick
```

Then the V2 `NPCRegistry.js` absorbs `NPCMemory.js` naturally.

---

### 4. Cross-Manager Direct Mutation

**The Problem:**
Managers reach directly into other managers' state:

```javascript
// In MarketManager.tick() (line 74-76):
if (state.marketHeat > 0) {
    state.marketHeat = Math.max(0, state.marketHeat - 1);  // ← mutating GameState directly
}
if (state.suspicion > 0) {
    state.suspicion = Math.max(0, state.suspicion - 0.5);   // ← mutating GameState directly
}
```

**Why this matters:**
- `MarketManager` is supposed to manage the *market*. Why is it decaying `suspicion`?
- If you later add a `SuspicionManager`, you'll have two systems fighting over the same value.
- Makes debugging nightmarish — "who changed my suspicion?" could be any of 5 files.

**The Rule:**
> **A manager may only write to its own state.** If it needs to affect another system, it emits an event via `GameEventBus` or returns a result that the caller applies.

```javascript
// Wrong: MarketManager mutates GameState directly
state.suspicion = Math.max(0, state.suspicion - 0.5);

// Right: MarketManager returns effects, caller applies them
const effects = MarketManager.tick();
// effects = { suspicionDecay: 0.5, marketHeatDecay: 1 }
GameState.applyEffects({ suspicion: -effects.suspicionDecay });
```

---

## 🟡 Moderate Issues (Should Fix Before V2)

### 5. The 150KB `events.js` Data File

At 149KB, `events.js` is the largest file in the codebase. It contains every event in the game as a single exported array.

**Why this matters:** Vite will import this entire file even if you only need one event. As you add more events (the spec targets 500+), this file will balloon to 1MB+.

**The Fix:** Split events by category or era:

```
data/events.js (150KB) → split into:
├── data/events/index.js — barrel file that re-exports all events
├── data/events/era_shifts.js
├── data/events/scandals.js
├── data/events/opportunities.js
├── data/events/social.js
└── data/events/personal.js
```

This enables **lazy loading** — only load scandal events when a scandal is about to fire.

---

### 6. No Error Boundaries in Managers

No manager uses try/catch anywhere. The `applyEffects()` function (155 lines, GameState lines 477-632) does a massive switch/case over 20+ effect types — if any one throws, the entire effect chain stops mid-application.

**The Fix:** Wrap each effect application in try/catch:

```javascript
// GameState.applyEffects() — current (dangerous)
if (effects.cash) state.cash += effects.cash;
if (effects.burnout) state.burnout = Math.min(10, state.burnout + effects.burnout);

// Better: each effect isolated
const effectHandlers = {
    cash: (val) => { state.cash += val; },
    burnout: (val) => { state.burnout = Math.min(10, state.burnout + val); },
    // ... etc
};

Object.entries(effects).forEach(([key, val]) => {
    try {
        if (effectHandlers[key]) effectHandlers[key](val);
        else console.warn(`[applyEffects] Unknown effect: ${key}`);
    } catch (e) {
        console.error(`[applyEffects] Failed to apply ${key}:`, e);
    }
});
```

---

### 7. React ↔ Phaser Bridge via `window` Globals

**The Problem:**

```javascript
// In phaserInit.js:
window.TerminalUIInstance = ui;
window.phaserGame = phaserGame;

// In App.jsx:
window.toggleEgoDashboard = (state) => { ... };
```

**Why this matters:** Global `window` properties bypass React's state management. They're invisible to React DevTools, can't be cleaned up reliably, and create race conditions if React re-renders before Phaser is ready.

**The Better Pattern: GameEventBus (already exists!)**

You already have `GameEventBus.js` — use it for ALL React ↔ Phaser communication instead of `window`:

```javascript
// Instead of window.toggleEgoDashboard
GameEventBus.emit(GameEvents.TOGGLE_DASHBOARD, true);

// In App.jsx
useEffect(() => {
    const handler = (state) => setShowDashboard(state);
    GameEventBus.on(GameEvents.TOGGLE_DASHBOARD, handler);
    return () => GameEventBus.off(GameEvents.TOGGLE_DASHBOARD, handler);
}, []);
```

---

### 8. `applyEffects()` is a 155-Line God Function

`GameState.applyEffects()` (lines 477-632) handles 20+ effect types in a single function with nested conditions. It's the second-largest function in the codebase after `advanceWeek()`.

**The Fix:** Use a handler registry pattern (shown in issue #6 above). This also makes it trivial to add new effect types for V2 without touching the core function.

---

### 9. Duplicate ID Generation

Multiple files generate IDs using the same pattern:

```javascript
// In ConsequenceScheduler.js:
id: `csq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

// In MarketManager.js:
id: `work_gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

// In GameState.js advanceWeek():
id: `sell_${Date.now()}_${deal.work.id}`
```

**The Fix:** Create a shared `generateId(prefix)` utility:

```javascript
// utils/id.js
let counter = 0;
export function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${(counter++).toString(36)}`;
}
```

---

### 10. Sorting with `Math.random()` is Not Uniform

```javascript
// In MarketManager.getAvailableWorks():
const shuffled = onMarket.sort(() => Math.random() - 0.5);
```

**Why this matters:** `Array.sort()` with `Math.random()` produces a biased shuffle — items near the beginning of the array are more likely to stay near the beginning. This means the same artworks tend to appear on the market.

**The Fix:** Fisher-Yates shuffle:

```javascript
// utils/shuffle.js
export function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
```

---

## 🟢 Minor / Style Issues

### 11. Inconsistent Export Patterns
Some files use `export class`, others use `export default function`, and data files use `export const`. This is fine, but should follow a rule:
- **Managers/Engines:** `export class` (named export)
- **React Components:** `export default function`
- **Data:** `export const`
- **Utilities:** `export function`

### 12. `PhoneManager.addMessage` vs `PhoneManager.sendMessage`
Both methods exist. `addMessage` is called in some places (line 241 of GameState.js) but doesn't appear in PhoneManager's outline. This suggests it either doesn't exist (runtime error waiting to happen) or was renamed.

### 13. CharacterSelectScene.js is 53KB
This is a Phaser scene with inline art generation, animation, and layout logic. Could be split into `CharacterData.js` + `CharacterSelectScene.js`, but it's a Phaser scene so this is lower priority.

### 14. Magic Numbers
Several magic numbers throughout (e.g., `0.45` bias in market heat, `0.3` buyback probability, `15` crash penalty). These should be constants at the top of the file.

### 15. Missing JSDoc on some functions
Most managers have excellent documentation (ConsequenceScheduler and PhoneManager are particularly well-documented). But GameState methods like `buyWork()`, `sellWork()`, and `applyEffects()` lack parameter docs.

---

## Recommended Refactoring Priority

| Priority | Issue | Impact | Effort |
|---|---|---|---|
| **1** | Split `GameState.js` → 3 files | Unblocks V2 Zustand migration | Medium |
| **2** | Split `PhoneManager.js` → Phone + NPCMemory | Unblocks V2 NPC Registry | Medium |
| **3** | Add try/catch to `advanceWeek()` | Prevents cascading failures | Low |
| **4** | Replace `window` globals with GameEventBus | Cleaner React ↔ Phaser bridge | Low |
| **5** | Split `events.js` by category | Enables lazy loading, smaller bundles | Low |
| **6** | Move suspicion/heat decay out of MarketManager | Enforces ownership boundaries | Low |
| **7** | Fix Fisher-Yates shuffle | Fairer market rotation | Trivial |
| **8** | Shared `generateId()` utility | DRY, consistent IDs | Trivial |

> [!TIP]
> **Items 1-3 should be done BEFORE building any V2 systems.** They clear the path for the Zustand migration and the new store architecture. Items 4-8 can be done alongside V2 work.

---

## What's Already Great (Don't Touch)

| File | Why It's Good |
|---|---|
| `ConsequenceScheduler.js` | Clean single-responsibility. Well-documented API. Proper separation of `add()`, `tick()`, and `execute()`. |
| `EventManager.js` | Simple, focused. Oregon Trail pacing reads clearly. Weighted random selection is correct. |
| `QualityGate.js` | Great abstraction. Stat-gating in one place. Blue option detection is clean. |
| `DecisionLog.js` | Good journaling pattern. Tags and NPC links are well-designed. |
| `GameEventBus.js` | Excellent bridge pattern. Just needs more adoption to replace `window` globals. |
| `ErrorBoundary.jsx` | Proper React error boundary with user-facing recovery UI. |
| `App.jsx` | Clean, minimal. Correct Phaser lifecycle (create on mount, destroy on unmount). |
