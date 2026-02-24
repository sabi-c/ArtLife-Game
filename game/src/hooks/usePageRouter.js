/**
 * usePageRouter.js — URL-synced page navigation for ArtLife
 *
 * Bridges the gap between the game's event-based VIEW/OVERLAY system
 * and browser URL routing. Every navigation action pushes a URL,
 * enabling bookmarking, browser back/forward, and deep linking.
 *
 * ARCHITECTURE:
 *   URL pattern: /{page}?overlay={overlay}
 *   Examples:
 *     /                → PHASER + BLOOMBERG overlay (default game view)
 *     /boot            → BOOT (login/intro)
 *     /terminal        → TERMINAL (DOM terminal)
 *     /dashboard       → DASHBOARD overlay on TERMINAL
 *     /market          → BLOOMBERG overlay
 *     /inbox           → GMAIL_GUIDE overlay
 *     /artnet          → ARTNET_MARKETPLACE overlay
 *     /admin           → ADMIN overlay
 *     /cms             → CMS overlay (ContentStudio)
 *     /sales           → SALES_GRID overlay
 *     /character       → CHARACTER_CREATOR view
 *
 * Exports:
 *   usePageRouter(setActiveView, setActiveOverlay) — hook for App.jsx
 *   navigate(page)     — imperative navigation (works from anywhere)
 *   PAGE_ROUTES        — route configuration table
 */

import { useEffect, useCallback, useRef } from 'react';
import { VIEW, OVERLAY } from '../constants/views.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { SettingsManager } from '../managers/SettingsManager.js';

// Resolve the user's preferred default landing overlay
function getDefaultLandingOverlay() {
    try {
        const pref = SettingsManager.get('defaultLanding') || 'artnet';
        if (pref === 'artnet') return OVERLAY.ARTNET_MARKETPLACE;
        if (pref === 'terminal') return OVERLAY.NONE;
        return OVERLAY.BLOOMBERG;
    } catch { return OVERLAY.BLOOMBERG; }
}

// ════════════════════════════════════════════════════════════
// Route Configuration
// ════════════════════════════════════════════════════════════

export const PAGE_ROUTES = {
    // path       → { view, overlay, title, icon }
    '/': { view: VIEW.PHASER, overlay: null, title: 'Market Terminal', icon: '📊', dynamic: true }, // resolved at runtime by getDefaultLandingOverlay
    '/boot': { view: VIEW.BOOT, overlay: OVERLAY.NONE, title: 'Login', icon: '🔐' },
    '/terminal': { view: VIEW.TERMINAL, overlay: OVERLAY.NONE, title: 'Terminal', icon: '💻' },
    '/dashboard': { view: VIEW.TERMINAL, overlay: OVERLAY.NONE, title: 'Player Dashboard', icon: '📈' },
    '/market': { view: VIEW.PHASER, overlay: OVERLAY.BLOOMBERG, title: 'Market Terminal', icon: '📊' },
    '/inbox': { view: VIEW.PHASER, overlay: OVERLAY.GMAIL_GUIDE, title: 'Inbox', icon: '📧' },
    '/artnet': { view: VIEW.PHASER, overlay: OVERLAY.ARTNET_MARKETPLACE, title: 'Artnet', icon: '🎨' },
    '/artnet/login': { view: VIEW.PHASER, overlay: OVERLAY.ARTNET_LOGIN, title: 'Artnet Login', icon: '🔑' },
    '/artnet/ui': { view: VIEW.PHASER, overlay: OVERLAY.ARTNET_UI, title: 'Artnet UI', icon: '🖼️' },
    '/sales': { view: VIEW.PHASER, overlay: OVERLAY.SALES_GRID, title: 'Gallery Sales', icon: '💰' },
    '/admin': { view: VIEW.PHASER, overlay: OVERLAY.ADMIN, title: 'Admin Panel', icon: '⚙️' },
    '/cms': { view: VIEW.PHASER, overlay: OVERLAY.MASTER_CMS, title: 'Master CMS', icon: '📝' },
    '/cms/master': { view: VIEW.PHASER, overlay: OVERLAY.MASTER_CMS, title: 'Master CMS', icon: '📝' },
    '/settings': { view: VIEW.PHASER, overlay: OVERLAY.SETTINGS, title: 'Settings', icon: '⚙️' },
    '/inventory': { view: VIEW.PHASER, overlay: OVERLAY.INVENTORY, title: 'Inventory', icon: '🎒' },
    '/artwork': { view: VIEW.PHASER, overlay: OVERLAY.ARTWORK_DASHBOARD, title: 'Artwork Detail', icon: '🖼️' },
    '/market/data': { view: VIEW.PHASER, overlay: OVERLAY.MARKET_DASHBOARD, title: 'Market Data', icon: '📉' },
    '/design': { view: VIEW.PHASER, overlay: OVERLAY.DESIGN_GUIDE, title: 'Design Guide', icon: '🎨' },
    '/debug': { view: VIEW.PHASER, overlay: OVERLAY.DEBUG_LOG, title: 'Debug Log', icon: '🐛' },
    '/character': { view: VIEW.CHARACTER_CREATOR, overlay: OVERLAY.NONE, title: 'Character Creator', icon: '👤' },
    '/scene': { view: VIEW.SCENE_ENGINE, overlay: OVERLAY.NONE, title: 'Scene Engine', icon: '🎭' },
};

// Reverse lookup: overlay → path
const OVERLAY_TO_PATH = {};
Object.entries(PAGE_ROUTES).forEach(([path, config]) => {
    if (config.overlay && config.overlay !== OVERLAY.NONE) {
        // Only set if not already mapped (first match wins for reverse lookup)
        if (!OVERLAY_TO_PATH[config.overlay]) {
            OVERLAY_TO_PATH[config.overlay] = path;
        }
    }
});

// Reverse lookup: view → path (for views without overlays)
const VIEW_TO_PATH = {};
Object.entries(PAGE_ROUTES).forEach(([path, config]) => {
    if (!config.overlay || config.overlay === OVERLAY.NONE) {
        if (!VIEW_TO_PATH[config.view]) {
            VIEW_TO_PATH[config.view] = path;
        }
    }
});

// ════════════════════════════════════════════════════════════
// Imperative navigation API (usable from anywhere)
// ════════════════════════════════════════════════════════════

/**
 * Navigate to a page by path.
 * Works from React components, Phaser scenes, terminal screens, anywhere.
 *
 * @param {string} path - URL path like '/inbox', '/admin', '/market'
 * @param {Object} [options] - { replace: boolean } use replaceState instead of pushState
 */
export function navigate(path, options = {}) {
    let route = PAGE_ROUTES[path];
    if (!route) {
        console.warn(`[Router] Unknown route: ${path}`);
        return;
    }

    // Resolve dynamic routes
    if (route.dynamic) route = { ...route, overlay: getDefaultLandingOverlay() };

    // Update URL
    const method = options.replace ? 'replaceState' : 'pushState';
    window.history[method]({ path }, '', path);

    // Dispatch custom event for App.jsx to handle
    window.dispatchEvent(new CustomEvent('artlife:navigate', {
        detail: { path, route, replace: options.replace }
    }));
}

/**
 * Get the current route configuration from the URL.
 */
export function getCurrentRoute() {
    const path = window.location.pathname;
    let route = PAGE_ROUTES[path] || PAGE_ROUTES['/'];
    if (route.dynamic) route = { ...route, overlay: getDefaultLandingOverlay() };
    return route;
}

// ════════════════════════════════════════════════════════════
// React Hook — URL ↔ State Sync
// ════════════════════════════════════════════════════════════

/**
 * Hook that syncs URL ↔ VIEW/OVERLAY state.
 * Used in App.jsx to enable proper page navigation.
 *
 * @param {Function} setActiveView - setState for activeView
 * @param {Function} setActiveOverlay - setState for activeOverlay
 * @param {Function} setViewPayload - setState for viewPayload
 */
export function usePageRouter(setActiveView, setActiveOverlay, setViewPayload) {
    const suppressUrlSync = useRef(false);

    // Handle navigation events (from navigate() calls)
    useEffect(() => {
        const handleNavigate = (e) => {
            const { route } = e.detail;
            suppressUrlSync.current = true;
            setActiveView(route.view);
            setActiveOverlay(route.overlay || OVERLAY.NONE);
            requestAnimationFrame(() => { suppressUrlSync.current = false; });
        };

        const handlePopState = (e) => {
            const path = window.location.pathname;
            let route = PAGE_ROUTES[path];

            // If no route matches, use default landing
            if (!route) {
                route = { ...PAGE_ROUTES['/'], overlay: getDefaultLandingOverlay() };
            }

            // Dynamic route resolution for '/' (uses defaultLanding setting)
            if (route.dynamic) {
                route = { ...route, overlay: getDefaultLandingOverlay() };
            }

            // Safety: if going back to VIEW.PHASER without an overlay,
            // always show the default landing so user doesn't see empty canvas
            if (route.view === VIEW.PHASER && (!route.overlay || route.overlay === OVERLAY.NONE)) {
                route = { ...route, overlay: getDefaultLandingOverlay() };
            }

            suppressUrlSync.current = true;
            setActiveView(route.view);
            setActiveOverlay(route.overlay || OVERLAY.NONE);
            requestAnimationFrame(() => { suppressUrlSync.current = false; });
        };

        window.addEventListener('artlife:navigate', handleNavigate);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('artlife:navigate', handleNavigate);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [setActiveView, setActiveOverlay]);

    // Sync outgoing state changes → URL (when not triggered by navigation)
    const syncUrl = useCallback((view, overlay) => {
        if (suppressUrlSync.current) return;

        // Find the best matching path
        let path = '/';
        if (overlay && overlay !== OVERLAY.NONE && OVERLAY_TO_PATH[overlay]) {
            path = OVERLAY_TO_PATH[overlay];
        } else if (VIEW_TO_PATH[view]) {
            path = VIEW_TO_PATH[view];
        }

        // Only update if different from current URL
        if (window.location.pathname !== path) {
            // Use pushState for overlay changes (so Back button works between overlays)
            // Use replaceState for same-view updates
            window.history.pushState({ path }, '', path);
        }
    }, []);

    // Boot: sync initial URL → state (deep linking support)
    useEffect(() => {
        const path = window.location.pathname;
        if (path !== '/' && PAGE_ROUTES[path]) {
            const route = PAGE_ROUTES[path];
            suppressUrlSync.current = true;
            setActiveView(route.view);
            setActiveOverlay(route.overlay || OVERLAY.NONE);
            requestAnimationFrame(() => { suppressUrlSync.current = false; });
        }
    }, []);

    // Bridge GameEventBus → URL sync
    useEffect(() => {
        const handleUIRoute = (viewKey) => {
            const path = VIEW_TO_PATH[viewKey] || '/';
            if (window.location.pathname !== path) {
                window.history.replaceState({ path }, '', path);
            }
        };

        const handleOverlayToggle = (overlayKey) => {
            const path = OVERLAY_TO_PATH[overlayKey] || '/';
            if (window.location.pathname !== path) {
                window.history.replaceState({ path }, '', path);
            }
        };

        GameEventBus.on(GameEvents.UI_ROUTE, handleUIRoute);
        GameEventBus.on(GameEvents.UI_TOGGLE_OVERLAY, handleOverlayToggle);

        return () => {
            GameEventBus.off(GameEvents.UI_ROUTE, handleUIRoute);
            GameEventBus.off(GameEvents.UI_TOGGLE_OVERLAY, handleOverlayToggle);
        };
    }, []);

    return { syncUrl, navigate };
}
