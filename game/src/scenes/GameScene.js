import Phaser from 'phaser';
import { GameState } from '../managers/GameState.js';
import { MarketManager } from '../managers/MarketManager.js';
import { EventManager } from '../managers/EventManager.js';
import { PhoneManager } from '../managers/PhoneManager.js';
import { DecisionLog } from '../managers/DecisionLog.js';
import { getUpcomingEvents } from '../data/calendar_events.js';
import { VENUES } from '../data/rooms.js';

/**
 * Main Game Scene — Hub Layout
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  WEEK 12 • MAR 2024       MARKET: BULL       $420K  Insider │
 * ├────────────┬──────────────────────────────┬──────────────────┤
 * │  PORTFOLIO │  [Market] [Calendar] [Intel] │   📱 PHONE      │
 * │            │   (tabbed center panel)      │   messages,      │
 * │            │                              │   contacts       │
 * ├────────────┴──────────────────────────────┴──────────────────┤
 * │                    [ ADVANCE WEEK ]                          │
 * └──────────────────────────────────────────────────────────────┘
 */
export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.activeTab = 'market';
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.fadeIn(400, 10, 10, 15);

        // Define layout zones
        this.layout = {
            topBarH: 48,
            bottomBarH: 52,
            leftPanelW: 240,
            rightPanelW: 210,
            get centerW() { return width - this.leftPanelW - this.rightPanelW; },
            get contentH() { return height - this.topBarH - this.bottomBarH; },
        };

        // Dark background
        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f);

        // ── Draw all panels ──
        this.drawTopBar(width);
        this.drawPortfolio();
        this.drawCenterTabs();
        this.drawCenterContent();
        this.drawPhonePanel();
        this.drawBottomBar(width, height);

        // Check for pending events
        this.time.delayedCall(500, () => this.checkForEvents());
    }

    // ═══════════════════════════
    // TOP BAR
    // ═══════════════════════════
    drawTopBar(width) {
        const state = GameState.state;
        const bar = this.add.graphics();
        bar.fillStyle(0x14141f, 1);
        bar.fillRect(0, 0, width, this.layout.topBarH);
        bar.lineStyle(1, 0x2a2a3a);
        bar.lineBetween(0, this.layout.topBarH, width, this.layout.topBarH);

        this.add.text(16, 14, `WEEK ${state.week}  •  ${this.getDateString()}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#c9a84c',
        });

        const marketColor = state.marketState === 'bull' ? '#3a8a5c'
            : state.marketState === 'bear' ? '#c94040' : '#7a7a8a';
        this.add.text(width / 2, 14, `MARKET: ${state.marketState.toUpperCase()}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '9px',
            color: marketColor,
        }).setOrigin(0.5, 0);

        // Rep bar + anti-resources
        const repText = `REP: ${state.reputation}`;
        const heatColor = state.marketHeat > 30 ? '#c94040' : '#4a4a5a';
        const burnoutLevel = Math.round(state.burnout || 0);
        let antiText = '';
        if (state.marketHeat > 0 || state.suspicion > 0 || burnoutLevel > 0) {
            antiText = `  •  🌡️${state.marketHeat}  🔍${Math.round(state.suspicion)}`;
            if (burnoutLevel > 0) antiText += `  😴${burnoutLevel}`;
        }
        this.add.text(width / 2, 30, repText + antiText, {
            fontFamily: '"Press Start 2P"',
            fontSize: '7px',
            color: state.marketHeat > 30 || state.suspicion > 30 || burnoutLevel >= 6 ? '#c94040' : '#4a4a5a',
        }).setOrigin(0.5, 0);

        this.add.text(width - 16, 14, `$${state.cash.toLocaleString()}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#e8e4df',
        }).setOrigin(1, 0);

        this.add.text(width - 16, 30, state.character.name, {
            fontFamily: '"Press Start 2P"',
            fontSize: '7px',
            color: '#4a4a5a',
        }).setOrigin(1, 0);
    }

    // ═══════════════════════════
    // LEFT PANEL: Portfolio
    // ═══════════════════════════
    drawPortfolio() {
        const { leftPanelW, topBarH, contentH } = this.layout;
        const x = 0;
        const y = topBarH;
        const state = GameState.state;

        // Panel background
        const panel = this.add.graphics();
        panel.fillStyle(0x12121c, 0.95);
        panel.fillRect(x, y, leftPanelW, contentH);
        panel.lineStyle(1, 0x2a2a3a);
        panel.lineBetween(leftPanelW, y, leftPanelW, y + contentH);

        this.add.text(x + 12, y + 10, 'YOUR COLLECTION', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#c9a84c',
        });

        const totalValue = GameState.getPortfolioValue();
        this.add.text(x + 12, y + 28, `Value: $${totalValue.toLocaleString()}`, {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#b0b0c0',
        });

        const works = state.portfolio;
        const activeDeals = state.activeDeals || [];

        if (works.length === 0 && activeDeals.length === 0) {
            this.add.text(x + 12, y + 55, 'No works yet.\nVisit the market\nto acquire your\nfirst piece.', {
                fontFamily: '"Playfair Display"', fontSize: '12px',
                color: '#4a4a5a', fontStyle: 'italic', lineSpacing: 4,
            });
            return;
        }

        let displayIndex = 0;

        // Draw Portfolio
        works.forEach((work) => {
            if (displayIndex > 5) return; // limit to leave room for active deals
            const wy = y + 48 + displayIndex * 30;
            const currentVal = MarketManager.getWorkValue(work);
            const pnl = currentVal - work.purchasePrice;
            const pnlColor = pnl >= 0 ? '#3a8a5c' : '#c94040';
            const pnlSign = pnl >= 0 ? '+' : '';

            this.add.text(x + 12, wy, work.title, {
                fontFamily: '"Playfair Display"', fontSize: '10px', color: '#e8e4df',
            });

            this.add.text(x + 12, wy + 13, `${work.artist} • $${currentVal.toLocaleString()} (${pnlSign}${Math.round(pnl / work.purchasePrice * 100)}%)`, {
                fontFamily: '"Press Start 2P"', fontSize: '5px', color: pnlColor,
            });

            const sellBtn = this.add.text(x + leftPanelW - 18, wy + 6, '[ LIST ]', {
                fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#88bbdd',
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

            sellBtn.on('pointerover', () => sellBtn.setColor('#ffffff'));
            sellBtn.on('pointerout', () => sellBtn.setColor('#88bbdd'));
            sellBtn.on('pointerdown', () => {
                this.showListWorkModal(work, currentVal, pnl);
            });

            displayIndex++;
        });

        // Draw Active Deals Pipeline
        if (activeDeals.length > 0) {
            displayIndex++; // Empty space
            const wyHeader = y + 48 + displayIndex * 30;

            this.add.text(x + 12, wyHeader, '--- PIPELINE ---', {
                fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#7a7a8a',
            });

            displayIndex++; // Move below header

            activeDeals.forEach((deal) => {
                if (displayIndex > 11) return;
                const wy = y + 42 + displayIndex * 30;
                const timeRemaining = deal.resolutionWeek - state.week;
                const timeText = timeRemaining === 1 ? '1 week' : `${timeRemaining} weeks`;

                this.add.text(x + 12, wy, deal.work.title, {
                    fontFamily: '"Playfair Display"', fontSize: '10px', color: '#a0a0b0',
                });

                this.add.text(x + 12, wy + 13, `${deal.strategy.toUpperCase()} • resolves in ${timeText}`, {
                    fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#c9a84c',
                });

                displayIndex++;
            });
        }
    }

    // ═══════════════════════════
    // CENTER PANEL: Tabbed
    // ═══════════════════════════
    drawCenterTabs() {
        const { leftPanelW, topBarH, centerW } = this.layout;
        const x = leftPanelW;
        const y = topBarH;

        // Tab bar background
        const tabBg = this.add.graphics();
        tabBg.fillStyle(0x18182a, 1);
        tabBg.fillRect(x, y, centerW, 32);
        tabBg.lineStyle(1, 0x2a2a3a);
        tabBg.lineBetween(x, y + 32, x + centerW, y + 32);

        const tabs = [
            { id: 'market', label: 'MARKET' },
            { id: 'city', label: 'CITY' },
            { id: 'calendar', label: 'CALENDAR' },
            { id: 'intel', label: 'INTEL' },
            { id: 'journal', label: 'JOURNAL' },
        ];

        const tabWidth = centerW / tabs.length;
        tabs.forEach((tab, i) => {
            const tx = x + i * tabWidth + tabWidth / 2;
            const isActive = this.activeTab === tab.id;

            const tabText = this.add.text(tx, y + 16, tab.label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '8px',
                color: isActive ? '#c9a84c' : '#4a4a5a',
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            if (isActive) {
                const underline = this.add.graphics();
                underline.lineStyle(2, 0xc9a84c);
                underline.lineBetween(tx - 30, y + 30, tx + 30, y + 30);
            }

            tabText.on('pointerover', () => { if (!isActive) tabText.setColor('#7a7a8a'); });
            tabText.on('pointerout', () => { if (!isActive) tabText.setColor('#4a4a5a'); });
            tabText.on('pointerdown', () => {
                this.activeTab = tab.id;
                this.scene.restart();
            });
        });
    }

    drawCenterContent() {
        switch (this.activeTab) {
            case 'market': this.drawMarketTab(); break;
            case 'city': this.drawCityTab(); break;
            case 'calendar': this.drawCalendarTab(); break;
            case 'intel': this.drawIntelTab(); break;
            case 'journal': this.drawJournalTab(); break;
        }
    }

    drawMarketTab() {
        const { leftPanelW, topBarH, centerW, contentH } = this.layout;
        const x = leftPanelW;
        const y = topBarH + 36;
        const maxH = contentH - 36;

        const available = MarketManager.getAvailableWorks();
        available.forEach((work, i) => {
            if (i > 5) return;
            const wy = y + 4 + i * 58;
            const artist = MarketManager.getArtist(work.artistId);

            this.add.text(x + 12, wy, work.title, {
                fontFamily: '"Playfair Display"', fontSize: '12px', color: '#e8e4df',
            });

            this.add.text(x + 12, wy + 16, `${artist.name}  •  Heat: ${Math.round(artist.heat)}`, {
                fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#7a7a8a',
            });

            // Heat bar
            this.drawHeatBar(x + 12, wy + 30, artist.heat, 70);

            // Remove instant Buy button, replace with Inspect and list the price clearly
            this.add.text(x + centerW - 20, wy, `$${work.price.toLocaleString()}`, {
                fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#e8e4df',
            }).setOrigin(1, 0);

            const inspectBtn = this.add.text(x + centerW - 20, wy + 18, '[ INSPECT ]', {
                fontFamily: '"Press Start 2P"', fontSize: '7px',
                color: '#88bbdd',
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

            // Increase hit area slightly for easier clicking
            const hitArea = new Phaser.Geom.Rectangle(-10, -10, inspectBtn.width + 20, inspectBtn.height + 20);
            inspectBtn.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

            inspectBtn.on('pointerover', () => inspectBtn.setColor('#aaddff'));
            inspectBtn.on('pointerout', () => inspectBtn.setColor('#88bbdd'));
            inspectBtn.on('pointerdown', () => {
                this.showArtworkModal(work, artist);
            });

            // Separator
            if (i < available.length - 1 && i < 5) {
                const sep = this.add.graphics();
                sep.lineStyle(1, 0x1a1a2e);
                sep.lineBetween(x + 12, wy + 50, x + centerW - 12, wy + 50);
            }
        });
    }

    drawCityTab() {
        const { leftPanelW, topBarH, centerW, contentH } = this.layout;
        const x = leftPanelW;
        const y = topBarH + 36;

        const currentCity = GameState.state.currentCity;
        const formattedCity = currentCity.replace('-', ' ').toUpperCase();

        this.add.text(x + 12, y + 4, `LOCATIONS: ${formattedCity}`, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#c9a84c',
        });

        // Filter venues by city via their tags
        const cityVenues = VENUES.filter(v =>
            v.rooms.some(r => r.tags && r.tags.includes(currentCity)) ||
            (currentCity === 'switzerland' && v.id === 'art_basel') ||
            (currentCity === 'switzerland' && v.id === 'freeport')
        );

        let vy = y + 28;
        cityVenues.forEach((venue, i) => {
            if (i > 4) return;

            this.add.text(x + 12, vy, venue.name, {
                fontFamily: '"Playfair Display"', fontSize: '13px', color: '#e8e4df',
            });

            this.add.text(x + 12, vy + 18, venue.desc, {
                fontFamily: '"Playfair Display"', fontSize: '10px', color: '#7a7a8a',
            });

            const visitBtn = this.add.text(x + centerW - 20, vy + 6, '[ VISIT ]', {
                fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#88bbdd',
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

            visitBtn.on('pointerover', () => visitBtn.setColor('#aaddff'));
            visitBtn.on('pointerout', () => visitBtn.setColor('#88bbdd'));
            visitBtn.on('pointerdown', () => {
                this.cameras.main.fadeOut(300, 10, 10, 15);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('LocationScene', { venueId: venue.id, roomId: venue.startRoom });
                });
            });

            const sep = this.add.graphics();
            sep.lineStyle(1, 0x1a1a2e);
            sep.lineBetween(x + 12, vy + 38, x + centerW - 12, vy + 38);

            vy += 45;
        });

        // Add Travel Options at the bottom
        vy += 10;
        this.add.text(x + 12, vy, 'TRAVEL (Costs 1 Week)', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#7a7a8a',
        });

        const cities = ['new-york', 'switzerland', 'london', 'hong-kong'];
        let tx = x + 12;
        let ty = vy + 15;

        cities.forEach(city => {
            if (city === currentCity) return;

            const btn = this.add.text(tx, ty, `[ TO ${city.replace('-', ' ').toUpperCase()} ]`, {
                fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#3a8a5c',
            }).setInteractive({ useHandCursor: true });

            btn.on('pointerover', () => btn.setColor('#55cc77'));
            btn.on('pointerout', () => btn.setColor('#3a8a5c'));
            btn.on('pointerdown', () => {
                const travelled = GameState.changeCity(city);
                if (travelled) {
                    this.scene.restart();
                }
            });

            tx += btn.width + 15;
            if (tx > x + centerW - 80) {
                tx = x + 12;
                ty += 15;
            }
        });
    }

    drawCalendarTab() {
        const { leftPanelW, topBarH, centerW } = this.layout;
        const x = leftPanelW;
        const y = topBarH + 36;
        const state = GameState.state;

        this.add.text(x + 12, y + 4, 'UPCOMING EVENTS', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#c9a84c',
        });

        const upcoming = getUpcomingEvents(state.week, 12);

        if (upcoming.length === 0) {
            this.add.text(x + 12, y + 28, 'Nothing on the horizon.\nQuiet weeks ahead.', {
                fontFamily: '"Playfair Display"', fontSize: '12px',
                color: '#4a4a5a', fontStyle: 'italic', lineSpacing: 4,
            });
        } else {
            upcoming.forEach((event, i) => {
                if (i > 6) return;
                const ey = y + 28 + i * 45;

                // Type icon
                const typeIcons = {
                    fair: '🎪', auction: '🔨', biennale: '🏛️',
                    social: '🍸', market: '📊', exhibition: '🖼️',
                };
                const icon = typeIcons[event.type] || '📅';

                // Timing label
                const timingLabel = event.weeksAway === 0 ? 'THIS WEEK'
                    : event.weeksAway === 1 ? 'NEXT WEEK'
                        : `IN ${event.weeksAway} WEEKS`;
                const timingColor = event.weeksAway <= 1 ? '#c9a84c' : '#7a7a8a';

                this.add.text(x + 12, ey, `${icon}  ${event.name}`, {
                    fontFamily: '"Playfair Display"', fontSize: '12px', color: '#e8e4df',
                });

                this.add.text(x + 12, ey + 16, `${event.location}  •  ${timingLabel}`, {
                    fontFamily: '"Press Start 2P"', fontSize: '6px', color: timingColor,
                });

                if (event.cost > 0) {
                    this.add.text(x + centerW - 20, ey, `$${event.cost.toLocaleString()}`, {
                        fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#7a7a8a',
                    }).setOrigin(1, 0);
                }
            });
        }
    }

    drawIntelTab() {
        const { leftPanelW, topBarH, centerW } = this.layout;
        const x = leftPanelW;
        const y = topBarH + 36;
        const state = GameState.state;

        this.add.text(x + 12, y + 4, 'NEWS FEED', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#c9a84c',
        });

        this.add.text(x + 12, y + 20, `Intel: ${state.intel}`, {
            fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#7a7a8a',
        });

        // Anti-resource indicators
        const burnoutLevel = Math.round(state.burnout || 0);
        if (state.marketHeat > 0 || state.suspicion > 0 || state.dealerBlacklisted || burnoutLevel > 0) {
            const heatColor = state.marketHeat > 30 ? '#c94040' : '#7a7a8a';
            let antiText = `🌡️ Heat: ${state.marketHeat}/100  🔍 Suspicion: ${Math.round(state.suspicion)}/100`;
            if (burnoutLevel > 0) antiText += `  😴 Burnout: ${burnoutLevel}/10`;
            if (state.dealerBlacklisted) antiText += '  🚫 BLACKLISTED';
            if (state.forcedRest) antiText += '  ⚠️ REST REQUIRED';
            this.add.text(x + 12, y + 32, antiText, {
                fontFamily: '"Press Start 2P"', fontSize: '6px',
                color: state.dealerBlacklisted || state.forcedRest ? '#c94040' : heatColor,
            });
        }

        const news = state.newsFeed.slice(-10);
        if (news.length === 0) {
            this.add.text(x + 12, y + 44, 'The art world is quiet...\nfor now.', {
                fontFamily: '"Playfair Display"', fontSize: '12px',
                color: '#4a4a5a', fontStyle: 'italic', lineSpacing: 4,
            });
        } else {
            news.reverse().forEach((item, i) => {
                if (i > 8) return;
                const ny = y + 40 + i * 28;
                this.add.text(x + 12, ny, `W${item.week}: ${item.text}`, {
                    fontFamily: '"Playfair Display"', fontSize: '10px',
                    color: '#7a7a8a',
                    wordWrap: { width: centerW - 30 },
                    lineSpacing: 2,
                });
            });
        }
    }

    drawJournalTab() {
        const { leftPanelW, topBarH, centerW } = this.layout;
        const x = leftPanelW;
        const y = topBarH + 36;
        const state = GameState.state;

        this.add.text(x + 12, y + 4, 'DECISION JOURNAL', {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#c9a84c',
        });

        const entries = DecisionLog.getJournalEntries(12);

        if (entries.length === 0) {
            this.add.text(x + 12, y + 30, 'No decisions recorded yet.\nYour choices will shape the story...', {
                fontFamily: '"Playfair Display"', fontSize: '12px',
                color: '#4a4a5a', fontStyle: 'italic', lineSpacing: 4,
            });
            return;
        }

        // Scrollable list of decisions
        entries.forEach((entry, i) => {
            if (i > 10) return; // Cap at 11 visible entries
            const ey = y + 24 + i * 34;

            // Week marker
            this.add.text(x + 12, ey, `W${entry.week}`, {
                fontFamily: '"Press Start 2P"', fontSize: '6px',
                color: '#3a3a4a',
            });

            // Blue option indicator
            const prefix = entry.isBlueOption ? '🔵 ' : '';

            // Decision text
            const titleColor = entry.isBlueOption ? '#4488cc' : '#7a7a8a';
            this.add.text(x + 50, ey, `${prefix}${entry.title}`, {
                fontFamily: '"Playfair Display"', fontSize: '10px',
                color: titleColor,
                wordWrap: { width: centerW - 100 },
            });

            // Choice made + effects
            const choiceText = `→ ${entry.choice}`;
            const effectsColor = entry.effectsSummary.includes('-') ? '#c94040' : '#3a8a5c';
            this.add.text(x + 50, ey + 14, `${choiceText}  ${entry.effectsSummary}`, {
                fontFamily: '"Playfair Display"', fontSize: '9px',
                color: '#4a4a5a',
                wordWrap: { width: centerW - 100 },
            });
        });
    }

    // ═══════════════════════════
    // RIGHT PANEL: Nokia Phone
    // ═══════════════════════════
    drawPhonePanel() {
        const { width, height } = this.scale;
        const { rightPanelW, topBarH, contentH, leftPanelW, centerW } = this.layout;
        const x = leftPanelW + centerW;
        const y = topBarH;

        // Phone panel background — slightly different shade
        const panel = this.add.graphics();
        panel.fillStyle(0x10101a, 0.98);
        panel.fillRect(x, y, rightPanelW, contentH);
        panel.lineStyle(1, 0x2a2a3a);
        panel.lineBetween(x, y, x, y + contentH);

        // Phone header
        const unread = PhoneManager.getUnreadCount();
        const headerColor = unread > 0 ? '#c9a84c' : '#4a4a5a';
        const phoneTitle = unread > 0 ? `📱 PHONE (${unread})` : '📱 PHONE';

        this.add.text(x + 12, y + 10, phoneTitle, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: headerColor,
        });

        // Notification dot if unread
        if (unread > 0) {
            const dot = this.add.circle(x + rightPanelW - 16, y + 14, 4, 0xc94040);
            this.tweens.add({
                targets: dot, alpha: 0.3, duration: 600,
                yoyo: true, repeat: -1,
            });
        }

        // ── Messages list ──
        const messages = PhoneManager.getRecentMessages(8);

        if (messages.length === 0) {
            this.add.text(x + 12, y + 38, 'No messages yet.\n\nAdvance a week\nand people will\nstart reaching out.', {
                fontFamily: '"Playfair Display"', fontSize: '11px',
                color: '#3a3a4a', fontStyle: 'italic', lineSpacing: 4,
            });
        } else {
            messages.forEach((msg, i) => {
                if (i > 6) return;
                const my = y + 34 + i * 38;
                const isUnread = !msg.read;

                // Message sender
                let senderName = 'System';
                let senderEmoji = '📰';
                if (msg.from !== 'system') {
                    const contactData = PhoneManager.getContactData(msg.from);
                    if (contactData) {
                        senderName = contactData.name;
                        senderEmoji = contactData.emoji;
                    }
                }

                // Sender line
                this.add.text(x + 12, my, `${senderEmoji} ${senderName}`, {
                    fontFamily: '"Press Start 2P"', fontSize: '6px',
                    color: isUnread ? '#c9a84c' : '#5a5a6a',
                });

                // Subject preview
                this.add.text(x + 12, my + 12, msg.body.substring(0, 40) + (msg.body.length > 40 ? '...' : ''), {
                    fontFamily: '"Playfair Display"', fontSize: '9px',
                    color: isUnread ? '#b8b4af' : '#4a4a5a',
                    wordWrap: { width: rightPanelW - 28 },
                });

                // Click to open message
                const msgHitBox = this.add.rectangle(
                    x + rightPanelW / 2, my + 14, rightPanelW - 8, 34, 0x000000, 0
                ).setInteractive({ useHandCursor: true });

                msgHitBox.on('pointerover', () => {
                    msgHitBox.setFillStyle(0x1a1a2e, 0.5);
                });
                msgHitBox.on('pointerout', () => {
                    msgHitBox.setFillStyle(0x000000, 0);
                });
                msgHitBox.on('pointerdown', () => {
                    this.openMessage(msg);
                });

                // Separator
                if (i < messages.length - 1 && i < 6) {
                    const sep = this.add.graphics();
                    sep.lineStyle(1, 0x1a1a2e, 0.5);
                    sep.lineBetween(x + 12, my + 34, x + rightPanelW - 12, my + 34);
                }
            });
        }
    }

    /**
     * Open a message in a modal overlay
     */
    openMessage(msg) {
        PhoneManager.markRead(msg.id);
        const { width, height } = this.scale;

        // Dim background
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setInteractive().setDepth(100);

        // Message card
        const cardW = 420;
        const cardH = 320;
        const cardX = width / 2;
        const cardY = height / 2;

        const card = this.add.graphics().setDepth(101);
        card.fillStyle(0x14141f, 0.98);
        card.fillRoundedRect(cardX - cardW / 2, cardY - cardH / 2, cardW, cardH, 6);
        card.lineStyle(1, 0x3a3a4e);
        card.strokeRoundedRect(cardX - cardW / 2, cardY - cardH / 2, cardW, cardH, 6);

        // Sender info
        let senderName = 'System';
        let senderEmoji = '📰';
        if (msg.from !== 'system') {
            const contactData = PhoneManager.getContactData(msg.from);
            if (contactData) {
                senderName = contactData.name;
                senderEmoji = contactData.emoji;
            }
        }

        const senderText = this.add.text(cardX - cardW / 2 + 20, cardY - cardH / 2 + 16, `${senderEmoji}  ${senderName}`, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c9a84c',
        }).setDepth(102);

        // Category badge
        const catBadge = this.add.text(cardX + cardW / 2 - 20, cardY - cardH / 2 + 18, msg.category?.toUpperCase() || '', {
            fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#5a5a6a',
        }).setOrigin(1, 0).setDepth(102);

        // Divider
        const divider = this.add.graphics().setDepth(102);
        divider.lineStyle(1, 0x2a2a3a);
        divider.lineBetween(cardX - cardW / 2 + 16, cardY - cardH / 2 + 40, cardX + cardW / 2 - 16, cardY - cardH / 2 + 40);

        // Message body
        const bodyText = this.add.text(cardX - cardW / 2 + 20, cardY - cardH / 2 + 52, msg.body, {
            fontFamily: '"Playfair Display"', fontSize: '13px', color: '#e8e4df',
            wordWrap: { width: cardW - 44 }, lineSpacing: 6,
        }).setDepth(102);

        const allElements = [overlay, card, senderText, catBadge, divider, bodyText];

        // Action buttons
        if (msg.actions && msg.actions.length > 0) {
            msg.actions.forEach((action, i) => {
                const btnY = cardY + cardH / 2 - 30 - (msg.actions.length - 1 - i) * 36;

                const btnBg = this.add.rectangle(cardX, btnY, cardW - 40, 28, 0x1a1a2e, 0.9)
                    .setStrokeStyle(1, 0x3a3a4e).setInteractive({ useHandCursor: true }).setDepth(102);

                const btnText = this.add.text(cardX, btnY, action.label, {
                    fontFamily: '"Playfair Display"', fontSize: '12px', color: '#b8b4af',
                }).setOrigin(0.5).setDepth(103);

                allElements.push(btnBg, btnText);

                btnBg.on('pointerover', () => {
                    btnBg.setStrokeStyle(1, 0xc9a84c);
                    btnText.setColor('#c9a84c');
                });
                btnBg.on('pointerout', () => {
                    btnBg.setStrokeStyle(1, 0x3a3a4e);
                    btnText.setColor('#b8b4af');
                });
                btnBg.on('pointerdown', () => {
                    PhoneManager.handleMessageAction(msg.id, i);
                    allElements.forEach((el) => el.destroy());
                    this.scene.restart();
                });
            });
        } else {
            // Close button if no actions
            const closeBtn = this.add.text(cardX, cardY + cardH / 2 - 24, '[ CLOSE ]', {
                fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#5a5a6a',
            }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(102);

            allElements.push(closeBtn);

            closeBtn.on('pointerover', () => closeBtn.setColor('#c9a84c'));
            closeBtn.on('pointerout', () => closeBtn.setColor('#5a5a6a'));
            closeBtn.on('pointerdown', () => {
                allElements.forEach((el) => el.destroy());
            });
        }

        // Click overlay to close (if no actions)
        if (!msg.actions || msg.actions.length === 0) {
            overlay.on('pointerdown', () => {
                allElements.forEach((el) => el.destroy());
            });
        }
    }

    // ═══════════════════════════
    // BOTTOM BAR: Advance Week
    // ═══════════════════════════
    drawBottomBar(width, height) {
        const barY = height - this.layout.bottomBarH;
        const bar = this.add.graphics();
        bar.fillStyle(0x14141f, 1);
        bar.fillRect(0, barY, width, this.layout.bottomBarH);
        bar.lineStyle(1, 0x2a2a3a);
        bar.lineBetween(0, barY, width, barY);

        const advanceBtn = this.add.text(width / 2, barY + 26, '[ ADVANCE WEEK ]', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#c9a84c',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        advanceBtn.on('pointerover', () => {
            advanceBtn.setColor('#e8d98c');
            advanceBtn.setScale(1.03);
        });
        advanceBtn.on('pointerout', () => {
            advanceBtn.setColor('#c9a84c');
            advanceBtn.setScale(1);
        });
        advanceBtn.on('pointerdown', () => this.advanceWeek());
    }

    // ═══════════════════════════
    // HELPERS
    // ═══════════════════════════
    drawHeatBar(x, y, heat, barWidth = 70) {
        const bar = this.add.graphics();
        const barHeight = 3;
        bar.fillStyle(0x2a2a3a, 1);
        bar.fillRect(x, y, barWidth, barHeight);

        const fillColor = heat < 20 ? 0x4a4a5a
            : heat < 40 ? 0x2a6b6b
                : heat < 60 ? 0xc9a84c
                    : heat < 80 ? 0xc97a20 : 0xc94040;
        bar.fillStyle(fillColor, 1);
        bar.fillRect(x, y, barWidth * (heat / 100), barHeight);
        return bar;
    }

    advanceWeek() {
        // 1. Advance game state (also generates phone messages)
        GameState.advanceWeek();

        // 2. Update market
        MarketManager.tick();

        // 3. Check for bankruptcy
        if (GameState.isBankrupt()) {
            this.cameras.main.fadeOut(500, 10, 10, 15);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('EndScene', { reason: 'bankruptcy' });
            });
            return;
        }

        // 4. Check for narrative events (Oregon Trail style)
        const event = EventManager.checkForEvent();
        if (event) {
            this.cameras.main.fadeOut(300, 10, 10, 15);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('DialogueScene', { event });
            });
            return;
        }

        // 5. Refresh the scene
        this.scene.restart();
    }

    checkForEvents() {
        const pending = EventManager.getPendingEvent();
        if (pending) {
            this.scene.start('DialogueScene', { event: pending });
        }
    }

    getDateString() {
        const state = GameState.state;
        const startYear = 2024;
        const totalWeeks = state.week;
        const year = startYear + Math.floor(totalWeeks / 52);
        const weekInYear = totalWeeks % 52;
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
            'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const month = months[Math.floor(weekInYear / 4.33)];
        return `${month} ${year}`;
    }

    showArtworkModal(work, artist) {
        // Create an overlay to block interaction with the rest of the scene
        const overlay = this.add.rectangle(0, 0, this.sys.game.config.width, this.sys.game.config.height, 0x000000, 0.85);
        overlay.setOrigin(0);
        overlay.setInteractive(); // Blocks clicks to underneath elements

        // Modal dimensions
        const mw = 400;
        const mh = 250;
        const mx = (this.sys.game.config.width - mw) / 2;
        const my = (this.sys.game.config.height - mh) / 2;

        const modalBg = this.add.graphics();
        modalBg.fillStyle(0x1a1a2e, 1);
        modalBg.lineStyle(2, 0x3a3a4e);
        modalBg.fillRect(mx, my, mw, mh);
        modalBg.strokeRect(mx, my, mw, mh);

        // Keep track of all created elements to destroy them later
        const modalElements = [overlay, modalBg];

        // Close button
        const closeBtn = this.add.text(mx + mw - 10, my + 10, 'X', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#7a7a8a'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#7a7a8a'));

        modalElements.push(closeBtn);

        // Content
        const titleText = this.add.text(mx + 20, my + 20, work.title, {
            fontFamily: '"Playfair Display"', fontSize: '18px', color: '#e8e4df'
        }).setOrigin(0, 0);
        modalElements.push(titleText);

        const artistText = this.add.text(mx + 20, my + 45, `${artist.name} (${work.yearCreated})`, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#88bbdd'
        }).setOrigin(0, 0);
        modalElements.push(artistText);

        const mediumText = this.add.text(mx + 20, my + 60, work.medium || artist.medium, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#7a7a8a'
        }).setOrigin(0, 0);
        modalElements.push(mediumText);

        // Lore/Description
        const themes = artist.themes || ['contemporary art'];
        const loreText = `A striking example of ${artist.name}'s recent work, exploring themes of ${themes.join(', ')}. Sourced from a primary connection.`;
        const descText = this.add.text(mx + 20, my + 85, loreText, {
            fontFamily: '"Playfair Display"', fontSize: '12px', color: '#a0a0b0',
            wordWrap: { width: mw - 40 }
        }).setOrigin(0, 0);
        modalElements.push(descText);

        // Stats Box
        const statBoxY = my + 130;
        const statBoxBg = this.add.rectangle(mx + 20, statBoxY, mw - 40, 40, 0x000000, 0.4).setOrigin(0, 0);
        modalElements.push(statBoxBg);

        const priceText = this.add.text(mx + 30, statBoxY + 10, `PRICE: $${work.price.toLocaleString()}`, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c9a84c'
        }).setOrigin(0, 0);
        modalElements.push(priceText);

        const heatText = this.add.text(mx + 30, statBoxY + 25, `ARTIST HEAT: ${Math.round(artist.heat)}/100`, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#e8e4df'
        }).setOrigin(0, 0);
        modalElements.push(heatText);

        // Interaction Buttons
        const canAfford = GameState.state.cash >= work.price;
        const buyBtn = this.add.text(mx + mw - 20, statBoxY + 15, canAfford ? '[ INSTANT BUY ]' : 'CANT AFFORD', {
            fontFamily: '"Press Start 2P"', fontSize: '10px',
            color: canAfford ? '#3a8a5c' : '#4a4a5a',
        }).setOrigin(1, 0);
        modalElements.push(buyBtn);

        // Close logic
        const closeModal = () => {
            modalElements.forEach(el => el.destroy());
        };
        closeBtn.on('pointerdown', closeModal);

        if (canAfford) {
            buyBtn.setInteractive({ useHandCursor: true });
            buyBtn.on('pointerover', () => buyBtn.setColor('#55cc77'));
            buyBtn.on('pointerout', () => buyBtn.setColor('#3a8a5c'));
            buyBtn.on('pointerdown', () => {
                GameState.buyWork(work);
                closeModal();
                this.scene.restart();
            });
        }

        // Action Buttons (Phase 3 Mechanics Placeholder)
        const actionY = my + 190;
        const actions = [
            { label: 'Schedule Meeting', color: '#88bbdd' },
            { label: 'Contact Seller', color: '#c9a84c' },
            { label: 'Make Offer', color: '#e8e4df' }
        ];

        actions.forEach((action, i) => {
            const btn = this.add.text(mx + 20 + (i * 120), actionY, `[ ${action.label} ]`, {
                fontFamily: '"Press Start 2P"', fontSize: '7px', color: action.color
            }).setInteractive({ useHandCursor: true });
            modalElements.push(btn);

            btn.on('pointerover', () => btn.setAlpha(0.7));
            btn.on('pointerout', () => btn.setAlpha(1));
            btn.on('pointerdown', () => {
                // Placeholder for linking to Dialogue or Phone systems
                console.log(`Action clicked: ${action.label} for ${work.title}`);
                GameState.addNews(`Action under construction: ${action.label}`);
                closeModal();
                this.scene.restart();
            });
        });
    }

    showListWorkModal(work, currentVal, pnl) {
        const overlay = this.add.rectangle(0, 0, this.sys.game.config.width, this.sys.game.config.height, 0x000000, 0.85);
        overlay.setOrigin(0);
        overlay.setInteractive();

        const mw = 360;
        const mh = 220;
        const mx = (this.sys.game.config.width - mw) / 2;
        const my = (this.sys.game.config.height - mh) / 2;

        const modalBg = this.add.graphics();
        modalBg.fillStyle(0x1a1a2e, 1);
        modalBg.lineStyle(2, 0x3a3a4e);
        modalBg.fillRect(mx, my, mw, mh);
        modalBg.strokeRect(mx, my, mw, mh);

        const modalElements = [overlay, modalBg];

        const closeBtn = this.add.text(mx + mw - 10, my + 10, 'X', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#7a7a8a'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#7a7a8a'));
        modalElements.push(closeBtn);

        const titleText = this.add.text(mx + 20, my + 20, "LIST ARTWORK", {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#c9a84c'
        }).setOrigin(0, 0);
        modalElements.push(titleText);

        const workText = this.add.text(mx + 20, my + 45, `${work.title} by ${work.artist}`, {
            fontFamily: '"Playfair Display"', fontSize: '14px', color: '#e8e4df'
        }).setOrigin(0, 0);
        modalElements.push(workText);

        const pnlSign = pnl >= 0 ? '+' : '';
        const pnlColor = pnl >= 0 ? '#3a8a5c' : '#c94040';

        const valText = this.add.text(mx + 20, my + 65, `Current Est: $${currentVal.toLocaleString()}`, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#88bbdd'
        }).setOrigin(0, 0);
        modalElements.push(valText);

        const returnText = this.add.text(mx + 20, my + 80, `Return: ${pnlSign}$${Math.abs(pnl).toLocaleString()}`, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', color: pnlColor
        }).setOrigin(0, 0);
        modalElements.push(returnText);

        // Instruction Text
        const instText = this.add.text(mx + 20, my + 110, "Select a sales strategy:", {
            fontFamily: '"Playfair Display"', fontSize: '12px', color: '#7a7a8a'
        }).setOrigin(0, 0);
        modalElements.push(instText);

        const closeModal = () => modalElements.forEach(el => el.destroy());
        closeBtn.on('pointerdown', closeModal);

        const strategies = [
            { id: 'contact', label: 'Pitch to Contact', desc: 'Fast, relies on network', color: '#88bbdd' },
            { id: 'auction', label: 'Consign to Auction', desc: 'Slow, potentially high return', color: '#c9a84c' },
            { id: 'public', label: 'Public Listing', desc: 'Average speed and return', color: '#e8e4df' }
        ];

        let sy = my + 130;
        strategies.forEach((strat) => {
            const btn = this.add.text(mx + 20, sy, `[ ${strat.label} ]`, {
                fontFamily: '"Press Start 2P"', fontSize: '8px', color: strat.color
            });

            // Explicit hit area
            const hitArea = new Phaser.Geom.Rectangle(-10, -5, btn.width + 20, btn.height + 10);
            btn.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains, { useHandCursor: true });

            modalElements.push(btn);

            const desc = this.add.text(mx + 170, sy, `- ${strat.desc}`, {
                fontFamily: '"Playfair Display"', fontSize: '10px', color: '#7a7a8a'
            });
            modalElements.push(desc);

            btn.on('pointerover', () => { btn.setColor('#ffffff'); desc.setColor('#e8e4df'); });
            btn.on('pointerout', () => { btn.setColor(strat.color); desc.setColor('#7a7a8a'); });
            btn.on('pointerdown', () => {
                GameState.sellWork(work.id, strat.id);
                closeModal();
                this.scene.restart();
            });

            sy += 25;
        });
    }
}
