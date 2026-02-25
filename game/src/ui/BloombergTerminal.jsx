/**
 * BloombergTerminal.jsx — Multi-Style Art Market Trading Terminal
 *
 * ARCHITECTURE: Now a thin shell that imports from dashboard/ sub-modules.
 *
 * Sub-modules:
 *   dashboardUtils.js  — intel masking, AP helpers, formatting, sparkline
 *   panels.jsx         — market panels (ticker, leaderboard, orderbook, etc.)
 *   layouts.jsx        — SharedPanelGrid, ArtnetLayout, TearsheetLayout
 *   views.jsx          — full-page view styles (gallery, tearsheet, artnet, etc.)
 *   modals.jsx         — StyleGuideView, EventOverlay, PanelConfigDropdown
 *
 * @see BloombergTerminal.css for all styles (8000+ lines)
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useBloombergFeed } from '../hooks/useBloombergFeed.js';
import { GameState } from '../managers/GameState.js';
import { MarketManager } from '../managers/MarketManager.js';
import { MarketSimulator } from '../managers/MarketSimulator.js';
import { HaggleManager } from '../managers/HaggleManager.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { ARTWORKS } from '../data/artworks.js';
import { VIEW } from '../core/views.js';
import { TerminalAPI } from './terminal/TerminalAPI.js';
import { SettingsManager } from '../managers/SettingsManager.js';
import { useEventStore } from '../stores/eventStore.js';
import BloombergTutorial from './BloombergTutorial.jsx';
import HaggleOverlay from './email/haggle/HaggleOverlay.jsx';
import './BloombergTerminal.css';

// Dashboard sub-modules (direct imports — barrel caused Vite HMR issues)
import { fmtNum, maskPrice, getAP, hasAP, useAPAndCheckEvents } from './dashboard/dashboardUtils.jsx';
import {
    TickerBar, ArtistLeaderboard, OrderBook, MarketOverview,
    PriceChart, TradeFeed, Watchlist, PortfolioTracker,
    NotificationBar, ArtworkTearsheet,
    ArtistDetailPanel, ArtworkValuationPanel, CollectorProfilePanel,
} from './dashboard/panels.jsx';
import {
    GalleryView, TearsheetView, ArtnetView, SothebysView,
    DeitchView, ByformView, WaterworksView, PanelConfigDropdown,
} from './dashboard/views.jsx';
import { StyleGuideView, EventOverlay } from './dashboard/modals.jsx';

// ══════════════════════════════════════════════════════════════
// Main Bloomberg Terminal
// ══════════════════════════════════════════════════════════════
export default function BloombergTerminal({ onClose, onBrowseMarketplace }) {
    const feed = useBloombergFeed();

    // State
    const [selectedArtist, setSelectedArtist] = useState(null);
    const [modalWork, setModalWork] = useState(null);
    const [modalOrder, setModalOrder] = useState(null);
    const [modalMode, setModalMode] = useState('buy'); // 'buy', 'sell'
    const [showTutorial, setShowTutorial] = useState(!SettingsManager.get('hasSeenBloombergIntro', false));
    const [activeHaggle, setActiveHaggle] = useState(null);
    const [statusMsg, setStatusMsg] = useState(null);
    const [lightboxUrl, setLightboxUrl] = useState(null);
    const [drilldown, setDrilldown] = useState(null); // { type: 'artist'|'artwork'|'collector', id: string }
    const [, forceRender] = useState(0);

    // Pending event overlay — driven by useEventStore
    const pendingEvent = useEventStore(s => s.pendingEvent);

    // Market style — gallery, tearsheet, artnet, sothebys, deitch, or bloomberg dark
    const [marketStyle, setMarketStyle] = useState(() => SettingsManager.get('marketStyle'));
    const isGallery = marketStyle === 'gallery';
    const isTearsheet = marketStyle === 'tearsheet';
    const isArtnet = marketStyle === 'artnet';
    const isSothebys = marketStyle === 'sothebys';
    const isDeitch = marketStyle === 'deitch';
    const isByform = marketStyle === 'byform';
    const isWaterworks = marketStyle === 'waterworks';
    const isStyleGuide = marketStyle === 'styleguide';
    // Any "full-page" style that replaces the 3-column grid
    const isFullPageStyle = isTearsheet || isArtnet || isSothebys || isDeitch || isByform || isWaterworks || isStyleGuide;

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
        useAPAndCheckEvents('Bloomberg purchase', 1);
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

    // Haggle action
    const handleHaggle = useCallback((orderOrData) => {
        if (!hasAP(2)) { setStatusMsg('Not enough AP (need 2)'); return; }
        useAPAndCheckEvents('Bloomberg counter offer', 2);

        let haggleInfo;
        if (orderOrData?.id && TerminalAPI?.bloomberg?.prepareHaggle) {
            const haggleData = TerminalAPI.bloomberg.prepareHaggle(orderOrData.id);
            if (!haggleData) { setStatusMsg('Order no longer available'); return; }
            haggleInfo = HaggleManager.start(haggleData);
        } else {
            haggleInfo = HaggleManager.start(orderOrData);
        }

        closeModal();
        setActiveHaggle(haggleInfo);
    }, [closeModal]);

    // Inquire → Gmail compose flow
    const handleInquireEmail = useCallback((work, ownerData) => {
        if (!hasAP(2)) { setStatusMsg('Not enough AP (need 2)'); return; }
        useAPAndCheckEvents('Bloomberg inquiry email', 2);
        closeModal();
        const artist = work._artist?.name || work.artist || 'Unknown Artist';
        const title = work.title || 'Untitled';
        const owner = ownerData?.sellerName || ownerData?.npc?.name || work._ownerData?.sellerName || 'Gallery';
        const price = ownerData?.askPrice || work.currentVal || 0;
        const fmtPrice = price >= 1_000_000 ? `$${(price / 1_000_000).toFixed(2)}M` : price >= 1_000 ? `$${(price / 1_000).toFixed(0)}k` : `$${price.toLocaleString()}`;
        window.dispatchEvent(new CustomEvent('openGmailCompose', {
            detail: {
                to: `${owner.toLowerCase().replace(/\s+/g, '.')}@artnet.com`,
                subject: `Inquiry: ${artist} — ${title}`,
                body: `Dear ${owner},\n\nI am writing to inquire about the availability of:\n\n${artist}\n"${title}"\nListed at ${fmtPrice}\n\nI would appreciate any additional information regarding provenance, condition, and the possibility of a private viewing.\n\nBest regards`
            }
        }));
    }, [closeModal]);

    // List for sale action
    const handleListConfirm = useCallback((work, tier) => {
        if (!hasAP(2)) { setStatusMsg('Not enough AP (need 2)'); return; }
        useAPAndCheckEvents('Bloomberg listing', 2);
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
        <div className={`bb-overlay${isGallery ? ' bb-gallery' : ''}${isTearsheet ? ' bb-tearsheet-mode' : ''}${isArtnet ? ' bb-artnet' : ''}${isSothebys ? ' bb-sothebys' : ''}${isDeitch ? ' bb-deitch' : ''}${isByform ? ' bb-byform' : ''}${isWaterworks ? ' bb-waterworks' : ''}${isStyleGuide ? ' bb-styleguide' : ''}`}>
            {/* Tutorial Overlay */}
            {showTutorial && (
                <BloombergTutorial onClose={() => {
                    setShowTutorial(false);
                    SettingsManager.set('hasSeenBloombergIntro', true);
                }} />
            )}

            {/* Unified Email Overlay — handles both static deal events and haggle negotiations */}
            {(pendingEvent?.isEmail || activeHaggle) && (
                <HaggleOverlay
                    mode={activeHaggle ? 'haggle' : 'static'}
                    event={pendingEvent?.isEmail ? pendingEvent : undefined}
                    haggleInfo={activeHaggle || undefined}
                    onComplete={() => {
                        if (pendingEvent?.isEmail) {
                            useEventStore.getState().consumePendingEvent();
                        }
                        if (activeHaggle) {
                            setActiveHaggle(null);
                        }
                        forceRender(n => n + 1);
                    }}
                />
            )}
            {/* Non-email Event Overlay */}
            {pendingEvent && !pendingEvent.isEmail && !activeHaggle && (
                <EventOverlay
                    event={pendingEvent}
                    onComplete={(choiceData) => {
                        useEventStore.getState().consumePendingEvent();
                        forceRender(n => n + 1);
                    }}
                />
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
                            import('./terminal/screens/index.js').then(screens => ui?.pushScreen(screens.cityScreen(ui)));
                            GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
                            if (onClose) onClose();
                        }} title="Access World Map & Locations">[ WORLD MAP ]</button>
                        <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => {
                            const ui = window.TerminalUIInstance;
                            import('./terminal/screens/index.js').then(screens => ui?.pushScreen(screens.phoneScreen(ui)));
                            GameEventBus.emit(GameEvents.UI_ROUTE, 'TERMINAL');
                            if (onClose) onClose();
                        }} title="Check Messages & Contacts">[ PHONE ]</button>
                        {onBrowseMarketplace && (
                            <button style={{ background: 'none', border: 'none', color: '#ff4b00', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }} onClick={onBrowseMarketplace} title="Search Artnet Marketplace">[ ARTNET SEARCH ]</button>
                        )}
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
                        {isTearsheet ? '◉' : isGallery ? '◐' : isArtnet ? '◆' : isSothebys ? '◈' : isDeitch ? '◎' : isByform ? '◻' : isWaterworks ? '◉' : isStyleGuide ? '◇' : '◑'}
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
                    onSelectOrder={handleSelectOrder} onSelectTrade={handleSelectTrade} onListWork={handleListWork}
                    onHaggle={handleHaggle} onImageClick={(url) => setLightboxUrl(url)} onInquireEmail={handleInquireEmail} />
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

            {/* Style Guide mode — design system reference */}
            {isStyleGuide && <StyleGuideView />}

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

                    {/* Drill-down panels — slide in from right */}
                    {drilldown && (
                        <div className="bb-drilldown">
                            {drilldown.type === 'artist' && (
                                <ArtistDetailPanel
                                    artistId={drilldown.id}
                                    intel={intel}
                                    onSelectWork={(w) => { setDrilldown({ type: 'artwork', id: w.id }); }}
                                    onClose={() => setDrilldown(null)}
                                />
                            )}
                            {drilldown.type === 'artwork' && (
                                <ArtworkValuationPanel
                                    workId={drilldown.id}
                                    intel={intel}
                                    onClose={() => setDrilldown(null)}
                                />
                            )}
                            {drilldown.type === 'collector' && (
                                <CollectorProfilePanel
                                    ownerId={drilldown.id}
                                    intel={intel}
                                    onSelectWork={(w) => { setDrilldown({ type: 'artwork', id: w.id }); }}
                                    onClose={() => setDrilldown(null)}
                                />
                            )}
                        </div>
                    )}
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
                    onImageClick={(url) => setLightboxUrl(url)}
                    onInquireEmail={handleInquireEmail}
                />
            )}

            {/* ═══ Artwork Image Lightbox ═══ */}
            {lightboxUrl && (
                <div className="bb-lightbox" onClick={() => setLightboxUrl(null)}>
                    <img className="bb-lightbox-img" src={lightboxUrl} alt="" onClick={e => e.stopPropagation()} />
                    <button className="bb-lightbox-close" onClick={() => setLightboxUrl(null)}>✕</button>
                </div>
            )}
        </div>
    );
}
