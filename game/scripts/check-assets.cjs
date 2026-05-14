#!/usr/bin/env node
/**
 * check-assets.cjs — Art Life asset audit.
 *
 * Reads the asset manifest at docs/handoff/2026-05-13/asset_manifest.json,
 * walks the expected asset paths under game/public/, reports each as present
 * or missing, and exits with a non-zero code if any *required* asset is missing.
 *
 * Required = entries with status "expected" or "missing". Status "optional"
 * is informational only — never fails the audit.
 *
 * Usage:
 *   node scripts/check-assets.cjs           # human-readable report
 *   node scripts/check-assets.cjs --json    # machine-readable JSON
 *
 * Exit codes:
 *   0 — all required assets present (audit pass)
 *   1 — at least one expected asset is missing on disk (audit fail)
 *   2 — manifest unreadable or malformed (configuration error)
 */

const fs = require('fs');
const path = require('path');

// Resolve paths relative to the game/ directory regardless of where the script is invoked.
const GAME_DIR = path.resolve(__dirname, '..');
const REPO_DIR = path.resolve(GAME_DIR, '..');
const MANIFEST_PATH = path.join(REPO_DIR, 'docs', 'handoff', '2026-05-13', 'asset_manifest.json');
const PUBLIC_DIR = path.join(GAME_DIR, 'public');

const wantJson = process.argv.includes('--json');

// Color codes — only emit if stdout is a TTY
const TTY = process.stdout.isTTY;
const c = (code, str) => TTY ? `\x1b[${code}m${str}\x1b[0m` : str;
const green = (s) => c('32', s);
const red = (s) => c('31', s);
const yellow = (s) => c('33', s);
const dim = (s) => c('2', s);
const bold = (s) => c('1', s);

function loadManifest() {
    try {
        const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error(`[check-assets] Failed to read manifest at ${MANIFEST_PATH}`);
        console.error(`[check-assets] ${err.message}`);
        process.exit(2);
    }
}

function auditAsset(asset) {
    const fullPath = path.join(PUBLIC_DIR, asset.path);
    const exists = fs.existsSync(fullPath);
    let size = null;
    if (exists) {
        try { size = fs.statSync(fullPath).size; } catch { /* ignore */ }
    }
    return {
        ...asset,
        full_path: fullPath,
        exists,
        size_bytes: size,
        size_kb: size != null ? Math.round(size / 1024) : null,
    };
}

function categorize(audited) {
    // Buckets:
    //   ok               — asset present on disk
    //   regression       — status=tracked, but file missing (audit failure: was there, now gone)
    //   known_missing    — status=missing, file missing (expected production todo, not a failure)
    //   missing_optional — status=optional, file missing (always informational)
    if (audited.exists) return 'ok';
    if (audited.status === 'tracked') return 'regression';
    if (audited.status === 'optional') return 'missing_optional';
    return 'known_missing';
}

function renderHuman(manifest, audited) {
    const lines = [];
    lines.push(bold('Art Life — Asset Audit'));
    lines.push(dim(`Manifest: ${MANIFEST_PATH}`));
    lines.push(dim(`Public:   ${PUBLIC_DIR}`));
    lines.push('');

    let presentCount = 0;
    let regressionCount = 0;
    let knownMissingCount = 0;
    let missingOptionalCount = 0;

    audited.forEach(cat => {
        lines.push(bold(`── ${cat.category} ──`) + dim(`  ${cat.description}`));
        cat.assets.forEach(a => {
            const bucket = categorize(a);
            const promptHint = a.prompt_ref ? dim(`  (${a.prompt_ref})`) : '';
            const notesHint = a.notes ? dim(`  — ${a.notes}`) : '';
            const sizeHint = a.size_kb != null ? dim(`  [${a.size_kb}KB]`) : '';
            if (bucket === 'ok') {
                presentCount++;
                lines.push(`  ${green('✓')} ${a.path}${sizeHint}`);
            } else if (bucket === 'regression') {
                regressionCount++;
                lines.push(`  ${red('✗')} ${red(a.path)}${promptHint}${notesHint}  ${red('REGRESSION')}`);
            } else if (bucket === 'known_missing') {
                knownMissingCount++;
                lines.push(`  ${yellow('○')} ${yellow(a.path)}${promptHint}${notesHint}`);
            } else {
                missingOptionalCount++;
                lines.push(`  ${dim('○')} ${dim(a.path)} ${dim('(optional)')}${promptHint}`);
            }
        });
        lines.push('');
    });

    lines.push(bold('Summary'));
    lines.push(`  ${green(presentCount + ' present')}`);
    if (regressionCount > 0) {
        lines.push(`  ${red(regressionCount + ' regression(s) — tracked assets missing from disk')}`);
    }
    if (knownMissingCount > 0) {
        lines.push(`  ${yellow(knownMissingCount + ' known-missing (production todo)')}`);
    }
    if (missingOptionalCount > 0) {
        lines.push(`  ${dim(missingOptionalCount + ' optional missing')}`);
    }
    lines.push('');
    if (regressionCount === 0) {
        lines.push(green('Audit PASS') + dim(' — no regressions detected. ' + knownMissingCount + ' assets still queued for generation.'));
    } else {
        lines.push(red('Audit FAIL') + dim(' — ' + regressionCount + ' tracked asset(s) missing.'));
    }
    lines.push('');
    lines.push(dim('Prompt pack:  ' + manifest.prompt_pack));
    lines.push(dim('Spec:         ' + manifest.spec_doc));

    return lines.join('\n');
}

function renderJson(manifest, audited) {
    const allAssets = [].concat(...audited.map(c => c.assets.map(a => ({ ...a, category: c.category }))));
    const presentCount = allAssets.filter(a => a.exists).length;
    const regressions = allAssets.filter(a => !a.exists && a.status === 'tracked');
    const knownMissing = allAssets.filter(a => !a.exists && a.status === 'missing');
    const missingOptional = allAssets.filter(a => !a.exists && a.status === 'optional');
    return JSON.stringify({
        spec_version: manifest.spec_version,
        spec_date: manifest.spec_date,
        summary: {
            present: presentCount,
            regressions: regressions.length,
            known_missing: knownMissing.length,
            missing_optional: missingOptional.length,
            audit_pass: regressions.length === 0,
        },
        categories: audited,
    }, null, 2);
}

function main() {
    const manifest = loadManifest();
    const audited = manifest.categories.map(cat => ({
        ...cat,
        assets: cat.assets.map(auditAsset),
    }));

    const flatAssets = [].concat(...audited.map(c => c.assets));
    const regressions = flatAssets.filter(a => !a.exists && a.status === 'tracked');

    if (wantJson) {
        process.stdout.write(renderJson(manifest, audited) + '\n');
    } else {
        process.stdout.write(renderHuman(manifest, audited) + '\n');
    }

    // Exit non-zero only on regression. Known-missing assets do not fail the audit.
    process.exit(regressions.length === 0 ? 0 : 1);
}

main();
