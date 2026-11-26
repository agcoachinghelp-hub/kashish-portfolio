# Round 4 changes

Reviewer result: G1 FAIL, G2 FAIL, G3 PASS, G4 FAIL, G5 PASS, G6 PASS, G7 FAIL, G8 PASS (Lighthouse 98/100), G9 PASS (check Pages source).
Phone hero checks: (a) PASS, (b) PASS iPhone 15 / FAIL SE, (c) FAIL, (d) PASS, (e) FAIL.

Policy for conflicting reviews: where independent reviewers disagree on taste, the latest independent reviewer is followed (per the loop rule "if the next reviewer raises it independently, fix it"). Explicit client instructions outrank reviewers. Resolution: 2x density is accepted as the floor, an option the round-4 reviewer offered itself in #15 ("accept 2x as the floor and say so in the gate"); her pages contain no more detail.

| # | Sev | What was done |
|---|---|---|
| 1 | major | **Disputed.** The phone hero is edge to edge by explicit client instruction; her page 01 holds 850px for the figure (1.39x at 3x, under 1x at 2x). Paper lift lowered and `contrast(1.1)` dropped so the pencil keeps its tone. |
| 2 | major | **Disputed.** Desktop hero unchanged by explicit client instruction ("desktop stays exactly as it is"). |
| 3 | major | About paragraph no longer fades on phones while being read. |
| 4 | major | Phone uses the same scroll animation as desktop (same end, no drift, same `--hero-cut` bottom-edge tween); scale stays 1 so the bleeding arm edge never shows. |
| 5 | major | SE: name/hero spacing reduced on short screens so more of the figure shows with the hands above the fold. |
| 6 | blocker | First floor now shows the whole plan (page 11, top 146 to the bottom wall); her faint "COMMON GROUNDS / CITY CENTRE" overlay stays, as this reviewer and round 2 both directed. |
| 7 | major | Project pages at >= 1024px: two-column layout (text column + images beside their paragraphs; plans as a composed 2-column set). |
| 8 | major | Burra Pod cover is her whole collage as one image (page 06, x 1000-1530); her title letters at its left edge painted as paper; one swatch-row detail after paragraph 2 keeps phone text runs under a screen. Bands removed. |
| 9 | major | Page-13 crop is now only the staircase sheet (top of the sheet to its bottom edge at y~930): no cut handwriting, no notch. |
| 10 | minor | **Disputed.** The aerial crop is the exact rectangle of her rendered aerial on page 08; widening it would pull in her yellow page and is still cut by her own render edge. |
| 11 | major | CV: undated/untitled exhibition stubs removed; Selected Projects lines are now her own words (Burra Pod first statement sentence; Axis tagline; Common Grounds "City Centre"). CV rebuilt. |
| 12 | minor | Phone tabs match desktop: "CONTENTS", "IN PROGRESS". |
| 13 | minor | Open Burra Pod folder: cover composed with the face instead of floating in a corner. |
| 14 | minor | Hero paper lift reduced (lowest value that leaves no grey box). |
| 15 | minor | 2x accepted as the floor (reviewer's own option); every image is at or under native size at 2x. |
| 16 | minor | History back restores the same scroll position as Esc. |
| 17 | minor | Focus ring on the whole folder only. |
