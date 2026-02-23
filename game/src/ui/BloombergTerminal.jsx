/**
 * BloombergTerminal.jsx — Interactive art market trading terminal.
 *
 * Bloomberg v2: Full trading interface with:
 *   1. Scrolling ticker bar (headlines + recent trades + new orders)
 *   2. Artist leaderboard with heat bars and index scores
 *   3. Order Book — live NPC sell/buy orders (new)
 *   4. Market overview panel (composite index, cycle, volume)
 *   5. Price chart (sparkline per selected artist)
 *   6. Live trade feed
 *   7. Player watchlist
 *   8. Portfolio tracker with sell actions (new)
 *   9. Artwork Tearsheet modal — gallery-style detail + buy/haggle (new)
 *  10. Notification bar for watchlist alerts (new)
 *
 * Data gated by player `intel` stat for progressive disclosure.
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
import './BloombergTerminal.css';

// ── Intel-gated data masking ──
function mask(value, intel, threshold, fallback = '???') {
    return intel >= threshold ? value : fallback;
}

function maskPrice(price, intel) {
    if (intel >= 40) return `$${price.toLocaleString()}`;
    if (intel >= 20) return `$${(Math.round(price / 10000) * 10000).toLocaleString()}`;
    return '$???';
}

/** Format price with full decimals for tearsheet (Seventh House style) */
function tearsheetPrice(price) {
    return `$ ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
function MarketOverview({ compositeIndex, cycle, intel }) {
    const s = GameState.state;
    const report = MarketSimulator.getWeeklyReport();
    const onMarket = MarketManager.works?.filter(w => w.onMarket).length || 0;
    const tradeCount = report?.tradesExecuted || 0;
    const volume = report?.totalVolume || 0;

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
                    <span className="bb-ov-value">{mask(`$${volume.toLocaleString()}`, intel, 40)}</span>
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

    const items = portfolio.map(work => {
        let currentVal = 0;
        try { currentVal = MarketManager.calculatePrice(work, false); }
        catch { currentVal = work.price || work.basePrice || 0; }
        const purchasePrice = work.purchasePrice || work.basePrice || currentVal;
        const roi = purchasePrice > 0 ? ((currentVal - purchasePrice) / purchasePrice * 100).toFixed(1) : 0;
        return { ...work, currentVal, roi };
    });

    const totalValue = items.reduce((sum, w) => sum + w.currentVal, 0);
    const totalCost = items.reduce((sum, w) => sum + (w.purchasePrice || w.basePrice || 0), 0);
    const totalROI = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100).toFixed(1) : 0;

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
            <div className="bb-portfolio-list">
                {items.slice(0, 6).map((work, i) => (
                    <div key={i} className="bb-port-row">
                        <span className="bb-port-title" onClick={() => onSelectWork(work)}
                            style={{ cursor: 'pointer' }}>"{work.title}"</span>
                        <span className="bb-port-artist">{work.artist}</span>
                        <span className="bb-port-price">{maskPrice(work.currentVal, intel)}</span>
                        <span className={`bb-port-roi ${work.roi > 0 ? 'up' : work.roi < 0 ? 'down' : ''}`}>
                            {work.roi > 0 ? '+' : ''}{work.roi}%
                        </span>
                        <button className="bb-port-list-btn" onClick={() => onListWork(work)}>LIST</button>
                    </div>
                ))}
                {items.length > 6 && (
                    <div className="bb-port-more">+{items.length - 6} more works</div>
                )}
            </div>
            {/* Active listings */}
            {listings.length > 0 && (
                <div className="bb-listings-section">
                    <div className="bb-panel-header" style={{ marginTop: 8 }}>ACTIVE LISTINGS</div>
                    {listings.map(listing => (
                        <div key={listing.id} className="bb-listing-row">
                            <span className="bb-listing-title">"{listing.title}"</span>
                            <span className="bb-listing-tier">{listing.tier.toUpperCase()}</span>
                            <span className="bb-listing-price">${listing.askPrice.toLocaleString()}</span>
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
                                {p.type} — Week {p.week}{p.city ? `, ${p.city}` : ''}{p.price ? ` — $${p.price.toLocaleString()}` : ''}
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

    // Market style — gallery tearsheet (default) or bloomberg dark
    const [marketStyle, setMarketStyle] = useState(() => SettingsManager.get('marketStyle'));
    const isGallery = marketStyle === 'gallery';

    const toggleMarketStyle = useCallback(() => {
        SettingsManager.cycleNext('marketStyle');
        setMarketStyle(SettingsManager.get('marketStyle'));
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
            setStatusMsg(`Acquired "${order.title}" for $${order.askPrice.toLocaleString()}`);
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
            setStatusMsg(`Listed "${work.title}" (${tier}) at $${result.listing.askPrice.toLocaleString()}`);
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
        <div className={`bb-overlay${isGallery ? ' bb-gallery' : ''}`}>
            {/* Header */}
            <div className="bb-header">
                <div className="bb-header-left">
                    {isGallery
                        ? <span className="bb-logo">A R T L I F E</span>
                        : <><span className="bb-logo">████</span><span className="bb-title">ARTLIFE MARKET TERMINAL</span></>
                    }
                </div>
                <div className="bb-header-right">
                    <span className="bb-cash">${(s?.cash || 0).toLocaleString()}</span>
                    <span className="bb-ap">{getAP()} AP</span>
                    <span className="bb-cycle-dot" style={{ background: feed.cycle.color }} />
                    <span className="bb-cycle-label">{feed.cycle.state.toUpperCase()}</span>
                    <span className="bb-header-meta">W{week} · {month} {year}</span>
                    <button className="bb-style-toggle" onClick={toggleMarketStyle}
                        title={isGallery ? 'Switch to Bloomberg Dark' : 'Switch to Gallery Tearsheet'}>
                        ◐
                    </button>
                    <button className="bb-close" onClick={onClose}>✕</button>
                </div>
            </div>

            {/* Ticker */}
            <TickerBar intel={intel} />

            {/* Notifications */}
            <NotificationBar notifications={notifications} onClickNotif={handleNotifClick} />

            {/* Intel gate warning */}
            {intelGateMsg && <div className="bb-intel-gate">{intelGateMsg}</div>}

            {/* Status message toast */}
            {statusMsg && <div className="bb-status-toast">{statusMsg}</div>}

            {/* Main 3-column Grid */}
            <div className="bb-grid bb-grid-3col">
                {/* Left column */}
                <div className="bb-col">
                    <ArtistLeaderboard
                        leaderboard={feed.leaderboard}
                        liveSparklines={feed.liveSparklines}
                        intel={intel}
                        selectedArtist={selectedArtist}
                        onSelect={setSelectedArtist}
                    />
                    <PriceChart
                        artistId={selectedArtist}
                        priceHistory={feed.priceHistory}
                        liveSparklines={feed.liveSparklines}
                        intel={intel}
                    />
                </div>

                {/* Center column — Order Book */}
                <div className="bb-col">
                    <OrderBook intel={intel} onSelectOrder={handleSelectOrder} />
                </div>

                {/* Right column */}
                <div className="bb-col">
                    <MarketOverview compositeIndex={feed.compositeIndex} cycle={feed.cycle} intel={intel} />
                    <TradeFeed intel={intel} onSelectTrade={handleSelectTrade} />
                </div>
            </div>

            {/* Bottom row */}
            <div className="bb-bottom">
                <Watchlist intel={intel} />
                <PortfolioTracker intel={intel} onListWork={handleListWork} onSelectWork={handleSelectPortfolioWork} />
            </div>

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
