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

function generateWorldMap(currentWeek) {
    const s = TerminalAPI.state();
    const currentCity = s.currentCity || 'new-york';
    const currentCityName = CITY_NAMES[currentCity] || currentCity;

    const cityMarker = (cityId, name) => {
        if (cityId === currentCity) {
            return `<span class="wm-current">★ ${name}</span>`;
        } else {
            return `<span class="wm-city">○ ${name}</span>`;
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
        '★ You are here  ○ Reachable city'
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
export function dashboardScreen(ui) {
    return () => {
        const s = TerminalAPI.state();
        if (!s) return { lines: [H('NO STATE FOUND')], options: [{ label: 'Back', action: () => ui.popScreen() }] };

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

        // ── Header ──
        lines.push(H('EGO TERMINAL'));

        // ── Action Budget Panel ──
        lines.push({ type: 'raw', text: actionBudgetPanelHtml(actionsLeft, MAX_ACTIONS, weekLabel) });

        // ── Calendar Strip ──
        lines.push({ type: 'raw', text: calendarStripHtml(s.week, month, year) });

        // ── Financials Panel ──
        lines.push({
            type: 'raw', text: `<div class="db-panel"><div class="db-panel-header">FINANCIALS</div>`
                + `<div class="db-fin-grid">`
                + `<span class="db-fin-label">Cash</span><span class="db-fin-value green">$${s.cash.toLocaleString()}</span>`
                + `<span class="db-fin-label">Portfolio</span><span class="db-fin-value">$${portfolioValue.toLocaleString()}  (${s.portfolio.length} works)</span>`
                + `<span class="db-fin-label">Net Worth</span><span class="db-fin-value gold">$${netWorth.toLocaleString()}  <span class="db-sparkline">${spark} ${trend}</span></span>`
                + `<span class="db-fin-label">Market</span><span class="db-fin-value"><span class="db-dot ${dotClass}"></span>${s.marketState.toUpperCase()}</span>`
                + `</div></div>`
        });

        // ── Stats Panel ──
        lines.push({
            type: 'raw', text: `<div class="db-panel"><div class="db-panel-header">STATS</div>`
                + `<div class="db-stats-grid">`
                + statBarHtml('HYP', s.reputation, 100, 'var(--gold)')
                + statBarHtml('AUD', s.audacity ?? 0, 100, 'var(--red)')
                + statBarHtml('TST', s.taste, 100, 'var(--blue)')
                + statBarHtml('ACC', s.access, 100, 'var(--green)')
                + `</div>`
                + `<div class="db-secondary">`
                + `<span class="db-secondary-item${s.marketHeat > 30 ? ' warn' : ''}">Heat ${s.marketHeat}</span>`
                + `<span class="db-secondary-item${s.burnout > 5 ? ' warn' : ''}">Burnout ${Math.round(s.burnout)}</span>`
                + `</div>`
                + `</div>`
        });

        // ── Market Intelligence Panel ──
        const newsItems = generateFlavorNews(s);
        let newsHtml = `<div class="db-panel"><div class="db-panel-header">MARKET INTELLIGENCE</div>`;
        newsItems.forEach(item => {
            newsHtml += `<div class="db-news-item"><span class="db-news-marker">▸</span> ${item}</div>`;
        });
        newsHtml += `</div>`;
        lines.push({ type: 'raw', text: newsHtml });

        // ── Pipeline ──
        if (s.activeDeals.length > 0) {
            lines.push(DIV());
            lines.push(SUB(`PIPELINE (${s.activeDeals.length} active)`));
            s.activeDeals.forEach(deal => {
                const weeksLeft = deal.resolutionWeek - s.week;
                lines.push(DIM(`  "${deal.work.title}" → ${deal.strategy} (${weeksLeft}w)`));
            });
        }

        // ── World Map ──
        lines.push(DIV());
        lines.push(generateWorldMap(s.week));

        // ── Options (unchanged) ──
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

        // ═══ BUSINESS ═══
        options.push({ label: `═══ OPERATIONS ═══`, disabled: true, _sectionHeader: true });
        options.push({
            label: `[1 AP] 🎨  Visit Venue`,
            disabled: !hasActions(1),
            action: hasActions(1) ? () => safePush(venuePickerScreen) : undefined
        });
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
        options.push({
            label: `[1 AP] ✈️  Travel (${cityInfo.name})`,
            disabled: !hasActions(1),
            action: hasActions(1) ? () => safePush(cityScreen) : undefined
        });

        options.push({
            label: `📊  Market Intel (${s.marketState} market)`,
            action: () => safePush(newsScreen)
        });

        if (pendingCount > 0) {
            options.push({
                label: `💼  Pending Offers (${pendingCount} awaiting response)`,
                action: () => safePush(phoneScreen)
            });
        }

        // ═══ YOU ═══
        options.push({ label: `═══ DOSSIER ═══`, disabled: true, _sectionHeader: true });
        options.push({
            label: `🪞  Ego Dashboard & Profile`,
            action: () => {
                GameEventBus.emit(GameEvents.TOGGLE_DASHBOARD, { state: true });
            }
        });
        options.push({
            label: unreadMessages > 0 ? `[1 AP] 📱  Phone (${unreadMessages} unread)` : `[1 AP] 📱  Phone`,
            disabled: !hasActions(1),
            action: hasActions(1) ? () => safePush(phoneScreen) : undefined
        });
        options.push({
            label: '📓  Journal & Calendar',
            action: () => safePush(journalScreen)
        });
        options.push({
            label: '⚙️  System & Settings',
            action: () => safePush(pauseMenuScreen)
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
