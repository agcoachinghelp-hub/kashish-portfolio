#!/usr/bin/env node
// One-off: crops Kashish's real drawings/images out of her portfolio page PNGs
// (her-portfolio-pages/NN.png, 2000x1414) into web-ready WebP for the site.
// Temporary source until her original files come from Google Drive; then use
// scripts/import-project.mjs instead. Never upscales.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
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
  ['01', 'assets/site/hero.webp', { left: 1240, top: 150, width: 760, height: 1180 }, false],
  // Phone hero: 4:5, the whole figure (clasped hands + raised arm), 1000px native
  // (full sketch width, page edge on the right), between the perforation rows.
  // Phone hero: the whole figure, upper clasp to the clasped hands, between the
  // perforation rows and right of her printed date (no padding, nothing added).
  ['01', 'assets/site/hero-mobile.webp', { left: 1150, top: 70, width: 850, height: 1265 }, false],
  // Page 02 sketches: the perforation line slopes from y~45 (left) to y~125 (right).
  // 'dots' lifts the scan paper to white, then paints the band above that sloped line
  // white too, so both multiply away into the page cream; no sketch lies above it.
  ['02', 'assets/projects/contents/01.webp', { left: 0, top: 60, width: 1840, height: 600 }, true, 'dots'],
  ['02', 'assets/projects/contents/02.webp', { left: 0, top: 1105, width: 1460, height: 309 }, true, 'lift'],
  // Page 13: start below the separate "CLOSE-UP" sheet; paint out paper slivers past the collage's right edge.
  ['13', 'assets/projects/contents/03.webp', { left: 727, top: 98, width: 718, height: 1284 }, false, 'slivers'],
  // Burra Pod collage split into its three diagonal bands (river strips, material
  // swatches, site photo strips); everything outside a band is painted white so it
  // multiplies away. Polygons are in page-06 coordinates.
  ['06', 'assets/projects/burra-pod/01.webp', { left: 1000, top: 0, width: 530, height: 706 }, false, 'band:1'],
  ['06', 'assets/projects/burra-pod/02.webp', { left: 1000, top: 0, width: 530, height: 706 }, false, 'band:2'],
  ['06', 'assets/projects/burra-pod/03.webp', { left: 1000, top: 0, width: 530, height: 706 }, false, 'band:3'],
  ['08', 'assets/projects/common-grounds/01.webp', { left: 992, top: 141, width: 864, height: 675 }, false],
  // Plans: labels ("X Plan 1:100") cropped off and moved to captions; edges cut
  // through grid lines, clear of grid bubbles.
  // Basement: tight to the building and courtyard; bottom edge cuts through hatching, clear of bubbles.
  ['09', 'assets/projects/common-grounds/02.webp', { left: 110, top: 145, width: 680, height: 830 }, true],
  ['10', 'assets/projects/common-grounds/03.webp', { left: 48, top: 145, width: 1824, height: 1155 }, true],
  // First floor: below her ghosted "COMMON GROUNDS / CITY CENTRE" title (opaque; it hides the
  // top rooms, which only her original file can restore), tight on the building; the top
  // edge runs along the wall line at y~724 so it never cuts mid-room.
  ['11', 'assets/projects/common-grounds/04.webp', { left: 0, top: 722, width: 800, height: 578 }, true],
  ['12', 'assets/projects/common-grounds/05.webp', { left: 40, top: 180, width: 780, height: 1100 }, true],
];

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
    const lifted = await sharp(buf).linear([262 / r, 262 / g, 262 / b], [0, 0, 0]).png().toBuffer();
    img = sharp(lifted).trim({ background: '#ffffff', threshold: 10 });
  }
  if (fix === 'lift') {
    const { channels } = await sharp(page(n)).extract({ left: 1300, top: 700, width: 400, height: 200 }).stats();
    const [r, g, b] = channels.slice(0, 3).map((c) => c.mean);
    img = sharp(await img.png().toBuffer()).linear([252 / r, 252 / g, 252 / b], [0, 0, 0]);
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
    img = sharp(await img.png().toBuffer()).linear([250 / r, 250 / g, 250 / b], [0, 0, 0]);
    // Sloped line in page coords: (0, 78) -> (2000, 146); paint everything above it.
    const y0 = 78 - region.top, y1 = 146 - region.top, w = region.width;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${region.height}"><polygon points="0,0 ${w},0 ${w},${y1} 0,${y0}" fill="#ffffff"/></svg>`;
    img = sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]);
  }
  await (drawing ? img.webp({ quality: 90, nearLossless: true }) : img.webp({ quality: 82 }))
    .toFile(path.join(ROOT, out));
  const meta = await sharp(path.join(ROOT, out)).metadata();
  for (const w of [480, 960]) {
    if (meta.width > w * 1.15) await sharp(path.join(ROOT, out)).resize({ width: w }).webp({ quality: 80 }).toFile(path.join(ROOT, out.replace(/\.webp$/, `-${w}.webp`)));
  }
  console.log(`${n} -> ${out}  ${meta.width}x${meta.height}`);
}
