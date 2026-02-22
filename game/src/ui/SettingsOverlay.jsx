import React, { useState, useEffect } from 'react';
import { SettingsManager } from '../managers/SettingsManager.js';
import { GameEventBus, GameEvents } from '../managers/GameEventBus.js';
import { OVERLAY } from '../constants/views.js';
import { WebAudioService } from '../managers/WebAudioService.js';

export default function SettingsOverlay({ onClose }) {
    // Local copy of settings so the UI can be reactive
    const [settings, setSettings] = useState({
        textSpeed: 'normal',
        colorTheme: 'classic_dark',
        scanlines: true,
        crtFlicker: true,
        introStyle: 'cinematic',
        dialogueStyle: 'visual'
    });

    useEffect(() => {
        // Load settings on mount
        setSettings({
            textSpeed: SettingsManager.get('textSpeed') || 'normal',
            colorTheme: SettingsManager.get('colorTheme') || 'classic_dark',
            scanlines: SettingsManager.get('scanlines') !== false,
            crtFlicker: SettingsManager.get('crtFlicker') !== false,
            introStyle: SettingsManager.get('introStyle') || 'cinematic',
            dialogueStyle: SettingsManager.get('dialogueStyle') || 'visual'
        });
    }, []);

    const updateSetting = (key, value) => {
        SettingsManager.set(key, value);
        setSettings(prev => ({ ...prev, [key]: value }));
        WebAudioService.select();
    };

    // Common styling
    const btnStyle = {
        background: '#111', color: '#c9a84c', border: '1px solid #c9a84c',
        padding: '12px 20px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
        textAlign: 'left', width: '100%', marginBottom: 15,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    };
    const titleStyle = { margin: 0, color: '#c9a84c', letterSpacing: 2, fontSize: 24 };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(6, 6, 8, 0.95)', color: '#eaeaea',
            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '40px 20px', overflowY: 'auto'
        }}>
            <div style={{ width: '100%', maxWidth: 600 }}>

                {/* ── HEADER ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px dashed #333', paddingBottom: 15 }}>
                    <div>
                        <h2 style={titleStyle}>[ SYSTEM SETTINGS ]</h2>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 5 }}>CONFIGURATION & PREFERENCES</div>
                    </div>
                    <button onClick={() => { WebAudioService.select(); onClose(); }} style={{ ...btnStyle, width: 'auto', marginBottom: 0 }}>
                        [ ESC ] CLOSE
                    </button>
                </div>

                {/* ── SETTINGS LIST ── */}
                <div>
                    <div style={{ color: '#888', marginBottom: 15, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Display</div>
                    <button style={btnStyle} onClick={() => updateSetting('colorTheme', settings.colorTheme === 'pantone_blue' ? 'classic_dark' : 'pantone_blue')}>
                        <span>COLOR THEME</span>
                        <span style={{ color: '#fff' }}>[{settings.colorTheme === 'pantone_blue' ? 'PANTONE BLUE' : 'CLASSIC DARK'}]</span>
                    </button>

                    <button style={btnStyle} onClick={() => updateSetting('scanlines', !settings.scanlines)}>
                        <span>CRT SCANLINES</span>
                        <span style={{ color: settings.scanlines ? '#4ade80' : '#888' }}>[{settings.scanlines ? 'ON' : 'OFF'}]</span>
                    </button>

                    <button style={btnStyle} onClick={() => updateSetting('crtFlicker', !settings.crtFlicker)}>
                        <span>SCREEN FLICKER</span>
                        <span style={{ color: settings.crtFlicker ? '#4ade80' : '#888' }}>[{settings.crtFlicker ? 'ON' : 'OFF'}]</span>
                    </button>

                    <div style={{ color: '#888', marginTop: 40, marginBottom: 15, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Gameplay</div>

                    <button style={btnStyle} onClick={() => {
                        const styles = ['cinematic', 'skip'];
                        const nextIdx = (styles.indexOf(settings.introStyle) + 1) % styles.length;
                        updateSetting('introStyle', styles[nextIdx]);
                    }}>
                        <span>INTRO SEQUENCE</span>
                        <span style={{ color: '#fff' }}>[{settings.introStyle === 'cinematic' ? 'CINEMATIC BRIEFING' : 'SKIP TO CREATOR'}]</span>
                    </button>

                    <button style={btnStyle} onClick={() => {
                        const styles = ['visual', 'terminal'];
                        const nextIdx = (styles.indexOf(settings.dialogueStyle) + 1) % styles.length;
                        updateSetting('dialogueStyle', styles[nextIdx]);
                    }}>
                        <span>DIALOGUE STYLE</span>
                        <span style={{ color: '#fff' }}>[{settings.dialogueStyle === 'visual' ? 'VISUAL (POKEMON)' : 'CLASSIC (TEXT)'}]</span>
                    </button>

                    <button style={btnStyle} onClick={() => {
                        const speeds = ['slow', 'normal', 'fast', 'instant'];
                        const nextIdx = (speeds.indexOf(settings.textSpeed) + 1) % speeds.length;
                        updateSetting('textSpeed', speeds[nextIdx]);
                    }}>
                        <span>TEXT SPEED</span>
                        <span style={{ color: '#fff' }}>[{settings.textSpeed.toUpperCase()}]</span>
                    </button>
                </div>

            </div>
        </div>
    );
}
