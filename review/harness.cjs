// Review harness: screenshot matrix + usability metrics for one review round.
// Usage: node review/harness.js <round> [baseUrl]
// Serves nothing itself; point it at a server running dist/ (what is published).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROUND = process.argv[2] || '1';
const BASE = (process.argv[3] || 'http://127.0.0.1:8970/').replace(/\/?$/, '/');
const OUT = path.join(__dirname, `round-${ROUND}`);

const DEVICES = [
  { id: 'iphone15', w: 393, h: 852, phone: true },
  { id: 'iphoneSE', w: 375, h: 667, phone: true },
  { id: 'ipad-portrait', w: 820, h: 1180, phone: false, touch: true },
  { id: 'ipad-landscape', w: 1180, h: 820, phone: false, touch: true },
  { id: 'desktop', w: 1440, h: 900, phone: false },
];

const wait = (p, ms) => p.waitForTimeout(ms);

async function metrics(page, phone) {
  return page.evaluate((phone) => {
    const vis = (el) => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0 && !el.closest('[hidden],[inert],[aria-hidden="true"]');
    };
    const out = { overflow: document.documentElement.scrollWidth - window.innerWidth, smallFonts: [], smallTaps: [], smallInputs: [] };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const t = walker.currentNode; if (!t.textContent.trim()) continue;
      const el = t.parentElement; if (!el || seen.has(el) || !vis(el)) continue; seen.add(el);
      if (el.closest('.visually-hidden, .skip-link:not(:focus)')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12) out.smallFonts.push(`${fs}px "${t.textContent.trim().slice(0, 40)}" <${el.tagName.toLowerCase()} class="${el.className}">`);
    }
    if (phone) {
      for (const el of document.querySelectorAll('a[href], button, [role="button"], summary, input[type="submit"]')) {
        if (!vis(el) || el.classList.contains('skip-link')) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 44 - 0.5 || r.height < 44 - 0.5) out.smallTaps.push(`${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}" <${el.tagName.toLowerCase()} class="${el.className}">`);
      }
    }
    for (const el of document.querySelectorAll('input, textarea, select')) {
      if (!vis(el) || el.type === 'hidden') continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) out.smallInputs.push(`${fs}px <${el.tagName.toLowerCase()} name="${el.name}">`);
    }
    return out;
  }, phone);
}

async function scroller(page) {
  return page.evaluateHandle(() => [...document.querySelectorAll('[data-project-view] *')]
    .find((e) => e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY)) || null);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const content = await (await fetch(BASE + 'content.json')).json();
  const published = content.projects.filter((p) => p.status !== 'coming-soon');
  const b = await chromium.launch();
  const report = {};
  for (const d of DEVICES) {
    const dir = path.join(OUT, d.id); fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2, isMobile: !!d.phone, hasTouch: !!(d.phone || d.touch) });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    const shot = (name) => page.screenshot({ path: path.join(dir, name + '.png') });
    const r = (report[d.id] = { metrics: {}, notes: [] });

    // 1. first screen
    await page.goto(BASE, { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready); await wait(page, 1200);
    await shot('01-first-screen');
    r.metrics.landing = await metrics(page, d.phone);

    // 2. full page: scroll through so ScrollTriggers fire, then capture at full height (real viewport keeps blends correct)
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= H; y += Math.round(d.h * 0.8)) { await page.evaluate((y) => window.scrollTo(0, y), y); await wait(page, 250); }
    await page.evaluate(() => window.scrollTo(0, 0)); await wait(page, 500);
    await page.setViewportSize({ width: d.w, height: Math.min(H, 16000) }); await wait(page, 1200);
    await shot('02-full-page');
    await page.setViewportSize({ width: d.w, height: d.h }); await wait(page, 600);

    // 3. folders in view
    await page.evaluate(() => document.querySelector('#projects').scrollIntoView()); await wait(page, 1500);
    await shot('03-folders');
    r.metrics.folders = await metrics(page, d.phone);

    // 4. In Progress tap/click (must not open anything)
    const ip = await page.$('.folder--group');
    if (ip) {
      const hashBefore = await page.evaluate(() => location.hash);
      await ip.click({ force: true }).catch(() => {}); await wait(page, 900);
      await shot('04-in-progress-tap');
      const after = await page.evaluate(() => ({ hash: location.hash, open: !document.querySelector('[data-project-view]').hidden }));
      r.notes.push(`In Progress click: hash ${hashBefore} -> ${after.hash}, project view open=${after.open}`);
    } else r.notes.push('In Progress folder element not found');

    // 5. each published project: top, then one shot per screen inside the view
    for (const p of published) {
      await page.goto(BASE + '#project/' + p.slug, { waitUntil: 'networkidle' }); await wait(page, 1800);
      await shot(`05-${p.slug}-00-top`);
      r.metrics[`project-${p.slug}`] = await metrics(page, d.phone);
      const sc = await scroller(page);
      if (await sc.evaluate((e) => !!e)) {
        const [total, view] = await sc.evaluate((e) => [e.scrollHeight, e.clientHeight]);
        let i = 1;
        for (let y = view; y < total; y += view, i++) {
          await sc.evaluate((e, y) => (e.scrollTop = y), y); await wait(page, 600);
          await shot(`05-${p.slug}-${String(i).padStart(2, '0')}`);
          if (i > 25) break;
        }
        // metrics at the end of the page too (next file, back link)
        const endM = await metrics(page, d.phone);
        r.metrics[`project-${p.slug}-end`] = endM;
        // next-file target
        const next = await page.evaluate(() => { const a = [...document.querySelectorAll('[data-project-view] a[href^="#project/"]')].pop(); return a ? a.getAttribute('href') : null; });
        r.notes.push(`${p.slug}: last project link -> ${next}`);
      }
    }

    // 6. Esc and back from an open project
    const first = published.find((p) => !p.index) || published[0];
    await page.goto(BASE + '#projects', { waitUntil: 'networkidle' }); await wait(page, 1200);
    // Click a point of the folder that is actually visible (stacked folders overlap).
    const clickFolder = async (slug) => {
      const pt = await page.evaluate((slug) => {
        const el = document.querySelector(`.folder[data-slug="${slug}"]`); el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        for (let y = r.top + 4; y < r.bottom; y += 6) for (let x = r.left + 4; x < r.right; x += 12) {
          const hit = document.elementFromPoint(x, y); if (hit && hit.closest('.folder') === el) return [x, y];
        }
        return null;
      }, slug);
      await wait(page, 400);
      if (pt) await page.mouse.click(pt[0], pt[1]); else r.notes.push(`no visible point on folder ${slug}`);
    };
    await clickFolder(first.slug); await wait(page, 1600);
    await page.keyboard.press('Escape'); await wait(page, 1600);
    await shot('06-after-esc');
    r.notes.push('After Esc: ' + JSON.stringify(await page.evaluate(() => ({ hash: location.hash, open: !document.querySelector('[data-project-view]').hidden }))));
    await clickFolder(first.slug); await wait(page, 1600);
    r.notes.push('Opened before back: ' + (await page.evaluate(() => location.hash)));
    await page.goBack(); await wait(page, 1600);
    await shot('07-after-back');
    r.notes.push('After back: ' + JSON.stringify(await page.evaluate(() => ({ hash: location.hash, open: !document.querySelector('[data-project-view]').hidden }))));

    // 7. contact
    await page.goto(BASE, { waitUntil: 'networkidle' }); await wait(page, 800);
    await page.evaluate(() => document.querySelector('#contact').scrollIntoView()); await wait(page, 1500);
    await shot('08-contact');
    r.metrics.contact = await metrics(page, d.phone);

    r.consoleErrors = errors;
    await ctx.close();
    console.log(`${d.id}: done`);
  }
  await b.close();

  // Summary
  const lines = [`# Round ${ROUND} automated metrics`, '', `Base: ${BASE}`, ''];
  for (const [id, r] of Object.entries(report)) {
    lines.push(`## ${id}`);
    lines.push(`- console errors: ${r.consoleErrors.length ? r.consoleErrors.join(' | ') : 'none'}`);
    for (const [k, m] of Object.entries(r.metrics)) {
      const bad = [];
      if (m.overflow > 0) bad.push(`horizontal overflow ${m.overflow}px`);
      if (m.smallFonts.length) bad.push(`fonts<12px: ${m.smallFonts.length} (${m.smallFonts.slice(0, 4).join('; ')})`);
      if (m.smallTaps.length) bad.push(`taps<44: ${m.smallTaps.length} (${m.smallTaps.slice(0, 6).join('; ')})`);
      if (m.smallInputs.length) bad.push(`inputs<16px: ${m.smallInputs.join('; ')}`);
      lines.push(`- ${k}: ${bad.length ? bad.join(' | ') : 'OK'}`);
    }
    for (const n of r.notes) lines.push(`- note: ${n}`);
    lines.push('');
  }
  fs.writeFileSync(path.join(OUT, 'metrics.md'), lines.join('\n'));
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(report, null, 2));
  console.log('wrote', path.join(OUT, 'metrics.md'));
})();
