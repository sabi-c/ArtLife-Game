/**
 * src/terminal/screens/dashboard.js
 * Main dashboard hub — the player's home screen in the terminal UI.
 *
 * Sub-modules (extracted for maintainability):
 *   - shared-helpers.js: action budget, sparkline, statBarHtml, generateFlavorNews
 *   - dashboard-venue.js: venue picker, room explorer, NPC talk
 *   - dashboard-weekly.js: week transition, weekly report
 *   - dashboard-cutscenes.js: test cutscene launcher
 *
 * This file retains: dashboardScreen, calendarEventScreen, and all
 * dashboard-specific HTML generators (status strip, trace bars, calendar,
 * world map, menu cards, action budget panel).
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, SUB, DIV, BLANK, DIM, GOLD, GREEN, RED, STAT, NEWS, WORLDMAP } from './shared.js';
import { TickerSystem } from '../../shared/TickerSystem.js';
import { GameEventBus, GameEvents } from '../../../managers/GameEventBus.js';
import { VIEW, OVERLAY } from '../../../core/views.js';
import { characterSelectScreen } from './character.js';
import { marketScreen, portfolioScreen } from './market.js';
import { phoneScreen } from './phone.js';
import { cityScreen, newsScreen } from './world.js';
import { eventScreen, eventStepScreen } from './events.js';
import { journalScreen, legacyEndScreen } from './journal.js';
import { pauseMenuScreen } from './system.js';
import { getUpcomingEvents } from '../../../data/calendar_events.js';
import { egoDashboardScreen } from './ego.js';

// ── Sub-module imports ──
import { venuePickerScreen } from './dashboard-venue.js';
import { weekTransitionScreen as _weekTransitionScreen, weekReportScreen as _weekReportScreen } from './dashboard-weekly.js';
import { testVenueCutscenesScreen } from './dashboard-cutscenes.js';

// ── Re-exports from shared-helpers (backwards compatibility for barrel imports) ──
export { MAX_ACTIONS, getActionsRemaining, useAction, hasActions } from './shared-helpers.js';
export { sparkline, statBarHtml, generateFlavorNews } from './shared-helpers.js';
import { MAX_ACTIONS, getActionsRemaining, useAction, hasActions, sparkline, statBarHtml, generateFlavorNews } from './shared-helpers.js';

// Wrap weekly screens with a dashboardScreen callback to avoid circular refs
function weekTransitionScreen(ui) {
    return _weekTransitionScreen(ui, dashboardScreen);
}

// Lazy wrapper so ego.js doesn't need to be loaded at parse time
function egoDashboardScreenLazy(ui) {
    return egoDashboardScreen(ui);
}

// ════════════════════════════════════════════
// Menu Card Helper
// ════════════════════════════════════════════
function menuCardHtml(title, icon, items, options, startIndex) {
    if (items.length === 0) return { html: '', nextIndex: startIndex };
    let html = `<div class="db-mc-card">`;
    html += `<div class="db-mc-title"><span class="db-mc-title-icon">${icon}</span>${title}</div>`;
    let idx = startIndex;
    items.forEach(item => {
        const disabledCls = item.disabled ? ' disabled' : '';
        const apBadge = item.ap ? `<span class="db-mc-ap">${item.ap} AP</span>` : '';
        const badge = item.badge ? `<span class="db-mc-badge">${item.badge}</span>` : '';
        const itemIcon = item.icon || '';
        html += `<div class="db-mc-item${disabledCls}" data-option-index="${idx}">`;
        html += `<span class="db-mc-item-icon">${itemIcon}</span>`;
        html += `<span class="db-mc-item-label">${item.label}</span>`;
        html += apBadge + badge;
        html += `</div>`;
        idx++;
    });
    html += `</div>`;
    return { html, nextIndex: idx };
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

function calendarPanelHtml(currentWeek, month, year) {
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const currentMonthIdx = Math.floor((currentWeek - 1) / 4) % 12;
    const allEvents = getUpcomingEvents(currentWeek, 52);

    // This week section
    const thisWeek = allEvents.filter(e => e.weeksAway === 0);

    // Group all events by month
    const eventsByMonth = {};
    allEvents.forEach(ev => {
        const evWeek = currentWeek + ev.weeksAway;
        const evMonthIdx = Math.floor((evWeek - 1) / 4) % 12;
        if (!eventsByMonth[evMonthIdx]) eventsByMonth[evMonthIdx] = [];
        eventsByMonth[evMonthIdx].push(ev);
    });

    let html = `<div class="db-cal-panel">`;
    html += `<div class="db-panel-header">CALENDAR · ${month} ${year}</div>`;

    // This Week section
    if (thisWeek.length > 0) {
        html += `<div class="db-cal-section-label">THIS WEEK</div>`;
        thisWeek.forEach(ev => {
            const icon = CAL_ICONS[ev.type] || '▸';
            const tierCls = ev.tier === 1 ? 'tier1' : 'tier2';
            html += `<div class="db-cal-event" data-event-id="${ev.id || ''}">`;
            html += `<span class="db-cal-icon gold">${icon}</span>`;
            html += `<span class="db-cal-name ${tierCls}">${ev.name}</span>`;
            html += `<span class="db-cal-loc">${ev.location}</span>`;
            html += `<span class="db-cal-dist now">NOW</span>`;
            html += `</div>`;
        });
    }

    // 12-month horizontal timeline
    html += `<div class="db-cal-timeline">`;
    for (let i = 0; i < 12; i++) {
        const mIdx = (currentMonthIdx + i) % 12;
        const isCurrent = i === 0;
        const monthEvents = eventsByMonth[mIdx] || [];

        html += `<div class="db-cal-month${isCurrent ? ' current' : ''}">`;
        html += `<div class="db-cal-month-label">${MONTHS[mIdx]}</div>`;

        monthEvents.slice(0, 3).forEach(ev => {
            const color = EVENT_COLORS[ev.type] || '#00e5ff';
            const tierCls = ev.tier === 1 ? ' tier1' : ' tier2';
            html += `<div class="db-cal-bar${tierCls}" style="background:${color}" data-event-id="${ev.id || ''}" title="${ev.name} — ${ev.location}"></div>`;
        });

        if (monthEvents.length > 3) {
            html += `<div class="db-cal-more">+${monthEvents.length - 3}</div>`;
        }
        html += `</div>`;
    }
    html += `</div>`;

    if (thisWeek.length === 0 && allEvents.length === 0) {
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

// ════════════════════════════════════════════
// SVG World Map (Uplink-style)
// ════════════════════════════════════════════
const CITY_COORDS = {
    'new-york': { x: 235, y: 155, label: 'New York' },
    'london': { x: 380, y: 110, label: 'London' },
    'paris': { x: 395, y: 135, label: 'Paris' },
    'berlin': { x: 415, y: 115, label: 'Berlin' },
    'hong-kong': { x: 670, y: 200, label: 'Hong Kong' },
    'miami': { x: 215, y: 210, label: 'Miami' },
    'los-angeles': { x: 140, y: 170, label: 'Los Angeles' },
    'switzerland': { x: 400, y: 140, label: 'Basel' },
};

const EVENT_COLORS = { fair: '#00e5ff', auction: '#c9a84c', biennale: '#bb86fc', market: '#00e5ff', social: '#4caf50', exhibition: '#4caf50' };

function generateWorldMapSVG(currentWeek) {
    const s = TerminalAPI.state();
    const currentCity = s.currentCity || 'new-york';
    const currentCityName = CITY_NAMES[currentCity] || currentCity;
    const visitedCities = s.visitedCities || [currentCity];

    // Gather events grouped by city
    const events = getUpcomingEvents(currentWeek, 4);
    const eventsByCity = {};
    events.forEach(e => {
        const cityId = LOCATION_TO_CITY[e.location];
        if (cityId) {
            if (!eventsByCity[cityId]) eventsByCity[cityId] = [];
            eventsByCity[cityId].push(e);
        }
    });

    // Build SVG elements
    let svgContent = '';

    // Background map image (subtle)
    svgContent += `<image href="assets/world_map.svg" x="0" y="0" width="800" height="400" opacity="0.08" style="filter:hue-rotate(180deg) saturate(0.5) brightness(1.5)"/>`;

    // Grid lines for Uplink feel
    for (let x = 0; x <= 800; x += 100) {
        svgContent += `<line x1="${x}" y1="0" x2="${x}" y2="400" stroke="rgba(0,229,255,0.04)" stroke-width="0.5"/>`;
    }
    for (let y = 0; y <= 400; y += 50) {
        svgContent += `<line x1="0" y1="${y}" x2="800" y2="${y}" stroke="rgba(0,229,255,0.04)" stroke-width="0.5"/>`;
    }

    // Flight path arcs between visited cities
    const visitedSet = new Set(visitedCities);
    const visitedArr = [...visitedSet];
    for (let i = 0; i < visitedArr.length - 1; i++) {
        const from = CITY_COORDS[visitedArr[i]];
        const to = CITY_COORDS[visitedArr[i + 1]];
        if (from && to) {
            const mx = (from.x + to.x) / 2;
            const my = Math.min(from.y, to.y) - 30;
            svgContent += `<path d="M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}" class="wm-svg-route"/>`;
        }
    }
    // Current travel line (from last visited to current)
    if (visitedArr.length > 0) {
        const last = CITY_COORDS[visitedArr[visitedArr.length - 1]];
        const curr = CITY_COORDS[currentCity];
        if (last && curr && last !== curr) {
            const mx = (last.x + curr.x) / 2;
            const my = Math.min(last.y, curr.y) - 30;
            svgContent += `<path d="M${last.x},${last.y} Q${mx},${my} ${curr.x},${curr.y}" class="wm-svg-route wm-svg-route-active"/>`;
        }
    }

    // City dots, labels, event markers
    Object.entries(CITY_COORDS).forEach(([cityId, c]) => {
        const isCurrent = cityId === currentCity;
        const cityEvents = eventsByCity[cityId] || [];

        // Event markers (offset rings)
        cityEvents.forEach((ev, i) => {
            const color = EVENT_COLORS[ev.type] || '#00e5ff';
            const offset = 10 + i * 8;
            svgContent += `<circle cx="${c.x + offset}" cy="${c.y - 6}" r="3" fill="${color}" class="wm-svg-event" opacity="0.8"/>`;
        });

        // City dot
        if (isCurrent) {
            svgContent += `<circle cx="${c.x}" cy="${c.y}" r="5" class="wm-svg-player" data-city="${cityId}"/>`;
            svgContent += `<circle cx="${c.x}" cy="${c.y}" r="10" class="wm-svg-player-ring"/>`;
        } else {
            svgContent += `<circle cx="${c.x}" cy="${c.y}" r="3.5" class="wm-svg-city" data-city="${cityId}"/>`;
        }

        // City label
        svgContent += `<text x="${c.x}" y="${c.y + 16}" class="wm-svg-label" data-city="${cityId}">${c.label}</text>`;
    });

    // Legend
    svgContent += `<text x="10" y="390" class="wm-svg-legend">`;
    svgContent += `<tspan fill="#00e5ff">●</tspan> Fair  `;
    svgContent += `<tspan fill="#c9a84c">●</tspan> Auction  `;
    svgContent += `<tspan fill="#bb86fc">●</tspan> Biennale  `;
    svgContent += `<tspan fill="#4caf50">●</tspan> Social`;
    svgContent += `</text>`;

    return {
        type: 'raw',
        text: `<div class="wm-svg-container">`
            + `<div class="wm-svg-header">WORLD MAP · ${currentCityName.toUpperCase()}</div>`
            + `<svg viewBox="0 0 800 400" class="wm-svg-map">${svgContent}</svg>`
            + `</div>`
    };
}

// ════════════════════════════════════════════
// Status Strip (Uplink-style top bar)
// ════════════════════════════════════════════
function statusStripHtml(s, month, year, netWorth) {
    const cityDisplay = CITY_NAMES[s.currentCity] || 'New York';
    return `<div class="db-status-strip">`
        + `<span class="db-ss-item"><span class="db-ss-dot secure"></span>CONNECTION: SECURE</span>`
        + `<span class="db-ss-item">WEEK ${s.week}</span>`
        + `<span class="db-ss-item">${month} ${year}</span>`
        + `<span class="db-ss-item">${cityDisplay.toUpperCase()}</span>`
        + `<span class="db-ss-item db-ss-worth">NET WORTH: $${netWorth.toLocaleString()}</span>`
        + `</div>`;
}

// ════════════════════════════════════════════
// Trace Bar (Uplink-style progress bars)
// ════════════════════════════════════════════
function traceBarHtml(label, value, max, color) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    const severity = pct >= 80 ? 'critical' : pct >= 50 ? 'warning' : 'normal';
    return `<div class="db-trace-bar">`
        + `<span class="db-trace-label">${label}</span>`
        + `<div class="db-trace-track">`
        + `<div class="db-trace-fill ${severity}" style="width:${pct}%;background:${color}"></div>`
        + `</div>`
        + `<span class="db-trace-val">${Math.round(value)}/${max}</span>`
        + `</div>`;
}

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

        // ── Status Strip (Uplink-style) ──
        lines.push({ type: 'raw', text: statusStripHtml(s, month, year, netWorth) });

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

        // ── Calendar Timeline ──
        lines.push({ type: 'raw', text: calendarPanelHtml(s.week, month, year) });

        // ── Trace Bars (Uplink-style anti-resource meters) ──
        const showHeat = s.marketHeat >= 10;
        const showBurnout = s.burnout >= 3;
        const showSuspicion = (s.suspicion || 0) >= 3;
        if (showHeat || showBurnout || showSuspicion) {
            let traceHtml = `<div class="db-trace-panel">`;
            if (showHeat) traceHtml += traceBarHtml('HEAT', s.marketHeat, 100, 'var(--red)');
            if (showBurnout) traceHtml += traceBarHtml('BURNOUT', s.burnout, 10, '#ff9800');
            if (showSuspicion) traceHtml += traceBarHtml('SUSPICION', s.suspicion, 100, '#bb86fc');
            traceHtml += `</div>`;
            lines.push({ type: 'raw', text: traceHtml });
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

        // ── Art Market Flow Panel (mid/late game) ──
        if (s.week > 4) {
            const weeklyReport = TerminalAPI.npcMarket.getWeeklyReport();
            const recentTrades = TerminalAPI.npcMarket.getArtFlow(10);
            const topCollections = TerminalAPI.npcMarket.getTopCollections(3);

            if (weeklyReport || recentTrades.length > 0) {
                let flowHtml = `<div class="db-panel"><div class="db-panel-header">ART MARKET FLOW</div>`;

                // Weekly summary
                if (weeklyReport) {
                    flowHtml += `<div class="db-news-item"><span class="db-news-marker">📊</span> `
                        + `Week ${weeklyReport.week}: ${weeklyReport.tradesExecuted} trade${weeklyReport.tradesExecuted !== 1 ? 's' : ''}`
                        + (weeklyReport.totalVolume > 0 ? ` · $${weeklyReport.totalVolume.toLocaleString()} volume` : '')
                        + `</div>`;
                }

                // Recent trades (show last 5)
                recentTrades.slice(-5).reverse().forEach(t => {
                    const buyer = TerminalAPI.contacts.find(c => c.id === t.buyer);
                    const seller = TerminalAPI.contacts.find(c => c.id === t.seller);
                    const artwork = TerminalAPI.artworks.find(a => a.id === t.artwork);
                    const buyerName = buyer?.name?.split(' ')[0] || t.buyer;
                    const sellerName = seller?.name?.split(' ')[0] || t.seller;
                    const title = artwork?.title || t.artwork;
                    flowHtml += `<div class="db-news-item"><span class="db-news-marker">▸</span> `
                        + `${buyerName} ← "${title}" ← ${sellerName} · $${t.price.toLocaleString()}</div>`;
                });

                // Top collectors
                if (topCollections.length > 0) {
                    flowHtml += `<div style="margin-top:6px;color:#5a5a6a;font-size:10px;letter-spacing:1px">TOP COLLECTORS</div>`;
                    topCollections.forEach((p, i) => {
                        const medal = ['🥇', '🥈', '🥉'][i] || '  ';
                        flowHtml += `<div class="db-news-item"><span class="db-news-marker">${medal}</span> `
                            + `${p.name} · ${p.collectionSize} pcs · $${p.collectionValue.toLocaleString()}</div>`;
                    });
                }

                flowHtml += `</div>`;
                lines.push({ type: 'raw', text: flowHtml });
            }
        }

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
            lines.push(generateWorldMapSVG(s.week));
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
                action: () => ui.replaceScreen(weekTransitionScreen(ui)),
            });
        }

        // ── Progressive Disclosure Phases ──
        const phase = s.week <= 4 ? 'early' : s.week <= 12 ? 'mid' : 'late';

        // ── Build Menu Card Items (flat options array stays as keyboard nav source) ──
        // MARKET DESK card items
        const marketItems = [];
        marketItems.push({
            icon: '🖼️', label: `Browse Market (${availableWorks})`, ap: 1,
            disabled: !hasActions(1),
        });
        options.push({
            label: `Browse Market (${availableWorks} works)`,
            disabled: !hasActions(1),
            action: hasActions(1) ? () => safePush(marketScreen) : undefined
        });

        marketItems.push({
            icon: '📁', label: `My Collection (${s.portfolio.length})`,
            badge: `$${portfolioValue.toLocaleString()}`,
        });
        options.push({
            label: `My Collection (${s.portfolio.length} works)`,
            action: () => safePush(portfolioScreen)
        });

        // THIS WEEK card items
        const weekItems = [];
        try {
            const thisWeekEvents = getUpcomingEvents(s.week, 1).filter(e => e.weeksAway === 0);
            if (thisWeekEvents.length > 0 && phase !== 'early') {
                thisWeekEvents.forEach(ev => {
                    const evIcon = CAL_ICONS[ev.type] || '▸';
                    const cost = ev.cost > 0 ? ev.cost : 0;
                    const apCost = ev.tier === 1 ? 2 : 1;
                    const canAfford = s.cash >= cost;
                    const canAttend = hasActions(apCost) && canAfford;
                    const costLabel = cost > 0 ? ` · $${cost.toLocaleString()}` : '';
                    weekItems.push({
                        icon: evIcon, label: `${ev.name} (${ev.location}${costLabel})`, ap: apCost,
                        disabled: !canAttend,
                    });
                    options.push({
                        label: `${ev.name} (${ev.location})`,
                        disabled: !canAttend,
                        action: canAttend ? () => ui.pushScreen(calendarEventScreen(ui, ev, apCost)) : undefined
                    });
                });
            }
        } catch (e) {
            window.ArtLife?.recordError('Dashboard.ThisWeek', e);
            weekItems.push({ icon: '⚠️', label: 'Error loading calendar', disabled: true });
        }

        // OPERATIONS card items
        const opsItems = [];
        try {
            const venueLocked = phase === 'early';
            opsItems.push({ icon: '🎨', label: venueLocked ? 'Visit Venue (Locked)' : 'Visit Venue', ap: 1, disabled: venueLocked || !hasActions(1) });
            options.push({
                label: venueLocked ? 'Visit Venue (Locked)' : 'Visit Venue',
                disabled: venueLocked || !hasActions(1),
                action: (!venueLocked && hasActions(1)) ? () => safePush(venuePickerScreen) : undefined
            });

            const walkLocked = phase !== 'late';
            opsItems.push({ icon: '🗺️', label: walkLocked ? 'Walk the Neighborhood (Locked)' : 'Walk the Neighborhood', disabled: walkLocked });
            options.push({
                label: walkLocked ? 'Walk the Neighborhood (Locked)' : 'Walk the Neighborhood',
                disabled: walkLocked,
                action: !walkLocked ? () => GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'WorldScene', { ui }) : undefined
            });

            const travelLocked = phase === 'early';
            opsItems.push({ icon: '✈️', label: travelLocked ? `Travel (${cityInfo.name}) (Locked)` : `Travel (${cityInfo.name})`, ap: 1, disabled: travelLocked || !hasActions(1) });
            options.push({
                label: travelLocked ? `Travel (${cityInfo.name}) (Locked)` : `Travel (${cityInfo.name})`,
                disabled: travelLocked || !hasActions(1),
                action: (!travelLocked && hasActions(1)) ? () => ui.pushScreen(cityScreen(ui)) : undefined
            });

            const intelLocked = phase === 'early';
            opsItems.push({ icon: '📊', label: intelLocked ? 'Market Intel (Locked)' : `Market Intel`, badge: intelLocked ? undefined : s.marketState.toUpperCase(), disabled: intelLocked });
            options.push({
                label: intelLocked ? 'Market Intel (Locked)' : `Market Intel (${s.marketState})`,
                disabled: intelLocked,
                action: !intelLocked ? () => GameEventBus.emit(GameEvents.UI_TOGGLE_OVERLAY, OVERLAY.MARKET_DASHBOARD) : undefined
            });

            // Bloomberg Terminal (mid/late game, costs 1 AP)
            const bloombergLocked = phase === 'early';
            opsItems.push({ icon: '💹', label: bloombergLocked ? 'Market Terminal (Locked)' : 'Market Terminal', ap: 1, disabled: bloombergLocked || !hasActions(1) });
            options.push({
                label: bloombergLocked ? 'Market Terminal (Locked)' : 'Market Terminal (Bloomberg)',
                disabled: bloombergLocked || !hasActions(1),
                action: (!bloombergLocked && hasActions(1)) ? () => {
                    useAction('Checked Market Terminal');
                    GameEventBus.emit(GameEvents.UI_TOGGLE_OVERLAY, OVERLAY.BLOOMBERG);
                } : undefined
            });

            if (pendingCount > 0) {
                opsItems.push({ icon: '💼', label: `Pending Offers`, badge: `${pendingCount}` });
                options.push({
                    label: `Pending Offers (${pendingCount})`,
                    action: () => safePush(phoneScreen)
                });
            }
        } catch (e) {
            window.ArtLife?.recordError('Dashboard.Operations', e);
            opsItems.push({ icon: '⚠️', label: 'Error loading operations', disabled: true });
        }

        // DOSSIER card items
        const dossierItems = [];
        try {
            const invLocked = phase !== 'late';
            dossierItems.push({ icon: '🧰', label: invLocked ? 'Inventory & Artifacts (Locked)' : 'Inventory & Artifacts', disabled: invLocked });
            options.push({
                label: invLocked ? 'Inventory & Artifacts (Locked)' : 'Inventory & Artifacts',
                disabled: invLocked,
                action: !invLocked ? () => GameEventBus.emit(GameEvents.UI_TOGGLE_OVERLAY, 'INVENTORY') : undefined
            });

            const egoLocked = phase === 'early';
            dossierItems.push({ icon: '🪞', label: egoLocked ? 'Ego Dashboard (Locked)' : 'Ego Dashboard', disabled: egoLocked });
            options.push({
                label: egoLocked ? 'Ego Dashboard & Profile (Locked)' : 'Ego Dashboard & Profile',
                disabled: egoLocked,
                action: !egoLocked ? () => safePush(() => egoDashboardScreenLazy(ui)) : undefined
            });

            dossierItems.push({
                icon: '📱', label: unreadMessages > 0 ? `Phone (${unreadMessages} unread)` : 'Phone',
                ap: 1, disabled: !hasActions(1),
            });
            options.push({
                label: unreadMessages > 0 ? `Phone (${unreadMessages} unread)` : 'Phone',
                disabled: !hasActions(1),
                action: hasActions(1) ? () => safePush(phoneScreen) : undefined
            });

            const journalLocked = phase === 'early';
            dossierItems.push({ icon: '📓', label: journalLocked ? 'Journal & Calendar (Locked)' : 'Journal & Calendar', disabled: journalLocked });
            options.push({
                label: journalLocked ? 'Journal & Calendar (Locked)' : 'Journal & Calendar',
                disabled: journalLocked,
                action: !journalLocked ? () => safePush(journalScreen) : undefined
            });
        } catch (e) {
            window.ArtLife?.recordError('Dashboard.Dossier', e);
            dossierItems.push({ icon: '⚠️', label: 'Error loading dossier', disabled: true });
        }

        // SYSTEM card items
        const systemItems = [];
        systemItems.push({ icon: '🎬', label: 'Test Venue Cutscenes' });
        options.push({ label: 'Test Venue Cutscenes', action: () => safePush(testVenueCutscenesScreen) });

        systemItems.push({ icon: '⚙️', label: 'System & Settings' });
        options.push({ label: 'System & Settings', action: () => safePush(pauseMenuScreen) });

        systemItems.push({ icon: '💻', label: 'System Admin (God Mode)' });
        options.push({ label: 'System Admin (God Mode)', action: () => GameEventBus.emit(GameEvents.UI_TOGGLE_OVERLAY, 'ADMIN') });

        if (s.week >= 26) {
            systemItems.push({ icon: '🌟', label: 'Retire — End career' });
            options.push({ label: 'Retire — End your career', action: () => safePush(legacyEndScreen) });
        }

        if (actionsLeft > 0) {
            systemItems.push({ icon: '⏩', label: 'Advance Week →' });
            options.push({ label: 'Advance Week →', action: () => ui.replaceScreen(weekTransitionScreen(ui)) });
        }

        // ── Build Menu Card HTML ──
        let cardIdx = actionsLeft === 0 ? 1 : 0; // skip priority advance-week option
        let cardsHtml = '<div class="db-mc-grid">';

        const mc1 = menuCardHtml('MARKET DESK', '🖼️', marketItems, options, cardIdx);
        cardsHtml += mc1.html; cardIdx = mc1.nextIndex;

        if (weekItems.length > 0) {
            const mc2 = menuCardHtml('THIS WEEK', '📅', weekItems, options, cardIdx);
            cardsHtml += mc2.html; cardIdx = mc2.nextIndex;
        }

        if (opsItems.length > 0) {
            const mc3 = menuCardHtml('OPERATIONS', '🎯', opsItems, options, cardIdx);
            cardsHtml += mc3.html; cardIdx = mc3.nextIndex;
        }

        const mc4 = menuCardHtml('DOSSIER', '📋', dossierItems, options, cardIdx);
        cardsHtml += mc4.html; cardIdx = mc4.nextIndex;

        const mc5 = menuCardHtml('SYSTEM', '⚙️', systemItems, options, cardIdx);
        cardsHtml += mc5.html;

        cardsHtml += '</div>';
        lines.push({ type: 'raw', text: cardsHtml });

        // Ticker bar — rendered as raw HTML below options
        const footerHtml = TickerSystem.generate('single');

        return { lines, options, footerHtml };
    };
}
