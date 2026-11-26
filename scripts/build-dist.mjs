#!/usr/bin/env node
// Copies ONLY the public website into dist/ (an allowlist), so hosting never
// publishes source, tooling or private material (brief/, content/ sources,
// scripts/, cv/ data, her-portfolio-pages/, her-cv/, package files, docs).
// Run after `npm run build` (which regenerates content.json + css/tokens.css).
import { cp, rm, mkdir, writeFile, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

// Everything the live site needs, and nothing else.
const PUBLIC = [ // (admin/ is added below when configured)
  'index.html',
  '404.html',
  'content.json',
  'css',
  'js',
  'vendor',
  'assets',
];
// Decap CMS editor: published only once admin/config.yml names a real repository
// (it reads/writes the repo through GitHub; a placeholder repo can't work).
const adminCfg = existsSync(path.join(ROOT, 'admin/config.yml')) ? await readFile(path.join(ROOT, 'admin/config.yml'), 'utf8') : '';
const adminReady = /^\s*repo:\s*["']?[A-Za-z0-9-]+\/[A-Za-z0-9._-]+["']?\s*$/m.test(adminCfg);
// Its GitHub login runs through Netlify, so it is only published on Netlify builds
// (Netlify sets NETLIFY=true), or when forced with PUBLISH_ADMIN=1.
const onNetlify = process.env.NETLIFY === 'true' || process.env.PUBLISH_ADMIN === '1';
if (adminReady && onNetlify) PUBLIC.push('admin');
else console.log(`  (admin/ not published: ${adminReady ? 'editor login needs Netlify' : 'set repo: in admin/config.yml'})`);

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const item of PUBLIC) {
  const src = path.join(ROOT, item);
  if (!existsSync(src)) { console.warn(`  (skipped missing ${item})`); continue; }
  await cp(src, path.join(DIST, item), { recursive: true });
}
// One render-blocking stylesheet instead of four: merge in cascade order, strip
// comments and spare whitespace, and point index.html at it.
const CSS = ['css/tokens.css', 'css/base.css', 'css/folders.css', 'css/project.css'];
let merged = '';
for (const f of CSS) merged += (await readFile(path.join(ROOT, f), 'utf8')) + '\n';
merged = merged.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n+/g, '\n').replace(/[ \t]+\n/g, '\n');
await writeFile(path.join(DIST, 'css/site.css'), merged);
let html = await readFile(path.join(DIST, 'index.html'), 'utf8');
const linkRe = /\s*<link rel="stylesheet" href="css\/(tokens|base|folders|project)\.css">/g;
const count = (html.match(linkRe) || []).length;
if (count !== CSS.length) { console.error(`index.html: expected ${CSS.length} stylesheet links, found ${count}`); process.exit(1); }
let first = true;
html = html.replace(linkRe, () => (first ? ((first = false), '\n  <link rel="stylesheet" href="css/site.css">') : ''));
await writeFile(path.join(DIST, 'index.html'), html);
for (const f of CSS) await rm(path.join(DIST, f));

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
