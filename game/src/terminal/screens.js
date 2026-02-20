/**
 * screens.js — All terminal screen renderers
 * 
 * Each function returns { lines: [], options: [] }
 * where lines are text/styled objects and options are selectable actions.
 */
import { GameState } from '../managers/GameState.js';
import { MarketManager } from '../managers/MarketManager.js';
import { ConsequenceScheduler } from '../managers/ConsequenceScheduler.js';
import { ARTISTS } from '../data/artists.js';
import { CHARACTERS } from '../data/characters.js';
import { CITY_DATA } from '../data/cities.js';
import { CONTACTS } from '../data/contacts.js';
import { PhoneManager } from '../managers/PhoneManager.js';
import { EventManager } from '../managers/EventManager.js';
import { DecisionLog } from '../managers/DecisionLog.js';
import { DialogueEngine } from '../managers/DialogueEngine.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { DEALER_SPRITES, PLAYER_SPRITE } from '../data/haggle_config.js';
import { BACKGROUND_TRAITS } from '../data/backgrounds.js';
import { getUpcomingEvents } from '../data/calendar_events.js';
import '../data/scenes.js';

// ════════════════════════════════════════════
// Helper to create line objects
// ════════════════════════════════════════════
const H = (text) => ({ type: 'header', text });
const SUB = (text) => ({ type: 'subheader', text });
const DIV = () => ({ type: 'divider' });
const BLANK = () => ({ type: 'blank' });
const DIM = (text) => ({ type: 'dim', text });
const GOLD = (text) => ({ type: 'gold', text });
const GREEN = (text) => ({ type: 'green', text });
const RED = (text) => ({ type: 'red', text });
const STAT = (label, value, color) => ({ type: 'stat', label, value, color });
const NEWS = (text) => ({ type: 'news', text });

// ── Scene & Cutscene Helpers (Agent-3) ──
const SCENE_HEADER = (title, location) => ({ type: 'scene-header', title, location });
const SCENE_TEXT = (text) => ({ type: 'scene-text', text });
const DIALOGUE = (speaker, text) => ({ type: 'dialogue', speaker, speakerName: speaker, text });
const SCENE_SEP = () => ({ type: 'scene-separator' });
const PIXEL_ART = (src, alt) => ({ type: 'pixel-art-bg', src, alt });

// Map event categories to backgrounds
const CATEGORY_BACKGROUNDS = {
    gallery: 'backgrounds/bg_gallery.png',
    social: 'backgrounds/bg_social.png',
    market: 'backgrounds/bg_market.png',
    drama: 'backgrounds/bg_drama.png',
    fair: 'backgrounds/bg_fair.png',
    opportunity: 'backgrounds/bg_opportunity.png',
    personal: 'backgrounds/bg_personal.png',
};

// Map event categories to location labels
const CATEGORY_LOCATIONS = {
    gallery: 'Gallery District',
    social: 'Private Event',
    market: 'The Market',
    drama: 'Undisclosed Location',
    fair: 'Convention Center',
    opportunity: 'Your Office',
    personal: 'Personal',
};
const SECTION = (text) => ({ type: 'section-header', text });

// World map line builder
const WORLDMAP = (title, rows, legend) => ({ type: 'worldmap', title, rows, legend });

/**
 * generateWorldMap — Builds a worldmap line for the dashboard
 * Shows current city (★), cities with upcoming events (●), and reachable cities (○)
 * Returns a worldmap line object ready to push into lines array
 */
function generateWorldMap(currentWeek) {
    const s = GameState.state;
    const currentCity = s.currentCity || 'new-york';
    const currentCityData = CITY_DATA[currentCity];

    // Get upcoming events in next 4 weeks
    const upcoming = getUpcomingEvents(currentWeek, 4);

    // Map event locations to city IDs
    const eventCities = {};
    const locationToCityId = {
        'New York': 'new-york', 'London': 'london', 'Paris': 'paris',
        'Hong Kong': 'hong-kong', 'Switzerland': 'switzerland', 'Basel': 'switzerland',
        'Los Angeles': 'los-angeles', 'Miami': 'miami', 'Berlin': 'berlin',
    };

    upcoming.forEach(ev => {
        const cityId = locationToCityId[ev.location];
        if (cityId && cityId !== currentCity) {
            if (!eventCities[cityId] || ev.weeksAway < eventCities[cityId].weeksAway) {
                eventCities[cityId] = ev;
            }
        }
    });

    // Build map rows — geographical layout
    // Each row is pre-built HTML with colored spans
    const cityMarker = (cityId, name) => {
        if (cityId === currentCity) {
            return `<span class="wm-current">★ ${name}</span>`;
        } else if (eventCities[cityId]) {
            const ev = eventCities[cityId];
            const weeksLabel = ev.weeksAway === 0 ? 'NOW' : `${ev.weeksAway}w`;
            return `<span class="wm-event">● ${name}</span> <span class="wm-event-label">${ev.name} (${weeksLabel})</span>`;
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
        `🗺️  WORLD MAP · ${(currentCityData?.name || currentCity).toUpperCase()}`,
        rows,
        '★ You are here  ● Event happening  ○ Reachable city'
    );
}

// ════════════════════════════════════════════
// Action Budget System
// ════════════════════════════════════════════
const MAX_ACTIONS = 3;

function getActionsRemaining() {
    return MAX_ACTIONS - (GameState.state.actionsUsed || 0);
}

function useAction(label) {
    if (!GameState.state.actionsUsed) GameState.state.actionsUsed = 0;
    GameState.state.actionsUsed++;
    GameState.addNews(`⏱️ ${label} (${getActionsRemaining()} actions left)`);
    return true;
}

function hasActions() {
    return getActionsRemaining() > 0;
}

// ════════════════════════════════════════════
// SCREEN: Character Select
// ════════════════════════════════════════════
export function characterSelectScreen(ui) {
    return () => {
        const lines = [
            H('═══  A R T L I F E  ═══'),
            DIM('A game of taste, capital, and reputation.'),
            BLANK(),
            SUB('Choose your background:'),
            BLANK(),
        ];

        const options = CHARACTERS.map(char => ({
            label: `${char.icon} ${char.name} — ${char.tagline}`,
            action: () => ui.replaceScreen(characterDetailScreen(ui, char))
        }));

        options.push({ label: '← Back to Title', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// UI State & Actions
// ════════════════════════════════════════════
// SCREEN: Character Detail
// ════════════════════════════════════════════
function characterDetailScreen(ui, char) {
    return () => {
        const lines = [
            H(`${char.icon} ${char.name}`),
            GOLD(char.tagline),
            DIV(),
            STAT('Starting Cash', `$${char.startingCash.toLocaleString()}`),
            STAT('Starting Collection', `${char.startingWorks} works`),
            STAT('Perk', char.perk),
            BLANK(),
            char.description,
            BLANK(),
            DIM('Are you ready to enter the market?'),
        ];

        const options = [
            {
                label: 'Customize Background →',
                action: () => {
                    ui.replaceScreen(characterSetupStepsScreen(ui, char, 0, {}));
                }
            },
            { label: '← Back to Selection', action: () => ui.replaceScreen(characterSelectScreen(ui)) }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Character Setup Steps (Name & Traits)
// ════════════════════════════════════════════
function characterSetupStepsScreen(ui, char, stepIndex, pendingTraits) {
    return () => {
        const traitsKeys = Object.keys(BACKGROUND_TRAITS);

        // Final Step: Name Input & Confirmation
        if (stepIndex >= traitsKeys.length) {
            const lines = [
                H('FINAL DETAILS'),
                DIM('Your background is set. What is your name?'),
                BLANK(),
                STAT('Role', char.name),
            ];

            traitsKeys.forEach(k => {
                const choice = BACKGROUND_TRAITS[k].options.find(o => o.id === pendingTraits[k]);
                if (choice) lines.push(STAT(BACKGROUND_TRAITS[k].label, choice.label));
            });

            lines.push(BLANK());
            lines.push(GOLD('Type your name below (or leave blank for "The Dealer"):'));

            // Options: We inject a text prompt instead of strict button options if possible,
            // but Terminal UI is purely option-based. Let's provide some realistic default names,
            // or we use JS prompt if we modify Terminal UI. The simplest is a few name options or a generic.
            // For now, let's just let them start.
            const options = [
                {
                    label: 'Use standard pseudonym "The Dealer" →',
                    action: () => finishSetup('The Dealer')
                },
                {
                    label: 'Use name "Julian Vance" →',
                    action: () => finishSetup('Julian Vance')
                },
                {
                    label: 'Use name "Sloane Sterling" →',
                    action: () => finishSetup('Sloane Sterling')
                },
                { label: '← Back to previous step', action: () => ui.popScreen() }
            ];

            const finishSetup = (playerName) => {
                char.playerName = playerName;
                char.selectedTraits = pendingTraits;
                GameState.init(char);
                ui.replaceScreen(prologueScreen(ui));
            };

            return { lines, options };
        }

        // Current Trait Step
        const currentKey = traitsKeys[stepIndex];
        const traitData = BACKGROUND_TRAITS[currentKey];

        const lines = [
            H('BACKGROUND DETAILS'),
            DIM(`Step ${stepIndex + 1} of ${traitsKeys.length}`),
            DIV(),
            SUB(traitData.label),
            DIM(traitData.description),
            BLANK()
        ];

        const options = traitData.options.map(opt => ({
            label: `${opt.label} — ${opt.description}`,
            action: () => {
                const updatedTraits = { ...pendingTraits, [currentKey]: opt.id };
                ui.pushScreen(characterSetupStepsScreen(ui, char, stepIndex + 1, updatedTraits));
            }
        }));

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Prologue / Tutorial
// ════════════════════════════════════════════
function prologueScreen(ui) {
    return () => {
        const s = GameState.state;
        const lines = [
            H('WELCOME TO THE SECONDARY MARKET'),
            DIV(),
            'You are now a player in the global art market. Your goal is to build a legacy',
            'by acquiring blue-chip works, navigating scandals, and cultivating relationships',
            'with the most powerful dealers and collectors in the world.',
            BLANK(),
            SUB('THE RULES OF PLAY'),
            DIM('• You have 3 ACTIONS per week. Buying, traveling, and socializing cost actions.'),
            DIM('• Art stored in freeports costs $200/mo. Art at home risks theft (1%/wk).'),
            DIM('• Reputation and Access are just as important as Cash.'),
            DIM('• Keep an eye on your Phone for exclusive deals and market intel.'),
            BLANK(),
            GOLD('You can Retire and secure your legacy after Week 26.'),
            DIV(),
        ];

        const options = [
            {
                label: 'Enter the Dashboard →',
                action: () => ui.replaceScreen(dashboardScreen(ui))
            }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Main Dashboard
// ════════════════════════════════════════════
export function dashboardScreen(ui) {
    return () => {
        const s = GameState.state;
        const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Math.floor((s.week - 1) / 4) % 12];
        const year = 2024 + Math.floor((s.week - 1) / 52);
        const portfolioValue = GameState.getPortfolioValue();

        const actionsLeft = getActionsRemaining();
        const cityInfo = CITY_DATA[s.currentCity] || { name: s.currentCity, vibe: '' };
        const netWorth = s.cash + portfolioValue;

        const lines = [
            H(`WEEK ${s.week} • ${month} ${year}`),
            STAT('ACTIONS', `${actionsLeft} / ${MAX_ACTIONS}`, actionsLeft === 0 ? 'red' : actionsLeft === 1 ? 'gold' : 'green'),
            DIV(),
            STAT('CASH', `$${s.cash.toLocaleString()}`, 'green'),
            STAT('COLLECTION', `$${portfolioValue.toLocaleString()}  (${s.portfolio.length} works)`),
            STAT('NET WORTH', `$${netWorth.toLocaleString()}`, 'gold'),
            STAT('MARKET', s.marketState.toUpperCase(), s.marketState === 'bull' ? 'green' : s.marketState === 'bear' ? 'red' : ''),
            DIV(),
            STAT('REP', s.reputation),
            STAT('TASTE', s.taste),
            STAT('ACCESS', s.access),
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
        if (s.newsFeed.length > 0) {
            lines.push(DIV());
            lines.push(SUB('LATEST NEWS'));
            s.newsFeed.slice(-3).reverse().forEach(n => {
                lines.push(NEWS(typeof n === 'string' ? n : n.text));
            });
        }

        // World Map
        lines.push(DIV());
        lines.push(generateWorldMap(s.week));

        // Unread messages badge
        const unread = PhoneManager.getUnreadCount ? PhoneManager.getUnreadCount() : 0;

        // Count available works
        const availableWorks = MarketManager.getAvailableWorks ? MarketManager.getAvailableWorks().length : 0;

        // Pending offers count
        const pendingCount = s.pendingOffers ? s.pendingOffers.length : 0;

        // Hot artists count (heat > 60)
        const hotArtists = ARTISTS ? ARTISTS.filter(a => (a.heat || 0) > 60).length : 0;

        // Check for pending scenes/events to surface as attendable
        const pendingEvents = ConsequenceScheduler.getPending ? ConsequenceScheduler.getPending() : [];
        const attendableScenes = pendingEvents.filter(p =>
            p.type === 'scene' && p.triggerWeek <= s.week + 1
        );
        const attendableEvents = pendingEvents.filter(p =>
            p.type === 'event_unlock' && p.triggerWeek <= s.week + 1
        );

        const options = [];

        // ═══ ART ═══
        options.push({ label: `═══ ART ═══`, disabled: true, _sectionHeader: true });
        options.push({
            label: `🖼️  Browse Market (${availableWorks} works available)`,
            action: () => ui.pushScreen(marketScreen(ui))
        });
        options.push({
            label: `📁  My Collection (${s.portfolio.length} works, $${portfolioValue.toLocaleString()})`,
            action: () => ui.pushScreen(portfolioScreen(ui))
        });

        // ═══ SOCIAL ═══
        options.push({ label: `═══ SOCIAL ═══`, disabled: true, _sectionHeader: true });
        const phoneLabel = unread > 0
            ? `📱  Phone (${unread} new message${unread > 1 ? 's' : ''})`
            : '📱  Phone — Messages & Contacts';
        options.push({
            label: phoneLabel,
            action: () => ui.pushScreen(phoneScreen(ui))
        });

        // Surface attendable scenes as "attend" options
        attendableScenes.forEach(scene => {
            const sceneName = scene.payload?.sceneId || 'An event';
            const displayName = sceneName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            options.push({
                label: `🍷  Attend: ${displayName} ← scheduled!`,
                action: () => {
                    // Remove from scheduler and launch
                    ConsequenceScheduler.removePending?.(scene);
                    GameState.state.pendingScene = null;

                    if (window.phaserGame) {
                        window.phaserGame.scene.start('LocationScene', {
                            venueId: scene.payload?.sceneId || 'gallery_monaco',
                            roomId: 'entrance',
                            ui
                        });
                        ui.pushScreen(() => ({ lines: [], options: [] })); // trap terminal
                    } else {
                        ui.pushScreen(sceneScreen(ui, scene.payload?.sceneId)); // fallback
                    }
                }
            });
        });

        // ═══ BUSINESS ═══
        options.push({ label: `═══ BUSINESS ═══`, disabled: true, _sectionHeader: true });
        options.push({
            label: `✈️  Travel (${cityInfo.name})`,
            action: () => ui.pushScreen(cityScreen(ui))
        });

        // Market intel summary
        const marketLabel = `📊  Market Intel (${s.marketState} market${hotArtists > 0 ? `, ${hotArtists} hot artist${hotArtists > 1 ? 's' : ''}` : ''})`;
        options.push({
            label: marketLabel,
            action: () => ui.pushScreen(newsScreen(ui))
        });

        if (pendingCount > 0) {
            options.push({
                label: `💼  Pending Offers (${pendingCount} awaiting response)`,
                action: () => ui.pushScreen(phoneScreen(ui))
            });
        }

        // ═══ YOU ═══
        options.push({ label: `═══ YOU ═══`, disabled: true, _sectionHeader: true });
        options.push({
            label: '📓  Journal & Calendar',
            action: () => ui.pushScreen(journalScreen(ui))
        });
        options.push({
            label: '📰  News Feed',
            action: () => ui.pushScreen(newsScreen(ui))
        });
        options.push({
            label: '☰  Menu',
            action: () => ui.pushScreen(pauseMenuScreen(ui))
        });

        // ──────────
        // Retire option after week 26
        if (s.week >= 26) {
            options.push({
                label: '🌟  Retire — End your career',
                action: () => ui.pushScreen(legacyEndScreen(ui))
            });
        }

        options.push({
            label: '⏩  Advance Week →', action: () => {
                // Check for events first
                const event = EventManager.checkForEvent();
                if (event) {
                    if (window.phaserGame) {
                        window.phaserGame.scene.start('DialogueScene', {
                            event,
                            ui,
                            onExit: () => {
                                GameState.advanceWeek();
                                MarketManager.tick();
                                GameState.autoSave();
                                ui.popScreen();
                                ui.replaceScreen(dashboardScreen(ui));
                            }
                        });
                        ui.pushScreen(() => ({ lines: [], options: [] })); // trap terminal
                    } else {
                        // Fallbacks for text mode
                        if (event.steps && event.steps.length > 0) {
                            ui.pushScreen(eventStepScreen(ui, event, 0));
                        } else {
                            ui.pushScreen(eventScreen(ui, event));
                        }
                    }
                } else {
                    GameState.advanceWeek();
                    MarketManager.tick();
                    GameState.autoSave();

                    // Fire notifications for week transition
                    if (ui.showNotification) {
                        ui.showNotification(`Week ${GameState.state.week} begins`, '📅', 2000);

                        // Notify about offer resolutions
                        const news = GameState.state.newsFeed || [];
                        const offerNews = news.filter(n => {
                            const text = typeof n === 'string' ? n : n.text;
                            return text && (text.includes('OFFER ACCEPTED') || text.includes('Offer on'));
                        });
                        offerNews.slice(-2).forEach(n => {
                            const text = typeof n === 'string' ? n : n.text;
                            ui.showNotification(text, '📬');
                        });
                    }

                    ui.replaceScreen(dashboardScreen(ui));

                    if (GameState.state.pendingScene) {
                        const sceneId = GameState.state.pendingScene;
                        GameState.state.pendingScene = null;
                        ui.pushScreen(sceneScreen(ui, sceneId));
                    }
                }
            }
        });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Market
// ════════════════════════════════════════════
export function marketScreen(ui) {
    return () => {
        const works = MarketManager.getAvailableWorks().slice(0, 8);
        const lines = [
            H('MARKET'),
            DIM('Works available for purchase'),
            DIV(),
        ];

        works.forEach((work, i) => {
            const artist = MarketManager.getArtist(work.artistId);
            const heat = artist ? Math.round(artist.heat) : '?';
            lines.push(`${work.title}`);
            lines.push(DIM(`  ${work.artist} • $${work.price.toLocaleString()} • Heat: ${heat}`));
        });

        if (works.length === 0) {
            lines.push(DIM('No works available right now.'));
        }

        const options = works.map((work, i) => ({
            label: `Inspect "${work.title}"`,
            action: () => ui.pushScreen(inspectScreen(ui, work))
        }));

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Inspect Work
// ════════════════════════════════════════════
export function inspectScreen(ui, work) {
    return () => {
        const artist = MarketManager.getArtist(work.artistId);
        const heat = artist ? Math.round(artist.heat) : '?';
        const s = GameState.state;
        const canAfford = s.cash >= work.price;

        const lines = [
            H(work.title),
            `${work.artist} (${work.yearCreated})`,
            DIM(work.medium || 'Mixed Media'),
            DIV(),
            STAT('PRICE', `$${work.price.toLocaleString()}`, 'gold'),
            STAT('ARTIST HEAT', `${heat} / 100`, heat > 60 ? 'green' : heat < 25 ? 'red' : ''),
            STAT('MARKET', s.marketState.toUpperCase(), s.marketState === 'bull' ? 'green' : s.marketState === 'bear' ? 'red' : ''),
        ];

        // Intel-gated warnings
        if (s.intel >= 60 && artist) {
            const artificial = MarketManager.detectArtificialFloor(work.artistId);
            if (artificial) {
                lines.push(DIV());
                lines.push(RED('⚠ INTEL: Gallery buyback detected. Price may be artificially supported.'));
                lines.push(DIM('  This artist\'s floor is being propped up. Risk of sudden crash.'));
            }
        }

        // Access influence on resale
        const accessBonus = Math.round((s.access - 50) * 0.2);
        if (accessBonus !== 0) {
            lines.push(DIM(`Your Access of ${s.access} gives ${accessBonus > 0 ? '+' : ''}${accessBonus}% on contact sales`));
        }

        lines.push(DIV());
        lines.push(DIM(`Your cash: $${s.cash.toLocaleString()}`));

        const options = [];
        const canAct = hasActions();
        if (canAfford && canAct) {
            options.push({
                label: `Buy for $${work.price.toLocaleString()} (1 action)`,
                action: () => {
                    useAction(`Bought "${work.title}"`);
                    GameState.buyWork(work);
                    ui.popScreen();
                    ui.replaceScreen(dashboardScreen(ui));
                }
            });
        } else if (!canAfford) {
            options.push({ label: `Can't afford ($${work.price.toLocaleString()})`, disabled: true });
        } else {
            options.push({ label: 'No actions remaining this week', disabled: true });
        }

        // Haggle Battle — Pokémon-style negotiation
        if (canAct && work.price > 1000) {
            options.push({
                label: '🎮 Haggle — Negotiate the price (1 action)',
                action: () => {
                    useAction(`Started haggling for "${work.title}"`);
                    const npc = null; // Anonymous market seller for now
                    const info = HaggleManager.start({
                        mode: 'buy',
                        work,
                        npc,
                        askingPrice: work.price,
                    });
                    ui.pushScreen(haggleScreen(ui, info));
                }
            });
        }

        // Request Viewing — costs 1 action, gives taste + intel
        if (canAct) {
            options.push({
                label: 'Request Viewing (+2 taste, +1 intel, 1 action)',
                action: () => {
                    useAction(`Viewed "${work.title}"`);
                    s.taste = Math.min(100, s.taste + 2);
                    s.intel += 1;
                    GameState.addNews(`🔍 Private viewing of "${work.title}" by ${work.artist}. Eye sharpened.`);
                    ui.replaceScreen(inspectScreen(ui, work));
                }
            });
        }

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Make Offer — Step 1: Choose Price
// ════════════════════════════════════════════
function makeOfferScreen(ui, work) {
    return () => {
        const s = GameState.state;
        const artist = MarketManager.getArtist(work.artistId);
        const heat = artist ? Math.round(artist.heat) : 50;

        // Base success influenced by rep, access, and artist heat
        const baseChance = Math.min(0.90, (s.reputation + s.access) / 200 + (100 - heat) / 300);

        // 4 price tiers with different success rates
        const tiers = [
            { label: 'Lowball', discount: 0.30, chanceMultiplier: 0.25, icon: '🗡️' },
            { label: 'Below Market', discount: 0.15, chanceMultiplier: 0.65, icon: '📉' },
            { label: 'Fair Offer', discount: 0.05, chanceMultiplier: 0.95, icon: '🤝' },
            { label: 'Full Ask', discount: 0.00, chanceMultiplier: 1.10, icon: '💰' },
        ];

        const lines = [
            H('MAKE AN OFFER'),
            DIM(`"${work.title}" by ${work.artist}`),
            STAT('Asking Price', `$${work.price.toLocaleString()}`, 'gold'),
            STAT('Artist Heat', `${heat} / 100`, heat > 60 ? 'green' : heat < 25 ? 'red' : ''),
            STAT('Your Rep', s.reputation),
            STAT('Your Access', s.access),
            DIV(),
            SUB('CHOOSE YOUR PRICE'),
            DIM('Lower offers save money but risk rejection.'),
            BLANK(),
        ];

        const options = [];

        tiers.forEach(tier => {
            const price = Math.round(work.price * (1 - tier.discount));
            const chance = Math.min(0.99, baseChance * tier.chanceMultiplier);
            const chancePct = Math.round(chance * 100);

            if (s.cash >= price) {
                const savings = tier.discount > 0 ? ` (${Math.round(tier.discount * 100)}% off)` : '';
                options.push({
                    label: `${tier.icon} ${tier.label}: $${price.toLocaleString()}${savings} — ${chancePct}% chance`,
                    action: () => ui.pushScreen(offerNoteScreen(ui, work, price, chance, tier.label))
                });
            } else {
                options.push({
                    label: `${tier.icon} ${tier.label}: $${price.toLocaleString()} — Can't afford`,
                    disabled: true
                });
            }
        });

        options.push({ label: '← Back to Inspect', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Make Offer — Step 2: Add a Note
// ════════════════════════════════════════════
function offerNoteScreen(ui, work, offerPrice, baseChance, tierLabel) {
    return () => {
        const saved = work.price - offerPrice;

        const notes = [
            {
                icon: '🤝',
                label: '"I\'ve long admired this artist\'s trajectory."',
                desc: 'Flattering — builds rapport',
                chanceBonus: 0.05,
                repBonus: 0,
            },
            {
                icon: '🏛️',
                label: '"This would anchor my collection for years to come."',
                desc: 'Collector\'s appeal — signals serious buyer',
                chanceBonus: 0.03,
                repBonus: 1,
            },
            {
                icon: '🗡️',
                label: '"I have other pieces I\'m considering. Let me know quickly."',
                desc: 'Pressure — risky but shows confidence',
                chanceBonus: -0.05,
                repBonus: 2,
            },
        ];

        const lines = [
            H('ADD A NOTE'),
            DIM(`Offering $${offerPrice.toLocaleString()} for "${work.title}"`),
            saved > 0 ? DIM(`Saving $${saved.toLocaleString()} off asking price`) : BLANK(),
            DIV(),
            SUB('A PERSONAL TOUCH CAN HELP'),
            DIM('Your note will be included with the offer.'),
            BLANK(),
        ];

        const options = notes.map(note => ({
            label: `${note.icon} ${note.label}`,
            action: () => {
                const finalChance = Math.min(0.99, Math.max(0.05, baseChance + note.chanceBonus));
                ui.pushScreen(offerSentScreen(ui, work, offerPrice, finalChance, note, tierLabel));
            }
        }));

        options.push({
            label: '📝 No note — just send the number.',
            action: () => ui.pushScreen(offerSentScreen(ui, work, offerPrice, baseChance, null, tierLabel))
        });

        options.push({ label: '← Back to Price', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Make Offer — Step 3: Sent & Response
// ════════════════════════════════════════════
function offerSentScreen(ui, work, offerPrice, finalChance, note, tierLabel) {
    return () => {
        const s = GameState.state;

        // Consume the action
        useAction(`Sent offer on "${work.title}"`);

        // Determine outcome now but reveal it next week
        const accepted = Math.random() < finalChance;
        const noteText = note ? note.label : 'No note attached.';

        // Add rep bonus from aggressive notes
        if (note && note.repBonus) {
            s.reputation = Math.min(100, s.reputation + note.repBonus);
        }

        // Schedule the response for next week via ConsequenceScheduler
        ConsequenceScheduler.addRelative(1, 'stat_change', {
            _offerResolution: true,
            workId: work.id,
            workTitle: work.title,
            workArtist: work.artist,
            offerPrice: offerPrice,
            accepted: accepted,
            tierLabel: tierLabel,
        }, { sourceEvent: `Offer on "${work.title}"` });

        // If accepted, reserve the work (remove from market preview)
        if (accepted) {
            // Mark it as pending — will auto-purchase when consequence fires
            if (!s.pendingOffers) s.pendingOffers = [];
            s.pendingOffers.push({
                workId: work.id,
                work: { ...work, price: offerPrice },
                offerPrice,
                accepted: true,
                resolveWeek: s.week + 1,
            });
        }

        // Generate the seller's initial response text
        const sellerResponses = accepted ? [
            `"Thank you for your offer. Let me discuss with the artist and get back to you."`,
            `"That's an interesting proposal. I'll need a day or two to consider."`,
            `"We appreciate your interest. You'll hear from us shortly."`,
        ] : [
            `"Thank you for the offer. We need to review with the consignor."`,
            `"Let me see what we can do. I'll be in touch."`,
            `"Noted. We'll get back to you within the week."`,
        ];
        const response = sellerResponses[Math.floor(Math.random() * sellerResponses.length)];

        GameState.addNews(`📤 Sent ${tierLabel.toLowerCase()} offer of $${offerPrice.toLocaleString()} on "${work.title}".`);

        const lines = [
            H('OFFER SENT'),
            BLANK(),
            DIM('📤 Sending offer to the gallery...'),
            BLANK(),
            STAT('Work', `"${work.title}"`),
            STAT('Your Offer', `$${offerPrice.toLocaleString()}`, 'gold'),
            STAT('Strategy', tierLabel),
            note ? DIM(`📝 ${noteText}`) : BLANK(),
            DIV(),
            BLANK(),
            DIM('⏳ The seller is reviewing your proposal...'),
            BLANK(),
            GOLD('📱 Incoming message from the gallery:'),
            BLANK(),
            `  ${response}`,
            BLANK(),
            DIM('You\'ll receive their final answer next week.'),
        ];

        const options = [
            {
                label: 'Continue →',
                action: () => {
                    // Clear offer flow screens and return to dashboard
                    // Stack may contain: [..., inspect, makeOffer, offerNote]
                    // Safely pop back to before inspect by trimming last 3
                    const trimCount = Math.min(3, ui.screenStack.length);
                    ui.screenStack = ui.screenStack.slice(0, -trimCount);
                    ui.replaceScreen(dashboardScreen(ui));
                }
            }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Portfolio
// ════════════════════════════════════════════
const STORAGE_ICONS = { 'home': '🏠', 'freeport': '🔒', 'gallery-loan': '🖼️' };
const STORAGE_LABELS = { 'home': 'Home', 'freeport': 'Freeport', 'gallery-loan': 'Gallery Loan' };

export function portfolioScreen(ui) {
    return () => {
        const s = GameState.state;
        const totalVal = GameState.getPortfolioValue();
        const freeportCount = s.portfolio.filter(w => w.storage === 'freeport').length;
        const freeportMonthlyCost = freeportCount * 200;

        const lines = [
            H('YOUR COLLECTION'),
            STAT('Total Value', `$${totalVal.toLocaleString()}`),
            STAT('Works', s.portfolio.length),
            STAT('In Freeport', `${freeportCount} ($${freeportMonthlyCost}/mo)`),
            DIV(),
        ];

        if (s.portfolio.length === 0 && s.activeDeals.length === 0) {
            lines.push(DIM('Empty. Visit the market to acquire your first piece.'));
        }

        s.portfolio.forEach(work => {
            const val = MarketManager.getWorkValue(work);
            const pnl = val - work.purchasePrice;
            const pnlSign = pnl >= 0 ? '+' : '';
            const pnlPct = Math.round(pnl / work.purchasePrice * 100);
            const storageIcon = STORAGE_ICONS[work.storage] || '📦';
            lines.push(`${storageIcon} ${work.title}`);
            lines.push(DIM(`  ${work.artist} • $${val.toLocaleString()} (${pnlSign}${pnlPct}%) • ${STORAGE_LABELS[work.storage] || work.storage}`));
        });

        // Pipeline
        if (s.activeDeals.length > 0) {
            lines.push(DIV());
            lines.push(SUB('── PIPELINE ──'));
            s.activeDeals.forEach(deal => {
                const weeksLeft = deal.resolutionWeek - s.week;
                lines.push(GOLD(`${deal.work.title}`));
                lines.push(DIM(`  ${deal.strategy.toUpperCase()} • resolves in ${weeksLeft} week(s)`));
            });
        }

        // Options: view each portfolio work
        const options = s.portfolio.map(work => ({
            label: `${STORAGE_ICONS[work.storage] || '📦'} View "${work.title}"`,
            action: () => ui.pushScreen(pieceDetailScreen(ui, work))
        }));

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Piece Detail (Portfolio Deep-Dive)
// ════════════════════════════════════════════
function pieceDetailScreen(ui, work) {
    return () => {
        const s = GameState.state;
        const val = MarketManager.getWorkValue(work);
        const pnl = val - work.purchasePrice;
        const pnlSign = pnl >= 0 ? '+' : '';
        const pnlPct = Math.round(pnl / work.purchasePrice * 100);
        const holdingWeeks = s.week - (work.purchaseWeek || 0);
        const artist = MarketManager.getArtist(work.artistId);
        const heat = artist ? Math.round(artist.heat) : '?';

        // Capital gains estimate (simplified: 20% on profit, 0% if held > 52 weeks)
        const longTermHold = holdingWeeks > 52;
        const taxRate = longTermHold ? 0.10 : 0.20;
        const taxEstimate = pnl > 0 ? Math.round(pnl * taxRate) : 0;
        const netProceeds = pnl > 0 ? val - taxEstimate : val;

        const storageIcon = STORAGE_ICONS[work.storage] || '📦';
        const storageLabel = STORAGE_LABELS[work.storage] || work.storage;

        const lines = [
            H(work.title),
            `${work.artist} (${work.yearCreated || '?'})`,
            DIM(work.medium || 'Mixed Media'),
            DIV(),
            STAT('Current Value', `$${val.toLocaleString()}`, 'gold'),
            STAT('Purchase Price', `$${(work.purchasePrice || 0).toLocaleString()}`),
            STAT('P&L', `${pnlSign}$${Math.abs(pnl).toLocaleString()} (${pnlSign}${pnlPct}%)`, pnl >= 0 ? 'green' : 'red'),
            STAT('Artist Heat', `${heat}/100`, heat > 60 ? 'green' : heat < 25 ? 'red' : ''),
            DIV(),
            STAT('Storage', `${storageIcon} ${storageLabel}`),
            STAT('Insured', work.insured ? '✅ Yes' : '❌ No'),
            STAT('Held For', `${holdingWeeks} weeks`),
            STAT('Purchased In', (work.purchaseCity || 'unknown').replace(/-/g, ' ').toUpperCase()),
            DIV(),
        ];

        // Tax info
        if (pnl > 0) {
            lines.push(DIM(`Tax estimate: $${taxEstimate.toLocaleString()} (${Math.round(taxRate * 100)}% ${longTermHold ? 'long-term' : 'short-term'})`));
            lines.push(DIM(`Net proceeds after tax: $${netProceeds.toLocaleString()}`));
        } else {
            lines.push(DIM('No capital gains (at or below cost basis).'));
        }

        // Provenance
        if (work.provenance && work.provenance.length > 0) {
            lines.push(DIV());
            lines.push(SUB('PROVENANCE'));
            work.provenance.forEach(entry => {
                const city = (entry.city || '').replace(/-/g, ' ');
                lines.push(DIM(`  Week ${entry.week}: ${entry.type} — ${city} ${entry.price ? '$' + entry.price.toLocaleString() : ''}`));
            });
        }

        const options = [];

        // Move storage
        const otherStorages = ['home', 'freeport', 'gallery-loan'].filter(s => s !== work.storage);
        otherStorages.forEach(targetStorage => {
            const cost = targetStorage === 'freeport' ? 500 : targetStorage === 'gallery-loan' ? 0 : 200;
            const label = `Move to ${STORAGE_LABELS[targetStorage]} ${cost > 0 ? `($${cost})` : '(free)'}`;
            options.push({
                label,
                disabled: s.cash < cost,
                action: () => {
                    s.cash -= cost;
                    const oldStorage = work.storage;
                    work.storage = targetStorage;
                    if (!work.provenance) work.provenance = [];
                    work.provenance.push({
                        type: `moved ${STORAGE_LABELS[oldStorage]} → ${STORAGE_LABELS[targetStorage]}`,
                        week: s.week,
                        city: s.currentCity,
                    });
                    GameState.addNews(`📦 Moved "${work.title}" to ${STORAGE_LABELS[targetStorage]}.`);

                    // Gallery loan builds rep
                    if (targetStorage === 'gallery-loan') {
                        s.reputation = Math.min(100, s.reputation + 3);
                        GameState.addNews(`🖼️ "${work.title}" now on display — reputation increased.`);
                    }

                    ui.replaceScreen(pieceDetailScreen(ui, work));
                }
            });
        });

        // Insurance toggle
        if (work.insured) {
            options.push({
                label: 'Cancel insurance',
                action: () => {
                    work.insured = false;
                    GameState.addNews(`🔓 Insurance cancelled on "${work.title}".`);
                    ui.replaceScreen(pieceDetailScreen(ui, work));
                }
            });
        } else {
            const insuranceCost = Math.round(val * 0.01); // 1% of value per year
            options.push({
                label: `Insure ($${insuranceCost.toLocaleString()}/yr)`,
                disabled: s.cash < insuranceCost,
                action: () => {
                    work.insured = true;
                    s.cash -= insuranceCost;
                    GameState.addNews(`🛡️ Insured "${work.title}" for $${insuranceCost.toLocaleString()}/yr.`);
                    ui.replaceScreen(pieceDetailScreen(ui, work));
                }
            });
        }

        // List for sale
        options.push({
            label: '💰 List for sale',
            action: () => ui.pushScreen(listWorkScreen(ui, work))
        });

        // Loan to museum
        if (work.storage !== 'gallery-loan') {
            options.push({
                label: '🏛️ Loan to Museum (+5 rep, +3 taste)',
                action: () => {
                    work.storage = 'gallery-loan';
                    s.reputation = Math.min(100, s.reputation + 5);
                    s.taste = Math.min(100, s.taste + 3);
                    if (!work.provenance) work.provenance = [];
                    work.provenance.push({
                        type: 'museum loan',
                        week: s.week,
                        city: s.currentCity,
                    });
                    GameState.addNews(`🏛️ "${work.title}" loaned to museum — taste and reputation increased.`);
                    ui.replaceScreen(pieceDetailScreen(ui, work));
                }
            });
        }

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: List Work for Sale
// ════════════════════════════════════════════
export function listWorkScreen(ui, work) {
    return () => {
        const val = MarketManager.getWorkValue(work);
        const pnl = val - work.purchasePrice;
        const pnlSign = pnl >= 0 ? '+' : '';

        // Tax estimate
        const holdingWeeks = GameState.state.week - (work.purchaseWeek || 0);
        const longTermHold = holdingWeeks > 52;
        const taxRate = longTermHold ? 0.10 : 0.20;
        const taxEstimate = pnl > 0 ? Math.round(pnl * taxRate) : 0;

        const lines = [
            H('LIST ARTWORK'),
            `${work.title} by ${work.artist}`,
            DIV(),
            STAT('Current Estimate', `$${val.toLocaleString()}`),
            STAT('Return', `${pnlSign}$${Math.abs(pnl).toLocaleString()}`, pnl >= 0 ? 'green' : 'red'),
            STAT('Tax on Sale', `$${taxEstimate.toLocaleString()} (${Math.round(taxRate * 100)}%)`),
            DIV(),
            SUB('Select a sales strategy:'),
            BLANK(),
            DIM('Pitch to Contact — Fast (1-2 weeks), relies on network'),
            DIM('Consign to Auction — Slow (3-4 weeks), high variance'),
            DIM('Public Listing — Medium (2-3 weeks), average return'),
        ];

        const options = [
            {
                label: 'Pitch to Contact', action: () => {
                    GameState.sellWork(work.id, 'contact');
                    // Clear back to dashboard — stack is: [...dashboard, portfolio, pieceDetail]
                    // Pop listWork (onScreen) + pieceDetail + portfolio from stack
                    const popCount = Math.min(3, ui.screenStack.length);
                    ui.screenStack.length = ui.screenStack.length - popCount;
                    ui.replaceScreen(dashboardScreen(ui));
                }
            },
            {
                label: 'Consign to Auction', action: () => {
                    GameState.sellWork(work.id, 'auction');
                    const popCount = Math.min(3, ui.screenStack.length);
                    ui.screenStack.length = ui.screenStack.length - popCount;
                    ui.replaceScreen(dashboardScreen(ui));
                }
            },
            {
                label: 'Public Listing', action: () => {
                    GameState.sellWork(work.id, 'public');
                    const popCount = Math.min(3, ui.screenStack.length);
                    ui.screenStack.length = ui.screenStack.length - popCount;
                    ui.replaceScreen(dashboardScreen(ui));
                }
            },
            { label: '← Cancel', action: () => ui.popScreen() },
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Phone (Messages Hub)
// ════════════════════════════════════════════
export function phoneScreen(ui) {
    return () => {
        const messages = PhoneManager.getRecentMessages(10);
        const unread = PhoneManager.getUnreadCount();
        const metContacts = PhoneManager.getMetContacts();

        const lines = [
            H('📱 PHONE'),
            STAT('Unread', unread, unread > 0 ? 'gold' : ''),
            STAT('Contacts', metContacts.length),
            DIV(),
        ];

        if (messages.length === 0) {
            lines.push(DIM('No messages yet. Advance weeks to receive intel and offers.'));
        } else {
            lines.push(SUB('RECENT MESSAGES'));
            messages.slice(0, 6).forEach(msg => {
                const readMark = msg.read ? '  ' : '● ';
                const urgBadge = msg.urgency === 'urgent' ? '🔴 ' : '';
                // Find NPC name
                const contact = CONTACTS.find(c => c.id === msg.from);
                const fromName = contact ? contact.name : (msg.from === 'system' ? 'SYSTEM' : msg.from);
                lines.push(`${readMark}${urgBadge}${fromName}`);
                lines.push(DIM(`  ${msg.subject}`));
            });
        }

        lines.push(DIV());

        const options = [];

        // Message options
        messages.slice(0, 5).forEach((msg, i) => {
            const contact = CONTACTS.find(c => c.id === msg.from);
            const fromName = contact ? contact.name : (msg.from === 'system' ? 'SYSTEM' : msg.from);
            options.push({
                label: `Read: ${fromName} — ${msg.subject}`,
                action: () => ui.pushScreen(messageDetailScreen(ui, msg))
            });
        });

        // Contacts option
        if (metContacts.length > 0) {
            options.push({
                label: `Contacts (${metContacts.length})`,
                action: () => ui.pushScreen(contactsScreen(ui))
            });
        }

        if (unread > 0) {
            options.push({
                label: 'Mark all read',
                action: () => {
                    PhoneManager.markAllRead();
                    ui.replaceScreen(phoneScreen(ui));
                }
            });
        }

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Message Detail
// ════════════════════════════════════════════
function messageDetailScreen(ui, msg) {
    return () => {
        // Mark as read
        PhoneManager.markRead(msg.id);

        const contact = CONTACTS.find(c => c.id === msg.from);
        const fromName = contact ? `${contact.emoji} ${contact.name}` : (msg.from === 'system' ? '📡 SYSTEM' : msg.from);

        const lines = [
            H('MESSAGE'),
            DIV(),
            GOLD(fromName),
            contact ? DIM(contact.title || contact.role) : BLANK(),
            DIV(),
            SUB(msg.subject),
            BLANK(),
            msg.body,
            BLANK(),
            DIM(`Week ${msg.week} • ${msg.category || 'personal'}`),
        ];

        const options = [];

        // Actionable messages
        if (msg.actions && msg.actions.length > 0) {
            msg.actions.forEach((action, i) => {
                options.push({
                    label: action.label || action.text || `Action ${i + 1}`,
                    action: () => {
                        PhoneManager.handleMessageAction(msg.id, i);
                        // Show effects result screen
                        const summary = GameState.lastEffectsSummary || [];
                        ui.replaceScreen(effectsResultScreen(ui, action.label || 'Action taken', summary));
                    }
                });
            });
        }

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Contacts Rolodex
// ════════════════════════════════════════════
function contactsScreen(ui) {
    return () => {
        const met = PhoneManager.getMetContacts();

        const lines = [
            H('CONTACTS'),
            DIM(`${met.length} contacts in your network`),
            DIV(),
        ];

        met.forEach(contact => {
            const data = CONTACTS.find(c => c.id === contact.id) || {};
            const favorBar = '█'.repeat(Math.max(0, Math.floor(contact.favor / 10))) + '░'.repeat(Math.max(0, 10 - Math.floor(contact.favor / 10)));
            lines.push(`${data.emoji || '👤'} ${data.name || contact.id}`);
            lines.push(DIM(`  ${data.role || 'Unknown'} • Favor [${favorBar}] ${contact.favor}`));
        });

        const options = met.map(contact => {
            const data = CONTACTS.find(c => c.id === contact.id) || {};
            return {
                label: `${data.emoji || '👤'} ${data.name || contact.id}`,
                action: () => ui.pushScreen(contactDetailScreen(ui, contact, data))
            };
        });

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Contact Detail
// ════════════════════════════════════════════
export function contactDetailScreen(ui, contactState, contactData) {
    return () => {
        const s = GameState.state;
        const favorBar = '█'.repeat(Math.max(0, Math.floor(contactState.favor / 10))) + '░'.repeat(Math.max(0, 10 - Math.floor(contactState.favor / 10)));
        const canAct = hasActions();
        const favor = contactState.favor || 0;
        const role = contactData.role;

        const lines = [
            H(`${contactData.emoji || '👤'} ${contactData.name || contactState.id}`),
            DIM(contactData.title || contactData.role || ''),
            DIV(),
            STAT('Favor', `[${favorBar}] ${contactState.favor}`, favor > 20 ? 'green' : favor < 0 ? 'red' : ''),
            STAT('Role', (role || 'unknown').toUpperCase()),
            STAT('Interactions', contactState.interactions || 0),
            BLANK(),
            DIM(contactData.personality || ''),
        ];

        if (contactData.archetypeAbility) {
            lines.push(BLANK());
            lines.push(GOLD('ABILITY'));
            lines.push(DIM(contactData.archetypeAbility));
        }

        if (contactState.grudges && contactState.grudges.length > 0) {
            lines.push(BLANK());
            lines.push(RED('GRUDGES:'));
            contactState.grudges.forEach(g => lines.push(DIM(`  • ${g.reason} (week ${g.week})`)));
        }
        if (contactState.favors && contactState.favors.length > 0) {
            lines.push(GREEN('FAVORS:'));
            contactState.favors.forEach(f => lines.push(DIM(`  • ${f.reason} (week ${f.week})`)));
        }

        const npcMessages = PhoneManager.getRecentMessages(20).filter(m => m.from === contactState.id);
        if (npcMessages.length > 0) {
            lines.push(DIV());
            lines.push(SUB('RECENT MESSAGES'));
            npcMessages.slice(0, 3).forEach(msg => lines.push(DIM(`  Week ${msg.week}: ${msg.subject}`)));
        }

        lines.push(DIV());
        const options = [];

        if (!canAct) {
            lines.push(RED('No actions remaining this week.'));
        } else {
            // ── UNIVERSAL: Call (+1 favor) ──
            options.push({
                label: `📞 Call ${contactData.name.split(' ')[0]} (+1 favor, 1 action)`,
                action: () => {
                    useAction(`Called ${contactData.name}`);
                    PhoneManager.adjustFavor(contactState.id, 1);
                    contactState.interactions = (contactState.interactions || 0) + 1;
                    contactState.lastContactWeek = s.week;
                    const greeting = contactData.greetings[Math.floor(Math.random() * contactData.greetings.length)];
                    GameState.addNews(`📞 Called ${contactData.name}. "${greeting}"`);
                    ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                }
            });

            // ── DEALER: Source art, intel ──
            if (role === 'dealer') {
                if (favor >= 10) {
                    options.push({
                        label: '💎 Ask to source art (favor 10+)',
                        action: () => {
                            useAction(`Asked ${contactData.name} to source art`);
                            contactState.interactions++;
                            ConsequenceScheduler.addRelative(1 + Math.floor(Math.random() * 2), 'phone_message', {
                                from: contactData.id, subject: `${contactData.emoji} Private offering`,
                                body: `I found something for you. Off-market. Shall I hold it?`,
                                actions: [
                                    { label: "I'm interested", effect: { reputation: 2, npcFavor: { id: contactData.id, amount: 3 } } },
                                    { label: 'Pass', effect: { npcFavor: { id: contactData.id, amount: -1 } } },
                                ],
                            });
                            GameState.addNews(`💎 ${contactData.name} is sourcing pieces for you.`);
                            ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                        }
                    });
                }
                options.push({
                    label: '🔍 Ask for market intel (+2 intel)',
                    action: () => {
                        useAction(`Got intel from ${contactData.name}`);
                        contactState.interactions++;
                        s.intel += 2;
                        PhoneManager.adjustFavor(contactState.id, 1);
                        GameState.addNews(`🔍 ${contactData.name} shared market intel. +2 Intel.`);
                        ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                    }
                });
            }

            // ── GALLERIST: Gallery visit, portfolio review ──
            if (role === 'gallerist') {
                options.push({
                    label: '🎨 Gallery visit (+2 taste)',
                    action: () => {
                        useAction(`Visited ${contactData.name}'s gallery`);
                        contactState.interactions++;
                        s.taste = Math.min(100, s.taste + 2);
                        PhoneManager.adjustFavor(contactState.id, 2);
                        GameState.addNews(`🎨 Visited ${contactData.name}'s gallery. Taste +2.`);
                        ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                    }
                });
                if (favor >= 15) {
                    options.push({
                        label: '📋 Portfolio review (+3 taste, +1 rep, favor 15+)',
                        action: () => {
                            useAction(`Portfolio reviewed by ${contactData.name}`);
                            contactState.interactions++;
                            s.taste = Math.min(100, s.taste + 3);
                            s.reputation = Math.min(100, s.reputation + 1);
                            PhoneManager.adjustFavor(contactState.id, -1);
                            GameState.addNews(`📋 ${contactData.name} reviewed your collection.`);
                            ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                        }
                    });
                }
            }

            // ── AUCTION: Market analysis, consign ──
            if (role === 'auction') {
                options.push({
                    label: '📊 Market analysis (+3 intel)',
                    action: () => {
                        useAction(`Got analysis from ${contactData.name}`);
                        contactState.interactions++;
                        s.intel += 3;
                        PhoneManager.adjustFavor(contactState.id, 1);
                        GameState.addNews(`📊 ${contactData.name} provided market analysis. +3 Intel.`);
                        ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                    }
                });
                if (favor >= 10 && s.portfolio.length > 0) {
                    options.push({
                        label: '🔨 Discuss consignment (favor 10+)',
                        action: () => {
                            contactState.interactions++;
                            PhoneManager.adjustFavor(contactState.id, 1);
                            ui.pushScreen(portfolioScreen(ui));
                        }
                    });
                }
            }

            // ── ARTIST: Studio visit, commission ──
            if (role === 'artist') {
                options.push({
                    label: '🖌️ Visit studio (+3 taste, +2 favor)',
                    action: () => {
                        useAction(`Visited ${contactData.name}'s studio`);
                        contactState.interactions++;
                        s.taste = Math.min(100, s.taste + 3);
                        PhoneManager.adjustFavor(contactState.id, 2);
                        GameState.addNews(`🖌️ Visited ${contactData.name}'s studio.`);
                        ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                    }
                });
                if (favor >= 20 && s.cash >= 5000) {
                    options.push({
                        label: '🎯 Commission a work ($5k, favor 20+)',
                        action: () => {
                            useAction(`Commissioned ${contactData.name}`);
                            contactState.interactions++;
                            s.cash -= 5000;
                            PhoneManager.adjustFavor(contactState.id, 5);
                            ConsequenceScheduler.addRelative(4 + Math.floor(Math.random() * 5), 'phone_message', {
                                from: contactData.id, subject: `${contactData.emoji} Commission ready`,
                                body: `The work is finished. When can I deliver?`,
                                actions: [{ label: 'Accept delivery', effect: { reputation: 3, taste: 2, npcFavor: { id: contactData.id, amount: 5 } } }],
                            });
                            GameState.addNews(`🎯 Commissioned ${contactData.name} for $5,000.`);
                            ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                        }
                    });
                }
            }

            // ── COLLECTOR: Dinner, trade ──
            if (role === 'collector') {
                options.push({
                    label: '🍷 Invite to dinner ($500, scheduled for next week)',
                    action: () => {
                        useAction(`Scheduled dinner with ${contactData.name}`);
                        contactState.interactions++;
                        s.cash -= Math.min(500, s.cash);
                        ConsequenceScheduler.addRelative(1, 'scene', { sceneId: 'debug_dinner' }, { sourceEvent: `Invited ${contactData.name}` });
                        GameState.addNews(`🗓️ Scheduled dinner with ${contactData.name} for next week.`);
                        ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                    }
                });
                if (favor >= 15 && s.portfolio.length > 0) {
                    options.push({
                        label: '🔄 Propose a trade (+5 rep, +3 access, favor 15+)',
                        action: () => {
                            useAction(`Proposed trade to ${contactData.name}`);
                            contactState.interactions++;
                            const tw = s.portfolio[Math.floor(Math.random() * s.portfolio.length)];
                            s.portfolio = s.portfolio.filter(w => w.id !== tw.id);
                            s.reputation = Math.min(100, s.reputation + 5);
                            s.access = Math.min(100, s.access + 3);
                            PhoneManager.adjustFavor(contactState.id, 5);
                            GameState.addNews(`🔄 Traded "${tw.title}" with ${contactData.name}. +5 rep, +3 access.`);
                            ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                        }
                    });
                }
            }

            // ── ADVISOR: Analysis, recommendations ──
            if (role === 'advisor') {
                options.push({
                    label: '📈 Portfolio analysis (+3 intel, +1 taste)',
                    action: () => {
                        useAction(`Consulted ${contactData.name}`);
                        contactState.interactions++;
                        s.intel += 3;
                        s.taste = Math.min(100, s.taste + 1);
                        PhoneManager.adjustFavor(contactState.id, 1);
                        GameState.addNews(`📈 ${contactData.name} analyzed your portfolio. +3 intel, +1 taste.`);
                        ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                    }
                });
                if (favor >= 10) {
                    options.push({
                        label: '🎯 Buy recommendation (favor 10+)',
                        action: () => {
                            useAction(`Got recommendation from ${contactData.name}`);
                            contactState.interactions++;
                            s.intel += 2;
                            PhoneManager.adjustFavor(contactState.id, -1);
                            ConsequenceScheduler.addRelative(1, 'phone_message', {
                                from: contactData.id, subject: `${contactData.emoji} Buy recommendation`,
                                body: `There's an undervalued artist about to break. Check the market this week.`,
                                urgency: 'urgent', category: 'intel',
                            });
                            GameState.addNews(`🎯 ${contactData.name} is preparing a recommendation.`);
                            ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                        }
                    });
                }
            }

            // ── MEGA DEALER: Exclusive access ──
            if (role === 'mega_dealer') {
                if (s.reputation >= 80 && favor >= 0) {
                    options.push({
                        label: '🦅 Request roster access (rep 80+)',
                        action: () => {
                            useAction(`Requested access from ${contactData.name}`);
                            contactState.interactions++;
                            s.access = Math.min(100, s.access + 5);
                            PhoneManager.adjustFavor(contactState.id, 3);
                            ConsequenceScheduler.addRelative(1, 'phone_message', {
                                from: contactData.id, subject: `${contactData.emoji} Exclusive offering`,
                                body: `Very well. I have something from a top-tier artist.`,
                                urgency: 'urgent', category: 'deal',
                                actions: [
                                    { label: 'I want it', effect: { reputation: 5, access: 3, npcFavor: { id: contactData.id, amount: 5 } } },
                                    { label: 'Not now', effect: { npcFavor: { id: contactData.id, amount: -5 } } },
                                ],
                            });
                            GameState.addNews(`🦅 ${contactData.name} is considering you for exclusive access.`);
                            ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                        }
                    });
                } else if (s.reputation < 80) {
                    options.push({ label: `🦅 Request access (requires Rep 80+, yours: ${s.reputation})`, disabled: true });
                }
            }

            // ── SPECULATOR: Group deals ──
            if (role === 'speculator') {
                options.push({
                    label: '📊 Market moves (+3 intel)',
                    action: () => {
                        useAction(`Discussed markets with ${contactData.name}`);
                        contactState.interactions++;
                        s.intel += 3;
                        PhoneManager.adjustFavor(contactState.id, 1);
                        GameState.addNews(`📊 ${contactData.name} shared speculative intel.`);
                        ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                    }
                });
                if (favor >= 10 && s.cash >= 10000) {
                    options.push({
                        label: '🎲 Join group buy ($10k, 60% win, favor 10+)',
                        action: () => {
                            useAction(`Joined ${contactData.name}'s group buy`);
                            contactState.interactions++;
                            s.cash -= 10000;
                            PhoneManager.adjustFavor(contactState.id, 3);
                            const win = Math.random() > 0.4;
                            const delay = 3 + Math.floor(Math.random() * 3);
                            ConsequenceScheduler.addRelative(delay, 'stat_change', win ? { cash: 25000, reputation: 3 } : { reputation: -2, marketHeat: 5 });
                            ConsequenceScheduler.addRelative(delay, 'news', win ? `💰 Group buy paid off! +$25k.` : `📉 Group buy tanked. Money lost.`);
                            GameState.addNews(`🎲 Invested $10k in group buy. Result in ${delay} weeks.`);
                            ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                        }
                    });
                }
            }

            // ── YOUNG HUSTLER: Risky deals ──
            if (role === 'young_hustler') {
                options.push({
                    label: '⚡ Ask what\'s available (risky intel)',
                    action: () => {
                        useAction(`Talked to ${contactData.name}`);
                        contactState.interactions++;
                        s.intel += 2;
                        PhoneManager.adjustFavor(contactState.id, 2);
                        if (Math.random() > 0.3) {
                            s.taste = Math.min(100, s.taste + 1);
                            GameState.addNews(`⚡ ${contactData.name} tipped you off. Could be legit.`);
                        } else {
                            s.suspicion += 2;
                            GameState.addNews(`⚠️ ${contactData.name}'s tip was sketchy. Suspicion +2.`);
                        }
                        ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                    }
                });
                if (favor >= 5 && s.cash >= 3000) {
                    options.push({
                        label: '🎰 Mystery piece ($3k, ??? value, favor 5+)',
                        action: () => {
                            useAction(`Bought mystery piece from ${contactData.name}`);
                            contactState.interactions++;
                            s.cash -= 3000;
                            PhoneManager.adjustFavor(contactState.id, 3);
                            MarketManager.addNewWorkToMarket();
                            const nw = MarketManager.works[MarketManager.works.length - 1];
                            nw.onMarket = false;
                            nw.basePrice = Math.random() > 0.5 ? 8000 + Math.floor(Math.random() * 20000) : 500 + Math.floor(Math.random() * 2000);
                            nw.price = nw.basePrice;
                            nw.purchasePrice = 3000;
                            nw.purchaseWeek = s.week;
                            nw.purchaseCity = s.currentCity;
                            nw.storage = 'home';
                            nw.insured = false;
                            nw.provenance = [{ type: 'acquired', week: s.week, city: s.currentCity, price: 3000, source: `${contactData.name} (unverified)` }];
                            s.portfolio.push(nw);
                            GameState.addNews(`🎰 Mystery piece from ${contactData.name}: "${nw.title}" — value: $${MarketManager.getWorkValue(nw).toLocaleString()}`);
                            ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                        }
                    });
                }
            }

            // ── INSTITUTIONAL: Museum loan, endorsement ──
            if (role === 'institutional') {
                if (favor >= 5 && s.portfolio.length > 0) {
                    options.push({
                        label: '🏛️ Discuss museum loan (+5 rep, +3 taste)',
                        action: () => {
                            useAction(`Discussed loan with ${contactData.name}`);
                            contactState.interactions++;
                            s.reputation = Math.min(100, s.reputation + 5);
                            s.taste = Math.min(100, s.taste + 3);
                            PhoneManager.adjustFavor(contactState.id, 3);
                            GameState.addNews(`🏛️ ${contactData.name} is interested in a loan. +5 rep, +3 taste.`);
                            ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                        }
                    });
                }
                if (favor >= 15) {
                    options.push({
                        label: '📜 Exhibition endorsement (+8 rep, costs 5 favor)',
                        action: () => {
                            useAction(`Got endorsement from ${contactData.name}`);
                            contactState.interactions++;
                            s.reputation = Math.min(100, s.reputation + 8);
                            PhoneManager.adjustFavor(contactState.id, -5);
                            GameState.addNews(`📜 ${contactData.name} endorsed your collection! +8 rep.`);
                            ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                        }
                    });
                }
            }

            // ── UNIVERSAL: Ask for introduction (favor 20+) ──
            if (favor >= 20) {
                const unmet = PhoneManager.contacts.filter(c => !c.met);
                if (unmet.length > 0) {
                    options.push({
                        label: '🤝 Ask for introduction (favor 20+, costs 3 favor)',
                        action: () => {
                            useAction(`Asked ${contactData.name} for introduction`);
                            contactState.interactions++;
                            PhoneManager.adjustFavor(contactState.id, -3);
                            const intro = PhoneManager.meetRandomContact();
                            if (intro) {
                                const introData = CONTACTS.find(c => c.id === intro.id);
                                GameState.addNews(`🤝 ${contactData.name} introduced you to ${introData?.name || 'someone'}.`);
                            }
                            ui.replaceScreen(contactDetailScreen(ui, contactState, contactData));
                        }
                    });
                }
            }
        }

        options.push({ label: '← Back', action: () => ui.popScreen() });
        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: News Feed
// ════════════════════════════════════════════
export function newsScreen(ui) {
    return () => {
        const feed = GameState.state.newsFeed;
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

// ════════════════════════════════════════════
// SCREEN: City / Travel
// ════════════════════════════════════════════
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
        const s = GameState.state;
        const current = s.currentCity;
        const currentCity = CITY_DATA[current] || { name: current, vibe: '', venues: [], specialty: '' };
        const cities = ['new-york', 'london', 'paris', 'hong-kong', 'switzerland', 'los-angeles', 'miami', 'berlin'];
        const canAct = hasActions();

        // Check for private jet contact (favor >= 30)
        const metContacts = PhoneManager.getMetContacts ? PhoneManager.getMetContacts() : [];
        const jetContact = metContacts.find(c => c.favor >= 30);
        const jetData = jetContact ? CONTACTS.find(cd => cd.id === jetContact.id) : null;

        const lines = [
            H(`CITY — ${currentCity.name.toUpperCase()}`),
            DIM(currentCity.vibe),
            DIV(),
            STAT('Cash', `$${s.cash.toLocaleString()}`),
            STAT('Actions', `${getActionsRemaining()} / ${MAX_ACTIONS}`),
            DIV(),
        ];

        // Local venues
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
                        GameState.changeCity(city);
                        MarketManager.tick();
                        ui.popScreen();
                        ui.replaceScreen(dashboardScreen(ui));
                    }
                };
            });

        // Private jet option
        if (jetData && canAct) {
            options.push({
                label: `✈️ Use ${jetData.name}'s jet (free, +3 rep, 1 action)`,
                action: () => {
                    useAction(`Flew on ${jetData.name}'s jet`);
                    const dests = cities.filter(c => c !== current);
                    const dest = dests[Math.floor(Math.random() * dests.length)];
                    GameState.changeCity(dest);
                    s.reputation = Math.min(100, s.reputation + 3);
                    GameState.addNews(`✈️ Flew on ${jetData.name}'s jet to ${dest.replace(/-/g, ' ')}.`);
                    MarketManager.tick();
                    ui.popScreen();
                    ui.replaceScreen(dashboardScreen(ui));
                }
            });
        }

        // ── Venue Actions (cost 1 action each) ──
        if (canAct && currentCity.venues.length > 0) {
            options.push({
                label: `🖼️ Visit Gallery — Browse curated selection (1 action)`,
                action: () => {
                    useAction('Visited local gallery');
                    s.taste = Math.min(100, s.taste + 1);
                    // Show a filtered market with potentially better pieces
                    ui.pushScreen(marketScreen(ui));
                }
            });
            options.push({
                label: `🔨 Auction House — Bid on premium lots (1 action)`,
                action: () => {
                    useAction('Attended auction');
                    s.access = Math.min(100, s.access + 1);
                    // Same as market but framed differently 
                    ui.pushScreen(marketScreen(ui));
                }
            });
            options.push({
                label: `🏛️ Visit Museum — Study the masters (+3 taste, +2 rep)`,
                action: () => {
                    useAction('Visited museum');
                    s.taste = Math.min(100, s.taste + 3);
                    s.reputation = Math.min(100, s.reputation + 2);
                    GameState.addNews(`🏛️ Spent the day at ${currentCity.venues[2] || 'the museum'}. Taste refined.`);
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
                        GameState.addNews(`🌟 Attended ${currentCity.venues[3] || 'the art fair'}. New connections made.`);
                        // Meet a random NPC
                        PhoneManager.meetRandomContact();
                        ui.replaceScreen(cityScreen(ui));
                    }
                });
            }
        }

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Event (simple — description + choices)
// ════════════════════════════════════════════
export function eventScreen(ui, event) {
    return () => {
        const s = GameState.state;
        const bgSrc = CATEGORY_BACKGROUNDS[event.category];
        const locationLabel = CATEGORY_LOCATIONS[event.category] || 'Unknown';

        const lines = [
            SCENE_HEADER(event.title || 'Something happens...', locationLabel),
        ];

        // Optional pixel art background
        if (bgSrc) lines.push(PIXEL_ART(bgSrc, event.title));

        lines.push(BLANK());
        lines.push(SCENE_TEXT(event.description || 'You face a decision.'));
        lines.push(BLANK());
        lines.push(SCENE_SEP());

        const options = (event.choices || []).map((choice, idx) => {
            // Check stat requirements
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

        // Fallback if no choices
        if (options.length === 0) {
            options.push({
                label: 'Continue',
                action: () => {
                    GameState.advanceWeek();
                    MarketManager.tick();
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
// Uses scene formatting for atmospheric rendering
// ════════════════════════════════════════════
export function eventStepScreen(ui, event, stepIndex) {
    return () => {
        const step = event.steps[stepIndex];
        const isLast = stepIndex >= event.steps.length - 1;
        const bgSrc = CATEGORY_BACKGROUNDS[event.category];
        const locationLabel = CATEGORY_LOCATIONS[event.category] || '';

        const lines = [];

        // Show scene header on first step only
        if (stepIndex === 0) {
            lines.push(SCENE_HEADER(event.title || 'EVENT', locationLabel));
            if (bgSrc) lines.push(PIXEL_ART(bgSrc, event.title));
        } else {
            // Subsequent steps get a lighter header
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
                            GameState.advanceWeek();
                            MarketManager.tick();
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
                            GameState.advanceWeek();
                            MarketManager.tick();
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

            const s = GameState.state;
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

        // Unknown step type — skip
        return {
            lines: [...lines, DIM('...')],
            options: [{
                label: 'Continue →',
                action: () => {
                    if (isLast) {
                        GameState.advanceWeek();
                        MarketManager.tick();
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

        // Show effects summary
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

        // Branching: if choice has nextSteps, continue into them instead of ending
        if (choice.nextSteps && choice.nextSteps.length > 0) {
            return {
                lines,
                options: [{
                    label: 'Continue →',
                    action: () => {
                        // Create a virtual event with the follow-up steps
                        const branchEvent = {
                            ...event,
                            steps: choice.nextSteps,
                        };
                        ui.replaceScreen(eventStepScreen(ui, branchEvent, 0));
                    }
                }]
            };
        }

        // Terminal outcome — advance week and return to dashboard
        return {
            lines,
            options: [{
                label: 'Continue →',
                action: () => {
                    GameState.advanceWeek();
                    MarketManager.tick();
                    GameState.autoSave();
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
    // Apply effects
    if (choice.effects) {
        GameState.applyEffects(choice.effects);
    }

    // Schedule consequences
    if (choice.schedules) {
        choice.schedules.forEach(sched => {
            ConsequenceScheduler.addRelative(
                sched.weeksDelay,
                sched.type,
                sched.payload,
                { sourceEvent: event.id }
            );
        });
    }

    // Log the decision
    DecisionLog.record({
        eventId: event.id,
        eventTitle: event.title,
        choiceIndex,
        choiceLabel: choice.label || choice.text,
        effects: choice.effects || {},
        tags: choice.tags || [],
        isBlueOption: choice.isBlueOption || false,
    });

    // News from choice
    if (choice.newsText) {
        GameState.addNews(choice.newsText);
    }

    // Show outcome screen
    ui.replaceScreen(eventOutcomeScreen(ui, event, choice));
}

// ════════════════════════════════════════════
// SCREEN: Effects Result (shows what changed)
// ════════════════════════════════════════════
function effectsResultScreen(ui, actionLabel, summary) {
    return () => {
        const lines = [
            H('ACTION RESULT'),
            DIV(),
            SUB(actionLabel),
            BLANK(),
        ];

        if (summary && summary.length > 0) {
            lines.push(SUB('CHANGES:'));
            summary.forEach(item => {
                // Color based on content
                const isPositive = item.includes('+') || item.includes('won');
                const isNegative = item.includes('-') || item.includes('lost') || item.includes('BLACKLISTED');
                if (isPositive) {
                    lines.push(GREEN(`  ✓ ${item}`));
                } else if (isNegative) {
                    lines.push(RED(`  ✗ ${item}`));
                } else {
                    lines.push(`  • ${item}`);
                }
            });
        } else {
            lines.push(DIM('No immediate effects.'));
        }

        lines.push(BLANK());
        lines.push(DIM('Any follow-up consequences will arrive in future weeks.'));

        return {
            lines,
            options: [{
                label: 'Continue →',
                action: () => {
                    // Return to the previous screen (phone message list)
                    ui.popScreen();
                }
            }]
        };
    };
}

// ════════════════════════════════════════════
// SCREEN: Calendar & Journal
// ════════════════════════════════════════════
export function journalScreen(ui) {
    return () => {
        const s = GameState.state;
        const decisions = DecisionLog.getJournalEntries(15);
        const news = (s.newsFeed || []).slice(-20).reverse();
        const pending = ConsequenceScheduler.getPending();

        const lines = [
            H('🗓️ CALENDAR & JOURNAL'),
            STAT('Decisions', DecisionLog.entries.length),
            STAT('Activity Log', `${news.length} entries`),
            DIV(),
        ];

        // Upcoming Events
        if (pending.length > 0) {
            lines.push(SUB('UPCOMING EVENTS'));
            const sortedPending = [...pending].sort((a, b) => a.triggerWeek - b.triggerWeek);
            sortedPending.forEach(p => {
                const icon = p.type === 'scene' ? '🎬' : '🗓️';
                const desc = p.sourceEvent || 'Scheduled Event';
                const wks = Math.max(0, p.triggerWeek - s.week);
                const timeStr = wks === 1 ? 'Next week' : wks === 0 ? 'This week' : `In ${wks} weeks`;
                lines.push(GOLD(`  ${icon} W${p.triggerWeek} (${timeStr}) — ${desc}`));
            });
            lines.push(BLANK());
        }

        // Tab-style view: Decisions first, then full timeline
        if (decisions.length > 0) {
            lines.push(SUB('RECENT DECISIONS'));
            decisions.slice(0, 5).forEach(entry => {
                const prefix = entry.isBlueOption ? '★ ' : '';
                lines.push(GOLD(`Week ${entry.week} — ${entry.title}`));
                lines.push(`  ${prefix}${entry.choice}`);
                lines.push(DIM(`  → ${entry.effectsSummary}`));
            });
            lines.push(BLANK());
        }

        lines.push(SUB('ACTIVITY TIMELINE'));
        if (news.length === 0) {
            lines.push(DIM('No activity yet. Start playing to see your history.'));
        } else {
            news.slice(0, 15).forEach(item => {
                const text = typeof item === 'string' ? item : item.text;
                const week = item.week || '?';
                lines.push(DIM(`  W${week}  ${text}`));
            });
        }

        const options = [
            { label: '← Back', action: () => ui.popScreen() }
        ];

        // If there are many decisions, offer to see more
        if (decisions.length > 5) {
            options.unshift({
                label: `All Decisions (${DecisionLog.entries.length})`,
                action: () => ui.pushScreen(fullDecisionsScreen(ui))
            });
        }

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Full Decisions List
// ════════════════════════════════════════════
function fullDecisionsScreen(ui) {
    return () => {
        const entries = DecisionLog.getJournalEntries(30);

        const lines = [
            H('ALL DECISIONS'),
            DIM(`${DecisionLog.entries.length} total`),
            DIV(),
        ];

        entries.forEach(entry => {
            const prefix = entry.isBlueOption ? '★ ' : '';
            lines.push(SUB(`Week ${entry.week} — ${entry.title}`));
            lines.push(`  ${prefix}${entry.choice}`);
            lines.push(DIM(`  → ${entry.effectsSummary}`));
            lines.push(BLANK());
        });

        return {
            lines,
            options: [{ label: '← Back', action: () => ui.popScreen() }]
        };
    };
}

// ════════════════════════════════════════════
// SCREEN: Legacy End (Game Over / Retire)
// ════════════════════════════════════════════
function legacyEndScreen(ui) {
    return () => {
        const s = GameState.state;
        const portfolioValue = GameState.getPortfolioValue();
        const netWorth = s.cash + portfolioValue;
        const metContacts = PhoneManager.getMetContacts ? PhoneManager.getMetContacts() : [];
        const totalTraded = (s.totalWorksBought || 0) + (s.totalWorksSold || 0);

        // ── Score calculation (weighted) ──
        const cashScore = Math.min(100, Math.round(s.cash / 5000));           // 15%
        const collectionScore = Math.min(100, Math.round(portfolioValue / 50000)); // 25%
        const repScore = s.reputation;                                         // 20%
        const tasteScore = s.taste;                                           // 15%
        const accessScore = s.access;                                          // 15%
        const networkScore = Math.min(100, metContacts.length * 15);           // 10%

        const totalScore = Math.round(
            cashScore * 0.15 +
            collectionScore * 0.25 +
            repScore * 0.20 +
            tasteScore * 0.15 +
            accessScore * 0.15 +
            networkScore * 0.10
        );

        // Rating title
        const ratings = [
            [90, '🏆 LIVING LEGEND'],
            [75, '⭐ Master Collector'],
            [60, '🌟 Respected Dealer'],
            [45, '💼 Serious Player'],
            [30, '🎨 Aspiring Collector'],
            [15, '📖 Curious Amateur'],
            [0, '👻 Forgotten'],
        ];
        const rating = ratings.find(r => totalScore >= r[0]) || ratings[ratings.length - 1];

        const lines = [
            H('═══  L E G A C Y  ═══'),
            BLANK(),
            GOLD(rating[1]),
            DIM(`Final Score: ${totalScore} / 100`),
            DIM(`${s.week} weeks in the art world`),
            DIV(),
            SUB('BREAKDOWN'),
            STAT('Cash', `$${s.cash.toLocaleString()}`, cashScore > 60 ? 'green' : ''),
            DIM(`  Score: ${cashScore}/100 (×0.15)`),
            STAT('Collection', `$${portfolioValue.toLocaleString()} (${s.portfolio.length} works)`, collectionScore > 60 ? 'green' : ''),
            DIM(`  Score: ${collectionScore}/100 (×0.25)`),
            STAT('Reputation', s.reputation, repScore > 60 ? 'green' : repScore < 30 ? 'red' : ''),
            DIM(`  Score: ${repScore}/100 (×0.20)`),
            STAT('Taste', s.taste, tasteScore > 60 ? 'green' : ''),
            DIM(`  Score: ${tasteScore}/100 (×0.15)`),
            STAT('Access', s.access, accessScore > 60 ? 'green' : ''),
            DIM(`  Score: ${accessScore}/100 (×0.15)`),
            STAT('Network', `${metContacts.length} contacts`, networkScore > 60 ? 'green' : ''),
            DIM(`  Score: ${networkScore}/100 (×0.10)`),
            DIV(),
            STAT('Net Worth', `$${netWorth.toLocaleString()}`, 'gold'),
            STAT('Works Traded', totalTraded),
            STAT('Market Heat', s.marketHeat, s.marketHeat > 30 ? 'red' : ''),
            STAT('Decisions Made', DecisionLog.entries.length),
        ];

        // Playstyle analysis
        lines.push(DIV());
        lines.push(SUB('PLAYSTYLE'));
        if (s.marketHeat > 40) lines.push(RED('  Flipper — You burned fast and bright.'));
        else if (tasteScore > 70) lines.push(GREEN('  Connoisseur — A refined eye.'));
        else if (repScore > 70) lines.push(GREEN('  Socialite — Everyone knows your name.'));
        else if (cashScore > 70) lines.push(GOLD('  Mogul — Follow the money.'));
        else if (collectionScore > 70) lines.push(GOLD('  Hoarder — More is more.'));
        else lines.push(DIM('  Generalist — A bit of everything.'));

        const options = [
            {
                label: '🔄 New Game',
                action: () => ui.replaceScreen(characterSelectScreen(ui))
            },
            { label: '← Keep Playing', action: () => ui.popScreen() },
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Scene / Dialogue
// ════════════════════════════════════════════
export function sceneScreen(ui, sceneId) {
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

        const text = typeof node.text === 'function' ? node.text(GameState.state) : node.text;

        // Split text by newlines if needed, though TerminalUI handles strings.
        const paragraphs = text.split('\n');
        paragraphs.forEach(p => {
            if (p.trim()) lines.push(p.trim());
        });

        lines.push(DIV());

        const options = [];
        if (node.choices && node.choices.length > 0) {
            node.choices.forEach((choice, index) => {
                const canChoose = choice.condition ? choice.condition(GameState.state) : true;
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
                    // Show but disabled
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

// ════════════════════════════════════════════
// SCREEN: Title Screen
// ════════════════════════════════════════════
const TITLE_ART = `
 ╔═══════════════════════════════════════════╗
 ║                                           ║
 ║     █████╗ ██████╗ ████████╗              ║
 ║    ██╔══██╗██╔══██╗╚══██╔══╝              ║
 ║    ███████║██████╔╝   ██║                 ║
 ║    ██╔══██║██╔══██╗   ██║                 ║
 ║    ██║  ██║██║  ██║   ██║                 ║
 ║    ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝                 ║
 ║                                           ║
 ║    ██╗     ██╗███████╗███████╗            ║
 ║    ██║     ██║██╔════╝██╔════╝            ║
 ║    ██║     ██║█████╗  █████╗              ║
 ║    ██║     ██║██╔══╝  ██╔══╝              ║
 ║    ███████╗██║██║     ███████╗            ║
 ║    ╚══════╝╚═╝╚═╝     ╚══════╝            ║
 ║                                           ║
 ╚═══════════════════════════════════════════╝`;

export function titleScreen(ui) {
    return () => {
        const hasSaves = GameState.hasSave();
        const recentSlot = GameState.getMostRecentSlot();

        const lines = [
            BLANK(),
            { type: 'ascii-art', text: TITLE_ART },
            BLANK(),
            { type: 'center', text: 'TASTE  ·  CAPITAL  ·  REPUTATION', className: 't-tagline' },
            BLANK(),
        ];

        // Show recent save info if present
        if (hasSaves && recentSlot !== null) {
            const slots = GameState.getSaveSlots();
            const recent = slots[recentSlot];
            if (recent) {
                lines.push(DIM(`Last played: ${recent.meta.playerName} — Week ${recent.meta.week}`));
                lines.push(BLANK());
            }
        }

        const options = [];

        // Continue — most recent save
        if (hasSaves && recentSlot !== null) {
            options.push({
                label: '▸ Continue',
                action: () => {
                    if (GameState.load(recentSlot)) {
                        MarketManager.init(null); // Rebuild market from state
                        ui.replaceScreen(dashboardScreen(ui));
                    }
                }
            });
        }

        options.push({
            label: '✦ New Game',
            action: () => ui.pushScreen(characterSelectScreen(ui))
        });

        if (hasSaves) {
            options.push({
                label: '📂 Load Game',
                action: () => ui.pushScreen(saveLoadScreen(ui, 'load'))
            });
        }

        // Version
        lines.push({ type: 'center', text: 'v0.3.0', className: 't-version' });

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Save / Load Browser
// ════════════════════════════════════════════
export function saveLoadScreen(ui, mode) {
    return () => {
        const slots = GameState.getSaveSlots();
        const isSaving = mode === 'save';
        const lastSlot = GameState.getMostRecentSlot();

        const lines = [
            H(isSaving ? '💾 SAVE GAME' : '📂 LOAD GAME'),
            DIM(isSaving ? 'Choose a slot to save your progress.' : 'Choose a saved game to load.'),
            DIV(),
        ];

        // Render save slot cards
        slots.forEach((slot, i) => {
            if (slot) {
                lines.push({
                    type: 'save-slot',
                    meta: slot.meta,
                    active: i === lastSlot
                });
            } else {
                lines.push(DIM(`  Slot ${i + 1} — Empty`));
            }
        });

        lines.push(DIV());

        // Build options
        const options = [];

        slots.forEach((slot, i) => {
            if (isSaving) {
                if (slot) {
                    options.push({
                        label: `Overwrite Slot ${i + 1} (${slot.meta.playerName} — Wk ${slot.meta.week})`,
                        action: () => ui.pushScreen(saveConfirmScreen(ui, i, slot.meta))
                    });
                } else {
                    options.push({
                        label: `Save to Slot ${i + 1} (empty)`,
                        action: () => {
                            GameState.save(i);
                            GameState.addNews('💾 Game saved.');
                            ui.popScreen();
                            ui.replaceScreen(dashboardScreen(ui));
                        }
                    });
                }
            } else {
                // Loading
                if (slot) {
                    options.push({
                        label: `Load Slot ${i + 1} — ${slot.meta.playerName} (Wk ${slot.meta.week})`,
                        action: () => {
                            if (GameState.load(i)) {
                                MarketManager.init(null);
                                ui.screenStack = [];
                                ui.replaceScreen(dashboardScreen(ui));
                            }
                        }
                    });
                } else {
                    options.push({
                        label: `Slot ${i + 1} — Empty`,
                        disabled: true
                    });
                }
            }
        });

        // Delete option
        if (slots.some(s => s !== null)) {
            options.push({
                label: '🗑️ Delete a save...',
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
            H('⚠️ OVERWRITE SAVE?'),
            BLANK(),
            SUB(`Slot ${slotIndex + 1} currently contains:`),
            { type: 'save-slot', meta: existingMeta },
            BLANK(),
            RED('This will permanently replace this save.'),
        ];

        const options = [
            {
                label: 'Yes, overwrite this slot',
                action: () => {
                    GameState.save(slotIndex);
                    GameState.addNews('💾 Game saved.');
                    ui.popScreen(); // back to save browser
                    ui.popScreen(); // back to dashboard
                    ui.replaceScreen(dashboardScreen(ui));
                }
            },
            { label: '← Cancel', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Delete Save Slot
// ════════════════════════════════════════════
function deleteSlotScreen(ui) {
    return () => {
        const slots = GameState.getSaveSlots();

        const lines = [
            H('🗑️ DELETE SAVE'),
            DIM('Choose a save to permanently delete.'),
            DIV(),
        ];

        slots.forEach((slot, i) => {
            if (slot) {
                lines.push({ type: 'save-slot', meta: slot.meta });
            }
        });

        const options = [];

        slots.forEach((slot, i) => {
            if (slot) {
                options.push({
                    label: `Delete Slot ${i + 1} — ${slot.meta.playerName} (Wk ${slot.meta.week})`,
                    action: () => {
                        GameState.deleteSave(i);
                        // Refresh
                        ui.replaceScreen(deleteSlotScreen(ui));
                    }
                });
            }
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
        const s = GameState.state;
        const lines = [
            H('☰ MENU'),
            DIM(`Week ${s.week} • $${s.cash.toLocaleString()} • ${s.playerName || 'The Dealer'}`),
            DIV(),
        ];

        const options = [
            {
                label: '💾 Save Game',
                action: () => ui.pushScreen(saveLoadScreen(ui, 'save'))
            },
            {
                label: '📂 Load Game',
                action: () => ui.pushScreen(saveLoadScreen(ui, 'load'))
            },
            {
                label: '⚙️ Settings',
                action: () => ui.pushScreen(settingsScreen(ui))
            },
            {
                label: '📖 How to Play',
                action: () => ui.pushScreen(howToPlayScreen(ui))
            },
            {
                label: '🚪 Save & Quit to Title',
                action: () => {
                    GameState.autoSave();
                    ui.screenStack = [];
                    ui.replaceScreen(titleScreen(ui));
                }
            },
            {
                label: '← Resume Game',
                action: () => ui.popScreen()
            },
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: Settings
// ════════════════════════════════════════════
function settingsScreen(ui) {
    return () => {
        // Load settings from localStorage or use defaults
        const settings = JSON.parse(localStorage.getItem('artlife_settings') || '{}');
        const notifSpeed = settings.notifSpeed || 'normal';
        const autoSave = settings.autoSave !== false; // default true
        const textSpeed = settings.textSpeed || 'instant';

        const lines = [
            H('⚙️ SETTINGS'),
            DIV(),
            STAT('Notification Speed', notifSpeed.toUpperCase()),
            DIM('  How long toast notifications display.'),
            BLANK(),
            STAT('Auto-Save', autoSave ? 'ON' : 'OFF'),
            DIM('  Automatically save when advancing weeks.'),
            BLANK(),
            STAT('Text Speed', textSpeed.toUpperCase()),
            DIM('  How text appears on screen.'),
            DIV(),
        ];

        const options = [
            {
                label: `Notification Speed: ${notifSpeed.toUpperCase()} (toggle)`,
                action: () => {
                    const cycle = { slow: 'normal', normal: 'fast', fast: 'slow' };
                    settings.notifSpeed = cycle[notifSpeed] || 'normal';
                    localStorage.setItem('artlife_settings', JSON.stringify(settings));
                    ui.replaceScreen(settingsScreen(ui));
                }
            },
            {
                label: `Auto-Save: ${autoSave ? 'ON' : 'OFF'} (toggle)`,
                action: () => {
                    settings.autoSave = !autoSave;
                    localStorage.setItem('artlife_settings', JSON.stringify(settings));
                    ui.replaceScreen(settingsScreen(ui));
                }
            },
            {
                label: `Text Speed: ${textSpeed.toUpperCase()} (toggle)`,
                action: () => {
                    const cycle = { instant: 'typewriter', typewriter: 'instant' };
                    settings.textSpeed = cycle[textSpeed] || 'instant';
                    localStorage.setItem('artlife_settings', JSON.stringify(settings));
                    ui.replaceScreen(settingsScreen(ui));
                }
            },
            { label: '← Back', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: How to Play
// ════════════════════════════════════════════
function howToPlayScreen(ui) {
    return () => {
        const lines = [
            H('📖 HOW TO PLAY'),
            DIV(),
            SUB('THE GAME'),
            'You are a dealer in the global contemporary art market.',
            'Buy low, sell high, build your reputation, and survive 26 weeks.',
            'Every week you get 3 actions — spend them wisely.',
            BLANK(),
            SUB('STATS'),
            STAT('REP', 'Opens doors. High rep = better deals, exclusive access.'),
            STAT('TASTE', 'Your curatorial eye. Spot undervalued work before others.'),
            STAT('ACCESS', 'Your network reach. More contacts, better intel, better resale prices.'),
            STAT('INTEL', 'Hidden information. Reveals artificial price floors and insider details.'),
            BLANK(),
            SUB('ANTI-RESOURCES'),
            STAT('HEAT', 'Market attention. Quick flips and shady deals attract scrutiny.'),
            STAT('SUSPICION', 'NPC trust erosion. Too much suspicion closes doors permanently.'),
            STAT('BURNOUT', 'Mental fatigue. Hit 8+ and you\'re forced to rest a week.'),
            BLANK(),
            SUB('ACTIONS'),
            DIM('Buy at market price — guaranteed but no discount.'),
            DIM('Make an offer — choose your price and strategy. Resolves next week.'),
            DIM('Request a viewing — gain taste & intel instead of buying.'),
            DIM('Visit a contact — build relationships, learn secrets.'),
            DIM('Travel — costs an action but opens new markets.'),
            BLANK(),
            SUB('YOUR PORTFOLIO'),
            DIM('Store works at home (risk of theft), in a freeport ($200/mo, tax-free),'),
            DIM('or loan to a gallery (builds rep, but piece is at risk).'),
            DIM('Insure pieces for 1% of value per year to protect against loss.'),
            BLANK(),
            SUB('CONTROLS'),
            DIM('↑↓  Navigate options'),
            DIM('Enter / Click  Select'),
            DIM('Esc  Go back / Open menu'),
            DIM('1-9  Quick-select option by number'),
            DIV(),
        ];

        const options = [
            { label: '← Back', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}

// ════════════════════════════════════════════

// ════════════════════════════════════════════
// SCREEN: Haggle Battle — Pokémon-Style Full Screen
// ════════════════════════════════════════════

export function haggleScreen(ui, info) {
    // ── Phase 30: Phaser 3 Integration Bridge ──
    // Instead of rendering a DOM terminal screen, we launch the full visual HaggleScene.
    // The terminal itself stays paused/hidden behind the Phaser canvas.

    // Launch the Phaser scene, passing the TerminalUI instance and state info
    if (window.phaserGame) {
        window.phaserGame.scene.start('HaggleScene', { ui, haggleInfo: info });
    } else {
        console.error('Phaser engine not initialized!');
    }

    // Return an empty, non-interactive screen for the TerminalUI to hold state
    // while Phaser takes over the visual rendering on top.
    return {
        lines: [],
        options: []
    };
}
