import { useGameStore } from '../stores/gameStore.js';
import { usePhoneStore } from '../stores/phoneStore.js';

/**
 * Initializes the Systemic Lattice subscriptions.
 * These are side-effects that trigger automatically when specific state
 * thresholds are crossed across different domains, producing emergent behavior.
 * Call this once at application boot.
 */
export function initSystemicTriggers() {
    let unsubs = [];

    // 1. Legal Collapse (Informant Arc)
    unsubs.push(
        useGameStore.subscribe(
            (state) => state.antiStats.suspicion,
            (suspicion, previousSuspicion) => {
                if (suspicion >= 100 && previousSuspicion < 100) {
                    console.warn('⚡ SYSTEMIC EMERGENCE: Suspicion == 100. Legal Collapse triggered!');

                    usePhoneStore.getState().receiveMessage({
                        sender: 'Unknown',
                        subject: 'They know.',
                        body: 'Get out of the gallery now. The feds are coming. Do not pack anything.',
                        isUrgent: true
                    });

                    // TODO: triggerNarrativeArc('informant_arc')
                }
            }
        )
    );

    // 2. Mental Collapse (Auteur Arc)
    unsubs.push(
        useGameStore.subscribe(
            (state) => state.antiStats.burnout,
            (burnout, previousBurnout) => {
                if (burnout >= 100 && previousBurnout < 100) {
                    console.warn('⚡ SYSTEMIC EMERGENCE: Burnout == 100. Mental Collapse triggered!');

                    usePhoneStore.getState().receiveMessage({
                        sender: 'Dr. Aris',
                        subject: 'Missed Appointment',
                        body: 'You missed our last three sessions. The gallery called and said you locked the doors. Are you okay?',
                        isUrgent: false
                    });

                    // TODO: triggerNarrativeArc('auteur_arc')
                }
            }
        )
    );

    return () => {
        unsubs.forEach((unsub) => unsub());
    };
}
