// Project folders: the archive drawer.
// Owner: Agent P. Contract: CONTRACT.md ("Folder DOM").
// Upright, overlapping files on wide screens; stacked landscape files below 1024px.
//
// DOM:  [data-folders role=list]
//         > .folder-item[role=listitem]      positioned slot (overlap maths)
//             > a.folder[data-slug]          the folder shape (rect = folder)
//         > .folder-item--group              coming-soon projects, collapsed into
//             > div.folder.folder--group     one non-interactive "IN PROGRESS" folder
//
// Upright: one folder is "expanded" (its face is visible). By default it is the
// first published project; hover/focus moves it. Folders after the expanded one
// slide right (transform only).

const UPRIGHT = window.matchMedia('(min-width: 1024px)');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
// Content may never show bracketed placeholder text.
const clean = (s) => (/^\s*\[/.test(String(s ?? '')) ? '' : String(s ?? '').trim());

/* ---------- colour ---------- */

function rgb(hex) {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(hex ?? '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
function lum(c) {
  const ch = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Tab = a shade off the face, in whichever direction keeps the small mono tab
// text at or above 4.5:1 (lighter for dark ink, darker for light ink).
export function tabColour(folder, ink) {
  const f = rgb(folder);
  const k = rgb(ink);
  if (!f || !k) return 'var(--folder)';
  const darkInk = lum(k) < 0.4;
  const toward = darkInk ? [255, 250, 240] : [0, 0, 0];
  let t = darkInk ? 0.16 : 0.18;
  let tab = mix(f, toward, t);
  while (contrast(tab, k) < 4.5 && t < 0.7) {
    t += 0.04;
    tab = mix(f, toward, t);
  }
  return toHex(tab);
}

/* ---------- content helpers ---------- */

const isSoon = (p) => p.status === 'coming-soon';

// First image of a project: its cover, else the first image / drawing.
export function firstImage(p) {
  if (p.cover && p.cover.src) return p.cover;
  for (const b of p.blocks || []) {
    if (b.type === 'image' && b.src) return b;
    if (b.type === 'drawings' && b.items?.[0]?.src) return b.items[0];
  }
  return null;
}

/* ---------- markup ---------- */

function titleHTML(title, extra = '') {
  const words = title.split(/\s+/).filter(Boolean);
  return `<span class="folder__title${extra}">${words.map((w) => `<span class="folder__word">${esc(w)}</span>`).join(' ')}</span>`;
}

// Stacked (phone) tabs show only the code; the title is on the face.
// A folder without a code (CONTENTS, IN PROGRESS) shows its title instead.
function tabHTML(code, title) {
  return code
    ? `<span class="folder__tab-text"><span class="folder__tab-code">${esc(code)}</span><span class="folder__tab-rest"> // ${esc(title)}</span></span>`
    : `<span class="folder__tab-text"><span class="folder__tab-code">${esc(title)}</span></span>`;
}

const styleVars = (p, i, t) => `--folder:${esc(p.colour)}; --accent:${esc(p.accent)}; --ink:${esc(p.ink)}; --i:${i}; --t:${t}; --tab:${tabColour(p.colour, p.ink)}`;
const lightInk = (p) => { const k = rgb(p.ink); return !!k && lum(k) > 0.4; };

function folderHTML(p, i, n) {
  const code = clean(p.code);
  const title = clean(p.title);
  const t = n > 1 ? (i / (n - 1)).toFixed(4) : 0;
  const img = firstImage(p);
  const last = i === n - 1;
  const classes = ['folder'];
  if (p.index) classes.push('folder--index');
  if (last) classes.push('folder--last');
  if (img) classes.push('folder--photo');
  if (lightInk(p)) classes.push('folder--dark');
  const subtitle = clean(p.subtitle);
  const label = (p.index ? `Open ${title}` : `Open project ${code} ${title}`).replace(/\s+/g, ' ');

  return `<div class="folder-item${p.index ? ' folder-item--index' : ''}${last ? ' folder-item--last' : ''}" role="listitem" style="--i:${i}; --t:${t}">
  <a class="${classes.join(' ')}" href="#project/${encodeURIComponent(p.slug)}"
      data-slug="${esc(p.slug)}" aria-label="${esc(label)}" style="${styleVars(p, i, t)}">
    <span class="folder__leaf" aria-hidden="true"></span>
    <span class="folder__tab" aria-hidden="true">${tabHTML(code, title)}</span>
    <span class="folder__face" aria-hidden="true">
      ${img ? `<span class="folder__photo"><img src="${esc(img.src)}" alt="" loading="lazy" decoding="async"></span>` : ''}
      <span class="folder__strip">
        <span class="folder__label">${titleHTML(title, p.index ? ' folder__title--index' : '')}</span>
      </span>
      <span class="folder__sheet">${subtitle ? `<span class="folder__sub">${esc(subtitle)}</span>` : ''}</span>
    </span>
  </a>
</div>`;
}

// Coming-soon projects: one quiet folder, not a link, not focusable.
function groupHTML(soon, i, n) {
  const p = soon[0];
  const t = n > 1 ? (i / (n - 1)).toFixed(4) : 0;
  const last = i === n - 1;
  const titles = soon.map((q) => clean(q.title)).filter(Boolean);
  return `<div class="folder-item folder-item--group${last ? ' folder-item--last' : ''}" role="listitem" style="--i:${i}; --t:${t}">
  <div class="folder folder--group${last ? ' folder--last' : ''}${lightInk(p) ? ' folder--dark' : ''}" style="${styleVars(p, i, t)}">
    <span class="visually-hidden">In progress: ${esc(titles.join(', '))}.</span>
    <span class="folder__leaf" aria-hidden="true"></span>
    <span class="folder__tab" aria-hidden="true">${tabHTML('', 'IN PROGRESS')}</span>
    <span class="folder__face" aria-hidden="true">
      <span class="folder__strip">
        <span class="folder__label">${titleHTML('IN PROGRESS')}</span>
      </span>
      <span class="folder__sheet">
        <span class="folder__list">${titles.map((x) => `<span>${esc(x)}</span>`).join('')}</span>
      </span>
    </span>
  </div>
</div>`;
}

/* ---------- title fitting ---------- */
// Every spine shares one type size (--title-fs). A title that does not fit its
// spine on one line breaks onto two; if two lines do not fit either, that title
// alone steps down to the largest size that fits.

const LH = 0.86; // folder title line-height

function splitTwo(widths, space) {
  let best = null;
  for (let k = 1; k < widths.length; k += 1) {
    const a = widths.slice(0, k).reduce((s, w) => s + w, 0) + space * (k - 1);
    const b = widths.slice(k).reduce((s, w) => s + w, 0) + space * (widths.length - k - 1);
    if (!best || Math.max(a, b) < best.max) best = { k, max: Math.max(a, b) };
  }
  return best;
}

function fitTitles(container) {
  const upright = UPRIGHT.matches;
  container.querySelectorAll('.folder').forEach((folder) => {
    const title = folder.querySelector('.folder__title');
    const label = folder.querySelector('.folder__label');
    if (!title || !label) return;
    const item = folder.parentElement;
    const twoLine = (on) => { folder.classList.toggle('folder--2l', on); item?.classList.toggle('folder-item--2l', on); };
    title.style.removeProperty('--fit-fs');
    twoLine(false);
    title.querySelectorAll('br').forEach((br) => br.remove());

    const fs = parseFloat(getComputedStyle(title).fontSize) || 24;
    const words = [...title.querySelectorAll('.folder__word')];
    const along = (el) => (upright ? el.getBoundingClientRect().height : el.getBoundingClientRect().width);
    const widths = words.map(along);
    const one = along(title);
    const space = words.length > 1 ? Math.max(0, (one - widths.reduce((s, w) => s + w, 0)) / (words.length - 1)) : 0;

    const lr = label.getBoundingClientRect();
    const L = upright ? lr.height : lr.width; // room along the line
    // Room across the lines. Stacked spines grow to take a second line
    // (folders.css: .folder-item--2l), so only the upright spine limits it.
    const T = upright ? lr.width : Infinity;

    if (one <= L + 0.5) return;
    const two = words.length > 1 ? splitTwo(widths, space) : null;
    if (two && two.max <= L + 0.5 && 2 * LH * fs <= T + 0.5) {
      words[two.k - 1].insertAdjacentHTML('afterend', '<br>');
      twoLine(true);
      return;
    }
    const s1 = Math.min(fs * (L / one), T / LH, fs);
    const s2 = two ? Math.min(fs * (L / two.max), T / (2 * LH), fs) : 0;
    if (s2 > s1) {
      words[two.k - 1].insertAdjacentHTML('afterend', '<br>');
      twoLine(true);
    }
    title.style.setProperty('--fit-fs', `${Math.floor(Math.max(s1, s2) * 0.98)}px`);
  });
}

/* ---------- expanded slot (upright) ---------- */

function expander(container) {
  const items = [...container.children];
  const interactive = items.filter((it) => it.querySelector('a.folder'));
  const firstProject = items.findIndex((it) => it.querySelector('a.folder:not(.folder--index)'));
  const fallback = firstProject >= 0 ? firstProject : 0;
  let current = -1;

  const set = (idx) => {
    if (idx === current) return;
    current = idx;
    items.forEach((it, i) => {
      it.style.setProperty('--open', i > idx ? 1 : 0);
      it.classList.toggle('is-open', i === idx);
    });
  };
  const indexOf = (el) => {
    const it = el?.closest?.('.folder-item');
    return it && interactive.includes(it) ? items.indexOf(it) : -1;
  };
  const rest = () => {
    const f = indexOf(document.activeElement);
    set(f >= 0 ? f : fallback);
  };

  // pointermove (not pointerenter): folders sliding under a still pointer must
  // not set off a chain of expansions.
  container.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || document.documentElement.classList.contains('project-open')) return;
    const i = indexOf(e.target);
    if (i >= 0) set(i);
  });
  container.addEventListener('pointerleave', rest);
  container.addEventListener('focusin', (e) => {
    const i = indexOf(e.target);
    if (i >= 0) set(i);
  });
  container.addEventListener('focusout', (e) => {
    if (!container.contains(e.relatedTarget) && !container.matches(':hover')) set(fallback);
  });
  set(fallback);
}

/* ---------- layout + motion ---------- */

function track(el) {
  let raf = 0;
  const set = () => {
    el.style.setProperty('--cw', `${el.clientWidth}px`);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => fitTitles(el));
  };
  set();
  if ('ResizeObserver' in window) new ResizeObserver(set).observe(el);
  else window.addEventListener('resize', set);
  UPRIGHT.addEventListener?.('change', set);
  // Refit once the display face has really loaded: fonts.ready can resolve
  // before the title font is even requested.
  document.fonts?.ready.then(set);
  document.fonts?.addEventListener?.('loadingdone', set);
  window.addEventListener('load', set, { once: true });
}

function reveal(container) {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return;
  // Animate the folders, not their slots: the slots carry the expand shift.
  const items = Array.from(container.querySelectorAll('.folder'));
  if (!items.length) return;
  // Landing straight on a project: the open view needs the folder visible now.
  if (/^#project\//.test(window.location.hash)) return;
  const section = container.closest('section') || container;
  const reduced = REDUCED.matches;

  container.classList.add('is-revealing');
  const done = () => container.classList.remove('is-revealing');

  gsap.from(items, {
    opacity: 0,
    y: reduced ? 0 : (UPRIGHT.matches ? 90 : 48),
    duration: reduced ? 0.5 : 1.1,
    ease: 'power3.out',
    stagger: reduced ? 0 : 0.08,
    clearProps: 'transform,opacity',
    onComplete: done,
    onInterrupt: done,
    scrollTrigger: { trigger: section, start: 'top 75%', once: true },
  });
}

export function renderFolders(projects = []) {
  const container = document.querySelector('[data-folders]');
  if (!container) return;
  const published = projects.filter((p) => !isSoon(p));
  const soon = projects.filter(isSoon);
  const n = published.length + (soon.length ? 1 : 0);
  container.setAttribute('role', 'list');
  container.style.setProperty('--n', n);
  container.style.setProperty('--gaps', Math.max(1, n - 2));
  container.innerHTML = published.map((p, i) => folderHTML(p, i, n)).join('')
    + (soon.length ? groupHTML(soon, published.length, n) : '');
  expander(container);
  track(container);
  try {
    reveal(container);
  } catch (err) {
    // Animation is decoration: never leave folders hidden.
    container.classList.remove('is-revealing');
    container.querySelectorAll('.folder').forEach((el) => { el.style.opacity = ''; el.style.transform = ''; });
    console.error(err);
  }
}
