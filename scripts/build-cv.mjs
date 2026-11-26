#!/usr/bin/env node
// Builds the CV from its data file:
//   cv/cv-data.json  ->  cv/cv.html  (static, real text: what ATS and the PDF read)
//                    ->  cv/Kashish_Khera_CV.pdf  (A4, via Playwright/Chromium)
//                    ->  assets/cv.pdf  (the site's download link)
//
//   npm run cv                 build HTML + PDF
//   npm run cv -- --html-only  only regenerate cv/cv.html (no browser needed)
//   npm run cv -- --white      white paper in the PDF instead of cream (overrides meta.printPaper)
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CV = path.join(ROOT, 'cv');
const args = new Set(process.argv.slice(2));

const fail = (msg, hint) => { console.error(`\nCV build failed: ${msg}${hint ? '\n' + hint : ''}`); process.exit(1); };

// ---------------------------------------------------------------- render helpers
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const has = (s) => String(s ?? '').trim() !== '';
const t = esc;
// Count string values in the data that still contain a [bracketed] placeholder.
const countPlaceholders = (v) => (typeof v === 'string' ? (/\[[^\]]*\]/.test(v) ? 1 : 0)
  : v && typeof v === 'object' ? Object.entries(v).reduce((n, [k, x]) => n + (k === '_readme' ? 0 : countPlaceholders(x)), 0) : 0);
const isPlaceholder = (s) => /\[[^\]]*\]/.test(String(s ?? ''));
// Links only when the URL is real (a placeholder URL renders as plain text).
const link = (text, url) => (has(url) && !isPlaceholder(url) ? `<a href="${esc(url)}">${t(text)}</a>` : t(text));
const joinUrl = (base, hash) => `${String(base).replace(/\/+$/, '')}/${hash}`;

function section(id, n, title, body, extraClass = '') {
  if (!has(body)) return '';
  return `
    <section class="cv-section ${extraClass}" id="${id}" aria-labelledby="${id}-h">
      <h2 class="cv-h" id="${id}-h">${esc(title)}</h2>
      <div class="cv-body">${body}</div>
    </section>`;
}

const entry = ({ when, title, sub, text, bullets = [] }) => `
        <article class="cv-entry">
          <p class="cv-entry__when">${t(when)}</p>
          <div class="cv-entry__main">
            <h3 class="cv-entry__title">${title}</h3>
            ${has(sub) ? `<p class="cv-entry__sub">${t(sub)}</p>` : ''}
            ${has(text) ? `<p class="cv-entry__text">${t(text)}</p>` : ''}
            ${bullets.filter(has).length ? `<ul class="cv-list">${bullets.filter(has).map((b) => `<li>${t(b)}</li>`).join('')}</ul>` : ''}
          </div>
        </article>`;

const roleOrg = (role, org) => `${t(role)}${has(org) ? `<span class="cv-entry__org"><span class="sep">, </span>${t(org)}</span>` : ''}`;

// One-line dated rows: [{ when, html }]
const dated = (rows) => (rows.length ? `<ul class="cv-dated">${rows.map((r) => `
          <li><span class="cv-dated__when">${t(r.when)}</span><span class="cv-dated__main">${r.html}</span></li>`).join('')}</ul>` : '');

function render(d, { paper }) {
  const m = d.meta || {};
  let n = 0;
  const out = [];

  // Profile + key skills (keywords she can back up)
  const focus = d.focus?.items?.length
    ? `<p class="cv-focus"><span class="cv-label">${esc(d.focus.label || 'Key skills')}</span> ${d.focus.items.map(esc).join('<span class="sep"> · </span>')}</p>`
    : '';
  out.push(section('profile', ++n, 'Profile', has(d.profile) || focus ? `${has(d.profile) ? `<p class="cv-profile">${t(d.profile)}</p>` : ''}${focus}` : ''));

  // Education
  out.push(section('education', ++n, 'Education', (d.education || []).map((e) => entry({
    when: e.years,
    title: roleOrg(e.degree, e.institution),
    text: e.description,
    bullets: e.notes || [],
  })).join('')));

  // Selected projects (one line each; titles link to the site once meta.portfolioUrl is set)
  const projects = (d.projects || []).filter((p) => has(p.title)).map((p) => {
    const url = has(m.portfolioUrl) && has(p.slug) && !isPlaceholder(m.portfolioUrl) ? joinUrl(m.portfolioUrl, `#project/${p.slug}`) : '';
    const name = `${esc(p.title)}${has(p.subtitle) ? `<span class="cv-proj__sub"><span class="sep">, </span>${esc(p.subtitle)}</span>` : ''}`;
    return `
        <li class="cv-proj"><strong class="cv-proj__title">${url ? `<a href="${esc(url)}">${name}</a>` : name}</strong>${has(p.line) ? `<span class="sep"> - </span><span class="cv-proj__line">${t(p.line)}</span>` : ''}</li>`;
  }).join('');
  out.push(section('projects', ++n, 'Selected Projects', projects ? `<ul class="cv-projects">${projects}</ul>` : ''));

  // Experience: architecture / design first, then other
  const ex = d.experience || {};
  const group = (label, list) => (list || []).length ? `
        <h3 class="cv-sub">${esc(label)}</h3>${list.map((e) => entry({ when: e.dates, title: roleOrg(e.role, e.org), sub: e.location, bullets: e.bullets })).join('')}` : '';
  out.push(section('experience', ++n, 'Experience', group('', ex.architecture) + group('', ex.other)));

  // Exhibitions & awards
  out.push(section('exhibitions', ++n, 'Awards', dated((d.honours || []).filter((x) => has(x.kind) || has(x.title)).map((x) => ({
    when: x.date,
    html: `${t(has(x.title) ? x.title : x.kind)}${has(x.note) ? `<span class="cv-muted"><span class="sep">, </span>${t(x.note)}</span>` : ''}`,
  })))));

  // Skills (grouped; only what she actually uses)
  const skills = (d.skills || []).filter((g) => g.items?.length);
  out.push(section('skills', ++n, 'Skills', skills.length ? `<dl class="cv-skills">${skills.map((g) => `
          <div class="cv-skills__row"><dt>${esc(g.group)}</dt><dd>${g.items.map(esc).join('<span class="sep"> · </span>')}</dd></div>`).join('')}</dl>` : ''));

  // Certifications
  out.push(section('certifications', ++n, 'Certifications', dated((d.certifications || []).filter((c) => has(c.title)).map((c) => ({
    when: c.date,
    html: `${t(c.title)}${has(c.issuer) ? `<span class="cv-muted"><span class="sep">, </span>${t(c.issuer)}</span>` : ''}`,
  })))));

  // Community & coaching
  out.push(section('community', ++n, 'Community & Coaching', dated((d.community || []).filter((c) => has(c.role)).map((c) => ({
    when: c.dates,
    html: `${t(c.role)}${has(c.org) ? `<span class="cv-muted"><span class="sep">, </span>${t(c.org)}</span>` : ''}`,
  })))));

  // Languages
  const langs = (d.languages || []).filter((l) => has(l.language));
  out.push(section('languages', ++n, 'Languages', langs.length ? `<p>${langs.map((l) => `${t(l.language)}${has(l.level) ? ` <span class="cv-muted">(${t(l.level)})</span>` : ''}`).join('<span class="sep"> · </span>')}</p>` : ''));

  // References
  out.push(section('references', ++n, 'References', has(d.references) ? `<p>${t(d.references)}</p>` : ''));

  const contact = (d.contact || []).filter((c) => has(c.value)).map((c) => `
        <li><span class="cv-label">${esc(c.label)}</span> ${link(c.value, c.url || (c.label === 'Email' ? `mailto:${c.value}` : ''))}</li>`).join('');

  const tbcCount = countPlaceholders(d);

  return `<!doctype html>
<!-- GENERATED by scripts/build-cv.mjs from cv/cv-data.json - edit the JSON, not this file, then run \`npm run cv\`. -->
<html lang="en-AU" class="paper-${paper === 'white' ? 'white' : 'cream'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.name)} - CV</title>
<meta name="description" content="${esc(d.name)}: curriculum vitae. ${esc(d.headline || '')}">
<meta name="author" content="${esc(d.name)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="cv.css">
</head>
<body data-placeholders="${tbcCount}">
<main class="sheet">
  <header class="cv-head">
    <div class="cv-head__top">
      <p class="cv-label">Curriculum Vitae</p>
      ${has(m.archivalCode) ? `<p class="cv-label cv-code">${esc(m.archivalCode)}</p>` : ''}
    </div>
    <h1 class="cv-name">${esc(d.name)}</h1>
    ${has(d.headline) ? `<p class="cv-headline">${t(d.headline)}</p>` : ''}
    <ul class="cv-contact">${contact}
    </ul>
  </header>
${out.join('')}
  <footer class="cv-foot">
    <p class="cv-label">${esc(d.name)}</p>
    <p class="cv-label">${has(m.updated) ? `Updated ${t(m.updated)}` : ''}</p>
  </footer>
</main>
</body>
</html>
`;
}

// ---------------------------------------------------------------- PDF
async function loadChromium() {
  try { return (await import('playwright')).chromium; } catch {}
  const require = createRequire(import.meta.url);
  try { return require('playwright').chromium; } catch {}
  // Global install (npm i -g playwright) that ESM can't see.
  try {
    const { execSync } = await import('node:child_process');
    const g = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return createRequire(path.join(g, 'noop.js'))('playwright').chromium;
  } catch {}
  return null;
}

async function exportPdf(htmlPath, pdfPath) {
  const chromium = await loadChromium();
  if (!chromium) fail('Playwright is not installed, so the PDF could not be made (cv/cv.html was updated).',
    'Install it once with `npm i -g playwright && npx playwright install chromium`, or open cv/cv.html in Chrome and Print → Save as PDF (A4, margins: default, background graphics on).');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => ['Archivo', 'JetBrains Mono'].map((f) => [f, document.fonts.check(`12px "${f}"`)]));
    for (const [f, ok] of fonts) if (!ok) console.warn(`  ! font "${f}" did not load (offline?) - the PDF uses a fallback font`);
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    await writeFile(pdfPath, pdf);
    return (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------- main
async function main() {
  let data;
  try { data = JSON.parse(await readFile(path.join(CV, 'cv-data.json'), 'utf8')); }
  catch (e) { fail(`cv/cv-data.json could not be read: ${e.message}`, 'Check for a missing comma or quote near the line mentioned (a JSON validator like jsonlint.com helps).'); }

  const paper = args.has('--white') ? 'white' : (data.meta?.printPaper === 'white' ? 'white' : 'cream');
  const html = render(data, { paper });
  const htmlPath = path.join(CV, 'cv.html');
  await writeFile(htmlPath, html);
  const left = countPlaceholders(data);
  console.log(`Wrote cv/cv.html (${paper} paper).${left ? ` ${left} [bracketed] placeholder(s) still in cv-data.json.` : ''}`);
  if (args.has('--html-only')) return;

  const pdfPath = path.join(CV, 'Kashish_Khera_CV.pdf');
  const pages = await exportPdf(htmlPath, pdfPath);
  await mkdir(path.join(ROOT, 'assets'), { recursive: true });
  await copyFile(pdfPath, path.join(ROOT, 'assets/cv.pdf'));
  console.log(`Wrote cv/Kashish_Khera_CV.pdf (${pages} page${pages === 1 ? '' : 's'}) and copied it to assets/cv.pdf.`);
  if (pages > 2) console.warn('  ! The CV is longer than 2 pages - shorten some lines in cv/cv-data.json.');
  if (left) console.log('  Reminder: fill in or delete the [bracketed] placeholders before sending this CV out.');
}

main().catch((e) => fail(e.message));
