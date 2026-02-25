/**
 * src/terminal/screens/dashboard-venue.js
 * Venue exploration screens extracted from dashboard.js.
 *
 * Contains: venuePickerScreen, venueDetailScreen, roomExploreScreen,
 *           npcTalkScreen, terminalDialogueScreen
 *
 * These screens let the player visit venues, explore rooms, talk to NPCs,
 * and engage in dialogue — all within the terminal UI.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, SUB, DIV, BLANK, DIM, GOLD, RED, STAT } from './shared.js';
import { SettingsManager } from '../../../managers/SettingsManager.js';
import { MAX_ACTIONS, getActionsRemaining, hasActions, useAction } from './shared-helpers.js';

// ════════════════════════════════════════════
// SCREEN: Venue Picker
// ════════════════════════════════════════════
export function venuePickerScreen(ui) {
    return () => {
        const venues = TerminalAPI.venues;
        const s = TerminalAPI.state();
        const canAct = hasActions();
        const lines = [
            H('VISIT VENUE'),
            DIM('Choose where to spend your time. Each visit costs 1 action.'),
            STAT('Actions', Array(MAX_ACTIONS).fill(0).map((_, i) => i < getActionsRemaining() ? '■' : '□').join(' '), getActionsRemaining() === 0 ? 'red' : 'green'),
            DIV(),
        ];

        if (!canAct) {
            lines.push(RED('No actions remaining this week.'));
        }

        const options = [];
        venues.forEach(venue => {
            const canEnter = !venue.requires || TerminalAPI.gate.check(venue.requires);
            if (canEnter) {
                lines.push(`${venue.name}`);
                lines.push(DIM(`  ${venue.desc}`));
                if (venue.timeLimit) lines.push(DIM(`  Time budget: ${venue.timeLimit} moves`));
                options.push({
                    label: `→ ${venue.name}`,
                    disabled: !canAct,
                    action: canAct ? () => ui.pushScreen(venueDetailScreen(ui, venue)) : undefined,
                });
            } else {
                options.push({ label: `🔒 ${venue.name} (Access required)`, disabled: true });
            }
        });

        options.push({ label: '← Back', action: () => ui.popScreen() });
        return { lines, options };
    };
}

export function venueDetailScreen(ui, venue) {
    return () => {
        const s = TerminalAPI.state();
        // Initialize venue visit state
        if (!s._venueTime) s._venueTime = {};
        const timeLimit = venue.timeLimit || 5;
        const timeKey = `${venue.id}_${s.week}`;
        // Track time for this venue visit
        if (s._venueTime[timeKey] === undefined) {
            s._venueTime[timeKey] = timeLimit;
            useAction(`Arrived at ${venue.name}`);
        }
        const timeLeft = s._venueTime[timeKey];

        const startRoom = venue.rooms?.find(r => r.id === venue.startRoom) || venue.rooms?.[0];

        const lines = [
            H(venue.name),
            DIM(venue.desc),
            STAT('Time', `${'■'.repeat(timeLeft)}${'□'.repeat(Math.max(0, timeLimit - timeLeft))} ${timeLeft}/${timeLimit}`, timeLeft <= 1 ? 'red' : timeLeft <= 2 ? 'gold' : 'green'),
            DIV(),
        ];

        if (venue.rooms && venue.rooms.length > 0) {
            lines.push(SUB('AREAS'));
            venue.rooms.forEach(room => {
                const canEnter = !room.requires || TerminalAPI.gate.check(room.requires);
                const cost = room.timeCost || 0;
                const costLabel = cost > 0 ? ` (${cost} time)` : '';
                lines.push(DIM(`  ${canEnter ? '•' : '🔒'} ${room.name} — ${room.desc}${costLabel}`));
            });
            lines.push(BLANK());
        }

        const options = [];

        // Direct entry to start room
        if (startRoom && timeLeft > 0) {
            options.push({
                label: `📍 Enter: ${startRoom.name}`,
                action: () => ui.pushScreen(roomExploreScreen(ui, venue, startRoom, timeKey))
            });
        }

        if (window.game?.startTestScene) {
            options.push({
                label: `🎮 Explore in Visual Mode (LocationScene)`,
                action: () => {
                    ui.pushScreen(() => ({ lines: [DIM('Loading venue...')], options: [] }));
                    if (ui?.container) ui.container.style.display = 'none';
                    window.game.startTestScene('LocationScene', {
                        venueId: venue.id,
                        roomId: venue.startRoom,
                        ui,
                    });
                }
            });
        }

        // Show other rooms only if they're accessible from start
        venue.rooms?.filter(r => r !== startRoom).forEach(room => {
            const canEnter = !room.requires || TerminalAPI.gate.check(room.requires);
            const cost = room.timeCost || 0;
            if (canEnter && timeLeft >= cost) {
                options.push({
                    label: `📍 Go to: ${room.name}${cost > 0 ? ` (${cost} time)` : ''}`,
                    action: () => ui.pushScreen(roomExploreScreen(ui, venue, room, timeKey)),
                });
            } else if (!canEnter) {
                options.push({ label: `🔒 ${room.name} (locked)`, disabled: true });
            }
        });

        options.push({
            label: '← Leave Venue',
            action: () => {
                delete s._venueTime[timeKey]; // cleanup
                ui.popScreen();
            }
        });
        return { lines, options };
    };
}

export function roomExploreScreen(ui, venue, room, timeKey) {
    return () => {
        const s = TerminalAPI.state();
        if (!s.visitedRooms) s.visitedRooms = [];
        if (!s._venueTime) s._venueTime = {};

        // Deduct time cost for entering this room (if applicable)
        const cost = room.timeCost || 0;
        if (timeKey && cost > 0 && s._venueTime[timeKey] !== undefined) {
            s._venueTime[timeKey] = Math.max(0, s._venueTime[timeKey] - cost);
        }
        const timeLeft = timeKey ? (s._venueTime[timeKey] ?? 0) : 99;
        const timeLimit = venue.timeLimit || 5;

        const lines = [
            H(room.name),
            DIM(room.desc || ''),
        ];

        // Time display
        if (timeKey) {
            lines.push(STAT('Time', `${'■'.repeat(timeLeft)}${'□'.repeat(Math.max(0, timeLimit - timeLeft))} ${timeLeft}/${timeLimit}`, timeLeft <= 1 ? 'red' : timeLeft <= 2 ? 'gold' : 'green'));
        }
        lines.push(DIV());

        // ── onEnter: show text and apply effects on first visit ──
        if (room.onEnter) {
            const isFirstVisit = !s.visitedRooms.includes(room.id);
            const showOnEnter = room.onEnter.firstVisitOnly ? isFirstVisit : true;
            if (showOnEnter && room.onEnter.text) {
                lines.push({ text: room.onEnter.text, style: 'italic' });
                lines.push(BLANK());
            }
            if (isFirstVisit) {
                s.visitedRooms.push(room.id);
                if (room.onEnter.effects) {
                    TerminalAPI.applyEffects(room.onEnter.effects);
                }
            }
        }

        if (room.look) {
            const preview = room.look.split('\n')[0];
            lines.push(preview.length > 220 ? preview.substring(0, 220) + '…' : preview);
            lines.push(BLANK());
        }

        if (room.items && room.items.length > 0) {
            lines.push(SUB('OBJECTS'));
            room.items.forEach(item => {
                const canLook = !item.requires || TerminalAPI.gate.check(item.requires);
                lines.push(DIM(`  ${canLook ? '•' : '🔒'} ${item.name}`));
            });
        }

        if (room.characters && room.characters.length > 0) {
            lines.push(SUB('PEOPLE'));
            room.characters.forEach(c => {
                const contact = TerminalAPI.contacts.find(cd => cd.id === c.id);
                const canTalk = !c.requires || TerminalAPI.gate.check(c.requires);
                lines.push(DIM(`  ${canTalk ? '👤' : '🔒'} ${contact?.name || c.id}`));
            });
        }

        const options = [];

        // "Look around" — show full room description
        if (room.look) {
            options.push({
                label: `👁️ Look around`,
                action: () => {
                    ui.pushScreen(() => ({
                        lines: [
                            H(room.name), DIV(),
                            ...room.look.split('\n').map(l => l.trim() || BLANK()),
                        ],
                        options: [{ label: '← Back', action: () => ui.popScreen() }]
                    }));
                }
            });
        }

        room.items?.forEach(item => {
            const canLook = !item.requires || TerminalAPI.gate.check(item.requires);
            if (canLook) {
                options.push({
                    label: `Look: ${item.name}`,
                    action: () => {
                        const effectLines = [];
                        if (item.onLook) {
                            TerminalAPI.applyEffects(item.onLook);
                            Object.entries(item.onLook).forEach(([k, v]) => {
                                effectLines.push(GOLD(`  +${v} ${k}`));
                            });
                        }
                        ui.pushScreen(() => ({
                            lines: [
                                H(item.name), BLANK(),
                                item.desc,
                                ...(effectLines.length ? [DIV(), SUB('GAINED'), ...effectLines] : [])
                            ],
                            options: [{ label: '← Back', action: () => ui.popScreen() }]
                        }));
                    }
                });
            }
        });

        room.characters?.forEach(c => {
            const canTalk = !c.requires || TerminalAPI.gate.check(c.requires);
            const contact = TerminalAPI.contacts.find(cd => cd.id === c.id);
            if (canTalk) {
                options.push({
                    label: `Talk to ${contact?.name || c.id}`,
                    action: () => ui.pushScreen(npcTalkScreen(ui, c, contact, venue, timeKey))
                });
            }
        });

        room.eavesdrops?.forEach(eaves => {
            const canEavesdrop = !eaves.requires || TerminalAPI.gate.check(eaves.requires);
            const alreadyHeard = s.eventsTriggered?.includes(eaves.id);
            if (canEavesdrop && !alreadyHeard) {
                options.push({
                    label: `👂 ${eaves.desc}`,
                    action: () => {
                        if (eaves.effects) TerminalAPI.applyEffects(eaves.effects);
                        if (eaves.oneShot && s.eventsTriggered) s.eventsTriggered.push(eaves.id);
                        if (eaves.unlocks) {
                            if (!s.flags) s.flags = {};
                            s.flags[eaves.unlocks] = true;
                            TerminalAPI.addNews(`You overheard something about "${eaves.unlocks.replace(/_/g, ' ')}".`);
                        }
                        ui.pushScreen(() => ({
                            lines: [
                                H('OVERHEARD'), DIV(),
                                DIM(eaves.desc), BLANK(),
                                ...eaves.content.split('\n').map(l => l.trim()),
                            ],
                            options: [{ label: '← Back', action: () => ui.popScreen() }]
                        }));
                    }
                });
            }
        });

        // Room exits with time cost display
        if (timeLeft > 0) {
            room.exits?.forEach(exit => {
                const canExit = !exit.requires || TerminalAPI.gate.check(exit.requires);
                const destRoom = venue.rooms.find(r => r.id === exit.id);
                const exitCost = destRoom?.timeCost || 0;
                if (canExit && destRoom) {
                    if (timeLeft >= exitCost) {
                        options.push({
                            label: `→ ${exit.label}${exitCost > 0 ? ` (${exitCost} time)` : ''}`,
                            action: () => ui.replaceScreen(roomExploreScreen(ui, venue, destRoom, timeKey))
                        });
                    } else {
                        options.push({ label: `⏱️ ${exit.label} (not enough time)`, disabled: true });
                    }
                } else if (!canExit && exit.block) {
                    options.push({
                        label: `🔒 ${exit.label}`,
                        disabled: true,
                        action: () => {
                            ui.showNotification(exit.block, '🔒');
                        }
                    });
                }
            });
        } else {
            lines.push(RED('Time\'s up. You need to leave.'));
        }

        options.push({
            label: '← Leave Venue',
            action: () => {
                if (timeKey) delete s._venueTime[timeKey];
                ui.popScreen(); // back to venue detail
                ui.popScreen(); // back to dashboard
            }
        });
        return { lines, options };
    };
}

export function npcTalkScreen(ui, charData, contactData, venue, timeKey) {
    return () => {
        const s = TerminalAPI.state();
        const name = contactData?.name || charData.id;
        const trees = TerminalAPI.treesByNpc[charData.id] || [];

        // Mark NPC as met
        const contact = TerminalAPI.network.getContact(charData.id);
        if (contact && !contact.met) {
            contact.met = true;
            TerminalAPI.addNews(`Met ${name}.`);
        }

        const lines = [
            H(name),
            contactData ? DIM(contactData.title || contactData.role || '') : BLANK(),
            DIV(),
            DIM(charData.desc || ''),
            BLANK(),
        ];

        // Show favor level if contact exists
        if (contact) {
            const favorLabel = contact.favor >= 20 ? 'Friendly' : contact.favor >= 0 ? 'Neutral' : 'Cold';
            lines.push(STAT('Disposition', favorLabel, contact.favor >= 20 ? 'green' : contact.favor >= 0 ? '' : 'red'));
        }

        const options = [];

        if (trees.length > 0) {
            lines.push(SUB('TOPICS'));
            trees.forEach(tree => {
                options.push({
                    label: `💬 ${tree.title || tree.id}`,
                    action: () => {
                        const event = TerminalAPI.dialogue.convertTreeToEvent(tree);
                        const style = SettingsManager.get('dialogueStyle');

                        if (style === 'visual' && window.game?.startTestScene) {
                            // Push trap screen, hide terminal, launch dialogue
                            ui.pushScreen(() => ({ lines: [DIM('In conversation...')], options: [] }));
                            if (ui?.container) ui.container.style.display = 'none';
                            window.game.startTestScene('DialogueScene', { event, ui });
                        } else {
                            // Fallback: render dialogue as terminal screen
                            ui.pushScreen(terminalDialogueScreen(ui, event, name));
                        }
                    }
                });
            });
        }

        // Topic-based small talk (for NPCs without full dialogue trees)
        if (charData.topics && charData.topics.length > 0) {
            if (trees.length === 0) lines.push(SUB('TOPICS'));
            charData.topics.forEach(topic => {
                // Skip topics that already have a tree
                if (trees.some(t => t.id === topic)) return;
                options.push({
                    label: `💬 ${topic.replace(/_/g, ' ')}`,
                    action: () => {
                        const favorGain = 1 + Math.floor(Math.random() * 2);
                        TerminalAPI.network.adjustFavor(charData.id, favorGain);
                        TerminalAPI.addNews(`Discussed ${topic.replace(/_/g, ' ')} with ${name}.`);
                        if (contact) contact.memory = contact.memory || { witnessed: [], grudges: [], favors: [], lastContact: 0 };
                        if (contact?.memory) contact.memory.lastContact = s.week;
                        ui.showNotification(`"Interesting perspective on ${topic.replace(/_/g, ' ')}." (+${favorGain} favor)`, '💬');
                        ui.popScreen();
                    }
                });
            });
        }

        if (!trees.length && (!charData.topics || charData.topics.length === 0)) {
            options.push({
                label: `💬 Small talk`,
                action: () => {
                    TerminalAPI.addNews(`Exchanged pleasantries with ${name}.`);
                    ui.showNotification(`"Lovely to see you."`, '👤');
                    ui.popScreen();
                }
            });
        }

        // Exchange cards (networking action)
        if (contactData) {
            options.push({
                label: `📞 Exchange cards (+2 favor)`,
                action: () => {
                    TerminalAPI.network.adjustFavor(charData.id, 2);
                    TerminalAPI.addNews(`Exchanged cards with ${name}.`);
                    ui.showNotification(`"Let's stay in touch." (+2 favor)`, '📞');
                    ui.popScreen();
                }
            });
        }

        options.push({ label: '← Back', action: () => ui.popScreen() });
        return { lines, options };
    };
}

// Fallback terminal dialogue renderer (when Phaser scene unavailable)
export function terminalDialogueScreen(ui, event, npcName) {
    return () => {
        const step = event.steps?.[0] || event;
        const lines = [
            H(npcName || event.title || 'CONVERSATION'),
            DIV(),
            ...(step.text || event.description || '').split('\n').map(l => l.trim() || BLANK()),
            BLANK(),
        ];

        const options = (step.options || event.options || []).map(opt => ({
            label: opt.text || opt.label,
            action: () => {
                if (opt.effects) TerminalAPI.applyEffects(opt.effects);
                if (opt.nextStep && event.steps) {
                    const nextStep = event.steps.find(s => s.id === opt.nextStep);
                    if (nextStep) {
                        const nextEvent = { ...event, steps: event.steps, description: nextStep.text };
                        nextEvent.steps[0] = nextStep;
                        ui.replaceScreen(terminalDialogueScreen(ui, { ...event, steps: [nextStep, ...event.steps.filter(s => s.id !== nextStep.id)] }, npcName));
                        return;
                    }
                }
                TerminalAPI.addNews(`Finished conversation with ${npcName}.`);
                ui.popScreen();
            }
        }));

        if (options.length === 0) {
            options.push({
                label: '← End conversation',
                action: () => ui.popScreen()
            });
        }

        return { lines, options };
    };
}
