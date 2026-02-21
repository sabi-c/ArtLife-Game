/**
 * src/terminal/screens/world.js
 * Extracted during Phase 41 Refactoring.
 * Covers City/Travel and News.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, SUB, DIV, DIM, GREEN, GOLD, RED, BLANK, STAT, NEWS } from './shared.js';
import { dashboardScreen, hasActions, useAction, getActionsRemaining } from './dashboard.js';
import { marketScreen } from './market.js';

// Fallback until cityData is properly imported via API or constants
const CITY_DATA = {
    'new-york': { name: 'New York', vibe: 'The center of the art market.', venues: ['Chelsea Galleries', 'Uptown Auction Houses', 'MoMA', 'Armory Show'], specialty: 'Contemporary & Blue Chip' },
    'london': { name: 'London', vibe: 'Historic and cosmopolitan.', venues: ['Mayfair Galleries', 'Sotheby\'s Bond St', 'Tate Modern', 'Frieze London'], specialty: 'YBA & Secondary Market' },
    'paris': { name: 'Paris', vibe: 'Elegance and providence.', venues: ['Marais Galleries', 'Drouot', 'Centre Pompidou', 'FIAC'], specialty: 'Modern & Impressionist' },
    'hong-kong': { name: 'Hong Kong', vibe: 'The gateway to Asia.', venues: ['H Queen\'s Galleries', 'Christie\'s Asia', 'M+', 'Art Basel HK'], specialty: 'Asian Contemporary & Luxury' },
    'switzerland': { name: 'Switzerland', vibe: 'Discreet wealth.', venues: ['Zurich Galleries', 'Geneva Freeports', 'Kunsthaus Zurich', 'Art Basel'], specialty: 'Blue Chip & Vaults' },
    'los-angeles': { name: 'Los Angeles', vibe: 'Sunny and superficial.', venues: ['Culver City Galleries', 'Sunset Auctions', 'LACMA', 'Frieze LA'], specialty: 'Pop & Emerging' },
    'miami': { name: 'Miami', vibe: 'Flashy and speculative.', venues: ['Wynwood Galleries', 'Design District', 'PAMM', 'Art Basel Miami Beach'], specialty: 'Street Art & NFTs' },
    'berlin': { name: 'Berlin', vibe: 'Gritty and experimental.', venues: ['Kreuzberg Galleries', 'Berlin Auctions', 'Hamburger Bahnhof', 'Gallery Weekend'], specialty: 'Digital & Installation' },
};

const TRAVEL_COSTS = {
    'new-york': 0,      // domestic
    'los-angeles': 2000, // domestic
    'miami': 2000,       // domestic
    'london': 3500,      // transatlantic
    'paris': 3500,       // transatlantic
    'berlin': 3500,      // EU
    'hong-kong': 5000,   // long haul
    'switzerland': 4000, // EU luxury
};

export function cityScreen(ui) {
    return () => {
        const s = TerminalAPI.state();
        const current = s.currentCity;
        const currentCity = CITY_DATA[current] || { name: current, vibe: '', venues: [], specialty: '' };
        const cities = Object.keys(CITY_DATA);
        const canAct = hasActions();

        const metContacts = TerminalAPI.network.getMetContacts();
        const jetContact = metContacts.find(c => c.favor >= 30);
        const jetData = jetContact ? TerminalAPI.contacts.find(cd => cd.id === jetContact.id) : null;

        const lines = [
            H(`CITY — ${currentCity.name.toUpperCase()}`),
            DIM(currentCity.vibe),
            DIV(),
            STAT('Cash', `$${s.cash.toLocaleString()}`),
            STAT('Actions', Array(3).fill(0).map((_, i) => i < getActionsRemaining() ? '■' : '□').join(' '), getActionsRemaining() === 0 ? 'red' : getActionsRemaining() === 1 ? 'gold' : 'green'),
            DIV(),
        ];

        if (currentCity.venues.length > 0) {
            lines.push(SUB('LOCAL VENUES'));
            currentCity.venues.forEach(v => lines.push(DIM(`  • ${v}`)));
            if (currentCity.specialty) {
                lines.push(DIM(`  Known for: ${currentCity.specialty}`));
            }
            lines.push(BLANK());
        }

        if (!canAct) {
            lines.push(RED('No actions remaining this week. Advance to next week.'));
            lines.push(BLANK());
        } else {
            lines.push(DIM('Travel costs 1 action + money. Choose a destination:'));
        }

        if (jetData) {
            lines.push(GREEN(`✈️ ${jetData.name} has offered their private jet (free travel + rep)`));
            lines.push(BLANK());
        }

        const options = cities
            .filter(c => c !== current)
            .map(city => {
                const cost = TRAVEL_COSTS[city] || 3000;
                const canAfford = s.cash >= cost;
                const dest = CITY_DATA[city] || { name: city };
                const label = `${dest.name.toUpperCase()} — $${cost.toLocaleString()}`;

                return {
                    label,
                    disabled: !canAfford || !canAct,
                    action: () => {
                        useAction(`Traveled to ${dest.name}`);
                        s.cash -= cost;
                        TerminalAPI.initGame.changeCity?.(city); // Adjust this once we find where changeCity lives
                        // Typically MarketManager.tick() happens but we can just use the facade
                        TerminalAPI.market.tick();
                        ui.popScreen();
                        ui.replaceScreen(dashboardScreen(ui));
                    }
                };
            });

        if (jetData && canAct) {
            options.push({
                label: `✈️ Use ${jetData.name}'s jet (free, +3 rep, 1 action)`,
                action: () => {
                    useAction(`Flew on ${jetData.name}'s jet`);
                    const dests = cities.filter(c => c !== current);
                    const dest = dests[Math.floor(Math.random() * dests.length)];
                    TerminalAPI.initGame.changeCity?.(dest);
                    s.reputation = Math.min(100, s.reputation + 3);
                    TerminalAPI.addNews(`✈️ Flew on ${jetData.name}'s jet to ${dest.replace(/-/g, ' ')}.`);
                    TerminalAPI.market.tick();
                    ui.popScreen();
                    ui.replaceScreen(dashboardScreen(ui));
                }
            });
        }

        if (canAct && currentCity.venues.length > 0) {
            options.push({
                label: `🖼️ Visit Gallery — Browse curated selection (1 action)`,
                action: () => {
                    useAction('Visited local gallery');
                    s.taste = Math.min(100, s.taste + 1);
                    ui.pushScreen(marketScreen(ui));
                }
            });
            options.push({
                label: `🔨 Auction House — Bid on premium lots (1 action)`,
                action: () => {
                    useAction('Attended auction');
                    s.access = Math.min(100, s.access + 1);
                    ui.pushScreen(marketScreen(ui));
                }
            });
            options.push({
                label: `🏛️ Visit Museum — Study the masters (+3 taste, +2 rep)`,
                action: () => {
                    useAction('Visited museum');
                    s.taste = Math.min(100, s.taste + 3);
                    s.reputation = Math.min(100, s.reputation + 2);
                    TerminalAPI.addNews(`🏛️ Spent the day at ${currentCity.venues[2] || 'the museum'}. Taste refined.`);
                    ui.replaceScreen(cityScreen(ui));
                }
            });
            if (s.cash >= 1000) {
                options.push({
                    label: `🌟 Art Fair — Network & browse ($1,000 entry, +3 access, 1 action)`,
                    action: () => {
                        useAction('Attended art fair');
                        s.cash -= 1000;
                        s.access = Math.min(100, s.access + 3);
                        s.reputation = Math.min(100, s.reputation + 1);
                        TerminalAPI.addNews(`🌟 Attended ${currentCity.venues[3] || 'the art fair'}. New connections made.`);
                        TerminalAPI.network.meetRandomContact();
                        ui.replaceScreen(cityScreen(ui));
                    }
                });
            }
        }

        options.push({ label: '← Back', action: () => ui.popScreen() });
        return { lines, options };
    };
}

export function newsScreen(ui) {
    return () => {
        const feed = TerminalAPI.state().newsFeed || [];
        const lines = [
            H('NEWS FEED'),
            DIV(),
        ];

        if (feed.length === 0) {
            lines.push(DIM('Nothing to report yet.'));
        } else {
            feed.slice().reverse().forEach(item => {
                lines.push(NEWS(typeof item === 'string' ? item : item.text));
            });
        }

        const options = [
            { label: '← Back', action: () => ui.popScreen() },
        ];

        return { lines, options };
    };
}
