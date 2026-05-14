/**
 * BootSplash.jsx — Animated Artlife Computer Boot Screen
 *
 * Tiled pixel-art computers spanning the full width of the screen,
 * each animating through a 20-frame sheen/sparkle loop at slightly
 * offset phases so they ripple like a wave.
 *
 * "ARTLIFE" title + "Click / Tap to continue" below.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

const FONT = '"Press Start 2P", monospace';
const FONT_BODY = '"ArtnetGrotesk", "Helvetica Neue", Helvetica, Arial, sans-serif';

const SPRITE_SRC = 'assets/processed/splash_spritesheet.png';
const FRAME_W = 128;
const FRAME_H = 128;
const TOTAL_FRAMES = 20;
const ANIM_FPS = 6;

export default function BootSplash({ onContinue }) {
    const canvasRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const imgRef = useRef(null);
    const tickRef = useRef(0);

    // Load spritesheet
    useEffect(() => {
        const img = new Image();
        img.src = SPRITE_SRC;
        img.onload = () => {
            imgRef.current = img;
            setReady(true);
            setTimeout(() => setShowPrompt(true), 800);
        };
        img.onerror = () => setShowPrompt(true);
    }, []);

    // Animate tiled sprites on canvas
    useEffect(() => {
        if (!ready || !canvasRef.current || !imgRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Compute tile layout
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        let animId;
        let lastTime = 0;
        const frameDuration = 1000 / ANIM_FPS;

        const draw = (timestamp) => {
            if (timestamp - lastTime >= frameDuration) {
                tickRef.current = (tickRef.current + 1) % TOTAL_FRAMES;
                lastTime = timestamp;
            }

            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Calculate tile size based on viewport
            // We want roughly 3-6 tiles across depending on screen width
            const tilesAcross = vw < 400 ? 3 : vw < 768 ? 4 : vw < 1200 ? 5 : 6;
            const tileSize = Math.ceil(vw / tilesAcross);
            const tilesDown = Math.ceil(vh / tileSize) + 1;
            const totalCols = tilesAcross + 1;

            // Center the grid vertically
            const gridH = tilesDown * tileSize;
            const yOffset = (vh - gridH) / 2;

            // Dark background
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, vw, vh);

            // Subtle radial glow behind center
            const grd = ctx.createRadialGradient(vw / 2, vh * 0.4, 0, vw / 2, vh * 0.4, vw * 0.6);
            grd.addColorStop(0, 'rgba(201, 168, 76, 0.06)');
            grd.addColorStop(1, 'transparent');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, vw, vh);

            // Draw tiled computers with phase offset
            ctx.imageSmoothingEnabled = false;
            for (let row = 0; row < tilesDown; row++) {
                for (let col = 0; col < totalCols; col++) {
                    // Each tile gets a phase offset based on position for wave effect
                    const phaseOffset = (col * 3 + row * 5) % TOTAL_FRAMES;
                    const frameIndex = (tickRef.current + phaseOffset) % TOTAL_FRAMES;

                    const sx = frameIndex * FRAME_W;
                    const dx = col * tileSize;
                    const dy = yOffset + row * tileSize;

                    ctx.drawImage(
                        imgRef.current,
                        sx, 0, FRAME_W, FRAME_H,
                        dx, dy, tileSize, tileSize
                    );
                }
            }

            // Dark vignette overlay so text is readable
            const vignette = ctx.createRadialGradient(vw / 2, vh / 2, vw * 0.15, vw / 2, vh / 2, vw * 0.65);
            vignette.addColorStop(0, 'rgba(10, 10, 15, 0.3)');
            vignette.addColorStop(0.5, 'rgba(10, 10, 15, 0.6)');
            vignette.addColorStop(1, 'rgba(10, 10, 15, 0.92)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, vw, vh);

            animId = requestAnimationFrame(draw);
        };

        animId = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, [ready]);

    const isMobile = typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const isSmall = typeof window !== 'undefined' && window.innerWidth < 400;

    const handleClick = useCallback(() => {
        if (showPrompt && onContinue) onContinue();
    }, [showPrompt, onContinue]);

    return (
        <div
            onClick={handleClick}
            style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                background: '#0a0a0f',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: showPrompt ? 'pointer' : 'default',
                userSelect: 'none',
                animation: 'boot-fade-in 0.6s ease-out',
            }}
        >
            {/* Full-screen animated canvas (behind text) */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    imageRendering: 'pixelated',
                    opacity: ready ? 1 : 0,
                    transition: 'opacity 1s ease-out',
                }}
            />

            {/* Centered text overlay */}
            <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center',
            }}>
                {/* "ArtLife" title */}
                <div style={{
                    fontFamily: FONT,
                    fontSize: isSmall ? 24 : 42,
                    color: '#c9a84c',
                    letterSpacing: isSmall ? 4 : 8,
                    textTransform: 'uppercase',
                    marginBottom: 12,
                    opacity: ready ? 1 : 0,
                    transition: 'opacity 1s ease-out 0.3s',
                    textShadow: '0 0 40px rgba(201,168,76,0.5), 0 2px 8px rgba(0,0,0,0.8)',
                }}>
                    ARTLIFE
                </div>

                {/* Subtitle */}
                <div style={{
                    fontFamily: FONT_BODY,
                    fontSize: isSmall ? 12 : 16,
                    color: '#888',
                    letterSpacing: isSmall ? 2 : 4,
                    textTransform: 'uppercase',
                    marginBottom: isSmall ? 40 : 80,
                    opacity: ready ? 1 : 0,
                    transition: 'opacity 1s ease-out 0.6s',
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                }}>
                    The Art World RPG
                </div>

                {/* "Click / Tap to continue" */}
                {showPrompt && (
                    <div style={{
                        fontFamily: FONT,
                        fontSize: isSmall ? 9 : 11,
                        color: '#aaa',
                        letterSpacing: 2,
                        animation: 'boot-pulse 2s ease-in-out infinite',
                        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                    }}>
                        {isMobile ? 'TAP TO CONTINUE' : 'CLICK TO CONTINUE'}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes boot-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes boot-pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
