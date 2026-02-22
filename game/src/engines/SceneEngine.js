import { Story } from 'inkjs';
import { useGameStore } from '../stores/gameStore.js';
import { useInventoryStore } from '../stores/inventoryStore.js';

export class SceneEngine {
    constructor(inkJsonData) {
        try {
            this.story = new Story(inkJsonData);
            this.globalTags = this.story.globalTags || [];
            this._bindVariables();
        } catch (error) {
            console.error('[SceneEngine] Failed to initialize ink story:', error);
            this.story = null;
        }
    }

    /**
     * Advance the narrative until it hits a choice or the end.
     */
    continue() {
        if (!this.story) return { error: true, message: 'Story not loaded' };

        const lines = [];
        const tags = [];
        const stateTags = {};

        try {
            while (this.story.canContinue) {
                const text = this.story.Continue();
                if (text.trim()) {
                    lines.push(text.trim());
                }
                if (this.story.currentTags && this.story.currentTags.length > 0) {
                    tags.push(...this.story.currentTags);

                    this.story.currentTags.forEach(tag => {
                        const [key, ...valParts] = tag.split(':');
                        if (key && valParts.length > 0) {
                            const trimmedKey = key.trim();
                            const trimmedVal = valParts.join(':').trim();
                            stateTags[trimmedKey] = trimmedVal;

                            // Handle specific automated tags
                            if (trimmedKey === 'reward') {
                                useInventoryStore.getState().addItem({
                                    id: trimmedVal,
                                    name: trimmedVal.replace(/_/g, ' '),
                                    type: 'Scene Reward',
                                    acquiredAt: Date.now()
                                });
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error('[SceneEngine] Error during continue:', error);
            return { error: true, message: 'Scene crashed during playback.' };
        }

        const isEnd = !this.story.canContinue && this.story.currentChoices.length === 0;

        return {
            lines,
            tags,
            stateTags,
            choices: this.story.currentChoices.map(c => c.text),
            isEnd
        };
    }

    /**
     * Player selects a choice.
     */
    choose(choiceIndex) {
        if (!this.story) return { error: true };

        if (choiceIndex < 0 || choiceIndex >= this.story.currentChoices.length) {
            console.warn(`[SceneEngine] Invalid choice index: ${choiceIndex}`);
            return this.continue(); // default fallback
        }

        try {
            this.story.ChooseChoiceIndex(choiceIndex);
            return this.continue();
        } catch (error) {
            console.error('[SceneEngine] Failed to make choice:', error);
            return { error: true, message: 'Choice execution failed.' };
        }
    }

    /**
     * Jump to a specific knot (scene section).
     */
    goToKnot(knotName) {
        if (!this.story) return { error: true };

        try {
            this.story.ChoosePathString(knotName);
        } catch (e) {
            console.warn(`[SceneEngine] Knot "${knotName}" not found. Falling back to start.`);
            try {
                this.story.ChoosePathString('start');
            } catch (innerE) {
                console.error('[SceneEngine] Start knot also not found. Scene broken.');
                return { error: true, message: 'Invalid scene structure.' };
            }
        }
        return this.continue();
    }

    /**
     * Bidirectional variable sync with Zustand.
     */
    _bindVariables() {
        if (!this.story) return;

        // Push game state INTO ink
        const gameState = useGameStore.getState();
        try {
            if (this.story.HasVariableWithName !== undefined) {
                // If the inkjs version exposes HasVariableWithName on story or variablesState
                const checkVar = (name) => {
                    try {
                        return this.story.variablesState[name] !== undefined && this.story.variablesState[name] !== null;
                    } catch (e) {
                        return false;
                    }
                };
                if (checkVar('player_capital')) this.story.variablesState['player_capital'] = gameState.capital || 0;
                if (checkVar('player_audacity')) this.story.variablesState['player_audacity'] = gameState.stats?.audacity || 0;
                if (checkVar('player_taste')) this.story.variablesState['player_taste'] = gameState.stats?.taste || 0;
                if (checkVar('player_access')) this.story.variablesState['player_access'] = gameState.stats?.access || 0;
            } else {
                // Fallback safe assignment
                const safeAssign = (name, val) => {
                    try { this.story.variablesState[name] = val; } catch (e) { }
                };
                safeAssign('player_capital', gameState.capital || 0);
                safeAssign('player_audacity', gameState.stats?.audacity || 0);
                safeAssign('player_taste', gameState.stats?.taste || 0);
                safeAssign('player_access', gameState.stats?.access || 0);
            }
        } catch (error) {
            console.warn('[SceneEngine] Could not push initials to ink:', error);
        }

        // Observe ink variable changes and push BACK to Zustand
        // Use try-catch blocks to safely bind observables
        const bindings = {
            'player_capital': (v, val) => useGameStore.getState().setCapital(val),
            'player_audacity': (v, val) => useGameStore.getState().updateStat('audacity', val - (useGameStore.getState().stats?.audacity || 0)),
            'player_taste': (v, val) => useGameStore.getState().updateStat('taste', val - (useGameStore.getState().stats?.taste || 0)),
            'player_access': (v, val) => useGameStore.getState().updateStat('access', val - (useGameStore.getState().stats?.access || 0)),
            'suspicion': (v, val) => useGameStore.getState().updateAntiStat('suspicion', val - (useGameStore.getState().antiStats?.suspicion || 0)),
        };

        for (const [varName, callback] of Object.entries(bindings)) {
            try {
                // Ink throws if we observe a variable that isn't declared in the story
                if (this.story.variablesState[varName] !== undefined) {
                    this.story.ObserveVariable(varName, callback);
                }
            } catch (e) {
                // Safely ignore missing variables
            }
        }
    }

    saveState() {
        if (!this.story) return null;
        try {
            return this.story.state.toJson();
        } catch (e) {
            console.error('[SceneEngine] Save state failed', e);
            return null;
        }
    }

    loadState(json) {
        if (!this.story || !json) return;
        try {
            this.story.state.LoadJson(json);
        } catch (e) {
            console.error('[SceneEngine] Load state failed', e);
        }
    }

    destroy() {
        this.story = null;
    }
}
