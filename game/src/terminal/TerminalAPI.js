/**
 * TerminalAPI.js
 * Extracted during Phase 41 Architecture Refactoring.
 * A facade that provides rendering screens with a single point of access
 * to game state, managers, and data.
 */

import { GameState } from '../managers/GameState.js';
import { QualityGate } from '../managers/QualityGate.js';
import { MarketManager } from '../managers/MarketManager.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { ConsequenceScheduler } from '../managers/ConsequenceScheduler.js';
import { DecisionLog } from '../managers/DecisionLog.js';
import { DialogueTreeManager } from '../managers/DialogueTreeManager.js';
import { TickerSystem } from '../ui/TickerSystem.js';
import { useUIStore } from '../stores/uiStore.js';
import { ARTWORKS } from '../data/artworks.js';
import { VENUES } from '../data/rooms.js';
import { CHARACTERS } from '../data/characters.js';
import { CONTACTS } from '../data/contacts.js';
import { DIALOGUE_TREES, TREES_BY_NPC } from '../data/dialogue_trees.js';
import { PhoneManager } from '../managers/PhoneManager.js';
import { useNPCStore } from '../stores/npcStore.js';
import { useEventStore } from '../stores/eventStore.js';
import { useMarketStore } from '../stores/marketStore.js';
import { useInventoryStore } from '../stores/inventoryStore.js';
import { useConsequenceStore } from '../stores/consequenceStore.js';
import { EventRegistry } from '../managers/EventRegistry.js';
// Import WeekEngine to trigger self-registration with GameState
import { WeekEngine } from '../managers/WeekEngine.js';

export const TerminalAPI = {
    // ── State & Managers ──
    state: () => GameState.state,
    market: MarketManager,
    assets: window.AssetManager || {},
    haggle: HaggleManager,
    scheduler: ConsequenceScheduler,
    log: DecisionLog,
    dialogue: DialogueTreeManager,
    network: PhoneManager,
    npcStore: useNPCStore,
    ticker: TickerSystem,
    settings: window.SettingsManager || {},
    gate: QualityGate,
    decisions: DecisionLog,

    // ── Stores ──
    uiStore: useUIStore,
    marketStore: useMarketStore,
    inventoryStore: useInventoryStore,
    consequenceStore: useConsequenceStore,
    eventStore: useEventStore,

    // ── Data ──
    artworks: ARTWORKS,
    venues: VENUES,
    characters: CHARACTERS,
    contacts: CONTACTS,
    messages: [], // Removed MESSAGES
    dialogueTrees: DIALOGUE_TREES,
    treesByNpc: TREES_BY_NPC,

    // ── Game Helpers ──
    advanceWeek: () => {
        // WeekEngine handles MarketManager.tick(), store sync, and autoSave internally
        GameState.advanceWeek();
    },
    getLastWeekReport: () => WeekEngine.lastReport,
    getPendingEvent: () => EventRegistry.getPendingEvent(),

    initGame: {
        init: (characterData) => GameState.init(characterData),
        changeCity: (city) => GameState.changeCity(city),
        autoSave: () => GameState.autoSave(),
        applyEffects: (effects) => GameState.applyEffects(effects),
        // ── Save/Load ──
        hasSave: () => GameState.hasSave(),
        getSaveSlots: () => GameState.getSaveSlots(),
        saveGame: (slotIndex) => GameState.save(slotIndex),
        loadGame: (slotIndex) => GameState.load(slotIndex),
        deleteSave: (slotIndex) => GameState.deleteSave(slotIndex),
        getMostRecentSlot: () => GameState.getMostRecentSlot(),
        buyWork: (work) => {
            const s = GameState.state;
            s.cash -= work.price;
            work.owner = 'player';
            work.purchasePrice = work.price;
            work.purchaseWeek = s.week;
            work.purchaseCity = s.currentCity;
            work.storage = 'home';
            work.provenance = work.provenance || [];
            work.provenance.push({
                type: 'acquired', week: s.week, city: s.currentCity, price: work.price, source: 'Market'
            });
            s.portfolio.push(work);
        }
    },
    addNews: (msg) => GameState.addNews(msg),
    getPortfolioValue: () => GameState.getPortfolioValue(),
    applyEffects: (effects) => GameState.applyEffects(effects),
};
