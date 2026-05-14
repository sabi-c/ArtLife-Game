/**
 * scene-keys.js — Frozen string constants for all Phaser scene keys.
 * Use these instead of raw strings to prevent typos and enable IDE autocomplete.
 */
export const SCENE_KEYS = Object.freeze({
    BOOT: 'BootScene',
    TITLE: 'TitleScene',
    INTRO: 'IntroScene',
    // OVERWORLD + WORLD keys removed 2026-05-13. Source scenes archived to
    // src/scenes/_archived_2026_05_13/. Use NEW_WORLD instead.
    NEW_WORLD: 'NewWorldScene',
    CITY: 'CityScene',
    FAST_TRAVEL: 'FastTravelScene',
    LOCATION: 'LocationScene',
    HAGGLE: 'HaggleScene',
    DIALOGUE: 'DialogueScene',
    MAC_DIALOGUE: 'MacDialogueScene',
    MENU: 'MenuScene',
    CHARACTER_SELECT: 'CharacterSelectScene',
    END: 'EndScene',
});
