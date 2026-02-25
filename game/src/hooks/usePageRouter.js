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
import { VIEW, OVERLAY } from '../core/views.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { SettingsManager } from '../managers/SettingsManager.js';

// ════════════════════════════════════════════════════════════
// Base path — captured at module load time before SPA routing changes the URL.
// On localhost: '/'
// On GitHub Pages: '/ArtLife-Game/'
// ════════════════════════════════════════════════════════════
const BASE_PATH = (() => {
    // Vite injects BASE_URL from the `base` config. With `base: './'` it's './'
    const viteBase = import.meta.env.BASE_URL || '/';
    if (viteBase.startsWith('/')) return viteBase; // Already absolute

    // Relative base — derive from the initial URL
    // e.g. https://sabi-c.github.io/ArtLife-Game/ → /ArtLife-Game/
    const pathname = window.location.pathname;
    // Find the repo base by looking at the initial pathname
    // On GH Pages: /ArtLife-Game/ or /ArtLife-Game/admin → base is /ArtLife-Game/
    // On localhost: / or /admin → base is /
    const match = pathname.match(/^(\/[^/]+\/)/);
    // Only use the match if we're NOT on localhost (localhost paths are just /)
    if (match && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        return match[1]; // e.g. '/ArtLife-Game/'
    }
    return '/';
})();

/** Convert a route path like '/admin' to full URL path like '/ArtLife-Game/admin' */
function toFullPath(routePath) {
    if (BASE_PATH === '/') return routePath;
    // Strip leading / from routePath to avoid double slash
    const clean = routePath.startsWith('/') ? routePath.slice(1) : routePath;
    return `${BASE_PATH}${clean}`;
}

/** Convert a full URL pathname to a route path for lookup */
function toRoutePath(fullPath) {
    if (BASE_PATH === '/') return fullPath;
    if (fullPath.startsWith(BASE_PATH)) {
        const route = fullPath.slice(BASE_PATH.length - 1); // keep leading /
        return route || '/';
    }
    return fullPath;
}

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
    '/overworld': { view: VIEW.PHASER, overlay: OVERLAY.NONE, title: 'Overworld', icon: '🗺️', launchScene: 'NewWorldScene' },
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

    // Update URL — prepend base path for GitHub Pages compatibility
    const method = options.replace ? 'replaceState' : 'pushState';
    const fullPath = toFullPath(path);
    window.history[method]({ path }, '', fullPath);

    // Dispatch custom event for App.jsx to handle
    window.dispatchEvent(new CustomEvent('artlife:navigate', {
        detail: { path, route, replace: options.replace }
    }));
}

/**
 * Get the current route configuration from the URL.
 */
export function getCurrentRoute() {
    const routePath = toRoutePath(window.location.pathname);
    let route = PAGE_ROUTES[routePath] || PAGE_ROUTES['/'];
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
            // Launch a Phaser scene if the route specifies one
            if (route.launchScene) {
                GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, route.launchScene);
            }
            requestAnimationFrame(() => { suppressUrlSync.current = false; });
        };

        const handlePopState = (e) => {
            const routePath = toRoutePath(window.location.pathname);
            let route = PAGE_ROUTES[routePath];

            // If no route matches, use default landing
            if (!route) {
                route = { ...PAGE_ROUTES['/'], overlay: getDefaultLandingOverlay() };
            }

            // Dynamic route resolution for '/' (uses defaultLanding setting)
            if (route.dynamic) {
                route = { ...route, overlay: getDefaultLandingOverlay() };
            }

            // Safety: if going back to VIEW.PHASER without an overlay,
            // show default landing UNLESS it's an explicit scene route (e.g. /overworld)
            if (route.view === VIEW.PHASER && (!route.overlay || route.overlay === OVERLAY.NONE) && !route.launchScene) {
                route = { ...route, overlay: getDefaultLandingOverlay() };
            }

            suppressUrlSync.current = true;
            setActiveView(route.view);
            setActiveOverlay(route.overlay || OVERLAY.NONE);
            if (route.launchScene) {
                GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, route.launchScene);
            }
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
        const fullPath = toFullPath(path);
        if (window.location.pathname !== fullPath) {
            // Use pushState for overlay changes (so Back button works between overlays)
            // Use replaceState for same-view updates
            window.history.pushState({ path }, '', fullPath);
        }
    }, []);

    // Boot: sync initial URL → state (deep linking support)
    useEffect(() => {
        const routePath = toRoutePath(window.location.pathname);
        if (routePath !== '/' && PAGE_ROUTES[routePath]) {
            const route = PAGE_ROUTES[routePath];
            suppressUrlSync.current = true;
            setActiveView(route.view);
            setActiveOverlay(route.overlay || OVERLAY.NONE);
            // Deep-link scene launch (e.g. /overworld → start NewWorldScene)
            if (route.launchScene) {
                GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, route.launchScene);
            }
            requestAnimationFrame(() => { suppressUrlSync.current = false; });
        }
    }, []);

    // Bridge GameEventBus → URL sync
    useEffect(() => {
        const handleUIRoute = (viewKey) => {
            const routePath = VIEW_TO_PATH[viewKey] || '/';
            const fullPath = toFullPath(routePath);
            if (window.location.pathname !== fullPath) {
                window.history.replaceState({ path: routePath }, '', fullPath);
            }
        };

        const handleOverlayToggle = (overlayKey) => {
            const routePath = OVERLAY_TO_PATH[overlayKey] || '/';
            const fullPath = toFullPath(routePath);
            if (window.location.pathname !== fullPath) {
                window.history.replaceState({ path: routePath }, '', fullPath);
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
