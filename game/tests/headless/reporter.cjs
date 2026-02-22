/**
 * TestReporter.cjs
 * Comprehensive test reporter and error handler for Playwright.
 * Captures screenshots, console logs, network errors, and outputs structured JSON reports.
 */
const fs = require('fs');
const path = require('path');

class TestReporter {
    constructor(page, reportDir = 'reports') {
        this.page = page;
        this.reportDir = path.resolve(__dirname, '../../', reportDir);
        this.screenshotsDir = path.join(this.reportDir, 'screenshots');
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            tests: [],
            browserLogs: [],
            networkErrors: []
        };

        // Ensure directories exist
        if (!fs.existsSync(this.reportDir)) fs.mkdirSync(this.reportDir, { recursive: true });
        if (!fs.existsSync(this.screenshotsDir)) fs.mkdirSync(this.screenshotsDir, { recursive: true });

        // Set up listeners
        this.page.on('console', msg => {
            const text = msg.text();
            this.results.browserLogs.push({ type: msg.type(), text });
            if (msg.type() === 'error') {
                console.log(`\x1b[31m[BROWSER ERROR]\x1b[0m ${text}`);
            } else if (msg.type() === 'warning') {
                // Ignore verbose warnings unless debugging
            } else {
                console.log(`\x1b[90m[BROWSER LOG]\x1b[0m ${text}`);
            }
        });

        this.page.on('pageerror', err => {
            console.log(`\x1b[31m[PAGE ERROR]\x1b[0m ${err.message}`);
            this.results.browserLogs.push({ type: 'pageerror', text: err.message, stack: err.stack });
        });

        this.page.on('requestfailed', request => {
            const url = request.url();
            const failure = request.failure()?.errorText || 'Unknown failure';
            console.log(`\x1b[31m[NETWORK FAILURE]\x1b[0m ${url}: ${failure}`);
            this.results.networkErrors.push({ url, failure });
        });
    }

    async runTest(testName, testFn) {
        console.log(`\n\x1b[36m${testName}\x1b[0m`);
        const startTime = Date.now();
        this.results.total++;

        const testRecord = {
            name: testName,
            status: 'pending',
            durationMs: 0,
            assertions: [],
            error: null,
            screenshotPath: null
        };

        const localAssert = (condition, label) => {
            if (condition) {
                console.log(`  ✅ ${label}`);
                testRecord.assertions.push({ status: 'pass', label });
            } else {
                console.log(`  ❌ ${label}`);
                testRecord.assertions.push({ status: 'fail', label });
                throw new Error(`Assertion Failed: ${label}`);
            }
        };

        try {
            await testFn(localAssert);
            testRecord.status = 'pass';
            this.results.passed++;
        } catch (error) {
            testRecord.status = 'fail';
            testRecord.error = error.message || error.toString();
            this.results.failed++;
            console.log(`  💥 \x1b[31mTest Failed: ${testRecord.error}\x1b[0m`);

            // Capture Screenshot
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const safeName = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `fail_${safeName}_${timestamp}.png`;
            const screenshotPath = path.join(this.screenshotsDir, filename);

            try {
                await this.page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`  📸 Screenshot saved: ${filename}`);
                testRecord.screenshotPath = screenshotPath;
            } catch (snapErr) {
                console.log(`  📸 Screenshot failed: ${snapErr.message}`);
            }

            // Attempt to capture React/Phaser state logic if window.game API is available
            try {
                const debugState = await this.page.evaluate(() => {
                    if (window.game && window.game.debug) {
                        return window.game.debug();
                    }
                    return null;
                });
                if (debugState) {
                    testRecord.stateSnapshot = debugState;
                }
            } catch (stateErr) {
                // Not all pages will have the game API
            }
        } finally {
            testRecord.durationMs = Date.now() - startTime;
            this.results.tests.push(testRecord);
        }
    }

    generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(this.reportDir, `test_run_${timestamp}.json`);

        const output = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.total,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: this.results.total > 0 ? (this.results.passed / this.results.total * 100).toFixed(1) + '%' : '0%'
            },
            tests: this.results.tests,
            browserLogs: this.results.browserLogs.filter(log => log.type === 'error' || log.type === 'pageerror'),
            networkErrors: this.results.networkErrors
        };

        fs.writeFileSync(reportPath, JSON.stringify(output, null, 2));

        console.log('\n═══════════════════════════════════════');
        console.log(`  Test Run Complete.`);
        console.log(`  Passed: \x1b[32m${this.results.passed}\x1b[0m | Failed: ${this.results.failed > 0 ? '\x1b[31m' : '\x1b[32m'}${this.results.failed}\x1b[0m | Total: ${this.results.total}`);
        console.log(`  Detailed report saved to: \n  ${reportPath}`);
        console.log('═══════════════════════════════════════\n');

        return this.results.failed === 0;
    }
}

module.exports = { TestReporter };
