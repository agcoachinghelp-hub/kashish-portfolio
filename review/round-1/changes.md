# Round 1 changes

Reviewer result: G1 FAIL, G2 FAIL, G3 PASS, G4 FAIL, G5 PASS, G6 PASS, G7 FAIL, G8 FAIL (perf 79), G9 PASS (check one setting).

| # | Sev | What was done |
|---|---|---|
| 1 | blocker | `admin/` is no longer published until `admin/config.yml` names a real repository (`scripts/build-dist.mjs` checks the `repo:` line). Internal agent/contract comments stripped from config.yml. The editor stays in the repo and switches on automatically once configured (Netlify). |
| 2 | blocker | Removed both captions she never wrote ("Precedent sketches", "Interior and elevation studies") from `content/projects/contents.md`. |
| 3 | blocker | **Partly disputed.** Her ghosted "COMMON GROUNDS / CITY CENTRE" title on page 11 is opaque (pixel value ~240 over the plan), so it fully hides the walls and rooms of the top half; "cleaning it out" would leave white holes in her plan. That half can only come from her original file. Fixed what can be fixed: the crop is now tight on the building (800x588, was a 1950x588 strip) so it reads on phone. Flagged for Kashish. |
| 4 | major | Hero cut edges: assigned (landing). Runs off right and bottom with square corners; the top cut fades into the paper with a mask; no rounding on cut sides. |
| 5 | major | iPad portrait hero: hands-centred crop placed with the name so the hands are on the first screen. |
| 6 | major | **Disputed.** `hero-mobile.webp` is 680px because that is all the resolution her page-01 scan has for that area; exporting it at 1000px would only upscale. It is shown at 334 CSS px, at or below natural/2 (340), which is the 2x standard used site-wide. A sharper 3x hero needs her original scan. |
| 7 | major | Site-wide rule: no image is displayed wider than naturalWidth / 2 CSS px (2x density), including bleed images. |
| 8 | major | Page-13 collage re-cropped to start below the separate "CLOSE-UP" sheet (top 98); paper slivers past the collage's right edge painted out. |
| 9 | major | `contents/02.webp`: paper white-pointed in the crop (levels) so the multiply removes it. |
| 10 | minor | `contents/01.webp` extended 40px down to include the temple base; column kept whole. |
| 11 | minor | Second floor crop tightened 60px right, 40px bottom (820x1130). |
| 12 | major | Plans reordered to her page order: Basement, Ground, First, Second. |
| 13 | minor | Lightbox on touch verified (full size, pinch-zoom). Ground floor stays bleed on phone. |
| 14 | major | Burra Pod collage split along its own diagonal gaps into three bands (river strips, material swatches, site photo strips), her pixels untouched, surround filled with her paper tone. River band after the meta, swatches after paragraph 2, site band at the end: no more than about one screen of text without an image. |
| 15 | major | Bands follow the diagonal gaps, so no straight cut runs through a strip or tile. |
| 16 | major | Meta now shows only Country (Durug Country); Site and Type rows that repeated the subtitle removed. "A / B / C" prefixes and the header CODE removed. |
| 17 | major | Fake barcode and "END OF FILE // CODE" line removed; single rule above Back / Next. |
| 18 | major | Axis City Centre moved to In Progress (status coming-soon) until she supplies drawings; page 07 has none. Next file now Burra Pod <-> Common Grounds. |
| 19 | major | In Progress folder sized to its content on phone/iPad portrait; on desktop no wider than the narrowest project folder. |
| 20 | major | Stacked tabs anchored to their own folder's top edge. |
| 21 | major | Desktop edge tabs moved to their own folder's edge (or dropped where ambiguous). |
| 22 | major | Gold inner border on closed CONTENTS and outline on closed last folder removed. |
| 23 | major | `grayscale(1)` removed from folder images; her colours kept. Folder strips now use 480px thumbnails. |
| 24 | major | Published projects numbered in order: Burra Pod CODE_001, Common Grounds CODE_002. In Progress items show no code. |
| 25 | blocker | Performance: hero `<picture>` static in index.html with fetchpriority/preload; fonts stylesheet non-blocking; four stylesheets merged into one minified `css/site.css` at dist build; 480px folder thumbnails; review server now gzips like GitHub Pages/Netlify. |
| 26 | minor | Folder link names now start with the visible title. |
| 27 | major | Contact form shown only when `site.contactForm` is true (Netlify); off on GitHub Pages, where the mailto and socials remain. Toggle in the editor. |
| 28 | minor | Space above Get in Touch on phone cut to 64-80px. |
| 29 | minor | "CORRESPONDENCE" tab removed; form ring and shadow removed. |
| 30 | minor | Nav wordmark hidden while the landing name is on screen; degree eyebrow line removed (her paragraph says it). |
| 31 | minor | Footer trimmed to © line, CV download, Back to top. |
| 32 | major | Repo ships `.github/workflows/pages.yml` that publishes only `dist/`. Requires the owner to set Settings → Pages → Source = "GitHub Actions" when pushing (noted for the final report; can't be changed from this session). |
| 33 | minor | **Not actionable.** No `reference/00` image was ever provided in any upload; G7 is judged on the gate text. |
