# Study Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the remaining pages, data, and logic for the DTU exam-prep study site — wiring the already-built home/module pages to real data, and adding notes (PDF viewer), flashcards, quiz, and search.

**Architecture:** Static multi-page site, one `.html` file per view, state passed via query string, no router. Shared chrome (theme, manifest loading, keyboard/touch helpers) lives in `js/common.js`; page-specific logic lives in one JS file per page. `data/modules.json` is the single source of truth for what weeks exist; every page checks a week's "coming soon" shape before fetching anything further for it.

**Tech Stack:** Plain HTML/CSS/vanilla JS (ES modules, no bundler), PDF.js loaded from a CDN (cdnjs or jsDelivr) — the only external dependency. No Node, no test framework; verification is done by running `python3 -m http.server` and checking pages/assertions in a real browser, or with plain `python3 -c` checks for static content (JSON/PDF structure).

**Spec:** `docs/superpowers/specs/2026-10-01-study-site-design.md`

## Global Constraints

- Plain HTML, CSS, vanilla JS only — no frameworks, no build step, no npm.
- Only external dependency: PDF.js from a CDN (cdnjs or jsDelivr).
- 4 modules, fixed slugs: `ml`, `sustainability`, `process-mining`, `cybersecurity`. Each has exactly 13 weeks.
- Keyboard shortcuts (laptop): Space = flip (flashcards), ←/→ = previous/next, 1–4 = pick quiz answer. All of these work alongside tap/swipe on phone, never instead of it.
- Theme follows `prefers-color-scheme` by default; a manual override is stored at `localStorage["studysite:v1"].theme` ("light" | "dark").
- `localStorage["studysite:v1"]` holds `{ theme, shuffle, scores: { "<module>-wNN": { best, total, last } } }`. `scores` is written only for single-week quiz runs.
- A week is "coming soon" exactly when `title === ""`, `pdfs` is `[]`, and `cards` is `null`.
- Local dev: `python3 -m http.server` from the repo root — `fetch()` of local files requires `http://`, not `file://`.
- Code comments: one short header comment per new JS file stating its one job; otherwise comment only where something is genuinely non-obvious (an algorithm, a workaround, a format other code depends on). No line-by-line narration.
- Every new HTML page's `<head>` must include the same inline theme flash-prevention snippet already used in `index.html` and `module.html` (copy verbatim — see those files' `<head>`), before the `common.css` `<link>`.

## Review Focus

- A week's `cards` file 404s or fails to parse → flashcards/quiz for that scope must show "Cards unavailable for this week," not throw. (Owned by: Task 7/8/9.)
- A listed PDF 404s on the notes page → that one entry shows an inline error; the week's other PDFs still render. (Owned by: Task 6.)
- `data/modules.json` itself fails to fetch → every page shows the full-page "Couldn't load site data…" message instead of a blank or broken page. (Owned by: Task 2, consumed by Tasks 3/4/6/8/9/10.)
- A resolved study scope has zero cards (e.g. an empty week range) → "No cards found for this selection" with a link back to the module page, not an empty flip card or a crash. (Owned by: Task 7/8/9.)
- Opening the site via `file://` instead of a local server → a one-line hint is shown, since `fetch()` silently fails under `file://` and the real failure mode (blank page) is confusing. (Owned by: Task 2, consumed by Task 3.)

---

## File Structure

```
Create:
  data/modules.json
  cards/ml/week-01.json
  cards/sustainability/week-01.json
  cards/process-mining/week-01.json
  cards/cybersecurity/week-01.json
  scripts/make_placeholder_pdfs.py
  notes/ml/week-01/lecture.pdf
  notes/sustainability/week-01/lecture.pdf
  notes/process-mining/week-01/lecture.pdf
  notes/cybersecurity/week-01/lecture.pdf
  js/home.js
  js/module.js
  js/pdf-viewer.js
  js/notes.js
  js/study-scope.js
  js/flashcards.js
  js/quiz.js
  js/search.js
  notes.html
  flashcards.html
  quiz.html
  search.html
  README.md
  tests/test-common.html
  tests/test-study-scope.html
  tests/test-quiz.html
  tests/test-search.html

Modify:
  js/common.js        (add shared helpers, export existing state functions)
  index.html:1-93      (home.js replaces the hardcoded module list)
  module.html:1-114    (module.js replaces the hardcoded week list)
  css/common.css       (add components for flashcards, quiz, search, error/empty states)
```

---

### Task 1: Sample data and placeholder content

**Files:**
- Create: `data/modules.json`
- Create: `cards/ml/week-01.json`, `cards/sustainability/week-01.json`, `cards/process-mining/week-01.json`, `cards/cybersecurity/week-01.json`
- Create: `scripts/make_placeholder_pdfs.py`
- Create: `notes/ml/week-01/lecture.pdf`, `notes/sustainability/week-01/lecture.pdf`, `notes/process-mining/week-01/lecture.pdf`, `notes/cybersecurity/week-01/lecture.pdf` (generated, not hand-written)

**Interfaces:**
- Produces: the on-disk data every later task reads — `data/modules.json`'s shape (module/week objects per the spec's schema), `cards/<slug>/week-01.json`'s shape, and one real, openable PDF per module at `notes/<slug>/week-01/lecture.pdf`.

- [ ] **Step 1: Write `data/modules.json`**

4 modules, each with a 13-element `weeks` array. Week 1 of every module uses the title/pdf below; weeks 2–13 all use the exact "coming soon" shape `{ "week": N, "title": "", "pdfs": [], "cards": null }`.

Week 1 per module:
| slug | title | cards |
|---|---|---|
| `ml` | `Introduction & Linear Regression` | `week-01.json` |
| `sustainability` | `Introduction to Sustainability Metrics` | `week-01.json` |
| `process-mining` | `Introduction to Process Mining` | `week-01.json` |
| `cybersecurity` | `Introduction to Cybersecurity Fundamentals` | `week-01.json` |

Every week 1's `pdfs` is `[{ "name": "Lecture 1 slides", "file": "lecture.pdf" }]`. Module `title` fields: `Machine Learning`, `Quantitative Methods to Assess Sustainability`, `Process Mining`, `Cybersecurity Fundamentals`.

- [ ] **Step 2: Write the 4 `cards/<slug>/week-01.json` files**

Each has `module` (real slug), `week: 1`, `title` (matching Step 1's table), and exactly 3 cards with ids `<slug>-w01-001..003`, each with `question`, `answer`, and exactly 3 `distractors`. Use real, subject-accurate placeholder content (not lorem ipsum) — e.g. for `ml`, card 1 asks "What is the bias-variance tradeoff?" with a correct answer and 3 plausible-but-wrong distractors about regularization/learning rate/inference time. Write analogous real content for `sustainability` (life-cycle assessment, material flow analysis, planetary boundaries), `process-mining` (event logs, process discovery, conformance checking), and `cybersecurity` (CIA triad, man-in-the-middle, least privilege).

- [ ] **Step 3: Write `scripts/make_placeholder_pdfs.py`**

A minimal valid one-page PDF needs correct byte offsets in its xref table; hand-writing them is error-prone, so build them programmatically:

```python
def make_pdf(text: str) -> bytes:
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    stream = f"BT /F1 18 Tf 72 700 Td ({text}) Tj ET".encode("latin-1")
    objects.append(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")

    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref_offset = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += (f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF").encode()
    return bytes(out)
```

Call `make_pdf(...)` once per module with text `"Week 1 placeholder notes — <Module Title>. Replace this file with your real lecture PDF at notes/<slug>/week-01/lecture.pdf."`, and write each result to its `notes/<slug>/week-01/lecture.pdf` path (creating the `week-01` directories).

- [ ] **Step 4: Run the script and verify the output**

Run: `python3 scripts/make_placeholder_pdfs.py`
Then: `python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('cards/*/week-01.json')]; json.load(open('data/modules.json')); print('json ok')"`
Then: `python3 -c "
import glob
for f in glob.glob('notes/*/week-01/lecture.pdf'):
    d = open(f, 'rb').read()
    assert d.startswith(b'%PDF-1.4') and d.rstrip().endswith(b'%%EOF'), f
print('pdfs ok')
"`
Expected: `json ok` then `pdfs ok` printed, no assertion errors.

- [ ] **Step 5: Commit**

```bash
git add data/ cards/ scripts/ notes/
git commit -m "Add sample modules.json, week-01 card decks, and placeholder PDFs"
```

---

### Task 2: Shared helpers in `js/common.js`

**Files:**
- Modify: `js/common.js`
- Create: `tests/test-common.html`

**Interfaces:**
- Consumes: nothing new (existing `STORAGE_KEY`, `loadState`, `saveState`, `applyTheme` stay as-is, now exported where noted).
- Produces (all named exports from `js/common.js`, used by every later task):
  - `export async function fetchModules()` → `Promise<{modules: Array}>`. Fetches `data/modules.json` once per page load and caches the parsed result in a module-scope variable for subsequent calls; rejects with the underlying error on failure.
  - `export function findModule(manifest, slug)` → module object or `undefined`.
  - `export function findWeek(moduleObj, weekNumber)` → week object or `undefined`.
  - `export function isWeekEmpty(weekObj)` → `boolean` (`title === "" && pdfs.length === 0 && cards === null`).
  - `export function countWeeksWithContent(moduleObj)` → `number` of weeks where `!isWeekEmpty(week)`.
  - `export function getQueryParam(name, search = window.location.search)` → `string | null`.
  - `export function onKey(key, handler)` → adds a `keydown` listener on `document`; calls `handler(event)` when `event.key === key`.
  - `export function onSwipe(element, { onLeft, onRight })` → adds `touchstart`/`touchend` listeners on `element`; calls `onLeft()`/`onRight()` when the horizontal delta exceeds 40px.
  - `export function isFileProtocol(protocol = window.location.protocol)` → `boolean`.
  - `export function renderFatalError(container, message)` → replaces `container`'s contents with a styled `.fatal-error` block showing `message`.
  - `export function loadState()`, `export function saveState(state)` — existing functions, now exported.

- [ ] **Step 1: Write `tests/test-common.html`**

A plain HTML page (served by the local http server, not part of the deployed site) that imports `../js/common.js` as a module, runs assertions with a small inline `assert(condition, label)` helper that appends a PASS/FAIL line per assertion to the page and tracks a total, and ends by rendering "All N assertions passed" or listing failures. Cover: `getQueryParam('m', '?m=ml&w=3') === 'ml'`, `getQueryParam('x', '?m=ml') === null`, `isWeekEmpty({title:"", pdfs:[], cards:null}) === true`, `isWeekEmpty({title:"X", pdfs:[], cards:null}) === false`, `countWeeksWithContent` on a fixture module with 3 non-empty weeks out of 13 returns `3`, `findModule`/`findWeek` return the right object and `undefined` for a missing slug/week, `isFileProtocol('file:') === true`, `isFileProtocol('http:') === false`.

- [ ] **Step 2: Run it and confirm it fails**

Run: `python3 -m http.server 8731` (repo root), open `http://localhost:8731/tests/test-common.html`.
Expected: import error or failing assertions, since none of the new exports exist yet.

- [ ] **Step 3: Implement the exports in `js/common.js`**

Add the functions listed in Produces above; export the existing `loadState`/`saveState`. `fetchModules` caches via a top-of-module `let cachedManifest = null;` and an in-flight promise to avoid duplicate fetches if called twice before the first resolves.

- [ ] **Step 4: Reload the test page and confirm it passes**

Open: `http://localhost:8731/tests/test-common.html`
Expected: "All N assertions passed."

- [ ] **Step 5: Commit**

```bash
git add js/common.js tests/test-common.html
git commit -m "Add shared manifest/query/keyboard/swipe helpers to common.js"
```

---

### Task 3: Home page wiring (`home.js`)

**Files:**
- Create: `js/home.js`
- Modify: `index.html:1-93` (replace the hardcoded `<ul class="module-list">` content and hero stat with an empty mount point plus a `<script type="module" src="js/home.js">`)

**Interfaces:**
- Consumes: `fetchModules`, `countWeeksWithContent`, `isFileProtocol`, `renderFatalError` from `js/common.js` (Task 2).
- Produces: nothing consumed by later tasks (leaf page).

- [ ] **Step 1: Replace the hardcoded content in `index.html`**

Keep the `<div class="hero">` wrapper and `<h1 class="hero__title">DTU Autumn Exam Prep</h1>`, but replace the hardcoded `<p class="hero__stat">` and the 4 hardcoded `<li>` module rows with empty mount points: `<p class="hero__stat" id="hero-stat"></p>` and `<ul class="module-list" id="module-list"></ul>`. Add `<script type="module" src="js/home.js"></script>` before `</body>`.

- [ ] **Step 2: Implement `js/home.js`**

On load: if `isFileProtocol()`, show a one-line hint banner above the hero. Call `fetchModules()`; on failure, `renderFatalError(document.querySelector('main'), "Couldn't load site data — check your connection, or that you're serving over http://, not opening the file directly.")`. On success, compute total weeks-with-content across all 4 modules for `#hero-stat` (`"<strong>N</strong> of 52 weeks ready across all modules"`), and for each module render a `.module-row.<slug>` `<li>` (reusing the existing CSS classes from `css/common.css`: `module-row__head`, `module-row__title`, `module-row__badge`, `.dots` with `N` `<li class="filled">` followed by `13-N` empty `<li>`), linking to `module.html?m=<slug>`.

- [ ] **Step 3: Verify manually**

Run: `python3 -m http.server 8731`, open `http://localhost:8731/index.html`.
Expected: hero stat reads "5 of 52 weeks ready across all modules" (1 per module × 4, computed from Task 1's data — verify the arithmetic matches Task 1's actual sample data before asserting this exact number), 4 module rows each show "1 / 13" and exactly 1 filled dot. Then rename/corrupt `data/modules.json` temporarily, reload, confirm the full-page error shows, and restore the file. Then open `index.html` directly by double-clicking it (`file://...`) rather than through the server: confirm the one-line `file://` hint banner shows instead of a silent blank page.

- [ ] **Step 4: Commit**

```bash
git add index.html js/home.js
git commit -m "Wire home page to data/modules.json"
```

---

### Task 4: Module page wiring (`module.js`)

**Files:**
- Create: `js/module.js`
- Modify: `module.html:1-114` (replace hardcoded ML content with mount points and `<script type="module" src="js/module.js">`)

**Interfaces:**
- Consumes: `fetchModules`, `findModule`, `findWeek`, `isWeekEmpty`, `countWeeksWithContent`, `getQueryParam`, `renderFatalError` from `js/common.js`.
- Produces: nothing consumed by later tasks (leaf page).

- [ ] **Step 1: Replace hardcoded content in `module.html`**

Replace the hardcoded `<span class="site-header__crumb">`, the `<div class="module-intro ml">` contents, and the 13 hardcoded `<li class="week-row">` entries with empty mount points (`id="crumb"`, `id="module-intro"`, `id="week-list"`). Keep the surrounding structure (header, `.page`, `<main>`). Add the module script tag.

- [ ] **Step 2: Implement `js/module.js`**

Read `m` via `getQueryParam('m')`. Call `fetchModules()` (same fatal-error handling as Task 3). If `m` is missing or `findModule` returns `undefined`, render a friendly "Module not found" message in `<main>` with a link back to `index.html` (not the fatal-error block — this is a bad link, not a data-loading failure). Otherwise: set the crumb text, render `.module-intro.<slug>` (title, `.module-row__badge` with "`N / 13`", `.dots`, and the two `.btn.btn--primary` buttons linking to `flashcards.html?m=<slug>&w=all` / `quiz.html?m=<slug>&w=all`), and render all 13 `.week-row` entries from `moduleObj.weeks` — populated weeks get the 3 Notes/Flashcards/Quiz links (`notes.html?m=&w=`, `flashcards.html?m=&w=`, `quiz.html?m=&w=`), empty weeks get `.week-row--empty` with "Coming soon".

- [ ] **Step 3: Verify manually**

Open `http://localhost:8731/module.html?m=ml`: week 1 shows title + 3 links, weeks 2–13 show "Coming soon", intro badge reads "1 / 13" with 1 filled dot. Open `module.html?m=nonsense`: confirm the "Module not found" message and link back home, not a crash. Open `module.html` (no `m`): same friendly message.

- [ ] **Step 4: Commit**

```bash
git add module.html js/module.js
git commit -m "Wire module page to data/modules.json"
```

---

### Task 5: `pdf-viewer.js` (PDF.js wrapper)

**Files:**
- Create: `js/pdf-viewer.js`

**Interfaces:**
- Consumes: `pdfjsLib` global, loaded by each consuming page via a `<script src="https://cdnjs.cloudflare.com/.../pdf.min.js">` tag (see Step 1).
- Produces:
  - `export async function loadPdf(url)` → `Promise<PDFDocumentProxy>` (via `pdfjsLib.getDocument(url).promise`); rejects on failure (404, corrupt file).
  - `export async function renderPage(pdfDoc, pageNumber, canvas, scale = 1.5)` → renders the page onto `canvas`, returns `{ width, height }` of the rendered viewport.
  - `export async function extractPageText(pdfDoc, pageNumber)` → `Promise<string>` (page's text items joined with spaces).
  - `export async function extractAllText(pdfDoc)` → `Promise<Array<{ page: number, text: string }>>` for every page.

- [ ] **Step 1: Pin and verify the CDN URLs**

Run: `curl -sI https://cdnjs.cloudflare.com/ajax/libs/pdf.js/<version>/pdf.min.js` and the matching `pdf.worker.min.js`, trying recent 4.x versions from cdnjs's listing until one returns `200`. Record the exact version string — every consuming page's `<script>` tag (Tasks 6, 8–10 don't load it, only Task 6's `notes.html` and Task 10's `search.html` need it) must use this same pinned version.

- [ ] **Step 2: Implement `js/pdf-viewer.js`**

`loadPdf` sets `pdfjsLib.GlobalWorkerOptions.workerSrc` to the pinned worker URL (once, guarded so repeated calls don't reassign) before calling `getDocument`. `renderPage` gets `pdfDoc.getPage(pageNumber)`, computes a viewport at `scale`, sizes the canvas to it, and calls `page.render({canvasContext, viewport}).promise`. `extractPageText` gets the page, calls `getTextContent()`, joins `.items.map(i => i.str)` with `" "`. `extractAllText` loops `1..pdfDoc.numPages` calling `extractPageText`.

- [ ] **Step 3: Verify manually (depends on Task 1's placeholder PDFs and a page that loads pdf.js — borrow `notes.html` once Task 6 exists, or a throwaway local HTML file that loads the pinned CDN script + imports this module and calls `loadPdf('notes/ml/week-01/lecture.pdf')`)**

Expected: the placeholder page's text ("Week 1 placeholder notes — Machine Learning...") is extracted correctly, and `renderPage` draws into a canvas without throwing.

- [ ] **Step 4: Commit**

```bash
git add js/pdf-viewer.js
git commit -m "Add pdf.js wrapper for rendering pages and extracting text"
```

---

### Task 6: Notes page (`notes.html` + `notes.js`)

**Files:**
- Create: `notes.html`, `js/notes.js`

**Interfaces:**
- Consumes: `fetchModules`, `findModule`, `findWeek`, `getQueryParam`, `renderFatalError`, `onSwipe` from `common.js`; `loadPdf`, `renderPage` from `pdf-viewer.js` (Task 5's pinned CDN version).
- Produces: nothing consumed by later tasks (leaf page; Task 10/search re-implements its own PDF text indexing rather than reusing this page's viewer instances, per the spec's "cached in memory for the current visit to search.html" scoping).

- [ ] **Step 1: Write `notes.html`**

Same shell as `module.html` (header with crumb, theme toggle, flash-prevention snippet) but `class="page page--reading"` on the content wrapper. Include the pinned PDF.js `<script>` tag from Task 5 before `js/notes.js`. Mount point: `<div id="notes-content"></div>`.

- [ ] **Step 2: Implement `js/notes.js`**

Read `m`/`w` via `getQueryParam`. Resolve the module/week (same not-found handling pattern as Task 4). If the week has no `pdfs`, render "Notes coming soon." Otherwise, for each PDF entry: render a `<div class="pdf-entry">` with the entry's `name`, a `<canvas>`, prev/next page buttons, a page counter, and a plain `<a download>` to `notes/<slug>/week-NN/<file>`; call `loadPdf(...)` and on success `renderPage` page 1, wiring prev/next buttons (and ←/→ keys via `onKey`, and `onSwipe` on the canvas) to re-render adjacent pages, clamped to `[1, pdfDoc.numPages]`. On `loadPdf` rejecting, render "This PDF couldn't be loaded" inside that one `.pdf-entry` only — other entries in the loop still proceed.

- [ ] **Step 3: Verify manually**

Open `http://localhost:8731/notes.html?m=ml&w=1`: the placeholder PDF renders, page counter reads "1 / 1", download link works. Open `notes.html?m=ml&w=2` (empty week): "Notes coming soon." Temporarily point one `pdfs[0].file` at a nonexistent filename, reload, confirm that one entry shows "This PDF couldn't be loaded" without breaking the page; revert the edit.

- [ ] **Step 4: Commit**

```bash
git add notes.html js/notes.js
git commit -m "Add notes page with PDF.js-based viewer"
```

---

### Task 7: Shared study-scope logic (`js/study-scope.js`)

**Files:**
- Create: `js/study-scope.js`
- Create: `tests/test-study-scope.html`

**Interfaces:**
- Consumes: nothing beyond plain JS (no DOM); `fetchModules`-shaped module objects as input where noted.
- Produces (used by Tasks 8 and 9):
  - `export function parseScope(search = window.location.search)` → `{type: 'week', week: number} | {type: 'range', from: number, to: number} | {type: 'all'} | {type: 'invalid'}` from `w`/`from`/`to` query params (`w=all` → `all`; `w=<n>` → `week`; `from`&`to` → `range`; anything unparseable → `invalid`).
  - `export function weeksForScope(scope)` → `number[]` of week numbers in range `[1,13]` for the scope (`invalid` → `[]`).
  - `export async function fetchCardFile(moduleSlug, filename)` → `Promise<object | null>`. Fetches `cards/<moduleSlug>/<filename>`, returns the parsed JSON, or `null` if the request fails or the body doesn't parse (caught internally — callers never see a rejection from this function).
  - `export async function loadCardsForWeeks(moduleSlug, moduleObj, weekNumbers, fetchCardFileFn = fetchCardFile)` → `Promise<{cards: Array, missingWeeks: number[]}>`. For each week number, look up `findWeek(moduleObj, n).cards`; skip (and record in `missingWeeks`) weeks with `null` cards or where `fetchCardFileFn(...)` resolves `null`; otherwise concatenate the result's `.cards`, tagging each card with its source `week`. The `fetchCardFileFn` parameter defaults to the real `fetchCardFile` above so production callers (Tasks 8/9) never pass it explicitly; the test harness overrides it with a fake.
  - `export function shuffleArray(array)` → new array, Fisher-Yates shuffle, does not mutate the input.

- [ ] **Step 1: Write `tests/test-study-scope.html`**

Same harness pattern as Task 2. Cover: `parseScope('?m=ml&w=3')` → `{type:'week', week:3}`; `parseScope('?m=ml&w=all')` → `{type:'all'}`; `parseScope('?m=ml&from=2&to=5')` → `{type:'range', from:2, to:5}`; `parseScope('?m=ml')` → `{type:'invalid'}`; `weeksForScope({type:'week', week:3})` → `[3]`; `weeksForScope({type:'range', from:2, to:5})` → `[2,3,4,5]`; `weeksForScope({type:'all'})` → `[1..13]`; `shuffleArray([1,2,3])` returns an array with the same 3 elements and doesn't mutate the original array (check original still `[1,2,3]` after the call); `loadCardsForWeeks` with a fake `fetchCardFileFn` that resolves the week-1 cards object for week 1 and resolves `null` for week 2 returns `{cards: [...week1's 3 cards], missingWeeks: [2]}` for `weekNumbers=[1,2]`.

- [ ] **Step 2: Run it and confirm it fails, then implement `js/study-scope.js`, then confirm it passes**

Same fail → implement → pass cycle as Task 2's steps 2–4.

- [ ] **Step 3: Commit**

```bash
git add js/study-scope.js tests/test-study-scope.html
git commit -m "Add shared week-scope parsing and card-loading logic"
```

---

### Task 8: Flashcards page (`flashcards.html` + `flashcards.js`)

**Files:**
- Create: `flashcards.html`, `js/flashcards.js`

**Interfaces:**
- Consumes: `fetchModules`, `findModule`, `getQueryParam`, `renderFatalError`, `onKey`, `onSwipe`, `loadState`, `saveState` from `common.js`; `parseScope`, `weeksForScope`, `loadCardsForWeeks`, `shuffleArray` from `study-scope.js`.
- Produces: nothing consumed by later tasks (leaf page).

- [ ] **Step 1: Write `flashcards.html`**

Same shell pattern as `notes.html` (no PDF.js needed here). Mount points: `#flashcard-scope-label`, `#flashcard-progress`, `#shuffle-toggle` (checkbox), `#flashcard` (the flip card: `.flashcard > .flashcard-inner > .flashcard-face.front / .flashcard-face.back`), prev/next buttons.

- [ ] **Step 2: Add flashcard-flip CSS to `css/common.css`**

`.flashcard { perspective: 1000px; }`, `.flashcard-inner { position: relative; transition: transform 0.4s; transform-style: preserve-3d; }`, `.flashcard.flipped .flashcard-inner { transform: rotateY(180deg); }`, `.flashcard-face { position: absolute; inset: 0; backface-visibility: hidden; }`, `.flashcard-face.back { transform: rotateY(180deg); }` — reuse `.page--reading`, `.btn`/`.btn--primary` for the rest of the chrome.

- [ ] **Step 3: Implement `js/flashcards.js`**

Resolve `m` + `parseScope()`; on `type: 'invalid'` or `findModule` failure, show the "No cards found for this selection" message with a link to `module.html?m=<slug>`. Call `loadCardsForWeeks`; if the result is empty (`cards.length === 0`), same "No cards found" message, mentioning `missingWeeks` if any. Otherwise: read `loadState().shuffle` to set the shuffle checkbox's initial state and conditionally `shuffleArray` the card list; render card 1 (question on front, answer on back); wire the checkbox to re-shuffle/re-render and persist via `saveState`; wire `.flashcard` click, `onKey('Space', ...)` (actually `event.key === ' '`), prev/next buttons, `onKey('ArrowLeft'/'ArrowRight', ...)`, and `onSwipe` to flip/advance; update `#flashcard-progress` ("X / Y") on every navigation.

- [ ] **Step 4: Verify manually**

Open `flashcards.html?m=ml&w=1`: 3 cards, flip via click/Space, navigate via arrows/buttons, progress counter updates, shuffle toggle changes order and survives a page reload (persisted). Open `flashcards.html?m=ml&w=all`: same 3 cards (only week 1 has content in the sample data). Open `flashcards.html?m=ml&from=5&to=5`: "No cards found for this selection" with a working link back to the module page.

- [ ] **Step 5: Commit**

```bash
git add flashcards.html js/flashcards.js css/common.css
git commit -m "Add flashcards study mode"
```

---

### Task 9: Quiz page (`quiz.html` + `quiz.js`)

**Files:**
- Create: `quiz.html`, `js/quiz.js`
- Create: `tests/test-quiz.html`

**Interfaces:**
- Consumes: same `common.js`/`study-scope.js` exports as Task 8, plus `loadState`/`saveState` for score persistence.
- Produces:
  - `export function buildQuizQuestion(card)` → `{ id: card.id, question: card.question, options: string[4], correctIndex: number }` — shuffles `[card.answer, ...card.distractors]` via `shuffleArray` and records where the answer landed.
  - `export function scoreForWeekKey(moduleSlug, week)` → `` `${moduleSlug}-w${String(week).padStart(2, '0')}` `` (e.g. `"ml-w03"`).
- Nothing consumed by later tasks (leaf page).

- [ ] **Step 1: Write `tests/test-quiz.html`**

Cover `buildQuizQuestion`: `options` has length 4, contains the card's `answer` and all 3 `distractors` exactly once each, `options[correctIndex] === card.answer`. Cover `scoreForWeekKey('ml', 3) === 'ml-w03'` and `scoreForWeekKey('cybersecurity', 13) === 'cybersecurity-w13'`.

- [ ] **Step 2: Run it and confirm it fails, then implement both functions in `js/quiz.js`, then confirm it passes**

- [ ] **Step 3: Write `quiz.html`**

Same shell as `flashcards.html`. Mount points: `#quiz-question`, `#quiz-options` (4 buttons), `#quiz-feedback`, `#quiz-score`, and an end-screen section (`#quiz-end`, hidden until the last question) with the final score and a "Retry wrong only" `.btn--primary`.

- [ ] **Step 4: Implement the rest of `js/quiz.js` (DOM/interaction layer)**

Resolve scope and load cards exactly as Task 8. Build one `buildQuizQuestion` per card up front. For each question: render the 4 options as buttons labeled with their index (1–4, not literal digits in the button text — the digits are the keyboard shortcut, not the label); on selection (click or `onKey('1'..'4', ...)`), lock input, show correct/incorrect feedback (highlight the chosen and correct options), update the running score, and advance after a short pause or an explicit "Next" action — pick whichever is simpler to implement unambiguously, i.e. an explicit "Next" button/key rather than a timer. On the last question, hide the question UI and show `#quiz-end` with the final score and the list of missed card ids. "Retry wrong only" re-runs the same flow using only the missed cards' `buildQuizQuestion` results, without touching scores. After a non-retry run finishes, if `scope.type === 'week'`, update `loadState().scores[scoreForWeekKey(m, scope.week)]` with `{best: max(existing.best ?? 0, finalScore), total, last: new Date().toISOString().slice(0,10)}` and `saveState`.

- [ ] **Step 5: Verify manually**

Open `quiz.html?m=ml&w=1`: 3 questions, each with 4 options including the real answer, 1–4 keys and click both work, feedback is instant, final score shown, "Retry wrong only" re-runs only the missed ones. Reload the same URL after finishing: confirm `localStorage['studysite:v1'].scores['ml-w01']` is set (check via browser devtools or re-opening `module.html?m=ml` once Task 4's badge-reading is extended — note: Task 4 doesn't render score badges; this check is just confirming the stored value, not a UI regression). Open `quiz.html?m=ml&w=all`: confirm no score is written to `scores` (range/all scope is excluded by design).

- [ ] **Step 6: Commit**

```bash
git add quiz.html js/quiz.js tests/test-quiz.html
git commit -m "Add quiz study mode with scoped scoring"
```

---

### Task 10: Search page (`search.html` + `search.js`)

**Files:**
- Create: `search.html`, `js/search.js`
- Create: `tests/test-search.html`

**Interfaces:**
- Consumes: `fetchModules`, `getQueryParam`, `renderFatalError` from `common.js`; `loadPdf`, `extractAllText` from `pdf-viewer.js` (Task 5's pinned CDN version); card files via `fetch` directly (not `loadCardsForWeeks`, since search needs every module/week, not one scoped module).
- Produces:
  - `export function buildSnippet(text, query, radius = 80)` → substring of `text` centered on the first case-insensitive match of `query`, padded to `radius` chars each side (clamped to the string bounds), or `null` if no match.
  - `export function searchCards(cardIndex, query)` → `cardIndex: Array<{module, week, card}>` → matches `{type:'card', module, week, card, snippet}` where `query` matches (case-insensitively) `card.question` or `card.answer`.
  - `export function searchPdfText(pdfIndex, query)` → `pdfIndex: Array<{module, week, file, pages: Array<{page, text}>}>` → matches `{type:'pdf', module, week, file, page, snippet}`.
- Nothing consumed by later tasks (leaf page).

- [ ] **Step 1: Write `tests/test-search.html`**

Cover `buildSnippet`: a match in the middle of a long string returns `radius`-ish chars on each side; a match near the start/end clamps rather than erroring; no match returns `null`. Cover `searchCards`/`searchPdfText` against small fixture indexes: a query matching one card and not another returns only the matching one with a non-null snippet; case-insensitivity (`"REGRESSION"` matches `"regression"`).

- [ ] **Step 2: Run it and confirm it fails, then implement the 3 pure functions in `js/search.js`, then confirm it passes**

- [ ] **Step 3: Write `search.html`**

Standard shell, pinned PDF.js `<script>` tag (Task 5's version). Mount points: `<input id="search-box">`, `#search-status` ("indexing PDFs…" / "No results for '…'"), `#search-results`.

- [ ] **Step 4: Implement the indexing/UI layer of `js/search.js`**

On first input event with `value.length >= 2` (debounced ~250ms), if not already indexing/indexed this page visit: call `fetchModules()`, then for every module/week with a non-null `cards` file, `fetch` and parse it into the `cardIndex` shape, rendering card-search results against it immediately (don't wait on PDFs). Separately, for every week with `pdfs`, sequentially `loadPdf` + `extractAllText` each file, appending to `pdfIndex` and re-running `searchPdfText` + re-rendering after each file completes (progressive results), showing "indexing PDFs…" in `#search-status` while any are still pending. On every keystroke after the index exists, re-run `searchCards`/`searchPdfText` against the current query and re-render `#search-results` (card matches first, then PDF matches), each linking to `flashcards.html?m=<module>&w=<week>&card=<id>` or `notes.html?m=<module>&w=<week>&page=<n>`. No matches (and indexing complete) → "No results for '<query>'" in `#search-status`.

- [ ] **Step 5: Verify manually**

Open `search.html`, type "regression": a card result from `ml` week 1 appears with a snippet, then (after a moment) confirm the status line stops saying "indexing" once all 4 modules' single PDF has been processed. Type a nonsense string: "No results for '...'". Type a string present only in a PDF's placeholder text ("Week 1 placeholder notes"): confirm a PDF-type result appears once indexing reaches that file.

- [ ] **Step 6: Commit**

```bash
git add search.html js/search.js tests/test-search.html
git commit -m "Add cross-content search over flashcards and PDF text"
```

---

### Task 11: README

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: nothing (terminal task).

- [ ] **Step 1: Write `README.md`**

Cover, in this order: (1) what the site is, one paragraph; (2) enabling GitHub Pages — push to a repo, Settings → Pages → Source → Deploy from branch → `main` / `/ (root)`; (3) local testing — `python3 -m http.server 8000` from the repo root, open `http://localhost:8000`, and the explicit note that opening `index.html` directly (`file://`) won't work because `fetch()` is blocked; (4) adding a new week — drop the PDF(s) at `notes/<slug>/week-NN/`, add `cards/<slug>/week-NN.json` (3+ cards, each with exactly 3 `distractors`), edit that week's entry in `data/modules.json` (title/pdfs/cards fields) replacing the "coming soon" shape; (5) a short file-tree tour (one line per top-level item, matching this plan's File Structure section).

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add README covering GitHub Pages setup, adding weeks, and local testing"
```
