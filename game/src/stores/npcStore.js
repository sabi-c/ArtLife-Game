import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

export const useNPCStore = create(
    persist(
        immer((set, get) => ({
            npcs: {}, // mapped by ID

            tickAutonomous: (time) => set((state) => {
                // To be implemented: NPC background schedules and decay
            }),

            adjustFavor: (npcId, amount) => set((state) => {
                if (state.npcs[npcId]) {
                    state.npcs[npcId].favor = Math.min(100, Math.max(-100, state.npcs[npcId].favor + amount));
                }
            }),

            logMemory: (npcId, topic, sentiment, details) => set((state) => {
                const npc = state.npcs[npcId];
                if (npc) {
                    if (!npc.memory) npc.memory = [];
                    npc.memory.push({
                        topic,
                        sentiment,
                        details,
                        timestamp: Date.now() // or game time offset
                    });
                }
            })
        })),
        { name: 'artlife-npc-store' }
    )
);
