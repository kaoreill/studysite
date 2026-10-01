// pdf-viewer.js — thin wrapper around pdf.js: load a document, render a page
// to a canvas, and extract page text. Loads pdf.js itself from cdnjs (the
// only external dependency this site uses) as an ES module.
import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.min.mjs";

const WORKER_SRC = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs";
// Metrics for the standard 14 fonts (e.g. Helvetica) when a PDF references
// one without embedding it — without this, text using those fonts can
// extract/render incorrectly. cdnjs doesn't mirror this directory; jsDelivr does.
const STANDARD_FONT_DATA_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/standard_fonts/";
let workerConfigured = false;

export async function loadPdf(url) {
  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
    workerConfigured = true;
  }
  return pdfjsLib.getDocument({ url, standardFontDataUrl: STANDARD_FONT_DATA_URL }).promise;
}

export async function renderPage(pdfDoc, pageNumber, canvas, scale = 1.5) {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const canvasContext = canvas.getContext("2d");
  await page.render({ canvasContext, viewport }).promise;
  return { width: viewport.width, height: viewport.height };
}

export async function extractPageText(pdfDoc, pageNumber) {
  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  return textContent.items.map((item) => item.str).join(" ");
}

export async function extractAllText(pdfDoc) {
  const pages = [];
  for (let page = 1; page <= pdfDoc.numPages; page++) {
    pages.push({ page, text: await extractPageText(pdfDoc, page) });
  }
  return pages;
}
