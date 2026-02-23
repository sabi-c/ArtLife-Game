import { generateId } from '../utils/id.js';

/**
 * ActivityLogger — Universal Game Action Logger
 *
 * Captures ALL significant game actions across 8 categories:
 *   dialogue, haggle, trade, movement, item, npc, storyline, market, system
 *
 * Each entry: { id, timestamp, week, category, action, details, tags }
 *
 * Query API: getAll, getByCategory, getByWeek, getByNPC, getRecent, search, getStats
 */
export class ActivityLogger {
    static entries = [];
    static MAX_ENTRIES = 2000;

    // ── Category Constants ──
    static CAT = {
        DIALOGUE: 'dialogue',
        HAGGLE: 'haggle',
        TRADE: 'trade',
        MOVEMENT: 'movement',
        ITEM: 'item',
        NPC: 'npc',
        STORYLINE: 'storyline',
        MARKET: 'market',
        SYSTEM: 'system',
    };

    // ── Category Meta (for CMS display) ──
    static CATEGORY_META = {
        dialogue: { icon: '💬', color: '#c9a84c', label: 'Dialogue' },
        haggle: { icon: '⚔️', color: '#ff6644', label: 'Haggle' },
        trade: { icon: '🎨', color: '#4ade80', label: 'Trade' },
        movement: { icon: '🚶', color: '#60a5fa', label: 'Movement' },
        item: { icon: '📦', color: '#a78bfa', label: 'Item' },
        npc: { icon: '🧑', color: '#fbbf24', label: 'NPC' },
        storyline: { icon: '📖', color: '#f472b6', label: 'Storyline' },
        market: { icon: '📊', color: '#44bb88', label: 'Market' },
        system: { icon: '⚙️', color: '#888', label: 'System' },
    };

    /**
     * Log a game action.
     * @param {string} category - One of CAT values
     * @param {string} action - Specific action (e.g. 'choice_made', 'battle_start')
     * @param {object} details - Action-specific data
     * @param {object} [options] - Extra options
     * @param {string[]} [options.tags]
     * @param {string} [options.npcId]
     * @param {number} [options.week] - Override week (defaults to current)
     */
    static log(category, action, details = {}, options = {}) {
        const week = options.week ?? (window._artLifeState?.week || 0);
        const entry = {
            id: generateId('act'),
            timestamp: Date.now(),
            week,
            category,
            action,
            details,
            tags: options.tags || [],
            npcId: options.npcId || details.npcId || details.npcInvolved || null,
        };

        ActivityLogger.entries.push(entry);

        // Cap size
        if (ActivityLogger.entries.length > ActivityLogger.MAX_ENTRIES) {
            ActivityLogger.entries = ActivityLogger.entries.slice(-ActivityLogger.MAX_ENTRIES);
        }

        // Debug logging in development
        if (typeof console !== 'undefined' && window?.ArtLife?.debug) {
            const meta = ActivityLogger.CATEGORY_META[category];
            console.log(`[ActivityLogger] ${meta?.icon || '•'} ${category}:${action}`, details);
        }

        return entry;
    }

    // ── Convenience loggers ──

    static logDialogue(action, details, npcId) {
        return ActivityLogger.log(ActivityLogger.CAT.DIALOGUE, action, details, { npcId });
    }

    static logHaggle(action, details, npcId) {
        return ActivityLogger.log(ActivityLogger.CAT.HAGGLE, action, details, { npcId });
    }

    static logTrade(action, details, npcId) {
        return ActivityLogger.log(ActivityLogger.CAT.TRADE, action, details, { npcId });
    }

    static logMovement(action, details) {
        return ActivityLogger.log(ActivityLogger.CAT.MOVEMENT, action, details);
    }

    static logNPC(action, details, npcId) {
        return ActivityLogger.log(ActivityLogger.CAT.NPC, action, details, { npcId });
    }

    static logStoryline(action, details) {
        return ActivityLogger.log(ActivityLogger.CAT.STORYLINE, action, details);
    }

    static logMarket(action, details) {
        return ActivityLogger.log(ActivityLogger.CAT.MARKET, action, details);
    }

    static logSystem(action, details) {
        return ActivityLogger.log(ActivityLogger.CAT.SYSTEM, action, details);
    }

    // ── Query API ──

    static getAll() { return ActivityLogger.entries; }

    static getRecent(count = 50) {
        return ActivityLogger.entries.slice(-count).reverse();
    }

    static getByCategory(category) {
        return ActivityLogger.entries.filter(e => e.category === category);
    }

    static getByWeek(week) {
        return ActivityLogger.entries.filter(e => e.week === week);
    }

    static getByWeekRange(start, end) {
        return ActivityLogger.entries.filter(e => e.week >= start && e.week <= end);
    }

    static getByNPC(npcId) {
        return ActivityLogger.entries.filter(e => e.npcId === npcId);
    }

    static getByAction(action) {
        return ActivityLogger.entries.filter(e => e.action === action);
    }

    static search(query) {
        const q = query.toLowerCase();
        return ActivityLogger.entries.filter(e =>
            e.action.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q) ||
            JSON.stringify(e.details).toLowerCase().includes(q) ||
            (e.npcId || '').toLowerCase().includes(q)
        );
    }

    // ── Stats ──

    static getStats() {
        const entries = ActivityLogger.entries;
        const categories = {};
        const npcCounts = {};
        const weekCounts = {};

        entries.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + 1;
            if (e.npcId) npcCounts[e.npcId] = (npcCounts[e.npcId] || 0) + 1;
            weekCounts[e.week] = (weekCounts[e.week] || 0) + 1;
        });

        // Find most active NPC
        let topNPC = null;
        let topNPCCount = 0;
        Object.entries(npcCounts).forEach(([id, count]) => {
            if (count > topNPCCount) { topNPC = id; topNPCCount = count; }
        });

        return {
            total: entries.length,
            categories,
            topNPC,
            topNPCCount,
            weekCounts,
            uniqueNPCs: Object.keys(npcCounts).length,
            oldestWeek: entries.length > 0 ? entries[0].week : 0,
            newestWeek: entries.length > 0 ? entries[entries.length - 1].week : 0,
        };
    }

    static reset() {
        ActivityLogger.entries = [];
    }
}
