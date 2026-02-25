/**
 * formatMoney.js — Centralized money formatting utility
 *
 * Replaces ad-hoc toLocaleString() / inline ternary formatting
 * across Bloomberg, Artnet, MarketSimulator, and news strings.
 *
 * Usage:
 *   import { fmtMoney } from '../utils/formatMoney.js';
 *   fmtMoney(1250000)   → "$1.25M"
 *   fmtMoney(45500)     → "$45.5K"
 *   fmtMoney(850)       → "$850"
 *   fmtMoney(-120000)   → "-$120K"
 *   fmtMoney(0.15, { prefix: '', suffix: '%', multiply: 100 }) → "15%"
 */

/**
 * Format a monetary value into a human-readable compact string.
 *
 * @param {number} amount — raw numeric value
 * @param {object} [opts] — formatting options
 * @param {string} [opts.prefix='$'] — currency prefix
 * @param {string} [opts.suffix=''] — suffix (e.g. '%')
 * @param {number} [opts.multiply=1] — multiply amount before formatting
 * @param {boolean} [opts.signed=false] — show + for positive values
 * @param {number} [opts.decimals] — override decimal places (null = auto)
 * @returns {string}
 */
export function fmtMoney(amount, opts = {}) {
    if (amount == null || isNaN(amount)) return opts.prefix ?? '$' + '0';

    const multiplied = amount * (opts.multiply ?? 1);
    const abs = Math.abs(multiplied);
    const sign = multiplied < 0 ? '-' : (opts.signed && multiplied > 0 ? '+' : '');
    const prefix = opts.prefix ?? '$';
    const suffix = opts.suffix ?? '';

    let formatted;
    if (abs >= 1_000_000_000) {
        const d = opts.decimals ?? (abs >= 10_000_000_000 ? 0 : 1);
        formatted = `${(abs / 1e9).toFixed(d)}B`;
    } else if (abs >= 1_000_000) {
        const d = opts.decimals ?? (abs >= 10_000_000 ? 1 : 2);
        formatted = `${(abs / 1e6).toFixed(d)}M`;
    } else if (abs >= 1_000) {
        const d = opts.decimals ?? (abs >= 100_000 ? 0 : 1);
        formatted = `${(abs / 1e3).toFixed(d)}K`;
    } else {
        formatted = abs.toLocaleString(undefined, {
            maximumFractionDigits: opts.decimals ?? 0,
        });
    }

    return `${sign}${prefix}${formatted}${suffix}`;
}

/**
 * Format a percentage change with sign and color hint.
 * @param {number} delta — percentage value (e.g. 12.5 for +12.5%)
 * @returns {{ text: string, color: string }}
 */
export function fmtDelta(delta) {
    if (delta == null || isNaN(delta)) return { text: '—', color: '#888' };
    const sign = delta > 0 ? '+' : '';
    const text = `${sign}${delta.toFixed(1)}%`;
    const color = delta > 0 ? '#50c878' : delta < 0 ? '#c94040' : '#888';
    return { text, color };
}

/**
 * Format a compact number (no currency prefix).
 * @param {number} n — numeric value
 * @returns {string}
 */
export function fmtCompact(n) {
    return fmtMoney(n, { prefix: '' });
}
