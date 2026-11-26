// Opened-project view: rendering, FLIP open/close, hash routing, focus management.
// Owner: Agent P. Contract: CONTRACT.md.
//
// Routing
//   #project/<slug>  -> open (or swap to) that project
//   anything else    -> closed
// Close button / Escape: history.back() if the project was opened by in-page
// navigation, otherwise replaceState to #projects and close.

const ROUTE = /^#project\/([\w-]+)\/?$/;
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const pad = (n) => String(n).padStart(2, '0');

/* ------------------------------------------------------------------ */
/* Small archival details                                              */
/* ------------------------------------------------------------------ */

const isSoon = (p) => p?.status === 'coming-soon';
const isPlaceholder = (v) => /^\s*\[/.test(String(v ?? ''));
const textOf = (html) => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').trim();

// Bracketed placeholder text is never shown.
const clean = (v) => (isPlaceholder(v) ? '' : String(v ?? '').trim());
function names(p) {
  return { code: clean(p.code), title: clean(p.title) };
}
// Tab / label text: "CODE // TITLE", or just the title when there is no code.
const tabText = (n) => (n.code ? `${n.code} // ${n.title}` : n.title);

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

// Largest variant from a srcset ("a.webp 2400w, b.webp 1600w"), for the lightbox.
function largest(img) {
  if (!img.srcset) return img.src;
  let best = { w: 0, url: img.src };
  String(img.srcset).split(',').forEach((part) => {
    const [url, d] = part.trim().split(/\s+/);
    const w = parseInt(d, 10) || 0;
    if (url && w > best.w) best = { w, url };
  });
  return best.url;
}

// `sizes` that match the rendered width: the layout share of the column
// (phones: the full column), capped at half the natural width / maxWidth.
// Column ~ 100vw - 56px on phones (inset + border + padding), ~ 100vw - 240px
// wider; bleed spans the paper (~ 100vw - 24px / - 92px).
const SHARE = { full: 1, wide: 0.667, half: 0.5, bleed: 1 };
function sizesFor(layout, cap) {
  const C = Math.max(1, Math.round(cap));
  const bleed = layout === 'bleed';
  const phoneOff = bleed ? 24 : 56;
  const share = SHARE[layout] || 1;
  const off = bleed ? 92 : 240;
  const vw = (x) => (x === 1 ? `calc(100vw - ${off}px)` : `calc((100vw - ${off}px) * ${x})`);
  return [
    `(max-width: ${Math.min(639, C + phoneOff)}px) calc(100vw - ${phoneOff}px)`,
    `(max-width: 639px) ${C}px`,
    `(max-width: ${Math.round(C / share + off)}px) ${vw(share)}`,
    `${C}px`,
  ].join(', ');
}

// Every image registers itself for the lightbox; returns the clickable <a><img></a>.
// blend 'multiply' (the default) lets her paper drop into the cream page.
function imgHTML(img, ctx, { sizes = '100vw', eager = false } = {}) {
  const n = ctx.gallery.length;
  const alt = clean(img.alt) || clean(img.caption) || ctx.title;
  ctx.gallery.push({ src: img.src, full: largest(img), alt, caption: clean(img.caption), w: img.width, h: img.height });
  const w = Number(img.width) || 1600;
  const h = Number(img.height) || 1000;
  const blend = img.blend === 'none' ? '' : ' class="is-multiply"';
  const srcset = img.srcset ? ` srcset="${esc(img.srcset)}" sizes="${esc(sizes)}"` : '';
  return `<a class="pv-zoom" href="${esc(largest(img))}" data-pv-zoom="${n}">
      <img${blend} src="${esc(img.src)}"${srcset} alt="${esc(alt)}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
      <span class="visually-hidden">(view full size)</span>
    </a>`;
}

// "B // Ground floor plan" -> code B + label; otherwise an automatic number.
function captionHTML(caption, auto) {
  const raw = clean(caption);
  if (!raw && !auto) return '';
  let code = auto || '';
  let label = raw;
  if (raw.includes('//')) {
    const [c, ...rest] = raw.split('//');
    code = c.trim();
    label = rest.join('//').trim();
  }
  return `<figcaption class="pv-figure__cap pv-mono">
      ${code ? `<span class="pv-figure__code">${esc(code)}</span>` : ''}
      ${code && label ? '<span class="pv-figure__sep" aria-hidden="true">//</span>' : ''}
      ${label ? `<span>${esc(label)}</span>` : ''}
      <span class="pv-figure__hint" aria-hidden="true">&middot; Tap to enlarge</span>
    </figcaption>`;
}

// A figure laid straight on the paper: no frame. Its width is the smallest of
// the layout share, half the image's natural width (crisp at 2x), its maxWidth,
// and a height cap, so the caption lines up with the image's own edge.
const LAYOUTS = ['full', 'bleed', 'wide', 'half'];
function figureHTML(b, ctx, { layout = 'full', align = 'left', eager = false, cls = '', rise = false } = {}) {
  const lay = LAYOUTS.includes(layout) ? layout : 'full';
  const al = align === 'right' ? 'right' : 'left';
  const w = Number(b.width) || 1600;
  const h = Number(b.height) || 1000;
  const mw = Number(b.maxWidth) > 0 ? `; --mw:${Number(b.maxWidth)}px` : '';
  // No blur: never wider than half the natural width (2x density).
  return `
    <figure class="pv-figure pv-figure--${lay} pv-figure--${al}${cls}"${rise ? ' data-pv-rise' : ''} style="--nw:${Math.round(w / 2)}px; --ar:${(w / h).toFixed(4)}${mw}">
      ${imgHTML(b, ctx, { sizes: sizesFor(lay, Math.min(w / 2, Number(b.maxWidth) > 0 ? Number(b.maxWidth) : Infinity)), eager })}
      ${clean(b.caption) ? captionHTML(b.caption) : ''}
    </figure>`;
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

const pdfInline = () => !window.matchMedia('(max-width: 767px), (hover: none) and (pointer: coarse)').matches;

function pdfHTML(b, ctx) {
  const placeholder = isPlaceholder(b.file);
  const title = clean(b.title) || 'Process document';
  const link = placeholder
    ? ''
    : `<a class="pv-pdf__link pv-mono" href="${esc(b.file)}" target="_blank" rel="noopener" download>Download PDF<span aria-hidden="true"> &darr;</span></a>`;
  const view = !placeholder && pdfInline()
    ? `<button type="button" class="pv-pdf__view pv-mono" data-pv-pdf="${esc(b.file)}" data-pv-pdf-title="${esc(title)}" aria-expanded="false">View process document</button>`
    : (!placeholder ? `<a class="pv-pdf__view pv-mono" href="${esc(b.file)}" target="_blank" rel="noopener">Open process document<span class="visually-hidden"> (PDF, opens in a new tab)</span></a>` : '');
  return `
    <section class="pv-pdf">
      <div class="pv-pdf__head">
        <h3 class="pv-pdf__title">${esc(title)}</h3>
        ${clean(b.caption) ? `<p class="pv-pdf__cap">${esc(clean(b.caption))}</p>` : ''}
      </div>
      <div class="pv-pdf__actions">${view}${link}</div>
      <div class="pv-pdf__frame" data-pv-pdf-frame hidden></div>
    </section>`;
}

function renderBlocks(p, ctx, skip = new Set()) {
  const blocks = (p.blocks || []).filter((b) => !skip.has(b));
  const out = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    if (b.type === 'text') {
      const body = b.html ? String(b.html) : String(b.body ?? '').split(/\n{2,}/).map((para) => `<p>${esc(para)}</p>`).join('');
      out.push(`
        <section class="pv-text">
          <div class="pv-text__label">
            ${clean(b.heading) ? `<h3 class="pv-text__heading">${esc(clean(b.heading))}</h3>` : ''}
          </div>
          <div class="pv-text__body">${body}</div>
        </section>`);
    } else if (b.type === 'image' && b.src) {
      out.push(figureHTML(b, ctx, { layout: b.layout || b.size, align: b.align }));
    } else if (b.type === 'drawings' && (b.items || []).length) {
      // Same varied layout as images: alternate half-left / wide-right.
      const title = clean(b.title);
      if (title) out.push(`<h3 class="pv-set-title pv-mono">${esc(title)}</h3>`);
      b.items.filter((it) => it && it.src).forEach((it, k) => {
        out.push(figureHTML(it, ctx, k % 2 ? { layout: 'wide', align: 'right' } : { layout: 'half', align: 'left' }));
      });
    } else if (b.type === 'pdf' && b.file) {
      out.push(pdfHTML(b, ctx));
    }
  }
  return out.join('');
}

function renderIndex(projects, self) {
  const rows = projects.filter((q) => q !== self && !isSoon(q)).map((q) => {
    const { code, title } = names(q);
    return `
    <li>
      <a class="pv-index__row" href="#project/${esc(q.slug)}" data-pv-link style="--swatch:${esc(q.colour)}">
        <span class="pv-index__swatch" aria-hidden="true"></span>
        <span class="pv-index__code pv-mono">${esc(code)}</span>
        <span class="pv-index__title">${esc(title)}</span>
        <span class="pv-index__go pv-mono" aria-hidden="true">Open&nbsp;&rarr;</span>
      </a>
    </li>`;
  }).join('');
  return `
    <section class="pv-index" aria-labelledby="pv-index-h">
      <h3 id="pv-index-h" class="visually-hidden">Projects</h3>
      <ol class="pv-index__list">${rows}</ol>
    </section>`;
}

// "Next file" runs through the published projects only (never CONTENTS or a
// coming-soon file) and loops from the last back to the first. CONTENTS's own
// next file is the first published project.
function nextFile(p, projects) {
  const chain = projects.filter((q) => !isSoon(q) && !q.index);
  if (!chain.length) return null;
  if (p.index) return chain[0];
  const i = chain.indexOf(p);
  const q = chain[(i + 1) % chain.length];
  return q === p ? null : q;
}

// Her statement, with the pull-quote (her own words, exactly) after the first
// paragraph, and any image block with `after: n` set straight after paragraph n.
// The statement is cut into runs around those images, so an image takes the
// column width rather than the statement's measure.
function statementHTML(p, ctx, inline) {
  if (!p.statement || !textOf(p.statement) || isPlaceholder(textOf(p.statement))) return '';
  const t = document.createElement('template');
  t.innerHTML = String(p.statement);
  const quote = clean(p.pullquote).replace(/^["“‘']+|["”’']+$/g, '').trim();
  const runs = [[]];
  let para = 0;
  [...t.content.childNodes].forEach((node) => {
    if (node.nodeType === 3 && !node.textContent.trim()) return;
    runs[runs.length - 1].push(node.outerHTML ?? esc(node.textContent));
    if (node.nodeName !== 'P') return;
    para += 1;
    if (para === 1 && quote) runs[runs.length - 1].push(`<blockquote class="pv-pullquote"><p>“${esc(quote)}”</p></blockquote>`);
    const here = inline.get(para);
    if (here?.length) {
      runs.push(here.map((b) => figureHTML(b, ctx, { layout: b.layout || b.size, align: b.align })).join(''));
      runs.push([]);
    }
  });
  if (para === 0 && quote) runs[runs.length - 1].push(`<blockquote class="pv-pullquote"><p>“${esc(quote)}”</p></blockquote>`);
  const out = runs.filter((r) => (Array.isArray(r) ? r.length : r));
  return out.map((r, i) => (Array.isArray(r)
    ? `<div class="pv-statement${i ? ' pv-statement--cont' : ''}${i < out.length - 1 ? ' pv-statement--split' : ''}" data-pv-rise>${r.join('')}</div>`
    : `<div class="pv-statement-media">${r}</div>`)).join('');
}

// Image blocks placed inside the statement (`after: n`), by paragraph number.
function inlineBlocks(p) {
  const paras = (String(p.statement || '').match(/<p[\s>]/g) || []).length;
  const map = new Map();
  (p.blocks || []).forEach((b) => {
    const n = Number(b.after);
    if (b.type === 'image' && b.src && Number.isInteger(n) && n >= 1 && n <= paras) {
      if (!map.has(n)) map.set(n, []);
      map.get(n).push(b);
    }
  });
  return map;
}

// A plain empty frame where an image will go: a thin rule, no text.
const emptyFrame = (cls = '') => `<div class="pv-empty${cls}" aria-hidden="true"></div>`;

function renderProject(p, projects, site) {
  const { code, title } = names(p);
  const ctx = { title, gallery: [] };
  const next = nextFile(p, projects);
  const nextN = next ? names(next) : null;
  const longest = Math.max(5, ...title.split(/\s+/).map((w) => w.length));
  const subtitle = clean(p.subtitle);

  const meta = (p.meta || []).filter((m) => clean(m.label) && clean(m.value)).map((m) => `
    <div class="pv-meta__item">
      <dt class="pv-mono">${esc(m.label)}</dt>
      <dd>${esc(m.value)}</dd>
    </div>`).join('');

  const hero = p.cover && p.cover.src
    ? figureHTML(p.cover, ctx, { layout: 'full', align: 'left', eager: true, cls: ' pv-hero', rise: true })
    : '';

  const inline = inlineBlocks(p);
  const statement = statementHTML(p, ctx, inline);
  const blocks = renderBlocks(p, ctx, new Set([...inline.values()].flat()));

  // Nothing to show yet: keep the page intentional with plain empty frames.
  const empty = !p.index && !hero && !blocks && !statement
    ? `<div class="pv-empties" data-pv-rise>${emptyFrame(' pv-empty--wide')}<div class="pv-empty-pair">${emptyFrame()}${emptyFrame()}</div></div>`
    : '';

  const html = `
    <header class="pv-bar">
      <span class="pv-bar__file" aria-hidden="true"></span>
      <button type="button" class="pv-close" data-pv-close>
        <span class="pv-close__arrow" aria-hidden="true">&larr;</span>
        <span>Projects</span>
        <span class="pv-close__x" aria-hidden="true"><kbd>Esc</kbd></span>
        <span class="visually-hidden">(close project)</span>
      </button>
    </header>

    <div class="pv-body">
      <div class="pv-head" data-pv-rise>
        <h2 class="pv-title" id="pv-title" tabindex="-1">
          ${code ? `<span class="visually-hidden">${esc(code)} </span>` : ''}
          <span class="pv-title__name" style="--pv-chars:${longest}">${esc(title)}</span>
        </h2>
        ${subtitle ? `<p class="pv-subtitle">${esc(subtitle)}</p>` : ''}
      </div>
      ${meta ? `<dl class="pv-meta" data-pv-rise>${meta}</dl>` : ''}
      ${hero}
      ${statement}
      ${p.index ? renderIndex(projects, p) : ''}
      ${blocks ? `<div class="pv-blocks">${blocks}</div>` : ''}
      ${empty}

      <footer class="pv-end">
        <div class="pv-end__nav">
          <button type="button" class="pv-end__back pv-mono" data-pv-close>&larr; Back to projects</button>
          ${next ? `<a class="pv-end__next" href="#project/${esc(next.slug)}" data-pv-link>
            <span class="pv-mono pv-muted">Next file</span>
            <span class="pv-end__next-title">${esc(nextN.title)} &rarr;</span>
          </a>` : ''}
        </div>
      </footer>
    </div>`;
  return { html, gallery: ctx.gallery };
}

/* ------------------------------------------------------------------ */
/* Paper lift                                                          */
/* ------------------------------------------------------------------ */

// Her scans sit on grey-ish paper (~#D8D9D4); multiply alone would leave a grey
// sheet on the cream. Measure each image's paper tone (the brightest 8% of a
// tiny copy) and lift it to white with a brightness filter on the img itself.
// White-paper plans measure ~1.0 and are left alone.
let liftCanvas = null;
function liftPaper(img) {
  if (!img.classList.contains('is-multiply') || img.dataset.lift || !img.naturalWidth) return;
  try {
    const n = 48;
    liftCanvas ||= document.createElement('canvas');
    liftCanvas.width = n; liftCanvas.height = n;
    const c = liftCanvas.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0, n, n);
    const d = c.getImageData(0, 0, n, n).data;
    const lum = [];
    for (let i = 0; i < d.length; i += 4) lum.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    lum.sort((a, b) => a - b);
    const paper = lum[Math.floor(lum.length * 0.92)] || 255;
    const lift = Math.min(1.3, Math.max(1, 250 / paper));
    img.style.setProperty('--lift', lift.toFixed(3));
    img.dataset.lift = lift.toFixed(3);
  } catch { /* cross-origin or decode issue: leave the image as it is */ }
}

/* ------------------------------------------------------------------ */
/* Controller                                                          */
/* ------------------------------------------------------------------ */

export function initProjectView(projects, site) {
  const view = document.querySelector('[data-project-view]');
  if (!view) return;
  const gsap = window.gsap;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Coming-soon projects live in the IN PROGRESS folder and cannot be opened.
  const bySlug = new Map(projects.filter((p) => !isSoon(p)).map((p) => [p.slug, p]));
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  view.innerHTML = `
    <div class="pv-backdrop" data-pv-backdrop></div>
    <div class="pv-panel" role="dialog" aria-modal="true" aria-labelledby="pv-title" data-pv-panel>
      <div class="pv-tab" aria-hidden="true" data-pv-tab><span></span></div>
      <div class="pv-scroll" data-pv-scroll></div>
      <div class="pv-skin" aria-hidden="true" data-pv-skin></div>
    </div>
    <dialog class="pv-lightbox" aria-label="Image viewer" data-lb>
      <div class="pv-lb__bar">
        <span class="pv-lb__count pv-mono" data-lb-count></span>
        <div class="pv-lb__tools">
          <button type="button" class="pv-lb__btn pv-mono" data-lb-zoom aria-pressed="false">Actual size</button>
          <button type="button" class="pv-lb__btn pv-lb__btn--icon" data-lb-prev aria-label="Previous image"><span aria-hidden="true">&larr;</span></button>
          <button type="button" class="pv-lb__btn pv-lb__btn--icon" data-lb-next aria-label="Next image"><span aria-hidden="true">&rarr;</span></button>
          <button type="button" class="pv-lb__btn pv-lb__close pv-mono" data-lb-close>Close <kbd aria-hidden="true">Esc</kbd></button>
        </div>
      </div>
      <div class="pv-lb__stage" data-lb-stage>
        <img class="pv-lb__img" alt="" data-lb-img>
      </div>
      <div class="pv-lb__info">
        <p class="pv-lb__cap pv-mono" data-lb-cap></p>
        <p class="pv-lb__alt" data-lb-alt></p>
      </div>
    </dialog>`;
  const backdrop = view.querySelector('[data-pv-backdrop]');
  const panel = view.querySelector('[data-pv-panel]');
  const tab = view.querySelector('[data-pv-tab]');
  const scroller = view.querySelector('[data-pv-scroll]');
  const skin = view.querySelector('[data-pv-skin]');
  const lb = view.querySelector('[data-lb]');
  scroller.addEventListener('load', (e) => { if (e.target.tagName === 'IMG') liftPaper(e.target); }, true);
  const lbImg = lb.querySelector('[data-lb-img]');
  const lbStage = lb.querySelector('[data-lb-stage]');
  const lbZoom = lb.querySelector('[data-lb-zoom]');

  let current = null;        // open project
  let busy = false;          // animation in flight
  let pending = false;       // a route change arrived during an animation
  let openedInPage = false;  // true if a folder/in-page link opened it (history has an entry to go back to)
  let returnFocus = null;
  let saved = null;          // page state to restore on close
  let inerted = [];
  let openScrollY = 0;       // page scroll when opened (restored on close)
  let closeRequested = false;
  let gallery = [];          // images of the open project, in page order (lightbox)
  let lbIndex = 0;
  let lbReturn = null;

  const folderFor = (slug) => document.querySelector(`.folder[data-slug="${CSS.escape(slug)}"]`);

  function applyTheme(p) {
    view.style.setProperty('--pv-folder', p.colour);
    view.style.setProperty('--pv-accent', p.accent);
    view.style.setProperty('--pv-folder-ink', p.ink);
    tab.firstElementChild.textContent = tabText(names(p));
    root.style.backgroundColor = p.accent;
    document.body.style.backgroundColor = p.accent;
    if (themeMeta) themeMeta.setAttribute('content', p.accent);
  }

  function fill(p) {
    closeLightbox({ restore: false });
    const out = renderProject(p, projects, site);
    scroller.innerHTML = out.html;
    gallery = out.gallery;
    scroller.querySelectorAll('img.is-multiply').forEach((img) => { if (img.complete) liftPaper(img); });
    scroller.scrollTop = 0;
  }

  function lockPage() {
    const gap = window.innerWidth - root.clientWidth;
    saved = {
      htmlBg: root.style.backgroundColor,
      bodyBg: document.body.style.backgroundColor,
      bodyPad: document.body.style.paddingRight,
      theme: themeMeta?.getAttribute('content'),
    };
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    root.classList.add('project-open');
    // Make everything outside the dialog inert (focus trap backstop + AT).
    inerted = [...document.body.children].filter((el) => el !== view && !el.inert && !/^(SCRIPT|STYLE|svg)$/i.test(el.tagName));
    inerted.forEach((el) => { el.inert = true; });
  }

  function unlockPage() {
    root.classList.remove('project-open');
    inerted.forEach((el) => { el.inert = false; });
    inerted = [];
    if (saved) {
      root.style.backgroundColor = saved.htmlBg;
      document.body.style.backgroundColor = saved.bodyBg;
      document.body.style.paddingRight = saved.bodyPad;
      if (themeMeta && saved.theme != null) themeMeta.setAttribute('content', saved.theme);
    }
    saved = null;
  }

  // Transform that maps the panel's resting box onto `rect`.
  function transformTo(rect) {
    const pr = panel.getBoundingClientRect();
    return {
      x: rect.left - pr.left,
      y: rect.top - pr.top,
      scaleX: rect.width / pr.width,
      scaleY: rect.height / pr.height,
    };
  }

  // The part of a folder not covered by the next one.
  function stripRect(folder) {
    const r = folder.getBoundingClientRect();
    const nextItem = folder.parentElement?.nextElementSibling;
    if (!nextItem) return r;
    const nx = nextItem.getBoundingClientRect();
    return window.matchMedia('(min-width: 1024px)').matches
      ? new DOMRect(r.left, r.top, Math.max(8, Math.min(r.width, nx.left - r.left)), r.height)
      : new DOMRect(r.left, r.top, r.width, Math.max(8, Math.min(r.height, nx.top - r.top)));
  }

  const visibleRect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;
    if (r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth) return null;
    return r;
  };

  /* ---------------- open ---------------- */

  function open(p, { fromFolder }) {
    busy = true;
    current = p;
    returnFocus = folderFor(p.slug);
    openScrollY = window.scrollY;
    lockPage();
    applyTheme(p);
    fill(p);
    view.hidden = false;

    const folder = fromFolder ? folderFor(p.slug) : null;
    // Start from the strip of the folder that is actually visible (on the
    // upright drawer most of its rect is hidden under its neighbours).
    const origin = visibleRect(folder) ? stripRect(folder) : null;
    const rise = scroller.querySelectorAll('[data-pv-rise], .pv-bar');
    const heading = scroller.querySelector('#pv-title');
    heading?.focus({ preventScroll: true });

    gsap.killTweensOf([panel, backdrop, skin, tab, scroller, ...rise]);
    const done = () => {
      busy = false;
      gsap.set([panel, ...rise], { clearProps: 'transform' });
      document.querySelectorAll('.folder.is-flipping').forEach((f) => f.classList.remove('is-flipping'));
      heading?.focus({ preventScroll: true });
      flush();
    };

    if (reduce.matches || !origin) {
      // Reduced motion: opacity only. No origin (direct load / offscreen folder): gentle rise.
      gsap.set(skin, { opacity: 0 });
      gsap.set(scroller, { opacity: 1 });
      const tl = gsap.timeline({ onComplete: done });
      tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out' }, 0);
      if (reduce.matches) {
        tl.fromTo([panel, tab], { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out' }, 0.05);
      } else {
        tl.fromTo(panel, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.05);
        tl.fromTo(tab, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.3);
      }
      return;
    }

    // FLIP: panel starts exactly on the folder, wearing the folder's face (skin),
    // then grows into place. Content is hidden while the shape is stretched.
    const from = transformTo(origin);
    folder.style.visibility = 'hidden';
    folder.classList.add('is-flipping');
    gsap.set(panel, { ...from, transformOrigin: '0 0', opacity: 1 });
    gsap.set(skin, { opacity: 1 });
    gsap.set(tab, { opacity: 0 });
    gsap.set(scroller, { opacity: 0 });

    const tl = gsap.timeline({ onComplete: done });
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0);
    tl.to(panel, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.8, ease: 'power3.inOut' }, 0);
    // Short blank-slab phase: tab and paper arrive while the shape is still settling.
    tl.to(tab, { opacity: 1, duration: 0.3 }, 0.45);
    tl.to(skin, { opacity: 0, duration: 0.3, ease: 'power1.inOut' }, 0.5);
    tl.set(scroller, { opacity: 1 }, 0.5);
    tl.fromTo(rise, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.06 }, 0.52);
  }

  /* ---------------- swap (project -> project while open) ---------------- */

  function swap(p) {
    busy = true;
    const prev = current;
    current = p;
    const fin = () => { busy = false; flush(); };
    if (prev) { const f = folderFor(prev.slug); if (f) f.style.visibility = ''; }
    const f = folderFor(p.slug);
    if (f) f.style.visibility = 'hidden';
    returnFocus = f;
    const tl = gsap.timeline({ onComplete: fin });
    tl.to(scroller, { opacity: 0, duration: reduce.matches ? 0.15 : 0.25, ease: 'power1.in' });
    tl.call(() => {
      applyTheme(p);
      fill(p);
      scroller.querySelector('#pv-title')?.focus({ preventScroll: true });
    });
    tl.to(scroller, { opacity: 1, duration: 0.35, ease: 'power1.out' });
  }

  /* ---------------- close ---------------- */

  function close() {
    if (!current) return;
    closeLightbox({ restore: false });
    busy = true;
    // Wait a frame: browsers may apply history scroll restoration around hashchange.
    requestAnimationFrame(closeNow);
  }

  function closeNow() {
    const p = current;
    const folder = folderFor(p.slug);
    if (Math.abs(window.scrollY - openScrollY) > 1) window.scrollTo({ top: openScrollY, behavior: 'instant' });

    // Bring the origin folder into view behind the overlay so we can fly back to it.
    if (folder && !reduce.matches) {
      const r = stripRect(folder);
      const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (r.height && shown < Math.min(r.height, window.innerHeight) * 0.5) {
        const target = window.scrollY + r.top - Math.max(0, (window.innerHeight - r.height) / 2);
        window.scrollTo({ top: Math.max(0, target), behavior: 'instant' });
      }
    }
    const target = reduce.matches ? null : visibleRect(folder);

    const finish = () => {
      view.hidden = true;
      gsap.set([panel, backdrop, skin, tab, scroller], { clearProps: 'all' });
      if (folder) { folder.style.visibility = ''; folder.classList.remove('is-flipping'); }
      scroller.innerHTML = '';
      unlockPage();
      current = null;
      busy = false;
      closeRequested = false;
      const back = returnFocus && document.contains(returnFocus) ? returnFocus : document.getElementById('projects');
      if (back) {
        if (back.id === 'projects' && !back.hasAttribute('tabindex')) back.setAttribute('tabindex', '-1');
        back.focus({ preventScroll: true });
      }
      returnFocus = null;
      flush();
    };

    gsap.killTweensOf([panel, backdrop, skin, tab, scroller]);
    const tl = gsap.timeline({ onComplete: finish });

    if (!target) {
      tl.to([panel, tab], { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0);
      if (!reduce.matches) tl.to(panel, { y: 30, duration: 0.3, ease: 'power1.in' }, 0);
      tl.to(backdrop, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 0.1);
      return;
    }

    gsap.set(panel, { transformOrigin: '0 0' });
    folder.classList.add('is-flipping');
    tl.to(scroller, { opacity: 0, duration: 0.18, ease: 'power1.in' }, 0);
    tl.to(tab, { opacity: 0, duration: 0.18 }, 0);
    tl.to(skin, { opacity: 1, duration: 0.2, ease: 'power1.in' }, 0);
    tl.to(panel, { ...transformTo(target), duration: 0.75, ease: 'power3.inOut' }, 0.16);
    tl.to(backdrop, { opacity: 0, duration: 0.55, ease: 'power2.inOut' }, 0.3);
  }

  /* ---------------- lightbox ---------------- */

  function showImage(i) {
    if (!gallery.length) return;
    lbIndex = (i + gallery.length) % gallery.length;
    const g = gallery[lbIndex];
    lbImg.removeAttribute('src');
    lbImg.alt = g.alt;
    if (g.w && g.h) { lbImg.width = g.w; lbImg.height = g.h; } else { lbImg.removeAttribute('width'); lbImg.removeAttribute('height'); }
    lbImg.src = g.full || g.src;
    const cap = String(g.caption || '').trim();
    lb.querySelector('[data-lb-count]').textContent = `${pad(lbIndex + 1)} / ${pad(gallery.length)}`;
    lb.querySelector('[data-lb-cap]').textContent = cap;
    const alt = lb.querySelector('[data-lb-alt]');
    alt.textContent = g.alt && g.alt !== cap ? g.alt : '';
    const single = gallery.length < 2;
    lb.querySelector('[data-lb-prev]').hidden = single;
    lb.querySelector('[data-lb-next]').hidden = single;
    setNatural(false);
    lbStage.scrollTo(0, 0);
  }

  function setNatural(on) {
    lbStage.classList.toggle('is-natural', on);
    lbZoom.setAttribute('aria-pressed', String(on));
    lbZoom.textContent = on ? 'Fit to screen' : 'Actual size';
  }

  function openLightbox(i, trigger) {
    if (!current || busy || lb.open) return;
    lbReturn = trigger || null;
    showImage(i);
    try { lb.showModal(); } catch { lb.setAttribute('open', ''); }
    lb.querySelector('[data-lb-close]').focus({ preventScroll: true });
    if (!reduce.matches) gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' });
  }

  function closeLightbox({ restore = true } = {}) {
    if (!lb.open) { lbReturn = restore ? lbReturn : null; return; }
    if (!restore) lbReturn = null;
    lb.close();
  }

  lb.addEventListener('close', () => {
    gsap.killTweensOf(lb);
    gsap.set(lb, { clearProps: 'opacity' });
    lbImg.removeAttribute('src');
    const back = lbReturn;
    lbReturn = null;
    if (back && document.contains(back) && current) back.focus({ preventScroll: true });
  });
  lb.addEventListener('click', (e) => {
    if (e.target.closest('[data-lb-close]')) { closeLightbox(); return; }
    if (e.target.closest('[data-lb-prev]')) { showImage(lbIndex - 1); return; }
    if (e.target.closest('[data-lb-next]')) { showImage(lbIndex + 1); return; }
    if (e.target.closest('[data-lb-zoom]') || e.target === lbImg) { setNatural(!lbStage.classList.contains('is-natural')); return; }
    if (e.target === lbStage || e.target === lb) closeLightbox(); // click on the dark surround
  });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' && gallery.length > 1) { e.preventDefault(); showImage(lbIndex + 1); }
    else if (e.key === 'ArrowLeft' && gallery.length > 1) { e.preventDefault(); showImage(lbIndex - 1); }
    else if (e.key === 'Tab') {
      const items = [...lb.querySelectorAll('button')].filter((b) => !b.hidden);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------- process PDF (loaded on request) ---------------- */

  function togglePdf(btn) {
    const box = btn.closest('.pv-pdf');
    const frame = box?.querySelector('[data-pv-pdf-frame]');
    if (!frame) return;
    const on = btn.getAttribute('aria-expanded') !== 'true';
    if (on && !frame.firstChild) {
      const file = btn.dataset.pvPdf;
      const obj = document.createElement('object');
      obj.type = 'application/pdf';
      obj.data = file;
      obj.title = btn.dataset.pvPdfTitle || 'Process document';
      obj.className = 'pv-pdf__object';
      obj.innerHTML = `<p class="pv-pdf__fallback">This browser can't show the PDF here. <a href="${esc(file)}" target="_blank" rel="noopener">Open the process document</a>.</p>`;
      frame.append(obj);
    }
    frame.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    btn.textContent = on ? 'Hide process document' : 'View process document';
  }

  /* ---------------- routing ---------------- */

  const slugFromHash = () => {
    const m = location.hash.match(ROUTE);
    return m ? decodeURIComponent(m[1]) : null;
  };

  function route({ initial = false } = {}) {
    if (busy) { pending = true; return; }
    const slug = slugFromHash();
    const p = slug ? bySlug.get(slug) : null;

    if (slug && !p) {
      // Unknown slug: drop it from the URL and make sure nothing is open.
      history.replaceState(null, '', '#projects');
      if (current) close();
      return;
    }
    if (p && current === p) return;
    if (p && current) { swap(p); return; }
    if (p) {
      openedInPage = !initial;
      open(p, { fromFolder: !initial });
      return;
    }
    if (current) close();
  }

  function flush() {
    if (!pending) return;
    pending = false;
    route();
  }

  function requestClose() {
    // Allowed mid-animation: the route change is queued and runs when the animation lands.
    if (!current || closeRequested) return;
    closeRequested = true;
    if (openedInPage && history.length > 1) {
      history.back(); // hashchange -> route() -> close()
      // Safety net if back() leaves us on a project hash (e.g. history quirk).
      setTimeout(() => { if (current && closeRequested && slugFromHash()) { history.replaceState(null, '', '#projects'); route(); } }, 1200);
    } else {
      history.replaceState(null, '', '#projects');
      route();
    }
  }

  window.addEventListener('hashchange', () => route());

  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-pv-close]')) { e.preventDefault(); requestClose(); return; }
    const zoom = e.target.closest('a[data-pv-zoom]');
    if (zoom && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      openLightbox(Number(zoom.dataset.pvZoom) || 0, zoom);
      return;
    }
    const pdf = e.target.closest('button[data-pv-pdf]');
    if (pdf) { togglePdf(pdf); return; }
    const link = e.target.closest('a[data-pv-link]');
    if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      // Moving between files replaces the entry, so Back/Close still returns to the folders.
      e.preventDefault();
      if (busy) return;
      history.replaceState(null, '', link.getAttribute('href'));
      route();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!current || lb.open) return; // the lightbox handles its own keys (Esc closes it first)
    if (e.key === 'Escape') { e.preventDefault(); requestClose(); return; }
    if (e.key !== 'Tab') return;
    const items = [...view.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!view.contains(active)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && (active === first || active.id === 'pv-title')) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  });

  // Direct load on #project/<slug>.
  route({ initial: true });
}
