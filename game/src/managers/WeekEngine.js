/**
 * WeekEngine — orchestrates the weekly advance with error isolation.
 * Extracted from GameState.advanceWeek() during Code Audit Phase 2.7.
 *
 * Each subsystem tick is wrapped in try/catch so one failure
 * doesn't prevent others from running.
 */

import { GameState } from './GameState.js';
import { DealResolver } from './DealResolver.js';
import { PhoneManager } from './PhoneManager.js';
import { NPCMemory } from './NPCMemory.js';
import { ConsequenceScheduler } from './ConsequenceScheduler.js';
import { MarketManager } from './MarketManager.js';
import { GameEventBus, GameEvents } from './GameEventBus.js';

export class WeekEngine {
    /** Last week's advance report — set after each advanceWeek() call. */
    static lastReport = null;

    /**
     * Advance the game by one week.
     * Runs all subsystems in order, each isolated by try/catch.
     * Populates `WeekEngine.lastReport` with a summary of what happened.
     */
    static advanceWeek() {
        const state = GameState.state;

        // Snapshot state before advance
        const prevCash = state.cash;
        const prevPortfolioValue = GameState.getPortfolioValue();
        const prevMarketState = state.marketState;
        const prevWeek = state.week;
        const prevNewsLen = (state.newsFeed || []).length;
        const prevMsgCount = PhoneManager.messages.length;

        state.week++;
        state.actionsThisWeek = 0;

        // ── Forced rest check (burnout) ──
        if (state.forcedRest) {
            state.forcedRest = false;
            state.burnout = Math.max(0, state.burnout - 3);
            GameState.addNews('You took a forced rest week. Burnout easing.');
            WeekEngine.lastReport = {
                week: state.week,
                forcedRest: true,
                headlines: ['Forced rest week — burnout easing.'],
                cashDelta: 0,
                portfolioDelta: 0,
                marketState: state.marketState,
                newMessages: 0,
            };
            return;
        }

        // ── Pipeline / Active Deals ──
        try { DealResolver.resolveDeals(state); }
        catch (e) { console.error('[WeekEngine] Deal resolution failed:', e); }

        // ── Phone Messages ──
        try { PhoneManager.generateTurnMessages(); }
        catch (e) { console.error('[WeekEngine] Phone messages failed:', e); }

        // ── NPC Autonomous Tick ──
        try { NPCMemory.autonomousTick(); }
        catch (e) { console.error('[WeekEngine] NPC tick failed:', e); }

        // ── Scheduled Consequences ──
        try { ConsequenceScheduler.tick(state.week); }
        catch (e) { console.error('[WeekEngine] Consequences failed:', e); }

        // ── Pending Offers ──
        try { DealResolver.resolvePendingOffers(state); }
        catch (e) { console.error('[WeekEngine] Pending offers failed:', e); }

        // ── Freeport Storage Costs (every 4 weeks) ──
        try { WeekEngine._processFreeportCosts(state); }
        catch (e) { console.error('[WeekEngine] Freeport costs failed:', e); }

        // ── Insurance / Theft Risk ──
        try { WeekEngine._processTheftRisk(state); }
        catch (e) { console.error('[WeekEngine] Theft risk failed:', e); }

        // ── Anti-Resource Decay (moved from MarketManager) ──
        try { WeekEngine._decayAntiResources(state); }
        catch (e) { console.error('[WeekEngine] Anti-resource decay failed:', e); }

        // ── Burnout Tracking ──
        try { WeekEngine._processBurnout(state); }
        catch (e) { console.error('[WeekEngine] Burnout failed:', e); }

        // ── Market State Transition ──
        try { WeekEngine._processMarketTransition(state); }
        catch (e) { console.error('[WeekEngine] Market transition failed:', e); }

        // ── Wealth Snapshot ──
        try { WeekEngine._recordWealthSnapshot(state); }
        catch (e) { console.error('[WeekEngine] Wealth snapshot failed:', e); }

        // ── Build Report ──
        const newPortfolioValue = GameState.getPortfolioValue();
        const newNews = (state.newsFeed || []).slice(prevNewsLen);
        const newMsgCount = PhoneManager.messages.length - prevMsgCount;
        const marketChanged = prevMarketState !== state.marketState;

        WeekEngine.lastReport = {
            week: state.week,
            forcedRest: false,
            headlines: newNews.map(n => typeof n === 'string' ? n : n.text),
            cashDelta: state.cash - prevCash,
            portfolioDelta: newPortfolioValue - prevPortfolioValue,
            netWorth: state.cash + newPortfolioValue,
            marketState: state.marketState,
            marketChanged,
            prevMarketState: marketChanged ? prevMarketState : null,
            newMessages: Math.max(0, newMsgCount),
            burnout: state.burnout,
            heat: state.marketHeat,
            suspicion: state.suspicion,
        };

        // ── Game-Over Check ──
        if (GameState.isBankrupt()) {
            GameEventBus.emit(GameEvents.GAME_OVER, { reason: 'bankrupt', week: state.week });
        }
    }

    // ── Internal helpers ──

    static _decayAntiResources(state) {
        // Natural marketHeat decay — cools 1 point per turn
        if (state.marketHeat > 0) {
            state.marketHeat = Math.max(0, state.marketHeat - 1);
        }
        // Natural suspicion decay — cools 0.5 per turn
        if (state.suspicion > 0) {
            state.suspicion = Math.max(0, state.suspicion - 0.5);
        }
    }

    static _processFreeportCosts(state) {
        if (state.week % 4 === 0) {
            const freeportPieces = state.portfolio.filter(w => w.storage === 'freeport');
            const storageCost = freeportPieces.length * 200;
            if (storageCost > 0) {
                state.cash -= storageCost;
                GameState.addNews(`Freeport storage fees: -$${storageCost.toLocaleString()} (${freeportPieces.length} pieces)`);
            }
        }
    }

    static _processTheftRisk(state) {
        const stolen = [];
        state.portfolio = state.portfolio.filter(work => {
            if (work.storage === 'home' && !work.insured && Math.random() < 0.01) {
                stolen.push(work);
                return false;
            }
            return true;
        });
        stolen.forEach(work => {
            const val = MarketManager.getWorkValue(work);
            GameState.addNews(`THEFT: "${work.title}" by ${work.artist} ($${val.toLocaleString()}) was stolen from your home! Uninsured.`);
        });
    }

    static _processBurnout(state) {
        if (state.marketHeat > 30) {
            state.burnout = Math.min(10, state.burnout + 0.5);
        }
        if (state.burnout > 0 && state.marketHeat < 15) {
            state.burnout = Math.max(0, state.burnout - 0.3);
        }
        if (state.burnout >= 8) {
            state.forcedRest = true;
            GameState.addNews('Burnout critical. You need to rest next week.');
        }
    }

    static _processMarketTransition(state) {
        state.marketStateTurnsRemaining--;
        if (state.marketStateTurnsRemaining <= 0) {
            const states = ['bull', 'bear', 'flat'];
            const current = state.marketState;
            const next = states.filter(s => s !== current)[Math.floor(Math.random() * 2)];
            state.marketState = next;
            state.marketStateTurnsRemaining = 20 + Math.floor(Math.random() * 40);

            const newsText = next === 'bull'
                ? 'The market is turning bullish. Prices are climbing.'
                : next === 'bear'
                    ? 'Bear market signals. Collectors are cautious.'
                    : 'Market stabilising. Flat conditions ahead.';
            GameState.addNews(newsText);
        }
    }

    static _recordWealthSnapshot(state) {
        const portfolioVal = GameState.getPortfolioValue();
        (state.wealthHistory = state.wealthHistory || []).push({
            week: state.week,
            cash: state.cash,
            assets: portfolioVal,
        });
        if (state.wealthHistory.length > 52) state.wealthHistory.shift();
    }
}

// Self-register with GameState to avoid circular dependency
GameState.registerWeekEngine(WeekEngine);
