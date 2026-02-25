/**
 * src/terminal/screens/dashboard-weekly.js
 * Week transition and weekly report screens extracted from dashboard.js.
 *
 * Contains: weekTransitionScreen, weekReportScreen
 *
 * The week transition shows an Oregon Trail-style day ticker animation,
 * then advances the week and shows the financial/market report.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, SUB, DIV, BLANK, DIM, GOLD, RED } from './shared.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ACTIVITIES = [
    'Gallery visits...', 'Coffee with contacts...', 'Reviewing portfolios...',
    'Attending a viewing...', 'Market research...', 'Studio visits...',
    'Phone calls...', 'Reading the reviews...', 'Auction catalogues...',
    'Networking...', 'Paperwork...', 'Walking the neighborhood...',
    'Checking prices...', 'Running the numbers...', 'Making connections...',
];

// ════════════════════════════════════════════
// SCREEN: Week Transition (Oregon Trail ticker)
// ════════════════════════════════════════════
export function weekTransitionScreen(ui, getDashboardScreen) {
    return () => {
        const s = TerminalAPI.state();
        const weekNum = (s?.week || 1);
        const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Math.floor((weekNum - 1) / 4) % 12];

        // Pick random activities for each day
        const shuffled = [...DAY_ACTIVITIES].sort(() => Math.random() - 0.5);

        // Build the day-by-day ticker HTML
        let tickerHtml = `<div class="wt-container">`;
        tickerHtml += `<div class="wt-header">WEEK ${weekNum} — ${month}</div>`;
        tickerHtml += `<div class="wt-divider">─────────────────────────────</div>`;

        DAYS.forEach((day, i) => {
            const activity = shuffled[i % shuffled.length];
            const delay = i * 0.3;
            tickerHtml += `<div class="wt-day" style="animation-delay: ${delay}s">`;
            tickerHtml += `<span class="wt-day-name">${day}</span>`;
            tickerHtml += `<span class="wt-day-dots">·····</span>`;
            tickerHtml += `<span class="wt-day-activity">${activity}</span>`;
            tickerHtml += `</div>`;
        });

        tickerHtml += `<div class="wt-divider" style="animation-delay: 2.1s">─────────────────────────────</div>`;
        tickerHtml += `<div class="wt-summary" style="animation-delay: 2.4s">Week complete. Processing results...</div>`;
        tickerHtml += `</div>`;

        // Auto-advance to week report after animation
        setTimeout(() => {
            try {
                TerminalAPI.advanceWeek();
                ui.replaceScreen(weekReportScreen(ui, getDashboardScreen));
            } catch (err) {
                window.lastError = err.message;
                ui.render();
            }
        }, 2800);

        return {
            lines: [{ type: 'raw', text: tickerHtml }],
            options: [
                {
                    label: '⏩  Skip →', action: () => {
                        try {
                            TerminalAPI.advanceWeek();
                            ui.replaceScreen(weekReportScreen(ui, getDashboardScreen));
                        } catch (err) {
                            window.lastError = err.message;
                            ui.render();
                        }
                    }
                },
            ],
        };
    };
}

// ════════════════════════════════════════════
// SCREEN: Weekly Report (post-advance notification)
// ════════════════════════════════════════════
export function weekReportScreen(ui, getDashboardScreen) {
    return () => {
        const report = TerminalAPI.getLastWeekReport();
        const s = TerminalAPI.state();
        if (!report) {
            return {
                lines: [H('WEEK REPORT'), DIM('No report data available.')],
                options: [{ label: '→ Continue', action: () => ui.replaceScreen(getDashboardScreen(ui)) }]
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
                options: [{ label: '→ Continue to Dashboard', action: () => ui.replaceScreen(getDashboardScreen(ui)) }]
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

        // ── NPC Market Activity ──
        const simReport = TerminalAPI.npcMarket.getWeeklyReport();
        if (simReport && simReport.tradesExecuted > 0) {
            let simHtml = `<div class="db-panel"><div class="db-panel-header">NPC MARKET ACTIVITY</div>`;
            simHtml += `<div class="db-news-item"><span class="db-news-marker">📊</span> `
                + `${simReport.tradesExecuted} trade${simReport.tradesExecuted !== 1 ? 's' : ''} executed`
                + ` · $${simReport.totalVolume.toLocaleString()} total volume</div>`;

            // Show individual trade headlines
            const trades = simReport.trades || [];
            trades.slice(0, 4).forEach(t => {
                const buyer = TerminalAPI.contacts.find(c => c.id === t.buyer);
                const seller = TerminalAPI.contacts.find(c => c.id === t.seller);
                const artwork = TerminalAPI.artworks.find(a => a.id === t.artwork);
                const buyerName = buyer?.name || t.buyer;
                const sellerName = seller?.name || t.seller;
                const title = artwork?.title || t.artwork;
                simHtml += `<div class="db-news-item"><span class="db-news-marker">▸</span> `
                    + `${buyerName} acquired "${title}" from ${sellerName} · $${t.price.toLocaleString()}</div>`;
            });
            if (trades.length > 4) {
                simHtml += `<div class="db-news-item" style="color:#555">  ... +${trades.length - 4} more trades</div>`;
            }

            simHtml += `</div>`;
            lines.push({ type: 'raw', text: simHtml });
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
            options: [{ label: '→ Continue to Dashboard', action: () => ui.replaceScreen(getDashboardScreen(ui)) }]
        };
    };
}
