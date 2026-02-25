import { useGameStore } from '../stores/gameStore.js';
import { useCalendarStore } from '../stores/calendarStore.js';
import { useConsequenceStore } from '../stores/consequenceStore.js';
import { useMarketStore } from '../stores/marketStore.js';
import { useNPCStore } from '../stores/npcStore.js';
import { useInventoryStore } from '../stores/inventoryStore.js';

let isTicking = false;

export function executeWeekTick() {
    if (isTicking) {
        console.warn('[GameTick] Tick already in progress. Skipping.');
        return [];
    }

    isTicking = true;
    let triggeredEvents = [];

    try {
        // 1. Advance time
        try {
            useGameStore.getState().advanceWeek();
        } catch (e) {
            console.error('[GameTick] Time advancement failed:', e);
            return []; // Fatal error, must stop tick
        }

        const newTime = useGameStore.getState().getTime();

        // 2. Check calendar for triggered events
        try {
            triggeredEvents = useCalendarStore.getState().getTriggeredEvents(newTime.week, newTime.year);
        } catch (e) {
            console.error('[GameTick] Calendar check failed:', e);
        }

        // 3. Fire consequences from the ConsequenceStore
        try {
            const consequences = useConsequenceStore.getState().getTriggeredConsequences(newTime.week, newTime.year);
            // Execute consequences by removing them from store or dispatching events
            if (consequences.length > 0) {
                consequences.forEach(c => {
                    useConsequenceStore.getState().removeConsequence(c.id);
                    // TODO: trigger actual consequence logic
                });
                console.log(`[GameTick] Fired ${consequences.length} consequences.`);
            }
        } catch (e) {
            console.error('[GameTick] Consequence execution failed:', e);
        }

        // 4. Recalculate market prices
        try {
            useMarketStore.getState().recalculatePrices(newTime);
        } catch (e) {
            console.error('[GameTick] Market recalculation failed:', e);
        }

        // 5. Update NPC autonomous behaviors
        try {
            useNPCStore.getState().tickAutonomous(newTime);
        } catch (e) {
            console.error('[GameTick] NPC autonomous tick failed:', e);
        }

        // 6. Update item values based on new market
        try {
            useInventoryStore.getState().revalueAll();
        } catch (e) {
            console.error('[GameTick] Inventory revaluation failed:', e);
        }
    } finally {
        isTicking = false;
    }

    // 7. Return triggered events for the UI to render
    return triggeredEvents;
}
