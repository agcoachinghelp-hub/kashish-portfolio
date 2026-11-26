# Round 3 changes

Reviewer result: G1 PASS, G2 FAIL, G3 PASS, G4 FAIL, G5 PASS, G6 PASS, G7 PASS, G8 PASS (Lighthouse 99/100), G9 PASS (check Pages source).
Phone hero checks: (a) PASS, (b) FAIL, (c) PASS, (d) FAIL, (e) FAIL.

| # | Sev | What was done |
|---|---|---|
| 1 | blocker | Phone mask now fades both the top and bottom cuts; sides bleed off screen. |
| 2 | major | Phone hero re-cropped to the whole figure on page 01 (upper clasp, arm, clasped hands): 850x1265, no padding, nothing added. Box uses object-position bottom so any trim takes the top, never the hands. |
| 3 | major | Phone scroll: scale dropped below 768px (opacity fade only, same timing as desktop), so the bleeding cut edge never comes into view. |
| 4 | major | **Disputed.** Desktop hero: client instruction "desktop stays exactly as it is"; her page has no higher-resolution source (see note). |
| 5 | minor | Padding removed: the new crop is entirely her page. |
| 6 | blocker | **Disputed (source-limited).** The plans are displayed at no more than naturalWidth/2 (2x density) everywhere. Their softness is in her source: the plans are low-resolution raster exports embedded in her portfolio pages (soft on page 09-12 itself). A "3-4x re-export from her source" needs her original Revit/PDF exports, which are not in this repository. Requested from the owner. |
| 7 | major | Burra Pod collage region widened (x 1000-1530) so no band is cut by a vertical line; band 1 starts right of her "BURRA POD" title letters. |
| 8 | major | Same: band 3 now includes its whole strips; paper levelled to white (white point at the paper tone). |
| 9 | major | Paper around the swatches levelled to white (`linear` 262/paper), no grey box. |
| 10 | major | **Disputed (source-limited).** Burra Pod images are 490-530px in her page; enlarging them would break the no-blur rule. They sit inline in the text column. |
| 11 | major | **Disputed.** The aerial crop is exactly her rendered aerial plan's own rectangle on page 08 (x 992-1856, y 141-816); the cut labels and compass sit at the edge of her render as she exported it. |
| 12 | major | Full-bleed figure captions get inline padding. |
| 13 | minor | "Tap to enlarge" never wraps mid-phrase (nowrap; whole hint drops to its own line on phones if needed). |
| 14 | major | Page-13 collage: everything left of the staircase sheet's edge painted out at full height (no "RON" sliver, no notched outline). |
| 15 | major | iPad portrait gap cut to <= 80px (contact margin and projects padding between 768-1023px). |
| 16 | minor | Stacked CONTENTS tab now reads "INDEX" (not blank, and not a repeat of the face title, which round 2 flagged). |
| 17 | minor | Stacked folder subtitles can no longer show over another folder while animating. |
| 18 | minor | iPad portrait hero uses the full-figure crop at up to 425 CSS px (850/2), hands on the first screen. |
| 19 | minor | `CONTRACT.md` untracked (kept locally). `review/` stays tracked: the owner's process requires `review/round-N/changes.md` and `review/READY.json` in the repo. Pages source = GitHub Actions requested from the owner. |
| 20 | minor | **Disputed (source-limited)**, as 10. |
| 21 | minor | Every gallery, cover and folder image now ships 480w/960w variants with `srcset`/`sizes`. |

Note on resolution: every image comes from `her-portfolio-pages/` (2000x1414 renders of her PDF). Where a reviewer asks for more pixels than those pages contain, the fix is her original files, not a larger export of the same pages.
