/**
 * src/utils/format.js
 * Shared formatting utilities for money, percentages, and intel-gated prices.
 *
 * Consolidates the ~19 instances of `.toLocaleString()` money formatting
 * scattered across dashboard.js, BloombergTerminal.jsx, and other files.
 */

/**
 * Format a number as a dollar amount with thousands separators.
 * @param {number} value - The monetary value
 * @returns {string} Formatted string like "$1,234,567"
 */
export function formatMoney(value) {
    return `$${Math.round(value).toLocaleString()}`;
}

/**
 * Format a large number in abbreviated form.
 * @param {number} value - The monetary value
 * @returns {string} Formatted string like "$1.2M" or "$450K"
 */
export function formatMoneyShort(value) {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs}`;
}

/**
 * Format a number as a percentage with sign.
 * @param {number} value - The percentage value (e.g. 12.3 for 12.3%)
 * @returns {string} Formatted string like "+12.3%" or "-5.0%"
 */
export function formatPct(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

/**
 * Round a price based on intel level — lower intel = less precision.
 * @param {number} price - The actual price
 * @param {number} intel - Intel stat (0-100)
 * @returns {string} Formatted price string with appropriate rounding
 */
export function formatPriceByIntel(price, intel) {
    if (intel >= 80) return formatMoney(price);
    if (intel >= 50) return formatMoney(Math.round(price / 100) * 100);
    if (intel >= 20) return formatMoney(Math.round(price / 1000) * 1000);
    return formatMoneyShort(price);
}
