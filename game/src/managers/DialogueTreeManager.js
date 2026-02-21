/**
 * Helper to convert a branching Dialogue Tree from dialogue_trees.js
 * into the linear array of steps that DialogueScene expects.
 */

import { QualityGate } from './QualityGate.js';
import { GameState } from './GameState.js';

export class DialogueTreeManager {
    /**
     * Converts a dialogue tree into an event object for DialogueScene.
     *
     * Variant resolution: picks the first variant whose `requires` conditions
     * are satisfied by the current GameState (via QualityGate). Falls back to
     * the first variant if none pass, and to `node.text` if no variants exist.
     */
    static convertTreeToEvent(tree) {
        const stepKeys = Object.keys(tree.nodes);

        const steps = stepKeys.map(key => {
            const node = tree.nodes[key];

            // ── Resolve variant text with condition evaluation ──
            let text = node.text;
            if (!text && node.variants && node.variants.length > 0) {
                // Find first variant whose conditions are satisfied
                // Tree data uses `check` for variant conditions (topics use `requires`)
                const passing = node.variants.find(v => {
                    const cond = v.check || v.requires;
                    if (!cond) return true;
                    return QualityGate.check(cond);
                });
                text = passing ? passing.text : node.variants[0].text;
            }

            // ── Convert topics/choices to DialogueScene step format ──
            const choices = (node.topics || []).map(topic => {
                let nextStepIndex = stepKeys.indexOf(topic.next);
                if (topic.next === 'closing' || topic.next === null) {
                    nextStepIndex = 'end';
                }
                return {
                    label: topic.label,
                    requires: topic.requires,
                    effects: topic.effects,
                    npcEffects: topic.npcEffects,
                    isBlueOption: topic.isBlueOption,
                    triggerHaggle: topic.triggerHaggle,
                    schedules: topic.schedules,
                    nextStep: nextStepIndex,
                };
            });

            // Replace all underscores in speaker name (e.g. 'elena_ross' → 'Elena Ross')
            const speakerDisplay = node.speaker
                ? node.speaker.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                : '';

            return {
                id: key,
                type: 'choice',
                text,
                speaker: node.speaker,
                speakerName: speakerDisplay,
                choices,
                changes: node.effects,
            };
        });

        // Replace all underscores in npcId for the title display
        const npcDisplay = tree.npcId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        return {
            id: tree.id,
            category: 'conversation',
            title: `Talking to ${npcDisplay}`,
            steps,
        };
    }
}
