/**
 * DialogueEngine.js
 * Parses and runs branching narrative scenes.
 */

import { GameState } from './GameState.js';

class DialogueEngineManager {
    constructor() {
        this.scenes = {};
        this.activeScene = null;
        this.currentNodeId = null;
    }

    /**
     * Register a new scene definition.
     * @param {Object} sceneDef - { id, title, nodes }
     */
    registerScene(sceneDef) {
        this.scenes[sceneDef.id] = sceneDef;
    }

    /**
     * Start a scene by ID.
     */
    startScene(sceneId) {
        if (!this.scenes[sceneId]) {
            console.error(`Scene ${sceneId} not found.`);
            return false;
        }
        this.activeScene = this.scenes[sceneId];
        this.currentNodeId = 'start'; // All scenes must have a 'start' node
        return true;
    }

    /**
     * Get the current node data.
     */
    getCurrentNode() {
        if (!this.activeScene || !this.currentNodeId) return null;
        return this.activeScene.nodes[this.currentNodeId] || null;
    }

    /**
     * Process a choice and move to the next node.
     * @param {number} choiceIndex 
     */
    makeChoice(choiceIndex) {
        const node = this.getCurrentNode();
        if (!node || !node.choices || !node.choices[choiceIndex]) return false;

        const choice = node.choices[choiceIndex];

        // Apply effects if any
        if (choice.effect) {
            choice.effect(GameState.state);
        }

        // Move to next node, or end scene if no 'next' is provided or next is 'end'
        if (!choice.next || choice.next === 'end') {
            this.endScene();
            return false; // Indicates scene is over
        } else {
            this.currentNodeId = choice.next;
            return true; // Indicates scene continues
        }
    }

    endScene() {
        this.activeScene = null;
        this.currentNodeId = null;
    }
}

export const DialogueEngine = new DialogueEngineManager();
