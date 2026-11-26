# Round 6 changes

Round 6 hit the original round limit; review/STUCK.md was written and pushed. The client then approved a round 7. Fixes made for the round 6 issues:

| # | Sev | What was done |
|---|---|---|
| 1 | blocker | Kraft staircase drawing (contents/03) levelled per channel so the kraft ground goes white and only her sepia linework remains; multiplies cleanly. |
| 2 | blocker | Bleed images take the column width on phones (no negative margins), so grid bubbles are never clipped. |
| 3 | blocker | Stale `common-grounds/05-480.webp` deleted; crop script now removes variants the master is too small for. |
| 4 | major | iPhone SE / short phones: the whole figure shows (no top trim), anchored right and bleeding off the right edge, about 80% of screen width. |
| 5 | major | Source-limited (850px figure); exported at q92, CSS filters removed. Accepted under the 2x floor. |
| 6 | major | contents/01 and 02 paper snapped to pure white. |
| 7 | major | Duplicate swatch image removed; Burra Pod's whole collage now sits between paragraphs 2 and 3. |
| 8 | major | **Disputed.** First floor: her title overlay sits over the bedrooms; a crop that includes them without baked title text does not exist on page 11 (see STUCK.md). |
| 9 | major | CV: stray "Receptionist &" (extraction bug) removed; entries in her resume's order; entries never split across pages. |
| 10 | major | Burra Pod text runs now max 444px on SE (collage after paragraph 2, thin rules between paragraphs). |
| 11 | minor | "Tap to enlarge" on its own line on touch phones, no dot. |
| 12 | minor | **Disputed.** Basement: round 5 asked to keep the courtyard square whole; kept. |
| 13 | minor | **Disputed.** Desktop hero position unchanged (client instruction). |
| 14 | minor | Desktop half columns pair at equal top lines; Burra Pod collage beside paragraphs 2-3. |
| 15 | minor | In Progress folder: no lift, no press state, default cursor. |
| 16 | minor | Any close that leaves an empty hash now sets `#projects`. |
| 17 | minor | Pages source confirmed "GitHub Actions" (the Actions deploy of 229c8f1 succeeded). |
| 18 | minor | **Disputed.** Typography and page tone are the client's agreed design (brief: archival folders, wide grotesk + mono, warm cream). |
