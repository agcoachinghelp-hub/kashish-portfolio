// Entry point. Loads the compiled content (content.json, built from /content by
// scripts/build-content.mjs) and hands it to each module. See CONTRACT.md.
import { initCover } from './cover.js';
import { renderFolders } from './folders.js';
import { initProjectView } from './project.js';

// Deferred classic scripts and module scripts run in document order, so the
// GSAP globals exist by the time this module executes.
const { gsap, ScrollTrigger, Flip } = window;
gsap.registerPlugin(ScrollTrigger, Flip);

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

async function boot() {
  const res = await fetch('content.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load content.json');
  const data = await res.json();

  initCover(data.site);
  renderFolders(data.projects);
  initProjectView(data.projects, data.site);

  document.documentElement.classList.add('is-ready');
  ScrollTrigger.refresh();

  // The browser jumps to a section hash (e.g. #projects) before the landing above it
  // is rendered, so the section ends up lower than the jump. Re-apply it now.
  const target = location.hash && !location.hash.startsWith('#project/')
    ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant', block: 'start' }));
}

boot().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('afterbegin',
    '<p class="load-error">The portfolio could not load. Run <code>npm run build</code>, then open it through a local server (see README).</p>');
});
