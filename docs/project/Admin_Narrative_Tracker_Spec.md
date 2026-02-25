# ArtLife: Narrative Admin Dashboard Spec (The "God Mode" Terminal)

As the game scales into deep narrative arcs involving 40-year timelines and hidden consequences, tracking the state of the story becomes impossible through pure gameplay testing. 

To solve this, we need a backend **Narrative Admin Dashboard**. This is a developer-only UI overlay that reads from the `Zustand` state engine and provides a top-down "God Mode" view of every hidden flag, scheduled consequence, and NPC relationship.

---

## 1. What the Admin Dashboard Does

The Admin Dashboard provides real-time visibility into the hidden numbers driving the narrative engine. It allows Seb (or ClaudeCode) to instantly jump into any given week, trigger historical events, and verify that choices are being logged correctly.

### Core Panels
1. **The Consequence Queue:** A list of every delayed event (e.g., "The IRS Audits You in 5 Weeks"). Shows a countdown and the exact JSON payload waiting to execute.
2. **Global Flags & Decisions:** A raw feed of every `[true / false]` flag the player has tripped. (e.g., `has_betrayed_dealer: true`, `bought_fake_pollock: false`).
3. **NPC Memory Matrix:** A grid showing every active NPC. Instead of just their visible "Favor" score, it lists their hidden "Grudges," the last day you spoke, and specific rumors they've heard.
4. **The Time Machine (Debug Tools):** A master control panel to force the advancement of time by weeks or years, instantly triggering historical era events (e.g., jumping from 1982 to 1988) to test market shocks.

---

## 2. Technical Architecture & Implementation

This system should be built as a standalone React layer that renders *over* the game, specifically hidden behind a developer hotkey (e.g., pressing `~` or `F12`).

### Integration with Zustand
The entire dashboard is effectively a set of pure components mapping over the existing state tree.

```javascript
// Example: The Consequence Queue UI reading from the Zustand hook
function AdminConsequenceQueue() {
  const scheduledEvents = useGameStore(state => state.consequenceScheduler.queue);
  
  return (
    <div className="admin-panel">
      <h3>Pending Consequences</h3>
      {scheduledEvents.map(event => (
        <div className="admin-row">
          <span>Triggers in: Wk {event.targetWeek}</span>
          <span>Event ID: {event.id}</span>
          <button onClick={() => forceTrigger(event)}>Force Now</button>
        </div>
      ))}
    </div>
  );
}
```

### The "Save State / Load State" Importer
To test deep late-game narrative branches (e.g., testing the 2008 Financial Crash event), the Admin Dashboard needs a JSON Dropzone. Seb can drop a master JSON file defining a "Late Game Billionaire State" into the dashboard, and the Zustand state instantly updates, allowing immediate narrative testing without playing for 3 hours.

---

## 3. How This Accelerates Development

By having this dashboard available early in V2:
1. **Branch Testing:** You can click a dialogue option, hit `~`, and instantly verify that the `DecisionLog` and `NPC Memory` correctly updated.
2. **Pacing Balance:** You can see if there are "too many" consequences stacked up for next week, preventing narrative overwhelming.
3. **No More Print Statements:** Instead of digging through console logs for `window.game.state`, the UI beautifully structures the current story context for immediate visual feedback. 
