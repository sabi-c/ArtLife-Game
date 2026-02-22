import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GameState } from '../managers/GameState';
import { ProfileManager } from '../managers/ProfileManager';
import { WebAudioService } from '../managers/WebAudioService.js';

// ─── Variable-speed typewriter hook ──────────────────────────────────────────
const useTypewriter = (linesArray, active, onComplete) => {
    const [displayedText, setDisplayedText] = useState([]);
    const [isDone, setIsDone] = useState(false);

    const linesStr = JSON.stringify(linesArray);

    useEffect(() => {
        if (!active) return;
        setDisplayedText([]);
        setIsDone(false);

        let isCancelled = false;
        let lineIdx = 0;
        let charIdx = 0;
        let currentDisplayed = [];
        const lines = JSON.parse(linesStr);

        if (lines.length === 0) {
            setIsDone(true);
            if (onComplete) onComplete();
            return;
        }

        const type = () => {
            if (isCancelled) return;

            if (lineIdx >= lines.length) {
                setIsDone(true);
                if (onComplete) onComplete();
                return;
            }

            const currentLine = lines[lineIdx];

            if (charIdx === 0) {
                currentDisplayed.push('');
            }

            if (charIdx < currentLine.length) {
                currentDisplayed[lineIdx] += currentLine[charIdx];
                setDisplayedText([...currentDisplayed]);
                charIdx++;

                let delay = 20 + Math.random() * 30;
                if (['.', ':', '[', ']', '—'].includes(currentLine[charIdx - 1])) {
                    delay += 60 + Math.random() * 100;
                }
                setTimeout(type, delay);
                WebAudioService.type();
            } else {
                lineIdx++;
                charIdx = 0;
                setTimeout(type, 150 + Math.random() * 200);
            }
        };

        type();
        return () => { isCancelled = true; };
    }, [linesStr, active]);

    return { displayedText, isDone };
};

// ─── Save Slot helpers ───────────────────────────────────────────────────────
function fmt$(n) {
    if (!n) return '$0';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
    return `$${n.toLocaleString()}`;
}

// ─── Shared option style helper ──────────────────────────────────────────────
const optStyle = (isActive, isDisabled) => ({
    color: isDisabled ? '#444' : isActive ? '#eaeaea' : '#888',
    background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
    padding: '12px 12px',
    transition: 'all 0.1s',
    fontSize: 13,
    display: 'flex',
    cursor: isDisabled ? 'default' : 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    minHeight: 44,
    alignItems: 'center',
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function TerminalLogin({ onComplete, previewStep }) {
    // Flow: BOOT → PROFILE_MENU → [PROFILE_LOGIN | PROFILE_CREATE | GUEST] → PRIMARY_MENU → DOSSIER_SELECT → CONFIRM → AUTH
    const [step, setStep] = useState(previewStep || 'BOOT');
    const [visible, setVisible] = useState(false);
    const terminalEndRef = useRef(null);

    // Navigation State
    const [primaryIndex, setPrimaryIndex] = useState(0);
    const [dossierIndex, setDossierIndex] = useState(0);
    const [confirmIndex, setConfirmIndex] = useState(0);
    const [profileMenuIndex, setProfileMenuIndex] = useState(0);

    // Data State
    const [dossiers, setDossiers] = useState([]);
    const [selectedDossier, setSelectedDossier] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [profileLoginIndex, setProfileLoginIndex] = useState(0);
    const fileInputRef = useRef(null);

    // Profile form state
    const [formUsername, setFormUsername] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formConfirm, setFormConfirm] = useState('');
    const [formError, setFormError] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Refs for input fields
    const usernameRef = useRef(null);
    const passwordRef = useRef(null);
    const confirmRef = useRef(null);
    const loginPasswordRef = useRef(null);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        // Ensure Guest profile exists for backward compat
        ProfileManager.ensureGuestProfile();
        setProfiles(ProfileManager.getProfiles());
    }, []);

    // Load dossiers when active profile changes or step changes to PRIMARY_MENU
    useEffect(() => {
        if (step === 'PRIMARY_MENU' || step === 'DOSSIER_SELECT') {
            const slots = GameState.getSaveSlots()
                .filter(slot => slot !== null)
                .map(slot => slot.meta);
            setDossiers(slots);
        }
    }, [step]);

    // Keep terminal scrolled to bottom
    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    // Focus inputs when entering form steps
    useEffect(() => {
        if (step === 'PROFILE_CREATE') {
            setTimeout(() => usernameRef.current?.focus(), 100);
        } else if (step === 'PROFILE_LOGIN') {
            setTimeout(() => loginPasswordRef.current?.focus(), 100);
        }
    }, [step]);

    // ─── Keyboard Engine ───
    const handleKeydown = useCallback((e) => {
        if (step === 'BOOT' || step === 'AUTH') return;

        // Profile Menu: [1] Existing [2] New [3] Guest
        if (step === 'PROFILE_MENU') {
            const hasProfiles = profiles.filter(p => !p.isGuest).length > 0;
            const maxIdx = hasProfiles ? 2 : 1; // 0=existing(if exists), 1=new, 2=guest (or 0=new, 1=guest)
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                setProfileMenuIndex(prev => {
                    if (e.key === 'ArrowUp') return Math.max(0, prev - 1);
                    return Math.min(maxIdx, prev + 1);
                });
                WebAudioService.hover();
                e.preventDefault();
            } else if (e.key === 'Enter') {
                WebAudioService.select();
                handleProfileMenuSelect(profileMenuIndex, hasProfiles);
                e.preventDefault();
            }
        }

        // Profile Create form — let inputs handle typing
        if (step === 'PROFILE_CREATE' || step === 'PROFILE_LOGIN') {
            if (e.key === 'Escape') {
                setStep('PROFILE_MENU');
                setFormError('');
                setLoginError('');
                e.preventDefault();
            }
            return; // Don't intercept typing
        }

        // Primary Menu: NEW vs AUTHORIZE DOSSIER
        if (step === 'PRIMARY_MENU') {
            if (e.key === '1') {
                setPrimaryIndex(0);
                e.preventDefault();
            } else if (e.key === '2') {
                if (dossiers.length > 0) setPrimaryIndex(1);
                e.preventDefault();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                if (dossiers.length > 0) {
                    setPrimaryIndex(prev => prev === 0 ? 1 : 0);
                    WebAudioService.hover();
                }
                e.preventDefault();
            } else if (e.key === 'Enter') {
                WebAudioService.select();
                if (primaryIndex === 0) {
                    setStep('AUTH');
                    setTimeout(() => onComplete({ action: 'new' }), 500);
                } else if (primaryIndex === 1) {
                    setStep('DOSSIER_SELECT');
                    setDossierIndex(0);
                }
                e.preventDefault();
            } else if (e.key === 'Escape') {
                setStep('PROFILE_MENU');
            }
        }

        // Dossier Select
        else if (step === 'DOSSIER_SELECT') {
            const maxOptions = dossiers.length + 2;
            if (e.key === 'ArrowUp') {
                setDossierIndex(prev => (prev - 1 + maxOptions) % maxOptions);
                WebAudioService.hover();
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                setDossierIndex(prev => (prev + 1) % maxOptions);
                WebAudioService.hover();
                e.preventDefault();
            } else if (e.key === 'Enter') {
                WebAudioService.select();
                if (dossierIndex < dossiers.length) {
                    setSelectedDossier(dossiers[dossierIndex]);
                    setConfirmIndex(0);
                    setStep('CONFIRM');
                } else if (dossierIndex === dossiers.length) {
                    fileInputRef.current?.click();
                } else {
                    setStep('PRIMARY_MENU');
                }
                e.preventDefault();
            } else if (e.key === 'Escape') {
                setStep('PRIMARY_MENU');
            }
        }

        // Confirm Phase
        else if (step === 'CONFIRM') {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                setConfirmIndex(prev => prev === 0 ? 1 : 0);
                WebAudioService.hover();
                e.preventDefault();
            } else if (e.key === 'Enter') {
                WebAudioService.select();
                if (confirmIndex === 0) {
                    const trueSlotIndex = GameState.getSaveSlots().findIndex(s => s && s.meta.savedAt === selectedDossier.savedAt);
                    if (trueSlotIndex !== -1) {
                        GameState.load(trueSlotIndex);
                        setStep('AUTH');
                    }
                } else {
                    setStep('DOSSIER_SELECT');
                    setSelectedDossier(null);
                }
                e.preventDefault();
            } else if (e.key === 'Escape') {
                setStep('DOSSIER_SELECT');
                setSelectedDossier(null);
            }
        }
    }, [step, primaryIndex, dossierIndex, confirmIndex, dossiers, selectedDossier, onComplete, profiles, profileMenuIndex]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, [handleKeydown]);

    // ─── Profile Menu Handlers ───
    const handleProfileMenuSelect = (idx, hasExisting) => {
        if (hasExisting) {
            if (idx === 0) {
                // Existing agent login
                setProfileLoginIndex(0);
                setLoginPassword('');
                setLoginError('');
                setStep('PROFILE_LOGIN');
            } else if (idx === 1) {
                // New profile
                setFormUsername('');
                setFormPassword('');
                setFormConfirm('');
                setFormError('');
                setStep('PROFILE_CREATE');
            } else {
                // Guest access
                handleGuestAccess();
            }
        } else {
            if (idx === 0) {
                setFormUsername('');
                setFormPassword('');
                setFormConfirm('');
                setFormError('');
                setStep('PROFILE_CREATE');
            } else {
                handleGuestAccess();
            }
        }
    };

    const handleGuestAccess = () => {
        const guest = profiles.find(p => p.isGuest);
        if (guest) {
            ProfileManager.setActiveProfile(guest.id);
        } else {
            ProfileManager.ensureGuestProfile();
        }
        goToPrimaryMenu();
    };

    const goToPrimaryMenu = () => {
        const slots = GameState.getSaveSlots()
            .filter(slot => slot !== null)
            .map(slot => slot.meta);
        setDossiers(slots);
        setPrimaryIndex(0);
        setStep('PRIMARY_MENU');
    };

    const handleCreateProfile = async () => {
        setFormError('');
        if (formUsername.length < 2 || formUsername.length > 20) {
            setFormError('Username must be 2-20 characters');
            return;
        }
        if (formPassword.length < 4) {
            setFormError('Passcode must be at least 4 characters');
            return;
        }
        if (formPassword !== formConfirm) {
            setFormError('Passcodes do not match');
            return;
        }
        try {
            await ProfileManager.createProfile(formUsername, formPassword);
            WebAudioService.success();
            setProfiles(ProfileManager.getProfiles());
            goToPrimaryMenu();
        } catch (err) {
            setFormError(err.message);
        }
    };

    const handleLogin = async () => {
        setLoginError('');
        const nonGuestProfiles = profiles.filter(p => !p.isGuest);
        const selectedProfile = nonGuestProfiles[profileLoginIndex];
        if (!selectedProfile) return;

        try {
            await ProfileManager.authenticate(selectedProfile.username, loginPassword);
            WebAudioService.success();
            goToPrimaryMenu();
        } catch (err) {
            setLoginError(err.message);
        }
    };

    // ─── Sequences ───
    const bootLines = useMemo(() => [
        "> ESTABLISHING SECURE CONNECTION...",
        "> CHECKING LOCAL CACHE... [ OK ]",
        "> VALIDATING HANDSHAKE... [ OK ]"
    ], []);

    const bootTypewriter = useTypewriter(bootLines, step === 'BOOT', () => {
        setTimeout(() => setStep('PROFILE_MENU'), 600);
    });

    const authLines = useMemo(() => {
        if (!selectedDossier) return ["> PREPARING NEW APPLICATION PORTAL... [ OK ]"];
        return [
            `> AUTHORIZING DOSSIER [${selectedDossier.playerName?.toUpperCase() || 'UNKNOWN'}]...`,
            `> ALIAS: ${selectedDossier.characterName?.toUpperCase() || 'UNKNOWN'}`,
            "> DECRYPTING LEDGER... [ OK ]",
            "> OPENING COMMS... [ OK ]",
            "> TUNNEL SECURED. WELCOME BACK."
        ];
    }, [selectedDossier]);

    const authTypewriter = useTypewriter(authLines, step === 'AUTH', () => {
        WebAudioService.success();
        setTimeout(() => {
            setVisible(false);
            if (selectedDossier) {
                setTimeout(() => onComplete({ action: 'load' }), 500);
            }
        }, 1200);
    });

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        // File import logic placeholder
    };

    const nonGuestProfiles = profiles.filter(p => !p.isGuest);
    const hasExistingProfiles = nonGuestProfiles.length > 0;

    return (
        <div
            className={`pd-overlay ${visible ? 'visible' : ''}`}
            onClick={() => {
                if (step === 'BOOT') setStep('PROFILE_MENU');
            }}
            style={{
                zIndex: 100000,
                background: '#060608',
                transition: 'opacity 0.5s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                overflowY: 'auto', padding: '40px 20px',
                height: '100vh',
                boxSizing: 'border-box'
            }}
        >
            <div style={{ width: '100%', maxWidth: 700, fontFamily: '"IBM Plex Mono", "Courier New", monospace' }}>

                {/* ── HEADER ── */}
                <div style={{ marginBottom: 40, textAlign: 'center' }}>
                    <h1 style={{ color: '#c9a84c', fontSize: '32px', letterSpacing: '4px', margin: 0, textShadow: '0 0 10px rgba(201,168,76,0.3)' }}>
                        ARTLIFE
                    </h1>
                    <div style={{
                        color: '#5a5a6a', letterSpacing: '2px', borderBottom: '1px dashed #2a2a3a',
                        paddingBottom: '15px', marginTop: '10px', fontSize: 13
                    }}>
                        SECURE TERMINAL // V2.1.0 // SYSTEM READY
                    </div>
                </div>

                {/* ── BOOT PHASE ── */}
                <div style={{ color: '#c8c8d8', marginBottom: 30, paddingLeft: '10%', paddingRight: '10%' }}>
                    {bootTypewriter.displayedText.map((line, idx) => (
                        <div key={idx} style={{ fontSize: 13, marginBottom: 8, color: line.includes('[ OK ]') ? '#3a8a5c' : '#c8c8d8' }}>
                            {line.replace('[ OK ]', '')}
                            <span style={{ color: '#3a8a5c' }}>{line.includes('[ OK ]') ? '[ OK ]' : ''}</span>
                            {idx === bootTypewriter.displayedText.length - 1 && !bootTypewriter.isDone && (
                                <span className="blinking-cursor" style={{ marginLeft: 4 }}>_</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* ── PROFILE MENU (after boot) ── */}
                {step === 'PROFILE_MENU' && (
                    <div style={{ paddingLeft: '10%', paddingRight: '10%', animation: 'fadeIn 0.3s ease forwards', marginBottom: 30 }}>
                        <div style={{ color: '#eaeaea', fontSize: 12, letterSpacing: 1, marginBottom: 15 }}>&gt; AGENT REGISTRY</div>

                        {hasExistingProfiles && (
                            <div
                                onClick={() => { WebAudioService.select(); setProfileMenuIndex(0); handleProfileMenuSelect(0, true); }}
                                style={optStyle(profileMenuIndex === 0, false)}
                            >
                                <span style={{ width: 20 }}>{profileMenuIndex === 0 ? '>' : ' '}</span> [1] EXISTING AGENT — log in
                            </div>
                        )}
                        <div
                            onClick={() => {
                                WebAudioService.select();
                                const idx = hasExistingProfiles ? 1 : 0;
                                setProfileMenuIndex(idx);
                                handleProfileMenuSelect(idx, hasExistingProfiles);
                            }}
                            style={optStyle(profileMenuIndex === (hasExistingProfiles ? 1 : 0), false)}
                        >
                            <span style={{ width: 20 }}>{profileMenuIndex === (hasExistingProfiles ? 1 : 0) ? '>' : ' '}</span> [{hasExistingProfiles ? '2' : '1'}] NEW AGENT — create profile
                        </div>
                        <div
                            onClick={() => {
                                WebAudioService.select();
                                const idx = hasExistingProfiles ? 2 : 1;
                                setProfileMenuIndex(idx);
                                handleProfileMenuSelect(idx, hasExistingProfiles);
                            }}
                            style={optStyle(profileMenuIndex === (hasExistingProfiles ? 2 : 1), false)}
                        >
                            <span style={{ width: 20 }}>{profileMenuIndex === (hasExistingProfiles ? 2 : 1) ? '>' : ' '}</span> [{hasExistingProfiles ? '3' : '2'}] GUEST ACCESS — no password
                        </div>
                    </div>
                )}

                {/* ── PROFILE CREATE ── */}
                {step === 'PROFILE_CREATE' && (
                    <div style={{ paddingLeft: '10%', paddingRight: '10%', animation: 'fadeIn 0.3s ease forwards', marginBottom: 30 }}>
                        <div style={{ color: '#eaeaea', fontSize: 12, letterSpacing: 1, marginBottom: 20 }}>&gt; CREATE NEW AGENT PROFILE</div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ color: '#5a5a6a', fontSize: 11, letterSpacing: 1, display: 'block', marginBottom: 4 }}>USERNAME</label>
                            <input
                                ref={usernameRef}
                                className="tl-input"
                                type="text"
                                value={formUsername}
                                onChange={e => setFormUsername(e.target.value)}
                                maxLength={20}
                                autoComplete="off"
                                onKeyDown={e => { if (e.key === 'Enter') passwordRef.current?.focus(); }}
                            />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ color: '#5a5a6a', fontSize: 11, letterSpacing: 1, display: 'block', marginBottom: 4 }}>SET PASSCODE</label>
                            <input
                                ref={passwordRef}
                                className="tl-input"
                                type="password"
                                value={formPassword}
                                onChange={e => setFormPassword(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') confirmRef.current?.focus(); }}
                            />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ color: '#5a5a6a', fontSize: 11, letterSpacing: 1, display: 'block', marginBottom: 4 }}>CONFIRM PASSCODE</label>
                            <input
                                ref={confirmRef}
                                className="tl-input"
                                type="password"
                                value={formConfirm}
                                onChange={e => setFormConfirm(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreateProfile(); }}
                            />
                        </div>

                        {formError && <div className="tl-error">{formError}</div>}

                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <div
                                onClick={handleCreateProfile}
                                style={{
                                    color: '#000', background: '#c9a84c',
                                    padding: '10px 20px', border: '1px solid #c9a84c',
                                    cursor: 'pointer', touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent', minHeight: 44,
                                    display: 'flex', alignItems: 'center', fontSize: 13, fontFamily: 'inherit',
                                }}>
                                [CREATE]
                            </div>
                            <div
                                onClick={() => { setStep('PROFILE_MENU'); setFormError(''); }}
                                style={{
                                    color: '#888', background: 'transparent',
                                    padding: '10px 20px', border: '1px solid #555',
                                    cursor: 'pointer', touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent', minHeight: 44,
                                    display: 'flex', alignItems: 'center', fontSize: 13, fontFamily: 'inherit',
                                }}>
                                [BACK]
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PROFILE LOGIN ── */}
                {step === 'PROFILE_LOGIN' && (
                    <div style={{ paddingLeft: '10%', paddingRight: '10%', animation: 'fadeIn 0.3s ease forwards', marginBottom: 30 }}>
                        <div style={{ color: '#eaeaea', fontSize: 12, letterSpacing: 1, marginBottom: 20 }}>&gt; AUTHENTICATE AGENT</div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ color: '#5a5a6a', fontSize: 11, letterSpacing: 1, display: 'block', marginBottom: 8 }}>SELECT AGENT</label>
                            {nonGuestProfiles.map((p, i) => (
                                <div
                                    key={p.id}
                                    onClick={() => { setProfileLoginIndex(i); WebAudioService.hover(); }}
                                    style={{
                                        color: profileLoginIndex === i ? '#c9a84c' : '#888',
                                        background: profileLoginIndex === i ? 'rgba(201,168,76,0.05)' : 'transparent',
                                        padding: '10px 12px', fontSize: 13, cursor: 'pointer',
                                        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                                        minHeight: 44, display: 'flex', alignItems: 'center',
                                    }}
                                >
                                    <span style={{ width: 20 }}>{profileLoginIndex === i ? '>' : ' '}</span>
                                    {p.username}
                                </div>
                            ))}
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ color: '#5a5a6a', fontSize: 11, letterSpacing: 1, display: 'block', marginBottom: 4 }}>PASSCODE</label>
                            <input
                                ref={loginPasswordRef}
                                className="tl-input"
                                type="password"
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
                            />
                        </div>

                        {loginError && <div className="tl-error">{loginError}</div>}

                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <div
                                onClick={handleLogin}
                                style={{
                                    color: '#000', background: '#c9a84c',
                                    padding: '10px 20px', border: '1px solid #c9a84c',
                                    cursor: 'pointer', touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent', minHeight: 44,
                                    display: 'flex', alignItems: 'center', fontSize: 13, fontFamily: 'inherit',
                                }}>
                                [AUTHORIZE]
                            </div>
                            <div
                                onClick={() => { setStep('PROFILE_MENU'); setLoginError(''); }}
                                style={{
                                    color: '#888', background: 'transparent',
                                    padding: '10px 20px', border: '1px solid #555',
                                    cursor: 'pointer', touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent', minHeight: 44,
                                    display: 'flex', alignItems: 'center', fontSize: 13, fontFamily: 'inherit',
                                }}>
                                [BACK]
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PRIMARY MENU ── */}
                {(step === 'PRIMARY_MENU' || step === 'DOSSIER_SELECT' || step === 'CONFIRM' || (step === 'AUTH')) && step !== 'PROFILE_MENU' && step !== 'PROFILE_CREATE' && step !== 'PROFILE_LOGIN' && step !== 'BOOT' && (
                    <div style={{ paddingLeft: '10%', paddingRight: '10%', animation: 'fadeIn 0.3s ease forwards', marginBottom: 30 }}>
                        {/* Show active profile */}
                        {(() => {
                            const ap = ProfileManager.getActiveProfile();
                            return ap ? (
                                <div style={{ color: '#5a5a6a', fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>
                                    AGENT: {ap.username.toUpperCase()}{ap.isGuest ? ' (GUEST)' : ''}
                                </div>
                            ) : null;
                        })()}

                        {step !== 'AUTH' && (
                            <>
                                <div
                                    onClick={() => {
                                        if (step !== 'PRIMARY_MENU') return;
                                        WebAudioService.select();
                                        setPrimaryIndex(0);
                                        setStep('AUTH');
                                        setTimeout(() => onComplete({ action: 'new' }), 500);
                                    }}
                                    style={optStyle(primaryIndex === 0, false)}
                                >
                                    <span style={{ width: 20 }}>{primaryIndex === 0 ? '>' : ' '}</span> [1] SUBMIT NEW APPLICATION
                                </div>
                                <div
                                    onClick={() => {
                                        if (step !== 'PRIMARY_MENU' || dossiers.length === 0) return;
                                        WebAudioService.select();
                                        setPrimaryIndex(1);
                                        setStep('DOSSIER_SELECT');
                                        setDossierIndex(0);
                                    }}
                                    style={optStyle(primaryIndex === 1, dossiers.length === 0)}
                                >
                                    <span style={{ width: 20 }}>{primaryIndex === 1 ? '>' : ' '}</span> [2] AUTHORIZE DOSSIER
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── DOSSIER SELECT ── */}
                {(step === 'DOSSIER_SELECT' || step === 'CONFIRM' || (step === 'AUTH' && selectedDossier)) && (
                    <div style={{ paddingRight: '10%', animation: 'fadeIn 0.3s ease forwards', borderLeft: '2px dashed #2a2a3a', marginLeft: '10%', paddingLeft: '15px', marginBottom: 30 }}>
                        <div style={{ color: '#eaeaea', fontSize: 12, letterSpacing: 1, marginBottom: 15 }}>&gt; FOUND_CACHE_LOGS:</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {dossiers.map((d, index) => {
                                const isTarget = dossierIndex === index;
                                return (
                                    <div
                                        key={`slot_${index}`}
                                        onClick={() => {
                                            if (step !== 'DOSSIER_SELECT') return;
                                            WebAudioService.select();
                                            setSelectedDossier(d);
                                            setDossierIndex(index);
                                            setConfirmIndex(0);
                                            setStep('CONFIRM');
                                        }}
                                        style={{
                                            color: isTarget ? '#c9a84c' : '#888',
                                            background: isTarget ? 'rgba(201,168,76,0.05)' : 'transparent',
                                            padding: '12px 12px',
                                            fontSize: 13,
                                            display: 'flex', alignItems: 'center',
                                            cursor: 'pointer',
                                            touchAction: 'manipulation',
                                            WebkitTapHighlightColor: 'transparent',
                                            minHeight: 44
                                        }}
                                    >
                                        <span style={{ width: 20 }}>{isTarget ? '>' : ' '}</span>
                                        <span style={{ flex: 1 }}>[{index + 1}] {d.playerName?.toUpperCase() || 'UNKNOWN'}</span>
                                        <span style={{ fontSize: 11, color: isTarget ? '#88bbdd' : '#555' }}>{d.city?.toUpperCase()} · {fmt$(d.cash)}</span>
                                    </div>
                                )
                            })}

                            <div
                                onClick={() => { if (step === 'DOSSIER_SELECT') fileInputRef.current?.click(); }}
                                style={{ color: dossierIndex === dossiers.length ? '#eaeaea' : '#555', padding: '12px 12px', fontSize: 13, display: 'flex', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: 44, alignItems: 'center' }}
                            >
                                <span style={{ width: 20 }}>{dossierIndex === dossiers.length ? '>' : ' '}</span>
                                <span style={{ textDecoration: 'underline' }}>[+] IMPORT SYNC DATA</span>
                            </div>
                            <div
                                onClick={() => { if (step === 'DOSSIER_SELECT') { WebAudioService.select(); setStep('PRIMARY_MENU'); } }}
                                style={{ color: dossierIndex === dossiers.length + 1 ? '#eaeaea' : '#555', padding: '12px 12px', fontSize: 13, display: 'flex', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', minHeight: 44, alignItems: 'center' }}
                            >
                                <span style={{ width: 20 }}>{dossierIndex === dossiers.length + 1 ? '>' : ' '}</span>
                                [ESC] BACK
                            </div>
                        </div>
                    </div>
                )}

                {/* ── CONFIRM PHASE ── */}
                {(step === 'CONFIRM' || (step === 'AUTH' && selectedDossier)) && selectedDossier && (
                    <div style={{ paddingLeft: '10%', paddingRight: '10%', animation: 'fadeIn 0.2s ease forwards', marginBottom: 40 }}>
                        <div style={{ color: '#eaeaea', fontSize: 12, letterSpacing: 1, marginBottom: 15 }}>
                            &gt; VERIFY PARAMETERS FOR [{selectedDossier.playerName?.toUpperCase()}]
                        </div>
                        <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                            <div
                                onClick={() => {
                                    if (step !== 'CONFIRM') return;
                                    WebAudioService.select();
                                    const trueSlotIndex = GameState.getSaveSlots().findIndex(s => s && s.meta.savedAt === selectedDossier.savedAt);
                                    if (trueSlotIndex !== -1) {
                                        GameState.load(trueSlotIndex);
                                        setStep('AUTH');
                                    }
                                }}
                                style={{
                                    color: confirmIndex === 0 ? '#000' : '#c9a84c',
                                    background: confirmIndex === 0 ? '#c9a84c' : 'transparent',
                                    padding: '10px 20px', border: '1px solid #c9a84c',
                                    cursor: 'pointer', touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent', minHeight: 44,
                                    display: 'flex', alignItems: 'center'
                                }}>
                                [AUTHORIZE]
                            </div>
                            <div
                                onClick={() => {
                                    if (step !== 'CONFIRM') return;
                                    WebAudioService.select();
                                    setStep('DOSSIER_SELECT');
                                    setSelectedDossier(null);
                                }}
                                style={{
                                    color: confirmIndex === 1 ? '#eaeaea' : '#555',
                                    background: confirmIndex === 1 ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    padding: '10px 20px', border: '1px solid #555',
                                    cursor: 'pointer', touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent', minHeight: 44,
                                    display: 'flex', alignItems: 'center'
                                }}>
                                [ABORT]
                            </div>
                        </div>
                    </div>
                )}

                {/* ── AUTH ANIMATION PHASE ── */}
                {step === 'AUTH' && (
                    <div style={{ animation: 'fadeIn 0.2s ease forwards', borderTop: '1px dashed #2a2a3a', paddingLeft: '10%', paddingRight: '10%', paddingTop: 30 }}>
                        {authTypewriter.displayedText.map((line, idx) => (
                            <div key={idx} style={{ fontSize: 13, marginBottom: 8, color: line.includes('[ OK ]') ? '#3a8a5c' : '#c8c8d8' }}>
                                {line.replace('[ OK ]', '')}
                                <span style={{ color: '#3a8a5c' }}>{line.includes('[ OK ]') ? '[ OK ]' : ''}</span>
                                {idx === authTypewriter.displayedText.length - 1 && !authTypewriter.isDone && (
                                    <span className="blinking-cursor" style={{ marginLeft: 4 }}>_</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div ref={terminalEndRef} />
                <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>

            {/* CSS ANIMATIONS */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .blinking-cursor {
                    animation: blink 1s step-end infinite;
                }
                @keyframes blink {
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}
