/**
 * GameEventBus.js — Singleton Phaser↔UI event bridge
 *
 * Inspired by pokemon-react-phaser's dispatch()/CustomEvent pattern.
 * Provides a centralized EventEmitter that decouples Phaser scenes
 * from the TerminalUI/DOM layer.
 *
 * Usage from Phaser:
 *   import { GameEventBus } from '../managers/GameEventBus.js';
 *   GameEventBus.emit('haggle:start', { dealerType: 'shark', artworkId: '...' });
 *
 * Usage from TerminalUI/DOM:
 *   import { GameEventBus } from './managers/GameEventBus.js';
 *   GameEventBus.on('overworld:warp', (data) => { ... });
 */
import Phaser from 'phaser';

// ── Singleton Event Emitter ──
export const GameEventBus = new Phaser.Events.EventEmitter();

// ── Event Name Constants ──
export const GameEvents = {
    // Overworld ↔ UI
    OVERWORLD_ENTER: 'overworld:enter',
    OVERWORLD_EXIT: 'overworld:exit',
    OVERWORLD_WARP: 'overworld:warp',

    // NPC interactions
    NPC_INTERACT: 'npc:interact',
    NPC_DIALOGUE_START: 'npc:dialogue:start',
    NPC_DIALOGUE_END: 'npc:dialogue:end',

    // Battle / Haggle
    HAGGLE_START: 'haggle:start',
    HAGGLE_END: 'haggle:end',

    // Dialogue
    DIALOGUE_START: 'dialogue:start',
    DIALOGUE_END: 'dialogue:end',

    // UI commands
    UI_SHOW: 'ui:show',
    UI_HIDE: 'ui:hide',
    UI_NOTIFICATION: 'ui:notification',
    UI_ROUTE: 'ui:route',

    // Player state
    PLAYER_POSITION_CHANGED: 'player:position:changed',
    PLAYER_MAP_CHANGED: 'player:map:changed',

    // Audio
    AUDIO_CLICK: 'audio:click',
    AUDIO_BGM_PLAY: 'audio:bgm:play',
    AUDIO_BGM_STOP: 'audio:bgm:stop',

    // UI toggles
    TOGGLE_DASHBOARD: 'ui:toggle:dashboard',
    UI_TOGGLE_OVERLAY: 'ui:toggle:overlay',

    // Game lifecycle
    GAME_OVER: 'game:over',

    // Debug & Admin
    DEBUG_LAUNCH_SCENE: 'debug:launch:scene',
};
