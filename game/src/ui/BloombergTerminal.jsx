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
function TearsheetView({ intel, onSelectWork, showPanel }) {
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
                                <div className="ts-info-artist">
                                    <strong>{artistName}</strong>{lifespan ? ` (${lifespan})` : ''}
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

    return (
        <div className="an-view">
            {/* Red header bar */}
            <div className="an-header-bar">
                <span className="an-header-title">ARTLIFE PRICE DATABASE</span>
                <span className="an-header-sub">Week {week} · {city}</span>
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
                            <th className="an-th">Estimate</th>
                            <th className="an-th" onClick={() => toggleSort('price')}>Price{SortIcon({ k: 'price' })}</th>
                            <th className="an-th">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allItems.map((work, i) => {
                            const roi = work.purchasePrice > 0
                                ? ((work.currentVal - work.purchasePrice) / work.purchasePrice * 100).toFixed(1) : null;
                            return (
                                <tr key={work.id || i} className="an-row"
                                    onClick={() => onSelectWork && onSelectWork(work)}
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
                                        <div className="an-artist-name">{work.artist || 'Unknown'}</div>
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
                            );
                        })}
                    </tbody>
                </table>
            )}

            {/* ── Additional panels below the table ── */}
            <div className="an-panels">
                {showPanel('playerstats') && <PlayerStatsPanel />}
                {showPanel('networth') && <NetWorthPanel intel={intel} />}
                {showPanel('leaderboard') && feed && (
                    <ArtistLeaderboard
                        leaderboard={feed.leaderboard}
                        liveSparklines={feed.liveSparklines}
                        intel={intel}
                        selectedArtist={selectedArtist}
                        onSelect={onSelectArtist}
                    />
                )}
                {showPanel('pricechart') && feed && (
                    <PriceChart
                        artistId={selectedArtist}
                        priceHistory={feed.priceHistory}
                        liveSparklines={feed.liveSparklines}
                        intel={intel}
                    />
                )}
                {showPanel('tradefeed') && <TradeFeed intel={intel} onSelectTrade={onSelectTrade} />}
                {showPanel('txhistory') && <TransactionHistoryPanel intel={intel} />}
                {showPanel('watchlist') && <Watchlist intel={intel} />}
                {showPanel('portfolio') && (
                    <PortfolioTracker intel={intel} onListWork={onListWork} onSelectWork={onSelectWork} />
                )}
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

            {/* ── Additional panels below lots ── */}
            <div className="sb-panels">
                {showPanel('playerstats') && <PlayerStatsPanel />}
                {showPanel('networth') && <NetWorthPanel intel={intel} />}
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
                {showPanel('txhistory') && <TransactionHistoryPanel intel={intel} />}
                {showPanel('watchlist') && <Watchlist intel={intel} />}
                {showPanel('portfolio') && (
                    <PortfolioTracker intel={intel} onListWork={onListWork} onSelectWork={onSelectWork} />
                )}
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

            {/* ── Additional panels below cards ── */}
            <div className="dp-panels">
                {showPanel('playerstats') && <PlayerStatsPanel />}
                {showPanel('networth') && <NetWorthPanel intel={intel} />}
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
                {showPanel('txhistory') && <TransactionHistoryPanel intel={intel} />}
                {showPanel('watchlist') && <Watchlist intel={intel} />}
                {showPanel('portfolio') && (
                    <PortfolioTracker intel={intel} onListWork={onListWork} onSelectWork={onSelectWork} />
                )}
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

    // Market style — gallery, tearsheet, artnet, sothebys, deitch, or bloomberg dark
    const [marketStyle, setMarketStyle] = useState(() => SettingsManager.get('marketStyle'));
    const isGallery = marketStyle === 'gallery';
    const isTearsheet = marketStyle === 'tearsheet';
    const isArtnet = marketStyle === 'artnet';
    const isSothebys = marketStyle === 'sothebys';
    const isDeitch = marketStyle === 'deitch';
    // Any "full-page" style that replaces the 3-column grid
    const isFullPageStyle = isTearsheet || isArtnet || isSothebys || isDeitch;

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
        <div className={`bb-overlay${isGallery ? ' bb-gallery' : ''}${isTearsheet ? ' bb-tearsheet-mode' : ''}${isArtnet ? ' bb-artnet' : ''}${isSothebys ? ' bb-sothebys' : ''}${isDeitch ? ' bb-deitch' : ''}`}>
            {/* Header */}
            <div className="bb-header">
                <div className="bb-header-left">
                    {(isGallery || isTearsheet)
                        ? <span className="bb-logo">A R T L I F E</span>
                        : isArtnet
                        ? <span className="bb-logo">artlife</span>
                        : isSothebys
                        ? <span className="bb-logo">ARTLIFE</span>
                        : isDeitch
                        ? <span className="bb-logo">DEITCH</span>
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
                        title={`Style: ${marketStyle} — click to cycle`}>
                        {isTearsheet ? '◉' : isGallery ? '◐' : isArtnet ? '◆' : isSothebys ? '◈' : isDeitch ? '◎' : '◑'}
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
                <TearsheetView intel={intel} onSelectWork={handleSelectPortfolioWork} showPanel={showPanel} />
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

            {/* Gallery mode: single-column document flow */}
            {isGallery && (
                <div className="bb-grid bb-grid-3col">
                    <div className="bb-col">
                        {showPanel('playerstats') && <PlayerStatsPanel />}
                        {showPanel('networth') && <NetWorthPanel intel={intel} />}
                        {showPanel('collection') && <CollectionPanel intel={intel} onSelectWork={handleSelectPortfolioWork} />}
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
                        {showPanel('orderbook') && <OrderBook intel={intel} onSelectOrder={handleSelectOrder} />}
                        {showPanel('overview') && <MarketOverview compositeIndex={feed.compositeIndex} cycle={feed.cycle} intel={intel} />}
                        {showPanel('tradefeed') && <TradeFeed intel={intel} onSelectTrade={handleSelectTrade} />}
                        {showPanel('txhistory') && <TransactionHistoryPanel intel={intel} />}
                        {showPanel('watchlist') && <Watchlist intel={intel} />}
                    </div>
                </div>
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
                            {showPanel('overview') && <MarketOverview compositeIndex={feed.compositeIndex} cycle={feed.cycle} intel={intel} />}
                            {showPanel('tradefeed') && <TradeFeed intel={intel} onSelectTrade={handleSelectTrade} />}
                        </div>
                    </div>
                    <div className="bb-bottom">
                        {showPanel('watchlist') && <Watchlist intel={intel} />}
                        {showPanel('portfolio') && <PortfolioTracker intel={intel} onListWork={handleListWork} onSelectWork={handleSelectPortfolioWork} />}
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
