# Build contract v2 (agents: read fully; binding)

Brief layers, in priority order (later wins on conflict): `brief/MASTER_PROMPT.md` → `brief/MASTER_PROMPT_ADDENDUM_v2.md` → `brief/MASTER_PROMPT_ADDENDUM_v3_REAL_CONTENT.md`. Design critique to apply: `brief/DESIGN_REVIEW.md`.

**Her real source files are NOT available yet** (no `her-portfolio-pages/*.png`, no `her-cv/*.pdf`, no `her-drive/`). Never invent her content. Known facts only: name **Kashish Khera**; **UNSW Sydney, Bachelor of Architectural Studies, 2024-2026**; projects in order Burra Pod, Axis City Centre (Waterloo Estate Redevelopment), Oasis, Common Grounds, Stacked, Terrace House, Pavilion; exhibitions on **2 Dec 2026** and **4 Dec 2026** (names/venues unknown). Everything else is a bracketed placeholder like `[EMAIL - copy exactly from portfolio page 04]`.

## Stack
Static site, no framework. GSAP 3.12.5 + ScrollTrigger + Flip are vendored in `vendor/` (globals, registered in `js/main.js`). The CDNs are blocked here, so do not add CDN scripts to the public site. Google Fonts is OK.

## Content pipeline (orchestrator-owned, already working)
- She edits `content/site.json` and `content/projects/<slug>.md` (YAML front-matter + Markdown statement), by hand or through Decap CMS at `/admin`.
- `npm run build` (`scripts/build-content.mjs`) compiles them into **`content.json`** (what the site fetches) and **`css/tokens.css`** (colour and font variables). Netlify runs it on every deploy. `projects.json` is obsolete and will be deleted.
- `content.json` shape:
```
{ site: { name, title, edition, about, university, degree, years, location, email, phone,
          hero:{src,alt,caption}|null, outro:{src,alt,caption}|null, cvPdf,
          socials:[{label,url}], contactIntro, colours:{...}, fonts:{display,mono} },
  projects: [ { slug, order, index:boolean, status:'published'|'coming-soon', code, title, subtitle,
                colour, accent, ink, year, cover:{src,alt,caption}|null,
                meta:[{label,value}], statement:<html string from Markdown>,
                blocks:[ {type:'image', src,alt,caption, layout:'full'|'bleed'|'wide'|'half', align:'left'|'right'}
                       | {type:'drawings', title, columns:1|2|3, items:[{src,alt,caption}]}
                       | {type:'text', heading, body, html}
                       | {type:'pdf', file, title, caption} ] } ] }
```
- Any image object (`cover`, blocks, drawing items, `site.hero`) has `blend` ('multiply' default: drawings drop their paper into the cream; 'none' for dark/photo images) and may carry `maxWidth` (CSS px cap), and optional `width`, `height` (use for aspect ratio / CLS) and `srcset` (responsive variants; pair with a sensible `sizes`).
- `statement` and text `html` are trusted HTML that she wrote (Markdown output). Insert them as HTML. Escape every other string.
- **No placeholders ship.** `npm run build` fails if any content string contains `[`. Unknown facts are omitted, not bracketed. Every renderer must handle missing fields gracefully (no cover → plain empty frame or nothing; no meta/year/statement → omit).
- **Never generate drawings or images.** Only her real images (from her portfolio pages, cropped, or her original files). If none exist, show a plain empty frame.
- Coming-soon projects collapse into one non-clickable "IN PROGRESS" folder and cannot be opened.
- Codes: only `CODE_00X` is shown. No FILE_xx, 0x-A, sheet numbers or KK-codes, and at most one barcode on the whole site. The index folder is titled "CONTENTS" (slug `contents`) with no code.

## Page structure (v2 section B: replaces the old sections)
Home page has ONLY: 1. **Landing** (`#home`): name, "Architecture Portfolio", one-paragraph about, hero image. No scroll cue. 2. **Projects** (`#projects`): the folders. 3. **Get in Touch** (`#contact`): email, socials, Netlify contact form. 4. **Footer**: name, ©, socials, CV download, location, "back to top".
Nav: **Home · Projects · Get in Touch** only. No About or CV sections. Projects open at `#project/<slug>`.

## Files and owners (edit ONLY yours)
| Files | Owner |
|---|---|
| `index.html`, `js/main.js`, `content/**`, `scripts/build-content.mjs`, `package.json`, `netlify.toml`, `CONTRACT.md`, `README.md` | Orchestrator. Ask in your report if you need a change. |
| `css/base.css`, `js/cover.js`, `admin/**`, `EDITING_GUIDE.md`, `docs/**` | Agent R (restructure, CMS, editing guide) |
| `css/folders.css`, `js/folders.js`, `css/project.css`, `js/project.js` | Agent P (folders and project template) |
| `scripts/import-project.mjs`, `scripts/build-cv.mjs`, `cv/**` | Agent I (import pipeline and CV) |

## Module interfaces (unchanged signatures)
- `initCover(site)` fills `[data-cover]`, `[data-contact]`, `[data-footer]` and `[data-site-name]`.
- `renderFolders(projects)` fills `[data-folders]`.
- `initProjectView(projects, site)` owns `[data-project-view]` and routing.

## Folder DOM, routing and tokens
As in v1 (`<a class="folder" href="#project/<slug>" data-slug style="--folder;--accent;--ink;--i">`; `#project/<slug>`; `html.project-open`; layout breakpoint `min-width:1024px`). Colour tokens now come from the generated `css/tokens.css`, loaded before `base.css`. base.css must NOT redefine `--bg --ink --cream --slate --kraft --charcoal --olive --gold --font-display --font-mono`; it may define everything else.

## Hard rules
No "scroll to explore" text and no arrow. Border on the opened panel only. Background takes the accent. Menu says "Projects". Soft grain. Transforms and opacity only. Respect reduced motion. Every image has alt text; lazy-load below the fold. Never invent her content.

## Testing
Use a scratch copy under `/tmp/claude-0/-home-user/ea466a18-3c3a-59e4-baba-8ebf39bd0e5e/scratchpad/<you>/` while developing. Serve with `python3 -m http.server <unusual port>`. Playwright: `require('playwright')`, `chromium.launch()`. Run `npm run build` (in the real site, or in your copy) after any content change.

## Image treatment (client rule)
Images look cut out of her pages and laid straight onto the paper: no mats, card borders, box-shadows or outline boxes; `border-radius: 6px` max; `mix-blend-mode: multiply` for drawings (no isolated/opaque wrapper behind them); the landing hero also gets `filter: saturate(.85)`. Gallery uses varied widths (full, 2/3, 1/2) alternating left/right with some bleeding to the panel edge; never an equal-card grid. Never use burra-pod's handwritten statement board as an image: the statement is text.
