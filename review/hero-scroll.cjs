// Phone hero check: stills at scroll 0/200/400/600 and an animated GIF of the
// load animation + scroll, for iPhone 15 and iPhone SE.
// Usage: node review/hero-scroll.cjs <outDir> [baseUrl]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUT = path.resolve(process.argv[2] || 'review/hero');
const BASE = (process.argv[3] || 'http://127.0.0.1:8970/').replace(/\/?$/, '/');
const DEVICES = [{ id: 'iphone15', w: 393, h: 852 }, { id: 'iphoneSE', w: 375, h: 667 }];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const d of DEVICES) {
    // Stills (deviceScaleFactor 3 like a real iPhone, to judge sharpness)
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(2200);
    for (const y of [0, 200, 400, 600]) {
      await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(700);
      await p.screenshot({ path: path.join(OUT, `${d.id}-scroll-${y}.png`) });
    }
    console.log(d.id, 'console errors:', errs.length ? errs : 'none');
    await ctx.close();

    // Recording: load animation, then a slow scroll down and back (frames -> GIF)
    const frames = path.join(OUT, `${d.id}-frames`); fs.mkdirSync(frames, { recursive: true });
    const c2 = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const q = await c2.newPage();
    await q.goto(BASE, { waitUntil: 'commit' });
    let i = 0;
    const grab = async () => q.screenshot({ path: path.join(frames, `f${String(i++).padStart(3, '0')}.png`) });
    for (let t = 0; t < 22; t++) { await grab(); await q.waitForTimeout(90); } // ~2s of load animation
    for (let y = 0; y <= 700; y += 25) { await q.evaluate((y) => window.scrollTo(0, y), y); await q.waitForTimeout(60); await grab(); }
    for (let t = 0; t < 6; t++) { await grab(); await q.waitForTimeout(90); }
    for (let y = 700; y >= 0; y -= 35) { await q.evaluate((y) => window.scrollTo(0, y), y); await q.waitForTimeout(60); await grab(); }
    await c2.close();
    const gif = path.join(OUT, `${d.id}-scroll.gif`);
    execSync(`ffmpeg -y -loglevel error -framerate 10 -i "${frames}/f%03d.png" -vf "fps=10,scale=${d.w}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" "${gif}"`);
    fs.rmSync(frames, { recursive: true, force: true });
    console.log('wrote', gif);
  }
  await b.close();
})();
