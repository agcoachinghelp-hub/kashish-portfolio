# Round 2 changes

Reviewer result: G1 FAIL, G2 FAIL, G3 PASS, G4 FAIL, G5 PASS, G6 PASS, G7 FAIL, G8 PASS (Lighthouse 100/100), G9 PASS (check Pages source).

Also applied this round (client requests, outside the review): phone hero redone as an edge-to-edge cover (1000x1250 4:5 crop of the whole figure, bottom fade at the drawing's own cut, load animation, same scrubbed scroll fade as desktop), then moved below the name per client.

| # | Sev | What was done |
|---|---|---|
| 1 | blocker | Burra Pod bands: paper and surround lifted to white in the crop (`linear` 252/paper), so the multiply leaves no box. |
| 2 | major | Folder covers use `srcset` (480w thumb + full) and are capped at naturalWidth/2; Burra Pod's 472px cover shows at most 236px, anchored to the spine and faded into the folder colour. |
| 3 | major | Phone/iPad hero re-exported at 1000x1250 (full sketch width; nothing larger exists on her page). iPad portrait capped at min(62vw, 500px) = within 2x. **Desktop hero disputed:** client instructed "desktop stays exactly as it is"; her page has no more resolution for that crop (760px). |
| 4 | major | **Partly disputed (second time).** Tried both a levels white-point and per-row infill to remove her ghost title from page 11; both destroy the plan (the title fully replaces walls and fills, nothing remains underneath). Applied the reviewer's stated fallback: the crop now starts exactly on the wall line at y~724, so it ends at a wall, not mid-room. Whole first floor needs her original file (listed for Kashish). |
| 5 | major | Basement tightened to 680x830 (keeps both left markers whole and the courtyard square; no lone section line across empty space). |
| 6 | minor | Second floor re-cropped from x=40, y=180 to y=1280 (inside the dashed boundary, no orphan arcs). |
| 7 | minor | Page-13 collage starts at x=727 (staircase drawing's edge); the cut handwritten scrap remnant painted out, so words are whole or gone. |
| 8 | minor | CONTENTS strip ends at x=1840, before the column capital. Phone alternate crop not added (minor; the strip opens full size in the lightbox). |
| 9 | major | Burra Pod swatches now `after: 1`; text runs between images fit one screen. |
| 10 | major | Capped images align to the text column's left edge with their captions; Burra Pod bands sit inline under their paragraphs on desktop. |
| 11 | minor | All plans and captions share one left edge; only the ground floor is bleed. |
| 12 | major | `.cover` gets `overflow: clip`; hero bottom fades on scroll at 1024-1366px; no hard edge under the header. |
| 13 | minor | Superseded by the client's phone hero redo. |
| 14 | minor | **Disputed.** `saturate(.85)` is the client's explicit spec for the hero. The lift is now measured per image. |
| 15 | major | Desktop/iPad-landscape vertical tabs restored: `CODE_00X // TITLE`, staggered heights, protruding from each folder's OWN left edge, folders overlapping. |
| 16 | major | iPad portrait: stacked folders tuck 40px under the next; nothing pokes out below the last folder (measured overhang <= 0). |
| 17 | minor | Phone tabs: CONTENTS tab blank, IN PROGRESS tab shows the file count; each word once. |
| 18 | minor | Common Grounds subtitle "City Centre" (her page 08). |
| 19 | minor | Pull-quote removed from Burra Pod content. |
| 20 | major | Invented `contactIntro` removed; nothing renders when empty. |
| 21 | minor | `admin/config.yml` repo set to the real repository; `/admin` is published only on Netlify builds (where its login works). |
| 22 | minor | CV profile now her Professional Summary sentences verbatim; key skills only from her "Professional Skills" lines; CV rebuilt. |
| 23 | minor | **Disputed** (same as 3): desktop hero kept as the client asked. |
| 24 | minor | Phone rendering branch deleted from cover.js; phone field removed from content and the editor. |
| 25 | minor | Root `.nojekyll` deleted. Pages source must be "GitHub Actions" (asked of the owner before the final push). Stale `wip/ios-pass-projects` branch will be deleted at push. |
| 26 | minor | "Tap to enlarge" shown in plan captions on touch devices. |
