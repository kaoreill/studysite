// search.js — progressive cross-content search over flashcards and PDF text.
import { fetchModules, getQueryParam, renderFatalError } from "./common.js";
import { loadPdf, extractAllText } from "./pdf-viewer.js";

export function buildSnippet(text, query, radius = 80) {
  const lower = text.toLowerCase();
  const i = lower.indexOf(query.toLowerCase());
  if (i === -1) return null;
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, i + query.length + radius);
  return text.slice(start, end);
}

export function searchCards(cardIndex, query) {
  const matches = [];
  for (const entry of cardIndex) {
    const { card } = entry;
    const snippet = buildSnippet(card.question, query) ?? buildSnippet(card.answer, query);
    if (snippet !== null) {
      matches.push({ type: "card", module: entry.module, week: entry.week, card, snippet });
    }
  }
  return matches;
}

export function searchPdfText(pdfIndex, query) {
  const matches = [];
  for (const entry of pdfIndex) {
    for (const { page, text } of entry.pages) {
      const snippet = buildSnippet(text, query);
      if (snippet !== null) {
        matches.push({ type: "pdf", module: entry.module, week: entry.week, file: entry.file, page, snippet });
      }
    }
  }
  return matches;
}

function renderResults(query, cardIndex, pdfIndex, indexingDone) {
  const statusEl = document.getElementById("search-status");
  const resultsEl = document.getElementById("search-results");

  const cardMatches = searchCards(cardIndex, query);
  const pdfMatches = searchPdfText(pdfIndex, query);
  const allMatches = [...cardMatches, ...pdfMatches];

  resultsEl.innerHTML = allMatches
    .map((m) => {
      if (m.type === "card") {
        return `<li><a href="flashcards.html?m=${m.module}&w=${m.week}&card=${m.card.id}">${m.module} / Week ${m.week}</a> — ${m.snippet}</li>`;
      }
      return `<li><a href="notes.html?m=${m.module}&w=${m.week}&page=${m.page}">${m.module} / Week ${m.week} (PDF)</a> — ${m.snippet}</li>`;
    })
    .join("");

  if (allMatches.length === 0) {
    statusEl.textContent = indexingDone ? `No results for '${query}'` : "indexing PDFs…";
  } else {
    statusEl.textContent = indexingDone ? "" : "indexing PDFs…";
  }
}

async function init() {
  const input = document.getElementById("search-box");
  const statusEl = document.getElementById("search-status");

  let manifest;
  const cardIndex = [];
  const pdfIndex = [];
  let indexed = false;
  let indexingDone = false;
  let debounceTimer = null;

  async function buildIndex() {
    if (indexed) return;
    indexed = true;
    try {
      manifest = await fetchModules();
    } catch {
      renderFatalError(
        document.querySelector("main"),
        "Couldn't load site data — check your connection, or that you're serving over http://, not opening the file directly."
      );
      return;
    }

    const pdfJobs = [];
    for (const moduleObj of manifest.modules) {
      for (const week of moduleObj.weeks) {
        if (week.cards) {
          try {
            const res = await fetch(`cards/${moduleObj.slug}/${week.cards}`);
            if (res.ok) {
              const cardFile = await res.json();
              for (const card of cardFile.cards) {
                cardIndex.push({ module: moduleObj.slug, week: week.week, card });
              }
            }
          } catch {
            // Skip this week's cards; search continues with what's indexed.
          }
        }
        for (const pdf of week.pdfs) {
          pdfJobs.push({ moduleSlug: moduleObj.slug, week: week.week, pdf });
        }
      }
    }

    renderResults(input.value, cardIndex, pdfIndex, false);

    for (const { moduleSlug, week, pdf } of pdfJobs) {
      try {
        const url = `notes/${moduleSlug}/week-${String(week).padStart(2, "0")}/${pdf.file}`;
        const pdfDoc = await loadPdf(url);
        const pages = await extractAllText(pdfDoc);
        pdfIndex.push({ module: moduleSlug, week, file: pdf.file, pages });
      } catch {
        // Skip this PDF; search continues with what's indexed.
      }
      renderResults(input.value, cardIndex, pdfIndex, false);
    }

    indexingDone = true;
    renderResults(input.value, cardIndex, pdfIndex, true);
  }

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = input.value;
    if (query.length < 2) {
      statusEl.textContent = "";
      document.getElementById("search-results").innerHTML = "";
      return;
    }
    debounceTimer = setTimeout(async () => {
      if (!indexed) {
        statusEl.textContent = "indexing PDFs…";
        await buildIndex();
      } else {
        renderResults(query, cardIndex, pdfIndex, indexingDone);
      }
    }, 250);
  });
}

init();
