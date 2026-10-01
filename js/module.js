// module.js — renders one module's week list from data/modules.json, reading ?m= from the URL.
import {
  fetchModules,
  findModule,
  isWeekEmpty,
  countWeeksWithContent,
  getQueryParam,
  renderFatalError,
  loadState,
} from "./common.js";

// Matches quiz.js's scoreForWeekKey exactly, duplicated rather than
// imported — quiz.js runs its own init() as a side effect of being
// imported (it expects quiz.html's DOM), so importing it here to reach
// one pure helper would try to wire up controls that don't exist on
// this page.
function scoreForWeekKey(moduleSlug, week) {
  return `${moduleSlug}-w${String(week).padStart(2, "0")}`;
}

function dotsMarkup(filled, total) {
  const items = [];
  for (let i = 0; i < filled; i++) items.push('<li class="filled"></li>');
  for (let i = filled; i < total; i++) items.push("<li></li>");
  return items.join("");
}

function renderNotFound() {
  const main = document.querySelector("main");
  main.innerHTML = `
    <p class="fatal-error">
      Module not found. <a href="index.html">Back to all modules</a>.
    </p>
  `;
}

function renderModuleIntro(moduleObj) {
  const filled = countWeeksWithContent(moduleObj);
  document.getElementById("module-intro").innerHTML = `
    <div class="module-intro ${moduleObj.slug}">
      <div class="module-intro__head">
        <h1>${moduleObj.title}</h1>
        <span class="module-row__badge">${filled} / ${moduleObj.weeks.length}</span>
      </div>
      <ul class="dots" aria-hidden="true">${dotsMarkup(filled, moduleObj.weeks.length)}</ul>
      <div class="module-actions">
        <a class="btn btn--primary" href="flashcards.html?m=${moduleObj.slug}&w=all">Study all weeks</a>
        <a class="btn btn--primary" href="quiz.html?m=${moduleObj.slug}&w=all">Quiz all weeks</a>
      </div>
      <form class="range-picker" id="range-picker">
        <label>From <input type="number" id="range-from" min="1" max="13" value="1" required /></label>
        <label>To <input type="number" id="range-to" min="1" max="13" value="13" required /></label>
        <button type="submit" class="btn" data-mode="flashcards">Study range</button>
        <button type="submit" class="btn" data-mode="quiz">Quiz range</button>
      </form>
    </div>
  `;
}

function modeLink(available, href, label) {
  return available ? `<a href="${href}">${label}</a>` : `<span class="week-row__link--disabled">${label}</span>`;
}

function renderWeekRow(moduleObj, weekObj) {
  const li = document.createElement("li");
  const number = String(weekObj.week).padStart(2, "0");
  if (isWeekEmpty(weekObj)) {
    li.className = "week-row week-row--empty";
    li.innerHTML = `
      <span class="week-row__number">${number}</span>
      <span class="week-row__title">Coming soon</span>
    `;
  } else {
    li.className = "week-row";
    const qs = `m=${moduleObj.slug}&w=${weekObj.week}`;
    const hasCards = weekObj.cards !== null;
    const hasPdfs = weekObj.pdfs.length > 0;
    const score = loadState().scores?.[scoreForWeekKey(moduleObj.slug, weekObj.week)];
    const scoreBadge = score ? `<span class="week-row__score">Best: ${score.best} / ${score.total}</span>` : "";
    li.innerHTML = `
      <span class="week-row__number">${number}</span>
      <span class="week-row__title">${weekObj.title}${scoreBadge}</span>
      <span class="week-row__links">
        ${modeLink(hasPdfs, `notes.html?${qs}`, "Notes")}
        ${modeLink(hasCards, `flashcards.html?${qs}`, "Flashcards")}
        ${modeLink(hasCards, `quiz.html?${qs}`, "Quiz")}
      </span>
    `;
  }
  return li;
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
  const moduleObj = slug ? findModule(manifest, slug) : undefined;
  if (!moduleObj) {
    renderNotFound();
    return;
  }

  document.title = `${moduleObj.title} — Study`;
  document.getElementById("crumb").textContent = moduleObj.title;
  renderModuleIntro(moduleObj);

  let submittedVia = null;
  const rangeForm = document.getElementById("range-picker");
  rangeForm.querySelectorAll("button[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      submittedVia = btn.dataset.mode;
    });
  });
  rangeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const from = document.getElementById("range-from").value;
    const to = document.getElementById("range-to").value;
    const mode = submittedVia || "flashcards";
    window.location.href = `${mode}.html?m=${moduleObj.slug}&from=${from}&to=${to}`;
  });

  const list = document.getElementById("week-list");
  for (const weekObj of moduleObj.weeks) {
    list.appendChild(renderWeekRow(moduleObj, weekObj));
  }
}

init();
