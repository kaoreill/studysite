# Study Site — Design Spec

Date: 2026-10-01
Status: Approved for planning

## Purpose

A lightweight, static study website for 4 exam modules, hosted on GitHub Pages:

1. Machine Learning — `ml`
2. Quantitative Methods to Assess Sustainability — `sustainability`
3. Process Mining — `process-mining`
4. Cybersecurity Fundamentals — `cybersecurity`

Each module runs 13 weeks. The site lets the owner browse lecture PDFs per
week, drill flashcards, self-test with multiple-choice quizzes, and search
across all flashcards and PDF text. It must work by pushing files to a repo
and enabling Pages — no build step, no framework, no npm. The only external
dependency is PDF.js, loaded from a CDN (cdnjs or jsDelivr).

Success criteria: the owner can add a new week's content (PDF + flashcards)
by dropping files in the right folders and editing one manifest entry, with
zero code changes. The site must work equally well one-handed on a phone and
with a keyboard on a laptop, and stay simple enough for the owner to
maintain solo.

## Non-goals

- No backend, database, or build tooling.
- No user accounts or multi-user sync — `localStorage` persistence is
  single-browser, best-effort.
- No spaced-repetition scheduling algorithm — flashcards are plain
  flip-through, optionally shuffled.
- No offline/PWA support.

## Architecture

Multi-page site: one `.html` file per view, state passed via query string.
Each page is a focused, independently-readable file. Shared behavior
(manifest loading, theme, header/nav, keyboard-shortcut wiring) lives in one
`common.js`/`common.css` included by every page. No router, no framework,
no SPA state management — the browser's native navigation and back/forward
history do the routing.

```
/
├── index.html                  # Home: 4 module cards
├── module.html                 # Week 1–13 list for one module (?m=ml)
├── notes.html                  # PDF viewer for one week (?m=ml&w=3)
├── flashcards.html             # Flip-card study mode
├── quiz.html                   # Multiple-choice quiz mode
├── search.html                 # Cross-site search
├── css/
│   └── common.css              # CSS variables, layout, light/dark themes, shared components
├── js/
│   ├── common.js                # Theme, header/nav, manifest loader, localStorage helpers, keyboard-shortcut helper
│   ├── home.js
│   ├── module.js
│   ├── notes.js
│   ├── flashcards.js
│   ├── quiz.js
│   ├── search.js
│   └── pdf-viewer.js             # Thin wrapper over pdf.js: render page to canvas, extract page text
├── data/
│   └── modules.json              # The manifest — single source of truth for what weeks exist
├── notes/<module-slug>/week-NN/<file>.pdf
├── cards/<module-slug>/week-NN.json
└── README.md
```

Study-mode pages (`flashcards.html`, `quiz.html`) accept any of these scope
query params:
- `?m=ml&w=3` — single week
- `?m=ml&from=1&to=5` — a week range
- `?m=ml&w=all` — every week in the module (exam revision)

## Data model

### `data/modules.json`

One object per module. `weeks` is always a fixed 13-element array — slots
with no content yet are the "coming soon" shape rather than missing
entries, so week numbering never needs computing.

```json
{
  "modules": [
    {
      "slug": "ml",
      "title": "Machine Learning",
      "weeks": [
        {
          "week": 1,
          "title": "Introduction & Linear Regression",
          "pdfs": [
            { "name": "Lecture 1 slides", "file": "lecture.pdf" }
          ],
          "cards": "week-01.json"
        },
        { "week": 2, "title": "", "pdfs": [], "cards": null }
      ]
    }
  ]
}
```

Rules:
- A week is "coming soon" when `title === ""`, `pdfs` is empty, and
  `cards` is `null`. Every page checks this before fetching anything further
  for that week, and renders a "Coming soon" state instead of erroring.
- `pdfs` is a list (not a single file) to allow multiple PDFs per week
  (e.g. slides + handout). Each `file` is relative to
  `notes/<slug>/week-NN/`.
- Home page's "N of 13 weeks have content" count = weeks where `cards` is
  non-null OR `pdfs` is non-empty.

### `cards/<slug>/week-NN.json`

```json
{
  "module": "ml",
  "week": 1,
  "title": "Introduction & Linear Regression",
  "cards": [
    {
      "id": "ml-w01-001",
      "question": "What is the bias-variance tradeoff?",
      "answer": "...",
      "distractors": ["...", "...", "..."],
      "tags": ["optional"]
    }
  ]
}
```

The `module` field uses the real module slug (`ml`, `sustainability`,
`process-mining`, `cybersecurity`), and `id` follows
`<slug>-w<NN>-<seq>`. Every card must have exactly 3 `distractors` (quiz
mode always builds a 4-option question from `[answer, ...distractors]`);
this is a content authoring requirement documented in the README, not
something quiz.js needs to handle a variable count for.

## Pages & features

**Home (`index.html`)** — 4 module cards, each showing title and "N/13
weeks have content," linking to `module.html?m=<slug>`.

**Module (`module.html?m=ml`)** — week-by-week list (1–13); each row shows
the week's title (or a "Coming soon" style if empty) with links to Notes /
Flashcards / Quiz for that week, disabled when there's no content for that
mode. Above the list: "Study all weeks" and "Quiz all weeks" buttons
(`w=all`), plus a from/to range picker that builds the ranged URL. Weeks
with a saved quiz score (see Persistence) show a small score badge.

**Notes (`notes.html?m=ml&w=3`)** — lists each PDF for the week; each
renders through a custom canvas-based viewer (`pdf-viewer.js`, built on
pdf.js from the CDN): prev/next page, page counter, pinch/scroll zoom, plus
a plain `<a download>` link to the raw PDF file. A week with no PDFs shows
"Notes coming soon." A PDF that fails to load shows an inline error for
just that entry — other PDFs on the page still render.

**Flashcards (`flashcards.html`)** — loads the card file(s) for the
requested scope, merges them, flip (tap card or Space), optional shuffle
toggle (preference persisted), swipe or ←/→ or on-screen buttons for
prev/next, "X/Y" progress counter.

**Quiz (`quiz.html`)** — same scope options as flashcards. Per card,
shuffles `[answer, ...distractors]` into 4 options; 1–4 keys or tap to
answer; instant correct/incorrect feedback; running score; end screen with
final score and a "Retry wrong only" option that re-runs the quiz scoped to
just the missed card IDs (same session, not persisted as a separate mode).

**Search (`search.html`)** — single search box. See Search below.

## Shared infrastructure (`common.js` / `common.css`)

- Fetches and caches `data/modules.json` once per page load (in-memory,
  re-fetched fresh on each navigation since each page is a full reload).
- Renders the shared header: site title, breadcrumb, theme toggle.
- Theme: CSS defaults to `prefers-color-scheme`. The header toggle sets
  `data-theme="light"|"dark"` on `<html>` and persists the choice to
  `localStorage`, overriding the media query. `common.js` applies any
  stored override before first paint to avoid a flash of the wrong theme.
- `onKey(key, handler)` helper that page scripts register against, so each
  page declares only *what* Space/←/→/1-4 do, not `keydown` boilerplate.
- A lightweight touch-swipe helper (`touchstart`/`touchend` delta, no
  library) that flashcards.js and notes.js use for swipe-to-advance.

Keyboard and touch input both always work, simultaneously, on every page
that supports them — no device-detection branching.

## Persistence (`localStorage`)

Single namespaced key (`studysite:v1`) holding:

```json
{
  "theme": "dark",
  "shuffle": true,
  "scores": {
    "ml-w03": { "best": 9, "total": 10, "last": "2026-09-28" }
  }
}
```

- `scores` is keyed `<module>-w<NN>` and only recorded for **single-week**
  quiz runs — ranged or whole-module (`w=all`) quiz runs are not scored
  into this map, since "best score for weeks 3–7" has no stable key.
  Module page shows a badge next to weeks with a saved score.
- `shuffle` is one global preference, not per-module.
- `theme` is the manual override described above; absent key = follow
  system preference.

## Search (`search.html` / `js/search.js`)

1. On first query (debounced ~250ms, ≥2 chars) in a page visit: fetch
   `modules.json`, then fetch every non-null `cards/<slug>/week-NN.json` —
   this gives immediate card search. Separately, kick off PDF text
   extraction via `pdf-viewer.js` for every listed PDF, caching
   `{module, week, file, text}` into an in-memory array as each finishes,
   so results improve progressively rather than blocking on every PDF
   up front. This cache lives only for the current visit to `search.html`
   (not shared with other pages, not persisted).
2. Case-insensitive substring match against card question/answer text and
   extracted PDF page text. Results: card matches ranked first, then PDF
   matches, each with a ~80-character snippet around the match.
3. Each result links to `flashcards.html?m=&w=&card=<id>` (jumps to that
   card) or `notes.html?m=&w=&page=<n>` (opens at that page).
4. No matches → "No results for '…'" message, never a blank screen.

## Error handling

All failures degrade gracefully; nothing hard-crashes the page.

- `modules.json` fails to load → full-page error: "Couldn't load site
  data — check your connection, or that you're serving over http://, not
  opening the file directly."
- A week's `cards` file 404s or fails to parse → caught per-fetch; that
  week's flashcards/quiz page shows "Cards unavailable for this week."
- A listed PDF 404s → that entry shows "This PDF couldn't be loaded";
  other PDFs for the week still render.
- A requested study scope resolves to zero cards (e.g. an empty range) →
  "No cards found for this selection," with a link back to the module
  page.
- `location.protocol === 'file:'` → a one-line hint that local testing
  requires running a local server, since `fetch()` of local files is
  blocked under `file://`.

## Responsive design & interactions

Mobile-first CSS: base styles target narrow viewports; `@media
(min-width: 640px)`-style breakpoints widen layout into multi-column grids
(home page module cards, module week list) on larger screens. Flashcards
and quiz use large tap targets (full-card tap to flip, large prev/next
buttons) so every interaction works without a keyboard, while the shared
`onKey` helper layers in Space/←/→/1–4 for laptop use. Both input modes are
always active together.

## Testing

Local development: `python -m http.server 8000` (or equivalent) from the
repo root, since `fetch()` of local JSON/PDF files requires `http://`, not
`file://`. The README documents this explicitly.

## Deliverables

- Full file tree as above, committed and ready to push.
- `data/modules.json` fully populated: 4 modules × 13 weeks each. Week 1 of
  every module is populated (title, 3 placeholder cards, one placeholder
  PDF at `notes/<slug>/week-01/lecture.pdf`); weeks 2–13 are in the
  "coming soon" shape so the site works immediately and shows the full
  pattern for adding more.
- One `cards/<slug>/week-01.json` per module with 3 placeholder cards each,
  using real slugs and `<slug>-w01-00N` ids.
- `README.md` covering: enabling GitHub Pages (Settings → Pages → deploy
  from branch), how to add a new week (PDF location, card file, manifest
  edit), local testing command, and a short tour of the file layout.
- Code comments: a short header comment per JS file stating its one job,
  plus comments only where something is non-obvious (theme
  flash-prevention, the localStorage schema, the progressive PDF-indexing
  loop) — not line-by-line narration.
