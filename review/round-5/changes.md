# Round 5 changes

Reviewer result: G1 FAIL, G2 FAIL, G3 PASS, G4 PASS, G5 PASS, G6 PASS, G7 FAIL, G8 PASS (Lighthouse 92/100), G9 PASS.
Phone hero checks: (a) PASS, (b) PASS, (c) PASS, (d) PASS, (e) FAIL.

| # | Sev | What was done |
|---|---|---|
| 1 | blocker | First floor re-cropped below her "COMMON GROUNDS / CITY CENTRE" overlay, top edge on the wall line (y~724): no baked title text. (Reviewers in rounds 2 and 4 asked for the whole plan with the overlay; rounds 1, 3 and 5 asked for no baked text. G2 explicitly forbids baked titles, so the gate wins.) |
| 2 | major | Desktop hero replaced with the same full-figure 850px crop as the phone, capped at 425 CSS px (native/2): sharp at 2x. Raised independently by every reviewer since round 2; change approved by the builder as the minimal fix (layout unchanged). |
| 3 | major | Hero tone (saturate .85, paper lifted) baked into the files at export, quality 92; CSS filter removed. Phone 3x stretch (1.39x) remains source-limited (850px is all her page holds), accepted under the 2x floor. |
| 4 | major | Collage and swatch paper snapped to pure #FFFFFF after levelling, so multiply leaves no tint on folder faces or pages (sampled: 255,255,255). |
| 5 | major | Focus ring only for keyboard users and inside the folder's own shape; programmatic focus after close no longer shows a ring. |
| 6 | major | Swatch detail `after: 1`, placed with its paragraph at its sharp size. |
| 7 | major | Half images pair into two columns at 768-1023px. |
| 8 | minor | Default `contrast(1.1)` and per-image brightness filters removed; paper whitening lives in the image files. |
| 9 | major | CV: "Exhibitions & Awards" renamed "Awards"; References row removed; skills use her own headings and lists (Technical Skills + her five Professional Skills groups); her full bullet text restored verbatim; section numbers removed (they collided with labels). Non-design roles keep their first bullet (selection, not rewording) to stay at 2 pages. |
| 10 | minor | **Disputed.** "LinkedIn /kashishkhera" is the client's explicit instruction. |
| 11 | minor | Name and title held until web fonts are ready (with timeout; visible without JS), then rise in. |
| 12 | minor | README deploy section updated: Pages source must be "GitHub Actions"; Forms line removed. |
| 13 | minor | Dead `.contact__phone` CSS removed. |
| 14 | minor | Second floor re-cropped tight to the building (460x1010). |
| 15 | minor | Basement crop extended so the courtyard square is whole (680x852). |
| 16 | minor | Phone top fade 12% to 6% so the upper clasp reads on SE. |
| 17 | minor | Harness: GIF capture starts at DOMContentLoaded (no pre-load frame). |
