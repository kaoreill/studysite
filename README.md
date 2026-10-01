# Study

A lightweight study site for DTU exam prep across 4 modules — Machine
Learning, Quantitative Methods to Assess Sustainability, Process Mining, and
Cybersecurity Fundamentals. Browse lecture PDFs week by week, drill
flashcards, self-test with multiple-choice quizzes, and search across all
flashcards and PDF text — all as a static site with no build step, no
framework, and no dependency beyond PDF.js loaded from a CDN.

## Enabling GitHub Pages

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**.
4. Pick branch **main**, folder **/ (root)**, then save.

GitHub publishes the site at `https://<your-username>.github.io/<repo-name>/`
within a minute or two.

## Local testing

Run from the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

**Don't open `index.html` directly from disk** (double-clicking it, or a
`file://...` URL) — every page loads its data with `fetch()`, which browsers
block for local files outside `http://`/`https://`. The site shows a hint
banner if it detects this, but the fix is always to serve it through a local
server like the one above.

## Adding a new week

1. Drop the lecture PDF(s) at `notes/<module-slug>/week-NN/` (e.g.
   `notes/ml/week-02/lecture.pdf`). Use a two-digit week number.
2. Add a flashcard deck at `cards/<module-slug>/week-NN.json` with 3 or more
   cards. Each card needs a `question`, an `answer`, and **exactly 3**
   `distractors` (quiz mode always builds a 4-option question from them).
   Match the shape of an existing file, e.g. `cards/ml/week-01.json`.
3. Edit that week's entry in `data/modules.json`: set `title` to the week's
   real title, `pdfs` to a list of `{ "name": ..., "file": ... }` entries
   matching what you dropped in step 1, and `cards` to the filename from
   step 2 (e.g. `"week-02.json"`). This replaces the "coming soon" shape
   (`title: ""`, `pdfs: []`, `cards: null`) that every unfilled week starts
   with.

Nothing else needs to change — the home page, module page, notes viewer,
flashcards, quiz, and search all read from `data/modules.json` and the files
it points to.

## File layout

```
index.html          Home page — the 4 modules, with progress at a glance
module.html          One module's week-by-week list
notes.html            PDF viewer for a week's lecture notes
flashcards.html       Flip-card study mode
quiz.html             Multiple-choice quiz mode
search.html           Cross-content search
css/common.css        Design tokens and every shared/page component
js/common.js           Theme, manifest loading, keyboard/swipe/error helpers
js/home.js, module.js, notes.js, flashcards.js, quiz.js, search.js
                      One script per page, each wiring its own view
js/pdf-viewer.js       Thin wrapper over PDF.js (render a page, extract text)
js/study-scope.js      Shared week-scope parsing for flashcards/quiz
data/modules.json      The manifest — every module, every week, what exists
notes/<slug>/week-NN/  Lecture PDFs
cards/<slug>/week-NN.json  Flashcard decks, one file per week
scripts/make_placeholder_pdfs.py  Regenerates the sample placeholder PDFs
tests/                 Browser-based assertion pages for the shared JS logic
```
