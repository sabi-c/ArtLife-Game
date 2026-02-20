#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════
 *   ArtLife — Game Launcher & Test Runner
 * ═══════════════════════════════════════════════════════
 *
 * Usage:
 *   node launch.cjs            → full launch (server + browser + tests)
 *   node launch.cjs --test     → tests only (server must already be running)
 *   node launch.cjs --open     → open browser only
 *   node launch.cjs --report   → print last saved report
 *   npm run launch             → same as node launch.cjs
 *
 * What it does:
 *   1. Starts the Vite dev server if not already running
 *   2. Opens the game in your default browser
 *   3. Runs the full headless test suite
 *   4. Prints a colour-coded results summary
 *   5. Writes a JSON report to reports/
 */

const { spawn, execSync, spawnSync } = require('child_process');
const http = require('http');
const fs   = require('fs');
const path = require('path');

// ── CLI flags ──────────────────────────────────────────
const args     = process.argv.slice(2);
const testOnly = args.includes('--test');
const openOnly = args.includes('--open');
const report   = args.includes('--report');

// ── Config ─────────────────────────────────────────────
const PORT      = 5174;
const BASE_URL  = `http://localhost:${PORT}`;   // for browser (works fine)
const CHECK_URL = `http://127.0.0.1:${PORT}`;  // for http.get (avoids IPv6 ::1 on macOS)
const REPORTS  = path.join(__dirname, 'reports');

// ── ANSI colours ───────────────────────────────────────
const C = {
    reset:   '\x1b[0m',
    bold:    '\x1b[1m',
    dim:     '\x1b[2m',
    red:     '\x1b[31m',
    green:   '\x1b[32m',
    yellow:  '\x1b[33m',
    blue:    '\x1b[34m',
    magenta: '\x1b[35m',
    cyan:    '\x1b[36m',
    white:   '\x1b[37m',
};
const bold  = s => `${C.bold}${s}${C.reset}`;
const dim   = s => `${C.dim}${s}${C.reset}`;
const red   = s => `${C.red}${s}${C.reset}`;
const green = s => `${C.green}${s}${C.reset}`;
const cyan  = s => `${C.cyan}${s}${C.reset}`;
const yellow = s => `${C.yellow}${s}${C.reset}`;
const mag   = s => `${C.magenta}${s}${C.reset}`;

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

function header() {
    console.log('');
    console.log(bold(cyan('╔══════════════════════════════════════════════╗')));
    console.log(bold(cyan('║') + '   ' + bold('ArtLife') + ' — Launcher & Test Runner          ' + bold(cyan('║'))));
    console.log(bold(cyan('╚══════════════════════════════════════════════╝')));
    console.log('');
}

function log(emoji, msg)  { console.log(`  ${emoji}  ${msg}`); }
function ok(msg)           { log('✅', green(msg)); }
function fail(msg)         { log('❌', red(msg)); }
function info(msg)         { log('ℹ️ ', cyan(msg)); }
function warn(msg)         { log('⚠️ ', yellow(msg)); }
function step(n, msg)      { console.log(`\n${bold(mag(`Step ${n}`))} ${bold(msg)}`); }

/** Check whether the dev server is already responding. */
function isServerRunning() {
    return new Promise(resolve => {
        // Use 127.0.0.1 explicitly — 'localhost' resolves to ::1 (IPv6) on macOS
        // but Vite binds to IPv4 only by default, causing ECONNREFUSED on ::1.
        const req = http.get(CHECK_URL, { timeout: 1500 }, (res) => {
            res.resume(); // consume response to free socket
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

/** Poll until the server responds (up to 30 s). */
async function waitForServer(proc) {
    const deadline = Date.now() + 30_000;
    process.stdout.write('  ⏳  Waiting for dev server');
    while (Date.now() < deadline) {
        await sleep(600);
        process.stdout.write('.');
        if (await isServerRunning()) {
            process.stdout.write(' ready!\n');
            return true;
        }
        // Check if spawn failed early
        if (proc && proc.exitCode !== null) {
            process.stdout.write('\n');
            return false;
        }
    }
    process.stdout.write('\n');
    return false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Open URL in default browser (macOS / Linux / Windows). */
function openBrowser(url) {
    const cmds = { darwin: 'open', linux: 'xdg-open', win32: 'start' };
    const cmd = cmds[process.platform] || 'open';
    try {
        execSync(`${cmd} "${url}"`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/** Parse test_game.cjs stdout into structured results. */
function parseTestOutput(raw) {
    const lines  = raw.split('\n');
    const tests  = [];
    let current  = null;
    let passed   = 0;
    let failed   = 0;
    const errors = [];

    for (const line of lines) {
        const sectionMatch = line.match(/📋 Test (\d+): (.+)/);
        if (sectionMatch) {
            current = { id: +sectionMatch[1], name: sectionMatch[2], checks: [] };
            tests.push(current);
            continue;
        }
        const passMatch = line.match(/✅ (.+)/);
        if (passMatch && current) {
            current.checks.push({ pass: true, label: passMatch[1].trim() });
            passed++;
            continue;
        }
        const failMatch = line.match(/❌ (.+)/);
        if (failMatch && current) {
            current.checks.push({ pass: false, label: failMatch[1].trim() });
            failed++;
            continue;
        }
        if (line.includes('BROWSER ERROR:')) {
            errors.push(line.replace('BROWSER ERROR:', '').trim());
        }
    }

    return { tests, passed, failed, errors };
}

/** Run test_game.cjs and return structured results. */
function runTests() {
    return new Promise(resolve => {
        console.log('');
        info('Running headless test suite via Playwright...');
        console.log('');

        const child = spawn('node', ['test_game.cjs'], {
            cwd: __dirname,
            env: { ...process.env },
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', d => {
            stdout += d;
            // Stream test lines live
            d.toString().split('\n').forEach(line => {
                if (line.includes('✅')) process.stdout.write(`  ${green('✅')} ${line.split('✅')[1]?.trim() || ''}\n`);
                else if (line.includes('❌')) process.stdout.write(`  ${red('❌')} ${line.split('❌')[1]?.trim() || ''}\n`);
                else if (line.includes('📋 Test')) process.stdout.write(`\n  ${bold(line.trim())}\n`);
            });
        });

        child.stderr.on('data', d => { stderr += d; });

        child.on('close', code => {
            const results = parseTestOutput(stdout);
            results.exitCode = code;
            results.stderr   = stderr;
            resolve(results);
        });
    });
}

/** Save a JSON report to reports/. */
function saveReport(results) {
    if (!fs.existsSync(REPORTS)) fs.mkdirSync(REPORTS, { recursive: true });

    const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = path.join(REPORTS, `report-${ts}.json`);
    const latest   = path.join(REPORTS, 'latest.json');

    const doc = {
        timestamp: new Date().toISOString(),
        url: BASE_URL,
        passed: results.passed,
        failed: results.failed,
        total:  results.passed + results.failed,
        passRate: results.passed + results.failed > 0
            ? `${Math.round(results.passed / (results.passed + results.failed) * 100)}%`
            : 'n/a',
        tests:   results.tests,
        browserErrors: results.errors,
    };

    fs.writeFileSync(filename, JSON.stringify(doc, null, 2));
    fs.writeFileSync(latest, JSON.stringify(doc, null, 2));
    return { filename, doc };
}

/** Print the latest saved report. */
function printLastReport() {
    const latest = path.join(REPORTS, 'latest.json');
    if (!fs.existsSync(latest)) {
        warn('No report found. Run `npm run launch` first.');
        return;
    }
    const doc = JSON.parse(fs.readFileSync(latest, 'utf8'));
    console.log('');
    console.log(bold('Last test report:'), dim(doc.timestamp));
    console.log(`  Pass rate: ${doc.passed}/${doc.total} (${doc.passRate})`);
    if (doc.browserErrors.length) {
        console.log(red(`  Browser errors: ${doc.browserErrors.length}`));
        doc.browserErrors.forEach(e => console.log(red(`    • ${e}`)));
    }
    doc.tests.forEach(t => {
        const allPass = t.checks.every(c => c.pass);
        console.log(`  ${allPass ? '✅' : '❌'} Test ${t.id}: ${t.name}`);
        t.checks.filter(c => !c.pass).forEach(c => {
            console.log(red(`       ↳ FAIL: ${c.label}`));
        });
    });
}

// ──────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────

(async () => {
    header();

    // ── --report flag ──────────────────────────────────
    if (report) {
        printLastReport();
        process.exit(0);
    }

    let serverWasStarted = false;
    let serverProc       = null;

    // ── Step 1: Dev server ─────────────────────────────
    if (!testOnly && !openOnly) {
        step(1, 'Dev server');
    }

    const alreadyRunning = await isServerRunning();

    if (alreadyRunning) {
        ok(`Dev server already running at ${BASE_URL}`);
    } else if (!testOnly) {
        info(`Starting dev server on port ${PORT}...`);
        serverProc = spawn('npm', ['run', 'dev'], {
            cwd: __dirname,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        serverProc.stderr.on('data', d => {
            const txt = d.toString();
            // Surface Vite errors only
            if (txt.includes('error') || txt.includes('Error')) {
                warn(`Vite: ${txt.trim()}`);
            }
        });

        const ready = await waitForServer(serverProc);
        if (!ready) {
            fail('Dev server failed to start within 30 s. Check `npm run dev` manually.');
            process.exit(1);
        }
        ok(`Dev server started at ${BASE_URL}`);
        serverWasStarted = true;
    } else {
        // --test but server not running
        fail(`Dev server is not running. Start it with: npm run dev`);
        process.exit(1);
    }

    // ── Step 2: Open browser ───────────────────────────
    if (!testOnly) {
        step(2, 'Opening browser');
        const opened = openBrowser(BASE_URL);
        if (opened) {
            ok(`Game opened at ${BASE_URL}`);
        } else {
            warn(`Could not auto-open browser. Navigate to: ${BASE_URL}`);
        }
        // Brief pause so the browser has a moment to load before tests start
        await sleep(1500);
    }

    // ── Step 3: Headless tests ─────────────────────────
    if (!openOnly) {
        step(!testOnly ? 3 : 1, 'Headless test suite');
        const results = await runTests();

        // ── Summary ──────────────────────────────────────
        console.log('');
        console.log(bold(cyan('══════════════════════════════════════════════')));

        const allPass = results.failed === 0;
        const total   = results.passed + results.failed;

        if (allPass) {
            console.log(bold(green(`  ✅  ALL ${results.passed}/${total} TESTS PASSED — GREEN LIGHT 🟢`)));
        } else {
            console.log(bold(red(`  ❌  ${results.failed} FAILURE(S) — ${results.passed}/${total} passed`)));
        }

        if (results.errors.length) {
            console.log('');
            console.log(bold(red(`  Browser errors caught (${results.errors.length}):`)));
            results.errors.forEach(e => console.log(red(`    • ${e}`)));
        }

        // ── Save report ───────────────────────────────────
        const { filename, doc } = saveReport(results);
        console.log('');
        console.log(dim(`  Report saved → ${path.relative(process.cwd(), filename)}`));
        console.log(dim(`  View anytime → npm run launch -- --report`));
        console.log(bold(cyan('══════════════════════════════════════════════')));
        console.log('');

        // If there are failures, print actionable details
        if (!allPass) {
            console.log(bold('  Failed checks:'));
            results.tests.forEach(t => {
                t.checks.filter(c => !c.pass).forEach(c => {
                    console.log(red(`    • [Test ${t.id}: ${t.name}] ${c.label}`));
                });
            });
            console.log('');
            console.log(dim('  Run `window.game.debug()` in the browser console for a full error report.'));
            console.log('');
        }

        if (serverWasStarted && allPass) {
            info('Dev server is still running. Close this terminal to stop it.');
            info('The game is open in your browser — go play! 🎮');
        }

        // Keep server alive if we started it and tests passed
        if (serverWasStarted && allPass) {
            // Don't exit — leave server running
            process.stdin.resume();
            process.on('SIGINT', () => {
                console.log('\n\n  Shutting down dev server...');
                serverProc.kill('SIGTERM');
                process.exit(0);
            });
        } else if (serverWasStarted && !allPass) {
            // Tests failed — keep server up for debugging
            warn('Tests had failures. Server is kept running for debugging.');
            info(`Game: ${BASE_URL}`);
            info('Press Ctrl+C to stop the server.');
            process.stdin.resume();
            process.on('SIGINT', () => {
                serverProc.kill('SIGTERM');
                process.exit(1);
            });
        } else {
            process.exit(allPass ? 0 : 1);
        }
    } else {
        // --open only
        info('Server is running. Press Ctrl+C to stop.');
        if (serverWasStarted) {
            process.stdin.resume();
            process.on('SIGINT', () => {
                serverProc.kill('SIGTERM');
                process.exit(0);
            });
        }
    }
})();
