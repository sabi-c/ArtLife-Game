/**
 * ag-manager/cdp-logger.js
 *
 * Connects to Google Antigravity's Chrome DevTools Protocol (CDP) debug port and
 * extracts chat messages as structured text — NOT as raw HTML DOM clones.
 *
 * How this differs from phone_chat / Antigravity-Shit-Chat:
 *   Those tools do: clone entire #conversation DOM → send 100KB HTML blob → phone replaces innerHTML
 *   This does:      extract message text via Runtime.evaluate → diff against previous → emit only NEW messages
 *
 * Result:
 *   - Phone receives < 1KB per update (just new message text, not the whole DOM)
 *   - No scroll sync needed — phone has the full message log independently
 *   - No DOM teardown/rebuild → no scroll jumps
 *   - Conversation persisted to JSONL files for full history across restarts
 *
 * Emitted events (via the callbacks passed to CdpLogger):
 *   onMessage(msg)        — new message object: { id, role, text, timestamp, conversationId }
 *   onStage(name, detail) — startup/status updates
 *   onError(msg)          — error strings
 *   onConversationSwitch(id) — when Antigravity switches to a different chat
 */

import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── CDP Message Extraction Scripts ───────────────────────────────────────────
// These are injected into Antigravity via Runtime.evaluate.
// Uses multi-strategy selectors — resilient to Antigravity version changes.

/**
 * Injected into Antigravity to extract chat messages as structured text.
 * Returns { messages: [{text, isUser, fingerprint}], containerFound, totalText }
 */
const EXTRACT_MESSAGES_SCRIPT = `(() => {
  // Strategy 1: known stable container IDs
  const container =
    document.getElementById('conversation') ||
    document.getElementById('chat') ||
    document.getElementById('cascade');

  if (!container) return { containerFound: false, messages: [], totalText: '' };

  // Strategy chain: try increasingly broad selectors
  const SELECTORS = [
    '[data-message]',
    '[class*="message"][class*="user"], [class*="message"][class*="assistant"]',
    '[class*="message-row"]',
    '[class*="message"]',
    '.prose',
    '[class*="chat-turn"]',
  ];

  let els = [];
  let usedSelector = '';
  for (const sel of SELECTORS) {
    try {
      const found = [...container.querySelectorAll(sel)]
        .filter(el => el.innerText && el.innerText.trim().length > 5);
      if (found.length > 0) { els = found; usedSelector = sel; break; }
    } catch (e) {}
  }

  // Deduplicate: skip elements that are children of other found elements
  const deduped = els.filter(el =>
    !els.some(other => other !== el && other.contains(el))
  );

  const messages = deduped.map(el => {
    const cls = el.className ? el.className.toString().toLowerCase() : '';
    const dataRole = el.getAttribute('data-role') || '';
    const parentRole = el.closest('[data-role]')?.getAttribute('data-role') || '';

    const isUser =
      cls.includes('user') ||
      dataRole === 'user' ||
      parentRole === 'user' ||
      !!el.querySelector('[data-role="user"]') ||
      !!el.closest('[class*="user-message"]');

    const text = el.innerText.trim();
    // Fingerprint = hash of text content (for dedup across polls)
    const fingerprint = text.split('').reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0).toString(36);

    return { text, isUser, fingerprint };
  });

  return {
    containerFound: true,
    usedSelector,
    messages,
    totalText: messages.map(m => m.text).join('\\n---\\n'),
  };
})()`;

/**
 * Get the current conversation title from Antigravity's tab/header.
 */
const GET_CONVERSATION_TITLE_SCRIPT = `(() => {
  const candidates = [
    document.querySelector('[class*="conversation-title"]'),
    document.querySelector('[class*="chat-title"]'),
    document.querySelector('[aria-label*="conversation"]'),
    document.querySelector('title'),
  ].filter(Boolean);
  return { title: candidates[0]?.innerText?.trim() || document.title || 'Untitled' };
})()`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha1(str) {
  return createHash('sha1').update(str).digest('hex').slice(0, 12);
}

function nowIso() {
  return new Date().toISOString();
}

// ─── Storage ──────────────────────────────────────────────────────────────────
// Messages are saved as JSONL (one JSON object per line) in:
//   ~/.ag-manager/conversations/<date>-<conversationId>.jsonl

function getLogDir() {
  const dir = path.join(process.env.HOME || '~', '.ag-manager', 'conversations');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getLogPath(conversationId) {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(getLogDir(), `${date}-${conversationId}.jsonl`);
}

function appendToLog(conversationId, message) {
  try {
    const line = JSON.stringify(message) + '\n';
    fs.appendFileSync(getLogPath(conversationId), line, 'utf8');
  } catch (e) {
    // Non-fatal — log is best-effort
    console.error('[CDP-LOGGER] Failed to write log:', e.message);
  }
}

function loadLogFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

export function listSavedConversations() {
  const dir = getLogDir();
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.jsonl'))
      .sort()
      .reverse()
      .map(f => {
        const filePath = path.join(dir, f);
        const messages = loadLogFile(filePath);
        return {
          file: f,
          conversationId: f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.jsonl', ''),
          date: f.slice(0, 10),
          messageCount: messages.length,
          preview: messages[messages.length - 1]?.text?.slice(0, 80) || '',
          path: filePath,
        };
      });
  } catch {
    return [];
  }
}

export function loadConversation(conversationId) {
  const dir = getLogDir();
  // Find any file matching this conversationId (regardless of date prefix)
  const files = fs.readdirSync(dir).filter(f => f.includes(conversationId));
  if (!files.length) return [];
  // Load all matching files and merge (handles multi-day conversations)
  const allMessages = files.flatMap(f => loadLogFile(path.join(dir, f)));
  // Deduplicate by message id
  const seen = new Set();
  return allMessages.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

// ─── CdpLogger ────────────────────────────────────────────────────────────────

export class CdpLogger {
  constructor({ cdpPort, onMessage, onStage, onError, onConversationSwitch }) {
    this.cdpPort = cdpPort;
    this.onMessage = onMessage || (() => {});
    this.onStage = onStage || (() => {});
    this.onError = onError || (() => {});
    this.onConversationSwitch = onConversationSwitch || (() => {});

    this.ws = null;
    this.idCounter = 1;
    this.pending = new Map(); // id → { resolve, reject }
    this.contextId = null;

    this.running = false;
    this.pollTimer = null;

    // Conversation state
    this.conversationId = null;
    this.seenFingerprints = new Set(); // prevents re-emitting the same message
    this.lastTotalText = '';
    this.messageCount = 0;
  }

  // ── CDP Wire Protocol ──────────────────────────────────────────────────────

  async _call(method, params = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('CDP WebSocket not open');
    }
    const id = this.idCounter++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP call timed out: ${method}`));
      }, 8000);

      this.pending.set(id, {
        resolve: (result) => { clearTimeout(timeout); resolve(result); },
        reject:  (err)    => { clearTimeout(timeout); reject(err); },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async _evaluate(expression) {
    // Run in whatever context we've identified as the main chat frame
    const params = {
      expression,
      returnByValue: true,
      awaitPromise: false,
    };
    if (this.contextId !== null) params.contextId = this.contextId;

    const result = await this._call('Runtime.evaluate', params);
    if (result.exceptionDetails) {
      throw new Error(`JS exception: ${result.exceptionDetails.text}`);
    }
    return result.result?.value;
  }

  // ── Connection ────────────────────────────────────────────────────────────

  async connect() {
    this.onStage('Connecting CDP logger', `port ${this.cdpPort}`);

    // Discover Antigravity's WebSocket debugger URL
    const targetUrl = await this._discoverTarget();
    if (!targetUrl) {
      throw new Error(`No Antigravity workbench target found on CDP port ${this.cdpPort}`);
    }

    this.onStage('CDP logger attaching to Antigravity');

    await new Promise((resolve, reject) => {
      this.ws = new WebSocket(targetUrl);

      this.ws.on('open', () => resolve());
      this.ws.on('error', (err) => reject(err));
      this.ws.on('close', () => {
        if (this.running) {
          this.onError('CDP connection closed — will retry');
          setTimeout(() => this._reconnect(), 5000);
        }
      });

      this.ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }

        // Route CDP responses to pending promises
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
          return;
        }

        // Track execution contexts to find the right frame for our JS injection
        if (msg.method === 'Runtime.executionContextCreated') {
          const ctx = msg.params?.context;
          // Prefer context whose origin matches the workbench — heuristic: name contains 'workbench' or 'cascade'
          if (ctx && (ctx.name?.includes('workbench') || ctx.origin?.includes('workbench'))) {
            this.contextId = ctx.id;
          }
        }
        if (msg.method === 'Runtime.executionContextsCleared') {
          this.contextId = null; // page navigated; re-detect on next poll
        }
      });
    });

    // Enable Runtime domain so we get context events
    await this._call('Runtime.enable');

    this.onStage('CDP logger connected');
    this.running = true;
    this._startPolling();
  }

  async _discoverTarget() {
    const PORTS = [this.cdpPort]; // can extend to [9000, 9001, 9002] if needed
    for (const port of PORTS) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) continue;
        const targets = await res.json();
        // Find the Antigravity workbench target
        const target = targets.find(t =>
          t.url?.includes('workbench.html') ||
          t.title?.toLowerCase().includes('antigravity') ||
          t.title?.toLowerCase().includes('workbench') ||
          t.type === 'page'
        );
        if (target?.webSocketDebuggerUrl) return target.webSocketDebuggerUrl;
      } catch {}
    }
    return null;
  }

  async _reconnect() {
    if (!this.running) return;
    this.ws = null;
    this.contextId = null;
    try {
      await this.connect();
    } catch (err) {
      this.onError(`CDP reconnect failed: ${err.message} — retrying in 10s`);
      setTimeout(() => this._reconnect(), 10000);
    }
  }

  disconnect() {
    this.running = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.ws) { this.ws.close(); this.ws = null; }
  }

  // ── Polling ───────────────────────────────────────────────────────────────

  _startPolling() {
    const poll = async () => {
      if (!this.running) return;
      try {
        await this._extractAndDiff();
      } catch (err) {
        // Don't surface eval errors constantly — only if they persist
        if (err.message.includes('not open') || err.message.includes('timed out')) {
          this.onError(`CDP poll error: ${err.message}`);
        }
      }
      this.pollTimer = setTimeout(poll, 1500); // 1.5s — slightly longer than phone_chat's 1s to be gentler
    };
    poll();
  }

  // ── Message Extraction & Diffing ─────────────────────────────────────────

  async _extractAndDiff() {
    const result = await this._evaluate(EXTRACT_MESSAGES_SCRIPT);
    if (!result || !result.containerFound) return;

    const { messages, totalText } = result;
    if (!messages || messages.length === 0) return;

    // Detect conversation switch: if totalText changed drastically AND message count dropped
    if (
      this.lastTotalText &&
      messages.length < this.messageCount * 0.5 &&
      totalText !== this.lastTotalText
    ) {
      // Conversation switched
      const titleResult = await this._evaluate(GET_CONVERSATION_TITLE_SCRIPT).catch(() => null);
      const newId = sha1(totalText.slice(0, 200));
      this.conversationId = newId;
      this.seenFingerprints.clear();
      this.messageCount = 0;
      this.onConversationSwitch(newId);
      this.onStage('Conversation switched', titleResult?.title || newId);
    }

    // Initialize conversation ID on first messages
    if (!this.conversationId && messages.length > 0) {
      this.conversationId = sha1(messages[0].text + nowIso().slice(0, 13)); // stable within same hour
    }

    // Diff: find messages we haven't seen yet
    const newMessages = [];
    for (const m of messages) {
      if (this.seenFingerprints.has(m.fingerprint)) continue;
      this.seenFingerprints.add(m.fingerprint);

      const msg = {
        id: sha1(m.text + m.fingerprint),
        role: m.isUser ? 'user' : 'assistant',
        text: m.text,
        timestamp: nowIso(),
        conversationId: this.conversationId,
      };

      newMessages.push(msg);
      appendToLog(this.conversationId, msg);
      this.onMessage(msg);
    }

    this.lastTotalText = totalText;
    this.messageCount = messages.length;
  }
}
