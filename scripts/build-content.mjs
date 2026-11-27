#!/usr/bin/env node
// Compiles the editable content into what the site loads:
//   content/site.json + content/projects/*.md  ->  content.json
//   content/site.json colours/fonts            ->  css/tokens.css
// Runs on every Netlify deploy (see netlify.toml), and locally with `npm run build`.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { marked } from 'marked';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.join(ROOT, p);

// Decap stores uploads as "/assets/uploads/x.webp"; the site uses relative paths
// so it also works from a sub-folder (e.g. GitHub Pages).
const asset = (p) => (typeof p === 'string' ? p.trim().replace(/^\/+/, '') : '');
const str = (v) => (v == null ? '' : String(v));
const HEX = /^#[0-9a-f]{3,8}$/i;
const colour = (v, fallback) => (HEX.test(str(v).trim()) ? str(v).trim() : fallback);

const warnings = [];
const warn = (msg) => warnings.push(msg);

function parseFrontMatter(src, file) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) { warn(`${file}: no front-matter found`); return { data: {}, body: src }; }
  try {
    return { data: yaml.load(m[1]) || {}, body: m[2] };
  } catch (e) {
    throw new Error(`${file}: the settings block at the top is not valid YAML.\n${e.message}`);
  }
}

function image(obj, ctx) {
  if (!obj) return null;
  const src = asset(obj.image ?? obj.src);
  if (!src) return null;
  const alt = str(obj.alt).trim();
  if (!alt) warn(`${ctx}: image ${src} has no alt text`);
  const out = { src, alt, caption: str(obj.caption) };
  // How the image sits on the paper: 'multiply' drops its white/grey paper into the
  // cream (drawings, plans, sketches); 'none' for dark or photographic images.
  out.blend = obj.blend === 'none' ? 'none' : 'multiply';
  // Optional cap on display width in CSS px (e.g. low-resolution sources).
  const mw = Number(obj.maxWidth ?? obj.max_width);
  if (mw > 0) out.maxWidth = mw;
  // Small 480px variant (written by the crop/import scripts) for folder thumbnails.
  const th = src.replace(/\.webp$/, '-480.webp');
  if (th !== src && existsSync(rel(th))) out.thumb = th;
  const w = Number(obj.width), h = Number(obj.height);
  if (w > 0 && h > 0) { out.width = w; out.height = h; }
  // Responsive variants written by scripts/import-project.mjs: 01.webp -> 01-2400/1600/800.webp
  // Responsive variants (written by the import/crop scripts): name-480/-800/-960/-1600/-2400.webp,
  // plus the original at its natural width when known.
  const m = src.match(/^(.*)\.webp$/);
  if (m) {
    const set = [480, 800, 960, 1600, 2400].filter((v) => existsSync(rel(`${m[1]}-${v}.webp`)));
    if (set.length) {
      const parts = set.map((v) => `${m[1]}-${v}.webp ${v}w`);
      if (out.width && !set.includes(out.width)) parts.push(`${src} ${out.width}w`);
      out.srcset = parts.join(', ');
    }
  }
  return out;
}

function block(b, ctx) {
  switch (b?.type) {
    case 'image': {
      const img = image(b, ctx);
      if (!img) return null;
      // full = whole text column; bleed = to the panel edge; wide = two-thirds; half = one-half.
      const layout = ['full', 'bleed', 'wide', 'half'].includes(b.layout) ? b.layout : 'full';
      const align = b.align === 'right' ? 'right' : 'left';
      // Optional: place this image after statement paragraph N (1-based).
      const after = Number(b.after) > 0 ? Number(b.after) : undefined;
      // `size` kept for backwards compatibility with the first renderer.
      return { type: 'image', ...img, layout, align, ...(after ? { after } : {}), size: layout };
    }
    case 'drawings': {
      const items = (b.items || []).map((it) => image(it, ctx)).filter(Boolean);
      if (!items.length) return null;
      const columns = [1, 2, 3].includes(Number(b.columns)) ? Number(b.columns) : 2;
      return { type: 'drawings', title: str(b.title), columns, items };
    }
    case 'text':
      return { type: 'text', heading: str(b.heading), body: str(b.body), html: marked.parse(str(b.body)) };
    case 'pdf': {
      const file = asset(b.file);
      if (!file) return null;
      return { type: 'pdf', file, title: str(b.title) || 'Process document', caption: str(b.caption) };
    }
    default:
      warn(`${ctx}: unknown gallery block type "${b?.type}" was skipped`);
      return null;
  }
}

async function main() {
  const site = JSON.parse(await readFile(rel('content/site.json'), 'utf8'));
  const heroMobile = site.hero && site.hero.mobile ? image({ alt: site.hero.alt, ...site.hero.mobile }, 'site.json hero.mobile') : null;
  site.hero = image(site.hero, 'site.json hero') || null;
  if (site.hero && heroMobile) site.hero.mobile = heroMobile;
  site.outro = image(site.outro, 'site.json outro') || null;
  site.cvPdf = asset(site.cvPdf);
  site.socials = (site.socials || []).filter((s) => s && s.label);

  const dir = rel('content/projects');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  const projects = [];
  for (const file of files) {
    const { data: d, body } = parseFrontMatter(await readFile(path.join(dir, file), 'utf8'), file);
    if (d.draft === true || d.published === false) continue;
    const slug = str(d.slug || file.replace(/\.md$/, '')).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const status = d.status === 'coming-soon' ? 'coming-soon' : 'published';
    const ctx = `projects/${file}`;
    projects.push({
      slug,
      order: Number.isFinite(Number(d.order)) ? Number(d.order) : 999,
      index: d.index === true,
      // Kashish, 26 Nov: About Me lives in the top bar, not as a folder.
      tab: d.tab === true,
      status,
      code: str(d.code),
      title: str(d.title) || slug.toUpperCase(),
      subtitle: str(d.subtitle),
      colour: colour(d.colour, '#E9E2D2'),
      accent: colour(d.accent, '#3A3A35'),
      ink: colour(d.ink, '#2A2A26'),
      year: str(d.year),
      cover: image(d.cover, ctx),
      meta: (d.meta || []).filter((m) => m && m.label).map((m) => ({ label: str(m.label), value: str(m.value) })),
      statement: marked.parse(body.trim()),
      // Optional pull-quote: one of her own sentences from the statement, shown large
      // between paragraphs to break up long text on phones.
      pullquote: str(d.pullquote),
      blocks: (d.gallery || []).map((b) => block(b, ctx)).filter(Boolean),
    });
  }
  projects.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  // Guard: no bracketed placeholders may ship. Check every string value
  // (not the JSON syntax itself) for "[".
  const leaks = [];
  const walk = (v, where) => {
    if (typeof v === 'string') { if (/[\[\u2013\u2014]/.test(v)) leaks.push(`${where}: ${v.slice(0, 80)}`); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, where ? `${where}.${k}` : k);
  };
  walk(site, 'site');
  projects.forEach((p) => walk(p, `project "${p.slug}"`));
  if (leaks.length) {
    throw new Error(`Found ${leaks.length} bracketed placeholder(s) or long dashes. Replace [ ] placeholders, and use a plain hyphen - instead of long dashes, before publishing:\n` +
      leaks.map((l) => '  - ' + l).join('\n'));
  }

  await writeFile(rel('content.json'), JSON.stringify({ site, projects }, null, 2) + '\n');

  const c = site.colours || {};
  const f = site.fonts || {};
  const tokens = `/* GENERATED by scripts/build-content.mjs from content/site.json - do not edit by hand. */
:root {
  --bg: ${colour(c.background, '#CFC8BA')};
  --ink: ${colour(c.ink, '#2A2A26')};
  --cream: ${colour(c.cream, '#E9E2D2')};
  --slate: ${colour(c.slate, '#7E8CA3')};
  --kraft: ${colour(c.kraft, '#B08A5B')};
  --charcoal: ${colour(c.charcoal, '#1E1E1C')};
  --olive: ${colour(c.olive, '#4A5240')};
  --gold: ${colour(c.gold, '#B89B5E')};
  --font-display: '${str(f.display || 'Archivo').replace(/'/g, '')}', system-ui, sans-serif;
  --font-mono: '${str(f.mono || 'JetBrains Mono').replace(/'/g, '')}', ui-monospace, monospace;
}
`;
  await writeFile(rel('css/tokens.css'), tokens);

  console.log(`Built content.json: ${projects.length} projects (${projects.filter((p) => p.status === 'coming-soon').length} coming soon).`);
  for (const w of warnings) console.warn('  ! ' + w);
}

main().catch((e) => { console.error('\nBuild failed: ' + e.message); process.exit(1); });
