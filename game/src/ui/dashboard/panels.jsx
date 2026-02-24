/**
 * panels.jsx — Bloomberg Terminal Market & Portfolio Panels
 *
 * Extracted from BloombergTerminal.jsx monolith.
 * Contains: TickerBar, ArtistLeaderboard, OrderBook, MarketOverview,
 * PriceChart, TradeFeed, Watchlist, PortfolioTracker, NotificationBar,
 * ArtworkTearsheet, PlayerStatsPanel, NetWorthPanel, NPCDirectoryPanel,
 * CollectionPanel, TransactionHistoryPanel
 */

import React, { useState, useMemo } from 'react';
import { GameState } from '../../managers/GameState.js';
import { MarketManager } from '../../managers/MarketManager.js';
import { MarketSimulator } from '../../managers/MarketSimulator.js';
import { TerminalAPI } from '../../terminal/TerminalAPI.js';
import { CONTACTS } from '../../data/contacts.js';
import { ARTWORKS } from '../../data/artworks.js';
import { useNPCStore } from '../../stores/npcStore.js';
import { useCmsStore } from '../../stores/cmsStore.js';
import { clamp } from '../../utils/math.js';
import {
    mask, maskPrice, fmtNum, tearsheetPrice,
    MiniSparkline, resolveImageUrl, ROLE_COLORS,
    hasAP, useAPAndCheckEvents,
} from './dashboardUtils.jsx';

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
                    const heatPct = clamp(artist.heat, 0, 100);
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
                        <span className="bb-ob-price">{maskPrice(order.askPrice, intel, order.inquire)}</span>
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
                            <span className="bb-listing-price">{listing.inquire ? 'Inquire' : `$${fmtNum(listing.askPrice)}`}</span>
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
function ArtworkTearsheet({ work, order, intel, onClose, onBuy, onHaggle, mode, onListConfirm, onImageClick, onInquireEmail }) {
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
    const imageUrl = resolveImageUrl(artwork);
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
                        <img
                            className="bb-ts-photo-img bb-ts-photo-clickable"
                            src={imageUrl}
                            alt={title}
                            onClick={() => onImageClick?.(imageUrl)}
                            title="Click to view full size"
                        />
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
                        {!order.inquire ? (
                            <>
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
                            </>
                        ) : (
                            <button className="bb-ts-btn bb-ts-btn-primary"
                                disabled={!hasAP(2)}
                                onClick={() => onInquireEmail ? onInquireEmail(work, work._ownerData) : onHaggle(order)}>
                                INQUIRE <span className="bb-ts-ap">[2 AP]</span>
                            </button>
                        )}
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

// ═══ Exports ═══
export { TickerBar, ArtistLeaderboard, OrderBook, MarketOverview, PriceChart, TradeFeed, Watchlist, PortfolioTracker, NotificationBar, ArtworkTearsheet, PlayerStatsPanel, NetWorthPanel, NPCDirectoryPanel, CollectionPanel, TransactionHistoryPanel };
