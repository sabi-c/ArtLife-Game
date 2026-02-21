/**
 * src/terminal/screens/dashboard.js
 * Extracted during Phase 41 Refactoring.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, SUB, DIV, BLANK, DIM, GOLD, GREEN, RED, STAT, NEWS, WORLDMAP } from './shared.js';
import { characterSelectScreen } from './character.js';
import { marketScreen, portfolioScreen } from './market.js';
import { phoneScreen } from './phone.js';
import { cityScreen, newsScreen } from './world.js';
import { journalScreen, legacyEndScreen } from './journal.js';
import { pauseMenuScreen } from './system.js';

// ════════════════════════════════════════════
// SCREEN: Venue Picker
// ════════════════════════════════════════════
function venuePickerScreen(ui) {
    return () => {
        const venues = TerminalAPI.venues;
        const s = TerminalAPI.state();
        const lines = [
            H('VISIT VENUE'),
            DIM('Choose where to spend your time this week.'),
            DIV(),
        ];

        const options = [];
        venues.forEach(venue => {
            const canEnter = !venue.requires || TerminalAPI.gate.check(venue.requires);
            if (canEnter) {
                lines.push(`${venue.name}`);
                lines.push(DIM(`  ${venue.desc}`));
                options.push({
                    label: `→ ${venue.name}`,
                    action: () => ui.pushScreen(venueDetailScreen(ui, venue))
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
        const lines = [
            H(venue.name),
            DIM(venue.desc),
            DIV(),
        ];

        if (venue.rooms && venue.rooms.length > 0) {
            lines.push(SUB('AREAS'));
            venue.rooms.forEach(room => {
                const canEnter = !room.requires || TerminalAPI.gate.check(room.requires);
                lines.push(DIM(`  ${canEnter ? '•' : '🔒'} ${room.name} — ${room.desc}`));
            });
            lines.push(BLANK());
        }

        const options = [];

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

        venue.rooms?.forEach(room => {
            const canEnter = !room.requires || TerminalAPI.gate.check(room.requires);
            options.push({
                label: canEnter ? `📍 Enter: ${room.name}` : `🔒 ${room.name} (locked)`,
                disabled: !canEnter,
                action: canEnter ? () => ui.pushScreen(roomExploreScreen(ui, venue, room)) : undefined,
            });
        });

        options.push({ label: '← Back', action: () => ui.popScreen() });
        return { lines, options };
    };
}

function roomExploreScreen(ui, venue, room) {
    return () => {
        const s = TerminalAPI.state();
        const lines = [
            H(room.name),
            DIM(room.desc || ''),
            DIV(),
        ];

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
                    action: () => ui.pushScreen(npcTalkScreen(ui, c, contact))
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

        room.exits?.forEach(exit => {
            const canExit = !exit.requires || TerminalAPI.gate.check(exit.requires);
            const destRoom = venue.rooms.find(r => r.id === exit.id);
            if (canExit && destRoom) {
                options.push({
                    label: `→ ${exit.label}`,
                    action: () => ui.replaceScreen(roomExploreScreen(ui, venue, destRoom))
                });
            } else if (!canExit) {
                options.push({ label: `🔒 ${exit.label}`, disabled: true });
            }
        });

        options.push({ label: '← Leave Venue', action: () => ui.popScreen() });
        return { lines, options };
    };
}

function npcTalkScreen(ui, charData, contactData) {
    return () => {
        const name = contactData?.name || charData.id;
        const trees = TerminalAPI.treesByNpc[charData.id] || [];

        const lines = [
            H(name),
            contactData ? DIM(contactData.title || contactData.role || '') : BLANK(),
            DIV(),
            DIM(charData.desc || ''),
            BLANK(),
        ];

        const options = [];

        if (trees.length > 0) {
            trees.forEach(tree => {
                options.push({
                    label: `💬 ${tree.title || tree.id}`,
                    action: () => {
                        const event = TerminalAPI.dialogue.convertTreeToEvent(tree);
                        if (window.game?.startTestScene) {
                            window.game.startTestScene('DialogueScene', { event, ui });
                        }
                    }
                });
            });
        } else {
            lines.push(DIM(`Topics: ${(charData.topics || []).join(', ')}`));
            options.push({
                label: `💬 Small talk`,
                action: () => {
                    TerminalAPI.addNews(`Exchanged pleasantries with ${name}.`);
                    ui.showNotification(`"Lovely to see you."`, '👤');
                    ui.popScreen();
                }
            });
        }

        if (contactData && hasActions()) {
            options.push({
                label: `📞 Exchange cards (+1 favor, 1 action)`,
                action: () => {
                    useAction(`Networked with ${name}`);
                    TerminalAPI.network.adjustFavor(charData.id, 1);
                    TerminalAPI.addNews(`Exchanged cards with ${name}.`);
                    ui.popScreen();
                }
            });
        }

        options.push({ label: '← Back', action: () => ui.popScreen() });
        return { lines, options };
    };
}


// ════════════════════════════════════════════
// Action Budget System
// ════════════════════════════════════════════
const MAX_ACTIONS = 3;

export function getActionsRemaining() {
    return MAX_ACTIONS - (TerminalAPI.state().actionsThisWeek || 0);
}

export function useAction(label) {
    if (!TerminalAPI.state().actionsThisWeek) TerminalAPI.state().actionsThisWeek = 0;
    TerminalAPI.state().actionsThisWeek++;
    TerminalAPI.addNews(`⏱️ ${label} (${getActionsRemaining()} actions left)`);
    return true;
}

export function hasActions() {
    return getActionsRemaining() > 0;
}

// ════════════════════════════════════════════
// World Map Helper
// ════════════════════════════════════════════
function generateWorldMap(currentWeek) {
    const s = TerminalAPI.state();
    const currentCity = s.currentCity || 'new-york';

    // Fallback if CITY_DATA isn't imported directly, normally it's small or we get it via NetworkManager
    // the original screens.js had CITY_DATA. We can mock it or fetch it.
    const cityNames = {
        'new-york': 'New York', 'london': 'London', 'paris': 'Paris',
        'hong-kong': 'Hong Kong', 'switzerland': 'Switzerland',
        'los-angeles': 'Los Angeles', 'miami': 'Miami', 'berlin': 'Berlin'
    };

    const currentCityName = cityNames[currentCity] || currentCity;

    // Map rows — geographical layout
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
        `🗺️  WORLD MAP · ${currentCityName.toUpperCase()}`,
        rows,
        '★ You are here  ○ Reachable city'
    );
}

// ════════════════════════════════════════════
// SCREEN: Main Dashboard
// ════════════════════════════════════════════
export function dashboardScreen(ui) {
    return () => {
        const s = TerminalAPI.state();
        if (!s) return { lines: [H('NO STATE FOUND')], options: [{ label: 'Back', action: () => ui.popScreen() }] };

        const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Math.floor((s.week - 1) / 4) % 12];
        const year = 2024 + Math.floor((s.week - 1) / 52);
        const portfolioValue = TerminalAPI.getPortfolioValue();

        const actionsLeft = getActionsRemaining();
        const actionBoxes = Array(MAX_ACTIONS).fill(0).map((_, i) => i < actionsLeft ? '■' : '□').join(' ');
        // Fallback for city vibe
        const cityInfo = { name: s.currentCity, vibe: '' };
        const netWorth = s.cash + portfolioValue;

        const lines = [
            H(`WEEK ${s.week} • ${month} ${year}`),
            STAT('ACTIONS', actionBoxes, actionsLeft === 0 ? 'red' : actionsLeft === 1 ? 'gold' : 'green'),
            DIV(),
            STAT('CASH', `$${s.cash.toLocaleString()}`, 'green'),
            STAT('COLLECTION', `$${portfolioValue.toLocaleString()}  (${s.portfolio.length} works)`),
            STAT('NET WORTH', `$${netWorth.toLocaleString()}`, 'gold'),
            STAT('MARKET', s.marketState.toUpperCase(), s.marketState === 'bull' ? 'green' : s.marketState === 'bear' ? 'red' : ''),
            DIV(),
            STAT('HYP', s.reputation),
            STAT('TST', s.taste),
            STAT('AUD', s.audacity ?? 0),
            STAT('ACC', s.access),
            STAT('HEAT', s.marketHeat, s.marketHeat > 30 ? 'red' : ''),
            STAT('BURNOUT', Math.round(s.burnout), s.burnout > 5 ? 'red' : ''),
            STAT('CITY', cityInfo.name.toUpperCase()),
            DIM(cityInfo.vibe),
        ];

        // Pipeline summary
        if (s.activeDeals.length > 0) {
            lines.push(DIV());
            lines.push(SUB(`PIPELINE (${s.activeDeals.length} active)`));
            s.activeDeals.forEach(deal => {
                const weeksLeft = deal.resolutionWeek - s.week;
                lines.push(DIM(`  ${deal.work.title} → ${deal.strategy} (${weeksLeft}w)`));
            });
        }

        // Latest news
        if (s.newsFeed && s.newsFeed.length > 0) {
            lines.push(DIV());
            lines.push(SUB('LATEST NEWS'));
            s.newsFeed.slice(-3).reverse().forEach(n => {
                lines.push(NEWS(typeof n === 'string' ? n : n.text));
            });
        }

        // World Map
        lines.push(DIV());
        lines.push(generateWorldMap(s.week));

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

        // ═══ ART ═══
        options.push({ label: `═══ ART ═══`, disabled: true, _sectionHeader: true });
        options.push({
            label: `🖼️  Browse Market (${availableWorks} works available)`,
            action: () => safePush(marketScreen)
        });
        options.push({
            label: `📁  My Collection (${s.portfolio.length} works, $${portfolioValue.toLocaleString()})`,
            action: () => safePush(portfolioScreen)
        });

        // ═══ BUSINESS ═══
        options.push({ label: `═══ BUSINESS ═══`, disabled: true, _sectionHeader: true });
        options.push({
            label: `🎨  Visit Venue`,
            action: () => safePush(venuePickerScreen)
        });
        options.push({
            label: `🗺️  Walk the Neighborhood (Pokemon Mode)`,
            action: () => {
                if (window.game.startTestScene) {
                    window.game.startTestScene('OverworldScene', { ui });
                    ui.container.style.display = 'none';
                    ui.pushScreen(() => ({ lines: [], options: [] })); // trap terminal
                } else {
                    ui.showNotification('Visual engine not loaded.', '⚠️');
                }
            }
        });
        options.push({
            label: `✈️  Travel (${cityInfo.name})`,
            action: () => safePush(cityScreen)
        });

        const marketLabel = `📊  Market Intel (${s.marketState} market)`;
        options.push({
            label: marketLabel,
            action: () => safePush(newsScreen)
        });

        if (pendingCount > 0) {
            options.push({
                label: `💼  Pending Offers (${pendingCount} awaiting response)`,
                action: () => safePush(phoneScreen)
            });
        }

        // ═══ YOU ═══
        options.push({ label: `═══ YOU ═══`, disabled: true, _sectionHeader: true });
        options.push({
            label: `🪞  Ego Dashboard & Profile`,
            action: () => {
                if (window.toggleEgoDashboard) window.toggleEgoDashboard(true);
            }
        });
        options.push({
            label: unreadMessages > 0 ? `📱  Phone (${unreadMessages} unread)` : `📱  Phone`,
            action: () => safePush(phoneScreen)
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

        options.push({
            label: '⏩  Advance Week →', action: () => {
                try {
                    TerminalAPI.advanceWeek();
                    ui.replaceScreen(dashboardScreen(ui));
                } catch (err) {
                    window.lastError = err.message;
                    ui.render();
                }
            }
        });

        return { lines, options };
    };
}
