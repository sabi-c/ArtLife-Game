/**
 * src/terminal/screens/shared.js
 * Extracted from screens.js during Phase 41 Refactoring.
 * Provides the core text-styling functions for the DOM TerminalUI.
 */

export function H(text) { return { text, style: 'header' }; }
export function SUB(text) { return { text, style: 'subheader' }; }
export function DIV() { return { text: '----------------------------------------', style: 'divider' }; }
export function BLANK() { return { text: '', style: 'normal' }; }
export function DIM(text) { return { text, style: 'dim' }; }
export function GOLD(text) { return { text, style: 'gold' }; }
export function GREEN(text) { return { text, style: 'green' }; }
export function RED(text) { return { text, style: 'red' }; }

export function STAT(label, value, color) {
    return {
        isStatRow: true,
        label,
        value,
        color
    };
}

export function NEWS(text) {
    return {
        text: `📰 ${text}`,
        style: 'news'
    };
}

// ── Scene & Cutscene Helpers (Agent-3) ──
export function SCENE_HEADER(title, location) {
    return { isSceneHeader: true, title, location };
}
export function SCENE_TEXT(text) {
    return { isSceneText: true, text };
}
export function DIALOGUE(speaker, text) {
    return { isDialogue: true, speaker, text };
}
export function SCENE_SEP() {
    return { text: ' ◇ ◇ ◇ ', style: 'scene-sep' };
}
export function PIXEL_ART(src, alt) {
    return { isPixelArt: true, src, alt };
}
export function SECTION(text) { return { text: `[ ${text} ]`, style: 'section' }; }

// World map line builder
export function WORLDMAP(title, rows, legend) {
    return { isWorldMap: true, title, rows, legend };
}

