/**
 * BootSplash.jsx — Animated Artlife Computer Boot Screen
 *
 * First thing the player sees on load:
 * - Dark background with centered animated pixel art computer
 *   showing "artlife" logo with sheen/sparkle effect
 * - "ARTLIFE" title + subtitle below
 * - "Click to continue" / "Tap to continue" prompt
 * - On click → fires onContinue callback
 *
 * Spritesheet: splash_spritesheet.png
 *   20 frames × 128×128, single row
 *   Animation: key1 → tween1-2 → key2 → tween2-3 → key3 → tween3-4 → key4 → tween4-1 → loop
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

const FONT = '"Press Start 2P", monospace';
const FONT_BODY = '"ArtnetGrotesk", "Helvetica Neue", Helvetica, Arial, sans-serif';

const SPRITE_SRC = 'assets/processed/splash_spritesheet.png';
const FRAME_W = 128;
const FRAME_H = 128;
const TOTAL_FRAMES = 20;
const ANIM_FPS = 6; // 20 frames / 6fps ≈ 3.3s per loop — nice slow sparkle

// Responsive scale: up to 384px on desktop, scales down on small screens
function getDisplayScale() {
    if (typeof window === 'undefined') return 3;
    const vw = window.innerWidth;
    if (vw < 400) return Math.max(vw * 0.6 / FRAME_W, 1.2);
    if (vw < 768) return 2;
    return 3;
}

export default function BootSplash({ onContinue }) {
    const canvasRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [displayScale, setDisplayScale] = useState(getDisplayScale);
    const imgRef = useRef(null);
    const frameRef = useRef(0);

    // Handle resize
    useEffect(() => {
        const onResize = () => setDisplayScale(getDisplayScale());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Load spritesheet
    useEffect(() => {
        const img = new Image();
        img.src = SPRITE_SRC;
        img.onload = () => {
            imgRef.current = img;
            setReady(true);
            setTimeout(() => setShowPrompt(true), 800);
        };
        img.onerror = () => {
            console.warn('[BootSplash] Failed to load splash spritesheet');
            setShowPrompt(true);
        };
    }, []);

    // Animate sprite on canvas
    useEffect(() => {
        if (!ready || !canvasRef.current || !imgRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const w = FRAME_W * displayScale;
        const h = FRAME_H * displayScale;
        canvas.width = w;
        canvas.height = h;

        let animId;
        let lastTime = 0;
        const frameDuration = 1000 / ANIM_FPS;

        const draw = (timestamp) => {
            if (timestamp - lastTime >= frameDuration) {
                frameRef.current = (frameRef.current + 1) % TOTAL_FRAMES;
                lastTime = timestamp;
            }

            const frameIndex = frameRef.current;
            // Single row spritesheet: frame N starts at N * FRAME_W
            const sx = frameIndex * FRAME_W;
            const sy = 0;

            ctx.clearRect(0, 0, w, h);

            // Subtle warm glow behind the computer
            const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
            gradient.addColorStop(0, 'rgba(201, 168, 76, 0.10)');
            gradient.addColorStop(0.5, 'rgba(201, 168, 76, 0.03)');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // Draw sprite frame — crisp pixel art
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(imgRef.current, sx, sy, FRAME_W, FRAME_H, 0, 0, w, h);

            animId = requestAnimationFrame(draw);
        };

        animId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animId);
    }, [ready, displayScale]);

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
            {/* Ambient background */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 40%, rgba(201,168,76,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Animated sprite canvas */}
            <canvas
                ref={canvasRef}
                style={{
                    width: FRAME_W * displayScale,
                    height: FRAME_H * displayScale,
                    maxWidth: '80vw',
                    maxHeight: '40vh',
                    imageRendering: 'pixelated',
                    opacity: ready ? 1 : 0,
                    transition: 'opacity 0.8s ease-out',
                    marginBottom: isSmall ? 24 : 48,
                }}
            />

            {/* "ArtLife" title */}
            <div style={{
                fontFamily: FONT,
                fontSize: isSmall ? 18 : 28,
                color: '#c9a84c',
                letterSpacing: isSmall ? 3 : 6,
                textTransform: 'uppercase',
                marginBottom: 8,
                opacity: ready ? 1 : 0,
                transition: 'opacity 1s ease-out 0.3s',
                textShadow: '0 0 30px rgba(201,168,76,0.3)',
            }}>
                ARTLIFE
            </div>

            {/* Subtitle */}
            <div style={{
                fontFamily: FONT_BODY,
                fontSize: isSmall ? 11 : 14,
                color: '#555',
                letterSpacing: isSmall ? 1.5 : 3,
                textTransform: 'uppercase',
                marginBottom: isSmall ? 32 : 60,
                opacity: ready ? 1 : 0,
                transition: 'opacity 1s ease-out 0.6s',
            }}>
                The Art World RPG
            </div>

            {/* "Click / Tap to continue" */}
            {showPrompt && (
                <div style={{
                    fontFamily: FONT,
                    fontSize: isSmall ? 9 : 11,
                    color: '#888',
                    letterSpacing: 2,
                    animation: 'boot-pulse 2s ease-in-out infinite',
                }}>
                    {isMobile ? 'TAP TO CONTINUE' : 'CLICK TO CONTINUE'}
                </div>
            )}

            {/* Keyframe injection */}
            <style>{`
                @keyframes boot-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes boot-pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
