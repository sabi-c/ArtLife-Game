#!/usr/bin/env node
/**
 * test-cli.mjs — Headless game runner for autonomous testing
 * 
 * Usage:
 *   node test-cli.mjs                         # Interactive REPL
 *   node test-cli.mjs "press(1); read()"      # One-shot command sequence
 *   node test-cli.mjs press 1                  # Single command
 *   node test-cli.mjs read                     # Read current screen
 *   node test-cli.mjs state                    # Dump game state
 *   node test-cli.mjs advance 5               # Advance N weeks
 *   node test-cli.mjs start 0                 # Start with character index
 *   node test-cli.mjs auto                    # Run full automated playtest
 */

// ── Imports ──
import { GameState } from './src/managers/GameState.js';
import { MarketManager } from './src/managers/MarketManager.js';
import { EventManager } from './src/managers/EventManager.js';
import { PhoneManager } from './src/managers/PhoneManager.js';
import { ConsequenceScheduler } from './src/managers/ConsequenceScheduler.js';
import { DecisionLog } from './src/managers/DecisionLog.js';
import { CHARACTERS } from './src/data/characters.js';
import {
    characterSelectScreen, dashboardScreen, marketScreen, inspectScreen,
    portfolioScreen, listWorkScreen, phoneScreen, newsScreen, cityScreen,
    eventScreen, eventStepScreen, journalScreen
} from './src/terminal/screens.js';
import { EVENTS as ALL_EVENTS } from './src/data/events.js';

// ── Headless UI (mimics TerminalUI without DOM) ──
class HeadlessUI {
    constructor() {
        this.screenStack = [];
        this.options = [];
        this.selectedIndex = 0;
        this.onScreen = null;
        this.lastLines = [];
        this.lastOptions = [];
    }

    pushScreen(renderFn) {
        if (this.onScreen) this.screenStack.push(this.onScreen);
        this.onScreen = renderFn;
        this.selectedIndex = 0;
        this._render();
    }

    popScreen() {
        if (this.screenStack.length > 0) {
            this.onScreen = this.screenStack.pop();
            this.selectedIndex = 0;
            this._render();
        }
    }

    replaceScreen(renderFn) {
        this.onScreen = renderFn;
        this.selectedIndex = 0;
        this._render();
    }

    _render() {
        if (!this.onScreen) return;
        const { lines, options } = this.onScreen();
        this.lastLines = lines || [];
        this.lastOptions = options || [];
        this.options = this.lastOptions;
    }

    // ── Text extraction ──
    read() {
        this._render();
        const text = [];

        this.lastLines.forEach(line => {
            if (typeof line === 'string') {
                text.push(line);
            } else if (line.type === 'header') {
                text.push(`\x1b[1;33m${line.text}\x1b[0m`); // Bold gold
            } else if (line.type === 'subheader') {
                text.push(`\x1b[1m${line.text}\x1b[0m`); // Bold
            } else if (line.type === 'divider') {
                text.push('─'.repeat(50));
            } else if (line.type === 'blank') {
                text.push('');
            } else if (line.type === 'dim') {
                text.push(`\x1b[2m${line.text}\x1b[0m`); // Dim
            } else if (line.type === 'gold') {
                text.push(`\x1b[33m${line.text}\x1b[0m`); // Yellow
            } else if (line.type === 'green') {
                text.push(`\x1b[32m${line.text}\x1b[0m`); // Green
            } else if (line.type === 'red') {
                text.push(`\x1b[31m${line.text}\x1b[0m`); // Red
            } else if (line.type === 'stat') {
                const color = line.color === 'green' ? '\x1b[32m' : line.color === 'red' ? '\x1b[31m' : line.color === 'gold' ? '\x1b[33m' : '';
                const reset = color ? '\x1b[0m' : '';
                text.push(`  ${line.label}${' '.repeat(Math.max(1, 30 - line.label.length))}${color}${line.value}${reset}`);
            } else if (line.type === 'news') {
                text.push(`  📰 ${line.text}`);
            }
        });

        if (this.lastOptions.length > 0) {
            text.push('─'.repeat(50));
            this.lastOptions.forEach((opt, i) => {
                const disabled = opt.disabled ? ' \x1b[2m(locked)\x1b[0m' : '';
                text.push(`  [${i + 1}] ${opt.label}${disabled}`);
            });
        }

        return text.join('\n');
    }

    press(n) {
        this._render();
        const idx = n - 1;
        if (idx >= 0 && idx < this.options.length) {
            const opt = this.options[idx];
            if (opt && !opt.disabled && opt.action) {
                opt.action();
                return `Pressed [${n}]: ${opt.label}`;
            } else {
                return `Option [${n}] is disabled: ${opt?.label}`;
            }
        }
        return `Invalid option [${n}]. Available: 1-${this.options.length}`;
    }

    optionsList() {
        this._render();
        return this.lastOptions.map((o, i) => `[${i + 1}] ${o.label}${o.disabled ? ' (locked)' : ''}`).join('\n');
    }
}

// ── Game API (mirrors window.game) ──
const ui = new HeadlessUI();

const game = {
    ui,

    start() {
        ui.pushScreen(characterSelectScreen(ui));
        return `Started at Character Selection Screen`;
    },

    // Quick start for auto tests — bypasses character creation UI
    quickStart(charIdx = 0) {
        const char = CHARACTERS[charIdx];
        if (!char) return `Invalid character index.`;
        GameState.init(char);
        ui.pushScreen(dashboardScreen(ui));
        return `Quick-started as "${char.name}" ($${char.startingCash.toLocaleString()})`;
    },

    press(n) { return ui.press(n); },
    read() { return ui.read(); },
    options() { return ui.optionsList(); },
    back() { ui.popScreen(); return ui.read(); },

    state() {
        const s = GameState.state;
        return JSON.stringify({
            week: s.week,
            cash: s.cash,
            reputation: s.reputation,
            taste: s.taste,
            access: s.access,
            intel: s.intel,
            burnout: s.burnout,
            marketHeat: s.marketHeat,
            portfolio: s.portfolio.length,
            activeDeals: s.activeDeals.length,
            city: s.currentCity,
            marketState: s.marketState,
        }, null, 2);
    },

    advance(weeks = 1) {
        const results = [];
        for (let i = 0; i < weeks; i++) {
            GameState.advanceWeek();
            results.push(`Week ${GameState.state.week}`);
            // Check for events
            const event = EventManager.checkForEvent();
            if (event) {
                results.push(`  ⚡ Event: ${event.title || event.id}`);
            }
        }
        ui.replaceScreen(dashboardScreen(ui));
        return results.join('\n');
    },

    triggerEvent(eventId) {
        const event = ALL_EVENTS.find(e => e.id === eventId);
        if (!event) return `Event "${eventId}" not found.`;
        if (event.steps) {
            ui.pushScreen(eventStepScreen(ui, event, 0));
        } else {
            ui.pushScreen(eventScreen(ui, event));
        }
        return `Triggered: ${event.title} (${event.id})`;
    },

    // Full automated playtest
    auto() {
        const log = [];
        log.push(game.quickStart(0));
        log.push('--- Dashboard ---');
        log.push(game.read());

        // Buy first work
        log.push('\n--- Buy from Market ---');
        game.press(1); // market
        game.press(1); // inspect first
        log.push(game.press(1)); // buy
        log.push(game.read());

        // Check portfolio detail
        log.push('\n--- Portfolio Deep-Dive ---');
        game.press(2); // portfolio
        game.press(1); // first piece
        log.push(game.read());
        game.press(8); // back (last option)
        game.press(game.ui.lastOptions.length); // back

        // Advance and check phone
        log.push('\n--- Advance 3 Weeks ---');
        log.push(game.advance(3));
        log.push(game.read());

        // Check phone
        log.push('\n--- Phone ---');
        game.press(3); // phone
        log.push(game.read());

        // Check journal
        log.push('\n--- Journal ---');
        game.back(); // back to dashboard
        game.press(4); // journal
        log.push(game.read());

        log.push('\n--- Final State ---');
        log.push(game.state());

        return log.join('\n');
    }
};

// ── CLI Entry Point ──
const args = process.argv.slice(2);

if (args.length === 0) {
    // Interactive REPL
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    game.start();
    console.log(game.read());

    const prompt = () => {
        rl.question('\n> ', (input) => {
            const trimmed = input.trim();
            if (trimmed === 'quit' || trimmed === 'exit') {
                rl.close();
                process.exit(0);
            }

            try {
                // Parse commands
                if (trimmed.match(/^\d+$/)) {
                    console.log(game.press(parseInt(trimmed)));
                    console.log(game.read());
                } else if (trimmed === 'read' || trimmed === 'r') {
                    console.log(game.read());
                } else if (trimmed === 'state' || trimmed === 's') {
                    console.log(game.state());
                } else if (trimmed === 'options' || trimmed === 'o') {
                    console.log(game.options());
                } else if (trimmed === 'back' || trimmed === 'b') {
                    console.log(game.back());
                } else if (trimmed.startsWith('advance') || trimmed.startsWith('a ')) {
                    const n = parseInt(trimmed.split(/\s+/)[1]) || 1;
                    console.log(game.advance(n));
                    console.log(game.read());
                } else if (trimmed === 'auto') {
                    console.log(game.auto());
                } else {
                    // Try eval for complex commands
                    const result = eval(trimmed);
                    if (result !== undefined) console.log(result);
                }
            } catch (e) {
                console.error(`Error: ${e.message}`);
            }

            prompt();
        });
    };
    prompt();

} else if (args[0] === 'auto') {
    console.log(game.auto());

} else if (args[0] === 'start') {
    game.start();
    console.log(game.read());

} else if (args[0] === 'read') {
    game.start();
    console.log(game.read());

} else {
    // Join all args as a command sequence, e.g. "press 1; read"
    game.quickStart(0);
    const cmds = args.join(' ');

    try {
        // Simple command parsing
        const parts = cmds.split(';').map(s => s.trim()).filter(s => s);
        for (const cmd of parts) {
            if (cmd.startsWith('press ') || cmd.startsWith('p ')) {
                const n = parseInt(cmd.split(/\s+/)[1]);
                console.log(game.press(n));
            } else if (cmd === 'read' || cmd === 'r') {
                console.log(game.read());
            } else if (cmd === 'state' || cmd === 's') {
                console.log(game.state());
            } else if (cmd === 'options' || cmd === 'o') {
                console.log(game.options());
            } else if (cmd.startsWith('advance') || cmd.startsWith('a ')) {
                const n = parseInt(cmd.split(/\s+/)[1]) || 1;
                console.log(game.advance(n));
            } else if (cmd === 'auto') {
                console.log(game.auto());
            } else {
                const result = eval(cmd);
                if (result !== undefined) console.log(result);
            }
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}
