/**
 * BloombergTerminal.jsx — Multi-Style Art Market Trading Terminal
 *
 * ARCHITECTURE CONTEXT (for other agents):
 * ┌──────────────────────────────────────────────────────────┐
 * │  BloombergTerminal (THIS FILE)                           │
 * │  └─ 6 VIEW STYLES, switched via SettingsManager:         │
 * │     • bloomberg (dark) — default terminal panels          │
 * │     • gallery   — Seventh House staggered grid (cream)    │
 * │     • tearsheet — Gagosian paginated catalogue (white)    │
 * │     • artnet    — Price database tabular (white+red)      │
 * │     • sothebys  — Luxury catalogue (serif, centered)      │
 * │     • deitch    — Underground gallery (raw, bold)          │
 * │  └─ CSS PREFIXES: bb- (bloomberg), sh- (seventh house),   │
 * │     ts- (tearsheet), an- (artnet), sb- (sotheby's),       │
 * │     dt- (deitch)                                          │
 * │  └─ PANEL SYSTEM: showPanel(name) + PanelConfigDropdown   │
 * │     Panels: overview, leaderboard, orderbook, pricechart, │
 * │     tradefeed, watchlist, portfolio, playerstats,          │
 * │     collection, txhistory, networth, directory             │
 * │  └─ DATA FLOW:                                            │
 * │     MarketManager → prices, heat, composite index         │
 * │     MarketSimulator → trade log, open orders, events      │
 * │     GameState → portfolio, cash, stats, transactions       │
 * │     useMarketStore → sparklines, price history             │
 * │     ARTWORKS/CONTACTS → static data enrichment             │
 * │  └─ INTEL GATING: player intel stat gates data visibility  │
 * │     (prices at 40, exhibitions at 50, literature at 70)    │
 * └──────────────────────────────────────────────────────────┘
 *
 * Components (54 total):
 *   1-9: Shared panels (TickerBar, Leaderboard, OrderBook, etc.)
 *  10: ArtworkTearsheet modal (Gagosian detail popup)
 *  11-14: Player panels (Stats, NetWorth, Collection, TxHistory)
 *  14B: GalleryView (Seventh House staggered grid)
 *  15: TearsheetView (Gagosian paginated catalogue)
 *  15B: ArtistDetailCard (inline artist bio)
 *  16: ArtnetView (price database table)
 *  17: SothebysView (luxury catalogue)
 *  18: DeitchView (underground gallery)
 *  19: PanelConfigDropdown (show/hide panels)
 *  Main: BloombergTerminal (router + style switcher)
 *
 * Uses TerminalAPI.bloomberg namespace for all trading actions.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useBloombergFeed } from '../hooks/useBloombergFeed.js';
import { GameState } from '../managers/GameState.js';
import { MarketManager } from '../managers/MarketManager.js';
import { MarketSimulator } from '../managers/MarketSimulator.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { CONTACTS } from '../data/contacts.js';
import { ARTWORKS } from '../data/artworks.js';
import { VIEW, OVERLAY } from '../constants/views.js';
import { TerminalAPI } from '../terminal/TerminalAPI.js';
import { SettingsManager } from '../managers/SettingsManager.js';
import { useCmsStore } from '../stores/cmsStore.js';
import { useNPCStore } from '../stores/npcStore.js';
import { CITY_DATA } from '../data/cities.js';
import { WORLD_LOCATIONS } from '../data/world_locations.js';
import BloombergTutorial from './BloombergTutorial.jsx';
import './BloombergTerminal.css';

// ── Intel-gated data masking ──
function mask(value, intel, threshold, fallback = '???') {
    return intel >= threshold ? value : fallback;
}

function maskPrice(price, intel) {
    const p = Number(price) || 0;
    if (intel >= 40) return `$${p.toLocaleString()}`;
    if (intel >= 20) return `$${(Math.round(p / 10000) * 10000).toLocaleString()}`;
    return '$???';
}

/** Safe number formatting — prevents toLocaleString crashes on undefined/NaN */
function fmtNum(val) { return (Number(val) || 0).toLocaleString(); }

/** Format price with full decimals for tearsheet (Seventh House style) */
function tearsheetPrice(price) {
    return `$ ${(Number(price) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Mini Sparkline SVG ──
function MiniSparkline({ data, width = 60, height = 20, color = '#00e5ff' }) {
    if (!data || data.length < 2) return <span className="bb-no-data">--</span>;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) =>
        `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
    ).join(' ');
    return (
        <svg width={width} height={height} className="bb-sparkline-svg">
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
    );
}

// ── AP helpers (imported logic from dashboard.js pattern) ──
const MAX_ACTIONS = 4;
function getAP() { return MAX_ACTIONS - (GameState.state?.actionsThisWeek || 0); }
function hasAP(cost = 1) { return getAP() >= cost; }
function useAP(label, cost = 1) {
    if (!GameState.state) return false;
    GameState.state.actionsThisWeek = (GameState.state.actionsThisWeek || 0) + cost;
    GameState.addNews(`⏱️ ${label} (${getAP()} AP left)`);
    return true;
}

// ══════════════════════════════════════════════════════════════
// 1. Ticker Bar
// ══════════════════════════════════════════════════════════════
function TickerBar({ intel }) {
    const s = GameState.state;
    const trades = MarketSimulator.getTradeLog().slice(-5);
    const news = (s?.newsFeed || []).slice(-5).reverse();
    const sellOrders = MarketSimulator.getOpenSellOrders().slice(-3);

    const items = [];
    // New listings — prioritized
    sellOrders.forEach(o => {
        items.push(`NEW: "${o.title}" listed at ${maskPrice(o.askPrice, intel)}`);
    });
    // Recent trades — interleaved with FILLED labels for player trades
    trades.forEach(t => {
        const buyer = CONTACTS.find(c => c.id === t.buyer);
        const artwork = ARTWORKS.find(a => a.id === t.artwork);
        const name = intel >= 60 ? (buyer?.name || t.buyer) : 'Unknown';
        const title = artwork?.title || t.artwork;
        const isPlayerTrade = t.buyer === 'player' || t.seller === 'player';
        const prefix = isPlayerTrade ? 'FILLED: ' : '';
        items.push(`${prefix}${name} acquired "${title}" — ${maskPrice(t.price, intel)}`);
    });
    // News
    news.forEach(n => {
        const text = typeof n === 'string' ? n : n.text;
        if (text) items.push(text);
    });
    if (items.length === 0) items.push('Market data loading...');

    return (
        <div className="bb-ticker">
            <div className="bb-ticker-track">
                {items.map((item, i) => (
                    <span key={i} className="bb-ticker-item">▸ {item}</span>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 2. Artist Leaderboard
// ══════════════════════════════════════════════════════════════
function ArtistLeaderboard({ leaderboard, liveSparklines, intel, selectedArtist, onSelect }) {
    return (
        <div className="bb-panel bb-leaderboard">
            <div className="bb-panel-header">ARTIST INDEX</div>
            <div className="bb-leaderboard-list">
                {leaderboard.slice(0, 10).map((artist, i) => {
                    const heatPct = Math.min(100, Math.max(0, artist.heat));
                    const trend = artist.trend === 'up' ? '▲' : artist.trend === 'down' ? '▼' : '—';
                    const trendClass = artist.trend === 'up' ? 'up' : artist.trend === 'down' ? 'down' : '';
                    const sparkData = liveSparklines[artist.id] || [];
                    const isSelected = selectedArtist === artist.id;
                    return (
                        <div key={artist.id} className={`bb-lb-row${isSelected ? ' selected' : ''}`}
                            onClick={() => onSelect(artist.id)}>
                            <span className="bb-lb-rank">{i + 1}.</span>
                            <span className="bb-lb-name">{mask(artist.name, intel, 20)}</span>
                            <div className="bb-lb-heat-bar">
                                <div className="bb-lb-heat-fill" style={{ width: `${heatPct}%` }} />
                            </div>
                            <MiniSparkline data={sparkData} width={40} height={14} />
                            <span className={`bb-lb-index ${trendClass}`}>
                                {mask(artist.artistIndex || 500, intel, 20)} {trend}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 3. Order Book (NEW — interactive trading panel)
// ══════════════════════════════════════════════════════════════
function OrderBook({ intel, onSelectOrder }) {
    const [tab, setTab] = useState('sell');
    const sellOrders = MarketSimulator.getOpenSellOrders();
    const buyOrders = MarketSimulator.getOpenBuyOrders();
    const week = GameState.state?.week || 1;

    return (
        <div className="bb-panel bb-orderbook">
            <div className="bb-panel-header">
                ORDER BOOK
                <span className="bb-ob-count">{sellOrders.length}S / {buyOrders.length}B</span>
            </div>
            <div className="bb-ob-tabs">
                <button className={`bb-ob-tab${tab === 'sell' ? ' active' : ''}`}
                    onClick={() => setTab('sell')}>SELL LISTINGS</button>
                <button className={`bb-ob-tab${tab === 'buy' ? ' active' : ''}`}
                    onClick={() => setTab('buy')}>BUY ORDERS</button>
            </div>
            <div className="bb-ob-list">
                {tab === 'sell' && sellOrders.length === 0 && (
                    <div className="bb-ob-empty">No sell listings available</div>
                )}
                {tab === 'sell' && sellOrders.map(order => (
                    <div key={order.id} className="bb-ob-row bb-ob-sell"
                        onClick={() => onSelectOrder(order)}>
                        <span className="bb-ob-title">"{order.title}"</span>
                        <span className="bb-ob-artist">{mask(order.artist, intel, 20)}</span>
                        <span className="bb-ob-price">{maskPrice(order.askPrice, intel)}</span>
                        <span className={`bb-ob-urgency ${order.urgency}`}>
                            {order.urgency === 'high' ? 'URG' : ''}
                        </span>
                        <span className="bb-ob-expires">
                            {order.expiresWeek - week}w
                        </span>
                    </div>
                ))}
                {tab === 'buy' && buyOrders.length === 0 && (
                    <div className="bb-ob-empty">No buy orders available</div>
                )}
                {tab === 'buy' && buyOrders.map(order => (
                    <div key={order.id} className="bb-ob-row bb-ob-buy">
                        <span className="bb-ob-title">
                            {mask(order.npcName, intel, 60, 'Collector')} wants:
                        </span>
                        <span className="bb-ob-genres">
                            {order.preferredGenres?.slice(0, 2).join(', ') || 'Any'}
                        </span>
                        <span className="bb-ob-price">
                            Budget: {maskPrice(order.budget, intel)}
                        </span>
                        <span className="bb-ob-expires">
                            {order.expiresWeek - week}w
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 4. Market Overview
// ══════════════════════════════════════════════════════════════
function MarketOverview({ compositeIndex, cycle, intel, compositeHistory = [], sectorHistory = {}, eventLog = [] }) {
    const s = GameState.state;
    const report = MarketSimulator.getWeeklyReport();
    const onMarket = MarketManager.works?.filter(w => w.onMarket).length || 0;
    const tradeCount = report?.tradesExecuted || 0;
    const volume = report?.totalVolume || 0;

    // Composite sparkline data (last 52 weeks for compact display)
    const compositeData = compositeHistory.slice(-52).map(h => h.composite);
    const compChange = compositeData.length >= 2
        ? ((compositeData[compositeData.length - 1] - compositeData[0]) / compositeData[0] * 100).toFixed(1)
        : 0;

    // Recent events (last 5)
    const recentEvents = (eventLog || []).slice(-5).reverse();

    return (
        <div className="bb-panel bb-overview">
            <div className="bb-panel-header">MARKET OVERVIEW</div>
            <div className="bb-overview-grid">
                <div className="bb-ov-item">
                    <span className="bb-ov-label">Composite</span>
                    <span className="bb-ov-value">{mask(compositeIndex, intel, 20)}</span>
                </div>
                <div className="bb-ov-item">
                    <span className="bb-ov-label">Cycle</span>
                    <span className="bb-ov-value" style={{ color: cycle.color }}>
                        {cycle.state.toUpperCase()}
                    </span>
                </div>
                <div className="bb-ov-item">
                    <span className="bb-ov-label">Volume</span>
                    <span className="bb-ov-value">{mask(`$${fmtNum(volume)}`, intel, 40)}</span>
                </div>
                <div className="bb-ov-item">
                    <span className="bb-ov-label">Active Works</span>
                    <span className="bb-ov-value">{onMarket}</span>
                </div>
                <div className="bb-ov-item">
                    <span className="bb-ov-label">Trades/wk</span>
                    <span className="bb-ov-value">{mask(tradeCount, intel, 40)}</span>
                </div>
                <div className="bb-ov-item">
                    <span className="bb-ov-label">Week</span>
                    <span className="bb-ov-value">{s?.week || 1}</span>
                </div>
            </div>

            {/* Composite Index Sparkline */}
            {compositeData.length > 2 && (
                <div className="bb-ov-composite">
                    <div className="bb-ov-comp-header">
                        <span>52-WEEK INDEX</span>
                        <span className={`bb-ov-comp-delta ${compChange > 0 ? 'up' : compChange < 0 ? 'down' : ''}`}>
                            {compChange > 0 ? '+' : ''}{compChange}%
                        </span>
                    </div>
                    <MiniSparkline data={compositeData} width={260} height={32} color={compChange >= 0 ? '#4caf50' : '#c94040'} />
                </div>
            )}

            {/* Sector Performance */}
            {Object.keys(sectorHistory).length > 0 && intel >= 40 && (
                <div className="bb-ov-sectors">
                    {Object.entries(sectorHistory).slice(0, 4).map(([tier, history]) => {
                        const data = history.slice(-26);
                        if (data.length < 2) return null;
                        const change = ((data[data.length - 1].index - data[0].index) / data[0].index * 100).toFixed(1);
                        return (
                            <div key={tier} className="bb-ov-sector-row">
                                <span className="bb-ov-sector-label">{tier.toUpperCase()}</span>
                                <MiniSparkline data={data.map(d => d.index)} width={60} height={14} color={change >= 0 ? '#4caf50' : '#c94040'} />
                                <span className={`bb-ov-sector-delta ${change >= 0 ? 'up' : 'down'}`}>
                                    {change > 0 ? '+' : ''}{change}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Recent Events */}
            {recentEvents.length > 0 && intel >= 30 && (
                <div className="bb-ov-events">
                    <div className="bb-panel-header" style={{ fontSize: 9, marginTop: 6 }}>RECENT EVENTS</div>
                    {recentEvents.slice(0, 3).map((evt, i) => (
                        <div key={i} className="bb-ov-event-row">
                            <span className="bb-ov-event-week">W{evt.week}</span>
                            <span className="bb-ov-event-desc">{evt.description}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 5. Price Chart
// ══════════════════════════════════════════════════════════════
function PriceChart({ artistId, priceHistory, liveSparklines, intel }) {
    const history = priceHistory[artistId] || [];
    const liveData = liveSparklines[artistId] || [];
    const artist = MarketManager.artists?.find(a => a.id === artistId);
    const artistName = artist?.name || artistId;
    const weeklyPrices = history.map(h => h.avgPrice);
    const allData = [...weeklyPrices, ...liveData];

    if (allData.length < 2) {
        return (
            <div className="bb-panel bb-chart">
                <div className="bb-panel-header">PRICE CHART — {mask(artistName, intel, 20)}</div>
                <div className="bb-chart-empty">Select an artist to view price history</div>
            </div>
        );
    }

    const min = Math.min(...allData);
    const max = Math.max(...allData);
    const range = max - min || 1;
    const latest = allData[allData.length - 1];
    const prev = allData.length >= 2 ? allData[allData.length - 2] : latest;
    const delta = prev > 0 ? ((latest - prev) / prev * 100).toFixed(1) : 0;
    const deltaClass = delta > 0 ? 'up' : delta < 0 ? 'down' : '';
    const w = 280, h = 80;
    const weeklyPoints = weeklyPrices.map((v, i) =>
        `${(i / Math.max(1, allData.length - 1)) * w},${h - ((v - min) / range) * h}`
    ).join(' ');
    const livePoints = liveData.map((v, i) =>
        `${((weeklyPrices.length + i) / Math.max(1, allData.length - 1)) * w},${h - ((v - min) / range) * h}`
    ).join(' ');

    return (
        <div className="bb-panel bb-chart">
            <div className="bb-panel-header">PRICE CHART — {mask(artistName, intel, 20)}</div>
            <div className="bb-chart-price">
                <span className="bb-chart-current">{maskPrice(latest, intel)}</span>
                <span className={`bb-chart-delta ${deltaClass}`}>{delta > 0 ? '+' : ''}{delta}%</span>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="bb-chart-svg">
                <line x1="0" y1={0} x2={w} y2={0} stroke="rgba(0,229,255,0.1)" strokeDasharray="4" />
                <line x1="0" y1={h} x2={w} y2={h} stroke="rgba(201,64,64,0.1)" strokeDasharray="4" />
                {weeklyPoints && <polyline points={weeklyPoints} fill="none" stroke="#00e5ff" strokeWidth="1.5" />}
                {livePoints && <polyline points={livePoints} fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeDasharray="3" />}
            </svg>
            <div className="bb-chart-labels">
                <span>H: {maskPrice(max, intel)}</span>
                <span>L: {maskPrice(min, intel)}</span>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 6. Trade Feed
// ══════════════════════════════════════════════════════════════
function TradeFeed({ intel, onSelectTrade }) {
    const trades = MarketSimulator.getTradeLog().slice(-15).reverse();
    return (
        <div className="bb-panel bb-trades">
            <div className="bb-panel-header">TRADE FEED</div>
            <div className="bb-trades-list">
                {trades.length === 0 && <div className="bb-trades-empty">No trades yet</div>}
                {trades.slice(0, 8).map((t, i) => {
                    const buyer = CONTACTS.find(c => c.id === t.buyer);
                    const seller = CONTACTS.find(c => c.id === t.seller);
                    const artwork = ARTWORKS.find(a => a.id === t.artwork);
                    const buyerName = intel >= 60 ? (buyer?.name?.split(' ')[0] || t.buyer) : '???';
                    const sellerName = intel >= 60 ? (seller?.name?.split(' ')[0] || t.seller) : '???';
                    return (
                        <div key={i} className="bb-trade-row"
                            onClick={() => artwork && onSelectTrade(artwork)}
                            style={{ cursor: artwork ? 'pointer' : 'default' }}>
                            <span className="bb-trade-week">W{t.week}</span>
                            <span className="bb-trade-parties">{buyerName} ← {sellerName}</span>
                            <span className="bb-trade-title">"{artwork?.title || t.artwork}"</span>
                            <span className="bb-trade-price">{maskPrice(t.price, intel)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 7. Watchlist
// ══════════════════════════════════════════════════════════════
function Watchlist({ intel }) {
    const s = GameState.state;
    const watchlist = s?.watchlist || [];

    if (intel < 60) {
        return (
            <div className="bb-panel bb-watchlist">
                <div className="bb-panel-header">WATCHLIST</div>
                <div className="bb-locked">Requires intel 60+ to unlock watchlist alerts</div>
            </div>
        );
    }

    return (
        <div className="bb-panel bb-watchlist">
            <div className="bb-panel-header">WATCHLIST</div>
            {watchlist.length === 0 && (
                <div className="bb-watchlist-empty">No items watched. Star artists or artworks from the market terminal.</div>
            )}
            {watchlist.map((item, i) => {
                if (item.type === 'artist') {
                    const artist = MarketManager.artists?.find(a => a.id === item.id);
                    const works = MarketManager.works?.filter(w => w.artistId === item.id && w.onMarket) || [];
                    const avgPrice = works.length > 0
                        ? Math.round(works.reduce((sum, w) => sum + w.price, 0) / works.length) : 0;
                    return (
                        <div key={i} className="bb-watch-row">
                            <span className="bb-watch-star">★</span>
                            <span className="bb-watch-name">{artist?.name || item.id}</span>
                            <span className="bb-watch-price">{maskPrice(avgPrice, intel)}</span>
                            <span className={`bb-watch-trend ${artist?.heat > 60 ? 'up' : artist?.heat < 30 ? 'down' : ''}`}>
                                {artist?.heat > 60 ? '▲' : artist?.heat < 30 ? '▼' : '—'}
                            </span>
                        </div>
                    );
                } else {
                    const work = ARTWORKS.find(a => a.id === item.id);
                    let price = 0;
                    try { price = MarketManager.calculatePrice(work, false); } catch { price = work?.askingPrice || 0; }
                    const delta = item.addedPrice ? ((price - item.addedPrice) / item.addedPrice * 100).toFixed(1) : 0;
                    return (
                        <div key={i} className="bb-watch-row">
                            <span className="bb-watch-star">★</span>
                            <span className="bb-watch-name">"{work?.title || item.id}"</span>
                            <span className="bb-watch-price">{maskPrice(price, intel)}</span>
                            <span className={`bb-watch-trend ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
                                {delta > 0 ? '+' : ''}{delta}%
                            </span>
                        </div>
                    );
                }
            })}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 8. Portfolio Tracker (with LIST button for selling)
// ══════════════════════════════════════════════════════════════
function PortfolioTracker({ intel, onListWork, onSelectWork }) {
    const s = GameState.state;
    const portfolio = s?.portfolio || [];
    const listings = s?.bloombergListings || [];
    const transactions = s?.transactions || [];

    const items = portfolio.map(work => {
        let currentVal = 0;
        try { currentVal = MarketManager.calculatePrice(work, false); }
        catch { currentVal = work.price || work.basePrice || 0; }
        const purchasePrice = work.purchasePrice || work.basePrice || currentVal;
        const roi = purchasePrice > 0 ? ((currentVal - purchasePrice) / purchasePrice * 100).toFixed(1) : 0;
        const unrealizedPL = currentVal - purchasePrice;
        return { ...work, currentVal, roi, purchasePrice, unrealizedPL };
    });

    // Sold works (actualized returns)
    const soldWorks = transactions
        .filter(t => t.type === 'sell' || t.soldTo)
        .map(t => {
            const costBasis = t.purchasePrice || t.basePrice || 0;
            const salePrice = t.price || t.salePrice || 0;
            const realizedPL = salePrice - costBasis;
            const realizedROI = costBasis > 0 ? ((salePrice - costBasis) / costBasis * 100).toFixed(1) : 0;
            return { ...t, costBasis, salePrice, realizedPL, realizedROI };
        })
        .slice(-5); // Last 5 sales

    const totalValue = items.reduce((sum, w) => sum + w.currentVal, 0);
    const totalCost = items.reduce((sum, w) => sum + w.purchasePrice, 0);
    const totalROI = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100).toFixed(1) : 0;
    const totalUnrealizedPL = totalValue - totalCost;

    return (
        <div className="bb-panel bb-portfolio">
            <div className="bb-panel-header">
                PORTFOLIO
                <span className="bb-portfolio-total">
                    {maskPrice(totalValue, intel)}
                    <span className={`bb-portfolio-roi ${totalROI > 0 ? 'up' : totalROI < 0 ? 'down' : ''}`}>
                        ({totalROI > 0 ? '+' : ''}{totalROI}%)
                    </span>
                </span>
            </div>

            {/* Portfolio summary bar */}
            <div className="bb-port-summary">
                <div className="bb-port-sum-item">
                    <span className="bb-port-sum-label">Cost Basis</span>
                    <span className="bb-port-sum-value">{maskPrice(totalCost, intel)}</span>
                </div>
                <div className="bb-port-sum-item">
                    <span className="bb-port-sum-label">Valuation</span>
                    <span className="bb-port-sum-value">{maskPrice(totalValue, intel)}</span>
                </div>
                <div className="bb-port-sum-item">
                    <span className="bb-port-sum-label">Unrealized P&L</span>
                    <span className={`bb-port-sum-value ${totalUnrealizedPL >= 0 ? 'up' : 'down'}`}>
                        {totalUnrealizedPL >= 0 ? '+' : ''}${fmtNum(Math.abs(totalUnrealizedPL))}
                    </span>
                </div>
            </div>

            {/* Holdings table with explicit columns */}
            <div className="bb-port-table">
                <div className="bb-port-row bb-port-header-row">
                    <span className="bb-port-col-title">WORK</span>
                    <span className="bb-port-col-cost">COST</span>
                    <span className="bb-port-col-val">VAL</span>
                    <span className="bb-port-col-pl">P&L</span>
                    <span className="bb-port-col-action"></span>
                </div>
                {items.slice(0, 8).map((work, i) => (
                    <div key={i} className="bb-port-row">
                        <span className="bb-port-col-title">
                            <span className="bb-port-title" onClick={() => onSelectWork(work)}
                                style={{ cursor: 'pointer' }}>"{work.title}"</span>
                            <span className="bb-port-artist">{work.artist}</span>
                        </span>
                        <span className="bb-port-col-cost">{maskPrice(work.purchasePrice, intel)}</span>
                        <span className="bb-port-col-val">{maskPrice(work.currentVal, intel)}</span>
                        <span className={`bb-port-col-pl ${work.roi > 0 ? 'up' : work.roi < 0 ? 'down' : ''}`}>
                            {work.roi > 0 ? '+' : ''}{work.roi}%
                        </span>
                        <span className="bb-port-col-action">
                            <button className="bb-port-list-btn" onClick={() => onListWork(work)}>LIST</button>
                        </span>
                    </div>
                ))}
                {items.length > 8 && (
                    <div className="bb-port-more">+{items.length - 8} more works</div>
                )}
            </div>

            {/* Realized Returns (Sold Works) */}
            {soldWorks.length > 0 && intel >= 30 && (
                <div className="bb-port-realized">
                    <div className="bb-panel-header" style={{ marginTop: 8, fontSize: 10 }}>REALIZED RETURNS</div>
                    {soldWorks.map((sale, i) => (
                        <div key={i} className="bb-port-row bb-port-realized-row">
                            <span className="bb-port-col-title">
                                <span className="bb-port-title">"{sale.title || sale.artwork}"</span>
                            </span>
                            <span className="bb-port-col-cost">{maskPrice(sale.costBasis, intel)}</span>
                            <span className="bb-port-col-val">{maskPrice(sale.salePrice, intel)}</span>
                            <span className={`bb-port-col-pl ${sale.realizedROI > 0 ? 'up' : sale.realizedROI < 0 ? 'down' : ''}`}>
                                {sale.realizedROI > 0 ? '+' : ''}{sale.realizedROI}%
                            </span>
                            <span className="bb-port-col-action bb-port-sold-label">SOLD</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Active listings */}
            {listings.length > 0 && (
                <div className="bb-listings-section">
                    <div className="bb-panel-header" style={{ marginTop: 8 }}>ACTIVE LISTINGS</div>
                    {listings.map(listing => (
                        <div key={listing.id} className="bb-listing-row">
                            <span className="bb-listing-title">"{listing.title}"</span>
                            <span className="bb-listing-tier">{listing.tier.toUpperCase()}</span>
                            <span className="bb-listing-price">${fmtNum(listing.askPrice)}</span>
                            <button className="bb-listing-cancel"
                                onClick={() => TerminalAPI.bloomberg.cancelListing(listing.id)}>
                                CANCEL
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 9. Notification Bar (watchlist alerts)
// ══════════════════════════════════════════════════════════════
function NotificationBar({ notifications, onClickNotif }) {
    if (notifications.length === 0) return null;
    return (
        <div className="bb-notif-bar">
            {notifications.slice(0, 3).map((n, i) => (
                <div key={i} className="bb-notif-item" onClick={() => onClickNotif(n)}>
                    <span className="bb-notif-dot" />
                    <span className="bb-notif-text">{n.message}</span>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 10. Artwork Tearsheet Modal (Gagosian/Seventh House gallery design)
//
// Matches real gallery PDF tearsheet layout:
//   Brand header → "TEARSHEET" label → photo → artist (with birth/death) →
//   title (italic) + year → medium → dimensions (cm + in) → edition →
//   price → market inset → provenance chain → exhibitions → literature →
//   action buttons → gallery footer with locations
// ══════════════════════════════════════════════════════════════
function ArtworkTearsheet({ work, order, intel, onClose, onBuy, onHaggle, mode, onListConfirm }) {
    const [confirmBuy, setConfirmBuy] = useState(false);
    const [listTier, setListTier] = useState(null);
    const s = GameState.state;
    const isWatched = TerminalAPI.watchlist.isWatched(work?.id);

    // CMS snapshot — may have edited metadata/images
    const cmsArtworks = useCmsStore.getState().snapshots?.artworks;
    const cmsWork = cmsArtworks?.find?.(a => a.id === work?.id);

    if (!work) return null;

    // Resolve full artwork data: CMS snapshot → static ARTWORKS → work object
    const artwork = cmsWork || ARTWORKS.find(a => a.id === work.id) || work;
    const artist = MarketManager.artists?.find(a => a.id === (artwork.artistId || work.artistId));
    const artistName = artwork.artist || artist?.name || 'Unknown Artist';
    const title = artwork.title || work.title || 'Untitled';
    const medium = artwork.medium || work.medium || 'Mixed Media';
    const year = artwork.yearCreated || artwork.year || work.yearCreated || '';
    const dimensions = artwork.dimensions || '';
    const dimensionsIn = artwork.dimensionsIn || '';
    const edition = artwork.edition || '';
    const description = artwork.description || '';
    const imageUrl = artwork.imageUrl || artwork.image || null;
    const price = order?.askPrice || work.currentVal || work.price || work.askingPrice || 0;

    // Artist birth/death years — Gagosian format: "b. 1960, Brooklyn" or "1899–1968"
    const born = artwork.artistBorn;
    const died = artwork.artistDied;
    const lifespan = born
        ? died ? `${born}–${died}` : `b. ${born}`
        : '';

    // Heat and trend (intel-gated)
    const heat = artist?.heat || 0;
    const trend = artist?.heat > 60 ? 'RISING' : artist?.heat < 30 ? 'FALLING' : 'STABLE';
    const tier = artist?.tier || artwork.tier || 'mid_career';

    // Provenance chain — prefer structured array, fall back to legacy string
    const provChain = artwork.provenanceChain || [];
    const provString = typeof artwork.provenance === 'string' ? artwork.provenance : '';
    // Game-tracked provenance events (runtime trades, moves)
    const runtimeProv = Array.isArray(work.provenance) ? work.provenance : [];

    // Exhibition history and literature (intel-gated sections)
    const exhibitions = artwork.exhibitions || [];
    const literature = artwork.literature || [];

    // Market value for listing
    let marketValue = 0;
    try { marketValue = MarketManager.calculatePrice(work, false); }
    catch { marketValue = price; }

    const toggleWatch = () => {
        if (isWatched) TerminalAPI.watchlist.remove(work.id);
        else TerminalAPI.watchlist.add('artwork', work.id, price);
    };

    return (
        <div className="bb-modal-backdrop" onClick={onClose}>
            <div className="bb-tearsheet" onClick={e => e.stopPropagation()}>

                {/* ── Gallery header ── */}
                <div className="bb-ts-header">
                    <span className="bb-ts-brand">A R T L I F E</span>
                    <button className="bb-ts-star" onClick={toggleWatch}>
                        {isWatched ? '★' : '☆'}
                    </button>
                </div>

                <div className="bb-ts-label">TEARSHEET</div>

                <div className="bb-ts-rule" />

                {/* ── Artwork image ── */}
                <div className="bb-ts-photos">
                    {imageUrl ? (
                        <img className="bb-ts-photo-img" src={imageUrl} alt={title} />
                    ) : (
                        <div className="bb-ts-photo-placeholder">
                            <span className="bb-ts-photo-text">{title}</span>
                        </div>
                    )}
                </div>

                {/* ── Artist + Metadata block — Gagosian formal layout ── */}
                <div className="bb-ts-meta-block">
                    <div className="bb-ts-artist-line">
                        <span className="bb-ts-artist">{artistName.toUpperCase()}</span>
                        {lifespan && <span className="bb-ts-lifespan">({lifespan})</span>}
                    </div>
                    <div className="bb-ts-title">
                        <em>{title}</em>{year ? `, ${year}` : ''}
                    </div>
                    <div className="bb-ts-meta-line">{medium}</div>
                    {dimensions && (
                        <div className="bb-ts-meta-line">
                            {dimensions}
                            {dimensionsIn ? ` (${dimensionsIn})` : ''}
                        </div>
                    )}
                    {edition && <div className="bb-ts-meta-line">{edition}</div>}
                    {description && intel >= 40 && (
                        <div className="bb-ts-description">{description}</div>
                    )}
                </div>

                {/* ── Price block ── */}
                <div className="bb-ts-price-block">
                    <div className="bb-ts-price-label">NET PRICE</div>
                    <div className="bb-ts-price">{tearsheetPrice(price)}</div>
                    {order && <div className="bb-ts-available">ONE AVAILABLE</div>}
                </div>

                {/* ── Market data inset (dark bg, Bloomberg tone) ── */}
                {intel >= 40 && artist && (
                    <div className="bb-ts-market-inset">
                        <div className="bb-ts-market-row">
                            <span className="bb-ts-market-label">HEAT</span>
                            <span className="bb-ts-market-val">{heat}</span>
                        </div>
                        <div className="bb-ts-market-row">
                            <span className="bb-ts-market-label">TREND</span>
                            <span className={`bb-ts-market-val bb-ts-trend-${trend.toLowerCase()}`}>{trend}</span>
                        </div>
                        <div className="bb-ts-market-row">
                            <span className="bb-ts-market-label">TIER</span>
                            <span className="bb-ts-market-val">{tier.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                    </div>
                )}

                {/* ── Provenance ── */}
                {intel >= 30 && (provChain.length > 0 || provString) && (
                    <div className="bb-ts-section">
                        <div className="bb-ts-section-label">PROVENANCE</div>
                        {provChain.length > 0
                            ? provChain.map((entry, i) => (
                                <div key={i} className="bb-ts-prov-item">{entry}</div>
                            ))
                            : <div className="bb-ts-prov-item">{provString}</div>
                        }
                    </div>
                )}

                {/* ── Runtime provenance (game trades/moves) ── */}
                {intel >= 60 && runtimeProv.length > 0 && (
                    <div className="bb-ts-section">
                        <div className="bb-ts-section-label">TRANSACTION HISTORY</div>
                        {runtimeProv.map((p, i) => (
                            <div key={i} className="bb-ts-prov-item">
                                {p.type} — Week {p.week}{p.city ? `, ${p.city}` : ''}{p.price ? ` — $${fmtNum(p.price)}` : ''}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Exhibition history (intel-gated) ── */}
                {intel >= 50 && exhibitions.length > 0 && (
                    <div className="bb-ts-section">
                        <div className="bb-ts-section-label">EXHIBITIONS</div>
                        {exhibitions.map((ex, i) => (
                            <div key={i} className="bb-ts-exhibit-item">{ex}</div>
                        ))}
                    </div>
                )}

                {/* ── Literature (intel-gated) ── */}
                {intel >= 70 && literature.length > 0 && (
                    <div className="bb-ts-section">
                        <div className="bb-ts-section-label">LITERATURE</div>
                        {literature.map((lit, i) => (
                            <div key={i} className="bb-ts-lit-item">{lit}</div>
                        ))}
                    </div>
                )}

                {/* ── Action buttons ── */}
                {mode === 'buy' && order && !confirmBuy && (
                    <div className="bb-ts-actions">
                        <button className="bb-ts-btn bb-ts-btn-primary"
                            disabled={!hasAP(1) || (s?.cash || 0) < order.askPrice}
                            onClick={() => setConfirmBuy(true)}>
                            BUY NOW {maskPrice(order.askPrice, intel)} <span className="bb-ts-ap">[1 AP]</span>
                        </button>
                        <button className="bb-ts-btn bb-ts-btn-secondary"
                            disabled={!hasAP(2)}
                            onClick={() => onHaggle(order)}>
                            COUNTER OFFER <span className="bb-ts-ap">[2 AP]</span>
                        </button>
                    </div>
                )}
                {mode === 'buy' && confirmBuy && (
                    <div className="bb-ts-actions">
                        <div className="bb-ts-confirm-msg">
                            Confirm purchase of <em>{title}</em> for {tearsheetPrice(order.askPrice)}?
                        </div>
                        <button className="bb-ts-btn bb-ts-btn-primary" onClick={() => onBuy(order)}>
                            CONFIRM PURCHASE
                        </button>
                        <button className="bb-ts-btn bb-ts-btn-secondary" onClick={() => setConfirmBuy(false)}>
                            CANCEL
                        </button>
                    </div>
                )}
                {mode === 'list' && !listTier && (
                    <div className="bb-ts-actions">
                        <div className="bb-ts-confirm-msg">List <em>{title}</em> for sale</div>
                        <button className="bb-ts-btn bb-ts-btn-secondary"
                            onClick={() => setListTier('quick')}>
                            QUICK — {tearsheetPrice(Math.round(marketValue * 0.85))} (instant) <span className="bb-ts-ap">[2 AP]</span>
                        </button>
                        <button className="bb-ts-btn bb-ts-btn-primary"
                            onClick={() => setListTier('market')}>
                            MARKET — {tearsheetPrice(marketValue)} (2–4 wk) <span className="bb-ts-ap">[2 AP]</span>
                        </button>
                        <button className="bb-ts-btn bb-ts-btn-secondary"
                            onClick={() => setListTier('premium')}>
                            PREMIUM — {tearsheetPrice(Math.round(marketValue * 1.15))} (4–8 wk) <span className="bb-ts-ap">[2 AP]</span>
                        </button>
                    </div>
                )}
                {mode === 'list' && listTier && (
                    <div className="bb-ts-actions">
                        <div className="bb-ts-confirm-msg">
                            Confirm {listTier} listing at {tearsheetPrice(Math.round(marketValue * (listTier === 'quick' ? 0.85 : listTier === 'premium' ? 1.15 : 1.0)))}?
                        </div>
                        <button className="bb-ts-btn bb-ts-btn-primary"
                            disabled={!hasAP(2)}
                            onClick={() => onListConfirm(work, listTier)}>
                            CONFIRM LISTING <span className="bb-ts-ap">[2 AP]</span>
                        </button>
                        <button className="bb-ts-btn bb-ts-btn-secondary" onClick={() => setListTier(null)}>
                            BACK
                        </button>
                    </div>
                )}
                {mode === 'view' && (
                    <div className="bb-ts-actions">
                        <button className="bb-ts-btn bb-ts-btn-secondary" onClick={onClose}>CLOSE</button>
                    </div>
                )}

                {/* ── Gallery footer with locations ── */}
                <div className="bb-ts-footer">
                    <div className="bb-ts-footer-brand">A R T L I F E</div>
                    <div className="bb-ts-footer-locations">
                        New York &nbsp;·&nbsp; London &nbsp;·&nbsp; Basel &nbsp;·&nbsp; Hong Kong
                    </div>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 11. Player Stats Panel (gallery mode — clean 5-column stat grid)
// ══════════════════════════════════════════════════════════════
function PlayerStatsPanel() {
    const s = GameState.state;
    const stats = [
        { label: 'REPUTATION', value: s?.reputation || 0 },
        { label: 'TASTE', value: s?.taste || 0 },
        { label: 'AUDACITY', value: s?.audacity || 0 },
        { label: 'ACCESS', value: s?.access || 0 },
        { label: 'INTEL', value: s?.intel || 0 },
    ];

    const city = s?.currentCity || 'New York';
    const week = s?.week || 1;

    return (
        <div className="bb-panel bb-player-stats">
            <div className="bb-panel-header">{(s?.playerName || 'THE DEALER').toUpperCase()}</div>
            <div className="bb-ps-subtitle">Week {week} · {city}</div>
            <div className="bb-ps-grid">
                {stats.map(st => (
                    <div key={st.label} className="bb-ps-item">
                        <span className="bb-ps-value">{st.value}</span>
                        <span className="bb-ps-label">{st.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 12. Net Worth Panel (hero section — big number + sparkline + stat grid)
// ══════════════════════════════════════════════════════════════
function NetWorthPanel({ intel }) {
    const s = GameState.state;
    const wh = s?.wealthHistory || [];
    const cash = s?.cash || 0;
    const portfolioVal = GameState.getPortfolioValue();
    const netWorth = cash + portfolioVal;
    const totalCost = (s?.portfolio || []).reduce((sum, w) => sum + (w.purchasePrice || 0), 0);
    const unrealizedPnl = portfolioVal - totalCost;
    const unrealizedPct = totalCost > 0 ? ((unrealizedPnl / totalCost) * 100).toFixed(1) : '0.0';

    // Realized P&L summed from SELL transactions' profit field
    const realizedPnl = (s?.transactions || [])
        .filter(t => t.action === 'SELL' && t.profit !== undefined)
        .reduce((sum, t) => sum + t.profit, 0);

    // 52-week high/low from wealth history (net worth = cash + assets)
    const netWorths = wh.map(w => (w.cash || 0) + (w.assets || 0));
    const high52 = netWorths.length > 0 ? Math.max(...netWorths) : netWorth;
    const low52 = netWorths.length > 0 ? Math.min(...netWorths) : netWorth;

    return (
        <div className="bb-panel bb-net-worth">
            <div className="bb-panel-header">NET WORTH</div>
            <div className="bb-nw-hero">
                <span className="bb-nw-big">${fmtNum(netWorth)}</span>
                <MiniSparkline
                    data={netWorths}
                    width={100}
                    height={28}
                    color="#1a1a1a"
                />
            </div>
            <div className="bb-nw-grid">
                <div className="bb-nw-stat">
                    <span className="bb-nw-stat-label">CASH</span>
                    <span className="bb-nw-stat-value">${fmtNum(cash)}</span>
                </div>
                <div className="bb-nw-stat">
                    <span className="bb-nw-stat-label">PORTFOLIO</span>
                    <span className="bb-nw-stat-value">${fmtNum(portfolioVal)}</span>
                </div>
                <div className="bb-nw-stat">
                    <span className="bb-nw-stat-label">UNREALIZED P&L</span>
                    <span className={`bb-nw-stat-value ${unrealizedPnl >= 0 ? 'up' : 'down'}`}>
                        {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPct}%
                    </span>
                </div>
                <div className="bb-nw-stat">
                    <span className="bb-nw-stat-label">REALIZED P&L</span>
                    <span className={`bb-nw-stat-value ${realizedPnl >= 0 ? 'up' : 'down'}`}>
                        {realizedPnl >= 0 ? '+' : ''}${fmtNum(Math.abs(realizedPnl))}
                    </span>
                </div>
                <div className="bb-nw-stat">
                    <span className="bb-nw-stat-label">52W HIGH</span>
                    <span className="bb-nw-stat-value">${fmtNum(high52)}</span>
                </div>
                <div className="bb-nw-stat">
                    <span className="bb-nw-stat-label">52W LOW</span>
                    <span className="bb-nw-stat-value">${fmtNum(low52)}</span>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 12B. NPC Directory Panel — art world contacts & relationships
//
// Shows all NPCs with role, title, favor level, and interaction status.
// Data from useNPCStore (Zustand) + CONTACTS master list.
// Intel-gated: higher intel reveals more NPC details.
// ══════════════════════════════════════════════════════════════

/** Role badge color mapping for visual distinction */
const ROLE_COLORS = {
    dealer: '#c9a84c',
    gallerist: '#2a6e2a',
    auction: '#003da5',
    artist: '#8b2020',
    collector: '#6a4c93',
    advisor: '#0066cc',
    mega_dealer: '#c9a84c',
    speculator: '#cc0000',
    young_hustler: '#ff6600',
    institutional: '#555',
};

function NPCDirectoryPanel({ intel }) {
    const contacts = useNPCStore(state => state.contacts);
    const [sortKey, setSortKey] = useState('favor');
    const [sortDir, setSortDir] = useState('desc');
    const [filterRole, setFilterRole] = useState('all');

    // Only show NPCs player has met (or all if intel >= 60)
    const visibleContacts = useMemo(() => {
        let list = (contacts || []).map(c => {
            // Merge with CONTACTS master data for full info
            const master = CONTACTS.find(m => m.id === c.id) || {};
            return { ...master, ...c };
        });

        // Intel < 30: only show met contacts
        if (intel < 30) {
            list = list.filter(c => c.met);
        }

        // Role filter
        if (filterRole !== 'all') {
            list = list.filter(c => c.role === filterRole);
        }

        // Sort
        const sortFn = {
            favor: (a, b) => (b.favor || 0) - (a.favor || 0),
            name: (a, b) => (a.name || '').localeCompare(b.name || ''),
            role: (a, b) => (a.role || '').localeCompare(b.role || ''),
        };
        if (sortFn[sortKey]) {
            list.sort(sortFn[sortKey]);
            if (sortDir === 'asc') list.reverse();
        }

        return list;
    }, [contacts, intel, filterRole, sortKey, sortDir]);

    // Unique roles for filter
    const roles = useMemo(() => {
        const allRoles = (contacts || []).map(c => c.role).filter(Boolean);
        return [...new Set(allRoles)].sort();
    }, [contacts]);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    // Favor level descriptor
    const favorLabel = (f) => {
        if (f >= 15) return 'Close Ally';
        if (f >= 8) return 'Friendly';
        if (f >= 3) return 'Warm';
        if (f >= -2) return 'Neutral';
        if (f >= -8) return 'Cool';
        if (f >= -15) return 'Hostile';
        return 'Enemy';
    };

    const favorColor = (f) => {
        if (f >= 8) return '#2a6e2a';
        if (f >= 3) return '#4caf50';
        if (f >= -2) return '#999';
        if (f >= -8) return '#cc6600';
        return '#cc0000';
    };

    return (
        <div className="bb-panel bb-directory">
            <div className="bb-panel-header">
                DIRECTORY
                <span className="bb-dir-count">{visibleContacts.length}</span>
            </div>
            {/* Filter + sort controls */}
            <div className="bb-dir-controls">
                <select className="bb-dir-filter" value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}>
                    <option value="all">All Roles</option>
                    {roles.map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>
                    ))}
                </select>
                <button className="bb-dir-sort" onClick={() => toggleSort('favor')}>
                    Favor {sortKey === 'favor' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                </button>
                <button className="bb-dir-sort" onClick={() => toggleSort('name')}>
                    Name {sortKey === 'name' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                </button>
            </div>
            {visibleContacts.length === 0 ? (
                <div className="bb-dir-empty">
                    {intel < 30 ? 'No contacts met yet. Meet NPCs to build your network.'
                        : 'No contacts match this filter.'}
                </div>
            ) : (
                <div className="bb-dir-list">
                    {visibleContacts.map(c => (
                        <div key={c.id} className="bb-dir-row">
                            <div className="bb-dir-row-main">
                                <span className="bb-dir-emoji">{c.emoji || '👤'}</span>
                                <div className="bb-dir-info">
                                    <div className="bb-dir-name">{c.name || 'Unknown'}</div>
                                    <div className="bb-dir-title">{c.title || c.role || ''}</div>
                                </div>
                                <span className="bb-dir-role-badge"
                                    style={{ background: ROLE_COLORS[c.role] || '#666' }}>
                                    {(c.role || '').replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                            <div className="bb-dir-row-meta">
                                <span className="bb-dir-favor" style={{ color: favorColor(c.favor || 0) }}>
                                    {favorLabel(c.favor || 0)}
                                    {intel >= 40 && ` (${c.favor || 0})`}
                                </span>
                                {c.met && <span className="bb-dir-met">MET</span>}
                                {intel >= 50 && c.wealth && (
                                    <span className="bb-dir-wealth">
                                        Budget: ${fmtNum(c.wealth.annualBudget || 0)}
                                    </span>
                                )}
                            </div>
                            {/* Personality teaser — intel gated */}
                            {intel >= 60 && c.personality && (
                                <div className="bb-dir-personality">{c.personality}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 13. Collection Panel (gallery-catalogue style per work)
// ══════════════════════════════════════════════════════════════
function CollectionPanel({ intel, onSelectWork }) {
    const s = GameState.state;
    const portfolio = s?.portfolio || [];

    const items = portfolio.map(work => {
        let currentVal = 0;
        try { currentVal = MarketManager.calculatePrice(work, false); }
        catch { currentVal = work.price || work.basePrice || 0; }
        const purchasePrice = work.purchasePrice || work.basePrice || currentVal;
        const roi = purchasePrice > 0 ? ((currentVal - purchasePrice) / purchasePrice * 100).toFixed(1) : 0;
        return { ...work, currentVal, roi };
    });

    return (
        <div className="bb-panel bb-collection">
            <div className="bb-panel-header">
                COLLECTION
                <span className="bb-coll-count">{portfolio.length} WORKS</span>
            </div>
            {items.length === 0 && (
                <div className="bb-coll-empty">No works in collection</div>
            )}
            {items.map((work, i) => (
                <div key={i} className="bb-coll-item"
                    onClick={() => onSelectWork(work)}
                    style={{ cursor: 'pointer' }}>
                    <div className="bb-coll-artist">{(work.artist || 'Unknown').toUpperCase()}</div>
                    <div className="bb-coll-title">
                        <em>{work.title}</em>{work.yearCreated ? `, ${work.yearCreated}` : ''}
                    </div>
                    <div className="bb-coll-medium">{work.medium || 'Mixed Media'}</div>
                    {work.dimensions && <div className="bb-coll-dimensions">{work.dimensions}</div>}
                    <div className="bb-coll-prices">
                        <span>Acquired ${fmtNum(work.purchasePrice)} · W{work.purchaseWeek || '?'}</span>
                        <span className="bb-coll-arrow">→</span>
                        <span>Est. {maskPrice(work.currentVal, intel)}</span>
                        <span className={`bb-coll-roi ${work.roi > 0 ? 'up' : work.roi < 0 ? 'down' : ''}`}>
                            {work.roi > 0 ? '+' : ''}{work.roi}%
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 14. Transaction History Panel (BUY/SELL ledger with P&L)
// ══════════════════════════════════════════════════════════════
function TransactionHistoryPanel({ intel }) {
    const s = GameState.state;
    const txns = s?.transactions || [];
    const buys = txns.filter(t => t.action === 'BUY').length;
    const sells = txns.filter(t => t.action === 'SELL').length;
    const realizedPnl = txns
        .filter(t => t.action === 'SELL' && t.profit !== undefined)
        .reduce((sum, t) => sum + t.profit, 0);

    return (
        <div className="bb-panel bb-txn-history">
            <div className="bb-panel-header">
                TRANSACTION HISTORY
                <span className="bb-txh-summary">
                    {buys}B / {sells}S · P&L: <span className={realizedPnl >= 0 ? 'up' : 'down'}>
                        {realizedPnl >= 0 ? '+' : ''}${fmtNum(Math.abs(realizedPnl))}
                    </span>
                </span>
            </div>
            <div className="bb-txh-list">
                {txns.length === 0 && <div className="bb-txh-empty">No transactions yet</div>}
                {txns.map((t, i) => (
                    <div key={i} className="bb-txh-row">
                        <span className={`bb-txh-badge ${t.action === 'BUY' ? 'buy' : 'sell'}`}>
                            {t.action}
                        </span>
                        <span className="bb-txh-week">W{t.week}</span>
                        <span className="bb-txh-title">"{t.title}"</span>
                        <span className="bb-txh-artist">{t.artist || ''}</span>
                        <span className="bb-txh-price">{maskPrice(t.price, intel)}</span>
                        {t.action === 'SELL' && t.profit !== undefined && (
                            <span className={`bb-txh-pnl ${t.profit >= 0 ? 'up' : 'down'}`}>
                                {t.profit >= 0 ? '+' : ''}${fmtNum(Math.abs(t.profit))}
                                {t.holdWeeks !== undefined && <span className="bb-txh-hold"> ({t.holdWeeks}w)</span>}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 14B. Gallery View — Seventh House staggered product grid
//
// Inspired by seventhhouse.la: cream bg, monospace letter-spaced
// type, staggered 2-column artwork grid with generous whitespace.
// Hero section (stats+networth), artwork grid, then data panels.
// ══════════════════════════════════════════════════════════════
function GalleryView({ intel, showPanel, feed, selectedArtist, onSelectArtist, onSelectWork, onSelectOrder, onSelectTrade, onListWork }) {
    const s = GameState.state;
    const portfolio = s?.portfolio || [];

    // Enrich portfolio items
    const items = portfolio.map(work => {
        const artwork = ARTWORKS.find(a => a.id === work.id) || work;
        let currentVal = 0;
        try { currentVal = MarketManager.calculatePrice(work, false); }
        catch { currentVal = work.price || work.basePrice || 0; }
        return { ...work, ...artwork, currentVal };
    });

    // Market items
    const marketItems = showPanel('orderbook') ? MarketSimulator.getOpenSellOrders().map(order => {
        const artwork = ARTWORKS.find(a => a.id === order.artworkId) || {};
        return { ...artwork, ...order, currentVal: order.askPrice || 0, _isMarket: true };
    }) : [];

    const allWorks = [...items, ...marketItems];

    // Live market summary
    const tickSnap = useMemo(() => {
        try { return MarketManager.getTickSnapshot(); } catch { return null; }
    }, [items]);
    const composite = tickSnap?.composite || 0;
    const cycle = tickSnap?.cycle || 'flat';
    const collectionVal = items.reduce((s, w) => s + (w.currentVal || 0), 0);
    const cycleProse = { bull: 'bullish', bear: 'bearish', flat: 'stable' };
    const cycleIcon = { bull: '↑', bear: '↓', flat: '—' };

    return (
        <div className="gallery-body">
            {/* ── Market Pulse Banner — editorial style ── */}
            <div style={{
                padding: '24px 32px', borderBottom: '1px solid #d5d0c8',
                fontFamily: '\'Courier New\', monospace', letterSpacing: 1.5,
                textTransform: 'uppercase', fontSize: 10, color: '#666',
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                flexWrap: 'wrap', gap: 8,
            }}>
                <span>The market is <strong style={{ color: cycle === 'bull' ? '#2f5a2f' : cycle === 'bear' ? '#8b2020' : '#555' }}>
                    {cycleProse[cycle] || 'stable'}
                </strong> {cycleIcon[cycle]}</span>
                <span>Art Index {composite.toLocaleString()}</span>
                {collectionVal > 0 && <span>Collection {tearsheetPrice(collectionVal)}</span>}
                <span>{allWorks.length} works</span>
            </div>

            {/* Hero section — player stats + net worth */}
            <div className="gallery-hero">
                {showPanel('playerstats') && <PlayerStatsPanel />}
                {showPanel('networth') && <NetWorthPanel intel={intel} />}
            </div>

            {/* Staggered artwork grid — Seventh House style */}
            {showPanel('collection') && allWorks.length > 0 && (
                <div className="sh-section">
                    <div className="sh-section-header">WORKS</div>
                    <div className="sh-grid">
                        {allWorks.map((work, i) => {
                            const imageUrl = work.imageUrl || work.image || null;
                            const artistName = (work.artist || 'Unknown').toUpperCase();
                            const title = work.title || 'Untitled';
                            const medium = work.medium || 'Mixed Media';
                            const year = work.yearCreated || work.year || '';
                            // Stagger: odd items get extra top margin
                            const isOffset = i % 2 === 1;

                            return (
                                <div key={work.id || i}
                                    className={`sh-card${isOffset ? ' sh-card-offset' : ''}`}
                                    onClick={() => onSelectWork && onSelectWork(work)}>
                                    <div className="sh-card-image">
                                        {imageUrl ? (
                                            <img className="sh-card-img" src={imageUrl} alt={title} />
                                        ) : (
                                            <div className="sh-card-placeholder">
                                                <span>{title}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="sh-card-info">
                                        <div className="sh-card-artist" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {artistName}
                                            {(() => {
                                                const artist = MarketManager.artists?.find(a => a.name?.toUpperCase() === artistName);
                                                if (!artist) return null;
                                                const h = artist.heat || 0;
                                                const dotClr = h > 60 ? '#c9a84c' : h > 30 ? '#8b7332' : '#999';
                                                return <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotClr, display: 'inline-block', flexShrink: 0 }} title={`Heat: ${Math.round(h)}`} />;
                                            })()}
                                        </div>
                                        <div className="sh-card-title">
                                            <em>{title}</em>{year ? `, ${year}` : ''}
                                        </div>
                                        <div className="sh-card-medium">{medium}</div>
                                        {intel >= 40 && (
                                            <div className="sh-card-price" style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                                {tearsheetPrice(work.currentVal)}
                                                {!work._isMarket && work.purchasePrice > 0 && (() => {
                                                    const roi = ((work.currentVal - work.purchasePrice) / work.purchasePrice * 100);
                                                    return (
                                                        <span style={{
                                                            fontSize: 8, letterSpacing: 0, textTransform: 'none',
                                                            color: roi >= 0 ? '#2f5a2f' : '#8b2020',
                                                        }}>
                                                            {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                        {work._isMarket && (
                                            <div className="sh-card-tag">AVAILABLE</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* NPC Directory — People section */}
            {showPanel('directory') && (
                <div className="sh-section">
                    <div className="sh-section-header">PEOPLE</div>
                    <NPCDirectoryPanel intel={intel} />
                </div>
            )}

            {/* Data panels — 2-column grid */}
            <div className="gallery-grid-2col">
                <div className="gallery-col">
                    {showPanel('leaderboard') && <ArtistLeaderboard
                        leaderboard={feed.leaderboard}
                        liveSparklines={feed.liveSparklines}
                        intel={intel}
                        selectedArtist={selectedArtist}
                        onSelect={onSelectArtist}
                    />}
                    {showPanel('tradefeed') && <TradeFeed intel={intel} onSelectTrade={onSelectTrade} />}
                    {showPanel('watchlist') && <Watchlist intel={intel} />}
                </div>
                <div className="gallery-col">
                    {showPanel('orderbook') && <OrderBook intel={intel} onSelectOrder={onSelectOrder} />}
                    {showPanel('pricechart') && <PriceChart
                        artistId={selectedArtist}
                        priceHistory={feed.priceHistory}
                        liveSparklines={feed.liveSparklines}
                        intel={intel}
                    />}
                    {showPanel('overview') && <MarketOverview compositeIndex={feed.compositeIndex} cycle={feed.cycle} intel={intel} compositeHistory={feed.compositeHistory} sectorHistory={feed.sectorHistory} eventLog={feed.eventLog} />}
                    {showPanel('txhistory') && <TransactionHistoryPanel intel={intel} />}
                    {showPanel('portfolio') && <PortfolioTracker intel={intel} onListWork={onListWork} onSelectWork={onSelectWork} />}
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 15. Tearsheet View — Gagosian / Frieze LA exact-replica layout
//
// Renders each artwork in the player's collection as a proper
// gallery tearsheet: image page → info page, matching the
// Gagosian Frieze LA 2026 PDF format exactly.
//
// Structure per artwork:
//   PAGE 1: Artwork image (centered, max-height), bottom caption
//   PAGE 2: Centered small-caps header → artist (bold) + lifespan →
//           italic title + year → medium → dimensions →
//           Provenance / Exhibited / Literature sections →
//           gallery footer
//
// Print-ready: @media print rules ensure page breaks between works.
// ══════════════════════════════════════════════════════════════
function TearsheetView({ intel, onSelectWork, showPanel, feed, selectedArtist, onSelectArtist, onSelectTrade, onListWork }) {
    const s = GameState.state;
    const portfolio = s?.portfolio || [];
    const playerName = s?.playerName || 'THE DEALER';
    const city = s?.currentCity || 'New York';
    const week = s?.week || 1;
    const gameYear = 2024 + Math.floor((week - 1) / 52);

    // Stable booth number derived from week (not random on every render)
    const boothNum = useMemo(() => ((week * 7 + 13) % 40) + 1, [week]);

    // Enrich portfolio items with full artwork data + current value
    const showCollection = showPanel('collection');
    const showMarket = showPanel('orderbook');
    const showStats = showPanel('playerstats');
    const showNetWorth = showPanel('networth');

    const items = showCollection ? portfolio.map(work => {
        const artwork = ARTWORKS.find(a => a.id === work.id) || work;
        let currentVal = 0;
        try { currentVal = MarketManager.calculatePrice(work, false); }
        catch { currentVal = work.price || work.basePrice || 0; }
        const artist = MarketManager.artists?.find(a => a.id === (artwork.artistId || work.artistId));
        return { ...work, ...artwork, currentVal, _artist: artist };
    }) : [];

    // Market sell orders — only if orderbook panel is visible
    const marketWorks = showMarket ? MarketSimulator.getOpenSellOrders().map(order => {
        const artwork = ARTWORKS.find(a => a.id === order.artworkId) || {};
        const artist = MarketManager.artists?.find(a => a.id === (artwork.artistId || order.artistId));
        return { ...artwork, ...order, _artist: artist, _isMarket: true, _order: order };
    }) : [];

    const allWorks = [...items, ...marketWorks];

    // Net worth for stats page
    const cash = s?.cash || 0;
    const portfolioVal = showNetWorth ? GameState.getPortfolioValue() : 0;
    const netWorth = cash + portfolioVal;

    if (allWorks.length === 0) {
        return (
            <div className="ts-view">
                <div className="ts-page ts-info-page">
                    <div className="ts-empty">
                        <div className="ts-empty-brand">A R T L I F E</div>
                        <div className="ts-empty-text">No works in collection or on market.</div>
                        <div className="ts-empty-sub">Toggle Collection or Order Book panels to view works.</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ts-view">
            {/* Cover page — Frieze-style */}
            <div className="ts-page ts-cover-page">
                <div className="ts-cover-content">
                    <h1 className="ts-cover-title">FRIEZE {city.toUpperCase()} {gameYear}</h1>
                    <div className="ts-cover-dates">
                        Week {week} &middot; {city}
                    </div>
                    <div className="ts-cover-booth">Booth C{boothNum}</div>
                </div>
                <div className="ts-cover-brand">A R T L I F E</div>
            </div>

            {/* ── Market Context Page ── */}
            {(() => {
                let snap = null;
                try { snap = MarketManager.getTickSnapshot(); } catch { }
                const mCycle = snap?.cycle || 'flat';
                const mComp = snap?.composite || 0;
                const mSectors = snap?.sectors || {};
                const cycleProse = { bull: 'bullish, with strong collector demand', bear: 'bearish, with cautious buying', flat: 'stable, with steady trading' };
                const artistsInCollection = [...new Set(items.map(w => w.artistId || w._artist?.id).filter(Boolean))];
                const artistSnaps = (snap?.artists || []).filter(a => artistsInCollection.includes(a.id));
                return (
                    <div className="ts-page ts-text-page">
                        <div className="ts-text-body">
                            <p style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Market Conditions</p>
                            <p>
                                The art market is currently {cycleProse[mCycle] || 'stable'}.
                                The ArtLife Composite Index stands at <strong>{mComp.toLocaleString()}</strong>,
                                tracking {snap?.artists?.length || 0} artists across {Object.keys(mSectors).length} market tiers.
                            </p>
                            {Object.keys(mSectors).length > 0 && (
                                <p>
                                    Sector performance:
                                    {Object.entries(mSectors).map(([tier, d]) =>
                                        ` ${tier.replace('-', ' ')} (${d.index})`
                                    ).join(' · ')}.
                                </p>
                            )}
                            {artistSnaps.length > 0 && (
                                <>
                                    <p style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 2, marginTop: 24, marginBottom: 8 }}>Artists in this Presentation</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {artistSnaps.map(a => (
                                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: '1px solid #eee' }}>
                                                <span style={{ fontWeight: 'bold' }}>{a.name}</span>
                                                <span style={{ color: '#666' }}>Index {a.index} · Heat {a.heat} · {a.tier}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="ts-page-brand">G A G O S I A N</div>
                    </div>
                );
            })()}

            {/* Intro text page */}
            <div className="ts-page ts-text-page">
                <div className="ts-text-body">
                    <p>
                        ArtLife is pleased to announce its participation in
                        Frieze {city} {gameYear} with a selection of works
                        {items.length > 0 ? ` from the collection of ${playerName}` : ''}{marketWorks.length > 0 ? (items.length > 0 ? ', in dialogue with' : ' featuring') + ` ${marketWorks.length} works available on the secondary market` : ''}.
                    </p>
                    {items.length > 0 && (
                        <p>
                            The presentation features {items.length} {items.length === 1 ? 'work' : 'works'} spanning {[...new Set(items.map(w => w.artist || 'Unknown'))].length} {[...new Set(items.map(w => w.artist || 'Unknown'))].length === 1 ? 'artist' : 'artists'},
                            exploring the intersection of contemporary practice and market dynamics.
                            {showNetWorth && netWorth > 0 ? ` The collection is currently valued at ${tearsheetPrice(netWorth)}.` : ''}
                        </p>
                    )}
                    {showStats && s && (
                        <p>
                            {playerName} brings a reputation score of {s.reputation || 0},
                            with {s.taste || 0} taste, {s.audacity || 0} audacity,
                            and {s.intel || 0} intel — navigating the art world in Week {week}.
                        </p>
                    )}
                </div>
                <div className="ts-page-brand">G A G O S I A N</div>
            </div>

            {/* Each artwork: image page + info page */}
            {allWorks.map((work, i) => {
                const artistName = work.artist || work._artist?.name || 'Unknown Artist';
                const title = work.title || 'Untitled';
                const year = work.yearCreated || work.year || '';
                const medium = work.medium || 'Mixed Media';
                const dimensions = work.dimensions || '';
                const dimensionsIn = work.dimensionsIn || '';
                const edition = work.edition || '';
                const imageUrl = work.imageUrl || work.image || null;
                const born = work.artistBorn || work._artist?.born;
                const died = work.artistDied || work._artist?.died;
                const lifespan = born ? (died ? `${born}\u2013${died}` : `b. ${born}`) : '';
                const provChain = work.provenanceChain || [];
                const provString = typeof work.provenance === 'string' ? work.provenance : '';
                const runtimeProv = Array.isArray(work.provenance) && typeof work.provenance[0] === 'object' ? work.provenance : [];
                const exhibitions = work.exhibitions || [];
                const literature = work.literature || [];
                const signed = work.signed || '';
                const price = work._isMarket
                    ? work.askPrice || 0
                    : work.currentVal || work.price || 0;
                const isOwned = !work._isMarket;

                return (
                    <React.Fragment key={work.id || i}>
                        {/* ── IMAGE PAGE ── */}
                        <div className="ts-page ts-image-page">
                            <div className="ts-image-area">
                                {imageUrl ? (
                                    <img className="ts-artwork-img" src={imageUrl} alt={title} />
                                ) : (
                                    <div className="ts-artwork-placeholder">
                                        <div className="ts-placeholder-inner">
                                            <span className="ts-placeholder-title">{title}</span>
                                            <span className="ts-placeholder-artist">{artistName}</span>
                                            {year && <span className="ts-placeholder-year">{year}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="ts-image-caption">
                                <div className="ts-caption-left">
                                    <span className="ts-caption-artist">{artistName}, </span>
                                    <span className="ts-caption-title"><em>{title}</em>{year ? `, ${year}` : ''}</span>
                                    <br />
                                    <span className="ts-caption-medium">{medium}</span>
                                    {dimensions && <><br /><span className="ts-caption-dims">
                                        {dimensions}{dimensionsIn ? ` (${dimensionsIn})` : ''}
                                    </span></>}
                                    {edition && <><br /><span className="ts-caption-edition">{edition}</span></>}
                                </div>
                                <div className="ts-caption-brand">ARTLIFE</div>
                            </div>
                        </div>

                        {/* ── INFO PAGE (the actual tearsheet) ── */}
                        <div className="ts-page ts-info-page" onClick={() => onSelectWork && onSelectWork(work)}>
                            {/* Centered header — small caps, Gagosian style */}
                            <div className="ts-info-header">
                                {artistName.toUpperCase()}, <em>{title.toUpperCase()}</em>{year ? ` (${year})` : ''}
                            </div>

                            {/* Artist + metadata block */}
                            <div className="ts-info-body">
                                <div className="ts-info-artist" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                    <span><strong>{artistName}</strong>{lifespan ? ` (${lifespan})` : ''}</span>
                                    {work._artist && (work._artist.heat || 0) > 0 && (
                                        <span style={{ fontSize: 8, color: '#999' }}>Heat {Math.round(work._artist.heat)}</span>
                                    )}
                                </div>
                                <div className="ts-info-title-line">
                                    <em>{title}</em>{year ? `, ${year}` : ''}
                                </div>
                                <div className="ts-info-meta">{medium}</div>
                                {dimensions && (
                                    <div className="ts-info-meta">
                                        {dimensions}{dimensionsIn ? ` (${dimensionsIn})` : ''}
                                    </div>
                                )}
                                {edition && <div className="ts-info-meta">{edition}</div>}
                                {signed && <div className="ts-info-meta">{signed}</div>}

                                {/* Price block — intel-gated */}
                                {intel >= 40 && (
                                    <div className="ts-info-price-block">
                                        {work._isMarket
                                            ? <>
                                                <div className="ts-info-price-label">Net Price</div>
                                                <div className="ts-info-price">{tearsheetPrice(price)}</div>
                                                <div className="ts-info-avail">ONE AVAILABLE</div>
                                            </>
                                            : <>
                                                <div className="ts-info-price-label">Current Estimate</div>
                                                <div className="ts-info-price">{tearsheetPrice(price)}</div>
                                            </>
                                        }
                                        {isOwned && work.purchasePrice && (
                                            <div className="ts-info-acquired">
                                                Acquired {tearsheetPrice(work.purchasePrice)}
                                                {work.purchaseWeek ? `, Week ${work.purchaseWeek}` : ''}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Provenance — always show for owned works */}
                                <div className="ts-info-section">
                                    <div className="ts-info-section-head">Provenance</div>
                                    {provChain.length > 0
                                        ? provChain.map((entry, j) => (
                                            <div key={j} className="ts-info-section-item">{entry}</div>
                                        ))
                                        : provString
                                            ? <div className="ts-info-section-item">{provString}</div>
                                            : null
                                    }
                                    {runtimeProv.map((p, j) => (
                                        <div key={`rt-${j}`} className="ts-info-section-item">
                                            {p.type === 'BUY' ? 'Acquired by the present owner' : p.type}
                                            {p.city ? `, ${p.city}` : ''}
                                            {p.price ? `, ${tearsheetPrice(p.price)}` : ''}
                                            {p.week ? `, Week ${p.week}` : ''}
                                        </div>
                                    ))}
                                    {isOwned && provChain.length === 0 && runtimeProv.length === 0 && (
                                        <div className="ts-info-section-item">ArtLife, {city}</div>
                                    )}
                                    {work._isMarket && provChain.length === 0 && (
                                        <div className="ts-info-section-item">Private collection</div>
                                    )}
                                </div>

                                {/* Exhibited */}
                                {exhibitions.length > 0 && intel >= 50 && (
                                    <div className="ts-info-section">
                                        <div className="ts-info-section-head">Exhibited</div>
                                        {exhibitions.map((ex, j) => (
                                            <div key={j} className="ts-info-section-item">{ex}</div>
                                        ))}
                                    </div>
                                )}

                                {/* Literature */}
                                {literature.length > 0 && intel >= 70 && (
                                    <div className="ts-info-section">
                                        <div className="ts-info-section-head">Literature</div>
                                        {literature.map((lit, j) => (
                                            <div key={j} className="ts-info-section-item">{lit}</div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Gallery address block — Gagosian/Seventh House style */}
                            <div className="ts-info-address">
                                <div className="ts-address-brand">ARTLIFE</div>
                                <div className="ts-address-line">980 Madison Avenue</div>
                                <div className="ts-address-line">{city}</div>
                                <div className="ts-address-line">artlife.game</div>
                            </div>

                            {/* Page footer */}
                            <div className="ts-page-brand">G A G O S I A N</div>
                        </div>
                    </React.Fragment>
                );
            })}

            {/* ── Additional panels — 2-col grid ── */}
            <div className="ts-panels ts-panels-grid">
                <div className="ts-panels-col">
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
                <div className="ts-panels-col">
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

            {/* Final page — gallery locations */}
            <div className="ts-page ts-back-page">
                <div className="ts-back-content">
                    <div className="ts-back-brand">A R T L I F E</div>
                    <div className="ts-back-locations">
                        New York &middot; London &middot; Basel &middot; Hong Kong &middot; Los Angeles
                    </div>
                    <div className="ts-back-contact">
                        <div>980 Madison Avenue, New York</div>
                        <div>artlife.game</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 15B. Artist Detail Card — artnet-style artist page inline
//
// Shows artist bio, tier, heat, owned works, market availability,
// price history sparkline. Displayed in Artnet view when an
// artist name is clicked in the table.
// ══════════════════════════════════════════════════════════════
function ArtistDetailCard({ artist, intel, items, feed, onClose }) {
    if (!artist) return null;

    const tier = artist.tier || 'emerging';
    const heat = artist.heat || 0;
    const flavor = artist.flavor || '';
    const medium = artist.medium || '';

    // Works by this artist in current view
    const artistWorks = items.filter(w =>
        w.artistId === artist.id || w._artist?.id === artist.id
    );
    const ownedWorks = artistWorks.filter(w => w._owned);
    const marketWorks = artistWorks.filter(w => w._isMarket);

    // Price range
    const prices = artistWorks.map(w => w.currentVal).filter(Boolean);
    const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
    const priceMax = prices.length > 0 ? Math.max(...prices) : 0;

    // Sparkline data from feed
    const sparkData = feed?.liveSparklines?.[artist.id] || [];

    // Index from leaderboard
    const lb = feed?.leaderboard?.find(l => l.id === artist.id);
    const index = lb?.index || 0;
    const indexDelta = lb?.delta || 0;

    return (
        <div className="an-artist-detail">
            <div className="an-ad-header">
                <div className="an-ad-name">{artist.name}</div>
                <button className="an-ad-close" onClick={onClose}>✕</button>
            </div>
            <div className="an-ad-meta">
                <span className="an-ad-medium">{medium}</span>
                <span className="an-ad-tier">{tier.toUpperCase()}</span>
                <span className="an-ad-heat">
                    Heat: {heat}
                    <span className="an-ad-heat-bar">
                        <span className="an-ad-heat-fill" style={{ width: `${Math.min(heat, 100)}%` }} />
                    </span>
                </span>
            </div>
            {flavor && intel >= 30 && (
                <div className="an-ad-flavor">{flavor}</div>
            )}
            <div className="an-ad-stats">
                <div className="an-ad-stat">
                    <span className="an-ad-stat-label">INDEX</span>
                    <span className={`an-ad-stat-value ${indexDelta > 0 ? 'up' : indexDelta < 0 ? 'down' : ''}`}>
                        {index.toFixed(1)}
                        {indexDelta !== 0 && ` (${indexDelta > 0 ? '+' : ''}${indexDelta.toFixed(1)})`}
                    </span>
                </div>
                <div className="an-ad-stat">
                    <span className="an-ad-stat-label">PRICE RANGE</span>
                    <span className="an-ad-stat-value">
                        {prices.length > 0 ? `$${fmtNum(priceMin)} – $${fmtNum(priceMax)}` : 'No data'}
                    </span>
                </div>
                <div className="an-ad-stat">
                    <span className="an-ad-stat-label">IN COLLECTION</span>
                    <span className="an-ad-stat-value">{ownedWorks.length} works</span>
                </div>
                <div className="an-ad-stat">
                    <span className="an-ad-stat-label">ON MARKET</span>
                    <span className="an-ad-stat-value">{marketWorks.length} available</span>
                </div>
            </div>
            {sparkData.length >= 2 && (
                <div className="an-ad-chart">
                    <span className="an-ad-chart-label">PRICE TREND</span>
                    <MiniSparkline data={sparkData} width={200} height={36} color="#cc0000" />
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 15C. ArtnetLotDetail — Artnet-styled inline artwork detail
//
// Opens below clicked row in the Artnet view. Matches artnet.com
// lot result page: clean white bg, red accents, Helvetica Neue,
// data-dense metadata, provenance, market data, price history,
// and action buttons. Intel-gated progressive disclosure.
// ══════════════════════════════════════════════════════════════
function ArtnetLotDetail({ work, intel, feed, onClose, onBuy, onHaggle, onList }) {
    if (!work) return null;

    const s = GameState.state;
    const artwork = ARTWORKS.find(a => a.id === work.id) || work;
    const artist = MarketManager.artists?.find(a => a.id === (artwork.artistId || work.artistId));
    const artistName = artwork.artist || artist?.name || 'Unknown Artist';
    const title = artwork.title || work.title || 'Untitled';
    const medium = artwork.medium || work.medium || 'Mixed Media';
    const year = artwork.yearCreated || artwork.year || work.yearCreated || '';
    const dimensions = artwork.dimensions || '';
    const description = artwork.description || '';
    const imageUrl = artwork.imageUrl || artwork.image || null;
    const price = work.currentVal || work.price || work.askingPrice || 0;
    const purchasePrice = work.purchasePrice || work.basePrice || 0;
    const genre = artwork.genre || '';
    const tier = artist?.tier || artwork.tier || 'mid_career';
    const heat = artist?.heat || 0;
    const trend = heat > 60 ? 'RISING' : heat < 30 ? 'FALLING' : 'STABLE';
    const trendColor = { RISING: '#2a6e2a', FALLING: '#cc0000', STABLE: '#666' };
    const tierLabels = { 'blue-chip': 'BLUE CHIP', hot: 'HOT', 'mid-career': 'MID-CAREER', emerging: 'EMERGING', speculative: 'SPECULATIVE' };

    // Provenance
    const provChain = artwork.provenanceChain || [];
    const provString = typeof artwork.provenance === 'string' ? artwork.provenance : '';
    const runtimeProv = Array.isArray(work.provenance) ? work.provenance : [];

    // Trade history for this artwork
    const tradeLog = MarketSimulator.getTradesByArtwork?.(work.id) || [];

    // Sparkline data
    const sparkData = feed?.liveSparklines?.[artist?.id] || [];

    // ROI calc
    const roi = purchasePrice > 0 ? ((price - purchasePrice) / purchasePrice * 100).toFixed(1) : null;

    // Lifespan
    const born = artwork.artistBorn || artist?.born;
    const died = artwork.artistDied || artist?.died;
    const lifespan = born ? (died ? `${born}–${died}` : `b. ${born}`) : '';

    // Watchlist
    const isWatched = TerminalAPI.watchlist.isWatched(work.id);
    const toggleWatch = () => {
        if (isWatched) TerminalAPI.watchlist.remove(work.id);
        else TerminalAPI.watchlist.add('artwork', work.id, price);
    };

    // Market value for listing
    let marketValue = 0;
    try { marketValue = MarketManager.calculatePrice(work, false); }
    catch { marketValue = price; }

    return (
        <div className="an-lot-detail">
            {/* Red accent bar */}
            <div className="an-ld-accent" />

            <div className="an-ld-content">
                {/* Left: Image + quick actions */}
                <div className="an-ld-left">
                    {imageUrl ? (
                        <img className="an-ld-image" src={imageUrl} alt={title} />
                    ) : (
                        <div className="an-ld-image-placeholder">
                            <span className="an-ld-image-text">{title}</span>
                        </div>
                    )}
                    <div className="an-ld-quick-actions">
                        <button className="an-ld-watch" onClick={toggleWatch}>
                            {isWatched ? '★ Watching' : '☆ Watch'}
                        </button>
                    </div>
                </div>

                {/* Center: Metadata */}
                <div className="an-ld-center">
                    <div className="an-ld-artist-line">
                        <span className="an-ld-artist">{artistName}</span>
                        {lifespan && <span className="an-ld-lifespan">{lifespan}</span>}
                    </div>
                    <div className="an-ld-title">
                        <em>{title}</em>{year ? `, ${year}` : ''}
                    </div>
                    <div className="an-ld-medium">{medium}</div>
                    {dimensions && <div className="an-ld-dimensions">{dimensions}</div>}
                    {genre && <div className="an-ld-genre">{genre}</div>}
                    {description && intel >= 40 && (
                        <div className="an-ld-description">{description}</div>
                    )}

                    {/* Market tags */}
                    <div className="an-ld-tags">
                        <span className="an-ld-tag an-ld-tag-tier">{tierLabels[tier] || tier.toUpperCase()}</span>
                        <span className="an-ld-tag" style={{ color: trendColor[trend] }}>{trend}</span>
                        {work._owned && <span className="an-ld-tag an-ld-tag-owned">IN COLLECTION</span>}
                        {work._isMarket && <span className="an-ld-tag an-ld-tag-market">FOR SALE</span>}
                    </div>

                    {/* Provenance */}
                    {intel >= 30 && (provChain.length > 0 || provString) && (
                        <div className="an-ld-section">
                            <div className="an-ld-section-label">PROVENANCE</div>
                            {provChain.length > 0
                                ? provChain.map((entry, i) => (
                                    <div key={i} className="an-ld-prov-item">{entry}</div>
                                ))
                                : <div className="an-ld-prov-item">{provString}</div>
                            }
                        </div>
                    )}

                    {/* Runtime provenance — game trades */}
                    {intel >= 60 && runtimeProv.length > 0 && (
                        <div className="an-ld-section">
                            <div className="an-ld-section-label">TRANSACTION HISTORY</div>
                            {runtimeProv.map((p, i) => (
                                <div key={i} className="an-ld-prov-item">
                                    {p.type || 'Transfer'} — Week {p.week}
                                    {p.city ? `, ${p.city}` : ''}
                                    {p.price ? ` — $${fmtNum(p.price)}` : ''}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Recent trades for this work */}
                    {intel >= 40 && tradeLog.length > 0 && (
                        <div className="an-ld-section">
                            <div className="an-ld-section-label">AUCTION RESULTS ({tradeLog.length})</div>
                            <table className="an-ld-trades-table">
                                <thead>
                                    <tr>
                                        <th>Week</th><th>Price</th><th>Buyer</th><th>Seller</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tradeLog.slice(-5).reverse().map((t, i) => (
                                        <tr key={i}>
                                            <td>{t.week || '—'}</td>
                                            <td>${fmtNum(t.price || 0)}</td>
                                            <td>{mask(t.buyer, intel, 60, '???')}</td>
                                            <td>{mask(t.seller, intel, 60, '???')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right: Price + Market data + Actions */}
                <div className="an-ld-right">
                    {/* Price block */}
                    <div className="an-ld-price-block">
                        <div className="an-ld-price-label">PRICE REALIZED</div>
                        <div className="an-ld-price">${fmtNum(price)}</div>
                        {purchasePrice > 0 && (
                            <div className="an-ld-price-detail">
                                Cost basis: ${fmtNum(purchasePrice)}
                                {roi !== null && (
                                    <span className={Number(roi) >= 0 ? 'an-gain' : 'an-loss'}>
                                        {' '}({Number(roi) >= 0 ? '+' : ''}{roi}%)
                                    </span>
                                )}
                            </div>
                        )}
                        {work.estLow && work.estHigh && (
                            <div className="an-ld-estimate">
                                Estimate: ${fmtNum(work.estLow)} – ${fmtNum(work.estHigh)}
                            </div>
                        )}
                    </div>

                    {/* Market data */}
                    {intel >= 40 && artist && (
                        <div className="an-ld-market">
                            <div className="an-ld-market-row">
                                <span className="an-ld-market-label">HEAT INDEX</span>
                                <span className="an-ld-market-val">{Math.round(heat)}</span>
                                <div className="an-ld-heat-bar">
                                    <div className="an-ld-heat-fill" style={{ width: `${Math.min(heat, 100)}%` }} />
                                </div>
                            </div>
                            <div className="an-ld-market-row">
                                <span className="an-ld-market-label">TREND</span>
                                <span className="an-ld-market-val" style={{ color: trendColor[trend] }}>{trend}</span>
                            </div>
                        </div>
                    )}

                    {/* Price trend sparkline */}
                    {sparkData.length >= 2 && (
                        <div className="an-ld-sparkline">
                            <span className="an-ld-spark-label">PRICE TREND</span>
                            <MiniSparkline data={sparkData} width={120} height={28} color="#cc0000" />
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="an-ld-actions">
                        {work._isMarket && work._order && (
                            <>
                                <button className="an-ld-btn an-ld-btn-primary"
                                    disabled={!hasAP(1) || (s?.cash || 0) < (work._order.askPrice || 0)}
                                    onClick={() => onBuy(work._order)}>
                                    BUY NOW <span className="an-ld-ap">[1 AP]</span>
                                </button>
                                <button className="an-ld-btn an-ld-btn-secondary"
                                    disabled={!hasAP(2)}
                                    onClick={() => onHaggle(work._order)}>
                                    COUNTER OFFER <span className="an-ld-ap">[2 AP]</span>
                                </button>
                            </>
                        )}
                        {work._owned && (
                            <button className="an-ld-btn an-ld-btn-secondary"
                                disabled={!hasAP(2)}
                                onClick={() => onList(work)}>
                                LIST FOR SALE <span className="an-ld-ap">[2 AP]</span>
                            </button>
                        )}
                    </div>

                    <button className="an-ld-close" onClick={onClose}>✕ CLOSE</button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 16. Artnet Auction Results View
//
// Clean, data-dense tabular layout inspired by artnet.com's
// price database. White bg, red accent header, sans-serif,
// lot-by-lot auction results with estimate ranges and ROI.
// Sortable columns (click header to sort).
// ══════════════════════════════════════════════════════════════
function ArtnetView({ intel, onSelectWork, showPanel, feed, selectedArtist, onSelectArtist, onSelectOrder, onSelectTrade, onListWork }) {
    const s = GameState.state;
    const portfolio = s?.portfolio || [];
    const week = s?.week || 1;
    const city = s?.currentCity || 'New York';
    const [sortKey, setSortKey] = useState('lot');
    const [sortDir, setSortDir] = useState('asc');
    const [searchTerm, setSearchTerm] = useState('');
    const [detailArtist, setDetailArtist] = useState(null);
    const [detailWork, setDetailWork] = useState(null);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    // Enrich portfolio
    const showCollection = showPanel('collection');
    const showMarket = showPanel('orderbook');

    const ownedItems = showCollection ? portfolio.map((work, i) => {
        const artwork = ARTWORKS.find(a => a.id === work.id) || work;
        let currentVal = 0;
        try { currentVal = MarketManager.calculatePrice(work, false); }
        catch { currentVal = work.price || work.basePrice || 0; }
        const purchasePrice = work.purchasePrice || work.basePrice || currentVal;
        const artist = MarketManager.artists?.find(a => a.id === (artwork.artistId || work.artistId));
        // Estimate range: ±15% of current value
        const estLow = Math.round(currentVal * 0.85);
        const estHigh = Math.round(currentVal * 1.15);
        return {
            ...work, ...artwork, currentVal, purchasePrice,
            estLow, estHigh, _artist: artist, _lot: i + 1, _owned: true,
        };
    }) : [];

    const marketItems = showMarket ? MarketSimulator.getOpenSellOrders().map((order, i) => {
        const artwork = ARTWORKS.find(a => a.id === order.artworkId) || {};
        const artist = MarketManager.artists?.find(a => a.id === (artwork.artistId || order.artistId));
        const price = order.askPrice || 0;
        return {
            ...artwork, ...order, currentVal: price, purchasePrice: 0,
            estLow: Math.round(price * 0.85), estHigh: Math.round(price * 1.15),
            _artist: artist, _lot: ownedItems.length + i + 1, _owned: false,
            _isMarket: true, _order: order,
        };
    }) : [];

    let allItems = [...ownedItems, ...marketItems];

    // Filter by search term
    if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        allItems = allItems.filter(w =>
            (w.artist || '').toLowerCase().includes(q) ||
            (w.title || '').toLowerCase().includes(q) ||
            (w.medium || '').toLowerCase().includes(q)
        );
    }

    // Sort
    const sortFn = {
        lot: (a, b) => a._lot - b._lot,
        artist: (a, b) => (a.artist || '').localeCompare(b.artist || ''),
        price: (a, b) => a.currentVal - b.currentVal,
        title: (a, b) => (a.title || '').localeCompare(b.title || ''),
    };
    if (sortFn[sortKey]) {
        allItems.sort(sortFn[sortKey]);
        if (sortDir === 'desc') allItems.reverse();
    }

    // Summary stats
    const totalValue = ownedItems.reduce((s, w) => s + w.currentVal, 0);
    const totalCost = ownedItems.reduce((s, w) => s + w.purchasePrice, 0);

    const SortIcon = ({ k }) => sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

    // Sale statistics from trade log
    const tradeLog = MarketSimulator.getTradeLog();
    const transactions = s?.transactions || [];

    // Aggregate by artist
    const artistStats = useMemo(() => {
        const stats = {};
        allItems.forEach(w => {
            const name = w.artist || 'Unknown';
            if (!stats[name]) stats[name] = { name, lots: 0, totalValue: 0, owned: 0, market: 0 };
            stats[name].lots++;
            stats[name].totalValue += w.currentVal || 0;
            if (w._owned) stats[name].owned++;
            else stats[name].market++;
        });
        return Object.values(stats).sort((a, b) => b.totalValue - a.totalValue);
    }, [allItems]);

    // Trade volume this session
    const totalTradeVolume = tradeLog.reduce((s, t) => s + (t.price || 0), 0);
    const playerSales = transactions.filter(t => t.action === 'SELL');
    const playerBuys = transactions.filter(t => t.action === 'BUY');
    const realizedPnl = playerSales.reduce((s, t) => s + (t.profit || 0), 0);

    const [showSaleStats, setShowSaleStats] = useState(false);

    // Live market data for pulse header
    const tickSnap = useMemo(() => {
        try { return MarketManager.getTickSnapshot(); } catch { return null; }
    }, [allItems]);
    const composite = tickSnap?.composite || 0;
    const cycle = tickSnap?.cycle || 'flat';
    const sectors = tickSnap?.sectors || {};
    const cycleLabel = { bull: '📈 BULL', bear: '📉 BEAR', flat: '📊 FLAT' };
    const cycleClr = { bull: '#2f7a3b', bear: '#b91c1c', flat: '#555' };
    const sectorClr = { 'blue-chip': '#8b7332', hot: '#b91c1c', 'mid-career': '#1d4ed8', emerging: '#15803d' };

    return (
        <div className="an-view">
            {/* Red header bar */}
            <div className="an-header-bar">
                <span className="an-header-title">ARTLIFE PRICE DATABASE</span>
                <span className="an-header-sub">Week {week} · {city}</span>
            </div>

            {/* ── Market Pulse Strip ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '6px 16px',
                background: '#f8f7f5', borderBottom: '1px solid #e5e5e5',
                fontFamily: '\'Helvetica Neue\', Arial, sans-serif', fontSize: 11, color: '#333',
                flexWrap: 'wrap',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Art Index</span>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#111' }}>{composite.toLocaleString()}</span>
                    {tickSnap && <MiniSparkline data={tickSnap.artists?.map(a => a.index) || []} width={50} height={14} color="#cc0000" />}
                </div>
                <span style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 2, fontWeight: 'bold',
                    background: `${cycleClr[cycle]}11`, color: cycleClr[cycle], letterSpacing: 0.5,
                }}>{cycleLabel[cycle] || 'FLAT'}</span>
                {Object.entries(sectors).map(([tier, data]) => (
                    <span key={tier} style={{ fontSize: 9, color: sectorClr[tier] || '#666' }}>
                        {tier.replace('-', ' ').split(' ').map(w => w[0]?.toUpperCase()).join('')} {data.index}
                    </span>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#bbb' }}>
                    {tradeLog.length} trades · Vol ${fmtNum(totalTradeVolume)}
                </span>
            </div>

            {/* Search bar — artnet-style */}
            <div className="an-search-bar">
                <input
                    className="an-search-input"
                    type="text"
                    placeholder="Search artist, title, or medium..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <span className="an-result-count">{fmtNum(allItems.length)} results</span>
            </div>

            {/* Summary strip */}
            {showPanel('networth') && (
                <div className="an-summary">
                    <span>Collection: {ownedItems.length} lots</span>
                    <span>Total Value: ${fmtNum(totalValue)}</span>
                    <span>Total Cost: ${fmtNum(totalCost)}</span>
                    <span>P&L: <span className={totalValue - totalCost >= 0 ? 'an-gain' : 'an-loss'}>
                        {totalValue - totalCost >= 0 ? '+' : ''}${fmtNum(totalValue - totalCost)}
                    </span></span>
                </div>
            )}

            {/* Sale statistics toggle */}
            <div className="an-stats-toggle">
                <button className="an-stats-btn" onClick={() => setShowSaleStats(!showSaleStats)}>
                    {showSaleStats ? '▼' : '▶'} SALE STATISTICS
                </button>
                <span className="an-stats-summary">
                    {tradeLog.length} trades · Volume ${fmtNum(totalTradeVolume)}
                    {playerSales.length > 0 && ` · ${playerSales.length} sales`}
                    {playerBuys.length > 0 && ` · ${playerBuys.length} purchases`}
                </span>
            </div>

            {showSaleStats && (
                <div className="an-sale-stats">
                    <div className="an-ss-grid">
                        <div className="an-ss-card">
                            <div className="an-ss-card-label">TOTAL LOTS</div>
                            <div className="an-ss-card-value">{allItems.length}</div>
                        </div>
                        <div className="an-ss-card">
                            <div className="an-ss-card-label">COLLECTION</div>
                            <div className="an-ss-card-value">{ownedItems.length}</div>
                        </div>
                        <div className="an-ss-card">
                            <div className="an-ss-card-label">ON MARKET</div>
                            <div className="an-ss-card-value">{marketItems.length}</div>
                        </div>
                        <div className="an-ss-card">
                            <div className="an-ss-card-label">TRADE VOLUME</div>
                            <div className="an-ss-card-value">${fmtNum(totalTradeVolume)}</div>
                        </div>
                        <div className="an-ss-card">
                            <div className="an-ss-card-label">REALIZED P&L</div>
                            <div className={`an-ss-card-value ${realizedPnl >= 0 ? 'an-gain' : 'an-loss'}`}>
                                {realizedPnl >= 0 ? '+' : ''}${fmtNum(Math.abs(realizedPnl))}
                            </div>
                        </div>
                        <div className="an-ss-card">
                            <div className="an-ss-card-label">UNREALIZED P&L</div>
                            <div className={`an-ss-card-value ${totalValue - totalCost >= 0 ? 'an-gain' : 'an-loss'}`}>
                                {totalValue - totalCost >= 0 ? '+' : ''}${fmtNum(Math.abs(totalValue - totalCost))}
                            </div>
                        </div>
                    </div>

                    {/* By artist breakdown */}
                    {artistStats.length > 0 && (
                        <div className="an-ss-artist-table">
                            <div className="an-ss-artist-header">PERFORMANCE BY ARTIST</div>
                            <table className="an-ss-table">
                                <thead>
                                    <tr>
                                        <th className="an-ss-th">Artist</th>
                                        <th className="an-ss-th">Lots</th>
                                        <th className="an-ss-th">Total Value</th>
                                        <th className="an-ss-th">Owned</th>
                                        <th className="an-ss-th">Market</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {artistStats.map(a => (
                                        <tr key={a.name} className="an-ss-row">
                                            <td className="an-ss-td an-ss-artist-name">{a.name}</td>
                                            <td className="an-ss-td">{a.lots}</td>
                                            <td className="an-ss-td">${fmtNum(a.totalValue)}</td>
                                            <td className="an-ss-td">{a.owned}</td>
                                            <td className="an-ss-td">{a.market}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {allItems.length === 0 ? (
                <div className="an-empty">No auction results to display. Toggle Collection or Order Book panels.</div>
            ) : (
                <table className="an-table">
                    <thead>
                        <tr>
                            <th className="an-th" onClick={() => toggleSort('lot')}>Lot{SortIcon({ k: 'lot' })}</th>
                            <th className="an-th an-th-img"></th>
                            <th className="an-th" onClick={() => toggleSort('artist')}>Artist{SortIcon({ k: 'artist' })}</th>
                            <th className="an-th" onClick={() => toggleSort('title')}>Title{SortIcon({ k: 'title' })}</th>
                            <th className="an-th">Medium</th>
                            <th className="an-th" style={{ width: 50 }}>Heat</th>
                            <th className="an-th">Estimate</th>
                            <th className="an-th" onClick={() => toggleSort('price')}>Price{SortIcon({ k: 'price' })}</th>
                            <th className="an-th">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allItems.map((work, i) => {
                            const roi = work.purchasePrice > 0
                                ? ((work.currentVal - work.purchasePrice) / work.purchasePrice * 100).toFixed(1) : null;
                            const isExpanded = detailWork?.id === work.id || (detailWork?._lot === work._lot && !work.id);
                            return (
                                <React.Fragment key={work.id || i}>
                                    <tr className={`an-row ${isExpanded ? 'an-row-active' : ''}`}
                                        onClick={() => setDetailWork(isExpanded ? null : work)}
                                        style={{ cursor: 'pointer' }}>
                                        <td className="an-td an-lot">{work._lot}</td>
                                        <td className="an-td an-thumb">
                                            {work.imageUrl || work.image ? (
                                                <img className="an-thumb-img" src={work.imageUrl || work.image} alt="" />
                                            ) : (
                                                <div className="an-thumb-placeholder" />
                                            )}
                                        </td>
                                        <td className="an-td an-artist-cell">
                                            <div className="an-artist-name an-artist-link"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDetailArtist(detailArtist?.id === work._artist?.id ? null : work._artist);
                                                }}>{work.artist || 'Unknown'}</div>
                                            {work._artist && (
                                                <div className="an-artist-meta">
                                                    {work.artistBorn || work._artist?.born
                                                        ? `(${work.artistBorn || work._artist?.born}${work.artistDied || work._artist?.died ? '–' + (work.artistDied || work._artist?.died) : ''})`
                                                        : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td className="an-td an-title-cell">
                                            <em>{work.title || 'Untitled'}</em>
                                            {work.yearCreated ? `, ${work.yearCreated}` : ''}
                                        </td>
                                        <td className="an-td an-medium">{work.medium || 'Mixed Media'}</td>
                                        <td className="an-td" style={{ padding: '4px 6px' }}>
                                            {work._artist && (() => {
                                                const h = work._artist.heat || 0;
                                                const tier = work._artist.tier || 'emerging';
                                                const tClr = { 'blue-chip': '#8b7332', hot: '#cc0000', 'mid-career': '#1d4ed8', emerging: '#15803d' };
                                                return (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <div style={{
                                                            width: 32, height: 4, background: '#eee', borderRadius: 2, overflow: 'hidden',
                                                        }}>
                                                            <div style={{
                                                                width: `${Math.min(h, 100)}%`, height: '100%',
                                                                background: tClr[tier] || '#999', borderRadius: 2,
                                                            }} />
                                                        </div>
                                                        <span style={{ fontSize: 8, color: '#999' }}>{Math.round(h)}</span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="an-td an-estimate">
                                            ${fmtNum(work.estLow)} – ${fmtNum(work.estHigh)}
                                        </td>
                                        <td className="an-td an-price">
                                            <div className="an-price-main">${fmtNum(work.currentVal)}</div>
                                            {work._owned && work.purchasePrice > 0 && (
                                                <div className="an-price-sub">
                                                    Paid ${fmtNum(work.purchasePrice)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="an-td an-status">
                                            {work._isMarket ? (
                                                <span className="an-badge an-badge-available">FOR SALE</span>
                                            ) : roi !== null ? (
                                                <span className={`an-badge ${Number(roi) >= 0 ? 'an-badge-sold' : 'an-badge-loss'}`}>
                                                    {Number(roi) >= 0 ? '+' : ''}{roi}%
                                                </span>
                                            ) : (
                                                <span className="an-badge an-badge-held">HELD</span>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="an-detail-row">
                                            <td colSpan="9" style={{ padding: 0 }}>
                                                <ArtnetLotDetail
                                                    work={work}
                                                    intel={intel}
                                                    feed={feed}
                                                    onClose={() => setDetailWork(null)}
                                                    onBuy={(order) => { if (onSelectOrder) onSelectOrder(order); }}
                                                    onHaggle={(order) => { if (onSelectOrder) onSelectOrder(order); }}
                                                    onList={(w) => { if (onListWork) onListWork(w); }}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {/* Artist detail card — shown when artist name is clicked */}
            {detailArtist && (
                <ArtistDetailCard
                    artist={detailArtist}
                    intel={intel}
                    items={allItems}
                    feed={feed}
                    onClose={() => setDetailArtist(null)}
                />
            )}

            {/* ── Additional panels below the table — 2-col grid ── */}
            <div className="an-panels an-panels-grid">
                <div className="an-panels-col">
                    {showPanel('playerstats') && <PlayerStatsPanel />}
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
                <div className="an-panels-col">
                    {showPanel('networth') && <NetWorthPanel intel={intel} />}
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

            {/* Footer */}
            <div className="an-footer">
                <span>artlife.game</span>
                <span>All prices in USD. Estimates are approximate.</span>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 17. Sotheby's Catalogue View
//
// Ultra-luxury lot-by-lot catalogue. Centered single-column,
// generous margins, serif body + sans headers, blue lot numbers,
// formal hierarchy matching Sotheby's PDF catalogue pages.
// ══════════════════════════════════════════════════════════════
function SothebysView({ intel, onSelectWork, showPanel, feed, selectedArtist, onSelectArtist, onSelectTrade, onListWork }) {
    const s = GameState.state;
    const portfolio = s?.portfolio || [];
    const playerName = s?.playerName || 'THE DEALER';
    const city = s?.currentCity || 'New York';
    const week = s?.week || 1;
    const [activeLot, setActiveLot] = useState(null);

    const showCollection = showPanel('collection');
    const showMarket = showPanel('orderbook');

    const ownedItems = showCollection ? portfolio.map((work, i) => {
        const artwork = ARTWORKS.find(a => a.id === work.id) || work;
        let currentVal = 0;
        try { currentVal = MarketManager.calculatePrice(work, false); }
        catch { currentVal = work.price || work.basePrice || 0; }
        const artist = MarketManager.artists?.find(a => a.id === (artwork.artistId || work.artistId));
        return { ...work, ...artwork, currentVal, _artist: artist, _lot: i + 1, _owned: true };
    }) : [];

    const marketItems = showMarket ? MarketSimulator.getOpenSellOrders().map((order, i) => {
        const artwork = ARTWORKS.find(a => a.id === order.artworkId) || {};
        const artist = MarketManager.artists?.find(a => a.id === (artwork.artistId || order.artistId));
        return {
            ...artwork, ...order, currentVal: order.askPrice || 0,
            _artist: artist, _lot: ownedItems.length + i + 1, _owned: false,
            _isMarket: true, _order: order,
        };
    }) : [];

    const allItems = [...ownedItems, ...marketItems];
    const totalEstimate = allItems.reduce((s, w) => s + w.currentVal, 0);

    return (
        <div className="sb-view">
            {/* Sale header */}
            <div className="sb-sale-header">
                <div className="sb-sale-brand">ARTLIFE</div>
                <div className="sb-sale-title">Contemporary Art</div>
                <div className="sb-sale-info">{city} · Week {week} · {allItems.length} Lots</div>
                <div className="sb-sale-estimate">
                    Total Estimate ${fmtNum(Math.round(totalEstimate * 0.85))} – ${fmtNum(Math.round(totalEstimate * 1.15))}
                </div>
            </div>

            {/* Lot navigation pills */}
            {allItems.length > 1 && (
                <div className="sb-lot-nav">
                    {allItems.map(w => (
                        <button
                            key={w._lot}
                            className={`sb-lot-pill${activeLot === w._lot ? ' sb-lot-active' : ''}`}
                            onClick={() => {
                                setActiveLot(w._lot);
                                document.getElementById(`sb-lot-${w._lot}`)?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >{w._lot}</button>
                    ))}
                </div>
            )}

            {allItems.length === 0 ? (
                <div className="sb-empty">No lots available for this sale.</div>
            ) : (
                <div className="sb-lots">
                    {allItems.map(work => {
                        const artistName = work.artist || work._artist?.name || 'Unknown Artist';
                        const title = work.title || 'Untitled';
                        const year = work.yearCreated || work.year || '';
                        const medium = work.medium || 'Mixed Media';
                        const dimensions = work.dimensions || '';
                        const born = work.artistBorn || work._artist?.born;
                        const died = work.artistDied || work._artist?.died;
                        const lifespan = born ? (died ? `${born}\u2013${died}` : `b. ${born}`) : '';
                        const nationality = work.artistNationality || work._artist?.nationality || '';
                        const provChain = work.provenanceChain || [];
                        const provString = typeof work.provenance === 'string' ? work.provenance : '';
                        const exhibitions = work.exhibitions || [];
                        const literature = work.literature || [];
                        const description = work.description || '';
                        const estLow = Math.round(work.currentVal * 0.85);
                        const estHigh = Math.round(work.currentVal * 1.15);
                        const propertyFrom = work._owned
                            ? `PROPERTY FROM THE COLLECTION OF ${playerName.toUpperCase()}`
                            : 'PROPERTY OF A PRIVATE COLLECTOR';
                        const imageUrl = work.imageUrl || work.image || null;

                        // Condition rating based on age
                        const age = year ? (2026 - Number(year)) : 0;
                        const condition = age < 5 ? 'Excellent' : age < 20 ? 'Very Good' : age < 50 ? 'Good' : 'Fair';

                        return (
                            <div key={work.id || work._lot} id={`sb-lot-${work._lot}`}
                                className="sb-lot" onClick={() => onSelectWork && onSelectWork(work)}>
                                {/* Blue lot number */}
                                <div className="sb-lot-number">LOT {work._lot}</div>

                                {/* Property from */}
                                <div className="sb-property">{propertyFrom}</div>

                                {/* Artwork image */}
                                <div className="sb-lot-image">
                                    {imageUrl ? (
                                        <img className="sb-lot-img" src={imageUrl} alt={title} />
                                    ) : (
                                        <div className="sb-lot-placeholder">
                                            <span>{title}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Artist + metadata */}
                                <div className="sb-lot-meta">
                                    <div className="sb-lot-artist">
                                        {artistName.toUpperCase()}
                                        {nationality || lifespan ? (
                                            <span className="sb-lot-origin">
                                                {' '}({[nationality, lifespan].filter(Boolean).join(', ')})
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="sb-lot-title"><em>{title}</em>{year ? `, ${year}` : ''}</div>
                                    <div className="sb-lot-medium">{medium}</div>
                                    {dimensions && <div className="sb-lot-dims">{dimensions}</div>}
                                </div>

                                {/* Estimate */}
                                <div className="sb-estimate">
                                    ESTIMATE ${fmtNum(estLow)} – ${fmtNum(estHigh)}
                                </div>

                                {/* Sold / Current value */}
                                {work._owned && work.purchasePrice > 0 && (
                                    <div className="sb-sold">
                                        ACQUIRED FOR ${fmtNum(work.purchasePrice)}
                                        {work.purchaseWeek ? ` · WEEK ${work.purchaseWeek}` : ''}
                                    </div>
                                )}
                                {work._isMarket && (
                                    <div className="sb-sold sb-available">
                                        OFFERED AT ${fmtNum(work.currentVal)}
                                    </div>
                                )}

                                {/* Condition */}
                                <div className="sb-condition">Condition: {condition}</div>

                                {/* Catalogue note */}
                                {description && intel >= 40 && (
                                    <div className="sb-catalogue-note">
                                        <div className="sb-note-label">CATALOGUE NOTE</div>
                                        <p>{description}</p>
                                    </div>
                                )}

                                {/* Provenance */}
                                {(provChain.length > 0 || provString) && intel >= 30 && (
                                    <div className="sb-section">
                                        <div className="sb-section-label">PROVENANCE</div>
                                        {provChain.length > 0
                                            ? provChain.map((e, j) => <div key={j} className="sb-section-item">{e}</div>)
                                            : <div className="sb-section-item">{provString}</div>
                                        }
                                    </div>
                                )}

                                {/* Exhibited */}
                                {exhibitions.length > 0 && intel >= 50 && (
                                    <div className="sb-section">
                                        <div className="sb-section-label">EXHIBITED</div>
                                        {exhibitions.map((ex, j) => <div key={j} className="sb-section-item">{ex}</div>)}
                                    </div>
                                )}

                                {/* Literature */}
                                {literature.length > 0 && intel >= 70 && (
                                    <div className="sb-section">
                                        <div className="sb-section-label">LITERATURE</div>
                                        {literature.map((lit, j) => <div key={j} className="sb-section-item">{lit}</div>)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Additional panels below lots — 2-col grid ── */}
            <div className="sb-panels sb-panels-grid">
                <div className="sb-panels-col">
                    {showPanel('playerstats') && <PlayerStatsPanel />}
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
                </div>
                <div className="sb-panels-col">
                    {showPanel('networth') && <NetWorthPanel intel={intel} />}
                    {showPanel('txhistory') && <TransactionHistoryPanel intel={intel} />}
                    {showPanel('watchlist') && <Watchlist intel={intel} />}
                    {showPanel('portfolio') && (
                        <PortfolioTracker intel={intel} onListWork={onListWork} onSelectWork={onSelectWork} />
                    )}
                </div>
            </div>

            {/* Sale footer */}
            <div className="sb-sale-footer">
                <div className="sb-footer-brand">ARTLIFE</div>
                <div className="sb-footer-locations">
                    New York &middot; London &middot; Basel &middot; Hong Kong &middot; Los Angeles
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 18. Deitch Projects View
//
// Downtown/underground gallery aesthetic. Bold, graphic,
// collage/masonry grid. Giant artist names, fluorescent accents,
// prices hidden by default (click to reveal), zine energy.
// ══════════════════════════════════════════════════════════════
function DeitchView({ intel, onSelectWork, showPanel, feed, selectedArtist, onSelectArtist, onSelectTrade, onListWork }) {
    const s = GameState.state;
    const portfolio = s?.portfolio || [];
    const week = s?.week || 1;
    const city = s?.currentCity || 'New York';
    const [revealedPrices, setRevealedPrices] = useState({});

    // Stable fluorescent accent per session — 1 of 4 neon colors
    const accentColor = useMemo(() => {
        const colors = ['#ff00ff', '#ffff00', '#ff6600', '#00ff66'];
        return colors[((week * 3 + 7) % colors.length)];
    }, [week]);

    const showCollection = showPanel('collection');
    const showMarket = showPanel('orderbook');

    const ownedItems = showCollection ? portfolio.map(work => {
        const artwork = ARTWORKS.find(a => a.id === work.id) || work;
        let currentVal = 0;
        try { currentVal = MarketManager.calculatePrice(work, false); }
        catch { currentVal = work.price || work.basePrice || 0; }
        const artist = MarketManager.artists?.find(a => a.id === (artwork.artistId || work.artistId));
        return { ...work, ...artwork, currentVal, _artist: artist, _owned: true };
    }) : [];

    const marketItems = showMarket ? MarketSimulator.getOpenSellOrders().map(order => {
        const artwork = ARTWORKS.find(a => a.id === order.artworkId) || {};
        const artist = MarketManager.artists?.find(a => a.id === (artwork.artistId || order.artistId));
        return {
            ...artwork, ...order, currentVal: order.askPrice || 0,
            _artist: artist, _owned: false, _isMarket: true, _order: order,
        };
    }) : [];

    const allItems = [...ownedItems, ...marketItems];

    // Featured artist — highest heat
    const featured = allItems.reduce((best, w) => {
        const heat = w._artist?.heat || 0;
        return heat > (best?._artist?.heat || 0) ? w : best;
    }, null);

    const togglePrice = (id, e) => {
        e.stopPropagation();
        setRevealedPrices(p => ({ ...p, [id]: !p[id] }));
    };

    return (
        <div className="dp-view" style={{ '--dp-accent': accentColor }}>
            {/* Giant header */}
            <div className="dp-header">
                <div className="dp-header-title">DEITCH</div>
                <div className="dp-header-show">
                    WEEK {week}: {city.toUpperCase()}
                </div>
                {featured && (
                    <div className="dp-now-showing">
                        NOW SHOWING: <span className="dp-featured-name">
                            {(featured.artist || 'Unknown').toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {allItems.length === 0 ? (
                <div className="dp-empty">
                    <div className="dp-empty-text">NO WORKS ON VIEW</div>
                    <div className="dp-empty-sub">Toggle Collection or Order Book panels.</div>
                </div>
            ) : (
                <div className="dp-grid">
                    {allItems.map((work, i) => {
                        const artistName = work.artist || 'UNKNOWN';
                        const title = work.title || 'Untitled';
                        const year = work.yearCreated || work.year || '';
                        const medium = work.medium || '';
                        const imageUrl = work.imageUrl || work.image || null;
                        const isRevealed = revealedPrices[work.id];
                        // Card size variation: every 3rd card is large
                        const isLarge = i % 3 === 0;

                        return (
                            <div key={work.id || i}
                                className={`dp-card${isLarge ? ' dp-card-lg' : ''}`}
                                onClick={() => onSelectWork && onSelectWork(work)}>
                                {/* Artwork */}
                                <div className="dp-card-image">
                                    {imageUrl ? (
                                        <img className="dp-card-img" src={imageUrl} alt={title} />
                                    ) : (
                                        <div className="dp-card-placeholder">
                                            <span className="dp-card-ph-title">{title}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Giant artist name */}
                                <div className="dp-card-artist">{artistName.toUpperCase()}</div>

                                {/* Title + year, small */}
                                <div className="dp-card-title">
                                    <em>{title}</em>{year ? `, ${year}` : ''}
                                </div>

                                {/* Medium */}
                                {medium && <div className="dp-card-medium">{medium}</div>}

                                {/* Price — hidden by default, click to reveal */}
                                <div className="dp-card-price" onClick={(e) => togglePrice(work.id, e)}>
                                    {isRevealed && intel >= 40 ? (
                                        <span className="dp-price-revealed">${fmtNum(work.currentVal)}</span>
                                    ) : (
                                        <span className="dp-price-hidden">INQUIRE</span>
                                    )}
                                </div>

                                {/* Status sticker */}
                                {work._isMarket && (
                                    <div className="dp-sticker">AVAILABLE</div>
                                )}
                                {work._owned && (
                                    <div className="dp-sticker dp-sticker-owned">COLLECTION</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Additional panels below cards — 2-col grid ── */}
            <div className="dp-panels dp-panels-grid">
                <div className="dp-panels-col">
                    {showPanel('playerstats') && <PlayerStatsPanel />}
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
                </div>
                <div className="dp-panels-col">
                    {showPanel('networth') && <NetWorthPanel intel={intel} />}
                    {showPanel('txhistory') && <TransactionHistoryPanel intel={intel} />}
                    {showPanel('watchlist') && <Watchlist intel={intel} />}
                    {showPanel('portfolio') && (
                        <PortfolioTracker intel={intel} onListWork={onListWork} onSelectWork={onSelectWork} />
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="dp-footer">
                <div className="dp-footer-brand">DEITCH PROJECTS</div>
                <div className="dp-footer-info">76 Grand Street, New York · artlife.game</div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 20. ByformView — Swiss/modernist portfolio table (bf-* prefix)
// Reference: design.byform.co — clean serif header, black circle, monospace table
// ══════════════════════════════════════════════════════════════

/** NPC-to-city mapping derived from backstories */
const NPC_CITY_MAP = {
    sasha_klein: 'new-york', marcus_price: 'new-york', elena_ross: 'new-york',
    james_whitfield: 'london', diana_chen: 'new-york', robert_hall: 'new-york',
    yuki_tanaka: 'hong-kong', kwame_asante: 'new-york', victoria_sterling: 'los-angeles',
    philippe_noir: 'switzerland', nina_ward: 'london', lorenzo_gallo: 'new-york',
    charles_vandermeer: 'london', nico_strand: 'new-york', margaux_fontaine: 'paris',
    dr_eloise_park: 'london',
};

function ByformView({ intel, onSelectWork, showPanel, feed, onSelectTrade, onListWork }) {
    const s = GameState.state;
    const week = s?.week || 1;
    const cash = s?.cash || 0;
    const portfolio = s?.portfolio || [];
    const archetype = s?.archetype || 'Collector';
    const playerName = s?.playerName || 'Anonymous';
    const [filter, setFilter] = useState('all'); // 'all' | 'mine' | 'npc'

    // Merge player transactions + simulator trade log, de-duped by a composite key
    const allTrades = useMemo(() => {
        const playerTx = (s?.transactions || []).map(t => ({ ...t, _source: 'player' }));
        const simTrades = (MarketSimulator.getTradeLog?.() || []).map(t => ({ ...t, _source: 'sim' }));
        const merged = [...playerTx, ...simTrades];

        // De-dup by week+artwork+buyer+price
        const seen = new Set();
        const unique = merged.filter(t => {
            const key = `${t.week}-${t.artwork || t.artworkId}-${t.buyer || ''}-${t.price || t.amount || 0}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Sort by week descending
        unique.sort((a, b) => (b.week || 0) - (a.week || 0));
        return unique;
    }, [week, s?.transactions]);

    // Apply filter
    const filtered = useMemo(() => {
        if (filter === 'mine') return allTrades.filter(t => t.buyer === 'player' || t.seller === 'player');
        if (filter === 'npc') return allTrades.filter(t => t.buyer !== 'player' && t.seller !== 'player');
        return allTrades;
    }, [allTrades, filter]);

    // Portfolio value
    const portfolioValue = useMemo(() => {
        return portfolio.reduce((sum, w) => {
            try { return sum + MarketManager.calculatePrice(w, false); }
            catch { return sum + (w.price || w.basePrice || 0); }
        }, 0);
    }, [portfolio, week]);

    const tradeCount = allTrades.filter(t => t.buyer === 'player' || t.seller === 'player').length;

    return (
        <div className="bf-view">
            {/* Bio header */}
            <div className="bf-header">
                <div className="bf-header-left">
                    <div className="bf-name">{playerName}</div>
                    <div className="bf-meta">{archetype} · Week {week}</div>
                    <div className="bf-meta">Portfolio: ${fmtNum(Math.round(portfolioValue))} · Cash: ${fmtNum(cash)}</div>
                </div>
                <div className="bf-header-right">
                    <div className="bf-circle">
                        <span className="bf-circle-num">{tradeCount}</span>
                        <span className="bf-circle-label">TRADES</span>
                    </div>
                </div>
            </div>

            {/* Filter pills */}
            <div className="bf-filters">
                {['all', 'mine', 'npc'].map(f => (
                    <button key={f} className={`bf-pill${filter === f ? ' bf-pill-active' : ''}`}
                        onClick={() => setFilter(f)}>
                        {f.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Transaction table */}
            <div className="bf-table-wrap">
                <table className="bf-table">
                    <thead>
                        <tr>
                            <th>WEEK</th>
                            <th>ARTWORK</th>
                            <th>TYPE</th>
                            <th>PARTY</th>
                            <th className="bf-th-right">PRICE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={5} className="bf-empty">No transactions yet.</td></tr>
                        )}
                        {filtered.map((t, i) => {
                            const artwork = ARTWORKS.find(a => a.id === (t.artwork || t.artworkId));
                            const title = artwork?.title || t.title || t.artwork || '—';
                            const isPlayer = t.buyer === 'player' || t.seller === 'player';
                            const isBuy = t.buyer === 'player' || t.type === 'buy' || t.type === 'BUY';
                            const isSell = t.seller === 'player' || t.type === 'sell' || t.type === 'SELL';
                            const typeLabel = isBuy ? 'BUY' : isSell ? 'SELL' : 'TRADE';
                            const typeClass = isBuy ? 'bf-type-buy' : isSell ? 'bf-type-sell' : 'bf-type-trade';
                            const party = t.buyer === 'player'
                                ? (CONTACTS.find(c => c.id === t.seller)?.name || '—')
                                : t.seller === 'player'
                                    ? (CONTACTS.find(c => c.id === t.buyer)?.name || '—')
                                    : intel >= 60
                                        ? (CONTACTS.find(c => c.id === (t.buyer || t.seller))?.name || '—')
                                        : '—';
                            const price = t.price || t.amount || 0;

                            return (
                                <tr key={i} className={isPlayer ? 'bf-row-player' : ''}
                                    onClick={() => artwork && onSelectWork?.(artwork)}>
                                    <td>{t.week || '—'}</td>
                                    <td className="bf-td-title">{title}</td>
                                    <td><span className={`bf-type ${typeClass}`}>{typeLabel}</span></td>
                                    <td>{party}</td>
                                    <td className="bf-th-right">{maskPrice(price, intel)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer panels — reuse existing Bloomberg panels */}
            <div className="bf-panels">
                {showPanel('playerstats') && <PlayerStatsPanel />}
                {showPanel('networth') && <NetWorthPanel intel={intel} />}
                {showPanel('collection') && <CollectionPanel intel={intel} onSelectWork={onSelectWork} />}
                {showPanel('txhistory') && <TransactionHistoryPanel intel={intel} />}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 21. WaterworksView — Deep blue SVG world map (ww-* prefix)
// Reference: waterworksproject.nl — blue bg, circle markers, sidebar filters
// ══════════════════════════════════════════════════════════════

/** Fixed city positions for the abstract SVG map (viewBox 0 0 900 500) */
const CITY_POSITIONS = {
    'new-york': { x: 250, y: 180 },
    'los-angeles': { x: 100, y: 220 },
    'miami': { x: 230, y: 300 },
    'london': { x: 450, y: 140 },
    'paris': { x: 480, y: 180 },
    'berlin': { x: 520, y: 150 },
    'switzerland': { x: 490, y: 210 },
    'hong-kong': { x: 780, y: 260 },
};

/** NYC sub-locations positioned radially around the NY circle */
function getNYSubLocations() {
    const nyLocs = WORLD_LOCATIONS.filter(l => l.city === 'new-york' && l.type !== 'taxi');
    const cx = CITY_POSITIONS['new-york'].x;
    const cy = CITY_POSITIONS['new-york'].y;
    const radius = 60;
    return nyLocs.map((loc, i) => {
        const angle = (i / nyLocs.length) * Math.PI * 2 - Math.PI / 2;
        return { ...loc, _x: cx + Math.cos(angle) * radius, _y: cy + Math.sin(angle) * radius };
    });
}

function WaterworksView({ intel, showPanel, feed }) {
    const s = GameState.state;
    const visitedCities = s?.visitedCities || [];
    const currentCity = s?.currentCity || 'new-york';
    const week = s?.week || 1;
    const [selectedCity, setSelectedCity] = useState(null);
    const [typeFilter, setTypeFilter] = useState('all');
    const [showNYSubs, setShowNYSubs] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const cityKeys = Object.keys(CITY_DATA);
    const nySubs = useMemo(() => getNYSubLocations(), []);
    const totalLocations = WORLD_LOCATIONS.length;

    // Unique location types for filter pills
    const locTypes = useMemo(() => {
        const types = new Set(WORLD_LOCATIONS.map(l => l.type));
        return ['all', ...Array.from(types)];
    }, []);

    // NPCs in selected city
    const cityNPCs = useMemo(() => {
        if (!selectedCity) return [];
        return CONTACTS.filter(c => NPC_CITY_MAP[c.id] === selectedCity);
    }, [selectedCity]);

    // City activity — count of trades/transactions involving that city
    const cityActivity = useMemo(() => {
        const activity = {};
        cityKeys.forEach(k => { activity[k] = 0; });
        (MarketSimulator.getTradeLog?.() || []).forEach(t => {
            const buyerCity = NPC_CITY_MAP[t.buyer];
            const sellerCity = NPC_CITY_MAP[t.seller];
            if (buyerCity) activity[buyerCity] = (activity[buyerCity] || 0) + 1;
            if (sellerCity) activity[sellerCity] = (activity[sellerCity] || 0) + 1;
        });
        return activity;
    }, [week]);

    // Travel route lines — connect visited cities in order
    const routeLines = useMemo(() => {
        if (visitedCities.length < 2) return [];
        const lines = [];
        for (let i = 0; i < visitedCities.length - 1; i++) {
            const from = CITY_POSITIONS[visitedCities[i]];
            const to = CITY_POSITIONS[visitedCities[i + 1]];
            if (from && to) lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
        }
        return lines;
    }, [visitedCities]);

    const handleCityClick = (cityId) => {
        setSelectedCity(prev => prev === cityId ? null : cityId);
        if (cityId === 'new-york') setShowNYSubs(prev => !prev);
        else setShowNYSubs(false);
        setSidebarOpen(true);
    };

    const detail = selectedCity ? CITY_DATA[selectedCity] : null;
    const cityLocations = selectedCity
        ? WORLD_LOCATIONS.filter(l => l.city === selectedCity && (typeFilter === 'all' || l.type === typeFilter))
        : [];

    return (
        <div className="ww-view">
            {/* Top-left header — Waterworks style */}
            <div className="ww-header">
                <span className="ww-header-title">WATERWORKS</span>
                <button className="ww-glass-btn" onClick={() => setSidebarOpen(o => !o)}>
                    <span className="ww-bracket" aria-hidden="true">(</span>
                    {sidebarOpen ? 'Hide' : 'Show'}
                    <span className="ww-bracket" aria-hidden="true">)</span>
                </button>
            </div>

            {/* Map area — full viewport background */}
            <div className="ww-map-area">
                <svg viewBox="0 0 900 500" className="ww-svg" preserveAspectRatio="xMidYMid meet">
                    {/* Travel route lines */}
                    {routeLines.map((line, i) => (
                        <line key={`route-${i}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                            stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="6 4" />
                    ))}

                    {/* City markers — hollow circles with center dots (Waterworks style) */}
                    {cityKeys.map(cityId => {
                        const pos = CITY_POSITIONS[cityId];
                        if (!pos) return null;
                        const isVisited = visitedCities.includes(cityId);
                        const isCurrent = currentCity === cityId;
                        const isSelected = selectedCity === cityId;
                        const activity = cityActivity[cityId] || 0;
                        // Waterworks uses fixed-size circles; larger for "historical" type
                        const isLarge = activity > 3;
                        const r = isLarge ? 19 : 10;

                        return (
                            <g key={cityId} className={`ww-marker${isSelected ? ' ww-marker-active' : ''}`}
                                onClick={() => handleCityClick(cityId)} style={{ cursor: 'pointer' }}>
                                {/* Pulsing ring for current city */}
                                {isCurrent && (
                                    <circle cx={pos.x} cy={pos.y} r={r + 6}
                                        fill="none" stroke="white" strokeWidth="1" opacity="0.4">
                                        <animate attributeName="r" values={`${r + 3};${r + 12};${r + 3}`}
                                            dur="3s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" values="0.4;0.05;0.4"
                                            dur="3s" repeatCount="indefinite" />
                                    </circle>
                                )}
                                {/* Hollow circle — inset stroke (like box-shadow: inset 0 0 0 1px) */}
                                <circle cx={pos.x} cy={pos.y} r={r}
                                    fill="none"
                                    stroke="white"
                                    strokeWidth={isSelected ? 2 : 1}
                                    opacity={isVisited ? 1 : 0.35} />
                                {/* Center dot */}
                                <circle cx={pos.x} cy={pos.y} r={isLarge ? 2 : 1}
                                    fill="white"
                                    opacity={isVisited ? 1 : 0.35} />
                                {/* Leader line (angled, like Waterworks ::before) */}
                                <line x1={pos.x + r * 0.7} y1={pos.y - r * 0.7}
                                    x2={pos.x + r + 24} y2={pos.y - r - 18}
                                    stroke="white" strokeWidth="0.5"
                                    opacity={isVisited ? 0.8 : 0.25}
                                    className="ww-leader" />
                                {/* Label (positioned at end of leader line, like ::after) */}
                                <text x={pos.x + r + 26} y={pos.y - r - 16}
                                    fill="white" fontSize="10"
                                    fontFamily="'IBM Plex Mono', monospace" fontWeight="500"
                                    opacity={isVisited ? 1 : 0.3}
                                    className="ww-label">
                                    {CITY_DATA[cityId]?.name || cityId}
                                </text>
                            </g>
                        );
                    })}

                    {/* NYC sub-locations — smaller hollow circles when NY is selected */}
                    {showNYSubs && nySubs.map(loc => (
                        <g key={loc.id} className="ww-sub-marker">
                            <line x1={CITY_POSITIONS['new-york'].x} y1={CITY_POSITIONS['new-york'].y}
                                x2={loc._x} y2={loc._y}
                                stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                            <circle cx={loc._x} cy={loc._y} r={6}
                                fill="none" stroke="white" strokeWidth="0.5" opacity="0.7" />
                            <circle cx={loc._x} cy={loc._y} r={0.75}
                                fill="white" opacity="0.7" />
                            <text x={loc._x + 10} y={loc._y + 3}
                                fill="white" fontSize="7"
                                fontFamily="'IBM Plex Mono', monospace" fontWeight="500"
                                opacity="0.5">
                                {loc.name}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            {/* Sidebar — slides in from right (Waterworks pattern) */}
            <aside className={`ww-sidebar${sidebarOpen ? ' ww-sidebar-open' : ''}`}>
                {/* Location count + see all */}
                <div className="ww-sidebar-header">
                    <span>{totalLocations} Locations</span>
                    <button className="ww-glass-btn ww-glass-btn-sm" onClick={() => setSelectedCity(null)}>
                        <span className="ww-bracket" aria-hidden="true">(</span>
                        See all
                        <span className="ww-bracket" aria-hidden="true">)</span>
                    </button>
                </div>

                {/* Filter nav — glassmorphism pills */}
                <nav className="ww-filters">
                    {locTypes.map(t => (
                        <button key={t}
                            className={`ww-glass-btn ww-glass-btn-sm${typeFilter === t ? ' ww-pill-active' : ''}`}
                            onClick={() => setTypeFilter(t)}>
                            {t.toUpperCase()}
                        </button>
                    ))}
                </nav>

                {/* Scrollable city list */}
                <ul className="ww-city-list">
                    {cityKeys.map(cityId => {
                        const city = CITY_DATA[cityId];
                        const isSelected = selectedCity === cityId;
                        const isVisited = visitedCities.includes(cityId);
                        return (
                            <li key={cityId}>
                                <button
                                    className={`ww-city-btn${isSelected ? ' ww-city-selected' : ''}${isVisited ? '' : ' ww-city-dim'}`}
                                    onClick={() => handleCityClick(cityId)}>
                                    <span>{city.name}</span>
                                    {currentCity === cityId && <span className="ww-current-badge">HERE</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>

                {/* Detail panel — slides in when city selected */}
                {detail && (
                    <div className="ww-detail">
                        <div className="ww-detail-name">{detail.name}</div>
                        <div className="ww-detail-vibe">{detail.vibe}</div>
                        <div className="ww-detail-row">
                            <span className="ww-detail-label">Specialty</span>
                            <span>{detail.specialty}</span>
                        </div>
                        <div className="ww-detail-row">
                            <span className="ww-detail-label">Market Bonus</span>
                            <span>{detail.marketBonus > 1 ? '+' : ''}{Math.round((detail.marketBonus - 1) * 100)}%</span>
                        </div>

                        {detail.venues?.length > 0 && (
                            <div className="ww-detail-section">
                                <div className="ww-detail-label">Venues</div>
                                {detail.venues.map((v, i) => (
                                    <div key={i} className="ww-detail-venue">{v}</div>
                                ))}
                            </div>
                        )}

                        {cityNPCs.length > 0 && (
                            <div className="ww-detail-section">
                                <div className="ww-detail-label">Known Contacts</div>
                                {cityNPCs.map(npc => (
                                    <div key={npc.id} className="ww-detail-npc">
                                        <span className="ww-npc-emoji">{npc.emoji || '●'}</span>
                                        <span>{npc.name}</span>
                                        <span className="ww-npc-role">{npc.role}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {cityLocations.length > 0 && (
                            <div className="ww-detail-section">
                                <div className="ww-detail-label">Locations</div>
                                {cityLocations.map(loc => (
                                    <div key={loc.id} className="ww-detail-loc">
                                        <span>{loc.icon}</span>
                                        <span>{loc.name}</span>
                                        <span className="ww-loc-type">{loc.type}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </aside>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// 19. Panel Config Dropdown (gear icon → checkbox list + presets)
// ══════════════════════════════════════════════════════════════
function PanelConfigDropdown({ visiblePanels, setVisiblePanels, isGallery }) {
    const [open, setOpen] = useState(false);
    const schema = SettingsManager.SCHEMA.find(s => s.id === 'bloombergPanels');
    if (!schema) return null;

    const toggle = (value) => {
        SettingsManager.toggleChecklistItem('bloombergPanels', value);
        setVisiblePanels([...SettingsManager.get('bloombergPanels')]);
    };

    const applyPreset = (name) => {
        SettingsManager.applyPreset('bloombergPanels', name);
        setVisiblePanels([...SettingsManager.get('bloombergPanels')]);
    };

    return (
        <div className="bb-config-wrapper">
            <button
                className="bb-config-btn"
                onClick={() => setOpen(o => !o)}
                title="Configure visible panels"
            >⚙</button>
            {open && (
                <>
                    <div className="bb-config-backdrop" onClick={() => setOpen(false)} />
                    <div className={`bb-config-dropdown${isGallery ? ' bb-config-gallery' : ''}`}>
                        <div className="bb-config-title">VISIBLE PANELS</div>
                        <div className="bb-config-list">
                            {schema.options.map(opt => (
                                <label key={opt.value} className="bb-config-item">
                                    <input
                                        type="checkbox"
                                        checked={visiblePanels.includes(opt.value)}
                                        onChange={() => toggle(opt.value)}
                                    />
                                    <span>{opt.display}</span>
                                </label>
                            ))}
                        </div>
                        <div className="bb-config-presets">
                            <button className="bb-config-preset" onClick={() => applyPreset('full')}>ALL</button>
                            <button className="bb-config-preset" onClick={() => applyPreset('minimal')}>MINIMAL</button>
                            <button className="bb-config-preset" onClick={() => applyPreset('trading')}>TRADING</button>
                            <button className="bb-config-preset" onClick={() => applyPreset('tearsheet')}>PRINT</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// Main Bloomberg Terminal
// ══════════════════════════════════════════════════════════════
export default function BloombergTerminal({ onClose }) {
    const feed = useBloombergFeed();
    const [selectedArtist, setSelectedArtist] = useState(null);
    const [modalWork, setModalWork] = useState(null);
    const [modalOrder, setModalOrder] = useState(null);
    const [modalMode, setModalMode] = useState(null); // 'buy' | 'list' | 'view'
    const [statusMsg, setStatusMsg] = useState(null);
    const [, forceRender] = useState(0);

    // Tutorial overlay state
    const [showTutorial, setShowTutorial] = useState(() => !SettingsManager.get('hasSeenBloombergIntro'));

    // Market style — gallery, tearsheet, artnet, sothebys, deitch, or bloomberg dark
    const [marketStyle, setMarketStyle] = useState(() => SettingsManager.get('marketStyle'));
    const isGallery = marketStyle === 'gallery';
    const isTearsheet = marketStyle === 'tearsheet';
    const isArtnet = marketStyle === 'artnet';
    const isSothebys = marketStyle === 'sothebys';
    const isDeitch = marketStyle === 'deitch';
    const isByform = marketStyle === 'byform';
    const isWaterworks = marketStyle === 'waterworks';
    // Any "full-page" style that replaces the 3-column grid
    const isFullPageStyle = isTearsheet || isArtnet || isSothebys || isDeitch || isByform || isWaterworks;

    // Panel visibility — driven by SettingsManager checklist
    const [visiblePanels, setVisiblePanels] = useState(() => SettingsManager.get('bloombergPanels'));
    const showPanel = useCallback((key) => visiblePanels.includes(key), [visiblePanels]);

    const toggleMarketStyle = useCallback(() => {
        SettingsManager.cycleNext('marketStyle');
        setMarketStyle(SettingsManager.get('marketStyle'));
    }, []);

    // Sync panel visibility when changed externally (e.g. from Admin Dashboard)
    useEffect(() => {
        const handler = (e) => {
            if (e.detail?.key === 'bloombergPanels') {
                setVisiblePanels([...SettingsManager.get('bloombergPanels')]);
            }
        };
        window.addEventListener('settings-changed', handler);
        return () => window.removeEventListener('settings-changed', handler);
    }, []);

    const s = GameState.state;
    const intel = s?.intel || 0;
    const week = s?.week || 1;
    const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Math.floor((week - 1) / 4) % 12];
    const year = 2024 + Math.floor((week - 1) / 52);

    // Compute notifications from watchlist
    const notifications = useMemo(() => TerminalAPI.bloomberg.getNotifications(), [week, s?.watchlist]);

    // Auto-select first artist
    useEffect(() => {
        if (!selectedArtist && feed.leaderboard.length > 0) {
            setSelectedArtist(feed.leaderboard[0].id);
        }
    }, [feed.leaderboard]);

    // Status message auto-clear
    useEffect(() => {
        if (statusMsg) {
            const t = setTimeout(() => setStatusMsg(null), 3000);
            return () => clearTimeout(t);
        }
    }, [statusMsg]);

    // Keyboard: ESC closes modal first, then Bloomberg
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                if (modalWork) { closeModal(); e.stopPropagation(); }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [modalWork]);

    const closeModal = () => {
        setModalWork(null);
        setModalOrder(null);
        setModalMode(null);
    };

    // Open tearsheet for a sell order (buy mode)
    const handleSelectOrder = useCallback((order) => {
        const work = order.artwork || ARTWORKS.find(a => a.id === order.artworkId) || {
            id: order.artworkId, title: order.title, artist: order.artist, price: order.askPrice,
        };
        setModalWork(work);
        setModalOrder(order);
        setModalMode('buy');
    }, []);

    // Open tearsheet for a trade feed artwork (view mode)
    const handleSelectTrade = useCallback((artwork) => {
        setModalWork(artwork);
        setModalOrder(null);
        setModalMode('view');
    }, []);

    // Open tearsheet for portfolio work (list mode)
    const handleListWork = useCallback((work) => {
        setModalWork(work);
        setModalOrder(null);
        setModalMode('list');
    }, []);

    // Open tearsheet for portfolio work (view mode)
    const handleSelectPortfolioWork = useCallback((work) => {
        setModalWork(work);
        setModalOrder(null);
        setModalMode('view');
    }, []);

    // Buy action
    const handleBuy = useCallback((order) => {
        if (!hasAP(1)) { setStatusMsg('Not enough AP'); return; }
        useAP('Bloomberg purchase', 1);
        const result = TerminalAPI.bloomberg.buyFromOrder(order.id);
        if (result.success) {
            setStatusMsg(`Acquired "${order.title}" for $${fmtNum(order.askPrice)}`);
            GameEventBus.emit(GameEvents.BLOOMBERG_TRADE, result);
        } else {
            setStatusMsg(result.error || 'Purchase failed');
        }
        closeModal();
        forceRender(n => n + 1);
    }, []);

    // Haggle action — closes Bloomberg, launches HaggleScene
    const handleHaggle = useCallback((order) => {
        if (!hasAP(2)) { setStatusMsg('Not enough AP (need 2)'); return; }
        useAP('Bloomberg counter offer', 2);

        const haggleData = TerminalAPI.bloomberg.prepareHaggle(order.id);
        if (!haggleData) { setStatusMsg('Order no longer available'); return; }

        const haggleInfo = HaggleManager.start(haggleData);
        onClose(); // Close Bloomberg

        // Launch HaggleScene via Phaser
        GameEventBus.emit(GameEvents.UI_ROUTE, VIEW.PHASER);
        setTimeout(() => {
            GameEventBus.emit(GameEvents.DEBUG_LAUNCH_SCENE, 'HaggleScene', { haggleInfo });
        }, 100);
    }, [onClose]);

    // List for sale action
    const handleListConfirm = useCallback((work, tier) => {
        if (!hasAP(2)) { setStatusMsg('Not enough AP (need 2)'); return; }
        useAP('Bloomberg listing', 2);
        const result = TerminalAPI.bloomberg.listForSale(work.id, tier);
        if (result.success) {
            setStatusMsg(`Listed "${work.title}" (${tier}) at $${fmtNum(result.listing?.askPrice)}`);
        } else {
            setStatusMsg(result.error || 'Listing failed');
        }
        closeModal();
        forceRender(n => n + 1);
    }, []);

    // Handle notification click
    const handleNotifClick = useCallback((notif) => {
        if (notif.orderId) {
            const order = MarketSimulator.pendingSellOrders.find(o => o.id === notif.orderId);
            if (order) handleSelectOrder(order);
        }
    }, [handleSelectOrder]);

    // Intel gate message
    const intelGateMsg = intel < 20
        ? 'LOW INTEL — Most market data obscured. Increase your intel stat to reveal more.'
        : intel < 40
            ? 'LIMITED INTEL — Prices rounded. Increase intel for precise data.'
            : intel < 60
                ? 'MODERATE INTEL — Trade parties hidden. Intel 60+ reveals identities.'
                : null;

    return (
        <div className={`bb-overlay${isGallery ? ' bb-gallery' : ''}${isTearsheet ? ' bb-tearsheet-mode' : ''}${isArtnet ? ' bb-artnet' : ''}${isSothebys ? ' bb-sothebys' : ''}${isDeitch ? ' bb-deitch' : ''}${isByform ? ' bb-byform' : ''}${isWaterworks ? ' bb-waterworks' : ''}`}>
            {/* Tutorial Overlay */}
            {showTutorial && (
                <BloombergTutorial onClose={() => {
                    setShowTutorial(false);
                    SettingsManager.set('hasSeenBloombergIntro', true);
                }} />
            )}

            {/* Header */}
            <div className="bb-header">
                <div className="bb-header-left" style={{ display: 'flex', alignItems: 'center' }}>
                    {(isGallery || isTearsheet)
                        ? <span className="bb-logo">A R T L I F E</span>
                        : isArtnet
                            ? <span className="bb-logo">artlife</span>
                            : isSothebys
                                ? <span className="bb-logo">ARTLIFE</span>
                                : isDeitch
                                    ? <span className="bb-logo">DEITCH</span>
                                    : isByform
                                        ? <span className="bb-logo">byform</span>
                                        : isWaterworks
                                            ? <span className="bb-logo">WATERWORKS</span>
                                            : <><span className="bb-logo">████</span><span className="bb-title">ARTLIFE MARKET TERMINAL</span></>
                    }
                    {/* System Navigation */}
                    <span className="bb-nav-links" style={{ marginLeft: 24, display: 'flex', gap: 16, fontFamily: "'SF Mono', Courier, monospace", fontSize: 11, color: '#888' }}>
                        <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => {
                            const ui = window.TerminalUIInstance;
                            import('../terminal/screens/index.js').then(screens => ui?.pushScreen(screens.cityScreen(ui)));
                            GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
                            if (onClose) onClose();
                        }} title="Access World Map & Locations">[ WORLD MAP ]</button>
                        <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => {
                            const ui = window.TerminalUIInstance;
                            import('../terminal/screens/index.js').then(screens => ui?.pushScreen(screens.phoneScreen(ui)));
                            GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
                            if (onClose) onClose();
                        }} title="Check Messages & Contacts">[ PHONE ]</button>
                    </span>
                </div>
                <div className="bb-header-right">
                    <span className="bb-cash">${(s?.cash || 0).toLocaleString()}</span>
                    <span className="bb-ap">{getAP()} AP</span>
                    <span className="bb-cycle-dot" style={{ background: feed.cycle.color }} />
                    <span className="bb-cycle-label">{feed.cycle.state.toUpperCase()}</span>
                    <span className="bb-header-meta">W{week} · {month} {year}</span>
                    <button className="bb-style-toggle" onClick={toggleMarketStyle}
                        title={`${SettingsManager.getDisplayString('marketStyle')} — click to cycle`}>
                        {isTearsheet ? '◉' : isGallery ? '◐' : isArtnet ? '◆' : isSothebys ? '◈' : isDeitch ? '◎' : isByform ? '◻' : isWaterworks ? '◉' : '◑'}
                        <span className="bb-style-label">{SettingsManager.getDisplayString('marketStyle')}</span>
                    </button>
                    <PanelConfigDropdown
                        visiblePanels={visiblePanels}
                        setVisiblePanels={setVisiblePanels}
                        isGallery={isGallery}
                    />
                    <button className="bb-close" onClick={onClose}>✕</button>
                </div>
            </div>

            {/* Ticker — hidden in full-page styles */}
            {!isFullPageStyle && showPanel('ticker') && <TickerBar intel={intel} />}

            {/* Notifications — hidden in full-page styles */}
            {!isFullPageStyle && showPanel('notifications') && <NotificationBar notifications={notifications} onClickNotif={handleNotifClick} />}

            {/* Intel gate warning — hidden in full-page styles */}
            {!isFullPageStyle && intelGateMsg && <div className="bb-intel-gate">{intelGateMsg}</div>}

            {/* Status message toast */}
            {statusMsg && <div className="bb-status-toast">{statusMsg}</div>}

            {/* Tearsheet mode — Gagosian/Frieze exact-replica paginated view */}
            {isTearsheet && (
                <TearsheetView intel={intel} onSelectWork={handleSelectPortfolioWork} showPanel={showPanel}
                    feed={feed} selectedArtist={selectedArtist} onSelectArtist={setSelectedArtist}
                    onSelectTrade={handleSelectTrade} onListWork={handleListWork} />
            )}

            {/* Artnet mode — tabular auction results */}
            {isArtnet && (
                <ArtnetView intel={intel} onSelectWork={handleSelectPortfolioWork} showPanel={showPanel}
                    feed={feed} selectedArtist={selectedArtist} onSelectArtist={setSelectedArtist}
                    onSelectOrder={handleSelectOrder} onSelectTrade={handleSelectTrade} onListWork={handleListWork} />
            )}

            {/* Sotheby's mode — luxury lot-by-lot catalogue */}
            {isSothebys && (
                <SothebysView intel={intel} onSelectWork={handleSelectPortfolioWork} showPanel={showPanel}
                    feed={feed} selectedArtist={selectedArtist} onSelectArtist={setSelectedArtist}
                    onSelectTrade={handleSelectTrade} onListWork={handleListWork} />
            )}

            {/* Deitch mode — underground gallery masonry grid */}
            {isDeitch && (
                <DeitchView intel={intel} onSelectWork={handleSelectPortfolioWork} showPanel={showPanel}
                    feed={feed} selectedArtist={selectedArtist} onSelectArtist={setSelectedArtist}
                    onSelectTrade={handleSelectTrade} onListWork={handleListWork} />
            )}

            {/* Byform mode — Swiss modernist portfolio table */}
            {isByform && (
                <ByformView intel={intel} onSelectWork={handleSelectPortfolioWork} showPanel={showPanel}
                    feed={feed} onSelectTrade={handleSelectTrade} onListWork={handleListWork} />
            )}

            {/* Waterworks mode — deep blue SVG world map */}
            {isWaterworks && (
                <WaterworksView intel={intel} showPanel={showPanel} feed={feed} />
            )}

            {/* Gallery mode: Seventh House-inspired staggered grid */}
            {isGallery && (
                <GalleryView
                    intel={intel}
                    showPanel={showPanel}
                    feed={feed}
                    selectedArtist={selectedArtist}
                    onSelectArtist={setSelectedArtist}
                    onSelectWork={handleSelectPortfolioWork}
                    onSelectOrder={handleSelectOrder}
                    onSelectTrade={handleSelectTrade}
                    onListWork={handleListWork}
                />
            )}

            {/* Bloomberg dark mode: original 3-column grid */}
            {!isGallery && !isFullPageStyle && (
                <>
                    <div className="bb-grid bb-grid-3col">
                        <div className="bb-col">
                            {showPanel('leaderboard') && <ArtistLeaderboard
                                leaderboard={feed.leaderboard}
                                liveSparklines={feed.liveSparklines}
                                intel={intel}
                                selectedArtist={selectedArtist}
                                onSelect={setSelectedArtist}
                            />}
                            {showPanel('pricechart') && <PriceChart
                                artistId={selectedArtist}
                                priceHistory={feed.priceHistory}
                                liveSparklines={feed.liveSparklines}
                                intel={intel}
                            />}
                        </div>
                        <div className="bb-col">
                            {showPanel('orderbook') && <OrderBook intel={intel} onSelectOrder={handleSelectOrder} />}
                        </div>
                        <div className="bb-col">
                            {showPanel('overview') && <MarketOverview compositeIndex={feed.compositeIndex} cycle={feed.cycle} intel={intel} compositeHistory={feed.compositeHistory} sectorHistory={feed.sectorHistory} eventLog={feed.eventLog} />}
                            {showPanel('tradefeed') && <TradeFeed intel={intel} onSelectTrade={handleSelectTrade} />}
                        </div>
                    </div>
                    <div className="bb-bottom">
                        {showPanel('watchlist') && <Watchlist intel={intel} />}
                        {showPanel('portfolio') && <PortfolioTracker intel={intel} onListWork={handleListWork} onSelectWork={handleSelectPortfolioWork} />}
                        {showPanel('directory') && <NPCDirectoryPanel intel={intel} />}
                    </div>
                </>
            )}

            {/* Gallery footer — only in gallery mode */}
            {isGallery && (
                <div className="bb-gallery-footer">
                    <div className="bb-gallery-footer-brand">A R T L I F E</div>
                    <div className="bb-gallery-footer-locations">
                        New York &nbsp;·&nbsp; London &nbsp;·&nbsp; Basel &nbsp;·&nbsp; Hong Kong
                    </div>
                </div>
            )}

            {/* Tearsheet Modal */}
            {modalWork && (
                <ArtworkTearsheet
                    work={modalWork}
                    order={modalOrder}
                    intel={intel}
                    mode={modalMode}
                    onClose={closeModal}
                    onBuy={handleBuy}
                    onHaggle={handleHaggle}
                    onListConfirm={handleListConfirm}
                />
            )}
        </div>
    );
}
