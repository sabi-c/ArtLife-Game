/**
 * src/terminal/screens/system.js
 * Extracted during Phase 41 Refactoring.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { GameState } from '../../managers/GameState.js';
import { ProfileManager } from '../../managers/ProfileManager.js';
import { PhoneManager } from '../../managers/PhoneManager.js';
import { ConsequenceScheduler } from '../../managers/ConsequenceScheduler.js';
import { DecisionLog } from '../../managers/DecisionLog.js';
import { H, SUB, DIV, DIM, GOLD, RED, GREEN, BLANK, STAT } from './shared.js';
import { characterSelectScreen } from './character.js';

// ════════════════════════════════════════════
// SCREEN: Save / Load Browser
// ════════════════════════════════════════════
export function saveLoadScreen(ui, mode = 'save') {
    return () => {
        const slots = TerminalAPI.initGame.getSaveSlots ? TerminalAPI.initGame.getSaveSlots() : [];
        const isSave = mode === 'save';

        const lines = [
            H(isSave ? 'SAVE GAME' : 'LOAD GAME'),
            DIM(isSave ? 'Select a slot to save your progress.' : 'Select a slot to load.'),
            DIV(),
        ];

        const filledSlots = slots.filter(s => s !== null);
        if (!isSave && filledSlots.length === 0) {
            lines.push(DIM('No saved games found.'));
        }

        const options = [];

        // Show all 5 slots for saving, or just filled slots for loading
        const maxSlots = 5;

        for (let i = 0; i < maxSlots; i++) {
            const slot = slots[i]; // null if empty, { meta, slotIndex } if filled

            if (slot && slot.meta) {
                const date = new Date(slot.meta.savedAt).toLocaleString();
                const weekStr = `Week ${slot.meta.week}`;
                const nameStr = slot.meta.characterName || 'Unknown';
                const cashStr = `$${(slot.meta.cash || 0).toLocaleString()}`;
                const label = `Slot ${i + 1}: ${nameStr} — ${weekStr} — ${cashStr} (${date})`;
                const capturedIdx = i;

                options.push({
                    label,
                    action: () => {
                        if (isSave) {
                            ui.pushScreen(saveConfirmScreen(ui, capturedIdx, slot.meta));
                        } else {
                            TerminalAPI.initGame.loadGame(capturedIdx);
                            ui.popScreen(); // close load screen
                            ui.popScreen(); // close pause menu if there
                        }
                    }
                });
            } else if (isSave) {
                const capturedIdx = i;
                options.push({
                    label: `Slot ${i + 1}: [ Empty ]`,
                    action: () => {
                        TerminalAPI.initGame.saveGame(capturedIdx);
                        ui.showNotification('Game saved successfully!', '💾');
                        ui.popScreen();
                    }
                });
            }
        }

        if (isSave && filledSlots.length > 0) {
            options.push({
                label: '🗑️ Delete a save',
                action: () => ui.pushScreen(deleteSlotScreen(ui))
            });
        }

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Save Overwrite Confirmation
// ════════════════════════════════════════════
function saveConfirmScreen(ui, slotIndex, existingMeta) {
    return () => {
        const lines = [
            H('OVERWRITE SAVE?'),
            DIV(),
            RED(`This will overwrite Slot ${slotIndex + 1}:`),
            DIM(`${existingMeta.characterName || 'Unknown'} — Week ${existingMeta.week}`),
            DIM(`Saved: ${new Date(existingMeta.savedAt).toLocaleString()}`),
            BLANK(),
            'Are you sure?'
        ];

        const options = [
            {
                label: 'Yes, overwrite',
                action: () => {
                    TerminalAPI.initGame.saveGame(slotIndex);
                    ui.showNotification('Game saved successfully!', '💾');
                    ui.popScreen();
                    ui.popScreen();
                }
            },
            { label: 'Cancel', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Delete Save Slot
// ════════════════════════════════════════════
function deleteSlotScreen(ui) {
    return () => {
        const slots = TerminalAPI.initGame.getSaveSlots ? TerminalAPI.initGame.getSaveSlots() : [];

        const lines = [
            H('DELETE SAVE'),
            DIM('Select a slot to permanently delete.'),
            DIV()
        ];

        const filledSlots = slots.filter(s => s !== null);
        if (filledSlots.length === 0) {
            lines.push(DIM('No saves to delete.'));
        }

        const options = slots.filter(s => s !== null).map(slot => {
            const date = new Date(slot.meta.savedAt).toLocaleString();
            return {
                label: `Delete Slot ${slot.slotIndex + 1}: ${slot.meta.characterName || 'Unknown'} (Week ${slot.meta.week})`,
                action: () => {
                    if (TerminalAPI.initGame.deleteSave) TerminalAPI.initGame.deleteSave(slot.slotIndex);
                    ui.showNotification(`Slot ${slot.slotIndex + 1} deleted.`, '');
                    ui.replaceScreen(deleteSlotScreen(ui));
                }
            };
        });

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Pause Menu
// ════════════════════════════════════════════
export function pauseMenuScreen(ui) {
    return () => {
        const lines = [
            H('SYSTEM MENU'),
            DIV(),
        ];

        // Ensure we load placeholder dynamically if not passed in directly 
        const _save = window._extracted?.saveLoadScreen || saveLoadScreen;
        const _settings = window._extracted?.settingsScreen || settingsScreen;

        const options = [
            {
                label: '💾 Save Game',
                action: () => ui.pushScreen(_save(ui, 'save'))
            },
            {
                label: '📂 Load Game',
                action: () => ui.pushScreen(_save(ui, 'load'))
            },
            {
                label: '⚙️ Settings',
                action: () => ui.pushScreen(_settings(ui))
            },
            {
                label: '⚠️ System Error Log',
                action: () => ui.pushScreen(errorLogScreen(ui))
            },
            {
                label: '🔄 Restart (New Character)',
                action: () => ui.pushScreen(restartConfirmScreen(ui))
            },
            {
                label: '🏠 Return to Title Screen',
                action: () => ui.pushScreen(returnToTitleConfirmScreen(ui))
            },
            {
                label: '🔄 Switch Agent',
                action: () => {
                    GameState.autoSave();
                    window.location.reload();
                }
            },
            {
                label: '🗑️ Delete Agent Profile',
                action: () => ui.pushScreen(deleteProfileScreen(ui))
            },
            { label: '← Resume Game', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Settings
// ════════════════════════════════════════════
export function settingsScreen(ui) {
    return () => {
        const s = TerminalAPI.state();
        if (!s.settings) s.settings = { textSpeed: 'normal', scanlines: true, crtFlicker: true };

        const lines = [
            H('⚙️ SETTINGS'),
            DIV()
        ];

        const toggleSpeed = () => {
            const speeds = ['slow', 'normal', 'fast', 'instant'];
            let idx = speeds.indexOf(s.settings.textSpeed) + 1;
            if (idx >= speeds.length) idx = 0;
            s.settings.textSpeed = speeds[idx];
            ui.replaceScreen(settingsScreen(ui));
        };

        const toggleScanlines = () => {
            s.settings.scanlines = !s.settings.scanlines;
            if (s.settings.scanlines) {
                document.body.classList.add('crt');
            } else {
                document.body.classList.remove('crt');
            }
            ui.replaceScreen(settingsScreen(ui));
        };

        const toggleFlicker = () => {
            s.settings.crtFlicker = !s.settings.crtFlicker;
            if (s.settings.crtFlicker) {
                document.body.style.animation = 'flicker 0.15s infinite';
            } else {
                document.body.style.animation = 'none';
            }
            ui.replaceScreen(settingsScreen(ui));
        };

        const options = [
            { label: `Text Speed: [${s.settings.textSpeed.toUpperCase()}]`, action: toggleSpeed },
            { label: `CRT Scanlines: [${s.settings.scanlines ? 'ON' : 'OFF'}]`, action: toggleScanlines },
            { label: `Screen Flicker: [${s.settings.crtFlicker ? 'ON' : 'OFF'}]`, action: toggleFlicker },
            { label: '← Back', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: System Error Log
// ════════════════════════════════════════════
export function errorLogScreen(ui) {
    return () => {
        const report = window.ArtLife?.report() || { errors: [], sceneErrors: [], missingAssets: [] };

        const lines = [
            H('⚠️ SYSTEM ERROR LOG'),
            DIV()
        ];

        const totalErrors = report.errors.length + report.sceneErrors.length + report.missingAssets.length;

        if (totalErrors === 0) {
            lines.push(GREEN('✓ System stable. No errors recorded in this session.'));
            lines.push(BLANK());
        } else {
            lines.push(RED(`Total anomalies detected: ${totalErrors}`));
            lines.push(DIM('Check browser dev console for full stack traces.'));
            lines.push(DIV());

            // App & Engine Errors
            if (report.errors.length > 0) {
                lines.push(SUB('ENGINE FAULTS'));
                report.errors.slice().reverse().slice(0, 5).forEach((err, i) => { // Show last 5
                    const time = new Date(err.t).toLocaleTimeString();
                    lines.push(`[${time}] ${err.context} — ${RED(err.msg)}`);
                });
                if (report.errors.length > 5) lines.push(DIM(`...and ${report.errors.length - 5} more.`));
                lines.push(BLANK());
            }

            // Scene Errors
            if (report.sceneErrors.length > 0) {
                lines.push(SUB('SCENE CRASHES'));
                report.sceneErrors.slice().reverse().slice(0, 5).forEach((err, i) => {
                    const time = new Date(err.t).toLocaleTimeString();
                    lines.push(`[${time}] Scene: ${err.sceneKey} — ${RED(err.msg)}`);
                });
                if (report.sceneErrors.length > 5) lines.push(DIM(`...and ${report.sceneErrors.length - 5} more.`));
                lines.push(BLANK());
            }

            // Missing Assets
            if (report.missingAssets.length > 0) {
                lines.push(SUB('MISSING ASSETS (404)'));
                report.missingAssets.slice().reverse().slice(0, 5).forEach((err, i) => {
                    lines.push(`Key: ${err.key} -> ${DIM(err.url)}`);
                });
                if (report.missingAssets.length > 5) lines.push(DIM(`...and ${report.missingAssets.length - 5} more.`));
                lines.push(BLANK());
            }
        }

        const options = [
            {
                label: 'Clear System Log',
                action: () => {
                    if (window.ArtLife?.clearErrors) {
                        window.ArtLife.clearErrors();
                        ui.replaceScreen(errorLogScreen(ui));
                    }
                },
                disabled: totalErrors === 0
            },
            { label: '← Back', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Restart Confirmation
// ════════════════════════════════════════════
function restartConfirmScreen(ui) {
    return () => {
        const lines = [
            H('RESTART GAME?'),
            DIV(),
            RED('This will abandon your current run.'),
            DIM('Your save files will NOT be deleted.'),
            DIM('You will return to character selection.'),
            BLANK(),
            'Are you sure?'
        ];

        const options = [
            {
                label: 'Yes, start over',
                action: () => {
                    GameState.state = null;
                    PhoneManager.reset();
                    ConsequenceScheduler.reset();
                    DecisionLog.reset();
                    ui.screenStack = [];
                    ui.replaceScreen(characterSelectScreen(ui));
                }
            },
            { label: 'Cancel', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Return to Title Confirmation
// ════════════════════════════════════════════
function returnToTitleConfirmScreen(ui) {
    return () => {
        const lines = [
            H('RETURN TO TITLE?'),
            DIV(),
            DIM('Your current progress will be auto-saved.'),
            DIM('You will return to the login screen.'),
            BLANK(),
            'Continue?'
        ];

        const options = [
            {
                label: 'Yes, save & return to title',
                action: () => {
                    GameState.autoSave();
                    window.location.reload();
                }
            },
            { label: 'Cancel', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Delete Agent Profile
// ════════════════════════════════════════════
function deleteProfileScreen(ui) {
    return () => {
        const activeProfile = ProfileManager.getActiveProfile();
        const lines = [
            H('DELETE AGENT PROFILE'),
            DIV(),
            RED('This will permanently delete your agent profile and ALL save data.'),
            BLANK(),
            activeProfile ? DIM(`Active profile: ${activeProfile.username}${activeProfile.isGuest ? ' (Guest)' : ''}`) : DIM('No active profile'),
            BLANK(),
            'Are you sure?'
        ];

        const options = [
            {
                label: 'Yes, delete my profile',
                action: () => {
                    if (activeProfile) {
                        ProfileManager.deleteProfile(activeProfile.id);
                        GameState.state = null;
                        window.location.reload();
                    }
                }
            },
            { label: 'Cancel — keep profile', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}
