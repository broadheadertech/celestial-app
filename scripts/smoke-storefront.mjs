// Storefront smoke test: serves the static export in ./out, opens key pages in headless
// Chrome (phone + desktop), and fails on console errors, uncaught exceptions, horizontal
// overflow, a missing <h1>, or light text tokens when the admin dark theme is saved. Read-only — never submits forms.
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
// /visit and /journal are kept in the list on purpose: they are redirect stubs now, and this
// checks they still render and bounce cleanly rather than erroring.
const PAGES = [
  '/',
  '/catalog',
  '/shop',
  '/merch',
  '/cave',
  '/drago-knows',
  '/ka-dragon',
  '/contact',
  '/track',
  '/checkout',
  '/visit',
  '/journal',
];
// Extra paths to check, e.g. SMOKE_EXTRA=/specimen/some-slug,/specimen/another
for (const extra of (process.env.SMOKE_EXTRA || '').split(',').map((p) => p.trim()).filter(Boolean)) PAGES.push(extra);
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, mobile: true },
  { name: 'desktop', width: 1366, height: 900, mobile: false },
  // Admin dark mode is saved per browser; the storefront must stay light and readable.
  { name: 'dark', width: 1366, height: 900, mobile: false, adminTheme: 'dark' },
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
// Apply vercel.json rewrites (e.g. /specimen/:slug → /specimen-detail) like production does.
const rewrites = (() => {
  try {
    return (JSON.parse(fs.readFileSync('vercel.json', 'utf8')).rewrites || []).map((r) => ({
      re: new RegExp('^' + r.source.replace(/:[a-zA-Z]+/g, '[^/]+') + '$'),
      destination: r.destination,
    }));
  } catch {
    return [];
  }
})();
const server = http.createServer((req, res) => {
  const requested = decodeURIComponent((req.url || '/').split('?')[0]);
  // Like Vercel: files first (e.g. prerendered /specimen/<slug>.html), rewrites only when nothing matches.
  const resolve = (p) =>
    [p, `${p}.html`, path.join(p, 'index.html')]
      .map((c) => path.join(ROOT, c))
      .find((f) => f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile());
  const rewritten = rewrites.find((r) => r.re.test(requested))?.destination;
  const f = resolve(requested) ?? (rewritten ? resolve(rewritten) : undefined);
  if (f) {
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    return fs.createReadStream(f).pipe(res);
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
let themeScript;
for (const vp of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
  if (themeScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: themeScript });
  const theme = vp.adminTheme || 'light';
  themeScript = (await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { localStorage.setItem('dragons-cave-theme', JSON.stringify({ state: { theme: '${theme}' }, version: 0 })); } catch (e) {}`,
  })).result?.identifier;
  for (const page of PAGES) {
    problems = [];
    await send('Page.navigate', { url: `http://localhost:${PORT}${page}` });
    await sleep(4500);
    const res = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => { const scope = document.querySelector('.dc-scope'); const L = (c) => { const m = /oklch\\(\\s*([\\d.]+)/.exec(c || ''); if (!m) return null; const v = parseFloat(m[1]); return v > 1 ? v / 100 : v; }; return { vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, h1: !!document.querySelector('h1'), title: document.title, inkL: scope ? L(getComputedStyle(scope).getPropertyValue('--ink')) : null }; })()`,
    });
    const info = res.result?.result?.value ?? {};
    // A pill button must never run past the box it sits in: that clips its arrow chip and looks
    // broken, without necessarily making the whole document scroll sideways. The footer's
    // "Message us on Messenger" button used to do exactly this.
    // Measured twice, after the webfonts have settled: a fallback font is a different width, so
    // measuring mid-swap reports overflow that isn't really there. Only a button that overflows
    // in both passes counts, which keeps this from flaking on a cold run.
    const spillRes = await send('Runtime.evaluate', {
      returnByValue: true,
      awaitPromise: true,
      expression: `(async () => {
        const measure = () => {
          const found = new Map();
          for (const b of document.querySelectorAll('.dk-btn')) {
            const parent = b.parentElement;
            if (!parent) continue;
            if (getComputedStyle(parent).overflowX !== 'visible') continue;
            const br = b.getBoundingClientRect(), pr = parent.getBoundingClientRect();
            if (!br.width) continue;
            const over = Math.round(Math.max(br.right - pr.right, pr.left - br.left));
            if (over > 2) found.set((b.textContent || '').trim().slice(0, 40), over);
          }
          return found;
        };
        try { await document.fonts.ready; } catch (e) {}
        const first = measure();
        if (!first.size) return null;
        await new Promise((r) => setTimeout(r, 400));
        const second = measure();
        let worst = null;
        for (const [label, over] of second) {
          if (!first.has(label)) continue;
          if (!worst || over > worst.over) worst = { over, label };
        }
        return worst;
      })()`,
    });
    const spill = spillRes.result?.result?.value ?? null;
    if (info.sw > info.vw + 1) problems.push(`horizontal overflow: ${info.sw}px content in ${info.vw}px viewport`);
    if (spill) problems.push(`button overflows its container by ${spill.over}px: "${spill.label}"`);
    if (!info.h1 && page !== '/checkout') problems.push('no <h1> rendered');
    // Storefront text colour token must be dark (readable on the cream background) in every admin theme.
    if (info.inkL !== null && info.inkL > 0.5) problems.push(`--ink is light (L=${info.inkL}) — storefront inheriting admin dark theme`);
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
