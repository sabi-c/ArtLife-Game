/**
 * npcStore.js — Zustand store for NPC contact state, memory, and market data.
 *
 * Persists the full contacts array to localStorage. Each contact tracks:
 *   relationship { trust, respect, owes_favor, holds_grudge, grudge_severity },
 *   memory.events [{ type, week, significance, decay, data }],
 *   wealth { liquidCash, financialStress }, collection { owned[], forSale[] }, marketStats {}
 *
 * Upgraded: Lumen-inspired memory system with significance scoring and time-based decay.
 *           Multi-axis relationship replaces single 'favor' integer.
 *           Favor is now a derived getter: Math.round(trust * 100).
 *
 * Initialized by GameState.init() via useNPCStore.getState().init().
 * Reset on new game via useNPCStore.getState().reset().
 *
 * Key methods:
 *   recordInteraction(npcId, type, data) — add scored memory event
 *   getRelationship(npcId) — full relationship state with computed fields
 *   decayMemories(currentWeek) — apply time-based significance decay
 *   adjustFavor(npcId, amount) — LEGACY bridge → adjusts trust proportionally
 *   autonomousTick(week) — memory decay, favor drift, gossip, offer expiry
 *   syncAllMarketData(npcState) — batch sync from MarketSimulator results
 *   getMarketProfile(npcId) — merged view for UI consumption
 *
 * Consumers: WeekEngine, MarketSimulator, LocationScene, BloombergTerminal,
 *            NPCDirectoryPanel, DialogueScene, dashboard.js (via TerminalAPI.npcStore)
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { initializeContacts, CONTACTS } from '../data/contacts.js';
import { PhoneManager } from '../managers/PhoneManager.js';

// ── Default relationship state for new/migrated contacts ──
const DEFAULT_RELATIONSHIP = {
    trust: 0.5,           // 0-1 — affects info sharing, first dibs
    respect: 0.5,         // 0-1 — affects pricing fairness
    owes_favor: false,    // did player do something generous?
    holds_grudge: false,  // is NPC actively hostile?
    grudge_severity: 0,   // 0-1 — how bad the grudge is
    interaction_count: 0,
};

const DEFAULT_MEMORY = {
    events: [],           // [{ type, week, significance, decay, data }]
    lastContact: 0,
    witnessed: [],
    grudges: [],
    favors: [],
};

/**
 * Ensure a contact has the upgraded memory and relationship structures.
 * Migrates from the old single-favor system if needed.
 */
function migrateContact(contact) {
    if (!contact.memory || !contact.memory.events) {
        const oldMemory = contact.memory || {};
        contact.memory = {
            events: [],
            lastContact: oldMemory.lastContact || 0,
            witnessed: oldMemory.witnessed || [],
            grudges: oldMemory.grudges || [],
            favors: oldMemory.favors || [],
        };
        if (oldMemory.grudges) {
            for (const g of oldMemory.grudges) {
                contact.memory.events.push({
                    type: 'legacy_grudge', week: g.week || 0,
                    significance: 0.7, decay: 0.05, data: g,
                });
            }
        }
        if (oldMemory.favors) {
            for (const f of oldMemory.favors) {
                contact.memory.events.push({
                    type: 'legacy_favor', week: f.week || 0,
                    significance: 0.5, decay: 0.05, data: f,
                });
            }
        }
    }
    if (!contact.relationship) {
        const oldFavor = contact.favor || 0;
        contact.relationship = {
            ...DEFAULT_RELATIONSHIP,
            trust: Math.max(0, Math.min(1, 0.5 + oldFavor / 200)),
            respect: Math.max(0, Math.min(1, 0.5 + oldFavor / 200)),
            holds_grudge: oldFavor < -30,
            grudge_severity: oldFavor < -30 ? Math.abs(oldFavor) / 100 : 0,
        };
    }
    contact.favor = Math.round((contact.relationship.trust - 0.5) * 200);
    return contact;
}

export const useNPCStore = create(
    persist(
        immer((set, get) => ({
            contacts: [],
            initialized: false,

            init: () => set((state) => {
                if (!state.initialized || state.contacts.length === 0) {
                    state.contacts = initializeContacts();
                    state.contacts.forEach(c => migrateContact(c));
                    state.initialized = true;
                }
            }),

            reset: () => set((state) => {
                state.contacts = initializeContacts();
                state.contacts.forEach(c => migrateContact(c));
                state.initialized = true;
            }),

            getContact: (id) => {
                return get().contacts.find(c => c.id === id);
            },

            // ═══════════════════════════════════════════════════════════
            //  RELATIONSHIP & MEMORY ENGINE (Lumen-inspired)
            // ═══════════════════════════════════════════════════════════

            /**
             * Record a significant interaction in NPC memory.
             * @param {string} npcId
             * @param {string} type — event type (from MarketEventBus EVENT_IMPACTS)
             * @param {object} [data] — additional event data
             * @param {number} [significance] — 0-1, how important
             * @param {number} [week] — game week
             */
            recordInteraction: (npcId, type, data = {}, significance = null, week = 0) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (!contact) return;
                migrateContact(contact);

                const sig = significance ?? data.significance ?? 0.5;
                const decay = data.decay ?? 0.05;

                contact.memory.events.push({
                    type, week, significance: sig, decay, data: { ...data },
                });

                // Cap at 50 — remove least significant
                if (contact.memory.events.length > 50) {
                    contact.memory.events.sort((a, b) => b.significance - a.significance);
                    contact.memory.events = contact.memory.events.slice(0, 50);
                }

                // Update relationship axes
                const trustDelta = data.trustDelta ?? 0;
                const respectDelta = data.respectDelta ?? 0;
                if (trustDelta) {
                    contact.relationship.trust = Math.max(0, Math.min(1, contact.relationship.trust + trustDelta));
                }
                if (respectDelta) {
                    contact.relationship.respect = Math.max(0, Math.min(1, contact.relationship.respect + respectDelta));
                }

                // Handle grudges
                if (data.grudgeProbability && Math.random() < data.grudgeProbability) {
                    contact.relationship.holds_grudge = true;
                    contact.relationship.grudge_severity = Math.max(contact.relationship.grudge_severity, sig);
                    contact.memory.grudges.push({ reason: type, week, significance: sig });
                }
                // Handle favors
                if (data.favorProbability && Math.random() < data.favorProbability) {
                    contact.relationship.owes_favor = true;
                    contact.memory.favors.push({ reason: type, week, significance: sig });
                }

                contact.relationship.interaction_count++;
                contact.memory.lastContact = week;
                contact.favor = Math.round((contact.relationship.trust - 0.5) * 200);
            }),

            /**
             * Get the full relationship state for an NPC.
             * Primary API for HaggleManager and other consumers.
             */
            getRelationship: (npcId) => {
                const contact = get().contacts.find(c => c.id === npcId);
                if (!contact) return { ...DEFAULT_RELATIONSHIP, favor: 0, recent_memory: [] };
                const rel = contact.relationship || DEFAULT_RELATIONSHIP;
                const memory = contact.memory || DEFAULT_MEMORY;

                const recentMemory = (memory.events || [])
                    .filter(e => e.significance > 0.2)
                    .sort((a, b) => b.significance - a.significance)
                    .slice(0, 5)
                    .map(e => ({ type: e.type, significance: e.significance, week: e.week }));

                return { ...rel, favor: contact.favor || 0, recent_memory: recentMemory };
            },

            // ═══════════════════════════════════════════════════════════
            //  LEGACY BRIDGE (backward compatible)
            // ═══════════════════════════════════════════════════════════

            adjustFavor: (npcId, amount) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (!contact) return;
                migrateContact(contact);
                contact.relationship.trust = Math.max(0, Math.min(1, contact.relationship.trust + amount / 200));
                contact.favor = Math.round((contact.relationship.trust - 0.5) * 200);
            }),

            meetContact: (npcId) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (contact && !contact.met) contact.met = true;
            }),

            addWitnessed: (npcId, event) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (!contact) return;
                migrateContact(contact);
                contact.memory.witnessed.push(event);
                if (contact.memory.witnessed.length > 10) contact.memory.witnessed.shift();
                contact.memory.events.push({
                    type: event.type || 'witnessed', week: event.week || 0,
                    significance: event.significance || 0.3, decay: 0.05, data: event,
                });
            }),

            addGrudge: (npcId, event) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (!contact) return;
                migrateContact(contact);
                contact.memory.grudges.push(event);
                contact.relationship.holds_grudge = true;
                contact.relationship.grudge_severity = Math.max(contact.relationship.grudge_severity, 0.6);
                contact.relationship.trust = Math.max(0, contact.relationship.trust - 0.10);
                contact.favor = Math.round((contact.relationship.trust - 0.5) * 200);
                contact.memory.events.push({
                    type: event.reason || 'grudge', week: event.week || 0,
                    significance: 0.8, decay: 0.03, data: event,
                });
            }),

            setLastContactStatus: (npcId, week) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (contact) {
                    migrateContact(contact);
                    contact.memory.lastContact = week;
                    contact.lastContact = week;
                }
            }),

            addFavor: (npcId, event) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (!contact) return;
                migrateContact(contact);
                contact.memory.favors.push(event);
                contact.relationship.owes_favor = true;
                contact.relationship.trust = Math.min(1, contact.relationship.trust + 0.05);
                contact.favor = Math.round((contact.relationship.trust - 0.5) * 200);
                contact.memory.events.push({
                    type: event.reason || 'favor', week: event.week || 0,
                    significance: 0.6, decay: 0.04, data: event,
                });
            }),

            // ═══════════════════════════════════════════════════════════
            //  MARKET SIMULATION SYNC
            // ═══════════════════════════════════════════════════════════

            syncMarketData: (npcId, marketData) => set((state) => {
                const c = state.contacts.find(c => c.id === npcId);
                if (!c) return;
                if (!c.wealth) c.wealth = {};
                c.wealth.liquidCash = marketData.cash;
                c.wealth.financialStress = marketData.financialStress;
                if (!c.collection) c.collection = {};
                c.collection.owned = [...(marketData.owned || [])];
                c.collection.forSale = [...(marketData.forSale || [])];
                c.marketStats = {
                    totalBought: marketData.totalBought || 0,
                    totalSold: marketData.totalSold || 0,
                    totalSpent: marketData.totalSpent || 0,
                    totalEarned: marketData.totalEarned || 0,
                    netProfit: (marketData.totalEarned || 0) - (marketData.totalSpent || 0),
                    strategy: marketData.strategy || 'holder',
                    financialStress: marketData.financialStress || 0,
                    lastSyncWeek: marketData.lastSyncWeek || 0,
                };
            }),

            syncAllMarketData: (allNpcState) => set((state) => {
                for (const [npcId, data] of Object.entries(allNpcState)) {
                    const c = state.contacts.find(c => c.id === npcId);
                    if (!c) continue;
                    if (!c.wealth) c.wealth = {};
                    c.wealth.liquidCash = data.cash;
                    c.wealth.financialStress = data.financialStress;
                    if (!c.collection) c.collection = {};
                    c.collection.owned = [...(data.owned || [])];
                    c.collection.forSale = [...(data.forSale || [])];
                    c.marketStats = {
                        totalBought: data.totalBought || 0,
                        totalSold: data.totalSold || 0,
                        totalSpent: data.totalSpent || 0,
                        totalEarned: data.totalEarned || 0,
                        netProfit: (data.totalEarned || 0) - (data.totalSpent || 0),
                        strategy: data.strategy || 'holder',
                        financialStress: data.financialStress || 0,
                    };
                }
            }),

            getMarketProfile: (npcId) => {
                const c = get().contacts.find(c => c.id === npcId);
                if (!c) return null;
                const stats = c.marketStats || {};
                const rel = c.relationship || DEFAULT_RELATIONSHIP;
                return {
                    id: c.id, name: c.name, role: c.role,
                    cash: c.wealth?.liquidCash ?? 0,
                    annualBudget: c.wealth?.annualBudget ?? 0,
                    spendingCeiling: c.wealth?.spendingCeiling ?? 0,
                    financialStress: stats.financialStress ?? c.wealth?.financialStress ?? 0,
                    owned: c.collection?.owned || [],
                    forSale: c.collection?.forSale || [],
                    totalBought: stats.totalBought ?? 0, totalSold: stats.totalSold ?? 0,
                    totalSpent: stats.totalSpent ?? 0, totalEarned: stats.totalEarned ?? 0,
                    netProfit: stats.netProfit ?? 0, strategy: stats.strategy ?? 'holder',
                    favor: c.favor ?? 0, met: c.met ?? false,
                    trust: rel.trust, respect: rel.respect,
                    holds_grudge: rel.holds_grudge, owes_favor: rel.owes_favor,
                };
            },

            // ═══════════════════════════════════════════════════════════
            //  AUTONOMOUS TICK (weekly)
            // ═══════════════════════════════════════════════════════════

            autonomousTick: (currentWeek) => set((state) => {
                state.contacts.forEach(npc => {
                    migrateContact(npc);

                    // Memory decay
                    npc.memory.events = npc.memory.events.filter(event => {
                        event.significance *= (1 - event.decay);
                        return event.significance > 0.05;
                    });

                    // Grudge severity decay (personality-dependent)
                    if (npc.relationship.holds_grudge) {
                        const patience = npc.behavior?.temperament === 'warm' ? 0.03 :
                            npc.behavior?.temperament === 'cold' ? 0.005 : 0.01;
                        npc.relationship.grudge_severity = Math.max(0, npc.relationship.grudge_severity - patience);
                        if (npc.relationship.grudge_severity < 0.1) {
                            npc.relationship.holds_grudge = false;
                        }
                    }

                    // Trust/respect drift toward baseline
                    const lastActive = npc.memory.lastContact || npc.lastContact || 0;
                    if (currentWeek - lastActive >= 4) {
                        npc.relationship.trust += (0.5 - npc.relationship.trust) * 0.005;
                        npc.relationship.respect += (0.5 - npc.relationship.respect) * 0.005;
                    }

                    npc.favor = Math.round((npc.relationship.trust - 0.5) * 200);

                    // Pending offer expiry (3 weeks)
                    if (npc.pendingOffer && npc.pendingOffer.offeredWeek + 3 < currentWeek) {
                        setTimeout(() => {
                            const npcData = CONTACTS.find(c => c.id === npc.id);
                            const name = npcData ? npcData.name : 'An associate';
                            PhoneManager.sendMessage({
                                from: npc.id,
                                subject: `${name} — Offer expired`,
                                body: `That piece I offered you? Found another buyer. These things don't wait.`,
                                urgency: 'low', category: 'personal',
                            });
                        }, 0);

                        npc.pendingOffer = null;
                        npc.relationship.trust = Math.max(0, npc.relationship.trust - 0.05);
                        npc.relationship.respect = Math.max(0, npc.relationship.respect - 0.03);
                        npc.relationship.holds_grudge = true;
                        npc.relationship.grudge_severity = Math.max(npc.relationship.grudge_severity, 0.3);
                        npc.memory.events.push({
                            type: 'offer_ignored', week: currentWeek,
                            significance: 0.5, decay: 0.05, data: { reason: 'Ignored offer' },
                        });
                        npc.favor = Math.round((npc.relationship.trust - 0.5) * 200);
                    }

                    // NPC-to-NPC gossip (15%)
                    if (Math.random() < 0.15 && npc.memory.events.length > 0) {
                        const otherNPCs = state.contacts.filter(c => c.id !== npc.id);
                        if (otherNPCs.length > 0) {
                            const target = otherNPCs[Math.floor(Math.random() * otherNPCs.length)];
                            migrateContact(target);
                            const gossipEvent = npc.memory.events
                                .filter(e => e.significance > 0.3)
                                .sort((a, b) => b.significance - a.significance)[0];
                            if (gossipEvent) {
                                target.memory.events.push({
                                    type: 'heard_gossip', week: currentWeek,
                                    significance: gossipEvent.significance * 0.5,
                                    decay: 0.08,
                                    data: { originalType: gossipEvent.type, heardFrom: npc.id, ...gossipEvent.data },
                                });
                                target.memory.witnessed.push({ ...gossipEvent.data, heardFrom: npc.id });
                                if (target.memory.witnessed.length > 10) target.memory.witnessed.shift();
                            }
                        }
                    }
                });
            })
        })),
        { name: 'artlife-npc-store' }
    )
);
