#!/usr/bin/env node
// One-off: crops Kashish's real drawings/images out of her portfolio page PNGs
// (her-portfolio-pages/NN.png, 2000x1414) into web-ready WebP for the site.
// Temporary source until her original files come from Google Drive; then use
// scripts/import-project.mjs instead. Never upscales.
import sharp from 'sharp';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = (n) => path.join(ROOT, 'her-portfolio-pages', `${n}.png`);

// Find the bounding box of the white drawing sheet on a coloured page.
async function whiteSheetBox(n, minX = 0) {
  const { data, info } = await sharp(page(n)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const rowHits = new Array(height).fill(0), colHits = new Array(width).fill(0);
  for (let y = 0; y < height; y++) for (let x = minX; x < width; x++) {
    const i = (y * width + x) * 3;
    if (data[i] > 238 && data[i + 1] > 238 && data[i + 2] > 238) { rowHits[y]++; colHits[x]++; }
  }
  const rows = rowHits.map((v, i) => (v > 150 ? i : -1)).filter((i) => i >= 0);
  const cols = colHits.map((v, i) => (v > 150 ? i : -1)).filter((i) => i >= 0);
  return { left: cols[0], top: rows[0], width: cols.at(-1) - cols[0] + 1, height: rows.at(-1) - rows[0] + 1 };
}

const JOBS = [
  // [page, output, box | 'sheet', drawing?]
  // Hero: tighter on the hands; the right edge is the page edge (bleeds off).
  ['01', 'assets/site/hero.webp', { left: 1150, top: 70, width: 850, height: 1265 }, false, 'tone'],
  // Phone hero: 4:5, the whole figure (clasped hands + raised arm), 1000px native
  // (full sketch width, page edge on the right), between the perforation rows.
  // Phone hero: the whole figure, upper clasp to the clasped hands, between the
  // perforation rows and right of her printed date (no padding, nothing added).
  ['01', 'assets/site/hero-mobile.webp', { left: 1150, top: 70, width: 850, height: 1265 }, false, 'tone'],
  // Page 02 sketches: the perforation line slopes from y~45 (left) to y~125 (right).
  // 'dots' lifts the scan paper to white, then paints the band above that sloped line
  // white too, so both multiply away into the page cream; no sketch lies above it.
  ['02', 'assets/projects/contents/01.webp', { left: 0, top: 60, width: 1840, height: 600 }, true, 'dots'],
  ['02', 'assets/projects/contents/02.webp', { left: 0, top: 1105, width: 1460, height: 309 }, true, 'lift'],
  // Page 13: start below the separate "CLOSE-UP" sheet; paint out paper slivers past the collage's right edge.
  ['13', 'assets/projects/contents/03.webp', { left: 758, top: 98, width: 647, height: 832 }, false, 'kraft'],
  // Burra Pod collage split into its three diagonal bands (river strips, material
  // swatches, site photo strips); everything outside a band is painted white so it
  // multiplies away. Polygons are in page-06 coordinates.
  ['06', 'assets/projects/burra-pod/01.webp', { left: 1000, top: 0, width: 530, height: 706 }, false, 'collage'],
  ['08', 'assets/projects/common-grounds/01.webp', { left: 992, top: 141, width: 864, height: 675 }, false],
  // Plans: labels ("X Plan 1:100") cropped off and moved to captions; edges cut
  // through grid lines, clear of grid bubbles.
  // Basement: tight to the building and courtyard; bottom edge cuts through hatching, clear of bubbles.
  ['09', 'assets/projects/common-grounds/02.webp', { left: 110, top: 145, width: 680, height: 852 }, true],
  ['10', 'assets/projects/common-grounds/03.webp', { left: 48, top: 145, width: 1824, height: 1155 }, true],
  // First floor: starts on the wall line at y~724, below her "COMMON GROUNDS / CITY CENTRE"
  // title overlay (which repeats the page heading and hides the top rooms).
  ['11', 'assets/projects/common-grounds/04.webp', { left: 0, top: 722, width: 800, height: 578 }, true],
  ['12', 'assets/projects/common-grounds/05.webp', { left: 290, top: 262, width: 460, height: 1010 }, true],
];

// Snap near-white, low-chroma pixels (lifted paper mottle) to pure white so multiply
// leaves no tint; coloured or darker pixels (her work) are untouched.
async function whitenPaper(buf) {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 3) {
    const mx = Math.max(data[i], data[i + 1], data[i + 2]), mn = Math.min(data[i], data[i + 1], data[i + 2]);
    if (mn >= 236 && mx - mn <= 14) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}

async function paperColour(n) {
  const { channels } = await sharp(page(n)).extract({ left: 1300, top: 700, width: 400, height: 200 }).stats();
  return channels.slice(0, 3).map((c) => Math.round(c.mean));
}

for (const [n, out, box, drawing, fix] of JOBS) {
  const region = box === 'sheet' ? await whiteSheetBox(n) : box;
  await mkdir(path.dirname(path.join(ROOT, out)), { recursive: true });
  let img = sharp(page(n)).extract(region);
  const sep1 = [[0,388],[118,388],[235,424],[355,462],[472,495],[590,532],[800,562]];
  const sep2 = [[0,568],[212,572],[240,604],[330,604],[355,636],[450,640],[472,668],[565,670],[590,703],[690,706],[800,712]];
  if (fix && fix.startsWith('band:')) {
    // Separators traced on a 1.5x view of page 06 offset by x=1000; convert to crop coords.
    const toCrop = ([vx, vy]) => [vx / 1.5 + 1000 - region.left, vy / 1.5 - region.top];
    const k = fix.split(':')[1];
    const W = region.width, H = region.height;
    let poly;
    if (k === '1') poly = [[45, -10], [800, -10], ...sep1.slice().reverse(), [45, 392]];
    if (k === '2') poly = [...sep1, ...sep2.slice().reverse()];
    if (k === '3') poly = [...sep2, [800, 1200], [0, 1200]];
    const pts = poly.map(toCrop).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    // Fill outside the band with her paper colour sampled right beside the collage,
    // so band and surround are one tone; the site's paper lift then whitens both.
    // Use the paper's bright-end tone (92nd percentile), matching how the site's
    // paper lift measures an image, so the fill lifts to white with the paper.
    const pr = await sharp(page(n)).extract({ left: 1540, top: 80, width: 200, height: 420 }).removeAlpha().raw().toBuffer();
    const pix = []; for (let i = 0; i < pr.length; i += 3) pix.push([pr[i], pr[i + 1], pr[i + 2]]);
    pix.sort((a, c) => a[0] + a[1] + a[2] - (c[0] + c[1] + c[2]));
    const [r, g, b] = pix[Math.floor(pix.length * 0.92)];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><path fill-rule="evenodd" fill="rgb(${r},${g},${b})" d="M0 0H${W}V${H}H0Z M${pts.split(' ').join(' L')} Z"/></svg>`;
    const buf = await sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
    // Lift paper (and the matching fill) to white so the multiply leaves no box.
    const lifted = await whitenPaper(await sharp(buf).linear([262 / r, 262 / g, 262 / b], [0, 0, 0]).png().toBuffer());
    img = sharp(lifted).trim({ background: '#ffffff', threshold: 10 });
  }
  if (fix === 'collage') {
    const pr = await sharp(page(n)).extract({ left: 1540, top: 80, width: 200, height: 420 }).removeAlpha().raw().toBuffer();
    const pix = []; for (let i = 0; i < pr.length; i += 3) pix.push([pr[i], pr[i + 1], pr[i + 2]]);
    pix.sort((a, c) => a[0] + a[1] + a[2] - (c[0] + c[1] + c[2]));
    const [r, g, b] = pix[Math.floor(pix.length * 0.92)];
    // her "BURRA POD / CONCEPT" title letters reach x~1027 on the left: paint that strip as paper
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${region.width}" height="${region.height}"><rect x="0" y="0" width="${1030 - region.left}" height="${300 - region.top}" fill="rgb(${r},${g},${b})"/></svg>`;
    const buf = await sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
    img = sharp(await whitenPaper(await sharp(buf).linear([262 / r, 262 / g, 262 / b], [0, 0, 0]).png().toBuffer())).trim({ background: '#ffffff', threshold: 10 });
  }
  if (fix === 'tone') {
    const pr = await sharp(page(n)).extract({ left: 1200, top: 300, width: 300, height: 400 }).removeAlpha().raw().toBuffer();
    const pix = []; for (let i = 0; i < pr.length; i += 3) pix.push([pr[i], pr[i + 1], pr[i + 2]]);
    pix.sort((a, c) => a[0] + a[1] + a[2] - (c[0] + c[1] + c[2]));
    const [r, g, b] = pix[Math.floor(pix.length * 0.85)];
    img = sharp(await whitenPaper(await img.modulate({ saturation: 0.85 }).linear([262 / r, 262 / g, 262 / b], [0, 0, 0]).png().toBuffer()));
  }
  if (fix === 'kraft') {
    // Her kraft paper multiplies to orange; level each channel so the kraft becomes
    // white and only the sepia linework remains (her drawing, ground removed).
    const raw = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const px = []; for (let i = 0; i < raw.data.length; i += 3) px.push([raw.data[i], raw.data[i + 1], raw.data[i + 2]]);
    px.sort((a, c) => a[0] + a[1] + a[2] - (c[0] + c[1] + c[2]));
    const [r, g, b] = px[Math.floor(px.length * 0.7)];
    const lev = await sharp(raw.data, { raw: raw.info }).linear([255 / r, 255 / g, 255 / b], [0, 0, 0]).png().toBuffer();
    img = sharp(await whitenPaper(await sharp(lev).modulate({ saturation: 0.7 }).png().toBuffer()));
  }
  if (fix === 'lift') {
    const { channels } = await sharp(page(n)).extract({ left: 1300, top: 700, width: 400, height: 200 }).stats();
    const [r, g, b] = channels.slice(0, 3).map((c) => c.mean);
    img = sharp(await whitenPaper(await sharp(await img.png().toBuffer()).linear([262 / r, 262 / g, 262 / b], [0, 0, 0]).png().toBuffer()));
  }
  if (fix === 'slivers') {
    // Paper slivers past the collage's right edge, and the remnant of a separate
    // handwritten scrap left of the staircase drawing (words would be cut mid-way).
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${region.width}" height="${region.height}"><rect x="${1403 - region.left}" y="${490 - region.top}" width="60" height="400" fill="#fff"/><rect x="0" y="0" width="${758 - region.left}" height="${region.height}" fill="#fff"/></svg>`;
    img = sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]);
  }
  if (fix && fix.startsWith('padbottom:')) {
    const extra = Number(fix.split(':')[1]);
    const pr = await sharp(page(n)).extract({ left: 1010, top: 1100, width: 140, height: 220 }).removeAlpha().raw().toBuffer();
    const pix = []; for (let i = 0; i < pr.length; i += 3) pix.push([pr[i], pr[i + 1], pr[i + 2]]);
    pix.sort((a, c) => a[0] + a[1] + a[2] - (c[0] + c[1] + c[2]));
    const [r, g, b] = pix[Math.floor(pix.length * 0.5)];
    img = sharp(await img.png().toBuffer()).extend({ bottom: extra, background: { r, g, b } });
  }
  if (fix === 'dots') {
    // Lift her grey scan paper to white first (a plain levels adjustment, line work
    // keeps its tone), so the painted band and the paper match exactly.
    const [r, g, b] = await paperColour(n);
    img = sharp(await whitenPaper(await sharp(await img.png().toBuffer()).linear([262 / r, 262 / g, 262 / b], [0, 0, 0]).png().toBuffer()));
    // Sloped line in page coords: (0, 78) -> (2000, 146); paint everything above it.
    const y0 = 78 - region.top, y1 = 146 - region.top, w = region.width;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${region.height}"><polygon points="0,0 ${w},0 ${w},${y1} 0,${y0}" fill="#ffffff"/></svg>`;
    img = sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]);
  }
  await (drawing ? img.webp({ quality: 90, nearLossless: true }) : img.webp({ quality: 92 }))
    .toFile(path.join(ROOT, out));
  const meta = await sharp(path.join(ROOT, out)).metadata();
  for (const w of [480, 960]) {
    const vf = path.join(ROOT, out.replace(/\.webp$/, `-${w}.webp`));
    if (meta.width <= w * 1.15) { await rm(vf, { force: true }); continue; }
    if (meta.width > w * 1.15) await sharp(path.join(ROOT, out)).resize({ width: w }).webp({ quality: 80 }).toFile(path.join(ROOT, out.replace(/\.webp$/, `-${w}.webp`)));
  }
  console.log(`${n} -> ${out}  ${meta.width}x${meta.height}`);
}
