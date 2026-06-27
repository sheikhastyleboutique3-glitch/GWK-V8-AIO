#!/usr/bin/env node
/**
 * GWK V8 AIO — On-prem KOT/Receipt Print Agent (ESC/POS over TCP/IP).
 *
 * REAL-TIME: Connects via WebSocket to the backend and prints INSTANTLY when
 * orders are fired (KOT) or completed (receipt). Zero delay.
 * Falls back to polling if WebSocket is unavailable.
 *
 * AUTO-DISCOVERS printers from the backend — no manual IP config needed.
 * Just configure printers in the GWK app (Printers page), then run this agent.
 *
 * Runs on the in-store LAN (Raspberry Pi / mini-PC / any PC at restaurant).
 *
 * Zero external dependencies — uses only Node built-ins (node:net, fetch).
 * Requires Node 18+ (global fetch).
 *
 * Setup:
 *   1. Configure printers in GWK app → Printers page (set IP + port)
 *   2. Assign categories to printers (Categories page → printer dropdown)
 *   3. Run this agent on a PC at the restaurant (same network as printers)
 *
 * Env:
 *   API_URL       Backend URL     (e.g. http://your-vps-ip or http://localhost:3000)
 *   API_EMAIL     Login email     (default: admin@gwk.com)
 *   API_PASSWORD  Login password  (default: Admin@1234)
 *   BRANCH_ID     Branch ID       (e.g. 2 — from the Branches page)
 *   POLL_MS       Fallback poll   (default 30000ms — only used when WebSocket is down)
 *
 * Usage:
 *   API_URL=http://your-vps-ip BRANCH_ID=2 node print-agent.mjs
 *
 * Windows:
 *   set API_URL=http://your-vps-ip
 *   set BRANCH_ID=2
 *   node print-agent.mjs
 */
import net from 'node:net';

const API_URL = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_EMAIL = process.env.API_EMAIL || 'admin@gwk.com';
const API_PASSWORD = process.env.API_PASSWORD || 'Admin@1234';
const BRANCH_ID = process.env.BRANCH_ID || '';
const POLL_MS = parseInt(process.env.POLL_MS || '30000', 10); // Fallback only — WebSocket is primary

let API_TOKEN = process.env.API_TOKEN || '';
const printed = new Set();        // KOT: order IDs already printed
const receiptPrinted = new Set(); // Receipt: completed order IDs already printed
let printers = [];
let wsConnected = false;
let pollTimer = null;

// ── Auto-login ───────────────────────────────────────────────────────────────
async function autoLogin() {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: API_EMAIL, password: API_PASSWORD }),
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    const body = await res.json();
    API_TOKEN = body?.data?.access_token || body?.access_token || '';
    if (!API_TOKEN) throw new Error('No token in response');
    console.log('🔑 Auto-login successful');
    return true;
  } catch (e) {
    console.error('❌ Auto-login failed:', e.message);
    return false;
  }
}

// ── ESC/POS encoding ─────────────────────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;

function escpos(ticketText, widthMm = 80) {
  const chunks = [];
  chunks.push(Buffer.from([ESC, 0x40]));           // Initialize
  chunks.push(Buffer.from([ESC, 0x74, 0x15]));     // UTF-8 code page
  chunks.push(Buffer.from([ESC, 0x61, 0x00]));     // Left align
  chunks.push(Buffer.from([ESC, 0x21, 0x08]));     // Bold on
  chunks.push(Buffer.from(ticketText + '\n\n\n', 'utf8'));
  chunks.push(Buffer.from([GS, 0x56, 0x42, 0x00])); // Partial cut
  return Buffer.concat(chunks);
}

function sendToPrinter(ip, port, buf) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let done = false;
    const finish = (ok, err) => {
      if (done) return;
      done = true;
      try { sock.destroy(); } catch {}
      if (ok) resolve(true);
      else { console.error(`  ✗ print to ${ip}:${port} failed:`, err?.message || err); resolve(false); }
    };
    sock.setTimeout(8000);
    sock.on('timeout', () => finish(false, 'timeout (8s)'));
    sock.on('error', (e) => finish(false, e));
    sock.connect(port, ip, () => {
      sock.write(buf, () => setTimeout(() => finish(true), 300));
    });
  });
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function api(path) {
  const url = `${API_URL}/api${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  if (res.status === 401) {
    console.log('🔄 Token expired, re-authenticating...');
    const ok = await autoLogin();
    if (!ok) throw new Error('Re-authentication failed');
    const retry = await fetch(url, { headers: { Authorization: `Bearer ${API_TOKEN}` } });
    if (!retry.ok) throw new Error(`${path} → ${retry.status}`);
    const body = await retry.json();
    return body?.data ?? body;
  }
  if (!res.ok) throw new Error(`${path} → ${res.status} ${res.statusText}`);
  const body = await res.json();
  return body?.data ?? body;
}

// ── Load printers from backend ───────────────────────────────────────────────
async function loadPrinters() {
  try {
    const data = await api('/printers');
    printers = (data || []).filter(p => p.ipAddress && p.isActive);
    console.log(`📡 Loaded ${printers.length} printer(s) from backend:`);
    for (const p of printers) {
      console.log(`   • ${p.name} → ${p.ipAddress}:${p.port || 9100} (${p.connection})`);
    }
    if (!printers.length) {
      console.warn('⚠️  No active printers with IP addresses found.');
      console.warn('   → Go to Printers page in the app and add a printer with an IP address.');
    }
  } catch (e) {
    console.error('❌ Failed to load printers:', e.message);
  }
}

// ── Print KOT for an order ───────────────────────────────────────────────────
async function printKot(orderId) {
  if (printed.has(orderId)) return;
  try {
    const kotData = await api(`/printers/kot/${orderId}`);
    const tickets = kotData?.tickets || kotData || [];
    if (!tickets.length) { printed.add(orderId); return; }

    for (const tk of tickets) {
      const printerIp = tk.printer?.ipAddress || printers[0]?.ipAddress;
      const printerPort = tk.printer?.port || printers[0]?.port || 9100;
      if (!printerIp) { console.warn(`  ⚠ Order ${orderId} [${tk.station}]: no printer IP`); continue; }
      const buf = escpos(tk.text, tk.printer?.widthMm || 80);
      const ok = await sendToPrinter(printerIp, printerPort, buf);
      if (ok) console.log(`  🍳 KOT → ${tk.station} @ ${printerIp}:${printerPort}`);
    }
    printed.add(orderId);
  } catch (e) {
    console.error(`  ❌ KOT order ${orderId}: ${e.message}`);
  }
}

// ── Print Receipt for a completed order ──────────────────────────────────────
async function printReceipt(orderId) {
  if (receiptPrinted.has(orderId)) return;
  try {
    const receiptData = await api(`/printers/receipt/${orderId}`);
    if (!receiptData?.text) { receiptPrinted.add(orderId); return; }

    const printerIp = receiptData.printer?.ipAddress || printers[0]?.ipAddress;
    const printerPort = receiptData.printer?.port || printers[0]?.port || 9100;
    if (!printerIp) { receiptPrinted.add(orderId); return; }

    const buf = escpos(receiptData.text, receiptData.printer?.widthMm || 80);
    const ok = await sendToPrinter(printerIp, printerPort, buf);
    if (ok) console.log(`  🧾 RECEIPT @ ${printerIp}:${printerPort}`);
    receiptPrinted.add(orderId);
  } catch (e) {
    receiptPrinted.add(orderId); // don't retry
  }
}

// ── WebSocket: instant printing on events ────────────────────────────────────
async function connectWebSocket() {
  // Dynamic import socket.io-client (may not be installed — graceful fallback)
  let ioModule;
  try {
    ioModule = await import('socket.io-client');
  } catch {
    console.warn('⚠️  socket.io-client not installed — using polling only.');
    console.warn('   Install for instant printing: npm install socket.io-client');
    return false;
  }
  const { io } = ioModule;

  const wsUrl = API_URL.replace(/^http/, 'ws');
  const socket = io(`${API_URL}/realtime`, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 15000,
  });

  socket.on('connect', () => {
    wsConnected = true;
    console.log('⚡ WebSocket connected — printing is INSTANT');
    if (BRANCH_ID) {
      socket.emit('join', { branchId: parseInt(BRANCH_ID, 10) });
    } else {
      // No branch filter → join ALL branches (global room)
      socket.emit('join', { branchId: null });
    }
  });

  socket.on('disconnect', (reason) => {
    wsConnected = false;
    console.warn(`⚠️  WebSocket disconnected (${reason}) — falling back to polling`);
  });

  socket.on('reconnect', () => {
    wsConnected = true;
    console.log('⚡ WebSocket reconnected — instant printing restored');
    if (BRANCH_ID) {
      socket.emit('join', { branchId: parseInt(BRANCH_ID, 10) });
    } else {
      socket.emit('join', { branchId: null });
    }
  });

  // ─── Handle real-time order events ───
  socket.on('order:changed', async (payload) => {
    const { orderId, orderNo, action } = payload || {};
    if (!orderId) return;

    if (action === 'fired') {
      console.log(`⚡ INSTANT KOT: ${orderNo || orderId} (fired)`);
      await printKot(orderId);
    } else if (action === 'completed') {
      console.log(`⚡ INSTANT RECEIPT: ${orderNo || orderId} (completed)`);
      await printReceipt(orderId);
    }
  });

  // Also listen for kds:update as backup (catches fires from fireCourse)
  socket.on('kds:update', async () => {
    // When KDS updates, check for any new fired orders we haven't printed
    await scanForNewKots();
  });

  return true;
}

// ── Scan for un-printed KOTs (used by WebSocket kds:update + fallback poll) ──
async function scanForNewKots() {
  try {
    const params = BRANCH_ID ? `?branchId=${BRANCH_ID}&status=OPEN` : '?status=OPEN';
    const orders = await api(`/sales/orders${params}`);
    for (const order of orders || []) {
      if (printed.has(order.id)) continue;
      const hasFired = (order.items || []).some(it => it.firedAt && !it.isVoided);
      if (!hasFired) continue;
      await printKot(order.id);
    }
  } catch (e) {
    if (e.message.includes('401')) await autoLogin();
    else console.error('Scan KOT error:', e.message);
  }
}

// ── Scan for un-printed receipts ─────────────────────────────────────────────
async function scanForNewReceipts() {
  try {
    const params = BRANCH_ID ? `?branchId=${BRANCH_ID}&status=COMPLETED` : '?status=COMPLETED';
    const completed = await api(`/sales/orders${params}`);
    for (const order of (completed || []).slice(0, 20)) {
      if (receiptPrinted.has(order.id)) continue;
      await printReceipt(order.id);
    }
  } catch (e) {
    if (e.message.includes('401')) await autoLogin();
  }
}

// ── Fallback poll (only when WebSocket is disconnected) ──────────────────────
async function fallbackTick() {
  if (wsConnected) return; // WebSocket handles it — skip
  await scanForNewKots();
  await scanForNewReceipts();
}

// ── Startup ──────────────────────────────────────────────────────────────────
console.log('');
console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║   GWK V8 — Print Agent (REAL-TIME ESC/POS)          ║');
console.log('╠═══════════════════════════════════════════════════════╣');
console.log(`║ API:      ${API_URL.padEnd(43)}║`);
console.log(`║ User:     ${API_EMAIL.padEnd(43)}║`);
console.log(`║ Branch:   ${(BRANCH_ID || 'ALL').padEnd(43)}║`);
console.log(`║ Mode:     ${'WebSocket (instant) + poll fallback'.padEnd(43)}║`);
console.log('╚═══════════════════════════════════════════════════════╝');
console.log('');

(async () => {
  // 1. Login
  const loggedIn = await autoLogin();
  if (!loggedIn) {
    console.error('Cannot start without authentication.');
    console.error('Check API_URL, API_EMAIL, and API_PASSWORD.');
    process.exit(1);
  }

  // 2. Load printers
  await loadPrinters();
  // Reload printers every 5 minutes (picks up changes from Printers page)
  setInterval(loadPrinters, 5 * 60_000);

  // 3. Connect WebSocket for instant printing
  const wsOk = await connectWebSocket();
  if (wsOk) {
    console.log('');
    console.log('⚡ REAL-TIME MODE: prints instantly when orders fire or complete');
    console.log('   Fallback poll runs every ' + (POLL_MS / 1000) + 's (only when WebSocket is down)');
  } else {
    console.log('');
    console.log('🔄 POLLING MODE: checking every ' + (POLL_MS / 1000) + 's');
  }
  console.log('   (Press Ctrl+C to stop)');
  console.log('');

  // 4. Initial scan (catch anything fired before agent started)
  await scanForNewKots();
  await scanForNewReceipts();

  // 5. Fallback poll (runs only when WebSocket is disconnected)
  pollTimer = setInterval(fallbackTick, POLL_MS);

  // 6. Re-login every 6 hours (JWT 8h expiry — refresh well before)
  setInterval(autoLogin, 6 * 60 * 60_000);
})();
