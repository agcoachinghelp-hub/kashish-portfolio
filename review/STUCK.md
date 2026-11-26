# STUCK: review loop stopped at the round limit (6)

**Update:** the owner approved a round 7. Its fixes (kraft drawing levelled, phone bleed clipping, stale plan variant, iPhone SE whole-figure hero, paper whitening, duplicate swatch removed, Burra Pod text runs, CV order and stray fragment, Esc hash, In Progress affordance, tap-hint wrapping) are in commit 26fd636. Round 7 automated checks were clean on all 5 devices (no console errors, no overflow, no text under 12px, no tap target under 44px, navigation correct; Lighthouse mobile 98/100/100/100). The owner then froze the site for presentation before the round 7 review returned, so no gate verdict exists for round 7 and READY.json was not written. Remaining source-limited items below still apply.

The final independent review (round 6) still failed three gates. READY.json was not written.

| Gate | Round 6 | History (rounds 1-6) |
|---|---|---|
| G1 Content truth | PASS | F F P F F P |
| G2 Images | **FAIL** | F F F F F F |
| G3 Mobile hero | **FAIL** (iPhone SE only) | P P P P P F |
| G4 Mobile reading | **FAIL** (marginal, SE only) | F F F F P F |
| G5 Touch | PASS | all PASS |
| G6 Navigation | PASS | all PASS |
| G7 Design | PASS | F F P F F P |
| G8 Quality | PASS (Lighthouse mobile perf 88, a11y 100) | F P P P P P |
| G9 Safety | PASS (dist/ allowlist + Pages workflow) | all PASS |

Full round-6 report and screenshots: `review/round-6/`. Earlier rounds: `review/round-1` to `round-5` (each with `changes.md`).

## What is blocking, and why

### 1. Source resolution (G2 every round, G3 (e))
Every image comes from `her-portfolio-pages/`, 2000x1414 PNG renders of her PDF portfolio. Several drawings are small and soft inside those pages:
- cover sketch: ~850px wide for the whole figure, so 1.39x on a 3x iPhone at full width
- Common Grounds plans: low-resolution raster exports inside her pages
- Burra Pod collage: ~500px wide

No crop can add detail that isn't there. Every reviewer flags blur/compression at 3x. **Unblock:** her original files (high-resolution PDF export of the portfolio, the plan PDFs from Revit/AutoCAD, the scan of the cover sketch). The crop script (`scripts/crop-portfolio-pages.mjs`) and import script re-run in minutes once they exist.

### 2. Reviewers disagree on the same crops (G2)
Independent reviewers reversed each other round to round, so no single crop could satisfy all of them:
- **First-floor plan (page 11):** her ghosted "COMMON GROUNDS / CITY CENTRE" title covers the top half of the plan. Rounds 2 and 4 demanded the whole plan with the title; rounds 1, 3 and 5 demanded no baked title text (G2 rule). Round 6 asked for a crop that includes the bedrooms but avoids the title, which the page does not allow (the title sits over the bedrooms). **Unblock:** the first-floor plan without her title overlay (original file).
- **Burra Pod:** bands vs whole collage vs swatch detail flipped between rounds 3, 4 and 6.
- **Phone tabs, pull-quote, captions:** similar back-and-forth, now settled.

### 3. Open round-6 items not attempted (round limit reached)
Fixable without new files, listed for the next pass:
1. `contents/03.webp`: kraft-paper sheet reads as a solid orange rectangle (kraft doesn't multiply away). Re-cut on the sheet's own edges or level the kraft to white.
2. Ground floor plan on phones: "bleed" clips the left grid bubbles; use full column width on phones.
3. `common-grounds/05-480.webp` is a stale variant from an older, wider crop (the crop script only writes variants smaller than the master, and never deleted the old file). Delete it and rebuild.
4. iPhone SE hero: the short box trims the upper clasp. Use `object-fit: contain` (or a smaller name) below 700px tall.
5. `contents/01.webp`, `contents/02.webp`: faint grey paper patches. Apply the same `whitenPaper` step used for the collage.
6. `burra-pod/02.webp` (swatch detail) repeats the collage; content.json dims (515x211) don't match the file (440x202). Remove the block, and move the collage to `after: 2` on phones for the SE text run (G4).
7. CV: entries split across the page break ("Receptionist &" fragment) and run out of her order. Add `break-inside: avoid`, order as her resume.
8. Esc after a direct deep link leaves an empty hash instead of `#projects`.
9. Minor: basement crop tightness, desktop hero position, desktop half-column whitespace, In Progress folder hover lift, page tone vs her paper.

## Owner actions
- Confirm **Settings → Pages → Source = GitHub Actions** (otherwise the repo root is served, not `dist/`). This could not be checked from the build session.
- `CONTRACT.md` (internal build notes, no personal data) is in early git history; purge it or make the repo private if that matters.
