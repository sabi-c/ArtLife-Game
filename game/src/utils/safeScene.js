/**
 * safeScene.js — Error-wrapped scene transition utilities
 *
 * Wraps scene.start() and scene.launch() with try/catch and diagnostics.
 * If a scene fails to load, logs the error, records it for debug tools,
 * and falls back gracefully instead of hanging the game.
 *
 * Usage:
 *   import { safeSceneStart, safeSceneLaunch } from '../utils/safeScene.js';
 *   safeSceneStart(this, 'LocationScene', { mapId: 'gallery' });
 */

import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { VIEW } from '../constants/views.js';

/**
 * Safely start a scene, replacing the current one.
 * On error: logs, records diagnostic, emits UI_ROUTE to terminal.
 *
 * @param {Phaser.Scene} currentScene - The scene calling .start()
 * @param {string} sceneKey - Target scene key (use SCENE_KEYS constants)
 * @param {Object} [data] - Data to pass to the target scene
 */
export function safeSceneStart(currentScene, sceneKey, data) {
    try {
        if (!currentScene.scene.manager.keys[sceneKey]) {
            throw new Error(`Scene "${sceneKey}" is not registered in the scene manager`);
        }
        currentScene.scene.start(sceneKey, data);
    } catch (err) {
        _handleSceneError(currentScene, 'start', sceneKey, err);
    }
}

/**
 * Safely launch a scene (runs in parallel with the current one).
 * On error: logs, records diagnostic.
 *
 * @param {Phaser.Scene} currentScene - The scene calling .launch()
 * @param {string} sceneKey - Target scene key
 * @param {Object} [data] - Data to pass to the target scene
 */
export function safeSceneLaunch(currentScene, sceneKey, data) {
    try {
        if (!currentScene.scene.manager.keys[sceneKey]) {
            throw new Error(`Scene "${sceneKey}" is not registered in the scene manager`);
        }
        currentScene.scene.launch(sceneKey, data);
    } catch (err) {
        _handleSceneError(currentScene, 'launch', sceneKey, err);
    }
}

/**
 * Safely transition between scenes with a camera effect.
 *
 * @param {Phaser.Scene} currentScene
 * @param {string} sceneKey
 * @param {Object} [data]
 * @param {Object} [options] - { duration, sleep }
 */
export function safeSceneTransition(currentScene, sceneKey, data, options = {}) {
    try {
        if (!currentScene.scene.manager.keys[sceneKey]) {
            throw new Error(`Scene "${sceneKey}" is not registered in the scene manager`);
        }
        currentScene.scene.transition({
            target: sceneKey,
            data,
            duration: options.duration || 500,
            sleep: options.sleep ?? true,
        });
    } catch (err) {
        _handleSceneError(currentScene, 'transition', sceneKey, err);
    }
}

function _handleSceneError(currentScene, method, sceneKey, err) {
    console.error(`[safeScene] ${method}("${sceneKey}") failed:`, err.message);

    // Record for debug tools
    window.ArtLife?.recordSceneError?.(sceneKey, err);

    // Emit diagnostic event
    GameEventBus.emit(GameEvents.HUD_MESSAGE, {
        text: `Scene error: ${sceneKey}`,
        type: 'error',
        duration: 3000,
    });

    // Fallback: return to terminal view
    GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.TERMINAL);
}
