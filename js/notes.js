// notes.js — renders the PDF(s) for one module/week using pdf-viewer.js.
import { fetchModules, findModule, findWeek, getQueryParam, renderFatalError, onKey, onSwipe } from "./common.js";
import { loadPdf, renderPage } from "./pdf-viewer.js";

function renderNotFound() {
  document.querySelector("main").innerHTML = `
    <p class="fatal-error">
      Week not found. <a href="index.html">Back to all modules</a>.
    </p>
  `;
}

function renderComingSoon() {
  document.getElementById("notes-content").innerHTML = `<p>Notes coming soon.</p>`;
}

async function mountPdfEntry(moduleObj, weekObj, pdf) {
  const container = document.getElementById("notes-content");
  const entry = document.createElement("div");
  entry.className = "pdf-entry";
  const fileUrl = `notes/${moduleObj.slug}/week-${String(weekObj.week).padStart(2, "0")}/${pdf.file}`;
  entry.innerHTML = `
    <span class="pdf-entry__name">${pdf.name}</span>
    <canvas></canvas>
    <div class="pdf-entry__controls">
      <button type="button" class="btn" data-prev>Previous</button>
      <span class="pdf-entry__page-counter" data-counter>…</span>
      <button type="button" class="btn" data-next>Next</button>
      <a class="btn" href="${fileUrl}" download>Download</a>
    </div>
  `;
  container.appendChild(entry);

  const canvas = entry.querySelector("canvas");
  const counter = entry.querySelector("[data-counter]");
  const prevBtn = entry.querySelector("[data-prev]");
  const nextBtn = entry.querySelector("[data-next]");

  let pdfDoc;
  try {
    pdfDoc = await loadPdf(fileUrl);
  } catch {
    entry.innerHTML = `<span class="pdf-entry__name">${pdf.name}</span><p class="fatal-error">This PDF couldn't be loaded.</p>`;
    return;
  }

  let currentPage = 1;

  async function show(page) {
    currentPage = Math.min(Math.max(page, 1), pdfDoc.numPages);
    await renderPage(pdfDoc, currentPage, canvas);
    counter.textContent = `${currentPage} / ${pdfDoc.numPages}`;
  }

  prevBtn.addEventListener("click", () => show(currentPage - 1));
  nextBtn.addEventListener("click", () => show(currentPage + 1));
  onSwipe(canvas, { onLeft: () => show(currentPage + 1), onRight: () => show(currentPage - 1) });

  await show(1);
}

async function init() {
  let manifest;
  try {
    manifest = await fetchModules();
  } catch {
    renderFatalError(
      document.querySelector("main"),
      "Couldn't load site data — check your connection, or that you're serving over http://, not opening the file directly."
    );
    return;
  }

  const slug = getQueryParam("m");
  const weekNum = Number(getQueryParam("w"));
  const moduleObj = slug ? findModule(manifest, slug) : undefined;
  const weekObj = moduleObj && weekNum ? findWeek(moduleObj, weekNum) : undefined;
  if (!moduleObj || !weekObj) {
    renderNotFound();
    return;
  }

  document.title = `${weekObj.title || `Week ${weekObj.week}`} — Study`;
  document.getElementById("crumb").textContent = `${moduleObj.title} / Week ${weekObj.week}`;

  if (weekObj.pdfs.length === 0) {
    renderComingSoon();
    return;
  }

  for (const pdf of weekObj.pdfs) {
    await mountPdfEntry(moduleObj, weekObj, pdf);
  }

  onKey("ArrowLeft", () => document.querySelector(".pdf-entry [data-prev]")?.click());
  onKey("ArrowRight", () => document.querySelector(".pdf-entry [data-next]")?.click());
}

init();
