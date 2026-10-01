// home.js — renders the home page's hero stat and module list from data/modules.json.
// (The file:// hint lives in index.html's inline classic script, not here —
// browsers block module scripts like this one entirely under file://, so
// this module never runs in that case and can't be the one to show it.)
import { fetchModules, countWeeksWithContent, renderFatalError } from "./common.js";

function dotsMarkup(filled, total) {
  const items = [];
  for (let i = 0; i < filled; i++) items.push('<li class="filled"></li>');
  for (let i = filled; i < total; i++) items.push("<li></li>");
  return items.join("");
}

function renderModuleRow(moduleObj) {
  const filled = countWeeksWithContent(moduleObj);
  const li = document.createElement("li");
  li.innerHTML = `
    <a class="module-row ${moduleObj.slug}" href="module.html?m=${moduleObj.slug}">
      <div class="module-row__head">
        <span class="module-row__title">${moduleObj.title}</span>
        <span class="module-row__badge">${filled} / ${moduleObj.weeks.length}</span>
      </div>
      <ul class="dots" aria-hidden="true">${dotsMarkup(filled, moduleObj.weeks.length)}</ul>
    </a>
  `;
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

  const totalFilled = manifest.modules.reduce((sum, m) => sum + countWeeksWithContent(m), 0);
  const totalWeeks = manifest.modules.reduce((sum, m) => sum + m.weeks.length, 0);
  document.getElementById("hero-stat").innerHTML =
    `<strong>${totalFilled} of ${totalWeeks}</strong> weeks ready across all modules`;

  const list = document.getElementById("module-list");
  for (const moduleObj of manifest.modules) {
    list.appendChild(renderModuleRow(moduleObj));
  }
}

init();
