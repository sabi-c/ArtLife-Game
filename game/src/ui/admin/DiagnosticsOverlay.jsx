import React, { useState, useEffect } from 'react';

/**
 * DiagnosticsOverlay — F2 key toggles this panel on deployed builds.
 * Shows: version info, error log, missing assets, scene errors, Phaser scale info.
 * Useful for debugging issues on GitHub Pages where console isn't easily accessible.
 */
export default function DiagnosticsOverlay({ onClose }) {
    const [data, setData] = useState(null);
    const [consoleLog, setConsoleLog] = useState([]);

    useEffect(() => {
        const refresh = () => {
            const report = window.ArtLife?.report?.() || {};
            const ver = window.ARTLIFE_VERSION || {};
            const game = window.phaserGame;
            const state = window._artLifeState;

            setData({
                version: `v${ver.version || '?'}-${ver.hash || '?'}`,
                built: ver.built || 'unknown',
                scaleW: game?.scale?.width || 0,
                scaleH: game?.scale?.height || 0,
                canvasW: game?.canvas?.width || 0,
                canvasH: game?.canvas?.height || 0,
                activeScenes: game?.scene?.scenes
                    ?.filter(s => s.sys.isActive())
                    ?.map(s => s.sys.settings.key) || [],
                errors: report.errors || [],
                missingAssets: report.missingAssets || [],
                sceneErrors: report.sceneErrors || [],
                hasState: !!state,
                week: state?.week,
                cash: state?.cash,
                playerName: state?.playerName,
                hour: state?.hour,
                userAgent: navigator.userAgent.substring(0, 80),
                screenW: window.innerWidth,
                screenH: window.innerHeight,
            });
        };

        refresh();
        const interval = setInterval(refresh, 2000);

        // Capture recent console.error output
        const origError = console.error;
        const captured = [];
        console.error = (...args) => {
            origError.apply(console, args);
            captured.push({ t: Date.now(), msg: args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ').substring(0, 200) });
            if (captured.length > 50) captured.shift();
            setConsoleLog([...captured]);
        };

        return () => {
            clearInterval(interval);
            console.error = origError;
        };
    }, []);

    if (!data) return null;

    const fmt = (ts) => new Date(ts).toLocaleTimeString();
    const errorCount = data.errors.length + data.sceneErrors.length + data.missingAssets.length;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(0,0,0,0.92)', color: '#c8c8d8',
            fontFamily: '"IBM Plex Mono", "Courier New", monospace', fontSize: 11,
            overflow: 'auto', padding: '16px 20px',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: '#c9a84c', fontSize: 14, letterSpacing: 2 }}>DIAGNOSTICS</span>
                <span onClick={onClose} style={{ color: '#888', cursor: 'pointer', padding: '4px 12px' }}>[ESC / F2 to close]</span>
            </div>

            {/* System Info */}
            <Section title="SYSTEM">
                <Row label="Version" value={data.version} />
                <Row label="Built" value={data.built} />
                <Row label="Screen" value={`${data.screenW}x${data.screenH}`} />
                <Row label="User Agent" value={data.userAgent} />
            </Section>

            {/* Phaser Info */}
            <Section title="PHASER ENGINE">
                <Row label="Scale" value={`${data.scaleW}x${data.scaleH}`} highlight={data.scaleH < 10} />
                <Row label="Canvas" value={`${data.canvasW}x${data.canvasH}`} highlight={data.canvasH < 10} />
                <Row label="Active Scenes" value={data.activeScenes.join(', ') || '(none)'} />
            </Section>

            {/* Game State */}
            <Section title="GAME STATE">
                <Row label="Initialized" value={data.hasState ? 'YES' : 'NO'} highlight={!data.hasState} />
                {data.hasState && <>
                    <Row label="Player" value={data.playerName || '?'} />
                    <Row label="Week" value={String(data.week)} />
                    <Row label="Cash" value={`$${(data.cash || 0).toLocaleString()}`} />
                    <Row label="Hour" value={String(data.hour)} />
                </>}
            </Section>

            {/* Errors */}
            <Section title={`ERRORS (${errorCount})`} highlight={errorCount > 0}>
                {data.errors.length === 0 && data.sceneErrors.length === 0 && data.missingAssets.length === 0 && (
                    <div style={{ color: '#3a8a5c' }}>No errors recorded.</div>
                )}
                {data.missingAssets.map((a, i) => (
                    <div key={`ma${i}`} style={{ color: '#ff6b6b', marginBottom: 2 }}>
                        [{fmt(a.t)}] MISSING ASSET: {a.key} ({a.url})
                    </div>
                ))}
                {data.sceneErrors.map((e, i) => (
                    <div key={`se${i}`} style={{ color: '#ff6b6b', marginBottom: 2 }}>
                        [{fmt(e.t)}] SCENE [{e.sceneKey}]: {e.msg}
                    </div>
                ))}
                {data.errors.map((e, i) => (
                    <div key={`e${i}`} style={{ color: '#ff8888', marginBottom: 2 }}>
                        [{fmt(e.t)}] [{e.context}] {e.msg}
                    </div>
                ))}
            </Section>

            {/* Console Errors (live capture) */}
            {consoleLog.length > 0 && (
                <Section title={`CONSOLE ERRORS (${consoleLog.length})`}>
                    {consoleLog.slice(-20).map((e, i) => (
                        <div key={`c${i}`} style={{ color: '#ffaa66', marginBottom: 2, wordBreak: 'break-all' }}>
                            [{fmt(e.t)}] {e.msg}
                        </div>
                    ))}
                </Section>
            )}

            {/* Actions */}
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <button onClick={() => {
                    window.ArtLife?.clearErrors?.();
                    setConsoleLog([]);
                }} style={btnStyle}>[CLEAR ERRORS]</button>
                <button onClick={() => {
                    const report = { ...data, consoleLog };
                    navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
                }} style={btnStyle}>[COPY REPORT]</button>
                <button onClick={() => window.location.reload()} style={{ ...btnStyle, borderColor: '#ff6b6b', color: '#ff6b6b' }}>[RELOAD]</button>
            </div>
        </div>
    );
}

const btnStyle = {
    background: 'none', border: '1px solid #c9a84c', color: '#c9a84c',
    padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
};

function Section({ title, children, highlight }) {
    return (
        <div style={{ marginBottom: 12, borderLeft: `2px solid ${highlight ? '#ff6b6b' : '#333'}`, paddingLeft: 10 }}>
            <div style={{ color: highlight ? '#ff6b6b' : '#5a5a6a', fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>{title}</div>
            {children}
        </div>
    );
}

function Row({ label, value, highlight }) {
    return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 1 }}>
            <span style={{ color: '#666', minWidth: 100 }}>{label}:</span>
            <span style={{ color: highlight ? '#ff6b6b' : '#c8c8d8' }}>{value}</span>
        </div>
    );
}
