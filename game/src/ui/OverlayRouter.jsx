/**
 * OverlayRouter.jsx — Lazy-loaded overlay registry
 *
 * Renders the active overlay based on the OVERLAY constant.
 * All overlays are lazy-loaded via React.lazy() for code-splitting,
 * reducing the initial bundle size.
 *
 * Extracted from App.jsx to keep routing logic separate from app bootstrap.
 */

import React, { Suspense, lazy } from 'react';
import { OverlayErrorBoundary } from './OverlayErrorBoundary.jsx';
import { OVERLAY } from '../constants/views.js';
import { WebAudioService } from '../managers/WebAudioService.js';

// ════════════════════════════════════════════════════════════
// Lazy Overlay Imports (code-split chunks)
// ════════════════════════════════════════════════════════════

const AdminDashboardModule = lazy(() => import('./AdminDashboard.jsx'));
// AdminFAB is also exported from AdminDashboard — we need a wrapper for lazy named exports
const LazyAdminFAB = lazy(() => import('./AdminDashboard.jsx').then(m => ({ default: m.AdminFAB })));
const SettingsOverlay = lazy(() => import('./SettingsOverlay.jsx'));
const InventoryDashboard = lazy(() => import('./InventoryDashboard.jsx'));
const ContentStudio = null; // DEPRECATED: superseded by MasterCMS - kept as null to avoid import breaks
const MasterCMS = lazy(() => import('./MasterCMS.jsx'));
const MarketDashboard = lazy(() => import('./MarketDashboard.jsx'));
const ArtworkDashboard = lazy(() => import('./ArtworkDashboard.jsx'));
const BloombergTerminal = lazy(() => import('./BloombergTerminal.jsx'));
const SalesGrid = lazy(() => import('./SalesGrid.jsx'));
const DiagnosticsOverlay = lazy(() => import('./DiagnosticsOverlay.jsx'));
const EmailDesignGuide = lazy(() => import('./email/EmailDesignGuide.jsx'));
const InboxShell = lazy(() => import('./email/inbox/InboxShell.jsx'));
const ArtnetLogin = lazy(() => import('./ArtnetLogin.jsx'));
const ArtnetMarketplace = lazy(() => import('./ArtnetMarketplace.jsx'));
const ArtnetUI = lazy(() => import('./ArtnetUI.jsx'));
const HaggleOverlay = lazy(() => import('./email/haggle/HaggleOverlay.jsx'));

// ════════════════════════════════════════════════════════════
// Loading Fallback
// ════════════════════════════════════════════════════════════

function OverlayLoadingFallback() {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(10, 10, 15, 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'SF Mono', Courier, monospace",
            color: '#c9a84c', fontSize: 13, letterSpacing: '0.15em',
        }}>
            LOADING ████████
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// Admin FAB (always visible unless Admin is open)
// ════════════════════════════════════════════════════════════



// ════════════════════════════════════════════════════════════
// OverlayRouter Component
// ════════════════════════════════════════════════════════════

export default function OverlayRouter({
    activeOverlay,
    setActiveOverlay,
    viewPayload,
    globalHaggleEmail,
    setGlobalHaggleEmail,
    gmailComposeData,
    setGmailComposeData,
}) {
    const closeOverlay = () => setActiveOverlay(OVERLAY.NONE);

    return (
        <Suspense fallback={<OverlayLoadingFallback />}>
            {/* ── Admin: FAB or Full Panel ── */}
            {activeOverlay === OVERLAY.ADMIN ? (
                <OverlayErrorBoundary name="Admin Dashboard" onClose={closeOverlay}>
                    <AdminDashboardModule onClose={closeOverlay} />
                </OverlayErrorBoundary>
            ) : (
                <LazyAdminFAB onClick={() => { setActiveOverlay(OVERLAY.ADMIN); WebAudioService.select(); }} />
            )}

            {/* ── Settings ── */}
            {activeOverlay === OVERLAY.SETTINGS && (
                <OverlayErrorBoundary name="Settings" onClose={closeOverlay}>
                    <SettingsOverlay onClose={closeOverlay} />
                </OverlayErrorBoundary>
            )}

            {/* ── Inventory ── */}
            {activeOverlay === OVERLAY.INVENTORY && (
                <OverlayErrorBoundary name="Inventory" onClose={closeOverlay}>
                    <InventoryDashboard onClose={closeOverlay} />
                </OverlayErrorBoundary>
            )}

            {/* ── Master CMS (also handles legacy /cms route) ── */}
            {activeOverlay === OVERLAY.MASTER_CMS && (
                <OverlayErrorBoundary name="Master CMS" onClose={closeOverlay}>
                    <MasterCMS onClose={closeOverlay} />
                </OverlayErrorBoundary>
            )}

            {/* ── Market Data Dashboard ── */}
            {activeOverlay === OVERLAY.MARKET_DASHBOARD && (
                <OverlayErrorBoundary name="Market Dashboard" onClose={closeOverlay}>
                    <MarketDashboard onClose={closeOverlay} />
                </OverlayErrorBoundary>
            )}

            {/* ── Artwork Detail Dashboard ── */}
            {activeOverlay === OVERLAY.ARTWORK_DASHBOARD && (
                <OverlayErrorBoundary name="Artwork Dashboard" onClose={closeOverlay}>
                    <ArtworkDashboard onClose={closeOverlay} payload={viewPayload} />
                </OverlayErrorBoundary>
            )}

            {/* ── Bloomberg Market Terminal ── */}
            {activeOverlay === OVERLAY.BLOOMBERG && (
                <OverlayErrorBoundary name="Bloomberg Terminal" onClose={closeOverlay}>
                    <BloombergTerminal onClose={closeOverlay} />
                </OverlayErrorBoundary>
            )}

            {/* ── Gallery Sales Grid ── */}
            {activeOverlay === OVERLAY.SALES_GRID && (
                <OverlayErrorBoundary name="Sales Grid" onClose={closeOverlay}>
                    <SalesGrid onClose={closeOverlay} />
                </OverlayErrorBoundary>
            )}

            {/* ── Debug/Diagnostics Log ── */}
            {activeOverlay === OVERLAY.DEBUG_LOG && (
                <OverlayErrorBoundary name="Debug Log" onClose={closeOverlay}>
                    <DiagnosticsOverlay onClose={closeOverlay} />
                </OverlayErrorBoundary>
            )}

            {/* ── Email Design Guide ── */}
            {activeOverlay === OVERLAY.DESIGN_GUIDE && (
                <OverlayErrorBoundary name="Email Design Guide" onClose={closeOverlay}>
                    <EmailDesignGuide onClose={closeOverlay} />
                </OverlayErrorBoundary>
            )}

            {/* ── Gmail Inbox ── */}
            {activeOverlay === OVERLAY.GMAIL_GUIDE && (
                <OverlayErrorBoundary name="Gmail Inbox" onClose={() => { closeOverlay(); setGmailComposeData(null); }}>
                    <InboxShell
                        onClose={() => { closeOverlay(); setGmailComposeData(null); }}
                        initialCompose={gmailComposeData}
                    />
                </OverlayErrorBoundary>
            )}

            {/* ── Artnet Login ── */}
            {activeOverlay === OVERLAY.ARTNET_LOGIN && (
                <OverlayErrorBoundary name="Artnet Login" onClose={closeOverlay}>
                    <ArtnetLogin onClose={closeOverlay} />
                </OverlayErrorBoundary>
            )}

            {/* ── Artnet Marketplace ── */}
            {activeOverlay === OVERLAY.ARTNET_MARKETPLACE && (
                <OverlayErrorBoundary name="Artnet Marketplace" onClose={closeOverlay}>
                    <ArtnetMarketplace onClose={closeOverlay} />
                </OverlayErrorBoundary>
            )}

            {/* ── Artnet UI ── */}
            {activeOverlay === OVERLAY.ARTNET_UI && (
                <OverlayErrorBoundary name="Artnet UI" onClose={closeOverlay}>
                    <ArtnetUI onClose={closeOverlay} />
                </OverlayErrorBoundary>
            )}

            {/* ── Global Haggle (any context) ── */}
            {globalHaggleEmail && (
                <OverlayErrorBoundary name="Haggle" onClose={() => setGlobalHaggleEmail(null)}>
                    <HaggleOverlay
                        mode="haggle"
                        haggleInfo={globalHaggleEmail}
                        onComplete={() => setGlobalHaggleEmail(null)}
                    />
                </OverlayErrorBoundary>
            )}
        </Suspense>
    );
}
