#!/usr/bin/env node
/**
 * GWK V8 AIO — On-prem KOT/Receipt Print Agent (ESC/POS over TCP/IP).
 *
 * AUTO-DISCOVERS printers from the backend — no manual IP config needed.
 * Just configure printers in the GWK app (Printers page), then run this agent
 * with API_URL + API_TOKEN. The agent reads printer IPs from the app settings.
 *
 * Runs on the in-store LAN (Raspberry Pi / mini-PC / any PC at restaurant).
 * It polls the backend for fired KOT orders, fetches station-grouped tickets,
 * and pushes ESC/POS bytes to the matching network printer.
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
 *   API_URL     Backend URL   (e.g. http://your-vps-ip or http://localhost:3000)
 *   API_TOKEN   JWT token     (login as admin, copy from browser localStorage)
 *   BRANCH_ID   Branch ID     (e.g. 2 — from the Branches page)
 *   POLL_MS     Poll interval (default 5000ms)
 *
 * Usage:
 *   API_URL=http://your-vps-ip API_TOKEN=xxx BRANCH_ID=2 node print-agent.mjs
 *
 * Windows:
 *   set API_URL=http://your-vps-ip
 *   set API_TOKEN=xxx
 *   set BRANCH_ID=2
 *   node print-agent.mjs
 */
import net from 'node:net';

const API_URL = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_EMAIL = process.env.API_EMAIL || 'admin@gwk.com';
const API_PASSWORD = process.env.API_PASSWORD || 'Admin@1234';
const BRANCH_ID = process.env.BRANCH_ID || '';
const POLL_MS = parseInt(process.env.POLL_MS || '5000', 10);

let API_TOKEN = process.env.API_TOKEN || '';
const printed = new Set();
const receiptPrinted = new Set(); // completed orders already receipt-printed
let printers = [];

// ── Auto-login (get token automatically) ─────────────────────────────────────
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

// Re-login when token expires
async function ensureAuth() {
  if (!API_TOKEN) return autoLogin();
  return true;
}

// ── ESC/POS encoding ─────────────────────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;

function escpos(ticketText, widthMm = 80) {
  const chunks = [];
  // Initialize printer
  chunks.push(Buffer.from([ESC, 0x40]));
  // Set UTF-8 code page for Arabic support
  chunks.push(Buffer.from([ESC, 0x74, 0x15]));
  // Left align
  chunks.push(Buffer.from([ESC, 0x61, 0x00]));
  // Bold on
  chunks.push(Buffer.from([ESC, 0x21, 0x08]));
  // Content
  chunks.push(Buffer.from(ticketText + '\n\n\n', 'utf8'));
  // Partial cut
  chunks.push(Buffer.from([GS, 0x56, 0x42, 0x00]));
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
    // Token expired → auto-relogin
    console.log('🔄 Token expired, re-authenticating...');
    const ok = await autoLogin();
    if (!ok) throw new Error('Re-authentication failed');
    // Retry the request
    const retry = await fetch(url, { headers: { Authorization: `Bearer ${API_TOKEN}` } });
    if (!retry.ok) throw new Error(`${path} → ${retry.status}`);
    const body = await retry.json();
    return body?.data ?? body;
  }
  if (!res.ok) throw new Error(`${path} → ${res.status} ${res.statusText}`);
  const body = await res.json();
  return body?.data ?? body;
}

// ── Load printers from backend (configured in Printers page) ─────────────────
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
    console.error('   Check API_URL and API_TOKEN are correct.');
  }
}

// ── Main poll loop ───────────────────────────────────────────────────────────
async function tick() {
  try {
    // ── KOT: print fired items from OPEN orders ──
    const params = BRANCH_ID ? `?branchId=${BRANCH_ID}` : '';
    const orders = await api(`/sales/orders${params}&status=OPEN`);

    for (const order of orders || []) {
      if (printed.has(order.id)) continue;
      const hasFired = (order.items || []).some(it => it.firedAt && !it.isVoided);
      if (!hasFired) continue;

      try {
        const kotData = await api(`/printers/kot/${order.id}`);
        const tickets = kotData?.tickets || kotData || [];
        if (!tickets.length) { printed.add(order.id); continue; }

        for (const tk of tickets) {
          const printerIp = tk.printer?.ipAddress || printers[0]?.ipAddress;
          const printerPort = tk.printer?.port || printers[0]?.port || 9100;
          if (!printerIp) { console.warn(`  ⚠ ${order.orderNo} [${tk.station}]: no printer IP`); continue; }
          const buf = escpos(tk.text, tk.printer?.widthMm || 80);
          const ok = await sendToPrinter(printerIp, printerPort, buf);
          if (ok) console.log(`  🍳 KOT ${order.orderNo} → ${tk.station} @ ${printerIp}:${printerPort}`);
        }
        printed.add(order.id);
      } catch (e) {
        console.error(`  ❌ KOT ${order.orderNo}: ${e.message}`);
      }
    }

    // ── RECEIPT: print completed orders ──
    const completed = await api(`/sales/orders${params}&status=COMPLETED`);
    for (const order of (completed || []).slice(0, 20)) { // only check recent 20
      if (receiptPrinted.has(order.id)) continue;

      try {
        const receiptData = await api(`/printers/receipt/${order.id}`);
        if (!receiptData?.text) { receiptPrinted.add(order.id); continue; }

        const printerIp = receiptData.printer?.ipAddress || printers[0]?.ipAddress;
        const printerPort = receiptData.printer?.port || printers[0]?.port || 9100;
        if (!printerIp) { receiptPrinted.add(order.id); continue; }

        const buf = escpos(receiptData.text, receiptData.printer?.widthMm || 80);
        const ok = await sendToPrinter(printerIp, printerPort, buf);
        if (ok) console.log(`  🧾 RECEIPT ${order.orderNo} @ ${printerIp}:${printerPort}`);
        receiptPrinted.add(order.id);
      } catch (e) {
        receiptPrinted.add(order.id); // don't retry failed receipts
      }
    }
  } catch (e) {
    if (e.message.includes('401')) {
      console.error('❌ Auth failed — re-logging in...');
      await autoLogin();
    } else {
      console.error('Poll error:', e.message);
    }
  }
}

// ── Startup ──────────────────────────────────────────────────────────────────
console.log('');
console.log('╔═══════════════════════════════════════════════════╗');
console.log('║   GWK V8 — Print Agent (ESC/POS over TCP/IP)    ║');
console.log('╠═══════════════════════════════════════════════════╣');
console.log(`║ API:      ${API_URL.padEnd(39)}║`);
console.log(`║ User:     ${API_EMAIL.padEnd(39)}║`);
console.log(`║ Branch:   ${(BRANCH_ID || 'ALL').padEnd(39)}║`);
console.log(`║ Interval: ${(POLL_MS + 'ms').padEnd(39)}║`);
console.log('╚═══════════════════════════════════════════════════╝');
console.log('');

// Auto-login, load printers, then start polling
autoLogin().then(ok => {
  if (!ok) {
    console.error('Cannot start without authentication.');
    console.error('Check API_URL, API_EMAIL, and API_PASSWORD.');
    process.exit(1);
  }
  return loadPrinters();
}).then(() => {
  console.log('');
  console.log('🔄 Polling for new KOT orders...');
  console.log('   (Press Ctrl+C to stop)');
  console.log('');
  tick();
  setInterval(tick, POLL_MS);
});
