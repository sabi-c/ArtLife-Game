/**
 * src/terminal/screens/ego.js
 * Terminal-native Ego Dashboard — inline player stats/financials.
 * Keeps the user in terminal flow instead of switching to React overlay.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, DIV, BLANK, DIM } from './shared.js';
import { sparkline, statBarHtml, generateFlavorNews } from './shared-helpers.js';

export function egoDashboardScreen(ui) {
    return () => {
        const s = TerminalAPI.state();
        if (!s) return { lines: [H('NO STATE')], options: [{ label: '← Back', action: () => ui.popScreen() }] };

        const portfolioValue = TerminalAPI.getPortfolioValue();
        const netWorth = s.cash + portfolioValue;
        const wealthNums = (s.wealthHistory || []).map(h => (h.cash || 0) + (h.assets || 0));
        const spark = sparkline(wealthNums);
        const trend = wealthNums.length >= 2
            ? (wealthNums[wealthNums.length - 1] >= wealthNums[wealthNums.length - 2] ? '↑' : '↓')
            : '';
        const dotClass = s.marketState === 'bull' ? 'bull' : s.marketState === 'bear' ? 'bear' : 'stable';

        const charName = s.character?.name || 'UNKNOWN';
        const charIcon = s.character?.icon || '🎭';
        const playerName = s.playerName || 'Agent';
        const charClass = s.character?.archetype || s.character?.class || '—';
        const drip = s.character?.drip || '—';
        const vice = s.character?.vice || '—';

        const lines = [];

        // ── Identity Card ──
        lines.push({
            type: 'raw',
            text: `<div class="ego-identity">`
                + `<div class="ego-avatar">${charIcon}</div>`
                + `<div>`
                + `<div class="ego-name">${charName.toUpperCase()}</div>`
                + `<div class="ego-meta">${playerName} · ${charClass} · Drip: ${drip} · Vice: ${vice}</div>`
                + `</div></div>`
        });

        // ── Stats ──
        lines.push({
            type: 'raw',
            text: `<div class="db-panel"><div class="db-panel-header">STATS</div>`
                + `<div class="db-stats-grid">`
                + statBarHtml('HYP', s.reputation, 100, 'var(--gold)')
                + statBarHtml('AUD', s.audacity ?? 0, 100, 'var(--red)')
                + statBarHtml('TST', s.taste, 100, 'var(--blue)')
                + statBarHtml('ACC', s.access, 100, 'var(--green)')
                + statBarHtml('INT', s.intel ?? 0, 100, '#aa66cc')
                + `</div></div>`
        });

        // ── Financial Position ──
        lines.push({
            type: 'raw',
            text: `<div class="db-panel"><div class="db-panel-header">FINANCIAL POSITION</div>`
                + `<div class="db-fin-grid">`
                + `<span class="db-fin-label">Cash</span><span class="db-fin-value green">$${s.cash.toLocaleString()}</span>`
                + `<span class="db-fin-label">Portfolio</span><span class="db-fin-value">$${portfolioValue.toLocaleString()} (${s.portfolio.length} works)</span>`
                + `<span class="db-fin-label">Net Worth</span><span class="db-fin-value gold">$${netWorth.toLocaleString()}</span>`
                + `<span class="db-fin-label">Market</span><span class="db-fin-value"><span class="db-dot ${dotClass}"></span>${s.marketState.toUpperCase()}</span>`
                + `</div></div>`
        });

        // ── Net Worth Trend ──
        lines.push({
            type: 'raw',
            text: `<div class="db-panel"><div class="db-panel-header">NET WORTH TREND</div>`
                + `<div style="font-size:1.2em;letter-spacing:2px;color:var(--green);padding:4px 0;">`
                + `${spark} ${trend}`
                + `</div></div>`
        });

        // ── Anti-Resources ──
        const heat = s.marketHeat || 0;
        const burnout = Math.round(s.burnout || 0);
        const suspicion = Math.round(s.suspicion || 0);
        if (heat > 0 || burnout > 0 || suspicion > 0) {
            lines.push({
                type: 'raw',
                text: `<div class="db-panel"><div class="db-panel-header" style="color:var(--red)">RISK FACTORS</div>`
                    + `<div class="db-stats-grid">`
                    + statBarHtml('HEAT', heat, 100, 'var(--red)')
                    + statBarHtml('BURN', burnout, 10, '#ff8844')
                    + statBarHtml('SUSP', suspicion, 100, '#cc66ff')
                    + `</div></div>`
            });
        }

        // ── Transaction Ledger (last 10) ──
        const ledger = (s.transactionLog || s.newsFeed || []).slice(-10).reverse();
        if (ledger.length > 0) {
            let ledgerHtml = `<div class="db-panel"><div class="db-panel-header">TRANSACTION LEDGER</div>`;
            ledger.forEach(entry => {
                const text = typeof entry === 'string' ? entry : entry.text || '';
                const isBuy = /bought|acquired|purchased|browse/i.test(text);
                const isSell = /sold|listed|flipped/i.test(text);
                const tag = isBuy ? '<span class="ego-tag-buy">BUY</span>'
                    : isSell ? '<span class="ego-tag-sell">SELL</span>'
                    : '';
                ledgerHtml += `<div class="ego-ledger-row">`
                    + `<span style="color:var(--fg);flex:1">${text}</span>`
                    + tag
                    + `</div>`;
            });
            ledgerHtml += `</div>`;
            lines.push({ type: 'raw', text: ledgerHtml });
        }

        // ── Market Intelligence ──
        const newsItems = generateFlavorNews(s);
        if (newsItems.length > 0) {
            let newsHtml = `<div class="db-panel"><div class="db-panel-header">MARKET INTELLIGENCE</div>`;
            newsItems.forEach(item => {
                newsHtml += `<div class="db-news-item"><span class="db-news-marker">▸</span> ${item}</div>`;
            });
            newsHtml += `</div>`;
            lines.push({ type: 'raw', text: newsHtml });
        }

        const options = [
            { label: '← Back to Dashboard', action: () => ui.popScreen() }
        ];

        return { lines, options };
    };
}
