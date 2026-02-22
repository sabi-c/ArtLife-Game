/**
 * TestReporter.cjs — Comprehensive test reporter for ArtLife Playwright tests
 *
 * Features:
 * - Hard assertions (throw on fail) and soft assertions (log + continue)
 * - Automatic screenshot on failure with game state capture
 * - Browser console error / warning / page error aggregation
 * - Network failure tracking
 * - Structured JSON + Markdown report output
 * - Per-test timing, per-suite summary
 * - Section grouping for organized output
 */
const fs = require('fs');
const path = require('path');

const C = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[90m',
    bold: '\x1b[1m',
};

class TestReporter {
    constructor(page, reportDir = 'reports') {
        this.page = page;
        this.reportDir = path.resolve(__dirname, '../../', reportDir);
        this.screenshotsDir = path.join(this.reportDir, 'screenshots');
        this.startTime = Date.now();
        this.currentSection = null;
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            warned: 0,
            sections: [],
            tests: [],
            browserErrors: [],
            browserWarnings: [],
            networkErrors: [],
            pageErrors: [],
        };

        // Ensure directories exist
        if (!fs.existsSync(this.reportDir)) fs.mkdirSync(this.reportDir, { recursive: true });
        if (!fs.existsSync(this.screenshotsDir)) fs.mkdirSync(this.screenshotsDir, { recursive: true });

        // Browser log listeners
        this.page.on('console', msg => {
            const text = msg.text();
            if (msg.type() === 'error') {
                this.results.browserErrors.push({ text, ts: Date.now() });
                if (!text.includes('Failed to process file') && !text.includes('404')) {
                    console.log(`  ${C.red}[BROWSER ERROR]${C.reset} ${text.slice(0, 150)}`);
                }
            } else if (msg.type() === 'warning') {
                this.results.browserWarnings.push({ text, ts: Date.now() });
            }
        });

        this.page.on('pageerror', err => {
            this.results.pageErrors.push({ message: err.message, stack: err.stack, ts: Date.now() });
            console.log(`  ${C.red}[PAGE ERROR]${C.reset} ${err.message}`);
        });

        this.page.on('requestfailed', request => {
            const url = request.url();
            const failure = request.failure()?.errorText || 'Unknown';
            // Ignore known missing assets
            if (url.includes('/sprites/') || url.includes('/backgrounds/')) return;
            this.results.networkErrors.push({ url, failure, ts: Date.now() });
        });
    }

    /**
     * Start a named section for grouping tests in the report.
     */
    section(name) {
        this.currentSection = name;
        this.results.sections.push({ name, startedAt: Date.now() });
        console.log(`\n${C.bold}${C.cyan}── ${name} ──${C.reset}`);
    }

    /**
     * Run a test with hard assertions (first failure stops the test).
     * Captures screenshots + game state on failure.
     */
    async runTest(testName, testFn) {
        const fullName = this.currentSection ? `${this.currentSection} > ${testName}` : testName;
        console.log(`\n${C.cyan}${testName}${C.reset}`);
        const startTime = Date.now();
        this.results.total++;

        const testRecord = {
            name: fullName,
            section: this.currentSection,
            status: 'pending',
            durationMs: 0,
            assertions: [],
            error: null,
            screenshotPath: null,
            stateSnapshot: null,
        };

        // Hard assert: throws on failure
        const assert = (condition, label) => {
            if (condition) {
                console.log(`  ${C.green}✅${C.reset} ${label}`);
                testRecord.assertions.push({ status: 'pass', label });
            } else {
                console.log(`  ${C.red}❌${C.reset} ${label}`);
                testRecord.assertions.push({ status: 'fail', label });
                throw new Error(`Assertion Failed: ${label}`);
            }
        };

        // Soft assert: logs warning but doesn't stop test
        assert.soft = (condition, label) => {
            if (condition) {
                console.log(`  ${C.green}✅${C.reset} ${label}`);
                testRecord.assertions.push({ status: 'pass', label });
            } else {
                console.log(`  ${C.yellow}⚠️${C.reset}  ${label}`);
                testRecord.assertions.push({ status: 'warn', label });
                this.results.warned++;
            }
        };

        // Info log (no pass/fail)
        assert.info = (label) => {
            console.log(`  ${C.dim}ℹ${C.reset}  ${label}`);
            testRecord.assertions.push({ status: 'info', label });
        };

        try {
            await testFn(assert);
            const hasWarns = testRecord.assertions.some(a => a.status === 'warn');
            testRecord.status = hasWarns ? 'warn' : 'pass';
            this.results.passed++;
        } catch (error) {
            testRecord.status = 'fail';
            testRecord.error = error.message || error.toString();
            this.results.failed++;
            console.log(`  ${C.red}💥 Test Failed: ${testRecord.error}${C.reset}`);

            // Screenshot on failure
            await this._captureFailureState(testName, testRecord);
        } finally {
            testRecord.durationMs = Date.now() - startTime;
            this.results.tests.push(testRecord);
        }
    }

    async _captureFailureState(testName, testRecord) {
        const safeName = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `fail_${safeName}.png`;
        const screenshotPath = path.join(this.screenshotsDir, filename);

        try {
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`  📸 Screenshot: ${filename}`);
            testRecord.screenshotPath = filename;
        } catch (e) {
            console.log(`  ${C.dim}📸 Screenshot failed: ${e.message}${C.reset}`);
        }

        try {
            const snapshot = await this.page.evaluate(() => {
                const out = {};
                if (window.game?.debug) out.debug = window.game.debug();
                if (window.game?.state) out.gameState = window.game.state();
                if (window.game?.scene) out.scenes = window.game.scene();
                if (window.game?.uiState) out.ui = window.game.uiState();
                if (window.game?.haggleState) out.haggle = window.game.haggleState();
                if (window.game?.dialogueState) out.dialogue = window.game.dialogueState();
                return out;
            });
            testRecord.stateSnapshot = snapshot;
        } catch (e) { /* page may have navigated */ }
    }

    /**
     * Generate both JSON and Markdown reports. Returns true if all tests passed.
     */
    generateReport() {
        const totalTime = Date.now() - this.startTime;
        const ts = new Date().toISOString();

        // ── JSON Report ──
        const jsonOutput = {
            timestamp: ts,
            durationMs: totalTime,
            summary: {
                total: this.results.total,
                passed: this.results.passed,
                failed: this.results.failed,
                warned: this.results.warned,
                successRate: this.results.total > 0
                    ? (this.results.passed / this.results.total * 100).toFixed(1) + '%' : '0%',
            },
            tests: this.results.tests,
            browserErrors: this.results.browserErrors,
            pageErrors: this.results.pageErrors,
            networkErrors: this.results.networkErrors,
        };

        const jsonPath = path.join(this.reportDir, 'test_report.json');
        fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));

        // ── Markdown Report ──
        const allPass = this.results.failed === 0;
        const statusBadge = allPass ? '✅ ALL PASS' : `❌ ${this.results.failed} FAILED`;
        const warnNote = this.results.warned > 0 ? ` (${this.results.warned} warnings)` : '';

        const md = [
            '# ArtLife — Test Report',
            '',
            `**Date:** ${ts}`,
            `**Duration:** ${(totalTime / 1000).toFixed(1)}s`,
            `**Result:** ${statusBadge}${warnNote}  (${this.results.passed}/${this.results.total})`,
            '',
            '## Test Results',
            '',
            '| # | Section | Test | Status | Time | Notes |',
            '|---|---------|------|--------|------|-------|',
        ];

        this.results.tests.forEach((t, i) => {
            const icon = t.status === 'pass' ? '✅' : t.status === 'warn' ? '⚠️' : '❌';
            const time = `${t.durationMs}ms`;
            const notes = t.error ? t.error.slice(0, 80) : '';
            const warns = t.assertions.filter(a => a.status === 'warn').map(a => a.label).join('; ');
            md.push(`| ${i + 1} | ${t.section || ''} | ${t.name.split(' > ').pop()} | ${icon} | ${time} | ${notes || warns || ''} |`);
        });

        // Failures detail
        const failures = this.results.tests.filter(t => t.status === 'fail');
        if (failures.length > 0) {
            md.push('', '## Failure Details', '');
            failures.forEach(f => {
                md.push(`### ${f.name}`);
                md.push(`- **Error:** ${f.error}`);
                if (f.screenshotPath) md.push(`- **Screenshot:** \`${f.screenshotPath}\``);
                if (f.stateSnapshot) {
                    md.push('- **State Snapshot:**');
                    md.push('```json', JSON.stringify(f.stateSnapshot, null, 2).slice(0, 1000), '```');
                }
                md.push('');
            });
        }

        // Browser errors
        const errors = this.results.browserErrors.filter(e =>
            !e.text.includes('Failed to process file') && !e.text.includes('404')
        );
        md.push('', '## Browser Errors', '');
        if (errors.length > 0) {
            errors.slice(0, 10).forEach(e => md.push(`- ${e.text.slice(0, 150)}`));
        } else {
            md.push('_None_');
        }

        // Page errors
        md.push('', '## Page Errors (Uncaught Exceptions)', '');
        if (this.results.pageErrors.length > 0) {
            this.results.pageErrors.forEach(e => md.push(`- \`${e.message.slice(0, 150)}\``));
        } else {
            md.push('_None_');
        }

        // Network
        md.push('', '## Network Failures', '');
        if (this.results.networkErrors.length > 0) {
            this.results.networkErrors.forEach(e => md.push(`- \`${e.url}\` — ${e.failure}`));
        } else {
            md.push('_None_');
        }

        const mdPath = path.join(this.reportDir, 'test_report.md');
        fs.writeFileSync(mdPath, md.join('\n'));

        // Console summary
        console.log(`\n${C.bold}═══════════════════════════════════════${C.reset}`);
        console.log(`  ${C.bold}Test Run Complete${C.reset}  (${(totalTime / 1000).toFixed(1)}s)`);
        console.log(`  Passed: ${C.green}${this.results.passed}${C.reset} | Failed: ${this.results.failed > 0 ? C.red : C.green}${this.results.failed}${C.reset} | Warnings: ${C.yellow}${this.results.warned}${C.reset} | Total: ${this.results.total}`);
        if (errors.length > 0) console.log(`  Browser errors: ${C.red}${errors.length}${C.reset}`);
        if (this.results.pageErrors.length > 0) console.log(`  Page errors: ${C.red}${this.results.pageErrors.length}${C.reset}`);
        console.log(`  📄 Reports: ${C.dim}${mdPath}${C.reset}`);
        console.log(`              ${C.dim}${jsonPath}${C.reset}`);
        console.log(`${C.bold}═══════════════════════════════════════${C.reset}\n`);

        return this.results.failed === 0;
    }
}

module.exports = { TestReporter };
