import { create } from 'zustand';

/**
 * Global UI Store bridging Phaser 3 events to React DOM overlays.
 * Phaser scenes can import this and call `.getState().openDialogue()`
 * to pause the engine and render a React component on top.
 */
export const useUIStore = create((set) => ({
    dialog: {
        isOpen: false,
        callback: null, // Callback to fire when dialogue finishes
        steps: [],      // Array of dialogue lines [{ name, text, speakerSide }]
        currentStepIndex: 0,
        choices: null,  // Interactive buttons
        leftSprite: null, // Portrait key for left side
        rightSprite: null // Portrait key for right side
    },

    openDialogue: (payload) => set((state) => ({
        dialog: {
            isOpen: true,
            callback: payload.callback,
            steps: payload.steps || [],
            currentStepIndex: 0,
            choices: payload.choices || null,
            leftSprite: payload.leftSprite || null,
            rightSprite: payload.rightSprite || null
        }
    })),

    advanceDialogue: () => set((state) => {
        const nextIndex = state.dialog.currentStepIndex + 1;
        if (nextIndex >= state.dialog.steps.length) {
            // End of dialogue
            if (state.dialog.callback) state.dialog.callback();
            return {
                dialog: {
                    ...state.dialog,
                    isOpen: false,
                    callback: null,
                }
            };
        }
        return {
            dialog: {
                ...state.dialog,
                currentStepIndex: nextIndex
            }
        };
    }),

    closeDialogue: () => set((state) => ({
        dialog: {
            ...state.dialog,
            isOpen: false,
            callback: null
        }
    }))
}));
