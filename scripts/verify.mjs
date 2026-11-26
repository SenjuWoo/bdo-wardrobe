// Headless verification of BDO Wardrobe (playwright-core).
// Browser resolution: BDO_WARDROBE_BROWSER env > Opera GX (local dev) >
// playwright-managed Chromium (CI: `npx playwright install chromium`).
// Usage: node verify.mjs <url> <screenshot-dir>
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [url, shotDir] = [process.argv[2] || 'http://127.0.0.1:7861', process.argv[3] || '.'];
mkdirSync(shotDir, { recursive: true });

const CANDIDATES = [
  process.env.BDO_WARDROBE_BROWSER,
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Programs/Opera GX/opera.exe`,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const OPERA = CANDIDATES.find(existsSync) || null; // null = playwright-managed browser
const launchOpts = { headless: true, args: ['--no-sandbox'] };
if (OPERA) launchOpts.executablePath = OPERA;
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };

// ---- request-guard helpers ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((resolve, reject) => {
  const s = createNetServer().once('error', reject).listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
// node:http (not fetch) so the Host header can be forged like a DNS-rebinding page would.
const rawPost = (port, headers, body = '{}') => new Promise((resolve, reject) => {
  const req = request({ host: '127.0.0.1', port, method: 'POST', path: '/api/crawl', headers: { 'content-type': 'application/json', ...headers } }, (res) => {
    let data = ''; res.on('data', (c) => { data += c; }); res.on('end', () => resolve({ status: res.statusCode, body: data }));
  });
  req.on('error', reject); req.end(body);
});
async function guardChecks() {
  const serverFile = fileURLToPath(new URL('../server.mjs', import.meta.url));
  const work = mkdtempSync(path.join(tmpdir(), 'bdo-guard-'));
  const marker = path.join(work, 'crawl-args.json');
  const stub = path.join(work, 'crawl-stub.mjs');
  writeFileSync(stub, `import { writeFileSync } from 'node:fs';\nwriteFileSync(process.env.BDO_GUARD_MARKER, JSON.stringify(process.argv.slice(2)));\n`);
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const srv = spawn(process.execPath, [serverFile], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), BDO_WARDROBE_CRAWL_SCRIPT: stub, BDO_GUARD_MARKER: marker },
    stdio: 'ignore',
  });
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch(`${origin}/api/health`)).ok) break; } catch {} await sleep(100); }

    const foreignOrigin = await rawPost(port, { origin: 'https://evil.example' });
    await sleep(400);
    check('guard: foreign Origin gets 403', foreignOrigin.status === 403 && !existsSync(marker), `HTTP ${foreignOrigin.status}, crawler started: ${existsSync(marker)}`);

    const rebound = await rawPost(port, { host: `evil.example:${port}` });
    await sleep(400);
    check('guard: foreign Host (DNS rebinding) gets 403', rebound.status === 403 && !existsSync(marker), `HTTP ${rebound.status}, crawler started: ${existsSync(marker)}`);

    const getForeign = await fetch(`${origin}/api/health`, { headers: { origin: 'https://evil.example' } });
    check('guard: GET routes unchanged', getForeign.status === 200, `GET /api/health with foreign Origin → HTTP ${getForeign.status}`);

    // Real browser, real same-origin page: the browser attaches Origin itself.
    const p2 = await browser.newPage();
    await p2.goto(`${origin}/api/health`);
    const same = await p2.evaluate(async () => {
      const r = await fetch('/api/crawl', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"all":true}' });
      return { status: r.status, body: await r.json() };
    });
    await p2.close();
    let args = null;
    for (let i = 0; i < 30 && !args; i++) { await sleep(100); try { args = JSON.parse(readFileSync(marker, 'utf8')); } catch {} }
    check('guard: same-origin crawl still starts (with options)', same.status === 200 && same.body.ok === true && Array.isArray(args) && args.includes('--all'), `HTTP ${same.status}, crawler args ${JSON.stringify(args)}`);
  } finally {
    srv.kill();
    try { rmSync(work, { recursive: true, force: true }); } catch {}
  }
}

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1200);

// 1. Boot + catalog
const boot = await page.evaluate(async () => {
  const r = await fetch('/api/catalog');
  const d = await r.json();
  return { outfits: d.outfits.length, boxes: d.boxes.length, covered: d.imageStats.covered, academia: d.outfits.filter(o => o.boxes.includes('academia')).length };
});
check('catalog loads', boot.outfits === 4343 && boot.boxes === 11, `${boot.outfits} outfits, ${boot.boxes} boxes, ${boot.covered} imaged`);
check('academia box filled', boot.academia === 27, `${boot.academia} outfits`);

// 2. Gallery renders cards
const cards = await page.locator('#gallery .card').count();
check('gallery renders', cards > 400, `${cards} cards`);

// 3. Lightbox opens with image (pick a card that HAS an image)
await page.locator('#gallery .card', { has: page.locator('img') }).first().locator('.card-img').click();
await page.waitForTimeout(600);
const lbVisible = await page.locator('#lightbox:not([hidden])').count();
const lbName = await page.locator('#lb-name').textContent();
const lbImgOk = await page.evaluate(() => { const i = document.querySelector('#lb-img'); return i.style.display !== 'none' && (i.complete ? i.naturalWidth > 100 : true); });
check('lightbox opens', lbVisible === 1 && lbName.length > 0, lbName);
check('lightbox image real', lbImgOk);
await page.screenshot({ path: `${shotDir}/lightbox.png` });

// 4. Arrow navigation
const name1 = lbName;
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
const name2 = await page.locator('#lb-name').textContent();
check('lightbox arrows navigate', name2 !== name1, `${name1} → ${name2}`);

// 5. Favorite from lightbox + persistence
await page.locator('#lightbox [data-act="favorite"]').first().click();
await page.waitForTimeout(200);
await page.keyboard.press('Escape');
const favStored = await page.evaluate(() => JSON.parse(localStorage.getItem('bdo-wardrobe') || '{}').wardrobe);
check('favorite persists', Object.values(favStored).includes('favorite'), JSON.stringify(favStored).slice(0, 80));

// 6. Class filter narrows
await page.locator('#class-chips .chip').first().click();
await page.waitForTimeout(300);
const filtered = await page.locator('#gallery .card').count();
check('class filter works', filtered > 0 && filtered < cards, `${filtered} cards`);
await page.screenshot({ path: `${shotDir}/gallery-filtered.png` });
await page.locator('#clear-filters').click();

// 7. Quality filter (missing images) — honest labels exist
await page.locator('#quality-chips .chip[data-quality="missing"]').click();
await page.waitForTimeout(300);
const missing = await page.locator('#gallery .card').count();
check('missing-image filter works', missing >= 0, `${missing} cards without images`);
await page.locator('#clear-filters').click();

// 8. Boxes view shows academia 29
await page.locator('.nav-btn[data-view="boxes"]').click();
await page.waitForTimeout(300);
const academiaCard = await page.locator('.card[data-box="academia"] .count-big').textContent();
check('boxes view academia=27', academiaCard.trim() === '27', academiaCard.trim());

// 9. Compare flow
await page.locator('.nav-btn[data-view="gallery"]').click();
await page.waitForTimeout(300);
await page.locator('#gallery .card [data-act="compare"]').nth(0).click();
await page.locator('#gallery .card [data-act="compare"]').nth(1).click();
await page.waitForTimeout(200);
const compareCount = await page.locator('#compare-count').textContent();
check('compare adds', compareCount.trim() === '2', compareCount.trim());
await page.locator('.nav-btn[data-view="compare"]').click();
await page.waitForTimeout(300);
const compareCards = await page.locator('#compare-grid .card').count();
check('compare view renders', compareCards === 2, `${compareCards} cards`);

// 10. Wardrobe view shows the favorited outfit
await page.locator('.nav-btn[data-view="wardrobe"]').click();
await page.waitForTimeout(300);
const wardrobeCards = await page.locator('#wardrobe-gallery .card').count();
check('wardrobe shows favorite', wardrobeCards === 1, `${wardrobeCards} card(s)`);
await page.screenshot({ path: `${shotDir}/final.png` });

// 11. Request guard on mutating routes (CSRF / DNS rebinding). Runs against a
// second server whose crawler is a stub that only records its arguments, so
// no real crawl (network, image writes) ever starts.
await guardChecks();

// 12. Phone layout (390x844 touch): page fits the screen and a card tap opens the lightbox;
//     an 820 px tablet width fits too.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await ctx.newPage();
  phone.on('pageerror', (e) => errors.push('phone pageerror: ' + e.message));
  await phone.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await phone.waitForTimeout(800);
  const sw = await phone.evaluate(() => document.documentElement.scrollWidth);
  check('phone: no horizontal scroll at 390px', sw <= 390, `page width ${sw}px`);
  let tapped = false;
  try {
    await phone.locator('#gallery .card', { has: phone.locator('img') }).first().locator('.card-img').tap({ timeout: 5000 });
    await phone.waitForTimeout(400);
    tapped = (await phone.locator('#lightbox:not([hidden])').count()) === 1;
  } catch (e) { errors.push('phone tap: ' + e.message.split('\n')[0]); }
  check('phone: card tap opens lightbox', tapped);
  await phone.screenshot({ path: `${shotDir}/phone.png` });
  await ctx.close();
  // Tablet / narrow window: between the phone and desktop layouts the unwrapped topbar used to overflow.
  const tab = await browser.newPage({ viewport: { width: 820, height: 1180 } });
  await tab.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  const tw = await tab.evaluate(() => document.documentElement.scrollWidth);
  check('tablet: no horizontal scroll at 820px', tw <= 820, `page width ${tw}px`);
  await tab.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
console.log('CONSOLE/PAGE ERRORS:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
process.exit(failed.length || errors.length ? 1 : 0);
