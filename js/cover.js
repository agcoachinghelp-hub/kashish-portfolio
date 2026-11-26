// Landing, Get in Touch, footer and nav state.
// export function initCover(site): fills [data-cover], [data-contact],
// [data-footer] and [data-site-name].

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// Placeholder values start with "[". They are shown as text so she
// can see what's missing, but never turned into a link.
const isPlaceholder = (v) => String(v ?? '').trim().startsWith('[');
const hasValue = (v) => String(v ?? '').trim() !== '';

// A link, or (for a placeholder or empty URL) the label as plain text.
function linkOrText(url, label, { cls = '', attrs = '' } = {}) {
  if (!hasValue(url) || isPlaceholder(url)) {
    return `<span class="${cls} is-placeholder">${esc(label)}</span>`;
  }
  return `<a class="${cls}" href="${esc(url)}" ${attrs}>${esc(label)}</a>`;
}

const isExternal = (url) => /^https?:\/\//i.test(String(url));

function fill(selector, html) {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = html;
  return el;
}

/* ---------- Landing ---------- */

// index.html ships the landing as static markup (name, title, about and the
// hero <picture>) so the hero image, the LCP, loads before any script runs.
// Here we bring that markup in line with content.json, patching in place so
// the already-loading image is kept and nothing jumps.

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

function nameHTML(site) {
  return String(site.name || '').trim().split(/\s+/).filter(Boolean)
    .map((w) => `<span class="cover__name-line">${esc(w)}</span>`).join(' ');
}

// "Architecture Portfolio": the last word is set in the script face.
function titleHTML(site) {
  const words = String(site.title || '').trim().split(/\s+/).filter(Boolean);
  const script = words.length > 1 ? words.pop() : '';
  return `${esc(words.join(' '))}${script ? ` <span class="cover__title-script">${esc(script)}</span>` : ''}`;
}

// Display width of the phone/iPad crop: full width on phones, 425px on iPad portrait.
const SIZES = '(max-width: 767px) 100vw, 425px';

const EMPTY_FRAME = `<div class="cover__figure cover__figure--empty" aria-hidden="true" data-cover-hero>
          <div class="cover__frame"></div>
        </div>`;

function heroHTML(hero) {
  if (!hero) return EMPTY_FRAME;
  const dims = (o) => (o && o.width && o.height ? ` width="${Number(o.width)}" height="${Number(o.height)}"` : '');
  const mobile = hero.mobile && hero.mobile.src ? hero.mobile : null;
  return `<figure class="cover__figure" data-cover-hero>
          <div class="cover__frame">
            <picture class="cover__picture">
              ${mobile ? `<source media="(max-width: 1023px)" srcset="${esc(mobile.srcset || mobile.src)}" sizes="${SIZES}"${dims(mobile)}>` : ''}
              <img class="cover__img${hero.blend === 'none' ? ' cover__img--plain' : ''}" src="${esc(hero.src)}" alt="${esc(hero.alt)}"${dims(hero)} fetchpriority="high" decoding="async">
            </picture>
          </div>
          ${hasValue(hero.caption) ? `<figcaption class="cover__caption t-code">${esc(hero.caption)}</figcaption>` : ''}
        </figure>`;
}

function coverHTML(site) {
  const about = norm(site.about);
  return `
    <div class="cover__inner" data-cover-inner>
      <div class="cover__strip">
        ${hasValue(site.edition) ? `<span class="t-label cover__edition">${esc(site.edition)}</span>` : ''}
      </div>
      <div class="cover__text">
        ${heroHTML(site.hero && site.hero.src ? site.hero : null)}
        <h1 class="cover__h1">
          <span class="cover__name" data-fit-name>${nameHTML(site)}</span>
          <span class="cover__title">${titleHTML(site)}</span>
        </h1>
        ${about ? `<div class="cover__about"><p class="cover__about-text">${esc(about)}</p></div>` : ''}
      </div>
    </div>`;
}

const toNode = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

// Set an attribute only when it differs, so a loading image isn't restarted.
function setAttr(el, name, value) {
  if (!el) return;
  if (value == null || value === '') { if (el.hasAttribute(name)) el.removeAttribute(name); return; }
  if (el.getAttribute(name) !== String(value)) el.setAttribute(name, value);
}

function syncHero(cover, site) {
  const hero = site.hero && site.hero.src ? site.hero : null;
  const current = cover.querySelector('[data-cover-hero]');
  const img = current && current.querySelector('.cover__img');
  if (!hero || !img) {
    // Swap between the empty frame and a real figure.
    const fresh = toNode(heroHTML(hero));
    if (current) current.replaceWith(fresh);
    return;
  }
  setAttr(img, 'src', hero.src);
  setAttr(img, 'alt', hero.alt || '');
  setAttr(img, 'width', hero.width);
  setAttr(img, 'height', hero.height);
  img.classList.toggle('cover__img--plain', hero.blend === 'none');
  const mobile = hero.mobile && hero.mobile.src ? hero.mobile : null;
  let source = current.querySelector('source');
  if (mobile) {
    if (!source) {
      source = document.createElement('source');
      img.parentElement.insertBefore(source, img);
    }
    setAttr(source, 'media', '(max-width: 1023px)');
    setAttr(source, 'srcset', mobile.srcset || mobile.src);
    setAttr(source, 'sizes', SIZES);
    setAttr(source, 'width', mobile.width);
    setAttr(source, 'height', mobile.height);
  } else if (source) {
    source.remove();
  }
  let cap = current.querySelector('.cover__caption');
  if (hasValue(hero.caption)) {
    if (!cap) { cap = document.createElement('figcaption'); cap.className = 'cover__caption t-code'; current.appendChild(cap); }
    cap.textContent = hero.caption;
  } else if (cap) cap.remove();
}

function renderCover(site) {
  const cover = document.querySelector('[data-cover]');
  if (!cover) return null;
  // Phone layout reads the crop's shape (height / width) from content.
  const m = site.hero && site.hero.mobile;
  if (m && m.width && m.height) cover.style.setProperty('--m-ratio', String(Number(m.height) / Number(m.width)));
  if (!cover.querySelector('[data-cover-inner]')) {
    cover.innerHTML = coverHTML(site);
    return cover;
  }

  // Patch the static markup.
  const strip = cover.querySelector('.cover__strip');
  if (strip && norm(strip.textContent) !== norm(site.edition)) {
    strip.innerHTML = hasValue(site.edition) ? `<span class="t-label cover__edition">${esc(site.edition)}</span>` : '';
  }
  const name = cover.querySelector('.cover__name');
  if (name && norm(name.textContent) !== norm(site.name)) name.innerHTML = nameHTML(site);
  const title = cover.querySelector('.cover__title');
  if (title && norm(title.textContent) !== norm(site.title)) title.innerHTML = titleHTML(site);

  syncHero(cover, site);

  const about = norm(site.about);
  let box = cover.querySelector('.cover__about');
  if (!about) { if (box) box.remove(); }
  else {
    if (!box) {
      box = toNode('<div class="cover__about"><p class="cover__about-text"></p></div>');
      cover.querySelector('.cover__text').appendChild(box);
    }
    const p = box.querySelector('.cover__about-text');
    if (norm(p.textContent) !== about) p.textContent = about;
  }
  return cover;
}

// Fit her name to the column: the longest word fills the width, capped by the
// viewport height so short, wide screens keep room for the rest of the landing.
// Measured once per font load from a hidden 100px copy (so measuring never
// changes the layout), and re-applied only when the container's WIDTH or the
// viewport size actually changes. CSS gives a container-query fallback.
function setupNameFit() {
  const el = document.querySelector('[data-fit-name]');
  const box = el && el.closest('.cover__h1');
  if (!el || !box) return;
  const words = [...el.querySelectorAll('.cover__name-line')].map((l) => l.textContent);
  if (!words.length) return;

  // Hidden measurer in the same type style; zero-size, so it takes no space.
  const probe = document.createElement('span');
  probe.className = 'cover__name-probe';
  probe.setAttribute('aria-hidden', 'true');
  probe.innerHTML = words.map((w) => `<span>${esc(w)}</span>`).join('');
  document.body.appendChild(probe);

  let em = 0;            // widest word at 100px
  let lastKey = '';
  let lastFs = '';
  let busy = false;

  const measure = () => {
    em = Math.max(...[...probe.children].map((c) => c.offsetWidth)); // offsetWidth ignores transforms
  };
  const apply = () => {
    if (busy) return;
    busy = true;
    const width = box.clientWidth;
    const key = `${width}x${window.innerHeight}`;
    if (width && em && key !== lastKey) {
      lastKey = key;
      const byWidth = (100 * width) / em;
      const wide = window.matchMedia('(min-width: 1024px)').matches;
      // Short phones (under 700px tall, e.g. iPhone SE): a smaller name leaves
      // room for more of the drawing above the fold.
      const shortPhone = window.matchMedia('(max-width: 767px)').matches && window.innerHeight < 700;
      const byHeight = shortPhone
        ? window.innerHeight * 0.06
        : (window.innerHeight * (wide ? 0.42 : 0.34)) / (words.length * 0.86);
      const fs = `${Math.floor(Math.min(byWidth, byHeight) * 0.995)}px`;
      if (fs !== lastFs) { lastFs = fs; el.style.setProperty('--name-fs', fs); }
    }
    busy = false;
  };

  measure();
  apply();
  // The font stylesheet loads without blocking, so the web font can arrive after
  // this runs: re-measure whenever a font finishes loading.
  const remeasure = () => { measure(); lastKey = ''; apply(); };
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(remeasure);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', remeasure);
  }

  let timer = 0;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(apply, 60); };
  // The container's width does not depend on the name's size, so this can't loop.
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(box);
  window.addEventListener('resize', schedule, { passive: true });
}

// Phones: the drawing should end at the fold, so CSS needs to know where it
// starts on the page (--m-top). That depends on the name's fitted size, so it
// is re-measured after the name fit, on width changes and when fonts load.
function setupPhoneHero() {
  const cover = document.querySelector('[data-cover]');
  if (!cover) return;
  const phone = window.matchMedia('(max-width: 767px)');
  let lastW = 0;
  const measure = (force) => {
    if (!phone.matches) return;
    if (!force && window.innerWidth === lastW) return;   // ignore toolbar-only resizes
    lastW = window.innerWidth;
    requestAnimationFrame(() => {
      const fig = cover.querySelector('[data-cover-hero]');
      if (!fig) return;
      let top = 0; let el = fig;
      while (el) { top += el.offsetTop; el = el.offsetParent; }   // layout position, ignores transforms
      const gap = parseFloat(getComputedStyle(cover).getPropertyValue('--m-gap')) || 12;   // breathing room above the fold
      cover.style.setProperty('--m-top', `${Math.round(top + gap)}px`);
    });
  };
  measure(true);
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(() => setTimeout(() => measure(true), 120));
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => setTimeout(() => measure(true), 120));
  }
  let t = 0;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => measure(false), 120); }, { passive: true });
}

/* ---------- Get in Touch ---------- */

function renderSocials(socials, cls, { showMissing = false } = {}) {
  const items = (socials || []).filter((s) => s && hasValue(s.label)).map((s) => {
    const ext = isExternal(s.url) ? 'target="_blank" rel="noopener"' : '';
    return `<li>${linkOrText(s.url, s.label, { cls, attrs: ext })}${
      showMissing && isPlaceholder(s.url) ? ` <span class="t-code is-placeholder">${esc(s.url)}</span>` : ''}</li>`;
  }).join('');
  return items ? `<ul class="${cls}-list" role="list">${items}</ul>` : '';
}

function renderContact(site) {
  const email = String(site.email || '').trim();

  fill('[data-contact]', `
    <h2 id="contact-heading" class="contact__title">Get in Touch</h2>
    ${hasValue(site.contactIntro) ? `<p class="contact__intro">${esc(site.contactIntro)}</p>` : ''}

    <dl class="contact__list">
      ${email ? `<div class="contact__row contact__row--email">
        <dt class="t-label">Email</dt>
        <dd>${isPlaceholder(email)
          ? `<span class="contact__email is-placeholder">${esc(email)}</span>`
          : `<a class="contact__email" href="mailto:${esc(email)}">${esc(email).replace('@', '<wbr>@')}</a>`}</dd>
      </div>` : ''}
      ${(site.socials || []).length ? `<div class="contact__row">
        <dt class="t-label">Elsewhere</dt>
        <dd>${renderSocials(site.socials, 'contact__social', { showMissing: true })}</dd>
      </div>` : ''}
    </dl>`);
}

// The static Netlify form in index.html is hidden by default (.is-off) and only
// shown when site.contactForm is true: the POST only works on Netlify. When it
// is on, this enhances it; without JS it posts normally and Netlify redirects
// back to /?sent=1#contact.
function setupContactForm(site) {
  const form = document.querySelector('[data-contact-form]');
  const status = document.querySelector('[data-form-status]');
  if (!form || !status) return;
  const section = form.closest('.contact');
  if (site.contactForm !== true) {
    form.remove();
    if (section) section.classList.remove('contact--with-form');
    return;
  }
  form.classList.remove('is-off');
  if (section) section.classList.add('contact--with-form');

  const email = String(site.email || '').trim();
  const fallback = () => {
    if (!email || isPlaceholder(email)) return 'Sorry, the message could not be sent. Please try again later.';
    return `Sorry, the message could not be sent. Please email me directly at <a href="mailto:${esc(email)}">${esc(email)}</a>.`;
  };
  const show = (state, html) => {
    status.dataset.state = state;
    status.innerHTML = html;
  };

  if (new URLSearchParams(window.location.search).get('sent') === '1') {
    show('ok', 'Thanks, your message has been sent.');
  }

  const button = form.querySelector('[type="submit"]');
  form.addEventListener('submit', async (event) => {
    if (typeof window.fetch !== 'function') return; // let the browser post it
    event.preventDefault();
    if (form.dataset.sending === '1') return;
    form.dataset.sending = '1';
    if (button) button.disabled = true;
    show('sending', 'Sending…');

    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      // Locally (python http.server) there is no Netlify, so this is a 501.
      if (!res.ok) throw new Error(`Form POST failed: ${res.status}`);
      form.reset();
      show('ok', 'Thanks, your message has been sent.');
    } catch (err) {
      console.warn(err.message || err);
      show('error', fallback());
    } finally {
      delete form.dataset.sending;
      if (button) button.disabled = false;
    }
  });
}

/* ---------- Footer ---------- */

function renderFooter(site) {
  const year = new Date().getFullYear();
  const cv = String(site.cvPdf || '').trim();

  fill('[data-footer]', `
    <p class="t-code site-footer__copy">© ${year} ${esc(site.name)}</p>
    ${cv && !isPlaceholder(cv)
      ? `<a class="btn-file t-label" href="${esc(cv)}" download>Download CV <span class="btn-file__ext">(PDF)</span></a>`
      : ''}
    <a class="site-footer__top-link t-label" href="#home">Back to top</a>`);
}

/* ---------- Motion ---------- */

// Scrubbed fade/scale as the landing leaves. The pieces are animated, never
// their shared wrapper: opacity/transform on a wrapper would isolate the hero
// and break its mix-blend-mode (the drawing's paper must multiply into the page).
function setupCoverScroll() {
  const { gsap } = window;
  const cover = document.querySelector('[data-cover]');
  if (!gsap || !window.ScrollTrigger || !cover) return;
  const text = [...cover.querySelectorAll('.cover__strip, .cover__h1, .cover__about')];
  const art = [...cover.querySelectorAll('.cover__img, .cover__figure--empty .cover__frame')];
  const parts = [...text, ...art];
  if (!parts.length) return;

  const mm = gsap.matchMedia();
  mm.add({ motion: '(prefers-reduced-motion: no-preference)', phone: '(max-width: 767px)' }, (ctx) => {
    if (!ctx.conditions.motion) return;
    const trigger = (end) => ({ trigger: cover, start: 'top top', end, scrub: true, invalidateOnRefresh: true });
    // Phones: the about text is what you read as the landing leaves, so it
    // isn't faded there; it simply scrolls away.
    const fading = ctx.conditions.phone ? text.filter((el) => !el.classList.contains('cover__about')) : text;
    if (fading.length) {
      gsap.fromTo(fading, { opacity: 1, scale: 1, yPercent: 0, transformOrigin: '0% 30%' },
        { opacity: 0, scale: 0.94, yPercent: 6, ease: 'none', immediateRender: false, scrollTrigger: trigger('bottom 20%') });
    }
    if (art.length) {
      // Same fade as desktop at every size. Phones keep scale 1, so the arm's
      // cut edge (which bleeds off the side) never comes into view.
      gsap.fromTo(art, { opacity: 1, scale: 1, transformOrigin: '100% 100%' },
        { opacity: 0, scale: ctx.conditions.phone ? 1 : 0.94, ease: 'none', immediateRender: false,
          scrollTrigger: trigger('bottom 20%') });
      // As soon as you scroll, the drawing's bottom cut fades (no hard line
      // above the folders).
      gsap.fromTo(art, { '--hero-cut': '100%' }, { '--hero-cut': '86%', ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: cover, start: 'top top', end: '+=120', scrub: true } });
    }
  });
  // Reduced motion: no scrub, no scale. A plain, untied fade as it leaves.
  mm.add('(prefers-reduced-motion: reduce)', () => {
    window.ScrollTrigger.create({
      trigger: cover,
      start: 'center top',
      onEnter: () => gsap.to(parts, { opacity: 0, duration: 0.3, overwrite: true }),
      onLeaveBack: () => gsap.to(parts, { opacity: 1, duration: 0.3, overwrite: true }),
    });
  });
}

function setupNavState() {
  const links = [...document.querySelectorAll('.site-nav__list a[href^="#"]')];
  const map = new Map();
  links.forEach((a) => {
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (target) map.set(target, a);
  });
  if (!map.size || !('IntersectionObserver' in window)) return;

  const visible = new Map();
  let current = null;
  const last = [...map.keys()].at(-1);

  function mark(el) {
    // At the very bottom the last section may never reach the reading line.
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const next = atEnd ? last : (el || current);
    if (next === current) return;
    current = next;
    links.forEach((a) => a.removeAttribute('aria-current'));
    if (current) map.get(current).setAttribute('aria-current', 'true');
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => visible.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
    let best = null; let bestRatio = 0;
    visible.forEach((ratio, el) => { if (ratio > bestRatio) { best = el; bestRatio = ratio; } });
    mark(best);
  }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.01, 0.25, 0.5, 0.75, 1] });

  map.forEach((_, el) => io.observe(el));
  window.addEventListener('scroll', () => { if (current !== last) mark(null); }, { passive: true });
}

// The nav wordmark repeats the giant name, so it stays hidden while the
// landing name is on screen and fades in once the name has scrolled past.
function setupNavMark() {
  const nav = document.querySelector('.site-nav');
  const name = document.querySelector('.cover__name');
  if (!nav) return;
  if (!name || !('IntersectionObserver' in window)) { nav.classList.remove('site-nav--mark-hidden'); return; }
  const navH = () => nav.offsetHeight || 52;
  let io;
  const watch = () => {
    if (io) io.disconnect();
    io = new IntersectionObserver(([e]) => {
      nav.classList.toggle('site-nav--mark-hidden', e.isIntersecting);
    }, { rootMargin: `-${navH()}px 0px 0px 0px`, threshold: 0 });
    io.observe(name);
  };
  watch();
}

export function initCover(site = {}) {
  document.querySelectorAll('[data-site-name]').forEach((el) => {
    el.textContent = site.name || el.textContent;
  });

  renderCover(site);
  renderContact(site);
  renderFooter(site);
  setupNameFit();
  setupPhoneHero();
  setupContactForm(site);
  setupCoverScroll();
  setupNavState();
  setupNavMark();
}
