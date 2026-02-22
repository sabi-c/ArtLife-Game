/**
 * src/terminal/screens/market.js
 * Extracted during Phase 41 Refactoring.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, SUB, DIV, DIM, GOLD, RED, BLANK, STAT } from './shared.js';
import { dashboardScreen, hasActions, useAction } from './dashboard.js';
import { GameEventBus, GameEvents } from '../../managers/GameEventBus.js';
import { VIEW, OVERLAY } from '../../constants/views.js';
// ════════════════════════════════════════════
// SCREEN: Market List
// ════════════════════════════════════════════
export function marketScreen(ui) {
    return () => {
        const s = TerminalAPI.state();
        const acc = s.access ?? 0;
        const allWorks = TerminalAPI.market.getAvailableWorks();

        // ACC Velvet Rope — gate how many works are visible
        let visibleCount;
        if (acc >= 70) visibleCount = 8;
        else if (acc >= 50) visibleCount = 7;
        else if (acc >= 30) visibleCount = 5;
        else visibleCount = 3;

        const works = allWorks.slice(0, visibleCount);

        const lines = [
            H('ONLINE VIEWING ROOM'),
            DIM('Private appointments available by request.'),
            DIV(),
        ];

        works.forEach(work => {
            const artist = TerminalAPI.market.getArtist(work.artistId);
            const heat = artist ? Math.round(artist.heat) : '?';
            lines.push(`${work.title}`);
            lines.push(DIM(`  ${work.artist} • $${work.price.toLocaleString()} • Heat: ${heat}`));
        });

        if (works.length === 0) {
            lines.push(DIM('No works available right now.'));
        }

        // Tease locked works
        if (acc < 70 && allWorks.length > visibleCount) {
            lines.push(BLANK());
            lines.push(DIM(`  🔒 Private Collection — ACC ${acc < 30 ? '30' : acc < 50 ? '50' : acc < 70 ? '70' : '85'}+ required`));
        }
        if (acc >= 70 && allWorks.length > 8) {
            lines.push(BLANK());
            lines.push(DIM(`  🔒 Private Collection — ACC 85+ required`));
        }

        const options = works.map(work => ({
            label: `Inspect "${work.title}"`,
            action: () => {
                try {
                    ui.pushScreen(inspectScreen(ui, work));
                } catch (e) {
                    window.lastError = e.message;
                    ui.render();
                }
            }
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
        const artist = TerminalAPI.market.getArtist(work.artistId);
        const heat = artist ? Math.round(artist.heat) : '?';
        const s = TerminalAPI.state();
        const tst = s.taste ?? 0;
        const canAfford = s.cash >= work.price;
        const alreadyOwn = s.portfolio.some(w => w.id === work.id);

        // TST Fog-of-War — gate info visibility by Taste stat
        let displayTitle = work.title;
        let displayArtist, displayPrice, displayMedium;

        if (tst < 20) {
            displayArtist = '???';
            displayPrice = '$???,???';
            displayMedium = '???';
        } else if (tst < 40) {
            displayArtist = `${work.artist} (${work.yearCreated})`;
            displayPrice = `~$${(Math.round(work.price / 10000) * 10000).toLocaleString()}`;
            displayMedium = work.medium || 'Mixed Media';
        } else if (tst < 60) {
            displayArtist = `${work.artist} (${work.yearCreated})`;
            displayPrice = `~$${(Math.round(work.price / 1000) * 1000).toLocaleString()}`;
            displayMedium = work.medium || 'Mixed Media';
        } else {
            displayArtist = `${work.artist} (${work.yearCreated})`;
            displayPrice = `$${work.price.toLocaleString()}`;
            displayMedium = work.medium || 'Mixed Media';
        }

        const lines = [
            H(displayTitle),
        ];

        if (tst < 20) {
            lines.push(DIM('You lack the eye to evaluate this.'));
            lines.push(DIV());
            lines.push(STAT('PRICE', displayPrice, 'gold'));
        } else {
            lines.push(displayArtist);
            lines.push(DIM(displayMedium));
            lines.push(DIV());
            lines.push(STAT('PRICE', displayPrice, 'gold'));
            lines.push(STAT('ARTIST HEAT', `${heat} / 100`, heat > 60 ? 'green' : heat < 25 ? 'red' : ''));
            lines.push(STAT('MARKET', s.marketState.toUpperCase(), s.marketState === 'bull' ? 'green' : s.marketState === 'bear' ? 'red' : ''));
        }

        if (alreadyOwn) {
            lines.push(DIV());
            lines.push(GOLD('✓ In your collection. Go to Portfolio to sell or manage.'));
        }

        if (s.intel >= 20 && artist) {
            lines.push(DIV());
            lines.push(SUB('MARKET INTEL'));
            const heatTrend = artist.heat > 50 ? '↑ Rising' : artist.heat > 25 ? '→ Stable' : '↓ Cooling';
            lines.push(DIM(`  Artist momentum: ${heatTrend}`));
            lines.push(DIM(`  Price volatility: ${artist.heatVolatility > 4 ? 'High' : artist.heatVolatility > 2 ? 'Medium' : 'Low'}`));
        }
        if (s.intel >= 40 && artist) {
            const priceRange = `$${(artist.basePriceMin / 1000).toFixed(0)}k – $${(artist.basePriceMax / 1000).toFixed(0)}k`;
            lines.push(DIM(`  Typical range: ${priceRange}`));
            lines.push(DIM(`  Market tier: ${artist.tier}`));
        }
        if (s.intel >= 60 && artist) {
            const artificial = TerminalAPI.market.detectArtificialFloor(work.artistId);
            if (artificial) {
                lines.push(RED('  ⚠ Buyback detected — floor may be artificial'));
            } else {
                lines.push(DIM('  ✓ No artificial price support detected'));
            }
        }
        if (s.intel >= 80 && artist) {
            lines.push(GOLD(`  Tip: Artist heat ${heat > 60 ? 'is high — sell window may close soon' : heat < 25 ? 'is low — potential undervalued buy' : 'is moderate — standard risk'}`));
        }

        const accessBonus = Math.round((s.access - 50) * 0.2);
        if (accessBonus !== 0) {
            lines.push(DIM(`Your Access of ${s.access} gives ${accessBonus > 0 ? '+' : ''}${accessBonus}% on contact sales`));
        }

        lines.push(DIV());
        lines.push(DIM(`Your cash: $${s.cash.toLocaleString()}`));

        const options = [];

        options.push({
            label: 'View Detailed Dossier',
            action: () => GameEventBus.emit(GameEvents.UI_TOGGLE_OVERLAY, OVERLAY.ARTWORK_DASHBOARD, { work })
        });

        if (canAfford && hasActions(1) && !alreadyOwn) {
            options.push({
                label: `[1 AP] Buy for $${work.price.toLocaleString()}`,
                action: () => {
                    useAction(`Bought "${work.title}"`);
                    TerminalAPI.initGame.buyWork?.(work); // GameState method
                    ui.popScreen();
                    ui.replaceScreen(dashboardScreen(ui));
                }
            });
        } else if (!canAfford) {
            options.push({ label: `Can't afford ($${work.price.toLocaleString()})`, disabled: true });
        } else if (!hasActions(1)) {
            options.push({ label: 'No actions remaining this week', disabled: true });
        }

        if (hasActions(2) && work.price > 1000 && !alreadyOwn) {
            options.push({
                label: '[2 AP] 🎮 Haggle — Negotiate the price',
                action: () => {
                    useAction(`Started haggling for "${work.title}"`, 2);
                    const info = TerminalAPI.haggle.start({
                        mode: 'buy',
                        work,
                        npc: null,
                        askingPrice: work.price,
                    });
                    const state = TerminalAPI.haggle.getState();

                    // Push a "return" screen so popScreen() on haggle exit lands cleanly
                    ui.pushScreen(() => ({
                        lines: [{ text: 'Returning from haggle...', style: 'dim' }],
                        options: [{ label: 'Back to Market', action: () => { ui.popScreen(); ui.popScreen(); } }]
                    }));

                    // Route to Phaser view and launch the HaggleScene
                    GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.PHASER);
                    GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'HaggleScene', {
                        ui,
                        returnCallback: (ui) => {
                            ui.popScreen(); // Removes the "Returning from haggle..."

                            // Check if the piece was bought (player owns it now). 
                            // If bought, pop once more to return to Market List instead of the item's Inspect Screen
                            const ownsItem = TerminalAPI.state().portfolio.find(w => w.id === work.id);
                            if (ownsItem) {
                                ui.popScreen();
                            }
                            ui.render();
                        },
                        haggleInfo: { ...info, state, bgKey: 'bg_gallery_main_1bit_1771587911969.png' }
                    });
                }
            });

            options.push({
                label: '[1 AP] ✉️ Make Offer — Submit blind bid',
                action: () => {
                    useAction(`Drafting offer for "${work.title}"`);
                    try {
                        ui.pushScreen(makeOfferScreen(ui, work));
                    } catch (e) {
                        window.lastError = e.message;
                        ui.render();
                    }
                }
            });
        }

        if (hasActions(1)) {
            options.push({
                label: '[1 AP] Request Viewing (+2 taste, +1 intel)',
                action: () => {
                    useAction(`Viewed "${work.title}"`);
                    s.taste = Math.min(100, s.taste + 2);
                    s.intel += 1;
                    TerminalAPI.addNews(`🔍 Private viewing of "${work.title}" by ${work.artist}. Eye sharpened.`);
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
        const s = TerminalAPI.state();
        const artist = TerminalAPI.market.getArtist(work.artistId);
        const heat = artist ? Math.round(artist.heat) : 50;
        const baseChance = Math.min(0.90, (s.reputation + s.access) / 200 + (100 - heat) / 300);

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
                    action: () => {
                        try {
                            ui.pushScreen(offerNoteScreen(ui, work, price, chance, tier.label));
                        } catch (e) {
                            window.lastError = e.message;
                            ui.render();
                        }
                    }
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
            { icon: '🤝', label: '"I\'ve long admired this artist\'s trajectory."', chanceBonus: 0.05, repBonus: 0 },
            { icon: '🏛️', label: '"This would anchor my collection for years to come."', chanceBonus: 0.03, repBonus: 1 },
            { icon: '🗡️', label: '"I have other pieces I\'m considering. Let me know quickly."', chanceBonus: -0.05, repBonus: 2 },
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
                try {
                    ui.pushScreen(offerSentScreen(ui, work, offerPrice, finalChance, note, tierLabel));
                } catch (e) {
                    window.lastError = e.message;
                    ui.render();
                }
            }
        }));

        options.push({
            label: '📝 No note — just send the number.',
            action: () => {
                try {
                    ui.pushScreen(offerSentScreen(ui, work, offerPrice, baseChance, null, tierLabel));
                } catch (e) {
                    window.lastError = e.message;
                    ui.render();
                }
            }
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
        const s = TerminalAPI.state();
        if (!s.pendingOffers) s.pendingOffers = [];

        s.pendingOffers.push({
            workId: work.id,
            workTitle: work.title,
            workArtist: work.artist,
            offerPrice,
            chance: finalChance,
            note: note,
            tierLabel,
            weekSent: s.week,
            resolved: false,
            result: null
        });

        if (note && note.repBonus > 0) {
            s.reputation += note.repBonus;
        }

        TerminalAPI.addNews(`✉️ Submitted offer of $${offerPrice.toLocaleString()} for "${work.title}".`);

        const chancePct = Math.round(finalChance * 100);

        const lines = [
            H('OFFER SUBMITTED'),
            DIM('The seller is reviewing your proposal.'),
            DIV(),
            STAT('Work', work.title),
            STAT('Asking', `$${work.price.toLocaleString()}`),
            STAT('Your Offer', `$${offerPrice.toLocaleString()} (${tierLabel})`, 'gold'),
            note ? STAT('Note attached', note.label) : BLANK(),
            DIV(),
            DIM(`Based on current market conditions and your reputation/access,`),
            DIM(`we estimate a ${chancePct}% chance of acceptance.`),
            BLANK(),
            GOLD('You will receive a message on your Phone next week with their response.'),
            BLANK()
        ];

        const options = [
            {
                label: 'Return to Market',
                action: () => {
                    ui.popScreen(); ui.popScreen(); ui.popScreen(); ui.popScreen();
                }
            },
            {
                label: 'Return to Dashboard',
                action: () => ui.replaceScreen(dashboardScreen(ui))
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
        const s = TerminalAPI.state();
        const totalValue = TerminalAPI.getPortfolioValue();

        const lines = [
            H('PORTFOLIO'),
            DIM(`Total estimated value: $${totalValue.toLocaleString()}`),
            DIV(),
        ];

        if (s.portfolio.length === 0) {
            lines.push(DIM('Your portfolio is currently empty.'));
        } else {
            s.portfolio.forEach((work, i) => {
                const artist = TerminalAPI.market.getArtist(work.artistId);
                const isHot = artist && artist.heat > 60;

                const currentValue = work.estimatedValue ?? work.price ?? 0;
                const boughtAt = work.purchasePrice ?? work.price ?? 0;
                const roi = boughtAt > 0 ? Math.round(((currentValue - boughtAt) / boughtAt) * 100) : 0;
                const heatFlag = isHot ? '🔥' : '  ';
                const loc = work.storage || work.location || 'home';
                const locIcon = STORAGE_ICONS[loc] || '📦';

                lines.push(`${heatFlag} ${work.title}`);
                lines.push(DIM(`   ${locIcon} ${work.artist} (${work.yearCreated ?? work.year ?? '—'}) • Value: $${currentValue.toLocaleString()} (ROI: ${roi > 0 ? '+' : ''}${roi}%)`));
            });
        }

        const options = s.portfolio.map((work, i) => ({
            label: `Manage "${work.title}"`,
            action: () => {
                try {
                    ui.pushScreen(pieceDetailScreen(ui, work));
                } catch (e) {
                    window.lastError = e.message;
                    ui.render();
                }
            }
        }));

        options.push({ label: '← Back', action: () => ui.popScreen() });
        return { lines, options };
    };
}

export function pieceDetailScreen(ui, work) {
    return () => {
        const s = TerminalAPI.state();
        const currentValue = work.estimatedValue ?? work.price ?? 0;
        const boughtAt = work.purchasePrice ?? work.price ?? 0;
        const loc = work.storage || work.location || 'home';
        const roiDiff = currentValue - boughtAt;
        const roiPct = boughtAt > 0 ? Math.round((roiDiff / boughtAt) * 100) : 0;

        const lines = [
            H(work.title),
            `${work.artist} (${work.yearCreated ?? work.year ?? '—'})`,
            DIM(work.medium || 'Mixed Media'),
            DIV(),
            STAT('Est. Value', `$${currentValue.toLocaleString()}`, 'gold'),
            STAT('Paid', `$${boughtAt.toLocaleString()}`),
            STAT('Total ROI', `$${roiDiff.toLocaleString()} (${roiPct > 0 ? '+' : ''}${roiPct}%)`, roiDiff >= 0 ? 'green' : 'red'),
            STAT('Location', STORAGE_LABELS[loc] || 'Unknown'),
            DIV()
        ];

        if (loc === 'home') lines.push(DIM('Art at Home secures no fees but carries a 1% risk of theft/damage per week.'));
        if (loc === 'freeport') lines.push(DIM('Freeport storage is secure but costs $200/month.'));
        if (loc === 'gallery-loan') lines.push(DIM('On loan to a gallery. Building provenance (+Value).'));

        lines.push(BLANK());

        const options = [];
        const hasActionsLeft = hasActions(1);

        options.push({
            label: 'View Detailed Dossier & Provenance',
            action: () => GameEventBus.emit(GameEvents.UI_TOGGLE_OVERLAY, OVERLAY.ARTWORK_DASHBOARD, { work })
        });

        if (loc === 'home') {
            options.push({
                label: 'Move to Freeport vault ($200/mo)',
                action: () => {
                    work.storage = 'freeport';
                    ui.showNotification(`${work.title} moved to Freeport`, '🔒');
                    ui.replaceScreen(pieceDetailScreen(ui, work));
                }
            });
        } else if (loc === 'freeport') {
            options.push({
                label: 'Move Home (Free storage)',
                action: () => {
                    work.storage = 'home';
                    ui.showNotification(`${work.title} moved Home`, '🏠');
                    ui.replaceScreen(pieceDetailScreen(ui, work));
                }
            });
        }

        if (hasActionsLeft) {
            options.push({
                label: '[2 AP] List for sale via Private Broker',
                action: () => {
                    try {
                        ui.pushScreen(listWorkScreen(ui, work));
                    } catch (e) {
                        window.lastError = e.message;
                        ui.render();
                    }
                }
            });
        }

        options.push({ label: '← Back to Portfolio', action: () => ui.popScreen() });
        return { lines, options };
    };
}

// ════════════════════════════════════════════
// SCREEN: List Work
// ════════════════════════════════════════════
function listWorkScreen(ui, work) {
    return () => {
        const s = TerminalAPI.state();
        const estValue = work.estimatedValue ?? work.price ?? 0;
        const repBonus = s.reputation / 100;

        const quickValue = Math.round(estValue * 0.85);
        const marketValue = estValue;
        const premiumValue = Math.round(estValue * 1.15);

        const lines = [
            H('SELL ARTWORK'),
            SUB(`"${work.title}" by ${work.artist}`),
            DIV(),
            STAT('Est. Value', `$${estValue.toLocaleString()}`),
            BLANK(),
            DIM('Choose how to list this work.'),
            BLANK()
        ];

        const options = [
            {
                label: `[2 AP] Quick Sale: $${quickValue.toLocaleString()} (Guaranteed instant sale)`,
                action: () => {
                    useAction(`Sold "${work.title}" for $${quickValue.toLocaleString()} (Quick Sale)`, 2);
                    s.cash += quickValue;
                    s.portfolio = s.portfolio.filter(w => w.id !== work.id);
                    TerminalAPI.addNews(`Sold "${work.title}" instantly for $${quickValue.toLocaleString()}`);
                    ui.popScreen(); ui.popScreen(); ui.replaceScreen(portfolioScreen(ui));
                }
            },
            {
                label: `[2 AP] Market Price: $${marketValue.toLocaleString()} (~2-4 weeks)`,
                action: () => {
                    useAction(`Listed "${work.title}" for $${marketValue.toLocaleString()}`, 2);
                    TerminalAPI.addNews(`Listed "${work.title}" for $${marketValue.toLocaleString()}`);
                    work.listed = true;
                    s.activeDeals.push({ work, strategy: 'Market Price', resolutionWeek: s.week + 2 + Math.floor(Math.random() * 3) });
                    s.portfolio = s.portfolio.filter(w => w.id !== work.id);
                    ui.popScreen(); ui.popScreen(); ui.replaceScreen(portfolioScreen(ui));
                }
            },
            {
                label: `[2 AP] Premium Price: $${premiumValue.toLocaleString()} (~4-8 weeks, risky)`,
                action: () => {
                    useAction(`Listed "${work.title}" for $${premiumValue.toLocaleString()}`, 2);
                    TerminalAPI.addNews(`Listed "${work.title}" for premium $${premiumValue.toLocaleString()}`);
                    work.listed = true;
                    s.activeDeals.push({ work, strategy: 'Premium Price', resolutionWeek: s.week + 4 + Math.floor(Math.random() * 5) });
                    s.portfolio = s.portfolio.filter(w => w.id !== work.id);
                    ui.popScreen(); ui.popScreen(); ui.replaceScreen(portfolioScreen(ui));
                }
            },
            { label: '← Cancel', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}
