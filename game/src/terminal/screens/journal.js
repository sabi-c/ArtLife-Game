/**
 * src/terminal/screens/journal.js
 * Extracted during Phase 41 Refactoring.
 */

import { TerminalAPI } from '../TerminalAPI.js';
import { H, SUB, DIV, DIM, GOLD, BLANK, STAT } from './shared.js';
import { characterSelectScreen } from './character.js';

export function journalScreen(ui) {
    return () => {
        const s = TerminalAPI.state();
        const decisions = TerminalAPI.decisions.getJournalEntries(15);
        const news = (s.newsFeed || []).slice(-20).reverse();
        // Since ConsequenceScheduler is not fully exposed yet we mock it here if missing
        const pending = window.ConsequenceScheduler ? window.ConsequenceScheduler.getPending() : [];

        const lines = [
            H('🗓️ CALENDAR & JOURNAL'),
            STAT('Decisions', TerminalAPI.decisions.entries.length),
            STAT('Activity Log', `${news.length} entries`),
            DIV(),
        ];

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

        if (decisions.length > 5) {
            options.unshift({
                label: `All Decisions (${TerminalAPI.decisions.entries.length})`,
                action: () => ui.pushScreen(fullDecisionsScreen(ui))
            });
        }

        return { lines, options };
    };
}

function fullDecisionsScreen(ui) {
    return () => {
        const entries = TerminalAPI.decisions.getJournalEntries(30);
        const lines = [
            H('ALL DECISIONS'),
            DIM(`${TerminalAPI.decisions.entries.length} total`),
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
export function legacyEndScreen(ui) {
    return () => {
        const s = TerminalAPI.state();
        const portfolioValue = TerminalAPI.getPortfolioValue();
        const netWorth = s.cash + portfolioValue;
        const metContacts = TerminalAPI.network.getMetContacts ? TerminalAPI.network.getMetContacts() : [];
        const totalTraded = (s.totalWorksBought || 0) + (s.totalWorksSold || 0);

        const cashScore = Math.min(100, Math.round(s.cash / 5000));
        const collectionScore = Math.min(100, Math.round(portfolioValue / 50000));
        const repScore = s.reputation;
        const tasteScore = s.taste;
        const accessScore = s.access;
        const networkScore = Math.min(100, metContacts.length * 15);

        const totalScore = Math.round(
            cashScore * 0.15 + collectionScore * 0.25 + repScore * 0.20 +
            tasteScore * 0.15 + accessScore * 0.15 + networkScore * 0.10
        );

        const ratings = [
            [90, '🏆 LIVING LEGEND'], [75, '⭐ Master Collector'], [60, '🌟 Respected Dealer'],
            [45, '💼 Serious Player'], [30, '🎨 Aspiring Collector'], [15, '📖 Curious Amateur'], [0, '👻 Forgotten'],
        ];
        const rating = ratings.find(r => totalScore >= r[0]) || ratings[ratings.length - 1];

        const lines = [
            H('═══  L E G A C Y  ═══'), BLANK(), GOLD(rating[1]),
            DIM(`Final Score: ${totalScore} / 100`), DIM(`${s.week} weeks in the art world`), DIV(),
            SUB('BREAKDOWN'),
            STAT('Cash', `$${s.cash.toLocaleString()}`, cashScore > 60 ? 'green' : ''), DIM(`  Score: ${cashScore}/100 (×0.15)`),
            STAT('Collection', `$${portfolioValue.toLocaleString()} (${s.portfolio.length} works)`, collectionScore > 60 ? 'green' : ''), DIM(`  Score: ${collectionScore}/100 (×0.25)`),
            STAT('Reputation', s.reputation, repScore > 60 ? 'green' : repScore < 30 ? 'red' : ''), DIM(`  Score: ${repScore}/100 (×0.20)`),
            STAT('Taste', s.taste, tasteScore > 60 ? 'green' : ''), DIM(`  Score: ${tasteScore}/100 (×0.15)`),
            STAT('Access', s.access, accessScore > 60 ? 'green' : ''), DIM(`  Score: ${accessScore}/100 (×0.15)`),
            STAT('Network', `${metContacts.length} contacts`, networkScore > 60 ? 'green' : ''), DIM(`  Score: ${networkScore}/100 (×0.10)`),
            DIV(), STAT('Net Worth', `$${netWorth.toLocaleString()}`, 'gold'),
            STAT('Works Traded', totalTraded),
            STAT('Decisions Made', TerminalAPI.decisions.entries.length),
        ];

        const options = [
            { label: '🔄 New Game', action: () => ui.replaceScreen(characterSelectScreen(ui)) },
            { label: '← Keep Playing', action: () => ui.popScreen() },
        ];

        return { lines, options };
    };
}
