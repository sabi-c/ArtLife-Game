/**
 * SettingsManager.js
 * 
 * Handles global game settings and preferences (independent of save games).
 * Provides a schema-driven approach so the UI can auto-generate menus.
 */
export class SettingsManager {
    static SETTINGS_KEY = 'artlife_global_settings';

    // Core Schema Definition
    static SCHEMA = [
        {
            id: 'colorTheme',
            label: 'Color Theme',
            type: 'cycle',
            options: [
                { value: 'pantone_blue', display: 'Pantone Dark Blue C' },
                { value: 'classic_dark', display: 'Classic Dark' }
            ],
            default: 'pantone_blue'
        },
        {
            id: 'menuTheme',
            label: 'Menu Theme',
            type: 'cycle',
            options: [
                { value: 'kruger', display: 'Barbara Kruger' },
                { value: 'default', display: 'Classic Terminal' },
                { value: 'vaporwave', display: 'Vaporwave (WIP)' }
            ],
            default: 'kruger'
        },
        {
            id: 'introStyle',
            label: 'Intro Sequence',
            type: 'cycle',
            options: [
                { value: 'cinematic', display: 'Cinematic Briefing' },
                { value: 'skip', display: 'Skip to Creator' }
            ],
            default: 'cinematic'
        },
        {
            id: 'dialogueStyle',
            label: 'Dialogue Style',
            type: 'cycle',
            options: [
                { value: 'visual', display: 'Visual (Pokemon RPG)' },
                { value: 'terminal', display: 'Classic Terminal' }
            ],
            default: 'visual'
        },
        {
            id: 'tickerStyle',
            label: 'Ticker Style',
            type: 'cycle',
            options: [
                { value: 'multi', display: 'Multi (Wall Street)' },
                { value: 'angled', display: 'Angled (Vortice)' },
                { value: 'single', display: 'Single (Kruger)' },
                { value: 'off', display: 'Off' } // 'off' is a valid state
            ],
            default: 'multi' // Defaulting to the new multi-line experience
        }
    ];

    static _cache = null;

    static init() {
        if (!this._cache) {
            this._load();
        }
    }

    static _load() {
        try {
            const stored = localStorage.getItem(this.SETTINGS_KEY);
            this._cache = stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error("Failed to load settings from localStorage. Using defaults.", e);
            this._cache = {};
        }

        // Migrate deprecated keys (like the old 'artlife_ticker_style')
        this._migrateLegacySettings();
    }

    static _migrateLegacySettings() {
        const legacyTicker = localStorage.getItem('artlife_ticker_style');
        if (legacyTicker) {
            if (this.get('tickerStyle') === this._getDefault('tickerStyle')) {
                this.set('tickerStyle', legacyTicker);
            }
            localStorage.removeItem('artlife_ticker_style');
        }
    }

    static save() {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this._cache));
        } catch (e) {
            console.error("Failed to save settings to localStorage.", e);
        }
    }

    static _getDefault(key) {
        const def = this.SCHEMA.find(s => s.id === key);
        return def ? def.default : undefined;
    }

    /**
     * Get a setting value, falling back to the schema default if missing or invalid.
     */
    static get(key) {
        if (!this._cache) this.init();

        const def = this.SCHEMA.find(s => s.id === key);
        if (!def) return undefined;

        let val = this._cache[key];

        // Validate choice exists in schema options
        if (def.type === 'cycle') {
            const validOptions = def.options.map(o => o.value);
            if (!validOptions.includes(val)) {
                val = def.default;
            }
        } else if (val === undefined) {
            val = def.default;
        }

        return val;
    }

    /**
     * Set a setting value and persist to storage.
     */
    static set(key, value) {
        if (!this._cache) this.init();
        this._cache[key] = value;
        this.save();
        window.dispatchEvent(new CustomEvent('settings-changed', { detail: { key, value } }));
    }

    /**
     * Helper to cycle to the next value for a given choice setting.
     */
    static cycleNext(key) {
        const def = this.SCHEMA.find(s => s.id === key);
        if (!def || def.type !== 'cycle') return;

        const currentVal = this.get(key);
        const currentIndex = def.options.findIndex(o => o.value === currentVal);
        const nextIndex = (currentIndex + 1) % def.options.length;

        this.set(key, def.options[nextIndex].value);
    }

    /**
     * Resolves the display string for the current value of a cyclic setting.
     */
    static getDisplayString(key) {
        const def = this.SCHEMA.find(s => s.id === key);
        if (!def || def.type !== 'cycle') return String(this.get(key));

        const currentVal = this.get(key);
        const option = def.options.find(o => o.value === currentVal);
        return option ? option.display : String(currentVal);
    }

    /**
     * Return the schema definition for dynamic UI generation.
     */
    static getSchema() {
        return this.SCHEMA;
    }
}
