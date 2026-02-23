import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { initializeContacts, CONTACTS } from '../data/contacts.js';
import { PhoneManager } from '../managers/PhoneManager.js';

export const useNPCStore = create(
    persist(
        immer((set, get) => ({
            contacts: [],
            initialized: false,

            init: () => set((state) => {
                if (!state.initialized || state.contacts.length === 0) {
                    state.contacts = initializeContacts();
                    // Ensure memory structure exists for all initial contacts
                    state.contacts.forEach(c => {
                        if (!c.memory) {
                            c.memory = { witnessed: [], grudges: [], favors: [], lastContact: 0 };
                        }
                    });
                    state.initialized = true;
                }
            }),

            reset: () => set((state) => {
                state.contacts = initializeContacts();
                state.contacts.forEach(c => {
                    c.memory = { witnessed: [], grudges: [], favors: [], lastContact: 0 };
                });
                state.initialized = true;
            }),

            getContact: (id) => {
                return get().contacts.find(c => c.id === id);
            },

            adjustFavor: (npcId, amount) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (contact) {
                    contact.favor = Math.max(-100, Math.min(100, (contact.favor || 0) + amount));
                }
            }),

            meetContact: (npcId) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (contact && !contact.met) {
                    contact.met = true;
                }
            }),

            addWitnessed: (npcId, event) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (contact) {
                    if (!contact.memory) contact.memory = { witnessed: [], grudges: [], favors: [], lastContact: 0 };
                    contact.memory.witnessed.push(event);
                    if (contact.memory.witnessed.length > 10) {
                        contact.memory.witnessed.shift();
                    }
                }
            }),

            addGrudge: (npcId, event) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (contact) {
                    if (!contact.memory) contact.memory = { witnessed: [], grudges: [], favors: [], lastContact: 0 };
                    contact.memory.grudges.push(event);
                }
            }),

            setLastContactStatus: (npcId, week) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (contact) {
                    if (!contact.memory) contact.memory = { witnessed: [], grudges: [], favors: [], lastContact: 0 };
                    contact.memory.lastContact = week;
                    contact.lastContact = week;
                }
            }),

            addFavor: (npcId, event) => set((state) => {
                const contact = state.contacts.find(c => c.id === npcId);
                if (contact) {
                    if (!contact.memory) contact.memory = { witnessed: [], grudges: [], favors: [], lastContact: 0 };
                    contact.memory.favors.push(event);
                }
            }),

            // ═══════════════════════════════════════════════════════════
            //  MARKET SIMULATION SYNC
            // ═══════════════════════════════════════════════════════════

            /**
             * Sync market simulation data for a single NPC.
             * Called after MarketSimulator.simulate() to persist collection/cash/trade stats.
             */
            syncMarketData: (npcId, marketData) => set((state) => {
                const c = state.contacts.find(c => c.id === npcId);
                if (!c) return;
                // Merge financial data
                if (!c.wealth) c.wealth = {};
                c.wealth.liquidCash = marketData.cash;
                c.wealth.financialStress = marketData.financialStress;
                // Merge collection data
                if (!c.collection) c.collection = {};
                c.collection.owned = [...(marketData.owned || [])];
                c.collection.forSale = [...(marketData.forSale || [])];
                // Merge trade stats
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

            /**
             * Batch sync all NPC market data from MarketSimulator._npcState.
             * More efficient than calling syncMarketData for each NPC individually.
             * @param {Object} allNpcState — { [npcId]: { cash, owned, forSale, totalBought, ... } }
             */
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

            /**
             * Get combined market profile for an NPC — merges static contact data
             * with persisted market stats for UI consumption.
             */
            getMarketProfile: (npcId) => {
                const c = get().contacts.find(c => c.id === npcId);
                if (!c) return null;
                const stats = c.marketStats || {};
                return {
                    id: c.id,
                    name: c.name,
                    role: c.role,
                    cash: c.wealth?.liquidCash ?? 0,
                    annualBudget: c.wealth?.annualBudget ?? 0,
                    spendingCeiling: c.wealth?.spendingCeiling ?? 0,
                    financialStress: stats.financialStress ?? c.wealth?.financialStress ?? 0,
                    owned: c.collection?.owned || [],
                    forSale: c.collection?.forSale || [],
                    totalBought: stats.totalBought ?? 0,
                    totalSold: stats.totalSold ?? 0,
                    totalSpent: stats.totalSpent ?? 0,
                    totalEarned: stats.totalEarned ?? 0,
                    netProfit: stats.netProfit ?? 0,
                    strategy: stats.strategy ?? 'holder',
                    favor: c.favor ?? 0,
                    met: c.met ?? false,
                };
            },

            // ═══════════════════════════════════════════════════════════
            //  AUTONOMOUS TICK
            // ═══════════════════════════════════════════════════════════

            autonomousTick: (currentWeek) => set((state) => {
                state.contacts.forEach(npc => {
                    if (!npc.memory) npc.memory = { witnessed: [], grudges: [], favors: [], lastContact: 0 };

                    // Favor decay: -1 per 4 weeks of no contact
                    const lastActive = npc.memory?.lastContact || npc.lastContact || 0;
                    const weeksSinceContact = currentWeek - lastActive;
                    if (weeksSinceContact >= 4 && npc.favor > -10) {
                        npc.favor = Math.max(-10, npc.favor - 1);
                    }

                    // Pending offer expiry (3 weeks)
                    if (npc.pendingOffer && npc.pendingOffer.offeredWeek + 3 < currentWeek) {
                        // Queue message to PhoneManager (side effect)
                        setTimeout(() => {
                            const npcData = CONTACTS.find(c => c.id === npc.id);
                            const name = npcData ? npcData.name : 'An associate';
                            PhoneManager.sendMessage({
                                from: npc.id,
                                subject: `${name} — Offer expired`,
                                body: `That piece I offered you? Found another buyer. These things don't wait.`,
                                urgency: 'low',
                                category: 'personal',
                            });
                        }, 0);

                        npc.pendingOffer = null;
                        npc.favor = Math.max(-100, npc.favor - 3);
                        npc.memory.grudges.push({ reason: 'Ignored offer', week: currentWeek });
                    }

                    // NPC-to-NPC gossip (15% chance per NPC)
                    if (Math.random() < 0.15 && npc.memory.witnessed.length > 0) {
                        const otherNPCs = state.contacts.filter(c => c.id !== npc.id);
                        if (otherNPCs.length > 0) {
                            const gossipTarget = otherNPCs[Math.floor(Math.random() * otherNPCs.length)];
                            if (!gossipTarget.memory) gossipTarget.memory = { witnessed: [], grudges: [], favors: [], lastContact: 0 };

                            const recentEvent = npc.memory.witnessed[npc.memory.witnessed.length - 1];
                            gossipTarget.memory.witnessed.push({
                                ...recentEvent,
                                heardFrom: npc.id,
                            });
                            // Keep max 10
                            if (gossipTarget.memory.witnessed.length > 10) {
                                gossipTarget.memory.witnessed.shift();
                            }
                        }
                    }
                });
            })
        })),
        { name: 'artlife-npc-store' }
    )
);
