# Kashish Khera - Architecture Portfolio

A static website. A landing page with her name fades away as you scroll, and the projects appear as archival folders. Clicking a folder opens it into a full project page.

**Kashish: to edit the site, read [`EDITING_GUIDE.md`](EDITING_GUIDE.md).** You can change every word, image, colour and project from a browser at `yoursite/admin`, without touching code.

There's no sign-in for visitors, no tracking and no cookies. The animation library (GSAP 3.12.5) is saved in `vendor/`, so the site works offline at an exhibition.

## Run it on your computer

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:8000. `npm run dev` rebuilds the content and starts a local server. The site has to be opened through a server; double-clicking `index.html` won't work.

To use the visual editor locally, run `npm run cms` in a second terminal and open http://localhost:8000/admin/.

## How content works

```
content/site.json            name, about line, contact, socials, colours, fonts
content/projects/<slug>.md   one file per project (settings block + statement)
        │  npm run build  (Netlify runs this on every publish)
        ▼
content.json                 what the website loads
css/tokens.css               colour and font variables, generated from site.json
```

Never edit `content.json` or `css/tokens.css` by hand, because they're overwritten on every build.

### A project file

```markdown
---
order: 1                      # folder position (0 is the ARCHIVE LOG index)
code: CODE_001
title: "BURRA POD"
subtitle: ""                  # optional line under the title
status: published             # or coming-soon
colour: "#9AA287"             # folder card and open-page border
accent: "#6B3A2A"             # darker shade: page background when open
ink: "#22261C"                # text on the folder (dark on light folders, light on dark)
year: "2025"
cover: { image: "assets/projects/burra-pod/01.webp", alt: "Describe the image" }
meta:
  - { label: "Site", value: "Burra, SA" }
  - { label: "Studio / Tutor", value: "..." }
gallery:
  - { type: image, layout: bleed, image: "...", alt: "...", caption: "01 // Concept" }   # layout: full | bleed | half
  - type: drawings                                                                    # a grid of plans or sections
    title: "Plans"
    columns: 2
    items:
      - { image: "...", alt: "...", caption: "02 // Ground floor" }
  - { type: text, heading: "Process", body: "Markdown text" }
  - { type: pdf, file: "assets/uploads/process.pdf", title: "Process book" }
---

The statement goes here, in Markdown.
```

## Import a folder of raw images (e.g. from Google Drive)

```bash
npm run import -- ~/Downloads/BurraPod burra-pod --title "BURRA POD" --code CODE_001
```

This converts any size or format into web-ready WebP at 2400, 1600 and 800 px, saves them in `assets/projects/<slug>/`, and writes a project stub that lists the images in order. If the project file already exists, it prints the gallery to paste in instead. Run `npm run build` afterwards.

## CV

The CV source is `cv/cv-data.json`. Run `npm run cv` to regenerate `cv/cv.html` and the PDF; it also copies the PDF to `assets/cv.pdf`, which is the site's download link. See `cv/README.md`.

## Deploy (Netlify, free)

1. Push this folder to a GitHub repo in **Kashish's own account**.
2. In Netlify, choose "Add new site", then "Import from Git", and pick the repo. The build settings come from `netlify.toml`.
3. To turn on the editor: Netlify → Site configuration → Access & security → OAuth → install the GitHub provider. Then set `repo:` in `admin/config.yml` to `<her-username>/kashish-portfolio`.
4. Contact form messages arrive in Netlify → Forms. Set up an email notification there.

## Files

| Path | What it is |
|---|---|
| `content/` | All editable content |
| `admin/` | The visual editor (Decap CMS) |
| `index.html`, `js/main.js` | Page shell and start-up |
| `css/base.css`, `js/cover.js` | Landing, nav, Get in Touch, footer |
| `css/folders.css`, `js/folders.js` | The folders |
| `css/project.css`, `js/project.js` | Opened project page, lightbox, animation, routing |
| `scripts/` | Content build, image import, CV build |
| `cv/` | The CV (source and PDF) |
| `brief/` | The original brief, addenda and design review |
| `CONTRACT.md` | Technical notes for developers and AI agents working on the site |
