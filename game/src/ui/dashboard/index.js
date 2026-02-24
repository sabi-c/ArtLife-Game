/**
 * dashboard/index.js — Barrel re-exports for dashboard sub-modules
 *
 * Single import point for all dashboard components:
 *   import { TickerBar, GalleryView, ... } from './dashboard';
 */

export { mask, maskPrice, fmtNum, tearsheetPrice, MiniSparkline, getAP, hasAP, useAP, useAPAndCheckEvents, resolveImageUrl, ROLE_COLORS, MAX_ACTIONS } from './dashboardUtils.jsx';

export { TickerBar, ArtistLeaderboard, OrderBook, MarketOverview, PriceChart, TradeFeed, Watchlist, PortfolioTracker, NotificationBar, ArtworkTearsheet, PlayerStatsPanel, NetWorthPanel, NPCDirectoryPanel, CollectionPanel, TransactionHistoryPanel } from './panels.jsx';

export { SharedPanelGrid, ArtnetLayout, TearsheetLayout } from './layouts.jsx';

export { GalleryView, TearsheetView, ArtnetView, SothebysView, DeitchView, ByformView, WaterworksView, PanelConfigDropdown } from './views.jsx';

export { StyleGuideView, EventOverlay } from './modals.jsx';
