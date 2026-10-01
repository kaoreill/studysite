// module.js — renders one module's week list from data/modules.json, reading ?m= from the URL.
import {
  fetchModules,
  findModule,
  isWeekEmpty,
  countWeeksWithContent,
  getQueryParam,
  renderFatalError,
} from "./common.js";

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
    </div>
  `;
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
    li.innerHTML = `
      <span class="week-row__number">${number}</span>
      <span class="week-row__title">${weekObj.title}</span>
      <span class="week-row__links">
        <a href="notes.html?${qs}">Notes</a>
        <a href="flashcards.html?${qs}">Flashcards</a>
        <a href="quiz.html?${qs}">Quiz</a>
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

  const list = document.getElementById("week-list");
  for (const weekObj of moduleObj.weeks) {
    list.appendChild(renderWeekRow(moduleObj, weekObj));
  }
}

init();
