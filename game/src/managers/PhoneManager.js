import { CONTACTS, initializeContacts } from '../data/contacts.js';
import { GameState } from './GameState.js';
import { ConsequenceScheduler } from './ConsequenceScheduler.js';
import { generateId } from '../utils/id.js';

import { useNPCStore } from '../stores/npcStore.js';

/**
 * PhoneManager — the Nokia flip phone communication hub
 *
 * Manages:
 * - Incoming messages (from NPCs, events, system)
 * - Message queue and urgency
 * - Unread count and notification state
 */
export class PhoneManager {
    static messages = [];
    static initialized = false;

    static init() {
        if (PhoneManager.initialized) return;
        useNPCStore.getState().init();
        PhoneManager.messages = [];
        PhoneManager.initialized = true;
    }

    static reset() {
        useNPCStore.getState().reset();
        PhoneManager.messages = [];
        PhoneManager.initialized = true;
    }

    // ── Messages ──

    /**
     * Send a message to the player's phone
     * @param {object} options
     * @param {string} options.from — NPC id or 'system'
     * @param {string} options.subject — short subject line
     * @param {string} options.body — full message text
     * @param {string} options.urgency — 'urgent' | 'normal' | 'low'
     * @param {number} [options.week] — week it was sent (defaults to current)
     * @param {string} [options.category] — 'deal' | 'invitation' | 'intel' | 'personal' | 'alert'
     * @param {array} [options.actions] — optional actions the player can take
     */
    static sendMessage({
        from,
        subject,
        body,
        urgency = 'normal',
        week = null,
        category = 'personal',
        actions = null,
    }) {
        const msg = {
            id: generateId('msg'),
            from,
            subject,
            body,
            urgency,
            category,
            week: week || GameState.state.week,
            read: false,
            actions,
            timestamp: Date.now(),
        };

        PhoneManager.messages.unshift(msg); // newest first

        // Mark NPC as met
        useNPCStore.getState().meetContact(from);

        return msg;
    }

    /**
     * Generate messages for the current turn
     * Called after advancing a week
     */
    static generateTurnMessages() {
        const state = GameState.state;
        const week = state.week;

        // 1. NPC-driven messages (1-3 per turn)
        const messageCount = 1 + Math.floor(Math.random() * 2); // 1-2 messages
        const contacts = useNPCStore.getState().contacts;
        const availableNPCs = contacts.filter((c) => {
            // Don't spam from the same NPC too frequently
            const recentFromNPC = PhoneManager.messages.filter(
                (m) => m.from === c.id && m.week >= week - 2
            );
            return recentFromNPC.length === 0;
        });

        for (let i = 0; i < Math.min(messageCount, availableNPCs.length); i++) {
            const npc = availableNPCs[Math.floor(Math.random() * availableNPCs.length)];
            const npcData = CONTACTS.find((c) => c.id === npc.id);
            if (!npcData) continue;

            // Remove from pool so we don't double-send
            availableNPCs.splice(availableNPCs.indexOf(npc), 1);

            const msg = PhoneManager.generateNPCMessage(npcData, npc, state);
            if (msg) {
                PhoneManager.sendMessage(msg);
                useNPCStore.getState().setLastContactStatus(npc.id, week);
            }
        }

        // 2. Market alerts
        if (Math.random() < 0.3) {
            PhoneManager.generateMarketAlert(state);
        }
    }

    /**
     * Generate a contextual message from an NPC
     */
    static generateNPCMessage(npcData, npcState, gameState) {
        const greeting =
            npcData.greetings[Math.floor(Math.random() * npcData.greetings.length)];

        const templates = {
            dealer: [
                {
                    subject: `${npcData.emoji} ${npcData.name}`,
                    body: `${greeting}\n\nI have a piece that just came available — not on the market yet. $${(
                        20000 + Math.floor(Math.random() * 80000)
                    ).toLocaleString()}. Interested?`,
                    category: 'deal',
                    urgency: 'normal',
                    actions: [
                        { label: 'Tell me more', effect: { intel: 1 } },
                        { label: 'I\'m interested', effect: { cash: -(20000 + Math.floor(Math.random() * 30000)), reputation: 3 } },
                        { label: 'Not right now', effect: { npcFavor: { id: npcData.id, amount: -2 } } },
                    ],
                },
                {
                    subject: `${npcData.emoji} ${npcData.name}`,
                    body: `${greeting}\n\nI'm hearing things about the emerging market. Something's shifting. Want to grab coffee and discuss?`,
                    category: 'intel',
                    urgency: 'low',
                    actions: [
                        { label: 'Yes — this week', effect: { intel: 2, npcFavor: { id: npcData.id, amount: 3 } } },
                        { label: 'Maybe next week', effect: {} },
                    ],
                },
            ],
            gallerist: [
                {
                    subject: `${npcData.emoji} ${npcData.name}`,
                    body: `${greeting}\n\nWe're opening a new show this Saturday. Some strong new work. I'd love for you to see it before the public.`,
                    category: 'invitation',
                    urgency: 'normal',
                    actions: [
                        { label: 'I\'ll be there', effect: { reputation: 3, npcFavor: { id: npcData.id, amount: 5 } } },
                        { label: 'Send me the details', effect: { intel: 1 } },
                        { label: 'Can\'t make it', effect: { npcFavor: { id: npcData.id, amount: -3 } } },
                    ],
                },
            ],
            auction: [
                {
                    subject: `${npcData.emoji} ${npcData.name}`,
                    body: `${greeting}\n\nLot 23 in next week's sale — the estimate is conservative. Just between us, there's strong institutional interest. Might be worth a look.`,
                    category: 'intel',
                    urgency: 'normal',
                    actions: [
                        { label: 'Register to bid', effect: { intel: 2 } },
                        { label: 'Thanks for the heads up', effect: { npcFavor: { id: npcData.id, amount: 2 } } },
                        { label: 'I\'ll pass', effect: {} },
                    ],
                },
            ],
            artist: [
                {
                    subject: `${npcData.emoji} ${npcData.name}`,
                    body: `${greeting}\n\nI just finished a new series. Would you want to come see them before I show anyone else? I really value your opinion.`,
                    category: 'invitation',
                    urgency: 'low',
                    actions: [
                        { label: 'I\'d love to', effect: { reputation: 5, npcFavor: { id: npcData.id, amount: 8 } } },
                        { label: 'Send me photos', effect: { intel: 1 } },
                        { label: 'Not now — busy week', effect: { npcFavor: { id: npcData.id, amount: -5 } } },
                    ],
                },
            ],
            collector: [
                {
                    subject: `${npcData.emoji} ${npcData.name}`,
                    body: `${greeting}\n\nI heard you bought the Chen piece. Bold move. I almost went for it myself. Drinks sometime? I want to know what you're seeing that I'm not.`,
                    category: 'personal',
                    urgency: 'low',
                    actions: [
                        { label: 'Sure — name the place', effect: { reputation: 3, intel: 1, npcFavor: { id: npcData.id, amount: 5 } } },
                        { label: 'I prefer to keep my strategy private', effect: { reputation: 2 } },
                    ],
                },
            ],
            advisor: [
                {
                    subject: `${npcData.emoji} ${npcData.name}`,
                    body: `${greeting}\n\nI've been running the numbers on your portfolio. A few positions are looking overexposed. Want me to send you the full analysis?`,
                    category: 'intel',
                    urgency: 'normal',
                    actions: [
                        { label: 'Yes, send it over', effect: { intel: 3, cash: -2000 } },
                        { label: 'I trust my own eye', effect: { npcFavor: { id: npcData.id, amount: -2 } } },
                    ],
                },
            ],
        };

        const roleTemplates = templates[npcData.role] || templates.dealer;
        const template = roleTemplates[Math.floor(Math.random() * roleTemplates.length)];

        return {
            from: npcData.id,
            ...template,
        };
    }

    /**
     * Generate market alert messages
     */
    static generateMarketAlert(state) {
        const alerts = [
            {
                subject: '📰 Market Update',
                body: `Market conditions have shifted to ${state.marketState.toUpperCase()}. ${state.marketState === 'bull'
                    ? 'Prices are climbing. Good time to hold.'
                    : state.marketState === 'bear'
                        ? 'Prices falling. Cautious collectors are selling.'
                        : 'Flat market. Opportunities for patient buyers.'
                    }`,
                category: 'alert',
                urgency: 'low',
            },
            {
                subject: '📰 Heat Alert',
                body: 'Several artists in the market are seeing heat shifts this week. Check the market for updated prices.',
                category: 'alert',
                urgency: 'low',
            },
        ];

        const alert = alerts[Math.floor(Math.random() * alerts.length)];
        PhoneManager.sendMessage({
            from: 'system',
            ...alert,
        });
    }

    // ── Contact Management ──

    static getContact(id) {
        return useNPCStore.getState().getContact(id);
    }

    static getContactData(id) {
        return CONTACTS.find((c) => c.id === id);
    }

    static adjustFavor(npcId, amount) {
        useNPCStore.getState().adjustFavor(npcId, amount);
    }

    // ── Queries ──

    static getUnreadCount() {
        return PhoneManager.messages.filter((m) => !m.read).length;
    }

    static getRecentMessages(count = 10) {
        return PhoneManager.messages.slice(0, count);
    }

    static markRead(msgId) {
        const msg = PhoneManager.messages.find((m) => m.id === msgId);
        if (msg) msg.read = true;
    }

    static markAllRead() {
        PhoneManager.messages.forEach((m) => (m.read = true));
    }

    static getContactsByRole(role) {
        return useNPCStore.getState().contacts.filter((c) => c.role === role);
    }

    static getMetContacts() {
        return useNPCStore.getState().contacts.filter((c) => c.met);
    }

    static meetRandomContact() {
        // Pick a random unmet NPC and introduce them
        const contacts = useNPCStore.getState().contacts;
        const unmet = contacts.filter(c => !c.met);
        if (unmet.length === 0) return null;
        const npc = unmet[Math.floor(Math.random() * unmet.length)];

        const store = useNPCStore.getState();
        store.meetContact(npc.id);
        store.adjustFavor(npc.id, 5);
        store.setLastContactStatus(npc.id, GameState.state.week);
        const npcData = CONTACTS.find(cd => cd.id === npc.id);
        if (npcData) {
            GameState.addNews(`🤝 Met ${npcData.name} (${npcData.role}) at the fair.`);
            PhoneManager.sendMessage({
                from: npcData.id,
                subject: `${npcData.emoji || '👋'} ${npcData.name}`,
                body: `Nice meeting you! Let's stay in touch. — ${npcData.name}`,
                urgency: 'normal',
                category: 'personal',
            });
        }
        return npc;
    }

    /**
     * Handle action selected from a message
     */
    static handleMessageAction(msgId, actionIndex) {
        const msg = PhoneManager.messages.find((m) => m.id === msgId);
        if (!msg || !msg.actions || !msg.actions[actionIndex]) return null;

        const action = msg.actions[actionIndex];
        msg.read = true;
        msg.actions = null; // Can't act again

        // Apply effects
        if (action.effect) {
            if (action.effect.npcFavor) {
                PhoneManager.adjustFavor(action.effect.npcFavor.id, action.effect.npcFavor.amount);
            }
            // Pass other effects to GameState
            const gameEffects = { ...action.effect };
            delete gameEffects.npcFavor;
            if (Object.keys(gameEffects).length > 0) {
                GameState.applyEffects(gameEffects);
            }
        }

        // ── Schedule follow-up consequences based on action type ──
        const npcData = CONTACTS.find(c => c.id === msg.from);
        const npcName = npcData ? npcData.name : msg.from;
        const npcEmoji = npcData ? npcData.emoji : '📱';

        const label = (action.label || '').toLowerCase();

        if (label.includes('interested') || label.includes('tell me more')) {
            // Schedule a follow-up deal offer 1-2 weeks later
            ConsequenceScheduler.addRelative(
                1 + Math.floor(Math.random() * 2),
                'phone_message',
                {
                    from: msg.from,
                    subject: `${npcEmoji} Follow-up from ${npcName}`,
                    body: `As promised — I've pulled together details on the piece we discussed. It's a strong work, currently in a private collection. ${Math.random() > 0.5
                        ? 'The seller is motivated, so there may be room to negotiate.'
                        : 'There\'s another buyer circling, so don\'t wait too long.'
                        }`,
                    urgency: 'normal',
                    category: 'deal',
                    actions: [
                        { label: 'Proceed with purchase', effect: { cash: -(15000 + Math.floor(Math.random() * 40000)), reputation: 2, npcFavor: { id: msg.from, amount: 5 } } },
                        { label: 'Need more time', effect: { npcFavor: { id: msg.from, amount: -1 } } },
                    ],
                },
                { sourceEvent: `msg_followup_${msg.id}` }
            );
            GameState.addNews(`📞 ${npcName} will follow up with details.`);
        }

        if (label.includes("i'll be there") || label.includes('i\'d love to')) {
            // Schedule a gallery/studio visit event
            ConsequenceScheduler.addRelative(
                1,
                'phone_message',
                {
                    from: msg.from,
                    subject: `${npcEmoji} See you tonight`,
                    body: `Looking forward to seeing you. The work is exceptional this round. Come with an open mind — and an open chequebook.`,
                    urgency: 'low',
                    category: 'invitation',
                },
                { sourceEvent: `msg_visit_${msg.id}` }
            );
            GameState.addNews(`📅 Meeting with ${npcName} scheduled.`);
        }

        if (label.includes('register to bid')) {
            // Schedule auction result
            ConsequenceScheduler.addRelative(
                2 + Math.floor(Math.random() * 2),
                'phone_message',
                {
                    from: msg.from,
                    subject: `${npcEmoji} Auction Results`,
                    body: `The lot went for $${(40000 + Math.floor(Math.random() * 60000)).toLocaleString()}. ${Math.random() > 0.5
                        ? 'Higher than estimate — the market is hungry.'
                        : 'Below estimate — interesting signal for that artist.'
                        } I'll keep you posted on the next sale.`,
                    urgency: 'normal',
                    category: 'intel',
                },
                { sourceEvent: `msg_auction_${msg.id}` }
            );
            GameState.addNews(`📋 Registered to bid at ${npcName}'s recommendation.`);
        }

        if (label.includes('send it over') || label.includes('send me')) {
            // Schedule intel delivery
            ConsequenceScheduler.addRelative(
                1,
                'phone_message',
                {
                    from: msg.from,
                    subject: `${npcEmoji} Analysis attached`,
                    body: `Here's the breakdown. Your portfolio has ${GameState.state.portfolio.length} positions. ${GameState.state.marketHeat > 20
                        ? 'Frankly, you\'re overexposed on heat. Consider cooling off.'
                        : 'You\'re well-positioned. The fundamentals look strong.'
                        }`,
                    urgency: 'low',
                    category: 'intel',
                },
                { sourceEvent: `msg_intel_${msg.id}` }
            );
        }

        // Log to journal
        GameState.addNews(`📱 Responded to ${npcName}: "${action.label}"`);

        return action;
    }

}
