/**
 * NPCMemory — NPC memory and autonomous behavior system.
 * Extracted from PhoneManager during Code Audit Phase 2.7 (Task #2).
 *
 * Manages:
 * - Witnessed events (NPCs remember what they saw)
 * - Grudges (NPCs remember decisions that hurt them)
 * - Favors (NPCs remember kindness)
 * - Autonomous tick (favor decay, offer expiry, gossip)
 */

import { CONTACTS } from '../data/contacts.js';
import { GameState } from './GameState.js';
import { PhoneManager } from './PhoneManager.js';

export class NPCMemory {
    /**
     * Initialize memory object on a contact if it doesn't exist.
     * @param {object} contact — contact state object from PhoneManager.contacts
     */
    static ensureMemory(contact) {
        if (!contact.memory) {
            contact.memory = {
                witnessed: [],
                grudges: [],
                favors: [],
                lastContact: contact.lastContact || 0,
            };
        }
    }

    /**
     * Record that an NPC "witnessed" a player event or decision.
     * @param {string} npcId
     * @param {object} event - { type, description, week }
     */
    static addWitnessed(npcId, event) {
        const contact = PhoneManager.getContact(npcId);
        if (!contact) return;
        NPCMemory.ensureMemory(contact);
        contact.memory.witnessed.push({
            ...event,
            week: event.week || GameState.state.week,
        });
        // Keep last 10 witnessed events per NPC
        if (contact.memory.witnessed.length > 10) contact.memory.witnessed.shift();
    }

    /**
     * Record a grudge — an NPC remembers a decision that hurt them.
     */
    static addGrudge(npcId, reason) {
        const contact = PhoneManager.getContact(npcId);
        if (!contact) return;
        NPCMemory.ensureMemory(contact);
        contact.memory.grudges.push({
            reason,
            week: GameState.state.week,
        });
    }

    /**
     * Record a favor — an NPC remembers something kind the player did.
     */
    static addFavor(npcId, reason) {
        const contact = PhoneManager.getContact(npcId);
        if (!contact) return;
        NPCMemory.ensureMemory(contact);
        contact.memory.favors.push({
            reason,
            week: GameState.state.week,
        });
    }

    /**
     * NPC Autonomous Tick — called every advanceWeek() via WeekEngine.
     *
     * - Favor decays if no contact for 4+ weeks
     * - Pending offers expire after 3 weeks
     * - NPC-to-NPC gossip
     */
    static autonomousTick() {
        const state = GameState.state;

        PhoneManager.contacts.forEach(npc => {
            NPCMemory.ensureMemory(npc);

            // ── Favor decay: -1 per 4 weeks of no contact ──
            const weeksSinceContact = state.week - (npc.memory.lastContact || npc.lastContact || 0);
            if (weeksSinceContact >= 4 && npc.favor > -10) {
                npc.favor = Math.max(-10, npc.favor - 1);
            }

            // ── Pending offer expiry (3 weeks) ──
            if (npc.pendingOffer && npc.pendingOffer.offeredWeek + 3 < state.week) {
                const npcData = CONTACTS.find(c => c.id === npc.id);
                const name = npcData ? npcData.name : 'An associate';
                PhoneManager.sendMessage({
                    from: npc.id,
                    subject: `${name} — Offer expired`,
                    body: `That piece I offered you? Found another buyer. These things don't wait.`,
                    urgency: 'low',
                    category: 'personal',
                });
                npc.pendingOffer = null;
                npc.favor = Math.max(-100, npc.favor - 3);
                npc.memory.grudges.push({ reason: 'Ignored offer', week: state.week });
            }

            // ── NPC-to-NPC gossip (15% chance per NPC) ──
            if (Math.random() < 0.15 && npc.memory.witnessed.length > 0) {
                const otherNPCs = PhoneManager.contacts.filter(c => c.id !== npc.id);
                if (otherNPCs.length > 0) {
                    const gossipTarget = otherNPCs[Math.floor(Math.random() * otherNPCs.length)];
                    NPCMemory.ensureMemory(gossipTarget);
                    // Share the most recent witnessed event
                    const recentEvent = npc.memory.witnessed[npc.memory.witnessed.length - 1];
                    gossipTarget.memory.witnessed.push({
                        ...recentEvent,
                        heardFrom: npc.id,
                    });
                }
            }
        });
    }
}
