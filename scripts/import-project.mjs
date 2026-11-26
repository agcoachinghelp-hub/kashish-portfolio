#!/usr/bin/env node
// Turns a folder of raw project images into web-ready WebP files plus a project
// Markdown stub the site can build from.
//
//   node scripts/import-project.mjs <folder-of-raw-images> <slug> [--title "BURRA POD"] [--code CODE_001] [--force]
//   (or: npm run import -- <folder> <slug> ...)
//
// For every image, in natural filename order (1, 2 … 10):
//   assets/projects/<slug>/<nn>-2400.webp, <nn>-1600.webp, <nn>-800.webp  (never upscaled;
//       a smaller source gets the sizes that fit plus its native width)
//   assets/projects/<slug>/<nn>.webp          default `src` (1600px, or native if smaller)
//   assets/projects/<slug>/manifest.json      sizes, orientation and a ready-made srcset per image
// Then content/projects/<slug>.md is written if it doesn't exist (or with --force, after
// backing up the old one as <slug>.md.bak). If it exists, the gallery YAML is printed instead.
import { readdir, readFile, writeFile, mkdir, stat, copyFile, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIDTHS = [2400, 1600, 800];
const DEFAULT_W = 1600;
const QUALITY = 80;          // photos / renders
const DRAWING_QUALITY = 90;  // used if near-lossless isn't wanted (see encode())

// v1 palette, assigned round-robin by order: [folder colour, darker accent, ink].
const PALETTE = [
  ['#E9E2D2', '#6E6656', '#2A2A26'], // warm cream
  ['#7E8CA3', '#3B4659', '#1E2330'], // slate blue
  ['#B08A5B', '#5A4126', '#2B1F12'], // worn kraft
  ['#1E1E1C', '#0E0E0D', '#E9E2D2'], // charcoal
  ['#4A5240', '#252A1F', '#E4E0CF'], // deep olive
];

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.gif', '.heic', '.heif', '.avif']);

// ---------------------------------------------------------------- helpers
const c = process.stdout.isTTY
  ? { dim: (s) => `\x1b[2m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m`, red: (s) => `\x1b[31m${s}\x1b[0m`, yel: (s) => `\x1b[33m${s}\x1b[0m`, grn: (s) => `\x1b[32m${s}\x1b[0m` }
  : { dim: (s) => s, bold: (s) => s, red: (s) => s, yel: (s) => s, grn: (s) => s };

function fail(msg, hint) {
  console.error(`\n${c.red('Import failed:')} ${msg}`);
  if (hint) console.error(hint);
  process.exit(1);
}

const USAGE = `Usage:
  node scripts/import-project.mjs <folder-of-raw-images> <slug> [--title "BURRA POD"] [--code CODE_001] [--force]

  <folder>   folder with the project's images (jpg, png, webp, tif, gif …), named in order: 01, 02 … 10
  <slug>     short web name, lowercase with dashes, e.g. burra-pod  (the page becomes #project/burra-pod)
  --title    folder title shown on the site (default: the slug in capitals)
  --code     archive code (default: CODE_<order>, e.g. CODE_008)
  --force    overwrite an existing content/projects/<slug>.md (the old one is kept as .md.bak)`;

function parseArgs(argv) {
  const pos = [];
  const opts = { force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { console.log(USAGE); process.exit(0); }
    else if (a === '--force') opts.force = true;
    else if (a === '--title' || a === '--code') {
      const v = argv[++i];
      if (v == null || v.startsWith('--')) fail(`${a} needs a value.`, USAGE);
      opts[a.slice(2)] = v;
    } else if (a.startsWith('--title=')) opts.title = a.slice(8);
    else if (a.startsWith('--code=')) opts.code = a.slice(7);
    else if (a.startsWith('--')) fail(`unknown option ${a}`, USAGE);
    else pos.push(a);
  }
  if (pos.length !== 2) fail(pos.length < 2 ? 'missing the image folder and/or the slug.' : `too many arguments (${pos.join(' ')}). Put a title with spaces in quotes.`, USAGE);
  return { folder: pos[0], slug: pos[1], ...opts };
}

const exists = (p) => access(p).then(() => true, () => false);
const pad2 = (n) => String(n).padStart(2, '0');
const pad3 = (n) => String(n).padStart(3, '0');
const q = (s) => JSON.stringify(String(s)); // JSON strings are valid YAML double-quoted scalars
const kb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

// Line drawings / plans: few colours, mostly paper with dark linework, little saturation.
async function analyse(sharp, input) {
  const { data, info } = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize(160, 160, { fit: 'inside' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;
  const ch = info.channels;
  const colours = new Set();
  let light = 0, dark = 0, satSum = 0;
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i], g = data[i + 1] ?? r, b = data[i + 2] ?? r;
    colours.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum > 205) light++;
    else if (lum < 90) dark++;
    satSum += max === 0 ? 0 : (max - min) / max;
  }
  const lightF = light / px, darkF = dark / px, sat = satSum / px;
  const contrastF = lightF + darkF;
  const lowColour = colours.size < 260;
  const drawing = (lowColour && contrastF > 0.8) || (lightF > 0.6 && sat < 0.1 && contrastF > 0.75);
  return { drawing, colours: colours.size, light: lightF, sat };
}

function encode(pipeline, drawing) {
  // Near-lossless keeps thin linework crisp; it is large only for busy images, which aren't drawings.
  return drawing
    ? pipeline.webp({ nearLossless: true, quality: DRAWING_QUALITY, effort: 5 })
    : pipeline.webp({ quality: QUALITY, effort: 5, smartSubsample: true });
}

async function nextOrder(dir) {
  let max = 0;
  const files = (await exists(dir)) ? (await readdir(dir)).filter((f) => f.endsWith('.md')) : [];
  for (const f of files) {
    const m = (await readFile(path.join(dir, f), 'utf8')).match(/^order:\s*(\d+)/m);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function galleryYaml(images, indent = '') {
  return images.map((im, i) => {
    const layout = i === 0 ? 'bleed' : im.orientation === 'portrait' ? 'half' : 'full';
    return `${indent}  - { type: image, layout: ${layout}, image: ${q(im.src)}, alt: "[DESCRIBE IMAGE]", caption: ${q(`${im.nn} // [CAPTION]`)}, width: ${im.width}, height: ${im.height} }`;
  }).join('\n');
}

function stub({ slug, order, code, title, images }) {
  const [colour, accent, ink] = PALETTE[(order - 1 + PALETTE.length) % PALETTE.length];
  return `---
order: ${order}
code: ${code}
title: ${q(title)}
status: published
colour: "${colour}"
accent: "${accent}"
ink: "${ink}"
source: "Imported by scripts/import-project.mjs - replace every [BRACKETED] placeholder with her real details"
year: "[YEAR]"
cover:
  image: ${q(images[0].src)}
  alt: "[DESCRIBE IMAGE]"
meta:
  - { label: "Site", value: "[SITE]" }
  - { label: "Type", value: "[TYPE]" }
  - { label: "Year", value: "[YEAR]" }
  - { label: "Studio / Tutor", value: "[STUDIO / TUTOR]" }
gallery:
${galleryYaml(images)}
---

[STATEMENT - transcribe from her portfolio]
`;
}

// ---------------------------------------------------------------- main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.slug.toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    fail(`"${args.slug}" isn't a valid slug.`, 'Use lowercase letters, numbers and single dashes only, e.g. burra-pod or terrace-house.');
  }

  let sharp;
  try { sharp = (await import('sharp')).default; }
  catch { fail('the image library "sharp" is not installed.', 'Run `npm install` in the site folder, then try again.'); }
  sharp.cache(false);       // keep memory flat across many large files
  sharp.concurrency(2);

  const src = path.resolve(args.folder);
  let st;
  try { st = await stat(src); } catch { fail(`folder not found: ${src}`, 'Check the path. Tip: drag the folder into the terminal to paste its exact path.'); }
  if (!st.isDirectory()) fail(`${src} is a file, not a folder.`, 'Point the script at the folder that holds the images.');

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const entries = (await readdir(src, { withFileTypes: true })).sort((a, b) => collator.compare(a.name, b.name));
  const skipped = [];
  const candidates = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue; // .DS_Store etc.
    if (e.isDirectory()) { skipped.push([e.name + '/', 'sub-folder (not searched; move its images up a level to include them)']); continue; }
    const ext = path.extname(e.name).toLowerCase();
    if (!SUPPORTED.has(ext)) {
      const why = ext === '.pdf' ? 'PDF - export its pages as images, or add it as a `type: pdf` gallery block'
        : ext === '' ? 'no file extension' : `"${ext}" is not an image format this script reads`;
      skipped.push([e.name, why]);
      continue;
    }
    candidates.push(e.name);
  }
  if (!candidates.length) {
    if (skipped.length) for (const [n, why] of skipped) console.error(`  skipped ${n}: ${why}`);
    fail(`no usable images in ${src}.`, 'Supported: jpg, jpeg, png, webp, tif/tiff, gif (first frame), avif, and heic where your sharp build supports it.');
  }

  const outDir = path.join(ROOT, 'assets/projects', slug);
  const mdPath = path.join(ROOT, 'content/projects', `${slug}.md`);
  await mkdir(outDir, { recursive: true });

  // Clear files a previous import wrote (nn.webp / nn-w.webp), so a shorter re-import leaves no strays.
  const stale = (await readdir(outDir)).filter((f) => /^\d{2,3}(-\d+)?\.webp$/.test(f) || f === 'manifest.json');
  if (stale.length) {
    console.log(c.yel(`Replacing ${stale.length} previously generated file(s) in assets/projects/${slug}/`));
    for (const f of stale) await unlink(path.join(outDir, f));
  }

  console.log(`\n${c.bold('Importing')} ${candidates.length} image(s) from ${src}\n${c.dim('→')} assets/projects/${slug}/\n`);

  const images = [];
  const digits = candidates.length > 99 ? 3 : 2;
  for (const name of candidates) {
    const file = path.join(src, name);
    const nn = String(images.length + 1).padStart(digits, '0');
    const label = `[${nn}/${pad2(candidates.length)}] ${name}`;
    try {
      // `failOn: 'none'` tolerates slightly broken files; animated GIFs use their first frame.
      const meta = await sharp(file, { failOn: 'none' }).metadata();
      if (!meta.width || !meta.height) throw new Error('could not read image size');
      const swap = (meta.orientation ?? 1) >= 5; // EXIF 5-8 rotate 90°
      const width = swap ? meta.height : meta.width;
      const height = swap ? meta.width : meta.height;
      const { drawing } = await analyse(sharp, file);

      let widths = WIDTHS.filter((w) => w <= width);
      if (width < WIDTHS[0]) widths.push(width);
      widths = [...new Set(widths)].sort((a, b) => b - a);
      const defaultW = Math.min(DEFAULT_W, width);

      const sizes = [];
      let bytes = 0;
      for (const w of widths) {
        const out = path.join(outDir, `${nn}-${w}.webp`);
        // .rotate() with no angle = auto-orient from EXIF. sharp drops EXIF/XMP/ICC unless asked to keep it.
        const info = await encode(sharp(file, { failOn: 'none' }).rotate().resize({ width: w, withoutEnlargement: true }), drawing).toFile(out);
        sizes.push({ w: info.width, h: info.height, file: `assets/projects/${slug}/${nn}-${w}.webp` });
        bytes += info.size;
      }
      // Default src: a copy of the 1600 (or native) size, so the site's single `src` keeps working.
      await copyFile(path.join(outDir, `${nn}-${defaultW}.webp`), path.join(outDir, `${nn}.webp`));
      const def = sizes.find((s) => s.w === defaultW) ?? sizes[0];

      const im = {
        nn,
        original: name,
        src: `assets/projects/${slug}/${nn}.webp`,
        srcset: [...sizes].reverse().map((s) => `${s.file} ${s.w}w`).join(', '),
        width: def.w,
        height: def.h,
        nativeWidth: width,
        nativeHeight: height,
        orientation: height > width * 1.05 ? 'portrait' : width > height * 1.05 ? 'landscape' : 'square',
        type: drawing ? 'drawing' : 'photo',
        sizes: sizes.map((s) => s.w),
      };
      images.push(im);
      console.log(`  ${c.grn('✓')} ${label}  ${c.dim(`${width}×${height} ${im.orientation}, ${drawing ? 'drawing → near-lossless' : `photo → q${QUALITY}`}, ${im.sizes.join('/')}px, ${kb(bytes)}`)}`);
    } catch (e) {
      const ext = path.extname(name).toLowerCase();
      const why = ext === '.heic' || ext === '.heif' || /heif|heic|compression format/i.test(e.message)
        ? 'HEIC is not supported by this sharp build - export it as JPG (Photos: File → Export, or set iPhone Camera → Formats → Most Compatible)'
        : `could not be read (${e.message.split('\n')[0]})`;
      skipped.push([name, why]);
      console.log(`  ${c.red('✗')} ${label}  ${c.dim(why)}`);
    }
  }

  if (!images.length) fail('none of the images could be converted (see above).');

  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify({
    slug, generated: new Date().toISOString(), sourceFolder: path.basename(src),
    note: 'Generated by scripts/import-project.mjs. `src` is what the site uses; `srcset` is optional for responsive images.',
    images,
  }, null, 2) + '\n');

  // ---- Markdown stub
  const mdExists = await exists(mdPath);
  let mdAction;
  if (!mdExists || args.force) {
    if (mdExists) await copyFile(mdPath, mdPath + '.bak');
    const order = mdExists
      ? Number(((await readFile(mdPath, 'utf8')).match(/^order:\s*(\d+)/m) || [])[1]) || await nextOrder(path.dirname(mdPath))
      : await nextOrder(path.dirname(mdPath));
    const title = (args.title ?? slug.replace(/-/g, ' ')).toUpperCase();
    const code = args.code ?? `CODE_${pad3(order)}`;
    await mkdir(path.dirname(mdPath), { recursive: true });
    await writeFile(mdPath, stub({ slug, order, code, title, images }));
    mdAction = mdExists ? `rewritten (old version saved as content/projects/${slug}.md.bak)` : 'created';
  }

  // ---- Summary
  console.log(`\n${c.bold('Done.')} ${images.length} image(s) converted → assets/projects/${slug}/`);
  console.log(`  ${images.filter((i) => i.type === 'drawing').length} detected as drawings (near-lossless), ${images.filter((i) => i.type === 'photo').length} as photos (quality ${QUALITY}).`);
  if (skipped.length) {
    console.log(c.yel(`\nSkipped ${skipped.length} file(s):`));
    for (const [n, why] of skipped) console.log(`  - ${n}: ${why}`);
  }

  if (mdAction) {
    console.log(`\ncontent/projects/${slug}.md ${mdAction}.`);
    console.log(`\n${c.bold('Next steps')}`);
    console.log(`  1. Open content/projects/${slug}.md and replace every [BRACKETED] placeholder`);
    console.log('     (year, site, type, studio, alt text, captions, statement) with the real details.');
    console.log('  2. Run `npm run build`, then preview the site (`npm run dev`).');
  } else {
    console.log(`\ncontent/projects/${slug}.md already exists, so it was NOT changed (use --force to replace it).`);
    console.log('Paste this under `gallery:` in that file (and set `cover.image` if needed):\n');
    console.log('gallery:\n' + galleryYaml(images));
    console.log(`\n${c.bold('Next step:')} run \`npm run build\`.`);
  }
}

main().catch((e) => fail(e.message));
