// Landing, Get in Touch, footer and nav state.
// Owner: Agent R. Contract (CONTRACT.md): export function initCover(site).
// Fills [data-cover], [data-contact], [data-footer] and [data-site-name].

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// Placeholder values start with "[" (CONTRACT.md). They are shown as text so she
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

function renderCover(site) {
  const cover = document.querySelector('[data-cover]');
  if (!cover) return null;

  const nameLines = String(site.name || '').trim().split(/\s+/).filter(Boolean)
    .map((w) => `<span class="cover__name-line">${esc(w)}</span>`).join('');
  const hero = site.hero && site.hero.src ? site.hero : null;
  const study = [site.degree, site.university].filter(hasValue)
    .map((v) => `<span class="cover__study-part">${esc(v)}</span>`).join(' <span aria-hidden="true">·</span> ');
  const about = String(site.about || '').trim();

  // "Architecture Portfolio": the last word is set in the script face.
  const words = String(site.title || '').trim().split(/\s+/).filter(Boolean);
  const script = words.length > 1 ? words.pop() : '';
  const title = `${esc(words.join(' '))}${script ? ` <span class="cover__title-script">${esc(script)}</span>` : ''}`;

  const dims = (o) => (o && o.width && o.height ? ` width="${Number(o.width)}" height="${Number(o.height)}"` : '');
  const mobile = hero && hero.mobile && hero.mobile.src ? hero.mobile : null;
  // Phones get the square crop (centred on the hands) through <picture>.
  const picture = hero ? `<picture class="cover__picture">
            ${mobile ? `<source media="(max-width: 767px)" srcset="${esc(mobile.src)}"${dims(mobile)}>` : ''}
            <img class="cover__img${hero.blend === 'none' ? ' cover__img--plain' : ''}" src="${esc(hero.src)}" alt="${esc(hero.alt)}"${dims(hero)} loading="eager" fetchpriority="high" decoding="async">
          </picture>` : '';
  // No hero yet: an empty ruled frame holds its place (no generated drawing).
  const figure = hero ? `
        <figure class="cover__figure">
          <div class="cover__frame">${picture}</div>
          ${hasValue(hero.caption) ? `<figcaption class="cover__caption t-code">${esc(hero.caption)}</figcaption>` : ''}
        </figure>` : `
        <div class="cover__figure cover__figure--empty" aria-hidden="true">
          <div class="cover__frame"></div>
        </div>`;

  // Order in the markup = phone order (name, title, hero, degree, about).
  // From 768px up, CSS places the hero beside or below the text.
  cover.innerHTML = `
    <div class="cover__inner" data-cover-inner>
      <div class="cover__strip">
        ${hasValue(site.edition) ? `<span class="t-label cover__edition">${esc(site.edition)}</span>` : ''}
      </div>

      <div class="cover__text">
        <h1 class="cover__h1">
          <span class="cover__name" data-fit-name>${nameLines}</span>
          ${title ? `<span class="cover__title">${title}</span>` : ''}
        </h1>
        ${figure}
        ${study || about ? `<div class="cover__about">
          ${study ? `<p class="t-label cover__study">${study}</p>` : ''}
          ${about ? `<p class="cover__about-text">${esc(about)}</p>` : ''}
        </div>` : ''}
      </div>
    </div>`;
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
      const byHeight = (window.innerHeight * (wide ? 0.42 : 0.34)) / (words.length * 0.86);
      const fs = `${Math.floor(Math.min(byWidth, byHeight) * 0.995)}px`;
      if (fs !== lastFs) { lastFs = fs; el.style.setProperty('--name-fs', fs); }
    }
    busy = false;
  };

  measure();
  apply();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { measure(); lastKey = ''; apply(); });
  }

  let timer = 0;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(apply, 60); };
  // The container's width does not depend on the name's size, so this can't loop.
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(box);
  window.addEventListener('resize', schedule, { passive: true });
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
  const phone = String(site.phone || '').trim();
  const tel = phone.replace(/[^\d+]/g, '');

  fill('[data-contact]', `
    <span class="contact__tab" aria-hidden="true">Correspondence</span>
    <h2 id="contact-heading" class="contact__title">Get in Touch</h2>
    ${hasValue(site.contactIntro) ? `<p class="contact__intro">${esc(site.contactIntro)}</p>` : ''}

    <dl class="contact__list">
      ${email ? `<div class="contact__row contact__row--email">
        <dt class="t-label">Email</dt>
        <dd>${isPlaceholder(email)
          ? `<span class="contact__email is-placeholder">${esc(email)}</span>`
          : `<a class="contact__email" href="mailto:${esc(email)}">${esc(email).replace('@', '<wbr>@')}</a>`}</dd>
      </div>` : ''}
      ${phone ? `<div class="contact__row">
        <dt class="t-label">Phone</dt>
        <dd>${isPlaceholder(phone) || !tel
          ? `<span class="contact__phone is-placeholder">${esc(phone)}</span>`
          : `<a class="contact__phone" href="tel:${esc(tel)}">${esc(phone)}</a>`}</dd>
      </div>` : ''}
      ${(site.socials || []).length ? `<div class="contact__row">
        <dt class="t-label">Elsewhere</dt>
        <dd>${renderSocials(site.socials, 'contact__social', { showMissing: true })}</dd>
      </div>` : ''}
    </dl>`);
}

// Progressive enhancement for the static Netlify form in index.html. Without JS
// the form posts normally and Netlify redirects back to /?sent=1#contact.
function setupContactForm(site) {
  const form = document.querySelector('[data-contact-form]');
  const status = document.querySelector('[data-form-status]');
  if (!form || !status) return;

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
  const location = String(site.location || '').trim();

  fill('[data-footer]', `
    <div class="site-footer__top">
      <p class="site-footer__name">${esc(site.name)}</p>
      <a class="site-footer__top-link t-label" href="#home">Back to top</a>
    </div>
    <div class="site-footer__grid">
      <p class="t-code site-footer__copy">© ${year} ${esc(site.name)}</p>
      ${location ? `<p class="t-code site-footer__location${isPlaceholder(location) ? ' is-placeholder' : ''}">${esc(location)}</p>` : ''}
      ${renderSocials(site.socials, 'site-footer__social')}
      ${cv && !isPlaceholder(cv)
        ? `<a class="btn-file t-label" href="${esc(cv)}" download>Download CV <span class="btn-file__ext">(PDF)</span></a>`
        : ''}
    </div>`);
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
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: cover,
        // Phones: the landing is taller than the screen, so the text only
        // fades as its last lines (the about text) leave the top.
        start: ctx.conditions.phone ? 'bottom 45%' : 'top top',
        end: ctx.conditions.phone ? 'bottom 5%' : 'bottom 20%',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
    if (text.length) tl.fromTo(text, { opacity: 1, scale: 1, yPercent: 0, transformOrigin: '0% 30%' },
      { opacity: 0, scale: 0.94, yPercent: 6 }, 0);
    // Phones: the hero sits mid-screen, so it scrolls away unfaded (it must be seen).
    if (art.length && !ctx.conditions.phone) tl.fromTo(art, { opacity: 1, scale: 1, y: 0, transformOrigin: '100% 30%' },
      { opacity: 0, scale: 0.94, y: () => cover.offsetHeight * 0.06 }, 0);
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

export function initCover(site = {}) {
  document.querySelectorAll('[data-site-name]').forEach((el) => {
    el.textContent = site.name || el.textContent;
  });

  renderCover(site);
  renderContact(site);
  renderFooter(site);
  setupNameFit();
  setupContactForm(site);
  setupCoverScroll();
  setupNavState();
}
