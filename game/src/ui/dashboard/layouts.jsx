/**
 * layouts.jsx — Reusable layout wrappers for dashboard view styles
 *
 * SharedPanelGrid, ArtnetLayout, TearsheetLayout
 */

import React from 'react';
import { GameState } from '../../managers/GameState.js';
import {
    TickerBar, ArtistLeaderboard, PriceChart, TradeFeed, Watchlist,
    PortfolioTracker, PlayerStatsPanel, NetWorthPanel, NPCDirectoryPanel,
    TransactionHistoryPanel,
} from './panels.jsx';

// ══════════════════════════════════════════════════════════════
// 0. SharedPanelGrid — Reusable 2-column panel layout
//
// Drops into any view style (tearsheet, artnet, sothebys, deitch, byform).
// Accepts a CSS prefix for class names and renders all standard panels
// based on showPanel() visibility gating.
// ══════════════════════════════════════════════════════════════
function SharedPanelGrid({ showPanel, intel, feed, selectedArtist, onSelectArtist, onSelectTrade, onListWork, onSelectWork, prefix }) {
    return (
        <div className={`${prefix}-panels ${prefix}-panels-grid`}>
            <div className={`${prefix}-panels-col`}>
                {showPanel('playerstats') && <PlayerStatsPanel />}
                {showPanel('networth') && <NetWorthPanel intel={intel} />}
                {showPanel('directory') && <NPCDirectoryPanel intel={intel} />}
                {showPanel('leaderboard') && feed && (
                    <ArtistLeaderboard
                        leaderboard={feed.leaderboard}
                        liveSparklines={feed.liveSparklines}
                        intel={intel}
                        selectedArtist={selectedArtist}
                        onSelect={onSelectArtist}
                    />
                )}
                {showPanel('tradefeed') && <TradeFeed intel={intel} onSelectTrade={onSelectTrade} />}
                {showPanel('watchlist') && <Watchlist intel={intel} />}
            </div>
            <div className={`${prefix}-panels-col`}>
                {showPanel('pricechart') && feed && (
                    <PriceChart
                        artistId={selectedArtist}
                        priceHistory={feed.priceHistory}
                        liveSparklines={feed.liveSparklines}
                        intel={intel}
                    />
                )}
                {showPanel('txhistory') && <TransactionHistoryPanel intel={intel} />}
                {showPanel('portfolio') && (
                    <PortfolioTracker intel={intel} onListWork={onListWork} onSelectWork={onSelectWork} />
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 0B. ArtnetLayout — Reusable wrapper for Artnet-styled pages
//
// Slots: title, subtitle, search, statsBar, mainContent, panelProps, footerText
// Renders: an-view > an-header-bar > optional search > mainContent > SharedPanelGrid > an-footer
// ══════════════════════════════════════════════════════════════
function ArtnetLayout({ title, subtitle, search, statsBar, mainContent, panelProps, footerText, children }) {
    return (
        <div className="an-view">
            {/* Red header bar */}
            <div className="an-header-bar">
                <div className="an-header-left">
                    <span className="an-logo">artlife</span>
                    {title && <span className="an-header-title">{title}</span>}
                </div>
                {subtitle && <span className="an-header-subtitle">{subtitle}</span>}
            </div>

            {/* Optional search bar */}
            {search && <div className="an-search-bar">{search}</div>}

            {/* Optional stats bar */}
            {statsBar && <div className="an-stats-bar">{statsBar}</div>}

            {/* Main content area */}
            {mainContent || children}

            {/* Panel grid */}
            {panelProps && <SharedPanelGrid prefix="an" {...panelProps} />}

            {/* Footer */}
            <div className="an-footer">
                <span>artlife.game</span>
                <span>{footerText || 'All prices in USD. Estimates are approximate.'}</span>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 0C. TearsheetLayout — Reusable wrapper for Gagosian-styled pages
//
// Slots: coverTitle, coverSubtitle, contextContent, introContent,
//        pages (array of JSX), panelProps, backContent
// Renders: ts-view > cover page > context > intro > pages[] > SharedPanelGrid > back page
// ══════════════════════════════════════════════════════════════
function TearsheetLayout({ coverTitle, coverSubtitle, contextContent, introContent, pages, panelProps, backContent, children }) {
    const s = GameState.state;
    const city = s?.currentCity || 'New York';

    return (
        <div className="ts-view">
            {/* Cover page */}
            <div className="ts-page ts-cover-page">
                <div className="ts-cover-content">
                    <div className="ts-cover-gallery">A R T L I F E</div>
                    {coverTitle && <div className="ts-cover-title">{coverTitle}</div>}
                    {coverSubtitle && <div className="ts-cover-subtitle">{coverSubtitle}</div>}
                </div>
            </div>

            {/* Context page */}
            {contextContent && (
                <div className="ts-page ts-context-page">
                    {contextContent}
                </div>
            )}

            {/* Intro page */}
            {introContent && (
                <div className="ts-page">
                    {introContent}
                </div>
            )}

            {/* Dynamic pages */}
            {pages && pages.map((page, i) => (
                <React.Fragment key={i}>{page}</React.Fragment>
            ))}

            {/* Children fallback */}
            {children}

            {/* Panel grid */}
            {panelProps && <SharedPanelGrid prefix="ts" {...panelProps} />}

            {/* Back page */}
            <div className="ts-page ts-back-page">
                <div className="ts-back-content">
                    {backContent || (
                        <>
                            <div className="ts-back-brand">A R T L I F E</div>
                            <div className="ts-back-locations">
                                New York &middot; London &middot; Basel &middot; Hong Kong &middot; Los Angeles
                            </div>
                            <div className="ts-back-contact">
                                <div>980 Madison Avenue, {city}</div>
                                <div>artlife.game</div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export { SharedPanelGrid, ArtnetLayout, TearsheetLayout };
