# Systemic Time & Event Architecture Plan

## The Goal
The current game relies on a macro "Week" abstraction where `states` tick over after 3 actions. As we introduce full spatial exploration via `GridEngine` (Pokemon-style walking), this abstraction breaks down. Walking from a gallery to a cafe shouldn't consume a "Week". 

We must implement a **Continuous Clock & Calendar System** that seamlessly bridges macro-economic ticks (Weeks) with micro-narrative actions (Hours/Minutes) while the player explores the world.

---

## 1. The Real-Time Clock (RTC) Overhaul
We will refactor `GameState` and `WeekEngine` to support a granular calendar.

### The New Time Structure (`gameStore.js`)
Instead of just `week: 1`, the global state will track:
```javascript
time: {
    week: 1,           // Macro-economic tick
    dayOfWeek: 1,      // 1 (Mon) - 7 (Sun)
    hour: 9,           // 0 - 23   (Military Time)
    minute: 0          // 0 - 59
}
```

### Time Consumption Mechanics
- **Grid Walking (`WorldScene.js`):** Every 10 tiles moved consumes 1 minute.
- **Fast Travel / Train (`FastTravelScene.js`):** Consumes chunks of time based on distance (e.g., Downtown to Uptown = 45 minutes).
- **Haggle Battle (`HaggleScene.js`):** Consumes 2 hours.
- **Dialogue / Eavesdropping (`MacDialogueScene.js`):** Consumes 30 minutes.

### The "End of Day" Boundary
When the clock hits `24:00` (Midnight), the player must return to their apartment or hotel. If they stay out past `02:00`, they suffer a **Burnout** penalty and wake up at `12:00` the next day. A normal sleep resyncs the clock to `08:00` the next morning.

When `dayOfWeek` completes a Sunday, the `WeekEngine.advanceWeek()` fires, processing financial overhead, market shifts, and macro consequences.

---

## 2. Spatial-Temporal Event Triggers (The Event Registry)
Currently, `EventRegistry` fires random events based on a probability roll at the end of a week. We will upgrade this to a strictly sequenced trigger system.

Events will now define **Spatial-Temporal Conditions**:
```json
{
    "id": "shady_dealer_alley",
    "title": "A Midnight Offer",
    "triggerConditions": {
        "locationZone": "underground_club_exterior",
        "dayOfWeek": [5, 6], // Fridays and Saturdays
        "hourMin": 22,       // Only after 10 PM
        "hourMax": 4         // Until 4 AM
    },
    ...
}
```

### Real-Time Interruption
As the player walks around using `MobileJoypad.jsx`, a `TimeTick` listener continuously checks coordinates against active event conditions. If a match occurs:
1. GridEngine movement halts immediately (lock input).
2. The `GameEventBus` fires `SCENE_LAUNCH`.
3. The Terminal UI renders the narrative Dialogue Tree or a Haggle Battle.

---

## 3. Dynamic NPC Schedules
Because time exists, NPCs are no longer static portraits. 
- **The Gallery Owner** is at work Monday-Friday, 10:00 to 18:00. If you visit the gallery at 21:00, the door is locked.
- **The Rival Collector** can be found at the high-end cocktail bar on Thursdays between 19:00 and 22:00. Eavesdropping there unlocks exclusive intelligence.

The `npcStore` will be upgraded to maintain an array of coordinate/schedule maps for each contact. 

---

## 4. Admin Dashboard Upgrade: The Event Sequencer
To build these sequences without writing JSON by hand, we will expand `AdminDashboard.jsx`.

**New Tab: [ SEQ ] (Sequencer)**
- A visual timeline of the current 7-day week.
- A debugger to force-set the clock (e.g., "Skip to Friday 21:00").
- A spawn tool to dynamically place an event trigger volume on the active `WorldScene` tilemap and bind it to a narrative JSON file.

---

## Implementation Phases

**Phase A: The Core Clock (Sprint 3.1)**
- Add `hour`, `minute`, `day` to `GameState`.
- Build the `CalendarHUD.jsx` component to display the ticking clock overlay on top of the Grid World.

**Phase B: Spatial Time Drain (Sprint 3.2)**
- Hook `GridEngine.positionChangeFinished` observable in `WorldScene.js` to dispatch time-advance events to the Zustand store.
- Implement the Day/Night visual tint using Phaser's `postFX` (dimming the canvas at 19:00, pitch black at 24:00 except for streetlights).

**Phase C: Trigger Volumes & NPC Schedules (Sprint 3.3)**
- Refactor `events/index.js` schema to accept condition bounding boxes.
- Implement the NPC schedule matrix and door locks.
