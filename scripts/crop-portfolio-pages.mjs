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
  // Mobile hero: square, centred on the clasped hands, stopping above the perforations.
  ['01', 'assets/site/hero-mobile.webp', { left: 1130, top: 655, width: 680, height: 680 }, false],
  // Page 02 sketches: the perforation line slopes from y~45 (left) to y~125 (right).
  // 'dots' lifts the scan paper to white, then paints the band above that sloped line
  // white too, so both multiply away into the page cream; no sketch lies above it.
  ['02', 'assets/projects/contents/01.webp', { left: 0, top: 60, width: 2000, height: 560 }, true, 'dots'],
  ['02', 'assets/projects/contents/02.webp', { left: 0, top: 1105, width: 1460, height: 309 }, true],
  ['13', 'assets/projects/contents/03.webp', { left: 535, top: 10, width: 910, height: 1372 }, false],
  ['06', 'assets/projects/burra-pod/01.webp', { left: 1032, top: 5, width: 472, height: 702 }, false],
  ['08', 'assets/projects/common-grounds/01.webp', { left: 992, top: 141, width: 864, height: 675 }, false],
  // Plans: labels ("X Plan 1:100") cropped off and moved to captions; edges cut
  // through grid lines, clear of grid bubbles.
  // Basement: tight to the building and courtyard; bottom edge cuts through hatching, clear of bubbles.
  ['09', 'assets/projects/common-grounds/02.webp', { left: 110, top: 145, width: 722, height: 855 }, true],
  ['10', 'assets/projects/common-grounds/03.webp', { left: 48, top: 145, width: 1824, height: 1155 }, true],
  // First floor: below the ghosted "COMMON GROUNDS / CITY CENTRE" title and the y~665 grid bubble.
  ['11', 'assets/projects/common-grounds/04.webp', { left: 0, top: 712, width: 1950, height: 588 }, true],
  ['12', 'assets/projects/common-grounds/05.webp', { left: 0, top: 160, width: 880, height: 1170 }, true],
];

async function paperColour(n) {
  const { channels } = await sharp(page(n)).extract({ left: 1300, top: 700, width: 400, height: 200 }).stats();
  return channels.slice(0, 3).map((c) => Math.round(c.mean));
}

for (const [n, out, box, drawing, fix] of JOBS) {
  const region = box === 'sheet' ? await whiteSheetBox(n) : box;
  await mkdir(path.dirname(path.join(ROOT, out)), { recursive: true });
  let img = sharp(page(n)).extract(region);
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
  console.log(`${n} -> ${out}  ${region.width}x${region.height}`);
}
