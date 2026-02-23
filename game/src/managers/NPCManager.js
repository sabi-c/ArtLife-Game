/**
 * NPCManager.js
 * 
 * Manages the schedules and locations of NPCs in the overworld.
 * Dictates which map and what coordinates an NPC should exist at based on the 24-hour clock.
 * 
 * NPCs with an `eventId` will launch DialogueScene when interacted with.
 * NPCs without one fall back to inline text dialog in WorldScene.
 * 
 * All NPC entries reference contacts from contacts.js via contactId.
 * The spriteKey, tint, and dealerType come from contacts.js data.
 */

import { CONTACTS } from '../data/contacts.js';
import { ROLE_TO_DEALER_TYPE } from '../data/haggle_config.js';

// Lookup helper — find contact data by id
const _c = (id) => CONTACTS.find(c => c.id === id) || {};

export const NPCManager = {
    // ── NPC definitions with daily schedules ──
    // Each entry maps a contact from contacts.js to overworld presence
    npcs: [
        // ── 1. Elena Ross — Gallerist ──
        {
            id: 'npc_elena',
            contactId: 'elena_ross',
            label: 'Elena Ross',
            spriteKey: _c('elena_ross').spriteKey || 'walk_elena_ross_walk',
            tint: _c('elena_ross').tint || 0xff9999,
            speed: 2,
            dialogContent: 'Elena: "The gallery opens soon. Are you prepared?"',
            eventId: 'elena_gallery_chat',
            dealerType: _c('elena_ross').haggleProfile?.dealerType || 'patron',
            schedule: [
                { map: 'pallet_town', days: [1, 2, 3, 4, 5], startHour: 8, endHour: 18, x: 10, y: 15, behavior: 'stationary' },
                { map: 'pallet_town', days: [6, 7], startHour: 10, endHour: 16, x: 15, y: 12, behavior: 'wandering' },
            ]
        },
        // ── 2. Sasha Klein — Private Dealer ──
        {
            id: 'npc_sasha',
            contactId: 'sasha_klein',
            label: 'Sasha Klein',
            spriteKey: _c('sasha_klein').spriteKey || 'walk_legacy_gallerist_walk',
            tint: _c('sasha_klein').tint || 0xccccee,
            speed: 1.5,
            dialogContent: 'Sasha: "Everything has a price. Even friendship."',
            eventId: 'sasha_private_deal',
            dealerType: _c('sasha_klein').haggleProfile?.dealerType || 'shark',
            schedule: [
                { map: 'pallet_town', days: [1, 3, 5], startHour: 10, endHour: 15, x: 22, y: 8, behavior: 'stationary' },
                { map: 'pallet_town', days: [6], startHour: 19, endHour: 23, x: 14, y: 10, behavior: 'wandering' },
            ]
        },
        // ── 3. Charles Vandermeer — Speculator ──
        {
            id: 'npc_vandermeer',
            contactId: 'charles_vandermeer',
            label: 'Charles Vandermeer',
            spriteKey: _c('charles_vandermeer').spriteKey || 'walk_old_money_gallerist_walk',
            tint: _c('charles_vandermeer').tint || 0xc9a84c,
            speed: 1.8,
            dialogContent: 'Vandermeer: "I buy movements, not paintings."',
            eventId: 'vandermeer_market_talk',
            dealerType: _c('charles_vandermeer').haggleProfile?.dealerType || 'speculator',
            schedule: [
                { map: 'pallet_town', days: [2, 4], startHour: 11, endHour: 17, x: 20, y: 14, behavior: 'wandering' },
                { map: 'pallet_town', days: [5, 6], startHour: 18, endHour: 22, x: 12, y: 6, behavior: 'stationary' },
            ]
        },
        // ── 4. Dr. Eloise Park — Institutional Buyer ──
        {
            id: 'npc_eloise',
            contactId: 'dr_eloise_park',
            label: 'Dr. Eloise Park',
            spriteKey: _c('dr_eloise_park').spriteKey || 'walk_academic_curator_walk',
            tint: _c('dr_eloise_park').tint || 0x88bbff,
            speed: 1.2,
            dialogContent: 'Dr. Park: "Provenance is everything. Everything else is decoration."',
            eventId: 'eloise_museum_chat',
            dealerType: _c('dr_eloise_park').haggleProfile?.dealerType || 'curator',
            schedule: [
                { map: 'pallet_town', days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, x: 6, y: 18, behavior: 'stationary' },
            ]
        },
        // ── 5. Nico Strand — Street Hustle ──
        {
            id: 'npc_nico',
            contactId: 'nico_strand',
            label: 'Nico Strand',
            spriteKey: _c('nico_strand').spriteKey || 'walk_art_flipper_walk',
            tint: _c('nico_strand').tint || 0x99ff99,
            speed: 3,
            dialogContent: 'Nico: "I got something that fell off a truck. Interested?"',
            eventId: 'nico_street_deal',
            dealerType: _c('nico_strand').haggleProfile?.dealerType || 'hustler',
            schedule: [
                { map: 'pallet_town', days: [1, 2, 3, 4, 5, 6, 7], startHour: 18, endHour: 24, x: 8, y: 3, behavior: 'wandering' },
                { map: 'pallet_town', days: [6, 7], startHour: 12, endHour: 18, x: 16, y: 5, behavior: 'wandering' },
            ]
        },
        // ── 6. Margaux Villiers — Collector / Socialite ──
        {
            id: 'npc_margaux',
            contactId: 'margaux_villiers',
            label: 'Margaux Villiers',
            spriteKey: _c('margaux_villiers').spriteKey || 'walk_margaux_villiers_walk',
            tint: _c('margaux_villiers').tint || 0x99ccff,
            speed: 1.5,
            dialogContent: 'Margaux: "I only collect the finest post-internet trash."',
            eventId: 'margaux_studio_visit',
            dealerType: _c('margaux_villiers').haggleProfile?.dealerType || 'collector',
            schedule: [
                { map: 'pallet_town', days: [1, 2, 3, 4, 5, 6, 7], startHour: 12, endHour: 23, x: 18, y: 5, behavior: 'wandering' },
            ]
        },
        // ── 7. Julian Vance — Flipper / Shark ──
        {
            id: 'npc_julian',
            contactId: 'julian_vance',
            label: 'Julian Vance',
            spriteKey: _c('julian_vance').spriteKey || 'walk_julian_vance_walk',
            tint: _c('julian_vance').tint || 0xccff99,
            speed: 2.5,
            dialogContent: 'Julian: "Wait until you see what I paid for this JPEG."',
            eventId: 'julian_flip_deal',
            dealerType: _c('julian_vance').haggleProfile?.dealerType || 'shark',
            schedule: [
                { map: 'pallet_town', days: [5, 6, 7], startHour: 18, endHour: 24, x: 8, y: 8, behavior: 'stationary' },
            ]
        },
        // ── 8. Priya Sharma — Auction House ──
        {
            id: 'npc_priya',
            contactId: 'priya_sharma',
            label: 'Priya Sharma',
            spriteKey: _c('priya_sharma').spriteKey || 'walk_auction_house_type_walk',
            tint: _c('priya_sharma').tint || 0xffd700,
            speed: 1.8,
            dialogContent: 'Priya: "The next auction is going to be... interesting."',
            eventId: 'priya_auction_tip',
            dealerType: _c('priya_sharma').haggleProfile?.dealerType || 'calculator',
            schedule: [
                { map: 'pallet_town', days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, x: 24, y: 12, behavior: 'stationary' },
            ]
        },
        // ── 9. Tomoko Sato — Curator ──
        {
            id: 'npc_tomoko',
            contactId: 'tomoko_sato',
            label: 'Tomoko Sato',
            spriteKey: _c('tomoko_sato').spriteKey || 'walk_avant_garde_curator_walk',
            tint: _c('tomoko_sato').tint || 0xee88ee,
            speed: 1.5,
            dialogContent: 'Tomoko: "This space needs something... radical."',
            eventId: 'tomoko_show_pitch',
            dealerType: _c('tomoko_sato').haggleProfile?.dealerType || 'curator',
            schedule: [
                { map: 'pallet_town', days: [2, 3, 4], startHour: 10, endHour: 19, x: 4, y: 10, behavior: 'wandering' },
            ]
        },
        // ── 10. Diego Reyes — Young Artist ──
        {
            id: 'npc_diego',
            contactId: 'diego_reyes',
            label: 'Diego Reyes',
            spriteKey: _c('diego_reyes').spriteKey || 'walk_young_artist_walk',
            tint: _c('diego_reyes').tint || 0xff8866,
            speed: 2.2,
            dialogContent: 'Diego: "Man, I just need someone to see my work."',
            eventId: 'diego_studio_visit',
            dealerType: _c('diego_reyes').haggleProfile?.dealerType || 'nervous',
            schedule: [
                { map: 'pallet_town', days: [1, 2, 3, 4, 5, 6, 7], startHour: 8, endHour: 22, x: 12, y: 20, behavior: 'wandering' },
            ]
        },
        // ── 11. Lena Zhao — Tech Collector ──
        {
            id: 'npc_lena',
            contactId: 'lena_zhao',
            label: 'Lena Zhao',
            spriteKey: _c('lena_zhao').spriteKey || 'walk_tech_collector_f_walk',
            tint: _c('lena_zhao').tint || 0x66ccff,
            speed: 2,
            dialogContent: 'Lena: "NFTs are dead. But the tech underneath — that\'s where I\'m looking."',
            eventId: 'lena_tech_chat',
            dealerType: _c('lena_zhao').haggleProfile?.dealerType || 'speculator',
            schedule: [
                { map: 'pallet_town', days: [1, 3, 5], startHour: 14, endHour: 21, x: 20, y: 18, behavior: 'wandering' },
            ]
        },
        // ── 12. Vivian St. Claire — Mega Collector ──
        {
            id: 'npc_vivian',
            contactId: 'vivian_stclaire',
            label: 'Vivian St. Claire',
            spriteKey: _c('vivian_stclaire').spriteKey || 'walk_power_collector_f_walk',
            tint: _c('vivian_stclaire').tint || 0xff99cc,
            speed: 1.2,
            dialogContent: 'Vivian: "Money isn\'t the question, darling. Access is."',
            eventId: 'vivian_invitation',
            dealerType: _c('vivian_stclaire').haggleProfile?.dealerType || 'collector',
            schedule: [
                { map: 'pallet_town', days: [6, 7], startHour: 15, endHour: 22, x: 10, y: 8, behavior: 'stationary' },
            ]
        },
        // ── 13. Marcus Webb — Critic ──
        {
            id: 'npc_marcus',
            contactId: 'marcus_webb',
            label: 'Marcus Webb',
            spriteKey: _c('marcus_webb').spriteKey || 'walk_art_critic_walk',
            tint: _c('marcus_webb').tint || 0xaaaaaa,
            speed: 1.5,
            dialogContent: 'Marcus: "Don\'t mistake hype for value."',
            eventId: 'marcus_review',
            dealerType: _c('marcus_webb').haggleProfile?.dealerType || 'collector',
            schedule: [
                { map: 'pallet_town', days: [1, 2, 3, 4, 5], startHour: 10, endHour: 16, x: 26, y: 10, behavior: 'wandering' },
            ]
        },
        // ── 14. Kai Nakamura — Young Power Dealer ──
        {
            id: 'npc_kai',
            contactId: 'kai_nakamura',
            label: 'Kai Nakamura',
            spriteKey: _c('kai_nakamura').spriteKey || 'walk_young_power_dealer_walk',
            tint: _c('kai_nakamura').tint || 0xffaa44,
            speed: 2.5,
            dialogContent: 'Kai: "I sold three pieces before lunch. What did you do?"',
            eventId: 'kai_deal_chat',
            dealerType: _c('kai_nakamura').haggleProfile?.dealerType || 'shark',
            schedule: [
                { map: 'pallet_town', days: [1, 2, 3, 4, 5], startHour: 11, endHour: 20, x: 16, y: 14, behavior: 'wandering' },
                { map: 'pallet_town', days: [6], startHour: 20, endHour: 24, x: 8, y: 6, behavior: 'stationary' },
            ]
        },
        // ── 15. Zara Osei — Underground Connector ──
        {
            id: 'npc_zara',
            contactId: 'zara_osei',
            label: 'Zara Osei',
            spriteKey: _c('zara_osei').spriteKey || 'walk_underground_connector_walk',
            tint: _c('zara_osei').tint || 0xcc66ff,
            speed: 2.8,
            dialogContent: 'Zara: "I know people who know people. That\'s my currency."',
            eventId: 'zara_connection',
            dealerType: _c('zara_osei').haggleProfile?.dealerType || 'hustler',
            schedule: [
                { map: 'pallet_town', days: [3, 4, 5, 6, 7], startHour: 19, endHour: 24, x: 6, y: 4, behavior: 'wandering' },
            ]
        },
        // ── 16. Bianca Ferreira — The It-Girl Dealer ──
        {
            id: 'npc_bianca',
            contactId: 'bianca_ferreira',
            label: 'Bianca Ferreira',
            spriteKey: _c('bianca_ferreira').spriteKey || 'walk_it_girl_dealer_walk',
            tint: _c('bianca_ferreira').tint || 0xff66aa,
            speed: 2.2,
            dialogContent: 'Bianca: "If you\'re not on the list, you don\'t exist."',
            eventId: 'bianca_vip_invite',
            dealerType: _c('bianca_ferreira').haggleProfile?.dealerType || 'hustler',
            schedule: [
                { map: 'pallet_town', days: [4, 5, 6], startHour: 20, endHour: 24, x: 14, y: 2, behavior: 'wandering' },
                { map: 'pallet_town', days: [7], startHour: 14, endHour: 20, x: 18, y: 8, behavior: 'stationary' },
            ]
        },
    ],

    /**
     * Get the active NPCs for a specific map at a specific date/time.
     * @param {string} mapId The key of the current tiled map
     * @param {number} dayOfWeek 1 (Mon) - 7 (Sun)
     * @param {number} hour 0-23
     * @returns {Array} List of npc configuration objects
     */
    getNPCsForMap(mapId, dayOfWeek, hour) {
        const activeNPCs = [];
        for (const npc of this.npcs) {
            const schedule = npc.schedule.find(s =>
                s.map === mapId &&
                s.days.includes(dayOfWeek) &&
                hour >= s.startHour && hour < s.endHour
            );

            if (schedule) {
                activeNPCs.push({
                    id: npc.id,
                    contactId: npc.contactId,
                    label: npc.label,
                    spriteKey: npc.spriteKey,
                    tint: npc.tint,
                    speed: npc.speed,
                    dialogContent: npc.dialogContent,
                    eventId: npc.eventId || null,
                    dealerType: npc.dealerType || null,
                    behavior: schedule.behavior,
                    startPosition: { x: schedule.x, y: schedule.y }
                });
            }
        }
        return activeNPCs;
    },

    /**
     * Get the full contact data for an NPC.
     * Bridges NPCManager → contacts.js for accessing wealth, collection, taste, etc.
     * @param {string} npcId — the NPCManager ID (e.g. 'npc_elena')
     * @returns {Object|null} The full contact object from contacts.js
     */
    getContact(npcId) {
        const npc = this.npcs.find(n => n.id === npcId);
        if (!npc?.contactId) return null;
        return CONTACTS.find(c => c.id === npc.contactId) || null;
    },

    /**
     * Get all NPCs that have a specific dealer type.
     * Useful for CMS tools that need to list NPCs by battle type.
     * @param {string} dealerType — e.g. 'shark', 'patron', 'hustler'
     * @returns {Array} Matching NPC entries
     */
    getNPCsByDealerType(dealerType) {
        return this.npcs.filter(n => n.dealerType === dealerType);
    },
};
