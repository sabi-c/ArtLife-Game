/**
 * ContentAPI — Programmatic CRUD facade for all game content.
 *
 * Singleton exposed on window.ContentAPI for MCP tooling and dev console.
 * In-memory mutations with optional persist() to localStorage overlay.
 * Changes survive refresh via `content_overrides` key.
 */

import { useContentStore } from '../stores/contentStore.js';

const STORAGE_KEY = 'content_overrides';

function loadOverrides() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
}

function saveOverrides(overrides) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

const ContentAPI = {
    // ── Calendar Events ──
    getCalendarEvents() {
        return useContentStore.getState().entities
            .filter(e => e.category === 'calendar')
            .map(e => e.data);
    },

    addCalendarEvent(ev) {
        const store = useContentStore.getState();
        const entity = {
            id: ev.id, category: 'calendar', name: ev.name,
            subcategory: `${ev.type} · ${ev.location}`, icon: '📅',
            data: ev,
        };
        useContentStore.setState({ entities: [...store.entities, entity] });
        this._persist('calendar', ev.id, ev);
        return entity;
    },

    updateCalendarEvent(id, patch) {
        return this._updateEntity('calendar', id, patch);
    },

    removeCalendarEvent(id) {
        return this._removeEntity('calendar', id);
    },

    // ── Contacts / NPCs ──
    getContacts() {
        return useContentStore.getState().entities
            .filter(e => e.category === 'npc')
            .map(e => e.data);
    },

    getContact(id) {
        const entity = useContentStore.getState().entities.find(e => e.category === 'npc' && e.id === id);
        return entity?.data || null;
    },

    updateContact(id, patch) {
        return this._updateEntity('npc', id, patch);
    },

    addContact(contact) {
        const store = useContentStore.getState();
        const entity = {
            id: contact.id, category: 'npc', name: contact.name,
            subcategory: contact.role, icon: contact.emoji || '🧑',
            data: contact,
        };
        useContentStore.setState({ entities: [...store.entities, entity] });
        this._persist('npc', contact.id, contact);
        return entity;
    },

    // ── Dialogue Trees ──
    getDialogueTrees() {
        return useContentStore.getState().entities
            .filter(e => e.category === 'dialogue')
            .map(e => e.data);
    },

    addDialogueTree(tree) {
        const store = useContentStore.getState();
        const entity = {
            id: tree.id, category: 'dialogue', name: tree.title || tree.id,
            subcategory: 'dialogue tree', icon: '💬',
            data: tree,
        };
        useContentStore.setState({ entities: [...store.entities, entity] });
        this._persist('dialogue', tree.id, tree);
        return entity;
    },

    // ── Venues ──
    getVenues() {
        return useContentStore.getState().entities
            .filter(e => e.category === 'venue')
            .map(e => e.data);
    },

    getVenue(id) {
        const entity = useContentStore.getState().entities.find(e => e.category === 'venue' && e.id === id);
        return entity?.data || null;
    },

    updateVenue(id, patch) {
        return this._updateEntity('venue', id, patch);
    },

    // ── Artworks & Artists ──
    getArtworks() {
        return useContentStore.getState().entities
            .filter(e => e.category === 'artwork')
            .map(e => e.data);
    },

    getArtists() {
        return useContentStore.getState().entities
            .filter(e => e.category === 'artist')
            .map(e => e.data);
    },

    // ── Events (narrative) ──
    getEvents() {
        return useContentStore.getState().entities
            .filter(e => e.category === 'event')
            .map(e => e.data);
    },

    addEvent(event) {
        const store = useContentStore.getState();
        const entity = {
            id: event.id, category: 'event', name: event.title,
            subcategory: event.category, icon: '🎭',
            data: event,
        };
        useContentStore.setState({ entities: [...store.entities, entity] });
        this._persist('event', event.id, event);
        return entity;
    },

    // ── Bulk Operations ──
    exportAll() {
        const entities = useContentStore.getState().entities;
        const grouped = {};
        for (const e of entities) {
            if (!grouped[e.category]) grouped[e.category] = [];
            grouped[e.category].push(e.data);
        }
        return grouped;
    },

    importPatch(patch) {
        const store = useContentStore.getState();
        const newEntities = [...store.entities];
        let count = 0;

        for (const [category, items] of Object.entries(patch)) {
            for (const item of items) {
                const idx = newEntities.findIndex(e => e.category === category && e.id === item.id);
                if (idx >= 0) {
                    newEntities[idx] = { ...newEntities[idx], data: { ...newEntities[idx].data, ...item } };
                } else {
                    newEntities.push({
                        id: item.id, category, name: item.name || item.title || item.id,
                        data: item,
                    });
                }
                count++;
            }
        }

        useContentStore.setState({ entities: newEntities });
        return { patched: count };
    },

    refreshStore() {
        useContentStore.setState({ loaded: false, loading: false });
        return useContentStore.getState().load();
    },

    // ── Internal helpers ──
    _updateEntity(category, id, patch) {
        const store = useContentStore.getState();
        const entities = store.entities.map(e => {
            if (e.category === category && e.id === id) {
                const newData = { ...e.data, ...patch };
                return { ...e, data: newData, name: patch.name || e.name };
            }
            return e;
        });
        useContentStore.setState({ entities });
        this._persist(category, id, patch);
        return entities.find(e => e.category === category && e.id === id)?.data;
    },

    _removeEntity(category, id) {
        const store = useContentStore.getState();
        useContentStore.setState({
            entities: store.entities.filter(e => !(e.category === category && e.id === id))
        });
        const overrides = loadOverrides();
        if (overrides[category]) delete overrides[category][id];
        saveOverrides(overrides);
        return true;
    },

    _persist(category, id, data) {
        const overrides = loadOverrides();
        if (!overrides[category]) overrides[category] = {};
        overrides[category][id] = { ...(overrides[category][id] || {}), ...data };
        saveOverrides(overrides);
    },
};

// Register globally for MCP/console access
window.ContentAPI = ContentAPI;

export { ContentAPI };
