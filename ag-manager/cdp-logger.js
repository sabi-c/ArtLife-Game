/**
 * ag-manager/cdp-logger.js
 *
 * Connects to Google Antigravity's Chrome DevTools Protocol (CDP) debug port and
 * extracts chat messages as structured text — NOT as raw HTML DOM clones.
 *
 * How this differs from phone_chat / Antigravity-Shit-Chat:
 *   Those tools do: clone entire #conversation DOM → send 100KB HTML blob → phone replaces innerHTML
 *   This does:      extract message text via Runtime.evaluate → diff against previous → emit only NEW/CHANGED
 *
 * Result:
 *   - Phone receives < 1KB per update (just new message text, not the whole DOM)
 *   - No scroll sync needed — phone has the full message log independently
 *   - No DOM teardown/rebuild → no scroll jumps
 *   - Streaming messages update in place (one bubble grows rather than duplicating)
 *   - Conversation persisted to JSONL files for full history across restarts
 *
 * Emitted events (via the callbacks passed to CdpLogger):
 *   onMessage(msg)           — new (complete or first-seen) message: { id, role, text, timestamp, conversationId }
 *   onMessageUpdate(msg)     — existing message text changed (streaming): same shape
 *   onMessageDone(msg)       — streaming finished, text is final: same shape
 *   onStage(name, detail)    — startup/status updates
 *   onError(msg)             — error strings
 *   onConversationSwitch(id) — when Antigravity switches to a different chat
 *
 * Streaming state machine:
 *   NEW (onMessage) → growing (onMessageUpdate × N) → stable × 2 polls (onMessageDone)
 *   The UI keeps one bubble per message ID and updates its text in place.
 */

import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// ─── CDP Message Extraction Scripts ───────────────────────────────────────────
// These are injected into Antigravity via Runtime.evaluate.
// Uses multi-strategy selectors — resilient to Antigravity version changes.

/**
 * Injected into Antigravity to extract chat messages as structured text.
 * Returns { messages: [{text, isUser, fingerprint}], containerFound, totalText }
 *
 * Text cleanup: clones each element and removes action buttons (copy, thumbs,
 * edit controls) before reading innerText — so we get message content only.
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

    // Clone and strip UI chrome (copy buttons, action toolbars, etc.) before reading text
    const clone = el.cloneNode(true);
    for (const btn of clone.querySelectorAll('button, [role="button"]')) btn.remove();
    const text = clone.innerText.trim();

    // Fingerprint = polynomial hash of text (fast change detection)
    const fingerprint = text.split('').reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0).toString(36);

    return { text, isUser, fingerprint };
  }).filter(m => m.text.length > 0); // drop empty elements post-cleanup

  return {
    containerFound: true,
    usedSelector,
    messages,
    totalText: messages.map(m => m.text).join('\\n---\\n'),
  };
})()`;

/**
 * Inject a chat message into Antigravity's input field and submit it.
 * Called as an IIFE: (SEND_MESSAGE_SCRIPT)(escapedText)
 *
 * Strategy:
 *   1. Find the chat textarea using a selector chain
 *   2. Set its value via React's native setter (triggers synthetic onChange)
 *   3. Submit via a submit button if found, otherwise via Enter key
 *
 * Returns { ok: boolean, method: 'click'|'enter', error?: string }
 */
const SEND_MESSAGE_SCRIPT = `(text) => {
  const SELECTORS = [
    'textarea[data-testid*="chat"]',
    'textarea[data-testid*="input"]',
    'textarea[placeholder*="message"]',
    'textarea[placeholder*="Message"]',
    '[class*="chat-input"] textarea',
    '[class*="input-area"] textarea',
    '[class*="chat"] textarea',
    'textarea',
  ];

  let input = null;
  for (const sel of SELECTORS) {
    try {
      const el = document.querySelector(sel);
      // Only target visible inputs
      if (el && el.offsetParent !== null) { input = el; break; }
    } catch {}
  }
  if (!input) return { ok: false, error: 'input not found' };

  // React's native setter fires React synthetic onChange on controlled inputs
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(input, text);
  input.dispatchEvent(new Event('input',  { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  // Look for a submit button near the input; skip stop/cancel/attach buttons
  const vicinity = input.closest('[class*="chat"]') || input.closest('form') || input.parentElement;
  const allBtns  = [...(vicinity ? vicinity.querySelectorAll('button') : []),
                    ...document.querySelectorAll('button[type="submit"]')];
  const btn = allBtns.find(b => !b.disabled && b.offsetParent !== null &&
    !/(stop|cancel|clear|attach|upload|file)/i.test(
      (b.title || '') + (b.getAttribute('aria-label') || '') + (b.className || '')
    ));

  if (btn) { btn.click(); return { ok: true, method: 'click' }; }

  // Fall back: dispatch Enter key events on the textarea
  input.focus();
  for (const type of ['keydown', 'keypress']) {
    input.dispatchEvent(new KeyboardEvent(type, {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true, cancelable: true,
    }));
  }
  return { ok: true, method: 'enter' };
}`;

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
//
// Streaming messages may be appended twice (partial then final). loadConversation
// keeps the LAST entry per ID so the final text always wins.

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
    // Strip internal tracking fields before persisting
    const { fingerprint, ...toSave } = message;
    fs.appendFileSync(getLogPath(conversationId), JSON.stringify(toSave) + '\n', 'utf8');
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
  // Keep the LAST entry per ID — streaming messages may be appended twice
  // (partial text on first emit, final text on done). Last write wins.
  const byId = new Map();
  for (const m of allMessages) byId.set(m.id, m);
  return [...byId.values()];
}

// ─── CdpLogger ────────────────────────────────────────────────────────────────

export class CdpLogger {
  constructor({ cdpPort, onMessage, onMessageUpdate, onMessageDone, onStage, onError, onConversationSwitch }) {
    this.cdpPort = cdpPort;
    this.onMessage           = onMessage           || (() => {});
    this.onMessageUpdate     = onMessageUpdate     || (() => {});
    this.onMessageDone       = onMessageDone       || (() => {});
    this.onStage             = onStage             || (() => {});
    this.onError             = onError             || (() => {});
    this.onConversationSwitch = onConversationSwitch || (() => {});

    this.ws = null;
    this.idCounter = 1;
    this.pending = new Map(); // id → { resolve, reject }
    this.contextId = null;

    this.running = false;
    this.pollTimer = null;

    // Conversation state
    this.conversationId = null;

    // Position-based message tracking.
    // Each entry: { id, role, text, fingerprint, timestamp, conversationId }
    // Index = DOM position of the message in the visible conversation.
    this.lastMessages = [];

    // Streaming state: track the last assistant message that may still be growing.
    this.streamingId    = null; // positionId of the currently-streaming assistant message
    this.streamStable   = 0;   // consecutive polls with no change to the streaming message

    this.lastTotalText = '';
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

        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
          return;
        }

        // Track execution contexts to find the right frame for JS injection
        if (msg.method === 'Runtime.executionContextCreated') {
          const ctx = msg.params?.context;
          if (ctx && (ctx.name?.includes('workbench') || ctx.origin?.includes('workbench'))) {
            this.contextId = ctx.id;
          }
        }
        if (msg.method === 'Runtime.executionContextsCleared') {
          this.contextId = null;
        }
      });
    });

    await this._call('Runtime.enable');

    this.onStage('CDP logger connected');
    this.running = true;
    this._startPolling();
  }

  async _discoverTarget() {
    const PORTS = [this.cdpPort];
    for (const port of PORTS) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) continue;
        const targets = await res.json();
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
    // Keep lastMessages across reconnect — position-based diff will pick up where we left off
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

    // Flush any unfinalized streaming message to JSONL on clean disconnect
    if (this.streamingId !== null && this.conversationId) {
      const entry = this.lastMessages.find(m => m.id === this.streamingId);
      if (entry) appendToLog(this.conversationId, entry);
    }
  }

  // ── Send Message ──────────────────────────────────────────────────────────

  /**
   * Inject a chat message into Antigravity's input field and submit it via CDP.
   * @param {string} text — the message to send
   * @returns {{ ok: boolean, method: 'click'|'enter', error?: string }}
   */
  async sendMessage(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('CDP not connected');
    }
    // JSON.stringify safely embeds arbitrary text as a JS string literal
    const result = await this._evaluate(`(${SEND_MESSAGE_SCRIPT})(${JSON.stringify(text)})`);
    return result || { ok: false, error: 'no result returned' };
  }

  // ── Polling ───────────────────────────────────────────────────────────────

  _startPolling() {
    const poll = async () => {
      if (!this.running) return;
      try {
        await this._extractAndDiff();
      } catch (err) {
        if (err.message.includes('not open') || err.message.includes('timed out')) {
          this.onError(`CDP poll error: ${err.message}`);
        }
      }
      this.pollTimer = setTimeout(poll, 1500);
    };
    poll();
  }

  // ── Message Extraction & Diffing ─────────────────────────────────────────
  //
  // Two paths:
  //   First extract (lastMessages empty): emit all visible messages immediately,
  //     persist all except the last assistant message (which might be mid-stream).
  //   Subsequent extracts: position-based diff — new, update, or unchanged.

  async _extractAndDiff() {
    const result = await this._evaluate(EXTRACT_MESSAGES_SCRIPT);
    if (!result || !result.containerFound) return;

    const { messages, totalText } = result;
    if (!messages || messages.length === 0) return;

    // ── Conversation switch detection ──────────────────────────────────────
    // Heuristic: total text changed AND either:
    //   (a) message count dropped by >50%  — user opened an existing chat
    //   (b) exactly 1 message visible with different first-message text — user
    //       opened a fresh new chat (which starts with just their first message)
    const firstFpChanged = messages[0]?.fingerprint !== this.lastMessages[0]?.fingerprint;
    if (
      this.lastTotalText &&
      this.lastMessages.length > 0 &&
      totalText !== this.lastTotalText &&
      (
        messages.length < this.lastMessages.length * 0.5 ||
        (messages.length === 1 && this.lastMessages.length > 1 && firstFpChanged)
      )
    ) {
      // Flush any pending streaming message before switching
      if (this.streamingId !== null) {
        const entry = this.lastMessages.find(m => m.id === this.streamingId);
        if (entry) {
          appendToLog(this.conversationId, entry);
          this._emitPayload(this.onMessageDone, entry);
        }
        this.streamingId = null;
        this.streamStable = 0;
      }

      const titleResult = await this._evaluate(GET_CONVERSATION_TITLE_SCRIPT).catch(() => null);
      // Content-only hash — stable regardless of when we connect
      const seed = (messages[0]?.text || '').slice(0, 150) + (messages[1]?.text || '').slice(0, 50);
      const newId = sha1(seed);
      this.conversationId = newId;
      this.lastMessages = [];
      this.onConversationSwitch(newId);
      this.onStage('Conversation switched', titleResult?.title || newId);
    }

    // ── Initialize conversation ID on first messages ───────────────────────
    if (!this.conversationId && messages.length > 0) {
      const seed = (messages[0].text || '').slice(0, 150) + (messages[1]?.text || '').slice(0, 50);
      this.conversationId = sha1(seed);
    }

    // ── First extract: emit all visible messages as history ────────────────
    if (this.lastMessages.length === 0) {
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const role = m.isUser ? 'user' : 'assistant';
        const positionId = sha1(this.conversationId + ':' + i);
        const entry = {
          id: positionId, role, text: m.text, fingerprint: m.fingerprint,
          timestamp: nowIso(), conversationId: this.conversationId,
        };
        this.lastMessages.push(entry);
        this._emitPayload(this.onMessage, entry);

        const isLastAndAssistant = (i === messages.length - 1) && role === 'assistant';
        if (!isLastAndAssistant) {
          // Definitely complete — persist immediately
          appendToLog(this.conversationId, entry);
        } else {
          // Last assistant message might still be streaming — track it, persist when done
          this.streamingId = positionId;
          this.streamStable = 0;
        }
      }
      this.lastTotalText = totalText;
      return;
    }

    // ── Subsequent extracts: position-based diff ───────────────────────────
    let streamingPositionUpdated = false;

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const role = m.isUser ? 'user' : 'assistant';
      const positionId = sha1(this.conversationId + ':' + i);

      if (i >= this.lastMessages.length) {
        // NEW message at a previously unseen position
        const entry = {
          id: positionId, role, text: m.text, fingerprint: m.fingerprint,
          timestamp: nowIso(), conversationId: this.conversationId,
        };
        this.lastMessages.push(entry);
        this._emitPayload(this.onMessage, entry);

        if (role === 'user') {
          appendToLog(this.conversationId, entry);
        } else {
          // Track new assistant message for streaming
          this.streamingId = positionId;
          this.streamStable = 0;
          streamingPositionUpdated = true;
        }

      } else if (m.fingerprint !== this.lastMessages[i].fingerprint) {
        // EXISTING position, text changed → streaming update
        const prev = this.lastMessages[i];
        const entry = { ...prev, text: m.text, fingerprint: m.fingerprint };
        this.lastMessages[i] = entry;
        this._emitPayload(this.onMessageUpdate, entry);

        if (positionId === this.streamingId) {
          this.streamStable = 0;
          streamingPositionUpdated = true;
        }
      }
      // else: unchanged — no event
    }

    // ── Streaming finalization ─────────────────────────────────────────────
    // If the streaming message text was unchanged this poll, count up.
    // After 2 consecutive stable polls, emit onMessageDone and persist final text.
    if (this.streamingId !== null && !streamingPositionUpdated) {
      this.streamStable++;
      if (this.streamStable >= 2) {
        const entry = this.lastMessages.find(m => m.id === this.streamingId);
        if (entry) {
          appendToLog(this.conversationId, entry);
          this._emitPayload(this.onMessageDone, entry);
        }
        this.streamingId = null;
        this.streamStable = 0;
      }
    }

    this.lastTotalText = totalText;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Emit a message payload, stripping internal tracking fields. */
  _emitPayload(callback, entry) {
    callback({
      id:             entry.id,
      role:           entry.role,
      text:           entry.text,
      timestamp:      entry.timestamp,
      conversationId: entry.conversationId,
    });
  }
}
