/**
 * ag-manager/pm2.config.js
 *
 * PM2 ecosystem config — keeps AG Manager running at all times on macOS.
 *
 * Setup (one-time):
 *   cd ag-manager && npm install
 *   npm install -g pm2
 *   pm2 start pm2.config.js
 *   pm2 save
 *   pm2 startup launchd   ← then run the printed command with sudo
 *
 * Commands:
 *   pm2 status            — check if running
 *   pm2 logs ag-manager   — tail logs
 *   pm2 restart ag-manager
 *   pm2 stop ag-manager
 */

export default {
  apps: [
    {
      name: 'ag-manager',
      script: './server.js',
      cwd: __dirname,

      // Restart if it crashes, but don't restart if it exits cleanly (e.g. SIGTERM)
      autorestart: true,
      watch: false,

      // Environment — PM2 will load .env via dotenv in server.js
      env: {
        NODE_ENV: 'production',
      },

      // Log paths
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Rotate logs to prevent disk fill
      max_size: '10M',
      retain: 5,
    },
  ],
};
