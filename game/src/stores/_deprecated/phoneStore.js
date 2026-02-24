import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { generateId } from '../utils/id.js';

/**
 * PhoneStore manages the player's incoming multi-tiered notifications.
 * 'Standard' messages go to the unread queue.
 * 'Urgent' messages trigger immediate UI interruption.
 */
export const usePhoneStore = create(
    persist(
        immer((set, get) => ({
            messages: [],
            unreadCount: 0,
            activeUrgentMessage: null,

            /**
             * Receives a new message.
             * @param {Object} msg { sender, subject, body, format, isUrgent }
             */
            receiveMessage: (msg) => set((state) => {
                const newMsg = {
                    id: generateId('msg'),
                    timestamp: Date.now(),
                    read: false,
                    ...msg
                };

                state.messages.unshift(newMsg);
                state.unreadCount += 1;

                if (newMsg.isUrgent) {
                    state.activeUrgentMessage = newMsg;
                }
            }),

            /**
             * Marks a specific message as read.
             */
            markAsRead: (msgId) => set((state) => {
                const msg = state.messages.find(m => m.id === msgId);
                if (msg && !msg.read) {
                    msg.read = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            }),

            /**
             * Clears the urgent message interruption screen.
             */
            clearUrgent: () => set((state) => {
                if (state.activeUrgentMessage) {
                    const msg = state.messages.find(m => m.id === state.activeUrgentMessage.id);
                    if (msg && !msg.read) {
                        msg.read = true;
                        state.unreadCount = Math.max(0, state.unreadCount - 1);
                    }
                    state.activeUrgentMessage = null;
                }
            }),

            /**
             * Marks all history as read.
             */
            readAll: () => set((state) => {
                state.messages.forEach(m => m.read = true);
                state.unreadCount = 0;
            }),

            /**
             * Utility to wipe the phone logic.
             */
            clearPhone: () => set((state) => {
                state.messages = [];
                state.unreadCount = 0;
                state.activeUrgentMessage = null;
            })
        })),
        { name: 'artlife-phone-store' }
    )
);
