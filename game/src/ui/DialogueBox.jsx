import React, { useEffect, useState } from 'react';
import { useUIStore } from '../stores/uiStore.js';

/**
 * DialogueBox — React overlay for MacDialogueScene.
 *
 * Subscribes to the Zustand store via useState + useEffect rather than the
 * Zustand hook wrapper (useUIStore(selector)), which internally calls
 * useCallback as an argument to useSyncExternalStore. In Vite's CJS-interop
 * bundle that causes "Cannot read properties of null (reading 'useCallback')"
 * because import_react.default resolves to null at hook-dispatch time.
 * Using direct store subscription sidesteps that entirely.
 */
export default function DialogueBox() {
    const [dialog, setDialog] = useState(() => useUIStore.getState().dialog);

    // Subscribe to store changes for the lifetime of this component
    useEffect(() => {
        const unsub = useUIStore.subscribe((state) => setDialog(state.dialog));
        return unsub;
    }, []);

    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    const currentStep = dialog.steps?.[dialog.currentStepIndex];

    // Typewriter effect
    useEffect(() => {
        if (!currentStep) return;
        setDisplayedText("");
        setIsTyping(true);

        const fullText = currentStep.text || "";
        let i = 0;
        const interval = setInterval(() => {
            setDisplayedText(fullText.slice(0, i + 1));
            i++;
            if (i >= fullText.length) {
                setIsTyping(false);
                clearInterval(interval);
            }
        }, 30);

        return () => clearInterval(interval);
    }, [currentStep]);

    // Keyboard listener for Spacebar to advance
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (isTyping) {
                    setIsTyping(false);
                    setDisplayedText(currentStep.text);
                } else {
                    useUIStore.getState().advanceDialogue();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isTyping, currentStep]);

    // Determine layout based on speaker side
    const isLeft = currentStep?.speakerSide === 'left';

    // Render nothing when dialog is closed (all hooks above must be unconditional)
    if (!dialog.isOpen) return null;

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-8 z-50">
            {/* Dark overlay backdrop for readability */}
            <div className="absolute inset-0 bg-black/30 w-full h-full -z-10 absolute pointer-events-none" />

            <div className="w-full max-w-4xl mx-auto flex gap-6 items-end relative pointer-events-auto">
                {/* Left Portrait */}
                {dialog.leftSprite && isLeft && (
                    <div className="w-32 h-32 bg-gray-900 border-2 border-white rounded shrink-0 flex items-center justify-center overflow-hidden">
                        <img src={`/sprites/${dialog.leftSprite}`} className="h-full object-contain pixelated" alt="Left Speaker" />
                    </div>
                )}
                {/* Empty spacer if right is speaking */}
                {dialog.leftSprite && !isLeft && <div className="w-32 shrink-0 opacity-0" />}

                {/* Text Box */}
                <div className="flex-1 bg-black border-4 border-white p-6 relative rounded-lg shadow-[8px_8px_0_0_#fff]">
                    {/* Name Tag */}
                    <div className="absolute -top-5 left-4 bg-white text-black px-4 py-1 font-bold border-2 border-black">
                        {currentStep?.name || "???"}
                    </div>

                    {/* The Text */}
                    <div className="font-mono text-xl text-white min-h-[5rem] leading-relaxed">
                        {displayedText}
                        {isTyping && <span className="animate-pulse">_</span>}
                    </div>

                    {/* Next Indicator */}
                    {!isTyping && (
                        <div className="absolute bottom-4 right-4 animate-bounce text-white">
                            ▼
                        </div>
                    )}
                </div>

                {/* Right Portrait */}
                {dialog.rightSprite && !isLeft && (
                    <div className="w-32 h-32 bg-gray-900 border-2 border-white rounded shrink-0 flex items-center justify-center overflow-hidden">
                        <img src={`/sprites/${dialog.rightSprite}`} className="h-full object-contain pixelated" alt="Right Speaker" />
                    </div>
                )}
                {/* Empty spacer if left is speaking */}
                {dialog.rightSprite && isLeft && <div className="w-32 shrink-0 opacity-0" />}
            </div>
        </div>
    );
}
