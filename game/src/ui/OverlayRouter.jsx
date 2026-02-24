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
import { ErrorBoundary } from './ErrorBoundary.jsx';
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
const ContentStudio = lazy(() => import('./ContentStudio.jsx'));
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
                <ErrorBoundary>
                    <AdminDashboardModule onClose={closeOverlay} />
                </ErrorBoundary>
            ) : (
                <LazyAdminFAB onClick={() => { setActiveOverlay(OVERLAY.ADMIN); WebAudioService.select(); }} />
            )}

            {/* ── Settings ── */}
            {activeOverlay === OVERLAY.SETTINGS && (
                <SettingsOverlay onClose={closeOverlay} />
            )}

            {/* ── Inventory ── */}
            {activeOverlay === OVERLAY.INVENTORY && (
                <InventoryDashboard onClose={closeOverlay} />
            )}

            {/* ── CMS (ContentStudio) ── */}
            {activeOverlay === OVERLAY.CMS && (
                <ErrorBoundary>
                    <ContentStudio onClose={closeOverlay} />
                </ErrorBoundary>
            )}

            {/* ── Master CMS ── */}
            {activeOverlay === OVERLAY.MASTER_CMS && (
                <ErrorBoundary>
                    <MasterCMS onClose={closeOverlay} />
                </ErrorBoundary>
            )}

            {/* ── Market Data Dashboard ── */}
            {activeOverlay === OVERLAY.MARKET_DASHBOARD && (
                <MarketDashboard onClose={closeOverlay} />
            )}

            {/* ── Artwork Detail Dashboard ── */}
            {activeOverlay === OVERLAY.ARTWORK_DASHBOARD && (
                <ErrorBoundary>
                    <ArtworkDashboard onClose={closeOverlay} payload={viewPayload} />
                </ErrorBoundary>
            )}

            {/* ── Bloomberg Market Terminal ── */}
            {activeOverlay === OVERLAY.BLOOMBERG && (
                <ErrorBoundary>
                    <BloombergTerminal onClose={closeOverlay} />
                </ErrorBoundary>
            )}

            {/* ── Gallery Sales Grid ── */}
            {activeOverlay === OVERLAY.SALES_GRID && (
                <ErrorBoundary>
                    <SalesGrid onClose={closeOverlay} />
                </ErrorBoundary>
            )}

            {/* ── Debug/Diagnostics Log ── */}
            {activeOverlay === OVERLAY.DEBUG_LOG && (
                <DiagnosticsOverlay onClose={closeOverlay} />
            )}

            {/* ── Email Design Guide ── */}
            {activeOverlay === OVERLAY.DESIGN_GUIDE && (
                <EmailDesignGuide onClose={closeOverlay} />
            )}

            {/* ── Gmail Inbox ── */}
            {activeOverlay === OVERLAY.GMAIL_GUIDE && (
                <InboxShell
                    onClose={() => { closeOverlay(); setGmailComposeData(null); }}
                    initialCompose={gmailComposeData}
                />
            )}

            {/* ── Artnet Login ── */}
            {activeOverlay === OVERLAY.ARTNET_LOGIN && (
                <ArtnetLogin onClose={closeOverlay} />
            )}

            {/* ── Artnet Marketplace ── */}
            {activeOverlay === OVERLAY.ARTNET_MARKETPLACE && (
                <ArtnetMarketplace onClose={closeOverlay} />
            )}

            {/* ── Artnet UI ── */}
            {activeOverlay === OVERLAY.ARTNET_UI && (
                <ArtnetUI onClose={closeOverlay} />
            )}

            {/* ── Global Haggle (any context) ── */}
            {globalHaggleEmail && (
                <HaggleOverlay
                    mode="haggle"
                    haggleInfo={globalHaggleEmail}
                    onComplete={() => setGlobalHaggleEmail(null)}
                />
            )}
        </Suspense>
    );
}
