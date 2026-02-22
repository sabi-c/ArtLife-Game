/**
 * NPCManager.js
 * 
 * Manages the schedules and locations of NPCs in the overworld.
 * Dictates which map and what coordinates an NPC should exist at based on the 24-hour clock.
 */

export const NPCManager = {
    // Array of all NPCs and their daily schedules
    npcs: [
        {
            id: 'npc_elena',
            label: 'Elena Ross',
            tint: 0xff9999,
            speed: 2,
            dialogContent: 'Elena: "The gallery opens soon. Are you prepared?"',
            schedule: [
                // Weekdays: Stationary at the gallery entrance (assuming x: 10, y: 15)
                { map: 'pallet_town', days: [1, 2, 3, 4, 5], startHour: 8, endHour: 18, x: 10, y: 15, behavior: 'stationary' },
                // Weekends: Wandering the park
                { map: 'pallet_town', days: [6, 7], startHour: 10, endHour: 16, x: 15, y: 12, behavior: 'wandering' }
            ]
        },
        {
            id: 'npc_margaux',
            label: 'Margaux Villiers',
            tint: 0x99ccff,
            speed: 1.5,
            dialogContent: 'Margaux: "I only collect the finest post-internet trash."',
            schedule: [
                // Every day: Afternoon wandering
                { map: 'pallet_town', days: [1, 2, 3, 4, 5, 6, 7], startHour: 12, endHour: 23, x: 18, y: 5, behavior: 'wandering' }
            ]
        },
        {
            id: 'npc_julian',
            label: 'Julian Vance',
            tint: 0xccff99,
            speed: 2.5,
            dialogContent: 'Julian: "Wait until you see what I paid for this JPEG."',
            schedule: [
                // Weekend Evenings: Stationary flex
                { map: 'pallet_town', days: [5, 6, 7], startHour: 18, endHour: 24, x: 8, y: 8, behavior: 'stationary' }
            ]
        }
    ],

    /**
     * Get the active NPCs for a specific map at a specific date/time.
     * @param {string} mapId The key of the current tiled map
     * @param {number} dayOfWeek 1 (Mon) - 7 (Sun)
     * @param {number} hour 0-23
     * @returns {Array} List of npc configuration objects
     */
    getNPCsForMap(mapId, dayOfWeek, hour) {
        const activeNPCs = [];
        for (const npc of this.npcs) {
            const schedule = npc.schedule.find(s =>
                s.map === mapId &&
                s.days.includes(dayOfWeek) &&
                hour >= s.startHour && hour < s.endHour
            );

            if (schedule) {
                activeNPCs.push({
                    id: npc.id,
                    label: npc.label,
                    tint: npc.tint,
                    speed: npc.speed,
                    dialogContent: npc.dialogContent,
                    behavior: schedule.behavior,
                    startPosition: { x: schedule.x, y: schedule.y }
                });
            }
        }
        return activeNPCs;
    }
};
