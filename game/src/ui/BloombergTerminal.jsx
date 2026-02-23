/**
 * BloombergTerminal.jsx — Full-screen art market terminal overlay.
 *
 * A Bloomberg-style real-time market dashboard showing:
 *   1. Scrolling ticker bar (headlines + recent trades)
 *   2. Artist leaderboard with heat bars and index scores
 *   3. Market overview panel (composite index, cycle, volume)
 *   4. Price chart (sparkline/candlestick per selected artist)
 *   5. Live trade feed
 *   6. Player watchlist
 *   7. Portfolio tracker with ROI
 *
 * Data gated by player `intel` stat for progressive disclosure.
 * Launched from dashboard or Market Intel terminal option.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useBloombergFeed } from '../hooks/useBloombergFeed.js';
import { GameState } from '../managers/GameState.js';
import { MarketManager } from '../managers/MarketManager.js';
import { MarketSimulator } from '../managers/MarketSimulator.js';
import { CONTACTS } from '../data/contacts.js';
import { ARTWORKS } from '../data/artworks.js';
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

// ── 1. Ticker Bar ──
function TickerBar({ intel }) {
    const s = GameState.state;
    const trades = MarketSimulator.getTradeLog().slice(-5);
    const news = (s?.newsFeed || []).slice(-5).reverse();

    const items = [];
    trades.forEach(t => {
        const buyer = CONTACTS.find(c => c.id === t.buyer);
        const artwork = ARTWORKS.find(a => a.id === t.artwork);
        const name = intel >= 60 ? (buyer?.name || t.buyer) : 'Unknown';
        const title = artwork?.title || t.artwork;
        items.push(`${name} acquired "${title}" — ${maskPrice(t.price, intel)}`);
    });
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

// ── 2. Artist Leaderboard ──
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
                        <div
                            key={artist.id}
                            className={`bb-lb-row${isSelected ? ' selected' : ''}`}
                            onClick={() => onSelect(artist.id)}
                        >
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

// ── 3. Market Overview ──
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

// ── 4. Price Chart ──
function PriceChart({ artistId, priceHistory, liveSparklines, intel }) {
    const history = priceHistory[artistId] || [];
    const liveData = liveSparklines[artistId] || [];
    const artist = MarketManager.artists?.find(a => a.id === artistId);
    const artistName = artist?.name || artistId;

    // Combine weekly history with live intra-week data
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

    // Build SVG path for weekly (solid) and live (dashed)
    const w = 280;
    const h = 80;
    const weeklyPoints = weeklyPrices.map((v, i) =>
        `${(i / Math.max(1, allData.length - 1)) * w},${h - ((v - min) / range) * h}`
    ).join(' ');

    const livePoints = liveData.map((v, i) =>
        `${((weeklyPrices.length + i) / Math.max(1, allData.length - 1)) * w},${h - ((v - min) / range) * h}`
    ).join(' ');

    // High/low band
    const highY = h - ((max - min) / range) * h;
    const lowY = h;

    return (
        <div className="bb-panel bb-chart">
            <div className="bb-panel-header">
                PRICE CHART — {mask(artistName, intel, 20)}
            </div>
            <div className="bb-chart-price">
                <span className="bb-chart-current">{maskPrice(latest, intel)}</span>
                <span className={`bb-chart-delta ${deltaClass}`}>{delta > 0 ? '+' : ''}{delta}%</span>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="bb-chart-svg">
                {/* High/Low band */}
                <line x1="0" y1={highY} x2={w} y2={highY} stroke="rgba(0,229,255,0.1)" strokeDasharray="4" />
                <line x1="0" y1={lowY} x2={w} y2={lowY} stroke="rgba(201,64,64,0.1)" strokeDasharray="4" />
                {/* Weekly line */}
                {weeklyPoints && <polyline points={weeklyPoints} fill="none" stroke="#00e5ff" strokeWidth="1.5" />}
                {/* Live intra-week line */}
                {livePoints && <polyline points={livePoints} fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeDasharray="3" />}
            </svg>
            <div className="bb-chart-labels">
                <span>H: {maskPrice(max, intel)}</span>
                <span>L: {maskPrice(min, intel)}</span>
            </div>
        </div>
    );
}

// ── 5. Trade Feed ──
function TradeFeed({ intel }) {
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
                        <div key={i} className="bb-trade-row">
                            <span className="bb-trade-week">W{t.week}</span>
                            <span className="bb-trade-parties">
                                {buyerName} ← {sellerName}
                            </span>
                            <span className="bb-trade-title">"{artwork?.title || t.artwork}"</span>
                            <span className="bb-trade-price">{maskPrice(t.price, intel)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── 6. Watchlist ──
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
                        ? Math.round(works.reduce((s, w) => s + w.price, 0) / works.length)
                        : 0;
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

// ── 7. Portfolio Tracker ──
function PortfolioTracker({ intel }) {
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

    const totalValue = items.reduce((s, w) => s + w.currentVal, 0);
    const totalCost = items.reduce((s, w) => s + (w.purchasePrice || w.basePrice || 0), 0);
    const totalROI = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100).toFixed(1) : 0;

    return (
        <div className="bb-panel bb-portfolio">
            <div className="bb-panel-header">
                PORTFOLIO TRACKER
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
                        <span className="bb-port-title">"{work.title}"</span>
                        <span className="bb-port-artist">{work.artist}</span>
                        <span className="bb-port-price">{maskPrice(work.currentVal, intel)}</span>
                        <span className={`bb-port-roi ${work.roi > 0 ? 'up' : work.roi < 0 ? 'down' : ''}`}>
                            {work.roi > 0 ? '+' : ''}{work.roi}%
                        </span>
                    </div>
                ))}
                {items.length > 6 && (
                    <div className="bb-port-more">+{items.length - 6} more works</div>
                )}
            </div>
        </div>
    );
}

// ── Main Bloomberg Terminal ──
export default function BloombergTerminal({ onClose }) {
    const feed = useBloombergFeed();
    const [selectedArtist, setSelectedArtist] = useState(null);
    const s = GameState.state;
    const intel = s?.intel || 0;
    const week = s?.week || 1;
    const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Math.floor((week - 1) / 4) % 12];
    const year = 2024 + Math.floor((week - 1) / 52);

    // Auto-select first artist if none selected
    useEffect(() => {
        if (!selectedArtist && feed.leaderboard.length > 0) {
            setSelectedArtist(feed.leaderboard[0].id);
        }
    }, [feed.leaderboard]);

    // Intel gate message
    const intelGateMsg = intel < 20
        ? 'LOW INTEL — Most market data obscured. Increase your intel stat to reveal more.'
        : intel < 40
        ? 'LIMITED INTEL — Prices rounded. Increase intel for precise data.'
        : intel < 60
        ? 'MODERATE INTEL — Trade parties hidden. Intel 60+ reveals identities.'
        : null;

    return (
        <div className="bb-overlay">
            {/* Header */}
            <div className="bb-header">
                <div className="bb-header-left">
                    <span className="bb-logo">████</span>
                    <span className="bb-title">ARTLIFE MARKET TERMINAL</span>
                </div>
                <div className="bb-header-right">
                    <span className="bb-cycle-dot" style={{ background: feed.cycle.color }} />
                    <span className="bb-cycle-label">{feed.cycle.state.toUpperCase()}</span>
                    <span className="bb-header-meta">W{week} · {month} {year}</span>
                    <button className="bb-close" onClick={onClose}>✕</button>
                </div>
            </div>

            {/* Ticker */}
            <TickerBar intel={intel} />

            {/* Intel gate warning */}
            {intelGateMsg && <div className="bb-intel-gate">{intelGateMsg}</div>}

            {/* Main Grid */}
            <div className="bb-grid">
                {/* Left column */}
                <div className="bb-col-left">
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

                {/* Right column */}
                <div className="bb-col-right">
                    <MarketOverview
                        compositeIndex={feed.compositeIndex}
                        cycle={feed.cycle}
                        intel={intel}
                    />
                    <TradeFeed intel={intel} />
                </div>
            </div>

            {/* Bottom row */}
            <div className="bb-bottom">
                <Watchlist intel={intel} />
                <PortfolioTracker intel={intel} />
            </div>
        </div>
    );
}
