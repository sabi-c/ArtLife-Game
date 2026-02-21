/**
 * src/terminal/screens/system.js
 * Extracted during Phase 41 Refactoring.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, SUB, DIV, DIM, GOLD, RED, GREEN, BLANK, STAT } from './shared.js';
import { characterSelectScreen } from './character.js';

// ════════════════════════════════════════════
// SCREEN: Options
// ════════════════════════════════════════════
export function optionsScreen(ui) {
    return () => {
        const s = TerminalAPI.state();
        const settings = s.settings || { textSpeed: 'normal' };

        const lines = [
            H('OPTIONS'),
            DIV(),
            STAT('Text Speed', settings.textSpeed.toUpperCase()),
            BLANK(),
            DIM('More options coming soon.')
        ];

        const options = [
            {
                label: `Toggle Text Speed (Current: ${settings.textSpeed})`,
                action: () => {
                    const speeds = ['slow', 'normal', 'fast', 'instant'];
                    let idx = speeds.indexOf(settings.textSpeed) + 1;
                    if (idx >= speeds.length) idx = 0;
                    settings.textSpeed = speeds[idx];
                    s.settings = settings;
                    ui.replaceScreen(optionsScreen(ui));
                }
            },
            { label: '← Back', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}

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
                label: '🔄 Restart (Abandon Run)',
                action: () => {
                    if (confirm("Are you sure? This will abandon your current run and return to character selection.")) {
                        TerminalAPI.initGame.startNewGame?.();
                        ui.replaceScreen(characterSelectScreen(ui));
                    }
                }
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
