/**
 * ag-manager/server.js
 *
 * Always-on Express server that manages the Google Antigravity IDE lifecycle on macOS.
 * Exposes a REST API + Server-Sent Events stream for real-time startup progress.
 *
 * Endpoints:
 *   GET  /api/status   — current state snapshot
 *   GET  /api/events   — SSE stream of startup progress events (real-time)
 *   POST /api/start    — start Antigravity + phone_chat
 *   POST /api/stop     — gracefully stop both
 *   POST /api/restart  — stop + start
 *   POST /sms          — Twilio SMS webhook
 *   GET  /             — mobile web UI
 *
 * Security:
 *   - All /api/* routes require x-api-key header or ?key= query param
 *   - /sms validates sender phone number against ALLOWED_PHONE allowlist
 *   - Rate limiting: 20 req/min per IP on /api/start and /api/restart
 *   - Request body capped at 10KB
 */

import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT          = parseInt(process.env.AG_MANAGER_PORT || '3737', 10);
const API_KEY       = process.env.AG_MANAGER_KEY || '';
const AG_PATH       = process.env.AG_PATH || 'antigravity';
const AG_WORKSPACE  = process.env.AG_WORKSPACE || (process.env.HOME + '/ArtLife-Game');
const AG_CDP_PORT   = parseInt(process.env.AG_CDP_PORT || '9000', 10);
const PHONE_CHAT_DIR = process.env.PHONE_CHAT_DIR || '';
const ALLOWED_PHONE  = process.env.ALLOWED_PHONE || '';

// Startup timeout: how many seconds to wait for CDP before declaring failure
const CDP_TIMEOUT_SECS = 45;

// ─── Process Handles ──────────────────────────────────────────────────────────

let agProcess = null;
let phoneChatProcess = null;

// Live state polled by /api/status
const state = {
  antigravity: 'stopped',   // stopped | starting | running | error
  phoneChat:   'stopped',   // stopped | starting | running | error
  stage:       null,        // current named startup stage (for progress display)
  startedAt:   null,
  ngrokUrl:    null,
  cdpReady:    false,
  lastError:   null,
  workspace:   AG_WORKSPACE,
  cdpPort:     AG_CDP_PORT,
};

// ─── Server-Sent Events ───────────────────────────────────────────────────────
// Clients subscribe to GET /api/events and receive real-time startup progress.
// Each event: { type, message, detail, timestamp }

const sseClients = new Set();

/**
 * Broadcast a structured event to all connected SSE clients.
 * @param {'info'|'success'|'warn'|'error'|'stage'} type
 * @param {string} message  — short human-readable description
 * @param {string} [detail] — optional extra context
 */
function emit(type, message, detail = '') {
  const event = JSON.stringify({ type, message, detail, timestamp: new Date().toISOString() });
  for (const res of sseClients) {
    try { res.write(`data: ${event}\n\n`); } catch { sseClients.delete(res); }
  }
  // Also log to console with type prefix
  const prefix = { info: '[INFO]', success: '[OK]', warn: '[WARN]', error: '[ERR]', stage: '[STAGE]' }[type] || '[LOG]';
  console.log(prefix, message, detail ? `— ${detail}` : '');
}

/** Update named stage and emit a stage event */
function setStage(name, detail = '') {
  state.stage = name;
  emit('stage', name, detail);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Verify Antigravity's CDP port is accepting connections */
async function checkCdpReady() {
  try {
    const res = await fetch(
      `http://127.0.0.1:${AG_CDP_PORT}/json/list`,
      { signal: AbortSignal.timeout(2000) }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Extract ngrok public URL from a log line */
function extractNgrokUrl(line) {
  const match = line.match(/https?:\/\/[a-z0-9-]+\.ngrok[-\w]*\.(?:io|app|dev)[^\s]*/i);
  return match ? match[0] : null;
}

/** Simple rate limiter — returns true if the request should be blocked */
const rateLimitMap = new Map(); // ip -> { count, resetAt }
function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count > 20; // 20 requests per minute per IP
}
// Cleanup rate limit map every 5 minutes to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) { if (now > entry.resetAt) rateLimitMap.delete(ip); }
}, 5 * 60_000);

// ─── Process Management ───────────────────────────────────────────────────────

/**
 * Start Antigravity IDE on macOS with the CDP remote debugging port.
 * Emits SSE progress events at each stage so the client can show live status.
 */
function startAntigravity() {
  if (agProcess) {
    const msg = 'Antigravity is already running';
    emit('warn', msg);
    return { ok: false, message: msg };
  }

  // ── Stage 1: Launch ──
  setStage('Launching Antigravity', `${AG_PATH} ${AG_WORKSPACE}`);
  state.antigravity = 'starting';
  state.lastError = null;
  state.cdpReady = false;

  let spawned = false;

  try {
    agProcess = spawn(AG_PATH, [AG_WORKSPACE, `--remote-debugging-port=${AG_CDP_PORT}`], {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });
  } catch (err) {
    // spawn() itself can throw synchronously if the binary is not found
    state.antigravity = 'error';
    state.lastError = `Failed to launch: ${err.message}`;
    setStage('Failed to launch');
    emit('error', 'Launch failed', err.message);
    agProcess = null;
    return { ok: false, message: state.lastError };
  }

  agProcess.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (line) emit('info', line);
  });

  agProcess.stderr.on('data', (data) => {
    const line = data.toString().trim();
    if (!line) return;
    // Antigravity (Chromium-based) writes many non-fatal lines to stderr
    // Only surface actual errors
    if (/\b(error|failed|cannot|unable|crash)\b/i.test(line)) {
      emit('warn', line);
      state.lastError = line.slice(0, 300);
    }
  });

  agProcess.on('spawn', () => {
    spawned = true;
    // ── Stage 2: Window opening ──
    setStage('Window opening', 'Antigravity process started');
    emit('success', 'Process launched — waiting for window to appear');

    let attempts = 0;
    const cdpPoll = setInterval(async () => {
      attempts++;

      if (attempts === 1) {
        // ── Stage 3: Connecting to web ──
        setStage('Connecting to web', `Waiting for CDP on port ${AG_CDP_PORT}`);
      }

      const ready = await checkCdpReady();

      if (ready) {
        clearInterval(cdpPoll);
        state.cdpReady = true;
        state.antigravity = 'running';
        state.startedAt = new Date().toISOString();

        // ── Stage 4: Loading conversations ──
        setStage('Loading previous conversations', 'Fetching Antigravity chat history');

        // Give Antigravity a moment to load workspace + conversation history
        setTimeout(() => {
          setStage('Ready', 'Antigravity is up and accepting connections');
          emit('success', 'Antigravity is ready', `CDP active on port ${AG_CDP_PORT}`);
          state.stage = null;

          // ── Stage 5: phone_chat ──
          if (PHONE_CHAT_DIR) {
            setTimeout(startPhoneChat, 500);
          }
        }, 3000);

      } else if (attempts >= CDP_TIMEOUT_SECS) {
        clearInterval(cdpPoll);
        const msg = `CDP not responding after ${CDP_TIMEOUT_SECS}s — Antigravity may have failed to open`;
        emit('error', 'Startup timeout', msg);
        state.antigravity = 'error';
        state.lastError = msg;
        setStage('Startup failed');
      }
    }, 1000);
  });

  agProcess.on('error', (err) => {
    const msg = err.code === 'ENOENT'
      ? `Antigravity binary not found at "${AG_PATH}". Set AG_PATH in .env.`
      : `Spawn error: ${err.message}`;
    emit('error', 'Process error', msg);
    state.antigravity = 'error';
    state.lastError = msg;
    state.stage = null;
    agProcess = null;
  });

  agProcess.on('exit', (code, signal) => {
    const clean = code === 0 || signal === 'SIGTERM' || signal === 'SIGINT';
    if (clean) {
      emit('info', 'Antigravity stopped cleanly');
    } else {
      const msg = `Antigravity exited unexpectedly (code=${code}, signal=${signal})`;
      emit('error', msg);
      state.lastError = msg;
    }
    agProcess = null;
    state.antigravity = clean ? 'stopped' : 'error';
    state.startedAt = null;
    state.cdpReady = false;
    state.stage = null;
  });

  return { ok: true, message: 'Antigravity launching — watch the progress feed' };
}

/**
 * Start the antigravity_phone_chat server.
 * This gives you a mobile web UI to interact with the running Antigravity session.
 */
function startPhoneChat() {
  if (!PHONE_CHAT_DIR) {
    emit('warn', 'PHONE_CHAT_DIR not set — phone_chat skipped');
    return;
  }
  if (!fs.existsSync(PHONE_CHAT_DIR)) {
    emit('error', 'PHONE_CHAT_DIR not found', PHONE_CHAT_DIR);
    return;
  }
  if (phoneChatProcess) {
    emit('warn', 'phone_chat already running');
    return;
  }

  const scriptPath = path.join(PHONE_CHAT_DIR, 'start_ag_phone_connect.sh');
  if (!fs.existsSync(scriptPath)) {
    emit('error', 'phone_chat launcher not found', scriptPath);
    return;
  }

  setStage('Starting phone chat server', 'Launching antigravity_phone_chat');
  state.phoneChat = 'starting';

  phoneChatProcess = spawn('bash', [scriptPath], {
    cwd: PHONE_CHAT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  phoneChatProcess.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (!line) return;
    emit('info', `[phone_chat] ${line}`);

    // Extract ngrok URL and surface it
    const url = extractNgrokUrl(line);
    if (url) {
      state.ngrokUrl = url;
      state.phoneChat = 'running';
      setStage('Phone chat ready', url);
      emit('success', 'Phone chat is live', `Open on your phone: ${url}`);
      state.stage = null;
    }

    if (state.phoneChat === 'starting' && /listen|ready|started/i.test(line)) {
      state.phoneChat = 'running';
    }
  });

  phoneChatProcess.stderr.on('data', (data) => {
    const line = data.toString().trim();
    if (line && !/^\s*$/.test(line)) {
      emit('warn', `[phone_chat] ${line}`);
    }
  });

  phoneChatProcess.on('error', (err) => {
    const msg = `phone_chat spawn error: ${err.message}`;
    emit('error', msg);
    state.phoneChat = 'error';
    state.lastError = msg;
    phoneChatProcess = null;
  });

  phoneChatProcess.on('exit', (code) => {
    const clean = code === 0 || code === null;
    emit(clean ? 'info' : 'warn', `phone_chat stopped (code=${code})`);
    phoneChatProcess = null;
    state.phoneChat = 'stopped';
    state.ngrokUrl = null;
  });

  // Fallback: mark running if still starting after 5 seconds
  setTimeout(() => {
    if (state.phoneChat === 'starting') {
      state.phoneChat = 'running';
      emit('info', 'phone_chat assumed running (no explicit ready signal yet)');
    }
  }, 5000);
}

/** Gracefully stop Antigravity and phone_chat */
function stopAll() {
  const wasRunning = !!(agProcess || phoneChatProcess);

  if (phoneChatProcess) {
    emit('info', 'Stopping phone_chat...');
    phoneChatProcess.kill('SIGTERM');
    phoneChatProcess = null;
    state.phoneChat = 'stopped';
    state.ngrokUrl = null;
  }

  if (agProcess) {
    emit('info', 'Stopping Antigravity...');
    agProcess.kill('SIGTERM');
    agProcess = null;
    state.antigravity = 'stopped';
    state.startedAt = null;
    state.cdpReady = false;
  }

  state.stage = null;
  state.lastError = null;

  const message = wasRunning ? 'Stopped' : 'Nothing was running';
  emit('success', message);
  return { ok: true, message };
}

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();

// Limit request body size to prevent abuse
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Serve web UI
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware ────────────────────────────────────────────────────────────

function requireKey(req, res, next) {
  if (!API_KEY) return next(); // open in dev mode (no key set)
  const provided = req.headers['x-api-key'] || req.query.key;
  if (!provided) {
    return res.status(401).json({ error: 'API key required — add x-api-key header or ?key= query param' });
  }
  if (provided !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  next();
}

// ── Rate limiting on mutating routes ──────────────────────────────────────────

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests — slow down' });
  }
  next();
}

// ─── API Routes ───────────────────────────────────────────────────────────────

app.get('/api/status', requireKey, (req, res) => {
  res.json({ ...state });
});

// Server-Sent Events — real-time startup progress stream
app.get('/api/events', requireKey, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if proxied
  res.flushHeaders();

  // Send a heartbeat comment every 15s to keep the connection alive
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { cleanup(); }
  }, 15_000);

  sseClients.add(res);
  emit('info', `Client connected (${sseClients.size} total)`);

  const cleanup = () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
});

app.post('/api/start', requireKey, rateLimit, (req, res) => {
  const result = startAntigravity();
  res.json(result);
});

app.post('/api/stop', requireKey, (req, res) => {
  const result = stopAll();
  res.json(result);
});

app.post('/api/restart', requireKey, rateLimit, (req, res) => {
  const stopResult = stopAll();
  setTimeout(() => startAntigravity(), 2000);
  res.json({ ok: true, message: 'Restarting Antigravity in 2 seconds...' });
});

// Health check — no auth, useful for uptime monitors
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), antigravity: state.antigravity });
});

// ─── Twilio SMS Webhook ───────────────────────────────────────────────────────
// Point Twilio number webhook to: POST https://YOUR_SERVER/sms
// Supported commands: start, stop, restart, status

app.post('/sms', (req, res) => {
  const body    = (req.body.Body || '').toLowerCase().trim();
  const rawFrom = (req.body.From || '');
  const from    = rawFrom.replace(/\D/g, ''); // strip non-digits for comparison

  // Validate sender if ALLOWED_PHONE is configured
  if (ALLOWED_PHONE) {
    const allowed = ALLOWED_PHONE.replace(/\D/g, '');
    if (!from.endsWith(allowed.slice(-10))) {
      emit('warn', 'SMS rejected from unauthorized number', rawFrom);
      return res.type('text/xml').send('<Response><Message>Unauthorized</Message></Response>');
    }
  }

  emit('info', `SMS received: "${body}" from ${rawFrom}`);

  let reply = 'Unknown command. Try: start, stop, restart, status';

  if (body === 'start' || body === 'start antigravity') {
    const r = startAntigravity();
    reply = r.message;
  } else if (body === 'stop' || body === 'stop antigravity') {
    const r = stopAll();
    reply = r.message;
  } else if (body === 'restart') {
    stopAll();
    setTimeout(() => startAntigravity(), 2000);
    reply = 'Restarting Antigravity...';
  } else if (body === 'status') {
    const uptime = state.startedAt
      ? Math.round((Date.now() - new Date(state.startedAt).getTime()) / 60000) + 'min'
      : 'n/a';
    reply = [
      `AG: ${state.antigravity}`,
      `PhoneChat: ${state.phoneChat}`,
      state.ngrokUrl ? `URL: ${state.ngrokUrl}` : null,
      state.startedAt ? `Up: ${uptime}` : null,
      state.lastError ? `Err: ${state.lastError.slice(0, 80)}` : null,
    ].filter(Boolean).join(' | ');
  }

  res.type('text/xml').send(`<Response><Message>${reply}</Message></Response>`);
});

// ─── Startup ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║        AG Manager is running         ║');
  console.log(`║  http://localhost:${PORT}               ║`);
  console.log('╚══════════════════════════════════════╝');
  if (!API_KEY)       console.warn('\n⚠️  AG_MANAGER_KEY not set — API is unprotected');
  if (!PHONE_CHAT_DIR) console.log('ℹ️  PHONE_CHAT_DIR not set — phone_chat auto-start disabled');
  console.log(`\nWorkspace : ${AG_WORKSPACE}`);
  console.log(`CDP port  : ${AG_CDP_PORT}`);
  console.log('');
});

// Graceful shutdown
function shutdown() {
  emit('info', 'AG Manager shutting down...');
  stopAll();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
process.on('uncaughtException', (err) => {
  emit('error', 'Uncaught exception — see server logs', err.message);
  console.error('[FATAL]', err);
  // Don't exit — keep the manager running so you can still receive status requests
});
process.on('unhandledRejection', (reason) => {
  emit('warn', 'Unhandled promise rejection', String(reason));
  console.error('[WARN] Unhandled rejection:', reason);
});
