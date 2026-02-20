/**
 * Helper to convert a branching Dialogue Tree from dialogue_trees.js 
 * into the linear array of steps that DialogueScene expects.
 */

export class DialogueTreeManager {
    /**
     * Converts a tree into an event object for DialogueScene
     */
    static convertTreeToEvent(tree) {
        const stepKeys = Object.keys(tree.nodes);

        // Map the dictionary of nodes to an array of steps
        const steps = stepKeys.map(key => {
            const node = tree.nodes[key];

            // Resolve text (might have variants, just pick the last one for now as default)
            let text = node.text;
            if (!text && node.variants) {
                // In a real implementation we check conditions. For MVP we take the last.
                text = node.variants[node.variants.length - 1].text;
            }

            // Convert topics/choices to use integer nextStep
            const choices = (node.topics || []).map(topic => {
                let nextStepIndex = stepKeys.indexOf(topic.next);
                if (topic.next === 'closing' || topic.next === null) {
                    nextStepIndex = 'end';
                }

                return {
                    label: topic.label,
                    requires: topic.requires,
                    effects: topic.effects,
                    isBlueOption: topic.isBlueOption,
                    nextStep: nextStepIndex
                };
            });

            return {
                id: key,
                type: 'choice', // Use choice type for branching
                text: text,
                speaker: node.speaker,
                speakerName: node.speaker ? node.speaker.replace('_', ' ').toUpperCase() : '',
                choices: choices,
                changes: node.effects // immediate stat changes upon reaching this node
            };
        });

        return {
            id: tree.id,
            category: 'conversation',
            title: `Talking to ${tree.npcId.replace('_', ' ').toUpperCase()}`,
            steps: steps
        };
    }
}
