import { TICKER_PHRASES } from '../../data/ticker_phrases.js';

export class TickerSystem {
    /**
     * Get a random selection of unique phrases.
     */
    static getPhrases(count) {
        const shuffled = [...TICKER_PHRASES].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    /**
     * Create a single HTML span string for a row from an array of phrases.
     */
    static createRowContent(phrases) {
        return phrases.map(p => `<span>${p}</span>`).join('');
    }

    /**
     * Generate the HTML for the Ticker based on a preset.
     * Presets available: 'single', 'multi', 'angled', 'off'
     */
    static generate(preset = 'single') {
        if (preset === 'off') {
            return '';
        }

        if (preset === 'single') {
            const phrases = this.getPhrases(15);
            const rowContent = this.createRowContent(phrases);
            return `
<div class="t-kruger-ticker-wrapper t-kruger-single">
  <div class="ticker-track">
    <div>${rowContent}</div><div>${rowContent}</div>
  </div>
</div>
`;
        } // End single

        // Layouts for Multi and Angled
        const isAngled = preset === 'angled';
        const wrapperClass = isAngled ? "t-kruger-ticker-wrapper t-kruger-multi t-kruger-angled" : "t-kruger-ticker-wrapper t-kruger-multi";

        const row1 = this.createRowContent(this.getPhrases(12));
        const row2 = this.createRowContent(this.getPhrases(12));
        const row3 = this.createRowContent(this.getPhrases(12));
        const row4 = this.createRowContent(this.getPhrases(12));

        return `
<div class="${wrapperClass}">
  <div class="t-ticker-row t-ticker-forward">
    <div class="ticker-track">
      <div>${row1}</div><div>${row1}</div>
    </div>
  </div>
  <div class="t-ticker-row t-ticker-reverse">
    <div class="ticker-track" style="animation-duration: 90s;">
      <div>${row2}</div><div>${row2}</div>
    </div>
  </div>
  <div class="t-ticker-row t-ticker-forward">
    <div class="ticker-track" style="animation-duration: 75s;">
      <div>${row3}</div><div>${row3}</div>
    </div>
  </div>
  <div class="t-ticker-row t-ticker-reverse">
    <div class="ticker-track" style="animation-duration: 85s;">
      <div>${row4}</div><div>${row4}</div>
    </div>
  </div>
</div>
`;
    }
}
