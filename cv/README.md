# CV: how to update it

Everything on the CV comes from **`cv/cv-data.json`**. Don't edit `cv.html` directly, because it is regenerated each time you run the build.

1. Open `cv/cv-data.json` and change the text. Keep the quotes and commas; if the build complains, a comma or quote is usually missing near the line it names.
2. Run **`npm run cv`** in the site folder. This:
   - writes `cv/cv.html` (open it in a browser to preview),
   - exports `cv/Kashish_Khera_CV.pdf` (A4),
   - copies the PDF to `assets/cv.pdf`, which is the "Download CV" link on the site.
3. Commit and push, so the site picks up the new PDF.

Options:
- `npm run cv -- --html-only` regenerates only the HTML, with no PDF and no browser needed.
- `npm run cv -- --white` prints on white paper instead of cream. To make white permanent, set `"printPaper": "white"` in `meta`.
- You can also open `cv.html` in Chrome and choose Print → Save as PDF (A4, margins "None", "Background graphics" on).

The PDF export needs Playwright with Chromium (`npm i -g playwright && npx playwright install chromium`). Fonts load from Google Fonts, so you need to be online.

## What's in `cv-data.json`

All of the content comes from her resume (`her-cv/Kashish_Khera_Resume.pdf`) and portfolio page 05, in her own wording. Some bullets are shortened so the CV fits on two pages.

| Field | Notes |
|---|---|
| `meta.portfolioUrl` | Empty until the site is deployed. Once it's set (e.g. `https://kashishkhera.com`), the project titles link to `…/#project/<slug>`. |
| `contact` | Email, location, LinkedIn and Instagram. There is deliberately no phone line. |
| `profile` / `focus` | The professional summary trimmed to 3 lines, plus a "Key skills" line of keywords taken from the resume. |
| `education` | Each entry has `degree`, `institution`, `years`, an optional `description` and `notes` bullets. |
| `projects` | 3-4 projects, one line each, using facts from `content/projects/<slug>.md`. |
| `experience.architecture` / `.other` | Architecture and design roles come first. |
| `honours` | Exhibitions and awards. An entry with no `title` prints its `kind` (e.g. "Exhibition"); add the exhibition name in `title` once it's confirmed. |
| `skills` | Groups of `{ "group", "items" }`, listing only software she actually uses. |
| `certifications`, `community`, `languages`, `references` | One line each. |

If any value contains `[brackets]`, the build lists it as a placeholder still to fill. The build also warns if the CV runs past two pages.
