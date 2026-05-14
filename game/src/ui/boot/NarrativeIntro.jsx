/**
 * NarrativeIntro.jsx — Story Text Interstitial
 *
 * Typewriter text sequence on dark background:
 * - Lines appear one by one with typewriter effect
 * - Ends with "Click to continue"
 * - On click → transitions to Artnet Marketplace hub
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

const FONT = '"Press Start 2P", monospace';
const FONT_BODY = '"Playfair Display", "Georgia", serif';

const NARRATIVE_LINES = [
    '$67 million.',
    '',
    'That\'s what a Basquiat sold for last week at Christie\'s Evening Sale.',
    '',
    'You watched from your apartment on the Lower East Side,',
    'scrolling through the results on your cracked phone screen.',
    '',
    'You\'ve been trading prints at flea markets.',
    'Running errands for gallery owners who don\'t remember your name.',
    'Building a collection one painting at a time.',
    '',
    'But you know something they don\'t.',
    '',
    'The art world is about to change.',
    'And you\'re going to be at the center of it.',
];

// Timing per line (ms)
const LINE_DELAY = 120;      // delay between starting each line
const CHAR_DELAY = 30;       // typewriter speed per character
const BLANK_LINE_DELAY = 400; // extra pause for blank lines
const PROMPT_DELAY = 800;    // pause after last line before showing prompt

export default function NarrativeIntro({ onContinue }) {
    const [visibleLines, setVisibleLines] = useState([]);
    const [currentLineChars, setCurrentLineChars] = useState(0);
    const [activeLineIndex, setActiveLineIndex] = useState(0);
    const [showPrompt, setShowPrompt] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const containerRef = useRef(null);

    // Typewriter engine
    useEffect(() => {
        if (activeLineIndex >= NARRATIVE_LINES.length) {
            // All lines done
            const timer = setTimeout(() => setShowPrompt(true), PROMPT_DELAY);
            return () => clearTimeout(timer);
        }

        const currentLine = NARRATIVE_LINES[activeLineIndex];

        // Blank line = just add it and move on with extra delay
        if (currentLine === '') {
            const timer = setTimeout(() => {
                setVisibleLines(prev => [...prev, '']);
                setActiveLineIndex(prev => prev + 1);
            }, BLANK_LINE_DELAY);
            return () => clearTimeout(timer);
        }

        // Typewriter: add characters one at a time
        if (currentLineChars < currentLine.length) {
            const timer = setTimeout(() => {
                setCurrentLineChars(prev => prev + 1);
            }, CHAR_DELAY);
            return () => clearTimeout(timer);
        }

        // Line complete → commit it and start next line
        const timer = setTimeout(() => {
            setVisibleLines(prev => [...prev, currentLine]);
            setCurrentLineChars(0);
            setActiveLineIndex(prev => prev + 1);
        }, LINE_DELAY);
        return () => clearTimeout(timer);
    }, [activeLineIndex, currentLineChars]);

    // Auto-scroll container
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [visibleLines, currentLineChars]);

    const isMobile = typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const handleClick = useCallback(() => {
        if (!showPrompt) {
            // Skip ahead — show all lines immediately
            setVisibleLines([...NARRATIVE_LINES]);
            setActiveLineIndex(NARRATIVE_LINES.length);
            setCurrentLineChars(0);
            setShowPrompt(true);
            return;
        }
        if (dismissed) return;
        setDismissed(true);
        // Brief fade, then continue
        setTimeout(onContinue, 400);
    }, [showPrompt, dismissed, onContinue]);

    const currentPartial = activeLineIndex < NARRATIVE_LINES.length
        ? NARRATIVE_LINES[activeLineIndex].slice(0, currentLineChars)
        : '';

    return (
        <div
            onClick={handleClick}
            style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                background: '#0a0a0f',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', userSelect: 'none',
                opacity: dismissed ? 0 : 1,
                transition: 'opacity 0.4s ease-out',
            }}
        >
            <div
                ref={containerRef}
                style={{
                    maxWidth: 680, width: '90%',
                    maxHeight: '70vh',
                    overflow: 'auto',
                    padding: '40px 0',
                }}
            >
                {visibleLines.map((line, i) => (
                    <div
                        key={i}
                        style={{
                            fontFamily: line.startsWith('$') ? FONT : FONT_BODY,
                            fontSize: line.startsWith('$') ? 32 : 18,
                            color: line.startsWith('$') ? '#c9a84c' : '#c0bbb5',
                            lineHeight: line === '' ? '0.8' : '1.8',
                            minHeight: line === '' ? 16 : undefined,
                            opacity: line === '' ? 0 : 1,
                            fontWeight: line.startsWith('$') || line.startsWith('But') || line.startsWith('And') ? 700 : 400,
                            animation: 'narrative-fade-in 0.3s ease-out',
                        }}
                    >
                        {line}
                    </div>
                ))}

                {/* Currently typing line */}
                {currentPartial && (
                    <div style={{
                        fontFamily: currentPartial.startsWith('$') ? FONT : FONT_BODY,
                        fontSize: currentPartial.startsWith('$') ? 32 : 18,
                        color: currentPartial.startsWith('$') ? '#c9a84c' : '#c0bbb5',
                        lineHeight: '1.8',
                        fontWeight: currentPartial.startsWith('$') || currentPartial.startsWith('But') || currentPartial.startsWith('And') ? 700 : 400,
                    }}>
                        {currentPartial}
                        <span style={{
                            display: 'inline-block', width: 2, height: '1em',
                            background: '#c9a84c', marginLeft: 2,
                            animation: 'cursor-blink 0.7s step-end infinite',
                            verticalAlign: 'text-bottom',
                        }} />
                    </div>
                )}
            </div>

            {/* "Click to continue" prompt */}
            {showPrompt && !dismissed && (
                <div style={{
                    position: 'absolute', bottom: 60,
                    fontFamily: FONT,
                    fontSize: 11,
                    color: '#888',
                    letterSpacing: 2,
                    animation: 'narrative-pulse 2s ease-in-out infinite',
                }}>
                    {isMobile ? 'TAP TO CONTINUE' : 'CLICK TO CONTINUE'}
                </div>
            )}

            <style>{`
                @keyframes narrative-fade-in {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes narrative-pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 1; }
                }
                @keyframes cursor-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}
