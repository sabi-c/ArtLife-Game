import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { EventRegistry } from '../managers/EventRegistry.js';
import { useNPCStore } from './npcStore.js';
import { MarketManager } from '../managers/MarketManager.js';
import { ARTWORKS } from '../data/artworks.js';

/**
 * cmsStore.js — Unified CMS Persistence Layer
 *
 * Tracks all CMS modifications as a diff layer on top of the original JSON files.
 * Provides save/load/export capabilities for the entire content pipeline.
 *
 * Dependencies: EventRegistry (events/storylines), useNPCStore (NPC contacts).
 * These are imported as ES modules at the top level to avoid intermittent
 * build errors from inline require() calls.
 *
 * This store persists to localStorage so CMS work survives page reloads.
 */

const AUTOSAVE_INTERVAL = 60_000; // 60 seconds

export const useCmsStore = create(
    persist(
        immer((set, get) => ({

            // ── Dirty Flags ──
            // Each domain tracks whether it has unsaved modifications
            dirty: {
                events: false,
                storylines: false,
                npcs: false,
                artworks: false,
                venues: false,
                kanban: false,
                timeline: false,
                maps: false,
                haggle: false,
                market: false,
            },

            // ── Modification Snapshots ──
            // Full copies of modified data, stored here for persistence
            snapshots: {
                events: null,       // Array of event objects from events.json
                storylines: null,   // Array of storyline objects from storylines.json
                npcs: null,         // Array of NPC contacts
                kanbanColumns: null, // Kanban board column assignments
                graphPositions: null, // Content graph node positions
                timelineOverrides: null, // Week overrides for timeline drag
                maps: null,         // { [mapId]: mapJSON } — edited Tiled map snapshots
            },

            // ── Change Log ──
            changeLog: [],    // Array of { timestamp, domain, action, details }
            lastSaveTime: null,

            // ── Data Presets ──
            presets: {},           // { [name]: { bundle, savedAt, summary } }
            activePreset: null,    // Name of currently loaded preset

            // ── Auto-save Timer ID ──
            _autoSaveTimer: null,

            // ═══════════════════════════════════════════════════════════
            //  DIRTY FLAG MANAGEMENT
            // ═══════════════════════════════════════════════════════════

            /** Mark a domain as dirty (has unsaved changes) */
            markDirty: (domain) => set((state) => {
                state.dirty[domain] = true;
            }),

            /** Mark a domain as clean */
            markClean: (domain) => set((state) => {
                state.dirty[domain] = false;
            }),

            /** Check if any domain has unsaved changes */
            hasUnsavedChanges: () => {
                const { dirty } = get();
                return Object.values(dirty).some(Boolean);
            },

            /** Get list of dirty domain names */
            getDirtyDomains: () => {
                const { dirty } = get();
                return Object.entries(dirty)
                    .filter(([, isDirty]) => isDirty)
                    .map(([domain]) => domain);
            },

            // ═══════════════════════════════════════════════════════════
            //  SNAPSHOT MANAGEMENT
            // ═══════════════════════════════════════════════════════════

            /** Save a snapshot of a domain's current data */
            saveSnapshot: (domain, data) => set((state) => {
                state.snapshots[domain] = JSON.parse(JSON.stringify(data));
                state.dirty[domain] = true;
                state.changeLog.push({
                    timestamp: Date.now(),
                    domain,
                    action: 'snapshot',
                    details: `Saved ${Array.isArray(data) ? data.length + ' items' : 'data'} to ${domain}`,
                });
                // Keep changelog manageable
                if (state.changeLog.length > 100) {
                    state.changeLog = state.changeLog.slice(-50);
                }
            }),

            /** Get the saved snapshot for a domain (or null if none) */
            getSnapshot: (domain) => {
                return get().snapshots[domain];
            },

            // ═══════════════════════════════════════════════════════════
            //  SAVE / LOAD / EXPORT
            // ═══════════════════════════════════════════════════════════

            /** 
             * Save all current game state into snapshots.
             * Call this manually or from auto-save.
             */
            saveAll: () => {
                try {
                    const events = EventRegistry.jsonEvents || [];
                    const storylines = EventRegistry.jsonStorylines || [];
                    const npcs = useNPCStore.getState().contacts || [];
                    const artists = MarketManager.artists || [];
                    const parts = [];

                    set((state) => {
                        if (events.length > 0) { state.snapshots.events = JSON.parse(JSON.stringify(events)); parts.push(`${events.length} events`); }
                        if (storylines.length > 0) { state.snapshots.storylines = JSON.parse(JSON.stringify(storylines)); parts.push(`${storylines.length} storylines`); }
                        if (npcs.length > 0) { state.snapshots.npcs = JSON.parse(JSON.stringify(npcs)); parts.push(`${npcs.length} NPCs`); }
                        if (artists.length > 0) { state.snapshots.artists = JSON.parse(JSON.stringify(artists)); parts.push(`${artists.length} artists`); }
                        // maps, timelineOverrides, haggle_config, artworks are already
                        // saved incrementally via saveMapSnapshot/saveTimelineOverride/saveSnapshot
                        // — they live in state.snapshots and get auto-persisted by zustand persist.
                        // We just note them in the log if present.
                        if (state.snapshots.maps) parts.push(`${Object.keys(state.snapshots.maps).length} maps`);
                        if (state.snapshots.timelineOverrides) parts.push(`${Object.keys(state.snapshots.timelineOverrides).length} timeline overrides`);
                        if (state.snapshots.haggle_config) parts.push('haggle config');
                        if (state.snapshots.artworks) parts.push(`${(state.snapshots.artworks || []).length} artworks`);

                        // Clear all dirty flags
                        Object.keys(state.dirty).forEach(k => { state.dirty[k] = false; });
                        state.lastSaveTime = Date.now();

                        state.changeLog.push({
                            timestamp: Date.now(),
                            domain: 'all',
                            action: 'saveAll',
                            details: `Saved ${parts.join(', ') || 'nothing'}`,
                        });
                    });

                    console.log(`[CmsStore] 💾 All data saved: ${parts.join(', ')}`);
                    return true;
                } catch (err) {
                    console.error('[CmsStore] Save failed:', err);
                    return false;
                }
            },

            /**
             * Restore saved snapshots back into the live registries and stores.
             * Called on boot to rehydrate CMS edits.
             */
            loadSaved: () => {
                try {
                    const state = get();
                    let loaded = 0;

                    if (state.snapshots.events?.length) {
                        EventRegistry.jsonEvents = JSON.parse(JSON.stringify(state.snapshots.events));
                        loaded++;
                        console.log(`[CmsStore] ♻️ Restored ${state.snapshots.events.length} events`);
                    }

                    if (state.snapshots.storylines?.length) {
                        EventRegistry.jsonStorylines = JSON.parse(JSON.stringify(state.snapshots.storylines));
                        loaded++;
                        console.log(`[CmsStore] ♻️ Restored ${state.snapshots.storylines.length} storylines`);
                    }

                    if (state.snapshots.npcs?.length) {
                        useNPCStore.setState({ contacts: JSON.parse(JSON.stringify(state.snapshots.npcs)) });
                        loaded++;
                        console.log(`[CmsStore] ♻️ Restored ${state.snapshots.npcs.length} NPCs`);
                    }

                    if (state.snapshots.artists?.length) {
                        try {
                            MarketManager.artists = JSON.parse(JSON.stringify(state.snapshots.artists));
                            loaded++;
                            console.log(`[CmsStore] ♻️ Restored ${state.snapshots.artists.length} artists`);
                        } catch (_) { /* MarketManager may not be initialized yet */ }
                    }

                    // Maps, timeline overrides, haggle_config are restored automatically
                    // by zustand persist — they live in state.snapshots and are read
                    // directly by their respective editors on mount.
                    if (state.snapshots.maps) { loaded++; console.log(`[CmsStore] ♻️ ${Object.keys(state.snapshots.maps).length} maps available`); }
                    if (state.snapshots.timelineOverrides) { loaded++; console.log(`[CmsStore] ♻️ ${Object.keys(state.snapshots.timelineOverrides).length} timeline overrides available`); }
                    if (state.snapshots.haggle_config) { loaded++; console.log('[CmsStore] ♻️ Haggle config available'); }

                    if (loaded > 0) {
                        console.log(`[CmsStore] ✅ Rehydrated ${loaded} domain(s) from saved CMS state`);
                    }
                    return loaded;
                } catch (err) {
                    console.error('[CmsStore] Load failed:', err);
                    return 0;
                }
            },

            /**
             * Export all CMS data as downloadable JSON files.
             * Downloads a combined JSON bundle.
             */
            exportBundle: () => {
                try {
                    const state = get();
                    const bundle = {
                        _meta: {
                            exportedAt: new Date().toISOString(),
                            version: '1.2.0',
                            game: 'ArtLife',
                        },
                        events: EventRegistry.jsonEvents || [],
                        storylines: EventRegistry.jsonStorylines || [],
                        npcs: useNPCStore.getState().contacts || [],
                        artworks: state.snapshots.artworks || ARTWORKS || null,
                        artists: state.snapshots.artists || (MarketManager.artists || null),
                        maps: state.snapshots.maps || null,
                        timelineOverrides: state.snapshots.timelineOverrides || null,
                        haggle_config: state.snapshots.haggle_config || null,
                    };

                    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bundle, null, 2));
                    const anchor = document.createElement('a');
                    anchor.href = dataStr;
                    anchor.download = `artlife_cms_export_${new Date().toISOString().slice(0, 10)}.json`;
                    anchor.click();

                    const parts = [
                        `${bundle.events.length} events`,
                        `${bundle.storylines.length} storylines`,
                        `${bundle.npcs.length} NPCs`,
                    ];
                    if (bundle.maps) parts.push(`${Object.keys(bundle.maps).length} maps`);
                    if (bundle.timelineOverrides) parts.push(`${Object.keys(bundle.timelineOverrides).length} timeline`);
                    if (bundle.haggle_config) parts.push('haggle');

                    set((state) => {
                        state.changeLog.push({
                            timestamp: Date.now(),
                            domain: 'all',
                            action: 'export',
                            details: `Exported: ${parts.join(', ')}`,
                        });
                    });

                    console.log(`[CmsStore] 📦 Bundle exported: ${parts.join(', ')}`);
                    return true;
                } catch (err) {
                    console.error('[CmsStore] Export failed:', err);
                    return false;
                }
            },

            /**
             * Import a previously exported bundle.
             */
            importBundle: (bundleJson) => {
                try {
                    const bundle = typeof bundleJson === 'string' ? JSON.parse(bundleJson) : bundleJson;
                    const parts = [];

                    if (bundle.events?.length) {
                        EventRegistry.jsonEvents = bundle.events;
                        set((state) => { state.snapshots.events = bundle.events; state.dirty.events = true; });
                        parts.push(`${bundle.events.length} events`);
                    }
                    if (bundle.storylines?.length) {
                        EventRegistry.jsonStorylines = bundle.storylines;
                        set((state) => { state.snapshots.storylines = bundle.storylines; state.dirty.storylines = true; });
                        parts.push(`${bundle.storylines.length} storylines`);
                    }
                    if (bundle.npcs?.length) {
                        useNPCStore.setState({ contacts: bundle.npcs });
                        set((state) => { state.snapshots.npcs = bundle.npcs; state.dirty.npcs = true; });
                        parts.push(`${bundle.npcs.length} NPCs`);
                    }
                    if (bundle.artworks?.length) {
                        set((state) => { state.snapshots.artworks = bundle.artworks; state.dirty.artworks = true; });
                        parts.push(`${bundle.artworks.length} artworks`);
                    }
                    if (bundle.artists?.length) {
                        try { MarketManager.artists = bundle.artists; } catch (_) { }
                        set((state) => { state.snapshots.artists = bundle.artists; state.dirty.market = true; });
                        parts.push(`${bundle.artists.length} artists`);
                    }
                    if (bundle.maps) {
                        set((state) => { state.snapshots.maps = bundle.maps; state.dirty.maps = true; });
                        parts.push(`${Object.keys(bundle.maps).length} maps`);
                    }
                    if (bundle.timelineOverrides) {
                        set((state) => { state.snapshots.timelineOverrides = bundle.timelineOverrides; state.dirty.timeline = true; });
                        parts.push(`${Object.keys(bundle.timelineOverrides).length} timeline`);
                    }
                    if (bundle.haggle_config) {
                        set((state) => { state.snapshots.haggle_config = bundle.haggle_config; state.dirty.haggle = true; });
                        parts.push('haggle config');
                    }

                    console.log(`[CmsStore] 📥 Imported: ${parts.join(', ')}`);
                    return true;
                } catch (err) {
                    console.error('[CmsStore] Import failed:', err);
                    return false;
                }
            },

            // ═══════════════════════════════════════════════════════════
            //  MAP SNAPSHOT MANAGEMENT
            // ═══════════════════════════════════════════════════════════

            /** Save a single map's JSON data (from MapEditor edits) */
            saveMapSnapshot: (mapId, mapJSON) => set((state) => {
                if (!state.snapshots.maps) state.snapshots.maps = {};
                state.snapshots.maps[mapId] = JSON.parse(JSON.stringify(mapJSON));
                state.dirty.maps = true;
                state.changeLog.push({
                    timestamp: Date.now(),
                    domain: 'maps',
                    action: 'saveMap',
                    details: `Saved map: ${mapId} (${mapJSON.width}x${mapJSON.height})`,
                });
                if (state.changeLog.length > 100) state.changeLog = state.changeLog.slice(-50);
            }),

            /** Get a saved map snapshot by ID (or null) */
            getMapSnapshot: (mapId) => {
                const maps = get().snapshots.maps;
                return maps ? maps[mapId] || null : null;
            },

            /** Get all saved map snapshots */
            getAllMapSnapshots: () => get().snapshots.maps || {},

            // ═══════════════════════════════════════════════════════════
            //  CHANGELOG
            // ═══════════════════════════════════════════════════════════

            getChangeLog: () => get().changeLog,

            logChange: (domain, action, details) => set((state) => {
                state.changeLog.push({
                    timestamp: Date.now(),
                    domain,
                    action,
                    details,
                });
                if (state.changeLog.length > 100) {
                    state.changeLog = state.changeLog.slice(-50);
                }
            }),

            // ═══════════════════════════════════════════════════════════
            //  AUTO-SAVE
            // ═══════════════════════════════════════════════════════════

            startAutoSave: () => {
                const existing = get()._autoSaveTimer;
                if (existing) clearInterval(existing);

                const timerId = setInterval(() => {
                    if (get().hasUnsavedChanges()) {
                        console.log('[CmsStore] ⏰ Auto-saving...');
                        get().saveAll();
                    }
                }, AUTOSAVE_INTERVAL);

                set((state) => { state._autoSaveTimer = timerId; });
                console.log('[CmsStore] Auto-save started (every 60s)');
            },

            stopAutoSave: () => {
                const timerId = get()._autoSaveTimer;
                if (timerId) {
                    clearInterval(timerId);
                    set((state) => { state._autoSaveTimer = null; });
                }
            },

            // ═══════════════════════════════════════════════════════════
            //  GRAPH POSITIONS
            // ═══════════════════════════════════════════════════════════

            saveGraphPositions: (positions) => set((state) => {
                state.snapshots.graphPositions = positions;
            }),

            getGraphPositions: () => get().snapshots.graphPositions,

            // ═══════════════════════════════════════════════════════════
            //  TIMELINE OVERRIDES  
            // ═══════════════════════════════════════════════════════════

            saveTimelineOverride: (itemId, newWeek) => set((state) => {
                if (!state.snapshots.timelineOverrides) {
                    state.snapshots.timelineOverrides = {};
                }
                state.snapshots.timelineOverrides[itemId] = newWeek;
                state.dirty.timeline = true;
            }),

            getTimelineOverrides: () => get().snapshots.timelineOverrides || {},

            // ═══════════════════════════════════════════════════════════
            //  RESET
            // ═══════════════════════════════════════════════════════════

            reset: () => set((state) => {
                state.dirty = { events: false, storylines: false, npcs: false, artworks: false, venues: false, kanban: false, timeline: false, maps: false, haggle: false, market: false };
                state.snapshots = { events: null, storylines: null, npcs: null, kanbanColumns: null, graphPositions: null, timelineOverrides: null, maps: null, haggle_config: null, artists: null, artworks: null };
                state.changeLog = [];
                state.lastSaveTime = null;
            }),

            // ═══════════════════════════════════════════════════════════
            //  DATA PRESETS
            // ═══════════════════════════════════════════════════════════

            /** Save current live data as a named preset */
            saveAsPreset: (name) => {
                try {
                    const bundle = {
                        _meta: { savedAt: new Date().toISOString(), version: '1.2.0', game: 'ArtLife' },
                        events: EventRegistry.jsonEvents || [],
                        storylines: EventRegistry.jsonStorylines || [],
                        npcs: useNPCStore.getState().contacts || [],
                        artworks: get().snapshots.artworks || ARTWORKS || null,
                        artists: get().snapshots.artists || (MarketManager.artists || null),
                        maps: get().snapshots.maps || null,
                        timelineOverrides: get().snapshots.timelineOverrides || null,
                        haggle_config: get().snapshots.haggle_config || null,
                    };
                    const summary = {
                        events: (bundle.events || []).length,
                        storylines: (bundle.storylines || []).length,
                        npcs: (bundle.npcs || []).length,
                        artworks: (bundle.artworks || []).length,
                        artists: (bundle.artists || []).length,
                    };
                    set((state) => {
                        state.presets[name] = { bundle: JSON.parse(JSON.stringify(bundle)), savedAt: new Date().toISOString(), summary };
                        state.activePreset = name;
                        state.changeLog.push({ timestamp: Date.now(), domain: 'presets', action: 'save', details: `Saved preset: "${name}"` });
                    });
                    console.log(`[CmsStore] 💾 Preset saved: "${name}"`);
                    return true;
                } catch (err) {
                    console.error('[CmsStore] Preset save failed:', err);
                    return false;
                }
            },

            /** Load a named preset into the live game state */
            loadPreset: (name) => {
                const preset = get().presets[name];
                if (!preset?.bundle) return false;
                const ok = get().importBundle(preset.bundle);
                if (ok) {
                    set((state) => {
                        state.activePreset = name;
                        state.changeLog.push({ timestamp: Date.now(), domain: 'presets', action: 'load', details: `Loaded preset: "${name}"` });
                    });
                    console.log(`[CmsStore] 📥 Preset loaded: "${name}"`);
                }
                return ok;
            },

            /** Delete a named preset */
            deletePreset: (name) => {
                set((state) => {
                    delete state.presets[name];
                    if (state.activePreset === name) state.activePreset = null;
                    state.changeLog.push({ timestamp: Date.now(), domain: 'presets', action: 'delete', details: `Deleted preset: "${name}"` });
                });
            },

            /** List all presets with metadata */
            listPresets: () => {
                const presets = get().presets || {};
                return Object.entries(presets).map(([name, data]) => ({
                    name,
                    savedAt: data.savedAt,
                    summary: data.summary || {},
                }));
            },

            /** Get live data counts from all registries */
            getDataSummary: () => {
                try {
                    return {
                        events: (EventRegistry.jsonEvents || []).length,
                        storylines: (EventRegistry.jsonStorylines || []).length,
                        npcs: (useNPCStore.getState().contacts || []).length,
                        artists: (MarketManager.artists || []).length,
                        artworks: (get().snapshots.artworks || ARTWORKS || []).length,
                    };
                } catch { return { events: 0, storylines: 0, npcs: 0, artists: 0, artworks: 0 }; }
            },

        })),
        {
            name: 'artlife-cms-store',
            partialize: (state) => ({
                dirty: state.dirty,
                snapshots: state.snapshots,
                changeLog: state.changeLog,
                lastSaveTime: state.lastSaveTime,
                presets: state.presets,
                activePreset: state.activePreset,
            }),
        }
    )
);
