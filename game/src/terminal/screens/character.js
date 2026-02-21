/**
 * src/terminal/screens/character.js
 * Extracted from screens.js during Phase 41 Refactoring.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, DIV, BLANK, RED, DIM, STAT } from './shared.js';
import { dashboardScreen } from './dashboard.js';

export function characterSelectScreen(ui) {
    const lines = [
        H('SELECT YOUR STARTING BACKGROUND'),
        DIV(),
        BLANK(),
        DIM('This choice determines your starting resources'),
        DIM('and initial network connections.'),
        BLANK(),
    ];

    const options = TerminalAPI.characters.map((char, index) => ({
        label: `${char.name} - ${char.tagline}`,
        action: () => {
            ui.pushScreen(characterDetailScreen(ui, char, index));
        }
    }));

    options.push({ label: 'Back to Title', action: () => ui.popScreen() });

    return { lines, options };
}

export function characterDetailScreen(ui, char, index) {
    const lines = [
        H(`PROFILE: ${char.name.toUpperCase()}`),
        DIV(),
        STAT('STARTING WEALTH', `$${char.startingCash.toLocaleString()}`, '#4a9e6a'),
        STAT('INITIAL REPUTATION', char.startingReputation, '#c9a84c'),
        STAT('STARTING BURN', char.startingBurnout, '#c94040'),
        BLANK(),
        H('BACKGROUND:'),
        ...char.description.map(line => DIM(line)),
        BLANK(),
        H('TRAITS:'),
        ...char.traits.map(t => DIM(`• ${t}`)),
        BLANK()
    ];

    return {
        lines,
        options: [
            {
                label: `START GAME AS ${char.name.toUpperCase()}`,
                action: () => {
                    TerminalAPI.initGame(char);

                    // Transition to Main Game / Dashboard
                    ui.clearHistory();
                    ui.replaceScreen(dashboardScreen(ui));

                    // Hide Title Scene canvas
                    if (window.phaserGame && window.phaserGame.canvas) {
                        window.phaserGame.canvas.style.display = 'none';
                    }
                    if (window.phaserGame) {
                        window.phaserGame.scene.stop('TitleScene');
                        window.phaserGame.scene.stop('CharacterSelectScene');
                    }
                }
            },
            {
                label: 'Choose Different Background',
                action: () => ui.popScreen()
            }
        ]
    };
}
