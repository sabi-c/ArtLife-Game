import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

/**
 * storylineStore.js
 *
 * Tracks active, pending, and completed storylines.
 * A storyline is a chain of events that fire sequentially over multiple weeks,
 * triggered by a player choice in an existing event.
 *
 * Schema for an active storyline entry:
 * {
 *   id: string,              // storyline ID from storylines.json
 *   currentStep: number,     // index into the storyline's steps array
 *   activatedWeek: number,   // week the storyline was activated
 *   nextFireWeek: number,    // the game week when the next step should fire
 *   stalled: boolean,        // true if requirements aren't met (waits until they are)
 * }
 */
export const useStorylineStore = create(
    persist(
        immer((set, get) => ({
            activeStorylines: [],
            completedStorylines: [],

            /**
             * Activate a storyline by ID.
             * Called when a player makes a choice that matches a triggerEventId + triggerChoiceIndex.
             * @param {string} storylineId
             * @param {number} currentWeek - the current game week
             * @param {object} storylineDef - the full storyline definition from storylines.json
             */
            activateStoryline: (storylineId, currentWeek, storylineDef) => set((state) => {
                // Don't activate duplicates or already-completed storylines
                if (state.activeStorylines.some(s => s.id === storylineId)) return;
                if (state.completedStorylines.includes(storylineId)) return;

                const firstStep = storylineDef.steps[0];
                if (!firstStep) return;

                state.activeStorylines.push({
                    id: storylineId,
                    currentStep: 0,
                    activatedWeek: currentWeek,
                    nextFireWeek: currentWeek + (firstStep.delayWeeks || 1),
                    stalled: false,
                });

                console.log(`[StorylineStore] Activated storyline: "${storylineDef.title}" (fires week ${currentWeek + (firstStep.delayWeeks || 1)})`);
            }),

            /**
             * Called every week tick by WeekEngine.
             * Returns an array of eventIds that should fire this week.
             * Advances or completes storylines as needed.
             * @param {number} currentWeek
             * @param {object} gameState - current player stats for requirement checks
             * @param {Array} storylineDefs - all storyline definitions from storylines.json
             * @returns {Array<{eventId: string, storylineId: string}>}
             */
            tickWeek: (currentWeek, gameState, storylineDefs) => {
                const eventsToFire = [];
                const state = get();

                for (const active of state.activeStorylines) {
                    if (active.nextFireWeek > currentWeek) continue;

                    const def = storylineDefs.find(s => s.id === active.id);
                    if (!def) continue;

                    const step = def.steps[active.currentStep];
                    if (!step) continue;

                    // Check requirements
                    const reqsMet = Object.entries(step.requirements || {}).every(
                        ([stat, val]) => (gameState[stat] || 0) >= val
                    );

                    if (!reqsMet) {
                        // Mark as stalled — will retry next week
                        set((s) => {
                            const entry = s.activeStorylines.find(a => a.id === active.id);
                            if (entry) entry.stalled = true;
                        });
                        continue;
                    }

                    eventsToFire.push({
                        eventId: step.eventId,
                        storylineId: active.id,
                    });

                    // Advance to next step or complete
                    const nextStepIndex = active.currentStep + 1;
                    if (nextStepIndex >= def.steps.length) {
                        // Storyline complete
                        set((s) => {
                            s.activeStorylines = s.activeStorylines.filter(a => a.id !== active.id);
                            s.completedStorylines.push(active.id);
                        });
                        console.log(`[StorylineStore] Completed storyline: "${def.title}"`);
                    } else {
                        const nextStep = def.steps[nextStepIndex];
                        set((s) => {
                            const entry = s.activeStorylines.find(a => a.id === active.id);
                            if (entry) {
                                entry.currentStep = nextStepIndex;
                                entry.nextFireWeek = currentWeek + (nextStep.delayWeeks || 1);
                                entry.stalled = false;
                            }
                        });
                    }
                }

                return eventsToFire;
            },

            /**
             * Force-activate a storyline for testing purposes (from the CMS).
             */
            forceActivate: (storylineId, storylineDef) => {
                const currentWeek = window._artLifeState?.week || 1;
                get().activateStoryline(storylineId, currentWeek, storylineDef);
            },

            /**
             * Get the status summary of all storylines for the CMS display.
             */
            getStatusSummary: () => {
                const state = get();
                return {
                    active: state.activeStorylines,
                    completed: state.completedStorylines,
                    totalActive: state.activeStorylines.length,
                    totalCompleted: state.completedStorylines.length,
                };
            },

            reset: () => set((state) => {
                state.activeStorylines = [];
                state.completedStorylines = [];
            }),
        })),
        {
            name: 'artlife-storyline-store',
            partialize: (state) => ({
                activeStorylines: state.activeStorylines,
                completedStorylines: state.completedStorylines,
            }),
        }
    )
);
