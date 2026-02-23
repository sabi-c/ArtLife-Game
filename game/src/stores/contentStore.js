/**
 * ContentStore — Unified content registry for the CMS ("Director's Chair")
 *
 * Ingests all data/ entities (NPCs, events, artists, items, scenes, rooms, calendar)
 * into a normalized, searchable registry. Powers the CMS Content Library panel.
 *
 * Usage:
 *   const { entities, categories, load } = useContentStore.getState();
 *   await load(); // one-time async import of all data files
 *   const npcs = entities.filter(e => e.category === 'npc');
 */

import { create } from 'zustand';

// ── Category metadata ──
const CATEGORY_META = {
    npc: { icon: '🧑', label: 'NPCs', color: '#ff9999' },
    event: { icon: '🎭', label: 'Events', color: '#ffcc44' },
    artist: { icon: '🎨', label: 'Artists', color: '#4a9e6a' },
    artwork: { icon: '🖼️', label: 'Artworks', color: '#c9a84c' },
    scene: { icon: '🎬', label: 'Scenes', color: '#8888ff' },
    venue: { icon: '🏛️', label: 'Venues', color: '#aa66cc' },
    calendar: { icon: '📅', label: 'Calendar', color: '#44bbff' },
    dialogue: { icon: '💬', label: 'Dialogues', color: '#88dd88' },
};

const useContentStore = create((set, get) => ({
    entities: [],          // flat array of { id, category, name, data, ...meta }
    categories: CATEGORY_META,
    loaded: false,
    loading: false,
    error: null,
    searchQuery: '',
    selectedCategory: null,
    selectedEntity: null,

    // ── Actions ──

    setSearch: (query) => set({ searchQuery: query }),
    setCategory: (cat) => set({ selectedCategory: cat }),
    selectEntity: (entity) => set({ selectedEntity: entity }),

    /** Get filtered entities based on search + category */
    getFiltered: () => {
        const { entities, searchQuery, selectedCategory } = get();
        let filtered = entities;
        if (selectedCategory) {
            filtered = filtered.filter(e => e.category === selectedCategory);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(e =>
                e.name.toLowerCase().includes(q) ||
                e.id.toLowerCase().includes(q) ||
                (e.subcategory || '').toLowerCase().includes(q)
            );
        }
        return filtered;
    },

    /** Get entity counts per category */
    getCounts: () => {
        const { entities } = get();
        const counts = {};
        for (const e of entities) {
            counts[e.category] = (counts[e.category] || 0) + 1;
        }
        return counts;
    },

    /** Force reload — resets loaded flag and re-imports all data */
    reload: async () => {
        set({ loaded: false, loading: false });
        return get().load();
    },

    /** One-time async load of all data files */
    load: async () => {
        if (get().loaded || get().loading) return;
        set({ loading: true, error: null });

        try {
            const entities = [];

            // NPCs
            const { CONTACTS } = await import('../data/contacts.js');
            for (const c of CONTACTS) {
                entities.push({
                    id: c.id, category: 'npc', name: c.name,
                    subcategory: c.role, icon: c.emoji || '🧑',
                    data: c,
                });
            }

            // Artists
            const { ARTISTS } = await import('../data/artists.js');
            for (const a of ARTISTS) {
                entities.push({
                    id: a.id, category: 'artist', name: a.name,
                    subcategory: a.tier, icon: '🎨',
                    data: a,
                });
            }

            // Artworks (generated from artists)
            const { generateInitialWorks } = await import('../data/artists.js');
            const works = generateInitialWorks();
            for (const w of works) {
                entities.push({
                    id: w.id, category: 'artwork', name: w.title,
                    subcategory: `${w.artist} (${w.era})`, icon: '🖼️',
                    data: w,
                });
            }

            // Events
            const { EVENTS } = await import('../data/events.js');
            for (const ev of EVENTS) {
                entities.push({
                    id: ev.id, category: 'event', name: ev.title,
                    subcategory: ev.category, icon: '🎭',
                    data: ev,
                });
            }

            // Venues & Rooms
            const { VENUES } = await import('../data/rooms.js');
            for (const v of VENUES) {
                entities.push({
                    id: v.id, category: 'venue', name: v.name,
                    subcategory: `${v.rooms?.length || 0} rooms`, icon: '🏛️',
                    data: v,
                });
            }

            // Dynamic import: lazy CMS loading — calendar data only needed when CMS opens
            const { CALENDAR_EVENTS } = await import('../data/calendar_events.js');
            for (const ce of CALENDAR_EVENTS) {
                entities.push({
                    id: ce.id, category: 'calendar', name: ce.name,
                    subcategory: `${ce.type} · ${ce.location}`, icon: '📅',
                    data: ce,
                });
            }

            // Scenes (ink/JSON)
            const { SCENES } = await import('../data/scenes.js');
            for (const s of SCENES) {
                entities.push({
                    id: s.id, category: 'scene', name: s.title,
                    subcategory: Object.keys(s.nodes || {}).length + ' nodes', icon: '🎬',
                    data: s,
                });
            }

            // Dialogue Trees (tone definitions + full trees)
            const { TONES, DIALOGUE_TREES } = await import('../data/dialogue_trees.js');
            for (const t of TONES) {
                entities.push({
                    id: `tone_${t.id}`, category: 'dialogue', name: `Tone: ${t.label}`,
                    subcategory: t.bestFor, icon: t.icon,
                    data: t,
                });
            }
            // Full dialogue trees — each NPC conversation becomes a searchable entity
            if (Array.isArray(DIALOGUE_TREES)) {
                const npcNames = {};
                for (const c of CONTACTS) { npcNames[c.id] = c.name; }
                for (const tree of DIALOGUE_TREES) {
                    const nodeCount = Object.keys(tree.nodes || {}).length;
                    entities.push({
                        id: tree.id, category: 'dialogue',
                        name: `${npcNames[tree.npcId] || tree.npcId} — ${tree.venue}`,
                        subcategory: `${nodeCount} nodes · ${tree.trigger}`,
                        icon: '💬',
                        data: tree,
                    });
                }
            }

            set({ entities, loaded: true, loading: false });
        } catch (err) {
            console.error('[ContentStore] Failed to load content:', err);
            set({ error: err.message, loading: false });
        }
    },
}));

export { useContentStore, CATEGORY_META };
