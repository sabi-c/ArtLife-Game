/**
 * ErrorRegistry.js
 * Extracted from phaserInit.js during Phase 41 refactoring.
 * Global error registry available before Phaser boots.
 */

window.ArtLife = {
    _errors: [],
    _missingAssets: [],
    _sceneErrors: [],

    recordError(context, err) {
        const entry = { t: Date.now(), context, msg: err?.message || String(err), stack: err?.stack };
        this._errors.push(entry);
        console.error(`[ArtLife:${context}]`, err);
    },

    recordMissingAsset(key, url) {
        if (!this._missingAssets.find(a => a.key === key)) {
            this._missingAssets.push({ key, url, t: Date.now() });
        }
    },

    recordSceneError(sceneKey, err) {
        this._sceneErrors.push({ sceneKey, msg: err?.message || String(err), t: Date.now() });
        console.error(`[Scene:${sceneKey}]`, err);
    },

    report() {
        return {
            errors: this._errors,
            missingAssets: this._missingAssets,
            sceneErrors: this._sceneErrors,
        };
    },

    clearErrors() {
        this._errors = [];
        this._missingAssets = [];
        this._sceneErrors = [];
    },
};

// Global JS error handler — catches anything that escapes scene try/catch
window.addEventListener('error', (e) => {
    window.ArtLife.recordError('window', e.error || new Error(e.message));
});
window.addEventListener('unhandledrejection', (e) => {
    window.ArtLife.recordError('promise', e.reason);
});
