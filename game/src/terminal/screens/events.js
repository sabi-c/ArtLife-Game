/**
 * src/terminal/screens/events.js
 * Extracted during Phase 41 Refactoring.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, SUB, DIV, DIM, GOLD, RED, GREEN, BLANK, SCENE_HEADER, PIXEL_ART, SCENE_TEXT, SCENE_SEP, DIALOGUE } from './shared.js';
import { dashboardScreen } from './dashboard.js';

// Predefined backgrounds per category
const CATEGORY_BACKGROUNDS = {
    'gossip': '/assets/backgrounds/bar_pixel.png',
    'deal': '/assets/backgrounds/office_pixel.png',
    'intel': '/assets/backgrounds/gallery_pixel.png',
    'scandal': '/assets/backgrounds/club_pixel.png',
    'personal': '/assets/backgrounds/apartment_pixel.png',
};

const CATEGORY_LOCATIONS = {
    'gossip': 'The Art Bar',
    'deal': 'Back Room',
    'intel': 'A Quiet Gallery',
    'scandal': 'Exclusive Party',
    'personal': 'Your Phone',
};

// ════════════════════════════════════════════
// SCREEN: Event (simple — description + choices)
// ════════════════════════════════════════════
export function eventScreen(ui, event) {
    return () => {
        const s = TerminalAPI.state();
        const bgSrc = CATEGORY_BACKGROUNDS[event.category];
        const locationLabel = CATEGORY_LOCATIONS[event.category] || 'Unknown';

        const lines = [
            SCENE_HEADER(event.title || 'Something happens...', locationLabel),
        ];

        if (bgSrc) lines.push(PIXEL_ART(bgSrc, event.title));

        lines.push(BLANK());
        lines.push(SCENE_TEXT(event.description || 'You face a decision.'));
        lines.push(BLANK());
        lines.push(SCENE_SEP());

        const options = (event.choices || []).map((choice, idx) => {
            let disabled = false;
            let reqText = '';
            if (choice.requires) {
                const checks = Object.entries(choice.requires).map(([stat, req]) => {
                    const min = typeof req === 'object' ? req.min : req;
                    const playerVal = s[stat] || 0;
                    const met = playerVal >= min;
                    return { stat, min, playerVal, met };
                });
                disabled = checks.some(c => !c.met);
                reqText = checks.map(c => `${c.stat} ${c.playerVal}/${c.min}`).join(', ');
            }

            let label = choice.label || choice.text;
            if (choice.isBlueOption) label = `★ ${label}`;
            if (reqText) label += ` [${reqText}]`;
            if (disabled) label += ' 🔒';

            return {
                label,
                disabled,
                action: () => {
                    if (ui.sceneTransition) ui.sceneTransition();
                    resolveEventChoice(ui, event, choice, idx);
                }
            };
        });

        if (options.length === 0) {
            options.push({
                label: 'Continue',
                action: () => {
                    TerminalAPI.advanceWeek();
                    ui.popScreen();
                    ui.replaceScreen(dashboardScreen(ui));
                }
            });
        }

        return { lines, options, animated: true };
    };
}

// ════════════════════════════════════════════
// SCREEN: Multi-step Event (narrative → dialogue → choice)
// ════════════════════════════════════════════
export function eventStepScreen(ui, event, stepIndex) {
    return () => {
        const step = event.steps[stepIndex];
        const isLast = stepIndex >= event.steps.length - 1;
        const bgSrc = CATEGORY_BACKGROUNDS[event.category];
        const locationLabel = CATEGORY_LOCATIONS[event.category] || '';

        const lines = [];

        if (stepIndex === 0) {
            lines.push(SCENE_HEADER(event.title || 'EVENT', locationLabel));
            if (bgSrc) lines.push(PIXEL_ART(bgSrc, event.title));
        } else {
            lines.push(H(event.title || 'EVENT'));
            lines.push(DIV());
        }

        if (step.type === 'narrative') {
            lines.push(BLANK());
            lines.push(SCENE_TEXT(step.text));
            lines.push(BLANK());

            return {
                lines,
                options: [{
                    label: isLast ? 'Continue...' : 'Continue →',
                    action: () => {
                        if (isLast) {
                            TerminalAPI.advanceWeek();
                            ui.popScreen();
                            ui.replaceScreen(dashboardScreen(ui));
                        } else {
                            if (ui.sceneTransition) ui.sceneTransition();
                            ui.replaceScreen(eventStepScreen(ui, event, stepIndex + 1));
                        }
                    }
                }],
                animated: true
            };
        }

        if (step.type === 'dialogue') {
            const speaker = step.speakerName || step.speaker || '???';
            lines.push(BLANK());
            lines.push(DIALOGUE(speaker, step.text));
            lines.push(BLANK());

            return {
                lines,
                options: [{
                    label: isLast ? 'Continue...' : 'Continue →',
                    action: () => {
                        if (isLast) {
                            TerminalAPI.advanceWeek();
                            ui.popScreen();
                            ui.replaceScreen(dashboardScreen(ui));
                        } else {
                            if (ui.sceneTransition) ui.sceneTransition();
                            ui.replaceScreen(eventStepScreen(ui, event, stepIndex + 1));
                        }
                    }
                }],
                animated: true
            };
        }

        if (step.type === 'choice') {
            if (step.text) {
                lines.push(SCENE_TEXT(step.text));
                lines.push(BLANK());
            }
            lines.push(SCENE_SEP());

            const s = TerminalAPI.state();
            const options = (step.choices || []).map((choice, idx) => {
                let disabled = false;
                let reqText = '';
                if (choice.requires) {
                    const checks = Object.entries(choice.requires).map(([stat, req]) => {
                        const min = typeof req === 'object' ? req.min : req;
                        const playerVal = s[stat] || 0;
                        const met = playerVal >= min;
                        return { stat, min, playerVal, met };
                    });
                    disabled = checks.some(c => !c.met);
                    reqText = checks.map(c => `${c.stat} ${c.playerVal}/${c.min}`).join(', ');
                }

                let label = choice.label || choice.text;
                if (choice.isBlueOption) label = `★ ${label}`;
                if (reqText) label += ` [${reqText}]`;
                if (disabled) label += ' 🔒';

                return {
                    label,
                    disabled,
                    isBlueOption: !!choice.isBlueOption,
                    action: () => {
                        if (ui.sceneTransition) ui.sceneTransition();
                        resolveEventChoice(ui, event, choice, idx);
                    }
                };
            });

            return { lines, options };
        }

        return {
            lines: [...lines, DIM('...')],
            options: [{
                label: 'Continue →',
                action: () => {
                    if (isLast) {
                        TerminalAPI.advanceWeek();
                        ui.popScreen();
                        ui.replaceScreen(dashboardScreen(ui));
                    } else {
                        ui.replaceScreen(eventStepScreen(ui, event, stepIndex + 1));
                    }
                }
            }]
        };
    };
}

// ════════════════════════════════════════════
// SCREEN: Event Outcome
// ════════════════════════════════════════════
function eventOutcomeScreen(ui, event, choice) {
    return () => {
        const lines = [
            H(event.title || 'OUTCOME'),
            DIV(),
            BLANK(),
            choice.outcome || 'The deed is done.',
            BLANK(),
        ];

        if (choice.effects) {
            const fx = choice.effects;
            if (fx.cash) lines.push(fx.cash > 0 ? GREEN(`+$${fx.cash.toLocaleString()}`) : RED(`-$${Math.abs(fx.cash).toLocaleString()}`));
            if (fx.reputation) lines.push(fx.reputation > 0 ? GREEN(`Reputation +${fx.reputation}`) : RED(`Reputation ${fx.reputation}`));
            if (fx.intel) lines.push(GREEN(`Intel +${fx.intel}`));
            if (fx.taste) lines.push(fx.taste > 0 ? GREEN(`Taste +${fx.taste}`) : RED(`Taste ${fx.taste}`));
            if (fx.access) lines.push(fx.access > 0 ? GREEN(`Access +${fx.access}`) : RED(`Access ${fx.access}`));
            if (fx.marketHeat) lines.push(fx.marketHeat > 0 ? RED(`Heat +${fx.marketHeat}`) : GREEN(`Heat ${fx.marketHeat}`));
            if (fx.burnout) lines.push(fx.burnout > 0 ? RED(`Burnout +${fx.burnout}`) : GREEN(`Burnout ${fx.burnout}`));
            lines.push(BLANK());
        }

        if (choice.nextSteps && choice.nextSteps.length > 0) {
            return {
                lines,
                options: [{
                    label: 'Continue →',
                    action: () => {
                        const branchEvent = {
                            ...event,
                            steps: choice.nextSteps,
                        };
                        ui.replaceScreen(eventStepScreen(ui, branchEvent, 0));
                    }
                }]
            };
        }

        return {
            lines,
            options: [{
                label: 'Continue →',
                action: () => {
                    TerminalAPI.advanceWeek();
                    TerminalAPI.initGame.autoSave?.();
                    ui.popScreen();
                    ui.replaceScreen(dashboardScreen(ui));
                }
            }],
            animated: true
        };
    };
}

// ════════════════════════════════════════════
// Helper: Resolve an event choice
// ════════════════════════════════════════════
function resolveEventChoice(ui, event, choice, choiceIndex) {
    if (choice.effects) {
        TerminalAPI.initGame.applyEffects?.(choice.effects);
    }

    if (choice.schedules) {
        choice.schedules.forEach(sched => {
            TerminalAPI.scheduler.addRelative(
                sched.weeksDelay,
                sched.type,
                sched.payload,
                { sourceEvent: event.id }
            );
        });
    }

    if (TerminalAPI.decisions.record) {
        TerminalAPI.decisions.record({
            eventId: event.id,
            eventTitle: event.title,
            choiceIndex,
            choiceLabel: choice.label || choice.text,
            effects: choice.effects || {},
            tags: choice.tags || [],
            isBlueOption: choice.isBlueOption || false,
        });
    }

    if (choice.newsText) {
        TerminalAPI.addNews(choice.newsText);
    }

    ui.replaceScreen(eventOutcomeScreen(ui, event, choice));
}

// ════════════════════════════════════════════
// SCREEN: Scene / Dialogue
// ════════════════════════════════════════════
export function sceneScreen(ui, sceneId) {
    // Assuming DialogueEngine is globally available since it's not strictly a manager
    const DialogueEngine = window.DialogueEngine;

    if (!DialogueEngine) {
        return () => ({
            lines: [RED(`Error: DialogueEngine not found.`)],
            options: [{ label: '← Back', action: () => ui.popScreen() }]
        });
    }

    if (!DialogueEngine.activeScene || DialogueEngine.activeScene.id !== sceneId) {
        const started = DialogueEngine.startScene(sceneId);
        if (!started) {
            return () => ({
                lines: [RED(`Error: Scene ${sceneId} failed to load.`)],
                options: [{ label: '← Back', action: () => ui.popScreen() }]
            });
        }
    }

    return () => {
        const node = DialogueEngine.getCurrentNode();
        if (!node) {
            return {
                lines: [RED(`Error: Scene ended unexpectedly.`)],
                options: [{ label: '← Continue', action: () => ui.popScreen() }]
            };
        }

        const lines = [
            H(`🎬 ${DialogueEngine.activeScene.title || 'Event'}`),
            DIV(),
        ];

        const text = typeof node.text === 'function' ? node.text(TerminalAPI.state()) : node.text;

        const paragraphs = text.split('\n');
        paragraphs.forEach(p => {
            if (p.trim()) lines.push(p.trim());
        });

        lines.push(DIV());

        const options = [];
        if (node.choices && node.choices.length > 0) {
            node.choices.forEach((choice, index) => {
                const canChoose = choice.condition ? choice.condition(TerminalAPI.state()) : true;
                if (canChoose) {
                    options.push({
                        label: choice.label,
                        action: () => {
                            const continues = DialogueEngine.makeChoice(index);
                            if (continues) {
                                ui.replaceScreen(sceneScreen(ui, sceneId));
                            } else {
                                ui.popScreen();
                            }
                        }
                    });
                } else if (choice.disabledLabel) {
                    options.push({
                        label: choice.disabledLabel,
                        disabled: true
                    });
                }
            });
        } else {
            options.push({
                label: 'Continue →',
                action: () => {
                    DialogueEngine.endScene();
                    ui.popScreen();
                }
            });
        }

        return { lines, options };
    };
}
