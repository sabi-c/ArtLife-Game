import React, { useState } from 'react';

export default function BloombergTutorial({ onClose }) {
    const [step, setStep] = useState(0);

    const slides = [
        {
            title: "WELCOME TO THE MARKET",
            body: (
                <>
                    <p>This is your primary interface for trading, analyzing trends, and tracking the global art market.</p>
                    <p>All prices and data here react dynamically to in-game events, gallery shows, and your own actions.</p>
                </>
            ),
            highlight: null // dim everything
        },
        {
            title: "TICKER & LEADERBOARD",
            body: (
                <>
                    <p>The top ticker and the <strong>ARTIST INDEX</strong> panel track the heat and pricing of the most volatile artists.</p>
                    <p>When artists get hot (green arrows), their base prices multiply. When they cool off, prices crash.</p>
                </>
            ),
            highlight: 'bb-leaderboard'
        },
        {
            title: "THE ORDER BOOK",
            body: (
                <>
                    <p>The <strong>ORDER BOOK</strong> is where you trade. You can buy artworks directly from the "Sell Listings".</p>
                    <p>Switch to "Buy Orders" to see which NPCs are actively looking for specific genres, and fulfill their requests manually.</p>
                </>
            ),
            highlight: 'bb-orderbook'
        },
        {
            title: "YOUR PORTFOLIO",
            body: (
                <>
                    <p>Your <strong>COLLECTION</strong> and <strong>NET WORTH</strong> panels track your active inventory and liquidity.</p>
                    <p>Remember: art is an illiquid asset. Don't spend all your cash, or you won't be able to buy when the market crashes.</p>
                </>
            ),
            highlight: 'bb-portfolio' // Will highlight both collection and stats usually
        }
    ];

    const currentSlide = slides[step];

    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 99999, overflow: 'hidden',
            pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            {/* Dimmed Background */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundColor: 'rgba(5, 5, 8, 0.85)',
                backdropFilter: 'blur(3px)'
            }} />

            {/* Instruction Modal */}
            <div style={{
                position: 'relative', zIndex: 10,
                width: 400, background: '#111', border: '1px solid #c9a84c',
                borderRadius: 4, padding: 24, paddingBottom: 60,
                boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.3)'
            }}>
                <h2 style={{
                    fontFamily: "'SF Mono', monospace", fontSize: 16, color: '#c9a84c',
                    margin: '0 0 16px', letterSpacing: 1
                }}>
                    [{step + 1}/{slides.length}] {currentSlide.title}
                </h2>
                <div style={{
                    fontFamily: "var(--font-body)", fontSize: 13, color: '#ddd',
                    lineHeight: 1.6
                }}>
                    {currentSlide.body}
                </div>

                <div style={{
                    position: 'absolute', bottom: 20, left: 24, right: 24,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <button
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                        style={{
                            background: 'transparent', border: 'none', color: step === 0 ? '#333' : '#888',
                            fontFamily: "'SF Mono', monospace", fontSize: 11, cursor: step === 0 ? 'default' : 'pointer'
                        }}
                    >
                        &lt; PREV
                    </button>

                    {step < slides.length - 1 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            style={{
                                background: '#c9a84c', border: 'none', color: '#000',
                                padding: '6px 16px', borderRadius: 3, fontWeight: 'bold',
                                fontFamily: "'SF Mono', monospace", fontSize: 11, cursor: 'pointer'
                            }}
                        >
                            NEXT &gt;
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            style={{
                                background: '#4caf50', border: 'none', color: '#000',
                                padding: '6px 16px', borderRadius: 3, fontWeight: 'bold',
                                fontFamily: "'SF Mono', monospace", fontSize: 11, cursor: 'pointer'
                            }}
                        >
                            START TRADING
                        </button>
                    )}
                </div>
            </div>

            {/* CSS to create the "spotlight" effect on panels */}
            <style>{`
                /* Target the specific panel class we want to spotlight and lift it above the overlay */
                ${currentSlide.highlight ? `
                    .${currentSlide.highlight} {
                        position: relative !important;
                        z-index: 100000 !important;
                        box-shadow: 0 0 0 4px rgba(201,168,76,0.4), 0 0 30px rgba(201,168,76,0.2) !important;
                        pointer-events: none !important;
                    }
                ` : ''}
            `}</style>
        </div>
    );
}
