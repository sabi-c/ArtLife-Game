/**
 * ArtnetLogin.jsx — Artnet.com Login Page Clone
 *
 * Pixel-accurate clone of artnet.com's login/signup page.
 * Design tokens extracted from their production CSS:
 * - Font: ArtnetGrotesk (falls back to Helvetica/Arial)
 * - Background: #f2f2f2
 * - Text: #231f20
 * - Accent: #ff4b00 (orange-red)
 * - Muted: #999
 * - Inputs: 35px height, 23px font, bottom-border only
 *
 * Accessible via admin dashboard → TOOLS → Artnet Login
 */

import React, { useState, useEffect, useRef } from 'react';

// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════
export default function ArtnetLogin({ onClose, onLoginSuccess }) {
    const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [username, setUsername] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const emailRef = useRef(null);

    useEffect(() => {
        setTimeout(() => emailRef.current?.focus(), 200);
    }, [mode]);

    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    const validate = () => {
        const errs = {};
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) errs.email = 'Email is required';
        else if (!emailRe.test(email)) errs.email = 'Email Address is invalid';
        if (!password) errs.password = 'Password is required';
        else if (mode === 'signup' && password.length < 8) errs.password = 'Password is invalid';
        if (mode === 'signup') {
            if (!username) errs.username = 'Username is required';
            if (password && confirmPw && password !== confirmPw) errs.confirm = 'Passwords do not match';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            setSubmitted(true);
            if (onLoginSuccess) {
                // Unified flow: notify parent with credentials
                setTimeout(() => onLoginSuccess({ email }), 600);
            } else {
                setTimeout(() => setSubmitted(false), 2000);
            }
        }
    };

    const font = '"ArtnetGrotesk", Helvetica, Arial, sans-serif';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: '#f2f2f2', color: '#231f20',
            fontFamily: font, fontSize: 16, letterSpacing: '-0.5px',
            overflowY: 'auto',
            WebkitFontSmoothing: 'antialiased',
        }}>
            {/* ── App Container ── */}
            <div style={{
                maxWidth: 1170, minWidth: 320,
                margin: '0 auto', background: '#f2f2f2',
                minHeight: '100vh', position: 'relative',
            }}>
                {/* ── Header ── */}
                <div style={{
                    background: '#fff', padding: '28px 0 34px 34px',
                    display: 'flex', alignItems: 'center',
                }}>
                    <div style={{
                        fontFamily: font, fontWeight: 700,
                        fontSize: 28, letterSpacing: '-0.5px',
                        color: '#231f20',
                    }}>
                        artnet
                    </div>
                </div>

                {/* ── Close ── */}
                <button onClick={onClose} style={{
                    position: 'absolute', top: 34, right: 34,
                    width: 19, height: 19, background: 'none',
                    border: 'none', cursor: 'pointer', fontSize: 20,
                    color: '#231f20', fontFamily: font,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>

                {/* ── Sub Header ── */}
                <div style={{
                    display: 'flex', padding: '34px 34px',
                    fontSize: 35, lineHeight: '35px', gap: 20,
                }}>
                    <span
                        onClick={() => setMode('login')}
                        style={{
                            cursor: 'pointer',
                            color: mode === 'login' ? '#231f20' : '#999',
                            fontWeight: mode === 'login' ? 700 : 400,
                        }}
                    >Log In</span>
                    <span
                        onClick={() => setMode('signup')}
                        style={{
                            cursor: 'pointer',
                            color: mode === 'signup' ? '#231f20' : '#999',
                            fontWeight: mode === 'signup' ? 700 : 400,
                        }}
                    >Sign Up</span>
                </div>

                {/* ── Content ── */}
                <div style={{
                    display: 'flex', width: '100%', padding: '0 34px 34px',
                    gap: 0, flexWrap: 'wrap',
                }}>
                    {/* Benefits Column */}
                    <div style={{ flex: '1 1 45%', minWidth: 260 }}>
                        <ul style={{
                            listStyle: 'none', fontSize: 23, lineHeight: '32px',
                            paddingTop: 20, margin: 0, padding: '20px 0 0 0',
                        }}>
                            {(mode === 'login' ? [
                                'Access price database with 17M+ auction results',
                                'Save your favourite artworks and artists',
                                'Get personalized recommendations',
                                'Follow galleries and get exhibition updates',
                                'Read unlimited artnet News articles',
                            ] : [
                                'Create a free account in seconds',
                                'Full access to artnet Price Database',
                                'Save artworks, artists, and galleries',
                                'Personalized recommendations and alerts',
                                'Unlimited artnet News access',
                            ]).map((benefit, i) => (
                                <li key={i} style={{
                                    padding: '0 0 12px 26px', position: 'relative',
                                }}>
                                    <span style={{
                                        position: 'absolute', left: 0, top: -12,
                                        color: '#ff4b00', fontSize: 70,
                                    }}>•</span>
                                    {benefit}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Form Column */}
                    <div style={{
                        flex: '1 1 45%', minWidth: 280,
                        paddingLeft: 60,
                    }}>
                        <form onSubmit={handleSubmit} style={{ width: '100%' }}>

                            {/* Submitted feedback */}
                            {submitted && (
                                <div style={{
                                    background: '#e6ffe6', border: '1px solid #4caf50',
                                    padding: '12px 16px', borderRadius: 2, marginBottom: 20,
                                    fontSize: 14, color: '#2e7d32',
                                }}>
                                    ✓ {mode === 'login' ? 'Login successful!' : mode === 'signup' ? 'Account created!' : 'Reset email sent!'}
                                    <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>(demo)</span>
                                </div>
                            )}

                            {/* Email */}
                            <div style={{
                                position: 'relative', width: '100%', marginBottom: 20,
                            }}>
                                <input
                                    ref={emailRef}
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    style={{
                                        background: '#f2f2f2',
                                        border: 0, borderBottom: `1px solid ${errors.email ? 'red' : '#999'}`,
                                        borderRadius: 0, boxSizing: 'border-box',
                                        color: '#231f20', height: 35,
                                        fontFamily: font, fontSize: 23, lineHeight: '35px',
                                        margin: 0, padding: '0 0 0 3px', width: '100%',
                                    }}
                                />
                                {errors.email && <div style={{ color: 'red', marginTop: 10, fontSize: 14 }}>{errors.email}</div>}
                            </div>

                            {/* Username (signup only) */}
                            {mode === 'signup' && (
                                <div style={{ position: 'relative', width: '100%', marginBottom: 20 }}>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        style={{
                                            background: '#f2f2f2',
                                            border: 0, borderBottom: `1px solid ${errors.username ? 'red' : '#999'}`,
                                            borderRadius: 0, boxSizing: 'border-box',
                                            color: '#231f20', height: 35,
                                            fontFamily: font, fontSize: 23, lineHeight: '35px',
                                            margin: 0, padding: '0 0 0 3px', width: '100%',
                                        }}
                                    />
                                    {errors.username && <div style={{ color: 'red', marginTop: 10, fontSize: 14 }}>{errors.username}</div>}
                                </div>
                            )}

                            {/* Password */}
                            {mode !== 'forgot' && (
                                <div style={{ position: 'relative', width: '100%', marginBottom: 20 }}>
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        placeholder="Password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        style={{
                                            background: '#f2f2f2',
                                            border: 0, borderBottom: `1px solid ${errors.password ? 'red' : '#999'}`,
                                            borderRadius: 0, boxSizing: 'border-box',
                                            color: '#231f20', height: 35,
                                            fontFamily: font, fontSize: 23, lineHeight: '35px',
                                            margin: 0, padding: '0 0 0 3px', width: '100%',
                                        }}
                                    />
                                    <span
                                        onClick={() => setShowPw(!showPw)}
                                        style={{
                                            position: 'absolute', top: '0.5rem', right: '0.4rem',
                                            cursor: 'pointer', fontSize: 14, color: '#999',
                                            userSelect: 'none',
                                        }}
                                    >
                                        {showPw ? '🙈' : '👁'}
                                    </span>
                                    {errors.password && <div style={{ color: 'red', marginTop: 10, fontSize: 14 }}>{errors.password}</div>}
                                </div>
                            )}

                            {/* Confirm Password (signup) */}
                            {mode === 'signup' && (
                                <div style={{ position: 'relative', width: '100%', marginBottom: 20 }}>
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        placeholder="Confirm Password"
                                        value={confirmPw}
                                        onChange={e => setConfirmPw(e.target.value)}
                                        style={{
                                            background: '#f2f2f2',
                                            border: 0, borderBottom: `1px solid ${errors.confirm ? 'red' : '#999'}`,
                                            borderRadius: 0, boxSizing: 'border-box',
                                            color: '#231f20', height: 35,
                                            fontFamily: font, fontSize: 23, lineHeight: '35px',
                                            margin: 0, padding: '0 0 0 3px', width: '100%',
                                        }}
                                    />
                                    {errors.confirm && <div style={{ color: 'red', marginTop: 10, fontSize: 14 }}>{errors.confirm}</div>}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button type="submit" style={{
                                background: '#231f20', border: 'none', borderRadius: 2,
                                color: '#fff', cursor: 'pointer', fontSize: 23,
                                margin: '30px 0 20px', textAlign: 'center',
                                display: 'inline-block', padding: '16px 16px 14px',
                                fontFamily: font, letterSpacing: '-0.5px',
                                width: '100%',
                            }}>
                                {mode === 'login' ? 'Log In' : mode === 'signup' ? 'Sign Up' : 'Reset Password'}
                            </button>

                            {/* Links */}
                            {mode === 'login' && (
                                <div style={{ textAlign: 'center' }}>
                                    <span
                                        onClick={() => setMode('forgot')}
                                        style={{ color: '#231f20', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
                                    >
                                        Forgot Password?
                                    </span>
                                </div>
                            )}

                            {mode === 'forgot' && (
                                <div style={{ textAlign: 'center' }}>
                                    <span
                                        onClick={() => setMode('login')}
                                        style={{ color: '#231f20', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
                                    >
                                        Back to Log In
                                    </span>
                                </div>
                            )}

                            {/* Password requirements (signup) */}
                            {mode === 'signup' && (
                                <div style={{ fontSize: 14, marginTop: 20, color: '#999' }}>
                                    <div style={{ marginBottom: 8, color: '#231f20', fontWeight: 700 }}>Password must contain:</div>
                                    <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
                                        <li style={{ color: password.length >= 8 ? '#4caf50' : '#999' }}>At least 8 characters</li>
                                        <li style={{ color: /[a-zA-Z]/.test(password) ? '#4caf50' : '#999' }}>At least one letter</li>
                                        <li style={{ color: /[\d\W]/.test(password) ? '#4caf50' : '#999' }}>At least one number or special character</li>
                                    </ul>
                                </div>
                            )}
                        </form>

                        {/* Disclaimer */}
                        <div style={{
                            marginTop: 48, fontSize: 12, color: '#999',
                            lineHeight: '18px',
                        }}>
                            This is a demo recreation of artnet.com's login page for design reference purposes within ArtLife.
                            No data is submitted or stored.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
