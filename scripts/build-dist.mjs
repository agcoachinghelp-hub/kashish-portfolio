#!/usr/bin/env node
// Copies ONLY the public website into dist/ (an allowlist), so hosting never
// publishes source, tooling or private material (brief/, content/ sources,
// scripts/, cv/ data, her-portfolio-pages/, her-cv/, package files, docs).
// Run after `npm run build` (which regenerates content.json + css/tokens.css).
import { cp, rm, mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

// Everything the live site needs, and nothing else.
const PUBLIC = [
  'index.html',
  '404.html',
  'content.json',
  'css',
  'js',
  'vendor',
  'assets',
  'admin', // Decap CMS editor (reads/writes the repo through GitHub, not these files)
];

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const item of PUBLIC) {
  const src = path.join(ROOT, item);
  if (!existsSync(src)) { console.warn(`  (skipped missing ${item})`); continue; }
  await cp(src, path.join(DIST, item), { recursive: true });
}
// GitHub Pages: serve files as-is (no Jekyll processing).
await writeFile(path.join(DIST, '.nojekyll'), '');
await writeFile(path.join(DIST, 'robots.txt'), 'User-agent: *\nDisallow: /admin/\n');

// Safety check: fail if anything private slipped in.
const FORBIDDEN = [/^brief\//, /^her-/, /^scripts\//, /^content\//, /^cv\//, /^docs\//, /^review\//,
  /CONTRACT\.md$/, /package(-lock)?\.json$/, /cv-data\.json$/, /\.md$/, /node_modules/];
async function walk(dir, base = '') {
  const out = [];
  for (const name of await readdir(dir)) {
    const rel = base ? `${base}/${name}` : name;
    const full = path.join(dir, name);
    if ((await stat(full)).isDirectory()) out.push(...await walk(full, rel)); else out.push(rel);
  }
  return out;
}
const files = await walk(DIST);
const leaks = files.filter((f) => FORBIDDEN.some((re) => re.test(f)));
if (leaks.length) {
  console.error('dist/ contains files that must not be published:\n  ' + leaks.join('\n  '));
  process.exit(1);
}
console.log(`Built dist/: ${files.length} public files.`);
