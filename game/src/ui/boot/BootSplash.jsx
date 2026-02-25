/**
 * BootSplash.jsx — Animated Sprite Boot Screen
 *
 * First thing the player sees on load:
 * - Dark background with centered animated sprite (idle breathing)
 * - Subtle glow behind character
 * - "Click to continue" / "Tap to continue" prompt
 * - On click → fires onContinue callback
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

const FONT = '"Press Start 2P", monospace';
const FONT_BODY = '"ArtnetGrotesk", "Helvetica Neue", Helvetica, Arial, sans-serif';

// Victoria Sterling multi-action sheet: 160×160 frames, 4 cols × 12 rows
// Idle animation = rows 4-7 (frames 16-31), south-facing idle = row 4 (frames 16-19)
const SPRITE_SRC = 'assets/processed/victoria_sterling_sprites.png';
const FRAME_W = 160;
const FRAME_H = 160;
const IDLE_FRAMES = [16, 17, 18, 19]; // south-facing idle
const ANIM_FPS = 4;
const DISPLAY_SCALE = 2.5; // 160 × 2.5 = 400px rendered

export default function BootSplash({ onContinue }) {
    const canvasRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const imgRef = useRef(null);
    const frameRef = useRef(0);

    // Load spritesheet
    useEffect(() => {
        const img = new Image();
        img.src = SPRITE_SRC;
        img.onload = () => {
            imgRef.current = img;
            setReady(true);
            // Show prompt after a short delay for dramatic effect
            setTimeout(() => setShowPrompt(true), 800);
        };
        img.onerror = () => {
            // If sprite fails to load, just show prompt immediately
            setShowPrompt(true);
        };
    }, []);

    // Animate sprite on canvas
    useEffect(() => {
        if (!ready || !canvasRef.current || !imgRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const w = FRAME_W * DISPLAY_SCALE;
        const h = FRAME_H * DISPLAY_SCALE;
        canvas.width = w;
        canvas.height = h;

        let animId;
        let lastTime = 0;
        const frameDuration = 1000 / ANIM_FPS;

        const draw = (timestamp) => {
            if (timestamp - lastTime >= frameDuration) {
                frameRef.current = (frameRef.current + 1) % IDLE_FRAMES.length;
                lastTime = timestamp;
            }

            const frameIndex = IDLE_FRAMES[frameRef.current];
            const cols = 4;
            const sx = (frameIndex % cols) * FRAME_W;
            const sy = Math.floor(frameIndex / cols) * FRAME_H;

            ctx.clearRect(0, 0, w, h);

            // Subtle glow behind character
            const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.45);
            gradient.addColorStop(0, 'rgba(201, 168, 76, 0.12)');
            gradient.addColorStop(0.6, 'rgba(201, 168, 76, 0.04)');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // Draw sprite frame
            ctx.imageSmoothingEnabled = false; // crisp pixel art
            ctx.drawImage(imgRef.current, sx, sy, FRAME_W, FRAME_H, 0, 0, w, h);

            animId = requestAnimationFrame(draw);
        };

        animId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animId);
    }, [ready]);

    const isMobile = typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0);

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
            {/* Ambient background particles */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 40%, rgba(201,168,76,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Sprite canvas */}
            <canvas
                ref={canvasRef}
                style={{
                    width: FRAME_W * DISPLAY_SCALE,
                    height: FRAME_H * DISPLAY_SCALE,
                    imageRendering: 'pixelated',
                    opacity: ready ? 1 : 0,
                    transition: 'opacity 0.8s ease-out',
                    marginBottom: 48,
                }}
            />

            {/* "ArtLife" title */}
            <div style={{
                fontFamily: FONT,
                fontSize: 28,
                color: '#c9a84c',
                letterSpacing: 6,
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
                fontSize: 14,
                color: '#555',
                letterSpacing: 3,
                textTransform: 'uppercase',
                marginBottom: 60,
                opacity: ready ? 1 : 0,
                transition: 'opacity 1s ease-out 0.6s',
            }}>
                The Art World RPG
            </div>

            {/* "Click / Tap to continue" */}
            {showPrompt && (
                <div style={{
                    fontFamily: FONT,
                    fontSize: 11,
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
