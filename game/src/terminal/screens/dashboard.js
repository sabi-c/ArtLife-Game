/**
 * src/terminal/screens/dashboard.js
 * Extracted during Phase 41 Refactoring.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, SUB, DIV, BLANK, DIM, GOLD, GREEN, RED, STAT, NEWS, WORLDMAP } from './shared.js';
import { TickerSystem } from '../../ui/TickerSystem.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { characterSelectScreen } from './character.js';
import { marketScreen, portfolioScreen } from './market.js';
import { phoneScreen } from './phone.js';
import { cityScreen, newsScreen } from './world.js';
import { eventScreen, eventStepScreen } from './events.js';
import { journalScreen, legacyEndScreen } from './journal.js';
import { pauseMenuScreen } from './system.js';
import { SettingsManager } from '../../managers/SettingsManager.js';
import { getUpcomingEvents } from '../../data/calendar_events.js';

// ════════════════════════════════════════════
// SCREEN: Venue Picker
// ════════════════════════════════════════════
function venuePickerScreen(ui) {
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

function venueDetailScreen(ui, venue) {
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
                    ui.container.style.display = 'none';
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

function roomExploreScreen(ui, venue, room, timeKey) {
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

function npcTalkScreen(ui, charData, contactData, venue, timeKey) {
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
                            ui.container.style.display = 'none';
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
function terminalDialogueScreen(ui, event, npcName) {
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


// ════════════════════════════════════════════
// Action Budget System
// ════════════════════════════════════════════
export const MAX_ACTIONS = 4;

export function getActionsRemaining() {
    return MAX_ACTIONS - (TerminalAPI.state().actionsThisWeek || 0);
}

export function useAction(label, cost = 1) {
    if (!TerminalAPI.state().actionsThisWeek) TerminalAPI.state().actionsThisWeek = 0;
    TerminalAPI.state().actionsThisWeek += cost;
    TerminalAPI.addNews(`⏱️ ${label} (${getActionsRemaining()} AP left)`);
    // Auto-checkpoint after every action
    TerminalAPI.initGame.autoSave?.();
    return true;
}

export function hasActions(cost = 1) {
    return getActionsRemaining() >= cost;
}

// ════════════════════════════════════════════
// Dashboard Helpers
// ════════════════════════════════════════════

const SPARK_CHARS = '▁▂▃▄▅▆▇█';

function sparkline(values, width = 12) {
    if (!values || values.length === 0) return SPARK_CHARS[0].repeat(width);
    const nums = values.slice(-width);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;
    return nums.map(v => SPARK_CHARS[Math.round(((v - min) / range) * 7)]).join('');
}

function statBarHtml(label, value, max, color) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return `<div class="db-stat-bar">`
        + `<span class="db-stat-label">${label}</span>`
        + `<div class="db-stat-track"><div class="db-stat-fill" style="width:${pct}%;background:${color}"></div></div>`
        + `<span class="db-stat-val">${value}</span>`
        + `</div>`;
}

const FLAVOR_NEWS_POOL = {
    bull: [
        'BULL MARKET: Collectors panic-buying at fairs',
        'Art indices up 12% this quarter — speculation rampant',
        'Mega-galleries reporting record sales',
    ],
    bear: [
        'BEAR MARKET: Auction estimates slashed across the board',
        'Gallery closures accelerate as buyers retreat',
        'Secondary market prices softening — hold or sell?',
    ],
    flat: [
        'FLAT MARKET: Sideways trading, no clear momentum',
        'Collectors cautious — "wait and see" sentiment dominates',
        'Mid-market works holding steady while blue-chip stalls',
    ],
};

const CITY_FLAVOR = {
    'new-york': 'NEW YORK: Chelsea openings draw record crowds',
    'london': 'LONDON: Frieze week buzz building early',
    'paris': 'PARIS: Palais de Tokyo announces surprise group show',
    'berlin': 'BERLIN: Kreuzberg studios open for Rundgang',
    'hong-kong': 'HONG KONG: Art Basel HK announces expanded sector',
    'miami': 'MIAMI: Wynwood walls refresh draws collectors south',
    'los-angeles': 'LOS ANGELES: Hauser & Wirth expanding downtown',
    'switzerland': 'BASEL: Art Basel prep underway — hotel prices soaring',
};

function generateFlavorNews(s) {
    const items = [];
    // Market-condition flavor
    const pool = FLAVOR_NEWS_POOL[s.marketState] || FLAVOR_NEWS_POOL.flat;
    items.push(pool[s.week % pool.length]);
    // City-specific
    if (CITY_FLAVOR[s.currentCity]) items.push(CITY_FLAVOR[s.currentCity]);
    // Stat-gated hints
    if (s.reputation >= 60) items.push('BUZZ: Your name is circulating in collector circles');
    else if (s.marketHeat > 30) items.push('HEAT: Galleries are watching your flip patterns');
    // Mix with real news
    if (s.newsFeed && s.newsFeed.length > 0) {
        const latest = s.newsFeed.slice(-2).reverse();
        latest.forEach(n => items.push(typeof n === 'string' ? n : n.text));
    }
    return items.slice(0, 4);
}

// ════════════════════════════════════════════
// Action Budget Panel (raw HTML)
// ════════════════════════════════════════════
function actionBudgetPanelHtml(actionsLeft, maxActions, weekLabel) {
    const pips = Array.from({ length: maxActions }, (_, i) =>
        `<span class="db-action-pip ${i < actionsLeft ? 'filled' : 'spent'}"></span>`
    ).join('');

    const statusClass = actionsLeft === 0 ? 'exhausted' : actionsLeft <= 1 ? 'low' : 'ok';
    const statusText = actionsLeft === 0
        ? 'ALL ACTIONS SPENT'
        : `${actionsLeft} AP REMAINING`;

    const cta = actionsLeft === 0
        ? `<div class="db-action-cta">WEEK COMPLETE — ADVANCE WEEK →</div>`
        : '';

    return `<div class="db-action-panel${actionsLeft === 0 ? ' exhausted' : ''}">`
        + `<div class="db-action-header"><span>ACTION POINTS</span><span class="db-action-week">${weekLabel}</span></div>`
        + `<div class="db-action-pips">${pips}</div>`
        + `<div class="db-action-status ${statusClass}">${statusText}</div>`
        + cta
        + `</div>`;
}

// ════════════════════════════════════════════
// Calendar Strip (raw HTML)
// ════════════════════════════════════════════
const CAL_ICONS = { fair: '◈', auction: '◆', biennale: '★', market: '▸', social: '●', exhibition: '○' };

function calendarStripHtml(currentWeek, month, year) {
    const events = getUpcomingEvents(currentWeek, 8);

    const thisWeek = events.filter(e => e.weeksAway === 0);
    const upcoming = events.filter(e => e.weeksAway > 0).slice(0, 3);

    const eventRow = (ev) => {
        const icon = CAL_ICONS[ev.type] || '▸';
        const iconClass = ev.tier === 1 ? 'gold' : 'dim';
        const distClass = ev.weeksAway === 0 ? 'now' : ev.weeksAway <= 2 ? 'soon' : 'future';
        const distLabel = ev.weeksAway === 0 ? 'NOW' : `${ev.weeksAway}w`;
        return `<div class="db-cal-event">`
            + `<span class="db-cal-icon ${iconClass}">${icon}</span>`
            + `<span class="db-cal-name">${ev.name}</span>`
            + `<span class="db-cal-loc">${ev.location}</span>`
            + `<span class="db-cal-dist ${distClass}">${distLabel}</span>`
            + `</div>`;
    };

    let html = `<div class="db-cal-panel">`;
    html += `<div class="db-panel-header">CALENDAR · ${month} ${year}</div>`;

    if (thisWeek.length > 0) {
        html += `<div class="db-cal-section-label">THIS WEEK</div>`;
        thisWeek.forEach(ev => { html += eventRow(ev); });
    }

    if (upcoming.length > 0) {
        html += `<div class="db-cal-section-label">COMING UP</div>`;
        upcoming.forEach(ev => { html += eventRow(ev); });
    }

    if (thisWeek.length === 0 && upcoming.length === 0) {
        html += `<div class="db-cal-event"><span class="db-cal-name" style="color:var(--dim)">No events on the horizon</span></div>`;
    }

    html += `</div>`;
    return html;
}

// ════════════════════════════════════════════
// World Map Helper
// ════════════════════════════════════════════
const CITY_NAMES = {
    'new-york': 'New York', 'london': 'London', 'paris': 'Paris',
    'hong-kong': 'Hong Kong', 'switzerland': 'Switzerland',
    'los-angeles': 'Los Angeles', 'miami': 'Miami', 'berlin': 'Berlin'
};

// Map event locations to city IDs
const LOCATION_TO_CITY = {
    'New York': 'new-york', 'London': 'london', 'Paris': 'paris',
    'Berlin': 'berlin', 'Hong Kong': 'hong-kong', 'Miami': 'miami',
    'Los Angeles': 'los-angeles', 'Basel': 'switzerland', 'Maastricht': 'switzerland',
    'Venice': 'paris', 'Dubai': 'hong-kong', 'São Paulo': 'miami',
    'Madrid': 'paris', 'Hamptons': 'new-york', 'St. Barts': 'miami',
};
const EVENT_ICONS = { fair: '◈', auction: '◆', biennale: '★', market: '▸', social: '●', exhibition: '○' };

function generateWorldMap(currentWeek) {
    const s = TerminalAPI.state();
    const currentCity = s.currentCity || 'new-york';
    const currentCityName = CITY_NAMES[currentCity] || currentCity;

    // Gather events and group by city
    const events = getUpcomingEvents(currentWeek, 4);
    const eventsByCity = {};
    events.forEach(e => {
        const cityId = LOCATION_TO_CITY[e.location];
        if (cityId) {
            if (!eventsByCity[cityId]) eventsByCity[cityId] = [];
            eventsByCity[cityId].push(e);
        }
    });

    const cityMarker = (cityId, name) => {
        const eventIcons = (eventsByCity[cityId] || [])
            .map(e => `<span class="wm-event-marker">${EVENT_ICONS[e.type] || '▸'}</span>`)
            .join('');
        if (cityId === currentCity) {
            return `<span class="wm-city-link wm-current" data-city="${cityId}">★ ${name}</span>${eventIcons}`;
        } else {
            return `<span class="wm-city-link wm-city" data-city="${cityId}">○ ${name}</span>${eventIcons}`;
        }
    };

    const rows = [
        `  ${cityMarker('london', 'London')}       ${cityMarker('berlin', 'Berlin')}`,
        ``,
        `  ${cityMarker('new-york', 'New York')}     ${cityMarker('paris', 'Paris')}     ${cityMarker('hong-kong', 'Hong Kong')}`,
        `                          ${cityMarker('switzerland', 'Switzerland')}`,
        ``,
        `  ${cityMarker('miami', 'Miami')}         ${cityMarker('los-angeles', 'Los Angeles')}`,
    ];

    return WORLDMAP(
        `WORLD MAP · ${currentCityName.toUpperCase()}`,
        rows,
        '★ You are here  ○ City  ◈ Fair  ◆ Auction  ● Event'
    );
}

// ════════════════════════════════════════════
// SCREEN: Weekly Report (post-advance notification)
// ════════════════════════════════════════════
function weekReportScreen(ui) {
    return () => {
        const report = TerminalAPI.getLastWeekReport();
        const s = TerminalAPI.state();
        if (!report) {
            return {
                lines: [H('WEEK REPORT'), DIM('No report data available.')],
                options: [{ label: '→ Continue', action: () => ui.replaceScreen(dashboardScreen(ui)) }]
            };
        }

        const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Math.floor((report.week - 1) / 4) % 12];
        const year = 2024 + Math.floor((report.week - 1) / 52);

        const lines = [];

        // ── Header ──
        lines.push(H(`WEEK ${report.week} REPORT`));
        lines.push(DIM(`${month} ${year}`));
        lines.push(DIV());

        // ── Forced Rest ──
        if (report.forcedRest) {
            lines.push({
                type: 'raw', text: `<div class="db-panel"><div class="db-panel-header">⚠ FORCED REST</div>`
                    + `<div class="db-news-item">Burnout forced you to rest this week. Take it easy.</div>`
                    + `</div>`
            });
            lines.push(BLANK());
            return {
                lines,
                options: [{ label: '→ Continue to Dashboard', action: () => ui.replaceScreen(dashboardScreen(ui)) }]
            };
        }

        // ── Financial Summary ──
        const cashSign = report.cashDelta >= 0 ? '+' : '';
        const portSign = report.portfolioDelta >= 0 ? '+' : '';
        const cashColor = report.cashDelta >= 0 ? 'green' : 'red';
        const portColor = report.portfolioDelta >= 0 ? 'green' : 'red';

        lines.push({
            type: 'raw', text: `<div class="db-panel"><div class="db-panel-header">FINANCIAL SUMMARY</div>`
                + `<div class="db-fin-grid">`
                + `<span class="db-fin-label">Cash Change</span><span class="db-fin-value ${cashColor}">${cashSign}$${Math.abs(report.cashDelta).toLocaleString()}</span>`
                + `<span class="db-fin-label">Portfolio Change</span><span class="db-fin-value ${portColor}">${portSign}$${Math.abs(report.portfolioDelta).toLocaleString()}</span>`
                + `<span class="db-fin-label">Net Worth</span><span class="db-fin-value gold">$${(report.netWorth || 0).toLocaleString()}</span>`
                + `</div></div>`
        });

        // ── Market Conditions ──
        if (report.marketChanged) {
            const dotClass = report.marketState === 'bull' ? 'bull' : report.marketState === 'bear' ? 'bear' : 'stable';
            lines.push({
                type: 'raw', text: `<div class="db-panel"><div class="db-panel-header">MARKET SHIFT</div>`
                    + `<div class="db-news-item"><span class="db-dot ${dotClass}"></span> `
                    + `Market moved from <strong>${(report.prevMarketState || '').toUpperCase()}</strong> → <strong>${report.marketState.toUpperCase()}</strong></div>`
                    + `</div>`
            });
        }

        // ── Headlines / Events ──
        if (report.headlines && report.headlines.length > 0) {
            let newsHtml = `<div class="db-panel"><div class="db-panel-header">THIS WEEK'S NEWS</div>`;
            report.headlines.forEach(h => {
                newsHtml += `<div class="db-news-item"><span class="db-news-marker">▸</span> ${h}</div>`;
            });
            newsHtml += `</div>`;
            lines.push({ type: 'raw', text: newsHtml });
        }

        // ── Messages ──
        if (report.newMessages > 0) {
            lines.push({
                type: 'raw', text: `<div class="db-panel"><div class="db-panel-header">MESSAGES</div>`
                    + `<div class="db-news-item">📱 ${report.newMessages} new message${report.newMessages > 1 ? 's' : ''} on your phone</div>`
                    + `</div>`
            });
        }

        // ── Anti-Resource Warnings ──
        const warnings = [];
        if (report.heat > 20) warnings.push(`🔥 Market Heat at ${report.heat} — galleries are watching`);
        if (report.suspicion > 5) warnings.push(`👁️ Suspicion at ${Math.round(report.suspicion)} — keep a low profile`);
        if (report.burnout > 5) warnings.push(`😮‍💨 Burnout at ${Math.round(report.burnout)} — slow down or face forced rest`);

        if (warnings.length > 0) {
            let warnHtml = `<div class="db-panel"><div class="db-panel-header" style="color:var(--red)">WARNINGS</div>`;
            warnings.forEach(w => {
                warnHtml += `<div class="db-news-item">${w}</div>`;
            });
            warnHtml += `</div>`;
            lines.push({ type: 'raw', text: warnHtml });
        }

        lines.push(BLANK());

        return {
            lines,
            options: [{ label: '→ Continue to Dashboard', action: () => ui.replaceScreen(dashboardScreen(ui)) }]
        };
    };
}

// ════════════════════════════════════════════
// SCREEN: Main Dashboard (Ego Terminal v2)
// ════════════════════════════════════════════
// ════════════════════════════════════════════
// SCREEN: Calendar Event Detail
// ════════════════════════════════════════════
function calendarEventScreen(ui, event, apCost) {
    return () => {
        const s = TerminalAPI.state();
        const cost = event.cost || 0;
        const canAfford = s.cash >= cost;

        const lines = [
            H(event.name),
            DIM(`${event.location} · ${event.type.toUpperCase()}`),
            DIV(),
            event.description,
            BLANK(),
        ];

        if (event.dealOpportunity) {
            lines.push(SUB('OPPORTUNITY'));
            lines.push(DIM(`  ${event.dealOpportunity}`));
            lines.push(BLANK());
        }

        if (event.npcPresence && event.npcPresence.length > 0) {
            lines.push(SUB('WHO\'S HERE'));
            event.npcPresence.forEach(npcId => {
                const contact = TerminalAPI.contacts.find(c => c.id === npcId);
                if (contact) {
                    lines.push(DIM(`  ${contact.emoji || '👤'} ${contact.name} — ${contact.role || ''}`));
                }
            });
            lines.push(BLANK());
        }

        if (cost > 0) {
            lines.push(STAT('Entry Cost', `$${cost.toLocaleString()}`, canAfford ? '' : 'red'));
        }
        lines.push(STAT('Action Cost', `${apCost} AP`));
        lines.push(STAT('Tier', event.tier === 1 ? 'Major Event' : 'Regional Event', event.tier === 1 ? 'gold' : ''));
        lines.push(DIV());

        const options = [];

        if (canAfford && hasActions(apCost)) {
            // Stat rewards scale by tier
            const repGain = event.tier === 1 ? 3 : 1;
            const accessGain = event.tier === 1 ? 2 : 1;
            const tasteGain = event.type === 'biennale' || event.type === 'exhibition' ? 3 : 1;

            options.push({
                label: `${cost > 0 ? `Pay $${cost.toLocaleString()} & ` : ''}Attend (+${repGain} rep, +${accessGain} acc, +${tasteGain} taste)`,
                action: () => {
                    useAction(`Attended ${event.name}`, apCost);
                    if (cost > 0) s.cash -= cost;
                    s.reputation = Math.min(100, s.reputation + repGain);
                    s.access = Math.min(100, s.access + accessGain);
                    s.taste = Math.min(100, s.taste + tasteGain);

                    // Meet a random NPC from the event
                    if (event.npcPresence && event.npcPresence.length > 0) {
                        const randomNpcId = event.npcPresence[Math.floor(Math.random() * event.npcPresence.length)];
                        const contact = TerminalAPI.network.getContact(randomNpcId);
                        if (contact && !contact.met) {
                            contact.met = true;
                            const data = TerminalAPI.contacts.find(c => c.id === randomNpcId);
                            TerminalAPI.addNews(`Met ${data?.name || randomNpcId} at ${event.name}.`);
                        } else if (contact) {
                            TerminalAPI.network.adjustFavor(randomNpcId, 1);
                        }
                    }

                    TerminalAPI.addNews(`Attended ${event.name} in ${event.location}.`);
                    ui.popScreen();
                    ui.replaceScreen(dashboardScreen(ui));
                }
            });

            // If it's a fair/auction, also offer to browse market there
            if ((event.type === 'fair' || event.type === 'auction') && hasActions(apCost)) {
                options.push({
                    label: `Browse works at ${event.name}`,
                    action: () => {
                        useAction(`Browsed art at ${event.name}`, apCost);
                        if (cost > 0) s.cash -= cost;
                        s.access = Math.min(100, s.access + accessGain);
                        TerminalAPI.addNews(`Browsed works at ${event.name}.`);
                        ui.popScreen();
                        ui.pushScreen(marketScreen(ui));
                    }
                });
            }
        } else if (!canAfford) {
            options.push({ label: `Can't afford entry ($${cost.toLocaleString()})`, disabled: true });
        } else {
            options.push({ label: 'Not enough AP this week', disabled: true });
        }

        options.push({ label: '← Back', action: () => ui.popScreen() });
        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Main Dashboard (Ego Terminal v2)
// ════════════════════════════════════════════
export function dashboardScreen(ui) {
    // Wire up city click handler for world map
    ui._onCityClick = (cityId) => {
        const s = TerminalAPI.state();
        if (!s) return;
        if (cityId === s.currentCity) {
            ui.showNotification('You are already here.', '📍');
            return;
        }
        if (!hasActions(1)) {
            ui.showNotification('Not enough AP to travel.', '⚠️');
            return;
        }
        // Show travel confirmation
        ui.pushScreen(() => {
            const cityName = CITY_NAMES[cityId] || cityId;
            return {
                lines: [
                    H('TRAVEL'),
                    DIM(`Travel to ${cityName}?`),
                    DIM('This will cost 1 AP and advance the week.'),
                ],
                options: [
                    {
                        label: `✈️ Travel to ${cityName} [1 AP]`,
                        action: () => {
                            useAction(`Traveled to ${cityName}`);
                            TerminalAPI.initGame.changeCity(cityId);
                            ui.popScreen();
                            ui.replaceScreen(dashboardScreen(ui));
                        }
                    },
                    { label: '← Cancel', action: () => ui.popScreen() }
                ]
            };
        });
    };

    return () => {
        const s = TerminalAPI.state();
        if (!s) return { lines: [H('NO STATE FOUND')], options: [{ label: 'Back', action: () => ui.popScreen() }] };

        // ── Intercept pending events ──
        const pendingEvent = TerminalAPI.getPendingEvent();
        if (pendingEvent) {
            if (pendingEvent.steps && pendingEvent.steps.length > 0) {
                return eventStepScreen(ui, pendingEvent, 0)();
            } else {
                return eventScreen(ui, pendingEvent)();
            }
        }

        const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Math.floor((s.week - 1) / 4) % 12];
        const year = 2024 + Math.floor((s.week - 1) / 52);
        const portfolioValue = TerminalAPI.getPortfolioValue();
        const netWorth = s.cash + portfolioValue;
        const actionsLeft = getActionsRemaining();
        const cityInfo = { name: s.currentCity || 'new-york' };
        const weekLabel = `Week ${s.week} · ${month} ${year}`;

        // Wealth sparkline from history
        const wealthNums = (s.wealthHistory || []).map(h => (h.cash || 0) + (h.assets || 0));
        const spark = sparkline(wealthNums);
        const trend = wealthNums.length >= 2
            ? (wealthNums[wealthNums.length - 1] >= wealthNums[wealthNums.length - 2] ? '↑' : '↓')
            : '';

        // Market state dot
        const dotClass = s.marketState === 'bull' ? 'bull' : s.marketState === 'bear' ? 'bear' : 'stable';

        const lines = [];

        // ── Rich Header Panel ──
        const charName = s.character?.name || 'UNKNOWN';
        const playerName = s.playerName || 'Agent';
        const currentCityDisplay = CITY_NAMES[s.currentCity] || s.currentCity || 'New York';
        const worthTrend = trend === '↑' ? 'up' : trend === '↓' ? 'down' : '';
        lines.push({
            type: 'raw', text: `<div class="db-header-panel">`
                + `<div class="db-header-name">EGO TERMINAL &nbsp; ★ ${charName.toUpperCase()}</div>`
                + `<div class="db-header-meta">${playerName} · ${currentCityDisplay} · Week ${s.week} · ${month} ${year}</div>`
                + `<div class="db-header-worth${worthTrend ? ' ' + worthTrend : ''}">Net Worth: $${netWorth.toLocaleString()} ${trend}</div>`
                + `</div>`
        });

        // ── Action Budget Panel ──
        lines.push({ type: 'raw', text: actionBudgetPanelHtml(actionsLeft, MAX_ACTIONS, weekLabel) });

        // ── Calendar Strip ──
        lines.push({ type: 'raw', text: calendarStripHtml(s.week, month, year) });

        // ── Warning Bar (only when anti-resources elevated) ──
        const showHeat = s.marketHeat >= 10;
        const showBurnout = s.burnout >= 3;
        const showSuspicion = (s.suspicion || 0) >= 3;
        if (showHeat || showBurnout || showSuspicion) {
            let warningItems = [];
            if (showHeat) warningItems.push(`HEAT ${s.marketHeat}`);
            if (showBurnout) warningItems.push(`BURNOUT ${Math.round(s.burnout)}`);
            if (showSuspicion) warningItems.push(`SUSPICION ${Math.round(s.suspicion)}`);
            lines.push({
                type: 'raw', text: `<div class="db-warning-bar">⚠ ${warningItems.join('  ·  ')}</div>`
            });
        }

        // ── HUD Row: Financials + Stats side-by-side on desktop ──
        const financialsHtml = `<div class="db-panel"><div class="db-panel-header">FINANCIALS</div>`
            + `<div class="db-fin-grid">`
            + `<span class="db-fin-label">Cash</span><span class="db-fin-value green">$${s.cash.toLocaleString()}</span>`
            + `<span class="db-fin-label">Portfolio</span><span class="db-fin-value">$${portfolioValue.toLocaleString()}  (${s.portfolio.length} works)</span>`
            + `<span class="db-fin-label">Net Worth</span><span class="db-fin-value gold">$${netWorth.toLocaleString()}  <span class="db-sparkline">${spark} ${trend}</span></span>`
            + `<span class="db-fin-label">Market</span><span class="db-fin-value"><span class="db-dot ${dotClass}"></span>${s.marketState.toUpperCase()}</span>`
            + `</div></div>`;

        const statsHtml = `<div class="db-panel"><div class="db-panel-header">STATS</div>`
            + `<div class="db-stats-grid">`
            + statBarHtml('HYP', s.reputation, 100, 'var(--gold)')
            + statBarHtml('AUD', s.audacity ?? 0, 100, 'var(--red)')
            + statBarHtml('TST', s.taste, 100, 'var(--blue)')
            + statBarHtml('ACC', s.access, 100, 'var(--green)')
            + `</div></div>`;

        lines.push({ type: 'raw', text: `<div class="db-hud-row">${financialsHtml}${statsHtml}</div>` });

        // ── Market Intelligence Panel ──
        const newsItems = generateFlavorNews(s);
        let newsHtml = `<div class="db-panel"><div class="db-panel-header">MARKET INTELLIGENCE</div>`;
        newsItems.forEach(item => {
            newsHtml += `<div class="db-news-item"><span class="db-news-marker">▸</span> ${item}</div>`;
        });
        newsHtml += `</div>`;
        lines.push({ type: 'raw', text: newsHtml });

        // ── Pipeline Panel ──
        if (s.activeDeals.length > 0) {
            let pipeHtml = `<div class="db-panel"><div class="db-panel-header">PIPELINE (${s.activeDeals.length} active)</div>`;
            s.activeDeals.forEach(deal => {
                const weeksLeft = deal.resolutionWeek - s.week;
                pipeHtml += `<div class="db-pipeline-row"><span>"${deal.work.title}"</span><span>${deal.strategy} · ${weeksLeft}w</span></div>`;
            });
            pipeHtml += `</div>`;
            lines.push({ type: 'raw', text: pipeHtml });
        }

        // ── World Map (unlocks at week 5) ──
        if (s.week > 4) {
            lines.push(DIV());
            lines.push(generateWorldMap(s.week));
        }

        // ── Progressive Disclosure Tease ──
        if (s.week <= 4) {
            lines.push(DIV());
            lines.push(DIM(`Week ${5 - s.week} until venues, travel, and the global art circuit unlock.`));
        } else if (s.week <= 12) {
            lines.push(DIM(`Week ${13 - s.week} until full dossier, inventory, and neighborhood access.`));
        }

        // ── Options ──
        const availableWorks = TerminalAPI.market.getAvailableWorks ? TerminalAPI.market.getAvailableWorks().length : 0;
        const pendingCount = s.pendingOffers ? s.pendingOffers.length : 0;
        const unreadMessages = TerminalAPI.network.initialized ? TerminalAPI.network.getUnreadCount() : 0;

        const safePush = (screenFn) => {
            try {
                ui.pushScreen(screenFn(ui));
            } catch (err) {
                console.error(err);
                window.lastError = err.message || String(err);
                ui.render();
            }
        };

        const options = [];

        // ── Priority: Advance Week when exhausted ──
        if (actionsLeft === 0) {
            options.push({
                label: '⏩  WEEK COMPLETE — Advance Week →',
                action: () => {
                    try {
                        TerminalAPI.advanceWeek();
                        ui.replaceScreen(weekReportScreen(ui));
                    } catch (err) {
                        window.lastError = err.message;
                        ui.render();
                    }
                }
            });
        }

        // ── Progressive Disclosure Phases ──
        const phase = s.week <= 4 ? 'early' : s.week <= 12 ? 'mid' : 'late';

        // ═══ ART ═══
        options.push({ label: `═══ MARKET DESK ═══`, disabled: true, _sectionHeader: true });
        options.push({
            label: `[1 AP] 🖼️  Browse Market (${availableWorks} works)`,
            disabled: !hasActions(1),
            action: hasActions(1) ? () => safePush(marketScreen) : undefined
        });
        options.push({
            label: `📁  My Collection (${s.portfolio.length} works, $${portfolioValue.toLocaleString()})`,
            action: () => safePush(portfolioScreen)
        });

        // ═══ CALENDAR EVENTS ═══ (active this week)
        const thisWeekEvents = getUpcomingEvents(s.week, 1).filter(e => e.weeksAway === 0);
        if (thisWeekEvents.length > 0 && phase !== 'early') {
            options.push({ label: `═══ THIS WEEK ═══`, disabled: true, _sectionHeader: true });
            thisWeekEvents.forEach(ev => {
                const icon = CAL_ICONS[ev.type] || '▸';
                const cost = ev.cost > 0 ? ev.cost : 0;
                const apCost = ev.tier === 1 ? 2 : 1;
                const canAfford = s.cash >= cost;
                const canAttend = hasActions(apCost) && canAfford;
                const costLabel = cost > 0 ? ` · $${cost.toLocaleString()}` : '';
                options.push({
                    label: `[${apCost} AP] ${icon} ${ev.name} (${ev.location}${costLabel})`,
                    disabled: !canAttend,
                    action: canAttend ? () => {
                        ui.pushScreen(calendarEventScreen(ui, ev, apCost));
                    } : undefined
                });
            });
        }

        // ═══ BUSINESS ═══ (Venue + Travel unlock at week 5)
        if (phase !== 'early') {
            options.push({ label: `═══ OPERATIONS ═══`, disabled: true, _sectionHeader: true });
            options.push({
                label: `[1 AP] 🎨  Visit Venue`,
                disabled: !hasActions(1),
                action: hasActions(1) ? () => safePush(venuePickerScreen) : undefined
            });
            if (phase === 'late') {
                options.push({
                    label: `🗺️  Walk the Neighborhood (Pokemon Mode)`,
                    action: () => {
                        if (window.game?.startTestScene) {
                            window.game.startTestScene('OverworldScene', { ui });
                            ui.container.style.display = 'none';
                            ui.pushScreen(() => ({ lines: [], options: [] })); // trap terminal
                        } else {
                            ui.showNotification('Visual engine not loaded.', '⚠️');
                        }
                    }
                });
            }
            options.push({
                label: `[1 AP] ✈️  Travel (${cityInfo.name})`,
                disabled: !hasActions(1),
                action: hasActions(1) ? () => safePush(cityScreen) : undefined
            });
            options.push({
                label: `📊  Market Intel (${s.marketState} market)`,
                action: () => safePush(newsScreen)
            });
        }

        if (pendingCount > 0) {
            options.push({
                label: `💼  Pending Offers (${pendingCount} awaiting response)`,
                action: () => safePush(phoneScreen)
            });
        }

        // ═══ YOU ═══
        options.push({ label: `═══ DOSSIER ═══`, disabled: true, _sectionHeader: true });
        if (phase === 'late') {
            options.push({
                label: `🧰  Inventory & Artifacts`,
                action: () => {
                    GameEventBus.emit(GameEvents.UI_TOGGLE_OVERLAY, 'INVENTORY');
                }
            });
        }
        if (phase !== 'early') {
            options.push({
                label: `🪞  Ego Dashboard & Profile`,
                action: () => {
                    GameEventBus.emit(GameEvents.TOGGLE_DASHBOARD, { state: true });
                }
            });
        }
        options.push({
            label: unreadMessages > 0 ? `[1 AP] 📱  Phone (${unreadMessages} unread)` : `[1 AP] 📱  Phone`,
            disabled: !hasActions(1),
            action: hasActions(1) ? () => safePush(phoneScreen) : undefined
        });
        if (phase !== 'early') {
            options.push({
                label: '📓  Journal & Calendar',
                action: () => safePush(journalScreen)
            });
        }

        // --- VENUE CUTSCENES TEST ---
        options.push({
            label: '🎬  Test Venue Cutscenes',
            action: () => safePush(testVenueCutscenesScreen)
        });

        options.push({
            label: '⚙️  System & Settings',
            action: () => safePush(pauseMenuScreen)
        });

        options.push({
            label: '💻  System Admin (God Mode)',
            action: () => GameEventBus.emit(GameEvents.UI_TOGGLE_OVERLAY, 'ADMIN') // Using raw string to match OVERLAY.ADMIN in views.js
        });

        // ──────────
        // Retire option after week 26
        if (s.week >= 26) {
            options.push({
                label: '🌟  Retire — End your career',
                action: () => safePush(legacyEndScreen)
            });
        }

        if (actionsLeft > 0) {
            options.push({
                label: '⏩  Advance Week →', action: () => {
                    try {
                        TerminalAPI.advanceWeek();
                        ui.replaceScreen(weekReportScreen(ui));
                    } catch (err) {
                        window.lastError = err.message;
                        ui.render();
                    }
                }
            });
        }

        // Ticker bar — rendered as raw HTML below options
        const footerHtml = TickerSystem.generate('single');

        return { lines, options, footerHtml };
    };
}

// ════════════════════════════════════════════
// SCREEN: Test Venue Cutscenes (Dev Feature)
// ════════════════════════════════════════════
function testVenueCutscenesScreen(ui) {
    return () => {
        const lines = [
            H('TEST VENUE CUTSCENES'),
            DIM('Preview dialogue scenes for the various global venues.'),
            DIV(),
        ];

        const options = [];

        const cutscenes = [
            {
                label: 'Gallery Opening (Chelsea)',
                params: {
                    bgKey: 'bg_gallery_main_1bit_1771587911969.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_it_girl_dealer_1bit_1771587978725.png',
                    dialogueSequence: [
                        { name: 'You', speakerSide: 'left', text: 'Good crowd tonight. The lighting feels almost forensic, though.' },
                        { name: 'Gallerist', speakerSide: 'right', text: 'We lit it for the cameras, not the eyes. Has anyone offered you prosecco?' },
                        { name: 'You', speakerSide: 'left', text: 'I am not here for prosecco. Check your ledger. I want the piece in the back.' }
                    ]
                }
            },
            {
                label: 'Cocktail Party (Upper East Side)',
                params: {
                    // fallback to a drama background or something appropriate
                    bgKey: 'bg_social.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_legacy_gallerist_1bit_1771587958185.png',
                    dialogueSequence: [
                        { name: 'Collector', speakerSide: 'right', text: 'These floor-to-ceiling windows... one feels so exposed, don\'t you agree?' },
                        { name: 'You', speakerSide: 'left', text: 'Only if you have something to hide. That Rothko, for instance.' },
                        { name: 'Collector', speakerSide: 'right', text: 'Ah. You noticed. Let us speak quietly, away from the waiters.' }
                    ]
                }
            },
            {
                label: 'Auction House (Rockefeller Plaza)',
                params: {
                    bgKey: 'bg_auction.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_auctioneer.png',
                    dialogueSequence: [
                        { name: 'Auctioneer', speakerSide: 'right', text: 'Lot 47. We open the bidding at two million. Do I see two million?' },
                        { name: 'You', speakerSide: 'left', text: '(You raise your paddle precisely an inch.)' },
                        { name: 'Auctioneer', speakerSide: 'right', text: 'Two million on the aisle. Two million. Looking for two point two.' }
                    ]
                }
            },
            {
                label: 'Artist Studio (Bushwick)',
                params: {
                    bgKey: 'bg_personal.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_scene_queen.png', // Or an artist portrait
                    dialogueSequence: [
                        { name: 'Artist', speakerSide: 'right', text: 'Watch your step. The cobalt blue is still wet on the floor.' },
                        { name: 'You', speakerSide: 'left', text: 'I didn\'t come to inspect the floorboards. Show me the new series.' },
                        { name: 'Artist', speakerSide: 'right', text: 'You\'re the only one who gets to see it before the gallery. Don\'t ruin it.' }
                    ]
                }
            },
            {
                label: 'Art Basel (Switzerland)',
                params: {
                    bgKey: 'bg_fair.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_underground_connector_1bit_1771587994565.png',
                    dialogueSequence: [
                        { name: 'Advisor', speakerSide: 'right', text: 'The entire VIP lounge is whispering about the provenance on that Richter.' },
                        { name: 'You', speakerSide: 'left', text: 'Let them whisper. It distracts them from the real acquisitions.' },
                        { name: 'Advisor', speakerSide: 'right', text: 'Precisely. Now, follow me to booth 114. The VIP preview ends in ten minutes.' }
                    ]
                }
            },
            {
                label: 'Geneva Freeport',
                params: {
                    bgKey: 'bg_gallery_backroom_1bit_1771587929810.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_old_money_gallerist.png',
                    dialogueSequence: [
                        { name: 'Handler', speakerSide: 'right', text: 'Vault 1147. Please verify your biometric scan to proceed.' },
                        { name: 'You', speakerSide: 'left', text: '(Presses thumb to the glass reader)' },
                        { name: 'Handler', speakerSide: 'right', text: 'Identity confirmed. The climate control is at 65 degrees. You have twenty minutes.' }
                    ]
                }
            }
        ];

        cutscenes.forEach(scene => {
            options.push({
                label: `► ${scene.label}`,
                action: () => {
                    if (window.game && window.game.startTestScene) {
                        window.game.startTestScene('MacDialogueScene', scene.params);
                    } else {
                        ui.showNotification('Visual engine not loaded.', '⚠️');
                    }
                }
            });
        });

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}
