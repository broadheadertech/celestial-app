// Storefront smoke test: serves the static export in ./out, opens key pages in headless
// Chrome (phone + desktop), and fails on console errors, uncaught exceptions, horizontal
// overflow, or a missing <h1>. Read-only — never submits forms.
//
// Usage: npm run build && npm run test:smoke
// Env: CHROME_PATH (defaults to the standard Windows/macOS/Linux Chrome locations), SMOKE_PORT.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve('out');
const PORT = Number(process.env.SMOKE_PORT || 4179);
const DEBUG_PORT = PORT + 1;
const PAGES = ['/', '/catalog', '/cave', '/shop', '/visit', '/contact', '/track', '/checkout'];
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, mobile: true },
  { name: 'desktop', width: 1366, height: 900, mobile: false },
];
// Noise that isn't a storefront bug.
const IGNORE = [/favicon\.ico/i, /Download the React DevTools/i];

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('out/index.html not found — run `npm run build` first.');
  process.exit(2);
}

const chromePath =
  process.env.CHROME_PATH ||
  [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((p) => fs.existsSync(p));
if (!chromePath) {
  console.error('Chrome not found — set CHROME_PATH.');
  process.exit(2);
}

// ── static server (resolves /path -> /path.html) ──
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent((req.url || '/').split('?')[0]);
  for (const c of [p, `${p}.html`, path.join(p, 'index.html')]) {
    const f = path.join(ROOT, c);
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
      return fs.createReadStream(f).pipe(res);
    }
  }
  res.writeHead(404);
  res.end('not found');
});
await new Promise((r) => server.listen(PORT, r));

// ── chrome over CDP ──
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-chrome-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
    wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
  } catch {}
  if (!wsUrl) await sleep(250);
}
if (!wsUrl) throw new Error('Chrome did not start');

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 0;
const pending = new Map();
let problems = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
  const push = (text) => { if (!IGNORE.some((re) => re.test(text))) problems.push(text); };
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    push('console.error: ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 240));
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    push('exception: ' + (d.exception?.description || d.text).slice(0, 240));
  }
});
const send = (method, params = {}) => new Promise((resolve) => { const id = ++nextId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable');
await send('Page.enable');

let failures = 0;
for (const vp of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
  for (const page of PAGES) {
    problems = [];
    await send('Page.navigate', { url: `http://localhost:${PORT}${page}` });
    await sleep(4500);
    const res = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({ vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, h1: !!document.querySelector('h1'), title: document.title })`,
    });
    const info = res.result?.result?.value ?? {};
    if (info.sw > info.vw + 1) problems.push(`horizontal overflow: ${info.sw}px content in ${info.vw}px viewport`);
    if (!info.h1 && page !== '/checkout') problems.push('no <h1> rendered');
    const ok = problems.length === 0;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${vp.name.padEnd(7)} ${page.padEnd(10)} ${info.title ?? ''}`);
    for (const p of problems) console.log(`        - ${p}`);
  }
}

ws.close();
chrome.kill();
server.close();
console.log(failures ? `\n${failures} page check(s) failed.` : '\nAll storefront smoke checks passed.');
process.exit(failures ? 1 : 0);
